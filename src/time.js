// ===================================================================== time
//
// Two independent real clocks, neither of them ticked -- every value here
// is computed fresh from `Date.now()` and `state.startedAt`, so it's always
// correct the instant it's read, including after the game's been closed
// for a week. Same "deadline, not countdown" philosophy as every timer in
// this game, just applied to the game's overall clock instead of one plot
// or one craft.
//
// Day/night reads the player's actual device clock -- real dusk, real
// dawn, whatever timezone the device is set to. The season calendar reads
// real elapsed time since state.startedAt (set once, at the player's very
// first boot, never reset by a reload) rather than the calendar date --
// every save starts in Spring on Day 1, no matter what month it really is.
//
// Nothing here touches the DOM or mutates state; every export is a pure
// function safe to call from anywhere, including mid-render.

import {
  SEASONS, SEASON_ORDER, NIGHT_START_HOUR, NIGHT_END_HOUR, NIGHT_GROWTH_MULT,
  TOWN_MARKET_CLOSED_START_HOUR, TOWN_MARKET_CLOSED_END_HOUR,
} from "./data.js";

export const DAY_MS = 24 * 60 * 60 * 1000;
export const WEEK_MS = 7 * DAY_MS;
export const YEAR_DAYS = SEASON_ORDER.length * 7;

// The player's own device clock, 24h local time. Night spans midnight
// (20 -> 6 by default), so this checks the wraparound rather than assuming
// start < end.
export function isNight(date) {
  const hour = (date || new Date()).getHours();
  if (NIGHT_START_HOUR > NIGHT_END_HOUR) {
    return hour >= NIGHT_START_HOUR || hour < NIGHT_END_HOUR;
  }
  return hour >= NIGHT_START_HOUR && hour < NIGHT_END_HOUR;
}

// A town-type location's market (see LOCATIONS in data.js) closes
// overnight -- its own separate window from night itself, checked the
// same wraparound way. A city's market never calls this at all (open
// 24/7 by type, not by hours); landmarks/wilderness have no market to
// open or close.
export function isTownMarketOpen(date) {
  const hour = (date || new Date()).getHours();
  const closed = TOWN_MARKET_CLOSED_START_HOUR > TOWN_MARKET_CLOSED_END_HOUR
    ? (hour >= TOWN_MARKET_CLOSED_START_HOUR || hour < TOWN_MARKET_CLOSED_END_HOUR)
    : (hour >= TOWN_MARKET_CLOSED_START_HOUR && hour < TOWN_MARKET_CLOSED_END_HOUR);
  return !closed;
}

// Guards against a clock that's somehow behind startedAt (a corrupted save,
// a device clock changed backward) reporting negative elapsed time.
export function elapsedDays(startedAt) {
  return Math.max(0, Date.now() - startedAt) / DAY_MS;
}

export function seasonId(startedAt) {
  const week = Math.floor(elapsedDays(startedAt) / 7);
  return SEASON_ORDER[week % SEASON_ORDER.length];
}

export function season(startedAt) {
  return SEASONS[seasonId(startedAt)];
}

// 1..7 -- which real day of the current real week/season this is.
export function dayOfSeason(startedAt) {
  return Math.floor(elapsedDays(startedAt) % 7) + 1;
}

// 1-based -- one real month of play is "Year 1", the next is "Year 2".
export function yearNumber(startedAt) {
  return Math.floor(elapsedDays(startedAt) / YEAR_DAYS) + 1;
}

// The one thing most other systems will actually call: how much faster or
// slower a growth timer should run right now, for the given skill
// category. Two independent modifiers multiplied together -- the season's
// own number (see SEASONS in data.js) and a flat night penalty -- rather
// than one tangled number, so a later system can key off either alone
// (a night-only enemy buff, a season-only market swing) without this
// function needing to change.
export function growthMultiplier(startedAt, category) {
  const s = season(startedAt);
  const seasonMult = (s.growth && s.growth[category]) || 1;
  const nightMult = isNight() ? NIGHT_GROWTH_MULT : 1;
  return seasonMult * nightMult;
}
