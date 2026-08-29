// ============================================================ item levels
//
// Independent per-output-item crafting mastery -- separate from a
// station's own skill level (which speeds up the whole station), this
// tracks how many times THIS SPECIFIC item has actually been produced,
// anywhere it's made, and speeds up just that item the more it's crafted.
// Keyed by the item's own name, not by which station/recipe made it --
// "how good am I at making Pine Planks" is meant to mean the same thing
// no matter which screen made them, and to keep meaning it if a second
// source for the same item ever exists.
//
// Shared by every recipe-producing system (stations so far; the Crafting
// Bench is meant to plug into this same module next). An item with no
// entry yet is level 0 -- most items never get one until the first time
// they're actually crafted.

import { ITEM_LEVEL_CRAFTS_NEEDED, ITEM_LEVEL_SPEED_MULT } from "./data.js";
import { state } from "./state.js";

function entry(item) {
  if (!state.itemLevels[item]) state.itemLevels[item] = { level: 0, crafts: 0 };
  return state.itemLevels[item];
}

export function itemLevel(item) {
  return state.itemLevels[item] ? state.itemLevels[item].level : 0;
}

// Crafts landed toward the *next* level, and how many that takes -- drives
// the bottom-edge mastery bar (a fresh bar per level, not a lifetime total).
export function itemLevelProgress(item) {
  const e = state.itemLevels[item];
  return { level: e ? e.level : 0, into: e ? e.crafts : 0, need: ITEM_LEVEL_CRAFTS_NEEDED };
}

// Compounding: level N takes ITEM_LEVEL_SPEED_MULT^N of the base time --
// multiply straight into whatever ms a recipe/station already computed.
export function itemSpeedMult(item) {
  return Math.pow(ITEM_LEVEL_SPEED_MULT, itemLevel(item));
}

// Call once per unit actually produced (not per attempt). Returns true if
// this craft pushed the item to a new level, so callers can flash/announce
// it; false otherwise. Doesn't save() itself -- callers already save()
// once after settling, same as every other piece of state a craft touches.
export function recordCraft(item) {
  const e = entry(item);
  e.crafts += 1;
  if (e.crafts >= ITEM_LEVEL_CRAFTS_NEEDED) {
    e.crafts = 0;
    e.level += 1;
    return true;
  }
  return false;
}
