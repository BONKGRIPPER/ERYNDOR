/* Two small prayer-economy changes:
   1. Moving a card in or out of a deck (purge/restore/deck-slot move)
      now costs 2x prayer points per gear tier the card carries — see
      G.cardTierMult/G.purgeCost/G.deckMoveCost, core.js.
   2. The Donate bar's zone-xp payout per fill is 10x what it used to
      be (TUNE.donateXpPerFill, was a flat +1) — see G.donateItems,
      systems/craft.js.
   Run: node test/tieredprayer.js */
const { boot } = require('./harness');
const { G } = boot();
const give = (k, n) => { S[k] = (S[k] || 0) + n; S.weight = 0; };

console.log('== prayer cost doubles per gear tier ==');
const base = G.purgeCost();     // no key -> flat rate, tier mult x1
console.log('  Flint Pick (tier 0) costs the flat rate:', G.purgeCost('pickFlint') === base);
console.log('  Stone Pick (tier 1) costs 2x:', G.purgeCost('pickStone') === base * 2);
console.log('  Scrap Pick (tier 2) costs 4x:', G.purgeCost('pickScrap') === base * 4);
console.log('  Bronze Axe (tier 3) costs 8x:', G.purgeCost('axeBronze') === base * 8);
console.log('  a non-equipment card (no tier field at all) costs the flat rate:',
  G.purgeCost('forage') === base);

console.log('\n== a foil variant costs the same as its base card\'s tier ==');
const foilKey = G.foilKey('axeStone');
console.log('  foil Stone Axe still costs the tier-1 rate:', G.purgeCost(foilKey) === base * 2);

console.log('\n== deck-slot move cost scales the same way ==');
const baseMove = G.deckMoveCost();
console.log('  tier-2 card costs 4x to move:', G.deckMoveCost('pickScrap') === baseMove * 4);

console.log('\n== purging a higher-tier card actually spends the scaled cost ==');
G.wipe(); S.zone = 'aerendell'; S.weight = 0;
give('stone', 40); give('planks', 40); give('basaltBlock', 20); give('stoneBlock', 20); give('wood', 40);
G.buildStation('bench');
G.craft('stonePick');
S.deck.splice(S.drawnCount, 0, 'pickStone');
S.prayerPoints = 99;
const ppBefore = S.prayerPoints;
const tierCost = G.purgeCost('pickStone');
console.log('  purge succeeds:', G.purgeCard('pickStone'));
console.log('  spent exactly the tier-1 (2x) cost, not the flat rate:',
  S.prayerPoints === ppBefore - tierCost && tierCost === base * 2);

console.log('\n== restoring it back costs the same scaled amount ==');
const ppBefore2 = S.prayerPoints;
console.log('  restore succeeds:', G.restoreCard('pickStone'));
console.log('  spent the same tier-1 cost again:', S.prayerPoints === ppBefore2 - tierCost);

console.log('\n== the Donate bar now grants 10x zone xp per fill ==');
G.wipe(); S.zone = 'aerendell'; S.weight = 0;
give('diamond', 5);                          // worth 25 each, batch 5 -> 125 worth per donate call
console.log('  TUNE.donateXpPerFill is 10 (was a flat 1):', G.TUNE.donateXpPerFill === 10);
let grantedTotal = 0;
G.on('zone:levelup', () => {});              // avoid unrelated noise, xp is read from the event below
const origGrant = G.grantZoneXp;
G.grantZoneXp = function (zone, amt) { grantedTotal += amt; return origGrant(zone, amt); };
const result = G.donateItems(['diamond']);
G.grantZoneXp = origGrant;
console.log('  donation crossed the 50-worth threshold twice (125 worth), reporting 20 xp:', result.xpGranted === 20);
console.log('  G.grantZoneXp was actually called for a total of 20 xp:', grantedTotal === 20);
