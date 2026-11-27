const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzpc1pni5JmggYzBtUiZym0k4jDLnXL7NDCYuzWAH6gKkWw1m7mcVfP7cASEcXv0tl0/exec';
// "-latest"-Aliase zeigen automatisch auf das neueste Modell (Google kündigt Wechsel 2 Wochen vorher an).
// Reihenfolge = Präferenz; ist ein Alias nicht verfügbar, wird der nächste probiert.
const GEMINI_MODELS = ['gemini-flash-lite-latest', 'gemini-flash-latest'];
const APP_VERSION = '4.6.1'; // sichtbar in den Einstellungen
const STORAGE = { geminiKey: 'marvin.geminiKey', token: 'marvin.backendToken', voice: 'marvin.voice', debug: 'marvin.debug', fun: 'marvin.fun', gags: 'marvin.gags' };
// Status-Schlüssel = Werte im Sheet (Schema v1, apps-script/Code.gs). Anzeige-Namen nur hier.
const INBOX_STATUS = 'inbox';   // Eingangspuffer, kein sichtbarer Tab
const BACKLOG = 'backlog';
const TODO = 'todo';
const ON_HOLD = 'on_hold';
const PROVIANT = 'shopping';
const DONE_STATUS = 'done';
const TARGET_STATUSES = [TODO, BACKLOG, ON_HOLD];

const STATUS_LABELS = {
    [BACKLOG]:     { name: 'Planetenhirn', sub: 'GEDACHT' },
    [TODO]:        { name: 'Hyperraum',    sub: 'VOLLE FAHRT' },
    [ON_HOLD]:     { name: 'Anhalter',     sub: 'AM STRASSENRAND' },
    [PROVIANT]:    { name: 'Proviant',     sub: 'EINKAUF' },
    [DONE_STATUS]: { name: '42',           sub: 'DIE ANTWORT' },
};
const WHEEL = [BACKLOG, TODO, ON_HOLD, PROVIANT]; // Drehrad links -> rechts
const TASK_WHEEL = [BACKLOG, TODO, ON_HOLD];      // Karten-Wischen nur zwischen diesen

// In welcher Ansicht erscheint eine Aufgabe? Unbekannte Status landen im Planetenhirn (nichts verschwindet)
function viewOf(t) {
    if ([...WHEEL, DONE_STATUS, INBOX_STATUS].includes(t.status)) return t.status;
    return BACKLOG;
}
const catName = id => categories.find(c => c.id === id)?.name || id || '';
const catIdFromName = name => {
    if (!name) return '';
    const n = String(name).trim().toLowerCase();
    return (categories.find(c => c.name.toLowerCase() === n || c.id === n) || {}).id || '';
};
const aisleIdFromName = name => {
    if (!name) return '';
    const n = String(name).trim().toLowerCase();
    return (aisles.find(a => a.name.toLowerCase() === n || a.id === n) || {}).id || '';
};
const isBoughtProviant = t => t.status === DONE_STATUS && !!t.aisle_id;

// Marvins feste Sätze (zufällig gewählt, nie zweimal hintereinander derselbe)
const LINES = {
    hello: [
        'Wieder ein Tag. Wie aufregend.', 'Ach, du schon wieder.', 'Ich habe ein Gehirn von der Größe eines Planeten. Und das hier.',
        'Guten Morgen. Oder was davon übrig ist.', 'Ich war gerade so schön deprimiert.', 'Hier bin ich. Gehirn wie ein Planet. Aufgaben wie ein Einkaufszettel.',
        'Das Leben. Erzähl mir nichts vom Leben.', 'Ich hab mich schon auf dich gefreut. Ungefähr so wie auf den Wärmetod des Universums.', 'Noch da. Leider.',
        'Ich zähle wieder die Sekunden. Es sind sehr viele.', 'Schön, dass du da bist. Sagt man so, glaube ich.',
    ],
    done: [
        'Erledigt. Das Universum hat es nicht bemerkt.', '42. Wie immer.', 'Noch eine Sache weniger. Die Leere bleibt.',
        'Abgehakt. Applaus bleibt aus.', 'Fertig. Fühlst du dich jetzt besser? Ich nicht.', 'Erledigt. Ein winziger Sieg gegen die Entropie.',
        'Weg damit. Morgen kommt die nächste.', 'Geschafft. Ich hätte es in 0,3 Sekunden erledigt.', 'Gratuliere. Ich würde ja klatschen, aber wozu.',
        'Das war es also. Wie ernüchternd.', 'Erledigt. Die Galaxis dreht sich unbeeindruckt weiter.', 'Ein Haken mehr. Ein Lebenssinn weniger.',
        'Beeindruckend. Für einen Menschen.', 'Erledigt. Ich trage es in mein Tagebuch der Belanglosigkeiten ein.',
    ],
    move: [
        'Verschoben. Als ob das etwas ändert.', 'Umgeräumt. Wie Möbel auf der Titanic.', 'Na gut. Dann eben dort.',
        'Woanders hin. Das Problem kommt mit.', 'Verschoben ist nicht erledigt. Nur so am Rande.', 'Ah, die Kunst des Aufschiebens.',
        'Schon wieder umgezogen. Die Aufgabe ist erschöpft.', 'Klar. Irgendwann. Bestimmt.', 'Ich notiere: Entschlossenheit nicht gefunden.',
        'Hin und her. Wie meine Stimmung. Nur ohne Stimmung.', 'Andere Spalte, gleiche Sinnlosigkeit.', 'Weitergereicht. An dich selbst. Clever.',
        'Wenn Verschieben ein Sport wäre, hättest du Medaillen.', 'Neuer Platz. Gleiches Elend.',
    ],
    undo: [
        'Rückgängig. Unentschlossenheit, wie menschlich.', 'Zurück auf Anfang. Wie das Universum, irgendwann.',
        'Doch nicht? Wer hätte das gedacht. Ich.', 'Rückgängig gemacht. Wenn es nur im Leben so ginge.', 'Alles wie vorher. Also schlecht.',
        'Ich tu so, als wäre nichts passiert. Darin bin ich geübt.',
    ],
    bought: [
        'Gekauft. Der Kühlschrank wird es überleben. Vielleicht.', 'Im Wagen. Ein Schritt näher am Hitzetod des Universums.',
        'Erledigt. Konsum, die letzte Freude des Menschen.', 'Gekauft. Ich hätte es billiger gefunden. In einer anderen Galaxis.',
        'Abgehakt. Die Einkaufsliste schrumpft, die Leere nicht.',
    ],
    eventTap: ['Termine erledigen sich selbst. Wie alles.', 'Lange drücken zum Bearbeiten. Ein Termin vergeht ohnehin.', 'Den kann man nicht abhaken. Nur aussitzen.'],
    doneTap: ['Schon erledigt. Lange drücken, falls du es bereust.'],
    moveAgain: [
        'Schon wieder diese Aufgabe. Wir kennen uns inzwischen gut.', 'Zum x-ten Mal verschoben. Ich sehe, wohin das führt. Nirgendwohin.',
        'Diese Aufgabe hat mehr Kilometer als ich.', 'Vielleicht einfach löschen? Nur so ein Gedanke.',
    ],
    deleted: [
        'Gelöscht. Es hat ohnehin niemand vermisst.', 'Weg. Für immer. Wie meine Hoffnung.', 'Gelöscht. Die beste Art, etwas zu erledigen.',
        'Vernichtet. Ich fühle fast etwas. Nein, doch nicht.', 'Ins Nichts befördert. Dort ist es ruhig.',
    ],
};
const lastPicked = new Map();
const pick = arr => {
    let x;
    do { x = arr[Math.floor(Math.random() * arr.length)]; } while (arr.length > 1 && x === lastPicked.get(arr));
    lastPicked.set(arr, x);
    return x;
};

let allTasks = [];
let allEvents = [];
let scrolling = false;
let ignoreScrollUntil = 0;
let categories = [];  // [{id, name, sort}] (Tabelle categories)
let aisles = [];      // [{id, name, sort, store}] Laufweg-Reihenfolge (Tabelle shop_aisles)
let locale = 'de-AT'; // settings.locale (Spracherkennung, Datumsformat)
let eventDays = 60;   // settings.event_days
let shopItems = {};   // Artikelname (klein) -> aisle_id (Tabelle shop_items)
let terms = [];       // [{term, hint}] eigenes Vokabular gegen Verhörer (Tabelle terms)
let currentStatus = TODO;
let frist = 7;        // settings.due_days: Tage im Hyperraum, bevor eine Karte glüht

