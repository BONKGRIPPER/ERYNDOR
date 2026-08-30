// ================================================================== state
//
// The one mutable game-state object, plus its save/load. Everything else
// imports `state` from here and mutates it directly -- there's no action
// dispatch layer, on purpose, at this scale.

import {
  PLOT_COUNT, RECIPES, EQUIP_SLOTS, BUILDINGS, CAN_CAPACITY, STATIONS, VILLAGER_TICK_MS,
} from "./data.js";

export const SAVE_KEY = "eryndor:save";

export const state = {
  // The anchor for the whole real-time calendar (see src/time.js) -- set
  // once, the instant a save is first created, and never touched again.
  // Every season/day-of-season/year number is computed from elapsed real
  // time since this moment, which is what makes every save start in
  // Spring on Day 1 regardless of the actual date. load() overwrites this
  // default only if an existing save already has one.
  startedAt: Date.now(),
  // Empty except for the free starting toolkit -- seeds and cones are
  // something you forage or buy, not a kit, but one of each tool has to
  // exist from the first boot or Farming/Logging/Mining have nothing to
  // equip. All four are deliberately weak/starter-tier (see EQUIPMENT,
  // PICKAXES, CANS in data.js) -- crafting or finding better ones is the
  // point, not a shortcut around them.
  bag: { "Wooden Pickaxe": 1, "Wooden Axe": 1, "Wooden Scythe": 1, "Wooden Can": 1 },
  // A second bag, same shape, sitting at Aerendell rather than carried.
  // One shared crate for now -- there's only one place to put it.
  storage: {},
  // slot id -> item name, or null. See EQUIPMENT in data.js for what can
  // go where.
  equipment: {},
  // One-time flag: equipping used to leave a copy sitting in `bag` too;
  // load() now reconciles that once for a save from before the change,
  // then flips this so it never runs again (a legitimate spare bought or
  // crafted later must never get silently eaten on the next reload).
  equipMigrated: false,
  shards: 0,
  // Aerendell's market: how much stock it's currently holding of each item,
  // and when that number was last touched -- stock decays toward zero from
  // that timestamp (see marketStock() in market.js), so nothing here needs
  // a background tick to stay correct after time away.
  market: { stock: {}, stockAt: {} },
  // building id -> true once its one-time cost has been paid.
  buildings: {},
  // Simplified (2026-08-28): one fuel + one cookable chosen ahead of time
  // (selectedFuel/selectedCook, picked from the Fuel/Cook picker sheets --
  // free to change any time nothing's actively burning), then one tap on
  // the Cook pill spends one of each and starts `current` -- same
  // {startedAt, readyAt} shape and "spend on commit" rule every other
  // station uses, just with no queue behind it. No queueing and no pause
  // any more; the old two-queue version is what's being simplified away.
  campfire: { selectedFuel: null, selectedCook: null, current: null },
  farmingXp: 0,
  loggingXp: 0,
  foragingXp: 0,
  // Bought once at VILLAGER_LEVEL, from the Township screen -- see
  // township.js. Owning one schedules villagerNextTickAt below and keeps it
  // rescheduling itself forever, tapping the forage swing on its own.
  // `fastHands` is the one villager upgrade that exists so far (also bought
  // from Township) -- see forage.js's villagerTickMs() for where it
  // actually applies.
  villager: { owned: false, fastHands: false },
  // Stamped every tick while the game is actually running, so the gap
  // between this and Date.now() at the next boot is exactly how long the
  // game was closed -- no separate close/unload handler needed, the last
  // tick before the page died already recorded the moment for free.
  lastActiveAt: Date.now(),
  // A plot is: { crop, stage, startedAt, readyAt, waterProgress }.
  // `readyAt` null means it is planted but not yet fully watered -- the
  // growth timer has not started. `waterProgress` (0..WATER_TAPS_NEEDED)
  // counts individual can taps toward that; the timer only starts once it
  // hits WATER_TAPS_NEEDED. Storing a deadline rather than a countdown
  // means crops keep growing while the game is closed.
  plots: [],
  tool: null,   // null | "seeds" | "water" | "scythe"
  seed: null,   // which crop the seed tool will plant
  // The watering can's own charge meter -- shared by whichever screen taps
  // it, but each screen owns a separate can (see logWateringCan) so Farm
  // and Logging can't drain one from the other. `refillAt` is the deadline
  // it'll be back to full, or null when it isn't refilling.
  wateringCan: { charges: CAN_CAPACITY, refillAt: null },
  // Logging's own plot grid and tool -- same shape as Field's, kept
  // separate rather than shared, since the two screens can hold different
  // tools at once (leave Farm with Water selected, go chop in Logging,
  // come back and Water is still selected). Logging's plots additionally
  // carry `chopHealth` -- the tree's remaining HP once ripe (set to the
  // tree's own `health` the moment it ripens, null before then/after it
  // falls) -- felling is a straight HP fight now, not several short timed
  // chops. See logging.js's chopTree().
  logPlots: [],
  logTool: null,   // null | "seed" | "water" | "chop"
  logSeed: null,   // which tree the seed tool will plant
  logWateringCan: { charges: CAN_CAPACITY, refillAt: null },
  // How many taps have landed on the current forage swing (0 up to, but not
  // including, FORAGE_CLICKS_PER_SWING) -- shared by the player's own taps
  // and the hired villager's automatic ones. Resets to 0 the instant a
  // swing completes. What it actually produces is rolled once it resolves
  // (see forage.js), not stored here.
  forageProgress: 0,
  // Absolute deadline for the villager's next automatic tap -- null
  // whenever no villager is working yet (not hired, or hired but its first
  // tick was never scheduled). Same deadline-not-countdown rule as every
  // other timer, so a long stretch away catches up by counting how many
  // ticks fit in the elapsed time rather than needing a background loop.
  // See src/forage.js's settleForage().
  villagerNextTickAt: null,
  // Same shape as foraging, one slot per recipe.
  crafting: { flintAxe: null, flintPickaxe: null, stonePickaxe: null },
  sowingXp: 0,
  millingXp: 0,
  stonecuttingXp: 0,
  tanningXp: 0,
  fishingXp: 0,
  // One active cycle per conversion station, keyed by STATIONS id -- null
  // while idle, {startedAt,readyAt} while running. See src/stations.js.
  stations: {},
  // Per-output-item crafting mastery, keyed by the item's own name (not by
  // which station/recipe made it) -- {level, crafts} per item, absent
  // entirely until the first time that item is actually made. See
  // src/itemLevels.js.
  itemLevels: {},
  miningXp: 0,
  // How many clicks of the current swing have landed so far (0 up to, but
  // not including, the equipped pickaxe's clicksPerSwing) -- every tap is
  // instant (no per-click timer), so this is the only "mid-swing" state
  // that exists. Resets to 0 the instant a swing completes, whether it
  // succeeded or caved in. See src/mining.js.
  swingProgress: 0,
  // How deep the current trip has reached, and what it's carrying -- both
  // reset to 0/{} on a cave-in *or* on choosing to surface. Nothing here is
  // safe until it's been moved into `bag` by surfacing; that's the entire
  // risk/reward loop.
  depth: 0,
  carried: {},
  // Timestamp; digging refuses to start again until Date.now() passes this.
  // Set on every cave-in (a real punishment) and, more briefly, after every
  // surface (banking itself is instant -- this is just "give it a beat"
  // before the next dig). 0 otherwise (0 always compares as "already past").
  mineCooldownUntil: 0,
  // Item names, most-recently-gained first, deduped (a repeat gain just
  // moves back to the front rather than adding a second entry) -- feeds the
  // home hub's "Recent Items" strip. Only ever needs to hold 5, so gainItem()
  // below trims it there rather than storing unbounded history.
  recentItems: [],
  combatXp: 0,
  // Null while no fight is on. While one is: {enemyKey, enemyHP, enemyMaxHP,
  // playerHP, playerMaxHP, enemyNextAttackAt, playerCooldownUntil, braced,
  // over}. `enemyNextAttackAt` is the usual deadline-not-countdown -- a
  // fight left mid-round through a reload settles every attack the enemy
  // would have landed since, not just one, same catch-up rule foraging's
  // villager cycle uses. Player HP resets to full at the start of each
  // fight rather than persisting between them -- there's no expedition
  // layer yet for it to matter across fights. See src/combat.js.
  combat: null,
  // A custom order for the home hub's cards, press-and-hold-to-reorder --
  // null (the default) means "just use PLACES' own order". Once set, it's
  // an array of place ids; hub.js's orderedPlaces() reads whatever ids it
  // recognizes in that order and appends any hub place it doesn't (new
  // content unlocked after the player last reordered) at the end in
  // PLACES' own order, rather than losing track of them.
  hubOrder: null,
  // Every item name ever gained, once true always true -- the Journal's
  // Collection page (src/journal.js) reads this to decide whether to show
  // a real sprite or a "?" for each of the 51 possible items, so it has to
  // survive the item later being spent/consumed/sold, unlike state.bag
  // itself. Set once, in gainItem() below, never unset.
  discoveredItems: {},
  // Which LOCATIONS key the player is currently at. The Map screen
  // (src/map.js) highlights this one with "You are here"; src/travel.js
  // is what's allowed to change it, once a trip finishes.
  currentLocation: "aerendell",
  // null when not traveling. Otherwise { from, to, readyAt } -- readyAt is
  // an absolute deadline like every other timer in this game, not a
  // countdown, so a trip keeps progressing correctly across a reload or
  // the tab being closed outright. One trip in flight at a time; see
  // src/travel.js.
  travel: null,
  // One shared bank, not one per city -- exactly what "items in the bank
  // can be accessed from any other city" (the original ask) means: there's
  // nothing to key per-city in the first place. Same {name: qty} shape as
  // state.bag/storage. Only reachable from the Market screen while at a
  // "city"-type location (src/market.js).
  bank: {},
  // `trap`: null, or { poolId, readyAt } once one's been set -- poolId is
  // captured at set-time (not read fresh at resolution) so a trap left out
  // resolves against the location it was actually set at, even if the
  // player has since traveled elsewhere. One trap in flight at a time.
  // `bait`: the bait item name currently selected for the Rod, or null --
  // persisted purely as a convenience so it doesn't reset to "none" on
  // every reload; the Rod's cast/bite state itself is intentionally NOT
  // persisted here (see src/fishing.js), same reasoning a mid-swing
  // Mining/Foraging tap sequence would be if this game ever stopped
  // persisting those -- a short enough window that resetting it on reload
  // isn't worth the extra save-shape complexity.
  fishing: { trap: null, bait: null },
};

