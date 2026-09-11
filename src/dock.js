// ===================================================================== dock
//
// One persistent bar of four tabs -- Explore, Bag, Journal, Map -- plus a
// fifth, Home, that only appears while the player is actually standing at
// Aerendell (refreshDock() below). Home opens the crafting-station grid;
// Explore is the "what's here" screen (field activities + market for the
// current location); Map is the travel map. Built once at boot; after that
// only `.current`, the Home button's hidden flag, and the occasional shake
// ever change.

import { DOCK_IDS, PLACES, SCREEN_IDS, HOME_LOCATION_ID } from "./data.js";
import { state } from "./state.js";
import { el } from "./dom.js";
import { show } from "./screens.js";
import { isTraveling, enterHomeMode } from "./travel.js";
import { useSprite } from "./sprites.js";

export function buildDock() {
  const dock = el("dock");
  dock.replaceChildren();
  DOCK_IDS.forEach(function (id) {
    const place = PLACES.filter(function (p) { return p.id === id; })[0];
    const btn = document.createElement("button");
    btn.className = "dock-btn";
    btn.dataset.place = id;
    btn.setAttribute("aria-label", place.name);
    btn.title = place.name;
    const icon = document.createElement("span");
    icon.className = "dock-icon";
    const image = document.createElement("img");
    image.className = "sprite-img";
    image.alt = "";
    image.draggable = false;
    const fallback = document.createElement("span");
    fallback.className = "sprite-fallback";
    fallback.textContent = place.icon;
    icon.append(image, fallback);
    useSprite(icon, "dock/" + id);
    btn.append(icon);
    btn.addEventListener("click", function () {
      if (id === "home") {
        // Home is only offered at Aerendell (refreshDock keeps it hidden
        // otherwise); enterHomeMode() flips into the production context so
        // screens.js's show() lets the workshop grid through.
        enterHomeMode();
        show("home");
        return;
      }
      if (SCREEN_IDS.indexOf(id) >= 0) { show(id); return; }
      btn.classList.remove("shake");
      void btn.offsetWidth;
      btn.classList.add("shake");
    });
    dock.append(btn);
  });
  refreshDock();
}

// The Home tab is present only while the player is at Aerendell and not
// mid-trip. Called from syncDock() (every navigation) and from main.js's
// tick loop (so an arriving trip reveals it without a tap). Cheap -- one
// hidden flag.
export function refreshDock() {
  const btn = document.querySelector('.dock-btn[data-place="home"]');
  if (!btn) return;
  btn.hidden = !(state.currentLocation === HOME_LOCATION_ID && !isTraveling());
}

export function syncDock(name) {
  refreshDock();
  document.querySelectorAll(".dock-btn").forEach(function (btn) {
    btn.classList.toggle("current", btn.dataset.place === name);
  });
}
