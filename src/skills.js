// =================================================================== skill
//
// One skill so far: Farming. Watering pays a small flat amount, harvesting
// pays the crop's `xp` -- the bulk of the reward, same split described in
// Skills System.md ("watering grants a little XP, harvesting grants the
// bulk"). Levels also speed up growth -- see field.js's water(), which reads
// the level once, at the moment of watering, and bakes it into that stage's
// timer.

export const WATER_XP = 2;
export const GROWTH_PER_LEVEL = 0.03;   // +3% growth speed per Farming level

// Runescape-style long tail: cheap early levels, steeper later. Uncapped --
// there's no content yet that needs a ceiling.
export function xpToNext(level) { return Math.floor(40 * Math.pow(level + 1, 1.7)); }

export function levelFromXp(xp) {
  let level = 0;
  let spent = 0;
  while (spent + xpToNext(level) <= xp) {
    spent += xpToNext(level);
    level += 1;
  }
  return level;
}

// { level, into, need } -- xp earned into the current level, and how much
// the level needs in total. `into / need` is the bar's fill fraction.
export function levelProgress(xp) {
  const level = levelFromXp(xp);
  let spent = 0;
  for (let l = 0; l < level; l++) spent += xpToNext(l);
  return { level: level, into: xp - spent, need: xpToNext(level) };
}
