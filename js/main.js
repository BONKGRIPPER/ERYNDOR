/* =========================================================
   main.js — wiring. Events in, UI out. Boot last.
   ========================================================= */
(function (G) {
  'use strict';
  const $ = id => document.getElementById(id);
  const UI = G.UI;

  /* Wire a click handler only if the element exists. A stale id should
     never take the whole boot down with it. */
  function on(id, fn) {
    const n = $(id);
    if (n) n.onclick = fn;
    else console.warn('[leatheron] missing element:', id);
  }

  /* ---------- event wiring --------------------------------- */
  G.on('hand:dealt', d => UI.dealHand(d));
  G.on('hand:dealt', () => G.playAudioHook && G.playAudioHook('ui.cardDraw'));
  G.on('card:chosen', d => UI.chooseCard(d));
  G.on('card:chosen', () => G.playAudioHook && G.playAudioHook('ui.cardChoose'));
  G.on('window:open', d => UI.openWindow(d));
  G.on('window:tick', d => UI.tickWindow(d));
  G.on('xp:gain', d => UI.pushRecentXp(d));

  G.on('card:resolved', ctx => {
    UI.closeWindow();
    const picked = document.getElementById('hand').children[G.current.index];
    if (picked) {
      if (ctx.hit) picked.classList.add('crit');
    }
    UI.showResolvedCard(ctx);
    if (ctx.gains && ctx.gains.length) UI.flyToBag(ctx.gains, picked || $('hand'));
    UI.renderStreak();
  });
  G.on('card:resolved', ctx => {
    if (!G.playAudioHook || !ctx || !ctx.card) return;
    const hookByKind = {
      gather: 'action.gather',
      forage: 'action.forage',
      mine: 'action.mine',
      axe: 'action.axe',
      melee: 'action.melee',
      ranged: 'action.ranged',
      fishing: 'action.fishing',
      event: 'action.gather',
    };
    const hook = hookByKind[ctx.card.kind];
    if (!hook) return;
    if (ctx.card.kind === 'gather' || ctx.card.kind === 'forage') {
      if (ctx.gains && ctx.gains.length) G.playAudioHook(hook);
      return;
    }
    if (ctx.card.kind === 'event' || ctx.dealt || (ctx.gains && ctx.gains.length)) G.playAudioHook(hook);
  });

  G.on('state:changed', () => UI.renderAll());
  /* the clock readout ticks every real minute (systems/clock.js) —
     cheap enough to update directly rather than triggering a full
     UI.renderAll for a text change nothing else depends on. */
  G.on('clock:changed', () => UI.renderClock());
  G.on('deck:changed', () => { UI.renderPips(); if (S.page === 'deck') UI.renderDeck(); });
  G.on('deck:reshuffled', () => UI.renderPips());
  G.on('pins:changed', () => {
    UI.renderPinBar();
    if (S.page === 'craft') UI.renderCraft();
  });
  G.on('travel:done', ({ name }) =>
    UI.banner('Travelled', name, 'a new stretch of road', ''));
  G.on('travel:done', () => {
    if (G.playAudioHook) G.playAudioHook('action.travel');
    if (G.syncZoneMusic) G.syncZoneMusic();
  });
  G.on('travel:blocked', ({ blocker }) =>
    UI.toast('That way is closed — ' + blocker + '.', 'Travel'));
  G.on('discovered', ({ key }) =>
    UI.toast('First ' + G.RESOURCES[key].name + '. New recipes may be available.', 'Discovered'));
  G.on('consumable:selected', ({ group, key }) =>
    UI.toast(key ? G.RESOURCES[key].name + ' locked in for ' + group + '.'
                 : 'Cleared — cards will use your strongest.', 'Consumables'));

  G.on('player:hurt', () => {
    if (G.playAudioHook) G.playAudioHook('action.hitTaken');
    UI.renderVitals();
    const b = $('hp-blocks');
    b.classList.remove('hp-flash'); void b.offsetWidth; b.classList.add('hp-flash');
  });
  G.on('player:healed', () => UI.renderVitals());
  G.on('player:downed', ({ lost }) => {
    if (G.playAudioHook) G.playAudioHook('ui.death');
    G.rt.paused = true;
    G.stopLoop();
    UI.showDeathScreen(lost);
    UI.renderAll();
  });

  /* Animals are location cards now — 'location:hurt'/'location:cleared'
     below already cover the shake, hurt-flash and loot-fly animation
     for them, same as any Boulder or Pine Tree. The only combat-specific
     feedback left is what the animal hit back for, which you only
     learn once you've actually swung at it. */
  G.on('retaliate', ({ name, dmg }) =>
    UI.banner('Bite back', name, '-' + dmg + ' hp', 'blood'));

  G.on('location:hurt', ({ index }) => {
    const card = document.querySelector('.locard[data-slot="' + index + '"]');
    if (card) { card.classList.remove('hurt'); void card.offsetWidth; card.classList.add('hurt'); }
    UI.shakeScreen();
    UI.renderLocationField();
  });
  G.on('location:cleared', ({ def, got, index }) => {
    const gains = Object.keys(got).map(k => ({ key: k, qty: got[k] }));
    if (def && def.requires === 'fishing' && gains.length) UI.showFishingCatch(def, got);
    if (def && gains.length) UI.showLocationBroken(index, def, gains);
    else UI.renderAll();
  });

  G.on('skill:levelup', ({ skill, lv, perk, name, tint }) => {
    if (G.playAudioHook) G.playAudioHook('ui.levelUp');
    UI.levelUp({ skill, lv, perk, name, tint });
    const c = $('skill-' + skill);
    if (c) { c.classList.add('up'); setTimeout(() => c.classList.remove('up'), 600); }
    UI.renderAll();
  });
  G.on('zone:levelup', ({ zone, lv, name, spin }) => {
    if (G.playAudioHook) G.playAudioHook('ui.zoneLevelUp');
    UI.zoneLevelUp({ zone, lv, name, spin });
    UI.renderAll();
  });

  G.on('craft', ({ kind, name, count }) => {
    if (G.playAudioHook) G.playAudioHook(kind === 'campfire' ? 'action.cook' : 'action.craft');
    UI.toast(kind === 'station'
      ? name + ' built. New recipes available.'
      : name + ' made' + (count > 1 ? ' (×' + count + ')' : '') + '.', 'Crafted');
    UI.renderAll();
  });
  G.on('farm:planted', () => G.playAudioHook && G.playAudioHook('action.plant'));
  G.on('farm:watered', ({ i }) => {
    UI.flagWatered(i);               // renderFarm replays the splash on the new cell
    if (G.playAudioHook) G.playAudioHook('action.water');
  });
  G.on('farm:harvested', () => G.playAudioHook && G.playAudioHook('action.harvest'));
  G.on('station:upgraded', ({ name, level }) =>
    UI.banner('Upgraded', name + ' — Lv' + level, 'tap-crafting here is faster now', 'spirit'));
  G.on('deck:purged', ({ key, size }) => {
    UI.banner('Purged', G.cardDef(key).name, 'deck is now ' + size + ' cards', 'spirit');
    UI.renderAll();
  });
  G.on('card:broken', ({ key }) => {
    /* Fires synchronously right after 'card:resolved', so the hand
       card that just broke is still sitting in the DOM (already
       mid-fade from the 'out' class) — give it a shatter beat before
       it goes, instead of just quietly vanishing like any other
       played card. G.current still points at it; nothing resets it
       until the next drawHand, well after this. */
    const picked = document.getElementById('hand').children[G.current.index];
    if (picked) picked.classList.add('breaking');
    UI.banner('Broken', G.cardDef(key).name, 'worn out — craft another', 'stone');
    UI.renderAll();
  });
  G.on('status:applied', ({ def }) => {
    UI.banner('Event', def.name, def.desc, 'spirit');
    UI.renderStatus();
  });
  G.on('status:cleared', ({ key }) => {
    const def = G.STATUS_EFFECTS[key];
    if (def) UI.toast(def.name + ' has passed.', 'Event');
    UI.renderStatus();
  });
  G.on('inventory:dropped', ({ recovered }) => {
    if (recovered) UI.toast('No longer over-encumbered. Full speed restored.', 'Recovered');
  });
  /* `key` is a CARD key now, not a resource — food is only ever eaten
     by playing its card (kind:'food', systems/cards.js), and 'raw' can
     no longer happen since raw food is never eaten at all. */
  G.on('food:eaten', ({ key, healed }) => {
    const c = G.cardDef(key);
    UI.toast('Ate ' + ((c && c.name) || key) + ' — restored ' + healed + ' hp.', 'Eaten');
  });
  G.on('food:refused', () =>
    UI.toast('Already at full health.', 'Not eaten'));
  G.on('hire:done', ({ name }) =>
    UI.banner('Hired', name, 'auto-crafts into this zone\'s crate while away', ''));
  G.on('hire:failed', ({ reason }) =>
    UI.toast(reason === 'slots' ? 'No free villager slots in this zone. Build a home here to unlock more.'
      : 'Not enough resources to hire.', 'Township'));
  G.on('hire:dismissed', ({ name }) => UI.toast((name || 'The villager') + ' has left your service.', 'Township'));
  G.on('home:built', ({ name, count, slots }) =>
    UI.banner('Built', name + '  x' + count, '+3 villager slots here — ' + slots + ' total', ''));
  G.on('home:failed', ({ reason }) =>
    UI.toast(reason === 'zone' ? 'That home belongs to another zone.'
      : reason === 'max' ? 'This settlement is already full.'
      : 'Not enough materials.', 'Settlement'));
  G.on('villagers:tick', ({ results }) => {
    const made = results.filter(r => r.applied > 0);
    if (!made.length) return;
    const txt = made.map(r => '+' + r.applied + ' ' + r.recipeName).join(', ');
    UI.toast('Villagers delivered ' + txt + ' to crate.', 'Township');
  });
  G.on('saved', ({ flash, failed }) => {
    if (failed) { UI.updateSaveInfo(); return; }
    if (flash) {
      const f = $('saveflash');
      f.classList.remove('go'); void f.offsetWidth; f.classList.add('go');
    }
    UI.updateSaveInfo();
  });

  /* ---------- villager return modal -------------------------
     The only thing that accrues while away. No combat, no risk
     of dying offline.                                           */
  function showVillagerReturn(ms) {
    G.rt.paused = true;
    G.stopLoop();
    UI.closeWindow();
    UI.clearCard();

    const r = G.collectVillagerWork();
    if (!r.ticks) { G.rt.paused = false; G.drawHand(); return; }

    const mins = Math.floor(Math.min(ms, G.TUNE.villagerCapH * 3600000) / 60000);
    const label = mins < 60
      ? mins + ' minute' + (mins === 1 ? '' : 's')
      : (Math.round(mins / 6) / 10) + ' hours';

    const loot = $('loot'); loot.innerHTML = '';
    let n = 0;
    r.results.forEach(res => {
      if (!res.applied) return;
      const stalledTxt = res.stalled
        ? ' <span style="color:var(--ember)">(stalled — crate ran dry)</span>' : '';
      const zoneName = (G.ZONES[res.zone] && G.ZONES[res.zone].name) || res.zone;
      loot.insertAdjacentHTML('beforeend',
        `<div class="loot-row"><span class="l-n">${res.stationName} — ${res.recipeName}
           <span style="color:var(--ink-3)">(${zoneName} crate)</span>${stalledTxt}</span>
         <span class="l-v">+${res.applied}</span></div>`);
      n++;
    });
    if (!n) loot.innerHTML = '<div class="loot-row"><span class="l-n">Nothing produced</span><span class="l-v">—</span></div>';

    const totalHired = Object.keys(S.stationVillagers || {})
      .reduce((sum, z) => sum + G.hiredCount(z), 0);
    $('m-title').textContent = label + ' away';
    $('m-sub').textContent = totalHired + ' villager' +
      (totalHired === 1 ? '' : 's') + ' made ' + r.ticks + ' item' +
      (r.ticks === 1 ? '' : 's') + ' for you.';
    $('m-note').innerHTML = 'Villagers are the only thing that runs while you are away — ' +
      'cards and combat are real-time only, so you can never be killed offline. Everything ' +
      'they make goes straight into their own zone\'s storage crate, not your carried bag.' +
      ' Village output banks up to <b>' + G.TUNE.villagerCapH + ' hours</b>.';
    $('modal').classList.add('show');
    on('m-btn', () => {
      $('modal').classList.remove('show');
      G.rt.paused = false;
      UI.renderAll();
      G.drawHand();
    });
  }

  /* ---------- input ---------------------------------------- */
  const field = $('field');
  if (field) field.addEventListener('pointerdown', G.handleTap);
  /* Tapping the page you are already on bounces back to Play. On a
     phone that turns every tab into its own back button — one thumb,
     no reaching for the play tab. Play itself is the floor, so it
     never toggles away from itself. */
  function goToggle(page) {
    if (page === 'market' && (!G.zoneHasMarket || !G.zoneHasMarket())) {
      UI.toast('Trade is only available inside city zones.', 'Market');
      return;
    }
    UI.go(S.page === page && page !== 'play' ? 'play' : page);
  }

  document.querySelectorAll('.nav button').forEach(b => {
    if (b.dataset.emb) {
      b.insertAdjacentHTML('afterbegin', G.sprite(b.dataset.emb, 22));
    }
    b.onclick = () => goToggle(b.dataset.page);
  });
  var wEmb = document.getElementById('warn-emb');
  if (wEmb) wEmb.innerHTML = G.sprite('pack', 18);
  on('zone-btn', () => goToggle('home'));
  const bagBtn = $('bag-btn');
  if (bagBtn) { bagBtn.innerHTML = G.sprite('pack', 18); bagBtn.onclick = () => goToggle('bag'); }
  /* Deck moved out of the bottom nav up beside the bag — it reads as
     inventory-adjacent, and it frees a nav slot. */
  const deckIco = $('deck-ico');
  if (deckIco) deckIco.innerHTML = G.sprite('deckIcon', 16);
  const deckBtn = $('deck-btn');
  if (deckBtn) deckBtn.onclick = () => goToggle('deck');
  /* Market — icon only appears while standing in a city; visibility
     is recomputed every UI.renderAll pass, see ui.js. */
  const marketBtn = $('market-btn');
  if (marketBtn) {
    marketBtn.innerHTML = G.sprite('gold', 18);
    marketBtn.onclick = () => {
      if (!G.zoneHasMarket || !G.zoneHasMarket()) return;
      goToggle('market');
    };
  }
  /* The tap that resolves a card and pushes a skill/zone over its
     level threshold is still "in flight" when the popup appears —
     the browser's own click event for that same tap lands right on
     this overlay (it now covers the tap point) a moment later and
     would otherwise dismiss it instantly. Ignore a click that lands
     within the same gesture; only a deliberate second tap closes it. */
  const DISMISS_GRACE_MS = 350;
  on('lvlup', () => {
    if (performance.now() - (UI._lvlupOpenedAt || 0) < DISMISS_GRACE_MS) return;
    UI.closeLevelUp();
  });
  on('zonewheel', () => {
    if (performance.now() - (UI._zwOpenedAt || 0) < DISMISS_GRACE_MS) return;
    UI.closeZoneWheel();
  });
  on('item-sheet-close', () => UI.hideItemDetail());
  on('item-modal', (ev) => { if (ev.target.id === 'item-modal') UI.hideItemDetail(); });
  on('fish-sheet-close', () => UI.hideFishJournal());
  on('fish-modal', (ev) => { if (ev.target.id === 'fish-modal') UI.hideFishJournal(); });
  on('death-continue', () => {
    UI.hideDeathScreen();
    G.rt.paused = false;
    UI.renderAll();
    G.drawHand();
  });
  on('wipe-btn', () => {
    G.wipe();
    UI.renderAll();
    UI.toast('Save wiped. Starting over in Aerendell.', 'Reset');
    G.drawHand();
  });
  on('editor-btn', () => {
    const href = 'tools/editor.html';
    const win = window.open(href, '_blank', 'noopener');
    if (!win) window.location.href = href;
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      if (G.stopMusic) G.stopMusic();
      G.save(false); G.stopLoop(); G.stopTickers();
      G.rt.paused = true;
    } else {
      const away = Date.now() - S.lastSeen;
      G.rt.paused = false;
      if (G.syncZoneMusic) G.syncZoneMusic();
      G.startTickers();
      G.tickCraftJobs();                // finish any tap-craft that ran out while away
      showVillagerReturn(away);
    }
  });
  window.addEventListener('beforeunload', () => G.save(false));

  /* ---------- boot ----------------------------------------- */
  window.S = G.S = G.freshState();
  const had = G.load();
  if (!S.deck.length) G.buildDeck();
  if (!had) {
    G.shuffle(S.deck);
    /* a genuinely fresh install has no save to migrate through
       G.load()'s locationDecks/locationField backfill (core.js) —
       do the same build+shuffle+fill G.wipe() does, or the Play
       page's field stays stuck on freshState()'s [null,null,null]
       forever, showing no cards until the player manually wipes. */
    G.buildLocationDecks();
    S.locationDecks.forEach(sd => G.shuffle(sd.deck));
    G.fillLocationField();
  }

  UI.go(S.page && document.getElementById('page-' + S.page) ? S.page : 'play');
  UI.renderAll();
  if (G.syncZoneMusic) G.syncZoneMusic();

  const away = had ? Date.now() - S.lastSeen : 0;
  G.registerTicker('autosave', 30000, () => G.save(false));
  G.registerTicker('saveInfo', 5000, UI.updateSaveInfo);
  G.startTickers();
  G.tickCraftJobs();                    // any tap-craft that ran out while the app was closed
  if (away > 0) showVillagerReturn(away);
  else G.drawHand();

})(window.Game = window.Game || {});
