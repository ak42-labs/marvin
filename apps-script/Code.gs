const SHEET_TASKS = 'Tasks';
const SHEET_CONFIG = 'Config';
const BACKEND_VERSION = '0.5'; // bei jeder Änderung erhöhen; sichtbar über die Web-App-URL im Browser

function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
    checkToken_(payload.token);
    const action = payload.action;
    let data = null;

    if (action === 'getTasks') {
      importGoogleTasks_(); // Google Home / Google Tasks -> Puffer (still, falls nicht eingerichtet)
      data = getTasks();
    } else if (action === 'updateTask') {
      data = updateTask(payload.id, payload.changes);
    } else if (action === 'deleteTask') {
      data = deleteTask(payload.id);
    } else if (action === 'addTask') {
      data = addTask(payload.task);
    } else if (action === 'addEvent') {
      data = addEvent(payload.event);
    } else if (action === 'getConfig') {
      data = getConfig();
    } else {
      throw new Error("Unbekannte Aktion: " + action);
    }

    return ContentService.createTextOutput(JSON.stringify({ status: 'success', data: data }))
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
  const id = Utilities.getUuid();
  const now = new Date().toISOString();
  
  const rowData = [
    id,
    task.Title || "Ohne Titel",
    task.Status || "Puffer",
    task.Category || "Verschiedenes",
    task.DueDate || "",
    task.Notes || "",
    task.Source || "PWA",
    now,
    now
  ];
  
  sheet.appendRow(rowData);
  return { id: id, title: task.Title };
}

function addEvent(eventData) {
  const calendar = CalendarApp.getDefaultCalendar();
  const start = new Date(eventData.startTime);
  const end = new Date(eventData.endTime);
  
  let options = {};
  if (eventData.guestEmail) {
    options.guests = eventData.guestEmail;
    options.sendInvites = true;
  }
  
  const event = calendar.createEvent(eventData.title, start, end, options);
  event.addPopupReminder(1440); // 24 Stunden vorher
  
  return { eventId: event.getId(), title: event.getTitle() };
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
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const row = findRow_(sheet, id);

  EDITABLE_FIELDS.forEach(field => {
    if (changes && field in changes) {
      const col = headers.indexOf(field);
      if (col >= 0) sheet.getRange(row, col + 1).setValue(changes[field] == null ? '' : changes[field]);
    }
  });
  const updCol = headers.indexOf('Updated_At');
  if (updCol >= 0) sheet.getRange(row, updCol + 1).setValue(new Date().toISOString());
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
  if (typeof Tasks === 'undefined') return; // Dienst nicht aktiviert
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) return;
  try {
    const props = PropertiesService.getScriptProperties();
    let seen = JSON.parse(props.getProperty('IMPORTED_TASK_IDS') || '[]');
    const allowed = getConfigValues_('Importliste');
    const lists = Tasks.Tasklists.list().items || [];
    lists.forEach(list => {
      if (allowed.length && allowed.indexOf(list.title) < 0) return;
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
          Tasks.Tasks.patch({ status: 'completed' }, list.id, t.id);
        });
        pageToken = res.nextPageToken;
      } while (pageToken);
    });
    props.setProperty('IMPORTED_TASK_IDS', JSON.stringify(seen.slice(-300))); // Größe begrenzen
  } catch (err) {
    console.error('Google-Tasks-Import fehlgeschlagen: ' + err);
  } finally {
    lock.releaseLock();
  }
}

function getConfigValues_(type) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_CONFIG);
  if (!sheet) return [];
  return sheet.getDataRange().getValues().slice(1)
    .filter(row => row[0] === type && row[1])
    .map(row => String(row[1]));
}
