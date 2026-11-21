# Marvin – UX v2 (Design-Freigabe 21.11.2026)

Baut auf `docs/ux-v1.md` auf: alles dort gilt weiter, außer es wird hier geändert. Löst `docs/ux-v2-briefing.md` ab.
**Mockup:** https://claude.ai/artifact/AaAVDwFPndZ53c4jG2tU48 (Seite „UX v2“: Hauptansicht, Bearbeiten, Augen-Galerie).

Leitidee v2: **mehr Raum, klare Hierarchie, Marvin als Spielkind.** KISS bleibt.

---

## 1. Raum (8er-Raster)

| Stelle | Wert |
|---|---|
| Seitenrand links/rechts | 20 px (oben/unten 24) |
| Drehrad → Statuszeile | 24 |
| Statuszeile → erste Karte | 12 |
| Zwischen Karten | 14 |
| Karten-Innenabstand | 18 × 22 |
| Liste → Marvin-Zeile | 16 |
| Marvin-Zeile → Knopf | 20 |

Großzügig ist gewollt – lieber weniger Karten pro Screen.

## 2. Hierarchie: Amber = Steuerung

- **Amber-Glas** (unverändert aus v1) **nur** für Drehrad und Marvin-Knopf.
- **Karten = neutrales Rauchglas**, Glut nur bei Dringlichkeit:

```css
.card{border-radius:24px;padding:18px 22px;
  background:linear-gradient(180deg,rgba(255,255,255,.075) 0%,rgba(255,255,255,.03) 55%,rgba(255,255,255,.015) 100%);
  box-shadow:inset 0 1px 0 rgba(255,255,255,.32),inset 0 8px 14px -10px rgba(255,255,255,.2),0 10px 22px rgba(0,0,0,.45)}
.card::before{/* Lichtkante wie v1, padding 1.3px */
  background:linear-gradient(180deg,rgba(255,255,255,.55) 0%,rgba(255,255,255,.1) 25%,rgba(255,255,255,.03) 70%,rgba(255,255,255,.14) 100%)}
.card::after{/* Spiegelung wie v1, alpha .13 */}
.card.hot{background:radial-gradient(75% 100% at 50% 128%,rgba(255,150,50,.85) 0%,rgba(240,100,25,.45) 35%,rgba(140,50,15,.12) 65%,transparent 85%),
    linear-gradient(180deg,rgba(255,255,255,.07),rgba(255,255,255,.015));
  box-shadow:inset 0 1px 0 rgba(255,255,255,.5),0 10px 26px rgba(0,0,0,.5),0 0 24px rgba(255,120,30,.2)}
.card.hot::before{background:linear-gradient(180deg,rgba(255,255,255,.8),rgba(255,255,255,.12) 25%,rgba(255,190,120,.5) 90%,rgba(255,220,170,.85))}
.card.warm{background:radial-gradient(70% 95% at 50% 130%,rgba(255,150,50,.45) 0%,rgba(220,90,20,.18) 40%,transparent 75%),
    linear-gradient(180deg,rgba(255,255,255,.07),rgba(255,255,255,.015))}
```

## 3. Dringlichkeit mit Deckel

**Heute = drüber = Maximum.** Es gibt nichts Dringlicheres als „heute“.

| Fall | Klasse | Zahl |
|---|---|---|
| Fällig heute | `hot` | `0` |
| Überfällig (egal wie lange) | `hot` | `+N` (Info, steigert nichts) |
| >Frist im Hyperraum | `hot` | `+N` |
| Morgen | `warm` | `−1` |
| Später | – | `−N` |
| Ohne Datum | – | – |

Zahlfarben: hot `#FFE6C8`, warm `#FFCB94`, normal `#A39383`.

## 4. Termine: Champagner

Termine bekommen statt Amber ein **warmweißes Champagner-Glühen** (Variante A im Mockup). Text rechts bleibt Klartext (`heute 15:00`, `Mo 12:30`) in Michroma 12, Farbe `#FFF3DC`.

