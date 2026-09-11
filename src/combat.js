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
  COMBAT_PLAYER_MAX_HP, FLEE_CHANCE, COMBAT_NIGHT_MULT, WEAPONS, ARMORS, SHIELDS, FOODS, ENEMIES,
  LOCATIONS, COMBAT_AUTO_ATTACK_DELAY_MS,
} from "./data.js";
import { state, save, gainItem, gainSkillXp } from "./state.js";
import { openZoneWheel } from "./zoneWheel.js";
import { levelProgress, levelFromXp } from "./skills.js";
import { isNight } from "./time.js";
import { el } from "./dom.js";
import { show } from "./screens.js";
import { drawBag, updateWalletNote, updateSkillsNote } from "./hub.js";

// Baked into the fight once, at startFight() -- see state.combat.nightBoost
// below. Every place that reads an enemy's raw hp/atk/reward numbers reads
// this multiplier alongside it, rather than calling isNight() again mid-
// fight (a fight that happens to straddle the real-world day/night
// boundary shouldn't have its difficulty shift under the player's feet).
function nightMult(c) { return c.nightBoost ? COMBAT_NIGHT_MULT : 1; }

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
// One body slot's own armor -- Helm and Legs work exactly like Chest
// always has, just nothing filled them until the Highland set. Falls back
// to a neutral {0, 1} for an empty (or non-armor) slot, same "no penalty
// for going without" rule the shield/weapon fallbacks already follow.
function armorStats(slot) { return ARMORS[state.equipment[slot]] || { defense: 0, recoveryMult: 1 }; }
function foodStats() { return FOODS[state.equipment.food] || null; }

// Every body slot's defense stacks (plus the shield's); every body slot's
// recoveryMult multiplies together onto the base recovery time -- three
// neutral 1's is a no-op, same as today with only Chest ever filled.
function totalDefense() {
  return COMBAT_BASE_DEFENSE + armorStats("helm").defense + armorStats("chest").defense +
    armorStats("legs").defense + shieldStats().defense;
}
function recoveryMs() {
  return Math.round(
    COMBAT_BASE_RECOVERY_MS * armorStats("helm").recoveryMult * armorStats("chest").recoveryMult * armorStats("legs").recoveryMult
  );
}

// Sets the player's own cooldown *and* schedules the auto-attack fallback
// alongside it -- the one place every action (attack/defend/eat/a failed
// flee) reschedules both together, so nothing can set one without the
// other drifting out of sync. `c.autoAttackAt` is always
// COMBAT_AUTO_ATTACK_DELAY_MS past whenever the player next becomes ready,
// recomputed fresh every time -- same "read live, don't cache" rule
// recoveryMs() itself already follows, so an armor swap or a level-up
// mid-fight changes the very next window, not just future ones.
function scheduleCooldown(c, ms) {
  c.playerCooldownUntil = Date.now() + ms;
  c.autoAttackAt = c.playerCooldownUntil + COMBAT_AUTO_ATTACK_DELAY_MS;
}

