// ================================================================ inventory
//
// Three pages, switched by the same bottom-tab pattern Farm's tools use,
// not two independent pieces any more: Equipment (gear on the body), Bag
// (carried), Storage (at Aerendell). Nothing here is animated or
// time-based, so there's no tick loop to hook into -- everything just
// redraws on open or on a tap.
//
// Equipping actually moves the item now -- itemAdd(state.bag, name, -1) the
// moment it's equipped, +1 back the moment it's unequipped -- rather than
// leaving a copy sitting in both places. That's what "just show the sprite"
// on a filled slot means: there's exactly one of that item, and it's either
// in the bag grid or in its slot, never drawn twice.

import { TINTS, EQUIP_SLOTS, EQUIPMENT, WEAPONS } from "./data.js";
import { state, save } from "./state.js";
import { useSprite, slug } from "./sprites.js";
import { el } from "./dom.js";
import { show } from "./screens.js";
import { openSheet, closeSheet } from "./sheet.js";

let view = "equipment";   // "equipment" | "bag" | "storage"

function bagFor(v) { return v === "storage" ? state.storage : state.bag; }

function itemGet(container, name) { return container[name] || 0; }

function itemAdd(container, name, amount) {
  const next = itemGet(container, name) + amount;
  if (next <= 0) delete container[name];
  else container[name] = next;
}

// ------------------------------------------------------------------- equip
//
// One full-width pill per slot now (2026-08-28), not a 3x3 body grid plus
// a separate tool column -- Armor first, then Hands (weapons/shields),
// then Tools, matching the order the request asked for rather than the
// sketch's spatial body layout. A tap never unequips directly any more --
// it always opens the picker, which now lists "Unequip" as its own row
// alongside whatever else could go there, so clearing a slot is still one
// tap away, just an explicit choice inside the same menu rather than the
// slot's own default action.
const EQUIP_ORDER = ["helm", "chest", "legs", "armLeft", "armRight", "axe", "pick", "can", "scythe", "fishing", "food"];

// True once anything in EQUIPMENT actually targets this slot -- Helm, Legs
// and Fishing Rod are real slots on the layout with no item that can fill
// them yet, so they render locked rather than as a live empty slot with
// nothing a picker could ever offer.
function slotIsBacked(slotId) {
  return Object.keys(EQUIPMENT).some(function (name) {
    const v = EQUIPMENT[name];
    return v === slotId || (v === "arm" && (slotId === "armLeft" || slotId === "armRight"));
  });
}

// A two-handed weapon in one hand blocks the other -- there's no second
// copy of it sitting in the other slot, that slot just can't be used while
// this is true. See WEAPONS' `twoHanded` in data.js.
function armBlockedBy(slotId) {
  if (slotId !== "armLeft" && slotId !== "armRight") return null;
  const other = slotId === "armLeft" ? "armRight" : "armLeft";
  const w = WEAPONS[state.equipment[other]];
  return (w && w.twoHanded) ? state.equipment[other] : null;
}

// Equipping over an already-filled slot returns the old item to the bag
// first -- a straight swap in one tap, rather than making the player
// unequip and re-open the picker to change their mind.
function equip(slot, name) {
  const previous = state.equipment[slot.id];
  if (previous) itemAdd(state.bag, previous, 1);
  itemAdd(state.bag, name, -1);
  state.equipment[slot.id] = name;
  save();
  buildInventory();
}

function unequip(slot) {
  const name = state.equipment[slot.id];
  if (!name) return;
  itemAdd(state.bag, name, 1);
  state.equipment[slot.id] = null;
  save();
  buildInventory();
}

function buildEquipRow(slot) {
  const equipped = state.equipment[slot.id];
  const blockedBy = armBlockedBy(slot.id);
  const locked = !equipped && !blockedBy && !slotIsBacked(slot.id);

  const btn = document.createElement("button");
  btn.className = "pill equip-row"
    + (blockedBy ? " blocked" : "")
    + (locked ? " locked" : "");

  const icon = document.createElement("span");
  icon.className = "pill-icon";
  const img = document.createElement("img");
  img.className = "sprite-img";
  img.alt = "";
  img.draggable = false;
  const fallback = document.createElement("span");
  fallback.className = "sprite-fallback";
  if (equipped) fallback.style.background = TINTS[equipped] || "#9a8f7d";
  icon.append(img, fallback);
  if (equipped) useSprite(icon, "items/" + slug(equipped));

  const body = document.createElement("span");
  body.className = "pill-body";
  const name = document.createElement("span");
  name.className = "pill-name";
  name.textContent = slot.name;
  const sub = document.createElement("span");
  sub.className = "pill-sub";
  sub.textContent = blockedBy ? "2-Handed (" + blockedBy + ")" : locked ? "Locked" : equipped || "Empty — tap to equip";
  body.append(name, sub);

  btn.append(icon, body);
  btn.addEventListener("click", function () {
    if (blockedBy || locked) return;
    openEquipPicker(slot);
  });

  return btn;
}

export function buildEquipSlots() {
  const list = el("equip-list");
  list.replaceChildren();
  EQUIP_ORDER.forEach(function (id) {
    const slot = EQUIP_SLOTS.find(function (s) { return s.id === id; });
    if (slot) list.append(buildEquipRow(slot));
  });
}

