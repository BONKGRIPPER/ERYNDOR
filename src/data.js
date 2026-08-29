// ================================================================ content
// Everything a designer would want to change lives up here. Pure data --
// nothing in this file touches the DOM or reads game state.

// The hub. Add a destination by adding a line here.
// `hub` controls whether a place shows as a card on the home screen. Inventory,
// Skills and Map live in the dock now instead (see DOCK_IDS below) -- they
// stay in this list because the dock still looks up their icon/name from
// here, they just don't get a card of their own anymore.
// Order here is also grid order (2 columns, read row by row) -- matches a
// hand-sketched layout (2026-08-28) roughly: Farm/Forest, Mining/Craft
// Bench, Furnace/Spinning Wheel, Camp Fire/Stone Cutter, then Combat and
// Sawmill tacked on after (both postdate that sketch). Furnace and Stone
// Cutter are real spots on the sketch with no station behind them yet --
// listed `ready: false` so they show up locked (same treatment Aerendell/
// Map already use) rather than either faking a working card or breaking
// the grid shape the sketch asked for.
export const PLACES = [
  { id: "home",      icon: "\u{1F3E1}", name: "Home",      note: "Back to the farmstead",  ready: true,  hub: false },
  { id: "field",     icon: "\u{1F331}", name: "Farm",      note: "Plant, water, harvest",  ready: true,  hub: true },
  { id: "logging",   icon: "\u{1FAB5}", name: "Forest",    note: "Plant, water, chop",     ready: true,  hub: true },
  { id: "mining",    icon: "\u{26CF}\u{FE0F}", name: "Mining", note: "Descend, dig, and bank your finds", ready: true, hub: true },
  { id: "craft",     icon: "\u{1F6E0}", name: "Craft Bench", note: "Tools from raw material", ready: true, hub: true },
  { id: "furnace",   icon: "\u{1F3ED}", name: "Furnace",   note: "Smelt ore into metal",   ready: false, hub: true },
  { id: "spinningWheel", icon: "\u{1F9F6}", name: "Spinning Wheel", note: "Turn flax into string", ready: true, hub: true },
  { id: "campfire",  icon: "\u{1F525}", name: "Campfire",  note: "Cook logs and berries",  ready: true,  hub: true },
  { id: "stoneCutter", icon: "\u{1FAA8}", name: "Stone Cutter", note: "Cut stone into blocks", ready: true, hub: true },
  { id: "tanningStation", icon: "\u{1F9F5}", name: "Tanning Station", note: "Turn hides into leather", ready: true, hub: true },
  { id: "combat",    icon: "\u{2694}\u{FE0F}", name: "Combat", note: "Fight what's out there", ready: true, hub: true },
  { id: "sawmill",       icon: "\u{1FA9A}", name: "Sawmill",        note: "Turn pine logs into pine planks", ready: true, hub: true },
  { id: "township",  icon: "\u{1F465}", name: "Township",  note: "Villagers and their upgrades", ready: true, hub: true },
  { id: "market",    icon: "\u{2696}\u{FE0F}", name: "Market", note: "Sell what you've gathered", ready: true, hub: false },
  { id: "inventory", icon: "\u{1F392}", name: "Inventory", note: "What you're carrying",   ready: true,  hub: false },
  { id: "skills",    icon: "\u{1F4D4}", name: "Journal",   note: "Skills and your collection", ready: true,  hub: false },
  { id: "town",      icon: "\u{1F3D8}", name: "Aerendell", note: "Villagers and trade",    ready: false, hub: false },
  { id: "map",       icon: "\u{1F5FA}", name: "Map",       note: "Beyond the farmstead",   ready: false, hub: false },
];
// Foraging isn't a PLACES entry any more -- it's one persistent button
// pinned above the dock (see index.html's #forage-bar and src/forage.js),
// not a destination you navigate to, so it never had a screen or a hub
// card to list here.

// Screens that exist, keyed to a #screen-<id> element and a #<id> URL hash.
export const SCREEN_IDS = [
  "home", "field", "logging", "mining", "combat", "inventory", "skills", "craft", "market", "campfire",
  "spinningWheel", "sawmill", "township", "stoneCutter", "tanningStation",
];

// The persistent bottom dock. Home first (left side) so there's always a
// one-tap way back to the hub from anywhere; Field, Logging and Crafting
// stay hub-only, or the dock turns into a second copy of the menu.
export const DOCK_IDS = ["home", "inventory", "market", "skills", "map"];

// One canonical icon per skill -- meant to be reused anywhere a skill needs
// representing, not just the Skills screen it was built for. Sprite-ready
// like every other icon in the game: drop a real
// assets/sprites/skills/<id>.png (see sprites.js's allSpriteKeys()) and it
// replaces this automatically, same useSprite() pipeline as tools/crops/
// items -- this emoji is the placeholder until then. Icons reuse the same
// glyph as that skill's home-hub card (PLACES above) where one exists, so
// a skill reads as the same symbol everywhere it shows up.
export const SKILLS = {
  farming:  { name: "Farming",  icon: "\u{1F331}" },
  logging:  { name: "Logging",  icon: "\u{1FAB5}" },
  foraging: { name: "Foraging", icon: "\u{1F9FA}" },
  mining:   { name: "Mining",   icon: "\u{26CF}\u{FE0F}" },
  combat:   { name: "Combat",   icon: "\u{2694}\u{FE0F}" },
  sowing:   { name: "Sowing",   icon: "\u{1F9F6}" },
  milling:  { name: "Woodcutting", icon: "\u{1FA9A}" },
  stonecutting: { name: "Stonecutting", icon: "\u{1FAA8}" },
  tanning: { name: "Tanner", icon: "\u{1F9F5}" },
};

