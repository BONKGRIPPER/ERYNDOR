/* =========================================================
   systems/food.js — eating.

   Add a food: G.FOODS.myItem = { heal: 2 }
   Cooking lives at the Campfire station now, as ordinary tap-craft
   recipes (see G.STATIONS.firepit in data.js) — nothing else needs
   to change here to add a new one.
   ========================================================= */
(function (G) {
  'use strict';

  /* ---------- eating ---------------------------------------- */
  G.canEat = function (key) {
    const f = G.FOODS[key];
    return !!f && !f.needsCooking && f.heal > 0 && (S[key] || 0) > 0;
  };

  G.eat = function (key) {
    const f = G.FOODS[key];
    if (!f) return false;
    if (f.needsCooking) {
      G.emit('food:refused', { key, reason: 'raw' });
      return false;
    }
    if ((S[key] || 0) <= 0) return false;
    if (S.hp >= G.maxHp()) {
      G.emit('food:refused', { key, reason: 'full' });
      return false;
    }
    G.removeRes(key, 1);
    const before = S.hp;
    S.hp = Math.min(G.maxHp(), S.hp + f.heal);
    G.emit('food:eaten', { key, healed: S.hp - before });
    G.emit('state:changed');
    G.save(false);
    return true;
  };

})(window.Game = window.Game || {});
