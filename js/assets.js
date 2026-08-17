/* =========================================================
   assets.js — runtime media overrides for audio and sprite art.

   Lets generated custom-assets.js assign:
   - G.AUDIO_OVERRIDES[hookId] = "path-or-data-url"
   - G.SPRITE_IMAGE_OVERRIDES[spriteOrAliasKey] = "path-or-data-url"
   ========================================================= */
(function (G) {
  'use strict';

  G.AUDIO_OVERRIDES = G.AUDIO_OVERRIDES || {};
  G.SPRITE_IMAGE_OVERRIDES = G.SPRITE_IMAGE_OVERRIDES || {};

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;');
  }

  G.resolveSpriteAssetSrc = function (name) {
    return G.SPRITE_IMAGE_OVERRIDES[name] ||
      G.SPRITE_IMAGE_OVERRIDES[(G.ALIAS && G.ALIAS[name]) || ''] || '';
  };
  G.spriteAssetTag = function (name, size) {
    const src = G.resolveSpriteAssetSrc(name);
    if (!src) return '';
    return '<img class="emb emb-img" src="' + esc(src) + '" width="' + size + '" height="' + size + '" aria-hidden="true">';
  };

  G.audioHookCatalog = function () {
    const hooks = [
      { id: 'ui.cardDraw', label: 'Card draw', group: 'UI' },
      { id: 'ui.cardChoose', label: 'Card choose', group: 'UI' },
      { id: 'ui.levelUp', label: 'Skill level up', group: 'UI' },
      { id: 'ui.zoneLevelUp', label: 'Zone level up', group: 'UI' },
      { id: 'ui.death', label: 'Death screen', group: 'UI' },
      { id: 'action.gather', label: 'Gather card', group: 'Actions' },
      { id: 'action.forage', label: 'Forage card', group: 'Actions' },
      { id: 'action.mine', label: 'Mining card', group: 'Actions' },
      { id: 'action.axe', label: 'Axe / logging card', group: 'Actions' },
      { id: 'action.melee', label: 'Melee card', group: 'Actions' },
      { id: 'action.ranged', label: 'Ranged card', group: 'Actions' },
      { id: 'action.fishing', label: 'Fishing card', group: 'Actions' },
      { id: 'action.travel', label: 'Travel', group: 'Actions' },
      { id: 'action.craft', label: 'Crafting', group: 'Actions' },
      { id: 'action.cook', label: 'Campfire cooking', group: 'Actions' },
      { id: 'action.plant', label: 'Plant seed', group: 'Actions' },
      { id: 'action.water', label: 'Water crop', group: 'Actions' },
      { id: 'action.harvest', label: 'Harvest crop', group: 'Actions' },
      { id: 'action.hitTaken', label: 'Player hit taken', group: 'Actions' },
    ];
    Object.keys(G.ZONES || {}).sort().forEach(zid => {
      hooks.unshift({ id: 'music.zone.' + zid, label: (G.ZONES[zid].name || zid) + ' music', group: 'Zone music' });
    });
    return hooks;
  };

  const audioState = {
    music: null,
    currentMusicHook: '',
  };

  function canUseAudio() {
    return typeof Audio !== 'undefined';
  }
  function playEl(a) {
    try {
      const p = a.play();
      if (p && p.catch) p.catch(function () {});
    } catch (e) {}
  }

  G.playAudioHook = function (hookId, opts) {
    opts = opts || {};
    const src = G.AUDIO_OVERRIDES[hookId];
    if (!src || !canUseAudio()) return false;
    if (hookId.indexOf('music.') === 0 || opts.music) return G.playMusicHook(hookId);
    const a = new Audio(src);
    a.preload = 'auto';
    if (opts.volume != null) a.volume = opts.volume;
    playEl(a);
    return true;
  };
  G.stopMusic = function () {
    if (!audioState.music) return;
    try { audioState.music.pause(); } catch (e) {}
    audioState.music = null;
    audioState.currentMusicHook = '';
  };
  G.playMusicHook = function (hookId) {
    const src = G.AUDIO_OVERRIDES[hookId];
    if (!src || !canUseAudio()) return false;
    if (audioState.currentMusicHook === hookId && audioState.music) return true;
    G.stopMusic();
    const a = new Audio(src);
    a.preload = 'auto';
    a.loop = true;
    audioState.music = a;
    audioState.currentMusicHook = hookId;
    playEl(a);
    return true;
  };
  G.syncZoneMusic = function (zoneId) {
    const hookId = 'music.zone.' + (zoneId || (typeof S !== 'undefined' && S.zone) || '');
    if (G.AUDIO_OVERRIDES[hookId]) return G.playMusicHook(hookId);
    G.stopMusic();
    return false;
  };
})(window.Game = window.Game || {});
