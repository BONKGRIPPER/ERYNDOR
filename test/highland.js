/* Highland Sheep, Highland Cloth, and the Highland Robes set bonus.
   Run: node test/highland.js */
const { boot } = require('./harness');
const { G } = boot();
const give = (k, n) => { S[k] = (S[k] || 0) + n; S.weight = 0; };
/* location decks are now 3 independent per-slot compositions, not one
   object — membership means "in any of the zone's slots" */
const inLocationDecks = (zone, key) =>
  (G.ZONES[zone].locationDecks || []).some(comp => key in (comp || {}));

console.log('== Highland Sheep matches the Highland Cow, Aerendell only ==');
console.log('  hp/atk match cow:',
  G.LOCATIONS.sheep.hp === G.LOCATIONS.cow.hp &&
  G.LOCATIONS.sheep.atk === G.LOCATIONS.cow.atk);
/* zone membership is just presence in one of that zone's location
   slot decks now — no separate spawn-weight zone list to keep in
   sync with it */
console.log('  sheep in aerendell\'s location decks:', inLocationDecks('aerendell', 'sheep'));
console.log('  sheep NOT in forestRoad\'s location decks:', !inLocationDecks('forestRoad', 'sheep'));

console.log('\n== Highland Wool -> Highland Cloth at the loom ==');
G.wipe(); S.zone = 'aerendell'; S.weight = 0;
give('wood', 20); give('stick', 20);
G.buildStation('loom');
console.log('  spin without wool:', G.craft('highlandCloth'), '(expect false)');
give('highlandWool', 8);
console.log('  spin with wool:', G.craft('highlandCloth'), '| cloth', S.highlandCloth);

console.log('\n== armor bench: no scrap metal required to build ==');
G.wipe(); S.zone = 'aerendell'; S.weight = 0;
give('wood', 20); give('planks', 20); give('basaltBlock', 5);
console.log('  build:', G.buildStation('armorBench'));

console.log('\n== highland recipes only show in aerendell, scrap only in forestRoad ==');
const hood = G.findRecipe('highlandHood'), helm = G.findRecipe('scrapHelm');
['aerendell', 'forestRoad', 'kharBarak'].forEach(z => {
  S.zone = z;
  console.log('  ' + z.padEnd(11), 'highlandHood:' + (G.inZone(hood) ? 'yes' : 'no '),
    ' scrapHelm:' + (G.inZone(helm) ? 'yes' : 'no '));
});

console.log('\n== crafting the full set ==');
S.zone = 'aerendell'; S.weight = 0;
give('highlandCloth', 40); give('leather', 40);
console.log('  hood:', G.craft('highlandHood'));
console.log('  cloak:', G.craft('highlandCloak'));
console.log('  legs:', G.craft('highlandLegs'));
console.log('  cape:', G.craft('highlandCape'));
console.log('  equipped:', JSON.stringify(S.equipped));
console.log('  hasHighlandSet:', G.hasHighlandSet());
console.log('  warmth (3 pieces x 1):', G.warmth(), '(expect 3)');
console.log('  defense includes the set:', G.defense() >= 3);

console.log('\n== xp bonus only applies in Leth-Eiren, and only with the full set ==');
S.zone = 'aerendell';
console.log('  xpBonusMult in aerendell with set:', G.xpBonusMult(), '(expect', G.TUNE.highlandSetXpMult + ')');
S.zone = 'forestRoad';
console.log('  xpBonusMult in forestRoad with set:', G.xpBonusMult(), '(expect', G.TUNE.highlandSetXpMult + ', still Leth-Eiren)');
S.zone = 'kharBarak';
console.log('  xpBonusMult in kharBarak with set:', G.xpBonusMult(), '(expect 1, different region)');
S.zone = 'aerendell';
delete S.equipped.cape;
console.log('  xpBonusMult with cape removed:', G.xpBonusMult(), '(expect 1, set broken)');

console.log('\n== the bonus actually lands in grantXp / grantZoneXp ==');
S.zone = 'aerendell';
S.equipped.cape = 'highlandCape';   // already owned — just re-equip to complete the set
S.skills.mining.xp = 0;
G.grantXp('mining', 10);
console.log('  skill xp with set active:', S.skills.mining.xp, '(expect', 10 * G.TUNE.highlandSetXpMult + ')');
const zBefore = S.zoneXp.aerendell.xp;
G.grantZoneXp('aerendell', 10);
console.log('  zone xp with set active:', S.zoneXp.aerendell.xp - zBefore, '(expect', 10 * G.TUNE.highlandSetXpMult + ')');
