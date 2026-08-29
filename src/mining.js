// ================================================================= mining
//
// "The Shaft" -- a default skill, not a buildable station, and the first
// genuine risk/reward loop in the game. Balanced against the mining
// spreadsheet (2026-08-28): digging is swing-based, not one-tap-one-result.
// Every tap of Dig is instant and fills the pill by 1/clicksPerSwing (the
// equipped pickaxe's own count) -- there's no per-click timer, the player
// taps as fast as they physically can. Only the swing's *last* click
// actually resolves anything: either it goes well (depth advances by
// depthPerSwing, ore rolled from the current depth's pool, XP) or it
// triggers a cave-in that ends the trip on the spot and wipes whatever's
// been carried since the last time the player chose to surface. Nothing is
// safe until banked -- `bag` never sees a single ore until Surface is tapped.
//
// The pickaxe is a real bag item, equipped through the Inventory's Pickaxe
// slot (state.equipment.pick) -- whichever one is equipped is what this
// file reads for clicksPerSwing, riskPerSwing (flat, not depth-scaled --
// see PICKAXES in data.js), depthPerSwing and maxDepth. maxDepth is a hard
// wall: past it, no new swing can even start.
//
// Surfacing banks everything the instant it's tapped -- no wait, no
// separate climb. What it costs instead is a cooldown before the *next*
// dig can start, scaled to the depth reached (cooldownFor() below) -- a
// cave-in's is the same formula, doubled. Both just set the one
// state.mineCooldownUntil deadline, checked by onCooldown() below.

import {
  MINE_XP, MINE_HAZARD_MAX,
  MINE_SURFACE_MS_PER_10M, MINE_CAVEIN_MULT, MINE_MATERIALS, PICKAXES,
} from "./data.js";
import { state, save, gainItem } from "./state.js";
import { levelProgress } from "./skills.js";
import { pillFor } from "./pills.js";
import { useSprite } from "./sprites.js";
import { el } from "./dom.js";
import { show } from "./screens.js";
import { drawBag, updateSkillsNote } from "./hub.js";

function onCooldown() { return Date.now() < state.mineCooldownUntil; }

// 1 second per 10m of depth reached this trip -- a cave-in doubles it
// (MINE_CAVEIN_MULT), same formula either way rather than two unrelated
// numbers to keep in sync by hand.
function cooldownFor(depth, caveIn) {
  const base = (depth / 10) * MINE_SURFACE_MS_PER_10M;
  return caveIn ? base * MINE_CAVEIN_MULT : base;
}

// Falls back to the Wooden Pickaxe's own numbers if somehow nothing is
// equipped (the slot was unequipped mid-visit) rather than throwing --
// tapDig() below still refuses to dig with nothing equipped at all.
function pickaxe() {
  return PICKAXES[state.equipment.pick] || PICKAXES["Wooden Pickaxe"];
}

// Cumulative, not exclusive -- every material whose minDepth (and maxDepth,
// for the few bounded ones like Basalt) the given depth falls inside is in
// the pool at once, weighted by MINE_MATERIALS' `weight`.
function poolFor(depth) {
  const names = Object.keys(MINE_MATERIALS).filter(function (name) {
    const m = MINE_MATERIALS[name];
    return depth >= m.minDepth && (m.maxDepth === undefined || depth <= m.maxDepth);
  });
  const total = names.reduce(function (sum, name) { return sum + MINE_MATERIALS[name].weight; }, 0);
  return names.map(function (name) { return { item: name, chance: MINE_MATERIALS[name].weight / total }; });
}

// How many of the rolled material one successful swing actually banks --
// 1 for anything that doesn't set its own `yield` (every gemstone, plus
// every ore above Stone/Coal/Basalt), straight off MINE_MATERIALS.
function yieldFor(item) {
  return MINE_MATERIALS[item].yield || 1;
}

function rollOre(depth) {
  const pool = poolFor(depth);
  const roll = Math.random();
  let acc = 0;
  for (let i = 0; i < pool.length; i++) {
    acc += pool[i].chance;
    if (roll < acc) return pool[i].item;
  }
  return pool[pool.length - 1].item;
}

