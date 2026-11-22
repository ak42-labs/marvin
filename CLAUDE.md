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
*   `index.html`: UX v2 (Basis v1): Drehrad (Planetenhirn | Hyperraum | Anhalter), Statuszeile, Kartenliste, Link „42 · n“, Marvin-Zeile (Schreibmaschine + „rückgängig“), Marvin-Knopf mit Augen (doze/listen/think/speak). Bearbeiten-`<dialog>` oben angedockt, Settings-`<dialog>` (Marvin-Knopf lange drücken / Rechtsklick).
*   `style.css`: Layout/Material UX v2 – Amber-Glas nur für Drehrad + Marvin-Knopf, Karten = Rauchglas, Termine = Champagner, flacher Bearbeiten-Dialog; Neigungs-Glas über CSS-Variablen `--tx/--ty`. Fonts Michroma + Sora.
*   `face.js` + `face.css`: Marvins Gesicht (UX v2 §7): Formen, Leerlauf-Gags, Reaktionen (Erledigt/Gelöscht/Überfällig), Arkanoid (2× tippen / selten im Leerlauf), Neigungs-Glas. Schnittstelle `Face.*`, von `app.js` angesteuert.
*   `app.js`: Frontend-Logik. Tab-Switching, `callBackend()` (sendet `action` + `token`), Rendering (nur `textContent`, kein `innerHTML` mit Daten), Settings im `localStorage` (`marvin.geminiKey`, `marvin.backendToken`), Spracheingabe (Web Speech API, `de-AT`), Gemini-Call (`GEMINI_MODELS`: `-latest`-Aliase mit Fallback, kein manuelles Modell-Update nötig; `responseSchema` mit Kategorien aus `getConfig`), `addTask` mit optimistischer Anzeige, Toast für Marvins Kommentar.
*   `manifest.json`, `sw.js`, `icons/`: PWA-Installierbarkeit. Service Worker cached nur die App-Hülle (Netz zuerst); Backend/Gemini laufen nie über den Cache.
*   `docs/ux-v1.md`: Verbindliche UX-/Design-Vorgabe (Namen, Layout, Amber-Glas-CSS, Drehrad, Karten, Gesten, Marvin-Augen) inkl. Link zum klickbaren Mockup.
*   `docs/ux-v3.md`: Vorgabe UX v3 (Gestenregel, ein Formular, Proviant, Laden ohne Warten, Wischzone) – umgesetzt in 3.0.0.
*   `docs/ux-v2.md`: Verbindliche Design-Vorgabe UX v2 (Raum, neutrale Karten, Termine Champagner, Dringlichkeit mit Deckel, flacher Bearbeiten-Dialog, Sprech-Regeln, Augen v2 inkl. Gags/Easter Eggs, Spaß-Modus). Ergänzt `ux-v1.md`.
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

## 4. GOOGLE SHEET (Schema v1, seit App 3.1.0 / Backend 1.0)
**Name:** `Marvin_Database` · **Speicherort:** Google Drive > Projekte > Marvin

**Grundsatz:** Jedes Blatt = eine Tabelle (Vorbereitung für eine spätere echte Datenbank). Alle Systembegriffe Englisch, `snake_case`. Eigene Inhalte (Titel, Kategorie- und Abteilungsnamen) bleiben Deutsch. Details + Spalten: `apps-script/README.md`.

| Tabelle | Zweck |
|---|---|
| `tasks` | Aufgaben + Proviant. `status` ∈ `inbox` · `backlog` · `todo` · `on_hold` · `shopping` · `done`; `category_id` → `categories`; `aisle_id` → `shop_aisles` |
| `categories` | `id`, `name`, `sort` |
| `shop_aisles` | `id`, `name`, `sort`, `store` (Wechsel des Geschäfts = Trennlinie) |
| `shop_items` | gemerkte Abteilung je Artikel |
| `terms` | Vokabular gegen Verhörer (`term`, `hint`) |
| `settings` | `due_days`, `event_days`, `import_lists`, `locale` |

