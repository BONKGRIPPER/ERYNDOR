/* Food is CARDS only. Raw food is an ingredient; the Campfire cooks
   it into a kind:'food' card that heals when played and STAYS in the
   deck, like every other card. Recipes use two new cost shapes:
   `fuel` POINTS from any burnable, and `anyOf` ("N of any one kind").
   Run: node test/foodcards.js */
const { boot } = require('./harness');
const { G } = boot();
const give = (k, n) => { S[k] = (S[k] || 0) + n; S.weight = 0; };
const playFood = key => {
  G.cardKinds.food.resolve({ key, card: G.cardDef(key), hit: false, gains: [] });
};

console.log('== the eat-from-bag path is gone ==');
console.log('  G.eat removed:', typeof G.eat === 'undefined');
console.log('  G.canEat removed:', typeof G.canEat === 'undefined');
console.log('  raw food is still tagged as an ingredient:', G.isFoodItem('berries') === true);

console.log('\n== the four food cards ==');
[['redBerry', 1], ['cookedMeat', 3], ['cookedFish', 3], ['cookedRareFish', 5]].forEach(([k, heal]) => {
  const c = G.CARDS[k];
  console.log('  ' + k + ' is a food card healing ' + heal + ':',
    !!c && c.kind === 'food' && c.heal === heal);
});

console.log('\n== the starting deck carries exactly one Red Berry ==');
G.wipe();
console.log('  1 redBerry in a fresh deck:', G.deckCounts().redBerry === 1);

console.log('\n== playing a food card heals and KEEPS the card ==');
G.wipe(); S.weight = 0;
S.hp = 5;
console.log('  starting at 5 hp with 1 Red Berry:', S.hp === 5 && G.deckCounts().redBerry === 1);
playFood('redBerry');
console.log('  healed by 1:', S.hp === 6);
console.log('  the card is still in the deck:', G.deckCounts().redBerry === 1);
console.log('  and can be played again:', (playFood('redBerry'), S.hp === 7));
console.log('  still there after a second use:', G.deckCounts().redBerry === 1);
console.log('  the deck never shrank:', S.deck.length === 10);

console.log('\n== a clean tap doubles the heal, same as every other card ==');
G.wipe(); S.weight = 0;
S.hp = 1;
G.cardKinds.food.resolve({ key: 'redBerry', card: G.cardDef('redBerry'), hit: true, gains: [] });
console.log('  clean tap healed 2, not 1:', S.hp === 3);

console.log('\n== playing at full health refuses, and does NOT burn the card ==');
G.wipe(); S.weight = 0;
S.hp = G.maxHp();
playFood('redBerry');
console.log('  hp unchanged:', S.hp === G.maxHp());
console.log('  card still in the deck:', G.deckCounts().redBerry === 1);

console.log('\n== fuel points: stick 1, wood 4, charcoal 8 ==');
G.wipe(); S.weight = 0;
console.log('  empty-handed fuel is 0:', G.fuelAvailable() === 0);
give('stick', 3);
console.log('  3 sticks = 3 fuel:', G.fuelAvailable() === 3);
give('wood', 2);
console.log('  +2 wood = 11 fuel:', G.fuelAvailable() === 11);
give('charcoal', 1);
console.log('  +1 charcoal = 19 fuel:', G.fuelAvailable() === 19);

console.log('\n== spendFuel burns the CHEAPEST fuel first ==');
G.wipe(); S.weight = 0;
give('stick', 5); give('charcoal', 2);
console.log('  spend 4 fuel succeeds:', G.spendFuel(4));
console.log('  it took sticks, not the charcoal:', S.stick === 1 && S.charcoal === 2);
G.wipe(); S.weight = 0;
give('charcoal', 1);
console.log('  with only charcoal, 3 fuel still works (burns whole):', G.spendFuel(3));
console.log('  the charcoal was consumed:', S.charcoal === 0);
G.wipe(); S.weight = 0;
give('stick', 2);
console.log('  refuses when there is not enough fuel:', G.spendFuel(10) === false);
console.log('  and nothing was spent:', S.stick === 2);

