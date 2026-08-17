# Leatheron — idle deckbuilder prototype

## Run it
Open `index.html` in a browser. Saving needs a real page load, so if you use
VS Code install the **Live Server** extension and hit "Go Live" rather than
double-clicking (some browsers block localStorage on `file://`).

## File map

    index.html          markup shell only — no logic
    css/style.css       all styling (pixel UI primitives at the top)
    js/data.js          ALL CONTENT: resources, cards, items, enemies,
                        stations, skills, tuning numbers
    js/core.js          event bus, state, save/load, derived stats
    js/engine.js        deck cycling, timing window, combat, offline sim
    js/sprites.js       pixel emblems (8x8 grids -> SVG)
    js/systems/cards.js one handler per card KIND
    js/systems/craft.js building, recipes, prayer, pins, inventory
    js/systems/food.js  eating, fuel, cooking
    js/systems/township.js villager hiring + offline production
    js/systems/consumables.js item selection + spending (arrows)
    js/systems/processing.js campfire + furnace as timed machines
    js/systems/world.js  regions, zones and travel gating
    js/ui.js            rendering only — reads state, never mutates
    js/main.js          wires events to UI, boots the game

## How to add things

**A new resource** — one line in `data.js` → `RESOURCES`. Inventory, weight,
pinning, offline loot, and costs all pick it up automatically.

**A new skill** — one entry in `data.js` → `SKILLS`. The Skills tab, xp bars,
level-ups, and perk display are generated from it.

**A new card that behaves like an existing one** — add to `CARDS` with an
existing `kind`. Done.

**A new card that behaves differently** — add `kind:'yourkind'` in `CARDS`,
then in a systems file:

```js
G.registerCardKind('yourkind', {
  face(card, key) { return { detail: 'shown on the card', blocked: false }; },
  resolve(ctx)    { /* mutate state; set ctx.verdict = {cls,title,sub} */ },
  offline(key, c, give) { give('resourceId', 1); }   // optional
});
```

The engine never changes. `ctx` gives you `{key, card, hit, tapped, encumbered}`.

**A new station or recipe** — add to `STATIONS`. Recipe flags:
`repeatable`, `gives:{res:n}`, `equips:'itemId'`, `prayer:n`.
If the recipe id is in `ITEM_CARDS`, crafting it adds that card to the deck.

**A whole new system** (farming, travel, banking) — make
`js/systems/yourthing.js`, subscribe to events, add a `<script>` tag before
`ui.js`. Events available: `card:resolved`, `enemy:killed`, `enemy:spawned`,
`player:hurt`, `player:downed`, `skill:levelup`, `craft`, `deck:changed`,
`state:changed`, `pins:changed`, `saved`.

## Rules to keep it clean
- Never touch `S.weight` directly — use `G.addRes` / `G.removeRes`.
- Never render from a system — emit an event, let `ui.js` react.
- Never read the DOM outside `ui.js`.
- New save fields: add to the `PERSIST` list in `core.js`. Loading
  auto-migrates missing skills and resources, so old saves survive.


## Idle model (changed)

Card play and combat are **real-time only**. Nothing fights for you while
away, so you can never be killed offline — which is what makes food and
healing safe to add.

The only offline progress is **villagers**. Hire them on the Craft tab under
Township; each produces one resource per minute, banked up to
`TUNE.villagerCapH` hours.

**Add a villager**
```js
G.VILLAGERS.baker = { name:'Baker', zone:'leatheron', produces:'bread',
                      cost:{ wheat:20 }, sprite:'seedling' };
```

**Add a food**  `G.FOODS.apple = { heal: 2 }` — raw items add `needsCooking:true`.
**Add a fuel**  `G.FUELS.coal = { value: 5 }`
**Add a cook recipe** `G.COOKABLE.fish = { into:'cookedFish', fuel:1, xp:10 }`

The Bag tab grows Eat buttons and the fire pit modal grows fuel/cook rows
automatically from those tables.


## Consumables

Cards can spend items. A card asks for a GROUP; it gets whichever item the
player locked in on the Bag tab, or the strongest one they own.

