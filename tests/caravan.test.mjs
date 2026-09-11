import assert from 'node:assert/strict';
import { state, save, load, stackCapFor } from '../src/state.js';
import { buildOutpost, buyCart, transferOutpost, setCartOrder, pauseCart, settleCaravan, disbandCart } from '../src/caravans.js';
import { STORAGE_SLOTS } from '../src/data.js';
let saved;
globalThis.localStorage = { setItem(k,v) { saved=v; }, getItem() { return saved || null; } };
function setup() {
  state.playerContext='field'; state.currentLocation='forestRoad'; state.shards=1000;
  state.outposts={}; state.caravan=null; state.storage={}; state.bag={'Pine Logs':30};
  assert.equal(buildOutpost(), undefined); assert.equal(buyCart(0), undefined);
  assert.equal(transferOutpost('Pine Logs',30,false,0), undefined);
  assert.equal(setCartOrder({items:['Pine Logs'],reserve:0,mode:'available',maxWaitMs:60000},0),undefined);
  pauseCart(false,0);
}
setup();
assert.equal(state.shards,850);
assert.ok(buildOutpost()); assert.ok(buyCart(0));
settleCaravan(0); assert.equal(state.caravan.phase,'loading');
assert.equal(state.caravan.items['Pine Logs'],5);
assert.equal(state.outposts.forestRoad.items['Pine Logs'],25);
assert.ok(disbandCart(0));
save(); state.caravan=null; load();
settleCaravan(320000); assert.equal(state.storage['Pine Logs'],5);
assert.equal(state.caravan.phase,'returning');
settleCaravan(1560000); assert.equal(state.storage['Pine Logs'],15);

function run(offline) {
  setup();
  if (!offline) for(let t=0;t<1900000;t+=10000) settleCaravan(t);
  settleCaravan(1900000);
  return JSON.stringify({stock:state.outposts,bag:state.bag,storage:state.storage,cart:state.caravan});
}
assert.equal(run(true),run(false));
setup(); settleCaravan(0);
state.storage={'Pine Logs':STORAGE_SLOTS*stackCapFor('Pine Logs')-2};
settleCaravan(320000); assert.equal(state.caravan.items['Pine Logs'],3);
pauseCart(true,320000);
state.storage['Pine Logs']-=3;
settleCaravan(330000); assert.equal(state.caravan.phase,'returning');
settleCaravan(630000); assert.equal(state.caravan.phase,'waiting');
assert.equal(state.outposts.forestRoad.items['Pine Logs'],25);
assert.equal(disbandCart(630000),undefined);

setup(); pauseCart(true,0); // loaded cart is allowed to finish
state.currentLocation='aerendell'; state.playerContext='home';
assert.ok(transferOutpost('Pine Logs',1,false,0));
assert.equal(setCartOrder({items:['Pine Logs'],reserve:25,mode:'full',maxWaitMs:60000},0),undefined);
assert.equal(state.caravan.pendingOrder.reserve,25);
settleCaravan(620000); assert.equal(state.caravan.order.reserve,25);
pauseCart(false,620000); settleCaravan(1000000);
assert.equal(state.outposts.forestRoad.items['Pine Logs'],25);

setup(); state.caravan.paused=true;
// Fresh sparse stock: full-load rule departs at the maximum wait.
state.caravan.items={}; state.caravan.phase='waiting'; state.caravan.nextAt=0;
state.outposts.forestRoad.items={'Pine Logs':1};
setCartOrder({items:['Pine Logs'],reserve:0,mode:'full',maxWaitMs:60000},0);
pauseCart(false,0); settleCaravan(59999); assert.equal(state.caravan.phase,'waiting');
settleCaravan(60000); assert.equal(state.caravan.phase,'loading');
assert.equal(state.caravan.items['Pine Logs'],1);
console.log('Caravan: repeated cycles, reload, offline parity, capacity, pause, reserve, pending edits, remote access and maximum wait passed.');
