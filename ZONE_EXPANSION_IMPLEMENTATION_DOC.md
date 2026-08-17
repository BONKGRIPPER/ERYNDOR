# Eryndor Zone Expansion Implementation Doc

This document turns the current world-expansion ideas into an implementation-ready design pass for the existing browser game codebase. It is written to match the current plain-JS architecture and the current content model used by `js/data.js` and `js/custom-content.js`.

## Purpose

The goal of this expansion is to:

- grow the world outward from the current early-game path,
- make each zone feel mechanically distinct,
- introduce stronger regional identity,
- create clear progression gates,
- avoid content bloat by giving every zone a specific job.

This is not just a lore plan. It is intended to become the blueprint for future content additions in code.

## Core recommendations

These are the strongest recommendations before implementation:

1. Build these zones in phases, not all at once.
2. Make each zone specialize in one or two reasons to revisit.
3. Reuse existing mechanics first: combat cards, forage cards, fishing cards, mining cards, stations, banks, traders, faction donations, prayer, and farming.
4. Delay new systems unless a zone truly needs one.
5. Use faction influence and travel gating as the main progression locks instead of key-item clutter.

## Recommended build order

This is the safest implementation order for the current codebase:

1. `kharBarak`
2. `stillTidePass`
3. `duunVaelBridge`
4. `aelbrook`
5. `riverhold`
6. `timberfell`
7. `sunkenPath`
8. `twinSpire`

That order gives the best ratio of player value to implementation risk.

## Content rules for this expansion

To keep the world readable, every new zone should follow these rules:

- Each zone should have 2-4 lane/deck labels only.
- Each lane should communicate a clear biome or role.
- Each zone should introduce at most 1 new major material family at a time.
- Every city should focus on services, not raw grinding.
- Every combat gate zone should test a specific build style.
- Fishing, mining, woodcutting, farming, prayer, and trade should all gain at least one meaningful home zone.

## Implementation model

These design notes assume the existing content pattern:

- zone metadata in `G.ZONES`
- location cards in `G.LOCATIONS`
- resource/item definitions in `G.RESOURCES`
- stations/buildables in `G.STATIONS`
- market and trade hooks through current market systems
- donation and prayer hooks through existing donation systems
- card-lane labels through `slotLabels`
- preferred deck auto-equip through the existing deck preference system

Recommended content placement:

- Put new hand-authored content in `js/custom-content.js` for now, since current runtime behavior already depends on custom overrides.
- Only add base-system hooks if a zone needs a truly new mechanic.

## Region structure

### Leth-eiren

This should remain the cleaner early-game region. Its role is onboarding, first specialization, and first meaningful route splits.

### Keth-maral

This should be the first region that feels politically alive. Its role is long-form progression, city systems, faction alignment, and repeatable midgame loops.

## Zone specs

---

## Khar-Barak

### Role

First true city. First banking city. First metalworking hub. First trade center. First river fishing zone.

### Player purpose

The player should come here to:

- trade,
- bank items,
- smelt bars,
- begin smithing progression,
- gather early metal,
- access the first river fish pool.

### Mechanical identity

Khar-Barak should be a safe economic zone with no enemies. Its tension should come from decisions, not combat.

### Suggested lane labels

- `Mines`
- `River`
- `Timber`

### Location pool

#### Mines lane

- Copper Vein
- Tin Vein
- Stone Deposit
- Furnace Quarter

#### River lane

- Riverbank
- Shallow Ford
- Fisher's Step

#### Timber lane

- Pine Stand
- Wood Yard
- Smithing Grounds

### Resource identity

Primary outputs:

- copper ore
- tin ore
- stone
- pine logs
- river fish

Secondary outputs:

- clay or gravel if desired for future construction loops

### Services

- Trader
- Bank
- Furnace
- Anvil build/unlock path

### Recommended unlocks

- Copper Bar smelting
- Tin Bar smelting
- Bronze progression once alloying exists
- First real tool upgrade route

### Recommended restrictions

- No enemy cards
- No advanced trees yet
- No rare gemstone abundance here

### Why this works

This gives the player a real home base without overwhelming them. It also cleanly teaches the idea that cities are service hubs and not just another resource map.

---

## Still-tide Pass

### Role

Early travel route with slightly stronger field pressure than Aerendell Road. First oak zone. First stream-fishing specialization.

### Player purpose

The player should come here to:

- gather oak,
- hunt light enemies,
- fish streams,
- build stronger early decks for future travel.

### Mechanical identity

A bridge zone between beginner safety and more deliberate deck-building.

### Suggested lane labels

- `Oakwood`
- `Pass`
- `Stream`

### Location pool

#### Oakwood lane

- Oak Grove
- Fallen Timber
- Brushline

#### Pass lane

- Goblin Trail
- Deer Crossing
- Rocky Shoulder

#### Stream lane

- Narrow Stream
- Mossy Bank
- Cold Runnel

### Resource identity

Primary outputs:

- oak logs
- early hides or venison
- stream fish
- basic forage

Secondary outputs:

- small bones for prayer loops

### Enemy identity

- goblins
- deer

