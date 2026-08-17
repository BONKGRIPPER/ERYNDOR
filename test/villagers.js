/* Villagers are hired AT a station now (tap the station on the Craft
   page -> Level Up / Hire Villager), not as named Town-page roles.
   A hired villager auto-taps that station's one villagerRecipe (the
   safe, cheapest default — e.g. String at the Loom) on a timer that
   matches the station's current tap-craft speed, spending/gaining
   entirely through THAT ZONE's storage crate, never the player's
   carried inventory. See G.hireVillagerAt/G.villagerInterval/
   G.villagerStalled/G.collectVillagerWork in township.js.
   Run: node test/villagers.js */
const { boot } = require('./harness');
const { G, store } = boot();
const UI = G.UI;
const give = (k, n) => { S[k] = (S[k] || 0) + n; S.weight = 0; };

console.log('== every villager-hireable station has a real flagged recipe ==');
G.STATIONS.forEach(st => {
  if (!G.stationHireable(st.id)) return;
  const r = G.stationVillagerRecipe(st.id);
  console.log('  ' + st.id + ' -> ' + r.id + ' (' + r.name + '):', r.repeatable === true);
});
console.log('  Stone Cutter never defaults to Basalt Block (would eat the player\'s own Stone Blocks):',
  G.stationVillagerRecipe('stoneCutter').id === 'stoneBlock');

console.log('\n== villager speed is 5x slower than manual crafting, then modified by station speed ==');
G.wipe(); S.zone = 'aerendell'; S.weight = 0;
give('planks', 40); give('stick', 40); give('cloth', 10);
G.buildStation('loom');
console.log('  base interval == TUNE.tapCraftMs * villagerCraftMult:',
  G.villagerInterval('loom') === G.TUNE.tapCraftMs * G.villagerCraftMult());
console.log('  loom upgrade succeeds:', G.upgradeStation('loom'));
console.log('  interval drops after upgrading the loom:',
  G.villagerInterval('loom') < G.TUNE.tapCraftMs * G.villagerCraftMult());
console.log('  matches the station\'s own speed mult exactly:',
  G.villagerInterval('loom') === Math.round(G.TUNE.tapCraftMs * G.villagerCraftMult() * G.stationSpeedMult('loom')));

console.log('\n== hiring spends the station\'s hire cost from inventory, not the recipe cost ==');
G.wipe(); S.zone = 'aerendell'; S.weight = 0;
give('planks', 40); give('stick', 40);
const hireCost = G.findStation('loom').villagerHireCost;
G.buildStation('loom');
const before = { planks: S.planks, stick: S.stick };
console.log('  refused with nothing built at all:', G.hireVillagerAt('bench') === false);
console.log('  hire succeeds:', G.hireVillagerAt('loom'));
console.log('  hire cost spent:', S.planks === before.planks - hireCost.planks &&
  S.stick === before.stick - hireCost.stick);
console.log('  refuses to double-hire the same station:', G.hireVillagerAt('loom') === false);

console.log('\n== a hired villager auto-crafts into its OWN ZONE\'s crate, not carried inventory ==');
G.wipe(); S.zone = 'aerendell'; S.weight = 0;
give('planks', 40); give('stick', 40);
G.buildStation('loom');
G.hireVillagerAt('loom');
G.zoneGrant('aerendell', 'flax', 200);
const flaxBefore = G.crateFor('aerendell').flax;
global.__clock += G.villagerInterval('loom') * 3;
const r = G.collectVillagerWork();
console.log('  3 intervals -> 3 applied:', r.results[0].applied === 3);
console.log('  string landed in the crate:', G.crateFor('aerendell').string === 3);
console.log('  flax spent from the crate (3 per string):', G.crateFor('aerendell').flax === flaxBefore - 9);
console.log('  nothing touched carried inventory:', S.string === 0 && S.flax === 0);
console.log('  not reported as stalled:', r.results[0].stalled === false);

console.log('\n== a villager stalls once its OWN crate can\'t afford the recipe ==');
G.wipe(); S.zone = 'aerendell'; S.weight = 0;
give('planks', 40); give('stick', 40);
G.buildStation('loom');
G.hireVillagerAt('loom');
G.zoneGrant('aerendell', 'flax', 2);   // not enough for even 1 string (needs 3)
global.__clock += G.villagerInterval('loom') * 10;
const r2 = G.collectVillagerWork();
console.log('  0 applied out of 10 due:', r2.results[0].applied === 0);
console.log('  reported stalled:', r2.results[0].stalled === true);
console.log('  live stalled check agrees:', G.villagerStalled('loom') === true);

