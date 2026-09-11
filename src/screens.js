// ================================================================= screens
//
// screens.js <-> dock.js, screens.js <-> inventory.js, screens.js <->
// market.js, screens.js <-> campfire.js, screens.js <-> journal.js,
// screens.js <-> combat.js, screens.js <-> township.js, screens.js <->
// map.js, screens.js <-> explore.js, screens.js <-> fishing.js,
// screens.js <-> craft.js, screens.js <-> stations.js, and screens.js <->
// buildings.js are mutually importing on purpose. It's safe: `show`,
// `syncDock`, `buildInventory`, `buildMarket`, `campfireShown`,
// `buildJournal`, `refreshCombat`, `buildCombatIdle`, `buildTownship`,
// `buildMap`, `buildExplore`, `buildFishing`, `refreshCraft`,
// `refreshAllStations` and `drawStationCards` are only ever called from
// inside event handlers, never at module-evaluation time, so the circular
// live bindings are always resolved by the time anything actually calls
// them.

import { SCREEN_IDS, PRODUCTION_SCREEN_IDS, FIELD_SCREEN_IDS, LOCATION_ACTIVITIES } from "./data.js";
import { state } from "./state.js";
import { el } from "./dom.js";
import { syncDock } from "./dock.js";
import { buildInventory } from "./inventory.js";
import { buildMarket } from "./market.js";
import { campfireShown } from "./campfire.js";
import { buildJournal } from "./journal.js";
import { refreshCombat, syncTimerBars, buildCombatIdle } from "./combat.js";
import { buildTownship } from "./township.js";
import { buildMap } from "./map.js";
import { buildExplore } from "./explore.js";
import { buildFishing } from "./fishing.js";
import { buildForaging } from "./forage.js";
import { refreshCraft } from "./craft.js";
import { refreshAllStations } from "./stations.js";
import { drawStationCards } from "./buildings.js";
import { buildBeehiveSlots, drawBeehive } from "./beehive.js";

// Exported so main.js's tick loop can use the same list for its own
// "still sitting on one of these" check, rather than a second copy of it
// drifting out of sync.
export const STATION_SCREENS = ["spinningWheel", "sawmill", "stoneCutter", "tanningStation", "armorBench", "grindStone", "fletchingBench"];

// The screen lives in the URL hash, so a reload puts you back where you were
// and the browser's back button works without any routing code. Adding a
// screen is: give it a #screen-<id> element and list <id> in SCREEN_IDS.
export function show(name) {
  // A workshop asked for while not at Home (away, or in field context at
  // Aerendell) just lands on Explore -- the Home dock button is the only
  // way in, and it isn't offered anywhere the player couldn't take it.
  if (PRODUCTION_SCREEN_IDS.indexOf(name) >= 0 && state.playerContext !== "home") {
    name = "explore";
  }
  // A field activity asked for where it isn't available (wrong location, or
  // still in home context) also lands on Explore, which lists what *is*
  // available here.
  if (FIELD_SCREEN_IDS.indexOf(name) >= 0 && (state.playerContext !== "field" || !(LOCATION_ACTIVITIES[state.currentLocation] || []).includes(name))) {
    name = "explore";
  }
  SCREEN_IDS.forEach(function (id) {
    el("screen-" + id).classList.toggle("hidden", id !== name);
  });
  const want = name === "home" ? "" : "#" + name;
  if (location.hash !== want) history.replaceState(null, "", want || location.pathname);
  syncDock(name);
  // Rebuilt on open rather than kept live. Craft/the conversion stations
  // are the exception to "counts only change while this screen itself
  // isn't the one showing" -- the persistent Forage bar's hired villager
  // ticks unconditionally in the background regardless of which screen is
  // visible, so the bag can change while sitting on Craft/a station
  // screen too. Without this, a recipe's cost text (and its
  // affordable/unaffordable styling) would stay exactly as stale as it
  // was the moment this screen was last drawn -- the "I have the
  // materials but it says I don't" bug this fixes. main.js's tick loop
  // also keeps both current for as long as the screen stays open, this
  // call is just what makes it correct the instant it opens rather than
  // up to one tick (200ms) later.
  if (name === "inventory") buildInventory();
  if (name === "market") buildMarket();
  if (name === "campfire") campfireShown();
  if (name === "skills") buildJournal();
  // buildCombatIdle() rebuilds the enemy list against wherever the player
  // currently is -- Road Goblin (Forest Road-only) is the first enemy
  // that actually needs this on every visit, not just at boot.
  if (name === "combat") { buildCombatIdle(); refreshCombat(); syncTimerBars(); }
  if (name === "township") buildTownship();
  if (name === "map") buildMap();
  if (name === "explore") buildExplore();
  if (name === "fishing") buildFishing();
  if (name === "foraging") buildForaging();
  if (name === "craft") { refreshCraft(); drawStationCards(); }
  if (name === "beehive") { buildBeehiveSlots(); drawBeehive(); }
  if (STATION_SCREENS.indexOf(name) >= 0) refreshAllStations();
}

export function showFromHash() {
  const name = location.hash.slice(1);
  show(SCREEN_IDS.indexOf(name) >= 0 ? name : "home");
}

window.addEventListener("hashchange", showFromHash);
