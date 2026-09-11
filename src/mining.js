// ================================================================= mining
//
// "The Shaft" -- a default skill, not a buildable station, and the first
// genuine risk/reward loop in the game. Balanced against the mining
// spreadsheet (2026-08-28); single-tap-and-timer now (2026-08-31), same
// shape as every other pill in this game (Crafting, Foraging, the
// conversion stations): one tap starts a swing (state.mineSwing =
// {startedAt, readyAt}), no more taps needed, and it resolves on its own
// the moment that deadline passes -- either it goes well (depth advances
// by depthPerSwing, ore rolled from the current depth's pool, XP) or it
// triggers a cave-in that ends the trip on the spot and wipes whatever's
// been carried since the last time the player chose to surface. Nothing is
// safe until banked -- `bag` never sees a single ore until Surface is tapped.
//
// The pickaxe is a real bag item, equipped through the Inventory's Pickaxe
// slot (state.equipment.pick) -- whichever one is equipped is what this
// file reads for `ms` (swing duration), riskPerSwing (flat, not
// depth-scaled -- see PICKAXES in data.js), depthPerSwing and maxDepth.
// maxDepth is a hard wall: past it, no new swing can even start. Speed is
// read fresh at the moment a swing starts (startDig() below), so
// re-equipping mid-visit only speeds up the *next* swing, not one already
// in flight.
//
// Surfacing banks everything the instant it's tapped -- no wait, no
// separate climb. What it costs instead is a cooldown before the *next*
// dig can start, scaled to the depth reached (cooldownFor() below) -- a
// cave-in's is the same formula, doubled. Both just set the one
// state.mineCooldownUntil deadline, checked by onCooldown() below.

import {
  MINE_XP, MINE_HAZARD_MAX,
  MINE_SURFACE_MS_PER_10M, MINE_CAVEIN_MULT, MINE_MATERIALS, MINE_ZONES, PICKAXES,
  EQUIP_SLOTS, EQUIPMENT, TINTS,
} from "./data.js";
import { state, save, gainItem, gainSkillXp } from "./state.js";
import { openZoneWheel } from "./zoneWheel.js";
import { levelProgress } from "./skills.js";
import { pillFor, setPillFill } from "./pills.js";
import { useSprite, slug } from "./sprites.js";
import { el } from "./dom.js";
import { show } from "./screens.js";
import { drawBag, updateSkillsNote } from "./hub.js";
import { openSheet, closeSheet } from "./sheet.js";

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
// startDig() below still refuses to dig with nothing equipped at all.
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

