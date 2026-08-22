/* A hired villager now shows a looping progress bar in the station
   menu (same .r-progress/.r-progress-fill markup the player's own
   tap-craft row uses, just an infinite loop synced to
   S.villagerLast/G.villagerInterval instead of a single job) —
   static/empty while stalled. Also: what a villager CONSUMES now
   draws on the same three tiers the player's own G.spendCraftCost
   does (its own zone's crate, then the player's carried inventory,
   then — if that zone has a bank — the shared bank), not the zone
   crate alone. Run: node test/villagerbar.js */
const { boot } = require('./harness');
const { G, store } = boot();
const UI = G.UI;
const give = (k, n) => { S[k] = (S[k] || 0) + n; S.weight = 0; };

function findStationCard(nameFragment) {
  return store['stations'].children.find(card =>
    card.children[0] && card.children[0]._html.indexOf(nameFragment) >= 0);
}
const bodyOf = card => card.children[1];   // [0]=stcard head, [1]=.recipes body
/* openStationMenu (ui.js) is a plain module-level toggle, not game
   state — it survives G.wipe() between test sections, so a single
   click can land on either edge depending on what a prior section
   left it on. Click until the menu is actually showing. */
function openMenu(nameFragment) {
  UI.renderCraft();
  let menu = bodyOf(findStationCard(nameFragment)).children.find(c => c.className === 'station-menu');
  if (!menu) {
    findStationCard(nameFragment).children[0].onclick();
    UI.renderCraft();
    menu = bodyOf(findStationCard(nameFragment)).children.find(c => c.className === 'station-menu');
  }
  return menu;
}
function hiredRow(menu) {
  return menu.children.find(row =>
    row.children[0] && row.children[0]._html.indexOf('Villager hired') >= 0);
}

console.log('== a hired, unstalled villager shows a looping progress bar ==');
G.wipe(); S.zone = 'aerendell'; S.weight = 0;
give('planks', 40); give('stick', 40); give('cloth', 10);
G.buildStation('loom');
G.hireVillagerAt('loom');
G.zoneGrant('aerendell', 'flax', 200);
let menu = openMenu('Loom');
let row = hiredRow(menu);
console.log('  found the hired-villager row:', !!row);
let track = row.children.find(c => c.className === 'r-progress');
let fill = track && track.children[0];
console.log('  has a progress fill element:', !!fill);
console.log('  its animation loops forever:', !!fill && /infinite/.test(fill.style.animation));
console.log('  its animation uses the shared craftFill keyframes:', !!fill && /craftFill/.test(fill.style.animation));

console.log('\n== a stalled villager shows no animated bar ==');
G.wipe(); S.zone = 'aerendell'; S.weight = 0;
give('planks', 40); give('stick', 40);
G.buildStation('loom');
G.hireVillagerAt('loom');
// no flax anywhere (crate, inventory, or bank) -> stalled
menu = openMenu('Loom');
row = hiredRow(menu);
console.log('  row is marked stalled:', row.className.indexOf('stalled') >= 0);
track = row.children.find(c => c.className === 'r-progress');
console.log('  no progress bar rendered while stalled:', !track);

console.log('\n== a villager with an empty zone crate falls back to the player\'s carried inventory ==');
G.wipe(); S.zone = 'aerendell'; S.weight = 0;
give('planks', 40); give('stick', 40);
G.buildStation('loom');
G.hireVillagerAt('loom');
give('flax', 30);                       // carried inventory only, crate empty
console.log('  crate has none:', !G.crateFor('aerendell').flax);
console.log('  zoneCanAfford sees the carried flax:', G.zoneCanAfford('aerendell', { flax: 3 }));
global.__clock += G.villagerInterval('loom') * 2;
const r1 = G.collectVillagerWork();
console.log('  2 intervals applied, drawing from carried inventory:', r1.results[0].applied === 2);
console.log('  carried flax was actually spent:', S.flax === 30 - 6);
console.log('  string still landed in the zone crate:', G.crateFor('aerendell').string === 2);

console.log('\n== crate is drawn down before touching carried inventory ==');
G.wipe(); S.zone = 'aerendell'; S.weight = 0;
give('planks', 40); give('stick', 40);
G.buildStation('loom');
G.hireVillagerAt('loom');
G.zoneGrant('aerendell', 'flax', 3);     // exactly one string's worth in the crate
give('flax', 30);                        // plenty more carried
global.__clock += G.villagerInterval('loom');
G.collectVillagerWork();
console.log('  crate flax spent first:', G.crateFor('aerendell').flax === undefined);
console.log('  carried flax untouched while the crate could still cover it:', S.flax === 30);

console.log('\n== once its own zone has a bank, a villager can draw on the shared bank too ==');
G.wipe(); S.zone = 'kharBarak'; S.weight = 0;
console.log('  Khar-Barak really is a bank zone:', G.zoneHasBank('kharBarak'));
give('planks', 200); give('stick', 200); give('basaltBlock', 20);
G.buildStation('bench');
G.hireVillagerAt('bench');               // villagerRecipe: Stitch Leather, cost {leatherScrap: 3}
S.bankStorage = { leatherScrap: 30 };    // nothing in the crate or carried inventory
console.log('  zoneCanAfford sees the bank leatherScrap:', G.zoneCanAfford('kharBarak', { leatherScrap: 3 }));
global.__clock += G.villagerInterval('bench') * 2;
const r2 = G.collectVillagerWork();
console.log('  2 intervals applied from the bank:', r2.results[0].applied === 2);
console.log('  bank leatherScrap was spent:', S.bankStorage.leatherScrap === 30 - 6);
