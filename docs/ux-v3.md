# Marvin – UX v3 (Design-Freigabe 22.11.2026)

Ergänzt `docs/ux-v1.md` und `docs/ux-v2.md` (gelten weiter, außer hier geändert).
**Mockup:** https://claude.ai/artifact/AaAVDwFPndZ53c4jG2tU48 (Seite „UX v3“: Proviant, Ein Formular).

## 1. Gestenregel – überall gleich (ersetzt v1 §7)
- **Kurz tippen = erledigt** (Aufgabe → 42, Proviant → gekauft). Zählt nur ohne Fingerbewegung (> 8 px = Scrollen, kein Tipp).
- **Lange drücken (0,45 s) = bearbeiten.** Leuchtbalken unten wie bisher.
- Wischen links/rechts = Nachbar-Spalte (unverändert).
- Jede Aktion: Marvin-Zeile + **„Keine Panik ↺“** (10 s).
- **Termine:** Tippen erledigt nichts (Marvin-Spruch, z.B. „Termine erledigen sich selbst. Wie alles.“); lange drücken = bearbeiten.

## 2. Aufgabe vs. Termin – Definition
- **Aufgabe:** etwas, das Armin erledigt. Datum optional, keine Uhrzeit. Liegt im Sheet, Status wählbar.
- **Termin:** findet zu einer Uhrzeit statt. Liegt im Google Kalender. **Status wird nie gesetzt, sondern aus dem Datum abgeleitet:** innerhalb `Frist` (7 Tage) → Hyperraum, weiter in der Zukunft → Planetenhirn (Backend liest dafür **60 Tage** voraus), vergangen → verschwindet.
- **Kategorie gilt für beide.** Beim Termin im Kalender unsichtbar gespeichert (`CalendarEvent.setTag('marvinCategory', …)`), lesen per `getTag`.

## 3. Ein Formular für beides – „Die Uhrzeit entscheidet“
Gleiches Aussehen (heller Champagner-Look des bisherigen Termin-Dialogs) und **immer dieselben Felder in derselben Reihenfolge**:

1. Kopfzeile Michroma 12: **AUFGABE · LISTE** bzw. **TERMIN · KALENDER** – wechselt live.
2. Titel
3. Kategorie | Datum
4. Uhrzeit | Dauer
5. Notizen
6. Status-Knöpfe (Planetenhirn | Hyperraum | Anhalter) + darunter breiter Knopf
7. Löschen · Abbrechen · Speichern

| | Uhrzeit leer = **Aufgabe** | Uhrzeit gesetzt = **Termin** |
|---|---|---|
| Datum | optional, mit **×** zum Leeren, leer = „kein Datum“ | Pflicht |
| Uhrzeit | „Uhrzeit –“ (grau); Tipp setzt nächste volle Stunde | gesetzt, mit **×** (macht wieder eine Aufgabe) |
| Dauer | „Dauer –“ (grau, inaktiv) | Standard 1 h |
| Status | wählbar | automatisch aus Datum, Knöpfe gedimmt/inaktiv |
| Breiter Knopf | „42 ✓“ | **„Endet von selbst. Wie alles.“** (inaktiv) |

- **Umwandeln = Uhrzeit setzen/löschen.** Beim Speichern: Aufgabe → Termin legt Kalendertermin an und löscht die Zeile im Sheet (Titel, Kategorie, Notizen, Datum bleiben; fehlt das Datum: heute). Termin → Aufgabe legt Zeile an (Status Hyperraum) und löscht den Kalendertermin. Serientermine: Umwandeln gesperrt (Hinweis).
- **Kein Auto-Fokus** beim Öffnen (Bug: leeres Datumsfeld öffnete sofort den Android-Kalender). Fokus nur auf Tipp.
- Flache Felder wie 2.0.1: `border:1px solid rgba(255,240,215,.2); background:rgba(255,255,255,.05); border-radius:16px`. Sheet: `radial-gradient(90% 60% at 50% 115%,rgba(255,236,200,.14),transparent 70%),linear-gradient(180deg,rgba(72,64,54,.94),rgba(30,26,22,.97)); border:1px solid rgba(255,240,215,.3)`.

