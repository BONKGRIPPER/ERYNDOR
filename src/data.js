// ================================================================ content
// Everything a designer would want to change lives up here. Pure data --
// nothing in this file touches the DOM or reads game state.

// -------------------------------------------------------------- inventory
// A slot-and-stack cap (2026-09-04), same shape Minecraft's own inventory
// uses -- BAG_SLOTS distinct stacks, each stack capped at an item's own
// stackCapFor() (state.js), overflowing into a second stack rather than a
// single number cap. Enforced at gainItem() (state.js), the one choke
// point every producer in this game already routes through -- farming,
// logging, foraging, mining, fishing, cooking, every conversion station,
// market buy/withdraw, combat loot, and both villager systems all get the
// cap for free from that one spot. This is also what stops an idle
// villager from silently overproducing while the player's away, per the
// user's own request.
export const BAG_SLOTS = 25;
export const STACK_CAP_DEFAULT = 99;
// Per-item overrides -- empty for now. "Each item should have the ability
// to change the limit... so I can balance later": add an entry here, e.g.
// { "Enchanted Shard": 10 }, and stackCapFor() (state.js) picks it up with
// no other code changes.
export const ITEM_STACK_CAPS = {};
// Items that raise the bag's own slot cap while owned -- e.g. a crafted
// bag upgrade. Highland Sack (Craft Bench, RECIPES below) is the first
// real entry: crafting one grants +3 bag slots for as long as it's kept.
export const BAG_SLOT_BONUS = { "Highland Sack": 3 };
// Aerendell's own local storage crate -- same slot-and-stack shape as the
// bag (same per-item stackCapFor()), just a much higher flat cap and no
// bonus-item hook (yet). One shared crate for now, not per-location (see
// state.storage's own comment in state.js), so this is one flat number
// rather than a per-LOCATIONS table -- first-pass, per the user's own "for
// now" framing.
export const STORAGE_SLOTS = 100;
// Merchant freight fee, per selected inventory stack, scaled by how far
// the goods have to travel: fee = stacks x FREIGHT_FEE_PER_STACK x
// ceil(roadMinutes / FREIGHT_FEE_DISTANCE_STEP). The nearest market away
// from Home is Thal-Barak at 20 road-minutes (2 steps -> 6 Shards/stack);
// Riverhold at 55 minutes is 4 steps -> 12 Shards/stack. That keeps a
// small shipment affordable against early Shard income (a combat win is
// +15) while making it a real question whether to ship a far-away haul
// home or just sell it on the spot -- and giving the outpost caravan
// (Batch 9.7) something to undercut. No recurring fee; paid once at
// dispatch. First-pass numbers, tune against a real playthrough.
export const FREIGHT_FEE_PER_STACK = 3;
export const FREIGHT_FEE_DISTANCE_STEP = 15;
export const OUTPOST_COST = 50;
export const CART_COST = 100;
export const OUTPOST_CAPACITY = 200;
export const CART_CAPACITY = 10;
export const CART_HANDLING_MS = 10000;
export const LOGGING_CREW_COST = 75;
export const LOGGING_CREW_INTERVALS = [90000, 60000, 45000];
export const LOGISTICS_UPGRADE_COSTS = { crew: [100, 200], stockpile: [50, 100], cart: [75, 150] };
export const CARGO_UNITS = { "Pine Logs": 2, "Birch Logs": 2, "Stone": 2, "Iron Ore": 2, "Copper Ore": 2 };

// The hub. Add a destination by adding a line here.
// `hub` controls whether a place shows as a card on the Home screen.
// Explore, Bag (inventory), Journal (skills) and Map live in the dock (see
// DOCK_IDS below); Home is a dock button too, shown only at Aerendell. They
// all stay in this list because the dock still looks up their icon/name
// from here, they just don't get a Home card of their own.
// Order here is also grid order (2 columns, read row by row) -- roughly
// matches a hand-sketched layout (2026-08-28): Farm/Forest, Mining/Craft
// Bench, Spinning Wheel/Camp Fire, Stone Cutter next to it, then Combat
// and Sawmill tacked on after (both postdate that sketch). Furnace was a
// real spot on the sketch with no station ever built behind it -- removed
// outright (2026-09-01), not just hidden, once it was clear it wasn't
// getting one; nothing else in the game referenced it.
export const PLACES = [
  { id: "home",      icon: "\u{1F3E1}", name: "Home",      note: "Your crafting stations", ready: true,  hub: false },
  { id: "explore",   icon: "\u{1F9ED}", name: "Explore",   note: "Where you are and what's here", ready: true, hub: false },
  { id: "field",     icon: "\u{1F331}", name: "Farm",      note: "Plant, water, harvest",  ready: true,  hub: false },
  { id: "logging",   icon: "\u{1FAB5}", name: "Forest",    note: "Plant, water, chop",     ready: true,  hub: false },
  { id: "mining",    icon: "\u{26CF}\u{FE0F}", name: "Mining", note: "Descend, dig, and bank your finds", ready: true, hub: false },
  { id: "craft",     icon: "\u{1F6E0}", name: "Craft Bench", note: "Tools from raw material", ready: true, hub: true },
  { id: "spinningWheel", icon: "\u{1F9F6}", name: "Spinning Wheel", note: "Turn flax into string", ready: true, hub: true },
  { id: "campfire",  icon: "\u{1F525}", name: "Campfire",  note: "Cook logs and berries",  ready: true,  hub: true },
  { id: "stoneCutter", icon: "\u{1FAA8}", name: "Stone Cutter", note: "Cut stone into blocks", ready: true, hub: true },
  { id: "tanningStation", icon: "\u{1F9F5}", name: "Tanning Station", note: "Turn hides into leather", ready: true, hub: true },
  { id: "combat",    icon: "\u{2694}\u{FE0F}", name: "Combat", note: "Fight what's out there", ready: true, hub: false },
  { id: "sawmill",       icon: "\u{1FA9A}", name: "Sawmill",        note: "Turn pine logs into pine planks", ready: true, hub: true },
  { id: "township",  icon: "\u{1F465}", name: "Township",  note: "Villagers and their upgrades", ready: true, hub: true },
  { id: "armorBench", icon: "\u{1FA61}", name: "Armor Bench", note: "Sew cloth into armor", ready: true, hub: true },
  { id: "grindStone", icon: "\u{1F9B4}", name: "Grind Stone", note: "Grind bones into bonemeal", ready: true, hub: true },
  { id: "beehive", icon: "\u{1F41D}", name: "Beehive", note: "Keep bees, craft honey", ready: true, hub: true },
  { id: "fletchingBench", icon: "\u{1F3F9}", name: "Fletching Bench", note: "Craft bows and arrows", ready: true, hub: true },
  { id: "loom", icon: "\u{1FAA1}", name: "Loom", note: "Weave string and yarn into cloth", ready: true, hub: true },
  // Not a BUILDINGS entry -- there's no structure to build, just water to
  // fish. Gated by location like a built station (hub.js's
  // fishingAvailableHere()), but on LOCATIONS[...].fishing rather than
  // needing to be "built" first.
  { id: "fishing",   icon: "\u{1F3A3}", name: "Fishing",   note: "Rod, net, or trap -- see what bites", ready: true, hub: false },
  { id: "market",    icon: "\u{2696}\u{FE0F}", name: "Market", note: "Sell what you've gathered", ready: true, hub: false },
  { id: "inventory", icon: "\u{1F392}", name: "Bag",       note: "What you're carrying",   ready: true,  hub: false },
  { id: "skills",    icon: "\u{1F4D4}", name: "Journal",   note: "Skills and your collection", ready: true,  hub: false },
  { id: "town",      icon: "\u{1F3D8}", name: "Aerendell", note: "Villagers and trade",    ready: false, hub: false },
  { id: "map",       icon: "\u{1F5FA}", name: "Map",       note: "Travel between locations", ready: true,  hub: false },
];
// Foraging isn't a PLACES entry any more -- it's one persistent button
// pinned above the dock (see index.html's #forage-bar and src/forage.js),
// not a destination you navigate to, so it never had a screen or a hub
// card to list here.

// Screens that exist, keyed to a #screen-<id> element and a #<id> URL hash.
export const SCREEN_IDS = [
  "home", "explore", "field", "logging", "mining", "combat", "inventory", "skills", "craft", "market", "campfire",
  "spinningWheel", "sawmill", "township", "stoneCutter", "tanningStation", "map", "fishing", "armorBench",
  "grindStone", "beehive", "fletchingBench", "loom",
];

