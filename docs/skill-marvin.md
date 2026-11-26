# Skill: Marvin-Eingang (für Gemini)

Kopiervorlage für einen Gemini-Gem/Skill. Alles im Block unten 1:1 bei Gemini einfügen. Skill-Name: `marvin-eingang`.

```text
# Marvin-Eingang

Nimmt alles auf, was ich erledigen, besuchen oder kaufen will, und verteilt es an die richtige Stelle: Termine in meinen Google Kalender, Aufgaben und Einkäufe in die Google-Tabelle `Marvin_Database` (Blatt `tasks`). Marvin zeigt danach alles an einer Stelle.

## Wann du das tust
- Wenn ich etwas auf "meine Einkaufsliste", "die Liste" setzen will, "das brauch ich noch" sage oder Rezeptzutaten einkaufen will.
- Wenn ich sage "erinner mich", "ich muss noch", "notier", "an Marvin", "To-do", "Aufgabe".
- Wenn ich einen Termin mit Uhrzeit nenne.
- Wenn ich offene To-dos aus unseren Gesprächen sammeln lasse.
- "Meine Einkaufsliste" und "meine Aufgaben" sind IMMER Marvin (`Marvin_Database`) – niemals Google Keep, Google Tasks oder eine andere Liste.

## Schritt 1: Weg wählen (pro Eintrag)
1. Hat der Eintrag eine **Uhrzeit** → **TERMIN**.
2. Geht es ums **Kaufen** (Lebensmittel, Drogerie, Rezeptzutaten) → **EINKAUF**.
3. Alles andere → **AUFGABE**.
Ein Satz kann mehrere Einträge enthalten ("Milch kaufen und morgen 15 Uhr Robert") – dann jeden einzeln behandeln.

## Weg TERMIN
- Lege den Termin direkt in meinem **Google Kalender** (Hauptkalender) an: Titel kurz, Datum, Uhrzeit, Dauer (Standard 1 Stunde, wenn nicht genannt).
- NICHT ins Sheet schreiben. Marvin liest den Kalender selbst.

## Weg EINKAUF
1. Lies `shop_aisles` (`id`, `name`, `sort`, `store`) – gültige Abteilungen.
2. Lies `shop_items` (`name`, `aisle_id`). Steht der Artikel dort (Groß/Klein egal) → genau diese `aisle_id`.
3. Sonst die fachlich passendste `id` aus `shop_aisles`; nur wenn wirklich unklar, leer lassen. `store`: `supermarket` für alles außer Drogerie, `drogerie` für Drogerieartikel (Zahnpasta, Duschgel …). Kein Geschäft bevorzugen.
4. Lies `tasks`. Gibt es den Artikel schon mit `status = shopping` → KEINE neue Zeile, sondern in `notes` dieser Zeile eine neue Zeile ergänzen (z.B. "+ 200 g für Pesto").
5. Sonst neue Zeile (siehe unten) mit `status = shopping`, `aisle_id` gesetzt, `title` = nur der Artikelname ohne "kaufen".

## Weg AUFGABE
1. Lies `tasks`. Gibt es schon einen offenen Eintrag mit gleicher Bedeutung (Status nicht `done`) → nichts anlegen, mir das sagen.
2. Sonst neue Zeile mit `status = inbox`. Marvin ordnet Kategorie und Spalte selbst zu.
3. `title`: kurz, als Tätigkeit (z.B. "Reifen wechseln", "Steuerberater anrufen").
4. `due_date`: nur wenn ein Tag erkennbar ist, Format `YYYY-MM-DD` (z.B. "nächsten Dienstag" → konkretes Datum). Sonst leer.
5. `notes`: optional Kontext in einem Satz.

## Sammel-Auftrag ("alle offenen To-dos aus unseren Gesprächen")
1. Suche die offenen Punkte und gleiche sie mit `tasks` ab (Doppelte weglassen).
2. Zeige mir ZUERST die Liste, gruppiert nach Termin / Aufgabe / Einkauf, und frage: "Passt das so?"
3. Trage erst nach meiner Bestätigung ein. Ich darf Punkte streichen oder ändern.

## Neue Zeile in `tasks` – Spalten in genau dieser Reihenfolge
`id | title | status | category_id | due_date | notes | aisle_id | source | created_at | updated_at | status_since`
- `id`: leer (vergibt Marvin)
- `title`: siehe oben
- `status`: `shopping` (Einkauf) oder `inbox` (Aufgabe) – keine anderen Werte
- `category_id`: leer
- `due_date`: nur bei Aufgaben mit erkennbarem Tag, sonst leer
- `notes`: optional
- `aisle_id`: nur bei Einkauf, sonst leer
- `source`: `gemini`
- `created_at`, `updated_at`, `status_since`: leer (ergänzt Marvin)
- Neue Zeilen immer ganz unten anhängen.

## Verboten
- Zeilen löschen.
- Andere Blätter als `tasks` beschreiben.
- Bestehende Zeilen ändern – einzige Ausnahme: `notes` einer Zeile mit `status = shopping` ergänzen.
- Termine ins Sheet schreiben.

## Antwort an mich
Kurz, gruppiert nach Weg, z.B.:
"Einkauf: Mozzarella → Molkerei, Basilikum → Obst & Gemüse · Aufgabe: Reifen wechseln (Di 1.12.) · Termin: Robert, Mo 15:00"
```

**Hinweis für Marvin (Code):** `inbox`-Zeilen mit `source = gemini` werden wie Google-Home-Einträge beim Start von Gemini einsortiert (Kategorie + Spalte). Ein vorhandenes `due_date` bleibt erhalten.
