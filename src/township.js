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
} from "./data.js";
import { state, save } from "./state.js";
import { foragingLevel, kickForageIfIdle, refreshForage } from "./forage.js";
import { el } from "./dom.js";
import { show } from "./screens.js";
import { updateWalletNote } from "./hub.js";

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
    ? "Working"
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

export function buildTownship() {
  const wrap = el("township-list");
  wrap.replaceChildren();
  wrap.append(foragingVillagerCard());
}

el("back-township").addEventListener("click", function () { show("home"); });
