// =================================================================== market
//
// One market per location, not just Aerendell's -- ZONE was a hardcoded
// constant through batch 2; it's state.currentLocation now, read fresh
// every call via zone() below, same "read live, don't cache" rule the rest
// of this game's location-aware code follows. Sell shows everything you
// own across your bag *and* storage combined (a town's local storage
// crate, specifically -- see costDisplay.js's own combinedOwned() for the
// unrelated bag+storage-for-costs rule elsewhere in the game); Purchase
// shows what the market itself keeps in stock to sell you (BUYABLE in
// data.js, still one flat list -- no zone has its own stock list yet).
// Both share one pricing curve off one stock number per item: selling
// pushes that item's stock up (price falls), buying draws it back down
// (price rises) -- a real loop, not two independent numbers invented
// separately. `state.market.stock` is one shared table across every
// location for now, not one per zone -- a simplification worth revisiting
// once a second location actually has its own priced goods to diverge on.
//
// A city additionally gets a Bank tab (`type === "city"`) -- one shared
// state.bank, not one per city, since "accessed from any other city" (the
// original ask) means there's nothing to key per-city in the first place.
//
// Tapping a row no longer commits instantly -- it opens a quantity slider
// (openQtyPicker/openBankPicker) so a stack can be sold, bought, deposited,
// or withdrawn partially, with the total shown live as the slider moves,
// same "see the number before you commit" idea as everything else that
// spends resources in this game.

import {
  CATEGORIES, BASE_VALUE, BUYABLE, ZONE_DEMAND, MARKET_FLOOR, MARKET_K,
  MARKET_HALF_LIFE_MS, TINTS, LOCATIONS,
} from "./data.js";
import { state, save, gainItem, bagRoomFor } from "./state.js";
import { useSprite, slug } from "./sprites.js";
import { el } from "./dom.js";
import { show } from "./screens.js";
import { drawBag, updateWalletNote } from "./hub.js";
import { openSheet, closeSheet } from "./sheet.js";
import { isTownMarketOpen } from "./time.js";

function zone() {
  return state.currentLocation;
}

function locationHasMarket(loc) {
  return !!loc && (loc.type === "city" || loc.type === "town");
}

// A city's market is open 24/7 by type alone -- only a "town" ever checks
// the clock at all. Meaningless (never called) for a landmark/wilderness,
// which has no market to open in the first place -- see
// locationHasMarket() above, checked first in buildMarket().
function marketOpenHere() {
  return LOCATIONS[zone()].type !== "town" || isTownMarketOpen();
}

// ZONE_DEMAND only has an entry for Aerendell so far -- everywhere else
// falls back to neutral (1x) demand on every category rather than
// crashing on a missing zone, same "real shape, nothing behind it yet"
// treatment as an empty `stations`/`forage` list.
function demandFor(item) {
  const table = ZONE_DEMAND[zone()];
  return (table && table[CATEGORIES[item]]) || 1;
}

let view = "sell";   // "sell" | "buy" | "bank"

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
  return Math.max(1, Math.round(base * demandFor(item) * saturation(stock)));
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

function bankQty(name) {
  return state.bank[name] || 0;
}

// Same bag-then-storage draw order sellQty() uses -- which container an
// item comes out of doesn't matter, only that the total banked matches
// what actually left the player's hands.
function depositQty(name, qty) {
  const owned = combinedOwned(name);
  qty = Math.min(qty, owned);
  if (qty <= 0) return;

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
  state.bank[name] = (state.bank[name] || 0) + qty;
  save();
  marketHint("Deposited " + qty + " " + name + ".");
  drawBag();
  buildMarket();
}

