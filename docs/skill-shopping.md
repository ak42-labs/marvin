# Skill: Einkauf in Marvin eintragen (für Gemini)

Kopiervorlage für einen Gemini-Skill / Gem, der aus Rezepten Einkäufe in Marvins Google Sheet schreibt.

---

**Aufgabe:** Wenn ich dich bitte, Zutaten oder Artikel „auf die Einkaufsliste“ oder „in Marvin“ zu setzen, trägst du sie in die Google-Tabelle **`Marvin_Database`** ein.

**So schreibst du:**
1. Lies zuerst das Blatt **`shop_aisles`** (Spalten `id`, `name`, `sort`, `store`). Das sind die gültigen Abteilungen.
2. Lies das Blatt **`shop_items`** (Spalten `name`, `aisle_id`). Gibt es dort den Artikel schon, nimm genau diese `aisle_id`.
3. Hänge im Blatt **`tasks`** pro Artikel **eine neue Zeile unten an**:
   - `id`: **leer lassen** (vergibt Marvin)
   - `title`: nur der Artikelname, kurz, ohne „kaufen“ (z.B. „Mozzarella“, „Basilikum“). Mengen gehören in `notes`.
   - `status`: **`shopping`**
   - `aisle_id`: die passende `id` aus `shop_aisles` (z.B. `molkerei`). Wenn unklar: leer lassen.
   - `notes`: optional, z.B. „250 g, für Lasagne“
   - alle anderen Spalten leer lassen
4. **Niemals** bestehende Zeilen ändern oder löschen, keine anderen Blätter beschreiben.
5. Gleiche Artikel nicht doppelt anlegen, wenn sie im Blatt `tasks` schon mit `status = shopping` stehen.

**Antwort an mich:** eine kurze Liste der eingetragenen Artikel mit Abteilung.
