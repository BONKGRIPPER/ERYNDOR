import { state, save } from "./state.js";
import { HOUSE_WORKER_SLOTS, VILLAGE_UPKEEP_MS, VILLAGE_UPKEEP_FOOD, VILLAGE_UPKEEP_HEAT } from "./data.js";

export const laborCapacity = () => Object.values(state.housing).reduce((a, b) => a + b, 0) * HOUSE_WORKER_SLOTS;
export const laborAssigned = () => state.workers.length + (state.outposts.forestRoad?.crew?.assigned ? 1 : 0);
export function settleLaborUpkeep(now = Date.now(), persist = true) {
  const count = laborAssigned();
  if (!count || state.village.nextUpkeepAt === null) return;
  let changed = false;
  while (now >= state.village.nextUpkeepAt) {
    const food = VILLAGE_UPKEEP_FOOD * count, heat = VILLAGE_UPKEEP_HEAT * count;
    if (state.village.food < food || state.village.heat < heat) {
      changed = changed || !state.village.starved; state.village.starved = true; break;
    }
    state.village.food -= food; state.village.heat -= heat;
    state.village.nextUpkeepAt += VILLAGE_UPKEEP_MS;
    state.village.starved = false; changed = true;
  }
  if (changed && persist) save();
}
