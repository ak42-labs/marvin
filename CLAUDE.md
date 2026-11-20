# 🤖 Projekt-Übergabedokumentation: Marvin (PWA)

Diese Dokumentation fasst den aktuellen Ist-Stand, die Architektur und die Vision des Projekts "Marvin" zusammen. Sie dient als nahtlose Übernahme-Basis für die weitere Frontend- und Logik-Entwicklung.

## 1. ZIEL & VISION
**Kurzbeschreibung:** 
Entwicklung einer maßgeschneiderten, minimalistischen, Mobile-First PWA (Progressive Web App) für das persönliche Task- und Projektmanagement. Das System nutzt ein Google Sheet als Datenbank und "Marvin" (eine melancholische, zynische KI basierend auf der Gemini API) als sprachgesteuertes Conversational Interface.

**Priorisierte Anforderungen:**
*   **Muss:** "KISS" (Keep It Simple, Stupid) Design-Ansatz. 
*   **Muss:** "Liquid Glas / Duplo"-Ästhetik (starke Rundungen, tiefer Dark Mode, unscharfe Glas-Elemente).
*   **Muss:** Nahtlose Sprachsteuerung (Voice-to-Text) über einen dominanten Action-Button.
*   **Muss:** KI-gestütztes Parsing von Aufgaben (Gemini extrahiert Task, Kategorie, Fälligkeit aus freier Sprache und retourniert JSON).
*   **Soll:** "Staubsauger-Hack" – Ingestion von Voice-Commands über Google Home via Google Tasks API ins Google Sheet.
*   **Soll:** Google Calendar Integration (Lesen/Schreiben).
*   **Später:** [OFFEN] (Weitere Ausbaustufen noch nicht im Detail definiert).

**Nutzung & Plattformen:**
*   Single-User (nur Armin). Primär Chrome auf Android, sekundär Browser am Mac.
*   Eingangskanäle: Sprache in der PWA, Google Home (im Vorbeigehen).
*   iOS ist **nicht** im Scope.

**Bewusst ausgeschlossene Dinge (Non-Goals):**
*   Keine verschachtelten Menüs oder komplexe Navigationsstrukturen.
*   Keine klassischen Formulare zur Aufgabeneingabe (Eingabe primär über Sprache/KI).
*   Keine Speicherung von API-Keys (Secrets) im Quellcode oder im GitHub Repository.

---

## 2. PERSÖNLICHKEIT "MARVIN"
**Tonfall & Humor:** 
Inspiriert von Marvin aus "Per Anhalter durch die Galaxis". Melancholisch, zynisch, hyperintelligent, aber völlig unterfordert und leicht genervt von menschlichen Banalitäten. 

**Grenzen:** 
Marvin darf NIEMALS ausschweifende Prosa, höfliche Floskeln ("Wie kann ich helfen?") oder detaillierte Erklärungen abgeben. Die API-Antwort muss für das System primär aus validem JSON bestehen und darf für den User maximal einen einzigen, kurzen, zynischen Begleitsatz enthalten.

**Beispielsätze/Dialoge:**
*   *System-Status (bereits im Code):* "Leer. Marvin ist fast beeindruckt."
*   *Lade-Status:* "Marvin holt die Daten..."
*   *Fehler-Status:* "Marvin ist offline (Netzwerkfehler)."
*   [OFFEN] Detaillierte Konversations-Prompts für die Gemini-Rückmeldungen müssen noch final im System-Prompt definiert werden.

---