// Flat per-swing hazard, straight off the equipped pickaxe -- no depth
// scaling. Clamped the same way the old formula was, just with nothing
// left to clamp in practice at these numbers.
function hazardChance() {
  return Math.max(0, Math.min(MINE_HAZARD_MAX, pickaxe().riskPerSwing));
}

let hintTimer = 0;
function hint(text) {
  el("mine-hint").textContent = text;
  clearTimeout(hintTimer);
  hintTimer = setTimeout(function () {
    el("mine-hint").textContent = "Tap Dig to swing.";
  }, 2400);
}

function shake(node) {
  node.classList.remove("shake");
  void node.offsetWidth;
  node.classList.add("shake");
}

// The pill's fill jumps straight to the new click count every tap -- a
// short, fixed CSS transition (not derived from any timer, there isn't
// one) tweens it, and retargets cleanly if the next tap lands before the
// last one finished animating. That's what lets the player tap as fast as
// they want without the bar looking broken.
function setSwingFill(pct) {
  const fill = pillFor("mine-dig").querySelector(".pill-fill");
  fill.style.transitionDuration = "120ms";
  fill.style.width = pct + "%";
}

// One tap, resolved synchronously -- no deadline, nothing to settle later.
// Most taps just advance swingProgress and wait for the next one; only the
// swing's last tap actually rolls hazard/reward.
function tapDig() {
  const pill = pillFor("mine-dig");
  if (onCooldown()) {
    hint("Shaken up from the fall -- " + Math.ceil((state.mineCooldownUntil - Date.now()) / 1000) + "s left.");
    shake(pill);
    return;
  }
  if (!state.equipment.pick) {
    hint("Equip a pickaxe first.");
    shake(pill);
    return;
  }
  const p = pickaxe();
  if (state.swingProgress === 0 && state.depth >= p.maxDepth) {
    hint("Your " + state.equipment.pick + " can't dig any deeper. Craft a stronger one.");
    shake(pill);
    return;
  }

  state.swingProgress += 1;
  setSwingFill(state.swingProgress / p.clicksPerSwing * 100);

  if (state.swingProgress < p.clicksPerSwing) {
    // No hint text here on purpose -- the pill's own fill bar already
    // shows progress toward the swing, spelling out "Click 3/12" too is
    // redundant with what the player just watched happen.
    save();
    refreshMining();
    return;
  }

  state.swingProgress = 0;
  setSwingFill(0);

  if (Math.random() < hazardChance()) {
    const lost = Object.keys(state.carried).length > 0;
    const depthReached = state.depth;
    state.depth = 0;
    state.carried = {};
    state.mineCooldownUntil = Date.now() + cooldownFor(depthReached, true);
    save();
    hint(lost ? "Cave-in! Everything carried this trip is gone." : "Cave-in! You escaped with nothing to lose.");
    flashCaveIn();
    refreshMining();
    return;
  }

  const newDepth = Math.min(p.maxDepth, state.depth + p.depthPerSwing);
  const item = rollOre(newDepth);
  const amount = yieldFor(item);
  state.depth = newDepth;
  state.carried[item] = (state.carried[item] || 0) + amount;
  state.miningXp += MINE_XP;
  save();
  updateSkillsNote();
  drawMiningXp();
  hint("+" + amount + " " + item + " (depth " + newDepth + "m)");
  refreshMining();
}

function flashCaveIn() {
  const status = el("mine-status");
  if (!status) return;
  status.classList.remove("cave-in-flash");
  void status.offsetWidth;
  status.classList.add("cave-in-flash");
}

