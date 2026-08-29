// ================================================================= logging
//
// Farming's mirror: plant a pine cone, water it, chop it once it's ripe.
// Same deadline-timer machinery, same tool-bar pattern, its own skill and
// its own plot grid -- kept separate from Field's rather than shared, so
// leaving Farm with Water selected and going to chop in Logging doesn't
// touch what Farm was doing.

import { TREES, WATER_TAPS_NEEDED, AXES } from "./data.js";
import { state, save, gainItem } from "./state.js";
import { GROWTH_PER_LEVEL, WATER_XP, levelFromXp, levelProgress } from "./skills.js";
import { growthMultiplier } from "./time.js";
import { tryStartCanRefill, settleCanRefill, drawCanMeter } from "./canmeter.js";
import { useSprite, slug } from "./sprites.js";
import { el } from "./dom.js";
import { show } from "./screens.js";
import { drawBag, updateSkillsNote } from "./hub.js";
import { openSheet, closeSheet } from "./sheet.js";

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
}

/** empty | thirsty | growing | ripe */
function logPlotStatus(plot) {
  if (!plot.crop) return "empty";
  if (plot.stage >= TREES[plot.crop].waters) return "ripe";
  return plot.readyAt === null ? "thirsty" : "growing";
}

// Same free-offline-growth trick as Field's settle(). Chopping itself is
// instant per tap now (see chopTree() below) -- there's no timer left to
// catch up here, just growth and the can's refill.
export function settleLogging() {
  let changed = false;
  const now = Date.now();

  state.logPlots.forEach(function (plot) {
    if (plot.readyAt !== null && now >= plot.readyAt) {
      plot.stage += 1;
      plot.readyAt = null;
      plot.waterProgress = 0;   // the next stage (if any) needs its own four taps
      // Freshly ripe -- full health, untouched, ready for the axe.
      if (plot.stage >= TREES[plot.crop].waters) plot.chopHealth = TREES[plot.crop].health;
      changed = true;
    }
  });

  if (settleCanRefill(state.logWateringCan)) changed = true;
  if (changed) save();
}

// The payoff once the last chop lands -- split out of the tap handler
// because it can now also fire from an offline catch-up, when there's no
// visible node to animate.
function fellTree(i, plot, visible) {
  const tree = TREES[plot.crop];
  const node = visible ? el("log-plots").children[i] : null;
  const parts = [];
  Object.keys(tree.gives).forEach(function (item) {
    gainItem(item, tree.gives[item]);
    parts.push("+" + tree.gives[item] + " " + item);
  });

  function reset() {
    plot.crop = null;
    plot.stage = 0;
    plot.readyAt = null;
    plot.waterProgress = 0;
    plot.chopHealth = null;
    save();
    drawLogging();
    drawBag();
  }

  if (node) {
    // Same "result" flash Field's resolveHarvest() uses -- drawLogging()'s own
    // per-plot loop skips a node still showing this.
    node.querySelector(".pill-sub").textContent = parts.join(" · ");
    node.classList.add("result");
    flashLog(node, "reaping", 400);
    setTimeout(function () {
      node.classList.remove("result");
      reset();
    }, 1400);
  } else {
    reset();
  }

  logHint("Chopped " + tree.name + ".");
  gainLogXp(tree.xp);
}

