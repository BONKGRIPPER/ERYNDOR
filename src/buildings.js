// ================================================================ buildings
//
// The generic "pay once, unlock a station" concern -- separate from any one
// station's own screen (campfire.js is the first of those). A build prompt
// shows for every BUILDINGS entry that isn't built yet; once it is, this
// prompt disappears and the normal hub card for it (gated by the same
// state.buildings flag, see hub.js's drawMenu) takes over.

import { BUILDINGS } from "./data.js";
import { state, save } from "./state.js";
import { el } from "./dom.js";
import { drawMenu, drawBag } from "./hub.js";
import { canAfford, buildCostNodes, spendCost } from "./costDisplay.js";

export function drawBuildPrompts() {
  const wrap = el("build-prompts");
  wrap.replaceChildren();

  Object.keys(BUILDINGS).forEach(function (id) {
    if (state.buildings[id]) return;
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
      drawBuildPrompts();
      drawMenu();
    });
    wrap.append(card);
  });
}
