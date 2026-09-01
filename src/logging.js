// ================================================================= logging
//
// Reworked 2026-08-30: no cones, no watering can, no tool to pick at all --
// every plot is always a Pine, and the instant one falls it starts growing
// again on its own. The only action left is the chop itself (tap a ripe
// plot), same "no tool-select step" shape Mining's own Dig pill already
// uses. Growth is still a real deadline (readyAt), so it keeps progressing
// while the game is closed, exactly like every other timer in this game.

import { TREES, AXES, PLOT_EXPAND_COST, PLOT_COUNT, LOCATIONS } from "./data.js";
import { state, save, gainItem, gainSkillXp } from "./state.js";
import { openZoneWheel } from "./zoneWheel.js";
import { GROWTH_PER_LEVEL, levelFromXp, levelProgress } from "./skills.js";
import { growthMultiplier } from "./time.js";
import { canAfford, buildCostNodes, spendCost } from "./costDisplay.js";
import { useSprite } from "./sprites.js";
import { el } from "./dom.js";
import { show } from "./screens.js";
import { drawBag, updateSkillsNote } from "./hub.js";

const TREE = TREES.pine;

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

/** growing | ripe */
function logPlotStatus(plot) {
  return plot.chopHealth !== null ? "ripe" : "growing";
}

// How fast a fresh growth cycle runs -- read once, at the moment it
// starts (either a fresh plot at boot, or the instant a tree falls), and
// baked into that cycle's own readyAt. Doesn't speed up or slow down
// retroactively if the player levels up or the sun sets mid-grow, same
// rule Farm's own water() follows.
function growthMs() {
  const levelSpeed = 1 + levelFromXp(state.loggingXp) * GROWTH_PER_LEVEL;
  const timeSpeed = growthMultiplier(state.startedAt, "logging");
  return (TREE.stageSeconds * 1000) / (levelSpeed * timeSpeed);
}

function startGrowing(plot) {
  plot.startedAt = Date.now();
  plot.readyAt = plot.startedAt + growthMs();
  plot.chopHealth = null;
}

// Rolls any finished growth timers forward -- the only thing left to
// settle now that chopping is instant (see chopTree()). Same "a deadline,
// not a countdown, is what makes offline growth free" reasoning as
// Field's own settle().
export function settleLogging() {
  let changed = false;
  const now = Date.now();

  state.logPlots.forEach(function (plot) {
    if (plot.readyAt !== null && now >= plot.readyAt) {
      plot.readyAt = null;
      plot.chopHealth = TREE.health;
      changed = true;
    }
  });

  if (changed) save();
}

// The payoff once the last chop lands. Immediately starts the next growth
// cycle -- there's no empty/idle state for a plot to sit in any more.
function fellTree(i, plot, node) {
  const parts = [];
  Object.keys(TREE.gives).forEach(function (item) {
    gainItem(item, TREE.gives[item]);
    parts.push("+" + TREE.gives[item] + " " + item);
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

  logHint("Chopped " + TREE.name + ". A new one's already taking root.");
  gainLogXp(TREE.xp);
}

export function drawLogging() {
  const now = Date.now();

  state.logPlots.forEach(function (plot, i) {
    const node = el("log-plots").children[i];
    if (!node) return;
    // Same guard Field's drawField() uses -- a just-felled plot is showing
    // its "+3 Pine Logs" flash (see fellTree() above) and skips the normal
    // redraw until that's done.
    if (node.classList.contains("result")) return;
    const status = logPlotStatus(plot);
    const chopHealth = status === "ripe" ? plot.chopHealth : 0;

    node.classList.toggle("growing", status === "growing");
    node.classList.toggle("ripe", status === "ripe");
    node.classList.toggle("actionable", status === "ripe");

    // Growth progress before it's ripe, chop damage dealt once it is --
    // same element, same width, just a different meaning (and color, see
    // .plot.ripe .pill-fill in style.css) per status.
    const fill = node.querySelector(".pill-fill");
    if (status === "growing") {
      const span = plot.readyAt - plot.startedAt;
      const p = span > 0 ? Math.min(1, (now - plot.startedAt) / span) : 1;
      fill.style.width = (p * 100).toFixed(1) + "%";
    } else {
      const dealt = TREE.health - chopHealth;
      fill.style.width = (dealt / TREE.health * 100).toFixed(1) + "%";
    }

    const icon = node.querySelector(".pill-icon");
    const frame = status === "ripe" ? 1 : 0;
    if (!useSprite(icon, "trees/pine/" + frame)) {
      icon.querySelector(".fruit").setAttribute("fill", TREE.tint);
    }

    node.querySelector(".pill-name").textContent = TREE.name;
    node.querySelector(".pill-sub").textContent =
      status === "growing" ? "Growing…" : chopHealth + "/" + TREE.health + " HP — tap to chop";
  });

  drawEquippedAxe();
  drawExpandCard();
}

// A small non-interactive line -- there's no tool to *pick* any more
// (chopping is just tapping a ripe plot directly), but the player still
// wants to see which axe is actually driving the numbers.
function drawEquippedAxe() {
  const sub = el("log-axe-name");
  if (!sub) return;
  sub.textContent = state.equipment.axe || "No axe equipped";
}

// -------------------------------------------------------------- plot actions

function flashLog(node, cls, ms) {
  node.classList.remove(cls);
  void node.offsetWidth;
  node.classList.add(cls);
  setTimeout(function () { node.classList.remove(cls); }, ms);
}

function touchLogPlot(i) {
  const plot = state.logPlots[i];
  const node = el("log-plots").children[i];
  const status = logPlotStatus(plot);

  if (status !== "ripe") {
    logHint("Still growing.");
    flashLog(node, "nope", 340);
    return;
  }
  chopTree(i, plot, node);
  save();
  drawBag();
}

// Whatever's equipped in the Axe slot -- falls back to a bare hand's worth
// of damage (Wooden Axe's own 1) if somehow nothing is equipped, same
// "fall back rather than block the action" rule mining.js's pickaxe() and
// combat.js's weaponStats() both already use.
function axeDamage() {
  const item = state.equipment.axe;
  return (AXES[item] && AXES[item].damage) || AXES["Wooden Axe"].damage;
}

// One tap, resolved synchronously -- no timer, no swing to land badly.
// Straight HP off the tree: every tap deals the equipped axe's damage,
// and the tree falls the instant health reaches 0 in that same tap.
function chopTree(i, plot, node) {
  const dmg = axeDamage();
  plot.chopHealth -= dmg;
  flashLog(node, "chop-hit", 220);

  if (plot.chopHealth <= 0) {
    fellTree(i, plot, node);
    return;
  }
  logHint("-" + dmg + " HP (" + plot.chopHealth + "/" + TREE.health + " left).");
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
    el("log-hint").textContent = "Tap a grown Pine to chop it.";
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
  if (!canAfford(cost)) {
    shakeExpand();
    return;
  }
  spendCost(cost);
  const plot = { startedAt: 0, readyAt: null, chopHealth: null };
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
  const affordable = canAfford(cost);
  card.classList.toggle("unaffordable", !affordable);
  card.classList.toggle("affordable-ready", affordable);
  card.replaceChildren();
  const label = document.createElement("span");
  label.className = "plot-expand-label";
  label.textContent = "+ New Pine Plot";
  const cost_ = document.createElement("span");
  cost_.className = "plot-expand-cost";
  cost_.replaceChildren.apply(cost_, buildCostNodes(cost));
  card.append(label, cost_);
}

el("back-logging").addEventListener("click", function () { show("home"); updateSkillsNote(); });
