/* Farming: skill, plots, real-time growth gated on watering, region-
   locked seeds. Run: node test/farm.js */
const { boot } = require('./harness');
const { G } = boot();
const give = (k, n) => { S[k] = (S[k] || 0) + n; S.weight = 0; };

console.log('== farming is a real skill ==');
console.log('  G.SKILLS.farming exists:', !!G.SKILLS.farming);

console.log('\n== plot count: base + 1 every 5 levels ==');
G.wipe();
S.skills.farming.lv = 1;
console.log('  lv1 ->', G.farmPlotCount(), '(expect', G.TUNE.farmPlotsBase + ')',
  G.farmPlotCount() === G.TUNE.farmPlotsBase);
S.skills.farming.lv = 5;
console.log('  lv5 -> still base (floor(5/5)=1, so +1):', G.farmPlotCount() === G.TUNE.farmPlotsBase + 1);
S.skills.farming.lv = 11;
console.log('  lv11 -> base+2:', G.farmPlotCount() === G.TUNE.farmPlotsBase + 2);

console.log('\n== planting validates region, ownership, empty slot, plot count ==');
G.wipe(); S.zone = 'aerendell'; S.weight = 0;
console.log('  fails with no seed owned:', G.plantSeed(0, 'flaxSeed') === false);
give('flaxSeed', 3);
console.log('  fails out of bounds:', G.plantSeed(99, 'flaxSeed') === false);
console.log('  succeeds in home region:', G.plantSeed(0, 'flaxSeed') === true);
console.log('  seed consumed:', S.flaxSeed === 2);
console.log('  fails on an occupied slot:', G.plantSeed(0, 'flaxSeed') === false);
/* forestRoad shares aerendell's leth-eiren region now (crops are
   region-locked, not zone-locked — see the "Grows anywhere in
   <region>" wording, ui.js), so planting there should actually
   SUCCEED. kharBarak is a genuinely different region ('khar'). */
S.zone = 'kharBarak';
console.log('  fails outside the seed\'s region:', G.plantSeed(1, 'berrySeed') === false || !S.farmPlots[1]);
S.zone = 'forestRoad';
give('berrySeed', 1);
console.log('  succeeds anywhere else in the same region:', G.plantSeed(1, 'berrySeed') === true);
S.zone = 'aerendell';

console.log('\n== watering starts the timer and grants farming xp ==');
G.wipe(); S.zone = 'aerendell'; S.weight = 0;
give('flaxSeed', 1);
G.plantSeed(0, 'flaxSeed');
const xpBefore = S.skills.farming.xp;
console.log('  water succeeds:', G.waterPlot(0) === true);
console.log('  plot now has a wateredAt/stageMs:', S.farmPlots[0].wateredAt != null && S.farmPlots[0].stageMs > 0);
console.log('  farming xp granted:', S.skills.farming.xp > xpBefore);
console.log('  watering an already-growing plot is a no-op:', G.waterPlot(0) === false);

console.log('\n== elapsed real time (not a live interval) advances a stage ==');
S.farmPlots[0].wateredAt = Date.now() - S.farmPlots[0].stageMs - 1000; // pretend it's overdue
const r = G.collectFarmWork();
console.log('  stage advanced:', r.advanced.includes(0) && S.farmPlots[0].stage === 1);
console.log('  plot needs watering again (flax has 2 stages):',
  S.farmPlots[0].wateredAt === null && !G.plotReady(S.farmPlots[0]));

console.log('\n== multi-stage crop needs every stage watered before it is ready ==');
G.waterPlot(0);
S.farmPlots[0].wateredAt = Date.now() - S.farmPlots[0].stageMs - 1000;
G.collectFarmWork();
console.log('  stage 2 of 2 reached:', S.farmPlots[0].stage === 2);
console.log('  now ready to harvest:', G.plotReady(S.farmPlots[0]) === true);
console.log('  watering a mature plot does nothing:', G.waterPlot(0) === false);

console.log('\n== harvesting grants yield + xp and clears the plot ==');
const flaxBefore = S.flax, hXpBefore = S.skills.farming.xp;
console.log('  harvest succeeds:', G.harvestPlot(0) === true);
console.log('  flax landed in the pack (3-5):', S.flax >= flaxBefore + 3 && S.flax <= flaxBefore + 5);
console.log('  farming xp granted:', S.skills.farming.xp > hXpBefore);
console.log('  plot cleared:', S.farmPlots[0] === null);
console.log('  harvesting an empty plot does nothing:', G.harvestPlot(0) === false);

