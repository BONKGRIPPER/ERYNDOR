// ================================================================ township
//
// Where every villager and their slots live -- a build-gated station (see
// BUILDINGS in data.js), not a default screen, so assigning villagers only
// becomes possible once the player's actually spent Stone and Logs on it.
// Reworked (2026-09-04, second pass): the old Foraging Villager (its own
// standalone state.villager) is now just another WORKERS role ("forager"),
// so every villager -- Forager included -- renders as the exact same
// .worker-pill, one per WORKERS key, with no separate hire flow of its
// own any more. Hiring/leveling-for-Shards is gone entirely: a role is
// either unlocked (its building built, and its own skill level past
// WORKERS[role].unlockLevel if it has one) or it isn't, and an unlocked
// role can be freely assigned to any open slot and unassigned again later.
// Housing and Village Upkeep have their own tab toggle below the roster
// (same .inv-toggle/.inv-view-btn pattern Inventory's Equipment/Bag/
// Storage already uses), defaulting to Village Upkeep.

import {
  VILLAGE_UPKEEP_MS, VILLAGE_UPKEEP_FOOD, VILLAGE_UPKEEP_HEAT, VILLAGE_HEAT_VALUE,
  FOODS, WORKERS, HOUSE_COST, HOUSE_WORKER_SLOTS, BUILDINGS, TINTS,
} from "./data.js";
import { state, save, kickVillageUpkeepIfIdle } from "./state.js";
import { refreshForaging } from "./forage.js";
import {
  workerCap, assignedCount, freeSlots, getWorker, roleUnlocked, roleSkill, roleSkillLevel,
  canAssignWorker, assignWorker, unassignWorker, maxLevelFor, unlockedTierCount, masterOutputFor,
} from "./workers.js";
import { combinedOwned, spendItem, canAfford, buildCostNodes, spendCost } from "./costDisplay.js";
import { useSprite, slug } from "./sprites.js";
import { el } from "./dom.js";
import { show } from "./screens.js";
import { openSheet, closeSheet } from "./sheet.js";
import { updateWalletNote, drawBag } from "./hub.js";
import { laborAssigned, settleLaborUpkeep } from "./labor.js";
import { settleCaravan } from "./caravans.js";

function shake(node) {
  node.classList.remove("shake");
  void node.offsetWidth;
  node.classList.add("shake");
}

// A shared row shape ("big highlighted action") the whole game already
// reuses for Mining's Surface & Bank and Combat's Fight prompt -- built by
// hand here (not from a static index.html block) for Housing's own Build
// action, the one Township action left that isn't a villager pill.
function actionButton(icon, name, sub, cost) {
  const btn = document.createElement("button");
  btn.className = "villager-hire";

  const iconEl = document.createElement("span");
  iconEl.className = "villager-hire-icon";
  iconEl.textContent = icon;

  const body = document.createElement("span");
  body.className = "villager-hire-body";
  const nameEl = document.createElement("span");
  nameEl.className = "villager-hire-name";
  nameEl.textContent = name;
  const subEl = document.createElement("span");
  subEl.className = "villager-hire-sub";
  subEl.textContent = sub;
  body.append(nameEl, subEl);

  btn.append(iconEl, body);
  if (cost !== undefined) {
    const costEl = document.createElement("span");
    costEl.className = "villager-hire-cost";
    costEl.textContent = cost;
    btn.append(costEl);
  }
  return btn;
}

// ------------------------------------------------------------- upkeep

// Every currently-assigned villager (Forager included, now just another
// WORKERS role) counts toward the one shared upkeep bill -- assigning a
// second or third villager doesn't cost more Shards to feed per villager,
// but does mean more food/heat drawn each VILLAGE_UPKEEP_MS.
function headcount() { return laborAssigned(); }

// Called every tick, unconditionally (see main.js) -- same "runs in the
// background regardless of screen" shape as settleForage()/
// settleFishingTrap(). A successful upkeep advances nextUpkeepAt by
// exactly VILLAGE_UPKEEP_MS and clears `starved`; a short one leaves
// nextUpkeepAt right where it is (in the past) and sets `starved`, so the
// very next call -- and every one after, cheaply -- rechecks the same
// due upkeep rather than skipping ahead. Donating enough mid-starvation
// clears it on the next tick, no separate "resume" action needed. A long
// stretch of banked supplies drains multiple days in one pass, the same
// "settle catches up however far behind it is" shape every other deadline
// in this game already follows.
export function settleVillageUpkeep() {
  settleCaravan();
  // Long offline gaps resume in chunks; don't advance upkeep beyond the
  // extraction cursor while it still has earlier events to process.
  const crew = state.outposts.forestRoad?.crew;
  if (crew?.assigned && crew.nextAt <= Date.now()) return;
  settleLaborUpkeep();
}

