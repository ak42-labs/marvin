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
*   Gemini-Rückmeldungen: Ton im System-Prompt (`buildSystemPrompt` in `app.js`) + `docs/skill-marvin.md`.

---

## 3. ARCHITEKTUR (IST-STAND)
**Dateien im Repo (`ak42-labs/marvin`):**
*   `index.html`: UX v2 (Basis v1): Drehrad (Planetenhirn | Hyperraum | Anhalter), Statuszeile, Kartenliste, Link „42 · n“, Marvin-Zeile (Schreibmaschine + „rückgängig“), Marvin-Knopf mit Augen (doze/listen/think/speak). Bearbeiten-`<dialog>` oben angedockt, Settings-`<dialog>` (Marvin-Knopf lange drücken / Rechtsklick).
*   `style.css`: Layout/Material UX v2 – Amber-Glas nur für Drehrad + Marvin-Knopf, Karten = Rauchglas, Termine = Champagner, flacher Bearbeiten-Dialog; Neigungs-Glas über CSS-Variablen `--tx/--ty`. Fonts Michroma + Sora.
*   `face.js` + `face.css`: Marvins Gesicht (UX v4): runde Welt (fließende Kurve) + Arcade-Welt (Pixel, Ton nur mit „Marvin spricht“), Autopilot mit Phasen/Toren, Ereignisse (Abgleich = Loading 42 %, Erledigt = La-Ola bzw. Extra Life bei leerem Hyperraum, Verschieben = Augenrollen, Löschen = Blinzeln), Arkanoid (2× tippen), Neigungs-Glas. Schnittstelle `Face.*`, von `app.js` angesteuert.
*   `app.js`: Frontend-Logik. Tab-Switching, `callBackend()` (sendet `action` + `token`), Rendering (nur `textContent`, kein `innerHTML` mit Daten), Settings im `localStorage` (`marvin.geminiKey`, `marvin.backendToken`), Spracheingabe (Web Speech API, `de-AT`), Gemini-Call (`GEMINI_MODELS`: `-latest`-Aliase mit Fallback, kein manuelles Modell-Update nötig; `responseSchema` mit Kategorien aus `getConfig`), `addTask` mit optimistischer Anzeige, Toast für Marvins Kommentar.
*   `manifest.json`, `sw.js`, `icons/`: PWA-Installierbarkeit. Service Worker cached nur die App-Hülle (Netz zuerst); Backend/Gemini laufen nie über den Cache.
*   `tests/offline.test.js`: Offline-Test-Suite (Playwright, Handy, Backend/Gemini als Attrappe, Netz aus/langsam/hängend).
*   `docs/ux-v1.md`: Verbindliche UX-/Design-Vorgabe (Namen, Layout, Amber-Glas-CSS, Drehrad, Karten, Gesten, Marvin-Augen) inkl. Link zum klickbaren Mockup.
*   `docs/ux-v4.md`: Augenwelten – Teil 1 runde Welt (fließende Abläufe), Teil 2 Arcade-Welt (Pixel, Ton, Scanlines), Teil 3 Ablauf beider Welten (Tore, Phasen, Ereignisse).
*   `docs/ux-v3.1.md`: Alltags-Feinschliff (Sprach-Ende, Aktualisieren, Netz-Warteschlange, Gags, Einstellungen).
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
*   Eingang über Gemini (Einkauf, Aufgaben, Termine): `docs/skill-marvin.md`.

---

## 5. APPS SCRIPT
*   **Code:** `apps-script/Code.gs` (im Repo pflegen, in den Editor kopieren, neue Version bereitstellen). Version: `BACKEND_VERSION`.
*   **Aktionen:** `getAll`, `importTasks`, `addTask(s)`, `updateTask(s)`, `deleteTask`, `getEvents`, `addEvent`, `updateEvent`, `deleteEvent`, `setShopItem`. Antwort `{status, data, info}`. Details: `apps-script/README.md`.
*   **Auth:** Jede Anfrage braucht `token` == Script Property `MARVIN_TOKEN`.
*   **Deployment:** Web-App, Ausführen als „Ich“, Zugriff „Jeder“.
*   **Dienste:** Google Sheets API (schnelles Lesen), Google Tasks API (Import Google Home), Kalender (Hauptkalender).

