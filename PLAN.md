# Aerendell — Batch Implementation Plan (v2)

> Supersedes v1 of this document. Reconciled with the codebase 2026-09-10.
>
> Since the last revision: the game grew a great deal. Fishing, Beehive,
> Grind Stone, Loom, Fletching Bench and a real armor line all shipped;
> Foraging became a real skill (Crafting still has none, by choice); Combat
> got auto-attack and an Archery/Melee split; the Bag/Warehouse got real
> slot caps; six locations, a road chain and real travel replaced
> "Aerendell is the only place"; the Home/World split (Batch 9.5) made
> Aerendell the permanent workshop home and everything else a field zone;
> and the first three road-logistics batches (9.6 merchant freight, 9.7
> outpost + caravan, 9.8 passive logging crew) are built and unit-tested.
> See `README.md`'s dated entries for the blow-by-blow.
>
> Engine note unchanged: plain HTML/CSS/JS, no build step. A tiny
> `serve.js` gives ES modules a real HTTP origin (`node serve.js`).
> Logistics simulation has its own headless test suites under `tests/`
> (`node tests/freight.test.mjs`, `caravan.test.mjs`, `loggingCrew.test.mjs`).

---

## 0. Scope honesty, unchanged from v1

The brief is a game design on the scale of RuneScape's early-game systems: 16
skills, tick combat, a live per-zone economy with arbitrage, tiered crafting,
real-time-synced seasons, travel, faith, factions. Solo, in plain JS, that's
dozens of sessions. This plan is a sequence to work through incrementally, the
same way everything so far got built — one playable slice at a time — not a
near-term completion promise.

Every batch ends in something you can open in the browser and do.

---

## 1. What's actually running right now

