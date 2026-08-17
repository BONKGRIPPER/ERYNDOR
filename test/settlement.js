/* Housing, cross-zone material loop, recipe-bound villagers.
   Homes no longer speed villagers up (that comes from the station's
   own tap-craft level now — see G.villagerInterval, township.js).
   Villager slots are PER-ZONE now, not a single global pool: each
   zone can always hire its own full starting roster (minimum 3 free
   slots), and homes built in THAT zone add 3 more slots there —
   see G.villagerSlots(zone), data.js. There is no more G.totalHomes/
   global pool to sum across zones. */
const { boot } = require('./harness');
const { G } = boot();
const give = (k, n) => { S[k] = (S[k] || 0) + n; S.weight = 0; };

console.log('== a fresh save starts with 3 free villager slots per zone ==');
G.wipe();
console.log('  no homes yet:', G.homes('aerendell') === 0);
console.log('  base slots == 3, no roster to sum anymore:', G.villagerSlots('aerendell') === 3);

console.log('\n== homes only add slots in the zone they were built in ==');
S.homes = { aerendell: 2, forestRoad: 1 };
console.log('  aerendell slots grew by 3*2:', G.villagerSlots('aerendell') === 3 + 3 * 2);
console.log('  forestRoad slots are independent (grew by 3*1, not shared with aerendell):',
  G.villagerSlots('forestRoad') === 3 + 3 * 1);
S.homes = {};

console.log('\n== hiring actually respects the new slot count end to end ==');
G.wipe(); S.zone = 'aerendell'; S.weight = 0;
give('wood', 200); give('planks', 200); give('string', 100); give('stick', 200); give('stone', 200); give('bone', 200);
give('basaltBlock', 50);
G.buildStation('bench'); G.buildStation('loom'); G.buildStation('stoneCutter');
console.log('  hire 3 different stations (the full 3-slot base):',
  G.hireVillagerAt('bench') && G.hireVillagerAt('loom') && G.hireVillagerAt('stoneCutter'));
console.log('  slots now exhausted:', G.slotsFree() === 0);
G.buildStation('sawmill');
console.log('  a 4th hire is refused, no slots left:', G.hireVillagerAt('sawmill') === false);
give('stone', 40); give('bronzeNail', 8); give('basaltBlock', 10);
G.buildHome('cottage');
console.log('  a home opens 3 more slots:', G.slotsFree() === 3);
console.log('  slots free matches the math:', G.slotsFree() === G.villagerSlots() - G.hiredCount());

console.log('\n== cottages need nails from the Forest Road ==');
G.wipe(); S.zone = 'aerendell';
give('stone', 40); give('wood', 40); give('planks', 40); give('basaltBlock', 10);
console.log('  cottage cost:', JSON.stringify(G.HOUSING.cottage.cost));
console.log('  build with no nails:', G.buildHome('cottage'), '(expect false)');
console.log('  can nails be made in Aerendell?',
  G.inZone(G.findStation('smithy')) ? 'yes' : 'no — smithy is Road-only');
give('bronzeNail', 8);
const slotsBefore = G.villagerSlots();
console.log('  build with nails:', G.buildHome('cottage'), '| homes', G.homes('aerendell'));
console.log('  slot pool grew by 3:', G.villagerSlots() === slotsBefore + 3);

console.log('\n== campsites need tanned leather from Khar-Barak ==');
S.zone = 'forestRoad';
give('wood', 40); give('planks', 40); give('stone', 40); give('basaltBlock', 10);
console.log('  campsite cost:', JSON.stringify(G.HOUSING.campsite.cost));
console.log('  build without tanned leather:', G.buildHome('campsite'), '(expect false)');
console.log('  tan recipe:', JSON.stringify(G.findRecipe('tannedLeather').cost));
/* zone membership is just presence in one of that zone's location
   slot decks now — no separate zones list on the location itself
   to read off */
function zonesFor(key) {
  return Object.keys(G.ZONES).filter(z =>
    (G.ZONES[z].locationDecks || []).some(comp => key in (comp || {})));
}
const saltSources = Object.keys(G.LOCATIONS).filter(k =>
  G.LOCATIONS[k].requires === 'combat' &&
  G.LOCATIONS[k].dropTable.some(d => (d.key || d) === 'tanningSalt'));
console.log('  tanning salt drops from:', saltSources.map(k =>
  G.LOCATIONS[k].name + ' (' + zonesFor(k).join(',') + ')').join(', '));

console.log('\n== the tannery followed the cows out to the Road ==');
const tannery = G.findStation('tannery');
S.zone = 'aerendell';
console.log('  shown in Aerendell:', G.inZone(tannery), '(expect false)');
S.zone = 'forestRoad';
console.log('  shown in Forest Road:', G.inZone(tannery), '(expect true)');

