/* Sawmill station (Aerendell): raw Logs -> Planks, mirroring the
   Stone Cutter. Planks now pay for almost everything that used to
   cost raw Wood; the Sawmill/Stone Cutter themselves stay on raw
   materials only so there's always a bootstrap path. Also covers the
   Wood -> Logs rename and the doubled base tap-craft duration.
   Run: node test/sawmill.js */
const { boot } = require('./harness');
const { G } = boot();
const give = (k, n) => { S[k] = (S[k] || 0) + n; S.weight = 0; };

console.log('== the raw resource formerly called Wood now displays as Logs ==');
console.log('  G.RESOURCES.wood.name is Logs:', G.RESOURCES.wood.name === 'Logs');
console.log('  the key itself is unchanged (saves stay compatible):', 'wood' in G.RESOURCES);

console.log('\n== Sawmill builds in Aerendell off raw logs/stone ==');
G.wipe(); S.zone = 'aerendell'; S.weight = 0;
const sawmill = G.findStation('sawmill');
console.log('  station exists, zone-restricted to aerendell:',
  !!sawmill && JSON.stringify(sawmill.zones) === JSON.stringify(['aerendell']));
console.log('  buildCost has no planks (never blocked on its own output):',
  !('planks' in sawmill.buildCost));
give('wood', 20); give('stone', 15);
console.log('  builds:', G.buildStation('sawmill'));

console.log('\n== milling spends raw logs 3:1, grants a plank ==');
give('wood', 10);
const woodBefore = S.wood;
console.log('  wood -> planks:', G.craft('planks'), '| wood spent:', S.wood === woodBefore - 3,
  '| plank gained:', S.planks === 1);

console.log('\n== Stone Cutter also stays on raw materials, never Planks ==');
console.log('  stoneCutter buildCost has no planks:',
  !('planks' in G.findStation('stoneCutter').buildCost));

console.log('\n== everything that used to cost raw Wood now costs Planks instead ==');
const converted = {
  'bench buildCost': G.findStation('bench').buildCost,
  'bench upgrade': G.findStation('bench').upgrades[0].cost,
  'axe (Stone Axe)': G.findRecipe('axe').cost,
  'stonePick': G.findRecipe('stonePick').cost,
  'stoneSword': G.findRecipe('stoneSword').cost,
  'backpack': G.findRecipe('backpack').cost,
  'woolPack': G.findRecipe('woolPack').cost,
  'loom buildCost': G.findStation('loom').buildCost,
  'loom upgrade': G.findStation('loom').upgrades[0].cost,
  'armorBench buildCost': G.findStation('armorBench').buildCost,
  'armorBench upgrade': G.findStation('armorBench').upgrades[0].cost,
  'firepit upgrade': G.findStation('firepit').upgrades[0].cost,
  'makeCharcoal': G.findRecipe('makeCharcoal').cost,
  'tannery buildCost': G.findStation('tannery').buildCost,
  'tannery upgrade': G.findStation('tannery').upgrades[0].cost,
  'fletching buildCost': G.findStation('fletching').buildCost,
  'fletching upgrade': G.findStation('fletching').upgrades[0].cost,
  'bronzeAxe': G.findRecipe('bronzeAxe').cost,
  'cottage': G.HOUSING.cottage.cost,
  'campsite': G.HOUSING.campsite.cost,
  'bench villagerHireCost': G.findStation('bench').villagerHireCost,
  'loom villagerHireCost': G.findStation('loom').villagerHireCost,
  'fletching villagerHireCost': G.findStation('fletching').villagerHireCost,
};
Object.keys(converted).forEach(label => {
  const cost = converted[label];
  console.log('  ' + label + ' has planks, no raw wood:', cost.planks > 0 && !('wood' in cost));
});

console.log('\n== stationCutter/sawmill bootstrap is not broken ==');
G.wipe(); S.zone = 'aerendell'; S.weight = 0;
give('flint', 12); give('stick', 12);
console.log('  flint pick craftable with nothing built:', G.craft('flintPick'));
give('wood', 25); give('stone', 25);
console.log('  sawmill buildable from nothing but raw logs/stone:', G.buildStation('sawmill'));
give('wood', 25); give('stone', 25);
console.log('  stone cutter buildable from nothing but raw stone/logs:', G.buildStation('stoneCutter'));

console.log('\n== base tap-craft duration is doubled ==');
console.log('  TUNE.tapCraftMs is 1800 (was 900):', G.TUNE.tapCraftMs === 1800);
G.wipe(); S.zone = 'aerendell'; S.weight = 0;
give('wood', 20); give('stone', 20);
G.buildStation('sawmill');
give('wood', 20);
G.startCraftJob('planks');
console.log('  a plain station recipe job runs at the doubled base duration:',
  S.craftJobs.planks.ms === G.TUNE.tapCraftMs);
