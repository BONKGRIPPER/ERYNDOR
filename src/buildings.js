// ================================================================ buildings
//
// The generic "pay once, unlock a station" concern -- separate from any one
// station's own screen (campfire.js is the first of those). Lives inside
// the Craft Bench screen (2026-08-30) as a dashed "Build ___" prompt for
// every BUILDINGS entry that belongs at the player's current location
// (LOCATIONS[...].stations) and isn't built yet. The moment it *is* built
// (2026-08-31), its card moves onto Home instead -- joining the other
// stations there, same as it belonged from the start -- rather than also
// sticking around here; see hub.js's visiblePlaces() for the other half of
// that move. One that doesn't belong at this location at all just isn't
// shown, same as it never showed on the wrong Craft Bench before.

import { BUILDINGS, LOCATIONS } from "./data.js";
import { state, save } from "./state.js";
import { el } from "./dom.js";
import { drawBag, drawMenu } from "./hub.js";
import { canAfford, buildCostNodes, spendCost } from "./costDisplay.js";

function belongsHere(id) {
  const loc = LOCATIONS[state.currentLocation];
  return !!(loc && loc.stations && loc.stations.indexOf(id) >= 0);
}

export function drawStationCards() {
  const wrap = el("craft-stations");
  wrap.replaceChildren();

  Object.keys(BUILDINGS).forEach(function (id) {
    if (!belongsHere(id)) return;
    if (state.buildings[id]) return;   // built -- lives on Home now, not here
    const building = BUILDINGS[id];

    const affordable = canAfford(building.cost);
    const card = document.createElement("button");
    card.className = "card buildable" + (affordable ? " affordable-ready" : "");

    const icon = document.createElement("div");
    icon.className = "card-icon";
    icon.textContent = "🔨";

    const body = document.createElement("div");
    body.className = "card-body";
    const name = document.createElement("div");
    name.className = "card-name";
    name.textContent = "Build " + building.name;
    const note = document.createElement("div");
    note.className = "card-note";
    note.replaceChildren.apply(note, buildCostNodes(building.cost));
    body.append(name, note);

    card.append(icon, body);
    card.addEventListener("click", function () {
      if (!canAfford(building.cost)) {
        card.classList.remove("shake");
        void card.offsetWidth;
        card.classList.add("shake");
        return;
      }
      spendCost(building.cost);
      state.buildings[id] = true;
      save();
      drawBag();
      drawStationCards();
      // The card that just disappeared from here needs to appear on Home
      // in the same beat -- without this it'd only show up the next time
      // drawMenu() happens to run (e.g. after navigating away and back).
      drawMenu();
    });
    wrap.append(card);
  });
}
