const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzpc1pni5JmggYzBtUiZym0k4jDLnXL7NDCYuzWAH6gKkWw1m7mcVfP7cASEcXv0tl0/exec';
// "-latest"-Aliase zeigen automatisch auf das neueste Modell (Google kündigt Wechsel 2 Wochen vorher an).
// Reihenfolge = Präferenz; ist ein Alias nicht verfügbar, wird der nächste probiert.
const GEMINI_MODELS = ['gemini-flash-lite-latest', 'gemini-flash-latest'];
const APP_VERSION = '0.3.1'; // sichtbar in den Einstellungen
const STORAGE = { geminiKey: 'marvin.geminiKey', token: 'marvin.backendToken' };
const INBOX_STATUS = 'Puffer'; // Eingangspuffer, kein sichtbarer Tab
const TARGET_STATUSES = ['Zu tun', 'Gedächtnis', 'Pausiert'];

let allTasks = [];
let categories = [];
let terms = []; // eigenes Vokabular aus Config (Typ "Begriff")
let currentStatus = 'Zu tun';

document.addEventListener('DOMContentLoaded', () => {
    initTabs();
    initSettings();
    initMarvinButton();
    initEditor();
    loadAll();
    document.getElementById('app-version').textContent = 'App ' + APP_VERSION;
    initServiceWorker();

    // App wieder im Vordergrund (z.B. aus dem Hintergrund geholt): Daten + Puffer frisch laden,
    // nach neuer App-Version schauen. Ersetzt den fehlenden Reload-Knopf der installierten PWA.
    let hiddenAt = 0;
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) { hiddenAt = Date.now(); return; }
        if (Date.now() - hiddenAt > 30000 && !document.querySelector('dialog[open]')) loadAll();
        navigator.serviceWorker?.getRegistration().then(r => r?.update()).catch(() => {});
    });
});

// ---------- Updates ----------

function initServiceWorker() {
    if (!('serviceWorker' in navigator)) return;
    const hadController = !!navigator.serviceWorker.controller;
    // Neue Version aktiv -> einmal neu laden, damit sie sofort sichtbar ist
    navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (hadController && !document.querySelector('dialog[open]')) location.reload();
    });
    navigator.serviceWorker.register('sw.js').then(r => r.update()).catch(() => {});
}

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
    if (result.status !== 'success') {
        const msg = result.message || 'Backend-Fehler';
        if (/Unbekannte Aktion/.test(msg)) throw new Error('Backend ist veraltet – neue Version in Apps Script bereitstellen.');
        throw new Error(msg);
    }
    return result.data;
}

async function loadAll() {
    const config = callBackend('getConfig')
        .then(cfg => { categories = cfg.categories || []; terms = cfg.terms || []; })
        .catch(() => { categories = []; terms = []; });
    await loadTasks();
    await config;
    processInbox();
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
            : 'Fehler beim Laden der Daten. Antippen für Einstellungen.';
        loading.onclick = openSettings;
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
    const btn = document.getElementById('marvin-btn');

    // Langes Drücken (Handy) bzw. Rechtsklick (Mac) öffnet die Einstellungen
    let pressTimer = null;
    let longPressed = false;
    const openOnce = () => { if (!document.getElementById('settings').open) openSettings(); };
    btn.addEventListener('pointerdown', () => {
        longPressed = false;
        pressTimer = setTimeout(() => { longPressed = true; openOnce(); }, 700);
    });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => btn.addEventListener(ev, () => clearTimeout(pressTimer)));
    btn.addEventListener('contextmenu', (e) => { e.preventDefault(); longPressed = true; openOnce(); });

    btn.addEventListener('click', () => {
        if (longPressed) { longPressed = false; return; }
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
        '- Einkaufsartikel (z.B. aus einer Einkaufsliste, "Milch") als Aufgabe "<Artikel> kaufen" formulieren.',
        ...(terms.length ? [
            'Eigene Begriffe des Users (die Spracherkennung verhört sie oft, z.B. als ähnlich klingende Alltagswörter). Wenn ein Wort ähnlich klingt und der Kontext passt, ersetze es durch den richtigen Begriff:',
            ...terms.map(t => `  * ${t}`),
        ] : []),
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
    const body = JSON.stringify({
        systemInstruction: { parts: [{ text: buildSystemPrompt() }] },
        contents: [{ role: 'user', parts: [{ text }] }],
        generationConfig: {
            responseMimeType: 'application/json',
            responseSchema: buildSchema(),
            temperature: 0.4,
        },
    });

    let lastError;
    for (const model of GEMINI_MODELS) {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-goog-api-key': getSetting('geminiKey') },
            body,
        });
        const result = await response.json();

        if (!response.ok) {
            lastError = new Error(result.error?.message || `Gemini HTTP ${response.status}`);
            // Modell nicht (mehr) verfügbar -> nächstes probieren; andere Fehler (Key, Quota) sofort melden
            if (response.status === 404 || /not (found|available)|no longer available/i.test(lastError.message)) continue;
            throw lastError;
        }

        const raw = result.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!raw) throw new Error('Gemini hat geschwiegen');
        return JSON.parse(raw);
    }
    throw lastError;
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

