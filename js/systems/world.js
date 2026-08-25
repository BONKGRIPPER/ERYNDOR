/* =========================================================
   systems/world.js — regions, zones and travel.

   Add a zone: one entry in G.ZONES (data.js). It appears on the
   Home map automatically, grouped under its region.

   `needs` gates travel. Supported keys:
     kills: n      total animals slain
     item: 'key'   must have held one at some point
     skill: { mining: 5 }
   ========================================================= */
(function (G) {
  'use strict';

  G.zone = () => G.ZONES[S.zone] || G.ZONES[G.START_ZONE];
  G.zoneName = () => G.zone().name;

  G.regionZones = function (regionId) {
    return Object.keys(G.ZONES)
      .filter(id => G.ZONES[id].region === regionId)
      .map(id => Object.assign({ id }, G.ZONES[id]))
      .sort((a, b) => (a.order || 0) - (b.order || 0));
  };

  /* why a zone is locked, or null if open */
  G.zoneBlocker = function (id) {
    const z = G.ZONES[id];
    if (!z) return 'unknown';
    if (z.open) return null;
    const n = z.needs || {};
    if (n.kills && S.kills < n.kills) {
      return (n.kills - S.kills) + ' more kills';
    }
    if (n.item && !G.isKnown(n.item)) {
      return 'need ' + (G.RESOURCES[n.item] ? G.RESOURCES[n.item].name : n.item);
    }
    if (n.skill) {
      const k = Object.keys(n.skill)[0];
      const lv = S.skills[k] ? S.skills[k].lv : 1;
      if (lv < n.skill[k]) return G.SKILLS[k].name + ' ' + n.skill[k];
    }
    return null;
  };
  G.zoneOpen = id => G.zoneBlocker(id) === null;

  /* THE DECK IS GLOBAL — deliberately not stashed here, it simply
     travels with you. Zones used to keep their own deck and draw
     position, so arriving somewhere new built a fresh starter deck
     out of that zone's own `deck` block and handed you a pile of
     cards you never picked. Those blocks are gone from data.js and
     custom-content.js, and G.buildDeck is no longer called on
     travel at all.

     Still zone-tied: the pasture/location field AND workshops —
     moving on means rebuilding the Crafting Bench and everything
     else there from scratch (ALWAYS_BUILT stations like Bare Hands
     are the one exception, backfilled into every zone's built map so
     they're never re-gated) — plus that zone's farm plots. Deck,
     deck slots, inventory and skills are shared across all zones.

     Deck SLOTS are global too, so the D1/D2/D3 loadouts you build
     are available everywhere. A zone can still name a preferred slot
     to auto-equip on arrival (autoEquipPreferredDeck, below), which
     is now purely a convenience switch between loadouts you built
     yourself rather than a hidden deck rewrite. */
  function stash(zone) {
    if (!S.zones) S.zones = {};
    G.syncActiveDeckSlot();
    S.zones[zone] = {
      locationDecks: S.locationDecks,
      locationField: S.locationField,
      built: S.built,
      farmPlots: S.farmPlots,
    };
  }
  function restore(zone) {
    const saved = S.zones && S.zones[zone];
    if (saved && saved.locationDecks) {
      S.locationDecks = saved.locationDecks || [];
      S.locationField = saved.locationField || [null, null, null];
      if (G.syncLocationDecksToZone) G.syncLocationDecksToZone();
      G.fillLocationField();              // top up if any slot's deck grew since last visit
      /* always-built stations forced true last, in case this stash
         predates them (or predates zone-tied buildings entirely) */
      S.built = Object.assign({}, saved.built, G.defaultBuilt());
      S.farmPlots = saved.farmPlots || [];
      return false;                       // returning to a known road
    }
    /* First visit sets up the field and the buildings only — the
       player's deck is not touched. */
    G.buildLocationDecks();
    S.locationDecks.forEach(sd => G.shuffle(sd.deck));
    S.locationField = [null, null, null];
    G.fillLocationField();
    S.built = G.defaultBuilt();
    S.farmPlots = [];
    return true;                          // first visit
  }
  function autoEquipPreferredDeck(zone) {
    const pref = G.preferredDeckForZone(zone);
    if (typeof pref !== 'number') return;
    const slot = G.ensureDeckSlotExists(pref);
    if (!slot.deck || !slot.deck.length) return;
    G.loadDeckSlot(pref);
  }

  /* Actually relocates the player — the old, instant G.travel body.
     Only ever called once a trip's arriveAt has actually passed (see
     G.travel/G.checkTravelArrival below); never called directly for
     a player-initiated move any more. */
  function arrive(id) {
    stash(S.zone);
    S.zone = id;
    const first = restore(id);
    autoEquipPreferredDeck(id);
    G.emit('travel:done', { id, name: G.ZONES[id].name, first, deck: S.deck.length });
    G.emit('deck:changed');
    G.emit('state:changed');
    G.save(true);
  }

  /* Batch 4, real-time plan (chain-graph revision): every zone sits
     along ONE road, in G.TRAVEL_ROAD order (data.js). Cost between the
     player's current zone and a destination is the sum of every link
     strictly between their two positions in that list, in either
     direction — so it's genuinely point-to-point along the road, not
     just "distance from Aerendell": Khar-Barak -> Still-tide Pass
     costs exactly 5min, the same as the reverse, regardless of where
     Aerendell sits. Returns milliseconds. */
  G.travelCost = function (id) {
    const road = G.TRAVEL_ROAD;
    const iFrom = road.findIndex(n => n.zone === S.zone);
    const iTo = road.findIndex(n => n.zone === id);
    if (iFrom < 0 || iTo < 0 || iFrom === iTo) return 0;
    const lo = Math.min(iFrom, iTo), hi = Math.max(iFrom, iTo);
    let total = 0;
    for (let i = lo + 1; i <= hi; i++) total += road[i].ms || 0;
    return total;
  };

  G.isTraveling = () => !!S.travel;
  G.travelRemainingMs = () => S.travel ? Math.max(0, S.travel.arriveAt - Date.now()) : 0;

  /* Lazy resolver, same "compute on next read" principle as
     G.collectFarmWork/G.collectVillagerWork — a trip completes
     whether or not the app was open for the whole duration. Returns
     true (and finalizes arrival) only once the clock has actually
     passed arriveAt. */
  G.checkTravelArrival = function () {
    if (!S.travel) return false;
    if (Date.now() < S.travel.arriveAt) return false;
    const id = S.travel.to;
    S.travel = null;
    arrive(id);
    return true;
  };

  /* Starts a trip instead of relocating instantly. A 0-cost route
     (none exist today, but the field is real content data, not a
     hardcoded assumption) resolves immediately rather than opening a
     0-length travel screen. */
  G.travel = function (id) {
    if (!G.ZONES[id]) return false;
    if (id === S.zone) return false;
    if (G.isTraveling()) return false;
    const blocker = G.zoneBlocker(id);
    if (blocker) {
      G.emit('travel:blocked', { id, blocker });
      return false;
    }
    const ms = G.travelCost(id);
    if (ms <= 0) { arrive(id); return true; }
    const now = Date.now();
    S.travel = { from: S.zone, to: id, departAt: now, arriveAt: now + ms };
    G.emit('travel:started', { to: id, ms, arriveAt: S.travel.arriveAt });
    G.emit('state:changed');
    G.save(true);
    return true;
  };

  /* Ticks once a real second — cheap on purpose. While a trip is
     still in progress this calls UI.renderTravelOverlay() DIRECTLY
     rather than emitting state:changed (a full UI.renderAll every
     second): the exact mistake the farm countdown ticker made
     earlier this session, which forced a whole-app re-render every
     5s on every page for as long as anything was growing. Travel
     deliberately blocks all input behind a full-screen overlay while
     it's active, so the risk that fix addressed doesn't apply the
     same way here — but there's no reason to pay for it regardless
     when a targeted update does the same job. state:changed only
     fires on actual arrival, since that's a real full-app state
     change (new zone, new stations, new field). */
  G.registerTicker('travel', 1000, () => {
    if (!S.travel) return;
    if (G.checkTravelArrival()) return;
    if (G.UI && G.UI.renderTravelOverlay) G.UI.renderTravelOverlay();
  });

  /* Is a station or recipe available in the current zone? */
  G.inZone = function (thing) {
    if (!thing) return false;
    return !thing.zones || thing.zones.indexOf(S.zone) >= 0;
  };

})(window.Game = window.Game || {});
