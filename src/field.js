// =================================================================== field

import {
  CROPS, FERTILIZERS, WATER_TAPS_NEEDED, PLOT_EXPAND_COST, PLOT_COUNT, LOCATIONS,
  CANS, EQUIP_SLOTS, EQUIPMENT, TINTS,
} from "./data.js";
import { state, save, gainItem, gainSkillXp } from "./state.js";
import { openZoneWheel } from "./zoneWheel.js";
import { GROWTH_PER_LEVEL, WATER_XP, levelFromXp, levelProgress } from "./skills.js";
import { growthMultiplier } from "./time.js";
import { tryStartCanRefill, settleCanRefill, drawCanMeter } from "./canmeter.js";
import { canAfford, buildCostNodes, spendCost } from "./costDisplay.js";
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
  drawExpandCard();
}

// ------------------------------------------------------------- plot expand
//
// Same mechanic as Logging's own (src/logging.js) -- doubles for every
// plot bought past the starting PLOT_COUNT, only offered at a
// non-wilderness location. Kept as its own small copy rather than a
// shared helper, same "kept separate on purpose" reasoning this file's
// own header already gives for not sharing more with Logging.
function expandCost() {
  const bought = state.plots.length - PLOT_COUNT;
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
  if (!canAfford(cost)) { shakeExpand(); return; }
  spendCost(cost);
  state.plots.push({
    crop: null, stage: 0, startedAt: 0, readyAt: null, waterProgress: 0,
    fertilizer: null,
  });
  save();
  drawBag();
  buildPlots();
  drawField();
}

function shakeExpand() {
  const card = el("field-expand-card");
  if (!card) return;
  card.classList.remove("shake");
  void card.offsetWidth;
  card.classList.add("shake");
  // Unlike a plot's own flash() (which resets its whole card, including
  // this class, on every redraw), the expand card's drawExpandCard() only
  // ever touches its afford/text state -- never "shake" -- and it's
  // called every tick this screen is open (that's the whole point of it).
  // Without an explicit removal, the class just sits there forever once
  // added, and a DOM mutation on an animating element (drawExpandCard()'s
  // own replaceChildren() every tick) can restart a still-present CSS
  // animation in some browsers -- which is exactly what "shakes and never
  // stops" was. 340ms clears it just after the 320ms animation ends.
  setTimeout(function () { card.classList.remove("shake"); }, 340);
}

function drawExpandCard() {
  let card = el("field-expand-card");
  if (!canExpandHere()) {
    if (card) card.remove();
    return;
  }
  const wrap = el("plots");
  if (!card) {
    card = document.createElement("button");
    card.id = "field-expand-card";
    card.className = "pill plot-expand";
    card.addEventListener("click", buyPlot);
  }
  wrap.append(card);
  const cost = expandCost();
  const affordable = canAfford(cost);
  card.classList.toggle("unaffordable", !affordable);
  card.classList.toggle("affordable-ready", affordable);
  card.replaceChildren();
  const label = document.createElement("span");
  label.className = "plot-expand-label";
  label.textContent = "+ New Farm Plot";
  const cost_ = document.createElement("span");
  cost_.className = "plot-expand-cost";
  cost_.replaceChildren.apply(cost_, buildCostNodes(cost));
  card.append(label, cost_);
}

// ---------------------------------------------------------------- can slot
//
// Equip/change the Watering Can straight from here -- same system Logging
// already set up for its own Axe (see logging.js's drawAxeSlot()/
// openAxePicker(), which this mirrors), writing the exact same
// state.equipment.can field canmeter.js's own canCapacity() already reads
// live. Farm and Logging share the one equipped can (see canmeter.js's own
// comment), so a change made here already applies to Logging's own
// watering too, no separate "farm can" to keep in sync. Only one tier
// (Wooden Can) exists today -- same "ready for it" state Logging's own Axe
// picker was in before Flint/Stone/Scrap Axe existed -- so this has
// nothing to switch *to* yet, just somewhere for a future tier to slot in.

function itemGet(container, name) { return container[name] || 0; }

