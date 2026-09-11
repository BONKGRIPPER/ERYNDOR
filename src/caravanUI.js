// Forest Road outpost + caravan UI (Batch 9.7 / 9.8). The durable
// simulation lives in caravans.js; this file is the sheets. The main
// "Forest Road outpost" sheet is a scannable status + action list; the two
// form-heavy jobs -- moving goods, and the cart's route -- open their own
// small sub-sheets rather than stacking every control into one scroll.
//
// cartSummary() / loggingSummary() are still exported as multi-line text
// for the Explore Freight panel (freightUI.js's refreshFreight()).

import { state } from "./state.js";
import {
  OUTPOST_COST, CART_COST, OUTPOST_CAPACITY, CART_CAPACITY, TINTS,
  LOGGING_CREW_COST, LOGISTICS_UPGRADE_COSTS, LOGGING_CREW_INTERVALS,
  CART_HANDLING_MS, STATIONS,
} from "./data.js";
import {
  buildOutpost, buyCart, transferOutpost, setCartOrder, pauseCart, disbandCart,
  unlockLoggingCrew, assignLoggingCrew, upgradeLogistics,
  cargoUsed, cargoUnits, outpostCapacity, cartCapacity, crewInterval,
} from "./caravans.js";
import { openSheet } from "./sheet.js";
import { showToast } from "./toast.js";
import { drawBag, updateWalletNote } from "./hub.js";
import { shortestTravelMinutes } from "./travel.js";
import { laborAssigned, laborCapacity } from "./labor.js";
import { el } from "./dom.js";

const atForestRoad = () => state.playerContext === "field" && state.currentLocation === "forestRoad";

// -------------------------------------------------- crew / cart numbers

// The crew-vs-cart throughput read (Batch 9.8's whole point). Shared by
// the Explore panel text and the outpost sheet's crew section so both
// tell the same story. Returns null when no crew is unlocked.
export function crewStatus() {
  const outpost = state.outposts.forestRoad;
  const crew = outpost?.crew;
  if (!crew) return null;
  const c = state.caravan;
  const stock = outpost.items;
  const rate = 3600000 / crewInterval();                       // logs/hour the crew can gather
  const ceiling = Math.floor(cartCapacity() / cargoUnits("Birch Logs")) * 3600000 /
    (shortestTravelMinutes("forestRoad", "aerendell") * 120000 + CART_HANDLING_MS * 2); // logs/hour the cart can move, full Birch-only loads
  const full = cargoUsed(stock) + cargoUnits("Birch Logs") > outpostCapacity();
  const carriesBirch = c && !c.paused && c.order.items.includes("Birch Logs");
  const reason = !crew.assigned ? "Not assigned"
    : state.village.starved ? "Paused — Township is out of food or heat"
    : full ? "Stockpile full — extraction paused"
    : "Gathering Birch Logs";
  const bottleneck = !c ? "Build a cart to move the logs home."
    : !carriesBirch ? "Add Birch Logs to the cart's route and resume it."
    : rate > ceiling + 0.5 ? "The cart can't keep up (" + ceiling.toFixed(0) + " vs " + rate.toFixed(0) + " logs/hr) — upgrade it."
    : "The cart can keep up with the crew.";
  return { rate, ceiling, full, reason, bottleneck, produced: crew.produced || 0 };
}

// -------------------------------------------------- text (Explore panel)

export function loggingSummary() {
  const s = crewStatus();
  if (!s) return "Logging crew locked — establish Birch logging with a Stone Axe or better.";
  const current = state.stations.birchPlanks;
  return s.reason +
    "\nCrew " + s.rate.toFixed(0) + " logs/hr · cart ceiling " + s.ceiling.toFixed(0) + " logs/hr · " + s.produced + " produced" +
    "\n" + s.bottleneck +
    "\nHome use: 3 Birch Logs + 1 Pine Plank → 1 Birch Plank (" + STATIONS.birchPlanks.ms / 1000 + "s base recipe). " +
    (current ? "A Birch Plank job is active." : "No Birch Plank job active.") +
    " Warehouse: " + (state.storage["Birch Logs"] || 0) + " Birch Logs.";
}

