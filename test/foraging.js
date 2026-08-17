/* Foraging skill: milestone doubling, band widening, starter field
   variety guarantee. Run: node test/foraging.js */
const { boot } = require('./harness');
const { G } = boot();
const give = (k, n) => { S[k] = (S[k] || 0) + n; S.weight = 0; };

function playHand(key) {
  S.weight = 0;
  G.current = { key, index: 0 };
  G.rt.windowOpen = true; G.rt.tapped = false;
  G.resolveCard(false);
}

console.log('== gather/forage cards route xp to foraging ==');
console.log('  flint.skill', G.CARDS.flint.skill, '| stick.skill', G.CARDS.stick.skill,
  '| forage.skill', G.CARDS.forage.skill, '(all expect foraging)');
console.log('  axeStone.skill', G.CARDS.axeStone.skill, '(expect woodcut — chopping, not foraging)');

console.log('\n== milestone doubling: 25/50/75/100 ==');
G.wipe();
[0, 24, 25, 49, 50, 74, 75, 99, 100].forEach(lv => {
  S.skills.foraging.lv = lv;
  console.log('  lv', String(lv).padStart(3), '-> mult', G.foragingMult(G.CARDS.flint));
});

console.log('\n== doubling actually lands in the pack ==');
G.wipe();
S.skills.foraging.lv = 1;
give('flint', 0);
const before1 = S.flint;
playHand('flint');
console.log('  lv 1 flint swing gains', S.flint - before1, '(expect 1)');
G.wipe();
S.skills.foraging.lv = 25;
const before25 = S.flint;
playHand('flint');
console.log('  lv 25 flint swing gains', S.flint - before25, '(expect 2)');

console.log('\n== foraging levels widen the band, other skills do not ==');
G.wipe();
S.skills.foraging.lv = 1;
G.current = { key: 'flint', index: 0 };
const bandLv1 = G.rollBand();
S.skills.foraging.lv = 100;
const bandLv100 = G.rollBand();
console.log('  lv1 width', (bandLv1.end - bandLv1.start).toFixed(3),
  '| lv100 width range wider:', (bandLv100.end - bandLv100.start) > (bandLv1.end - bandLv1.start) * 1.5);
G.current = { key: 'strikeStone', index: 0 };
S.skills.foraging.lv = 100;
let atkMaxWidth = 0;
for (let i = 0; i < 200; i++) {
  const b = G.rollBand();
  atkMaxWidth = Math.max(atkMaxWidth, b.end - b.start);
}
console.log('  non-foraging card unaffected by foraging level: max width over 200 rolls',
  atkMaxWidth.toFixed(3), '<= raw bandMax', G.TUNE.bandMax, '->', atkMaxWidth <= G.TUNE.bandMax + 0.0001);

console.log('\n== foraging, mining, woodcut, melee and archery all widen the band, at 10% per level ==');
function avgWidth(key, skill, lv, n) {
  G.wipe();
  S.skills[skill].lv = lv;
  G.current = { key, index: 0 };
  let total = 0;
  for (let i = 0; i < n; i++) { const b = G.rollBand(); total += b.end - b.start; }
  return total / n;
}
const N = 4000;
const pickLv1 = avgWidth('pickFlint', 'mining', 1, N);
const pickLv21 = avgWidth('pickFlint', 'mining', 21, N);   // +10%*20 levels = +200%
const pickRatio = pickLv21 / pickLv1;
console.log('  pickFlint (mining) lv1->lv21 ratio', pickRatio.toFixed(2),
  '(expect ~3.00):', Math.abs(pickRatio - 3) < 0.15);

const axeLv1 = avgWidth('axeFlint', 'woodcut', 1, N);
const axeLv11 = avgWidth('axeFlint', 'woodcut', 11, N);    // +10%*10 levels = +100%
const axeRatio = axeLv11 / axeLv1;
console.log('  axeFlint (woodcut) lv1->lv11 ratio', axeRatio.toFixed(2),
  '(expect ~2.00):', Math.abs(axeRatio - 2) < 0.1);

const meleeLv1 = avgWidth('strikeStone', 'melee', 1, N);
const meleeLv11 = avgWidth('strikeStone', 'melee', 11, N);  // +10%*10 levels = +100%
const meleeRatio = meleeLv11 / meleeLv1;
console.log('  strikeStone (melee) lv1->lv11 ratio', meleeRatio.toFixed(2),
  '(expect ~2.00):', Math.abs(meleeRatio - 2) < 0.1);

const archLv1 = avgWidth('shoot', 'archery', 1, N);
const archLv11 = avgWidth('shoot', 'archery', 11, N);       // +10%*10 levels = +100%
const archRatio = archLv11 / archLv1;
console.log('  shoot (archery) lv1->lv11 ratio', archRatio.toFixed(2),
  '(expect ~2.00):', Math.abs(archRatio - 2) < 0.1);

console.log('\n== melee and archery level independently ==');
G.wipe();
S.skills.melee.lv = 20;
console.log('  archery untouched by melee level:', S.skills.archery.lv === 1);

console.log('\n== fresh field always has a boulder and a pine tree ==');
/* Structural now, not probabilistic — Aerendell's boulder/pineTree
   each own a dedicated field-slot deck (G.ZONES.aerendell.
   locationDecks, data.js), so this is guaranteed by construction,
   not a "guarantee" pass patched on after a shared-deck draw. Still
   looped as a regression guard, not because it could ever fail. */
let bothEveryTime = true;
for (let i = 0; i < 50; i++) {
  G.wipe();
  const keys = S.locationField.map(s => s && s.key);
  if (keys.indexOf('boulder') < 0 || keys.indexOf('pineTree') < 0) bothEveryTime = false;
}
console.log('  50 wipes, every field had both (deterministic):', bothEveryTime);