export const PLOT_COUNT = 3;   // was 6 -- 2026-08-28, now that plots are a scrollable pill list, not a fixed grid

// ---------------------------------------------------------- watering & chop
//
// A plot needs WATER_TAPS_NEEDED separate taps of the watering can before
// it's "fully watered" and the actual growth timer starts -- one tap alone
// no longer does it. The can itself holds CAN_CAPACITY charges and drains
// one per tap; once empty, tapping the can (not a plot) starts a
// CAN_REFILL_MS wait before it's full again.
export const WATER_TAPS_NEEDED = 4;
export const CAN_CAPACITY = 4;
export const CAN_REFILL_MS = 5000;
// The Scythe is one tap, not several -- unlike watering, a ripe plot just
// starts a single HARVEST_MS timer the instant it's tapped (see field.js's
// startReap()/resolveHarvest()), same deadline-not-countdown rule as every
// other timer here, so a cut left running through a reload still finishes
// on schedule.
export const HARVEST_MS = 5000;

// Chopping is a straight HP fight now (2026-08-28), not a timed multi-tap
// swing -- every tap is instant and deals whatever the equipped axe's
// `damage` is (AXES below) straight off the ripe tree's own `health`
// (TREES below); the tree falls the instant health hits 0, same tap. No
// timer, no per-swing cave-in-style risk -- a better axe just chops
// faster, plainly. See logging.js's chopTree().
export const AXES = {
  "Wooden Axe": { damage: 1 },
  "Flint Axe":  { damage: 2 },
  "Stone Axe":  { damage: 3 },
};

// ------------------------------------------------------------------- time
//
// Real time, not simulated -- see src/time.js for the two clocks this
// drives. Night reads the player's actual device clock (local, 24h); the
// season calendar reads real elapsed time since the player's first-ever
// boot (state.startedAt, set once and never reset), not the calendar date
// -- so a save always begins in Spring on Day 1 no matter when in the real
// year it's started. One real week per season, four seasons per real
// month-long in-game year.
//
// Each season carries a `growth` multiplier per skill category -- one clear
// benefit, one clear drawback, not a spreadsheet of modifiers. More keys
// (forageYield, marketDemand, enemyDifficulty, ...) slot in here later
// exactly the same way, read by whichever system cares, same pattern as
// CATEGORIES/ZONE_DEMAND already use for the market.
export const SEASON_ORDER = ["spring", "summer", "autumn", "winter"];
export const SEASONS = {
  spring: {
    name: "Spring", icon: "\u{1F331}",
    growth: { farming: 1.15, logging: 1.0 },
    blurb: "Warm soil -- crops grow quickly.",
  },
  summer: {
    name: "Summer", icon: "\u{2600}\u{FE0F}",
    growth: { farming: 1.0, logging: 0.9 },
    blurb: "Long days favor the field over the woods.",
  },
  autumn: {
    name: "Autumn", icon: "\u{1F342}",
    growth: { farming: 0.9, logging: 1.15 },
    blurb: "Harvest winds down; timber comes easy.",
  },
  winter: {
    name: "Winter", icon: "\u{2744}\u{FE0F}",
    growth: { farming: 0.6, logging: 0.85 },
    blurb: "Cold slows everything in the ground.",
  },
};

// Local device hours, 24h clock. Night spans midnight (20 -> 6), so the
// range check in time.js handles the wraparound rather than assuming
// start < end.
export const NIGHT_START_HOUR = 20;
export const NIGHT_END_HOUR = 6;
export const NIGHT_GROWTH_MULT = 0.5;

// A crop needs `waters` waterings. Each one starts a timer of `stageSeconds`;
// the plot is ripe once the last stage finishes. Harvest hands back a seed as
// well as the crop, so the loop can keep running. Both are single-stage for
// now -- `stageSeconds` is the whole grow time, start to ripe.
export const CROPS = {
  // gives no longer includes the seed back (2026-08-28) -- seeds/cones are
  // meant to come from Foraging only, not regrow themselves from what they
  // planted, or the loop never actually needs the forage pool at all.
  redBerries: {
    name: "Red Berries", seed: "Red Berries Seeds", tint: "#c23b52",
    waters: 1, stageSeconds: 120, xp: 26,
    gives: { "Red Berries": 3 },
  },
  flax: {
    name: "Flax", seed: "Flax Seeds", tint: "#8fb3d9",
    waters: 1, stageSeconds: 240, xp: 50,
    gives: { "Flax": 3 },
  },
};

// Same shape as CROPS, one tree so far. Logging is Farming's mirror: plant
// a cone, water it, chop it once ripe -- the only real difference is the
// tool ("chop" instead of "scythe") and that it feeds its own skill.
// Gives "Pine Logs", not a flat "Logs" -- there'll be more tree/log tiers
// later (and more plank tiers to match, see STATIONS.sawmill below), so the
// item name is tree-specific from the start rather than a generic
// placeholder that'd need renaming everywhere once a second tree exists.
export const TREES = {
  // Same rule as CROPS above -- no cone back on felling; Foraging is the
  // only source of what plants a new one.
  pine: {
    name: "Pine", seed: "Pine Cones", tint: "#4a6b3a",
    waters: 1, stageSeconds: 180, xp: 34, health: 24,
    gives: { "Pine Logs": 3 },
  },
};

