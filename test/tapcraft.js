/* Batch 2: tap-to-craft recipe bars for ordinary stations. Tapping a
   recipe spends its cost immediately but the effects land TUNE.tapCraftMs
   later (G.startCraftJob / G.tickCraftJobs), instead of G.craft()'s old
   one-shot instant grant — which still exists unchanged for tests/villagers.
   Run: node test/tapcraft.js */
const { boot } = require('./harness');
const { G, store } = boot();
const UI = G.UI;
const give = (k, n) => { S[k] = (S[k] || 0) + n; S.weight = 0; };

console.log('== starting a job spends the cost right away but withholds the effect ==');
G.wipe();
give('stone', 20); give('wood', 20); give('planks', 20); give('basaltBlock', 10); give('stoneBlock', 10); give('basaltBlock', 10); give('stoneBlock', 10);
G.buildStation('bench');
const stoneBlockBefore = S.stoneBlock, deckBefore = G.deckCounts().axeStone || 0;
const started = G.startCraftJob('axe');
console.log('  job started:', started);
console.log('  cost spent immediately:', S.stoneBlock === stoneBlockBefore - 1);
console.log('  job recorded:', !!S.craftJobs.axe);
console.log('  no card granted yet:', (G.deckCounts().axeStone || 0) === deckBefore);
console.log('  S.made not bumped yet:', !S.made.axe);

console.log('\n== the same recipe cannot be started twice while running ==');
console.log('  refuses a second tap:', G.startCraftJob('axe') === false);

console.log('\n== a different recipe can run at the same time ==');
give('flax', 10);
console.log('  second recipe starts fine:', G.startCraftJob('string') === true);
console.log('  both jobs tracked:', !!S.craftJobs.axe && !!S.craftJobs.string);

console.log('\n== progress climbs with elapsed time, clamped to 1 ==');
const half = G.TUNE.tapCraftMs / 2;
global.__clock += half;
console.log('  ~50% partway through:', Math.abs(G.craftJobProgress('axe') - 0.5) < 0.05);
global.__clock += G.TUNE.tapCraftMs * 10;
console.log('  clamped at 1 well past the deadline:', G.craftJobProgress('axe') === 1);
console.log('  idle recipe reads 0:', G.craftJobProgress('backpack') === 0);

console.log('\n== ticking before the deadline does nothing ==');
G.wipe();
give('stone', 20); give('wood', 20); give('planks', 20); give('basaltBlock', 10); give('stoneBlock', 10);
G.buildStation('bench');
G.startCraftJob('axe');
global.__clock += G.TUNE.tapCraftMs - 100;
G.tickCraftJobs();
console.log('  still running:', !!S.craftJobs.axe);
console.log('  still no card:', !S.made.axe);

console.log('\n== ticking past the deadline lands the effect and clears the job ==');
let craftFired = 0, doneFired = 0;
G.on('craft', () => { craftFired++; });
G.on('craftjob:done', () => { doneFired++; });
global.__clock += 200;
G.tickCraftJobs();
console.log('  job cleared:', !S.craftJobs.axe);
console.log('  made incremented:', S.made.axe === 1);
console.log('  card granted:', (G.deckCounts().axeStone || 0) === 1);
console.log('  craft event fired:', craftFired === 1);
console.log('  craftjob:done fired:', doneFired === 1);

console.log('\n== a repeatable recipe can be tap-crafted again right after ==');
give('stone', 20); give('wood', 20); give('planks', 20); give('basaltBlock', 10); give('stoneBlock', 10);
console.log('  starts again:', G.startCraftJob('axe') === true);

console.log('\n== a non-repeatable recipe locks out after its job completes ==');
G.wipe();
give('stick', 20); give('wood', 20); give('planks', 20); give('cloth', 10);
G.buildStation('bench');
console.log('  backpack job starts:', G.startCraftJob('backpack') === true);
global.__clock += G.TUNE.tapCraftMs + 50;
G.tickCraftJobs();
console.log('  backpack equipped:', S.equipped.cape === 'backpack' || S.equipped.bag === 'backpack');
give('stick', 20); give('wood', 20); give('planks', 20); give('cloth', 10);
console.log('  refuses to start again:', G.startCraftJob('backpack') === false);

