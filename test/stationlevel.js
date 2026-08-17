/* Batch 3: per-station upgrade levels. Buying a tier speeds up
   tap-crafting at that station (G.stationSpeedMult); the duration is
   snapshotted onto a job at start, so an upgrade bought mid-job never
   changes a cycle already running. Run: node test/stationlevel.js */
const { boot } = require('./harness');
const { G, store } = boot();
const UI = G.UI;
const give = (k, n) => { S[k] = (S[k] || 0) + n; S.weight = 0; };

console.log('== a fresh station starts at level 1, no discount ==');
G.wipe();
give('stone', 20); give('wood', 20); give('planks', 20); give('basaltBlock', 10); give('stoneBlock', 5);
G.buildStation('bench');
console.log('  level 1:', G.stationLevel('bench') === 1);
console.log('  speed mult is 1 (no discount):', G.stationSpeedMult('bench') === 1);
console.log('  next upgrade is the bench\'s tier 0:', G.stationNextUpgrade('bench') === G.findStation('bench').upgrades[0]);
console.log('  a station with no upgrades table always reads level 1:', G.stationLevel('hands') === 1);
console.log('  ...and null for its next upgrade:', G.stationNextUpgrade('hands') === null);

console.log('\n== upgrading spends the tier cost and bumps the level ==');
const tier = G.findStation('bench').upgrades[0];
Object.keys(tier.cost).forEach(k => give(k, tier.cost[k]));
const before = {}; Object.keys(tier.cost).forEach(k => { before[k] = S[k]; });
const upgraded = G.upgradeStation('bench');
console.log('  upgrade succeeded:', upgraded);
console.log('  level is now 2:', G.stationLevel('bench') === 2);
console.log('  cost was spent:', Object.keys(tier.cost).every(k => S[k] === before[k] - tier.cost[k]));
console.log('  speed mult now matches the tier:', G.stationSpeedMult('bench') === tier.speedMult);

console.log('\n== refuses without affording the next tier ==');
G.wipe();
give('stone', 20); give('wood', 20); give('planks', 20); give('basaltBlock', 10); give('stoneBlock', 5);
G.buildStation('bench');
S.stone = 0; S.wood = 0;
console.log('  refused:', G.upgradeStation('bench') === false);
console.log('  still level 1:', G.stationLevel('bench') === 1);

console.log('\n== refuses on an unbuilt station ==');
G.wipe();
console.log('  refused, bench never built:', G.upgradeStation('bench') === false);

console.log('\n== refuses once maxed (bench only has one tier defined) ==');
G.wipe();
give('stone', 100); give('wood', 100); give('planks', 100); give('basaltBlock', 20); give('stoneBlock', 10);
G.buildStation('bench');
G.upgradeStation('bench');
console.log('  at max level:', !G.stationNextUpgrade('bench'));
console.log('  a second upgrade attempt is refused:', G.upgradeStation('bench') === false);

console.log('\n== station:upgraded and state:changed fire on success ==');
G.wipe();
give('stone', 100); give('wood', 100); give('planks', 100); give('basaltBlock', 20); give('stoneBlock', 10);
G.buildStation('bench');
let upFired = 0, stateFired = 0;
G.on('station:upgraded', () => { upFired++; });
G.on('state:changed', () => { stateFired++; });
G.upgradeStation('bench');
console.log('  station:upgraded fired:', upFired === 1);
console.log('  state:changed fired:', stateFired >= 1);

console.log('\n== a tap-craft job at an upgraded station runs the faster duration ==');
G.wipe();
give('stone', 100); give('wood', 100); give('planks', 100); give('basaltBlock', 20); give('stoneBlock', 10);
G.buildStation('bench');
G.upgradeStation('bench');
G.startCraftJob('axe');
const expectedMs = Math.round(G.TUNE.tapCraftMs * G.stationSpeedMult('bench'));
console.log('  job duration matches the upgraded speed:', S.craftJobs.axe.ms === expectedMs);
console.log('  faster than the base duration:', expectedMs < G.TUNE.tapCraftMs);

console.log('\n== upgrading mid-job does not retroactively speed up that job ==');
G.wipe();
give('stone', 100); give('wood', 100); give('planks', 100); give('basaltBlock', 20); give('stoneBlock', 10);
G.buildStation('bench');
G.startCraftJob('axe');                 // still level 1, base duration
const lockedMs = S.craftJobs.axe.ms;
G.upgradeStation('bench');               // now level 2, faster
console.log('  in-flight job keeps its original (slower) duration:', S.craftJobs.axe.ms === lockedMs);
console.log('  and that duration is the base, unaccelerated one:', lockedMs === G.TUNE.tapCraftMs);

console.log('\n== stationLv survives a save/load round trip ==');
G.wipe();
give('stone', 100); give('wood', 100); give('planks', 100); give('basaltBlock', 20); give('stoneBlock', 10);
G.buildStation('bench');
G.upgradeStation('bench');
G.save(false);
window.S = G.S = G.freshState();
G.load();
console.log('  level restored:', G.stationLevel('bench') === 2);

console.log('\n== an old save with no stationLv field loads safely ==');
G.wipe();
delete S.stationLv;
G.save(false);
window.S = G.S = G.freshState();
G.load();
console.log('  backfilled to {}:', JSON.stringify(S.stationLv) === '{}');

console.log('\n== UI.renderCraft shows the level badge and an upgrade row ==');
G.wipe();
give('stone', 100); give('wood', 100); give('planks', 100); give('basaltBlock', 20); give('stoneBlock', 10);
S.discovered.stone = true; S.discovered.wood = true;
G.buildStation('bench');
UI.go('craft');
function findCard(nameFragment) {
  return store['stations'].children.find(card =>
    card.children[0] && card.children[0]._html.indexOf(nameFragment) >= 0);
}
/* The Level Up / Hire Villager menu opens on tapping the station
   header now (see UI.renderStationsInto, ui.js) instead of always
   showing an upgrade row inline — so rows live one level deeper,
   inside a '.station-menu' wrapper appended to the '.recipes' body. */
function findRow(card, nameFragment) {
  let found = null;
  if (!card) return null;
  card.children.forEach(part => {
    if (part.className !== 'recipes') return;
    part.children.forEach(child => {
      const rows = child.className === 'station-menu' ? child.children : [child];
      rows.forEach(row => {
        const rBody = row.children && row.children[0];
        if (rBody && rBody._html && rBody._html.indexOf(nameFragment) >= 0) found = row;
      });
    });
  });
  return found;
}
const benchCard = findCard('Crafting Bench');
console.log('  found the Crafting Bench card:', !!benchCard);
const headTag = benchCard.children[0]._html;
console.log('  header shows Lv1:', headTag.indexOf('Lv1') >= 0);
console.log('  no upgrade row before the header is tapped:', !findRow(benchCard, 'Upgrade to Lv2'));
benchCard.children[0].onclick();   // open the station menu
UI.renderCraft();
const benchCardOpen = findCard('Crafting Bench');
const upgradeRow = findRow(benchCardOpen, 'Upgrade to Lv2');
console.log('  upgrade row rendered once the menu is open:', !!upgradeRow);

G.upgradeStation('bench');
UI.renderCraft();
const benchCard2 = findCard('Crafting Bench');
const headTag2 = benchCard2.children[0]._html;
console.log('  header now shows Lv2:', headTag2.indexOf('Lv2') >= 0);
console.log('  no more upgrade row once maxed:', !findRow(benchCard2, 'Upgrade to Lv3'));
