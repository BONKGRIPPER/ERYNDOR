// ===================================================================== hub
//
// Safe circular import: stations.js imports drawBag/updateSkillsNote from
// here, and this file imports costFor back from stations.js. Works because
// neither side touches the other's binding at module-eval time -- both are
// only ever called from inside a function, by which point both modules
// have finished loading. Same pattern screens.js documents for its own set
// of circular imports.

import {
  PLACES, SCREEN_IDS, TINTS, BUILDINGS, CROPS, TREES, RECIPES,
  FUELS, COOKABLES, STATIONS, LOCATIONS,
} from "./data.js";
import { state, save } from "./state.js";
import { season, dayOfSeason, yearNumber, isNight } from "./time.js";
import { el } from "./dom.js";
import { show } from "./screens.js";
import { drawSkills } from "./skillsScreen.js";
import { costFor } from "./stations.js";
import { canAfford } from "./costDisplay.js";

// Fishing isn't a BUILDINGS entry -- there's no structure to build, just
// water to fish -- so it needs its own location check. Same underlying
// rule as forage's own canForageHere() (src/forage.js): a location either
// has a pool assigned or it doesn't yet.
function fishingHere() {
  const loc = LOCATIONS[state.currentLocation];
  return !!(loc && loc.fishing);
}

// A BUILDINGS-backed place (Campfire, Spinning Wheel, Sawmill, Stone
// Cutter, Tanning Station, Township, Armor Bench) moves onto Home the
// instant it's actually built (2026-08-31) -- joining Farm/Forest/Mining/
// etc. as a real destination, same generic click-through drawMenu() below
// already gives every other card. Unbuilt, it's still a "Build ___" prompt
// inside the Craft Bench only (src/buildings.js's drawStationCards(),
// which stops rendering a card for it here the same moment it starts
// showing on Home -- moved, not duplicated). Also gated on actually
// belonging at the player's current location (LOCATIONS[...].stations),
// same rule buildings.js's own belongsHere() uses, so a station only ever
// shows on the one Home it was built for. Fishing has no build step, just
// its own location check (fishingHere() above).
function visiblePlaces() {
  return PLACES.filter(function (place) {
    if (!place.hub) return false;
    if (place.id in BUILDINGS) {
      if (!state.buildings[place.id]) return false;
      const loc = LOCATIONS[state.currentLocation];
      return !!(loc && loc.stations && loc.stations.indexOf(place.id) >= 0);
    }
    if (place.id === "fishing") return fishingHere();
    return true;
  });
}

// Applies the player's own custom order (press-and-hold on the home
// screen, see below) on top of visiblePlaces()'s normal PLACES order --
// any id state.hubOrder doesn't recognize yet (a station unlocked since
// the last time the player reordered) is appended at the end in PLACES'
// own order, rather than silently vanishing from the grid.
function orderedPlaces() {
  const visible = visiblePlaces();
  if (!state.hubOrder) return visible;
  const byId = {};
  visible.forEach(function (place) { byId[place.id] = place; });
  const ordered = [];
  state.hubOrder.forEach(function (id) {
    if (byId[id]) { ordered.push(byId[id]); delete byId[id]; }
  });
  visible.forEach(function (place) {
    if (byId[place.id]) ordered.push(place);
  });
  return ordered;
}

export function drawMenu() {
  const menu = el("menu");
  menu.replaceChildren();

  orderedPlaces().forEach(function (place, i) {
    const card = document.createElement("button");
    card.className = "card" + (place.ready ? "" : " locked");
    card.id = "card-" + place.id;
    card.disabled = !place.ready;
    card.style.setProperty("--wiggle-i", String(i % 4));

    const icon = document.createElement("div");
    icon.className = "card-icon";
    icon.textContent = place.icon;

    const body = document.createElement("div");
    body.className = "card-body";
    const name = document.createElement("div");
    name.className = "card-name";
    name.textContent = place.name;
    const note = document.createElement("div");
    note.className = "card-note";
    note.id = "note-" + place.id;
    note.textContent = place.ready ? place.note : "Locked";
    body.append(name, note);

    const go = document.createElement("div");
    go.className = "card-go";
    go.textContent = place.ready ? "›" : "·";

    card.append(icon, body, go);
    card.addEventListener("click", function () {
      if (reordering) return;   // a tap right after a drag shouldn't also navigate
      if (SCREEN_IDS.indexOf(place.id) >= 0) { show(place.id); return; }
      // Screens that don't exist yet say so rather than pretending.
      const was = place.note;
      note.textContent = "Not built yet";
      setTimeout(function () { note.textContent = was; }, 1400);
    });
    attachReorderPress(card, place.id);
    menu.append(card);
  });
}

// ============================================================== reordering
//
// Press and hold any hub card to pick the whole grid up for reordering --
// same "long-press enters a mode, tap Done to leave it" shape a phone's own
// home screen uses, rather than a separate settings screen or drag handles
// cluttering every card permanently. The dragged card follows the pointer
// via a CSS transform (so nothing else in the grid has to reflow mid-drag);
// the actual reorder only happens once, on release, against whichever
// other card the pointer was last over.

