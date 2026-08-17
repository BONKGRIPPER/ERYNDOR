/* Riverhold + faction donation regression check. Run: node test/riverhold.js */
const { boot } = require('./harness');
const { G } = boot();

console.log('== riverhold exists as the first keth-maral city ==');
const zone = G.ZONES.riverhold;
console.log('  zone exists:', !!zone);
console.log('  kind is City:', zone.kind === 'City');
console.log('  region is keth-maral:', zone.region === 'keth-maral');
console.log('  bank available:', zone.bank === true);
console.log('  faction list has four entries:', zone.factions && zone.factions.length === 4);

console.log('\n== keth-maral region is registered ==');
console.log('  region present:',
  (G.REGIONS || []).some(r => r.id === 'keth-maral'));

console.log('\n== riverhold lane decks match market, docks, and ward ==');
console.log('  market lane exists:',
  !!zone.locationDecks[0].grandMarket && !!zone.locationDecks[0].tradersRow && !!zone.locationDecks[0].provisionSquare);
console.log('  docks lane exists:',
  !!zone.locationDecks[1].riverDock && !!zone.locationDecks[1].cargoSlip && !!zone.locationDecks[1].ferryPlatform);
console.log('  ward lane exists:',
  !!zone.locationDecks[2].civicQuarter && !!zone.locationDecks[2].embassyWalk && !!zone.locationDecks[2].oldGate);

console.log('\n== faction donations increase the selected faction influence ==');
G.wipe(); S.zone = 'riverhold'; S.weight = 0;
G.ensureFactionState();
S.selectedFaction = 'emberkin';
S.berries = 5;
const before = G.factionInfluence('emberkin');
const res = G.donateItems(['berries'], 'emberkin');
console.log('  donation succeeded:', !!res);
console.log('  emberkin influence increased:', G.factionInfluence('emberkin') > before);
console.log('  influence payload recorded:', res && res.factionId === 'emberkin' && res.totalInfluence > 0);

console.log('\n== different factions value the same stack differently ==');
G.wipe(); S.zone = 'riverhold'; S.weight = 0;
G.ensureFactionState();
S.wood = 5;
const d1 = G.donateItems(['wood'], 'delborn');
G.wipe(); S.zone = 'riverhold'; S.weight = 0;
G.ensureFactionState();
S.wood = 5;
const d2 = G.donateItems(['wood'], 'riverborn');
console.log('  delborn gets more influence than riverborn from wood:',
  d1.totalInfluence > d2.totalInfluence);
