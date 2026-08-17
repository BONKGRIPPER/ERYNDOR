/* Batch 4: Campfire, Stone Furnace and Bone Altar retired as timed
   input-slot machines and became ordinary tap-craft stations, same
   as Bench/Loom/etc — see G.STATIONS in data.js and G.startCraftJob
   in craft.js. Run: node test/formermachines.js */
const { boot } = require('./harness');
const { G, store } = boot();
const UI = G.UI;
const give = (k, n) => { S[k] = (S[k] || 0) + n; S.weight = 0; };

console.log('== the old machine API is gone ==');
console.log('  G.MACHINES:', typeof G.MACHINES === 'undefined');
console.log('  G.loadSlot:', typeof G.loadSlot === 'undefined');
console.log('  G.startMachine:', typeof G.startMachine === 'undefined');
console.log('  G.tickMachines:', typeof G.tickMachines === 'undefined');
console.log('  UI.openMachine:', typeof UI.openMachine === 'undefined');
console.log('  UI.renderMachineBar:', typeof UI.renderMachineBar === 'undefined');
console.log('  no station still carries an "opens" field:',
  G.STATIONS.every(st => !st.opens));

console.log('\n== Campfire: cooking recipes are ordinary flat-cost recipes ==');
G.wipe(); S.zone = 'aerendell'; S.weight = 0;
give('stick', 40); give('flint', 40);
console.log('  built:', G.buildStation('firepit'));
give('poultry', 5);
console.log('  cookPoultry cost:', JSON.stringify(G.findRecipe('cookPoultry').cost));
console.log('  instant craft works:', G.craft('cookPoultry'));
console.log('  cooked poultry gained:', S.cookedPoultry === 1);
console.log('  poultry and a stick spent:', S.poultry === 4 && S.stick < 40);

console.log('\n== Campfire: tap-craft flow works the same as any station ==');
const started = G.startCraftJob('cookPoultry');
console.log('  job starts:', started);
console.log('  duration matches the shared tap-craft tuning:',
  S.craftJobs.cookPoultry.ms === G.TUNE.tapCraftMs);
global.__clock += G.TUNE.tapCraftMs + 50;
G.tickCraftJobs();
console.log('  job completes -> a second cooked poultry:', S.cookedPoultry === 2);

console.log('\n== Stone Furnace: bronze bar is one flat recipe now (was 2 ores + a fuel slot) ==');
G.wipe(); S.zone = 'kharBarak'; S.weight = 0;
give('stone', 60); give('charcoal', 20);
console.log('  built:', G.buildStation('furnace'));
give('tin', 5); give('copper', 5); give('charcoal', 5);
console.log('  bronzeBar cost:', JSON.stringify(G.findRecipe('bronzeBar').cost));
console.log('  smelt works:', G.craft('bronzeBar'));
console.log('  bronze bar gained:', S.bronzeBar === 1);

console.log('\n== Bone Altar: burying a bone is a repeatable recipe with r.prayer ==');
G.wipe(); S.zone = 'aerendell'; S.weight = 0;
give('bone', 20); give('basaltBlock', 10);
console.log('  built:', G.buildStation('altar'));
console.log('  buryBone is repeatable:', G.findRecipe('buryBone').repeatable === true);
const ppBefore = S.prayerPoints;
console.log('  bury works:', G.craft('buryBone'));
console.log('  prayer points gained:', S.prayerPoints > ppBefore);
console.log('  can bury again immediately (repeatable):', G.craft('buryBone'));

console.log('\n== all three former machines carry an upgrade tier like other stations ==');
['firepit', 'furnace', 'altar'].forEach(id => {
  const st = G.findStation(id);
  console.log('  ' + id + ' has an upgrade tier:', Array.isArray(st.upgrades) && st.upgrades.length > 0);
});

console.log('\n== UI.renderCraft shows the new recipes for a built Campfire ==');
G.wipe(); S.zone = 'aerendell'; S.weight = 0;
give('stick', 40); give('flint', 40); give('poultry', 5);
S.discovered.poultry = true; S.discovered.stick = true;
G.buildStation('firepit');
UI.go('craft');
const firepitCard = store['stations'].children.find(card =>
  card.children[0] && card.children[0]._html.indexOf('Campfire') >= 0);
console.log('  Campfire card renders:', !!firepitCard);
if (firepitCard) {
  const recipesBody = firepitCard.children.find(p => p.className === 'recipes');
  const cookRow = recipesBody.children.find(row =>
    row.children[0] && row.children[0]._html.indexOf('Cook Poultry') >= 0);
  console.log('  Cook Poultry recipe row rendered:', !!cookRow);
}

console.log('\n== unbuilt stations with no known recipe inside stay hidden ==');
G.wipe(); S.zone = 'kharBarak'; S.weight = 0;
UI.go('craft');
const furnaceCardHidden = store['stations'].children.find(card =>
  card.children[0] && card.children[0]._html.indexOf('Stone Furnace') >= 0);
console.log('  furnace not shown with nothing discovered:', !furnaceCardHidden);
S.discovered.stone = true; S.discovered.charcoal = true;   // build cost known...
UI.renderCraft();
const furnaceStillHidden = store['stations'].children.find(card =>
  card.children[0] && card.children[0]._html.indexOf('Stone Furnace') >= 0);
console.log('  ...but still hidden with no recipe ingredient known yet:', !furnaceStillHidden);
S.discovered.tin = true; S.discovered.copper = true;        // now a recipe is known too
UI.renderCraft();
const furnaceShown = store['stations'].children.find(card =>
  card.children[0] && card.children[0]._html.indexOf('Stone Furnace') >= 0);
console.log('  shown once both build cost AND a recipe are known:', !!furnaceShown);

console.log('\n== the always-shown Bench ignores the new recipe-known gate ==');
G.wipe(); S.zone = 'aerendell'; S.weight = 0;
UI.go('craft');
const benchCard = store['stations'].children.find(card =>
  card.children[0] && card.children[0]._html.indexOf('Crafting Bench') >= 0);
console.log('  bench still shown on a totally fresh save:', !!benchCard);
