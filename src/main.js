// ===================================================================== boot
//
// The only file that knows about every other one. Imports what it calls
// directly; screens.js's own import of dock.js and inventory.js is what
// actually wires their click handlers up, this file doesn't need to import
// them again just for that side effect.

import { RECIPES, AWAY_POPUP_MS } from "./data.js";
import { state, load, save } from "./state.js";
import { probeSprites } from "./sprites.js";
import { showFromHash } from "./screens.js";
import {
  drawMenu, drawBag, updateWalletNote, updateHubAttention, updateSeasonNote, updateDaytimeBadge,
} from "./hub.js";
import { buildDock } from "./dock.js";
import {
  buildPlots, applyToolSprites, settle, drawField, drawXp,
} from "./field.js";
import { updateSkillsNote } from "./hub.js";
import {
  buildLogPlots, applyLogToolSprites, settleLogging, drawLogging, drawLogXp,
} from "./logging.js";
import {
  applyForageSprites, settleForage, refreshForage, showForageResult, showAwayPopup, drawForageProgress,
} from "./forage.js";
import { applyCraftSprites, settleCraft, refreshCraft } from "./craft.js";
import { setPillFill, popCount } from "./pills.js";
import { drawBuildPrompts } from "./buildings.js";
import { settleCampfire, refreshCampfire, applyCampfireSprites } from "./campfire.js";
import {
  settleStations, refreshStation, refreshAllStations, drawAllStationXp, drawAllItemLevels, applyStationSprites,
} from "./stations.js";
import { refreshMining, drawMiningXp, applyMiningSprites } from "./mining.js";
import { settleCombat, refreshCombat, drawCombatXp, syncTimerBars } from "./combat.js";
import { el } from "./dom.js";

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
function reportForageCatchup(results, awayMs) {
  if (results.length === 0) return;
  drawBag();
  if (state.villager.owned && awayMs > AWAY_POPUP_MS) showAwayPopup(results, awayMs);
  else showForageResult(results[results.length - 1]);
}

function start() {
  drawMenu();
  drawBuildPrompts();
  drawBag();
  buildDock();
  buildPlots();
  applyToolSprites();
  buildLogPlots();
  applyLogToolSprites();
  applyForageSprites();
  applyCraftSprites();
  applyStationSprites();
  applyCampfireSprites();
  applyMiningSprites();
  settle();
  drawField();
  drawXp();
  settleLogging();
  drawLogging();
  drawLogXp();
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

  drawMiningXp();
  refreshMining();

  settleCombat();
  drawCombatXp();
  refreshCombat();
  syncTimerBars();

  updateHubAttention();
  updateSeasonNote();
  updateDaytimeBadge();

  showFromHash();

  setInterval(function () {
    settle();
    if (!el("screen-field").classList.contains("hidden")) drawField();

    settleLogging();
    if (!el("screen-logging").classList.contains("hidden")) drawLogging();

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

    const doneStations = settleStations();
    if (doneStations.length) {
      doneStations.forEach(function (id) { refreshStation(id); popCount(id); });
      drawBag();
    }

    // Digging and surfacing are both synchronous now (see mining.js) --
    // nothing to settle from a passive tick. Still redrawn every tick while
    // visible so the cooldown countdown (if any) stays live.
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

    updateHubAttention();
    updateSeasonNote();
    updateDaytimeBadge();
  }, 200);
}

load();

// Sprites are probed once before the first paint so the game never flashes
// placeholder art and then swaps to real art a frame later.
probeSprites().then(start);

window.addEventListener("pagehide", save);

// Handy in the browser console while building: `game.bag`, `game.plots`.
window.game = state;
