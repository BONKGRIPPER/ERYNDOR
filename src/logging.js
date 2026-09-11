// ================================================================= logging
//
// Reworked 2026-08-30: no cones, no watering can -- every plot always has
// a tree growing, and the instant one falls it starts growing again on
// its own. Growth is still a real deadline (readyAt), so it keeps
// progressing while the game is closed, exactly like every other timer
// in this game.
//
// Which species (2026-09-04) is no longer hardcoded to Pine -- it's
// whatever LOCATIONS[...].tree says the player's *current* location grows
// (treeForCurrentLocation() below), same "read the location's own pool"
// idea forage.js's currentPoolId()/fishing.js's own location check already
// use. Locked into the plot itself the moment a fresh growth cycle starts
// (plot.tree, set by startGrowing()) -- same "recipe locked at start" rule
// every other timer in this game follows, so a plot that started growing
// Pine at Aerendell doesn't silently become a Birch plot just because the
// player wandered off to Forest Road before it was ready. treeFor(plot)
// is the one place that actually reads a *specific* plot's own species
// back out; nothing else should read TREES[...] directly for a plot.
//
// Chopping is single-tap-and-timer now (2026-08-31), same shape as every
// other pill (Crafting, Foraging, Mining's own Dig): one tap on a ripe
// tree starts a swing (plot.chopSwing = {startedAt, readyAt}), no more
// tapping needed, and it resolves on its own -- felling the tree -- the
// moment that deadline passes (see settleLogging() below). Swing length
// is the ripe tree's own `health` divided by the equipped axe's `damage`
// (both in data.js), locked in at the moment the swing starts so
// re-equipping mid-chop only speeds up the *next* tree. A tree's own
// `minAxeDamage` (Birch's is 3, Stone Axe or better) blocks starting a
// swing at all with anything weaker -- see touchLogPlot() below. The axe
// itself is equipped straight from this screen now too (drawAxeSlot()/
// openAxePicker() below) -- the exact same state.equipment.axe field
// Inventory's own Equipment page reads and writes, so a change made here
// is already a change everywhere else, no separate "logging axe" to keep
// in sync.

import {
  TREES, AXES, PLOT_EXPAND_COST, PLOT_COUNT, LOCATIONS, EQUIP_SLOTS, EQUIPMENT, TINTS,
} from "./data.js";
import { state, save, gainItem, gainSkillXp } from "./state.js";
import { openZoneWheel } from "./zoneWheel.js";
import { GROWTH_PER_LEVEL, levelFromXp, levelProgress } from "./skills.js";
import { growthMultiplier } from "./time.js";
import { canAffordBag, buildBagCostNodes, spendBagCost } from "./costDisplay.js";
import { useSprite, slug } from "./sprites.js";
import { el } from "./dom.js";
import { show } from "./screens.js";
import { openSheet, closeSheet } from "./sheet.js";
import { drawBag, updateSkillsNote } from "./hub.js";

// Whichever TREES key the player's *current* location grows -- read live,
// only ever called at the exact moment a fresh growth cycle actually
// starts (startGrowing() below), so it's a snapshot from then on, not a
// live value the rest of this file re-reads. Falls back to "pine" for
// every location that doesn't set its own `tree` (LOCATIONS in data.js).
function treeForCurrentLocation() {
  const loc = LOCATIONS[state.currentLocation];
  return (loc && loc.tree) || "pine";
}

// A specific plot's own locked-in species -- what every other function in
// this file should read instead of a bare TREES.pine. Falls back to pine
// for a plot with no `tree` at all (a save from before this existed --
// see state.js's own load() migration).
function treeFor(plot) {
  return TREES[plot.tree] || TREES.pine;
}