## 3. ARCHITEKTUR (IST-STAND)
**Dateien im Repo (`ak42-labs/marvin`):**
*   `index.html`: UX v1: Drehrad (Planetenhirn | Hyperraum | Anhalter), Statuszeile, Kartenliste, Link „42 · n“, Marvin-Zeile (Schreibmaschine + „rückgängig“), Marvin-Knopf mit Augen (doze/listen/think/speak). Bearbeiten-`<dialog>` oben angedockt, Settings-`<dialog>` (Marvin-Knopf lange drücken / Rechtsklick).
*   `style.css`: Amber-Glas (reines CSS + SVG-Körnung `#noise`), Fonts Michroma + Sora (Google Fonts).
*   `app.js`: Frontend-Logik. Tab-Switching, `callBackend()` (sendet `action` + `token`), Rendering (nur `textContent`, kein `innerHTML` mit Daten), Settings im `localStorage` (`marvin.geminiKey`, `marvin.backendToken`), Spracheingabe (Web Speech API, `de-AT`), Gemini-Call (`GEMINI_MODELS`: `-latest`-Aliase mit Fallback, kein manuelles Modell-Update nötig; `responseSchema` mit Kategorien aus `getConfig`), `addTask` mit optimistischer Anzeige, Toast für Marvins Kommentar.
*   `manifest.json`, `sw.js`, `icons/`: PWA-Installierbarkeit. Service Worker cached nur die App-Hülle (Netz zuerst); Backend/Gemini laufen nie über den Cache.
*   `docs/ux-v1.md`: Verbindliche UX-/Design-Vorgabe (Namen, Layout, Amber-Glas-CSS, Drehrad, Karten, Gesten, Marvin-Augen) inkl. Link zum klickbaren Mockup.
*   `docs/ux-v2-briefing.md`: Übergabe an den Design-Chat für UX v2 (Ist-Stand + Wünsche: Raum, Farben je Art, Bearbeiten-Look, Marvin-Animationen).
*   `apps-script/Code.gs`: Backend (Kopie des Scripts am Sheet, Repo = Quelle der Wahrheit). Aktionen & Deploy-Ablauf: `apps-script/README.md`.

**Datenfluss:**
1. User tippt Marvin-Button und spricht -> PWA (Web Speech API, endet bei Stille). Ohne Speech API: Texteingabe per `prompt()`.
2. PWA -> Sendet Text + `localStorage` API-Key an Gemini API.
3. Gemini API -> Retourniert JSON (Task-Details).
4. PWA -> Sendet HTTP POST (`fetch`) an Google Apps Script (Web-App URL).
5. Apps Script -> Schreibt/Liest via Google Sheets API im Google Sheet.

**Hosting & Deployment:**
*   **Code-Hosting:** GitHub (Public Repository `ak42-labs/marvin`).
*   **Web-Hosting:** GitHub Pages (`https://ak42-labs.github.io/marvin/`).
*   **Deployment-Ablauf:** Lokale Änderungen werden via GitHub Desktop committet und auf den `main`-Branch gepusht. GitHub Pages aktualisiert automatisch.

---

## 4. GOOGLE SHEET
**Name:** `Marvin_Database`
**Speicherort:** Google Drive > Projekte > Marvin

**Tabellenblätter & Datenmodell:**
*   `Tasks`: Haupttabelle für alle Aufgaben.
*   Spalten `Tasks`: ID, Title, Status, Category, DueDate, Notes, Source, Created_At, Updated_At, Status_Since (vom Backend automatisch angelegt; nur bei Statuswechsel gesetzt).
*   `Config`: Spalte A = Typ, Spalte B = Wert. Typen: `Status`, `Category`, `Begriff` (Vokabular gegen Verhörer, geht in den Gemini-Prompt), `Importliste` (optional, welche Google-Tasks-Listen importiert werden), `Frist` (Tage im Hyperraum bis zur Glut; Standard 7).
*   **Anzeigenamen** (nur UI, `STATUS_LABELS` in `app.js`): Gedächtnis = Planetenhirn, Zu tun = Hyperraum, Pausiert = Anhalter, Erledigt = 42.
*   **Status-Modell (5 feste Werte):** `Puffer` (Inbox), `Gedächtnis` (Ideen/Backlog), `Zu tun` (Aktiv), `Pausiert` (On Hold), `Erledigt` (Done).
*   **`Puffer` ist kein Tab**, sondern ein technischer Eingangspuffer: Rohe Eingaben (v.a. Google Home) landen dort, bis die KI sie kategorisiert. In der UI nur als Zähler-Badge sichtbar, wenn etwas drin hängt.

**Beispielzeilen (Tabellenblatt "Tasks"):**
*   *Row 1:* ID: `[UUID]`, Title: "Balkonkraftwerk Kabel verlegen", Status: "Zu tun", Category: "PV & Klima", DueDate: "2026-11-20", Source: "PWA", Created_At: `[Timestamp]`, Updated_At: `[Timestamp]`
*   *Row 2:* ID: `[UUID]`, Title: "Physio-Übungen mit Flo abklären", Status: "Zu tun", Category: "Gesundheit", DueDate: "2026-11-18", Source: "PWA"
*   *Row 3:* ID: `[UUID]`, Title: "Neue Winterreifen bestellen", Status: "Gedächtnis", Category: "Wohnung", Source: "Google Home"

