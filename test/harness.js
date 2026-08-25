/* Shared browser stub. getElementById returns null for ids that are NOT
   in index.html, exactly like a real browser, so missing-element bugs
   surface here instead of in your hand. */
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const noop = () => {};

function boot(opts) {
  opts = opts || {};
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const REAL = new Set([...html.matchAll(/id="([^"]+)"/g)].map(m => m[1]));
  const store = {};
  function mkEl(id) {
    const n = { id: id || '', _html: '', textContent: '', className: '', style: {},
      dataset: {}, children: [], offsetWidth: 1, disabled: false, onclick: null, title: '',
      classList: { _s: new Set(),
        add(...c) { c.forEach(x => this._s.add(x)); },
        remove(...c) { c.forEach(x => this._s.delete(x)); },
        toggle(c, f) { f ? this._s.add(c) : this._s.delete(c); },
        contains(c) { return this._s.has(c); } },
      appendChild(c) { this.children.push(c); return c; },
      setAttribute(name, val) { if (name === 'class') this.className = val; else this[name] = val; },
      remove: noop, insertAdjacentHTML(p, h) { this._html += h; },
      addEventListener: noop, querySelector: () => null, querySelectorAll: () => [],
      getBoundingClientRect: () => ({ left: 0, top: 0, width: 10, height: 10 }),
      /* enough of canvas 2D to survive confetti/effects code untouched */
      getContext: () => ({ clearRect: noop, save: noop, restore: noop,
        translate: noop, rotate: noop, fillRect: noop, fillStyle: '', globalAlpha: 1 }) };
    Object.defineProperty(n, 'innerHTML',
      { get() { return n._html; }, set(v) { n._html = v; n.children = []; } });
    return n;
  }
  const navButtons = [...html.matchAll(/data-page="([^"]+)"/g)].map(m => {
    const e = mkEl(); e.dataset.page = m[1]; e.dataset.emb = 'cards'; return e;
  });
  const card = mkEl();
  global.document = {
    getElementById(id) { return REAL.has(id) ? (store[id] || (store[id] = mkEl(id))) : null; },
    querySelector() { return card; },
    querySelectorAll(sel) { return sel === '.nav button' ? navButtons : []; },
    createElement: () => mkEl(), createElementNS: (ns, tag) => mkEl(tag),
    addEventListener: noop, hidden: false,
    body: { appendChild: noop },
    documentElement: { style: { setProperty: noop } },
  };
  global.window = new Proxy({ addEventListener: noop }, {
    set(t, k, v) { t[k] = v; global[k] = v; return true; },
    get(t, k) { return t[k]; }, has() { return true; } });
  global.localStorage = { _d: {},
    getItem(k) { return this._d[k] || null; },
    setItem(k, v) { this._d[k] = String(v); },
    removeItem(k) { delete this._d[k]; } };
  global.__clock = Date.now();
  const RealDate = Date;
  global.Date = class extends RealDate { static now() { return global.__clock; } };
  global.__now = 1e6;
  global.performance = { now: () => global.__now };
  global.requestAnimationFrame = noop;
  global.cancelAnimationFrame = noop;
  global.__timers = [];
  global.setTimeout = (f) => { global.__timers.push(f); return global.__timers.length; };
  /* Real intervals, captured rather than run — tests simulate one
     pass of every still-active interval with tickIntervals() below
     (advance global.__clock first so any elapsed-time math inside
     the callback sees it), same spirit as flush() for setTimeout. */
  global.__intervals = {};
  let __intervalId = 0;
  global.setInterval = (fn) => { const id = ++__intervalId; global.__intervals[id] = fn; return id; };
  global.clearInterval = (id) => { delete global.__intervals[id]; };
  global.clearTimeout = noop;

  const files = [...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map(m => m[1]);
  const crashes = [];
  files.forEach(f => {
    try { eval(fs.readFileSync(path.join(ROOT, f), 'utf8')); }
    catch (e) { crashes.push({ file: f, msg: e.message }); }
  });
  /* Batch 4 (real-time plan) made G.travel asynchronous — it starts a
     real-world-hours trip (S.travel) instead of relocating instantly.
     Most existing tests only use travel to SET UP a scenario in
     another zone; they aren't testing the trip itself, so re-writing
     every one of them to fast-forward the clock by hand would just be
     noise. travelNow(id) is that fast-forward, in one call: start the
     trip, jump the clock straight to arrival, resolve it. Tests that
     actually exercise the travel/overlay mechanic (test/travel.js)
     call G.travel directly instead, without this helper. */
  function travelNow(id) {
    const G = global.window.Game;
    if (!G.travel(id)) return false;
    if (G.S.travel) global.__clock = G.S.travel.arriveAt;
    return G.checkTravelArrival();
  }

  return { G: global.window.Game, store, files, crashes, REAL, travelNow,
           flush() { const t = global.__timers; global.__timers = []; t.forEach(f => f()); },
           tickIntervals() { Object.values(global.__intervals).forEach(f => f()); } };
}

function trial(label, fn) {
  try { fn(); console.log('  OK   ' + label); return true; }
  catch (e) { console.log('  FAIL ' + label + ' -> ' + e.message); return false; }
}
module.exports = { boot, trial, ROOT };