function donateFood(item, qty) {
  settleCaravan();
  const owned = combinedOwned(item);
  qty = Math.min(qty, owned);
  if (qty <= 0) return;
  spendItem(item, qty);
  state.village.food += qty * FOODS[item].heal;
  save();
  drawBag();
  buildTownship();
}

function donateHeat(item, qty) {
  settleCaravan();
  const owned = combinedOwned(item);
  qty = Math.min(qty, owned);
  if (qty <= 0) return;
  spendItem(item, qty);
  state.village.heat += qty * VILLAGE_HEAT_VALUE[item];
  save();
  drawBag();
  buildTownship();
}

// A plain quantity slider, no pricing -- same shape as market.js's own
// openBankPicker(), just donating into the village stockpile instead of a
// bank. `perUnit` is the food/heat value one unit of this item is worth,
// shown so the donation actually means something at a glance.
function openDonatePicker(item, perUnit, unitLabel, onDonate) {
  const max = combinedOwned(item);
  if (max < 1) return;

  const body = el("sheet-body");
  body.replaceChildren();

  const wrap = document.createElement("div");
  wrap.className = "qty-picker";

  const nameEl = document.createElement("div");
  nameEl.className = "qty-picker-name";
  nameEl.textContent = item + " (" + perUnit + " " + unitLabel + " each)";

  const slider = document.createElement("input");
  slider.type = "range";
  slider.className = "qty-slider";
  slider.min = "1";
  slider.max = String(max);
  slider.value = String(max);

  const row = document.createElement("div");
  row.className = "qty-picker-row";
  const count = document.createElement("span");
  count.className = "qty-count";
  row.append(count);

  const accept = document.createElement("button");
  accept.className = "qty-accept";

  function refresh() {
    const qty = Number(slider.value);
    count.textContent = qty + (qty === 1 ? " unit" : " units");
    accept.textContent = "Donate for +" + (qty * perUnit) + " " + unitLabel;
  }
  slider.addEventListener("input", refresh);
  refresh();

  accept.addEventListener("click", function () {
    onDonate(item, Number(slider.value));
    closeSheet();
  });

  wrap.append(nameEl, slider, row, accept);
  body.append(wrap);

  openSheet("Donate " + item);
}

function openFoodPicker() {
  const body = el("sheet-body");
  body.replaceChildren();

  const owned = Object.keys(FOODS).filter(function (item) { return combinedOwned(item) > 0; });
  if (owned.length === 0) {
    const empty = document.createElement("div");
    empty.className = "inv-empty";
    empty.textContent = "Nothing edible to donate.";
    body.append(empty);
    openSheet("Donate Food");
    return;
  }

  owned.forEach(function (item) {
    const row = document.createElement("button");
    row.className = "seed-row";
    const text = document.createElement("div");
    const name = document.createElement("div");
    name.className = "seed-name";
    name.textContent = item;
    const meta = document.createElement("div");
    meta.className = "seed-meta";
    meta.textContent = FOODS[item].heal + " food unit" + (FOODS[item].heal === 1 ? "" : "s") + " each";
    text.append(name, meta);
    const countEl = document.createElement("span");
    countEl.className = "seed-count";
    countEl.textContent = combinedOwned(item) + " owned";
    row.append(text, countEl);
    row.addEventListener("click", function () {
      openDonatePicker(item, FOODS[item].heal, "food", donateFood);
    });
    body.append(row);
  });

  openSheet("Donate Food");
}

function openHeatPicker() {
  const body = el("sheet-body");
  body.replaceChildren();

  const owned = Object.keys(VILLAGE_HEAT_VALUE).filter(function (item) { return combinedOwned(item) > 0; });
  if (owned.length === 0) {
    const empty = document.createElement("div");
    empty.className = "inv-empty";
    empty.textContent = "Nothing to burn to donate.";
    body.append(empty);
    openSheet("Donate Heat");
    return;
  }

  owned.forEach(function (item) {
    const row = document.createElement("button");
    row.className = "seed-row";
    const text = document.createElement("div");
    const name = document.createElement("div");
    name.className = "seed-name";
    name.textContent = item;
    const meta = document.createElement("div");
    meta.className = "seed-meta";
    meta.textContent = VILLAGE_HEAT_VALUE[item] + " heat unit" + (VILLAGE_HEAT_VALUE[item] === 1 ? "" : "s") + " each";
    text.append(name, meta);
    const countEl = document.createElement("span");
    countEl.className = "seed-count";
    countEl.textContent = combinedOwned(item) + " owned";
    row.append(text, countEl);
    row.addEventListener("click", function () {
      openDonatePicker(item, VILLAGE_HEAT_VALUE[item], "heat", donateHeat);
    });
    body.append(row);
  });

  openSheet("Donate Heat");
}

