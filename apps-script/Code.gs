// Marvin Backend – Schema v1 (englisch, snake_case; jedes Blatt = eine Tabelle). Siehe apps-script/README.md.
const BACKEND_VERSION = '1.0.1'; // bei jeder Änderung erhöhen; sichtbar über die Web-App-URL im Browser

// Tabellen und ihre Spalten (Reihenfolge = Spaltenreihenfolge im Blatt)
const SCHEMA = {
  tasks:       ['id', 'title', 'status', 'category_id', 'due_date', 'notes', 'aisle_id', 'source', 'created_at', 'updated_at', 'status_since'],
  categories:  ['id', 'name', 'sort'],
  shop_aisles: ['id', 'name', 'sort', 'store'],
  shop_items:  ['name', 'aisle_id'],
  terms:       ['term', 'hint'],
  settings:    ['key', 'value'],
};
// Feste Status-Schlüssel (Anzeige-Namen leben in der App)
const STATUSES = ['inbox', 'backlog', 'todo', 'on_hold', 'shopping', 'done'];
const TASK_EDITABLE = ['title', 'status', 'category_id', 'due_date', 'notes', 'aisle_id'];
const EVENT_CATEGORY_TAG = 'marvin_category_id';

function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
    checkToken_(payload.token);
    const action = payload.action;
    let data = null;
    const info = { backend: BACKEND_VERSION };

    switch (action) {
      case 'getAll':      data = getAll_(info); break;                       // EIN Aufruf für alles (schnell)
      case 'getEvents':   data = getEvents_(payload.days); break;
      case 'addTask':     data = addTask_(payload.task); break;
      case 'addTasks':    data = (payload.tasks || []).map(addTask_); break;
      case 'updateTask':  data = updateTask_(payload.id, payload.changes); break;
      case 'updateTasks': data = (payload.items || []).map(it => updateTask_(it.id, it.changes)); break;
      case 'deleteTask':  data = deleteRowById_('tasks', payload.id); break;
      case 'addEvent':    data = addEvent_(payload.event); break;
      case 'updateEvent': data = updateEvent_(payload.id, payload.changes); break;
      case 'deleteEvent': data = deleteEvent_(payload.id); break;
      case 'setShopItem': data = setShopItem_(payload.name, payload.aisle_id); break;
      default: throw new Error('Unbekannte Aktion: ' + action);
    }
    return json_({ status: 'success', data: data, info: info });
  } catch (error) {
    return json_({ status: 'error', message: error.toString() });
  }
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

// Token liegt in: Projekteinstellungen > Skripteigenschaften > MARVIN_TOKEN
function checkToken_(token) {
  const expected = PropertiesService.getScriptProperties().getProperty('MARVIN_TOKEN');
  if (!expected || token !== expected) throw new Error('unauthorized');
}

function doGet() {
  return ContentService.createTextOutput('Marvin Backend ' + BACKEND_VERSION + ' aktiv. Nutze POST für Operationen.');
}

// ================= Tabellen-Helfer =================

function ss_() { return SpreadsheetApp.getActiveSpreadsheet(); }