// Banks the whole pouch immediately -- no climb, no wait. The cost is a
// cooldown before the next dig can start, not a delay on the reward itself.
function bankAndSurface() {
  const items = Object.keys(state.carried);
  if (items.length === 0) { hint("Nothing carried yet."); return; }
  items.forEach(function (item) {
    gainItem(item, state.carried[item]);
  });
  const depthReached = state.depth;
  state.carried = {};
  state.depth = 0;
  state.mineCooldownUntil = Date.now() + cooldownFor(depthReached, false);
  save();
  drawBag();
  hint("Surfaced from depth " + depthReached + "m with everything banked.");
  refreshMining();
}

let miningLevelBefore = null;

export function drawMiningXp() {
  const p = levelProgress(state.miningXp);
  el("mining-xp-level").textContent = "Mining — Level " + p.level;
  el("mining-xp-count").textContent = p.into + " / " + p.need;
  el("mining-xp-fill").style.width = (Math.min(1, p.into / p.need) * 100).toFixed(1) + "%";

  if (miningLevelBefore !== null && p.level > miningLevelBefore) {
    const bar = document.querySelector("#screen-mining .xp-bar");
    bar.classList.remove("levelup");
    void bar.offsetWidth;
    bar.classList.add("levelup");
  }
  miningLevelBefore = p.level;
}

function drawCarried() {
  const wrap = el("mine-carried");
  wrap.replaceChildren();
  const items = Object.keys(state.carried);
  if (items.length === 0) {
    const empty = document.createElement("span");
    empty.className = "chip empty";
    empty.textContent = "Nothing carried yet";
    wrap.append(empty);
    return;
  }
  items.forEach(function (item) {
    const chip = document.createElement("span");
    chip.className = "chip";
    const dot = document.createElement("span");
    dot.className = "dot";
    dot.style.background = "var(--dim)";
    chip.append(dot, item + " " + state.carried[item]);
    wrap.append(chip);
  });
}

export function refreshMining() {
  const cooldown = onCooldown();
  const p = pickaxe();
  el("mine-depth-num").textContent = state.depth;
  el("mine-pickaxe-name").textContent = state.equipment.pick || "No pickaxe equipped";
  drawCarried();

  const pill = pillFor("mine-dig");
  // Says which pickaxe is actually driving the numbers below it (clicks per
  // swing, risk, depth per swing all come off whatever's equipped in the
  // Pick slot -- see pickaxe() above) rather than a fixed "Dig Deeper",
  // same reasoning the Farm/Logging tool buttons already show their own
  // equipped item's name instead of a generic label.
  pill.querySelector(".pill-name").textContent =
    "Swing " + (state.equipment.pick || "No Pickaxe");
  const atWall = state.equipment.pick && state.swingProgress === 0 && state.depth >= p.maxDepth;
  if (cooldown) {
    pill.querySelector(".pill-sub").textContent = "Recovering — " + Math.ceil((state.mineCooldownUntil - Date.now()) / 1000) + "s";
  } else if (!state.equipment.pick) {
    pill.querySelector(".pill-sub").textContent = "No pickaxe equipped";
  } else if (atWall) {
    pill.querySelector(".pill-sub").textContent = "Too deep for this pickaxe";
  } else {
    // No "Click X/N" here -- the pill's own fill bar already shows swing
    // progress, spelling it out in text too is redundant.
    const riskPct = Math.round(hazardChance() * 100);
    pill.querySelector(".pill-sub").textContent = riskPct + "% risk · +" + p.depthPerSwing + "m";
  }
  pill.classList.toggle("unaffordable", cooldown || !state.equipment.pick || atWall);

  const surfaceBtn = el("mine-surface-btn");
  const carriedCount = Object.keys(state.carried).length;
  surfaceBtn.classList.toggle("unaffordable", carriedCount === 0);
  el("mine-bank-preview").textContent =
    carriedCount === 0 ? "Nothing carried yet" : "Bank everything from depth " + state.depth + "m";
}

pillFor("mine-dig").addEventListener("click", tapDig);
el("mine-surface-btn").addEventListener("click", bankAndSurface);
el("back-mining").addEventListener("click", function () { show("home"); });

export function applyMiningSprites() {
  useSprite(pillFor("mine-dig").querySelector(".pill-icon"), "mining/pickaxe");
}
