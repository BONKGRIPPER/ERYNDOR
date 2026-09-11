// ======================================================================= map
//
// A freeform 2D layout, not a list -- each LOCATIONS entry carries a grid
// `pos` (data.js), converted to pixels here and dropped onto an absolutely
// positioned canvas inside a draggable viewport. Roads are dashed SVG lines
// between node centers, with a time/lock badge sitting right on top of the
// line at its midpoint, matching the hand-drawn sketch. Tapping a reachable
// location opens a sheet with a Travel button (src/travel.js does the
// actual moving); tapping the current location, or one with no direct
// unlocked road, opens the same sheet with no button.

import { LOCATIONS, ROADS, HOME_LOCATION_ID } from "./data.js";
import { state } from "./state.js";
import { el } from "./dom.js";
import { show } from "./screens.js";
import { openSheet, closeSheet } from "./sheet.js";
import {
  roadBetween, isTraveling, isAtHome, startTravel,
} from "./travel.js";

const TYPE_ICON = {
  city: "\u{1F3F0}",
  town: "\u{1F3E1}",
  landmark: "\u{1F4CD}",
  wilderness: "\u{1F332}",
};
const TYPE_LABEL = {
  city: "City",
  town: "Town",
  landmark: "Landmark",
  wilderness: "Wilderness",
};

// Grid-to-pixel spacing and canvas padding -- tune these, not the per-tile
// math below, if the map ever needs to feel more/less cramped.
const COL_W = 150;
const ROW_H = 130;
const PAD = 64;
const SVG_NS = "http://www.w3.org/2000/svg";

function openLocationSheet(id) {
  const loc = LOCATIONS[id];
  const body = el("sheet-body");
  body.replaceChildren();

  const type = document.createElement("div");
  type.className = "map-sheet-type";
  type.textContent = TYPE_LABEL[loc.type] || loc.type;
  body.append(type);

  const facts = [];
  if (id === HOME_LOCATION_ID) facts.push("Warehouse · Production hub");
  if (loc.type === "city") facts.push("Market open 24/7 · Bank (shared across every city)");
  if (loc.type === "town") facts.push("Market closed 5pm-9am");
  if (loc.type === "landmark" || loc.type === "wilderness") facts.push("No market");
  if (id === HOME_LOCATION_ID && loc.stations && loc.stations.length) facts.push("Production stations available at Home");
  if (loc.forage) facts.push("Foraging available");

  facts.forEach(function (fact) {
    const row = document.createElement("div");
    row.className = "map-sheet-fact";
    row.textContent = fact;
    body.append(row);
  });

  const note = document.createElement("div");
  const road = roadBetween(state.currentLocation, id);
  if (id === state.currentLocation) {
    note.className = "map-sheet-here";
    note.textContent = isAtHome() ? "You are home." : "You are here.";
    body.append(note);
  } else if (state.travel && state.travel.to === id) {
    note.className = "map-sheet-here";
    note.textContent = "Already on the way here.";
    body.append(note);
  } else if (isTraveling()) {
    note.className = "map-sheet-fact";
    note.textContent = "Already on the road to " + LOCATIONS[state.travel.to].name + " -- can't change course mid-trip.";
    body.append(note);
  } else if (!road) {
    note.className = "map-sheet-fact";
    note.textContent = "No direct road from here yet.";
    body.append(note);
  } else if (road.locked) {
    note.className = "map-sheet-fact";
    note.textContent = typeof road.locked === "string" ? "Locked: " + road.locked : "Locked.";
    body.append(note);
  } else {
    const btn = document.createElement("button");
    btn.className = "map-travel-btn";
    btn.textContent = "Travel (" + road.minutes + " min)";
    btn.addEventListener("click", function () {
      startTravel(id);
      closeSheet();
      buildMap();
    });
    body.append(btn);
  }

  // What you can *do* at a location -- activities, market, the outpost,
  // Return Home -- lives on the Explore tab now, not in this sheet. This
  // sheet is travel only.
  if (id === state.currentLocation) {
    const hint = document.createElement("div");
    hint.className = "map-sheet-fact";
    hint.textContent = "Open the Explore tab for activities here.";
    body.append(hint);
  }

  openSheet(loc.name);
}

