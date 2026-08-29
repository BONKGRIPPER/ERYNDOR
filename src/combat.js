// ================================================================= combat
//
// A tick fight, RuneScape-style: the enemy attacks on its own clock
// (enemyNextAttackAt, checked in settleCombat() every main tick, same
// deadline-not-countdown rule as every timer in this game) regardless of
// what the player does. The player has a separate clock of their own
// (playerCooldownUntil) -- whenever it's passed, Attack/Defend/Eat become
// available; picking one starts the cooldown again. Nothing here is a
// turn -- the two clocks run independently, so a slow weapon-and-armor
// combo really can mean multiple enemy hits between two of the player's.
//
// All four stats come from whatever's actually equipped, not a level:
//   Weapon -- the Attack damage roll (WEAPONS in data.js; unarmed falls
//     back to COMBAT_UNARMED, same "fall back rather than block the
//     screen" rule mining.js uses for an unequipped pickaxe).
//   Armor  -- `defense` (stacks with the shield's) and `recoveryMult`,
//     which scales the player's own cooldown -- heavier armor blocks more
//     but leaves the player open longer between actions. That tradeoff is
//     the entire reason Armor is its own slot instead of one flat "gear
//     level" number.
//   Shield -- more `defense`, plus `block`: an extra cut that only applies
//     when Defend is used, on top of the flat halving.
//   Food   -- Eat consumes whatever's equipped here (FOODS in data.js),
//     not a hardcoded item -- equip a better food, Eat gets better,
//     nothing about this file changes.
//
// Player HP resets to full at the start of every fight rather than
// persisting between them -- there's no expedition/checkpoint layer yet
// for it to matter across fights (see README's combat notes for where
// that'd plug in later).

import {
  COMBAT_UNARMED, COMBAT_BASE_DEFENSE, COMBAT_BASE_RECOVERY_MS, COMBAT_XP,
  COMBAT_PLAYER_MAX_HP, FLEE_CHANCE, WEAPONS, ARMORS, SHIELDS, FOODS, ENEMIES,
} from "./data.js";
import { state, save, gainItem } from "./state.js";
import { levelProgress, levelFromXp } from "./skills.js";
import { el } from "./dom.js";
import { show } from "./screens.js";
import { drawBag, updateWalletNote, updateSkillsNote } from "./hub.js";

// Left and Right Hand are interchangeable -- a weapon or a shield can sit
// in either, so these check both rather than one fixed slot. Checking
// armLeft first is arbitrary; a two-handed weapon blocks the other hand
// entirely (src/inventory.js), so there's never a real weapon-in-one-hand-
// shield-in-the-other case to worry about ordering for there, only which
// single hand a one-handed item happens to be sitting in.
function weaponStats() {
  return WEAPONS[state.equipment.armLeft] || WEAPONS[state.equipment.armRight] || COMBAT_UNARMED;
}
function shieldStats() {
  return SHIELDS[state.equipment.armLeft] || SHIELDS[state.equipment.armRight] || { defense: 0, block: 0 };
}
function armorStats() { return ARMORS[state.equipment.chest] || { defense: 0, recoveryMult: 1 }; }
function foodStats() { return FOODS[state.equipment.food] || null; }

function totalDefense() { return COMBAT_BASE_DEFENSE + armorStats().defense + shieldStats().defense; }
function recoveryMs() { return Math.round(COMBAT_BASE_RECOVERY_MS * armorStats().recoveryMult); }