This should feel familiar to Aerendell Forest Road, but more focused and slightly less forgiving.

### Recommended unlocks

- better woodcutting supply
- more stable food loop
- stronger early combat consistency

### Why this works

It gives oak a real place in progression and makes travel routes feel like part of the economy, not filler.

---

## Duun-Vael Bridge

### Role

First real gauntlet zone. A deliberate combat checkpoint.

### Player purpose

The player should come here to:

- prove their deck can survive repeated combat,
- farm bones and combat loot,
- unlock the next branch of travel.

### Mechanical identity

This zone should be pressure-heavy and low on utility. Its purpose is passage, not comfort.

### Suggested lane labels

- `Bridge`
- `Approach`
- `Barricade`

### Location pool

#### Bridge lane

- Broken Span
- Chokepoint
- Guard Stones

#### Approach lane

- Ravine Path
- Ambush Rise
- Watch Drift

#### Barricade lane

- Raider Blockade
- Splinter Wall
- Burned Camp

### Resource identity

Primary outputs:

- bones
- combat salvage
- modest coin

Secondary outputs:

- low-rate iron precursor materials later if needed, but not initially

### Enemy identity

Recommended mix:

- raiders
- stronger goblins
- bridge scavengers

### Recommended rules

- low or zero peaceful gathering cards
- at most one utility lane card per shuffle cycle
- healing should be valuable here

### Unlock model

Beating or stabilizing this zone should unlock confidence to access Aelbrook and later northern routes.

### Why this works

It creates a memorable progression wall and gives combat builds a real validation point.

---

## Aelbrook

### Role

Later-access agricultural town. Best farming area in early-to-mid game.

### Player purpose

The player should come here to:

- expand farming,
- stabilize food production,
- build long-form crop loops,
- support cooking and future alchemy.

### Mechanical identity

Aelbrook should feel productive, open, and low-threat. It should reward planning more than reflex combat.

### Suggested lane labels

- `Fields`
- `Garden`
- `Village`

### Location pool

#### Fields lane

- Open Field
- Irrigated Rows
- Wind-Worn Plot

#### Garden lane

- Herb Patch
- Orchard Edge
- Compost Mound

#### Village lane

- Farmer's Store
- Milling Yard
- Barnside

### Resource identity

Primary outputs:

- crop support
- seeds
- farming materials
- food ingredients

Secondary outputs:

- herb ingredients for future potion systems

### Services

- strong farming support
- food-related trade
- possible grain-processing station later

### Recommended unlocks

- larger food economy
- better consumable sustain
- future cauldron ingredient chain support

### Why this works

It stops farming from feeling like a side system and turns it into a destination.

---

## Riverhold

### Role

First major city of the wider world. Main political hub. Faction and religion anchor.

### Player purpose

The player should come here to:

- bank,
- trade,
- choose influence priorities,
- unlock major travel routes,
- interact with multi-faction progression.

### Mechanical identity

Riverhold should be the first zone where social alignment matters as much as raw materials.

### Suggested lane labels

- `Market`
- `Shrines`
- `Docks`
- `Ward`

### Location pool

#### Market lane

- Grand Market
- Traders' Row
- Provision Square

#### Shrines lane

- Ashkar Shrine
- Delborn Shrine
- Emberkin Shrine
- Riverborn Shrine

#### Docks lane

- River Dock
- Cargo Slip
- Ferry Platform

#### Ward lane

- Civic Quarter
- Embassy Walk
- Old Gate

### Service identity

- Major trader
- Bank
- Religion donations
- Faction donations
- route unlocking hub

### Faction model recommendations

Keep the existing donation framework and extend it instead of building a separate diplomacy system.

Suggested faction preferences:

- `Ashkar`
  Likes tools and weapons. Weak value for stone and gems.
- `Delborn`
  Likes wood and tools. Weak value for weapons and salt.
- `Emberkin`
  Likes food and gemstones. Weak value for tools and weapons.
- `Riverborn`
  Accepts all categories at lower rates. Reliable fallback faction.

### Religion model recommendations

Keep religions separate from factions. Factions are civic or political. Religions are spiritual.

Initial recommendation:

- two religions in Riverhold,
- each granting different passive city perks or donation efficiencies later.

### Major unlock gates

- Emberkin influence unlocks `Khar-Barak Gate` route to Emberfell
- Ashkar influence unlocks Lighthouse access

### Why this works

Riverhold becomes the first truly strategic city. It gives the player choices that affect map expansion instead of only inventory growth.

---

## Timberfell

### Role

Wood industry town. Best pine and oak processing center. First birch zone. Home of the sawmill.

### Player purpose

The player should come here to:

- gather birch,
- process lumber,
- farm large wood quantities,
- support construction-heavy progression.

### Mechanical identity

Timberfell should feel industrious and specialized. It is the wood equivalent of Khar-Barak's metal identity.

### Suggested lane labels

- `Pineworks`
- `Oakline`
- `Sawmill`

### Location pool

#### Pineworks lane

- Dense Pine Stand
- Resin Grove
- Logging Cut

#### Oakline lane

- Old Oak Rise
- Split Bark Grove
- Timber Path

