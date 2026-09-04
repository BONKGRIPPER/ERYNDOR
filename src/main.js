// ===================================================================== boot
//
// The only file that knows about every other one. Imports what it calls
// directly; screens.js's own import of dock.js and inventory.js is what
// actually wires their click handlers up, this file doesn't need to import
// them again just for that side effect.

import { RECIPES, AWAY_POPUP_MS } from "./data.js";
import { state, load, save } from "./state.js";
import { probeSprites } from "./sprites.js";
import { showFromHash, STATION_SCREENS } from "./screens.js";
import {
  drawMenu, drawBag, updateWalletNote, updateHubAttention, updateSeasonNote, updateDaytimeBadge,
} from "./hub.js";
import { buildDock } from "./dock.js";
import {
  buildPlots, applyToolSprites, settle, drawField, drawXp,
} from "./field.js";
import { updateSkillsNote } from "./hub.js";
import {
  buildLogPlots, settleLogging, drawLogging, drawLogXp,
} from "./logging.js";
import {
  applyForageSprites, settleForage, refreshForage, showForageResult, showAwayPopup, drawForageProgress,
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
  settleCombat, refreshCombat, drawCombatXp, drawWeaponSkillsXp, syncTimerBars, buildCombatIdle,
} from "./combat.js";
import { settleTravel } from "./travel.js";
import { buildMap, refreshMap } from "./map.js";
import { buildMarket } from "./market.js";
import {
  buildFishing, refreshFishing, settleFishingTrap, drawFishingXp, applyFishingSprites,
} from "./fishing.js";
import { buildBeehiveSlots, settleBeehive, drawBeehive } from "./beehive.js";
import { el } from "./dom.js";
import { showToast } from "./toast.js";

// Foraging's own settle() can resolve more than one gather in a single
// pass -- a villager chains straight into the next cycle, so a long gap
// (a reload, or the game closed entirely) catches up in one call. Shared
// between the boot-time catch-up and every tick so both paths behave
// identically, including the rare case where a throttled background tab
// lets more than one cycle pass between ticks.
//
// The "welcome back" popup is only for a *real* gap -- awayMs past
// AWAY_POPUP_MS, not just "the villager finished a cycle while the tab was
// open," which is the normal case every ~1-2.5s and would otherwise pop the
// sheet up constantly during ordinary play. Anything shorter (including
// every tick's own tiny ~200ms gap) gets the same small in-pill flash a
// villager-less gather already shows.
// state.bagFullFlag itself is a plain counter (state.js's gainItem()),
// not a boolean -- watching for it to *change* rather than reading it as
// truthy is what keeps this a one-shot toast per new overflow instead of
// firing every single tick a still-full bag keeps rejecting a producer.
let lastBagFullFlag = 0;
function checkBagFull() {
  if (state.bagFullFlag !== lastBagFullFlag) {
    lastBagFullFlag = state.bagFullFlag;
    showToast("Inventory full");
  }
}

function reportForageCatchup(results, awayMs) {
  if (results.length === 0) return;
  drawBag();
  if (state.villager.owned && awayMs > AWAY_POPUP_MS) showAwayPopup(results, awayMs);
  else showForageResult(results[results.length - 1]);
}

function start() {
  drawMenu();
  drawStationCards();
  drawBag();
  buildDock();
  buildPlots();
  applyToolSprites();
  buildLogPlots();
  buildBeehiveSlots();
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

  // How long the game was actually closed -- captured before settleForage()
  // (and the tick loop after it) start overwriting lastActiveAt.
  const bootAwayMs = Date.now() - state.lastActiveAt;
  reportForageCatchup(settleForage(), bootAwayMs);
  state.lastActiveAt = Date.now();
  // A swing already partway done from before a reload shows its saved
  // progress instantly, no fill-bar animation from 0%.
  drawForageProgress();
  refreshForage();

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
  drawWeaponSkillsXp();
  refreshCombat();
  syncTimerBars();

  // Catches up a trip that finished while the tab was closed, same as
  // every other settle() above -- state.currentLocation is already
  // correct by the time showFromHash() below decides what to draw. The
  // hub/build-prompt/forage redraws right after are what actually apply
  // that location everywhere gated on it; showFromHash() itself handles
  // the Market screen (buildMarket() reads state.currentLocation fresh)
  // if that's what the URL hash points back to.
  settleTravel();
  drawMenu();
  drawStationCards();
  refreshForage();

  updateHubAttention();
  updateSeasonNote();
  updateDaytimeBadge();
  checkBagFull();

  showFromHash();

  setInterval(function () {
    settle();
    if (!el("screen-field").classList.contains("hidden")) drawField();

    settleLogging();
    if (!el("screen-logging").classList.contains("hidden")) drawLogging();

    settleBeehive();
    if (!el("screen-beehive").classList.contains("hidden")) drawBeehive();

    // Normally just the ~200ms tick interval -- only meaningfully larger if
    // a backgrounded tab got throttled, which reportForageCatchup treats
    // the same way it treats any other gap.
    const tickAwayMs = Date.now() - state.lastActiveAt;
    reportForageCatchup(settleForage(), tickAwayMs);
    state.lastActiveAt = Date.now();
    // Cheap enough to redraw every tick, same reasoning as updateHubAttention()
    // below -- the forage bar and hire button are visible on every screen,
    // not just while some Foraging-specific view happens to be open.
    refreshForage();

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
    if (combatVisible) { drawCombatXp(); drawWeaponSkillsXp(); refreshCombat(); }

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
    const mapVisible = !el("screen-map").classList.contains("hidden");
    if (mapVisible) { if (arrived) buildMap(); else refreshMap(); }

    // Arriving can add/remove hub cards (a built station only shows where
    // it was built), open/close a build prompt, and turn foraging on or
    // off -- all location-gated, so all three need a fresh look the
    // instant a trip actually resolves, wherever the player happens to be
    // looking when it does. The unconditional refreshForage() a few lines
    // up already ran this same tick against the *old* location -- redone
    // here so the forage bar doesn't sit stale for one extra tick.
    if (arrived) {
      drawMenu();
      drawStationCards();
      refreshForage();
      const marketVisible = !el("screen-market").classList.contains("hidden");
      if (marketVisible) buildMarket();
      if (fishingVisible) buildFishing();
      // A location-exclusive enemy (Road Goblin, so far) can appear or
      // disappear from the idle list the instant a trip lands.
      if (combatVisible) buildCombatIdle();
    }

    updateHubAttention();
    updateSeasonNote();
    updateDaytimeBadge();
    checkBagFull();
  }, 200);
}

load();

// Sprites are probed once before the first paint so the game never flashes
// placeholder art and then swaps to real art a frame later.
probeSprites().then(start);

window.addEventListener("pagehide", save);

// Handy in the browser console while building: `game.bag`, `game.plots`.
window.game = state;