export const TINTS = {
  "Red Berries Seeds": "#c23b52", "Red Berries": "#c23b52",
  "Flax Seeds": "#8fb3d9", "Flax": "#8fb3d9",
  "Pine Cones": "#4a6b3a", "Pine Logs": "#6b4a2f",
  "Berries": "#c85a6e", "Flint": "#9098a3", "Sticks": "#8a6a45",
  "Flint Axe": "#c9a06b", "Flint Pickaxe": "#a98c5c",
  "Wooden Pickaxe": "#8a6a45", "Stone Pickaxe": "#7d7d76", "Stone Axe": "#7d7d76",
  "Wooden Axe": "#8a6a45", "Wooden Scythe": "#8a6a45", "Wooden Can": "#6b8a9e",
  "Flint Dagger": "#a3a8ad", "Wooden Buckler": "#8a6a45",
  "Padded Vest": "#9c7a54", "Stone Plate": "#7d7d76",
  "Charcoal": "#3a3632", "Cooked Berries": "#8f3347",
  "String": "#d9cba3", "Pine Planks": "#b98552",
  "Stone": "#8b8b85", "Coal": "#2b2622", "Iron Ore": "#a56a52",
  "Silver Ore": "#c7ccd6", "Gold Ore": "#e0b23c", "Raw Gem": "#7f4fd1",
  "Tin Ore": "#9fb0ac", "Copper Ore": "#c17a4e", "Platinum Ore": "#d8dde6",
  "Scorn": "#3a1a2e", "Enchanted Shard": "#63e0d6",
  "Basalt": "#4a4a52", "Amethyst": "#8f5fd1", "Emerald": "#2f9e5c", "Diamond": "#cdeaf0",
  "Bones": "#d8cfc0", "Feathers": "#eae0c8", "Raw Poultry": "#d9a3a0",
  "Animal Hide": "#8a6242", "Raw Beef": "#a8434a", "Leather": "#7a5233",
  "Wool": "#e8e2d4", "Raw Mutton": "#c25a5f", "Cloth": "#cfc7ae",
  "Stone Block": "#9a9a92", "Basalt Block": "#55555c",
};

// A second, independent gather loop -- no seeds, no growth stages, just tap
// and roll. Swing-based now (2026-08-28), same shape as Mining's dig: every
// tap is instant and advances progress by one of FORAGE_CLICKS_PER_SWING,
// no per-click timer of its own. Only the swing's last tap actually
// resolves anything -- an item rolled from the current zone's own pool the
// moment it resolves, not chosen by the player. Chances within a zone are
// meant to sum to 1; a zone with no pool falls back to the last entry
// rather than ever giving nothing.
export const FORAGE_CLICKS_PER_SWING = 5;
export const FORAGE_POOLS = {
  aerendell: [
    { item: "Red Berries Seeds", chance: 0.10 },
    { item: "Pine Cones",        chance: 0.10 },
    { item: "Sticks",            chance: 0.40 },
    { item: "Flint",             chance: 0.40 },
  ],
};

// Foraging XP, first pass -- one flat amount per completed gather, same
// "small flat amount" shape as Farming's WATER_XP. There's no speed curve
// tied to level any more (see FORAGE_CLICKS_PER_SWING above) -- the
// player's own tapping speed is the speed, same as Mining. Level 100 is
// still a cap for display purposes -- xpToNext() in skills.js is uncapped
// by itself, foraging is just the first skill that actually stops
// mattering past a point.
export const FORAGE_XP = 8;
export const FORAGE_MAX_LEVEL = 100;

// Unlocked at VILLAGER_LEVEL: a one-time Shards purchase (state.villager,
// see state.js) that keeps tapping the forage swing on its own, once every
// VILLAGER_TICK_MS -- the same shared swingProgress the player's own taps
// add to, so tapping the pill while a villager works speeds the same swing
// up rather than running a separate parallel gather. A villager working
// completely alone finishes one swing every
// FORAGE_CLICKS_PER_SWING * VILLAGER_TICK_MS (12.5s at the base rate); an
// actively-tapping player shortens that by however many taps they land
// themselves. Cost is a first-pass number, not balanced. Hiring and
// upgrading both happen from the Township screen (src/township.js) now,
// not an inline button on the forage bar.
export const VILLAGER_LEVEL = 3;   // was 10 -- 2026-08-28
export const VILLAGER_COST = 250;
export const VILLAGER_TICK_MS = 2500;
// The first villager upgrade -- a flat multiplier on VILLAGER_TICK_MS,
// applied fresh to every tick (not baked in once), once bought
// (state.villager.fastHands). Only one tier exists so far; Township is
// built to show a list, not one fixed slot, so more can slot in later.
export const VILLAGER_UPGRADE_COST = 400;
export const VILLAGER_UPGRADE_MULT = 0.75;
// Below this, "away" isn't meaningfully different from just watching the
// villager work -- the normal ~200ms tick gap (and even a single forage
// cycle, as short as 1000ms) both land well under it. main.js's
// reportForageCatchup() only shows the full "welcome back" sheet past this
// threshold; anything shorter gets the same small in-pill flash a
// villager-less gather already shows.
export const AWAY_POPUP_MS = 3000;

// ------------------------------------------------------------ item levels
//
// Independent per-output-item crafting mastery -- separate from a
// station's own skill level (which speeds up the whole station), this
// tracks how many times THIS SPECIFIC item has actually been produced,
// anywhere it's made, and speeds up just that item the more it's crafted.
// Every ITEM_LEVEL_CRAFTS_NEEDED crafts advances the item's own level by
// one; each level knocks ITEM_LEVEL_SPEED_MULT off its own time,
// compounding -- level 2 is 0.9 x 0.9 = 81% of the base time, not 80%.
// "For now 10%" per the brief; see src/itemLevels.js for the actual math.
export const ITEM_LEVEL_CRAFTS_NEEDED = 10;
export const ITEM_LEVEL_SPEED_MULT = 0.9;

