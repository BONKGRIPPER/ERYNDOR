/* Zone-specific mining, scrap chain, coal. Run: node test/mining.js */
const { boot } = require('./harness');
const { G } = boot();
const give = (k, n) => { S[k] = (S[k] || 0) + n; S.weight = 0; };

/* Swing a pick once against whatever's active on the field. Flint
   tier (atk 1) so the deterministic swing counts below still hold. */
function swing() {
  S.weight = 0;
  G.current = { key: 'pickFlint', index: 0 };
  G.rt.windowOpen = true; G.rt.tapped = false;
  G.resolveCard(false);
}

/* Swing an axe once against whatever's active on the field. */
function chop() {
  S.weight = 0;
  G.current = { key: 'axeFlint', index: 0 };
  G.rt.windowOpen = true; G.rt.tapped = false;
  G.resolveCard(false);
}

console.log('== ore chain moved to Khar-Barak ==');
const furnace = G.findStation('furnace'), pick = G.findRecipe('scrapPick');
['aerendell', 'forestRoad', 'kharBarak'].forEach(z => {
  S.zone = z;
  console.log('  ' + G.ZONES[z].name.padEnd(24),
    'furnace:' + (G.inZone(furnace) ? 'yes' : 'no '),
    ' scrap pick:' + (G.inZone(pick) ? 'yes' : 'no '));
});
/* The "Ore Vein" card used to be seeded by Khar-Barak's own zone
   deck. Zone decks are gone now (the deck is global and travels with
   you), so nothing seeds oreVein from a zone. This line asserted
   against a `deck` block that no longer exists — and it had already
   been failing beforehand anyway, since no zone actually listed
   oreVein even while those blocks were still in place. */
console.log('  no zone seeds an "Ore Vein" card any more (zone decks removed):',
  Object.keys(G.ZONES).every(z => !G.ZONES[z].deck));
console.log('  location decks:',
  'aerendell', JSON.stringify(G.ZONES.aerendell.locationDecks),
  '| forestRoad', JSON.stringify(G.ZONES.forestRoad.locationDecks),
  '| kharBarak', JSON.stringify(G.ZONES.kharBarak.locationDecks));

console.log('\n== goblins drop scrap metal ==');
const t = {};
for (let i = 0; i < 2000; i++) {
  const d = G.rollDrops(G.LOCATIONS.goblin);
  Object.keys(d).forEach(k => t[k] = (t[k] || 0) + 1);
}
Object.keys(t).forEach(k =>
  console.log('  ' + G.RESOURCES[k].name.padEnd(15), (t[k] / 20).toFixed(0) + '% of kills'));

console.log('\n== scrap pick is the only pick out on the road/gate ==');
console.log('  stonePick is Aerendell-only:',
  JSON.stringify(G.findRecipe('stonePick').zones) === JSON.stringify(['aerendell']));
console.log('  scrapPick cost:', JSON.stringify(pick.cost));
G.wipe(); S.zone = 'forestRoad'; S.weight = 0;
give('stone', 60); give('stick', 60);
G.buildStation('bench');
console.log('  craft without scrap:', G.craft('scrapPick'), '(expect false)');
give('scrapMetal', 8);
console.log('  craft with scrap:  ', G.craft('scrapPick'),
  '| pickScrap cards', G.deckCounts().pickScrap);

console.log('\n== picks only work against a location target now ==');
G.wipe();
/* Aerendell now mixes boulder and pineTree in its location deck, so
   force a known field instead of trusting the random draw. */
S.locationField = [{ key: 'boulder', hp: 6 }, { key: 'pineTree', hp: 6 }, null];
const startBoulder = G.activeLocation('mine');
console.log('  starting target:', startBoulder && startBoulder.key,
  '| hp', startBoulder && startBoulder.hp, '(expect boulder, 6)');
for (let i = 1; i <= 6; i++) {
  const before = S.stone + S.basalt;   // Boulders now drop 75/25 stone/basalt
  swing();
  if (i < 6) console.log('  swing', i, '- stone/basalt still 0:', S.stone + S.basalt === before);
}
/* the live (custom-content.js) Boulder yields 4-6, not a fixed 6 —
   range check, not exact-equality, is the correct assertion here
   regardless of the stone/basalt split. */
console.log('  stone or basalt dropped all at once on the 6th swing:',
  S.stone + S.basalt >= 4 && S.stone + S.basalt <= 6);