// The persistent bottom dock. `home` is first but only rendered while the
// player is actually at Aerendell (dock.js's refreshDock()) -- it opens the
// crafting-station grid. Explore is the "what's here" screen (field
// activities + market for the current location); Map is the travel map.
// Bag and Journal are Inventory and the Skills/Collection journal.
export const DOCK_IDS = ["home", "explore", "inventory", "skills", "map"];

// Aerendell is the one permanent production home. `currentLocation` still
// tracks the field zone the player is exploring, but it no longer decides
// which workshops exist on Home.
export const HOME_LOCATION_ID = "aerendell";

// Screens whose actions require the player to be physically at the home
// workshop. Existing timers on these systems continue settling everywhere;
// only opening/managing them is home-gated.
export const PRODUCTION_SCREEN_IDS = [
  "home", "craft", "campfire", "spinningWheel", "sawmill", "township",
  "stoneCutter", "tanningStation", "armorBench", "grindStone", "beehive",
  "fletchingBench", "loom",
];

// Active play is the travel-sensitive half of the game. These destinations
// are offered from a location's World sheet rather than from Home.
export const FIELD_SCREEN_IDS = ["field", "logging", "mining", "combat", "fishing"];

export const LOCATION_ACTIVITIES = {
  aerendell: ["field", "logging", "mining", "combat"],
  forestRoad: ["logging", "combat", "fishing"],
  thalBarak: ["combat", "fishing"],
  stilltidePass: ["mining", "combat", "fishing"],
  duunVaelBridge: ["combat"],
  riverhold: ["combat", "fishing"],
};

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
  grinding: { name: "Grinding", icon: "\u{1F9B4}" },
  beekeeping: { name: "Beekeeping", icon: "\u{1F41D}" },
  fletcher: { name: "Fletcher", icon: "\u{1FAB6}" },
  weaving: { name: "Weaving", icon: "\u{1FAA1}" },
  // Both level off combat *kills* specifically (endFight()'s own win
  // branch), split by whatever weapon actually landed the last blow --
  // Combat itself (the original, generic skill) is untouched and still
  // gains XP on every win regardless of weapon, same as before either of
  // these existed.
  archery: { name: "Archery", icon: "\u{1F3F9}" },
  melee: { name: "Melee", icon: "\u{2694}\u{FE0F}" },
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