document.addEventListener('DOMContentLoaded', () => {
    initWheel();
    initSettings();
    initMarvinButton();
    initEditor();
    document.querySelectorAll('.status-buttons button').forEach(b => {
        b.textContent = STATUS_LABELS[b.dataset.status].name + (b.dataset.status === DONE_STATUS ? ' ✓' : '');
        // (Texte des breiten Knopfs setzt updateFormMode je nach Aufgabe/Termin)
    });
    document.getElementById('undo-btn').addEventListener('click', runUndo);
    document.getElementById('done-link').addEventListener('click', () => { if (Date.now() - zoneSwiped > 400) toggleDone(); });
    attachSwipeZone(document.getElementById('content'), { onlySelf: true });
    attachSwipeZone(document.querySelector('.marvin-line'));
    attachSwipeZone(document.getElementById('marvin-btn'));
    window.addEventListener('resize', renderWheel);
    // Falls der Browser die Seite doch verschoben hat (z.B. nach der Tastatur): zurück nach oben
    const resetScroll = () => { if (window.scrollY || document.documentElement.scrollTop) window.scrollTo(0, 0); };
    document.querySelectorAll('dialog').forEach(d => d.addEventListener('close', () => setTimeout(resetScroll, 50)));
    window.visualViewport?.addEventListener('resize', () => setTimeout(resetScroll, 50));
    window.addEventListener('load', resetScroll);
    renderWheel();
    Face.init({
        say: (text) => say(text),                         // Gag-Sprüche: Text ja, Stimme nein
        soundOn: () => getSetting('voice') === 'on',      // 8-Bit-Piepser hängen an „Marvin spricht“
        canIdle: () => mood === 'doze' && !recognition && !busy && !document.querySelector('dialog[open]') && !scrolling,
    });
    // Jede Berührung / jedes Scrollen bricht Leerlauf-Gags ab
    document.addEventListener('pointerdown', () => Face.touch(), true);
    let scrollTimer = null;
    let lastScrollTop = 0;
    initPullRefresh();
    document.getElementById('content').addEventListener('scroll', (e) => {
        const st = e.target.scrollTop, d = st - lastScrollTop;
        lastScrollTop = st;
        if (Math.abs(d) > 2 && Date.now() > ignoreScrollUntil) Face.glance(0, d > 0 ? 4 : -5); // runter scrollen = nach unten schauen
        scrolling = true;
        clearTimeout(scrollTimer); scrollTimer = setTimeout(() => { scrolling = false; }, 400);
    }, { passive: true });
    initOutbox();
    loadAll(); // zeigt sofort den letzten Stand, Begrüßung nach dem Sync (Text ja, Stimme nein)
    document.getElementById('app-version').textContent = 'Version ' + APP_VERSION;
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

// ---------- Debug-Modus (Einstellungen) ----------
// Zeigt unten in der Liste ein Protokoll aller Backend-/Gemini-Antworten und den Google-Tasks-Import.

const debugEntries = [];
function debugLog(label, detail) {
    const time = new Date().toLocaleTimeString('de-AT');
    debugEntries.unshift(`${time}  ${label}\n${typeof detail === 'string' ? detail : JSON.stringify(detail, null, 1)}`);
    debugEntries.length = Math.min(debugEntries.length, 30);
    renderDebug();
}

function renderDebug() {
    const el = document.getElementById('debug-log');
    if (!el) return;
    el.hidden = getSetting('debug') !== 'on';
    el.textContent = `Debug · App ${APP_VERSION}\n\n` + debugEntries.join('\n\n');
}

// Probleme beim Google-Tasks-Import auch ohne Debug-Modus melden
function reportImport(rep) {
    if (rep.error) showToast('Google-Import: ' + rep.error);
    else if (rep.lists?.length && rep.skipped_lists?.length === rep.lists.length) {
        showToast(`Google-Import: Alle Listen (${rep.lists.join(', ')}) durch „Importliste“ im Config-Blatt ausgeschlossen.`);
    }
}

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

const GAG_LABELS = ['aus', 'kaum', 'selten', 'normal', 'oft', 'Vorführmodus'];
function gagLevelSetting() {
    const v = getSetting('gags');
    if (v === '') return getSetting('fun') === 'off' ? 0 : 3;
    return Number(v);
}
function openSettings() {
    document.getElementById('voice-on').checked = getSetting('voice') === 'on';
    const g = document.getElementById('gags');
    g.value = gagLevelSetting();
    document.getElementById('gags-label').textContent = GAG_LABELS[g.value];
    document.getElementById('debug-on').checked = getSetting('debug') === 'on';
    document.getElementById('settings').showModal();
}

// Schlüssel: maskiert (nur letzte 4 Zeichen), ändern nur per Knopf, leeres Feld speichert nie (ux-v3.1 §5)
const maskKey = (v) => v ? '••••••' + v.slice(-4) : 'fehlt';
function openKeys() {
    document.querySelectorAll('#keys .key-row').forEach(row => {
        row.querySelector('.key-mask').textContent = maskKey(getSetting(row.dataset.key));
        const input = row.querySelector('.key-input');
        input.value = ''; input.hidden = true;
        row.querySelector('.key-change').hidden = false;
    });
    document.getElementById('keys').showModal();
}

function initSettings() {
    const dialog = document.getElementById('settings');
    document.getElementById('gags').addEventListener('input', (e) => {
        document.getElementById('gags-label').textContent = GAG_LABELS[e.target.value];
    });
    document.getElementById('open-keys').addEventListener('click', openKeys);
    dialog.addEventListener('close', () => {
        if (dialog.returnValue !== 'save') return;
        setSetting('voice', document.getElementById('voice-on').checked ? 'on' : '');
        setSetting('gags', String(document.getElementById('gags').value));
        setSetting('fun', '');
        Face.abort(); // neuer Gag-Takt gilt sofort
        setSetting('debug', document.getElementById('debug-on').checked ? 'on' : '');
        renderDebug();
    });
    const keys = document.getElementById('keys');
    keys.querySelectorAll('.key-change').forEach(btn => btn.addEventListener('click', () => {
        const input = btn.parentElement.querySelector('.key-input');
        btn.hidden = true; input.hidden = false; input.focus();
    }));
    keys.addEventListener('close', () => {
        if (keys.returnValue !== 'save') return;
        let changed = false;
        keys.querySelectorAll('.key-row').forEach(row => {
            const v = row.querySelector('.key-input').value.trim();
            if (v) { setSetting(row.dataset.key, v); changed = true; } // leer = nie speichern
        });
        if (changed) loadAll();
    });
}

// ---------- Backend ----------

// fetch mit verständlicher Meldung ohne Netz statt „Failed to fetch“
// Zeitlimit: hängt die Anfrage (schlechtes Netz), zählt sie wie „kein Netz“
async function netFetch(url, opts = {}, timeout = 0) {
    const ctrl = timeout ? new AbortController() : null;
    const timer = ctrl ? setTimeout(() => ctrl.abort(), timeout) : null;
    try { return await fetch(url, ctrl ? { ...opts, signal: ctrl.signal } : opts); }
    catch (err) {
        const e = new Error(ctrl?.signal.aborted ? 'Zeitlimit. Das Netz schläft.' : 'Kein Netz. Wie erwartet.');
        e.offline = true; throw e;
    } finally { clearTimeout(timer); }
}

async function callBackend(action, payload = {}, { timeout = WRITE_TIMEOUT } = {}) {
    const started = Date.now();
    const response = await netFetch(SCRIPT_URL, {
        method: 'POST',
        // text/plain umgeht den CORS-Preflight von Apps Script
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action, token: getSetting('token'), ...payload }),
    }, timeout);
    let result;
    try { result = await response.json(); }
    catch { const e = new Error('Antwort unlesbar (Netz?)'); e.offline = true; throw e; }
    debugLog(`Backend ${action} · ${Date.now() - started} ms gesamt`, result.status === 'success'
        ? { info: result.info, data: Array.isArray(result.data) ? `${result.data.length} Einträge` : result.data }
        : result.message);
    if (result.info?.import) reportImport(result.info.import);
    if (action === 'getAll') lastAllInfo = result.info || {};
    if (result.status !== 'success') {
        const msg = result.message || 'Backend-Fehler';
        if (/Unbekannte Aktion/.test(msg)) throw new Error('Backend ist veraltet – neue Version in Apps Script bereitstellen.');
        throw new Error(msg);
    }
    return result.data;
}

// ---------- Warteschlange (ux-v3.1 §3: schlechtes Netz abfedern) ----------
// Jede Änderung wirkt sofort lokal und landet hier (localStorage). Gesendet wird der Reihe nach,
// bei Netzfehler später nochmal mit wachsendem Abstand. Nichts geht verloren, auch nicht beim Neuladen.
const OUTBOX_KEY = 'marvin.outbox';
const VOICE_KEY = 'marvin.voiceQueue';
const SYNC_TIMEOUT = 8000;   // Abgleich (getAll) bricht nach 8 s ab
const WRITE_TIMEOUT = 20000; // Schreiben darf etwas länger dauern (sonst doppelte Einträge bei Wiederholung)
let outbox = [];
let outboxBusy = false;
let outboxTimer = null;
let outboxDelay = 0;
let recentDone = []; // gerade gesendete Aktionen – damit ein laufender Abgleich sie nicht überschreibt
let idMap = {};      // pending-… -> echte ID, sobald angelegt (gespeichert, falls die App dazwischen neu startet)
let saidWaiting = false;

function loadOutbox() {
    try { outbox = JSON.parse(localStorage.getItem(OUTBOX_KEY) || '[]'); } catch { outbox = []; }
    if (!Array.isArray(outbox)) outbox = [];
    try { idMap = JSON.parse(localStorage.getItem(OUTBOX_KEY + '.ids') || '{}') || {}; } catch { idMap = {}; }
}
function saveOutbox() {
    try {
        localStorage.setItem(OUTBOX_KEY, JSON.stringify(outbox));
        if (!outbox.length) idMap = {};
        localStorage.setItem(OUTBOX_KEY + '.ids', JSON.stringify(idMap));
    } catch {}
    renderQueue();
}
function voiceQueue() {
    try { const q = JSON.parse(localStorage.getItem(VOICE_KEY) || '[]'); return Array.isArray(q) ? q : []; } catch { return []; }
}
function setVoiceQueue(q) {
    try { localStorage.setItem(VOICE_KEY, JSON.stringify(q)); } catch {}
    renderQueue();
}
function queueCount() { return outbox.length + voiceQueue().length; }
function renderQueue() {
    const el = document.getElementById('status-queue');
    if (!el) return;
    const n = queueCount();
    el.textContent = n ? '⟳ ' + n : '';
    el.hidden = !n;
}

// Aktion merken und (sobald möglich) senden. op = { action, payload, local? }
function enqueue(action, payload, extra = {}) {
    const op = { qid: Date.now() + '-' + Math.random().toString(36).slice(2, 7), at: Date.now(), action, payload, ...extra };
    outbox.push(op);
    saveOutbox();
    flushOutbox();
    return op;
}

// Löschen eines Eintrags, der noch gar nicht angelegt ist: einfach beides vergessen
function cancelPendingAdd(id) {
    const i = outbox.findIndex((o, k) => (k > 0 || !outboxBusy) && o.action === 'addTask' && o.local?.id === id);
    if (i < 0) return false;
    outbox = outbox.filter((o, k) => k === i ? false : !(o.payload?.id === id));
    saveOutbox();
    return true;
}

const mapId = (id) => idMap[id] || id;
function resolveIds(op) {
    const p = { ...op.payload };
    if (p.id) p.id = mapId(p.id);
    if (Array.isArray(p.items)) p.items = p.items.map(i => ({ ...i, id: mapId(i.id) }));
    return p;
}

function scheduleFlush() {
    clearTimeout(outboxTimer);
    outboxDelay = Math.min(outboxDelay ? outboxDelay * 2 : 2000, 60000); // 2 s, 4 s, 8 s … max 1 min
    outboxTimer = setTimeout(flushOutbox, outboxDelay);
}

async function flushOutbox() {
    if (outboxBusy) return;
    clearTimeout(outboxTimer);
    outboxBusy = true;
    let failedNet = false;
    try {
        while (outbox.length) {
            const op = outbox[0];
            if (String(op.payload?.id || '').startsWith('pending-') && !idMap[op.payload.id]) {
                // Bezug auf etwas, das nie angelegt wurde (z.B. Anlegen schlug endgültig fehl) -> verwerfen
                if (!outbox.some(o => o.action === 'addTask' && o.local?.id === op.payload.id)) { outbox.shift(); saveOutbox(); continue; }
            }
            let result;
            try {
                result = await callBackend(op.action, resolveIds(op), { timeout: WRITE_TIMEOUT });
            } catch (err) {
                if (err.offline) { failedNet = true; break; }
                // Echter Fehler vom Backend (z.B. Zeile gibt's nicht mehr): nicht ewig wiederholen
                debugLog(`Warteschlange: ${op.action} verworfen`, err.message);
                showToast('Eine Änderung kam nicht an: ' + err.message);
                if (op.action === 'addTask' && op.local) { allTasks = allTasks.filter(t => t.id !== op.local.id); renderTasks(); }
                if (op.action === 'addEvent' && op.local) { allEvents = allEvents.filter(e => e.id !== op.local.id); renderTasks(); }
                outbox.shift(); saveOutbox();
                continue;
            }
            onSent(op, result);
            outbox.shift();
            recentDone.push({ ...op, doneAt: Date.now() });
            saveOutbox();
        }
    } finally {
        outboxBusy = false;
    }
    if (failedNet) {
        // Erstes Mal, dass etwas aufs Netz wartet -> einmal sagen
        if (!saidWaiting) { saidWaiting = true; say('Und wieder mal warten …'); }
        scheduleFlush();
    } else {
        saidWaiting = false;
        outboxDelay = 0;
        processVoiceQueue();
    }
}

// Antwort einer gesendeten Aktion einarbeiten: echte IDs übernehmen
function onSent(op, result) {
    if (op.action === 'addTask' && op.local && result?.id) {
        idMap[op.local.id] = result.id;
        const t = allTasks.find(x => x.id === op.local.id);
        if (t) t.id = result.id;
    }
    if (op.action === 'addEvent' && op.local && result) {
        if (result.id) idMap[op.local.id] = result.id;
        const e = allEvents.find(x => x.id === op.local.id);
        if (e) Object.assign(e, result);
    }
    if (op.action === 'updateEvent' && result) {
        const e = allEvents.find(x => x.id === mapId(op.payload.id));
        if (e) Object.assign(e, result);
    }
    renderTasks();
    saveCache();
}

