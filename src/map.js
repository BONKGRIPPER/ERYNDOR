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
  roadBetween, isTraveling, isAtHome, startTravel, allRoadPaths,
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
import { WORLD, MAP_PLACES, MAP_ROUTES, visiblePlaces } from './worldMap.js';
let zoom = 4;
let initialized = false;
let lastLocation = null;
const SVG_NS = "http://www.w3.org/2000/svg";

// Every location name a route actually passes through, in order (the
// final destination included) -- walks `roads` the same way
// travel.js's own minutesForRoadPath() does, just collecting names
// instead of summing minutes. Used only to tell two branching routes
// apart in the sheet (openLocationSheet() below); a single-route
// destination never needs this.
function waypointNames(from, roads) {
  const names = [];
  let at = from;
  roads.forEach(function (roadId) {
    const road = ROADS.find(function (r) { return r.id === roadId; });
    if (!road) return;
    at = road.from === at ? road.to : road.from;
    names.push(LOCATIONS[at] ? LOCATIONS[at].name : at);
  });
  return names;
}

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
  // Every unlocked route there is, not just a direct road -- multi-hop
  // trips are one summed travel event now (see travel.js's startTravel()),
  // so a destination two or three roads away is just as reachable from
  // here as a next-door one, only slower. Sorted fastest first by
  // allRoadPaths() itself.
  const paths = id === state.currentLocation ? [] : allRoadPaths(state.currentLocation, id);
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
  } else if (paths.length === 0) {
    note.className = "map-sheet-fact";
    // A direct-but-locked road gets its own specific reason; no road at
    // all (however many hops) falls back to the generic message.
    note.textContent = road && road.locked
      ? (typeof road.locked === "string" ? "Locked: " + road.locked : "Locked.")
      : "No route from here yet.";
    body.append(note);
  } else {
    // A single route (every location on today's map) is one plain Travel
    // button, same as always. More than one -- a future branching node,
    // where two different roads both eventually reach `id` -- offers one
    // button per route instead of silently picking the fastest for the
    // player, each named by its own intermediate stop(s) so the options
    // actually read as different choices; see travel.js's own
    // allRoadPaths()/startTravel(id, roads).
    paths.forEach(function (path) {
      const btn = document.createElement("button");
      btn.className = "map-travel-btn";
      if (paths.length > 1) {
        const stops = waypointNames(state.currentLocation, path.roads).slice(0, -1);
        btn.textContent = "Travel via " + (stops.join(", ") || loc.name) + " (" + path.minutes + " min)";
      } else {
        btn.textContent = "Travel (" + path.minutes + " min)";
      }
      btn.addEventListener("click", function () {
        startTravel(id, path.roads);
        closeSheet();
        buildMap();
      });
      body.append(btn);
    });
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
function svgEl(tag, attrs) {
  const node = document.createElementNS(SVG_NS, tag);
  Object.entries(attrs).forEach(([key, value]) => node.setAttribute(key, value));
  return node;
}
function centerPlayer() {
  const viewport = el("map-viewport");
  const p = MAP_PLACES[state.currentLocation] || MAP_PLACES.aerendell;
  viewport.scrollLeft = p.x * zoom - viewport.clientWidth / 2;
  viewport.scrollTop = p.y * zoom - viewport.clientHeight / 2;
}
export function buildMap() {
  const viewport = el("map-viewport"), canvas = el("map-canvas");
  const left = viewport.scrollLeft, top = viewport.scrollTop;
  canvas.replaceChildren();
  canvas.style.width = WORLD.width * zoom + "px";
  canvas.style.height = WORLD.height * zoom + "px";
  const terrain = document.createElement("img");
  terrain.src = WORLD.image;
  terrain.className = "world-map-terrain";
  terrain.alt = "";
  terrain.draggable = false;
  canvas.append(terrain);
  const visited = { ...state.mapVisited, aerendell: true, [state.currentLocation]: true };
  const visible = visiblePlaces(visited, ROADS);
  if (state.travel) visible.add(state.travel.to);
  const active = new Set(state.travel?.roads || []);
  const svg = svgEl("svg", { width: WORLD.width * zoom, height: WORLD.height * zoom,
    viewBox: "0 0 " + WORLD.width + " " + WORLD.height, class: "map-svg" });
  const defs = svgEl("defs", {});
  // Blur the combined silhouette, not separate white-backed gradients:
  // neighboring discoveries must join without covering one another again.
  const feather = svgEl("filter", { id: "map-fog-feather", x: "-40%", y: "-40%", width: "180%", height: "180%", "color-interpolation-filters": "sRGB" });
  feather.append(svgEl("feGaussianBlur", { stdDeviation: 9 }));
  const gradient = svgEl("linearGradient", { id: "map-fog-color", x1: "0%", y1: "0%", x2: "65%", y2: "100%" });
  gradient.append(svgEl("stop", { offset: "0%", "stop-color": "#263e50" }),
    svgEl("stop", { offset: "50%", "stop-color": "#172c3d" }),
    svgEl("stop", { offset: "100%", "stop-color": "#304653" }));
  const mask = svgEl("mask", { id: "map-fog-mask", maskUnits: "userSpaceOnUse", x: 0, y: 0, width: WORLD.width, height: WORLD.height });
  mask.style.maskType = "luminance";
  mask.append(svgEl("rect", { width: WORLD.width, height: WORLD.height, fill: "white" }));
  const clearings = svgEl("g", { fill: "black", filter: "url(#map-fog-feather)" });
  Object.keys(visited).forEach(id => {
    const p = MAP_PLACES[id];
    if (!visited[id] || !p) return;
    // Stable, gently irregular contours instead of obvious circular holes.
    // Atlas-space geometry stays fixed while panning and zooming.
    const phase = (p.x + p.y) * 0.017;
    const points = Array.from({ length: 64 }, (_, i) => {
      const a = i * Math.PI * 2 / 64;
      const r = 74 + 8 * Math.sin(3 * a + phase) + 5 * Math.cos(5 * a - phase);
      return [p.x + Math.cos(a) * r, p.y + Math.sin(a) * r * 0.86].join(",");
    });
    clearings.append(svgEl("polygon", { points: points.join(" ") }));
  });
  ROADS.forEach(road => {
    const points = MAP_ROUTES[road.id];
    if (points && state.mapExploredRoads?.[road.id]) {
      clearings.append(svgEl("polyline", { points: points.map(p => p.join(",")).join(" "),
        fill: "none", stroke: "black", "stroke-width": 58, "stroke-linecap": "round", "stroke-linejoin": "round" }));
    }
  });
  mask.append(clearings);
  defs.append(feather, gradient, mask); svg.append(defs);
  svg.append(svgEl("rect", { width: WORLD.width, height: WORLD.height, fill: "url(#map-fog-color)", opacity: ".90", mask: "url(#map-fog-mask)" }));
  ROADS.forEach(road => {
    if (!visible.has(road.from) || !visible.has(road.to)) return;
    const points = MAP_ROUTES[road.id];
    if (!points) return;
    svg.append(svgEl("polyline", { points: points.map(p => p.join(",")).join(" "),
      fill: "none", class: "map-road-line" + (road.locked ? " locked" : "") + (active.has(road.id) ? " traveling" : ""),
      "vector-effect": "non-scaling-stroke" }));
    const mid = points[Math.floor(points.length / 2)];
    const badge = document.createElement("div");
    badge.className = "map-road-badge" + (active.has(road.id) ? " traveling" : "");
    badge.style.left = mid[0] * zoom + "px"; badge.style.top = mid[1] * zoom + "px";
    badge.textContent = road.locked ? "Locked" : road.minutes + " min";
    canvas.append(badge);
  });
  canvas.insertBefore(svg, terrain.nextSibling);
  visible.forEach(id => {
    const loc = LOCATIONS[id], p = MAP_PLACES[id];
    if (!loc || !p) return;
    const here = id === state.currentLocation;
    const node = document.createElement("button");
    node.className = "map-node" + (here ? " current" : "") + (state.travel?.to === id ? " traveling" : "") + (!visited[id] ? " unexplored" : "");
    node.style.left = p.x * zoom + "px"; node.style.top = p.y * zoom + "px";
    node.dataset.locId = id;
    node.innerHTML = '<span class="map-node-circle">' + (TYPE_ICON[loc.type] || "◆") + '</span><span class="map-node-label">' + loc.name + '</span><span class="map-node-type">' + (here ? "You are here" : visited[id] ? "Visited" : "Unexplored") + '</span>';
    node.addEventListener("click", e => { if (e.detail === 0) openLocationSheet(id); });
    canvas.append(node);
  });
  el("map-zoom-level").textContent = Math.round(zoom * 100) + "%";
  requestAnimationFrame(() => {
    if (!initialized || lastLocation !== state.currentLocation) centerPlayer();
    else { viewport.scrollLeft = left; viewport.scrollTop = top; }
    initialized = true; lastLocation = state.currentLocation;
  });
  updateTravelNote();
}
function setZoom(value, x, y) {
  const v = el("map-viewport");
  x ??= v.clientWidth / 2; y ??= v.clientHeight / 2;
  const px = (v.scrollLeft + x) / zoom, py = (v.scrollTop + y) / zoom;
  const min = Math.min(v.clientWidth / WORLD.width, v.clientHeight / WORLD.height);
  zoom = Math.min(16, Math.max(min, value));
  buildMap();
  requestAnimationFrame(() => { v.scrollLeft = px * zoom - x; v.scrollTop = py * zoom - y; });
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
  const pointers = new Map();
  let moved = false, target = null;
  viewport.addEventListener("pointerdown", e => {
    if (e.button !== 0) return;
    if (!pointers.size) { moved = false; target = e.target.closest(".map-node")?.dataset.locId; }
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY, startX: e.clientX, startY: e.clientY });
    if (pointers.size > 1) moved = true;
    viewport.setPointerCapture(e.pointerId);
  });
  viewport.addEventListener("pointermove", e => {
    const prev = pointers.get(e.pointerId);
    if (!prev) return;
    if (Math.hypot(e.clientX - prev.startX, e.clientY - prev.startY) > 5) moved = true;
    const other = [...pointers.entries()].find(([id]) => id !== e.pointerId)?.[1];
    if (other) {
      const before = Math.hypot(prev.x - other.x, prev.y - other.y);
      const after = Math.hypot(e.clientX - other.x, e.clientY - other.y);
      const rect = viewport.getBoundingClientRect();
      if (before > 0) setZoom(zoom * after / before, (e.clientX + other.x) / 2 - rect.left, (e.clientY + other.y) / 2 - rect.top);
    } else {
      viewport.scrollLeft -= e.clientX - prev.x;
      viewport.scrollTop -= e.clientY - prev.y;
    }
    pointers.set(e.pointerId, { ...prev, x: e.clientX, y: e.clientY });
  });
  viewport.addEventListener("pointerup", e => {
    if (pointers.has(e.pointerId) && pointers.size === 1 && !moved && target) openLocationSheet(target);
    pointers.delete(e.pointerId);
  });
  viewport.addEventListener("pointercancel", e => { moved = true; pointers.delete(e.pointerId); });
  viewport.addEventListener("lostpointercapture", e => pointers.delete(e.pointerId));
  viewport.addEventListener("wheel", e => {
    e.preventDefault();
    const rect = viewport.getBoundingClientRect();
    setZoom(zoom * Math.exp(-e.deltaY * .002), e.clientX - rect.left, e.clientY - rect.top);
  }, { passive: false });
  el("map-zoom-in").addEventListener("click", () => setZoom(zoom * 1.4));
  el("map-zoom-out").addEventListener("click", () => setZoom(zoom / 1.4));
  el("map-center").addEventListener("click", centerPlayer);
  el("map-fit").addEventListener("click", () => {
    setZoom(Math.min(viewport.clientWidth / WORLD.width, viewport.clientHeight / WORLD.height));
    requestAnimationFrame(() => { viewport.scrollLeft = 0; viewport.scrollTop = 0; });
  });
})();