// Only shown once a villager actually exists -- there's nothing to keep
// fed before that, and no stockpile worth looking at either.
function villageUpkeepCard() {
  if (headcount() === 0) {
    const empty = document.createElement("div");
    empty.className = "inv-empty";
    empty.textContent = "Assign a villager below to start Village Upkeep.";
    return empty;
  }

  const card = document.createElement("div");
  card.className = "township-card";

  const head = document.createElement("div");
  head.className = "township-card-head";
  const name = document.createElement("span");
  name.className = "township-card-name";
  name.textContent = "Village Upkeep";
  const status = document.createElement("span");
  status.className = "township-card-status";
  status.textContent = state.village.starved ? "Starved" : "Supplied";
  head.append(name, status);
  card.append(head);

  const stock = document.createElement("div");
  stock.className = "village-stock";
  const remain = Math.max(0, (state.village.nextUpkeepAt || Date.now()) - Date.now());
  const hours = Math.floor(remain / (60 * 60 * 1000));
  const mins = Math.floor((remain % (60 * 60 * 1000)) / (60 * 1000));
  const foodNeeded = VILLAGE_UPKEEP_FOOD * headcount();
  const heatNeeded = VILLAGE_UPKEEP_HEAT * headcount();
  stock.textContent =
    "Food " + Math.floor(state.village.food) + "/" + foodNeeded +
    " · Heat " + Math.floor(state.village.heat) + "/" + heatNeeded +
    " (" + headcount() + " villager" + (headcount() === 1 ? "" : "s") + ")" +
    (state.village.starved ? " · needs both to resume" : " · next upkeep in " + hours + "h " + mins + "m");
  card.append(stock);

  const foodBtn = actionButton("\u{1F356}", "Donate Food", "1 HP healed = 1 food unit");
  foodBtn.addEventListener("click", openFoodPicker);
  const heatBtn = actionButton("\u{1F525}", "Donate Heat", "Logs/Sticks = 1, Coal/Charcoal = 3");
  heatBtn.addEventListener("click", openHeatPicker);
  card.append(foodBtn, heatBtn);

  return card;
}

// -------------------------------------------------------------- housing

// A repeating purchase, same "flat, non-doubling" shape Beehive's own
// honey-slot expansion already uses -- each House raises workerCap() by
// HOUSE_WORKER_SLOTS (see workers.js). Shown once Township itself exists,
// which it always does here (this whole screen is only reachable once
// it's built).
function housingCard() {
  const houses = state.housing[state.currentLocation] || 0;

  const card = document.createElement("div");
  card.className = "township-card";

  const head = document.createElement("div");
  head.className = "township-card-head";
  const name = document.createElement("span");
  name.className = "township-card-name";
  name.textContent = "\u{1F3E0} Housing";
  const status = document.createElement("span");
  status.className = "township-card-status";
  status.textContent = houses + " built · " + workerCap() + " villager slots";
  head.append(name, status);
  card.append(head);

  const affordable = canAfford(HOUSE_COST);
  const btn = actionButton("\u{1F3E0}", "Build House", "+" + HOUSE_WORKER_SLOTS + " villager slots");
  const costEl = document.createElement("span");
  costEl.className = "villager-hire-cost";
  costEl.replaceChildren.apply(costEl, buildCostNodes(HOUSE_COST));
  btn.append(costEl);
  btn.classList.toggle("unaffordable", !affordable);
  btn.addEventListener("click", function () {
    if (!canAfford(HOUSE_COST)) { shake(btn); return; }
    spendCost(HOUSE_COST);
    state.housing[state.currentLocation] = (state.housing[state.currentLocation] || 0) + 1;
    save();
    drawBag();
    buildTownship();
  });
  card.append(btn);

  return card;
}

// -------------------------------------------------------------- workers

