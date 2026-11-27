// Offline-Test-Suite (ux-v3.1 §3). Start: node tests/offline.test.js
// Simuliertes Handy (Pixel 7), Backend + Gemini als Attrappe im Speicher, Netz an/aus/langsam per Schalter.
const { chromium, devices } = require('playwright');
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const ORIGIN = 'http://marvin.test/';
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png' };

function makeServer() {
    const now = () => new Date().toISOString();
    const s = {
        down: false, delay: 0, getAllDelay: 0, hang: false, calls: [],
        tasks: [
            { id: 't1', title: 'Mutter anrufen', status: 'todo', category_id: '', due_date: '', notes: '', updated_at: '2026-11-01T10:00:00Z', status_since: '2026-11-01T10:00:00Z' },
            { id: 't2', title: 'Steuer', status: 'backlog', category_id: '', due_date: '', notes: '', updated_at: '2026-11-01T10:00:00Z', status_since: '2026-11-01T10:00:00Z' },
        ],
        events: [], n: 0,
    };
    s.handle = (b) => {
        s.calls.push(b.action);
        const ok = (data) => ({ status: 'success', data, info: {} });
        switch (b.action) {
            case 'getAll': return ok({ tasks: JSON.parse(JSON.stringify(s.tasks)), events: JSON.parse(JSON.stringify(s.events)), categories: [], terms: [], shop_aisles: [], shop_items: [], settings: {} });
            case 'addTask': { const t = { ...b.task, id: 'srv' + (++s.n), updated_at: now(), status_since: now() }; s.tasks.push(t); return ok(t); }
            case 'updateTask': { const t = s.tasks.find(x => x.id === b.id); if (!t) return { status: 'error', message: 'nicht gefunden' }; Object.assign(t, b.changes, { updated_at: now() }); return ok(t); }
            case 'updateTasks': return ok(b.items.map(i => Object.assign(s.tasks.find(x => x.id === i.id) || {}, i.changes)));
            case 'deleteTask': { s.tasks = s.tasks.filter(x => x.id !== b.id); return ok(true); }
            case 'importTasks': return ok({ tasks: [] });
            default: return ok({});
        }
    };
    return s;
}

async function setup(browser, server, gemini) {
    const ctx = await browser.newContext({ ...devices['Pixel 7'], serviceWorkers: 'block' });
    await ctx.route('**/*', async (route) => {
        const url = route.request().url();
        if (url.startsWith('https://script.google.com/')) {
            if (server.down) return route.abort('internetdisconnected');
            const body = JSON.parse(route.request().postData() || '{}');
            const wait = body.action === 'getAll' ? server.getAllDelay : server.delay;
            if (server.hang) return; // antwortet nie
            const res = server.handle(body); // Server verarbeitet sofort, Antwort kommt verzögert (wie echtes Netz)
            if (wait) await new Promise(r => setTimeout(r, wait));
            return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(res) }).catch(() => {});
        }
        if (url.includes('generativelanguage.googleapis.com')) {
            if (server.down) return route.abort('internetdisconnected');
            return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(gemini()) }] } }] }) });
        }
        if (url.startsWith(ORIGIN)) {
            let p = url.slice(ORIGIN.length).split('?')[0] || 'index.html';
            const f = path.join(ROOT, p);
            if (!fs.existsSync(f)) return route.fulfill({ status: 404, body: '' });
            return route.fulfill({ status: 200, contentType: TYPES[path.extname(f)] || 'application/octet-stream', body: fs.readFileSync(f) });
        }
        return route.abort();
    });
    await ctx.addInitScript(() => {
        if (!localStorage.getItem('marvin.backendToken')) { localStorage.setItem('marvin.backendToken', 'x'); localStorage.setItem('marvin.geminiKey', 'k'); localStorage.setItem('marvin.gags', '0'); }
    });
    const page = await ctx.newPage();
    page.on('pageerror', e => console.log('  [Seitenfehler]', e.message));
    await page.goto(ORIGIN);
    return { ctx, page };
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const queueText = (page) => page.$eval('#status-queue', el => el.hidden ? '' : el.textContent);
const task = (page, id) => page.evaluate((id) => { const t = allTasks.find(x => x.id === id); return t && { ...t }; }, id);
const goOnline = (page, server) => { server.down = false; return page.evaluate(() => window.dispatchEvent(new Event('online'))); };
async function waitFor(fn, ms = 10000) { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await fn()) return true; await sleep(100); } return false; }

const results = [];
async function test(name, fn) {
    const browser = await chromium.launch();
    try { await fn(browser); results.push([true, name]); console.log('✓', name); }
    catch (e) { results.push([false, name]); console.log('✗', name, '\n   ', e.message); }
    finally { await browser.close(); }
}
function assert(c, msg) { if (!c) throw new Error(msg); }