// Blatt holen; fehlt es, wird es mit Kopfzeile angelegt. Fehlende Spalten werden ergänzt.
function table_(name) {
  let sheet = ss_().getSheetByName(name);
  if (!sheet) {
    sheet = ss_().insertSheet(name);
    sheet.getRange(1, 1, 1, SCHEMA[name].length).setValues([SCHEMA[name]]).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  const headers = headers_(sheet);
  SCHEMA[name].forEach(col => {
    if (headers.indexOf(col) < 0) { sheet.getRange(1, headers.length + 1).setValue(col); headers.push(col); }
  });
  return sheet;
}

function headers_(sheet) {
  const lastCol = Math.max(sheet.getLastColumn(), 1);
  return sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(String).filter(h => h !== '');
}

// Alle Zeilen als Objekte (Datumszellen -> YYYY-MM-DD bzw. ISO)
function readTable_(name) {
  const sheet = table_(name);
  const values = sheet.getDataRange().getValues();
  const headers = values.shift().map(String);
  const tz = ss_().getSpreadsheetTimeZone();
  return values
    .filter(r => r.some(v => v !== '' && v !== null))
    .map(r => {
      const o = {};
      headers.forEach((h, i) => {
        if (!h) return;
        let v = r[i];
        if (v instanceof Date) v = h === 'due_date' ? Utilities.formatDate(v, tz, 'yyyy-MM-dd') : v.toISOString();
        o[h] = v;
      });
      return o;
    });
}

function appendRow_(name, obj) {
  const sheet = table_(name);
  const headers = headers_(sheet);
  sheet.appendRow(headers.map(h => (h in obj && obj[h] != null) ? obj[h] : ''));
}

function findRow_(sheet, keyCol, value) {
  const headers = headers_(sheet);
  const col = headers.indexOf(keyCol) + 1;
  const last = sheet.getLastRow();
  if (last < 2) return -1;
  const vals = sheet.getRange(2, col, last - 1, 1).getValues();
  for (let i = 0; i < vals.length; i++) {
    if (String(vals[i][0]).trim().toLowerCase() === String(value).trim().toLowerCase()) return i + 2;
  }
  return -1;
}

function deleteRowById_(name, id) {
  const sheet = table_(name);
  const row = findRow_(sheet, 'id', id);
  if (row < 0) throw new Error('Nicht gefunden: ' + id);
  sheet.deleteRow(row);
  return { id: id };
}

function settings_() {
  const s = {};
  readTable_('settings').forEach(r => { if (r.key) s[String(r.key)] = r.value; });
  return s;
}

// ================= Lesen: alles auf einmal =================

function getAll_(info) {
  info.import = importGoogleTasks_();   // Google Home / Google Tasks -> inbox
  info.fixed = fillMissing_();          // von Hand / anderen KIs eingetragene Zeilen vervollständigen
  const settings = settings_();
  const out = {
    tasks: readTable_('tasks'),
    categories: readTable_('categories').sort(bySort_),
    shop_aisles: readTable_('shop_aisles').sort(bySort_),
    shop_items: readTable_('shop_items'),
    terms: readTable_('terms'),
    settings: settings,
    events: [],
  };
  try {
    out.events = getEvents_(Number(settings.event_days) || 60);
  } catch (err) {
    out.events_error = String(err);
  }
  return out;
}

function bySort_(a, b) { return (Number(a.sort) || 999) - (Number(b.sort) || 999); }

// Zeilen ohne id (z.B. direkt ins Sheet geschrieben) bekommen id + Zeitstempel; ohne status -> inbox
function fillMissing_() {
  const sheet = table_('tasks');
  const last = sheet.getLastRow();
  if (last < 2) return 0;
  const headers = headers_(sheet);
  const range = sheet.getRange(2, 1, last - 1, headers.length);
  const rows = range.getValues();
  const c = name => headers.indexOf(name);
  const now = new Date().toISOString();
  let fixed = 0;
  rows.forEach(r => {
    if (!String(r[c('title')] || '').trim() || String(r[c('id')] || '').trim()) return;
    r[c('id')] = Utilities.getUuid();
    if (STATUSES.indexOf(String(r[c('status')]).trim()) < 0) r[c('status')] = 'inbox';
    if (!r[c('source')]) r[c('source')] = 'sheet';
    if (!r[c('created_at')]) r[c('created_at')] = now;
    if (!r[c('updated_at')]) r[c('updated_at')] = now;
    if (!r[c('status_since')]) r[c('status_since')] = now;
    fixed++;
  });
  if (fixed) range.setValues(rows);
  return fixed;
}

// ================= Tasks =================

function addTask_(task) {
  const now = new Date().toISOString();
  const status = STATUSES.indexOf(task.status) >= 0 ? task.status : 'inbox';
  const row = {
    id: Utilities.getUuid(),
    title: task.title || 'Ohne Titel',
    status: status,
    category_id: task.category_id || '',
    due_date: task.due_date || '',
    notes: task.notes || '',
    aisle_id: task.aisle_id || '',
    source: task.source || 'app',
    created_at: now,
    updated_at: now,
    status_since: now,
  };
  appendRow_('tasks', row);
  return { id: row.id, status_since: now };
}

function updateTask_(id, changes) {
  const sheet = table_('tasks');
  const headers = headers_(sheet);
  const row = findRow_(sheet, 'id', id);
  if (row < 0) throw new Error('Aufgabe nicht gefunden: ' + id);
  const now = new Date().toISOString();
  changes = changes || {};
  if ('status' in changes) {
    if (STATUSES.indexOf(changes.status) < 0) throw new Error('Unbekannter Status: ' + changes.status);
    const old = sheet.getRange(row, headers.indexOf('status') + 1).getValue();
    if (old !== changes.status) sheet.getRange(row, headers.indexOf('status_since') + 1).setValue(now); // nur bei echtem Wechsel
  }
  TASK_EDITABLE.forEach(f => {
    if (f in changes) sheet.getRange(row, headers.indexOf(f) + 1).setValue(changes[f] == null ? '' : changes[f]);
  });
  sheet.getRange(row, headers.indexOf('updated_at') + 1).setValue(now);
  return { id: id };
}

// ================= Proviant: Abteilung je Artikel merken =================

function setShopItem_(name, aisleId) {
  name = String(name || '').trim();
  if (!name) throw new Error('Artikel ohne Namen');
  const sheet = table_('shop_items');
  const row = findRow_(sheet, 'name', name);
  if (row > 0) sheet.getRange(row, headers_(sheet).indexOf('aisle_id') + 1).setValue(aisleId || '');
  else appendRow_('shop_items', { name: name, aisle_id: aisleId || '' });
  return { name: name, aisle_id: aisleId };
}

// ================= Google Kalender (nur Hauptkalender) =================
// Termine leben ausschließlich im Kalender. Kategorie unsichtbar per Tag. Erinnerungen = Kalender-Standard.

function eventToJson_(ev) {
  let category = '';
  try { category = ev.getTag(EVENT_CATEGORY_TAG) || ''; } catch (err) { /* ohne Tag ok */ }
  return {
    id: ev.getId(),
    title: ev.getTitle(),
    start: ev.getStartTime().toISOString(),
    end: ev.getEndTime().toISOString(),
    all_day: ev.isAllDayEvent(),
    description: ev.getDescription() || '',
    location: ev.getLocation() || '',
    recurring: ev.isRecurringEvent(),
    category_id: category,
  };
}

function isBirthday_(ev) {
  try { return ev.getEventType() === CalendarApp.EventType.BIRTHDAY; } catch (err) { return false; }
}

// Termine von heute 00:00 bis heute + days; bereits vorbei / Geburtstage = weggelassen
function getEvents_(days) {
  const cal = CalendarApp.getDefaultCalendar();
  const from = new Date(); from.setHours(0, 0, 0, 0);
  const to = new Date(from.getTime() + ((days || 60) + 1) * 864e5);
  const now = new Date();
  return cal.getEvents(from, to).filter(ev => ev.getEndTime() > now && !isBirthday_(ev)).map(eventToJson_);
}

// event: { title, start, end, all_day, description, category_id }
function addEvent_(event) {
  const cal = CalendarApp.getDefaultCalendar();
  const opts = event.description ? { description: event.description } : {};
  const ev = event.all_day
    ? cal.createAllDayEvent(event.title, new Date(event.start), opts)
    : cal.createEvent(event.title, new Date(event.start), new Date(event.end), opts);
  if (event.category_id) ev.setTag(EVENT_CATEGORY_TAG, event.category_id);
  return eventToJson_(ev);
}

function updateEvent_(id, changes) {
  const ev = CalendarApp.getDefaultCalendar().getEventById(id);
  if (!ev) throw new Error('Termin nicht gefunden');
  if (ev.isRecurringEvent()) throw new Error('Serientermine bitte im Google Kalender ändern');
  if ('title' in changes) ev.setTitle(changes.title);
  if ('description' in changes) ev.setDescription(changes.description || '');
  if ('category_id' in changes) ev.setTag(EVENT_CATEGORY_TAG, changes.category_id || '');
  if (changes.all_day) ev.setAllDayDate(new Date(changes.start));
  else if (changes.start && changes.end) ev.setTime(new Date(changes.start), new Date(changes.end));
  return eventToJson_(ev);
}

function deleteEvent_(id) {
  const ev = CalendarApp.getDefaultCalendar().getEventById(id);
  if (!ev) throw new Error('Termin nicht gefunden');
  if (ev.isRecurringEvent()) throw new Error('Serientermine bitte im Google Kalender löschen');
  ev.deleteEvent();
  return { id: id };
}

// ================= Google Tasks (Google Home) -> inbox =================
// Voraussetzung: Dienst "Google Tasks API" (Kennung Tasks). settings.import_lists = Listennamen, kommagetrennt (leer = alle).
// Importierte Einträge werden in Google Tasks abgehakt; IDs in Script Property IMPORTED_TASK_IDS gegen Doppelimporte.

function importGoogleTasks_() {
  const report = { imported: [], skipped_lists: [], lists: [] };
  if (typeof Tasks === 'undefined') { report.error = 'Dienst „Google Tasks API“ fehlt im Apps-Script-Editor.'; return report; }
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) { report.error = 'Import läuft gerade parallel.'; return report; }
  try {
    const props = PropertiesService.getScriptProperties();
    const seen = JSON.parse(props.getProperty('IMPORTED_TASK_IDS') || '[]');
    const allowed = String(settings_().import_lists || '').split(',').map(s => s.trim()).filter(Boolean);
    report.filter = allowed;
    (Tasks.Tasklists.list().items || []).forEach(list => {
      report.lists.push(list.title);
      if (allowed.length && allowed.indexOf(list.title) < 0) { report.skipped_lists.push(list.title); return; }
      let pageToken;
      do {
        const res = Tasks.Tasks.list(list.id, { showCompleted: false, showHidden: false, maxResults: 100, pageToken: pageToken });
        (res.items || []).forEach(t => {
          const title = (t.title || '').trim();
          if (!title || seen.indexOf(t.id) >= 0) return;
          addTask_({
            title: title, status: 'inbox', source: 'google_tasks',
            due_date: t.due ? t.due.substring(0, 10) : '',
            notes: 'Liste: ' + list.title + (t.notes ? '\n' + t.notes : ''),
          });
          seen.push(t.id);
          report.imported.push(title);
          Tasks.Tasks.patch({ status: 'completed' }, list.id, t.id);
        });
        pageToken = res.nextPageToken;
      } while (pageToken);
    });
    props.setProperty('IMPORTED_TASK_IDS', JSON.stringify(seen.slice(-300)));
  } catch (err) {
    report.error = String(err);
  } finally {
    lock.releaseLock();
  }
  return report;
}

// ================= Im Editor ausführen =================

// Liest nur: Google-Tasks-Listen (erteilt beim ersten Mal die Berechtigung)
function testGoogleTasks() {
  (Tasks.Tasklists.list().items || []).forEach(list => {
    const open = Tasks.Tasks.list(list.id, { showCompleted: false, maxResults: 100 }).items || [];
    console.log('Liste "' + list.title + '": ' + open.length + ' offen -> ' + open.map(t => t.title).join(' | '));
  });
}

// Liest nur: Termine der nächsten 7 Tage (erteilt beim ersten Mal die Berechtigung)
function testCalendar() {
  getEvents_(7).forEach(e => console.log(e.start + '  ' + e.title + (e.all_day ? ' (ganztägig)' : '') + (e.recurring ? ' [Serie]' : '')));
}
