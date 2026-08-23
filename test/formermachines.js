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

/* Cooking makes CARDS now, from raw ingredients + fuel POINTS — the
   old per-item cook recipes (cookPoultry/cookSteak/cookPork and the
   20 cook_<fish> ones) are gone. Charcoal-burning is the one plain
   flat-cost recipe still on the Campfire. */
console.log('\n== Campfire: the old per-item cook recipes are gone ==');
G.wipe(); S.zone = 'aerendell'; S.weight = 0;
give('stick', 40); give('flint', 40);
console.log('  built:', G.buildStation('firepit'));
console.log('  cookPoultry no longer exists:', !G.findRecipe('cookPoultry'));
console.log('  cook_bluegill no longer exists:', !G.findRecipe('cook_bluegill'));
console.log('  Burn Charcoal survives as a flat recipe:',
  JSON.stringify((G.findRecipe('makeCharcoal') || {}).cost));

console.log('\n== Campfire: tap-craft flow works the same as any station ==');
give('planks', 10); give('stick', 10);
const started = G.startCraftJob('makeCharcoal');
console.log('  job starts:', started);
console.log('  duration matches the shared tap-craft tuning (x2 cooking mult):',
  S.craftJobs.makeCharcoal.ms === G.TUNE.tapCraftMs * 2);
global.__clock += G.TUNE.tapCraftMs * 2 + 50;
G.tickCraftJobs();
console.log('  job completes -> charcoal gained:', S.charcoal >= 1);

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

/* The Campfire renders on the FARM page (station page:'farm'), not
   Craft — this used to look in #stations and could never find it.
   It also no longer gets the bespoke "pick a food, pick a fuel"
   panel: its recipes are ordinary tap-craft rows now. */
console.log('\n== the Farm page shows the new card recipes for a built Campfire ==');
G.wipe(); S.zone = 'aerendell'; S.weight = 0;
give('stick', 40); give('flint', 40); give('berries', 20);
S.discovered.berries = true; S.discovered.stick = true; S.discovered.planks = true;
G.buildStation('firepit');
UI.go('farm');
const firepitCard = store['farm-stations'].children.find(card =>
  card.children[0] && card.children[0]._html.indexOf('Campfire') >= 0);
console.log('  Campfire card renders on the Farm page:', !!firepitCard);
if (firepitCard) {
  const recipesBody = firepitCard.children.find(p => p.className === 'recipes');
  const rowHtml = recipesBody.children.map(r =>
    (r.children[0] && r.children[0]._html) || '').join('|');
  console.log('  Red Berry card recipe row rendered:', rowHtml.indexOf('Red Berry') >= 0);
  console.log('  its cost line shows the fuel requirement:', rowHtml.indexOf('fuel') >= 0);
  console.log('  no bespoke campfire Menu/Cook panel any more:',
    rowHtml.indexOf('Choose your campfire setup') < 0 && rowHtml.indexOf('Fire is lit') < 0);
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