// One real .pill per WORKERS role, Forager included (2026-09-04, second
// pass -- previously its own bespoke .township-card). Three states:
//   - locked: the role's own building isn't built yet, or (Forager only,
//     so far) its skill hasn't reached WORKERS[role].unlockLevel -- the
//     pill shows *only* "Requires (Skill) Level (x)" when it's a skill
//     gate specifically, per the request ("don't show any information on
//     the pill except..."), or the building's own name otherwise.
//   - unassigned but unlocked: tap to assign into any free slot.
//   - assigned: icon becomes the role's own current "master resource" (or
//     the role's own emoji for a bespoke role with no output, e.g.
//     Forager/Cook), the level bar shows unlockedTierCount()/maxLevelFor()
//     (already "MAX" for a single-tier role the instant it's assigned,
//     same "already at max level" the request calls for on the Forager
//     specifically), and tapping unassigns it.
function workerCard(role) {
  const w = WORKERS[role];
  const worker = getWorker(role);
  const assigned = !!worker;
  const built = !w.building || !!state.buildings[w.building];
  const unlocked = roleUnlocked(role);
  const maxLevel = maxLevelFor(role);
  const tierCount = unlockedTierCount(role);

  const pill = document.createElement("button");
  pill.className = "pill worker-pill";

  if (assigned) {
    const levelFill = document.createElement("div");
    levelFill.className = "pill-level-fill";
    levelFill.style.width = (tierCount / maxLevel * 100).toFixed(1) + "%";
    const levelBadge = document.createElement("span");
    levelBadge.className = "pill-level-badge";
    levelBadge.textContent = String(tierCount);
    pill.append(levelFill, levelBadge);
  }

  const icon = document.createElement("span");
  icon.className = "pill-icon";
  const img = document.createElement("img");
  img.className = "sprite-img";
  img.alt = "";
  img.draggable = false;
  const fallback = document.createElement("span");
  fallback.className = "sprite-fallback";
  icon.append(img, fallback);

  const masterOutput = assigned ? masterOutputFor(role) : null;
  if (masterOutput) {
    fallback.style.background = TINTS[masterOutput] || "#9a8f7d";
    useSprite(icon, "items/" + slug(masterOutput));
  } else {
    fallback.textContent = w.icon;
  }

  const body = document.createElement("span");
  body.className = "pill-body";
  const name = document.createElement("span");
  name.className = "pill-name";
  name.textContent = w.name;
  const sub = document.createElement("span");
  sub.className = "pill-sub";

  const price = document.createElement("span");
  price.className = "villager-hire-cost worker-pill-price worker-pill-maxed";

  if (!unlocked) {
    // Per the request: show *only* the skill-gate text, nothing else, for
    // a role that needs a skill level it hasn't reached yet. A role
    // that's simply missing its building (no unlockLevel involved, or its
    // level is already met but the building isn't built) still shows the
    // normal "Requires <Building>" sub instead -- there's no skill to
    // name in that case.
    const skill = roleSkill(role);
    if (w.unlockLevel && skill && roleSkillLevel(role) < w.unlockLevel) {
      sub.textContent = "Requires " + skill.skillName + " Level " + w.unlockLevel;
    } else {
      sub.textContent = "Requires " + BUILDINGS[w.building].name;
    }
    price.textContent = "";
    pill.classList.add("unaffordable", "worker-pill-locked");
    pill.addEventListener("click", function () { shake(pill); });
  } else if (!assigned) {
    sub.textContent = freeSlots() > 0 ? w.note : "No free villager slots — build a House";
    price.textContent = freeSlots() > 0 ? "Assign" : "Full";
    pill.classList.toggle("unaffordable", freeSlots() <= 0);
    pill.addEventListener("click", function () {
      if (!canAssignWorker(role)) { shake(pill); return; }
      assignWorker(role);
      updateWalletNote();
      refreshForaging();
      buildTownship();
    });
  } else {
    sub.textContent = "Working — " + (masterOutput || w.note);
    price.textContent = "Unassign";
    pill.addEventListener("click", function () {
      unassignWorker(role);
      refreshForaging();
      buildTownship();
    });
  }

  body.append(name, sub);
  pill.append(icon, body, price);
  return pill;
}

// -------------------------------------------------------------------- tabs

let activeTab = "upkeep";   // default per the request

function setTownshipTab(tab) {
  activeTab = tab;
  el("township-view-upkeep").classList.toggle("active", tab === "upkeep");
  el("township-view-housing").classList.toggle("active", tab === "housing");
  drawTownshipTab();
}

function drawTownshipTab() {
  const wrap = el("township-tab");
  wrap.replaceChildren();
  wrap.append(activeTab === "housing" ? housingCard() : villageUpkeepCard());
}

el("township-view-upkeep").addEventListener("click", function () { setTownshipTab("upkeep"); });
el("township-view-housing").addEventListener("click", function () { setTownshipTab("housing"); });

export function buildTownship() {
  const slots = el("township-slots");
  slots.textContent = assignedCount() + " / " + workerCap() + " villager slots assigned" + (state.outposts.forestRoad?.crew?.assigned ? " · 1 logging at Forest Road (manage in World)" : "");

  const wrap = el("township-list");
  wrap.replaceChildren();
  Object.keys(WORKERS).forEach(function (role) { wrap.append(workerCard(role)); });

  drawTownshipTab();
}

el("back-township").addEventListener("click", function () { show("home"); });
