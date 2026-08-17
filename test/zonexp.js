/* Per-zone xp/leveling and the loot-wheel reward. Run: node test/zonexp.js */
const { boot } = require('./harness');
const { G } = boot();

function playAnyCard() {
  S.weight = 0;
  G.current = { key: 'flint', index: 0 };   // a plain gather card, no target needed
  G.rt.windowOpen = true; G.rt.tapped = false;
  G.resolveCard(false);
}

console.log('== fresh zone starts at level 1 ==');
G.wipe();
console.log('  aerendell', JSON.stringify(S.zoneXp.aerendell), '(expect lv 1, xp 0)');

console.log('\n== any card played grants the CURRENT zone xp ==');
const before = S.zoneXp.aerendell.xp;
playAnyCard();
console.log('  xp', before, '->', S.zoneXp.aerendell.xp,
  '(expect +' + G.TUNE.zoneXpPerCard + ')');

console.log('\n== other zones are untouched by play in this one ==');
console.log('  forestRoad still lv 1, xp 0:',
  S.zoneXp.forestRoad.lv === 1 && S.zoneXp.forestRoad.xp === 0);

console.log('\n== enough cards level the zone up and fire a spin ==');
G.wipe();
let levelUps = 0;
G.on('zone:levelup', () => { levelUps++; });
for (let i = 0; i < 30; i++) playAnyCard();
console.log('  zone level', S.zoneXp.aerendell.lv, '(expect > 1)');
console.log('  level-up event(s) fired:', levelUps, '(expect >= 1)');

/* The reels no longer decide the prize — G.ZONE_LOOT does, and the
   reels are then made to land on it (see test/zoneloot.js for the
   odds themselves). So the invariant here is reels-follow-result:
   matching on a win, deliberately disagreeing on a miss. */
console.log('\n== the reels agree with the result they were dealt ==');
G.wipe(); S.weight = 0;
let sawWin = false, sawMiss = false, reelsAlwaysAgree = true;
for (let i = 0; i < 600; i++) {
  const spin = G.spinZoneLoot('aerendell');
  const matched = spin.reels[0] === spin.reels[1] && spin.reels[1] === spin.reels[2];
  if (matched !== !!spin.win) reelsAlwaysAgree = false;
  if (spin.win) sawWin = true; else sawMiss = true;
  if (spin.reels.length !== 3) reelsAlwaysAgree = false;
}
console.log('  three reels, matching iff it was a win:', reelsAlwaysAgree);
console.log('  saw both a win and a miss in 600 spins:', sawWin && sawMiss);

console.log('\n== a resource win actually adds the reward to the pack ==');
G.wipe(); S.weight = 0;
let win = null;
for (let i = 0; i < 2000; i++) {
  const spin = G.spinZoneLoot('aerendell');
  if (spin.win && spin.reward.kind === 'res') { win = spin; break; }
}
console.log('  found a resource win:', !!win);
if (win) {
  console.log('  reward key matches the matched reel:', win.reward.key === win.reels[0]);
  console.log('  reward landed in the pack:', S[win.reward.key] >= win.reward.qty);
}

console.log('\n== a zone with no reel pool still spins safely ==');
const oldPool = G.ZONES.aerendell.lootPool;
G.ZONES.aerendell.lootPool = [];
const bare = G.spinZoneLoot('aerendell');
console.log('  still returns a spin rather than crashing:', !!bare && bare.reels.length === 3);
G.ZONES.aerendell.lootPool = oldPool;

console.log('\n== zoneDiscount is 0 at level 1 and grows with level, capped ==');
G.wipe();
console.log('  fresh zone discount:', G.zoneDiscount('aerendell'), '(expect 0)');
S.zoneXp.aerendell.lv = 26;
console.log('  lv 26 discount:', G.zoneDiscount('aerendell'),
  '(expect', G.TUNE.zoneDiscountPerLv * 25, ')');
S.zoneXp.aerendell.lv = 999;
console.log('  absurd level caps at', G.TUNE.zoneDiscountMax + ':', G.zoneDiscount('aerendell') === G.TUNE.zoneDiscountMax);
