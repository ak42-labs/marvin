const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzpc1pni5JmggYzBtUiZym0k4jDLnXL7NDCYuzWAH6gKkWw1m7mcVfP7cASEcXv0tl0/exec';
// "-latest"-Aliase zeigen automatisch auf das neueste Modell (Google kündigt Wechsel 2 Wochen vorher an).
// Reihenfolge = Präferenz; ist ein Alias nicht verfügbar, wird der nächste probiert.
const GEMINI_MODELS = ['gemini-flash-lite-latest', 'gemini-flash-latest'];
const APP_VERSION = '2.0.1'; // sichtbar in den Einstellungen
const STORAGE = { geminiKey: 'marvin.geminiKey', token: 'marvin.backendToken', voice: 'marvin.voice', debug: 'marvin.debug', fun: 'marvin.fun' };
const INBOX_STATUS = 'Puffer'; // Eingangspuffer, kein sichtbarer Tab
const TARGET_STATUSES = ['Zu tun', 'Gedächtnis', 'Pausiert'];
const DONE_STATUS = 'Erledigt';

// Anzeigenamen – interne Status-Werte im Sheet bleiben unverändert (UX v1, docs/ux-v1.md)
const STATUS_LABELS = {
    'Gedächtnis': { name: 'Planetenhirn', sub: 'GEDACHT' },
    'Zu tun':     { name: 'Hyperraum',    sub: 'VOLLE FAHRT' },
    'Pausiert':   { name: 'Anhalter',     sub: 'AM STRASSENRAND' },
    'Erledigt':   { name: '42',           sub: 'DIE ANTWORT' },
};
const WHEEL = ['Gedächtnis', 'Zu tun', 'Pausiert']; // Drehrad links -> rechts

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
let overdueReacted = false; // Termine aus dem Google-Hauptkalender (live, nicht im Sheet)
let categories = [];
let terms = []; // eigenes Vokabular aus Config (Typ "Begriff")
let currentStatus = 'Zu tun';
let frist = 7; // Tage im Hyperraum, bevor eine Karte glüht (Config: Frist)

