/* =========================================================
   systems/craft.js — building, recipes, prayer, deck purging,
   and the pin system that drives the three top slots.
   ========================================================= */
(function (G) {
  'use strict';

  G.findRecipe = function (id) {
    let found = null;
    G.STATIONS.forEach(st => st.recipes.forEach(r => { if (r.id === id) found = r; }));
    return found;
  };
  G.findStation = id => G.STATIONS.find(s => s.id === id);
  G.stationForRecipe = id => G.STATIONS.find(st => st.recipes.some(r => r.id === id));
  const CAMPFIRE_FUELS = {
    stick: { units: 1, label: 'Stick', detail: '1 fuel' },
    wood: { units: 4, label: 'Wood', detail: '4 fuel + 1 charcoal' },
    charcoal: { units: 8, label: 'Charcoal', detail: '8 fuel' },
  };
  function campfireRawKey(recipe) {
    return Object.keys(recipe.cost || {}).find(k => !CAMPFIRE_FUELS[k]) || null;
  }

  /* ---------- station upgrade levels -------------------------
     Level 1 is the base, unupgraded station — no entry needed.
     st.upgrades[0] is what level 2 buys, st.upgrades[1] is level 3,
     and so on; each tier's speedMult is the ABSOLUTE multiplier on
     TUNE.tapCraftMs at that level (not compounded per tier). */
  G.stationLevel = id => (S.stationLv && S.stationLv[id]) || 1;
  G.stationSpeedMult = function (id) {
    const st = G.findStation(id);
    const lv = G.stationLevel(id);
    if (!st || !st.upgrades || lv <= 1) return 1;
    const tier = st.upgrades[lv - 2];
    return tier ? tier.speedMult : 1;
  };
  /* the next tier to buy, or null once maxed / if the station has
     no upgrade path at all */
  G.stationNextUpgrade = function (id) {
    const st = G.findStation(id);
    if (!st || !st.upgrades) return null;
    return st.upgrades[G.stationLevel(id) - 1] || null;
  };
  G.upgradeStation = function (id) {
    const st = G.findStation(id);
    if (!st || !S.built[id]) return false;
    const next = G.stationNextUpgrade(id);
    if (!next || !G.canAffordCraft(next.cost)) return false;
    G.spendCraftCost(next.cost);
    if (!S.stationLv) S.stationLv = {};
    S.stationLv[id] = G.stationLevel(id) + 1;
    G.emit('station:upgraded', { id, name: st.name, level: S.stationLv[id] });
    G.emit('state:changed');
    G.save(true);
    return true;
  };

  /* Clears a pin once the thing it was tracking is actually done —
     a built station, or a one-off (non-repeatable) recipe. Without
     this a completed pin just sat there forever, invisible (see
     G.readPin) but still occupying one of only 3 slots with no way
     to free it from the UI.                                        */
  function unpin(type, id) {
    const i = (S.pins || []).findIndex(p => p && p.type === type && p.id === id);
    if (i < 0) return;
    S.pins[i] = null;
    G.emit('pins:changed');
  }

  /* ---------- building ------------------------------------- */
  G.buildStation = function (id) {
    const st = G.findStation(id);
    if (!st || st.locked || S.built[id] || !G.canAffordCraft(st.buildCost)) return false;
    G.spendCraftCost(st.buildCost);
    S.built[id] = true;
    unpin('station', id);
    G.emit('craft', { kind: 'station', id, name: st.name });
    G.save(true);
    return true;
  };

  /* ---------- crafting ------------------------------------- */
  /* Everything a recipe DOES, once its cost is already spent — shared
     by the instant G.craft() below and G.tickCraftJobs' tap-to-craft
     completion, so the two paths can never drift apart. */
  function applyRecipeEffects(r, id) {
    S.made[id] = (S.made[id] || 0) + 1;

    if (r.gives) Object.keys(r.gives).forEach(k => G.addRes(k, r.gives[k]));
    /* Wearing it is the point of crafting it, but keep a record of
       everything owned so the Bag's wardrobe can swap back to it
       later — crafting is otherwise a one-way door into a slot. */
    if (r.equips) {
      S.equipped[G.ITEMS[r.equips].slot] = r.equips;
      if (!Array.isArray(S.wardrobe)) S.wardrobe = [];
      if (S.wardrobe.indexOf(r.equips) < 0) S.wardrobe.push(r.equips);
    }
    if (r.skill && r.xp) G.grantXp(r.skill, r.xp);
    if (r.prayer) {
      S.prayerPoints += G.TUNE.bonePrayerPoints * r.prayer * G.prayerPointMult();
      G.grantXp('prayer', G.TUNE.bonePrayerXp * r.prayer);
    }
    /* weapons/tools grant a card carrying its own atk — a durability
       pool tops up per craft, so a second copy stacks uses rather
       than resetting them (see G.drainDurability in engine.js). */
    if (r.grantsCard) {
      G.addCardToDiscard(r.grantsCard, G.TUNE.cardsPerCraft);
      if (G.durabilityEnabled()) {
        const uses = (G.CARDS[r.grantsCard].durability || 1) * G.TUNE.cardsPerCraft;
        S.durability[r.grantsCard] = (S.durability[r.grantsCard] || 0) + uses;
      }
    }
    if (!r.repeatable) unpin('recipe', id);
  }

  /* ---------- fuel points and "any one of" costs -------------
     Two cost shapes a flat `cost` object can't express, both needed
     by the food-card recipes:

       fuel: 10                       spend 10 FUEL POINTS drawn from
                                      any burnable — stick 1, wood 4,
                                      charcoal 8 (CAMPFIRE_FUELS)
       anyOf: { keys:[…], qty: 15 }   spend 15 of ANY ONE key in the
                                      list ("15 of the same fish")

     Both ultimately call G.spendCraftCost, so they inherit the same
     inventory -> crate -> bank draw order as every other cost. */
  G.fuelValue = key => (CAMPFIRE_FUELS[key] || {}).units || 0;
  G.fuelAvailable = function () {
    return Object.keys(CAMPFIRE_FUELS)
      .reduce((n, k) => n + G.availableCraftCount(k) * CAMPFIRE_FUELS[k].units, 0);
  };
  /* Burns the LOWEST-value fuel first, so a hard-won charcoal isn't
     spent while sticks are sitting there. The final item may overshoot
     the requirement — fuel burns whole, and that's the honest result of
     throwing one charcoal on a fire that needed six points. */
  G.spendFuel = function (points) {
    if (!points) return true;
    if (G.fuelAvailable() < points) return false;
    let need = points;
    Object.keys(CAMPFIRE_FUELS)
      .sort((a, b) => CAMPFIRE_FUELS[a].units - CAMPFIRE_FUELS[b].units)
      .forEach(k => {
        if (need <= 0) return;
        const unit = CAMPFIRE_FUELS[k].units;
        const want = Math.min(G.availableCraftCount(k), Math.ceil(need / unit));
        if (want > 0 && G.spendCraftCost({ [k]: want })) need -= want * unit;
      });
    return need <= 0;
  };
  /* Which key an anyOf recipe would actually consume: the biggest
     qualifying stack, so it eats what you have most of rather than
     making you pick. null when nothing in the list reaches qty. */
  G.anyOfChoice = function (r) {
    const a = r && r.anyOf;
    if (!a) return null;
    let best = null, bestN = 0;
    a.keys.forEach(k => {
      const n = G.availableCraftCount(k);
      if (n >= a.qty && n > bestN) { best = k; bestN = n; }
    });
    return best;
  };

  function canStartRecipe(r, id) {
    if (!r) return false;
    if (S.made[id] && !r.repeatable) return false;
    if (!G.canAffordCraft(r.cost || {})) return false;
    if (r.fuel && G.fuelAvailable() < r.fuel) return false;
    if (r.anyOf && !G.anyOfChoice(r)) return false;
    return true;
  }
  /* Spends a recipe's whole cost — flat, anyOf and fuel. Only ever
     called after canStartRecipe has already cleared all three, so it
     can't half-spend. */
  function spendRecipeCost(r) {
    const pick = r.anyOf ? G.anyOfChoice(r) : null;
    if (r.anyOf && !pick) return false;
    G.spendCraftCost(r.cost || {});
    if (pick) G.spendCraftCost({ [pick]: r.anyOf.qty });
    if (r.fuel) G.spendFuel(r.fuel);
    return true;
  }
  G.canStartRecipe = canStartRecipe;

  G.campfireFuelOptions = function () {
    return Object.keys(CAMPFIRE_FUELS).map(key => Object.assign({ key }, CAMPFIRE_FUELS[key]));
  };
  G.campfireRecipes = function () {
    const st = G.findStation('firepit');
    if (!st) return [];
    return st.recipes
      .filter(r => r.skill === 'cooking' && r.gives)
      .map(r => {
        const rawKey = campfireRawKey(r);
        const cookedKey = rawKey && Object.keys(r.gives)[0];
        if (!rawKey || !cookedKey) return null;
        return {
          id: r.id,
          recipe: r,
          rawKey,
          cookedKey,
          rawName: (G.RESOURCES[rawKey] && G.RESOURCES[rawKey].name) || rawKey,
          cookedName: (G.RESOURCES[cookedKey] && G.RESOURCES[cookedKey].name) || cookedKey,
        };
      })
      .filter(Boolean);
  };
  G.campfireCookCount = function (recipeId, fuelKey) {
    const meta = G.campfireRecipes().find(r => r.id === recipeId);
    const fuel = CAMPFIRE_FUELS[fuelKey];
    if (!meta || !fuel) return 0;
    const rawAvailable = G.availableCraftCount(meta.rawKey);
    if (meta.rawKey === fuelKey) return Math.max(0, Math.min(fuel.units, rawAvailable - 1));
    if (G.availableCraftCount(fuelKey) < 1) return 0;
    return Math.min(fuel.units, rawAvailable);
  };
  G.campfireJobProgress = function () {
    const j = S.campfireJob;
    if (!j) return 0;
    return Math.max(0, Math.min(1, (Date.now() - j.startedAt) / j.ms));
  };
  G.startCampfireCook = function (recipeId, fuelKey) {
    if (S.campfireJob) return false;
    const meta = G.campfireRecipes().find(r => r.id === recipeId);
    const fuel = CAMPFIRE_FUELS[fuelKey];
    if (!meta || !fuel) return false;
    const count = G.campfireCookCount(recipeId, fuelKey);
    if (count < 1) return false;
    const cost = { [meta.rawKey]: count };
    cost[fuelKey] = (cost[fuelKey] || 0) + 1;
    if (!G.spendCraftCost(cost)) return false;
    const recipeMsMult = meta.recipe.craftMsMult || (meta.recipe.skill === 'cooking' ? 2 : 1);
    const ms = Math.round(G.TUNE.tapCraftMs * recipeMsMult * count * G.stationSpeedMult('firepit') * G.timeScale());
    S.campfireJob = { recipeId, fuelKey, count, startedAt: Date.now(), ms };
    G.emit('campfire:started', { recipeId, fuelKey, count, ms, name: meta.recipe.name });
    G.emit('state:changed');
    G.save(true);
    return true;
  };

  /* Instant craft — still the whole story for anything that isn't a
     player-facing recipe bar (tests, and the villager auto-clicker
     below both want the effect right away, no animation).
     opts.silent skips the 'craft' event (villagers batch their own
     summary instead of popping a toast per tick); opts.noSave lets a
     caller doing several of these back to back save once at the end. */
  G.craft = function (id, opts) {
    opts = opts || {};
    const r = G.findRecipe(id);
    if (!canStartRecipe(r, id)) return false;
    spendRecipeCost(r);
    applyRecipeEffects(r, id);
    if (!opts.silent) G.emit('craft', { kind: 'recipe', id, name: r.name, count: S.made[id] });
    if (!opts.noSave) G.save(true);
    return true;
  };

  /* ---------- tap-to-craft ----------------------------------
     The player-facing flow: tapping a recipe bar spends its cost
     immediately (same as an instant craft) but the effects don't land
     until the job's duration elapses — see G.tickCraftJobs, driven by
     the shared ticker registry (G.registerTicker, core.js). Only one
     job per recipe id at a time; different recipes (even at the same
     station) can run concurrently. Duration is TUNE.tapCraftMs scaled
     by the station's CURRENT speed level AND G.timeScale() (a future
     "Slowed" status effect's hook) at the moment of tapping —
     snapshotted onto the job itself, so either one changing mid-job
     never retroactively changes a cycle already in flight. */
  G.startCraftJob = function (id) {
    if (S.craftJobs[id]) return false;
    const r = G.findRecipe(id);
    if (!canStartRecipe(r, id)) return false;
    spendRecipeCost(r);
    const st = G.stationForRecipe(id);
    const recipeMsMult = r.craftMsMult || (r.skill === 'cooking' ? 2 : 1);
    const ms = Math.round(G.TUNE.tapCraftMs * recipeMsMult * (st ? G.stationSpeedMult(st.id) : 1) * G.timeScale());
    S.craftJobs[id] = { startedAt: Date.now(), ms };
    G.emit('craftjob:started', { id, name: r.name, ms });
    G.emit('state:changed');
    G.save(true);
    return true;
  };

  G.craftJobProgress = function (id) {
    const j = S.craftJobs[id];
    if (!j) return 0;
    return Math.max(0, Math.min(1, (Date.now() - j.startedAt) / j.ms));
  };

  G.tickCraftJobs = function () {
    if (!S.craftJobs) return;
    const now = Date.now();
    let completed = false;
    Object.keys(S.craftJobs).forEach(id => {
      const j = S.craftJobs[id];
      if (now - j.startedAt < j.ms) return;
      delete S.craftJobs[id];
      const r = G.findRecipe(id);
      if (!r) return;                 // shouldn't happen; guards against a stale id
      applyRecipeEffects(r, id);
      completed = true;
      G.emit('craft', { kind: 'recipe', id, name: r.name, count: S.made[id] });
      G.emit('craftjob:done', { id, name: r.name });
    });
    if (completed) {
      G.emit('state:changed');
      G.save(true);
    }
    if (S.campfireJob && now - S.campfireJob.startedAt >= S.campfireJob.ms) {
      const job = S.campfireJob;
      const recipe = G.findRecipe(job.recipeId);
      S.campfireJob = null;
      if (recipe) {
        for (let i = 0; i < job.count; i++) applyRecipeEffects(recipe, job.recipeId);
        if (job.fuelKey === 'wood') G.addRes('charcoal', 1);
        G.emit('craft', { kind: 'campfire', id: job.recipeId, name: recipe.name, count: job.count });
        G.emit('campfire:done', { id: job.recipeId, name: recipe.name, count: job.count, fuelKey: job.fuelKey });
      }
      G.emit('state:changed');
      G.save(true);
    }
  };

  G.registerTicker('craftJobs', 150, G.tickCraftJobs);

  /* ---------- prayer / deck purge --------------------------- */
  /* "Purge" is really "set aside" now — the card leaves the active
     deck but isn't destroyed, landing in the collection instead
     (see S.collection in core.js). The deck editor (batch 13b) is
     what lets you bring a collection card back into the deck. */
  G.purgeCard = function (key) {
    const cost = G.purgeCost(key);
    if (S.prayerPoints < cost || S.deck.length <= 1) return false;
    const i = S.deck.lastIndexOf(key);
    if (i < 0) return false;
    S.deck.splice(i, 1);
    if (S.drawnCount > S.deck.length) S.drawnCount = S.deck.length;
    S.prayerPoints -= cost;
    if (!S.collection) S.collection = {};
    S.collection[key] = (S.collection[key] || 0) + 1;
    G.syncActiveDeckSlot();
    G.emit('deck:purged', { key, size: S.deck.length });
    G.emit('collection:changed');
    G.emit('deck:changed');
    G.save(true);
    return true;
  };

  /* The reverse of G.purgeCard — brings a card out of the collection
     and back into the active deck, same cost, capped at TUNE.deckCap
     so the deck can't be grown without limit, and at TUNE.maxCardCopies
     copies of that one key — the collection itself has no such limit,
     only what's actively in a deck. */
  G.restoreCard = function (key) {
    const cost = G.purgeCost(key);
    if (S.prayerPoints < cost) return false;
    if (!S.collection || !S.collection[key]) return false;
    if (S.deck.length >= G.TUNE.deckCap) return false;
    if (G.cardCountIn(S.deck, key) >= G.TUNE.maxCardCopies) return false;
    S.prayerPoints -= cost;
    S.collection[key]--;
    if (S.collection[key] <= 0) delete S.collection[key];
    G.addCardToDiscard(key, 1);
    G.syncActiveDeckSlot();
    G.emit('deck:restored', { key, size: S.deck.length });
    G.emit('collection:changed');
    G.save(true);
    return true;
  };

  function removeCardFromSlot(slotIdx, key) {
    const slot = G.ensureDeckSlotExists(slotIdx);
    const i = slot.deck.lastIndexOf(key);
    if (i < 0) return false;
    slot.deck.splice(i, 1);
    if (slot.drawnCount > slot.deck.length) slot.drawnCount = slot.deck.length;
    if (slotIdx === S.activeDeckSlot) {
      S.deck = slot.deck;
      S.drawnCount = slot.drawnCount;
    }
    return true;
  }
  function addCardToSlotDiscard(slotIdx, key) {
    const slot = G.ensureDeckSlotExists(slotIdx);
    slot.deck.splice(0, 0, key);
    slot.drawnCount++;
    if (slotIdx === S.activeDeckSlot) {
      S.deck = slot.deck;
      S.drawnCount = slot.drawnCount;
    }
  }
  /* Whether the player can currently afford at least one deck-editor
     action (a purge or a restore) right now — cost is per-card since
     G.purgeCost scales with gear tier, so this can no longer be a
     single flat prayer-point check. Drives the deck-tab nav dot. */
  G.canAffordAnyDeckWork = function () {
    const canPurge = S.deck.length > 1 &&
      S.deck.some(k => S.prayerPoints >= G.purgeCost(k));
    const atCap = S.deck.length >= G.TUNE.deckCap;
    const canRestore = !atCap && Object.keys(S.collection || {})
      .filter(k => S.collection[k] > 0)
      .some(k => S.prayerPoints >= G.purgeCost(k) && G.cardCountIn(S.deck, k) < G.TUNE.maxCardCopies);
    return canPurge || canRestore;
  };

  G.moveCardToDeckSlot = function (key, toIdx) {
    G.ensureDeckSlots();
    if (toIdx === S.activeDeckSlot) return false;
    if (toIdx < 0 || toIdx >= G.unlockedDeckSlots()) return false;
    const cost = G.deckMoveCost(key);
    if (S.prayerPoints < cost) return false;
    const from = G.ensureDeckSlotExists(S.activeDeckSlot);
    if ((from.deck || []).filter(k => k === key).length < 1) return false;
    if (from.deck.length <= 1) return false;
    const to = G.ensureDeckSlotExists(toIdx);
    if (G.cardCountIn(to.deck || [], key) >= G.TUNE.maxCardCopies) return false;
    if (!removeCardFromSlot(S.activeDeckSlot, key)) return false;
    addCardToSlotDiscard(toIdx, key);
    S.prayerPoints -= cost;
    G.syncActiveDeckSlot();
    G.emit('deck:changed');
    G.emit('state:changed');
    G.save(true);
    return true;
  };

  /* ---------- pinned recipes -------------------------------
     A pin is { type:'recipe'|'station'|'resource', id }.
     Shown as a compact bar above the tabs so you can see what
     you are working toward while playing.                     */
  function pinCost(label, cost, done) {
    const parts = Object.keys(cost).map(k => ({
      key: k,
      name: G.RESOURCES[k] ? G.RESOURCES[k].name : k,
      have: S[k] || 0,
      need: cost[k],
    }));
    return { label, parts, ready: parts.every(p => p.have >= p.need), done: !!done };
  }

  G.readPin = function (pin) {
    if (!pin) return null;
    if (pin.type === 'resource') {
      const r = G.RESOURCES[pin.id];
      if (!r) return null;
      return { kind: 'resource', label: r.name, key: pin.id, value: S[pin.id] || 0 };
    }
    const st = G.findStation(pin.id);
    if (st && !S.built[pin.id]) {
      return Object.assign({ kind: 'station' }, pinCost(st.name, st.buildCost, false));
    }
    const r = G.findRecipe(pin.id);
    if (!r) return null;
    const made = (S.made[pin.id] || 0) > 0 && !r.repeatable;
    return Object.assign({ kind: 'recipe' }, pinCost(r.name, r.cost, made));
  };

  G.setPin = function (slot, pin) {
    if (!S.pins) S.pins = [];
    S.pins[slot] = pin;
    G.emit('pins:changed');
    G.save(false);
  };
  G.isPinned = (type, id) =>
    (S.pins || []).some(p => p && p.id === id);
  G.togglePin = function (pin) {
    if (!S.pins) S.pins = [];
    const i = S.pins.findIndex(p => p && p.id === pin.id);
    if (i >= 0) { S.pins[i] = null; }
    else {
      const free = S.pins.findIndex(p => !p);
      S.pins[free >= 0 ? free : G.TUNE.pinSlots - 1] = pin;
    }
    G.emit('pins:changed');
    G.save(false);
  };

  /* ---------- inventory actions ---------------------------- */
  G.dropItem = function (key, n) {
    const was = G.isEncumbered();
    const removed = G.removeRes(key, n);
    if (removed) {
      G.emit('inventory:dropped', { key, n: removed, recovered: was && !G.isEncumbered() });
      G.emit('state:changed');
      G.save(false);
    }
  };

  /* Donate (Bag page): bulk-remove up to TUNE.donateBatchSize of each
     selected resource at once. Worth (G.RESOURCES[key].worth, see
     data.js) accumulates in S.donateProgress; every time it crosses
     TUNE.donateWorthPerXp it grants the CURRENT zone +TUNE.
     donateXpPerFill xp (via G.grantZoneXp, 10x the original +1) and
     carries the remainder — a big enough donation can cross the
     threshold more than once in a single tap. */
  G.donateItems = function (keys) {
    function tagForResource(key) {
      if (['diamond', 'ruby', 'emerald'].indexOf(key) >= 0) return 'gem';
      if (['wood', 'stick', 'flax'].indexOf(key) >= 0) return 'wood';
      if (['cookedPoultry', 'cookedPork', 'cookedSteak', 'poultry', 'pork', 'steak', 'berries'].indexOf(key) >= 0) return 'food';
      if (['tanningSalt'].indexOf(key) >= 0) return 'salt';
      if (['scrapMetal', 'bronzeBar', 'bronzeNail', 'copper', 'tin'].indexOf(key) >= 0) return 'tool';
      if (['stone', 'flint', 'coal'].indexOf(key) >= 0) return 'stone';
      return 'neutral';
    }
    function factionMult(factionId, key) {
      const tag = tagForResource(key);
      if (factionId === 'ashkar') {
        if (tag === 'tool') return 1.4;
        if (tag === 'stone' || tag === 'gem') return 0.5;
        return 1;
      }
      if (factionId === 'delborn') {
        if (tag === 'wood' || tag === 'tool') return 1.4;
        if (tag === 'salt') return 0.5;
        return 0.95;
      }
      if (factionId === 'emberkin') {
        if (tag === 'food' || tag === 'gem') return 1.45;
        if (tag === 'tool') return 0.5;
        return 0.95;
      }
      if (factionId === 'riverborn') return 0.8;
      return 1;
    }
    const factionId = arguments[1];
    const was = G.isEncumbered();
    let totalWorth = 0;
    let totalInfluence = 0;
    const donated = {};
    keys.forEach(key => {
      const res = G.RESOURCES[key];
      if (!res) return;
      const qty = Math.min(G.TUNE.donateBatchSize, S[key] || 0);
      if (qty <= 0) return;
      const removed = G.removeRes(key, qty);
      if (removed) {
        donated[key] = removed;
        totalWorth += removed * res.worth;
        if (factionId && (G.FACTIONS || {})[factionId]) {
          totalInfluence += removed * res.worth * factionMult(factionId, key);
        }
      }
    });
    if (!totalWorth) return null;
    if (factionId && (G.FACTIONS || {})[factionId]) {
      G.ensureFactionState();
      S.factionInfluence[factionId] = G.round2((S.factionInfluence[factionId] || 0) + totalInfluence);
    }
    S.donateProgress += totalWorth;
    let xpGranted = 0;
    while (S.donateProgress >= G.TUNE.donateWorthPerXp) {
      S.donateProgress -= G.TUNE.donateWorthPerXp;
      G.grantZoneXp(S.zone, G.TUNE.donateXpPerFill);
      xpGranted += G.TUNE.donateXpPerFill;
    }
    G.emit('inventory:donated',
      { donated, totalWorth, totalInfluence, factionId, xpGranted, recovered: was && !G.isEncumbered() });
    G.emit('state:changed');
    G.save(false);
    return { donated, totalWorth, totalInfluence, factionId, xpGranted };
  };

})(window.Game = window.Game || {});
