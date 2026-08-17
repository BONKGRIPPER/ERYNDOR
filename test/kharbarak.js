/* Khar-Barak city rework regression check. Run: node test/kharbarak.js */
const { boot } = require('./harness');
const { G } = boot();

console.log('== khar-barak is a city-safe production zone ==');
const zone = G.ZONES.kharBarak;
console.log('  kind is City:', zone.kind === 'City');
console.log('  bank available:', zone.bank === true);
console.log('  slot labels:', JSON.stringify(zone.slotLabels));
console.log('  labels match Mines/River/Timber:',
  JSON.stringify(zone.slotLabels) === JSON.stringify(['Mines', 'River', 'Timber']));

console.log('\n== khar-barak lane decks fit the rework ==');
const slot0 = zone.locationDecks[0] || {};
const slot1 = zone.locationDecks[1] || {};
const slot2 = zone.locationDecks[2] || {};
console.log('  mines include stone + copper + tin:',
  !!slot0.stoneDeposit && !!slot0.copperVein && !!slot0.tinVein);
console.log('  river includes three fishing locations:',
  !!slot1.riverbank && !!slot1.shallowFord && !!slot1.fishersStep);
console.log('  timber includes three pine locations:',
  !!slot2.pineStand && !!slot2.resinPines && !!slot2.woodYard);

console.log('\n== khar-barak has no hostile field targets ==');
const fieldKeys = Object.keys(slot0).concat(Object.keys(slot1), Object.keys(slot2));
const hostile = fieldKeys.filter(k => G.LOCATIONS[k] && G.LOCATIONS[k].atk);
console.log('  hostile list empty:', hostile.length === 0, JSON.stringify(hostile));

console.log('\n== travel builds only safe field cards there ==');
G.wipe();
S.kills = 25;
S.bronzeBar = 1;
G.travel('kharBarak');
const liveHostiles = (S.locationField || []).filter(loc => loc && loc.atk).map(loc => loc.key);
console.log('  no hostile active field cards:', liveHostiles.length === 0, JSON.stringify(liveHostiles));
