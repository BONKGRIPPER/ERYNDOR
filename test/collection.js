/* Batch 13a/13b: the collection — cards set aside from the deck land
   here instead of being destroyed, and G.restoreCard (13b) brings one
   back into the active deck, same prayer cost, capped at TUNE.deckCap.
   Run: node test/collection.js */
const { boot } = require('./harness');
const { G, store } = boot();
const UI = G.UI;

console.log('== fresh game starts with an empty collection ==');
G.wipe();
console.log('  collection is empty:', Object.keys(S.collection).length === 0);

console.log('\n== purging a card moves it to the collection, not the void ==');
G.wipe();
S.prayerPoints = 99;
S.deck = ['flint', 'flint', 'flint', 'stick'];
S.drawnCount = 0;
const before = S.deck.length;
const purged = G.purgeCard('flint');
console.log('  purge succeeded:', purged);
console.log('  deck shrank by one:', S.deck.length === before - 1);
console.log('  flint now in collection:', S.collection.flint === 1);

console.log('\n== purging the same card again stacks the count ==');
G.purgeCard('flint');
console.log('  collection count is 2:', S.collection.flint === 2);

console.log('\n== purging a DIFFERENT card adds its own entry ==');
G.purgeCard('stick');
console.log('  both keys present:', S.collection.flint === 2 && S.collection.stick === 1);
console.log('  flint count untouched by the stick purge:', S.collection.flint === 2);

console.log('\n== collection:changed fires on purge ==');
G.wipe();
S.prayerPoints = 99;
S.deck = ['flint', 'flint'];
S.drawnCount = 0;
let fired = 0;
G.on('collection:changed', () => { fired++; });
G.purgeCard('flint');
console.log('  fired:', fired === 1);

console.log('\n== the collection survives a save/load round trip ==');
G.wipe();
S.prayerPoints = 99;
S.deck = ['flint', 'flint', 'stick'];
S.drawnCount = 0;
G.purgeCard('flint'); G.purgeCard('stick');
G.save(false);
window.S = G.S = G.freshState();
G.load();
console.log('  collection restored:', JSON.stringify(S.collection),
  '-> flint 1, stick 1:', S.collection.flint === 1 && S.collection.stick === 1);

console.log('\n== an old save with no collection field loads safely ==');
G.wipe();
delete S.collection;
G.save(false);
window.S = G.S = G.freshState();
G.load();
console.log('  collection backfilled to {}:', JSON.stringify(S.collection) === '{}');

console.log('\n== UI.renderCollection reads S.collection onto the deck page ==');
G.wipe();
S.prayerPoints = 99;
S.deck = ['flint', 'flint', 'flint', 'stick', 'stick'];
S.drawnCount = 0;
UI.go('deck');
const listBefore = store['collection-list'];
console.log('  empty state shown before anything is purged:',
  listBefore.children.length === 1 && listBefore.children[0]._html.indexOf('Nothing set aside') >= 0);
console.log('  collection size reads 0:', store['collection-size'].textContent === 0);

G.purgeCard('flint');
UI.renderDeck();
const listAfter = store['collection-list'];
console.log('  size updates to 1:', store['collection-size'].textContent === 1);
console.log('  exactly one row:', listAfter.children.length === 1);
console.log('  row shows the card name:',
  listAfter.children[0]._html.indexOf(G.CARDS.flint.name) >= 0);
console.log('  row shows the count:', listAfter.children[0]._html.indexOf('>1<') >= 0);

console.log('\n== purging still respects the existing prayer-cost and last-card guards ==');
G.wipe();
S.prayerPoints = 0;
S.deck = ['flint', 'flint'];
S.drawnCount = 0;
console.log('  refuses with no prayer points:', G.purgeCard('flint') === false);
console.log('  collection untouched by the refusal:', !S.collection.flint);
S.prayerPoints = 99;
S.deck = ['flint'];
console.log('  refuses to empty the deck entirely:', G.purgeCard('flint') === false);
console.log('  collection untouched by that refusal too:', !S.collection.flint);

