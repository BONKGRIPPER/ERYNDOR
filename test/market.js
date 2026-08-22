/* Market page (city-only trade): sell at worth, buy at worth *
   TUNE.marketBuyMult, gold as the only currency. Trade — and the
   header icon — is gated on the CURRENT zone being a City
   (G.zoneHasMarket), not a one-time unlock. Only Khar-Barak and
   Riverhold are trade cities — Aerendell is a Town (a real
   settlement, just no market), Forest Road is Wilds. Every
   mechanic test below runs in Khar-Barak specifically so it's
   actually exercising a valid trade zone.
   Run: node test/market.js */
const { boot } = require('./harness');
const { G } = boot();
const UI = G.UI;
const give = (k, n) => { S[k] = (S[k] || 0) + n; S.weight = 0; };

console.log('== selling grants qty * worth gold and removes the batch ==');
G.wipe(); S.zone = 'kharBarak'; S.weight = 0;
const stoneWorth = G.RESOURCES.stone.worth;
give('stone', 8);   // batch size 5 -> sells 5, leaves 3
const r = G.sellItem('stone');
console.log('  stone dropped 8 -> 3:', S.stone === 3);
console.log('  gold gained == 5 * worth:', r.gain === 5 * stoneWorth && S.gold === 5 * stoneWorth);
console.log('  sold qty matches:', r.qty === 5);

console.log('\n== selling less than a full batch sells everything owned ==');
G.wipe(); S.zone = 'kharBarak'; S.weight = 0;
const diamondWorth = G.RESOURCES.diamond.worth;
give('diamond', 2);
const r2 = G.sellItem('diamond');
console.log('  sold all 2:', r2.qty === 2 && S.diamond === 0);
console.log('  gold == 2 * worth:', r2.gain === 2 * diamondWorth && S.gold === 2 * diamondWorth);

console.log('\n== selling an unowned resource or gold itself is a no-op ==');
G.wipe(); S.zone = 'kharBarak'; S.weight = 0;
console.log('  unowned key:', G.sellItem('stone') === null);
give('gold', 20);
console.log('  gold itself refuses:', G.sellItem('gold') === null && S.gold === 20);

console.log('\n== buying spends ceil(worth * marketBuyMult) gold and grants 1 ==');
G.wipe(); S.zone = 'kharBarak'; S.weight = 0;
give('gold', 100);
const price = G.buyPrice('bronzeBar');
console.log('  price matches worth*mult:', price === Math.ceil(G.RESOURCES.bronzeBar.worth * G.TUNE.marketBuyMult));
const before = S.gold;
const rb = G.buyItem('bronzeBar');
console.log('  bought 1:', rb.cost === price && S.bronzeBar === 1);
console.log('  gold spent matches:', S.gold === before - price);

console.log('\n== buying fails when gold is short, or for gold itself ==');
G.wipe(); S.zone = 'kharBarak'; S.weight = 0;
console.log('  no gold at all:', G.buyItem('stone') === null);
give('gold', 1000);
console.log('  buying gold itself refuses:', G.buyItem('gold') === null);

console.log('\n== trade is gated on the CURRENT zone being a City ==');
G.wipe(); S.weight = 0;
console.log('  aerendell (a Town, not a City) blocks trade:', G.zoneHasMarket() === false);
give('stone', 5); give('gold', 100);
console.log('  sell refused in aerendell:', G.sellItem('stone') === null);
console.log('  buy refused in aerendell:', G.buyItem('stone') === null);
S.zone = 'forestRoad';   // Wilds, not a City
console.log('  forestRoad (Wilds) blocks trade:', G.zoneHasMarket() === false);
console.log('  sell refused outside a City:', G.sellItem('stone') === null);
console.log('  buy refused outside a City:', G.buyItem('stone') === null);
S.zone = 'kharBarak';    // a real trade City
console.log('  kharBarak (a City) allows trade:', G.zoneHasMarket() === true);
console.log('  sell succeeds in a City:', G.sellItem('stone') !== null);
console.log('  buy succeeds in a City:', G.buyItem('stone') !== null);
S.zone = 'riverhold';    // the other trade City
console.log('  riverhold (a City) allows trade:', G.zoneHasMarket() === true);
give('stone', 5);
console.log('  sell succeeds in riverhold too:', G.sellItem('stone') !== null);

console.log('\n== the Market header icon tracks the current zone\'s City-ness live ==');
G.wipe(); S.weight = 0;
UI.renderAll();
console.log('  hidden in aerendell (a Town, not a City):', document.getElementById('market-btn').style.display === 'none');
S.zone = 'forestRoad';
UI.renderAll();
console.log('  hidden in forestRoad (not a City):', document.getElementById('market-btn').style.display === 'none');
S.zone = 'kharBarak';
UI.renderAll();
console.log('  shown in kharBarak (a City):', document.getElementById('market-btn').style.display === 'flex');

console.log('\n== UI.renderMarket runs without crashing ==');
G.wipe(); S.zone = 'kharBarak'; S.weight = 0;
let threw = false;
try { UI.renderMarket(); } catch (e) { threw = true; console.log('  ', e.stack); }
console.log('  fresh save, nothing owned:', !threw);
give('stone', 10); give('gold', 500);
threw = false;
try { UI.renderMarket(); } catch (e) { threw = true; console.log('  ', e.stack); }
console.log('  with stock and gold to spend:', !threw);
G.sellItem('stone');
G.buyItem('stone');
threw = false;
try { UI.renderMarket(); } catch (e) { threw = true; console.log('  ', e.stack); }
console.log('  after buying/selling:', !threw);