console.log('\n== refuses to start without affording the cost ==');
G.wipe();
G.buildStation('bench');
console.log('  no stone/wood -> refused:', G.startCraftJob('axe') === false);
console.log('  nothing spent:', S.stone === 0 && S.wood === 0);
console.log('  no job recorded:', !S.craftJobs.axe);

console.log('\n== G.craft() the instant path still works exactly as before ==');
G.wipe();
give('stone', 20); give('wood', 20); give('planks', 20); give('basaltBlock', 10); give('stoneBlock', 10);
G.buildStation('bench');
console.log('  instant craft succeeds:', G.craft('axe') === true);
console.log('  effect lands immediately, no job involved:', S.made.axe === 1 && !S.craftJobs.axe);

console.log('\n== craftJobs survives a save/load round trip ==');
G.wipe();
give('stone', 20); give('wood', 20); give('planks', 20); give('basaltBlock', 10); give('stoneBlock', 10);
G.buildStation('bench');
G.startCraftJob('axe');
G.save(false);
window.S = G.S = G.freshState();
G.load();
console.log('  job restored:', !!S.craftJobs.axe);

console.log('\n== an old save with no craftJobs field loads safely ==');
G.wipe();
delete S.craftJobs;
G.save(false);
window.S = G.S = G.freshState();
G.load();
console.log('  backfilled to {}:', JSON.stringify(S.craftJobs) === '{}');

console.log('\n== UI.renderCraft shows a running job as disabled with a progress bar ==');
G.wipe();
give('stone', 50); give('wood', 50); give('planks', 50); give('basaltBlock', 10); give('stoneBlock', 10);
S.discovered.stone = true; S.discovered.wood = true;   // recipe rows only show once seen
S.discovered.stoneBlock = true; S.discovered.planks = true;
G.buildStation('bench');
UI.go('craft');
G.startCraftJob('axe');
UI.renderCraft();
function findRecipeRow(nameFragment) {
  let found = null;
  store['stations'].children.forEach(card => {
    card.children.forEach(part => {
      if (part.className !== 'recipes') return;
      part.children.forEach(row => {
        const rBody = row.children && row.children[0];
        if (rBody && rBody._html && rBody._html.indexOf(nameFragment) >= 0) found = row;
      });
    });
  });
  return found;
}
const axeRow = findRecipeRow('Stone Axe');
console.log('  found the Stone Axe recipe row:', !!axeRow);
if (axeRow) {
  /* row children while running: [r-body, r-progress track, btn-col] —
     the progress bar sits on the row itself now (bottom-edge fill,
     same treatment as the header's zone xp bar), not nested inside
     r-body. */
  const col = axeRow.children[axeRow.children.length - 1];
  const btn = col.children[col.children.length - 1];
  console.log('  button reads Crafting…:', btn._html === 'Crafting…');
  console.log('  button disabled:', btn.disabled === true);
  const track = axeRow.children.find(c => c.className === 'r-progress');
  console.log('  progress track rendered:', !!track);
  console.log('  fill bar present:', track.children.length === 1 && track.children[0].className === 'r-progress-fill');
}

console.log('\n== once the job clears, the button goes back to Craft ==');
global.__clock += G.TUNE.tapCraftMs + 50;
G.tickCraftJobs();   // re-renders via state:changed -> UI.renderAll
const axeRow2 = findRecipeRow('Stone Axe');
if (axeRow2) {
  const col2 = axeRow2.children[axeRow2.children.length - 1];
  const btn2 = col2.children[col2.children.length - 1];
  console.log('  button back to Craft:', btn2._html === 'Craft');
  console.log('  button enabled again:', btn2.disabled === false);
  console.log('  progress bar removed once idle:',
    !axeRow2.children.find(c => c.className === 'r-progress'));
}
