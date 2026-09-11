# Road logistics implementation batches

Status (2026-09-10): **Batches 9.6–9.8 built and unit-tested; 9.9–9.11 not
started.** Builds on Batch 9.5 Home/World, Bag/Warehouse, return-home, and the
shipment framework. This document specifies the staged rollout; additional
routes and expanded networks remain future work.

**As-built vs. as-planned.** The plan text below still names a few modules
that were consolidated during implementation. Actual layout for 9.6–9.8:

- `shipments.js` — merchant-freight simulation (`quoteShipment`,
  `dispatchShipment`, `settleShipments`).
- `freightUI.js` — the "Send goods home" order sheet and the Freight status
  panel; also renders the cart/crew summaries from `caravanUI.js`.
- `caravans.js` — **all** outpost, cart and logging-crew simulation
  (`buildOutpost`, `buyCart`, `transferOutpost`, `setCartOrder`, `pauseCart`,
  `disbandCart`, `unlockLoggingCrew`, `assignLoggingCrew`, `upgradeLogistics`,
  `settleCaravan`). No separate `outposts.js` or `logistics.js`.
- `caravanUI.js` — the "Forest Road outpost" sheet (compact status + action
  list), its "Deposit / withdraw" and "Route settings" sub-sheets, and the
  cart/crew text summaries the Explore panel reads.
- `labor.js` — shared housing capacity + food/heat upkeep, so an outpost
  crew and a Township worker draw from and pay into the same pool.
- No dedicated logistics *screen*. The UI is a `<details class="freight-panel">`
  on the Explore tab plus the outpost sheet reached from Explore's "Outpost
  & cart" button at Forest Road — matching the "small mobile sheets" rule.

**9.6–9.8 are all playtested (2026-09-10).** The first logistics milestone
is complete: merchant freight, the outpost + cart route, and the passive
logging crew have each been driven end to end on a phone viewport, their
order sheets rebuilt for touch, and their economies checked against the
design targets. 9.9 (demand management) is the next build layer.

**9.8 playtested + bottleneck surfaced (2026-09-10):** ran the crew loop
end to end -- assign the crew, let the stockpile fill over ~10 sim-hours
while the starter cart lagged, buy the one cart upgrade (75 Shards) with
the cart parked empty, and watch the backlog drain back to zero. Crew
~40 logs/hr vs starter-cart ~29 logs/hr ceiling (~58 after the upgrade)
is exactly the intended mismatch, so `OUTPOST_CAPACITY` / `CART_CAPACITY`
/ `LOGGING_CREW_INTERVALS` were left alone. The one gap the playtest
found: the bottleneck only showed in the Explore Freight panel, not in
the outpost sheet itself where you'd act on it. Refactored the shared
read into `crewStatus()` (rate, cart ceiling, current reason, and a
remedy line) and the outpost sheet's Logging Crew section now shows it
directly -- "The cart can't keep up (29 vs 40 logs/hr) — upgrade it." --
right above the Upgrades section. Every paused state ("Stockpile full",
"Township is out of food or heat", "Add Birch Logs to the route", "Build
a cart") reads as a plain cause + remedy. `STATIONS.birchPlanks` (3 Birch
Logs + 1 Pine Plank -> 1 Birch Plank at the Sawmill) confirmed as the
home sink.

**9.7 playtested + sheet rebuild (2026-09-10):** ran the outpost loop end
to end on a 375px viewport -- build outpost + cart, deposit goods,
configure a route (cargo, reserve, departure rule, max wait), resume, and
watch three cart cycles plus a one-jump offline settle (online === offline).
Verified the reserve floor stops extraction exactly at the kept amount,
the "when full" rule, crew unlock/assign, and a full-page-reload of an
active cart + assigned crew. The `openOutpost()` sheet was a single
scrolling stack of buttons, a raw `<select>`+`<input type=number>` deposit
form, a `<details>` cargo checklist over every TINTS key, and two more
raw number fields; it's now a compact status + action list with the two
form-heavy jobs split into their own small sub-sheets -- "Deposit /
withdraw" (a tap-to-select item list + a −/qty/+/Max stepper) and "Route
settings" (cargo toggle-chips, a reserve stepper, a When-ready / When-full
segmented control, and max-wait preset chips). The sheet also preserves
scroll position across its own self-refresh. Economy left as-is: the
crew's 40 logs/hr against the starter cart's ~29 logs/hr ceiling (~58
after the first cart upgrade) already matches the intended bottleneck.