export function drawLogging() {
  const now = Date.now();

  state.logPlots.forEach(function (plot, i) {
    const node = el("log-plots").children[i];
    if (!node) return;
    // Same guard Field's drawField() uses -- a just-felled plot is showing
    // its "+3 Pine Logs" flash (see fellTree() below) and skips the normal
    // redraw until that's done.
    if (node.classList.contains("result")) return;
    const status = logPlotStatus(plot);
    const tree = plot.crop ? TREES[plot.crop] : null;
    // Health remaining -- set fresh the moment a tree turns ripe (see
    // settleLogging()); falls back to full health for a plot loaded from
    // an old save that never had this field. Never negative -- the last
    // chop that reaches 0 fells the tree in the same tap, see chopTree().
    const chopHealth = tree && status === "ripe"
      ? (plot.chopHealth === null || plot.chopHealth === undefined ? tree.health : plot.chopHealth)
      : 0;

    node.classList.toggle("growing", status === "growing");
    node.classList.toggle("watering", status === "thirsty");
    node.classList.toggle("thirsty", status === "thirsty");
    node.classList.toggle("ripe", status === "ripe");

    // The fill bar covers three different progress meters depending on
    // status -- partial watering, growth, or (new) chop damage dealt so
    // far -- same element, just a different source per status. Chop
    // damage fills up from 0% (full health) toward 100% (about to fall),
    // same direction watering's own bar already fills.
    const fill = node.querySelector(".pill-fill");
    if (status === "growing") {
      const span = plot.readyAt - plot.startedAt;
      const p = span > 0 ? Math.min(1, (now - plot.startedAt) / span) : 1;
      fill.style.width = (p * 100).toFixed(1) + "%";
    } else if (status === "thirsty") {
      fill.style.width = (plot.waterProgress / WATER_TAPS_NEEDED * 100).toFixed(1) + "%";
    } else if (status === "ripe") {
      const dealt = tree.health - chopHealth;
      fill.style.width = (dealt / tree.health * 100).toFixed(1) + "%";
    } else {
      fill.style.width = "0%";
    }

    const icon = node.querySelector(".pill-icon");
    if (!tree) {
      icon.classList.remove("using-sprite");
      icon.querySelector(".sprite-img").removeAttribute("src");
    } else {
      const frame = Math.min(plot.stage, tree.waters);
      if (!useSprite(icon, "trees/" + plot.crop + "/" + frame)) {
        icon.querySelector(".fruit").setAttribute("fill", tree.tint);
      }
    }

    node.querySelector(".pill-name").textContent = tree ? tree.name : "Empty Plot";
    node.querySelector(".pill-sub").textContent =
      status === "empty" ? "" :
      status === "thirsty" ? "Watering " + plot.waterProgress + "/" + WATER_TAPS_NEEDED :
      status === "growing" ? "Growing…" :
      chopHealth + "/" + tree.health + " HP — tap to chop";

    const can = canUseLog(state.logTool, status);
    node.classList.toggle("actionable", can);
    node.classList.toggle("wet-target", can && state.logTool === "water");
    node.classList.toggle("reap-target", can && state.logTool === "axe");
  });

  drawCanMeter("screen-logging", state.logWateringCan);
  drawEquippedAxe();
}

// The Axe tool shows whatever's actually equipped in that slot -- name and
// sprite -- rather than a fixed "Axe" label, same reasoning as the
// watering can showing its equipped tier in canmeter.js.
function drawEquippedAxe() {
  const btn = document.querySelector('#screen-logging .tool[data-tool="axe"]');
  if (!btn) return;
  const item = state.equipment.axe;
  btn.querySelector(".tool-label").textContent = item || "Axe";
  if (item) useSprite(btn.querySelector(".tool-icon"), "items/" + slug(item));
}

function canUseLog(tool, status) {
  if (tool === "cone")  return status === "empty";
  if (tool === "water") return status === "thirsty";
  if (tool === "axe")   return status === "ripe";
  return false;
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

  if (!state.logTool) { logHint("Pick a tool first."); flashLog(node, "nope", 340); return; }
  if (!canUseLog(state.logTool, status)) { wrongLogTool(node, status); return; }

  if (state.logTool === "cone") plantTree(i, plot, node);
  else if (state.logTool === "water") waterTree(plot, node);
  else if (state.logTool === "axe") chopTree(i, plot, node);

  save();
  drawLogging();
  drawBag();
}

function plantTree(i, plot, node) {
  const tree = TREES[state.logSeed];
  if (!tree || (state.bag[tree.seed] || 0) < 1) {
    logHint("No " + (tree ? tree.seed.toLowerCase() : "cones") + " left.");
    flashLog(node, "nope", 340);
    return;
  }
  state.bag[tree.seed] -= 1;
  plot.crop = state.logSeed;
  plot.stage = 0;
  plot.readyAt = null;
  plot.waterProgress = 0;
  plot.chopHealth = null;
  logHint(tree.name + " cone planted. It needs water.");
}

