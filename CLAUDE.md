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
    node test/zones.js       GLOBAL deck (travel adds no cards), zone gating
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
    node test/deckcap.js     3/3/3+berry starting deck, 30-card cap, max 3 copies, overflow banks to collection
    node test/firstboot.js   a genuinely fresh install (no save) populates the location field and deck on its own
    node test/emblems.js     new Boulder/Pine Tree/Flint/Logs emblems resolve and render distinctly
    node test/refiningskills.js  Wood Cutting (Sawmill) / Stone Cutting (Stone Cutter) grant their own xp, not Crafting's
    node test/market.js      Market page: sell/buy pricing, trade gated on Khar-Barak/Riverhold only being Cities
    node test/tierpips.js    equipment tier -> star-pip count, foil inheritance, hand/deck rendering
    node test/birchchain.js  Pine/Birch Planks chain, Birch Tree (Still-tide Pass, Bronze Axe gated), Fishing Rod rework
    node test/villagerbar.js hired-villager progress bar (looping, stalled=no bar), crate->inventory->bank spend order
    node test/tieredprayer.js purge/restore/move prayer cost scales 2x per gear tier, Donate bar's 10x xp-per-fill
    node test/villagerslowdown.js villagerCraftMult 25x (was 5x), Forage's halved flax/berries yield (seeds untouched)
    node test/deckaltar.js   Bone Altar renders on the Deck page (not Craft), craft-tab dot ignores off-page stations
    node test/foodcards.js   food-as-cards (persist on play), fuel points, anyOf costs
    node test/damagetypes.js blunt/pierce/slash/ranged typing, weak/resist multipliers, ships inert
    node test/clock.js      real-device clock, day/night boundary, flip-only re-render, header readout
    node test/season.js     seasonal calendar (1 real week = 1 season), Day1=Spring, old-save migration
    node test/nightgating.js Batch 3: night hours, nightOnly fish, 2x enemy dmg/loot at night

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
- **The deck is global; only the pasture (location field) is per-zone.**
  Deck, deck slots, inventory, and skills are all shared everywhere — see
  the "deck is global" entry below. Zones each own their own location
  field/pasture and, as of the home-base rework directly below, nothing
  else.
- **Every zone but Aerendell is gather-only now — home-base rework.**
  Every crafting station except Bare Hands (`G.ALWAYS_BUILT`) carries
  `zones: ['aerendell']` and refuses to build anywhere else
  (`G.buildStation` checks `G.inZone(st)` directly, not just the UI
  hiding the option). This replaces the old "cross-zone dependencies are
  deliberate" design — cottages needing nails from one zone, tanned
  leather from another, the Scrap Pick built in one zone but only paying
  out ore in a third — all of that required REBUILDING stations fresh in
  every zone you traveled to, which is exactly the "starting over each
  zone" friction this reverses. The loop now: travel out, gather what
  Aerendell can't produce, bring it home, craft at the one set of
  stations you actually maintain. Farming followed the same move —
  `G.plantSeed` now requires `S.zone === G.START_ZONE` outright (it used
  to be region-locked, so Forest Road could farm too since it shares
  Aerendell's region); the Farm page shows an explanatory empty state
  elsewhere rather than dead "tap to plant" tiles that would silently
  fail. Two now-stale things worth knowing if you touch stations again:
  `S.built` is still stashed per zone in `world.js` (harmless — no zone
  but Aerendell will ever populate it beyond Bare Hands), and several
  recipes inside `bench`/`armorBench` still carry their own
  now-redundant `zones: ['aerendell']` from when they were split by zone
  — left as explicit documentation, not a bug. See `test/zonebuild.js`.
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
- **A genuinely fresh install (no prior save at all) now populates the
  Play page's field slots on its own** (fixed — `js/main.js`'s cold-boot
  `!had` branch now runs the same `G.buildLocationDecks()` + shuffle +
  `G.fillLocationField()` sequence `G.wipe()` always did; before this fix
  a first-ever load left `S.locationField` stuck at `freshState()`'s
  `[null, null, null]` forever, since nothing else on the cold-boot path
  populated it — `G.load()`'s own migration branch only runs when an
  existing save is found, and `UI.renderLocationField()` is render-only
  with no self-heal, per the project's own "never render from a system"
  rule). No test previously caught this because every test calls
  `G.wipe()` before asserting on the field; `test/firstboot.js` now
  boots with no `G.wipe()` call at all, exercising the real path.
- **Four emblems got real, distinct art** (`js/sprites.js`): Boulder
  (`G.SPRITES.boulder`) is a bulkier rock filling nearly the full 24×24
  viewBox — since every location card renders its emblem at a fixed
  `sp(want, 30)` regardless of content (`UI.renderLocationField`), "look
  bigger than Stone" has to come from the silhouette itself, not a size
  argument. Pine Tree (`G.SPRITES.tree`) is an actual 3-tier pine
  silhouette + trunk, replacing the raw-log `wood` art it used to borrow.
  Logs/`wood` now draws three stacked log-ends (bark ring + lighter cut
  face each) instead of one plank block — Planks still reuses this same
  art via the existing `ALIAS.planks = 'wood'`, unaffected. Flint
  (`G.SPRITES.flint`) is a new slim knapped-flake shape — it previously
  had no sprite entry at all and was silently falling back to the literal
  Stone icon via `G.resSprite`'s default. See `test/emblems.js`.
