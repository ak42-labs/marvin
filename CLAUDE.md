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
*   `index.html`: Das radikal reduzierte UI (Header mit Puffer-Badge + Settings-Button, Tabs Gedächtnis/Zu tun/Pausiert, Task-Liste, Settings-`<dialog>`, Marvin-Sprachbutton).
*   `style.css`: Umsetzung des "Glas-Duplo"-Designs (CSS Variables für Dark Mode, `backdrop-filter: blur` für Milchglas, extreme `border-radius` Werte für Blöcke).
*   `app.js`: Frontend-Logik. Tab-Switching, `callBackend()` (sendet `action` + `token`), Rendering (nur `textContent`, kein `innerHTML` mit Daten), Settings im `localStorage` (`marvin.geminiKey`, `marvin.backendToken`), Spracheingabe (Web Speech API, `de-AT`), Gemini-Call (`GEMINI_MODELS`: `-latest`-Aliase mit Fallback, kein manuelles Modell-Update nötig; `responseSchema` mit Kategorien aus `getConfig`), `addTask` mit optimistischer Anzeige, Toast für Marvins Kommentar.
*   `manifest.json`, `sw.js`, `icons/`: PWA-Installierbarkeit. Service Worker cached nur die App-Hülle (Netz zuerst); Backend/Gemini laufen nie über den Cache.
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
*   Spalten `Tasks`: ID, Title, Status, Category, DueDate, Notes, Source, Created_At, Updated_At.
*   `Config`: Spalte A = Typ (`Status` / `Category`), Spalte B = Wert. Wird über `getConfig` gelesen.
*   **Status-Modell (5 feste Werte):** `Puffer` (Inbox), `Gedächtnis` (Ideen/Backlog), `Zu tun` (Aktiv), `Pausiert` (On Hold), `Erledigt` (Done).
*   **`Puffer` ist kein Tab**, sondern ein technischer Eingangspuffer: Rohe Eingaben (v.a. Google Home) landen dort, bis die KI sie kategorisiert. In der UI nur als Zähler-Badge sichtbar, wenn etwas drin hängt.

**Beispielzeilen (Tabellenblatt "Tasks"):**
*   *Row 1:* ID: `[UUID]`, Title: "Balkonkraftwerk Kabel verlegen", Status: "Zu tun", Category: "PV & Klima", DueDate: "2026-11-20", Source: "PWA", Created_At: `[Timestamp]`, Updated_At: `[Timestamp]`
*   *Row 2:* ID: `[UUID]`, Title: "Physio-Übungen mit Flo abklären", Status: "Zu tun", Category: "Gesundheit", DueDate: "2026-11-18", Source: "PWA"
*   *Row 3:* ID: `[UUID]`, Title: "Neue Winterreifen bestellen", Status: "Gedächtnis", Category: "Wohnung", Source: "Google Home"

---

## 5. APPS SCRIPT
*   **Code:** `apps-script/Code.gs` (im Repo pflegen, in den Editor kopieren, neue Version deployen).
*   **Endpunkte:** `doPost(e)` mit `{ action, token, ... }`. Aktionen: `getTasks`, `addTask`, `addEvent`, `getConfig`. Antwort: `{status: 'success', data}` bzw. `{status: 'error', message}`.
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
*   v0.2: Sprache -> Gemini (JSON per `responseSchema`) -> `addTask`. Task erscheint sofort im passenden Tab, Marvins Kommentar als Toast. Originalsatz landet in `Notes`. (Mit gemockten APIs getestet; Live-Test mit echtem Gemini-Key steht aus.)
*   PWA installierbar (Manifest, Icons, Service Worker).

**Was ist halb fertig / offen:**
*   Kein Undo/Löschen (Backend hat keine `deleteTask`/`updateTask`-Aktion).
*   Puffer wird noch nicht automatisch von der KI abgearbeitet.

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
Kandidaten für v0.3 (Priorisierung durch Armin):
1.  **Task-Status ändern:** `updateTask` im Backend; Wischen (rechts = Erledigt, links = Pausiert) in der UI. Damit auch Undo möglich.
2.  **Puffer-Abarbeitung:** Beim App-Start Puffer-Einträge durch Gemini klassifizieren und per `updateTask` einsortieren; Unklares bleibt als Rückfrage im Badge.
3.  **Google Home Ingestion:** Zeitgesteuertes Apps Script holt Google Tasks in den Puffer.
4.  **System-Prompt verfeinern** anhand echter Nutzung (Marvins Ton, Kategorie-Treffsicherheit).
