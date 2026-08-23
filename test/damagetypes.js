/* Damage types: every attack card carries a `damageType` (blunt /
   pierce / slash / ranged), and a location may answer with `weak` or
   `resist`. NOTHING is assigned to any enemy yet — the system ships
   inert, so this proves the wiring works AND that live content is
   currently unaffected. Run: node test/damagetypes.js */
const { boot } = require('./harness');
const { G } = boot();

console.log('== the four types exist ==');
console.log('  blunt / pierce / slash / ranged:',
  JSON.stringify(G.DAMAGE_TYPES) === JSON.stringify(['blunt', 'pierce', 'slash', 'ranged']));

console.log('\n== every attack card is typed ==');
const expected = {
  strikeStone: 'slash', strikeScrap: 'slash', strikeBronze: 'slash',
  woodenClub: 'blunt',
  pickFlint: 'pierce', pickStone: 'pierce', pickScrap: 'pierce', oreVein: 'pierce',
  axeFlint: 'slash', axeStone: 'slash', axeScrap: 'slash', axeBronze: 'slash',
  shoot: 'ranged',
};
Object.keys(expected).forEach(k => {
  console.log('  ' + k.padEnd(14) + expected[k] + ':', G.damageTypeOf(k) === expected[k]);
});
console.log('  every ranged weapon is type "ranged":',
  Object.keys(G.CARDS).filter(k => !G.isFoilCardKey(k) && G.CARDS[k].kind === 'ranged')
    .every(k => G.damageTypeOf(k) === 'ranged'));
console.log('  fishing gear is deliberately untyped:',
  G.damageTypeOf('fishingNet') === null && G.damageTypeOf('fishingRod') === null);
console.log('  a non-attack card has no type:', G.damageTypeOf('forage') === null);
console.log('  a foil inherits its base card\'s type:',
  G.damageTypeOf(G.foilKey('axeStone')) === 'slash');

console.log('\n== the multiplier itself ==');
console.log('  untyped target is unaffected:', G.damageMult({ hp: 5 }, 'slash') === 1);
console.log('  a type it neither resists nor is weak to is 1x:',
  G.damageMult({ weak: ['pierce'] }, 'slash') === 1);
console.log('  array shorthand weak -> TUNE.weakMult:',
  G.damageMult({ weak: ['pierce'] }, 'pierce') === G.TUNE.weakMult);
console.log('  array shorthand resist -> TUNE.resistMult:',
  G.damageMult({ resist: ['blunt'] }, 'blunt') === G.TUNE.resistMult);
console.log('  explicit per-type number wins:',
  G.damageMult({ weak: { pierce: 3 } }, 'pierce') === 3);
console.log('  explicit 0 means immune:', G.damageMult({ resist: { slash: 0 } }, 'slash') === 0);
console.log('  no damage type at all -> always 1x:',
  G.damageMult({ weak: ['pierce'] }, null) === 1);

console.log('\n== it actually lands on a real swing ==');
function swingPickAt(locDef, dmg) {
  G.wipe(); S.zone = 'aerendell'; S.weight = 0;
  G.LOCATIONS.__testRock = Object.assign({ name: 'Test Rock', hp: 100, sprite: 'stone', requires: 'mine', dropTable: [] }, locDef);
  S.locationField = [{ key: '__testRock', hp: 100 }, null, null];
  /* the damage type is read off the card being PLAYED (G.current),
     exactly as G.resolveCard sets it — see the note in damageLocation */
  G.current = { key: 'pickStone', index: 0 };                // pickStone = pierce
  const r = G.damageLocation(dmg, 'mine', 0);
  const dealt = 100 - S.locationField[0].hp;
  delete G.LOCATIONS.__testRock;
  return { dealt, r };
}
console.log('  plain target takes full damage (10):', swingPickAt({}, 10).dealt === 10);
console.log('  weak to pierce takes double (20):', swingPickAt({ weak: ['pierce'] }, 10).dealt === 20);
console.log('  resistant to pierce takes half (5):', swingPickAt({ resist: ['pierce'] }, 10).dealt === 5);
console.log('  resistance to a DIFFERENT type does nothing (10):',
  swingPickAt({ resist: ['blunt'] }, 10).dealt === 10);
console.log('  a resisted hit never rounds down to 0 — floors at 1:',
  swingPickAt({ resist: { pierce: 0.01 } }, 1).dealt === 1);
console.log('  explicit immunity really is 0:',
  swingPickAt({ resist: { pierce: 0 } }, 10).dealt === 0);

console.log('\n== the event reports what actually landed ==');
let seen = null;
G.on('location:hurt', e => { seen = e; });
swingPickAt({ weak: ['pierce'] }, 10);
console.log('  location:hurt carries the applied dmg and multiplier:',
  !!seen && seen.dmg === 20 && seen.mult === G.TUNE.weakMult);

console.log('\n== SHIPS INERT: no live content is affected yet ==');
const assigned = Object.keys(G.LOCATIONS).filter(k => G.LOCATIONS[k].weak || G.LOCATIONS[k].resist);
console.log('  no location declares weak/resist yet:',
  assigned.length === 0, assigned.length ? '(' + assigned.join(', ') + ')' : '');
console.log('  so every real card-vs-location pair is still exactly 1x:',
  Object.keys(G.LOCATIONS).every(lk =>
    Object.keys(expected).every(ck => G.damageMult(G.LOCATIONS[lk], G.damageTypeOf(ck)) === 1)));
