/* Batch 2 of the real-time/economy plan: the seasonal calendar built
   on top of the real-device clock (systems/clock.js). One real week
   = one season; a fresh character always starts Day 1 = Spring,
   regardless of real-world date, via S.seasonEpoch stamped once at
   creation. Purely local/per-save, nothing server-synced.
   Run: node test/season.js */
const { boot } = require('./harness');
const { G, store, tickIntervals } = boot();
const UI = G.UI;

console.log('== a fresh character always starts Day 1 == Spring ==');
G.wipe();
console.log('  seasonEpoch was stamped:', typeof S.seasonEpoch === 'number');
console.log('  seasonEpoch is essentially now:', Math.abs(Date.now() - S.seasonEpoch) < 2000);
console.log('  gameDay is 0 on day one:', G.gameDay() === 0);
console.log('  season is spring:', G.gameSeason() === 'spring');
console.log('  6 days left in the season on day 0:', G.daysLeftInSeason() === 6);

console.log('\n== the four seasons cycle one real week apart ==');
console.log('  G.SEASONS is spring/summer/autumn/winter:',
  JSON.stringify(G.SEASONS) === JSON.stringify(['spring', 'summer', 'autumn', 'winter']));
const dayMs = 86400000;
const cases = [
  [0, 'spring'], [6, 'spring'], [7, 'summer'], [13, 'summer'],
  [14, 'autumn'], [20, 'autumn'], [21, 'winter'], [27, 'winter'],
  [28, 'spring'],   // a full 4-week year, back to spring
  [35, 'summer'],   // and the cycle repeats indefinitely, not just once
];
cases.forEach(([day, expected]) => {
  S.seasonEpoch = Date.now() - day * dayMs;
  console.log('  day ' + day + ' -> ' + expected + ':', G.gameSeason() === expected);
});

console.log('\n== days-left counts down within a season, inclusive of today ==');
[0, 1, 2, 3, 4, 5, 6, 7].forEach(day => {
  S.seasonEpoch = Date.now() - day * dayMs;
  const expected = 6 - (day % 7);
  console.log('  day ' + day + ' -> ' + expected + ' left:', G.daysLeftInSeason() === expected);
});

console.log('\n== an old save with no seasonEpoch migrates to Day 1 on load, not a crash ==');
G.wipe();
delete S.seasonEpoch;
G.save(false);
window.S = G.S = G.freshState();
delete S.seasonEpoch;   // simulate a pre-season save shape surviving into freshState too
G.load();
console.log('  seasonEpoch backfilled on load:', typeof S.seasonEpoch === 'number');
console.log('  migrated save also starts at day 0/spring:', G.gameDay() === 0 && G.gameSeason() === 'spring');

console.log('\n== UI.renderSeason draws the Home page panel ==');
G.wipe();
UI.go('home');
console.log('  season-panel is populated:', store['season-panel'].children.length === 1);
const panelHtml = store['season-panel'].children[0]._html;
console.log('  shows the season name:', panelHtml.indexOf('Spring') >= 0);
console.log('  shows day-of-week and days-left:', /day 1 of 7/.test(panelHtml) && /6 days left/.test(panelHtml));
console.log('  renders a real svg icon, not a missing sprite:', panelHtml.indexOf('<svg') >= 0);

console.log('\n== the panel updates as the season advances ==');
S.seasonEpoch = Date.now() - 7 * dayMs;   // exactly one week in -> summer, day 1 of that week
UI.renderSeason();
const summerHtml = store['season-panel'].children[0]._html;
console.log('  now reads Summer:', summerHtml.indexOf('Summer') >= 0);
console.log('  back to day 1 of the new week:', /day 1 of 7/.test(summerHtml));

console.log('\n== "changes tomorrow" phrasing on the last day of a season ==');
S.seasonEpoch = Date.now() - 6 * dayMs;   // day 6 -> 0 days left
UI.renderSeason();
const lastDayHtml = store['season-panel'].children[0]._html;
console.log('  reads "changes tomorrow" instead of "0 days left":',
  lastDayHtml.indexOf('changes tomorrow') >= 0);

console.log('\n== a real day rollover re-renders while the app is open ==');
G.wipe(); S.seasonEpoch = Date.now();
G.startTickers();
let dayChanges = 0;
G.on('season:dayChanged', () => { dayChanges++; });
let stateChanges = 0;
G.on('state:changed', () => { stateChanges++; });
global.__clock += 61000;   // prime lastGameDay via the ticker's first real fire
tickIntervals();
global.__clock += dayMs;   // cross midnight
tickIntervals();
console.log('  season:dayChanged fired on the rollover:', dayChanges >= 1);
console.log('  and it triggered a re-render:', stateChanges >= 1);
G.stopTickers();
