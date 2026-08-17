/* Duun-Vael Bridge regression check. Run: node test/duunvael.js */
const { boot } = require('./harness');
const { G } = boot();

console.log('== duun-vael bridge exists as a leth-eiren gauntlet ==');
const zone = G.ZONES.duunVaelBridge;
console.log('  zone exists:', !!zone);
console.log('  kind is Gauntlet:', zone.kind === 'Gauntlet');
console.log('  region is leth-eiren:', zone.region === 'leth-eiren');
console.log('  order follows still-tide pass:', zone.order > G.ZONES.stillTidePass.order);
console.log('  labels match Bridge/Approach/Barricade:',
  JSON.stringify(zone.slotLabels) === JSON.stringify(['Bridge', 'Approach', 'Barricade']));

console.log('\n== all three lanes are combat-heavy ==');
const keys = []
  .concat(Object.keys(zone.locationDecks[0] || {}))
  .concat(Object.keys(zone.locationDecks[1] || {}))
  .concat(Object.keys(zone.locationDecks[2] || {}));
const allHostile = keys.every(k => G.LOCATIONS[k] && G.LOCATIONS[k].atk);
console.log('  every configured target is hostile:', allHostile);
console.log('  includes brute and raider anchors:',
  !!zone.locationDecks[0].bridgeRaider && !!zone.locationDecks[2].barricadeBrute);

console.log('\n== new bridge enemies are tougher than road goblins ==');
console.log('  bridge raider hp/atk:', G.LOCATIONS.bridgeRaider.hp, G.LOCATIONS.bridgeRaider.atk);
console.log('  barricade brute hp/atk:', G.LOCATIONS.barricadeBrute.hp, G.LOCATIONS.barricadeBrute.atk);
console.log('  brute tougher than goblin:',
  G.LOCATIONS.barricadeBrute.hp > G.LOCATIONS.goblin.hp &&
  G.LOCATIONS.barricadeBrute.atk > G.LOCATIONS.goblin.atk);

console.log('\n== zone gate is later than still-tide pass ==');
console.log('  kill gate is 45:', zone.needs.kills === 45);
console.log('  still needs bronze bar knowledge:', zone.needs.item === 'bronzeBar');
