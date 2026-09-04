// =================================================================== toast
//
// One shared, generic banner (#toast in index.html) for a fire-and-forget
// notice that isn't tied to any one screen -- "Inventory full" (state.js's
// gainItem(), watched for by main.js's tick loop) is the first and only
// user so far, but showToast() itself doesn't know or care what it's
// announcing.

import { el } from "./dom.js";

let hideTimer = 0;

export function showToast(text) {
  const node = el("toast");
  node.textContent = text;
  node.classList.add("shown");
  clearTimeout(hideTimer);
  hideTimer = setTimeout(function () {
    node.classList.remove("shown");
  }, 2200);
}