```js
G.CONSUMABLES.fireArrow = { group:'ammo', dmg:3 };
G.RESOURCES.fireArrow   = { name:'Fire Arrow', wt:1, tint:'ember' };
```
That is all — the Bag list, bow damage, and the card face update themselves.

## The hotbar

The three header slots auto-fill with your strongest **healing** items,
sorted by heal amount. Tap to eat. Nothing to configure; it reads `G.FOODS`.

## Stations with custom screens

A station with `opens:'cook'` or `opens:'smelt'` shows an Open button instead
of a recipe list, and its modal lives in `ui.js`. To add another, set
`opens:'yourthing'`, add a branch in `renderCraft`, and write the modal.


## World and travel

Zones live in `G.ZONES` (data.js), grouped by `G.REGIONS`. The Map tab renders
them automatically. Gate a zone with `needs`:

```js
G.ZONES.myPlace = {
  name:'Somewhere', kind:'Wilds', region:'leth-eiren', order:4,
  blurb:'...', needs:{ kills:40, item:'bronzeBar', skill:{ mining:8 } }
};
```
Supported gates: `kills`, `item` (must have held one), `skill`.

## Discovery

`S.discovered[key]` is set the first time you ever hold a resource. Stations
and recipes stay hidden until every ingredient in their cost has been seen, so
the Craft tab starts nearly empty and opens up as you gather. Nothing to
configure — it derives from recipe costs.

## Weights

Weights are fractional. Use `G.fmtWt(n)` for display and never format them
by hand. Rough scale: ore and stone 2, wood 1, hide 1, meat 0.5, sticks 0.2,
bone and charcoal 0.25, herbs/seeds/gems/arrows 0.1, feathers 0.05.


## Machines (campfire, furnace)

Both run on `systems/processing.js`. Items are loaded INTO the machine (they
leave your pack), then it produces one item every `msPer` in real time —
across screens, and while the app is closed. Output buffers inside the
machine if your pack is full and deposits when there is room.

```js
G.MACHINES.kiln = { station:'kiln', inputs:1, kind:'cook',
                    skill:'crafting', msPer:4000, name:'Kiln' };
```
`inputs` sets how many top boxes appear. `kind` picks the recipe table
(`cook` uses `G.COOKABLE`, `smelt` uses `G.SMELT`). The modal builds itself.

## Card play: hand of three

Each turn deals `TUNE.handSize` cards. Tap one to play it, which opens the
reflex gauge; tap anywhere in the band to double the effect. The two you pass
on are discarded, so a 30-card deck lasts 10 turns per cycle.
`G.phase` moves `choose -> window -> resolving -> choose`.

Card faces are deliberately plain: emblem, name, then one `+N Resource` line
per output, driven by the `yields` array a card kind's `face()` returns.


## Tests

    node test/smoke.js     boot, every page, every station, every card
    node test/balance.js   timing band, xp curve, save migration, yields

`test/harness.js` stubs the DOM but returns **null** for ids that are not in
index.html, the same as a browser — so a stale `$('id')` fails the test rather
than your hand. smoke.js also statically checks for missing ids and duplicate
function definitions. Run both after any edit.

## Timing band

The clean-tap band is rolled fresh for every card: width between
`TUNE.bandMin` and `TUNE.bandMax`, positioned anywhere between
`TUNE.bandEarliest` and `TUNE.bandLatest`. There is no fixed spot to memorise.

## Card yields

A card kind's `face()` returns a `yields` array and the UI renders it as
emblem chips on the card front and in the Deck tab:

```js
yields: [{ key:'stone', qty:1, crit:2 }, { key:'diamond', qty:1, chance:'5%' }]
```
`crit` shows the doubled value, `chance` shows a drop rate.


## Deck size

`G.STARTING_DECK` sets the opening deck (12 stone / 12 stick / 6 forage = 30).
Each crafted tool adds `TUNE.cardsPerCraft` copies of its card. Basic gathering
is flat — stone and stick always give 1 — while tools scale with skill level.


## Pinned recipes

Tap **Pin** on any recipe or station build in the Craft tab and it appears in
the bar above the tabs, showing live `have/need` per ingredient and turning
gold when affordable. Tap a pin to clear it. `TUNE.pinSlots` sets how many.

The deck strip shows only how many cards remain — never what is coming next.


## Zones have their own decks