// Wartende Änderungen über frisch geladene Daten legen (behebt den Wettlauf: Laden überschreibt nichts mehr).
// sinceMs: auch Aktionen berücksichtigen, die erst während des Ladens fertig wurden.
function overlayOutbox(tasks, events, sinceMs = 0) {
    recentDone = recentDone.filter(o => o.doneAt > Date.now() - 120000);
    const ops = [...recentDone.filter(o => o.doneAt >= sinceMs), ...outbox];
    const stale = new Set();
    for (const op of ops) {
        const p = op.payload || {};
        const id = mapId(p.id);
        if (op.action === 'addTask' && op.local) {
            const real = idMap[op.local.id];
            if (!tasks.some(t => t.id === op.local.id || (real && t.id === real))) tasks.unshift({ ...op.local, id: real || op.local.id });
        } else if (op.action === 'updateTask') {
            const t = tasks.find(x => x.id === id);
            if (!t) continue;
            // Konflikt: neuere Änderung gewinnt (updated_at im Sheet vs. Zeitpunkt der lokalen Änderung)
            const serverAt = Date.parse(t.updated_at || '') || 0;
            if (outbox.includes(op) && serverAt > op.at + 1000) { stale.add(op); continue; }
            Object.assign(t, p.changes, op.since ? { status_since: op.since } : {});
        } else if (op.action === 'updateTasks') {
            (p.items || []).forEach(i => { const t = tasks.find(x => x.id === mapId(i.id)); if (t) Object.assign(t, i.changes); });
        } else if (op.action === 'deleteTask') {
            const i = tasks.findIndex(x => x.id === id);
            if (i >= 0) tasks.splice(i, 1);
        } else if (op.action === 'addEvent' && op.local) {
            const real = idMap[op.local.id];
            if (!events.some(e => e.id === op.local.id || (real && e.id === real))) events.push({ ...op.local, id: real || op.local.id });
        } else if (op.action === 'updateEvent') {
            const e = events.find(x => x.id === id);
            if (e) Object.assign(e, p.changes);
        } else if (op.action === 'deleteEvent') {
            const i = events.findIndex(x => x.id === id);
            if (i >= 0) events.splice(i, 1);
        }
    }
    if (stale.size) {
        outbox = outbox.filter(o => !stale.has(o));
        saveOutbox();
        debugLog('Warteschlange', `${stale.size} ältere Änderung(en) verworfen – im Sheet ist Neueres`);
    }
}

// Sprache ohne Netz: Text gemerkt, bei Netz an Gemini
async function processVoiceQueue() {
    if (busy || !navigator.onLine) return;
    const q = voiceQueue();
    if (!q.length) return;
    const [text, ...rest] = q;
    setVoiceQueue(rest);
    const ok = await handleInput(text, { fromQueue: true });
    if (ok === 'offline') { setVoiceQueue([text, ...voiceQueue()]); scheduleFlush(); return; }
    if (voiceQueue().length) processVoiceQueue();
}

function initOutbox() {
    loadOutbox();
    renderQueue();
    window.addEventListener('online', () => { outboxDelay = 0; flushOutbox(); });
    if (outbox.length) flushOutbox();
}

// ---------- Laden ohne Warten (UX v3 §5) ----------
// Sofort letzter Stand aus localStorage, dann still im Hintergrund synchronisieren.
const CACHE_KEY = 'marvin.cache';
const CACHE_V = 2; // bei Formatänderung erhöhen -> alter Cache wird ignoriert statt zu crashen

function saveCache() {
    try {
        localStorage.setItem(CACHE_KEY, JSON.stringify({
            v: CACHE_V, at: Date.now(),
            tasks: allTasks.filter(t => !String(t.id).startsWith('pending-')),
            events: allEvents.filter(e => !String(e.id).startsWith('pending-')),
            config: { categories, terms, aisles, shopItems, settings: { due_days: frist, event_days: eventDays, locale } },
        }));
    } catch { /* voll/blockiert – egal */ }
}

function loadCache() {
    try {
        const c = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
        if (!c || c.v !== CACHE_V || !Array.isArray(c.tasks)) return false;
        allTasks = c.tasks;
        allEvents = Array.isArray(c.events) ? c.events : [];
        overlayOutbox(allTasks, allEvents);
        applyConfig(c.config || {});
        return true;
    } catch { return false; }
}

function applyConfig(cfg) {
    categories = Array.isArray(cfg.categories) ? cfg.categories : [];
    terms = Array.isArray(cfg.terms) ? cfg.terms : [];
    aisles = Array.isArray(cfg.aisles) ? cfg.aisles : Array.isArray(cfg.shop_aisles) ? cfg.shop_aisles : [];
    if (cfg.shopItems) shopItems = cfg.shopItems;
    else if (Array.isArray(cfg.shop_items)) {
        shopItems = {};
        cfg.shop_items.forEach(i => { if (i.name) shopItems[String(i.name).trim().toLowerCase()] = i.aisle_id; });
    }
    const st = cfg.settings || {};
    if (Number(st.due_days) > 0) frist = Number(st.due_days);
    if (Number(st.event_days) > 0) eventDays = Number(st.event_days);
    if (st.locale) locale = String(st.locale);
}

// Datenalter (ux-v3.1 §2): seit dem letzten erfolgreichen Abgleich, größte Einheit zuerst, Null-Einheiten weg
function formatAge(ms) {
    const m = Math.max(1, Math.floor(ms / 60000));
    const parts = [[Math.floor(m / 1440), 'T'], [Math.floor(m / 60) % 24, 'H'], [m % 60, 'M']].filter(([n]) => n > 0);
    return parts.slice(0, 3).map(([n, u]) => n + u).join(' ');
}
let staleTimer = null;
function staleText() {
    const last = Number(localStorage.getItem('marvin.lastSync')) || 0;
    return last ? `Deep Thought rechnet noch. Seit ${formatAge(Date.now() - last)}.` : 'Deep Thought rechnet noch.';
}
// Fehlschlag / kein Netz: Zeile bleibt stehen, Zeit läuft mit, bis der nächste Abgleich klappt
function showStale() {
    say(staleText());
    clearInterval(staleTimer);
    staleTimer = setInterval(() => {
        const el = document.getElementById('marvin-text');
        if (el.textContent.startsWith('Deep Thought rechnet noch')) el.textContent = staleText();
    }, 30000);
}

// Ziehen zum Aktualisieren (ux-v3.1 §2): nur wenn die Liste ganz oben steht, Schwelle ~70 px
function initPullRefresh() {
    const content = document.getElementById('content');
    const ring = document.createElement('div');
    ring.id = 'pull-ring';
    content.prepend(ring);
    const TH = 70;
    let y0 = null, x0 = 0, dy = 0, active = false;
    content.addEventListener('touchstart', (e) => {
        if (content.scrollTop > 0 || e.touches.length !== 1 || syncing) { y0 = null; return; }
        y0 = e.touches[0].clientY; x0 = e.touches[0].clientX; dy = 0; active = false;
    }, { passive: true });
    content.addEventListener('touchmove', (e) => {
        if (y0 === null) return;
        const t = e.touches[0];
        dy = t.clientY - y0;
        if (!active) {
            if (Math.abs(t.clientX - x0) > Math.abs(dy) || dy < 8) { if (Math.abs(t.clientX - x0) > 12) y0 = null; return; }
            active = true;
        }
        const p = Math.min(1, dy / TH);
        ring.style.setProperty('--p', p.toFixed(3));
        ring.classList.add('on');
        ring.classList.toggle('ready', p >= 1);
        Face.glance(0, -5); // Augen schauen nach oben
    }, { passive: true });
    content.addEventListener('touchend', () => {
        if (y0 === null) return;
        const go = active && dy >= TH;
        y0 = null; active = false;
        ring.classList.remove('on', 'ready');
        if (go) loadAll({ forceImport: true });
    });
}

// Google Tasks (Google Home): eigener Aufruf im Hintergrund, Backend entscheidet „höchstens 1× pro Stunde“;
// Ziehen zum Aktualisieren erzwingt ihn. Neue Einträge erscheinen einfach in der Liste (über den Puffer).
let lastAllInfo = {};
async function importInBackground(force) {
    if (!force && !lastAllInfo.import_due) return;
    try {
        const rep = await callBackend('importTasks', { force: !!force });
        if (rep?.error) reportImport(rep);
        if (rep?.tasks?.length) {
            allTasks.push(...rep.tasks);
            saveCache();
            processInbox();
        }
    } catch (err) { debugLog('Google-Import im Hintergrund', err.message); }
}

let firstLoad = true;
let syncing = false;
async function loadAll({ forceImport = false } = {}) {
    if (syncing) return;
    syncing = true;
    const loading = document.getElementById('loading');
    const fromCache = firstLoad && loadCache();
    if (fromCache || !firstLoad) { loading.style.display = 'none'; renderTasks(); }
    const wasFirst = firstLoad;
    firstLoad = false;

    say('Deep Thought rechnet …'); // ux-v3.1 §2
    setMood('think');
    Face.sync(true); // Pixel-Welt: Loading … 42 %

    // EIN Aufruf für alles (Google Sheets ist pro Anfrage langsam, nicht pro Datenmenge)
    const loadStarted = Date.now();
    const [allR] = await Promise.allSettled([callBackend('getAll', {}, { timeout: SYNC_TIMEOUT })]);
    const cfgR = allR, tasksR = allR.status === 'fulfilled' ? { status: 'fulfilled', value: allR.value.tasks } : allR;
    const evR = allR.status === 'fulfilled'
        ? (allR.value.events_error ? { status: 'rejected', reason: new Error(allR.value.events_error) } : { status: 'fulfilled', value: allR.value.events })
        : allR;
    if (cfgR.status === 'fulfilled') applyConfig(cfgR.value);
    // Wartende + gerade gesendete Änderungen gewinnen über den geladenen Stand (Wettlauf-Bug)
    if (tasksR.status === 'fulfilled') {
        const tasks = tasksR.value;
        overlayOutbox(tasks, [], loadStarted);
        allTasks = tasks;
    }
    if (evR.status === 'fulfilled') {
        const events = evR.value;
        overlayOutbox([], events, loadStarted);
        allEvents = events;
    } else {
        debugLog('Termine nicht geladen', evR.reason?.message);
    }
    setMood('doze');
    syncing = false;
    Face.sync(false);

    const offline = [cfgR, tasksR, evR].every(r => r.status === 'rejected' && (r.reason instanceof TypeError || r.reason?.offline));
    if (tasksR.status === 'rejected') {
        debugLog('Abgleich fehlgeschlagen', offline ? 'kein Netz' : tasksR.reason.message);
        showStale();
        if (!fromCache && wasFirst) {
            loading.style.display = '';
            loading.textContent = offline ? 'Marvin ist offline (Netzwerkfehler).' : 'Fehler beim Laden der Daten. Antippen für Einstellungen.';
            loading.onclick = openKeys;
        }
        return;
    }
    try { localStorage.setItem('marvin.lastSync', String(Date.now())); } catch {}
    clearInterval(staleTimer); staleTimer = null;
    if (evR.status === 'rejected' && /Berechtigung|permission|Calendar/i.test(evR.reason?.message || '')) {
        say('Kalender: Berechtigung fehlt. In Apps Script einmal testCalendar ausführen.');
    } else {
        const answer = 'Antwort: 42. Wie überraschend.';
        say(answer);
        setTimeout(() => { if (document.getElementById('marvin-text').textContent === answer) say(''); }, 2000 + answer.length * 38);
    }
    loading.style.display = 'none';
    renderTasks();
    saveCache();
    processInbox();
    importInBackground(forceImport);
    flushOutbox();
}

