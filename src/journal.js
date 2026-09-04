// ================================================================ journal
//
// The dock's Journal tab (internal id is still "skills" -- SCREEN_IDS, the
// dock, and every other reference keep that name; only the on-screen title
// changed, same "display name changed, the id underneath didn't" rule
// Milling -> Woodcutting already established) now holds two pages: Skills
// (untouched, see skillsScreen.js -- this file only decides which of the
// two is visible) and Collection, an Animal-Crossing-style completionist
// log of every item that exists in the game.
//
// Collection groups every item (TINTS/CATEGORIES in data.js -- already
// the game's one canonical item list, kept in lockstep with each other)
// by category, showing a real sprite for anything state.discoveredItems
// has ever recorded and a "?" for anything it hasn't. Nothing here grants
// a reward for filling a section out yet -- that's a deliberate follow-up,
// this is just the log itself.

import { TINTS, CATEGORIES } from "./data.js";
import { state } from "./state.js";
import { useSprite, slug } from "./sprites.js";
import { el } from "./dom.js";
import { buildSkills } from "./skillsScreen.js";

let view = "skills";   // "skills" | "collection"

// Order and display name for each CATEGORIES value -- roughly the order a
// player actually encounters these skills/systems in, cooking and
// crafting tacked on at the end since neither is a leveled skill.
const CATEGORY_META = [
  ["farming", "Farming"], ["logging", "Logging"], ["foraging", "Foraging"],
  ["mining", "Mining"], ["combat", "Combat"], ["sowing", "Sowing"],
  ["milling", "Woodcutting"], ["stonecutting", "Stonecutting"], ["tanning", "Tanning"],
  ["crafting", "Crafting"], ["cooking", "Cooking"],
];

function buildCollection() {
  const wrap = el("collection-list");
  wrap.replaceChildren();

  CATEGORY_META.forEach(function (pair) {
    const key = pair[0], label = pair[1];
    const names = Object.keys(TINTS).filter(function (n) { return CATEGORIES[n] === key; });
    if (names.length === 0) return;
    names.sort();

    const found = names.filter(function (n) { return state.discoveredItems[n]; }).length;

    const section = document.createElement("div");
    section.className = "collection-section";
    const title = document.createElement("div");
    title.className = "collection-section-title";
    title.textContent = label + " — " + found + "/" + names.length;
    section.append(title);

    const grid = document.createElement("div");
    grid.className = "collection-grid";

    names.forEach(function (name) {
      const discovered = !!state.discoveredItems[name];
      const card = document.createElement("div");
      card.className = "inv-card collection-card" + (discovered ? "" : " undiscovered");

      const label_ = document.createElement("div");
      label_.className = "inv-name";

      if (discovered) {
        const img = document.createElement("img");
        img.className = "sprite-img";
        img.alt = "";
        img.draggable = false;
        const fallback = document.createElement("div");
        fallback.className = "sprite-fallback";
        fallback.style.background = TINTS[name] || "#9a8f7d";
        label_.textContent = name;
        card.append(img, fallback, label_);
        useSprite(card, "items/" + slug(name));
      } else {
        const mystery = document.createElement("div");
        mystery.className = "collection-mystery";
        mystery.textContent = "?";
        label_.textContent = "???";
        card.append(mystery, label_);
      }
      grid.append(card);
    });

    section.append(grid);
    wrap.append(section);
  });
}

function setView(next) {
  view = next;
  el("journal-view-skills").classList.toggle("active", view === "skills");
  el("journal-view-collection").classList.toggle("active", view === "collection");
  el("skills-page").classList.toggle("hidden", view !== "skills");
  el("collection-page").classList.toggle("hidden", view !== "collection");
  if (view === "skills") buildSkills();
  else buildCollection();
}

// Rebuilt fresh every time the Journal screen opens (screens.js's show()),
// same "cheap enough to just redo it" reasoning Skills/Inventory already
// use -- so a newly-discovered item shows up the moment the player checks.
export function buildJournal() {
  setView(view);
}

el("journal-view-skills").addEventListener("click", function () { setView("skills"); });
el("journal-view-collection").addEventListener("click", function () { setView("collection"); });
