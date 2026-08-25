/* Bench level 2 now costs Scrap Metal too, and is what actually
   unlocks the scrap-tier weapons/tools (they carry minLevel: 2) —
   discovering Scrap Metal alone used to be enough. Also covers the
   new Scrap Shield card: a passive, tap-free damage block that
   applies just from sitting in the current dealt hand.
   Run: node test/scrapshield.js */
const { boot } = require('./harness');
const { G, store } = boot();
const UI = G.UI;
const give = (k, n) => { S[k] = (S[k] || 0) + n; S.weight = 0; };

console.log('== Bench level 2 now costs Scrap Metal alongside Basalt Block/Planks ==');
const tier = G.findStation('bench').upgrades[0];
console.log('  upgrade cost includes scrapMetal:', tier.cost.scrapMetal === 10);

console.log('\n== scrap-tier bench recipes require Bench lv2, not just materials known ==');
['scrapAxe', 'scrapPick', 'scrapSword', 'scrapShield'].forEach(id => {
  console.log('  ' + id + ' carries minLevel 2:', G.findRecipe(id).minLevel === 2);
});

G.wipe(); S.zone = 'aerendell'; S.weight = 0;
give('basaltBlock', 40); give('planks', 60); give('stick', 20); give('scrapMetal', 30);
G.buildStation('bench');
console.log('  scrapAxe refused at bench lv1, materials in hand:', G.craft('scrapAxe') === false);
console.log('  scrapShield refused at bench lv1 too:', G.craft('scrapShield') === false);
G.upgradeStation('bench');
console.log('  bench is now lv2:', G.stationLevel('bench') === 2);
console.log('  scrapAxe now craftable:', G.craft('scrapAxe') === true);
console.log('  scrapShield now craftable:', G.craft('scrapShield') === true);
console.log('  scrapShield card actually landed in the deck:', (G.deckCounts().scrapShield || 0) > 0);

console.log('\n== the recipe is hidden from the Craft page below lv2, shown above it ==');
G.wipe(); S.zone = 'aerendell'; S.weight = 0;
give('basaltBlock', 40); give('planks', 60); give('stick', 20); give('scrapMetal', 30);
S.discovered.scrapMetal = true; S.discovered.planks = true;
G.buildStation('bench');
UI.go('craft'); UI.renderCraft();
function findCard(nameFragment) {
  return store['stations'].children.find(card =>
    card.children[0] && card.children[0]._html.indexOf(nameFragment) >= 0);
}
function openMenu(card) { card.children[0].onclick(); UI.renderCraft(); }
const benchCard1 = findCard('Crafting Bench');
openMenu(benchCard1);
function findRecipeRow(nameFragment) {
  const card = findCard('Crafting Bench');
  let found = null;
  card.children.forEach(part => {
    if (part.className !== 'recipes') return;
    part.children.forEach(child => {
      const rBody = child.children && child.children[0];
      if (rBody && rBody._html && rBody._html.indexOf(nameFragment) >= 0) found = child;
    });
  });
  return found;
}
console.log('  Scrap Shield recipe hidden at bench lv1:', !findRecipeRow('Scrap Shield'));
G.upgradeStation('bench');
UI.renderCraft();
const benchCard2 = findCard('Crafting Bench');
openMenu(benchCard2);
console.log('  Scrap Shield recipe shown once bench is lv2:', !!findRecipeRow('Scrap Shield'));

console.log('\n== a Scrap Shield card in hand passively blocks 1 dmg, no tap required ==');
G.wipe();
console.log('  shieldBlock is 0 with an empty hand:', G.shieldBlock() === 0);
G.hand = ['scrapShield'];
console.log('  shieldBlock is 1 with a shield in hand:', G.shieldBlock() === 1);
S.hp = 10;
G.hurtPlayer(3);
console.log('  a 3-dmg hit only lands 2 with the shield up:', S.hp === 8);
G.hand = [];
S.hp = 10;
G.hurtPlayer(3);
console.log('  the same hit lands the full 3 once the shield leaves the hand:', S.hp === 7);

console.log('\n== the shield stacks with armor defense, and with multiple copies in hand ==');
G.wipe();
S.equipped.chest = 'scrapChest';   // has def, see G.ITEMS
const defBefore = G.defense();
G.hand = ['scrapShield', 'scrapShield'];
S.hp = 20;
G.hurtPlayer(defBefore + 2 + 5);   // enough to still land 5 after armor+2 shields
console.log('  armor and 2 shields both apply:', S.hp === 15);

console.log('\n== the Scrap Shield card face describes its block, and never crits/gains anything ==');
G.wipe();
const face = G.cardKinds.shield.face(G.CARDS.scrapShield);
console.log('  face mentions blocking 1 dmg:', face.detail.indexOf('1') >= 0);
const ctx = { key: 'scrapShield', card: G.CARDS.scrapShield, hit: true, encumbered: false, gains: [] };
G.cardKinds.shield.resolve(ctx);
console.log('  resolving it (tapping it) grants nothing:', ctx.gains.length === 0);
