/* Villagers are now 5x slower than before on top of their existing
   5x-slower-than-a-player's-own-tap rate — G.villagerCraftMult is
   25, not 5 (data.js). And Forage's flax/berries yield is halved
   (TUNE.forageHerbMult), applied after every other multiplier (crit,
   foraging skill, foil) — seeds keep their old chance AND quantity,
   untouched. Run: node test/villagerslowdown.js */
const { boot } = require('./harness');
const { G } = boot();
const give = (k, n) => { S[k] = (S[k] || 0) + n; S.weight = 0; };

console.log('== villagers are 25x slower than a player\'s own tap, not 5x ==');
console.log('  TUNE.forageHerbMult exists and is 0.5:', G.TUNE.forageHerbMult === 0.5);
console.log('  villagerCraftMult is 25:', G.villagerCraftMult() === 25);
G.wipe(); S.zone = 'aerendell'; S.weight = 0;
give('planks', 40); give('stick', 40); give('cloth', 10);
G.buildStation('loom');
console.log('  loom interval is 25x the base tap-craft duration:',
  G.villagerInterval('loom') === Math.round(G.TUNE.tapCraftMs * 25 * G.stationSpeedMult('loom')));

console.log('\n== a villager genuinely takes 5x longer, tick for tick, than before this change ==');
G.hireVillagerAt('loom');
G.zoneGrant('aerendell', 'flax', 200);
const oldInterval = Math.round(G.TUNE.tapCraftMs * 5 * G.stationSpeedMult('loom'));
global.__clock += oldInterval;      // exactly one OLD-length interval
let r = G.collectVillagerWork();
console.log('  no work done yet at the old (now 5x too short) interval:', r.results.length === 0);
global.__clock += oldInterval * 4;  // now a full 5x-old = 1x-new interval has elapsed
r = G.collectVillagerWork();
console.log('  exactly one tick lands once the real (25x) interval has elapsed:', r.results[0].applied === 1);

console.log('\n== forage yields half the flax/berries it used to, seeds untouched ==');
/* Forage is zone-gated now (see test/zoneforage.js) — Aerendell only
   ever rolls berries/berrySeed, a single independent 15% seed check
   rather than the old two-independent-rolls "~27.75% either" shape,
   so the sanity bounds below are centered on a single 15% event
   (n=400, mean=60, sd~7) rather than the old wider ones. */
G.wipe(); S.zone = 'aerendell'; S.weight = 0;
const trials = 400;
let herbTotal = 0, seedHits = 0;
for (let i = 0; i < trials; i++) {
  const roll = G.rollForage();
  const mult = 1; // base skill/foil mult at lv1, no foil
  Object.keys(roll).forEach(k => { roll[k] *= mult; });
  if (roll.flax) herbTotal += roll.flax;
  if (roll.berries) herbTotal += roll.berries;
  if (roll.flaxSeed || roll.berrySeed) seedHits++;
}
console.log('  rollForage/seed CHANCE itself is untouched by this change (still ~15%, sanity only):',
  seedHits > trials * 0.08 && seedHits < trials * 0.25);

G.wipe(); S.zone = 'aerendell'; S.weight = 0;
const face = G.cardKinds.forage.face(G.CARDS.forage);
const flaxFace = face.yields.find(y => y.key === 'berries');
const seedFace = face.yields.find(y => y.key === 'berrySeed');
console.log('  card face shows the halved herb qty (mult 1 -> floor(0.5) -> min 1):', flaxFace.qty === 1);
console.log('  card face shows the FULL seed qty, unaffected:', seedFace.qty === 1);

/* Drive resolve() directly with a forced non-crit flax roll to check
   the actual spent/gained amount, not just the face preview. */
G.rollForage = () => ({ flax: 4 });   // pretend a higher mult already rolled 4
const ctx = { key: 'forage', card: G.CARDS.forage, hit: false, encumbered: false, gains: [] };
G.cardKinds.forage.resolve(ctx);
console.log('  resolve halves an already-multiplied flax roll (4 -> 2):',
  ctx.gains.length === 1 && ctx.gains[0].key === 'flax' && ctx.gains[0].qty === 2);

G.rollForage = () => ({ flax: 1, flaxSeed: 1 });
S.flax = 0; S.flaxSeed = 0;
const ctx2 = { key: 'forage', card: G.CARDS.forage, hit: false, encumbered: false, gains: [] };
G.cardKinds.forage.resolve(ctx2);
console.log('  a floor(1*0.5)=0 herb roll still floors up to a minimum of 1, not 0:',
  ctx2.gains.some(g => g.key === 'flax' && g.qty === 1));
console.log('  the seed in the same roll is completely unaffected (still 1, not halved):',
  ctx2.gains.some(g => g.key === 'flaxSeed' && g.qty === 1));
