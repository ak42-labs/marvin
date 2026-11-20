const SHEET_TASKS = 'Tasks';
const SHEET_CONFIG = 'Config';
const BACKEND_VERSION = '0.10'; // bei jeder Änderung erhöhen; sichtbar über die Web-App-URL im Browser

function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
    checkToken_(payload.token);
    const action = payload.action;
    let data = null;
    let info = { backend: BACKEND_VERSION };

    if (action === 'getTasks') {
      info.import = importGoogleTasks_(); // Google Home / Google Tasks -> Puffer; Bericht für Debug-Modus
      data = getTasks();
    } else if (action === 'updateTask') {
      data = updateTask(payload.id, payload.changes);
    } else if (action === 'deleteTask') {
      data = deleteTask(payload.id);
    } else if (action === 'addTask') {
      data = addTask(payload.task);
    } else if (action === 'updateTasks') {
      data = (payload.items || []).map(it => updateTask(it.id, it.changes)); // mehrere auf einmal (Puffer)
    } else if (action === 'getEvents') {
      data = getEvents(payload.days);
    } else if (action === 'addEvent') {
      data = addEvent(payload.event);
    } else if (action === 'updateEvent') {
      data = updateEvent(payload.id, payload.changes);
    } else if (action === 'deleteEvent') {
      data = deleteEvent(payload.id);
    } else if (action === 'getConfig') {
      data = getConfig();
    } else {
      throw new Error("Unbekannte Aktion: " + action);
    }

    return ContentService.createTextOutput(JSON.stringify({ status: 'success', data: data, info: info }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Token liegt in: Projekteinstellungen > Skripteigenschaften > MARVIN_TOKEN
function checkToken_(token) {
  const expected = PropertiesService.getScriptProperties().getProperty('MARVIN_TOKEN');
  if (!expected || token !== expected) {
    throw new Error('unauthorized');
  }
}

function doGet(e) {
  return ContentService.createTextOutput("Marvin Backend " + BACKEND_VERSION + " aktiv. Nutze POST für Operationen.");
}

function getTasks() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_TASKS);
  const data = sheet.getDataRange().getValues();
  const headers = data.shift();
  
  return data.map(row => {
    let obj = {};
    headers.forEach((header, i) => obj[header] = row[i]);
    return obj;
  });
}

function addTask(task) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_TASKS);
  const headers = ensureColumn_(sheet, 'Status_Since');
  const id = Utilities.getUuid();
  const now = new Date().toISOString();
  const values = {
    ID: id,
    Title: task.Title || 'Ohne Titel',
    Status: task.Status || 'Puffer',
    Category: task.Category || '',
    DueDate: task.DueDate || '',
    Notes: task.Notes || '',
    Source: task.Source || 'PWA',
    Created_At: now,
    Updated_At: now,
    Status_Since: now,
  };
  sheet.appendRow(headers.map(h => h in values ? values[h] : ''));
  return { id: id, title: task.Title, statusSince: now };
}

// Spalte anlegen, falls sie fehlt (z.B. Status_Since); liefert die Kopfzeile
function ensureColumn_(sheet, name) {
  let headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  if (headers.indexOf(name) < 0) {
    sheet.getRange(1, headers.length + 1).setValue(name);
    headers = headers.concat([name]);
  }
  return headers;
}

// ---------- Google Kalender (nur Hauptkalender) ----------
// Termine leben ausschließlich im Kalender; Marvin liest/schreibt live. Erinnerungen = Kalender-Standard.

function eventToJson_(ev) {
  return {
    id: ev.getId(),
    title: ev.getTitle(),
    start: ev.getStartTime().toISOString(),
    end: ev.getEndTime().toISOString(),
    allDay: ev.isAllDayEvent(),
    description: ev.getDescription() || '',
    location: ev.getLocation() || '',
    recurring: ev.isRecurringEvent(),
  };
}

// Termine von heute 00:00 bis heute + days (Standard 7); bereits vorbei = weggelassen
function getEvents(days) {
  const cal = CalendarApp.getDefaultCalendar();
  const from = new Date(); from.setHours(0, 0, 0, 0);
  const to = new Date(from.getTime() + ((days || 7) + 1) * 864e5);
  const now = new Date();
  return cal.getEvents(from, to)
    .filter(ev => ev.getEndTime() > now && !isBirthday_(ev))
    .map(eventToJson_);
}

