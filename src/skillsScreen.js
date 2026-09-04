// =========================================================== skillsScreen
//
// One consolidated list of every skill that exists, each its own icon +
// name + level + XP bar -- replaces the home hub's one-line "Farming Lv 0 ·
// Logging Lv 0 · ..." summary, and is what the dock's Skills tab actually
// opens now instead of just shaking.
//
// The icon (and name) come from SKILLS in data.js, not from here -- that
// registry is meant to be the one canonical place a skill's icon lives, so
// anything else in the game that wants to represent "Mining" or "Combat"
// visually reads from the same spot rather than each screen inventing its
// own. useSprite() gives every row a real assets/sprites/skills/<id>.png
// the moment one exists, same pipeline as every other icon in the game.
//
// Foraging is the odd one out: it's capped at FORAGE_MAX_LEVEL, but its XP
// keeps accumulating past whatever that level needs (see forage.js's own
// speed lookup, which does the same Math.min clamp) -- so its row clamps
// level to the cap and shows a full, "MAX" bar once XP crosses that
// threshold, rather than levelProgress() drifting into a level number and
// "into/need" pair that don't mean anything past the cap.

import { FORAGE_MAX_LEVEL, SKILLS } from "./data.js";
import { state, save, SAVE_KEY } from "./state.js";
import { levelProgress, levelFromXp } from "./skills.js";
import { useSprite } from "./sprites.js";
import { el } from "./dom.js";
import { show } from "./screens.js";
import { openSheet } from "./sheet.js";

const SKILL_ROWS = [
  { id: "farming",  xpOf: function () { return state.farmingXp; } },
  { id: "logging",  xpOf: function () { return state.loggingXp; } },
  { id: "foraging", xpOf: function () { return state.foragingXp; }, maxLevel: FORAGE_MAX_LEVEL },
  { id: "mining",   xpOf: function () { return state.miningXp; } },
  // Combat's own row is replaced by these two (2026-09-03), not shown
  // alongside it -- state.combatXp still exists and still gains XP on
  // every win (see combat.js's endFight()), it's just not its own row on
  // this screen any more.
  { id: "archery",  xpOf: function () { return state.archeryXp; } },
  { id: "melee",    xpOf: function () { return state.meleeXp; } },
  { id: "sowing",   xpOf: function () { return state.sowingXp; } },
  { id: "milling",  xpOf: function () { return state.millingXp; } },
  { id: "stonecutting", xpOf: function () { return state.stonecuttingXp; } },
  { id: "tanning", xpOf: function () { return state.tanningXp; } },
  { id: "fishing", xpOf: function () { return state.fishingXp; } },
  { id: "tailoring", xpOf: function () { return state.tailoringXp; } },
  { id: "grinding", xpOf: function () { return state.grindingXp; } },
  { id: "beekeeping", xpOf: function () { return state.beekeepingXp; } },
  { id: "fletcher", xpOf: function () { return state.fletcherXp; } },
  { id: "weaving", xpOf: function () { return state.weavingXp; } },
];

export function buildSkills() {
  const list = el("skills-list");
  list.replaceChildren();

  SKILL_ROWS.forEach(function (skill) {
    const meta = SKILLS[skill.id];
    const row = document.createElement("div");
    row.className = "skill-row";

    const icon = document.createElement("span");
    icon.className = "skill-icon";
    const img = document.createElement("img");
    img.className = "sprite-img";
    img.alt = "";
    img.draggable = false;
    const fallback = document.createElement("span");
    fallback.className = "sprite-fallback";
    fallback.textContent = meta.icon;
    icon.append(img, fallback);

    const body = document.createElement("div");
    body.className = "skill-row-body";

    const head = document.createElement("div");
    head.className = "skill-row-head";
    const name = document.createElement("span");
    name.className = "skill-name";
    name.textContent = meta.name;
    const level = document.createElement("span");
    level.className = "skill-level";
    head.append(name, level);

    const sub = document.createElement("div");
    sub.className = "skill-row-sub";
    const count = document.createElement("span");
    sub.append(count);

    const bar = document.createElement("div");
    bar.className = "bar xp-bar";
    const fill = document.createElement("div");
    fill.className = "xp-fill";
    bar.append(fill);

    body.append(head, sub, bar);
    row.append(icon, body);
    list.append(row);

    useSprite(icon, "skills/" + skill.id);
  });

  drawSkills();
}

export function drawSkills() {
  const rows = document.querySelectorAll("#skills-list .skill-row");
  SKILL_ROWS.forEach(function (skill, i) {
    const row = rows[i];
    if (!row) return;
    const xp = skill.xpOf();
    const maxed = skill.maxLevel !== undefined && levelFromXp(xp) >= skill.maxLevel;

    row.classList.toggle("maxed", maxed);
    row.querySelector(".skill-level").textContent = maxed
      ? "Level " + skill.maxLevel + " (MAX)"
      : "Level " + levelProgress(xp).level;

    const fill = row.querySelector(".xp-fill");
    if (maxed) {
      row.querySelector(".skill-row-sub span").textContent =
        xp.toLocaleString() + " XP total";
      fill.style.width = "100%";
    } else {
      const p = levelProgress(xp);
      row.querySelector(".skill-row-sub span").textContent = p.into + " / " + p.need;
      fill.style.width = (Math.min(1, p.into / p.need) * 100).toFixed(1) + "%";
    }
  });
}

el("back-skills").addEventListener("click", function () { show("home"); });

// Reset lives on the Skills screen since it's the one place already
// showing the player everything they'd be giving up. A single tap can't
// wipe a save by itself -- it opens the shared bottom sheet (same one
// Field's seed picker and the away-popup use) with one more explicit
// button to actually confirm, built fresh each time rather than left
// sitting in the static markup so there's nothing to accidentally tap
// twice in a row.
function openResetConfirm() {
  const body = el("sheet-body");
  body.replaceChildren();

  const warning = document.createElement("div");
  warning.className = "reset-warning";
  warning.textContent =
    "This permanently deletes every skill, item, building, and villager on " +
    "this save. There's no undo.";
  body.append(warning);

  const confirmBtn = document.createElement("button");
  confirmBtn.className = "reset-confirm-btn";
  confirmBtn.textContent = "Reset Everything";
  confirmBtn.addEventListener("click", function () {
    // main.js's `pagehide` autosave (the same `save` it imports from
    // state.js) would otherwise fire during reload()'s own unload phase
    // and immediately re-write the in-memory state we're about to discard
    // right back into localStorage, undoing the clear a moment later.
    // Unhooking it first (same function reference, so removeEventListener
    // actually matches it) is what makes the reset stick.
    window.removeEventListener("pagehide", save);
    localStorage.removeItem(SAVE_KEY);
    location.reload();
  });
  body.append(confirmBtn);

  openSheet("Reset save?");
}

el("reset-save-btn").addEventListener("click", openResetConfirm);