// The Logging banner is location-driven rather than tree-driven: a later
// zone can grow the same species while still having its own environment art.
// Adding `loggingZone` to a LOCATIONS entry and dropping the matching slugged
// PNG into assets/sprites/logging/zones/ is enough to extend the system.
function drawLogArt() {
  const loc = LOCATIONS[state.currentLocation];
  const zoneName = (loc && loc.loggingZone) || ((loc && loc.name) || "Unknown") + " Forest";
  const tree = TREES[treeForCurrentLocation()] || TREES.pine;
  useSprite(el("log-art"), "logging/zones/" + slug(zoneName));
  el("log-art-label").textContent = zoneName;
  el("log-art-tree").textContent = tree.name + " grove";
}

const TREE_SVG =
  '<svg viewBox="0 0 40 40" aria-hidden="true">' +
  '<path class="stem" d="M20 34 V19" />' +
  '<circle class="leaf" cx="14" cy="17" r="7" />' +
  '<circle class="leaf" cx="26" cy="17" r="7" />' +
  '<circle class="leaf" cx="20" cy="10" r="7" />' +
  '<circle class="fruit" cx="20" cy="16" r="3.4" fill="currentColor" />' +
  "</svg>";

export function drawLogXp() {
  const p = levelProgress(state.loggingXp);
  el("log-xp-level").textContent = "Logging — Level " + p.level;
  el("log-xp-count").textContent = p.into + " / " + p.need;
  el("log-xp-fill").style.width = (Math.min(1, p.into / p.need) * 100).toFixed(1) + "%";
}

export function buildLogPlots() {
  const wrap = el("log-plots");
  wrap.replaceChildren();

  state.logPlots.forEach(function (plot, i) {
    const node = document.createElement("button");
    node.className = "pill plot";
    node.dataset.i = String(i);
    node.innerHTML =
      '<div class="pill-fill"></div>' +
      '<span class="pill-icon"><img class="sprite-img" alt="" draggable="false">' +
        '<span class="sprite-fallback">' + TREE_SVG + "</span></span>" +
      '<span class="pill-body">' +
        '<span class="pill-name"></span>' +
        '<span class="pill-sub"></span>' +
      "</span>";
    node.addEventListener("click", function () { touchLogPlot(i); });
    wrap.append(node);
  });
  drawExpandCard();
}

/** growing | ripe | chopping */
function logPlotStatus(plot) {
  if (plot.chopSwing) return "chopping";
  return plot.chopHealth !== null ? "ripe" : "growing";
}

// How fast a fresh growth cycle runs -- read once, at the moment it
// starts (either a fresh plot at boot, or the instant a tree falls), and
// baked into that cycle's own readyAt. Doesn't speed up or slow down
// retroactively if the player levels up or the sun sets mid-grow, same
// rule Farm's own water() follows.
function growthMs(tree) {
  const levelSpeed = 1 + levelFromXp(state.loggingXp) * GROWTH_PER_LEVEL;
  const timeSpeed = growthMultiplier(state.startedAt, "logging");
  return (tree.stageSeconds * 1000) / (levelSpeed * timeSpeed);
}

// Locks in this cycle's own species (treeForCurrentLocation()) before
// anything else reads it -- growthMs() right below needs the *new*
// species' own stageSeconds, and every other function that later reads
// this plot back (treeFor()) needs `plot.tree` already set.
function startGrowing(plot) {
  plot.tree = treeForCurrentLocation();
  plot.startedAt = Date.now();
  plot.readyAt = plot.startedAt + growthMs(treeFor(plot));
  plot.chopHealth = null;
}

// Called on arrival at a new location (main.js's travel-resolved block).
// Any plot still locked to a *different* species than the one this
// location grows is reset to a fresh growth cycle of the local tree --
// without this, arriving at Forest Road (Birch) with ripe/growing Pine
// plots from Aerendell meant felling every stale Pine before a single
// Birch started growing. Plots that already match the local species are
// left completely alone -- growth timer, ripe state, mid-chop swing and
// all -- so travelling between two Pine locations costs you nothing.
export function resetLogPlotsForLocation() {
  const local = treeForCurrentLocation();
  let changed = false;
  state.logPlots.forEach(function (plot) {
    if (plot.tree === local) return;
    plot.chopSwing = null;
    startGrowing(plot);
    changed = true;
  });
  if (changed) save();
  return changed;
}

