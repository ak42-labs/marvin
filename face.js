// Marvins Gesicht – UX v2 §7 (Mockup "Augen-Galerie v2.2", "Arkanoid", "Neigungs-Glas")
// Formen, Leerlauf-Gags, Reaktionen, Arkanoid-Easter-Egg, Neigungs-Glas.
// Schnittstelle für app.js: Face.init(hooks), setBase, flash, react, arkanoid, touch, abort, isBusy, funEnabled.

const Face = (() => {
    const C = '#FFB25C';
    const STAR = '0,-16 4,-5.5 15.2,-4.9 6.5,2.1 9.4,12.9 0,6.7 -9.4,12.9 -6.5,2.1 -15.2,-4.9 -4,-5.5';
    const SMALL_STAR = '0,-5 1.3,-1.6 5,-1.5 2,0.8 3,4.5 0,2.3 -3,4.5 -2,0.8 -5,-1.5 -1.3,-1.6';
    const PX5 = [[-24, 4, 8, 8], [-16, -4, 8, 8], [-8, -8, 16, 8], [8, -4, 8, 8], [16, 4, 8, 8]];
    const PX6 = [[-24, 4, 8, 8], [-16, -4, 8, 8], [-8, -8, 8, 8], [0, -8, 8, 8], [8, -4, 8, 8], [16, 4, 8, 8]];
    const rnd = (a, b) => a + Math.random() * (b - a);
    const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    let btn, eyes, fx, hooks = {};
    let base = { shape: 'arc', pose: '' };
    let running = null;        // { name, timer, cleanup }
    let nextAt = Infinity;
    let lastGag = '';

    // ---------- Formen (lokal um 0,0; side 1 = links, -1 = rechts) ----------

    function shape(name, side) {
        const rect = (r, cls, style = '') => `<rect class="${cls}" x="${r[0]}" y="${r[1]}" width="${r[2]}" height="${r[3]}" fill="${C}" style="${style}"/>`;
        const arc = `<path class="arcS" d="M-23 8 Q0 -10 23 8" stroke="${C}" stroke-width="7" stroke-linecap="round" fill="none"/>`;
        switch (name) {
            case 'lp': return `<path class="lid" d="M-23 2 Q0 -12 23 2" stroke="${C}" stroke-width="5" stroke-linecap="round" fill="none"/>` +
                `<g class="pw"><circle class="pup" cx="0" cy="11" r="5" fill="#FFF3E6"/></g>`;
            case 'hang': return `<path d="${side === 1 ? 'M-23 14 Q-3 -6 23 4' : 'M23 14 Q3 -6 -23 4'}" stroke="${C}" stroke-width="6" stroke-linecap="round" fill="none"/>`;
            case 'sleep': return `<path d="M-21 4 Q0 16 21 4" stroke="${C}" stroke-width="6" stroke-linecap="round" fill="none"/>`;
            case 'done': return arc + `<polygon class="starS" points="${STAR}" fill="#FFE2B0" opacity="0"/>`;
            case 'del': return `<path class="xS" d="M-12 -10 L12 10 M12 -10 L-12 10" stroke="${C}" stroke-width="6" stroke-linecap="round"/>` + arc;
            case 'pxSort': return PX6.map(r => rect(r, 'px',
                `--dx:${rnd(-40, 40).toFixed(0)}px;--dy:${rnd(-60, -15).toFixed(0)}px;--r:${rnd(-180, 180).toFixed(0)}deg;animation-delay:${rnd(0, .45).toFixed(2)}s`)).join('');
            case 'pxBoom': return PX5.map((r, i) => rect(r, 'p' + (i + 1))).join('');
            case 'pxSwap': return PX5.map((r, i) => {
                const k = i + 1;
                return rect(r, 'sw', `--sx:${side * 76}px;--sy:${side * (k % 2 ? -1 : 1) * (8 + k * 3)}px;animation-delay:${(k * 0.06).toFixed(2)}s`);
            }).join('');
            default: return arc;
        }
    }

    function setShape(name) {
        eyes.querySelectorAll('.eye').forEach(g => {
            const side = g.classList.contains('left') ? 1 : -1;
            g.innerHTML = shape(name, side);
        });
        eyes.dataset.shape = name;
    }

    function applyBase() {
        btn.classList.remove('p-up', 'p-bored');
        setShape(base.shape);
        if (base.pose) btn.classList.add(base.pose);
    }

    // ---------- Aufbau ----------

    function build() {
        btn.insertAdjacentHTML('beforeend', `
            <svg class="eyes" aria-hidden="true" width="170" height="64" viewBox="0 0 170 64">
                <g class="eyes-g">
                    <g transform="translate(47 32)"><g class="eye left"></g></g>
                    <g transform="translate(123 32)"><g class="eye right"></g></g>
                </g>
                <g class="zz-layer"></g>
            </svg>
            <div id="fx"></div>`);
        eyes = btn.querySelector('.eyes');
        fx = btn.querySelector('#fx');
        applyBase();
    }

    // ---------- Ablaufsteuerung ----------

    const GAG_CLASSES = ['g-look', 'g-up', 'g-each', 'g-roll', 'g-bored', 'g-blink', 'g-sleep',
        'r-done', 'r-del', 'r-shock', 'r-frown', 'gagging'];

    function stop() {
        if (!running) return;
        clearTimeout(running.timer);
        running.cleanup?.();
        running = null;
        btn.classList.remove(...GAG_CLASSES);
        eyes.querySelector('.zz-layer').innerHTML = '';
        fx.innerHTML = '';
        eyes.style.opacity = '';
        applyBase();
    }

    // Eine Sequenz abspielen: Form setzen, Klasse an den Knopf, nach ms zurück
    function play(name, { shapeName, cls, ms, cleanup }) {
        stop();
        btn.classList.add('gagging');
        btn.classList.remove('p-up', 'p-bored');
        if (shapeName) setShape(shapeName);
        if (cls) btn.classList.add(cls);
        running = { name, cleanup, timer: setTimeout(() => { stop(); schedule(12000, 20000); }, ms) };
    }

    function funEnabled() {
        let v = '';
        try { v = localStorage.getItem('marvin.fun') || ''; } catch {}
        return v !== 'off' && !reducedMotion();
    }

    function schedule(min, max) { nextAt = Date.now() + rnd(min, max); }

    // ---------- Leerlauf-Gags ----------

    const GAGS = {
        look:   () => play('look', { shapeName: 'lp', cls: 'g-look', ms: 3000 }),
        up:     () => play('up', { shapeName: 'lp', cls: 'g-up', ms: 3000 }),
        each:   () => play('each', { shapeName: 'lp', cls: 'g-each', ms: 3000 }),
        roll:   () => play('roll', { shapeName: 'lp', cls: 'g-roll', ms: 3200 }),
        bored:  () => { play('bored', { shapeName: 'lp', cls: 'g-bored', ms: 4000 }); hooks.say?.(pickLine('bored')); },
        blink:  () => play('blink', { shapeName: base.shape === 'lp' ? 'arc' : base.shape, cls: 'g-blink', ms: 2400 }),
        pxSort: () => play('pxSort', { shapeName: 'pxSort', ms: 3000 }),
        pxBoom: () => { play('pxBoom', { shapeName: 'pxBoom', ms: 3000 }); hooks.say?.(pickLine('boom')); },
        pxSwap: () => play('pxSwap', { shapeName: 'pxSwap', ms: 3400 }),
        sleep:  () => {
            play('sleep', { shapeName: 'sleep', cls: 'g-sleep', ms: 4200 });
            // drei Z, Start leicht links vom Anfang des rechten Bogens (x≈90 von 170)
            eyes.querySelector('.zz-layer').innerHTML =
                `<text class="zz" x="90" y="40" font-family="Michroma" font-size="11" fill="#FFD08A">z</text>` +
                `<text class="zz" x="92" y="36" font-family="Michroma" font-size="14" fill="#FFD08A" style="animation-delay:.9s">Z</text>` +
                `<text class="zz" x="94" y="32" font-family="Michroma" font-size="17" fill="#FFD08A" style="animation-delay:1.8s">Z</text>`;
            hooks.say?.(pickLine('sleep'));
        },
    };

    const LINES = {
        bored: ['Langweilig. Wie erwartet.', 'Nichts passiert. Mein Lieblingszustand. Fast.'],
        boom:  ['Ups. Das war ich nicht.', 'Ich war kurz woanders. In Einzelteilen.'],
        sleep: ['Ich mach kurz die Augen zu. Weck mich, wenn das Universum endet.', 'Ruhezustand. Der einzig vernünftige.'],
        arkStart: ['Arkanoid. 1986. Ich habe es damals schon durchgespielt. In Gedanken.', 'Ich spiele ein bisschen. Mit mir selbst. Wie immer.'],
        arkMiss: ['Verfehlt. Absichtlich. Glaube ich.'],
        arkWin: ['Alle Pixel weg. Wie meine Lebensfreude. Neu sortieren …'],
    };
    const pickLine = k => LINES[k][Math.floor(Math.random() * LINES[k].length)];

    function runRandomGag() {
        if (Math.random() < 1 / 8) { arkanoid(); return; }
        const names = Object.keys(GAGS).filter(n => n !== lastGag);
        const name = names[Math.floor(Math.random() * names.length)];
        lastGag = name;
        GAGS[name]();
    }

    function tick() {
        if (running || !funEnabled() || document.hidden) return;
        if (Date.now() < nextAt) return;
        if (!hooks.canIdle?.()) { schedule(3000, 5000); return; }
        runRandomGag();
    }

    // Jede Berührung bricht Gags ab und startet die Leerlauf-Uhr neu (Reaktionen laufen weiter)
    function touch() {
        if (running && !running.name.startsWith('r-')) stop();
        schedule(6000, 8000);
    }

    // ---------- Reaktionen ----------

    function react(kind) {
        if (!funEnabled()) return;
        if (kind === 'done') {
            play('r-done', { shapeName: 'done', cls: 'r-done', ms: 3300 });
            rain();
        } else if (kind === 'del') {
            play('r-del', { shapeName: 'del', cls: 'r-del', ms: 3100 });
        } else if (kind === 'shock' || kind === 'frown') {
            play('r-' + kind, { shapeName: 'lp', cls: 'r-' + kind, ms: 3300 });
        }
    }

    // Sternenregen über die ganze Knopffläche: 16 Sterne, Verzögerung 0.5–2.1 s, Fall 40 px
    function rain() {
        const { width: W, height: H } = btn.getBoundingClientRect();
        let drops = '';
        for (let i = 0; i < 16; i++) {
            drops += `<g transform="translate(${rnd(6, W - 6).toFixed(0)} ${rnd(6, H * .45).toFixed(0)})">` +
                `<polygon class="fall" points="${SMALL_STAR}" fill="#FFE2B0" style="animation-delay:${rnd(.5, 2.1).toFixed(2)}s"/></g>`;
        }
        fx.innerHTML = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" style="left:0;top:0;filter:drop-shadow(0 0 4px #FFB060)">${drops}</svg>`;
    }

    // ---------- Arkanoid (2× tippen oder seltener Leerlauf-Gag) ----------

    function arkanoid() {
        stop();
        const { width: W, height: H } = btn.getBoundingClientRect();
        const s = 1.6, r = 6, padW = 70, padY = H - 16, left = 40, right = W - 40, top = 12;
        const centers = [W / 2 - 60, W / 2 + 60], cy = H * 0.43;
        let bricks = [];
        centers.forEach(cx => PX6.forEach(p => bricks.push({ x: cx + p[0] * s, y: cy + p[1] * s, w: p[2] * s - 1.5, h: p[3] * s - 1.5 })));
        fx.innerHTML = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" style="left:0;top:0">
            <g style="filter:drop-shadow(0 0 6px #FF9A3C)">
                ${bricks.map((b, i) => `<rect class="brick" data-i="${i}" x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" fill="${C}" style="animation-delay:${(i * .05).toFixed(2)}s"/>`).join('')}
                <rect class="pad" x="${W / 2 - padW / 2}" y="${padY}" width="${padW}" height="6" rx="3" fill="${C}"/>
            </g>
            <circle class="ball" r="${r}" fill="#FFF3E6" style="filter:drop-shadow(0 0 6px #FFB060)"/>
        </svg>`;
        eyes.style.opacity = '0';
        const svg = fx.querySelector('svg'), ball = svg.querySelector('.ball'), pad = svg.querySelector('.pad');

        let bx, by, vx, vy, px = W / 2 - padW / 2, raf = 0, last = performance.now(), ended = false;
        const serve = () => {
            const a = -Math.PI / 2 + (Math.random() - .5) * 1.2;
            bx = W / 2; by = padY - 20; vx = Math.cos(a) * 240; vy = Math.sin(a) * 240;
        };
        serve();

        const finish = (won) => {
            if (ended) return;
            ended = true;
            cancelAnimationFrame(raf);
            if (won) hooks.say?.(LINES.arkWin[0]);
            // Augen sortieren sich neu (Pixel-Einfall), dann Grundform
            fx.innerHTML = '';
            eyes.style.opacity = '';
            clearTimeout(running.timer);
            running.cleanup = null;
            running.name = 'sort';
            setShape('pxSort');
            running.timer = setTimeout(() => { stop(); schedule(12000, 20000); }, 3000);
        };

        const step = (t) => {
            const dt = Math.min(0.033, (t - last) / 1000);
            last = t;
            bx += vx * dt; by += vy * dt;
            if (bx < left + r) { bx = left + r; vx = Math.abs(vx); }
            if (bx > right - r) { bx = right - r; vx = -Math.abs(vx); }
            if (by < top + r) { by = top + r; vy = Math.abs(vy); }
            // Schläger folgt träge + leichtes Wackeln -> verfehlt gelegentlich
            const target = bx - padW / 2 + Math.sin(t / 700) * 14;
            px += (target - px) * Math.min(1, dt * 5.5);
            px = Math.max(left - 10, Math.min(right - padW + 10, px));
            if (vy > 0 && by + r >= padY && by + r <= padY + 10 && bx >= px - 4 && bx <= px + padW + 4) {
                const off = (bx - (px + padW / 2)) / (padW / 2);
                const sp = Math.hypot(vx, vy) * 1.02;
                const ang = -Math.PI / 2 + off * 1.0;
                vx = Math.cos(ang) * sp; vy = Math.sin(ang) * sp; by = padY - r;
            }
            if (by > H + 10) { hooks.say?.(LINES.arkMiss[0]); serve(); }
            for (const b of bricks) {
                const cx = Math.max(b.x, Math.min(bx, b.x + b.w)), cyy = Math.max(b.y, Math.min(by, b.y + b.h));
                if ((bx - cx) ** 2 + (by - cyy) ** 2 < r * r) {
                    const ox = Math.min(Math.abs(bx - b.x), Math.abs(bx - b.x - b.w));
                    const oy = Math.min(Math.abs(by - b.y), Math.abs(by - b.y - b.h));
                    if (ox < oy) vx = -vx; else vy = -vy;
                    svg.querySelector(`.brick[data-i="${bricks.indexOf(b)}"]`)?.remove();
                    b.dead = true;
                    break;
                }
            }
            if (bricks.every(b => b.dead)) { finish(true); return; }
            ball.setAttribute('cx', bx.toFixed(1)); ball.setAttribute('cy', by.toFixed(1));
            pad.setAttribute('x', px.toFixed(1));
            raf = requestAnimationFrame(step);
        };

        stop();
        btn.classList.add('gagging');
        running = {
            name: 'arkanoid',
            cleanup: () => { ended = true; cancelAnimationFrame(raf); },
            timer: setTimeout(() => finish(false), 10000), // spätestens nach ~10 s Ende
        };
        hooks.say?.(pickLine('arkStart'));
        raf = requestAnimationFrame(step);
    }

    // ---------- v3 Neigungs-Glas (bewusst minimal) ----------

    function initTilt() {
        if (reducedMotion()) return;
        let pending = null;
        window.addEventListener('deviceorientation', (e) => {
            if (e.gamma == null || e.beta == null) return;
            const tx = Math.max(-1, Math.min(1, e.gamma / 30));
            const ty = Math.max(-1, Math.min(1, (e.beta - 45) / 30));
            if (!pending) requestAnimationFrame(() => {
                document.documentElement.style.setProperty('--tx', pending.tx.toFixed(3));
                document.documentElement.style.setProperty('--ty', pending.ty.toFixed(3));
                pending = null;
            });
            pending = { tx, ty };
        });
    }

    // ---------- öffentliche Schnittstelle ----------

    return {
        init(h) {
            hooks = h || {};
            btn = document.getElementById('marvin-btn');
            build();
            initTilt();
            schedule(6000, 8000);
            setInterval(tick, 500);
        },
        // Grundgesicht aus der Lage: 'arc' (Standard), 'up' (Termin heute: Blick zur Uhr), 'bored' (viel Überfälliges)
        setBase(name) {
            base = name === 'up' ? { shape: 'lp', pose: 'p-up' }
                : name === 'bored' ? { shape: 'lp', pose: 'p-bored' }
                : { shape: 'arc', pose: '' };
            if (!running) applyBase();
        },
        // Kurzzeitig eine Form zeigen (z.B. 'hang' für Dauerverschieber)
        flash(name, ms = 6000) { play('flash', { shapeName: name, ms }); },
        react,
        arkanoid() { if (funEnabled()) arkanoid(); },
        touch,
        abort: stop,
        isBusy: () => !!running,
        isGame: () => running?.name === 'arkanoid',
        funEnabled,
    };
})();