// A third loop, same shape as foraging (tap, wait, get one unit) but with a
// cost: the materials come out of the bag the moment a craft starts, not
// when it finishes -- same rule Field already uses for seeds, so running out
// mid-craft can't happen. `sub` isn't stored; the pill shows the cost while
// idle and swaps to "Crafting..." while running, computed from `cost` so the
// two never drift out of sync.
export const CRAFT_MS = 15000;
export const RECIPES = {
  flintAxe:     { name: "Flint Axe",     cost: { "Flint": 20, "Sticks": 20 } },
  flintPickaxe: { name: "Flint Pickaxe", cost: { "Flint": 20, "Sticks": 20 } },
  stonePickaxe: { name: "Stone Pickaxe", cost: { "Stone": 15, "Pine Logs": 10 } },
  stoneAxe:     { name: "Stone Axe",     cost: { "Stone": 15, "Pine Logs": 10 } },
  flintDagger:  { name: "Flint Dagger",  cost: { "Flint": 15, "Sticks": 10 } },
  woodenBuckler:{ name: "Wooden Buckler", cost: { "Sticks": 20, "Stone": 10 } },
  paddedVest:   { name: "Padded Vest",   cost: { "Sticks": 20, "Flint": 15 } },
  stonePlate:   { name: "Stone Plate",   cost: { "Stone": 25, "Pine Logs": 15 } },
};

// ------------------------------------------------------------------ equip
// Which bag items can go in which equipment slot, and where each slot
// renders on the Inventory screen's Equipment page (`group: "tool"` down
// the left column, `group: "gear"` on the body grid on the right -- see
// src/inventory.js). The Axe and Scythe slots still have no mechanical
// effect -- there's only one tier of each so far, nothing to differentiate
// -- but the Pickaxe slot matters (src/mining.js reads it for swing speed/
// risk/depth), and so does the gear grid (src/combat.js reads it, see
// below). Add a slot by adding an entry here and pointing items at its id.
//
// Helm, Legs and Fishing Rod are real slots on the Equipment page's layout
// with no item that can fill them yet -- same "real spot, nothing behind
// it yet" treatment the Furnace/Stone Cutter hub cards use, not an
// oversight. Armor split from one slot into Chest specifically (not a
// generic "armor" slot) because Helm and Legs are real, separate spots on
// the sketch this layout is based on, even though only Chest has armor
// items to put in it today.
//
// Left and Right Hand are interchangeable, on purpose: a weapon or a
// shield can go in *either* one (EQUIPMENT maps them to the shared "arm"
// category below, not a fixed hand), so dagger-and-buckler or
// dagger-in-either-hand both just work. A two-handed weapon (`twoHanded:
// true` on its WEAPONS entry -- see below) equipped in one hand blocks the
// other, enforced in src/inventory.js, not by there being only one slot.
export const EQUIP_SLOTS = [
  { id: "axe",     name: "Axe",          group: "tool" },
  { id: "pick",    name: "Pickaxe",      group: "tool" },
  { id: "can",     name: "Watering Can", group: "tool" },
  { id: "scythe",  name: "Scythe",       group: "tool" },
  { id: "fishing", name: "Fishing Rod",  group: "tool" },
  { id: "food",    name: "Food",         group: "tool" },
  { id: "helm",     name: "Helm",       group: "gear" },
  { id: "armLeft",  name: "Left Hand",  group: "gear" },
  { id: "chest",    name: "Chest",      group: "gear" },
  { id: "armRight", name: "Right Hand", group: "gear" },
  { id: "legs",     name: "Legs",       group: "gear" },
];
export const EQUIPMENT = {
  "Wooden Axe": "axe",
  "Flint Axe": "axe",
  "Stone Axe": "axe",
  "Wooden Scythe": "scythe",
  "Wooden Can": "can",
  "Wooden Pickaxe": "pick",
  "Flint Pickaxe": "pick",
  "Stone Pickaxe": "pick",
  // "arm" is a wildcard -- src/inventory.js's equip picker offers these to
  // *either* armLeft or armRight, whichever the player opened.
  "Flint Dagger": "arm",
  "Wooden Buckler": "arm",
  "Padded Vest": "chest",
  "Stone Plate": "chest",
  // Anything with a heal value in FOODS is also equippable here -- Combat's
  // Eat button consumes whatever's equipped in this slot, not a fixed item,
  // which is the whole reason Food is a real equip slot instead of Combat
  // just reading the bag directly.
  "Berries": "food",
  "Cooked Berries": "food",
};

// Same idea as PICKAXES: capacity lives on the equipped item, not a flat
// constant, so a better can down the line is a matter of adding a tier here
// and letting canmeter.js pick it up automatically -- nothing about Farm or
// Logging needs to change. Only one tier exists yet; its capacity matches
// the CAN_CAPACITY every can used to share before this was per-item.
export const CANS = {
  "Wooden Can": { capacity: CAN_CAPACITY },
};