export function cartSummary() {
  const c = state.caravan;
  if (!c) {
    const stock = state.outposts.forestRoad?.items;
    return stock ? "Forest Road stockpile: " + cargoUsed(stock) + "/" + outpostCapacity() + " units\n" +
      (Object.entries(stock).map(([n, q]) => q + " " + n).join(", ") || "Empty") + "\nBuild a cart locally." : "Visit Forest Road to establish an outpost.";
  }
  const stock = state.outposts.forestRoad.items;
  const names = items => Object.entries(items).map(([n, q]) => q + " " + n).join(", ") || "Empty";
  const hours = (Date.now() - c.createdAt) / 3600000;
  return "Forest Road → Aerendell\n" + cartPhaseLine(c) +
    "\nStockpile: " + cargoUsed(stock) + "/" + outpostCapacity() + " units · " + names(stock) +
    "\nCart: " + cargoUsed(c.items) + "/" + cartCapacity() + " units · " + names(c.items) +
    "\nDelivered: " + c.delivered + " items · " + (hours > 0 ? (c.delivered / hours).toFixed(1) : "0") + " items/hour since purchase";
}

// One human line for whatever the cart is doing right now.
export function cartPhaseLine(c) {
  if (!c) return "No cart";
  const left = (t) => {
    const s = Math.max(0, Math.ceil((t - Date.now()) / 1000));
    return Math.floor(s / 60) + "m " + (s % 60) + "s";
  };
  if (c.phase === "waiting") {
    if (c.paused) return "Cart paused at the outpost";
    if (!c.order.items.length) return "Cart idle — set a route";
    return "Cart waiting for cargo";
  }
  if (c.phase === "loading") return "Cart loading — home in " + left(c.nextAt + c.travelMs);
  if (c.phase === "traveling") return "Cart en route — home in " + left(c.nextAt);
  if (c.phase === "unloading") return Date.now() >= c.nextAt ? "Warehouse full — cart holding cargo" : "Cart unloading at the Warehouse";
  if (c.phase === "returning") return "Cart returning empty — back in " + left(c.nextAt);
  return c.phase;
}

// ------------------------------------------------------- small builders

function sectionLabel(parent, txt) {
  const d = document.createElement("div");
  d.className = "market-section-label";
  d.textContent = txt;
  parent.append(d);
}
function note(parent, txt) {
  const p = document.createElement("p");
  p.className = "field-sub";
  p.textContent = txt;
  parent.append(p);
}
function backLink(parent, fn) {
  const b = document.createElement("button");
  b.className = "ghost sheet-back";
  b.textContent = "‹ Outpost";
  b.addEventListener("click", fn);
  parent.append(b);
}
function stepBtn(glyph) {
  const b = document.createElement("button");
  b.className = "freight-step";
  b.textContent = glyph;
  return b;
}
function qtySpan() {
  const s = document.createElement("span");
  s.className = "freight-row-qty";
  return s;
}
function miniBtn(txt) {
  const b = document.createElement("button");
  b.className = "freight-row-max";
  b.textContent = txt;
  return b;
}

// -------------------------------------------------- main outpost sheet

