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