// One tap == one charge == one splash, same rule as Field's watering can --
// WATER_TAPS_NEEDED of these before the growth timer actually starts.
function waterTree(plot, node) {
  if (state.logWateringCan.charges < 1) {
    logHint("The can is empty. Tap it to refill.");
    flashLog(node, "nope", 340);
    return;
  }

  state.logWateringCan.charges -= 1;
  plot.waterProgress += 1;
  flashLog(node, "watering", 700);

  if (plot.waterProgress < WATER_TAPS_NEEDED) {
    logHint("Watered " + plot.waterProgress + "/" + WATER_TAPS_NEEDED + ".");
    return;
  }

  const tree = TREES[plot.crop];
  const levelSpeed = 1 + levelFromXp(state.loggingXp) * GROWTH_PER_LEVEL;
  const timeSpeed = growthMultiplier(state.startedAt, "logging");
  const speed = levelSpeed * timeSpeed;
  plot.startedAt = Date.now();
  plot.readyAt = plot.startedAt + (tree.stageSeconds / speed) * 1000;
  logHint("Fully watered. Stage " + (plot.stage + 1) + " of " + tree.waters + ".");
  gainLogXp(WATER_XP);
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
  const tree = TREES[plot.crop];
  if (plot.chopHealth === null || plot.chopHealth === undefined) plot.chopHealth = tree.health;

  const dmg = axeDamage();
  plot.chopHealth -= dmg;
  flashLog(node, "chop-hit", 220);

  if (plot.chopHealth <= 0) {
    fellTree(i, plot, true);
    return;
  }
  logHint("-" + dmg + " HP (" + plot.chopHealth + "/" + tree.health + " left).");
}

function gainLogXp(amount) {
  const before = levelFromXp(state.loggingXp);
  state.loggingXp += amount;
  const after = levelFromXp(state.loggingXp);
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

function wrongLogTool(node, status) {
  const why = {
    cone:  { thirsty: "Already planted.", growing: "Already growing.", ripe: "That's grown — use the axe." },
    water: { empty: "Nothing planted here.", growing: "Already watered.", ripe: "That's grown — use the axe." },
    axe:   { empty: "Nothing to chop.", thirsty: "Not grown yet.", growing: "Not grown yet." },
  };
  logHint((why[state.logTool] && why[state.logTool][status]) || "Not that one.");
  flashLog(node, "nope", 340);
}

// ---------------------------------------------------------------------- tools

const LOG_HINTS = {
  cone:  "Tap an empty plot to plant.",
  water: "Tap a planted plot to water it.",
  axe:   "Tap a grown plot to chop it.",
};

let logHintTimer = 0;
function logHint(text) {
  el("log-hint").textContent = text;
  clearTimeout(logHintTimer);
  logHintTimer = setTimeout(function () {
    el("log-hint").textContent = state.logTool ? LOG_HINTS[state.logTool] : "Pick a tool to begin.";
  }, 2200);
}

function setLogTool(tool) {
  state.logTool = tool;
  document.querySelectorAll("#screen-logging .tool").forEach(function (b) {
    b.classList.toggle("active", b.dataset.tool === tool);
  });
  el("log-hint").textContent = tool
    ? (tool === "cone" ? TREES[state.logSeed].name + " — " + LOG_HINTS.cone : LOG_HINTS[tool])
    : "Pick a tool to begin.";
  drawLogging();
}

document.querySelectorAll("#screen-logging .tool").forEach(function (btn) {
  btn.addEventListener("click", function () {
    const tool = btn.dataset.tool;
    if (tool === "water" && tryStartCanRefill(state.logWateringCan)) {
      save();
      setLogTool("water");
      logHint("Refilling the can…");
      return;
    }
    if (state.logTool === tool) { setLogTool(null); return; }
    if (tool === "cone") { openCones(); return; }
    setLogTool(tool);
  });
});

// ------------------------------------------------------------------- sheet

function openCones() {
  const body = el("sheet-body");
  body.replaceChildren();

  Object.keys(TREES).forEach(function (id) {
    const tree = TREES[id];
    const count = state.bag[tree.seed] || 0;

    const row = document.createElement("button");
    row.className = "seed-row";
    row.disabled = count < 1;

    const dot = document.createElement("span");
    dot.className = "dot";
    dot.style.background = tree.tint;

    const text = document.createElement("div");
    const name = document.createElement("div");
    name.className = "seed-name";
    name.textContent = tree.name;
    const meta = document.createElement("div");
    meta.className = "seed-meta";
    meta.textContent = tree.waters + " watering" + (tree.waters > 1 ? "s" : "") +
      " · " + tree.stageSeconds + "s each";
    text.append(name, meta);

    const count_ = document.createElement("span");
    count_.className = "seed-count";
    count_.textContent = count + " left";

    row.append(dot, text, count_);
    row.addEventListener("click", function () {
      state.logSeed = id;
      closeSheet();
      setLogTool("cone");
    });
    body.append(row);
  });

  openSheet("Choose what to plant");
}

el("back-logging").addEventListener("click", function () { show("home"); updateSkillsNote(); });

export function applyLogToolSprites() {
  document.querySelectorAll("#screen-logging .tool").forEach(function (btn) {
    useSprite(btn.querySelector(".tool-icon"), "tools/" + btn.dataset.tool);
  });
}