console.log('\n== anyOf: N of any ONE kind ==');
G.wipe(); S.zone = 'aerendell'; S.weight = 0;
give('stick', 40); give('flint', 40);
G.buildStation('firepit');
const fishRecipe = G.findRecipe('card_cookedFish');
give('stick', 20);
give('bluegill', 8); give('perch', 8);          // 16 total, but neither reaches 15
console.log('  16 fish spread over two kinds is NOT enough:', G.anyOfChoice(fishRecipe) === null);
console.log('  so the recipe cannot start:', G.canStartRecipe(fishRecipe, 'card_cookedFish') === false);
give('bluegill', 7);                             // bluegill now 15
console.log('  15 of ONE kind qualifies:', G.anyOfChoice(fishRecipe) === 'bluegill');
console.log('  and now it can start:', G.canStartRecipe(fishRecipe, 'card_cookedFish') === true);
console.log('  crafting it works:', G.craft('card_cookedFish'));
console.log('  15 bluegill were spent:', S.bluegill === 0);
console.log('  the perch were left alone:', S.perch === 8);
console.log('  a Cooked Fish card entered the deck:', (G.deckCounts().cookedFish || 0) === 1);

console.log('\n== anyOf picks the BIGGEST qualifying stack ==');
G.wipe(); S.weight = 0;
give('bluegill', 16); give('perch', 40);
console.log('  perch (40) beats bluegill (16):', G.anyOfChoice(fishRecipe) === 'perch');

console.log('\n== rare fish are their own, stronger card ==');
console.log('  the 4 rares are exactly one per fishing region:',
  JSON.stringify(G.fishKeys(true)) ===
  JSON.stringify(['goldenKoi', 'glassEel', 'silverSalmon', 'moonfin']));
console.log('  goldenKoi is rare, bluegill is not:',
  G.isRareFish('goldenKoi') === true && G.isRareFish('bluegill') === false);
G.wipe(); S.zone = 'aerendell'; S.weight = 0;
give('stick', 40); give('flint', 40);
G.buildStation('firepit');
give('stick', 20); give('goldenKoi', 3);
console.log('  3 rare fish + fuel crafts the rare card:', G.craft('card_cookedRareFish'));
console.log('  it heals 5, not 3:', G.CARDS.cookedRareFish.heal === 5);
console.log('  rare fish spent:', S.goldenKoi === 0);

console.log('\n== raw meat: 10 of one kind ==');
G.wipe(); S.zone = 'aerendell'; S.weight = 0;
give('stick', 40); give('flint', 40);
G.buildStation('firepit');
give('stick', 20); give('pork', 6); give('steak', 6);
const meatRecipe = G.findRecipe('card_cookedMeat');
console.log('  6 pork + 6 steak is not 10 of one kind:', G.anyOfChoice(meatRecipe) === null);
give('pork', 4);
console.log('  10 pork qualifies:', G.anyOfChoice(meatRecipe) === 'pork');
console.log('  crafts a Cooked Meat card:', G.craft('card_cookedMeat'));
console.log('  steak untouched:', S.steak === 6);

console.log('\n== the old per-item cook recipes are gone ==');
['cookPoultry', 'cookSteak', 'cookPork', 'cook_bluegill', 'cook_goldenKoi'].forEach(id => {
  console.log('  ' + id + ' removed:', !G.findRecipe(id));
});
console.log('  Burn Charcoal survives:', !!G.findRecipe('makeCharcoal'));

/* The header hotbar is gone entirely — a food card is an ordinary
   card in the deck, played from the hand like anything else, with no
   special header slot surfacing it. */
console.log('\n== the header hotbar is gone ==');
console.log('  UI.renderHotbar removed:', typeof G.UI.renderHotbar === 'undefined');
console.log('  UI.healingItems removed:', typeof G.UI.healingItems === 'undefined');
console.log('  TUNE.hotbarSlots removed:', G.TUNE.hotbarSlots === undefined);
console.log('  #hotbar is not in index.html:', document.getElementById('hotbar') === null);

console.log('\n== a food card is dealt into the hand like any other card ==');
G.wipe(); S.weight = 0;
S.hp = 5;
S.deck = ['redBerry', 'flint', 'stick'];
S.drawnCount = 0;
G.syncActiveDeckSlot();
const dealt = [];
G.on('hand:dealt', h => { dealt.length = 0; (h.hand || []).forEach(c => dealt.push(c.key)); });
G.drawHand();
console.log('  the Red Berry card was dealt into the hand:', dealt.indexOf('redBerry') >= 0);
const berryFace = G.cardKinds.food.face(G.cardDef('redBerry'), 'redBerry');
console.log('  it has a normal card face:', typeof berryFace.detail === 'string');
console.log('  and is not blocked while hurt:', berryFace.blocked !== true);