function roll(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

let combatLog = [];
function log(text, cls) {
  combatLog.unshift({ text: text, cls: cls || "" });
  if (combatLog.length > 30) combatLog.length = 30;
  drawLog();
}

function drawLog() {
  const wrap = el("combat-log");
  if (!wrap) return;
  wrap.replaceChildren();
  combatLog.forEach(function (entry) {
    const row = document.createElement("div");
    if (entry.cls) row.className = entry.cls;
    row.textContent = entry.text;
    wrap.append(row);
  });
}

// Starts (or resumes, mid-cycle) a bar's fill transition from wherever it
// actually is toward 100% -- computed from `remaining`/`total` rather than
// always restarting at 0%, so this is safe to call both "a cycle just
// began" (remaining === total) and "the player switched back to this
// screen mid-cycle" (remaining < total) without a visible jump. Calling
// this from a per-tick redraw would restart the transition every tick and
// the bar would never visibly move -- it's only ever called once per event
// (a cycle starting) or once per screen-open (a resync), never from the
// tick loop.
function syncBar(node, remainingMs, totalMs) {
  const donePct = totalMs > 0 ? (1 - remainingMs / totalMs) * 100 : 100;
  node.style.transitionDuration = "0ms";
  node.style.width = donePct + "%";
  void node.offsetWidth;
  node.style.transitionDuration = Math.max(0, remainingMs) + "ms";
  node.style.width = "100%";
}

// Re-syncs both timer bars from the live deadlines in state.combat -- safe
// to call from an action handler (a fresh cycle just started) or from
// screens.js on screen-open (resuming a cycle already in progress).
export function syncTimerBars() {
  const c = state.combat;
  if (!c) return;
  const enemy = ENEMIES[c.enemyKey];
  if (!c.over) {
    syncBar(el("combat-enemy-timer-fill"), Math.max(0, c.enemyNextAttackAt - Date.now()), enemy.attackMs);
  }
  const cdFill = el("combat-player-cd-fill");
  if (c.over || Date.now() >= c.playerCooldownUntil) {
    cdFill.style.transitionDuration = "0ms";
    cdFill.style.width = "100%";
  } else {
    syncBar(cdFill, Math.max(0, c.playerCooldownUntil - Date.now()), recoveryMs());
  }
}

// One card per ENEMIES entry -- same "rebuild the whole list from data"
// shape Township's cards use, so a new enemy is just a new data.js entry,
// not a markup change. Rendered once at boot (like Township) rather than
// every time the idle screen shows, since nothing about the roster changes
// mid-game yet.
function buildCombatIdle() {
  const wrap = el("combat-enemy-list");
  wrap.replaceChildren();
  Object.keys(ENEMIES).forEach(function (key) {
    const enemy = ENEMIES[key];
    const btn = document.createElement("button");
    btn.className = "villager-hire";
    btn.innerHTML =
      '<span class="villager-hire-icon">' + enemy.icon + "</span>" +
      '<span class="villager-hire-body">' +
        '<span class="villager-hire-name">Fight a ' + enemy.name + "</span>" +
        '<span class="villager-hire-sub">' + enemy.note + "</span>" +
      "</span>" +
      '<span class="villager-hire-level">Lv ' + enemy.level + "</span>";
    btn.addEventListener("click", function () { startFight(key); });
    wrap.append(btn);
  });
}

function startFight(enemyKey) {
  if (state.combat && !state.combat.over) return;
  // "Fight Again" (combat-btn-again) passes no key -- refight whatever's
  // still sitting on the just-ended state.combat rather than the idle
  // screen's own choice, which no longer reflects what's on screen.
  const key = enemyKey || state.combat.enemyKey;
  const enemy = ENEMIES[key];
  combatLog = [];
  state.combat = {
    enemyKey: key,
    enemyHP: enemy.hp,
    enemyMaxHP: enemy.hp,
    playerHP: COMBAT_PLAYER_MAX_HP,
    playerMaxHP: COMBAT_PLAYER_MAX_HP,
    enemyNextAttackAt: Date.now() + enemy.attackMs,
    playerCooldownUntil: Date.now(),
    braced: false,
    over: null,
  };
  save();
  log(enemy.name + " blocks the path.", "system");
  refreshCombat();
  syncTimerBars();
}

// Resolves every enemy attack that's come due since the last check -- not
// just one, so a fight left running through a reload catches up in full
// (and can end in a loss the same way it would have if the tab stayed
// open), same catch-up rule settleForage()'s villager cycle uses. Returns
// whether anything changed, so main.js knows whether a redraw is worth it.
export function settleCombat() {
  const c = state.combat;
  if (!c || c.over) return false;
  const enemy = ENEMIES[c.enemyKey];
  let changed = false;
  while (state.combat && !state.combat.over && Date.now() >= state.combat.enemyNextAttackAt) {
    resolveEnemyAttack(enemy);
    changed = true;
  }
  if (changed) {
    save();
    // Once per settle, not once per resolved attack -- a long catch-up
    // (the tab was closed for a while) can resolve several attacks in the
    // while loop above, and only the final deadline matters for the bar.
    syncTimerBars();
  }
  return changed;
}

function resolveEnemyAttack(enemy) {
  const c = state.combat;
  let dmg = Math.max(1, roll(enemy.atkMin, enemy.atkMax) - totalDefense());
  if (c.braced) {
    dmg = Math.max(1, Math.ceil(dmg * (0.5 - shieldStats().block)));
    c.braced = false;
    log(enemy.name + " attacks for " + dmg + " (braced).", "hit-player");
  } else {
    log(enemy.name + " attacks for " + dmg + ".", "hit-player");
  }
  c.playerHP = clamp(c.playerHP - dmg, 0, c.playerMaxHP);
  c.enemyNextAttackAt += enemy.attackMs;
  if (c.playerHP <= 0) endFight(false);
}

function attack() {
  const c = state.combat;
  if (!c || c.over || Date.now() < c.playerCooldownUntil) return;
  const w = weaponStats();
  const enemy = ENEMIES[c.enemyKey];
  const dmg = Math.max(1, roll(w.atkMin, w.atkMax) - enemy.def);
  c.enemyHP = clamp(c.enemyHP - dmg, 0, c.enemyMaxHP);
  log("You hit the " + enemy.name + " for " + dmg + ".", "hit-enemy");
  c.playerCooldownUntil = Date.now() + recoveryMs();
  if (c.enemyHP <= 0) endFight(true);
  save();
  refreshCombat();
  syncTimerBars();
}

function defend() {
  const c = state.combat;
  if (!c || c.over || Date.now() < c.playerCooldownUntil) return;
  c.braced = true;
  log("You brace for the next attack.", "brace");
  c.playerCooldownUntil = Date.now() + recoveryMs();
  save();
  refreshCombat();
  syncTimerBars();
}

function eat() {
  const c = state.combat;
  if (!c || c.over || Date.now() < c.playerCooldownUntil) return;
  const foodName = state.equipment.food;
  const food = foodStats();
  if (!food || (state.bag[foodName] || 0) < 1) return;
  state.bag[foodName] -= 1;
  const before = c.playerHP;
  c.playerHP = clamp(c.playerHP + food.heal, 0, c.playerMaxHP);
  log("You eat " + foodName + ", +" + (c.playerHP - before) + " HP.", "heal");
  c.playerCooldownUntil = Date.now() + recoveryMs();
  save();
  drawBag();
  refreshCombat();
  syncTimerBars();
}

// A coin flip, checked once per tap -- succeed and the fight just ends,
// no win, no loss, nothing carried over from it either way. Fail and
// it's spent like any other action: the normal recovery cooldown, and the
// enemy's own clock never stopped ticking while you deliberated.
function flee() {
  const c = state.combat;
  if (!c || c.over || Date.now() < c.playerCooldownUntil) return;
  if (Math.random() < FLEE_CHANCE) {
    log("You break off and flee.", "system");
    c.over = "fled";
    save();
    refreshCombat();
    return;
  }
  log("You can't get away!", "system");
  c.playerCooldownUntil = Date.now() + recoveryMs();
  save();
  refreshCombat();
  syncTimerBars();
}

function endFight(won) {
  const c = state.combat;
  const enemy = ENEMIES[c.enemyKey];
  c.over = won ? "won" : "lost";
  if (won) {
    state.combatXp += COMBAT_XP;
    state.shards += enemy.shardReward;
    const drops = enemy.drops || {};
    Object.keys(drops).forEach(function (item) { gainItem(item, drops[item]); });
    log("The " + enemy.name + " is defeated.", "system");
    updateSkillsNote();
    updateWalletNote();
    drawBag();
  } else {
    log("You are knocked out.", "system");
  }
  save();
}

let combatLevelBefore = null;

export function drawCombatXp() {
  const p = levelProgress(state.combatXp);
  el("combat-xp-level").textContent = "Combat — Level " + p.level;
  el("combat-xp-count").textContent = p.into + " / " + p.need;
  el("combat-xp-fill").style.width = (Math.min(1, p.into / p.need) * 100).toFixed(1) + "%";

  if (combatLevelBefore !== null && p.level > combatLevelBefore) {
    const bar = document.querySelector("#screen-combat .xp-bar");
    bar.classList.remove("levelup");
    void bar.offsetWidth;
    bar.classList.add("levelup");
  }
  combatLevelBefore = p.level;
}

export function refreshCombat() {
  const c = state.combat;
  const idle = el("combat-idle");
  const arena = el("combat-arena");
  const result = el("combat-result");

  if (!c) {
    idle.classList.remove("hidden");
    arena.classList.add("hidden");
    result.classList.remove("show");
    return;
  }
  idle.classList.add("hidden");
  arena.classList.remove("hidden");

  const enemy = ENEMIES[c.enemyKey];
  el("combat-enemy-name").textContent = enemy.name;
  el("combat-enemy-hp-num").textContent = c.enemyHP;
  el("combat-enemy-maxhp-num").textContent = c.enemyMaxHP;
  el("combat-enemy-hp-fill").style.width = (c.enemyHP / c.enemyMaxHP * 100) + "%";

  el("combat-player-hp-num").textContent = c.playerHP;
  el("combat-player-maxhp-num").textContent = c.playerMaxHP;
  el("combat-player-hp-fill").style.width = (c.playerHP / c.playerMaxHP * 100) + "%";
  el("combat-player-hp-fill").classList.toggle("low", c.playerHP / c.playerMaxHP < 0.3);

  el("combat-brace-badge").style.display = c.braced ? "inline-block" : "none";

  // Numbers only here -- the bars themselves are a CSS transition kicked
  // off once by syncTimerBars() (see startFight/attack/defend/eat and
  // settleCombat), not re-triggered on every tick. Re-triggering a
  // transition every ~200ms from here would restart it before it ever
  // visibly moved.
  const running = !c.over;
  const enemyLeft = Math.max(0, c.enemyNextAttackAt - Date.now());
  el("combat-enemy-timer-num").textContent = running ? (enemyLeft / 1000).toFixed(1) + "s" : "--";

  const ready = running && Date.now() >= c.playerCooldownUntil;
  el("combat-player-cd-label").textContent = !running ? "" : ready ? "Ready" : "Recovering";

  const foodName = state.equipment.food;
  const food = foodStats();
  el("combat-eat-sub").textContent = !food
    ? "Equip food first"
    : (state.bag[foodName] || 0) < 1
      ? "Out of " + foodName
      : foodName + " x" + state.bag[foodName] + ", +" + food.heal + " HP";

  const canAct = ready;
  el("combat-btn-attack").disabled = !canAct;
  el("combat-btn-defend").disabled = !canAct;
  el("combat-btn-eat").disabled = !canAct || !food || (state.bag[foodName] || 0) < 1;
  el("combat-btn-flee").disabled = !canAct;
  el("combat-flee-sub").textContent = Math.round(FLEE_CHANCE * 100) + "% chance to escape";

  if (c.over) {
    result.classList.add("show");
    if (c.over === "won") {
      el("combat-result-headline").textContent = "Victory";
      el("combat-result-headline").className = "result-headline win";
      const drops = enemy.drops || {};
      const dropText = Object.keys(drops).map(function (item) {
        return "+" + drops[item] + " " + item;
      }).join(", ");
      el("combat-result-sub").textContent =
        "+" + COMBAT_XP + " Combat XP, +" + enemy.shardReward + " Shards" +
        (dropText ? ", " + dropText + "." : ".");
    } else if (c.over === "fled") {
      el("combat-result-headline").textContent = "Fled";
      el("combat-result-headline").className = "result-headline fled";
      el("combat-result-sub").textContent = "No reward, no harm done.";
    } else {
      el("combat-result-headline").textContent = "Defeated";
      el("combat-result-headline").className = "result-headline loss";
      el("combat-result-sub").textContent = "No reward this time.";
    }
  } else {
    result.classList.remove("show");
  }
}

buildCombatIdle();

el("combat-btn-attack").addEventListener("click", attack);
el("combat-btn-defend").addEventListener("click", defend);
el("combat-btn-eat").addEventListener("click", eat);
el("combat-btn-flee").addEventListener("click", flee);
el("combat-btn-again").addEventListener("click", function () { startFight(); });

// A concluded fight (won/lost/fled) never cleared state.combat on its own,
// so the idle enemy list -- refreshCombat()'s `if (!c)` branch -- became
// permanently unreachable the moment a player fought anything even once:
// leaving and coming back always resumed the same finished result screen,
// with only "Fight Again" (the same enemy) ever available. This is the
// explicit escape hatch, sitting right on the result panel so picking a
// different enemy doesn't need leaving the screen at all.
function chooseAnother() {
  if (state.combat && state.combat.over) {
    state.combat = null;
    save();
  }
  refreshCombat();
}
el("combat-btn-choose").addEventListener("click", chooseAnother);

// Leaving via the header back button after a fight has concluded clears it
// too, so coming back into Combat from the hub card shows the enemy list
// again instead of the same stale result screen.
el("back-combat").addEventListener("click", function () {
  if (state.combat && state.combat.over) { state.combat = null; save(); }
  show("home");
});