function openEquipPicker(slot) {
  const body = el("sheet-body");
  body.replaceChildren();

  const equipped = state.equipment[slot.id];
  if (equipped) {
    const unequipRow = document.createElement("button");
    unequipRow.className = "seed-row unequip-row";
    const dot = document.createElement("span");
    dot.className = "dot";
    dot.style.background = "transparent";
    dot.style.border = "1px solid var(--dim)";
    const text = document.createElement("div");
    text.className = "seed-name";
    text.textContent = "Unequip " + equipped;
    unequipRow.append(dot, text);
    unequipRow.addEventListener("click", function () {
      closeSheet();
      unequip(slot);
    });
    body.append(unequipRow);
  }

  const options = Object.keys(EQUIPMENT).filter(function (name) {
    const v = EQUIPMENT[name];
    const matches = v === slot.id || (v === "arm" && (slot.id === "armLeft" || slot.id === "armRight"));
    return matches && name !== equipped && itemGet(state.bag, name) > 0;
  });

  if (options.length === 0 && !equipped) {
    const empty = document.createElement("div");
    empty.className = "inv-empty";
    empty.textContent = "Nothing to equip here yet.";
    body.append(empty);
  }

  options.forEach(function (name) {
    const row = document.createElement("button");
    row.className = "seed-row";

    const dot = document.createElement("span");
    dot.className = "dot";
    dot.style.background = TINTS[name] || "#9a8f7d";

    const text = document.createElement("div");
    text.className = "seed-name";
    text.textContent = name;

    const count = document.createElement("span");
    count.className = "seed-count";
    count.textContent = itemGet(state.bag, name) + " owned";

    row.append(dot, text, count);
    row.addEventListener("click", function () {
      closeSheet();
      equip(slot, name);
    });
    body.append(row);
  });

  openSheet("Equip " + slot.name.toLowerCase());
}

// ------------------------------------------------------------------- grid

export function buildInventory() {
  buildEquipSlots();

  const equipPage = el("equip-page");
  const hint = el("inv-hint");
  const grid = el("inv-grid");

  if (view === "equipment") {
    equipPage.classList.remove("hidden");
    hint.classList.add("hidden");
    grid.classList.add("hidden");
    return;
  }
  equipPage.classList.add("hidden");
  hint.classList.remove("hidden");
  grid.classList.remove("hidden");

  hint.textContent = view === "bag" ? "Tap an item to store it." : "Tap an item to carry it.";
  grid.replaceChildren();

  const container = bagFor(view);
  // Equipping physically moves an item out of `bag` now, so there's no
  // "also equipped" case left to filter out here -- anything in `container`
  // is genuinely just sitting there, unequipped.
  const names = Object.keys(TINTS).filter(function (n) { return itemGet(container, n) > 0; });
  if (names.length === 0) {
    const empty = document.createElement("div");
    empty.className = "inv-empty";
    empty.textContent = view === "bag"
      ? "Nothing yet. Go plant or forage something."
      : "Nothing stored here yet.";
    grid.append(empty);
    return;
  }

  names.forEach(function (name) {
    const card = document.createElement("button");
    card.className = "inv-card";

    const img = document.createElement("img");
    img.className = "sprite-img";
    img.alt = "";
    img.draggable = false;

    // No bespoke icon exists for most items yet, so the fallback is an
    // honest placeholder -- a tinted dot, same language as the hub's bag
    // chips -- rather than a guessed-at drawing.
    const fallback = document.createElement("div");
    fallback.className = "sprite-fallback";
    fallback.style.background = TINTS[name] || "#9a8f7d";

    const count = document.createElement("div");
    count.className = "inv-count";
    count.textContent = itemGet(container, name);

    const label = document.createElement("div");
    label.className = "inv-name";
    label.textContent = name;

    card.append(img, fallback, count, label);
    card.addEventListener("click", function () { openTransferPicker(name); });
    grid.append(card);
    useSprite(card, "items/" + slug(name));
  });
}

// Same quantity-slider sheet Market's openQtyPicker uses, just moving a
// stack between Bag and Storage instead of Shards changing hands -- one
// tap opens it rather than committing the whole stack instantly, so a
// partial move (keep a few Pine Logs on hand, store the rest) doesn't need
// splitting the stack some other way first. Only ever called from the
// Bag/Storage grid, so `view` is always one of those two here.
function openTransferPicker(name) {
  const from = bagFor(view);
  const max = itemGet(from, name);
  if (max < 1) return;

  const to = view === "bag" ? state.storage : state.bag;
  const destLabel = view === "bag" ? "Storage" : "Bag";

  const body = el("sheet-body");
  body.replaceChildren();

  const wrap = document.createElement("div");
  wrap.className = "qty-picker";

  const nameEl = document.createElement("div");
  nameEl.className = "qty-picker-name";
  nameEl.textContent = name;

  const slider = document.createElement("input");
  slider.type = "range";
  slider.className = "qty-slider";
  slider.min = "1";
  slider.max = String(max);
  slider.value = String(max);   // defaults to the whole stack -- one tap still moves everything, same as before

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
    accept.textContent = "Move to " + destLabel;
  }
  slider.addEventListener("input", refresh);
  refresh();

  accept.addEventListener("click", function () {
    const qty = Math.min(Number(slider.value), itemGet(from, name));
    if (qty > 0) {
      itemAdd(from, name, -qty);
      itemAdd(to, name, qty);
      save();
      buildInventory();
    }
    closeSheet();
  });

  wrap.append(nameEl, slider, row, accept);
  body.append(wrap);

  openSheet("Move " + name);
}

function setView(next) {
  view = next;
  el("inv-view-equipment").classList.toggle("active", view === "equipment");
  el("inv-view-bag").classList.toggle("active", view === "bag");
  el("inv-view-storage").classList.toggle("active", view === "storage");
  buildInventory();
}

el("inv-view-equipment").addEventListener("click", function () { setView("equipment"); });
el("inv-view-bag").addEventListener("click", function () { setView("bag"); });
el("inv-view-storage").addEventListener("click", function () { setView("storage"); });

el("back-inventory").addEventListener("click", function () { show("home"); });