// Geburtstage liegen bei Google im Hauptkalender als eigener Termin-Typ -> ausblenden
function isBirthday_(ev) {
  try {
    return ev.getEventType() === CalendarApp.EventType.BIRTHDAY;
  } catch (err) {
    return false; // ältere Laufzeit ohne getEventType
  }
}

// event: { title, start, end, allDay, description }  (start/end als ISO; bei allDay nur das Datum zählt)
function addEvent(event) {
  const cal = CalendarApp.getDefaultCalendar();
  const opts = event.description ? { description: event.description } : {};
  const ev = event.allDay
    ? cal.createAllDayEvent(event.title, new Date(event.start), opts)
    : cal.createEvent(event.title, new Date(event.start), new Date(event.end), opts);
  return eventToJson_(ev);
}

function updateEvent(id, changes) {
  const ev = CalendarApp.getDefaultCalendar().getEventById(id);
  if (!ev) throw new Error('Termin nicht gefunden');
  if (ev.isRecurringEvent()) throw new Error('Serientermine bitte im Google Kalender ändern');
  if ('title' in changes) ev.setTitle(changes.title);
  if ('description' in changes) ev.setDescription(changes.description || '');
  if (changes.allDay) ev.setAllDayDate(new Date(changes.start));
  else if (changes.start && changes.end) ev.setTime(new Date(changes.start), new Date(changes.end));
  return eventToJson_(ev);
}

function deleteEvent(id) {
  const ev = CalendarApp.getDefaultCalendar().getEventById(id);
  if (!ev) throw new Error('Termin nicht gefunden');
  if (ev.isRecurringEvent()) throw new Error('Serientermine bitte im Google Kalender löschen');
  ev.deleteEvent();
  return { id: id };
}

// Im Editor ausführen: erteilt die Kalender-Berechtigung und zeigt die Termine der nächsten 7 Tage (ändert nichts)
function testCalendar() {
  getEvents(7).forEach(e => console.log(e.start + '  ' + e.title + (e.allDay ? ' (ganztägig)' : '') + (e.recurring ? ' [Serie]' : '')));
}

function getConfig() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_CONFIG);
  if (!sheet) return { statuses: [], categories: [], terms: [] };
  
  const data = sheet.getDataRange().getValues();
  data.shift(); 
  
  let config = { statuses: [], categories: [], terms: [] };
  data.forEach(row => {
    if (row[0] === 'Status' && row[1]) config.statuses.push(row[1]);
    if (row[0] === 'Category' && row[1]) config.categories.push(row[1]);
    if (row[0] === 'Begriff' && row[1]) config.terms.push(row[1]); // eigenes Vokabular, z.B. "Vaget – Verein"
    if (row[0] === 'Frist' && row[1] !== '') config.frist = Number(row[1]); // Tage im Hyperraum, bevor es glüht
  });
  
  return config;
}
// ---------- Bearbeiten / Löschen ----------

const EDITABLE_FIELDS = ['Title', 'Status', 'Category', 'DueDate', 'Notes'];

function findRow_(sheet, id) {
  const ids = sheet.getRange(2, 1, Math.max(sheet.getLastRow() - 1, 1), 1).getValues();
  for (let i = 0; i < ids.length; i++) {
    if (String(ids[i][0]) === String(id)) return i + 2; // +1 Header, +1 1-basiert
  }
  throw new Error('Task nicht gefunden: ' + id);
}

function updateTask(id, changes) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_TASKS);
  const headers = ensureColumn_(sheet, 'Status_Since');
  const row = findRow_(sheet, id);
  const now = new Date().toISOString();

  // Status_Since nur bei echtem Statuswechsel setzen (Updated_At ändert sich bei jeder Bearbeitung)
  if (changes && 'Status' in changes) {
    const statusCol = headers.indexOf('Status');
    const oldStatus = sheet.getRange(row, statusCol + 1).getValue();
    if (oldStatus !== changes.Status) sheet.getRange(row, headers.indexOf('Status_Since') + 1).setValue(now);
  }

  EDITABLE_FIELDS.forEach(field => {
    if (changes && field in changes) {
      const col = headers.indexOf(field);
      if (col >= 0) sheet.getRange(row, col + 1).setValue(changes[field] == null ? '' : changes[field]);
    }
  });
  const updCol = headers.indexOf('Updated_At');
  if (updCol >= 0) sheet.getRange(row, updCol + 1).setValue(now);
  return { id: id };
}