console.log('\n== restoring a card moves it from the collection back into the deck ==');
G.wipe();
S.prayerPoints = 99;
S.deck = ['flint', 'flint', 'stick'];
S.drawnCount = 0;
G.purgeCard('flint');                       // deck: 2 flint+1 stick -> collection.flint = 1
const deckBefore = S.deck.length;
const ppBefore = S.prayerPoints;
const restored = G.restoreCard('flint');
console.log('  restore succeeded:', restored);
console.log('  deck grew by one:', S.deck.length === deckBefore + 1);
console.log('  collection entry cleared out:', !S.collection.flint);
console.log('  prayer points spent:', S.prayerPoints === ppBefore - G.purgeCost());
console.log('  drawnCount stayed aligned with the new discard-pile card:',
  S.drawnCount === 1);   // addCardToDiscard bumps drawnCount to match the unshift

console.log('\n== restoring stacks back down correctly across repeats ==');
G.wipe();
S.prayerPoints = 99;
S.deck = ['flint', 'flint', 'flint'];
S.drawnCount = 0;
G.purgeCard('flint'); G.purgeCard('flint');   // collection.flint = 2
G.restoreCard('flint');
console.log('  collection count drops to 1:', S.collection.flint === 1);
G.restoreCard('flint');
console.log('  collection key removed once empty:', !S.collection.flint);

console.log('\n== restoring refuses without enough prayer points or stock ==');
G.wipe();
S.prayerPoints = 0;
S.deck = ['flint'];
S.collection = { flint: 1 };
console.log('  refuses with no prayer points:', G.restoreCard('flint') === false);
console.log('  collection untouched by the refusal:', S.collection.flint === 1);
S.prayerPoints = 99;
console.log('  refuses when the collection has none of that card:', G.restoreCard('stick') === false);

console.log('\n== restoring refuses once the deck hits the cap ==');
G.wipe();
S.prayerPoints = 99;
S.deck = new Array(G.TUNE.deckCap).fill('flint');
S.drawnCount = 0;
S.collection = { stick: 1 };
console.log('  deck already at the cap:', S.deck.length === G.TUNE.deckCap);
console.log('  refuses to grow past the cap:', G.restoreCard('stick') === false);
console.log('  collection untouched by the cap refusal:', S.collection.stick === 1);

console.log('\n== deck:restored and collection:changed fire on a successful restore ==');
G.wipe();
S.prayerPoints = 99;
S.deck = ['flint', 'flint'];
S.drawnCount = 0;
G.purgeCard('flint');
let restoredFired = 0, changedFired = 0;
G.on('deck:restored', () => { restoredFired++; });
G.on('collection:changed', () => { changedFired++; });
G.restoreCard('flint');
console.log('  deck:restored fired:', restoredFired === 1);
console.log('  collection:changed fired:', changedFired === 1);

console.log('\n== UI.renderCollection shows a working Add button ==');
G.wipe();
S.prayerPoints = 99;
S.deck = ['flint', 'flint'];
S.drawnCount = 0;
G.purgeCard('flint');
UI.go('deck');
const row = store['collection-list'].children[0];
const addBtn = row.children[0];
console.log('  row has an Add button:', addBtn && addBtn._html === 'Add');
console.log('  Add button is enabled:', addBtn && addBtn.disabled === false);
console.log('  restore-hint shows the prayer cost:',
  store['restore-hint'].textContent === G.purgeCost() + ' pt each');

console.log('\n== restore-hint reports the deck as full once the cap is hit ==');
G.wipe();
S.prayerPoints = 99;
S.deck = new Array(G.TUNE.deckCap).fill('flint');
S.drawnCount = 0;
S.collection = { stick: 1 };
UI.renderDeck();
console.log('  hint reads "deck full":', store['restore-hint'].textContent.indexOf('deck full') >= 0);
