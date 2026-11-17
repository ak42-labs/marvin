# Apps Script (Backend)

`Code.gs` ist eine 1:1-Kopie des Scripts am Sheet `Marvin_Database`.
**Das Repo ist die Quelle der Wahrheit:** Änderungen hier machen, dann in den Apps-Script-Editor kopieren und neu deployen.

## Aktionen (`doPost`, JSON-Body mit `action` + `token`)

| action      | Payload  | Rückgabe |
|-------------|----------|----------|
| `getTasks`  | –        | Array aller Zeilen aus `Tasks` (Header = Keys) |
| `addTask`   | `task`   | `{id, title}` – ID und Timestamps setzt der Server |
| `addEvent`  | `event`  | `{eventId, title}` – Termin im Standardkalender |
| `getConfig` | –        | `{statuses: [], categories: []}` aus `Config` |

Spalten `Tasks`: ID, Title, Status, Category, DueDate, Notes, Source, Created_At, Updated_At.
`Config`: Spalte A = Typ (`Status`/`Category`), Spalte B = Wert.

## Deploy-Ablauf

1. Code aus `Code.gs` in den Editor kopieren, speichern.
2. *Bereitstellen > Bereitstellungen verwalten > Bearbeiten (Stift) > Version: Neue Version > Bereitstellen.*
   Die URL bleibt gleich. Ohne neue Version läuft der alte Code weiter.

## Token einrichten (einmalig)

1. Editor: *Projekteinstellungen (Zahnrad) > Skripteigenschaften > Eigenschaft hinzufügen*: `MARVIN_TOKEN` = langer Zufallswert (z.B. Passwort-Generator, 40 Zeichen).
2. Denselben Wert in der App unter ⚙︎ > Backend-Token eintragen (Android und Mac je einmal).
3. Ohne passenden Token antwortet das Backend mit `unauthorized`.
