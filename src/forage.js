// ================================================================ foraging
//
// One persistent gather action rather than four independent pills -- the
// button lives above the dock on every screen (#forage-bar in index.html)
// instead of behind its own hub card, since a single always-available
// action doesn't need a whole screen to itself. What a finished gather
// actually gives is rolled from the current zone's own pool (FORAGE_POOLS
// in data.js) the moment it resolves, not chosen by the player and not
// decided when it starts -- a future second zone just adds more pools.
//
// Single-tap-and-timer now (2026-08-31), same shape as Crafting: one tap
// starts a FORAGE_MS deadline (state.forage = {startedAt, readyAt, poolId}),
// no further taps needed -- settleForage() below resolves it the instant
// the deadline passes, same tick loop every other timer in this game uses.
// A tap while a gather is already running is a silent no-op, exactly like
// tapping an already-running Craft pill. The pool is locked in at the
// moment the gather *starts*, not when it resolves, so wandering off
// mid-gather still pays out from wherever it began -- same "recipe locked
// at start" rule craft.js's startCraft() follows.
//
// At VILLAGER_LEVEL, the Forager profession unlocks (Township screen --
// see township.js/workers.js's roleUnlocked()); once assigned to a free
// slot there, it taps this same pill on its own, once every
// VILLAGER_TICK_MS, whether the player is looking at this screen, a
// different one, or the game is closed entirely -- settleForage() below
// resolves however many gathers came due since the last check, chaining
// through as many complete cycles as a long away-gap crosses, in one pass.
// The villager always gathers from their own home location's pool (the
// assigned worker's own `homeLocation`, set once at assignment) regardless
// of where the player currently is; if the player is already mid-gather
// when a villager tick lands, the tick is a no-op, same as any other
// double-tap. Reworked (2026-09-04, second pass): the Forager is now just
// another WORKERS entry (state.workers, workers.js) rather than its own
// standalone state.villager -- its own idle speed instead comes for free
// from Foraging's own skill level (WORKER_LEVEL_SPEED_MULT, same
// compounding bonus every other profession gets), not a separately paid
// "fastHands" upgrade.

import {
  FORAGE_POOLS, FORAGE_MS, FORAGE_XP, FORAGE_MAX_LEVEL,
  FORAGE_LEVEL_THRESHOLDS, FORAGE_LEVEL_SPEED_MULT,
  VILLAGER_TICK_MS, WORKER_LEVEL_SPEED_MULT, LOCATIONS,
} from "./data.js";
import { state, save, gainItem, gainSkillXp } from "./state.js";
import { openZoneWheel } from "./zoneWheel.js";
import { levelFromXp } from "./skills.js";
import { getWorker } from "./workers.js";
import { pillFor, setPillFill } from "./pills.js";
import { useSprite } from "./sprites.js";
import { el } from "./dom.js";
import { openSheet } from "./sheet.js";
import { updateSkillsNote } from "./hub.js";

// Which FORAGE_POOLS key applies at the player's current location --
// LOCATIONS[...].forage, not a hardcoded zone. null wherever a pool hasn't
// been assigned yet (every location but Aerendell, for now), treated as
// "nothing to forage here," not "forage from nothing."
function currentPoolId() {
  const loc = LOCATIONS[state.currentLocation];
  return loc ? loc.forage : null;
}

function canForageHere() {
  return !!currentPoolId();
}

// The assigned Forager works wherever they were actually assigned (the
// worker's own homeLocation, set once in workers.js's assignWorker()) --
// not the player's current one. Assign in Aerendell, wander off to Forest
// Road, and the villager keeps working Aerendell's pool the whole time;
// they didn't come along on the trip. null (no Forager assigned yet, or a
// pool that's since been removed) means no pool to forage from at all.
function villagerPoolId() {
  const w = getWorker("forager");
  const loc = w && LOCATIONS[w.homeLocation];
  return loc ? loc.forage : null;
}

