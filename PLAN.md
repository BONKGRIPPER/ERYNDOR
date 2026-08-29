# Aerendell — Batch Implementation Plan (v2)

> Supersedes v1 of this document. As of this revision: Batch 3's real-time
> clock and season calendar are built and wired into growth speed (see
> `src/time.js`) — the old decorative Watch/Tide clock this replaced is long
> gone, removed cleanly since it gated nothing. Foraging and Crafting remain
> without skill XP for now, by choice, not oversight — that's deferred
> rather than urgent.
>
> Engine note unchanged: plain HTML/CSS/JS, no build step.

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
| **Hub + dock** | Home screen with Field/Logging/Mining/Crafting/Campfire/Spinning Wheel/Sawmill cards; Home/Inventory/Market/Skills/Map in a persistent bottom dock, Home first (left) as a one-tap way back |
| **Hero header** | Wallet badge top right, device-clock+day/night badge top left, "Now" banner underneath showing season/day/year only |
| **Field (Farming)** | 6 plots, 2 crops (Red Berries 120s, Flax 240s), single growth stage each, real Farming XP/levels, growth-speed bonus per level |
| **Mining ("The Shaft")** | Default skill, no building required; risk/reward digging with a carried pouch that's lost on a cave-in and only safe once surfaced/timed to bank. Digging is swing-based (several timed clicks per swing, count set by the equipped pickaxe) with flat per-swing cave-in risk and a cumulative depth-weighted material pool (`MINE_MATERIALS`), balanced against a real spreadsheet (2026-08-28); only Wooden/Flint/Stone (all capped at 100m) are craftable so far, deeper tiers exist as tuned data with nothing that can produce them yet |
| **Foraging** | One persistent action pinned above the dock on every screen (not a hub card/screen), tap-and-wait, result rolled per-zone from `FORAGE_POOLS` on completion, real XP/levels with milestone speed-ups |
| **Villager** | Bought once at Foraging Lv 10 (250 Shards); keeps the forage loop chaining on its own, live and offline, with a "welcome back" popup summarizing what was gathered and how long the game was closed |
| **Crafting** | 2 recipes (Flint Axe, Flint Pick), concurrent 15s crafts, cost deducted on start, no skill attached (deferred) |
| **Spinning Wheel + Sawmill** | Build-gated conversion stations (Flax→String, Logs→Planks); one generic handler (`src/stations.js`), each with its own skill (Sowing, Milling) on Farming/Logging's continuous speed curve |
| **Inventory** | Card grid of every bag item, sprite-ready with tinted-dot fallback |
| **Currency + Market** | `state.shards`; Aerendell's market is buy *and* sell, dynamic pricing by stock, one `BASE_VALUE` driving both directions |
| **Buildings + Campfire** | `BUILDINGS` registry (build-once stations); Campfire cooks Logs→Charcoal and Berries→Cooked Berries via two queues, one pair at a time, chained while away |
| **Zones** | Does not exist — Aerendell is the only place |
| **Skills** | Farming, Logging, Mining, Foraging, Sowing and Milling are real; Foraging is the only one with a level cap (100) |
| **Time** | Real, not simulated: night reads the device clock (shown honestly in its own hero badge now, not just felt), the season calendar reads real elapsed time since `state.startedAt` (one real week/season, four seasons/real month). `growthMultiplier()` feeds Farm/Logging's growth timers; nothing else reads it yet |
| **Watering + chopping** | A plot needs 4 separate can-taps before it's watered (the can holds 4 charges, refills in 5s on an explicit tap); felling a tree is 4 separate 1.5s chops. Both fully animated |

This is a smaller surface than v1 of this plan assumed, which is the point of
removing the old clock before building the new one instead of swapping it
in place — nothing to unwind, nothing dragging half-updated code behind it.

---

## 2. The foundation question — resolved, done

Decided: split now. **Done, as of this revision.** `game.js` (1065 lines) is
gone; the game is fourteen ES modules under `src/`, wired together by
`src/main.js`. No behavior changed — same save format, same everything —
verified by full regression: hub navigation, Field plant/water/harvest with
correct XP math, Foraging, Crafting's insufficient-funds shake, Inventory's
card count, the dock, and offline-style timer resume all re-checked after the
split and matched pre-split behavior exactly.

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
- **Foraging/Crafting XP is deferred, not scheduled.** It'll happen inside
  whatever batch naturally touches the Skills screen next (Batch 1 or 2), but
  isn't gating anything else, so it's not called out as its own step anymore.

