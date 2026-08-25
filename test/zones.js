/* Zone gating, goblins, and the GLOBAL deck. Zones used to each
   define their own `deck` block, so first arrival built a fresh
   starter pile and silently handed you cards you never picked —
   that's gone; the deck travels with you.
   Run: node test/zones.js */
const { boot } = require('./harness');
const { G, travelNow } = boot();

console.log('== no zone defines a deck of its own any more ==');
const offenders = Object.keys(G.ZONES).filter(z => G.ZONES[z].deck);
console.log('  zones still carrying a `deck` block:',
  offenders.length ? offenders.join(', ') : 'none');
console.log('  none of them do:', offenders.length === 0);

console.log('\n== the starting deck is the one global STARTING_DECK ==');
G.wipe();
console.log('  zone', G.zoneName(), '| deck', S.deck.length, JSON.stringify(G.deckCounts()));
const startTotal = Object.values(G.STARTING_DECK).reduce((a, b) => a + b, 0);
console.log('  deck size matches STARTING_DECK exactly:', S.deck.length === startTotal);

console.log('\n== travelling does NOT hand you new cards ==');
G.addRes('stone', 30); G.addRes('stick', 30); G.addRes('wood', 20);
S.kills = 5;
const invBefore = { stone: S.stone, stick: S.stick, wood: S.wood };
const deckSig = JSON.stringify(G.deckCounts());
const sizeBefore = S.deck.length;
travelNow('forestRoad');
console.log('  now in', G.zoneName());
console.log('  deck', S.deck.length, JSON.stringify(G.deckCounts()));
console.log('  deck size unchanged by travel:', S.deck.length === sizeBefore);
console.log('  deck contents unchanged by travel:', JSON.stringify(G.deckCounts()) === deckSig);
console.log('  inventory carried:',
  S.stone === invBefore.stone && S.stick === invBefore.stick && S.wood === invBefore.wood);

console.log('\n== the same deck follows you back and forth ==');
travelNow('aerendell');
console.log('  back in Aerendell: deck', S.deck.length, '| same:',
  JSON.stringify(G.deckCounts()) === deckSig);
travelNow('forestRoad');
console.log('  back on the Road:  deck', S.deck.length, '| same:',
  JSON.stringify(G.deckCounts()) === deckSig);

console.log('\n== a card crafted in one zone is still there in the next ==');
travelNow('aerendell');
S.weight = 0; S.stoneBlock = 5; S.planks = 40; S.basaltBlock = 10; S.wood = 40;
G.buildStation('bench');
const hadPick = G.deckCounts().pickStone || 0;
const crafted = G.craft('stonePick');
const nowPick = G.deckCounts().pickStone || 0;
console.log('  Stone Pick crafted in Aerendell:', crafted && nowPick > hadPick);
travelNow('forestRoad');
console.log('  and it is still in the deck on the Road:',
  (G.deckCounts().pickStone || 0) === nowPick);

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

console.log('\n== every station lives in Aerendell now, informational readout ==');
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
S.zone = 'aerendell'; S.weight = 0;   // the smithy is Aerendell-only now
S.stone = 60; S.bronzeBar = 6; S.stick = 20;
console.log('  build smithy:', G.buildStation('smithy'));
const deckBefore = S.deck.length;
console.log('  craft dagger:', G.craft('bronzeDagger'));
console.log('  melee power', G.bestPower('melee'), '| durability', S.durability.strikeBronze,
            '| equipped', JSON.stringify(S.equipped));
console.log('  deck', deckBefore, '->', S.deck.length);
