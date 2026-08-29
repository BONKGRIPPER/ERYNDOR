// ================================================================= screens
//
// screens.js <-> dock.js, screens.js <-> inventory.js, screens.js <->
// market.js, screens.js <-> campfire.js, screens.js <-> journal.js,
// screens.js <-> combat.js, and screens.js <-> township.js are mutually
// importing on purpose. It's safe: `show`, `syncDock`, `buildInventory`,
// `buildMarket`, `campfireShown`, `buildJournal`, `refreshCombat` and
// `buildTownship` are only ever called from inside event handlers, never at
// module-evaluation time, so the circular live bindings are always resolved
// by the time anything actually calls them.

import { SCREEN_IDS } from "./data.js";
import { el } from "./dom.js";
import { syncDock } from "./dock.js";
import { buildInventory } from "./inventory.js";
import { buildMarket } from "./market.js";
import { campfireShown } from "./campfire.js";
import { buildJournal } from "./journal.js";
import { refreshCombat, syncTimerBars } from "./combat.js";
import { buildTownship } from "./township.js";

// The screen lives in the URL hash, so a reload puts you back where you were
// and the browser's back button works without any routing code. Adding a
// screen is: give it a #screen-<id> element and list <id> in SCREEN_IDS.
export function show(name) {
  SCREEN_IDS.forEach(function (id) {
    el("screen-" + id).classList.toggle("hidden", id !== name);
  });
  const want = name === "home" ? "" : "#" + name;
  if (location.hash !== want) history.replaceState(null, "", want || location.pathname);
  syncDock(name);
  // Rebuilt on open rather than kept live -- counts only change on Field or
  // Foraging, never while this screen itself is the one showing.
  if (name === "inventory") buildInventory();
  if (name === "market") buildMarket();
  if (name === "campfire") campfireShown();
  if (name === "skills") buildJournal();
  if (name === "combat") { refreshCombat(); syncTimerBars(); }
  if (name === "township") buildTownship();
}

export function showFromHash() {
  const name = location.hash.slice(1);
  show(SCREEN_IDS.indexOf(name) >= 0 ? name : "home");
}

window.addEventListener("hashchange", showFromHash);
