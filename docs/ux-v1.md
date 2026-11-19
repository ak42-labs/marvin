# Marvin – UX v1 (Design-Freigabe 19.11.2026)

Verbindliche Vorgabe für das Redesign. Löst das frühere `ux-briefing.md` ab.
**Klickbares Mockup (Referenz für Look & Verhalten):** https://claude.ai/artifact/AaAVDwFPndZ53c4jG2tU48
(Ansicht „Hauptansicht“ = Zielbild; „Glas-Studie“ und „Augen-Varianten“ = Material- und Augen-Referenz.)

Leitidee: **Edles Amber-Glas auf Schwarz, viel Raum, Marvin als Figur im Knopf.** Funktion vor Fancy. Lieber weniger, dafür sauber.

---

## 1. Namen (nur Anzeige – interne Status-Werte bleiben unverändert)

| Intern      | Anzeige        | Untertitel (Michroma, Versalien) |
|-------------|----------------|----------------------------------|
| Gedächtnis  | Planetenhirn   | GEDACHT                          |
| Zu tun      | Hyperraum      | VOLLE FAHRT                      |
| Pausiert    | Anhalter       | AM STRASSENRAND                  |
| Erledigt    | 42             | DIE ANTWORT                      |
| Puffer      | (unsichtbar)   | –                                |

Mapping zentral an EINER Stelle in `app.js` (z.B. `STATUS_LABELS`).

## 2. Layout (ein Screen, von oben nach unten)

1. **Drehrad (Tabs)** – Höhe 64 px. Reihenfolge links→rechts: Planetenhirn | Hyperraum | Anhalter. Start: Hyperraum.
2. **Statuszeile** – links Untertitel, rechts Anzahl (beides Michroma 13 px, `#C9A888`, letter-spacing .16em).
3. **Kartenliste** – scrollt; unten weicher Auslauf (Maske), damit sichtbar ist, dass es weitergeht.
4. **Link „42 · n“** am Listenende (Michroma 14, `#9C8C7C`) → zeigt Erledigte, dann „← ZURÜCK“.
5. **Marvin-Zeile** – Kommentar, Sora 300 kursiv 16 px, `#E9D7C2`, kein Rahmen; tippt sich Zeichen für Zeichen ein (~38 ms/Zeichen) mit blinkendem Cursor `▍` in `#FFB060`. Rechts bei Bedarf „rückgängig“.
6. **Marvin-Knopf** – volle Breite, 100 px hoch, `border-radius: 50px`, keine Beschriftung, nur Augen.

Seitenhintergrund:
```css
background:
  radial-gradient(45% 22% at 12% 18%, rgba(255,170,60,.16), transparent 70%),
  radial-gradient(40% 20% at 92% 52%, rgba(255,120,30,.12), transparent 70%),
  radial-gradient(70% 22% at 50% 105%, rgba(255,140,50,.2), transparent 70%),
  #070504;
```

## 3. Schrift

- **Michroma** (Google Fonts) – Tab-Namen (aktiv 14 px, Nachbarn 12 px), Untertitel, Zahlen auf Karten (12 px), „42 · n“.
- **Sora** 300/400/600 – alles andere. Kartentitel: **Sora 300, 15 px**, line-height 1.4, `#FFF6EC`.
- Keine Monospace mehr.

## 4. Material: Amber-Glas (reines CSS)

Körnung über einen SVG-Filter, einmal im DOM:
```html
<svg width="0" height="0" style="position:absolute" aria-hidden="true">
  <filter id="noise"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter>
</svg>
<!-- in jedem Glas-Element als erstes Kind: -->
<svg class="grain" aria-hidden="true"><rect width="100%" height="100%" filter="url(#noise)"/></svg>
```