---

## 4. The batches

### Batch 0 — Foundation split ✅ done
Reorganized into `src/dom.js`, `data.js`, `skills.js`, `sprites.js`,
`state.js`, `pills.js`, `screens.js`, `hub.js`, `dock.js`, `inventory.js`,
`field.js`, `forage.js`, `craft.js`, `main.js`. See `README.md`'s file map.

### Batch 1 — Skills as real infrastructure
Generalize Farming's skill code into a shared multi-skill system: one
`SKILLS` registry, one `state.skillXp[id]` map, a real Skills screen behind
the dock's Skills button.
**Done when:** the Skills dock destination is a real screen. Farming shows up
on it with a real bar. Foraging/Crafting don't have to yet — see §3.

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
**Done when:** *(remaining)* something beyond growth speed reads
`isNight()` or a season's `growth` entry — combat, market demand, forage
yield, whichever lands first.

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

### Batch 4 — Logging (mirrors Farming exactly) — partly done
Plant a pine cone → water → grow → chop is built and working: its own plot
grid, its own tool, its own skill and XP bar, one tree (Pine → Logs). **Axe-
tier gating is not built** -- there's only one tool tier in the game so far
(no axes exist yet outside the single Flint Axe recipe), so that half of this
batch waits on real tool tiers existing, not on Logging itself.
**Done when:** *(remaining)* a second tree exists and chopping it requires a
better axe than chopping Pine does.

### Batch 5 — First production tier: Woodworking + tiered materials
Introduces the tiered material system as real infrastructure, T1→T2 scale
only: logs (T1, Logging) → planks (T2, Woodworking). Recipes stop being flat
raw-material costs and start requiring a previous tier's *output*.
**Done when:** a plank recipe genuinely can't be made without logging first.

### Batch 6 — Mining + Smelting (the second T1→T2 pair)
Mining (risk/RNG-heavy per the brief) produces ore; Smelting turns ore into
bars. Second proof of the Batch 5 pattern, plus RNG-weighted yield as a
mechanic.
**Done when:** a bar recipe requires mined ore, and yield-per-tap has real,
visible variance.

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

### Batch 9 — Combat, part two: encounters as a real gate
Batch 8 shipped the loop with a single enemy and no stakes beyond the fight
itself — this batch is everything still missing: more enemies, real loot,
and the brief's core rule (you cannot out-craft your way past a fight). The
expedition/checkpoint-banking structure discussed as Combat's differentiator
from Mining — HP and loot persisting across a sequence of fights, banked
only at a retreat point, the same "carried until banked" tension Mining
already has — lands here too, plus at least one progression node that
requires a won fight, not just enough materials.
**Done when:** there's a wall in the game gold and crafting alone can't clear.

### Batch 10 — A second zone + real-time travel
One more place. Real-hours travel timer. Per-zone crafting tax, reduced by
zone level/reputation. Batch 7's economy becomes arbitrage, per the brief.
**Done when:** hauling goods to the second zone and selling there is
measurably better than selling at the hub.

### Batch 11 — Remaining production skills
Weaving, Tanning, Smithing (armor), Fletching — each another T1→T2→T3 chain
using the Batch 5 pattern, proven twice over by now. New recipe data and a
screen each, no new infrastructure.
**Done when:** armor and ranged weapons exist as real, craftable, wearable
gear that changes combat stats.

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
2. **How literal should real-time travel be** — 2 hours vs. 20 hours is a
   different game. Decide before Batch 10 starts, not during it.
3. ~~Are Flint Axe / Flint Pick permanent T1 content, or placeholders?~~
   **Resolved 2026-08-26:** yes, permanent T1 — Flint Pick was renamed to
   Flint Pickaxe and given a real mechanical effect (dig speed/safety/max
   depth) as part of the mining rework, with a craftable Stone Pickaxe as
   T2 above it and a Wooden Pickaxe (deliberately near-unusable) as the
   free starting tier below it. See README.md's mining section.
4. ~~Does the solo market recover price over time if nobody sells there?~~
   **Resolved 2026-08-25:** yes — stock decays back toward zero on a real-time
   half-life, so an untouched market's prices climb back on their own.