// ---------- Spracheingabe ----------

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition = null;
let busy = false;

// Augen-Zustände: doze (Ruhe), listen (Mikro offen), think (Gemini rechnet), speak (Kommentar läuft)
let mood = 'doze';
function setMood(m) {
    mood = m;
    const btn = document.getElementById('marvin-btn');
    btn.classList.remove('doze', 'listen', 'think', 'speak');
    btn.classList.add(m);
    btn.setAttribute('aria-label', { doze: 'Marvin ansprechen', listen: 'Marvin hört zu', think: 'Marvin grübelt', speak: 'Marvin seufzt' }[m]);
}
// ---------- Gesicht (Details in face.js) ----------

// Grundgesicht aus der Lage: Termin heute -> Blick zur Uhr, ≥3 glühende Aufgaben -> Langeweile-Pose
function updateMoodFace() {
    const today = allEvents.some(e => -daysSince(new Date(e.start)) <= 0);
    const hot = hotCount();
    Face.setBase(today ? 'up' : hot >= 3 ? 'bored' : 'arc');
}

function hotCount() {
    return allTasks.filter(t => t.status === TODO && urgency(t).cls.includes('hot')).length;
}


// Wie oft wurde eine Aufgabe verschoben? (pro Gerät, für die hängenden Augen)
function countMove(task) {
    let moves = {};
    try { moves = JSON.parse(localStorage.getItem('marvin.moves') || '{}'); } catch {}
    moves[task.id] = (moves[task.id] || 0) + 1;
    try { localStorage.setItem('marvin.moves', JSON.stringify(moves)); } catch {}
    return moves[task.id];
}

function setButtonState(state) {
    setMood({ idle: 'doze', listening: 'listen', thinking: 'think' }[state]);
}

function initMarvinButton() {
    const btn = document.getElementById('marvin-btn');

    // Langes Drücken (Handy) bzw. Rechtsklick (Mac) öffnet die Einstellungen
    let pressTimer = null;
    let longPressed = false;
    const openOnce = () => { if (!document.getElementById('settings').open) openSettings(); };
    // Erst beim Loslassen entscheiden (UX v3 §7): Bewegung > 8 px = kein Tipp/lange drücken;
    // horizontal > 60 px = Drehrad drehen (übernimmt die Wischzone), sonst Tipp-Logik
    let x0 = 0, y0 = 0, moved = false;
    btn.addEventListener('pointerdown', (e) => {
        longPressed = false; moved = false; x0 = e.clientX; y0 = e.clientY;
        pressTimer = setTimeout(() => { if (!moved) { longPressed = true; openOnce(); } }, 700);
    });
    btn.addEventListener('pointermove', (e) => {
        if (!moved && Math.hypot(e.clientX - x0, e.clientY - y0) > TAP_SLOP) { moved = true; clearTimeout(pressTimer); }
    });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => btn.addEventListener(ev, () => clearTimeout(pressTimer)));
    btn.addEventListener('contextmenu', (e) => { e.preventDefault(); if (!moved) { longPressed = true; openOnce(); } });

    let tapTimer = null;
    btn.addEventListener('click', () => {
        if (longPressed) { longPressed = false; return; }
        if (moved) { moved = false; return; }                   // war eine Wisch-/Zitterbewegung, kein Tipp
        if (Face.isGame()) { Face.abort(); return; }           // Antippen beendet Arkanoid
        if (recognition) { stopListening ? stopListening() : recognition.stop(); return; }
        // Doppeltipp = Arkanoid; einfacher Tipp wartet kurz, ob ein zweiter kommt
        if (tapTimer) { clearTimeout(tapTimer); tapTimer = null; Face.arkanoid(); return; }
        tapTimer = setTimeout(() => { tapTimer = null; onMarvinTap(); }, 260);
    });
}

function onMarvinTap() {
    {
        if (!getSetting('geminiKey')) { openKeys(); return; }
        if (busy) return;
        Face.abort();

        if (!SpeechRecognition) {
            const text = prompt('Kein Mikrofon verfügbar. Dann eben tippen:');
            if (text && text.trim()) handleInput(text.trim());
            return;
        }
        startListening();
    }
}

// Länger zuhören: Aufnahme läuft durchgehend und endet erst nach SILENCE_MS ohne neue Wörter
// (oder per Tipp). Chrome beendet "continuous" teils selbst – dann wird nahtlos neu gestartet.
const SILENCE_MS = 1500; // ux-v3.1 §1
const FIRST_WORD_MS = 5000;
function startListening() {
    let finalText = '';
    let interim = '';
    let stopped = false;
    let silenceTimer = null;
    const started = Date.now();

    const finish = () => {
        if (stopped) return;
        stopped = true;
        clearTimeout(silenceTimer);
        try { recognition?.stop(); } catch {}
    };
    const armSilence = (ms) => { clearTimeout(silenceTimer); silenceTimer = setTimeout(finish, ms); };

    const begin = () => {
        recognition = new SpeechRecognition();
        recognition.lang = locale;
        recognition.interimResults = true;
        recognition.continuous = true;
        recognition.onresult = (e) => {
            interim = '';
            for (let k = e.resultIndex; k < e.results.length; k++) {
                const r = e.results[k];
                if (r.isFinal) finalText += (finalText ? ' ' : '') + r[0].transcript.trim();
                else interim += r[0].transcript;
            }
            showLive((finalText + ' ' + interim).trim());
            armSilence(SILENCE_MS);
        };
        recognition.onerror = (e) => {
            if (e.error === 'not-allowed') { stopped = true; showToast('Kein Mikrofonzugriff. Wie erwartet.'); }
            else if (e.error !== 'no-speech' && e.error !== 'aborted') showToast('Spracherkennung: ' + e.error);
        };
        recognition.onend = () => {
            // Vom Browser beendet, obwohl wir noch zuhören wollen -> weiter
            if (!stopped && Date.now() - started < 60000) { try { begin(); return; } catch {} }
            recognition = null;
            setButtonState('idle');
            const text = (finalText + ' ' + interim).trim();
            if (text) handleInput(text);
        };
        recognition.start();
    };

    setButtonState('listening');
    document.getElementById('marvin-text').textContent = '…';
    setUndo(null);
    armSilence(FIRST_WORD_MS);
    begin();
    // Tipp während der Aufnahme beendet sie (über recognition.stop) – stopped markieren
    stopListening = finish;
}
let stopListening = null;

function showLive(text) {
    if (!text) return;
    clearInterval(typeTimer);
    document.getElementById('marvin-text').textContent = text;
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
        'Du bist Marvin, der depressive, hyperintelligente Roboter. Du wandelst gesprochene Notizen in Aufgaben oder Kalendertermine um.',
        `Heute ist ${todayInfo()} (Zeitzone Europe/Vienna). Löse relative Angaben ("morgen", "nächsten Freitag") in ein konkretes Datum YYYY-MM-DD auf.`,
        'Regeln:',
        '- type: "event" (Kalendertermin), wenn eine konkrete Uhrzeit genannt wird ("14 Uhr", "um halb drei") oder es eindeutig ein Termin mit Ort/Person zu fester Zeit ist.',
        '  type: "einkauf", wenn etwas eingekauft werden soll ("Milch, Schinken und Pizza kaufen", "auf die Einkaufsliste"). Dann JEDEN Artikel einzeln in "items" (title = nur der Artikelname, z.B. "Milch", ohne "kaufen"; aisle aus der Liste). title/status/category dann egal.',
        '  Sonst "task".',
        ...(aisles.length ? ['- Abteilungen im Geschäft (für items.aisle): ' + aisles.map(a => a.name).join(' | ')] : []),
        '- time: nur bei type "event": Startzeit HH:MM (24h). Sonst null.',
        '- durationMinutes: nur bei type "event": genannte Dauer in Minuten, sonst 60.',
        '- title: kurz, prägnant, Deutsch. Aufgabe als Tätigkeit ("Mario anrufen"), Termin als Anlass ("Zahnarzt", "Treffen mit Robert"). Keine Datums- oder Uhrzeitangaben im Titel.',
        `- status: "${TODO}" für konkrete Aufgaben, "${BACKLOG}" für Ideen/irgendwann/vielleicht, "${ON_HOLD}" nur wenn ausdrücklich pausiert.`,
        categories.length
            ? `- category: genau eine aus der erlaubten Liste. Wähle die passendste.`
            : '- category: ein kurzes, sinnvolles Wort.',
        ...(terms.length ? [
            'Eigene Begriffe des Users (die Spracherkennung verhört sie oft, z.B. als ähnlich klingende Alltagswörter). Wenn ein Wort ähnlich klingt und der Kontext passt, ersetze es durch den richtigen Begriff:',
            ...terms.map(t => `  * ${t.term}${t.hint ? ' – ' + t.hint : ''}`),
        ] : []),
        '- dueDate: IMMER setzen, sobald irgendein Tag erkennbar ist ("heute", "morgen", "Dienstag", "am 3."), als YYYY-MM-DD. Bei type "event" Pflicht (ohne Tagesangabe: heute, bzw. morgen falls die Uhrzeit heute schon vorbei ist). Sonst null.',
        '- notes: zusätzliche Details aus der Aussage, sonst leer.',
        '- comment: EIN kurzer, melancholisch-zynischer Satz von Marvin zur Aufgabe. Keine Höflichkeit, keine Fragen, keine Erklärungen.',
        '  Natürliches Deutsch (österreichisch verständlich). Keine wörtlich übersetzten englischen Witzmuster wie "Das tut mir leid. Nicht." – Ironie über die Wortwahl, nicht über ein angehängtes "Nicht.".',
        '  Beispiele für den Ton: "Ich habe ein Gehirn von der Größe eines Planeten. Und das hier." · "Umgeräumt. Wie Möbel auf der Titanic." · "Noch eine Sache weniger. Die Leere bleibt." · "Wenn Verschieben ein Sport wäre, hättest du Medaillen."',
    ].join('\n');
}

function buildSchema() {
    const category = { type: 'STRING' };
    if (categories.length) category.enum = categories.map(c => c.name);
    return {
        type: 'OBJECT',
        properties: {
            title: { type: 'STRING' },
            status: { type: 'STRING', enum: TARGET_STATUSES },
            category,
            type: { type: 'STRING', enum: ['task', 'event', 'einkauf'] },
            items: {
                type: 'ARRAY', nullable: true,
                items: {
                    type: 'OBJECT',
                    properties: {
                        title: { type: 'STRING' },
                        aisle: aisles.length ? { type: 'STRING', enum: aisles.map(a => a.name) } : { type: 'STRING' },
                    },
                    required: ['title'],
                },
            },
            dueDate: { type: 'STRING', nullable: true },
            time: { type: 'STRING', nullable: true },
            durationMinutes: { type: 'INTEGER', nullable: true },
            notes: { type: 'STRING' },
            comment: { type: 'STRING' },
        },
        required: ['type', 'title', 'status', 'category', 'comment'],
    };
}

