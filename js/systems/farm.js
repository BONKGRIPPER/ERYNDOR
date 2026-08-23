/* =========================================================
   systems/farm.js — farm plots (Town tab).

   Each plot is null (empty) or { seedKey, stage, wateredAt, stageMs }.
   Growth is resolved lazily from real elapsed time, the same "compute
   on next read" trick G.collectVillagerWork/tickVillager (township.js)
   already use — a plot keeps growing even if the tab was closed the
   whole time, no live interval needs to have been running.

   A crop (G.CROPS, data.js) needs `stages` separate waterings to
   mature — each stage takes `stageMs`, scaled by the farming skill
   (see G.farmGrowMs) and snapshotted onto the plot the moment it's
   watered, so a level-up mid-stage never retroactively speeds up a
   stage already running (same principle as G.startCraftJob/
   G.villagerInterval's G.timeScale() snapshotting).

   Add a crop: one entry in G.CROPS (data.js) — { name, region,
   stages, stageMs, yield }. `yield` is a normal drop table, the same
   shape G.rollDrops already reads for G.LOCATIONS.
   ========================================================= */
(function (G) {
  'use strict';

  /* Plot count used to auto-grow with the farming skill; it's now a
     resource purchase instead — S.farmPlotsBuilt counts how many
     extra plots have been bought on top of TUNE.farmPlotsBase, capped
     at TUNE.farmPlotsMax (3 base + 9 buildable = 12 total). */
  G.farmPlotCount = () =>
    Math.min(G.TUNE.farmPlotsMax, G.TUNE.farmPlotsBase + (S.farmPlotsBuilt || 0));

  /* Each extra plot costs double the last, starting at 2 Pine Planks
     + 2 Basalt Blocks for the first one — plot N (1-indexed, N=1 is
     the first BUILT plot beyond the free starting ones) costs
     2*2^(N-1) of each. Returns null once already at the cap. */
  G.nextFarmPlotCost = function () {
    if (G.farmPlotCount() >= G.TUNE.farmPlotsMax) return null;
    const n = Math.pow(2, S.farmPlotsBuilt || 0) * 2;
    return { planks: n, basaltBlock: n };
  };

  G.buildFarmPlot = function () {
    const cost = G.nextFarmPlotCost();
    if (!cost) { G.emit('farm:failed', { reason: 'plotsMax' }); return false; }
    if (!G.canAffordCraft(cost)) { G.emit('farm:failed', { reason: 'cost' }); return false; }
    if (!G.spendCraftCost(cost)) { G.emit('farm:failed', { reason: 'cost' }); return false; }
    S.farmPlotsBuilt = (S.farmPlotsBuilt || 0) + 1;
    G.ensureFarmPlots();
    G.emit('farm:plotBuilt', { total: G.farmPlotCount() });
    G.emit('state:changed');
    G.save(true);
    return true;
  };

  /* Pad up to the current unlocked count — call before any read or
     render, same spirit as G.fillLocationField topping up a field. */
  G.ensureFarmPlots = function () {
    if (!S.farmPlots) S.farmPlots = [];
    while (S.farmPlots.length < G.farmPlotCount()) S.farmPlots.push(null);
  };

  G.farmGrowMs = function (crop) {
    const lv = S.skills.farming ? S.skills.farming.lv : 1;
    const mult = Math.max(G.TUNE.farmGrowSpeedFloor,
      1 - G.TUNE.farmGrowSpeedPerLv * (lv - 1));
    return Math.round(crop.stageMs * mult * G.timeScale());
  };

  G.farmYieldBonus = function () {
    const lv = S.skills.farming ? S.skills.farming.lv : 1;
    return [5, 15, 25, 50, 75, 100].reduce((n, req) => n + (lv >= req ? 1 : 0), 0);
  };

  G.availablePlantSeedCount = function (seedKey) {
    let n = S[seedKey] || 0;
    n += G.currentCrate()[seedKey] || 0;
    if (G.zoneHasBank()) n += G.currentBank()[seedKey] || 0;
    return n;
  };

  G.canPlantSeed = seedKey => G.availablePlantSeedCount(seedKey) > 0;

  G.plantSeed = function (i, seedKey) {
    G.ensureFarmPlots();
    const crop = G.CROPS[seedKey];
    const zone = G.ZONES[S.zone] || {};
    if (!crop) return false;
    if (i < 0 || i >= G.farmPlotCount()) return false;
    if (S.farmPlots[i]) { G.emit('farm:failed', { reason: 'occupied', i }); return false; }
    if (crop.region !== zone.region) { G.emit('farm:failed', { reason: 'region', seedKey }); return false; }
    if (!G.canPlantSeed(seedKey)) { G.emit('farm:failed', { reason: 'noseed', seedKey }); return false; }
    if (!G.spendCraftCost({ [seedKey]: 1 })) { G.emit('farm:failed', { reason: 'noseed', seedKey }); return false; }
    S.farmPlots[i] = { seedKey, stage: 0, wateredAt: null, stageMs: null };
    G.emit('farm:planted', { i, seedKey });
    G.emit('state:changed');
    G.save(false);
    return true;
  };

  G.plotReady = function (plot) {
    return !!plot && plot.stage >= G.CROPS[plot.seedKey].stages;
  };

  G.waterPlot = function (i) {
    G.ensureFarmPlots();
    const plot = S.farmPlots[i];
    if (!plot) return false;
    if (plot.wateredAt != null) return false;      // already growing
    if (G.plotReady(plot)) return false;            // mature, needs harvest not water
    const crop = G.CROPS[plot.seedKey];
    plot.wateredAt = Date.now();
    plot.stageMs = G.farmGrowMs(crop);
    G.grantXp('farming', G.TUNE.farmWaterXp);
    G.emit('farm:watered', { i });
    G.emit('state:changed');
    G.save(false);
    return true;
  };

  G.harvestPlot = function (i) {
    G.ensureFarmPlots();
    const plot = S.farmPlots[i];
    if (!G.plotReady(plot)) return false;
    const crop = G.CROPS[plot.seedKey];
    const drops = G.rollDrops({ dropTable: crop.yield });
    const bonus = G.farmYieldBonus();
    if (bonus > 0) Object.keys(drops).forEach(k => { drops[k] += bonus; });
    Object.keys(drops).forEach(k => G.addRes(k, drops[k]));
    G.grantXp('farming', G.TUNE.farmHarvestXp);
    S.farmPlots[i] = null;
    G.emit('farm:harvested', { i, seedKey: plot.seedKey, drops });
    G.emit('state:changed');
    G.save(false);
    return true;
  };

  /* Advance any plot whose current stage's real time has elapsed —
     the lazy resolver, called from both the render path (so opening
     the page after hours away shows the true state immediately) and
     the ticker below (so it fires events/animates while the page is
     actually open). */
  function resolvePlot(plot, now) {
    if (!plot || plot.wateredAt == null) return false;
    if (now - plot.wateredAt < plot.stageMs) return false;
    plot.stage++;
    plot.wateredAt = null;
    plot.stageMs = null;
    return true;
  }

  G.collectFarmWork = function () {
    G.ensureFarmPlots();
    const now = Date.now();
    const advanced = [];
    S.farmPlots.forEach((plot, i) => {
      if (resolvePlot(plot, now)) advanced.push(i);
    });
    if (advanced.length) G.save(false);
    return { advanced };
  };

  G.registerTicker('farmPlots', G.TUNE.farmTickMs, () => {
    const r = G.collectFarmWork();
    if (r.advanced.length) {
      G.emit('farm:advanced', { advanced: r.advanced });
      G.emit('state:changed');
    }
  });

})(window.Game = window.Game || {});
