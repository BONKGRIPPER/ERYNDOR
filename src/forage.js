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
// Swing-based now (2026-08-28), same shape as Mining's dig: every tap is
// instant and advances state.forageProgress by one, no per-click timer of
// its own. Only the swing's last tap (FORAGE_CLICKS_PER_SWING of them)
// actually resolves a gather. At VILLAGER_LEVEL, Shards can buy a villager
// (state.villager.owned, from the Township screen -- see township.js) who
// taps that same swing automatically, once every VILLAGER_TICK_MS, whether
// the player is looking at this screen, a different one, or the game is
// closed entirely -- settleForage() below resolves however many of those
// ticks came due since the last check, chaining through as many complete
// swings as a long away-gap crosses, in one pass. Crucially, the player's
// own taps land on that *same* progress counter -- tapping the forage pill
// while a villager works adds to the swing already in flight instead of
// starting a second one, which is what lets "stay and tap along" actually
// speed a hired villager up. `fastHands` (also bought from Township) is a
// flat multiplier on VILLAGER_TICK_MS, read fresh on every villager tick
// rather than baked in once, so it speeds up ticks already scheduled too.

import {
  FORAGE_POOLS, FORAGE_XP, FORAGE_MAX_LEVEL, FORAGE_CLICKS_PER_SWING,
  VILLAGER_TICK_MS, VILLAGER_UPGRADE_MULT, LOCATIONS,
} from "./data.js";
import { state, save, gainItem } from "./state.js";
import { levelFromXp } from "./skills.js";
import { pillFor } from "./pills.js";
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

// The hired villager forages at Aerendell's Township regardless of where
// the player currently is -- they didn't come along on the trip, they're
// still back home working. Hardcoded rather than read off the player's
// location on purpose; the villager's own "home" only ever needs to move
// if Township becomes buildable somewhere else, which it isn't yet.
const VILLAGER_HOME_POOL = "aerendell";

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

// The villager's own tick interval -- fastHands (bought from Township)
// shortens it by a flat multiplier, read fresh every time this is called
// rather than locked in once, so buying the upgrade mid-run speeds up the
// very next tick, not just future ones.
function villagerTickMs() {
  return state.villager.fastHands ? Math.round(VILLAGER_TICK_MS * VILLAGER_UPGRADE_MULT) : VILLAGER_TICK_MS;
}

// The pill's fill jumps straight to the new tap count every tap -- a
// short, fixed CSS transition (not derived from any timer, there isn't
// one) tweens it, same as Mining's setSwingFill(). Retargets cleanly if a
// villager tick and a player tap land close together.
function setSwingFill(pct) {
  const fill = pillFor("forage").querySelector(".pill-fill");
  fill.style.transitionDuration = "120ms";
  fill.style.width = pct + "%";
}

// Draws the fill instantly, no transition -- for the very first paint after
// a reload, so a swing already partway done doesn't animate in from 0%.
export function drawForageProgress() {
  const fill = pillFor("forage").querySelector(".pill-fill");
  fill.style.transitionDuration = "0ms";
  fill.style.width = (state.forageProgress / FORAGE_CLICKS_PER_SWING * 100) + "%";
}

// One tap of progress toward the current swing -- shared by the player's
// own taps (tapForage(), below) and the villager's automatic ones
// (settleForage()). Returns the item gathered if this tap completed the
// swing, or null if the swing is still in progress.
function addForageTap(poolId) {
  state.forageProgress += 1;
  if (state.forageProgress < FORAGE_CLICKS_PER_SWING) return null;
  state.forageProgress = 0;
  const item = rollDrop(poolId);
  gainItem(item, 1);
  state.foragingXp += FORAGE_XP;
  return item;
}

// The player's own tap on the pill -- available whenever the current
// location actually has a forage pool assigned (LOCATIONS[...].forage),
// villager or not. A no-op everywhere else rather than rolling from
// nothing; refreshForage() below already disables the pill visually so
// this is a defensive backstop, not the only guard. Resolved synchronously,
// same as Mining's tapDig(): no deadline, nothing to settle later.
function tapForage() {
  if (!canForageHere()) return;
  const item = addForageTap(currentPoolId());
  save();
  setSwingFill(state.forageProgress / FORAGE_CLICKS_PER_SWING * 100);
  if (item) {
    updateSkillsNote();
    showForageResult(item);
  } else {
    refreshForage();
  }
}

// Resolves however many villager ticks have come due since the last check
// -- not just one. A long away-gap (a reload, or the game closed entirely)
// can cross several VILLAGER_TICK_MS at once, each one either advancing the
// swing or completing it and rolling an item, exactly like a very fast
// series of taps. Returns every item produced, in order. A no-op with no
// villager hired, or before one's first tick has ever been scheduled --
// keeps ticking at VILLAGER_HOME_POOL even while the player has wandered
// off somewhere with no pool of its own, since the villager never left.
export function settleForage() {
  const results = [];
  if (!state.villager.owned || state.villagerNextTickAt === null) return results;
  let changed = false;
  while (Date.now() >= state.villagerNextTickAt) {
    changed = true;
    const item = addForageTap(VILLAGER_HOME_POOL);
    if (item) results.push(item);
    state.villagerNextTickAt += villagerTickMs();
  }
  if (changed) {
    save();
    if (results.length) updateSkillsNote();
    setSwingFill(state.forageProgress / FORAGE_CLICKS_PER_SWING * 100);
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

// Redraws the pill's idle text without touching an in-flight fill's
// transition -- safe any time except while a result is still being shown,
// which reverts on its own timeout. Hiring/upgrading the villager lives on
// the Township screen now (src/township.js), not here -- this only
// reflects whether one's already working, and invites the player to tap
// along when it is. Greyed out (and the pill's own click becomes a no-op
// via tapForage()'s own guard) wherever the current location has no
// forage pool assigned yet.
export function refreshForage() {
  const pill = pillFor("forage");
  pill.classList.toggle("forage-disabled", !canForageHere());
  if (pill.classList.contains("result")) return;
  if (!canForageHere()) {
    pill.querySelector(".pill-sub").textContent = "Nothing to forage here";
    pill.querySelector(".pill-name").textContent = "Forage";
    return;
  }
  pill.querySelector(".pill-sub").textContent = state.villager.owned
    ? "Villager taps every " + (villagerTickMs() / 1000) + "s — tap to help"
    : "Tap to forage";
  pill.querySelector(".pill-name").textContent = state.villager.owned ? "Forage \u{1F9D1}\u{200D}\u{1F33E}" : "Forage";
}

// Called by township.js right after a successful hire -- schedules the
// villager's first tick immediately instead of waiting for the player to
// tap the pill themselves. A no-op if a schedule already exists (e.g. this
// somehow got called twice), so it never skips a tick forward.
export function kickForageIfIdle() {
  if (state.villagerNextTickAt === null) {
    state.villagerNextTickAt = Date.now() + villagerTickMs();
  }
}

pillFor("forage").addEventListener("click", tapForage);

export function applyForageSprites() {
  useSprite(pillFor("forage").querySelector(".pill-icon"), "forage/basket");
}
