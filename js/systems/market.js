/* =========================================================
   systems/market.js — the Market page (city-only trade).

   Every resource except gold itself is tradeable, priced straight
   off G.RESOURCES[key].worth (added for the Donate feature — see its
   doc comment in data.js): sell at worth, buy at worth * TUNE.
   marketBuyMult. The markup is what stops a pointless sell-then-
   rebuy loop; no separate price table needed.

   Trade is tied to the CURRENT zone being a city (G.ZONES[id].kind
   === 'City'), not merely having discovered one earlier — leave a
   trade city and the Market gate closes immediately, same save or
   not. Both the UI and these functions enforce that so a stale page
   switch or old save cannot bypass it. Only Khar-Barak and Riverhold
   are trade cities right now — Aerendell is a Town (a real settlement,
   just not one with a market), Forest Road is Wilds, Duun-Vael Bridge
   is a Gauntlet. Making a new zone tradeable is exactly one field:
   set its G.ZONES entry's `kind: 'City'`. */
(function (G) {
  'use strict';

  G.zoneHasMarket = function (zoneId) {
    const zone = G.ZONES[zoneId || S.zone] || {};
    return zone.kind === 'City';
  };

  G.sellItem = function (key) {
    if (!G.zoneHasMarket()) return null;
    if (key === 'gold' || !G.RESOURCES[key]) return null;
    const qty = Math.min(G.TUNE.marketSellBatch, S[key] || 0);
    if (!qty) return null;
    G.removeRes(key, qty);
    const gain = qty * G.RESOURCES[key].worth;
    G.addRes('gold', gain);
    G.emit('market:sold', { key, qty, gain });
    G.emit('state:changed');
    G.save(false);
    return { key, qty, gain };
  };

  G.buyPrice = key => Math.ceil(G.RESOURCES[key].worth * G.TUNE.marketBuyMult);

  G.buyItem = function (key) {
    if (!G.zoneHasMarket()) return null;
    if (key === 'gold' || !G.RESOURCES[key]) return null;
    const cost = G.buyPrice(key);
    if ((S.gold || 0) < cost) return null;
    G.removeRes('gold', cost);
    G.addRes(key, 1);
    G.emit('market:bought', { key, cost });
    G.emit('state:changed');
    G.save(false);
    return { key, cost };
  };

})(window.Game = window.Game || {});
