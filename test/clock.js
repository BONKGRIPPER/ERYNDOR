/* The real-time clock (Batch 1 of the real-time/economy plan) — game
   hour IS the device's real hour, read fresh every time, nothing
   persisted. Foundation for the season/gating/travel batches to come.
   Run: node test/clock.js */
const { boot } = require('./harness');
const { G, store, tickIntervals } = boot();
const UI = G.UI;

function setClock(hour, minute) {
  const d = new Date();
  d.setHours(hour, minute || 0, 0, 0);
  global.__clock = d.getTime();
}

console.log('== gameClock reads the device time directly, not a stored value ==');
setClock(14, 30);
let c = G.gameClock();
console.log('  hour matches:', c.hour === 14);
console.log('  minute matches:', c.minute === 30);
setClock(9, 5);
c = G.gameClock();
console.log('  a later read reflects the new time, nothing cached:', c.hour === 9 && c.minute === 5);

console.log('\n== day/night boundary: [dayStartHour, nightStartHour) is day ==');
console.log('  TUNE.dayStartHour is 7:', G.TUNE.dayStartHour === 7);
console.log('  TUNE.nightStartHour is 21:', G.TUNE.nightStartHour === 21);
setClock(6, 59);
console.log('  6:59am is still night:', G.isNight() === true);
setClock(7, 0);
console.log('  7:00am flips to day:', G.isNight() === false);
setClock(20, 59);
console.log('  8:59pm is still day:', G.isNight() === false);
setClock(21, 0);
console.log('  9:00pm flips to night:', G.isNight() === true);
setClock(2, 0);
console.log('  2am is night:', G.isNight() === true);
setClock(12, 0);
console.log('  noon is day:', G.isNight() === false);

console.log('\n== the clock ticker actually fires through the shared registry ==');
setClock(10, 0);
G.startTickers();
let ticks = 0;
G.on('clock:changed', () => { ticks++; });
global.__clock += 61000;   // past the 60s clock ticker interval
tickIntervals();
console.log('  clock:changed fired through the real shared loop:', ticks >= 1);
G.stopTickers();

console.log('\n== state:changed fires only on an actual day/night FLIP ==');
setClock(10, 0);           // day
G.startTickers();
tickIntervals();           // primes lastIsNight via the ticker's own first fire
let stateChanges = 0;
G.on('state:changed', () => { stateChanges++; });
global.__clock += 61000;   // still 11am-ish — still day, no flip
tickIntervals();
console.log('  a same-state tick does not fire state:changed:', stateChanges === 0);
global.__clock += 10 * 3600 * 1000;   // jump ~10h forward, well past 8pm -> night
tickIntervals();
console.log('  a real day/night flip DOES fire state:changed:', stateChanges >= 1);
G.stopTickers();

console.log('\n== UI.renderClock renders the icon and a 12-hour readout ==');
setClock(14, 5);   // 2:05pm
UI.renderClock();
console.log('  clock-time reads 2:05pm:', store['clock-time'].textContent === '2:05pm');
console.log('  clock-ico rendered an svg:', store['clock-ico']._html.indexOf('<svg') >= 0);
setClock(0, 0);     // midnight -> 12:00am
UI.renderClock();
console.log('  midnight reads 12:00am, not 0:00am:', store['clock-time'].textContent === '12:00am');
setClock(12, 0);    // noon -> 12:00pm
UI.renderClock();
console.log('  noon reads 12:00pm, not 0:00pm:', store['clock-time'].textContent === '12:00pm');
setClock(23, 9);
UI.renderClock();
console.log('  11:09pm formats correctly:', store['clock-time'].textContent === '11:09pm');

console.log('\n== the header renders it automatically via renderVitals ==');
setClock(21, 0);   // 9pm — night
UI.renderVitals();
console.log('  it really is night at this clock reading:', G.isNight() === true);
console.log('  clock-time was updated by the same renderVitals call:', store['clock-time'].textContent === '9:00pm');
setClock(9, 0);     // 9am — day
UI.renderVitals();
console.log('  and updates again on the next renderVitals call:', store['clock-time'].textContent === '9:00am');

console.log('\n== nothing about the clock is persisted — it is purely derived ==');
console.log('  no clock field on freshState:', !('gameClock' in G.freshState()) && !('clock' in G.freshState()));
