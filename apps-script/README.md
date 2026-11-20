# Apps Script (Backend)

`Code.gs` ist eine 1:1-Kopie des Scripts am Sheet `Marvin_Database`.
**Das Repo ist die Quelle der Wahrheit:** Änderungen hier machen, dann in den Apps-Script-Editor kopieren und neu deployen.

## Aktionen (`doPost`, JSON-Body mit `action` + `token`)

| action      | Payload  | Rückgabe |
|-------------|----------|----------|
| `getTasks`  | –        | Importiert zuerst Google Tasks in den Puffer, dann Array aller Zeilen aus `Tasks` |
| `addTask`   | `task`   | `{id, title}` – ID und Timestamps setzt der Server |
| `updateTask`| `id`, `changes` | Ändert Title/Status/Category/DueDate/Notes, setzt Updated_At |
| `deleteTask`| `id`     | Löscht die Zeile |
| `updateTasks`| `items: [{id, changes}]` | Mehrere Tasks auf einmal (Puffer-Einsortierung) |
| `getEvents` | `days` (Std. 7) | Termine im Hauptkalender ab heute bis heute + days (vorbei = weggelassen) |
| `addEvent`  | `event: {title, start, end, allDay, description}` | Legt Termin an (Erinnerung = Kalender-Standard) |
| `updateEvent` | `id`, `changes` | Ändert Titel/Zeit/Beschreibung (nicht bei Serienterminen) |
| `deleteEvent` | `id`   | Löscht Termin (nicht bei Serienterminen) |
| `getConfig` | –        | `{statuses, categories, terms}` aus `Config` |

Spalten `Tasks`: ID, Title, Status, Category, DueDate, Notes, Source, Created_At, Updated_At, Status_Since (automatisch angelegt; nur bei Statuswechsel gesetzt). Spalten werden über die Kopfzeile adressiert.
`Config`: Spalte A = Typ, Spalte B = Wert. Typen: `Status`, `Category`, `Begriff` (eigenes Vokabular für die KI, z.B. `Vaget – Verein`), `Frist` (Tage im Hyperraum bis zur Glut, Standard 7), `Importliste` (optional: nur diese Google-Tasks-Listen importieren; ohne Eintrag = alle).

## Google Tasks / Google Home

Voraussetzung: Editor > *Dienste* (+) > **Google Tasks API** hinzufügen (Kennung `Tasks`). Danach einmal im Editor `testGoogleTasks` ausführen und die Berechtigung erteilen (Web-Apps fragen nicht selbst nach). Die Funktion liest nur und zeigt Listen + offene Einträge im Ausführungsprotokoll.
Antwort von `getTasks` enthält `info.import` (importierte Titel, Listen, Filter, Fehler) – sichtbar im Debug-Modus der App.
Bei jedem Laden der App werden offene Einträge aller (bzw. der erlaubten) Listen als `Puffer` ins Sheet übernommen. Danach werden sie in Google Tasks als erledigt markiert (Marvin ist zuständig); IDs in Script Property `IMPORTED_TASK_IDS` verhindern Doppelimporte.

**Google Keep** (Einkaufsliste von Google Home) ist nicht angebunden: Die Keep-API steht privaten Google-Konten nicht zur Verfügung. Sprachbefehl für Marvin daher: „Hey Google, erinnere mich …“ (landet in Google Tasks). Die App lässt sie danach von Gemini einsortieren.

## Deploy-Ablauf

0. `BACKEND_VERSION` in `Code.gs` erhöhen (Claude macht das bei Änderungen).

1. Code aus `Code.gs` in den Editor kopieren, speichern.
2. *Bereitstellen > Bereitstellungen verwalten > Bearbeiten (Stift) > Version: Neue Version > Bereitstellen.*
   Die URL bleibt gleich. Ohne neue Version läuft der alte Code weiter.
   **Nicht** „Neue Bereitstellung“ wählen – das erzeugt eine neue URL, die App spricht aber weiter mit der alten.
3. Prüfen: Web-App-URL im Browser öffnen -> muss „Marvin Backend <Version> aktiv“ zeigen.

## Token einrichten (einmalig)

1. Editor: *Projekteinstellungen (Zahnrad) > Skripteigenschaften > Eigenschaft hinzufügen*: `MARVIN_TOKEN` = langer Zufallswert (z.B. Passwort-Generator, 40 Zeichen).
2. Denselben Wert in der App unter ⚙︎ > Backend-Token eintragen (Android und Mac je einmal).
3. Ohne passenden Token antwortet das Backend mit `unauthorized`.

## Google Kalender

Nur der **Hauptkalender** (CalendarApp.getDefaultCalendar), ohne Geburtstage (Termin-Typ BIRTHDAY). Nach dem ersten Deploy einmal `testCalendar` im Editor ausführen und die Berechtigung erteilen; die Funktion liest nur.

## Zeilen von Hand / von anderen KIs eintragen

Erlaubt: Zeile mit **Title** füllen, **ID leer lassen**, Status `Puffer` (oder leer). Beim nächsten Laden vergibt das Backend ID + Zeitstempel, die App sortiert Puffer-Einträge per Gemini ein.