```css
.glass{position:relative;isolation:isolate;overflow:hidden;color:#FFF3E6;
  background:
    radial-gradient(60% 75% at 50% 112%, rgba(255,150,50,.95) 0%, rgba(240,100,25,.6) 28%, rgba(140,50,15,.22) 55%, transparent 75%),
    linear-gradient(180deg, rgba(92,80,72,.55) 0%, rgba(40,33,29,.82) 45%, rgba(20,15,12,.92) 100%);
  box-shadow:inset 0 1px 0 rgba(255,255,255,.55),inset 0 10px 18px -12px rgba(255,255,255,.35),
    inset 0 -16px 26px -12px rgba(255,140,50,.55),0 18px 36px rgba(0,0,0,.6),0 0 30px rgba(255,120,30,.14)}
/* Lichtkante */
.glass::before{content:"";position:absolute;inset:0;border-radius:inherit;padding:1.6px;z-index:2;pointer-events:none;
  background:linear-gradient(180deg,rgba(255,255,255,.85) 0%,rgba(255,255,255,.18) 22%,rgba(255,255,255,.04) 55%,rgba(255,190,120,.55) 88%,rgba(255,220,170,.9) 100%);
  -webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);-webkit-mask-composite:xor;mask-composite:exclude}
/* Spiegelung oben */
.glass::after{content:"";position:absolute;left:3px;right:3px;top:3px;height:42%;border-radius:inherit;z-index:1;pointer-events:none;
  background:linear-gradient(180deg,rgba(255,255,255,.15),rgba(255,255,255,0))}
/* inaktiv */
.glass.dim{color:rgba(255,243,230,.55);
  background:radial-gradient(55% 60% at 50% 118%, rgba(255,150,50,.35) 0%, rgba(200,80,20,.16) 35%, transparent 70%),
    linear-gradient(180deg, rgba(80,70,64,.42) 0%, rgba(34,28,25,.85) 50%, rgba(18,14,12,.94) 100%);
  box-shadow:inset 0 1px 0 rgba(255,255,255,.4),inset 0 10px 18px -12px rgba(255,255,255,.25),0 12px 24px rgba(0,0,0,.55)}
/* Marvin-Knopf: kräftigere Kante */
.glass.pill::before{padding:3px;background:linear-gradient(180deg,rgba(255,255,255,.95),rgba(255,230,210,.35) 30%,rgba(255,170,100,.4) 70%,rgba(255,220,180,.95))}
.grain{position:absolute;inset:0;width:100%;height:100%;z-index:1;opacity:.14;mix-blend-mode:overlay;pointer-events:none}
/* Inhalte über Kante/Spiegelung legen */
.glass > :not(.grain), .card > :not(.grain){position:relative;z-index:3}
```

## 5. Drehrad (Tabs)

Container `position:relative; height:64px`. Buttons absolut positioniert, Werte relativ zur Containerbreite (Mockup: 358 px). Übergang:
`transition: left .35s cubic-bezier(.3,.7,.2,1), top .35s, width .35s, height .35s, font-size .35s, opacity .35s`.

| Position (i − aktiv) | left | top | width × height | z | Schrift | Ausrichtung | Klasse |
|---|---|---|---|---|---|---|---|
| 0 (aktiv) | zentriert (Mockup 79px) | 0 | 200 × 62, radius 24 | 3 | 14 px | mittig | `glass` + `background-color: rgba(21,14,10,.55); backdrop-filter: blur(6px)` (leicht durchscheinend) |
| −1 | −44px | 9 | 160 × 46, radius 20 | 1 | 12 px | links, `padding-left:58px` | `glass dim` |
| +1 | rechts gespiegelt (Mockup 242px) | 9 | 160 × 46 | 1 | 12 px | rechts, `padding-right:58px` | `glass dim` |
| ±2 | außerhalb, `opacity:0`, `pointer-events:none` | | | | | | |

Nachbarn ragen über den Bildschirmrand (Root `overflow:hidden`), Namen werden vom aktiven Knopf teilweise verdeckt – gewollt. Tippen auf Nachbarn → Rad dreht.

## 6. Karten

- Nur **Titel** + rechts optional **eine Zahl**. Keine Kategorie mehr auf der Karte.
- `flex-shrink:0`, Höhe wächst mit Text (mehrzeilig ok). Padding 16 × 20, radius 24, Abstand 10.
- Alle Karten haben Glanz (Lichtkante + Spiegelung wie `.glass`, Kante 1.4 px), Glut je nach Dringlichkeit:

