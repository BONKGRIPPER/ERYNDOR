/* Donate (Bag page): bulk-remove up to TUNE.donateBatchSize of each
   selected resource, banking worth toward +1 zone xp. Run:
   node test/donate.js */
const { boot } = require('./harness');
const { G } = boot();
const give = (k, n) => { S[k] = (S[k] || 0) + n; S.weight = 0; };

console.log('== donating removes up to donateBatchSize of each selected key ==');
G.wipe(); S.zone = 'aerendell'; S.weight = 0;
give('stone', 8);   // worth 1 each -> donates 5 (batch size), leaves 3
give('flint', 2);   // worth 1 each, fewer than batch size -> donates all 2
const r = G.donateItems(['stone', 'flint']);
const expectedWorth =
  5 * G.RESOURCES.stone.worth +
  2 * G.RESOURCES.flint.worth;
console.log('  stone dropped from 8 to 3:', S.stone === 3);
console.log('  flint dropped from 2 to 0:', S.flint === 0);
console.log('  donated tally correct:', r.donated.stone === 5 && r.donated.flint === 2);
console.log('  total worth matches resource data:', r.totalWorth === expectedWorth);

console.log('\n== worth accumulates in S.donateProgress ==');
console.log('  progress banked:', S.donateProgress === expectedWorth);

console.log('\n== crossing donateWorthPerXp grants the CURRENT zone +1 xp, and carries the remainder ==');
G.wipe(); S.zone = 'forestRoad'; S.weight = 0;
give('diamond', 15);       // worth 25 each -> one donate batch (5) = 125 worth
const before = S.zoneXp.forestRoad.xp, beforeLv = S.zoneXp.forestRoad.lv;
const r2 = G.donateItems(['diamond']);
const need = G.TUNE.donateWorthPerXp;
const expectedXpGrants = Math.floor(125 / need);
console.log('  xpGranted matches worth/threshold:', r2.xpGranted === expectedXpGrants);
console.log('  remainder carried in donateProgress:', S.donateProgress === 125 - expectedXpGrants * need);
console.log('  zone xp actually moved (lv or xp changed):',
  S.zoneXp.forestRoad.lv !== beforeLv || S.zoneXp.forestRoad.xp !== before);

console.log('\n== donating an unselected/empty key is a no-op, no crash ==');
G.wipe();
const r3 = G.donateItems(['stone']);
console.log('  returns null when nothing to donate:', r3 === null);

console.log('\n== donateProgress persists across save/load ==');
G.wipe(); S.zone = 'aerendell'; S.weight = 0;
give('stone', 3);
G.donateItems(['stone']);
const saved = S.donateProgress;
G.save(false);
window.S = G.S = G.freshState();
G.load();
console.log('  survives a save/load round trip:', G.S.donateProgress === saved && saved > 0);