Each zone owns a deck, draw position and pasture; they are stashed in
`S.zones[zoneId]` on travel and restored when you return. **Inventory,
skills, buildings and gear are shared across every zone** — so the tools you
built in Aerendell still work on the road.

Give a zone a deck in `G.ZONES`:
```js
forestRoad: { ..., deck: { stone:8, stick:8, forage:8, oreVein:6 } }
```

## Zone gating

Add `zones: ['forestRoad']` to a station, a recipe, or an enemy and it only
appears there. Used to keep the Stone Pick, Furnace and Smithing Table off the
city map, and goblins off the city streets.

## Drop tables

Entries are either a plain key (always one) or an object for ranged loot:
```js
dropTable: [
  { key:'bone' },                                   // always 1
  { key:'gold', min:1, max:5, chance:0.6 },         // 60% of kills, 1-5
]
```


## Settlement

Homes are built per zone and speed up that zone's villagers:

    interval = villagerPeriodMs * homeSpeed ^ homes   (min villagerMinMs)

At the defaults that is 60s -> 49 -> 40 -> 33 -> 27 -> 22s across five homes.
Each zone tracks its own count in `S.homes[zoneId]`.

```js
G.HOUSING.lodge = { zone:'kharBarak', name:'Lodge',
                    cost:{ bronzeBar:4, tannedLeather:6 },
                    note:'where the materials come from' };
```

**Materials come from a later zone on purpose.** Cottages in Aerendell need
bronze nails, forged only at the Road's smithy. Campsites on the Road need
tanned leather, which needs tanning salt from Khar-Barak. Upgrading an early
settlement always means going back out — and since every zone keeps its own
deck, that means re-engaging a deck you had left behind.

Villager output **banks** when your pack is full: unclaimed time rewinds the
villager's clock instead of being burned, so nothing is lost while you are
over-encumbered.


## Zone mining

`G.ZONE_MINING[zoneId]` overrides the default pick table and inherits
anything it does not set:

```js
forestRoad: { ores:['stone'], bonus:[{key:'coal',chance:0.5}], gemChance:0.02 }
kharBarak:  { ores:['tin','copper'], bonus:[{key:'coal',chance:0.25}], gemChance:0.05 }
```
`ores` is an even split; `bonus` rolls independently on top.

## The metal chain

    Forest Road   goblins -> scrap metal -> Scrap Pick (bench)
                  pick -> stone + 50% coal
    Khar-Barak    pick -> tin / copper (+ coal, gems)
                  furnace (gate only) -> bronze bars, burning coal or charcoal

The Scrap Pick is built on the Road but only pays out ore at the Gate, so the
second zone equips you for the third. Coal from the Road feeds the Gate's
furnace.


## Background work bar

Anything cooking or smelting shows above the tabs with a live progress bar,
what it is producing, and how many runs remain. Tapping a row jumps straight
to that station. It hides itself when nothing is running.

`G.runningMachines()` returns the data; `G.machineProgress(id)` is the 0..1
fraction toward the next item. The bar is rebuilt only when the set of running
machines changes — otherwise it just moves the fill, so it can tick at 250ms
without churning the DOM.


## Visual style

Light, quiet interface: system font stack, soft neutrals, rounded corners,
one accent colour. `G.ZONE_THEME[zoneId]` sets that accent per zone, applied
as CSS variables so the whole UI shifts when you travel.

Icons live in `js/sprites.js` as small flat SVGs on a 24x24 grid — two tones,
rounded ends, no pixel art. `G.sprite(name, size)` is unchanged, so nothing
else had to move. Unknown keys fall through an ALIAS map (cooked meat borrows
the raw icon, gems share one, and so on).

## The bone altar

Burial is a timed machine like the campfire: load bones, press start, one
every `TUNE.buryMs`. Prayer speeds up its own work by
`prayerSpeedPerLv` (0.5%) per level, so level 100 runs at 150% of base rate
(5.0s -> 3.3s). All skills cap at `TUNE.maxSkillLevel`.

## Crafted cards

New cards are inserted into the **discard pile** via `G.addCardToDiscard`,
not shuffled in immediately — so they first appear after the current deck
runs out. The draw pointer moves with them to stay aligned.
