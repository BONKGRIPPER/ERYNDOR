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
  { id: "armorBench", icon: "\u{1FA61}", name: "Armor Bench", note: "Sew cloth into armor", ready: true, hub: true },
  // Not a BUILDINGS entry -- there's no structure to build, just water to
  // fish. Gated by location like a built station (hub.js's
  // fishingAvailableHere()), but on LOCATIONS[...].fishing rather than
  // needing to be "built" first.
  { id: "fishing",   icon: "\u{1F3A3}", name: "Fishing",   note: "Rod, net, or trap -- see what bites", ready: true, hub: true },
  { id: "market",    icon: "\u{2696}\u{FE0F}", name: "Market", note: "Sell what you've gathered", ready: true, hub: false },
  { id: "inventory", icon: "\u{1F392}", name: "Inventory", note: "What you're carrying",   ready: true,  hub: false },
  { id: "skills",    icon: "\u{1F4D4}", name: "Journal",   note: "Skills and your collection", ready: true,  hub: false },
  { id: "town",      icon: "\u{1F3D8}", name: "Aerendell", note: "Villagers and trade",    ready: false, hub: false },
  { id: "map",       icon: "\u{1F5FA}", name: "Map",       note: "Beyond the farmstead",   ready: true,  hub: false },
];
// Foraging isn't a PLACES entry any more -- it's one persistent button
// pinned above the dock (see index.html's #forage-bar and src/forage.js),
// not a destination you navigate to, so it never had a screen or a hub
// card to list here.

// Screens that exist, keyed to a #screen-<id> element and a #<id> URL hash.
export const SCREEN_IDS = [
  "home", "field", "logging", "mining", "combat", "inventory", "skills", "craft", "market", "campfire",
  "spinningWheel", "sawmill", "township", "stoneCutter", "tanningStation", "map", "fishing", "armorBench",
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
  fishing: { name: "Fishing", icon: "\u{1F3A3}" },
  tailoring: { name: "Tailoring", icon: "\u{1FA61}" },
};

export const PLOT_COUNT = 3;   // was 6 -- 2026-08-28, now that plots are a scrollable pill list, not a fixed grid

// A new Farm or Forest plot past the starting PLOT_COUNT -- an "Add Plot"
// card at the end of either list (src/field.js, src/logging.js), only
// offered at a non-wilderness location (see plotExpandCost() in
// costDisplay.js and each screen's own location check). The 4th plot
// (the first purchased one) costs this outright; the 5th costs double
// that, the 6th double again -- each one twice its predecessor, so it
// stays a real decision rather than a flat toll. Wildernesses get no
// expansion at all -- what's there is a fixed, set amount to harvest, by
// design, not a farmstead.
export const PLOT_EXPAND_COST = { "Stone Block": 5, "Pine Planks": 5 };

// ---------------------------------------------------------- watering & chop
//
// A plot needs WATER_TAPS_NEEDED separate taps of the watering can before
// it's "fully watered" and the actual growth timer starts -- one tap alone
// no longer does it. The can itself holds CAN_CAPACITY charges and drains
// one per tap; once empty, tapping the can (not a plot) starts a
// CAN_REFILL_MS wait before it's full again.
export const WATER_TAPS_NEEDED = 4;
export const CAN_CAPACITY = 4;
export const CAN_REFILL_MS = 3000;   // was 5000 -- 2026-08-31
// Harvesting is a single tap, instant (2026-08-31) -- the Scythe tool and
// its own timer are gone; a ripe plot just pays out the moment it's tapped,
// no tool selection needed at all. See field.js's touchPlot().

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

// Local device hours, 24h clock. Night spans midnight (21 -> 7, i.e.
// 9pm-7am -- 2026-08-29), so the range check in time.js handles the
// wraparound rather than assuming start < end. This is the one shared
// definition of "night" -- crops already read it through
// growthMultiplier() below, and Combat's own night difficulty/reward
// bonus (see COMBAT_NIGHT_MULT below and combat.js) reads the same
// isNight() rather than inventing a second window.
export const NIGHT_START_HOUR = 21;
export const NIGHT_END_HOUR = 7;
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
// tool (an equipped Axe fighting the tree's own health, not a single tap)
// and that it feeds its own skill.
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
  "Wooden Axe": "#8a6a45", "Wooden Can": "#6b8a9e",
  "Flint Dagger": "#a3a8ad", "Wooden Buckler": "#8a6a45",
  "Padded Vest": "#9c7a54", "Stone Plate": "#7d7d76",
  "Highland Cloak": "#5c7a5e", "Highland Chest": "#4f6b52", "Highland Legs": "#425a45",
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
  "Cooked Poultry": "#b97b4a", "Cooked Beef": "#7a2e2e", "Cooked Mutton": "#8a4536",
  "Scrap Metal": "#8c8f96",
  "Stone Block": "#9a9a92", "Basalt Block": "#55555c",
  "Fishing Rod": "#8a6a45", "Net": "#d9cba3", "Trap": "#8a6a45",
  "Worm Bait": "#a8724a", "Shiny Lure": "#d8bd6a",
  "Minnow": "#9fb8c7", "River Trout": "#6f8f7a", "Catfish": "#5f5a52",
  "Golden Carp": "#e0b23c", "Moonfin Eel": "#5a6b8a",
};

