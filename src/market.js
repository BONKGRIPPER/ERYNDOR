// =================================================================== market
//
// Aerendell's market, now both directions. Sell shows everything you own
// across your bag *and* storage combined (this is the market at Aerendell,
// where the storage crate already sits); Purchase shows what the market
// itself keeps in stock to sell you (see BUYABLE in data.js). Both share
// one pricing curve off one stock number per item: selling pushes that
// item's stock up (price falls), buying draws it back down (price rises) --
// a real loop, not two independent numbers invented separately.
//
// Tapping a row no longer commits instantly -- it opens a quantity slider
// (openQtyPicker) so a stack can be sold or bought partially, with the
// total shown live as the slider moves, same "see the number before you
// commit" idea as everything else that spends resources in this game.

import {
  CATEGORIES, BASE_VALUE, BUYABLE, ZONE_DEMAND, MARKET_FLOOR, MARKET_K,
  MARKET_HALF_LIFE_MS, TINTS,
} from "./data.js";
import { state, save, gainItem } from "./state.js";
import { useSprite, slug } from "./sprites.js";
import { el } from "./dom.js";
import { show } from "./screens.js";
import { drawBag, updateWalletNote } from "./hub.js";
import { openSheet, closeSheet } from "./sheet.js";

const ZONE = "aerendell";   // the only one that exists -- a real id, not a magic string scattered everywhere

let view = "sell";   // "sell" | "buy"

// Effective stock right now, decayed from whatever it was last set to.
// Stored as a level + a timestamp rather than ticked down in the
// background, same deadline-not-countdown rule as every timer in this game
// -- correct after being closed for five minutes or five days, no catch-up
// code needed.
function marketStock(item) {
  const stored = state.market.stock[item] || 0;
  if (stored <= 0) return 0;
  const at = state.market.stockAt[item] || 0;
  const halvings = (Date.now() - at) / MARKET_HALF_LIFE_MS;
  return stored * Math.pow(0.5, halvings);
}

function setMarketStock(item, value) {
  state.market.stock[item] = Math.max(0, value);
  state.market.stockAt[item] = Date.now();
}

// 1 at zero stock, decaying toward MARKET_FLOOR as stock rises. Never
// zero -- flooding a market makes an item cheap, not worthless. Low stock
// pushes the other way too, toward the full base price -- which is what
// makes buying (which draws stock down) get pricier the more you take.
function saturation(stock) {
  return MARKET_FLOOR + (1 - MARKET_FLOOR) / (1 + stock / MARKET_K);
}

function unitPrice(item, stock) {
  const base = BASE_VALUE[item] || 0;
  const demand = ZONE_DEMAND[ZONE][CATEGORIES[item]] || 1;
  return Math.max(1, Math.round(base * demand * saturation(stock)));
}

// Walks the sale one unit at a time so the price actually declines across
// a big stack instead of using one flat price for the whole lot. Doesn't
// touch state -- callers commit the result themselves.
function quoteSale(item, qty) {
  let stock = marketStock(item);
  let total = 0;
  for (let i = 0; i < qty; i++) {
    total += unitPrice(item, stock);
    stock += 1;
  }
  return { total: total, stock: stock };
}

// The buy-side mirror: stock walks down instead of up, floored at zero
// rather than letting it go negative.
function quoteBuy(item, qty) {
  let stock = marketStock(item);
  let total = 0;
  for (let i = 0; i < qty; i++) {
    total += unitPrice(item, stock);
    stock = Math.max(0, stock - 1);
  }
  return { total: total, stock: stock };
}

// The largest qty whose running total still fits the wallet, walking the
// same curve quoteBuy would. Capped well above anything a starting economy
// can afford -- a safety bound, not a game rule.
function maxAffordable(item, shards) {
  let stock = marketStock(item);
  let total = 0;
  let qty = 0;
  while (qty < 99) {
    const price = unitPrice(item, stock);
    if (total + price > shards) break;
    total += price;
    stock = Math.max(0, stock - 1);
    qty += 1;
  }
  return qty;
}

function combinedOwned(name) {
  return (state.bag[name] || 0) + (state.storage[name] || 0);
}

// Draws from the carried bag first, then storage for whatever's left --
// which container it came from doesn't change the payout, only where the
// count gets removed from.
function sellQty(name, qty) {
  const owned = combinedOwned(name);
  qty = Math.min(qty, owned);
  if (qty <= 0) return;

  const quote = quoteSale(name, qty);
  const fromBag = Math.min(qty, state.bag[name] || 0);
  const fromStorage = qty - fromBag;
  if (fromBag > 0) {
    state.bag[name] -= fromBag;
    if (state.bag[name] <= 0) delete state.bag[name];
  }
  if (fromStorage > 0) {
    state.storage[name] -= fromStorage;
    if (state.storage[name] <= 0) delete state.storage[name];
  }
  state.shards += quote.total;
  setMarketStock(name, quote.stock);
  save();
  marketHint("Sold " + qty + " " + name + " for +" + quote.total + " Shards.");
  drawBag();
  updateWalletNote();
  buildMarket();
}

function buyQty(name, qty) {
  const affordable = maxAffordable(name, state.shards);
  qty = Math.min(qty, affordable);
  if (qty <= 0) return;

  const quote = quoteBuy(name, qty);
  state.shards -= quote.total;
  gainItem(name, qty);
  setMarketStock(name, quote.stock);
  save();
  marketHint("Bought " + qty + " " + name + " for -" + quote.total + " Shards.");
  drawBag();
  updateWalletNote();
  buildMarket();
}

