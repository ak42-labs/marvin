# Marvin – UX v3.1 (Alltags-Feinschliff, freigegeben 26.11.2026)

Ergänzt `docs/ux-v3.md`. Grundsatz: **Transparenz** – es muss immer klar sein, was gerade passiert oder eben nicht.

## 1. Spracheingabe
- Ende nach **1,5 s Stille** (bisher 2 s). 5 s bis zum ersten Wort bleiben.
- **Tippen auf Marvin während des Zuhörens beendet sofort** und schickt ab.

## 2. Aktualisieren (Ziehen + beim Öffnen)
- **Liste oben nach unten ziehen** (eigene Geste, da die installierte PWA keine hat): oben erscheint ein kleiner Amber-Ring, füllt sich mit dem Zug (Auslöse-Schwelle ~70 px), Loslassen startet den Abgleich. Augen schauen nach oben. Nur auslösen, wenn die Liste ganz oben steht.
- **Marvin-Zeile während des Abgleichs:** „Babelfisch übersetzt …“ (Augen „grübeln“).
- **Abschluss eindeutig:** „Alles übersetzt! Ich weiß jetzt alles. Leider.“ (2 s), dann Zeile frei.
- **Fehlschlag:** „Natürlich kein Netz.“ – bleibt stehen, bis der nächste Versuch klappt.
- **Datenalter sichtbar, relativ (wie `−3` bei Aufgaben):** Statuszeile rechts klein, größte Einheit zuerst, Null-Einheiten weglassen: `STAND 3M` · `STAND 2H 15M` · `STAND 1T 12H 3M` · `STAND 23T 4H` – solange die Daten aus dem Speicher kommen oder der letzte Abgleich fehlschlug (beim Öffnen sofort sichtbar). Nach erfolgreichem Abgleich verschwindet es (wieder Anzahl). Keine Uhrzeit/kein Datum.
- Beim Öffnen gleicher Ablauf automatisch (Cache sofort, dann Abgleich).

## 3. Schlechtes Netz abfedern
- **Nie blockieren:** jede Aktion wirkt sofort lokal.
- **Warteschlange:** Abhaken, Verschieben, Anlegen, Bearbeiten werden im Speicher gemerkt (`localStorage`) und gesendet, sobald Netz da ist; Wiederholung mit wachsendem Abstand.
- **Zeitlimit:** Abgleich bricht nach ~8 s ohne Antwort ab → Fehlschlag-Anzeige (§2), letzter Stand bleibt.
- **Sichtbar:** Statuszeile `⟳ 2`, solange 2 Aktionen auf Netz warten (dezent pulsierend). Beim ersten Eintrag in die Warteschlange einmal Marvin-Zeile: „Und wieder mal warten …“ Wenn alles raus ist: Symbol weg.
- **Sprache ohne Netz:** der erkannte Text wird gemerkt („Gemerkt. Ich kümmere mich, wenn die Welt wieder online ist.“) und bei Netz an Gemini geschickt.
- Konflikte: beim Abgleich gewinnt die neuere Änderung (`updated_at`).

## 4. Weniger Gags (Vorführmodus aus)
- Leerlauf-Gags: erster nach **8–12 s**, dann alle **15–25 s**.
- Sprechregeln wieder nach `ux-v2.md` §6: **Verschieben nur Text, keine Stimme.** Stimme nur bei Anlegen, Löschen, Erledigt, Dauerverschieber.

## 5. Einstellungen neu ordnen (Mockup Seite „UX v3.1“ → „Einstellungen + Schlüssel“)
- Oben: **Marvin spricht** (an/aus) · **Spaß-Modus** (an/aus) · App-Version.
- **Schlüssel** nicht mehr offen im Dialog, sondern hinter einem eigenen Knopf **„🔑 Schlüssel“** → eigener kleiner Dialog:
  - Gemini-Key und Backend-Token **maskiert** (`••••••3f9a`, nur letzte 4 Zeichen).
  - Ändern nur per Knopf „Ändern“ je Feld → leeres Eingabefeld → Speichern. Leeres Feld speichert **nie** (Schlüssel kann nicht versehentlich gelöscht werden).
- Debug-Modus ganz unten, klein.

## 6. Kategorien (im Sheet bereits erledigt, 26.11.)
- `categories` jetzt alphabetisch: Allerlei, Einkaufen, Finanzen, Gesundheit, Wohnung (`sort` 1–5).
- `verschiedenes` → `allerlei`, `pv_klima` → `wohnung` in `tasks` umgehängt; beide Kategorien gelöscht.
- Code: leere Zeilen in `categories` ignorieren; Gemini-Prompt nimmt die Liste aus dem Sheet (keine fest eingebauten Kategorien).

## 7. Bug
- **Datumsfeld im Formular (Detailansicht):** Jahr abgeschnitten („…2“ statt „2026“). Ursache vermutlich: der ×-Knopf (Datum leeren) liegt über dem Text – Overflow/Containergröße. Platz ist da: Feld bekommt `padding-right` in Breite des ×-Knopfs, × absolut am rechten Rand, Text nie darunter.

## 8. Spaß-Modus = Gag-Schalter
- **Spaß-Modus** = Gag-Schalter. **Aus:** keine Leerlauf-Gags, keine Spiele/Easter Eggs. **Bleibt:** Grundzustände (dösen, zuhören, grübeln, sprechen) und Reaktionen auf Aktionen (Erledigt-Sterne, Gelöscht-X, Schock/Böse) – die sind Rückmeldung, kein Gag.
- **Marvin spricht** = nur die Stimme. Aus: Sprüche stehen weiter als Text in der Marvin-Zeile.
