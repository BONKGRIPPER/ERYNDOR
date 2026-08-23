/* =========================================================
   systems/food.js — food is CARDS ONLY now.

   There is no eat-from-the-bag path any more. G.eat/G.canEat are
   gone: raw food (berries, poultry, pork, steak, fish) is purely an
   INGREDIENT, cooked at the Campfire into a food CARD, and healing
   only ever happens by playing that card — see the kind:'food'
   handler in systems/cards.js, which also eats the card.

   Add a food card:
     1. a kind:'food' entry in G.CARDS carrying a `heal` (data.js)
     2. a Campfire recipe that `grantsCard` it — `fuel: N` for fuel
        points, `anyOf: {keys, qty}` for "N of any one kind"
        (both in systems/craft.js)
   Nothing in this file needs to change to add one.
   ========================================================= */
(function (G) {
  'use strict';

  /* Kept as a lookup only — "is this resource edible raw material".
     Used to stop bulk-deposit from swallowing food stacks (see
     bulkStoreBlocked, systems/storage.js). Nothing eats from here. */
  G.isFoodItem = key => !!(G.FOODS && G.FOODS[key]);

})(window.Game = window.Game || {});
