/* =========================================================
   systems/township.js — villagers and the settlement.

   Villagers are the ONLY source of offline progress: card play
   and combat are real-time, so you can never die while away.

   A villager is hired AT a specific built station (click the
   station on the Craft page to open its menu — Level Up / Hire
   Villager), not as a named Town-page role anymore. It auto-taps
   that station's own `villagerRecipe` — the one recipe flagged as
   the safe default (always the cheapest, most-basic-input recipe,
   e.g. Stone Block at the Stone Cutter, never Basalt Block, which
   would eat the player's own Stone Blocks without asking). Later
   zones can flag more recipes per station as villager-craftable;
   nothing here assumes there's only ever one.

   A station-hired villager produces into ITS OWN ZONE's storage
   crate (G.zoneGrant, storage.js) — never the player's carried
   inventory. What it CONSUMES draws on the same three tiers the
   player's own G.spendCraftCost does, just zone-scoped: its own
   zone's crate first, then the player's carried inventory, then —
   if its own zone has a bank — the shared bank (G.zoneSpend/
   G.zoneCanAfford, storage.js). Never gated by G.storageReady()'s
   one-deposit-per-cycle rule (that's a player action limit, not a
   passive-production one). Carried inventory and the bank are both
   global state, not tied to S.zone, so this stays correct for a
   villager working while the player stands elsewhere or the app is
   closed — nothing here depends on where the player currently is.

   Homes unlock how MANY villagers you can hire (3 free slots per
   zone, +3 per home built there — see G.villagerSlots, data.js),
   not how fast any one of them works. Speed comes from the
   station's own tap-craft speed (G.stationSpeedMult) — upgrading a
   station speeds up every villager working it too.

   Add a home type: G.HOUSING.lodge = { zone, name, cost, note }
   ========================================================= */
