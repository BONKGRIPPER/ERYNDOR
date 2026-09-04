// =============================================================== campfire
//
// Simplified (2026-08-28) to the same shape every other conversion station
// uses: pick your inputs, tap one pill, wait. Two small picker pills choose
// which fuel and which cookable to use (state.campfire.selectedFuel/
// selectedCook -- free to change any time nothing's actively burning), then
// the Cook pill spends one of each and starts a single {startedAt, readyAt}
// job, same "spend on commit" rule and same deadline-not-countdown timer
// every other station already uses. No queue any more -- one pair at a
// time, tap Cook again once it's done for the next.

import { FUELS, COOKABLES, COOK_MS, TINTS } from "./data.js";
import { state, save, gainItem } from "./state.js";
import { pillFor, setPillFill } from "./pills.js";
import { canAfford, buildCostNodes, spendCost, combinedOwned } from "./costDisplay.js";
import { useSprite, slug } from "./sprites.js";
import { el } from "./dom.js";
import { show } from "./screens.js";
import { drawBag } from "./hub.js";
import { openSheet, closeSheet } from "./sheet.js";

function active() { return !!state.campfire.current; }

function shake(node) {
  node.classList.remove("shake");
  void node.offsetWidth;
  node.classList.add("shake");
}

// {fuel: 1, cook: 1} as a cost map, the same shape every other station's
// cost is -- collapses to {"Pine Logs": 2} if the same item is picked for
// both (Pine Logs is both a fuel and a cookable, into Charcoal), rather
// than needing a special case for that overlap.
function currentCost() {
  const c = state.campfire;
  const cost = {};
  if (c.selectedFuel) cost[c.selectedFuel] = (cost[c.selectedFuel] || 0) + 1;
  if (c.selectedCook) cost[c.selectedCook] = (cost[c.selectedCook] || 0) + 1;
  return cost;
}

// The actual mechanics of starting one cook, with no player-facing
// rejection feedback -- shared by the player's own startCook() (below,
// which shakes the pill on a denied tap) and the Cook villager's own auto-
// trigger in workers.js. Only ever fires once the player has already
// picked both a fuel and something to cook (state.campfire.selectedFuel/
// selectedCook) -- the villager cooks whatever's already chosen, it
// doesn't choose for itself. Returns whether it actually started.
export function tryAutoCook() {
  const c = state.campfire;
  if (active()) return false;
  if (!c.selectedFuel || !c.selectedCook) return false;
  const cost = currentCost();
  if (!canAfford(cost)) return false;

  spendCost(cost);
  c.current = { fuel: c.selectedFuel, item: c.selectedCook, startedAt: Date.now(), readyAt: Date.now() + COOK_MS };
  save();
  drawBag();

  const pill = pillFor("campfire-cook");
  const fill = pill.querySelector(".pill-fill");
  fill.style.transitionDuration = "0ms";
  fill.style.width = "0%";
  void fill.offsetWidth;
  setPillFill("campfire-cook", 100, COOK_MS);
  refreshCampfire();
  return true;
}

function startCook() {
  const c = state.campfire;
  if (active()) return;
  const pill = pillFor("campfire-cook");
  if (!c.selectedFuel || !c.selectedCook) { shake(pill); return; }
  if (!canAfford(currentCost())) { shake(pill); return; }
  tryAutoCook();
}

// One job at a time now, so this is a plain deadline check (same shape as
// stations.js's settleStations(), just for the one id) rather than a
// while-loop chaining through a queue. Returns what was cooked, or null.
export function settleCampfire() {
  const c = state.campfire;
  if (!c.current || Date.now() < c.current.readyAt) return null;
  const gives = COOKABLES[c.current.item].gives;
  gainItem(gives, 1);
  c.current = null;
  // Same reset craft.js's settleCraft() does -- without it, a finished
  // cook's .pill-fill sits at its last-drawn 100% (fully colored) forever,
  // since nothing else ever points it back at 0%.
  setPillFill("campfire-cook", 0, 0);
  save();
  return gives;
}

