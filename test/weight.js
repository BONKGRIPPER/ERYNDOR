/* Does S.weight always equal the true weight of what you carry? */
const { boot } = require('./harness');
const { G } = boot();

function trueWeight() {
  let w = 0;
  Object.keys(G.RESOURCES).forEach(k => w += (S[k] || 0) * G.RESOURCES[k].wt);
  return Math.round(w * 100) / 100;
}
function check(label) {
  const t = trueWeight(), s = Math.round(S.weight * 100) / 100;
  const ok = Math.abs(t - s) < 0.001;
  console.log((ok ? '  OK   ' : '  DRIFT ') + label +
    ' | tracked ' + s + ' vs actual ' + t + (ok ? '' : '  <-- MISMATCH'));
  return ok;
}

console.log('== basic add/remove ==');
G.wipe(); check('empty');
G.addRes('stone', 10); check('10 stone');
G.addRes('berries', 33); check('+33 berries');
G.removeRes('berries', 7); check('-7 berries');
G.removeRes('stone', 10); check('-10 stone');

console.log('\n== capacity ceiling ==');
G.wipe();
const cap = G.carryCap();
console.log('  cap =', cap);
const got = G.addRes('stone', 9999);
console.log('  asked 9999 stone (2 lb each) -> got', got, 'expected', cap / 2);
check('at ceiling');
console.log('  addRes when full returns:', G.addRes('stone', 5), '(expect 0)');
console.log('  isEncumbered:', G.isEncumbered());

console.log('\n== light items fill the same ceiling ==');
G.wipe();
const g2 = G.addRes('berries', 99999);
console.log('  berries (0.1 lb) -> got', g2, 'expected', cap / 0.1);
check('berries at ceiling');

console.log('\n== mixed load ==');
G.wipe();
G.addRes('stone', 20);      // 40
G.addRes('wood', 20);       // 20  -> 60
G.addRes('berries', 100);   // 10  -> 70
G.addRes('feathers', 40);   //  2  -> 72
check('mixed');
console.log('  weight', S.weight, '/ cap', cap);

console.log('\n== crafting keeps books straight ==');
G.wipe();
/* bench needs wood, axe/stoneSword need wood too — stick is a
   flint-tier resource only now, nothing stone-tier touches it.
   Top up before each step: capacity is tight enough that one big
   addRes() up front gets weight-capped before the later crafts. */
G.addRes('stone', 20); G.addRes('wood', 20); G.addRes('planks', 20);
G.addRes('basaltBlock', 10); G.addRes('stoneBlock', 5);
check('before build');
console.log('  bench actually built:', G.buildStation('bench')); check('after building bench');
console.log('  axe actually crafted:', G.craft('axe')); check('after crafting axe');
G.addRes('stone', 10); G.addRes('wood', 10); G.addRes('planks', 10);
console.log('  sword actually crafted:', G.craft('stoneSword')); check('after crafting sword');

console.log('\n== campfire: tap-craft cooking stays weight-consistent ==');
G.wipe();
G.addRes('stick', 20); G.addRes('flint', 20);
console.log('  firepit actually built:', G.buildStation('firepit')); check('firepit built');
G.addRes('stick', 20); G.addRes('poultry', 6);
check('before cooking');
for (let i = 0; i < 6; i++) G.craft('cookPoultry');
check('after cooking 6');

console.log('\n== gear changes capacity ==');
G.wipe();
console.log('  base cap', G.carryCap());
G.addRes('stick', 40); G.addRes('wood', 40); G.addRes('planks', 40); G.addRes('cloth', 2); G.addRes('basaltBlock', 5);
G.buildStation('bench');
G.craft('backpack');
console.log('  after Backpack (+10):', G.carryCap());
G.addRes('stone', 6);
G.craft('woolPack');
console.log('  after Wool Pack (+14):', G.carryCap());
check('after equipping');

console.log('\n== float drift over 3000 operations ==');
G.wipe();
const keys = ['berries', 'flax', 'charcoal', 'feathers', 'stick', 'bone'];
for (let i = 0; i < 3000; i++) {
  const k = keys[i % keys.length];
  if (i % 3 === 0) G.removeRes(k, 1); else G.addRes(k, 1);
}
check('after 3000 mixed ops');
console.log('  raw stored value:', S.weight);

console.log('\n== drops when nearly full ==');
G.wipe();
G.addRes('stone', (cap / 2) - 1);          // 2 lb short
console.log('  room left:', G.roomLeft());
const drops = G.rollDrops(G.LOCATIONS.cow);
console.log('  cow drops:', JSON.stringify(drops));
Object.keys(drops).forEach(k => G.addRes(k, drops[k]));
check('after partial pickup');
