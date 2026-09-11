// ================================================================ crafting
//
// A third loop, same shape as foraging, but starting one costs materials.
// The cost comes out of the bag the instant a craft starts, matching how
// Field already spends a seed the instant you plant -- so a craft, once
// running, can never fail to finish for lack of materials.

import { RECIPES, CRAFT_MS } from "./data.js";
import { state, save, deliverProduction } from "./state.js";
import { pillFor, setPillFill } from "./pills.js";
import { useSprite } from "./sprites.js";
import { el } from "./dom.js";
import { show } from "./screens.js";
import { drawBag } from "./hub.js";
import { canAfford, buildCostNodes, spendCost } from "./costDisplay.js";
import { itemLevelProgress, itemSpeedMult, recordCraft } from "./itemLevels.js";

function shakePill(item) {
  const pill = pillFor(item);
  if (!pill) return;
  pill.classList.remove("shake");
  void pill.offsetWidth;
  pill.classList.add("shake");
}

function startCraft(item) {
  if (state.crafting[item]) return;   // already running -- silent, same as forage
  const recipe = RECIPES[item];
  if (!canAfford(recipe.cost)) { shakePill(item); return; }

  spendCost(recipe.cost);
  // Same per-item mastery every station reads -- see itemLevels.js. Read
  // once, at the moment this craft starts, same "baked into this cycle's
  // own timer" rule every other leveled thing in this game follows.
  const ms = CRAFT_MS * itemSpeedMult(recipe.name);
  state.crafting[item] = { startedAt: Date.now(), readyAt: Date.now() + ms };
  save();

  const fill = pillFor(item).querySelector(".pill-fill");
  fill.style.transitionDuration = "0ms";
  fill.style.width = "0%";
  void fill.offsetWidth;
  setPillFill(item, 100, ms);
  refreshCraft(item);
  drawBag();   // materials just left the bag (and maybe storage) -- the hub strip should say so
}

// Credits every craft that's finished since the last check and returns the
// list of recipes that completed, mirroring settleForage() exactly.
export function settleCraft() {
  const done = [];
  const leveledUp = {};
  Object.keys(RECIPES).forEach(function (item) {
    const c = state.crafting[item];
    if (!c || Date.now() < c.readyAt) return;
    const name = RECIPES[item].name;
    if (!deliverProduction(name, 1)) return;
    state.crafting[item] = null;
    setPillFill(item, 0, 0);
    if (recordCraft(name)) leveledUp[item] = true;
    done.push(item);
  });
  if (done.length) {
    save();
    done.forEach(function (item) { refreshCraft(item, leveledUp[item]); });
  }
  return done;
}

// Same rule as refreshForage(): never touches a running fill's transition,
// safe to call every tick. Also marks recipes you can't currently afford,
// which foraging has no equivalent of -- nothing there costs anything.
export function refreshCraft(only, flash) {
  Object.keys(RECIPES).forEach(function (item) {
    if (only && item !== only) return;
    const pill = pillFor(item);
    // A RECIPES entry can outlive its own pill -- Padded Vest/Stone
    // Plate/the fishing tools were pulled from Aerendell's Craft Bench
    // (2026-08-30) while staying real RECIPES entries (see index.html's
    // own comment on that removal). Nothing left to redraw for those.
    if (!pill) return;
    const recipe = RECIPES[item];
    const active = !!state.crafting[item];
    const affordable = canAfford(recipe.cost);
    pill.classList.toggle("active", active);
    pill.classList.toggle("unaffordable", !active && !affordable);
    pill.classList.toggle("affordable-ready", !active && affordable);
    const sub = pill.querySelector(".pill-sub");
    if (active) sub.textContent = Date.now() >= state.crafting[item].readyAt ? "Warehouse full — output waiting" : "Crafting…";
    else sub.replaceChildren.apply(sub, buildCostNodes(recipe.cost));
    pill.querySelector(".pill-count").textContent = state.storage[recipe.name] || 0;

    // The crafted item's own mastery -- independent of anything above.
    const badge = pill.querySelector(".pill-level-badge");
    const levelFill = pill.querySelector(".pill-level-fill");
    if (badge && levelFill) {
      const p = itemLevelProgress(recipe.name);
      badge.textContent = String(p.level);
      levelFill.style.width = (p.into / p.need * 100).toFixed(1) + "%";
      if (flash) {
        badge.classList.remove("pop");
        void badge.offsetWidth;
        badge.classList.add("pop");
      }
    }
  });
}

document.querySelectorAll("#screen-craft .pill").forEach(function (pill) {
  pill.addEventListener("click", function () { startCraft(pill.dataset.item); });
});

el("back-craft").addEventListener("click", function () { show("home"); });

export function applyCraftSprites() {
  document.querySelectorAll("#screen-craft .pill").forEach(function (pill) {
    useSprite(pill.querySelector(".pill-icon"), "craft/" + pill.dataset.item);
  });
}