// The one place every producer (foraging, crafting, cooking, mining,
// farming, logging, stations, buying) should route a bag gain through,
// instead of touching state.bag directly -- so "what got added recently"
// stays accurate without every call site also having to know about
// recentItems. Losses (selling, crafting costs, campfire fuel) don't go
// through here; only things arriving in the bag count as "gained". Also
// the one place that ever needs to mark an item discovered for the
// Collection page -- every real source of a new item already funnels
// through here, so nothing else has to remember to call this too.
export function gainItem(name, amount) {
  state.bag[name] = (state.bag[name] || 0) + amount;
  state.discoveredItems[name] = true;
  const i = state.recentItems.indexOf(name);
  if (i !== -1) state.recentItems.splice(i, 1);
  state.recentItems.unshift(name);
  if (state.recentItems.length > 5) state.recentItems.length = 5;
}

Object.keys(STATIONS).forEach(function (id) { state.stations[id] = null; });

for (let i = 0; i < PLOT_COUNT; i++) {
  state.plots.push({
    crop: null, stage: 0, startedAt: 0, readyAt: null, waterProgress: 0,
    reapReadyAt: null,
  });
  state.logPlots.push({
    crop: null, stage: 0, startedAt: 0, readyAt: null, waterProgress: 0,
    chopHealth: null,
  });
}
// Every slot starts filled with its matching starter tool -- there's
// always exactly one of each in the starting bag, so they might as well
// already be in hand rather than making the player equip them manually.
// Equipping moves the item out of the bag (see inventory.js's equip()),
// so the starting bag above and this loop are two ends of the same
// transfer -- the item briefly exists in both only in that literal object,
// never in what the player actually sees.
const STARTER_TOOLS = {
  axe: "Wooden Axe", scythe: "Wooden Scythe", can: "Wooden Can", pick: "Wooden Pickaxe",
};
EQUIP_SLOTS.forEach(function (slot) {
  const starter = STARTER_TOOLS[slot.id];
  state.equipment[slot.id] = starter || null;
  if (starter && state.bag[starter]) {
    state.bag[starter] -= 1;
    if (state.bag[starter] <= 0) delete state.bag[starter];
    // Starting gear never passes through gainItem() -- it's just there at
    // boot -- so it needs its own discovery mark, or a brand new save
    // would show "?" for the very axe already in the player's hand.
    state.discoveredItems[starter] = true;
  }
});
Object.keys(BUILDINGS).forEach(function (id) { state.buildings[id] = false; });