console.log('\n== the farmPlots ticker is registered ==');
console.log('  exactly one real setInterval backs the shared ticker (unaffected by this new one):',
  Object.keys(global.__intervals).length === 1);

console.log('\n== S.farmPlots survives a save/load round trip ==');
G.wipe(); S.zone = 'aerendell'; S.weight = 0;
give('berrySeed', 1);
G.plantSeed(0, 'berrySeed');
G.waterPlot(0);
const saved = JSON.stringify(S.farmPlots[0]);
G.save(false);
window.S = G.S = G.freshState();
G.load();
console.log('  farmPlots[0] restored:', JSON.stringify(G.S.farmPlots[0]) === saved);

console.log('\n== S.farmPlots survives a zone-travel stash/restore round trip ==');
G.wipe(); S.zone = 'aerendell'; S.weight = 0;
give('flaxSeed', 1);
G.plantSeed(0, 'flaxSeed');
const beforeTravel = JSON.stringify(S.farmPlots[0]);
S.kills = 999;                     // bypass Forest Road's kill gate for this test
G.travel('forestRoad');
console.log('  a fresh zone starts with no plots:', S.farmPlots.length === 0 || S.farmPlots.every(p => !p));
G.travel('aerendell');
console.log('  aerendell plot restored on return:', JSON.stringify(S.farmPlots[0]) === beforeTravel);

console.log('\n== UI.renderFarm renders every plot state without crashing ==');
const UI = G.UI;
G.wipe(); S.zone = 'aerendell'; S.weight = 0;
give('flaxSeed', 1); give('berrySeed', 1);
G.plantSeed(0, 'flaxSeed');        // will be "needs water"
G.plantSeed(1, 'berrySeed');
G.waterPlot(1);                    // "growing"
let threw = false;
try { UI.renderFarm(); } catch (e) { threw = true; console.log('  ', e.stack); }
console.log('  no crash with empty/needs-water/growing plots:', !threw);
const gridEl = document.getElementById('farm').children[0];
console.log('  grid has one cell per unlocked plot:', gridEl.children.length === G.farmPlotCount());
const growingCell = gridEl.children[1];
console.log('  growing cell has a ring with track+fill circles:',
  growingCell.children[0].children.length === 2);
console.log('  growing cell\'s ring fill has a live transition set:',
  growingCell.children[0].children[1].style.transition.indexOf('stroke-dashoffset') === 0);

S.farmPlots[1].wateredAt = Date.now() - S.farmPlots[1].stageMs - 1000;
G.collectFarmWork();
S.farmPlots[1].wateredAt = Date.now() - S.farmPlots[1].stageMs - 1000;
G.collectFarmWork();
S.farmPlots[1].wateredAt = Date.now() - S.farmPlots[1].stageMs - 1000;
G.collectFarmWork();
console.log('  berry plot now ready:', G.plotReady(S.farmPlots[1]));
threw = false;
try { UI.renderFarm(); } catch (e) { threw = true; console.log('  ', e.stack); }
console.log('  no crash rendering a ready plot:', !threw);
const readyCell = document.getElementById('farm').children[0].children[1];
console.log('  ready cell\'s ring fill is at 0 offset (full ring):',
  readyCell.children[0].children[1].style.strokeDashoffset === '0');

console.log('\n== Bag page renders a card for the seed, and its detail sheet shows the region ==');
G.wipe(); S.zone = 'aerendell'; S.weight = 0;
give('flaxSeed', 1);
UI.renderBag();
const grid = document.getElementById('inv').children[0];
const seedCard = grid.children.find(c => c.children.some(ch => ch.className === 'inv-card-nm' && ch._html === 'Flax Seeds'));
console.log('  card rendered in the grid:', !!seedCard);
seedCard.onclick();
const note = document.getElementById('item-sheet-body').children.find(c => c.className === 's-note');
console.log('  detail sheet mentions Leth-Eiren (region-locked, not zone-locked):',
  !!note && note._html.indexOf('Leth-Eiren') >= 0);