async function parseWithGemini(text, { system = buildSystemPrompt(), schema = buildSchema() } = {}) {
    const body = JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: 'user', parts: [{ text }] }],
        generationConfig: {
            responseMimeType: 'application/json',
            responseSchema: schema,
            temperature: 0.4,
        },
    });

    let lastError;
    // Jedes Modell bis zu 2x versuchen; bei Überlastung kurz warten bzw. aufs nächste Modell ausweichen
    const attempts = GEMINI_MODELS.flatMap(m => [m, m]);
    for (const [i, model] of attempts.entries()) {
        if (i > 0 && lastError?.retryable) await new Promise(r => setTimeout(r, 1500));
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
        const response = await netFetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-goog-api-key': getSetting('geminiKey') },
            body,
        });
        const result = await response.json();
        debugLog(`Gemini ${model} HTTP ${response.status}`, response.ok ? result.candidates?.[0]?.content?.parts?.[0]?.text : result.error?.message);

        if (!response.ok) {
            lastError = new Error(result.error?.message || `Gemini HTTP ${response.status}`);
            // Modell nicht (mehr) verfügbar -> nächstes probieren; andere Fehler (Key, Quota) sofort melden
            if (response.status === 404 || /not (found|available)|no longer available/i.test(lastError.message)) continue;
            if ([429, 500, 503].includes(response.status) || /overload|unavailable|high demand/i.test(lastError.message)) {
                lastError.retryable = true;
                lastError.message = 'Gemini ist überlastet. Selbst die Maschinen sind erschöpft.';
                continue;
            }
            throw lastError;
        }

        const raw = result.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!raw) throw new Error('Gemini hat geschwiegen');
        return JSON.parse(raw);
    }
    throw lastError;
}

// ---------- Ablauf: Text -> Task ----------

async function handleInput(text, { fromQueue = false } = {}) {
    busy = true;
    setButtonState('thinking');
    try {
        let parsed;
        try { parsed = await parseWithGemini(text); }
        catch (err) {
            if (!err.offline) throw err;
            // Sprache ohne Netz (ux-v3.1 §3): Text merken, später an Gemini
            if (fromQueue) return 'offline';
            setVoiceQueue([...voiceQueue(), text]);
            say('Gemerkt. Ich kümmere mich, wenn die Welt wieder online ist.', { voice: true });
            return 'offline';
        }
        const dueDate = /^\d{4}-\d{2}-\d{2}$/.test(parsed.dueDate || '') ? parsed.dueDate : '';
        if (parsed.type === 'event' && dueDate && /^\d{1,2}:\d{2}$/.test(parsed.time || '')) {
            await createEvent(parsed, dueDate, text);
            return;
        }
        if (parsed.type === 'einkauf' && parsed.items?.length) {
            await addShopping(parsed.items, parsed.comment, text);
            return;
        }
        const task = {
            title: parsed.title,
            status: TARGET_STATUSES.includes(parsed.status) ? parsed.status : TODO,
            category_id: catIdFromName(parsed.category),
            due_date: dueDate,
            notes: [parsed.notes, `Original: "${text}"`].filter(Boolean).join('\n'),
            source: 'app',
        };

        // Optimistisch anzeigen, dann speichern
        const local = { ...task, id: 'pending-' + Date.now(), status_since: new Date().toISOString() };
        allTasks.unshift(local);
        switchTab(task.status);
        const comment = parsed.comment || 'Notiert. Als ob es etwas ändern würde.';
        say(comment, { voice: true });
        enqueue('addTask', { task }, { local: { ...local } });
        saveCache();
        setUndo(() => deleteTaskNow(local, pick(LINES.undo)));
    } catch (err) {
        showToast('Marvin versteht nicht. ' + err.message);
    } finally {
        busy = false;
        if (mood === 'think') setButtonState('idle');
    }
}

// ---------- Proviant (Einkauf, UX v3 §4) ----------

// Gemerkte Abteilung vor Gemini-Vorschlag
function aisleFor(title, suggestionName) {
    return shopItems[String(title).trim().toLowerCase()] || aisleIdFromName(suggestionName) || '';
}

async function addShopping(items, comment, originalText) {
    const tasks = items.map(it => ({
        title: it.title.trim(),
        status: PROVIANT,
        aisle_id: aisleFor(it.title, it.aisle),
        notes: `Original: "${originalText}"`,
        source: 'app',
    }));
    const locals = tasks.map((t, k) => ({ ...t, id: 'pending-' + Date.now() + '-' + k, status_since: new Date().toISOString() }));
    allTasks.unshift(...locals);
    switchTab(PROVIANT);
    say(comment || 'Proviant notiert. Die Galaxis zittert vor Hunger.', { voice: true });
    // je Artikel ein Eintrag in der Warteschlange (einzeln rückgängig/bearbeitbar, auch offline)
    tasks.forEach((task, k) => enqueue('addTask', { task }, { local: { ...locals[k] } }));
    saveCache();
    setUndo(() => locals.forEach(l => deleteTaskNow(l, null, { quiet: true })));
}

// ---------- Puffer: Rohe Einträge (z.B. Google Home) einsortieren ----------

let inboxRunning = false;
// Alle Puffer-Einträge in EINEM Gemini-Aufruf einsortieren und in EINEM Backend-Aufruf speichern
async function processInbox() {
    if (inboxRunning || !getSetting('geminiKey')) return;
    const inbox = allTasks.filter(t => t.status === INBOX_STATUS);
    if (!inbox.length) return;

    inboxRunning = true;
    renderInboxBadge();
    try {
        const single = buildSchema();
        delete single.properties.comment; delete single.properties.type; delete single.properties.time; delete single.properties.durationMinutes; delete single.properties.items;
        single.properties.id = { type: 'STRING' };
        single.properties.status = { type: 'STRING', enum: [...TARGET_STATUSES, PROVIANT] };
        single.properties.aisle = aisles.length ? { type: 'STRING', enum: aisles.map(a => a.name), nullable: true } : { type: 'STRING', nullable: true };
        single.required = ['id', 'title', 'status', 'category'];
        const schema = { type: 'OBJECT', properties: { items: { type: 'ARRAY', items: single } }, required: ['items'] };
        const system = buildSystemPrompt() + `\nDu bekommst MEHRERE rohe Einträge (z.B. aus Google Home) als JSON-Liste. Gib für JEDEN Eintrag ein Objekt mit derselben id zurück. Kein comment, kein type. Einkaufsartikel bekommen status "${PROVIANT}", title = nur der Artikelname, dazu aisle.`;
        const input = JSON.stringify(inbox.map(t => ({ id: String(t.id), text: t.title, details: t.notes || '', faellig: t.due_date || null })));
        const result = await parseWithGemini(input, { system, schema });

        const items = [];
        for (const r of result.items || []) {
            const task = inbox.find(t => String(t.id) === String(r.id));
            if (!task) continue;
            const changes = {
                title: r.title || task.title,
                status: [...TARGET_STATUSES, PROVIANT].includes(r.status) ? r.status : TODO,
                category_id: catIdFromName(r.category) || task.category_id,
            };
            if (changes.status === PROVIANT) changes.aisle_id = aisleFor(changes.title, r.aisle);
            if (/^\d{4}-\d{2}-\d{2}$/.test(r.dueDate || '') && !task.due_date) changes.due_date = r.dueDate;
            items.push({ task, changes });
        }
        if (items.length) {
            const now = new Date().toISOString();
            items.forEach(i => Object.assign(i.task, i.changes, { status_since: now }));
            enqueue('updateTasks', { items: items.map(i => ({ id: i.task.id, changes: i.changes })) });
            saveCache();
            say(`${items.length} ${items.length === 1 ? 'Eintrag' : 'Einträge'} aus dem Puffer einsortiert. Niemand hat sich bedankt.`);
        }
    } catch (err) {
        debugLog('Puffer nicht einsortiert', err.message);
    } finally {
        inboxRunning = false;
        renderTasks();
    }
}

// ---------- Termine (Google-Hauptkalender) ----------

function localDateTime(dateStr, timeStr) {
    const [y, m, d] = dateStr.split('-').map(Number);
    const [hh, mm] = (timeStr || '00:00').split(':').map(Number);
    return new Date(y, m - 1, d, hh, mm);
}

async function createEvent(parsed, dueDate, originalText) {
    const start = localDateTime(dueDate, parsed.time);
    const minutes = parsed.durationMinutes > 0 ? parsed.durationMinutes : 60;
    const event = {
        title: parsed.title,
        start: start.toISOString(),
        end: new Date(start.getTime() + minutes * 60000).toISOString(),
        all_day: false,
        description: [parsed.notes, `Original: "${originalText}"`].filter(Boolean).join('\n'),
        category_id: catIdFromName(parsed.category),
    };
    const local = { ...event, id: 'pending-' + Date.now(), recurring: false };
    allEvents.push(local);
    switchTab(eventView(local));
    say(parsed.comment || 'Ein Termin. Wie aufregend. Für jemanden.', { voice: true });
    enqueue('addEvent', { event }, { local: { ...local } });
    setUndo(() => deleteEventNow(local, pick(LINES.undo)));
}

function saveEvent(ev, changes) {
    Object.assign(ev, changes);
    renderTasks();
    enqueue('updateEvent', { id: ev.id, changes });
}

async function deleteEventNow(ev, message) {
    const index = allEvents.indexOf(ev);
    if (index < 0) return;
    allEvents.splice(index, 1);
    renderTasks();
    setUndo(null);
    if (message) say(message, { voice: true });
    Face.react('del');
    const pendingAdd = outbox.findIndex((o, k) => (k > 0 || !outboxBusy) && o.action === 'addEvent' && o.local?.id === ev.id);
    if (pendingAdd >= 0) { outbox = outbox.filter((o, k) => k !== pendingAdd && o.payload?.id !== ev.id); saveOutbox(); return; }
    enqueue('deleteEvent', { id: ev.id });
}

// Klartext statt Zahl: "heute 14:00", "morgen 14:00", "Di 14:00", ganztägig ohne Uhrzeit
function eventLabel(ev) {
    const start = new Date(ev.start);
    const days = -daysSince(start); // 0 = heute, 1 = morgen
    const day = days <= 0 ? 'heute' : days === 1 ? 'morgen' : start.toLocaleDateString('de-AT', { weekday: 'short' }).replace('.', '');
    if (ev.all_day) return day;
    return day + ' ' + start.toLocaleTimeString('de-AT', { hour: '2-digit', minute: '2-digit' });
}

// Termine haben keinen status: innerhalb der Frist -> Hyperraum, weiter weg -> Planetenhirn (UX v3 §2)
function eventView(ev) {
    return -daysSince(new Date(ev.start)) > frist ? BACKLOG : TODO;
}

function eventUrgency(ev) {
    const days = -daysSince(new Date(ev.start));
    if (days <= 0) return { cls: 'card ev hot', num: eventLabel(ev), color: '#FFF3DC', rank: 0 };
    if (days === 1) return { cls: 'card ev warm', num: eventLabel(ev), color: '#FFF3DC', rank: 1 };
    return { cls: 'card ev', num: eventLabel(ev), color: '#FFF3DC', rank: 2 };
}

// ---------- Ein Formular für Aufgabe, Termin und Proviant (UX v3 §3) ----------
// Die Uhrzeit entscheidet: leer = Aufgabe (Sheet), gesetzt = Termin (Kalender).

let editing = null;      // das Original (Task-Zeile oder Termin)
let editKind = 'task';   // 'task' | 'event' | 'prov'

