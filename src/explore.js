// ================================================================= explore
//
// The "where you are and what's here" screen -- one of the four permanent
// dock tabs (Explore / Bag / Journal / Map). It replaced the old
// activities-buried-in-Map-sheets flow and the Home quick-nav popup: every
// field activity for the current location (Farm, Forest, Mining, Combat,
// Fishing -- from LOCATION_ACTIVITIES), the local Market when there is one,
// the Return-to-Aerendell action when away, the Forest Road outpost, and
// the Freight panel all live here. The visual travel map is the separate
// Map tab; the crafting stations are the separate Home tab (Aerendell only).

import { LOCATIONS, LOCATION_ACTIVITIES, PLACES, HOME_LOCATION_ID } from "./data.js";
import { state } from "./state.js";
import { el } from "./dom.js";
import { show } from "./screens.js";
import { refreshFreight } from "./freightUI.js";
import { openOutpost } from "./caravanUI.js";
import { fieldNeedsAttention, loggingNeedsAttention, miningNeedsAttention } from "./hub.js";
import {
  isTraveling, returnHome, shortestTravelMinutes, enterFieldMode,
} from "./travel.js";

const TYPE_LABEL = { city: "City", town: "Town", landmark: "Landmark", wilderness: "Wilderness" };

const ATTENTION = {
  field: fieldNeedsAttention,
  logging: loggingNeedsAttention,
  mining: miningNeedsAttention,
};

function hasMarket(loc) {
  return !!loc && (loc.type === "city" || loc.type === "town");
}

function activityButton(screenId) {
  const place = PLACES.filter(function (p) { return p.id === screenId; })[0];
  if (!place) return null;
  const btn = document.createElement("button");
  btn.className = "map-travel-btn explore-activity";
  if (ATTENTION[screenId] && ATTENTION[screenId]()) btn.classList.add("attention");
  btn.textContent = place.icon + "  " + place.name;
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

  const activities = LOCATION_ACTIVITIES[state.currentLocation] || [];
  if (activities.length) {
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
    wrap.append(grid);
  }

  if (hasMarket(loc)) {
    const label = document.createElement("div");
    label.className = "market-section-label";
    label.textContent = "Trade";
    wrap.append(label);
    const market = document.createElement("button");
    market.className = "map-travel-btn";
    market.textContent = "\u{2696}\u{FE0F}  Market";
    market.addEventListener("click", function () { show("market"); });
    wrap.append(market);
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

  if (loc.forage) {
    const note = document.createElement("p");
    note.className = "field-sub";
    note.textContent = "Foraging is available from the Forage button above the dock.";
    wrap.append(note);
  }

  refreshFreight();
}
