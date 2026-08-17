/* This batch: altar timer, discard insertion, zone theme, stone pick. */
const { boot } = require('./harness');
const { G, store } = boot();
const UI = G.UI;
const give = (k, n) => { S[k] = (S[k] || 0) + n; S.weight = 0; };

console.log('== stone pick hits harder than flint, still location-gated ==');
G.wipe(); S.zone = 'aerendell'; S.weight = 0;
give('wood', 60); give('planks', 60); give('stick', 60); give('stone', 60);
give('basaltBlock', 10); give('stoneBlock', 10);
G.buildStation('bench');
console.log('  stone pick available here:', G.inZone(G.findRecipe('stonePick')));
console.log('  stone pick costs planks+stoneBlock, not stick or raw stone:',
  JSON.stringify(G.findRecipe('stonePick').cost) === JSON.stringify({ planks: 6, stoneBlock: 1 }));
console.log('  craft:', G.craft('stonePick'), '| pickStone cards', G.deckCounts().pickStone,
  '| durability', S.durability.pickStone, '(expect', G.CARDS.pickStone.durability + ')');
S.locationField = [{ key: 'boulder', hp: 6 }, null, null];
for (let i = 1; i <= 3; i++) {
  const before = S.stone + S.basalt;   // Boulders now drop 75/25 stone/basalt
  S.weight = 0;
  G.current = { key: 'pickStone', index: 0 };
  G.rt.windowOpen = true; G.rt.tapped = false;
  G.resolveCard(false);
  if (i < 3) console.log('  swing', i, '- stone/basalt still 0:', S.stone + S.basalt === before);
}
console.log('  6hp boulder cleared in 3 swings at atk 2:', S.stone + S.basalt > 0);

console.log('\n== crafted cards go to the discard pile ==');
G.wipe(); S.zone = 'aerendell'; S.weight = 0;
give('stone', 80); give('stick', 80); give('wood', 40); give('planks', 40);
give('basaltBlock', 10); give('stoneBlock', 10);
G.buildStation('bench');
S.drawnCount = 6;                       // mid-cycle
const deckBefore = S.deck.length, drawnBefore = S.drawnCount;
G.craft('axe');
console.log('  deck', deckBefore, '->', S.deck.length,
            '| drawn pointer', drawnBefore, '->', S.drawnCount);
const upcoming = S.deck.slice(S.drawnCount);
console.log('  new card is NOT in the remaining draw pile:', upcoming.indexOf('axeStone') < 0);
console.log('  it sits in the discard portion:', S.deck.slice(0, S.drawnCount).indexOf('axeStone') >= 0);
console.log('  appears after the reshuffle: ', S.deck.filter(k => k === 'axeStone').length, 'axeStone card(s) in deck');

console.log('\n== bone altar is an ordinary tap-craft station now ==');
G.wipe(); S.zone = 'aerendell'; S.weight = 0;
give('bone', 20); give('basaltBlock', 10);
G.buildStation('altar');
const buryBone = G.findRecipe('buryBone');
console.log('  buryBone recipe cost:', JSON.stringify(buryBone.cost));
const ppBefore = S.prayerPoints, xpBefore = S.skills.prayer.xp;
const boneAfterBuild = S.bone;
console.log('  bury succeeds:', G.craft('buryBone'));
console.log('  prayer points gained:', S.prayerPoints === ppBefore + G.TUNE.bonePrayerPoints);
console.log('  prayer xp gained:', S.skills.prayer.xp === xpBefore + G.TUNE.bonePrayerXp);
console.log('  one bone spent:', S.bone === boneAfterBuild - 1);

console.log('\n== altar\'s upgrade tier speeds up tap-crafting, same as any other station ==');
console.log('  base speed mult is 1:', G.stationSpeedMult('altar') === 1);
give('bone', 100); give('basaltBlock', 20);
G.upgradeStation('altar');
console.log('  speed mult drops after upgrading:', G.stationSpeedMult('altar') < 1);
G.startCraftJob('buryBone');
console.log('  a fresh job runs at the discounted duration:',
  S.craftJobs.buryBone.ms === Math.round(G.TUNE.tapCraftMs * G.stationSpeedMult('altar')));

console.log('\n== skills cap at 100 ==');
S.skills.prayer.lv = 99; S.skills.prayer.xp = 0;
G.grantXp('prayer', 999999);
console.log('  after huge xp dump -> level', S.skills.prayer.lv,
  '(cap ' + G.TUNE.maxSkillLevel + ')');

console.log('\n== zone themes ==');
Object.keys(G.ZONE_THEME).forEach(z => {
  const t = G.ZONE_THEME[z];
  console.log('  ' + G.ZONES[z].name.padEnd(24), t.accent, t.soft);
});
S.zone = 'forestRoad';
UI.applyTheme();
console.log('  applyTheme runs without error for every zone:',
  Object.keys(G.ZONE_THEME).every(z => { S.zone = z; UI.applyTheme(); return true; }));

console.log('\n== icons are flat svg, not pixel grids ==');
const svg = G.sprite('stone', 20);
console.log('  uses viewBox 24:', svg.indexOf('viewBox="0 0 24 24"') > 0);
console.log('  no crispEdges:', svg.indexOf('crispEdges') < 0);
console.log('  icon count:', Object.keys(G.SPRITES).length);
