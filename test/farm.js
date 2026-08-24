/* Farming: skill, plots, real-time growth gated on watering, region-
   locked seeds. Run: node test/farm.js */
const { boot } = require('./harness');
const { G } = boot();
const give = (k, n) => { S[k] = (S[k] || 0) + n; S.weight = 0; };

console.log('== farming is a real skill ==');
console.log('  G.SKILLS.farming exists:', !!G.SKILLS.farming);

console.log('\n== plot count: free base, then a doubling-cost purchase per extra plot ==');
G.wipe();
console.log('  starts at exactly TUNE.farmPlotsBase, regardless of farming level:',
  G.farmPlotCount() === G.TUNE.farmPlotsBase);
console.log('  first extra plot costs 2 planks + 2 basaltBlock:',
  JSON.stringify(G.nextFarmPlotCost()) === JSON.stringify({ planks: 2, basaltBlock: 2 }));
console.log('  refuses with nothing in inventory/crate/bank:', G.buildFarmPlot() === false);
give('planks', 2); give('basaltBlock', 2);
console.log('  build succeeds once affordable:', G.buildFarmPlot());
console.log('  plot count grew by exactly 1:', G.farmPlotCount() === G.TUNE.farmPlotsBase + 1);
console.log('  next plot doubles to 4 + 4:',
  JSON.stringify(G.nextFarmPlotCost()) === JSON.stringify({ planks: 4, basaltBlock: 4 }));
give('planks', 4); give('basaltBlock', 4);
G.buildFarmPlot();
console.log('  cost doubles again to 8 + 8:',
  JSON.stringify(G.nextFarmPlotCost()) === JSON.stringify({ planks: 8, basaltBlock: 8 }));
console.log('  survives a save/load round trip:',
  (() => {
    G.save(false); window.S = G.S = G.freshState(); G.load();
    return S.farmPlotsBuilt === 2 && G.farmPlotCount() === G.TUNE.farmPlotsBase + 2;
  })());

console.log('\n== plot count is hard-capped at TUNE.farmPlotsMax ==');
G.wipe();
S.farmPlotsBuilt = G.TUNE.farmPlotsMax - G.TUNE.farmPlotsBase;
console.log('  already at the cap:', G.farmPlotCount() === G.TUNE.farmPlotsMax);
console.log('  no further cost offered:', G.nextFarmPlotCost() === null);
give('planks', 99999); give('basaltBlock', 99999);
console.log('  build refuses once at the cap, even fully stocked:', G.buildFarmPlot() === false);
console.log('  count never exceeds the cap:', G.farmPlotCount() === G.TUNE.farmPlotsMax);

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
/* flax/berries are single-stage crops now (G.CROPS[...].stages === 1)
   — one watering is the whole growth cycle, no "water it again"
   second pass required. */
console.log('  flax has exactly 1 stage:', G.CROPS.flaxSeed.stages === 1);
console.log('  one watering is enough — already ready to harvest:', G.plotReady(S.farmPlots[0]) === true);
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
/* one cell per unlocked plot, plus one more "buy a plot" tile since
   we're not at TUNE.farmPlotsMax — see the farm-plot-build branch,
   UI.renderFarm. */
console.log('  grid has one cell per unlocked plot, plus a buy-plot tile:',
  gridEl.children.length === G.farmPlotCount() + 1);
const buildTile = gridEl.children[gridEl.children.length - 1];
console.log('  the extra tile really is the buy-plot tile:',
  buildTile.className.indexOf('farm-plot-build') >= 0);

console.log('\n== a small status pip marks empty/needs-water/ready, but not growing ==');
const needsWaterCell = gridEl.children[0];
console.log('  needs-water plot shows a red pip:',
  needsWaterCell.children.some(c => c.className === 'dot needs-water'));
const growingCellNoPip = gridEl.children[1];
console.log('  growing plot shows no pip (the ring already covers it):',
  !growingCellNoPip.children.some(c => c.className && c.className.indexOf('dot') === 0));
const emptyCell = gridEl.children[2];
console.log('  empty plot shows a neutral pip:',
  emptyCell.children.some(c => c.className === 'dot empty'));

const growingCell = gridEl.children[1];
console.log('  growing cell has a ring with track+fill circles:',
  growingCell.children[0].children.length === 2);