- **The two raw-refining stations have their own skills now.** Sawmill's
  Planks recipe grants **Wood Cutting** (`G.SKILLS.sawmilling`) xp;
  Stone Cutter's Stone Block *and* Basalt Block recipes both grant
  **Stone Cutting** (`G.SKILLS.stonecutting`) xp — both used to grant
  generic Crafting xp instead, same "moved off Crafting onto its own
  skill" precedent Tanning followed earlier (see the comment on
  `crafting` in `G.SKILLS`, data.js). Deliberately distinct from the
  pre-existing `woodcut`/"Logging" and `mining` skills, which track
  swinging an axe/pick out in the field, not milling the result at the
  station. Neither new skill has milestone perks yet (`perks: {}`,
  same as `farming`) — not asked for, so none were invented. See
  `test/refiningskills.js`.
- **The bottom nav bar's `env(safe-area-inset-bottom)` padding was
  silently dead on every iPhone** until now — `<meta name="viewport">`
  never had `viewport-fit=cover`, and without that the browser doesn't
  extend the layout under the home-indicator/rounded-corner area at
  all, so every `env(safe-area-inset-*)` read as `0px` regardless of
  what CSS asked for. Fixed (`index.html`), plus the nav bar itself
  grew ~20% (button padding, label size, and the 18px→22px icon size
  in `main.js`'s nav-icon injection) with a fixed `+6px` minimum
  cushion stacked on top of the real device inset
  (`calc(env(safe-area-inset-bottom) + 6px)`) so there's a comfortable
  margin even on a device reporting a small/zero inset.
- **The press-hold-drag-drop way of playing a hand card is gone —
  tap-to-choose is the only way to play a card now.** It was removed
  outright (not just fixed) after a real playtest bug: dragging a card
  more than 10px and releasing anywhere inside `#field` silently
  auto-played it with no reflex window at all (`G.playCardAt`, engine.js
  — deleted). Since `#hand` is a DOM child of `#field`, and 10px is
  well within normal thumb jitter from fast repeated tapping (grinding/
  "farming" a resource), ordinary taps were routinely misread as a
  completed drag-drop, which felt exactly like "a card auto-chooses
  itself every hand." `wireCardDrag`/`onDragMove`/`onDragEnd`/
  `abortDrag`/the ghost-card CSS (`.hcard-ghost` and friends) are all
  gone from `js/ui.js`/`css/style.css`. `G.resolveCard`'s `targetIndex`
  parameter and `ctx.target` (read by melee/ranged/mine/axe/fishing in
  `systems/cards.js` via `G.activeLocation`/`G.damageLocation`'s
  optional forceIndex) were deliberately left in place — always
  `undefined` now, gracefully falls through to the normal lowest-hp
  auto-pick, and isn't exclusively drag-feature plumbing, so ripping it
  out wasn't part of this fix.

- **Equipment cards show one star pip per gear tier, reusing the exact
  glyph the foil-card corner star already uses.** `card.tier` (a numeric
  0-3 field, previously an unused string on a few axe cards only) is set
  on every equipment card: Flint tier = 0, Stone/basic-bow tier = 1,
  Scrap tier = 2, Bronze tier = 3; Fishing Net stays 0, Fishing Rod is 1.
  `tierPipsHTML(tier)` (js/ui.js) builds an N-star `.tier-pips` div,
  positioned top-left (`css/style.css`) so it can coexist with the
  existing top-right foil star — used in the hand (`.hc-art`), the deck
  list, and the collection list (`.deck-card-pill`). Foil variants
  inherit `tier` automatically through `G.cardDef`'s existing
  `Object.assign({}, base, {...})` foil construction (js/core.js) — no
  extra plumbing needed. `tier` had to be added to BOTH `js/data.js` and
  `js/custom-content.js`, since custom-content.js redeclares essentially
  every gear card and its version is what's actually live (see the
  Architecture callout above). See `test/tierpips.js`.
- **A second Planks tier — Birch Planks — sits above the original
  Planks, which is renamed Pine Planks.** `G.RESOURCES.planks.name` is
  now `'Pine Planks'` (key unchanged, no migration needed, same
  display-rename pattern as the earlier Wood→Logs rename). New
  resources `birchLog`/`birchPlanks` (data.js only — neither override
  file touches these keys); both reuse the existing wood/log sprite art
  via `ALIAS` (js/sprites.js), no bespoke shape. A new `birchTree`
  location (custom-content.js) drops Birch Logs, requires an axe, and
  specifically gates on the Bronze Axe via `requiresCard: 'axeBronze'`
  (enforced only at swing-resolution time — see `locationMatchesCard`,
  js/engine.js — not as a blanket reachability check); it's mixed into
  **Still-tide Pass's** tree slot only (`stillTidePass.locationDecks[1]`),
  not Forest Road. The Sawmill's new `birchPlanks` recipe costs
  `{birchLog: 3, planks: 2}` — a raw new material plus the previous
  tier's refined good, the same pattern the Stone Cutter/Sawmill
  established earlier — and is deliberately not `villagerRecipe: true`,
  so a hired villager still defaults to the cheaper Pine Planks recipe.
  **The Fishing Rod recipe now costs Birch Planks instead of Pine
  Planks**, and gained a `zones` allowlist (every zone except Aerendell)
  — it's no longer craftable in the starting zone at all, matching the
  removal of Fishing Rod from Aerendell's starting content. Birch Planks
  are also earmarked for future tier-4 recipes, none of which exist yet.
  See `test/birchchain.js`.
- **Berries and Flax now mature in a single watering, and farm plots
  show a small status pip.** `G.CROPS.flaxSeed.stages` and `berrySeed.
  stages` both dropped to `1` (data.js) — `G.plotReady` (systems/farm.js)
  already just compares `plot.stage >= crop.stages`, so no other logic
  needed to change. `UI.renderFarm` (js/ui.js) now appends a small
  `.dot` span (`css/style.css`) to each non-empty, non-growing plot: red
  `dot.needs-water` (freshly planted, not yet watered) or green
  `dot.ready` (matured, needs harvest) — a `growing` plot shows only its
  existing progress ring (no dot layered on top, since the ring already
  communicates that state), and an empty plot keeps its own "tap to
  plant" hint with no dot either. Same small-indicator visual language
  as the existing crafting-station pip. See `test/farm.js`.

