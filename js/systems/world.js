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

  /* Each zone keeps its own deck, draw position, pasture, location
     field AND workshops — moving on means rebuilding the Crafting
     Bench and everything else there from scratch (ALWAYS_BUILT
     stations like Bare Hands are the one exception, backfilled into
     every zone's built map so they're never re-gated). Inventory
     and skills are the only things still shared across all zones. */
  function stash(zone) {
    if (!S.zones) S.zones = {};
    G.syncActiveDeckSlot();
    S.zones[zone] = {
      deck: S.deck, drawnCount: S.drawnCount,
      deckSlots: S.deckSlots,
      activeDeckSlot: S.activeDeckSlot,
      locationDecks: S.locationDecks,
      locationField: S.locationField,
      built: S.built,
      farmPlots: S.farmPlots,
    };
  }
  function restore(zone) {
    const saved = S.zones && S.zones[zone];
    if (saved && saved.deckSlots && saved.deckSlots.length) {
      S.deckSlots = saved.deckSlots;
      if (G.pruneZoneDeckCards) G.pruneZoneDeckCards(zone, S.deckSlots);
      S.activeDeckSlot = saved.activeDeckSlot || 0;
      G.ensureDeckSlots();
      G.loadDeckSlot(S.activeDeckSlot);
      S.locationDecks = saved.locationDecks || [];
      S.locationField = saved.locationField || [null, null, null];
      if (G.syncLocationDecksToZone) G.syncLocationDecksToZone();
      G.fillLocationField();
      S.built = Object.assign({}, saved.built, G.defaultBuilt());
      S.farmPlots = saved.farmPlots || [];
      return false;
    }
    if (saved && saved.deck && saved.deck.length) {
      S.deck = saved.deck;
      S.drawnCount = saved.drawnCount || 0;
      S.deckSlots = [{ deck: S.deck, drawnCount: S.drawnCount }];
      if (G.pruneZoneDeckCards) G.pruneZoneDeckCards(zone, S.deckSlots);
      S.activeDeckSlot = 0;
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
    G.buildDeck();
    G.shuffle(S.deck);
    S.drawnCount = 0;
    S.deckSlots = [{ deck: S.deck, drawnCount: 0 }];
    S.activeDeckSlot = 0;
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

  G.travel = function (id) {
    if (!G.ZONES[id]) return false;
    if (id === S.zone) return false;
    const blocker = G.zoneBlocker(id);
    if (blocker) {
      G.emit('travel:blocked', { id, blocker });
      return false;
    }
    stash(S.zone);
    S.zone = id;
    const first = restore(id);
    autoEquipPreferredDeck(id);
    G.emit('travel:done', { id, name: G.ZONES[id].name, first, deck: S.deck.length });
    G.emit('deck:changed');
    G.emit('state:changed');
    G.save(true);
    return true;
  };

  /* Is a station or recipe available in the current zone? */
  G.inZone = function (thing) {
    if (!thing) return false;
    return !thing.zones || thing.zones.indexOf(S.zone) >= 0;
  };

})(window.Game = window.Game || {});
