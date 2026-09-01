// ================================================================ township
//
// Where every auto-clicking villager and their upgrades live -- a build-
// gated station (see BUILDINGS in data.js), not a default screen, so
// hiring/upgrading only becomes possible once the player's actually spent
// Stone and Logs on it. One villager exists so far: Foraging's, moved here
// from what used to be an inline hire button on the forage bar itself (see
// forage.js's kickForageIfIdle()). Rendered generically enough
// (buildTownship() rebuilds the whole card list from scratch) that a
// second villager -- Mining's, Logging's, whatever's next -- is a new card
// function, not a restructure.

import {
  VILLAGER_LEVEL, VILLAGER_COST, VILLAGER_UPGRADE_COST, VILLAGER_UPGRADE_MULT,
  VILLAGE_UPKEEP_MS, VILLAGE_UPKEEP_FOOD, VILLAGE_UPKEEP_HEAT, VILLAGE_HEAT_VALUE,
  FOODS, LOCATIONS,
} from "./data.js";
import { state, save } from "./state.js";
import { foragingLevel, kickForageIfIdle, refreshForage } from "./forage.js";
import { combinedOwned, spendItem } from "./costDisplay.js";
import { el } from "./dom.js";
import { show } from "./screens.js";
import { openSheet, closeSheet } from "./sheet.js";
import { updateWalletNote, drawBag } from "./hub.js";

function shake(node) {
  node.classList.remove("shake");
  void node.offsetWidth;
  node.classList.add("shake");
}

// A shared row shape ("big highlighted action") the whole game already
// reuses for Mining's Surface & Bank and Combat's Fight prompt -- built by
// hand here (not from a static index.html block) since Township's cards
// are entirely data-driven, one per villager.
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

function hireForagingVillager(btn) {
  if (state.villager.owned || foragingLevel() < VILLAGER_LEVEL) { shake(btn); return; }
  if (state.shards < VILLAGER_COST) { shake(btn); return; }
  state.shards -= VILLAGER_COST;
  state.villager.owned = true;
  // Set once, here -- this is the location the villager works forever
  // after, regardless of where the player wanders off to (see forage.js's
  // villagerPoolId()). The upkeep clock starts now too; nothing's been
  // donated yet, so the very first 24h check will find the village short
  // and starved until something is.
  state.villager.homeLocation = state.currentLocation;
  state.village.nextUpkeepAt = Date.now() + VILLAGE_UPKEEP_MS;
  save();
  updateWalletNote();
  kickForageIfIdle();
  refreshForage();
  buildTownship();
}

function upgradeForagingVillager(btn) {
  if (!state.villager.owned || state.villager.fastHands) return;
  if (state.shards < VILLAGER_UPGRADE_COST) { shake(btn); return; }
  state.shards -= VILLAGER_UPGRADE_COST;
  state.villager.fastHands = true;
  save();
  updateWalletNote();
  buildTownship();
}

const FASTER_PCT = Math.round((1 - VILLAGER_UPGRADE_MULT) * 100);

function foragingVillagerCard() {
  const eligible = foragingLevel() >= VILLAGER_LEVEL;
  const owned = state.villager.owned;

  const card = document.createElement("div");
  card.className = "township-card";

  const head = document.createElement("div");
  head.className = "township-card-head";
  const name = document.createElement("span");
  name.className = "township-card-name";
  name.textContent = "Foraging Villager";
  const status = document.createElement("span");
  status.className = "township-card-status";
  status.textContent = owned
    ? (state.village.starved ? "Out of supplies" : "Working " + ((LOCATIONS[state.villager.homeLocation] || {}).name || ""))
    : eligible ? "Ready to hire" : "Foraging Lv " + VILLAGER_LEVEL + " required";
  head.append(name, status);
  card.append(head);

  if (!owned) {
    const btn = actionButton(
      "\u{1F9D1}\u{200D}\u{1F33E}", "Hire",
      "Forages on your own, even while you're away", VILLAGER_COST
    );
    btn.classList.toggle("unaffordable", !eligible || state.shards < VILLAGER_COST);
    btn.addEventListener("click", function () { hireForagingVillager(btn); });
    card.append(btn);
    return card;
  }

  if (state.villager.fastHands) {
    const done = actionButton(
      "✨", "Efficient Villager (owned)",
      FASTER_PCT + "% faster foraging"
    );
    done.classList.add("unaffordable");
    card.append(done);
  } else {
    const btn = actionButton(
      "✨", "Efficient Villager",
      FASTER_PCT + "% faster foraging", VILLAGER_UPGRADE_COST
    );
    btn.classList.toggle("unaffordable", state.shards < VILLAGER_UPGRADE_COST);
    btn.addEventListener("click", function () { upgradeForagingVillager(btn); });
    card.append(btn);
  }
  return card;
}

// ------------------------------------------------------------- upkeep

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
  if (!state.villager.owned || state.village.nextUpkeepAt === null) return;
  let changed = false;
  while (Date.now() >= state.village.nextUpkeepAt) {
    if (state.village.food >= VILLAGE_UPKEEP_FOOD && state.village.heat >= VILLAGE_UPKEEP_HEAT) {
      state.village.food -= VILLAGE_UPKEEP_FOOD;
      state.village.heat -= VILLAGE_UPKEEP_HEAT;
      state.village.nextUpkeepAt += VILLAGE_UPKEEP_MS;
      state.village.starved = false;
      changed = true;
    } else {
      if (!state.village.starved) changed = true;
      state.village.starved = true;
      break;
    }
  }
  if (changed) save();
}

function donateFood(item, qty) {
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
  if (!state.villager.owned) return null;

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
  stock.textContent =
    "Food " + Math.floor(state.village.food) + "/" + VILLAGE_UPKEEP_FOOD +
    " · Heat " + Math.floor(state.village.heat) + "/" + VILLAGE_UPKEEP_HEAT +
    (state.village.starved ? " · needs both to resume" : " · next upkeep in " + hours + "h " + mins + "m");
  card.append(stock);

  const foodBtn = actionButton("\u{1F356}", "Donate Food", "1 HP healed = 1 food unit");
  foodBtn.addEventListener("click", openFoodPicker);
  const heatBtn = actionButton("\u{1F525}", "Donate Heat", "Logs/Sticks = 1, Coal/Charcoal = 3");
  heatBtn.addEventListener("click", openHeatPicker);
  card.append(foodBtn, heatBtn);

  return card;
}

export function buildTownship() {
  const wrap = el("township-list");
  wrap.replaceChildren();
  wrap.append(foragingVillagerCard());
  const upkeep = villageUpkeepCard();
  if (upkeep) wrap.append(upkeep);
}

el("back-township").addEventListener("click", function () { show("home"); });