const LONG_PRESS_MS = 500;
const MOVE_CANCEL_PX = 10;

let reordering = false;
let pressTimer = 0;
let pressStartX = 0;
let pressStartY = 0;

function enterReorderMode() {
  if (reordering) return;
  reordering = true;
  el("menu").classList.add("reordering");
  el("reorder-bar").classList.remove("hidden");
}

function exitReorderMode() {
  reordering = false;
  el("menu").classList.remove("reordering");
  el("reorder-bar").classList.add("hidden");
}

// Persists the current on-screen card order as the player's new hubOrder,
// then rebuilds the grid clean -- simplest way to guarantee the DOM,
// state.hubOrder, and drawMenu()'s next render all agree.
function commitOrderFromDOM() {
  state.hubOrder = Array.prototype.map.call(
    el("menu").querySelectorAll(".card"),
    function (card) { return card.id.slice("card-".length); }
  );
  save();
  drawMenu();
}

function attachReorderPress(card, placeId) {
  card.addEventListener("pointerdown", function (e) {
    if (e.button !== undefined && e.button !== 0) return;   // left click / primary touch only
    pressStartX = e.clientX;
    pressStartY = e.clientY;

    const moveCancel = function (ev) {
      if (Math.abs(ev.clientX - pressStartX) > MOVE_CANCEL_PX || Math.abs(ev.clientY - pressStartY) > MOVE_CANCEL_PX) {
        clearTimeout(pressTimer);
        document.removeEventListener("pointermove", moveCancel);
      }
    };
    document.addEventListener("pointermove", moveCancel);

    pressTimer = setTimeout(function () {
      document.removeEventListener("pointermove", moveCancel);
      enterReorderMode();
      beginDrag(card, e.pointerId);
    }, LONG_PRESS_MS);

    const clearPress = function () {
      clearTimeout(pressTimer);
      document.removeEventListener("pointermove", moveCancel);
      document.removeEventListener("pointerup", clearPress);
      document.removeEventListener("pointercancel", clearPress);
    };
    document.addEventListener("pointerup", clearPress);
    document.addEventListener("pointercancel", clearPress);
  });

  // Once already reordering, any further press on a card picks it straight
  // up -- no need to hold it down again just to move a second card.
  card.addEventListener("pointerdown", function (e) {
    if (!reordering || card.classList.contains("dragging")) return;
    beginDrag(card, e.pointerId);
  });
}

function beginDrag(card, pointerId) {
  card.classList.add("dragging");
  const startX = pressStartX, startY = pressStartY;
  let target = null;

  function onMove(e) {
    if (e.pointerId !== pointerId) return;
    card.style.transform = "translate(" + (e.clientX - startX) + "px, " + (e.clientY - startY) + "px) scale(1.05)";

    const prevTarget = target;
    target = null;
    const siblings = el("menu").querySelectorAll(".card");
    for (let i = 0; i < siblings.length; i++) {
      const sib = siblings[i];
      if (sib === card) continue;
      const r = sib.getBoundingClientRect();
      if (e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom) {
        target = sib;
        break;
      }
    }
    if (prevTarget && prevTarget !== target) prevTarget.classList.remove("drop-target");
    if (target) target.classList.add("drop-target");
  }

  function onUp(e) {
    if (e.pointerId !== pointerId) return;
    document.removeEventListener("pointermove", onMove);
    document.removeEventListener("pointerup", onUp);
    document.removeEventListener("pointercancel", onUp);

    card.style.transform = "";
    card.classList.remove("dragging");
    if (target) {
      target.classList.remove("drop-target");
      target.parentNode.insertBefore(card, target);
      commitOrderFromDOM();
    }
  }

  document.addEventListener("pointermove", onMove);
  document.addEventListener("pointerup", onUp);
  document.addEventListener("pointercancel", onUp);
}

el("reorder-done").addEventListener("click", exitReorderMode);

// A plot needs attention if it's ripe (ready to harvest), thirsty (planted
// but not watered), or empty while a matching seed sits in the bag (ready
// to plant) -- the same three actionable states Field/Logging's own
// canUse() already recognizes, just asked as "is there at least one"
// instead of "which tool applies here".
function plotsNeedAttention(plots, crops) {
  const hasSeed = Object.keys(crops).some(function (id) {
    return (state.bag[crops[id].seed] || 0) > 0;
  });
  return plots.some(function (plot) {
    if (!plot.crop) return hasSeed;
    if (plot.stage >= crops[plot.crop].waters) return true;   // ripe
    return plot.readyAt === null;                              // thirsty
  });
}

// Same idea as watering/chopping, but a craft also has a cost -- an idle recipe only
// counts if the bag can actually afford to start it.
function craftNeedsAttention() {
  return Object.keys(RECIPES).some(function (id) {
    if (state.crafting[id]) return false;
    return canAfford(RECIPES[id].cost);
  });
}