```css
.card{ background:radial-gradient(60% 80% at 50% 130%,rgba(255,150,50,.28) 0%,rgba(200,80,20,.1) 45%,transparent 75%),
    linear-gradient(180deg,rgba(92,82,76,.42) 0%,rgba(36,30,27,.76) 55%,rgba(20,16,14,.88) 100%);
  box-shadow:inset 0 1px 0 rgba(255,255,255,.5),inset 0 8px 14px -10px rgba(255,255,255,.3),inset 0 -10px 18px -10px rgba(255,140,50,.3),0 10px 22px rgba(0,0,0,.5)}
.card::before{/* wie .glass::before, padding 1.4px */ background:linear-gradient(180deg,rgba(255,255,255,.75) 0%,rgba(255,255,255,.12) 25%,rgba(255,255,255,.03) 60%,rgba(255,190,120,.35) 92%,rgba(255,215,170,.6) 100%)}
.card::after{/* wie .glass::after, height 45%, alpha .13 */}
.card.warm{background:radial-gradient(70% 95% at 50% 125%,rgba(255,150,50,.6) 0%,rgba(220,90,20,.25) 40%,transparent 75%), /* + Basis-Verlauf */}
.card.hot{background:radial-gradient(75% 100% at 50% 125%,rgba(255,150,50,.9) 0%,rgba(240,100,25,.5) 35%,rgba(140,50,15,.15) 65%,transparent 85%), /* + Basis */;
  box-shadow:…,0 0 26px rgba(255,120,30,.22)}
```

**Dringlichkeit & Zahl** (nur im Hyperraum; Zahl in Michroma 12):

| Fall | Klasse | Zahl | Farbe Zahl | Sortierung |
|---|---|---|---|---|
| Fällig überschritten (N Tage) | `hot` | `+N` | `#FFE0BE` | 1 |
| >7 Tage im Hyperraum (ohne Überfälligkeit) | `hot` | `+(Tage−7)` | `#FFE0BE` | 1 |
| Fällig heute / morgen | `warm` | `0` / `−1` | `#FFCB94` | 2 |
| Fällig später | `card` | `−N` | `#A89888` | 3 |
| Kein Datum | `card` | – | – | 4 |

„+“ heißt überall „drüber“. Frist (7) als Config-Wert im Sheet (`Config`: Typ `Frist`, Wert `7`).
**Sheet:** neue Spalte `Status_Since` (wird NUR bei Statuswechsel gesetzt; `Updated_At` reicht nicht).

## 7. Gesten

- **Tippen** → Bearbeiten (bestehender Dialog, später an neuen Look anpassen).
- **Wischen links/rechts** (>70 px) → Karte in die Nachbar-Spalte gemäß Drehrad-Reihenfolge. Karte folgt dem Finger (`translateX` + leichte Rotation `dx/40 deg`). Wisch-Start nicht am äußersten Rand (Android-Zurück-Geste).
- **Lange drücken** (700 ms) → Erledigt (42). Leuchtbalken unten füllt sich (`#FFD09A`, 3 px), `navigator.vibrate(30)`. Bewegung >8 px bricht ab.
- Nach jeder Aktion: Marvin-Kommentar + „rückgängig“.

## 8. Marvin-Knopf & Augen

Augen **B1** (Standard), Farbe `#FFB25C`, Glühen `drop-shadow(0 0 7px #FF9A3C)`, SVG 170 × 64:
```html
<path d="M24 40 Q47 22 70 40" stroke="#FFB25C" stroke-width="7" stroke-linecap="round" fill="none"/>
<path d="M100 40 Q123 22 146 40" stroke="#FFB25C" stroke-width="7" stroke-linecap="round" fill="none"/>
```
Zustände (Klasse am Knopf, Animation auf der Augen-Gruppe `.eye`, `transform-box:fill-box`):
- `doze` – Ruhe: Opazität .5↔1, 3.4 s
- `listen` – Mikro offen: hebt sich + scaleY 1.25, .45 s alternierend
- `think` – Gemini rechnet: wandert ±6 px, 1.2 s
- `speak` – Kommentar/Sprachausgabe läuft: flackert .18 s steps(2)

Später situativ: B2 hängend, B3 Brauen, D3 Skeptiker (siehe Mockup „Augen-Varianten“), z.B. nach dem 5. Verschieben derselben Aufgabe.

## 9. App-Icon

Neu im selben CI: Amber-Glas-Kachel mit Augen B1 (ersetzt das Smiley-Icon). Aus dem Knopf ableiten, als PNG 192/512 + maskable.

## 10. Bewusst raus / später

- Rotes Glas, Sprünge, Kategorien auf Karten, Einkaufsliste: raus.
- **v3 „Neigungs-Glas“:** `DeviceOrientationEvent` (Android Chrome, HTTPS ok) verschiebt Lichtkante/Glut leicht – Glas wirkt echt. Optional Drehrad per Kippen.
- Bearbeiten-Dialog im neuen Look: eigener Schritt nach v1.
