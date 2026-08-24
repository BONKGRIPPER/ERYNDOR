/* =========================================================
   ui.js — rendering only. Subscribes to core events.
   Nothing here mutates game state except via G.* calls.
   ========================================================= */
(function (G) {
  'use strict';
  const $ = id => document.getElementById(id);
  const el = (tag, cls, html) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  };
  const UI = G.UI = {};
  const sp = (name, size) => G.sprite(name, size || 16);

  /* ---------- bag: donate selection ---------------------------
     Which resource stacks are checked for the next Donate tap —
     purely a UI concern (never persisted, never touches S), same
     spirit as the "nothing here mutates state except via G.*"
     rule at the top of this file. */
  const donateSelected = new Set();
  let openZoneDeckPicker = null;
  let deckPickerOpen = false;
  let openMovePickerKey = null;
  let openStationMenu = null;   // station id whose Level Up / Hire menu is expanded
  /* which farm plot was just watered, so renderFarm can replay the
     splash on the freshly-rebuilt cell — see UI.flagWatered */
  let justWatered = { i: -1, at: 0 };
  UI.flagWatered = function (i) { justWatered = { i, at: Date.now() }; };

  /* "1:23" / "45s" — a growing plot's remaining time */
  function fmtRemain(ms) {
    const s = Math.max(0, Math.ceil(ms / 1000));
    if (s < 60) return s + 's';
    return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
  }

  /* ---------- pinned recipes bar (above the tabs) ----------- */
  UI.renderPinBar = function () {
    const wrap = $('pinbar'); if (!wrap) return;
    wrap.innerHTML = '';
    const pins = S.pins || [];
    let shown = 0;
    for (let i = 0; i < G.TUNE.pinSlots; i++) {
      const d = G.readPin(pins[i]);
      if (!d) continue;
      shown++;
      const box = el('div', 'pinb' + (d.ready ? ' ready' : '') + (d.done ? ' done' : ''));
      if (d.kind === 'resource') {
        box.innerHTML =
          `${sp(G.resSprite(d.key), 13)}
           <span class="pb-n">${d.label}</span>
           <span class="pb-v">${d.value}</span>`;
      } else {
        const reqs = d.parts.map(p =>
          `<span class="pb-r${p.have >= p.need ? ' met' : ''}">
             ${sp(G.resSprite(p.key), 11)}${Math.min(p.have, p.need)}/${p.need}
           </span>`).join('');
        box.innerHTML =
          `<span class="pb-n">${d.label}</span><span class="pb-reqs">${reqs}</span>`;
      }
      box.onclick = () => { G.setPin(i, null); };
      wrap.appendChild(box);
    }
    wrap.style.display = shown ? '' : 'none';
  };

  /* ---------- header: vitals -------------------------------- */
  function stationSprite(id) {
    return id === 'altar' ? 'altar' : id === 'furnace' ? 'anvil' : 'anvil';
  }
  UI.applyTheme = function () {
    const t = (G.ZONE_THEME && G.ZONE_THEME[S.zone]) || null;
    if (!t) return;
    const r = document.documentElement;
    if (!r || !r.style) return;
    r.style.setProperty('--accent', t.accent);
    r.style.setProperty('--zone-soft', t.soft);
    r.style.setProperty('--zone-line', t.line);
  };

  /* Active status effects — storms, and whatever else event cards
     apply later. A duration counts down every card played; effects
     with no duration (a future cure-item plague, say) just show
     without a number until something calls G.clearStatus. */
  UI.renderStatus = function () {
    const box = $('statusbar'); if (!box) return;
    box.innerHTML = Object.keys(S.status).map(key => {
      const def = G.STATUS_EFFECTS[key];
      if (!def) return '';
      const left = S.status[key];
      return `<div class="status-chip">${def.name}${typeof left === 'number' ? ' <b>' + left + '</b>' : ''}</div>`;
    }).join('');
  };

  /* the header's real-device clock readout — see systems/clock.js.
     Diagnostic only in v1: shows the sun/moon and the current hour,
     nothing tappable yet. */
  UI.renderClock = function () {
    const ico = $('clock-ico'); const time = $('clock-time');
    if (!ico || !time) return;
    const c = G.gameClock();
    ico.innerHTML = sp(c.isNight ? 'moon' : 'sun', 15);
    const h12 = ((c.hour + 11) % 12) + 1;
    time.textContent = h12 + ':' + String(c.minute).padStart(2, '0') + (c.hour < 12 ? 'am' : 'pm');
  };

  /* the seasonal calendar readout, top of the Home page — see
     G.gameSeason/G.daysLeftInSeason, systems/clock.js */
  const SEASON_SPRITE = { spring: 'seasonSpring', summer: 'seasonSummer', autumn: 'seasonAutumn', winter: 'seasonWinter' };
  UI.renderSeason = function () {
    const wrap = $('season-panel'); if (!wrap) return;
    const season = G.gameSeason();
    const dayOfWeek = (G.gameDay() % 7) + 1;
    const left = G.daysLeftInSeason();
    wrap.innerHTML = '';
    const panel = el('div', 'season-panel');
    panel.innerHTML =
      `<div class="season-top">
         <span class="season-ico">${sp(SEASON_SPRITE[season], 26)}</span>
         <div>
           <div class="season-name">${season[0].toUpperCase() + season.slice(1)}</div>
           <div class="season-sub">day ${dayOfWeek} of 7 · ${left === 0 ? 'changes tomorrow' : left + ' day' + (left === 1 ? '' : 's') + ' left'}</div>
         </div>
       </div>
       <div class="season-bar"><span class="season-bar-fill" style="width:${(dayOfWeek / 7) * 100}%"></span></div>`;
    wrap.appendChild(panel);
  };

  UI.renderVitals = function () {
    UI.applyTheme();
    UI.renderClock();
    const zn = $('zone-name');
    if (zn) { zn.textContent = G.zoneName(); }
    const zr = $('zone-region');
    if (zr) {
      const reg = G.REGIONS.find(r => r.id === G.zone().region);
      zr.textContent = reg ? reg.name : '';
    }
    const zlv = $('zone-lv');
    if (zlv) {
      const zx = S.zoneXp[S.zone];
      zlv.textContent = zx ? 'Lv ' + zx.lv : '';
    }
    const zxf = $('zone-xp-fill');
    if (zxf) {
      const zx = S.zoneXp[S.zone];
      const pct = zx ? Math.max(0, Math.min(100, (zx.xp / zx.need) * 100)) : 0;
      zxf.style.width = pct + '%';
    }
    const hpIco = document.getElementById('hp-ico');
    if (hpIco && !hpIco.innerHTML) hpIco.innerHTML = sp('heart', 13);
    const wtIco = document.getElementById('wt-ico');
    if (wtIco && !wtIco.innerHTML) wtIco.innerHTML = sp('weight', 13);
    const mx = G.maxHp(), hp = S.hp;
    const wrap = $('hp-blocks'); wrap.innerHTML = '';
    const ratio = hp / mx;
    for (let i = 0; i < mx; i++) {
      const b = el('div', 'blk' + (i < hp
        ? ' on' + (ratio <= 0.3 ? ' crit' : ratio <= 0.6 ? ' low' : '') : ''));
      wrap.appendChild(b);
    }
    $('hp-num').textContent = hp + '/' + mx;

    const cap = G.carryCap(), pct = Math.min(1, S.weight / cap);
    const wb = $('wt-bar'); wb.innerHTML = '';
    const SEGS = 40;
    /* always light at least one segment once you carry anything, so the
       bar reads as alive during the early game instead of looking stuck */
    let on = Math.ceil(pct * SEGS);
    if (S.weight > 0 && on < 1) on = 1;
    for (let i = 0; i < SEGS; i++) {
      wb.appendChild(el('div', 'wt-seg' + (i < on
        ? ' on' + (pct >= 1 ? ' full' : pct > 0.75 ? ' warn' : '') : '')));
    }
    $('wt-num').textContent = G.fmtWt(S.weight) + '/' + cap;
    $('warnbar').classList.toggle('show', G.isEncumbered());
  };

  /* ---------- play: location field ---------------------------
     Up to three field targets at once — Boulders, Pine Trees, ore
     veins, and animals, all the same system now. Cleared
     automatically by whatever matching card you play; no tapping
     here, and no separate enemy panel — an animal is just a location
     card like any other, showing only its emblem, name and hp. */
  /* Matches the card kind that clears each location: mine (picks)
     reads grey/stone, axe (axes) reads brown/wood, combat (melee or
     ranged) reads red/blood — same tint language as the hand cards,
     so "what breaks this" is obvious at a glance. */
  const LOCATION_TINT = { mine: 'stone', axe: 'wood', fishing: 'range' };
  /* Any location that hits back, regardless of which specific card
     kind is needed to fight it — 'combat' (melee or ranged), or a
     narrower gate like 'ranged' for something that can only be shot.
     atk is never set on a boulder/tree/ore, so its presence alone is
     the real signal — cleaner than special-casing every requires
     value as new single-weapon animals show up (see engine.js). */
  const isHostile = def => !!(def && def.atk);

  UI.renderLocationField = function () {
    const box = $('locfield');
    if (!box) return;
    const field = S.locationField || [];
    const labels = (G.zone().slotLabels || ['Field I', 'Field II', 'Field III']);
    /* a slot mid break-animation (UI.showLocationBroken) owns its own
       DOM until it's done — pull its wrap out before the wipe below
       and put it straight back, instead of letting this render stomp
       the flip/reveal in progress. */
    const preserved = {};
    Object.keys(UI._brokenSlots || {}).forEach(i => {
      const node = box.querySelector('.locslot[data-idx="' + i + '"]');
      if (node) preserved[i] = node;
    });
    box.innerHTML = '';
    for (let i = 0; i < 3; i++) {
      if (preserved[i]) { box.appendChild(preserved[i]); continue; }
      const slot = field[i];
      const wrap = el('div', 'locslot');
      wrap.dataset.idx = i;
      wrap.appendChild(el('div', 'locslot-lbl', labels[i] || ('Field ' + (i + 1))));
      if (!slot) {
        wrap.appendChild(el('div', 'locslot-empty'));
        box.appendChild(wrap);
        continue;
      }
      const def = G.LOCATIONS[slot.key];
      if (!def) continue;
      const tint = isHostile(def) ? 'blood' : (LOCATION_TINT[def.requires] || 'stone');
      const card = el('div', 'locard tint-' + tint);
      card.dataset.slot = i;
      const want = G.SPRITES[def.sprite] ? def.sprite : 'stone';
      let blocks = '';
      for (let j = 0; j < def.hp; j++) {
        blocks += '<div class="blk' + (j < slot.hp ? ' on' : '') + '"></div>';
      }
      /* A sword badge in the corner tells you the cost of a swing
         before you commit to it, no need to land a hit first to
         find out. */
      const atkBadge = isHostile(def)
        ? `<div class="locard-atk">${sp('sword', 11)}<b>${def.atk}</b></div>` : '';
      const reqBadge = def.requires === 'ranged'
        ? `<div class="locard-req" title="Ranged weapon required"><span class="locard-req-ico">${sp('sword', 11)}</span><span class="locard-req-slash"></span></div>` : '';
      card.innerHTML =
        `${atkBadge}${reqBadge}
         <div class="locard-emb">${sp(want, 30)}</div>
         <div class="locard-name">${def.name}</div>
         <div class="blocks locard-blocks">${blocks}</div>`;
      wrap.appendChild(card);
      box.appendChild(wrap);
    }
    /* nav dot: something in the field will hit back if you're not
       here to deal with it — same "come look at this" nudge the old
       dedicated enemy panel used to give. */
    const hasThreat = field.some(slot => isHostile(slot && G.LOCATIONS[slot.key]));
    $('dot-play').style.display = (hasThreat && S.page !== 'play') ? 'block' : 'none';
  };

  /* ---------- play: deck strip ------------------------------ */
  /* Only how many cards remain — never what is coming next. */
  UI.renderPips = function () {
    $('deck-left').textContent = Math.max(0, S.deck.length - S.drawnCount);
    $('deck-total').textContent = S.deck.length;
  };
  UI.renderStreak = function () {
    $('streak').innerHTML = S.streak > 1 ? 'streak <b>' + S.streak + '</b>' : '';
  };

  /* ---------- play: the hand --------------------------------
     Three simple cards: emblem, then +N Resource underneath.  */
  /* Card kinds that only do something against a target (an enemy or
     a field location). When one of these has a live target, the
     hand card gets a highlighted border — an "armed" state — so a
     fast player can spot the useful card without reading it. */
  const TARGET_KINDS = { melee: 1, ranged: 1, mine: 1, axe: 1, fishing: 1 };

  /* Slim fill bar showing how worn a tool/weapon card is. Durability
     is one shared pool across every copy of a key, so "full" scales
     with how many copies are currently in the deck. Empty string for
     any card with no durability pool (gather/forage, or a tool that
     was never crafted this run). */
  function durabilityGaugeHTML(key, card) {
    if (!G.durabilityEnabled()) return '';
    const dur = S.durability[key];
    if (dur == null || !card.durability) return '';
    const copies = G.deckCounts()[key] || 1;
    const max = card.durability * copies;
    const pct = Math.max(0, Math.min(100, Math.round((dur / max) * 100)));
    const stage = pct <= 20 ? ' crit' : pct <= 50 ? ' low' : '';
    return `<div class="hc-durability${stage}" title="${dur}/${max} uses left">
              <div class="hc-durability-fill" style="width:${pct}%"></div>
            </div>`;
  }

  /* One star per equipment tier (Flint 0, Stone 1, Scrap 2, Bronze 3;
     Fishing Net 0, Fishing Rod 1 — see card.tier). Empty string for
     anything with no tier field (gather/forage, Ore Vein) — 0 stars
     and "no tier at all" render identically, which is correct, both
     mean nothing to show. */
  function tierPipsHTML(tier) {
    if (!tier) return '';
    let stars = '';
    for (let i = 0; i < tier; i++) stars += '<span>&#10022;</span>';
    return `<div class="tier-pips" title="${tier === 1 ? 'Tier 1' : 'Tier ' + tier}">${stars}</div>`;
  }

  UI.dealHand = function ({ hand }) {
    const wrap = $('hand'); wrap.innerHTML = '';
    hand.forEach(h => {
      const c = h.card;
      const yields = h.face.yields || [];
      /* one line per output: emblem + amount + name */
      const lines = yields.length
        ? yields.map(y =>
            `<div class="cy">${sp(G.resSprite(y.key), 13)}
               <b>+${y.qty}</b><span>${G.RESOURCES[y.key].name}</span>
               ${y.chance ? '<i>' + y.chance + '</i>' : ''}</div>`).join('')
        : `<div class="cy combat"><b>${combatLine(c)}</b></div>`;

      const armed = TARGET_KINDS[c.kind] && !h.face.blocked;
      const tint = (c.tint || 'stone').toLowerCase();
      /* cosmetic finish pulled from the zone wheel — purely visual,
         never changes what the card does */
      const finish = h.finish ? ' ' + h.finish : '';
      const el2 = el('div', 'hcard tint-' + tint + finish +
        (h.face.blocked ? ' blocked' : '') + (armed ? ' armed' : ''));
      el2.style.animationDelay = (h.index * 45) + 'ms';
      /* trading-card layout: art on top, a type band (so a hand of
         mixed cards reads at a glance), name + effects below —
         framed in the card's own tint colour, distinct from the
         amber location cards and the red enemy panel above. */
      el2.innerHTML =
        `<div class="hc-art">${sp(G.cardSprite(h.key), 34)}${tierPipsHTML(c.tier)}</div>
         <div class="hc-type">${c.type || ''}</div>
         <div class="hc-body">
           <div class="hc-name">${c.name}</div>
           ${durabilityGaugeHTML(h.key, c)}
           <div class="hc-y">${lines}</div>
         </div>`;
      el2.onclick = (ev) => {
        ev.stopPropagation();
        G.chooseCard(h.index);
      };
      wrap.appendChild(el2);
    });
    $('tap-hint').textContent = '';
    $('tap-hint').classList.remove('dim');
    $('timing').classList.remove('combat');
  };

  UI.showResolvedCard = function (ctx) {
    const hand = $('hand');
    if (!hand || !hand.children || ctx == null || G.current.index < 0) return;
    const picked = hand.children[G.current.index];
    if (!picked) return;
    const gains = (ctx.gains || []).filter(g => g && g.qty > 0);
    if (!gains.length) return;
    picked.classList.add('resulting');
    picked.innerHTML =
      `<div class="hc-result">
         <div class="hc-result-lbl">${ctx.hit ? 'Clean Hit' : 'Gathered'}</div>
         <div class="hc-result-gains">${gains.map(g =>
           `<div class="hc-result-gain">${sp(G.resSprite(g.key), 14)}<b>+${g.qty}</b><span>${G.RESOURCES[g.key].name}</span></div>`
         ).join('')}</div>
       </div>`;
    setTimeout(() => { picked.classList.add('out'); }, 525);
  };

  UI.pushRecentXp = function (d) {
    UI._recentXp = UI._recentXp || [];
    const existing = UI._recentXp.find(x => x.skill === d.skill);
    const item = existing || {
      id: Date.now() + Math.random(),
      skill: d.skill,
    };
    item.name = d.name;
    item.tint = d.tint;
    item.amt = (existing ? existing.amt : 0) + d.amt;
    item.xp = d.xp;
    item.need = d.need;
    item.lv = d.lv;
    if (existing) {
      clearTimeout(item.timer);
      UI._recentXp = UI._recentXp.filter(x => x.skill !== d.skill);
    }
    UI._recentXp.unshift(item);
    UI._recentXp = UI._recentXp.slice(0, 2);
    UI.renderRecentXp();
    item.timer = setTimeout(() => {
      UI._recentXp = (UI._recentXp || []).filter(x => x.id !== item.id);
      UI.renderRecentXp();
    }, 4500);
  };
  UI.renderRecentXp = function () {
    const box = $('recent-xp');
    if (!box) return;
    const items = UI._recentXp || [];
    box.innerHTML = '';
    box.style.display = items.length ? '' : 'none';
    items.forEach(item => {
      const pct = item.need ? Math.max(0, Math.min(100, (item.xp / item.need) * 100)) : 0;
      const chip = el('div', 'xp-chip');
      chip.dataset.tint = item.tint || 'stone';
      chip.innerHTML =
        `<div class="xp-chip-top"><span class="xp-chip-name">${item.name}</span>
           <span class="xp-chip-gain">+${item.amt} xp</span></div>
         <div class="xp-chip-bar"><span class="xp-chip-fill" style="width:${pct}%"></span></div>`;
      box.appendChild(chip);
    });
  };

  /* No retaliation preview here — you only learn what an animal
     hits back for once you actually swing at it (see the
     'retaliate' banner in main.js). */
  function combatLine(c) {
    if (c.kind === 'melee') return c.atk + ' dmg';
    if (c.kind === 'ranged') {
      const ammo = G.activeConsumable('ammo');
      return (c.atk + (ammo ? ammo.dmg : 0)) + ' dmg';
    }
    /* food grants no resources, so it would otherwise fall through to
       a blank card face — show what it restores instead */
    if (c.kind === 'food') return '+' + (c.heal || 0) + ' hp';
    return '';
  }

  /* mark the chosen card, dim the rest */
  UI.chooseCard = function ({ index }) {
    const cards = $('hand').children;
    for (let i = 0; i < cards.length; i++) {
      cards[i].classList.add(i === index ? 'picked' : 'passed');
    }
    const c = G.cardDef(G.current.key);
    $('timing').classList.toggle('combat', c.kind === 'melee' || c.kind === 'ranged');
  };

  UI.clearHand = function () { const h = $('hand'); if (h) h.innerHTML = ''; };
  UI.clearCard = UI.clearHand;

  /* ---------- items flying to the bag icon -------------------
     Replaces text feedback: whatever you gained flies, one
     emblem per unit, from where it happened to the backpack
     icon in the header. Capped per resource so a big yield
     doesn't spam the screen with icons.                        */
  UI.bumpBag = function () {
    const b = $('bag-btn'); if (!b) return;
    b.classList.remove('bump'); void b.offsetWidth; b.classList.add('bump');
  };

  UI.flyToBag = function (gains, originEl) {
    const bag = $('bag-btn');
    if (!bag || !gains || !gains.length) return;
    const SIZE = 40, HALF = SIZE / 2;               // matches the hand card's emblem
    const dest = bag.getBoundingClientRect();
    const dx = dest.left + dest.width / 2 - HALF, dy = dest.top + dest.height / 2 - HALF;
    const from = (originEl || $('hand')).getBoundingClientRect();
    const ox = from.left + from.width / 2 - HALF, oy = from.top + from.height / 2 - HALF;

    let i = 0;
    gains.forEach(g => {
      const n = Math.min(g.qty, 6);
      for (let j = 0; j < n; j++) {
        const piece = el('div', 'fly-emb');
        piece.innerHTML = sp(G.resSprite(g.key), SIZE);
        const jx = (Math.random() - 0.5) * 34, jy = (Math.random() - 0.5) * 22;
        piece.style.transform = 'translate(' + (ox + jx) + 'px,' + (oy + jy) + 'px)';
        document.body.appendChild(piece);
        void piece.offsetWidth;
        const delay = i * 26; i++;
        setTimeout(() => {
          piece.style.transform = 'translate(' + dx + 'px,' + dy + 'px) scale(.3)';
          piece.style.opacity = '0';
        }, delay);
        setTimeout(() => { piece.remove(); UI.bumpBag(); }, 338 + delay);
      }
    });
  };

  /* ---------- location card break: flip, reveal gains, fly up ----
     A field card (Boulder/Pine Tree/enemy/etc) that just cleared
     spins over in place, its back face lists what it dropped (same
     "icon + qty" language as flyToBag/hc-result), holds a beat, then
     the usual flyToBag run carries those gains up to the bag icon.
     Indexed by field slot so UI.renderLocationField can leave a
     slot's DOM alone while it's mid-animation (see the preserved{}
     check there) instead of the normal full-wipe re-render. */
  UI._brokenSlots = {};
  UI.showLocationBroken = function (index, def, gains) {
    const card = document.querySelector('.locard[data-slot="' + index + '"]');
    if (!card || !gains.length || UI._brokenSlots[index]) {
      if (gains.length) UI.flyToBag(gains, card || $('locfield'));
      UI.renderAll();
      return;
    }
    UI._brokenSlots[index] = true;
    const showBack = () => {
      card.innerHTML =
        `<div class="locard-back-lbl">${def.atk ? 'Defeated' : 'Cleared'}</div>
         <div class="locard-back-gains">${gains.map(g =>
           `<div class="locard-back-gain">${sp(G.resSprite(g.key), 16)}<b>+${g.qty}</b></div>`
         ).join('')}</div>`;
    };
    const release = () => { delete UI._brokenSlots[index]; UI.renderAll(); };
    const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      showBack();
      UI.flyToBag(gains, card);
      setTimeout(release, 500);
      return;
    }
    card.classList.add('flip-anim');
    setTimeout(showBack, 160);              // the instant the card is edge-on, invisible
    setTimeout(() => { UI.flyToBag(gains, card); }, 320);
    setTimeout(() => { card.classList.add('fading'); }, 770);
    setTimeout(release, 920);
  };

  /* ---------- timing window --------------------------------- */
  UI.openWindow = function (d) {
    const hint = $('tap-hint');
    hint.textContent = '';
    hint.classList.add('dim');
    const b = (d && d.band) || G.rt.band || { start: 0.5, end: 0.65 };
    const hz = $('hitzone');
    hz.style.left = (b.start * 100) + '%';
    hz.style.width = ((b.end - b.start) * 100) + '%';
    $('timing').classList.add('live');
  };
  UI.tickWindow = function ({ p }) { $('needle').style.left = 'calc(' + (p * 100) + '% - 1px)'; };
  UI.closeWindow = function () {
    $('timing').classList.remove('live');
    const hint = $('tap-hint');
    if (hint) hint.textContent = '';
  };

  /* ---------- skills tab ------------------------------------ */
  UI.renderSkills = function () {
    const wrap = $('skill-list'); wrap.innerHTML = '';
    Object.keys(G.SKILLS).forEach(k => {
      const def = G.SKILLS[k], s = S.skills[k];
      const SEGS = 16, on = Math.round(Math.min(1, s.xp / s.need) * SEGS);
      let segs = '';
      for (let i = 0; i < SEGS; i++) segs += '<div class="seg' + (i < on ? ' on' : '') + '"></div>';
      const card = el('div', 'skill-card');
      card.dataset.tint = def.tint;
      card.id = 'skill-' + k;
      const icoMap = { mining:'stone', woodcut:'axe', melee:'sword', archery:'bow',
                       prayer:'altar', farming:'seedling', crafting:'anvil',
                       fishing:'fish',
                       tanning:'leather' };
      const extra = k === 'fishing'
        ? '<div class="skill-extra">tap to view fish journal</div>' : '';
      card.innerHTML =
        `<div class="skill-hd">${sp(icoMap[k] || 'skills', 18)}
           <span class="skill-nm">${def.name}</span>
           <span class="skill-lv"><i>lv</i>${s.lv}</span></div>
         <div class="seg-bar">${segs}</div>
         <div class="skill-foot"><span>${s.xp} / ${s.need} xp</span>
           <span>${nextPerk(def, s.lv)}</span></div>${extra}`;
      if (k === 'fishing') {
        card.classList.add('tapable');
        card.onclick = () => UI.showFishJournal();
      }
      wrap.appendChild(card);
    });
    $('stat-hp').textContent = S.hp + '/' + G.maxHp();
    $('stat-melee').textContent = G.bestPower('melee');
    $('stat-ranged').textContent = G.bestPower('ranged');
    $('stat-kills').textContent = S.kills;
    $('stat-clean').textContent = S.attempts ? Math.round(S.hits / S.attempts * 100) + '%' : '—';
    $('stat-deck').textContent = S.deck.length;
  };
  function nextPerk(def, lv) {
    if (!def.perks) return '';
    const next = Object.keys(def.perks).map(Number).filter(n => n > lv).sort((a, b) => a - b)[0];
    return next ? 'lv' + next + ': ' + def.perks[next] : '';
  }

  /* ---------- deck tab -------------------------------------- */
  UI.renderDeck = function () {
    const pi = $('prayer-emb');
    if (pi && !pi.innerHTML) pi.innerHTML = sp('altar', 26);
    $('pp-val').textContent = S.prayerPoints;
    $('deck-size').textContent = S.deck.length;
    $('purge-hint').textContent = 'cost scales with tier';
    /* The Bone Altar renders here rather than on the Craft page
       (station `page: 'deck'`, same mechanism the Campfire uses for
       'farm') — burying a bone is really a deck action, and sitting
       it directly under #pp-val means the counter above visibly
       ticks up as each bone goes in. */
    renderStationsInto('deck-stations', 'deck',
      'No altar here yet.<br>Build a Bone Altar to start earning prayer points.');
    UI.renderDeckSlots();
    const list = $('card-list'); list.innerHTML = '';
    const counts = G.deckCounts();
    Object.keys(counts).forEach(k => {
      const c = G.cardDef(k);
      const cost = G.purgeCost(k);
      const can = S.prayerPoints >= cost && S.deck.length > 1;
      const kind = G.cardKinds[c.kind];
      const f = kind && kind.face ? kind.face(c, k) : {};
      const chips = (f.yields || []).map(y =>
        `<span class="yc small">${sp(G.resSprite(y.key), 11)}<b>${y.qty}</b></span>`).join('');
      const dur = S.durability[k];
      const pillCls = 'deck-card-pill' + (c.foil ? ' foil' : '') + (G.finishCount(S.prismatic, G.baseCardKey(k)) ? ' prismatic' : '');
      const row = el('div', 'row');
      row.innerHTML =
        `<span class="${pillCls}">${sp(G.cardSprite(k), 22)}${tierPipsHTML(c.tier)}</span>
         <div class="row-body"><div class="row-nm">${c.name}</div>
           <div class="row-sub">${c.type}${(G.durabilityEnabled() && dur != null) ? ' · ' + dur + ' use' + (dur === 1 ? '' : 's') + ' left' : ''}</div>
           ${durabilityGaugeHTML(k, c)}
           ${chips ? '<div class="card-yields tight">' + chips + '</div>' : ''}</div>
         <div class="row-n">${counts[k]}</div>`;
      const btns = el('div', 'btn-col');
      const actionRow = el('div', 'move-row deck-card-actions');
      const b = el('button', 'px-btn spirit', 'Remove (' + cost + 'pt)');
      b.disabled = !can;
      b.onclick = () => G.purgeCard(k);
      actionRow.appendChild(b);
      const moveTargets = [];
      for (let i = 0; i < G.unlockedDeckSlots(); i++) if (i !== S.activeDeckSlot) moveTargets.push(i);
      if (moveTargets.length) {
        const moveCost = G.deckMoveCost(k);
        const canMove = (S.prayerPoints >= moveCost) && S.deck.length > 1;
        const moveBtn = el('button', 'px-btn',
          openMovePickerKey === k ? 'Cancel' : 'Move (' + moveCost + 'pt)');
        moveBtn.disabled = !canMove;
        moveBtn.onclick = () => {
          openMovePickerKey = openMovePickerKey === k ? null : k;
          UI.renderDeck();
        };
        actionRow.appendChild(moveBtn);
        if (openMovePickerKey === k) {
          const moveRow = el('div', 'move-row card-move-picker');
          moveTargets.forEach(i => {
            const mb = el('button', 'px-btn', 'To D' + (i + 1));
            mb.onclick = () => {
              G.moveCardToDeckSlot(k, i);
              openMovePickerKey = null;
              UI.renderDeck();
            };
            moveRow.appendChild(mb);
          });
          btns.appendChild(moveRow);
        }
      }
      btns.appendChild(actionRow);
      row.appendChild(btns);
      list.appendChild(row);
    });
    $('dot-deck').style.display =
      (G.canAffordAnyDeckWork() && S.page !== 'deck') ? 'block' : 'none';
    UI.renderCollection();
  };

  UI.renderDeckSlots = function () {
    const wrap = $('deck-slots');
    if (!wrap) return;
    wrap.className = 'deck-slots';
    wrap.innerHTML = '';
    G.ensureDeckSlots();
    const active = S.activeDeckSlot || 0;
    const activeSlot = G.ensureDeckSlotExists(active);
    const activeCards = (activeSlot.deck || []).length;
    const activeName = G.deckSlotName(active);
    const head = el('div', 'deck-active-box' + (deckPickerOpen ? ' open' : ''));
    const badge = el('div', 'deck-slot-badge', 'D' + (active + 1));
    const meta = el('button', 'deck-slot-meta deck-rename-btn');
    meta.innerHTML =
      `<div class="deck-slot-name">${activeName}</div>
       <div class="deck-slot-sub">${activeCards} cards · tap to rename</div>`;
    meta.onclick = () => {
      const next = window.prompt('Rename deck', activeName);
      if (next == null) return;
      G.renameDeckSlot(active, next);
      UI.renderDeck();
    };
    const caret = el('button', 'deck-active-caret deck-change-btn', deckPickerOpen ? 'Hide' : 'Change');
    caret.onclick = () => {
      deckPickerOpen = !deckPickerOpen;
      UI.renderDeck();
    };
    head.appendChild(badge);
    head.appendChild(meta);
    head.appendChild(caret);
    wrap.appendChild(head);
    if (!deckPickerOpen) return;
    const list = el('div', 'deck-slot-picker');
    for (let i = 0; i < Math.max(3, G.unlockedDeckSlots()); i++) {
      const unlocked = i < G.unlockedDeckSlots();
      const slot = G.ensureDeckSlotExists(i);
      const row = el('div', 'deck-slot-row' + (unlocked ? '' : ' locked'));
      const cards = (slot.deck || []).length;
      row.innerHTML =
        `<div class="deck-slot-badge">D${i + 1}</div>
         <div class="deck-slot-meta"><div class="deck-slot-name">${G.deckSlotName(i)}</div>
           <div class="deck-slot-sub">${unlocked ? (cards ? cards + ' cards · move cost scales with tier' : 'empty slot') : 'Unlocks at Prayer ' + (i * 10)}</div></div>`;
      const actions = el('div', 'deck-slot-actions');
      const btn = el('button', 'px-btn' + (i === S.activeDeckSlot ? ' acc' : ''), i === S.activeDeckSlot ? 'Using' : 'Use');
      btn.disabled = !unlocked || i === S.activeDeckSlot || !cards;
      btn.onclick = () => {
        G.switchDeckSlot(i);
        deckPickerOpen = false;
        UI.renderDeck();
      };
      actions.appendChild(btn);
      row.appendChild(actions);
      list.appendChild(row);
    }
    wrap.appendChild(list);
  };

  /* Cards set aside via G.purgeCard — owned, just not in the active
     deck right now. G.restoreCard brings one back in, same prayer
     cost as a purge, capped at TUNE.deckCap. */
  UI.renderCollection = function () {
    const sizeEl = $('collection-size');
    const list = $('collection-list');
    if (!list) return;
    const counts = S.collection || {};
    const keys = Object.keys(counts).filter(k => counts[k] > 0);
    const total = keys.reduce((sum, k) => sum + counts[k], 0);
    if (sizeEl) sizeEl.textContent = total;
    const atCap = S.deck.length >= G.TUNE.deckCap;
    const hint = $('restore-hint');
    if (hint) {
      hint.textContent = atCap ? 'deck full (' + G.TUNE.deckCap + ')' : 'cost scales with tier';
    }
    list.innerHTML = '';
    if (!keys.length) {
      list.appendChild(el('div', 'empty',
        'Nothing set aside.<br>Removing a card from your deck sends it here instead of destroying it.'));
      return;
    }
    keys.forEach(k => {
      const c = G.cardDef(k);
      if (!c) return;                     // a card type that no longer exists
      const cost = G.purgeCost(k);
      /* the deck can hold at most TUNE.maxCardCopies of this one key —
         the collection stack itself has no limit, only what's already
         active in the deck blocks adding more */
      const atCardCap = G.cardCountIn(S.deck, k) >= G.TUNE.maxCardCopies;
      const can = S.prayerPoints >= cost && !atCap && !atCardCap;
      const pillCls = 'deck-card-pill' + (c.foil ? ' foil' : '') + (G.finishCount(S.prismatic, G.baseCardKey(k)) ? ' prismatic' : '');
      const row = el('div', 'row');
      row.innerHTML =
        `<span class="${pillCls}">${sp(G.cardSprite(k), 22)}${tierPipsHTML(c.tier)}</span>
         <div class="row-body"><div class="row-nm">${c.name}</div>
           <div class="row-sub">${atCardCap ? G.TUNE.maxCardCopies + ' already in deck' : c.type}</div></div>
         <div class="row-n">${counts[k]}</div>`;
      const b = el('button', 'px-btn spirit', 'Add (' + cost + 'pt)');
      b.disabled = !can;
      b.onclick = () => G.restoreCard(k);
      row.appendChild(b);
      list.appendChild(row);
    });
  };

  /* ---------- market (unlocked at Khar-Barak) ------------------
     Every resource except gold itself is tradeable, priced straight
     off G.RESOURCES[key].worth — sell at worth, buy at worth *
     TUNE.marketBuyMult (see G.sellItem/G.buyItem/G.buyPrice,
     systems/market.js). Flat lists, same row shape the Bag page
     already uses — no categorization yet. */
  UI.renderMarket = function () {
    const goldBox = $('market-gold');
    if (goldBox) {
      goldBox.innerHTML = '<div class="cap-big">' + (S.gold || 0) + '<span> gold</span></div>';
    }
    const sellList = $('market-sell');
    if (sellList) {
      sellList.innerHTML = '';
      const owned = Object.keys(G.RESOURCES).filter(k => k !== 'gold' && S[k] > 0);
      if (!owned.length) {
        sellList.appendChild(el('div', 'empty', 'Nothing to sell yet.'));
      }
      owned.forEach(k => {
        const r = G.RESOURCES[k];
        const qty = Math.min(G.TUNE.marketSellBatch, S[k]);
        const row = el('div', 'row');
        row.innerHTML =
          `${sp(G.resSprite(k), 22)}
           <div class="row-body"><div class="row-nm">${r.name}</div>
             <div class="row-sub">${S[k]} carried · worth ${r.worth} each</div></div>`;
        const b = el('button', 'px-btn acc', 'Sell ' + qty + ' (+' + qty * r.worth + ')');
        b.onclick = () => G.sellItem(k);
        row.appendChild(b);
        sellList.appendChild(row);
      });
    }
    const buyList = $('market-buy');
    if (buyList) {
      buyList.innerHTML = '';
      Object.keys(G.RESOURCES).filter(k => k !== 'gold').forEach(k => {
        const r = G.RESOURCES[k];
        const price = G.buyPrice(k);
        const row = el('div', 'row');
        row.innerHTML =
          `${sp(G.resSprite(k), 22)}
           <div class="row-body"><div class="row-nm">${r.name}</div>
             <div class="row-sub">${S[k] || 0} carried</div></div>`;
        const b = el('button', 'px-btn acc', 'Buy (' + price + ')');
        b.disabled = (S.gold || 0) < price;
        b.onclick = () => G.buyItem(k);
        row.appendChild(b);
        buyList.appendChild(row);
      });
    }
  };

  /* ---------- bag: donate box ---------------------------------
     Check off stacks below, then tap Donate to remove up to
     TUNE.donateBatchSize of each at once — worth fills this bar,
     which grants the current zone +1 xp every time it tops out
     (see G.donateItems, craft.js). */
  UI.renderDonateBox = function () {
    const box = $('donate-box'); if (!box) return;
    box.className = 'donate-box';
    const need = G.TUNE.donateWorthPerXp;
    const pct = Math.min(100, (S.donateProgress / need) * 100);
    const n = donateSelected.size;
    const zone = G.ZONES[S.zone] || {};
    const hasFactions = Array.isArray(zone.factions) && zone.factions.length;
    if (hasFactions) G.ensureFactionState();
    const factionId = hasFactions ? S.selectedFaction : null;
    const faction = factionId && G.FACTIONS ? G.FACTIONS[factionId] : null;
    box.innerHTML =
      `<div class="donate-top">
         <span class="donate-title">${hasFactions ? 'Faction Donations' : 'Donate'}</span>
         <span class="donate-sub">${G.fmtWt(S.donateProgress)} / ${need} worth</span>
       </div>
       <div class="donate-sub">${hasFactions
         ? 'Donate selected stacks to a Riverhold faction. Donations still grant zone xp, and also build faction influence.'
         : 'Check stacks below, worth fills this bar — every fill grants ' + G.ZONES[S.zone].name + ' +1 xp.'}</div>
       <div class="donate-track"><span class="donate-fill" style="width:${pct}%"></span></div>`;
    if (hasFactions) {
      const picker = el('div', 'move-row');
      zone.factions.forEach(id => {
        const def = G.FACTIONS[id];
        const b = el('button', 'px-btn' + (id === factionId ? ' acc' : ''), def.name);
        b.onclick = () => G.setSelectedFaction(id);
        picker.appendChild(b);
      });
      box.appendChild(picker);
      const factionInfo = el('div', 'row-sub');
      factionInfo.style.marginTop = '8px';
      factionInfo.textContent = faction ? faction.desc : '';
      box.appendChild(factionInfo);
      zone.factions.forEach(id => {
        const def = G.FACTIONS[id];
        const inf = G.factionInfluence(id);
        const pct = Math.min(100, (inf % 100));
        const row = el('div', 'row-sub');
        row.style.marginTop = '6px';
        row.innerHTML =
          `<div style="display:flex;justify-content:space-between;gap:8px"><span>${def.name}</span><span>Lv ${G.factionLevel(id)} · ${G.fmtWt(inf)} inf</span></div>
           <div class="donate-track" style="margin-top:4px"><span class="donate-fill" style="width:${pct}%;background:${def.accent || 'var(--accent)'}"></span></div>`;
        box.appendChild(row);
      });
    }
    if (n) {
      const picked = el('div', 'row-sub');
      picked.style.marginTop = '8px';
      picked.textContent = 'Selected: ' + [...donateSelected]
        .map(k => (G.RESOURCES[k] ? G.RESOURCES[k].name : k))
        .join(', ');
      box.appendChild(picked);
    }
    const btnRow = el('div', 'donate-btn-row');
    const btn = el('button', 'px-btn' + (n ? ' acc' : ''),
      n ? (hasFactions && faction ? 'Donate ' + n + ' to ' + faction.name : 'Donate ' + n + ' selected')
        : 'Select stacks below to donate');
    btn.disabled = !n;
    btn.onclick = () => {
      const keys = [...donateSelected];
      donateSelected.clear();
      G.donateItems(keys, factionId);
    };
    btnRow.appendChild(btn);
    box.appendChild(btnRow);
  };

  /* ---------- item detail sheet -------------------------------
     Generic "tap an item to see more" bottom sheet, reused as-is
     for the farm plot's seed picker (Batch C) — same show/hide via
     the .modal/.sheet pattern the villager-return popup already
     established (index.html #modal, css .sheet). */
  UI.hideItemDetail = function () {
    UI._itemMode = null;
    const m = $('item-modal'); if (m) m.classList.remove('show');
  };

  UI.hideFishJournal = function () {
    const m = $('fish-modal'); if (m) m.classList.remove('show');
  };

  UI.showFishJournal = function () {
    const m = $('fish-modal'), body = $('fish-sheet-body');
    if (!m || !body) return;
    const groups = [
      { id: 'pond', label: 'Pond' },
      { id: 'stream', label: 'Stream' },
      { id: 'river', label: 'River' },
      { id: 'lake', label: 'Lake' },
    ];
    const fishDefs = G.FISH || {};
    const total = Object.keys(fishDefs)
      .reduce((n, key) => n + ((S.fishCaught && S.fishCaught[key]) || 0), 0);
    const caughtKinds = Object.keys(fishDefs)
      .filter(key => ((S.fishCaught && S.fishCaught[key]) || 0) > 0).length;
    body.innerHTML =
      `<div class="s-eye">fishing</div>
       <h2>Fish Journal</h2>
       <div class="s-sub">${caughtKinds} of ${Object.keys(fishDefs).length} species caught · ${total} total fish landed</div>`;
    groups.forEach(group => {
      const section = el('div', 'sec');
      section.style.marginTop = '14px';
      section.innerHTML = `<span class="sec-l">${group.label}</span>`;
      body.appendChild(section);
      Object.keys(fishDefs)
        .filter(key => fishDefs[key].water === group.id)
        .forEach(key => {
          const def = fishDefs[key];
          const count = (S.fishCaught && S.fishCaught[key]) || 0;
          const seen = count > 0;
          const row = el('div', 'row');
          row.innerHTML =
            `${sp(G.resSprite(key), 22)}
             <div class="row-body"><div class="row-nm">${seen ? G.RESOURCES[key].name : '???'}</div>
               <div class="row-sub">${seen ? (def.rare ? 'rare catch' : 'common catch') : 'not yet caught'}</div></div>
             <div class="row-n">${seen ? count : '—'}</div>`;
          body.appendChild(row);
        });
    });
    m.classList.add('show');
  };

  UI.showFishingCatch = function (def, got) {
    const m = $('fish-modal'), body = $('fish-sheet-body');
    if (!m || !body) return;
    const fishDefs = G.FISH || {};
    const fishKeys = Object.keys(got || {}).filter(key => fishDefs[key]);
    const extras = Object.keys(got || {}).filter(key => !fishDefs[key]);
    const leadKey = fishKeys.find(key => fishDefs[key] && fishDefs[key].rare) || fishKeys[0] || extras[0];
    const leadRes = leadKey && G.RESOURCES[leadKey];
    const leadFish = leadKey && fishDefs[leadKey];
    const place = (def && def.name) || 'Fishing Spot';
    body.innerHTML =
      `<div class="s-eye">catch</div>
       <h2>${leadRes ? leadRes.name : 'Fishing Haul'}</h2>
       <div class="s-sub">You finished ${place}.</div>`;

    if (leadKey) {
      const hero = el('div', 'catch-hero' + (leadFish && leadFish.rare ? ' rare' : ''));
      hero.innerHTML =
        `<div class="catch-hero-icon">${sp(G.resSprite(leadKey), 48)}</div>
         <div class="catch-hero-copy">
           <div class="catch-hero-name">${leadRes ? leadRes.name : leadKey}</div>
           <div class="catch-hero-sub">${leadFish
             ? (leadFish.rare ? 'rare catch' : 'fresh catch')
             : 'bonus haul'}</div>
         </div>
         <div class="catch-hero-qty">x${got[leadKey] || 1}</div>`;
      body.appendChild(hero);
    }

    if (fishKeys.length) {
      const section = el('div', 'sec');
      section.style.marginTop = '14px';
      section.innerHTML = '<span class="sec-l">Fish Landed</span>';
      body.appendChild(section);
      fishKeys.forEach(key => {
        if (key === leadKey) return;
        const row = el('div', 'row');
        row.innerHTML =
          `${sp(G.resSprite(key), 22)}
           <div class="row-body"><div class="row-nm">${G.RESOURCES[key].name}</div>
             <div class="row-sub">${fishDefs[key] && fishDefs[key].rare ? 'rare catch' : 'caught in the net'}</div></div>
           <div class="row-n">x${got[key]}</div>`;
        body.appendChild(row);
      });
    }

    if (extras.length) {
      const section = el('div', 'sec');
      section.style.marginTop = '14px';
      section.innerHTML = '<span class="sec-l">Extra Haul</span>';
      body.appendChild(section);
      extras.forEach(key => {
        if (key === leadKey) return;
        const row = el('div', 'row');
        row.innerHTML =
          `${sp(G.resSprite(key), 22)}
           <div class="row-body"><div class="row-nm">${G.RESOURCES[key].name}</div>
             <div class="row-sub">pulled up with the catch</div></div>
           <div class="row-n">x${got[key]}</div>`;
        body.appendChild(row);
      });
    }

    const note = el('div', 's-note');
    note.innerHTML = fishKeys.length
      ? 'Every fish landed here is tracked in your <b>Fishing Journal</b>.'
      : 'No fish this pull, but the water still gave up something useful.';
    body.appendChild(note);
    m.classList.add('show');
  };

  UI.showItemDetail = function (key) {
    const m = $('item-modal'), body = $('item-sheet-body');
    if (!m || !body) return;
    const r = G.RESOURCES[key];
    if (!r) return;
    const crop = G.CROPS[key];
    body.innerHTML =
      `<div class="s-eye">item</div>
       <h2>${r.name}</h2>
       <div class="s-sub">${G.fmtWt(r.wt)} wt each · worth ${r.worth}${S[key] ? ' · ' + S[key] + ' carried' : ''}</div>`;
    if (crop) {
      /* Plots have no per-slot distinction, so Plant just takes the
         first empty one rather than making the player pick which —
         one fewer step for a choice that carries no information. */
      G.ensureFarmPlots();
      const zone = G.ZONES[S.zone] || {};
      const region = (G.REGIONS || []).find(r => r.id === crop.region);
      const emptySlots = [];
      for (let i = 0; i < G.farmPlotCount(); i++) if (!S.farmPlots[i]) emptySlots.push(i);
      const inRegion = zone.region === crop.region;
      const note = el('div', 's-note');
      note.innerHTML = 'Grows anywhere in <b>' + (region ? region.name : crop.region) + '</b>.';
      body.appendChild(note);
      const plantBtn = el('button', 'px-btn acc', 'Plant');
      const canPlant = inRegion && emptySlots.length > 0 && G.availableCraftCount(key) > 0;
      plantBtn.disabled = !canPlant;
      if (!inRegion) plantBtn.textContent = 'Only grows in ' + (region ? region.name : crop.region);
      else if (!emptySlots.length) plantBtn.textContent = 'No empty plots';
      plantBtn.onclick = () => {
        if (G.plantSeed(emptySlots[0], key)) {
          UI.hideItemDetail();
          UI.renderAll();
        }
      };
      body.appendChild(plantBtn);
    }
    /* Actions that used to live as buttons on the Bag row's card —
       moved here since the card face stays clean now (see
       UI.renderBag's .inv-card grid). Each closes the sheet and
       re-renders afterward, same as the Plant button above — correct
       since a fully-eaten/dropped/stored stack may no longer exist. */
    /* Food is never eaten from the bag any more — raw food is only an
       ingredient for a Campfire food-card recipe, so the Eat button
       is gone and the note points at cooking instead. */
    if (G.isFoodItem && G.isFoodItem(key)) {
      const note = el('div', 's-note');
      note.innerHTML =
        '<span style="color:var(--ember)">ingredient — cook it into a food card</span>';
      body.appendChild(note);
    }
    const afterAction = () => { UI.hideItemDetail(); UI.renderAll(); };
    const dropBtn = el('button', 'px-btn warn', '-1');
    dropBtn.onclick = () => { G.dropItem(key, 1); afterAction(); };
    body.appendChild(dropBtn);
    const crateBtn = el('button', 'px-btn', 'Crate');
    crateBtn.disabled = !G.storageReady();
    crateBtn.onclick = () => { G.depositToStorage(key, S[key], 'crate'); afterAction(); };
    body.appendChild(crateBtn);
    if (G.zoneHasBank()) {
      const bankBtn = el('button', 'px-btn', 'Bank');
      bankBtn.disabled = !G.storageReady();
      bankBtn.onclick = () => { G.depositToStorage(key, S[key], 'bank'); afterAction(); };
      body.appendChild(bankBtn);
    }
    m.classList.add('show');
  };
  UI.showCampfireSheet = function () {
    const m = $('item-modal'), body = $('item-sheet-body');
    if (!m || !body) return;
    const choices = G.campfireRecipes();
    UI._itemMode = 'campfire';
    if (!choices.length) {
      body.innerHTML = `<div class="s-eye">campfire</div><h2>Campfire</h2><div class="s-sub">Nothing cookable yet.</div>`;
      m.classList.add('show');
      return;
    }
    const ids = choices.map(c => c.id);
    if (ids.indexOf(UI._campfireRecipeId) < 0) UI._campfireRecipeId = choices[0].id;
    const fuels = G.campfireFuelOptions();
    if (!fuels.some(f => f.key === UI._campfireFuelKey)) UI._campfireFuelKey = fuels[0].key;
    const selected = choices.find(c => c.id === UI._campfireRecipeId) || choices[0];
    const fuel = fuels.find(f => f.key === UI._campfireFuelKey) || fuels[0];
    const rawAvailable = G.availableCraftCount(selected.rawKey);
    const fuelAvailable = G.availableCraftCount(fuel.key);
    const batchCount = G.campfireCookCount(selected.id, fuel.key);
    body.innerHTML = `<div class="s-eye">campfire</div><h2>Cook at Campfire</h2>`;
    const recipeBox = el('div', 'campfire-box');
    recipeBox.appendChild(el('label', 'campfire-label', 'Cook'));
    const recipeSelect = document.createElement('select');
    recipeSelect.className = 'campfire-select';
    choices.forEach(choice => {
      const rawCount = G.availableCraftCount(choice.rawKey);
      const cookedCount = G.availableCraftCount(choice.cookedKey);
      const opt = document.createElement('option');
      opt.value = choice.id;
      opt.textContent = choice.rawName + ' (' + rawCount + ') -> ' + choice.cookedName + ' (' + cookedCount + ')';
      recipeSelect.appendChild(opt);
    });
    recipeSelect.value = selected.id;
    recipeSelect.onchange = () => { UI._campfireRecipeId = recipeSelect.value; UI.showCampfireSheet(); };
    recipeBox.appendChild(recipeSelect);
    body.appendChild(recipeBox);
    const fuelBox = el('div', 'campfire-box');
    fuelBox.appendChild(el('label', 'campfire-label', 'Fuel'));
    const fuelSelect = document.createElement('select');
    fuelSelect.className = 'campfire-select';
    fuels.forEach(f => {
      const count = G.availableCraftCount(f.key);
      const opt = document.createElement('option');
      opt.value = f.key;
      opt.textContent = f.label + ' (' + count + ' available · ' + f.detail + ')';
      fuelSelect.appendChild(opt);
    });
    fuelSelect.value = fuel.key;
    fuelSelect.onchange = () => { UI._campfireFuelKey = fuelSelect.value; UI.showCampfireSheet(); };
    fuelBox.appendChild(fuelSelect);
    body.appendChild(fuelBox);
    const note = el('div', 's-note');
    note.innerHTML =
      `<b>${rawAvailable}</b> ${selected.rawName.toLowerCase()} available.<br>` +
      `<b>${fuelAvailable}</b> ${fuel.label.toLowerCase()} available.<br>` +
      (batchCount > 0
        ? `This fuel will cook <b>${batchCount}</b> ${batchCount === 1 ? 'item' : 'items'}${fuel.key === 'wood' ? ' and leave 1 charcoal' : ''}.`
        : 'Need both food and fuel to start cooking.');
    body.appendChild(note);
    const cookBtn = el('button', 'px-btn acc', batchCount > 0 ? 'Cook x' + batchCount : 'Not ready');
    cookBtn.disabled = batchCount < 1 || !!S.campfireJob;
    cookBtn.onclick = () => {
      if (G.startCampfireCook(selected.id, fuel.key)) {
        UI.hideItemDetail();
        UI.renderAll();
      }
    };
    body.appendChild(cookBtn);
    m.classList.add('show');
  };

  UI.farmNeedsAttention = function () {
    G.ensureFarmPlots();
    let hasEmpty = false;
    let needsWater = false;
    for (let i = 0; i < G.farmPlotCount(); i++) {
      const plot = S.farmPlots[i];
      if (!plot) {
        hasEmpty = true;
        continue;
      }
      if (!G.plotReady(plot) && plot.wateredAt == null) needsWater = true;
    }
    if (needsWater) return true;
    if (!hasEmpty) return false;
    return Object.keys(G.CROPS).some(key => {
      const crop = G.CROPS[key];
      return crop.region === S.zone && G.availableCraftCount(key) > 0;
    });
  };

  function storageSectionHtml(title, hint) {
    return `<div class="sec"><span class="sec-l">${title}</span><span class="hint">${hint}</span></div>`;
  }
  function renderStorageList(wrap, store, target) {
    const keys = Object.keys(store).filter(k => store[k] > 0);
    if (!keys.length) {
      wrap.appendChild(el('div', 'empty', 'Nothing stored here yet.'));
      return;
    }
    keys.forEach(k => {
      const row = el('div', 'row');
      row.innerHTML =
        `${sp(G.resSprite(k), 22)}
         <div class="row-body"><div class="row-nm">${G.RESOURCES[k].name}</div>
           <div class="row-sub">weightless in storage</div></div>
         <div class="row-n">${store[k]}</div>`;
      const b = el('button', 'px-btn acc', 'Take');
      b.onclick = () => G.withdrawFromStorage(k, store[k], target);
      row.appendChild(b);
      wrap.appendChild(row);
    });
  }
  UI.renderStorageBox = function () {
    const box = $('storage-box'); if (!box) return;
    box.className = 'cap-info';
    const canStore = G.storageReady();
    const bank = G.zoneHasBank();
    box.innerHTML =
      `<div class="cap-big">Storage<span>${bank ? ' crate + bank' : ' crate'}</span></div>
       <div class="cap-sub">${canStore ? 'One deposit action ready this deck cycle.' : 'Deposit already used this deck cycle — wait for the next reshuffle.'}</div>`;
    const btnRow = el('div', 'move-row');
    const addCrate = el('button', 'px-btn acc', 'Add All to Crate');
    addCrate.disabled = !canStore;
    addCrate.onclick = () => G.depositAllToStorage('crate');
    btnRow.appendChild(addCrate);
    if (bank) {
      const addBank = el('button', 'px-btn acc', 'Add All to Bank');
      addBank.disabled = !canStore;
      addBank.onclick = () => G.depositAllToStorage('bank');
      btnRow.appendChild(addBank);
    }
    box.appendChild(btnRow);
    box.insertAdjacentHTML('beforeend', storageSectionHtml(G.zone().name + ' Crate', 'stays in this zone only'));
    renderStorageList(box, G.currentCrate(), 'crate');
    if (bank) {
      box.insertAdjacentHTML('beforeend', storageSectionHtml('Shared Bank', 'available in trader hubs'));
      renderStorageList(box, G.currentBank(), 'bank');
    }
  };

  UI.showDeathScreen = function (lost) {
    const box = $('deathscreen');
    if (!box) return;
    const keys = Object.keys(lost || {});
    $('death-title').textContent = 'You collapse in ' + G.zoneName();
    $('death-body').innerHTML = keys.length
      ? 'Dropped <b>' + keys.map(k => lost[k] + ' ' + G.RESOURCES[k].name).join(', ') + '</b>.<br>Wounded for the next few cards: tighter timing and no clean-tap bonus.'
      : 'You had nothing loose to lose.<br>Wounded for the next few cards: tighter timing and no clean-tap bonus.';
    box.classList.add('show');
  };
  UI.hideDeathScreen = function () {
    const box = $('deathscreen');
    if (box) box.classList.remove('show');
  };

  /* ---------- bag tab --------------------------------------- */
  UI.renderBag = function () {
    UI.renderDonateBox();
    const capBox = $('cap-info');
    if (capBox) {
      const bonuses = [];
      Object.keys(S.equipped).forEach(sl => {
        const it = G.ITEMS[S.equipped[sl]];
        if (it && it.cap) bonuses.push(it.name + ' +' + it.cap);
      });
      const def = G.defense(), fullSet = G.hasArmorSet();
      const warmth = G.warmth(), highlandSet = G.hasHighlandSet();
      capBox.innerHTML =
        '<div class="cap-big">' + G.fmtWt(S.weight) +
        '<span> / ' + G.carryCap() + ' lb</span></div>' +
        '<div class="cap-sub">base ' + G.TUNE.baseCap +
        (bonuses.length ? '  ·  ' + bonuses.join('  ·  ') : '  ·  no capacity gear') +
        '</div>' +
        '<div class="cap-sub">defense ' + def + '  ·  warmth ' + warmth +
        (fullSet ? '  ·  full scrap set — wider hit window' : '') +
        (highlandSet ? '  ·  full Highland Robes — bonus xp in Leth-Eiren' : '') +
        '</div>' +
        (G.isEncumbered()
          ? '<div class="cap-warn">over-encumbered — half speed, no gathering</div>' : '');
    }
    UI.renderStorageBox();
    const g = $('gear'); g.innerHTML = '';
    let n = 0;
    G.GEAR_SLOTS.forEach(sl => {
      const key = S.equipped[sl.id], it = key ? G.ITEMS[key] : null;
      if (it) n++;
      const box = el('div', 'row');
      box.style.marginBottom = '4px';
      box.innerHTML =
        `${it ? sp(G.resSprite(key), 22) : '<div style="width:22px;height:22px;border:1px dashed var(--line)"></div>'}
         <div class="row-body"><div class="row-nm">${it ? it.name : '—'}</div>
           <div class="row-sub">${sl.label}${it && it.note ? ' · ' + it.note : ''}</div></div>`;
      g.appendChild(box);
    });
    $('gear-n').textContent = n + '/' + G.GEAR_SLOTS.length;

    /* Wardrobe — everything wearable you own. Crafting equips straight
       into a slot and nothing else in the game un-equips, so this is
       the only place to swap. Zone capes land in the same slot as the
       Backpack, which is exactly why this needs to exist. Only slots
       where you actually own a choice are listed. */
    const owned = (S.wardrobe || []).filter(k => G.ITEMS[k]);
    const bySlot = {};
    owned.forEach(k => {
      const sl = G.ITEMS[k].slot;
      (bySlot[sl] = bySlot[sl] || []).push(k);
    });
    const choices = Object.keys(bySlot).filter(sl => bySlot[sl].length > 1);
    if (choices.length) {
      const lbl = el('div', 'row-sub');
      lbl.style.cssText = 'margin:10px 0 5px;font-weight:700;letter-spacing:.06em;text-transform:uppercase';
      lbl.textContent = 'Wardrobe — tap to wear';
      g.appendChild(lbl);
      choices.forEach(sl => bySlot[sl].forEach(k => {
        const it = G.ITEMS[k];
        const worn = S.equipped[sl] === k;
        const box = el('div', 'row');
        box.style.marginBottom = '4px';
        if (worn) box.style.borderColor = 'var(--accent)';
        box.innerHTML =
          `${sp(G.resSprite(k), 22)}
           <div class="row-body"><div class="row-nm">${it.name}</div>
             <div class="row-sub">${it.note || ''}</div></div>
           <div class="row-sub">${worn ? 'worn' : 'wear'}</div>`;
        if (!worn) box.onclick = () => G.wearWardrobe(k);
        g.appendChild(box);
      }));
    }

    const list = $('inv'); list.innerHTML = '';
    const rows = Object.keys(G.RESOURCES).filter(k => S[k] > 0);
    /* drop any selection whose stack ran out (donated to zero, eaten,
       dropped via -1, ...) so a stale checkbox never lingers */
    [...donateSelected].forEach(k => { if (!(S[k] > 0)) donateSelected.delete(k); });
    if (!rows.length) {
      list.appendChild(el('div', 'empty', 'Pack is empty.<br>Play cards to fill it.'));
      $('inv-n').textContent = '';
      UI.renderDonateBox();
      return;
    }
    /* Playing-card grid — big centered art, name below, qty badge in
       the corner. The card's own action buttons (Eat/-1/Crate/Bank)
       moved into UI.showItemDetail's sheet, since the card face stays
       clean; the only other interactive bit is the corner checkbox,
       which still drives Donate's bulk selection directly from the
       grid without opening the sheet. */
    const grid = el('div', 'inv-grid');
    rows.forEach(k => {
      const r = G.RESOURCES[k];
      const checked = donateSelected.has(k);
      const card = el('div', 'inv-card tint-' + (r.tint || 'stone'));
      card.onclick = () => UI.showItemDetail(k);
      const chk = el('div', 'inv-card-select' + (checked ? ' on' : ''));
      chk.onclick = (ev) => {
        ev.stopPropagation();
        if (donateSelected.has(k)) donateSelected.delete(k); else donateSelected.add(k);
        UI.renderBag();
      };
      card.appendChild(chk);
      card.appendChild(el('span', 'inv-card-emb', sp(G.resSprite(k), 40)));
      card.appendChild(el('div', 'inv-card-nm', r.name));
      card.appendChild(el('div', 'inv-card-qty', S[k]));
      grid.appendChild(card);
    });
    list.appendChild(grid);
    $('inv-n').textContent = rows.length + ' stacks';
    UI.renderConsumables();
  };

  /* ---------- bag: consumables ------------------------------
     Highlight which item each card group should spend.        */
  UI.renderConsumables = function () {
    const wrap = $('consumables'); if (!wrap) return;
    wrap.innerHTML = '';
    Object.keys(G.CONSUMABLE_GROUPS).forEach(group => {
      const def = G.CONSUMABLE_GROUPS[group];
      const items = G.groupItems(group);
      const active = G.activeConsumable(group);
      const hd = el('div', 'sec');
      hd.innerHTML = `<span class="sec-l">${def.name}</span>
                      <span class="hint">${def.usedBy}</span>`;
      wrap.appendChild(hd);
      if (!items.some(i => i.have > 0)) {
        wrap.appendChild(el('div', 'empty',
          'No ' + def.name.toLowerCase() + '.<br>Craft them at the Fletching Station.'));
        return;
      }
      items.filter(i => i.have > 0).forEach(i => {
        const chosen = S.selected && S.selected[group] === i.key;
        const inUse = active && active.key === i.key;
        const row = el('div', 'row' + (inUse ? ' selected' : ''));
        row.innerHTML =
          `${sp(G.resSprite(i.key), 20)}
           <div class="row-body"><div class="row-nm">${i.name}</div>
             <div class="row-sub">+${i.dmg} damage${inUse ? ' · in use' : ''}</div></div>
           <div class="row-n">${i.have}</div>`;
        const b = el('button', 'pin-btn' + (chosen ? ' on' : ''), chosen ? 'Locked' : 'Use');
        b.onclick = () => G.selectConsumable(group, i.key);
        row.appendChild(b);
        wrap.appendChild(row);
      });
    });
  };

  /* Full cost line for a RECIPE — the flat `cost` object plus the two
     shapes it can't express: `fuel` points (any burnable) and `anyOf`
     ("N of any ONE of these"). For anyOf it shows whichever key you
     have most of, since that's the one G.anyOfChoice would actually
     spend. */
  const recipeCostHtml = UI.recipeCostHtml = function (r) {
    let html = costHtml(r.cost || {});
    if (r.anyOf) {
      const pick = G.anyOfChoice(r) || r.anyOf.keys.reduce(
        (a, k) => (G.availableCraftCount(k) > G.availableCraftCount(a) ? k : a),
        r.anyOf.keys[0]);
      const have = G.availableCraftCount(pick);
      const res = G.RESOURCES[pick];
      html += `<span class="${have >= r.anyOf.qty ? 'ok' : 'no'}">` +
        G.sprite(G.resSprite(pick), 12) + have + '/' + r.anyOf.qty + ' ' +
        (res ? res.name : pick) + ' <i>(any one kind)</i></span>';
    }
    if (r.fuel) {
      const have = G.fuelAvailable();
      html += `<span class="${have >= r.fuel ? 'ok' : 'no'}">` +
        G.sprite(G.resSprite('charcoal'), 12) + have + '/' + r.fuel + ' fuel</span>';
    }
    return html;
  };

  /* cost line with an emblem per ingredient, green when affordable */
  const costHtml = UI.costHtml = function (cost) {
    return Object.keys(cost).map(k => {
      const r = G.RESOURCES[k];
      const have = G.availableCraftCount ? G.availableCraftCount(k) : (S[k] || 0), need = cost[k];
      return `<span class="${have >= need ? 'ok' : 'no'}">` +
             G.sprite(G.resSprite(k), 12) + have + '/' + need + ' ' +
             (r ? r.name : k) + '</span>';
    }).join('');
  };

  /* ---------- craft: every workshop inline, one page ---------
     Each known station renders as its own card — build line,
     machine summary, or recipe list — stacked together so
     nothing navigates away to a separate page.
     Recipes stay hidden until every ingredient has been seen. */

  /* how many recipes at a station are known and affordable */
  function stationStatus(st) {
    if (!S.built[st.id]) {
      /* Even once the station's own build cost is known, don't
         dangle it in front of the player if nothing inside it is
         craftable yet either — a bench full of mystery recipes isn't
         a real goal. alwaysShown (the starting Bench) skips this so
         there's still a signpost from a totally fresh save. */
      const hasKnownRecipe = st.recipes.some(r => G.costKnown(r.cost));
      return { known: !!st.alwaysShown || (G.costKnown(st.buildCost) && hasKnownRecipe),
               ready: G.canAffordCraft(st.buildCost), label: 'not built' };
    }
    let known = 0, ready = 0;
    st.recipes.forEach(r => {
      if (!G.costKnown(r.cost)) return;
      known++;
      const done = (S.made[r.id] || 0) > 0 && !r.repeatable;
      if (!done && G.canStartRecipe(r, r.id)) ready++;
    });
    return { known: known > 0, ready: ready > 0, label: known + ' recipes', count: ready };
  }

  function stationPage(st) {
    return st.page || 'craft';
  }

  function ensureCampfireSelection(choices) {
    choices = choices || G.campfireRecipes();
    if (!choices.length) return { selected: null, fuel: null, fuels: [] };
    const ids = choices.map(c => c.id);
    if (ids.indexOf(UI._campfireRecipeId) < 0) UI._campfireRecipeId = choices[0].id;
    const fuels = G.campfireFuelOptions();
    if (!fuels.length) return { selected: choices[0], fuel: null, fuels: [] };
    if (!fuels.some(f => f.key === UI._campfireFuelKey)) UI._campfireFuelKey = fuels[0].key;
    return {
      selected: choices.find(c => c.id === UI._campfireRecipeId) || choices[0],
      fuel: fuels.find(f => f.key === UI._campfireFuelKey) || fuels[0],
      fuels,
    };
  }

  function renderCampfireStation(body) {
    const choices = G.campfireRecipes();
    const running = S.campfireJob;
    const picked = ensureCampfireSelection(choices);
    const selected = picked.selected;
    const fuel = picked.fuel;
    const line = el('div', 'recipe');
    const rBody = el('div', 'r-body');
    let title = 'Choose your campfire setup';
    let info = 'Choose a food in Menu, pick a fuel, then use Cook here to repeat that setup.';
    let sub = 'Stick cooks 1, wood cooks 4 and leaves 1 charcoal, charcoal cooks 8.';
    if (running) {
      const meta = choices.find(r => r.id === running.recipeId);
      title = 'Fire is lit';
      info = (meta ? meta.cookedName : 'Cooking') + ' x' + running.count + ' over the fire';
      sub = 'Current fuel: ' + (((G.campfireFuelOptions().find(f => f.key === running.fuelKey) || {}).label) || running.fuelKey);
    } else if (selected && fuel) {
      const rawAvailable = G.availableCraftCount(selected.rawKey);
      const cookedAvailable = G.availableCraftCount(selected.cookedKey);
      const fuelAvailable = G.availableCraftCount(fuel.key);
      const batchCount = G.campfireCookCount(selected.id, fuel.key);
      title = 'Cook ' + selected.cookedName;
      info = selected.rawName + ': ' + rawAvailable + ' · ' + selected.cookedName + ': ' + cookedAvailable;
      sub = fuel.label + ': ' + fuelAvailable + ' available · next cook x' + batchCount +
        (fuel.key === 'wood' && batchCount > 0 ? ' + 1 charcoal' : '');
    }
    rBody.innerHTML =
      `<div class="r-nm">${title}</div>
       <div class="r-eff">${info}</div>
       <div class="r-cost">${sub}</div>`;
    line.appendChild(rBody);
    if (running) {
      const track = el('div', 'r-progress');
      const fill = el('div', 'r-progress-fill');
      track.appendChild(fill);
      line.appendChild(track);
      const elapsed = Date.now() - running.startedAt;
      fill.style.animation = 'none';
      void fill.offsetWidth;
      fill.style.animation = 'craftFill ' + running.ms + 'ms linear ' + (-elapsed) + 'ms 1 both';
    }
    const col = el('div', 'btn-col');
    const menu = el('button', 'px-btn', 'Menu');
    menu.disabled = !choices.length;
    menu.onclick = () => UI.showCampfireSheet();
    col.appendChild(menu);
    const batchCount = selected && fuel ? G.campfireCookCount(selected.id, fuel.key) : 0;
    const cook = el('button', 'px-btn acc',
      running ? 'Cooking…' : batchCount > 0 ? 'Cook x' + batchCount : 'Cook');
    cook.disabled = running || !selected || !fuel || batchCount < 1;
    cook.onclick = () => {
      if (selected && fuel && G.startCampfireCook(selected.id, fuel.key)) UI.renderAll();
    };
    col.appendChild(cook);
    line.appendChild(col);
    body.appendChild(line);
  }

  function renderStationsInto(wrapId, pageName, emptyHtml) {
    const wrap = $(wrapId); if (!wrap) return;
    wrap.innerHTML = '';
    G.STATIONS.forEach(st => {
      if (stationPage(st) !== pageName) return;
      if (!G.inZone(st)) return;              // not available in this zone
      const built = S.built[st.id];
      const stat = stationStatus(st);
      /* hide stations whose materials you have never seen */
      if (!built && !stat.known) return;

      const card = el('div', 'station' + (stat.ready ? ' ready' : ''));
      const head = el('div', 'stcard' + (built ? ' clickable' : ''));
      const lvTag = built && st.upgrades ? 'Lv' + G.stationLevel(st.id) + ' · ' : '';
      head.innerHTML =
        `${sp(stationSprite(st.id), 26)}
         <div class="stcard-b">
           <div class="stcard-n">${st.name}</div>
           <div class="stcard-s">${st.sub}</div>
         </div>
         <div class="stcard-tag">${built ? lvTag + (stat.count ? stat.count + ' ready' : 'built') : 'build'}</div>`;
      /* Built stations open a small menu on tap — Level Up (if a
         tier is available) and Hire/Dismiss Villager (if this
         station has a villagerRecipe flagged, see G.stationHireable,
         township.js). Unbuilt stations just show the build row below,
         nothing to click yet. */
      if (built) {
        head.onclick = () => {
          openStationMenu = openStationMenu === st.id ? null : st.id;
          UI.renderCraft();
        };
      }
      card.appendChild(head);

      const body = el('div', 'recipes');
      card.appendChild(body);

      if (built && openStationMenu === st.id) {
        const menu = el('div', 'station-menu');
        const next = st.upgrades ? G.stationNextUpgrade(st.id) : null;
        if (next) {
          const ok = G.canAffordCraft(next.cost);
          const rBody = el('div', 'r-body');
          rBody.innerHTML =
            `<div class="r-nm">Upgrade to Lv${G.stationLevel(st.id) + 1}</div>
             <div class="r-cost">${costHtml(next.cost)}</div>
             <div class="r-eff">tap-crafting here gets faster</div>`;
          const line = el('div', 'recipe upgrade');
          line.appendChild(rBody);
          const b = el('button', 'px-btn spirit', 'Upgrade');
          b.disabled = !ok;
          b.onclick = () => { G.upgradeStation(st.id); UI.renderCraft(); };
          line.appendChild(b);
          menu.appendChild(line);
        }
        if (G.stationHireable(st.id)) {
          const hired = G.isStationHired(st.id);
          const r = G.stationVillagerRecipe(st.id);
          const free = G.slotsFree();
          const stalled = hired && G.villagerStalled(st.id);
          const rBody = el('div', 'r-body');
          rBody.innerHTML = hired
            ? `<div class="r-nm">Villager hired${stalled ? ' — stalled' : ''}</div>
               <div class="r-eff">auto-crafts ${r.name} into this zone's crate</div>`
            : `<div class="r-nm">Hire Villager</div>
               <div class="r-cost">${costHtml(st.villagerHireCost)}</div>
               <div class="r-eff">auto-crafts ${r.name} into this zone's crate — ${free}/${G.villagerSlots()} slots free</div>`;
          const line = el('div', 'recipe' + (stalled ? ' stalled' : ''));
          line.appendChild(rBody);
          /* Same .r-progress/.r-progress-fill bar the player's own
             tap-craft row uses, except a villager has no single job
             to finish — it cycles forever on G.villagerInterval, so
             the bar loops instead of running once. Synced the same
             way as the tap-craft/campfire bars: a negative animation
             delay drops it onto the true elapsed point in its
             current cycle (elapsed mod period), so re-rendering
             mid-cycle (or resuming after being away) never restarts
             it from zero. A stalled villager gets a static empty bar
             — no animation — since it isn't actually progressing. */
          if (hired && !stalled) {
            const track = el('div', 'r-progress');
            const fill = el('div', 'r-progress-fill');
            track.appendChild(fill);
            line.appendChild(track);
            const period = G.villagerInterval(st.id);
            const last = (S.villagerLast && S.villagerLast[S.zone + ':' + st.id]) || Date.now();
            const elapsed = (Date.now() - last) % period;
            fill.style.animation = 'none';
            void fill.offsetWidth;
            fill.style.animation = 'craftFill ' + period + 'ms linear ' + (-elapsed) + 'ms infinite both';
          }
          const b = el('button', 'px-btn' + (hired ? ' warn' : ' acc'), hired ? 'Dismiss' : 'Hire');
          if (!hired) b.disabled = !G.canAffordCraft(st.villagerHireCost) || free <= 0;
          b.onclick = () => { (hired ? G.dismissVillagerAt(st.id) : G.hireVillagerAt(st.id)); UI.renderCraft(); };
          line.appendChild(b);
          menu.appendChild(line);
        }
        if (!menu.children.length) {
          menu.appendChild(el('div', 'empty', 'Nothing to do here yet.'));
        }
        body.appendChild(menu);
      }

      /* The Campfire used to get a bespoke "pick a food, pick a fuel,
         cook a batch" panel (renderCampfireStation). Its recipes are
         ordinary tap-craft card recipes now — they just carry `fuel`
         and `anyOf` costs — so it renders like every other station.
         renderCampfireStation and the G.campfireRecipes/
         startCampfireCook helpers are dead code as a result. */

      if (!built) {
        const ok = G.canAffordCraft(st.buildCost);
        const line = el('div', 'recipe');
        line.innerHTML =
          `<div class="r-body"><div class="r-nm">Build this station</div>
             <div class="r-cost">${costHtml(st.buildCost)}</div></div>`;
        const col = el('div', 'btn-col');
        const pin = el('button', 'pin-btn' + (G.isPinned('station', st.id) ? ' on' : ''), 'Pin');
        pin.onclick = () => G.togglePin({ type: 'station', id: st.id });
        const b = el('button', 'px-btn acc', 'Build');
        b.disabled = !ok;
        b.onclick = () => G.buildStation(st.id);
        col.appendChild(pin); col.appendChild(b);
        line.appendChild(col);
        body.appendChild(line);
      } else {
        let shown = 0;
        st.recipes.forEach(r => {
          if (!G.inZone(r)) return;                 // wrong zone
          if (!G.costKnown(r.cost)) return;         // undiscovered stays hidden
          shown++;
          const made = S.made[r.id] || 0;
          const done = made > 0 && !r.repeatable;
          const ok = G.canStartRecipe(r, r.id);
          /* For a card-granting recipe (a tool/weapon), badge shows how
             many copies are in the deck RIGHT NOW, including zero —
             durability removes broken copies from the deck, so lifetime
             "made" drifts from what you actually still need to
             re-craft. Non-deck recipes (String, Backpack, ...) keep the
             lifetime craft count, hidden until you've made at least one,
             same as before. */
          let badge = '';
          if (r.repeatable) {
            if (r.grantsCard) badge = '  x' + (G.deckCounts()[r.grantsCard] || 0);
            else if (made) badge = '  x' + made;
          }
          /* Tap-to-craft: tapping the button spends the cost right away
             and starts a short job (S.craftJobs[r.id]); the row's bottom
             edge fills like a progress bar until it lands (see
             G.startCraftJob, craft.js — same treatment as the zone xp
             bar on the header pill, .hdr-zone-xp). Re-tap once it's
             done to run it again. */
          const running = !!S.craftJobs[r.id];
          const rBody = el('div', 'r-body');
          rBody.innerHTML =
            `<div class="r-nm">${r.name}${badge}</div>
             <div class="r-cost">${done ? '' : recipeCostHtml(r)}</div>
             <div class="r-eff">${r.effect}</div>`;
          const line = el('div', 'recipe');
          line.appendChild(rBody);
          let fill = null;
          if (running) {
            const track = el('div', 'r-progress');
            fill = el('div', 'r-progress-fill');
            track.appendChild(fill);
            line.appendChild(track);
          }
          const col = el('div', 'btn-col');
          if (!done) {
            const pin = el('button', 'pin-btn' + (G.isPinned('recipe', r.id) ? ' on' : ''), 'Pin');
            pin.onclick = () => G.togglePin({ type: 'recipe', id: r.id });
            col.appendChild(pin);
          }
          const b = el('button', 'px-btn' + (r.prayer ? ' spirit' : ' acc'),
            done ? 'Made' : running ? 'Crafting…' : r.prayer ? 'Bury' : 'Craft');
          b.disabled = done || running || !ok;
          b.onclick = () => G.startCraftJob(r.id);
          col.appendChild(b);
          line.appendChild(col);
          body.appendChild(line);

          if (fill) {
            /* Time-synced animation rather than a restarted width
               transition: if the craft page re-renders mid-job, a
               negative delay drops the bar right back onto the true
               elapsed point and it keeps filling smoothly. */
            const job = S.craftJobs[r.id];
            const elapsed = Date.now() - job.startedAt;
            fill.style.animation = 'none';
            void fill.offsetWidth;
            fill.style.animation = 'craftFill ' + job.ms + 'ms linear ' + (-elapsed) + 'ms 1 both';
          }
        });
        if (!shown) {
          body.appendChild(el('div', 'empty',
            'No known recipes here yet.<br>Recipes appear once you have seen their materials.'));
        }
      }

      wrap.appendChild(card);
    });
    if (!wrap.children.length) {
      wrap.appendChild(el('div', 'empty',
        emptyHtml));
    }
  }

  UI.renderCraft = function () {
    renderStationsInto('stations', 'craft', 'Nothing to build yet.<br>Gather stone and sticks first.');
    UI.craftBadge();
    UI.updateSaveInfo();
  };

  UI.craftBadge = function () {
    let any = false;
    const free = G.slotsFree();
    G.STATIONS.forEach(st => {
      /* Only stations that actually render on the Craft page count
         toward its dot — the Campfire (page 'farm') and the Bone
         Altar (page 'deck') live elsewhere, and lighting up the
         Craft tab for them sends you to a page they aren't on. */
      if (stationPage(st) !== 'craft') return;
      if (!G.inZone(st)) return;
      if (!S.built[st.id]) {
        if (G.costKnown(st.buildCost) && G.canAfford(st.buildCost)) any = true;
        return;
      }
      if (G.stationHireable(st.id) && !G.isStationHired(st.id) &&
        free > 0 && G.canAfford(st.villagerHireCost)) any = true;
      st.recipes.forEach(r => {
        if (!G.inZone(r)) return;
        if (!G.costKnown(r.cost)) return;
        const done = (S.made[r.id] || 0) > 0 && !r.repeatable;
        if (!done && G.canAfford(r.cost)) any = true;
      });
    });
    $('dot-craft').style.display = any ? 'block' : 'none';
  };

  /* ---------- home: regions and travel ---------------------- */
  UI.renderHome = function () {
    UI.renderSeason();
    const wrap = $('world'); wrap.innerHTML = '';
    G.REGIONS.forEach(reg => {
      const zones = G.regionZones(reg.id);
      if (!zones.length) return;
      const hd = el('div', 'sec');
      hd.innerHTML = `<span class="sec-l">${reg.name}</span>
                      <span class="hint">${reg.sub}</span>`;
      wrap.appendChild(hd);
      zones.forEach(z => {
        const here = z.id === S.zone;
        const blocker = G.zoneBlocker(z.id);
        const pref = G.preferredDeckForZone(z.id);
        const pickerOpen = openZoneDeckPicker === z.id;
        const card = el('div', 'zone' + (here ? ' here' : '') + (blocker ? ' locked' : ''));
        const zx = S.zoneXp[z.id];
        const top = el('div', 'zone-top');
        const name = el('span', 'zone-n',
          z.name + (zx ? ' <span class="zone-lv">Lv ' + zx.lv + '</span>' : ''));
        const topRight = el('span', 'zone-top-right');
        const deckBadge = el('button', 'zone-deck-badge' + (pickerOpen ? ' open' : ''),
          pref != null ? 'D' + (pref + 1) : 'D?');
        deckBadge.title = 'Preferred deck';
        deckBadge.onclick = () => {
          openZoneDeckPicker = openZoneDeckPicker === z.id ? null : z.id;
          UI.renderHome();
        };
        const kind = el('span', 'zone-k', here ? 'you are here' : z.kind);
        topRight.appendChild(deckBadge);
        topRight.appendChild(kind);
        top.appendChild(name);
        top.appendChild(topRight);
        card.appendChild(top);
        card.appendChild(el('div', 'zone-b', z.blurb));
        card.appendChild(el('div', 'zone-lock',
          pref != null ? 'preferred deck — D' + (pref + 1) : 'preferred deck — none'));
        if (blocker) card.appendChild(el('div', 'zone-lock', 'locked — ' + blocker));
        if (pickerOpen) {
          const unlocked = G.unlockedDeckSlots();
          const prefRow = el('div', 'move-row zone-deck-picker');
          for (let i = 0; i < unlocked; i++) {
            const b = el('button', 'px-btn' + (pref === i ? ' acc' : ''), pref === i ? 'D' + (i + 1) + ' default' : 'Use D' + (i + 1));
            b.onclick = () => {
              G.setPreferredDeckForZone(z.id, i);
              openZoneDeckPicker = null;
              UI.renderHome();
            };
            prefRow.appendChild(b);
          }
          const clearBtn = el('button', 'px-btn', 'Clear');
          clearBtn.onclick = () => {
            G.setPreferredDeckForZone(z.id, null);
            openZoneDeckPicker = null;
            UI.renderHome();
          };
          prefRow.appendChild(clearBtn);
          card.appendChild(prefRow);
        }
        if (!here && !blocker) {
          const b = el('button', 'px-btn acc', 'Travel');
          b.onclick = () => { G.travel(z.id); UI.go('play'); };
          card.appendChild(b);
        }
        wrap.appendChild(card);
      });
    });
  };

  /* ---------- township -------------------------------------- */
  UI.renderTownship = function () {
    const wrap = $('township'); if (!wrap) return;
    wrap.innerHTML = '';
    $('town-slots').textContent = G.hiredCount(S.zone) + '/' + G.villagerSlots(S.zone) + ' hired';

    /* --- settlement: this zone starts with its own free villager
       slots, and each home here unlocks 3 more for this zone. --- */
    const houses = G.zoneHousing();
    if (houses.length) {
      const n = G.homes(), max = G.TUNE.maxHomes;
      const head = el('div', 'settle');
      head.innerHTML =
        `<div class="st-row"><span class="st-l">Settlement</span>
           <span class="st-v">${n}/${max} homes</span></div>
         <div class="st-note">${n < max ? '3 free villager slots here, then each home unlocks 3 more'
           : 'settlement complete'}</div>`;
      wrap.appendChild(head);

      houses.forEach(h => {
        const full = n >= max;
        const ok = G.canAffordCraft(h.cost) && !full;
        const row = el('div', 'row');
        row.innerHTML =
          `${sp('pack', 22)}
           <div class="row-body"><div class="row-nm">${h.name}</div>
             <div class="row-sub">${full ? 'settlement full' : '+3 villager slots'}</div>
             ${full ? '' : '<div class="r-cost" style="margin-top:4px">' +
               costHtml(h.cost) + '</div>'}
             <div class="r-eff">${h.note}</div></div>`;
        const b = el('button', 'px-btn acc', 'Build');
        b.disabled = !ok;
        b.onclick = () => G.buildHome(h.id);
        row.appendChild(b);
        wrap.appendChild(row);
      });
      wrap.appendChild(el('div', 'sec', '<span class="sec-l">Villagers</span>'));
    }
    /* Villagers are hired AT a station now (tap the station on the
       Craft page — Level Up / Hire Villager), not from here. This
       just lists who's currently working in this zone. */
    const hired = G.hiredStationsIn(S.zone);
    if (!hired.length) {
      wrap.appendChild(el('div', 'empty',
        'No villagers hired here yet.<br>Tap a built station on the Craft page to hire one.'));
    } else {
      hired.forEach(stationId => {
        const st = G.findStation(stationId);
        const r = G.stationVillagerRecipe(stationId);
        if (!st || !r) return;
        const stalled = G.villagerStalled(stationId, S.zone);
        const secs = (G.villagerInterval(stationId) / 1000).toFixed(1).replace(/\.0$/, '');
        const row = el('div', 'row' + (stalled ? ' stalled' : ''));
        row.innerHTML =
          `${sp(stationSprite(stationId), 22)}
           <div class="row-body"><div class="row-nm">${st.name}</div>
             <div class="row-sub">${r.name} every ${secs}s, into this zone's crate</div>
             ${stalled ? '<div class="row-sub" style="color:var(--bad)">stalled — crate needs:</div>' +
               '<div class="r-cost" style="margin-top:4px">' + costHtml(r.cost) + '</div>' : ''}
           </div>`;
        const b = el('button', 'px-btn warn', 'Dismiss');
        b.onclick = () => { G.dismissVillagerAt(stationId); UI.renderTownship(); };
        row.appendChild(b);
        wrap.appendChild(row);
      });
    }
    UI.townBadge();
  };

  /* ---------- farm plots (Farm tab) --------------------------
     Tap a growing/empty plot to water it or (long-press) plant it;
     tap a mature plot to harvest. Real growth is resolved lazily in
     G.collectFarmWork (systems/farm.js) — called here on every render
     too, so opening the page after being away shows the true state
     immediately, not just once the ticker's next 5s poll lands. */

  /* Minimal time-based long-press helper. Cancels on early release or
     any real pointer movement. */
  UI.onHold = function (el2, ms, fn) {
    let timer = null, sx = 0, sy = 0;
    const cancel = () => { if (timer) { clearTimeout(timer); timer = null; } };
    el2.addEventListener('pointerdown', ev => {
      sx = ev.clientX; sy = ev.clientY;
      cancel();
      timer = setTimeout(() => { timer = null; fn(); }, ms);
    });
    el2.addEventListener('pointermove', ev => {
      if (timer && Math.hypot(ev.clientX - sx, ev.clientY - sy) > 10) cancel();
    });
    el2.addEventListener('pointerup', cancel);
    el2.addEventListener('pointercancel', cancel);
    el2.addEventListener('pointerleave', cancel);
  };

  UI.showSeedPicker = function (i) {
    const m = $('item-modal'), body = $('item-sheet-body');
    if (!m || !body) return;
    const zone = G.ZONES[S.zone] || {};
    const region = (G.REGIONS || []).find(r => r.id === zone.region);
    body.innerHTML = `<div class="s-eye">plant</div><h2>Choose a seed</h2>`;
    const choices = Object.keys(G.CROPS)
      .filter(k => G.CROPS[k].region === zone.region && G.canPlantSeed(k));
    if (!choices.length) {
      body.appendChild(el('div', 's-sub', 'No plantable seeds in inventory, crate, or bank for ' + (region ? region.name : 'this region') + '.'));
    }
    choices.forEach(k => {
      const crop = G.CROPS[k];
      const carried = S[k] || 0;
      const total = G.availablePlantSeedCount(k);
      const row = el('div', 'row');
      row.innerHTML =
        `${sp(G.resSprite(k), 22)}
         <div class="row-body"><div class="row-nm">${crop.name}</div>
           <div class="row-sub">${total} available (${carried} carried) · ${crop.stages} waterings to mature · ${region ? region.name : crop.region}</div></div>`;
      row.onclick = () => {
        if (G.plantSeed(i, k)) { UI.hideItemDetail(); UI.renderAll(); }
      };
      body.appendChild(row);
    });
    m.classList.add('show');
  };

  UI.renderFarm = function () {
    const wrap = $('farm'); if (!wrap) return;
    G.ensureFarmPlots();
    G.collectFarmWork();
    $('farm-slots').textContent = G.farmPlotCount() + ' plot' + (G.farmPlotCount() === 1 ? '' : 's');
    wrap.innerHTML = '';
    const grid = el('div', 'farm-grid');
    const pendingGrowth = [];   // growth animations, started once the grid is live
    for (let i = 0; i < G.farmPlotCount(); i++) {
      const plot = S.farmPlots[i];
      const cell = el('div', 'farm-plot');
      if (!plot) {
        cell.appendChild(el('span', 'dot empty'));
        cell.appendChild(el('div', 'farm-plot-hint', 'tap to<br>plant'));
        cell.onclick = () => UI.showSeedPicker(i);
        grid.appendChild(cell);
        continue;
      }
      const crop = G.CROPS[plot.seedKey];
      const ready = G.plotReady(plot);
      const growing = plot.wateredAt != null;
      cell.classList.add(ready ? 'ready' : growing ? 'growing' : 'needs-water');

      /* Built as real (namespaced) SVG nodes with a direct reference
         to `fill`, not innerHTML+querySelector — SVG elements created
         via plain createElement/innerHTML don't render in a real
         browser (need the SVG namespace), and querySelector on a
         freshly-innerHTML'd node is also unreliable in the test
         harness (see the r-progress/donate-box fix earlier). Same
         elapsed/remain "set now, force reflow, transition to target"
         technique as .r-progress-fill (UI.renderCraft), stroke-
         dashoffset instead of width. */
      const R = 10, C = 2 * Math.PI * R;
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('class', 'farm-ring');
      svg.setAttribute('viewBox', '0 0 26 26');
      const track = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      track.setAttribute('class', 'track');
      track.setAttribute('cx', '13'); track.setAttribute('cy', '13'); track.setAttribute('r', R);
      const fill = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      fill.setAttribute('class', 'fill');
      fill.setAttribute('cx', '13'); fill.setAttribute('cy', '13'); fill.setAttribute('r', R);
      fill.setAttribute('stroke-dasharray', C);
      svg.appendChild(track); svg.appendChild(fill);
      cell.appendChild(svg);
      /* small status pip — needs-water/ready only here; growing
         already has the ring as its own indicator. The empty case
         gets the same dot treatment right above, in the !plot
         branch, so all three non-growing states (empty, needs-water,
         ready) carry a notification pip — only growing doesn't. */
      if (!growing) {
        cell.appendChild(el('span', 'dot ' + (ready ? 'ready' : 'needs-water')));
      }
      cell.appendChild(el('span', null, sp(G.resSprite(plot.seedKey), 24)));
      cell.appendChild(el('div', 'farm-plot-name', crop.name));

      const elapsed = growing ? Date.now() - plot.wateredAt : 0;
      const remain = growing ? Math.max(0, plot.stageMs - elapsed) : 0;
      cell.appendChild(el('div', 'farm-plot-hint',
        ready ? 'tap to harvest' : growing ? fmtRemain(remain) + ' left' : 'tap to water'));

      if (ready) {
        fill.style.transition = 'none';
        fill.style.strokeDashoffset = '0';
      } else if (growing) {
        const frac = Math.min(1, elapsed / plot.stageMs);
        /* An explicit bar along the bottom edge, on top of the corner
           ring — the ring reads as a state at a glance, the bar (plus
           the countdown above) answers "how much longer". */
        const barTrack = el('div', 'farm-progress');
        const barFill = el('div', 'farm-progress-fill');
        barTrack.appendChild(barFill);
        cell.appendChild(barTrack);
        /* Both the ring and the bar start at the TRUE elapsed point
           and transition over only the REMAINING time, so a re-render
           mid-growth resumes instead of restarting. The from-state has
           to be applied after the grid is in the document, though —
           forcing a reflow on a detached node does nothing, and the
           browser would just see the end state and never animate.
           Hence the deferred pass after wrap.appendChild(grid). */
        pendingGrowth.push({ ring: fill, bar: barFill, frac, remain, C });
      } else {
        fill.style.strokeDashoffset = String(C);   // needs-water: empty ring
      }
      /* Watering splash — a one-shot CSS ripple. The flag is checked
         at render (not applied on the live node at click time) because
         watering re-renders the whole grid, which would throw away a
         class set on the old element. */
      if (justWatered.i === i && Date.now() - justWatered.at < 700) {
        cell.classList.add('watering');
      }
      cell.onclick = () => {
        if (ready) G.harvestPlot(i);
        else if (!growing) G.waterPlot(i);
      };
      grid.appendChild(cell);
    }
    /* Buying another plot: doubling cost, capped at TUNE.farmPlotsMax
       (G.nextFarmPlotCost returns null once there). Rendered as one
       more tile in the same grid, same "empty slot" visual register
       as an unplanted plot, so it reads as the next slot rather than
       a separate control bolted on below. */
    const nextCost = G.nextFarmPlotCost();
    if (nextCost) {
      const buildCell = el('div', 'farm-plot farm-plot-build');
      const afford = G.canAffordCraft(nextCost);
      buildCell.innerHTML =
        `<div class="farm-plot-hint">+ new plot</div>
         <div class="farm-plot-cost">${costHtml(nextCost)}</div>`;
      if (!afford) buildCell.classList.add('disabled');
      buildCell.onclick = () => { if (G.buildFarmPlot()) UI.renderFarm(); };
      grid.appendChild(buildCell);
    }
    wrap.appendChild(grid);
    /* Now that the cells are actually in the document, set each growth
       animation's start point, force one real reflow, and let it run
       out the remaining time. */
    pendingGrowth.forEach(g => {
      g.ring.style.transition = 'none';
      g.ring.style.strokeDashoffset = String(g.C * (1 - g.frac));
      g.bar.style.transition = 'none';
      g.bar.style.width = (g.frac * 100) + '%';
      void g.bar.offsetWidth;                       // one reflow, both elements
      g.ring.style.transition = 'stroke-dashoffset ' + g.remain + 'ms linear';
      g.ring.style.strokeDashoffset = '0';
      g.bar.style.transition = 'width ' + g.remain + 'ms linear';
      g.bar.style.width = '100%';
    });
    renderStationsInto('farm-stations', 'farm', 'No cooking stations available here yet.');
  };

  UI.townBadge = function () {
    const houseable = G.zoneHousing().some(h => G.homes() < G.TUNE.maxHomes && G.canAffordCraft(h.cost));
    const dot = $('dot-town');
    if (dot) dot.style.display = houseable ? 'block' : 'none';
  };

  UI.updateSaveInfo = function () {
    const n = $('save-info');
    if (!n) return;
    if (!G.storageOK) {
      n.innerHTML = 'Save unavailable in this preview.<br>Open the file locally to persist.';
      return;
    }
    const ago = Math.max(0, Math.round((Date.now() - S.lastSeen) / 1000));
    n.innerHTML = 'Autosaves during play, on actions, and when leaving the tab.<br>Last save ' + ago + 's ago.';
  };

  /* A landed hit on an enemy or a location — quick full-screen punch. */
  UI.shakeScreen = function () {
    const app = document.getElementById('app');
    if (!app) return;
    app.classList.remove('shake'); void app.offsetWidth; app.classList.add('shake');
  };

  /* ---------- overlays -------------------------------------- */
  /* Disabled for now — the bottom toast sits right over the tap
     timing band and made the reflex window frustrating to read
     mid-play. Call sites are untouched; re-enable by restoring the
     body below once this has a better home on screen. */
  UI.toast = function (msg, eye) {
    return;
    // eslint-disable-next-line no-unreachable
    $('t-eye').textContent = eye || 'Note';
    $('t-msg').textContent = msg;
    const t = $('toast'); t.classList.remove('go'); void t.offsetWidth; t.classList.add('go');
  };
  UI.banner = function (eye, main, sub, cls) {
    $('b-eye').textContent = eye;
    $('b-main').textContent = main;
    $('b-sub').textContent = sub || '';
    const b = $('banner');
    b.className = 'banner ' + (cls || '');
    void b.offsetWidth; b.classList.add('go');
  };

  /* Confetti burst from just above center, gravity pulls it back
     down. Runs on a plain canvas — no library, short-lived, and
     stops instantly if the popup is dismissed early. */
  const CONFETTI_COLORS = ['#c98a3c', '#4a8a5c', '#c25a4e', '#7a68a6', '#3f7d52', '#d4a03c'];
  function burstConfetti(canvas) {
    const ctx = canvas.getContext('2d');
    const w = canvas.width, h = canvas.height;
    const n = 70;
    const parts = [];
    for (let i = 0; i < n; i++) {
      const ang = Math.random() * Math.PI * 2;
      const speed = 3 + Math.random() * 6;
      parts.push({
        x: w / 2, y: h * 0.34,
        vx: Math.cos(ang) * speed * (0.4 + Math.random() * 0.6),
        vy: Math.sin(ang) * speed - 5 - Math.random() * 3,
        size: 4 + Math.random() * 5,
        rot: Math.random() * Math.PI,
        vrot: (Math.random() - 0.5) * 0.5,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      });
    }
    const start = performance.now();
    const duration = 650;
    canvas.dataset.active = '1';
    (function frame(now) {
      if (canvas.dataset.active !== '1') { ctx.clearRect(0, 0, w, h); return; }
      const t = now - start;
      ctx.clearRect(0, 0, w, h);
      const alpha = Math.max(0, 1 - t / duration);
      parts.forEach(p => {
        p.vy += 0.18;
        p.x += p.vx; p.y += p.vy; p.rot += p.vrot;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 3, p.size, p.size * 0.66);
        ctx.restore();
      });
      if (t < duration) requestAnimationFrame(frame);
      else { canvas.dataset.active = '0'; ctx.clearRect(0, 0, w, h); }
    })(start);
  }

  /* ---------- level-up popup --------------------------------- */
  UI.levelUp = function ({ lv, perk, name }) {
    const box = $('lvlup');
    if (!box) return;
    $('lvlup-skill').textContent = name;
    $('lvlup-lv').textContent = 'Level ' + lv;
    $('lvlup-perk').textContent = perk || '';
    box.classList.add('show');
    /* The card tap that just triggered this level-up is still "in
       flight" — the browser's own click event for that same gesture
       fires right after, landing on this overlay (it now covers the
       tap point) and would dismiss it instantly. Record when we
       opened so the close handler (main.js) can ignore any click
       that lands within the same gesture. */
    UI._lvlupOpenedAt = performance.now();
    const canvas = $('lvlup-canvas');
    const app = document.getElementById('app');
    if (canvas && app) {
      canvas.width = app.clientWidth;
      canvas.height = app.clientHeight;
      const reduce = window.matchMedia &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (!reduce) burstConfetti(canvas);
    }
    clearTimeout(UI._lvlupTimer);
    UI._lvlupTimer = setTimeout(UI.closeLevelUp, 2200);
  };
  UI.closeLevelUp = function () {
    const box = $('lvlup');
    if (!box) return;
    box.classList.remove('show');
    const canvas = $('lvlup-canvas');
    if (canvas) canvas.dataset.active = '0';
    clearTimeout(UI._lvlupTimer);
  };

  /* ---------- zone level-up: loot wheel ----------------------
     Three reels spin independently, each landing on a weighted
     pick from the zone's own lootPool (see G.spinZoneLoot). All
     three matching pays out; the reels themselves are just a
     vertical strip of icons dragged up by CSS transition so the
     final icon parks in the window — no animation library.      */
  const REEL_ICON = 56;
  UI.zoneLevelUp = function ({ zone, lv, name, spin }) {
    if (!spin) return;
    const box = $('zonewheel');
    if (!box) return;
    $('zw-zone').textContent = name;
    $('zw-lv').textContent = 'Level ' + lv;
    const resultEl = $('zw-result');
    resultEl.textContent = 'spinning…';
    resultEl.className = 'zw-result';

    const pool = (G.ZONES[zone] || {}).lootPool || [];
    const durations = [0.45, 0.625, 0.8];
    [0, 1, 2].forEach(i => {
      const strip = $('zw-strip-' + i);
      if (!strip) return;
      strip.style.transition = 'none';
      strip.style.transform = 'translateY(0)';
      const loops = 12 + i * 4;
      let html = '';
      for (let j = 0; j < loops; j++) {
        const k = pool[Math.floor(Math.random() * pool.length)] || spin.reels[i];
        html += `<div class="zw-icon">${sp(G.resSprite(k), 30)}</div>`;
      }
      html += `<div class="zw-icon">${sp(G.resSprite(spin.reels[i]), 30)}</div>`;
      strip.innerHTML = html;
      void strip.offsetWidth;
      const offset = loops * REEL_ICON;
      requestAnimationFrame(() => {
        strip.style.transition = 'transform ' + durations[i] + 's cubic-bezier(.13,.79,.24,1)';
        strip.style.transform = 'translateY(-' + offset + 'px)';
      });
    });

    box.classList.add('show');
    /* Same guard as UI.levelUp — the tap that triggered this is still
       in flight and its click would otherwise dismiss the wheel the
       instant it appears. */
    UI._zwOpenedAt = performance.now();
    const settleMs = Math.max(...durations) * 1000 + 75;
    clearTimeout(UI._zwResultTimer);
    UI._zwResultTimer = setTimeout(() => {
      const rw = spin.reward;
      if (!rw) { resultEl.textContent = 'No match this time'; return; }
      resultEl.classList.add('win');
      if (rw.kind === 'res' || rw.kind === 'gem') {
        resultEl.textContent = '★ +' + rw.qty + ' ' + G.RESOURCES[rw.key].name;
        if (rw.kind === 'gem') resultEl.classList.add('rare');
        UI.flyToBag([{ key: rw.key, qty: rw.qty }], $('zw-reels'));
      } else if (rw.kind === 'foil') {
        resultEl.classList.add('rare');
        resultEl.textContent = '✦ Foil ' + rw.name + ' — one copy upgraded';
      } else if (rw.kind === 'prismatic') {
        resultEl.classList.add('ultra');
        resultEl.textContent = '✸ PRISMATIC ' + rw.name + ' — one of a kind';
      } else if (rw.kind === 'cape') {
        resultEl.classList.add('ultra');
        resultEl.textContent = '✦ ' + rw.name +
          (rw.worn ? ' — equipped' : ' — added to your wardrobe');
      }
    }, settleMs);
    clearTimeout(UI._zwCloseTimer);
    UI._zwCloseTimer = setTimeout(UI.closeZoneWheel, settleMs + 2400);
  };
  UI.closeZoneWheel = function () {
    const box = $('zonewheel');
    if (!box) return;
    box.classList.remove('show');
    clearTimeout(UI._zwResultTimer);
    clearTimeout(UI._zwCloseTimer);
  };

  /* ---------- tabs ------------------------------------------ */
  UI.go = function (page) {
    S.page = page;
    document.querySelectorAll('.nav button').forEach(b =>
      b.classList.toggle('active', b.dataset.page === page));
    document.querySelectorAll('.page').forEach(p =>
      p.classList.toggle('active', p.id === 'page-' + page));
    /* deck and bag live in the header rather than the nav, so they
       carry their own active state */
    const deckBtn = $('deck-btn'), bagBtn = $('bag-btn'), marketBtn = $('market-btn');
    if (deckBtn) deckBtn.classList.toggle('active', page === 'deck');
    if (bagBtn) bagBtn.classList.toggle('active', page === 'bag');
    if (marketBtn) marketBtn.classList.toggle('active', page === 'market');
    UI.renderAll();
  };

  /* ---------- full refresh ---------------------------------- */
  UI.renderAll = function () {
    UI.renderVitals(); UI.renderStatus(); UI.renderLocationField(); UI.renderPips();
    UI.renderPinBar();
    UI.renderStreak();
    UI.renderRecentXp();
    if (S.page === 'home') UI.renderHome();
    if (S.page === 'skills') UI.renderSkills();
    if (S.page === 'deck') UI.renderDeck();
    if (S.page === 'bag') UI.renderBag();
    if (S.page === 'craft') UI.renderCraft();
    if (S.page === 'town') UI.renderTownship();
    if (S.page === 'farm') UI.renderFarm();
    if (S.page === 'market') {
      if (G.zoneHasMarket && !G.zoneHasMarket()) S.page = 'home';
      else UI.renderMarket();
    }
    /* badges need craft/town/deck state even when off-tab */
    if (S.page !== 'craft') UI.craftBadge();
    if (S.page !== 'town') UI.townBadge();
    if (S.page !== 'deck') {
      $('dot-deck').style.display = G.canAffordAnyDeckWork() ? 'block' : 'none';
    }
    /* Market is only usable while the current zone is a city. */
    const marketBtn = $('market-btn');
    if (marketBtn) marketBtn.style.display = (G.zoneHasMarket && G.zoneHasMarket()) ? 'flex' : 'none';
    const farmBtn = document.querySelector('.nav button[data-page="farm"]');
    if (farmBtn) farmBtn.classList.toggle('attn', UI.farmNeedsAttention());
  };
})(window.Game = window.Game || {});
