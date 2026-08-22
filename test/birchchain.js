/* Birch Trees (Still-tide Pass, requires a Bronze Axe to damage) ->
   Birch Logs -> Birch Planks (Sawmill, Birch Logs + Pine Planks) ->
   Fishing Rod (now needs Birch Planks, and is no longer craftable in
   Aerendell). "Planks" was renamed "Pine Planks" now that a second
   plank tier exists. Run: node test/birchchain.js */
const { boot } = require('./harness');
const { G } = boot();
const give = (k, n) => { S[k] = (S[k] || 0) + n; S.weight = 0; };

console.log('== Wood/Logs is renamed to Pine Planks, Birch resources exist ==');
console.log('  planks resource is now called Pine Planks:', G.RESOURCES.planks.name === 'Pine Planks');
console.log('  birchLog resource exists:', !!G.RESOURCES.birchLog);
console.log('  birchPlanks resource exists:', !!G.RESOURCES.birchPlanks);
console.log('  birch resources render real art, not the stone fallback:',
  G.resSprite('birchLog') === 'birchLog' && G.resSprite('birchPlanks') === 'birchPlanks');

console.log('\n== Birch Tree only shows up in Still-tide Pass, gated behind a Bronze Axe ==');
console.log('  birchTree location exists:', !!G.LOCATIONS.birchTree);
console.log('  requires an axe, specifically the Bronze Axe:',
  G.LOCATIONS.birchTree.requires === 'axe' && G.LOCATIONS.birchTree.requiresCard === 'axeBronze');
console.log('  drops birchLog:', G.LOCATIONS.birchTree.dropTable.some(d => d.key === 'birchLog'));
console.log('  mixed into Still-tide Pass\'s tree slot:',
  !!G.ZONES.stillTidePass.locationDecks[1].birchTree);
console.log('  NOT in Aerendell\'s, Forest Road\'s, or Khar-Barak\'s location decks:',
  !(G.ZONES.aerendell.locationDecks || []).some(comp => 'birchTree' in (comp || {})) &&
  !(G.ZONES.forestRoad.locationDecks || []).some(comp => 'birchTree' in (comp || {})) &&
  !(G.ZONES.kharBarak.locationDecks || []).some(comp => 'birchTree' in (comp || {})));

console.log('\n== a lesser axe swing cannot touch a Birch Tree, only the Bronze Axe can ==');
G.wipe(); S.zone = 'stillTidePass'; S.weight = 0;
S.locationField = [null, { key: 'birchTree', hp: 6 }, null];
console.log('  a Flint Axe swing does not match it:',
  G.activeLocation('axe', undefined, 'axeFlint') === null);
console.log('  a Bronze Axe swing does:',
  G.activeLocation('axe', undefined, 'axeBronze') &&
  G.activeLocation('axe', undefined, 'axeBronze').key === 'birchTree');

console.log('\n== Sawmill mills Birch Logs + Pine Planks into Birch Planks ==');
G.wipe(); S.zone = 'aerendell'; S.weight = 0;
give('wood', 30); give('stone', 20);
G.buildStation('sawmill');
give('planks', 10); give('birchLog', 10);
const planksBefore = S.planks, logsBefore = S.birchLog;
console.log('  birch planks recipe exists at the sawmill:', !!G.findRecipe('birchPlanks'));
console.log('  villager default is still the cheap Pine Planks recipe, not this one:',
  G.stationVillagerRecipe('sawmill').id === 'planks');
console.log('  crafts successfully:', G.craft('birchPlanks'));
console.log('  spent birch logs:', S.birchLog < logsBefore);
console.log('  spent pine planks too:', S.planks < planksBefore);
console.log('  gained 1 birch plank:', S.birchPlanks === 1);

console.log('\n== Fishing Rod now costs Birch Planks and is gone from Aerendell ==');
console.log('  fishingRod recipe cost includes birchPlanks, not plain planks:',
  G.findRecipe('fishingRod').cost.birchPlanks > 0 && !('planks' in G.findRecipe('fishingRod').cost));
console.log('  recipe is zone-restricted now (used to be craftable everywhere):',
  Array.isArray(G.findRecipe('fishingRod').zones));
console.log('  Aerendell is NOT in the allowed zone list:',
  G.findRecipe('fishingRod').zones.indexOf('aerendell') < 0);
G.wipe(); S.zone = 'aerendell'; S.weight = 0;
give('basaltBlock', 10); give('planks', 30); give('stick', 20);
give('birchPlanks', 10); give('string', 10); give('bone', 10);
G.buildStation('bench');
console.log('  bench built:', S.built.bench);
console.log('  fishing rod NOT craftable while standing in Aerendell:', G.inZone(G.findRecipe('fishingRod')) === false);
S.zone = 'forestRoad';
console.log('  IS craftable once you travel to a zone on its list (Forest Road):',
  G.inZone(G.findRecipe('fishingRod')) === true);
console.log('  and actually crafts there:', G.craft('fishingRod'));
