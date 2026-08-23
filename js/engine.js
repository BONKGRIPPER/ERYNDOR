/* =========================================================
   engine.js — deck cycling, timing window, combat, offline
   Card behaviour lives in systems/*.js via G.cardKinds.
   ========================================================= */
(function (G) {
  'use strict';
  const T = G.TUNE;

  /* ---------- deck ----------------------------------------- */
  /* How many copies of one card key a deck array already carries —
     the single check every insertion point below shares, so "at
     most 5 of any one card in a deck, collection is unlimited"
     can never drift between craft/foil/restore/move paths. */
  G.cardCountIn = function (arr, key) {
    let n = 0;
    for (let i = 0; i < arr.length; i++) if (arr[i] === key) n++;
    return n;
  };
  /* Builds a deck FROM SCRATCH — only for a brand-new game, or to
     recover from an empty deck (see core.js/main.js callers). It is
     deliberately NOT part of travelling any more: zones used to
     define their own `deck` and this ran on every first arrival,
     which is what silently handed you a second pile of starter
     cards when you reached Forest Road. The deck is global now and
     simply comes with you. */
  G.buildDeck = function () {
    S.deck = [];
    Object.keys(G.STARTING_DECK).forEach(k => {
      for (let i = 0; i < G.STARTING_DECK[k]; i++) S.deck.push(k);
    });
    G.STATIONS.forEach(st => st.recipes.forEach(r => {
      if (!r.grantsCard) return;
      const n = Math.min((S.made[r.id] || 0) * G.TUNE.cardsPerCraft, G.TUNE.maxCardCopies);
      for (let i = 0; i < n && S.deck.length < G.TUNE.deckCap; i++) S.deck.push(r.grantsCard);
    }));
    G.ensureDeckSlots();
    G.syncActiveDeckSlot();
  };
  G.shuffle = function (a) {
    for (let i = a.length - 1; i > 0; i--) {
      const j = (Math.random() * (i + 1)) | 0;
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };
  /* New cards land in the DISCARD pile — the part of the deck
     already played — so they only come round after the current
     deck runs out. Nothing is reshuffled mid-cycle.

     A card that CAN'T fit goes to the collection rather than being
     thrown away: the deck holds at most TUNE.maxCardCopies of one
     key and TUNE.deckCap cards in total, and early on there's room
     for a craft to drop straight in. Once there isn't, you keep the
     card and swap it in deliberately from the Deck page. (It used
     to just `break` and the copy vanished.) The craft/durability-
     pool top-up in applyRecipeEffects, craft.js is unaffected
     either way. */
  G.addCardToDiscard = function (key, n) {
    n = n || 1;
    let overflow = 0;
    for (let i = 0; i < n; i++) {
      if (G.cardCountIn(S.deck, key) >= G.TUNE.maxCardCopies ||
          S.deck.length >= G.TUNE.deckCap) { overflow++; continue; }
      S.deck.splice(0, 0, key);
      S.drawnCount++;                  // keep the draw pointer aligned
    }
    if (overflow) {
      if (!S.collection) S.collection = {};
      S.collection[key] = (S.collection[key] || 0) + overflow;
      G.emit('collection:changed');
    }
    G.syncActiveDeckSlot();
    G.emit('deck:changed');
  };
  G.rebuildDeck = function () {
    G.buildDeck(); G.shuffle(S.deck); S.drawnCount = 0;
    G.syncActiveDeckSlot();
    G.emit('deck:changed');
  };

  /* Durability is one shared pool per card key, not per physical
     copy — crafting another of the same tier tops the pool back up.
     Call after any card resolves; a no-op for keys with no pool. At
     zero, every remaining copy of the key leaves the deck at once. */
  /* Removes exactly ONE copy of a key from the active deck — a food
     card is eaten when you play it. Deliberately distinct from
     G.drainDurability below, which yanks EVERY copy at once when a
     shared durability pool bottoms out. Prefers a copy from the
     already-drawn part of the deck, since that's the one that was
     just played. */
  G.consumeCardFromDeck = function (key) {
    let i = -1;
    for (let n = 0; n < S.drawnCount && n < S.deck.length; n++) {
      if (S.deck[n] === key) { i = n; break; }
    }
    if (i < 0) i = S.deck.indexOf(key);
    if (i < 0) return false;
    S.deck.splice(i, 1);
    if (i < S.drawnCount) S.drawnCount--;
    if (S.drawnCount > S.deck.length) S.drawnCount = S.deck.length;
    if (S.drawnCount < 0) S.drawnCount = 0;
    G.syncActiveDeckSlot();
    G.emit('deck:changed');
    G.emit('card:eaten', { key });
    return true;
  };

  G.drainDurability = function (key) {
    if (!G.durabilityEnabled()) return;
    if (!(key in S.durability)) return;
    S.durability[key]--;
    if (S.durability[key] > 0) return;
    delete S.durability[key];
    let removedBeforePointer = 0;
    const next = [];
    S.deck.forEach((k, i) => {
      if (k !== key) { next.push(k); return; }
      if (i < S.drawnCount) removedBeforePointer++;
    });
    S.deck = next;
    S.drawnCount = Math.max(0, Math.min(S.drawnCount - removedBeforePointer, S.deck.length));
    G.syncActiveDeckSlot();
    G.emit('deck:changed');
    G.emit('card:broken', { key });
  };

  /* A smaller reward for the rarer, low-weight loot (gold, gems);
     a bigger pile for ordinary materials. */
  G.lootRewardQty = function (key) {
    const wt = (G.RESOURCES[key] && G.RESOURCES[key].wt) || 1;
    if (wt <= 0.1) return G.rand(3, 8);
    if (wt <= 0.5) return G.rand(8, 16);
    return G.rand(12, 24);
  };

  /* ---------- card cosmetics ---------------------------------
     Legacy saves may still carry cosmetic counts in S.foils and
     S.prismatic. New foil rewards are separate cards with their own
     keys and doubled stats. */
  G.finishCount = (map, key) => (map && map[key]) || 0;

  /* Which cards a foil pull can land on: this zone's cosmetic set,
     falling back to cards currently present in your deck. */
  G.foilCandidates = function (zone) {
    const set = (G.ZONES[zone] || {}).foilPool || [];
    const inSet = set.filter(k => !!G.cardDef(k));
    if (inSet.length) return inSet;
    const seen = {};
    return Object.keys(G.deckCounts())
      .map(k => G.baseCardKey(k))
      .filter(k => !seen[k] && (seen[k] = 1) && !!G.cardDef(k));
  };

  /* Foils are separate cards now; prismatic stays a cosmetic finish. */
  G.grantFinish = function (zone, tier) {
    const pool = G.foilCandidates(zone);
    if (!pool.length) return null;
    const key = pool[Math.floor(Math.random() * pool.length)];
    if (tier === 'foils') {
      const foilKey = G.foilKey(key);
      const foil = G.cardDef(foilKey);
      G.addCardToDiscard(foilKey, 1);
      if (G.durabilityEnabled() && foil && foil.durability) {
        S.durability[foilKey] = (S.durability[foilKey] || 0) + foil.durability;
      }
      G.emit('cosmetic:granted', { key: foilKey, tier });
      return foilKey;
    }
    S.prismatic[key] = (S.prismatic[key] || 0) + 1;
    G.emit('cosmetic:granted', { key, tier });
    return key;
  };

  /* How a given drawn copy should render. deckIndex is its position in
     S.deck; prismatic copies are counted off first, then foils. */
  G.cardFinish = function (key, deckIndex) {
    if (G.isFoilCardKey(key)) return 'foil';
    const pris = G.finishCount(S.prismatic, key);
    const foil = G.finishCount(S.foils, key);
    if (!pris && !foil) return '';
    let ordinal = 0;
    for (let i = 0; i <= deckIndex && i < S.deck.length; i++) {
      if (S.deck[i] === key) ordinal++;
    }
    if (ordinal <= pris) return 'prismatic';
    if (ordinal <= pris + foil) return 'foil';
    return '';
  };

  /* Zone capes share the `cape` slot with the Backpack, and there is
     no un-equip control anywhere — so a pull must never silently
     overwrite capacity gear the player chose. Own it always; wear it
     only when the slot is free or already holds another zone cape.
     Everything owned shows in the Bag's wardrobe to swap by hand. */
  G.grantWardrobe = function (itemKey) {
    if (!Array.isArray(S.wardrobe)) S.wardrobe = [];
    const isNew = S.wardrobe.indexOf(itemKey) < 0;
    if (isNew) S.wardrobe.push(itemKey);
    const slot = G.ITEMS[itemKey].slot;
    const worn = S.equipped[slot];
    if (!worn || (G.ITEMS[worn] && G.ITEMS[worn].cosmetic)) S.equipped[slot] = itemKey;
    return { isNew, worn: S.equipped[slot] === itemKey };
  };

  G.wearWardrobe = function (itemKey) {
    if (!G.ITEMS[itemKey]) return false;
    if ((S.wardrobe || []).indexOf(itemKey) < 0) return false;
    S.equipped[G.ITEMS[itemKey].slot] = itemKey;
    G.emit('state:changed');
    G.save(true);
    return true;
  };

  /* One weighted roll against G.ZONE_LOOT. The three reels are made to
     land on the result rather than deciding it — a win shows the same
     icon three times, a miss deliberately does not match. */
  G.rollZoneLoot = function () {
    let r = Math.random();
    for (const entry of G.ZONE_LOOT) {
      if (r < entry.chance) return entry;
      r -= entry.chance;
    }
    return null;                        // the leftover "nothing" slice
  };

  G.spinZoneLoot = function (zone) {
    const pool = (G.ZONES[zone] || {}).lootPool || [];
    const entry = G.rollZoneLoot();
    let reward = null;

    if (entry && entry.kind === 'res') {
      const qty = G.rand(entry.min, entry.max);
      reward = { kind: 'res', key: entry.key, qty: G.addRes(entry.key, qty) };
    } else if (entry && entry.kind === 'gem') {
      const key = entry.pool[Math.floor(Math.random() * entry.pool.length)];
      const qty = G.rand(entry.min, entry.max);
      reward = { kind: 'gem', key, qty: G.addRes(key, qty) };
    } else if (entry && entry.kind === 'foil') {
      const key = G.grantFinish(zone, 'foils');
      if (key) reward = { kind: 'foil', card: key, name: G.cardDef(key).name };
    } else if (entry && entry.kind === 'prismatic') {
      const key = G.grantFinish(zone, 'prismatic');
      if (key) reward = { kind: 'prismatic', card: key, name: G.cardDef(key).name };
    } else if (entry && entry.kind === 'cape') {
      const capeKey = (G.ZONES[zone] || {}).cape;
      if (capeKey) {
        const res = G.grantWardrobe(capeKey);
        reward = { kind: 'cape', item: capeKey, name: G.ITEMS[capeKey].name,
                   isNew: res.isNew, worn: res.worn };
      }
    }

    /* Reels are theatre: they land matching on any win and are forced
       to disagree when nothing was won. Cosmetic prizes have no
       inventory icon of their own, so they spin up gold. */
    let reels;
    const icon = reward ? (reward.key || 'gold') : null;
    if (reward) {
      reels = [icon, icon, icon];
    } else if (pool.length > 1) {
      reels = [0, 1, 2].map(() => pool[Math.floor(Math.random() * pool.length)]);
      if (reels[0] === reels[1] && reels[1] === reels[2]) {
        reels[2] = pool.find(k => k !== reels[0]) || reels[2];
      }
    } else {
      reels = ['gold', 'stone', 'stick'];
    }

    if (reward) G.save(true);
    return { reels, win: !!reward, reward };
  };

  /* Basic gathering is flat: one per card. Tools scale. */
  G.yieldFor = function (key) {
    const c = G.cardDef(key);
    if (!c || !c.res) return 1;
    const baseKey = G.baseCardKey(key);
    if (baseKey === 'flint' || baseKey === 'stick') return 1;
    const lv = S.skills[c.skill] ? S.skills[c.skill].lv : 1;
    return 2 + Math.floor((lv - 1) / 2);
  };

  /* Foraging milestones (25/50/75/100) double the yield of forage
     and gather cards, stacking each time a milestone is passed. */
  G.foragingMult = function (card) {
    if (!card || card.skill !== 'foraging') return 1;
    const lv = S.skills.foraging ? S.skills.foraging.lv : 1;
    return Math.pow(2, Math.floor(lv / 25));
  };

  /* ---------- status effects ---------------------------------
     Applied by 'event' cards (see systems/cards.js) — an ongoing
     condition, not a one-off resolve. `duration` (in cards played,
     any zone) counts down in G.tickStatuses and clears itself; a
     future effect can instead skip `duration` and rely on
     G.clearStatus being called from a cure item/action elsewhere —
     both shapes already work with everything below.                */
  G.applyStatus = function (key, duration) {
    const def = G.STATUS_EFFECTS[key];
    if (!def) return;
    S.status[key] = duration != null ? duration : def.duration;
    G.emit('status:applied', { key, def });
    G.save(true);
  };
  G.hasStatus = key => key in S.status;
  G.clearStatus = function (key) {
    if (!(key in S.status)) return;
    delete S.status[key];
    G.emit('status:cleared', { key });
  };
  G.tickStatuses = function () {
    Object.keys(S.status).forEach(key => {
      if (typeof S.status[key] !== 'number') return;   // no duration — cured externally
      S.status[key]--;
      if (S.status[key] <= 0) G.clearStatus(key);
    });
  };

  /* ---------- player health -------------------------------- */
  G.hurtPlayer = function (n) {
    const dmg = G.mitigate(n);
    S.hp = Math.max(0, S.hp - dmg);
    S.cardsSinceHit = 0;
    G.emit('player:hurt', { amount: dmg });
    if (S.hp <= 0) G.downPlayer();
  };
  G.downPlayer = function () {
    const lost = {};
    Object.keys(G.RESOURCES).forEach(k => {
      if (k === 'gold') return;
      const qty = S[k] || 0;
      const cut = Math.floor(qty * 0.35);
      if (cut > 0) { G.removeRes(k, cut); lost[k] = cut; }
    });
    S.streak = 0;
    S.locationField = [null, null, null];
    G.fillLocationField();
    S.hp = G.maxHp();
    G.applyStatus('wounded');
    G.emit('player:downed', { lost });
    G.save(true);
  };
  /* No passive healing. Eat something. */
  G.regenTick = function () {};

  /* ---------- enemies -------------------------------------- */
  /* Drop table entries are either a plain key (always one) or
     { key, min, max, chance } for ranged / chance-based loot. */
  G.rollDrops = function (def) {
    const got = {};
    function addDrop(entry) {
      if (!entry) return;
      if (typeof entry === 'string') {
        got[entry] = (got[entry] || 0) + (def.dropQty ? (def.dropQty[entry] || 1) : 1);
        return;
      }
      if (entry.chance != null && Math.random() >= entry.chance) return;
      const lo = entry.min != null ? entry.min : 1;
      const hi = entry.max != null ? entry.max : lo;
      got[entry.key] = (got[entry.key] || 0) + G.rand(lo, hi);
    }
    def.dropTable.forEach(entry => {
      if (entry && Array.isArray(entry.oneOf) && entry.oneOf.length) {
        addDrop(entry.oneOf[Math.floor(Math.random() * entry.oneOf.length)]);
        return;
      }
      addDrop(entry);
    });
    return got;
  };
  /* ---------- location field --------------------------------
     Up to three of the current zone's location decks sit on the
     field at once — boulders, trees, ore veins, and animals, all the
     same system. Each of the 3 field slots draws from its OWN
     independent deck (G.ZONES[zone].locationDecks[i], data.js), not
     one shared pile — so a zone with a Boulder deck in slot 0 and a
     Pine Tree deck in slot 1 structurally always has both on the
     field, by construction, not by chance (this replaced an earlier
     "guarantee" pass that fixed up a shared-deck field after the
     fact — with a dedicated deck per slot there's nothing left to
     fix). A slot's own deck can still mix several location keys
     (e.g. a future ore-deposit slot cycling Boulder/Copper/Tin) —
     that's a content edit to one slot's composition, not an engine
     change. Clearing a slot pays out its drop table in full and
     redraws from that same slot's deck. Mirrors G.buildDeck: a full
     array plus a draw pointer per slot, reshuffled in place only
     once that slot's pointer runs out. A zone with more 'combat'
     entries in a slot's mix is simply a more dangerous slot to
     gather at — no separate spawn timer or weighted roll needed;
     the deck composition is the difficulty knob.                 */
  G.buildLocationDecks = function () {
    const comps = (G.ZONES[S.zone] || {}).locationDecks || [];
    S.locationDecks = [0, 1, 2].map(i => {
      const comp = comps[i] || {};
      const deck = [];
      Object.keys(comp).forEach(k => {
        for (let n = 0; n < comp[k]; n++) deck.push(k);
      });
      return { deck, drawn: 0 };
    });
  };

  G.syncLocationDecksToZone = function () {
    const comps = (G.ZONES[S.zone] || {}).locationDecks || [];
    if (!Array.isArray(S.locationDecks)) S.locationDecks = [];
    if (!Array.isArray(S.locationField)) S.locationField = [null, null, null];
    for (let i = 0; i < 3; i++) {
      const comp = comps[i] || {};
      const keys = Object.keys(comp);
      const needsDeck = !S.locationDecks[i] || !Array.isArray(S.locationDecks[i].deck) ||
        (!S.locationDecks[i].deck.length && keys.length);
      if (needsDeck) {
        const deck = [];
        keys.forEach(k => {
          for (let n = 0; n < comp[k]; n++) deck.push(k);
        });
        S.locationDecks[i] = { deck, drawn: 0 };
        if (deck.length) G.shuffle(deck);
      } else if (!S.locationDecks[i]) {
        S.locationDecks[i] = { deck: [], drawn: 0 };
      }
      if (S.locationField[i] && keys.length && !comp[S.locationField[i].key]) {
        S.locationField[i] = null;
      }
    }
  };

  G.fillLocationField = function () {
    if (!Array.isArray(S.locationField)) S.locationField = [null, null, null];
    if (!Array.isArray(S.locationDecks)) G.buildLocationDecks();
    G.syncLocationDecksToZone();
    for (let i = 0; i < S.locationField.length; i++) {
      if (S.locationField[i]) continue;
      const sd = S.locationDecks[i];
      if (!sd || !sd.deck.length) continue;      // no deck configured for this slot
      if (sd.drawn >= sd.deck.length) {
        G.shuffle(sd.deck);
        sd.drawn = 0;
      }
      const key = sd.deck[sd.drawn++];
      S.locationField[i] = { key, hp: G.LOCATIONS[key].hp };
    }
  };

  /* A card's kind matches a location's `requires` directly (mine on a
     boulder, axe on a tree) — except 'combat': a melee or ranged card
     kind both match any location that requires 'combat', since either
     weapon can fight any animal. */
  function locationMatchesKind(def, kind) {
    if (!def) return false;
    if (def.requires === kind) return true;
    return def.requires === 'combat' && (kind === 'melee' || kind === 'ranged');
  }
  function locationMatchesCard(def, kind, cardKey) {
    if (!locationMatchesKind(def, kind)) return false;
    if (!def || !def.requiresCard || !cardKey) return true;
    return G.baseCardKey(cardKey) === G.baseCardKey(def.requiresCard);
  }

  /* Among active field entries a card's kind can affect, the one
     closest to breaking — so a wide field never wastes a swing.
     Pass forceIndex (a locationField slot index, from a drag-and-drop
     drop) to aim at that exact slot instead of auto-picking; a
     mismatched forced slot (wrong kind, or empty) yields no target
     at all rather than silently falling back to auto-pick — a
     deliberate drop commits to what it lands on. */
  G.activeLocation = function (kind, forceIndex, cardKey) {
    if (typeof forceIndex === 'number') {
      const slot = (S.locationField || [])[forceIndex];
      const def = slot && G.LOCATIONS[slot.key];
      return locationMatchesCard(def, kind, cardKey) ? slot : null;
    }
    let best = null;
    (S.locationField || []).forEach(slot => {
      if (!slot) return;
      const def = G.LOCATIONS[slot.key];
      if (!locationMatchesCard(def, kind, cardKey)) return;
      if (!best || slot.hp < best.hp) best = slot;
    });
    return best;
  };

  /* ---------- damage types ----------------------------------
     Every attack card carries a `damageType` (blunt / pierce / slash
     / ranged — ranged being every bow, per its own weapon class). A
     location may answer with `weak` or `resist`, in either of two
     shapes:

       weak:   ['pierce']            shorthand, uses TUNE.weakMult
       resist: { blunt: 0.25 }       explicit per-type multiplier

     NOTHING is assigned to any enemy yet, so every multiplier is
     currently 1 and the system is completely inert — it's wiring
     waiting on balance decisions. */
  G.DAMAGE_TYPES = ['blunt', 'pierce', 'slash', 'ranged'];
  G.damageTypeOf = function (cardKey) {
    const c = cardKey && G.cardDef(cardKey);
    return (c && c.damageType) || null;
  };
  G.damageMult = function (def, damageType) {
    if (!def || !damageType) return 1;
    const read = (tbl, dflt) => {
      if (!tbl) return null;
      if (Array.isArray(tbl)) return tbl.indexOf(damageType) >= 0 ? dflt : null;
      return typeof tbl[damageType] === 'number' ? tbl[damageType] : null;
    };
    const w = read(def.weak, G.TUNE.weakMult);
    const r = read(def.resist, G.TUNE.resistMult);
    let m = 1;
    if (w !== null) m *= w;
    if (r !== null) m *= r;
    return m;
  };

  G.damageLocation = function (dmg, kind, forceIndex, cardKey) {
    const slot = G.activeLocation(kind, forceIndex, cardKey);
    if (!slot) return null;
    const i = S.locationField.indexOf(slot);
    /* The damage type comes from the card being PLAYED (G.current),
       not from `cardKey`. They're usually the same card, but cardKey
       is also what `locationMatchesCard` uses to enforce a location's
       `requiresCard` gate — and only the axe passes it. Reading
       G.current here keeps damage typing independent of that gating,
       so adding types changed no targeting rules. */
    const typeKey = (G.current && G.current.key) || cardKey;
    const mult = G.damageMult(G.LOCATIONS[slot.key], G.damageTypeOf(typeKey));
    /* A resisted hit still lands for at least 1, so a target can never
       become unkillable by accident. A location may still declare a
       flat 0 for true immunity to one damage type — that's a
       deliberate authoring choice (bring a different weapon), not a
       rounding artifact. */
    const applied = mult === 0 ? 0 : Math.max(1, Math.round(dmg * mult));
    slot.hp -= applied;
    G.emit('location:hurt', { key: slot.key, index: i, dmg: applied, mult });
    if (slot.hp <= 0) {
      const def = G.LOCATIONS[slot.key];
      const drops = G.rollDrops(def);
      const got = {};
      Object.keys(drops).forEach(k => {
        const n = G.addRes(k, drops[k]);
        if (n) got[k] = n;
      });
      S.locationField[i] = null;
      G.fillLocationField();
      /* location kills still count toward travel gates (Forest Road,
         Khar-Barak) exactly as animal kills always have — anything
         with an atk is hostile, whether it's fair game for any
         weapon ('combat') or gated to one in particular (e.g. a Deer
         that only a bow can hit). */
      if (def.atk) S.kills++;
      G.emit('location:cleared', { def, got, index: i });
      G.save(true);
      return { cleared: true, got, key: slot.key, index: i };
    }
    return { cleared: false, key: slot.key, index: i };
  };

  /* ---------- the loop -------------------------------------
     Each turn deals a HAND of three cards. Tap one to play it,
     which opens a short reflex gauge; tap again inside the band
     to double the effect. The other two are discarded.
     Phases: 'choose' -> 'window' -> 'resolving' -> 'choose'.  */
  let rafId = null;
  G.current = { key: null, index: -1 };
  G.hand = [];
  G.phase = 'choose';

  function faceFor(key) {
    const card = G.cardDef(key);
    const kind = G.cardKinds[card.kind];
    return kind && kind.face ? kind.face(card, key) : { detail: '' };
  }

  G.drawHand = function () {
    if (G.rt.paused) return;
    const n = T.handSize;
    /* reshuffle when fewer than a full hand remains */
    if (S.drawnCount + n > S.deck.length) {
      S.drawnCount = 0;
      G.shuffle(S.deck);
      G.syncActiveDeckSlot();
      G.emit('deck:reshuffled');
      G.save(true);
    }
    G.hand = S.deck.slice(S.drawnCount, S.drawnCount + n);
    G.current = { key: null, index: -1 };
    G.phase = 'choose';
    G.rt.windowOpen = false;
    G.emit('hand:dealt', {
      hand: G.hand.map((k, i) => ({
        key: k, index: i, card: G.cardDef(k), face: faceFor(k),
        /* '', 'foil' or 'prismatic' — decided by this copy's position
           in the deck, see G.cardFinish */
        finish: G.cardFinish(k, S.drawnCount + i),
      })),
    });
  };
  /* kept so older callers still work */
  G.drawNext = G.drawHand;

  G.chooseCard = function (i) {
    if (G.rt.paused || G.phase !== 'choose') return;
    if (i < 0 || i >= G.hand.length) return;
    G.current = { key: G.hand[i], index: i };
    G.emit('card:chosen', { index: i, key: G.hand[i] });
    G.openWindow();
  };

  /* Leveling any of these widens the band (easier double-taps) for
     cards tagged with that skill, per T.harvestBandPerLv. Crafting
     skills (prayer, smithing, cooking, ...) are unaffected. Melee and
     archery level independently now (see G.SKILLS) but both still
     widen the band the same way attack used to for either weapon. */
  const BAND_SKILLS = { foraging: 1, mining: 1, woodcut: 1, melee: 1, archery: 1 };

  /* Roll a fresh band: random width, random position. A full
     scrap armor set widens it, per the set bonus. */
  G.rollBand = function () {
    let mult = G.hasArmorSet() ? T.armorSetBandMult : 1;
    const card = G.current && G.cardDef(G.current.key);
    if (card && BAND_SKILLS[card.skill]) {
      const lv = S.skills[card.skill] ? S.skills[card.skill].lv : 1;
      mult *= 1 + T.harvestBandPerLv * (lv - 1);
    }
    Object.keys(S.status).forEach(key => {
      const def = G.STATUS_EFFECTS[key];
      if (def && def.bandMult) mult *= def.bandMult;
    });
    const w = (T.bandMin + Math.random() * (T.bandMax - T.bandMin)) * mult;
    const lo = T.bandEarliest;
    const hi = T.bandLatest - w;
    const start = lo + Math.random() * Math.max(0, hi - lo);
    return { start, end: start + w };
  };

  G.openWindow = function () {
    if (G.rt.paused) return;
    G.phase = 'window';
    G.rt.windowOpen = true;
    G.rt.tapped = false;
    G.rt.band = G.rollBand();
    G.rt.windowStart = performance.now();
    G.emit('window:open', { band: G.rt.band });
    /* The needle loops rather than stopping at the end, so a band
       rolled near the start is never missed just because the
       player reacted too late for the first pass. */
    (function frame(now) {
      const elapsed = (now || performance.now()) - G.rt.windowStart;
      const p = (elapsed % T.windowTime) / T.windowTime;
      G.emit('window:tick', { p });
      if (G.rt.windowOpen) rafId = requestAnimationFrame(frame);
    })();
  };

  /* Taps on the play field only matter during the reflex window;
     choosing a card goes through G.chooseCard from the UI.       */
  G.handleTap = function () {
    if (G.rt.paused || S.page !== 'play') return;
    if (G.phase === 'window' && G.rt.windowOpen && !G.rt.tapped) {
      G.rt.tapped = true;
      const p = (performance.now() - G.rt.windowStart) / T.windowTime;
      const b = G.rt.band || { start: 0.5, end: 0.7 };
      G.resolveCard(p >= b.start && p <= b.end);
    }
  };

  G.resolveCard = function (hit, targetIndex) {
    if (!G.rt.windowOpen) return;
    G.rt.windowOpen = false;
    cancelAnimationFrame(rafId);
    const critHit = hit && !G.hasStatus('wounded');

    S.attempts++;
    if (critHit) { S.hits++; S.streak++; } else S.streak = 0;
    /* any card played counts toward the zone it was played in —
       hit or miss, wasted swing or not, regardless of kind */
    G.grantZoneXp(S.zone, T.zoneXpPerCard);
    G.tickStatuses();

    const key = G.current.key;
    const card = G.cardDef(key);
    const kind = G.cardKinds[card.kind];

    const ctx = {
      key, card, hit: critHit, rawHit: hit,
      tapped: G.rt.tapped,
      encumbered: G.isEncumbered(),
      target: targetIndex,
      verdict: null,
    };
    if (kind && kind.resolve) kind.resolve(ctx);
    G.emit('card:resolved', ctx);

    /* the whole hand leaves the deck — the two you passed on are discarded */
    S.drawnCount += G.hand.length;
    G.syncActiveDeckSlot();
    /* Wear comes from landing on a target, not from being played —
       a pick swung at an empty field costs nothing. Tools/weapons
       drain the same amount whether the tap was clean or not; only
       yield/damage doubles on a hit, never durability (kind.resolve
       sets ctx.dealt when it actually damaged something). */
    if (ctx.dealt) G.drainDurability(key);
    G.regenTick();
    G.emit('state:changed');

    G.phase = 'resolving';
    setTimeout(() => { if (!G.rt.paused) G.drawHand(); }, 375);
  };

  G.stopLoop = function () {
    cancelAnimationFrame(rafId);
    G.rt.windowOpen = false;
    G.phase = 'choose';
  };

})(window.Game = window.Game || {});