// Withdrawing goes straight to the bag, same as any other gainItem() --
// there's no "which city withdrew it" to track, it's one shared bank.
// Clamped against bagRoomFor() *before* touching the bank -- unlike a free
// producer's own gainItem() truncating quietly, this one already has a
// specific qty coming out of the bank for it, so it has to match what
// actually lands in the bag or items would just vanish into a full bag.
function withdrawQty(name, qty) {
  const owned = bankQty(name);
  qty = Math.min(qty, owned, bagRoomFor(name));
  if (qty <= 0) return;

  state.bank[name] -= qty;
  if (state.bank[name] <= 0) delete state.bank[name];
  gainItem(name, qty);
  save();
  marketHint("Withdrew " + qty + " " + name + ".");
  drawBag();
  buildMarket();
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

// Same clamp-before-spending rule withdrawQty() above follows -- Shards
// are deducted for exactly what fits in the bag, never for a quantity a
// full bag would silently drop.
function buyQty(name, qty) {
  const affordable = maxAffordable(name, state.shards);
  qty = Math.min(qty, affordable, bagRoomFor(name));
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

// Shown instead of any list when a town's market is closed for the night
// -- replacing the list entirely (rather than just disabling rows) means
// there's nothing left to tap, no extra guard needed in
// openQtyPicker/sellQty/buyQty for the closed case.
function buildClosedNotice() {
  const list = el("market-list");
  list.replaceChildren();
  const notice = document.createElement("div");
  notice.className = "inv-empty";
  notice.textContent = LOCATIONS[zone()].name + "'s market is closed for the night. It reopens at 9 AM.";
  list.append(notice);
  el("market-hint").textContent = "";
}

// A landmark or wilderness location has no market at all, day or night --
// distinct from buildClosedNotice() above, which is specifically "there
// is one, come back later."
function buildNoMarketNotice() {
  const list = el("market-list");
  list.replaceChildren();
  const notice = document.createElement("div");
  notice.className = "inv-empty";
  notice.textContent = "There's no market here.";
  list.append(notice);
  el("market-hint").textContent = "";
}

function bankRow(name, qty, label, onClick) {
  const row = document.createElement("button");
  row.className = "pill";
  const body = document.createElement("span");
  body.className = "pill-body";
  const nameEl = document.createElement("span");
  nameEl.className = "pill-name";
  nameEl.textContent = name;
  const sub = document.createElement("span");
  sub.className = "pill-sub";
  sub.textContent = qty + " " + label;
  body.append(nameEl, sub);
  const action = document.createElement("span");
  action.className = "pill-count";
  action.textContent = label === "banked" ? "Withdraw" : "Deposit";
  row.append(iconFor(name), body, action);
  row.addEventListener("click", onClick);
  return row;
}

// A city only -- see locationHasMarket()/setView() below for how the tab
// itself is gated. Two lists rather than one combined view: what's
// already banked (withdraw) and what's currently carried (deposit),
// mirroring Inventory's own Bag/Storage split instead of inventing a new
// layout for the same "move items between two piles" idea.
function buildBankList() {
  const list = el("market-list");
  list.replaceChildren();
  el("market-hint").textContent = "Banked items are the same in every city.";

  const bankHeading = document.createElement("div");
  bankHeading.className = "market-section-label";
  bankHeading.textContent = "In the bank";
  list.append(bankHeading);

  const banked = Object.keys(state.bank).filter(function (n) { return bankQty(n) > 0; });
  if (banked.length === 0) {
    const empty = document.createElement("div");
    empty.className = "inv-empty";
    empty.textContent = "Nothing banked yet.";
    list.append(empty);
  } else {
    banked.forEach(function (name) {
      list.append(bankRow(name, bankQty(name), "banked", function () { openBankPicker(name, "withdraw"); }));
    });
  }

  const carryHeading = document.createElement("div");
  carryHeading.className = "market-section-label";
  carryHeading.textContent = "Carrying";
  list.append(carryHeading);

  const carried = Object.keys(BASE_VALUE).filter(function (n) { return combinedOwned(n) > 0; });
  if (carried.length === 0) {
    const empty = document.createElement("div");
    empty.className = "inv-empty";
    empty.textContent = "Nothing to deposit.";
    list.append(empty);
  } else {
    carried.forEach(function (name) {
      list.append(bankRow(name, combinedOwned(name), "carried", function () { openBankPicker(name, "deposit"); }));
    });
  }
}

function updateMarketHeader() {
  const sub = el("market-sub");
  if (sub) sub.textContent = LOCATIONS[zone()].name;
}

function syncMarketTabs() {
  const loc = LOCATIONS[zone()];
  const bankBtn = el("market-view-bank");
  const showBank = !!loc && loc.type === "city";
  bankBtn.classList.toggle("hidden", !showBank);
  if (view === "bank" && !showBank) view = "sell";   // left a city with the Bank tab open
  el("market-view-sell").classList.toggle("active", view === "sell");
  el("market-view-purchase").classList.toggle("active", view === "buy");
  bankBtn.classList.toggle("active", view === "bank");
}

export function buildMarket() {
  updateMarketHeader();
  syncMarketTabs();
  const loc = LOCATIONS[zone()];
  const list = el("market-list");
  // "notice-only" pins the list to the bottom of the screen instead of its
  // usual spot right under the tabs -- see the .craft-list.notice-only
  // rule in style.css. Only the two single-notice cases below get it; the
  // Bank tab's own empty states ("Nothing banked yet.") sit inside real
  // section headings, not floating alone, so they're left alone.
  if (!locationHasMarket(loc)) { list.classList.add("notice-only"); buildNoMarketNotice(); return; }
  if (view === "bank") { list.classList.remove("notice-only"); buildBankList(); return; }
  if (!marketOpenHere()) { list.classList.add("notice-only"); buildClosedNotice(); return; }
  list.classList.remove("notice-only");
  if (view === "buy") buildBuyList(); else buildSellList();
}

// ---------------------------------------------------------- quantity sheet

function openQtyPicker(name, mode) {
  // Buying is also capped by however much room is actually left in the
  // bag -- same clamp buyQty() itself enforces, surfaced here too so the
  // slider's own max isn't a promise the bag can't keep.
  const max = mode === "sell" ? combinedOwned(name) : Math.min(maxAffordable(name, state.shards), bagRoomFor(name));
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

// No price on either side -- banking doesn't sell or buy anything, it
// just moves a stack between the player's own hands and the shared bank.
// Same slider shape as openQtyPicker() above rather than a fork of it,
// since there's no pricing math running through the "sell"/"buy" branches
// for this to actually share.
function openBankPicker(name, mode) {
  // Same bag-room clamp openQtyPicker's own buy branch uses -- withdrawing
  // is also a bag gain, just from the bank instead of the market.
  const max = mode === "deposit" ? combinedOwned(name) : Math.min(bankQty(name), bagRoomFor(name));
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
  slider.value = String(max);   // both directions default to moving the whole stack

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
    accept.textContent = (mode === "deposit" ? "Deposit " : "Withdraw ") + qty;
  }
  slider.addEventListener("input", refresh);
  refresh();

  accept.addEventListener("click", function () {
    const qty = Number(slider.value);
    if (mode === "deposit") depositQty(name, qty); else withdrawQty(name, qty);
    closeSheet();
  });

  wrap.append(nameEl, slider, row, accept);
  body.append(wrap);

  openSheet((mode === "deposit" ? "Deposit " : "Withdraw ") + name);
}

function setView(next) {
  view = next;
  buildMarket();
}

let marketHintTimer = 0;
function marketHint(text) {
  el("market-hint").textContent = text;
  clearTimeout(marketHintTimer);
  marketHintTimer = setTimeout(function () {
    el("market-hint").textContent = view === "sell"
      ? "Tap an item to choose how many to sell."
      : view === "buy"
      ? "Tap an item to choose how many to buy."
      : "Banked items are the same in every city.";
  }, 2600);
}

el("market-view-sell").addEventListener("click", function () { setView("sell"); });
el("market-view-purchase").addEventListener("click", function () { setView("buy"); });
el("market-view-bank").addEventListener("click", function () { setView("bank"); });

el("back-market").addEventListener("click", function () { show("home"); });