// Chopping is single-tap-and-timer now (2026-08-31), same shape as every
// other pill in this game (Crafting, Foraging, Mining's own Dig) -- one
// tap on a ripe tree starts a swing whose whole duration is the ripe
// tree's `health` (TREES below) divided by the equipped axe's `damage`
// here, in seconds: a 24-health Pine with a 1-damage Wooden Axe takes 24s,
// a 2-damage Flint Axe takes 12s. Locked in at the moment the swing
// starts (see logging.js's startChop()), so re-equipping mid-chop only
// speeds up the *next* tree, not the one already falling.
export const AXES = {
  "Wooden Axe": { damage: 1 },
  "Flint Axe":  { damage: 2 },
  "Stone Axe":  { damage: 3 },
  // Stronger than Stone Axe -- both it and Stone Axe clear Birch's own
  // minAxeDamage gate (TREES.birch, 3), Flint/Wooden Axe don't.
  "Scrap Axe":  { damage: 4 },
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

// Fishing's own nightOnly catches (FISH_POOLS below) read this narrower
// 9pm-5am window instead of the general isNight() above -- the user's own
// spec, not the same one crops/combat use. See time.js's isFishingNight().
export const FISH_NIGHT_START_HOUR = 21;
export const FISH_NIGHT_END_HOUR = 5;

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

// ---------------------------------------------------------- fertilizer
//
// Bonemeal is the first fertilizer item (2026-09-02, Grind Stone's own
// output -- see STATIONS.grindStone above). Optional: applied through the
// Farm's own Fertilizer tool (between Seeds and the Watering Can, see
// field.js) to a freshly-planted, not-yet-watered plot -- it must go on
// *before* the first watering tap lands, not after, so there's no
// "fertilize a plot that's already growing" case to handle. `growthMult`
// multiplies straight into water()'s own speed calc alongside the level
// and season multipliers, read once and baked into that stage's timer the
// same way both of those already are. First-pass number, not balanced.
export const FERTILIZERS = {
  "Bonemeal": { growthMult: 1.5 },
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
  // Real plot now (2026-09-04) -- Forest Road's own Logging screen grows
  // these instead of Pine (see LOCATIONS.forestRoad's own `tree` field and
  // logging.js's treeFor()/treeForCurrentLocation()). "Same base stats as
  // Pine trees" per the request -- waters/stageSeconds/xp/health all match
  // TREES.pine exactly, only the seed/tint/output actually differ.
  // `minAxeDamage` (3, Stone Axe's own damage) is the felling gate --
  // touchLogPlot() blocks starting a swing on a Birch with anything
  // weaker, same "equip the right tier or nothing happens" reasoning
  // mining.js's own maxDepth wall already uses for pickaxes.
  birch: {
    name: "Birch", seed: "Birch Cones", tint: "#c9c19a",
    waters: 1, stageSeconds: 180, xp: 34, health: 24,
    gives: { "Birch Logs": 3 },
    minAxeDamage: 3,
  },
};

export const TINTS = {
  "Red Berries Seeds": "#c23b52", "Red Berries": "#c23b52",
  "Flax Seeds": "#8fb3d9", "Flax": "#8fb3d9",
  "Pine Cones": "#4a6b3a", "Pine Logs": "#6b4a2f",
  "Birch Cones": "#c9c19a", "Birch Logs": "#d9cba3",
  "Berries": "#c85a6e", "Flint": "#9098a3", "Sticks": "#8a6a45",
  "Flint Axe": "#c9a06b", "Flint Pickaxe": "#a98c5c",
  "Wooden Pickaxe": "#8a6a45", "Stone Pickaxe": "#7d7d76", "Stone Axe": "#7d7d76",
  "Wooden Axe": "#8a6a45", "Wooden Can": "#6b8a9e",
  "Flint Dagger": "#a3a8ad", "Wooden Buckler": "#8a6a45",
  "Padded Vest": "#9c7a54", "Stone Plate": "#7d7d76",
  "Highland Cloak": "#5c7a5e", "Highland Chest": "#4f6b52", "Highland Legs": "#425a45",
  "Scrap Pickaxe": "#8c8f96", "Scrap Axe": "#8c8f96", "Scrap Watering Can": "#8c8f96",
  "Scrap Helm": "#75787f", "Scrap Armor": "#6a6d73", "Scrap Legs": "#65686e",
  "Short Bow": "#b98552", "Flint Arrows": "#9098a3",
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
  // The Loom's own two ingredients/outputs (2026-09-04) -- Yarn is spun
  // from Wool at the Spinning Wheel (a third recipe there, alongside
  // String and Cloth), then either Yarn or String itself is woven into
  // Cloth/Fabric at the new Loom. Both real, sourced items -- unlike Oak
  // Planks/Fine String/Birch Planks/Bronze Nails elsewhere in this file,
  // nothing about either is a forward reference.
  "Yarn": "#ded0a8", "Fabric": "#8f7f5c",
  "Cooked Poultry": "#b97b4a", "Cooked Beef": "#7a2e2e", "Cooked Mutton": "#8a4536",
  "Scrap Metal": "#8c8f96",
  "Stone Block": "#9a9a92", "Basalt Block": "#55555c",
  "Bonemeal": "#efe6d3",
  "Queen Bee": "#e0a72e", "Honey": "#d9930c",
  "Fishing Rod": "#8a6a45", "Net": "#d9cba3", "Trap": "#8a6a45",
  "Worm Bait": "#a8724a", "Shiny Lure": "#d8bd6a",
  // Five fishing pools now (2026-09-02), one set of fish each -- "river" is
  // the pool that used to be keyed "aerendell" (same five fish, renamed
  // key only, see FISH_POOLS below). Every pool follows the same naming
  // convention its first entries already set: mundane real-fish-ish names
  // for the three standard catches, a "Golden ___" name for the rare one,
  // a "Moon___" name for the nightOnly one -- so a fish's own name already
  // hints at its tier before a player ever checks its stats.
  "Minnow": "#9fb8c7", "River Trout": "#6f8f7a", "Catfish": "#5f5a52",
  "Golden Carp": "#e0b23c", "Moonfin Eel": "#5a6b8a",
  "Mudscale Perch": "#8a9a6e", "Reed Sunfish": "#c9b45a", "Bog Loach": "#5c5442",
  "Golden Koi": "#e8a23a", "Moonpond Eel": "#4f6a72",
  "Lake Herring": "#a8b8c2", "Silverback Bass": "#7f8a92", "Deepwater Pike": "#3f5a52",
  "Golden Sturgeon": "#d9a842", "Moonveil Trout": "#556a8a",
  "Brook Char": "#c26a4a", "Speckled Dace": "#9fa8a2", "Stonefly Grayling": "#8a8f95",
  "Golden Grayling": "#e0b64a", "Moonshadow Char": "#5a4a72",
  "Saltback Herring": "#7a94a8", "Reef Snapper": "#d97a5a", "Tideskimmer Mackerel": "#4a7a8a",
  "Golden Marlin": "#e0a832", "Moontide Eel": "#3a5a6a",
  // Cooked versions -- same "meat needs cooking to be edible" rule
  // Poultry/Beef/Mutton already follow (see COOKABLES/FOODS below); every
  // raw fish above is un-equippable on its own.
  "Cooked Minnow": "#b58a5a", "Cooked River Trout": "#a06a3f", "Cooked Catfish": "#8f6438",
  "Cooked Golden Carp": "#d99a3a", "Cooked Moonfin Eel": "#7a5f4a",
  "Cooked Mudscale Perch": "#a58a52", "Cooked Reed Sunfish": "#c2984a", "Cooked Bog Loach": "#8a6a42",
  "Cooked Golden Koi": "#d9923a", "Cooked Moonpond Eel": "#6a5a4a",
  "Cooked Lake Herring": "#b09a72", "Cooked Silverback Bass": "#9a8462", "Cooked Deepwater Pike": "#6a7a52",
  "Cooked Golden Sturgeon": "#c99a42", "Cooked Moonveil Trout": "#6a6a7a",
  "Cooked Brook Char": "#b06a42", "Cooked Speckled Dace": "#9a8a72", "Cooked Stonefly Grayling": "#8a7a62",
  "Cooked Golden Grayling": "#d9a842", "Cooked Moonshadow Char": "#6a5a72",
  "Cooked Saltback Herring": "#a08a62", "Cooked Reef Snapper": "#c2724a", "Cooked Tideskimmer Mackerel": "#5a7a72",
  "Cooked Golden Marlin": "#d99a32", "Cooked Moontide Eel": "#5a6a6a",
  // Fishing Rod's own upgrade -- Oak Planks (Sawmill's Pine-only recipe
  // hasn't grown a second tree species yet) and Fine String (nothing
  // makes this yet, per the user's own "not sure what creates fine string
  // yet") are both real items, registered so the Rod's recipe (below) is
  // real data even though neither ingredient has a source in the game
  // yet -- same "real spot, nothing behind it yet" treatment Scrap Metal
  // got before Road Goblin ever dropped it.
  "Oak Planks": "#a07a45", "Fine String": "#e8dfc2",
  // Housing's own recipe (Township's new House card, see BUILDINGS-shaped
  // HOUSE_COST below) -- Birch Planks has the same "real spot, nothing
  // behind it yet" story as Oak Planks above (Birch trees exist in TREES
  // but Logging has no plot for them yet, so nothing produces Birch Logs
  // to mill in the first place). Bronze Nails is the user's own explicit
  // placeholder -- "a material added later in the bronze age" -- so a
  // House is real, priced data now even though half its cost has no
  // source anywhere in the game yet.
  "Birch Planks": "#c99a6a", "Bronze Nails": "#b8823f",
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
  // Queen Bee added 2026-09-02 at a real 0.5% -- shaved straight off Red
  // Berries Seeds (0.20 -> 0.195) so the pool still sums to exactly 1;
  // Sticks/Flint's own 0.40/0.40 split is untouched. Chances within a
  // pool are read in array order (see forage.js's rollDrop()), so a slice
  // this small still has to actually fit under 1.0 to ever be reachable.
  aerendell: [
    { item: "Red Berries Seeds", chance: 0.195 },
    { item: "Sticks",            chance: 0.40 },
    { item: "Flint",             chance: 0.40 },
    { item: "Queen Bee",         chance: 0.005 },
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

// Unlocked at VILLAGER_LEVEL: the Forager profession (WORKERS.forager
// below, assigned for free from the Township screen -- src/township.js/
// workers.js) that automatically taps the Forage pill itself, once every
// VILLAGER_TICK_MS -- literally the same click a player's own tap would be,
// just on a timer. A no-op if a gather is already running (started by the
// player or a previous villager tick), same as tapping any other already-
// running pill.
export const VILLAGER_LEVEL = 3;   // was 10 -- 2026-08-28
export const VILLAGER_TICK_MS = 30000;   // was 2500 (swing-based) -- 2026-08-31

// ------------------------------------------------------------ worker villagers
//
// A second, separate villager system (2026-09-04) alongside the Foraging
// Villager above -- one hire per station-shaped role rather than one
// upgradeable slot. See WORKERS below (after STATIONS, so it can point at
// station ids directly) and src/workers.js for the actual hire/tick logic;
// the Township screen (src/township.js) renders one hire card per role.
//
// Reworked (2026-09-04, second pass): hiring no longer costs Shards at
// all. Every villager slot at a location comes from Houses built there
// (HOUSE_WORKER_SLOTS each -- see workerCap() in workers.js); assigning an
// unlocked profession to a free slot is free, and a slot can be freely
// unassigned and reassigned to a different profession later. A profession
// is "unlocked" once its building is built and (for the few that need one,
// e.g. the Forager below) the associated skill reaches WORKERS[role].
// unlockLevel -- there's no more per-worker Shard-paid leveling; which
// stationIds tier an assigned worker can attempt is now gated purely by
// that skill's own level (see WORKER_TIER_LEVELS below and workers.js's
// unlockedStationIds()).
//
// `state.workers` starts empty and can hold up to workerCap() entries
// (src/workers.js) -- housing-derived, see HOUSE_WORKER_SLOTS below. A
// worker's own tick interval is WORKER_TICK_MULT times whatever their
// role's own craft actually takes at the player's current skill level (a
// 30s craft means a 2.5-minute villager attempt, per the original
// request) -- read fresh each attempt, same "speed read at the moment a
// cycle starts" rule Foraging's own villagerTickMs() already follows, so
// leveling up mid-run speeds up the villager's next attempt too, not just
// the player's own taps.
export const WORKER_TICK_MULT = 5;
// Skill level required to unlock each successive stationIds tier for a
// tiered role (index 0 -- the first tier -- is always free the moment a
// worker's assigned to that role). No number was given for these beyond
// the original "5x slower" hire-time example, so this is a first-pass
// default: tier 1 at level 10, tier 2 at level 25 -- the longest
// stationIds list in WORKERS is 3 entries, so this only ever needs 3
// slots. See workers.js's unlockedStationIds().
export const WORKER_TIER_LEVELS = [0, 10, 25];
// A worker's own idle-processing speed bonus, compounding per level of
// whatever skill their current station trains (2026-09-04, per the
// request) -- 1.01 = +1% faster per level, stacking multiplicatively, so
// a level-100 skill (MAX_SKILL_LEVEL, skills.js) is roughly 2.7x the
// base villager speed. Distinct from GROWTH_PER_LEVEL (skills.js), which
// is the *player's own* linear per-level speedup on a manual tap --
// "idle speed" in the request specifically meant the villager's own
// automatic attempts, not shared with the player's. See workers.js's own
// workerSpeedMult().
export const WORKER_LEVEL_SPEED_MULT = 1.01;

// A House -- built at Township, any number of times, same "flat repeating
// purchase" shape Beehive's own honey-slot expansion already uses -- each
// one raises workerCap() by HOUSE_WORKER_SLOTS (villager slots are now
// entirely house-derived, no separate base cap on top -- see workerCap()
// in workers.js). The player starts with one House already built, so the
// starting cap is exactly HOUSE_WORKER_SLOTS. Bronze Nails doesn't exist
// yet (the user's own placeholder, "a material added later in the bronze
// age"), so this is real, priced data with one ingredient nothing
// currently produces -- same "real spot, nothing behind it yet" treatment
// Oak Planks/Fine String already got for the Fishing Rod.
export const HOUSE_COST = { "Birch Planks": 6, "Bronze Nails": 12 };
export const HOUSE_WORKER_SLOTS = 3;

// -------------------------------------------------------------- upkeep
//
// A hired villager doesn't work for free -- every VILLAGE_UPKEEP_MS (24h),
// the village draws VILLAGE_UPKEEP_FOOD food units and VILLAGE_UPKEEP_HEAT
// heat units *per villager currently hired* (Foraging Villager plus every
// worker in state.workers -- src/township.js's settleVillageUpkeep() is
// what actually multiplies by headcount) from whatever the player has
// donated (state.village.food/heat, src/township.js's donate flow). Food
// units come straight off FOODS' own `heal` value (1 HP healed = 1 food
// unit -- the same number, not a second one to keep in sync); heat units
// come off VILLAGE_HEAT_VALUE below. Falling short on either at the 24h
// mark doesn't refund or partially apply -- every villager simply stops
// auto-working (src/forage.js and src/workers.js both check
// state.village.starved) until enough of both is donated to clear the very
// upkeep that was missed, same "resolves the instant it's true, not
// retroactively" rule every other deadline in this game follows.
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
  // Balance pass (2026-09-01): Flint tools down from 20/20 to 10/10 raw
  // Flint/Sticks. Stone tools switched from raw Stone/Pine Logs to their
  // own processed forms -- Stone Block (Stone Cutter) and Pine Planks
  // (Sawmill) -- a real conversion chain now, not a shortcut straight off
  // gathered materials, same reasoning Net's own String cost already
  // follows below.
  flintAxe:     { name: "Flint Axe",     cost: { "Flint": 10, "Sticks": 10 } },
  flintPickaxe: { name: "Flint Pickaxe", cost: { "Flint": 10, "Sticks": 10 } },
  stonePickaxe: { name: "Stone Pickaxe", cost: { "Stone Block": 9, "Pine Planks": 9 } },
  stoneAxe:     { name: "Stone Axe",     cost: { "Stone Block": 9, "Pine Planks": 9 } },
  // Scrap tools (2026-09-02) -- Scrap Metal, the first tools to use it
  // (Road Goblin's own drop) as a cost rather than just referencing it in
  // a not-yet-real PICKAXES entry. Switched from Pine Planks to Birch
  // Planks (2026-09-04, per the request) -- Birch Planks' own recipe
  // still needs a Pine Plank as one of its ingredients (see STATIONS.
  // birchPlanks), so this reads as a real upgrade tier built *on top of*
  // Pine, not a parallel track that skips it.
  scrapPickaxe: { name: "Scrap Pickaxe", cost: { "Birch Planks": 10, "Scrap Metal": 8 } },
  scrapAxe:     { name: "Scrap Axe",     cost: { "Birch Planks": 10, "Scrap Metal": 8 } },
  // Same cost as its two scrap siblings above, per the request ("built
  // with the same resources"). +8 capacity over the Wooden Can's 4 (see
  // CANS below); refills through the same shared CAN_REFILL_MS everything
  // else already uses, so "same amount of time to refill" needed no extra
  // code at all.
  scrapWateringCan: { name: "Scrap Watering Can", cost: { "Birch Planks": 10, "Scrap Metal": 8 } },
  flintDagger:  { name: "Flint Dagger",  cost: { "Flint": 15, "Sticks": 10 } },
  woodenBuckler:{ name: "Wooden Buckler", cost: { "Sticks": 20, "Stone": 10 } },
  paddedVest:   { name: "Padded Vest",   cost: { "Sticks": 20, "Flint": 15 } },
  // Scrap armor set (2026-09-02) -- 2 defense each per the request, Scrap
  // Metal + Leather (Tanning Station's own output off Animal Hide). Helm
  // priced a little below Armor/Legs, same shape Highland's own Cloak
  // (cheaper) vs. Chest/Legs already set.
  scrapHelm:    { name: "Scrap Helm",    cost: { "Scrap Metal": 6, "Leather": 4 } },
  scrapArmor:   { name: "Scrap Armor",   cost: { "Scrap Metal": 8, "Leather": 6 } },
  scrapLegs:    { name: "Scrap Legs",    cost: { "Scrap Metal": 8, "Leather": 6 } },
  stonePlate:   { name: "Stone Plate",   cost: { "Stone": 25, "Pine Logs": 15 } },
  // Fishing's three tools -- see FISHING section near the bottom of this
  // file for what actually tells them apart. Net needs String (Spinning
  // Wheel output) and Birch Logs (Forest Road logging) -- both a real
  // conversion/gather chain, not a shortcut, same reasoning every other
  // station-fed recipe already follows, and it's back on the Craft Bench
  // (see index.html) since it now has real inputs behind it.
  // Fishing Rod switched (2026-09-02) from Sticks/String to Oak Planks and
  // Fine String -- neither has a real source in the game yet (see the
  // "Oak Planks"/"Fine String" TINTS comment above), so this recipe is
  // real data with nothing to craft it from until one exists, same "real
  // spot, nothing behind it yet" story most of this game's forward-
  // referenced content follows. Quantities are a first-pass guess.
  fishingRod: { name: "Fishing Rod", cost: { "Oak Planks": 10, "Fine String": 8 } },
  net:        { name: "Net",         cost: { "String": 15, "Birch Logs": 5 } },
  trap:       { name: "Trap",        cost: { "Sticks": 20, "Flint": 5 } },
  // Bait -- Rod-only (see canFishHere()/rollFish() in fishing.js). Net and
  // Trap don't take bait on purpose: they're the bulk/passive tools, bait
  // is what makes the skill-based tool worth the extra attention.
  wormBait:   { name: "Worm Bait",   cost: { "Sticks": 5 } },
  shinyLure:  { name: "Shiny Lure",  cost: { "Flint": 10, "String": 5 } },
  // Adds +3 bag slots while owned -- not consumed, not equipped, just
  // carried (see BAG_SLOT_BONUS above and state.js's bagSlotCap()). The
  // first real BAG_SLOT_BONUS entry.
  highlandSack: { name: "Highland Sack", cost: { "Cloth": 5 } },
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
// with no item that can fill them yet -- a real spot, nothing behind it
// yet, not an oversight (same treatment Stone Cutter's own hub card got
// before it had a real station behind it). Armor split from one slot into
// Chest specifically (not a generic "armor" slot) because Helm and Legs
// are real, separate spots on
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
  "Scrap Axe": "axe",
  "Wooden Can": "can",
  "Scrap Watering Can": "can",
  "Wooden Pickaxe": "pick",
  "Flint Pickaxe": "pick",
  "Stone Pickaxe": "pick",
  "Scrap Pickaxe": "pick",
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
  // Two-handed (WEAPONS' own "twoHanded" above) -- equipping it into
  // either arm slot blocks the other one outright (inventory.js's
  // armBlockedBy(), already generic over any twoHanded weapon), same as
  // any other two-handed weapon would.
  "Short Bow": "arm",
  "Padded Vest": "chest",
  "Stone Plate": "chest",
  // The first items to actually fill the Helm and Legs slots -- both have
  // sat reserved on the Equipment layout with nothing to put in them
  // since before this armor set existed, same "real spot, nothing behind
  // it yet" story the Fishing Rod slot had until Fishing shipped.
  "Highland Cloak": "helm",
  "Highland Chest": "chest",
  "Highland Legs": "legs",
  "Scrap Helm": "helm",
  "Scrap Armor": "chest",
  "Scrap Legs": "legs",
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
  "Honey": "food",
  // Cooked fish only -- raw fish aren't equippable/edible, same rule
  // Poultry/Beef/Mutton already set (see FOODS below).
  "Cooked Minnow": "food", "Cooked River Trout": "food", "Cooked Catfish": "food",
  "Cooked Golden Carp": "food", "Cooked Moonfin Eel": "food",
  "Cooked Mudscale Perch": "food", "Cooked Reed Sunfish": "food", "Cooked Bog Loach": "food",
  "Cooked Golden Koi": "food", "Cooked Moonpond Eel": "food",
  "Cooked Lake Herring": "food", "Cooked Silverback Bass": "food", "Cooked Deepwater Pike": "food",
  "Cooked Golden Sturgeon": "food", "Cooked Moonveil Trout": "food",
  "Cooked Brook Char": "food", "Cooked Speckled Dace": "food", "Cooked Stonefly Grayling": "food",
  "Cooked Golden Grayling": "food", "Cooked Moonshadow Char": "food",
  "Cooked Saltback Herring": "food", "Cooked Reef Snapper": "food", "Cooked Tideskimmer Mackerel": "food",
  "Cooked Golden Marlin": "food", "Cooked Moontide Eel": "food",
};

// Same idea as PICKAXES: capacity lives on the equipped item, not a flat
// constant, so a better can down the line is a matter of adding a tier here
// and letting canmeter.js pick it up automatically -- nothing about Farm or
// Logging needs to change. Only one tier exists yet; its capacity matches
// the CAN_CAPACITY every can used to share before this was per-item.
export const CANS = {
  "Wooden Can": { capacity: CAN_CAPACITY },
  // 12 charges per the request -- 3x the Wooden Can's own 4. Refills
  // through the same shared CAN_REFILL_MS canmeter.js already uses for
  // every can, so "same amount of time to refill" is already true with
  // no separate number needed here.
  "Scrap Watering Can": { capacity: 12 },
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
  // Scrap Pickaxe is real and craftable now (2026-09-02, was the
  // placeholder "Scrap Metal Pickaxe" here, renamed to match the plain
  // "Material + Pickaxe" convention every other tier already uses) --
  // Scrap Metal exists (Road Goblin's own drop) to make one from. maxDepth
  // 400 puts Copper/Tin Ore (both minDepth 100, no cap of their own) in
  // reach and just touches Iron Ore's own 400 floor. Faster than Stone
  // Pickaxe's 4000ms per the request, not just a hair -- a full second
  // quicker, not a token 500ms.
  "Scrap Pickaxe": { maxDepth: 400, ms: 3000, riskPerSwing: 0.10, depthPerSwing: 25 },
  // The rest are still placeholders -- no Bronze, Iron ingot, Gold bar or
  // Scorn material exists to make any of them from yet. `ms` continues
  // the same decreasing trend as before, tapering off once it's already
  // fast.
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
// Attack now fires on its own (2026-09-04) -- the moment the player's own
// cooldown clears, this is how much real time they get to tap Defend/Eat/
// Flee *instead* before combat.js's settleCombat() attacks on their
// behalf. Defend and Eat stay real, deliberate choices (nothing about
// them changed), this is just a fallback so Attack itself never has to be
// tapped by hand -- including the very first hit of a fight, which used
// to need an exact-timed tap the instant the enemy appeared.
export const COMBAT_AUTO_ATTACK_DELAY_MS = 1200;

export const WEAPONS = {
  "Flint Dagger": { atkMin: 4, atkMax: 8, twoHanded: false },
  // The first bow (2026-09-02) -- `ranged: true` is the one new field:
  // combat.js's endFight() reads it on a win to decide whether the kill
  // feeds Archery or Melee (anything without it, unarmed included, counts
  // as Melee by default). `twoHanded: true` isn't new machinery at all --
  // inventory.js's armBlockedBy() already greys out the other Hand slot
  // and blocks a shield from going there for any two-handed weapon, the
  // exact same way it already would for one. A little stronger than Flint
  // Dagger, first-pass.
  // `ammo` (2026-09-03) -- combat.js's attack() spends one of this exact
  // item straight from the bag per shot (not equipped, just owned, same
  // "check the bag directly" rule Fishing's own Net/Trap already use for
  // themselves), and blocks Attack outright once it's out, same "disabled
  // until you have what the action needs" rule Eat already follows for
  // food. Every `ranged` weapon needs one; melee weapons don't have the
  // field at all.
  "Short Bow": { atkMin: 5, atkMax: 9, twoHanded: true, ranged: true, ammo: "Flint Arrows" },
};
export const ARMORS = {
  "Padded Vest": { defense: 2, recoveryMult: 0.9 },
  "Stone Plate": { defense: 6, recoveryMult: 1.35 },
  "Highland Cloak": { defense: 1, recoveryMult: 1 },
  "Highland Chest": { defense: 1, recoveryMult: 1 },
  "Highland Legs":  { defense: 1, recoveryMult: 1 },
  // 2 defense each per the request -- no recoveryMult penalty, same
  // "new tier, no tradeoff" treatment Highland's own three pieces got.
  "Scrap Helm":  { defense: 2, recoveryMult: 1 },
  "Scrap Armor": { defense: 2, recoveryMult: 1 },
  "Scrap Legs":  { defense: 2, recoveryMult: 1 },
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
// `recoveryBoostAttacks`/`recoveryBoostMult` are optional -- Honey is the
// first food with either (2026-09-02): eating it also sets
// state.combat.honeyBoost to `recoveryBoostAttacks`, and combat.js's own
// recoveryMs() multiplies by `recoveryBoostMult` for as long as that
// counter is still above 0, ticking down once per Attack specifically
// (not Defend/Eat/Flee -- "next 5 attacks" per the request). First-pass
// number, not balanced -- a "noticeably faster, not broken" speed-up.
export const FOODS = {
  "Berries": { heal: 1 },
  "Red Berries": { heal: 1 },
  "Cooked Berries": { heal: 3 },
  "Cooked Poultry": { heal: 5 },
  "Cooked Beef": { heal: 5 },
  "Cooked Mutton": { heal: 5 },
  "Honey": { heal: 5, recoveryBoostAttacks: 5, recoveryBoostMult: 0.75 },
  // Every pool's three standard fish heal 5 (same as Cooked Poultry/Beef/
  // Mutton); every rare catch heals 10, every nightOnly catch heals 8 --
  // "greater bonuses when eaten in combat" per the request, applied as a
  // flat tier rather than a per-fish number so it stays consistent no
  // matter which pool a rare or night fish came from.
  "Cooked Minnow": { heal: 5 }, "Cooked River Trout": { heal: 5 }, "Cooked Catfish": { heal: 5 },
  "Cooked Golden Carp": { heal: 10 }, "Cooked Moonfin Eel": { heal: 8 },
  "Cooked Mudscale Perch": { heal: 5 }, "Cooked Reed Sunfish": { heal: 5 }, "Cooked Bog Loach": { heal: 5 },
  "Cooked Golden Koi": { heal: 10 }, "Cooked Moonpond Eel": { heal: 8 },
  "Cooked Lake Herring": { heal: 5 }, "Cooked Silverback Bass": { heal: 5 }, "Cooked Deepwater Pike": { heal: 5 },
  "Cooked Golden Sturgeon": { heal: 10 }, "Cooked Moonveil Trout": { heal: 8 },
  "Cooked Brook Char": { heal: 5 }, "Cooked Speckled Dace": { heal: 5 }, "Cooked Stonefly Grayling": { heal: 5 },
  "Cooked Golden Grayling": { heal: 10 }, "Cooked Moonshadow Char": { heal: 8 },
  "Cooked Saltback Herring": { heal: 5 }, "Cooked Reef Snapper": { heal: 5 }, "Cooked Tideskimmer Mackerel": { heal: 5 },
  "Cooked Golden Marlin": { heal: 10 }, "Cooked Moontide Eel": { heal: 8 },
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
  "Birch Cones": "logging", "Birch Logs": "logging",
  "Scrap Pickaxe": "crafting", "Scrap Axe": "crafting", "Scrap Watering Can": "crafting",
  "Scrap Helm": "crafting", "Scrap Armor": "crafting", "Scrap Legs": "crafting",
  "Short Bow": "fletcher", "Flint Arrows": "fletcher",
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
  "Yarn": "sowing", "Fabric": "weaving",
  "Leather": "tanning", "Cloth": "sowing",
  "Bonemeal": "grinding",
  "Queen Bee": "foraging", "Honey": "beekeeping",
  "Cooked Poultry": "cooking", "Cooked Beef": "cooking", "Cooked Mutton": "cooking",
  "Fishing Rod": "crafting", "Net": "crafting", "Trap": "crafting",
  "Worm Bait": "crafting", "Shiny Lure": "crafting",
  "Minnow": "fishing", "River Trout": "fishing", "Catfish": "fishing",
  "Golden Carp": "fishing", "Moonfin Eel": "fishing",
  "Mudscale Perch": "fishing", "Reed Sunfish": "fishing", "Bog Loach": "fishing",
  "Golden Koi": "fishing", "Moonpond Eel": "fishing",
  "Lake Herring": "fishing", "Silverback Bass": "fishing", "Deepwater Pike": "fishing",
  "Golden Sturgeon": "fishing", "Moonveil Trout": "fishing",
  "Brook Char": "fishing", "Speckled Dace": "fishing", "Stonefly Grayling": "fishing",
  "Golden Grayling": "fishing", "Moonshadow Char": "fishing",
  "Saltback Herring": "fishing", "Reef Snapper": "fishing", "Tideskimmer Mackerel": "fishing",
  "Golden Marlin": "fishing", "Moontide Eel": "fishing",
  "Cooked Minnow": "cooking", "Cooked River Trout": "cooking", "Cooked Catfish": "cooking",
  "Cooked Golden Carp": "cooking", "Cooked Moonfin Eel": "cooking",
  "Cooked Mudscale Perch": "cooking", "Cooked Reed Sunfish": "cooking", "Cooked Bog Loach": "cooking",
  "Cooked Golden Koi": "cooking", "Cooked Moonpond Eel": "cooking",
  "Cooked Lake Herring": "cooking", "Cooked Silverback Bass": "cooking", "Cooked Deepwater Pike": "cooking",
  "Cooked Golden Sturgeon": "cooking", "Cooked Moonveil Trout": "cooking",
  "Cooked Brook Char": "cooking", "Cooked Speckled Dace": "cooking", "Cooked Stonefly Grayling": "cooking",
  "Cooked Golden Grayling": "cooking", "Cooked Moonshadow Char": "cooking",
  "Cooked Saltback Herring": "cooking", "Cooked Reef Snapper": "cooking", "Cooked Tideskimmer Mackerel": "cooking",
  "Cooked Golden Marlin": "cooking", "Cooked Moontide Eel": "cooking",
  "Oak Planks": "milling", "Fine String": "sowing",
  "Birch Planks": "milling", "Bronze Nails": "mining",
};

// -------------------------------------------------------------- currency
//
// Scaffolding only (2026-09-02) -- Shards (state.shards) are still the
// only denomination anything in the game actually earns, prices, or
// spends. These three sit ready for later: each one's `worth` is how many
// of the *previous* tier one of it is worth, chaining shards -> marks ->
// crowns -> spires the same way coins step up to bills, not four
// independent currencies. (The request's own numbers had crowns and
// spires both worth "100 marks" -- read here as the obvious continuation
// of the x100 chain, spires worth 100 crowns, since two denominations
// worth the same amount would make one of them pointless to have named at
// all.) `state.marks`/`state.crowns`/`state.spires` exist and save/load
// (see state.js) so a future feature can start awarding/spending them
// without another state-shape pass -- nothing yet does, and no UI shows
// them (hub.js's wallet note is still Shards-only), on purpose, per "they
// don't all need to show up now."
export const CURRENCIES = {
  shards: { name: "Shards", field: "shards" },
  marks:  { name: "Marks",  field: "marks",  worth: 100 },   // 1 Mark   = 100 Shards
  crowns: { name: "Crowns", field: "crowns", worth: 100 },   // 1 Crown  = 100 Marks  (10,000 Shards)
  spires: { name: "Spires", field: "spires", worth: 100 },   // 1 Spire  = 100 Crowns (1,000,000 Shards)
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
  "Scrap Pickaxe": 130, "Scrap Axe": 130, "Scrap Watering Can": 130,
  "Wooden Pickaxe": 1, "Wooden Axe": 1, "Wooden Can": 1,
  "Flint Dagger": 45, "Wooden Buckler": 40, "Padded Vest": 55, "Stone Plate": 95,
  "Highland Cloak": 25, "Highland Chest": 25, "Highland Legs": 25,
  "Scrap Helm": 45, "Scrap Armor": 45, "Scrap Legs": 45,
  "Short Bow": 65, "Flint Arrows": 3,
  "Birch Cones": 12, "Birch Logs": 14,
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
  "Bones": 4, "Bonemeal": 16, "Feathers": 3, "Raw Poultry": 8,
  "Queen Bee": 60, "Honey": 15,
  "Animal Hide": 12, "Raw Beef": 14, "Leather": 22,
  "Wool": 10, "Raw Mutton": 12, "Cloth": 18,
  "Yarn": 14, "Fabric": 26,
  "Cooked Poultry": 14, "Cooked Beef": 22, "Cooked Mutton": 20,
  "Scrap Metal": 20,
  "Fishing Rod": 1, "Net": 1, "Trap": 1,
  "Worm Bait": 4, "Shiny Lure": 20,
  // Common < uncommon < rare < the one night-only catch, same "worth more
  // because it's harder to get" logic ore/gem tiers already follow -- and
  // now the same shape repeated across all five pools, each pool's own
  // three standard fish sitting a little higher than the last: Pond <
  // River < Stream < Lake < Ocean. Cooked value is roughly raw x1.7, same
  // premium Cooked Poultry (14) already carries over Raw Poultry (8).
  "Minnow": 4, "River Trout": 10, "Catfish": 16,
  "Golden Carp": 60, "Moonfin Eel": 45,
  "Mudscale Perch": 3, "Reed Sunfish": 6, "Bog Loach": 10,
  "Golden Koi": 35, "Moonpond Eel": 28,
  "Lake Herring": 6, "Silverback Bass": 14, "Deepwater Pike": 20,
  "Golden Sturgeon": 70, "Moonveil Trout": 55,
  "Brook Char": 4, "Speckled Dace": 9, "Stonefly Grayling": 14,
  "Golden Grayling": 50, "Moonshadow Char": 38,
  "Saltback Herring": 9, "Reef Snapper": 18, "Tideskimmer Mackerel": 28,
  "Golden Marlin": 100, "Moontide Eel": 78,
  "Cooked Minnow": 7, "Cooked River Trout": 17, "Cooked Catfish": 27,
  "Cooked Golden Carp": 100, "Cooked Moonfin Eel": 75,
  "Cooked Mudscale Perch": 5, "Cooked Reed Sunfish": 10, "Cooked Bog Loach": 16,
  "Cooked Golden Koi": 58, "Cooked Moonpond Eel": 46,
  "Cooked Lake Herring": 10, "Cooked Silverback Bass": 23, "Cooked Deepwater Pike": 33,
  "Cooked Golden Sturgeon": 116, "Cooked Moonveil Trout": 91,
  "Cooked Brook Char": 7, "Cooked Speckled Dace": 15, "Cooked Stonefly Grayling": 23,
  "Cooked Golden Grayling": 83, "Cooked Moonshadow Char": 63,
  "Cooked Saltback Herring": 15, "Cooked Reef Snapper": 30, "Cooked Tideskimmer Mackerel": 47,
  "Cooked Golden Marlin": 166, "Cooked Moontide Eel": 129,
  "Oak Planks": 12, "Fine String": 10,
  "Birch Planks": 14, "Bronze Nails": 8,
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
  // Balance pass (2026-09-01): Spinning Wheel and Township both switched
  // from raw gathered materials to Scrap Metal/Basalt Block/Pine Planks --
  // real conversion-chain costs now, not shortcuts straight off Foraging/
  // Logging. Stone Cutter's own Stone cost came down from 25 to 18; its
  // Sticks cost is unchanged.
  spinningWheel: {
    name: "Spinning Wheel",
    cost: { "Scrap Metal": 6, "Pine Planks": 15 },
  },
  sawmill: {
    name: "Sawmill",
    cost: { "Sticks": 15, "Flint": 10 },
  },
  stoneCutter: {
    name: "Stone Cutter",
    cost: { "Stone": 18, "Sticks": 10 },
  },
  tanningStation: {
    name: "Tanning Station",
    cost: { "Sticks": 15, "Animal Hide": 5 },
  },
  // Dropped from Basalt Block/Pine Planks to raw Stone/Sticks (2026-09-04)
  // -- both straight off Mining/Foraging, no conversion chain required, so
  // Township (and every worker villager gated behind it) unlocks much
  // earlier than the other processed-material stations around it.
  township: {
    name: "Township",
    cost: { "Stone": 10, "Sticks": 10 },
  },
  armorBench: {
    name: "Armor Bench",
    cost: { "Basalt Block": 9, "Pine Planks": 12 },
  },
  // Numbers not given in the request -- first-pass, matching the same
  // tier of processed-material cost Township/Armor Bench both use rather
  // than inventing a new price shape.
  grindStone: {
    name: "Grind Stone",
    cost: { "Basalt Block": 6, "Pine Planks": 9 },
  },
  beehive: {
    name: "Beehive",
    cost: { "Queen Bee": 1, "Sticks": 20 },
  },
  fletchingBench: {
    name: "Fletching Bench",
    cost: { "Basalt Block": 7, "Pine Planks": 10 },
  },
  // "Same as the Spinning Wheel" per the request -- same Scrap Metal/Pine
  // Planks cost, literally, not just the same shape.
  loom: {
    name: "Loom",
    cost: { "Scrap Metal": 6, "Pine Planks": 15 },
  },
};

// ---------------------------------------------------------------- beehive
//
// Doesn't go through the generic STATIONS registry above -- every other
// entry there is a *fixed* set of named recipes, but the Beehive's whole
// point is a *growing* number of identical Honey slots the player buys
// one at a time (src/beehive.js, same array-of-independent-timers shape
// state.plots/state.logPlots already use, not a single state.stations[id]
// slot). One tap starts a slot's own BEEHIVE_HONEY_MS timer -- no material
// cost, unlike every other station's recipe, since a beehive is meant to
// read as passive production once it exists, not something fed each
// batch. Buying another slot (BEEHIVE_EXPAND_COST) is flat, not doubling
// like Farm/Logging's own plot expansion -- only one price was ever
// given, not an escalating series. First-pass numbers throughout.
export const BEEHIVE_HONEY_MS = 15 * 60 * 1000;
export const BEEHIVE_EXPAND_COST = { "Queen Bee": 1, "Sticks": 10 };
export const BEEHIVE_XP = 15;

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
  // Yarn's own recipe -- a third Spinning Wheel recipe, same "second/third
  // recipe sharing a station" shape String/Cloth already established.
  // Wool already drops off Highland Sheep (see ENEMIES below), so unlike
  // some of this file's other "real spot, nothing behind it yet" entries,
  // Yarn has a real source from the moment it exists.
  yarn: {
    screenTitle: "Spinning Wheel", screenSub: "Turn flax into string",
    actionName: "Yarn",
    cost: { "Wool": 3 }, output: "Yarn", ms: 9000, xp: 11,
    skillXp: "sowingXp", skillName: "Sowing",
  },
  sawmill: {
    screenTitle: "Sawmill", screenSub: "Turn pine logs into pine planks",
    actionName: "Pine Planks",
    input: "Pine Logs", inputQty: 3, output: "Pine Planks", ms: 10000, xp: 10,
    skillXp: "millingXp", skillName: "Woodcutting",
  },
  // Needs a Pine Plank alongside the Birch Logs, not just Birch Logs
  // alone -- per the request, literally: "3 Birch Logs and 1 Pine Plank."
  // Second recipe sharing the Sawmill's own screen and skill, same shape
  // Stone Cutter/Armor Bench/Fletching Bench already established.
  birchPlanks: {
    screenTitle: "Sawmill", screenSub: "Turn pine logs into pine planks",
    actionName: "Birch Planks",
    cost: { "Birch Logs": 3, "Pine Planks": 1 }, output: "Birch Planks", ms: 10000, xp: 12,
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
  // Bones -> Bonemeal, the first fertilizer item (see FERTILIZERS below
  // and field.js's fertilize()). Same generic single-recipe shape as the
  // Sawmill/plain Stone Cutter recipe -- new "Grinding" skill (SKILLS
  // above), its own screen.
  grindStone: {
    screenTitle: "Grind Stone", screenSub: "Grind bones into bonemeal",
    actionName: "Bonemeal",
    cost: { "Bones": 3 }, output: "Bonemeal", ms: 10000, xp: 10,
    skillXp: "grindingXp", skillName: "Grinding",
  },
  // Two recipes sharing one screen and one skill (Fletcher), same shape
  // Stone Cutter/Armor Bench already established. Flint Arrows is the
  // first STATIONS entry to grant more than one unit per cycle --
  // `outputQty` (stations.js's settleStations()), same "general form,
  // falls back to 1" shape `cost`/`inputQty` already follow.
  shortBow: {
    screenTitle: "Fletching Bench", screenSub: "Craft bows and arrows",
    actionName: "Short Bow",
    cost: { "Pine Planks": 12, "String": 10 }, output: "Short Bow", ms: 12000, xp: 12,
    skillXp: "fletcherXp", skillName: "Fletcher",
  },
  flintArrows: {
    screenTitle: "Fletching Bench", screenSub: "Craft bows and arrows",
    actionName: "Flint Arrows",
    cost: { "Sticks": 1, "Flint": 1, "Feathers": 1 },
    output: "Flint Arrows", outputQty: 3, ms: 6000, xp: 6,
    skillXp: "fletcherXp", skillName: "Fletcher",
  },
  // Two recipes, one screen, one skill (Weaving) -- same shape Stone
  // Cutter/Armor Bench/Fletching Bench already established. Cloth already
  // has a second, unrelated source (clothSpinner above, Wool at the
  // Spinning Wheel) -- nothing about the STATIONS registry requires an
  // output be unique to one recipe, so both just coexist.
  loomCloth: {
    screenTitle: "Loom", screenSub: "Weave string and yarn into cloth",
    actionName: "Cloth",
    cost: { "String": 5 }, output: "Cloth", ms: 11000, xp: 12,
    skillXp: "weavingXp", skillName: "Weaving",
  },
  loomFabric: {
    screenTitle: "Loom", screenSub: "Weave string and yarn into cloth",
    actionName: "Fabric",
    cost: { "Yarn": 5 }, output: "Fabric", ms: 13000, xp: 15,
    skillXp: "weavingXp", skillName: "Weaving",
  },
};

// --------------------------------------------------------- worker villagers
// One assignable worker per profession-shaped role (see WORKER_TICK_MULT
// above and src/workers.js for the assign/tick mechanics). `building` is
// the BUILDINGS id that has to be built before this role is even
// assignable -- the worker's whole job is standing at a station that has
// to physically exist first (null for the Forager, who needs no building
// at all). `stationIds` names an ordered list of every STATIONS recipe
// this role can eventually run, tier 0 being what it works the moment
// it's assigned -- which tiers beyond that are currently unlocked is read
// straight off the role's own skill level (WORKER_TIER_LEVELS above, see
// workers.js's unlockedStationIds()), not anything paid per-worker. Cook
// and Beekeeper have no `stationIds` at all -- both are bespoke systems
// (Campfire, Beehive) rather than a fixed STATIONS recipe list, so
// neither has tiers to unlock; see workers.js's own maxLevelFor() for how
// a missing `stationIds` reads as a flat max level of 1 (always "MAX" the
// moment it's assigned).
//
// `unlockLevel` (optional) gates the whole role behind a skill level
// before it can be assigned at all, regardless of whether its building
// exists -- checked against the skill named by `skillXp`/`skillName` for
// a bespoke role (only the Forager has one so far, per the request:
// "currently the only villager to unlock is the forager"), or the first
// stationIds entry's own STATIONS skill for a tiered role. See
// workers.js's roleUnlocked()/roleSkill().
export const WORKERS = {
  // Merged in (2026-09-04, second pass) from the old standalone Foraging
  // Villager (state.villager) -- now just another assignable profession,
  // competing for the same house-derived slots as everyone else, single-
  // tier (no stationIds -- there's nothing to level into) and so already
  // "max level" the instant it's assigned, per the request. Its own
  // auto-gather cycle still lives in forage.js (settleForage()), not the
  // generic attemptRole() below -- see that file's own comments.
  forager: {
    name: "Forager", icon: "\u{1F9D1}\u{200D}\u{1F33E}",
    building: null,
    skillXp: "foragingXp", skillName: "Foraging", unlockLevel: VILLAGER_LEVEL,
    note: "Forages on your own, even while you're away",
  },
  cook: {
    name: "Cook", icon: "\u{1F468}\u{200D}\u{1F373}",
    building: "campfire",
    note: "Cooks whatever fuel and food you've already picked at the Campfire",
  },
  spinster: {
    name: "Spinster", icon: "\u{1F9F6}",
    building: "spinningWheel", stationIds: ["spinningWheel", "clothSpinner", "yarn"],
    note: "Spins Flax into String",
  },
  mason: {
    name: "Mason", icon: "\u{1FAA8}",
    building: "stoneCutter", stationIds: ["stoneCutter", "basaltCutter"],
    note: "Cuts Stone into Stone Block",
  },
  millworker: {
    name: "Millworker", icon: "\u{1FA9A}",
    building: "sawmill", stationIds: ["sawmill", "birchPlanks"],
    note: "Saws Pine Logs into Pine Planks",
  },
  miller: {
    name: "Miller", icon: "\u{1F9B4}",
    building: "grindStone", stationIds: ["grindStone"],
    note: "Grinds Bones into Bonemeal",
  },
  beekeeper: {
    name: "Beekeeper", icon: "\u{1F41D}",
    building: "beehive",
    note: "Starts a new batch of Honey the moment a slot's free",
  },
  // Base tier is Flint Arrows, not Short Bow -- "a villager that auto
  // crafts... Flint Arrows" was the original, explicit request; Short Bow
  // is the level-2 unlock.
  fletcher: {
    name: "Fletcher", icon: "\u{1FAB6}",
    building: "fletchingBench", stationIds: ["flintArrows", "shortBow"],
    note: "Crafts Flint Arrows",
  },
  tanner: {
    name: "Tanner", icon: "\u{1F97E}",
    building: "tanningStation", stationIds: ["tanningStation"],
    note: "Tans Animal Hide into Leather",
  },
  // Base tier is Cloth (loomCloth) -- "a villager that auto crafts cloth
  // called Weaver" was explicit about which of the Loom's two recipes
  // this one starts on; Fabric (loomFabric) is the level-2 unlock.
  weaver: {
    name: "Weaver", icon: "\u{1FAA1}",
    building: "loom", stationIds: ["loomCloth", "loomFabric"],
    note: "Weaves String into Cloth",
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
  // Same rule -- every raw fish across all five pools needs the Campfire
  // before it's edible/equippable at all.
  "Minnow": { gives: "Cooked Minnow" },
  "River Trout": { gives: "Cooked River Trout" },
  "Catfish": { gives: "Cooked Catfish" },
  "Golden Carp": { gives: "Cooked Golden Carp" },
  "Moonfin Eel": { gives: "Cooked Moonfin Eel" },
  "Mudscale Perch": { gives: "Cooked Mudscale Perch" },
  "Reed Sunfish": { gives: "Cooked Reed Sunfish" },
  "Bog Loach": { gives: "Cooked Bog Loach" },
  "Golden Koi": { gives: "Cooked Golden Koi" },
  "Moonpond Eel": { gives: "Cooked Moonpond Eel" },
  "Lake Herring": { gives: "Cooked Lake Herring" },
  "Silverback Bass": { gives: "Cooked Silverback Bass" },
  "Deepwater Pike": { gives: "Cooked Deepwater Pike" },
  "Golden Sturgeon": { gives: "Cooked Golden Sturgeon" },
  "Moonveil Trout": { gives: "Cooked Moonveil Trout" },
  "Brook Char": { gives: "Cooked Brook Char" },
  "Speckled Dace": { gives: "Cooked Speckled Dace" },
  "Stonefly Grayling": { gives: "Cooked Stonefly Grayling" },
  "Golden Grayling": { gives: "Cooked Golden Grayling" },
  "Moonshadow Char": { gives: "Cooked Moonshadow Char" },
  "Saltback Herring": { gives: "Cooked Saltback Herring" },
  "Reef Snapper": { gives: "Cooked Reef Snapper" },
  "Tideskimmer Mackerel": { gives: "Cooked Tideskimmer Mackerel" },
  "Golden Marlin": { gives: "Cooked Golden Marlin" },
  "Moontide Eel": { gives: "Cooked Moontide Eel" },
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
// same "real spot, nothing behind it yet" treatment Stone Cutter's own
// hub card used before it was real.
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
    stations: ["campfire", "spinningWheel", "sawmill", "stoneCutter", "tanningStation", "township", "armorBench", "grindStone", "beehive", "fletchingBench", "loom"],
    // No fishing at the farmstead itself, still -- meant to belong out in
    // the world, which as of 2026-09-02 it now does (see the other five
    // locations here). FISH_POOLS has five pool *types* now (river/pond/
    // lake/stream/ocean), not one per town -- whichever fits a location's
    // own geography is what its `fishing` points at.
    forage: "aerendell", fishing: null,
  },
  // `tree` (2026-09-04) -- which TREES key Logging grows here, read live
  // by logging.js's treeForCurrentLocation() the moment a plot starts a
  // fresh growth cycle. Absent everywhere else, same "falls back to pine"
  // rule LOCATIONS' own `forage`/`fishing` null-means-nothing fields
  // don't quite share, but the idea's the same: only the one location
  // that actually differs needs an entry at all.
  forestRoad: {
    name: "Forest Road", type: "wilderness", pos: { x: 1, y: 1 }, stations: [],
    forage: "forestRoad", fishing: "stream", tree: "birch",
  },
  thalBarak: { name: "Thal-Barak", type: "city", pos: { x: 0, y: 2 }, stations: [], forage: null, fishing: "river" },
  stilltidePass: { name: "Stilltide Pass", type: "wilderness", pos: { x: 1, y: 3 }, stations: [], forage: null, fishing: "river" },
  duunVaelBridge: { name: "Duun-Vael Bridge", type: "landmark", pos: { x: 0, y: 4 }, stations: [], forage: null, fishing: null },
  riverhold: { name: "Riverhold", type: "city", pos: { x: 1, y: 5 }, stations: [], forage: null, fishing: "river" },
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
  { id: "aerendell-forestRoad", from: "aerendell", to: "forestRoad", minutes: 5 },
  { id: "forestRoad-thalBarak", from: "forestRoad", to: "thalBarak", minutes: 15 },
  { id: "thalBarak-stilltidePass", from: "thalBarak", to: "stilltidePass", minutes: 5 },
  { id: "stilltidePass-duunVaelBridge", from: "stilltidePass", to: "duunVaelBridge", minutes: 15 },
  { id: "duunVaelBridge-riverhold", from: "duunVaelBridge", to: "riverhold", minutes: 15 },
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

// Reweights a whole *tier* for the Rod roll only (2026-09-02, was five
// named fish by hand) -- a flat multiplier on every entry in the current
// pool matching `tier`, applied before the weighted roll (see
// rollFish()/fishTier() in fishing.js), not a separate guaranteed-catch
// mechanic. Generalized once there were five pools to work across instead
// of just Aerendell's own: Worm Bait boosting two specific named river
// fish would've done nothing at all in a pond or an ocean. Consumed one
// per cast, same "spent on commit" rule everything else spendable in this
// game follows.
export const BAITS = {
  "Worm Bait": { tier: "standard", mult: 2 },
  "Shiny Lure": { tier: "rare", mult: 5 },
};

// One pool per location with `fishing` set (LOCATIONS above), one per
// fishing-hole *type* now (2026-09-02) rather than one per town -- "river"
// is the pool that used to be keyed "aerendell" (same five fish, unchanged
// stats, key renamed only) since it already read as a proper river catch.
// Same shape as FORAGE_POOLS, plus two flags a forage pool has no
// equivalent for:
//   `rare`      -- Rod-only (Net/Trap filter these out entirely).
//   `nightOnly` -- excluded from every roll unless isFishingNight()
//                  (src/time.js, 9pm-5am -- its own narrower window, not
//                  the general isNight() crops/combat read) is true;
//                  Rod-only in practice too, since Net/Trap's own
//                  common-only filter already drops it regardless of time.
// Weights don't need to sum to 1 -- rollFish() sums whatever's left after
// filtering and rolls against that total, so excluding nightOnly by day
// doesn't silently bias the remaining odds. Every pool repeats the same
// 0.45/0.30/0.16/0.05/0.04 shape the original river pool set -- first
// pass, not balanced, but at least consistent pool to pool.
export const FISH_POOLS = {
  river: [
    { item: "Minnow",      chance: 0.45 },
    { item: "River Trout", chance: 0.30 },
    { item: "Catfish",     chance: 0.16 },
    { item: "Golden Carp", chance: 0.05, rare: true },
    { item: "Moonfin Eel", chance: 0.04, nightOnly: true },
  ],
  pond: [
    { item: "Mudscale Perch", chance: 0.45 },
    { item: "Reed Sunfish",   chance: 0.30 },
    { item: "Bog Loach",      chance: 0.16 },
    { item: "Golden Koi",     chance: 0.05, rare: true },
    { item: "Moonpond Eel",   chance: 0.04, nightOnly: true },
  ],
  lake: [
    { item: "Lake Herring",     chance: 0.45 },
    { item: "Silverback Bass",  chance: 0.30 },
    { item: "Deepwater Pike",   chance: 0.16 },
    { item: "Golden Sturgeon",  chance: 0.05, rare: true },
    { item: "Moonveil Trout",   chance: 0.04, nightOnly: true },
  ],
  stream: [
    { item: "Brook Char",        chance: 0.45 },
    { item: "Speckled Dace",     chance: 0.30 },
    { item: "Stonefly Grayling", chance: 0.16 },
    { item: "Golden Grayling",   chance: 0.05, rare: true },
    { item: "Moonshadow Char",   chance: 0.04, nightOnly: true },
  ],
  ocean: [
    { item: "Saltback Herring",     chance: 0.45 },
    { item: "Reef Snapper",         chance: 0.30 },
    { item: "Tideskimmer Mackerel", chance: 0.16 },
    { item: "Golden Marlin",        chance: 0.05, rare: true },
    { item: "Moontide Eel",         chance: 0.04, nightOnly: true },
  ],
};
