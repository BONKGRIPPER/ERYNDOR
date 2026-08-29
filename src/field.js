// =================================================================== field

import { CROPS, WATER_TAPS_NEEDED, HARVEST_MS } from "./data.js";
import { state, save, gainItem } from "./state.js";
import { GROWTH_PER_LEVEL, WATER_XP, levelFromXp, levelProgress } from "./skills.js";
import { growthMultiplier } from "./time.js";
import { tryStartCanRefill, settleCanRefill, drawCanMeter } from "./canmeter.js";
import { useSprite, slug } from "./sprites.js";
import { el } from "./dom.js";
import { show } from "./screens.js";
import { drawBag, updateSkillsNote } from "./hub.js";
import { openSheet, closeSheet } from "./sheet.js";

const PLANT_SVG =
  '<svg viewBox="0 0 40 40" aria-hidden="true">' +
  '<path class="stem" d="M20 34 V13" />' +
  '<ellipse class="leaf" cx="13" cy="23" rx="7" ry="3.2" transform="rotate(-25 13 23)" />' +
  '<ellipse class="leaf" cx="27" cy="18" rx="7" ry="3.2" transform="rotate(25 27 18)" />' +
  '<circle class="fruit" cx="20" cy="11" r="4.6" fill="currentColor" />' +
  "</svg>";

export function drawXp() {
  const p = levelProgress(state.farmingXp);
  el("xp-level").textContent = "Farming — Level " + p.level;
  el("xp-count").textContent = p.into + " / " + p.need;
  el("xp-fill").style.width = (Math.min(1, p.into / p.need) * 100).toFixed(1) + "%";
}

export function buildPlots() {
  const wrap = el("plots");
  wrap.replaceChildren();

  state.plots.forEach(function (plot, i) {
    const node = document.createElement("button");
    node.className = "pill plot";
    node.dataset.i = String(i);
    node.innerHTML =
      '<div class="pill-fill"></div>' +
      '<span class="pill-icon"><img class="sprite-img" alt="" draggable="false">' +
        '<span class="sprite-fallback">' + PLANT_SVG + "</span></span>" +
      '<span class="pill-body">' +
        '<span class="pill-name"></span>' +
        '<span class="pill-sub"></span>' +
      "</span>";
    node.addEventListener("click", function () { touchPlot(i); });
    wrap.append(node);
  });
}

/** empty | thirsty | growing | ripe | cutting */
function plotStatus(plot) {
  if (!plot.crop) return "empty";
  if (plot.reapReadyAt !== null) return "cutting";
  if (plot.stage >= CROPS[plot.crop].waters) return "ripe";
  return plot.readyAt === null ? "thirsty" : "growing";
}

// Roll any finished timers forward. Runs on every tick and, because plots hold
// a deadline rather than a countdown, this is also all that offline growth
// needs -- come back tomorrow and the same line catches everything up. The
// can's own refill deadline is the same idea, just one shared timer instead
// of six. A cut left running through a reload resolves here too, the same
// as a chop landing in Logging's settleLogging() -- resolveHarvest() itself
// decides whether there's a visible node worth animating.
export function settle() {
  let changed = false;
  const now = Date.now();
  const visible = !el("screen-field").classList.contains("hidden");
  state.plots.forEach(function (plot, i) {
    if (plot.readyAt !== null && now >= plot.readyAt) {
      plot.stage += 1;
      plot.readyAt = null;
      plot.waterProgress = 0;   // the next stage (if any) needs its own four taps
      changed = true;
    }
    if (plot.reapReadyAt !== null && now >= plot.reapReadyAt) {
      resolveHarvest(i, plot, visible);
      changed = true;
    }
  });
  if (settleCanRefill(state.wateringCan)) changed = true;
  if (changed) save();
}

