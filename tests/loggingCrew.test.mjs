import assert from 'node:assert/strict';
import { state, save, load } from '../src/state.js';
import { buildOutpost, buyCart, setCartOrder, pauseCart, settleCaravan, unlockLoggingCrew, assignLoggingCrew, upgradeLogistics, cargoUsed, outpostCapacity } from '../src/caravans.js';
import { laborAssigned, laborCapacity } from '../src/labor.js';
let saved;
globalThis.localStorage = { setItem(k,v) { saved=v; }, getItem() { return saved || null; } };
function setup(upgrade = false) {
  state.outposts={}; state.caravan=null; state.workers=[]; state.housing={aerendell:1};
  state.village={ food:10000, heat:10000, starved:false, nextUpkeepAt:null };
  state.bag={}; state.storage={}; state.shards=10000;
  state.currentLocation='forestRoad'; state.playerContext='field'; state.equipment.axe='Stone Axe';
  buildOutpost(); buyCart(0);
  if(upgrade) assert.equal(upgradeLogistics('cart',0),undefined);
  assert.equal(unlockLoggingCrew(0),undefined);
  assert.equal(assignLoggingCrew(true,0),undefined);
  setCartOrder({ items:['Birch Logs'], reserve:0, mode:'full', maxWaitMs:600000 },0);
  pauseCart(false,0);
}
function outcome() { return { stock:state.outposts.forestRoad.items, cargo:state.caravan.items, home:state.storage, made:state.outposts.forestRoad.crew.produced, food:state.village.food }; }
function run(offline, upgrade=false) {
  setup(upgrade);
  if(!offline) for(let now=10000;now<7200000;now+=10000) settleCaravan(now);
  settleCaravan(7200000);
  const made=state.outposts.forestRoad.crew.produced;
  assert.equal((state.storage['Birch Logs']||0)+(state.caravan.items['Birch Logs']||0)+(state.outposts.forestRoad.items['Birch Logs']||0),made);
  return structuredClone(outcome());
}
assert.deepEqual(run(true),run(false));
const basic=run(true), improved=run(true,true);
assert.ok(improved.home['Birch Logs']>basic.home['Birch Logs']);
assert.equal(basic.made,80);
setup();
assert.equal(laborAssigned(),1); assert.equal(laborCapacity(),3);
assignLoggingCrew(false,0);
state.workers=[{role:'forager',nextTickAt:1},{role:'cook',nextTickAt:1},{role:'mason',nextTickAt:1}];
assert.ok(assignLoggingCrew(true,0)); assert.equal(laborAssigned(),3);
state.workers.pop(); assert.equal(assignLoggingCrew(true,0),undefined); assert.equal(laborAssigned(),3);
setup(); pauseCart(true,0); settleCaravan(20000000);
assert.equal(cargoUsed(state.outposts.forestRoad.items),outpostCapacity());
assert.equal(state.outposts.forestRoad.crew.produced,100);
assert.equal(upgradeLogistics('stockpile',20000000),undefined);
settleCaravan(20090000); assert.ok(state.outposts.forestRoad.crew.produced>100);
const before=state.outposts.forestRoad.crew.produced;
upgradeLogistics('crew',20090000); settleCaravan(20150000);
assert.equal(state.outposts.forestRoad.crew.produced,before+1);
save(); state.outposts={}; load(); assert.equal(state.outposts.forestRoad.crew.level,1);
assert.equal(state.outposts.forestRoad.stockpileLevel,1);
setup(); state.village.nextUpkeepAt=180000; state.village.food=0; state.village.heat=0;
settleCaravan(360000); assert.equal(state.outposts.forestRoad.crew.produced,1);
assert.equal(state.village.starved,true);
state.village.food=30; state.village.heat=15;
settleCaravan(450000); assert.equal(state.outposts.forestRoad.crew.produced,2);
assert.equal(state.village.starved,false);
setup(); assignLoggingCrew(false,0); settleCaravan(900000); assert.equal(state.outposts.forestRoad.crew.produced,0);
state.outposts.forestRoad.crew=undefined; state.equipment.axe='Wooden Axe';
assert.ok(unlockLoggingCrew(900000));
console.log('Logging crew: conservation, online/offline interleaving, upgrade throughput, worker slots, full buffers, upkeep, reload, and unlock gates passed.');