console.log('  boulder slot topped back up after the clear:', !!S.locationField[0]);
console.log('  pine tree untouched by the pick:', S.locationField[1] && S.locationField[1].key === 'pineTree' && S.locationField[1].hp === 6);

console.log('\n== axes only work against a pine tree target ==');
G.wipe();
S.locationField = [{ key: 'boulder', hp: 6 }, { key: 'pineTree', hp: 6 }, null];
const startTree = G.activeLocation('axe');
console.log('  starting target:', startTree && startTree.key,
  '| hp', startTree && startTree.hp, '(expect pineTree, 6)');
for (let i = 1; i <= 6; i++) {
  const before = S.wood;
  chop();
  if (i < 6) console.log('  chop', i, '- wood still 0:', S.wood === before);
}
console.log('  wood dropped on the 6th chop:', S.wood > 0);
console.log('  pine tree slot topped back up after the clear:', !!S.locationField[1]);
console.log('  boulder untouched by the axe:', S.locationField[0] && S.locationField[0].key === 'boulder' && S.locationField[0].hp === 6);

console.log('\n== empty field wastes the pick, no crash ==');
S.locationField = [null, null, null];
const beforeEmpty = S.stone;
swing();
console.log('  stone unchanged with nothing to hit:', S.stone === beforeEmpty);

/* Forest Road USED to have nothing mineable at all. Boulders now
   share slot 0 with the pine trees, so stone is reachable in the
   second zone — but only one of the two is ever face-up, so you have
   to clear whichever is showing to get at the next. */
console.log('\n== forest road: boulders share the Forest slot with pine trees ==');
S.zone = 'forestRoad';
const roadSlot0 = G.ZONES.forestRoad.locationDecks[0];
console.log('  slot 0 holds both pineTree and boulder:',
  !!roadSlot0.pineTree && !!roadSlot0.boulder);
console.log('  they are in the SAME slot, not separate ones:',
  !G.ZONES.forestRoad.locationDecks.slice(1).some(d => d.boulder || d.pineTree));
G.buildLocationDecks(); S.locationDecks.forEach(sd => G.shuffle(sd.deck));
S.locationField = [null, null, null]; G.fillLocationField();
console.log('  deck composition:', JSON.stringify(G.ZONES.forestRoad.locationDecks));
/* Slot 0 shows exactly one card at a time, so a given fill may put
   up either a tree or a boulder — run the slot's whole deck to prove
   both actually appear. */
const slot0Seen = {};
for (let i = 0; i < 40; i++) {
  S.locationField = [null, null, null];
  G.buildLocationDecks(); S.locationDecks.forEach(sd => G.shuffle(sd.deck));
  G.fillLocationField();
  if (S.locationField[0]) slot0Seen[S.locationField[0].key] = true;
}
console.log('  boulders really do turn up in slot 0:', !!slot0Seen.boulder);
console.log('  pine trees still turn up there too:', !!slot0Seen.pineTree);
console.log('  and nothing else sneaks into that slot:',
  Object.keys(slot0Seen).every(k => k === 'boulder' || k === 'pineTree'));
console.log('  oreVeinRoad definition still exists for the 4th zone:', !!G.LOCATIONS.oreVeinRoad);

console.log('\n== khar-barak ore vein: tin and copper both drop ==');
S.zone = 'kharBarak';
G.buildLocationDecks(); S.locationDecks.forEach(sd => G.shuffle(sd.deck));
S.locationField = [null, null, null]; G.fillLocationField();
for (let i = 0; i < 500; i++) swing();
console.log('  tin seen:', S.tin > 0, '| copper seen:', S.copper > 0);

console.log('\n== furnace smelts bronze bar (tin + copper + charcoal, flat recipe cost) ==');
G.wipe(); S.zone = 'kharBarak'; S.weight = 0;
give('stone', 60); give('charcoal', 10);
G.buildStation('furnace');
S.weight = 0; give('tin', 5); give('copper', 5); give('charcoal', 5);
console.log('  bronzeBar recipe cost:', JSON.stringify(G.findRecipe('bronzeBar').cost));
console.log('  smelt succeeds:', G.craft('bronzeBar'));
console.log('  bronze bar made:', S.bronzeBar === 1);
console.log('  ingredients spent:', S.tin === 4 && S.copper === 4);
