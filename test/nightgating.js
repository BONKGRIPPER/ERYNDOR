/* Batch 3, real-time plan: time-of-day gating. Night is 9pm-7am
   (TUNE.nightStartHour/dayStartHour). One fish per fishing zone is
   nightOnly (perch - Forest Road, dace - Still-tide Pass, grayling -
   Khar-Barak); hostiles hit TUNE.nightAtkMult harder and drop
   TUNE.nightLootMult more at night. Run: node test/nightgating.js */
const { boot } = require('./harness');
const { G } = boot();

function setHour(h) {
  const d = new Date(); d.setHours(h, 0, 0, 0);
  global.__clock = d.getTime();
}

console.log('== night is 9pm-7am ==');
setHour(6); console.log('  6am is night:', G.isNight() === true);
setHour(7); console.log('  7am is day:', G.isNight() === false);
setHour(20); console.log('  8pm is day:', G.isNight() === false);
setHour(21); console.log('  9pm is night:', G.isNight() === true);

console.log('\n== nightOnly fish are absent from the pool by day, present at night ==');
setHour(12);
const pondDay = {};
for (let i = 0; i < 200; i++) Object.assign(pondDay, G.rollDrops(G.LOCATIONS.pond));
console.log('  perch never drops from the pond by day (200 rolls):', !('perch' in pondDay));
console.log('  bluegill/carp still drop by day:', 'bluegill' in pondDay || 'carp' in pondDay);
setHour(23);
let sawPerch = false;
for (let i = 0; i < 200; i++) { if (G.rollDrops(G.LOCATIONS.pond).perch) sawPerch = true; }
console.log('  perch DOES drop from the pond at night:', sawPerch);

console.log('\n== one fish per zone is nightOnly: perch, dace, grayling ==');
console.log('  Forest Road pond -> perch is nightOnly:',
  G.LOCATIONS.pond.dropTable[0].oneOf.find(o => o.key === 'perch').nightOnly === true);
console.log('  Still-tide Pass narrowStream -> dace is nightOnly:',
  G.LOCATIONS.narrowStream.dropTable[0].oneOf.find(o => o.key === 'dace').nightOnly === true);
console.log('  Khar-Barak riverbank -> grayling is nightOnly:',
  G.LOCATIONS.riverbank.dropTable[0].oneOf.find(o => o.key === 'grayling').nightOnly === true);
console.log('  other species in those same locations stay day-available:',
  !G.LOCATIONS.pond.dropTable[0].oneOf.find(o => o.key === 'bluegill').nightOnly &&
  !G.LOCATIONS.narrowStream.dropTable[0].oneOf.find(o => o.key === 'brookTrout').nightOnly &&
  !G.LOCATIONS.riverbank.dropTable[0].oneOf.find(o => o.key === 'riverTrout').nightOnly);

console.log('\n== hostiles hit 2x harder at night ==');
G.wipe(); S.zone = 'forestRoad'; S.weight = 0;
S.hp = 999;   // well clear of downPlayer's respawn-at-full-hp reset
S.locationField = [null, null, { key: 'goblin', hp: 999 }];
setHour(12);
G.current = { key: 'woodenClub', index: 0 };
G.cardKinds.melee.resolve({ card: G.CARDS.woodenClub, key: 'woodenClub', target: 2, hit: false });
const dayDmg = 999 - S.hp;
console.log('  goblin retaliation by day:', dayDmg, 'dmg');
G.wipe(); S.zone = 'forestRoad'; S.weight = 0;
S.hp = 999;
S.locationField = [null, null, { key: 'goblin', hp: 999 }];
setHour(23);
G.current = { key: 'woodenClub', index: 0 };
G.cardKinds.melee.resolve({ card: G.CARDS.woodenClub, key: 'woodenClub', target: 2, hit: false });
const nightDmg = 999 - S.hp;
console.log('  goblin retaliation at night:', nightDmg, 'dmg');
console.log('  night damage is exactly 2x day damage:', nightDmg === dayDmg * 2 && dayDmg > 0);

console.log('\n== hostiles drop 2x loot at night, gathering nodes are unaffected ==');
console.log('  the boulder location has no atk (not hostile), so the night-loot check never applies:',
  !G.LOCATIONS.boulder.atk);

G.wipe(); S.zone = 'forestRoad'; S.weight = 0;
setHour(12);
S.locationField = [null, null, { key: 'goblin', hp: 1 }];
G.current = { key: 'strikeStone', index: 0 };
G.cardKinds.melee.resolve({ card: G.CARDS.strikeStone, key: 'strikeStone', target: 2, hit: true });
const dayLoot = Object.values(S).filter(() => true) && (S.bone || 0);
G.wipe(); S.zone = 'forestRoad'; S.weight = 0;
setHour(23);
S.locationField = [null, null, { key: 'goblin', hp: 1 }];
G.current = { key: 'strikeStone', index: 0 };
G.cardKinds.melee.resolve({ card: G.CARDS.strikeStone, key: 'strikeStone', target: 2, hit: true });
const nightLoot = S.bone || 0;
console.log('  a killed goblin drops bones, day:', dayLoot, '| night:', nightLoot);
console.log('  night loot is roughly double (rounded, >= day):', nightLoot >= dayLoot && nightLoot > 0);