export function drawField() {
  const now = Date.now();

  state.plots.forEach(function (plot, i) {
    const node = el("plots").children[i];
    if (!node) return;
    // A just-harvested plot is showing its "+2 Turnip" flash in pill-sub
    // (see resolveHarvest() below) -- same guard showForageResult()/
    // refreshForage() use, so the normal status text doesn't stomp it
    // mid-flash. The plot's own reset (also in resolveHarvest()) clears
    // this and redraws for real once the flash is done.
    if (node.classList.contains("result")) return;
    const status = plotStatus(plot);
    const crop = plot.crop ? CROPS[plot.crop] : null;

    node.classList.toggle("growing", status === "growing");
    node.classList.toggle("watering", status === "thirsty");
    node.classList.toggle("thirsty", status === "thirsty");
    node.classList.toggle("ripe", status === "ripe");
    node.classList.toggle("cutting", status === "cutting");

    // The fill bar does the same double duty the old ring did: watering
    // progress before the growth timer starts, growth progress once it
    // has, then the single Scythe cut's own countdown -- same element,
    // same width, just a different color per status (see
    // .plot.watering/.plot.ripe in style.css).
    const fill = node.querySelector(".pill-fill");
    if (status === "growing") {
      const span = plot.readyAt - plot.startedAt;
      const p = span > 0 ? Math.min(1, (now - plot.startedAt) / span) : 1;
      fill.style.width = (p * 100).toFixed(1) + "%";
    } else if (status === "thirsty") {
      fill.style.width = (plot.waterProgress / WATER_TAPS_NEEDED * 100).toFixed(1) + "%";
    } else if (status === "cutting") {
      const p = Math.min(1, (now - (plot.reapReadyAt - HARVEST_MS)) / HARVEST_MS);
      fill.style.width = (p * 100).toFixed(1) + "%";
    } else if (status === "ripe") {
      fill.style.width = "100%";
    } else {
      fill.style.width = "0%";
    }

    const icon = node.querySelector(".pill-icon");
    if (!crop) {
      icon.classList.remove("using-sprite");
      icon.querySelector(".sprite-img").removeAttribute("src");
    } else {
      const frame = Math.min(plot.stage, crop.waters);
      if (!useSprite(icon, "crops/" + plot.crop + "/" + frame)) {
        icon.querySelector(".fruit").setAttribute("fill", crop.tint);
      }
    }

    node.querySelector(".pill-name").textContent = crop ? crop.name : "Empty Plot";
    node.querySelector(".pill-sub").textContent =
      status === "empty" ? "" :
      status === "thirsty" ? "Watering " + plot.waterProgress + "/" + WATER_TAPS_NEEDED :
      status === "growing" ? "Growing…" :
      status === "cutting" ? "Cutting…" :
      "Ripe — tap to harvest";

    // highlight what the held tool can actually be used on
    const can = canUse(state.tool, status);
    node.classList.toggle("actionable", can);
    node.classList.toggle("wet-target", can && state.tool === "water");
    node.classList.toggle("reap-target", can && state.tool === "scythe");
  });

  drawCanMeter("screen-field", state.wateringCan);
  drawEquippedScythe();
}

// The Scythe tool shows whatever's actually equipped in that slot -- name
// and sprite -- rather than a fixed "Scythe" label, same reasoning as the
// watering can showing its equipped tier in canmeter.js.
function drawEquippedScythe() {
  const btn = document.querySelector('#screen-field .tool[data-tool="scythe"]');
  if (!btn) return;
  const item = state.equipment.scythe;
  btn.querySelector(".tool-label").textContent = item || "Scythe";
  if (item) useSprite(btn.querySelector(".tool-icon"), "items/" + slug(item));
}

function canUse(tool, status) {
  if (tool === "seeds") return status === "empty";
  if (tool === "water") return status === "thirsty";
  if (tool === "scythe") return status === "ripe";
  return false;
}

// ============================================================ plot actions

function flash(node, cls, ms) {
  node.classList.remove(cls);
  void node.offsetWidth;          // restart the animation
  node.classList.add(cls);
  setTimeout(function () { node.classList.remove(cls); }, ms);
}

function touchPlot(i) {
  const plot = state.plots[i];
  const node = el("plots").children[i];
  const status = plotStatus(plot);

  if (!state.tool) { hint("Pick a tool first."); flash(node, "nope", 340); return; }
  if (!canUse(state.tool, status)) { wrongTool(node, status); return; }

  if (state.tool === "seeds") plant(i, plot, node);
  else if (state.tool === "water") water(plot, node);
  else if (state.tool === "scythe") startReap(plot);

  save();
  drawField();
  drawBag();
}