console.log('\n== leather is rendered from hide + fat, not dropped free ==');
console.log('  cow no longer drops leather directly:',
  G.LOCATIONS.cow.dropTable.indexOf('leather') < 0);
console.log('  cow, sheep, pig and deer all drop animal fat:',
  ['cow', 'sheep', 'pig', 'deer'].every(k => G.LOCATIONS[k].dropTable.indexOf('animalFat') >= 0));
console.log('  chicken (a bird) does not:', G.LOCATIONS.chicken.dropTable.indexOf('animalFat') < 0);
console.log('  goblin/lurker (combat enemies, not animals) do not:',
  G.LOCATIONS.goblin.dropTable.indexOf('animalFat') < 0 &&
  G.LOCATIONS.lurker.dropTable.indexOf('animalFat') < 0);
console.log('  tan-hide recipe cost:', JSON.stringify(G.findRecipe('leather').cost));

console.log('\n== the full chain works ==');
S.zone = 'kharBarak';
let salt = 0;
for (let i = 0; i < 100; i++) {
  const d = G.rollDrops(G.LOCATIONS.lurker);
  salt += d.tanningSalt || 0;
}
console.log('  100 Gate Lurkers ->', salt, 'tanning salt');
S.zone = 'forestRoad'; S.weight = 0;
give('stone', 60); give('stick', 60); give('wood', 60); give('planks', 60); give('string', 20); give('basaltBlock', 5);
G.buildStation('bench'); G.buildStation('tannery');
give('hide', 6); give('animalFat', 12);
const tanXpBefore = S.skills.tanning.xp, craftXpBefore = S.skills.crafting.xp;
console.log('  tan hide into leather:', G.craft('leather'), G.craft('leather'),
  '| leather', S.leather, '| hide left', S.hide, '| fat left', S.animalFat);
give('tanningSalt', 6);
G.craft('tannedLeather'); G.craft('tannedLeather');
console.log('  tanned leather made:', S.tannedLeather,
  '| leather left', S.leather, '| salt left', S.tanningSalt);
console.log('  tanning xp rose:', S.skills.tanning.xp > tanXpBefore,
  '(' + tanXpBefore + ' -> ' + S.skills.tanning.xp + ')');
console.log('  crafting xp untouched by tannery work:', S.skills.crafting.xp === craftXpBefore);
S.zone = 'forestRoad'; S.weight = 0;
give('tannedLeather', 4); give('wood', 40); give('planks', 40); give('stone', 40); give('basaltBlock', 5);
console.log('  build campsite:', G.buildHome('campsite'),
  '| Road homes', G.homes('forestRoad'));

console.log('\n== villagers auto-craft their station\'s recipe into the zone crate ==');
G.wipe(); S.weight = 0; S.zone = 'aerendell';
give('stick', 40); give('flint', 40);
G.buildStation('firepit');
give('stick', 40); give('flint', 40);           // firepit's hire cost
G.hireVillagerAt('firepit');
console.log('  firepit villager hired | interval', (G.villagerInterval('firepit') / 1000).toFixed(2) + 's');
G.zoneGrant('aerendell', 'planks', 100); G.zoneGrant('aerendell', 'stick', 100);   // makeCharcoal needs planks+stick, from the crate
global.__clock += G.villagerInterval('firepit') * 5;
const r = G.collectVillagerWork();
console.log('  5 intervals later -> made', JSON.stringify(r.results.map(x => x.applied)),
  '(expect 5)');
console.log('  charcoal landed in the crate, not carried inventory:',
  G.crateFor('aerendell').charcoal === 5 && !S.charcoal);

console.log('\n== a villager stalls once its OWN crate can\'t afford the recipe, and reports it ==');
G.wipe(); S.weight = 0; S.zone = 'aerendell';
give('stick', 40); give('flint', 40);
G.buildStation('firepit');
give('stick', 40); give('flint', 40);
G.hireVillagerAt('firepit');
G.zoneGrant('aerendell', 'planks', 2); G.zoneGrant('aerendell', 'stick', 2);  // only enough for 2 cycles (makeCharcoal needs 1 planks + 1 stick)
global.__clock += G.villagerInterval('firepit') * 5;
const r2 = G.collectVillagerWork();
console.log('  only 2 actually made:', r2.results[0].applied === 2);
console.log('  reported as stalled:', r2.results[0].stalled === true);
console.log('  G.villagerStalled agrees, live:', G.villagerStalled('firepit') === true);
G.zoneGrant('aerendell', 'planks', 10); G.zoneGrant('aerendell', 'stick', 10);
console.log('  no longer stalled once the crate is restocked:', G.villagerStalled('firepit') === false);