function rollDrop(poolId) {
  const pool = FORAGE_POOLS[poolId];
  const roll = Math.random();
  let acc = 0;
  for (let i = 0; i < pool.length; i++) {
    acc += pool[i].chance;
    if (roll < acc) return pool[i].item;
  }
  return pool[pool.length - 1].item;   // floating-point rounding safety net
}

export function foragingLevel() {
  return Math.min(FORAGE_MAX_LEVEL, levelFromXp(state.foragingXp));
}

// The villager's own tick interval -- compounds WORKER_LEVEL_SPEED_MULT
// once per level of Foraging (the same idle-speed bonus every other
// profession gets, see WORKER_LEVEL_SPEED_MULT's own comment in data.js),
// read fresh every time this is called rather than locked in once, so
// leveling Foraging mid-run speeds up the very next tick, not just future
// ones.
function villagerTickMs() {
  return Math.round(VILLAGER_TICK_MS / Math.pow(WORKER_LEVEL_SPEED_MULT, foragingLevel()));
}

// Foraging's own action mastery -- see FORAGE_LEVEL_THRESHOLDS in data.js.
// Compounding, same shape as itemLevels.js's itemSpeedMult(): level N is
// FORAGE_LEVEL_SPEED_MULT^N of the base FORAGE_MS.
function forageLevelSpeedMult() {
  return Math.pow(FORAGE_LEVEL_SPEED_MULT, state.forageLevel.level);
}

function forageMs() {
  return FORAGE_MS * forageLevelSpeedMult();
}

// Gathers landed toward the *next* level, and how many that takes -- drives
// the pill's own bottom-edge mastery bar, same idea as itemLevelProgress().
// `need` is 0 once the threshold table runs out (the practical level cap),
// which drawForageLevel() below reads as "full bar, nothing more to climb."
export function forageLevelProgress() {
  const lvl = state.forageLevel;
  return { level: lvl.level, into: lvl.clicks, need: FORAGE_LEVEL_THRESHOLDS[lvl.level] || 0 };
}

// Call once per gather actually completed (not per tap). Returns true if
// this gather pushed foraging to a new level, so callers can flash the
// badge; false otherwise -- including once the threshold table's run out
// and there's nothing left to climb toward.
function recordForageLevel() {
  const lvl = state.forageLevel;
  const need = FORAGE_LEVEL_THRESHOLDS[lvl.level];
  if (need === undefined) return false;
  lvl.clicks += 1;
  if (lvl.clicks >= need) {
    lvl.clicks = 0;
    lvl.level += 1;
    return true;
  }
  return false;
}

// Starts the player's own gather from the given pool if nothing's already
// running -- the villager's own auto-gather (settleForage()) no longer
// goes through here at all (see that function's own 2026-09-03 comment),
// so this is the player's live tap path only now, always starting from
// right now. Returns whether it actually started, so tapForage() knows a
// `false` (something's already occupying the slot) isn't done.
function startForage(poolId) {
  if (state.forage) return false;
  const startedAt = Date.now();
  const ms = forageMs();
  state.forage = { startedAt: startedAt, readyAt: startedAt + ms, poolId: poolId };
  const fill = pillFor("forage").querySelector(".pill-fill");
  fill.style.transitionDuration = "0ms";
  fill.style.width = "0%";
  void fill.offsetWidth;
  setPillFill("forage", 100, ms);
  return true;
}

// The player's own tap on the pill -- available whenever the current
// location actually has a forage pool assigned (LOCATIONS[...].forage).
// A no-op everywhere else rather than rolling from nothing; refreshForage()
// below already disables the pill visually so this is a defensive
// backstop, not the only guard.
function tapForage() {
  if (!canForageHere()) return;
  startForage(currentPoolId());
  save();
  refreshForage();
}

