// ============================================================ cost display
// Production is home-bound and consumes the Aerendell Warehouse
// (`state.storage`). Active field systems consume the carried Bag. Keeping
// both paths here makes the boundary explicit at each caller without
// duplicating affordability, cost-label, and spend logic.

import { state } from "./state.js";

function ownedIn(container, item) { return container[item] || 0; }

export function warehouseOwned(item) { return ownedIn(state.storage, item); }
export function bagOwned(item) { return ownedIn(state.bag, item); }

// Backward-compatible production names. Crafting, stations, buildings,
// Township and workers already import these names, so their default source
// is now the Warehouse.
export const combinedOwned = warehouseOwned;

function canAffordIn(container, cost) {
  return Object.keys(cost).every(function (item) { return ownedIn(container, item) >= cost[item]; });
}

export function canAfford(cost) { return canAffordIn(state.storage, cost); }
export function canAffordBag(cost) { return canAffordIn(state.bag, cost); }

function costNodesFor(container, cost) {
  const nodes = [];
  Object.keys(cost).forEach(function (item, i) {
    if (i > 0) nodes.push(document.createTextNode(" · "));
    const have = ownedIn(container, item);
    const need = cost[item];
    const span = document.createElement("span");
    span.className = "cost-ingredient " + (have >= need ? "have-enough" : "have-short");
    span.textContent = have + "/" + need + " " + item;
    nodes.push(span);
  });
  return nodes;
}

export function buildCostNodes(cost) { return costNodesFor(state.storage, cost); }
export function buildBagCostNodes(cost) { return costNodesFor(state.bag, cost); }

function spendItemFrom(container, item, qty) {
  const next = ownedIn(container, item) - qty;
  if (next <= 0) delete container[item];
  else container[item] = next;
}

export function spendItem(item, qty) { spendItemFrom(state.storage, item, qty); }
export function spendBagItem(item, qty) { spendItemFrom(state.bag, item, qty); }

export function spendCost(cost) {
  Object.keys(cost).forEach(function (item) { spendItem(item, cost[item]); });
}

export function spendBagCost(cost) {
  Object.keys(cost).forEach(function (item) { spendBagItem(item, cost[item]); });
}