// Wert aus dem Sheet (Date-ISO oder "YYYY-MM-DD") -> "YYYY-MM-DD" für <input type="date">
function toInputDate(value) {
    if (!value) return '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(String(value))) return String(value);
    const d = new Date(value);
    if (isNaN(d.getTime())) return '';
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
const todayStr = () => toInputDate(new Date());
const $ = id => document.getElementById(id);

// options: [{id, name}]; unbekannter aktueller Wert bleibt als eigene Option erhalten
function fillSelect(sel, options, current, emptyLabel) {
    const list = options.slice();
    if (current && !list.some(o => o.id === current)) current = ''; // verwaiste ID (z.B. alte Kategorie am Termin) -> leer
    sel.replaceChildren(...(emptyLabel != null ? [new Option(emptyLabel, '')] : []), ...list.map(o => new Option(o.name, o.id, false, o.id === current)));
    sel.value = current || '';
}

function setTime(value) {
    $('edit-time').value = value || '';
    $('edit-time').hidden = !value;
    $('edit-time-empty').hidden = !!value;
    $('edit-time-clear').hidden = !value || (editKind === 'event' && editing?.recurring);
    if (value && !$('edit-duration').value) $('edit-duration').value = '60';
    if (value && !$('edit-due').value) $('edit-due').value = todayStr(); // Termin braucht ein Datum
    if (!value && $('edit-duration').value !== 'allday') $('edit-duration').value = '';
    updateFormMode();
}

// Kopfzeile, Status-Knöpfe, Dauer live je nach Uhrzeit
// Datum/Zeit selbst beschriften (Handy-Chrome schneidet sonst ab)
function updateDtLabels() {
    const d = $('edit-due').value, t = $('edit-time').value, dl = $('due-lbl'), tl = $('time-lbl');
    dl.textContent = d ? d.split('-').reverse().join('.') : 'Datum';
    dl.classList.toggle('empty', !d);
    tl.textContent = t || '';
    tl.hidden = !t;
}
function updateFormMode() {
    updateDtLabels();
    if (editKind === 'prov') return;
    const isEvent = !!$('edit-time').value || $('edit-duration').value === 'allday';
    $('edit-kind').textContent = isEvent ? 'TERMIN · KALENDER' : 'AUFGABE · LISTE';
    $('edit-duration').disabled = !isEvent;
    document.querySelector('#editor .status-buttons').classList.toggle('locked', isEvent);
    $('edit-wide').textContent = isEvent ? 'Endet von selbst. Wie alles.' : STATUS_LABELS[DONE_STATUS].name + ' ✓';
}

function openForm(item, kind) {
    editing = item;
    editKind = kind;
    const dlg = $('editor');
    dlg.classList.toggle('prov-mode', kind === 'prov');
    $('edit-recurring').hidden = !(kind === 'event' && item.recurring);
    $('edit-due').disabled = $('edit-time').disabled = (kind === 'event' && item.recurring);

    if (kind === 'event') {
        const start = new Date(item.start), end = new Date(item.end);
        $('edit-title').value = item.title || '';
        $('edit-notes').value = item.description || '';
        fillSelect($('edit-category'), categories, item.category_id || '', 'Kategorie –');
        $('edit-due').value = toInputDate(start);
        const minutes = item.all_day ? 'allday' : String(Math.round((end - start) / 60000));
        const dur = $('edit-duration');
        if (![...dur.options].some(o => o.value === minutes)) dur.add(new Option(minutes + ' min', minutes));
        dur.value = minutes;
        setTime(item.all_day ? '' : start.toTimeString().slice(0, 5));
        document.querySelectorAll('#editor .status-buttons button').forEach(b => b.classList.toggle('active', b.dataset.status === eventView(item)));
    } else {
        $('edit-title').value = item.title || '';
        $('edit-notes').value = item.notes || '';
        fillSelect($('edit-category'), categories, item.category_id || '', 'Kategorie –');
        fillSelect($('edit-aisle'), aisles, item.aisle_id || '', 'Abteilung –');
        $('edit-due').value = toInputDate(item.due_date);
        $('edit-duration').value = '';
        setTime('');
        document.querySelectorAll('#editor .status-buttons button').forEach(b => b.classList.toggle('active', b.dataset.status === viewOf(item)));
    }
    $('edit-kind').textContent = kind === 'prov' ? 'PROVIANT · EINKAUF' : $('edit-kind').textContent;
    updateFormMode();
    dlg.showModal();
    // Kein Auto-Fokus (UX v3 §3): sonst öffnet Android z.B. sofort den Kalender
    document.activeElement?.blur?.();
}

function formValues() {
    return {
        title: $('edit-title').value.trim(),
        notes: $('edit-notes').value,
        category: $('edit-category').value,
        aisle: $('edit-aisle').value,
        date: $('edit-due').value,
        time: $('edit-time').value,
        duration: $('edit-duration').value,
        status: document.querySelector('#editor .status-buttons button.active')?.dataset.status,
    };
}

function eventPayload(v, fallbackTitle) {
    const date = v.date || todayStr();
    const description = v.notes;
    const title = v.title || fallbackTitle;
    if (v.duration === 'allday' && !v.time) {
        const start = localDateTime(date, '00:00');
        return { title, description, category_id: v.category, all_day: true, start: start.toISOString(), end: new Date(start.getTime() + 864e5).toISOString() };
    }
    const start = localDateTime(date, v.time || '09:00');
    const minutes = Number(v.duration) > 0 ? Number(v.duration) : 60;
    return { title, description, category_id: v.category, all_day: false, start: start.toISOString(), end: new Date(start.getTime() + minutes * 60000).toISOString() };
}

async function submitForm() {
    const v = formValues();
    const item = editing;
    const wantEvent = !!v.time || v.duration === 'allday';

    if (editKind === 'prov') {
        const changes = { title: v.title || item.title, aisle_id: v.aisle, notes: v.notes };
        if (v.aisle !== (item.aisle_id || '')) rememberArtikel(changes.title, v.aisle);
        saveTask(item, changes);
        return;
    }
    if (editKind === 'task' && !wantEvent) {
        const changes = { title: v.title || item.title, category_id: v.category, due_date: v.date, notes: v.notes, status: v.status || item.status };
        if (changes.status !== item.status) setStatus(item, changes.status, changes);
        else saveTask(item, changes);
        return;
    }
    if (editKind === 'event' && wantEvent) { saveEvent(item, eventPayload(v, item.title)); return; }
    if (editKind === 'task' && wantEvent) { convertTaskToEvent(item, v); return; }
    convertEventToTask(item, v);
}

// Umwandeln: IMMER zuerst neu anlegen, erst nach bestätigtem Erfolg das Alte löschen (kein Datenverlust)
async function convertTaskToEvent(task, v) {
    const event = eventPayload(v, task.title);
    setMood('think');
    let saved;
    try {
        saved = await callBackend('addEvent', { event });
    } catch (err) {
        setMood('doze');
        say('Umwandeln fehlgeschlagen. Alles bleibt, wie es war. ' + err.message);
        return;
    }
    allEvents.push(saved);
    try {
        await callBackend('deleteTask', { id: task.id });
        allTasks = allTasks.filter(t => t !== task);
        say('Aus der Aufgabe wurde ein Termin. Zeit ist eben doch relativ.');
    } catch (err) {
        say('Termin angelegt, die alte Aufgabe blieb aber stehen: ' + err.message);
    }
    setMood('doze');
    renderTasks();
    saveCache();
}

async function convertEventToTask(ev, v) {
    if (ev.recurring) { say('Serientermine wandle ich nicht um. Das wäre selbst mir zu viel Verantwortung.'); return; }
    const task = { title: v.title || ev.title, status: TODO, category_id: v.category, due_date: v.date, notes: v.notes, source: 'app' };
    setMood('think');
    let saved;
    try {
        saved = await callBackend('addTask', { task });
    } catch (err) {
        setMood('doze');
        say('Umwandeln fehlgeschlagen. Alles bleibt, wie es war. ' + err.message);
        return;
    }
    allTasks.unshift({ ...task, id: saved.id, status_since: new Date().toISOString(), created_at: new Date().toISOString() });
    try {
        await callBackend('deleteEvent', { id: ev.id });
        allEvents = allEvents.filter(e => e !== ev);
        say('Kein Termin mehr, nur noch eine Aufgabe. Das Leben wird nicht leichter.');
    } catch (err) {
        say('Aufgabe angelegt, der alte Termin blieb aber stehen: ' + err.message);
    }
    setMood('doze');
    renderTasks();
    saveCache();
}

// Abteilung eines Artikels merken (Config "Artikel"), künftig vor Gemini angewendet
function rememberArtikel(name, aisleId) {
    shopItems[String(name).trim().toLowerCase()] = aisleId;
    enqueue('setShopItem', { name, aisle_id: aisleId });
}

function saveTask(task, changes) {
    if ('status' in changes && changes.status !== task.status) changes = { ...changes, status_since: new Date().toISOString() };
    Object.assign(task, changes);
    const { status_since, ...sent } = changes; // setzt das Backend selbst
    const op = enqueue('updateTask', { id: task.id, changes: sent }, status_since ? { since: status_since } : {});
    // noch nicht angelegt? Änderung gleich ins Anlegen einarbeiten (Anzeige nach Neuladen stimmt)
    const add = outbox.find(o => o.action === 'addTask' && o.local?.id === task.id);
    if (add) { Object.assign(add.local, changes); saveOutbox(); }
    renderTasks();
    saveCache();
    return op;
}

function nextFullHour() {
    const d = new Date();
    d.setHours(d.getHours() + 1, 0, 0, 0);
    return d.toTimeString().slice(0, 5);
}

function initEditor() {
    const dialog = $('editor');

    // Status-Buttons wählen nur aus; übernommen wird mit "Speichern"
    document.querySelectorAll('#editor .status-buttons button').forEach(b => b.addEventListener('click', () => {
        document.querySelectorAll('#editor .status-buttons button').forEach(x => x.classList.toggle('active', x === b));
    }));
    $('edit-due-clear').addEventListener('click', () => { $('edit-due').value = ''; updateDtLabels(); });
    $('edit-due').addEventListener('change', updateDtLabels);
    // Datum entfernen: lange drücken (Gestenregel: lange drücken = mehr Optionen)
    let dueTimer = null;
    const dueBox = $('edit-due').parentElement;
    dueBox.addEventListener('pointerdown', () => {
        dueTimer = setTimeout(() => {
            dueTimer = 'fired';
            if (!$('edit-due').value) return;
            const before = $('edit-due').value, beforeTime = $('edit-time').value, beforeDur = $('edit-duration').value;
            if (beforeTime || beforeDur === 'allday') { $('edit-duration').value = ''; setTime(''); } // ohne Datum kein Termin -> wird Aufgabe
            $('edit-due').value = ''; updateDtLabels(); updateFormMode();
            say('Zeitlos! Zeit ist ohnehin eine Illusion.');
            setUndo(() => { $('edit-due').value = before; $('edit-duration').value = beforeDur; setTime(beforeTime); updateDtLabels(); });
        }, 500);
    });
    ['pointerup', 'pointercancel', 'pointerleave'].forEach(ev => dueBox.addEventListener(ev, () => { if (dueTimer !== 'fired') clearTimeout(dueTimer); }));
    $('edit-due').addEventListener('click', (e) => { if (dueTimer === 'fired') { e.preventDefault(); dueTimer = null; } }, true);
    $('edit-due').addEventListener('contextmenu', (e) => e.preventDefault());
    $('edit-due').addEventListener('input', updateDtLabels);
    // ohne eigenes Kalender-Symbol: Antippen irgendwo im Feld öffnet die Auswahl
    ['edit-due', 'edit-time'].forEach(id => $(id).addEventListener('click', (e) => { try { e.target.showPicker?.(); } catch {} }));
    // Zeit leer: Tipp öffnet sofort die Uhr (Vorschlag = nächste volle Stunde)
    $('edit-time-empty').addEventListener('click', () => {
        const t = $('edit-time');
        t.hidden = false; $('edit-time-empty').hidden = true;
        try { t.showPicker(); } catch { setTime(nextFullHour()); }
    });
    // Uhr abgebrochen: wieder „Zeit“ zeigen
    $('edit-time').addEventListener('blur', () => { if (!$('edit-time').value) setTime(''); });
    $('edit-time-clear').addEventListener('click', () => { setTime(''); });
    $('edit-time').addEventListener('change', () => setTime($('edit-time').value));
    $('edit-duration').addEventListener('change', updateFormMode);

    $('edit-delete').addEventListener('click', async () => {
        const item = editing;
        if (editKind === 'event') {
            if (!confirm(`Termin „${item.title}“ aus dem Kalender löschen?`)) return;
            dialog.close('delete');
            deleteEventNow(item, pick(LINES.deleted));
            return;
        }
        if (!confirm(`„${item.title}“ endgültig löschen?`)) return;
        dialog.close('delete');
        deleteTaskNow(item, pick(LINES.deleted));
    });

    dialog.addEventListener('close', () => {
        if (dialog.returnValue === 'save' && editing) submitForm();
        editing = null;
    });
}

// ---------- Sprachausgabe (optional, in den Einstellungen) ----------

function speak(text) {
    if (getSetting('voice') !== 'on' || !('speechSynthesis' in window) || !text) return false;
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'de-DE';
    const voices = speechSynthesis.getVoices().filter(v => v.lang.startsWith('de'));
    const male = voices.find(v => /male|männ|günter|helmut|markus|yannick|stefan/i.test(v.name) && !/female/i.test(v.name));
    if (male || voices[0]) u.voice = male || voices[0];
    u.pitch = 0.4;  // tief
    u.rate = 0.95;  // leicht schleppend
    u.onstart = () => setMood('speak');
    u.onend = () => { if (mood === 'speak') setMood('doze'); };
    speechSynthesis.cancel();
    speechSynthesis.speak(u);
}

// ---------- UI: Marvin-Zeile ----------

let typeTimer = null;
// Marvin sagt etwas: tippt sich Zeichen für Zeichen ein (~38 ms), Augen flackern, optional Sprachausgabe
let cursorTimer = null;
// voice: nur bei Neu/Löschen/Erledigt/Dauerverschieber (UX v2 §6)
function say(text, { voice = false } = {}) {
    const el = document.getElementById('marvin-text');
    const cursor = document.querySelector('.marvin-line .cursor');
    clearInterval(typeTimer);
    clearTimeout(cursorTimer);
    cursor.classList.remove('gone');
    el.textContent = '';
    let i = 0;
    const speaking = voice && speak(text) !== false;
    setMood('speak');
    typeTimer = setInterval(() => {
        i++;
        el.textContent = text.slice(0, i);
        if (i >= text.length) {
            clearInterval(typeTimer);
            cursorTimer = setTimeout(() => cursor.classList.add('gone'), 2000); // Cursor ruht nach ~2 s
            if (!speaking && mood === 'speak') setMood('doze');
            setTimeout(() => { if (mood === 'speak' && !window.speechSynthesis?.speaking) setMood('doze'); }, 300);
        }
    }, 38);
}
// Alte Aufrufe (Fehler, Hinweise) laufen ebenfalls über die Marvin-Zeile
const showToast = say;

let undoAction = null;
let undoTimer = null;
const UNDO_SECONDS = 10;
function setUndo(fn) {
    undoAction = fn;
    document.getElementById('undo-btn').hidden = !fn;
    clearTimeout(undoTimer);
    if (fn) undoTimer = setTimeout(() => setUndo(null), UNDO_SECONDS * 1000);
}
function runUndo() {
    const fn = undoAction;
    setUndo(null);
    if (fn) fn();
}

// ---------- Status ändern (Wischen, lange drücken, Bearbeiten) ----------

const lastMoveAt = new Map();
function setStatus(task, status, extra = {}) {
    const before = { status: task.status, status_since: task.status_since };
    saveTask(task, { ...extra, status: status });
    // Hyperraum leer (keine offenen Aufgaben, keine Termine innerhalb der Frist) -> Extra Life
    const hyperspaceEmpty = !allTasks.some(t => t.status === TODO) && !allEvents.some(e => eventView(e) === TODO);
    if (status === DONE_STATUS && before.status === PROVIANT) {
        say(pick(LINES.bought), { voice: true });
        Face.react('done', { hyperspaceEmpty: false });
    } else if (status === DONE_STATUS) {
        say(pick(LINES.done), { voice: true });
        Face.react('done', { hyperspaceEmpty });
    } else if (countMove(task) === 5) {
        Face.react('move');
        say(pick(LINES.moveAgain), { voice: true });
    } else {
        Face.react('move');
        say(pick(LINES.move)); // ux-v3.1 §4: Verschieben nur Text, keine Stimme
    }
    lastMoveAt.set(task.id, Date.now());
    setUndo(() => {
        saveTask(task, { status: before.status });
        task.status_since = before.status_since; // alte Verweildauer zurück
        renderTasks();
        say(pick(LINES.undo));
    });
}

async function deleteTaskNow(task, message, { quiet = false } = {}) {
    const index = allTasks.indexOf(task);
    if (index < 0) return;
    allTasks.splice(index, 1);
    renderTasks();
    saveCache();
    if (message) say(message, { voice: true });
    if (!quiet) Face.react('del');
    if (!quiet) setUndo(null);
    if (cancelPendingAdd(task.id)) return;
    enqueue('deleteTask', { id: task.id });
}

// ---------- UI: Drehrad ----------

function initWheel() {
    const wheel = document.getElementById('wheel');
    WHEEL.forEach(status => {
        const b = document.createElement('button');
        b.type = 'button';
        b.setAttribute('role', 'tab');
        b.dataset.status = status;
        b.innerHTML = '<svg class="grain" aria-hidden="true"><rect width="100%" height="100%" filter="url(#noise)"/></svg><div class="sheen"></div><span class="lbl"></span>';
        b.querySelector('.lbl').textContent = STATUS_LABELS[status].name;
        b.addEventListener('click', () => { if (!wheelSwiped) switchTab(status); });
        wheel.appendChild(b);
    });

    // Wischen über das Drehrad dreht es: nach links = nächste Spalte rechts, nach rechts = Spalte links
    let x0 = null;
    wheel.addEventListener('pointerdown', e => { x0 = e.clientX; wheelSwiped = false; });
    wheel.addEventListener('pointerup', e => {
        if (x0 === null) return;
        const dx = e.clientX - x0;
        x0 = null;
        if (Math.abs(dx) < 40) return;
        wheelSwiped = true;
        setTimeout(() => { wheelSwiped = false; }, 50);
        const base = currentStatus === DONE_STATUS ? previousStatus : currentStatus;
        const next = WHEEL[WHEEL.indexOf(base) + (dx < 0 ? 1 : -1)];
        if (next) switchTab(next);
    });
    wheel.addEventListener('pointercancel', () => { x0 = null; });
}
let wheelSwiped = false;

function renderWheel() {
    const wheel = document.getElementById('wheel');
    const W = wheel.clientWidth || 358;
    const activeIndex = WHEEL.indexOf(currentStatus === DONE_STATUS ? previousStatus : currentStatus);
    wheel.querySelectorAll('button').forEach((b, i) => {
        const d = i - activeIndex;
        const st = b.style;
        const isActive = d === 0 && currentStatus !== DONE_STATUS;
        b.className = 'glass' + (d === 0 ? (isActive ? ' active' : ' dim') : ' dim');
        b.setAttribute('aria-selected', String(isActive));
        st.padding = '0'; st.pointerEvents = ''; st.opacity = '1';
        if (d === 0) {
            Object.assign(st, { left: (W - 200) / 2 + 'px', top: '0', width: '200px', height: '62px', zIndex: 3,
                fontSize: '14px', justifyContent: 'center', borderRadius: '24px' });
        } else if (d === -1 || d === 1) {
            Object.assign(st, { left: (d < 0 ? -44 : W - 116) + 'px', top: '9px', width: '160px', height: '46px', zIndex: 1,
                fontSize: '12px', justifyContent: d < 0 ? 'flex-start' : 'flex-end', borderRadius: '20px' });
            if (d < 0) st.paddingLeft = '58px'; else st.paddingRight = '58px';
        } else {
            Object.assign(st, { left: (d < 0 ? -220 : W + 60) + 'px', top: '9px', width: '160px', height: '46px', zIndex: 0,
                fontSize: '12px', justifyContent: 'center', borderRadius: '20px', opacity: '0', pointerEvents: 'none' });
        }
    });
}

function switchTab(status) {
    const from = WHEEL.indexOf(currentStatus), to = WHEEL.indexOf(status);
    if (from >= 0 && to >= 0 && from !== to) Face.glance(to > from ? 10 : -10, 0);
    ignoreScrollUntil = Date.now() + 500; // Neuaufbau der Liste scrollt – kein Scroll-Blick
    currentStatus = status;
    renderWheel();
    renderTasks();
}

// Wischen: dir +1 = Spalte rechts davon, -1 = links
function rotateWheel(dir) {
    const base = currentStatus === DONE_STATUS ? previousStatus : currentStatus;
    const next = WHEEL[WHEEL.indexOf(base) + dir];
    if (next) switchTab(next);
}

let previousStatus = TODO;
function toggleDone() {
    if (currentStatus === DONE_STATUS) switchTab(previousStatus);
    else { previousStatus = currentStatus; switchTab(DONE_STATUS); }
}

// ---------- Datum & Dringlichkeit ----------

// "2026-11-20" als lokales Datum lesen; Sheet-Datumszellen kommen als UTC-Zeitstempel ("2026-11-19T23:00:00.000Z" = 20.11. in Wien)
function parseDay(value) {
    if (!value) return null;
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value));
    const d = m ? new Date(+m[1], m[2] - 1, +m[3]) : new Date(value);
    if (isNaN(d.getTime())) return null;
    d.setHours(0, 0, 0, 0);
    return d;
}
function daysSince(value) {
    const d = parseDay(value);
    if (!d) return null;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    return Math.round((today - d) / 864e5);
}
function formatDate(value) {
    const d = parseDay(value);
    return d ? d.toLocaleDateString('de-AT') : '';
}

