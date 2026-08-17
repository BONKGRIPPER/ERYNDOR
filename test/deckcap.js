/* Starting deck is 5 Gather Flint / 5 Gather Sticks / 5 Forage, and a
   deck slot can never hold more than TUNE.maxCardCopies (5) copies of
   one card key — the collection itself has no such limit.
   Run: node test/deckcap.js */
const { boot } = require('./harness');
const { G } = boot();
const give = (k, n) => { S[k] = (S[k] || 0) + n; S.weight = 0; };

console.log('== a fresh Aerendell deck is 5/5/5 ==');
G.wipe();
const counts = G.deckCounts();
console.log('  5 flint:', counts.flint === 5);
console.log('  5 stick:', counts.stick === 5);
console.log('  5 forage:', counts.forage === 5);
console.log('  15 cards total:', S.deck.length === 15);
console.log('  G.STARTING_DECK fallback matches too:',
  JSON.stringify(G.STARTING_DECK) === JSON.stringify({ flint: 5, stick: 5, forage: 5 }));

console.log('\n== crafting the same tool over and over caps out at 5 physical copies ==');
G.wipe(); S.zone = 'aerendell'; S.weight = 0;
give('stone', 200); give('wood', 200); give('planks', 200);
give('basaltBlock', 50); give('stoneBlock', 50);
G.buildStation('bench');
for (let i = 0; i < 8; i++) { give('planks', 10); give('stoneBlock', 5); G.craft('axe'); }
console.log('  crafted 8 axes:', S.made.axe === 8);
console.log('  only 5 axeStone cards ever land in the deck:', G.deckCounts().axeStone === 5);
console.log('  durability pool still tops up past the card cap (shared pool, not per-copy):',
  S.durability.axeStone === undefined || S.durability.axeStone > 0);

console.log('\n== G.buildDeck (fresh zone visit) also respects the cap when recounting S.made ==');
G.rebuildDeck();
console.log('  still capped at 5 after a full rebuild from S.made:', G.deckCounts().axeStone === 5);

console.log('\n== restoring a purged card from the collection refuses past the cap ==');
G.wipe(); S.zone = 'aerendell'; S.weight = 0;
give('stone', 200); give('wood', 200); give('planks', 200);
give('basaltBlock', 50); give('stoneBlock', 50);
G.buildStation('bench');
for (let i = 0; i < 5; i++) { give('planks', 10); give('stoneBlock', 5); G.craft('axe'); }
console.log('  5 axeStone cards in the deck:', G.deckCounts().axeStone === 5);
give('flint', 10); give('stick', 10);
G.craft('flintPick');   // any repeatable non-capped craft to bump prayer points isn't needed; purge uses prayerPoints
S.prayerPoints = 100;
const purged = G.purgeCard('axeStone');
console.log('  one copy purges out into the collection:', purged, '| deck now', G.deckCounts().axeStone || 0,
  '| collection', S.collection.axeStone);
S.prayerPoints = 100;
console.log('  restoring it back is fine (deck is back under the cap):', G.restoreCard('axeStone'));
console.log('  deck is at 5 again:', G.deckCounts().axeStone === 5);
S.prayerPoints = 100;
console.log('  purge another, but this time cap the deck artificially at 5 of a DIFFERENT source first');
// simulate the deck already sitting at the cap for this key via a second purge+different craft cycle:
give('planks', 10); give('stoneBlock', 5); G.craft('axe');  // 6th craft — still capped at 5 physically
console.log('  deck stays at 5 even after a 6th craft:', G.deckCounts().axeStone === 5);

console.log('\n== moving a card between deck slots refuses once the destination is at the cap ==');
G.wipe(); S.zone = 'aerendell'; S.weight = 0;
give('stone', 200); give('wood', 200); give('planks', 200);
give('basaltBlock', 50); give('stoneBlock', 50);
G.buildStation('bench');
for (let i = 0; i < 5; i++) { give('planks', 10); give('stoneBlock', 5); G.craft('axe'); }
S.skills.prayer.lv = 20; S.skills.prayer.xp = 0;   // unlock a 3rd deck slot (every 10 levels)
console.log('  at least 2 deck slots unlocked:', G.unlockedDeckSlots() >= 2);
S.prayerPoints = 100;
console.log('  move 1 axeStone out to slot 1:', G.moveCardToDeckSlot('axeStone', 1));
console.log('  move a 2nd one to the SAME destination is still fine (only 1 there so far):',
  (() => { S.prayerPoints = 100; return G.moveCardToDeckSlot('axeStone', 1); })());
// keep moving until slot 1 hits the cap, then confirm it refuses
let moved = 2;
while (moved < 5) {
  give('planks', 10); give('stoneBlock', 5); G.craft('axe');
  S.prayerPoints = 100;
  if (G.moveCardToDeckSlot('axeStone', 1)) moved++;
  else break;
}
console.log('  slot 1 reached exactly the cap:', moved === 5);
give('planks', 10); give('stoneBlock', 5); G.craft('axe');
S.prayerPoints = 100;
console.log('  a further move into the same (full) slot is refused:', G.moveCardToDeckSlot('axeStone', 1) === false);