// A second, independent gather loop -- no seeds, no growth stages, just tap
// and wait. Single-tap-and-timer now (2026-08-31), same shape as Crafting
// (see CRAFT_MS/RECIPES below and craft.js): one tap starts a FORAGE_MS
// deadline (scaled down by the gather's own mastery level, see
// FORAGE_LEVEL_THRESHOLDS below), no further taps needed, and it resolves
// on its own the moment that deadline passes -- an item rolled from the
// current zone's own pool at that moment, not chosen by the player.
// Chances within a zone are meant to sum to 1; a zone with no pool falls
// back to the last entry rather than ever giving nothing.
export const FORAGE_MS = 10000;   // was 3000 -- 2026-08-31, now that mastery scales it down

// Foraging's own action mastery -- separate from the flat per-gather
// FORAGE_XP feeding the general Foraging skill below (state.foragingXp,
// shown in the Journal) -- this instead tracks total completed gathers and
// speeds up every future one, same "bottom-edge mastery bar on the pill
// itself" treatment itemLevels.js gives a crafted item (see
// itemLevelProgress()/recordCraft() there), just with its own uneven
// threshold table here instead of one flat number repeated forever.
// THRESHOLDS[level] is how many completed gathers *at that level* it takes
// to reach the next one -- climbing steeply on purpose (10, 25, 50, 100,
// then order-of-magnitude jumps) so each level actually means something
// once forage counts get large. The table's last entry is the practical
// level cap; there's no 11th threshold to climb past it. Each level
// doubles gather speed (SPEED_MULT compounds the same way
// ITEM_LEVEL_SPEED_MULT does), read fresh at the moment a gather starts
// (see forage.js's startForage()), so a level gained mid-run only speeds
// up the *next* gather, not the one already in flight.
export const FORAGE_LEVEL_THRESHOLDS = [10, 25, 50, 100, 1000, 5000, 10000, 25000, 50000, 100000];
export const FORAGE_LEVEL_SPEED_MULT = 0.5;
export const FORAGE_POOLS = {
  // Pine Cones dropped out (2026-08-30) now that Logging's trees regrow
  // on their own -- nothing plants a cone any more, so there's no reason
  // to forage one. Red Berries Seeds absorbs the freed weight rather than
  // splitting it across all three survivors, since Sticks/Flint's own
  // 0.40/0.40 split already matched the balance pass this pool came from.
  aerendell: [
    { item: "Red Berries Seeds", chance: 0.20 },
    { item: "Sticks",            chance: 0.40 },
    { item: "Flint",             chance: 0.40 },
  ],
  // No Flint here on purpose -- Forest Road is meant to read as a
  // different pocket of the world than Aerendell's own pool, not a copy
  // of it, and Flax/Flax Seeds give it something Aerendell's pool doesn't
  // have at all.
  forestRoad: [
    { item: "Flax Seeds", chance: 0.30 },
    { item: "Flax",       chance: 0.30 },
    { item: "Sticks",     chance: 0.40 },
  ],
};

// Foraging XP, first pass -- one flat amount per completed gather, same
// "small flat amount" shape as Farming's WATER_XP. There's no speed curve
// tied to level any more -- FORAGE_MS is a flat 3s at base speed, same as
// Crafting's own recipes. Level 100 is still a cap for display purposes --
// xpToNext() in skills.js is uncapped by itself, foraging is just the
// first skill that actually stops mattering past a point.
export const FORAGE_XP = 8;
export const FORAGE_MAX_LEVEL = 100;

// Unlocked at VILLAGER_LEVEL: a one-time Shards purchase (state.villager,
// see state.js) that automatically taps the Forage pill itself, once every
// VILLAGER_TICK_MS -- literally the same click a player's own tap would be,
// just on a timer. A no-op if a gather is already running (started by the
// player or a previous villager tick), same as tapping any other already-
// running pill. Cost is a first-pass number, not balanced. Hiring and
// upgrading both happen from the Township screen (src/township.js) now,
// not an inline button on the forage bar.
export const VILLAGER_LEVEL = 3;   // was 10 -- 2026-08-28
export const VILLAGER_COST = 250;
export const VILLAGER_TICK_MS = 30000;   // was 2500 (swing-based) -- 2026-08-31
// The first villager upgrade -- a flat multiplier on VILLAGER_TICK_MS,
// applied fresh to every tick (not baked in once), once bought
// (state.villager.fastHands). Only one tier exists so far; Township is
// built to show a list, not one fixed slot, so more can slot in later.
export const VILLAGER_UPGRADE_COST = 400;
export const VILLAGER_UPGRADE_MULT = 0.75;

