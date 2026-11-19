# Marvin – UX-Briefing (Stand App 0.4.0, 19.11.2026)

Kontext für die Design-/Usability-Diskussion. Technische Details: `CLAUDE.md`.

## Was Marvin ist
Persönliche Task-App (nur für Armin), primär **Android/Chrome als installierte PWA**, sekundär Mac-Browser.
Eingabe fast ausschließlich per **Sprache**; eine KI (Gemini) macht daraus Aufgaben.
Persönlichkeit: **Marvin aus „Per Anhalter durch die Galaxis“** – depressiv, zynisch, hyperintelligent, unterfordert. Kommentiert jede Aktion mit genau einem kurzen Satz.
Design-Vorgabe bisher: **„Liquid Glass / Duplo“** – tiefes Schwarz, Milchglas-Flächen (Blur), sehr starke Rundungen, große Touch-Flächen. **KISS**: keine Menüs, keine Formulare zur Eingabe.

## Bildschirme & Elemente

### 1. Hauptansicht (einziger Screen)
Von oben nach unten:
- **Tab-Leiste** (Segment-Control): `Gedächtnis` | `Zu tun` | `Pausiert`. Start auf „Zu tun“.
- **Puffer-Hinweis** (nur sichtbar, wenn nötig, klein, grau): „Marvin sortiert 3 Einträge aus dem Puffer…“
- **Task-Karten** (Glas-Kacheln): Titel groß, darunter links Kategorie, rechts Fälligkeitsdatum. Antippen → Bearbeiten.
- **Leerer Zustand:** „Leer. Marvin ist fast beeindruckt.“
- **Link am Listenende** (klein, grau): „✓ Erledigt (n)“ → zeigt erledigte Tasks, dann „← zurück“.
- **Debug-Protokoll** (nur wenn in Einstellungen aktiv).
- **Toast** über dem Button: Marvins Kommentar, 15 s sichtbar, Antippen schließt.
- **Live-Transkript** über dem Button (kursiv, während gesprochen wird).
- **Marvin-Button** (unten, volle Breite, dominant, 🎙️ „Marvin“):
  - Tippen → hört zu (Button rot pulsierend, „Hört zu…“) → endet bei Stille → „Denkt nach…“ → Task erscheint.
  - Lange drücken (Mac: Rechtsklick) → Einstellungen.

### 2. Bearbeiten (Fenster oben angedockt, Tastatur hat unten Platz)
- Titel (groß, Textfeld), Kategorie (Dropdown), Datum (Datumsfeld), Notizen (enthält u.a. den Originalsatz).
- Status-Buttons: `Gedächtnis` `Zu tun` `Pausiert` (eine Reihe), darunter `Erledigt ✓` (volle Breite, grün wenn gewählt). Auswahl = blau.
- Aktionen: `Löschen` (rot, mit Rückfrage) · `Abbrechen` · `Speichern`.

### 3. Einstellungen (selten gebraucht, bewusst versteckt)
Gemini-API-Key, Backend-Token, ☐ „Marvin spricht“ (Kommentare per Sprachausgabe, tiefe langsame Stimme), ☐ Debug-Modus, App-Version.

## Datenmodell (für die Namensdiskussion)
- **Status:** Puffer (unsichtbarer Eingang für Google Home), Gedächtnis, Zu tun, Pausiert, Erledigt.
  Geplant: Anzeigenamen frei wählbar (z.B. Gedächtnis → „Backlog“), intern bleibt der Wert gleich.
- **Kategorien:** frei im Google Sheet pflegbar (aktuell PV & Klima, Gesundheit, Wohnung, Finanzen, Einkaufen, Allerlei).
- **Eingangswege:** Sprache in der App · „Hey Google, erinnere mich …“ (Google Home/Gemini → Google Tasks → Marvin sortiert automatisch ein).

## Alle Texte, die Marvin/die App sagt (fest eingebaut)
- Laden: „Marvin holt die Daten...“
- Offline: „Marvin ist offline (Netzwerkfehler).“
- Ladefehler: „Fehler beim Laden der Daten. Antippen für Einstellungen.“
- Leer: „Leer. Marvin ist fast beeindruckt.“
- Erledigt: „Erledigt. Das Universum hat es nicht bemerkt.“
- Puffer fertig: „n Einträge aus dem Puffer einsortiert. Niemand hat sich bedankt.“
- Kein Mikrofon: „Kein Mikrofonzugriff. Wie erwartet.“
- KI-Fehler: „Marvin versteht nicht. …“ / „Gemini ist überlastet. Selbst die Maschinen sind erschöpft.“
- Ohne Mikrofon-API: „Kein Mikrofon verfügbar. Dann eben tippen:“
- Dazu: **dynamische Kommentare** von Gemini zu jeder neuen Aufgabe (z.B. „Mehr Code, den sowieso keiner braucht.“).

## Bekannte Schwächen / offene UX-Fragen
1. Status-Namen: lustiger/marvin-hafter? („Gedächtnis“ wurde schon als „Backlog“ angedacht.)
2. Look & Feel: Wie „Marvin“ soll die App aussehen? (Farben, Icon – aktuell ein trauriges Roboter-Gesicht, Animationen, Button-Zustände.)
3. Wie präsent soll Erledigt sein? (aktuell bewusst dezent)
4. Gehört eine Einkaufsliste in Marvin? (Google-Home-Einkaufsliste landet in Google Keep, nicht erreichbar; Alternative Bring!)
5. Kein Undo direkt nach dem Anlegen (nur über Bearbeiten → Löschen).
6. Sortierung der Karten (aktuell Reihenfolge im Sheet – nach Datum? Fälliges hervorheben?).
7. Sprachausgabe: Stimme ist Browser-Standard; bessere „depressive“ Stimme denkbar.
8. Puffer-Einsortierung dauert pro Eintrag einige Sekunden (Beschleunigung geplant).

## Technische Leitplanken für Vorschläge
- Reines HTML/CSS/JS, kein Framework, kein Build. Läuft auf GitHub Pages.
- Mobile-first, dunkel, große Touch-Ziele, Tastatur darf Bearbeiten nicht verdecken.
- Ergebnisse bitte als Entscheidungen/Skizzen/Farbwerte/Texte zurückbringen – Umsetzung erfolgt im Claude-Code-Chat.
