// Merchant ordering is separate from the durable shipment simulation
// (src/shipments.js). This is just the "Send goods home" sheet and the
// Freight status panel that lives on the Explore screen.
import { state } from "./state.js";
import { LOCATIONS } from "./data.js";
import { quoteShipment, dispatchShipment } from "./shipments.js";
import { openSheet, closeSheet } from "./sheet.js";
import { drawBag, updateWalletNote } from "./hub.js";
import { showToast } from "./toast.js";
import { cartSummary, loggingSummary, cartPhaseLine } from "./caravanUI.js";

function stepBtn(glyph) {
  const b = document.createElement("button");
  b.className = "freight-step";
  b.textContent = glyph;
  return b;
}

// A per-Bag-item stepper list (−/qty/+/Max) rather than raw number fields
// -- matches the rest of the game's quantity pickers and works with a
// thumb on a phone. Live summary line shows selected stacks, ETA and the
// distance-scaled fee; one button sends.
export function openFreightOrder() {
  const body = document.getElementById("sheet-body");
  body.replaceChildren();

  const names = Object.keys(state.bag).filter(function (n) { return state.bag[n] > 0; });
  const sel = {};

  const summary = document.createElement("p");
  summary.className = "freight-summary";
  summary.setAttribute("aria-live", "polite");

  const confirm = document.createElement("button");
  confirm.className = "qty-accept";

  function chosen() {
    const out = {};
    Object.keys(sel).forEach(function (n) { if (sel[n] > 0) out[n] = sel[n]; });
    return out;
  }

  function refresh() {
    const quote = quoteShipment(chosen());
    if (quote.error) {
      summary.textContent = quote.error;
      confirm.disabled = true;
      confirm.textContent = "Send home";
    } else {
      summary.textContent = quote.stacks + (quote.stacks === 1 ? " stack" : " stacks") +
        " · home in " + quote.path.minutes + " min";
      confirm.disabled = false;
      confirm.textContent = "Send — " + quote.fee + " Shards";
    }
  }

  if (names.length === 0) {
    summary.textContent = "Your Bag is empty — nothing to send.";
    confirm.disabled = true;
    confirm.textContent = "Send home";
    body.append(summary, confirm);
    openSheet("Send goods home");
    return;
  }

  const list = document.createElement("div");
  list.className = "freight-list";

  names.forEach(function (name) {
    const carried = state.bag[name];
    sel[name] = 0;

    const row = document.createElement("div");
    row.className = "freight-row";

    const info = document.createElement("div");
    info.className = "freight-row-info";
    const nm = document.createElement("div");
    nm.className = "freight-row-name";
    nm.textContent = name;
    const meta = document.createElement("div");
    meta.className = "freight-row-meta";
    meta.textContent = carried + " carried";
    info.append(nm, meta);

    const ctl = document.createElement("div");
    ctl.className = "freight-row-ctl";
    const minus = stepBtn("−");
    const qtyEl = document.createElement("span");
    qtyEl.className = "freight-row-qty";
    qtyEl.textContent = "0";
    const plus = stepBtn("+");
    const max = document.createElement("button");
    max.className = "freight-row-max";
    max.textContent = "Max";

    function set(v) {
      sel[name] = Math.max(0, Math.min(carried, v));
      qtyEl.textContent = String(sel[name]);
      row.classList.toggle("active", sel[name] > 0);
      refresh();
    }
    minus.addEventListener("click", function () { set(sel[name] - 1); });
    plus.addEventListener("click", function () { set(sel[name] + 1); });
    max.addEventListener("click", function () { set(sel[name] === carried ? 0 : carried); });

    ctl.append(minus, qtyEl, plus, max);
    row.append(info, ctl);
    list.append(row);
  });

  confirm.addEventListener("click", function () {
    const result = dispatchShipment(chosen());
    if (result.error) { refresh(); return; }
    closeSheet();
    drawBag();
    updateWalletNote();
    refreshFreight();
    showToast("Shipment dispatched — track it in Explore");
  });

  body.append(list, summary, confirm);
  refresh();
  openSheet("Send goods home");
}

let lastFreightText = "";
export function refreshFreight() {
  // The outpost sheet's own cart-phase line, kept live while it's open so
  // the "home in Nm Ns" countdown ticks without reopening the sheet.
  const live = document.getElementById("outpost-live-summary");
  if (live && state.caravan) {
    const text = cartPhaseLine(state.caravan) + "  ·  " + state.caravan.delivered + " delivered";
    if (live.textContent !== text) live.textContent = text;
  }
  const panel = document.getElementById("freight-status");
  if (!panel) return;

  const lines = state.shipments.map(function (shipment) {
    const cargo = Object.entries(shipment.items).map(function (e) { return e[1] + " " + e[0]; }).join(", ");
    const seconds = Math.max(0, Math.ceil((shipment.readyAt - Date.now()) / 1000));
    const status = shipment.status === "arrived"
      ? "Warehouse full — waiting to unload"
      : "Arriving in " + Math.floor(seconds / 60) + "m " + (seconds % 60) + "s";
    return ((LOCATIONS[shipment.from] && LOCATIONS[shipment.from].name) || "Merchant") +
      " → Aerendell\n" + status + "\n" + cargo;
  });

  const latest = state.freightHistory[state.freightHistory.length - 1];
  if (latest) {
    lines.push("Last delivery: " +
      (Object.entries(latest.items).map(function (e) { return e[1] + " " + e[0]; }).join(", ") || "Goods delivered") +
      " → Warehouse");
  }

  // Only fold the caravan/crew read-out in once the outpost actually
  // exists -- otherwise the Freight panel nags about Forest Road before
  // the player has any reason to care.
  if (state.outposts.forestRoad) {
    lines.push(cartSummary());
    if (state.outposts.forestRoad.crew) lines.push(loggingSummary());
  }

  const text = lines.length ? lines.join("\n\n") : "No shipments in transit.";
  if (text !== lastFreightText) { panel.textContent = text; lastFreightText = text; }
}