**9.6 playtested + first tune (2026-09-10):** ran the merchant loop end to
end on a 375px viewport at Thal-Barak -- dispatch, Bag/Shard debit,
persisted ETA across a reload, offline delivery into the Warehouse,
duplicate-dispatch block, and the Explore Freight panel. The order sheet
was rebuilt from raw number fields into a themed −/qty/+/Max stepper list
with a live "stacks · ETA · fee" summary, and the fee went from a flat
1 Shard/stack to `stacks × 3 × ceil(roadMinutes / 15)` -- 6 Shards/stack
from Thal-Barak (20 min), 12 from Riverhold (55 min) -- so it's a real
cost against early Shard income without being punishing, and the outpost
caravan has something to undercut. Numbers still first-pass.

## Product rules

- Bag remains the player's field cargo. Manual gathering rewards enter it.
- Warehouse remains Aerendell's production stock. Workshops stay at Home.
- Outposts provide fixed, local stockpiles. The player must visit to manually
  deposit or withdraw goods; caravans handle remote transfers.
- Logistics management is accessible from World anywhere. Viewing stock and
  changing route orders does not grant remote access to the goods themselves.
- Active gathering and combat remain valuable. Passive extraction is a later,
  explicitly unlocked outpost feature, separate from the player's actions.
- Freight runs independently of player travel. Congestion initially affects
  freight only, preserving predictable player travel times.
- Full destinations retain cargo on the wagon or merchant shipment. Full
  outposts stop extraction. No paid production output may disappear on overflow.
- Show causes and remedies: “Warehouse full,” “Waiting for logs,” or “Road at
  capacity.” Color supplements text; it never carries the only explanation.
- Use the existing road graph and small mobile sheets. Defer freeform road
  construction, random shipment destruction, and automated combat.

## Batch 9.6 — Reliable transfers and merchant freight

Implemented 2026-09-10, playtested + first-tuned the same day. Open a
town/city market away from Aerendell and choose “Send goods home.” The
order sheet is a −/qty/+/Max stepper list, one row per Bag item, with a
live summary line (selected stacks · ETA · fee) and one Send button.
Explore → Freight shows the current shipment and most recent delivery.
Fee is `stacks × FREIGHT_FEE_PER_STACK (3) × ceil(roadMinutes /
FREIGHT_FEE_DISTANCE_STEP (15))` — 6 Shards/stack from Thal-Barak, 12
from Riverhold; still a first-pass number. Only one shipment may be
active, including one awaiting Warehouse room.

Paid Craft, Campfire, and station jobs retain completed outputs when full;
Beehive outputs also wait. Manual transfers recheck capacity at confirmation
and require Home. Existing shipment cargo and deadlines survive migration.

Verification: `node tests/freight.test.mjs` covers the distance-scaled fee
across stack boundaries and locations, invalid quantities, duplicate
dispatch, eligibility, save/reload, partial unloading, retained production
output, legacy freight, and online/offline delivery equivalence. Hands-on
playtest on a 375px viewport at Thal-Barak: dispatch debited the Bag and
Shards correctly, the shipment and its countdown survived a full page
reload, offline settlement delivered exactly the sent goods into the
Warehouse, a second dispatch was blocked with a clear message, and the
Explore Freight panel showed the in-transit line plus the last delivery
with no caravan noise (outpost not built).

Goal: make a single shipment useful and establish item ownership guarantees.

Work:

- Audit current container transfers and production completion. Fix capacity
  races, remote transfer paths, and finished outputs lost to a full Warehouse.
  Completed jobs retain their output and stop repeating until it can fit.
- Replace the current queue helper's copy-only behavior with a transactional
  dispatch operation: validate cargo, source ownership, route and fee; debit
  the Bag and Shards once; create the shipment; persist the whole state once.
- Give roads stable IDs and add a path helper returning road segments and
  duration. Preserve existing player travel and legacy shipment deadlines.
- Add “Send goods home” to eligible town/city markets, with item quantities,
  total fee, ETA, and explicit confirmation. Start with one active merchant
  shipment. Keep pricing in data; tune the proposed per-stack fee against the
  actual item stack caps and early-game Shard income before release.
