/* Item-detail bottom sheet (Bag page): view any resource, and for a
   crop seed, a Plant action gated on region + empty plots + owning at
   least one. Run: node test/itemdetail.js */
const { boot } = require('./harness');
const { G } = boot();
const UI = G.UI;
const give = (k, n) => { S[k] = (S[k] || 0) + n; S.weight = 0; };

console.log('== opens without crashing for a plain resource ==');
G.wipe(); S.zone = 'aerendell'; S.weight = 0;
give('stone', 5);
let threw = false;
try { UI.showItemDetail('stone'); } catch (e) { threw = true; console.log('  ', e.message); }
console.log('  no crash:', !threw);
console.log('  modal shown:', document.getElementById('item-modal').classList.contains('show'));
UI.hideItemDetail();
console.log('  hides again:', !document.getElementById('item-modal').classList.contains('show'));

console.log('\n== a crop seed shows a Plant action ==');
give('flaxSeed', 2);
threw = false;
let body;
try { UI.showItemDetail('flaxSeed'); body = document.getElementById('item-sheet-body'); }
catch (e) { threw = true; console.log('  ', e.message); }
console.log('  no crash:', !threw);
const note = body.children.find(c => c.className === 's-note');
console.log('  sheet mentions the home region:', !!note && note._html.indexOf('Leth-Eiren') >= 0);
const plantBtn = body.children.find(c => /px-btn/.test(c.className || ''));
console.log('  Plant button present and enabled (in region, owns seeds, empty plots):',
  !!plantBtn && !plantBtn.disabled);

console.log('\n== a plain (non-crop) resource has no Plant/Eat button, but has -1/Crate ==');
UI.showItemDetail('stone');
const body2 = document.getElementById('item-sheet-body');
console.log('  no acc (Plant/Eat) button:',
  !body2.children.some(c => /px-btn acc/.test(c.className || '')));
console.log('  has a -1 (warn) button:',
  body2.children.some(c => /px-btn warn/.test(c.className || '')));
console.log('  has a Crate button:',
  body2.children.some(c => c._html === 'Crate'));

/* Food is never eaten from the bag now — raw food is only an
   ingredient for a Campfire food-card recipe, so the sheet points at
   cooking and offers no Eat button at all. */
console.log('\n== a food item reads as an ingredient, with no Eat button ==');
G.wipe(); S.zone = 'aerendell'; S.weight = 0;
give('berries', 3);
S.hp = Math.max(1, G.maxHp() - 3);
UI.showItemDetail('berries');
const berryBody = document.getElementById('item-sheet-body');
const healNote = berryBody.children.find(c => c.className === 's-note');
console.log('  ingredient note present:', !!healNote && healNote._html.indexOf('ingredient') >= 0);
console.log('  no Eat button anywhere on the sheet:',
  !berryBody.children.some(c => c._html === 'Eat'));
console.log('  G.eat is gone entirely:', typeof G.eat === 'undefined');
console.log('  berries are still flagged as a food ingredient:', G.isFoodItem('berries') === true);

console.log('\n== -1 drops one, Crate deposits the stack, both close the sheet ==');
G.wipe(); S.zone = 'aerendell'; S.weight = 0;
give('stone', 5);
UI.showItemDetail('stone');
let stoneBody = document.getElementById('item-sheet-body');
stoneBody.children.find(c => /px-btn warn/.test(c.className || '')).onclick();
console.log('  -1 dropped one:', S.stone === 4);
console.log('  sheet closed after -1:', !document.getElementById('item-modal').classList.contains('show'));
UI.showItemDetail('stone');
stoneBody = document.getElementById('item-sheet-body');
stoneBody.children.find(c => c._html === 'Crate').onclick();
console.log('  Crate deposited the whole remaining stack:', S.stone === 0 && G.currentCrate().stone === 4);

console.log('\n== Bank button only shows in a bank-flagged zone ==');
G.wipe(); S.zone = 'aerendell'; S.weight = 0;
give('stone', 3);
UI.showItemDetail('stone');
console.log('  no Bank button in aerendell (no bank):',
  !document.getElementById('item-sheet-body').children.some(c => c._html === 'Bank'));
S.zone = 'kharBarak';
UI.showItemDetail('stone');
console.log('  Bank button present in a bank zone:',
  document.getElementById('item-sheet-body').children.some(c => c._html === 'Bank'));
S.zone = 'aerendell';

console.log('\n== renders (does not crash) outside the seed\'s home region too ==');
S.zone = 'kharBarak';   // a different region ('khar') than flaxSeed's ('leth-eiren')
threw = false;
try { UI.showItemDetail('flaxSeed'); } catch (e) { threw = true; console.log('  ', e.message); }
console.log('  no crash when out of region:', !threw);
S.zone = 'aerendell';