export function campfireShown() {
  refreshCampfire();
}

function refreshPicker(id, label, selected) {
  const pill = pillFor(id);
  pill.querySelector(".pill-name").textContent = label;
  const sub = pill.querySelector(".pill-sub");
  if (selected) {
    sub.textContent = selected + " (" + combinedOwned(selected) + " have)";
    useSprite(pill.querySelector(".pill-icon"), "items/" + slug(selected));
  } else {
    sub.textContent = "Tap to choose";
  }
}

export function refreshCampfire() {
  const c = state.campfire;
  const running = active();

  refreshPicker("campfire-fuel-picker", "Fuel", c.selectedFuel);
  refreshPicker("campfire-item-picker", "Cook", c.selectedCook);

  const cookPill = pillFor("campfire-cook");
  cookPill.classList.toggle("active", running);
  const sub = cookPill.querySelector(".pill-sub");
  if (running) {
    cookPill.querySelector(".pill-name").textContent = "Cooking " + c.current.item + "…";
    sub.textContent = "Makes " + COOKABLES[c.current.item].gives;
    cookPill.classList.remove("unaffordable", "affordable-ready");
  } else {
    cookPill.querySelector(".pill-name").textContent = "Cook";
    if (c.selectedFuel && c.selectedCook) {
      const cost = currentCost();
      const affordable = canAfford(cost);
      sub.replaceChildren.apply(sub, buildCostNodes(cost));
      cookPill.classList.toggle("unaffordable", !affordable);
      cookPill.classList.toggle("affordable-ready", affordable);
    } else {
      sub.textContent = "Choose fuel and something to cook";
      cookPill.classList.remove("unaffordable", "affordable-ready");
    }
  }
}

function openPicker(title, items, describe, onPick) {
  const body = el("sheet-body");
  body.replaceChildren();

  items.forEach(function (item) {
    const row = document.createElement("button");
    row.className = "seed-row";

    const dot = document.createElement("span");
    dot.className = "dot";
    dot.style.background = TINTS[item] || "#9a8f7d";

    const text = document.createElement("div");
    const name = document.createElement("div");
    name.className = "seed-name";
    name.textContent = item;
    text.append(name);
    const description = describe(item);
    if (description) {
      const meta = document.createElement("div");
      meta.className = "seed-meta";
      meta.textContent = description;
      text.append(meta);
    }

    const count = document.createElement("span");
    count.className = "seed-count";
    count.textContent = combinedOwned(item) + " owned";

    row.append(dot, text, count);
    row.addEventListener("click", function () {
      onPick(item);
      closeSheet();
      save();
      refreshCampfire();
    });
    body.append(row);
  });

  openSheet(title);
}

function openFuelPicker() {
  if (active()) return;
  openPicker("Choose fuel", FUELS, function () { return null; }, function (item) {
    state.campfire.selectedFuel = item;
  });
}

function openCookPicker() {
  if (active()) return;
  openPicker("Choose something to cook", Object.keys(COOKABLES), function (item) {
    return "makes " + COOKABLES[item].gives;
  }, function (item) {
    state.campfire.selectedCook = item;
  });
}

pillFor("campfire-fuel-picker").addEventListener("click", openFuelPicker);
pillFor("campfire-item-picker").addEventListener("click", openCookPicker);
pillFor("campfire-cook").addEventListener("click", startCook);

el("back-campfire").addEventListener("click", function () { show("home"); });

export function applyCampfireSprites() {
  const c = state.campfire;
  if (c.selectedFuel) useSprite(pillFor("campfire-fuel-picker").querySelector(".pill-icon"), "items/" + slug(c.selectedFuel));
  if (c.selectedCook) useSprite(pillFor("campfire-item-picker").querySelector(".pill-icon"), "items/" + slug(c.selectedCook));
}
