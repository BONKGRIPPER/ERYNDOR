// ================================================================= workers
//
// The villager-labor system (2026-09-04, reworked a second time same day)
// -- one assignable worker per profession-shaped role (WORKERS in data.js:
// Forager, Cook, Spinster, Mason, Millworker, Miller, Beekeeper, Fletcher,
// Tanner, Weaver), each independently assigned and independently ticking,
// up to workerCap() at once. Assign/cap bookkeeping lives here; the actual
// per-tick trigger for each role either calls into stations.js's generic
// tryStartStation() (every role with a `stationIds` list) or one of the
// bespoke systems' own auto-trigger (campfire.js's tryAutoCook(),
// beehive.js's tryAutoBeehive(), forage.js's tryAutoForage()) --
// workers.js itself never touches state.stations/campfire/beehiveSlots/
// forageTimers directly, same separation of concerns every other "who
// actually owns this state" split in this game already follows.
//
// Reworked (2026-09-04, second pass): there's no more Shard cost to
// assign a worker, and no more per-worker paid leveling. A location's
// villager slots come entirely from Houses built there (HOUSE_WORKER_SLOTS
// each, see workerCap() below); assigning an unlocked profession to a free
// slot is free, and a slot can be unassigned and reassigned to a different
// profession at any time. Which stationIds tier an assigned worker can
// currently attempt is read straight off the relevant skill's own level
// (WORKER_TIER_LEVELS in data.js) -- see unlockedStationIds() below.
//
// The Township screen (src/township.js) owns the assign/unassign/House
// UI; this file is mechanics only, same split as forage.js (mechanics)
// vs. township.js (the old Foraging Villager's own hire card) already
// established.

import {
  WORKERS, STATIONS, WORKER_TICK_MULT, WORKER_LEVEL_SPEED_MULT, WORKER_TIER_LEVELS,
  HOUSE_WORKER_SLOTS, COOK_MS, BEEHIVE_HONEY_MS, VILLAGER_TICK_MS,
} from "./data.js";
import { state, save, kickVillageUpkeepIfIdle } from "./state.js";
import { effectiveMs, tryStartStation, costFor } from "./stations.js";
import { tryAutoCook } from "./campfire.js";
import { tryAutoBeehive } from "./beehive.js";
import { tryAutoForage } from "./forage.js";
import { levelFromXp } from "./skills.js";
import { canAfford } from "./costDisplay.js";
import { laborAssigned, laborCapacity } from "./labor.js";
import { settleCaravan } from "./caravans.js";

// The skill a role's tier-unlocking/speed bonus/unlock-level reads from --
// a tiered role reads it off its own first stationIds entry's own STATIONS
// skill (every tier of a given role trains the same skill); a bespoke role
// (Forager) names its own skillXp/skillName directly on WORKERS. Cook has
// neither -- nothing gates or speeds it beyond its building existing.
// Exported for township.js's own "Requires (Skill) Level (x)" display.
export function roleSkill(role) {
  const w = WORKERS[role];
  if (w.stationIds) return STATIONS[w.stationIds[0]];
  if (w.skillXp) return w;
  return null;
}

export function roleSkillLevel(role) {
  const skill = roleSkill(role);
  return skill ? levelFromXp(state[skill.skillXp]) : 0;
}

// stationIds.length for a tiered role, or a flat 1 for every bespoke role
// (Forager/Cook/Beekeeper) -- none of those have tiers to progress
// through. Exported for township.js's own level-bar display.
export function maxLevelFor(role) {
  const w = WORKERS[role];
  return w.stationIds ? w.stationIds.length : 1;
}

// How many of a tiered role's stationIds tiers the role's own skill level
// currently clears against WORKER_TIER_LEVELS (tier 0 always counts --
// nothing to unlock there). 1 (a flat "already maxed") for a bespoke role
// (Forager/Cook/Beekeeper), which has no tiers to begin with -- same
// number maxLevelFor() itself returns for one, so a bespoke role's own
// level bar always reads full. Exported for township.js's own level-bar
// display.
export function unlockedTierCount(role) {
  const w = WORKERS[role];
  if (!w.stationIds) return 1;
  const level = roleSkillLevel(role);
  let count = 0;
  for (let i = 0; i < w.stationIds.length; i++) {
    if (level >= (WORKER_TIER_LEVELS[i] || 0)) count = i + 1;
  }
  return count;
}

