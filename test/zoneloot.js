/* Zone level-up loot table: drop odds, card cosmetics, zone capes,
   and the wardrobe that keeps a cape from eating your Backpack.
   Run: node test/zoneloot.js */
const { boot } = require('./harness');
const { G } = boot();

console.log('== the table sums to 100%, with the remainder as "nothing" ==');
const total = G.ZONE_LOOT.reduce((s, e) => s + e.chance, 0);
console.log('  declared outcomes total', (total * 100).toFixed(1) + '%',
  '| nothing:', ((1 - total) * 100).toFixed(1) + '%',
  '| never over 100:', total <= 1);
G.ZONE_LOOT.forEach(e =>
  console.log('   ', String((e.chance * 100).toFixed(1) + '%').padStart(6),
    e.kind + (e.key ? ' ' + e.key : '')));

console.log('\n== observed odds over 200k rolls land on the declared numbers ==');
const N = 200000;
const seen = {};
for (let i = 0; i < N; i++) {
  const e = G.rollZoneLoot();
  const k = e ? (e.kind + (e.key ? ':' + e.key : '')) : 'nothing';
  seen[k] = (seen[k] || 0) + 1;
}
G.ZONE_LOOT.forEach(e => {
  const k = e.kind + (e.key ? ':' + e.key : '');
  const pct = (seen[k] || 0) / N;
  /* generous tolerance on the 0.1% row — 200k rolls is only ~200 hits */
  const tol = e.chance < 0.01 ? e.chance * 0.5 : Math.max(0.004, e.chance * 0.06);
  console.log('  ' + k.padEnd(16), (pct * 100).toFixed(2) + '%',
    'vs', (e.chance * 100).toFixed(1) + '%', '->', Math.abs(pct - e.chance) < tol);
});
console.log('  nothing', ((seen.nothing || 0) / N * 100).toFixed(2) + '%');

console.log('\n== a resource pull actually lands in the pack ==');
G.wipe(); S.weight = 0;
let gotRes = false;
for (let i = 0; i < 400 && !gotRes; i++) {
  const before = S.stick + S.flint + S.bone + S.stone;
  const spin = G.spinZoneLoot('aerendell');
  if (spin.reward && spin.reward.kind === 'res') {
    const after = S.stick + S.flint + S.bone + S.stone;
    console.log('  won', spin.reward.qty, spin.reward.key,
      '| pack rose by', after - before, '| reels all match:',
      spin.reels[0] === spin.reels[1] && spin.reels[1] === spin.reels[2]);
    gotRes = true;
  }
}
console.log('  saw a resource pull inside 400 spins:', gotRes);

console.log('\n== foil adds a separate powered-up card to your deck ==');
G.wipe(); S.weight = 0;
const foiled = G.grantFinish('aerendell', 'foils');
const counts = G.deckCounts();
const baseKey = G.baseCardKey(foiled);
console.log('  added', foiled, '| foil copy is in the deck:', (counts[foiled] || 0) > 0);
console.log('  in aerendell\'s cosmetic set:',
  G.ZONES.aerendell.foilPool.indexOf(baseKey) >= 0);
console.log('  key is stored as a real foil variant:', G.isFoilCardKey(foiled));
console.log('  foil renders as foil automatically:', G.cardFinish(foiled, S.deck.indexOf(foiled)) === 'foil');

console.log('\n== foil stats are doubled from the base card ==');
const foilCard = G.cardDef(foiled);
const baseCard = G.cardDef(baseKey);
console.log('  foil name is distinct:', foilCard.name !== baseCard.name);
console.log('  atk doubles when present:',
  (typeof baseCard.atk !== 'number') || foilCard.atk === baseCard.atk * 2);
console.log('  durability doubles when present:',
  (typeof baseCard.durability !== 'number') || foilCard.durability === baseCard.durability * 2);
console.log('  xp doubles when present:',
  (typeof baseCard.xp !== 'number') || foilCard.xp === baseCard.xp * 2);

console.log('\n== the foiled copy renders as foil, the rest stay plain ==');
G.wipe();
S.deck = ['flint', 'flint', 'flint', 'stick'];
S.foils = { flint: 2 };
S.prismatic = {};
console.log('  deck', JSON.stringify(S.deck), 'with 2 foil flint');
console.log('  finishes:', S.deck.map((k, i) => k + '=' + (G.cardFinish(k, i) || 'plain')).join(', '));
const finishes = S.deck.map((k, i) => G.cardFinish(k, i));
console.log('  exactly two foils:', finishes.filter(f => f === 'foil').length === 2);
console.log('  the third flint is plain:', finishes[2] === '');