// Wrapped because file:// origins can refuse storage -- the game still runs,
// it just won't remember anything.
export function save() {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({
      startedAt: state.startedAt,
      bag: state.bag, storage: state.storage, equipment: state.equipment,
      equipMigrated: state.equipMigrated,
      shards: state.shards, market: state.market,
      buildings: state.buildings, campfire: state.campfire,
      plots: state.plots, logPlots: state.logPlots,
      wateringCan: state.wateringCan, logWateringCan: state.logWateringCan,
      farmingXp: state.farmingXp, loggingXp: state.loggingXp,
      foragingXp: state.foragingXp, villager: state.villager,
      lastActiveAt: state.lastActiveAt,
      forageProgress: state.forageProgress, villagerNextTickAt: state.villagerNextTickAt,
      crafting: state.crafting,
      sowingXp: state.sowingXp, millingXp: state.millingXp,
      stonecuttingXp: state.stonecuttingXp, tanningXp: state.tanningXp,
      fishingXp: state.fishingXp, fishing: state.fishing,
      stations: state.stations,
      itemLevels: state.itemLevels,
      miningXp: state.miningXp,
      swingProgress: state.swingProgress,
      depth: state.depth, carried: state.carried,
      mineCooldownUntil: state.mineCooldownUntil,
      recentItems: state.recentItems,
      combatXp: state.combatXp, combat: state.combat,
      hubOrder: state.hubOrder,
      discoveredItems: state.discoveredItems,
      currentLocation: state.currentLocation,
      travel: state.travel,
      bank: state.bank,
    }));
  } catch (e) { /* no storage available */ }
}

