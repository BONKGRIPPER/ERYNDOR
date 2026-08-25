/* Aggro enemies (G.LOCATIONS[key].aggro) chip the player for
   aggroDmg on EVERY card played while they're alive on the field —
   any kind, not just an attack aimed at them — on top of the normal
   atk-based retaliate on a failed kill. meleeBonusDmg adds extra
   retaliate damage specifically when the failed kill attempt was a
   melee card. A shared 'enemy:attack' event fires for both sources,
   used to drive the enemy-strike animation (main.js) regardless of
   which triggered it. Run: node test/aggro.js */
const { boot } = require('./harness');
const { G, store } = boot();
const give = (k, n) => { S[k] = (S[k] || 0) + n; S.weight = 0; };

function playHand(key, target) {
  S.weight = 0;
  G.current = { key, index: 0 };
  G.rt.windowOpen = true; G.rt.tapped = false;
  G.resolveCard(false, target);
}

/* Retaliate damage doubles at night (TUNE.nightAtkMult, Batch 3) and
   G.isNight() reads the REAL wall clock in tests (only Date.now() is
   mocked, not the day/night calc built on it) — force day so the
   damage-math assertions below stay deterministic regardless of what
   time it actually is when this runs. */
const realIsNight = G.isNight;
G.isNight = () => false;

console.log('== the goblin definition carries aggro fields ==');
console.log('  aggro:', G.LOCATIONS.goblin.aggro === true);
console.log('  aggroDmg 1:', G.LOCATIONS.goblin.aggroDmg === 1);
console.log('  meleeBonusDmg 2:', G.LOCATIONS.goblin.meleeBonusDmg === 2);

console.log('\n== a non-combat card played while an aggro enemy sits on the field still hurts ==');
G.wipe();
S.locationField = [{ key: 'goblin', hp: 5 }, null, null];
S.hp = 10;
give('flint', 0); give('stick', 0);
playHand('flint');   // a plain gather card, no melee/ranged involved at all
console.log('  player took the passive aggro tick:', S.hp === 9);

console.log('\n== it does NOT fire when no aggro enemy is present ==');
G.wipe();
S.locationField = [{ key: 'pineTree', hp: 4 }, null, null];
S.hp = 10;
playHand('flint');
console.log('  no aggro tick, hp untouched:', S.hp === 10);

console.log('\n== it fires once per card played, stacking with normal melee retaliate ==');
G.wipe();
S.locationField = [null, null, { key: 'goblin', hp: 5 }];
S.hp = 20;
playHand('strikeStone', 2);   // atk 2, no clean tap, won't drop a 5hp goblin
/* expected: aggro tick (1) + melee retaliate (goblin atk 5 + meleeBonusDmg 2 = 7) = 8 total,
   the goblin surviving the 2 dmg hit (5hp - 2 = 3 left). A cleared
   slot refills immediately (G.fillLocationField) rather than staying
   null, so "still there" means "still the same goblin object", not
   just "slot isn't empty". */
console.log('  goblin survived the swing:', S.locationField[2] && S.locationField[2].key === 'goblin');
console.log('  took both the aggro tick AND the boosted melee retaliate:', S.hp === 20 - 1 - 7);

console.log('\n== killing the aggro enemy this turn still counts as "alive when played" ==');
G.wipe();
S.locationField = [null, null, { key: 'goblin', hp: 2 }];
S.hp = 20;
playHand('strikeStone', 2);   // exactly enough dmg to kill a 2hp goblin
console.log('  goblin is dead:', !S.locationField[2] || S.locationField[2].key !== 'goblin');
console.log('  the aggro tick still landed (it was alive at the moment the card was played):', S.hp === 19);
console.log('  no melee retaliate from a dead enemy:', S.hp !== 12);

console.log('\n== a shared enemy:attack event fires for both the aggro tick and normal retaliate ==');
G.wipe();
let attacks = [];
G.on('enemy:attack', d => attacks.push(d));

S.locationField = [null, null, { key: 'goblin', hp: 5 }];
S.hp = 20;
playHand('strikeStone', 2);
console.log('  fired exactly twice this turn (aggro tick + melee retaliate):', attacks.length === 2);
console.log('  both name the goblin:', attacks.every(a => a.name === 'Road Goblin'));
console.log('  both carry the field index (2):', attacks.every(a => a.index === 2));

attacks = [];
S.locationField = [{ key: 'pineTree', hp: 4 }, null, null];
playHand('flint');
console.log('  no enemy:attack at all when nothing hostile is on the field:', attacks.length === 0);

console.log('\n== retaliate (banner event) is unaffected — still melee/ranged only, no aggro spam ==');
G.wipe();
let retaliates = 0;
G.on('retaliate', () => retaliates++);
S.locationField = [null, null, { key: 'goblin', hp: 5 }];
S.hp = 20;
playHand('flint');   // non-combat card, only the aggro tick should apply
console.log('  no retaliate banner from a passive aggro tick:', retaliates === 0);

G.isNight = realIsNight;
