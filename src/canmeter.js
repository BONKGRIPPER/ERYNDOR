// =============================================================== canmeter
//
// The watering can's charge pips and refill countdown -- identical
// rendering for Farm and Logging, each of which owns its own can (its own
// state slot, its own screen), so this is a real second consumer rather
// than a guess at future reuse. Same "deadline, not countdown" rule as
// every other timer: settleCanRefill() just checks whether refillAt has
// passed, nothing here ticks anything down.
//
// Capacity comes from whatever's equipped in the Inventory's Watering Can
// slot (CANS in data.js), not a flat constant -- Farm and Logging share the
// one equipped can, same as they'd share a better axe once a second tier of
// one exists. CAN_CAPACITY is still the fallback for the (should-never-
// happen) unequipped case.

import { CAN_CAPACITY, CAN_REFILL_MS, CANS } from "./data.js";
import { state } from "./state.js";
import { useSprite, slug } from "./sprites.js";

function canCapacity() {
  const tier = CANS[state.equipment.can];
  return tier ? tier.capacity : CAN_CAPACITY;
}

// Starts a refill if (and only if) the can is actually empty and isn't
// already refilling. Returns whether it did, so the caller knows whether
// to treat the tap as "start refilling" or fall through to a normal
// tool-select tap.
export function tryStartCanRefill(can) {
  if (can.charges >= 1 || can.refillAt !== null) return false;
  can.refillAt = Date.now() + CAN_REFILL_MS;
  return true;
}

// Resolves a finished refill. Returns whether it did, so callers only
// re-save/redraw when something actually changed.
export function settleCanRefill(can) {
  if (can.refillAt === null || Date.now() < can.refillAt) return false;
  can.charges = canCapacity();
  can.refillAt = null;
  return true;
}

export function drawCanMeter(screenId, can) {
  const btn = document.querySelector("#" + screenId + ' .tool[data-tool="water"]');
  if (!btn) return;

  btn.querySelectorAll(".can-pip").forEach(function (pip, i) {
    pip.classList.toggle("filled", i < can.charges);
  });

  const equipped = state.equipment.can;
  if (equipped) useSprite(btn.querySelector(".tool-icon"), "items/" + slug(equipped));

  const label = btn.querySelector(".tool-label");
  const refilling = can.refillAt !== null;
  const empty = !refilling && can.charges < 1;
  btn.classList.toggle("refilling", refilling);
  btn.classList.toggle("empty", empty);

  if (refilling) {
    const left = Math.max(0, Math.ceil((can.refillAt - Date.now()) / 1000));
    label.textContent = "Refilling… " + left + "s";
  } else if (empty) {
    label.textContent = "Empty — Tap to Refill";
  } else {
    label.textContent = equipped || "Watering Can";
  }
}
