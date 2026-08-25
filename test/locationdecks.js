/* Location field: 3 independent per-slot decks instead of one shared
   pile — each field slot (rock/tree/animal, or whatever a zone
   configures) shuffles and reshuffles on its own, so a zone with a
   dedicated Boulder deck in slot 0 structurally always has a Boulder
   there. See G.buildLocationDecks/G.fillLocationField (engine.js) and
   G.ZONES[zone].locationDecks (data.js). Run: node test/locationdecks.js */
const { boot } = require('./harness');
const { G, travelNow } = boot();

console.log('== each zone\'s slot decks build from locationDecks, one array entry per slot ==');
G.wipe(); S.zone = 'aerendell'; S.weight = 0;
console.log('  3 slot decks exist:', S.locationDecks.length === 3);
console.log('  slot 0 (rock) is all boulder:', S.locationDecks[0].deck.every(k => k === 'boulder'));
console.log('  slot 0 has the declared count (6):', S.locationDecks[0].deck.length === 6);
console.log('  slot 1 (tree) is all pineTree:', S.locationDecks[1].deck.every(k => k === 'pineTree'));
console.log('  slot 2 (animal) mixes chicken+sheep:',
  S.locationDecks[2].deck.filter(k => k === 'chicken').length === 3 &&
  S.locationDecks[2].deck.filter(k => k === 'sheep').length === 2);

console.log('\n== the field always has a Boulder in slot 0 and a Pine Tree in slot 1 ==');
console.log('  slot 0:', S.locationField[0] && S.locationField[0].key);
console.log('  slot 1:', S.locationField[1] && S.locationField[1].key);
console.log('  deterministic:', S.locationField[0].key === 'boulder' && S.locationField[1].key === 'pineTree');

console.log('\n== clearing slot 0 refills it from its OWN deck, never slot 1\'s ==');
S.locationField[0] = null;
G.fillLocationField();
console.log('  slot 0 refilled with a boulder, not a pine tree:', S.locationField[0].key === 'boulder');
console.log('  slot 1 untouched:', S.locationField[1].key === 'pineTree');

console.log('\n== a slot deck reshuffles independently once exhausted ==');
G.wipe(); S.zone = 'aerendell'; S.weight = 0;
const slot0 = S.locationDecks[0], slot1 = S.locationDecks[1];
slot0.drawn = slot0.deck.length;    // pretend slot 0's pile just ran out
const slot1DrawnBefore = slot1.drawn;
S.locationField[0] = null;
G.fillLocationField();
console.log('  slot 0 reshuffled (drawn pointer reset, still full of boulders):',
  slot0.drawn === 1 && slot0.deck.length === 6 && slot0.deck.every(k => k === 'boulder'));
console.log('  slot 1\'s own pointer was not touched by slot 0 reshuffling:', slot1.drawn === slot1DrawnBefore);

console.log('\n== a single slot can mix multiple keys and draw both over repeated clears ==');
G.wipe(); S.zone = 'aerendell'; S.weight = 0;
const seen = new Set();
for (let i = 0; i < 30; i++) {
  seen.add(S.locationField[2].key);
  S.locationField[2] = null;
  G.fillLocationField();
}
console.log('  slot 2 drew both chicken and sheep over repeated clears:',
  seen.has('chicken') && seen.has('sheep'));

console.log('\n== a zone with fewer than 3 configured decks leaves the rest empty ==');
/* Every current zone happens to fill all 3 slots now (content grew
   since this was written) — construct a synthetic zone instead of
   relying on any specific real zone staying sparse, so this keeps
   proving the underlying mechanism regardless of future content. */
G.wipe(); S.weight = 0;
const savedZone = G.ZONES.__sparseTestZone;
G.ZONES.__sparseTestZone = { name: 'Sparse Test Zone', region: 'leth-eiren',
  locationDecks: [{}, {}, { chicken: 3 }] };
S.zone = '__sparseTestZone';
G.buildLocationDecks(); S.locationDecks.forEach(sd => G.shuffle(sd.deck));
S.locationField = [null, null, null]; G.fillLocationField();
console.log('  slot 0 (no deck configured) stays empty:', S.locationField[0] === null);
console.log('  slot 1 (no deck configured) stays empty:', S.locationField[1] === null);
console.log('  slot 2 (configured deck) is populated:', !!S.locationField[2]);
if (savedZone) G.ZONES.__sparseTestZone = savedZone; else delete G.ZONES.__sparseTestZone;
S.zone = 'aerendell';

console.log('\n== S.locationDecks survives a zone-travel stash/restore round trip ==');
G.wipe(); S.zone = 'aerendell'; S.weight = 0;
const before = JSON.stringify(S.locationDecks);
S.kills = 5;
travelNow('forestRoad');
travelNow('aerendell');
console.log('  aerendell\'s slot decks restored, not rebuilt/reshuffled:',
  JSON.stringify(S.locationDecks) === before);