// -------------------------------------------------------------- upkeep
//
// A hired villager doesn't work for free -- every VILLAGE_UPKEEP_MS (24h),
// the village draws VILLAGE_UPKEEP_FOOD food units and VILLAGE_UPKEEP_HEAT
// heat units from whatever the player has donated (state.village.food/
// heat, src/township.js's donate flow). Food units come straight off
// FOODS' own `heal` value (1 HP healed = 1 food unit -- the same number,
// not a second one to keep in sync); heat units come off
// VILLAGE_HEAT_VALUE below. Falling short on either at the 24h mark
// doesn't refund or partially apply -- the villager simply stops
// auto-working (src/forage.js checks state.village.starved) until enough
// of both is donated to clear the very upkeep that was missed, same
// "resolves the instant it's true, not retroactively" rule every other
// deadline in this game follows.
export const VILLAGE_UPKEEP_MS = 24 * 60 * 60 * 1000;
export const VILLAGE_UPKEEP_FOOD = 30;
export const VILLAGE_UPKEEP_HEAT = 15;

// Coal and Charcoal are refined fuels -- worth 3x a raw log or stick's one
// unit, same relative worth FUELS' own ordering already implies.
export const VILLAGE_HEAT_VALUE = {
  "Sticks": 1, "Pine Logs": 1, "Coal": 3, "Charcoal": 3,
};
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
  // Fishing's three tools -- see FISHING section near the bottom of this
  // file for what actually tells them apart. Net needs String (Spinning
  // Wheel output) rather than raw Flax, same "a real conversion chain, not
  // a shortcut" reasoning every other station-fed recipe already follows.
  fishingRod: { name: "Fishing Rod", cost: { "Sticks": 15, "String": 5 } },
  net:        { name: "Net",         cost: { "String": 15, "Sticks": 5 } },
  trap:       { name: "Trap",        cost: { "Sticks": 20, "Flint": 5 } },
  // Bait -- Rod-only (see canFishHere()/rollFish() in fishing.js). Net and
  // Trap don't take bait on purpose: they're the bulk/passive tools, bait
  // is what makes the skill-based tool worth the extra attention.
  wormBait:   { name: "Worm Bait",   cost: { "Sticks": 5 } },
  shinyLure:  { name: "Shiny Lure",  cost: { "Flint": 10, "String": 5 } },
};

