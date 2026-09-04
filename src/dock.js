// ===================================================================== dock
//
// One persistent bar, built once and left alone -- only `current` and the
// occasional shake ever change after boot.
//
// Home's own button (2026-09-04) no longer jumps straight to the Home
// screen -- it opens a small quick-nav popup instead (openStationQuickNav()
// below), every place the real Home screen would show (Farm, Forest,
// Mining, Combat, every built station), so the player can jump anywhere
// from anywhere without a full trip through Home in between every time.
// Home itself is still one tap away -- it's the first row in that same
// popup, not removed, just no longer the dock button's own default action.

import { DOCK_IDS, PLACES, SCREEN_IDS, LOCATIONS } from "./data.js";
import { state } from "./state.js";
import { isTownMarketOpen } from "./time.js";
import { el } from "./dom.js";
import { show } from "./screens.js";
import { openSheet, closeSheet } from "./sheet.js";
import { visiblePlaces } from "./hub.js";

export function buildDock() {
  const dock = el("dock");
  dock.replaceChildren();
  DOCK_IDS.forEach(function (id) {
    const place = PLACES.filter(function (p) { return p.id === id; })[0];
    const btn = document.createElement("button");
    btn.className = "dock-btn";
    btn.dataset.place = id;
    const icon = document.createElement("span");
    icon.className = "dock-icon";
    icon.textContent = place.icon;
    const label = document.createElement("span");
    label.className = "dock-label";
    label.textContent = place.name;
    btn.append(icon, label);
    btn.addEventListener("click", function () {
      if (id === "home") { openStationQuickNav(); return; }
      if (SCREEN_IDS.indexOf(id) >= 0) { show(id); return; }
      // Anything still missing a #screen-<id> (none currently) shakes the
      // same quiet way the hub cards do, rather than navigating nowhere.
      btn.classList.remove("shake");
      void btn.offsetWidth;
      btn.classList.add("shake");
    });
    dock.append(btn);
  });
}

// Swaps the dock's own Market label to "Closed" (and dims the icon, same
// language .dock-btn.locked already uses elsewhere) whenever the player's
// *current* location is a town and it's outside market hours -- a city's
// market never closes, and a landmark/wilderness has no market to close
// in the first place, so this is a no-op everywhere else. Called every
// tick (main.js), same as the other small always-visible badges
// (updateSeasonNote()/updateDaytimeBadge() in hub.js) -- cheap enough,
// and the only way this can change without the player tapping anything
// is the clock itself crossing an hour boundary.
export function refreshMarketDockBadge() {
  const btn = document.querySelector('.dock-btn[data-place="market"]');
  if (!btn) return;
  const loc = LOCATIONS[state.currentLocation];
  const closed = !!loc && loc.type === "town" && !isTownMarketOpen();
  btn.classList.toggle("closed", closed);
  const marketPlace = PLACES.filter(function (p) { return p.id === "market"; })[0];
  btn.querySelector(".dock-label").textContent = closed ? "Closed" : marketPlace.name;
}

export function syncDock(name) {
  document.querySelectorAll(".dock-btn").forEach(function (btn) {
    btn.classList.toggle("current", btn.dataset.place === name);
  });
}

// ------------------------------------------------------------- quick nav

// Every hub-visible place -- Farm/Forest/Mining/Combat, every built
// station, Craft Bench -- not just the BUILDINGS-backed stations this
// started with (2026-09-04, widened per request to cover the whole Home
// screen, not just crafting). Reuses hub.js's own visiblePlaces() so this
// list is always exactly what's actually built and belongs at the
// player's current location, same as the real hub cards -- PLACES' own
// "home" entry has hub: false, so it never shows up twice alongside the
// explicit Home row below.
function quickNavPlaces() {
  return visiblePlaces();
}

function openStationQuickNav() {
  const body = el("sheet-body");
  body.replaceChildren();

  const grid = document.createElement("div");
  grid.className = "quicknav-grid";

  function navRow(id, icon, name) {
    const btn = document.createElement("button");
    btn.className = "quicknav-btn";
    const iconEl = document.createElement("span");
    iconEl.className = "quicknav-icon";
    iconEl.textContent = icon;
    const nameEl = document.createElement("span");
    nameEl.className = "quicknav-name";
    nameEl.textContent = name;
    btn.append(iconEl, nameEl);
    btn.addEventListener("click", function () {
      closeSheet();
      show(id);
    });
    grid.append(btn);
  }

  // Home itself, first -- still one tap away, just not the dock button's
  // own default action any more.
  const home = PLACES.filter(function (p) { return p.id === "home"; })[0];
  navRow("home", home.icon, home.name);

  quickNavPlaces().forEach(function (place) { navRow(place.id, place.icon, place.name); });

  body.append(grid);
  openSheet("Jump to");
}
