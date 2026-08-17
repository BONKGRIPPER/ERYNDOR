/* Boulder's 75/25 Stone/Basalt split, the Stone Cutter station
   (Aerendell), and the Stone Block / Basalt Block economy that now
   pays for early weapons/tools (blocks) and buildings/infrastructure
   (basalt blocks). Run: node test/stonecutter.js */
const { boot } = require('./harness');
const { G } = boot();
const give = (k, n) => { S[k] = (S[k] || 0) + n; S.weight = 0; };

console.log('== Boulder drops roughly 75% stone / 25% basalt ==');
const tally = { stone: 0, basalt: 0 };
for (let i = 0; i < 2000; i++) {
  const d = G.rollDrops(G.LOCATIONS.boulder);
  if (d.stone) tally.stone++;
  if (d.basalt) tally.basalt++;
}
const stonePct = tally.stone / 2000, basaltPct = tally.basalt / 2000;
console.log('  stone ~75%:', stonePct.toFixed(2), Math.abs(stonePct - 0.75) < 0.05);
console.log('  basalt ~25%:', basaltPct.toFixed(2), Math.abs(basaltPct - 0.25) < 0.05);
console.log('  never both at once (oneOf, not two independent rolls):',
  (() => { for (let i = 0; i < 500; i++) {
    const d = G.rollDrops(G.LOCATIONS.boulder);
    if (d.stone && d.basalt) return false;
  } return true; })());

console.log('\n== Stone Cutter builds in Aerendell off raw stone/wood ==');
G.wipe(); S.zone = 'aerendell'; S.weight = 0;
const cutter = G.findStation('stoneCutter');
console.log('  station exists, zone-restricted to aerendell:',
  !!cutter && JSON.stringify(cutter.zones) === JSON.stringify(['aerendell']));
give('stone', 30); give('wood', 20);
console.log('  builds:', G.buildStation('stoneCutter'));

console.log('\n== refining spends raw material, grants a block ==');
give('stone', 10);
const stoneBefore = S.stone;
console.log('  stone -> stoneBlock:', G.craft('stoneBlock'), '| stone spent:', S.stone === stoneBefore - 3,
  '| block gained:', S.stoneBlock === 1);
console.log('\n== Basalt Block now also costs a Stone Block, not just raw basalt ==');
console.log('  basaltBlock cost:', JSON.stringify(G.findRecipe('basaltBlock').cost));
give('basalt', 10); S.stoneBlock = 0;
console.log('  refuses without a stone block:', G.craft('basaltBlock') === false);
give('stoneBlock', 5);
const basaltBefore = S.basalt, stoneBlockBefore = S.stoneBlock;
console.log('  basalt -> basaltBlock:', G.craft('basaltBlock'), '| basalt spent:', S.basalt === basaltBefore - 3,
  '| stone block spent:', S.stoneBlock === stoneBlockBefore - 1, '| block gained:', S.basaltBlock === 1);

console.log('\n== Stone Axe/Pick/Sword now cost a Stone Block, not raw stone ==');
console.log('  axe (Stone Axe):', JSON.stringify(G.findRecipe('axe').cost));
console.log('  stonePick:', JSON.stringify(G.findRecipe('stonePick').cost));
console.log('  stoneSword:', JSON.stringify(G.findRecipe('stoneSword').cost));
['axe', 'stonePick', 'stoneSword'].forEach(id => {
  const cost = G.findRecipe(id).cost;
  console.log('  ' + id + ' has stoneBlock, no raw stone:', cost.stoneBlock === 1 && !('stone' in cost));
});

console.log('\n== buildings/infrastructure now cost Basalt Blocks ==');
console.log('  cottage:', JSON.stringify(G.HOUSING.cottage.cost));
console.log('  campsite:', JSON.stringify(G.HOUSING.campsite.cost));
console.log('  bench buildCost:', JSON.stringify(G.findStation('bench').buildCost));
console.log('  bench upgrade cost:', JSON.stringify(G.findStation('bench').upgrades[0].cost));
console.log('  armorBench buildCost:', JSON.stringify(G.findStation('armorBench').buildCost));
console.log('  altar buildCost:', JSON.stringify(G.findStation('altar').buildCost));
[G.HOUSING.cottage.cost, G.HOUSING.campsite.cost, G.findStation('bench').buildCost,
 G.findStation('bench').upgrades[0].cost, G.findStation('armorBench').buildCost,
 G.findStation('armorBench').upgrades[0].cost, G.findStation('altar').buildCost,
 G.findStation('altar').upgrades[0].cost].forEach(cost => {
  console.log('  has basaltBlock, no raw stone:', cost.basaltBlock > 0 && !('stone' in cost));
});
console.log('  tannery/furnace/smithy stay on raw stone (out of scope):',
  G.findStation('tannery').buildCost.stone > 0 &&
  G.findStation('furnace').buildCost.stone > 0 &&
  G.findStation('smithy').buildCost.stone > 0);

console.log('\n== bootstrap is not broken: flint tools stay free ==');
G.wipe(); S.zone = 'aerendell'; S.weight = 0;
give('flint', 12); give('stick', 12);
console.log('  flint pick craftable with nothing built:', G.craft('flintPick'));