// ------------------------------------------------------------------ equip
// Which bag items can go in which equipment slot, and where each slot
// renders on the Inventory screen's Equipment page (`group: "tool"` down
// the left column, `group: "gear"` on the body grid on the right -- see
// src/inventory.js). The Axe slot still has no mechanical effect of its
// own beyond Logging's damage-per-tier read (see AXES above) -- but the
// Pickaxe slot matters (src/mining.js reads it for swing speed/risk/
// depth), and so does the gear grid (src/combat.js reads it, see below).
// Add a slot by adding an entry here and pointing items at its id.
//
// No Scythe slot any more (2026-08-31) -- Farming lost its harvest tool
// entirely when harvesting became a single instant tap; there was only
// ever one tier of it (Wooden Scythe) and nothing left to equip.
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
  "Wooden Can": "can",
  "Wooden Pickaxe": "pick",
  "Flint Pickaxe": "pick",
  "Stone Pickaxe": "pick",
  // The "fishing" slot has sat reserved on the Equipment layout since
  // before Fishing existed (see EQUIP_SLOTS above) -- this is that slot
  // finally getting an item. Only the Rod is equipment; Net and Trap are
  // just owned bag items src/fishing.js checks for directly, since they're
  // actions you pick on the Fishing screen, not something you wear.
  "Fishing Rod": "fishing",
  // "arm" is a wildcard -- src/inventory.js's equip picker offers these to
  // *either* armLeft or armRight, whichever the player opened.
  "Flint Dagger": "arm",
  "Wooden Buckler": "arm",
  "Padded Vest": "chest",
  "Stone Plate": "chest",
  // The first items to actually fill the Helm and Legs slots -- both have
  // sat reserved on the Equipment layout with nothing to put in them
  // since before this armor set existed, same "real spot, nothing behind
  // it yet" story the Fishing Rod slot had until Fishing shipped.
  "Highland Cloak": "helm",
  "Highland Chest": "chest",
  "Highland Legs": "legs",
  // Anything with a heal value in FOODS is also equippable here -- Combat's
  // Eat button consumes whatever's equipped in this slot, not a fixed item,
  // which is the whole reason Food is a real equip slot instead of Combat
  // just reading the bag directly.
  "Berries": "food",
  "Red Berries": "food",
  "Cooked Berries": "food",
  "Cooked Poultry": "food",
  "Cooked Beef": "food",
  "Cooked Mutton": "food",
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
// band) with identical clicksPerSwing/depthPerSwing (2026-08-30) -- the
// only thing that improves tier over tier is risk itself (20%/10%/5%),
// not speed or reach. Reaching past 100m needs a Tier 2 pickaxe (Scrap
// Metal), which needs a material this game can't produce yet (no
// smelting/alloying station, no second zone) -- so Scrap Metal through
// Scorn exist below as real, balanced data with nothing that can obtain
// them yet, same "next pass, not this one" rule the old era table used.
// Digging is single-tap-and-timer now (2026-08-31), same shape as every
// other pill in this game (Crafting, Foraging, the conversion stations) --
// one tap starts a `ms`-long swing, no more tapping needed, and it resolves
// on its own the moment that deadline passes: either a cave-in
// (riskPerSwing chance) or depthPerSwing progress plus a rolled ore. The
// old "tap as fast as you can" clicksPerSwing model is gone along with it;
// `ms` is what replaces it, one flat swing duration per tier. maxDepth is
// still a hard wall -- no swing can even start past it.
export const PICKAXES = {
  "Wooden Pickaxe": { maxDepth: 100, ms: 6000, riskPerSwing: 0.20, depthPerSwing: 5 },
  "Flint Pickaxe":  { maxDepth: 100, ms: 5000, riskPerSwing: 0.10, depthPerSwing: 5 },
  "Stone Pickaxe":  { maxDepth: 100, ms: 4000, riskPerSwing: 0.05, depthPerSwing: 5 },
  // Not craftable yet -- no Scrap Metal, Bronze, Iron ingot, Gold bar or
  // Scorn material exists to make them from. `ms` just continues the same
  // decreasing trend the first three tiers set (-1s, -1s, tapering off
  // once it's already fast) as a placeholder, pending real balance once
  // these actually become craftable.
  "Scrap Metal Pickaxe": { maxDepth: 400,  ms: 3500, riskPerSwing: 0.05, depthPerSwing: 20 },
  "Bronze Pickaxe":      { maxDepth: 1000, ms: 3000, riskPerSwing: 0.04, depthPerSwing: 25 },
  "Iron Pickaxe":        { maxDepth: 2500, ms: 2500, riskPerSwing: 0.04, depthPerSwing: 50 },
  "Gold Pickaxe":        { maxDepth: 3000, ms: 2000, riskPerSwing: 0.04, depthPerSwing: 100 },
  "Diamond Pickaxe":     { maxDepth: 5000, ms: 1500, riskPerSwing: 0.02, depthPerSwing: 100 },
  "Scorn Pickaxe":       { maxDepth: 5000, ms: 1000, riskPerSwing: 0.01, depthPerSwing: 100 },
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
//   Chest, Helm, Legs -- each slot's own ARMORS entry `defense` stacks
//     with the other two (and the shield's) onto every incoming hit, and
//     each `recoveryMult` multiplies together onto COMBAT_BASE_RECOVERY_MS
//     -- this is the tradeoff the brief asked for: Stone Plate blocks more
//     but leaves you open longer between actions (1.35x recovery) than
//     the lighter Padded Vest (0.9x, faster than going unarmored). Highland
//     Cloak/Chest/Legs (Helm/Chest/Legs respectively) are the first set to
//     actually use all three slots at once, at recoveryMult 1 apiece (a
//     flat defense bonus, no speed tradeoff either way).
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
  "Highland Cloak": { defense: 1, recoveryMult: 1 },
  "Highland Chest": { defense: 1, recoveryMult: 1 },
  "Highland Legs":  { defense: 1, recoveryMult: 1 },
};
export const SHIELDS = {
  "Wooden Buckler": { defense: 2, block: 0.15 },
};

