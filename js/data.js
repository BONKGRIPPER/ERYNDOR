/* =========================================================
   data.js — ALL GAME CONTENT
   Add new resources, cards, items, enemies, stations here.
   Nothing in this file knows about the DOM or the loop.
   ========================================================= */
(function (G) {
  'use strict';

  G.TUNE = {
    cardInterval: 2100,      // ms per card at normal speed
    dealTime: 220,
    windowTime: 1050,        // timing-window sweep duration
    /* clean-strike band. Position and width are rolled fresh for
       every card, so it can never be played by muscle memory. */
    bandMin: 0.09,           // narrowest the band gets
    bandMax: 0.15,           // widest
    bandEarliest: 0.22,      // band never starts before this
    bandLatest: 0.94,        // band never ends after this
    armorSetBandMult: 1.6,   // full scrap armor set widens the band
    harvestBandPerLv: 0.10,  // +10% band width per level of a card's own skill —
                              // this is how melee/archery reward leveling instead of
                              // raw damage scaling (their atk is fixed per card/tier)
                              // (foraging, mining, woodcut, melee, archery — see BAND_SKILLS, engine.js)
    maxHomes: 5,               // per zone
    villagerCapH: 12,          // villager output banks this many hours
    cookXp: 8,
    hireXp: 20,
    smeltMs: 2500,
    pinSlots: 3,
    baseCap: 100,
    encumberedMult: 2,       // card interval multiplier when over capacity
    baseHp: 10,
    handSize: 3,          // cards offered each turn
    cardsPerCraft: 1,     // deck cards gained per tool crafted
    tapCraftMs: 1800,     // ordinary station recipes: tap-to-craft cycle length
                          // (doubled from 900 — everything crafts twice as slow now)
    bonePrayerXp: 9, bonePrayerPoints: 1,
    buryMs: 5000,              // per bone, before Prayer speeds it up
    prayerSpeedPerLv: 0.005,   // +0.5% rate per level
    maxSkillLevel: 100,
    purgeCost: 3,
    deckCap: 30,           // hard ceiling on S.deck.length — a MAXIMUM, not a required size; you may sit below it
    maxCardCopies: 3,      // hard ceiling on copies of ONE card key in a single deck slot — collection is unlimited
    pinSlots: 3,
    zoneXpPerCard: 2,        // any card played grants the current zone this much xp
    zoneXpNeed: 20,          // flat xp needed for every zone level
    zoneDiscountPerLv: 0.01, // future hook — hub markets/crafting taxes read this
    zoneDiscountMax: 0.5,
    highlandSetXpMult: 1.25, // full Highland Robes set: +25% xp while in Leth-Eiren
    donateBatchSize: 5,      // Bag page Donate button: donates up to this many of each selected stack
    donateWorthPerXp: 50,    // cumulative worth donated before the Donate bar fills
    donateXpPerFill: 10,     // zone xp granted each time the Donate bar fills (was a flat +1)
    forageHerbMult: 0.5,     // Forage's flax/berries yield, applied after every other multiplier — seeds unaffected
    farmPlotsBase: 2,           // farm plots for free, before buying any more
    farmPlotsMax: 12,           // hard cap on total plots (base + bought)
    farmGrowSpeedPerLv: 0.02,   // -2% stage duration per farming level above 1
    farmGrowSpeedFloor: 0.4,    // stage duration never drops below this fraction of base
    farmWaterXp: 3,
    farmHarvestXp: 12,
    farmTickMs: 5000,           // how often the farmPlots ticker polls for stage completions
    /* Damage-type multipliers, used when a location lists a `weak` or
       `resist` entry as shorthand (an array of damage types) rather
       than explicit per-type numbers. See G.damageMult, engine.js.
       Nothing is assigned to any enemy yet — the system is inert. */
    weakMult: 2,             // damage multiplier against a type the target is weak to
    resistMult: 0.5,         // damage multiplier against a type the target resists
    marketBuyMult: 2,        // Market page: buy price = worth * this (sell is worth * 1)
    marketSellBatch: 5,      // Market page: Sell button moves up to this many of a stack per tap
    /* Real-time clock (systems/clock.js) — game hour IS the device's
       real hour. Day is [dayStartHour, nightStartHour); everything
       else is night. */
    dayStartHour: 7,
    nightStartHour: 21,
    /* Batch 3, real-time plan: enemies hit harder and drop more at
       night — the "prepare before you go" stakes the brief wants,
       tied to a real clock instead of a fixed danger zone. */
    nightAtkMult: 2,
    nightLootMult: 2,
  };

  /* ---- SKILLS -------------------------------------------------
     Add a skill: one entry here. UI + xp + levels are automatic. */
  G.SKILLS = {
    foraging: { name: 'Foraging',    tint: 'plant',  need: 24,
                perks: { 25: 'Gather & forage yield doubled', 50: 'Doubled again',
                         75: 'Doubled again', 100: 'Doubled again' } },
    mining:   { name: 'Mining',      tint: 'stone',  need: 24,
                perks: { 3: 'Stone yield +1', 5: 'Stone yield +1' } },
    woodcut:  { name: 'Woodcutting', tint: 'wood',   need: 24,
                perks: { 3: 'Logs yield +1', 5: 'Logs yield +1' } },
    /* Refining skills for the two raw-material stations (Sawmill,
       Stone Cutter) — separate from woodcut/mining above, which track
       actually swinging an axe/pick out in the field, not milling the
       result into blocks/planks at the station. */
    sawmilling:  { name: 'Wood Cutting',  tint: 'wood',  need: 24, perks: {} },
    stonecutting:{ name: 'Stone Cutting', tint: 'stone', need: 24, perks: {} },
    /* Attack used to be one skill covering both weapon types — split
       into melee and archery so a dedicated archer and a dedicated
       brawler actually level differently. Same shape, same curve. */
    melee:    { name: 'Melee',       tint: 'blood',  need: 28,
                perks: { 2: 'Strike sharper', 4: 'Melee power +1', 7: 'Melee power +1' } },
    archery:  { name: 'Archery',     tint: 'range',  need: 28,
                perks: { 2: 'Arrow sharper', 4: 'Ranged power +1', 7: 'Ranged power +1' } },
    prayer:   { name: 'Prayer',      tint: 'spirit', need: 32,
                perks: { 5: 'Bone offerings yield double points',
                         25: 'Bone offerings double again',
                         50: 'Bone offerings double again',
                         75: 'Deck moves nearly free',
                         100: 'Deck moves are free' } },
    cooking:  { name: 'Cooking',     tint: 'ember',  need: 28,
                perks: { 3: 'Less burning', 6: 'Fuel lasts longer' } },
    /* Villager slots start with 3 free and homes add more (see
       G.villagerSlots, data.js), not this skill's level — it still tracks how much
       hiring/settling you've done, just as a milestone, not a gate. */
    township: { name: 'Township',    tint: 'cloth',  need: 50,
                perks: { 2: 'Settlement recognized', 4: 'Settlement thriving' } },
    smithing: { name: 'Smithing',    tint: 'stone',  need: 36,
                perks: { 3: 'Faster smelting', 6: 'Occasional double bar' } },
    fletching:{ name: 'Fletching',   tint: 'wood',   need: 28,
                perks: { 3: 'Extra arrow per craft' } },
    /* 'Occasional double leather' used to live here, back when the
       tannery's recipes granted crafting xp — moved to its own
       tanning skill below now that leather-making is its own trade. */
    crafting: { name: 'Crafting',    tint: 'cloth',  need: 30,
                perks: { 3: 'Occasional double cloth' } },
    tanning:  { name: 'Tanning',     tint: 'wood',   need: 26,
                perks: { 3: 'Occasional double leather', 6: 'Salt lasts longer' } },
    /* Farming's bonuses are continuous per-level formulas (+1 plot
       every 5 levels, +2% growth speed per level — see farmPlotCount/
       farmGrowMs, systems/farm.js), not milestone perks like the
       skills above, so there's nothing to list here. */
    farming:  { name: 'Farming',     tint: 'plant',  need: 26, perks: {} },
  };

  /* ---- RESOURCES ---------------------------------------------
     wt = weight per unit. tint drives the pixel swatch colour.
     worth = abstract market value per unit, used by the Donate feature
     (Bag page — fills a zone-xp bar by cumulative worth donated) and
     any future trade/market system. Not currency you can spend today,
     just a relative-value scale: 1 for common raw drops, up to ~25 for
     gems. Keep new resources' worth consistent with the tier a new
     item's rarity/processing level actually sits at. */
  /* Every wt below is HALF the original value — a deliberate across-
     the-board pass to loosen carry-capacity pressure, not per-item
     balance. Keep new resources consistent with these halved scales
     rather than the design doc's original numbers.
     Rounded to 2 decimal places, not exact halves in every case —
     G.round2 (core.js) rounds S.weight to 2dp on every add/remove, so
     a wt with 3+ decimal digits (an exact half of 0.05 or 0.25) drifts
     for real over thousands of operations. Confirmed by test/weight.js's
     3000-op stress test before this fix. */
  G.RESOURCES = {
    stone:     { name: 'Stone',       wt: 1, tint: 'stone', worth: 1 },
    flint:     { name: 'Flint',       wt: 0.5, tint: 'stone', worth: 1 },
    stick:     { name: 'Sticks',      wt: 0.1, tint: 'wood', worth: 1 },
    wood:      { name: 'Logs',        wt: 0.5, tint: 'wood', worth: 1 },
    flax:      { name: 'Flax',        wt: 0.05, tint: 'plant', worth: 1 },
    berries:   { name: 'Red Berries', wt: 0.05, tint: 'blood', worth: 1 },
    string:    { name: 'String',      wt: 0.05, tint: 'cloth', worth: 2 },
    cloth:     { name: 'Cloth',       wt: 0.15, tint: 'cloth', worth: 3 },
    poultry:   { name: 'Raw Poultry', wt: 0.25, tint: 'meat', worth: 2 },
    cookedPoultry: { name: 'Cooked Poultry', wt: 0.25, tint: 'ember', worth: 3 },
    feathers:  { name: 'Feathers',    wt: 0.03, tint: 'cloth', worth: 1 },
    bone:      { name: 'Bones',       wt: 0.13, tint: 'bone', worth: 1 },
    flaxSeed:  { name: 'Flax Seeds',  wt: 0.05, tint: 'plant', worth: 1 },
    berrySeed: { name: 'Berry Seeds', wt: 0.05, tint: 'plant', worth: 1 },

    /* ores and smithing */
    tin:       { name: 'Tin Ore',     wt: 1, tint: 'stone', worth: 3 },
    copper:    { name: 'Copper Ore',  wt: 1, tint: 'meat', worth: 3 },
    charcoal:  { name: 'Charcoal',    wt: 0.13, tint: 'ember', worth: 2 },
    coal:      { name: 'Coal',        wt: 0.25, tint: 'stone', worth: 3 },
    scrapMetal:{ name: 'Scrap Metal', wt: 0.25, tint: 'stone', worth: 3 },
    bronzeBar: { name: 'Bronze Bar',  wt: 1, tint: 'wood', worth: 6 },

    /* gems — sellable later */
    diamond:   { name: 'Diamond',     wt: 0.05, tint: 'range', worth: 25 },
    ruby:      { name: 'Ruby',        wt: 0.05, tint: 'blood', worth: 20 },
    emerald:   { name: 'Emerald',     wt: 0.05, tint: 'plant', worth: 20 },

    /* hides and butchery */
    hide:        { name: 'Raw Hide',    wt: 0.5, tint: 'meat', worth: 2 },
    leather:     { name: 'Leather',     wt: 0.25, tint: 'wood', worth: 5 },
    animalFat:   { name: 'Animal Fat',  wt: 0.13, tint: 'cloth', worth: 2 },
    steak:       { name: 'Raw Steak',   wt: 0.25, tint: 'blood', worth: 3 },
    cookedSteak: { name: 'Cooked Steak',wt: 0.25, tint: 'ember', worth: 5 },
    pork:        { name: 'Raw Pork',    wt: 0.25, tint: 'meat', worth: 3 },
    cookedPork:  { name: 'Cooked Pork', wt: 0.25, tint: 'ember', worth: 5 },

    leatherScrap:{ name: 'Leather Scrap', wt: 0.1, tint: 'wood', worth: 2 },
    tanningSalt: { name: 'Tanning Salt',  wt: 0.1, tint: 'cloth', worth: 2 },
    tannedLeather:{ name: 'Tanned Leather', wt: 0.25, tint: 'meat', worth: 6 },
    bronzeNail:  { name: 'Bronze Nails',  wt: 0.03, tint: 'wood', worth: 3 },
    gold:        { name: 'Gold Coins',  wt: 0.01, tint: 'gold', worth: 10 },
    bronzeDagger:{ name: 'Bronze Dagger', wt: 0.5, tint: 'wood', worth: 8 },

    /* the finest wool in Eryndor — sheared off Aerendell's highland
       flocks, spun into cloth at the loom for end-game armor */
    highlandWool:  { name: 'Highland Wool',  wt: 0.15, tint: 'cloth', worth: 4 },
    highlandCloth: { name: 'Highland Cloth', wt: 0.2, tint: 'cloth', worth: 6 },

    /* ammunition */
    stoneArrow:{ name: 'Stone Arrow', wt: 0.05, tint: 'stone', worth: 1 },
    scrapArrow:{ name: 'Scrap Arrow', wt: 0.05, tint: 'wood', worth: 2 },

    /* stonework — Boulders drop a mix of these (see G.LOCATIONS.boulder),
       refined at the Stone Cutter (Aerendell) into blocks: Stone Blocks
       cost early weapons/tools, Basalt Blocks cost buildings/infra. */
    basalt:      { name: 'Basalt',       wt: 1, tint: 'stone', worth: 0.5 },
    stoneBlock:  { name: 'Stone Block',  wt: 2, tint: 'stone', worth: 2 },
    basaltBlock: { name: 'Basalt Block', wt: 2, tint: 'stone', worth: 3 },
    planks:      { name: 'Pine Planks',  wt: 1, tint: 'wood',  worth: 2 },
    birchLog:    { name: 'Birch Log',    wt: 0.5, tint: 'wood', worth: 1.5 },
    birchPlanks: { name: 'Birch Planks', wt: 1, tint: 'wood',  worth: 4 },
  };

  /* ---- CROPS -----------------------------------------------------
     Farm plots (Town tab). `region` region-locks a seed to one world
     region — G.plantSeed (systems/farm.js) enforces the current zone's
     parent region matches, not just the UI. `stages` is how many
     separate waterings a plot needs before
     it's ready to harvest (each stage takes `stageMs`, scaled down by
     farming skill level — see G.farmGrowMs). `yield` is a normal
     drop table, the same shape G.rollDrops already consumes for
     G.LOCATIONS (plain string or {key,min,max,chance}). */
  /* stageMs is the BASE time from watering to harvest — the farming
     skill still shortens it (G.farmGrowMs: -2% per level, floored at
     40% of base), so 120s is what an untrained farmer waits. */
  G.CROPS = {
    flaxSeed:  { name: 'Flax',        region: 'leth-eiren', stages: 1,
                 stageMs: 120 * 1000, yield: [{ key: 'flax', min: 5, max: 5 }] },
    berrySeed: { name: 'Red Berries', region: 'leth-eiren', stages: 1,
                 stageMs: 120 * 1000, yield: [{ key: 'berries', min: 5, max: 5 }] },
  };

  /* ---- CONSUMABLES ---------------------------------------------
     Items a card spends when it resolves. `group` lets the player
     pick a default in the Bag tab; cards ask for a group and get
     the selected item, or the strongest one they own.
     Add fire arrows later with:
       G.CONSUMABLES.fireArrow = { group:'ammo', dmg:3 }           */
  G.CONSUMABLES = {
    scrapArrow: { group: 'ammo', dmg: 2 },
    stoneArrow: { group: 'ammo', dmg: 1 },
  };
  G.CONSUMABLE_GROUPS = { ammo: { name: 'Arrows', usedBy: 'Loose Arrow cards' } };

  /* ---- USABLE ITEMS ---------------------------------------------
     Reserved for later zones' non-food usables:
     G.USABLES.myItem = { use: G.someEffect }
     Nothing reads this yet — the header hotbar that used to surface
     them is gone (food is played as an ordinary card now).          */
  G.USABLES = {};

  /* ---- FOOD ----------------------------------------------------
     heal = hp restored. raw items list `needsCooking` and cannot
     be eaten until converted.                                     */
  /* Food is not eaten from the bag any more — every one of these is
     an INGREDIENT for a food CARD (see G.CARDS' kind:'food' entries
     and the Campfire's card recipes). G.FOODS survives only as the
     "this is edible raw material" tag; `heal` here is legacy and no
     longer read by anything, since healing now lives on the card. */
  G.FOODS = {
    berries:       { heal: 1 },
    poultry:       { heal: 0, needsCooking: true },
    steak:         { heal: 0, needsCooking: true },
    pork:          { heal: 0, needsCooking: true },
  };

  /* ---- FISH ----------------------------------------------------
     The lookup G.isFish (core.js) reads to log catches into
     S.fishCaught for the Fish Journal. This table did not exist
     before — G.isFish was reading an undefined G.FISH and therefore
     always returned false, so the journal could never record
     anything (that's what test/fishing.js had been failing on).

     `rare: true` marks the single low-chance (1–2%) catch each water
     location hides — one per fishing region. Commons cook into a
     Cooked Fish card, rares into the stronger Cooked Rare Fish card.
     bass/catfish/whitefish/moonfin belong to `lake`, which no zone
     currently uses (orphaned content, see Known open questions), so
     they're listed for completeness but aren't obtainable yet. */
  G.FISH = {
    /* pond — Forest Road */
    bluegill: {}, perch: {}, carp: {}, goldenKoi: { rare: true },
    /* narrowStream / mossyBank / coldRunnel — Still-tide Pass */
    brookTrout: {}, dace: {}, minnow: {}, glassEel: { rare: true },
    /* riverbank / shallowFord / fishersStep — Khar-Barak */
    riverTrout: {}, grayling: {}, pike: {}, silverSalmon: { rare: true },
    /* lake — not wired into any zone yet */
    bass: {}, catfish: {}, whitefish: {}, moonfin: { rare: true },
  };
  G.isRareFish = key => !!(G.FISH[key] && G.FISH[key].rare);
  G.fishKeys = rare => Object.keys(G.FISH).filter(k => !!G.FISH[k].rare === !!rare);

  /* ---- VILLAGERS -----------------------------------------------
     Hired AT a specific built station now, not as a named role on
     the Town page — click a station to open its menu (Level Up /
     Hire Villager). A hired villager auto-taps that station's own
     `villagerRecipe` (the one recipe on the station flagged as the
     safe default — always the cheapest, most-basic-input recipe, so
     a villager never surprise-spends a scarcer refined resource the
     player didn't ask for, e.g. Stone Block at the Stone Cutter, not
     Basalt Block, which would eat the player's own Stone Blocks).
     `villagerHireCost` is the one-time hire cost for that station.
     Stations with neither field don't support hiring yet — later
     zones can grant more complex villager-craftable recipes per
     station without touching this shape. See systems/township.js. */
  /* Each zone can always hire 3 villagers total across its stations,
     however they're distributed; each home built in that zone adds
     3 more. Villager SPEED comes from the station's own tap-craft
     speed (G.stationSpeedMult) — upgrading a station speeds up any
     villager working it too, same as a player's own tap. */
  G.villagerSlots = function (zone) {
    zone = zone || S.zone;
    return 3 + 3 * G.homes(zone);
  };
  /* was 5x slower than a player's own tap; now 5x slower again on
     top of that (25x total) — see G.villagerInterval, township.js */
  G.villagerCraftMult = () => 25;

  /* ---- SETTLEMENT ----------------------------------------------
     Homes are built per zone and only unlock villager slots there.
     Materials deliberately come from a LATER zone, so growing a
     settlement means going back out.                              */
  G.HOUSING = {
    cottage: { zone: 'aerendell', name: 'Cottage',
               cost: { basaltBlock: 6, planks: 15, bronzeNail: 8 },
               note: 'nails are forged on the Forest Road; basalt blocks are refined at the Stone Cutter' },
    campsite: { zone: 'forestRoad', name: 'Campsite',
               cost: { tannedLeather: 4, planks: 20, basaltBlock: 3 },
               note: 'tanning salt comes from Khar-Barak; basalt blocks are refined at Aerendell\'s Stone Cutter' },
  };

  /* ---- GEAR SLOTS ---------------------------------------------
     Tools and weapons are not equipped items at all — they are
     pure deck cards (see G.CARDS / G.STATIONS), with their own
     power and durability baked in.                               */
  G.GEAR_SLOTS = [
    { id: 'helmet', label: 'Helm' },  { id: 'chest', label: 'Chest' },
    { id: 'legs',   label: 'Legs' },  { id: 'cape',  label: 'Cape' },
    { id: 'bag',    label: 'Bag' },
    { id: 'ring1',  label: 'Ring' },  { id: 'ring2', label: 'Ring' },
  ];

  /* Every character starts wearing these — plain rags with no
     stats, so the armor slots are never empty. */
  G.RAG_DEFAULTS = {
    helmet: 'ragHood', chest: 'ragShirt', legs: 'ragTrousers',
  };

  /* ---- EQUIPMENT ----------------------------------------------
     cap = carry bonus. def = defense, reduces retaliation damage
     point for point. set = 'scrap' on all three scrap pieces —
     wearing the full set widens the clean-tap band (see
     G.hasArmorSet).                                               */
  G.ITEMS = {
    backpack: { name: 'Backpack',  slot: 'cape', cap: 10, note: '+10 carry capacity' },
    woolPack: { name: 'Wool Pack', slot: 'bag',  cap: 14, note: '+14 carry capacity' },

    ragHood:     { name: 'Rag Hood',     slot: 'helmet', note: 'no bonus' },
    ragShirt:    { name: 'Rag Shirt',    slot: 'chest',  note: 'no bonus' },
    ragTrousers: { name: 'Rag Trousers', slot: 'legs',   note: 'no bonus' },

    scrapHelm:  { name: 'Scrap Helm',       slot: 'helmet', def: 1, set: 'scrap', note: '+1 defense' },
    scrapChest: { name: 'Scrap Chestplate', slot: 'chest',  def: 1, set: 'scrap', note: '+1 defense' },
    scrapLegs:  { name: 'Scrap Greaves',    slot: 'legs',   def: 1, set: 'scrap', note: '+1 defense' },

    /* Highland Robes — Aerendell's own set, woven from the finest
       wool in Eryndor. The cape carries no stats of its own; it
       just completes the set (see G.hasHighlandSet) for the xp
       bonus. warmth has no mechanical effect yet — a future hook,
       same idea as G.zoneDiscount. */
    highlandHood:  { name: 'Highland Hood',  slot: 'helmet', def: 1, warmth: 1, set: 'highland', note: '+1 defense, +1 warmth' },
    highlandCloak: { name: 'Highland Cloak', slot: 'chest',  def: 1, warmth: 1, set: 'highland', note: '+1 defense, +1 warmth' },
    highlandLegs:  { name: 'Highland Legs',  slot: 'legs',   def: 1, warmth: 1, set: 'highland', note: '+1 defense, +1 warmth' },
    highlandCape:  { name: 'Highland Cape',  slot: 'cape',   set: 'highland', note: 'completes the Highland Robes set' },

    /* Zone capes — the 1% prize on a zone level-up wheel (see
       G.ZONE_LOOT). Not craftable anywhere; the only way to own one is
       to pull it. They share the `cape` slot with the Backpack, so
       they carry real defense rather than being pure decoration —
       wearing one is a deliberate trade of carry capacity for armor.
       Swap freely from the Bag's wardrobe. */
    aerendellCape:  { name: 'Aerendell Cape',   slot: 'cape', def: 1, cosmetic: true,
                      note: 'pulled from the Aerendell wheel · +1 defense' },
    roadwardenCape: { name: 'Roadwarden Cape',  slot: 'cape', def: 1, cosmetic: true,
                      note: 'pulled from the Forest Road wheel · +1 defense' },
    gatebreakerCape:{ name: 'Gatebreaker Cape', slot: 'cape', def: 2, cosmetic: true,
                      note: 'pulled from the Khar-Barak wheel · +2 defense' },
  };

  /* ---- CARDS ---------------------------------------------------
     `kind` selects which registered handler runs on resolve.
     See systems/*.js — adding a kind needs no engine changes.

     Combat/tool cards (melee, ranged, mine, axe) carry their own
     `atk` (power) and `durability` (uses before the card breaks —
     see G.drainDurability in engine.js). Crafting a recipe with a
     `grantsCard` field adds copies of that card key to the deck and
     tops up a shared durability pool for that key; at zero, every
     remaining copy of the card leaves the deck.                    */
  G.CARDS = {
    flint:  { kind: 'gather', name: 'Gather Flint',  type: 'Gathering',
              skill: 'foraging', res: 'flint', xp: 4, tint: 'stone' },
    stick:  { kind: 'gather', name: 'Gather Sticks', type: 'Gathering',
              skill: 'foraging', res: 'stick', xp: 4, tint: 'wood' },
    forage: { kind: 'forage', name: 'Forage',        type: 'Gathering',
              skill: 'foraging', xp: 5, tint: 'plant' },

    /* Food cards — crafted at the Campfire from raw ingredients plus
       fuel points, and EATEN when played (the card leaves the deck).
       There is deliberately one generic card per ingredient family
       rather than one per fish/meat: the recipe takes "N of any one
       kind" (see `anyOf`, systems/craft.js), so 15 Bluegill and 15
       Perch both become the same Cooked Fish card. With
       TUNE.maxCardCopies at 3, stocking a deck with healing means
       carrying VARIETY, which is what keeps later food tiers worth
       crafting without inflating heal numbers. */
    redBerry:       { kind: 'food', name: 'Red Berry',       type: 'Food',
                      skill: 'cooking', heal: 1, xp: 4,  tint: 'blood' },
    cookedMeat:     { kind: 'food', name: 'Cooked Meat',     type: 'Food',
                      skill: 'cooking', heal: 3, xp: 10, tint: 'meat' },
    cookedFish:     { kind: 'food', name: 'Cooked Fish',     type: 'Food',
                      skill: 'cooking', heal: 3, xp: 10, tint: 'range' },
    cookedRareFish: { kind: 'food', name: 'Cooked Rare Fish', type: 'Food',
                      skill: 'cooking', heal: 5, xp: 22, tint: 'spirit' },

    /* Durability tiers scale off flint's base of 6 (exactly enough
       to fully clear one hp-6 location card) — stone/wood tier is
       2x, scrap 3x, bronze 4x. Same base across every tool line. */
    strikeStone:  { kind: 'melee', name: 'Strike', type: 'Melee',
                    skill: 'melee', atk: 2, durability: 12, xp: 9, tint: 'blood', tier: 1, damageType: 'slash' },
    strikeScrap:  { kind: 'melee', name: 'Strike', type: 'Melee',
                    skill: 'melee', atk: 3, durability: 18, xp: 9, tint: 'blood', tier: 2, damageType: 'slash' },
    strikeBronze: { kind: 'melee', name: 'Strike', type: 'Melee',
                    skill: 'melee', atk: 4, durability: 24, xp: 9, tint: 'blood', tier: 3, damageType: 'slash' },
    shoot:  { kind: 'ranged', name: 'Loose Arrow', type: 'Ranged',
              skill: 'archery', atk: 1, durability: 12, xp: 7, tint: 'range', tier: 1, damageType: 'ranged' },

    pickFlint: { kind: 'mine', name: 'Swing Pick', type: 'Tool',
                 skill: 'mining', atk: 1, durability: 6, xp: 9, tint: 'stone', tier: 0, damageType: 'pierce' },
    pickStone: { kind: 'mine', name: 'Swing Pick', type: 'Tool',
                 skill: 'mining', atk: 2, durability: 12, xp: 9, tint: 'stone', tier: 1, damageType: 'pierce' },
    pickScrap: { kind: 'mine', name: 'Swing Pick', type: 'Tool',
                 skill: 'mining', atk: 3, durability: 18, xp: 9, tint: 'stone', tier: 2, damageType: 'pierce' },
    oreVein:   { kind: 'mine', name: 'Ore Vein', type: 'Gathering',
                 skill: 'mining', atk: 1, xp: 7, tint: 'stone', damageType: 'pierce' },

    axeFlint: { kind: 'axe', name: 'Fell Tree', type: 'Tool',
                skill: 'woodcut', atk: 1, durability: 6, xp: 11, tint: 'wood', tier: 0, damageType: 'slash' },
    axeStone: { kind: 'axe', name: 'Fell Tree', type: 'Tool',
                skill: 'woodcut', atk: 2, durability: 12, xp: 11, tint: 'wood', tier: 1, damageType: 'slash' },
    axeScrap: { kind: 'axe', name: 'Fell Tree', type: 'Tool',
                skill: 'woodcut', atk: 3, durability: 18, xp: 11, tint: 'wood', tier: 2, damageType: 'slash' },
    axeBronze:{ kind: 'axe', name: 'Fell Tree', type: 'Tool',
                skill: 'woodcut', atk: 4, durability: 24, xp: 20, tint: 'wood', tier: 3, damageType: 'slash' },

    /* Shield cards are passive — G.shieldBlock (engine.js) sums
       `block` across every shield-kind card currently in the dealt
       hand and G.mitigate (core.js) subtracts it from every incoming
       hit, no tap required. `block` starts at 1 for the scrap tier;
       future tiers just carry a bigger number. */
    scrapShield: { kind: 'shield', name: 'Scrap Shield', type: 'Defense',
                   skill: 'crafting', block: 1, durability: 18, xp: 20, tint: 'stone', tier: 2 },
  };

  /* ---- EVENTS ------------------------------------------------------
     A card of kind 'event' applies a status effect instead of
     gathering or fighting — see G.STATUS_EFFECTS below and
     G.applyStatus in engine.js. Mix one into a zone's `deck`
     composition like any other card to make it show up in hand.
     No event cards ship right now (pulled — the storm event felt
     out of place; re-add here and to a zone's deck/foilPool when
     there's a real event worth shipping). The engine-side plumbing
     (G.applyStatus/G.clearStatus/G.tickStatuses, the 'event' card
     kind in systems/cards.js) is untouched and still fully working —
     see test/events.js, which exercises it via a synthetic status
     def rather than real content. */
  G.STATUS_EFFECTS = {
    wounded: {
      name: 'Wounded',
      desc: 'Shaken after defeat — narrower timing band and no clean-tap bonus.',
      duration: 6,
      bandMult: 0.75,
    },
  };

  /* ---- LOCATIONS -------------------------------------------------
     Field targets, up to three at once — the shared vocabulary for
     everything a card can be aimed at. `requires` is what can damage
     one: 'mine'/'axe' for a specific tool, 'combat' for an animal
     either melee or ranged can hit, or a bare card kind ('melee',
     'ranged') to gate an animal to just that one weapon — a deer
     that only a bow can hit, say (see G.activeLocation).
     `atk` is what marks a location as hostile — the damage it hits
     back with on a swing that doesn't finish it (never set on
     boulders/trees/ore, which are never hostile). Everything that
     follows from being hostile — kill counting, the sword badge, the
     red tint — keys off atk being present, not off the exact
     `requires` value (see isHostile() in ui.js). Pays out its full
     dropTable once hp reaches 0. Each zone's mix lives in
     G.ZONES[x].locationDecks — 3 independent per-slot decks, not one
     shared pile (see G.buildLocationDecks/G.fillLocationField,
     engine.js) — a zone with more animal cards in a slot's mix is
     simply a more dangerous slot to gather at. */
  G.LOCATIONS = {
    /* 75/25 Stone/Basalt — oneOf picks uniformly, so the split is done
       by weighting entries 3:1 rather than a weighted-pick feature
       (G.rollDrops has none, see engine.js); each sub-entry needs its
       own min/max since the outer entry has none once oneOf is set. */
    boulder: { name: 'Boulder', hp: 4, sprite: 'boulder', requires: 'mine',
               dropTable: [{ oneOf: [
                 { key: 'stone', min: 6, max: 6 },
                 { key: 'stone', min: 6, max: 6 },
                 { key: 'stone', min: 6, max: 6 },
                 { key: 'basalt', min: 6, max: 6 },
               ] }] },
    pineTree: { name: 'Pine Tree', hp: 4, sprite: 'tree', requires: 'axe',
               dropTable: ['wood'] },
    oreVeinRoad: { name: 'Ore Vein', hp: 6, sprite: 'stone', requires: 'mine', requiresCard: 'pickScrap',
               dropTable: [
                 'stone',
                 { key: 'coal', chance: 0.5 },
                 { key: 'diamond', chance: 0.01 },
                 { key: 'ruby', chance: 0.01 },
                 { key: 'emerald', chance: 0.01 },
               ] },
    oreVeinGate: { name: 'Ore Vein', hp: 8, sprite: 'stone', requires: 'mine', requiresCard: 'pickScrap',
               dropTable: [
                 'tin', 'copper',
                 { key: 'coal', chance: 0.25 },
                 { key: 'diamond', chance: 0.02 },
                 { key: 'ruby', chance: 0.02 },
                 { key: 'emerald', chance: 0.02 },
               ] },
    chicken: { name: 'Highland Chicken', hp: 3, atk: 3, sprite: 'chicken', requires: 'combat',
               dropTable: ['poultry', 'feathers', 'bone'] },
    /* Leather no longer drops off an animal directly — it's rendered
       at the Tanning Station from hide + fat instead (see the
       tannery's 'leather' recipe), so cows actually need the tannery
       to be worth hunting for anything but steak. Every genuine
       animal (not birds, not the humanoid combat enemies) drops
       animal fat now; only Deer happens to also drop hide. */
    cow:     { name: 'Highland Cow',     hp: 8, atk: 3, sprite: 'cow', requires: 'combat',
               dropTable: ['animalFat', 'bone', 'steak'], dropQty: { bone: 2 } },
    sheep:   { name: 'Highland Sheep',   hp: 8, atk: 3, sprite: 'sheep', requires: 'combat',
               dropTable: ['highlandWool', 'bone', 'animalFat'], dropQty: { highlandWool: 2 } },
    pig:     { name: 'Moorland Pig',     hp: 6, atk: 3, sprite: 'pig', requires: 'combat',
               dropTable: ['pork', 'bone', 'animalFat'] },
    lurker:  { name: 'Gate Lurker',      hp: 10, atk: 5, sprite: 'goblin', requires: 'combat',
               dropTable: [
                 { key: 'bone', min: 2, max: 2 },
                 { key: 'tanningSalt', min: 1, max: 2, chance: 0.7 },
                 { key: 'gold', min: 2, max: 8, chance: 0.6 },
               ] },
    /* Aggro: chips the player for `aggroDmg` on EVERY card played
       while it's alive on the field, any kind — not just a card
       aimed at it — on top of its normal atk-based retaliate on a
       failed kill (see the aggro-tick block in G.resolveCard,
       engine.js). `meleeBonusDmg` is a separate bonus specifically
       to that retaliate, only when the card that failed to finish
       it off was melee. Goblin turns up in Forest Road, Still-tide
       Pass and Duun-Vael Bridge's location decks — this flags every
       appearance of the shared `goblin` key, not just Forest Road's,
       since it's one definition, not a per-zone copy. */
    goblin:  { name: 'Road Goblin',      hp: 5, atk: 5, sprite: 'goblin', requires: 'combat',
               aggro: true, aggroDmg: 1, meleeBonusDmg: 2,
               dropTable: [
                 { key: 'bone' },
                 { key: 'gold', min: 1, max: 5, chance: 0.6 },
                 { key: 'leatherScrap', min: 1, max: 3, chance: 0.5 },
                 { key: 'scrapMetal', min: 1, max: 2, chance: 0.55 },
               ] },
    /* The one location gated to a single card kind rather than
       'combat' — only a ranged card can hit it, so it never even
       shows as a target for a melee card's face() text. Everything
       else about it (retaliation, kill counting, the sword badge,
       the red tint) follows automatically off its atk, same as any
       other hostile location — see isHostile() in ui.js and the
       kill-counting check in G.damageLocation. */
    deer:    { name: 'Deer',             hp: 6, atk: 3, sprite: 'deer', requires: 'ranged',
               dropTable: ['hide', 'bone', 'steak', 'animalFat'] },
  };

  /* The one and only starting deck — the deck is global now, so no
     zone defines its own (they used to, which silently handed you a
     fresh pile of starter cards on first arrival). 3 of each is the
     per-key cap, so the opening deck is deliberately small: it grows
     toward TUNE.deckCap as you craft variety, rather than starting
     full. The single Red Berry is your one starting heal — eat it and
     it's gone, so the Campfire has to replace it. */
  G.STARTING_DECK = { flint: 3, stick: 3, forage: 3, redBerry: 1 };

  /* Stations pre-marked built from the start — no build step, so
     their recipes are always available. Backfilled onto old saves
     too (see G.load in core.js), same as G.RAG_DEFAULTS. */
  G.ALWAYS_BUILT = ['hands'];

  /* ---- STATIONS & RECIPES -------------------------------------- */
  G.STATIONS = [
    { id: 'hands', name: 'Bare Hands', sub: 'Flint tools — crude, but need nothing built',
      buildCost: {},
      recipes: [
        { id: 'flintPick', name: 'Flint Pick', cost: { flint: 6, stick: 6 },
          repeatable: true, grantsCard: 'pickFlint', effect: 'adds a Swing Pick card — crude, wears fast' },
        { id: 'flintAxe',  name: 'Flint Axe',  cost: { flint: 6, stick: 6 },
          repeatable: true, grantsCard: 'axeFlint', effect: 'adds a Fell Tree card — crude, wears fast' },
      ] },
    { id: 'bench', name: 'Crafting Bench', sub: 'Basic tools and fittings', zones: ['aerendell'],
      buildCost: { basaltBlock: 2, planks: 12 },
      villagerHireCost: { planks: 15, stick: 10 },
      /* shown from the very first visit to the Craft page, even
         before stone/stick have actually been seen — a signpost
         for what a new player is working toward (see freshState's
         starting pin in core.js) */
      alwaysShown: true,
      /* Upgrade tiers for tap-to-craft speed (see G.stationSpeedMult,
         craft.js) — level 2 is upgrades[0], level 3 is upgrades[1], etc.
         speedMult is the ABSOLUTE multiplier on TUNE.tapCraftMs at that
         level, not compounded per-tier. */
      /* Level 2 now costs Scrap Metal alongside the existing Basalt
         Block/Planks — it's what actually unlocks the scrap-tier
         weapons/tools/shield below (see their minLevel: 2), not just
         a speed bump any more. */
      upgrades: [{ cost: { basaltBlock: 8, planks: 30, scrapMetal: 10 }, speedMult: 0.65 }],
      /* Recipes are sorted for the player: axes, then picks, then
         weapons, then everything else (spun/stitched materials,
         carry-capacity gear). Keep new bench recipes filed into
         whichever of those four groups they belong to. */
      recipes: [
        /* Stick is a flint-tier resource only — every stone-tier
           recipe below burns Planks instead, never sticks. Stone-tier
           weapons/tools cost a refined Stone Block (Stone Cutter,
           Aerendell) now, not raw stone; Planks are milled from raw
           Logs at the Sawmill, same zone — see those stations' entries.
           Scrap-tier recipes carry minLevel: 2 — Bench level 2 is what
           actually unlocks them now, not just discovering Scrap Metal
           (see G.canStartRecipe/UI.renderStationsInto's minLevel gate). */
        /* -- axes -- */
        { id: 'axe',        name: 'Stone Axe',  cost: { stoneBlock: 1, planks: 6 },
          repeatable: true, zones: ['aerendell'], grantsCard: 'axeStone', effect: 'adds a Fell Tree card' },
        { id: 'scrapAxe',   name: 'Scrap Axe',  cost: { scrapMetal: 4, planks: 6 }, minLevel: 2,
          repeatable: true, zones: ['aerendell'], grantsCard: 'axeScrap',
          effect: 'adds a Fell Tree card — sturdier than stone' },
        /* -- picks -- */
        { id: 'stonePick',  name: 'Stone Pick', cost: { stoneBlock: 1, planks: 6 },
          repeatable: true, zones: ['aerendell'], grantsCard: 'pickStone',
          effect: 'adds a Swing Pick card' },
        { id: 'scrapPick',  name: 'Scrap Pick', cost: { scrapMetal: 4, stick: 6 }, minLevel: 2,
          repeatable: true, zones: ['aerendell'], grantsCard: 'pickScrap',
          effect: 'adds a Swing Pick card — the only way to work ore' },
        /* -- weapons -- */
        { id: 'stoneSword', name: 'Stone Sword', cost: { stoneBlock: 1, planks: 4 },
          repeatable: true, zones: ['aerendell'], grantsCard: 'strikeStone', effect: 'adds a Strike card' },
        { id: 'scrapSword', name: 'Scrap Sword', cost: { scrapMetal: 4, planks: 4 }, minLevel: 2,
          repeatable: true, zones: ['aerendell'], grantsCard: 'strikeScrap',
          effect: 'adds a Strike card — sturdier than stone' },
        { id: 'scrapShield', name: 'Scrap Shield', cost: { scrapMetal: 4, planks: 4 }, minLevel: 2,
          repeatable: true, zones: ['aerendell'], grantsCard: 'scrapShield',
          effect: 'adds a card that blocks 1 dmg while held in hand' },
        { id: 'shortBow',   name: 'Short Bow',  cost: { planks: 5, string: 2 },
          repeatable: true, grantsCard: 'shoot', effect: 'adds a Loose Arrow card' },
        /* -- misc -- */
        { id: 'string',     name: 'String',     cost: { flax: 3 }, villagerRecipe: true,
          repeatable: true, gives: { string: 1 }, effect: 'spun from flax' },
        { id: 'scrapLeather', name: 'Stitch Leather', cost: { leatherScrap: 3 },
          repeatable: true, gives: { leather: 1 }, skill: 'crafting', xp: 6,
          effect: 'three scraps make one leather' },
        { id: 'backpack',   name: 'Backpack',   cost: { stick: 8, planks: 4, cloth: 2 },
          equips: 'backpack', effect: '+10 carry capacity' },
        { id: 'woolPack',   name: 'Wool Pack',  cost: { planks: 14, stone: 6 },
          equips: 'woolPack', effect: '+14 carry capacity' },
      ] },
    /* Refines raw Stone/Basalt (Boulders now drop a 75/25 mix — see
       G.LOCATIONS.boulder) into worked Blocks. Stone Blocks are the
       real cost of early weapons/tools now (see the bench recipes
       above); Basalt Blocks pay for buildings/infrastructure (see
       G.HOUSING and the build/upgrade costs on bench/armorBench/
       altar below) and now also cost a Stone Block themselves. Costed
       in raw stone/logs only, same bootstrap-free role Bare Hands
       plays for flint tools and the Sawmill plays for Planks below —
       there's always a way in that never depends on the OTHER
       refining station's output. */
    { id: 'stoneCutter', name: 'Stone Cutter', sub: 'Refine raw stone and basalt into worked blocks',
      buildCost: { stone: 15, wood: 10 }, zones: ['aerendell'],
      villagerHireCost: { stone: 15, wood: 10 },
      recipes: [
        { id: 'stoneBlock', name: 'Stone Block', cost: { stone: 3 }, villagerRecipe: true,
          repeatable: true, gives: { stoneBlock: 1 }, skill: 'stonecutting', xp: 4,
          effect: 'refined from raw stone' },
        { id: 'basaltBlock', name: 'Basalt Block', cost: { basalt: 3, stoneBlock: 1 },
          repeatable: true, gives: { basaltBlock: 1 }, skill: 'stonecutting', xp: 6,
          effect: 'refined from raw basalt, set with a stone block' },
      ] },
    /* Mirrors the Stone Cutter exactly, one raw material instead of
       two: raw Logs -> Pine Planks, the real cost of most bench/
       building recipes now (see the wood -> planks conversion
       throughout this file). Costed in raw logs/stone only — never
       Planks — so it's never blocked on its own output.
       Birch Planks is the second wood-plank tier — Birch Logs only
       come from Birch Trees (Still-tide Pass, requires a Bronze Axe
       to damage — see G.LOCATIONS.birchTree, custom-content.js) plus
       Pine Planks, so it's gated well behind the base recipe. Not
       flagged villagerRecipe — the villager default for this station
       stays the cheap, always-available Pine Planks recipe. */
    { id: 'sawmill', name: 'Sawmill', sub: 'Mill raw logs into planks',
      buildCost: { wood: 15, stone: 10 }, zones: ['aerendell'],
      villagerHireCost: { wood: 15, stone: 10 },
      recipes: [
        { id: 'planks', name: 'Pine Planks', cost: { wood: 3 }, villagerRecipe: true,
          repeatable: true, gives: { planks: 1 }, skill: 'sawmilling', xp: 4,
          effect: 'milled from raw logs' },
        { id: 'birchPlanks', name: 'Birch Planks', cost: { birchLog: 3, planks: 2 },
          repeatable: true, gives: { birchPlanks: 1 }, skill: 'sawmilling', xp: 8,
          effect: 'milled from birch logs, backed with pine planks' },
      ] },
    { id: 'loom', name: 'Loom', sub: 'Weave string into cloth',
      buildCost: { planks: 10, stick: 14 }, zones: ['aerendell'],
      villagerHireCost: { planks: 10, stick: 10 },
      upgrades: [{ cost: { planks: 20, cloth: 10 }, speedMult: 0.65 }],
      recipes: [
        { id: 'cloth', name: 'Weave Cloth', cost: { string: 4 }, villagerRecipe: true,
          repeatable: true, gives: { cloth: 1 }, skill: 'crafting', xp: 8,
          effect: 'four string makes one cloth' },
        { id: 'highlandCloth', name: 'Spin Highland Cloth', cost: { highlandWool: 4 },
          repeatable: true, gives: { highlandCloth: 1 }, skill: 'crafting', xp: 8,
          effect: 'four highland wool spun into one cloth' },
      ] },
    /* The Scrap and Highland Robes sets used to be split by recipe-
       level zone (Forest Road vs Aerendell) so one Armor Bench could
       host both without bleeding into each other. The station itself
       is Aerendell-only now (see `zones` below), so these per-recipe
       zones are redundant — left in place as explicit documentation,
       harmless either way. */
    { id: 'armorBench', name: 'Armor Bench', sub: 'Padded armor built up from cloth', zones: ['aerendell'],
      buildCost: { planks: 14, basaltBlock: 3 },
      upgrades: [{ cost: { planks: 25, basaltBlock: 6 }, speedMult: 0.65 }],
      recipes: [
        { id: 'scrapHelm',  name: 'Scrap Helm',       cost: { cloth: 2, scrapMetal: 3 },
          zones: ['aerendell'], equips: 'scrapHelm',  effect: '+1 defense' },
        { id: 'scrapChest', name: 'Scrap Chestplate', cost: { cloth: 3, scrapMetal: 6 },
          zones: ['aerendell'], equips: 'scrapChest', effect: '+1 defense' },
        { id: 'scrapLegs',  name: 'Scrap Greaves',    cost: { cloth: 3, scrapMetal: 5 },
          zones: ['aerendell'], equips: 'scrapLegs',  effect: '+1 defense' },
        { id: 'highlandHood',  name: 'Highland Hood',  cost: { highlandCloth: 2, leather: 2 },
          zones: ['aerendell'], equips: 'highlandHood',  effect: '+1 defense, +1 warmth' },
        { id: 'highlandCloak', name: 'Highland Cloak', cost: { highlandCloth: 3, leather: 3 },
          zones: ['aerendell'], equips: 'highlandCloak', effect: '+1 defense, +1 warmth' },
        { id: 'highlandLegs',  name: 'Highland Legs',  cost: { highlandCloth: 3, leather: 3 },
          zones: ['aerendell'], equips: 'highlandLegs',  effect: '+1 defense, +1 warmth' },
        { id: 'highlandCape',  name: 'Highland Cape',  cost: { highlandCloth: 4, leather: 2 },
          zones: ['aerendell'], equips: 'highlandCape',
          effect: 'completes the set — bonus xp while in Leth-Eiren' },
      ] },
    /* Lives on the Deck page, not Craft — burying a bone is a deck
       action in practice, and sitting it next to the prayer-point
       counter means you watch the number climb as you bury. */
    { id: 'altar', name: 'Bone Altar', sub: 'Prayer — bury bones for points', page: 'deck', zones: ['aerendell'],
      buildCost: { basaltBlock: 6, bone: 5 },
      villagerHireCost: { basaltBlock: 5, bone: 10 },
      upgrades: [{ cost: { basaltBlock: 12, bone: 12 }, speedMult: 0.65 }],
      recipes: [
        { id: 'buryBone', name: 'Bury Bone', cost: { bone: 1 }, villagerRecipe: true,
          repeatable: true, prayer: 1,
          effect: 'earns prayer points and prayer xp' },
      ] },
    { id: 'firepit', name: 'Campfire', sub: 'Cook food, burn planks to charcoal', page: 'farm', zones: ['aerendell'],
      buildCost: { stick: 12, flint: 8 },
      villagerHireCost: { stick: 15, flint: 10 },
      upgrades: [{ cost: { planks: 25, stick: 20 }, speedMult: 0.65 }],
      /* Cooking makes CARDS now, not cooked-item resources. Each
         recipe burns raw ingredients plus `fuel` POINTS, drawn from
         any burnable you're carrying (stick 1, wood 4, charcoal 8 —
         see CAMPFIRE_FUELS/G.spendFuel, systems/craft.js), and the
         `anyOf` costs take "N of any ONE key in the list", so every
         common fish feeds the same Cooked Fish card instead of
         needing 16 near-identical recipes. */
      recipes: [
        { id: 'card_redBerry', name: 'Red Berry', cost: { berries: 10 }, fuel: 10,
          repeatable: true, grantsCard: 'redBerry', skill: 'cooking', xp: 8,
          effect: '10 Red Berries + 10 fuel — a card that heals 1' },
        { id: 'makeCharcoal', name: 'Burn Charcoal', cost: { planks: 1, stick: 1 }, villagerRecipe: true,
          repeatable: true, gives: { charcoal: 1 }, skill: 'cooking', xp: 6,
          effect: 'burns planks down to charcoal' },
        { id: 'card_cookedMeat', name: 'Cooked Meat', cost: {}, fuel: 10,
          anyOf: { keys: ['poultry', 'pork', 'steak'], qty: 10 },
          repeatable: true, grantsCard: 'cookedMeat', skill: 'cooking', xp: 14,
          effect: '10 of one raw meat + 10 fuel — a card that heals 3' },
        { id: 'card_cookedFish', name: 'Cooked Fish', cost: {}, fuel: 10,
          anyOf: { keys: G.fishKeys(false), qty: 15 },
          repeatable: true, grantsCard: 'cookedFish', skill: 'cooking', xp: 14,
          effect: '15 of one common fish + 10 fuel — a card that heals 3' },
        { id: 'card_cookedRareFish', name: 'Cooked Rare Fish', cost: {}, fuel: 10,
          anyOf: { keys: G.fishKeys(true), qty: 3 },
          repeatable: true, grantsCard: 'cookedRareFish', skill: 'cooking', xp: 30,
          effect: '3 of one rare fish + 10 fuel — a card that heals 5' },
      ] },
    { id: 'tannery', name: 'Tanning Station', sub: 'Turn raw hide into leather', zones: ['aerendell'],
      buildCost: { planks: 16, stone: 10, string: 4 },
      villagerHireCost: { planks: 15, stone: 10 },
      /* used to be zone-restricted to Forest Road ("follows the cows
         and the deer out to the Road") — now every crafting station
         lives in Aerendell only (see the id:'tannery' station-level
         `zones` field above); other zones are gather-only. */
      upgrades: [{ cost: { leather: 12, planks: 20 }, speedMult: 0.65 }],
      recipes: [
        { id: 'leather', name: 'Tan Hide', cost: { hide: 1, animalFat: 2 }, villagerRecipe: true,
          repeatable: true, gives: { leather: 1 }, skill: 'tanning', xp: 8,
          effect: 'render fat and cure hide into leather' },
        { id: 'tannedLeather', name: 'Tan Leather',
          cost: { leather: 1, tanningSalt: 1 },
          repeatable: true, gives: { tannedLeather: 1 }, skill: 'tanning', xp: 12,
          effect: 'salt from Khar-Barak cures leather for building' },
      ] },
    { id: 'fletching', name: 'Fletching Station', sub: 'Arrows and bow upgrades', zones: ['aerendell'],
      buildCost: { planks: 14, string: 3 },
      villagerHireCost: { planks: 15, string: 5 },
      upgrades: [{ cost: { planks: 25, string: 10 }, speedMult: 0.65 }],
      recipes: [
        { id: 'scrapArrow', name: 'Scrap Arrows', cost: { stick: 1, scrapMetal: 1, feathers: 1 },
          repeatable: true, gives: { scrapArrow: 3 }, skill: 'fletching', xp: 7,
          effect: 'makes 3 sturdier arrows — spent by Loose Arrow cards' },
        { id: 'stoneArrow', name: 'Stone Arrows', cost: { stick: 1, stone: 1 }, villagerRecipe: true,
          repeatable: true, gives: { stoneArrow: 3 }, skill: 'fletching', xp: 5,
          effect: 'makes 3 — spent by Loose Arrow cards' },
      ] },
    { id: 'furnace', name: 'Stone Furnace', sub: 'Smelt ore into bars', zones: ['aerendell'],
      buildCost: { stone: 30, charcoal: 5 },
      villagerHireCost: { stone: 20, charcoal: 10 },
      upgrades: [{ cost: { stone: 50, charcoal: 15 }, speedMult: 0.65 }],
      recipes: [
        { id: 'bronzeBar', name: 'Smelt Bronze Bar', cost: { tin: 1, copper: 1, charcoal: 1 }, villagerRecipe: true,
          repeatable: true, gives: { bronzeBar: 1 }, skill: 'smithing', xp: 12,
          effect: 'melts tin and copper together' },
      ] },
    { id: 'smithy', name: 'Smithing Table', sub: 'Work bars into weapons', zones: ['aerendell'],
      buildCost: { stone: 20, bronzeBar: 2 },
      villagerHireCost: { stone: 15, bronzeBar: 3 },
      upgrades: [{ cost: { bronzeBar: 8, stone: 30 }, speedMult: 0.65 }],
      recipes: [
        { id: 'bronzeDagger', name: 'Bronze Dagger', cost: { stick: 4, bronzeBar: 2 },
          repeatable: true, grantsCard: 'strikeBronze', skill: 'smithing', xp: 20,
          effect: 'stronger, longer-lasting — adds a Strike card' },
        { id: 'bronzeAxe', name: 'Bronze Axe', cost: { planks: 6, bronzeBar: 2 },
          repeatable: true, grantsCard: 'axeBronze', skill: 'smithing', xp: 20,
          effect: 'stronger, longer-lasting — adds a Fell Tree card' },
        { id: 'bronzeNail', name: 'Bronze Nails', cost: { bronzeBar: 1 }, villagerRecipe: true,
          repeatable: true, gives: { bronzeNail: 8 }, skill: 'smithing', xp: 8,
          effect: 'makes 8 — used to build cottages in Aerendell' },
      ] },
  ];

  /* ---- WORLD ----------------------------------------------------
     Regions hold zones. `needs` gates travel; omit it for open.
     Add a zone: one entry here and it appears on the Home map.   */
  G.REGIONS = [
    { id: 'leth-eiren', name: 'Leth-Eiren', sub: 'the green marches' },
    { id: 'khar',       name: 'Khar-Barak', sub: 'the breaking gate' },
  ];

  /* ---- ZONE LEVEL-UP LOOT --------------------------------------
     One weighted roll per zone level-up (see G.spinZoneLoot). The
     wheel is pure theatre now — the reels are made to land on
     whatever this table already picked, rather than the reels
     deciding the prize.

     `chance` values are absolute probabilities and are read in the
     order listed; whatever is left over after they are summed is a
     deliberate "nothing this time" outcome, so the wheel can still
     come up empty and a win keeps its weight.

       kind:'res'       plain resource, qty rolled from min/max
       kind:'gem'       one of `pool`, the zone-agnostic gemstones
       kind:'foil'      upgrades one card in your deck to a foil
       kind:'cape'      grants that zone's cape (G.ZONES[z].cape)
       kind:'prismatic' the ultra-rare: a prismatic card treatment  */
  G.ZONE_LOOT = [
    { kind: 'res', key: 'stick', chance: 0.25, min: 8, max: 16 },
    { kind: 'res', key: 'flint', chance: 0.25, min: 8, max: 16 },
    { kind: 'res', key: 'bone',  chance: 0.15, min: 4, max: 10 },
    { kind: 'res', key: 'stone', chance: 0.15, min: 8, max: 16 },
    { kind: 'foil',      chance: 0.10 },
    { kind: 'gem',       chance: 0.05, pool: ['diamond', 'ruby', 'emerald'], min: 1, max: 2 },
    { kind: 'cape',      chance: 0.01 },
    { kind: 'prismatic', chance: 0.001 },
  ];

  /* Zone-level loot wheel pools — the icons the reels flick through
     on their way to the result. Purely what the spin *looks* like;
     what you actually win comes from G.ZONE_LOOT above. */
  G.ZONES = {
    aerendell: {
      name: 'Aerendell', kind: 'Town', region: 'leth-eiren', order: 1,
      blurb: 'Walled settlement on the river. Stone, timber and livestock.',
      slotLabels: ['Quarry', 'Forest', 'Grasslands'],
      /* 3 independent field-slot decks, not one shared pile — slot 0
         (rock), slot 1 (tree) and slot 2 (animal) each shuffle and
         reshuffle on their own, so the field structurally always has
         a Boulder AND a Pine Tree, never just by luck. See
         G.buildLocationDecks/G.fillLocationField, engine.js. */
      locationDecks: [{ boulder: 6 }, { pineTree: 6 }, { chicken: 3, sheep: 2 }],
      lootPool: ['flint', 'flint', 'flint', 'stick', 'stick', 'stick',
                 'wood', 'wood', 'stone', 'stone', 'flax', 'berries', 'bone', 'gold'],
      /* which of this zone's cards a foil pull can land on, and the
         cape it awards at 1% — each zone has its own cosmetic set */
      foilPool: ['flint', 'stick', 'forage'],
      cape: 'aerendellCape',
      open: true },
    forestRoad: {
      name: 'Aerendell Forest Road', kind: 'Wilds', region: 'leth-eiren', order: 2,
      blurb: 'The old road east. Goblins on the verge — a pond sits just off the ditch.',
      slotLabels: ['Forest & Rock', 'Pond', 'Roadside'],
      /* Boulders share slot 0 with the pine trees rather than getting
         a slot of their own — one field card is showing at a time, so
         you have to clear whichever is up to reach the next. That
         keeps stone available in the second zone without handing it
         over on demand. */
      locationDecks: [{ pineTree: 5, boulder: 5 }, { pond: 5 }, { goblin: 4, chicken: 2, pig: 2, cow: 2, deer: 2 }],
      lootPool: ['stick', 'stick', 'stick', 'wood', 'wood', 'stone', 'stone',
                 'scrapMetal', 'scrapMetal', 'leatherScrap', 'bone', 'coal', 'gold'],
      foilPool: ['axeFlint', 'pickFlint', 'woodenClub', 'fishingNet'],
      cape: 'roadwardenCape',
      needs: { kills: 5 } },
    kharBarak: {
      name: 'Khar-Barak', kind: 'Gate', region: 'khar', order: 3,
      blurb: 'The Breaking Gate. Something waits on the far side.',
      bank: true,
      /* no tree slot here either — rock (ore) in slot 0, animal in
         slot 2. This is exactly where a future "ore deposit" mix
         (Boulder/Copper/Tin cycling in slot 0) would go — content
         only, no engine change needed. */
      locationDecks: [{ oreVeinGate: 10 }, {}, { lurker: 4 }],
      lootPool: ['tin', 'tin', 'copper', 'copper', 'coal', 'coal',
                 'bronzeBar', 'bronzeBar', 'gold', 'diamond', 'ruby', 'emerald'],
      foilPool: ['flint', 'stick'],
      cape: 'gatebreakerCape',
      needs: { kills: 20 } },
  };
  G.START_ZONE = 'aerendell';

  /* Batch 4, real-time plan: every zone sits along ONE road, in this
     order, each link taking its own real-world time. `ms` is the
     cost of the STEP INTO that entry FROM THE ONE BEFORE IT in this
     list — Aerendell has none, since nothing travels "into" the
     start. G.travelCost (systems/world.js) sums every link between
     the player's current position and the destination, in either
     direction, so Aerendell -> Khar-Barak costs 30s (into Forest
     Road) + 5min (into Khar-Barak) = 5:30, and a full end-to-end
     Aerendell -> Riverhold run costs 25:30. One central list here
     rather than a field on each zone, deliberately — it can't be
     silently overridden by custom-content.js's per-zone redeclares
     the way a field living ON a zone object already was once
     (kharBarak's own travelHours went missing exactly that way while
     this was being built — see the CLAUDE.md note on this batch). */
  G.TRAVEL_ROAD = [
    { zone: 'aerendell' },
    { zone: 'forestRoad', ms: 30 * 1000 },
    { zone: 'kharBarak', ms: 5 * 60 * 1000 },
    { zone: 'stillTidePass', ms: 5 * 60 * 1000 },
    { zone: 'duunVaelBridge', ms: 5 * 60 * 1000 },
    { zone: 'riverhold', ms: 10 * 60 * 1000 },
  ];

  /* Each zone tints the interface so you always know where you are. */
  G.ZONE_THEME = {
    aerendell:  { accent: '#3f7d52', soft: '#eef5ef', line: '#cfe3d4', label: 'Aerendell' },
    forestRoad: { accent: '#8a6a2f', soft: '#f7f1e4', line: '#e5d9bf', label: 'Forest Road' },
    kharBarak:  { accent: '#6b5a8a', soft: '#f1eef7', line: '#dcd3ea', label: 'Khar-Barak' },
  };

})(window.Game = window.Game || {});