// Grid coordinates aren't guaranteed to start at 0 in either axis -- a
// branch off to one side (like the placeholder off Thal-Barak) needs
// negative x, and there's no reason a future branch couldn't need
// negative y too. So pixel conversion offsets against the *lowest* x/y on
// the map, not just 0, and the canvas is sized off the full x/y spread
// rather than the max alone. y is also flipped against the highest y --
// grid y grows upward from Aerendell (pos.y 0), but pixel y grows
// downward, so without the flip "up the map" would render as "down the
// screen."
function makePixelFn() {
  const positions = Object.keys(LOCATIONS).map(function (id) { return LOCATIONS[id].pos; });
  const xs = positions.map(function (p) { return p.x; });
  const ys = positions.map(function (p) { return p.y; });
  const minX = Math.min.apply(null, xs);
  const maxY = Math.max.apply(null, ys);
  const pixel = function (id) {
    const p = LOCATIONS[id].pos;
    return { x: PAD + (p.x - minX) * COL_W, y: PAD + (maxY - p.y) * ROW_H };
  };
  const width = PAD * 2 + (Math.max.apply(null, xs) - minX) * COL_W;
  const height = PAD * 2 + (maxY - Math.min.apply(null, ys)) * ROW_H;
  return { pixel: pixel, width: width, height: height };
}

export function buildMap() {
  const viewport = el("map-viewport");
  const canvas = el("map-canvas");
  canvas.replaceChildren();

  const ids = Object.keys(LOCATIONS);
  const layout = makePixelFn();
  const pixel = layout.pixel;
  const width = layout.width;
  const height = layout.height;
  canvas.style.width = width + "px";
  canvas.style.height = height + "px";

  // Which single road (if any) the player is currently walking, so both
  // passes below can pick it out and mark it gold instead of the usual
  // dim dashed line.
  const travelRoad = state.travel && roadBetween(state.travel.from, state.travel.to);

  // Roads first (under the nodes): one dashed line per ROADS entry, plus a
  // badge centered on the line itself rather than off to the side.
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("width", width);
  svg.setAttribute("height", height);
  svg.classList.add("map-svg");
  ROADS.forEach(function (road) {
    const a = pixel(road.from);
    const b = pixel(road.to);
    const line = document.createElementNS(SVG_NS, "line");
    line.setAttribute("x1", a.x);
    line.setAttribute("y1", a.y);
    line.setAttribute("x2", b.x);
    line.setAttribute("y2", b.y);
    line.setAttribute("class", "map-road-line" + (road.locked ? " locked" : "") + (road === travelRoad ? " traveling" : ""));
    svg.append(line);
  });
  canvas.append(svg);

  ROADS.forEach(function (road) {
    const a = pixel(road.from);
    const b = pixel(road.to);
    const badge = document.createElement("div");
    badge.className = "map-road-badge" + (road.locked ? " locked" : "") + (road === travelRoad ? " traveling" : "");
    badge.style.left = (a.x + b.x) / 2 + "px";
    badge.style.top = (a.y + b.y) / 2 + "px";
    badge.textContent = road.locked
      ? "\u{1F512}" + (typeof road.locked === "string" ? " " + road.locked : "")
      : road.minutes + " min";
    canvas.append(badge);
  });

  ids.forEach(function (id) {
    const loc = LOCATIONS[id];
    const p = pixel(id);
    const isHere = id === state.currentLocation && !isAtHome();
    const isDest = !!(state.travel && state.travel.to === id);
    const node = document.createElement("button");
    node.className = "map-node" + (isHere ? " current" : "") + (isDest ? " traveling" : "");
    node.style.left = p.x + "px";
    node.style.top = p.y + "px";
    node.dataset.locId = id;
    node.innerHTML =
      '<span class="map-node-circle">' + (TYPE_ICON[loc.type] || "\u{2753}") + "</span>" +
      '<span class="map-node-label">' + loc.name + "</span>" +
      '<span class="map-node-type">' +
        (isAtHome() && id === HOME_LOCATION_ID ? "Home" : isHere ? "You are here" : isDest ? "Arriving..." : (TYPE_LABEL[loc.type] || loc.type)) +
      "</span>";
    canvas.append(node);
  });

  // Open already centered on the player's current location -- the bottom
  // of the chain today -- rather than the canvas's default top-left.
  requestAnimationFrame(function () {
    const cur = pixel(state.currentLocation);
    viewport.scrollLeft = Math.max(0, cur.x - viewport.clientWidth / 2);
    viewport.scrollTop = Math.max(0, cur.y - viewport.clientHeight / 2);
  });

  updateTravelNote();
}