// heal: how many HP src/combat.js's Eat action restores. Anything with a
// heal value here is meant to also appear in EQUIPMENT pointed at the
// "food" slot -- the two lists are meant to be added to together.
// Raw berries (either source -- foraged "Berries" or farmed "Red Berries")
// heal 1; cooking either into "Cooked Berries" (see COOKABLES) triples
// that to 3. Raw poultry/beef/mutton have no entry here at all -- they're
// deliberately not equippable/edible raw, only their cooked forms are,
// each healing 5.
export const FOODS = {
  "Berries": { heal: 1 },
  "Red Berries": { heal: 1 },
  "Cooked Berries": { heal: 3 },
  "Cooked Poultry": { heal: 5 },
  "Cooked Beef": { heal: 5 },
  "Cooked Mutton": { heal: 5 },
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
  // The first location-exclusive enemy -- `zone` restricts it to showing
  // up on the idle enemy list only while state.currentLocation matches
  // (src/combat.js's buildCombatIdle()); an enemy with no `zone` at all
  // (every one above) stays available everywhere, same as Combat itself
  // always has been. Also the first source of Scrap Metal -- the material
  // PICKAXES' own comment already named for the Tier 2 pickaxe that's
  // real data with nothing able to obtain it yet, until now. A drop can
  // be a plain number (every existing drop) or a `[min, max]` pair rolled
  // fresh per kill (see combat.js's rollDropQty()) -- Scrap Metal is the
  // first to use the range form.
  roadGoblin: {
    name: "Road Goblin", icon: "\u{1F47A}", note: "Waylays travelers on Forest Road", level: 3,
    zone: "forestRoad",
    hp: 20, atkMin: 4, atkMax: 5, def: 0, attackMs: 2000, shardReward: 8,
    drops: { "Bones": 1, "Scrap Metal": [1, 3] },
  },
};
export const COMBAT_PLAYER_MAX_HP = 10;   // was 50 -- 2026-08-28
// A failed Flee attempt just costs the turn (the normal recovery cooldown,
// same as any other action) -- a success ends the fight on the spot with
// `state.combat.over = "fled"`, a third outcome alongside "won"/"lost" that
// grants no reward but also isn't a loss (no penalty exists for losing yet
// either, but the distinction is there for whenever one does).
export const FLEE_CHANCE = 0.5;

// Baked into a fight once, at startFight() (same "read once, not
// retroactive mid-run" rule every other timer/bonus in this game follows)
// -- night doesn't just make a fight harder, it pays better too, applied
// symmetrically to the enemy's HP and attack roll on one side and the
// shard/drop reward on the other. Reads the same isNight() crops already
// use (see NIGHT_START_HOUR/END_HOUR above), not a separate window.
export const COMBAT_NIGHT_MULT = 2;

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
  "Wooden Can": "crafting",
  "Flint Dagger": "crafting", "Wooden Buckler": "crafting",
  "Padded Vest": "crafting", "Stone Plate": "crafting",
  "Highland Cloak": "tailoring", "Highland Chest": "tailoring", "Highland Legs": "tailoring",
  "Stone Block": "stonecutting", "Basalt Block": "stonecutting",
  "Bones": "combat", "Feathers": "combat", "Raw Poultry": "combat", "Scrap Metal": "combat",
  "Animal Hide": "combat", "Raw Beef": "combat",
  "Wool": "combat", "Raw Mutton": "combat",
  "Leather": "tanning", "Cloth": "sowing",
  "Cooked Poultry": "cooking", "Cooked Beef": "cooking", "Cooked Mutton": "cooking",
  "Fishing Rod": "crafting", "Net": "crafting", "Trap": "crafting",
  "Worm Bait": "crafting", "Shiny Lure": "crafting",
  "Minnow": "fishing", "River Trout": "fishing", "Catfish": "fishing",
  "Golden Carp": "fishing", "Moonfin Eel": "fishing",
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
  "Wooden Pickaxe": 1, "Wooden Axe": 1, "Wooden Can": 1,
  "Flint Dagger": 45, "Wooden Buckler": 40, "Padded Vest": 55, "Stone Plate": 95,
  "Highland Cloak": 25, "Highland Chest": 25, "Highland Legs": 25,
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
  "Cooked Poultry": 14, "Cooked Beef": 22, "Cooked Mutton": 20,
  "Scrap Metal": 20,
  "Fishing Rod": 1, "Net": 1, "Trap": 1,
  "Worm Bait": 4, "Shiny Lure": 20,
  // Common < uncommon < rare < the one night-only catch, same "worth more
  // because it's harder to get" logic ore/gem tiers already follow.
  "Minnow": 4, "River Trout": 10, "Catfish": 16,
  "Golden Carp": 60, "Moonfin Eel": 45,
};

