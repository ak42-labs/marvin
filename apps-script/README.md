# Apps Script (Backend)

Der Live-Code liegt im Apps-Script-Projekt zum Sheet `Marvin_Database`.
**Single Source of Truth soll dieses Verzeichnis werden:** `Code.gs` hier ablegen und bei jeder Änderung im Editor hierher spiegeln (später ggf. per `clasp`).

## Offene Punkte (v0.1.1)

1. Aktuellen `Code.gs` aus dem Editor hier einchecken.
2. Token-Prüfung einbauen – die Web-App-URL steht im öffentlichen Repo, ohne Token kann jeder lesen (und sobald `addTask` existiert: schreiben).

```js
// Einmalig im Editor: Projekteinstellungen > Skripteigenschaften > MARVIN_TOKEN = <langer Zufallswert>
function doPost(e) {
  const req = JSON.parse(e.postData.contents);
  const expected = PropertiesService.getScriptProperties().getProperty('MARVIN_TOKEN');
  if (!expected || req.token !== expected) {
    return json_({ status: 'error', message: 'unauthorized' });
  }
  // ... bestehendes Routing (getTasks, ...)
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
```

Das Frontend sendet den Token bereits in jedem Request (`token`-Feld, Wert aus den Einstellungen).
Nach dem Einbau: **neue Version deployen** (Bereitstellungen verwalten > Bearbeiten > Neue Version), sonst bleibt die alte aktiv.
