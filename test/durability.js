/* Tool/weapon durability: drains per play, breaks at zero, removes
   every remaining copy from the deck. Run: node test/durability.js */
const { boot } = require('./harness');
const { G } = boot();
const give = (k, n) => { S[k] = (S[k] || 0) + n; S.weight = 0; };

function play(key, hit) {
  S.weight = 0;
  G.current = { key, index: 0 };
  G.rt.windowOpen = true; G.rt.tapped = !!hit;
  G.resolveCard(!!hit);
}

console.log('== crafting sets a durability pool matching the card ==');
G.wipe();
give('flint', 20); give('stick', 20);
G.craft('flintPick');
console.log('  pickFlint durability', S.durability.pickFlint, '(expect', G.CARDS.pickFlint.durability + ')');

console.log('\n== drains by 1 every play, hit or miss alike ==');
S.locationField = [{ key: 'boulder', hp: 999 }, null, null];  // never clears mid-test
const before = S.durability.pickFlint;
play('pickFlint', false);
console.log('  after a miss:', before, '->', S.durability.pickFlint, '(expect -1)');
const before2 = S.durability.pickFlint;
play('pickFlint', true);
console.log('  after a clean hit:', before2, '->', S.durability.pickFlint,
  '(expect -1, same drain as a miss — only damage doubles, never durability cost)');

console.log('\n== a wasted swing (no target) costs nothing ==');
G.wipe();
give('flint', 20); give('stick', 20);
G.craft('flintPick');
S.locationField = [null, null, null];   // nothing to hit
const durBeforeWaste = S.durability.pickFlint;
play('pickFlint', false);
console.log('  durability unchanged with no target:', S.durability.pickFlint === durBeforeWaste);
S.locationField = [{ key: 'boulder', hp: 999 }, null, null];
play('pickFlint', false);
console.log('  drains normally once a target is present:', S.durability.pickFlint === durBeforeWaste - 1);

console.log('\n== breaks at zero and every copy leaves the deck ==');
G.wipe();
give('flint', 100); give('stick', 100);
G.craft('flintPick'); G.craft('flintPick');   // two copies, pool stacks
console.log('  copies in deck', G.deckCounts().pickFlint, '| pool', S.durability.pickFlint,
  '(expect 2 copies, pool', G.CARDS.pickFlint.durability * 2 + ')');
S.locationField = [{ key: 'boulder', hp: 999 }, null, null];
let plays = 0;
while (S.durability.pickFlint) { play('pickFlint', false); plays++; if (plays > 100) break; }
console.log('  plays to break both copies:', plays, '(expect', G.CARDS.pickFlint.durability * 2 + ')');
console.log('  durability entry cleared:', !('pickFlint' in S.durability));
console.log('  no copies remain in the deck:', (G.deckCounts().pickFlint || 0) === 0);
console.log('  deck stays intact otherwise:', S.deck.indexOf('flint') >= 0);

console.log('\n== drawnCount pointer stays aligned after a mid-cycle break ==');
G.wipe();
give('flint', 20); give('stick', 20);
G.craft('flintPick');
S.locationField = [{ key: 'boulder', hp: 999 }, null, null];
S.drawnCount = 5;   // pretend we're mid-cycle, well past the fresh discard insert
const durLeft = S.durability.pickFlint;
for (let i = 0; i < durLeft; i++) play('pickFlint', false);
console.log('  broke on schedule:', !('pickFlint' in S.durability));
console.log('  drawnCount never exceeds deck length:', S.drawnCount <= S.deck.length);
console.log('  drawnCount stayed non-negative:', S.drawnCount >= 0);