- Add a Freight list under World: traveling, waiting to unload, and delivered
  summary. Retry blocked unloading when Warehouse space becomes available.
- Normalize and version saves without relocating existing Bag/Warehouse items.

Done when: a player can dispatch selected Bag goods, remain in the field, close
the game, and receive exactly those goods at home. Insufficient fees, repeated
clicks, reloads, and a full Warehouse cannot duplicate or delete cargo.

Primary files as built: `state.js`, `shipments.js` (`quoteShipment`,
`dispatchShipment`, `settleShipments`, `freightFee`), `freightUI.js` (the
stepper order sheet + Explore Freight panel), `travel.js`
(`shortestRoadPath`), `market.js` (the "Send goods home" button gate on the
Market screen, reached from Explore), `main.js` (`settleShipments` in the
tick), `data.js` (`FREIGHT_FEE_PER_STACK`, `FREIGHT_FEE_DISTANCE_STEP`,
`CARGO_UNITS`); `tests/freight.test.mjs`.

## Batch 9.7 — Outpost stockpiles and one reusable caravan

Implemented, then playtested + sheet-reworked 2026-09-10. Explore → Forest
Road → Outpost & cart. Build the outpost locally for 50 Shards, then the
cart for 100 Shards. Initial stockpile capacity is 200 cargo units; cart
capacity is 10. Logs, Stone, Iron Ore, and Copper Ore weigh 2 units each;
other items default to 1. Loading and unloading each take 10 seconds.
These constants live together in data.js and, per the playtest, already
land the intended crew-vs-cart bottleneck (see 9.8), so they're left as-is.

Manual deposits and withdrawals require the player at Forest Road. Route
orders are remotely manageable: select cargo, set a per-item source reserve,
choose ready/full departure, and (for "full") a max wait. The cart starts
paused. Orders saved during a trip apply on return. Pause finishes the
delivery and empty return; disbanding an empty parked cart gives no refund.
The Explore Freight panel shows stock, cargo, arrival stage, and delivered
rate; the outpost sheet itself is a compact status + action list with
"Deposit / withdraw" and "Route settings" as small sub-sheets.

Tests: `node tests/caravan.test.mjs` verifies three deliveries, reload, online
versus offline cart simulation, partial unloading, pause, reserve, pending
orders, local access checks, and maximum-wait departure. Existing freight tests
and all module syntax checks also pass. Hands-on mobile playtest (375px):
build both, deposit via the stepper sub-sheet, configure a full route,
three cart cycles + a one-jump offline settle matching the incremental run,
reserve floor holding extraction exactly at the kept amount, crew
unlock/assign, and a full-page reload of an active cart + assigned crew.
Offline parity tests cover the cart with fixed source/destination conditions;
chronological coordination with all existing production timers remains a later
simulation integration concern as outlined below.

Goal: prove a repeating supply route on Forest Road → Aerendell.

Work:

- Unlock construction of one Forest Road outpost after visiting the location.
  Give it a finite stockpile and local Bag deposit/withdraw controls.
- Unlock one reusable cart and assign it to the outpost–Home route. Begin with
  selected cargo, a minimum source reserve, and “depart when cargo available.”
  Add “depart when full” with an explicit maximum wait to prevent deadlock.
- Calculate wagon capacity using a dedicated cargo-unit cost per item. Display
  actual item quantities and used capacity; inventory stacks are not weight.
- Implement waiting, loading, traveling, unloading, empty return, and paused
  states. Both journey legs and handling time count toward throughput.
- Partial unload retains the remainder on the cart. Pausing stops the next
  departure; editing an order applies after the current delivery. Disbanding
  requires an empty cart at a serviced endpoint.
- Show one route card: source stock, cargo, destination, next arrival, delivered
  items/hour, and current reason for waiting.

Done when: deposited resources move home over at least three complete cart
cycles, including an offline interval. The cart returns physically for each
load and waits safely when either endpoint is blocked.

As built: outpost + cart simulation went entirely into `caravans.js` (not a
separate `outposts.js` / `logistics.js`), rendering into `caravanUI.js`
(`openOutpost` sheet, `cartSummary`), shared housing/upkeep into `labor.js`,
and the route card into the Freight panel rather than a dedicated screen.
Simulation and rendering stayed in separate files. `tests/caravan.test.mjs`.

## Batch 9.8 — Passive extraction and the first bottleneck

