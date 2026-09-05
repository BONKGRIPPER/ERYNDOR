// =================================================================== devRoom
//
// A playtesting panel, not a game feature -- opened from the Journal's own
// Skills page (right next to Reset Save, see index.html), for quickly
// bootstrapping a save into a state worth testing (resources, unlocked
// stations, high skills, time skipped forward) without grinding through
// the normal pace by hand. "Return to the vanilla game afterwards" (the
// request's own words) is just Reset Save, already sitting right next to
// this -- nothing here needs its own undo, since a normal playthrough was
// never going to want any of these buttons touched anyway.
//
// Every action here does the same three things: mutate `state` directly,
// save(), then location.reload(). A reload is deliberate, not laziness --
// this game already reads everything it draws from `state` fresh on boot,
// so reloading is the one guaranteed-correct way to get every screen's
// own redraw logic (drawField, buildSkills, refreshMining, ... two dozen
// of them across as many files) to pick up a change made here, without
// this file having to import and call each one by hand. A cheat panel
// pausing for a reload is a perfectly normal cost; a screen that silently
// drew stale numbers because one redraw call was missed would not be.
//
// "Advance Time" specifically shifts every known deadline field backward
// by however many ms were requested, rather than touching Date.now()
// itself -- this game's own "deadline, not countdown" design (documented
// on nearly every timer in this codebase) means every settle*() function
// already knows how to catch up an arbitrarily long gap correctly, since
// that's exactly what happens whenever the tab's been closed a while.
// Shifting timestamps backward is simulating precisely that, for free,
// through code that already existed and was already trusted. Any new
// timer this game gains later needs a matching line in TIMESTAMP_FIELDS
// below, the same "one more entry" maintenance cost sprites.js's own
// allSpriteKeys() already asks for when something new needs registering
// by hand.

import { BUILDINGS, RECIPES, STATIONS, TINTS } from "./data.js";
import { state, save, gainItem } from "./state.js";
import { el } from "./dom.js";
import { openSheet, closeSheet } from "./sheet.js";

// Every state.<field>Xp a skill's own progress lives in -- see SKILLS in
// data.js for the canonical id list this mirrors. Hardcoded here (not
// derived from SKILLS' own keys) since the state field name doesn't
// follow a fixed pattern off the skill id alone (e.g. "milling" is the
// Woodcutting skill's own field, "tanning" not "tanner") -- same
// hand-listed shape SKILL_ROWS in skillsScreen.js already is.
const SKILL_XP_FIELDS = [
  "farmingXp", "loggingXp", "foragingXp", "miningXp", "archeryXp", "meleeXp",
  "sowingXp", "millingXp", "stonecuttingXp", "tanningXp", "fishingXp",
  "tailoringXp", "grindingXp", "beekeepingXp", "fletcherXp", "weavingXp",
  "combatXp",
];

// A generous, quick-start pile of the most commonly-needed raw materials
// -- enough to build every station and craft a first round of tools
// without a separate foraging/mining/logging grind first. Goes through
// gainItem() like any other grant, so the bag's own slot cap still
// applies -- a dev kit shouldn't need its own bypass for that.
const STARTER_MATERIALS = {
  "Stone": 60, "Sticks": 60, "Flint": 60, "Pine Logs": 60, "Birch Logs": 30,
  "Flax": 40, "Wool": 30, "Bones": 30, "Scrap Metal": 30, "Basalt": 30,
  "Animal Hide": 20, "Feathers": 20,
};

const HOUR_MS = 60 * 60 * 1000;

function reload() {
  save();
  location.reload();
}

function giveShards(amount) {
  state.shards += amount;
  reload();
}

function giveMaterials() {
  Object.keys(STARTER_MATERIALS).forEach(function (name) {
    gainItem(name, STARTER_MATERIALS[name]);
  });
  reload();
}

function discoverAllItems() {
  Object.keys(TINTS).forEach(function (name) { state.discoveredItems[name] = true; });
  reload();
}

function maxAllSkills() {
  SKILL_XP_FIELDS.forEach(function (field) { state[field] = 50000; });
  reload();
}

function buildAllStations() {
  Object.keys(BUILDINGS).forEach(function (id) { state.buildings[id] = true; });
  reload();
}

function fillVillageUpkeep() {
  state.village.food = 9999;
  state.village.heat = 9999;
  reload();
}

// Shifts one field back by `ms` if (and only if) it's actually a number --
// silently a no-op on null/undefined/missing, so this is safe to call
// against a field that doesn't apply to the current save (no trap set,
// no fight running, etc.) without a guard at every call site.
function shift(obj, key, ms) {
  if (obj && typeof obj[key] === "number") obj[key] -= ms;
}

