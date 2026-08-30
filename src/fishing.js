// ================================================================ fishing
//
// Three tools, three different mechanics -- see the FISHING section of
// data.js for the reasoning behind each. This file is the whole loop;
// index.html just has three sub-pages (Rod/Net/Trap) toggled the same way
// Market's Sell/Buy/Bank tabs already are.
//
// Rod: a reflex minigame, resolved with real timestamps (biteAt/expiresAt)
// rather than a running countdown -- same "deadline, not countdown" rule
// as every other timer in this game, so backgrounding the tab mid-cast
// just means the bite window may already have passed by the time it's
// looked at again (a miss, not a bug). Net: a tap-swing, identical shape
// to Mining's dig. Trap: a deadline that resolves and banks itself on its
// own, like a Campfire item, no tap required.

import {
  FISH_POOLS, BAITS, FISH_XP_ROD, FISH_XP_NET, FISH_XP_TRAP,
  FISH_NET_CLICKS_PER_SWING, FISH_TRAP_MS, FISH_BITE_DELAY_MIN_MS,
  FISH_BITE_DELAY_MAX_MS, FISH_BITE_WINDOW_MS, LOCATIONS,
} from "./data.js";
import { state, save, gainItem } from "./state.js";
import { isNight } from "./time.js";
import { levelProgress } from "./skills.js";
import { pillFor } from "./pills.js";
import { useSprite } from "./sprites.js";
import { el } from "./dom.js";
import { show } from "./screens.js";
import { updateSkillsNote } from "./hub.js";

// -------------------------------------------------------------- location

function currentPoolId() {
  const loc = LOCATIONS[state.currentLocation];
  return loc ? loc.fishing : null;
}

function canFishHere() {
  return !!currentPoolId();
}

// -------------------------------------------------------------- rolling

// Sums whatever's left after filtering rather than assuming chances sum to
// 1 -- stays correct even after nightOnly/rare entries get dropped, unlike
// forage's own roll (which can get away with the sum=1 assumption since it
// never filters its pool first).
function weightedRoll(entries) {
  const total = entries.reduce(function (sum, e) { return sum + e.chance; }, 0);
  if (total <= 0) return null;
  let roll = Math.random() * total;
  for (let i = 0; i < entries.length; i++) {
    roll -= entries[i].chance;
    if (roll < 0) return entries[i].item;
  }
  return entries[entries.length - 1].item;   // floating-point rounding safety net
}

// full=true (Rod): rare included, nightOnly included only if isNight().
// full=false (Net/Trap): rare and nightOnly both excluded outright --
// that's the whole reason those tools are worth less per catch.
function rollFish(poolId, full, baitName) {
  const pool = FISH_POOLS[poolId] || [];
  const night = isNight();
  const boosts = (full && baitName && BAITS[baitName]) ? BAITS[baitName].boosts : null;
  const entries = pool
    .filter(function (f) {
      if (!full) return !f.rare && !f.nightOnly;
      if (f.nightOnly) return night;
      return true;
    })
    .map(function (f) {
      const boost = (boosts && boosts[f.item]) || 1;
      return { item: f.item, chance: f.chance * boost };
    });
  return weightedRoll(entries);
}

// -------------------------------------------------------------- tools

function hasRod() { return !!state.equipment.fishing; }
function hasNet() { return (state.bag["Net"] || 0) > 0; }
function hasTrap() { return (state.bag["Trap"] || 0) > 0; }

function ownedBaits() {
  return Object.keys(BAITS).filter(function (b) { return (state.bag[b] || 0) > 0; });
}

function hint(id, text) {
  const node = el(id);
  if (node) node.textContent = text;
}

function shakePill(item) {
  const pill = pillFor(item);
  pill.classList.remove("shake");
  void pill.offsetWidth;
  pill.classList.add("shake");
}

// -------------------------------------------------------------------- rod
//
// Not persisted on purpose -- a mid-cast reset on reload is an acceptable
// simplification for a window this short, same reasoning kept the save
// shape from growing another timer for something so transient.
let rod = { phase: "idle", biteAt: 0, expiresAt: 0, resultUntil: 0, resultText: "" };

function castRod() {
  if (rod.phase !== "idle") return;
  if (!hasRod()) { hint("fish-rod-hint", "Equip a Fishing Rod first."); shakePill("fish-cast"); return; }
  if (!canFishHere()) { hint("fish-rod-hint", "Nothing to fish here."); shakePill("fish-cast"); return; }

  if (state.fishing.bait && (state.bag[state.fishing.bait] || 0) > 0) {
    state.bag[state.fishing.bait] -= 1;
    if (state.bag[state.fishing.bait] <= 0) delete state.bag[state.fishing.bait];
    save();
    drawBaitRow();
  }

  const delay = FISH_BITE_DELAY_MIN_MS + Math.random() * (FISH_BITE_DELAY_MAX_MS - FISH_BITE_DELAY_MIN_MS);
  rod.phase = "waiting";
  rod.biteAt = Date.now() + delay;
  rod.expiresAt = 0;
  drawFishingRod();
}

