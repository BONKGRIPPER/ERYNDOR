/* =========================================================
   tools/editor.js — the content editor's own logic.
   Not part of the game; never loaded by index.html.

   How it works:
   - This page loads data.js + sprites.js + custom-content.js +
     custom-sprites.js exactly like the game does, so window.Game
     is the live, currently-effective state (base game plus
     whatever you've already saved through this editor).
   - Editing a field mutates window.Game directly — you're editing
     the real in-memory objects the game itself uses.
   - Separately, it re-fetches and evaluates data.js + sprites.js
     alone, in a sandboxed object, to get a clean "base" snapshot
     with none of your customizations. That's ONLY used to figure
     out what you've changed.
   - Save diffs live vs. base and writes just the differences to
     custom-content.js / custom-sprites.js — your originals are
     never touched.
   ========================================================= */
(function () {
  'use strict';
  const G = window.Game;
  const $ = id => document.getElementById(id);
  let BASE = null;             // { CARDS, RESOURCES, ... } snapshot with no customizations
  let BASE_SPRITES = null;     // { SPRITES, ALIAS } snapshot with no customizations

  /* ---------- tiny DOM helpers ---------------------------- */
  function el(tag, cls, text) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function deepEqual(a, b) { return JSON.stringify(a) === JSON.stringify(b); }
  function clone(x) { return x === undefined ? undefined : JSON.parse(JSON.stringify(x)); }

  /* ---------- option sources ------------------------------- */
  const optionSources = {
    resources: () => Object.keys(G.RESOURCES).sort(),
    skills: () => Object.keys(G.SKILLS).sort(),
    zones: () => Object.keys(G.ZONES).sort(),
    items: () => Object.keys(G.ITEMS).sort(),
    gearSlots: () => G.GEAR_SLOTS.map(s => s.id),
    emblems: () => Object.keys(G.SPRITES).sort(),
    cardKinds: () => ['gather', 'forage', 'melee', 'ranged', 'mine', 'axe', 'event'],
    locationRequires: () => ['mine', 'axe', 'combat', 'melee', 'ranged'],
    statusEffects: () => Object.keys(G.STATUS_EFFECTS).sort(),
    locations: () => Object.keys(G.LOCATIONS).sort(),
    cards: () => Object.keys(G.CARDS).sort(),
    consumableGroups: () => Object.keys(G.CONSUMABLE_GROUPS).sort(),
  };
  function optionsFrom(name) { return (optionSources[name] || (() => []))(); }
  function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(reader.error || new Error('Could not read file.'));
      reader.readAsDataURL(file);
    });
  }

  /* ---------- generic field rendering ---------------------- */
  function renderFields(container, fields, obj, onChange) {
    container.innerHTML = '';
    fields.forEach(f => container.appendChild(renderField(f, obj, onChange)));
  }

  function renderField(f, obj, onChange) {
    if (f.type === 'costmap') return subListField(f.label, f.hint, costMapEditor(obj, f.key, onChange, !!f.optional, f.optionsKind));
    if (f.type === 'droptable') return subListField(f.label, f.hint, dropTableEditor(obj, f.key, onChange));
    if (f.type === 'pool') return subListField(f.label, f.hint, poolEditor(obj, f.key, onChange, f.optionsKind));
    if (f.type === 'perks') return subListField(f.label, f.hint, perksEditor(obj, f.key, onChange));
    if (f.type === 'recipes') return subListField(f.label, f.hint, recipesEditor(obj, f.key, onChange));
    if (f.type === 'upgrades') return subListField(f.label, f.hint, upgradesEditor(obj, f.key, onChange));
    if (f.type === 'multiselect') return multiselectField(f, obj, onChange);
    if (f.type === 'checkbox') return checkboxField(f, obj, onChange);

    const wrap = el('div', 'field');
    const label = el('label', null, f.label);
    if (f.hint) label.appendChild(el('span', 'hint', f.hint));
    wrap.appendChild(label);

    const val = obj[f.key];
    let input;
    if (f.type === 'select') {
      input = document.createElement('select');
      const opts = f.options || optionsFrom(f.optionsFrom);
      if (f.optional) input.appendChild(new Option('— none —', ''));
      opts.forEach(o => input.appendChild(new Option(o, o)));
      input.value = val || '';
      input.onchange = () => {
        if (!input.value && f.optional) delete obj[f.key]; else obj[f.key] = input.value;
        onChange();
      };
    } else if (f.type === 'number') {
      input = document.createElement('input');
      input.type = 'number';
      if (f.step != null) input.step = f.step;
      input.value = val == null ? '' : val;
      input.oninput = () => {
        if (input.value === '') { delete obj[f.key]; onChange(); return; }
        const n = parseFloat(input.value);
        if (!isNaN(n)) { obj[f.key] = n; onChange(); }
      };
    } else if (f.type === 'textarea') {
      input = document.createElement('textarea');
      input.value = val == null ? '' : val;
      input.oninput = () => { obj[f.key] = input.value; onChange(); };
    } else if (f.type === 'color') {
      input = document.createElement('input');
      input.type = 'color';
      input.value = val || '#888888';
      input.oninput = () => { obj[f.key] = input.value; onChange(); };
    } else {
      input = document.createElement('input');
      input.type = 'text';
      input.value = val == null ? '' : val;
      input.oninput = () => { obj[f.key] = input.value; onChange(); };
    }
    wrap.appendChild(input);
    return wrap;
  }

  function checkboxField(f, obj, onChange) {
    const wrap = el('div', 'checkline');
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.checked = !!obj[f.key];
    input.onchange = () => {
      if (input.checked) obj[f.key] = true; else delete obj[f.key];
      onChange();
    };
    const label = el('label', null, f.label);
    label.style.margin = '0';
    wrap.appendChild(input); wrap.appendChild(label);
    return wrap;
  }

  function multiselectField(f, obj, onChange) {
    const wrap = el('div', 'field');
    wrap.appendChild(el('label', null, f.label));
    const chips = el('div', 'chips');
    const opts = f.options || optionsFrom(f.optionsFrom);
    let arr = Array.isArray(obj[f.key]) ? obj[f.key].slice() : [];
    opts.forEach(o => {
      const chip = el('div', 'chip' + (arr.indexOf(o) >= 0 ? ' on' : ''), o);
      chip.onclick = () => {
        const i = arr.indexOf(o);
        if (i >= 0) arr.splice(i, 1); else arr.push(o);
        chip.classList.toggle('on');
        if (arr.length) obj[f.key] = arr.slice(); else delete obj[f.key];
        onChange();
      };
      chips.appendChild(chip);
    });
    wrap.appendChild(chips);
    if (f.hint) wrap.appendChild(el('div', 'hint', f.hint));
    return wrap;
  }

  function subListField(label, hint, bodyEl) {
    const wrap = el('div', 'field');
    wrap.appendChild(el('label', null, label));
    if (hint) wrap.appendChild(el('div', 'hint', hint));
    wrap.appendChild(bodyEl);
    return wrap;
  }

  /* resource -> qty map, used for buildCost / cost / gives (or any
     keyed count map — pass optionsKind to point it at a different
     option source, e.g. 'locations' for one of a zone's locationDecks
     slots). */
  function costMapEditor(obj, key, onChange, optional, optionsKind) {
    const box = el('div', 'sublist');
    const kind = optionsKind || 'resources';
    function currentMap() { return obj[key] || {}; }
    function redraw() {
      box.innerHTML = '';
      const map = currentMap();
      Object.keys(map).forEach(rk => {
        const row = el('div', 'subrow');
        const sel = document.createElement('select'); sel.className = 'grow';
        optionsFrom(kind).forEach(r => sel.appendChild(new Option(r, r)));
        sel.value = rk;
        const qty = document.createElement('input'); qty.type = 'number'; qty.style.width = '72px';
        qty.value = map[rk];
        const rm = el('button', 'rm', '×');
        sel.onchange = () => {
          if (sel.value === rk || !sel.value) return;
          const next = Object.assign({}, map);
          const v = next[rk]; delete next[rk]; next[sel.value] = v;
          obj[key] = next; onChange(); redraw();
        };
        qty.oninput = () => {
          const next = Object.assign({}, currentMap());
          next[rk] = parseFloat(qty.value) || 0;
          obj[key] = next; onChange();
        };
        rm.onclick = () => {
          const next = Object.assign({}, currentMap()); delete next[rk];
          if (Object.keys(next).length || !optional) obj[key] = next; else delete obj[key];
          onChange(); redraw();
        };
        row.appendChild(sel); row.appendChild(qty); row.appendChild(rm);
        box.appendChild(row);
      });
      const add = el('button', 'sub-add', '+ add resource');
      add.onclick = () => {
        const all = optionsFrom(kind);
        const next = Object.assign({}, currentMap());
        const first = all.find(r => !(r in next)) || all[0];
        if (!first) return;
        next[first] = 1;
        obj[key] = next; onChange(); redraw();
      };
      box.appendChild(add);
    }
    redraw();
    return box;
  }

  /* enemy drop table: [{key,min,max,chance}] internally, collapsed
     to a bare string on save when min=max=1 and there is no chance */
  function dropTableEditor(obj, key, onChange) {
    const box = el('div', 'sublist');
    function normalized() {
      return (obj[key] || []).map(e => typeof e === 'string'
        ? { key: e, min: 1, max: 1 }
        : { key: e.key, min: e.min || 1, max: e.max || (e.min || 1), chance: e.chance });
    }
    function commit(rows) {
      obj[key] = rows.map(r => {
        const out = { key: r.key };
        if (r.min !== 1 || r.max !== 1) { out.min = r.min; out.max = r.max; }
        if (r.chance != null && r.chance !== '') out.chance = r.chance;
        return out;
      });
      onChange();
    }
    function redraw() {
      box.innerHTML = '';
      const rows = normalized();
      rows.forEach((r, i) => {
        const row = el('div', 'subrow');
        const sel = document.createElement('select'); sel.className = 'grow';
        optionsFrom('resources').forEach(k => sel.appendChild(new Option(k, k)));
        sel.value = r.key;
        const min = document.createElement('input'); min.type = 'number'; min.style.width = '52px';
        min.title = 'min'; min.value = r.min;
        const max = document.createElement('input'); max.type = 'number'; max.style.width = '52px';
        max.title = 'max'; max.value = r.max;
        const chance = document.createElement('input'); chance.type = 'number'; chance.style.width = '60px';
        chance.step = '0.05'; chance.title = 'chance 0-1, blank = always';
        chance.value = r.chance == null ? '' : r.chance;
        const rm = el('button', 'rm', '×');
        sel.onchange = () => { rows[i].key = sel.value; commit(rows); };
        min.oninput = () => { rows[i].min = parseFloat(min.value) || 1; commit(rows); };
        max.oninput = () => { rows[i].max = parseFloat(max.value) || rows[i].min; commit(rows); };
        chance.oninput = () => {
          rows[i].chance = chance.value === '' ? undefined : parseFloat(chance.value);
          commit(rows);
        };
        rm.onclick = () => { rows.splice(i, 1); commit(rows); redraw(); };
        row.appendChild(sel); row.appendChild(min); row.appendChild(max); row.appendChild(chance); row.appendChild(rm);
        box.appendChild(row);
      });
      const add = el('button', 'sub-add', '+ add drop');
      add.onclick = () => {
        const first = optionsFrom('resources')[0];
        rows.push({ key: first, min: 1, max: 1 });
        commit(rows); redraw();
      };
      box.appendChild(add);
    }
    redraw();
    return box;
  }

  /* station upgrade tiers: [{cost:{...}, speedMult}]. Tier 0 is level
     2, tier 1 is level 3, etc. — see G.stationSpeedMult, craft.js.
     speedMult is the ABSOLUTE multiplier on TUNE.tapCraftMs at that
     level, not compounded per tier. */
  function upgradesEditor(obj, key, onChange) {
    const box = el('div', 'sublist');
    function redraw() {
      box.innerHTML = '';
      const tiers = obj[key] || (obj[key] = []);
      tiers.forEach((tier, i) => {
        if (!tier.cost) tier.cost = {};
        const tierBox = el('div', 'sublist');
        const head = el('div', 'subrow');
        head.appendChild(el('div', 'hint', 'Level ' + (i + 2)));
        const mult = document.createElement('input');
        mult.type = 'number'; mult.step = '0.05'; mult.style.width = '72px';
        mult.title = 'speed multiplier on TUNE.tapCraftMs (0.65 = 35% faster)';
        mult.value = tier.speedMult == null ? 1 : tier.speedMult;
        mult.oninput = () => { tier.speedMult = parseFloat(mult.value) || 1; onChange(); };
        const rm = el('button', 'rm', '×');
        rm.onclick = () => { tiers.splice(i, 1); onChange(); redraw(); };
        head.appendChild(mult); head.appendChild(rm);
        tierBox.appendChild(head);
        tierBox.appendChild(costMapEditor(tier, 'cost', onChange, false));
        box.appendChild(tierBox);
      });
      const add = el('button', 'sub-add', '+ add upgrade tier');
      add.onclick = () => {
        tiers.push({ cost: {}, speedMult: 0.8 });
        onChange(); redraw();
      };
      box.appendChild(add);
    }
    redraw();
    return box;
  }

  /* weighted pool: a flat array of keys, e.g. a zone's loot wheel —
     repeats are meaningful (they raise that entry's odds), so this
     is a plain reorderless list, not a deduplicated map like cost. */
  function poolEditor(obj, key, onChange, optionsKind) {
    const box = el('div', 'sublist');
    const kind = optionsKind || 'resources';
    function redraw() {
      box.innerHTML = '';
      const arr = obj[key] || (obj[key] = []);
      arr.forEach((val, i) => {
        const row = el('div', 'subrow');
        const sel = document.createElement('select'); sel.className = 'grow';
        optionsFrom(kind).forEach(o => sel.appendChild(new Option(o, o)));
        sel.value = val;
        sel.onchange = () => { arr[i] = sel.value; onChange(); };
        const rm = el('button', 'rm', '×');
        rm.onclick = () => { arr.splice(i, 1); onChange(); redraw(); };
        row.appendChild(sel); row.appendChild(rm);
        box.appendChild(row);
      });
      const add = el('button', 'sub-add', '+ add entry (repeat one to weight it higher)');
      add.onclick = () => {
        const first = optionsFrom(kind)[0];
        if (!first) return;
        arr.push(first);
        onChange(); redraw();
      };
      box.appendChild(add);
    }
    redraw();
    return box;
  }

  /* skill perks: level -> text, stored as an object keyed by level */
  function perksEditor(obj, key, onChange) {
    const box = el('div', 'sublist');
    function rowsFromMap() {
      const map = obj[key] || {};
      return Object.keys(map).map(lv => ({ lv: parseInt(lv, 10), text: map[lv] }))
        .sort((a, b) => a.lv - b.lv);
    }
    function commit(rows) {
      const map = {};
      rows.forEach(r => { if (r.lv) map[r.lv] = r.text || ''; });
      obj[key] = map; onChange();
    }
    function redraw() {
      box.innerHTML = '';
      const rows = rowsFromMap();
      rows.forEach((r, i) => {
        const row = el('div', 'subrow');
        const lv = document.createElement('input'); lv.type = 'number'; lv.style.width = '56px';
        lv.title = 'level'; lv.value = r.lv;
        const text = document.createElement('input'); text.type = 'text'; text.className = 'grow';
        text.placeholder = 'perk description'; text.value = r.text;
        const rm = el('button', 'rm', '×');
        lv.oninput = () => { rows[i].lv = parseInt(lv.value, 10) || 0; commit(rows); };
        text.oninput = () => { rows[i].text = text.value; commit(rows); };
        rm.onclick = () => { rows.splice(i, 1); commit(rows); redraw(); };
        row.appendChild(lv); row.appendChild(text); row.appendChild(rm);
        box.appendChild(row);
      });
      const add = el('button', 'sub-add', '+ add perk');
      add.onclick = () => { rows.push({ lv: 1, text: '' }); commit(rows); redraw(); };
      box.appendChild(add);
    }
    redraw();
    return box;
  }

  /* station recipes: a real sub-form per recipe, collapsible */
  const RECIPE_FIELDS = [
    { key: 'name', label: 'Name', type: 'text' },
    { key: 'cost', label: 'Cost', type: 'costmap' },
    { key: 'repeatable', label: 'Repeatable', type: 'checkbox' },
    { key: 'gives', label: 'Gives (extra resources on craft)', type: 'costmap', optional: true },
    { key: 'equips', label: 'Equips item', type: 'select', optionsFrom: 'items', optional: true,
      hint: 'Set this to make the recipe craft an equippable item instead of giving resources.' },
    { key: 'grantsCard', label: 'Grants card', type: 'select', optionsFrom: 'cards', optional: true,
      hint: 'Set this to make the recipe add a card to the deck (weapons/tools work this way now — ' +
        'the card needs its own atk/durability set on the Cards tab). Uses stack if crafted again.' },
    { key: 'skill', label: 'Skill', type: 'select', optionsFrom: 'skills', optional: true },
    { key: 'xp', label: 'XP granted', type: 'number' },
    { key: 'effect', label: 'Effect text (shown in the craft list)', type: 'text' },
    { key: 'zones', label: 'Only in these zones (blank = everywhere)', type: 'multiselect', optionsFrom: 'zones' },
  ];
  function recipesEditor(obj, key, onChange) {
    const box = el('div');
    function redraw() {
      box.innerHTML = '';
      const list = obj[key] || (obj[key] = []);
      list.forEach((r, i) => {
        const entry = el('div', 'entry');
        const hd = el('div', 'entry-hd');
        const idSpan = el('span', 'entry-key', r.id || '(no id)');
        const nameSpan = el('span', 'entry-name', r.name || '(untitled recipe)');
        hd.appendChild(idSpan); hd.appendChild(nameSpan);
        const body = el('div', 'entry-body'); body.style.display = 'none';
        hd.onclick = () => { body.style.display = body.style.display === 'none' ? '' : 'none'; };
        const idField = el('div', 'field');
        idField.appendChild(el('label', null, 'Recipe id (unique, no spaces)'));
        const idInput = document.createElement('input'); idInput.type = 'text'; idInput.value = r.id || '';
        idInput.oninput = () => { r.id = idInput.value.trim(); idSpan.textContent = r.id || '(no id)'; onChange(); };
        idField.appendChild(idInput);
        body.appendChild(idField);
        renderFields(el2Append(body), RECIPE_FIELDS, r, () => {
          nameSpan.textContent = r.name || '(untitled recipe)'; onChange();
        });
        const actions = el('div', 'entry-actions');
        const del = el('button', 'btn warn small', 'Delete recipe');
        del.onclick = () => { list.splice(i, 1); onChange(); redraw(); };
        actions.appendChild(del);
        entry.appendChild(hd); entry.appendChild(body); entry.appendChild(actions);
        box.appendChild(entry);
      });
      const add = el('button', 'btn', '+ Add recipe');
      add.style.marginTop = '6px';
      add.onclick = () => {
        list.push({ id: '', name: '', cost: {}, effect: '' });
        onChange(); redraw();
      };
      box.appendChild(add);
    }
    redraw();
    return box;
    function el2Append(parent) {
      const holder = el('div'); parent.appendChild(holder); return holder;
    }
  }

  /* ---------- generic keyed-collection CRUD (cards/resources/items/locations/skills) */
  function renderKeyedCollection(container, opts) {
    container.innerHTML = '';
    container.appendChild(el('h2', null, opts.title));
    if (opts.lede) container.appendChild(el('p', 'lede', opts.lede));

    const ids = Object.keys(opts.collection).sort();
    if (!ids.length) container.appendChild(el('div', 'empty', 'Nothing here yet — add one below.'));
    ids.forEach(id => container.appendChild(renderEntry(id)));

    const addRow = el('div', 'add-row');
    const addBtn = el('button', 'btn acc', '+ Add ' + opts.singular);
    addBtn.onclick = () => {
      const raw = prompt('New ' + opts.singular + ' id (short, lowercase, no spaces — e.g. "silverOre"):');
      if (raw == null) return;
      const key = raw.trim();
      if (!key || /\s/.test(key)) { alert('Enter a short id with no spaces.'); return; }
      if (opts.collection[key]) { alert('"' + key + '" already exists.'); return; }
      opts.collection[key] = opts.newDefaults(key);
      markDirty();
      renderKeyedCollection(container, opts);
    };
    addRow.appendChild(addBtn);
    container.appendChild(addRow);

    function renderEntry(id) {
      const entry = opts.collection[id];
      const wrap = el('div', 'entry');
      if (!BASE || !(id in (opts.baseCollection || {}))) wrap.classList.add('new');
      const hd = el('div', 'entry-hd');
      hd.appendChild(el('span', 'entry-key', id));
      const nameSpan = el('span', 'entry-name', opts.labelFor ? opts.labelFor(entry, id) : (entry.name || id));
      hd.appendChild(nameSpan);
      const tagSpan = opts.tagFor ? el('span', 'entry-tag', opts.tagFor(entry, id)) : null;
      if (tagSpan) hd.appendChild(tagSpan);
      const body = el('div', 'entry-body'); body.style.display = 'none';
      hd.onclick = () => { body.style.display = body.style.display === 'none' ? '' : 'none'; };
      renderFields(body, opts.fields, entry, () => {
        markDirty();
        nameSpan.textContent = opts.labelFor ? opts.labelFor(entry, id) : (entry.name || id);
        if (tagSpan) tagSpan.textContent = opts.tagFor(entry, id);
      });
      const actions = el('div', 'entry-actions');
      const del = el('button', 'btn warn small', 'Delete');
      del.onclick = () => {
        if (!confirm('Delete "' + id + '"? This takes effect once you Save.')) return;
        delete opts.collection[id];
        markDirty();
        renderKeyedCollection(container, opts);
      };
      actions.appendChild(del);
      wrap.appendChild(hd); wrap.appendChild(body); wrap.appendChild(actions);
      return wrap;
    }
  }

  /* ---------- tabs ------------------------------------------ */
  const TABS = [
    { id: 'cards', label: 'Cards', render: renderCardsTab },
    { id: 'resources', label: 'Resources', render: renderResourcesTab },
    { id: 'items', label: 'Equipment', render: renderItemsTab },
    { id: 'locations', label: 'Locations', render: renderLocationsTab },
    { id: 'crops', label: 'Farming', render: renderCropsTab },
    { id: 'zones', label: 'Zones', render: renderZonesTab },
    { id: 'stations', label: 'Crafting', render: renderStationsTab },
    { id: 'consumables', label: 'Consumables', render: renderConsumablesTab },
    { id: 'skills', label: 'Skills', render: renderSkillsTab },
    { id: 'tune', label: 'Balance / Tuning', render: renderTuneTab },
    { id: 'emblems', label: 'Emblems', render: renderEmblemsTab },
    { id: 'assets', label: 'Media / Assets', render: renderAssetsTab },
  ];
  let activeTab = 'cards';

  function renderTabs() {
    const bar = $('tabs');
    bar.innerHTML = '';
    TABS.forEach(t => {
      const b = el('button', 'tab' + (t.id === activeTab ? ' active' : ''), t.label);
      b.onclick = () => { activeTab = t.id; renderTabs(); renderActive(); };
      bar.appendChild(b);
    });
  }
  function renderActive() {
    const content = $('content');
    const tab = TABS.find(t => t.id === activeTab);
    tab.render(content);
  }

  /* ---------- Cards tab --------------------------------------- */
  const CARD_FIELDS = [
    { key: 'name', label: 'Name', type: 'text' },
    { key: 'kind', label: 'Kind', type: 'select', optionsFrom: 'cardKinds',
      hint: 'A brand-new kind of behavior needs real code — pick one of these existing ones.' },
    { key: 'type', label: 'Type label (shown as the card category)', type: 'text' },
    { key: 'skill', label: 'Skill', type: 'select', optionsFrom: 'skills' },
    { key: 'res', label: 'Resource (gather cards only)', type: 'select', optionsFrom: 'resources', optional: true },
    { key: 'atk', label: 'Attack / power (melee, ranged, mine, axe cards)', type: 'number', optional: true },
    { key: 'durability', label: 'Durability (uses before it breaks — combat/tool cards granted by a recipe)', type: 'number', optional: true },
    { key: 'status', label: 'Status effect (event cards only)', type: 'select', optionsFrom: 'statusEffects', optional: true,
      hint: 'Which G.STATUS_EFFECTS entry this event card applies. Add new effects on the Balance/Tuning-adjacent ' +
        'status table — ask for a Status Effects tab if you want to edit that from here too.' },
    { key: 'xp', label: 'XP granted', type: 'number' },
    { key: 'tint', label: 'Color tint (matches other cards, e.g. stone / wood / blood / plant)', type: 'text' },
  ];
  function renderCardsTab(container) {
    renderKeyedCollection(container, {
      title: 'Cards', singular: 'card',
      lede: 'These are the cards that can appear in your hand. To make a brand-new card actually ' +
        'show up in play, also give it a starting-deck count below, or set a Crafting recipe\'s ' +
        '"Grants card" field to it (see the Crafting tab) so crafting that recipe adds the card.',
      collection: G.CARDS, baseCollection: BASE && BASE.CARDS,
      fields: CARD_FIELDS,
      labelFor: c => c.name || '(untitled)', tagFor: c => c.kind || '',
      newDefaults: () => ({ kind: 'gather', name: 'New Card', type: 'Gathering', skill: optionsFrom('skills')[0], xp: 5, tint: 'stone' }),
    });

    container.appendChild(el('h2', null, 'Starting deck counts'));
    container.appendChild(el('p', 'lede',
      'How many of each card go in a fresh deck (used by any zone that does not define its own deck). ' +
      'Set a card to 0 to remove it here without deleting the card itself.'));
    const deckBox = el('div', 'sublist');
    function redrawDeck() {
      deckBox.innerHTML = '';
      const keys = Object.keys(G.CARDS).sort();
      keys.forEach(k => {
        const row = el('div', 'subrow');
        row.appendChild(el('span', 'grow', k));
        const qty = document.createElement('input'); qty.type = 'number'; qty.style.width = '70px';
        qty.value = G.STARTING_DECK[k] || 0;
        qty.oninput = () => {
          const n = parseInt(qty.value, 10) || 0;
          if (n > 0) G.STARTING_DECK[k] = n; else delete G.STARTING_DECK[k];
          markDirty();
        };
        row.appendChild(qty);
        deckBox.appendChild(row);
      });
    }
    redrawDeck();
    container.appendChild(deckBox);
  }

  /* ---------- Resources tab ------------------------------------ */
  const RESOURCE_FIELDS = [
    { key: 'name', label: 'Name', type: 'text' },
    { key: 'wt', label: 'Weight (per unit carried)', type: 'number', step: '0.05' },
    { key: 'worth', label: 'Worth (Donate value, future trade)', type: 'number', step: '1' },
    { key: 'tint', label: 'Color tint', type: 'text' },
  ];
  function renderResourcesTab(container) {
    renderKeyedCollection(container, {
      title: 'Resources', singular: 'resource',
      lede: 'Raw materials, food, ores — anything that can sit in your pack.',
      collection: G.RESOURCES, baseCollection: BASE && BASE.RESOURCES,
      fields: RESOURCE_FIELDS,
      labelFor: r => r.name || '(untitled)', tagFor: r => (r.wt != null ? r.wt + ' wt' : ''),
      newDefaults: () => ({ name: 'New Resource', wt: 0.5, tint: 'stone', worth: 1 }),
    });
  }

  /* ---------- Equipment (Items) tab ----------------------------- */
  const ITEM_FIELDS = [
    { key: 'name', label: 'Name', type: 'text' },
    { key: 'slot', label: 'Gear slot', type: 'select', optionsFrom: 'gearSlots' },
    { key: 'cap', label: 'Carry capacity bonus', type: 'number', optional: true },
    { key: 'def', label: 'Defense', type: 'number', optional: true },
    { key: 'warmth', label: 'Warmth', type: 'number', optional: true,
      hint: 'No mechanical effect yet — a future hook, same as Balance/Tuning\'s zoneDiscount fields.' },
    { key: 'set', label: 'Set id (matching pieces grant a set bonus)', type: 'text', optional: true,
      hint: 'A brand-new set bonus needs real code — this only works for the existing "scrap" (3-piece, ' +
        'wider hit window) and "highland" (helmet/chest/legs/cape, bonus xp in Leth-Eiren) sets.' },
    { key: 'note', label: 'Note (shown in the Bag)', type: 'text' },
    { key: 'cosmetic', label: 'Cosmetic only (zone capes etc. — no stat bonuses apply)', type: 'checkbox' },
  ];
  function renderItemsTab(container) {
    renderKeyedCollection(container, {
      title: 'Equipment', singular: 'item',
      lede: 'Armor, capacity gear, rings — anything worn in a gear slot. Tools and weapons are not ' +
        'here; they are cards only now (see the Cards tab), with no equip step at all.',
      collection: G.ITEMS, baseCollection: BASE && BASE.ITEMS,
      fields: ITEM_FIELDS,
      labelFor: i => i.name || '(untitled)', tagFor: i => i.slot || '',
      newDefaults: () => ({ name: 'New Item', slot: optionsFrom('gearSlots')[0], note: '' }),
    });
  }

  /* ---------- Locations tab ---------------------------------------- */
  /* Animals live here too now, not in a separate table — an animal is
     just a location whose Requires is "combat" (either a melee or a
     ranged card can hit it) and that sets Attack, the damage it hits
     back for on a swing that doesn't finish it. How often one shows
     up is purely how many you put in a zone's location deck (Zones
     tab) — there's no separate spawn weight or zone list to keep in
     sync with that anymore. */
  const LOCATION_FIELDS = [
    { key: 'name', label: 'Name', type: 'text' },
    { key: 'hp', label: 'HP', type: 'number' },
    { key: 'atk', label: 'Attack (retaliation damage — hostile locations only)', type: 'number', optional: true,
      hint: 'Set this to make it a hostile/animal location: it hits back, counts toward travel-gate kills, ' +
        'gets the sword badge and red tint automatically — all driven off this field being set, not "requires".' },
    { key: 'sprite', label: 'Emblem id', type: 'select', optionsFrom: 'emblems' },
    { key: 'requires', label: 'Requires (what can damage this)', type: 'select', optionsFrom: 'locationRequires',
      hint: '"mine"/"axe" for a specific tool card. "combat" for an animal either melee or ranged can hit. ' +
        '"melee" or "ranged" alone gates it to just that one weapon type — e.g. a deer only a bow can hit.' },
    { key: 'dropTable', label: 'Drops (paid out all at once when cleared)', type: 'droptable' },
  ];
  function renderLocationsTab(container) {
    renderKeyedCollection(container, {
      title: 'Locations', singular: 'location',
      lede: 'Field targets, up to three at once — Boulders, Pine Trees, Ore Veins, and animals, all one ' +
        'system. Only "combat" locations (animals) ever hit back. A matching card only does something ' +
        'once one of these is up in the field; clearing one pays out its whole drop table at once and ' +
        'draws the next from the zone’s location deck (see the Zones tab) — a zone with more animals in ' +
        'its mix is simply more dangerous to gather in.',
      collection: G.LOCATIONS, baseCollection: BASE && BASE.LOCATIONS,
      fields: LOCATION_FIELDS,
      labelFor: l => l.name || '(untitled)', tagFor: l => (l.hp != null ? l.hp + ' hp' : ''),
      newDefaults: () => ({ name: 'New Location', hp: 6, sprite: 'stone', requires: 'mine', dropTable: [] }),
    });
  }

  /* ---------- Farming (Crops) tab -------------------------------------
     Seeds are ordinary resources (see Resources tab) — this table only
     covers what happens once one is planted: which zone it's locked
     to, how many separate waterings a plot needs before it's ready,
     how long each of those stages takes, and what it pays out. See
     G.plantSeed/G.waterPlot/G.harvestPlot, systems/farm.js. Farm-wide
     numbers (plot count, growth-speed-per-level, water/harvest xp)
     live in Balance / Tuning (farmPlotsBase, farmGrowSpeedPerLv,
     farmGrowSpeedFloor, farmWaterXp, farmHarvestXp, farmTickMs). */
  const CROP_FIELDS = [
    { key: 'name', label: 'Name (shown once planted)', type: 'text' },
    { key: 'region', label: 'Region (only plantable in this zone)', type: 'select', optionsFrom: 'zones' },
    { key: 'stages', label: 'Stages (separate waterings needed before it\'s ready to harvest)', type: 'number' },
    { key: 'stageMs', label: 'Stage duration (ms, before farming-level speedup)', type: 'number', step: '1000' },
    { key: 'yield', label: 'Yield (paid out on harvest)', type: 'droptable' },
  ];
  function renderCropsTab(container) {
    renderKeyedCollection(container, {
      title: 'Farming', singular: 'crop',
      lede: 'What a seed becomes once planted in a Town-tab farm plot. The seed itself is just a ' +
        'resource (Resources tab) — pick an existing seed-shaped one or add a new resource first, ' +
        'then give it a matching entry here using the same key.',
      collection: G.CROPS, baseCollection: BASE && BASE.CROPS,
      fields: CROP_FIELDS,
      labelFor: c => c.name || '(untitled)', tagFor: c => (c.region || ''),
      newDefaults: () => ({
        name: 'New Crop', region: optionsFrom('zones')[0] || 'aerendell',
        stages: 2, stageMs: 300000, yield: [],
      }),
    });
  }

  /* ---------- Consumables tab ----------------------------------------
     Items a card spends when it resolves (arrows and whatever else
     joins them later) — separate from the group each belongs to
     (the Bag page lets the player pick a default per group). */
  const CONSUMABLE_FIELDS = [
    { key: 'group', label: 'Group', type: 'select', optionsFrom: 'consumableGroups' },
    { key: 'dmg', label: 'Damage bonus', type: 'number' },
  ];
  const CONSUMABLE_GROUP_FIELDS = [
    { key: 'name', label: 'Name (shown on the Bag page)', type: 'text' },
    { key: 'usedBy', label: 'Used by (hint text, e.g. "Loose Arrow cards")', type: 'text' },
  ];
  function renderConsumablesTab(container) {
    renderKeyedCollection(container, {
      title: 'Consumable groups', singular: 'group',
      lede: 'A group the player picks a default item for on the Bag page (e.g. "Arrows"). Add the ' +
        'actual items below.',
      collection: G.CONSUMABLE_GROUPS, baseCollection: BASE && BASE.CONSUMABLE_GROUPS,
      fields: CONSUMABLE_GROUP_FIELDS,
      labelFor: g => g.name || '(untitled)',
      newDefaults: () => ({ name: 'New Group', usedBy: '' }),
    });
    const items = el('div'); items.style.marginTop = '20px';
    renderKeyedCollection(items, {
      title: 'Consumable items', singular: 'item',
      lede: 'A resource (Resources tab) that a card spends when it resolves, and what it does.',
      collection: G.CONSUMABLES, baseCollection: BASE && BASE.CONSUMABLES,
      fields: CONSUMABLE_FIELDS,
      labelFor: (c, id) => (G.RESOURCES[id] ? G.RESOURCES[id].name : id),
      tagFor: c => c.group || '',
      newDefaults: () => ({ group: optionsFrom('consumableGroups')[0] || '', dmg: 1 }),
    });
    container.appendChild(items);
  }

  /* ---------- Zones tab ---------------------------------------------- */
  /* Lightweight on purpose — adding a whole new zone needs a theme,
     travel gating, and a spot on the Home map, which is real code.
     This tab only edits the two deck compositions on existing zones. */
  function renderZonesTab(container) {
    container.innerHTML = '';
    container.appendChild(el('h2', null, 'Zones'));
    container.appendChild(el('p', 'lede',
      'Each zone’s deck (action cards drawn into your hand), 3 field-slot decks (field targets ' +
      'like Boulders and Ore Veins — each of the 3 slots draws from its own independent deck), ' +
      'and loot wheel pool (what the three reels can land on when this zone levels up). Adding a ' +
      'brand-new zone needs real code — this only edits zones that already exist.'));

    Object.keys(G.ZONES).sort().forEach(zid => container.appendChild(renderZone(zid)));

    function renderZone(zid) {
      const z = G.ZONES[zid];
      const wrap = el('div', 'entry');
      const hd = el('div', 'entry-hd');
      hd.appendChild(el('span', 'entry-key', zid));
      hd.appendChild(el('span', 'entry-name', z.name || zid));
      const body = el('div', 'entry-body'); body.style.display = 'none';
      hd.onclick = () => { body.style.display = body.style.display === 'none' ? '' : 'none'; };

      body.appendChild(subListField('Deck (action cards)', 'How many of each card this zone draws from.',
        costMapEditor(z, 'deck', markDirty, false, 'cards')));
      /* 3 independent field-slot decks, not one shared pile — each
         slot shuffles and reshuffles on its own, so whatever a slot
         holds is guaranteed to show up (a slot with only Boulder in
         it is always a Boulder), and a slot can still mix several
         location keys to randomize within itself. */
      if (!Array.isArray(z.locationDecks)) z.locationDecks = [];
      [0, 1, 2].forEach(i => {
        body.appendChild(subListField('Field slot ' + (i + 1) + ' deck',
          'Fills and reshuffles independently of the other two slots. Leave empty and this slot ' +
          'never shows anything for this zone.',
          costMapEditor(z.locationDecks, i, markDirty, true, 'locations')));
      });
      body.appendChild(subListField('Loot wheel reel icons',
        'Only what the three reels flick through on a level-up. What you actually win is rolled ' +
        'from the drop table in Balance / Tuning — the reels are then made to land on it.',
        poolEditor(z, 'lootPool', markDirty, 'resources')));

      body.appendChild(subListField('Foil card set',
        'Which of this zone\'s cards a 10% foil pull can upgrade. A pull only ever lands on a card ' +
        'actually in your deck, so listing one you cannot own here simply never fires.',
        poolEditor(z, 'foilPool', markDirty, 'cards')));

      /* the 1% cape prize — one item per zone, so a plain dropdown */
      const capeWrap = el('div', 'field');
      capeWrap.appendChild(el('label', null, 'Zone cape (the 1% prize)'));
      capeWrap.appendChild(el('div', 'hint',
        'Awarded by the wheel at 1%. Shares the cape slot with the Backpack, so it is only worn ' +
        'automatically when that slot is free — otherwise it waits in the Bag\'s wardrobe.'));
      const capeSel = document.createElement('select');
      capeSel.appendChild(new Option('— none —', ''));
      Object.keys(G.ITEMS).filter(k => G.ITEMS[k].slot === 'cape').sort()
        .forEach(k => capeSel.appendChild(new Option(G.ITEMS[k].name + '  (' + k + ')', k)));
      capeSel.value = z.cape || '';
      capeSel.onchange = () => {
        if (capeSel.value) z.cape = capeSel.value; else delete z.cape;
        markDirty();
      };
      capeWrap.appendChild(capeSel);
      body.appendChild(capeWrap);

      wrap.appendChild(hd); wrap.appendChild(body);
      return wrap;
    }
  }

  /* ---------- Skills tab ------------------------------------------ */
  const SKILL_FIELDS = [
    { key: 'name', label: 'Name', type: 'text' },
    { key: 'tint', label: 'Color tint', type: 'text' },
    { key: 'need', label: 'Base XP to level up', type: 'number' },
    { key: 'perks', label: 'Perk text by level', type: 'perks',
      hint: 'Flavor text shown at these levels. Actual mechanical bonuses for existing skills are ' +
        'hardcoded in the engine — adding a new skill here will level up correctly but will not, by ' +
        'itself, grant a new stat bonus without real code.' },
  ];
  function renderSkillsTab(container) {
    renderKeyedCollection(container, {
      title: 'Skills', singular: 'skill',
      lede: 'The skills the character levels up by playing cards.',
      collection: G.SKILLS, baseCollection: BASE && BASE.SKILLS,
      fields: SKILL_FIELDS,
      labelFor: s => s.name || '(untitled)', tagFor: s => (s.need != null ? 'need ' + s.need : ''),
      newDefaults: () => ({ name: 'New Skill', tint: 'stone', need: 24, perks: {} }),
    });
  }

  /* ---------- Tuning tab ------------------------------------------- */
  function renderTuneTab(container) {
    container.innerHTML = '';
    container.appendChild(el('h2', null, 'Balance / Tuning'));
    container.appendChild(el('p', 'lede',
      'Global numbers the whole game reads from — timing windows, capacities, spawn rates, xp curves. ' +
      'Hover a field name if you are not sure what it does; the key itself is the field name in the code.'));
    const grid = el('div', 'tune-grid');
    Object.keys(G.TUNE).sort().forEach(k => {
      const wrap = el('div', 'field');
      const label = el('label', null, k);
      wrap.appendChild(label);
      const input = document.createElement('input');
      input.type = typeof G.TUNE[k] === 'number' ? 'number' : 'text';
      if (input.type === 'number') input.step = 'any';
      input.value = G.TUNE[k];
      input.oninput = () => {
        const v = input.type === 'number' ? parseFloat(input.value) : input.value;
        if (input.type !== 'number' || !isNaN(v)) { G.TUNE[k] = v; markDirty(); }
      };
      wrap.appendChild(input);
      grid.appendChild(wrap);
    });
    container.appendChild(grid);
  }

  /* ---------- Crafting stations tab ------------------------------- */
  const STATION_FIELDS = [
    { key: 'name', label: 'Name', type: 'text' },
    { key: 'sub', label: 'Subtitle (shown under the name)', type: 'text' },
    { key: 'buildCost', label: 'Cost to build', type: 'costmap' },
    { key: 'zones', label: 'Only buildable in these zones (blank = everywhere)', type: 'multiselect', optionsFrom: 'zones' },
    { key: 'recipes', label: 'Recipes', type: 'recipes' },
    { key: 'upgrades', label: 'Upgrade tiers (tap-craft speed)', type: 'upgrades',
      hint: 'Each tier is one purchasable level, in order — tier 1 is Level 2, tier 2 is Level 3, and so on.' },
  ];
  function renderStationsTab(container) {
    container.innerHTML = '';
    container.appendChild(el('h2', null, 'Crafting stations'));
    container.appendChild(el('p', 'lede',
      'Workshops and their recipes. Every recipe needs a unique id across the whole game (used to track what you’ve made).'));

    if (!G.STATIONS.length) container.appendChild(el('div', 'empty', 'No stations yet.'));
    G.STATIONS.forEach(st => container.appendChild(renderStation(st)));

    const addRow = el('div', 'add-row');
    const addBtn = el('button', 'btn acc', '+ Add station');
    addBtn.onclick = () => {
      const raw = prompt('New station id (short, lowercase, no spaces):');
      if (raw == null) return;
      const id = raw.trim();
      if (!id || G.STATIONS.some(s => s.id === id)) { alert('Enter a unique id.'); return; }
      G.STATIONS.push({ id, name: 'New Station', sub: '', buildCost: {}, recipes: [] });
      markDirty();
      renderStationsTab(container);
    };
    addRow.appendChild(addBtn);
    container.appendChild(addRow);

    function renderStation(st) {
      const wrap = el('div', 'entry');
      const hd = el('div', 'entry-hd');
      hd.appendChild(el('span', 'entry-key', st.id));
      const nameSpan = el('span', 'entry-name', st.name || '(untitled)');
      hd.appendChild(nameSpan);
      hd.appendChild(el('span', 'entry-tag', (st.recipes || []).length + ' recipes'));
      const body = el('div', 'entry-body'); body.style.display = 'none';
      hd.onclick = () => { body.style.display = body.style.display === 'none' ? '' : 'none'; };
      renderFields(body, STATION_FIELDS, st, () => { markDirty(); nameSpan.textContent = st.name || '(untitled)'; });
      const actions = el('div', 'entry-actions');
      const del = el('button', 'btn warn small', 'Delete station');
      del.onclick = () => {
        if (!confirm('Delete station "' + st.id + '" and all its recipes?')) return;
        const i = G.STATIONS.indexOf(st);
        if (i >= 0) G.STATIONS.splice(i, 1);
        markDirty();
        renderStationsTab(container);
      };
      actions.appendChild(del);
      wrap.appendChild(hd); wrap.appendChild(body); wrap.appendChild(actions);
      return wrap;
    }
  }

  /* ---------- Emblems tab ------------------------------------------ */
  function renderEmblemsTab(container) {
    container.innerHTML = '';
    container.appendChild(el('h2', null, 'Emblems'));
    container.appendChild(el('p', 'lede',
      'The little flat two-tone icons used everywhere. Add your own by pasting SVG shape markup ' +
      '(paths, rects, circles — whatever you’d put inside an <svg> tag) and picking two colors; ' +
      'use $1 and $2 in the markup for those two colors, matching how the game’s own icons work.'));

    container.appendChild(el('h2', null, 'Existing emblems'));
    const gallery = el('div', 'emb-grid');
    Object.keys(G.SPRITES).sort().forEach(k => {
      const cell = el('div', 'emb-cell');
      const prev = el('div', 'emb-preview'); prev.innerHTML = G.sprite(k, 28);
      cell.appendChild(prev); cell.appendChild(el('div', null, k));
      gallery.appendChild(cell);
    });
    container.appendChild(gallery);

    container.appendChild(el('h2', null, 'Your custom emblems'));
    const custom = customEmblemIds();
    const list = el('div');
    if (!custom.length) list.appendChild(el('div', 'empty', 'None yet — add one below.'));
    custom.forEach(id => list.appendChild(renderEmblemEntry(id)));
    container.appendChild(list);

    const addRow = el('div', 'add-row');
    const addBtn = el('button', 'btn acc', '+ Add emblem');
    addBtn.onclick = () => {
      const raw = prompt('New emblem id (short, lowercase, no spaces):');
      if (raw == null) return;
      const id = raw.trim();
      if (!id || G.SPRITES[id]) { alert('Enter a unique id.'); return; }
      G.SPRITES[id] = { c: ['#8d97a3', '#b8c2cd'], d: '<circle cx="12" cy="12" r="7" fill="$1"/>' };
      markDirty();
      renderEmblemsTab(container);
    };
    addRow.appendChild(addBtn);
    container.appendChild(addRow);

    container.appendChild(el('h2', null, 'Icon assignments'));
    container.appendChild(el('p', 'lede',
      'Point any resource, card, or item id at an emblem — an existing one, or one of your custom ones. ' +
      'This is also how a new resource/item without its own art borrows an existing icon.'));
    const aliasBox = el('div', 'sublist');
    function aliasableKeys() {
      // Anything an id could plausibly be: the usual resource/item/card
      // namespaces, location ids (a couple of animals alias their emblem),
      // plus whatever G.ALIAS already references so an existing
      // assignment is never left with no matching dropdown option.
      const all = Object.keys(G.RESOURCES).concat(
        Object.keys(G.ITEMS), Object.keys(G.CARDS), Object.keys(G.LOCATIONS), Object.keys(G.ALIAS));
      return Array.from(new Set(all)).sort();
    }
    function redrawAlias() {
      aliasBox.innerHTML = '';
      Object.keys(G.ALIAS).sort().forEach(key => {
        aliasBox.appendChild(aliasRow(key, G.ALIAS[key]));
      });
      const add = el('button', 'sub-add', '+ add assignment');
      add.onclick = () => {
        const allKeys = aliasableKeys();
        const key = allKeys.find(k => !G.ALIAS[k] && !G.SPRITES[k]);
        if (!key) { alert('Nothing left to assign — every id already has a direct or assigned icon.'); return; }
        G.ALIAS[key] = optionsFrom('emblems')[0];
        markDirty(); redrawAlias();
      };
      aliasBox.appendChild(add);
    }
    function aliasRow(key, emblemId) {
      const row = el('div', 'subrow');
      const keySel = document.createElement('select'); keySel.className = 'grow';
      aliasableKeys().forEach(k => keySel.appendChild(new Option(k, k)));
      keySel.value = key;
      const embSel = document.createElement('select'); embSel.className = 'grow';
      optionsFrom('emblems').forEach(e => embSel.appendChild(new Option(e, e)));
      embSel.value = emblemId;
      const prev = el('div', 'emb-preview'); prev.style.width = '28px'; prev.style.height = '28px';
      prev.innerHTML = G.sprite(emblemId, 20);
      const rm = el('button', 'rm', '×');
      keySel.onchange = () => {
        const v = G.ALIAS[key]; delete G.ALIAS[key];
        G.ALIAS[keySel.value] = v; markDirty(); redrawAlias();
      };
      embSel.onchange = () => {
        G.ALIAS[key] = embSel.value; prev.innerHTML = G.sprite(embSel.value, 20); markDirty();
      };
      rm.onclick = () => { delete G.ALIAS[key]; markDirty(); redrawAlias(); };
      row.appendChild(keySel); row.appendChild(embSel); row.appendChild(prev); row.appendChild(rm);
      return row;
    }
    redrawAlias();
    container.appendChild(aliasBox);

    function customEmblemIds() {
      const baseKeys = new Set(BASE_SPRITES ? Object.keys(BASE_SPRITES.SPRITES) : []);
      return Object.keys(G.SPRITES).filter(k => !baseKeys.has(k)).sort();
    }
    function renderEmblemEntry(id) {
      const spr = G.SPRITES[id];
      const wrap = el('div', 'entry new');
      const hd = el('div', 'entry-hd');
      hd.appendChild(el('span', 'entry-key', id));
      hd.appendChild(el('span', 'entry-name', ''));
      const body = el('div', 'entry-body');
      const preview = el('div', 'emb-editor-preview');
      function repaint() { preview.innerHTML = G.sprite(id, 40); }
      body.appendChild(preview);

      const c1 = document.createElement('input'); c1.type = 'color'; c1.value = spr.c[0];
      const c2 = document.createElement('input'); c2.type = 'color'; c2.value = spr.c[1];
      const colorsField = el('div', 'field-row');
      const f1 = el('div', 'field'); f1.appendChild(el('label', null, 'Color 1')); f1.appendChild(c1);
      const f2 = el('div', 'field'); f2.appendChild(el('label', null, 'Color 2')); f2.appendChild(c2);
      colorsField.appendChild(f1); colorsField.appendChild(f2);
      body.appendChild(colorsField);

      const markupField = el('div', 'field');
      markupField.appendChild(el('label', null, 'SVG markup (use $1 / $2 for the two colors above)'));
      const ta = document.createElement('textarea'); ta.value = spr.d;
      markupField.appendChild(ta);
      body.appendChild(markupField);

      c1.oninput = () => { spr.c[0] = c1.value; bustCacheAndRepaint(); };
      c2.oninput = () => { spr.c[1] = c2.value; bustCacheAndRepaint(); };
      ta.oninput = () => { spr.d = ta.value; bustCacheAndRepaint(); };
      let previewGen = 0;
      function bustCacheAndRepaint() {
        // G.sprite() memoizes forever by "name@size" — a fixed temp name
        // would render once correctly, then keep serving that first
        // render on every later edit. Use a name that's never been
        // seen before so every edit is a guaranteed cache miss.
        const tempName = '__preview__' + id + '_' + (previewGen++);
        G.SPRITES[tempName] = spr;
        preview.innerHTML = G.sprite(tempName, 40);
        delete G.SPRITES[tempName];
        markDirty();
      }
      repaint();

      const actions = el('div', 'entry-actions');
      const del = el('button', 'btn warn small', 'Delete emblem');
      del.onclick = () => {
        if (!confirm('Delete emblem "' + id + '"?')) return;
        delete G.SPRITES[id];
        Object.keys(G.ALIAS).forEach(k => { if (G.ALIAS[k] === id) delete G.ALIAS[k]; });
        markDirty();
        renderEmblemsTab(container);
      };
      actions.appendChild(del);

      wrap.appendChild(hd); wrap.appendChild(body); wrap.appendChild(actions);
      return wrap;
    }
  }

  function renderAssetsTab(container) {
    container.innerHTML = '';
    container.appendChild(el('h2', null, 'Media / Assets'));
    container.appendChild(el('p', 'lede',
      'Assign your own MP3s to game hooks like zone music, card draw, crafting, fishing, or axe/logging actions. ' +
      'You can also replace any existing sprite with your own art by pasting a file path / URL, or importing a file ' +
      'directly into the generated override file as a data URL.'));

    container.appendChild(el('h2', null, 'Sound hooks'));
    const soundWrap = el('div', 'asset-grid');
    (G.audioHookCatalog ? G.audioHookCatalog() : []).forEach(hook => {
      const row = el('div', 'asset-row');
      const meta = el('div', 'asset-meta');
      meta.appendChild(el('div', 'asset-title', hook.label));
      meta.appendChild(el('div', 'asset-sub', hook.id));
      const inputWrap = el('div', 'field');
      inputWrap.style.marginTop = '0';
      const input = document.createElement('input');
      input.type = 'text';
      input.value = (G.AUDIO_OVERRIDES && G.AUDIO_OVERRIDES[hook.id]) || '';
      input.placeholder = 'assets/audio/my-sound.mp3 or file URL';
      input.oninput = () => {
        if (input.value.trim()) G.AUDIO_OVERRIDES[hook.id] = input.value.trim();
        else delete G.AUDIO_OVERRIDES[hook.id];
        markDirty();
      };
      inputWrap.appendChild(input);
      const actions = el('div', 'asset-actions');
      const upload = document.createElement('input');
      upload.type = 'file';
      upload.accept = 'audio/*';
      upload.className = 'asset-upload';
      upload.onchange = () => {
        const file = upload.files && upload.files[0];
        if (!file) return;
        readFileAsDataUrl(file).then(url => {
          G.AUDIO_OVERRIDES[hook.id] = url;
          input.value = url;
          markDirty();
        }).catch(err => alert(err.message || String(err)));
      };
      const test = el('button', 'btn small', 'Test');
      test.onclick = () => { if (G.playAudioHook) G.playAudioHook(hook.id); };
      const clear = el('button', 'btn warn small', 'Clear');
      clear.onclick = () => {
        delete G.AUDIO_OVERRIDES[hook.id];
        input.value = '';
        markDirty();
      };
      actions.appendChild(upload);
      actions.appendChild(test);
      actions.appendChild(clear);
      row.appendChild(meta);
      row.appendChild(inputWrap);
      row.appendChild(actions);
      soundWrap.appendChild(row);
    });
    container.appendChild(soundWrap);

    container.appendChild(el('h2', null, 'Sprite replacements'));
    container.appendChild(el('p', 'lede',
      'Replace any existing emblem/sprite target with your own artwork. The key shown here is the id the game asks for ' +
      'when rendering art, so you can swap in a custom PNG/JPG/WebP without changing game code.'));
    const searchWrap = el('div', 'asset-search');
    const search = document.createElement('input');
    search.type = 'text';
    search.placeholder = 'Filter sprite keys…';
    searchWrap.appendChild(search);
    container.appendChild(searchWrap);
    const spriteWrap = el('div', 'asset-grid');
    container.appendChild(spriteWrap);

    function spriteTargets() {
      const all = Object.keys(G.SPRITES || {})
        .concat(Object.keys(G.ALIAS || {}))
        .concat(Object.keys(G.RESOURCES || {}))
        .concat(Object.keys(G.ITEMS || {}))
        .concat(Object.keys(G.CARDS || {}))
        .concat(Object.keys(G.LOCATIONS || {}));
      return Array.from(new Set(all)).sort();
    }
    function redrawSprites() {
      const q = (search.value || '').trim().toLowerCase();
      spriteWrap.innerHTML = '';
      spriteTargets()
        .filter(id => !q || id.toLowerCase().indexOf(q) >= 0)
        .forEach(id => {
          const row = el('div', 'asset-row');
          const preview = el('div', 'asset-preview');
          preview.innerHTML = G.sprite(id, 28);
          const meta = el('div', 'asset-meta');
          meta.appendChild(el('div', 'asset-title', id));
          meta.appendChild(el('div', 'asset-sub',
            G.resolveSpriteAssetSrc && G.resolveSpriteAssetSrc(id) ? 'custom image override active' :
              (G.ALIAS[id] ? 'aliases to ' + G.ALIAS[id] : 'uses built-in emblem')));
          const inputWrap = el('div', 'field');
          inputWrap.style.marginTop = '0';
          const input = document.createElement('input');
          input.type = 'text';
          input.value = (G.SPRITE_IMAGE_OVERRIDES && G.SPRITE_IMAGE_OVERRIDES[id]) || '';
          input.placeholder = 'assets/sprites/my-art.png or file URL';
          input.oninput = () => {
            if (input.value.trim()) G.SPRITE_IMAGE_OVERRIDES[id] = input.value.trim();
            else delete G.SPRITE_IMAGE_OVERRIDES[id];
            preview.innerHTML = G.sprite(id, 28);
            markDirty();
            redrawSprites();
          };
          inputWrap.appendChild(input);
          const actions = el('div', 'asset-actions');
          const upload = document.createElement('input');
          upload.type = 'file';
          upload.accept = 'image/*';
          upload.className = 'asset-upload';
          upload.onchange = () => {
            const file = upload.files && upload.files[0];
            if (!file) return;
            readFileAsDataUrl(file).then(url => {
              G.SPRITE_IMAGE_OVERRIDES[id] = url;
              input.value = url;
              preview.innerHTML = G.sprite(id, 28);
              markDirty();
              redrawSprites();
            }).catch(err => alert(err.message || String(err)));
          };
          const clear = el('button', 'btn warn small', 'Clear');
          clear.onclick = () => {
            delete G.SPRITE_IMAGE_OVERRIDES[id];
            input.value = '';
            preview.innerHTML = G.sprite(id, 28);
            markDirty();
            redrawSprites();
          };
          actions.appendChild(upload);
          actions.appendChild(clear);
          row.appendChild(preview);
          row.appendChild(meta);
          row.appendChild(inputWrap);
          row.appendChild(actions);
          spriteWrap.appendChild(row);
        });
      if (!spriteWrap.children.length) spriteWrap.appendChild(el('div', 'empty', 'No sprite keys match that filter.'));
    }
    search.oninput = redrawSprites;
    redrawSprites();
  }

  /* ---------- dirty tracking / status ------------------------------ */
  let dirty = false;
  function markDirty() {
    dirty = true;
    setStatus('Unsaved changes', '');
  }
  function setStatus(text, cls) {
    const s = $('status');
    s.textContent = text;
    s.className = 'status' + (cls ? ' ' + cls : '');
  }

  /* ---------- base snapshot (for diffing) --------------------------- */
  function evalSandboxed(sources) {
    const fakeWindow = {};
    try { new Function('window', sources.join('\n'))(fakeWindow); }
    catch (e) { console.error('[editor] base snapshot failed', e); }
    return fakeWindow.Game || {};
  }

  function loadBase() {
    return Promise.all([fetch('../js/data.js').then(r => r.text()), fetch('../js/sprites.js').then(r => r.text())])
      .then(([dataText, spritesText]) => {
        BASE = evalSandboxed([dataText]);
        const spritesSandbox = evalSandboxed([dataText, spritesText]);
        BASE_SPRITES = { SPRITES: spritesSandbox.SPRITES || {}, ALIAS: spritesSandbox.ALIAS || {} };
      });
  }

  /* ---------- diffing ------------------------------------------------ */
  function diffKeyed(baseObj, liveObj) {
    baseObj = baseObj || {}; liveObj = liveObj || {};
    const upserts = {}; const deletes = [];
    Object.keys(liveObj).forEach(k => { if (!deepEqual(baseObj[k], liveObj[k])) upserts[k] = liveObj[k]; });
    Object.keys(baseObj).forEach(k => { if (!(k in liveObj)) deletes.push(k); });
    return { upserts, deletes };
  }
  function diffFlat(baseObj, liveObj) {
    baseObj = baseObj || {}; liveObj = liveObj || {};
    const upserts = {};
    Object.keys(liveObj).forEach(k => { if (!deepEqual(baseObj[k], liveObj[k])) upserts[k] = liveObj[k]; });
    return upserts;
  }
  function diffArrayById(baseArr, liveArr) {
    baseArr = baseArr || []; liveArr = liveArr || [];
    const baseById = {}; baseArr.forEach(s => baseById[s.id] = s);
    const liveIds = {}; liveArr.forEach(s => liveIds[s.id] = true);
    const upserts = [];
    liveArr.forEach(s => { if (!deepEqual(baseById[s.id], s)) upserts.push(s); });
    const deletes = baseArr.filter(s => !liveIds[s.id]).map(s => s.id);
    return { upserts, deletes };
  }

  /* ---------- code generation ---------------------------------------- */
  const CUSTOM_CONTENT_HEADER =
    '/* =========================================================\n' +
    '   custom-content.js — GENERATED by tools/editor. Do not hand-edit;\n' +
    '   your changes will be overwritten the next time you click Save\n' +
    '   in the content editor. Loads after data.js, so it can add new\n' +
    '   cards/resources/items/locations/stations/skills, or override a\n' +
    '   field on an existing one (re-declared in full below).\n\n' +
    '   Nothing in the base data.js or sprites.js is ever modified by\n' +
    '   the editor; every change from the editor lands here (or in\n' +
    '   custom-sprites.js) instead.\n' +
    '   ========================================================= */\n';

  const CUSTOM_SPRITES_HEADER =
    '/* =========================================================\n' +
    '   custom-sprites.js — GENERATED by tools/editor. Do not hand-edit;\n' +
    '   your changes will be overwritten the next time you click Save\n' +
    '   in the content editor. Loads after sprites.js, so it can add\n' +
    '   new emblems to G.SPRITES and point resource/card/item keys at\n' +
    '   them through G.ALIAS.\n' +
    '   ========================================================= */\n';
  const CUSTOM_ASSETS_HEADER =
    '/* =========================================================\n' +
    '   custom-assets.js — GENERATED by tools/editor. Do not hand-edit;\n' +
    '   your changes will be overwritten the next time you click Save\n' +
    '   in the content editor. Loads after assets.js, so it can attach\n' +
    '   audio hooks and sprite image overrides without touching base data.\n' +
    '   ========================================================= */\n';

  function assignBlock(label, target, upserts, deletes) {
    if (!Object.keys(upserts).length && !deletes.length) return '';
    let s = '\n  /* ---- ' + label + ' ---- */\n';
    if (Object.keys(upserts).length) {
      s += '  Object.assign(' + target + ', ' + JSON.stringify(upserts, null, 2) + ');\n';
    }
    deletes.forEach(k => { s += '  delete ' + target + '[' + JSON.stringify(k) + '];\n'; });
    return s;
  }

  function pushKeyedDiff(parts, label, target, baseObj, liveObj) {
    const { upserts, deletes } = diffKeyed(baseObj, liveObj);
    parts.push(assignBlock(label, target, upserts, deletes));
  }

  function generateCustomContent() {
    const parts = [];
    pushKeyedDiff(parts, 'Resources', 'G.RESOURCES', BASE.RESOURCES, G.RESOURCES);
    pushKeyedDiff(parts, 'Items', 'G.ITEMS', BASE.ITEMS, G.ITEMS);
    pushKeyedDiff(parts, 'Cards', 'G.CARDS', BASE.CARDS, G.CARDS);
    pushKeyedDiff(parts, 'Locations', 'G.LOCATIONS', BASE.LOCATIONS, G.LOCATIONS);
    pushKeyedDiff(parts, 'Crops', 'G.CROPS', BASE.CROPS, G.CROPS);
    pushKeyedDiff(parts, 'Zones', 'G.ZONES', BASE.ZONES, G.ZONES);
    pushKeyedDiff(parts, 'Skills', 'G.SKILLS', BASE.SKILLS, G.SKILLS);
    pushKeyedDiff(parts, 'Consumable groups', 'G.CONSUMABLE_GROUPS', BASE.CONSUMABLE_GROUPS, G.CONSUMABLE_GROUPS);
    pushKeyedDiff(parts, 'Consumables', 'G.CONSUMABLES', BASE.CONSUMABLES, G.CONSUMABLES);

    const tuneDiff = diffFlat(BASE.TUNE, G.TUNE);
    if (Object.keys(tuneDiff).length) {
      parts.push('\n  /* ---- Tuning ---- */\n  Object.assign(G.TUNE, ' + JSON.stringify(tuneDiff, null, 2) + ');\n');
    }
    const deckDiff = diffFlat(BASE.STARTING_DECK, G.STARTING_DECK);
    if (Object.keys(deckDiff).length) {
      parts.push('\n  /* ---- Starting deck ---- */\n  Object.assign(G.STARTING_DECK, ' + JSON.stringify(deckDiff, null, 2) + ');\n');
    }
    const { upserts: stUp, deletes: stDel } = diffArrayById(BASE.STATIONS, G.STATIONS);
    if (stUp.length || stDel.length) {
      parts.push('\n  /* ---- Crafting stations ---- */\n' +
        '  (function () {\n' +
        '    var UPSERT = ' + JSON.stringify(stUp, null, 2) + ';\n' +
        '    UPSERT.forEach(function (st) {\n' +
        '      var i = G.STATIONS.findIndex(function (s) { return s.id === st.id; });\n' +
        '      if (i >= 0) G.STATIONS[i] = st; else G.STATIONS.push(st);\n' +
        '    });\n' +
        (stDel.length ? '    var DELETE_IDS = ' + JSON.stringify(stDel) + ';\n' +
          '    G.STATIONS = G.STATIONS.filter(function (s) { return DELETE_IDS.indexOf(s.id) === -1; });\n' : '') +
        '  })();\n');
    }

    const body = parts.filter(Boolean).join('');
    return CUSTOM_CONTENT_HEADER + '(function (G) {\n  \'use strict\';\n' +
      (body || '\n  // nothing customized yet — use the editor to add content\n') +
      '})(window.Game = window.Game || {});\n';
  }

  function generateCustomSprites() {
    const { upserts: spUp, deletes: spDel } = diffKeyed(BASE_SPRITES.SPRITES, G.SPRITES);
    const { upserts: alUp, deletes: alDel } = diffKeyed(BASE_SPRITES.ALIAS, G.ALIAS);
    const parts = [];
    parts.push(assignBlock('Emblems', 'G.SPRITES', spUp, spDel));
    parts.push(assignBlock('Icon assignments', 'G.ALIAS', alUp, alDel));
    const body = parts.filter(Boolean).join('');
    return CUSTOM_SPRITES_HEADER + '(function (G) {\n  \'use strict\';\n' +
      (body || '\n  // nothing customized yet — use the editor to add content\n') +
      '})(window.Game = window.Game || {});\n';
  }
  function generateCustomAssets() {
    const parts = [];
    parts.push(assignBlock('Audio hooks', 'G.AUDIO_OVERRIDES', G.AUDIO_OVERRIDES || {}, []));
    parts.push(assignBlock('Sprite image overrides', 'G.SPRITE_IMAGE_OVERRIDES', G.SPRITE_IMAGE_OVERRIDES || {}, []));
    const body = parts.filter(Boolean).join('');
    return CUSTOM_ASSETS_HEADER + '(function (G) {\n  \'use strict\';\n' +
      (body || '\n  // nothing customized yet — use the editor to add media overrides\n') +
      '})(window.Game = window.Game || {});\n';
  }

  function editorServerHint(action) {
    if (window.location.protocol === 'file:') {
      return action + ' failed: the editor is opened as a local file. Start `python3 tools/editor_server.py`, then open `http://localhost:8020/tools/editor.html`.';
    }
    return action + ' failed: could not reach the editor server. Make sure `python3 tools/editor_server.py` is running, then reload this page.';
  }

  /* ---------- save / test -------------------------------------------- */
  function save() {
    setStatus('Saving…', '');
    const files = [
      { file: 'custom-content.js', content: generateCustomContent() },
      { file: 'custom-sprites.js', content: generateCustomSprites() },
      { file: 'custom-assets.js', content: generateCustomAssets() },
    ];
    Promise.all(files.map(f => fetch('/api/save', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(f),
    }).then(r => r.json())))
      .then(results => {
        const failed = results.find(r => !r.ok);
        if (failed) { setStatus('Save failed: ' + failed.error, 'err'); return; }
        dirty = false;
        setStatus('Saved ✓', 'ok');
      })
      .catch(() => setStatus(editorServerHint('Save'), 'err'));
  }

  function runTest() {
    setStatus('Running tests…', '');
    $('test-panel').style.display = '';
    $('test-output').textContent = 'running node test/smoke.js…';
    fetch('/api/test', { method: 'POST' }).then(r => r.json()).then(res => {
      $('test-output').textContent = res.output || res.error || '(no output)';
      $('test-panel-title').textContent = res.ok ? 'Tests passed' : 'Tests failed';
      setStatus(res.ok ? 'Tests passed ✓' : 'Tests failed ✗', res.ok ? 'ok' : 'err');
    }).catch(() => {
      $('test-output').textContent = editorServerHint('Test');
      setStatus('Could not run tests', 'err');
    });
  }

  /* ---------- boot ------------------------------------------------------ */
  window.addEventListener('beforeunload', e => {
    if (dirty) { e.preventDefault(); e.returnValue = ''; }
  });
  $('back-btn').onclick = () => {
    const href = '../index.html';
    const win = window.open(href, '_blank', 'noopener');
    if (!win) window.location.href = href;
  };
  $('save-btn').onclick = save;
  $('test-btn').onclick = runTest;
  $('test-close').onclick = () => { $('test-panel').style.display = 'none'; };

  setStatus('Loading…', '');
  loadBase().then(() => {
    setStatus('Ready', '');
    renderTabs();
    renderActive();
  });
})();
