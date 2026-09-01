# Eryndor Idle

An idle farming RPG set in Eryndor. Plain HTML, CSS and JavaScript — no build
step, no dependencies, no framework. See `PLAN.md` for the batch-by-batch
roadmap this project is actually working through.

    index.html      structure
    style.css       all styling
    src/main.js     boot sequence — start here to see how it fits together
    src/*.js        one file per system (see below)
    assets/sprites/ drop art in here — see assets/sprites/README.md

## Run it

`src/main.js` loads as an ES module, which browsers refuse to do from a
`file://` page — you need a real server. This folder has one, no
dependencies:

    node serve.js
    # then open http://localhost:5500

Any other static file server works too, as long as it serves `.js` files as
`text/javascript`.

## File map

    src/dom.js        el() -- the one DOM lookup helper
    src/data.js         content: crops, trees, recipes, gatherables, hub places
    src/skills.js          the XP curve, shared by every skill
    src/time.js               the real-time clock: day/night, the season calendar
    src/sprites.js                the sprite pipeline (probe, fallback, useSprite)
    src/state.js                     state, save, load
    src/canmeter.js                     the watering can's charge/refill, shared
    src/pills.js                           shared by Foraging and Crafting's cards
    src/sheet.js                       the shared bottom sheet (seed/cone pickers)
    src/screens.js                        show()/showFromHash() -- active screen
    src/hub.js                               home menu + "Recent Items" strip
    src/dock.js                                 the persistent bottom bar
    src/inventory.js                               the card grid
    src/skillsScreen.js                              every skill, one screen
    src/field.js                                      Farm: plots, tools, XP
    src/logging.js                                       Logging: Farm's mirror
    src/mining.js                                            The Shaft: risk/reward digging
    src/combat.js                                                RuneScape-style tick combat
    src/forage.js                                                the persistent forage bar
    src/craft.js                                               Crafting: two recipes
    src/market.js                                                  Aerendell's market
    src/buildings.js                                                  build prompts
    src/campfire.js                                                      the campfire
    src/stations.js                                                         Spinning Wheel + Sawmill
    src/main.js       imports everything above, boots the game

`data.js` has no imports -- it's pure content. Everything else imports what it
needs directly; `main.js` is the only file that knows about all the others.
`screens.js` and `dock.js`/`inventory.js` import each other on purpose (safe:
nothing calls across the cycle until a real click happens, well after both
sides have finished loading).

## What's here

**The home hub** — Farm, Logging, Mining, Crafting, the Campfire, the
Spinning Wheel and the Sawmill as cards. Home, Inventory, Market, Skills and Map
live in the **bottom dock** instead (`DOCK_IDS` in `src/data.js`, Home
first on the left so there's always a one-tap way back regardless of which
screen you're on), with a one-line preview of Skills/Inventory still
visible on the hub itself. The dock is one fixed element outside every
screen, present no matter which one is showing, and highlights whichever
destination is current — Home included, so it visibly lights up while
you're looking at the hub itself. Skills and Map don't have real screens
yet — tapping them shakes in place rather than pretending to navigate;
Home, Inventory and Market do, so tapping any of those genuinely goes
there. Foraging isn't in the dock or the hub at all any more — see below.

**The hero header's two corner badges.** Wallet moved out of the footer
list entirely — `#wallet-badge`, top right, just a coin and the number
(`updateWalletNote()` in `hub.js`, despite the name no longer targeting a
footer). Top left is new: `#daytime-badge` shows the player's actual device
clock plus a sun/moon for `isNight()` (`updateDaytimeBadge()`) — the same
read `growthMultiplier()` already uses for growth speed, just shown
honestly instead of only ever affecting numbers behind the scenes. The
"Now" banner underneath the hero keeps the season calendar only (season,
day, year) now that day/night has its own honest home — see Real time,
below, for what each clock actually is.

**Farm** (`src/field.js`) — six plots and three tools. Pick up the Seeds,
choose what to sow, and tap empty plots. Pick up the Watering Can and tap a
sown plot to start its timer. Pick up the Scythe and tap a ripe plot to reap
it. A held tool sits visibly depressed, and only the plots it can actually be
used on are outlined — tapping anything else says why instead of doing
nothing.

Crops hold a **deadline, not a countdown**, so they keep growing while the game
is closed. That one decision is what makes the idle half work, and it costs no
extra code: `settle()` catches up a minute or a week the same way.

**Watering is now several taps, not one.** A plot needs `WATER_TAPS_NEEDED`
(4) separate taps before it's fully watered and the growth timer actually
starts — each tap plays its own splash and shows "Watered n/4," and the ring
that later shows growth progress shows watering progress first (same
element, a different colour, see `.plot.thirsty .ring`). The can itself only
holds `CAN_CAPACITY` (4) charges (`state.wateringCan`, rendered by
`src/canmeter.js`'s pip row on the tool button); once it's dry, tapping the
can itself — not a plot — starts a `CAN_REFILL_MS` (5s) refill rather than
toggling the tool off, and the deadline resolves in `settle()` exactly like
every other timer. Logging's can (`state.logWateringCan`) is a completely
separate instance, same as its tools already are — filling Farm's can never
touches Logging's.

An empty can needs to actually read as empty, not just "no pips lit": once
`charges` hits 0 and it isn't already refilling, `canmeter.js` adds a
`.empty` class (a pulsing warm border/glow, `--warn` in the palette) and
swaps the label to "Empty — Tap to Refill" outright, distinct from the
`.refilling` state's own pulse and countdown.

**Farming XP** — watering pays a small flat amount (once, on the tap that
finishes the fourth), harvesting pays the crop's `xp` (the bulk). Leveling
up speeds growth: `GROWTH_PER_LEVEL` in `src/skills.js` and the current
season/night multiplier (see Real time, below) are both read once, at the
moment a plot finishes its fourth watering, and baked into that stage's
timer — a crop already growing doesn't speed up or slow down retroactively
when you level up or the sun sets mid-grow, only the next one does.

**Logging** (`src/logging.js`) — Farm's mirror: plant a pine cone, water it
(same four-tap/can-meter system as Farm, its own can), chop it down once
it's grown. Its own plot grid (`state.logPlots`), its own tool
(`state.logTool`, values `cone`/`water`/`axe` rather than
`seeds`/`water`/`scythe`), its own skill (`loggingXp`) and XP bar, but it
shares the seed-picker sheet mechanics with Farm (`sheet.js`) rather than
duplicating the modal. `TREES` in `src/data.js` is the same shape as
`CROPS` — adding a second tree is one entry, exactly like adding a crop.

**Felling a tree is `CHOP_TAPS_NEEDED` (4) separate chops, each its own
`CHOP_MS` (1.5s) swing** — no charge/refill concept like the can, just a
tap-and-wait per chop, repeated. Each plot tracks its own `chopReadyAt`
(that swing's own deadline) and `chopProgress`; `settleLogging()` resolves
whichever swings have finished on *every* tick, not just while the screen's
open, so a tree can even finish felling while you're off in Farm. The tree
visibly wobbles for the full 1.5s of an active swing and flashes on impact
every time a chop actually lands, whether or not that's the one that fells
it — `.plot.chopping` and `.plot.chop-hit` in `style.css`. The ring reused
for watering progress does triple duty here, showing chop progress once a
tree is ripe (gold, rather than watering's blue or growth's green).

**Mining, "The Shaft" (`src/mining.js`)** — a default skill, not a
buildable station, and the first genuine risk/reward loop in the game.
Tap Dig: it either goes well (depth +1, ore rolled from the current
depth's `MINE_DEPTH_POOLS` entry in `data.js`, XP) or triggers a cave-in
that ends the trip on the spot. Nothing found is safe until the player
actively taps Surface & Bank — a cave-in wipes `state.carried` (everything
gathered since the last surface) entirely, resetting depth to 0, while
`state.bag` (anything already banked) is never touched. That tension is
the whole point of the screen, not an edge case bolted onto a gather loop.

Two independent levers set the numbers, the same split Foraging's skill
vs. villager already established: **Mining's own skill level** only speeds
up digging, using Farming/Logging's continuous `GROWTH_PER_LEVEL` curve
rather than Foraging's milestone table. **The pickaxe** (`PICKAXE_TIERS` in
`data.js`, `state.pickaxeTier`) is what makes depth survivable — its
`safety` value comes straight off the hazard chance
(`MINE_BASE_HAZARD + depth × MINE_HAZARD_PER_DEPTH - pickaxe.safety`,
clamped to `MINE_HAZARD_MAX` so a run is never a guaranteed loss but can
get arbitrarily close) — so a maxed skill on the starting Rusty Pickaxe
still can't push deep safely. That split is the concrete reason to spend
Shards on the pickaxe rather than only grinding levels; it multiplies dig
speed too, so it's never purely a safety purchase. The next tier's name,
cost and afford-state show on the "Upgrade" button below the dig pill,
same `.villager-hire` pattern the villager's own hire button uses,
hidden once maxed.

The hazard percentage for the *next* dig is shown openly on the pill
itself before you tap it — a hidden-odds risk mechanic reads as unfair;
a visible one makes "one more dig or surface now" an actual decision.
Verified by hand: an Iron Pickaxe (safety 0.03, speed ×1.2) cut hazard at
depth 1 from 3% to 0% and a 4000ms base dig to 3333.3ms exactly.

**Foraging** (`src/forage.js`, `#forage-bar` in `index.html`) is one
persistent action, not a screen or a hub card — the pill sits pinned above
the dock on every screen (`.forage-bar`, `position: fixed`, reserved for in
every `.screen`'s bottom padding via `--forage-h`), so it's always one tap
away no matter what you're looking at. Tap it, wait (5s baseline, faster at
level -- see below), and what you get is rolled *when the timer resolves*,
not chosen by you: each zone has its own weighted `FORAGE_POOLS` entry in
`data.js` (Aerendell: 10% Red Berries Seeds, 10% Pine Cones, 40% Sticks, 40%
Flint), so a second zone just adds a second pool rather than touching this
file. The result shows in the pill itself for a moment (`showForageResult()`
— "+1 Flint" in gold, a brief highlight ring) before it reverts to "Tap to
forage." The player now starts with an **empty bag** — no free seeds or
cones — so foraging (or buying seeds at Market once there's Shards to spend)
is genuinely how a new save gets going, not a formality before Farm opens up.

**Foraging XP and speed milestones.** Every completed gather pays
`FORAGE_XP` (8, first pass), using the exact same `levelFromXp`/`xpToNext`
curve Farming and Logging already share (`src/skills.js`) -- Foraging is
just the first skill that actually caps, at `FORAGE_MAX_LEVEL` (100).
Unlike Farming/Logging's continuous per-level growth bonus, Foraging's
speed is milestone-based: `FORAGE_SPEED_LEVELS` in `data.js` is a
level→duration table (5/10/25/50/75/100), checked highest-first, so
nothing changes between milestones and then a level unlocks a flat faster
gather that holds until the next one. `effectiveForageMs()` in `forage.js`
is the one place that gets read.

Crafting still doesn't pay skill XP -- deliberate, not a gap.

**The villager (unlocked at `VILLAGER_LEVEL`, 10).** A one-time
`VILLAGER_COST` (250 Shards) purchase via the "Hire a Villager" button that
appears under the forage pill once eligible (hidden again once bought).
Owning one (`state.villager.owned`) doesn't add a second timer or a second
loop -- it just changes what `settleForage()` does the instant one gather
resolves: instead of going idle, it immediately chains into the next cycle
(from the finished gather's own deadline, not "now", the same trick the
campfire's queue uses), and it re-reads the current speed milestone each
time, so a level crossed mid-run speeds up the rest of it too. That one
change is what makes the villager keep gathering while the player is on a
different screen *and* while the game is closed entirely -- `settleForage()`
resolving a whole backlog of chained cycles in one pass at boot is offline
progress, for free, from code that already had to exist for the campfire.

**The "welcome back" popup.** `state.lastActiveAt` is stamped every tick
the game is actually running (no dedicated close handler needed -- the
last tick before the page dies already recorded the moment), so the gap
between it and `Date.now()` at the next boot is exactly how long the game
was shut. If the villager's catch-up produced anything during that gap,
`showAwayPopup()` (reusing the shared bottom sheet from `sheet.js`) tallies
every item gathered by name and states the gap in human terms ("2h 15m",
"45s"). Without a villager, a single completed gather still gets the small
inline pill flash instead -- the popup is specifically a villager story,
not a generic "you were away" notice.

**A consequence worth knowing:** raw Berries and Flax aren't in Aerendell's
pool at all (only their seed/cone forms are), and nothing else in the game
currently produces them either — Farming makes "Red Berries" (a distinct
item from foraged "Berries") and "Flax" needs Flax Seeds, which exist only
as a Market purchase. That leaves Campfire's Berries → Cooked Berries recipe
and Market's Berries listing genuinely unreachable until a future zone's
pool includes them. Nothing broke — both still work if the item ever enters
the bag some other way — but it's worth knowing before wondering why
Cooked Berries never shows up.

**Crafting** — a third loop, same shape as Foraging, but starting one has a
cost. `RECIPES` in `src/data.js` defines each recipe's materials; the cost
leaves the bag the instant a craft starts, not when it finishes, matching how
Farm already spends a seed the moment you plant — so a running craft can
never fail to finish partway through. A recipe you can't currently afford dims
and shakes instead of doing nothing when tapped.

**Inventory** now has two more pieces beyond the card grid:

- **Equipment slots** (Axe, Pick) at the top. Tap an empty slot to open a
  picker of owned items that fit it (`EQUIPMENT` in `src/data.js` maps item
  name → slot id); tap a filled slot to unequip, same one-tap-to-drop
  convention Farm's tools use. Equipping has **no mechanical effect yet, on
  purpose** — there's only one axe and one pick in the whole game so far, so
  nothing would differentiate "equipped" from "not." The slot is real and
  saved; the stats it'll someday read aren't written yet.
- **Storage at Aerendell** — a second container, same shape as the bag,
  toggled with the Carrying/Storage buttons. Tap any card to move its whole
  stack to the other container. No weight limit on either side — nothing in
  the game currently produces enough volume for a cap to mean anything, so
  one wasn't added rather than inventing a number with nothing to balance
  against.

**Currency and the Market.** `state.shards` is the only denomination so far
— the full Shards/Marks/Crowns/Spires ladder from the vault's item docs
isn't built, on purpose, since nothing in the game costs enough yet for the
higher denominations to mean anything. The Market (Aerendell only) has two
tabs, Purchase and Sell, toggled the same way Inventory's Carrying/Storage
is. Sell lists everything sellable you own across *both* your bag and the
Aerendell storage crate combined; Purchase lists `BUYABLE` in `src/data.js`
— seeds, cones, Sticks, Flint, Logs, Berries, and both tools now, not just
the starter seeds it began with. Tapping either opens a quantity slider
(not an instant whole-stack sale like before) with the total shown live as
it moves, and an Accept button that names the exact number before anything
commits.

**A given "sells for X, costs Y to buy" is one `BASE_VALUE`, not two
numbers.** Buying at empty stock costs exactly `BASE_VALUE`; selling into a
well-stocked market falls toward `BASE_VALUE × MARKET_FLOOR`. Where a
buy/sell pair was specified directly, `BASE_VALUE` is set to the buy price
and the sell price is left to fall out of the existing curve rather than
hard-coded as a second number — it'll land near the stated figure once
stock is reasonably deep, not hit it exactly on every sale, since prices
moving with supply is the point of the whole system.

The pricing is the actual point, and now it's a real loop instead of a
one-way curve: every item has a `BASE_VALUE` and a `CATEGORIES` tag (which
skill made it) in `src/data.js`; each zone has one demand multiplier *per
category*, not per item (`ZONE_DEMAND` — Aerendell is neutral across the
board, since there's no second zone yet to be scarce or abundant *relative
to*). Price is `base × demand × saturation(stock)`, where `saturation`
starts at 1 and decays toward `MARKET_FLOOR` (never zero) as a zone's stock
of that item rises. Selling pushes stock up (price falls — flood the market
and it gets cheap, not worthless); buying pulls the same stock number back
down (price climbs toward, but never above, full base price — the one
asymmetry: this market can't gouge above sticker, only discount). Both
directions walk the curve unit by unit rather than pricing the whole lot at
one flat rate, so a 12-unit trade moves the price exactly as much as 12
separate taps would.

Stock itself is stored the same way every timer in this game is: a level
plus a timestamp, decayed on read rather than ticked down in the
background (`marketStock()` in `src/market.js`). A market you've flooded
recovers on its own if you leave it alone — `MARKET_HALF_LIFE_MS` sets how
fast, currently 3 real minutes, tuned for testing rather than balance.

**Sprites** — everything is sprite-ready: soil, every crop's and tree's growth
frames, tool icons, gatherables, recipes, and every bag item's Inventory card.
Right now `assets/sprites/` is empty, so the game runs on its built-in vector
or tinted-dot placeholder art. Drop a PNG in at the right path (see
`assets/sprites/README.md` for exact filenames) and it replaces the
placeholder with no code changes — reload the page and it's there. Each
sprite is checked independently at startup; a missing file never shows as a
broken image, it just keeps using the placeholder.

**Hub attention rings.** Farm, Logging, Mining, Crafting, the Campfire, the
Spinning Wheel and the Sawmill cards all get a green ring the moment
there's something worth doing there -- `updateHubAttention()` in
`src/hub.js`, recomputed every 200ms tick regardless of which screen is
actually showing, same way `settle()` already runs unconditionally.
Farm/Logging light up for a ripe plot, a thirsty plot, or an empty plot
with a matching seed already in the bag -- the same three states `canUse()`
recognizes, just asked as "is there at least one" instead of "which tool
applies here." Crafting and the two stations only count as idle-and-worth-
doing when the bag can actually afford to start one; Mining has no material
cost to check, so idle alone is enough. The Campfire is the
interesting one: because
fuel and cook items leave the bag the instant they're *queued* (see below),
"something new could be cooked" is simply "the bag still holds a spare fuel
item and a spare cookable" -- queue everything you're carrying and the ring
turns itself off, with no separate bookkeeping required. Foraging has no
card to ring any more -- its own pill communicates idle/active/just-got-
something directly, which is what a permanently visible action gets for
free that a hub card doesn't.

**Buildings and the Campfire.** `BUILDINGS` in `src/data.js` is a registry of
one-time costs that unlock a permanent hub destination -- the Campfire is the
first entry. Before it's built, `src/buildings.js` draws a dashed "Build
Campfire" prompt above the hub's normal card grid (`#build-prompts`, its own
container so it never fights with `PLACES`' own list); paying the cost flips
`state.buildings.campfire` and the prompt is replaced by the real Campfire
card, gated in `hub.js`'s `drawMenu()` by that same flag.

The Campfire itself (`src/campfire.js`) burns through two queues -- fuel and
what to cook -- one pair at a time rather than needing a tap per item. Open
either picker and tap a row once per unit you want queued; each unit leaves
the bag the instant it's queued, same "spend on commit" rule Crafting already
follows. The moment both queues have something in them the fire lights: it
pulls the oldest fuel and the oldest cook item, burns for `COOK_MS` (10s,
fixed, no skill bonus yet), and the moment that pair is done it immediately
starts the next one if the queues still have stock -- so stacking five logs
and five berries and walking away cooks through all of them in the
background, exactly like every other timer in this game. `settleCampfire()`
resolves the *whole* backlog in one pass by chaining from each deadline to
the next rather than from "now", so a long queue caught up after time away
adds up to the right amount of real elapsed cooking, not a burst of instant
completions.

Only two recipes exist so far: Logs → Charcoal, and (foraged) Berries →
Cooked Berries -- `COOKABLES` in `data.js`. The fuel and cook-item pickers sit
directly over what they represent, layered onto the logs and the flame
itself rather than off to the side, so filling them reads as reaching into
the fire. The flame itself is hand-built CSS, not sprite-swappable -- it
doesn't fit the "one icon per item" sprite convention everything else in the
game uses, so it wasn't forced into one. Progress renders as an actual flame
silhouette brightening from the bottom up: `.flame-dim` is a permanently-lit
ember base clipped to its bottom sliver, `.flame-bright` sits on top and is
revealed via `clip-path` driven by a `--p` custom property (0 to 1, same
pattern as Farm's growth ring), climbing as the current pair cooks and
dropping back to embers between cycles.

**Spinning Wheel and Sawmill (`src/stations.js`).** Two build-gated
conversion stations, same `BUILDINGS` one-time-cost pattern the Campfire
uses -- Flax → String and Logs → Planks. Both share one generic handler
rather than two near-identical files (`STATIONS` in `data.js` is the only
per-station data: input, output, duration, XP, which skill), since the
shape is identical: a real Farming/Logging-style XP bar up top, one pill
below, tap to start, no queue, no auto-chaining -- deliberately the old
four-pill Foraging screen's UI language rather than the Campfire's heavier
scene, since each station is a single always-the-same conversion, not
several materials to choose between. The input leaves the bag the instant
a cycle starts, same "spend on commit" rule Crafting already follows.

Each station has its own skill -- **Sowing** for the Spinning Wheel,
**Milling** for the Sawmill (the second name was mine to choose; not
specified, so flagging it plainly) -- using Farming/Logging's *continuous*
per-level speed curve (`GROWTH_PER_LEVEL`) rather than Foraging's milestone
table, read once when a cycle starts and baked into that cycle's own timer,
same "no retroactive speedup" rule Farm's `water()` already follows.
Verified by hand: a 5000-XP Spinning Wheel (level 8 on the shared curve)
started an 8000ms base cycle at 6451.6ms, matching `8000 / (1 + 8×0.03)`
exactly.

**Real time (`src/time.js`).** Two independent clocks, neither of them
ticked — every value is computed fresh from `Date.now()`, same as every
other timer in this game. **Night** reads the player's actual device clock
(`NIGHT_START_HOUR`/`NIGHT_END_HOUR` in `data.js`, 20:00–6:00 local by
default) — real dusk, real dawn, whatever timezone the device is set to.
The **season calendar** reads real elapsed time since `state.startedAt`
(set once, at the very first boot, never touched again) rather than the
calendar date, so every save starts in Spring on Day 1 no matter what month
it really is — one real week per season, four seasons per real month-long
in-game year (`SEASON_ORDER`/`SEASONS` in `data.js`). `growthMultiplier()`
is the one thing most other systems will actually call: each season
carries a `growth` multiplier per skill category (one clear benefit, one
clear drawback — Spring speeds Farming and is neutral on Logging, Winter
slows both), multiplied by a flat night penalty. Farm's and Logging's
`water()` read it once, at the moment a plot finishes its fourth watering,
the same way they already read the level bonus — two independent modifiers
multiplied together, not tangled into one number, so something later can
key off either alone (a night-only enemy buff, a season-only market swing)
without this function changing. The hub's "Now" banner
(`updateSeasonNote()` in `hub.js`) is the only thing reading this every
tick just to stay legible; nothing about the clock itself needs ticking.

More season effects (forage yield, market demand, enemy difficulty, ...)
slot into the same `SEASONS` entries later, read by whichever system cares
— this is the infrastructure, not the full design brief's calendar depth.

**A GameMaker port was explored and dropped.** The project stays JS-only —
see `PLAN.md` if the reasoning matters later.

## A pattern worth knowing before adding a second copy of anything

Farm and Logging both use a `.tool` class and both live in the DOM at once
(only one `.screen` is hidden/shown, nothing gets removed). The very first
version of Field's tool-wiring used a bare `document.querySelectorAll(".tool")`
— harmless with one such screen, a real bug the moment a second one exists,
since it'd fire both screens' handlers off one screen's buttons. Every
selector that means "buttons on *this* screen" is scoped, e.g.
`#screen-field .tool`, `#screen-logging .tool`, `#screen-craft .pill`. Follow
that when adding another screen with repeated element classes. (The forage
bar's own `.pill` is the one exception on purpose -- there's only ever one
of it in the whole DOM, so `pillFor("forage")`'s unscoped
`document.querySelector` is safe rather than an oversight.)

## Mining rework: equipped pickaxes, hard-exclusive depth eras, timed surfacing

**The pickaxe is a real bag item now** (`src/mining.js`, `PICKAXES` in
`data.js`), equipped through the same Inventory slot as everything else —
not a Shards purchase, and not a separate tier index in `state`. The item
that was "Flint Pick" is now "Flint Pickaxe" (same recipe, same slot, now
actually does something), and there's a new craftable "Stone Pickaxe" (15
Stone + 10 Logs — mined stone and chopped logs, on purpose, so it needs both
Mining and Logging progress). The player starts with one free "Wooden
Pickaxe" already equipped — deliberately close to unusable: `hazardBase: 0,
hazardPerDepth: 0.05` gives it its own steep risk curve (5% on the first dig
of a trip, +5% every dig after — 10%, 15%, 20%...) instead of riding the
shared `MINE_BASE_HAZARD`/`MINE_HAZARD_PER_DEPTH` curve every other pickaxe
uses. Each tier also has a hard `maxDepth` wall — past it, digging is
refused outright with a hint, not just riskier — which is what actually
forces the Wooden → Flint → Stone progression; `safety` alone would only
ever make deeper digging worse, never impossible.

**Depth is now era-gated, hard-exclusive.** `MINE_ERAS` in `data.js`
replaces the old cumulative/weighted depth pools with six named eras (Stone
Age → Bronze → Steel → Gold → Silver & Platinum → Scorn), each with its own
two-item pool and a `minDepth` floor — the deepest era at or below the
target depth is the *only* pool in play, checked highest-first same as
`FORAGE_SPEED_LEVELS`. Stone stops being findable the instant Bronze-era
depth is reached; there's no blending between eras. Only the first three
eras are currently reachable by any pickaxe that exists (Stone Pickaxe tops
out at depth 37, inside Steel Era) — Gold onward exist as real content with
nothing built yet that can reach them, on purpose, for a later batch.
"Scorn" has no established vault lore (`Eryndor/06 - Magic/Scorn.md` is
still empty) — its treatment here is invented, not canon.

**Surfacing and cave-ins both got their own timers.** Banking the pouch
(`Surface & Bank`) is now a 30s timed action (`MINE_SURFACE_MS`,
`state.surfacing`, `settleSurfacing()`) rather than instant — nothing moves
into `bag` until the climb resolves, same deadline-not-countdown rule as
every other timer here, so a climb left running through a reload just
finishes the moment it's next checked. A cave-in also locks out digging for
2.5 minutes (`MINE_CAVEIN_COOLDOWN_MS`, `state.mineCooldownUntil`) — a
timestamp, not a running timer, so there's nothing to settle, just a check
in `startDig()`.

## Starter toolkit: every tool is now a real, equipped item

Farming, Logging, and Mining's tools (Scythe, Axe, Watering Can, Pickaxe)
are all real bag items now, each with its own `EQUIP_SLOTS` entry, each
starting equipped from a fresh save: Wooden Scythe, Wooden Axe, Wooden Can,
Wooden Pickaxe. None of the four are in `BUYABLE` — lose one and it's
crafted or found again, not repurchased, same reasoning as the Wooden
Pickaxe before this. Axe and Scythe still have no mechanical effect (there's
only one tier of each so far, nothing to differentiate — same "no
mechanical effect yet, on purpose" state Equipment started in); the
Watering Can does: capacity now comes from `CANS[state.equipment.can]`
(`src/canmeter.js`) instead of a flat `CAN_CAPACITY`, so a better can later
is one new `CANS` entry, nothing about Farm or Logging needs to change.

The Farm/Logging tool buttons for Scythe, Axe, and Watering Can all show
the *equipped item's* actual name and sprite (`items/<slug>`, same pipeline
Inventory cards use) instead of a fixed generic label — swap what's
equipped in Inventory and the tool screens pick it up on their next redraw,
no reload needed.

## Campfire: pause

A "Pause"/"Resume" toggle sits in the Campfire screen's header
(`state.campfire.paused`, `src/campfire.js`). Paused only blocks a *new*
(fuel, item) pair from starting — whatever's already burning keeps burning,
since its fuel and item were already spent the moment they were queued, and
there's no way to "unburn" them. Queueing still works while paused; the
queue just waits.

## Mining: bug fixes and mid-batch changes

Surfacing and every other bag gain (foraging, crafting, cooking, farming,
logging, stations, buying) now route through one shared `gainItem()` in
`src/state.js` instead of touching `state.bag` directly — the single place
that also updates `state.recentItems` (see the home hub rework below).
Surfacing itself was already moving the carried pouch into `bag` correctly;
this just made it feed the same pipeline everything else does. Mining also
picked up two small balance changes: banking now takes 30s
(`MINE_SURFACE_MS`, `state.surfacing`, `settleSurfacing()` in
`src/mining.js`) instead of resolving instantly, and a cave-in locks out
digging for 2.5 minutes (`MINE_CAVEIN_COOLDOWN_MS`, `state.mineCooldownUntil`
— a timestamp, not a running timer, so there's nothing to settle, just a
check in `startDig()`). The Wooden Pickaxe also got its own explicit hazard
curve (`hazardBase`/`hazardPerDepth` on its `PICKAXES` entry) — 5% risk on
the first dig of a trip, +5% every dig after, rather than riding the shared
depth-based curve every other pickaxe uses.

## Home hub rework: a real Skills screen, "Recent Items"

The home screen's old one-line "Farming Lv 0 · Logging Lv 0 · ..." Skills
summary and its full inventory chip strip are both gone. In their place:

- **A real Skills screen** (`src/skillsScreen.js`, `#screen-skills`,
  reachable from the dock's Skills tab, which used to just shake since the
  screen didn't exist yet) — one row per skill, each with a level and a
  real XP bar. Foraging gets special handling: it's capped at
  `FORAGE_MAX_LEVEL`, but its XP keeps accumulating past what that level
  needs (see `forage.js`'s own speed lookup, which does the same clamp), so
  its row shows a full gold bar and "Level 100 (MAX)" with total XP instead
  of a meaningless into/need pair once it's past the cap.
- **"Recent Items"** replaces the inventory strip — the last 5 distinct
  items `gainItem()` recorded (`state.recentItems`, most-recent-first,
  deduped so a repeat gain moves back to the front instead of adding a
  second entry), rendered in `hub.js`'s `drawBag()` (kept as the same
  exported name every producer already imports and calls after a gain, so
  none of those call sites needed to change even though what it draws is
  different now).
- **Equipped items no longer duplicate in the Inventory grid** — the
  "Carrying" view in `src/inventory.js` filters out anything currently in
  `state.equipment`, since it's already shown up in the equip-slot boxes at
  the top of that screen.

Also fixed in passing: every screen's XP bar except Farm's own was actually
invisible (`style.css` only ever styled `#xp-fill` — Farm's specific id —
so Logging/Mining/Sowing/Milling's fill divs had no CSS at all). Fixed by
giving every fill div a shared `.xp-fill` class and keying the CSS off that
instead of one screen's id.

## Combat: RuneScape-style tick combat

A new Combat hub card (`src/combat.js`, `#screen-combat`) — the first
system in this game where two independent clocks run against each other
instead of one timer the player controls. The enemy attacks on its own
schedule (`state.combat.enemyNextAttackAt`, resolved by `settleCombat()`
every main tick, same deadline-not-countdown rule as every timer here — a
fight left running through a reload catches up every attack that came due
in the meantime, the same way `settleForage()`'s villager cycle catches up
a long queue, and can genuinely end in a loss from that catch-up alone).
The player has a separate clock of their own
(`state.combat.playerCooldownUntil`); whenever it's passed, Attack/Defend/
Eat become available, and picking one starts it again. Nothing here is a
turn — a slow weapon-and-armor combo can mean more than one enemy hit lands
between two of the player's own actions.

All four combat stats come from whatever's actually equipped, not a level,
across four new `EQUIP_SLOTS` (Weapon/Armor/Shield/Food):

- **Weapon** sets the Attack damage roll (`WEAPONS` in `data.js`). No
  weapon equipped falls back to `COMBAT_UNARMED`, same "fall back rather
  than block the screen" rule `mining.js` uses for an unequipped pickaxe.
- **Armor** does two unrelated jobs at once — `defense` (stacks with the
  shield's, subtracted from every incoming hit) and `recoveryMult`, which
  scales the player's own cooldown. This is the tradeoff asked for
  specifically: Stone Plate blocks more (6 defense) but leaves the player
  open longer between actions (1.35× recovery) than the lighter Padded
  Vest (2 defense, 0.9× — faster than fighting unarmored). That tradeoff is
  the whole reason Armor is its own slot instead of folding into one flat
  gear-level number.
- **Shield** adds more `defense`, plus `block` — an extra cut that only
  applies when Defend is used, on top of the flat halving. A shield's
  entire reason to exist is making Defend hit harder, not just adding
  another flat defense number a heavier armor could also give.
- **Food** is equipped, not just carried — Eat consumes whatever's in this
  slot (`FOODS` in `data.js`, keyed by item name, `heal` amount) rather
  than a hardcoded item, so equipping a better food changes what Eat does
  with zero changes to `combat.js`. Berries and Cooked Berries both work
  today (6 and 15 HP); anything future with a `heal` value just needs an
  `EQUIPMENT` entry pointed at `"food"`.

Four new craftable items exist for testing this loop today — Flint Dagger
(weapon), Wooden Buckler (shield), Padded Vest and Stone Plate (armor, the
light/heavy contrast above) — all from `Flint`/`Sticks`/`Stone`/`Logs`,
same as every other T1 tool. None are in `BUYABLE`, matching every other
starter-tier tool in this game. One enemy exists so far (`ENEMIES.greyWolf`
in `data.js`, keyed rather than an array like `PICKAXES`/`STATIONS` since
nothing needs an ordering yet) — winning grants Combat XP and a small
Shards reward; losing costs nothing but the fight itself, since there's no
expedition/checkpoint layer around Combat yet for a loss to actually cost
something banked. Player HP resets to full at the start of every fight
rather than persisting between them, for the same reason.

**A real bug, caught and fixed before it shipped:** the first pass had
`refreshCombat()` — called every ~200ms from the main tick loop — also
re-triggering the enemy-timer and player-cooldown CSS bar transitions on
every single call. Since a CSS transition restarted before it's had time to
visibly move just snaps back to its start point, the bars would never
actually appear to fill. Fixed by splitting the two concerns: `refreshCombat()`
now only updates numbers, labels and HP bar widths (safe to call every
tick), while a separate `syncTimerBars()` starts or resumes a bar's
transition from wherever it actually is (`remaining`/`total` time, not
always 0%) — called once per real event (a fight starting, an attack
landing, an action being taken) and once more when the screen is opened
(`screens.js`'s `show()`, and once at boot), never from the tick loop
itself. Worth remembering if a future timed-bar screen shows the same
"never seems to move" symptom.

**Not built yet, on purpose:** Spells (a locked, disabled fourth action
slot already sits in the UI for it), more than one enemy, and the
expedition/checkpoint-banking structure discussed as Combat's differentiator
from Mining (HP and loot persisting across a sequence of fights, banked only
at a retreat point) — this batch was scoped to the core tick-combat loop and
making it equipment-driven, not the run structure around it.

## Mining rebalance: swings, not single digs

A full pass against a real mining-balance spreadsheet (2026-08-28), the
biggest change to `src/mining.js` since the equipped-pickaxe rework. Depth
is in real meters now (100/400/1000/2500/3000/5000 for the pickaxe tiers
that exist or are staged, not the old small depth-unit scale), and digging
is swing-based rather than one-tap-one-result:

- **A swing takes several clicks, not one tap.** Every tap of Dig starts
  one timed click (`state.mining`, same shape as before); the equipped
  pickaxe's `clicksPerSwing` (12 for Wooden down to 1 for the staged Scorn
  tier) says how many of those it takes before the swing actually resolves.
  Only that last click rolls hazard/reward -- the rest just advance
  `state.swingProgress` and wait for the next tap, same manual-repeat-tap
  shape Logging's chop mechanic already established
  (`chopProgress`/`chopReadyAt`), applied to Mining for the first time.
  `MINE_MS_PER_CLICK` (350ms, then the Mining skill's usual level-speed
  curve on top) sets one click's own timer.
- **Risk is flat per swing now, not depth-scaled.** The old formula grew
  hazard with depth; the spreadsheet's numbers only work out if
  `riskPerSwing` is a constant per pickaxe (confirmed against every row:
  its "chance to fail at max depth" column is exactly
  `riskPerSwing x (maxDepth / depthPerSwing)`, i.e. risk times the expected
  swings across a full run -- not a real clamped probability past 100%,
  just the designer's own back-of-envelope danger rating). `hazardChance()`
  in `mining.js` is a straight lookup now, no depth term at all.
- **The old hard-exclusive depth eras are gone.** `MINE_MATERIALS` replaces
  `MINE_ERAS` with a cumulative weighted pool -- every material whose
  `minDepth` (and `maxDepth`, for the few bounded ones, like Basalt's
  0-100m band) the current depth satisfies is in play at once, weighted by
  rarity (`weight`, roughly Common=100/Uncommon=40/Rare=15 off the sheet)
  instead of the deepest band replacing everything shallower. Stone and
  Coal never stop being findable; Copper/Tin/Emerald just start joining the
  pool at 100m, Iron at 400m, Gold at 1000m, Diamond at 2500m -- each
  material's `minDepth` is set to the maxDepth of the pickaxe tier just
  below the one that "requires" it, so the depth where one tier's reach
  ends is exactly where the next tier's material starts turning up.
- **Only spreadsheet rows with Zone Lock "All" or "Leth-Eiren"** (this
  game's only zone so far) made it into `MINE_MATERIALS` -- Limestone,
  Granate, Soap Stone, Scorn, Ruby, Sapphire, Topaz, Circon, Salt and
  Remnant Salt are real spreadsheet content locked to zones
  (Keth-Maral/Elk-Vael/Rath-Kesh/Khar-Duun/Bryndell) that don't exist in
  this game yet, so they're left out rather than faked available. Same
  treatment for pickaxes: Wooden, Flint and Stone are the only ones
  actually craftable (all three cap at the same 100m -- they differ in
  efficiency, not reach, in this version of the balance); Scrap Metal
  through Scorn exist as real, tuned `PICKAXES` data with nothing that can
  produce them yet (no smelting/alloying station exists to turn Copper/Tin
  into Bronze, etc.) -- next pass, not this one, same rule the original
  mining rework used for eras it couldn't reach either.
- **Stone/Coal/Copper/Tin/Iron/Gold's market values** were updated to match
  the spreadsheet's Worth column exactly (Stone 1→5, Coal 2→1, Copper 7→10,
  Tin 5→15, Iron 6→15, Gold 25→30); Basalt, Amethyst, Emerald and Diamond
  are new items with their own `BASE_VALUE`/`TINTS`/`CATEGORIES` entries.
  Silver Ore, Platinum Ore, Raw Gem, Scorn and Enchanted Shard keep their
  old definitions (harmless, still valid for anyone whose save already has
  some) but are no longer obtainable from `MINE_MATERIALS` -- the
  spreadsheet doesn't cover them and they belong to zones that don't exist.

One number from the spreadsheet was deliberately not used: the pickaxe
table's "Damage" column doesn't map to anything mining currently does (no
rock/block-HP mechanic exists to spend it on) -- it's sitting in the
spreadsheet unused rather than force-fit into a mechanic that isn't built.

## Mining: instant taps, instant banking

Two follow-up changes on top of the swing rebalance above, both mid-batch:

- **Every click is instant now, not timed.** The first cut of swing-based
  digging gave each click its own short timer (`MINE_MS_PER_CLICK`,
  chop-style) -- this was replaced with synchronous taps: `tapDig()` in
  `src/mining.js` resolves a click the moment it's pressed, no deadline, no
  `settleMining()` to catch up later. The player taps as fast as they
  physically can; the pill's fill bar jumps straight to
  `swingProgress / clicksPerSwing` each tap, with a short fixed CSS
  transition (120ms, not derived from any timer) that retargets cleanly if
  the next tap lands before the last one finished animating. `state.mining`
  (the old "one click in flight" field) is gone entirely -- there's no
  async click state left to hold.
- **Surfacing banks immediately; the cost moved to a cooldown instead.**
  Tapping Surface & Bank used to start a 30s climb before anything reached
  `bag`. Now `bankAndSurface()` moves the whole pouch over on the spot and
  sets the *existing* `state.mineCooldownUntil` (same field a cave-in
  already used) for `MINE_SURFACE_COOLDOWN_MS` -- the next dig just can't
  start for a beat, same "shaken up, give it a second" texture a cave-in's
  cooldown already had, just shorter, since surfacing is the successful
  outcome, not the punishment. `state.surfacing`/`settleSurfacing()` are
  gone along with the old timer.
- One consequence worth knowing: Mining's own skill level no longer speeds
  anything up, since there's no per-click timer left for a level bonus to
  multiply. XP/levels are purely a Skills-screen display for now, same as
  Combat's -- a future pass could hang something else off it (lower risk,
  bonus depth per swing) if that's wanted.

## Home + Farm/Logging layout: a hand-sketched pass

Two layout changes from a hand-drawn mockup (2026-08-28), both pure
CSS/data -- neither touched `hub.js`'s or `field.js`/`logging.js`'s actual
render logic:

- **The home hub is a 2-column grid of tiles now, not a single-column list
  of rows.** `.menu` switched from a flex column to `grid-template-columns:
  repeat(2, 1fr)`; `.card` switched from a horizontal icon-name-chevron row
  to a centered vertical tile (icon on top, name and a 2-line-clamped note
  below, no chevron -- a whole square tile already reads as tappable).
  `#build-prompts` shares the same `.menu`/`.card` classes on purpose, so
  "Build ___" prompts became grid tiles too, automatically, with no extra
  work. Two new locked placeholder cards, Furnace and Stone Cutter
  (`ready: false`, same treatment Aerendell/Map already use), fill out the
  grid shape the sketch drew even though neither has a real station behind
  it yet. Logging's and Crafting's hub-card labels were renamed to "Forest"
  and "Craft Bench" to match the sketch -- their screens' own headers still
  say "Logging" and "Crafting", only the home-screen tile changed.
- **Farm's and Logging's plots-plus-tools now read as one unified block.**
  Both screens wrap their `#plots`/`.tools` (or `#log-plots`/`.tools`) pair
  in a new `.field-grid` container that carries the "float between header
  and hint" margin that used to live on `.plots` itself, with a matching
  10px gap on all three grids (`.field-grid`, `.plots`, `.tools`) so the
  whole thing reads as one continuous 3-column grid rather than a grid and
  a separately-floating row.

**Left open, flagged rather than guessed at:** the sketch's dock only draws
four icons (Home, Bag, Skills, Map) with no Market, and its hub grid
doesn't include Sawmill at all. Removing either would cut off real,
working functionality (selling, and the Logs→Planks conversion) based on
what might just be sketch shorthand rather than a deliberate call -- both
were left as they were pending a real answer.

## Skills screen: a real icon per skill

Every row on the Skills screen now leads with an icon, not just a name --
`SKILLS` in `src/data.js` is the new canonical registry (`{ name, icon }`
per skill, keyed `farming`/`logging`/`foraging`/`mining`/`combat`/`sowing`/
`milling`), meant to be the one place a skill's identity lives rather than
something `skillsScreen.js` invents for itself. Icons reuse the same emoji
as that skill's matching home-hub card (`PLACES`) where one exists, so a
skill reads as the same symbol in both places; Foraging (no hub card of its
own) gets a basket, matching the existing `forage/basket` sprite key it
already shared conceptually.

It's wired into the real sprite pipeline, not just a hardcoded emoji:
`sprites.js`'s `allSpriteKeys()` now includes `"skills/" + id` for every
entry in `SKILLS`, so dropping a real `assets/sprites/skills/<id>.png`
later replaces the placeholder automatically, same `useSprite()`/
`.using-sprite` toggle every other icon in the game already uses (tools,
crops, bag items) -- nothing about `skillsScreen.js` needs to change when
real art shows up. This registry is the intended reuse point for any
future screen that wants to represent "Mining" or "Combat" visually
(a level-up toast, a skill-gated hint, a crafting requirement) -- read the
icon from `SKILLS`, don't reinvent it locally.

## Inventory rework: three pages, real equip slots, gear that leaves the bag

A hand-sketched pass (2026-08-28) on `src/inventory.js`, `index.html`'s
Inventory screen and Logging's plots -- the biggest change to how gear
works since the original equip system.

**Three pages, not one screen with a toggle.** Inventory is now Equipment /
Bag / Storage, switched by the same bottom-tab pattern Farm's tool row
uses (`.inv-toggle`, now three buttons instead of two). Equipment is the
new page; Bag and Storage are the same carried/stored item grid as before,
just both routed through the one shared `#inv-grid` (`view` is
`"equipment"`/`"bag"`/`"storage"` now, not `"carrying"`/`"storage"`).

**Equipment has a real layout now**, matching the sketch: a narrow column
of tool slots (Axe, Pickaxe, Watering Can, Scythe, Fishing Rod, Food) down
the left, and a 3x3 body grid on the right -- Helm above, Left Hand/Chest/
Right Hand in a row, Legs below (`GEAR_POSITION` in `inventory.js` maps
each slot id to its grid cell). Helm, Legs and Fishing Rod are real slots
on that layout with no item that can fill them yet -- they render locked
(dashed border, "Locked" label), same treatment the Furnace/Stone Cutter
hub cards already established for "real spot, nothing behind it yet."

**Left Hand and Right Hand are interchangeable**, not separate Weapon/
Shield slots -- a weapon or a shield can go in *either* hand (`EQUIPMENT`
maps them to a shared `"arm"` category, and the equip picker offers those
items to whichever hand slot was tapped). Combat's `weaponStats()`/
`shieldStats()` in `combat.js` check both hands rather than one fixed slot;
`armorStats()` now reads `chest` (renamed from the old single `armor`
slot, since Helm and Legs are real neighboring slots now, not folded into
one). **Two-handed weapons** are supported at the data level
(`twoHanded: true` on a `WEAPONS` entry) even though none exist yet --
equipping one is meant to block the *other* hand slot entirely
(`armBlockedBy()` in `inventory.js`, checked and disabled at render time,
not by writing a second copy into the blocked slot). Verified by
temporarily flagging Flint Dagger two-handed: equipping it into Left Hand
correctly greyed out and disabled Right Hand ("2-Handed" label), and
unequipping it correctly freed Right Hand again.

**Equipping now actually moves the item.** Before this pass, equipping
just pointed a slot at an item name -- the bag copy stayed put, and a
separate filter hid it from the grid so it didn't look duplicated. Now
`equip()`/`unequip()` in `inventory.js` really transfer it
(`itemAdd(state.bag, name, -1)` / `+1`), so a filled slot shows *the* item,
not a second copy of one still sitting in the bag -- and a filled slot
shows only its sprite, no name label, since there's nothing left to
disambiguate. The starting-toolkit auto-equip in `state.js` does the same
transfer now, and `load()` carries a one-time `equipMigrated` flag that
reconciles any older save still double-counting an equipped item (checked
once, on that save's next load, never again -- a real spare bought or
crafted afterward must never get silently eaten on a later reload).

**Bag/Storage cards are smaller and denser** -- 5 columns instead of 3,
square tiles instead of playing-card proportions, smaller sprite/count/
name text throughout (`.inv-card`, `.inv-count`, `.inv-name` in
`style.css`).

**Logging's plots are taller than Farm's now** (`#log-plots .plot`,
`aspect-ratio: 3/4` vs. Farm's `1/1`) -- trees read as tall sprites, and
the taller tile leaves room for tall tree art later instead of cropping it
into a square. Farm's plots are untouched; the override is scoped to
`#log-plots` specifically.

## Inventory follow-up: toggle pinned to the bottom, whole screen fits

The Equipment/Bag/Storage toggle moved from just under the header to the
bottom of the screen (same DOM-order-plus-`margin-top:auto` trick used
elsewhere), and the Equipment page's slots got a bit bigger since there was
room to spare on an actual phone screen.

Getting the whole page to actually fit surfaced two real, worth-remembering
bugs, both fixed:

- **A horizontal grid blowout.** `.equip-body`'s `repeat(3, 1fr)` columns
  were being forced wider than their share by their own children's label
  text -- grid/flex items default to `min-width: auto`, which lets
  intrinsic content size override the track size instead of actually
  fitting it. `.equip-slot` now sets `min-width: 0` (and `min-height: 0`)
  to hand sizing back to the grid, which is what makes the label wrap
  instead of pushing the whole row wider than the screen.
- **A vertical version of the same thing, one level up.** `.screen`'s
  `min-height: 100dvh` is a *minimum*, not a cap -- content taller than one
  viewport just grows the whole screen past it instead of stopping, which
  silently shoved the toggle behind the fixed dock/forage bar on anything
  shorter than the tallest phone tested. `#screen-inventory` now sets a
  real `height: 100dvh` (scoped to this one screen, not `.screen`
  everywhere) so its `flex: 1; min-height: 0; overflow-y: auto;` zones
  (`.equip-layout`, `.inv-grid`) have an actual budget to size against --
  everything fits with no scroll on a real phone viewport (verified at
  375x812: content height matches viewport height exactly), and on
  anything shorter it scrolls inside that zone instead of breaking the
  layout outside it.

## Foraging speed and the first villager unlock

**Foraging now takes half as long across every speed tier** -- the base
`FORAGE_MS` and every step of `FORAGE_SPEED_LEVELS` in `data.js` were simply
halved, rather than changing the curve shape. Foraging was the one gather
loop without a station-style level bonus of its own; halving the whole
table keeps its relative shape (still six milestone tiers, still the same
percentages) while making the loop itself faster to click through.

**The first auto-clicking villager now unlocks at Foraging Level 3**
instead of Level 10 (`VILLAGER_LEVEL` in `data.js`) -- the old threshold
put the game's first taste of idle automation nine levels deep into a
single skill, past the point most of this pass's other early-game work
(Skills screen, Inventory rework) is meant to be shown off. Level 3 is
reachable in a few minutes of normal play instead of a long grind, without
changing the villager's cost or what it does once hired.

## Township: a home for villagers and their upgrades

**Township is a new hub card**, gated the same way Furnace/Stone Cutter
already are -- it doesn't appear on the home screen at all until built
(`BUILDINGS.township`, costing 20 Stone + 20 Pine Logs), then behaves like
any other place once it exists. It's the first `BUILDINGS`-gated hub entry
that isn't a station; nothing about the build-gate itself needed to
change, which is the generic-registry payoff from the original
`buildings.js` pass showing up again.

**Hiring and upgrading villagers moved here entirely**, out of the Forage
screen's own bar. The old `#villager-hire` button lived inline on the
forage bar because a villager was, at the time, the *only* piece of
automation in the game -- "manage your autoclicking villagers and
upgrades for villagers" describes a whole category now, so Township is
built as that category's one home rather than a second copy living next
to Foraging too. `forage.js` lost `refreshVillagerButton()` and its click
listener entirely; the only thing it still exports for this purpose is
`effectiveForageMs()` (the level-based timing calculation, now also
gated behind the villager's own speed upgrade) and `kickForageIfIdle()`,
which Township calls right after a hire so a freshly-hired villager starts
working immediately instead of waiting for the next natural tick boundary.

**The villager card is written to generalize**, even though there's only
one villager so far -- `township.js`'s `actionButton()` helper and card
markup don't hardcode "Foraging" anywhere they don't have to, so a second
villager type (for a different gather loop) is a new card and a new hire/
upgrade function, not a rewrite of the screen. The upgrade itself
(`VILLAGER_UPGRADE_COST` = 400 shards, `VILLAGER_UPGRADE_MULT` = 0.75) is a
flat one-time speed multiplier tracked as `state.villager.fastHands` --
`effectiveForageMs()` applies it after the normal level-based speed curve,
so leveling Foraging and buying the upgrade stack rather than one
replacing the other.

## Sawmill rename: Logs become Pine Logs, Milling becomes Woodcutting

**Pine trees now drop "Pine Logs," not generic "Logs,"** and the Sawmill
turns those into "Pine Planks" instead of "Mill Planks" -- the first step
toward multiple tiers of logs/planks existing side by side later, which a
single flat "Logs" item couldn't support. Since Pine is currently the only
tree in `TREES`, this was a straight rename rather than adding a parallel
item: every recipe, cost, tint, and category entry in `data.js` that
referenced "Logs" or "Planks" now says "Pine Logs" / "Pine Planks"
(Sawmill's own input/output, the Stone Pickaxe and Stone Plate recipes,
`TINTS`, `CATEGORIES`, `BASE_VALUE`, `BUYABLE`). A save from before this
change may still be holding old plain "Logs"/"Planks" in its bag -- those
entries just sit there unrecognized by any current recipe rather than
breaking anything; nothing currently reconciles or converts them, the same
way any other renamed item in this project has been left for the player to
simply spend down naturally.

**The Sawmill now costs 3 Pine Logs per Pine Planks**, not 1 -- the first
`STATIONS` entry to need more than one unit of input. Rather than special-
case the Sawmill, `stations.js` gained a small `inputQty(cfg)` helper
(defaulting to 1 for every other station) used everywhere a station reads
or spends its input: starting a run, the pill's afford/shake check, and
`hub.js`'s `stationNeedsAttention()`. Every existing single-input station
(Spinning Wheel) is unaffected since it never sets `inputQty` and the
default kicks in.

**The skill display name changed from "Milling" to "Woodcutting"; nothing
underneath it did.** `state.millingXp`, the `"milling"` key in `SKILLS`,
and every internal reference stayed as-is -- only `SKILLS.milling.name`
changed, since this was a purely cosmetic rename request and there was no
reason to touch a save-compatible field name along with it. The Skills
screen, which reads its labels from the `SKILLS` registry rather than
hardcoding them, picked up "Woodcutting" automatically with no changes of
its own.

## Away-popup fix: only show it after a real gap

**The "welcome back" villager popup was firing on every ordinary tick**,
not just after the player had actually been away -- `reportForageCatchup()`
in `main.js` only checked `state.villager.owned && results.length > 0`,
which is true on essentially every foraging cycle a hired villager
completes, tab open or not. It now also requires `awayMs > AWAY_POPUP_MS`
(a new `AWAY_POPUP_MS = 3000` in `data.js`) before calling
`showAwayPopup()`; a normal in-tab completion still gets the small in-pill
flash (`showForageResult()`) any gather already had, same as before a
villager was hired at all. Verified both directions in the running game:
a normal tick resolves with no popup, and a simulated 10-second gap
(`state.lastActiveAt` pushed back before a tick) still shows "Your
villager kept foraging while you were away for 10s." correctly.

## Foraging becomes swing-based, and villagers can be helped along

**Foraging now works like Mining's dig** instead of running its own timer:
every tap is instant and advances `state.forageProgress` by one, and only
the swing's fifth tap (`FORAGE_CLICKS_PER_SWING` in `data.js`) actually
rolls an item and grants XP. The old milestone-based speed curve
(`FORAGE_MS`/`FORAGE_SPEED_LEVELS`, and the level-gated `effectiveForageMs()`
that read them) is gone entirely -- there's no timer left for a level to
speed up, the same way leveling Mining doesn't make an individual dig tap
resolve any faster. `foragingLevel()` still exists and still gates the
villager hire at `VILLAGER_LEVEL`, it just no longer feeds a speed formula.

**The hired villager taps that same swing on its own**, once every
`VILLAGER_TICK_MS` (2.5s at the base rate, `state.villagerNextTickAt` the
deadline for its next one) -- and critically, it's the *same*
`forageProgress` counter the player's own taps use, not a separate parallel
gather. That's what makes "the player can still interact with the forage
button and speed things up while actively playing" literally true: tapping
along while a villager works adds directly to the swing already in flight,
so a swing that would take a passive villager `FORAGE_CLICKS_PER_SWING *
VILLAGER_TICK_MS` (12.5s solo, 5 taps × 2.5s) finishes sooner by however
many taps the player lands themselves. `fastHands` (the Township upgrade)
still multiplies `VILLAGER_TICK_MS`, read fresh on every tick rather than
locked in once, so it applies to a tick already scheduled too.

**Away-catch-up moved from a single deadline to a tick-counting loop.**
The old `state.foraging = {startedAt, readyAt}` object is gone; `settleForage()`
now just loops `while (Date.now() >= state.villagerNextTickAt)`, applying
one tap and rescheduling the next tick each time round -- a long gap (a
reload, or the game closed entirely) resolves however many ticks, and
however many complete swings, fit in the elapsed time, in one pass, the
same "resolve everything that's due, not just one" shape the old version
had, just counted in ticks instead of one big deadline. This also means
`settleForage()` alone now covers both the boot catch-up *and* every
regular tick with no special-casing between them -- `main.js` lost the old
boot-time `if (state.foraging) setPillFill(...)` line entirely, replaced
with `drawForageProgress()` (an instant, non-animated draw of whatever
progress was saved).

**A save from before this pass migrates automatically.** Its old `foraging`
field is simply not read any more; `state.js`'s `load()` defaults
`forageProgress` to 0 and, if a villager was already owned but no
`villagerNextTickAt` was ever saved (true for every pre-migration save),
schedules one fresh interval out from the moment it loads rather than
leaving the villager stalled forever.

## A real Reset Save, on the Skills screen

**Reset lives at the bottom of Skills** -- the one screen already showing
the player everything a reset would throw away. A single tap can't wipe
anything by itself: it opens the shared bottom sheet (`sheet.js`, the same
one Field's seed picker and the away-popup already use) with one explicit
"Reset Everything" button, built fresh each time rather than left sitting
in static markup, so there's nothing to double-tap by accident.

**This surfaced a real, worth-remembering bug in the confirm handler
itself**, not just in a test script: `localStorage.removeItem(SAVE_KEY)`
immediately followed by `location.reload()` looked correct, but
`main.js`'s own `window.addEventListener("pagehide", save)` fires during
that same reload's unload phase -- and it ran *after* the removeItem,
reading the still-intact in-memory `state` object and writing it straight
back into `localStorage`, undoing the reset a moment after it happened.
This is the exact "stale save resurrection" race this session's own manual
testing kept running into and working around with atomic reset scripts;
here it needed a real fix rather than a test-script workaround. The fix is
`window.removeEventListener("pagehide", save)` right before the
`removeItem`/`reload()` pair -- `save` is the same function reference
`state.js` exports and `main.js` already registered, so unhooking it from
`skillsScreen.js` actually detaches it, and the reset sticks. Verified
directly: a save with hours of accumulated bag items, buildings, and XP
came back completely empty (`localStorage.getItem("eryndor:save") ===
null`) and re-equipped with the fresh starting toolkit, exactly like a
true first boot.

## Mining: Stone/Coal/Basalt come back 3 at a time

**A successful swing on Stone, Coal, or Basalt now banks 3 of it, not 1** --
every gemstone (Amethyst, Emerald, Diamond) stays at 1. Rather than
special-casing three item names in `mining.js`, the amount lives as an
optional `yield` field right on each `MINE_MATERIALS` entry in `data.js`
(defaulting to 1 via a small `yieldFor(item)` helper) -- the same "the
number lives on the data, not in a conditional" shape `inputQty` gave
Sawmill's stations.js pass. Only `tapDig()`'s single resolution line
changed (`state.carried[item] += amount` instead of `+= 1`, and the hint
text now says "+3 Coal" instead of "+1 Coal"); `bankAndSurface()` already
banked whatever `state.carried` actually held, so it needed no changes at
all. Verified live: repeated swings landed "+3 Stone", "+3 Coal", and
"+3 Basalt" hints, while the weight odds (and the implicit 1-per-swing
default) for every gemstone were left untouched.

## Mining cooldowns shortened again, and default item sprites

**`MINE_SURFACE_COOLDOWN_MS` is now 5s (was 15s, was 30s originally) and
`MINE_CAVEIN_COOLDOWN_MS` is now 10s ("death recovery", was 30s, was 150s
originally)** -- straight number changes in `data.js`, nothing structural.
Verified live: surfacing now sets exactly a 5,000ms cooldown and a cave-in
exactly 10,000ms.

**Every bag item now has a real default sprite** at
`assets/sprites/items/<slug>.png`, replacing the plain color-dot fallback
the Inventory/Recent Items/Market chips used to show. Rather than one-off
hand-drawn art (out of reach here), each is generated procedurally: a
rounded-square tile in the item's own `TINTS` color (the same color every
other UI already keyed off), a soft top-left highlight and a darker
border for a bit of depth, and a simple flat glyph on top whose *shape* --
not color, not a monogram -- carries what kind of thing it is. `categorize()`
buckets every item name by keyword into one of nine shape families (gem/
ore, seed, berry cluster, wood/log, fiber, charcoal lump, armor, can,
tool-blade), each drawn with plain canvas paths, and text/glyph color
picks light or dark automatically from the tile color's own luminance so
it stays legible against light backgrounds (Diamond, Platinum Ore) and
dark ones (Coal, Scorn) alike. Generated once via an offscreen `<canvas>`
in the running game itself (`toDataURL("image/png")` per item, 39 in
total) and written to disk as real files -- the sprite pipeline in
`sprites.js` needed no changes at all, since `items/<slug>.png` was
already exactly what it was looking for. These are meant as real *default*
art, not placeholders to be immediately replaced -- hand-drawn sprites can
still override any of them later by just dropping a same-named file in.

## Farming and Logging become pill lists

**Plots are pills now**, the same fill-bar-and-label language as Foraging,
Mining's dig, and every conversion station, instead of a bespoke ring-and-
plant tile grid. A plot's whole life is really just one progress bar with
a changing color and label -- watering, growing, ripe -- which a pill
already said better than a custom radial ring ever did. `buildPlots()`/
`buildLogPlots()` build one `.pill.plot` button per plot; `drawField()`/
`drawLogging()` drive its `.pill-fill` width and `.pill-sub` text off the
same `plotStatus()`/`logPlotStatus()` logic that already existed, just
reading a fill percentage and a sentence instead of a ring's `--p` custom
property. **Watering shows blue** (`.plot.watering .pill-fill`), ripe
locks to gold at full width and breathes gently, and the old per-plot
ripple/droplet/rise animations are gone -- the harvest/fell payout reuses
Foraging's own `.pill.result` gold-flash treatment for the "+3 Pine Logs"
moment instead of a bespoke rise-and-fade.

**This surfaced a real, previously-invisible CSS gap**: `.pill-name` and
`.pill-sub` are both `<span>`s with no explicit `display`, so they only
ever *looked* stacked on other pills because their text happened to be
short enough not to collide. Six rows tall, "Red BerriesRipe — tap to
harvest" ran together on one line immediately. Fixed with
`display: block` on both, globally -- a strict improvement everywhere a
pill exists, not just plots.

**The Scythe is one tap now, not instant.** `HARVEST_MS` (5s) starts the
moment a ripe plot is tapped with it (`startReap()`); the actual payout
(`resolveHarvest()`) is split out and runs from `settle()` once that
deadline passes, same "offline catch-up, no visible node needed" shape
Logging's `fellTree()` already used for chopping. A plot mid-cut is a new
`"cutting"` status, distinct from `"ripe"`, so tapping it again (with any
tool) says "Already cutting" rather than double-charging the timer.

**Plot count dropped from 6 to 3** for both Farm and Logging
(`PLOT_COUNT` in `data.js`) -- a fixed 3x3-ish grid doesn't need to hold
as many now that a taller pill list is the shape, and a shorter list also
keeps the layout change below easier to read at a glance.

**Tools moved to the very bottom of the screen, plots start right under
the XP bar** -- `.field-grid` changed from `margin: auto 0` (which
centered the whole plots+tools block in the middle of the screen) to
`flex: 1` with `.tools { margin-top: auto }`, the same bottom-pinning
trick the Inventory screen's Equipment/Bag/Storage toggle already uses.
Plots now read top-down starting immediately below the XP bar; the tool
bar sits flush above the forage bar, not floating in the middle of empty
space.

## Mining: swing label, and the cooldowns tuned twice more

**The Dig pill says what it's actually swinging.** `refreshMining()` now
sets the pill's own name to `"Swing " + (state.equipment.pick || "No
Pickaxe")` every redraw, instead of a fixed "Dig Deeper" -- same
reasoning Farm/Logging's tool buttons already show their equipped item's
name, made explicit for Mining's one action.

**`MINE_SURFACE_COOLDOWN_MS` and `MINE_CAVEIN_COOLDOWN_MS` were both
tuned down twice more this pass** -- 30s/150s to 15s/30s, then to a final
5s/10s. Straight number changes in `data.js`; verified live both times
that a surface sets exactly the stated cooldown and a cave-in sets its
own.

## Mining: Stone/Coal/Basalt drops already covered; Stone Cutter is new

**A new build-gated station, Stone Cutter**, follows Sawmill's build/
screen/skill pattern exactly, but is the first `STATIONS` entry to need
*two* recipes on one screen and the first to need more than one *kind* of
input at once. `STATIONS` gained an optional `cost` map (the same shape
`RECIPES` already uses) as the general form of "what this recipe
consumes" -- a station with no `cost` falls back to
`{[input]: inputQty || 1}`, so Spinning Wheel and Sawmill keep working
unchanged. `stoneCutter` (3 Stone -> 1 Stone Block) and `basaltCutter`
(1 Stone Block + 3 Basalt -> 1 Basalt Block) both live on the one
`#screen-stoneCutter` screen and share one new skill, Stonecutting --
`basaltCutter` has no hub card or back button of its own (`stations.js`'s
per-id lookups already tolerate a missing element, guarded the same way
every other optional per-station DOM hook is), it's just a second pill on
Stone Cutter's shared screen. `hub.js`'s `stationNeedsAttention()` now
imports `costFor`/`canAfford` back from `stations.js` to read the same
generalized cost -- a deliberate, documented circular import, the same
shape `screens.js`'s own set already uses.

## Combat: a second enemy, real player defaults, and Flee replaces Spells

**The idle screen is a real list now**, not one hardcoded button --
`buildCombatIdle()` renders one card per `ENEMIES` entry (icon, name, a
short note), so a second fight is a new `data.js` entry, not a markup
change. `startFight(enemyKey)` takes which one; "Fight Again" passes
none and refights whatever `state.combat.enemyKey` already says.

**Chicken is the first enemy with real drops** -- 5 HP, 1-3 dmg, attacks
every second, and a win grants Bones, Feathers and Raw Poultry all at
once (`ENEMIES.chicken.drops`, a `gainItem()`-per-key map read in
`endFight()`, the same shape `CROPS`/`TREES` already use for `gives`).
Grey Wolf is unchanged and simply has no `drops` field -- `endFight()`
treats a missing one as `{}`.

**Player defaults are real numbers now, not placeholders**:
`COMBAT_PLAYER_MAX_HP` 50 -> 10, `COMBAT_UNARMED` 2-4 -> a flat 1,
`COMBAT_BASE_RECOVERY_MS` 2200 -> 1000. A fresh, unarmed fight is now a
real fair fight against a Chicken, not a foregone conclusion either way.

**Spells (always "Coming later", never wired to anything) is gone,
replaced by Flee.** One tap, `FLEE_CHANCE` (50%) checked once: succeed
and the fight just ends -- a third outcome, `"fled"`, alongside won/lost,
with no reward and no penalty either. Fail and it costs the normal
recovery cooldown, same as any other action, while the enemy's own clock
never stopped ticking. `refreshCombat()`'s result panel gained a neutral
`.fled` treatment (dim, not gold or red) alongside win/loss.

## Seeds and cones no longer come back from harvesting

**Crops and trees stopped returning their own seed/cone on
harvest/fell** -- `CROPS.redBerries.gives`/`CROPS.flax.gives`/
`TREES.pine.gives` all dropped the seed entry that used to sit alongside
the real yield. Foraging is meant to be the only source of what plants
something new; a crop that quietly reseeds itself never actually needed
the forage pool for that seed at all. Purely a data change -- `harvest()`/
`fellTree()` both already just iterate whatever `gives` lists, no logic
needed touching.

## Equipment becomes a full-width pill list; Bag/Storage get a quantity slider

**Equipment dropped the 3x3 body grid + tool column for one ordered pill
list** -- Armor (Helm, Chest, Legs), then Hands (Left/Right), then Tools,
matching the order asked for rather than the sketch's spatial layout.
Every row is a real `.pill`, so it's the same shape as everything else in
the game now, not a bespoke square-tile component -- `GEAR_POSITION`'s
grid-cell math is gone entirely, replaced by one `EQUIP_ORDER` array of
slot ids that `buildEquipSlots()` just walks in order.

**A tap never unequips directly any more.** Every row -- filled or empty
-- opens the same picker sheet; a filled slot's sheet just gains an
"Unequip X" row at the top, above whatever else could go there. Choosing
a different item now swaps in one tap (`equip()` returns whatever was
equipped to the bag first, then equips the new one), so changing gear no
longer needs an unequip-then-reopen-the-picker round trip. Verified live:
equipping a Flint Axe over an already-equipped Wooden Axe correctly
returned the Wooden Axe to the bag with no duplicate anywhere.

**Bag and Storage taps open a quantity slider**, the same
`openQtyPicker`-shaped sheet the Market's buy/sell rows already use,
instead of moving an entire stack on one tap. The slider defaults to the
whole stack (so a single confirm still behaves like the old one-tap
move), but can be dragged down to move only part of it -- keep a few Pine
Logs on hand, store the rest, without splitting the stack any other way
first. Verified both directions: a partial Bag -> Storage move left the
remainder correctly in the bag, and Storage -> Bag moved the requested
amount back.

## Tutorial hint captions hidden for now

**The small-font "Pick a tool to begin."/"Tap an item to store it."
captions under Farm, Logging, Mining, Inventory, Market and the Campfire
are hidden**, not removed -- a single `.hint { display: none; }` in
`style.css`. Every `hint()`/`logHint()`/etc. call site is untouched, so
this is a one-line revert if instructional text comes back later, not a
re-plumb. The status text that actually carries information (a pill's own
`pill-sub`, a plot's "Watering 2/4") was never part of `.hint` and still
shows -- only the purely instructional layer on top of that is gone.

## Affordability, at a glance: a shared cost-display module

**Every recipe-cost UI now shows what you have, not just what it costs,**
and colors each ingredient on its own -- green once the bag covers it, the
warn color while it's still short. Pulled into a new `src/costDisplay.js`
(`canAfford()` + `buildCostNodes()`) rather than left duplicated across
Crafting, every conversion station, and build prompts the way `canAfford()`
alone used to be -- one shared place now answers "can I afford this, and
by how much" for all three. `buildCostNodes()` returns real DOM nodes
(colored `<span>`s joined by plain " · " text nodes), dropped in via
`replaceChildren()`, not an HTML string.

**A pill or card that's actually ready now says so positively**, not just
via the absence of the existing dimmed `.unaffordable` look --
`.affordable-ready` (a faint green ring on a pill, a green border on a
build-prompt card) is toggled alongside `.unaffordable` everywhere a
recipe cost already existed. `hub.js`'s own `canAfford` now comes from
`costDisplay.js` too (rather than being re-exported from `stations.js`),
so `craftNeedsAttention()`'s hub-card "something to do here" ring reads
the identical rule the pill itself uses.

Bag/Storage-owned counts elsewhere (Market's buy/sell rows, the seed/cone
pickers, the equip picker) already showed "N owned" before this pass --
only Crafting, the conversion stations, and build prompts were missing it,
so those three are what actually changed.

**Each ingredient reads "have/need Item"** (`"1/15 Stone"`,
`"20/20 Sticks"`), not the original "need Item (have have)" phrasing --
have-first matches how the rest of the game already writes a fraction
(an XP bar's "into / need", a watering plot's "2/4") rather than reading
as its own one-off sentence.

## Two more livestock enemies, with real drops

**Highland Cow (10 HP, 2-3 dmg) and Highland Sheep (8 HP, 2-3 dmg)** join
Chicken and Grey Wolf as ordinary `ENEMIES` entries -- `buildCombatIdle()`
already rebuilds its card list from `Object.keys(ENEMIES)`, so both showed
up on the idle screen with no other code changes. Cow drops Animal Hide,
Raw Beef and Bones; Sheep drops Wool, Raw Mutton and Bones -- one each,
the same flat `drops` map Chicken introduced. Both attack every 2 seconds,
between Chicken's 1s and Grey Wolf's 3s.

## Tanning Station and Cloth: two more uses for the generalized STATIONS cost

**A new build-gated station, Tanning Station**, follows the exact
Sawmill/Stone Cutter pattern -- 3 Animal Hide -> 1 Leather, its own new
skill (Tanner, `state.tanningXp`). Nothing about `stations.js` needed to
change; this is the `cost`-map generalization from the Stone Cutter pass
paying off immediately for a second, unrelated station.

**The Spinning Wheel gained a second recipe, Cloth (4 Wool -> 1 Cloth)**,
sharing its screen and its Sowing skill with the existing Spin String
recipe -- the same "second recipe, one screen, shared skill" shape
`stoneCutter`/`basaltCutter` established, just applied to a station that
already existed rather than a brand new one. `clothSpinner` has no hub
card or back button of its own, same as `basaltCutter`.

## Press-and-hold to reorder the home hub

**Long-press any hub card to pick the whole grid up for reordering** --
every other card wiggles (the same language a phone's own home screen
uses), a "Done" bar appears, and dragging the held card over another one
and releasing swaps them. `hub.js`'s `attachReorderPress()`/`beginDrag()`
track a 500ms press timer per card (cancelled if the pointer moves more
than 10px first, so an ordinary scroll or tap is never mistaken for a
hold); the dragged card follows the pointer via a CSS `transform` rather
than triggering a live DOM reflow on every pixel of movement -- the actual
reorder only happens once, on release, against whichever other card the
pointer was last over (`insertBefore` in the DOM, then `commitOrderFromDOM()`
reads that final order back out and re-renders clean).

**The custom order persists as `state.hubOrder`**, an array of place ids
-- `orderedPlaces()` (which `drawMenu()` now calls instead of filtering
`PLACES` directly) walks that array first, then appends anything it
doesn't recognize (a station unlocked after the player last reordered) at
the end in `PLACES`' own default order, so unlocking new content can never
make an entry silently disappear from the grid. A locked card (`ready:
false`) is a disabled `<button>`, which browsers already refuse to fire
pointer events on -- locked cards were never draggable to begin with, no
extra guard needed.

Verified live: a long-press correctly entered reorder mode and picked the
card up; dragging it over another card and releasing swapped them and
persisted the new order through a reload; tapping Done cleanly exited
reorder mode and normal navigation taps worked again immediately after.

## Campfire simplified to match the other stations

**The campfire scene -- hand-drawn flame/log art, a two-queue system, a
pause toggle -- is gone**, replaced with three plain pills, the same
`craft-list` language every conversion station already uses: a Fuel
picker, a Cook picker, and one Cook action pill with the usual fill-bar
timer. Picking a fuel or cookable (via the same choice-sheet Seeds/Cones
already use, now just setting `state.campfire.selectedFuel`/`selectedCook`
rather than immediately spending anything) doesn't cost a thing by itself;
tapping Cook is what spends one of each and starts the timer, the same
"spend on commit" rule every station follows. Chosen from two options this
pass explicitly asked about: a picker-sheet (not an inline icon row, to
reuse existing code) and no queue at all (not a simplified one) -- tap
Cook again once a pair finishes for the next.

**`state.campfire` dropped `fuelQueue`/`cookQueue`/`paused` for
`selectedFuel`/`selectedCook`** alongside the unchanged `current` -- a
save from before this pass gets its queued (not yet burning) items
refunded straight to the bag on load rather than silently discarding real
spent materials; whatever was already `current` and burning carries over
exactly as before.

**Picking the same item for both fuel and cookable works correctly** --
Pine Logs can fuel the fire *and* be what's cooking (into Charcoal) at
once; the cost map naturally collapses to `{"Pine Logs": 2}` rather than
needing a special case, and the picker correctly refuses to reopen while
something's actively burning. Verified live: choosing Sticks + Berries,
cooking, and collecting Cooked Berries; choosing Pine Logs for both and
seeing the pill read "9/2 Pine Logs" and consume exactly 2 on start.

**The Furnace (still locked, not built yet) is meant to reuse this exact
shape** -- one more picker pill for a second input alongside the one Fuel
picker, same Cook-pill-with-a-cost-map pattern, whenever it's actually
built out.

## Fixed: build/recipe costs now count Storage, not just the carried Bag

**Reported as "I have 22 Stone but Township says I only have 19"** -- real
inventory tracking was fine (19 in the Bag, 3 in Storage, 22 total); the
bug was that every build prompt and recipe cost only ever checked
`state.bag`, silently ignoring Storage entirely, while the player
naturally counts both toward "what I own." The Market's own sell flow
already treated Bag and Storage as one combined stash
(`combinedOwned()`); build/craft/station/campfire costs just hadn't been
brought in line with that.

**`costDisplay.js` gained `combinedOwned()` and `spendItem()`/
`spendCost()`** -- `canAfford()` and `buildCostNodes()` now read Bag +
Storage together, and every spend site (`buildings.js`, `stations.js`,
`craft.js`, `campfire.js`) spends through `spendCost()`, which drains the
Bag first and only reaches into Storage for whatever's still short, same
order `market.js`'s `sellQty()` already draws from. Campfire's own picker
sheets and selected-fuel/cookable sub-text also switched to
`combinedOwned()`, so "3 Sticks (12 have)" means the same thing there too.

Verified live with the exact reported numbers (19 Bag + 3 Storage):
Township's prompt now reads "22/20 Stone" and is tappable; building it
correctly drained the Bag to 0 first and took only the 1 remaining unit
from Storage. Confirmed the same for a station recipe (Sawmill, 1 Bag +
2 Storage Pine Logs reading "3/3" and spending both containers in full).

## Mining: surface/cave-in cooldowns now scale with depth

**Both cooldowns are a formula now, not flat constants** --
`MINE_SURFACE_MS_PER_10M` (1 second per 10m of depth reached) replaces the
old flat `MINE_SURFACE_COOLDOWN_MS`; a cave-in uses the same formula
doubled (`MINE_CAVEIN_MULT`) rather than its own unrelated flat number.
`mining.js`'s new `cooldownFor(depth, caveIn)` is the one place both
`bankAndSurface()` and the hazard branch of `tapDig()` read from -- surfacing
from 50m sets a 5s cooldown, a cave-in at 80m sets 16s (8s base, doubled).
Depth is captured before it's reset to 0 in both places, same as the
existing `depthReached` local `bankAndSurface()` already had.

## Chopping becomes an HP fight, not a timed multi-tap swing

**Felling a tree is a straight damage race now** -- every tree has a flat
`health` (Pine: 24), every axe has a flat `damage` off a new `AXES` map
(Wooden: 1, Flint: 2, Stone: 3, the first tier the Axe slot has ever had --
`RECIPES.stoneAxe`, 15 Stone + 10 Pine Logs, mirrors Stone Pickaxe's own
cost exactly), and every tap on a ripe tree is instant and deals whatever
the equipped axe's damage is straight off `plot.chopHealth`. The tree
falls the moment health reaches 0, in that same tap -- no per-swing timer,
no cave-in-style risk, a better axe just chops faster, plainly. This
replaces the old `CHOP_TAPS_NEEDED`/`CHOP_MS` timed-swing system
entirely -- `settleLogging()` lost its whole chop-deadline branch, since
there's no timer left to catch up on offline.

**The bar fills up yellow as damage lands**, the same direction and shape
watering's own bar already uses (0% at full health, 100% the instant
before it falls) -- not Farm's "full and breathing" gold treatment, which
never applied to Logging's ripe status quite right once it needed to show
partial progress. `#log-plots .plot.ripe .pill-fill` overrides the shared
gold color specifically for Logging; the breathing "this needs attention"
pulse still applies underneath it. The old continuous axe-wobble animation
(there for the whole swing) is gone with the timer it animated -- a single
sharp impact flash still plays on every tap, felling or not.

**A save from before this pass migrates painlessly** -- its old
`chopProgress`/`chopReadyAt` fields are just never read; a tree that was
mid-chop comes back at full health rather than an old "2 of 4 timed
chops" number that never meant HP to begin with. Verified live: Wooden/
Flint/Stone Axe dealt exactly 1/2/3 damage per tap on a fresh 24 HP Pine,
the bar read the right fraction and the right yellow at each step, and
felling correctly paid out Pine Logs and XP and reset the plot.

## Enemy level badges on the fight-picker

**Each `ENEMIES` entry now carries a `level`** (Chicken 1, Highland Cow/
Sheep 2, Grey Wolf 3) shown as a small "Lv N" badge on its own card in
`buildCombatIdle()`'s list -- reuses Township's own `.villager-hire` row
shape, with the badge sitting where a Shard cost would (a new
`.villager-hire-level` class, since the existing cost badge auto-appends
" Shards" and would've said something nonsensical for a level). Purely
informational -- nothing gates a fight by level yet, this just tells the
player what they're walking into before they tap in.

## Per-item crafting mastery

**Every craftable/produceable item now levels up on its own**, independent
of whatever skill or station made it -- a new `src/itemLevels.js` tracks
`{level, crafts}` per item name (`state.itemLevels`), not per recipe or
station, so "how good am I at making Pine Planks" means the same thing no
matter what eventually makes them. Every `ITEM_LEVEL_CRAFTS_NEEDED` (10)
units actually produced advances the item's own level by one; each level
knocks `ITEM_LEVEL_SPEED_MULT` (10%) off that item's own time,
compounding -- level 2 is 0.9 x 0.9 = 81% of the base, not 80%. It's read
once, at the moment a cycle starts, same "doesn't retroactively speed up a
run already in progress" rule the station skill bonus already followed --
now both stack multiplicatively (skill speed x item mastery), verified by
isolating each one in turn.

**A gold badge left of the icon shows the level; a thin gold bar along the
pill's bottom edge shows crafts landed toward the next one** -- a second,
thinner strip below the existing full-height `.pill-fill` overlay, not
competing with it for space. The badge pops (reusing the same
`pill-pop` flash Crafting/Foraging's own counts already use) the instant a
craft actually pushes it to a new level, not on every craft.

**Live everywhere a recipe already existed**: every `STATIONS` entry
(Sawmill, Spinning Wheel, Cloth, Stone Cutter, Basalt Block, Tanning
Station) picked it up for free through their one shared handler in
`stations.js`; the Crafting Bench (`craft.js`, a separate system keyed by
`RECIPES` instead) got its own equivalent wiring since it isn't part of
that shared handler. Verified live on both: Sawmill's Pine Planks hit
level 1 after exactly 10 crafts and ran in exactly 9000ms (10000 x 0.9,
skill bonus isolated to confirm), and the Crafting Bench's Flint Axe at a
seeded level 2 ran in exactly 12150ms (15000 x 0.9²).

**Logging is deliberately not wired up yet** -- chopping is an instant
per-tap HP fight now (see the earlier chopping rework), not a timer, so
"10% less time" has no obvious meaning there. Held for a follow-up
decision on what an item-mastery bonus should actually do for
Logging (more damage per tap? bonus Pine Logs per fell? something else?)
rather than guessing.

## Fixed: no way back to the enemy list once you'd fought anything

**`state.combat` was never cleared once a fight ended** -- `endFight()`/
`flee()` both set `c.over` but left `state.combat` itself sitting there
forever, and `refreshCombat()`'s idle-vs-arena branch (`if (!c) { show
idle }`) only ever shows the enemy list when `state.combat` is exactly
`null`. In practice this meant the enemy-select screen became permanently
unreachable the moment a player finished a single fight: leaving Combat
and coming back (however you got there -- the header's back chevron, the
hub card) always resumed the same finished result screen, offering only
"Fight Again" against that same enemy, forever.

**Two fixes, covering both ways a player actually hits this**: the result
panel now has an explicit "Choose a different enemy" link under "Fight
again" (`combat.js`'s `chooseAnother()`) that clears a *concluded* fight
and shows the idle list without leaving the screen at all; separately, the
header's own back button now clears a concluded fight on the way out too,
so returning via the Combat hub card shows the enemy list instead of the
stale result. Neither touches a fight that's still in progress --
`state.combat.over` has to already be truthy, so backing out mid-fight
still correctly resumes the same active fight later, exactly as before.

Verified live: winning, tapping "Choose a different enemy," and seeing the
idle list immediately; winning and leaving via the back chevron, then
re-entering Combat from its hub card, also landing on the idle list; and
confirming an unfinished fight (Highland Cow, `over: null`) survives a
back-and-return cycle completely untouched.

## Skills becomes Journal, with a Collection page

**The dock's Skills tab is now "Journal"** -- same internal id ("skills"
throughout `SCREEN_IDS`, the dock, `#screen-skills`), same "display name
changed, the id underneath didn't" rule Milling -> Woodcutting already
established, just a new on-screen title and dock label. It now holds two
pages behind the same Sell/Purchase-style toggle Market already uses:
Skills (byte-for-byte the same screen it always was -- `skillsScreen.js`
wasn't touched) and a new Collection page.

**Collection is an Animal-Crossing-style completionist log** -- every one
of the 51 items in `TINTS`/`CATEGORIES` (already the game's one
canonical, kept-in-lockstep item list), grouped into a section per
category, each item showing its real sprite if the player's ever gained
one, or a "?" tile with a "???" label if they haven't. The whole point is
visible incompleteness -- a wall of question marks in Mining or Combat is
the nudge that there's more to go find, not a dead end.

**A new `state.discoveredItems` map, set once and never unset**, tracks
this independent of the bag -- `gainItem()` in `state.js` (the one funnel
every real source of a new item -- foraging, crafting, mining, combat
drops, harvesting, buying -- already routes through) marks an item
discovered the instant it's gained, so it stays checked off even after
the item is later spent, sold, or consumed. Starting gear (the four
Wooden tools) never passes through `gainItem()` -- it's just there at
boot -- so it gets its own one-line discovery mark in the same loop that
hands it out.

**A save from before this pass has no discovery ledger at all** -- rather
than opening a returning player's journal to a wall of "?" for things
they're plainly already carrying, `state.js`'s `load()` backfills one from
whatever's currently sitting in the bag, storage, or equipped. This is a
floor, not real history: anything already spent before this existed (a
crafted material, fuel already burned) has no trace left to backfill from
and shows as undiscovered until found again -- an acceptable one-time gap
for a save that predates the feature entirely.

Verified live: a genuine fresh save seeds exactly the four starting tools
as discovered and shows 0/N everywhere else; foraging up a new item marks
it discovered immediately and the Collection page reflects it the next
time it's opened; and loading a save with the `discoveredItems` field
stripped out correctly backfilled from that save's own bag contents
instead of resetting to all-undiscovered.

No incentive is wired to finishing a section yet -- this is deliberately
just the log itself, ready for whatever reward system comes next.

## Fixed: mobile browsers reading rapid taps as double-tap-to-zoom

**Reported as "unplayable" on a phone** -- Mining's swings, Forage, and
chopping all depend on tapping the same small spot rapidly and
repeatedly, which is exactly the gesture mobile Safari/Chrome read as
"double-tap to zoom in here" with no way for a web page to opt out by
default. Two changes, both needed (either alone has been known to not
fully work on some browser/OS combination in the wild):

- **The viewport meta tag** (`index.html`) gained `maximum-scale=1,
  user-scalable=no` -- the browser can no longer zoom the page at all,
  double-tap or otherwise.
- **`touch-action: manipulation`** is now set globally (the `*` rule in
  `style.css`) -- normal single-finger scrolling/panning still works
  everywhere the page actually scrolls; only double-tap-zoom and
  pinch-zoom are given up, and as a bonus this also removes the ~300ms
  tap-delay some mobile browsers add while waiting to see if a second tap
  is coming, which was working against rapid-tap mechanics anyway.

Verified live: the viewport meta and `touch-action` both read back
correctly from the page, and ordinary taps/navigation still work exactly
as before -- this only removes a gesture, not any input handling.

## Night difficulty/rewards, town market hours, and the world's foundation

**Night is redefined as 9pm-7am** (`NIGHT_START_HOUR`/`NIGHT_END_HOUR` in
`data.js`, was 8pm-6am) -- one shared window, not a separate one invented
per system. Crops already read this through `growthMultiplier()`'s
existing `NIGHT_GROWTH_MULT` (0.5x), so moving the window immediately
retimed crop growth to match with no other change needed.

**Combat is 2x harder and pays 2x better at night** (`COMBAT_NIGHT_MULT`
in `data.js`) -- baked into `state.combat` once, at `startFight()`
(`nightBoost: true`), the same "read once, not retroactive mid-run" rule
every other timer/bonus in this game follows, so a fight that happens to
straddle the real-world day/night boundary doesn't have its difficulty
shift mid-fight. Doubles the enemy's HP and attack roll on one side and
the shard reward and every drop quantity on the other -- verified live
with the clock mocked to 10pm: a Chicken's HP read 10 (base 5), and its
attacks landed for 1-6 rather than the base 1-3 range. A gold "🌙 (2x)"
tag appears on the enemy's name in the arena, the result panel notes
"(night bonus applied)," and the idle enemy-picker shows a standing
"enemies are tougher, but reward more" note whenever it's currently
night, so the player knows before they tap in, not just after.

**A new `LOCATIONS`/`ROADS` foundation in `data.js`** -- laid down well
ahead of an actual Map screen or travel mechanic (both later batches), so
other foundational pieces have real data to read instead of a hardcoded
"Aerendell" assumption. `LOCATIONS` gives every location a `type`
(`city`/`town`/`landmark`/`wilderness`) that decides what it even has --
a city gets a market (open 24/7) and a bank (shared across every city,
once banking exists); a town gets a market (closed overnight) and its own
local, unshared storage; a landmark or wilderness gets neither. The six
locations existing today are exactly what the hand-drawn map shows:
Aerendell (town), Forest Road (wilderness), Thal-Barak (city), Stilltide
Pass (wilderness), Duun-Vael Bridge (landmark), Riverhold (city), one
linear road chain between them with the sketch's own travel-time numbers.
Every location past Aerendell has empty `stations`/`forage` placeholders
-- the same "real spot, nothing behind it yet" treatment the Furnace hub
card used before it was real -- ready for the location spreadsheet's
answers, not yet reachable or visible to the player.

**Aerendell's market now actually closes overnight** -- 5pm-9am
(`TOWN_MARKET_CLOSED_START_HOUR`/`END_HOUR`), a separate window from
night itself (a market can't be assumed to close exactly at dark or open
exactly at dawn). `time.js`'s new `isTownMarketOpen()` and `market.js`'s
`marketOpenHere()` read `LOCATIONS.aerendell.type === "town"` rather than
hardcoding the closed-hours check -- a city's market, once one exists to
visit, is open 24/7 by type alone and never calls the clock at all.
Closed hours replace the whole Sell/Purchase list with a plain notice
rather than disabling individual rows, so there's nothing left to tap and
no extra guard needed anywhere else. Verified live at every boundary
hour: closed at 8am and 5pm, open at 9am and 4pm.

This is deliberately just the data/mechanics layer -- no Map screen, no
travel, no per-location content yet. See the batch plan (and the
location spreadsheet) delivered alongside this pass for what's next.

## The Map screen: batch 2, read-only

The second batch of the world-foundation plan: a real Map screen, reading
straight off the `LOCATIONS`/`ROADS` data the previous batch laid down.
`PLACES.map` flips to `ready: true` and `"map"` joins `SCREEN_IDS` --
that's the whole unlock, since the dock and hub already treat any listed
screen id as a real destination rather than a "shake, not built yet"
button.

**A real freeform 2D layout, not a list.** Every `LOCATIONS` entry now
carries a grid `pos: {x, y}` (data.js), with y increasing upward from
Aerendell at 0 -- matching both the sketch's "the road climbs away from
home" shape and the rule that the starting location sits at the bottom of
the map, not the top. `src/map.js` converts that grid into pixels and
drops each location as a circular node onto an absolutely-positioned
`#map-canvas`, with a dashed SVG line per `ROADS` entry connecting node
centers. A grid (not a single chain array) on purpose: the sketch itself
already branches sideways off Thal-Barak, so a location needs to be
placeable anywhere around its neighbors, not just stacked in one
direction -- something a vertical list genuinely couldn't have grown into
without a rewrite. A green-ringed node marks `state.currentLocation` with
a "You are here" label.

**Travel time sits directly on the road**, not off to the side -- a
`.map-road-badge` positioned at each line's exact midpoint, the same way
the hand-drawn sketch circles a number right on top of the dashed path.
`ROADS[i].locked` (a reason string, `true` for an unexplained lock, or
absent for open) swaps that badge for a padlock instead, per the sketch's
own "some locks don't show why" rule -- nothing is locked yet, same "real
shape, nothing behind it yet" treatment the `LOCATIONS`/`ROADS`
foundation itself got last batch.

**The canvas can be bigger than the screen, so it's draggable.** Six
locations already need more height than one viewport, and any branch off
the main chain will need width too -- rather than caping the layout to
what fits, `#map-viewport` is a fixed-size window onto a larger
`#map-canvas`, panned by hand in `src/map.js` (mouse or touch both arrive
as pointer events, so one code path covers both) instead of relying on
the browser's native scroll. The screen opens already centered on the
player's current location rather than the canvas's top-left corner. A
tap is told apart from a drag at `pointerdown`, by which node (if any)
was directly under the pointer *before* any movement happened, since
`setPointerCapture` -- needed so a drag started on a node doesn't stop
tracking once the pointer moves off it -- retargets every event after it
(including the click that would normally follow) to the viewport itself,
making `event.target` useless for figuring out what got tapped by the
time a click fires. Move past a small threshold and it pans; stay under
it and the node's sheet opens.

**`state.currentLocation`** is a new persisted field, seeded to
`"aerendell"` and with no way to change it yet -- travel itself is the
next batch, not this one. It exists now so that batch has something real
to move instead of also having to invent where the player starts.

**Tapping a node opens the shared bottom sheet** (the same one Field's
seed picker and Logging's cone picker already use) with what's known
about that location: its type, the type's market/storage rule spelled out
in plain language, its station list and whether foraging is available
there, and either "You are here" or "Travel isn't open yet" depending on
whether it's the current location. Nothing here is a button that does
anything yet -- it's read-only, matching the batch plan.

Verified live: all six locations and five roads render with the sketch's
own travel times sitting on their lines, Aerendell opens at the bottom of
the view with its "You are here" badge and real station list, dragging
the canvas in any direction pans to reveal the rest of the chain, and a
tap right after a drag still opens the correct node's sheet rather than
being swallowed by the gesture that came before it.

A placeholder location, `thalBarakBranch` ("Unnamed Branch"), was added
off to the side of Thal-Barak purely to prove a location can sit anywhere
around its neighbors instead of only stacking in the main chain -- the
sketch itself tears off right where its real branch would have been
named, so this stands in for that until the real one is decided. Both it
and its one road are marked in `data.js` for easy removal or renaming
once that's settled.

## Travel: batch 3, moving between locations for real

The third batch: locations are no longer just a map to look at.
`src/travel.js` is the whole mechanic -- `state.travel` (`{ from, to,
readyAt }` or `null`) is a deadline like every other timer in this game,
so a trip already under way keeps progressing correctly across a reload
or the tab being closed outright, and `settleTravel()` slots into the
same boot/tick "catch up, then draw" shape `settleCombat()` and the rest
already use. One trip in flight at a time; only a direct, unlocked road
(`roadBetween()`) can be traveled -- no multi-hop routing yet, so
reaching a location two roads away means arriving at the one in between
first.

**The Map screen's sheet gained a Travel button.** Tapping a location
that isn't where the player already is now shows one of: a "Travel (X
min)" button (a direct, unlocked road exists); "No direct road from here
yet" (no road connects them); the road's lock reason, or a bare "Locked"
if the road doesn't say why (`ROADS[i].locked`); or, if a trip is already
under way, either "Already on the way here" (tapping the destination
itself) or a note naming where the player *is* headed (tapping anywhere
else) -- travel can't be redirected mid-trip. Tapping Travel starts the
trip, closes the sheet, and rebuilds the map immediately so the change is
visible without waiting for the next tick.

**A trip in flight is visible on the map itself**, not just inside a
sheet: the destination node and the one road it's traveling turn gold
(`.map-node.traveling`, `.map-road-line.traveling`), labeled "Arriving..."
in place of its usual type, while the departure node keeps its green
"You are here" ring the whole time -- `state.currentLocation` doesn't
flip until the trip actually resolves. A gold countdown banner
(`#map-travel-note`, styled like Combat's own night-warning note) sits
above the map showing "Traveling to X -- Mm Ss," refreshed every tick
while the Map screen is open the same way Combat's own countdown numbers
are, without rebuilding the whole canvas just for one line of text.
Arriving (`readyAt` passing) does trigger a full rebuild, since the
"You are here" ring, the note, and the gold highlighting all need to move
at once.

Verified live: starting a trip from Aerendell to Forest Road shows the
gold destination/road and the live countdown banner immediately; fast-
forwarding `readyAt` resolves the trip on the very next tick, flipping
"You are here" onto Forest Road, restoring Aerendell's plain type label,
and clearing the banner; Aerendell's own sheet then correctly offers a
Travel button back; and a location with no direct road from the new
current location (Riverhold, from Forest Road) correctly reports that
rather than offering a button.

Deliberately still narrow: arriving only changes `state.currentLocation`
-- nothing yet reads it to gate which stations, markets, or forage pools
are actually usable from wherever the player physically is. That's
per-location content, batch 4, waiting on the location spreadsheet's real
answers before there's anything meaningful to gate.

The placeholder branch off Thal-Barak (`thalBarakBranch`, "Unnamed
Branch") from the last pass has been removed, along with its one road, now
that its job -- proving the Map screen handles a location off to the side
of the main chain -- is done.

## Batch 4: per-location content actually gates things

Everywhere `state.currentLocation` was inert scenery through batches 2-3,
it now decides what's real:

**Built stations only work where they were built.** Every `BUILDINGS`
entry (Campfire, Spinning Wheel, Sawmill, Stone Cutter, Tanning Station,
Township) already corresponds to a `LOCATIONS[...].stations` entry --
`hub.js`'s `builtHere()` checks both `state.buildings[id]` *and*
`LOCATIONS[state.currentLocation].stations.indexOf(id) >= 0` before the
hub shows its card, and `buildings.js`'s `belongsHere()` applies the same
rule to the "Build ___" prompt itself, so you can't even start building a
station somewhere it doesn't belong. Travel away from Aerendell today and
every built station's card disappears along with any remaining build
prompts; travel back and they're all there again. Field, Logging, Mining,
Craft Bench, and Combat aren't `BUILDINGS` entries and aren't listed under
any location's `stations` array, so none of this touches them -- they
stay available everywhere, which is a real (if implicit) design choice:
LOCATIONS never modeled "the farmstead's plots" as a station, only the
built conversion stations it explicitly lists, so extending the gate to
farming/logging/mining/crafting/combat wasn't this batch's call to make
without the spreadsheet saying so.

**Foraging only works where `LOCATIONS[...].forage` names a pool.**
`forage.js`'s `canForageHere()` reads the current location instead of a
hardcoded zone; everywhere without a pool assigned yet (every location but
Aerendell, for now) greys the forage bar out ("Nothing to forage here")
and its tap becomes a no-op. The hired villager is the one deliberate
exception: they keep foraging from Aerendell's own pool
(`VILLAGER_HOME_POOL`) no matter where the player currently is, since they
didn't come along on the trip -- they're still back at the Township
working. The player's own tap still only lands wherever they actually are,
which in practice means "tap along with the villager" only ever applies
at Aerendell today, exactly like before this batch, since that's the only
place with a pool to combine into.

**The Market is per-location now, not Aerendell's alone.** `market.js`'s
old hardcoded `ZONE` constant is `zone()`, reading `state.currentLocation`
fresh on every call. A location's `type` decides what shows at all:
landmark/wilderness gets "There's no market here"; a town gets the
existing closed-overnight behavior with its own name in the notice; a city
is open 24/7 and additionally gets a **Bank** tab. `ZONE_DEMAND` still
only has real numbers for Aerendell -- `demandFor()` falls back to neutral
(1x) demand on every other zone rather than crashing on the missing entry,
same "first-pass, not a balanced economy" numbers every zone's content
already carries. `state.market.stock` stays one shared table across every
location for now rather than one per zone -- a simplification worth
revisiting once a second location actually has priced goods of its own to
diverge on.

**Banking is one shared `state.bank`, not one per city** -- exactly what
"items in the bank can be accessed from any other city" (the original ask)
means, since there's nothing to key per-city in the first place. The Bank
tab (only shown at a `type: "city"` location) lists what's already banked
(tap to withdraw) above what's currently carried across bag and storage
(tap to deposit), each opening the same quantity-slider sheet the
Sell/Buy flow uses, just with no price attached -- moving a stack between
two piles isn't a sale.

**Arriving refreshes everything gated on location, not just the Map
screen.** `main.js`'s tick loop already special-cased "a trip resolved
this tick" for the Map's own canvas; it now also re-runs `drawMenu()`,
`drawBuildPrompts()`, and `refreshForage()`, plus `buildMarket()` if the
Market screen happens to be open -- so walking into Aerendell mid-tick
while sitting on the Home screen shows the newly-available stations
immediately, not just after the next screen change.

Verified live: traveling from Aerendell to Forest Road hides every built
station's hub card and every remaining build prompt, and greys out
foraging; traveling back restores all of it. A Sticks stack deposited at
Thal-Barak's Bank shows up immediately at Riverhold's. Aerendell (a town)
shows Sell/Purchase only, no Bank tab, and still respects its overnight
closed hours; Thal-Barak and Riverhold (cities) are open with all three
tabs regardless of the clock; Stilltide Pass (wilderness) shows "There's
no market here." A trip resolving while idle on the Home screen -- no
reload, no screen change -- updated the forage bar the instant it landed.

This closes out the four-batch world-foundation plan (night/market-hours
data, the Map screen, travel, and now per-location gating). What's left is
squarely the location spreadsheet's job: real `stations`/`forage` lists
for Thal-Barak/Stilltide Pass/Duun-Vael Bridge/Riverhold, their own
`ZONE_DEMAND`/pricing, and whatever locks the spreadsheet actually wants
on the roads leading to them.

## Fishing: three tools, three different mechanics

A new hub screen, gated by location the same way a built station is
(`LOCATIONS[...].fishing`, mirroring `.forage` exactly) -- only Aerendell
has a pool assigned so far. The design choice this whole feature hangs
on: Rod, Net, and Trap aren't three tiers of one fishing action, they're
three *different* interactions, each deliberately reusing a mechanic this
game already had rather than inventing a fourth:

- **Rod** -- a real reflex minigame (`src/fishing.js`'s `castRod()`/
  `resolveBite()`). Cast, wait a random delay, a "BITE! Tap now!" window
  flashes gold for `FISH_BITE_WINDOW_MS` (750ms), tap it in time or the
  fish gets away. Deadline-based like everything else in this game --
  `biteAt`/`expiresAt` are real timestamps, not a countdown, so
  backgrounding the tab mid-cast just means the window may have already
  closed by the time it's looked at again. The only tool that can land a
  `rare` or `nightOnly` fish, and the only one bait affects -- skill and
  prep both matter here, which is what justifies it being the one tool
  worth paying attention to.
- **Net** -- a tap-swing, identical shape to Mining's dig or Foraging's
  swing: `FISH_NET_CLICKS_PER_SWING` taps, no bite-timing at all. Common
  fish only, but two rolled per completed swing -- bulk over precision.
- **Trap** -- a deadline timer, identical shape to a cooking Campfire
  item: set it (`FISH_TRAP_MS`, 10 minutes), walk away -- even leave the
  location, even close the tab -- and it resolves and banks itself the
  instant it's ready, no tap required, wherever the player happens to be.
  The pool it rolls against is captured at set-time (`state.fishing.trap.
  poolId`), not read fresh at resolution, so a trap left out still
  resolves against the water it was actually set at even if the player
  has since traveled elsewhere. Common fish only, lowest value -- the
  price of zero attention.

**Bait is Rod-only, on purpose.** `BAITS` (Worm Bait, Shiny Lure) reweight
specific fish for the Rod's roll, consumed one per cast; Net and Trap
don't take bait at all, which is what makes bait worth crafting in the
first place -- it's the one thing that rewards choosing the tool that
takes actual attention.

**Rare and night-only fish only ever come from the Rod.** Each
`FISH_POOLS` entry can carry `rare: true` and/or `nightOnly: true`;
`rollFish()`'s `full` flag (true for Rod, false for Net/Trap) is what
filters those out for the bulk tools, and `nightOnly` additionally checks
`isNight()` (the same day/night window Combat and crops already read) --
excluded by day regardless of which tool asks. Weights don't need to sum
to 1: `rollFish()` sums whatever's left after filtering and rolls against
that total, so excluding `nightOnly` entries by day doesn't silently bias
the rest of the odds the way assuming a fixed sum would.

**The Rod/Net/Trap toggle sits at the bottom of the screen**, in thumb
reach, rather than up top under the XP bar -- the same bottom-pinned
layout Inventory's own Equipment/Bag/Storage switch already uses.
`#screen-fishing` needed the same `height: 100dvh; overflow: hidden;`
treatment `#screen-inventory` has for it to work: `.inv-toggle`'s
`margin-top: auto` only pins to the bottom against a fixed-height flex
column, and a new `.fish-pages` wrapper (flex:1, min-height:0,
overflow-y:auto) is what soaks up the remaining space above it, so the
toggle doesn't just get pushed to the bottom of an ever-growing page.

**The Fishing Rod finally fills a slot that's been sitting reserved.**
`EQUIP_SLOTS` has had a real "Fishing Rod" tool slot on the Equipment
layout since before Fishing existed, with nothing to put in it -- same
"real spot, nothing behind it yet" treatment Furnace's hub card got. Net
and Trap are deliberately *not* equipment -- they're bag items the
Fishing screen checks for directly, since they're actions you pick per
visit, not something you wear.

Verified live: a full Rod cycle (cast → wait → gold bite flash → tapped
in time → "Caught a River Trout!" → item and XP both granted); a Net
sweep completing at 6 taps and granting two fish at once; a Trap set,
fast-forwarded, and resolving into the bag on its own while sitting idle
on the Home screen -- no tap, no Fishing screen even open; the Fishing
hub card appearing at Aerendell and disappearing at Forest Road; and all
five new Craft Bench recipes (Fishing Rod, Net, Trap, Worm Bait, Shiny
Lure) crafting correctly, cost text auto-populated the same way every
other recipe's already is, and automatically picking up per-item crafting
mastery with no extra wiring needed.

Deliberately simple for this pass: the Rod's cast/bite state and the
Net's swing progress aren't persisted (a mid-cast/mid-swing reset on
reload is an acceptable simplification for something this short-lived) --
only the Trap's deadline and the selected bait are saved. There's also no
"reel" phase after a successful bite -- one well-timed tap is the whole
catch. Both are easy follow-ups if the Rod ever feels too thin on its own.

## Fixed: the forage bar sinking under the dock on mobile

`.forage-bar`'s `bottom` was `var(--dock-h)` alone -- but `--dock-h` is
only the dock's icon+label *content* height, not the real dock, which is
taller than that by its own bottom padding's `env(safe-area-inset-bottom)`
(the iOS home-indicator inset). On any phone with a non-zero safe area,
that gap sank the forage bar's bottom edge that many pixels into the
dock's actual territory -- and since the dock sits at a higher z-index,
that's the half of the bar that vanished. Fixed by adding the same
`env(safe-area-inset-bottom)` term to the forage bar's own `bottom`
(`calc(var(--dock-h) + env(safe-area-inset-bottom))`), matching where the
dock's content actually starts rather than where `--dock-h` alone would
put it. A no-op on a browser with no safe area (desktop, most Android),
which is why this didn't show up until it was actually tried on an iPhone.

## Fixed: Craft/station screens showing stale "not enough materials"

Real bug, not what it first looked like: `canAfford()`/`spendCost()`
(`costDisplay.js`) were both already correct, reading Bag+Storage fresh
every call -- crafting would have actually gone through even while the
pill displayed a "you don't have enough" some digits behind. The pill's
*displayed* cost text and afford styling, though, were only ever
recomputed when that exact recipe/station finished a cycle
(`settleCraft()`/`settleStations()`'s own per-item `refreshCraft(item)`/
`refreshStation(id)` calls) -- never on simply navigating to the screen,
and never on a tick while sitting there. `screens.js`'s `show()` had no
case for `"craft"` or the four conversion-station screens at all (every
other screen with something worth refreshing already had one), so the
display just kept showing whatever it last showed -- which could be from
boot, hours and several harvests ago, if the player hadn't visited that
exact screen since. Worse, the persistent Forage bar's hired villager
ticks unconditionally in the background regardless of which screen is
open, so the bag could drift out from under the display even while
sitting right there watching it.

Fixed in two layers, matching the shape Mining/Combat's own screens
already use: `show()` now calls `refreshCraft()`/`refreshAllStations()`
the instant either kind of screen opens, and `main.js`'s tick loop now
also redraws Craft (or whichever station screen is open) on every tick
the player is still sitting there and nothing just finished -- "just
arrived" and "still watching" both covered, not just "something you were
brewing happens to complete right now." Verified live: zeroed the bag,
confirmed Craft Bench correctly read unaffordable; left the screen,
granted materials without reloading, came back, and the pill immediately
read `20/20 Flint · 20/20 Sticks` / `affordable-ready` instead of the
stale pre-grant numbers -- same fix confirmed on the Spinning Wheel.

## A large pass: Forest rework, Craft Bench reorg, food, zones, upkeep

Seven changes landed together this pass -- listed separately since each is
independent, but verified together against one save.

**Logging drops seeds and watering entirely.** Every plot is always a
Pine; the instant one falls, the next one starts growing on its own
(`src/logging.js`'s `startGrowing()`), no cone to plant, no can to fill.
The only action left is tapping a ripe plot to chop it, same "no tool to
pick first" shape Mining's Dig pill already uses -- the whole Cone/
Watering Can tool row is gone from the screen, replaced by a plain "Axe:
\<equipped\>" status line. `state.logPlots` shrank to `{startedAt, readyAt,
chopHealth}`; a save from before this still has the old `crop`/`stage`/
`waterProgress` shape, detected by `"crop" in plot` and reset fresh rather
than half-migrated into a shape that can't represent "always growing."

**Farm and Forest plots are both expandable now, town-only.** A trailing
"+ New Farm/Pine Plot" card (`PLOT_EXPAND_COST`: 5 Stone Block + 5 Pine
Planks) sits after the real plots in both screens; each purchase doubles
the next one's cost. Gated on `LOCATIONS[currentLocation].type !==
"wilderness"` -- the card doesn't even render at Forest Road, since a
wilderness is a fixed, set amount to harvest by design, not a farmstead
that grows with the player. Plots stay one global array today (not
per-location), so the practical effect is "expandable everywhere except a
wilderness location," which is what the ask was for the two locations
that currently have any content at all.

**Every built station moved off the Home hub into Craft Bench.**
Campfire, Spinning Wheel, Sawmill, Stone Cutter, Tanning Station and
Township never get a Home card at all any more, built or not --
`hub.js`'s `visiblePlaces()` excludes every `BUILDINGS`-keyed place
outright. `src/buildings.js`'s `drawStationCards()` renders the same
cards (a dashed "Build ___" prompt, or a real card into the station's own
screen once built) into a new `#craft-stations` grid at the top of the
Craft Bench screen instead, with the existing recipe list continuing
below under a "Recipes" label. Home now reads as just the core loop --
Farm, Forest, Mining, Craft Bench, Combat (Fishing, wherever it next
belongs) -- and Craft Bench is the one stop for everything about making
things, stations included.

**Food is rebalanced, and raw meat can't be eaten at all.** Berries
(either source -- foraged or "Red Berries" from farming) heal 1 raw, 3
cooked (`Cooked Berries`, `FOODS` in data.js); Raw Poultry/Beef/Mutton
have no `FOODS` entry whatsoever, so they can't be equipped or eaten
raw -- only their new cooked forms (`Cooked Poultry`/`Cooked Beef`/
`Cooked Mutton`, all new `COOKABLES` entries) can, each healing 5.
Verified live: the Food equip picker offers Red Berries and Cooked
Berries but not Raw Poultry; cooking Raw Poultry at the Campfire produces
Cooked Poultry; eating it in Combat restored exactly 5 HP.

**Forest Road has its own forage pool** (Flax Seeds, Flax, Sticks -- no
Flint, deliberately, so it reads as a different pocket of the world, not
a copy of Aerendell's). `LOCATIONS.forestRoad.forage` points at it now
instead of `null`.

**A hired villager is tied to wherever they were actually hired**, not
the player's current location. `state.villager.homeLocation` is set once,
at hire (`township.js`), and `forage.js`'s `villagerPoolId()` reads that
instead of `state.currentLocation` -- hire in Aerendell, travel to Forest
Road, and the villager keeps working Aerendell's own pool the whole
time, never Forest Road's. Verified live: with the villager hired at
Aerendell, the player standing at Forest Road still only picked up
Aerendell-only items (Flint) from the villager's own ticks, while the
player's own taps at Forest Road correctly stayed on Forest Road's pool.

**A villager now needs upkeep, or they stop working.** Every
`VILLAGE_UPKEEP_MS` (24h), the village draws `VILLAGE_UPKEEP_FOOD` (30)
food units and `VILLAGE_UPKEEP_HEAT` (15) heat units from whatever's been
donated (`state.village.food`/`heat`) -- food units come straight off
`FOODS[item].heal` (1 HP healed = 1 unit, not a second number to keep in
sync), heat off a new `VILLAGE_HEAT_VALUE` map (Sticks/Pine Logs = 1,
Coal/Charcoal = 3). Falling short on either freezes `nextUpkeepAt` in the
past and sets `state.village.starved` -- the villager's own auto-forage
tick checks that flag and simply doesn't advance while it's true (the
player's own taps are unaffected). Township's new "Village Upkeep" card
shows the current stockpile and countdown, with a Donate Food/Donate Heat
button each opening a plain quantity-slider sheet (no pricing -- it's not
a sale) over whatever's eligible in the bag/storage. Verified live: a
40-Berries donation read as 40 food units; letting upkeep fire drew it
down to 10 correctly; forcing a shortfall set `starved` and froze the
villager's tick; topping the stockpile back up cleared it and caught the
missed cycle up in the same tick.

**Fishing (and, once it's real, the Furnace) don't belong at Aerendell or
Forest Road.** `LOCATIONS.aerendell.fishing` is `null` now instead of
`"aerendell"` -- `FISH_POOLS.aerendell`'s data is left in place, just
unreferenced, so whichever location does end up with fishing can point
straight at it without rebuilding anything. No location has a fish pool
at the moment, so the Fishing hub card doesn't show up anywhere until one
does -- expected, not a regression, given the ask.

## Fixed: the "+ New Plot" card shaking forever on a failed buy

`shakeExpand()` (both `field.js` and `logging.js`) added the "shake"
class on a denied purchase but never removed it, unlike every other
shake in this game (`hub.js`'s card shake, `forage.js`'s pill shake) --
those get away with the same omission because nothing else keeps
touching that element afterward. The expand card is the first shake
target whose own screen redraws it on *every tick* while open
(`drawExpandCard()`, added for the same "don't go stale" reasoning as the
Craft Bench fix two batches back) -- and a DOM mutation on an element
mid-CSS-animation (its `replaceChildren()` every 200ms) can restart a
still-present animation before it ever finishes, in some browsers. Fixed
by clearing "shake" on a 340ms timeout, same cleanup pattern `flash()`/
`flashLog()` already use elsewhere for exactly this reason. Verified
live: class list showed `shake` immediately after a denied buy, and was
gone again after the timeout despite `drawExpandCard()` still ticking
every 200ms underneath it.

## Pickaxes: risk is now the only thing that changes between tiers

Wooden/Flint/Stone Pickaxe used to differ in `clicksPerSwing` and
`depthPerSwing` too; now all three share `clicksPerSwing: 12,
depthPerSwing: 5, maxDepth: 100` and differ only in `riskPerSwing` --
20%/10%/5% respectively. Progression through Tier 1 is purely "safer,"
not "faster or deeper."

## A second station pass: Armor Bench, and a forage cleanup

**Pine Cones dropped out of Aerendell's forage pool.** Nothing plants a
cone any more (Logging's trees regrow on their own), so there's nothing
left to forage one for -- the freed 0.10 weight went to Red Berries
Seeds (0.10 → 0.20), Sticks/Flint unchanged at 0.40/0.40. The item itself
is untouched everywhere else (still sellable/buyable) -- worth knowing
it's effectively decorative inventory now, nothing consumes it, if that
ever needs a second look.

**A new build-gated station, same shape as Sawmill/Stone Cutter.** Armor
Bench (`BUILDINGS.armorBench`, 9 Basalt Block + 12 Pine Planks to build)
adds three `STATIONS` recipes on one screen -- Highland Cloak (4 Cloth),
Highland Chest (6 Cloth), Highland Legs (6 Cloth) -- all under a new
Tailoring skill (`tailoringXp`), the same "one skill drives every recipe
on this screen" shape Stone Cutter's Stone Block/Basalt Block pair
already has. Each sells for 25 Shards and grants 1 defense
(`ARMORS`), for 3 total if all three are worn -- Highland Cloak fills the
Helm slot, Chest and Legs fill their own matching slots, all three
reserved on the Equipment layout with nothing in them until now.

**Armor's defense now stacks across all three body slots, not just
Chest.** `combat.js`'s `armorStats()` took no argument before (it only
ever read `state.equipment.chest`) -- Helm and Legs armor existed in the
data model and even said so in this file's own comments ("Helm and Legs
would work the same way if/when armor exists for them"), but nothing
actually read those slots in combat. `armorStats(slot)` now reads
whichever slot it's asked about, and `totalDefense()`/`recoveryMs()` sum/
multiply across Helm, Chest and Legs the same way defense already summed
with a shield's. Padded Vest and Stone Plate (Chest-only) are unaffected
-- Helm and Legs simply contributed 0 defense and a neutral 1x recovery
before there was anything to equip there. Verified live: with all three
Highland pieces equipped (1 defense each, +1 base = 4 total), a Grey
Wolf's 8-14 raw attack roll landed as 4 and 7 damage taken -- exactly
`roll - 4` both times.

## Mining's depth-0 tier rebalanced: gems are actually rare now

`MINE_MATERIALS`' weights at the surface (and every gem below it) --
Stone 100, Basalt 100 → 50, Coal 100 → 25, Amethyst/Emerald/Diamond 15 →
5 each. Ore was never touched. Each material used to be roughly as common
as the next; now every step down is a real drop-off, and a gem is a
clear rare find rather than a near-coinflip against Basalt at the depths
where they used to overlap. Verified live: a 200-swing sample at depth 0
came back roughly 6:2.5:1 Stone:Basalt:Coal, in line with the new 4:2:1
target weights for a sample this size.

## Combat's scrolling log is pulled, not deleted

The `#combat-log` element is gone from the fight screen (2026-08-30) --
it was cluttering the view more than it earned its place, sitting between
the action buttons and the result panel on every single fight. Nothing in
`src/combat.js` changed: `log()` still records every attack/defend/eat/
flee into `combatLog`, and `drawLog()` still runs after each one -- it
already guarded on `el("combat-log")` coming back null before this
(`if (!wrap) return;`), so removing the element was the entire change,
verified live by starting and winning a fight with no console errors and
the log simply absent. Reintroducing it later is a markup change, not a
logic one -- put a `#combat-log` element somewhere (not necessarily back
in the same spot) and it starts filling in again on its own.

## Seven recipes pulled from Craft Bench, and a real bug that hid behind it

Padded Vest, Stone Plate, Fishing Rod, Net, Trap, Worm Bait and Shiny
Lure are gone from Aerendell's Craft Bench -- same non-destructive
removal the combat log just got: their `RECIPES`/`ARMORS`/`EQUIPMENT`/
`BAITS` entries in data.js are all untouched, so anyone who already owns
one keeps using it exactly as before, and reintroducing any of them
later (here, a different station, a different location's own bench) is a
markup change, not a data one.

This one surfaced a real bug that the combat log's removal hadn't:
`craft.js`'s `refreshCraft()` ran `pillFor(item).classList.toggle(...)`
for *every* `RECIPES` key with no null check, and it's called
unconditionally at boot -- pulling a pill while its recipe stays real
data would have crashed the game on every single load, not just failed
quietly. `shakePill()` and `pills.js`'s `setPillFill()`/`popCount()` had
the same gap. All four now guard on the pill actually existing before
touching it, the same `if (!pill) return;` shape `drawStationXp()` already
used elsewhere for exactly this "the data's real, the markup might not
be" situation. Verified live: a fresh boot with the pills removed raised
no console errors, a normal recipe (Flint Axe) still crafted correctly,
and -- the sharper edge case -- a save with Padded Vest already mid-craft
from before the removal finished and banked normally on the next boot
despite its pill being gone.

## Zone-gated enemies, and a ranged drop that doesn't lie about itself

The Road Goblin (Forest Road only, 2026-08-30) is the first enemy that
doesn't show up everywhere: `ENEMIES[key]` gained an optional `zone`
field, and `combat.js`'s `buildCombatIdle()` (now exported, since
`screens.js` needs to rebuild the list on every visit to Combat, not
just at boot) filters the idle enemy list down to
`!zone || zone === state.currentLocation` before drawing it. `main.js`'s
tick loop calls the same rebuild the instant a trip actually lands
(`if (arrived && combatVisible) buildCombatIdle();`), so leaving with the
list open and arriving somewhere the Road Goblin does (or doesn't) belong
updates it without needing to leave and reopen Combat. A location with no
zone-gated enemies (everywhere else, for now) behaves exactly as before.

Road Goblin also drops a *range* -- 1-3 Scrap Metal, alongside a flat 1
Bones -- which the old `drops` shape (a single fixed number per item)
couldn't express. `ENEMIES[key].drops` now accepts either a number or a
`[min, max]` pair, resolved by a small `rollDropQty()` helper in
combat.js. The more important half of this change is *where* that roll
happens: `endFight()` rolls once, grants the result, and stashes it as
`state.combat.lastDrops` -- the result panel reads that stashed value
instead of re-deriving drop text from `enemy.drops` the way it used to,
which would have shown a second, different random roll next to whatever
actually landed in the bag. Verified live: forced a win with `enemyHP`
set to 1, and the result panel's "+1 Bones, +1 Scrap Metal" matched the
bag's actual contents and `lastDrops` exactly, not just approximately.
Scrap Metal itself was a forward-referenced item name already sitting
unused in a `PICKAXES` comment from an earlier session ("needs a
material this game can't produce yet") -- the Road Goblin is simply the
first thing that produces it.

## Foraging becomes single-tap-and-timer, like Crafting

Foraging's old swing system (tap FORAGE_CLICKS_PER_SWING times, last tap
resolves) is gone (2026-08-31), replaced with the exact same shape Crafting
already uses: one tap starts a `state.forage = { startedAt, readyAt, poolId }`,
a flat `FORAGE_MS` (3s at base speed) later it resolves on its own in the
tick loop, no further taps needed. A tap while one's already running is a
silent no-op, same as tapping an already-running Craft pill. The pool is
locked in at the moment the gather *starts* (`currentPoolId()`, read once),
not when it resolves, so wandering off mid-gather still pays out from
wherever it began.

The hired villager now works the same way, just automated: every
`VILLAGER_TICK_MS` (30s at base speed, up from the old swing system's
2.5s-per-tap) it literally taps the same pill on its own -- calls the same
`startForage()` the player's own tap does, at the villager's own home
location's pool, and is just as much a no-op if a gather (the player's or
the villager's own from a moment ago) is already in flight. There's only
one gather slot total now, not a separate one per actor -- the villager and
the player share it, same as before, just through the single-timer shape
instead of a shared swing counter. `fastHands` still applies fresh to every
scheduled tick, unchanged.

## The Scythe is gone; harvesting is one instant tap

Farming's third tool is gone entirely (2026-08-31) -- only Seeds and the
Watering Can remain. A ripe plot now pays out the instant it's tapped, no
tool held at all: `touchPlot()` checks for `status === "ripe"` before the
tool gate, not after, so it works whether or not Seeds or the Can happens
to be selected at the time. There was never a second tier of Scythe to
lose (`"Wooden Scythe"` was it), so this is a full removal, not the
non-destructive markup-only kind Combat's log and the seven Craft Bench
recipes got -- `HARVEST_MS`, the `scythe` equip slot, and every `"Wooden
Scythe"` data entry (`TINTS`/`CATEGORIES`/`BASE_VALUE`/starting bag) are
gone from `src/data.js`, not just hidden. A save from before this still
carries a real `Wooden Scythe` in an old bag or equipped in the now-gone
`scythe` slot -- the equip slot is simply dropped on load (`EQUIP_SLOTS`
no longer lists it), and a bag copy sits inert with a grey fallback tint,
same as any other item this game doesn't otherwise know about. A plot mid-
cut from before this change (a real `reapReadyAt` set) has that field
dropped on load too -- the crop itself is untouched, still ripe, one tap
away the normal way.

## Two small Farm fixes: the empty tool square, and a faster can

Two quick ones (2026-08-31), same session as the Scythe's removal above.
The Farm's tool row (`.tools`) was still a 3-column grid left over from
Seeds/Water/Scythe -- once Scythe's button was pulled, that third column
just sat there empty. Dropped to `repeat(2, 1fr)` so Seeds and the
Watering Can split the row evenly. Separately, `CAN_REFILL_MS` (how long
an empty can takes to refill once tapped) went from 5s to 3s -- a flat
constant, no per-tier scaling to touch since there's still only one
Watering Can.

## Foraging gets its own mastery, separate from the Foraging skill

Foraging now has a second, independent level track (2026-08-31) -- not
the general Foraging skill XP bar (`state.foragingXp`, shown in the
Journal, unchanged), but a per-action mastery exactly like a crafted
item's own (see itemLevels.js): a badge and a bottom-edge bar right on
the Forage pill itself, one that speeds up gathering the more it's used.
`state.forageLevel = { level, clicks }` counts every *completed* gather
(player-tapped or villager-ticked, same as itemLevels.js counting every
unit produced regardless of which station made it) toward the next level.

Unlike itemLevels.js's one flat number repeated forever,
`FORAGE_LEVEL_THRESHOLDS` in data.js is an explicit climbing table -- 10,
25, 50, 100, then order-of-magnitude jumps up to 100,000 -- so the ten
levels actually mean something further apart as they go, rather than
staying equally easy forever. The table's last entry is the practical
level cap; there's no eleventh threshold to climb past it. Each level
doubles gather speed (`FORAGE_LEVEL_SPEED_MULT` compounds the same way
`ITEM_LEVEL_SPEED_MULT` does), read fresh the moment a gather starts
(`forage.js`'s `startForage()`), so a level gained mid-gather only speeds
up the *next* one. `FORAGE_MS` itself moved from 3s to 10s as part of
this -- the new "base" speed before mastery starts compounding it down,
not the endpoint any more.

Verified live: forced `forageLevel` to 9/10 progress and confirmed the
10th completed gather landed exactly on level 1, the very next gather's
timer measured exactly 5000ms (half of the 10s base), and the bottom-edge
bar rendered 10/25 as a 40% fill mid-level.

## A finished pill staying lit forever

Foraging, the conversion stations (Spinning Wheel/Sawmill/Stone Cutter/
Tanning Station/Armor Bench), and the Campfire all had the same bug
(2026-08-31): each one's `.pill-fill` gets set to 100% the moment a cycle
*starts* (so it can visibly tween up to full over the run), but only
Crafting's own `settleCraft()` ever pointed it back at 0% once that cycle
*finished* -- everywhere else, a completed pill just sat fully colored
forever afterward, since nothing else in the whole game ever touches that
element again until the next cycle starts and resets it manually. The fix
is the exact one-line pattern craft.js already had: `setPillFill(id, 0, 0)`
right where each system clears its own finished job (`forage.js`'s
`resolveForage()`, `stations.js`'s `settleStations()`, `campfire.js`'s
`settleCampfire()`). Verified live for all three: forced each system's own
deadline into the past, let it settle, and confirmed `.pill-fill`'s width
read back `"0%"` immediately after, not the `"100%"` it used to stay stuck at.

## Mining gets a big art banner, and the Dig button moves to thumb reach

Reworked the Mining screen's layout (2026-08-31) around a reference the
user shared: a large illustration up top, with the actual controls
compacted below it and pinned to the bottom of the screen rather than
scattered down the middle. Two real additions make this possible:

- **`MINE_ZONES` (data.js)** -- a purely-cosmetic depth grouping, one
  entry per MINE_MATERIALS threshold (0/100/400/1000/2500), each named
  after whichever material newly unlocks there (Stone, Copper, Iron,
  Gold, Diamond). `mining.js`'s new `currentZone(depth)` picks the
  deepest one the player's actually reached; what's *actually* rollable
  at a given depth is still MINE_MATERIALS' own cumulative weighted pool,
  completely untouched by this -- the zone only decides which
  illustration and label to show.
- **`#mine-art`** -- a new banner element, same `useSprite()`/fallback
  pattern every other sprite slot in this game uses, at
  `assets/sprites/mining/zones/<slug>.png` (stone/copper/iron/gold/
  diamond). Drop in real art per zone with no code changes, same as
  everywhere else; falls back to a plain vector pickaxe icon until then.
  Unlike every other sprite here, it renders with `object-fit: cover`
  (see sprites.js's own header comment on the one exception) since it's
  meant to read as a scene filling its frame, not an icon staying whole.
  A gradient label along the image's own bottom edge names the zone
  ("Copper", etc.), directly on the artwork rather than in a separate row.

The rest of the screen (XP bar, depth/pickaxe status, carried chips) sits
below the banner unchanged in logic, just tighter; the Dig pill and
Surface & Bank button are now wrapped in `.mine-actions` with `margin-top:
auto` -- the exact trick Farm's own `.tools` row already uses to sit at
the bottom of a screen -- so the button that needs repeat tapping is in
easy thumb reach under the art rather than sharing space with it. The
banner's own height (`max-height: 30vh` on `.mine-art`) was tuned by
measuring actual overflow at both a laptop-sized preview and a real
375×812 phone viewport until the whole screen fit in one view with zero
scroll on both -- a taller banner looked better in isolation but pushed
Surface & Bank (and the Dig pill's hint) below the fold, defeating the
"easier to hit" goal outright.

Verified live: the zone label reads "Stone" at depth 0, "Iron" exactly at
depth 400 and stays "Stone" at 399, and "Diamond" at the 2500m cap; at
both a desktop-preview height and an emulated 375×812 phone, the screen's
full content height matched the viewport height exactly (no scrollbar),
with Surface & Bank fully visible above the persistent Forage bar and dock.

## Digging becomes single-tap-and-timer too, and the Mining screen's layout tightens further

Mining's old swing system (tap `clicksPerSwing` times, last tap resolves)
is gone (2026-08-31), replaced with the exact same single-tap-and-timer
shape Crafting and Foraging already use: one tap starts
`state.mineSwing = {startedAt, readyAt, risk, depthPerSwing, maxDepth}`,
a flat `ms` (now per pickaxe tier -- Wooden 6s, Flint 5s, Stone 4s, with
the not-yet-craftable tiers continuing the same decreasing trend as a
placeholder) later it resolves on its own in the tick loop: either a
cave-in or a successful dig, exactly the payout the old last-click of a
multi-tap swing used to produce. A tap while a swing's already running is
a silent no-op, same as every other pill. `PICKAXES`' old `clicksPerSwing`
is gone from data.js along with it.

The swing's own risk/depth/maxDepth are locked into `state.mineSwing`
itself at the moment it starts (same "recipe locked at start" rule
craft.js's startCraft() follows) rather than re-read from whatever's
currently equipped when it resolves -- without this, swapping to a
better pickaxe in the seconds before a swing finishes would retroactively
cheat that swing's own numbers. Verified live: all three real tiers
measured exactly 6000/5000/4000ms, a tap mid-swing was a confirmed no-op,
and a forced resolution correctly advanced depth by +5m and reset the
fill bar to 0%.

The Mining screen's layout tightened further in the same pass: the XP bar
now sits *above* the art banner (previously below it), and the depth/
pickaxe status row moved *into* the art banner's own bottom overlay,
stacked above the zone name rather than as a separate row underneath --
freeing up enough vertical room that everything still fits one screen
with zero scroll. The Surface & Bank button's icon changed from a plain
up-arrow to a ladder (🪜), and it now shows the same post-surface cooldown
that already blocks the next Dig (`state.mineCooldownUntil`) as a filling
yellow bar of its own -- "time to surface" -- reusing `.pill-fill`'s sweep
animation, just retinted gold instead of green. It's driven by a small
`cooldownFillActive` flag in `refreshMining()` rather than a new state
field: the first `refreshMining()` call to see an active cooldown starts
the bar (whether that cooldown just began or is being resumed after a
reload -- either way it's the first sighting, so "time remaining" is
correct for both), and the first call to see it end resets the bar to 0%,
the same "reset on finish" rule every other pill's fill already follows.

## Can't surface mid-swing

Surface & Bank is now blocked while a dig swing is actually in flight
(2026-08-31) -- the character's still got the pickaxe mid-swing, not free
to climb. `bankAndSurface()` checks `state.mineSwing` first and bails with
a shake + "Can't surface mid-swing." hint, same "already busy" guard
`startDig()` itself uses against a second swing starting. The button also
reads as unaffordable and its own preview text says why while swinging,
same as it already did for "nothing carried yet." The swing itself isn't
touched -- it still resolves (or caves in) entirely on its own; this only
blocks the *separate* Surface tap from landing in the same window. Verified
live: tapping Surface mid-swing left `state.carried` and the bag both
completely untouched, with the hint and button state both reflecting it.

## The closed-market notice was floating, not placed

Market's "closed for the night"/"no market here" notices sat with a big
dead gap both above *and* below them (2026-08-31) -- `#market-list`
(`.craft-list`) already used `margin-bottom: auto` to pin a normal, fully
populated list up against the tabs above it (the leftover space soaks up
below a real list of many pills, which is what you want), but a list
holding nothing but one centered `.inv-empty` notice has almost no content
height of its own, so it just sat wherever that left it -- reading as
randomly floating rather than placed on purpose.

Fixed with a `.craft-list.notice-only` modifier (`margin-top: auto`
instead of `margin-bottom`) that `buildMarket()` toggles on exactly the
two single-notice cases (closed-for-the-night, no-market-here-at-all) and
off everywhere else (open Sell/Purchase lists, the Bank tab's own empty
states, which sit under real section headings and were never the
problem) -- same bottom-pinning trick Farm's `.tools` row, Mining's
`.mine-actions`, and now this all share. Verified live: forced the market
open (patching `Date.prototype.getHours` just for the check, since
`isTownMarketOpen()` reads the real device clock) and confirmed the
populated 10-row list renders with no `notice-only` class and its original
top-anchored layout, unchanged from before this fix.

## Zone leveling and the loot wheel, ported from Leatheron

Ported from the Leatheron prototype's own zone-XP/loot-wheel system
(2026-08-31) -- adapted per the user's own spec rather than copied
wholesale. Leatheron's version fed a zone a flat amount per action,
independent of whatever skill XP that action also granted; here, a fixed
**share of the skill XP itself** feeds the zone the player is currently
standing in instead:

- **`gainSkillXp(field, amount)`** (state.js) is the one place every skill
  (Mining, Foraging, Farming, Logging, Fishing, the five conversion
  stations, Combat) now routes its own XP gain through, same "one choke
  point" reasoning `gainItem()` already follows for bag items. It does
  `state[field] += amount`, then feeds `ZONE_XP_SHARE` (25%, first-pass)
  of that same amount into `state.zones[state.currentLocation]` via
  `gainZoneXp()`, and returns how many zone levels that just crossed (0
  most of the time) so the caller knows whether to spin the wheel.
- **`state.zones[id] = { level, xp }`**, one entry per `LOCATIONS` key.
  Flat `ZONE_XP_PER_LEVEL` (20) per level -- not skills.js's own
  exponential curve -- so zone levels come at a steady clip rather than
  slowing down, since leveling one is what triggers a spin. A `while`, not
  an `if`, in `gainZoneXp()`: one big XP grant can cross more than one
  zone level in a single call.
- **The wheel** (`src/zoneWheel.js`, `#zonewheel` in index.html) -- a
  centered modal, not a bottom sheet, same "this is a real moment" framing
  the source project gave it. Every level gained queues one spin (so a
  multi-level grant shows each in turn rather than the later ones
  stomping the earlier ones); the reward is rolled and granted to the bag
  the instant a spin *starts*, same "reels are theatre, not a
  randomizer" rule the source project used -- the three reels always
  agree on the same winning icon (every spin here is a guaranteed win,
  unlike the source's weighted table with its own "nothing" slice) and
  animate to a stop via a plain JS-driven CSS `transform` transition
  (450/625/800ms, staggered so they don't stop in sync), no keyframes or
  library. Auto-closes ~3.3s after opening; tapping anywhere on it closes
  it early, guarded by a 350ms grace window so the very tap that leveled
  the zone doesn't also register as the dismiss.
- **`ZONE_LOOT_POOL`** (data.js) -- per the user's own ask ("just have the
  player gain either stone, pine logs, or flint"), a flat, equally-weighted
  3-item table (5-15 of whichever one gets picked). Structured so a future
  pass can widen it into a real weighted table (rarer finds at lower odds)
  without touching the wheel's own animation code at all.

Verified live: a forage gather's 8 XP correctly fed the zone exactly 2 XP
(25%); forcing the zone to 18/20 XP and gathering once more crossed it to
level 2, opened the wheel with the correct zone name/level text, and
granted the exact reward amount to the bag before the reel animation even
finished. A forced 4-level-in-one-grant case correctly queued and played
through multiple spins in sequence rather than skipping any.

## Adding to it

A new crop, tree, or recipe is one entry in `src/data.js`; a new zone's
forage pool is one entry in `FORAGE_POOLS`. A new destination on the hub is
one line in `PLACES`, also in `src/data.js`. A new screen needs a
`#screen-<id>` element in `index.html`, its id added to `SCREEN_IDS`, and
its own `src/<name>.js` following the shape of `field.js` or `logging.js`
(plot-and-timer screens) or `craft.js` (tap-and-fill-pill screens) —
whichever is the closer match. Scope every selector to that screen's id,
per the note above.