export function load() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return;
    const data = JSON.parse(raw);
    if (typeof data.startedAt === "number") state.startedAt = data.startedAt;
    if (data.bag) state.bag = data.bag;
    if (data.storage) state.storage = data.storage;
    if (data.equipment) {
      EQUIP_SLOTS.forEach(function (slot) {
        const v = data.equipment[slot.id];
        state.equipment[slot.id] = (typeof v === "string") ? v : null;
      });
    }
    // One-time only -- see equipMigrated's own comment above. Old saves
    // (from before equipping consumed the bag copy) still have that copy
    // sitting in `bag`; strip exactly one per equipped item, once, ever.
    if (data.equipMigrated !== true) {
      Object.keys(state.equipment).forEach(function (slotId) {
        const name = state.equipment[slotId];
        if (name && state.bag[name]) {
          state.bag[name] -= 1;
          if (state.bag[name] <= 0) delete state.bag[name];
        }
      });
    }
    state.equipMigrated = true;
    if (typeof data.shards === "number") state.shards = data.shards;
    if (data.market) {
      if (data.market.stock) state.market.stock = data.market.stock;
      if (data.market.stockAt) state.market.stockAt = data.market.stockAt;
    }
    if (data.buildings) {
      Object.keys(BUILDINGS).forEach(function (id) {
        state.buildings[id] = data.buildings[id] === true;
      });
    }
    if (data.campfire && typeof data.campfire === "object") {
      // A save from before queueing was removed may still have one -- the
      // pair actually burning (`current`) carries over fine below, but
      // anything still just sitting in the old queue was real spent bag
      // items with nowhere left to live, so it's refunded rather than
      // silently discarded.
      (Array.isArray(data.campfire.fuelQueue) ? data.campfire.fuelQueue : []).forEach(function (item) {
        state.bag[item] = (state.bag[item] || 0) + 1;
      });
      (Array.isArray(data.campfire.cookQueue) ? data.campfire.cookQueue : []).forEach(function (item) {
        state.bag[item] = (state.bag[item] || 0) + 1;
      });
      const c = data.campfire.current;
      state.campfire.current = (c && typeof c.readyAt === "number")
        ? { fuel: c.fuel, item: c.item, startedAt: c.startedAt, readyAt: c.readyAt }
        : null;
      state.campfire.selectedFuel = typeof data.campfire.selectedFuel === "string" ? data.campfire.selectedFuel : null;
      state.campfire.selectedCook = typeof data.campfire.selectedCook === "string" ? data.campfire.selectedCook : null;
    }
    if (typeof data.farmingXp === "number") state.farmingXp = data.farmingXp;
    if (typeof data.loggingXp === "number") state.loggingXp = data.loggingXp;
    if (typeof data.foragingXp === "number") state.foragingXp = data.foragingXp;
    if (data.villager && typeof data.villager === "object") {
      state.villager.owned = data.villager.owned === true;
      state.villager.fastHands = data.villager.fastHands === true;
    }
    // The gap between this and now is what the "welcome back" popup
    // reports as away-time -- default to now (no gap) if this is somehow
    // missing, rather than a stale/undefined value producing a nonsense span.
    state.lastActiveAt = typeof data.lastActiveAt === "number" ? data.lastActiveAt : Date.now();
    state.forageProgress = typeof data.forageProgress === "number" ? data.forageProgress : 0;
    if (typeof data.villagerNextTickAt === "number") {
      state.villagerNextTickAt = data.villagerNextTickAt;
    } else if (state.villager.owned) {
      // A villager owned on this save but with no tick ever scheduled --
      // either a fresh migration from before this pass's tap rework (old
      // saves stored a `foraging` deadline instead), or a hire that got
      // interrupted before kickForageIfIdle() ran. Give it a normal first
      // interval rather than leaving it stalled forever; fastHands (if
      // already bought) applies starting with the *next* tick after this
      // one, same as any other tick.
      state.villagerNextTickAt = Date.now() + VILLAGER_TICK_MS;
    } else {
      state.villagerNextTickAt = null;
    }
    if (data.crafting) {
      Object.keys(RECIPES).forEach(function (item) {
        const c = data.crafting[item];
        state.crafting[item] = (c && typeof c.readyAt === "number") ? c : null;
      });
    }
    if (Array.isArray(data.plots) && data.plots.length === PLOT_COUNT) {
      state.plots = data.plots;
      // A save from before the single-tap Scythe timer existed won't have
      // this field at all -- `undefined !== null` would otherwise read as
      // "mid-cut" forever on every one of its plots.
      state.plots.forEach(function (p) {
        if (p.reapReadyAt === undefined) p.reapReadyAt = null;
      });
    }
    if (Array.isArray(data.logPlots) && data.logPlots.length === PLOT_COUNT) {
      state.logPlots = data.logPlots;
      // A save from before chopping became an HP fight has `chopProgress`/
      // `chopReadyAt` instead -- there's no honest way to convert "2 of 4
      // timed chops landed" into HP, so a tree mid-chop on an old save just
      // comes back at full health rather than carrying over a number that
      // never meant the same thing.
      state.logPlots.forEach(function (p) {
        if (p.chopHealth === undefined) p.chopHealth = null;
      });
    }
    if (data.wateringCan && typeof data.wateringCan === "object") {
      state.wateringCan.charges = typeof data.wateringCan.charges === "number" ? data.wateringCan.charges : CAN_CAPACITY;
      state.wateringCan.refillAt = typeof data.wateringCan.refillAt === "number" ? data.wateringCan.refillAt : null;
    }
    if (data.logWateringCan && typeof data.logWateringCan === "object") {
      state.logWateringCan.charges = typeof data.logWateringCan.charges === "number" ? data.logWateringCan.charges : CAN_CAPACITY;
      state.logWateringCan.refillAt = typeof data.logWateringCan.refillAt === "number" ? data.logWateringCan.refillAt : null;
    }
    if (typeof data.sowingXp === "number") state.sowingXp = data.sowingXp;
    if (typeof data.millingXp === "number") state.millingXp = data.millingXp;
    if (typeof data.stonecuttingXp === "number") state.stonecuttingXp = data.stonecuttingXp;
    if (typeof data.tanningXp === "number") state.tanningXp = data.tanningXp;
    if (typeof data.fishingXp === "number") state.fishingXp = data.fishingXp;
    if (data.fishing && typeof data.fishing === "object") {
      state.fishing.bait = typeof data.fishing.bait === "string" ? data.fishing.bait : null;
      state.fishing.trap = (data.fishing.trap && typeof data.fishing.trap.readyAt === "number")
        ? data.fishing.trap
        : null;
    }
    if (data.stations) {
      Object.keys(STATIONS).forEach(function (id) {
        const c = data.stations[id];
        state.stations[id] = (c && typeof c.readyAt === "number")
          ? { startedAt: c.startedAt, readyAt: c.readyAt }
          : null;
      });
    }
    if (data.itemLevels && typeof data.itemLevels === "object") state.itemLevels = data.itemLevels;
    if (typeof data.miningXp === "number") state.miningXp = data.miningXp;
    if (typeof data.swingProgress === "number") state.swingProgress = data.swingProgress;
    if (typeof data.depth === "number") state.depth = data.depth;
    if (data.carried && typeof data.carried === "object") state.carried = data.carried;
    if (typeof data.mineCooldownUntil === "number") state.mineCooldownUntil = data.mineCooldownUntil;
    if (Array.isArray(data.recentItems)) state.recentItems = data.recentItems.slice(0, 5);
    if (typeof data.combatXp === "number") state.combatXp = data.combatXp;
    if (data.combat && typeof data.combat.enemyNextAttackAt === "number") {
      state.combat = data.combat;
    } else {
      state.combat = null;
    }
    if (Array.isArray(data.hubOrder)) state.hubOrder = data.hubOrder;
    if (typeof data.currentLocation === "string") state.currentLocation = data.currentLocation;
    if (data.travel && typeof data.travel.readyAt === "number") {
      state.travel = data.travel;
    } else {
      state.travel = null;
    }
    if (data.bank && typeof data.bank === "object") state.bank = data.bank;
    if (data.discoveredItems && typeof data.discoveredItems === "object") {
      state.discoveredItems = data.discoveredItems;
    } else {
      // A save from before the Collection journal existed has no discovery
      // ledger at all -- backfilled from whatever's currently in the bag,
      // storage, or equipped, so an existing save doesn't open the journal
      // to a wall of "?" for things it's plainly already carrying. This is
      // a floor, not real history: anything already spent before this pass
      // (a crafted material, fuel burned in the campfire) has no record
      // left to backfill from and stays undiscovered until found again.
      const seed = {};
      Object.keys(state.bag).forEach(function (n) { seed[n] = true; });
      Object.keys(state.storage).forEach(function (n) { seed[n] = true; });
      Object.keys(state.equipment).forEach(function (slotId) {
        const n = state.equipment[slotId];
        if (n) seed[n] = true;
      });
      state.discoveredItems = seed;
    }
  } catch (e) { /* corrupt or unavailable -- start fresh */ }
}