function roll(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

// An ENEMIES `drops` entry is either a plain number (every drop before
// Road Goblin) or a `[min, max]` pair, rolled fresh per kill -- Scrap
// Metal's own "1-3" is the first to use the range form.
function rollDropQty(spec) {
  return Array.isArray(spec) ? roll(spec[0], spec[1]) : spec;
}

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

// One card per ENEMIES entry the player can actually reach from here --
// same "rebuild the whole list from data" shape Township's cards use, so
// a new enemy is just a new data.js entry, not a markup change. An entry
// with no `zone` shows everywhere, same as every enemy before Road
// Goblin always has; one with a `zone` only shows while
// state.currentLocation matches it. Rebuilt on Combat's own screens.js
// show() (arriving somewhere new can add or remove cards) rather than
// once at boot the way it used to when the roster never changed.
export function buildCombatIdle() {
  const wrap = el("combat-enemy-list");
  wrap.replaceChildren();
  Object.keys(ENEMIES).filter(function (key) {
    const zone = ENEMIES[key].zone;
    return !zone || zone === state.currentLocation;
  }).forEach(function (key) {
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
  const night = isNight();
  const hpMult = night ? COMBAT_NIGHT_MULT : 1;
  combatLog = [];
  state.combat = {
    enemyKey: key,
    enemyHP: enemy.hp * hpMult,
    enemyMaxHP: enemy.hp * hpMult,
    playerHP: COMBAT_PLAYER_MAX_HP,
    playerMaxHP: COMBAT_PLAYER_MAX_HP,
    enemyNextAttackAt: Date.now() + enemy.attackMs,
    playerCooldownUntil: Date.now(),
    // The very first attack of a fight no longer needs an exact-timed tap
    // the instant the enemy appears -- it fires on its own after the same
    // COMBAT_AUTO_ATTACK_DELAY_MS grace every other auto-attack gets,
    // unless the player acts (Attack/Defend/Eat/Flee) first.
    autoAttackAt: Date.now() + COMBAT_AUTO_ATTACK_DELAY_MS,
    braced: false,
    over: null,
    nightBoost: night,
    lastDrops: null,
    // Attacks left with a faster recovery, and the multiplier itself --
    // set by eat() whenever the food just eaten carries FOODS'
    // recoveryBoostAttacks/recoveryBoostMult (Honey's own, so far).
    // Ticked down by attack() specifically, not Defend/Eat/Flee -- "next
    // N attacks" per the food's own description.
    recoveryBoost: 0,
    recoveryBoostMult: 1,
  };
  save();
  log(enemy.name + " blocks the path." + (night ? " It looks tougher in the dark." : ""), "system");
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
  // Attack fires on its own once the player's own grace window
  // (autoAttackAt, see scheduleCooldown()) runs out -- reuses attack()
  // itself rather than duplicating its logic, so this behaves exactly
  // like a manual tap would (same ammo check, same damage roll, same
  // recovery/auto-attack rescheduling for the *next* window). A no-op if
  // the player already acted this window (attack()'s own cooldown guard)
  // or is out of ammo (nothing left to reschedule until the player
  // intervenes -- same as today's manual-attack-blocked case).
  if (state.combat && !state.combat.over && Date.now() >= state.combat.autoAttackAt) {
    attack();
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
  const mult = nightMult(c);
  let dmg = Math.max(1, roll(enemy.atkMin * mult, enemy.atkMax * mult) - totalDefense());
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
  // A ranged weapon spends one of its own ammo straight from the bag per
  // shot -- same "check the bag directly, no equip step" rule Fishing's
  // Net/Trap already use for themselves. Out of ammo is a hard block, not
  // a fallback to unarmed -- refreshCombat() already disables the button
  // before this can even be reached in practice, this is the backstop.
  if (w.ammo && (state.bag[w.ammo] || 0) < 1) return;
  if (w.ammo) state.bag[w.ammo] -= 1;
  const enemy = ENEMIES[c.enemyKey];
  const dmg = Math.max(1, roll(w.atkMin, w.atkMax) - enemy.def);
  c.enemyHP = clamp(c.enemyHP - dmg, 0, c.enemyMaxHP);
  const boosted = c.recoveryBoost > 0;
  log("You hit the " + enemy.name + " for " + dmg + (boosted ? " (honey-quick)" : "") + ".", "hit-enemy");
  scheduleCooldown(c, Math.round(recoveryMs() * (boosted ? c.recoveryBoostMult : 1)));
  if (boosted) {
    c.recoveryBoost -= 1;
    if (c.recoveryBoost === 0) log("The honey's energy fades.", "system");
  }
  if (c.enemyHP <= 0) endFight(true);
  save();
  if (w.ammo) drawBag();
  refreshCombat();
  syncTimerBars();
}

function defend() {
  const c = state.combat;
  if (!c || c.over || Date.now() < c.playerCooldownUntil) return;
  c.braced = true;
  log("You brace for the next attack.", "brace");
  scheduleCooldown(c, recoveryMs());
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
  let healLog = "You eat " + foodName + ", +" + (c.playerHP - before) + " HP.";
  // Optional -- only Honey carries these fields so far. Overwrites any
  // boost already running rather than stacking, same "refresh, don't
  // add" rule a second Defend before the first resolves would follow if
  // that were possible.
  if (food.recoveryBoostAttacks) {
    c.recoveryBoost = food.recoveryBoostAttacks;
    c.recoveryBoostMult = food.recoveryBoostMult || 1;
    healLog += " Recovery's quicker for your next " + food.recoveryBoostAttacks + " attacks.";
  }
  log(healLog, "heal");
  scheduleCooldown(c, recoveryMs());
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
  scheduleCooldown(c, recoveryMs());
  save();
  refreshCombat();
  syncTimerBars();
}

function endFight(won) {
  const c = state.combat;
  const enemy = ENEMIES[c.enemyKey];
  const mult = nightMult(c);
  c.over = won ? "won" : "lost";
  let zoneLevels = 0;
  if (won) {
    zoneLevels = gainSkillXp("combatXp", COMBAT_XP);
    // Split by whichever weapon actually landed the killing blow --
    // weaponStats() reads live, same as attack() itself does, so this is
    // "what's equipped right now" at the moment of the kill, not
    // whatever was equipped when the fight started. Unarmed (no
    // `ranged` flag, same as every melee weapon) counts as Melee.
    zoneLevels += gainSkillXp(weaponStats().ranged ? "archeryXp" : "meleeXp", COMBAT_XP);
    state.shards += enemy.shardReward * mult;
    const drops = enemy.drops || {};
    // Rolled once, here, and stashed on state.combat -- the result
    // panel's own display code (below) reads c.lastDrops instead of
    // re-deriving from enemy.drops, so a ranged drop (Scrap Metal's
    // "1-3") shows the exact amount actually granted, not a second,
    // different roll of the same range.
    const granted = {};
    Object.keys(drops).forEach(function (item) {
      const qty = rollDropQty(drops[item]) * mult;
      // gainItem()'s own return -- what actually made it into the bag --
      // not the rolled `qty` itself, so a full bag never shows loot the
      // player didn't actually receive.
      granted[item] = gainItem(item, qty);
    });
    c.lastDrops = granted;
    log("The " + enemy.name + " is defeated.", "system");
    updateSkillsNote();
    updateWalletNote();
    drawBag();
  } else {
    log("You are knocked out.", "system");
  }
  save();
  if (zoneLevels) openZoneWheel(state.currentLocation, zoneLevels);
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

// Archery/Melee's own compact progress, shown in the arena while actually
// fighting (per the request) rather than as full xp-bars like Combat's
// own -- no level-up flash on these two, just the numbers, so the arena
// doesn't get busier than the combat log's own removal was trying to fix.
export function drawWeaponSkillsXp() {
  const archery = levelProgress(state.archeryXp);
  const melee = levelProgress(state.meleeXp);
  el("combat-archery-level").textContent = "Archery — Lv " + archery.level;
  el("combat-archery-fill").style.width = (Math.min(1, archery.into / archery.need) * 100).toFixed(1) + "%";
  el("combat-melee-level").textContent = "Melee — Lv " + melee.level;
  el("combat-melee-fill").style.width = (Math.min(1, melee.into / melee.need) * 100).toFixed(1) + "%";
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
    el("combat-night-note").classList.toggle("hidden", !isNight());
    return;
  }
  idle.classList.add("hidden");
  arena.classList.remove("hidden");

  const enemy = ENEMIES[c.enemyKey];
  el("combat-enemy-name").textContent = enemy.name + (c.nightBoost ? " \u{1F319} (2x)" : "");
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

  // Same "name the exact ammo and how many are left" treatment Eat's own
  // sub-text gives food -- only a `ranged` weapon (its own `ammo` field,
  // data.js) has anything to report here. Explicit else back to the
  // original static copy, not just "leave it alone" -- switching away
  // from a bow (unequip, or a two-handed swap) needs this to stop
  // reading a stale "Out of Flint Arrows" from whatever was equipped a
  // moment ago.
  const w = weaponStats();
  const outOfAmmo = !!w.ammo && (state.bag[w.ammo] || 0) < 1;
  let attackSub = !w.ammo
    ? "Weapon damage, no defense"
    : outOfAmmo ? "Out of " + w.ammo : w.ammo + " x" + state.bag[w.ammo];
  // Attack fires on its own now (see scheduleCooldown()/settleCombat()) --
  // this is just the countdown to that, so the player can see at a glance
  // how long they've got left to tap Defend/Eat/Flee instead before it
  // happens for them. Silent once out of ammo (nothing's about to
  // auto-fire) or already mid-recovery (the number would be stale/
  // negative until the next window opens).
  if (running && ready && !outOfAmmo) {
    const untilAuto = Math.max(0, c.autoAttackAt - Date.now());
    attackSub += " — auto-attacking in " + (untilAuto / 1000).toFixed(1) + "s";
  }
  el("combat-attack-sub").textContent = attackSub;

  const canAct = ready;
  el("combat-btn-attack").disabled = !canAct || outOfAmmo;
  el("combat-btn-defend").disabled = !canAct;
  el("combat-btn-eat").disabled = !canAct || !food || (state.bag[foodName] || 0) < 1;
  el("combat-btn-flee").disabled = !canAct;
  el("combat-flee-sub").textContent = Math.round(FLEE_CHANCE * 100) + "% chance to escape";

  if (c.over) {
    result.classList.add("show");
    if (c.over === "won") {
      el("combat-result-headline").textContent = "Victory";
      el("combat-result-headline").className = "result-headline win";
      const mult = nightMult(c);
      // c.lastDrops (the exact amounts endFight() actually rolled and
      // granted), not enemy.drops re-derived here -- a ranged drop would
      // otherwise show a second, different roll of the same range than
      // the one that actually landed in the bag.
      const drops = c.lastDrops || {};
      // A full bag can grant 0 of something that still rolled (bagRoomFor()
      // truncated it, see gainItem()) -- filtered out here rather than
      // showing a confusing "+0 Bones".
      const dropText = Object.keys(drops).filter(function (item) { return drops[item] > 0; }).map(function (item) {
        return "+" + drops[item] + " " + item;
      }).join(", ");
      el("combat-result-sub").textContent =
        "+" + COMBAT_XP + " Combat XP, +" + (enemy.shardReward * mult) + " Shards" +
        (dropText ? ", " + dropText + "." : ".") +
        (c.nightBoost ? " (night bonus applied)" : "");
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
  show("explore");
});
