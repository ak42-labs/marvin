const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzpc1pni5JmggYzBtUiZym0k4jDLnXL7NDCYuzWAH6gKkWw1m7mcVfP7cASEcXv0tl0/exec';
const GEMINI_MODEL = 'gemini-3.8-flash';
const STORAGE = { geminiKey: 'marvin.geminiKey', token: 'marvin.backendToken' };
const INBOX_STATUS = 'Puffer'; // Eingangspuffer, kein sichtbarer Tab
const TARGET_STATUSES = ['Zu tun', 'Gedächtnis', 'Pausiert'];

let allTasks = [];
let categories = [];
let currentStatus = 'Zu tun';

document.addEventListener('DOMContentLoaded', () => {
    initTabs();
    initSettings();
    initMarvinButton();
    loadAll();
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js').catch(() => {});
    }
});

// ---------- Settings ----------

function getSetting(name) {
    try { return localStorage.getItem(STORAGE[name]) || ''; } catch { return ''; }
}

function setSetting(name, value) {
    try {
        if (value) localStorage.setItem(STORAGE[name], value);
        else localStorage.removeItem(STORAGE[name]);
    } catch { /* Storage blockiert – ignorieren */ }
}

function openSettings() {
    document.getElementById('gemini-key').value = getSetting('geminiKey');
    document.getElementById('backend-token').value = getSetting('token');
    document.getElementById('settings').showModal();
}

function initSettings() {
    const dialog = document.getElementById('settings');
    document.getElementById('settings-btn').addEventListener('click', openSettings);
    dialog.addEventListener('close', () => {
        if (dialog.returnValue !== 'save') return;
        setSetting('geminiKey', document.getElementById('gemini-key').value.trim());
        setSetting('token', document.getElementById('backend-token').value.trim());
        loadAll();
    });
}

// ---------- Backend ----------

async function callBackend(action, payload = {}) {
    const response = await fetch(SCRIPT_URL, {
        method: 'POST',
        // text/plain umgeht den CORS-Preflight von Apps Script
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action, token: getSetting('token'), ...payload }),
    });
    const result = await response.json();
    if (result.status !== 'success') throw new Error(result.message || 'Backend-Fehler');
    return result.data;
}

function loadAll() {
    loadTasks();
    callBackend('getConfig')
        .then(cfg => { categories = cfg.categories || []; })
        .catch(() => { categories = []; });
}

async function loadTasks() {
    const loading = document.getElementById('loading');
    loading.style.display = '';
    loading.textContent = 'Marvin holt die Daten...';

    try {
        allTasks = await callBackend('getTasks');
        loading.style.display = 'none';
        renderTasks();
    } catch (error) {
        loading.textContent = error instanceof TypeError
            ? 'Marvin ist offline (Netzwerkfehler).'
            : 'Fehler beim Laden der Daten.';
    }
}

// ---------- Spracheingabe ----------

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition = null;
let busy = false;

function setButtonState(state) {
    const btn = document.getElementById('marvin-btn');
    const label = btn.querySelector('.label');
    btn.dataset.state = state;
    label.textContent = { idle: 'Marvin', listening: 'Hört zu…', thinking: 'Denkt nach…' }[state];
}

function initMarvinButton() {
    document.getElementById('marvin-btn').addEventListener('click', () => {
        if (!getSetting('geminiKey')) { openSettings(); return; }
        if (recognition) { recognition.stop(); return; } // zweiter Tipp beendet Aufnahme
        if (busy) return;

        if (!SpeechRecognition) {
            const text = prompt('Kein Mikrofon verfügbar. Dann eben tippen:');
            if (text && text.trim()) handleInput(text.trim());
            return;
        }
        startListening();
    });
}

function startListening() {
    let transcript = '';
    recognition = new SpeechRecognition();
    recognition.lang = 'de-AT';
    recognition.interimResults = true;
    recognition.continuous = false; // endet automatisch bei Stille

    recognition.onresult = (e) => {
        transcript = Array.from(e.results).map(r => r[0].transcript).join(' ');
        showLive(transcript);
    };
    recognition.onerror = (e) => {
        if (e.error === 'not-allowed') showToast('Kein Mikrofonzugriff. Wie erwartet.');
        else if (e.error !== 'no-speech' && e.error !== 'aborted') showToast('Spracherkennung: ' + e.error);
    };
    recognition.onend = () => {
        recognition = null;
        showLive('');
        setButtonState('idle');
        if (transcript.trim()) handleInput(transcript.trim());
    };

    setButtonState('listening');
    recognition.start();
}

function showLive(text) {
    const el = document.getElementById('live-transcript');
    el.textContent = text;
    el.hidden = !text;
}

// ---------- Gemini ----------

function todayInfo() {
    const now = new Date();
    const iso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const weekday = now.toLocaleDateString('de-AT', { weekday: 'long' });
    return `${weekday}, ${iso}`;
}