| System | State |
|---|---|
| **Dock + screens** | Four permanent bottom-dock tabs: **Explore · Bag · Journal · Map**, plus a fifth **Home** tab shown only while standing at Aerendell (`dock.js`'s `refreshDock()`). Home is the crafting-station grid (one card per built workshop); Explore (`src/explore.js`) is "where you are and what's here" — the current location's field activities, its Market, Return-to-Aerendell when away, the Forest Road outpost, and the Freight panel; Map is the travel map only |
| **Home vs. field context** | `state.playerContext` is `home`, `field`, or `traveling`. Aerendell (`HOME_LOCATION_ID`) is the permanent workshop home; every other location is a field zone reached by travel. Workshops only open in `home` context (`PRODUCTION_SCREEN_IDS`); Field/Logging/Mining/Combat/Fishing open only in `field` context and only where `LOCATION_ACTIVITIES` lists them. The Explore/Home dock buttons set the context implicitly (`enterFieldMode()` / `enterHomeMode()`), so it isn't managed by hand. Production timers keep settling everywhere; only opening/managing them is gated |
| **Hero header** | Wallet badge top right, device-clock + day/night badge top left, "Now" banner underneath showing season/day/year |
| **Field (Farming)** | 3 plots, 2 crops (Red Berries 120s, Flax 240s, each yields 3), one growth stage each, real Farming XP/levels with a continuous per-level speed bonus. Optional Bonemeal fertilizer (`FERTILIZERS`, ×1.5, applied before the first watering) |
| **Logging** | Farming's mirror — plant a cone, water, chop once ripe. Pine everywhere by default; Forest Road grows Birch, and felling Birch needs an axe of ≥3 damage (Stone Axe or better). Own skill (Logging) |
| **Mining ("The Shaft")** | Default skill, no building. Risk/reward digging with a carried pouch lost on a cave-in and safe only once surfaced. Swing-based (several timed clicks per swing, count set by the equipped pickaxe), flat per-swing cave-in risk, a cumulative depth-weighted material pool (`MINE_MATERIALS`), spreadsheet-balanced. Pickaxes are real equipped bag items (Wooden / Flint / Stone craftable, all capped at 100m); deeper tiers are tuned data with nothing to produce them yet |
| **Foraging** | One persistent action pinned above the dock on every screen, tap-and-wait, result rolled from the current location's `FORAGE_POOLS` entry on completion. Real skill (Foraging), the one skill with milestone speed-ups (`FORAGE_SPEED_LEVELS`) rather than a continuous curve |
| **Fishing** | Three tools, three different interactions (Rod reflex minigame, Net tap-sweep, Trap set-and-forget), five pool *types* (river/pond/lake/stream/ocean) mapped per location, ~20 fish, own skill. Rod/Net/Trap are craftable at the Craft Bench |
| **Combat** | Two independent RuneScape-style clocks (enemy attacks on its own timer, player has a separate recovery clock); Attack fires on its own now. Multiple enemies, some zone-gated (Road Goblin). Weapon → attack damage, Armor+Shield → defense, Armor alone → recovery speed, Food is its own equip slot. Combat XP on every win plus Archery *or* Melee by the weapon that landed the kill. Night makes enemies tougher and more rewarding (`isNight()`) |
| **Villagers (Township)** | Ten assignable worker professions (`WORKERS`: Forager, Cook, Spinster, Mason, Millworker, Miller, Beekeeper, Fletcher, Tanner, Weaver). Villager slots come from Houses (`HOUSE_WORKER_SLOTS` = 3 each; a new save starts with one House). Assigning an unlocked profession to a free slot is **free** — no Shard cost — and freely un/reassignable. A profession unlocks when its building is built and, where set, its skill reaches a threshold (only the Forager so far: Foraging Lv 3). An assigned worker auto-runs its station's next tier as the underlying skill levels; the Forager chains the forage loop live and offline with a "welcome back" popup. Shared food/heat upkeep (`labor.js`) covers every assigned villager including outpost crews |
| **Crafting** | Craft Bench, ~20 recipes (tools, Scrap armor line, Fishing Rod/Net/Trap, baits, Short Bow, Highland Sack, …), concurrent crafts, cost deducted on start, **no skill attached** (still deferred). Reads and writes the Warehouse |
| **Conversion stations** | One generic handler (`src/stations.js`) drives ~9 build-gated stations across ~16 recipes: Spinning Wheel (Sowing), Sawmill (Woodcutting), Stone Cutter (Stonecutting), Grind Stone (Grinding), Tanning Station (Tanner), Loom (Weaving), Fletching Bench (Fletcher), Armor Bench. Each has its own skill on Farming/Logging's continuous per-level curve |
| **Beehive** | A growable station: buy Honey slots, each brews on its own `{startedAt,readyAt}` timer, chained while away. Honey is a combat buff food. Own skill (Beekeeping) |
| **Inventory** | Real slot grid: 25-slot Bag (`BAG_SLOTS`, 99/stack), 100-slot Warehouse (`state.storage`, still that save key), an Equipment tab. Bag is Inventory's default view; "Move All" skips foods. The Bag is field cargo; the Warehouse is production stock and is locked while away |
| **Currency + Market** | `state.shards` only. Aerendell's market is buy *and* sell, dynamic pricing by stock, one `BASE_VALUE` per item driving both directions, stock decaying back toward zero on a real-time half-life. Away markets can't sell or bank Warehouse items; town/city markets away from home instead offer "Send goods home" freight |
| **Buildings + Campfire** | `BUILDINGS` registry (11 build-once workshops). Campfire cooks one (fuel, item) pair at a time from a single selected fuel + cook choice (the old two-queue version was simplified away), chained while away |
| **Zones / travel** | Six `LOCATIONS` (Aerendell town, Forest Road wilderness, Thal-Barak city, Stilltide Pass wilderness, Duun-Vael Bridge landmark, Riverhold city) on a **linear** road chain (`ROADS`, 5 segments, `minutes` 5/15/5/15/15). Real travel with a countdown; Return Home takes the shortest unlocked path (Dijkstra in `travel.js`) and unloads the Bag into the Warehouse on arrival. Per-location forage pools, fish pools, tree species and activity lists. Zone XP (a 25% share of every skill XP gain feeds the current zone) with a working loot wheel on level-up |
| **Road logistics** | **9.6–9.8 built, unit-tested + playtested (2026-09-10) — the first logistics milestone is done.** Merchant freight (`shipments.js` / `freightUI.js`): "Send goods home" from an away town/city market via a −/qty/+/Max stepper sheet, one active shipment, distance-scaled fee (`stacks × 3 × ceil(roadMin/15)`), live ETA, offline delivery, retries into a full Warehouse. Forest Road outpost + one reusable cart (`caravans.js` / `caravanUI.js`): build for 50 + 100 Shards, 200-unit stockpile, 10-unit cart, per-item source reserve, ready/full departure; the outpost sheet is a compact status list with "Deposit / withdraw" and "Route settings" sub-sheets. Passive logging crew: unlock for 75 Shards with a Stone Axe, one shared housing slot, one Birch Log / 90s into the outpost, upkeep-gated, with crew/stockpile/cart upgrades. Reached via a Freight `<details>` panel and an "Outpost & cart" sheet on the Explore tab — no dedicated screen |
| **Skills** | 17-skill registry (`SKILLS`): Farming, Logging, Foraging, Mining, Combat, Sowing, Woodcutting, Stonecutting, Tanner, Fishing, Tailoring, Grinding, Beekeeping, Fletcher, Weaving, Archery, Melee — all real and trained by a live system (the eight station-based ones earn XP through `stations.js`'s generic handler). Real Skills screen behind the dock. Every skill shares a level-100 cap; Foraging is the only one on the milestone speed table |
| **Time** | Real, not simulated: night reads the device clock (shown in its own hero badge), the season calendar reads real elapsed time since `state.startedAt` (one real week per season, four seasons per real month). `growthMultiplier()` feeds Farm/Logging growth timers; `isNight()` also feeds Combat difficulty/rewards |
| **Watering + chopping** | A plot needs `WATER_TAPS_NEEDED` (4) separate can-taps before it's watered (the can holds `CAN_CAPACITY` = 4 charges, refills in 5s on an explicit tap); felling a tree is a timed HP fight against the equipped axe. Both fully animated |

---

## 2. The foundation question — resolved, done

Decided: split now. **Done.** `game.js` (1065 lines) is gone; the game is
~45 ES modules under `src/`, wired together by `src/main.js` (the only file
that imports every other). No behavior changed at the time of the split —
same save format, same everything — verified by full regression: hub
navigation, Field plant/water/harvest with correct XP math, Foraging,
Crafting's insufficient-funds shake, Inventory's card count, the dock, and
offline-style timer resume all re-checked after the split and matched
pre-split behavior exactly. The module count has grown with every batch
since; `README.md`'s file map is the current inventory.

One consequence worth knowing: **ES modules need a real HTTP origin, not
`file://`.** A tiny zero-dependency server is committed at `serve.js` for
this — `node serve.js`. See `README.md`.

---

## 3. Sequencing logic

Unchanged from v1, still true:

- **Currency before the marketplace.** Nothing sells today.
- **Combat needs gear, gear needs a production chain.** Combat lands after
  basic Crafting/Woodworking/Smithing exist.
- **Zones need something worth traveling to** — a second market or a resource
  the hub doesn't have — so Zones lands after the marketplace.

New, from this revision:

- **The season/calendar system is being built once, clean, not migrated.**
  It can be sequenced wherever it's most useful rather than wherever "the old
  one used to be." It's placed early (Batch 3) because Logging and seasonal
  Farming rules depend on it existing, same reasoning as before — just no
  longer framed as replacing anything.
- **Crafting XP is deferred, not scheduled.** Foraging got its own skill in
  Batch 3.7; the Craft Bench still has none. It isn't gating anything else,
  so it's not called out as its own step — it'll happen inside whatever
  batch naturally touches the Craft screen next.

---

## 4. The batches

### Batch 0 — Foundation split ✅ done
Reorganized into `src/dom.js`, `data.js`, `skills.js`, `sprites.js`,
`state.js`, `pills.js`, `screens.js`, `hub.js`, `dock.js`, `inventory.js`,
`field.js`, `forage.js`, `craft.js`, `main.js`. See `README.md`'s file map.

### Batch 1 — Skills as real infrastructure ✅ done
Farming's skill code became a shared multi-skill system: one `SKILLS`
registry (17 entries now), per-skill `state.<skill>Xp`, and a real Skills
screen behind the dock. Every later production system (conversion stations,
Fishing, Combat's Archery/Melee split, Grinding, Beekeeping, Fletcher,
Weaving) plugged into it as it shipped. A shared level-100 cap was added
across all skills in the 2026-09-04 worker-leveling pass.

### Batch 1.5 — Inventory: equip shell + storage crate — done
Landed out of order, ahead of the batch it was originally filed under,
because neither piece turned out to need what I'd assumed they needed.
Equipment slots (Axe, Pick) are real and saved, with **no stat effects
yet** — deliberate, there's only one axe and one pick in the game so far,
nothing to differentiate. A Storage Crate at Aerendell (`state.storage`,
same shape as the bag) turned out not to need a second zone to exist, only
to matter once one does — so it's built now rather than waiting on Batch 10.
No carry-weight cap was added; nothing produces enough volume yet for a
number to mean anything.

### Batch 2 — Currency, done — and Batch 7 landed early alongside it
Turned out not to need a "sell-only stub" step at all -- currency and the
real dynamic-pricing market went in together, since the stub would have
been thrown away almost immediately anyway. `state.shards` only, not the
full Shards/Marks/Crowns/Spires ladder (nothing costs enough yet for that
to matter). Aerendell's market is real: `BASE_VALUE` + `CATEGORIES` per
item, one `ZONE_DEMAND` multiplier per category per zone (neutral at
Aerendell, nothing to be scarce relative to yet), a saturation curve that
floors above zero, and stock that decays back toward zero on its own via a
stored timestamp -- same deadline-not-countdown rule as every timer in the
game, no background tick required. Verified by hand: walked the curve for a
12-unit sale, matched the displayed total to the unit; forced a half-life
of decay and confirmed the price recovered by the predicted amount.
Buy-side landed later, alongside Batch 2.5 -- see below. **Done when:**
*(remaining, deferred to Batch 10)* a second zone gives the per-category
demand multipliers something to actually differ against.

### Batch 2.6 — Market: Purchase/Sell tabs + quantity slider — done
`BUYABLE` in `data.js` (seeds, so far) gives Purchase something to list;
buying and selling now share the same stock number and curve instead of
selling being the only direction -- buying draws stock down (price climbs
toward, never above, full base price), selling pushes it up (price falls
toward the floor). Sell also now draws from the bag *and* the Aerendell
storage crate combined, not bag-only. Tapping a row opens a quantity slider
(`openQtyPicker` in `market.js`) instead of committing the whole stack
instantly -- the total updates live as it drags, with an explicit Accept
button before anything spends.

### Batch 2.5 — First build-gated station: the Campfire — done
Landed out of sequence, same way 1.5 and 7 did — a small, self-contained
slice that didn't need to wait on its "official" batch number. `BUILDINGS` in
`data.js` is a one-time-cost registry (`src/buildings.js` draws the "Build
___" prompt on the hub until paid); the Campfire is its first and only entry.
Cooking is queue-based rather than single-shot: fuel and cook items each
stack up from repeated taps, the fire burns one (fuel, item) pair at a time
and chains straight into the next, and `settleCampfire()` catches up the
whole backlog — not just one pair — after time away, chaining deadline to
deadline rather than "now" so the elapsed math stays honest. Two recipes:
Logs → Charcoal, Berries → Cooked Berries, both sellable at Market. Sets the
template the rest of the brief's production chains (Batch 5's Woodworking,
Batch 6's Smelting) can follow: build once, then feed it a queue.

### Batch 3 — Real-calendar time, built fresh — done
`src/time.js`: real week = season (`SEASON_ORDER`/`SEASONS` in `data.js`),
new saves always start Day 1/Spring regardless of real date
(`state.startedAt`, set once at first boot). Night reads the player's own
device clock, not a simulated cycle. `growthMultiplier(startedAt, category)`
is the one thing other systems actually call — season and night are two
independent multipliers, multiplied together, so a later system can key off
either alone. Wired into Farm and Logging's `water()`: both the level bonus
and this multiplier are read once, at the moment a plot finishes watering,
and baked into that stage's timer, same "no retroactive speedup" rule the
level bonus already followed. Verified by hand: a 120s crop watered at 1pm
in Spring (1.15× farming, no night penalty) at Farming Lv 2 finished in
98.4s, matching the combined multiplier exactly. `isShopHours()` and other
gates weren't built — nothing needs one yet, and inventing a consumer
before one exists isn't the point of this batch.
**Done:** Combat now reads `isNight()` for its night difficulty/reward
tier, so a system beyond growth speed keys off the clock. Season `growth`
entries still only feed Farm/Logging — deeper seasonal effects are Batch 13.

### Batch 3.5 — Watering can meter + multi-chop axe — done
Two mechanics that turn a single tap into several: a plot needs
`WATER_TAPS_NEEDED` (4) can-taps before it's fully watered, not one: the can
itself holds `CAN_CAPACITY` (4) charges and empties as you go, and tapping
an empty can (not a plot) starts a `CAN_REFILL_MS` (5s) refill rather than
toggling the tool off. Identical for Farm and Logging, each with its own
can (`state.wateringCan` / `state.logWateringCan`) — the render/refill logic
lives once in `src/canmeter.js`, the second real consumer that earned
pulling it out of `field.js` rather than copy-pasting it into `logging.js`.
Felling a tree is the axe's version of the same idea, but timed rather than
charge-gated: `CHOP_TAPS_NEEDED` (4) chops, each its own `CHOP_MS` (1.5s)
swing, resolved by `settleLogging()` on every tick so a chop in progress
finishes even off-screen. Both reuse the plot's existing growth `.ring` for
progress (blue for watering, gold for chopping) rather than adding new DOM,
and both get real animation: a splash flash per water tap, a continuous
wobble for the duration of an active chop plus a sharp impact flash the
instant each one lands.

**Watering only pays Farming/Logging XP once the fourth tap completes it**
(same total as before, not per-tap) — a judgment call, not specified, made
to preserve existing XP balance exactly rather than inventing a new curve.

### Batch 3.6 — Foraging becomes one persistent action + Home dock button — done
Foraging stopped being a hub card/screen with four independent pills and
became one pill (`#forage-bar`) pinned above the dock on every screen —
`PLACES` no longer has a `forage` entry, `SCREEN_IDS` no longer has a
`forage` screen, `src/forage.js` is a third of its old size. What a finished
5s gather actually gives is rolled *on completion*, not chosen by tapping a
specific pill: `FORAGE_POOLS` in `data.js` is a per-zone weighted table
(Aerendell: 10% Red Berries Seeds, 10% Pine Cones, 40% Sticks, 40% Flint), so
a second zone is one more entry, not new code. The result shows in the pill
itself for ~1.8s (`showForageResult()`) before reverting to idle.

The starting bag is now **empty** — no free seeds, no free cones — making
foraging (or a Market purchase once there's currency) the actual way a new
save gets its first seed rather than a formality skipped past. **Real
consequence, not a bug:** raw Berries and Flax aren't in Aerendell's pool,
and nothing else currently produces them, so Campfire's Berries→Cooked
Berries recipe and Market's Berries listing are unreachable until some
future zone's pool includes them.

Same trip added a **Home** entry to the dock (`DOCK_IDS`, leftmost) — a
one-tap way back to the hub from anywhere, using the exact same
`PLACES`/`show()` machinery every other dock button already does, so it
needed zero new plumbing beyond the one data entry.

**Also this batch:** the watering can's empty state got a real "needs
attention" treatment — a `.empty` class (pulsing warm border, new `--warn`
palette token) and an explicit "Empty — Tap to Refill" label, distinct from
the existing `.refilling` pulse — after the original empty-can pips alone
read as too easy to miss.

### Batch 3.7 — Foraging becomes a real skill + the villager — done
Every completed gather now pays `FORAGE_XP` (8, first pass) into a real
Foraging skill, reusing the exact `levelFromXp`/`xpToNext` curve
Farming/Logging already share (`src/skills.js`) rather than inventing a
second one. Foraging is the first skill with an actual ceiling
(`FORAGE_MAX_LEVEL`, 100) and the first with milestone speed rather than a
continuous per-level curve: `FORAGE_SPEED_LEVELS` in `data.js` is a
level→duration table at 5/10/25/50/75/100, checked highest-first, so
nothing changes between milestones and then a level unlocks a flat faster
gather.

At level 10, Shards can buy a villager (`VILLAGER_LEVEL`/`VILLAGER_COST`,
250 Shards, one-time) via a "Hire a Villager" button that appears under the
forage pill once eligible. The villager isn't a second timer or a second
system -- owning one just changes one line of what `settleForage()` does
when a gather resolves: instead of going idle, it immediately chains the
next cycle from the finished one's own deadline (not "now"), re-reading the
current speed milestone each time so a level crossed mid-run speeds up the
rest of the run too. That's the exact same "resolve the whole backlog in
one pass, chained deadline to deadline" trick the campfire's queue already
uses, which is what makes the villager keep gathering while the player is
elsewhere *and* while the game is closed, without any background timer.

`state.lastActiveAt`, stamped every tick the game runs (no dedicated close
handler needed), is what makes "how long were you away" possible: the gap
between it and the next boot's `Date.now()` is exactly the closed duration.
When the villager's catch-up produces anything, a "Welcome back" popup
(reusing the shared bottom sheet) tallies every item by name and states
that gap in human terms. Verified live (not via a page reload -- the
browser-automation harness's reload doesn't atomically swap the tab, so a
live tick would race the boot-time catch-up and consume the gap first;
mutating `state.foraging`/`lastActiveAt` on the *running* page and letting
the next real tick catch it up exercises the identical code path cleanly):
a 45-real-second gap with a Lv 10+ villager (4000ms/cycle) correctly
produced "away for 45s" and a 12-item tally (+4 Sticks, +6 Flint, +2 Red
Berries Seeds) across roughly 11 chained cycles.

### Batch 3.8 — Hero header cleanup + two conversion stations — done
Small piece first: Wallet moved out of the footer list into a top-right
corner badge (just a coin and the number), a new top-left badge shows the
player's actual device clock plus a sun/moon for `isNight()` -- previously
that only ever affected numbers behind the scenes, never shown honestly --
and the "Now" banner underneath the hero dropped back to season/day/year
only now that day/night has its own home.

The bigger piece: the Spinning Wheel (Flax → String) and the Sawmill
(Logs → Planks), the first conversion stations beyond the Campfire. Both
share one generic handler (`src/stations.js`) rather than two near-
identical files, since they were built in the same pass and the shape is
identical -- `STATIONS` in `data.js` is the only per-station data. Each
gets a real Farming/Logging-style XP bar and a single pill, deliberately
styled like the *old* four-pill Foraging screen rather than the Campfire's
scene, since each station is one always-the-same conversion, not several
materials to pick between. Each has its own skill (Sowing, Milling -- the
second name wasn't specified, mine to choose) on Farming/Logging's
*continuous* per-level curve (`GROWTH_PER_LEVEL`), not Foraging's milestone
table -- these are built to feel like Farming/Logging's cousins. Verified
by hand: a 5000-XP Spinning Wheel (level 8) cut an 8000ms base cycle to
6451.6ms, matching `8000 / (1 + 8×0.03)` exactly.

**Also this batch — a pricing pass across existing items,** given as
buy/sell pairs. Since buy-at-empty-stock and sell-at-deep-stock already
share one `BASE_VALUE` and one curve (Batch 2.6), each pair was resolved by
setting `BASE_VALUE` to the stated buy price and letting the stated sell
price fall out of the existing curve rather than bolting on a second
number -- Sticks/Flint 5→~1, seeds/cones 10→~2, Logs 10→~2, Berries 7,
axes/picks 50→~8-25 depending on stock. Red Berries and Flax both now
yield 3 per harvest (was 2) and sell for 5; Sticks, Flint, Logs, Berries,
Flint Axe and Flint Pick all joined `BUYABLE` (previously only seeds/cones
were purchasable).

### Batch 3.9 — Mining, "The Shaft" — done
The brief's own request for a risk/reward mining loop, and the first system
in the game where a completed action can end up worse than not having
started it. Tap Dig: depth +1 and an ore roll from `MINE_DEPTH_POOLS`
(deeper = better odds at Iron/Silver/Gold/a rare Gem), or a cave-in that
ends the trip and wipes `state.carried` -- everything gathered since the
last Surface -- back to depth 0. `state.bag` is never touched until the
player actively surfaces; that's the entire tension, not an edge case.

Deliberately two independent levers rather than one: Mining's own skill
level only speeds up digging (Farming/Logging's continuous
`GROWTH_PER_LEVEL` curve, not Foraging's milestone table); the pickaxe
(`PICKAXE_TIERS`, 5 tiers, Shard-bought, same `.villager-hire` upgrade-
button pattern the villager uses) is what actually makes depth survivable
-- its `safety` subtracts straight off the hazard chance
(`MINE_BASE_HAZARD + depth × MINE_HAZARD_PER_DEPTH - safety`, clamped to
`MINE_HAZARD_MAX`), so a maxed skill on the starting pickaxe still can't
push deep safely. That's the concrete reason to spend on the pickaxe
rather than only grind levels; it also multiplies dig speed, so it's never
purely a safety purchase. The hazard percentage for the *next* dig is
shown openly before tapping it -- hidden odds make "one more or surface
now" feel arbitrary, visible odds make it a real decision.

A default skill, not a buildable station -- no `BUILDINGS` entry, no build
prompt, playable from a fresh save like Foraging. Verified by hand: an Iron
Pickaxe (safety 0.03, speed ×1.2) cut hazard at depth 1 from 3% to 0% and a
4000ms base dig to 3333.3ms exactly; a successful dig and a Surface both
moved ore between `carried` and `bag` correctly.

**Superseded 2026-08-26 through 2026-08-28** -- this paragraph is kept as a
historical record of the original build, not the current mechanic. The
pickaxe became a real equipped bag item (not a Shard-bought upgrade
button), then digging itself was rebalanced against a real spreadsheet into
swing-based clicks with flat per-swing risk and a cumulative depth-weighted
material pool, replacing `MINE_DEPTH_POOLS`/hazard-by-depth entirely. See
README.md's "Mining rework" and "Mining rebalance" sections for what's
actually running now.

Three concepts were brainstormed against real reference games before
building (Motherload-style idle descent, Dome Keeper-style push-your-luck
runs, Deep Rock Galactic-style hard-gated strata) -- this is the first,
picked for being the most idle-native fit alongside everything else in the
game. The other two remain options for a future zone/skill rather than
scope for this one.

### Batch 4 — Logging (mirrors Farming exactly) ✅ done
Plant a cone → water → grow → chop, with its own plot grid, tool, skill and
XP bar. Two trees now: Pine everywhere, Birch at Forest Road
(`LOCATIONS.forestRoad.tree`), and felling Birch requires an axe of ≥3
damage (`TREES.birch.minAxeDamage`, i.e. Stone Axe or better) — the
axe-tier gate this batch was waiting on, added 2026-09-04 once Stone/Scrap
axes existed. Felling is a timed HP fight against the equipped axe rather
than a fixed number of chops.

### Batch 5 — First production tier: Woodworking + tiered materials ✅ done
The tiered material system is real infrastructure now, proven several times
over: Sawmill turns Pine Logs → Pine Planks (Woodcutting skill), and a
second `birchPlanks` tier needs 3 Birch Logs + 1 Pine Plank. The same
"recipe requires a previous tier's output" pattern also runs the
String→Cloth→Fabric line (Spinning Wheel + Loom) feeding the Highland armor
recipes, and Bones→Bonemeal (Grind Stone) feeding the Farm's fertilizer.

### Batch 6 — Mining + Smelting (the second T1→T2 pair) — partly done
Mining is done and then some (spreadsheet-rebalanced swing digging, real
equipped pickaxes, a depth-weighted material pool). **Smelting is not** —
an early Furnace station was built and then pulled (see README's "Furnace
removed" entry); ore→bar has no station yet, and Scrap tools currently use
Scrap Metal directly. RNG-weighted yield-per-tap still to prove as a
mechanic.
**Done when:** *(remaining)* a bar recipe requires mined ore through a real
smelting step, with visible per-tap yield variance.

### Batch 8 — Combat, part one: stats and the tick engine
**Done 2026-08-28**, in a different shape than originally sketched here: not
turn-based bars, but two independent RuneScape-style clocks — the enemy
attacks on its own timer regardless of the player, the player has a separate
recovery clock of their own. One skill (Combat, not split Melee/Ranged yet),
one enemy (Grey Wolf), Attack/Defend/Eat as real actions (Spells stubbed in,
disabled, for later). Weapon drives attack damage, Armor+Shield drive
defense, Armor alone drives recovery speed (heavier = slower, the tradeoff
the brief specifically wanted), Food is its own equip slot so Eat consumes
whatever's equipped there. See README.md's Combat section for the full
shape and the equip-slot-per-stat reasoning.

### Batch 9 — Combat, part two: encounters as a real gate — partly done
More enemies (5 now: Chicken, Highland Cow, Highland Sheep, Grey Wolf, and
the zone-gated Road Goblin), real loot drops, and Archery/Melee as
weapon-driven skills all shipped. **Still missing:** the
expedition/checkpoint-banking structure (HP and loot persisting across a
sequence of fights, banked only at a retreat point — `combat.js` still
notes "no expedition/checkpoint layer yet"), and at least one progression
node that requires a won fight rather than just materials.
**Done when:** *(remaining)* there's a wall in the game gold and crafting
alone can't clear.

### Batch 9.5 — Aerendell production hub + field Bag ✅ done (first pass)

Aerendell is the fixed Home and production hub; travel now governs only
active field work. Crafting and conversion stations use the Warehouse
(`state.storage` keeps its save key for compatibility). Farming, Logging,
Foraging, Mining, Fishing and Combat are entered from World locations.

The existing **Bag is field cargo**—there is no separate cargo container. Field
rewards and carried supplies share it. Production consumes Warehouse stock and
returns completed goods to the Warehouse. On Return Home, Bag contents unload
automatically; any overflow remains safely in the Bag. The Warehouse tab is
locked while away, and remote markets cannot sell or bank Warehouse items.

`state.playerContext` explicitly records `home`, `field`, or `traveling`, so
Aerendell can be both a map zone and the permanent Home without confusing the
two states. Old saves migrate from their current location. Production XP is
credited to Aerendell rather than whichever field zone was visited last.

The first-pass loop is:

1. Open **World** and explore Aerendell or travel to another unlocked zone.
2. Choose a field activity available at that location; gains enter the Bag.
3. Use **Return Home**. Longer returns use the shortest unlocked road duration.
4. On arrival, Bag contents unload into the Warehouse automatically.
5. Start production at Home using Warehouse inputs; outputs return there even
   if their timers finish while the player is away.

Shipment support started as framework-only here (`state.shipments[]`,
queueing, offline settlement, Warehouse delivery, safe overflow) with no UI;
Batch 9.6 built the merchant-freight UI on top of it without a save
migration, exactly as this batch's "add to the UI later" clause intended.

**Done:** Home stations stay fixed at Aerendell; field activity availability
follows travel; returning unloads the Bag without loss; production reads and
writes only the Warehouse; old saves load; shipment state took a UI in 9.6
with no further migration.

### Batches 9.6–9.11 — Road logistics and automation

Planned 2026-09-10. See [LOGISTICS_PLAN.md](LOGISTICS_PLAN.md) for full scope,
ownership/timing rules, migration requirements, and acceptance checks.

1. **9.6 — Reliable transfers and merchant freight ✅ built, tested,
   playtested + first-tuned (2026-09-10):** "Send goods home" from an away
   town/city market via a −/qty/+/Max stepper sheet; one active shipment,
   distance-scaled fee (`stacks × 3 × ceil(min/15)`), live ETA, offline
   delivery, safe overflow, transactional cargo ownership. Tracked on the
   Explore Freight panel. `shipments.js` / `freightUI.js`.
   `tests/freight.test.mjs` passes.
2. **9.7 — Outpost + one reusable caravan ✅ built, tested, playtested +
   sheet-reworked (2026-09-10):** Forest Road stockpile, repeating Home
   route, physical empty returns, per-item source reserve, ready/full
   departure. The `openOutpost()` sheet went from one long scroll of raw
   `<select>` / `<input number>` / `<details>` controls to a compact status
   + action list with "Deposit / withdraw" (tap-to-pick + stepper) and
   "Route settings" (cargo chips, reserve stepper, departure segmented
   control, max-wait chips) as small sub-sheets. `caravans.js` /
   `caravanUI.js` / `labor.js`. `tests/caravan.test.mjs` passes.
3. **9.8 — Passive extraction + first bottleneck ✅ built, tested,
   playtested (2026-09-10):** an unlockable Birch logging crew (Stone Axe
   + a shared housing slot + Township upkeep), local stockpile buffer,
   crew/stockpile/cart upgrades. The crew's ~40 logs/hr against the
   starter cart's ~29 logs/hr ceiling (~58 after the cart upgrade) makes a
   real backlog you clear with one purchase. Playtest surfaced that the
   bottleneck read only lived in the Explore panel — refactored to a
   shared `crewStatus()` and shown in the outpost sheet's crew section
   too. `tests/loggingCrew.test.mjs` passes.
4. **9.9 — Stock targets and multiple routes** *(not started)*: Warehouse
   demand, source reserves, cargo priorities, incoming-stock accounting,
   production supply status.
5. **9.10 — Road capacity** *(not started)*: segment travel, fair freight
   queues, road upgrades, visible traffic. Player travel stays independent
   of freight congestion.
6. **9.11 — Depots and return cargo** *(not started)*: intermediate
   transfers, outward supplies, regional specialization, route alternatives
   once the map gains branches.

**9.6–9.8 architecture note:** no dedicated logistics screen and no
`outposts.js` / `logistics.js` — outpost, cart and logging-crew simulation
all live in `caravans.js`, shared housing/upkeep in `labor.js`, and the UI
is a Freight `<details>` panel plus an "Outpost & cart" sheet (with its own
Deposit and Route sub-sheets) reached from the Explore tab at Forest Road.
This matches the plan's "small mobile sheets" product rule; only the plan's
own module-name guesses were off.

**Milestone done.** 9.6–9.8 are all built, unit-tested and playtested on a
phone viewport. Next logistics work is Batch 9.9 (Warehouse stock targets,
source reserves, a second route). Road `minutes` (5/15/5/15/15) are still
first-pass off the hand-drawn map — do not scale them toward real-hour
journeys until 9.9's demand loop has proven waiting stays enjoyable.

### Batch 10 — Additional-zone economy (reframed)
With Batches 9.5–9.11 owning travel and logistics, this batch is about why destinations
matter: unique resources, local merchants and real per-zone demand. It no
longer adds another competing production hub or a per-zone crafting tax.
**Done when:** gathering or selling in a second zone creates a measurable
advantage without moving the player's Aerendell workshops.

### Batch 11 — Remaining production skills — mostly done
Weaving (Loom), Tanning (Tanning Station) and Fletching (Fletching Bench)
all shipped as real skills with their own chains — String→Cloth→Fabric,
Hide→Leather, and Flint Arrows/Short Bow — feeding the Highland armor line
and Archery. **Smithing (armor from bars) is the piece left**, and it's
blocked on Batch 6's smelting step existing.
**Done when:** *(remaining)* metal armor exists as craftable, wearable gear
that changes combat stats, made from smithed bars.

### Batch 12 — Faith and Social
Prayer, Religion, Factions. Last among the skills on purpose — each is a
modifier on systems (combat, zones, economy) that need to already exist to
modify.
**Done when:** a Prayer unlock changes a real combat number.

### Batch 13 — Seasonal depth + the Eryndor tide layer
Winter blocking growth without upgraded gear, spring/autumn crop rotation,
season-locked trees, night-tier enemies and loot, time-of-day fishing —
everything Batch 3's calendar was built to support, now wired into
Farming/Logging/Combat. The river/tide lore layer is the optional stretch
goal named in the brief, added here if there's appetite.
**Done when:** playing in real December looks and plays differently from
playing in real June.

---

## 5. Decisions that need you

1. **Batch order.** Same note as v1 — optimized for "smallest thing that
   unblocks the most later batches." Combat can move up if playability
   matters more than economy depth right now, at the cost of placeholder gear.
2. **Travel duration scale.** Road `minutes` (5/15/5/15/15) are still read
   straight off the hand-drawn map. **Batches 9.6–9.8 are all playtested**
   (2026-09-10): the merchant loop (fee now `stacks × 3 × ceil(min/15)`),
   the outpost + cart route, and the passive logging crew have each run
   end to end on a phone viewport, with their order sheets rebuilt for
   touch and their economies confirmed against the design targets (crew
   40 vs cart 29 → 58 logs/hr). Do not scale road times toward real-hour
   journeys until Batch 9.9's demand loop has proven waiting stays
   enjoyable.
3. ~~Are Flint Axe / Flint Pick permanent T1 content, or placeholders?~~
   **Resolved 2026-08-26:** yes, permanent T1 — Flint Pick was renamed to
   Flint Pickaxe and given a real mechanical effect (dig speed/safety/max
   depth) as part of the mining rework, with a craftable Stone Pickaxe as
   T2 above it and a Wooden Pickaxe (deliberately near-unusable) as the
   free starting tier below it. See README.md's mining section.
4. ~~Does the solo market recover price over time if nobody sells there?~~
   **Resolved 2026-08-25:** yes — stock decays back toward zero on a real-time
   half-life, so an untouched market's prices climb back on their own.