#### Sawmill lane

- Sawmill Yard
- Stacked Lumber
- River Log Boom

### Resource identity

Primary outputs:

- pine logs
- oak logs
- birch logs
- processed boards or planks if added later

### Service identity

- Sawmill
- wood-focused trade

### Recommended restrictions

- keep combat light
- do not dilute it with mining

### Why this works

It gives wood progression the same dignity as metal and creates a real reason to travel for building materials.

---

## Sunken Path

### Role

Undead route zone that gates access to multiple destinations. Combat-heavy path with a darker tone.

### Player purpose

The player should come here to:

- defeat draugers,
- earn bones and rare grim materials,
- unlock route passage toward Elk-Vael, Twin-Spire, and Bryndell.

### Mechanical identity

This zone should feel oppressive and dangerous. It is a route challenge, not a resource paradise.

### Suggested lane labels

- `Ruins`
- `Marsh`
- `Burial Road`

### Location pool

#### Ruins lane

- Fallen Arch
- Cracked Waystone
- Sunken Pillar

#### Marsh lane

- Blackwater Edge
- Rot Mire
- Reed Hollow

#### Burial Road lane

- Drauger Cairn
- Grave Track
- Broken Procession

### Enemy identity

- draugers
- undead stragglers
- gravebound elites at low frequency

### Resource identity

Primary outputs:

- bones
- cursed relics
- dark alchemy ingredients later

Secondary outputs:

- marsh forage if desired

### Recommended rule

Treat this as a sustained-combat checkpoint rather than a single boss zone.

### Why this works

It makes route unlocking feel earned and supports prayer plus future potion loops without trivializing either.

---

## Twin-Spire

### Role

Prayer capital and spiritual progression zone. First place to unlock cauldron and potion crafting. Home of Eirenfolk faction progression.

### Player purpose

The player should come here to:

- grind prayer efficiently,
- access the cauldron system,
- donate to Eirenfolk,
- progress toward Ancient Lifts access.

### Mechanical identity

Twin-Spire should feel ritualistic and vertical. It is about spiritual advancement and selective high-value offerings.

### Suggested lane labels

- `Sanctum`
- `Spirefoot`
- `Liftworks`

### Location pool

#### Sanctum lane

- Prayer Hall
- Offering Flame
- Reliquary Court

#### Spirefoot lane

- Pilgrim Steps
- Quiet Terrace
- Bell Path

#### Liftworks lane

- Ancient Lift
- Counterweight Hall
- Sealed Ascent

### Service identity

- prayer-focused donation loop
- cauldron unlock
- rare ingredient demand

### Faction recommendations

`Eirenfolk` should value:

- gemstones
- rare potion ingredients

`Eirenfolk` should weakly value:

- food
- potions
- weapons
- wood

This makes them materially selective and culturally distinct.

### Unlock gates

- Eirenfolk influence gates access through the Ancient Lifts to Elk-Vael

### Why this works

It gives prayer a destination, gives potions a lore home, and creates a clean bridge into later mountain or highland content.

## Cross-zone progression map

Recommended high-level player flow:

1. Player stabilizes early game near Aerendell and Khar-Barak.
2. Player branches to Still-tide Pass for oak and stronger route grinding.
3. Player conquers Duun-Vael Bridge as first major combat gate.
4. Player gains access to Aelbrook for farming stabilization.
5. Player reaches Riverhold and begins faction and religion play.
6. Player branches to Timberfell for wood industry.
7. Player survives Sunken Path for undead route access.
8. Player reaches Twin-Spire for prayer and potion progression.

## Recommended new systems versus reused systems

### Reuse now

- banks
- city trading
- faction donation using current donation structure
- religion donation using current donation structure
- fishing pools by location
- lane labels
- route gating via zone flags or influence thresholds
- crafting stations and build unlocks

### Add later only if needed

- full reputation UI overhaul
- faction shops
- city tax systems
- dynamic travel events
- separate dialogue trees
- route-specific boss encounters

## Implementation risks

### Biggest risk

Trying to add all lore, faction logic, resource cards, and route gating at once will create balancing noise and slow testing.

### Safer approach

Implement each zone in three passes:

1. zone shell and lane labels
2. location cards and resource loops
3. services, unlocks, and faction gates

## Recommended first coding slice

If we start implementing next, this is the best first slice:

1. `kharBarak`
2. `stillTidePass`
3. `duunVaelBridge`

Why:

- they create a full early-to-midgame arc,
- they deepen the economy,
- they add a combat checkpoint,
- they do not require a major new system.

## Content density targets

To avoid bloated decks, use these rough targets:

- safe city zones: 8-12 location cards total
- travel/combat zones: 9-12 location cards total
- specialized production zones: 8-10 location cards total
- major hub cities: 10-14 location cards total, but with service-heavy cards

## Final recommendation

The best version of this expansion is not the one with the most zones. It is the one where every zone clearly answers:

- Why do I go here?
- What does this zone do better than anywhere else?
- What progression does it unlock?
- What deck should I want to bring here?

If we keep those four questions central, this region buildout should slot into the current game very naturally.