// The campfire queues rather than running one slot -- so "something new
// could be cooked" means the bag still holds spare fuel *and* a spare
// cookable, since queuing either one spends it out of the bag immediately
// (see campfire.js). Already-queued material naturally stops counting here.
function campfireNeedsAttention() {
  const hasFuel = FUELS.some(function (f) { return (state.bag[f] || 0) > 0; });
  const hasCookable = Object.keys(COOKABLES).some(function (c) { return (state.bag[c] || 0) > 0; });
  return hasFuel && hasCookable;
}

// A conversion station (Spinning Wheel, Sawmill, Stone Cutter) is idle and
// affordable -- same shape as craftNeedsAttention(), just reading STATIONS
// instead of RECIPES. costFor() (from stations.js) and canAfford() (from
// costDisplay.js) are the same generalized-cost helpers startStation()
// itself uses, so a multi-item recipe like the Basalt Block's is read
// identically here.
function stationNeedsAttention(id) {
  if (state.stations[id]) return false;
  return canAfford(costFor(STATIONS[id]));
}

// Mining costs nothing to start and every tap is instant -- the only thing
// that can make it not-actionable is the post-cave-in/post-surface
// cooldown, so that's the whole check.
function miningNeedsAttention() {
  return Date.now() >= state.mineCooldownUntil;
}

// Toggles the green "something to do here" ring on each hub card. Cheap
// enough to run every tick regardless of which screen is showing, so the
// hub is always current the moment the player comes back to it.
export function updateHubAttention() {
  const marks = {
    field: plotsNeedAttention(state.plots, CROPS),
    logging: plotsNeedAttention(state.logPlots, TREES),
    mining: miningNeedsAttention(),
    craft: craftNeedsAttention(),
    campfire: campfireNeedsAttention(),
  };
  Object.keys(STATIONS).forEach(function (id) { marks[id] = stationNeedsAttention(id); });
  Object.keys(marks).forEach(function (id) {
    const card = el("card-" + id);
    if (card) card.classList.toggle("attention", marks[id]);
  });
}

// The hub's real-time readout -- one real week per season. Day/night moved
// to its own corner badge (see updateDaytimeBadge()) since it's a device-
// clock reading, not a season-calendar one; this banner is calendar only.
export function updateSeasonNote() {
  const note = el("note-season");
  if (!note) return;
  const s = season(state.startedAt);
  note.textContent = s.icon + " " + s.name + " · Day " + dayOfSeason(state.startedAt) +
    " · Year " + yearNumber(state.startedAt);
}

// Top-left corner badge: the player's actual device clock plus a sun/moon
// standing in for isNight() -- the same read growthMultiplier() already
// uses, just shown honestly instead of only affecting numbers behind the
// scenes.
export function updateDaytimeBadge() {
  const badge = el("daytime-badge");
  if (!badge) return;
  const now = new Date();
  const time = now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  badge.textContent = (isNight() ? "\u{1F319}" : "\u{2600}\u{FE0F}") + " " + time;
}

// Every XP-granting system calls this after adding XP -- kept as the one
// name every one of them already imports (see field.js, logging.js,
// mining.js, forage.js, stations.js) rather than making each of them import
// skillsScreen.js directly. The full breakdown now lives on its own screen
// (src/skillsScreen.js) instead of a one-line hub summary, so this just
// keeps that screen's bars current on the ticks it's actually visible for.
export function updateSkillsNote() {
  if (!el("screen-skills").classList.contains("hidden")) drawSkills();
}

// Top-right corner badge -- just the number and a coin, legible from the
// hub without opening the Market. Kept the same exported name even though
// it no longer targets a footer note, since every caller just wants "the
// wallet display updated" and doesn't care which element that is.
export function updateWalletNote() {
  const badge = el("wallet-badge");
  if (!badge) return;
  badge.textContent = "\u{1FA99} " + state.shards.toLocaleString();
}

// The home hub's old "everything in the bag" chip strip is gone -- with a
// real Inventory screen (and now a real Skills screen) it was just a second
// copy of the same list. This shows the last 5 distinct items gainItem()
// recorded instead (state.recentItems, most-recent-first) -- kept as the
// same exported name every producer already imports and calls after a gain,
// so none of those call sites needed to change.
export function drawBag() {
  const items = el("recent-items");
  items.replaceChildren();

  if (state.recentItems.length === 0) {
    const empty = document.createElement("span");
    empty.className = "chip empty";
    empty.textContent = "Nothing yet";
    items.append(empty);
    return;
  }

  state.recentItems.forEach(function (name) {
    const chip = document.createElement("span");
    chip.className = "chip";
    const dot = document.createElement("span");
    dot.className = "dot";
    dot.style.background = TINTS[name] || "#9a8f7d";
    chip.append(dot, name + " " + (state.bag[name] || 0));
    items.append(chip);
  });
}