// The deepest MINE_ZONES entry whose minDepth the current depth has
// reached -- MINE_ZONES is sorted shallow-to-deep, so the last match wins.
// Purely which illustration/label to show (see drawMineArt() below); what's
// actually rollable at this depth is still MINE_MATERIALS' own cumulative
// pool, untouched by this.
function currentZone(depth) {
  let zone = MINE_ZONES[0];
  MINE_ZONES.forEach(function (z) { if (depth >= z.minDepth) zone = z; });
  return zone;
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

// One tap starts a swing if nothing's already running -- silent no-op
// otherwise, same "already running" rule startCraft() and startForage()
// follow. Every number the swing's own outcome depends on (speed, risk,
// depthPerSwing, maxDepth) is read off the equipped pickaxe and locked
// into state.mineSwing right here, same "recipe locked at start" rule
// craft.js's startCraft() follows -- without it, swapping to a better
// pickaxe in the seconds before a swing resolves would retroactively
// cheat that swing's own risk and reward.
function startDig() {
  const pill = pillFor("mine-dig");
  if (state.mineSwing) return;
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
  if (state.depth >= p.maxDepth) {
    hint("Your " + state.equipment.pick + " can't dig any deeper. Craft a stronger one.");
    shake(pill);
    return;
  }

  state.mineSwing = {
    startedAt: Date.now(), readyAt: Date.now() + p.ms,
    risk: hazardChance(), depthPerSwing: p.depthPerSwing, maxDepth: p.maxDepth,
  };
  save();

  const fill = pill.querySelector(".pill-fill");
  fill.style.transitionDuration = "0ms";
  fill.style.width = "0%";
  void fill.offsetWidth;
  setPillFill("mine-dig", 100, p.ms);
  refreshMining();
}

// Called every tick (main.js), same shape as settleCraft()/settleForage()
// -- resolves the running swing the instant its deadline passes, using the
// numbers locked into it at startDig() (not whatever's currently
// equipped): either a cave-in (its own `risk` roll) or a successful dig,
// exactly the payout the old last-click of a multi-tap swing used to
// produce, just reached by a timer now instead of a click count.
export function settleMining() {
  const swing = state.mineSwing;
  if (!swing || Date.now() < swing.readyAt) return;
  state.mineSwing = null;
  // Same reset every other pill's settle step does -- without it the fill
  // bar sits at its last-drawn 100% (fully colored) forever.
  setPillFill("mine-dig", 0, 0);

  if (Math.random() < swing.risk) {
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

  const newDepth = Math.min(swing.maxDepth, state.depth + swing.depthPerSwing);
  const item = rollOre(newDepth);
  const amount = yieldFor(item);
  state.depth = newDepth;
  state.carried[item] = (state.carried[item] || 0) + amount;
  const zoneLevels = gainSkillXp("miningXp", MINE_XP);
  save();
  if (zoneLevels) openZoneWheel(state.currentLocation, zoneLevels);
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
// Blocked mid-swing -- the character's still got the pickaxe up, not free
// to climb -- same "already busy" reasoning startDig() itself uses against
// a second swing; the swing finishes (or cave-in) on its own regardless.
function bankAndSurface() {
  if (state.mineSwing) { hint("Can't surface mid-swing."); shake(el("mine-surface-btn")); return; }
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

// ------------------------------------------------------------ pickaxe slot
//
// Equip/change the Pickaxe straight from here -- same system Logging
// already set up for its own Axe (see logging.js's drawAxeSlot()/
// openAxePicker(), which this mirrors), writing the exact same
// state.equipment.pick field pickaxe() above already reads live. The
// compact "No pickaxe equipped" label inside the art banner overlay
// (#mine-pickaxe-name) is untouched -- this is a second, real equip row
// beneath the XP bar, same placement Logging's own Axe slot uses.

function itemGet(container, name) { return container[name] || 0; }

function itemAdd(container, name, amount) {
  const next = itemGet(container, name) + amount;
  if (next <= 0) delete container[name];
  else container[name] = next;
}

const PICK_SLOT = EQUIP_SLOTS.find(function (s) { return s.id === "pick"; });

// Equipping over an already-filled slot swaps in one tap -- the old
// pickaxe goes back to the bag first, same rule inventory.js's own
// equip() follows. Mid-swing is blocked -- same "can't swap tools while
// mid-action" reasoning startDig()/bankAndSurface() already enforce
// elsewhere, so a swing already locked to the old pickaxe's numbers
// (startDig()'s own comment) never gets silently invalidated out from
// under itself.
function equipPickaxe(name) {
  if (state.mineSwing) return;
  const previous = state.equipment.pick;
  if (previous) itemAdd(state.bag, previous, 1);
  itemAdd(state.bag, name, -1);
  state.equipment.pick = name;
  save();
  refreshMining();
}

function unequipPickaxe() {
  if (state.mineSwing) return;
  const name = state.equipment.pick;
  if (!name) return;
  itemAdd(state.bag, name, 1);
  state.equipment.pick = null;
  save();
  refreshMining();
}

// One full-width pill, same shape Logging's own drawAxeSlot() builds.
function drawPickaxeSlot() {
  const wrap = el("mine-pickaxe-slot");
  if (!wrap) return;
  wrap.replaceChildren();
  const equipped = state.equipment.pick;

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
  name.textContent = "Pickaxe";
  const sub = document.createElement("span");
  sub.className = "pill-sub";
  // Speed/risk/depth right alongside the name -- what's actually driving
  // startDig()'s own numbers -- rather than a bare item name the player
  // has to already know the stats behind.
  sub.textContent = equipped
    ? equipped + " · " + Math.round(PICKAXES[equipped].riskPerSwing * 100) + "% risk · +" + PICKAXES[equipped].depthPerSwing + "m"
    : "Empty — tap to equip";
  body.append(name, sub);

  btn.append(icon, body);
  btn.addEventListener("click", openPickaxePicker);
  wrap.append(btn);
}

// Same picker shape Logging's own openAxePicker() uses -- an "Unequip" row
// (if something's equipped) followed by every owned pickaxe not already
// equipped, using the shared sheet rather than a picker this screen owns.
function openPickaxePicker() {
  if (state.mineSwing) return;
  const body = el("sheet-body");
  body.replaceChildren();

  const equipped = state.equipment.pick;
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
      unequipPickaxe();
    });
    body.append(unequipRow);
  }

  const options = Object.keys(EQUIPMENT).filter(function (name) {
    return EQUIPMENT[name] === "pick" && name !== equipped && itemGet(state.bag, name) > 0;
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
      equipPickaxe(name);
    });
    body.append(row);
  });

  openSheet(PICK_SLOT ? "Equip " + PICK_SLOT.name.toLowerCase() : "Equip pickaxe");
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

// The big art banner up top -- swaps to whatever depth zone the player's
// actually reached, same useSprite()/fallback pattern every other sprite
// slot in this game uses. Cheap enough to call on every refreshMining()
// (useSprite() already no-ops when the key hasn't changed since the last
// call), so the banner updates the instant a swing crosses into a new
// zone, not just on next screen open.
function drawMineArt() {
  const zone = currentZone(state.depth);
  useSprite(el("mine-art"), "mining/zones/" + slug(zone.name));
  el("mine-art-label").textContent = zone.name;
}

