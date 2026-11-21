# Marvin – UX v2 (Design-Freigabe 21.11.2026)

Baut auf `docs/ux-v1.md` auf: alles dort gilt weiter, außer es wird hier geändert. Löst `docs/ux-v2-briefing.md` ab.
**Mockup:** https://claude.ai/artifact/AaAVDwFPndZ53c4jG2tU48 (Seite „UX v2“: Hauptansicht, Bearbeiten, Augen-Galerie).

Leitidee v2: **mehr Raum, klare Hierarchie, Marvin als Spielkind.** KISS bleibt.

---

## 1. Raum (8er-Raster)

| Stelle | Wert |
|---|---|
| Seitenrand links/rechts | 20 px (oben/unten 24) |
| Drehrad → Statuszeile | 12 |
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

Cursor `▍` blinkt nach dem letzten Zeichen noch ~2 s und verschwindet dann (Ruhe am Bildschirm).

## 7. Marvins Augen v2 (Stand 21.11., Mockup „Augen-Galerie v2.2“, „Arkanoid“, „Neigungs-Glas“)

Paar mit Mittelpunkten `(47,32)` / `(123,32)` im 170 × 64-Augen-SVG, Farbe `#FFB25C`, Glühen `drop-shadow(0 0 7px #FF9A3C)`, `transform-box:fill-box; transform-origin:center` auf allen animierten Teilen. Exakte Keyframes: Quelltext der Mockup-Ansichten.

| Form | SVG (lokal um 0,0) |
|---|---|
| Bogen (Standard) | `<path d="M-23 8 Q0 -10 23 8" stroke-width="7" stroke-linecap="round" fill="none"/>` |
| **Lid + Pupille** | `<path class="lid" d="M-23 2 Q0 -12 23 2" stroke-width="5"/>` + `<circle class="pup" cx="0" cy="11" r="5" fill="#FFF3E6"/>` – die hellbeige Pupille ist der Akzentpunkt aus dem App-Icon (keine extra Status-LED) |
| Schlaf | `<path d="M-21 4 Q0 16 21 4" stroke-width="6"/>` |
| Stern | `<polygon points="0,-16 4,-5.5 15.2,-4.9 6.5,2.1 9.4,12.9 0,6.7 -9.4,12.9 -6.5,2.1 -15.2,-4.9 -4,-5.5" fill="#FFE2B0"/>` – dreht nicht |
| X | `<path d="M-12 -10 L12 10 M12 -10 L-12 10" stroke-width="6"/>` |
| Pixel | 5 Rects `(-24,4,8×8) (-16,-4,8×8) (-8,-8,16×8) (8,-4,8×8) (16,4,8×8)` |

Gestrichen: Wellen, Spiralen, Brauen, Schütteln, 3×-Tippen.

**Leerlauf-Gags** (Spaß-Modus an): erster nach 6–8 s ohne Berührung, dann alle 12–20 s zufällig, je 2–4 s; nie während Scrollen/Tippen/Sprechen/Zuhören; Berührung bricht sofort ab.
- Umschauen (Pupillen ±10 px) · Nach oben rechts (9,−4) · Einander anschauen (+11/−11) · Augenrollen (kleine Kreise ±5 × ±3, 1.6 s) · Langeweile (nur Lid wird flach: `d:path("M-23 4 Q0 2 23 4")`, Pupillen (8,2), **kein** Absinken) · Blinzeln (scaleY .1)
- Pixel sortieren (6 Pixel je Auge fallen **zufällig verstreut** ein: Start je Pixel dx −40…40, dy −60…−15, Rotation ±180°, Verzögerung 0–0.45 s) · Pixel-Explosion (erst **Implosion**: Pixel ziehen sich zur Mitte, scale .5, hell `#FFF3E6`; dann **Explosion** ganz aus dem Knopf ±75–100 px mit Rotation; dann Rückkehr) · Pixel-Glitch (ersetzt Pixel-Blinzeln: Pixel springen kurz in Stufen ±3–8 px versetzt, flackern hell) · Einschlafen (Atmen ±3 px, drei Z 11/14/17 px steigen **zwischen den Augen** auf – Start am linken Anfang des rechten Bogens)
- Selten (≈1 von 8 Gags): **Arkanoid** (siehe unten).