// ------------------------------------------------------------- pickaxes
//
// Balanced against the mining spreadsheet (2026-08-28) rather than invented
// numbers -- digging is now swing-based, not one-tap-one-result:
//   clicksPerSwing -- how many taps of Dig it takes to complete one swing.
//     Every tap registers instantly and fills the pill by 1/clicksPerSwing
//     -- there's no per-tap timer, the player can tap as fast as they
//     physically can. A worse pickaxe isn't slower per tap, it just demands
//     more of them, the same "clearly worse, not just weaker" feel the old
//     Wooden Pickaxe's hazard ramp had.
//   riskPerSwing -- a FLAT cave-in chance rolled once per completed swing,
//     not scaled by depth. The spreadsheet's "chance to fail at max depth"
//     column is just riskPerSwing x (maxDepth / depthPerSwing) -- the
//     expected number of swings across a full run times the risk each one
//     carries -- confirmed against every row, so depth itself no longer
//     makes a swing more dangerous, only more swings do.
//   depthPerSwing -- meters gained on a successful swing.
//   maxDepth -- meters, hard wall same as before: past it, digging is
//     blocked outright, not just riskier.
//
// Wooden, Flint and Stone all cap at the same 100m (the whole "Tier 1"
// band) -- they differ in how efficiently they get through it, not how
// deep they reach. Reaching past 100m needs a Tier 2 pickaxe (Scrap
// Metal), which needs a material this game can't produce yet (no
// smelting/alloying station, no second zone) -- so Scrap Metal through
// Scorn exist below as real, balanced data with nothing that can obtain
// them yet, same "next pass, not this one" rule the old era table used.
export const PICKAXES = {
  "Wooden Pickaxe": { maxDepth: 100, clicksPerSwing: 12, riskPerSwing: 0.10, depthPerSwing: 5 },
  "Flint Pickaxe":  { maxDepth: 100, clicksPerSwing: 6,  riskPerSwing: 0.10, depthPerSwing: 10 },
  "Stone Pickaxe":  { maxDepth: 100, clicksPerSwing: 6,  riskPerSwing: 0.10, depthPerSwing: 15 },
  // Not craftable yet -- no Scrap Metal, Bronze, Iron ingot, Gold bar or
  // Scorn material exists to make them from.
  "Scrap Metal Pickaxe": { maxDepth: 400,  clicksPerSwing: 4, riskPerSwing: 0.05, depthPerSwing: 20 },
  "Bronze Pickaxe":      { maxDepth: 1000, clicksPerSwing: 4, riskPerSwing: 0.04, depthPerSwing: 25 },
  "Iron Pickaxe":        { maxDepth: 2500, clicksPerSwing: 4, riskPerSwing: 0.04, depthPerSwing: 50 },
  "Gold Pickaxe":        { maxDepth: 3000, clicksPerSwing: 2, riskPerSwing: 0.04, depthPerSwing: 100 },
  "Diamond Pickaxe":     { maxDepth: 5000, clicksPerSwing: 2, riskPerSwing: 0.02, depthPerSwing: 100 },
  "Scorn Pickaxe":       { maxDepth: 5000, clicksPerSwing: 1, riskPerSwing: 0.01, depthPerSwing: 100 },
};

// -------------------------------------------------------------- combat gear
//
// src/combat.js reads all of these every fight rather than one item
// governing everything:
//   Weapon -- atkMin/atkMax, the damage roll on Attack. Lives in whichever
//     of the Left/Right Hand slots holds it (either works -- see
//     EQUIPMENT's "arm" wildcard above). No weapon equipped falls back to
//     COMBAT_UNARMED, same "fall back rather than block the screen" rule
//     mining.js uses for an unequipped pickaxe. `twoHanded: true` means
//     equipping it fills both hand slots at once -- src/inventory.js is
//     what actually blocks the other hand, this flag is just the data it
//     reads to know which weapons need to. No weapon is two-handed yet;
//     the flag exists so one can be added without new equip-slot plumbing.
//   Chest  -- `defense` stacks with the shield's onto every incoming hit,
//     and `recoveryMult` scales COMBAT_BASE_RECOVERY_MS -- this is the
//     tradeoff the brief asked for: Stone Plate blocks more but leaves you
//     open longer between actions (1.35x recovery) than the lighter Padded
//     Vest (0.9x, faster than going unarmored). Helm and Legs would work
//     the same way if/when armor exists for them.
//   Shield -- more `defense`, plus `block`, an extra cut applied only when
//     Defend is used (on top of the flat halving) -- a shield's whole
//     reason to exist is making Defend hit harder, not just adding a flat
//     defense number a heavier armor could also give you. Lives in
//     whichever hand slot holds it, same as a weapon.
//   Food   -- see FOODS below. Equipped, not just carried, so Eat always
//     knows exactly what to consume without guessing at the bag.
export const COMBAT_UNARMED = { atkMin: 1, atkMax: 1 };   // was 2-4 -- 2026-08-28
export const COMBAT_BASE_DEFENSE = 1;
export const COMBAT_BASE_RECOVERY_MS = 1000;   // was 2200 -- 2026-08-28
export const COMBAT_TICK_MS = 200;
export const COMBAT_XP = 20;

export const WEAPONS = {
  "Flint Dagger": { atkMin: 4, atkMax: 8, twoHanded: false },
};
export const ARMORS = {
  "Padded Vest": { defense: 2, recoveryMult: 0.9 },
  "Stone Plate": { defense: 6, recoveryMult: 1.35 },
};
export const SHIELDS = {
  "Wooden Buckler": { defense: 2, block: 0.15 },
};

// heal: how many HP src/combat.js's Eat action restores. Anything with a
// heal value here is meant to also appear in EQUIPMENT pointed at the
// "food" slot -- the two lists are meant to be added to together.
export const FOODS = {
  "Berries": { heal: 6 },
  "Cooked Berries": { heal: 15 },
};