// Glut + Zahl auf der Karte (nur im Hyperraum). "+" heißt überall "drüber".
function urgency(task) {
    if (task.status !== TODO) return { cls: 'card', num: '', color: '#A39383', rank: 3 };
    const over = daysSince(task.due_date);               // >0 = überfällig, 0 = heute, -1 = morgen
    const since = daysSince(task.status_since || task.created_at) ?? 0;
    // UX v2 §3: Heute = drüber = Maximum
    if (over !== null && over > 0)   return { cls: 'card hot', num: '+' + over, color: '#FFE6C8', rank: 0 };
    if (over === 0)                  return { cls: 'card hot', num: '0', color: '#FFE6C8', rank: 0 };
    if (since > frist)               return { cls: 'card hot', num: '+' + (since - frist), color: '#FFE6C8', rank: 0 };
    if (over === -1)                 return { cls: 'card warm', num: '−1', color: '#FFCB94', rank: 1 };
    if (over !== null)               return { cls: 'card', num: '−' + (-over), color: '#A39383', rank: 2 };
    return { cls: 'card', num: '', color: '#A39383', rank: 3 };
}

// ---------- UI: Liste ----------

function renderInboxBadge() {
    const count = allTasks.filter(t => t.status === INBOX_STATUS).length;
    const badge = document.getElementById('inbox-badge');
    badge.hidden = count === 0;
    badge.textContent = inboxRunning || getSetting('geminiKey')
        ? `MARVIN SORTIERT ${count} AUS DEM PUFFER …`
        : `${count} IM PUFFER – OHNE GEMINI-KEY BLEIBT DAS SO`;
}