// A tap while waiting (too early) or during a result flash does nothing --
// only a tap that actually lands inside the bite window counts.
function tapCast() {
  if (rod.phase === "idle") { castRod(); return; }
  if (rod.phase === "biting") { resolveBite(true); }
}

function resolveBite(hit) {
  if (hit) {
    const item = rollFish(currentPoolId(), true, state.fishing.bait);
    gainItem(item, 1);
    state.fishingXp += FISH_XP_ROD;
    save();
    updateSkillsNote();
    rod.resultText = "Caught a " + item + "!";
  } else {
    rod.resultText = "The fish got away.";
  }
  rod.phase = "result";
  rod.resultUntil = Date.now() + 1800;
  drawFishingRod();
}

function drawFishingRod() {
  const pill = pillFor("fish-cast");
  const name = pill.querySelector(".pill-name");
  const sub = pill.querySelector(".pill-sub");
  pill.classList.remove("bite-flash");

  if (!hasRod()) {
    name.textContent = "Cast";
    sub.textContent = "Equip a Fishing Rod first";
    pill.classList.add("unaffordable");
    return;
  }
  if (!canFishHere()) {
    name.textContent = "Cast";
    sub.textContent = "Nothing to fish here";
    pill.classList.add("unaffordable");
    return;
  }
  pill.classList.remove("unaffordable");

  if (rod.phase === "waiting") {
    name.textContent = "Waiting...";
    sub.textContent = "Watch for the bite";
  } else if (rod.phase === "biting") {
    name.textContent = "BITE! Tap now!";
    sub.textContent = "Quick!";
    pill.classList.add("bite-flash");
  } else if (rod.phase === "result") {
    name.textContent = "Cast";
    sub.textContent = rod.resultText;
  } else {
    name.textContent = "Cast";
    sub.textContent = state.fishing.bait ? "Baited with " + state.fishing.bait : "Tap to cast";
  }
}

// Advances waiting -> biting -> (miss) -> idle purely off real timestamps
// -- called every tick while the Fishing screen is open (see
// refreshFishing() below), same reasoning Combat's own countdown redraw
// follows for its two deadlines.
function tickRod() {
  if (rod.phase === "waiting" && Date.now() >= rod.biteAt) {
    rod.phase = "biting";
    rod.expiresAt = Date.now() + FISH_BITE_WINDOW_MS;
    drawFishingRod();
  } else if (rod.phase === "biting" && Date.now() >= rod.expiresAt) {
    resolveBite(false);
  } else if (rod.phase === "result" && Date.now() >= rod.resultUntil) {
    rod.phase = "idle";
    drawFishingRod();
  }
}

// ---------------------------------------------------------------- baiting

function drawBaitRow() {
  const row = el("fish-bait-row");
  row.replaceChildren();
  const owned = ownedBaits();

  // A stale selection (the last of that bait just got used, or a save
  // predates it existing) clears itself rather than silently pretending
  // to still be equipped.
  if (state.fishing.bait && owned.indexOf(state.fishing.bait) < 0) {
    state.fishing.bait = null;
    save();
  }

  const none = document.createElement("button");
  none.className = "fish-bait-chip" + (state.fishing.bait ? "" : " active");
  none.textContent = "No bait";
  none.addEventListener("click", function () { selectBait(null); });
  row.append(none);

  if (owned.length === 0) {
    const empty = document.createElement("span");
    empty.className = "chip empty";
    empty.textContent = "Craft bait at the Craft Bench";
    row.append(empty);
    return;
  }

  owned.forEach(function (name) {
    const chip = document.createElement("button");
    chip.className = "fish-bait-chip" + (state.fishing.bait === name ? " active" : "");
    chip.textContent = name + " (" + state.bag[name] + ")";
    chip.addEventListener("click", function () { selectBait(name); });
    row.append(chip);
  });
}

function selectBait(name) {
  state.fishing.bait = name;
  save();
  drawBaitRow();
  drawFishingRod();
}

// -------------------------------------------------------------------- net

function setNetFill(pct) {
  const fill = pillFor("fish-net").querySelector(".pill-fill");
  fill.style.transitionDuration = "120ms";
  fill.style.width = pct + "%";
}

// Not persisted, same reasoning as the Rod's own phase -- a swing reset on
// reload is an acceptable simplification for a v1 pass.
let netProgress = 0;

function tapNet() {
  if (!hasNet()) { hint("fish-net-hint", "You need a Net."); shakePill("fish-net"); return; }
  if (!canFishHere()) { hint("fish-net-hint", "Nothing to fish here."); shakePill("fish-net"); return; }

  netProgress += 1;
  setNetFill(netProgress / FISH_NET_CLICKS_PER_SWING * 100);
  if (netProgress < FISH_NET_CLICKS_PER_SWING) {
    save();
    return;
  }

  netProgress = 0;
  setNetFill(0);
  const a = rollFish(currentPoolId(), false, null);
  const b = rollFish(currentPoolId(), false, null);
  gainItem(a, 1);
  gainItem(b, 1);
  state.fishingXp += FISH_XP_NET;
  save();
  updateSkillsNote();
  hint("fish-net-hint", a === b ? "+2 " + a : "+1 " + a + ", +1 " + b);
  drawFishingNet();
}

