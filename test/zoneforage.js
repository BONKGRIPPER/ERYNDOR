/* Forage is zone-specific now: Aerendell only ever turns up Red
   Berries (+ a chance of seeds), Forest Road only ever turns up Flax
   (+ a chance of seeds) — this is what gates String/Bow/Fishing Net
   behind an actual trip to Forest Road. Also covers the Fishing Net
   recipe's cost change (string+stick, no longer forestRoad-locked)
   and the one-shot "Spinning Table unlocked" banner on the first
   return to Aerendell carrying known flax.
   Run: node test/zoneforage.js */
const { boot } = require('./harness');
const { G, store, travelNow } = boot();
const UI = G.UI;

function playForage() {
  S.weight = 0;
  G.current = { key: 'forage', index: 0 };
  G.rt.windowOpen = true; G.rt.tapped = false;
  G.resolveCard(false);
}

console.log('== Aerendell forage only ever yields berries/berrySeed ==');
G.wipe(); S.kills = 999;
let sawFlax = false, sawBerries = false;
for (let i = 0; i < 200; i++) {
  const roll = G.rollForage();
  if (roll.flax || roll.flaxSeed) sawFlax = true;
  if (roll.berries) sawBerries = true;
}
console.log('  never rolls flax/flaxSeed in Aerendell:', sawFlax === false);
console.log('  does roll berries in Aerendell:', sawBerries === true);

console.log('\n== Forest Road forage only ever yields flax/flaxSeed ==');
G.wipe(); S.kills = 999;
travelNow('forestRoad');
let sawFlax2 = false, sawBerries2 = false;
for (let i = 0; i < 200; i++) {
  const roll = G.rollForage();
  if (roll.flax) sawFlax2 = true;
  if (roll.berries || roll.berrySeed) sawBerries2 = true;
}
console.log('  never rolls berries/berrySeed in Forest Road:', sawBerries2 === false);
console.log('  does roll flax in Forest Road:', sawFlax2 === true);

console.log('\n== playing the Forage card in Aerendell actually banks berries, not flax ==');
G.wipe(); S.kills = 999;
S.flax = 0; S.berries = 0;
for (let i = 0; i < 20; i++) playForage();
console.log('  gained berries:', S.berries > 0);
console.log('  gained zero flax:', S.flax === 0);

console.log('\n== Fishing Net now costs String + Stick, and is reachable at the (Aerendell-only) Bench ==');
const netRecipe = G.STATIONS.find(s => s.id === 'bench').recipes.find(r => r.id === 'fishingNet');
console.log('  costs string:', netRecipe.cost.string === 3);
console.log('  costs stick:', netRecipe.cost.stick === 8);
console.log('  costs no raw flax any more:', netRecipe.cost.flax === undefined);
console.log('  carries no zone lock (buildable wherever the Bench itself is — Aerendell only):',
  netRecipe.zones === undefined);

console.log('\n== the Spinning Table unlock banner fires once, on returning to Aerendell with flax known ==');
/* every travel:done also fires the generic "Travelled" banner, which
   overwrites #b-main with the zone name — spy on UI.banner itself
   rather than reading the DOM, so that unrelated banner doesn't mask
   what we're actually checking here. */
let unlockBannerCalls = 0;
const realBanner = UI.banner;
UI.banner = function (eye, main, sub, cls) {
  if (eye === 'Unlocked' && main === 'Spinning Table') unlockBannerCalls++;
  return realBanner.apply(UI, arguments);
};

G.wipe(); S.kills = 999;
travelNow('forestRoad');
console.log('  flax not yet discovered:', !S.discovered.flax);
S.flax = (S.flax || 0) + 1;
G.emit('discovered', { key: 'flax' });   // mirror what G.addRes does on a genuine first pickup
S.discovered.flax = true;
console.log('  loomUnlockShown starts false:', S.loomUnlockShown === false);
travelNow('aerendell');
console.log('  loomUnlockShown flips true on arrival with flax known:', S.loomUnlockShown === true);
console.log('  fired the Spinning Table banner exactly once:', unlockBannerCalls === 1);

console.log('\n== it does not fire again on a second return trip ==');
travelNow('forestRoad');
travelNow('aerendell');
console.log('  still exactly one call total:', unlockBannerCalls === 1);

console.log('\n== it never fires for a player who has not discovered flax at all ==');
G.wipe(); S.kills = 999;
unlockBannerCalls = 0;
travelNow('forestRoad');
travelNow('aerendell');
console.log('  no flax ever discovered -> never fired:', unlockBannerCalls === 0);
console.log('  loomUnlockShown stays false:', S.loomUnlockShown === false);
UI.banner = realBanner;
