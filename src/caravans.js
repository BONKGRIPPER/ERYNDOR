// Single-route freight simulation. UI mutations settle before changing stock
// or orders so new deposits never become available retroactively.
import { state, save, bagRoomFor, storageRoomFor } from "./state.js";
import { shortestRoadPath } from "./travel.js";
import { OUTPOST_COST, CART_COST, OUTPOST_CAPACITY, CART_CAPACITY, CART_HANDLING_MS, CARGO_UNITS } from "./data.js";
import { LOGGING_CREW_COST, LOGGING_CREW_INTERVALS, LOGISTICS_UPGRADE_COSTS, AXES, VILLAGE_UPKEEP_MS } from "./data.js";
import { laborAssigned, laborCapacity, settleLaborUpkeep } from "./labor.js";

export const cargoUnits = name => CARGO_UNITS[name] || 1;
export const cargoUsed = items => Object.entries(items).reduce((sum, [name, qty]) => sum + qty * cargoUnits(name), 0);
export const outpostCapacity = () => OUTPOST_CAPACITY * (1 + (state.outposts.forestRoad?.stockpileLevel || 0));
export const cartCapacity = () => CART_CAPACITY * (1 + (state.caravan?.capacityLevel || 0));
export const crewInterval = () => LOGGING_CREW_INTERVALS[state.outposts.forestRoad?.crew?.level || 0];
const local = () => state.playerContext === "field" && state.currentLocation === "forestRoad";
function move(from, to, name, qty) {
  if (!qty) return;
  from[name] -= qty;
  if (!from[name]) delete from[name];
  to[name] = (to[name] || 0) + qty;
}
export function buildOutpost() {
  if (!local()) return "Visit Forest Road to build.";
  if (state.outposts.forestRoad) return "Outpost already built.";
  if (state.shards < OUTPOST_COST) return "Not enough Shards.";
  state.shards -= OUTPOST_COST;
  state.outposts.forestRoad = { items: {} };
  save();
}
export function buyCart(now = Date.now()) {
  if (!local() || !state.outposts.forestRoad) return "Visit your Forest Road outpost.";
  if (state.caravan) return "You already own a cart.";
  if (state.shards < CART_COST) return "Not enough Shards.";
  state.shards -= CART_COST;
  state.caravan = { phase: "waiting", at: "forestRoad", items: {}, nextAt: now, waitingSince: now, createdAt: now, delivered: 0,
    order: { items: [], reserve: 0, mode: "available", maxWaitMs: 60000 }, paused: true };
  save();
}
export function transferOutpost(name, quantity, withdraw = false, now = Date.now()) {
  settleCaravan(now);
  if (!local() || !state.outposts.forestRoad) return "Visit Forest Road to transfer goods.";
  if (!Number.isSafeInteger(quantity) || quantity <= 0) return "Enter a whole quantity above zero.";
  const stock = state.outposts.forestRoad.items;
  const from = withdraw ? stock : state.bag;
  const to = withdraw ? state.bag : stock;
  const room = withdraw ? bagRoomFor(name) : Math.floor((outpostCapacity() - cargoUsed(stock)) / cargoUnits(name));
  const qty = Math.min(quantity, from[name] || 0, Math.max(0, room));
  if (!qty) return "No goods or no room at destination.";
  move(from, to, name, qty);
  save();
}
export function setCartOrder(order, now = Date.now()) {
  settleCaravan(now);
  const c = state.caravan;
  if (!c) return "Build a cart first.";
  if (!Array.isArray(order.items) || !order.items.length || !order.items.every(n => typeof n === "string" && n.length) ||
      !Number.isSafeInteger(order.reserve) || order.reserve < 0 || !["available", "full"].includes(order.mode) ||
      !Number.isSafeInteger(order.maxWaitMs) || order.maxWaitMs < 1000 || order.maxWaitMs > 3600000) return "Select cargo and valid reserves/wait time.";
  const copy = { ...order, items: [...new Set(order.items)] };
  if (c.phase === "waiting") { c.order = copy; c.waitingSince = now; }
  else c.pendingOrder = copy;
  save();
}
export function pauseCart(paused, now = Date.now()) {
  settleCaravan(now);
  const c = state.caravan;
  if (!c) return;
  c.paused = paused;
  if (!paused && c.phase === "waiting") { c.nextAt = now; c.waitingSince = now; }
  save();
}
export function disbandCart(now = Date.now()) {
  settleCaravan(now);
  const c = state.caravan;
  if (!c || cargoUsed(c.items) || !["waiting", "unloading"].includes(c.phase)) return "Cart must be empty at an endpoint.";
  state.caravan = null;
  save();
}

