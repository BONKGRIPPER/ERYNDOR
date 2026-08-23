/* The Bone Altar moved off the Craft page onto the Deck page
   (station `page: 'deck'`, the same mechanism the Campfire already
   uses for 'farm'), so you can bury bones with the prayer-point
   counter visible directly above it. Also covers the craft-tab dot,
   which used to light up for stations that render on other pages.
   Run: node test/deckaltar.js */
const { boot } = require('./harness');
const { G, store } = boot();
const UI = G.UI;
const give = (k, n) => { S[k] = (S[k] || 0) + n; S.weight = 0; };

function stationCardIn(wrapId, nameFragment) {
  const wrap = store[wrapId];
  if (!wrap || !wrap.children) return null;
  return wrap.children.find(card =>
    card.children && card.children[0] && card.children[0]._html &&
    card.children[0]._html.indexOf(nameFragment) >= 0) || null;
}

console.log('== the altar declares the Deck page, in the file that actually wins ==');
console.log('  live altar station has page \'deck\':', G.findStation('altar').page === 'deck');
console.log('  (custom-content.js redeclares altar, so this proves both files agree)');
console.log('  the Campfire precedent is untouched:', G.findStation('firepit').page === 'farm');
console.log('  an ordinary station still defaults to craft:', !G.findStation('bench').page);

console.log('\n== it renders into the Deck page, and no longer into the Craft page ==');
G.wipe(); S.zone = 'aerendell'; S.weight = 0;
give('basaltBlock', 10); give('bone', 12);
console.log('  altar builds:', G.buildStation('altar'));
UI.go('deck');
console.log('  altar card renders on the Deck page:', !!stationCardIn('deck-stations', 'Bone Altar'));
UI.go('craft');
console.log('  altar card is gone from the Craft page:', !stationCardIn('stations', 'Bone Altar'));
console.log('  the Craft page still renders its own stations (Bare Hands):',
  !!stationCardIn('stations', 'Bare Hands'));

console.log('\n== burying a bone updates the prayer counter sitting right above it ==');
UI.go('deck');
/* String() on both sides: the render assigns S.prayerPoints (a
   number) straight to textContent. A real browser coerces that to
   a string; the harness's DOM stub keeps it numeric. */
const ppShownBefore = String(store['pp-val'].textContent);
const ppBefore = S.prayerPoints;
console.log('  bury succeeds:', G.craft('buryBone'));
console.log('  prayer points actually went up:', S.prayerPoints > ppBefore);
UI.renderDeck();
console.log('  the on-screen counter re-rendered to match:',
  String(store['pp-val'].textContent) === String(S.prayerPoints) &&
  String(store['pp-val'].textContent) !== ppShownBefore);

console.log('\n== an unbuilt altar explains itself instead of rendering nothing ==');
G.wipe(); S.zone = 'aerendell'; S.weight = 0;
give('basaltBlock', 10); give('bone', 12);
/* give() writes S[k] directly and never marks S.discovered, so set
   it explicitly — an unbuilt station only renders once one of its
   recipe costs is known (see stationStatus, ui.js). */
S.discovered.basaltBlock = true; S.discovered.bone = true;
UI.go('deck');
console.log('  an affordable-but-unbuilt altar still shows its build row:',
  !!stationCardIn('deck-stations', 'Bone Altar'));
G.wipe(); S.zone = 'aerendell'; S.weight = 0;   // nothing discovered at all
UI.go('deck');
const deckStations = store['deck-stations'];
console.log('  with nothing discovered, the empty hint renders instead:',
  deckStations.children.length === 1 &&
  deckStations.children[0].className === 'empty' &&
  deckStations.children[0]._html.indexOf('Build a Bone Altar') >= 0);

console.log('\n== the Craft tab dot ignores stations that live on other pages ==');
G.wipe(); S.zone = 'aerendell'; S.weight = 0;
give('basaltBlock', 6); give('bone', 6);
G.buildStation('altar');                 // spends 6 basalt + 5 bone, leaving 1 bone
console.log('  a bone is left, so the altar has a ready recipe:',
  S.bone >= 1 && G.canAfford(G.findRecipe('buryBone').cost));
console.log('  no flint/sticks, so no Craft-page station is ready:', !S.flint && !S.stick);
UI.craftBadge();
console.log('  the Craft dot stays hidden — the only ready station is on the Deck page:',
  store['dot-craft'].style.display === 'none');
