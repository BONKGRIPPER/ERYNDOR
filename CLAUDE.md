# Leatheron — project context

An idle-ish deckbuilder for phones. Portrait only, one-thumb, no sideways
holding, no multi-tap interactions. Built as plain HTML/CSS/JS with no build
step other than a bundler script.

## Run it

Open `index.html` with a local server (VS Code Live Server, or
`python3 -m http.server`). Opening the file directly over `file://` works but
some browsers block localStorage, so progress will not save.

`python3 build.py` inlines everything into `leatheron-single.html`, a single
portable file for AirDropping to a phone. **Edit the source files, never the
bundle** — the bundle is regenerated and your edits would be lost. It also
includes a `localStorage` shim (falls back to an in-memory store when
`localStorage` is blocked, e.g. `file://`) so the bundle always boots even
somewhere storage doesn't persist.

**GitHub Pages (the actual installable PWA)**: this repo's `main` branch is
served live at `https://bonkgripper.github.io/ERYNDOR/` — GitHub Pages
rebuilds automatically on every push, straight from the real source files
(not the bundle). `git push` works non-interactively from here because the
credential is cached in the macOS keychain from the user's first manual
push. **Use the `/deploy` skill** (`.claude/skills/deploy/SKILL.md`) to ship
a change: it runs the tests, bumps `sw.js`'s `CACHE_NAME` (required every
deploy — that's what makes already-installed phones actually pick up the
new version instead of serving a stale cached copy forever), commits, and
pushes.

**itch.io upload**: zip `leatheron-single.html` up as `index.html` at the
zip root (no subfolder) and upload that zip as an HTML5 project, checking
"This file will be played in the browser" on `index.html` in itch's file
list. No external assets to worry about — every sprite is inline SVG and
there's no CDN/network dependency, so the zip is fully self-contained.
`localStorage` works normally in itch's iframe embed (verified: save,
reload, still there) since it's served over `https://`, not `file://` —
the shim above is only a fallback, not the itch.io path. Regenerate with
`python3 build.py` any time the source changes; re-zip before re-uploading.

## Always run the tests

    node test/smoke.js       boot, every page, every station, every card kind
    node test/hand.js        hand-of-three loop
    node test/combat.js      damage, retaliation, drops, spawn weights
    node test/zones.js       per-zone decks, travel gating
    node test/mining.js      zone mining tables, the metal chain
    node test/settlement.js  homes -> global villager slots, cross-zone material loop
    node test/weight.js      carry weight never drifts from true inventory
    node test/balance.js     timing band, xp curve, save migration
    node test/v24.js         altar tap-craft, discard insertion, themes
    node test/foraging.js    foraging skill milestones, band width, starter field variety
    node test/durability.js  tool/weapon durability drain, breaking, deck removal
    node test/zonexp.js      per-zone xp/leveling, loot wheel spins and rewards
    node test/highland.js    Highland Sheep, Highland Cloth, Highland Robes set bonus
    node test/pins.js        pin bar live updates, starting pin, auto-unpin on completion
    node test/events.js      status-effect engine plumbing (no event cards ship right now)
    node test/zonebuild.js   crafting stations are tied to the zone they were built in
    node test/zoneloot.js    zone level-up drop odds, card foils, capes, wardrobe
    node test/collection.js  deck purge/restore, prayer cost, deck cap
    node test/town.js        town tab: Township page dispatch, dot-town badge
    node test/tapcraft.js    tap-to-craft: job timing, concurrency, UI progress bar
    node test/stationlevel.js station upgrade tiers, tap-craft speed scaling
    node test/formermachines.js campfire/furnace/altar as ordinary tap-craft stations
    node test/villagers.js   station-hired villagers: hire/dismiss, zone-crate spend/produce, stalling, station menu
    node test/tickers.js     shared ticker registry, pause behavior, timeScale hook
    node test/rebalance.js   combat/yield rebalance: +1 hostile atk, bow atk, band rate
    node test/worth.js       every resource has a worth value, gems > raw, processed > input
    node test/donate.js      Bag page Donate: batch removal, worth banking, +1 zone xp on fill
    node test/farm.js        farm plots: growth timers, region lock, xp, farm grid UI
    node test/itemdetail.js  Bag item-detail sheet: view + region-gated Plant action
    node test/market.js      Market page (Khar-Barak unlock): sell/buy pricing, icon gating
    node test/locationdecks.js  field slots: 3 independent per-slot decks, not one shared pile
    node test/fishing.js     fishing card kind, water locations, S.fishCaught, fish journal
    node test/kharbarak.js   Khar-Barak reworked into a bank City: mine/river/timber lanes, no hostiles
    node test/stilltide.js   Still-tide Pass: stream/oak/combat lanes, between Forest Road and Khar-Barak
    node test/duunvael.js    Duun-Vael Bridge: all-combat Gauntlet zone, tougher bridge enemies
    node test/riverhold.js   Riverhold: bank City in the new keth-maral region, faction donation/influence
    node test/storagedeath.js  zone crates + shared banks, spendCraftCost mixing sources, death loses 35% of inventory (not gold, not stored)
    node test/prayerdecks.js  prayer skill unlocks/cheapens extra deck slots, per-zone preferred-deck auto-equip
    node test/stonecutter.js Boulder stone/basalt split, Stone Cutter refining, block-costed recipes/buildings
    node test/invgrid.js     Bag Carried list renders as a card grid, tap-to-open, corner donate-checkbox
    node test/sawmill.js     Sawmill refining, Wood->Logs rename, wood->planks cost conversion, doubled tapCraftMs
    node test/deckcap.js     5/5/5 starting deck, max 5 copies of one card per deck slot (collection is unlimited)

