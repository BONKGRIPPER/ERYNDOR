/* =========================================================
   systems/clock.js — the real-world device clock, read directly,
   plus the per-save seasonal calendar built on top of it.

   Batches 1-2 of the real-time/economy plan: the foundation
   time-of-day gating, seasonal content, and travel will all read
   from. Game hour-of-day IS the device's real hour-of-day — 5pm on
   the phone is 5pm in Aerendell, Animal Crossing-style. The clock
   itself is derived fresh from `Date` every time it's read, nothing
   persisted; the season needs exactly one persisted field
   (S.seasonEpoch, stamped once at character creation) since "day 1 is
   Spring" only means anything relative to when THIS save started.
   Same "compute on next read" principle G.collectVillagerWork/
   G.collectFarmWork already use for real-time-elapsed state.

   Player clock manipulation (setting the device clock forward) is
   NOT defended against — single-player, no server authority, no
   monetization today. Accepted deliberately; revisit if either of
   those change.
   ========================================================= */
(function (G) {
  'use strict';

  /* Day runs [dayStartHour, nightStartHour) in the device's local
     24-hour clock; everything outside that window is night. */
  G.gameClock = function () {
    /* Date.now() rather than `new Date()` — the test harness only
       mocks the former (see test/harness.js), and going through it
       here means test/clock.js can drive the clock the same way
       every other real-time system in this codebase is tested. */
    const d = new Date(Date.now());
    const hour = d.getHours();
    const minute = d.getMinutes();
    const isNight = hour < G.TUNE.dayStartHour || hour >= G.TUNE.nightStartHour;
    return { hour, minute, isNight };
  };

  G.isNight = () => G.gameClock().isNight;

  /* ---------- season -----------------------------------------
     A per-SAVE calendar, not a real one: S.seasonEpoch is stamped
     once, the moment a character is created (G.freshState) — so day 1
     is always Spring regardless of what the real-world date happens
     to be when someone starts playing. Nothing server-synced, purely
     local, exactly the brief's own scope decision ("avoids the
     'joined mid-winter and can't do anything' problem"). One real
     week = one season, 4 weeks = a full year, then it repeats. */
  G.SEASONS = ['spring', 'summer', 'autumn', 'winter'];
  G.gameDay = function () {
    const epoch = S.seasonEpoch || Date.now();
    return Math.floor((Date.now() - epoch) / 86400000);
  };
  G.seasonIndex = () => Math.floor(G.gameDay() / 7) % 4;
  G.gameSeason = () => G.SEASONS[G.seasonIndex()];
  /* how many FULL days remain before the season flips — 0 on the
     season's last day, matching how G.zoneXpNeed-style "N to next
     level" readouts already count down inclusive of today */
  G.daysLeftInSeason = () => 6 - (G.gameDay() % 7);

  /* Fires every real minute so the UI can update the clock readout
     without polling; emits state:changed only on an actual day/night
     FLIP or a DAY ROLLOVER, not every tick — same "don't re-render
     for nothing" shape as the farm/villager tickers. A day rollover
     (midnight) doesn't always cross the day/night boundary — night
     already spans across midnight by default (8pm-6am) — but it can
     still change gameDay()/gameSeason(), so it needs its own check or
     the Home page's season readout could go stale while left open
     across midnight. */
  let lastIsNight = null;
  let lastGameDay = null;
  G.registerTicker('clock', 60000, () => {
    const isNight = G.isNight();
    const gameDay = G.gameDay();
    G.emit('clock:changed', { isNight });
    const flipped = lastIsNight !== null && isNight !== lastIsNight;
    const newDay = lastGameDay !== null && gameDay !== lastGameDay;
    if (flipped) G.emit('clock:flipped', { isNight });
    if (newDay) G.emit('season:dayChanged', { gameDay, season: G.gameSeason() });
    if (flipped || newDay) G.emit('state:changed');
    lastIsNight = isNight;
    lastGameDay = gameDay;
  });

})(window.Game = window.Game || {});
