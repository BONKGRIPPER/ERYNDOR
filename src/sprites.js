// ================================================================ sprites
//
// Drop image files in below and they show up with no code changes. Anything
// missing falls back to the built-in vector placeholder, so the game never
// shows a broken image -- see assets/sprites/README.md for exact filenames.
//
//   assets/sprites/soil/tilled.png          the plot background, all plots
//   assets/sprites/tools/seeds.png          the three tool icons
//   assets/sprites/tools/fertilizer.png
//   assets/sprites/tools/water.png
//   assets/sprites/crops/<cropId>/<n>.png   growth frame n, 0..crop.waters
//                                            (n == waters is the ripe frame)
//   assets/sprites/trees/<treeId>/<n>.png    same idea, for Logging
//   assets/sprites/forage/basket.png         the one persistent forage button
//   assets/sprites/mining/pickaxe.png        fallback Dig icon when no tool is equipped
//   assets/sprites/mining/surface.png        the Surface & Bank action icon
//   assets/sprites/mining/zones/<slug>.png   the Mining screen's big art banner,
//                                             one per MINE_ZONES entry -- square
//                                             art still scales best even though
//                                             this one renders wide, since
//                                             object-fit: cover crops it
//   assets/sprites/craft/<recipeId>.png      one icon per recipe pill
//   assets/sprites/stations/<stationId>.png  one icon per conversion station
//   assets/sprites/items/<slug>.png          one icon per bag item, for the
//                                             Inventory screen -- independent
//                                             of however the item was gotten
//   assets/sprites/skills/<skillId>.png      one icon per skill, meant to be
//                                             reused anywhere a skill needs
//                                             representing, not just the
//                                             Skills screen
//   assets/sprites/dock/<screenId>.png       the five persistent navigation
//                                             icons along the bottom edge
//
// Files are looked for once at startup. Square art scales best -- images are
// fit with `object-fit: contain` so nothing gets stretched.

import { CROPS, TREES, RECIPES, STATIONS, TINTS, SKILLS, MINE_ZONES, DOCK_IDS } from "./data.js";

export const SPRITE_BASE = "assets/sprites/";

// "Red Berries Seeds" -> "red-berries-seeds", so a bag item name maps to a
// predictable file name without a second id having to be invented for it.
export function slug(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function allSpriteKeys() {
  const keys = [
    "soil/tilled", "tools/seeds", "tools/fertilizer", "tools/water",
    "forage/basket", "mining/pickaxe", "mining/surface",
  ];
  Object.keys(CROPS).forEach(function (id) {
    for (let n = 0; n <= CROPS[id].waters; n++) keys.push("crops/" + id + "/" + n);
  });
  Object.keys(TREES).forEach(function (id) {
    for (let n = 0; n <= TREES[id].waters; n++) keys.push("trees/" + id + "/" + n);
  });
  Object.keys(RECIPES).forEach(function (id) { keys.push("craft/" + id); });
  Object.keys(STATIONS).forEach(function (id) { keys.push("stations/" + id); });
  Object.keys(TINTS).forEach(function (name) { keys.push("items/" + slug(name)); });
  Object.keys(SKILLS).forEach(function (id) { keys.push("skills/" + id); });
  DOCK_IDS.forEach(function (id) { keys.push("dock/" + id); });
  MINE_ZONES.forEach(function (zone) { keys.push("mining/zones/" + slug(zone.name)); });
  // Not a STATIONS entry (see beehive.js's own header for why), so it
  // isn't picked up by the stations/<id> loop that'd normally cover this
  // -- added by hand instead.
  keys.push("stations/beehive");
  return keys;
}

export const spritesFound = new Set();

export function spriteUrl(key) { return SPRITE_BASE + key + ".png"; }
export function hasSprite(key) { return spritesFound.has(key); }

// Checks every declared key once. Missing files resolve (not reject) so one
// absent sprite never holds up the rest of the probe.
export function probeSprites() {
  return Promise.all(allSpriteKeys().map(function (key) {
    return new Promise(function (resolve) {
      const img = new Image();
      img.onload = function () { spritesFound.add(key); resolve(); };
      img.onerror = resolve;
      img.src = spriteUrl(key);
    });
  }));
}

// Points a sprite/fallback pair at `key`, showing whichever side is real.
// Skips reassigning `img.src` when the key hasn't changed, since this runs
// on every field redraw and a crop's frame usually hasn't moved.
export function useSprite(container, key) {
  const found = hasSprite(key);
  container.classList.toggle("using-sprite", found);
  if (found) {
    const img = container.querySelector(".sprite-img");
    if (img.dataset.key !== key) {
      img.src = spriteUrl(key);
      img.dataset.key = key;
    }
  }
  return found;
}