(function (G) {
  'use strict';

  /* ---------- station villagers ------------------------------ */
  G.stationVillagerRecipe = function (stationId) {
    const st = G.findStation(stationId);
    if (!st) return null;
    return (st.recipes || []).find(r => r.villagerRecipe) || null;
  };
  G.stationHireable = function (stationId) {
    const st = G.findStation(stationId);
    return !!(st && st.villagerHireCost && G.stationVillagerRecipe(stationId));
  };

  G.hiredStationsIn = function (zone) {
    zone = zone || S.zone;
    const z = (S.stationVillagers && S.stationVillagers[zone]) || {};
    return Object.keys(z).filter(id => z[id]);
  };
  G.hiredCount = function (zone) {
    return G.hiredStationsIn(zone || S.zone).length;
  };
  G.isStationHired = function (stationId, zone) {
    zone = zone || S.zone;
    return !!(S.stationVillagers && S.stationVillagers[zone] && S.stationVillagers[zone][stationId]);
  };
  G.slotsFree = zone => G.villagerSlots(zone || S.zone) - G.hiredCount(zone || S.zone);
  G.anyVillagersHired = function () {
    return Object.keys(S.stationVillagers || {}).some(z => G.hiredCount(z) > 0);
  };

  G.hireVillagerAt = function (stationId) {
    const st = G.findStation(stationId);
    if (!st || !S.built[stationId] || !G.stationHireable(stationId)) return false;
    const zone = S.zone;
    if (G.isStationHired(stationId, zone)) return false;
    if (G.slotsFree(zone) <= 0) { G.emit('hire:failed', { reason: 'slots', id: stationId }); return false; }
    if (!G.canAffordCraft(st.villagerHireCost)) { G.emit('hire:failed', { reason: 'cost', id: stationId }); return false; }
    if (!G.spendCraftCost(st.villagerHireCost)) { G.emit('hire:failed', { reason: 'cost', id: stationId }); return false; }
    if (!S.stationVillagers) S.stationVillagers = {};
    if (!S.stationVillagers[zone]) S.stationVillagers[zone] = {};
    S.stationVillagers[zone][stationId] = true;
    if (!S.villagerLast) S.villagerLast = {};
    S.villagerLast[zone + ':' + stationId] = Date.now();
    G.grantXp('township', G.TUNE.hireXp);
    G.emit('hire:done', { id: stationId, zone, name: st.name });
    G.emit('state:changed');
    G.save(true);
    return true;
  };

  G.dismissVillagerAt = function (stationId, zone) {
    zone = zone || S.zone;
    if (!G.isStationHired(stationId, zone)) return false;
    const st = G.findStation(stationId);
    delete S.stationVillagers[zone][stationId];
    if (S.villagerLast) delete S.villagerLast[zone + ':' + stationId];
    G.emit('hire:dismissed', { id: stationId, zone, name: st && st.name });
    G.emit('state:changed');
    G.save(true);
    return true;
  };

  /* ---------- settlement ------------------------------------
     Homes are built per zone (and capped per zone at TUNE.maxHomes),
     and only expand that zone's own villager capacity. */
  G.homes = zone => (S.homes && S.homes[zone || S.zone]) || 0;

  G.zoneHousing = function (zone) {
    zone = zone || S.zone;
    return Object.keys(G.HOUSING)
      .filter(id => G.HOUSING[id].zone === zone)
      .map(id => Object.assign({ id }, G.HOUSING[id]));
  };

  G.buildHome = function (id) {
    const h = G.HOUSING[id];
    if (!h) return false;
    if (h.zone !== S.zone) { G.emit('home:failed', { reason: 'zone', id }); return false; }
    if (G.homes(h.zone) >= G.TUNE.maxHomes) {
      G.emit('home:failed', { reason: 'max', id }); return false;
    }
    if (!G.canAffordCraft(h.cost)) { G.emit('home:failed', { reason: 'cost', id }); return false; }
    if (!G.spendCraftCost(h.cost)) { G.emit('home:failed', { reason: 'cost', id }); return false; }
    if (!S.homes) S.homes = {};
    S.homes[h.zone] = (S.homes[h.zone] || 0) + 1;
    G.grantXp('township', G.TUNE.hireXp);
    G.emit('home:built', {
      id, name: h.name, zone: h.zone, count: S.homes[h.zone], slots: G.villagerSlots(h.zone),
    });
    G.emit('state:changed');
    G.save(true);
    return true;
  };

  /* ---------- production ------------------------------------
     Each hired villager keeps its own clock, ticking at the speed
     of the station it's hired at (see G.stationSpeedMult, craft.js)
     — upgrading that station speeds up every villager working it,
     same as it speeds up a player's own tap. G.timeScale() (core.js)
     is the same future "Slowed" status-effect hook the tap-craft
     job duration reads. */
  G.villagerInterval = function (stationId) {
    return Math.round(G.TUNE.tapCraftMs * G.villagerCraftMult() * G.stationSpeedMult(stationId) * G.timeScale());
  };
  /* Live "can this villager work right now" check — independent of
     the tick clock, so the station menu can show a stalled state
     even between ticks. Checked with G.zoneCanAfford, which covers
     the villager's own zone crate, the player's carried inventory,
     and (if that zone has a bank) the shared bank. */
  G.villagerStalled = function (stationId, zone) {
    zone = zone || S.zone;
    if (!G.isStationHired(stationId, zone)) return false;
    const r = G.stationVillagerRecipe(stationId);
    return !!r && !G.zoneCanAfford(zone, r.cost);
  };

  /* Everything a villager's recipe DOES, resource output routed to
     its own zone's crate instead of carried inventory. Deliberately
     narrower than craft.js's applyRecipeEffects — no grantsCard, no
     equips — because no recipe flagged villagerRecipe uses either
     (equip/card recipes are one-off or deck-bound, a poor fit for
     unattended auto-crafting); extend this the day one needs to. */
  function applyVillagerRecipe(zone, r) {
    const gained = {};
    if (r.gives) Object.keys(r.gives).forEach(k => {
      G.zoneGrant(zone, k, r.gives[k]);
      gained[k] = (gained[k] || 0) + r.gives[k];
    });
    if (r.skill && r.xp) G.grantXp(r.skill, r.xp);
    if (r.prayer) {
      S.prayerPoints += G.TUNE.bonePrayerPoints * r.prayer * G.prayerPointMult();
      G.grantXp('prayer', G.TUNE.bonePrayerXp * r.prayer);
    }
    return gained;
  }

  /* Runs one station-villager's clock forward, applying its recipe
     as many times as it's earned against ITS OWN zone's crate.
     Stops early (and rewinds the clock for whatever's left, so that
     unclaimed time is still there waiting once the crate is
     restocked, not burned) the moment the recipe's cost can't be
     afforded from that crate. */
  function tickStationVillager(zone, stationId, now) {
    const st = G.findStation(stationId);
    const r = st && G.stationVillagerRecipe(stationId);
    if (!st || !r) return null;
    const key = zone + ':' + stationId;
    if (!S.villagerLast) S.villagerLast = {};
    if (!S.villagerLast[key]) S.villagerLast[key] = now;
    const period = G.villagerInterval(stationId);
    let due = Math.floor((now - S.villagerLast[key]) / period);
    if (due <= 0) return null;
    const maxDue = Math.floor(G.TUNE.villagerCapH * 3600 * 1000 / period);
    if (due > maxDue) due = maxDue;

    let applied = 0;
    const gained = {};
    for (let i = 0; i < due; i++) {
      if (!G.zoneSpend(zone, r.cost)) break;
      const got = applyVillagerRecipe(zone, r);
      Object.keys(got).forEach(k => { gained[k] = (gained[k] || 0) + got[k]; });
      applied++;
    }
    const leftover = due - applied;
    S.villagerLast[key] = now - leftover * period;
    return {
      stationId, zone, stationName: st.name, recipeName: r.name,
      applied, gained, stalled: leftover > 0,
    };
  }

  /* What every station-villager, in every zone, made since we last
     looked — called both by the live ticker (while the app is open)
     and once directly on rejoin (main.js), so offline progress and
     live progress are the exact same code path, just a bigger gap. */
  G.collectVillagerWork = function () {
    const now = Date.now();
    const results = [];
    let ticks = 0;
    Object.keys(S.stationVillagers || {}).forEach(zone => {
      G.hiredStationsIn(zone).forEach(stationId => {
        const r = tickStationVillager(zone, stationId, now);
        if (r) { results.push(r); ticks += r.applied; }
      });
    });
    if (results.length) G.save(false);
    return { results, ticks };
  };

  G.registerTicker('villagers', 2000, () => {
    if (!G.anyVillagersHired()) return;
    const r = G.collectVillagerWork();
    if (r.ticks) {
      G.emit('villagers:tick', { results: r.results });
      G.emit('state:changed');
    }
  });

})(window.Game = window.Game || {});
