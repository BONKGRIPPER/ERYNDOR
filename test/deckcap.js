/* Deck limits: the starting deck is 3 Gather Flint / 3 Gather Sticks
   / 3 Forage, a deck slot holds at most TUNE.maxCardCopies (3) copies
   of one key, and TUNE.deckCap (30) cards in total. The cap is a
   MAXIMUM, not a required size — you may sit below it, and you may
   still remove cards to the collection.

   A craft that can't fit now lands in the COLLECTION instead of
   vanishing, so nothing you earned is ever destroyed.
   Run: node test/deckcap.js */
const { boot } = require('./harness');
const { G } = boot();
const give = (k, n) => { S[k] = (S[k] || 0) + n; S.weight = 0; };
const benchStock = () => {
  give('stone', 200); give('wood', 200); give('planks', 200);
  give('basaltBlock', 50); give('stoneBlock', 50);
};

console.log('== a fresh deck is 3/3/3 + 1 Red Berry ==');
G.wipe();
const counts = G.deckCounts();
console.log('  3 flint:', counts.flint === 3);
console.log('  3 stick:', counts.stick === 3);
console.log('  3 forage:', counts.forage === 3);
console.log('  1 redBerry (your one starting heal):', counts.redBerry === 1);
console.log('  10 cards total:', S.deck.length === 10);
console.log('  STARTING_DECK matches:',
  JSON.stringify(G.STARTING_DECK) === JSON.stringify({ flint: 3, stick: 3, forage: 3, redBerry: 1 }));
console.log('  the deck starts well UNDER the cap — 30 is a ceiling, not a quota:',
  S.deck.length < G.TUNE.deckCap);

console.log('\n== the limits themselves ==');
console.log('  TUNE.maxCardCopies is 3:', G.TUNE.maxCardCopies === 3);
console.log('  TUNE.deckCap is 30:', G.TUNE.deckCap === 30);

console.log('\n== crafting past the copy cap banks the extra in the collection ==');
G.wipe(); S.zone = 'aerendell'; S.weight = 0;
benchStock();
G.buildStation('bench');
for (let i = 0; i < 5; i++) { give('planks', 10); give('stoneBlock', 5); G.craft('axe'); }
console.log('  crafted 5 axes:', S.made.axe === 5);
console.log('  only 3 axeStone cards in the deck:', G.deckCounts().axeStone === 3);
console.log('  the other 2 went to the collection, not nowhere:',
  (S.collection && S.collection.axeStone) === 2);
console.log('  durability pool still tops up past the card cap (shared pool, not per-copy):',
  S.durability.axeStone === undefined || S.durability.axeStone > 0);

console.log('\n== a full 30-card deck sends further crafts to the collection too ==');
G.wipe(); S.zone = 'aerendell'; S.weight = 0;
S.deck = new Array(G.TUNE.deckCap).fill('flint');   // at the cap, but 0 copies of 'stick'
S.drawnCount = 0;
G.syncActiveDeckSlot();
S.collection = {};
G.addCardToDiscard('stick', 1);
console.log('  deck refused to grow past 30:', S.deck.length === G.TUNE.deckCap);
console.log('  the card landed in the collection instead:', S.collection.stick === 1);

console.log('\n== G.buildDeck respects both limits when recounting S.made ==');
G.wipe(); S.zone = 'aerendell'; S.weight = 0;
benchStock();
G.buildStation('bench');
for (let i = 0; i < 5; i++) { give('planks', 10); give('stoneBlock', 5); G.craft('axe'); }
G.rebuildDeck();
console.log('  still capped at 3 after a full rebuild from S.made:', G.deckCounts().axeStone === 3);
console.log('  rebuild never exceeds the deck cap:', S.deck.length <= G.TUNE.deckCap);

console.log('\n== you can still remove cards, and drop below the cap ==');
G.wipe(); S.zone = 'aerendell'; S.weight = 0;
S.prayerPoints = 100;
const sizeBefore = S.deck.length;
console.log('  purge succeeds:', G.purgeCard('flint'));
console.log('  deck is now smaller than it was:', S.deck.length === sizeBefore - 1);
console.log('  the card is in the collection:', (S.collection.flint || 0) === 1);
S.prayerPoints = 100;
console.log('  restoring it puts it back:', G.restoreCard('flint'));
console.log('  deck back to its original size:', S.deck.length === sizeBefore);

console.log('\n== restoring from the collection refuses past the copy cap ==');
G.wipe(); S.zone = 'aerendell'; S.weight = 0;
benchStock();
G.buildStation('bench');
for (let i = 0; i < 5; i++) { give('planks', 10); give('stoneBlock', 5); G.craft('axe'); }
console.log('  deck holds 3, collection holds 2:',
  G.deckCounts().axeStone === 3 && S.collection.axeStone === 2);
S.prayerPoints = 100;
console.log('  restoring a 4th copy is refused:', G.restoreCard('axeStone') === false);

console.log('\n== moving a card between deck slots refuses once the destination is at the cap ==');
G.wipe(); S.zone = 'aerendell'; S.weight = 0;
benchStock();
G.buildStation('bench');
for (let i = 0; i < 5; i++) { give('planks', 10); give('stoneBlock', 5); G.craft('axe'); }
S.skills.prayer.lv = 20; S.skills.prayer.xp = 0;   // unlock a 3rd deck slot (every 10 levels)
console.log('  at least 2 deck slots unlocked:', G.unlockedDeckSlots() >= 2);
let moved = 0;
for (let i = 0; i < 3; i++) {
  S.prayerPoints = 100;
  if (G.moveCardToDeckSlot('axeStone', 1)) moved++;
}
console.log('  moved 3 copies into slot 1:', moved === 3);
S.prayerPoints = 100;
give('planks', 10); give('stoneBlock', 5); G.craft('axe');
console.log('  a 4th move into the same (full) slot is refused:',
  G.moveCardToDeckSlot('axeStone', 1) === false);

console.log('\n== an old save built under the looser 60/5 limits gets trimmed, not robbed ==');
G.wipe(); S.zone = 'aerendell'; S.weight = 0;
S.collection = {};
S.deck = ['flint', 'flint', 'flint', 'flint', 'flint', 'stick', 'stick'];  // 5 flint: legal before, not now
S.drawnCount = 0;
G.syncActiveDeckSlot();
const trimmed = G.enforceDeckLimits();
console.log('  2 excess cards were moved:', trimmed === 2);
console.log('  deck trimmed to the 3-copy cap:', G.deckCounts().flint === 3);
console.log('  sticks (already legal) untouched:', G.deckCounts().stick === 2);
console.log('  the excess was banked in the collection, not destroyed:', S.collection.flint === 2);
console.log('  a deck already inside the limits is left alone:', G.enforceDeckLimits() === 0);
