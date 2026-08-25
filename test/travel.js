/* Batch 4, real-time plan (chain-graph revision): travel costs
   genuine real-world time, summed along G.TRAVEL_ROAD between the
   player's current zone and the destination, and locks the whole UI
   behind a full-screen overlay for the duration — the player's own
   explicit choice over "stay playable." A trip resolves lazily off
   real elapsed time, same principle as farm growth/villager work, so
   it completes whether or not the app was open the whole time.
   Run: node test/travel.js */
const { boot } = require('./harness');
const { G, store, tickIntervals } = boot();
const UI = G.UI;

console.log('== travel cost sums the road chain, not just distance-from-Aerendell ==');
G.wipe(); S.weight = 0; S.kills = 999;   // clear every kill gate for this whole file
console.log('  Forest Road costs 30s:', G.travelCost('forestRoad') === 30 * 1000);
console.log('  Khar-Barak costs 5:30 (0:30 + 5:00):', G.travelCost('kharBarak') === 5.5 * 60 * 1000);
console.log('  Still-tide Pass costs 10:30:', G.travelCost('stillTidePass') === 10.5 * 60 * 1000);
console.log('  Duun-Vael Bridge costs 15:30:', G.travelCost('duunVaelBridge') === 15.5 * 60 * 1000);
console.log('  Riverhold costs 25:30 (the user\'s own worked example):',
  G.travelCost('riverhold') === 25.5 * 60 * 1000);
console.log('  not traveling yet:', G.isTraveling() === false);
const started = G.travel('forestRoad');
console.log('  starting a trip succeeds:', started);
console.log('  now traveling:', G.isTraveling() === true);
console.log('  S.zone has NOT changed yet:', S.zone === 'aerendell');
console.log('  S.travel records the real departure/arrival timestamps:',
  S.travel.to === 'forestRoad' && S.travel.arriveAt - S.travel.departAt === 30 * 1000);

console.log('\n== cost is point-to-point along the chain, not Aerendell-relative ==');
G.wipe(); S.weight = 0; S.kills = 999;
S.zone = 'kharBarak';
console.log('  Khar-Barak -> Still-tide Pass costs exactly 5:00, not 5:30+:',
  G.travelCost('stillTidePass') === 5 * 60 * 1000);
console.log('  Still-tide Pass -> Khar-Barak is symmetric (same 5:00):',
  (() => { S.zone = 'stillTidePass'; return G.travelCost('kharBarak') === 5 * 60 * 1000; })());
S.zone = 'aerendell';

console.log('\n== you cannot start a second trip mid-trip, or re-travel to where you already are ==');
G.wipe(); S.weight = 0; S.kills = 999;
G.travel('forestRoad');
console.log('  starting another trip while traveling is refused:', G.travel('kharBarak') === false);
console.log('  still headed to Forest Road, not Khar-Barak:', S.travel.to === 'forestRoad');
G.wipe(); S.weight = 0; S.kills = 999;
console.log('  "traveling" to your current zone is refused:', G.travel('aerendell') === false);

console.log('\n== arrival is lazy — nothing happens before arriveAt, everything happens after ==');
G.wipe(); S.weight = 0; S.kills = 999;
const frMs = 30 * 1000;
G.travel('forestRoad');
global.__clock += frMs - 1000;   // 1 second short of arrival
console.log('  not arrived 1s early:', G.checkTravelArrival() === false);
console.log('  still traveling, still in Aerendell:', G.isTraveling() && S.zone === 'aerendell');
global.__clock += 1000;          // exactly on time
console.log('  arrives the moment arriveAt passes:', G.checkTravelArrival() === true);
console.log('  S.travel is cleared:', S.travel === null);
console.log('  actually relocated:', S.zone === 'forestRoad');
console.log('  no longer traveling:', G.isTraveling() === false);

