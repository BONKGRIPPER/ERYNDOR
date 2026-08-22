/* =========================================================
   core.js — event bus, state, persistence, derived stats
   ========================================================= */
(function (G) {
  'use strict';

  /* ---------- tiny event bus -------------------------------
     Systems subscribe instead of the engine calling them.
     Events: 'card:resolved', 'enemy:killed', 'player:downed',
             'craft', 'state:changed', 'skill:levelup'          */
  const handlers = {};
  G.on = (evt, fn) => { (handlers[evt] = handlers[evt] || []).push(fn); };
  G.emit = (evt, payload) => {
    (handlers[evt] || []).forEach(fn => {
      try { fn(payload); } catch (e) { console.error(evt, e); }
    });
  };

  /* ---------- card-kind registry ---------------------------
     Each kind supplies: face(card,key) -> {detail, cls}
                         resolve(ctx)   -> void
     Register in systems/*.js. The engine never grows.        */
  G.cardKinds = {};
  G.registerCardKind = (kind, impl) => { G.cardKinds[kind] = impl; };

  /* ---------- shared ticker registry ------------------------
     One setInterval drives every background system (villagers,
     tap-craft jobs, whatever comes next) instead of each one owning
     its own interval + pause/resume wiring. Register once from
     anywhere; G.startTickers()/G.stopTickers() (called from main.js
     on boot and on visibilitychange) starts/stops all of them together.

     G.timeScale() is the hook for a future "Slowed" status effect —
     it multiplies every registered interval uniformly, so slowing the
     whole player down (villagers AND crafting at once) is one number
     to change, not N systems to touch individually. Systems that hand
     out a duration rather than just polling (G.startCraftJob's job.ms,
     G.villagerInterval) should also multiply by G.timeScale() at the
     moment they compute that duration, so a status effect actually
     lengthens the cycle instead of just polling it less often — see
     both call sites in craft.js/township.js. Snapshot it at that
     moment, same as station-speed snapshotting: a status effect
     toggling mid-cycle never retroactively changes a cycle already
     running. */
  const tickers = {};
  const MASTER_TICK_MS = 100;
  G.registerTicker = function (id, ms, fn) {
    tickers[id] = { ms, fn, last: 0 };
  };
  G.timeScale = () => 1;   // >1 = slower, <1 = faster — override once a status effect needs it

  let masterTimer = null;
  function runTickers() {
    if (G.rt.paused) return;
    const now = Date.now();
    Object.keys(tickers).forEach(id => {
      const t = tickers[id];
      if (now - t.last < t.ms * G.timeScale()) return;
      t.last = now;
      t.fn();
    });
  }
  G.startTickers = function () {
    clearInterval(masterTimer);
    Object.keys(tickers).forEach(id => { tickers[id].last = Date.now(); });
    masterTimer = setInterval(runTickers, MASTER_TICK_MS);
  };
  G.stopTickers = function () { clearInterval(masterTimer); };

  const SAVE_KEY = 'leatheron_v8';

  /* stations from G.ALWAYS_BUILT, pre-marked as built */
  G.defaultBuilt = () => {
    const b = {};
    (G.ALWAYS_BUILT || []).forEach(id => { b[id] = true; });
    return b;
  };

  /* ---------- state ---------------------------------------- */
  G.freshState = function () {
    const s = {
      weight: 0, hp: G.TUNE.baseHp, cardsSinceHit: 0,
      prayerPoints: 0,
      skills: {}, zoneXp: {}, status: {},
      equipped: Object.assign({}, G.RAG_DEFAULTS), built: G.defaultBuilt(), made: {},
      deck: [], drawnCount: 0, deckSlots: [], activeDeckSlot: 0, deckNames: [], preferredDecks: {}, durability: {},
      /* card cosmetics: key -> how many copies wear that finish */
      foils: {}, prismatic: {},
      wardrobe: [],                         // cosmetic items owned, worn or not
      /* cards pulled out of the active deck (see G.purgeCard) land
         here instead of being destroyed — key -> how many copies are
         sitting out. The deck editor (batch 13b) reads from this to
         let you add them back in, up to the 60-card deck cap. */
      collection: {},
      hits: 0, attempts: 0, streak: 0, kills: 0,
      locationDecks: [], locationField: [null, null, null],
      selected: {},                         // consumable group -> item key
      xpV2: true,                           // on the doubled xp curve
      zone: G.START_ZONE,
      discovered: {},                       // resource key -> true, ever held
      /* tap-to-craft: recipe id -> { startedAt, ms } while a single
         production cycle is running (see G.startCraftJob, craft.js) */
      craftJobs: {},
      campfireJob: null,
      /* station id -> current upgrade level (1 = base, unset = 1) —
         see G.stationLevel/G.upgradeStation, craft.js */
      stationLv: {},
      /* pin the Crafting Bench from the start — a signpost so a new
         player has an immediate goal instead of an empty craft page */
      pins: [{ type: 'station', id: 'bench' }, null, null],
      zones: {},           // per-zone deck + pasture
      zoneStorage: {},     // zone id -> stored resources, weightless and local
      bankStorage: {},     // shared bank inventory between hub zones
      homes: {},           // zone -> number of homes built
      villagerLast: {},    // 'zone:stationId' -> last production time
      stationVillagers: {}, // zone -> { stationId: true } — hired AT a station now, not a named Town role
      lastSeen: Date.now(),
      page: 'play',
      /* Donate (Bag page): cumulative worth donated since the last time
         it crossed TUNE.donateWorthPerXp — see G.donateItems, craft.js */
      donateProgress: 0,
      factionInfluence: {},
      selectedFaction: 'ashkar',
      /* Farm plots (Town tab), zone-tied like S.built/S.deck — see
         systems/farm.js and world.js's stash()/restore(). Each slot is
         null (empty) or { seedKey, stage, wateredAt, stageMs }. */
      farmPlots: [],
      /* Lifetime collection log for the fishing journal — counts fish
         actually caught, not just currently carried. */
      fishCaught: {},
    };
    Object.keys(G.RESOURCES).forEach(k => s[k] = 0);
    Object.keys(G.SKILLS).forEach(k => {
      s.skills[k] = { lv: 1, xp: 0, need: G.SKILLS[k].need };
    });
    Object.keys(G.ZONES).forEach(z => {
      s.zoneXp[z] = { lv: 1, xp: 0, need: G.TUNE.zoneXpNeed };
    });
    return s;
  };

  const FOIL_PREFIX = 'foil:';
  G.foilKey = key => G.isFoilCardKey(key) ? key : FOIL_PREFIX + key;
  G.isFoilCardKey = key => typeof key === 'string' && key.indexOf(FOIL_PREFIX) === 0;
  G.baseCardKey = key => G.isFoilCardKey(key) ? key.slice(FOIL_PREFIX.length) : key;
  G.cardYieldMult = card => (card && card.foil ? 2 : 1);
  G.cardDef = function (key) {
    if (G.CARDS[key]) return G.CARDS[key];
    if (!G.isFoilCardKey(key)) return null;
    const baseKey = G.baseCardKey(key);
    const base = G.CARDS[baseKey];
    if (!base) return null;
    const foil = Object.assign({}, base, {
      name: base.name,
      baseKey,
      foil: true,
    });
    if (typeof base.atk === 'number') foil.atk = base.atk * 2;
    if (typeof base.durability === 'number') foil.durability = base.durability * 2;
    if (typeof base.xp === 'number') foil.xp = base.xp * 2;
    G.CARDS[key] = foil;
    return foil;
  };

  /* runtime-only flags, never persisted */
  G.rt = { windowOpen: false, windowStart: 0, tapped: false, paused: false };

  G.rand = (a, b) => a + Math.floor(Math.random() * (b - a + 1));

  /* ---------- derived stats -------------------------------- */
  G.carryCap = () => {
    let c = G.TUNE.baseCap;
    Object.values(S.equipped).forEach(k => c += (G.ITEMS[k] && G.ITEMS[k].cap) || 0);
    return c;
  };
  /* Every tool/weapon tier is its own card carrying its own atk, and
     several tiers can sit in the deck at once (an old tier hasn't
     broken yet, a new one just got crafted) — so "your power" is
     whichever matching card you can currently draw, at its best. */
  G.bestPower = kind => Object.keys(G.deckCounts()).reduce((best, k) => {
    const c = G.cardDef(k);
    return (c && c.kind === kind && c.atk > best) ? c.atk : best;
  }, 0);
  G.defense = () => {
    let d = 0;
    Object.values(S.equipped).forEach(k => d += (G.ITEMS[k] && G.ITEMS[k].def) || 0);
    return d;
  };
  /* incoming damage after armor soaks it up, floored at zero */
  G.mitigate = n => Math.max(0, n - G.defense());
  /* every armor slot holding a scrap-set piece */
  G.hasArmorSet = () => Object.keys(G.RAG_DEFAULTS).every(slot => {
    const it = G.ITEMS[S.equipped[slot]];
    return it && it.set === 'scrap';
  });
  /* Highland Robes — hood, cloak, legs AND cape, unlike the 3-piece
     scrap set (the cape slot doubles as capacity gear, so wearing
     this set is a real carry-capacity tradeoff). */
  G.hasHighlandSet = () => ['helmet', 'chest', 'legs', 'cape'].every(slot => {
    const it = G.ITEMS[S.equipped[slot]];
    return it && it.set === 'highland';
  });
  /* No mechanical effect yet — same "future hook" status as
     G.zoneDiscount until a cold/weather system exists to read it. */
  G.warmth = () => {
    let w = 0;
    Object.values(S.equipped).forEach(k => w += (G.ITEMS[k] && G.ITEMS[k].warmth) || 0);
    return w;
  };
  G.inLethEiren = () => (G.ZONES[S.zone] || {}).region === 'leth-eiren';
  /* the Highland Robes set bonus: more xp (skills and zones alike)
     while standing anywhere in the Leth-Eiren region              */
  G.xpBonusMult = () => (G.hasHighlandSet() && G.inLethEiren()) ? G.TUNE.highlandSetXpMult : 1;
  G.maxHp = () => G.TUNE.baseHp;
  G.isEncumbered = () => S.weight >= G.carryCap();
  /* A card's gear tier doubles what it costs to move in or out of a
     deck — tier 0 (Flint) x1, tier 1 (Stone) x2, tier 2 (Scrap) x4,
     tier 3 (Bronze) x8 — same `card.tier` field the star pips read
     (js/ui.js). Non-equipment cards (gather/forage/etc, no `tier`
     field at all) are unaffected, same as tier 0. `key` is optional
     so every other caller of purgeCost/deckMoveCost that doesn't
     have one specific card in mind (pin-bar cost previews, etc.)
     keeps working unchanged at the flat rate. */
  G.cardTierMult = function (key) {
    if (!key) return 1;
    const c = G.cardDef(key);
    return Math.pow(2, (c && c.tier) || 0);
  };
  G.purgeCost = key =>
    Math.max(1, G.TUNE.purgeCost - Math.floor((S.skills.prayer.lv - 1) / 4)) * G.cardTierMult(key);
  G.prayerMilestones = () => [5, 25, 50, 75, 100];
  G.prayerTierCount = () => G.prayerMilestones()
    .filter(n => (S.skills.prayer ? S.skills.prayer.lv : 1) >= n).length;
  G.prayerPointMult = () => Math.pow(2, G.prayerTierCount());
  G.zoneXpNeedForLevel = () => G.TUNE.zoneXpNeed;
  G.unlockedDeckSlots = () => Math.max(1, 1 + Math.floor(((S.skills.prayer && S.skills.prayer.lv) || 1) / 10));
  G.deckMoveCost = key => Math.max(0, 5 - G.prayerTierCount()) * G.cardTierMult(key);
  G.durabilityEnabled = () => false;
  /* Not consumed anywhere yet — the hub city's markets and crafting
     taxes will read this once that zone exists. A zone's own level
     already climbs today from ordinary play (see G.grantZoneXp). */
  G.zoneDiscount = zone => {
    const z = S.zoneXp[zone];
    if (!z) return 0;
    return Math.min(G.TUNE.zoneDiscountMax, (z.lv - 1) * G.TUNE.zoneDiscountPerLv);
  };
  G.deckCounts = () => {
    const c = {};
    S.deck.forEach(k => c[k] = (c[k] || 0) + 1);
    return c;
  };
  G.ensureDeckSlotExists = function (i) {
    if (!Array.isArray(S.deckSlots)) S.deckSlots = [];
    while (S.deckSlots.length <= i) S.deckSlots.push({ deck: [], drawnCount: 0 });
    if (!S.deckSlots[i].deck) S.deckSlots[i].deck = [];
    if (typeof S.deckSlots[i].drawnCount !== 'number') S.deckSlots[i].drawnCount = 0;
    if (typeof S.deckSlots[i].storageUsed !== 'boolean') S.deckSlots[i].storageUsed = false;
    if (!Array.isArray(S.deckNames)) S.deckNames = [];
    return S.deckSlots[i];
  };
  G.deckSlotName = function (i) {
    if (!Array.isArray(S.deckNames)) S.deckNames = [];
    return (S.deckNames[i] || ('Deck ' + (i + 1))).trim();
  };
  G.renameDeckSlot = function (i, name) {
    G.ensureDeckSlotExists(i);
    if (!Array.isArray(S.deckNames)) S.deckNames = [];
    const next = (name || '').trim();
    S.deckNames[i] = next || ('Deck ' + (i + 1));
    G.emit('deck:changed');
    G.save(false);
    return true;
  };
  G.ensureDeckSlots = function () {
    if (!Array.isArray(S.deckSlots) || !S.deckSlots.length) {
      S.deckSlots = [{ deck: S.deck || [], drawnCount: typeof S.drawnCount === 'number' ? S.drawnCount : 0 }];
    }
    S.deckSlots.forEach((slot, i) => {
      if (!slot || !Array.isArray(slot.deck)) S.deckSlots[i] = { deck: [], drawnCount: 0 };
      if (typeof S.deckSlots[i].drawnCount !== 'number') S.deckSlots[i].drawnCount = 0;
    });
    if (typeof S.activeDeckSlot !== 'number' || S.activeDeckSlot < 0) S.activeDeckSlot = 0;
    G.ensureDeckSlotExists(S.activeDeckSlot);
    if (!S.deck) S.deck = S.deckSlots[S.activeDeckSlot].deck;
    if (typeof S.drawnCount !== 'number') S.drawnCount = S.deckSlots[S.activeDeckSlot].drawnCount || 0;
  };
  G.syncActiveDeckSlot = function () {
    G.ensureDeckSlots();
    const slot = G.ensureDeckSlotExists(S.activeDeckSlot);
    slot.deck = S.deck;
    slot.drawnCount = S.drawnCount;
  };
  G.loadDeckSlot = function (i) {
    G.ensureDeckSlots();
    const slot = G.ensureDeckSlotExists(i);
    S.activeDeckSlot = i;
    S.deck = slot.deck;
    S.drawnCount = slot.drawnCount || 0;
    G.syncActiveDeckSlot();
    return slot;
  };
  G.preferredDeckForZone = zoneId => {
    const idx = S.preferredDecks ? S.preferredDecks[zoneId] : null;
    return typeof idx === 'number' ? idx : null;
  };
  G.cloneDeckSlots = function () {
    G.ensureDeckSlots();
    return (S.deckSlots || []).map(slot => ({
      deck: (slot.deck || []).slice(),
      drawnCount: slot.drawnCount || 0,
      storageUsed: !!slot.storageUsed,
    }));
  };
  G.pruneZoneDeckCards = function (zoneId, deckSlots) {
    const zone = G.ZONES[zoneId] || {};
    if ((zone.deck || {}).oreVein) return deckSlots;
    (deckSlots || []).forEach(slot => {
      if (!slot || !Array.isArray(slot.deck)) return;
      slot.deck = slot.deck.filter(k => G.baseCardKey(k) !== 'oreVein');
      if (slot.drawnCount > slot.deck.length) slot.drawnCount = slot.deck.length;
    });
    return deckSlots;
  };
  G.setPreferredDeckForZone = function (zoneId, slotIdx) {
    G.ensureDeckSlots();
    if (!S.preferredDecks) S.preferredDecks = {};
    if (!S.zones) S.zones = {};
    if (!S.zones[zoneId]) {
      S.zones[zoneId] = {
        deckSlots: G.cloneDeckSlots(),
        activeDeckSlot: S.activeDeckSlot,
      };
    } else if (!S.zones[zoneId].deckSlots || !S.zones[zoneId].deckSlots.length) {
      S.zones[zoneId].deckSlots = G.cloneDeckSlots();
      S.zones[zoneId].activeDeckSlot = S.activeDeckSlot;
    }
    if (slotIdx == null) { delete S.preferredDecks[zoneId]; }
    else S.preferredDecks[zoneId] = slotIdx;
    G.emit('state:changed');
    G.save(false);
  };
  G.switchDeckSlot = function (i) {
    G.ensureDeckSlots();
    if (i === S.activeDeckSlot) return true;
    if (i < 0 || i >= G.unlockedDeckSlots()) return false;
    const slot = G.ensureDeckSlotExists(i);
    if (!slot.deck.length) return false;
    G.syncActiveDeckSlot();
    G.loadDeckSlot(i);
    G.emit('deck:changed');
    G.emit('state:changed');
    G.save(false);
    return true;
  };

  /* ---------- inventory helpers ----------------------------
     Single funnel for weight bookkeeping — never touch
     S.weight directly from a system.                          */
  G.roomLeft = () => Math.max(0, G.carryCap() - S.weight);
  G.isFish = key => !!((G.FISH || {})[key]);
  G.ensureFishCaught = () => { if (!S.fishCaught) S.fishCaught = {}; };
  G.ensureFactionState = function () {
    if (!S.factionInfluence) S.factionInfluence = {};
    Object.keys(G.FACTIONS || {}).forEach(id => {
      if (typeof S.factionInfluence[id] !== 'number') S.factionInfluence[id] = 0;
    });
    if (!S.selectedFaction || !(G.FACTIONS || {})[S.selectedFaction]) {
      const first = Object.keys(G.FACTIONS || {})[0];
      if (first) S.selectedFaction = first;
    }
  };
  G.factionInfluence = id => ((S.factionInfluence && S.factionInfluence[id]) || 0);
  G.factionLevel = id => 1 + Math.floor(G.factionInfluence(id) / 100);
  G.setSelectedFaction = function (id) {
    if (!(G.FACTIONS || {})[id]) return false;
    G.ensureFactionState();
    S.selectedFaction = id;
    G.emit('state:changed');
    G.save(false);
    return true;
  };

  G.addRes = function (key, qty) {
    const wt = G.RESOURCES[key].wt;
    const canTake = wt > 0 ? Math.floor(G.roomLeft() / wt) : qty;
    const got = Math.max(0, Math.min(qty, canTake));
    if (got > 0) {
      S[key] += got;
      S.weight = G.round2(S.weight + got * wt);
      if (!S.discovered[key]) {
        S.discovered[key] = true;
        G.emit('discovered', { key });
      }
      if (G.isFish(key)) {
        G.ensureFishCaught();
        S.fishCaught[key] = (S.fishCaught[key] || 0) + got;
      }
    }
    return got;
  };
  /* weights are fractional now — keep them tidy */
  G.round2 = n => Math.round(n * 100) / 100;
  G.fmtWt = function (n) {
    const r = G.round2(n);
    return Number.isInteger(r) ? String(r) : r.toFixed(r * 10 % 1 === 0 ? 1 : 2);
  };
  G.isKnown = key => !!S.discovered[key];
  /* a cost is visible once every ingredient has been seen */
  G.costKnown = cost => Object.keys(cost).every(k => G.isKnown(k));
  G.removeRes = function (key, qty) {
    const n = Math.min(qty, S[key]);
    if (n > 0) {
      S[key] -= n;
      S.weight = G.round2(Math.max(0, S.weight - n * G.RESOURCES[key].wt));
    }
    return n;
  };
  G.canAfford = cost => Object.keys(cost).every(k => (S[k] || 0) >= cost[k]);
  G.spend = cost => { Object.keys(cost).forEach(k => G.removeRes(k, cost[k])); };

  /* ---------- skills --------------------------------------- */
  G.grantXp = function (skill, amt) {
    const s = S.skills[skill];
    if (!s) return;
    const cap = G.TUNE.maxSkillLevel || 100;
    if (s.lv >= cap) { s.xp = 0; return; }
    s.xp += amt * G.xpBonusMult();
    let leveled = false;
    while (s.xp >= s.need && s.lv < cap) {
      s.xp -= s.need; s.lv++; s.need = Math.round(s.need * 1.55); leveled = true;
    }
    if (s.lv >= cap) s.xp = 0;
    G.emit('xp:gain', {
      skill, amt,
      lv: s.lv,
      xp: s.xp,
      need: s.need,
      name: (G.SKILLS[skill] && G.SKILLS[skill].name) || skill,
      tint: (G.SKILLS[skill] && G.SKILLS[skill].tint) || 'stone',
    });
    if (leveled) {
      const def = G.SKILLS[skill];
      G.emit('skill:levelup', {
        skill, lv: s.lv,
        perk: (def.perks && def.perks[s.lv]) || 'Improved',
        tint: def.tint, name: def.name,
      });
    }
  };

  /* ---------- zone xp ---------------------------------------
     Every card played (any kind, hit or miss, wasted or not)
     grants the CURRENT zone xp — separate from skills, uncapped.
     A level fires the loot wheel (see G.spinZoneLoot, engine.js)
     and — once the hub city exists — shaves its own market prices
     and crafting taxes via G.zoneDiscount above.                */
  G.grantZoneXp = function (zone, amt) {
    if (!S.zoneXp[zone]) S.zoneXp[zone] = { lv: 1, xp: 0, need: G.zoneXpNeedForLevel(1) };
    const z = S.zoneXp[zone];
    z.need = G.zoneXpNeedForLevel(z.lv || 1);
    z.xp += amt * G.xpBonusMult();
    let leveled = false;
    while (z.xp >= z.need) {
      z.xp -= z.need; z.lv++; z.need = G.zoneXpNeedForLevel(z.lv); leveled = true;
    }
    if (leveled) {
      const def = G.ZONES[zone];
      G.emit('zone:levelup', {
        zone, lv: z.lv, name: (def && def.name) || zone,
        spin: G.spinZoneLoot(zone),
      });
    }
  };

  /* ---------- persistence ---------------------------------- */
  G.storageOK = true;
  const PERSIST = ['weight','hp','cardsSinceHit','prayerPoints','skills','zoneXp','status','equipped',
                   'built','made','deck','drawnCount','deckSlots','activeDeckSlot','deckNames','preferredDecks','durability','hits','attempts','kills',
                   'foils','prismatic','wardrobe','collection',
                   'locationDecks','locationField',
                   'lastSeen','stationVillagers','selected','craftJobs','campfireJob','stationLv','pins','zone','zones','homes','villagerLast','xpV2','discovered',
                   'donateProgress','factionInfluence','selectedFaction','farmPlots','fishCaught','zoneStorage','bankStorage'];

  G.save = function (flash) {
    const d = {};
    S.lastSeen = Date.now();
    PERSIST.forEach(k => d[k] = S[k]);
    Object.keys(G.RESOURCES).forEach(k => d[k] = S[k]);
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(d));
      S.lastSeen = d.lastSeen;
      G.emit('saved', { flash: !!flash });
    } catch (e) {
      G.storageOK = false;
      G.emit('saved', { failed: true });
    }
  };

  G.load = function () {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return false;
      const d = JSON.parse(raw);
      Object.assign(S, d);
      /* migrate forward: any newly-added skill or resource */
      Object.keys(G.SKILLS).forEach(k => {
        if (!S.skills[k]) S.skills[k] = { lv: 1, xp: 0, need: G.SKILLS[k].need };
      });
      /* attack was replaced outright by melee + archery (no longer a
         real skill) — a save from before the split starts both fresh
         at level 1 rather than trying to carry the old level over to
         either one, same "wipe and move on" stance the project takes
         with renames elsewhere; this just clears the leftover entry
         so it doesn't sit around unused forever */
      delete S.skills.attack;
      delete S.skills.Fishing;
      if (!S.zoneXp) S.zoneXp = {};
      Object.keys(G.ZONES).forEach(z => {
        if (!S.zoneXp[z]) S.zoneXp[z] = { lv: 1, xp: 0, need: G.zoneXpNeedForLevel(1) };
        S.zoneXp[z].need = G.zoneXpNeedForLevel(S.zoneXp[z].lv || 1);
        if (typeof S.zoneXp[z].xp !== 'number') S.zoneXp[z].xp = 0;
      });
      if (!S.status) S.status = {};
      /* xp curve was doubled — scale old saves once so a level in
         progress does not sit at 100% forever */
      if (!S.xpV2) {
        Object.keys(S.skills).forEach(k => { S.skills[k].need *= 2; });
        S.xpV2 = true;
      }
      Object.keys(G.RESOURCES).forEach(k => { if (typeof S[k] !== 'number') S[k] = 0; });
      if (!S.made) S.made = {};
      if (!S.durability) S.durability = {};
      if (!Array.isArray(S.deckSlots) || !S.deckSlots.length) {
        S.deckSlots = [{ deck: S.deck || [], drawnCount: typeof S.drawnCount === 'number' ? S.drawnCount : 0 }];
      }
      G.pruneZoneDeckCards(S.zone, S.deckSlots);
      if (typeof S.activeDeckSlot !== 'number') S.activeDeckSlot = 0;
      if (!Array.isArray(S.deckNames)) S.deckNames = [];
      if (!S.preferredDecks) S.preferredDecks = {};
      if (!S.zoneStorage) S.zoneStorage = {};
      if (!S.bankStorage) S.bankStorage = {};
      if (!S.foils) S.foils = {};
      if (!S.prismatic) S.prismatic = {};
      if (!S.collection) S.collection = {};
      if (!Array.isArray(S.wardrobe)) S.wardrobe = [];
      /* older saves predate the wardrobe — everything already worn is
         by definition owned, so seed it from the equipped slots */
      Object.values(S.equipped || {}).forEach(k => {
        if (k && G.ITEMS[k] && S.wardrobe.indexOf(k) < 0) S.wardrobe.push(k);
      });
      /* the old named-Town-role villager system (S.villagers, id ->
         true) is gone — hiring moved onto stations themselves. An old
         save's named hires have no station to map onto, so they're
         just dropped; S.villagerLast is reused as-is (now keyed
         'zone:stationId' instead of a villager id, harmlessly stale
         until the first new hire overwrites it). */
      delete S.villagers;
      if (!S.stationVillagers) S.stationVillagers = {};
      if (!S.villagerLast) S.villagerLast = {};
      if (!S.selected) S.selected = {};
      if (typeof S.donateProgress !== 'number') S.donateProgress = 0;
      if (!S.factionInfluence) S.factionInfluence = {};
      if (!S.selectedFaction) S.selectedFaction = 'ashkar';
      if (!Array.isArray(S.farmPlots)) S.farmPlots = [];
      if (!S.fishCaught) S.fishCaught = {};
      if (!S.discovered) S.discovered = {};
      if (!S.zone) S.zone = G.START_ZONE;
      if (!S.craftJobs) S.craftJobs = {};
      if (!S.campfireJob) S.campfireJob = null;
      if (!S.stationLv) S.stationLv = {};
      if (!S.zones) S.zones = {};
      Object.keys(S.zones).forEach(zoneId => {
        const z = S.zones[zoneId];
        if (z && Array.isArray(z.deckSlots)) G.pruneZoneDeckCards(zoneId, z.deckSlots);
      });
      if (!S.homes) S.homes = {};
      if (!S.villagerLast) S.villagerLast = {};
      if (!Array.isArray(S.pins)) S.pins = [null, null, null];
      G.ensureFactionState();
      if (typeof S.hp !== 'number') S.hp = G.TUNE.baseHp;
      if (!S.equipped) S.equipped = {};
      /* backfill rag clothing into any armor slot an older save left empty */
      Object.keys(G.RAG_DEFAULTS).forEach(slot => {
        if (!S.equipped[slot]) S.equipped[slot] = G.RAG_DEFAULTS[slot];
      });
      if (!S.built) S.built = {};
      /* backfill always-built stations (e.g. Bare Hands) onto older saves */
      (G.ALWAYS_BUILT || []).forEach(id => { S.built[id] = true; });
      if (!S.deck || !S.deck.length) G.buildDeck();
      G.ensureDeckSlots();
      G.loadDeckSlot(S.activeDeckSlot || 0);
      /* old saves carried a single flat locationDeck/locationDrawn —
         dropped outright (not converted) now that each field slot
         has its own independent deck; same "wipe and move on"
         precedent as other structural saves changes (e.g. the melee/
         archery skill split). */
      if (!Array.isArray(S.locationField)) S.locationField = [null, null, null];
      const freshLocationDecks = !Array.isArray(S.locationDecks) ||
        !S.locationDecks.some(sd => sd && sd.deck && sd.deck.length);
      if (freshLocationDecks) {
        G.buildLocationDecks();
        S.locationDecks.forEach(sd => G.shuffle(sd.deck));
      }
      if (G.syncLocationDecksToZone) G.syncLocationDecksToZone();
      G.fillLocationField();
      return true;
    } catch (e) { G.storageOK = false; return false; }
  };

  G.wipe = function () {
    try { localStorage.removeItem(SAVE_KEY); } catch (e) {}
    window.S = G.S = G.freshState();
    G.buildDeck(); G.shuffle(S.deck);
    S.deckSlots = [{ deck: S.deck, drawnCount: 0 }];
    S.activeDeckSlot = 0;
    G.buildLocationDecks();
    S.locationDecks.forEach(sd => G.shuffle(sd.deck));
    G.fillLocationField();
  };

  /* the live state object (assigned at boot) */
  G.S = null;

})(window.Game = window.Game || {});