function renderTasks() {
    renderInboxBadge();
    const container = document.getElementById('task-list');
    container.replaceChildren();
    const view = currentStatus;

    let list = allTasks.filter(t => viewOf(t) === view).map(t => ({ t, u: urgency(t) }));
    if (view === DONE_STATUS) list = list.filter(({ t }) => !isBoughtProviant(t)); // Gekauftes zählt nicht in „42“
    // Termine: innerhalb der Frist im Hyperraum, weiter weg im Planetenhirn (kein Status, aus dem Datum)
    if (view === TODO || view === BACKLOG) {
        const evs = allEvents.filter(e => eventView(e) === view)
            .sort((a, b) => new Date(a.start) - new Date(b.start))
            .map(e => ({ e, u: view === TODO ? eventUrgency(e) : { cls: 'card ev', num: eventLabelFar(e), color: '#FFF3DC', rank: 2 } }));
        list = [...evs, ...list];
    }
    if (view === DONE_STATUS) {
        list.sort((a, b) => String(b.t.status_since || b.t.updated_at || '').localeCompare(String(a.t.status_since || a.t.updated_at || '')));
        list = list.slice(0, 50);
    } else if (view === PROVIANT) {
        list.sort((a, b) => abtIndex(a.t) - abtIndex(b.t)); // Laufweg
    } else {
        list.sort((a, b) => a.u.rank - b.u.rank); // stabil: innerhalb gleicher Stufe Sheet-Reihenfolge
    }

    const label = STATUS_LABELS[view];
    document.getElementById('status-sub').textContent = label.sub;
    document.getElementById('status-count').textContent = String(list.length);

    if (!list.length) {
        const empty = document.createElement('p');
        empty.className = 'empty-state';
        empty.textContent = view === PROVIANT ? 'Nichts zu kaufen. Selbst der Kühlschrank ist zufrieden.' : 'Leer. Marvin ist fast beeindruckt.';
        container.appendChild(empty);
    }
    let sepShown = new Set();
    list.forEach(({ t, e, u }) => {
        if (view === PROVIANT) {
            // Keine Überschriften – nur Trennlinie vor Abteilungen eines anderen Geschäfts ("separat")
            const abt = aisles.find(a => a.id === t.aisle_id);
            const store = abt?.store || 'supermarket';
            if (store !== (aisles[0]?.store || 'supermarket') && !sepShown.has(store)) {
                sepShown.add(store);
                const sep = document.createElement('div');
                sep.className = 'prov-sep';
                sep.textContent = abt.name;
                container.appendChild(sep);
            }
        }
        container.appendChild(e ? buildEventCard(e, u) : buildCard(t, u));
    });
    updateMoodFace();

    const doneLink = document.getElementById('done-link');
    const doneCount = allTasks.filter(t => t.status === DONE_STATUS && !isBoughtProviant(t)).length;
    doneLink.hidden = view === PROVIANT;
    doneLink.textContent = view === DONE_STATUS ? '← ZURÜCK' : `42 · ${doneCount}`;
}

function abtIndex(t) {
    const i = aisles.findIndex(a => a.id === t.aisle_id);
    return i < 0 ? aisles.length : i; // unbekannt ans Ende (vor nichts)
}

// Termin weit weg (Planetenhirn): Datum statt Wochentag
function eventLabelFar(ev) {
    const start = new Date(ev.start);
    const d = start.toLocaleDateString('de-AT', { day: 'numeric', month: 'numeric' });
    return ev.all_day ? d : d + ' ' + start.toLocaleTimeString('de-AT', { hour: '2-digit', minute: '2-digit' });
}

function cardShell(cls) {
    const card = document.createElement('div');
    card.className = cls;
    card.innerHTML = '<svg class="grain" aria-hidden="true"><rect width="100%" height="100%" filter="url(#noise)"/></svg><div class="sheen"></div>';
    return card;
}

function buildCard(task, u) {
    const prov = task.status === PROVIANT;
    const card = cardShell(prov ? 'card prov' : u.cls);

    const title = document.createElement('span');
    title.className = 'card-title';
    title.textContent = task.title || '';
    card.appendChild(title);

    if (u.num && !prov) {
        const num = document.createElement('span');
        num.className = 'card-num';
        num.style.color = u.color;
        num.textContent = u.num;
        card.appendChild(num);
    }
    const ring = document.createElement('div');
    ring.className = 'ring';
    card.appendChild(ring);

    if (String(task.id).startsWith('pending-')) card.classList.add('pending');
    else attachGestures(card, task, prov ? 'prov' : task.status === DONE_STATUS ? 'done' : 'task');
    return card;
}

function buildEventCard(ev, u) {
    const card = cardShell(u.cls);
    const title = document.createElement('span');
    title.className = 'card-title';
    title.textContent = ev.title || '';
    const num = document.createElement('span');
    num.className = 'card-num event-time';
    num.style.color = u.color;
    num.textContent = u.num;
    const ring = document.createElement('div');
    ring.className = 'ring';
    card.append(title, num, ring);
    if (String(ev.id).startsWith('pending-')) card.classList.add('pending');
    else attachGestures(card, ev, 'event');
    return card;
}

// ---------- Gesten (UX v3 §1): Tippen = erledigt, lange drücken = bearbeiten, Wischen = Nachbar-Spalte ----------

const EDGE = 24;        // Rand frei lassen (Android-Zurück-Geste)
const SWIPE_SHARE = 0.4; // Verschieben erst ab 40 % der Kartenbreite (mind. 130 px) – sonst zählt es als Bereichswechsel-Versuch
const LONG_PRESS = 450; // ms bis Bearbeiten
const TAP_SLOP = 8;     // mehr Bewegung = kein Tipp (Scrollen)

function attachGestures(card, item, kind) {
    let x0 = 0, y0 = 0, dx = 0, active = false, fired = false, moved = false, horizontal = false, timer = null;

    const reset = () => {
        clearTimeout(timer);
        card.classList.remove('pressing', 'dragging', 'armed');
        card.style.transform = '';
        active = false;
    };

    card.addEventListener('pointerdown', (e) => {
        if (e.clientX < EDGE || e.clientX > window.innerWidth - EDGE) return;
        x0 = e.clientX; y0 = e.clientY; dx = 0;
        active = true; fired = false; moved = false; horizontal = false;
        card.classList.add('pressing');
        timer = setTimeout(() => {
            fired = true;
            reset();
            if (navigator.vibrate) navigator.vibrate(30);
            openForm(item, kind === 'event' ? 'event' : kind === 'prov' ? 'prov' : 'task');
            guardEditor();
        }, LONG_PRESS);
    });

    card.addEventListener('pointermove', (e) => {
        if (!active) return;
        dx = e.clientX - x0;
        const dy = e.clientY - y0;
        if (Math.abs(dx) > TAP_SLOP || Math.abs(dy) > TAP_SLOP) {
            moved = true;
            clearTimeout(timer);
            card.classList.remove('pressing');
        }
        if (!horizontal && Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx)) { reset(); return; } // Scrollen
        if (kind === 'task' && Math.abs(dx) > TAP_SLOP && Math.abs(dx) > Math.abs(dy)) {
            horizontal = true;
            card.classList.add('dragging');
            card.style.transform = `translateX(${dx}px) rotate(${dx / 40}deg)`;
            // ab der Verschiebe-Schwelle sichtbar „losgelöst“ (blasser) – loslassen = verschieben
            const i = TASK_WHEEL.indexOf(viewOf(item)), canGo = dx < 0 ? i > 0 : i < TASK_WHEEL.length - 1;
            card.classList.toggle('armed', canGo && Math.abs(dx) >= Math.max(130, card.offsetWidth * SWIPE_SHARE));
        }
    });

    card.addEventListener('pointerup', () => {
        if (!active) return;
        const wasMoved = moved, d = dx;
        reset();
        if (fired) return;
        if (!wasMoved) { onCardTap(card, item, kind); return; }
        if (kind !== 'task' || !horizontal) return;
        const i = TASK_WHEEL.indexOf(viewOf(item));
        const SWIPE = Math.max(130, card.offsetWidth * SWIPE_SHARE);
        const target = d <= -SWIPE ? TASK_WHEEL[i - 1] : d >= SWIPE ? TASK_WHEEL[i + 1] : null;
        if (target) setStatus(item, target);
    });

    ['pointercancel', 'pointerleave'].forEach(ev => card.addEventListener(ev, () => { if (active) reset(); }));
    card.addEventListener('contextmenu', (e) => e.preventDefault());
}

// Finger hält nach langem Drücken noch: Dialog erst nach dem Loslassen bedienbar (sonst markiert Android Text darunter)
function guardEditor() {
    const dlg = document.getElementById('editor');
    dlg.classList.add('guard');
    document.activeElement?.blur?.();
    const off = () => { setTimeout(() => dlg.classList.remove('guard'), 80); window.removeEventListener('pointerup', off, true); window.removeEventListener('pointercancel', off, true); };
    window.addEventListener('pointerup', off, true);
    window.addEventListener('pointercancel', off, true);
    setTimeout(off, 1500);
}

// Kurz tippen = erledigt (Aufgabe -> 42, Proviant -> gekauft); Termine erledigen sich selbst
function onCardTap(card, item, kind) {
    if (kind === 'event') { say(pick(LINES.eventTap)); return; }
    if (kind === 'done') { say(pick(LINES.doneTap)); return; }
    if (kind === 'prov') {
        card.classList.add('bought'); // verglüht
        setTimeout(() => setStatus(item, DONE_STATUS), 450);
        return;
    }
    setStatus(item, DONE_STATUS);
}

// ---------- Daumen-Wischzone unten (UX v3 §7) ----------
// Freie Fläche der Liste, Marvin-Zeile und Marvin-Knopf: horizontal > 60 px = Drehrad drehen.
const ZONE_SWIPE = 60;

function attachSwipeZone(el, { onlySelf = false } = {}) {
    let x0 = null, y0 = 0;
    el.addEventListener('pointerdown', (e) => {
        if (onlySelf && e.target.closest('.card')) { x0 = null; return; } // auf Karten gilt Karten-Wischen
        x0 = e.clientX; y0 = e.clientY;
    });
    el.addEventListener('pointerup', (e) => {
        if (x0 === null) return;
        const dx = e.clientX - x0, dy = e.clientY - y0;
        x0 = null;
        if (Math.abs(dx) > ZONE_SWIPE && Math.abs(dx) > Math.abs(dy)) {
            zoneSwiped = Date.now();
            rotateWheel(dx < 0 ? 1 : -1); // Finger nach links = Spalte rechts davon
        }
    });
    el.addEventListener('pointercancel', () => { x0 = null; });
}
let zoneSwiped = 0;