console.log('\n== a trip completes even if the app was closed the whole time (boot-time catch-up) ==');
G.wipe(); S.weight = 0; S.kills = 999;
const kbMs = 5.5 * 60 * 1000;
G.travel('kharBarak');
console.log('  really is traveling:', G.isTraveling());
global.__clock += kbMs + 4 * 60 * 1000;   // well past the 5:30 Khar-Barak trip, "app closed" the whole time
console.log('  G.checkTravelArrival (the exact call main.js makes right after G.load()) resolves it:',
  G.checkTravelArrival() === true);
console.log('  arrived in Khar-Barak:', S.zone === 'kharBarak');

console.log('\n== the travel overlay renders while a trip is in progress, and only then ==');
G.wipe(); S.weight = 0; S.kills = 999;
UI.renderAll();
console.log('  hidden while not traveling:', store['travel-overlay'].style.display === 'none');
const stMs = 10.5 * 60 * 1000;   // Aerendell -> Still-tide Pass
G.travel('stillTidePass');
UI.renderTravelOverlay();
console.log('  shown once a trip starts:', store['travel-overlay'].style.display === 'flex');
console.log('  names the real destination:', store['travel-dest'].textContent === 'Still-tide Pass');
console.log('  ETA reads mm:ss for a sub-hour trip:', store['travel-eta'].textContent === '10:30');
global.__clock += 5 * 60 * 1000 + 15 * 1000;   // partway through the 10:30 trip
UI.renderTravelOverlay();
console.log('  ETA counts down as real time passes:', store['travel-eta'].textContent === '5:15');
console.log('  the progress bar is roughly half full:',
  (() => { const w = parseFloat(store['travel-bar-fill'].style.width); return w > 45 && w < 55; })());
global.__clock += stMs;   // well past arrival
G.checkTravelArrival();
UI.renderTravelOverlay();
console.log('  hides again on arrival:', store['travel-overlay'].style.display === 'none');

console.log('\n== the travel ticker resolves a trip through the real shared registry, not a direct call ==');
G.wipe(); S.weight = 0; S.kills = 999;
G.startTickers();
G.travel('forestRoad');
global.__clock += frMs + 1500;   // just past arrival, plus one 1s ticker tick
tickIntervals();
console.log('  arrived via the shared ticker loop, no direct checkTravelArrival call:',
  S.zone === 'forestRoad' && S.travel === null);
G.stopTickers();

console.log('\n== no hand is dealt mid-trip; the deck itself is untouched ==');
G.wipe(); S.weight = 0; S.kills = 999;
const deckBefore = JSON.stringify(G.deckCounts());
G.travel('kharBarak');
console.log('  deck unchanged the instant a trip starts:', JSON.stringify(G.deckCounts()) === deckBefore);

console.log('\n== the Home page shows the real per-destination chain cost, and disables Travel mid-trip ==');
G.wipe(); S.weight = 0; S.kills = 999;
UI.go('home');
UI.renderHome();
/* the zone's name lives inside .zone-top's own (nested) span, not
   directly in the card's children — find a card by its Travel
   button's own cost text instead, which is unique per zone here and
   simpler than descending into zone-top just to match a name. */
function findByTravelLabel(label) {
  const cards = store['world'].children.filter(c => c.className && c.className.indexOf('zone') === 0);
  for (const c of cards) {
    const btn = c.children.find(x => x._html === 'Travel (' + label + ')');
    if (btn) return btn;
  }
  return null;
}
const travelBtn = findByTravelLabel('30s');   // Forest Road
console.log('  Forest Road\'s card shows a "Travel (30s)" button:', !!travelBtn);
console.log('  it is enabled while not traveling:', travelBtn && travelBtn.disabled === false);
G.travel('stillTidePass');
UI.renderHome();
const travelBtn2 = findByTravelLabel('30s');
console.log('  Travel buttons disable once a trip is already underway:', travelBtn2 && travelBtn2.disabled === true);
