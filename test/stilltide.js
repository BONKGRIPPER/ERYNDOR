/* Still-tide Pass regression check. Run: node test/stilltide.js */
const { boot } = require('./harness');
const { G } = boot();

console.log('== still-tide pass exists as a leth-eiren travel zone ==');
const zone = G.ZONES.stillTidePass;
console.log('  zone exists:', !!zone);
console.log('  region is leth-eiren:', zone.region === 'leth-eiren');
console.log('  order is after forest road:', zone.order > G.ZONES.forestRoad.order);
console.log('  labels match Stream/Oakwood/Pass:',
  JSON.stringify(zone.slotLabels) === JSON.stringify(['Stream', 'Oakwood', 'Pass']));

console.log('\n== lane decks fit stream, oak, and pass combat roles ==');
console.log('  stream lane has three fishing spots:',
  !!zone.locationDecks[0].narrowStream && !!zone.locationDecks[0].mossyBank && !!zone.locationDecks[0].coldRunnel);
console.log('  oak lane has three woodcut targets:',
  !!zone.locationDecks[1].oakTree && !!zone.locationDecks[1].fallenOak && !!zone.locationDecks[1].brushlineOak);
console.log('  pass lane has goblins and deer:',
  !!zone.locationDecks[2].goblin && !!zone.locationDecks[2].deer);

console.log('\n== oak and stream targets are wired correctly ==');
console.log('  oak tree needs axe:', G.LOCATIONS.oakTree.requires === 'axe');
console.log('  narrow stream needs fishing:', G.LOCATIONS.narrowStream.requires === 'fishing');
console.log('  cold runnel can drop rare glass eel:',
  G.LOCATIONS.coldRunnel.dropTable.some(e => e.key === 'glassEel'));

console.log('\n== travel gate is later than khar-barak ==');
console.log('  kill gate is 25:', zone.needs.kills === 25);
console.log('  still needs bronze bar knowledge:', zone.needs.item === 'bronzeBar');
