// ==================================================================== travel
//
// The payoff for the LOCATIONS/ROADS foundation and the Map screen: moving
// between locations over real time. One trip in flight at a time, deadline-
// based like every other timer in this game (state.travel.readyAt is an
// absolute timestamp, not a countdown), so a trip already under way keeps
// progressing correctly across a reload or the tab being closed outright.
//
// Deliberately narrow for this pass: only direct, unlocked roads (no
// multi-hop routing yet), and arriving only ever changes
// state.currentLocation -- nothing reads that to gate stations, markets, or
// forage pools yet. That gating is the next batch's job, once the location
// spreadsheet's real content exists to gate.

import { LOCATIONS, ROADS } from "./data.js";
import { state, save } from "./state.js";

// ROADS has one entry per connection, not two, so "what connects a and b"
// has to check both directions.
export function roadBetween(a, b) {
  return ROADS.filter(function (r) {
    return (r.from === a && r.to === b) || (r.from === b && r.to === a);
  })[0] || null;
}

export function isTraveling() {
  return !!state.travel;
}

export function canTravelTo(id) {
  if (isTraveling()) return false;
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
  };
  save();
  return true;
}

// Called at boot and on every tick, same shape as every other settle() in
// this game. Returns true the moment a trip resolves, so callers know to
// do a full re-render rather than just refresh a countdown. Guards against
// a destination that no longer exists (a save from before a location got
// renamed/removed in data.js) by just canceling the trip in place rather
// than crashing on it.
export function settleTravel() {
  if (!state.travel) return false;
  if (!LOCATIONS[state.travel.to]) { state.travel = null; save(); return false; }
  if (Date.now() < state.travel.readyAt) return false;
  state.currentLocation = state.travel.to;
  state.travel = null;
  save();
  return true;
}
