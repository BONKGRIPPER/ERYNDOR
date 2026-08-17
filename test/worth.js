/* Resource worth: the abstract market-value field used by the Donate
   feature and future trade/market systems. Run: node test/worth.js */
const { boot } = require('./harness');
const { G } = boot();

console.log('== every resource has a positive numeric worth ==');
const keys = Object.keys(G.RESOURCES);
const allValid = keys.every(k => typeof G.RESOURCES[k].worth === 'number' && G.RESOURCES[k].worth > 0);
console.log('  ' + keys.length + ' resources, all have worth > 0:', allValid);

console.log('\n== worth reflects relative rarity ==');
console.log('  gems worth more than common raw drops:',
  G.RESOURCES.diamond.worth > G.RESOURCES.stone.worth &&
  G.RESOURCES.ruby.worth > G.RESOURCES.flint.worth);
console.log('  processed goods worth more than their raw input:',
  G.RESOURCES.tannedLeather.worth > G.RESOURCES.hide.worth &&
  G.RESOURCES.cookedSteak.worth > G.RESOURCES.steak.worth &&
  G.RESOURCES.bronzeBar.worth > G.RESOURCES.copper.worth);
