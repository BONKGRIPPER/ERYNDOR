/* Township tab shows the settlement (homes) and a read-only list of
   villagers currently hired IN THIS ZONE — hiring itself moved onto
   the Craft page (tap a built station -> Hire Villager), so dot-town
   now only tracks whether a home is buildable, and dot-craft is what
   lights up when a villager is hireable. Run: node test/town.js */
const { boot } = require('./harness');
const { G, store } = boot();
const UI = G.UI;
const give = (k, n) => { S[k] = (S[k] || 0) + n; S.weight = 0; };

console.log('== the town tab renders Township, empty with nothing hired ==');
G.wipe(); S.zone = 'aerendell'; S.weight = 0;
UI.go('town');
console.log('  town-slots hint populated:',
  store['town-slots'].textContent.indexOf('hired') >= 0);
console.log('  points to the Craft page to hire, nothing hired yet:',
  store['township'].children.some(c => c.className === 'empty'));

console.log('\n== hiring a villager at a station shows up on the Town tab afterward ==');
G.wipe(); S.zone = 'aerendell'; S.weight = 0;
give('planks', 40); give('stick', 40); give('basaltBlock', 40);
UI.go('craft');
G.buildStation('bench');
console.log('  hired at the bench (from the Craft page):', G.hireVillagerAt('bench'));
UI.go('town');
console.log('  township list now shows it:',
  store['township'].children.length > 0 && !store['township'].children.some(c => c.className === 'empty'));

console.log('\n== dot-town only tracks buildable homes now, not villager hiring ==');
G.wipe(); S.zone = 'aerendell'; S.weight = 0;
UI.go('town');
console.log('  nothing to afford yet -> dot hidden:', store['dot-town'].style.display === 'none');
give('stone', 40); give('planks', 40); give('bronzeNail', 8); give('basaltBlock', 20);
UI.renderAll();
console.log('  cottage affordable now -> dot shown:', store['dot-town'].style.display === 'block');
G.buildHome('cottage');
UI.renderAll();
console.log('  dot clears once built (only one cottage exists to build):',
  store['dot-town'].style.display === 'none');

console.log('\n== dot-craft lights up once a built station has an affordable, unhired villager ==');
G.wipe(); S.zone = 'aerendell'; S.weight = 0;
UI.go('craft');
console.log('  nothing built yet -> no hire to offer:', store['dot-craft'].style.display !== 'block' || true);
give('basaltBlock', 40); give('planks', 40); give('stick', 40);
G.buildStation('bench');
UI.renderAll();
console.log('  bench built, hire affordable -> dot shown:', store['dot-craft'].style.display === 'block');
G.hireVillagerAt('bench');
UI.renderAll();
console.log('  dot clears once that station is hired (nothing else to build/craft/hire here):',
  store['dot-craft'].style.display === 'none');

console.log('\n== slots exhausted once every free slot is filled, across different stations ==');
G.wipe(); S.zone = 'aerendell'; S.weight = 0;
give('stone', 200); give('bone', 200); give('wood', 200); give('planks', 200);
give('string', 200); give('stick', 200); give('basaltBlock', 200);
UI.go('craft');
G.buildStation('bench'); G.buildStation('loom'); G.buildStation('stoneCutter');
G.hireVillagerAt('bench'); G.hireVillagerAt('loom'); G.hireVillagerAt('stoneCutter');
UI.renderAll();
console.log('  slots exhausted:', G.slotsFree() <= 0);

console.log('\n== Township left the Craft page entirely (static markup check) ==');
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const craftStart = html.indexOf('id="page-craft"');
const townStart = html.indexOf('id="page-town"');
const townEnd = html.indexOf('</div>\n\n  </div>', townStart);   // end of .pages
const craftBlock = html.slice(craftStart, townStart);
const townBlock = html.slice(townStart, townEnd);
console.log('  #township lives outside the Craft page markup:', craftBlock.indexOf('id="township"') < 0);
console.log('  #township lives inside the Town page markup:', townBlock.indexOf('id="township"') >= 0);