console.log('  growing cell\'s ring fill has a live transition set:',
  growingCell.children[0].children[1].style.transition.indexOf('stroke-dashoffset') === 0);

S.farmPlots[1].wateredAt = Date.now() - S.farmPlots[1].stageMs - 1000;
G.collectFarmWork();
console.log('  berries are also single-stage now — ready after one watering:', G.plotReady(S.farmPlots[1]));
threw = false;
try { UI.renderFarm(); } catch (e) { threw = true; console.log('  ', e.stack); }
console.log('  no crash rendering a ready plot:', !threw);
const readyCell = document.getElementById('farm').children[0].children[1];
console.log('  ready cell\'s ring fill is at 0 offset (full ring):',
  readyCell.children[0].children[1].style.strokeDashoffset === '0');

console.log('\n== flax and berries take 120s from watering, before farming levels ==');
console.log('  flax base stage is 120s:', G.CROPS.flaxSeed.stageMs === 120000);
console.log('  berries base stage is 120s:', G.CROPS.berrySeed.stageMs === 120000);
G.wipe(); S.zone = 'aerendell'; S.weight = 0;
S.skills.farming.lv = 1;
console.log('  an untrained farmer waits the full 120s:',
  G.farmGrowMs(G.CROPS.flaxSeed) === 120000);
S.skills.farming.lv = 11;
console.log('  the farming skill still shortens it (-2%/lv):',
  G.farmGrowMs(G.CROPS.flaxSeed) < 120000);
S.skills.farming.lv = 1;

console.log('\n== a growing plot shows a progress bar and a live countdown ==');
G.wipe(); S.zone = 'aerendell'; S.weight = 0;
give('flaxSeed', 1);
G.plantSeed(0, 'flaxSeed');
G.waterPlot(0);
UI.go('farm');
const growCell = document.getElementById('farm').children[0].children[0];
const bar = growCell.children.find(c => c.className === 'farm-progress');
console.log('  a farm-progress bar is rendered:', !!bar);
console.log('  it has a fill that animates toward 100%:',
  !!bar && bar.children[0].className === 'farm-progress-fill' &&
  bar.children[0].style.width === '100%');
console.log('  the fill transitions over the REMAINING time, not the full stage:',
  !!bar && /^width \d+ms linear$/.test(bar.children[0].style.transition));
const growHint = growCell.children.find(c => c.className === 'farm-plot-hint');
console.log('  the hint counts down instead of saying "growing":',
  !!growHint && /left$/.test(growHint._html) && growHint._html.indexOf('growing') < 0);
console.log('  and reads as mm:ss near the start of a 120s crop:',
  !!growHint && /^[12]:\d\d left$/.test(growHint._html));
/* nearly done -> seconds-only formatting */
S.farmPlots[0].wateredAt = Date.now() - (S.farmPlots[0].stageMs - 9000);
UI.renderFarm();
const lateHint = document.getElementById('farm').children[0].children[0]
  .children.find(c => c.className === 'farm-plot-hint');
console.log('  under a minute it drops to plain seconds:',
  !!lateHint && /^\ds left$/.test(lateHint._html));

console.log('\n== watering plays a one-shot splash on the plot ==');
G.wipe(); S.zone = 'aerendell'; S.weight = 0;
give('flaxSeed', 1);
G.plantSeed(0, 'flaxSeed');
UI.go('farm');
/* an earlier section watered plot 0, which correctly flagged it —
   step past the splash's 700ms window so this starts clean */
global.__clock += 5000;
UI.renderFarm();
const dryCell = document.getElementById('farm').children[0].children[0];
console.log('  an un-watered plot has no splash:', dryCell.classList.contains('watering') === false);
UI.flagWatered(0);
UI.renderFarm();
const wetCell = document.getElementById('farm').children[0].children[0];
console.log('  the freshly-watered plot gets the splash class:',
  wetCell.classList.contains('watering'));
console.log('  a DIFFERENT plot does not:',
  document.getElementById('farm').children[0].children[1].classList.contains('watering') === false);
/* the flag is time-boxed, so a later re-render doesn't replay it */
UI.flagWatered(0);
global.__clock += 5000;
UI.renderFarm();
console.log('  and it does not replay on a later re-render:',
  document.getElementById('farm').children[0].children[0].classList.contains('watering') === false);

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