Implemented, then playtested 2026-09-10. Visit Forest Road with a Stone Axe
or better equipped and unlock the logging crew for 75 Shards. Assign one free housing slot through Outpost &
cart. Existing workers remain assigned to their original professions. The crew
counts toward the shared Township food/heat bill and stops while unpaid.
It produces one Birch Log every 90 seconds into local stock, without granting
player skill XP or bypassing advanced material unlocks. Full stock stops output.

Two upgrades per category are available locally. Crew intervals are 90/60/45
seconds (costs 100/200 Shards); stockpile capacities are 200/400/600 cargo units
(50/100 Shards); cart capacities are 10/20/30 units (75/150 Shards). Cart upgrades
require its empty return. Upgrade labels show the resulting rate or capacity.
These initial values target 40 logs/hour extraction versus a 29 logs/hour
starter-cart ceiling, improved to 58 with the first cart upgrade.

`crewStatus()` (caravanUI.js) is the one shared read -- crew rate, cart
ceiling, the current reason ("Gathering", "Stockpile full — extraction
paused", "Paused — Township is out of food or heat"), and a remedy line
("The cart can't keep up (29 vs 40 logs/hr) — upgrade it.", "Build a cart
to move the logs home.", …). Both the Explore Freight panel text and the
outpost sheet's Logging Crew section render it, so they tell the same
story and the fix sits right above the Upgrades section. Birch already
feeds the existing Aerendell recipe: 3 Birch Logs + 1 Pine Plank makes 1
Birch Plank at the Sawmill. No recipe changes were needed.

Extraction and cart events now settle together chronologically, including
shared upkeep checks at extraction timestamps. Long intervals retain a cursor
and resume in chunks. Full simulation interleaving with all Home production
and merchant events is still beyond this single-route batch.

Verification: loggingCrew.test.mjs passes conservation, online/offline parity,
improved delivery after upgrade, shared slots, full buffers, upkeep stops,
reload, and tool unlock checks. Earlier caravan and freight suites still pass,
as do all module syntax checks. Hands-on mobile playtest (375px): assigned
the crew, watched the stockpile climb from 0 to its ~100-Birch cap over
~10 sim-hours while the starter cart lagged (~+11 logs/hr net), parked the
cart empty and bought the cart upgrade, and confirmed the backlog then
drained back to zero (~+18 logs/hr net) with the summary flipping to "The
cart can keep up with the crew." Every paused/blocked state reads as a
plain cause + remedy in both the panel and the sheet.

Goal: create the satisfying loop of finding and fixing a supply bottleneck.

Work:

- Add an unlockable Forest Road logging crew producing the location's existing
  Birch resource into its outpost. Do not silently substitute Pine or redirect
  existing player gathering rewards.
- Define crew assignments explicitly by location. Integrate with existing
  housing/worker capacity without allowing one worker to fill two roles.
- Preserve existing player Forager behavior during migration; introduce outpost
  assignments deliberately rather than moving workers automatically.
- Add crew rate, stockpile-size, and cart-capacity upgrades. Initial balancing
  should produce a visible backlog that one attainable upgrade can resolve.
- Display extraction rate, sustainable transport capacity, and destination use
  separately. A full stockpile pauses production until room opens.
- Keep advanced materials, discoveries, and combat unlocks tied to active play.
- Verify that the chosen Birch output has a useful Aerendell recipe or sale
  sink; add the smallest missing link if necessary.

Done when: a crew fills an outpost faster than its starter cart can empty it,
the interface explains the bottleneck, and upgrading transport measurably
raises useful deliveries without moving the player's workshops.

## Batch 9.9 — Stock targets and multiple routes

Goal: coordinate supply with what Home actually needs.

Work:

- Add a second source and additional cart unlocks. Use existing valid resources
  and recipes before expanding the material catalogue.
- Add per-item Warehouse target stock, source reserves, cargo priorities, and
  route presets: “export surplus” and “maintain Home stock.”
- Subtract incoming committed cargo from destination demand so multiple carts
  do not all fill the same request. Reserve destination capacity at dispatch;
  retain safe unloading behavior if another action still changes capacity.
- Give competing routes deterministic, fair allocation of goods. Display why
  a route is waiting and avoid starving low-priority routes indefinitely.
- Let production screens explain missing inputs and link to the relevant
  request. Add automatic recipe-derived requests after manual targets work.
  Distinguish physical stock from ingredients already committed to jobs.
- Add a compact network overview with source, delivery, and consumption rates.

Done when: two routes supply a working production chain, respect reserves and
targets, and handle multiple carts targeting the same item without overbooking.

## Batch 9.10 — Road capacity and upgrades

Goal: turn shared roads into an understandable optimization problem.

Work:

- Move freight over actual path segments. Give each road a capacity measured
  in simultaneous cart units, plus deterministic queues at its endpoints.
- Count loaded and empty journeys. Use fair admission across both directions;
  a cart occupies only its current segment, avoiding multi-road lock deadlocks.
- Upgrade road speed/capacity with visible before-and-after delivery estimates.
  Existing journeys finish their segment under captured travel conditions.
- Show queue length, utilization, wait cause, and wagon markers on World.
- Keep player travel independent of freight queues. Do not add road danger
  until predictable capacity management is working and enjoyable.

Done when: two supply routes sharing a road experience a reproducible queue,
an upgrade relieves it, and offline simulation matches the same online sequence.

## Batch 9.11 — Depots, return cargo, and regional expansion

Goal: make route design matter across the larger world.

Work:

- Unlock an intermediate depot on the actual road chain. The current graph is
  linear, so do not promise alternative-path routing until a branch is added.
  Begin with Thal-Barak as a consolidation point for farther-zone goods.
- Add transfers between routes, item filters, per-item depot reserves, and
  destination requests. Prevent a shipment from satisfying its own demand or
  circulating forever between opposing requests.
- Add two-way cargo: tools or food outward, raw materials homeward. Introduce
  operating supplies gradually, with an affordable manual recovery path when
  an outpost runs out; avoid a supply chain that cannot restart itself.
- Add cart specializations and at least one meaningful road branch when the
  regional economy is ready. Compare direct versus consolidated delivery cost
  and throughput before making consolidation necessary.
- Fold regional resource advantages and market demand into Batch 10's economy
  work. All crafting remains based in Aerendell.

Done when: a depot combines two sources into homeward freight, return cargo
supports one outpost, and the player can explain why their selected routes
perform better than sending individual carts along the full chain.

## State, timing, and migration contracts

Keep `bag`, `storage`, and legacy `shipments` compatible. Add versioned logistics
state incrementally: outposts keyed by location, carts keyed by ID, route orders,
Warehouse requests, road upgrades, and a last-settled timestamp. Cargo belongs
to exactly one container: Bag, Warehouse, outpost, wagon, or merchant shipment.
Orders contain references and rules; they never contain another inventory copy.

Each journey records its path, current segment, cargo, and next event timestamp.
Settle loading, extraction, arrivals, production, and return trips chronologically
against a supplied clock. Use deterministic ordering for simultaneous events.
Never award a whole offline interval's extraction before processing the carts
that would have removed it. Process long gaps in resumable chunks; preserve the
simulation cursor if a work limit is reached rather than skipping unfinished
events. No additional offline cap is assumed by this plan.

Migration accepts old shipments, preserves their cargo and ETA, and adds empty
logistics state to old saves. Capture a source zone for active work where needed
so travel cannot reassign its resources or XP to another zone. Invalid route IDs
pause with a recoverable explanation while preserving their cargo.

## Release checks for every batch

- Verify conservation: starting goods plus valid production equals remaining
  goods plus legitimate consumption/sales. Include every in-transit container.
- Exercise full containers, partial stacks, rapid repeated actions, save/load
  at each journey stage, and route edits during transit.
- Compare a simulated offline interval to the same interval advanced online.
  Include competing carts and simultaneous arrivals once those features exist.
- Confirm old-save migration and a fresh-player path to the first unlock.
- Check a narrow mobile viewport: a route can be understood and configured
  without dragging a tiny map marker or repeatedly opening several screens.
- Tune the first loop using actual capacity and round-trip time. For example,
  10 cargo units over a 10-minute round trip is at most 60 cargo units/hour,
  before handling and waiting—not a count of items when item weights differ.

First playable milestone: Batches 9.6–9.8 — **done as of 2026-09-10**: each
built, unit-tested, and playtested end to end on a phone viewport, with
both order sheets rebuilt for touch and the economies checked against the
design targets. Demand management (9.9) is the next build layer; congestion
(9.10) and depots (9.11) follow only after 9.9 is readable and felt in play.