function itemAdd(container, name, amount) {
  const next = itemGet(container, name) + amount;
  if (next <= 0) delete container[name];
  else container[name] = next;
}

const CAN_SLOT = EQUIP_SLOTS.find(function (s) { return s.id === "can"; });

// Equipping over an already-filled slot swaps in one tap -- the old can
// goes back to the bag first, same rule inventory.js's own equip() follows.
// Whatever's mid-charge/mid-refill on state.wateringCan is untouched --
// swapping cans doesn't reset or top off the one already in hand.
function equipCan(name) {
  const previous = state.equipment.can;
  if (previous) itemAdd(state.bag, previous, 1);
  itemAdd(state.bag, name, -1);
  state.equipment.can = name;
  save();
  drawField();
}

function unequipCan() {
  const name = state.equipment.can;
  if (!name) return;
  itemAdd(state.bag, name, 1);
  state.equipment.can = null;
  save();
  drawField();
}

// One full-width pill, same shape Logging's own drawAxeSlot() builds.
function drawCanSlot() {
  const wrap = el("field-can-slot");
  if (!wrap) return;
  wrap.replaceChildren();
  const equipped = state.equipment.can;

  const btn = document.createElement("button");
  btn.className = "pill equip-row";

  const icon = document.createElement("span");
  icon.className = "pill-icon";
  const img = document.createElement("img");
  img.className = "sprite-img";
  img.alt = "";
  img.draggable = false;
  const fallback = document.createElement("span");
  fallback.className = "sprite-fallback";
  if (equipped) fallback.style.background = TINTS[equipped] || "#9a8f7d";
  icon.append(img, fallback);
  if (equipped) useSprite(icon, "items/" + slug(equipped));

  const body = document.createElement("span");
  body.className = "pill-body";
  const name = document.createElement("span");
  name.className = "pill-name";
  name.textContent = "Watering Can";
  const sub = document.createElement("span");
  sub.className = "pill-sub";
  // The capacity stat right alongside the name -- what's actually driving
  // canmeter.js's own canCapacity() -- rather than a bare item name the
  // player has to already know the numbers behind.
  sub.textContent = equipped
    ? equipped + " · " + CANS[equipped].capacity + " charges"
    : "Empty — tap to equip";
  body.append(name, sub);

  btn.append(icon, body);
  btn.addEventListener("click", openCanPicker);
  wrap.append(btn);
}

// Same picker shape Logging's own openAxePicker() uses -- an "Unequip" row
// (if something's equipped) followed by every owned can not already
// equipped, using the shared sheet rather than a picker this screen owns.
function openCanPicker() {
  const body = el("sheet-body");
  body.replaceChildren();

  const equipped = state.equipment.can;
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
      unequipCan();
    });
    body.append(unequipRow);
  }

  const options = Object.keys(EQUIPMENT).filter(function (name) {
    return EQUIPMENT[name] === "can" && name !== equipped && itemGet(state.bag, name) > 0;
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
      equipCan(name);
    });
    body.append(row);
  });

  openSheet(CAN_SLOT ? "Equip " + CAN_SLOT.name.toLowerCase() : "Equip watering can");
}

/** empty | thirsty | growing | ripe */
function plotStatus(plot) {
  if (!plot.crop) return "empty";
  if (plot.stage >= CROPS[plot.crop].waters) return "ripe";
  return plot.readyAt === null ? "thirsty" : "growing";
}

