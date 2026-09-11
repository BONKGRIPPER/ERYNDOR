// ===================================================================== boot
//
// The only file that knows about every other one. Imports what it calls
// directly; screens.js's own import of dock.js and inventory.js is what
// actually wires their click handlers up, this file doesn't need to import
// them again just for that side effect.

import { RECIPES } from "./data.js";
import { state, load, save, unloadBagToWarehouse } from "./state.js";
import { probeSprites } from "./sprites.js";
import { show, showFromHash, STATION_SCREENS } from "./screens.js";
import {
  drawMenu, drawBag, updateWalletNote, updateHubAttention, updateSeasonNote, updateDaytimeBadge,
} from "./hub.js";
import { buildDock, refreshDock } from "./dock.js";
import {
  buildPlots, applyToolSprites, settle, drawField, drawXp,
} from "./field.js";
import { updateSkillsNote } from "./hub.js";
import {
  buildLogPlots, settleLogging, drawLogging, drawLogXp, resetLogPlotsForLocation,
} from "./logging.js";
import {
  applyForageSprites, settleForaging, refreshForaging, buildForaging,
} from "./forage.js";
import { applyCraftSprites, settleCraft, refreshCraft } from "./craft.js";
import { setPillFill, popCount } from "./pills.js";
import { drawStationCards } from "./buildings.js";
import { settleVillageUpkeep, buildTownship } from "./township.js";
import { settleWorkers } from "./workers.js";
import { settleCampfire, refreshCampfire, applyCampfireSprites } from "./campfire.js";
import {
  settleStations, refreshStation, refreshAllStations, drawAllStationXp, drawAllItemLevels, applyStationSprites,
} from "./stations.js";
import { refreshMining, settleMining, drawMiningXp, applyMiningSprites } from "./mining.js";
import {
  settleCombat, refreshCombat, drawCombatXp, syncTimerBars, buildCombatIdle,
} from "./combat.js";
import { settleTravel } from "./travel.js";
import { settleShipments } from "./shipments.js";
import { settleCaravan } from "./caravans.js";
import { refreshFreight } from "./freightUI.js";
import { buildInventory } from "./inventory.js";
import { buildMap, refreshMap } from "./map.js";
import { buildMarket } from "./market.js";
import {
  buildFishing, refreshFishing, settleFishingTrap, drawFishingXp, applyFishingSprites,
} from "./fishing.js";
import { buildBeehiveSlots, settleBeehive, drawBeehive } from "./beehive.js";
import { el } from "./dom.js";
import { showToast } from "./toast.js";
import "./devRoom.js";

// state.bagFullFlag itself is a plain counter (state.js's gainItem()),
// not a boolean -- watching for it to *change* rather than reading it as
// truthy is what keeps this a one-shot toast per new overflow instead of
// firing every single tick a still-full bag keeps rejecting a producer.
let lastBagFullFlag = 0;
let lastWarehouseFullFlag = 0;
function checkBagFull() {
  if (state.bagFullFlag !== lastBagFullFlag) {
    lastBagFullFlag = state.bagFullFlag;
    showToast("Inventory full");
  }
}

function checkWarehouseFull() {
  if (state.warehouseFullFlag !== lastWarehouseFullFlag) {
    lastWarehouseFullFlag = state.warehouseFullFlag;
    showToast("Warehouse full");
  }
}