function drawFishingNet() {
  const pill = pillFor("fish-net");
  const sub = pill.querySelector(".pill-sub");
  if (!hasNet()) {
    sub.textContent = "You need a Net";
    pill.classList.add("unaffordable");
  } else if (!canFishHere()) {
    sub.textContent = "Nothing to fish here";
    pill.classList.add("unaffordable");
  } else {
    pill.classList.remove("unaffordable");
    sub.textContent = "Tap to sweep -- 2 common fish";
  }
}

// ------------------------------------------------------------------- trap

function setTrap() {
  if (state.fishing.trap) return;
  if (!hasTrap()) { hint("fish-trap-hint", "You need a Trap."); return; }
  if (!canFishHere()) { hint("fish-trap-hint", "Nothing to fish here."); return; }
  state.fishing.trap = { poolId: currentPoolId(), readyAt: Date.now() + FISH_TRAP_MS };
  save();
  drawFishingTrap();
}

// Called every tick, unconditionally (see main.js) -- same shape as
// settleCampfire(): banks itself the instant it's ready, no tap needed,
// wherever the player happens to be. Returns the item caught (or null) so
// the caller can decide whether to redraw the bag, same contract
// settleCampfire() already has. Guards against the pool it was set at no
// longer existing (a save from before a location got renamed/removed) by
// just clearing the trap in place rather than crashing on it.
export function settleFishingTrap() {
  const t = state.fishing.trap;
  if (!t) return null;
  if (!FISH_POOLS[t.poolId]) { state.fishing.trap = null; save(); return null; }
  if (Date.now() < t.readyAt) return null;
  const item = rollFish(t.poolId, false, null);
  gainItem(item, 1);
  state.fishingXp += FISH_XP_TRAP;
  state.fishing.trap = null;
  save();
  return item;
}

function drawFishingTrap() {
  const btn = el("fish-trap-btn");
  const name = el("fish-trap-name");
  const sub = el("fish-trap-sub");

  if (state.fishing.trap) {
    const remain = Math.max(0, state.fishing.trap.readyAt - Date.now());
    name.textContent = "Trap set";
    sub.textContent = remain > 0
      ? "Checking in " + Math.ceil(remain / 1000) + "s"
      : "Should be ready any moment...";
    btn.classList.add("unaffordable");
    return;
  }
  btn.classList.remove("unaffordable");
  if (!hasTrap()) {
    name.textContent = "Set Trap";
    sub.textContent = "You need a Trap";
  } else if (!canFishHere()) {
    name.textContent = "Set Trap";
    sub.textContent = "Nothing to fish here";
  } else {
    name.textContent = "Set Trap";
    sub.textContent = "Ready in " + Math.round(FISH_TRAP_MS / 60000) + " minutes -- no tapping required";
  }
}

// ------------------------------------------------------------ screen shell

let mode = "rod";   // "rod" | "net" | "trap" -- not persisted, same as market.js's own `view`

function setMode(next) {
  mode = next;
  el("fish-tool-rod").classList.toggle("active", mode === "rod");
  el("fish-tool-net").classList.toggle("active", mode === "net");
  el("fish-tool-trap").classList.toggle("active", mode === "trap");
  el("fish-rod-page").classList.toggle("hidden", mode !== "rod");
  el("fish-net-page").classList.toggle("hidden", mode !== "net");
  el("fish-trap-page").classList.toggle("hidden", mode !== "trap");
}

export function drawFishingXp() {
  const p = levelProgress(state.fishingXp);
  el("fishing-xp-level").textContent = "Fishing — Level " + p.level;
  el("fishing-xp-count").textContent = p.into + " / " + p.need;
  el("fishing-xp-fill").style.width = (Math.min(1, p.into / p.need) * 100).toFixed(1) + "%";
}

export function buildFishing() {
  setMode(mode);
  drawBaitRow();
  drawFishingRod();
  drawFishingNet();
  drawFishingTrap();
  drawFishingXp();
}

// Called every tick while this screen is visible (main.js) -- advances the
// Rod's own timers and keeps the Net's affordability and the Trap's
// countdown current. Cheap enough to just redo all three every tick rather
// than track what actually changed.
export function refreshFishing() {
  tickRod();
  drawFishingNet();
  drawFishingTrap();
}

el("fish-tool-rod").addEventListener("click", function () { setMode("rod"); });
el("fish-tool-net").addEventListener("click", function () { setMode("net"); });
el("fish-tool-trap").addEventListener("click", function () { setMode("trap"); });
pillFor("fish-cast").addEventListener("click", tapCast);
pillFor("fish-net").addEventListener("click", tapNet);
el("fish-trap-btn").addEventListener("click", setTrap);
el("back-fishing").addEventListener("click", function () { show("home"); });

export function applyFishingSprites() {
  useSprite(pillFor("fish-cast").querySelector(".pill-icon"), "fishing/rod");
  useSprite(pillFor("fish-net").querySelector(".pill-icon"), "fishing/net");
}
