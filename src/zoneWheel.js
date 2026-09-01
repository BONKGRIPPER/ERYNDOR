// ============================================================ zone wheel
//
// The level-up moment for a zone -- ported from the Leatheron prototype's
// own loot wheel (three reels scrolling to a staggered stop), adapted to
// this game's own reward shape: every spin is a guaranteed win off
// ZONE_LOOT_POOL (data.js), no "miss" slice the source project's own
// weighted table had, per the user's own ask ("just have the player gain
// either stone, pine logs, or flint"). Opened once per level a zone just
// gained -- see state.js's gainSkillXp()/gainZoneXp(), which return how
// many levels a single XP grant crossed; openZoneWheel() below queues one
// spin per level, so a big grant crossing more than one at once still
// shows each in turn instead of the later ones stomping the earlier ones.
//
// The reward is rolled and granted to the bag the instant a spin actually
// starts, same "reels are theatre, not a randomizer" rule the source
// project uses -- the animation is a few seconds of suspense over an
// outcome that's already locked in, not something that could still land
// differently. `drawBag()` runs then too, so the count is already correct
// underneath by the time the result text reveals it.

import { ZONE_LOOT_POOL, TINTS, LOCATIONS } from "./data.js";
import { state, save, gainItem } from "./state.js";
import { el } from "./dom.js";
import { drawBag } from "./hub.js";

// Must match .zw-icon/.zw-reel's own height in style.css -- one icon's
// worth of scroll per step.
const REEL_ICON_PX = 56;
const REEL_DECOYS = 10;                     // icons scrolled past before landing
const REEL_DURATIONS_MS = [450, 625, 800];  // staggered so the three reels don't stop in sync
const DISMISS_GRACE_MS = 350;               // guards the tap that opened it from also closing it

function roll(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

function randomPoolItem() {
  return ZONE_LOOT_POOL[Math.floor(Math.random() * ZONE_LOOT_POOL.length)];
}

function pickReward() {
  const entry = randomPoolItem();
  return { item: entry.item, amount: roll(entry.min, entry.max) };
}

// Fills one reel strip with REEL_DECOYS random icons plus the winning one
// appended last, then animates it up to land exactly on that final icon --
// a plain JS-driven CSS transform transition, same approach the source
// project used (no keyframes, no library).
function buildReel(strip, winningItem, durationMs) {
  strip.replaceChildren();
  strip.style.transitionDuration = "0ms";
  strip.style.transform = "translateY(0)";

  let count = 0;
  for (let i = 0; i < REEL_DECOYS; i++) {
    appendIcon(strip, randomPoolItem().item);
    count++;
  }
  appendIcon(strip, winningItem);
  count++;

  void strip.offsetWidth;   // force the reset above to actually apply before retargeting
  requestAnimationFrame(function () {
    strip.style.transitionDuration = durationMs + "ms";
    strip.style.transform = "translateY(-" + ((count - 1) * REEL_ICON_PX) + "px)";
  });
}

function appendIcon(strip, item) {
  const icon = document.createElement("div");
  icon.className = "zw-icon";
  const dot = document.createElement("span");
  dot.className = "dot";
  dot.style.width = "26px";
  dot.style.height = "26px";
  dot.style.background = TINTS[item] || "#9a8f7d";
  icon.append(dot);
  strip.append(icon);
}

let closeTimer = 0;
let resultTimer = 0;
let openedAt = 0;
let spinning = false;
const queue = [];

function closeWheel() {
  el("zonewheel").classList.add("hidden");
  clearTimeout(closeTimer);
  clearTimeout(resultTimer);
}

function runNext() {
  if (spinning || queue.length === 0) return;
  spinning = true;
  spin(queue.shift());
}

function spin(zoneId) {
  const reward = pickReward();
  gainItem(reward.item, reward.amount);
  save();
  drawBag();

  const zone = LOCATIONS[zoneId];
  el("zw-zone").textContent = (zone ? zone.name : zoneId) + " leveled up!";
  el("zw-lv").textContent = "Level " + state.zones[zoneId].level;
  const result = el("zw-result");
  result.textContent = "Spinning…";
  result.className = "zw-result";

  [0, 1, 2].forEach(function (i) {
    buildReel(el("zw-strip-" + i), reward.item, REEL_DURATIONS_MS[i]);
  });

  el("zonewheel").classList.remove("hidden");
  openedAt = performance.now();

  const settleMs = Math.max.apply(null, REEL_DURATIONS_MS) + 75;
  resultTimer = setTimeout(function () {
    result.textContent = "+" + reward.amount + " " + reward.item + "!";
    result.classList.add("win");
  }, settleMs);

  closeTimer = setTimeout(function () {
    spinning = false;
    closeWheel();
    runNext();
  }, settleMs + 2400);
}

// Called by every skill's own gain-XP call site with however many levels
// gainSkillXp() just reported (0 most of the time -- a no-op call, so
// nothing else has to guard the call site itself with an `if`).
export function openZoneWheel(zoneId, levels) {
  for (let i = 0; i < levels; i++) queue.push(zoneId);
  runNext();
}

// Tap anywhere on the overlay (the card included, same as the source
// project's own single click zone) to dismiss early -- guarded by
// DISMISS_GRACE_MS so the very tap that leveled the zone (and thus opened
// this) doesn't also register as the dismiss.
el("zonewheel").addEventListener("click", function () {
  if (performance.now() - openedAt < DISMISS_GRACE_MS) return;
  spinning = false;
  closeWheel();
  runNext();
});