export function openOutpost() {
  const body = el("sheet-body");
  const scroller = document.getElementById("sheet");
  const keepTop = scroller ? scroller.scrollTop : 0;
  body.replaceChildren();

  // A gated action button: runs fn(); a returned string is an error toast,
  // otherwise the sheet redraws in place.
  const action = (cls, txt, fn) => {
    const b = document.createElement("button");
    b.className = cls;
    b.textContent = txt;
    b.addEventListener("click", () => {
      const err = fn();
      if (err) { showToast(err); return; }
      drawBag();
      updateWalletNote();
      openOutpost();
    });
    body.append(b);
    return b;
  };
  const nav = (txt, fn) => {
    const b = document.createElement("button");
    b.className = "map-travel-btn";
    b.textContent = txt;
    b.addEventListener("click", fn);
    body.append(b);
  };

  const here = atForestRoad();
  const outpost = state.outposts.forestRoad;

  if (!outpost) {
    note(body, "A local stockpile at Forest Road for the goods you gather there, plus a cart that runs them home to the Warehouse on a repeating route.");
    if (here) action("qty-accept", "Build outpost — " + OUTPOST_COST + " Shards", buildOutpost);
    else note(body, "Travel to Forest Road to build it.");
    openSheet("Forest Road outpost");
    if (scroller) scroller.scrollTop = keepTop;
    return;
  }

  const c = state.caravan;
  const stock = outpost.items;
  const crew = outpost.crew;

  // ---- status ----
  const line1 = document.createElement("div");
  line1.className = "outpost-status";
  line1.textContent = "Stockpile " + cargoUsed(stock) + " / " + outpostCapacity() + " units" +
    (c ? "  ·  Cart " + cargoUsed(c.items) + " / " + cartCapacity() : "");
  body.append(line1);
  if (c) {
    const line2 = document.createElement("div");
    line2.className = "outpost-status dim";
    line2.id = "outpost-live-summary";
    line2.textContent = cartPhaseLine(c) + "  ·  " + c.delivered + " delivered";
    body.append(line2);
  }
  const contents = Object.entries(stock).map(([n, q]) => q + " " + n).join(" · ");
  if (contents) note(body, contents);

  // ---- build cart ----
  if (!c) {
    if (here) action("qty-accept", "Build cart — " + CART_COST + " Shards", () => buyCart());
    else note(body, "Travel to Forest Road to build a cart.");
  }

  // ---- move goods / route ----
  if (here) nav("Deposit / withdraw goods", openTransfer);
  if (c) nav(state.caravan.pendingOrder ? "Route settings (change queued)" : "Route settings", openRoute);

  // ---- cart controls ----
  if (c) {
    action("map-travel-btn", c.paused ? "Resume cart" : "Pause cart after return", () => pauseCart(!c.paused));
    if (c.phase === "waiting" && !cargoUsed(c.items)) {
      action("map-travel-btn", "Disband empty cart (no refund)", () => {
        if (!confirm("Disband this empty cart? There is no refund.")) return "Cart kept.";
        return disbandCart();
      });
    }
  }

  // ---- logging crew (9.8) ----
  sectionLabel(body, "Logging crew");
  if (!crew) {
    note(body, "An assigned crew fills the stockpile with Birch Logs on its own. Needs a Stone Axe equipped and one housing slot; draws shared Township food/heat upkeep.");
    if (here) action("map-travel-btn", "Unlock logging crew — " + LOGGING_CREW_COST + " Shards", () => unlockLoggingCrew());
    else note(body, "Travel to Forest Road to unlock it.");
  } else {
    const cs = crewStatus();
    const state1 = document.createElement("div");
    state1.className = "outpost-status";
    state1.textContent = cs.reason;
    body.append(state1);
    const state2 = document.createElement("div");
    state2.className = "outpost-status dim";
    state2.textContent = "Crew " + cs.rate.toFixed(0) + " / hr  ·  cart ceiling " + cs.ceiling.toFixed(0) + " / hr  ·  " + cs.produced + " gathered";
    body.append(state2);
    note(body, cs.bottleneck + "  " + laborAssigned() + " / " + laborCapacity() + " worker slots assigned.");
    action("map-travel-btn", crew.assigned ? "Unassign logging crew" : "Assign logging crew", () => assignLoggingCrew(!crew.assigned));
  }

  // ---- upgrades ----
  if (here) {
    const rows = [];
    if (true) {
      const lvl = outpost.stockpileLevel || 0;
      const cost = LOGISTICS_UPGRADE_COSTS.stockpile[lvl];
      if (cost !== undefined) rows.push(["stockpile", "Stockpile → " + (outpostCapacity() + OUTPOST_CAPACITY) + " units — " + cost + " Shards"]);
    }
    if (c) {
      const lvl = c.capacityLevel || 0;
      const cost = LOGISTICS_UPGRADE_COSTS.cart[lvl];
      if (cost !== undefined) rows.push(["cart", "Cart → " + (cartCapacity() + CART_CAPACITY) + " units — " + cost + " Shards"]);
    }
    if (crew) {
      const lvl = crew.level || 0;
      const cost = LOGISTICS_UPGRADE_COSTS.crew[lvl];
      if (cost !== undefined) rows.push(["crew", "Crew → " + (3600000 / LOGGING_CREW_INTERVALS[lvl + 1]).toFixed(0) + " logs/hour — " + cost + " Shards"]);
    }
    if (rows.length) {
      sectionLabel(body, "Upgrades");
      rows.forEach(([kind, label]) => action("map-travel-btn", label, () => upgradeLogistics(kind)));
    }
  } else if (c) {
    note(body, "Travel to Forest Road for deposits, upgrades and disbanding. The route can be changed from anywhere.");
  }

  openSheet("Forest Road outpost");
  if (scroller) scroller.scrollTop = keepTop;
}

