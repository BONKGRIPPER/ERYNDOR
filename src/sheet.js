// A single shared bottom sheet, reused by anything that needs to ask "which
// one" (Field's seed choice, Logging's cone choice). One instance in the
// DOM, so it's one open/close story rather than each screen owning its own
// modal and fighting over the same backdrop click.

import { el } from "./dom.js";

export function openSheet(title) {
  el("sheet-title").textContent = title;
  el("sheet").classList.remove("hidden");
}

export function closeSheet() {
  el("sheet").classList.add("hidden");
}

el("sheet-close").addEventListener("click", closeSheet);
el("sheet").addEventListener("click", function (e) {
  if (e.target === el("sheet")) closeSheet();
});