function iconFor(name) {
  const icon = document.createElement("span");
  icon.className = "pill-icon";
  const img = document.createElement("img");
  img.className = "sprite-img";
  img.alt = "";
  img.draggable = false;
  const fallback = document.createElement("span");
  fallback.className = "sprite-fallback";
  fallback.style.background = TINTS[name] || "#9a8f7d";
  fallback.style.borderRadius = "50%";
  icon.append(img, fallback);
  useSprite(icon, "items/" + slug(name));
  return icon;
}

function shakePill(row) {
  row.classList.remove("shake");
  void row.offsetWidth;
  row.classList.add("shake");
}

function buildSellList() {
  const list = el("market-list");
  list.replaceChildren();
  el("market-hint").textContent = "Tap an item to choose how many to sell.";

  const names = Object.keys(BASE_VALUE).filter(function (n) { return combinedOwned(n) > 0; });
  if (names.length === 0) {
    const empty = document.createElement("div");
    empty.className = "inv-empty";
    empty.textContent = "Nothing to sell. Bring something from your bag or storage.";
    list.append(empty);
    return;
  }

  names.forEach(function (name) {
    const qty = combinedOwned(name);
    const price = unitPrice(name, marketStock(name));
    const quote = quoteSale(name, qty);

    const row = document.createElement("button");
    row.className = "pill";

    const body = document.createElement("span");
    body.className = "pill-body";
    const nameEl = document.createElement("span");
    nameEl.className = "pill-name";
    nameEl.textContent = name;
    const sub = document.createElement("span");
    sub.className = "pill-sub";
    sub.textContent = qty + " owned · " + price + " ea";
    body.append(nameEl, sub);

    const total = document.createElement("span");
    total.className = "pill-count";
    total.textContent = "+" + quote.total;

    row.append(iconFor(name), body, total);
    row.addEventListener("click", function () { openQtyPicker(name, "sell"); });
    list.append(row);
  });
}

function buildBuyList() {
  const list = el("market-list");
  list.replaceChildren();
  el("market-hint").textContent = "Tap an item to choose how many to buy.";

  BUYABLE.forEach(function (name) {
    const price = unitPrice(name, marketStock(name));
    const affordable = maxAffordable(name, state.shards);
    const owned = state.bag[name] || 0;

    const row = document.createElement("button");
    row.className = "pill" + (affordable < 1 ? " unaffordable" : "");

    const body = document.createElement("span");
    body.className = "pill-body";
    const nameEl = document.createElement("span");
    nameEl.className = "pill-name";
    nameEl.textContent = name;
    const sub = document.createElement("span");
    sub.className = "pill-sub";
    sub.textContent = price + " ea · " + owned + " owned";
    body.append(nameEl, sub);

    const total = document.createElement("span");
    total.className = "pill-count";
    total.textContent = "Buy";

    row.append(iconFor(name), body, total);
    row.addEventListener("click", function () {
      if (affordable < 1) { shakePill(row); marketHint("Not enough Shards."); return; }
      openQtyPicker(name, "buy");
    });
    list.append(row);
  });
}

export function buildMarket() {
  if (view === "buy") buildBuyList(); else buildSellList();
}

// ---------------------------------------------------------- quantity sheet

function openQtyPicker(name, mode) {
  const max = mode === "sell" ? combinedOwned(name) : maxAffordable(name, state.shards);
  if (max < 1) return;

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
  slider.value = String(mode === "sell" ? max : 1);   // sell defaults to the whole stack, buy defaults small

  const row = document.createElement("div");
  row.className = "qty-picker-row";
  const count = document.createElement("span");
  count.className = "qty-count";
  const totalEl = document.createElement("span");
  totalEl.className = "qty-total";
  row.append(count, totalEl);

  const accept = document.createElement("button");
  accept.className = "qty-accept";

  function refresh() {
    const qty = Number(slider.value);
    const quote = mode === "sell" ? quoteSale(name, qty) : quoteBuy(name, qty);
    count.textContent = qty + (qty === 1 ? " unit" : " units");
    totalEl.textContent = (mode === "sell" ? "+" : "-") + quote.total + " Shards";
    accept.textContent = mode === "sell"
      ? "Sell for " + quote.total + " Shards"
      : "Buy for " + quote.total + " Shards";
  }
  slider.addEventListener("input", refresh);
  refresh();

  accept.addEventListener("click", function () {
    const qty = Number(slider.value);
    if (mode === "sell") sellQty(name, qty); else buyQty(name, qty);
    closeSheet();
  });

  wrap.append(nameEl, slider, row, accept);
  body.append(wrap);

  openSheet(mode === "sell" ? "Sell " + name : "Buy " + name);
}

function setView(next) {
  view = next;
  el("market-view-sell").classList.toggle("active", view === "sell");
  el("market-view-purchase").classList.toggle("active", view === "buy");
  buildMarket();
}

let marketHintTimer = 0;
function marketHint(text) {
  el("market-hint").textContent = text;
  clearTimeout(marketHintTimer);
  marketHintTimer = setTimeout(function () {
    el("market-hint").textContent = view === "sell"
      ? "Tap an item to choose how many to sell."
      : "Tap an item to choose how many to buy.";
  }, 2600);
}

el("market-view-sell").addEventListener("click", function () { setView("sell"); });
el("market-view-purchase").addEventListener("click", function () { setView("buy"); });

el("back-market").addEventListener("click", function () { show("home"); });