// ----------------------------------------------------- transfer sub-sheet

function openTransfer() {
  const body = el("sheet-body");
  body.replaceChildren();
  backLink(body, openOutpost);

  const stock = state.outposts.forestRoad.items;
  const names = [...new Set([...Object.keys(state.bag), ...Object.keys(stock)])]
    .filter(n => (state.bag[n] || 0) > 0 || (stock[n] || 0) > 0)
    .sort();

  if (!names.length) {
    note(body, "Nothing in your Bag or the stockpile to move.");
    openSheet("Deposit / withdraw");
    return;
  }

  let picked = names[0];
  let qty = 1;

  const list = document.createElement("div");
  const rows = {};
  names.forEach(name => {
    const row = document.createElement("button");
    row.className = "seed-row";
    const dot = document.createElement("span");
    dot.className = "dot";
    dot.style.background = TINTS[name] || "#9a8f7d";
    const txt = document.createElement("div");
    const nm = document.createElement("div");
    nm.className = "seed-name";
    nm.textContent = name;
    const meta = document.createElement("div");
    meta.className = "seed-meta";
    meta.textContent = "Bag " + (state.bag[name] || 0) + " · Outpost " + (stock[name] || 0) + " · " + cargoUnits(name) + "u ea";
    txt.append(nm, meta);
    row.append(dot, txt);
    row.addEventListener("click", () => { picked = name; qty = 1; render(); });
    list.append(row);
    rows[name] = row;
  });
  body.append(list);

  const ctl = document.createElement("div");
  ctl.className = "freight-row-ctl transfer-ctl";
  const minus = stepBtn("−");
  const qEl = qtySpan();
  const plus = stepBtn("+");
  const maxBag = miniBtn("Max bag");
  const maxOut = miniBtn("Max out");
  ctl.append(minus, qEl, plus, maxBag, maxOut);
  body.append(ctl);

  const dep = document.createElement("button");
  dep.className = "qty-accept";
  dep.textContent = "Deposit to outpost";
  const wd = document.createElement("button");
  wd.className = "map-travel-btn";
  wd.textContent = "Withdraw to Bag";
  body.append(dep, wd);

  function cap() {
    return Math.max(1, (state.bag[picked] || 0), (stock[picked] || 0));
  }
  function render() {
    Object.keys(rows).forEach(n => rows[n].classList.toggle("active", n === picked));
    qEl.textContent = String(qty);
  }
  minus.addEventListener("click", () => { qty = Math.max(1, qty - 1); render(); });
  plus.addEventListener("click", () => { qty = Math.min(cap(), qty + 1); render(); });
  maxBag.addEventListener("click", () => { qty = Math.max(1, state.bag[picked] || 0); render(); });
  maxOut.addEventListener("click", () => { qty = Math.max(1, stock[picked] || 0); render(); });
  dep.addEventListener("click", () => {
    const e = transferOutpost(picked, qty, false);
    if (e) { showToast(e); return; }
    drawBag();
    openTransfer();
  });
  wd.addEventListener("click", () => {
    const e = transferOutpost(picked, qty, true);
    if (e) { showToast(e); return; }
    drawBag();
    openTransfer();
  });

  render();
  openSheet("Deposit / withdraw");
}