export const ZONE_DEMAND = {
  aerendell: {
    farming: 1, logging: 1, foraging: 1, crafting: 1, cooking: 1,
    sowing: 1, milling: 1, mining: 1, stonecutting: 1, combat: 1, tanning: 1,
    fishing: 1, tailoring: 1,
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

// A market in a "town"-type location (see LOCATIONS below) closes
// overnight -- 5pm to 9am local device time, the same wraparound-hours
// shape NIGHT_START_HOUR/END_HOUR already uses, just its own separate
// window (town hours aren't the same as night hours -- the market shuts
// before dark and opens well after dawn). A "city"-type location's market
// is open 24/7 and never checks this at all; landmarks and wilderness
// don't have a market to close. See time.js's isTownMarketOpen().
export const TOWN_MARKET_CLOSED_START_HOUR = 17;
export const TOWN_MARKET_CLOSED_END_HOUR = 9;

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
  armorBench: {
    name: "Armor Bench",
    cost: { "Basalt Block": 9, "Pine Planks": 12 },
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
  // Three recipes, one screen, one skill -- same "second/third recipe
  // sharing a station" shape the Spinning Wheel and Stone Cutter already
  // established. Highland Cloak/Chest/Legs are ARMORS entries (see below)
  // that fill the Helm/Chest/Legs slots respectively -- 1 defense each,
  // stacking to 3 total if all three are worn at once.
  highlandCloak: {
    screenTitle: "Armor Bench", screenSub: "Sew cloth into armor",
    actionName: "Highland Cloak",
    cost: { "Cloth": 4 }, output: "Highland Cloak", ms: 10000, xp: 10,
    skillXp: "tailoringXp", skillName: "Tailoring",
  },
  highlandChest: {
    screenTitle: "Armor Bench", screenSub: "Sew cloth into armor",
    actionName: "Highland Chest",
    cost: { "Cloth": 6 }, output: "Highland Chest", ms: 10000, xp: 12,
    skillXp: "tailoringXp", skillName: "Tailoring",
  },
  highlandLegs: {
    screenTitle: "Armor Bench", screenSub: "Sew cloth into armor",
    actionName: "Highland Legs",
    cost: { "Cloth": 6 }, output: "Highland Legs", ms: 10000, xp: 12,
    skillXp: "tailoringXp", skillName: "Tailoring",
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
  // Both berry sources (foraged and farmed) cook into the same "Cooked
  // Berries" -- no reason for a separate "Cooked Red Berries" when the
  // result is identical either way.
  "Red Berries": { gives: "Cooked Berries" },
  // Raw poultry/beef/mutton have no FOODS entry at all -- cooking is the
  // only way any of the three ever becomes edible/equippable.
  "Raw Poultry": { gives: "Cooked Poultry" },
  "Raw Beef": { gives: "Cooked Beef" },
  "Raw Mutton": { gives: "Cooked Mutton" },
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
// Rebalanced 2026-08-30: Stone/Basalt/Coal step down 100/50/25 (each half
// the last), and every gem -- Amethyst alongside Emerald/Diamond further
// down, "other gems" per the ask -- drops to a flat 5, well below any ore.
// Gems read as genuinely rare finds now, not a coinflip with Basalt at the
// depths where they overlap.
export const MINE_MATERIALS = {
  "Stone":      { minDepth: 0,    weight: 100, yield: 3 },
  "Coal":       { minDepth: 0,    weight: 25,  yield: 3 },
  "Basalt":     { minDepth: 0, maxDepth: 100, weight: 50, yield: 3 },
  "Amethyst":   { minDepth: 0,    weight: 5 },
  "Copper Ore": { minDepth: 100,  weight: 100 },
  "Tin Ore":    { minDepth: 100,  weight: 40 },
  "Emerald":    { minDepth: 100,  weight: 5 },
  "Iron Ore":   { minDepth: 400,  weight: 100 },
  "Gold Ore":   { minDepth: 1000, weight: 40 },
  "Diamond":    { minDepth: 2500, weight: 5 },
};

// Purely a display grouping (2026-08-31) for the Mining screen's big art
// banner -- one custom illustration per zone (see assets/sprites/README.md
// and mining.js's currentZone()), named after whichever material newly
// unlocks at that depth. Deliberately the same thresholds MINE_MATERIALS'
// own minDepth values already use above, not a separate number to keep in
// sync by hand -- what's actually rollable at a given depth is still
// MINE_MATERIALS' own cumulative pool, unaffected by this; a zone can (and
// does, e.g. Stone's) hold more than one material at once.
export const MINE_ZONES = [
  { minDepth: 0,    name: "Stone" },
  { minDepth: 100,  name: "Copper" },
  { minDepth: 400,  name: "Iron" },
  { minDepth: 1000, name: "Gold" },
  { minDepth: 2500, name: "Diamond" },
];

// -------------------------------------------------------------- the world
//
// Foundational data for zones/travel/factions/trade -- laid down now, well
// ahead of the Map screen or an actual travel mechanic (both later
// batches), so every other foundational piece (town market hours below,
// eventually per-location stations/forage pools) has real data to read
// from instead of a hardcoded "Aerendell" assumption scattered everywhere.
//
// `type` decides what a location even has, not a per-location flag list:
//   - "city"       -- a market (open 24/7, unlike a town's) and a bank.
//                     Bank contents are meant to be shared across every
//                     city, not per-location, once banking exists.
//   - "town"       -- a market (closed overnight, see
//                     TOWN_MARKET_CLOSED_START_HOUR/END_HOUR) and storage
//                     (a local crate, NOT shared with any other location).
//   - "landmark"   -- no market, no storage. A place things happen, not a
//                     place to restock.
//   - "wilderness" -- same as landmark: no market, no storage.
// `stations` and `forage` are placeholders (empty) for every location
// except Aerendell until the spreadsheet's real content comes back --
// same "real spot, nothing behind it yet" treatment the Furnace/Stone
// Cutter hub cards used before they were real.
//
// Coordinates straight off the hand-drawn map (2026-08-29): Aerendell --
// Forest Road -- Thal-Barak -- Stilltide Pass -- Duun-Vael Bridge --
// Riverhold, one linear road so far. `locked` is a reason string shown to
// the player, or `true` for a lock the player isn't told the reason for
// (the sketch's own "some locks don't show why" rule) -- absent/false
// means open. Nothing is locked yet; every one of these fields is real,
// load-bearing shape for whenever a location actually needs to be.
//
// `pos` is a grid coordinate (not pixels -- src/map.js does that
// conversion), y increasing upward with 0 at Aerendell, matching the
// sketch's own "the road climbs away from home" layout and the Map
// screen's "starting location at the bottom" rule. It's a free x/y grid,
// not just an index along one chain, on purpose -- the sketch itself
// already branches sideways off Thal-Barak, so a location needs to be
// placeable anywhere around its neighbors, not just stacked in a line.
export const LOCATIONS = {
  aerendell: {
    name: "Aerendell", type: "town", pos: { x: 0, y: 0 },
    stations: ["campfire", "spinningWheel", "sawmill", "stoneCutter", "tanningStation", "township", "armorBench"],
    // No fishing (or Furnace, once that's real) at the farmstead itself --
    // both are meant to belong somewhere out in the world once a real
    // location's spreadsheet answer says where. FISH_POOLS.aerendell is
    // left in data.js, just unreferenced by any location for now, rather
    // than deleted -- whichever location does end up with fishing can
    // point straight at it (or its own pool) without rebuilding the data.
    forage: "aerendell", fishing: null,
  },
  forestRoad: {
    name: "Forest Road", type: "wilderness", pos: { x: 1, y: 1 }, stations: [],
    forage: "forestRoad", fishing: null,
  },
  thalBarak: { name: "Thal-Barak", type: "city", pos: { x: 0, y: 2 }, stations: [], forage: null, fishing: null },
  stilltidePass: { name: "Stilltide Pass", type: "wilderness", pos: { x: 1, y: 3 }, stations: [], forage: null, fishing: null },
  duunVaelBridge: { name: "Duun-Vael Bridge", type: "landmark", pos: { x: 0, y: 4 }, stations: [], forage: null, fishing: null },
  riverhold: { name: "Riverhold", type: "city", pos: { x: 1, y: 5 }, stations: [], forage: null, fishing: null },
};

// One road per connection, not two (aerendell<->forestRoad is a single
// entry, travel works either direction along it) -- `minutes` is real
// game-clock travel time for whenever a travel mechanic reads this;
// `locked` (a reason string, or `true` for an unexplained lock, or absent
// for open) overrides `minutes` on the Map screen's own display, showing
// a padlock instead of a time, per the sketch. Numbers below are read
// straight off the hand-drawn map -- first-pass, meant to be tuned once
// the location spreadsheet comes back, not a balanced economy yet.
export const ROADS = [
  { from: "aerendell", to: "forestRoad", minutes: 5 },
  { from: "forestRoad", to: "thalBarak", minutes: 15 },
  { from: "thalBarak", to: "stilltidePass", minutes: 5 },
  { from: "stilltidePass", to: "duunVaelBridge", minutes: 15 },
  { from: "duunVaelBridge", to: "riverhold", minutes: 15 },
];

// ----------------------------------------------------------- zone leveling
//
// Ported from the Leatheron prototype's zone-XP system (2026-08-31),
// adapted per this game's own spec rather than copied wholesale: there, a
// flat amount fed a zone regardless of what skill XP the action also
// granted; here, a fixed share of *whatever skill XP was just earned*
// feeds the zone the player is currently standing in instead -- see
// state.js's gainSkillXp(), the one place every skill (Mining, Foraging,
// Farming, Logging, Fishing, the conversion stations, Combat) actually
// grants its own XP through. Flat XP-per-level, not skills.js's own
// exponential levelFromXp() curve -- zone levels are meant to come at a
// steady clip, not slow down, since leveling one is what triggers the loot
// wheel below. First-pass numbers, not balanced.
export const ZONE_XP_SHARE = 0.25;      // 25% of every skill XP gain also feeds the current zone
export const ZONE_XP_PER_LEVEL = 20;

// The reward pool a zone level-up spins for -- src/zoneWheel.js. Flat and
// equally weighted for now, per the user's own ask ("just have the player
// gain either stone, pine logs, or flint"); every spin is a real win, no
// "nothing" slice the way Leatheron's own table had one. A future pass can
// widen this into a weighted table (rarer finds at lower odds) without
// touching the wheel's own animation code, which only ever reads whatever
// this array currently holds.
export const ZONE_LOOT_POOL = [
  { item: "Stone", min: 5, max: 15 },
  { item: "Pine Logs", min: 5, max: 15 },
  { item: "Flint", min: 5, max: 15 },
];

// ----------------------------------------------------------------- fishing
//
// Three tools, three different *kinds* of interaction, not three tiers of
// the same one -- each deliberately reuses a mechanic this game already
// has, rather than inventing a fourth:
//   - Rod   -- the reflex minigame (src/fishing.js's castRod()/resolveBite()):
//              cast, wait for a bite, tap the short window. The only tool
//              that can land a `rare` or `nightOnly` fish, and the only one
//              bait affects -- skill and prep both matter here, so it's the
//              one worth paying attention to.
//   - Net   -- a tap-swing, same shape as Mining's dig or Foraging's swing:
//              tap FISH_NET_CLICKS_PER_SWING times, no bite-timing at all.
//              Common fish only, but two per completed swing -- bulk over
//              precision.
//   - Trap  -- a deadline timer, same shape as Travel or a cooking Campfire
//              item: set it (FISH_TRAP_MS out), walk away, it resolves and
//              banks itself the instant it's ready, no tap required at
//              all. Common fish only, lowest value -- the cost of zero
//              attention.
// Bait only ever touches the Rod roll; Net/Trap don't take bait, which is
// what makes bait worth crafting in the first place (see BAITS below).
export const FISH_XP_ROD = 12;
export const FISH_XP_NET = 8;
export const FISH_XP_TRAP = 5;

export const FISH_NET_CLICKS_PER_SWING = 6;
export const FISH_TRAP_MS = 10 * 60 * 1000;   // 10 minutes, set-and-forget

// Cast, then a random wait before the bite window opens, then a short
// window to tap it -- miss either end (didn't tap in time) and the fish
// gets away with nothing gained. Deadline-based (biteAt/expiresAt are real
// timestamps, not a running countdown), same as every other timer in this
// game, so backgrounding the tab mid-cast just means the window may have
// already passed by the time it's looked at again -- a miss, not a bug.
export const FISH_BITE_DELAY_MIN_MS = 1500;
export const FISH_BITE_DELAY_MAX_MS = 4500;
export const FISH_BITE_WINDOW_MS = 750;

// Reweights specific fish for the Rod roll only -- a flat multiplier on
// that fish's own `chance`, applied before the weighted roll (see
// rollFish() in fishing.js), not a separate guaranteed-catch mechanic.
// Consumed one per cast, same "spent on commit" rule everything else
// spendable in this game follows.
export const BAITS = {
  "Worm Bait": { boosts: { "River Trout": 2, "Catfish": 2 } },
  "Shiny Lure": { boosts: { "Golden Carp": 5 } },
};

// One pool per location with `fishing` set (LOCATIONS above) -- same shape
// as FORAGE_POOLS, plus two flags a forage pool has no equivalent for:
//   `rare`      -- Rod-only (Net/Trap filter these out entirely).
//   `nightOnly` -- excluded from every roll unless isNight() (src/time.js)
//                  is true; Rod-only in practice too, since Net/Trap's own
//                  common-only filter already drops it regardless of time.
// Weights don't need to sum to 1 -- rollFish() sums whatever's left after
// filtering and rolls against that total, so excluding nightOnly by day
// doesn't silently bias the remaining odds.
export const FISH_POOLS = {
  aerendell: [
    { item: "Minnow",      chance: 0.45 },
    { item: "River Trout", chance: 0.30 },
    { item: "Catfish",     chance: 0.16 },
    { item: "Golden Carp", chance: 0.05, rare: true },
    { item: "Moonfin Eel", chance: 0.04, nightOnly: true },
  ],
};
