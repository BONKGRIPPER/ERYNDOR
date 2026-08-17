/* Shared ticker registry (G.registerTicker/G.startTickers/G.stopTickers,
   core.js) — one setInterval dispatches every registered background
   system instead of each one owning its own. G.timeScale() is the hook
   a future "Slowed" status effect would override to lengthen every
   registered interval AND every duration computed through it (tap-craft
   job length, villager interval) at once. Run: node test/tickers.js */
const { boot } = require('./harness');
const { G, tickIntervals } = boot();
const give = (k, n) => { S[k] = (S[k] || 0) + n; S.weight = 0; };

console.log('== the old per-system ticker functions are gone, replaced by one registry ==');
console.log('  G.startVillagerTicker removed:', typeof G.startVillagerTicker === 'undefined');
console.log('  G.startCraftJobTicker removed:', typeof G.startCraftJobTicker === 'undefined');
console.log('  G.startTickers exists:', typeof G.startTickers === 'function');
console.log('  G.stopTickers exists:', typeof G.stopTickers === 'function');
console.log('  G.registerTicker exists:', typeof G.registerTicker === 'function');
console.log('  G.timeScale defaults to 1:', G.timeScale() === 1);

console.log('\n== villagers and tap-craft jobs are both registered on boot ==');
G.wipe();
G.startTickers();
console.log('  exactly one real setInterval backs the whole registry:',
  Object.keys(global.__intervals).length === 1);

console.log('\n== the master loop actually dispatches a registered ticker ==');
G.wipe(); S.zone = 'aerendell'; S.weight = 0;
give('wood', 40); give('planks', 40); give('string', 40); give('stick', 40);
G.buildStation('loom');
G.hireVillagerAt('loom');
G.zoneGrant('aerendell', 'flax', 200);
G.startTickers();
global.__clock += G.villagerInterval('loom') * 3 + 2100;   // past the 2s villager poll too
tickIntervals();
console.log('  villager produced through the shared loop, no direct collectVillagerWork call:',
  G.crateFor('aerendell').string >= 3);

console.log('\n== stopTickers actually silences the interval ==');
G.wipe();
G.startTickers();
console.log('  interval registered:', Object.keys(global.__intervals).length === 1);
G.stopTickers();
console.log('  interval cleared:', Object.keys(global.__intervals).length === 0);

console.log('\n== a paused runtime skips every registered ticker, not just one ==');
G.wipe(); S.zone = 'aerendell'; S.weight = 0;
give('wood', 40); give('planks', 40); give('string', 40); give('stick', 40);
G.buildStation('loom');
G.hireVillagerAt('loom');
G.zoneGrant('aerendell', 'flax', 200);
G.startTickers();
G.rt.paused = true;
global.__clock += G.villagerInterval('loom') * 5 + 2100;
tickIntervals();
console.log('  nothing produced while paused:', !G.crateFor('aerendell').string);
G.rt.paused = false;
tickIntervals();
console.log('  resumes and catches up once unpaused:', G.crateFor('aerendell').string >= 3);

console.log('\n== G.timeScale is the hook craft-job duration and villager interval both read ==');
G.wipe(); S.zone = 'aerendell'; S.weight = 0;
give('stone', 50); give('wood', 50); give('planks', 50); give('basaltBlock', 10); give('stoneBlock', 5);
G.buildStation('bench');
const baseMs = G.villagerInterval('bench');
const realTimeScale = G.timeScale;
G.timeScale = () => 2;   // simulate a "Slowed" effect
console.log('  villager interval doubles under a 2x time scale:',
  G.villagerInterval('bench') === baseMs * 2);
G.startCraftJob('axe');
console.log('  a job started while slowed snapshots the slower duration:',
  S.craftJobs.axe.ms === Math.round(G.TUNE.tapCraftMs * 2));
G.timeScale = realTimeScale;   // restore — snapshot means this job stays slow
console.log('  restoring time scale does not retroactively speed up the in-flight job:',
  S.craftJobs.axe.ms === Math.round(G.TUNE.tapCraftMs * 2));

console.log('\n== registering a brand-new system needs one line, no boilerplate ==');
let pings = 0;
G.registerTicker('testPing', 500, () => { pings++; });
G.startTickers();
global.__clock += 1200;
tickIntervals();
console.log('  the new ticker actually fired through the shared loop:', pings >= 1);