// -------------------------------------------------------- route sub-sheet

function openRoute() {
  const body = el("sheet-body");
  body.replaceChildren();
  backLink(body, openOutpost);

  const c = state.caravan;
  const order = c.pendingOrder || c.order;
  const stock = state.outposts.forestRoad.items;
  const selected = new Set(order.items);
  let reserve = order.reserve;
  let waitMs = order.maxWaitMs;
  let mode = order.mode;

  note(body, c.pendingOrder
    ? "A change is already queued; it applies when the cart finishes its current trip."
    : "The cart loads the selected cargo (in the order shown), keeping the reserve at Forest Road, then runs it home.");

  sectionLabel(body, "Cargo");
  const cargoChips = document.createElement("div");
  cargoChips.className = "route-chips";
  [...new Set([...order.items, ...Object.keys(stock), ...Object.keys(state.bag)])].sort().forEach(name => {
    const chip = document.createElement("button");
    chip.className = "route-chip" + (selected.has(name) ? " on" : "");
    chip.textContent = name;
    chip.addEventListener("click", () => {
      if (selected.has(name)) selected.delete(name);
      else selected.add(name);
      chip.classList.toggle("on");
    });
    cargoChips.append(chip);
  });
  body.append(cargoChips);

  sectionLabel(body, "Keep at Forest Road (per item)");
  const rCtl = document.createElement("div");
  rCtl.className = "freight-row-ctl";
  const rMinus = stepBtn("−");
  const rVal = qtySpan();
  const rPlus = stepBtn("+");
  rCtl.append(rMinus, rVal, rPlus);
  body.append(rCtl);
  rVal.textContent = String(reserve);
  rMinus.addEventListener("click", () => { reserve = Math.max(0, reserve - 5); rVal.textContent = String(reserve); });
  rPlus.addEventListener("click", () => { reserve += 5; rVal.textContent = String(reserve); });

  sectionLabel(body, "Depart");
  const seg = document.createElement("div");
  seg.className = "inv-toggle route-depart";
  const bAvail = document.createElement("button");
  bAvail.className = "inv-view-btn" + (mode === "available" ? " active" : "");
  bAvail.textContent = "When ready";
  const bFull = document.createElement("button");
  bFull.className = "inv-view-btn" + (mode === "full" ? " active" : "");
  bFull.textContent = "When full";
  seg.append(bAvail, bFull);
  body.append(seg);

  const waitWrap = document.createElement("div");
  waitWrap.hidden = mode !== "full";
  sectionLabel(waitWrap, "Max wait when not full");
  const waitChips = document.createElement("div");
  waitChips.className = "route-chips";
  [30, 60, 180, 600, 1800, 3600].forEach(sec => {
    const chip = document.createElement("button");
    chip.className = "route-chip" + (waitMs === sec * 1000 ? " on" : "");
    chip.textContent = sec < 60 ? sec + "s" : (sec / 60) + "m";
    chip.addEventListener("click", () => {
      waitMs = sec * 1000;
      [...waitChips.children].forEach(x => x.classList.remove("on"));
      chip.classList.add("on");
    });
    waitChips.append(chip);
  });
  waitWrap.append(waitChips);
  body.append(waitWrap);

  bAvail.addEventListener("click", () => { mode = "available"; bAvail.classList.add("active"); bFull.classList.remove("active"); waitWrap.hidden = true; });
  bFull.addEventListener("click", () => { mode = "full"; bFull.classList.add("active"); bAvail.classList.remove("active"); waitWrap.hidden = false; });

  const save = document.createElement("button");
  save.className = "qty-accept";
  save.textContent = "Save route";
  save.addEventListener("click", () => {
    const e = setCartOrder({ items: [...selected], reserve, mode, maxWaitMs: waitMs });
    if (e) { showToast(e); return; }
    showToast("Route saved");
    openOutpost();
  });
  body.append(save);

  openSheet("Route settings");
}