---

## 6. STATUS (Stand 27.11.2026: App 4.7.1, Backend 1.1.0)
*   Läuft live: Drehrad + Karten, Sprache -> Gemini -> Sheet/Kalender, Proviant, Google-Tasks-Import (Hintergrund, 1×/h), Augen UX v4 (runde + Arcade-Welt, Autopilot, Spaß-Regler), Deep-Thought-Zeile + Datenalter, Ziehen zum Aktualisieren, Einstellungen + Schlüssel-Dialog, Debug-Modus mit Zeitmessung (`info.ms`), Offline-Modus (Warteschlange `marvin.outbox`, `⟳ n`, Sprache ohne Netz, Zeitlimit 8 s).
*   Ladezeit ~2,5–3,5 s (Backend ~1 s, Rest Netz/Kaltstart Google).
*   **Versionsgeschichte:** `docs/changelog.md` (bei jedem Release dort eintragen, nicht hier).
*   Releases: `APP_VERSION` (`app.js`) + `CACHE` (`sw.js`) erhöhen; Backend: `BACKEND_VERSION` erhöhen und Armin die Deploy-Schritte nennen (`apps-script/README.md`).

**Arbeitsweise:**
*   Claude Code committet direkt auf `main` (Single-Dev; Pages deployt automatisch). Riskante Umbauten: Branch + Rückfrage.
*   **Ein Chat pro Thema**, Design + Umsetzung im selben Chat. Am Themenende: Stand hier + `docs/changelog.md` eintragen, committen, dann neuer Chat.
*   Vorgaben in `docs/` gelten vor dieser Datei; Widersprüche melden und veraltete Stellen in `docs/` mit Verweis auf die gültige Stelle markieren.
*   **Design-Chat ↔ Entwickler-Chat:** Beide starten mit `git pull`.
    *   **Design** schreibt nur in `docs/` (neue Datei oder neues Kapitel), nie in diese Datei und nie Code.
    *   Jedes Kapitel bekommt oben eine Zeile `Status: Entwurf` oder `Status: freigegeben` (nur Armin gibt frei). Ersetzt es Älteres, markiert Design die alte Stelle mit „veraltet → siehe …“.
    *   **Entwicklung** setzt nur Kapitel mit `Status: freigegeben` um und meldet Widersprüche, statt sie selbst zu entscheiden. Danach setzt sie `Status: umgesetzt in <Version>` und trägt den Stand hier und in `docs/changelog.md` ein.
    *   Übergabe durch Armin, ein Satz: „Pull, `docs/<datei>.md` §n ist freigegeben, bitte umsetzen.“
*   Vor jedem Commit im simulierten Handy testen (Playwright), inkl. langsamem Netz; nichts als „fertig“ melden, was nicht geprüft ist.
*   Antworten an Armin auf Deutsch, einfach erklärt.

**Entscheidungen:** Backend-Auth per Shared Token (`MARVIN_TOKEN`). Public Repo für kostenloses Pages-Hosting (Secrets nur im localStorage). Kein Code im Google-Drive-Ordner (Sync-/CORS-Probleme). Bearbeiten-Dialog bleibt flach (kein Fancy). Google-Home-Einkaufsliste bleibt in Google Keep (keine API).

---

## 7. NÄCHSTE SCHRITTE
**Plan 27.11.2026:**
Aktuell nichts offen.

**Danach / geparkt:**
*   Arcade-Spiele gemeinsam designen: eigene Spiele in Marvins Stil mit bekannten Mechaniken (Ball-und-Steine, Abwehr-Shooter, Landen mit Schub) – keine Nachbauten bestehender Spiele (Name, Figuren, Look). Spielbar per Doppeltipp, evtl. Vollbild, Karten als Gegner. Das bestehende Ball-und-Steine-Spiel bleibt bis dahin wie es ist.

Erledigt: Einstellungen-Optik + Jahreszahl 4.4.0, Offline-Modus 4.3.0 (Tests: `node tests/offline.test.js`), Schema v1, Kategorien aufgeräumt, Gemini-Skill „Marvin-Eingang“ (`docs/skill-marvin.md`, geprüft 26.11.), UX v4, ux-v3.1 §1/§2/§4/§5/§8. Business Case verworfen.