- **A hired villager's station menu row now shows a looping progress
  bar**, the same `.r-progress`/`.r-progress-fill` markup the
  player's own tap-craft row uses (js/ui.js, `renderStationsInto`).
  Unlike a player job it has no single end, so the bar loops forever
  (`animation: craftFill <period>ms linear <negDelay>ms infinite
  both`) instead of running once — synced with a negative delay onto
  `elapsed mod period` (`S.villagerLast[zone:stationId]`, `G.
  villagerInterval`) so re-rendering mid-cycle never restarts it. A
  stalled villager shows a static, unanimated bar instead, since it
  isn't actually progressing.
- **What a villager consumes now draws on the same three tiers the
  player's own crafting does, not the zone crate alone.** `G.
  zoneSpend`/`G.zoneCanAfford` (systems/storage.js) now check the
  villager's own zone crate first, then the player's carried
  inventory, then — if that zone has a bank — the shared bank, same
  order as `G.spendCraftCost`. What a villager PRODUCES still lands
  only in its own zone's crate (`G.zoneGrant`, unchanged) — this
  only widened what it can spend, not where its output goes. Carried
  inventory and the bank are both global state (not tied to
  `S.zone`), so offline/away-from-zone correctness is unaffected —
  see `test/villagerbar.js`.
- **Moving a card into or out of the active deck now costs 2x prayer
  points per gear tier the card carries.** `G.cardTierMult(key)`
  (core.js) reads the same `card.tier` field the star pips use and
  returns `2^tier` (Flint x1, Stone x2, Scrap x4, Bronze x8); `G.
  purgeCost`/`G.deckMoveCost` both take an optional `key` and
  multiply their existing flat, prayer-level-scaled rate by it.
  Non-equipment cards (no `tier` field) are unaffected. The Deck/
  Collection pages now show each card's own scaled cost right on its
  Remove/Move/Add button (`'Remove (Npt)'` etc.) instead of one flat
  hint at the top of the page; the nav-bar deck-tab dot
  (`G.canAffordAnyDeckWork`, systems/craft.js) now checks whether
  the player can afford at least one actually-available action
  (cheapest purge in the current deck, or cheapest restore from the
  collection) rather than a single flat threshold. See `test/
  tieredprayer.js`.
- **The Donate bar's zone-xp payout is 10x what it used to be.**
  `TUNE.donateXpPerFill` (data.js) is 10, replacing the old flat +1
  per crossing of `TUNE.donateWorthPerXp` — `G.donateItems` (systems/
  craft.js) grants `G.grantZoneXp(S.zone, TUNE.donateXpPerFill)`
  per threshold crossing instead. See `test/tieredprayer.js`.

- **Villagers are 25x slower than a player's own tap now, not 5x.**
  `G.villagerCraftMult` (data.js) is 25 — a further 5x on top of the
  original 5x figure. `G.villagerInterval` (systems/township.js)
  reads it unchanged, so every other rule (station-upgrade speedup,
  `G.timeScale()` hook, offline catch-up math) still applies exactly
  as before, just against a much longer base period. See `test/
  villagerslowdown.js`.
- **Forage's flax/berries yield is halved; its seed drops are not.**
  `TUNE.forageHerbMult` (0.5, data.js) is applied to `roll.flax`/
  `roll.berries` in `systems/cards.js`'s `forage` kind, AFTER crit-
  doubling and the foraging-skill/foil multiplier have already
  compounded, floored with a minimum of 1 (`forageHerbQty`, a local
  helper) so a forage can never round all the way down to zero.
  `flaxSeed`/`berrySeed` — both their 15% chance and their quantity —
  are completely untouched; only the guaranteed flax-or-berries pick
  was nerfed. Applies identically to the live-play, offline-catchup,
  and card-face-preview paths. See `test/villagerslowdown.js`.
- **Building past the free starting farm plots now costs Pine Planks
  and Basalt Blocks, doubling each time, capped at 12 total.** The
  old "auto-unlock a plot every 5 farming levels" formula
  (`G.farmPlotCount`, systems/farm.js) is gone — plot count is now
  `TUNE.farmPlotsBase` (3, from custom-content.js's TUNE override)
  plus `S.farmPlotsBuilt`, capped at `TUNE.farmPlotsMax` (12 — 3 base
  + 9 buyable). `G.nextFarmPlotCost()` returns `{planks: N,
  basaltBlock: N}` where `N = 2 * 2^S.farmPlotsBuilt` (2, 4, 8, 16,
  … up to the 9th purchase), or `null` once at the cap.
  `G.buildFarmPlot()` spends that cost via the normal `G.
  spendCraftCost` inventory→crate→bank order and increments
  `S.farmPlotsBuilt` (global, not zone-tied — matches
  `farmPlotCount`'s own non-zone-scoped nature; only Aerendell has
  anything to grow anyway). The Farm page's grid renders one more
  tile after the real plots — same `.farm-plot` visual register, a
  solid accent border instead of empty's dashed one — showing the
  next cost and disabled until affordable; it disappears entirely
  once `nextFarmPlotCost()` returns `null`. See `test/farm.js`.
- **A farm plot's status pip now covers all three non-growing
  states, not just needs-water/ready.** An empty plot now also gets
  a `.dot.empty` pip (`UI.renderFarm`, js/ui.js) alongside the
  existing red needs-water / green ready pips — `growing` is the one
  state left with no pip, since its progress ring already
  communicates that. See `test/farm.js`.

- **The Bone Altar renders on the Deck page, not the Craft page.**
  The station carries `page: 'deck'` (set in **both** data.js and
  custom-content.js, since the altar is one of the 5 stations
  custom-content.js fully redeclares) — the same `stationPage(st)`
  mechanism the Campfire already used for `page: 'farm'`, so no new
  routing was needed. It renders into a new `#deck-stations`
  container placed directly beneath the prayer-point panel, via the
  shared `renderStationsInto('deck-stations', 'deck', ...)` helper
  called from `UI.renderDeck`. The point of the placement: `#pp-val`
  sits immediately above, and already re-renders on `state:changed`,
  so the counter visibly ticks up as each bone goes in — verified
  live (0 → 1 without leaving the page).
  **Also fixed alongside it:** `UI.craftBadge` iterated *every*
  station with no page filter, so the Craft tab's dot lit up for
  stations that render on other pages — the Campfire (`page:
  'farm'`) has been doing this all along, and moving the altar would
  have added a second case. It now skips any station whose
  `stationPage()` isn't `'craft'`. See `test/deckaltar.js`.