function plant(i, plot, node) {
  const crop = CROPS[state.seed];
  if (!crop || (state.bag[crop.seed] || 0) < 1) {
    hint("No " + (crop ? crop.seed.toLowerCase() : "seeds") + " left.");
    flash(node, "nope", 340);
    return;
  }
  state.bag[crop.seed] -= 1;
  plot.crop = state.seed;
  plot.stage = 0;
  plot.readyAt = null;
  plot.waterProgress = 0;
  hint(crop.name + " sown. It needs water.");
}

// One tap == one charge == one splash. A plot needs WATER_TAPS_NEEDED of
// these before it's fully watered and the actual growth timer starts --
// the splash plays every tap, the growth-start payoff only on the last one.
function water(plot, node) {
  if (state.wateringCan.charges < 1) {
    hint("The can is empty. Tap it to refill.");
    flash(node, "nope", 340);
    return;
  }

  state.wateringCan.charges -= 1;
  plot.waterProgress += 1;

  if (plot.waterProgress < WATER_TAPS_NEEDED) {
    hint("Watered " + plot.waterProgress + "/" + WATER_TAPS_NEEDED + ".");
    return;
  }

  const crop = CROPS[plot.crop];
  // The level bonus and the current season/night multiplier are both read
  // once, right now, and baked into this stage's timer -- growing crops
  // don't speed up or slow down retroactively when you level up or the sun
  // sets mid-grow, only the next one you water does. Same rule, now two
  // sources instead of one.
  const levelSpeed = 1 + levelFromXp(state.farmingXp) * GROWTH_PER_LEVEL;
  const timeSpeed = growthMultiplier(state.startedAt, "farming");
  const speed = levelSpeed * timeSpeed;
  plot.startedAt = Date.now();
  plot.readyAt = plot.startedAt + (crop.stageSeconds * 1000) / speed;
  hint("Fully watered. Stage " + (plot.stage + 1) + " of " + crop.waters + ".");
  gainXp(WATER_XP);
}

// One tap starts the cut -- HARVEST_MS later, settle() (in the tick loop,
// or the very next boot if the game was closed) calls resolveHarvest()
// itself. Nothing here pays anything out; it only sets the deadline.
function startReap(plot) {
  plot.reapReadyAt = Date.now() + HARVEST_MS;
  hint("Cutting… ready in " + (HARVEST_MS / 1000) + "s.");
}

// The payout, once the cut's own timer lands -- split out of the old tap
// handler the same way Logging's fellTree() is split out of chopTree(),
// so an offline catch-up (no visible node to animate) and a cut finishing
// while the screen is open both resolve through the same one function.
function resolveHarvest(i, plot, visible) {
  const crop = CROPS[plot.crop];
  const node = visible ? el("plots").children[i] : null;
  const parts = [];
  Object.keys(crop.gives).forEach(function (item) {
    gainItem(item, crop.gives[item]);
    parts.push("+" + crop.gives[item] + " " + item);
  });

  function reset() {
    plot.crop = null;
    plot.stage = 0;
    plot.readyAt = null;
    plot.waterProgress = 0;
    plot.reapReadyAt = null;
    save();
    drawField();
    drawBag();
  }

  if (node) {
    // Same "result" flash Foraging's own pill uses -- gold, bold pill-sub
    // text for a beat before the plot goes back to normal. drawField()'s
    // own per-plot loop skips a node still showing this.
    node.querySelector(".pill-sub").textContent = parts.join(" · ");
    node.classList.add("result");
    flash(node, "reaping", 400);
    setTimeout(function () { node.classList.remove("result"); reset(); }, 1400);
  } else {
    reset();
  }

  hint("Harvested " + crop.name + ".");
  gainXp(crop.xp);
}