// Keyed rather than an array (like STATIONS/PICKAXES) since nothing about
// picking a fight needs an ordering yet -- the idle screen just lists
// every entry as its own card (see combat.js's buildCombatIdle()).
// `drops` is optional and works like CROPS/TREES' own `gives` -- every
// entry in it is granted once, on a win, via gainItem(); an enemy with no
// drops (Grey Wolf, so far) just doesn't have the field.
export const ENEMIES = {
  chicken: {
    name: "Chicken", icon: "\u{1F414}", note: "Pecking around the coop", level: 1,
    hp: 5, atkMin: 1, atkMax: 3, def: 0, attackMs: 1000, shardReward: 3,
    drops: { "Bones": 1, "Feathers": 1, "Raw Poultry": 1 },
  },
  highlandCow: {
    name: "Highland Cow", icon: "\u{1F404}", note: "Grazing at the field's edge", level: 2,
    hp: 10, atkMin: 2, atkMax: 3, def: 0, attackMs: 2000, shardReward: 4,
    drops: { "Animal Hide": 1, "Raw Beef": 1, "Bones": 1 },
  },
  highlandSheep: {
    name: "Highland Sheep", icon: "\u{1F411}", note: "Grazing at the field's edge", level: 2,
    hp: 8, atkMin: 2, atkMax: 3, def: 0, attackMs: 2000, shardReward: 3,
    drops: { "Wool": 1, "Raw Mutton": 1, "Bones": 1 },
  },
  greyWolf: {
    name: "Grey Wolf", icon: "\u{1F43A}", note: "Blocks the path north of the farmstead", level: 3,
    hp: 40, atkMin: 8, atkMax: 14, def: 3, attackMs: 3000, shardReward: 15,
  },
};
export const COMBAT_PLAYER_MAX_HP = 10;   // was 50 -- 2026-08-28
// A failed Flee attempt just costs the turn (the normal recovery cooldown,
// same as any other action) -- a success ends the fight on the spot with
// `state.combat.over = "fled"`, a third outcome alongside "won"/"lost" that
// grants no reward but also isn't a loss (no penalty exists for losing yet
// either, but the distinction is there for whenever one does).
export const FLEE_CHANCE = 0.5;

// ------------------------------------------------------------------ market
//
// One category per skill, one demand multiplier per category per zone --
// not per item, so balancing a whole zone is a handful of numbers, not one
// per item. Aerendell is neutral (1.0) across the board for now; there's
// nothing to be scarce or abundant *relative to* until a second zone
// exists, so no asymmetry is invented here.
export const CATEGORIES = {
  "Red Berries Seeds": "farming", "Red Berries": "farming",
  "Flax Seeds": "farming", "Flax": "farming",
  "Pine Cones": "logging", "Pine Logs": "logging",
  "Berries": "foraging", "Flint": "foraging", "Sticks": "foraging",
  "Flint Axe": "crafting", "Flint Pickaxe": "crafting", "Stone Pickaxe": "crafting",
  "Charcoal": "cooking", "Cooked Berries": "cooking",
  "String": "sowing", "Pine Planks": "milling",
  "Stone": "mining", "Coal": "mining", "Iron Ore": "mining",
  "Silver Ore": "mining", "Gold Ore": "mining", "Raw Gem": "mining",
  "Tin Ore": "mining", "Copper Ore": "mining", "Platinum Ore": "mining",
  "Scorn": "mining", "Enchanted Shard": "mining",
  "Basalt": "mining", "Amethyst": "mining", "Emerald": "mining", "Diamond": "mining",
  "Wooden Pickaxe": "crafting", "Wooden Axe": "crafting", "Stone Axe": "crafting",
  "Wooden Scythe": "crafting", "Wooden Can": "crafting",
  "Flint Dagger": "crafting", "Wooden Buckler": "crafting",
  "Padded Vest": "crafting", "Stone Plate": "crafting",
  "Stone Block": "stonecutting", "Basalt Block": "stonecutting",
  "Bones": "combat", "Feathers": "combat", "Raw Poultry": "combat",
  "Animal Hide": "combat", "Raw Beef": "combat",
  "Wool": "combat", "Raw Mutton": "combat",
  "Leather": "tanning", "Cloth": "sowing",
};

// Base sell value in Shards, before demand and stock are applied -- also
// what a BUYABLE item costs at zero stock, since buy and sell share the one
// curve (see BUYABLE below). Where a specific buy price was given, it's set
// as BASE_VALUE directly (buying at empty stock is exactly BASE_VALUE);
// the matching sell price falls out of the same curve once stock builds up
// toward MARKET_FLOOR rather than being a second hard-coded number, so a
// stated "sells for X" is what that item lands on once its stock is fairly
// deep, not a fixed price on every sale.
export const BASE_VALUE = {
  "Red Berries Seeds": 10, "Red Berries": 5,
  "Flax Seeds": 10, "Flax": 5,
  "Pine Cones": 10, "Pine Logs": 10,
  "Berries": 7, "Flint": 5, "Sticks": 5,
  "Flint Axe": 50, "Flint Pickaxe": 50, "Stone Pickaxe": 90, "Stone Axe": 90,
  "Wooden Pickaxe": 1, "Wooden Axe": 1, "Wooden Scythe": 1, "Wooden Can": 1,
  "Flint Dagger": 45, "Wooden Buckler": 40, "Padded Vest": 55, "Stone Plate": 95,
  "Charcoal": 8, "Cooked Berries": 7,
  "String": 6, "Pine Planks": 9,
  // Stone/Coal/Copper/Tin/Iron/Gold match the mining spreadsheet's Worth
  // column directly (2026-08-28 rebalance); Silver/Platinum/Raw Gem keep
  // their old values -- they're zone-locked content the spreadsheet
  // doesn't cover yet, not touched by this pass.
  "Stone": 5, "Coal": 1, "Iron Ore": 15,
  "Silver Ore": 12, "Gold Ore": 30, "Raw Gem": 60,
  "Tin Ore": 15, "Copper Ore": 10, "Platinum Ore": 40,
  "Basalt": 10, "Amethyst": 50, "Emerald": 75, "Diamond": 50,
  "Scorn": 80, "Enchanted Shard": 100,
  "Stone Block": 20, "Basalt Block": 45,
  "Bones": 4, "Feathers": 3, "Raw Poultry": 8,
  "Animal Hide": 12, "Raw Beef": 14, "Leather": 22,
  "Wool": 10, "Raw Mutton": 12, "Cloth": 18,
};