// Every stationId a tiered role can currently attempt. Empty for a
// bespoke role (Forager/Cook/Beekeeper), which don't route through this
// at all -- see attemptRole() below.
function unlockedStationIds(role) {
  const w = WORKERS[role];
  if (!w.stationIds) return [];
  return w.stationIds.slice(0, unlockedTierCount(role));
}

// The villager's own idle-processing speed bonus -- compounds
// WORKER_LEVEL_SPEED_MULT (1.01) once per level of whatever skill this
// specific station trains, read fresh every attempt same as
// effectiveMs() itself already is, so leveling that skill mid-run speeds
// up the very next attempt, not just future assignments. Distinct from
// (and stacks with) effectiveMs()'s own player-facing GROWTH_PER_LEVEL
// curve -- this is purely the villager's own extra edge, per the request.
function workerSpeedMult(cfg) {
  const level = levelFromXp(state[cfg.skillXp]);
  return Math.pow(WORKER_LEVEL_SPEED_MULT, level);
}

// One attempt at this worker's own action, trying every unlocked tier in
// order until one actually starts (or none can) -- never shakes/rejects
// visibly since nothing's watching a villager's own silent attempt.
// Returns the real ms the started cycle will take to auto-attack-style
// pace the *next* attempt off of (WORKER_TICK_MULT x this, applied by the
// caller), or null if nothing could start at all this pass.
function attemptRole(w) {
  const cfg = WORKERS[w.role];
  if (cfg.stationIds) {
    const tiers = unlockedStationIds(w.role);
    for (let i = 0; i < tiers.length; i++) {
      const stationCfg = STATIONS[tiers[i]];
      if (tryStartStation(tiers[i])) return effectiveMs(stationCfg) / workerSpeedMult(stationCfg);
    }
    return null;
  }
  if (w.role === "cook") return tryAutoCook() ? COOK_MS : null;
  if (w.role === "beekeeper") return tryAutoBeehive() ? BEEHIVE_HONEY_MS : null;
  // Reworked (2026-09-11): the Forager auto-starts an idle item at its own
  // homeLocation the same way a tiered role auto-starts a station just
  // above -- tryAutoForage() itself returns the real ms the started
  // gather will take, same shape tryStartStation()'s own effectiveMs()
  // pairing gives every other role.
  if (w.role === "forager") return tryAutoForage(w.homeLocation);
  return null;
}

// Every House built anywhere, times HOUSE_WORKER_SLOTS -- see
// HOUSE_WORKER_SLOTS's own comment in data.js for why villager slots are
// now entirely house-derived, no separate base cap layered underneath.
// Sums across every zone into one global cap rather than restricting a
// worker to their own assign zone's houses, same reasoning state.housing's
// own comment in state.js already gives.
export function workerCap() {
  return laborCapacity();
}

export function getWorker(role) {
  return state.workers.find(function (w) { return w.role === role; });
}

export function isAssigned(role) { return !!getWorker(role); }

export function assignedCount() { return laborAssigned(); }

export function freeSlots() { return Math.max(0, workerCap() - assignedCount()); }

// A role is unlocked once its building is built (or it needs none, like
// the Forager) and, if it names an `unlockLevel`, that skill has actually
// reached it -- currently only the Forager has one ("the only villager to
// unlock is the forager", per the request). Doesn't check slot
// availability or whether it's already assigned -- see canAssignWorker()
// for the full gate.
export function roleUnlocked(role) {
  const w = WORKERS[role];
  if (w.building && !state.buildings[w.building]) return false;
  if (!w.unlockLevel) return true;
  return roleSkillLevel(role) >= w.unlockLevel;
}

export function canAssignWorker(role) {
  const w = WORKERS[role];
  return !!(w && roleUnlocked(role) && !isAssigned(role) && freeSlots() > 0);
}

