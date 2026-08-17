/* Combat/yield rebalance batch: +1 atk on every hostile location, the
   bow's own damage down to 1 (2 on a clean tap), and the double-tap
   band widening per level doubled to 10%/level (already covered in
   depth by test/foraging.js — this file just locks in the exact
   numbers for this specific pass). Run: node test/rebalance.js */
const { boot } = require('./harness');
const { G } = boot();

console.log('== every hostile location took +1 atk ==');
const EXPECTED_ATK = {
  chicken: 3, cow: 3, sheep: 3, pig: 3, lurker: 5, goblin: 5, deer: 3,
};
Object.keys(EXPECTED_ATK).forEach(k => {
  console.log('  ' + k + ' atk == ' + EXPECTED_ATK[k] + ':', G.LOCATIONS[k].atk === EXPECTED_ATK[k]);
});
console.log('  no other location gained atk out of nowhere (still only these 7 are hostile):',
  Object.keys(G.LOCATIONS).filter(k => G.LOCATIONS[k].atk).sort().join(',') ===
  Object.keys(EXPECTED_ATK).sort().join(','));

console.log('\n== the bow itself hits for 1, doubling to 2 on a clean tap ==');
console.log('  shoot card atk is 1:', G.CARDS.shoot.atk === 1);
G.wipe(); S.zone = 'aerendell'; S.weight = 0;
S.locationField = [{ key: 'chicken', hp: 999 }, null, null];   // never clears mid-test
function fire(hit) {
  S.weight = 0;
  G.current = { key: 'shoot', index: 0 };
  G.rt.windowOpen = true; G.rt.tapped = !!hit;
  G.resolveCard(!!hit);
}
const before = S.locationField[0].hp;
fire(false);
console.log('  a miss (no ammo) deals 1:', S.locationField[0].hp === before - 1);
const before2 = S.locationField[0].hp;
fire(true);
console.log('  a clean tap deals 2:', S.locationField[0].hp === before2 - 2);

console.log('\n== harvestBandPerLv is 10% now (see test/foraging.js for the full ratio proof) ==');
console.log('  TUNE.harvestBandPerLv === 0.10:', G.TUNE.harvestBandPerLv === 0.10);