// Rolls any finished growth timers forward, and resolves any chop swing
// whose deadline has passed -- same "a deadline, not a countdown, is what
// makes offline progress free" reasoning as Field's own settle() and every
// other timer in this game. Called every tick regardless of which screen
// is showing (see main.js), so a swing started right before the player
// wanders off to another screen still finishes and fells the tree on
// schedule -- fellTree() below already handles a `node` that isn't
// actually visible right now the same as one that is.
export function settleLogging() {
  let changed = false;
  const now = Date.now();

  state.logPlots.forEach(function (plot, i) {
    if (plot.readyAt !== null && now >= plot.readyAt) {
      plot.readyAt = null;
      plot.chopHealth = treeFor(plot).health;
      changed = true;
    }
    if (plot.chopSwing && now >= plot.chopSwing.readyAt) {
      plot.chopSwing = null;
      changed = true;
      fellTree(i, plot, el("log-plots").children[i]);
    }
  });

  if (changed) save();
}

// The payoff once a chop swing's deadline passes (settleLogging() above).
// Immediately starts the next growth cycle -- there's no empty/idle state
// for a plot to sit in any more.
function fellTree(i, plot, node) {
  // Captured before startGrowing() below overwrites plot.tree with the
  // *next* cycle's species -- this fell tree's own name/gives/xp must
  // stay whatever it actually was.
  const tree = treeFor(plot);
  const parts = [];
  Object.keys(tree.gives).forEach(function (item) {
    gainItem(item, tree.gives[item]);
    parts.push("+" + tree.gives[item] + " " + item);
  });

  startGrowing(plot);

  if (node) {
    node.querySelector(".pill-sub").textContent = parts.join(" · ");
    node.classList.add("result");
    flashLog(node, "reaping", 400);
    setTimeout(function () {
      node.classList.remove("result");
      save();
      drawLogging();
      drawBag();
    }, 1400);
  } else {
    save();
    drawLogging();
    drawBag();
  }

  logHint("Chopped " + tree.name + ". A new one's already taking root.");
  gainLogXp(tree.xp);
}

export function drawLogging() {
  const now = Date.now();

  drawLogArt();

  state.logPlots.forEach(function (plot, i) {
    const node = el("log-plots").children[i];
    if (!node) return;
    // Same guard Field's drawField() uses -- a just-felled plot is showing
    // its "+3 Pine Logs" flash (see fellTree() above) and skips the normal
    // redraw until that's done.
    if (node.classList.contains("result")) return;
    const status = logPlotStatus(plot);

    node.classList.toggle("growing", status === "growing");
    node.classList.toggle("ripe", status === "ripe");
    node.classList.toggle("actionable", status === "ripe");
    // Reuses the same .pill.active styling every other running timer in
    // this game already gets (green sweep tint, see style.css) -- no new
    // CSS needed for "a chop is in progress."
    node.classList.toggle("active", status === "chopping");

    // Growth progress before it's ripe, chop-swing progress once one's
    // actually running, empty while just sitting ripe and untapped --
    // same element, same width, just a different meaning per status.
    const fill = node.querySelector(".pill-fill");
    if (status === "growing") {
      const span = plot.readyAt - plot.startedAt;
      const p = span > 0 ? Math.min(1, (now - plot.startedAt) / span) : 1;
      fill.style.width = (p * 100).toFixed(1) + "%";
    } else if (status === "chopping") {
      const span = plot.chopSwing.readyAt - plot.chopSwing.startedAt;
      const p = span > 0 ? Math.min(1, (now - plot.chopSwing.startedAt) / span) : 1;
      fill.style.width = (p * 100).toFixed(1) + "%";
    } else {
      fill.style.width = "0%";
    }

    const tree = treeFor(plot);
    const icon = node.querySelector(".pill-icon");
    const frame = status === "growing" ? 0 : 1;
    if (!useSprite(icon, "trees/" + plot.tree + "/" + frame)) {
      icon.querySelector(".fruit").setAttribute("fill", tree.tint);
    }

    node.querySelector(".pill-name").textContent = tree.name;
    node.querySelector(".pill-sub").textContent =
      status === "growing" ? "Growing…" :
      status === "chopping" ? "Chopping…" :
      "Ripe — tap to chop";
  });

  drawAxeSlot();
  drawExpandCard();
}

