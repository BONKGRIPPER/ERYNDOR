// ================================================================= foraging
//
// Reworked (2026-09-11) from one shared pill pinned above the dock into its
// own screen per location, same shape as Logging's -- one independently
// timed pill per item the current location offers (FORAGE_ITEMS in
// data.js), each a straight "tap and wait" loop with no roll involved: a
// pill always produces its own one named item, not a chance among several.
// Single-tap-and-timer, same as Crafting's own pills (see craft.js) -- one
// tap on an idle pill starts a FORAGE_BASE_MS deadline (scaled down by that
// item's own mastery level, see forageSpeedMs() below), no further taps
// needed, and it resolves on its own, banking straight into the Bag, the
// moment the deadline passes.
//
// Multiple pills can run at once (nothing here enforces "only one gather at
// a time" the way the old shared bar did), and the same item can even be
// running at two different locations simultaneously -- the player at one,
// the Forager villager (see tryAutoForage() below) working another -- so
// every running gather is keyed by *both* location and item
// (state.forageTimers, "<locationId>|<item>") rather than by item alone.
//
// Per-item mastery (state.forageItemLevels, keyed by item name only, not
// location -- see FORAGE_USES_BASE/GROWTH and FORAGE_SPEED_MULT in data.js)
// is the same bottom-edge "mastery bar on the pill itself" treatment
// itemLevels.js gives a crafted item, just with its own formula that grows
// on both axes forever (up to FORAGE_ITEM_MAX_LEVEL) instead of
// itemLevels.js's flat threshold.
//
// The old Forager villager mechanics (a bespoke settleForage() tick loop,
// separate from every other profession's) are gone too -- there's no more
// single shared pill for a villager tick to "tap" on a timer. The Forager
// now auto-starts an idle item at its own homeLocation the same way every
// other worker's attemptRole() auto-starts a station (see
// tryAutoForage()/workers.js).

import {
  FORAGE_ITEMS, FORAGE_BASE_MS, FORAGE_USES_BASE, FORAGE_USES_GROWTH,
  FORAGE_SPEED_MULT, FORAGE_ITEM_MAX_LEVEL, FORAGE_ZONE_XP, LOCATIONS,
} from "./data.js";
import { state, save, gainItem, gainZoneXp } from "./state.js";
import { openZoneWheel } from "./zoneWheel.js";
import { pillFor, setPillFill } from "./pills.js";
import { useSprite, slug } from "./sprites.js";
import { el } from "./dom.js";
import { show } from "./screens.js";
import { updateSkillsNote } from "./hub.js";

function timerKey(loc, item) { return loc + "|" + item; }

function itemsFor(loc) { return FORAGE_ITEMS[loc] || []; }

// -------------------------------------------------------------- mastery

function entry(item) {
  if (!state.forageItemLevels[item]) state.forageItemLevels[item] = { level: 0, uses: 0 };
  return state.forageItemLevels[item];
}

function usesNeeded(level) {
  return Math.ceil(FORAGE_USES_BASE * Math.pow(FORAGE_USES_GROWTH, level));
}

export function forageItemLevel(item) {
  return state.forageItemLevels[item] ? state.forageItemLevels[item].level : 0;
}

// Uses landed toward the *next* level, and how many that takes -- drives
// the bottom-edge mastery bar, same shape as itemLevelProgress() in
// itemLevels.js.
export function forageItemProgress(item) {
  const e = state.forageItemLevels[item];
  const level = e ? e.level : 0;
  return { level: level, into: e ? e.uses : 0, need: usesNeeded(level) };
}

// Compounding: level N takes 1/FORAGE_SPEED_MULT^N of the base time.
function forageSpeedMs(item) {
  return FORAGE_BASE_MS / Math.pow(FORAGE_SPEED_MULT, forageItemLevel(item));
}

// Call once per completed gather. Returns true if it pushed the item to a
// new level, so callers can flash/announce it; false otherwise (including
// once the item is already at the cap -- level 100 just stops climbing).
function recordForage(item) {
  const e = entry(item);
  if (e.level >= FORAGE_ITEM_MAX_LEVEL) return false;
  e.uses += 1;
  if (e.uses >= usesNeeded(e.level)) {
    e.uses = 0;
    e.level += 1;
    return true;
  }
  return false;
}

// ---------------------------------------------------------------- gathering

function startForageAt(loc, item) {
  const key = timerKey(loc, item);
  if (state.forageTimers[key]) return null;   // already running -- silent, same as every other pill
  const ms = forageSpeedMs(item);
  state.forageTimers[key] = { startedAt: Date.now(), readyAt: Date.now() + ms, item: item, loc: loc };
  save();
  return ms;
}

// Player tap -- always the player's own current location.
function startForage(item) {
  const ms = startForageAt(state.currentLocation, item);
  if (ms === null) return;
  const pill = pillFor("forage:" + item);
  if (pill) {
    const fill = pill.querySelector(".pill-fill");
    fill.style.transitionDuration = "0ms";
    fill.style.width = "0%";
    void fill.offsetWidth;
    setPillFill("forage:" + item, 100, ms);
  }
  refreshForaging(item);
}