// Awards Farming XP and, if that crossed a level line, flashes the bar and
// says so -- otherwise it's just a number climbing, and climbing numbers
// need a moment where they visibly mean something.
function gainXp(amount) {
  const before = levelFromXp(state.farmingXp);
  state.farmingXp += amount;
  const after = levelFromXp(state.farmingXp);
  drawXp();
  updateSkillsNote();
  if (after > before) {
    hint("Farming level " + after + "!");
    const bar = document.querySelector("#screen-field .xp-bar");
    bar.classList.remove("levelup");
    void bar.offsetWidth;
    bar.classList.add("levelup");
  }
}

function wrongTool(node, status) {
  const why = {
    seeds:  { thirsty: "Already sown.", growing: "Already growing.", ripe: "That's ripe — use the scythe.", cutting: "Already cutting." },
    water:  { empty: "Nothing planted here.", growing: "Already watered.", ripe: "That's ripe — use the scythe.", cutting: "Already cutting." },
    scythe: { empty: "Nothing to cut.", thirsty: "Not grown yet.", growing: "Not grown yet.", cutting: "Already cutting." },
  };
  hint((why[state.tool] && why[state.tool][status]) || "Not that one.");
  flash(node, "nope", 340);
}

// ==================================================================== tools

const HINTS = {
  seeds:  "Tap an empty plot to sow.",
  water:  "Tap a sown plot to water it.",
  scythe: "Tap a ripe plot to harvest.",
};

let hintTimer = 0;
function hint(text) {
  el("hint").textContent = text;
  clearTimeout(hintTimer);
  hintTimer = setTimeout(function () {
    el("hint").textContent = state.tool ? HINTS[state.tool] : "Pick a tool to begin.";
  }, 2200);
}

function setTool(tool) {
  state.tool = tool;
  document.querySelectorAll("#screen-field .tool").forEach(function (b) {
    b.classList.toggle("active", b.dataset.tool === tool);
  });
  el("hint").textContent = tool
    ? (tool === "seeds" ? CROPS[state.seed].name + " — " + HINTS.seeds : HINTS[tool])
    : "Pick a tool to begin.";
  drawField();
}

document.querySelectorAll("#screen-field .tool").forEach(function (btn) {
  btn.addEventListener("click", function () {
    const tool = btn.dataset.tool;
    // Tapping the can itself while it's empty starts the refill rather
    // than toggling the tool -- it stays selected either way, so there's
    // nothing else to do once it's full but go water.
    if (tool === "water" && tryStartCanRefill(state.wateringCan)) {
      save();
      setTool("water");
      hint("Refilling the can…");
      return;
    }
    if (state.tool === tool) { setTool(null); return; }   // tap again to drop it
    if (tool === "seeds") { openSeeds(); return; }        // seeds ask what to sow
    setTool(tool);
  });
});

// ============================================================== seed sheet

function openSeeds() {
  const body = el("sheet-body");
  body.replaceChildren();

  Object.keys(CROPS).forEach(function (id) {
    const crop = CROPS[id];
    const count = state.bag[crop.seed] || 0;

    const row = document.createElement("button");
    row.className = "seed-row";
    row.disabled = count < 1;

    const dot = document.createElement("span");
    dot.className = "dot";
    dot.style.background = crop.tint;

    const text = document.createElement("div");
    const name = document.createElement("div");
    name.className = "seed-name";
    name.textContent = crop.name;
    const meta = document.createElement("div");
    meta.className = "seed-meta";
    meta.textContent = crop.waters + " watering" + (crop.waters > 1 ? "s" : "") +
      " · " + crop.stageSeconds + "s each";
    text.append(name, meta);

    const count_ = document.createElement("span");
    count_.className = "seed-count";
    count_.textContent = count + " left";

    row.append(dot, text, count_);
    row.addEventListener("click", function () {
      state.seed = id;
      closeSheet();
      setTool("seeds");
    });
    body.append(row);
  });

  openSheet("Choose a seed");
}

el("back").addEventListener("click", function () { show("home"); updateSkillsNote(); });

// Tool icons don't change frame like a growing crop does, so they're wired
// once here rather than in the per-tick draw loop.
export function applyToolSprites() {
  document.querySelectorAll("#screen-field .tool").forEach(function (btn) {
    useSprite(btn.querySelector(".tool-icon"), "tools/" + btn.dataset.tool);
  });
}