// ---------- Puffer: Rohe Einträge (z.B. Google Home) einsortieren ----------

let inboxRunning = false;
async function processInbox() {
    if (inboxRunning || !getSetting('geminiKey')) return;
    const inbox = allTasks.filter(t => t.Status === INBOX_STATUS);
    if (!inbox.length) return;

    inboxRunning = true;
    let done = 0;
    for (const task of inbox) {
        try {
            const context = [task.Title, task.Notes].filter(Boolean).join('\n');
            const parsed = await parseWithGemini(context);
            const changes = {
                Title: parsed.title || task.Title,
                Status: TARGET_STATUSES.includes(parsed.status) ? parsed.status : 'Zu tun',
                Category: parsed.category || task.Category,
            };
            const due = /^\d{4}-\d{2}-\d{2}$/.test(parsed.dueDate || '') ? parsed.dueDate : '';
            if (due && !task.DueDate) changes.DueDate = due;
            await callBackend('updateTask', { id: task.ID, changes });
            Object.assign(task, changes);
            done++;
            renderTasks();
        } catch (err) {
            console.warn('Puffer-Eintrag nicht einsortiert', task, err);
        }
    }
    inboxRunning = false;
    renderTasks();
    if (done) showToast(`${done} ${done === 1 ? 'Eintrag' : 'Einträge'} aus dem Puffer einsortiert. Niemand hat sich bedankt.`);
}

// ---------- Bearbeiten / Löschen ----------

let editing = null;

// Wert aus dem Sheet (Date-ISO oder "YYYY-MM-DD") -> "YYYY-MM-DD" für <input type="date">
function toInputDate(value) {
    if (!value) return '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(String(value))) return String(value);
    const d = new Date(value);
    if (isNaN(d.getTime())) return '';
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function openEditor(task) {
    editing = task;
    document.getElementById('edit-title').value = task.Title || '';
    document.getElementById('edit-notes').value = task.Notes || '';
    document.getElementById('edit-due').value = toInputDate(task.DueDate);

    const select = document.getElementById('edit-category');
    const options = [...new Set([...categories, task.Category].filter(Boolean))];
    select.replaceChildren(...options.map(c => new Option(c, c, false, c === task.Category)));

    document.querySelectorAll('.status-buttons button').forEach(b =>
        b.classList.toggle('active', b.dataset.status === task.Status));

    document.getElementById('editor').showModal();
    document.getElementById('edit-title').focus();
}

function editorValues() {
    return {
        Title: document.getElementById('edit-title').value.trim() || editing.Title,
        Category: document.getElementById('edit-category').value,
        DueDate: document.getElementById('edit-due').value,
        Notes: document.getElementById('edit-notes').value,
        Status: document.querySelector('.status-buttons button.active')?.dataset.status || editing.Status,
    };
}

async function saveTask(task, changes) {
    const before = { ...task };
    Object.assign(task, changes);
    renderTasks();
    try {
        await callBackend('updateTask', { id: task.ID, changes });
    } catch (err) {
        Object.assign(task, before);
        renderTasks();
        showToast('Speichern fehlgeschlagen: ' + err.message);
    }
}

function initEditor() {
    const dialog = document.getElementById('editor');

    // Status-Buttons wählen nur aus; übernommen wird mit "Speichern"
    document.querySelectorAll('.status-buttons button').forEach(b => b.addEventListener('click', () => {
        document.querySelectorAll('.status-buttons button').forEach(x => x.classList.toggle('active', x === b));
    }));

    document.getElementById('edit-delete').addEventListener('click', async () => {
        const task = editing;
        if (!confirm(`„${task.Title}“ endgültig löschen?`)) return;
        dialog.close('delete');
        const index = allTasks.indexOf(task);
        allTasks.splice(index, 1);
        renderTasks();
        try {
            await callBackend('deleteTask', { id: task.ID });
        } catch (err) {
            allTasks.splice(index, 0, task);
            renderTasks();
            showToast('Löschen fehlgeschlagen: ' + err.message);
        }
    });

    dialog.addEventListener('close', () => {
        if (dialog.returnValue === 'save' && editing) {
            const changes = editorValues();
            if (changes.Status === 'Erledigt' && editing.Status !== 'Erledigt') showToast('Erledigt. Das Universum hat es nicht bemerkt.');
            saveTask(editing, changes);
        }
        editing = null;
    });
}

// ---------- UI ----------

let toastTimer = null;
function showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toast.hidden = true; }, 15000);
    toast.onclick = () => { toast.hidden = true; }; // Antippen schließt
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

