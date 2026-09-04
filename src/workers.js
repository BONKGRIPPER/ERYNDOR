// ================================================================= workers
//
// The second villager system (2026-09-04), alongside the Foraging
// Villager's own single-slot hire in forage.js/township.js -- one hire per
// station-shaped role (WORKERS in data.js: Cook, Spinster, Mason,
// Millworker, Miller, Beekeeper, Fletcher, Tanner), each independently
// hired and independently ticking, up to workerCap() at once. Hire/cap
// bookkeeping lives here; the actual per-tick trigger for each role either
// calls into stations.js's generic tryStartStation() (every role that has
// a `stationId`) or one of the two bespoke systems' own auto-trigger
// (campfire.js's tryAutoCook(), beehive.js's tryAutoBeehive()) -- workers.js
// itself never touches state.stations/campfire/beehiveSlots directly, same
// separation of concerns every other "who actually owns this state" split
// in this game already follows.
//
// The Township screen (src/township.js) owns the hire/House UI; this file
// is mechanics only, same split as forage.js (mechanics) vs. township.js
// (the Foraging Villager's own hire card) already established.

import {
  WORKERS, STATIONS, WORKER_TICK_MULT, BASE_WORKER_CAP, COOK_MS, BEEHIVE_HONEY_MS, VILLAGER_COST,
} from "./data.js";
import { state, save, kickVillageUpkeepIfIdle } from "./state.js";
import { effectiveMs, tryStartStation } from "./stations.js";
import { tryAutoCook } from "./campfire.js";
import { tryAutoBeehive } from "./beehive.js";

// How long one cycle of this role's own work actually takes right now, at
// the player's current skill level -- read fresh every call (not cached),
// same "speed matters at the moment a cycle starts" rule effectiveMs()
// itself already follows. Cook and Beekeeper have no skill-scaled speed of
// their own (Cooking grants no skill XP at all; Beekeeping's own XP doesn't
// speed up the Beehive), so both are flat constants here, same as they are
// everywhere else in this game.
function roleDurationMs(role) {
  const w = WORKERS[role];
  if (w.stationId) return effectiveMs(STATIONS[w.stationId]);
  if (role === "cook") return COOK_MS;
  if (role === "beekeeper") return BEEHIVE_HONEY_MS;
  return 0;
}

// The villager's own attempt interval -- WORKER_TICK_MULT (5x) whatever
// the role's own craft currently takes, per the request ("if an item takes
// 30 seconds to craft, the villager should auto click the pill every 2.5
// minutes").
function workerTickMs(role) {
  return roleDurationMs(role) * WORKER_TICK_MULT;
}

// One attempt at this role's own action -- delegates to whichever system
// actually owns that station, and never shakes/rejects visibly since
// nothing's watching a villager's own silent attempt. Returns whether it
// actually started something.
function attemptRole(role) {
  const w = WORKERS[role];
  if (w.stationId) return tryStartStation(w.stationId);
  if (role === "cook") return tryAutoCook();
  if (role === "beekeeper") return tryAutoBeehive();
  return false;
}

// BASE_WORKER_CAP plus one for every House built anywhere -- see
// state.housing's own comment in state.js for why this sums across every
// zone into one global cap rather than restricting a worker to their own
// hire zone's houses.
export function workerCap() {
  const houses = Object.keys(state.housing).reduce(function (sum, loc) {
    return sum + (state.housing[loc] || 0);
  }, 0);
  return BASE_WORKER_CAP + houses;
}

function isHired(role) {
  return state.workers.some(function (w) { return w.role === role; });
}

// A role is hireable once its station's building is actually built, it
// isn't already hired (one worker per role -- a second one would just
// collide on the exact same single-slot station, same reasoning the
// Foraging Villager has always been a single boolean rather than a list),
// and there's a free slot under workerCap().
export function canHireWorker(role) {
  const w = WORKERS[role];
  return !!(w && state.buildings[w.building] && !isHired(role) && state.workers.length < workerCap());
}

// Same VILLAGER_COST Shards as the Foraging Villager's own hire -- no
// separate price was given for these, so this reuses the one existing
// precedent rather than inventing a second number.
export function hireWorker(role) {
  if (!canHireWorker(role)) return false;
  if (state.shards < VILLAGER_COST) return false;
  state.shards -= VILLAGER_COST;
  state.workers.push({
    role: role,
    homeLocation: state.currentLocation,
    nextTickAt: Date.now() + workerTickMs(role),
  });
  kickVillageUpkeepIfIdle();
  save();
  return true;
}

// Called every tick (main.js), same shape as forage.js's own villager
// catch-up loop in settleForage() -- however many intervals came due since
// the last check, each one attempts the role's own action and only
// advances nextTickAt on success, so a blocked attempt (station busy, out
// of input material) is retried on a later call rather than silently
// skipped, same "blocked now, not lost" rule that fix established. Gated
// on the shared village upkeep, same as the Foraging Villager.
export function settleWorkers() {
  if (state.village.starved) return false;
  let changed = false;
  state.workers.forEach(function (w) {
    while (Date.now() >= w.nextTickAt) {
      if (!attemptRole(w.role)) break;
      changed = true;
      w.nextTickAt += workerTickMs(w.role);
    }
  });
  if (changed) save();
  return changed;
}
