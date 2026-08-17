/* Crafting stations are tied to the zone they were built in.
   Run: node test/zonebuild.js */
const { boot } = require('./harness');
const { G } = boot();
const give = (k, n) => { S[k] = (S[k] || 0) + n; S.weight = 0; };
const unlockAll = () => { S.kills = 20; S.discovered.bronzeBar = true; };

console.log('== fresh game: bench not built anywhere yet ==');
G.wipe(); unlockAll();
console.log('  bench built in aerendell:', !!S.built.bench, '(expect false)');
console.log('  Bare Hands (always-built) is built:', !!S.built.hands, '(expect true)');

console.log('\n== building in one zone does not build it elsewhere ==');
give('stone', 20); give('stick', 20); give('wood', 20); give('planks', 20); give('basaltBlock', 5);
console.log('  build bench in aerendell:', G.buildStation('bench'));
console.log('  built here:', !!S.built.bench);
G.travel('forestRoad');
console.log('  now in', G.zoneName(), '| bench built here too:', !!S.built.bench, '(expect false)');
console.log('  Bare Hands still built (always-built, every zone):', !!S.built.hands);

console.log('\n== each zone remembers its own build once you rebuild there ==');
give('stone', 20); give('stick', 20); give('wood', 20); give('planks', 20); give('basaltBlock', 5);
console.log('  build bench in forestRoad:', G.buildStation('bench'));
G.travel('aerendell');
console.log('  back in aerendell, bench still built:', !!S.built.bench, '(expect true)');
G.travel('forestRoad');
console.log('  back in forestRoad, bench still built:', !!S.built.bench, '(expect true)');
G.travel('kharBarak');
console.log('  in kharBarak (never built there), bench built:', !!S.built.bench, '(expect false)');

console.log('\n== a pinned station reflects the ACTIVE zone, not global state ==');
G.wipe(); unlockAll();
G.togglePin({ type: 'station', id: 'bench' });
give('stone', 20); give('stick', 20); give('wood', 20); give('planks', 20); give('basaltBlock', 5);
G.buildStation('bench');
console.log('  pin shows built (cleared) in aerendell:', !G.readPin({ type: 'station', id: 'bench' }));
G.travel('forestRoad');
G.togglePin({ type: 'station', id: 'bench' });
const pin = G.readPin({ type: 'station', id: 'bench' });
console.log('  pin shows NOT built in forestRoad:', !!pin && pin.kind === 'station');

console.log('\n== cooking (a built-station gate) respects the active zone ==');
G.wipe(); unlockAll();
give('wood', 30); give('planks', 30); give('stone', 30); give('stick', 20); give('flint', 20); give('pork', 4);
G.buildStation('firepit');
console.log('  firepit built in aerendell:', !!S.built.firepit);
G.travel('forestRoad');
console.log('  firepit built in forestRoad (should not carry over):', !!S.built.firepit, '(expect false)');