export const ZONE_DEMAND = {
  aerendell: {
    farming: 1, logging: 1, foraging: 1, crafting: 1, cooking: 1,
    sowing: 1, milling: 1, mining: 1, stonecutting: 1, combat: 1, tanning: 1,
  },
};

// What Aerendell's market actually stocks to sell *to* the player. Priced
// by the same curve as selling, off the same stock number: buying draws
// stock down (price climbs), selling pushes it up (price falls) -- one
// shared number, not a separate buy/sell spread invented on top of it.
export const BUYABLE = [
  "Red Berries Seeds", "Flax Seeds", "Pine Cones",
  "Sticks", "Flint", "Pine Logs", "Berries", "Flint Axe", "Flint Pickaxe",
];

// The anti-farming curve: price = BASE_VALUE * demand * saturation(stock).
// saturation is 1 at zero stock and decays toward MARKET_FLOOR (never zero
// -- always worth *something*) as stock rises. MARKET_K sets how fast: at
// stock == MARKET_K, saturation is roughly halfway to the floor.
export const MARKET_FLOOR = 0.15;
export const MARKET_K = 8;

// Stock decays back toward zero on its own, so a market you've flooded
// recovers if you leave it alone rather than staying dead forever. Halves
// every MARKET_HALF_LIFE_MS of real time -- computed from a stored
// timestamp, not a background tick, same deadline-not-countdown rule as
// everything else that grows or decays in this game.
export const MARKET_HALF_LIFE_MS = 3 * 60 * 1000;

// ---------------------------------------------------------------- buildings
// A one-time cost, paid once, unlocks a permanent station. Only the
// campfire exists so far, but the registry shape matches everything else
// in this file -- a second building is one more entry, not a new system.
// The hub card for a building only appears once it's built; before that,
// a separate build-prompt card shows the cost instead (see buildings.js).
export const BUILDINGS = {
  campfire: {
    name: "Campfire",
    cost: { "Sticks": 10, "Flint": 5 },
  },
  spinningWheel: {
    name: "Spinning Wheel",
    cost: { "Sticks": 15, "Pine Logs": 5 },
  },
  sawmill: {
    name: "Sawmill",
    cost: { "Sticks": 15, "Flint": 10 },
  },
  stoneCutter: {
    name: "Stone Cutter",
    cost: { "Stone": 25, "Sticks": 10 },
  },
  tanningStation: {
    name: "Tanning Station",
    cost: { "Sticks": 15, "Animal Hide": 5 },
  },
  township: {
    name: "Township",
    cost: { "Stone": 20, "Pine Logs": 20 },
  },
};

// -------------------------------------------------------------- stations
// Single-recipe, build-once conversion stations -- the Spinning Wheel
// (Flax -> String) and the Sawmill (Logs -> Planks) share one generic
// screen/handler (src/stations.js) rather than two near-identical files,
// since both were built in the same pass and the shape is identical: one
// pill, tap to start, the input leaves the bag the instant it starts (same
// "spend on commit" rule Crafting already uses). Each has its own skill
// with Farming/Logging's continuous per-level speed curve (GROWTH_PER_LEVEL
// in skills.js) rather than Foraging's milestone table -- these are meant
// to feel like Farming/Logging's cousins, not Foraging's. `ms`/`xp` are
// first-pass numbers, not a balanced economy. `inputQty` (stations.js falls
// back to 1 when it's absent) is how many of `input` one cycle actually
// consumes -- the Sawmill is the first station that needs more than one.
export const STATIONS = {
  spinningWheel: {
    screenTitle: "Spinning Wheel", screenSub: "Turn flax into string",
    actionName: "Spin String",
    input: "Flax", output: "String", ms: 8000, xp: 10,
    skillXp: "sowingXp", skillName: "Sowing",
  },
  // Shares the Spinning Wheel's own screen and skill -- same "second
  // recipe, one screen" shape stoneCutter/basaltCutter established, just
  // with wool instead of stone.
  clothSpinner: {
    screenTitle: "Spinning Wheel", screenSub: "Turn flax into string",
    actionName: "Cloth",
    cost: { "Wool": 4 }, output: "Cloth", ms: 10000, xp: 12,
    skillXp: "sowingXp", skillName: "Sowing",
  },
  sawmill: {
    screenTitle: "Sawmill", screenSub: "Turn pine logs into pine planks",
    actionName: "Pine Planks",
    input: "Pine Logs", inputQty: 3, output: "Pine Planks", ms: 10000, xp: 10,
    skillXp: "millingXp", skillName: "Woodcutting",
  },
  // Two recipes sharing one screen -- the first STATIONS pair to need
  // this. `cost` (a full item->qty map, same shape RECIPES already uses)
  // is the general form; the single-input stations above still work
  // unchanged since stations.js's costFor() falls back to
  // {[input]: inputQty} whenever `cost` itself isn't set. Both recipes
  // grant the same Stonecutting skill, so leveling either one speeds up
  // both (see stations.js's effectiveMs()).
  stoneCutter: {
    screenTitle: "Stone Cutter", screenSub: "Cut stone into blocks",
    actionName: "Stone Block",
    cost: { "Stone": 3 }, output: "Stone Block", ms: 10000, xp: 10,
    skillXp: "stonecuttingXp", skillName: "Stonecutting",
  },
  basaltCutter: {
    screenTitle: "Stone Cutter", screenSub: "Cut stone into blocks",
    actionName: "Basalt Block",
    cost: { "Stone Block": 1, "Basalt": 3 }, output: "Basalt Block", ms: 10000, xp: 12,
    skillXp: "stonecuttingXp", skillName: "Stonecutting",
  },
  tanningStation: {
    screenTitle: "Tanning Station", screenSub: "Turn hides into leather",
    actionName: "Leather",
    cost: { "Animal Hide": 3 }, output: "Leather", ms: 10000, xp: 10,
    skillXp: "tanningXp", skillName: "Tanner",
  },
};