// The actual mechanics of one completed gather -- rolls poolId's drop
// table, grants it, gains foraging XP, and records one gather toward
// foraging's own mastery (recordForageLevel()). Shared by the player's own
// resolveForage() (below, gated on state.forage) and the villager's own
// auto-gather cycle in settleForage() (below, which never touches
// state.forage at all -- see that function's own comment for why).
function completeGather(poolId) {
  const item = rollDrop(poolId);
  gainItem(item, 1);
  const zoneLevels = gainSkillXp("foragingXp", FORAGE_XP);
  if (zoneLevels) openZoneWheel(state.currentLocation, zoneLevels);
  const leveledUp = recordForageLevel();
  return { item: item, leveledUp: leveledUp };
}

// Resolves the player's own finished gather (state.forage) and returns the
// item, or null if nothing was running or it hasn't finished yet.
function resolveForage() {
  if (!state.forage || Date.now() < state.forage.readyAt) return null;
  const result = completeGather(state.forage.poolId);
  state.forage = null;
  // Same reset craft.js's settleCraft() does -- without it, a finished
  // gather's .pill-fill sits at its last-drawn 100% (fully colored)
  // forever, since nothing else ever points it back at 0%.
  setPillFill("forage", 0, 0);
  return result;
}

// Called every tick (main.js) -- resolves the player's own running gather
// the instant its deadline passes, same as settleCraft(). Also where the
// villager's own automatic ticks live: however many VILLAGER_TICK_MS
// intervals came due since the last check, each one resolves immediately
// (completeGather() is a synchronous roll+grant, no timer of its own),
// chained straight through the while loop. Returns every item produced,
// in order.
//
// bug fixed 2026-09-01: `state.villagerNextTickAt` used to advance every
// iteration regardless of whether a cycle actually started, so any gap
// spanning more than one villager tick silently fast-forwarded the
// schedule past every missed cycle but the first, discarding the rest
// instead of catching them up -- the "villagers stop working" symptom
// this was originally reported as.
//
// bug fixed 2026-09-03: that first fix still routed the villager's own
// cycle through startForage(), which shares state.forage -- the exact
// same slot the player's own manual tap uses. Whenever the player had a
// personal gather actively running (which, played normally, is most of
// the time), `if (state.forage) return false` blocked every single
// villager tick due during that window, and since nothing advanced
// villagerNextTickAt while blocked, the villager produced nothing at all
// until the player's own gather happened to finish -- explaining exactly
// the *inconsistent* idle production this was reported as (not "never
// works," but "works only in the gaps between the player's own taps").
// The villager's cycle now calls completeGather() directly and never
// touches state.forage, so the two can no longer collide.
export function settleForage() {
  const results = [];
  let changed = false;
  let leveledUp = false;

  const finished = resolveForage();
  if (finished) { results.push(finished.item); changed = true; leveledUp = leveledUp || finished.leveledUp; }

  const worker = getWorker("forager");
  if (worker && !state.village.starved) {
    const poolId = villagerPoolId();
    if (poolId) {
      while (Date.now() >= worker.nextTickAt) {
        changed = true;
        const done = completeGather(poolId);
        results.push(done.item);
        leveledUp = leveledUp || done.leveledUp;
        worker.nextTickAt += villagerTickMs();
      }
    }
  }

  if (changed) {
    save();
    if (results.length) updateSkillsNote();
    refreshForage(leveledUp);
  }
  return results;
}

let resultTimer = 0;

// Shows what a single finished gather produced for a couple of seconds
// before the pill goes back to its normal idle text.
export function showForageResult(item) {
  const pill = pillFor("forage");
  pill.classList.add("result");
  pill.querySelector(".pill-sub").textContent = "+1 " + item;
  clearTimeout(resultTimer);
  resultTimer = setTimeout(function () {
    pill.classList.remove("result");
    refreshForage();
  }, 1800);
}

function formatAway(ms) {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return h + "h " + m + "m";
  if (m > 0) return m + "m " + s + "s";
  return s + "s";
}