// ---------------------------------------------------------------- axe slot
//
// Equip/change the Axe straight from this screen -- same system as
// Inventory's own Equipment page (see inventory.js's buildEquipRow()/
// openEquipPicker(), which this mirrors), writing the exact same
// state.equipment.axe field. There's no separate "logging axe" to keep in
// sync: a change made here already is the player's equipped tool
// everywhere else the moment it happens.

function itemGet(container, name) { return container[name] || 0; }

function itemAdd(container, name, amount) {
  const next = itemGet(container, name) + amount;
  if (next <= 0) delete container[name];
  else container[name] = next;
}

const AXE_SLOT = EQUIP_SLOTS.find(function (s) { return s.id === "axe"; });

// Equipping over an already-filled slot swaps in one tap -- the old axe
// goes back to the bag first, same rule inventory.js's own equip() follows.
function equipAxe(name) {
  const previous = state.equipment.axe;
  if (previous) itemAdd(state.bag, previous, 1);
  itemAdd(state.bag, name, -1);
  state.equipment.axe = name;
  save();
  drawLogging();
}

function unequipAxe() {
  const name = state.equipment.axe;
  if (!name) return;
  itemAdd(state.bag, name, 1);
  state.equipment.axe = null;
  save();
  drawLogging();
}

// Whatever's equipped in the Axe slot -- falls back to a bare hand's worth
// of damage (Wooden Axe's own 1) if somehow nothing is equipped, same
// "fall back rather than block the action" rule mining.js's pickaxe() and
// combat.js's weaponStats() both already use.
function axeDamage() {
  const item = state.equipment.axe;
  return (AXES[item] && AXES[item].damage) || AXES["Wooden Axe"].damage;
}

// The same real equip pill used by Inventory, compacted by .art-tool-corner
// because its host now lives inside the forest banner like Mining's Pickaxe.
// There is no .pill-fill because an equip slot has no progress of its own.
// Built once and updated in place on every later call (this runs every
// tick via drawLogging()) -- rebuilding the whole pill each time, as this
// used to, tore out and recreated the <img> every ~200ms, which defeated
// useSprite()'s own same-key caching (a fresh <img> has no dataset.key to
// compare against) and reloaded/repainted the icon constantly, reading as
// a visible stutter on a perfectly static icon. Bug fixed 2026-09-11.
function drawAxeSlot() {
  const wrap = el("log-axe-slot");
  if (!wrap) return;
  const equipped = state.equipment.axe;

  let btn = wrap.querySelector(".equip-row");
  if (!btn) {
    btn = document.createElement("button");
    btn.className = "pill equip-row";

    const icon = document.createElement("span");
    icon.className = "pill-icon";
    const img = document.createElement("img");
    img.className = "sprite-img";
    img.alt = "";
    img.draggable = false;
    const fallback = document.createElement("span");
    fallback.className = "sprite-fallback";
    icon.append(img, fallback);

    const body = document.createElement("span");
    body.className = "pill-body";
    const name = document.createElement("span");
    name.className = "pill-name";
    name.textContent = "Axe";
    const sub = document.createElement("span");
    sub.className = "pill-sub";
    body.append(name, sub);

    btn.append(icon, body);
    btn.addEventListener("click", openAxePicker);
    wrap.replaceChildren(btn);
  }

  const icon = btn.querySelector(".pill-icon");
  const fallback = icon.querySelector(".sprite-fallback");
  if (equipped) {
    fallback.style.background = TINTS[equipped] || "#9a8f7d";
    useSprite(icon, "items/" + slug(equipped));
  } else {
    fallback.style.background = "";
    icon.classList.remove("using-sprite");
  }
  // The damage stat right alongside the name -- what's actually driving
  // the chop-time formula (TREE.health / damage, see touchLogPlot()
  // above) rather than a bare item name the player has to already know
  // the numbers behind.
  btn.querySelector(".pill-sub").textContent = equipped
    ? equipped + " · " + AXES[equipped].damage + " dmg"
    : "Empty — tap to equip";
}