*   **Status sind feste Schlüssel im Code** (Verhalten hängt daran), keine Tabelle. Anzeige-Namen nur in `STATUS_LABELS` (`app.js`): backlog = Planetenhirn, todo = Hyperraum, on_hold = Anhalter, shopping = Proviant, done = 42. `inbox` unsichtbar (Puffer). Gekaufter Proviant = `done` mit `aisle_id`, zählt nicht in „42“.
*   **IDs statt Namen** in `tasks` (Kategorie/Abteilung umbenennen bricht nichts).
*   **App liest alles in einem Aufruf** (`getAll`) und hält es im Speicher + localStorage-Cache (`CACHE_V`); Nachschlagen ID → Name passiert nur im Speicher.
*   Alte Blätter `Tasks_alt` / `Config_alt` nach der Umstellung nur als Sicherung; löschen, sobald alles passt.
*   Einkäufe aus Rezepten per Gemini-Skill: `docs/skill-shopping.md`.

---

## 5. APPS SCRIPT
*   **Code:** `apps-script/Code.gs` (im Repo pflegen, in den Editor kopieren, neue Version bereitstellen). Version: `BACKEND_VERSION`.
*   **Aktionen:** `getAll`, `addTask(s)`, `updateTask(s)`, `deleteTask`, `getEvents`, `addEvent`, `updateEvent`, `deleteEvent`, `setShopItem`. Antwort `{status, data, info}`. Details: `apps-script/README.md`.
*   **Auth:** Jede Anfrage braucht `token` == Script Property `MARVIN_TOKEN`.
*   **Deployment:** Web-App, Ausführen als „Ich“, Zugriff „Jeder“.
*   **Dienste:** Google Tasks API (Import Google Home), Kalender (Hauptkalender).

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
*   **2.0.0 (21.11.2026): UX v2** nach `docs/ux-v2.md` umgesetzt: mehr Raum (8er-Raster), Amber nur Steuerung, Karten Rauchglas, Termine Champagner, „heute = Maximum“, flacher Bearbeiten-Dialog, Sprechregeln §6, „Keine Panik ↺“, Cursor ruht nach 2 s, Gemini-Ton ohne „Nicht.“-Muster, neue Augen + Gags + Reaktionen + Arkanoid, Einstellung „Spaß-Modus“, Neigungs-Glas. Situativ: Termin heute = Blick zur Uhr, ≥3 glühend = Langeweile-Pose + beim Öffnen Schock/Böse abwechselnd, 5. Verschieben = hängende Augen.
*   2.0.1: Bearbeiten-Dialog zurück auf den flachen Stand 1.1.0 (Armin: Dateneingabe zählt, kein Fancy; ux-v2 §5 damit überholt). Termine ganzflächig leicht Champagner getönt. Verschieben: vorerst jedes Mal Text + Stimme (Vorführmodus). Spracheingabe: durchgehend zuhören, Ende erst nach 3 s Stille (8 s bis zum ersten Wort) oder Tipp; vom Browser beendete Sitzungen werden nahtlos fortgesetzt. Arkanoid: abgeräumte Steine kollidieren nicht mehr, Ball nutzt volle Höhe.
*   2.0.2: Spracheingabe Ende nach 2 s Stille, 5 s bis zum ersten Wort. Leerlauf-Gags alle 10–16 s, Pixel-Gags doppelt gewichtet. Neigungs-Glas ca. 3× stärker (Glut ±18 %, Glanz ±40 px, Karten-Verlauf ±20°).
*   2.0.3: Leerlauf-Gags: erster nach 4–6 s Ruhe, dann alle 6–10 s. Neu „Blick“: Augen schauen beim Scrollen nach oben/unten und beim Drehrad-Wechsel in Drehrichtung (ohne Klick). Neigungs-Glas auf 1,5× Original (Glut ±9 %, Glanz ±21 px, Karten ±9°).
*   **3.0.0 (Backend 0.12, 22.11.2026): UX v3** nach `docs/ux-v3.md`: Gesten überall gleich (Tipp ohne Bewegung = erledigt/gekauft, lange drücken 0,45 s = bearbeiten, Wischen = Nachbar-Spalte; Termin-Tipp = Spruch). Ein Formular für Aufgabe/Termin („Die Uhrzeit entscheidet“): Umwandeln legt IMMER zuerst neu an und löscht das Alte erst nach Erfolg; Serientermine nicht umwandelbar; kein Auto-Fokus. Termine 60 Tage voraus, > Frist im Planetenhirn; Kategorie am Termin per Tag `marvinCategory`. Proviant als 4. Drehrad-Position (Laufweg-Sortierung, Trennlinie bei „separat“, Tippen = verglüht/gekauft, Abteilung merken, Gemini `type:"einkauf"` mit mehreren Artikeln). Laden ohne Warten (Cache `marvin.cache`, Format-Version `CACHE_V`, „Babelfisch übersetzt …“, offline „Kein Netz. Wie erwartet.“). Daumen-Wischzone unten (freie Listenfläche, Marvin-Zeile, Marvin-Knopf; Entscheidung erst beim Loslassen).
*   **3.1.0 (Backend 1.0, 22.11.2026): Schema v1** – englische Status-Schlüssel, eigene Tabellen (`tasks`, `categories`, `shop_aisles`, `shop_items`, `terms`, `settings`), IDs statt Namen, ein Ladeaufruf `getAll`, Umstellungsfunktion `migrateToV1Schema` (mit Armins echten Daten in einer Sheets-Nachbildung getestet). Keine Altlasten: alte deutsche Werte werden nicht mehr verstanden.
*   1.0.2: `#app` fix am Viewport (position: fixed) – behebt „Marvin rutscht nach unten“ nach Tastatur/Laden.

