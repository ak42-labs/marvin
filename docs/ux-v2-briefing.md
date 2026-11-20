# Marvin – Briefing für UX v2 (Stand App 1.1.0, 20.11.2026)

Übergabe an den Design-Chat. Grundlage: `docs/ux-v1.md` (umgesetzt) + Mockup https://claude.ai/artifact/AaAVDwFPndZ53c4jG2tU48.
Funktional ist Marvin weitgehend fertig. v2 = **Usability & Design: lockerer, mehr Raum, mehr Charakter.**

## Was steht (Ist-Zustand, live am Handy)

- **Ein Screen:** Drehrad oben (Planetenhirn | Hyperraum | Anhalter, wischbar), Statuszeile (Untertitel + Anzahl), Kartenliste, Link „42 · n“ (Erledigte), Marvin-Zeile (Schreibmaschinen-Text + „rückgängig“ für 10 s), Marvin-Knopf mit Augen.
- **Material:** Amber-Glas überall gleich (Drehrad, Karten, Knopf) – Michroma + Sora.
- **Karten:** Titel + rechts eine Zahl. Aufgaben: `+N` = drüber (überfällig / länger als 7 Tage im Hyperraum), `0` heute, `−1` morgen, `−N` später. Glut: hot / warm / normal.
- **Termine (neu):** aus dem Google-Hauptkalender, nächste 7 Tage, als Karten im Hyperraum zwischen den Aufgaben. Statt Zahl Klartext: `heute 14:00`, `morgen 14:00`, `Di 16:00`. Heute glüht, morgen warm. Optisch bisher kaum von Aufgaben unterscheidbar (nur leicht hellere Kante).
- **Gesten:** Tippen = Bearbeiten · Wischen links/rechts = Nachbar-Spalte („wie Tinder“) · lange drücken = 42.
- **Bearbeiten-Dialog:** oben angedockt (Tastatur unten), Aufgaben: Titel, Kategorie, Datum, Notizen, Status-Knöpfe · Termine: Titel, Datum, Uhrzeit, Dauer, Notizen. **Noch im vorläufigen Look.**
- **Marvins Gesicht (Augen im Knopf):**
  - Zustände: dösen (pulsiert), zuhören (hebt sich), grübeln (wandert), sprechen (flackert).
  - Situativ: Termin heute → besorgte Brauen (B3) · ≥3 glühende Aufgaben → Skeptiker, ein Auge halb zu (D3) · 5. Verschieben derselben Aufgabe → hängende Augen (B2) + eigener Spruch.
  - Wartemodus alle 10–20 s zufällig: Augenrollen, Blinzeln, Umschauen, Seufzen mit schweren Lidern (D1).
- **Sprüche:** je Situation 6–14 Sätze (Begrüßung, Erledigt, Verschoben, Rückgängig, Gelöscht, Dauerverschieber), keine direkte Wiederholung. Gemini-Kommentare bei neuen Einträgen. Optional Sprachausgabe (tiefe, langsame Browser-Stimme).
- **App-Icon:** Armins Entwurf – Augen über der Mitte, weiße LED oben rechts.

## Was Armin auffällt / wünscht

1. **Alles klebt aufeinander.** Ursprüngliche Idee: Raum wirken lassen. Mehr Luft zwischen Drehrad, Statuszeile, Karten, Marvin-Zeile, Knopf.
2. **„Einheitspreis“ farblich.** Drehrad und Karten sehen gleich aus – Menü und Inhalt sollen sich unterscheiden.
3. **Farben je Art?** Aufgabe vs. Termin (evtl. weitere Arten) unterscheidbar machen – Farbe, Glas-Tönung, Form oder Symbol.
4. **Bearbeiten-Dialog** im neuen Look (ux-v1 §10, offen).
5. **Marvin als Figur ausbauen – das Spielkind:** Die Augen sollen sich stärker verändern und im Leerlauf „Dummheiten“ machen, z.B.:
   - ein Arkanoid-/Pong-Ball, der durch den Knopf fetzt und von den Augen abprallt,
   - Augen, die einschlafen (Zzz), schielen, einander anschauen, sich langweilen, auf die Uhr schauen,
   - Reaktionen auf Ereignisse (Erledigt → kurzes Aufleuchten / Sternchen, Löschen → erschrocken, viel Überfälliges → Kopfschütteln).
   - Frage dazu: Wie oft? Wann nervt es? Abschaltbar?
6. **Soll Marvin bei jeder Aktion sprechen?** (Text + optional Stimme) – oder nur manchmal / nur bei Wichtigem.

## Leitplanken (damit es umsetzbar bleibt)

- Reines HTML/CSS/JS + SVG, kein Framework, kein Build, GitHub Pages. Animationen per CSS-Keyframes oder kleinem JS (requestAnimationFrame ok).
- Android/Chrome primär, Akku schonen: Leerlauf-Animationen kurz und selten, nicht dauerhaft rechnen; `prefers-reduced-motion` respektieren.
- Ein Screen, keine Menüs. Touch-Ziele groß. Tastatur darf Bearbeiten nicht verdecken.
- Marvin-Knopf: 100 px hoch, volle Breite, Augen-SVG 170 × 64 (viewBox) – Spielfeld für Animationen.
- Ergebnis bitte wie bei v1 als **`docs/ux-v2.md`**: Entscheidungen, Maße, Farben/CSS, Augen-Varianten (SVG-Pfade), Animationsbeschreibung, gern mit Mockup-Link. Umsetzung erfolgt im Claude-Code-Chat.
