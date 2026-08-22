/* Equipment tier pips — one small star per gear tier, same visual
   language as the foil corner star but opposite corner (top-left):
   Flint 0, Stone/basic bow 1, Scrap 2, Bronze 3; Fishing Net 0,
   Fishing Rod 1. Rendered in the hand (.hc-art), the deck list, and
   the collection list (.deck-card-pill). See card.tier, data.js/
   custom-content.js, and tierPipsHTML, js/ui.js.
   Run: node test/tierpips.js */
const { boot } = require('./harness');
const { G, store } = boot();
const UI = G.UI;
const give = (k, n) => { S[k] = (S[k] || 0) + n; S.weight = 0; };

console.log('== every tier maps to the right star count ==');
const expected = {
  pickFlint: 0, axeFlint: 0, woodenClub: 0, fishingNet: 0,
  pickStone: 1, axeStone: 1, strikeStone: 1, shoot: 1, fishingRod: 1,
  pickScrap: 2, axeScrap: 2, strikeScrap: 2,
  axeBronze: 3, strikeBronze: 3,
};
Object.keys(expected).forEach(key => {
  const got = G.CARDS[key] && G.CARDS[key].tier;
  console.log('  ' + key + ' tier ' + expected[key] + ':', (got || 0) === expected[key]);
});
console.log('  Ore Vein (not real equipment) has no tier at all:', G.CARDS.oreVein.tier === undefined);

console.log('\n== a foil variant inherits its base card\'s tier ==');
const foilKey = G.foilKey('axeStone');
console.log('  foil axeStone still reads tier 1:', G.cardDef(foilKey).tier === 1);

/* UI.dealHand/renderDeck build card markup via el.innerHTML = `...`
   template strings, which the test harness stores as a raw _html
   string rather than parsing into real child nodes (see the r-progress/
   farm-ring precedent elsewhere in this suite) — so verification here
   checks the rendered HTML text, same pattern already used throughout
   this project's tests for innerHTML-built rows. */
function starCount(html, cardName) {
  const start = html.indexOf(cardName);
  if (start < 0) return -1;
  // scan just the small window right around the card's own markup
  const window_ = html.slice(Math.max(0, start - 400), start);
  const pipsBlock = window_.match(/tier-pips"[^>]*>((?:<span>[^<]*<\/span>)*)/);
  if (!pipsBlock) return 0;
  return (pipsBlock[1].match(/<span>/g) || []).length;
}

console.log('\n== the hand card shows the right number of stars ==');
G.wipe(); S.zone = 'aerendell'; S.weight = 0;
give('flint', 20); give('stick', 20);
G.craft('flintPick');   // tier 0 — no stars
S.deck.splice(S.drawnCount, 0, 'pickFlint');
give('stone', 40); give('planks', 40); give('basaltBlock', 20); give('stoneBlock', 20); give('wood', 40);
G.buildStation('bench');
G.craft('stonePick');   // tier 1 — one star
S.deck.splice(S.drawnCount, 0, 'pickStone');
UI.go('play');
UI.dealHand({ hand: [
  { index: 0, key: 'pickFlint', card: G.cardDef('pickFlint'), finish: null, face: { yields: [], blocked: false } },
  { index: 1, key: 'pickStone', card: G.cardDef('pickStone'), finish: null, face: { yields: [], blocked: false } },
] });
const handHtml = store['hand'].children.map(c => c._html).join('|||');
console.log('  tier-0 card (Flint Pick) renders no tier-pips block at all:',
  handHtml.indexOf('tier-pips') === -1 || starCount(handHtml, 'Flint Pick') === 0);
console.log('  tier-1 card (Stone Pick) shows exactly 1 star:', starCount(handHtml, 'Stone Pick') === 1);

console.log('\n== the deck-list pill shows the right number of stars too ==');
G.hand = ['pickFlint', 'pickStone'];
UI.go('deck');
UI.renderDeck();
const deckHtml = store['card-list'].children.map(r => r._html).join('|||');
console.log('  Stone Pick row found:', deckHtml.indexOf('Stone Pick') >= 0);
console.log('  its pill shows exactly 1 star:', starCount(deckHtml, 'Stone Pick') === 1);
console.log('  Flint Pick row shows none:', starCount(deckHtml, 'Flint Pick') <= 0);