// Keep the swing control's art on the same equipment source of truth as its
// label and stats. Swapping tools now updates this icon immediately; an empty
// slot falls back to the generic mining placeholder instead of a stale item.
function drawDigPickaxeSprite() {
  const icon = pillFor("mine-dig").querySelector(".pill-icon");
  const key = state.equipment.pick
    ? "items/" + slug(state.equipment.pick)
    : "mining/pickaxe";
  useSprite(icon, key);
}

export function refreshMining() {
  const cooldown = onCooldown();
  const p = pickaxe();
  drawMineArt();
  el("mine-depth-num").textContent = state.depth;
  el("mine-pickaxe-name").textContent = state.equipment.pick || "No pickaxe equipped";
  drawPickaxeSlot();
  drawCarried();

  const pill = pillFor("mine-dig");
  drawDigPickaxeSprite();
  // Says which pickaxe is actually driving the numbers below it (speed,
  // risk, depth per swing all come off whatever's equipped in the Pick
  // slot -- see pickaxe() above) rather than a fixed "Dig Deeper", same
  // reasoning the Farm/Logging tool buttons already show their own
  // equipped item's name instead of a generic label.
  pill.querySelector(".pill-name").textContent =
    "Swing " + (state.equipment.pick || "No Pickaxe");
  const swinging = !!state.mineSwing;
  const atWall = state.equipment.pick && !swinging && state.depth >= p.maxDepth;
  if (swinging) {
    pill.querySelector(".pill-sub").textContent = "Swinging…";
  } else if (cooldown) {
    pill.querySelector(".pill-sub").textContent = "Recovering — " + Math.ceil((state.mineCooldownUntil - Date.now()) / 1000) + "s";
  } else if (!state.equipment.pick) {
    pill.querySelector(".pill-sub").textContent = "No pickaxe equipped";
  } else if (atWall) {
    pill.querySelector(".pill-sub").textContent = "Too deep for this pickaxe";
  } else {
    const riskPct = Math.round(hazardChance() * 100);
    pill.querySelector(".pill-sub").textContent = riskPct + "% risk · +" + p.depthPerSwing + "m";
  }
  pill.classList.toggle("active", swinging);
  pill.classList.toggle("unaffordable", !swinging && (cooldown || !state.equipment.pick || atWall));

  const surfaceBtn = el("mine-surface-btn");
  const carriedCount = Object.keys(state.carried).length;
  surfaceBtn.classList.toggle("unaffordable", swinging || carriedCount === 0);
  el("mine-bank-preview").textContent = swinging
    ? "Mid-swing — can't surface yet"
    : carriedCount === 0 ? "Nothing carried yet" : "Bank everything from depth " + state.depth + "m";
  drawSurfaceCooldown(cooldown);
}

// The same cooldown that blocks the next Dig (state.mineCooldownUntil) also
// fills a yellow bar across Surface & Bank -- "time to surface" -- reading
// it as the climb back up rather than just a Dig-side wait. Set once per
// cooldown (cooldownFillActive guards against retriggering the CSS
// transition every tick, which would otherwise look choppy), whether that
// cooldown just started (bankAndSurface()/a cave-in both call refreshMining()
// right after setting it) or is being resumed after a reload -- either way
// this is the first refreshMining() call to see it, so "remaining time"
// happens to equal "the whole thing" for a fresh one and the true remainder
// for a resumed one, no separate code path needed for either case. Reset
// back to 0% the instant the cooldown actually ends (the falling edge),
// same "point it at 0% when done" rule every other pill's fill follows.
let cooldownFillActive = false;
function drawSurfaceCooldown(cooldown) {
  const fill = el("mine-surface-btn").querySelector(".mine-surface-fill");
  if (cooldown && !cooldownFillActive) {
    cooldownFillActive = true;
    const ms = Math.max(0, state.mineCooldownUntil - Date.now());
    fill.style.transitionDuration = "0ms";
    fill.style.width = "0%";
    void fill.offsetWidth;
    fill.style.transitionDuration = ms + "ms";
    fill.style.width = "100%";
  } else if (!cooldown && cooldownFillActive) {
    cooldownFillActive = false;
    fill.style.transitionDuration = "0ms";
    fill.style.width = "0%";
  }
}

pillFor("mine-dig").addEventListener("click", startDig);
el("mine-surface-btn").addEventListener("click", bankAndSurface);
el("back-mining").addEventListener("click", function () { show("explore"); });

export function applyMiningSprites() {
  drawDigPickaxeSprite();
  useSprite(el("mine-surface-icon"), "mining/surface");
}
