// Shared by Foraging and Crafting -- both are "tap a pill, wait, get
// something" loops with the same fill-bar mechanics, just different data
// and a different cost rule behind them.

export function pillFor(item) { return document.querySelector('.pill[data-item="' + item + '"]'); }

// Points a pill's fill at 0% or 100% with an explicit duration, matching
// however long is actually left -- the same transition plays whether it's a
// fresh run or the tail end of one resumed after a reload. Duration is
// always derived from the real time remaining, never a fixed number, so
// raising a gather/craft rate later is a tuning change here, not an
// animation one.
export function setPillFill(item, targetPct, ms) {
  const pill = pillFor(item);
  if (!pill) return;   // e.g. a RECIPES/STATIONS entry whose pill was pulled from the screen but not the data
  const fill = pill.querySelector(".pill-fill");
  fill.style.transitionDuration = ms + "ms";
  fill.style.width = targetPct + "%";
}

export function popCount(item) {
  const pill = pillFor(item);
  if (!pill) return;
  const count = pill.querySelector(".pill-count");
  count.classList.remove("pop");
  void count.offsetWidth;
  count.classList.add("pop");
}