// ----------------------------------------------------------------- cooking
// Fuel keeps the fire lit; the cooked item is what it's lit *for*. Both
// have to be chosen before the timer starts -- see campfire.js. Fuel is
// consumed one-for-one regardless of which of the three is used; none of
// them burn hotter or longer than another yet.
export const COOK_MS = 10000;
export const FUELS = ["Sticks", "Pine Logs", "Charcoal"];
export const COOKABLES = {
  "Pine Logs": { gives: "Charcoal" },
  "Berries": { gives: "Cooked Berries" },
};

// ------------------------------------------------------------------ mining
//
// A default skill, not a buildable station -- available from the start,
// like Foraging, but with a real screen since it needs one (depth, a
// carried pouch, a bank decision) that a single pill can't show. This is
// the first genuine risk/reward loop in the game: every SWING (not every
// tap -- see PICKAXES' clicksPerSwing) either goes well (depth advances by
// depthPerSwing, loot rolled from the current depth's pool, XP) or triggers
// a cave-in that ends the trip and wipes whatever's been carried since the
// last time the player actively chose to surface. Nothing is safe until
// banked -- that tension *is* the game, not a side effect of one.
//
// Mining XP/levels are purely a display for now (Skills screen), same as
// Combat's -- clicks are instant (see PICKAXES' comment), so there's no
// per-click speed left for a level bonus to multiply; a future pass could
// hang something else off it (lower risk, bonus depth) if that's wanted.
// The pickaxe (see PICKAXES above) is what makes going deeper survivable or
// even possible at all -- riskPerSwing is a flat cave-in chance per swing
// (not scaled by depth, see PICKAXES' comment), and maxDepth is a hard wall
// on top of that.
export const MINE_XP = 12;
export const MINE_HAZARD_MAX = 0.90;
// Surfacing banks everything the instant it's tapped -- no wait. What it
// costs instead is a cooldown before the *next* dig can start, scaled to
// how deep the trip actually reached (2026-08-28: flat 5s -> 1s per 10m of
// depth) -- climbing back up from 200m is a bigger deal than climbing back
// up from 20m. A cave-in's "death recovery" is the same formula, just
// doubled -- it doesn't just wipe the pouch, it shakes the player up worse
// than a clean surface does. Both computed in mining.js's cooldownFor(),
// not stored as flat constants any more.
export const MINE_SURFACE_MS_PER_10M = 1000;
export const MINE_CAVEIN_MULT = 2;

// Balanced against the mining spreadsheet (2026-08-28), replacing the old
// hard-exclusive depth eras with a cumulative weighted pool: everything
// whose minDepth (and maxDepth, for the few bounded ones like Basalt) the
// current depth falls inside is in play at once, weighted by rarity
// (`weight`, roughly Common=100/Uncommon=40/Rare=15 from the sheet) rather
// than each band replacing the last. mining.js's poolFor() builds this
// dynamically per depth rather than storing it pre-split, since materials
// now overlap instead of handing off.
//
// Only the materials the spreadsheet marks Zone Lock "All" or "Leth-Eiren"
// (this game's starting/only zone so far) are listed -- everything locked
// to Keth-Maral, Elk-Vael, Rath-Kesh, Khar-Duun or Bryndell (Limestone,
// Granate, Soap Stone, Scorn, Ruby, Sapphire, Topaz, Circon, Salt, Remnant
// Salt) is real spreadsheet content with nowhere to put it yet, same "next
// pass" rule PICKAXES uses for Scrap Metal onward -- add it once those
// zones exist rather than faking availability now. minDepth for each
// "Mine Depth Tier N+" material is set to the maxDepth of tier (N-1)'s
// pickaxes -- the depth where that tier stops being reachable is exactly
// where the next tier's material starts showing up.
// `yield` is how many of that material one successful swing actually banks
// -- defaults to 1 (mining.js's yieldFor() falls back to that) so most
// entries don't have to spell out the common case. Stone/Coal/Basalt are
// the common, low-value finds a player swings through constantly, so they
// come back 3 at a time; every gemstone (Amethyst/Emerald/Diamond) stays
// at the implicit 1, on purpose, so a rare find never feels diluted.
export const MINE_MATERIALS = {
  "Stone":      { minDepth: 0,    weight: 100, yield: 3 },
  "Coal":       { minDepth: 0,    weight: 100, yield: 3 },
  "Basalt":     { minDepth: 0, maxDepth: 100, weight: 100, yield: 3 },
  "Amethyst":   { minDepth: 0,    weight: 15 },
  "Copper Ore": { minDepth: 100,  weight: 100 },
  "Tin Ore":    { minDepth: 100,  weight: 40 },
  "Emerald":    { minDepth: 100,  weight: 15 },
  "Iron Ore":   { minDepth: 400,  weight: 100 },
  "Gold Ore":   { minDepth: 1000, weight: 40 },
  "Diamond":    { minDepth: 2500, weight: 15 },
};