Run **all of them** after any change. `smoke.js` also does two static checks
that have caught real bugs: DOM ids referenced in JS but missing from
`index.html`, and functions defined twice in the same module.

`test/harness.js` stubs the DOM but returns **null** for ids that are not in
index.html, exactly like a browser. Do not "fix" that by auto-creating
elements — that leniency is what let a crash ship once already.

## Architecture

**Where content actually lives:** `js/data.js` is the static base, but
`js/custom-content.js` (loaded right after it, generated by the dev-kit
editor at `tools/editor.js`) `Object.assign`s on top of `G.RESOURCES`,
`G.CARDS`, `G.LOCATIONS`, `G.ZONES`, `G.SKILLS`, `G.TUNE`, and upserts into
`G.STATIONS` by id for exactly 5 station ids (`hands`, `bench`, `loom`,
`altar`, `firepit`) plus `G.LOCATIONS.boulder`. These are full replacements,
not copies — any edit to `bench`'s recipes/costs, `altar`'s build/upgrade
cost, or `boulder`'s drop table must be made in **both** files identically,
or the custom-content.js version silently wins at runtime and the data.js
edit does nothing (hit twice now: a stonePick rename, then the boulder
stone/basalt drop-table split below). `G.HOUSING` and `armorBench` are
untouched by custom-content.js, so those only need editing in data.js.
As of the fishing/storage/new-zones pass, **most of the game's
actual current content lives in custom-content.js, not data.js** — three new
zones, the whole fishing system's resources/cards/recipes, and Khar-Barak's
full rework all live there. When checking "does X exist," grep both files,
or you'll get a false negative from data.js alone. Same pattern for sprites
(`js/custom-sprites.js`) and now audio/image overrides (`js/custom-assets.js`
below) — never hand-edit any `custom-*.js` file, it's overwritten on the
editor's next Save.

    index.html              markup only, no logic
    css/style.css           all styling
    js/data.js              static base content: resources, cards, items,
                            enemies, stations, skills, zones, housing, tuning —
                            see the callout above, custom-content.js layers on top
    js/sprites.js           flat SVG emblems (24x24, two tones)
    js/assets.js            runtime audio/sprite-image OVERRIDE hooks (separate
                            from sprites.js's actual vector shapes) — lets
                            custom-assets.js attach a real sound/image to a
                            named hook (G.AUDIO_OVERRIDES/G.SPRITE_IMAGE_OVERRIDES);
                            custom-assets.js is currently an empty stub, unused
    js/core.js              event bus, shared ticker registry, state,
                            save/load, derived stats
    js/engine.js            deck cycling, timing window, combat
    js/ui.js                rendering only — reads state, never mutates
    js/main.js              wires events to UI, boots the game
    js/systems/cards.js     one handler per card KIND
    js/systems/craft.js     building, recipes, tap-to-craft jobs, station
                            upgrade levels, prayer purge, pins
    js/systems/food.js      eating
    js/systems/township.js  villagers and settlement housing
    js/systems/consumables.js arrow selection and spending
    js/systems/world.js     regions, zones, travel gating
    js/systems/farm.js      farm plots: planting, watering, lazy real-time
                            growth resolution, harvesting
    js/systems/market.js    buy/sell pricing off G.RESOURCES worth, gold sink —
                            trade is gated on the CURRENT zone being a City
                            (G.zoneHasMarket), not just having visited one
    js/systems/storage.js   per-zone storage crates (S.zoneStorage, weightless,
                            local to the zone) + a shared bank (S.bankStorage,
                            one pool across every zone with `bank: true`) — one
                            deposit action per deck-cycle reshuffle, withdrawals
                            unlimited. G.spendCraftCost (used by craft.js/
                            township.js/farm.js instead of a bare inventory
                            check) draws inventory -> crate -> bank in that order.
                            G.crateFor/G.zoneCanAfford/G.zoneSpend/G.zoneGrant
                            are the ZONE-SCOPED versions (not tied to S.zone,
                            not gated by the one-deposit-per-cycle rule) that
                            station-hired villagers run entirely on.
    js/systems/smelt.js     (deleted — superseded by processing.js)
    js/systems/processing.js (deleted — campfire/furnace/altar were timed
                            input-slot machines; now ordinary tap-to-craft
                            stations like any other, see craft.js)

### Rules that keep it clean
- Never touch `S.weight` directly — use `G.addRes` / `G.removeRes`.
- Never render from a system — emit an event, let `ui.js` react.
- Never read the DOM outside `ui.js`.
- New persisted fields must be added to the `PERSIST` list in `core.js`.
  Loading auto-migrates missing skills and resources so old saves survive.
- New background/idle systems register with `G.registerTicker(id, ms, fn)`
  (core.js) instead of owning a private `setInterval` — one shared loop
  drives all of them, started/stopped together from `main.js`. A duration
  a system hands out (not just polls with) should multiply by
  `G.timeScale()` at the moment it's computed — see `G.startCraftJob`/
  `G.villagerInterval` — so a future global "Slowed" status effect is one
  number to change, not N systems to touch.

## Current design

- **Hand of three.** Each turn deals 3 cards; tap one to play it, which opens
  a reflex gauge; tap again inside the band to double the effect. The other
  two are discarded. `G.phase`: choose -> window -> resolving -> choose.
- **The band is rolled fresh every card** — random width and position, so there is
  no fixed spot to memorise.
- **No idle combat.** Cards and fighting are real-time only, so you can never
  die while away. The only offline progress is villagers (see township.js);
  crafting (including the former campfire/furnace/altar machines) is all
  tap-to-craft now — a short timed cycle per tap, not a background process.
- **Per-zone decks.** Each zone owns its deck and pasture; inventory, skills
  and buildings are shared.
- **Cross-zone dependencies are deliberate.** Cottages in zone 1 need nails
  from zone 2; campsites in zone 2 need tanned leather from zone 3. The Scrap
  Pick is built in zone 2 but only pays out ore in zone 3.
- **Fishing is a card kind, not a special case.** `requires: 'fishing'`
  locations (ponds, riverbanks, streams) are matched by `G.activeLocation`/
  `G.damageLocation` through the exact same generic `requires`-matching path
  as `mine`/`axe`/`combat` — zero fishing-specific code in engine.js. Catches
  log to `S.fishCaught` (lifetime counts, not current inventory) for the Fish
  Journal (`UI.showFishJournal`), and a catch pops `UI.showFishingCatch`
  off the same `location:cleared` event every other gather already fires.
- **Storage (crates + banks) is a real risk/reward layer, not just
  inventory overflow.** Dying (`G.downPlayer`) drops 35% of every *carried*
  resource except gold — items already moved into a zone's crate
  (`S.zoneStorage`, weightless, stays in that zone) or a shared bank
  (`S.bankStorage`, one pool across every `bank: true` city — currently
  Khar-Barak and Riverhold) are untouched. One deposit action is allowed per
  deck-cycle reshuffle (`G.storageReady()`/`G.resetStorageCycle`, tripped by
  `deck:reshuffled`); withdrawals are unlimited. Crafting/hiring/planting
  costs now draw inventory → crate → bank automatically (`G.spendCraftCost`,
  systems/storage.js) instead of checking raw inventory only.
- **Prayer levels buy you more decks, not just faster prayer.** Every 10
  prayer levels unlocks another named deck slot (`G.unlockedDeckSlots`);
  higher prayer tiers cut `G.deckMoveCost()` toward free. Each zone can have
  a preferred deck slot that auto-equips on `G.travel()` into it
  (`G.setPreferredDeckForZone`). See `test/prayerdecks.js`.
- **Riverhold has a faction-donation system, engine-complete but with no UI
  yet.** `G.donateItems(keys, factionId)` raises `G.factionInfluence(
  factionId)`; the same resource is worth different amounts to different
  factions (`S.factionInfluence`, `S.selectedFaction`, defaults to
  `'ashkar'`). Riverhold's `factions` zone field lists the 4 ids (`ashkar`,
  `delborn`, `emberkin`, `riverborn`) but nothing in `ui.js` surfaces this
  yet — see Known open questions.