// A first-pass estimate for scheduling the very next attempt, before one
// has actually run yet -- tier 0's own effectiveMs()/workerSpeedMult()
// for a tiered role, the bespoke role's own flat interval otherwise, same
// numbers attemptRole() itself would use (or, for the Forager, the same
// base villagerTickMs() forage.js applies before any speed bonus -- its
// own settleForage() loop rereads that fresh on every real tick anyway).
function estimateTickMs(role) {
  const cfg = WORKERS[role];
  if (cfg.stationIds) {
    const stationCfg = STATIONS[unlockedStationIds(role)[0]];
    return (effectiveMs(stationCfg) / workerSpeedMult(stationCfg)) * WORKER_TICK_MULT;
  }
  if (role === "cook") return COOK_MS * WORKER_TICK_MULT;
  if (role === "beekeeper") return BEEHIVE_HONEY_MS * WORKER_TICK_MULT;
  // No real gather has actually started yet to read a speed from -- the
  // base rate (same fallback VILLAGER_TICK_MS always was) is close enough
  // for a first estimate; settleWorkers()'s own loop re-derives the real
  // number the moment tryAutoForage() actually starts something.
  if (role === "forager") return VILLAGER_TICK_MS;
  return 0;
}

// Free -- no Shards, no unlock cost beyond roleUnlocked()'s own gate.
// Starts working immediately, home-anchored to wherever the player
// currently is (see WORKERS' own comment in data.js on why that's
// flavor/display only for a station-based role, but is the Forager's
// actual working zone).
export function assignWorker(role) {
  settleCaravan();
  if (!canAssignWorker(role)) return false;
  state.workers.push({
    role: role,
    homeLocation: state.currentLocation,
    nextTickAt: Date.now() + estimateTickMs(role),
  });
  kickVillageUpkeepIfIdle();
  save();
  return true;
}

// Returns the slot to the unassigned pool -- the role can be picked back
// up later (by this or a different worker), starting fresh (a new
// nextTickAt from scratch, not resuming wherever the old one left off).
export function unassignWorker(role) {
  settleCaravan();
  const idx = state.workers.findIndex(function (w) { return w.role === role; });
  if (idx === -1) return false;
  state.workers.splice(idx, 1);
  save();
  return true;
}

// Called every tick (main.js) -- however many intervals came due since the
// last check, each one attempts the role's own action and only advances
// nextTickAt on success, so a blocked attempt (station busy, out of input
// material, every forage item at the Forager's location already running)
// is retried on a later call rather than silently skipped, same "blocked
// now, not lost" rule that fix established. Gated on the shared village
// upkeep. The Forager is no longer a special case here (2026-09-11) -- its
// own auto-gather now runs through attemptRole() like every other role,
// see forage.js's tryAutoForage().
export function settleWorkers() {
  if (state.village.starved) return false;
  let changed = false;
  state.workers.forEach(function (w) {
    while (Date.now() >= w.nextTickAt) {
      const ms = attemptRole(w);
      if (ms === null) break;
      changed = true;
      w.nextTickAt += ms * WORKER_TICK_MULT;
    }
  });
  if (changed) save();
  return changed;
}

// -------------------------------------------------------- display helpers
//
// township.js's own worker card needs to show which specific item a
// worker is *currently* able to produce at its best tier (the "master
// resource" per the request) without duplicating the tier-unlock logic
// above.

// The output item name of a role's own highest currently-unlocked tier --
// what township.js shows as the card's own icon. Null for a role with no
// station output to speak of (Forager/Cook/Beekeeper, or a tiered role
// whose skill hasn't even reached tier 0 yet -- shouldn't happen since
// tier 0 needs no level at all, but keeps this honest rather than
// assuming).
export function masterOutputFor(role) {
  const cfg = WORKERS[role];
  if (!cfg.stationIds) return null;
  const tiers = unlockedStationIds(role);
  const topId = tiers[tiers.length - 1];
  return topId ? STATIONS[topId].output : null;
}

// Whether this worker currently has the inputs on hand for *any* of its
// unlocked tiers -- purely informational (township.js's own status text),
// not a gate on anything.
export function anyTierAffordable(role) {
  const cfg = WORKERS[role];
  if (!cfg.stationIds) return true;
  return unlockedStationIds(role).some(function (id) { return canAfford(costFor(STATIONS[id])); });
}