(async () => {
    await test('Offline abhaken: sofort lokal, ⟳ 1, übersteht Neuladen, wird bei Netz gesendet', async (b) => {
        const srv = makeServer();
        const { page } = await setup(b, srv, () => ({}));
        await waitFor(async () => (await task(page, 't1'))?.title);
        srv.down = true;
        await page.evaluate(() => setStatus(allTasks.find(t => t.id === 't1'), 'done'));
        assert((await task(page, 't1')).status === 'done', 'nicht sofort lokal erledigt');
        assert(await waitFor(async () => (await queueText(page)) === '⟳ 1'), 'kein ⟳ 1: ' + await queueText(page));
        assert(await waitFor(() => page.$eval('#marvin-text', e => e.textContent.includes('Und wieder mal warten'))), 'kein „Und wieder mal warten“');
        await page.reload();
        await waitFor(async () => (await task(page, 't1')));
        assert((await task(page, 't1')).status === 'done', 'nach Neuladen nicht mehr erledigt');
        assert((await queueText(page)) === '⟳ 1', 'Warteschlange nach Neuladen weg');
        await goOnline(page, srv);
        assert(await waitFor(async () => srv.tasks.find(t => t.id === 't1').status === 'done'), 'Server nicht aktualisiert');
        assert(await waitFor(async () => (await queueText(page)) === ''), '⟳ verschwindet nicht');
    });

    await test('Wettlauf: langsames Laden überschreibt laufende Änderung nicht', async (b) => {
        const srv = makeServer();
        const { page } = await setup(b, srv, () => ({}));
        await waitFor(async () => (await task(page, 't1')));
        await sleep(500);
        srv.getAllDelay = 2500; srv.delay = 300;
        // Laden startet (alter Stand wird „eingefroren“), dann wird abgehakt
        await page.evaluate(() => { loadAll(); });
        await sleep(100);
        srv.tasks.find(t => t.id === 't1').status = 'todo'; // Server hatte beim Lesen noch todo
        const snap = JSON.parse(JSON.stringify(srv.tasks));
        const orig = srv.handle;
        srv.handle = (body) => body.action === 'getAll' ? { status: 'success', data: { tasks: snap, events: [], categories: [] }, info: {} } : orig(body);
        await page.evaluate(() => setStatus(allTasks.find(t => t.id === 't1'), 'done'));
        let flicker = false;
        for (let i = 0; i < 40; i++) { if ((await task(page, 't1'))?.status !== 'done') flicker = true; await sleep(100); }
        assert(!flicker, 'Aufgabe sprang kurz zurück (Wettlauf)');
        assert(srv.tasks.find(t => t.id === 't1').status === 'done', 'Server nicht erledigt');
    });

    await test('Zeitlimit: hängender Abgleich bricht nach ~8 s ab, letzter Stand bleibt', async (b) => {
        const srv = makeServer();
        const { page } = await setup(b, srv, () => ({}));
        await waitFor(async () => (await task(page, 't1')));
        await sleep(3000);
        srv.hang = true;
        const t0 = Date.now();
        await page.evaluate(() => loadAll());
        const ok = await waitFor(() => page.$eval('#marvin-text', e => e.textContent.startsWith('Deep Thought rechnet noch')), 12000);
        const dt = Date.now() - t0;
        assert(ok, 'keine Fehlschlag-Anzeige');
        assert(dt > 7000 && dt < 10500, `Abbruch nach ${dt} ms statt ~8 s`);
        assert((await task(page, 't1')).title === 'Mutter anrufen', 'letzter Stand verloren');
    });

    await test('Offline anlegen + bearbeiten: kommt bei Netz mit neuem Titel an', async (b) => {
        const srv = makeServer();
        const { page } = await setup(b, srv, () => ({ type: 'task', title: 'Milch', status: 'todo', category: null, comment: 'Na gut.' }));
        await waitFor(async () => (await task(page, 't1')));
        srv.down = true;
        await page.evaluate(() => {
            const local = { title: 'Rasen', status: 'todo', id: 'pending-1', status_since: new Date().toISOString() };
            allTasks.unshift(local);
            enqueue('addTask', { task: { title: 'Rasen', status: 'todo', source: 'app' } }, { local: { ...local } });
            saveTask(local, { title: 'Rasen mähen' });
            setStatus(local, 'backlog');
        });
        assert(await waitFor(async () => (await queueText(page)) === '⟳ 3'), 'nicht ⟳ 3: ' + await queueText(page));
        await page.reload();
        assert(await waitFor(async () => (await task(page, 'pending-1'))?.title === 'Rasen mähen'), 'nach Neuladen nicht sichtbar');
        await goOnline(page, srv);
        assert(await waitFor(async () => srv.tasks.some(t => t.title === 'Rasen mähen' && t.status === 'backlog')), 'Server: ' + JSON.stringify(srv.tasks.map(t => t.title + '/' + t.status)));
        assert(await waitFor(async () => (await queueText(page)) === ''), 'Warteschlange nicht leer');
        assert(srv.tasks.filter(t => /Rasen/.test(t.title)).length === 1, 'doppelt angelegt');
    });

    await test('Offline anlegen + rückgängig: es wird gar nichts gesendet', async (b) => {
        const srv = makeServer();
        const { page } = await setup(b, srv, () => ({}));
        await waitFor(async () => (await task(page, 't1')));
        srv.down = true;
        await page.evaluate(() => {
            const local = { title: 'Weg', status: 'todo', id: 'pending-2' };
            allTasks.unshift(local);
            enqueue('addTask', { task: { title: 'Weg', status: 'todo' } }, { local: { ...local } });
        });
        await sleep(300);
        await page.evaluate(() => deleteTaskNow(allTasks.find(t => t.id === 'pending-2')));
        await goOnline(page, srv);
        await sleep(1500);
        assert(!srv.tasks.some(t => t.title === 'Weg'), 'trotzdem angelegt');
        assert((await queueText(page)) === '', 'Warteschlange nicht leer');
    });

    await test('Sprache ohne Netz: Text gemerkt, bei Netz an Gemini und gespeichert', async (b) => {
        const srv = makeServer();
        const { page } = await setup(b, srv, () => ({ type: 'task', title: 'Katze füttern', status: 'todo', category: null, comment: 'Wenn es sein muss.' }));
        await waitFor(async () => (await task(page, 't1')));
        srv.down = true;
        await page.evaluate(() => handleInput('Katze füttern'));
        await waitFor(() => page.$eval('#marvin-text', e => e.textContent.includes('Gemerkt')), 4000) || (() => { throw new Error('kein „Gemerkt …“'); })();
        assert((await queueText(page)) === '⟳ 1', 'kein ⟳ 1');
        await page.reload();
        assert((await queueText(page)) === '⟳ 1', 'Sprachtext nach Neuladen weg');
        await goOnline(page, srv);
        assert(await waitFor(async () => srv.tasks.some(t => t.title === 'Katze füttern')), 'nicht angelegt');
        assert(await waitFor(async () => (await queueText(page)) === ''), 'Warteschlange nicht leer');
    });

    await test('Langsames Netz (3 s je Antwort): nichts blockiert, alles kommt an', async (b) => {
        const srv = makeServer();
        const { page } = await setup(b, srv, () => ({}));
        await waitFor(async () => (await task(page, 't1')));
        srv.delay = 3000;
        const t0 = Date.now();
        await page.evaluate(() => { setStatus(allTasks.find(t => t.id === 't1'), 'on_hold'); setStatus(allTasks.find(t => t.id === 't2'), 'todo'); });
        assert(Date.now() - t0 < 1000, 'Aktion blockiert');
        assert((await task(page, 't2')).status === 'todo', 'nicht sofort lokal');
        assert(await waitFor(async () => srv.tasks.find(t => t.id === 't2').status === 'todo' && srv.tasks.find(t => t.id === 't1').status === 'on_hold', 12000), 'nicht angekommen');
        assert(await waitFor(async () => (await queueText(page)) === ''), 'Warteschlange nicht leer');
    });

    await test('Konflikt: neuere Änderung im Sheet gewinnt über alte wartende', async (b) => {
        const srv = makeServer();
        const { page } = await setup(b, srv, () => ({}));
        await waitFor(async () => (await task(page, 't1')));
        srv.down = true;
        await page.evaluate(() => saveTask(allTasks.find(t => t.id === 't2'), { title: 'Steuer (alt)' }));
        await sleep(1500);
        Object.assign(srv.tasks.find(t => t.id === 't2'), { title: 'Steuer (neu, Mac)', updated_at: new Date(Date.now() + 5000).toISOString() });
        srv.down = false;
        await page.evaluate(() => { outboxBusy = false; loadAll(); });
        assert(await waitFor(async () => (await task(page, 't2'))?.title === 'Steuer (neu, Mac)'), 'alte Änderung hat gewonnen');
        await sleep(1500);
        assert(srv.tasks.find(t => t.id === 't2').title === 'Steuer (neu, Mac)', 'Sheet überschrieben');
    });

    const bad = results.filter(r => !r[0]).length;
    console.log(`\n${results.length - bad}/${results.length} bestanden`);
    process.exit(bad ? 1 : 0);
})();
