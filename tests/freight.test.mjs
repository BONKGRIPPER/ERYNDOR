import assert from 'node:assert/strict';
import { state, save, load, stackCapFor, deliverProduction } from '../src/state.js';
import { dispatchShipment, quoteShipment, settleShipments } from '../src/shipments.js';
import { shortestRoadPath } from '../src/travel.js';
import { STORAGE_SLOTS } from '../src/data.js';

let saved;
globalThis.localStorage = { setItem(key, value) { saved = value; }, getItem() { return saved || null; } };
function reset() {
  state.playerContext = 'field'; state.currentLocation = 'thalBarak';
  state.bag = { 'Pine Logs': 10 }; state.storage = {}; state.shards = 20;
  state.shipments = []; state.freightHistory = [];
}
reset();
assert.equal(shortestRoadPath('thalBarak', 'aerendell').minutes, 20);
// Fee = stacks x 3 x ceil(minutes / 15). Thal-Barak is 20 min -> x2, so
// two stacks cost 2 x 3 x 2 = 12.
state.bag['Pine Logs'] = stackCapFor('Pine Logs') + 1;
assert.equal(quoteShipment({ 'Pine Logs': stackCapFor('Pine Logs') + 1 }).fee, 12);
// Same one-stack load costs more from farther away: Riverhold is 55 min
// -> ceil(55/15) = 4, so 1 x 3 x 4 = 12 vs Thal-Barak's 1 x 3 x 2 = 6.
reset(); state.currentLocation = 'riverhold'; state.shards = 100;
assert.equal(quoteShipment({ 'Pine Logs': 1 }).fee, 12);
reset();
assert.equal(shortestRoadPath('thalBarak', 'aerendell').roads.length, 2);
assert.equal(shortestRoadPath('invalid', 'aerendell'), null);
for (const qty of [-1, 0.5, NaN, Infinity, 11]) {
  assert.ok(dispatchShipment({ 'Pine Logs': qty }, 1000).error);
  assert.equal(state.bag['Pine Logs'], 10);
  assert.equal(state.shards, 20);
}
state.playerContext = 'traveling';
assert.ok(quoteShipment({ 'Pine Logs': 1 }).error);
state.playerContext = 'field'; state.currentLocation = 'forestRoad';
assert.ok(quoteShipment({ 'Pine Logs': 1 }).error);
reset(); state.shards = 0;
assert.ok(dispatchShipment({ 'Pine Logs': 1 }).error);
assert.equal(state.bag['Pine Logs'], 10);
reset();
const shipment = dispatchShipment({ 'Pine Logs': 7 }, 1000);
assert.equal(state.bag['Pine Logs'], 3);
assert.equal(state.shards, 14);   // 20 - (1 stack x 3 x 2)
assert.ok(dispatchShipment({ 'Pine Logs': 3 }, 1000).error);
assert.equal(settleShipments(shipment.readyAt - 1), false);
save(); state.shipments = []; load();
assert.equal(state.shipments.length, 1);
assert.equal(state.shipments[0].readyAt, shipment.readyAt);
settleShipments(shipment.readyAt);
assert.equal(state.storage['Pine Logs'], 7);
assert.equal(state.shipments.length, 0);
settleShipments(shipment.readyAt + 10000);
assert.equal(state.storage['Pine Logs'], 7);
assert.equal(state.freightHistory.length, 1);

reset();
const blocked = dispatchShipment({ 'Pine Logs': 7 }, 1000);
const cap = stackCapFor('Pine Logs');
state.storage = { 'Pine Logs': STORAGE_SLOTS * cap - 2 };
settleShipments(blocked.readyAt);
assert.equal(state.shipments[0].items['Pine Logs'], 5);
assert.equal(state.shipments[0].status, 'arrived');
assert.equal(deliverProduction('Pine Logs', 1), false);
assert.equal(state.storage['Pine Logs'], STORAGE_SLOTS * cap);
state.storage['Pine Logs'] -= 5;
save(); load();
settleShipments(blocked.readyAt + 1);
assert.equal(state.shipments.length, 0);
assert.equal(state.storage['Pine Logs'], STORAGE_SLOTS * cap);
state.storage['Pine Logs'] -= 3;
assert.equal(deliverProduction('Pine Logs', 3), true);
assert.equal(deliverProduction('Pine Logs', 1), false);

// Legacy freight has no path, fee, or history; its saved cargo/ETA survive.
reset(); save();
const legacy = JSON.parse(saved);
legacy.shipments = [{ from: 'thalBarak', items: { 'Pine Logs': 4 }, readyAt: 100 }];
delete legacy.logisticsVersion; delete legacy.freightHistory;
saved = JSON.stringify(legacy); load();
assert.equal(state.shipments[0].readyAt, 100);
settleShipments(101);
assert.equal(state.storage['Pine Logs'], 4);
console.log('Freight: dispatch, fees, duplicate prevention, paths, reload, overflow, production retention, and legacy migration passed.');

function runDelivery(offline) {
  reset();
  const sent = dispatchShipment({ 'Pine Logs': 6 }, 0);
  if (!offline) for (let now = 0; now < sent.readyAt; now += 60000) settleShipments(now);
  settleShipments(sent.readyAt);
  return JSON.stringify({ bag: state.bag, storage: state.storage, shards: state.shards, shipments: state.shipments });
}
assert.equal(runDelivery(true), runDelivery(false));