// Roll any finished timers forward. Runs on every tick and, because plots hold
// a deadline rather than a countdown, this is also all that offline growth
// needs -- come back tomorrow and the same line catches everything up. The
// can's own refill deadline is the same idea, just one shared timer instead
// of six. Harvesting itself is a single instant tap now (2026-08-31, see
// touchPlot() below) -- nothing to settle for it, a ripe plot just sits
// ripe until tapped, same as it always would while waiting.
export function settle() {
  let changed = false;
  const now = Date.now();
  state.plots.forEach(function (plot) {
    if (plot.readyAt !== null && now >= plot.readyAt) {
      plot.stage += 1;
      plot.readyAt = null;
      plot.waterProgress = 0;   // the next stage (if any) needs its own four taps
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
    // The violet glow (.plot.fertilized in style.css) lasts the whole
    // cycle a fertilizer was applied to, not just the moment it's
    // applied -- thirsty through ripe, cleared only on plant()/harvest.
    node.classList.toggle("fertilized", !!plot.fertilizer);

    // The fill bar does the same double duty the old ring did: watering
    // progress before the growth timer starts, growth progress once it
    // has -- same element, same width, just a different color per status
    // (see .plot.watering/.plot.ripe in style.css). Nothing left to show
    // once ripe but full -- one tap harvests it outright.
    const fill = node.querySelector(".pill-fill");
    if (status === "growing") {
      const span = plot.readyAt - plot.startedAt;
      const p = span > 0 ? Math.min(1, (now - plot.startedAt) / span) : 1;
      fill.style.width = (p * 100).toFixed(1) + "%";
    } else if (status === "thirsty") {
      fill.style.width = (plot.waterProgress / WATER_TAPS_NEEDED * 100).toFixed(1) + "%";
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
    // "Fertilized" only needs calling out while it's still just a promise
    // (thirsty, nothing to show for it yet) -- once growing/ripe, the
    // glow itself already reads as "this one got the boost," and the timer
    // it actually bought is invisible either way (baked into readyAt).
    const fertNote = status === "thirsty" && plot.fertilizer ? " · Fertilized" : "";
    node.querySelector(".pill-sub").textContent =
      status === "empty" ? "" :
      status === "thirsty" ? "Watering " + plot.waterProgress + "/" + WATER_TAPS_NEEDED + fertNote :
      status === "growing" ? "Growing…" :
      "Ripe — tap to harvest";

    // A ripe plot is always actionable, tool or not -- harvesting needs no
    // tool selected any more. Otherwise, highlight what the held tool can
    // actually be used on, same as before.
    const can = status === "ripe" || canUse(state.tool, status, plot);
    node.classList.toggle("actionable", can);
    node.classList.toggle("wet-target", can && state.tool === "water");
  });

  drawCanMeter("screen-field", state.wateringCan);
  drawCanSlot();
  // Keeps the expand card's afford styling current every tick this screen
  // is visible, not just right after buildPlots() rebuilds it -- same
  // "don't let it go stale while sitting here" fix Craft/the conversion
  // stations just got.
  drawExpandCard();
}

// `plot` only matters for fertilizer -- seeds/water only ever cared about
// status. Fertilizer's own window is narrower than "thirsty" alone: it
// has to land before the *first* watering tap, not just before the timer
// starts, and only once per cycle -- must fertilize before watering, per
// the user's own spec, not "any time before the timer starts."
function canUse(tool, status, plot) {
  if (tool === "seeds") return status === "empty";
  if (tool === "fertilizer") return status === "thirsty" && plot.waterProgress === 0 && !plot.fertilizer;
  if (tool === "water") return status === "thirsty";
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

  // Ripe plots harvest on a single tap, no tool needed at all -- checked
  // before the tool gate below, same "always available" treatment the old
  // Scythe's one job used to get, just without a tool to hold first.
  if (status === "ripe") { resolveHarvest(i, plot); save(); drawField(); drawBag(); return; }

  if (!state.tool) { hint("Pick a tool first."); flash(node, "nope", 340); return; }
  if (!canUse(state.tool, status, plot)) { wrongTool(node, status, plot); return; }

  if (state.tool === "seeds") plant(i, plot, node);
  else if (state.tool === "fertilizer") fertilize(plot, node);
  else if (state.tool === "water") water(plot, node);

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
  plot.fertilizer = null;
  hint(crop.name + " sown. It needs water.");
}

// Must land before the very first watering tap -- canUse() already
// blocks a re-tap once it has (fertilizer set) or once watering's begun
// (waterProgress > 0), so this only ever has to pick which fertilizer to
// spend and apply it. Only one fertilizer item exists yet (Bonemeal) --
// picks whichever owned one comes first in FERTILIZERS rather than
// opening a chooser sheet for a choice that isn't real yet, same "nothing
// to pick between" reasoning Mining's single-material dig has.
function fertilize(plot, node) {
  const name = Object.keys(FERTILIZERS).find(function (n) { return (state.bag[n] || 0) > 0; });
  if (!name) {
    hint("No fertilizer left.");
    flash(node, "nope", 340);
    return;
  }
  state.bag[name] -= 1;
  plot.fertilizer = name;
  hint(name + " applied. Water it to start the boost.");
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
  // The level bonus, the current season/night multiplier, and now the
  // fertilizer bonus (if this cycle got one -- see fertilize() above) are
  // all read once, right now, and baked into this stage's timer -- growing
  // crops don't speed up or slow down retroactively when you level up, the
  // sun sets, or (not that it's possible mid-grow anyway, fertilizer's own
  // window is only pre-water) fertilizer changes, only the next one you
  // water does. Same rule, now three sources instead of two.
  const levelSpeed = 1 + levelFromXp(state.farmingXp) * GROWTH_PER_LEVEL;
  const timeSpeed = growthMultiplier(state.startedAt, "farming");
  const fertSpeed = plot.fertilizer ? FERTILIZERS[plot.fertilizer].growthMult : 1;
  const speed = levelSpeed * timeSpeed * fertSpeed;
  plot.startedAt = Date.now();
  plot.readyAt = plot.startedAt + (crop.stageSeconds * 1000) / speed;
  hint("Fully watered. Stage " + (plot.stage + 1) + " of " + crop.waters + ".");
  gainXp(WATER_XP);
}

// The full payout, on the single tap that harvests a ripe plot -- no
// timer, no settle() step, instant the same tick it's tapped (2026-08-31).
// Called only from touchPlot() now, always with a real node to flash --
// there's no offline "cut left running" case any more to reach this
// without one.
function resolveHarvest(i, plot) {
  const crop = CROPS[plot.crop];
  const node = el("plots").children[i];
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
    plot.fertilizer = null;
    save();
    drawField();
    drawBag();
  }

  // Same "result" flash Foraging's own pill uses -- gold, bold pill-sub
  // text for a beat before the plot goes back to normal. drawField()'s
  // own per-plot loop skips a node still showing this.
  node.querySelector(".pill-sub").textContent = parts.join(" · ");
  node.classList.add("result");
  flash(node, "reaping", 400);
  setTimeout(function () { node.classList.remove("result"); reset(); }, 1400);

  hint("Harvested " + crop.name + ".");
  gainXp(crop.xp);
}

// Awards Farming XP and, if that crossed a level line, flashes the bar and
// says so -- otherwise it's just a number climbing, and climbing numbers
// need a moment where they visibly mean something.
function gainXp(amount) {
  const before = levelFromXp(state.farmingXp);
  const zoneLevels = gainSkillXp("farmingXp", amount);
  const after = levelFromXp(state.farmingXp);
  if (zoneLevels) openZoneWheel(state.currentLocation, zoneLevels);
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

function wrongTool(node, status, plot) {
  // status === "ripe" never reaches here any more -- touchPlot() handles it
  // before the tool gate, tool or not (see its own comment).
  if (state.tool === "fertilizer" && status === "thirsty") {
    // canUse() already narrowed *why* a thirsty plot failed -- one of
    // these two, not the generic "wrong status" table below, since both
    // read as real, specific reasons rather than "not that one."
    hint(plot.fertilizer ? "Already fertilized." : "Already watering — too late to fertilize.");
    flash(node, "nope", 340);
    return;
  }
  const why = {
    seeds: { thirsty: "Already sown.", growing: "Already growing." },
    fertilizer: { empty: "Nothing planted here.", growing: "Already growing." },
    water: { empty: "Nothing planted here.", growing: "Already watered." },
  };
  hint((why[state.tool] && why[state.tool][status]) || "Not that one.");
  flash(node, "nope", 340);
}

// ==================================================================== tools

const HINTS = {
  seeds: "Tap an empty plot to sow.",
  fertilizer: "Tap a freshly-sown plot to fertilize it -- before the first watering.",
  water: "Tap a sown plot to water it.",
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