- **Stone/Basalt Blocks gate early crafting and building.** Boulders drop
  raw Stone or Basalt in a 75/25 split (`G.LOCATIONS.boulder`'s dropTable
  uses a 3:1-repeated `oneOf`, since `G.rollDrops`'s `oneOf` has no native
  weighting). The Stone Cutter station (Aerendell, buildable off raw
  Stone/Wood alone — no prerequisite) refines Stone→Stone Block and
  Basalt→Basalt Block. Stone Blocks are the real cost of early weapons/
  tools (Stone Axe/Pick/Sword, at the Bench); Basalt Blocks are the real
  cost of buildings/infrastructure (cottage, campsite, and the Bench/
  Armor Bench/Altar build+upgrade costs). Flint-tier tools still need
  nothing built, so the true zero-prerequisite bootstrap path is
  unchanged — Stone tier now specifically means "built a Stone Cutter."
  Basalt Block's recipe now also costs a Stone Block (`{basalt: 3,
  stoneBlock: 1}`), so basalt refining depends on stone refining but not
  the reverse.
- **Wood was renamed to Logs, and a Planks tier sits between raw Logs
  and almost everything that used to cost them.** Display-name-only
  rename — `G.RESOURCES.wood.name` is `'Logs'` but the resource key is
  still `wood` everywhere (saves, cost objects, `S.wood`), so there was
  no migration to write. The new Sawmill station (Aerendell, mirrors the
  Stone Cutter exactly, buildable off raw Logs+Stone alone) refines Logs
  → Planks. Planks are now the real cost of nearly every recipe that used
  to cost raw Wood — bench/loom/armorBench/tannery/fletching build+
  upgrade costs, Stone Axe/Pick/Sword, Backpack/Wool Pack, Bronze Axe,
  Burn Charcoal, cottage/campsite, and several stations' villager hire
  costs (see the villager rework below). The Stone Cutter and the
  Sawmill are the two deliberate
  exceptions — both stay costed in raw Logs/Stone only, never Planks or
  Blocks, so there's always a way in that doesn't depend on the OTHER
  refining station's output. `G.ALIAS.planks = 'wood'` in `js/sprites.js`
  reuses the existing log-shaped emblem rather than falling back to the
  (wrong, stone-colored) default `resSprite` fallback. See
  `test/sawmill.js`.
- **Every tap-craft recipe now takes twice as long.**
  `G.TUNE.tapCraftMs` doubled from 900 to 1800 — a single constant, since
  every station recipe's duration is `TUNE.tapCraftMs * recipeMsMult *
  stationSpeedMult * timeScale()` (see `G.startCraftJob`, craft.js), so
  doubling the shared base term doubles everything uniformly regardless
  of a recipe's own multiplier (e.g. cooking's existing flat 2x) or a
  station's upgrade discount.
- **A deck slot can hold at most `TUNE.maxCardCopies` (5) copies of any
  one card key; the collection has no such limit.** Aerendell's actual
  starting deck (`G.ZONES.aerendell.deck`, kept in sync with the
  `G.STARTING_DECK` fallback used by any zone that defines no `deck` of
  its own) is 5 Gather Flint / 5 Gather Sticks / 5 Forage. The cap is
  enforced at every insertion point: `G.addCardToDiscard` (engine.js,
  the shared choke point for crafting/foil-drops/collection-restores)
  silently stops adding once a key hits 5 — the craft itself still
  succeeds and its shared durability pool still tops up, only the
  physical card stops stacking; `G.buildDeck`'s from-`S.made` rebuild
  caps the same way; `G.restoreCard` and `G.moveCardToDeckSlot` refuse
  outright (return `false`, nothing spent) rather than silently
  dropping, since those are explicit player actions with a cost attached.
  `G.cardCountIn(arr, key)` is the shared helper. See `test/deckcap.js`.
- **The Bag page's Carried list renders as a playing-card grid, not
  rows.** `.inv-grid`/`.inv-card` (css/style.css, modeled on `.farm-grid`/
  `.farm-plot`): big centered sprite art, name below, a qty badge in the
  bottom-right corner, a donate-select checkbox in the top-left corner
  (`stopPropagation`, doesn't open the sheet). Tapping the card body opens
  `UI.showItemDetail`, which now also carries the Eat/-1/Crate/Bank
  actions that used to live on the row (row buttons are gone for Carried
  resources). Scope is the Carried list only — Equipment/Wardrobe/
  Consumables/Market/Donate stay as rows, a different data shape.
- **Villagers are hired AT a station now, not as named Town-page
  roles.** The old `G.VILLAGERS` (weaver/cook/cleric/fletcher/smith,
  one fixed recipe each) is gone. Tapping a BUILT station's header on
  the Craft page opens a small inline menu (`openStationMenu`, a
  module-level toggle in `ui.js`, same pattern as `openZoneDeckPicker`)
  with two possible rows: **Level Up** (unchanged mechanic, just
  relocated off the always-visible recipe list into this menu) and
  **Hire Villager**, shown only if the station has both a
  `villagerHireCost` and one recipe flagged `villagerRecipe: true`
  (`G.stationHireable`, township.js) — most stations do; Bare Hands and
  Armor Bench deliberately don't (no repeatable, resource-only recipe
  to hand a villager). `villagerRecipe` is always the cheapest,
  most-basic-input recipe on that station (e.g. Stone Block at the
  Stone Cutter, never Basalt Block, which would eat the player's own
  Stone Blocks) — later zones can flag more recipes per station without
  changing this shape. State is `S.stationVillagers[zone][stationId] =
  true` and `S.villagerLast['zone:stationId']` (was keyed by a villager
  id before). Still capped at 3 hires per zone + 3 per home built there
  (`G.villagerSlots`, now a flat formula with no roster to sum).
  **A station-hired villager works entirely off its OWN zone's storage
  crate** — both what it consumes and what it produces
  (`G.zoneSpend`/`G.zoneGrant`, storage.js) — never the player's carried
  inventory, and never gated by the one-deposit-per-cycle rule (that's
  a player-action limit, not a passive-production one). This is what
  makes offline progress correct regardless of which zone the player
  is standing in, or whether the app is even open: `G.collectVillagerWork`
  (township.js) is the single code path for both the live 2s-poll
  ticker and the once-on-rejoin catch-up call
  (`showVillagerReturn`, main.js), deriving elapsed cycles from
  wall-clock deltas exactly like the pre-existing farm-plot lazy-growth
  pattern. The rejoin modal lists what each station-villager made,
  which zone's crate it landed in, and flags any that stalled. See
  `test/villagers.js`.

## Known open questions

- The bow is strictly better than melee now (same retaliation, more damage).
  They need differentiating.
- The Tanning Station chain works but is thin — cows drop leather directly,
  so tanning only exists to make *tanned* leather for housing.
- Four nav tabs plus a pin bar is already some persistent chrome on a phone.
  Watch whether the play area feels cramped as more gets added.
- `ui.js` is large and could reasonably split into ui-play / ui-craft / ui-bag.
- No event cards ship right now (pulled the storm event; see the EVENTS
  comment in data.js) — the engine plumbing is still there and tested.
- The Crafting Bench's recipe list is manually sorted: axes, then picks,
  then weapons, then everything else. Keep new bench recipes filed into
  the right group rather than just appended to the end.
- The dev-kit content editor has a Farming tab (`G.CROPS`) and a
  Consumables tab (`G.CONSUMABLES`/`G.CONSUMABLE_GROUPS`) as of the editor
  audit — only `G.STATUS_EFFECTS` (currently empty, no events ship) and a
  handful of minor tables (`G.VILLAGERS`, `G.HOUSING`, `G.FOODS`,
  `G.USABLES`) still have no editor path.
- The Zones tab doesn't expose `bank`, `factions`, `order`, or `slotLabels`
  — those 4 fields (all added alongside fishing/Riverhold) can only be
  hand-edited in `custom-content.js`/`data.js` directly, not through the
  editor UI yet.
- `stillTidePass`, `duunVaelBridge`, `riverhold`, and the reworked
  `kharBarak` have no `G.ZONE_THEME` entry (data.js) — they render with no
  zone accent color, falling back to `null`. The 3 original zones still
  have themes; this wasn't kept in sync when the new zones were added.
- Riverhold's faction system (`G.donateItems` with a faction id,
  `G.factionInfluence`, `S.selectedFaction`) is fully implemented and
  tested (`test/riverhold.js`) but has no UI anywhere — there's no way to
  actually pick a faction or see influence in the game itself yet.
- `G.SKILLS.tailor` exists (added in `custom-content.js`, not `data.js`)
  but nothing grants it xp or reads its perks — the `cloth`/`string`/
  `highlandCloth` recipes still use the `crafting` skill. Looks like
  unused/abandoned content; confirm before building on it.
- `G.LOCATIONS.docks` (empty `dropTable`) and the generic `stream`/`river`/
  `lake` fishing spots aren't referenced by any zone's `locationDecks` —
  orphaned or reserved-for-later content in `custom-content.js`.
- `G.TUNE.pinSlots` is declared twice in the same `data.js` object literal
  (both `3` — harmless, but a real duplicate key; worth collapsing to one
  next time that block is touched).
- `G.CARDS.woodenClub`'s `tint` is `"Blood"` (capitalized) — every other
  card/resource tint in the codebase is lowercase (`"blood"`). Cosmetic,
  but inconsistent enough to trip something up later.
- Villager slots became per-zone (`G.villagerSlots(zone)`, each zone hires
  its own roster + 3-per-local-home), not a single global pool —
  `G.totalHomes` no longer exists. `test/settlement.js` was updated to
  match; if you find other code still assuming a global pool, it's stale.
- Farming region-lock moved from zone-level to region-level: a crop grows
  in ANY zone sharing its `region` (`G.REGIONS` id), not one specific zone
  — Aerendell and Forest Road both share `leth-eiren`, so a Leth-Eiren seed
  now plants in either. The Bag/item-detail wording changed to "Grows
  anywhere in `<Region>`" accordingly.
- The Market's zone gate changed from a one-time Khar-Barak unlock to a
  live check on the CURRENT zone being a City (`G.zoneHasMarket`) — trade
  works in any City (Aerendell from the start; Khar-Barak/Riverhold once
  visited) and is blocked again the moment you leave one, including
  auto-kicking you off the Market page on a stale page switch.
- `G.durabilityEnabled()` (core.js) now gates the whole durability system
  and appears to default to **off** (`test/prayerdecks.js` asserts
  `S.durability.pickFlint` stays unset after crafting) — `test/
  durability.js` still assumes it's always on and fails throughout as a
  result. Needs a decision on intended default/toggle before that test is
  worth fixing, not guessed at.
- `test/formermachines.js`'s "the old machine API is gone" section now
  finds `G.MACHINES`/`G.loadSlot`/`G.startMachine`/`G.tickMachines`/
  `UI.openMachine`/`UI.renderMachineBar` all present again — worth
  confirming whether the old input-slot-machine system was intentionally
  reintroduced (e.g. for a new station) or this is leftover/dead code.
- `test/zoneloot.js`'s foil-card check now finds a foil's name identical
  to its base card's name (expected to differ, e.g. "Foil X" vs "X") —
  unconfirmed whether this is an intentional simplification or a bug.
- A wider re-run of the full suite after the fishing/storage/new-zones
  pass surfaced failures beyond the ones already fixed above — in
  `foraging.js`, `mining.js`, `rebalance.js`, `duunvael.js`, `stilltide.js`,
  `riverhold.js` (faction influence not actually moving), `v24.js`. Most
  look like stale hardcoded expectations against real, intentional content/
  balance changes (new TUNE overrides in custom-content.js, new zone kill
  gates, forestRoad gaining non-hostile slots) rather than bugs, but none
  have been individually root-caused yet — treat `node test/*.js` as
  currently **not fully green** until someone works through this list.
- Only Aerendell has anything to grow (`flaxSeed`/`berrySeed`, both
  region-locked there) — the farm system supports other regions the
  moment a zone-exclusive seed exists, nothing else to build.
- The Market's Buy/Sell lists are flat — every resource, no
  categorization or search. Worth revisiting once the resource count
  grows further; fine for now at ~30 resources.

## Style

Light, quiet interface — system fonts, soft neutrals, rounded corners, one
accent colour per zone from `G.ZONE_THEME`. Emblems are simple flat SVG, not
pixel art. Keep it calm and readable; the game is played in short sessions on
a small screen.