function advanceCart(now = Date.now()) {
  const c = state.caravan;
  const stock = state.outposts.forestRoad?.items;
  if (!c || !stock) return false;
  let changed = false;
  // Bounded catch-up retains nextAt as its cursor; the next tick continues.
  for (let i = 0; i < 1000 && c.nextAt <= now; i++) {
    const at = c.nextAt;
    if (c.phase === "waiting") {
      if (c.pendingOrder) { c.order = c.pendingOrder; delete c.pendingOrder; changed = true; }
      const path = shortestRoadPath("forestRoad", "aerendell");
      if (c.paused || !path || !c.order.items.length) { c.nextAt = now; break; }
      const load = {};
      let room = cartCapacity();
      for (const name of c.order.items) {
        const qty = Math.min(Math.max(0, (stock[name] || 0) - c.order.reserve), Math.floor(room / cargoUnits(name)));
        if (qty) { load[name] = qty; room -= qty * cargoUnits(name); }
      }
      if (!Object.keys(load).length) { c.nextAt = now; c.waitingSince = now; break; }
      const deadline = c.waitingSince + c.order.maxWaitMs;
      if (c.order.mode === "full" && room > 0 && at < deadline) {
        c.nextAt = Math.min(now, deadline);
        if (now < deadline) break;
        continue;
      }
      Object.entries(load).forEach(([name, qty]) => move(stock, c.items, name, qty));
      c.travelMs = path.minutes * 60000; c.roads = path.roads;
      c.phase = "loading"; c.nextAt = at + CART_HANDLING_MS;
    } else if (c.phase === "loading") {
      c.phase = "traveling"; c.nextAt = at + c.travelMs;
    } else if (c.phase === "traveling") {
      c.at = "aerendell"; c.phase = "unloading"; c.nextAt = at + CART_HANDLING_MS;
    } else if (c.phase === "unloading") {
      Object.entries(c.items).forEach(([name, qty]) => {
        const delivered = Math.min(qty, storageRoomFor(name));
        move(c.items, state.storage, name, delivered); c.delivered += delivered;
      });
      changed = true;
      if (Object.keys(c.items).length) { c.nextAt = now; break; }
      c.phase = "returning"; c.nextAt = at + c.travelMs;
    } else if (c.phase === "returning") {
      c.at = "forestRoad"; c.phase = "waiting"; c.waitingSince = at;
    } else { c.paused = true; break; }
    changed = true;
  }
  return changed;
}

export function unlockLoggingCrew(now = Date.now()) {
  settleCaravan(now);
  const outpost = state.outposts.forestRoad;
  if (!local() || !outpost) return "Visit your Forest Road outpost.";
  if (outpost.crew) return "Logging crew already unlocked.";
  if ((AXES[state.equipment.axe]?.damage || 0) < 3) return "Equip a Stone Axe or better to establish Birch logging.";
  if (state.shards < LOGGING_CREW_COST) return "Not enough Shards.";
  state.shards -= LOGGING_CREW_COST;
  outpost.crew = { assigned: false, level: 0, nextAt: now + LOGGING_CREW_INTERVALS[0], produced: 0 };
  save();
}
export function assignLoggingCrew(assigned, now = Date.now()) {
  settleCaravan(now);
  const crew = state.outposts.forestRoad?.crew;
  if (!crew) return "Unlock a logging crew at Forest Road first.";
  if (assigned && !crew.assigned && laborAssigned() >= laborCapacity()) return "No free worker slot. Unassign a profession or build housing.";
  if (crew.assigned === assigned) return;
  crew.assigned = assigned; crew.nextAt = now + crewInterval();
  if (assigned && state.village.nextUpkeepAt === null) state.village.nextUpkeepAt = now + VILLAGE_UPKEEP_MS;
  save();
}
export function upgradeLogistics(kind, now = Date.now()) {
  settleCaravan(now);
  const outpost = state.outposts.forestRoad;
  if (!local() || !outpost) return "Visit Forest Road to upgrade.";
  const target = kind === "cart" ? state.caravan : kind === "crew" ? outpost.crew : kind === "stockpile" ? outpost : null;
  if (!target) return "Build this first.";
  if (kind === "cart" && (target.phase !== "waiting" || cargoUsed(target.items))) return "Pause the cart and wait for its empty return before upgrading.";
  const key = kind === "cart" ? "capacityLevel" : kind === "crew" ? "level" : "stockpileLevel";
  const level = target[key] || 0, cost = LOGISTICS_UPGRADE_COSTS[kind]?.[level];
  if (cost === undefined) return "Maximum upgrade reached.";
  if (state.shards < cost) return "Not enough Shards.";
  state.shards -= cost; target[key] = level + 1;
  if (kind === "crew") target.nextAt = now + crewInterval();
  save();
}

// Interleave extraction and transport. Deposits/upgrades/assignments call this
// before mutation, so new stock or faster crews never work retroactively.
export function settleCaravan(now = Date.now()) {
  const outpost = state.outposts.forestRoad, crew = outpost?.crew;
  let changed = false;
  if (crew?.assigned) {
    for (let i = 0; i < 10000 && crew.nextAt <= now; i++) {
      const at = crew.nextAt;
      changed = advanceCart(at) || changed;
      settleLaborUpkeep(at, false);
      if (!state.village.starved && cargoUsed(outpost.items) + cargoUnits("Birch Logs") <= outpostCapacity()) {
        outpost.items["Birch Logs"] = (outpost.items["Birch Logs"] || 0) + 1;
        crew.produced += 1;
      }
      crew.nextAt = at + crewInterval(); changed = true;
      changed = advanceCart(at) || changed;
    }
    // Preserve the event cursor for very long gaps; later ticks continue.
    if (crew.nextAt <= now) { save(); return changed; }
  }
  changed = advanceCart(now) || changed;
  if (changed) save();
  return changed;
}
