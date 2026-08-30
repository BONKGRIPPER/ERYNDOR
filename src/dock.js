// ===================================================================== dock
//
// One persistent bar, built once and left alone -- only `current` and the
// occasional shake ever change after boot.

import { DOCK_IDS, PLACES, SCREEN_IDS } from "./data.js";
import { el } from "./dom.js";
import { show } from "./screens.js";

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
    label.textContent = place.name;
    btn.append(icon, label);
    btn.addEventListener("click", function () {
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

export function syncDock(name) {
  document.querySelectorAll(".dock-btn").forEach(function (btn) {
    btn.classList.toggle("current", btn.dataset.place === name);
  });
}
