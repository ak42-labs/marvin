# Apps Script (Backend) – Schema v1

`Code.gs` ist eine 1:1-Kopie des Scripts am Sheet `Marvin_Database`.
**Das Repo ist die Quelle der Wahrheit:** Änderungen hier machen, dann in den Apps-Script-Editor kopieren und neu bereitstellen.
Version prüfen: Web-App-URL im Browser öffnen -> „Marvin Backend <BACKEND_VERSION> aktiv“.

## Datenmodell (jedes Blatt = eine Tabelle, Englisch, snake_case)

| Tabelle | Spalten | Hinweise |
|---|---|---|
| `tasks` | `id`, `title`, `status`, `category_id`, `due_date`, `notes`, `aisle_id`, `source`, `created_at`, `updated_at`, `status_since` | `status` ∈ `inbox` · `backlog` · `todo` · `on_hold` · `shopping` · `done`. `due_date` = YYYY-MM-DD. `source` ∈ `app` · `google_tasks` · `sheet`. `status_since` nur bei echtem Statuswechsel. |
| `categories` | `id`, `name`, `sort` | `tasks.category_id` → `categories.id`. Umbenennen = nur `name` ändern. |
| `shop_aisles` | `id`, `name`, `sort`, `store` | Laufweg-Reihenfolge über `sort`. Wechselt `store` (z.B. `supermarket` → `drogerie`), zeigt die App eine Trennlinie. |
| `shop_items` | `name`, `aisle_id` | Gemerkte Abteilung je Artikel (pflegt die App). |
| `terms` | `term`, `hint` | Eigenes Vokabular gegen Verhörer (geht in den Gemini-Prompt). |
| `settings` | `key`, `value` | `due_days` (7), `event_days` (60), `import_lists` (kommagetrennt, leer = alle), `locale` (de-AT). |

Termine leben im **Google-Hauptkalender** (ohne Geburtstage); Kategorie unsichtbar per Tag `marvin_category_id`.
Status-Anzeigenamen (Planetenhirn, Hyperraum …) leben nur in der App (`STATUS_LABELS`).

## Aktionen (`doPost`, JSON-Body mit `action` + `token`)

| action | Payload | Rückgabe |
|---|---|---|
| `getAll` | – | `{tasks, categories, shop_aisles, shop_items, terms, settings, events}` – **ein** Aufruf; vorher Google-Tasks-Import + Vervollständigen von Hand eingetragener Zeilen |
| `addTask` / `addTasks` | `task` / `tasks: [task]` | `{id}` bzw. Liste |
| `updateTask` / `updateTasks` | `id, changes` / `items: [{id, changes}]` | `{id}` – unbekannte Status werden abgelehnt |
| `deleteTask` | `id` | `{id}` |
| `getEvents` | `days` | Termine |
| `addEvent` / `updateEvent` / `deleteEvent` | `event` (`title, start, end, all_day, description, category_id`) / `id, changes` / `id` | Termin (Serientermine: nicht änderbar) |
| `setShopItem` | `name, aisle_id` | merkt Abteilung je Artikel |

## Deploy-Ablauf

0. `BACKEND_VERSION` in `Code.gs` erhöhen (Claude macht das bei Änderungen).
1. Code aus `Code.gs` in den Editor kopieren, speichern.
2. *Bereitstellen > Bereitstellungen verwalten > Bearbeiten (Stift) > Version: Neue Version > Bereitstellen.*
   **Nicht** „Neue Bereitstellung“ – das erzeugt eine neue URL.
3. Prüfen: Web-App-URL im Browser -> „Marvin Backend <Version> aktiv“.

## Umstellung auf Schema v1

Erledigt am 22.11.2026 (`migrateToV1Schema`, danach aus dem Code entfernt; steht bei Bedarf in der Git-Historie, Commit b095dcc).

## Token, Google Tasks, Kalender

- Token: Script Property `MARVIN_TOKEN` = Wert in der App (Einstellungen).
- Google Tasks: Dienst „Google Tasks API“ (Kennung `Tasks`); einmal `testGoogleTasks` ausführen (Berechtigung).
- Kalender: einmal `testCalendar` ausführen (Berechtigung).

## Zeilen von Hand / von anderen KIs eintragen

In `tasks` reicht `title` (+ optional `status`, `category_id`, `aisle_id`, `due_date`, `notes`); **`id` leer lassen**. Beim nächsten Laden ergänzt das Backend `id`, Zeitstempel, `source = sheet`; ohne gültigen Status -> `inbox` (Marvin sortiert ein). Für Einkäufe siehe `docs/skill-shopping.md`.