- **The deck is GLOBAL now — zones no longer own decks, and travel
  never hands you cards.** This was a real playtest bug: every zone
  defined its own `deck` block (Forest Road's was 8 flint / 8 stick /
  10 forage), and `world.js`'s `restore()` called `G.buildDeck()` on
  first arrival, which built a whole fresh starter pile from that
  block *and* re-added a copy of every card ever crafted from
  lifetime `S.made` counts. Fixed by deleting all 7 zone `deck`
  blocks (3 in data.js, 4 in custom-content.js) and removing
  `deck`/`drawnCount`/`deckSlots`/`activeDeckSlot` from `stash()`/
  `restore()` entirely. `G.buildDeck` now always reads
  `G.STARTING_DECK` and is only called for a brand-new game or to
  recover an empty deck — never on travel. Still zone-tied:
  `locationDecks`, `locationField`, `built`, `farmPlots`. Deck slots
  are global too, so D1/D2/D3 loadouts are available everywhere, and
  a zone's preferred-slot auto-equip (`preferredDecks`) survives as
  a pure convenience switch between loadouts you built yourself.
  Note `G.pruneZoneDeckCards` is now dead code — nothing calls it,
  and its `zone.deck.oreVein` gate can never be true.
- **Deck limits are 30 total / 3 copies of one key, and 30 is a
  MAXIMUM, not a required size.** `TUNE.deckCap` 60 → 30,
  `TUNE.maxCardCopies` 5 → 3, `G.STARTING_DECK` 5/5/5 → **3/3/3**
  (9 cards; a Red Berry card joins it in the food batch). The small
  opening deck is deliberate — it grows toward the cap as you craft
  variety, which is what makes later food/utility cards worth deck
  space instead of needing ever-bigger heal numbers. Removing cards
  to the collection still works and you may sit below the cap, so
  prayer pricing is unchanged (still tier-scaled).
  **A craft that can't fit now goes to the collection instead of
  vanishing** — `G.addCardToDiscard` (engine.js) used to `break` and
  silently destroy the copy once a key hit the cap; it now banks the
  overflow in `S.collection` and emits `collection:changed`. New
  `G.enforceDeckLimits()` (core.js) trims any deck slot back inside
  both limits, moving the excess to the collection rather than
  deleting it, and runs as a save migration on load (older saves were
  built under 60/5). See `test/deckcap.js` and `test/zones.js`.
- **Boulders share Forest Road's "Forest" slot with the pine trees**
  (`locationDecks[0]` is `{pineTree: 5, boulder: 5}`, slot label now
  "Forest & Rock") so stone is obtainable in the second zone — but
  only one card is face-up per slot, so you must clear whichever is
  showing to reach the next. See `test/mining.js`.

- **Food is CARDS ONLY — there is no eat-from-the-bag path.**
  `G.eat`/`G.canEat` are deleted; raw food (berries, poultry, pork,
  steak, every fish) is now purely an INGREDIENT. Healing happens by
  playing a `kind:'food'` card. A clean tap doubles the heal like
  everything else; playing at full health refuses WITHOUT burning the card.
  Four cards: Red Berry (1), Cooked Meat (3), Cooked Fish (3),
  Cooked Rare Fish (5). The starting deck is 3/3/3 + **1 Red Berry**
  (10 cards). A food card is an ordinary card in every other respect —
  dealt into the hand, played from it, **not consumed** (it stays in
  the deck and comes round again next cycle), and showing `+N hp` on
  its face via `combatLine` (which would otherwise leave it blank,
  since food grants no resources to list). The limit on healing is
  therefore DECK SPACE, not stock: `TUNE.maxCardCopies` 3 caps how
  many heals you carry per cycle, which is what makes later food
  tiers worth their slots. `G.consumeCardFromDeck` (engine.js) is
  left in place but unused — it's the codebase's only single-copy
  remover and a future consumable card kind will want it.
  **The header hotbar is gone entirely** — `UI.renderHotbar`,
  `UI.healingItems`, `TUNE.hotbarSlots`, `#hotbar` and the whole
  `.hot*` CSS block are all deleted. It existed to tap-to-eat from
  inventory, which no longer means anything. `G.USABLES` is still
  declared but now has nothing that would surface it.
  See `test/foodcards.js`.
