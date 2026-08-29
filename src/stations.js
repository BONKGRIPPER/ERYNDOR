// =============================================================== stations
//
// Single-recipe, build-once conversion stations -- the Spinning Wheel
// (Flax -> String) and the Sawmill (Logs -> Planks) share this one handler
// rather than two near-identical files, since both were built in the same
// pass and the shape is identical. Each has its own screen (a real
// Farming/Logging-style XP bar up top, one pill below -- same UI language
// the old four-pill Foraging screen used, on purpose, rather than the
// campfire's heavier scene) and its own skill, using Farming/Logging's
// continuous per-level speed curve (GROWTH_PER_LEVEL) rather than
// Foraging's milestone table.
//
// One tap starts one cycle -- no queue, no auto-chaining. The input leaves
// the bag the instant it starts, same "spend on commit" rule Crafting
// already uses, so a running cycle can never fail to finish.

import { STATIONS } from "./data.js";
import { state, save, gainItem } from "./state.js";
import { GROWTH_PER_LEVEL, levelFromXp, levelProgress } from "./skills.js";
import { pillFor, setPillFill } from "./pills.js";
import { useSprite } from "./sprites.js";
import { el } from "./dom.js";
import { show } from "./screens.js";
import { drawBag, updateSkillsNote } from "./hub.js";
import { canAfford, buildCostNodes, spendCost } from "./costDisplay.js";
import { itemLevelProgress, itemSpeedMult, recordCraft } from "./itemLevels.js";

function active(id) { return !!state.stations[id]; }

// The level bonus (both the station's skill and the output item's own
// mastery) is read once, at the moment a cycle starts, and baked into
// that cycle's own timer -- a run already in progress doesn't speed up
// retroactively when either one levels up mid-run, only the next one
// does. Same rule Farm/Logging's water() already follows.
function effectiveMs(cfg) {
  const level = levelFromXp(state[cfg.skillXp]);
  const speed = 1 + level * GROWTH_PER_LEVEL;
  return (cfg.ms / speed) * itemSpeedMult(cfg.output);
}

function shake(node) {
  node.classList.remove("shake");
  void node.offsetWidth;
  node.classList.add("shake");
}

// Most stations consume exactly one input; the Sawmill is the first that
// needs more (3 Pine Logs per Pine Planks) than 1, and the Stone Cutter's
// Basalt Block recipe is the first that needs more than one *kind* of
// input at once. `cost` is the general form (a full item->qty map, same
// shape RECIPES already uses) -- a station that doesn't set one falls
// back to `{[input]: inputQty || 1}`, so every earlier single-input
// station keeps working unchanged.
export function costFor(cfg) {
  return cfg.cost || { [cfg.input]: cfg.inputQty || 1 };
}

function startStation(id) {
  const cfg = STATIONS[id];
  if (active(id)) return;

  const pill = pillFor(id);
  const cost = costFor(cfg);
  if (!canAfford(cost)) {
    shake(pill);
    return;
  }

  spendCost(cost);
  const ms = effectiveMs(cfg);
  state.stations[id] = { startedAt: Date.now(), readyAt: Date.now() + ms };
  save();
  drawBag();

  const fill = pill.querySelector(".pill-fill");
  fill.style.transitionDuration = "0ms";
  fill.style.width = "0%";
  void fill.offsetWidth;
  setPillFill(id, 100, ms);
  refreshStation(id);
}

// Resolves every station that's finished since the last check. Returns the
// ids that completed, so callers only redraw/pop what actually changed.
export function settleStations() {
  const done = [];
  const leveledUp = {};
  Object.keys(STATIONS).forEach(function (id) {
    const c = state.stations[id];
    if (!c || Date.now() < c.readyAt) return;
    const cfg = STATIONS[id];
    gainItem(cfg.output, 1);
    state[cfg.skillXp] += cfg.xp;
    state.stations[id] = null;
    if (recordCraft(cfg.output)) leveledUp[id] = true;
    done.push(id);
  });
  if (done.length) {
    save();
    updateSkillsNote();
    done.forEach(function (id) { drawStationXp(id); drawItemLevel(id, leveledUp[id]); });
  }
  return done;
}

function drawStationXp(id) {
  const cfg = STATIONS[id];
  const level_ = el(id + "-xp-level");
  if (!level_) return;   // screen markup not built for this id -- nothing to draw
  const before = level_.dataset.level ? Number(level_.dataset.level) : null;
  const p = levelProgress(state[cfg.skillXp]);
  level_.textContent = cfg.skillName + " — Level " + p.level;
  el(id + "-xp-count").textContent = p.into + " / " + p.need;
  el(id + "-xp-fill").style.width = (Math.min(1, p.into / p.need) * 100).toFixed(1) + "%";

  if (before !== null && p.level > before) {
    const bar = document.querySelector("#screen-" + id + " .xp-bar");
    bar.classList.remove("levelup");
    void bar.offsetWidth;
    bar.classList.add("levelup");
  }
  level_.dataset.level = String(p.level);
}

// Redraws a pill's active/idle/afford state without touching an in-flight
// fill's transition -- safe any time except mid-transition, same rule
// Crafting's own refreshCraft() follows.
export function refreshStation(id) {
  const cfg = STATIONS[id];
  const pill = pillFor(id);
  if (!pill) return;
  const running = active(id);
  const cost = costFor(cfg);
  const affordable = canAfford(cost);
  pill.classList.toggle("active", running);
  pill.classList.toggle("unaffordable", !running && !affordable);
  pill.classList.toggle("affordable-ready", !running && affordable);
  const sub = pill.querySelector(".pill-sub");
  if (running) sub.textContent = "Working…";
  else sub.replaceChildren.apply(sub, buildCostNodes(cost));
  pill.querySelector(".pill-count").textContent = state.bag[cfg.output] || 0;
}

export function refreshAllStations() {
  Object.keys(STATIONS).forEach(refreshStation);
}

export function drawAllStationXp() {
  Object.keys(STATIONS).forEach(drawStationXp);
}

// The output item's own crafting mastery -- independent of the station's
// skill bar above. `flash` pops the badge the same way Crafting/Foraging's
// own counts already pop on a change, only true the instant a craft
// actually pushes it to a new level.
function drawItemLevel(id, flash) {
  const cfg = STATIONS[id];
  const pill = pillFor(id);
  if (!pill) return;
  const badge = pill.querySelector(".pill-level-badge");
  const fill = pill.querySelector(".pill-level-fill");
  if (!badge || !fill) return;   // markup not built for this pill yet
  const p = itemLevelProgress(cfg.output);
  badge.textContent = String(p.level);
  fill.style.width = (p.into / p.need * 100).toFixed(1) + "%";
  if (flash) {
    badge.classList.remove("pop");
    void badge.offsetWidth;
    badge.classList.add("pop");
  }
}

export function drawAllItemLevels() {
  Object.keys(STATIONS).forEach(function (id) { drawItemLevel(id, false); });
}

Object.keys(STATIONS).forEach(function (id) {
  const pill = pillFor(id);
  if (pill) pill.addEventListener("click", function () { startStation(id); });
  const back = el("back-" + id);
  if (back) back.addEventListener("click", function () { show("home"); });
});

export function applyStationSprites() {
  Object.keys(STATIONS).forEach(function (id) {
    const pill = pillFor(id);
    if (pill) useSprite(pill.querySelector(".pill-icon"), "stations/" + id);
  });
}
