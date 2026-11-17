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
*   `app.js`: Frontend-Logik. Tab-Switching, `callBackend()` (sendet `action` + `token`), Rendering (nur `textContent`, kein `innerHTML` mit Daten), Settings im `localStorage` (`marvin.geminiKey`, `marvin.backendToken`).
*   `apps-script/`: Backend-Code. Aktuell nur README – `Code.gs` muss noch aus dem Editor gespiegelt werden.

**Datenfluss:**
1. User spricht -> PWA (Web Speech API) [Noch zu implementieren]
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
*   `Config`: [OFFEN - Struktur wurde besprochen, aber exaktes Schema liegt im Sheet, nicht im aktuellen Chat-Kontext].
*   **Status-Modell (5 feste Werte):** `Puffer` (Inbox), `Gedächtnis` (Ideen/Backlog), `Zu tun` (Aktiv), `Pausiert` (On Hold), `Erledigt` (Done).
*   **`Puffer` ist kein Tab**, sondern ein technischer Eingangspuffer: Rohe Eingaben (v.a. Google Home) landen dort, bis die KI sie kategorisiert. In der UI nur als Zähler-Badge sichtbar, wenn etwas drin hängt.

**Beispielzeilen (Tabellenblatt "Tasks"):**
*   *Row 1:* ID: `[UUID]`, Title: "Balkonkraftwerk Kabel verlegen", Status: "Zu tun", Category: "PV & Klima", DueDate: "2026-11-20", Source: "PWA", Created_At: `[Timestamp]`, Updated_At: `[Timestamp]`
*   *Row 2:* ID: `[UUID]`, Title: "Physio-Übungen mit Flo abklären", Status: "Zu tun", Category: "Gesundheit", DueDate: "2026-11-18", Source: "PWA"
*   *Row 3:* ID: `[UUID]`, Title: "Neue Winterreifen bestellen", Status: "Gedächtnis", Category: "Wohnung", Source: "Google Home"

---

## 5. APPS SCRIPT
*   **Vollständiger aktueller Code:** [OFFEN - Der serverseitige `.gs` Code liegt in Google Drive und wurde im Chat nicht im Volltext ausgegeben. Er beinhaltet grundlegende CRUD-Operationen.]
*   **Endpunkte:** `doPost(e)` akzeptiert JSON-Payload (z.B. `{ action: 'getTasks' }`) und retourniert als Text/JSON: `{status: 'success', data: [...]}`.
*   **Deployment-Einstellungen:** Web-App, Ausführen als: "Ich (armin...)", Zugriff: "Jeder".
*   **Externe APIs/Schlüssel:** Google Sheets API (als Dienst im Script aktiviert, um CORS zu vermeiden).

---

## 6. STATUS
**Was funktioniert bereits:**
*   Repository-Struktur, GitHub Pages Live-Hosting (HTTPS).
*   UI-Rendering (Dark Mode, Tabs, Glas-Duplo-Karten).
*   Anbindung ans Backend: `fetch`-Call zieht erfolgreich die Live-Daten aus dem Google Sheet und rendert sie nach Status gefiltert.
*   Settings-Dialog (⚙︎) speichert Gemini-Key und Backend-Token lokal im `localStorage`.
*   Marvin-Button öffnet die Einstellungen, wenn kein Gemini-Key gesetzt ist; sonst Placeholder-`alert()`.

**Was ist halb fertig / offen:**
*   Backend-Token wird gesendet, aber vom Apps Script noch **nicht geprüft** (siehe `apps-script/README.md`). Muss vor `addTask` erledigt sein, da die Web-App-URL öffentlich ist.
*   Noch keine echte PWA (kein Manifest, kein Service Worker).

**Bekannte Bugs/Probleme (Gelöst):**
*   Anfängliche CORS-Fehler durch lokale Ausführung (`file://`) und fehlende Freigabe der Sheets-API. Behoben durch HTTPS-Hosting auf Pages und korrektes "Anyone"-Deployment im Apps Script.

**Getroffene Entscheidungen + Begründung:**
*   **Arbeitsweise:** Produkt-/Usability-Diskussion findet außerhalb statt; Claude Code arbeitet am Repo (Architektur, Umsetzung), committet auf Feature-Branches, `main` nur nach Freigabe. Ergebnisse der Produktdiskussion landen als Entscheidung in dieser Datei.
*   **Backend-Auth:** Shared Token (Script Property `MARVIN_TOKEN`), da Web-App öffentlich erreichbar sein muss.
*   **Infrastruktur:** Public Repo auf GitHub genutzt, um kostenloses GitHub Pages Hosting zu ermöglichen (da Secrets rein clientseitig im LocalStorage leben, ist der Public-Status unkritisch).

**Verworfene Ansätze + Warum:**
*   Arbeiten mit Code im Google Drive Ordner verworfen (Git vs. Drive Sync-Konflikte, CORS-Probleme).

---

## 7. NÄCHSTE SCHRITTE
Laut Projektplanung stehen nun folgende Implementierungen im Frontend (`app.js`) an:
1.  **Web Speech API:** Anbindung des nativen Browser-Mikrofons an den Marvin-Button zur Text-Transkription.
2.  **Gemini API Integration:** Bau des Fetch-Calls an die Gemini API (Nutzung des Keys aus dem `localStorage`).
3.  **Function Calling / System Prompt:** Konfiguration des System-Prompts, damit Gemini aus der Transkription ein striktes JSON-Objekt (Passend zum `Tasks`-Schema) sowie den "Marvin-Kommentar" generiert.
4.  **Backend-Write:** Den generierten JSON-Task via POST-Call (`action: 'addTask'`) an das Apps Script senden, um die Datenbank zu aktualisieren.