// The Forager villager's own attempt (see workers.js's attemptRole()) --
// starts whichever of its homeLocation's items is idle, first match wins,
// same "try each in order, first one that actually starts" shape a tiered
// worker's own attemptRole() already follows for stationIds. Returns the
// real ms the started gather will take (so the caller can pace the next
// attempt off of it), or null if every item there is already running.
export function tryAutoForage(loc) {
  const items = itemsFor(loc);
  for (let i = 0; i < items.length; i++) {
    const ms = startForageAt(loc, items[i]);
    if (ms !== null) return ms;
  }
  return null;
}

// Resolves every gather (anywhere -- the player's own current location and
// every other location a working Forager might be in) whose deadline has
// passed, banking the item straight into the Bag and advancing that item's
// own mastery. Called every tick regardless of which screen is showing,
// same as every other settle*() in this game -- an offline gap catches up
// for free since this is a deadline, not a countdown. Returns the list of
// items completed (each { item, loc, leveledUp }) so main.js can redraw the
// Bag when it isn't empty.
export function settleForaging() {
  const done = [];
  Object.keys(state.forageTimers).forEach(function (key) {
    const t = state.forageTimers[key];
    if (!t || Date.now() < t.readyAt) return;
    gainItem(t.item, 1);
    delete state.forageTimers[key];
    // Only reset the pill's own fill bar if this is the currently-viewed
    // location's copy -- the same item name can be running at a *second*
    // location right now (the player at one, the Forager at another), and
    // pillFor()'s lookup has no way to tell those two pills apart beyond
    // "whichever one is actually on screen." refreshForaging()/main.js's
    // own tick loop already skip the redraw entirely for a completion at
    // any other location, same reasoning.
    if (t.loc === state.currentLocation) setPillFill("forage:" + t.item, 0, 0);
    const leveledUp = recordForage(t.item);
    const zoneLevels = gainZoneXp(FORAGE_ZONE_XP, t.loc);
    done.push({ item: t.item, loc: t.loc, leveledUp: leveledUp });
    if (zoneLevels) openZoneWheel(t.loc, zoneLevels);
  });
  if (done.length) { save(); updateSkillsNote(); }
  return done;
}

// -------------------------------------------------------------------- draw

function drawForageArt() {
  const loc = LOCATIONS[state.currentLocation];
  el("forage-where").textContent = "Foraging at " + ((loc && loc.name) || "Unknown");
  const art = loc && loc.forageArt;
  const container = el("forage-art");
  if (art) useSprite(container, "foraging/zones/" + art);
  else container.classList.remove("using-sprite");
}

// Rebuilds the whole pill list for the player's current location -- called
// on entering the screen and whenever the location actually changes
// (arriving from travel), same "full rebuild on arrival, light refresh
// otherwise" split every other field screen follows.
export function buildForaging() {
  const wrap = el("forage-list");
  wrap.replaceChildren();
  drawForageArt();

  itemsFor(state.currentLocation).forEach(function (item) {
    const node = document.createElement("button");
    node.className = "pill";
    node.dataset.item = "forage:" + item;
    node.innerHTML =
      '<div class="pill-fill"></div>' +
      '<div class="pill-level-fill"></div>' +
      '<span class="pill-level-badge">0</span>' +
      '<span class="pill-icon"><img class="sprite-img" alt="" draggable="false">' +
        '<svg class="sprite-fallback" viewBox="0 0 24 24" aria-hidden="true">' +
          '<circle cx="12" cy="12" r="7" /><path d="M12 5v14M5 12h14" />' +
        "</svg></span>" +
      '<span class="pill-body">' +
        '<span class="pill-name">' + item + "</span>" +
        '<span class="pill-sub">Tap to gather</span>' +
      "</span>" +
      '<span class="pill-count">0</span>';
    node.addEventListener("click", function () { startForage(item); });
    wrap.append(node);
  });

  applyForageSprites();
  refreshForaging();
}

// Never touches a running fill's own transition (setPillFill only does
// that from startForage()), so safe to call every tick while the screen is
// visible. `only` limits the redraw to one item's pill (a completed
// gather), same as refreshCraft(only)'s own shape.
export function refreshForaging(only) {
  itemsFor(state.currentLocation).forEach(function (item) {
    if (only && item !== only) return;
    const pill = pillFor("forage:" + item);
    if (!pill) return;
    const key = timerKey(state.currentLocation, item);
    const active = !!state.forageTimers[key];
    pill.classList.toggle("active", active);
    pill.querySelector(".pill-sub").textContent = active ? "Gathering…" : "Tap to gather";
    pill.querySelector(".pill-count").textContent = state.bag[item] || 0;

    const badge = pill.querySelector(".pill-level-badge");
    const levelFill = pill.querySelector(".pill-level-fill");
    if (badge && levelFill) {
      const p = forageItemProgress(item);
      badge.textContent = String(p.level);
      levelFill.style.width = (p.into / p.need * 100).toFixed(1) + "%";
    }
  });
}

export function applyForageSprites() {
  document.querySelectorAll("#screen-foraging .pill").forEach(function (pill) {
    const item = pill.dataset.item.slice("forage:".length);
    useSprite(pill.querySelector(".pill-icon"), "items/" + slug(item));
  });
}

el("back-foraging").addEventListener("click", function () { show("explore"); });
