/* Hand-of-three loop. Run: node test/hand.js */
const { boot } = require('./harness');
const { G, store, flush } = boot();
const UI = G.UI;

console.log('== deck ==');
G.wipe();
console.log('  size', S.deck.length, JSON.stringify(G.deckCounts()));
console.log('  flint yield', G.yieldFor('flint'), '| stick', G.yieldFor('stick'));

console.log('\n== a hand of three is dealt ==');
S.page = 'play'; G.rt.paused = false;
G.drawHand();
console.log('  hand size', G.hand.length, '->', G.hand.join(', '));
console.log('  phase', G.phase, '(expect choose)');
console.log('  cards rendered', store['hand'].children.length);

console.log('\n== nothing happens until you pick ==');
const w0 = S.weight;
G.handleTap();
console.log('  tapping the field in choose phase: weight unchanged', S.weight === w0,
            '| phase', G.phase);

console.log('\n== choosing opens the reflex gauge ==');
G.chooseCard(1);
console.log('  chosen:', G.current.key, 'at index', G.current.index, '| phase', G.phase);
console.log('  windowOpen', G.rt.windowOpen, '| band',
  G.rt.band.start.toFixed(2) + '-' + G.rt.band.end.toFixed(2));

console.log('\n== the whole hand leaves the deck ==');
const drawnBefore = S.drawnCount;
global.__now = G.rt.windowStart + G.TUNE.windowTime *
  ((G.rt.band.start + G.rt.band.end) / 2);
G.handleTap();
console.log('  drawnCount', drawnBefore, '->', S.drawnCount, '(3 consumed)');
console.log('  weight now', S.weight, '(only the chosen card paid out)');

console.log('\n== a full cycle ==');
G.wipe(); S.page = 'play';
let turns = 0, reshuffles = 0;
G.on('deck:reshuffled', () => reshuffles++);
G.drawHand();
for (let i = 0; i < 12; i++) {
  G.chooseCard(0);
  global.__now = G.rt.windowStart + G.TUNE.windowTime * 0.5;
  G.handleTap();
  flush();
  turns++;
}
console.log('  ' + turns + ' turns played | reshuffles', reshuffles,
            '| deck', S.deck.length, '| drawn', S.drawnCount);
console.log('  10 turns per cycle expected for a 30-card deck');

console.log('\n== crafted tools add three cards ==');
G.wipe();
S.stone = 60; S.wood = 60;                   // set directly — not a capacity test
G.buildStation('bench');
const before = S.deck.length;
G.craft('axe');
console.log('  after one axe: deck', before, '->', S.deck.length,
            '| axeStone cards', G.deckCounts().axeStone);

console.log('\n== card faces are simple ==');
G.wipe();
G.drawHand();
const first = store['hand'].children[0];
const txt = first.innerHTML.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
console.log('  rendered:', txt);
console.log('  emblems:', (first.innerHTML.match(/<svg/g) || []).length);
