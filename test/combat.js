/* Combat rules. Animals are location-field targets now (atk marks a
   location hostile — 'combat' means either weapon works, a bare
   'melee'/'ranged' gates it to just one), the same system as
   Boulders/Pine Trees — see test/mining.js for the tool-side
   equivalent. Run: node test/combat.js */
const { boot } = require('./harness');
const { G } = boot();

const ANIMALS = Object.keys(G.LOCATIONS).filter(k => G.LOCATIONS[k].atk);

function equip() {
  G.wipe(); S.weight = 0;
  S.stone = 99; S.stick = 99; S.wood = 99; S.flax = 99;
  G.buildStation('bench');
  G.craft('stoneSword');
  G.craft('string'); G.craft('string');
  G.craft('shortBow');
  S.stoneArrow = 50;
}
/* Arbitrarily high hp so a swing never actually finishes it off —
   keeps "damage dealt" readable across the swing without the field
   topping itself back up mid-measurement. */
function setAnimal(key, hp) { S.locationField = [{ key, hp: hp != null ? hp : 99 }, null, null]; }
function swing(kind, hit) {
  G.current = { key: kind, index: 0 };
  G.rt.windowOpen = true; G.rt.tapped = true;
  const before = { hp: S.hp, ehp: S.locationField[0] ? S.locationField[0].hp : 0 };
  G.resolveCard(hit);
  const after = { hp: S.hp, ehp: S.locationField[0] ? S.locationField[0].hp : 0 };
  return { dmg: before.ehp - after.ehp, taken: before.hp - after.hp };
}

console.log('== clean tap doubles BOTH weapons ==');
equip();
console.log('  melee power', G.bestPower('melee'), '| ranged', G.bestPower('ranged'),
            '| arrow +', G.activeConsumable('ammo').dmg);
[['strikeStone', 'melee'], ['shoot', 'bow  ']].forEach(([k, label]) => {
  setAnimal('cow'); S.hp = 10;
  const miss = swing(k, false);
  setAnimal('cow'); S.hp = 10;
  const crit = swing(k, true);
  console.log('  ' + label, 'normal', miss.dmg, '-> clean', crit.dmg,
              crit.dmg === miss.dmg * 2 ? '(doubled)' : '(NOT DOUBLED)');
});

console.log('\n== every animal bites back — Deer only answers to a bow ==');
ANIMALS.forEach(t => {
  ['strikeStone', 'shoot'].forEach(k => {
    setAnimal(t); S.hp = 10;
    const r = swing(k, false);
    console.log('  ' + t.padEnd(8), (k === 'strikeStone' ? 'melee' : 'bow  '),
                'dealt', r.dmg, '| took', r.taken);
  });
});
console.log('  melee genuinely has no target on Deer:', (function () {
  setAnimal('deer');
  return G.activeLocation('melee') === null && G.activeLocation('ranged') !== null;
})());

console.log('\n== a killing blow still costs nothing ==');
setAnimal('chicken', 1); S.hp = 10;
const kill = swing('strikeStone', false);
console.log('  killed at 1hp -> took', kill.taken, '(expect 0)');

console.log('\n== drop tables ==');
ANIMALS.forEach(t => {
  const c = {};
  for (let i = 0; i < 200; i++) {
    const d = G.rollDrops(G.LOCATIONS[t]);
    Object.keys(d).forEach(k => c[k] = (c[k] || 0) + d[k]);
  }
  console.log('  ' + G.LOCATIONS[t].name.padEnd(20),
    Object.entries(c).map(([k, v]) => G.RESOURCES[k].name + ' ' + (v / 200)).join(', '));
});

console.log('\n== a zone\'s animal mix is set entirely by its location decks now —');
console.log('   no separate spawn weight or timer, so density is just deck composition,');
console.log('   just spread across 3 independent per-slot decks instead of one shared pile ==');
console.log('  aerendell locationDecks:', JSON.stringify(G.ZONES.aerendell.locationDecks));
const declared = {};
G.ZONES.aerendell.locationDecks.forEach(comp => {
  Object.keys(comp || {}).forEach(k => { declared[k] = (declared[k] || 0) + comp[k]; });
});
G.wipe();
const counts = {};
S.locationDecks.forEach(sd => sd.deck.forEach(k => { counts[k] = (counts[k] || 0) + 1; }));
const sortedJson = o => JSON.stringify(Object.keys(o).sort().reduce((m, k) => (m[k] = o[k], m), {}));
console.log('  built decks match declared counts:', sortedJson(counts) === sortedJson(declared));

console.log('\n== pig meat cooks into a food CARD, which heals when played ==');
G.wipe(); S.weight = 0; S.stick = 99; S.flint = 99;
console.log('  firepit actually built:', G.buildStation('firepit'));
/* 10 of one raw meat + 10 fuel points -> a Cooked Meat card. There
   is no eat-from-the-bag path any more; healing happens by playing
   the card, which is consumed in the process. */
S.pork = 10; S.stick = 20; S.weight = 0;
console.log('  cook a Cooked Meat card:', G.craft('card_cookedMeat'));
console.log('  raw pork spent:', S.pork === 0);
console.log('  card is in the deck:', (G.deckCounts().cookedMeat || 0) === 1);
S.hp = 3;
const meatCard = G.cardDef('cookedMeat');
G.cardKinds.food.resolve({ key: 'cookedMeat', card: meatCard, hit: false, gains: [] });
console.log('  playing it healed 3: hp 3 ->', S.hp);
console.log('  and the card was eaten:', (G.deckCounts().cookedMeat || 0) === 0);