function deleteTask(id) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_TASKS);
  sheet.deleteRow(findRow_(sheet, id));
  return { id: id };
}

// ---------- Google Tasks (Google Home) -> Puffer ----------
// Voraussetzung: Im Editor unter "Dienste" die "Google Tasks API" hinzufügen.
// Optional: In Config Zeilen mit Typ "Importliste" -> nur diese Listen werden importiert.
// Importierte Einträge werden in Google Tasks als erledigt markiert – Marvin ist ab dann zuständig.
// Zusätzlich merkt sich das Script die IDs, damit nichts doppelt importiert wird.

function importGoogleTasks_() {
  const report = { imported: [], skippedLists: [], lists: [] };
  if (typeof Tasks === 'undefined') {
    report.error = 'Dienst „Google Tasks API“ ist im Apps-Script-Editor nicht hinzugefügt.';
    return report;
  }
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) { report.error = 'Import läuft gerade parallel.'; return report; }
  try {
    const props = PropertiesService.getScriptProperties();
    let seen = JSON.parse(props.getProperty('IMPORTED_TASK_IDS') || '[]');
    const allowed = getConfigValues_('Importliste');
    const lists = Tasks.Tasklists.list().items || [];
    report.filter = allowed;
    lists.forEach(list => {
      report.lists.push(list.title);
      if (allowed.length && allowed.indexOf(list.title) < 0) { report.skippedLists.push(list.title); return; }
      let pageToken;
      do {
        const res = Tasks.Tasks.list(list.id, { showCompleted: false, showHidden: false, maxResults: 100, pageToken: pageToken });
        (res.items || []).forEach(t => {
          const title = (t.title || '').trim();
          if (!title || seen.indexOf(t.id) >= 0) return;
          addTask({
            Title: title,
            Status: 'Puffer',
            Category: '',
            DueDate: t.due ? t.due.substring(0, 10) : '',
            Notes: 'Liste: ' + list.title + (t.notes ? '\n' + t.notes : ''),
            Source: 'Google Home',
          });
          seen.push(t.id);
          report.imported.push(title);
          Tasks.Tasks.patch({ status: 'completed' }, list.id, t.id);
        });
        pageToken = res.nextPageToken;
      } while (pageToken);
    });
    props.setProperty('IMPORTED_TASK_IDS', JSON.stringify(seen.slice(-300))); // Größe begrenzen
  } catch (err) {
    console.error('Google-Tasks-Import fehlgeschlagen: ' + err);
    report.error = String(err);
  } finally {
    lock.releaseLock();
  }
  return report;
}

function getConfigValues_(type) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_CONFIG);
  if (!sheet) return [];
  return sheet.getDataRange().getValues().slice(1)
    .filter(row => row[0] === type && row[1])
    .map(row => String(row[1]));
}

// ---------- Test & Berechtigung (im Editor ausführen) ----------
// Im Editor oben im Dropdown "testGoogleTasks" wählen -> "Ausführen".
// Beim ersten Mal fragt Google nach der Berechtigung für Google Tasks -> erlauben.
// Ändert nichts, liest nur und schreibt das Ergebnis ins Ausführungsprotokoll.
function testGoogleTasks() {
  const lists = Tasks.Tasklists.list().items || [];
  const allowed = getConfigValues_('Importliste');
  console.log('Backend ' + BACKEND_VERSION + ' | Importliste-Filter: ' + (allowed.length ? allowed.join(', ') : '(keiner, alle Listen)'));
  lists.forEach(list => {
    const open = (Tasks.Tasks.list(list.id, { showCompleted: false, maxResults: 100 }).items || []);
    console.log('Liste "' + list.title + '": ' + open.length + ' offen -> ' + open.map(t => t.title).join(' | '));
  });
}
