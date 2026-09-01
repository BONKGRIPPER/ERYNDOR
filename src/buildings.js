// ================================================================ buildings
//
// The generic "pay once, unlock a station" concern -- separate from any one
// station's own screen (campfire.js is the first of those). Lives inside
// the Craft Bench screen now (2026-08-30), not the Home hub -- every built
// station used to get its own hub card there; this is all of them moved
// into one place instead, so Home stays just the core-loop cards (Farm/
// Forest/Mining/Craft/Combat) and Craft Bench becomes the one stop for
// "everything about making things," stations included. A card shows for
// every BUILDINGS entry that belongs at the player's current location
// (LOCATIONS[...].stations) -- a dashed "Build ___" prompt if it isn't
// built yet, a real card straight to its own screen once it is. One that
// doesn't belong here at all just isn't shown, same as it never showed on
// the wrong hub before this move.

import { BUILDINGS, LOCATIONS, PLACES } from "./data.js";
import { state, save } from "./state.js";
import { el } from "./dom.js";
import { show } from "./screens.js";
import { drawBag } from "./hub.js";
import { canAfford, buildCostNodes, spendCost } from "./costDisplay.js";

function belongsHere(id) {
  const loc = LOCATIONS[state.currentLocation];
  return !!(loc && loc.stations && loc.stations.indexOf(id) >= 0);
}

function placeFor(id) {
  return PLACES.filter(function (p) { return p.id === id; })[0];
}

export function drawStationCards() {
  const wrap = el("craft-stations");
  wrap.replaceChildren();

  Object.keys(BUILDINGS).forEach(function (id) {
    if (!belongsHere(id)) return;
    const building = BUILDINGS[id];

    if (!state.buildings[id]) {
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
      });
      wrap.append(card);
      return;
    }

    // Built -- a plain card straight to the station's own screen, same
    // shape a hub card always had, just living here now.
    const place = placeFor(id);
    const card = document.createElement("button");
    card.className = "card";

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
    note.textContent = place.note;
    body.append(name, note);

    const go = document.createElement("div");
    go.className = "card-go";
    go.textContent = "›";

    card.append(icon, body, go);
    card.addEventListener("click", function () { show(id); });
    wrap.append(card);
  });
}
