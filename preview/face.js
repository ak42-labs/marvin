// Marvins Gesicht – UX v4 (docs/ux-v4.md)
//  Teil 1: runde Welt – eine Kurve, die sich verwandelt (Mockup V31Augen.dc.html)
//  Teil 2: Pixel-/Arcade-Welt (Mockup V31Arcade.dc.html)
//  Teil 3: Autopilot – Phasen, Tore, Ereignisse (Mockup V4Autopilot.dc.html)
// Schnittstelle für app.js: Face.init(hooks), react, sync, glance, touch, abort, arkanoid, isBusy, isGame, funEnabled, setBase, flash.

const Face = (() => {
    const C = '#FFB25C';
    const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
    const pickOther = (arr, last) => { const c = arr.filter(x => x !== last); return c[Math.floor(Math.random() * c.length)]; };
    const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    // ---------- Runde Welt: Formen (feste Pfadstruktur M-23 a Q0 b 23 a) ----------
    const SH = {
        OPEN: 'M-23 8 Q0 -10 23 8', LID: 'M-23 2 Q0 -12 23 2', HALF: 'M-23 5 Q0 0 23 5',
        ANNOY: 'M-23 3 Q0 -4 23 3', SHUT: 'M-23 9 Q0 13 23 9', CLOSED: 'M-23 4 Q0 16 23 4', LINE: 'M-23 4 Q0 4 23 4',
    };
    const strokeOf = s => (s === 'LID' || s === 'ANNOY') ? 5 : (s === 'HALF' || s === 'SHUT' || s === 'LINE') ? 6 : 7;

    // ---------- Pixel-Welt: Geometrie (Mockup) ----------
    const BASE = [[-24, 4], [-16, -4], [-8, -8], [0, -8], [8, -4], [16, 4]];
    const mk = (arr, y) => [].concat(arr.map(q => [47 + q[0], y + q[1]]), arr.map(q => [123 + q[0], y + q[1]]));
    const PX_OPEN = mk(BASE, 28);
    const PX_X = mk([[-12, -10], [4, -10], [-4, -2], [-12, 6], [4, 6], [-4, -2]], 30);
    const PX_WINK = [].concat(PX_OPEN.slice(0, 6), [[-24, 2], [-16, 2], [-8, 2], [0, 2], [8, 2], [16, 2]].map(q => [123 + q[0], 28 + q[1]]));
    const HEART = [[1,0],[2,0],[4,0],[5,0],[0,1],[1,1],[2,1],[3,1],[4,1],[5,1],[6,1],[0,2],[1,2],[2,2],[3,2],[4,2],[5,2],[6,2],[1,3],[2,3],[3,3],[4,3],[5,3],[2,4],[3,4],[4,4],[3,5]];

    // Snake-Weg auf 6-px-Raster (Mockup V31Arcade, snakeRun) – als reine Funktion, damit er geprüft werden kann
    function snakePath(mirror) {
        const tr = [];
        const line = (x0, y0, x1, y1) => {
            const dx = Math.sign(x1 - x0) * 6, dy = Math.sign(y1 - y0) * 6;
            let x = x0, y = y0; tr.push([x, y]);
            while (x !== x1 || y !== y1) { x += dx; y += dy; tr.push([x, y]); }
        };
        line(-22, 8, 8, 8); line(8, 14, 8, 50); line(14, 50, 44, 50); line(44, 44, 44, 32);   // oben rein, Ecke runter, untere Zeile, hoch zu Pupille 1
        line(50, 32, 50, 44); line(56, 44, 80, 44);                                           // Haken raus, zwischen die Augen
        line(80, 38, 80, 8); line(86, 8, 152, 8);                                             // hoch, über das andere Auge
        line(152, 14, 152, 50); line(146, 50, 122, 50);                                       // außen runter, von unten
        line(122, 44, 122, 32);                                                               // hoch zu Pupille 2
        // Haken raus, unten aus dem Bild – eine Rasterzeile tiefer als der Hinweg (y 56 statt 50),
        // sonst fährt die Schlange über ihre eigene Spur zurück (per Simulation gefunden, Abweichung vom Mockup)
        line(116, 32, 116, 56); line(110, 56, -28, 56);
        if (mirror) tr.forEach(t => { t[0] = 164 - t[0]; });
        const P1 = mirror ? { x: 120, y: 32 } : { x: 44, y: 32 };
        const P2 = mirror ? { x: 42, y: 32 } : { x: 122, y: 32 };
        return { track: tr, P1, P2 };
    }

    // ---------- Zustand ----------
    let btn, eyes, lids, pups, pupWraps, egs, zzLayer, pix, layers, scanEl, txtEl, barEl, fx;
    let hooks = {};
    let world = 'round';
    let timers = [];
    let interval = null;
    let running = null;          // { name, kind: 'gag'|'event'|'gate'|'game' }
    let auto = false;            // Autopilot läuft gerade (Leerlauf)
    let nextAt = Infinity;
    let left, lastR = '', lastP = '', lastIn = '';
    let roundEy = 0;
    let syncing = false, pendingSync = false;
    let lastDone = '', lastDel = '';
    let tiltTimer = null, tiltRaf = false, tiltRest = null, tiltLast = null;
    let ps = {};                 // Pixel-Zustand

    const at = (ms, f) => { timers.push(setTimeout(f, ms)); };
    function clearAll() { timers.forEach(clearTimeout); timers = []; clearInterval(interval); interval = null; loadRun.onSynced = null; }

    // Gag-Regler (Einstellungen): 0 = aus … 5 = Vorführmodus. Pausen [erster Gag nach Ruhe, zwischen Gags] in ms.
    // Stufe 3 = ux-v3.1 §4 (erster nach 8–12 s, dann 15–25 s).
    const GAP = { 1: [[40e3, 60e3], [50e3, 70e3]], 2: [[20e3, 30e3], [30e3, 40e3]], 3: [[8e3, 12e3], [15e3, 25e3]],
                  4: [[6e3, 10e3], [6e3, 10e3]], 5: [[4e3, 6e3], [1.5e3, 3e3]] };
    function gagLevel() {
        let v = null;
        try { v = localStorage.getItem('marvin.gags'); if (v === null && localStorage.getItem('marvin.fun') === 'off') v = '0'; } catch {}
        const n = v === null ? 3 : Number(v);
        return n >= 0 && n <= 5 ? n : 3;
    }
    // Spaß (Gags, Spiele, Neigen) – aus bei Regler 0
    function funEnabled() { return gagLevel() > 0 && !reducedMotion(); }
    // Rückmeldungen (Laden, Erledigt, Verschieben …) bleiben auch ohne Spaß (ux-v3.1 §8)
    function feedbackOn() { return !reducedMotion(); }
    const scheduleFirst = () => { const g = GAP[gagLevel()]; if (g) schedule(g[0][0], g[0][1]); else nextAt = Infinity; };
    const gapBetween = () => { const g = GAP[gagLevel()] || GAP[3]; return rnd(g[1][0], g[1][1]); };

    // 8-Bit-Piepser (WebAudio) – nur wenn "Marvin spricht" an ist
    let ac = null, acClose = null;
    function closeAudio() { clearTimeout(acClose); try { ac?.close(); } catch {} ac = null; }
    function beep(notes, step, type) {
        // nur wenn Marvin wirklich vorne und sichtbar ist (gesperrt, andere App, Hintergrund: still)
        if (!hooks.soundOn?.() || document.visibilityState !== 'visible' || !document.hasFocus()) return;
        try {
            const A = window.AudioContext || window.webkitAudioContext;
            ac = ac || new A();
            let t = ac.currentTime;
            clearTimeout(acClose);
            const end = t + notes.length * step;
            notes.forEach(f => {
                const o = ac.createOscillator(), g = ac.createGain();
                o.type = type || 'square'; o.frequency.value = f;
                g.gain.setValueAtTime(.06, t); g.gain.exponentialRampToValueAtTime(.001, t + step * .95);
                o.connect(g); g.connect(ac.destination); o.start(t); o.stop(t + step); t += step;
            });
            // Audio-Kanal nach dem Piepsen wieder schließen: sonst hält Android die Seite als „spielt Ton“ wach
            acClose = setTimeout(closeAudio, (end - ac.currentTime) * 1000 + 300);
        } catch {}
    }

    // Bildschirm aus / App im Hintergrund: Ton sofort stoppen (Browser lässt Timer sonst weiterlaufen)
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) closeAudio();
    });
    ['pagehide', 'blur', 'freeze'].forEach(ev => window.addEventListener(ev, closeAudio));
    document.addEventListener('freeze', closeAudio);

    // ================= Aufbau =================

    function build() {
        btn.insertAdjacentHTML('beforeend', `
            <div class="scan"></div>
            <div class="face-stack">
              <svg class="eyes" aria-hidden="true" width="170" height="64" viewBox="0 0 170 64">
                <g class="eg-mood"><g class="eg-snore">
                  ${[47, 123].map(x => `<g transform="translate(${x} 32)"><g class="eg">
                     <path class="lid" stroke="${C}" stroke-linecap="round" fill="none"/>
                     <g class="pw"><circle class="pup" cx="0" cy="11" r="5" fill="#FFF3E6"/></g></g></g>`).join('')}
                </g></g>
                <g class="zz-layer"></g>
              </svg>
              <svg class="pix" aria-hidden="true" width="170" height="64" viewBox="0 0 170 64" shape-rendering="crispEdges" style="opacity:0">
                <g class="pa"><g class="scr">
                  <g class="L-blocks"></g><g class="L-pups"></g><g class="L-snake"></g>
                  <g class="hb L-hl"></g><g class="hb L-hr"></g><g class="L-bar"></g><g class="L-drops"></g>
                </g><g class="L-score"><text class="score" x="70" y="16">+42</text></g></g>
              </svg>
            </div>
            <div class="ptxt"></div><div class="pbar"></div>
            <div id="fx"></div>`);
        eyes = btn.querySelector('.eyes');
        lids = [...eyes.querySelectorAll('.lid')];
        pups = [...eyes.querySelectorAll('.pup')];
        egs = [...eyes.querySelectorAll('.eg')];
        zzLayer = eyes.querySelector('.zz-layer');
        pix = btn.querySelector('.pix');
        layers = {};
        ['blocks', 'pups', 'snake', 'hl', 'hr', 'bar', 'drops', 'score'].forEach(k => { layers[k] = pix.querySelector('.L-' + k); });
        scanEl = btn.querySelector('.scan');
        txtEl = btn.querySelector('.ptxt');
        barEl = btn.querySelector('.pbar');
        fx = btn.querySelector('#fx');
    }

    // ================= Runde Welt =================
    // Schritt: {s: Form, p: Pupille 0/1, x, y, ey: Augen-Versatz, d/pd/od/ed: Dauern (s), z: Schnarchen}
    function R(s) {
        const st = eyes.style;
        st.setProperty('--dur', (s.d || .9) + 's');
        st.setProperty('--pdur', (s.pd || .9) + 's');
        st.setProperty('--odur', (s.od || .5) + 's');
        st.setProperty('--edur', (s.ed || 1.2) + 's');
        lids.forEach(l => { l.style.setProperty('d', `path('${SH[s.s]}')`); l.setAttribute('stroke-width', strokeOf(s.s)); });
        const x = s.x || 0, y = s.y || 0;
        const scale = s.p ? (y >= 3 ? 1.15 : 1) : .4; // Blick nach unten = Augen aufreißen
        pups.forEach(p => { p.style.opacity = s.p ? 1 : 0; p.style.transform = `translate(${x}px, ${y}px) scale(${scale})`; });
        if (s.ey !== undefined) roundEy = s.ey;
        egs.forEach(g => { g.style.transform = `translateY(${roundEy}px)`; });
        eyes.querySelector('.eg-snore').classList.toggle('snore', !!s.z);
        zzLayer.innerHTML = s.z
            ? `<text class="zz" x="90" y="40" font-family="Michroma" font-size="10" fill="#FFD08A">z</text>` +
              `<text class="zz" x="92" y="36" font-family="Michroma" font-size="13" fill="#FFD08A" style="animation-delay:.9s">Z</text>` +
              `<text class="zz" x="94" y="32" font-family="Michroma" font-size="16" fill="#FFD08A" style="animation-delay:1.8s">Z</text>`
            : '';
    }
    const R_OPEN = { s: 'OPEN', p: 0, ey: 0 };

    function steps(list, done) {
        let t = 0;
        list.forEach(s => { at(t, () => R(s)); t += s.t; });
        at(t, done);
    }

    // --- Abläufe 1:1 aus V31Augen ---
    const SEQ = {
        wake: () => [
            { s: 'CLOSED', p: 0, ey: 7, t: 1400, d: .01, ed: .01 },
            { s: 'HALF', p: 0, ey: 4, t: 1500, d: 1.5, ed: 1.6 },
            { s: 'LID', p: 1, x: 0, y: 3, ey: 0, t: 1500, d: 1.3, pd: 1, ed: 1.5 },
            { s: 'LID', p: 1, x: 0, y: -4, t: 1400, pd: 1.1 },
            { s: 'LID', p: 1, x: -9, y: -3, t: 1300, pd: 1 },
            { s: 'LID', p: 1, x: 9, y: -3, t: 1300, pd: 1 },
            { s: 'LID', p: 1, x: 0, y: 0, t: 1100 },
            { s: 'HALF', p: 0, t: 1800, d: 1.2, od: .8 },
            { s: 'OPEN', p: 0, ey: 0, t: 900 },                // gemeinsame Pose „Bogen offen“
        ],
        // „Schauen“: zweiter Teil des früheren Aufwachens – aus geraden Augen, Brauen hoch, Pupillen, entspannt umschauen
        look: () => [
            { s: 'HALF', p: 0, ey: 0, t: 900, d: .8, ed: .8 },
            { s: 'LID', p: 1, x: 0, y: 3, ey: 0, t: 1500, d: 1.3, pd: 1, ed: 1.5 },
            { s: 'LID', p: 1, x: 0, y: -4, t: 1400, pd: 1.1 },
            { s: 'LID', p: 1, x: -9, y: -3, t: 1300, pd: 1 },
            { s: 'LID', p: 1, x: 9, y: -3, t: 1300, pd: 1 },
            { s: 'LID', p: 1, x: 0, y: 0, t: 1100 },
            { s: 'HALF', p: 0, t: 1800, d: 1.2, od: .8 },
            { s: 'OPEN', p: 0, ey: 0, t: 900 },
        ],
        curious: () => {
            const pts = [[-10, 0], [9, -4], [0, -4], [-8, 3], [10, 2], [0, 0], [-9, -4], [6, 4], [0, -3], [-4, 0]];
            const a = [{ s: 'LID', p: 1, x: 0, y: 0, t: 700, d: .6 }];
            let last = -1;
            for (let i = 0; i < 8; i++) {
                let k; do { k = Math.floor(Math.random() * pts.length); } while (k === last); last = k;
                const q = pts[k];
                a.push({ s: 'LID', p: 1, x: q[0], y: q[1], t: 300 + Math.floor(Math.random() * 1300), pd: .22 });
                if (Math.random() < .25) a.push({ s: 'LID', p: 1, x: q[0] * .6, y: q[1] * .6, t: 250, pd: .15 }); // zweiter Blick
            }
            a.push({ s: 'LID', p: 1, x: 0, y: 0, t: 600, pd: .4 }, { s: 'OPEN', p: 0, t: 900, od: .5 });
            return a;
        },
        roll: () => {
            const a = [{ s: 'LID', p: 1, x: 0, y: 0, t: 500 }, { s: 'ANNOY', p: 1, x: -8, y: -2, t: 700, d: .6, pd: .6 }];
            for (let i = 1; i <= 10; i++) {
                const t = Math.PI * (1 - i / 10);
                a.push({ s: 'ANNOY', p: 1, x: +(Math.cos(t) * -8).toFixed(2), y: +(-2 - Math.sin(t) * 3.5).toFixed(2), t: 110, pd: .12 });
            }
            a.push({ s: 'ANNOY', p: 1, x: 0, y: 0, t: 600, pd: .6 }, { s: 'HALF', p: 0, ey: 2, t: 900, od: .4 }, { s: 'OPEN', p: 0, ey: 0, t: 900 });
            return a;
        },
        blink: () => [
            { s: 'LID', p: 1, x: 0, y: 0, t: 700, d: .6 },
            { s: 'SHUT', p: 0, t: 140, d: .13, od: .08 },
            { s: 'LID', p: 1, t: 200, d: .16, od: .12 },
            { s: 'LID', p: 1, t: 900 },
            { s: 'OPEN', p: 0, t: 800 },
        ],
        sleep: () => [
            { s: 'OPEN', p: 0, ey: 0, t: 900 },
            { s: 'HALF', p: 0, ey: 3, t: 1800, d: 1.6, ed: 1.8 },
            { s: 'CLOSED', p: 0, ey: 7, t: 5000, z: 1, d: 1.6, ed: 1.8 },
            { s: 'HALF', p: 0, ey: 3, t: 1200 },
            { s: 'OPEN', p: 0, ey: 0, t: 1000 },
        ],
    };

    // ================= Pixel-Welt =================

    function blockStyle(q, i) {
        const k = i < 6 ? i : i + 1.5;
        return `--x:${q[0]}px;--y:${q[1]}px;--i:${(k * .08).toFixed(2)}s;--r:${ps.rr ? ps.rr[i] : 0}s;` +
            `--ly:${ps.ly ? ps.ly[i] : q[1]}px;--f:${((i * 5) % 12 * .09).toFixed(2)}s;--dx:${(((i * 13) % 9) - 4) * 3}px;` +
            `--rt:${(((i * 7) % 5) - 2) * 60}deg;transform:translate(${q[0]}px,${q[1]}px)`;
    }
    function drawBlocks() {
        layers.blocks.innerHTML = (ps.hide ? [] : ps.pos).map((q, i) => ps.dead?.[i] ? '' :
            `<rect class="b" x="0" y="0" width="8" height="8" fill="${C}" style="${blockStyle(q, i)}"/>`).join('');
    }
    function drawPups() { layers.pups.innerHTML = (ps.pups || []).map(p => `<rect x="${p.x}" y="${p.y}" width="6" height="6" fill="#FFF3E6"/>`).join(''); }
    function drawSnake() { layers.snake.innerHTML = (ps.snake || []).map(s => `<rect x="${s.x}" y="${s.y}" width="6" height="6" fill="${s.f}"/>`).join(''); }
    function drawHearts() {
        const h = ps.hearts || [];
        const r = list => list.map(q => `<rect x="${q.x}" y="${q.y}" width="4" height="4" fill="#FF8A6A"/>`).join('');
        layers.hl.innerHTML = r(h.slice(0, h.length / 2));
        layers.hr.innerHTML = r(h.slice(h.length / 2));
    }
    function drawBar() {
        if (!ps.bar) { layers.bar.innerHTML = ''; barEl.textContent = ''; return; }
        let segs = '';
        for (let x = 38; x + 5 <= 38 + ps.barW; x += 7) segs += `<rect x="${x}" y="25" width="5" height="8" fill="${C}"/>`;
        layers.bar.innerHTML = `<rect x="35" y="22" width="100" height="14" fill="none" stroke="${C}" stroke-width="2"/>` +
            `<text x="35" y="16" font-family="Press Start 2P" font-size="6" fill="#FFF3E6">LOADING...</text>` + segs;
        barEl.textContent = ps.barTxt || '';
    }
    function drawDrops() {
        layers.drops.innerHTML = (ps.drops || []).map(d => `<rect class="drop" x="0" y="0" width="6" height="6" fill="${C}" opacity=".7" style="${d}"/>`).join('');
    }
    function setAnim(a) {
        const g = pix.querySelector('.pa');
        g.setAttribute('class', 'pa' + (a ? ' A-' + a : ''));
        // Neustart erzwingen, damit dieselbe Animation erneut läuft
        void g.getBoundingClientRect();
    }
    function setText(t) { txtEl.textContent = t || ''; txtEl.classList.toggle('O', !!t); }
    function pixReset() {
        ps = { dead: null, pos: PX_OPEN, hide: false, pups: [], snake: [], hearts: [], bar: false, barW: 0, barTxt: '', drops: [], rr: null, ly: null };
        setAnim('');
        layers.score.classList.remove('S');
        scanEl.classList.remove('on');
        setText('');
        drawBlocks(); drawPups(); drawSnake(); drawHearts(); drawBar(); drawDrops();
    }
    function showWorld(w) {
        eyes.classList.toggle('off', w !== 'round');
        pix.style.opacity = w === 'pixel' ? 1 : 0;
    }

    // --- Pixel-Gags 1:1 aus V31Arcade (run) ---
    function px(n, done, opts = {}) {
        pixReset();
        if (n === 'crt') setAnim(opts.thin ? 'crtIn' : 'crt');
        at(40, () => {
            if (n === 'crt') {
                beep([110, 220, 440, 880], .08, 'sawtooth'); setAnim(opts.thin ? 'crtIn' : 'crt'); scanEl.classList.add('on');
                at(1300, () => { setText('PRESS START'); beep([392, 523, 659, 784, 1047], .06); at(380, () => beep([1047, 1568], .1)); });
                at(4000, done);
            }
            if (n === 'wave') {
                ps.ly = PX_OPEN.map(() => 28 + Math.round(Math.random() * 4 - 2)); // Linie ±2 px
                drawBlocks(); setAnim('wave');
                at(4500, done);
            }
            if (n === 'rain') {
                ps.drops = [];
                for (let k = 0; k < 45; k++) ps.drops.push(`--dx2:${Math.round(Math.random() * 165)}px;--d:${(Math.random() * 3.4).toFixed(2)}s;transform:translate(0,-80px)`);
                ps.rr = PX_OPEN.map(() => (.3 + Math.random() * 1.6).toFixed(2));
                drawBlocks(); drawDrops(); setAnim('rain');
                at(5000, done);
            }
            if (n === 'snake') snakeRun(done, opts.preset);
            if (n === 'over') {
                ps.pos = PX_X; drawBlocks(); scanEl.classList.add('on');
                at(500, () => { setAnim('fall'); beep([523, 494, 466, 440, 415, 392, 370, 349, 330, 311, 294], .16, 'square'); });
                at(1300, () => setText('GAME OVER'));
                at(5200, done);
            }
            if (n === 'wink') {
                ps.pos = PX_WINK; drawBlocks(); beep([880, 1320], .05);
                at(650, () => { ps.pos = PX_OPEN; drawBlocks(); });
                at(1200, done);
            }
            if (n === 'hearts') {
                ps.hearts = [].concat(HEART.map(q => ({ x: 33 + q[0] * 4, y: 16 + q[1] * 4 })), HEART.map(q => ({ x: 109 + q[0] * 4, y: 16 + q[1] * 4 })));
                ps.hide = true; drawBlocks(); drawHearts(); scanEl.classList.add('on'); setText('EXTRA LIFE');
                [0, 1000, 2000].forEach(t => at(t, () => { beep([196], .08, 'triangle'); at(160, () => beep([262], .1, 'triangle')); }));
                at(3200, done);
            }
            if (n === 'load') loadRun(done);
            if (n === 'bricks') bricksRun(done);
        });
    }

    // Loading: zählt hoch, hängt bei 42 %, springt erst auf 100 %, wenn der Abgleich fertig ist
    function loadRun(done) {
        ps.hide = true; ps.bar = true; ps.barW = 0; ps.barTxt = '0%';
        drawBlocks(); drawBar();
        let w = 0, reached = false, over = false;
        const finish = () => {
            if (over) return; over = true;
            loadRun.onSynced = null;
            ps.barW = 94; ps.barTxt = '100%'; drawBar(); beep([784, 1047], .08);
            at(1100, done);
        };
        const joke = (t) => { if (!over) { ps.barTxt = t; drawBar(); } };
        const tryFinish = () => { if (reached && !syncing) finish(); }; // fertig geladen -> sofort 100 %
        interval = setInterval(() => {
            w += Math.random() < .3 ? 0 : 3 + Math.round(Math.random() * 5);
            if (w >= 39) {
                w = 39; clearInterval(interval); interval = null;
                ps.barW = w; ps.barTxt = '42%'; drawBar(); reached = true;
                // hängt bei 42 %, solange der Abgleich läuft
                at(900, () => joke('42% HÄNGT…'));
                at(2400, () => joke('42% IMMER NOCH'));
                at(3900, () => joke('42% WIE ERWARTET'));
                at(600, tryFinish);
            } else { ps.barW = w; ps.barTxt = Math.round(w / 94 * 100) + '%'; drawBar(); }
        }, 160);
        loadRun.onSynced = () => at(400, tryFinish);
    }

    // Ballspiel „Mauerwerk“: die Pixel-Augen sind die Steine (gleiches Raster wie Snake), Marvin spielt selbst
    function bricksRun(done) {
        const W = 170, H = 64, bs = 4, padW = 24, padY = 58;
        ps.dead = PX_OPEN.map(() => false); drawBlocks();
        let bx, by, vx, vy, pxp = W / 2 - padW / 2, last = performance.now(), over = false, misses = 0;
        const serve = () => { const a = -Math.PI / 2 + (Math.random() - .5) * 1.2; bx = W / 2; by = padY - 8; vx = Math.cos(a) * 105; vy = Math.sin(a) * 105; };
        const draw = () => {
            layers.drops.innerHTML = `<rect x="${Math.round(pxp)}" y="${padY}" width="${padW}" height="4" fill="${C}"/>` +
                `<rect x="${Math.round(bx - bs / 2)}" y="${Math.round(by - bs / 2)}" width="${bs}" height="${bs}" fill="#FFF3E6"/>`;
        };
        const end = () => {
            over = true; clearInterval(interval); interval = null;
            layers.drops.innerHTML = '';
            hooks.say?.(LINES.arkWin[0]); beep([523, 659, 784, 1047], .07);
            // Augen bauen sich neu auf: Block für Block, links vor rechts
            ps.dead = null; drawBlocks(); setAnim('pop');
            at(1700, done);
        };
        serve(); draw();
        hooks.say?.(LINES.arkStart[0]);
        at(1200, () => {
            last = performance.now();
            interval = setInterval(() => {
                if (over) return;
                const t = performance.now(), dt = Math.min(.05, (t - last) / 1000); last = t;
                bx += vx * dt; by += vy * dt;
                if (bx < bs / 2) { bx = bs / 2; vx = Math.abs(vx); }
                if (bx > W - bs / 2) { bx = W - bs / 2; vx = -Math.abs(vx); }
                if (by < bs / 2) { by = bs / 2; vy = Math.abs(vy); }
                const target = bx - padW / 2 + Math.sin(t / 700) * 10;
                pxp += (target - pxp) * Math.min(1, dt * 5);
                pxp = Math.max(0, Math.min(W - padW, pxp));
                if (vy > 0 && by + bs / 2 >= padY && by + bs / 2 <= padY + 5 && bx >= pxp - 2 && bx <= pxp + padW + 2) {
                    const off = (bx - (pxp + padW / 2)) / (padW / 2), sp = Math.min(150, Math.hypot(vx, vy) * 1.03), ang = -Math.PI / 2 + off;
                    vx = Math.cos(ang) * sp; vy = Math.sin(ang) * sp; by = padY - bs / 2;
                    beep([440], .03);
                }
                if (by > H + 4) { misses++; hooks.say?.(LINES.arkMiss[0]); beep([196, 147], .08); serve(); }
                for (let i = 0; i < PX_OPEN.length; i++) {
                    if (ps.dead[i]) continue;
                    const [x0, y0] = PX_OPEN[i];
                    if (bx + bs / 2 > x0 && bx - bs / 2 < x0 + 8 && by + bs / 2 > y0 && by - bs / 2 < y0 + 8) {
                        const ox = Math.min(Math.abs(bx - x0), Math.abs(bx - x0 - 8)), oy = Math.min(Math.abs(by - y0), Math.abs(by - y0 - 8));
                        if (ox < oy) vx = -vx; else vy = -vy;
                        ps.dead[i] = true; drawBlocks(); beep([880], .04);
                        break;
                    }
                }
                if (ps.dead.every(Boolean)) { end(); return; }
                draw();
            }, 16);
            at(30000, () => { if (!over) end(); }); // spätestens nach 30 s
        });
    }

    // Snake + 42 (Pupillen vorher sichtbar; Pause ~1 s)
    function snakeRun(done, preset) {
        const { track, P1, P2 } = preset || snakePath(Math.random() < .5);
        ps.pups = [P1, P2]; drawPups();
        at(1000, () => {
            let i = -1, len = 4, eaten = 0;
            interval = setInterval(() => {
                i++;
                if (i >= track.length + len) { clearInterval(interval); interval = null; ps.snake = []; drawSnake(); at(800, done); return; }
                const h = track[i];
                if (h) {
                    const hit = [P1, P2].find(p => p.x === h[0] && p.y === h[1]);
                    if (hit && ps.pups.includes(hit)) {
                        eaten++; len += 3; ps.pups = ps.pups.filter(p => p !== hit); drawPups();
                        if (eaten === 1) beep([660, 880], .05);
                        else { beep([523, 659, 784, 1047, 1319], .07); layers.score.classList.add('S'); }
                    }
                }
                const seg = [];
                for (let k = 0; k < len; k++) { const t = track[i - k]; if (t) seg.push({ x: t[0], y: t[1], f: k === 0 ? '#FFF3E6' : '#FFD08A' }); }
                ps.snake = seg; drawSnake();
            }, 85);
        });
    }

    // ================= Tore (V4Autopilot.gate) =================

    function gate(t, k) {
        if (world === 'round') {
            if (t === 'morph') {
                R({ s: 'OPEN', p: 0, ey: 0, d: .6 });
                at(300, () => { pixReset(); setAnim('pop'); showWorld('pixel'); });
                at(1700, () => { world = 'pixel'; setAnim(''); k(); });
            }
            if (t === 'rain') {
                R({ s: 'LID', p: 1, x: 0, y: 0 });
                at(500, () => R({ s: 'LID', p: 1, x: 0, y: -6, pd: .9 }));
                at(1500, () => R({ s: 'OPEN', p: 0, x: 0, y: -6 }));
                at(2000, () => { world = 'pixel'; showWorld('pixel'); px('rain', () => { pixReset(); k(); }); });
            }
            if (t === 'crt') {
                R({ s: 'HALF', p: 0 });
                at(900, () => R({ s: 'LINE', p: 0, ey: -4 }));            // Strich auf Bildmitte
                at(1800, () => lids.forEach(l => { l.style.transition = 'stroke-width .5s steps(5)'; l.setAttribute('stroke-width', 1); l.style.strokeWidth = '1px'; }));
                at(2400, () => {
                    world = 'pixel'; showWorld('pixel');
                    lids.forEach(l => { l.style.transition = ''; l.style.strokeWidth = ''; });
                    px('crt', () => { pixReset(); k(); }, { thin: true });
                });
            }
            if (t === 'snake') {
                // Runde Augen mit Pupillen (geradeaus) -> Pixel-Augen MIT Pixel-Pupillen, Pause, dann Schlange
                R({ s: 'LID', p: 1, x: 0, y: 0 });
                at(900, () => {
                    world = 'pixel'; pixReset();
                    const path = snakePath(Math.random() < .5);
                    ps.pups = [path.P1, path.P2]; drawPups(); setAnim('pop'); showWorld('pixel');
                    // Verwandlung (~1,4 s), dann zeigt snakeRun die Pupillen ~1 s, dann startet die Schlange
                    at(1400, () => px('snake', () => { pixReset(); k(); }, { preset: path }));
                });
            }
        } else {
            if (t === 'morph') {
                setAnim('unpop');
                R({ s: 'OPEN', p: 0, ey: 0, d: .01 });
                at(900, () => { eyes.classList.remove('off'); });
                at(1700, () => { world = 'round'; pix.style.opacity = 0; setAnim(''); k(); });
            }
            if (t === 'over') {
                px('over', () => { pixReset(); popUp(k); });
            }
        }
    }

    // nach Game Over kurz rund auftauchen
    function popUp(k) {
        world = 'round'; showWorld('round');
        R({ s: 'CLOSED', p: 0, ey: 0, d: .01, ed: .01 });
        at(250, () => R({ s: 'OPEN', p: 0, ey: 0, d: .7 }));
        at(1000, k);
    }

    // ================= Ablaufsteuerung =================

    function begin(name, kind) { running = { name, kind }; btn.classList.add('gagging'); }
    function finish() {
        running = null;
        btn.classList.remove('gagging');
        if (pendingSync && syncing) { pendingSync = false; startSync(); return; }
        pendingSync = false;
    }

    // Sofort in die Grundpose der aktuellen Welt (Abbruch durch Berührung)
    function snapToBase(forceRound) {
        clearAll();
        fx.innerHTML = '';
        if (forceRound || world === 'round') {
            world = 'round';
            pix.style.opacity = 0; pixReset();
            eyes.classList.remove('off');
            R({ s: 'OPEN', p: 0, ey: 0, d: .4, pd: .3, ed: .4 });
        } else {
            pixReset(); showWorld('pixel');
        }
        running = null; auto = false;
        btn.classList.remove('gagging');
    }

    function schedule(min, max) { nextAt = Date.now() + rnd(min, max); }

    // Autopilot: Phasen statt Hin und Her (rund 3–5, Pixel 2–3 Gags), Wechsel nur über Tore aus „Bogen offen“
    function nextAuto() {
        if (!auto) return;
        if (world === 'round') {
            if (left > 0) {
                left--;
                const g = pickOther(['curious', 'roll', 'blink', 'sleep', 'look'], lastR); lastR = g;
                begin(g, 'gag');
                if (g === 'sleep') hooks.say?.(pick(LINES.sleep));
                steps(SEQ[g](), () => { finish(); auto = true; at(gapBetween(), nextAuto); });
            } else {
                const t = pickOther(['morph', 'rain', 'crt', 'snake'], lastIn); lastIn = t;
                begin('gate-' + t, 'gate');
                gate(t, () => { finish(); auto = true; left = rnd(2, 3); at(1200, nextAuto); });
            }
        } else {
            if (left > 0) {
                left--;
                const g = pickOther(['wave', 'snake', 'wink', 'bricks'], lastP); lastP = g;
                begin(g, 'gag');
                if (g === 'wink') hooks.say?.(pick(LINES.wink));
                px(g, () => { pixReset(); finish(); auto = true; at(gapBetween(), nextAuto); });
            } else {
                const t = Math.random() < .5 ? 'morph' : 'over';
                begin('gate-' + t, 'gate');
                gate(t, () => { finish(); auto = true; left = rnd(3, 5); at(1500, nextAuto); });
            }
        }
    }

    function tick() {
        if (running || auto || !funEnabled() || document.hidden) return;
        if (Date.now() < nextAt) return;
        if (!hooks.canIdle?.()) { schedule(2000, 3000); return; }
        auto = true;
        if (left === undefined) left = world === 'round' ? rnd(3, 5) : rnd(2, 3);
        nextAuto();
    }

    // Berührung bricht Leerlauf-Gags ab (Ereignisse laufen weiter)
    function touch() {
        if (auto || (running && running.kind === 'gag')) snapToBase(false);
        scheduleFirst();
    }

    // ---------- Ereignisse (Vorrang; ggf. kurz über „Verwandlung“ in die passende Welt und zurück) ----------
    function event(name, need, playFn) {
        if (!feedbackOn()) return;
        if (running?.kind === 'game') return;
        clearAll(); fx.innerHTML = '';
        auto = false;
        const back = world;
        begin('ev-' + name, 'event');
        const after = () => {
            const end = () => { finish(); scheduleFirst(); };
            if (world !== back) gate('morph', end); else end();
        };
        // Aus laufendem Ablauf zuerst in die Grundpose der aktuellen Welt
        if (world === 'round') R({ s: 'OPEN', p: 0, ey: 0, d: .3, pd: .2 }); else pixReset();
        const go = () => playFn(after);
        if (world !== need) gate('morph', go); else go();
    }

    function react(kind, opts = {}) {
        if (kind === 'done') {
            // Erfolg: abwechselnd La-Ola, Extra Life, Game Over (Hyperraum leer = immer Extra Life)
            const g = opts.hyperspaceEmpty ? 'hearts' : pickOther(['wave', 'hearts', 'over'], lastDone);
            lastDone = g;
            event('done', 'pixel', k => px(g, () => {
                pixReset();
                if (g !== 'over') { k(); return; }
                popUp(k);
            }));
        } else if (kind === 'move') {
            event('move', 'round', k => steps(SEQ.roll(), k));
        } else if (kind === 'del') {
            const g = pickOther(['blink', 'over'], lastDel); lastDel = g;
            if (g === 'blink') event('del', 'round', k => steps(SEQ.blink(), k));
            else event('del', 'pixel', k => px('over', () => { pixReset(); popUp(k); }));
        }
    }

    function startSync() {
        event('sync', 'pixel', k => px('load', () => { pixReset(); k(); }));
    }
    // Abgleich (Babelfisch) läuft -> Loading; true = Start, false = fertig
    function sync(on) {
        syncing = !!on;
        if (on) {
            if (running && running.name === 'start') return; // Start-Ablauf zeigt das Laden selbst
            if (running && running.kind === 'event') { pendingSync = true; return; }
            startSync();
        } else {
            loadRun.onSynced?.();
        }
    }

    // Blick beim Scrollen / Drehrad (nur runde Welt, ohne Klick)
    let glanceTimer = null;
    function glance(dx, dy) {
        if (!funEnabled() || world !== 'round') return;
        if (running && running.kind !== 'glance') { if (running.kind !== 'gag') return; snapToBase(false); }
        if (!running) begin('glance', 'glance');
        R({ s: 'LID', p: 1, x: dx, y: dy, pd: .18, d: .3 });
        clearTimeout(glanceTimer);
        glanceTimer = setTimeout(() => {
            if (running?.kind !== 'glance') return;
            R({ s: 'OPEN', p: 0, ey: 0, d: .5, pd: .3 });
            setTimeout(() => { if (running?.kind === 'glance') finish(); }, 500);
        }, 1100);
        scheduleFirst();
    }

    const LINES = {
        sleep: ['Ich mach kurz die Augen zu. Weck mich, wenn das Universum endet.', 'Ruhezustand. Der einzig vernünftige.'],
        wink: ['Das bleibt unter uns.', 'Du hast nichts gesehen.'],
        arkStart: ['Ach, 1986 … da hatte ich noch knackige 8 Bit.'],
        arkMiss: ['Verfehlt. Natürlich Absicht.'],
        arkWin: ['Alle Pixel weg. Wie meine Lebensfreude. Neu sortieren …'],
    };
    const pick = arr => arr[Math.floor(Math.random() * arr.length)];

    // ================= Arkanoid (2× tippen) =================
    function arkanoid() {
        snapToBase(false);
        begin('arkanoid', 'game');
        const { width: W, height: H } = btn.getBoundingClientRect();
        const s = 1.6, r = 6, padW = 70, padY = H - 16, left_ = 40, right = W - 40, top = 4;
        const cy = H * .43;
        const bricks = [];
        [W / 2 - 60, W / 2 + 60].forEach(cx => BASE.map(q => [q[0], q[1], 8, 8]).forEach(p => bricks.push({ x: cx + p[0] * s, y: cy + p[1] * s, w: p[2] * s - 1.5, h: p[3] * s - 1.5 })));
        fx.innerHTML = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" style="left:0;top:0">
            <g style="filter:drop-shadow(0 0 6px #FF9A3C)">
              ${bricks.map((b, i) => `<rect class="brick" data-i="${i}" x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" fill="${C}" style="animation-delay:${(i * .05).toFixed(2)}s"/>`).join('')}
              <rect class="pad" x="${W / 2 - padW / 2}" y="${padY}" width="${padW}" height="6" rx="3" fill="${C}"/>
            </g><circle class="ball" r="${r}" fill="#FFF3E6" style="filter:drop-shadow(0 0 6px #FFB060)"/></svg>`;
        eyes.classList.add('off'); pix.style.opacity = 0;
        const svg = fx.querySelector('svg'), ball = svg.querySelector('.ball'), pad = svg.querySelector('.pad');
        let bx, by, vx, vy, pxp = W / 2 - padW / 2, raf = 0, last = performance.now(), ended = false;
        const serve = () => { const a = -Math.PI / 2 + (Math.random() - .5) * 1.2; bx = W / 2; by = padY - 20; vx = Math.cos(a) * 240; vy = Math.sin(a) * 240; };
        serve();
        const end = (won) => {
            if (ended) return;
            ended = true; cancelAnimationFrame(raf);
            if (won) hooks.say?.(LINES.arkWin[0]);
            fx.innerHTML = '';
            // Augen sortieren sich neu: Pixel-Bogen baut sich auf, weiter in der Pixel-Welt
            world = 'pixel'; left = rnd(2, 3); pixReset(); setAnim('pop'); showWorld('pixel');
            at(1500, () => { setAnim(''); finish(); scheduleFirst(); });
        };
        const step = (t) => {
            const dt = Math.min(.033, (t - last) / 1000); last = t;
            bx += vx * dt; by += vy * dt;
            if (bx < left_ + r) { bx = left_ + r; vx = Math.abs(vx); }
            if (bx > right - r) { bx = right - r; vx = -Math.abs(vx); }
            if (by < top + r) { by = top + r; vy = Math.abs(vy); }
            const target = bx - padW / 2 + Math.sin(t / 700) * 14;
            pxp += (target - pxp) * Math.min(1, dt * 5.5);
            pxp = Math.max(left_ - 10, Math.min(right - padW + 10, pxp));
            if (vy > 0 && by + r >= padY && by + r <= padY + 10 && bx >= pxp - 4 && bx <= pxp + padW + 4) {
                const off = (bx - (pxp + padW / 2)) / (padW / 2), sp = Math.hypot(vx, vy) * 1.02, ang = -Math.PI / 2 + off;
                vx = Math.cos(ang) * sp; vy = Math.sin(ang) * sp; by = padY - r;
            }
            if (by > H + 10) { hooks.say?.(LINES.arkMiss[0]); serve(); }
            for (const b of bricks) {
                if (b.dead) continue;
                const cx = Math.max(b.x, Math.min(bx, b.x + b.w)), cyy = Math.max(b.y, Math.min(by, b.y + b.h));
                if ((bx - cx) ** 2 + (by - cyy) ** 2 < r * r) {
                    const ox = Math.min(Math.abs(bx - b.x), Math.abs(bx - b.x - b.w)), oy = Math.min(Math.abs(by - b.y), Math.abs(by - b.y - b.h));
                    if (ox < oy) vx = -vx; else vy = -vy;
                    svg.querySelector(`.brick[data-i="${bricks.indexOf(b)}"]`)?.remove();
                    b.dead = true; break;
                }
            }
            if (bricks.every(b => b.dead)) { end(true); return; }
            ball.setAttribute('cx', bx.toFixed(1)); ball.setAttribute('cy', by.toFixed(1)); pad.setAttribute('x', pxp.toFixed(1));
            raf = requestAnimationFrame(step);
        };
        hooks.say?.(LINES.arkStart[0]);
        at(10000, () => end(false)); // spätestens nach ~10 s
        raf = requestAnimationFrame(step);
        arkanoid.stop = () => { ended = true; cancelAnimationFrame(raf); };
    }

    // ================= Öffentlich =================
    return {
        init(h) {
            hooks = h || {};
            btn = document.getElementById('marvin-btn');
            build();
            pixReset();
            initTilt();
            // App-Start: sofort Laden (Pixel), danach Verwandlung in die runden Bögen, dann „Schauen“
            if (feedbackOn()) {
                begin('start', 'event');
                eyes.style.transition = 'none'; world = 'pixel'; showWorld('pixel');
                void eyes.getBoundingClientRect(); eyes.style.transition = '';
                px('load', () => {
                    // Verwandlung zurück: Pixel blenden aus, runde Bögen kommen
                    pix.style.opacity = 0; pixReset(); R({ s: 'OPEN', p: 0, ey: 0, d: .01 });
                    at(300, () => eyes.classList.remove('off'));
                    at(1100, () => {
                        world = 'round'; pix.style.opacity = 0; setAnim('');
                        // kurz Bögen, dann Schauen (als Gag: Neigen oder Berühren unterbricht)
                        at(900, () => { begin('look', 'gag'); steps(SEQ.look(), () => { finish(); scheduleFirst(); }); });
                    });
                }, { start: true });
            }
            else { world = 'round'; showWorld('round'); R({ s: 'OPEN', p: 0, ey: 0, d: .6 }); nextAt = Infinity; }
            setInterval(tick, 500);
        },
        react,
        sync,
        glance,
        touch,
        // Abbruch (z.B. Zuhören startet): immer zurück in die runde Grundpose, damit die Zustands-Animationen greifen
        abort() { arkanoid.stop?.(); snapToBase(true); scheduleFirst(); },
        arkanoid() { if (funEnabled()) arkanoid(); },
        isBusy: () => !!running,
        isGame: () => running?.kind === 'game',
        funEnabled,
        setBase() { /* v4: keine statischen Posen mehr – alle Abläufe enden in „Bogen offen“ */ },
        flash() { react('move'); },
        _snakePath: snakePath, _PX_OPEN: PX_OPEN, // für Tests
        _state: () => ({ world, running: running && running.name, auto, left }),
        _play(name) {
            clearAll(); fx.innerHTML = ''; auto = false;
            const back = () => { finish(); scheduleFirst(); };
            const toRound = (f) => world === 'round' ? f() : gate('morph', f);
            const toPixel = (f) => world === 'pixel' ? f() : gate('morph', f);
            if (world === 'round') R({ s: 'OPEN', p: 0, ey: 0, d: .3 }); else pixReset();
            begin(name, 'gag');
            if (SEQ[name] && name !== 'wake') toRound(() => steps(SEQ[name](), back));
            else if (name.startsWith('gate-')) { const t = name.slice(5); (t === 'over' ? toPixel : toRound)(() => gate(t, back)); }
            else toPixel(() => px(name, () => { pixReset(); back(); }));
        },
    };

    // Starkes Neigen (runde Welt): Ablauf pausiert, Augen folgen; nach 1,5 s Ruhe geht es weiter
    function tiltFollow(tx, ty) {
        if (!funEnabled() || world !== 'round') return;
        if (!tiltRest) tiltRest = { tx, ty };
        const moved = !tiltLast || Math.abs(tx - tiltLast.tx) > .03 || Math.abs(ty - tiltLast.ty) > .03;
        tiltLast = { tx, ty };
        const dx = tx - tiltRest.tx, dy = ty - tiltRest.ty;
        const strong = Math.hypot(dx, dy) > .3;
        if (running?.name !== 'tilt') {
            if (!strong) { tiltRest.tx += dx * .05; tiltRest.ty += dy * .05; return; } // Ruhelage gleitet mit
            if (running) { if (running.kind !== 'gag' && running.kind !== 'glance') return; snapToBase(false); }
            begin('tilt', 'glance');
        }
        if (!tiltRaf) { tiltRaf = true; requestAnimationFrame(() => {
            tiltRaf = false;
            // alle Richtungen, begrenzt: links/rechts ±10, oben/unten ±5
            const x = Math.max(-10, Math.min(10, dx * 16)), y = Math.max(-5, Math.min(5, -dy * 12)); // zu sich neigen = nach oben schauen
            R({ s: 'LID', p: 1, x, y, pd: .15, d: .3 });
        }); }
        if (!moved) return; // Zittern am Tisch hält den Modus nicht offen
        clearTimeout(tiltTimer);
        tiltTimer = setTimeout(() => {
            if (running?.name !== 'tilt') return;
            tiltRest = tiltLast ? { ...tiltLast } : null; // neue Lage = Ruhelage
            R({ s: 'OPEN', p: 0, ey: 0, d: .6, od: .4 });
            setTimeout(() => { if (running?.name === 'tilt') { finish(); scheduleFirst(); } }, 700);
        }, 1500);
    }

    // ---------- v3 Neigungs-Glas ----------
    function initTilt() {
        if (reducedMotion()) return;
        let pending = null;
        window.addEventListener('deviceorientation', (e) => {
            if (e.gamma == null || e.beta == null) return;
            const tx = Math.max(-1, Math.min(1, e.gamma / 30)), ty = Math.max(-1, Math.min(1, (e.beta - 45) / 30));
            if (!pending) requestAnimationFrame(() => {
                document.documentElement.style.setProperty('--tx', pending.tx.toFixed(3));
                document.documentElement.style.setProperty('--ty', pending.ty.toFixed(3));
                pending = null;
            });
            pending = { tx, ty };
            tiltFollow(Math.max(-2, Math.min(2, e.gamma / 30)), Math.max(-2, Math.min(2, (e.beta - 45) / 30))); // ungekappt: auch flach am Tisch reagiert oben/unten
        });
    }
})();
