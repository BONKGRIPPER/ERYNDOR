// ================================================================= beehive
//
// One or more independent Honey slots (state.beehiveSlots, starts with 1)
// -- same array-of-timers shape state.plots/state.logPlots already use,
// but unlike either of those there's no growth phase and no auto-restart:
// a slot is either idle (null, ready for a tap) or brewing
// ({startedAt, readyAt}), and once it finishes it goes straight back to
// idle, waiting for the next tap, same "spend a fresh tap every time"
// rule Crafting's own pills follow. No material cost to start a brew --
// a beehive is meant to read as passive production once it exists, not
// something fed each batch.
//
// Buying another slot (BEEHIVE_EXPAND_COST in data.js, flat -- not
// doubling like Farm/Logging's own plot expansion) is the only way to run
// more than one Honey timer at once. There's no location gating on it
// (unlike Farm/Logging's own expand cards) since the Beehive itself is
// already a built, location-gated station -- if it's here, expanding it
// is always allowed.

import { BEEHIVE_HONEY_MS, BEEHIVE_EXPAND_COST, BEEHIVE_XP } from "./data.js";
import { state, save, gainItem, gainSkillXp } from "./state.js";
import { openZoneWheel } from "./zoneWheel.js";
import { levelProgress } from "./skills.js";
import { canAfford, buildCostNodes, spendCost } from "./costDisplay.js";
import { useSprite } from "./sprites.js";
import { el } from "./dom.js";
import { show } from "./screens.js";
import { drawBag, updateSkillsNote } from "./hub.js";

const HIVE_SVG =
  '<svg viewBox="0 0 24 24" aria-hidden="true">' +
  '<path d="M12 3 20 7.5v9L12 21 4 16.5v-9Z" />' +
  '<path d="M12 3v18M4 7.5l8 4.5 8-4.5M4 16.5l8-4.5 8 4.5" />' +
  "</svg>";

export function buildBeehiveSlots() {
  const wrap = el("beehive-slots");
  wrap.replaceChildren();

  state.beehiveSlots.forEach(function (slot, i) {
    const node = document.createElement("button");
    node.className = "pill plot";
    node.dataset.i = String(i);
    node.innerHTML =
      '<div class="pill-fill"></div>' +
      '<span class="pill-icon"><img class="sprite-img" alt="" draggable="false">' +
        '<span class="sprite-fallback">' + HIVE_SVG + "</span></span>" +
      '<span class="pill-body">' +
        '<span class="pill-name">Honey</span>' +
        '<span class="pill-sub"></span>' +
      "</span>";
    node.addEventListener("click", function () { tapSlot(i); });
    wrap.append(node);
  });
  applyBeehiveSprites();
  drawExpandCard();
}

// Static per slot (every slot is always "Honey," nothing to swap between),
// so this is only ever called once per rebuild rather than every redraw --
// same "apply once" split every other module's own applyXSprites() makes
// against its own per-tick draw function.
function applyBeehiveSprites() {
  document.querySelectorAll("#beehive-slots .plot .pill-icon").forEach(function (icon) {
    useSprite(icon, "stations/beehive");
  });
}

// One tap starts a brew if the slot's idle -- silent no-op otherwise, same
// "already running" rule every other pill in this game follows.
function tapSlot(i) {
  const slot = state.beehiveSlots[i];
  if (slot) return;
  state.beehiveSlots[i] = { startedAt: Date.now(), readyAt: Date.now() + BEEHIVE_HONEY_MS };
  save();
  drawBeehive();
}

// Called every tick (main.js), same shape as settleLogging()/settleMining()
// -- resolves every slot whose deadline has passed, however many that is,
// so a long away-gap still only ever grants as many batches as slots
// actually had time to finish (one each, not a chain -- unlike Foraging's
// villager, a finished slot doesn't restart itself).
export function settleBeehive() {
  let finished = 0;
  const now = Date.now();
  state.beehiveSlots.forEach(function (slot, i) {
    if (!slot || now < slot.readyAt) return;
    state.beehiveSlots[i] = null;
    gainItem("Honey", 1);
    finished += 1;
  });
  if (finished > 0) {
    const zoneLevels = gainSkillXp("beekeepingXp", BEEHIVE_XP * finished);
    save();
    updateSkillsNote();
    drawBeehiveXp();
    if (zoneLevels) openZoneWheel(state.currentLocation, zoneLevels);
  }
  return finished > 0;
}

export function drawBeehiveXp() {
  const p = levelProgress(state.beekeepingXp);
  el("beehive-xp-level").textContent = "Beekeeping — Level " + p.level;
  el("beehive-xp-count").textContent = p.into + " / " + p.need;
  el("beehive-xp-fill").style.width = (Math.min(1, p.into / p.need) * 100).toFixed(1) + "%";
}

export function drawBeehive() {
  const now = Date.now();
  state.beehiveSlots.forEach(function (slot, i) {
    const node = el("beehive-slots").children[i];
    if (!node) return;
    const brewing = !!slot;
    node.classList.toggle("active", brewing);
    const fill = node.querySelector(".pill-fill");
    if (brewing) {
      const span = slot.readyAt - slot.startedAt;
      const p = span > 0 ? Math.min(1, (now - slot.startedAt) / span) : 1;
      fill.style.width = (p * 100).toFixed(1) + "%";
    } else {
      fill.style.width = "0%";
    }
    node.querySelector(".pill-sub").textContent = brewing ? "Brewing…" : "Tap to start a batch";
  });
  drawBeehiveXp();
  drawExpandCard();
}

// -------------------------------------------------------------- expansion

function expandCost() { return BEEHIVE_EXPAND_COST; }

function buySlot() {
  const cost = expandCost();
  if (!canAfford(cost)) { shakeExpand(); return; }
  spendCost(cost);
  state.beehiveSlots.push(null);
  save();
  drawBag();
  buildBeehiveSlots();
  drawBeehive();
}

function shakeExpand() {
  const card = el("beehive-expand-card");
  if (!card) return;
  card.classList.remove("shake");
  void card.offsetWidth;
  card.classList.add("shake");
  // Same explicit removal Farm/Logging's own shakeExpand() needs --
  // drawExpandCard() runs every tick this screen is open and never
  // touches "shake" itself, so without this a denied tap would shake
  // forever the first time a redraw's own DOM mutation restarts the
  // still-present animation.
  setTimeout(function () { card.classList.remove("shake"); }, 340);
}

function drawExpandCard() {
  let card = el("beehive-expand-card");
  const wrap = el("beehive-slots");
  if (!card) {
    card = document.createElement("button");
    card.id = "beehive-expand-card";
    card.className = "pill plot-expand";
    card.addEventListener("click", buySlot);
  }
  wrap.append(card);
  const cost = expandCost();
  const affordable = canAfford(cost);
  card.classList.toggle("unaffordable", !affordable);
  card.classList.toggle("affordable-ready", affordable);
  card.replaceChildren();
  const label = document.createElement("span");
  label.className = "plot-expand-label";
  label.textContent = "+ New Honey Slot";
  const cost_ = document.createElement("span");
  cost_.className = "plot-expand-cost";
  cost_.replaceChildren.apply(cost_, buildCostNodes(cost));
  card.append(label, cost_);
}

el("back-beehive").addEventListener("click", function () { show("home"); updateSkillsNote(); });