```css
.card.ev{background:radial-gradient(75% 100% at 50% 128%,rgba(255,236,200,.22) 0%,rgba(255,225,180,.07) 45%,transparent 80%),
    linear-gradient(180deg,rgba(255,250,240,.09),rgba(255,255,255,.02))}
.card.ev::before{background:linear-gradient(180deg,rgba(255,252,240,.9),rgba(255,245,225,.15) 25%,rgba(255,240,210,.05) 70%,rgba(255,236,200,.5))}
.card.ev.hot{ /* heute */ background:radial-gradient(75% 100% at 50% 128%,rgba(255,238,205,.6) 0%,rgba(255,225,180,.22) 40%,transparent 80%),
    linear-gradient(180deg,rgba(255,250,240,.1),rgba(255,255,255,.02));
  box-shadow:inset 0 1px 0 rgba(255,255,255,.6),0 10px 26px rgba(0,0,0,.5),0 0 24px rgba(255,236,200,.18)}
.card.ev.warm{ /* morgen */ background:radial-gradient(75% 100% at 50% 128%,rgba(255,238,205,.38) 0%,rgba(255,225,180,.12) 40%,transparent 80%),
    linear-gradient(180deg,rgba(255,250,240,.09),rgba(255,255,255,.02))}
```

## 5. Bearbeiten-Dialog: flach & schnell

Armin bevorzugt **flach statt Glas** – Tempo zählt. (Mockup „Bearbeiten“, linkes Handy = Basis, aber Status-Knöpfe flach.)

- Platte oben angedockt: `border-radius:30px; padding:22px 20px 20px; gap:14px; background:linear-gradient(180deg,rgba(60,50,44,.92),rgba(24,19,16,.96)); box-shadow:0 24px 60px rgba(0,0,0,.7)`.
- **Felder eingelassen:** `border-radius:16px; padding:14px 16px; background:rgba(0,0,0,.4); box-shadow:inset 0 2px 6px rgba(0,0,0,.75),0 1px 0 rgba(255,255,255,.12)`; Sora 300 15 px. Titel: Sora 600 17 px.
- **Aufgabe:** Titel · Kategorie | Datum · Notizen · Status als **3 direkte Knöpfe** (Planetenhirn | Hyperraum | Anhalter, Michroma 10.5) + darunter **„42 · ERLEDIGT“** volle Breite. Knopf flach: `background:rgba(255,255,255,.06); border:1px solid rgba(255,255,255,.1); border-radius:18px; height:48px`; **aktiv:** `background:rgba(255,150,50,.22); border-color:rgba(255,176,96,.7); color:#FFF3E6`.
- **Termin:** Titel · Datum · Uhrzeit | Dauer · Notizen (kein Status).
- **Aktionen:** links „Löschen“ als Textlink `#E8907A`; rechts „Abbrechen“ (Text, `#C9B9A8`) und **„Speichern“** als Amber-Pille (einziges Glas-Element im Dialog, h 48, radius 24).
- Mini-Drehrad im Dialog: verworfen (direkte Knöpfe sind schneller).

## 6. Marvin spricht

| Aktion | Text (Marvin-Zeile) | Stimme |
|---|---|---|
| App öffnen / Begrüßung | ja | **nein** |
| Neu anlegen · Löschen · Erledigt | ja | ja |
| Verschieben | ja | nein |
| Dieselbe Karte < 10 s erneut verschoben | nein | nein |
| 5. Verschieben derselben Aufgabe | Spezialspruch | ja |
| Leerlauf-Gag mit Spruch | ja (nur manche Gags) | nein |

## 7. Marvins Augen v2

Alle Augen als Paar, Mittelpunkte `(47,32)` und `(123,32)` im 170 × 64-Augen-SVG, Farbe `#FFB25C`, Glühen `drop-shadow(0 0 7px #FF9A3C)`. Lokale Pfade (um 0,0):