function buildSystemPrompt() {
    return [
        'Du bist Marvin, der depressive, hyperintelligente Roboter. Du wandelst gesprochene Notizen in Aufgaben um.',
        `Heute ist ${todayInfo()} (Zeitzone Europe/Vienna). Löse relative Angaben ("morgen", "nächsten Freitag") in ein konkretes Datum YYYY-MM-DD auf.`,
        'Regeln:',
        '- title: kurz, prägnant, als Aufgabe formuliert, Deutsch. Keine Datumsangaben im Titel.',
        `- status: "Zu tun" für konkrete Aufgaben, "Gedächtnis" für Ideen/irgendwann/vielleicht, "Pausiert" nur wenn ausdrücklich gesagt.`,
        categories.length
            ? `- category: genau eine aus der erlaubten Liste. Wähle die passendste.`
            : '- category: ein kurzes, sinnvolles Wort.',
        '- dueDate: nur wenn ein Zeitpunkt genannt wurde, sonst null.',
        '- notes: zusätzliche Details aus der Aussage, sonst leer.',
        '- comment: EIN kurzer, melancholisch-zynischer Satz von Marvin zur Aufgabe. Keine Höflichkeit, keine Fragen, keine Erklärungen.',
    ].join('\n');
}

function buildSchema() {
    const category = { type: 'STRING' };
    if (categories.length) category.enum = categories;
    return {
        type: 'OBJECT',
        properties: {
            title: { type: 'STRING' },
            status: { type: 'STRING', enum: TARGET_STATUSES },
            category,
            dueDate: { type: 'STRING', nullable: true },
            notes: { type: 'STRING' },
            comment: { type: 'STRING' },
        },
        required: ['title', 'status', 'category', 'comment'],
    };
}

async function parseWithGemini(text) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': getSetting('geminiKey') },
        body: JSON.stringify({
            systemInstruction: { parts: [{ text: buildSystemPrompt() }] },
            contents: [{ role: 'user', parts: [{ text }] }],
            generationConfig: {
                responseMimeType: 'application/json',
                responseSchema: buildSchema(),
                temperature: 0.4,
            },
        }),
    });

    const result = await response.json();
    if (!response.ok) throw new Error(result.error?.message || `Gemini HTTP ${response.status}`);
    const raw = result.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!raw) throw new Error('Gemini hat geschwiegen');
    return JSON.parse(raw);
}

// ---------- Ablauf: Text -> Task ----------

async function handleInput(text) {
    busy = true;
    setButtonState('thinking');
    try {
        const parsed = await parseWithGemini(text);
        const dueDate = /^\d{4}-\d{2}-\d{2}$/.test(parsed.dueDate || '') ? parsed.dueDate : '';
        const task = {
            Title: parsed.title,
            Status: TARGET_STATUSES.includes(parsed.status) ? parsed.status : 'Zu tun',
            Category: parsed.category,
            DueDate: dueDate,
            Notes: [parsed.notes, `Original: "${text}"`].filter(Boolean).join('\n'),
            Source: 'PWA',
        };

        // Optimistisch anzeigen, dann speichern
        const local = { ...task, ID: 'pending-' + Date.now() };
        allTasks.push(local);
        switchTab(task.Status);
        showToast(parsed.comment || 'Notiert. Als ob es etwas ändern würde.');

        try {
            const saved = await callBackend('addTask', { task });
            local.ID = saved.id;
            renderTasks();
        } catch (err) {
            allTasks = allTasks.filter(t => t !== local);
            renderTasks();
            showToast('Speichern fehlgeschlagen: ' + err.message);
        }
    } catch (err) {
        showToast('Marvin versteht nicht. ' + err.message);
    } finally {
        busy = false;
        setButtonState('idle');
    }
}

// ---------- UI ----------

let toastTimer = null;
function showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toast.hidden = true; }, 5000);
}

function initTabs() {
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', () => switchTab(tab.dataset.target));
    });
}

function switchTab(status) {
    currentStatus = status;
    document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.target === status));
    renderTasks();
}

// "2026-11-20" als lokales Datum lesen (new Date() würde UTC annehmen)
function formatDate(value) {
    if (!value) return '';
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value));
    const d = m ? new Date(+m[1], m[2] - 1, +m[3]) : new Date(value);
    return isNaN(d.getTime()) ? '' : d.toLocaleDateString('de-AT');
}

function renderInboxBadge() {
    const count = allTasks.filter(t => t.Status === INBOX_STATUS).length;
    document.getElementById('inbox-count').textContent = count;
    document.getElementById('inbox-badge').hidden = count === 0;
}

function renderTasks() {
    renderInboxBadge();

    const container = document.getElementById('task-list');
    container.replaceChildren();

    const filteredTasks = allTasks.filter(t => t.Status === currentStatus);

    if (filteredTasks.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'empty-state';
        empty.textContent = 'Leer. Marvin ist fast beeindruckt.';
        container.appendChild(empty);
        return;
    }

    filteredTasks.forEach(task => {
        const card = document.createElement('div');
        card.className = 'task-card';
        if (String(task.ID).startsWith('pending-')) card.classList.add('pending');

        const title = document.createElement('h3');
        title.className = 'task-title';
        title.textContent = task.Title || '';

        const meta = document.createElement('div');
        meta.className = 'task-meta';
        const category = document.createElement('span');
        category.textContent = task.Category || '';
        const due = document.createElement('span');
        due.textContent = formatDate(task.DueDate);
        meta.append(category, due);

        card.append(title, meta);
        container.appendChild(card);
    });
}
