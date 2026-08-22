/* Two new skills for the raw-material refining stations, separate
   from woodcut/mining (which track swinging an axe/pick out in the
   field, not milling the result): Wood Cutting (Sawmill's Planks
   recipe) and Stone Cutting (Stone Cutter's Stone/Basalt Block
   recipes) — both used to grant generic Crafting xp instead.
   Run: node test/refiningskills.js */
const { boot } = require('./harness');
const { G } = boot();
const give = (k, n) => { S[k] = (S[k] || 0) + n; S.weight = 0; };

console.log('== both skills exist ==');
console.log('  Wood Cutting exists:', !!G.SKILLS.sawmilling && G.SKILLS.sawmilling.name === 'Wood Cutting');
console.log('  Stone Cutting exists:', !!G.SKILLS.stonecutting && G.SKILLS.stonecutting.name === 'Stone Cutting');
console.log('  distinct from the existing Logging (woodcut) skill:', G.SKILLS.woodcut.name !== 'Wood Cutting');
console.log('  distinct from the existing Mining skill:', G.SKILLS.mining.name !== 'Stone Cutting');

console.log('\n== milling planks at the Sawmill grants Wood Cutting xp, not Crafting ==');
G.wipe(); S.zone = 'aerendell'; S.weight = 0;
give('wood', 40); give('stone', 20);
G.buildStation('sawmill');
give('wood', 10);
const wcBefore = S.skills.sawmilling.xp, craftBefore = S.skills.crafting.xp;
console.log('  planks crafted:', G.craft('planks'));
console.log('  Wood Cutting xp rose by the recipe\'s xp (4):', S.skills.sawmilling.xp === wcBefore + 4);
console.log('  Crafting xp untouched:', S.skills.crafting.xp === craftBefore);

console.log('\n== refining at the Stone Cutter grants Stone Cutting xp, not Crafting ==');
G.wipe(); S.zone = 'aerendell'; S.weight = 0;
give('stone', 40); give('wood', 20); give('basalt', 20);
G.buildStation('stoneCutter');
give('stone', 10);
const scBefore = S.skills.stonecutting.xp, craftBefore2 = S.skills.crafting.xp;
console.log('  stone block crafted:', G.craft('stoneBlock'));
console.log('  Stone Cutting xp rose by 4:', S.skills.stonecutting.xp === scBefore + 4);
give('stoneBlock', 5);
console.log('  basalt block crafted:', G.craft('basaltBlock'));
console.log('  Stone Cutting xp rose by 4 + 6 total:', S.skills.stonecutting.xp === scBefore + 10);
console.log('  Crafting xp untouched by either:', S.skills.crafting.xp === craftBefore2);

console.log('\n== other crafting-skill recipes (bench) are unaffected ==');
G.wipe(); S.zone = 'aerendell'; S.weight = 0;
give('basaltBlock', 20); give('planks', 20); give('leatherScrap', 10);
G.buildStation('bench');
const craftBefore3 = S.skills.crafting.xp;
console.log('  stitch leather crafted at bench:', G.craft('scrapLeather'));
console.log('  still grants Crafting xp as before:', S.skills.crafting.xp > craftBefore3);