function start() {
  // Travel and future freight settle before the first draw so an offline
  // arrival never flashes the old location or stale container totals.
  settleTravel();
  settleShipments();
  settleCaravan();
  drawMenu();
  drawStationCards();
  drawBag();
  buildDock();
  buildPlots();
  applyToolSprites();
  buildLogPlots();
  buildBeehiveSlots();
  buildForaging();
  applyForageSprites();
  applyCraftSprites();
  applyStationSprites();
  applyCampfireSprites();
  applyMiningSprites();
  applyFishingSprites();
  settle();
  drawField();
  drawXp();
  settleLogging();
  drawLogging();
  drawLogXp();
  settleBeehive();
  drawBeehive();
  updateSkillsNote();
  updateWalletNote();

  // Same shape as Crafting/every other settle*() just below -- an offline
  // gap (a reload, or the game closed entirely) catches up for free since
  // every forage gather is a deadline, not a countdown.
  if (settleForaging().length) drawBag();
  refreshForaging();

  settleCraft();
  Object.keys(RECIPES).forEach(function (item) {
    const c = state.crafting[item];
    if (c) setPillFill(item, 100, Math.max(0, c.readyAt - Date.now()));
  });
  refreshCraft();

  settleCampfire();
  if (state.campfire.current) {
    setPillFill("campfire-cook", 100, Math.max(0, state.campfire.current.readyAt - Date.now()));
  }
  refreshCampfire();

  settleStations();
  drawAllStationXp();
  drawAllItemLevels();
  Object.keys(state.stations).forEach(function (id) {
    const c = state.stations[id];
    if (c) setPillFill(id, 100, Math.max(0, c.readyAt - Date.now()));
  });
  refreshAllStations();

  // Same shape as Crafting/the conversion stations just above -- a swing
  // left running through a reload resolves here, and one still mid-flight
  // resumes its fill bar from wherever it actually is, not from 0%.
  settleMining();
  if (state.mineSwing) setPillFill("mine-dig", 100, Math.max(0, state.mineSwing.readyAt - Date.now()));
  drawMiningXp();
  refreshMining();

  drawFishingXp();
  // Catches up a Trap left out while the tab was closed, same shape as
  // Campfire's own boot-time settle just above -- it banks itself, no tap
  // needed, regardless of whether the Fishing screen is what's about to
  // show.
  settleFishingTrap();

  // Same idea again -- a village's own 24h upkeep clock keeps ticking
  // whether or not the Township screen (or even the game) was open to
  // watch it.
  settleVillageUpkeep();
  settleWorkers();

  settleCombat();
  drawCombatXp();
  refreshCombat();
  syncTimerBars();

  updateHubAttention();
  updateSeasonNote();
  updateDaytimeBadge();
  refreshDock();
  checkBagFull();
  checkWarehouseFull();

  showFromHash();

  setInterval(function () {
    settle();
    if (!el("screen-field").classList.contains("hidden")) drawField();

    settleLogging();
    if (!el("screen-logging").classList.contains("hidden")) drawLogging();

    settleBeehive();
    if (!el("screen-beehive").classList.contains("hidden")) drawBeehive();

    // Runs unconditionally regardless of which screen is showing (a
    // working Forager can be gathering at a location the player isn't even
    // looking at right now) -- only the Foraging screen itself needs an
    // explicit redraw, same "settle everywhere, refresh what's visible"
    // split every other screen in this loop follows.
    const doneForage = settleForaging();
    state.lastActiveAt = Date.now();
    const foragingVisible = !el("screen-foraging").classList.contains("hidden");
    if (doneForage.length) {
      drawBag();
      if (foragingVisible) {
        doneForage.forEach(function (d) {
          if (d.loc === state.currentLocation) { refreshForaging(d.item); popCount("forage:" + d.item); }
        });
      }
    } else if (foragingVisible) refreshForaging();

    const doneCraft = settleCraft();
    if (doneCraft.length) {
      doneCraft.forEach(function (item) { refreshCraft(item); popCount(item); });
      drawBag();
    }
    // The villager's own forage tick (settleForage(), a few lines up) runs
    // unconditionally regardless of which screen is showing, so the bag
    // can change while the player is sitting on the Craft screen watching
    // it -- without this, a recipe's cost text and afford styling would
    // only catch up the moment that exact recipe happens to finish
    // (doneCraft above), not when something else made it affordable.
    // screens.js's show() covers "just navigated here"; this is "still
    // sitting here."
    else if (!el("screen-craft").classList.contains("hidden")) refreshCraft();

    const doneStations = settleStations();
    if (doneStations.length) {
      doneStations.forEach(function (id) { refreshStation(id); popCount(id); });
      drawBag();
    }
    // Same reasoning as Craft just above, for the four conversion-station
    // screens (Spinning Wheel, Sawmill, Stone Cutter, Tanning Station).
    else if (STATION_SCREENS.some(function (id) { return !el("screen-" + id).classList.contains("hidden"); })) {
      refreshAllStations();
    }

    settleVillageUpkeep();
    settleWorkers();
    if (!el("screen-township").classList.contains("hidden")) buildTownship();

    // Digging is single-tap-and-timer now (2026-08-31, see mining.js) --
    // settleMining() resolves a running swing the instant its deadline
    // passes, same shape as every other settle() in this loop. Surfacing
    // is still synchronous (no wait of its own). Redrawn every tick while
    // visible so the cooldown countdown (if any) and the swing's own fill
    // bar both stay live.
    settleMining();
    const miningVisible = !el("screen-mining").classList.contains("hidden");
    if (miningVisible) refreshMining();

    // Combat's own two clocks (enemy attack, player recovery) both live as
    // deadlines on state.combat, so settleCombat() only ever needs a
    // Date.now() check here -- same shape as every other settle() in this
    // loop. Redrawn every tick while visible (not just on a state change)
    // since the countdown numbers and bar widths move every tick even when
    // nothing has "happened" yet.
    settleCombat();
    const combatVisible = !el("screen-combat").classList.contains("hidden");
    if (combatVisible) { drawCombatXp(); refreshCombat(); }

    const campfireVisible = !el("screen-campfire").classList.contains("hidden");
    const cooked = settleCampfire();
    if (cooked) drawBag();
    if (campfireVisible) refreshCampfire();

    // Same shape as Campfire just above: a Trap banks itself into the bag
    // the instant it's ready, no tap needed, wherever the player is
    // looking. Only the Fishing screen itself needs an explicit redraw.
    const fishingVisible = !el("screen-fishing").classList.contains("hidden");
    const trapCatch = settleFishingTrap();
    if (trapCatch) drawBag();
    if (fishingVisible) refreshFishing();

    // A resolved trip needs the whole canvas rebuilt (new "You are here"
    // node, new road highlighted); still in flight, only the countdown
    // banner needs touching -- same "full rebuild vs. light refresh" split
    // every other visible-screen check above already makes.
    const arrived = settleTravel();
    const shipmentsChanged = settleShipments();
    const caravanChanged = settleCaravan();
    refreshFreight();
    const mapVisible = !el("screen-map").classList.contains("hidden");
    if (mapVisible) { if (arrived) buildMap(); else refreshMap(); }

    // Arriving can add/remove hub cards (a built station only shows where
    // it was built), open/close a build prompt, and change which items a
    // Foraging pill list offers -- all location-gated, so all three need a
    // fresh look the instant a trip actually resolves, wherever the player
    // happens to be looking when it does.
    if (arrived) {
      drawMenu();
      drawStationCards();
      // A different location can offer an entirely different set of items
      // (see FORAGE_ITEMS in data.js) -- rebuilt, not just refreshed, same
      // reasoning Logging's own resetLogPlotsForLocation() gets a full
      // redraw rather than a light one.
      if (foragingVisible) buildForaging();
      // Swap any stale trees for the new location's species (see
      // resetLogPlotsForLocation()); redraw the plot list if it's showing
      // so it doesn't sit stale for one tick.
      if (resetLogPlotsForLocation() && !el("screen-logging").classList.contains("hidden")) {
        drawLogging();
      }
      const marketVisible = !el("screen-market").classList.contains("hidden");
      if (marketVisible) buildMarket();
      if (fishingVisible) buildFishing();
      // A location-exclusive enemy (Road Goblin, so far) can appear or
      // disappear from the idle list the instant a trip lands.
      if (combatVisible) buildCombatIdle();
      if (arrived.home) {
        show("home");
        if (arrived.blocked > 0) {
          showToast(arrived.moved + " cargo unloaded · " + arrived.blocked + " still in Bag");
        } else {
          showToast(arrived.moved + " cargo unloaded to Warehouse");
        }
      } else {
        // Landed in the field -- drop straight into "what's here" rather
        // than leaving the player staring at the travel map.
        show("explore");
      }
    }

    if (shipmentsChanged || caravanChanged) {
      drawBag();
      if (!el("screen-inventory").classList.contains("hidden")) buildInventory();
    }

    updateHubAttention();
    updateSeasonNote();
    updateDaytimeBadge();
    refreshDock();
    checkBagFull();
    checkWarehouseFull();
  }, 200);
}

load();

// One-time self-heal for saves written before enterHomeMode() (dock.js's
// Home button) unloaded the Bag into the Warehouse -- a save could load
// with playerContext already "home" at Aerendell but real cargo still
// stuck in the Bag from before that fix. Idempotent and free on an
// already-clean save (unloadBagToWarehouse() no-ops on an empty Bag).
if (state.playerContext === "home") { unloadBagToWarehouse(); save(); }

// Sprites are probed once before the first paint so the game never flashes
// placeholder art and then swaps to real art a frame later.
probeSprites().then(start);

window.addEventListener("pagehide", save);

// Handy in the browser console while building: `game.bag`, `game.plots`.
window.game = state;