// Live countdown while a trip is in flight -- refreshed every tick by
// refreshMap() below, rather than rebuilding the whole canvas just to
// update one line of text.
function updateTravelNote() {
  const note = el("map-travel-note");
  if (!state.travel) { note.classList.add("hidden"); return; }
  const dest = LOCATIONS[state.travel.to];
  if (!dest) { note.classList.add("hidden"); return; }
  note.classList.remove("hidden");
  const remainMs = Math.max(0, state.travel.readyAt - Date.now());
  const mins = Math.floor(remainMs / 60000);
  const secs = Math.floor((remainMs % 60000) / 1000);
  note.textContent =
    "\u{1F6B6} Traveling to " + dest.name + " -- " + mins + "m " + (secs < 10 ? "0" : "") + secs + "s";
}

// Called every tick while the Map screen is visible (see main.js). Just
// the countdown text -- a full buildMap() only happens when a trip
// actually resolves, which main.js detects itself via settleTravel()'s
// return value.
export function refreshMap() {
  updateTravelNote();
}

el("back-map").addEventListener("click", function () { show("explore"); });

// ------------------------------------------------------------- drag to pan
//
// overflow is hidden on #map-viewport on purpose -- panning is driven by
// hand here (scrollLeft/scrollTop still work on a hidden-overflow element
// when set from script) rather than the browser's own touch-scroll, so a
// plain tap on a node isn't fighting native scroll momentum for what
// counts as a "click." Works the same for a mouse drag and a finger drag,
// since both come through as pointer events. Wired once at module scope
// (the viewport and canvas elements themselves are never replaced, only
// their children, so this never needs to run again).
(function setupDrag() {
  const viewport = el("map-viewport");
  let drag = null;

  // Which node (if any) was actually under the pointer at the *start* of
  // the gesture is decided here, at pointerdown -- not read back off a
  // later "click" event. setPointerCapture below retargets every
  // subsequent pointer event (and the click that follows them) to
  // `viewport` itself, so by the time a click event exists its own
  // e.target is useless for finding which node got tapped.
  viewport.addEventListener("pointerdown", function (e) {
    const node = e.target.closest(".map-node");
    drag = {
      x: e.clientX, y: e.clientY,
      left: viewport.scrollLeft, top: viewport.scrollTop,
      moved: false,
      locId: node ? node.dataset.locId : null,
    };
    viewport.setPointerCapture(e.pointerId);
  });
  viewport.addEventListener("pointermove", function (e) {
    if (!drag) return;
    const dx = e.clientX - drag.x;
    const dy = e.clientY - drag.y;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) drag.moved = true;
    viewport.scrollLeft = drag.left - dx;
    viewport.scrollTop = drag.top - dy;
  });
  // A tap opens its node's sheet right here, once the pointer lifts
  // without having moved past the drag threshold -- a real drag just
  // pans and never opens anything.
  viewport.addEventListener("pointerup", function () {
    if (drag && !drag.moved && drag.locId) openLocationSheet(drag.locId);
    drag = null;
  });
  viewport.addEventListener("pointercancel", function () { drag = null; });
})();
