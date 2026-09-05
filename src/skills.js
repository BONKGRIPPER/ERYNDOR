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

// A hard ceiling on every skill (2026-09-04, per the request) -- was
// uncapped before this ("there's no content yet that needs a ceiling").
// Foraging had its own separate FORAGE_MAX_LEVEL cap already; this is the
// same idea generalized to every skill at once, right at the shared
// level-from-xp conversion so nothing downstream (workers.js's own
// per-level speed bonus, every skill row's own display) has to know
// about the cap separately.
export const MAX_SKILL_LEVEL = 100;

// Runescape-style long tail: cheap early levels, steeper later.
export function xpToNext(level) { return Math.floor(40 * Math.pow(level + 1, 1.7)); }

export function levelFromXp(xp) {
  let level = 0;
  let spent = 0;
  while (level < MAX_SKILL_LEVEL && spent + xpToNext(level) <= xp) {
    spent += xpToNext(level);
    level += 1;
  }
  return level;
}

// { level, into, need } -- xp earned into the current level, and how much
// the level needs in total. `into / need` is the bar's fill fraction.
// `need` is 0 once level 100 is reached -- there's nothing left to climb
// toward, same "full bar, nothing more" reading every other maxed skill
// (Foraging, per-item crafting mastery) already gives its own display.
export function levelProgress(xp) {
  const level = levelFromXp(xp);
  let spent = 0;
  for (let l = 0; l < level; l++) spent += xpToNext(l);
  return { level: level, into: xp - spent, need: level >= MAX_SKILL_LEVEL ? 0 : xpToNext(level) };
}
