/* Bag page's Carried list: a grid of playing-card-style tiles
   (UI.renderBag), one .inv-card per owned stack, tap for the
   item-detail sheet, corner checkbox for Donate selection. Run:
   node test/invgrid.js */
const { boot } = require('./harness');
const { G } = boot();
const UI = G.UI;
const give = (k, n) => { S[k] = (S[k] || 0) + n; S.weight = 0; };

console.log('== the Carried list is one .inv-grid with one .inv-card per stack ==');
G.wipe(); S.zone = 'aerendell'; S.weight = 0;
give('stone', 5); give('wood', 3);
UI.renderBag();
const inv = document.getElementById('inv');
console.log('  exactly one grid wrapper:', inv.children.length === 1 && inv.children[0].className === 'inv-grid');
const grid = inv.children[0];
console.log('  one card per owned stack:', grid.children.length === 2);
const stoneCard = grid.children.find(c => c.children.some(ch => ch.className === 'inv-card-nm' && ch._html === 'Stone'));
console.log('  card is tinted by the resource\'s own tint:', stoneCard.className === 'inv-card tint-stone');
console.log('  qty badge shows the real count:',
  stoneCard.children.find(c => c.className === 'inv-card-qty')._html === 5);

console.log('\n== tapping a card opens the item-detail sheet ==');
stoneCard.onclick();
console.log('  modal shown:', document.getElementById('item-modal').classList.contains('show'));
UI.hideItemDetail();

console.log('\n== the corner checkbox drives Donate selection without opening the sheet ==');
const chk = stoneCard.children.find(c => /inv-card-select/.test(c.className));
console.log('  starts unchecked:', chk.className === 'inv-card-select');
let opened = false;
const realShow = UI.showItemDetail;
UI.showItemDetail = () => { opened = true; };
chk.onclick({ stopPropagation: () => {} });
UI.showItemDetail = realShow;
console.log('  did not open the detail sheet:', !opened);
UI.renderBag();
const inv2 = document.getElementById('inv');
const stoneCard2 = inv2.children[0].children.find(c =>
  c.children.some(ch => ch.className === 'inv-card-nm' && ch._html === 'Stone'));
console.log('  now shows selected:', /on\b/.test(stoneCard2.children.find(c => /inv-card-select/.test(c.className)).className));

console.log('\n== an empty pack shows the empty message, not an empty grid ==');
G.wipe(); S.zone = 'aerendell'; S.weight = 0;
UI.renderBag();
console.log('  no cards, empty-state message shown:', document.getElementById('inv').children[0].className === 'empty');