**Was ist halb fertig / offen:**
*   v0.3 nur mit simulierten APIs getestet; Live-Test + Backend-Deploy (inkl. Dienst „Google Tasks API“) ausstehend.
*   Kein Undo direkt nach dem Anlegen (Löschen über Bearbeiten).
*   Google Home: Einkaufsliste landet in Google Keep (keine API für private Konten) -> bleibt bewusst dort. Für Marvin: „Hey Google, erinnere mich …“ -> Google Tasks -> Import (Backend 0.5: nach Import in Google Tasks abgehakt, kein Doppelimport). Sprach-Weg für Einkäufe zu Marvin/Bring: offen, siehe Backlog.
*   v0.3.2: Gemini-Überlastung (429/503) -> automatisch erneut versuchen / anderes Modell. Optionale Sprachausgabe (Einstellungen: „Marvin spricht“, Browser-TTS, tief + langsam).
*   Erledigt: kein Tab, sondern dezenter Link „✓ Erledigt (n)“ am Listenende (letzte 50, neueste zuerst).
*   Debug-Modus (Einstellungen): Protokoll aller Backend-/Gemini-Antworten unter der Liste; Backend liefert `info` (Version, Import-Bericht). Import-Fehler erscheinen auch ohne Debug als Toast.
*   Backend 0.11: Zeilen ohne ID (von Hand oder von anderen KIs ins Sheet geschrieben) bekommen beim Laden automatisch ID/Zeitstempel, ohne Status -> Puffer.
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
1.  ~~Umstellung Schema v1~~ erledigt (22.11.2026); `migrateToV1Schema` entfernt (Backend 1.0.1). Alltagstest läuft.
2.  `Tasks_alt` / `Config_alt` im Sheet löschen, sobald sicher nichts fehlt.
3.  Kategorien aufräumen (z.B. „Verschiedenes“ in „Allerlei“ zusammenführen, „Einkaufen“ prüfen) – direkt in `categories`/`tasks`.
4.  ~~Rezept-Skill in Gemini~~ angelegt und getestet (`docs/skill-shopping.md`).
5.  Vorführmodus zurückdrehen, wenn's nervt: Verschieben spricht jedes Mal, Gags alle 6–10 s.
6.  Weitere Leerlauf-Spiele (Space Invaders, Lunar Lander, Defender) – erst Mockup im Design-Chat.
7.  Fließende Augen-Übergänge (Design-Chat).
