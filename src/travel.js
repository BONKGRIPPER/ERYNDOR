// ==================================================================== travel
// Aerendell is the permanent production home. Travel changes only the
// active field zone; production timers continue settling independently.

import { LOCATIONS, ROADS, HOME_LOCATION_ID } from "./data.js";
import { state, save, unloadBagToWarehouse } from "./state.js";

export function roadBetween(a, b) {
  return ROADS.filter(function (r) {
    return (r.from === a && r.to === b) || (r.from === b && r.to === a);
  })[0] || null;
}

export function isTraveling() { return state.playerContext === "traveling" && !!state.travel; }
export function isAtHome() { return state.playerContext === "home"; }

// Switch to the workshop/production context. Only meaningful at Aerendell
// (nowhere else has stations); a no-op mid-trip. The Home dock button
// calls this before showing the Home screen so the production-screen gate
// in screens.js's show() lets it through.
//
// Also unloads the Bag into the Warehouse, same as arriving home by any
// other road (returnHome()/settleTravel() below) -- without this, farming
// or foraging at Aerendell in field context, then just tapping Home
// (no actual travel involved, since the player never left), left those
// gains stranded in the Bag where Crafting/stations can't see them, since
// production only ever reads the Warehouse. Bug fixed 2026-09-11.
export function enterHomeMode() {
  if (isTraveling() || state.currentLocation !== HOME_LOCATION_ID) return false;
  state.playerContext = "home";
  const result = unloadBagToWarehouse();
  save();
  return { moved: result.moved, blocked: result.blocked };
}

// Switch to the field/activity context at wherever the player currently
// is. After travel the player is already in `field`; this is really only
// needed at Aerendell, where the player might be in `home` context and
// taps a field activity from the Explore screen.
export function enterFieldMode() {
  if (isTraveling()) return false;
  state.playerContext = "field";
  save();
  return true;
}

// Reworked (2026-09-11) from "one direct road only" to "however many roads
// it takes" -- a destination with no direct road is still reachable, and
// still just ONE travel event with ONE summed deadline, per the request
// ("add up the time of each separate road into a single traveling
// event"), not a queue of separate hops the player has to sit through one
// at a time. `roads` (an ordered list of ROADS ids) is `allRoadPaths()`'s
// own default (fastest) route unless the caller names one explicitly --
// see startTravel()'s own `roads` param, which map.js's own sheet passes
// through once a location with more than one viable route (a future
// branching node) needs the player to actually pick which one.
export function canTravelTo(id) {
  if (isTraveling() || !LOCATIONS[id]) return false;
  if (id === state.currentLocation) return false;
  return allRoadPaths(state.currentLocation, id).length > 0;
}

// Sums every road in `roads` (in order, each one required to actually
// continue from wherever the last one left off) into one total -- the
// building block both startTravel() and allRoadPaths() itself use, so a
// caller that already knows its own chosen route (map.js's own path
// picker) never has to re-derive its minutes by hand.
function minutesForRoadPath(from, roads) {
  let at = from;
  let minutes = 0;
  for (let i = 0; i < roads.length; i++) {
    const road = ROADS.find(function (r) { return r.id === roads[i]; });
    if (!road || road.locked) return null;
    const neighbor = road.from === at ? road.to : (road.to === at ? road.from : null);
    if (!neighbor) return null;
    minutes += road.minutes;
    at = neighbor;
  }
  return { minutes: minutes, arrivesAt: at };
}

// Starts the trip to `id` -- the fastest known route (allRoadPaths()'s own
// first, sorted-ascending entry) unless `roads` explicitly names a
// different one (a player's own pick off a multi-route sheet). Explicit
// `roads` is re-validated against the live road graph rather than trusted
// blindly, same "never trust a stale/hand-built path" reasoning
// shortestRoadPath()'s own callers already got for free from Dijkstra
// always returning a currently-valid answer.
export function startTravel(id, roads) {
  if (isTraveling() || !LOCATIONS[id] || id === state.currentLocation) return false;
  const chosen = roads || (allRoadPaths(state.currentLocation, id)[0] || {}).roads;
  if (!chosen) return false;
  const summed = minutesForRoadPath(state.currentLocation, chosen);
  if (!summed || summed.arrivesAt !== id) return false;
  state.travel = {
    from: state.currentLocation,
    to: id,
    readyAt: Date.now() + summed.minutes * 60 * 1000,
    homebound: false,
    // The full multi-segment route actually being walked -- map.js's own
    // buildMap() highlights every one of these, not just a single road,
    // while it's in progress.
    roads: chosen,
  };
  state.playerContext = "traveling";
  save();
  return true;
}

