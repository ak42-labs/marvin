# Marvin – UX v4: Augenwelten (Teil 1: runde Welt, freigegeben 26.11.2026)

Mockup: https://claude.ai/artifact/AaAVDwFPndZ53c4jG2tU48 → Seite „UX v3.1“ → „v3.1 Fließende Augen-Abläufe“ (Quelltext = Referenz für Timings).
Zwei Augenwelten: **rund** (Standard, dieses Dokument) und **Pixel/Arcade** (Teil 2, folgt). Ersetzt die harten Formwechsel aus `ux-v2.md` §7 für die runde Welt.

## Prinzip: eine Kurve, die sich verwandelt
Jedes Auge = **ein Pfad mit fester Struktur** `M-23 a Q0 b 23 a` + **eine Pupille** (`circle cx=0 cy=11 r=5 fill #FFF3E6`). Formen unterscheiden sich nur in Zahlen → per CSS `transition: d …` (Pfad über `style="d:path('…')"` setzen, nicht über das Attribut) fließen sie ineinander. Augen-Gruppe zusätzlich vertikal verschiebbar (`translateY`, eigene Transition).

| Form | Pfad | Strich |
|---|---|---|
| OPEN (Bogen, Ruhe) | `M-23 8 Q0 -10 23 8` | 7 |
| LID (Lid über Pupille) | `M-23 2 Q0 -12 23 2` | 5 |
| HALF (Schlafzimmerblick) | `M-23 5 Q0 0 23 5` | 6 |
| ANNOY (genervt) | `M-23 3 Q0 -4 23 3` | 5 |
| SHUT (Lid zu, über Pupille) | `M-23 9 Q0 13 23 9` | 6 |
| CLOSED (schläft) | `M-23 4 Q0 16 23 4` | 7 |

Transitions: Lid `d .9s cubic-bezier(.45,.05,.25,1)` (je Schritt überschreibbar), Pupille `transform .9s` + `opacity .5s`, Augen-Gruppe `transform 1.2s`. Pupille beim Blick nach unten `scale(1.15)` (wirkt wie „Augen aufreißen“).

## Abläufe
- **Aufwachen (App-Start):** Start sofort in CLOSED, Augen 7 px tiefer → HALF + heben sich (1,5 s) → LID, Pupille erscheint, Blick unten → oben → links oben → rechts oben → geradeaus (je ~1,3 s) → Pupille weg → HALF (Schlafzimmerblick) bzw. OPEN.
- **Neugier:** spontane Blicksprünge (Pupille 0,2 s schnell), dazwischen zufällige Pausen 0,3–1,6 s, 8 Ziele aus {links, rechts, oben, links/rechts oben, links/rechts unten, Mitte}, nie zweimal dasselbe hintereinander, 25 % „zweiter Blick“ (kurz halb zurück). Jedes Mal neu zufällig. Später optional: Blick folgt der Neigung.
- **Augenrollen:** LID → ANNOY (Lider senken sich genervt), Pupille links oben → **Halbbogen über oben** nach rechts (10 Schritte à 110 ms, Radius 8 × 3,5) → Mitte → „Seufzer“: HALF, Augen 2 px tiefer → OPEN.
- **Blinzeln (einmal):** LID mit Pupille → SHUT (0,13 s, Pupille blendet in 0,08 s aus) → LID (0,16 s, Pupille wieder da).
- **Einschlafen:** OPEN → HALF, Augen sinken 3 px (1,6–1,8 s) → CLOSED, Augen 7 px tiefer, Schnarchen: Augen atmen ±2,5 px (2,6 s), drei Z (10/13/16) steigen zwischen den Augen auf.

Tempo: lieber gemächlich – Marvin ist nicht der Schnellste.

---

# Teil 2 – Arcade-Welt (Pixel)

Referenz: Mockup-Karte „Arcade-Augen“ (Seite UX v3.1), Datei `V31Arcade.dc.html` – Timings/Keyframes dort 1:1 übernehmen.

## Grundlagen
- Augen = 2 × 6 Blöcke 8×8 px (amber `#FFB25C`, Glow `drop-shadow(0 0 5px #FF9A3C)`), `shape-rendering: crispEdges`, Bewegung nur in harten Schritten (`steps()`).
- Schrift: Press Start 2P. Texte im Glas **unter den Augen**, alle gleich (16 px, blinkend). Keine Texte unter dem Glas.
- **Röhrenstreifen (Scanlines) nur bei Schriftzug-Momenten:** Röhre an, Game Over, Extra Life. Alle anderen ohne.
- **Ton:** eigene 8-Bit-Piepser (WebAudio, Square/Triangle, leise). Hängt an der Einstellung „Marvin spricht“ (an = Piepser, aus = still). Häufigkeit über den Gag-Schalter (ux-v3.1).
- Pixel-Text mit wechselndem Inhalt als HTML-Ebene über dem SVG (nicht SVG-`<text>`).

