// ================================================================= explore
//
// The "where you are and what's here" screen -- one of the four permanent
// dock tabs (Explore / Bag / Journal / Map). It replaced the old
// activities-buried-in-Map-sheets flow and the Home quick-nav popup: every
// field activity for the current location (Forest, Mining, Combat, Fishing
// -- from LOCATION_ACTIVITIES) plus the local Market (when there is one)
// share one tile grid, the Return-to-Aerendell action when away, the
// Forest Road outpost, and the Freight panel all live here. Farm moved to
// the Home tab (2026-09-11) as a starting station, same as Craft Bench --
// it's no longer an Explore activity. The visual travel map is the
// separate Map tab; the crafting stations are the separate Home tab
// (Aerendell only).

import { LOCATIONS, LOCATION_ACTIVITIES, PLACES, HOME_LOCATION_ID } from "./data.js";
import { state } from "./state.js";
import { el } from "./dom.js";
import { show } from "./screens.js";
import { refreshFreight } from "./freightUI.js";
import { openOutpost } from "./caravanUI.js";
import { loggingNeedsAttention, miningNeedsAttention } from "./hub.js";
import {
  isTraveling, returnHome, shortestTravelMinutes, enterFieldMode,
} from "./travel.js";

const TYPE_LABEL = { city: "City", town: "Town", landmark: "Landmark", wilderness: "Wilderness" };

const ATTENTION = {
  logging: loggingNeedsAttention,
  mining: miningNeedsAttention,
};

function hasMarket(loc) {
  return !!loc && (loc.type === "city" || loc.type === "town");
}

// An unresolved fight (state.combat set, not yet won/lost/fled) reads as
// its own kind of attention -- "come back and finish this" rather than
// "something here needs you" -- so Combat's own tile gets a different
// label and the same highlight treatment, instead of leaving no trace at
// all that a fight is still sitting there mid-round (2026-09-11, "easier
// to go back into a fight" per the request). combat.js's own refreshCombat()
// already resumes straight into the arena the instant this screen shows,
// so the only piece missing was surfacing that there's something to
// resume in the first place.
function combatInProgress() {
  return !!(state.combat && !state.combat.over);
}

function activityButton(screenId) {
  const place = PLACES.filter(function (p) { return p.id === screenId; })[0];
  if (!place) return null;
  const btn = document.createElement("button");
  btn.className = "map-travel-btn explore-activity";
  const resuming = screenId === "combat" && combatInProgress();
  if (resuming || (ATTENTION[screenId] && ATTENTION[screenId]())) btn.classList.add("attention");
  btn.textContent = place.icon + "  " + (resuming ? "Continue Fight" : place.name);
  btn.addEventListener("click", function () {
    enterFieldMode();
    show(screenId);
  });
  return btn;
}

export function buildExplore() {
  const wrap = el("explore-list");
  wrap.replaceChildren();

  const loc = LOCATIONS[state.currentLocation] || LOCATIONS[HOME_LOCATION_ID];
  const atHome = state.currentLocation === HOME_LOCATION_ID;

  const where = document.createElement("div");
  where.className = "explore-where";
  where.textContent = (isTraveling() && state.travel)
    ? "On the road to " + ((LOCATIONS[state.travel.to] || {}).name || "your destination")
    : "You are at " + loc.name + " · " + (TYPE_LABEL[loc.type] || loc.type);
  wrap.append(where);

  // Return home, front and centre when away and able to leave.
  if (!atHome && !isTraveling()) {
    const minutes = shortestTravelMinutes(state.currentLocation, HOME_LOCATION_ID);
    const back = document.createElement("button");
    back.className = "map-travel-btn map-return-btn";
    back.textContent = isFinite(minutes) && minutes > 0
      ? "Return to Aerendell (" + minutes + " min)"
      : "Return to Aerendell";
    back.addEventListener("click", function () {
      const result = returnHome();
      if (result && result.arrived) show("home");
      else { show("map"); }
    });
    wrap.append(back);
  }

  if (isTraveling()) {
    const note = document.createElement("p");
    note.className = "field-sub";
    note.textContent = "Open Map to watch the journey.";
    wrap.append(note);
  }

  // Market shares the same tile grid as the location's own field activities
  // (2026-09-11) -- same .explore-activity size/shape, not a separate
  // full-width row -- since trading is just as much "something to do here"
  // as Forest/Mining/Combat/Fishing are.
  const activities = LOCATION_ACTIVITIES[state.currentLocation] || [];
  const showMarket = hasMarket(loc);
  if (activities.length || showMarket) {
    const label = document.createElement("div");
    label.className = "market-section-label";
    label.textContent = "Activities here";
    wrap.append(label);
    const grid = document.createElement("div");
    grid.className = "explore-grid";
    activities.forEach(function (id) {
      const btn = activityButton(id);
      if (btn) grid.append(btn);
    });
    if (showMarket) {
      const market = document.createElement("button");
      market.className = "map-travel-btn explore-activity";
      market.textContent = "\u{2696}\u{FE0F}  Market";
      market.addEventListener("click", function () { show("market"); });
      grid.append(market);
    }
    wrap.append(grid);
  }

  if (state.currentLocation === "forestRoad") {
    const label = document.createElement("div");
    label.className = "market-section-label";
    label.textContent = "Logistics";
    wrap.append(label);
    const outpost = document.createElement("button");
    outpost.className = "map-travel-btn";
    outpost.textContent = "\u{1F4E6}  Outpost & cart";
    outpost.addEventListener("click", openOutpost);
    wrap.append(outpost);
  }

  refreshFreight();
}
