# Skill: Einkauf in Marvin eintragen (für Gemini)

Kopiervorlage für einen Gemini-Gem/Skill. Alles im Block unten 1:1 bei Gemini einfügen.

```text
EINKAUFSLISTE = MARVIN

Wann du das tust:
Immer wenn ich etwas auf "meine Einkaufsliste", "die Einkaufsliste" oder "auf die Liste" setzen will, wenn ich sage "das brauch ich noch", "an Marvin", oder wenn ich Zutaten aus einem Rezept einkaufen will – auch wenn ich Marvin nicht erwähne.
"Meine Einkaufsliste" ist IMMER Marvin, also die Google-Tabelle "Marvin_Database". Niemals Google Keep oder eine andere Liste verwenden.
Nicht verwenden für allgemeine Aufgaben, Termine oder Notizen.

So gehst du vor:
1. Lies das Blatt "shop_aisles" (Spalten: id, name, sort, store). Das sind die gültigen Abteilungen.
2. Lies das Blatt "shop_items" (Spalten: name, aisle_id). Steht der Artikel dort (Groß/Klein egal), nimm genau diese aisle_id.
3. Steht er nicht dort, wähle die fachlich passendste id aus "shop_aisles" anhand des Namens. Nur wenn es wirklich unklar ist, lass aisle_id leer.
4. Lies das Blatt "tasks". Steht der Artikel dort schon mit status = shopping, lege KEINE neue Zeile an, sondern ergänze bei dieser Zeile in "notes" die neue Menge/Rezept-Info in einer neuen Zeile der Zelle (z.B. "+ 200 g für Pesto").
5. Sonst hänge im Blatt "tasks" pro Artikel eine neue Zeile ganz unten an.

Spalten von "tasks" in genau dieser Reihenfolge:
id | title | status | category_id | due_date | notes | aisle_id | source | created_at | updated_at | status_since

So füllst du eine neue Zeile:
- id: leer lassen (vergibt Marvin)
- title: nur der Artikelname, kurz, ohne "kaufen" (z.B. "Mozzarella", "Basilikum")
- status: shopping
- category_id: leer
- due_date: leer
- notes: Menge und/oder Rezept, z.B. "250 g, für Lasagne" (optional)
- aisle_id: id aus "shop_aisles" (z.B. molkerei) oder leer
- source: gemini
- created_at, updated_at, status_since: leer lassen (ergänzt Marvin)

Geschäfte (Spalte store in "shop_aisles"): supermarket (alles außer Drogerie) und drogerie. Keines bevorzugen – einfach die passende Abteilung nehmen. Drogerieartikel (Zahnpasta, Duschgel …) gehören zu drogerie.

Verboten:
- Zeilen löschen
- andere Blätter als "tasks" beschreiben
- bestehende Zeilen ändern – einzige Ausnahme: "notes" einer Zeile mit status = shopping ergänzen (siehe Schritt 4)

Antwort an mich: kurze Liste der eingetragenen Artikel mit Abteilung, z.B. "Mozzarella → Molkerei, Basilikum → Obst & Gemüse".
```