## Animationen
- **Röhre an:** Bild klappt aus einer Linie auf (CRT), Sägezahn-Anstieg, dann „PRESS START“ blinkt + Start-Jingle (Tonleiter + heller Doppelton).
- **Blockregen:** ~45 Tropfen fallen verstreut ca. 3,5 s über das ganze Glas durch; die Augen-Pixel fallen senkrecht zu zufälligen Zeitpunkten und bleiben an ihrem Platz stecken.
- **La-Ola:** eine einzige Animation je Pixel (3,3 s, 3 Wellen, Versatz 0,08 s je Pixel, über beide Augen). Welle 1 hebt aus dem Bogen und landet auf einer leicht zufällig versetzten Linie (±2 px), Welle 2 läuft auf der Linie, Welle 3 landet jeder Pixel wieder an seinem Bogenplatz. Keine Pause, kein Umschalten dazwischen.
- **Snake + 42:** Beide Augen bekommen Pupillen (6×6, beige). Schlange auf 6-px-Raster (Pupillen liegen auf dem Raster!), fährt nie durch Augen-Pixel und nie auf sich selbst zurück. Weg (Start links, zufällig gespiegelt von rechts): oben rein → Ecke runter → Ecke zur unteren Zeile → von unten zur 1. Pupille (frisst, Ton, +3 Länge) → Haken raus → zwischen den Augen hoch → oben über das andere Auge → außen runter → von unten zur 2. Pupille (frisst, +42 steigt auf, Fanfare) → Haken raus → unten aus dem Bild.
- **Game Over:** Augen → X, Pixel fallen einzeln gestaffelt lang nach unten raus (vor dem Schriftzug), absteigende Töne, „GAME OVER“ blinkt.
- **Zwinkern:** ein Auge klappt zur Linie, kurzer Doppelpiep. Für freche Sprüche.
- **Extra Life:** Augen werden zu Pixel-Herzen, jedes schlägt aus seiner Mitte (3×), weicher Herzschlag-Ton, „EXTRA LIFE“. Anlass: Hyperraum leer.
- **Loading:** Rahmen-Balken mit Blöcken, „LOADING...“ darüber, Prozent direkt darunter. Zählt hoch, bleibt bei 42 % hängen: „42%“ allein (~0,9 s) → „42% HÄNGT…“ → „42% IMMER NOCH“ → „42% WIE ERWARTET“ → 100 %. Anlass: Abgleich/Sync (Texte: `ux-v3.1.md` §2, Deep Thought).

# Teil 3 – Ablauf beider Welten (Autopilot)

Referenz: Mockup-Karte „Autopilot: beide Welten“ (`V4Autopilot.dc.html`). Dort zählen **nur Ablauf und Tore**. Die runden Bewegungen in der Demo sind vereinfacht (Pupillen wandern z. B. über die Brauen) – verbindlich bleiben die runden Abläufe aus Teil 1 (`V31Augen.dc.html`), die Pixel-Abläufe aus Teil 2 (`V31Arcade.dc.html`).

- **App-Start:** immer Aufwachen (rund, aus geschlossenen Augen).
- **Phasen statt Hin und Her:** rund 3–5 Gags, Pixel 2–3 Gags, dazwischen 1,5–3 s Ruhe. Gags zufällig, nie zweimal derselbe hintereinander.
- **Gemeinsame Pose „Bogen offen“** (runde Augen ohne Pupille = Pixel-Bogen): nur aus dieser Pose wird gewechselt. Alle Gags enden dort.
- **Tore rund → Pixel** (zufällig, nie zweimal dasselbe):
  - Verwandlung: runder Bogen blendet in Stufen aus, Pixel-Bogen baut sich Block für Block auf (~1,4 s).
  - Blick nach oben → Blockregen.
  - Augen zur Linie → Röhre an.
  - Snake: runde Augen mit Pupillen (geradeaus) verwandeln sich in Pixel-Augen **mit** Pixel-Pupillen, kurze Pause (~1 s), dann startet die Schlange.
- **Tore Pixel → rund:** Verwandlung zurück · Game Over → Aufwachen.
- **Ereignisse haben Vorrang** (unterbrechen den Gag, falls nötig über „Verwandlung“ kurz in die passende Welt und danach zurück):
  - Sync → Loading (Pixel).
  - Erledigt → La-Ola oder Extra Life (Pixel).
  - Verschoben → Augenrollen (rund).

## Später
Space Invaders (evtl. ganzer Bildschirm, Karten als Invaders), Lunar Lander, Defender.