- **Cooking makes cards, via two new recipe cost shapes.** The 20
  per-item cook recipes (`cookPoultry`, `cook_<fish>` x16, …) are
  gone; the Campfire has 4 card recipes plus Burn Charcoal. Two
  fields extend the flat `cost` object (systems/craft.js):
  `fuel: N` spends N FUEL POINTS from any burnable (stick 1, wood 4,
  charcoal 8 — `G.fuelAvailable`/`G.spendFuel`, which burns the
  CHEAPEST fuel first so charcoal isn't wasted, and lets the last
  item overshoot since fuel burns whole); `anyOf: {keys, qty}` spends
  N of any ONE key in the list (`G.anyOfChoice` picks the biggest
  qualifying stack), which is why 16 near-identical fish recipes
  collapse into one Cooked Fish card. Both are enforced in
  `canStartRecipe` and spent in `spendRecipeCost`, the single gate
  and single spend both `G.craft` and `G.startCraftJob` already ran
  through. `UI.recipeCostHtml` renders all three shapes.
  The Campfire also lost its bespoke "pick a food, pick a fuel" panel
  and renders like any other station — `renderCampfireStation`,
  `G.campfireRecipes`, `G.startCampfireCook` and `S.campfireJob` are
  now dead code.
- **`G.FISH` now exists — it never did.** `G.isFish` read an
  undefined `G.FISH` and so always returned false, meaning
  `S.fishCaught` never recorded anything and the Fish Journal was
  permanently empty. That was the long-standing `test/fishing.js`
  failure, now fixed. The table also marks the one `rare: true` catch
  each water location hides (goldenKoi / glassEel / silverSalmon /
  moonfin — one per fishing region), which is what separates the
  Cooked Fish and Cooked Rare Fish recipes. `G.isRareFish` and
  `G.fishKeys(rare)` read it. bass/catfish/whitefish/moonfin belong
  to the orphaned `lake` location and aren't obtainable yet.

- **Damage types are wired but deliberately unassigned.** Every
  attack card carries a `damageType` — blunt (Wooden Club), pierce
  (all Picks, Ore Vein), slash (all Swords and Axes), ranged (every
  bow, per its own weapon class). Fishing gear is untyped on purpose:
  it damages water locations, never a resistant enemy. A location can
  answer with `weak`/`resist` in either shape — array shorthand
  (`weak: ['pierce']`, using `TUNE.weakMult` 2 / `TUNE.resistMult`
  0.5) or explicit per-type numbers (`resist: {blunt: 0.25}`).
  `G.damageMult` (engine.js) combines them and `G.damageLocation`
  applies it. A resisted hit floors at 1 so nothing becomes
  accidentally unkillable, but an explicit `0` is honored as true
  immunity. **No location declares weak/resist yet**, so every
  multiplier is currently 1 and the system has zero balance impact —
  `test/damagetypes.js` asserts that inertness directly.
  One subtlety worth preserving: the damage type is read from
  `G.current` (the card being played), NOT from `damageLocation`'s
  `cardKey` argument. `cardKey` is also what `locationMatchesCard`
  uses to enforce a location's `requiresCard` gate, and only the axe
  passes it — routing damage typing through it silently made picks
  unable to hit Khar-Barak's Scrap-Pick-gated ore vein. Keep the two
  separate.

- **Farm plots show a live countdown and a progress bar while
  growing, and splash when watered.** Flax and Red Berries are both
  `stageMs: 120 * 1000` — 120s is the BASE, and the farming skill
  still shortens it (`G.farmGrowMs`, -2%/level floored at 40%). The
  plot's hint counts down (`2:00 left` -> `45s left`, `fmtRemain` in
  ui.js) instead of reading "growing...", backed by a `.farm-progress`
  bar along the bottom edge; the corner ring stays as the
  at-a-glance state indicator. Watering plays a one-shot CSS ripple
  (`.farm-plot.watering`), flagged via `UI.flagWatered` from the
  `farm:watered` event and replayed at render — watering rebuilds the
  whole grid, so a class set on the old element would be thrown away.
  Honors `prefers-reduced-motion`.
  Two things worth not regressing: the farm ticker now emits
  `state:changed` while ANY plot is growing (not only when a stage
  completes), or the countdown would freeze between renders; and
  **the growth animations start in a deferred pass after
  `wrap.appendChild(grid)`** — `void el.offsetWidth` cannot force a
  reflow on a node that isn't in the document yet, so setting the
  from-state during the build loop meant the browser only ever saw
  the end state and the bar snapped straight to 100%. The ring had
  the same latent bug. See `test/farm.js`.

- **Batch 1 of the real-time/economy plan: the real-device clock.**
  `systems/clock.js` — game hour IS the device's real hour
  (`G.gameClock()`, `Date.now()`, nothing persisted, nothing cached).
  Day is `[TUNE.dayStartHour, TUNE.nightStartHour)` (6am–8pm by
  default); `G.isNight()` is the boolean everything downstream will
  read. A shared-registry ticker (`registerTicker('clock', 60000,
  ...)`) fires `clock:changed` every real minute so the header
  readout stays live, but only emits `state:changed` — the signal
  that triggers a full `UI.renderAll()` — on an actual day/night
  FLIP, same "don't re-render for nothing" discipline the farm/
  villager tickers already follow. A small header pill
  (`#clock-badge`, styled to match `.hdr-lv`'s weight rather than
  compete with the deck/bag buttons) shows a sun/moon glyph plus a
  12-hour readout — purely diagnostic in v1, nothing tappable yet.
  Player clock manipulation is explicitly NOT defended against —
  single-player, no server authority, no monetization; confirmed
  as an accepted tradeoff, not an oversight.
  **Test-harness gotcha, worth remembering for every future
  real-time system:** `test/harness.js` only mocks `Date.now()`, not
  the `Date` constructor — `new Date()` with no arguments returns the
  REAL wall-clock time in tests, silently. `G.gameClock()` calls
  `new Date(Date.now())` specifically so it goes through the mocked
  path; any future code reaching for `new Date()` directly will look
  correct in the browser and then be untestable. See `test/clock.js`.