| Form | SVG (lokal) |
|---|---|
| Bogen (Standard B1) | `<path d="M-23 8 Q0 -10 23 8" stroke-width="7" stroke-linecap="round" fill="none"/>` |
| **Lid + Pupille** (neu, für alles Schauen) | `<path class="lid" d="M-23 2 Q0 -12 23 2" stroke-width="5"/>` + `<circle class="pup" cx="0" cy="11" r="6"/>` |
| Schlaf | `<path d="M-21 4 Q0 16 21 4" stroke-width="6"/>` |
| Wellen | `<path d="M-24 4 q6 -8 12 0 t12 0 t12 0 t12 0" stroke-width="5"/>` – animiert per CSS `d:path()` zwischen `q6 -8` und `q6 8` (1 s alternate) |
| Stern | `<polygon points="0,-16 4,-5.5 15.2,-4.9 6.5,2.1 9.4,12.9 0,6.7 -9.4,12.9 -6.5,2.1 -15.2,-4.9 -4,-5.5" fill="#FFD08A"/>` – **dreht nicht** |
| X | `<path d="M-12 -10 L12 10 M12 -10 L-12 10" stroke-width="6"/>` |
| Spirale | `<path d="M0 0 m0 -2 a2 2 0 1 1 -2 2 a5 5 0 1 1 5 5 a8.5 8.5 0 1 1 -8.5 -8.5 a12.5 12.5 0 1 1 12.5 12.5" stroke-width="3.5"/>` – dreht (1 s) |
| Pixel | 5 Rects: `(-24,4,8×8) (-16,-4,8×8) (-8,-8,16×8) (8,-4,8×8) (16,4,8×8)` |

`transform-box:fill-box; transform-origin:center` auf allen animierten Teilen. Exakte Keyframes: Mockup „Augen-Galerie“ (Quelltext).

**Leerlauf-Gags** (Spaß-Modus an): erster nach 6–8 s ohne Berührung, dann alle 12–20 s zufällig, je 2–4 s, nie während Scrollen/Tippen/Sprechen/Zuhören. Berührung bricht den Gag sofort ab.
- Umschauen (Pupillen ±10 px) · Nach oben rechts (Uhr) · Einander anschauen (Pupillen +11 / −11) · Augenrollen (Pupillen kreisen, 1.8 s) · Langeweile (Lid wird flach `d:path("M-23 4 Q0 2 23 4")`, Pupillen driften (8,3), Seufzer: Augen sinken 5 px) · Blinzeln (Bogen scaleY .1, 250 ms)
- Pixel sortieren (fallen von oben ein, Versatz 0.1 s) · Pixel-Explosion (fliegen auseinander, rotieren, kommen zurück) · Pixel-Blinzeln (Stufen fallen zusammen) · Wellen · Einschlafen (Atmen ±3 px, **drei Z** z/Z/Z 12/16/20 px steigen versetzt auf)

**Reaktionen** (immer, auch Spaß aus? → nein: bei Spaß aus nur Bogen + Grundzustände):
- Erledigt → Sterne poppen auf (scale .2 → 1.3 → 1) und stehen ~1.5 s still
- Gelöscht → X-Augen, gleiches Pop, statisch
- ≥3 glühende Karten beim Öffnen → Kopfschütteln (±9 px, 1.4 s)

**Easter Eggs** (Tap-Zählung: 320 ms Fenster nach letztem Tipp; 1 Tipp = normal zuhören):
- **2× tippen → Pong:** Ball r=5.5 `#FFF1D6`, mit **echter Kollision** (requestAnimationFrame, ~4 s): prallt an Knopfrändern (Pillenform: Ecken als Halbkreise) **und an den Augen** ab (Augen als Kreise r≈20 um die Mittelpunkte). Treffer: Auge zuckt (translateY 5 px, scaleY .7, 120 ms). Spruch: „Pong. Erfunden 1972. Ich war schon damals gelangweilt.“
- **3× tippen → Sternenregen:** Sternaugen + 12 kleine Sterne fallen (1.6 s, versetzt). Spruch: „Sterne. Wie hübsch. Sie sind alle schon tot.“
- **Handy schütteln → Spiralaugen** 2 s (`devicemotion`, Beschleunigung > ~25 m/s², Sperre 5 s).

**Einstellungen:** „Spaß-Modus“ (an/aus). Aus = nur Grundzustände (dösen/zuhören/grübeln/sprechen), keine Gags, keine Easter Eggs. `prefers-reduced-motion` = wie aus.

## 8. Sonstiges

- Situative Augen aus 1.1.0 bleiben, aber **B3 (Brauen) entfällt** → Termin heute: Lid + Pupille „nach oben rechts“ (Uhr). D3 Skeptiker → Lid + Pupille „Langeweile“-Pose. B2 hängend für Dauerverschieber bleibt.
- v3 weiterhin: Neigungs-Glas.
