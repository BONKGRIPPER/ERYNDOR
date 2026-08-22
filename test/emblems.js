/* New flat SVG emblems: Pine Tree (an actual tree, not the raw-log
   icon), Logs/wood (three bundled log-ends, not a single block),
   Flint (a distinct knapped-flake shape, was silently falling back
   to the plain Stone icon), Boulder (a bulkier rock filling more of
   the viewBox, distinct from Stone's small shard). See js/sprites.js.
   Run: node test/emblems.js */
const { boot } = require('./harness');
const { G } = boot();

console.log('== the 4 new sprite keys exist and render real SVG ==');
['boulder', 'tree', 'flint'].forEach(key => {
  console.log('  G.SPRITES.' + key + ' exists:', !!G.SPRITES[key]);
  const svg = G.sprite(key, 24);
  console.log('  G.sprite(\'' + key + '\') renders an <svg>:', svg.indexOf('<svg') === 0);
});

console.log('\n== Flint no longer silently falls back to the Stone icon ==');
console.log('  G.resSprite(\'flint\') resolves to its own key now:', G.resSprite('flint') === 'flint');
console.log('  flint\'s rendered markup differs from stone\'s:', G.sprite('flint', 24) !== G.sprite('stone', 24));

console.log('\n== Boulder and Pine Tree location cards point at the new art ==');
console.log('  boulder.sprite is the new bulkier-rock key:', G.LOCATIONS.boulder.sprite === 'boulder');
console.log('  pineTree.sprite is the new tree key:', G.LOCATIONS.pineTree.sprite === 'tree');
console.log('  boulder\'s emblem no longer matches raw Stone\'s:',
  G.sprite(G.LOCATIONS.boulder.sprite, 24) !== G.sprite('stone', 24));
console.log('  pine tree\'s emblem no longer matches raw Wood\'s:',
  G.sprite(G.LOCATIONS.pineTree.sprite, 24) !== G.sprite('wood', 24));

console.log('\n== Logs (wood) now draws three log-ends, not one block ==');
const woodSvg = G.SPRITES.wood.d;
console.log('  three <circle> shapes for the three log ends (6 circles: bark + core each):',
  (woodSvg.match(/<circle/g) || []).length === 6);
console.log('  no leftover single-block <rect>/<ellipse> shape:',
  woodSvg.indexOf('<rect') < 0 && woodSvg.indexOf('<ellipse') < 0);

console.log('\n== Planks still reuses the (now updated) Logs art via ALIAS, unaffected ==');
console.log('  G.resSprite(\'planks\') still resolves via the wood alias:', G.resSprite('planks') === 'planks');
console.log('  planks renders the same markup as the new three-log wood art:',
  G.sprite('planks', 24) === G.sprite('wood', 24));

console.log('\n== every location/resource still resolves to SOME real sprite, nothing broken ==');
let brokenLocations = [];
Object.keys(G.LOCATIONS).forEach(key => {
  const def = G.LOCATIONS[key];
  if (def.sprite && !G.SPRITES[def.sprite] && !G.ALIAS[def.sprite]) brokenLocations.push(key);
});
console.log('  no location points at a missing sprite key:', brokenLocations.length === 0, brokenLocations);
