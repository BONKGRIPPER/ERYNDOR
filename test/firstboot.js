/* A genuinely fresh install (empty localStorage, no prior save) used
   to boot with the Play page's field slots stuck empty — G.wipe()
   always populated S.locationField via G.buildLocationDecks() +
   G.fillLocationField(), but the real cold-boot path in main.js
   (the `!had` branch) skipped that entirely, so nothing filled the
   field until the player manually hit wipe. test/harness.js's boot()
   evals the real main.js boot sequence against a genuinely empty
   localStorage, so this exercises the exact real bug, not a
   simulation of it. Run: node test/firstboot.js */
const { boot } = require('./harness');
const { G } = boot();   // no G.wipe() call — this IS the first-ever boot

console.log('== a truly fresh install populates the location field on its own ==');
console.log('  locationDecks built:', Array.isArray(S.locationDecks) && S.locationDecks.length === 3);
console.log('  every deck slot has cards:', S.locationDecks.every(sd => sd.deck.length > 0));
console.log('  locationField has no empty slots:', S.locationField.every(Boolean));
console.log('  slot 0 is a real location:', !!G.LOCATIONS[S.locationField[0].key]);
console.log('  slot 1 is a real location:', !!G.LOCATIONS[S.locationField[1].key]);
console.log('  slot 2 is a real location:', !!G.LOCATIONS[S.locationField[2].key]);

console.log('\n== the starting deck is also ready without an explicit wipe ==');
console.log('  deck built:', S.deck.length > 0);
console.log('  deck was shuffled, not left in insertion order:', (() => {
  // fresh aerendell deck is flint x5, stick x5, forage x5 in that
  // order before a shuffle — after G.shuffle() it's extremely
  // unlikely to still read as 3 unbroken runs of 5
  let runs = 1;
  for (let i = 1; i < S.deck.length; i++) if (S.deck[i] !== S.deck[i - 1]) runs++;
  return runs > 3;
})());

console.log('\n== a real subsequent reload (an existing save now) still works normally ==');
G.save(false);
window.S = G.S = G.freshState();
const had = G.load();
console.log('  load reports an existing save:', had === true);
console.log('  location field still populated after reload:', S.locationField.every(Boolean));