// "2026-11-20" als lokales Datum lesen (new Date() würde UTC annehmen).
// Vom Sheet kommen Datumszellen als UTC-Zeitstempel ("2026-11-19T23:00:00.000Z" = 20.11. in Wien) – die normal parsen.
function formatDate(value) {
    if (!value) return '';
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value)); // nur reines Datum; ISO mit Uhrzeit normal parsen
    const d = m ? new Date(+m[1], m[2] - 1, +m[3]) : new Date(value);
    return isNaN(d.getTime()) ? '' : d.toLocaleDateString('de-AT');
}

function renderInboxBadge() {
    const count = allTasks.filter(t => t.Status === INBOX_STATUS).length;
    const badge = document.getElementById('inbox-badge');
    badge.hidden = count === 0;
    badge.textContent = inboxRunning || getSetting('geminiKey')
        ? `Marvin sortiert ${count} ${count === 1 ? 'Eintrag' : 'Einträge'} aus dem Puffer…`
        : `${count} im Puffer – ohne Gemini-Key bleibt das so.`;
}

function renderTasks() {
    renderInboxBadge();

    const container = document.getElementById('task-list');
    container.replaceChildren();

    let filteredTasks = allTasks.filter(t => t.Status === currentStatus);
    if (currentStatus === 'Erledigt') {
        filteredTasks = filteredTasks
            .sort((a, b) => String(b.Updated_At || '').localeCompare(String(a.Updated_At || '')))
            .slice(0, 50);
    }

    if (filteredTasks.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'empty-state';
        empty.textContent = 'Leer. Marvin ist fast beeindruckt.';
        container.appendChild(empty);
        container.appendChild(doneLink());
        return;
    }

    filteredTasks.forEach(task => {
        const card = document.createElement('div');
        card.className = 'task-card';
        if (String(task.ID).startsWith('pending-')) card.classList.add('pending');
        else card.addEventListener('click', () => openEditor(task));

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
    container.appendChild(doneLink());
}

// Dezenter Zugang zu erledigten Tasks am Listenende (kein eigener Tab)
let previousStatus = 'Zu tun';
function doneLink() {
    const link = document.createElement('button');
    link.className = 'done-link';
    if (currentStatus === 'Erledigt') {
        link.textContent = '← zurück';
        link.onclick = () => switchTab(previousStatus);
    } else {
        const count = allTasks.filter(t => t.Status === 'Erledigt').length;
        link.textContent = `✓ Erledigt (${count})`;
        link.hidden = count === 0;
        link.onclick = () => { previousStatus = currentStatus; switchTab('Erledigt'); };
    }
    return link;
}