document.addEventListener('DOMContentLoaded', () => {
    initWheel();
    initSettings();
    initMarvinButton();
    initEditor();
    document.querySelectorAll('.status-buttons button').forEach(b => {
        b.textContent = STATUS_LABELS[b.dataset.status].name + (b.dataset.status === DONE_STATUS ? ' ✓' : '');
    });
    document.getElementById('undo-btn').addEventListener('click', runUndo);
    document.getElementById('done-link').addEventListener('click', toggleDone);
    window.addEventListener('resize', renderWheel);
    // Falls der Browser die Seite doch verschoben hat (z.B. nach der Tastatur): zurück nach oben
    const resetScroll = () => { if (window.scrollY || document.documentElement.scrollTop) window.scrollTo(0, 0); };
    document.querySelectorAll('dialog').forEach(d => d.addEventListener('close', () => setTimeout(resetScroll, 50)));
    window.visualViewport?.addEventListener('resize', () => setTimeout(resetScroll, 50));
    window.addEventListener('load', resetScroll);
    renderWheel();
    Face.init({
        say: (text) => say(text),                         // Gag-Sprüche: Text ja, Stimme nein
        canIdle: () => mood === 'doze' && !recognition && !busy && !document.querySelector('dialog[open]') && !scrolling,
    });
    // Jede Berührung / jedes Scrollen bricht Leerlauf-Gags ab
    document.addEventListener('pointerdown', () => Face.touch(), true);
    let scrollTimer = null;
    document.getElementById('content').addEventListener('scroll', () => {
        scrolling = true; Face.touch();
        clearTimeout(scrollTimer); scrollTimer = setTimeout(() => { scrolling = false; }, 400);
    }, { passive: true });
    say(pick(LINES.hello)); // Begrüßung: Text ja, Stimme nein
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
    else if (rep.lists?.length && rep.skippedLists?.length === rep.lists.length) {
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

function openSettings() {
    document.getElementById('gemini-key').value = getSetting('geminiKey');
    document.getElementById('backend-token').value = getSetting('token');
    document.getElementById('voice-on').checked = getSetting('voice') === 'on';
    document.getElementById('fun-on').checked = getSetting('fun') !== 'off';
    document.getElementById('debug-on').checked = getSetting('debug') === 'on';
    document.getElementById('settings').showModal();
}

function initSettings() {
    const dialog = document.getElementById('settings');
    dialog.addEventListener('close', () => {
        if (dialog.returnValue !== 'save') return;
        setSetting('geminiKey', document.getElementById('gemini-key').value.trim());
        setSetting('token', document.getElementById('backend-token').value.trim());
        setSetting('voice', document.getElementById('voice-on').checked ? 'on' : '');
        setSetting('fun', document.getElementById('fun-on').checked ? '' : 'off');
        if (!Face.funEnabled()) Face.abort();
        setSetting('debug', document.getElementById('debug-on').checked ? 'on' : '');
        renderDebug();
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
    debugLog(`Backend ${action}`, result.status === 'success'
        ? { info: result.info, data: Array.isArray(result.data) ? `${result.data.length} Einträge` : result.data }
        : result.message);
    if (result.info?.import) reportImport(result.info.import);
    if (result.status !== 'success') {
        const msg = result.message || 'Backend-Fehler';
        if (/Unbekannte Aktion/.test(msg)) throw new Error('Backend ist veraltet – neue Version in Apps Script bereitstellen.');
        throw new Error(msg);
    }
    return result.data;
}

async function loadAll() {
    const config = callBackend('getConfig')
        .then(cfg => {
            categories = cfg.categories || [];
            terms = cfg.terms || [];
            if (Number.isFinite(cfg.frist)) frist = cfg.frist;
        })
        .catch(() => { categories = []; terms = []; });
    loadEvents();
    await loadTasks();
    await config;
    processInbox();
}

async function loadEvents() {
    try {
        allEvents = await callBackend('getEvents', { days: frist });
    } catch (err) {
        allEvents = [];
        debugLog('Termine nicht geladen', err.message);
        if (/Berechtigung|permission|Calendar/i.test(err.message)) say('Kalender: Berechtigung fehlt. In Apps Script einmal testCalendar ausführen.');
    }
    renderTasks();
}

async function loadTasks() {
    const loading = document.getElementById('loading');
    loading.style.display = '';
    loading.textContent = 'Marvin holt die Daten...';

    try {
        allTasks = await callBackend('getTasks');
        loading.style.display = 'none';
        renderTasks();
        reactToOverdue();
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
    return allTasks.filter(t => t.Status === 'Zu tun' && urgency(t).cls.includes('hot')).length;
}

// Beim Öffnen: viel Überfälliges -> Schock (A) bzw. Böse (B), abwechselnd
function reactToOverdue() {
    if (overdueReacted || hotCount() < 3) return;
    overdueReacted = true;
    let last = '';
    try { last = localStorage.getItem('marvin.overdueFace') || ''; } catch {}
    const kind = last === 'shock' ? 'frown' : 'shock';
    try { localStorage.setItem('marvin.overdueFace', kind); } catch {}
    setTimeout(() => Face.react(kind), 600);
}

// Wie oft wurde eine Aufgabe verschoben? (pro Gerät, für die hängenden Augen)
function countMove(task) {
    let moves = {};
    try { moves = JSON.parse(localStorage.getItem('marvin.moves') || '{}'); } catch {}
    moves[task.ID] = (moves[task.ID] || 0) + 1;
    try { localStorage.setItem('marvin.moves', JSON.stringify(moves)); } catch {}
    return moves[task.ID];
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
    btn.addEventListener('pointerdown', () => {
        longPressed = false;
        pressTimer = setTimeout(() => { longPressed = true; openOnce(); }, 700);
    });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => btn.addEventListener(ev, () => clearTimeout(pressTimer)));
    btn.addEventListener('contextmenu', (e) => { e.preventDefault(); longPressed = true; openOnce(); });

    let tapTimer = null;
    btn.addEventListener('click', () => {
        if (longPressed) { longPressed = false; return; }
        if (Face.isGame()) { Face.abort(); return; }           // Antippen beendet Arkanoid
        if (recognition) { stopListening ? stopListening() : recognition.stop(); return; }
        // Doppeltipp = Arkanoid; einfacher Tipp wartet kurz, ob ein zweiter kommt
        if (tapTimer) { clearTimeout(tapTimer); tapTimer = null; Face.arkanoid(); return; }
        tapTimer = setTimeout(() => { tapTimer = null; onMarvinTap(); }, 260);
    });
}

function onMarvinTap() {
    {
        if (!getSetting('geminiKey')) { openSettings(); return; }
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
const SILENCE_MS = 3000;
const FIRST_WORD_MS = 8000;
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
        recognition.lang = 'de-AT';
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
        '- type: "event" (Kalendertermin), wenn eine konkrete Uhrzeit genannt wird ("14 Uhr", "um halb drei") oder es eindeutig ein Termin mit Ort/Person zu fester Zeit ist. Sonst "task".',
        '- time: nur bei type "event": Startzeit HH:MM (24h). Sonst null.',
        '- durationMinutes: nur bei type "event": genannte Dauer in Minuten, sonst 60.',
        '- title: kurz, prägnant, Deutsch. Aufgabe als Tätigkeit ("Mario anrufen"), Termin als Anlass ("Zahnarzt", "Treffen mit Robert"). Keine Datums- oder Uhrzeitangaben im Titel.',
        `- status: "Zu tun" für konkrete Aufgaben, "Gedächtnis" für Ideen/irgendwann/vielleicht, "Pausiert" nur wenn ausdrücklich gesagt.`,
        categories.length
            ? `- category: genau eine aus der erlaubten Liste. Wähle die passendste.`
            : '- category: ein kurzes, sinnvolles Wort.',
        '- Einkaufsartikel (z.B. aus einer Einkaufsliste, "Milch") als Aufgabe "<Artikel> kaufen" formulieren.',
        ...(terms.length ? [
            'Eigene Begriffe des Users (die Spracherkennung verhört sie oft, z.B. als ähnlich klingende Alltagswörter). Wenn ein Wort ähnlich klingt und der Kontext passt, ersetze es durch den richtigen Begriff:',
            ...terms.map(t => `  * ${t}`),
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
    if (categories.length) category.enum = categories;
    return {
        type: 'OBJECT',
        properties: {
            title: { type: 'STRING' },
            status: { type: 'STRING', enum: TARGET_STATUSES },
            category,
            type: { type: 'STRING', enum: ['task', 'event'] },
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
        const response = await fetch(url, {
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

async function handleInput(text) {
    busy = true;
    setButtonState('thinking');
    try {
        const parsed = await parseWithGemini(text);
        const dueDate = /^\d{4}-\d{2}-\d{2}$/.test(parsed.dueDate || '') ? parsed.dueDate : '';
        if (parsed.type === 'event' && dueDate && /^\d{1,2}:\d{2}$/.test(parsed.time || '')) {
            await createEvent(parsed, dueDate, text);
            return;
        }
        const task = {
            Title: parsed.title,
            Status: TARGET_STATUSES.includes(parsed.status) ? parsed.status : 'Zu tun',
            Category: parsed.category,
            DueDate: dueDate,
            Notes: [parsed.notes, `Original: "${text}"`].filter(Boolean).join('\n'),
            Source: 'PWA',
        };

        // Optimistisch anzeigen, dann speichern
        const local = { ...task, ID: 'pending-' + Date.now(), Status_Since: new Date().toISOString() };
        allTasks.unshift(local);
        switchTab(task.Status);
        const comment = parsed.comment || 'Notiert. Als ob es etwas ändern würde.';
        say(comment, { voice: true });

        try {
            const saved = await callBackend('addTask', { task });
            local.ID = saved.id;
            renderTasks();
            setUndo(() => deleteTaskNow(local, pick(LINES.undo)));
        } catch (err) {
            allTasks = allTasks.filter(t => t !== local);
            renderTasks();
            showToast('Speichern fehlgeschlagen: ' + err.message);
        }
    } catch (err) {
        showToast('Marvin versteht nicht. ' + err.message);
    } finally {
        busy = false;
        if (mood === 'think') setButtonState('idle');
    }
}

// ---------- Puffer: Rohe Einträge (z.B. Google Home) einsortieren ----------

let inboxRunning = false;
// Alle Puffer-Einträge in EINEM Gemini-Aufruf einsortieren und in EINEM Backend-Aufruf speichern
async function processInbox() {
    if (inboxRunning || !getSetting('geminiKey')) return;
    const inbox = allTasks.filter(t => t.Status === INBOX_STATUS);
    if (!inbox.length) return;

    inboxRunning = true;
    renderInboxBadge();
    try {
        const single = buildSchema();
        delete single.properties.comment; delete single.properties.type; delete single.properties.time; delete single.properties.durationMinutes;
        single.properties.id = { type: 'STRING' };
        single.required = ['id', 'title', 'status', 'category'];
        const schema = { type: 'OBJECT', properties: { items: { type: 'ARRAY', items: single } }, required: ['items'] };
        const system = buildSystemPrompt() + '\nDu bekommst MEHRERE rohe Einträge (z.B. aus Google Home) als JSON-Liste. Gib für JEDEN Eintrag ein Objekt mit derselben id zurück. Kein comment, kein type – das sind immer Aufgaben.';
        const input = JSON.stringify(inbox.map(t => ({ id: String(t.ID), text: t.Title, details: t.Notes || '', faellig: t.DueDate || null })));
        const result = await parseWithGemini(input, { system, schema });

        const items = [];
        for (const r of result.items || []) {
            const task = inbox.find(t => String(t.ID) === String(r.id));
            if (!task) continue;
            const changes = {
                Title: r.title || task.Title,
                Status: TARGET_STATUSES.includes(r.status) ? r.status : 'Zu tun',
                Category: r.category || task.Category,
            };
            if (/^\d{4}-\d{2}-\d{2}$/.test(r.dueDate || '') && !task.DueDate) changes.DueDate = r.dueDate;
            items.push({ task, changes });
        }
        if (items.length) {
            await callBackend('updateTasks', { items: items.map(i => ({ id: i.task.ID, changes: i.changes })) });
            const now = new Date().toISOString();
            items.forEach(i => Object.assign(i.task, i.changes, { Status_Since: now }));
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
        allDay: false,
        description: [parsed.notes, `Original: "${originalText}"`].filter(Boolean).join('\n'),
    };
    const local = { ...event, id: 'pending-' + Date.now(), recurring: false };
    allEvents.push(local);
    switchTab('Zu tun');
    say(parsed.comment || 'Ein Termin. Wie aufregend. Für jemanden.', { voice: true });
    try {
        const saved = await callBackend('addEvent', { event });
        Object.assign(local, saved);
        renderTasks();
        setUndo(() => deleteEventNow(local, pick(LINES.undo)));
    } catch (err) {
        allEvents = allEvents.filter(e => e !== local);
        renderTasks();
        say('Termin nicht gespeichert: ' + err.message);
    }
}

async function saveEvent(ev, changes) {
    const before = { ...ev };
    Object.assign(ev, changes);
    renderTasks();
    try {
        Object.assign(ev, await callBackend('updateEvent', { id: ev.id, changes }));
        renderTasks();
    } catch (err) {
        Object.assign(ev, before);
        renderTasks();
        say('Termin nicht geändert: ' + err.message);
    }
}

async function deleteEventNow(ev, message) {
    const index = allEvents.indexOf(ev);
    if (index < 0) return;
    allEvents.splice(index, 1);
    renderTasks();
    setUndo(null);
    if (message) say(message, { voice: true });
    Face.react('del');
    try {
        await callBackend('deleteEvent', { id: ev.id });
    } catch (err) {
        allEvents.splice(index, 0, ev);
        renderTasks();
        say('Termin nicht gelöscht: ' + err.message);
    }
}

// Klartext statt Zahl: "heute 14:00", "morgen 14:00", "Di 14:00", ganztägig ohne Uhrzeit
function eventLabel(ev) {
    const start = new Date(ev.start);
    const days = -daysSince(start); // 0 = heute, 1 = morgen
    const day = days <= 0 ? 'heute' : days === 1 ? 'morgen' : start.toLocaleDateString('de-AT', { weekday: 'short' }).replace('.', '');
    if (ev.allDay) return day;
    return day + ' ' + start.toLocaleTimeString('de-AT', { hour: '2-digit', minute: '2-digit' });
}

function eventUrgency(ev) {
    const days = -daysSince(new Date(ev.start));
    if (days <= 0) return { cls: 'card ev hot', num: eventLabel(ev), color: '#FFF3DC', rank: 0 };
    if (days === 1) return { cls: 'card ev warm', num: eventLabel(ev), color: '#FFF3DC', rank: 1 };
    return { cls: 'card ev', num: eventLabel(ev), color: '#FFF3DC', rank: 2 };
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

function setEditorMode(isEvent) {
    document.getElementById('editor').classList.toggle('event-mode', isEvent);
}

function openEventEditor(ev) {
    editing = ev;
    editingEvent = true;
    setEditorMode(true);
    const start = new Date(ev.start), end = new Date(ev.end);
    document.getElementById('edit-title').value = ev.title || '';
    document.getElementById('edit-notes').value = ev.description || '';
    document.getElementById('edit-due').value = toInputDate(start);
    document.getElementById('edit-time').value = ev.allDay ? '' : start.toTimeString().slice(0, 5);
    const minutes = ev.allDay ? 'allday' : String(Math.round((end - start) / 60000));
    const dur = document.getElementById('edit-duration');
    if (![...dur.options].some(o => o.value === minutes)) dur.add(new Option(minutes + ' min', minutes));
    dur.value = minutes;
    document.getElementById('edit-recurring').hidden = !ev.recurring;
    document.getElementById('editor').showModal();
    document.getElementById('edit-title').focus();
}

function eventEditorValues() {
    const title = document.getElementById('edit-title').value.trim() || editing.title;
    const date = document.getElementById('edit-due').value || toInputDate(new Date(editing.start));
    const dur = document.getElementById('edit-duration').value;
    const description = document.getElementById('edit-notes').value;
    if (dur === 'allday') {
        const start = localDateTime(date, '00:00');
        return { title, description, allDay: true, start: start.toISOString(), end: new Date(start.getTime() + 864e5).toISOString() };
    }
    const start = localDateTime(date, document.getElementById('edit-time').value || '09:00');
    return { title, description, allDay: false, start: start.toISOString(), end: new Date(start.getTime() + Number(dur) * 60000).toISOString() };
}

let editingEvent = false;

function openEditor(task) {
    editing = task;
    editingEvent = false;
    setEditorMode(false);
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
    if ('Status' in changes && changes.Status !== task.Status) changes = { ...changes, Status_Since: new Date().toISOString() };
    Object.assign(task, changes);
    renderTasks();
    try {
        const { Status_Since, ...sent } = changes; // setzt das Backend selbst
        await callBackend('updateTask', { id: task.ID, changes: sent });
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
        const item = editing;
        if (editingEvent) {
            if (!confirm(`Termin „${item.title}“ aus dem Kalender löschen?`)) return;
            dialog.close('delete');
            deleteEventNow(item, pick(LINES.deleted));
            return;
        }
        if (!confirm(`„${item.Title}“ endgültig löschen?`)) return;
        dialog.close('delete');
        deleteTaskNow(item, pick(LINES.deleted));
    });

    dialog.addEventListener('close', () => {
        if (dialog.returnValue === 'save' && editing && editingEvent) {
            saveEvent(editing, eventEditorValues());
        } else if (dialog.returnValue === 'save' && editing) {
            const changes = editorValues();
            if (changes.Status !== editing.Status) {
                setStatus(editing, changes.Status, changes);
            } else {
                saveTask(editing, changes);
            }
        }
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
    const before = { Status: task.Status, Status_Since: task.Status_Since };
    saveTask(task, { ...extra, Status: status });
    if (status === DONE_STATUS) {
        say(pick(LINES.done), { voice: true });
        Face.react('done');
    } else if (countMove(task) === 5) {
        Face.flash('hang');
        say(pick(LINES.moveAgain), { voice: true });
    } else {
        say(pick(LINES.move), { voice: true }); // vorerst jedes Mal Text + Stimme (später ggf. reduzieren, ux-v2 §6)
    }
    lastMoveAt.set(task.ID, Date.now());
    setUndo(() => {
        saveTask(task, { Status: before.Status });
        task.Status_Since = before.Status_Since; // alte Verweildauer zurück
        renderTasks();
        say(pick(LINES.undo));
    });
}

async function deleteTaskNow(task, message) {
    const index = allTasks.indexOf(task);
    if (index < 0) return;
    allTasks.splice(index, 1);
    renderTasks();
    if (message) say(message, { voice: true });
    Face.react('del');
    setUndo(null);
    try {
        await callBackend('deleteTask', { id: task.ID });
    } catch (err) {
        allTasks.splice(index, 0, task);
        renderTasks();
        say('Löschen fehlgeschlagen: ' + err.message);
    }
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
    currentStatus = status;
    renderWheel();
    renderTasks();
}

let previousStatus = 'Zu tun';
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
    if (task.Status !== 'Zu tun') return { cls: 'card', num: '', color: '#A39383', rank: 3 };
    const over = daysSince(task.DueDate);               // >0 = überfällig, 0 = heute, -1 = morgen
    const since = daysSince(task.Status_Since || task.Created_At) ?? 0;
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
    const count = allTasks.filter(t => t.Status === INBOX_STATUS).length;
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

    let list = allTasks.filter(t => t.Status === currentStatus).map(t => ({ t, u: urgency(t) }));
    if (currentStatus === 'Zu tun') {
        // Termine der nächsten Tage dazu; innerhalb gleicher Stufe: Termine nach Startzeit vor Aufgaben
        const evs = allEvents.slice().sort((a, b) => new Date(a.start) - new Date(b.start)).map(e => ({ e, u: eventUrgency(e) }));
        list = [...evs, ...list];
    }
    if (currentStatus === DONE_STATUS) {
        list.sort((a, b) => String(b.t.Status_Since || b.t.Updated_At || '').localeCompare(String(a.t.Status_Since || a.t.Updated_At || '')));
        list = list.slice(0, 50);
    } else {
        list.sort((a, b) => a.u.rank - b.u.rank); // stabil: innerhalb gleicher Stufe Sheet-Reihenfolge
    }

    const label = STATUS_LABELS[currentStatus];
    document.getElementById('status-sub').textContent = label.sub;
    document.getElementById('status-count').textContent = String(list.length);

    if (!list.length) {
        const empty = document.createElement('p');
        empty.className = 'empty-state';
        empty.textContent = 'Leer. Marvin ist fast beeindruckt.';
        container.appendChild(empty);
    }
    list.forEach(({ t, e, u }) => container.appendChild(e ? buildEventCard(e, u) : buildCard(t, u)));
    updateMoodFace();

    const doneLink = document.getElementById('done-link');
    const doneCount = allTasks.filter(t => t.Status === DONE_STATUS).length;
    doneLink.textContent = currentStatus === DONE_STATUS ? '← ZURÜCK' : `42 · ${doneCount}`;
}

function buildCard(task, u) {
    const card = document.createElement('div');
    card.className = u.cls;
    card.innerHTML = '<svg class="grain" aria-hidden="true"><rect width="100%" height="100%" filter="url(#noise)"/></svg><div class="sheen"></div>';

    const title = document.createElement('span');
    title.className = 'card-title';
    title.textContent = task.Title || '';
    card.appendChild(title);

    if (u.num) {
        const num = document.createElement('span');
        num.className = 'card-num';
        num.style.color = u.color;
        num.textContent = u.num;
        card.appendChild(num);
    }
    const ring = document.createElement('div');
    ring.className = 'ring';
    card.appendChild(ring);

    if (String(task.ID).startsWith('pending-')) card.classList.add('pending');
    else attachGestures(card, task);
    return card;
}

function buildEventCard(ev, u) {
    const card = document.createElement('div');
    card.className = u.cls;
    card.innerHTML = '<svg class="grain" aria-hidden="true"><rect width="100%" height="100%" filter="url(#noise)"/></svg><div class="sheen"></div>';
    const title = document.createElement('span');
    title.className = 'card-title';
    title.textContent = ev.title || '';
    const num = document.createElement('span');
    num.className = 'card-num event-time';
    num.style.color = u.color;
    num.textContent = u.num;
    card.append(title, num);
    if (String(ev.id).startsWith('pending-')) card.classList.add('pending');
    else card.addEventListener('click', () => openEventEditor(ev));
    return card;
}

// ---------- Gesten: Tippen = Bearbeiten, Wischen = Nachbar-Spalte, lange drücken = 42 ----------

const EDGE = 24;        // Rand frei lassen (Android-Zurück-Geste)
const SWIPE = 70;       // px bis zum Verschieben
const LONG_PRESS = 700; // ms bis Erledigt

function attachGestures(card, task) {
    let x0 = 0, y0 = 0, dx = 0, active = false, fired = false, horizontal = false, timer = null;

    const reset = () => {
        clearTimeout(timer);
        card.classList.remove('pressing', 'dragging');
        card.style.transform = '';
        active = false;
    };

    card.addEventListener('pointerdown', (e) => {
        if (e.clientX < EDGE || e.clientX > window.innerWidth - EDGE) return;
        x0 = e.clientX; y0 = e.clientY; dx = 0;
        active = true; fired = false; horizontal = false;
        card.classList.add('pressing');
        timer = setTimeout(() => {
            fired = true;
            reset();
            if (navigator.vibrate) navigator.vibrate(30);
            if (task.Status !== DONE_STATUS) setStatus(task, DONE_STATUS);
        }, LONG_PRESS);
    });

    card.addEventListener('pointermove', (e) => {
        if (!active) return;
        dx = e.clientX - x0;
        const dy = e.clientY - y0;
        if (Math.abs(dx) > 8 || Math.abs(dy) > 8) {
            clearTimeout(timer);
            card.classList.remove('pressing');
        }
        if (!horizontal && Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx)) { reset(); return; } // Scrollen
        if (Math.abs(dx) > 8) {
            horizontal = true;
            card.classList.add('dragging');
            card.style.transform = `translateX(${dx}px) rotate(${dx / 40}deg)`;
        }
    });

    card.addEventListener('pointerup', () => {
        if (!active) return;
        const moved = dx;
        reset();
        if (fired) return;
        if (Math.abs(moved) < 8) { openEditor(task); return; }
        if (task.Status === DONE_STATUS) return; // in "42" nur tippen/lange drücken
        const i = WHEEL.indexOf(task.Status);
        const target = moved <= -SWIPE ? WHEEL[i - 1] : moved >= SWIPE ? WHEEL[i + 1] : null;
        if (target) setStatus(task, target);
    });

    ['pointercancel', 'pointerleave'].forEach(ev => card.addEventListener(ev, () => { if (active) reset(); }));
    card.addEventListener('contextmenu', (e) => e.preventDefault());
}
