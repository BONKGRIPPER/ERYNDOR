/* Per-zone decks, gating, goblins. Run: node test/zones.js */
const { boot } = require('./harness');
const { G } = boot();

console.log('== each zone has its own deck ==');
Object.keys(G.ZONES).forEach(z => {
  const d = G.ZONES[z].deck;
  const total = Object.values(d).reduce((a, b) => a + b, 0);
  console.log('  ' + G.ZONES[z].name.padEnd(24), total, 'cards',
    JSON.stringify(d));
});

console.log('\n== starting zone deck ==');
G.wipe();
console.log('  zone', G.zoneName(), '| deck', S.deck.length, JSON.stringify(G.deckCounts()));

console.log('\n== travelling builds a new deck, inventory carries ==');
G.addRes('stone', 30); G.addRes('stick', 30); G.addRes('wood', 20);
S.kills = 5;
const invBefore = { stone: S.stone, stick: S.stick, wood: S.wood };
S.drawnCount = 9;
G.travel('forestRoad');
console.log('  now in', G.zoneName());
console.log('  deck', S.deck.length, JSON.stringify(G.deckCounts()));
console.log('  drawnCount reset to', S.drawnCount);
console.log('  inventory carried:',
  S.stone === invBefore.stone && S.stick === invBefore.stick && S.wood === invBefore.wood);

console.log('\n== each zone remembers its own progress ==');
S.drawnCount = 12;
G.travel('aerendell');
console.log('  back in Aerendell: deck', S.deck.length, '| drawn', S.drawnCount,
            '(was 9)');
G.travel('forestRoad');
console.log('  back on the Road:  deck', S.deck.length, '| drawn', S.drawnCount,
            '(was 12)');

console.log('\n== goblins only on the road ==');
/* density is entirely the zone's location decks now — no separate
   spawn-weight zone list to keep in sync with it. 3 independent
   per-slot decks, not one shared pile — membership means "in any
   of the zone's slots". */
const inLocationDecks = (zone, key) =>
  (G.ZONES[zone].locationDecks || []).some(comp => key in (comp || {}));
['aerendell', 'forestRoad'].forEach(z => {
  console.log('  ' + G.ZONES[z].name.padEnd(24), JSON.stringify(G.ZONES[z].locationDecks));
});
console.log('  goblin only in forestRoad\'s decks:',
  !inLocationDecks('aerendell', 'goblin') && inLocationDecks('forestRoad', 'goblin'));

console.log('\n== goblin stats and loot ==');
const g = G.LOCATIONS.goblin;
console.log('  hp', g.hp, '| attack', g.atk);
const tally = {}; let goldRuns = [], scrapRuns = [];
for (let i = 0; i < 4000; i++) {
  const d = G.rollDrops(g);
  Object.keys(d).forEach(k => tally[k] = (tally[k] || 0) + 1);
  if (d.gold) goldRuns.push(d.gold);
  if (d.leatherScrap) scrapRuns.push(d.leatherScrap);
}
Object.keys(tally).forEach(k =>
  console.log('  ' + G.RESOURCES[k].name.padEnd(15), (tally[k] / 40).toFixed(1) + '% of kills'));
console.log('  gold range', Math.min(...goldRuns) + '-' + Math.max(...goldRuns));
console.log('  scrap range', Math.min(...scrapRuns) + '-' + Math.max(...scrapRuns));

console.log('\n== pick on the road, furnace at the gate ==');
const pick = G.findRecipe('scrapPick'), furnace = G.findStation('furnace');
const smithy = G.findStation('smithy');
['aerendell', 'forestRoad', 'kharBarak'].forEach(z => {
  S.zone = z;
  console.log('  in ' + G.ZONES[z].name.padEnd(24),
    'pick:' + (G.inZone(pick) ? 'yes' : 'no '),
    ' furnace:' + (G.inZone(furnace) ? 'yes' : 'no '),
    ' smithy:' + (G.inZone(smithy) ? 'yes' : 'no '));
});

console.log('\n== leather scraps stitch into leather ==');
S.zone = 'aerendell'; G.wipe(); S.weight = 0;
S.stone = 60; S.stick = 60;
G.buildStation('bench');
G.addRes('leatherScrap', 7);
console.log('  scraps', S.leatherScrap, '-> craft:', G.craft('scrapLeather'));
console.log('  scraps now', S.leatherScrap, '| leather', S.leather);

console.log('\n== bronze dagger ==');
S.zone = 'forestRoad'; S.weight = 0;
S.stone = 60; S.bronzeBar = 6; S.stick = 20;
console.log('  build smithy:', G.buildStation('smithy'));
const deckBefore = S.deck.length;
console.log('  craft dagger:', G.craft('bronzeDagger'));
console.log('  melee power', G.bestPower('melee'), '| durability', S.durability.strikeBronze,
            '| equipped', JSON.stringify(S.equipped));
console.log('  deck', deckBefore, '->', S.deck.length);
