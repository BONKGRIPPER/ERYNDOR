// ============================================================ cost display
//
// Shared by Crafting, every conversion station, the Campfire, and a build
// prompt -- anything that shows "what this costs" now shows "what this
// costs, and whether you already have it" in the same breath, instead of a
// plain "3 Stone" the player has to mentally check against their own bag.
//
// "Have it" means Bag *and* Storage combined (2026-08-28) -- the Market's
// own sellQty()/combinedOwned() already treated them as one stash rather
// than two separate ones, and a build prompt or recipe reading only the
// Bag while Storage sat right there was a real, reported "why won't this
// let me build, I have the Stone" surprise, not an intentional limit.
// spendCost() is the matching spend side: bag first, then whatever's left
// out of storage, same order sellQty() already draws from.

import { state } from "./state.js";

export function combinedOwned(item) {
  return (state.bag[item] || 0) + (state.storage[item] || 0);
}

export function canAfford(cost) {
  return Object.keys(cost).every(function (item) { return combinedOwned(item) >= cost[item]; });
}

// One colored span per ingredient -- green once Bag+Storage together
// already cover it, the warn color while it's still short -- joined by
// the same " · " separator every cost line already used as plain text.
// Returns real DOM nodes (not a string) so callers drop them in with
// replaceChildren() rather than parsing HTML back out of a template
// string.
export function buildCostNodes(cost) {
  const nodes = [];
  Object.keys(cost).forEach(function (item, i) {
    if (i > 0) nodes.push(document.createTextNode(" · "));
    const have = combinedOwned(item);
    const need = cost[item];
    const span = document.createElement("span");
    span.className = "cost-ingredient " + (have >= need ? "have-enough" : "have-short");
    span.textContent = have + "/" + need + " " + item;
    nodes.push(span);
  });
  return nodes;
}

// Spends `qty` of `item` -- carried Bag first, then Storage for whatever's
// left -- rather than every call site deciding on its own which container
// to touch (or, before this pass, only ever touching the Bag and letting
// the cost silently fail against a full Storage crate).
export function spendItem(item, qty) {
  const fromBag = Math.min(qty, state.bag[item] || 0);
  const fromStorage = qty - fromBag;
  if (fromBag > 0) {
    state.bag[item] -= fromBag;
    if (state.bag[item] <= 0) delete state.bag[item];
  }
  if (fromStorage > 0) {
    state.storage[item] -= fromStorage;
    if (state.storage[item] <= 0) delete state.storage[item];
  }
}

export function spendCost(cost) {
  Object.keys(cost).forEach(function (item) { spendItem(item, cost[item]); });
}