- **Batch 2 of the real-time/economy plan: the seasonal calendar.**
  Built into `systems/clock.js` alongside the device clock. One real
  week = one in-game season (`G.SEASONS`: spring, summer, autumn,
  winter, repeating every 4 weeks); `G.gameDay()` counts real days
  since `S.seasonEpoch`, `G.gameSeason()` derives the season from it.
  `S.seasonEpoch` is stamped once, in `G.freshState`, at the exact
  moment a character is created — this is what guarantees "Day 1 is
  always Spring" regardless of the real-world date, since the
  calendar only ever counts relative to that save's own start. An old
  save with no `seasonEpoch` gets one backfilled to `Date.now()` on
  load, so it also restarts at Day 1/Spring rather than trying to
  backdate to an arbitrary past date. Purely local — nothing
  server-synced, matching the brief's own explicit scope decision.
  `UI.renderSeason` draws a small panel (`#season-panel`, styled off
  the same `--zone-soft`/`--zone-line` tokens the zone bar uses) at
  the top of the Home page: season name, "day N of 7 · M days left"
  (reading "changes tomorrow" on the last day instead of "0 days
  left"), and a progress bar. Four new sprites
  (`seasonSpring/Summer/Autumn/Winter`) give each season its own
  glyph rather than reusing the day/night sun for Summer.
  The clock ticker (from Batch 1) now also tracks day ROLLOVERS, not
  just day/night flips — a midnight rollover doesn't necessarily
  cross the day/night boundary (night already spans across midnight
  by default), so without a separate check the season panel could go
  stale if left open across it. `season:dayChanged` fires on a real
  rollover and also triggers `state:changed`.
  See `test/season.js`.

- **Fixed a real bug: the farm growth ticker forced a full app
  re-render every 5s while ANYTHING was watered, on EVERY page —
  including mid-hand on Play.** Batch 2's farm-countdown-refresh
  addition (above) fired `state:changed` (a full `UI.renderAll()`)
  once a plot was growing, with no page check. That meant every open
  session forced a whole-app re-render every 5 seconds for the entire
  growth duration the moment any plot was watered, regardless of what
  the player was doing — including mid-tap during an active reflex
  window on the Play page. Fixed: the countdown refresh now only
  fires while `S.page === 'farm'`; the real stage-completion event
  (`farm:advanced`) still fires on any page, since the nav badge needs
  it. Reported as "cards auto-select and it won't stop, starting
  ~10min into a session" — timing consistent with a first crop
  finishing its water cycle. Not fully reproduced live before fixing
  (usage-constrained); flagged as the most likely and most reckless
  candidate found, and an unambiguous improvement regardless.

- **Batch 3 of the real-time/economy plan: time-of-day gating.**
  Night is 9pm-7am (`TUNE.nightStartHour`/`dayStartHour`, adjusted
  from Batch 1's placeholder 8pm-6am). `G.rollDrops` (engine.js) now
  filters out any dropTable/oneOf entry flagged `nightOnly: true`
  during the day — not zero-chance, actually absent, so it doesn't
  dilute the other options' odds while unavailable. One fish per
  fishing zone is nightOnly: perch (Forest Road pond), dace
  (Still-tide Pass), grayling (Khar-Barak) — all in custom-content.js,
  the only file these locations live in.
  Hostiles (any location with `atk`) hit `TUNE.nightAtkMult` (2x)
  harder at night — applied where melee/ranged already compute
  `rawBack` in systems/cards.js — and drop `TUNE.nightLootMult` (2x)
  more loot, applied in `G.damageLocation` right after `G.rollDrops`,
  gated on `def.atk` so gathering nodes (boulders, trees) are
  unaffected — this is combat risk/reward, not a blanket night bonus.
  See `test/nightgating.js`.

- **Recipe pins are gone; the Craft page's Craft button is bigger.**
  The one call site that created a `{type: 'recipe', ...}` pin (the
  per-recipe row in `renderStationsInto`, js/ui.js) was removed along
  with its `Pin` button — a recipe pinned before this change still
  shows in the pin bar and can still be un-pinned from there, this
  only stops new ones. Station-type pins (the Craft page's per-station
  build row, and the station-menu Level Up section) are untouched. The
  Craft button itself grew via a new `.px-btn.lg` class
  (`font-size:13.5px;padding:12px 16px;min-height:44px;min-width:76px`,
  css/style.css) — freeing up the space the removed Pin button used
  to occupy made room for it.
- **Batch 4 of the real-time/economy plan: real-time travel, on a
  linear road chain.** Travel is no longer instant — starting a trip
  (`G.travel`, systems/world.js) opens a full-screen locking overlay
  (`#travel-overlay`, a `position:fixed;inset:0;z-index:500` sibling
  placed right after `.saveflash` in index.html) that blocks every tap
  underneath until the trip's real-world duration has actually
  elapsed; the player explicitly chose "lock the UI" over "stay
  playable while traveling." `S.travel` is `null` or `{from, to,
  departAt, arriveAt}`; arrival resolves lazily (`G.checkTravelArrival`,
  same "compute on next read" principle as farm growth/villager work)
  from a dedicated 1s ticker and once at boot right after `G.load()`,
  so a trip completes correctly whether or not the app was open the
  whole time. The ticker calls `UI.renderTravelOverlay()` directly for
  the per-second countdown rather than emitting `state:changed` (a
  full `UI.renderAll()`) — the exact mistake the farm-growth ticker
  made earlier this session (see the "auto-select" bug entry above);
  arrival itself IS global (new zone, new stations, new field) so it
  correctly still emits `state:changed` there.
  **Cost is a single ordered road, not a full point-to-point map or a
  flat per-zone number.** `G.TRAVEL_ROAD` (data.js, right after
  `G.START_ZONE`) is one ordered list — `aerendell -> forestRoad (30s)
  -> kharBarak (5min) -> stillTidePass (5min) -> duunVaelBridge (5min)
  -> riverhold (10min)` — where each entry's `ms` is the cost of
  stepping INTO it from the entry immediately before. `G.travelCost(id)`
  sums every link strictly between the player's current zone and the
  destination's positions in that list, in either direction, so it's
  genuinely point-to-point: Khar-Barak -> Still-tide Pass costs exactly
  5:00 (not "5:30 from Aerendell"), and a full Aerendell -> Riverhold
  run costs 25:30. Deliberately ONE centralized array rather than a
  `travelHours`-style field living on each zone object — a first
  attempt at that field-per-zone approach was silently overridden by
  `js/custom-content.js`'s wholesale zone redeclares (the same
  Architecture-section gotcha that's bitten stations/boulder before),
  caught via a failing test before it shipped. See `test/travel.js`.

- **Forage is zone-specific now — Aerendell only ever turns up Red
  Berries, Forest Road only ever turns up Flax.** `G.rollForage`
  (systems/cards.js) branches on `S.zone`: Aerendell rolls `berries`
  (100% — there's no other primary item to compete with) plus the
  same independent 15% `berrySeed` chance it always had; Forest Road
  mirrors that with `flax`/`flaxSeed`; any OTHER zone falls back to
  the original 50/50-flax-or-berries roll, so forage stays functional
  anywhere the card can be played without a zone rule of its own. The
  card's `face()` preview branches the same way. This is a real,
  load-bearing gate now: flax — and therefore String (Loom), and
  therefore the Bow and Fishing Net (Bench) — can only ever be
  gathered in Forest Road, so those recipes are only reachable once
  the player has actually made the trip out and back. See
  `test/zoneforage.js`.
- **Fishing Net now costs String + Stick, not raw Flax, and lost a
  now-impossible zone lock.** It was `{stick: 8, flax: 6}` with
  `zones: ['forestRoad']` (custom-content.js's bench recipes) — that
  zone lock made it permanently uncraftable the moment stations
  became Aerendell-only (see the home-base rework entry above): a
  station can only ever be built in Aerendell, so a recipe requiring
  the player to be standing in Forest Road while at that station could
  never actually fire. Now `{string: 3, stick: 8}` with no zone
  field — the flax dependency still exists, just one step removed
  (Forest Road flax → Loom → String → Bench), and craftable wherever
  the Bench itself is. `fishingRod` (also bench, unaffected) still
  legitimately restricts by `zones`, but for a different reason — it
  can't be built AT ALL in Aerendell, not "requires standing
  somewhere the station doesn't exist."
- **A one-shot banner calls out the Loom ("Spinning Table") the first
  time flax makes it home.** `S.loomUnlockShown` (persisted,
  `core.js`) flips true and fires `UI.banner('Unlocked', 'Spinning
  Table', ...)` the first time `travel:done` fires with `id ===
  G.START_ZONE` while `S.discovered.flax` is true (js/main.js). This
  is on top of, not instead of, the existing generic `'discovered'`
  toast ("First Flax. New recipes may be available.") — that one's
  event-driven off discovery itself (fires out in Forest Road, before
  anything is actually reachable yet); this one's arrival-driven and
  names the specific station, once, at the moment it actually becomes
  useful. Note `UI.toast` is currently a no-op (an early `return;` —
  see its definition in `ui.js`) — every live in-game notification
  right now actually goes through `UI.banner`, not `UI.toast`; don't
  assume a `UI.toast(...)` call is user-visible without checking that.

- **Recipes can now gate behind a station's upgrade tier, not just
  discovered materials.** A new `minLevel` field on a recipe (e.g.
  `{ id: 'scrapAxe', minLevel: 2, ... }`) is checked in both
  `canStartRecipe` (craft.js — a hard block, so no other path in can
  bypass it) and `UI.renderStationsInto` (ui.js — the recipe stays
  fully hidden below that level, same "undiscovered stays hidden"
  treatment `costKnown` already gets, rather than showing disabled).
  **The Crafting Bench's level-2 upgrade now costs Scrap Metal too**
  (`{basaltBlock: 8, planks: 30, scrapMetal: 10}`, was missing the
  scrapMetal term) **and Bench lv2 is what actually unlocks
  scrapAxe/scrapPick/scrapSword/scrapShield** (`minLevel: 2` on all
  four) — discovering Scrap Metal alone used to be enough, which
  didn't line up with Scrap Metal itself only ever dropping from
  goblins, a real fight, while the recipes sat there craftable from
  turn one. **Also fixed in passing**: custom-content.js's live
  version of scrapAxe/scrapPick/scrapSword carried a stale
  `zones: ['forestRoad', 'kharBarak']` — left over from before
  stations became Aerendell-only (see the home-base rework entry) —
  which made them permanently uncraftable (a station can never be
  built anywhere a recipe's zone lock might require standing). That
  zone lock is gone; `minLevel` is the real gate now. See
  `test/scrapshield.js` (the level-gating half) and `test/mining.js`
  (updated to build/upgrade in Aerendell instead of the no-longer-
  reachable Forest Road it used to build at).
- **Shield cards are a new passive card kind — Scrap Shield is the
  first.** Unlike every other kind, a shield card does nothing when
  tapped (`G.registerCardKind('shield', ...)`, systems/cards.js) —
  its real effect just requires sitting in the CURRENT DEALT HAND.
  `G.shieldBlock()` (engine.js, next to `G.hand`) sums `block` across
  every shield-kind card currently in hand; `G.mitigate` (core.js)
  now subtracts both `G.defense()` (equipped armor) and
  `G.shieldBlock()` from every incoming hit, so it's live the instant
  a shield is dealt and gone the instant that hand resolves — no
  separate "equip" step, no persistence beyond the hand it's in.
  Scrap Shield (`{block: 1}`, tier 2, bench recipe costing
  `{scrapMetal: 4, planks: 4}`, `minLevel: 2`) is the only shield that
  exists yet; a future tier is just a bigger `block` number on a new
  card, nothing else to wire up. See `test/scrapshield.js`.

- **Aggro enemies chip the player on every card played, not just
  when attacked — the goblin is the first.** A new `aggro: true`
  field on a `G.LOCATIONS` def (currently only `goblin`, which turns
  up in Forest Road/Still-tide Pass/Duun-Vael Bridge — it's one
  shared definition, not a per-zone copy, so flagging it applies
  everywhere it appears) makes `G.resolveCard` (engine.js) deal
  `aggroDmg` (1) to the player on EVERY card played while it's alive
  in the field, any kind at all — a Gather, a Forage, a Craft-page
  tap-to-craft never even touches this, only actual hand-card plays
  do. This is on top of, not instead of, the normal atk-based
  retaliate-on-a-failed-kill; a new `meleeBonusDmg` field (2, goblin
  only so far) adds extra damage to THAT retaliate specifically when
  the failed kill attempt was a melee card (ranged/other kinds are
  unaffected). The aggro tick is snapshotted from `S.locationField`
  BEFORE `kind.resolve()` runs, so a swing that kills the aggro enemy
  outright still counts as "it was alive when this card was played."
  **Also fixed in passing**: the shared `goblin` def's `zones`-style
  reachability wasn't broken, but this pass is what surfaced that the
  scrap-tier recipes nearby carried the same stale-zone-lock bug (see
  the scrap-tier entry above) — worth rechecking any similarly-old
  content near something you're actively touching.
- **A short "enemy strikes" animation now plays for every source of
  enemy damage, aggro or ordinary retaliate alike.** A new
  `'enemy:attack'` event (`{name, dmg, index}`) fires from three
  places — the new aggro tick, and the existing melee/ranged retaliate
  sites (systems/cards.js) — deliberately separate from the existing
  `'retaliate'` event, which still only fires for melee/ranged and
  still only drives the "Bite back" banner; if the aggro tick reused
  that banner it would pop on literally every single card played
  while a goblin sits on the field, which is noise, not feedback.
  `.locard.attacking` (css/style.css) is a quick `translateY` lift-
  and-lunge, `enemyStrike` keyframe, ~0.3s. **The tricky part**:
  `G.resolveCard` always fires a `state:changed` immediately after
  `'enemy:attack'`, which triggers a full location-field rebuild
  (`UI.renderLocationField`) — a class set directly on the DOM node
  in main.js's handler would be classing an element that's torn down
  a moment later, before the animation ever paints. Fixed the same
  way the farm page's watering splash already solved this exact
  problem: `UI.flagAttacked(index)` (ui.js, next to the pre-existing
  `UI.flagWatered`) just records which slot and when; `UI.
  renderLocationField` checks that flag at BUILD time and adds the
  class to the freshly-built node itself, so it survives the
  render that would otherwise wipe it. See `test/aggro.js`.

## Known open questions

- **"A villager draws from the shared bank" is now unreachable through
  real play.** Every station is Aerendell-only, and Aerendell has no
  `bank: true` — only Khar-Barak and Riverhold do, and neither can host
  a station any more. The mechanism itself still works correctly
  (`test/villagerbar.js` verifies it by seeding the hired state
  directly, since the normal build/hire flow now refuses), but no
  player will ever trigger it unless Aerendell gains a bank or a
  station becomes buildable in a bank zone again. Not fixed — just
  flagging that this piece of earlier work is currently dead weight.

- `requiresCard` is only actually enforced for AXE cards, because
  `G.damageLocation`'s `cardKey` argument is only passed by the axe
  handler (systems/cards.js). Melee/ranged/mine/fishing all pass
  `undefined`, so `locationMatchesCard` skips the check for them —
  meaning a Flint Pick can currently mine `oreVeinGate`, which is
  supposed to require a Scrap Pick. Found while wiring damage types;
  deliberately NOT fixed there, since enforcing it is a real balance
  change rather than a bug-fix-in-passing. Decide whether the gate
  should bind for every card kind.

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
- The Market's zone gate is a live check on the CURRENT zone being a City
  (`G.zoneHasMarket`, systems/market.js) — trade is blocked the moment you
  leave a City, including auto-kicking you off the Market page on a stale
  page switch. Only Khar-Barak and Riverhold are Cities; Aerendell is a
  Town (fixed — it used to incorrectly count as a trade city too, see
  `test/market.js`).
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
- `test/fishing.js`'s "catching fish increments lifetime journal" now
  fails (`G.damageLocation(2, 'fishing', 1)` on a pond doesn't grow
  `S.fishCaught`) — confirmed unrelated to the tier-pip/birch-chain/farm
  batch (no diff touches `S.fishCaught`, `damageLocation`, or fishing
  card logic); newly noticed while re-running the full suite, not yet
  root-caused.
- The Market's Buy/Sell lists are flat — every resource, no
  categorization or search. Worth revisiting once the resource count
  grows further; fine for now at ~30 resources.

## Style

Light, quiet interface — system fonts, soft neutrals, rounded corners, one
accent colour per zone from `G.ZONE_THEME`. Emblems are simple flat SVG, not
pixel art. Keep it calm and readable; the game is played in short sessions on
a small screen.