// Every known deadline in the game, shifted back by the same `ms` --
// exactly what a real gap of that length closed/idle would have done to
// each one, so the very next tick's own settle*() functions (already
// trusted to catch up an arbitrarily long real gap) do all the actual
// work of resolving whatever that unblocks. See this file's own header
// comment for why new timers need a new line here.
function advanceTime(ms) {
  shift(state, "startedAt", ms);
  shift(state.wateringCan, "refillAt", ms);
  state.plots.forEach(function (p) { shift(p, "readyAt", ms); });
  state.logPlots.forEach(function (p) {
    shift(p, "readyAt", ms);
    if (p.chopSwing) shift(p.chopSwing, "readyAt", ms);
  });
  state.beehiveSlots.forEach(function (s) { shift(s, "readyAt", ms); });
  shift(state.forage, "readyAt", ms);
  state.workers.forEach(function (w) { shift(w, "nextTickAt", ms); });
  Object.keys(RECIPES).forEach(function (id) { shift(state.crafting[id], "readyAt", ms); });
  Object.keys(STATIONS).forEach(function (id) { shift(state.stations[id], "readyAt", ms); });
  shift(state, "mineCooldownUntil", ms);
  shift(state.mineSwing, "readyAt", ms);
  if (state.combat) {
    shift(state.combat, "enemyNextAttackAt", ms);
    shift(state.combat, "playerCooldownUntil", ms);
    shift(state.combat, "autoAttackAt", ms);
  }
  shift(state.travel, "readyAt", ms);
  shift(state.fishing.trap, "readyAt", ms);
  shift(state.village, "nextUpkeepAt", ms);
  shift(state.campfire.current, "readyAt", ms);
  // Market stock decays toward zero the further in the past its own
  // stockAt sits -- shifting it back is "more time to decay," the same
  // direction every other field here moves for the same reason.
  Object.keys(state.market.stockAt).forEach(function (name) {
    state.market.stockAt[name] -= ms;
  });
  reload();
}

function actionRow(label, sub, onClick) {
  const btn = document.createElement("button");
  btn.className = "villager-hire";
  const body = document.createElement("span");
  body.className = "villager-hire-body";
  const name = document.createElement("span");
  name.className = "villager-hire-name";
  name.textContent = label;
  const subEl = document.createElement("span");
  subEl.className = "villager-hire-sub";
  subEl.textContent = sub;
  body.append(name, subEl);
  btn.append(body);
  btn.addEventListener("click", onClick);
  return btn;
}

function sectionLabel(text) {
  const div = document.createElement("div");
  div.className = "market-section-label";
  div.textContent = text;
  return div;
}

function openDevRoom() {
  const body = el("sheet-body");
  body.replaceChildren();

  const notice = document.createElement("div");
  notice.className = "reset-warning";
  notice.textContent =
    "Playtesting only -- every button here saves immediately and reloads the page. " +
    "Use Reset Save (below the Dev Room button) to go back to a clean, vanilla playthrough.";
  body.append(notice);

  body.append(sectionLabel("Resources"));
  body.append(actionRow("Give 10,000 Shards", "Adds to your current total", function () { giveShards(10000); }));
  body.append(actionRow("Give Starter Materials", "60 Stone/Sticks/Flint/Pine Logs, and more", giveMaterials));
  body.append(actionRow("Discover All Items", "Fills in the Collection page's own \"?\" cards", discoverAllItems));

  body.append(sectionLabel("Time"));
  body.append(actionRow("Advance 1 Hour", "Skips every running timer forward", function () { advanceTime(HOUR_MS); }));
  body.append(actionRow("Advance 8 Hours", "Enough for most cooldowns and upkeep windows", function () { advanceTime(8 * HOUR_MS); }));
  body.append(actionRow("Advance 1 Day", "A full day/night and season cycle tick", function () { advanceTime(24 * HOUR_MS); }));
  body.append(actionRow("Advance 7 Days", "A full week -- season changes, deep decay", function () { advanceTime(7 * 24 * HOUR_MS); }));

  body.append(sectionLabel("Skills & Stations"));
  body.append(actionRow("Max All Skills", "Sets every skill to 50,000 XP", maxAllSkills));
  body.append(actionRow("Build All Stations", "Unlocks every BUILDINGS station for free", buildAllStations));
  body.append(actionRow("Fill Village Upkeep", "Tops off Food/Heat so villagers never starve", fillVillageUpkeep));

  openSheet("Dev Room");
}

el("dev-room-btn").addEventListener("click", openDevRoom);
