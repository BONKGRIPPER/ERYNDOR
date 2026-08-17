/* Pin bar: starting pin, live updates, auto-unpin on completion.
   Run: node test/pins.js */
const { boot } = require('./harness');
const { G } = boot();
const give = (k, n) => { S[k] = (S[k] || 0) + n; S.weight = 0; };

console.log('== fresh game starts with the Crafting Bench pinned ==');
G.wipe();
console.log('  pin slot 0:', JSON.stringify(S.pins[0]), '(expect station/bench)');
const read = G.readPin(S.pins[0]);
console.log('  readPin resolves it:', read && read.kind === 'station' && read.label === 'Crafting Bench');

console.log('\n== the bench shows in the craft list before its materials are known ==');
console.log('  stone discovered:', G.isKnown('stone'), '(expect false, fresh game)');
console.log('  bench buildCost known anyway:', G.costKnown(G.findStation('bench').buildCost) ||
  !!G.findStation('bench').alwaysShown);

console.log('\n== pins:changed actually fires on pin/unpin ==');
let fired = 0;
G.on('pins:changed', () => { fired++; });
G.togglePin({ type: 'recipe', id: 'axe' });
console.log('  fired on pin:', fired >= 1);
G.togglePin({ type: 'recipe', id: 'axe' });
console.log('  fired on unpin:', fired >= 2);

console.log('\n== building the pinned bench clears its own pin ==');
G.wipe();
give('stone', 20); give('stick', 20); give('wood', 20); give('planks', 20); give('basaltBlock', 5);
console.log('  pinned before build:', !!S.pins[0]);
G.buildStation('bench');
console.log('  pin cleared after build:', !S.pins[0]);
console.log('  slot is reusable:', S.pins.filter(p => p).length === 0);

console.log('\n== crafting a pinned one-off recipe clears its pin ==');
G.wipe(); S.weight = 0;
give('stone', 60); give('stick', 60); give('planks', 60); give('basaltBlock', 5); give('stoneBlock', 5);
G.buildStation('bench');
G.togglePin({ type: 'recipe', id: 'axe' });   // Stone Axe — repeatable
G.togglePin({ type: 'recipe', id: 'backpack' }); // Backpack — one-off
give('wood', 20); give('cloth', 10);
console.log('  both pinned:', S.pins.filter(p => p).length === 2);
G.craft('axe');
console.log('  repeatable recipe stays pinned after crafting:', S.pins.some(p => p && p.id === 'axe'));
G.craft('backpack');
console.log('  one-off recipe unpinned after crafting:', !S.pins.some(p => p && p.id === 'backpack'));