// Every simple (no repeated node) unlocked route between two locations,
// each `{ minutes, roads }` (roads = an ordered ROADS-id list), sorted
// fastest first. A linear map -- today's, node to node with no branch --
// always resolves to exactly one; a future branching node (two roads
// leaving the same location toward the same eventual destination) yields
// more than one, which map.js's own sheet then offers as real choices
// instead of silently collapsing to whichever the shortest-path search
// happens to prefer. Plain DFS, not Dijkstra -- this map is small enough
// that enumerating every route is cheap, and unlike Dijkstra's own
// single-best-answer shape, DFS naturally produces every answer at once.
export function allRoadPaths(from, to) {
  if (!LOCATIONS[from] || !LOCATIONS[to]) return [];
  const results = [];
  const visited = new Set([from]);
  const roads = [];
  function dfs(current, minutes) {
    if (current === to) { results.push({ minutes: minutes, roads: roads.slice() }); return; }
    ROADS.forEach(function (road) {
      if (road.locked) return;
      let neighbor = null;
      if (road.from === current) neighbor = road.to;
      else if (road.to === current) neighbor = road.from;
      if (!neighbor || visited.has(neighbor)) return;
      visited.add(neighbor);
      roads.push(road.id);
      dfs(neighbor, minutes + road.minutes);
      roads.pop();
      visited.delete(neighbor);
    });
  }
  dfs(from, 0);
  results.sort(function (a, b) { return a.minutes - b.minutes; });
  return results;
}

// Shortest unlocked road time, used by Return Home, merchant freight, and
// the outpost cart. Kept as its own function (rather than a thin
// allRoadPaths()[0] wrapper renamed at every call site) since every
// existing caller already expects exactly this shape and behavior.
export function shortestTravelMinutes(from, to) {
  return shortestRoadPath(from, to)?.minutes ?? Infinity;
}

export function shortestRoadPath(from, to) {
  if (!LOCATIONS[from] || !LOCATIONS[to]) return null;
  const dist = {};
  const paths = { [from]: [] };
  const pending = Object.keys(LOCATIONS);
  pending.forEach(function (id) { dist[id] = Infinity; });
  dist[from] = 0;
  while (pending.length) {
    pending.sort(function (a, b) { return dist[a] - dist[b]; });
    const current = pending.shift();
    if (current === to && isFinite(dist[current])) return { minutes: dist[current], roads: paths[current] };
    if (!isFinite(dist[current])) break;
    ROADS.forEach(function (road) {
      if (road.locked) return;
      let neighbor = null;
      if (road.from === current) neighbor = road.to;
      else if (road.to === current) neighbor = road.from;
      if (!neighbor || pending.indexOf(neighbor) === -1) return;
      if (dist[current] + road.minutes < dist[neighbor]) {
        dist[neighbor] = dist[current] + road.minutes;
        paths[neighbor] = paths[current].concat(road.id);
      }
    });
  }
  return null;
}

export function returnHome() {
  if (isTraveling()) return false;
  if (isAtHome()) return { arrived: true, home: true, moved: 0, blocked: 0 };
  const path = shortestRoadPath(state.currentLocation, HOME_LOCATION_ID);
  if (!path) return false;
  if (path.minutes === 0) {
    state.playerContext = "home";
    const result = unloadBagToWarehouse();
    save();
    return { arrived: true, home: true, moved: result.moved, blocked: result.blocked };
  }
  state.travel = {
    from: state.currentLocation,
    to: HOME_LOCATION_ID,
    readyAt: Date.now() + path.minutes * 60 * 1000,
    homebound: true,
    // Same multi-segment route bookkeeping startTravel() now keeps -- see
    // its own comment -- so map.js's road-highlighting works identically
    // whether a trip started from the Map's own sheet or this shortcut.
    roads: path.roads,
  };
  state.playerContext = "traveling";
  save();
  return true;
}

export function settleTravel() {
  if (!state.travel) return false;
  if (!LOCATIONS[state.travel.to]) {
    state.travel = null;
    state.playerContext = state.currentLocation === HOME_LOCATION_ID ? "home" : "field";
    save();
    return false;
  }
  if (Date.now() < state.travel.readyAt) return false;
  const homebound = state.travel.homebound === true;
  state.mapVisited ||= { aerendell: true };
  state.mapExploredRoads ||= {};
  state.mapVisited[state.travel.from] = true;
  (state.travel.roads || [(roadBetween(state.travel.from, state.travel.to) || {}).id].filter(Boolean)).forEach(id => {
    const road = ROADS.find(r => r.id === id);
    if (!road) return;
    state.mapExploredRoads[id] = true;
    state.mapVisited[road.from] = true;
    state.mapVisited[road.to] = true;
  });
  state.mapVisited[state.travel.to] = true;
  state.currentLocation = state.travel.to;
  state.travel = null;
  state.playerContext = homebound ? "home" : "field";
  const unload = homebound ? unloadBagToWarehouse() : { moved: 0, blocked: 0 };
  save();
  return { arrived: true, home: homebound, moved: unload.moved, blocked: unload.blocked };
}