---

## 5. APPS SCRIPT
*   **Code:** `apps-script/Code.gs` (im Repo pflegen, in den Editor kopieren, neue Version deployen).
*   **Endpunkte:** `doPost(e)` mit `{ action, token, ... }`. Aktionen: `getTasks` (inkl. Google-Tasks-Import), `addTask`, `updateTask`, `updateTasks`, `deleteTask`, `getEvents`, `addEvent`, `updateEvent`, `deleteEvent`, `getConfig` (Details: `apps-script/README.md`). Antwort: `{status: 'success', data}` bzw. `{status: 'error', message}`.
*   **Auth:** Jede Anfrage braucht `token` == Script Property `MARVIN_TOKEN`.
*   **Deployment-Einstellungen:** Web-App, Ausführen als: "Ich (armin...)", Zugriff: "Jeder".
*   **Externe APIs/Schlüssel:** Google Sheets API (als Dienst im Script aktiviert, um CORS zu vermeiden).

---

## 6. STATUS
**Was funktioniert bereits:**
*   Repository-Struktur, GitHub Pages Live-Hosting (HTTPS).
*   UI-Rendering (Dark Mode, Tabs, Glas-Duplo-Karten).
*   Anbindung ans Backend: `fetch`-Call zieht erfolgreich die Live-Daten aus dem Google Sheet und rendert sie nach Status gefiltert.
*   Settings-Dialog (⚙︎) speichert Gemini-Key und Backend-Token lokal im `localStorage`.
*   Backend-Auth per Token ist live (Script Property gesetzt, neue Version deployt, Mac eingerichtet).
*   v0.2: Sprache -> Gemini (JSON per `responseSchema`) -> `addTask`. Task erscheint sofort im passenden Tab, Marvins Kommentar als Toast. Originalsatz landet in `Notes`. Live getestet am 17.11.2026 (Android/Mac), funktioniert. Toast bleibt 15 s, Antippen schließt.
*   PWA installierbar (Manifest, Icons, Service Worker). Neue App-Version lädt sich selbst (controllerchange -> reload). Beim Zurückholen der App (>30 s im Hintergrund) werden Daten + Puffer neu geladen. `APP_VERSION` in `app.js` steht im Einstellungsdialog – bei Releases erhöhen, ebenso `CACHE` in `sw.js`.

*   v0.3 (19.11.2026): Karte antippen -> Bearbeiten (Titel, Kategorie, Datum, Notizen; Tastatur inkl. Tastatur-Spracheingabe). Status-Buttons wählen nur aus, „Speichern“ übernimmt. Löschen mit Rückfrage. Google Tasks (Google Home) -> Puffer -> Gemini sortiert beim App-Start ein. Eigenes Vokabular (`Begriff`) im Prompt.

*   UX v1 (App 1.0.0, Backend 0.8, 19.11.2026): Amber-Glas, Drehrad, Dringlichkeit (Glut + Zahl), Gesten (Tippen = Bearbeiten, Wischen = Nachbar-Spalte, lange drücken = 42), Undo nach Anlegen/Verschieben/Erledigen, neues App-Icon.
*   1.0.1: Drehrad per Wischen drehbar, aktiver Knopf durchscheinend, „rückgängig“ verschwindet nach 10 s, Marvin-Sätze stark erweitert (keine direkte Wiederholung). Offen: Soll Marvin bei jeder Aktion sprechen? (Sprechtempo 0.95 passt.)
*   1.1.0 (Backend 0.9, 20.11.2026): **Google Kalender** (nur Hauptkalender ohne Geburtstage – Backend 0.10 –, live, nicht im Sheet): Termine der nächsten `Frist` Tage als Karten im Hyperraum, Klartext statt Zahl (`heute 14:00`, `morgen 14:00`, `Di 14:00`, ganztägig ohne Uhrzeit); heute = glüht, morgen = warm. Gemini erkennt Termin vs. Aufgabe (`type`, `time`, `durationMinutes`; Termin nur mit Uhrzeit) und legt Termine im Kalender an (Erinnerung = Kalender-Standard). Antippen -> Bearbeiten im Termin-Modus (Datum, Uhrzeit, Dauer) -> ändert/löscht im Kalender; Serientermine nur im Google Kalender änderbar. Puffer: 1 Gemini-Aufruf + 1 Backend-Aufruf (`updateTasks`) für alle Einträge. Prompt: `dueDate` immer setzen, sobald ein Tag erkennbar ist. **Situative Augen:** Termin heute = B3 (Brauen), ≥3 glühende Aufgaben = D3 (Skeptiker), 5. Verschieben derselben Aufgabe = B2 (hängend) + eigener Spruch; Wartemodus: zufällig Augenrollen, Blinzeln, Umschauen, Seufzen (D1).
*   1.0.2: `#app` fix am Viewport (position: fixed) – behebt „Marvin rutscht nach unten“ nach Tastatur/Laden.