console.log('\n== unclaimed time is banked while stalled, same as the old pack-full behavior ==');
G.zoneGrant('aerendell', 'flax', 400);
const r3 = G.collectVillagerWork();
console.log('  catches up once the crate is restocked:', r3.results[0].applied > 5);

console.log('\n== dismissing a villager clears its clock and frees the slot ==');
G.wipe(); S.zone = 'aerendell'; S.weight = 0;
give('planks', 40); give('stick', 40);
G.buildStation('loom');
G.hireVillagerAt('loom');
console.log('  villagerLast set:', typeof S.villagerLast['aerendell:loom'] === 'number');
console.log('  hiredCount is 1:', G.hiredCount('aerendell') === 1);
console.log('  dismissed:', G.dismissVillagerAt('loom'));
console.log('  villagerLast cleared:', !('aerendell:loom' in S.villagerLast));
console.log('  no longer hired:', !G.isStationHired('loom'));
console.log('  hiredCount back to 0:', G.hiredCount('aerendell') === 0);

console.log('\n== max 3 villagers per zone until a home is built there ==');
G.wipe(); S.zone = 'aerendell'; S.weight = 0;
give('planks', 200); give('stick', 200); give('stone', 200); give('wood', 200); give('basaltBlock', 50);
give('bone', 200);
console.log('  villagerSlots with no homes:', G.villagerSlots('aerendell') === 3);
G.buildStation('bench'); G.buildStation('loom'); G.buildStation('stoneCutter');
G.buildStation('sawmill'); G.buildStation('altar');
console.log('  hire 1 (bench):', G.hireVillagerAt('bench'));
console.log('  hire 2 (loom):', G.hireVillagerAt('loom'));
console.log('  hire 3 (stoneCutter):', G.hireVillagerAt('stoneCutter'));
console.log('  hire 4 refused, slots full:', G.hireVillagerAt('sawmill') === false);
give('bronzeNail', 8); give('basaltBlock', 20);
console.log('  building a home raises the cap:', G.buildHome('cottage'));
console.log('  villagerSlots now 6:', G.villagerSlots('aerendell') === 6);
console.log('  hire 4 now succeeds:', G.hireVillagerAt('sawmill'));

console.log('\n== the Craft page station menu shows Level Up / Hire once the station is clicked ==');
G.wipe(); S.zone = 'aerendell'; S.weight = 0;
give('planks', 40); give('stick', 40);
S.discovered.planks = true; S.discovered.stick = true;
G.buildStation('loom');
UI.go('craft');
function findStationCard(nameFragment) {
  return store['stations'].children.find(card =>
    card.children[0] && card.children[0]._html.indexOf(nameFragment) >= 0);
}
const loomCard = findStationCard('Loom');
console.log('  found the Loom card:', !!loomCard);
const bodyOf = card => card.children[1];   // [0]=stcard head, [1]=.recipes body
console.log('  no menu before a click:', !bodyOf(loomCard).children.some(c => c.className === 'station-menu'));
loomCard.children[0].onclick();
UI.renderCraft();
const loomCard2 = findStationCard('Loom');
const menu = bodyOf(loomCard2).children.find(c => c.className === 'station-menu');
console.log('  menu opens on click:', !!menu);
console.log('  offers Hire Villager:', menu.children.some(row =>
  row.children[0] && row.children[0]._html.indexOf('Hire Villager') >= 0));

console.log('\n== villager state survives a save/load round trip ==');
G.wipe(); S.zone = 'aerendell'; S.weight = 0;
give('planks', 40); give('stick', 40);
G.buildStation('loom');
G.hireVillagerAt('loom');
G.save(false);
window.S = G.S = G.freshState();
G.load();
console.log('  still hired:', G.isStationHired('loom', 'aerendell'));
console.log('  clock restored:', typeof S.villagerLast['aerendell:loom'] === 'number');

console.log('\n== an old save with the retired named-villager field loads safely ==');
G.wipe();
S.villagers = { weaver: true };   // simulate a pre-rework save
delete S.stationVillagers;
G.save(false);
window.S = G.S = G.freshState();
G.load();
console.log('  old field dropped:', !('villagers' in S));
console.log('  new field backfilled to {}:', JSON.stringify(S.stationVillagers) === '{}');
