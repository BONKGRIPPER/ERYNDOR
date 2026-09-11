// ================================================================ shipments
// Merchant dispatch debits the Bag and fee together. Cargo remains owned by
// the shipment until delivered, including while the Warehouse is full.

import { HOME_LOCATION_ID, LOCATIONS, FREIGHT_FEE_PER_STACK, FREIGHT_FEE_DISTANCE_STEP } from "./data.js";
import { state, save, storageRoomFor, slotsForQty, stackCapFor } from "./state.js";
import { shortestRoadPath } from "./travel.js";
import { isTownMarketOpen } from "./time.js";

// stacks x per-stack rate x distance multiplier -- see FREIGHT_FEE_PER_STACK
// in data.js.
export function freightFee(stacks, minutes) {
  const steps = Math.max(1, Math.ceil(minutes / FREIGHT_FEE_DISTANCE_STEP));
  return stacks * FREIGHT_FEE_PER_STACK * steps;
}

export function quoteShipment(items) {
  const from = state.currentLocation;
  const loc = LOCATIONS[from];
  if (state.playerContext !== "field" || from === HOME_LOCATION_ID || !loc || !["town", "city"].includes(loc.type)) return { error: "Visit a town or city away from Home to send freight." };
  if (loc.type === "town" && !isTownMarketOpen()) return { error: "The merchant is closed." };
  if (state.shipments.length) return { error: "Your current shipment must finish unloading first." };
  const path = shortestRoadPath(from, HOME_LOCATION_ID);
  if (!path) return { error: "No unlocked road home." };
  if (!items || Array.isArray(items) || !Object.keys(items).length) return { error: "Select goods from your Bag." };
  let stacks = 0;
  for (const [name, qty] of Object.entries(items)) {
    if (!Number.isSafeInteger(qty) || qty <= 0 || qty > (state.bag[name] || 0)) return { error: "The selected quantity is no longer in your Bag." };
    stacks += slotsForQty(qty, stackCapFor(name));
  }
  const fee = freightFee(stacks, path.minutes);
  if (state.shards < fee) return { error: "Not enough Shards. Shipping costs " + fee + " Shards.", fee };
  return { from, fee, path, stacks };
}

export function dispatchShipment(items, now = Date.now()) {
  const quote = quoteShipment(items);
  if (quote.error) return quote;
  const shipment = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
    from: quote.from,
    to: HOME_LOCATION_ID,
    items: Object.assign({}, items),
    readyAt: now + quote.path.minutes * 60000,
    roads: quote.path.roads,
    fee: quote.fee,
    sentItems: Object.assign({}, items),
    status: "traveling",
  };
  Object.entries(items).forEach(function ([name, qty]) {
    state.bag[name] -= qty;
    if (!state.bag[name]) delete state.bag[name];
  });
  state.shards -= quote.fee;
  state.shipments.push(shipment);
  save();
  return shipment;
}

export function settleShipments(now = Date.now()) {
  let changed = false;
  state.shipments.forEach(function (shipment) {
    if (shipment.status === "traveling" && now >= shipment.readyAt) {
      shipment.status = "arrived";
      changed = true;
    }
    if (shipment.status !== "arrived") return;
    Object.keys(shipment.items).forEach(function (name) {
      const owned = shipment.items[name] || 0;
      const qty = Math.min(owned, storageRoomFor(name));
      if (qty <= 0) return;
      state.storage[name] = (state.storage[name] || 0) + qty;
      shipment.items[name] -= qty;
      if (shipment.items[name] <= 0) delete shipment.items[name];
      changed = true;
    });
    if (Object.keys(shipment.items).length === 0) {
      shipment.status = "delivered";
      state.freightHistory.push({ id: shipment.id, from: shipment.from, items: shipment.sentItems || {}, deliveredAt: now });
      state.freightHistory = state.freightHistory.slice(-5);
    }
  });
  const before = state.shipments.length;
  state.shipments = state.shipments.filter(function (shipment) { return shipment.status !== "delivered"; });
  if (state.shipments.length !== before) changed = true;
  if (changed) save();
  return changed;
}
