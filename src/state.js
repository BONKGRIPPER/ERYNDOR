// ================================================================== state
//
// The one mutable game-state object, plus its save/load. Everything else
// imports `state` from here and mutates it directly -- there's no action
// dispatch layer, on purpose, at this scale.

import {
  PLOT_COUNT, RECIPES, EQUIP_SLOTS, BUILDINGS, CAN_CAPACITY, STATIONS, VILLAGER_TICK_MS, TREES,
  LOCATIONS, ZONE_XP_SHARE, ZONE_XP_PER_LEVEL,
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
  // Scaffolding only -- see CURRENCIES in data.js. Nothing awards or
  // spends these yet, but they save/load like any other number so a
  // future feature can start using them without another state-shape pass.
  marks: 0,
  crowns: 0,
  spires: 0,
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
  // actually applies. `homeLocation` is set once, at hire (state.
  // currentLocation at that moment) -- the villager works that location's
  // forage pool forever after, regardless of where the player currently
  // is; hire in Aerendell and it never auto-forages Forest Road's pool
  // just because the player happens to be standing there.
  villager: { owned: false, fastHands: false, homeLocation: null },
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
  tool: null,   // null | "seeds" | "water"
  seed: null,   // which crop the seed tool will plant
  // The watering can's own charge meter -- shared by whichever screen taps
  // it, but each screen owns a separate can (see logWateringCan) so Farm
  // and Logging can't drain one from the other. `refillAt` is the deadline
  // it'll be back to full, or null when it isn't refilling.
  wateringCan: { charges: CAN_CAPACITY, refillAt: null },
  // Logging's own plot grid -- always Pine, no seed/water step at all
  // (2026-08-30): a plot is just { startedAt, readyAt, chopHealth }. It
  // starts growing (`readyAt` set) the moment it's empty -- at boot for a
  // brand new save, or the instant the previous tree falls -- and turns
  // ripe (`readyAt` null, `chopHealth` set to the tree's own `health`) on
  // its own once `readyAt` passes, same deadline-not-countdown rule as
  // everything else timed in this game. Felling is a straight HP fight,
  // not a timed chop -- see logging.js's chopTree()/fellTree().
  logPlots: [],
  // One entry per Honey slot the player's bought (starts with 1, see
  // BEEHIVE_EXPAND_COST in data.js) -- null while idle, {startedAt,
  // readyAt} while brewing, same shape state.mineSwing/state.stations[id]
  // already use. No auto-restart on completion (unlike Logging's trees)
  // -- each slot needs its own fresh tap, same as a Craft pill. See
  // src/beehive.js.
  beehiveSlots: [],
  // The one running gather, or null while idle -- { startedAt, readyAt,
  // poolId }, same {startedAt,readyAt} deadline shape every other timer in
  // this game uses (crafting, stations, campfire). `poolId` is locked in at
  // the moment the gather starts (see forage.js's startForage()), so what
  // it actually produces is rolled from wherever it began, not wherever the
  // player happens to be standing when it resolves.
  forage: null,
  // Foraging's own action mastery -- see FORAGE_LEVEL_THRESHOLDS in
  // data.js. `clicks` counts completed gathers toward the *next* level
  // (resets to 0 the instant that level lands), same shape as
  // state.itemLevels' own {level, crafts} entries.
  forageLevel: { level: 0, clicks: 0 },
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
  tailoringXp: 0,
  grindingXp: 0,
  beekeepingXp: 0,
  fletcherXp: 0,
  // Split off Combat's own combatXp (still gained on every win regardless
  // of weapon) -- whichever of these a kill feeds depends on the weapon
  // equipped at the moment of the killing blow (combat.js's endFight()).
  archeryXp: 0,
  meleeXp: 0,
  // One active cycle per conversion station, keyed by STATIONS id -- null
  // while idle, {startedAt,readyAt} while running. See src/stations.js.
  stations: {},
  // Per-output-item crafting mastery, keyed by the item's own name (not by
  // which station/recipe made it) -- {level, crafts} per item, absent
  // entirely until the first time that item is actually made. See
  // src/itemLevels.js.
  itemLevels: {},
  miningXp: 0,
  // The one running swing, or null while idle -- { startedAt, readyAt },
  // same {startedAt,readyAt} deadline shape every other timer in this game
  // uses (crafting, stations, foraging). Single-tap-and-timer now
  // (2026-08-31); resolves on its own (see mining.js's settleMining()) the
  // instant readyAt passes, whether that turns out to be a cave-in or a
  // successful dig.
  mineSwing: null,
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
  // The village's own donated stockpile -- separate from the player's own
  // bag/storage, spent by settleVillageUpkeep() (src/township.js) every
  // VILLAGE_UPKEEP_MS regardless of which screen is open, same
  // "unconditional background tick" shape the villager's own forage cycle
  // already uses. `nextUpkeepAt` only ever advances on a *successful*
  // upkeep -- short a food or heat unit and it's left in the past,
  // `starved` set, until enough is donated to finally clear it (see
  // settleVillageUpkeep()'s own comment for why that's not a retroactive
  // catch-up loop). null until a villager is actually hired -- there's
  // nothing to keep fed before that.
  village: { food: 0, heat: 0, nextUpkeepAt: null, starved: false },
  // One { level, xp } entry per LOCATIONS key -- see gainSkillXp()/
  // gainZoneXp() below and src/zoneWheel.js for what a level-up actually
  // does. Every zone starts at level 1, filled in by the init loop further
  // down (same "one key per data.js table entry" pattern STATIONS/
  // BUILDINGS already use).
  zones: {},
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

// Feeds ZONE_XP_SHARE of an XP gain into whatever zone the player is
// currently standing in -- flat XP-per-level (ZONE_XP_PER_LEVEL), not
// skills.js's own exponential curve. A `while`, not an `if`, so one large
// grant can carry a zone through more than one level in a single call.
// Returns how many levels it just gained (0 most of the time), so callers
// know whether -- and how many times -- to spin the loot wheel.
export function gainZoneXp(amount) {
  const id = state.currentLocation;
  if (!state.zones[id]) state.zones[id] = { level: 1, xp: 0 };
  const z = state.zones[id];
  z.xp += amount;
  let levels = 0;
  while (z.xp >= ZONE_XP_PER_LEVEL) {
    z.xp -= ZONE_XP_PER_LEVEL;
    z.level += 1;
    levels += 1;
  }
  return levels;
}

// The one place every skill (Mining, Foraging, Farming, Logging, Fishing,
// the conversion stations, Combat) should route its own XP gain through,
// same "one choke point" reasoning gainItem() above already follows for
// bag items -- so the zone-XP share never has to be remembered separately
// at each of those call sites. Returns whatever gainZoneXp() returns, so a
// caller that gets a truthy (>0) result knows to open the loot wheel --
// see src/zoneWheel.js's openZoneWheel().
export function gainSkillXp(field, amount) {
  state[field] += amount;
  return gainZoneXp(amount * ZONE_XP_SHARE);
}

Object.keys(STATIONS).forEach(function (id) { state.stations[id] = null; });

for (let i = 0; i < PLOT_COUNT; i++) {
  state.plots.push({
    crop: null, stage: 0, startedAt: 0, readyAt: null, waterProgress: 0,
    // Which fertilizer (a FERTILIZERS key in data.js) was applied this
    // cycle, or null -- the item's own name, not just a boolean, so
    // water() can read *which* growthMult applies once a second
    // fertilizer tier exists. Set by field.js's fertilize(), read by
    // water() when it starts the growth timer, cleared on
    // plant()/harvest reset.
    fertilizer: null,
  });
  // Already growing from the moment a save exists -- no cone to plant, no
  // can to fill. Base stageSeconds only (no level/time speed multiplier
  // yet -- both are 1x/neutral-ish this early anyway); every regrow after
  // this first one reads them fresh, same as fellTree() always has.
  const startedAt = Date.now();
  state.logPlots.push({
    startedAt: startedAt,
    readyAt: startedAt + TREES.pine.stageSeconds * 1000,
    chopHealth: null,
    // The one running chop swing, or null while idle -- {startedAt,
    // readyAt}, same shape state.mineSwing already uses. See logging.js's
    // startChop()/settleLogging().
    chopSwing: null,
  });
}
// Starts with exactly one Honey slot, idle -- see BEEHIVE_EXPAND_COST in
// data.js for buying more.
state.beehiveSlots.push(null);
// Every slot starts filled with its matching starter tool -- there's
// always exactly one of each in the starting bag, so they might as well
// already be in hand rather than making the player equip them manually.
// Equipping moves the item out of the bag (see inventory.js's equip()),
// so the starting bag above and this loop are two ends of the same
// transfer -- the item briefly exists in both only in that literal object,
// never in what the player actually sees.
const STARTER_TOOLS = {
  axe: "Wooden Axe", can: "Wooden Can", pick: "Wooden Pickaxe",
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
Object.keys(LOCATIONS).forEach(function (id) { state.zones[id] = { level: 1, xp: 0 }; });

// Wrapped because file:// origins can refuse storage -- the game still runs,
// it just won't remember anything.
export function save() {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({
      startedAt: state.startedAt,
      bag: state.bag, storage: state.storage, equipment: state.equipment,
      equipMigrated: state.equipMigrated,
      shards: state.shards, marks: state.marks, crowns: state.crowns, spires: state.spires,
      market: state.market,
      buildings: state.buildings, campfire: state.campfire,
      plots: state.plots, logPlots: state.logPlots, beehiveSlots: state.beehiveSlots,
      wateringCan: state.wateringCan,
      farmingXp: state.farmingXp, loggingXp: state.loggingXp,
      foragingXp: state.foragingXp, villager: state.villager,
      lastActiveAt: state.lastActiveAt,
      forage: state.forage, forageLevel: state.forageLevel,
      villagerNextTickAt: state.villagerNextTickAt,
      crafting: state.crafting,
      sowingXp: state.sowingXp, millingXp: state.millingXp,
      stonecuttingXp: state.stonecuttingXp, tanningXp: state.tanningXp,
      fishingXp: state.fishingXp, fishing: state.fishing,
      tailoringXp: state.tailoringXp,
      grindingXp: state.grindingXp,
      beekeepingXp: state.beekeepingXp,
      fletcherXp: state.fletcherXp, archeryXp: state.archeryXp, meleeXp: state.meleeXp,
      village: state.village,
      zones: state.zones,
      stations: state.stations,
      itemLevels: state.itemLevels,
      miningXp: state.miningXp,
      mineSwing: state.mineSwing,
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
    if (typeof data.marks === "number") state.marks = data.marks;
    if (typeof data.crowns === "number") state.crowns = data.crowns;
    if (typeof data.spires === "number") state.spires = data.spires;
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
      // A save from before villagers were zone-specific has no
      // homeLocation at all -- backfilled to Aerendell, the only place
      // Township has ever existed, rather than leaving it null and
      // silently forcing an existing villager to stop working everywhere.
      state.villager.homeLocation =
        typeof data.villager.homeLocation === "string" ? data.villager.homeLocation : "aerendell";
    }
    // The gap between this and now is what the "welcome back" popup
    // reports as away-time -- default to now (no gap) if this is somehow
    // missing, rather than a stale/undefined value producing a nonsense span.
    state.lastActiveAt = typeof data.lastActiveAt === "number" ? data.lastActiveAt : Date.now();
    // A save from before the single-tap Forage timer (2026-08-31) has no
    // `forage` at all -- only the old swing-based `forageProgress`, which
    // has nothing left to resume into (a partial swing was never worth
    // anything on its own). Discarded rather than migrated, same as
    // Logging's old crop-shape saves were.
    state.forage = (data.forage && typeof data.forage.readyAt === "number") ? data.forage : null;
    // A save from before forage mastery existed has no `forageLevel` at
    // all -- starts at level 0, same as a save that's never crafted a
    // given item has no `itemLevels` entry for it.
    if (data.forageLevel && typeof data.forageLevel.level === "number") {
      state.forageLevel = { level: data.forageLevel.level, clicks: data.forageLevel.clicks || 0 };
    }
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
    // >= PLOT_COUNT, not === -- a bought expansion plot (src/field.js's
    // buyPlot()) makes this array longer than the starting count forever
    // after, same as PLOT_COUNT itself never shrinking.
    if (Array.isArray(data.plots) && data.plots.length >= PLOT_COUNT) {
      state.plots = data.plots;
      // A save from before harvesting became a single instant tap
      // (2026-08-31) may have a plot mid-cut, with a real reapReadyAt
      // still set -- there's nothing left to resolve that into (no Scythe
      // timer any more), so it's just dropped; the crop itself is still
      // there and ripe, one tap away from harvesting the normal way.
      state.plots.forEach(function (p) { delete p.reapReadyAt; });
      // A save from before Fertilizer existed (2026-09-02) has no
      // `fertilizer` at all -- starts null, same as any other plot that's
      // simply never had one applied.
      state.plots.forEach(function (p) { if (typeof p.fertilizer !== "string") p.fertilizer = null; });
    }
    if (Array.isArray(data.logPlots) && data.logPlots.length >= PLOT_COUNT) {
      // A save from before Logging dropped seeds/watering (2026-08-30) has
      // `crop`/`stage`/`waterProgress` instead of this shape -- there's no
      // honest way to carry "half-watered" or "empty, no cone planted" over
      // into "always growing," so a save with the old shape just starts
      // every plot fresh (already growing) rather than half-migrating into
      // a state this version can't represent. `"crop" in p` is the
      // shape's own tell: the new shape never has that key at all.
      const isOldShape = data.logPlots.length > 0 && "crop" in data.logPlots[0];
      if (!isOldShape) {
        state.logPlots = data.logPlots;
        // A save from before chopping became an HP fight has `chopProgress`/
        // `chopReadyAt` instead -- there's no honest way to convert "2 of 4
        // timed chops landed" into HP, so a tree mid-chop on an old save
        // just comes back at full health rather than carrying over a
        // number that never meant the same thing.
        state.logPlots.forEach(function (p) {
          if (p.chopHealth === undefined) p.chopHealth = null;
          // A save from before chopping became a single timer (2026-08-31)
          // has no `chopSwing` at all -- nothing to resume, same as any
          // other mid-progress state this game doesn't try to carry
          // across a shape change (see mineSwing's own load guard above).
          if (!p.chopSwing || typeof p.chopSwing.readyAt !== "number") p.chopSwing = null;
        });
      }
    }
    if (Array.isArray(data.beehiveSlots) && data.beehiveSlots.length >= 1) {
      state.beehiveSlots = data.beehiveSlots.map(function (s) {
        return (s && typeof s.readyAt === "number") ? { startedAt: s.startedAt, readyAt: s.readyAt } : null;
      });
    }
    if (data.wateringCan && typeof data.wateringCan === "object") {
      state.wateringCan.charges = typeof data.wateringCan.charges === "number" ? data.wateringCan.charges : CAN_CAPACITY;
      state.wateringCan.refillAt = typeof data.wateringCan.refillAt === "number" ? data.wateringCan.refillAt : null;
    }
    if (typeof data.sowingXp === "number") state.sowingXp = data.sowingXp;
    if (typeof data.millingXp === "number") state.millingXp = data.millingXp;
    if (typeof data.stonecuttingXp === "number") state.stonecuttingXp = data.stonecuttingXp;
    if (typeof data.tanningXp === "number") state.tanningXp = data.tanningXp;
    if (typeof data.fishingXp === "number") state.fishingXp = data.fishingXp;
    if (typeof data.tailoringXp === "number") state.tailoringXp = data.tailoringXp;
    if (typeof data.grindingXp === "number") state.grindingXp = data.grindingXp;
    if (typeof data.beekeepingXp === "number") state.beekeepingXp = data.beekeepingXp;
    if (typeof data.fletcherXp === "number") state.fletcherXp = data.fletcherXp;
    if (typeof data.archeryXp === "number") state.archeryXp = data.archeryXp;
    if (typeof data.meleeXp === "number") state.meleeXp = data.meleeXp;
    if (data.fishing && typeof data.fishing === "object") {
      state.fishing.bait = typeof data.fishing.bait === "string" ? data.fishing.bait : null;
      state.fishing.trap = (data.fishing.trap && typeof data.fishing.trap.readyAt === "number")
        ? data.fishing.trap
        : null;
    }
    if (data.village && typeof data.village === "object") {
      state.village.food = typeof data.village.food === "number" ? data.village.food : 0;
      state.village.heat = typeof data.village.heat === "number" ? data.village.heat : 0;
      state.village.nextUpkeepAt = typeof data.village.nextUpkeepAt === "number" ? data.village.nextUpkeepAt : null;
      state.village.starved = data.village.starved === true;
    }
    if (data.zones && typeof data.zones === "object") {
      // Same "one key per LOCATIONS entry" backfill BUILDINGS' own load
      // already does -- a save from before a given zone existed (either
      // before zone leveling shipped at all, or before that specific
      // location was added) just starts it at level 1, same as the fresh-
      // save init loop above.
      Object.keys(LOCATIONS).forEach(function (id) {
        const z = data.zones[id];
        state.zones[id] = (z && typeof z.level === "number")
          ? { level: z.level, xp: typeof z.xp === "number" ? z.xp : 0 }
          : { level: 1, xp: 0 };
      });
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
    // A save from before digging became a single-tap timer (2026-08-31)
    // has no `mineSwing` at all -- only the old click-based
    // `swingProgress`, which has nothing left to resume into (a partial
    // swing was never worth anything on its own, same reasoning Foraging's
    // own old swing progress got dropped rather than migrated).
    state.mineSwing = (data.mineSwing && typeof data.mineSwing.readyAt === "number") ? data.mineSwing : null;
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
