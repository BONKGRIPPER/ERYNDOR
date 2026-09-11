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
export function enterHomeMode() {
  if (isTraveling() || state.currentLocation !== HOME_LOCATION_ID) return false;
  state.playerContext = "home";
  save();
  return true;
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

export function canTravelTo(id) {
  if (isTraveling() || !LOCATIONS[id]) return false;
  if (id === state.currentLocation) return false;
  const road = roadBetween(state.currentLocation, id);
  return !!road && !road.locked;
}

export function startTravel(id) {
  if (!canTravelTo(id)) return false;
  const road = roadBetween(state.currentLocation, id);
  state.travel = {
    from: state.currentLocation,
    to: id,
    readyAt: Date.now() + road.minutes * 60 * 1000,
    homebound: false,
  };
  state.playerContext = "traveling";
  save();
  return true;
}

// Shortest unlocked road time, used by Return Home now and merchant freight
// later. The current map is small, so a simple Dijkstra pass is clearer than
// introducing a routing dependency.
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
  const minutes = shortestTravelMinutes(state.currentLocation, HOME_LOCATION_ID);
  if (!isFinite(minutes)) return false;
  if (minutes === 0) {
    state.playerContext = "home";
    const result = unloadBagToWarehouse();
    save();
    return { arrived: true, home: true, moved: result.moved, blocked: result.blocked };
  }
  state.travel = {
    from: state.currentLocation,
    to: HOME_LOCATION_ID,
    readyAt: Date.now() + minutes * 60 * 1000,
    homebound: true,
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
  state.currentLocation = state.travel.to;
  state.travel = null;
  state.playerContext = homebound ? "home" : "field";
  const unload = homebound ? unloadBagToWarehouse() : { moved: 0, blocked: 0 };
  save();
  return { arrived: true, home: homebound, moved: unload.moved, blocked: unload.blocked };
}
