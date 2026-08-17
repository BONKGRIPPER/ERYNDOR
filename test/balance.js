/* Mechanics + balance checks. Run: node test/balance.js */
const { boot } = require('./harness');
const { G } = boot();
const UI = G.UI;

console.log('== timing band: random + tighter ==');
const bands = []; for (let i = 0; i < 3000; i++) bands.push(G.rollBand());
const w = bands.map(b => b.end - b.start), st = bands.map(b => b.start);
const avg = a => a.reduce((x, y) => x + y, 0) / a.length;
console.log('  width  min', Math.min(...w).toFixed(3), 'max', Math.max(...w).toFixed(3),
            'avg', avg(w).toFixed(3));
console.log('  start  min', Math.min(...st).toFixed(3), 'max', Math.max(...st).toFixed(3));
console.log('  previous band was fixed 0.52-0.82 (width 0.300)');
console.log('  now averages', avg(w).toFixed(3), '=', Math.round(avg(w) / 0.30 * 100) + '% of the old width');
console.log('  distinct starts in 3000 rolls:', new Set(st.map(x => x.toFixed(3))).size);
console.log('  never exceeds bounds:',
  Math.min(...st) >= G.TUNE.bandEarliest - 1e-9 &&
  Math.max(...bands.map(b => b.end)) <= G.TUNE.bandLatest + 1e-9);

console.log('\n== centre taps still land ==');
G.wipe(); S.page = 'play'; G.rt.paused = false;
let crit = 0;
for (let i = 0; i < 200; i++) {
  G.drawHand(); G.chooseCard(0);
  const b = G.rt.band, mid = (b.start + b.end) / 2;
  global.__now = G.rt.windowStart + G.TUNE.windowTime * mid;
  const before = S.hits; G.handleTap();
  if (S.hits > before) crit++;
}
console.log('  perfect-centre taps: ' + crit + '/200 crit');

console.log('\n== an "old habit" tap now mostly misses ==');
G.wipe(); S.page = 'play'; let old = 0;
for (let i = 0; i < 500; i++) {
  G.drawHand(); G.chooseCard(0);
  global.__now = G.rt.windowStart + G.TUNE.windowTime * 0.67;   // old band centre
  const before = S.hits; G.handleTap();
  if (S.hits > before) old++;
}
console.log('  tapping the OLD fixed spot: ' + old + '/500 = ' + (old / 5).toFixed(1) + '% crit');

console.log('\n== xp doubled ==');
Object.keys(G.SKILLS).forEach(k =>
  console.log('  ' + k.padEnd(10), 'base need', G.SKILLS[k].need));

console.log('\n== old save migration ==');
G.wipe();
S.skills.mining = { lv: 3, xp: 5, need: 12 }; S.xpV2 = false; G.save(false);
window.S = G.S = G.freshState(); G.load();
console.log('  need 12 ->', S.skills.mining.need, '(expect 24) | flag:', S.xpV2 === true);
G.save(false); window.S = G.S = G.freshState(); G.load();
console.log('  does not double twice:', S.skills.mining.need === 24);

console.log('\n== attack -> melee/archery migration ==');
G.wipe();
S.skills.attack = { lv: 15, xp: 3, need: 40 };  // a save from before the split
G.save(false); window.S = G.S = G.freshState(); G.load();
console.log('  stale attack entry is gone:', !S.skills.attack);
console.log('  melee and archery both exist, starting fresh:',
  S.skills.melee.lv === 1 && S.skills.archery.lv === 1);

console.log('\n== card yields are declared ==');
Object.keys(G.CARDS).forEach(k => {
  const c = G.CARDS[k], f = G.cardKinds[c.kind].face(c, k);
  const ys = (f.yields || []).map(y =>
    y.key + ' ' + (y.crit ? y.qty + '-' + y.crit : y.qty) + (y.chance ? ' @' + y.chance : ''));
  console.log('  ' + c.name.padEnd(14), ys.length ? ys.join(', ') : '(combat)');
});
console.log('  (ranges show base-to-clean-tap; they scale with skill level)');