**Reaktionen** (bei Spaß-Modus aus: keine):
- **Erledigt:** Bogen → **großer Stern** (scale .5 → 1.8 → 1.35, ~1.5 s stehen) **+ Sternenregen** über die ganze Knopffläche (16 kleine Sterne, x und y zufällig verteilt, Verzögerung zufällig 0.5–2.1 s, kurzer Fall 40 px). Achtung: Position per äußerem `<g transform>`, Animation auf dem inneren Element (CSS-transform überschreibt sonst das SVG-transform). Ersetzt das 3×-Tippen.
- **Gelöscht:** X sofort da (1.15 → 1), schrumpft auf 0 und verschwindet, dann kommen die Bögen zurück.
- **Viel Überfälliges** (≥3 glühende Karten beim Öffnen) – zwei Varianten, Armin entscheidet am Handy, Standard A:
  - A **Schock:** Lider springen 6 px hoch, Augen reißen auf (Pupillen scale 1.7 → 1.5). Kein Tropfen.
  - B **Runzeln:** Lider kippen nach innen (±14°), Pupillen schielen zur Mitte (±9 px).

**Easter Egg 2× tippen = Arkanoid** (auch als seltener Leerlauf-Gag):
- Die Augen werden zu Pixel-Steinen (je Auge 6 Steine aus der Pixelform, Faktor 1.6 bei Knopfgröße), Ball r 6 `#FFF3E6`, Schläger 70 × 6 unten.
- Physik per `requestAnimationFrame` (dt-basiert, max 33 ms): Startwinkel zufällig, Wände, Kreis-gegen-Rechteck-Kollision, Treffer entfernt den Stein und spiegelt die Achse mit der kleineren Überlappung; Schläger lenkt je nach Trefferpunkt ab (±1 rad) und beschleunigt um 2 %.
- Marvin spielt selbst: Schläger folgt dem Ball träge (Faktor 5.5/s + leichtes Wackeln) – verfehlt gelegentlich („Verfehlt. Absichtlich. Glaube ich.“).
- Alle Steine weg → Spruch, Augen sortieren sich neu (Pixel-Einfall). Sprüche erscheinen wie immer in der Marvin-Zeile **über** dem Knopf. Spätestens nach ~10 s Ende, Augen zurück. Antippen beendet.
- Ideen für weitere Leerlauf-Spiele später: Space Invaders (Pixel-Augen marschieren), Lunar Lander (kleine Fähre landet auf dem Augenbogen).

**Einstellungen:** „Spaß-Modus“ an/aus. Aus = nur Grundzustände. `prefers-reduced-motion` = wie aus.

**v3 Neigungs-Glas** (Demo im Mockup, **bewusst minimal**): `deviceorientation` → `tx = gamma/30`, `ty = (beta−45)/30`, beide auf −1…1 begrenzt. Glutkern wandert (`at (50−tx·6)% (112−ty·4)%`), Glanz-Layer gegenläufig (`translate(−tx·14px, −ty·8px)`), ruhige Karten drehen den Verlauf um `tx·6°`, Pupillen schauen mit (`cx = tx·4`, `cy = 11+ty·1.5`). Gags laufen in der App **einmal** ab (nicht in Schleife wie in der Galerie). Nur Android/Chrome, ohne Sensor statisch.

## 8. Sonstiges

- Situative Augen aus 1.1.0: B3 (Brauen) entfällt → Termin heute: Lid + Pupille „nach oben rechts“ (Uhr). D3 Skeptiker → „Langeweile“-Pose. B2 hängend für Dauerverschieber bleibt.