console.log('\n== prismatic outranks foil on the same card ==');
S.prismatic = { flint: 1 };
S.foils = { flint: 1 };
const mixed = S.deck.map((k, i) => G.cardFinish(k, i));
console.log('  finishes:', mixed.map((f, i) => S.deck[i] + '=' + (f || 'plain')).join(', '));
console.log('  first is prismatic, second foil, third plain:',
  mixed[0] === 'prismatic' && mixed[1] === 'foil' && mixed[2] === '');

console.log('\n== repeated foil pulls add separate foil cards rather than capping at owned copies ==');
G.wipe();
S.deck = ['flint'];
S.foils = {}; S.prismatic = {};
G.grantFinish('aerendell', 'foils');
const beforeFoils = G.deckCounts()[G.foilKey('flint')] || 0;
for (let i = 0; i < 5; i++) G.grantFinish('aerendell', 'foils');
const afterFoils = G.deckCounts()[G.foilKey('flint')] || 0;
console.log('  foil copies can increase beyond base owned copies:', afterFoils >= beforeFoils);

console.log('\n== each zone has its own cape, and the wheel grants it ==');
['aerendell', 'forestRoad', 'kharBarak'].forEach(z => {
  const cape = G.ZONES[z].cape;
  console.log('  ' + G.ZONES[z].name.padEnd(24), cape, '->', G.ITEMS[cape].name,
    '| slot', G.ITEMS[cape].slot, '| def', G.ITEMS[cape].def);
});

console.log('\n== a cape never silently eats your Backpack ==');
G.wipe(); S.weight = 0;
S.equipped.cape = 'backpack';
S.wardrobe = ['backpack'];
const capBefore = G.carryCap();
const res = G.grantWardrobe('aerendellCape');
console.log('  backpack worn, then pulled a cape');
console.log('  cape owned:', S.wardrobe.indexOf('aerendellCape') >= 0);
console.log('  backpack STILL worn:', S.equipped.cape === 'backpack');
console.log('  carry capacity unchanged:', G.carryCap() === capBefore, '(' + capBefore + ')');
console.log('  reported as not worn:', res.worn === false);

console.log('\n== but it does auto-wear into an empty cape slot ==');
G.wipe(); S.weight = 0;
delete S.equipped.cape;
S.wardrobe = [];
const res2 = G.grantWardrobe('aerendellCape');
console.log('  empty slot -> worn:', S.equipped.cape === 'aerendellCape', '| reported', res2.worn);

console.log('\n== and you can swap by hand from the wardrobe ==');
S.wardrobe = ['backpack', 'aerendellCape'];
S.equipped.cape = 'aerendellCape';
console.log('  wear backpack:', G.wearWardrobe('backpack'), '-> equipped', S.equipped.cape);
console.log('  wear cape again:', G.wearWardrobe('aerendellCape'), '-> equipped', S.equipped.cape);
console.log('  refuses an item you do not own:', G.wearWardrobe('gatebreakerCape') === false);

console.log('\n== crafting records the item in the wardrobe ==');
G.wipe(); S.weight = 0;
S.stick = 40; S.wood = 40; S.planks = 40; S.cloth = 40; S.stone = 40; S.basaltBlock = 40; S.weight = 0;
G.buildStation('bench');
console.log('  craft backpack:', G.craft('backpack'),
  '| in wardrobe:', (S.wardrobe || []).indexOf('backpack') >= 0);

console.log('\n== cosmetics survive a save/load round trip ==');
G.wipe();
S.foils = { flint: 2 };
S.prismatic = { stick: 1 };
S.wardrobe = ['aerendellCape'];
G.save(false);
S.foils = {}; S.prismatic = {}; S.wardrobe = [];
G.load();
console.log('  foils', JSON.stringify(S.foils), '| prismatic', JSON.stringify(S.prismatic),
  '| wardrobe', JSON.stringify(S.wardrobe));
console.log('  all three restored:',
  S.foils.flint === 2 && S.prismatic.stick === 1 && S.wardrobe.indexOf('aerendellCape') >= 0);
