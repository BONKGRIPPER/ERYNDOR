/* =========================================================
   systems/storage.js — per-zone storage crates and shared banks.
   One deposit action per deck cycle; withdrawals are unrestricted
   except by the player's carry capacity.
   ========================================================= */
(function (G) {
  'use strict';

  function ensureStore(map, key) {
    if (!map[key]) map[key] = {};
    return map[key];
  }
  G.zoneHasBank = zoneId => !!((G.ZONES[zoneId || S.zone] || {}).bank);
  G.currentCrate = function () {
    if (!S.zoneStorage) S.zoneStorage = {};
    return ensureStore(S.zoneStorage, S.zone);
  };
  /* Zone-scoped crate access, for anything that needs a SPECIFIC
     zone's crate regardless of where the player currently stands
     (S.zone) — station-hired villagers (systems/township.js) work
     off their own zone's crate, since they run while the player may
     be elsewhere or the app may be closed entirely. */
  G.crateFor = function (zone) {
    if (!S.zoneStorage) S.zoneStorage = {};
    return ensureStore(S.zoneStorage, zone);
  };
  /* A villager checks its own zone crate first (the pool it's
     actually restocking), then falls back to the player's carried
     inventory, then — if its own zone has a bank — the shared bank,
     same three-tier order as the player's own G.spendCraftCost
     below. Carried inventory and the bank are both global (not tied
     to S.zone), so this stays correct for a villager working while
     the player stands elsewhere or the app is closed. */
  G.zoneAvailableCraftCount = function (zone, key) {
    let n = (S[key] || 0) + (G.crateFor(zone)[key] || 0);
    if (G.zoneHasBank(zone)) n += G.currentBank()[key] || 0;
    return n;
  };
  G.zoneCanAfford = function (zone, cost) {
    return Object.keys(cost).every(k => G.zoneAvailableCraftCount(zone, k) >= cost[k]);
  };
  G.zoneSpend = function (zone, cost) {
    if (!G.zoneCanAfford(zone, cost)) return false;
    Object.keys(cost).forEach(key => {
      let need = cost[key];
      const crate = G.crateFor(zone);
      const fromCrate = Math.min(need, crate[key] || 0);
      if (fromCrate > 0) {
        crate[key] -= fromCrate;
        if (crate[key] <= 0) delete crate[key];
        need -= fromCrate;
      }
      if (need > 0) {
        const fromInv = Math.min(need, S[key] || 0);
        if (fromInv > 0) { G.removeRes(key, fromInv); need -= fromInv; }
      }
      if (need > 0 && G.zoneHasBank(zone)) {
        const bank = G.currentBank();
        const fromBank = Math.min(need, bank[key] || 0);
        if (fromBank > 0) {
          bank[key] -= fromBank;
          if (bank[key] <= 0) delete bank[key];
          need -= fromBank;
        }
      }
    });
    return true;
  };
  G.zoneGrant = function (zone, key, qty) {
    if (!G.RESOURCES[key] || !qty) return 0;
    const crate = G.crateFor(zone);
    crate[key] = (crate[key] || 0) + qty;
    return qty;
  };
  G.currentBank = function () {
    if (!S.bankStorage) S.bankStorage = {};
    return S.bankStorage;
  };
  G.storageReady = function () {
    return !G.ensureDeckSlotExists(S.activeDeckSlot).storageUsed;
  };
  G.resetStorageCycle = function () {
    G.ensureDeckSlotExists(S.activeDeckSlot).storageUsed = false;
  };
  function markStorageUsed() {
    G.ensureDeckSlotExists(S.activeDeckSlot).storageUsed = true;
  }
  function targetStore(target) {
    return target === 'bank' ? G.currentBank() : G.currentCrate();
  }
  function bulkStoreBlocked(key) {
    return !!((G.FOODS && G.FOODS[key]) || (G.USABLES && G.USABLES[key]));
  }
  G.availableCraftCount = function (key) {
    let n = S[key] || 0;
    n += G.currentCrate()[key] || 0;
    if (G.zoneHasBank()) n += G.currentBank()[key] || 0;
    return n;
  };
  G.canAffordCraft = cost => Object.keys(cost).every(k => G.availableCraftCount(k) >= cost[k]);
  G.spendCraftCost = function (cost) {
    if (!G.canAffordCraft(cost)) return false;
    Object.keys(cost).forEach(key => {
      let need = cost[key];
      const inv = Math.min(need, S[key] || 0);
      if (inv > 0) {
        G.removeRes(key, inv);
        need -= inv;
      }
      if (need > 0) {
        const crate = G.currentCrate();
        const take = Math.min(need, crate[key] || 0);
        if (take > 0) {
          crate[key] -= take;
          if (crate[key] <= 0) delete crate[key];
          need -= take;
        }
      }
      if (need > 0 && G.zoneHasBank()) {
        const bank = G.currentBank();
        const take = Math.min(need, bank[key] || 0);
        if (take > 0) {
          bank[key] -= take;
          if (bank[key] <= 0) delete bank[key];
          need -= take;
        }
      }
    });
    return true;
  };

  G.depositToStorage = function (key, qty, target) {
    if (!G.RESOURCES[key] || !G.storageReady()) return 0;
    const n = G.removeRes(key, qty);
    if (!n) return 0;
    const store = targetStore(target);
    store[key] = (store[key] || 0) + n;
    markStorageUsed();
    G.emit('storage:changed', { target: target || 'crate', key, qty: n });
    G.emit('state:changed');
    G.save(false);
    return n;
  };

  G.depositAllToStorage = function (target) {
    if (!G.storageReady()) return null;
    const moved = {};
    Object.keys(G.RESOURCES).forEach(key => {
      const n = S[key] || 0;
      if (!n || bulkStoreBlocked(key)) return;
      const got = G.removeRes(key, n);
      if (got) moved[key] = got;
    });
    const keys = Object.keys(moved);
    if (!keys.length) return null;
    const store = targetStore(target);
    keys.forEach(key => { store[key] = (store[key] || 0) + moved[key]; });
    markStorageUsed();
    G.emit('storage:changed', { target: target || 'crate', moved });
    G.emit('state:changed');
    G.save(false);
    return moved;
  };

  G.withdrawFromStorage = function (key, qty, target) {
    const store = targetStore(target);
    const have = store[key] || 0;
    if (!G.RESOURCES[key] || !have) return 0;
    const want = Math.min(qty, have);
    const got = G.addRes(key, want);
    if (!got) return 0;
    store[key] -= got;
    if (store[key] <= 0) delete store[key];
    G.emit('storage:changed', { target: target || 'crate', key, qty: -got });
    G.emit('state:changed');
    G.save(false);
    return got;
  };

  G.on('deck:reshuffled', G.resetStorageCycle);

})(window.Game = window.Game || {});