// Same picker shape inventory.js's openEquipPicker() uses -- an "Unequip"
// row (if something's equipped) followed by every owned axe not already
// equipped, using the shared sheet rather than a picker this screen owns.
function openAxePicker() {
  const body = el("sheet-body");
  body.replaceChildren();

  const equipped = state.equipment.axe;
  if (equipped) {
    const unequipRow = document.createElement("button");
    unequipRow.className = "seed-row unequip-row";
    const dot = document.createElement("span");
    dot.className = "dot";
    dot.style.background = "transparent";
    dot.style.border = "1px solid var(--dim)";
    const text = document.createElement("div");
    text.className = "seed-name";
    text.textContent = "Unequip " + equipped;
    unequipRow.append(dot, text);
    unequipRow.addEventListener("click", function () {
      closeSheet();
      unequipAxe();
    });
    body.append(unequipRow);
  }

  const options = Object.keys(EQUIPMENT).filter(function (name) {
    return EQUIPMENT[name] === "axe" && name !== equipped && itemGet(state.bag, name) > 0;
  });

  if (options.length === 0 && !equipped) {
    const empty = document.createElement("div");
    empty.className = "inv-empty";
    empty.textContent = "Nothing to equip here yet.";
    body.append(empty);
  }

  options.forEach(function (name) {
    const row = document.createElement("button");
    row.className = "seed-row";
    const dot = document.createElement("span");
    dot.className = "dot";
    dot.style.background = TINTS[name] || "#9a8f7d";
    const text = document.createElement("div");
    text.className = "seed-name";
    text.textContent = name;
    const count = document.createElement("span");
    count.className = "seed-count";
    count.textContent = itemGet(state.bag, name) + " owned";
    row.append(dot, text, count);
    row.addEventListener("click", function () {
      closeSheet();
      equipAxe(name);
    });
    body.append(row);
  });

  openSheet(AXE_SLOT ? "Equip " + AXE_SLOT.name.toLowerCase() : "Equip axe");
}

// -------------------------------------------------------------- plot actions

function flashLog(node, cls, ms) {
  node.classList.remove(cls);
  void node.offsetWidth;
  node.classList.add(cls);
  setTimeout(function () { node.classList.remove(cls); }, ms);
}

// A tap on a growing plot is a hint + shake; a tap on one already mid-chop
// is a silent no-op (same "already running" rule every other pill's own
// tap-while-active follows); a tap on a ripe plot with too weak an axe is
// a hint + shake too, same "equip the right tier or nothing happens" rule
// mining.js's own maxDepth wall uses; only a ripe, idle plot with a strong
// enough axe actually starts the swing. Swing length is locked in right
// here -- the tree's own health divided by whatever's equipped *right
// now*, in seconds -- so re-equipping mid-chop only speeds up the next
// tree, not this one already falling.
function touchLogPlot(i) {
  const plot = state.logPlots[i];
  const node = el("log-plots").children[i];
  const status = logPlotStatus(plot);

  if (status === "growing") {
    logHint("Still growing.");
    flashLog(node, "nope", 340);
    return;
  }
  if (status === "chopping") return;

  const tree = treeFor(plot);
  if (tree.minAxeDamage && axeDamage() < tree.minAxeDamage) {
    logHint("Requires a stronger axe to fell a " + tree.name + ".");
    flashLog(node, "nope", 340);
    return;
  }

  const ms = (tree.health / axeDamage()) * 1000;
  plot.chopSwing = { startedAt: Date.now(), readyAt: Date.now() + ms };
  flashLog(node, "chop-hit", 220);
  save();
  drawLogging();
}