// The "welcome back" popup -- every item the villager gathered while the
// game was closed, tallied by name, plus how long that actually was.
export function showAwayPopup(items, awayMs) {
  const counts = {};
  items.forEach(function (item) { counts[item] = (counts[item] || 0) + 1; });

  const body = el("sheet-body");
  body.replaceChildren();

  const summary = document.createElement("div");
  summary.className = "away-summary";
  summary.textContent = "Your villager kept foraging while you were away for " + formatAway(awayMs) + ".";
  body.append(summary);

  Object.keys(counts).forEach(function (item) {
    const row = document.createElement("div");
    row.className = "away-row";
    const name = document.createElement("span");
    name.textContent = item;
    const count = document.createElement("span");
    count.textContent = "+" + counts[item];
    row.append(name, count);
    body.append(row);
  });

  openSheet("Welcome back");
}

// The mastery badge/bar on the pill's bottom edge -- same two elements and
// same visual language as a Craft pill's own (.pill-level-badge/
// .pill-level-fill, see itemLevels.js and style.css's shared rules for
// both). Redrawn every refreshForage() call, independent of whatever the
// pill's idle text is doing, so it stays current through every state --
// idle, running, or mid-result-flash.
function drawForageLevel(flash) {
  const pill = pillFor("forage");
  const badge = pill.querySelector(".pill-level-badge");
  const levelFill = pill.querySelector(".pill-level-fill");
  if (!badge || !levelFill) return;
  const p = forageLevelProgress();
  badge.textContent = String(p.level);
  levelFill.style.width = (p.need > 0 ? (p.into / p.need * 100) : 100).toFixed(1) + "%";
  if (flash) {
    badge.classList.remove("pop");
    void badge.offsetWidth;
    badge.classList.add("pop");
  }
}

// Redraws the pill's idle text without touching an in-flight fill's
// transition -- safe any time except while a result is still being shown,
// which reverts on its own timeout. Hiring/upgrading the villager lives on
// the Township screen now (src/township.js), not here -- this only
// reflects whether one's already working, and invites the player to tap
// along when it is. Greyed out (and the pill's own click becomes a no-op
// via tapForage()'s own guard) wherever the current location has no
// forage pool assigned yet. `flash` (from settleForage(), when a gather
// just pushed foraging to a new level) pops the mastery badge the same way
// a leveled-up Craft pill's own badge does.
export function refreshForage(flash) {
  const pill = pillFor("forage");
  pill.classList.toggle("forage-disabled", !canForageHere());
  pill.classList.toggle("active", !!state.forage);
  drawForageLevel(flash);
  if (pill.classList.contains("result")) return;
  if (!canForageHere()) {
    pill.querySelector(".pill-sub").textContent = "Nothing to forage here";
    pill.querySelector(".pill-name").textContent = "Forage";
    return;
  }
  const worker = getWorker("forager");
  let sub;
  if (state.forage) {
    sub = "Foraging…";
  } else if (worker) {
    if (state.village.starved) {
      sub = "Villager's out of supplies — donate at Township";
    } else if (worker.homeLocation !== state.currentLocation) {
      sub = "Villager's working " + (LOCATIONS[worker.homeLocation] || {}).name;
    } else {
      sub = "Villager taps every " + (villagerTickMs() / 1000) + "s — tap to forage";
    }
  } else {
    sub = "Tap to forage";
  }
  pill.querySelector(".pill-sub").textContent = sub;
  pill.querySelector(".pill-name").textContent = worker ? "Forage \u{1F9D1}\u{200D}\u{1F33E}" : "Forage";
}

// Draws the fill instantly, no transition -- for the very first paint after
// a reload, so a gather already partway done doesn't animate in from 0%.
export function drawForageProgress() {
  const fill = pillFor("forage").querySelector(".pill-fill");
  fill.style.transitionDuration = "0ms";
  if (state.forage) {
    setPillFill("forage", 100, Math.max(0, state.forage.readyAt - Date.now()));
  } else {
    fill.style.width = "0%";
  }
}


pillFor("forage").addEventListener("click", tapForage);

export function applyForageSprites() {
  useSprite(pillFor("forage").querySelector(".pill-icon"), "forage/basket");
}
