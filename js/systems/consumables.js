/* =========================================================
   systems/consumables.js — items cards spend when they resolve.

   A card asks for a GROUP (e.g. 'ammo'). It gets whichever item
   the player selected in the Bag tab, or — if nothing is chosen
   or the chosen one has run out — the strongest one they own.

   Add a new arrow:
     G.CONSUMABLES.fireArrow = { group:'ammo', dmg:3 };
     G.RESOURCES.fireArrow   = { name:'Fire Arrow', wt:1, tint:'ember' };
   The Bag list and bow damage pick it up with no other changes.
   ========================================================= */
(function (G) {
  'use strict';

  /* everything in a group, owned or not */
  G.groupItems = function (group) {
    return Object.keys(G.CONSUMABLES)
      .filter(k => G.CONSUMABLES[k].group === group)
      .map(k => ({
        key: k,
        name: G.RESOURCES[k] ? G.RESOURCES[k].name : k,
        dmg: G.CONSUMABLES[k].dmg || 0,
        have: S[k] || 0,
      }))
      .sort((a, b) => b.dmg - a.dmg);
  };

  /* what a card will actually spend right now */
  G.activeConsumable = function (group) {
    const chosen = S.selected && S.selected[group];
    if (chosen && (S[chosen] || 0) > 0) {
      return { key: chosen, ...G.CONSUMABLES[chosen] };
    }
    /* fall back to the strongest one in the pack */
    const best = G.groupItems(group).filter(i => i.have > 0)[0];
    return best ? { key: best.key, ...G.CONSUMABLES[best.key] } : null;
  };

  G.selectConsumable = function (group, key) {
    if (!S.selected) S.selected = {};
    if (S.selected[group] === key) delete S.selected[group];   // tap again to clear
    else S.selected[group] = key;
    G.emit('consumable:selected', { group, key: S.selected[group] || null });
    G.emit('state:changed');
    G.save(false);
  };

  /* spend one; returns the item used or null */
  G.spendConsumable = function (group) {
    const c = G.activeConsumable(group);
    if (!c) return null;
    G.removeRes(c.key, 1);
    return c;
  };

})(window.Game = window.Game || {});