function gainLogXp(amount) {
  const before = levelFromXp(state.loggingXp);
  const zoneLevels = gainSkillXp("loggingXp", amount);
  const after = levelFromXp(state.loggingXp);
  if (zoneLevels) openZoneWheel(state.currentLocation, zoneLevels);
  drawLogXp();
  updateSkillsNote();
  if (after > before) {
    logHint("Logging level " + after + "!");
    const bar = document.querySelector("#screen-logging .xp-bar");
    bar.classList.remove("levelup");
    void bar.offsetWidth;
    bar.classList.add("levelup");
  }
}

// ---------------------------------------------------------------------- hint

let logHintTimer = 0;
function logHint(text) {
  el("log-hint").textContent = text;
  clearTimeout(logHintTimer);
  logHintTimer = setTimeout(function () {
    el("log-hint").textContent = "Tap a grown tree to chop it.";
  }, 2200);
}

// ------------------------------------------------------------- plot expand

// Doubles for every plot bought past the starting PLOT_COUNT -- the 1st
// purchased plot costs PLOT_EXPAND_COST outright, the 2nd costs double
// that, and so on. Wilderness locations don't get this at all (see
// drawExpandCard() below) -- what's there is a fixed, set amount to
// harvest, by design, not a farmstead that grows with the player.
function expandCost() {
  const bought = state.logPlots.length - PLOT_COUNT;
  const mult = Math.pow(2, Math.max(0, bought));
  const cost = {};
  Object.keys(PLOT_EXPAND_COST).forEach(function (item) {
    cost[item] = PLOT_EXPAND_COST[item] * mult;
  });
  return cost;
}

function canExpandHere() {
  const loc = LOCATIONS[state.currentLocation];
  return !!loc && loc.type !== "wilderness";
}

function buyPlot() {
  if (!canExpandHere()) return;
  const cost = expandCost();
  if (!canAffordBag(cost)) {
    shakeExpand();
    return;
  }
  spendBagCost(cost);
  const plot = { startedAt: 0, readyAt: null, chopHealth: null, chopSwing: null };
  startGrowing(plot);
  state.logPlots.push(plot);
  save();
  drawBag();
  buildLogPlots();
  drawLogging();
}

function shakeExpand() {
  const card = el("log-expand-card");
  if (!card) return;
  card.classList.remove("shake");
  void card.offsetWidth;
  card.classList.add("shake");
  // See field.js's own shakeExpand() for why this explicit removal
  // matters here specifically -- drawExpandCard() never touches "shake"
  // itself but does run every tick this screen is open, which without
  // this cleanup left "shake" applied forever after the first failed tap.
  setTimeout(function () { card.classList.remove("shake"); }, 340);
}

// A trailing card after the real plots, same "add another" idea as a
// build prompt -- hidden outright in a wilderness rather than shown
// disabled, since there's nothing there to ever expand.
function drawExpandCard() {
  let card = el("log-expand-card");
  if (!canExpandHere()) {
    if (card) card.remove();
    return;
  }
  const wrap = el("log-plots");
  if (!card) {
    card = document.createElement("button");
    card.id = "log-expand-card";
    card.className = "pill plot-expand";
    card.addEventListener("click", buyPlot);
  }
  wrap.append(card);   // keep it last even as buildLogPlots() rebuilds around it
  const cost = expandCost();
  const affordable = canAffordBag(cost);
  card.classList.toggle("unaffordable", !affordable);
  card.classList.toggle("affordable-ready", affordable);
  card.replaceChildren();
  const label = document.createElement("span");
  label.className = "plot-expand-label";
  label.textContent = "+ New Pine Plot";
  const cost_ = document.createElement("span");
  cost_.className = "plot-expand-cost";
  cost_.replaceChildren.apply(cost_, buildBagCostNodes(cost));
  card.append(label, cost_);
}

el("back-logging").addEventListener("click", function () { show("explore"); updateSkillsNote(); });
