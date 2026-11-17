const SHEET_TASKS = 'Tasks';
const SHEET_CONFIG = 'Config';

function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
    checkToken_(payload.token);
    const action = payload.action;
    let data = null;

    if (action === 'getTasks') {
      data = getTasks();
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
  return ContentService.createTextOutput("Marvin Backend Beta aktiv. Nutze POST für Operationen.");
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
  if (!sheet) return { statuses: [], categories: [] };
  
  const data = sheet.getDataRange().getValues();
  data.shift(); 
  
  let config = { statuses: [], categories: [] };
  data.forEach(row => {
    if (row[0] === 'Status' && row[1]) config.statuses.push(row[1]);
    if (row[0] === 'Category' && row[1]) config.categories.push(row[1]);
  });
  
  return config;
}