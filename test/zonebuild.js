/* Every crafting station except Bare Hands is Aerendell-only now —
   gather out in the zones, bring it home to craft. Used to be that
   stations were zone-tied (build fresh in each zone you visited);
   now there's only one zone that can ever have them at all.
   Run: node test/zonebuild.js */
const { boot } = require('./harness');
const { G, travelNow } = boot();
const give = (k, n) => { S[k] = (S[k] || 0) + n; S.weight = 0; };
const unlockAll = () => { S.kills = 20; S.discovered.bronzeBar = true; };

console.log('== fresh game: bench not built anywhere yet ==');
G.wipe(); unlockAll();
console.log('  bench built in aerendell:', !!S.built.bench, '(expect false)');
console.log('  Bare Hands (always-built) is built:', !!S.built.hands, '(expect true)');

console.log('\n== S.built is still per-zone — only Aerendell ever has anything in it ==');
give('stone', 20); give('stick', 20); give('wood', 20); give('planks', 20); give('basaltBlock', 5);
console.log('  build bench in aerendell:', G.buildStation('bench'));
console.log('  built here:', !!S.built.bench);
travelNow('forestRoad');
console.log("  Forest Road's OWN built map never had it (nothing built it there):",
  !S.built.bench, '(expect true — not a regression, S.built is still zone-stashed)');
console.log('  Bare Hands still built (always-built, every zone):', !!S.built.hands);
travelNow('aerendell');
console.log('  and it is still built back home, exactly as left it:', !!S.built.bench);

console.log('\n== every station but Bare Hands refuses to build outside Aerendell ==');
G.wipe(); unlockAll();
give('stone', 200); give('stick', 200); give('wood', 200); give('planks', 200); give('basaltBlock', 50);
give('bronzeBar', 20); give('charcoal', 40); give('string', 40); give('cloth', 40);
['bench', 'armorBench', 'altar', 'firepit', 'tannery', 'fletching', 'furnace', 'smithy', 'loom', 'stoneCutter', 'sawmill']
  .forEach(id => { console.log('  ' + id + ' station.zones is aerendell-only:',
    JSON.stringify(G.findStation(id).zones) === JSON.stringify(['aerendell'])); });
travelNow('forestRoad');
let anyBuiltAway = false;
['bench', 'armorBench', 'altar', 'firepit', 'tannery', 'fletching', 'furnace', 'smithy', 'loom', 'stoneCutter', 'sawmill']
  .forEach(id => { if (G.buildStation(id)) anyBuiltAway = true; });
console.log('  none of them built while away from Aerendell:', !anyBuiltAway);
console.log('  and G.inZone agrees for each:',
  ['bench', 'armorBench', 'altar', 'firepit', 'tannery', 'fletching', 'furnace', 'smithy', 'loom', 'stoneCutter', 'sawmill']
    .every(id => !G.inZone(G.findStation(id))));
travelNow('aerendell');
console.log('  but bench builds fine once actually home:', G.buildStation('bench'));

console.log('\n== Bare Hands is the one exception — no zones field, works everywhere ==');
console.log('  hands has no zones restriction:', G.findStation('hands').zones === undefined);
travelNow('forestRoad');
console.log('  and reads as built (always-built) away from home too:', !!S.built.hands);

console.log('\n== a pinned station still reflects live built state, wherever you are ==');
G.wipe(); unlockAll();
G.togglePin({ type: 'station', id: 'bench' });
give('stone', 20); give('stick', 20); give('wood', 20); give('planks', 20); give('basaltBlock', 5);
G.buildStation('bench');
console.log('  pin shows built (cleared) once built:', !G.readPin({ type: 'station', id: 'bench' }));

console.log('\n== cooking (a built-station gate) is unusable away from Aerendell ==');
G.wipe(); unlockAll();
give('wood', 30); give('planks', 30); give('stone', 30); give('stick', 20); give('flint', 20); give('pork', 4);
G.buildStation('firepit');
console.log('  firepit built in aerendell:', !!S.built.firepit);
travelNow('forestRoad');
console.log('  the Farm page has no cooking station to show out here:', !G.inZone(G.findStation('firepit')));