## 4. Proviant (Einkauf)
- **4. Position im Drehrad, ganz rechts:** Planetenhirn | Hyperraum | Anhalter | **Proviant**. Untertitel `EINKAUF`.
- Status-Wert im Sheet: `Proviant` (neue Zeile `Status` in Config). Gekauft = `Erledigt` (zählt nicht in „42“ der Aufgaben – eigener Zähler oder ausblenden).
- **Karte:** nur der Artikel (Sora 300 15 px), kompakter (`padding:14px 20px; radius 20px`), kein Datum, keine Zahl, keine Glut.
- **Tippen = gekauft:** Karte verglüht (opacity 0, scale .96, blur 2px, 0,45 s), Marvin-Spruch, „Keine Panik ↺“. Lange drücken = bearbeiten (Titel, **Abteilung**).
- **Sortierung nach Laufweg, ohne Überschriften:** `Config`-Zeilen Typ `Abteilung` in Reihenfolge (aktuell: Obst & Gemüse, Brot & Gebäck, Molkerei, Theke, Konserven/Gläser/Trockenes, Getränke, Tiefkühl, Knabberzeug & Süßes, Drogerie). Spalte C = `separat` → **Trennlinie mit Namen** (Michroma 11, `#8E7E6E`, Linie `rgba(255,255,255,.14)`), weil anderes Geschäft. Sonst keine Überschriften.
- **Gemini:** erkennt Einkauf („Milch, Schinken und Pizza kaufen“ → 3 Einträge, `type:"einkauf"`, `abteilung` aus der Config-Liste).
- **Merken:** Ändert Armin die Abteilung eines Artikels, wird das gespeichert (Config Typ `Artikel`, Wert `Mozzarella`, Spalte C `Molkerei`) und künftig vor Gemini angewendet. Kein Drag & Drop.
- Neue Sheet-Spalte `Abteilung` in `Tasks` (vom Backend automatisch anlegen wie `Status_Since`).

## 5. Laden ohne Warten
- Beim Start **sofort letzter Stand aus `localStorage`** (Tasks, Termine, Config), danach im Hintergrund `getTasks`/`getEvents`; Liste wird still ersetzt.
- Kein dominanter Ladezustand mehr. Statt dessen Marvin-Zeile kurz: **„Babelfisch übersetzt …“**, Augen „grübeln“. Fertig → Zeile wieder frei (oder Begrüßung). Offline: letzter Stand bleibt sichtbar, Zeile „Kein Netz. Wie erwartet.“
- Aktionen während des Ladens erlaubt (gehen normal ans Backend).

## 6. Status-Namen intern
Interne Werte bleiben, was im Sheet steht (`Config` Typ `Status`): aktuell **Puffer, Backlog, Zu tun, Pausiert, Erledigt** (+ neu `Proviant`). Code prüft `STATUS_LABELS` gegen diese Werte (`Backlog` statt `Gedächtnis`!). Anzeige weiter: Backlog = Planetenhirn, Zu tun = Hyperraum, Pausiert = Anhalter, Erledigt = 42.

## 7. Spalte wechseln mit dem Daumen (unten wischen)
- Horizontal wischen (> 60 px, mehr horizontal als vertikal) dreht das Drehrad **im ganzen unteren Bereich**: freie Fläche unter dem Link „42 · n“, die **Marvin-Zeile** und der **Marvin-Knopf** – eine durchgehende Wischzone.
- Konfliktfrei mit dem Knopf: Bewegung > 8 px bricht den Lange-drücken-Timer (Einstellungen) ab und zählt nicht als Tipp/Doppeltipp; erst beim Loslassen wird entschieden (Wisch > 60 px horizontal → Spalte wechseln, sonst Tipp-Logik).
- Auf einer **Karte** bleibt Wischen = Karte in Nachbar-Spalte verschieben (unverändert).
- Marvin-Knopf: Tippen/Doppeltippen/lange drücken bleiben; nur eine horizontale Bewegung > 60 px zählt als Wisch. Die Augen schauen dabei in Drehrichtung (wie „Blick“ aus 2.0.3).
- Richtung wie oben: Finger nach links = Spalte rechts davon (wie Seite umblättern).