**Was ist halb fertig / offen:**
*   v0.3 nur mit simulierten APIs getestet; Live-Test + Backend-Deploy (inkl. Dienst „Google Tasks API“) ausstehend.
*   Kein Undo direkt nach dem Anlegen (Löschen über Bearbeiten).
*   Google Home: Einkaufsliste landet in Google Keep (keine API für private Konten) -> bleibt bewusst dort. Für Marvin: „Hey Google, erinnere mich …“ -> Google Tasks -> Import (Backend 0.5: nach Import in Google Tasks abgehakt, kein Doppelimport). Sprach-Weg für Einkäufe zu Marvin/Bring: offen, siehe Backlog.
*   v0.3.2: Gemini-Überlastung (429/503) -> automatisch erneut versuchen / anderes Modell. Optionale Sprachausgabe (Einstellungen: „Marvin spricht“, Browser-TTS, tief + langsam).
*   Erledigt: kein Tab, sondern dezenter Link „✓ Erledigt (n)“ am Listenende (letzte 50, neueste zuerst).
*   Debug-Modus (Einstellungen): Protokoll aller Backend-/Gemini-Antworten unter der Liste; Backend liefert `info` (Version, Import-Bericht). Import-Fehler erscheinen auch ohne Debug als Toast.
*   Backend-Version prüfen: Web-App-URL im Browser öffnen -> „Marvin Backend <BACKEND_VERSION> aktiv“.

**Bekannte Bugs/Probleme (Gelöst):**
*   Anfängliche CORS-Fehler durch lokale Ausführung (`file://`) und fehlende Freigabe der Sheets-API. Behoben durch HTTPS-Hosting auf Pages und korrektes "Anyone"-Deployment im Apps Script.

**Getroffene Entscheidungen + Begründung:**
*   **Arbeitsweise:** Produkt-/Usability-Diskussion findet außerhalb statt; Claude Code arbeitet am Repo (Architektur, Umsetzung), committet direkt auf `main` (Single-Dev-Projekt; Pages deployt automatisch). Größere/riskante Umbauten auf einem Branch mit Rückfrage. Ergebnisse der Produktdiskussion landen als Entscheidung in dieser Datei.
*   **Backend-Auth:** Shared Token (Script Property `MARVIN_TOKEN`), da Web-App öffentlich erreichbar sein muss.
*   **Infrastruktur:** Public Repo auf GitHub genutzt, um kostenloses GitHub Pages Hosting zu ermöglichen (da Secrets rein clientseitig im LocalStorage leben, ist der Public-Status unkritisch).

**Verworfene Ansätze + Warum:**
*   Arbeiten mit Code im Google Drive Ordner verworfen (Git vs. Drive Sync-Konflikte, CORS-Probleme).

---

## 7. NÄCHSTE SCHRITTE
Erkenntnisse aus dem ersten Live-Test (17.11.2026):
*   Spracherkennung verhört Eigennamen (z.B. Verein "Vaget" -> "Baguette"). Falsche Einträge lassen sich aktuell nicht korrigieren.
*   KI-Einträge direkt zu übernehmen ist im Alltag riskant – Korrekturmöglichkeit nötig.

Backlog (Priorisierung durch Armin):
1.  **UI-Runde (außerhalb):** mehr Raum/Abstand, Farben unterscheiden (Menü vs. Karten), evtl. Farben je Art (Aufgabe/Termin). Bearbeiten-Dialog im neuen Look.
2.  Soll Marvin bei jeder Aktion sprechen? (Usability)
3.  v3 „Neigungs-Glas“ (DeviceOrientation).
4.  Einkaufsliste: Google Keep (keine API) – geparkt; Option Bring!.
