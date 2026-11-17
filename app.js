const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzpc1pni5JmggYzBtUiZym0k4jDLnXL7NDCYuzWAH6gKkWw1m7mcVfP7cASEcXv0tl0/exec';
const STORAGE = { geminiKey: 'marvin.geminiKey', token: 'marvin.backendToken' };
const INBOX_STATUS = 'Puffer'; // Eingangspuffer, kein sichtbarer Tab

let allTasks = [];
let currentStatus = 'Zu tun';

document.addEventListener('DOMContentLoaded', () => {
    initTabs();
    initSettings();
    loadTasks();

    document.getElementById('marvin-btn').addEventListener('click', () => {
        if (!getSetting('geminiKey')) {
            openSettings();
            return;
        }
        alert('Hier startet später die Web Speech API. Marvin hört zu...');
    });
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
        loadTasks();
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
    return response.json();
}

async function loadTasks() {
    const loading = document.getElementById('loading');
    loading.style.display = '';
    loading.textContent = 'Marvin holt die Daten...';

    try {
        const result = await callBackend('getTasks');
        if (result.status === 'success') {
            allTasks = result.data;
            loading.style.display = 'none';
            renderTasks();
        } else {
            loading.textContent = 'Fehler beim Laden der Daten.';
        }
    } catch (error) {
        loading.textContent = 'Marvin ist offline (Netzwerkfehler).';
    }
}

// ---------- UI ----------

function initTabs() {
    const tabs = document.querySelectorAll('.tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            currentStatus = tab.dataset.target;
            renderTasks();
        });
    });
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
