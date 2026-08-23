/* Boot + every UI path + static checks. Run: node test/smoke.js */
const fs = require('fs'), path = require('path');
const { boot, trial, ROOT } = require('./harness');

console.log('== boot ==');
const { G, store, files, crashes, REAL } = boot();
crashes.forEach(c => console.log('  CRASH', c.file, '->', c.msg));
if (!crashes.length) console.log('  clean —', files.length, 'modules');
const UI = G.UI;

console.log('\n== static: missing dom ids ==');
let js = '';
files.forEach(f => js += fs.readFileSync(path.join(ROOT, f), 'utf8'));
const used = new Set([...js.matchAll(/\$\('([^']+)'\)/g)].map(m => m[1])
  .concat([...js.matchAll(/getElementById\('([^']+)'\)/g)].map(m => m[1])));
const missing = [...used].filter(id => !REAL.has(id));
console.log(' ', missing.length ? 'MISSING: ' + missing.join(', ') : 'none');

console.log('\n== static: duplicate definitions ==');
let dups = 0;
files.forEach(f => {
  const s = fs.readFileSync(path.join(ROOT, f), 'utf8');
  const c = {};
  [...s.matchAll(/^\s*(?:UI|G)\.(\w+)\s*=\s*function/gm)].forEach(m => c[m[1]] = (c[m[1]] || 0) + 1);
  const d = Object.keys(c).filter(k => c[k] > 1);
  if (d.length) { dups++; console.log('  DUP in', f, '->', d.join(', ')); }
});
if (!dups) console.log('  none');

console.log('\n== render every page ==');
['home', 'play', 'deck', 'skills', 'bag', 'craft'].forEach(p =>
  trial('page ' + p, () => { S.page = p; UI.renderAll(); }));

console.log('\n== flint tools need no station built ==');
trial('hands pre-built on a fresh save', () => {
  if (!S.built.hands) throw new Error('Bare Hands should start built');
});
trial('flint pick craftable with nothing else built', () => {
  S.flint = 20; S.stick = 20;
  if (!G.craft('flintPick')) throw new Error('flintPick craft failed');
});
trial('flint axe craftable with nothing else built', () => {
  if (!G.craft('flintAxe')) throw new Error('flintAxe craft failed');
});

console.log('\n== every workshop renders inline on the craft page ==');
S.page = 'craft';
/* set directly — this is exercising the craft UI, not carry capacity */
S.stone = 100; S.flint = 100; S.stick = 100; S.wood = 100; S.flax = 20; S.charcoal = 10; S.hide = 5;
S.string = 20;
trial('render craft (all known, unbuilt)', () => UI.renderCraft());
trial('build bench', () => { G.buildStation('bench'); UI.renderCraft(); });
trial('build loom', () => { G.buildStation('loom'); UI.renderCraft(); });
trial('weave cloth', () => { if (!G.craft('cloth')) throw new Error('weave failed'); });
trial('build campfire', () => { G.buildStation('firepit'); UI.renderCraft(); });
trial('cook a food card', () => { S.poultry = 10; S.stick = 20; S.weight = 0; if (!G.craft('card_cookedMeat')) throw new Error('cook failed'); });
trial('build furnace', () => { G.buildStation('furnace'); UI.renderCraft(); });
trial('smelt bronze bar', () => {
  S.tin = 5; S.copper = 5; if (!G.craft('bronzeBar')) throw new Error('smelt failed');
});

console.log('\n== deal a hand containing every card kind ==');
Object.keys(G.CARDS).forEach(k => trial('card ' + k, () => {
  const c = G.CARDS[k], kind = G.cardKinds[c.kind];
  UI.dealHand({ hand: [{ key: k, index: 0, card: c, face: kind.face(c, k) }] });
}));
trial('full hand of three', () => { S.page = 'play'; G.drawHand(); });
trial('choose + resolve', () => {
  G.chooseCard(0);
  global.__now = G.rt.windowStart + G.TUNE.windowTime * 0.5;
  G.handleTap();
});
