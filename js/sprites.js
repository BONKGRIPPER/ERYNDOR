/* =========================================================
   sprites.js — simple flat emblems.

   Each icon is a tiny SVG drawn on a 24x24 grid: a couple of
   shapes, two tones, rounded ends. No pixel art.

   Add one:  G.SPRITES.myThing = { c:['#a','#b'], d:'<svg body>' }
   Use it:   G.sprite('myThing', 20)
   ========================================================= */
(function (G) {
  'use strict';

  /* shared palette so icons feel like one set */
  const C = {
    stone:  ['#8d97a3', '#b8c2cd'],
    wood:   ['#a9793f', '#c9a06a'],
    leaf:   ['#4f8a4a', '#7cb06f'],
    berry:  ['#b4453f', '#d4736c'],
    meat:   ['#c07a5e', '#dda184'],
    bone:   ['#b9b2a0', '#e6e0d2'],
    metal:  ['#7f8a96', '#aab4c0'],
    gold:   ['#c99a2e', '#eac567'],
    cloth:  ['#b9a882', '#dccfb1'],
    fire:   ['#d1662c', '#eda05c'],
    spirit: ['#7a68a6', '#a794cf'],
    dark:   ['#5c6672', '#8b95a1'],
    pink:   ['#c2807e', '#dda9a7'],
  };

  const S = (c, d) => ({ c, d });

  G.SPRITES = {
    /* ---- raw materials ---- */
    stone: S(C.stone,
      '<path d="M5 15l3-7 5-2 6 4-2 7-8 1z" fill="$1"/>' +
      '<path d="M8 8l5-2 6 4-6 1z" fill="$2"/>'),
    stick: S(C.wood,
      '<rect x="3" y="11" width="18" height="2.6" rx="1.3" fill="$1" transform="rotate(-18 12 12)"/>' +
      '<rect x="7" y="7" width="7" height="2.2" rx="1.1" fill="$2" transform="rotate(28 12 12)"/>'),
    wood: S(C.wood,
      '<rect x="3.5" y="7" width="17" height="10" rx="3" fill="$1"/>' +
      '<ellipse cx="6.5" cy="12" rx="3" ry="5" fill="$2"/>'),
    flax: S(C.leaf,
      '<path d="M12 21V9" stroke="$1" stroke-width="2" stroke-linecap="round"/>' +
      '<path d="M12 10c0-3 2-5 5-6 0 3-2 5-5 6zM12 12c0-3-2-5-5-6 0 3 2 5 5 6z" fill="$2"/>'),
    berries: S(C.berry,
      '<circle cx="9" cy="14" r="4" fill="$1"/><circle cx="15.5" cy="15" r="3.5" fill="$2"/>' +
      '<path d="M9 10V6" stroke="#4f8a4a" stroke-width="1.6" stroke-linecap="round"/>'),
    string: S(C.cloth,
      '<path d="M6 6c6 2 6 10 12 12" stroke="$1" stroke-width="2.4" fill="none" stroke-linecap="round"/>' +
      '<path d="M6 12c5 0 7 4 12 5" stroke="$2" stroke-width="2" fill="none" stroke-linecap="round"/>'),
    cloth: S(C.cloth,
      '<rect x="5" y="7" width="14" height="11" rx="2" fill="$1"/>' +
      '<path d="M5 11h14M5 15h14" stroke="$2" stroke-width="1.4"/>'),
    feathers: S(C.cloth,
      '<path d="M18 5c-7 1-11 6-12 14 7-1 11-6 12-14z" fill="$2"/>' +
      '<path d="M6 19L18 5" stroke="$1" stroke-width="1.6" stroke-linecap="round"/>'),
    bone: S(C.bone,
      '<rect x="6" y="10.6" width="12" height="2.8" rx="1.4" fill="$2"/>' +
      '<circle cx="6" cy="9.6" r="2.5" fill="$1"/><circle cx="6" cy="14.4" r="2.5" fill="$1"/>' +
      '<circle cx="18" cy="9.6" r="2.5" fill="$1"/><circle cx="18" cy="14.4" r="2.5" fill="$1"/>'),
    poultry: S(C.meat,
      '<path d="M8 16c-3-3-2-8 2-10s8 1 8 5c0 3-2 5-5 5z" fill="$2"/>' +
      '<path d="M9 16l-3 4" stroke="$1" stroke-width="2.4" stroke-linecap="round"/>'),
    flaxSeed: S(C.leaf,
      '<ellipse cx="9" cy="15" rx="3" ry="4" fill="$1" transform="rotate(-25 9 15)"/>' +
      '<ellipse cx="15" cy="12" rx="2.6" ry="3.6" fill="$2" transform="rotate(20 15 12)"/>'),
    tin: S(C.metal,
      '<path d="M5 16l3-8h8l3 8z" fill="$1"/><path d="M8 8h8l1.5 4H6.5z" fill="$2"/>'),
    copper: S(['#a9673c', '#cf8f5e'],
      '<path d="M5 16l3-8h8l3 8z" fill="$1"/><path d="M8 8h8l1.5 4H6.5z" fill="$2"/>'),
    coal: S(C.dark,
      '<path d="M6 14l3-6 6-1 3 6-4 4H9z" fill="$1"/>' +
      '<path d="M9 8l6-1 1.6 3.4-6 .8z" fill="$2"/>'),
    charcoal: S(C.dark,
      '<rect x="6" y="9" width="12" height="6" rx="2" fill="$1"/>' +
      '<rect x="8" y="10.5" width="5" height="3" rx="1.5" fill="$2"/>'),
    bronzeBar: S(['#a9793f', '#cfa063'],
      '<path d="M4 15l3-5h10l3 5z" fill="$1"/><rect x="7" y="8" width="10" height="3" rx="1" fill="$2"/>'),
    scrapMetal: S(C.metal,
      '<path d="M5 13l5-5 4 3 5-4v7l-6 4-3-3z" fill="$1"/>' +
      '<path d="M10 8l4 3 5-4-2 5-4 1z" fill="$2"/>'),
    gold: S(C.gold,
      '<circle cx="12" cy="12" r="6.5" fill="$1"/><circle cx="12" cy="12" r="4" fill="$2"/>'),
    diamond: S(['#4f8fa0', '#8fc6d4'],
      '<path d="M12 4l6 5-6 11-6-11z" fill="$2"/><path d="M6 9h12l-6 4z" fill="$1"/>'),
    leather: S(C.wood,
      '<path d="M6 7h12l-2 10H8z" fill="$1"/><path d="M8 9h8l-1 4H9z" fill="$2"/>'),
    leatherScrap: S(C.wood,
      '<path d="M6 8l7-2 5 4-2 7-7-1z" fill="$1"/><path d="M9 9l4-1 3 2-1 3z" fill="$2"/>'),
    tanningSalt: S(C.cloth,
      '<rect x="7" y="9" width="10" height="9" rx="2" fill="$1"/>' +
      '<path d="M9 9V7a3 3 0 016 0v2" stroke="$2" stroke-width="2" fill="none"/>'),
    animalFat: S(C.cloth,
      '<ellipse cx="12" cy="13" rx="6.5" ry="5" fill="$1"/>' +
      '<ellipse cx="10" cy="11.5" rx="2.6" ry="2" fill="$2"/>'),
    steak: S(C.meat,
      '<path d="M5 13c0-4 4-6 8-6s6 2 6 5-3 5-7 5-7-1-7-4z" fill="$1"/>' +
      '<ellipse cx="12" cy="12" rx="3.4" ry="2.4" fill="$2"/>'),
    bronzeNail: S(['#a9793f', '#cfa063'],
      '<path d="M12 6l4 3H8z" fill="$2"/><rect x="11" y="9" width="2" height="10" rx="1" fill="$1"/>'),
    stoneArrow: S(C.stone,
      '<path d="M12 3l3.5 5h-7z" fill="$2"/>' +
      '<rect x="11" y="8" width="2" height="12" rx="1" fill="$1"/>'),
    pondweed: S(C.leaf,
      '<path d="M8 20c0-6 2-11 3-14M12 20c0-7 1-10 0-14M16 20c0-6-2-10-3-13" stroke="$1" stroke-width="1.8" stroke-linecap="round"/>' +
      '<path d="M7 10c2 0 3 1 4 3M17 9c-2 0-3 1-4 3" stroke="$2" stroke-width="1.5" stroke-linecap="round"/>'),
    riverKelp: S(C.leaf,
      '<path d="M8 20c-1-4 1-7 0-11M12 20c1-5-1-8 0-12M16 20c-1-4 1-7 0-11" stroke="$1" stroke-width="1.8" stroke-linecap="round"/>' +
      '<path d="M7 12c2-1 3 0 4 2M17 11c-2-1-3 0-4 2" stroke="$2" stroke-width="1.5" stroke-linecap="round"/>'),
    freshwaterMussel: S(C.cloth,
      '<path d="M6 14c0-4 2-7 6-7s6 3 6 7c0 3-2 5-6 5s-6-2-6-5z" fill="$1"/>' +
      '<path d="M8 12c2-1 6-1 8 0M8 15c2-.7 6-.7 8 0" stroke="$2" stroke-width="1.3" fill="none" stroke-linecap="round"/>'),

    /* ---- tools & gear ---- */
    sword: S(C.metal,
      '<path d="M17 4l3 3-9 9-3-3z" fill="$2"/>' +
      '<path d="M6 15l3 3-2 2-3-3z" fill="$1"/><rect x="4" y="17" width="5" height="2" rx="1" fill="$1"/>'),
    club: S(C.wood,
      '<path d="M13 4c2.8 0 5 1.9 5 4.4 0 2-1.3 3.7-3.2 4.2l-1.2 6.9H10.7l1.7-9.4C12.7 6.6 12.3 5 13 4z" fill="$1"/>' +
      '<path d="M12.7 5.2c2 0 3.6 1.3 3.6 3.1S14.7 11.4 12.7 11.4c-.4 0-.8-.1-1.2-.2l.7-3.9c.2-.9.3-1.5.5-2z" fill="$2"/>'),
    bow: S(C.wood,
      '<path d="M8 4a12 12 0 010 16" stroke="$1" stroke-width="2.4" fill="none" stroke-linecap="round"/>' +
      '<path d="M8 4l0 16" stroke="$2" stroke-width="1.4"/>' +
      '<path d="M8 12h11" stroke="$2" stroke-width="1.6" stroke-linecap="round"/>'),
    rod: S(C.wood,
      '<path d="M8 20c3-5 5-10 5-16" stroke="$1" stroke-width="2" fill="none" stroke-linecap="round"/>' +
      '<path d="M13 4c4 1 5 5 3 8" stroke="$2" stroke-width="1.4" fill="none" stroke-linecap="round"/>' +
      '<circle cx="17" cy="13" r="1.4" fill="$2"/><path d="M17 14.5c0 1.5-1 2.5-2 3" stroke="$2" stroke-width="1.2" fill="none" stroke-linecap="round"/>'),
    net: S(C.cloth,
      '<circle cx="11" cy="11" r="5.5" fill="none" stroke="$1" stroke-width="2"/>' +
      '<path d="M7 11h8M11 7v8M8.3 8.3l5.4 5.4M13.7 8.3l-5.4 5.4" stroke="$2" stroke-width="1.2"/>' +
      '<path d="M14.5 14.5L19 19" stroke="#a9793f" stroke-width="2" stroke-linecap="round"/>'),
    fish: S(['#4f8fa0', '#8fc6d4'],
      '<path d="M6 12c2-4 6-6 10-4l2-2v4c1 1 1 3 0 4v4l-2-2c-4 2-8 0-10-4z" fill="$1"/>' +
      '<circle cx="13.8" cy="10.5" r="1" fill="$2"/>'),
    water: S(['#5f95aa', '#99c8da'],
      '<path d="M4 13c2-2 4-2 6 0s4 2 6 0 4-2 6 0" stroke="$1" stroke-width="2.2" fill="none" stroke-linecap="round"/>' +
      '<path d="M4 17c2-2 4-2 6 0s4 2 6 0 4-2 6 0" stroke="$2" stroke-width="2.2" fill="none" stroke-linecap="round"/>'),
    axe: S(C.stone,
      '<rect x="11" y="5" width="2.2" height="15" rx="1.1" fill="#a9793f"/>' +
      '<path d="M13 5c4 0 6 2 6 5s-2 4-6 4z" fill="$1"/>'),
    pack: S(C.wood,
      '<rect x="6" y="9" width="12" height="10" rx="3" fill="$1"/>' +
      '<path d="M9 9V7a3 3 0 016 0v2" stroke="$2" stroke-width="2" fill="none"/>' +
      '<rect x="10" y="12" width="4" height="3" rx="1" fill="$2"/>'),
    hood: S(C.cloth,
      '<path d="M6 16a6 6 0 0112 0v2H6z" fill="$1"/>' +
      '<path d="M6.5 16a5.5 5.5 0 0111 0" stroke="$2" stroke-width="1.6" fill="none"/>'),
    rag: S(C.cloth,
      '<path d="M8 6l4 2 4-2 2 4-2 2v9H8v-9l-2-2z" fill="$1"/>' +
      '<path d="M8 6l4 2 4-2" stroke="$2" stroke-width="1.4" fill="none"/>'),
    helm: S(C.metal,
      '<path d="M6 15a6 6 0 0112 0v3H6z" fill="$1"/>' +
      '<rect x="10.5" y="15" width="3" height="6" fill="$2"/>'),
    plate: S(C.metal,
      '<path d="M7 5h10l1 5-1 9H7l-1-9z" fill="$1"/>' +
      '<path d="M12 5v14" stroke="$2" stroke-width="1.6"/>'),

    /* ---- creatures ---- */
    chicken: S(['#d8d2c4', '#c9553f'],
      '<ellipse cx="12" cy="14" rx="6" ry="5" fill="$1"/><circle cx="16" cy="9" r="3" fill="$1"/>' +
      '<path d="M16 5.5c1.5-1 2.5 0 1.5 1.5z" fill="$2"/><path d="M19 9l2 1-2 1z" fill="#d99a3c"/>'),
    cow: S(['#e3ded2', '#4a423b'],
      '<ellipse cx="12" cy="13" rx="7" ry="5" fill="$1"/>' +
      '<circle cx="8" cy="12" r="2" fill="$2"/><circle cx="15" cy="14.5" r="1.6" fill="$2"/>' +
      '<path d="M6 18v2M18 18v2" stroke="$2" stroke-width="2" stroke-linecap="round"/>'),
    pig: S(C.pink,
      '<ellipse cx="12" cy="13" rx="7" ry="5" fill="$2"/><ellipse cx="17" cy="13" rx="2.4" ry="2" fill="$1"/>' +
      '<path d="M7 8l1.5 3M17 8l-1.5 3" stroke="$1" stroke-width="2" stroke-linecap="round"/>'),
    sheep: S(['#f2ede0', '#4a423b'],
      '<ellipse cx="12" cy="14" rx="7" ry="5" fill="$1"/>' +
      '<circle cx="7" cy="10" r="3" fill="$1"/><circle cx="12" cy="8.3" r="3.3" fill="$1"/><circle cx="17" cy="10" r="3" fill="$1"/>' +
      '<circle cx="18.5" cy="13" r="2.1" fill="$2"/>' +
      '<path d="M6 18v2M18 18v2" stroke="$2" stroke-width="2" stroke-linecap="round"/>'),
    goblin: S(['#5f8a4a', '#8fb06e'],
      '<circle cx="12" cy="13" r="5.5" fill="$2"/>' +
      '<path d="M6 8l2 4M18 8l-2 4" stroke="$1" stroke-width="2" stroke-linecap="round"/>' +
      '<circle cx="10" cy="12.5" r="1" fill="#3a3a30"/><circle cx="14" cy="12.5" r="1" fill="#3a3a30"/>'),
    deer: S(['#c9a06a', '#7a5a35'],
      '<ellipse cx="10" cy="14" rx="6" ry="4.3" fill="$1"/><circle cx="16.5" cy="9.5" r="2.5" fill="$1"/>' +
      '<path d="M17 7c.2-2 1.4-2.6 2.2-3.4M18 7.2c-.5-1.8.2-2.8-.4-3.8" stroke="$2" stroke-width="1.2" fill="none" stroke-linecap="round"/>' +
      '<path d="M6 18v2M14.5 18v2" stroke="$2" stroke-width="2" stroke-linecap="round"/>'),

    /* ---- stations & ui ---- */
    anvil: S(C.metal,
      '<path d="M4 10h13c0 3-2 4-4 4l1 4H8l1-4c-3 0-5-1-5-4z" fill="$1"/>' +
      '<rect x="7" y="18" width="10" height="2.4" rx="1.2" fill="$2"/>'),
    altar: S(C.spirit,
      '<rect x="5" y="14" width="14" height="6" rx="2" fill="$1"/>' +
      '<path d="M12 4l2 5h-4z" fill="$2"/><rect x="9" y="9" width="6" height="5" rx="1.5" fill="$2"/>'),
    forage: S(C.leaf,
      '<path d="M12 20c0-6 3-10 8-11-1 6-4 10-8 11z" fill="$2"/>' +
      '<path d="M12 20c0-5-2-8-7-9 1 5 3 8 7 9z" fill="$1"/>'),
    seedling: S(C.leaf,
      '<path d="M12 20v-7" stroke="$1" stroke-width="2" stroke-linecap="round"/>' +
      '<path d="M12 13c0-3 2-5 5-5 0 3-2 5-5 5z" fill="$2"/>'),
    heart: S(['#c9553f', '#e08276'],
      '<path d="M12 20s-7-4.5-7-9a4 4 0 017-2.5A4 4 0 0119 11c0 4.5-7 9-7 9z" fill="$1"/>'),
    weight: S(C.metal,
      '<path d="M6 9h12l2 10H4z" fill="$1"/><path d="M10 9V7a2 2 0 014 0v2" stroke="$2" stroke-width="2" fill="none"/>'),
    cards: S(C.leaf,
      '<rect x="4" y="6" width="10" height="13" rx="2.5" fill="$1" transform="rotate(-8 9 12)"/>' +
      '<rect x="11" y="5" width="10" height="13" rx="2.5" fill="$2" transform="rotate(8 16 12)"/>'),
    deckIcon: S(C.dark,
      '<rect x="5" y="5" width="14" height="4" rx="2" fill="$2"/>' +
      '<rect x="5" y="10" width="14" height="4" rx="2" fill="$1"/>' +
      '<rect x="5" y="15" width="14" height="4" rx="2" fill="$2"/>'),
    skills: S(C.gold,
      '<path d="M12 4l2.4 5 5.6.7-4 3.9 1 5.4-5-2.7-5 2.7 1-5.4-4-3.9 5.6-.7z" fill="$2"/>'),
    bag: S(C.wood,
      '<path d="M6 9h12l1 10H5z" fill="$1"/>' +
      '<path d="M9 9V7a3 3 0 016 0v2" stroke="$2" stroke-width="2" fill="none"/>'),
    map: S(C.leaf,
      '<path d="M4 7l5-2 6 2 5-2v12l-5 2-6-2-5 2z" fill="$1"/>' +
      '<path d="M9 5v12M15 7v12" stroke="$2" stroke-width="1.6"/>'),

    /* ---- custom emblems (generated, unassigned) ----
       Blank slate icons for the content editor's Emblems tab —
       assign one to a resource/card/item id via ALIAS to give it
       real art without hand-drawing anything. */
    custom001: S(['hsl(0,42%,56%)', 'hsl(0,38%,76%)'],
      '<circle cx="12" cy="12" r="8" fill="$1"/><circle cx="12" cy="12" r="3.5" fill="$2"/>'),
    custom002: S(['hsl(138,42%,56%)', 'hsl(138,38%,76%)'],
      '<circle cx="12" cy="12" r="8" fill="$1"/><circle cx="12" cy="12" r="8" fill="none" stroke="$2" stroke-width="2.4"/>'),
    custom003: S(['hsl(275,42%,56%)', 'hsl(275,38%,76%)'],
      '<path d="M12 3l7 9-7 9-7-9z" fill="$1"/><path d="M12 7l4 5-4 5-4-5z" fill="$2"/>'),
    custom004: S(['hsl(53,42%,56%)', 'hsl(53,38%,76%)'],
      '<path d="M12 4l8 15H4z" fill="$1"/><path d="M12 9l4.5 8.5h-9z" fill="$2"/>'),
    custom005: S(['hsl(190,42%,56%)', 'hsl(190,38%,76%)'],
      '<path d="M8 4h8l4 8-4 8H8l-4-8z" fill="$1"/><path d="M9.5 7h5l2.5 5-2.5 5h-5L7 12z" fill="$2"/>'),
    custom006: S(['hsl(328,42%,56%)', 'hsl(328,38%,76%)'],
      '<path d="M12 2l2.4 7.6L22 12l-7.6 2.4L12 22l-2.4-7.6L2 12l7.6-2.4z" fill="$1"/><circle cx="12" cy="12" r="3" fill="$2"/>'),
    custom007: S(['hsl(105,42%,56%)', 'hsl(105,38%,76%)'],
      '<path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6z" fill="$1"/><rect x="9" y="9" width="6" height="6" fill="$2"/>'),
    custom008: S(['hsl(243,42%,56%)', 'hsl(243,38%,76%)'],
      '<circle cx="12" cy="12" r="8" fill="$1"/><circle cx="15.5" cy="9.5" r="6.5" fill="$2"/>'),
    custom009: S(['hsl(20,42%,56%)', 'hsl(20,38%,76%)'],
      '<path d="M12 3c4 5 6 8 6 11a6 6 0 01-12 0c0-3 2-6 6-11z" fill="$1"/><ellipse cx="12" cy="15" rx="3.2" ry="3" fill="$2"/>'),
    custom010: S(['hsl(158,42%,56%)', 'hsl(158,38%,76%)'],
      '<path d="M3 9c4-3 7 3 11 0s7-3 7 1-4 6-8 3-6-3-10 0z" fill="$1"/><path d="M3 15c4-3 7 3 11 0s7-3 7 1" stroke="$2" stroke-width="1.8" fill="none" stroke-linecap="round"/>'),
    custom011: S(['hsl(295,42%,56%)', 'hsl(295,38%,76%)'],
      '<rect x="4" y="4" width="16" height="16" rx="3" fill="$1"/><rect x="8" y="8" width="8" height="8" rx="2" fill="$2"/>'),
    custom012: S(['hsl(73,42%,56%)', 'hsl(73,38%,76%)'],
      '<path d="M4 14l8-9 8 9h-5v7H9v-7z" fill="$1"/><path d="M9 14v7h6v-7" stroke="$2" stroke-width="1.8" fill="none"/>'),
    custom013: S(['hsl(210,42%,56%)', 'hsl(210,38%,76%)'],
      '<path d="M12 21c0-7 3-12 8-14-1 7-3 12-8 14z" fill="$1"/><path d="M12 21c0-7-3-12-8-14 1 7 3 12 8 14z" fill="$2"/>'),
    custom014: S(['hsl(348,42%,56%)', 'hsl(348,38%,76%)'],
      '<path d="M12 2l8 3v6c0 6-4 9.5-8 11-4-1.5-8-5-8-11V5z" fill="$1"/><path d="M12 5l5 2v4c0 4-2.5 6.5-5 7.5-2.5-1-5-3.5-5-7.5V7z" fill="$2"/>'),
    custom015: S(['hsl(125,42%,56%)', 'hsl(125,38%,76%)'],
      '<path d="M12 3l7 6-3 12H8L5 9z" fill="$2"/><path d="M12 3l7 6H5z" fill="$1"/>'),
    custom016: S(['hsl(263,42%,56%)', 'hsl(263,38%,76%)'],
      '<path d="M12 2v8M12 14v8M2 12h8M14 12h8M5 5l5.5 5.5M13.5 13.5L19 19M19 5l-5.5 5.5M10.5 13.5L5 19" stroke="$1" stroke-width="2.2" stroke-linecap="round"/><circle cx="12" cy="12" r="3" fill="$2"/>'),
    custom017: S(['hsl(40,42%,56%)', 'hsl(40,38%,76%)'],
      '<path d="M4 20V12a8 8 0 0116 0v8z" fill="$1"/><path d="M8 20v-7a4 4 0 018 0v7z" fill="$2"/>'),
    custom018: S(['hsl(178,42%,56%)', 'hsl(178,38%,76%)'],
      '<path d="M13 2L4 14h6l-1 8 9-12h-6z" fill="$1"/><path d="M12 5.5L7 13h4l-.6 4.5L16 10h-4z" fill="$2"/>'),
    custom019: S(['hsl(315,42%,56%)', 'hsl(315,38%,76%)'],
      '<circle cx="12" cy="12" r="8" fill="$1"/><circle cx="12" cy="12" r="3.5" fill="$2"/>'),
    custom020: S(['hsl(93,42%,56%)', 'hsl(93,38%,76%)'],
      '<circle cx="12" cy="12" r="8" fill="$1"/><circle cx="12" cy="12" r="8" fill="none" stroke="$2" stroke-width="2.4"/>'),
    custom021: S(['hsl(230,42%,56%)', 'hsl(230,38%,76%)'],
      '<path d="M12 3l7 9-7 9-7-9z" fill="$1"/><path d="M12 7l4 5-4 5-4-5z" fill="$2"/>'),
    custom022: S(['hsl(8,42%,56%)', 'hsl(8,38%,76%)'],
      '<path d="M12 4l8 15H4z" fill="$1"/><path d="M12 9l4.5 8.5h-9z" fill="$2"/>'),
    custom023: S(['hsl(145,42%,56%)', 'hsl(145,38%,76%)'],
      '<path d="M8 4h8l4 8-4 8H8l-4-8z" fill="$1"/><path d="M9.5 7h5l2.5 5-2.5 5h-5L7 12z" fill="$2"/>'),
    custom024: S(['hsl(283,42%,56%)', 'hsl(283,38%,76%)'],
      '<path d="M12 2l2.4 7.6L22 12l-7.6 2.4L12 22l-2.4-7.6L2 12l7.6-2.4z" fill="$1"/><circle cx="12" cy="12" r="3" fill="$2"/>'),
    custom025: S(['hsl(60,42%,56%)', 'hsl(60,38%,76%)'],
      '<path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6z" fill="$1"/><rect x="9" y="9" width="6" height="6" fill="$2"/>'),
    custom026: S(['hsl(198,42%,56%)', 'hsl(198,38%,76%)'],
      '<circle cx="12" cy="12" r="8" fill="$1"/><circle cx="15.5" cy="9.5" r="6.5" fill="$2"/>'),
    custom027: S(['hsl(335,42%,56%)', 'hsl(335,38%,76%)'],
      '<path d="M12 3c4 5 6 8 6 11a6 6 0 01-12 0c0-3 2-6 6-11z" fill="$1"/><ellipse cx="12" cy="15" rx="3.2" ry="3" fill="$2"/>'),
    custom028: S(['hsl(113,42%,56%)', 'hsl(113,38%,76%)'],
      '<path d="M3 9c4-3 7 3 11 0s7-3 7 1-4 6-8 3-6-3-10 0z" fill="$1"/><path d="M3 15c4-3 7 3 11 0s7-3 7 1" stroke="$2" stroke-width="1.8" fill="none" stroke-linecap="round"/>'),
    custom029: S(['hsl(250,42%,56%)', 'hsl(250,38%,76%)'],
      '<rect x="4" y="4" width="16" height="16" rx="3" fill="$1"/><rect x="8" y="8" width="8" height="8" rx="2" fill="$2"/>'),
    custom030: S(['hsl(28,42%,56%)', 'hsl(28,38%,76%)'],
      '<path d="M4 14l8-9 8 9h-5v7H9v-7z" fill="$1"/><path d="M9 14v7h6v-7" stroke="$2" stroke-width="1.8" fill="none"/>'),
    custom031: S(['hsl(165,42%,56%)', 'hsl(165,38%,76%)'],
      '<path d="M12 21c0-7 3-12 8-14-1 7-3 12-8 14z" fill="$1"/><path d="M12 21c0-7-3-12-8-14 1 7 3 12 8 14z" fill="$2"/>'),
    custom032: S(['hsl(303,42%,56%)', 'hsl(303,38%,76%)'],
      '<path d="M12 2l8 3v6c0 6-4 9.5-8 11-4-1.5-8-5-8-11V5z" fill="$1"/><path d="M12 5l5 2v4c0 4-2.5 6.5-5 7.5-2.5-1-5-3.5-5-7.5V7z" fill="$2"/>'),
    custom033: S(['hsl(80,42%,56%)', 'hsl(80,38%,76%)'],
      '<path d="M12 3l7 6-3 12H8L5 9z" fill="$2"/><path d="M12 3l7 6H5z" fill="$1"/>'),
    custom034: S(['hsl(218,42%,56%)', 'hsl(218,38%,76%)'],
      '<path d="M12 2v8M12 14v8M2 12h8M14 12h8M5 5l5.5 5.5M13.5 13.5L19 19M19 5l-5.5 5.5M10.5 13.5L5 19" stroke="$1" stroke-width="2.2" stroke-linecap="round"/><circle cx="12" cy="12" r="3" fill="$2"/>'),
    custom035: S(['hsl(355,42%,56%)', 'hsl(355,38%,76%)'],
      '<path d="M4 20V12a8 8 0 0116 0v8z" fill="$1"/><path d="M8 20v-7a4 4 0 018 0v7z" fill="$2"/>'),
    custom036: S(['hsl(133,42%,56%)', 'hsl(133,38%,76%)'],
      '<path d="M13 2L4 14h6l-1 8 9-12h-6z" fill="$1"/><path d="M12 5.5L7 13h4l-.6 4.5L16 10h-4z" fill="$2"/>'),
    custom037: S(['hsl(270,42%,56%)', 'hsl(270,38%,76%)'],
      '<circle cx="12" cy="12" r="8" fill="$1"/><circle cx="12" cy="12" r="3.5" fill="$2"/>'),
    custom038: S(['hsl(48,42%,56%)', 'hsl(48,38%,76%)'],
      '<circle cx="12" cy="12" r="8" fill="$1"/><circle cx="12" cy="12" r="8" fill="none" stroke="$2" stroke-width="2.4"/>'),
    custom039: S(['hsl(185,42%,56%)', 'hsl(185,38%,76%)'],
      '<path d="M12 3l7 9-7 9-7-9z" fill="$1"/><path d="M12 7l4 5-4 5-4-5z" fill="$2"/>'),
    custom040: S(['hsl(323,42%,56%)', 'hsl(323,38%,76%)'],
      '<path d="M12 4l8 15H4z" fill="$1"/><path d="M12 9l4.5 8.5h-9z" fill="$2"/>'),
    custom041: S(['hsl(100,42%,56%)', 'hsl(100,38%,76%)'],
      '<path d="M8 4h8l4 8-4 8H8l-4-8z" fill="$1"/><path d="M9.5 7h5l2.5 5-2.5 5h-5L7 12z" fill="$2"/>'),
    custom042: S(['hsl(238,42%,56%)', 'hsl(238,38%,76%)'],
      '<path d="M12 2l2.4 7.6L22 12l-7.6 2.4L12 22l-2.4-7.6L2 12l7.6-2.4z" fill="$1"/><circle cx="12" cy="12" r="3" fill="$2"/>'),
    custom043: S(['hsl(15,42%,56%)', 'hsl(15,38%,76%)'],
      '<path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6z" fill="$1"/><rect x="9" y="9" width="6" height="6" fill="$2"/>'),
    custom044: S(['hsl(153,42%,56%)', 'hsl(153,38%,76%)'],
      '<circle cx="12" cy="12" r="8" fill="$1"/><circle cx="15.5" cy="9.5" r="6.5" fill="$2"/>'),
    custom045: S(['hsl(290,42%,56%)', 'hsl(290,38%,76%)'],
      '<path d="M12 3c4 5 6 8 6 11a6 6 0 01-12 0c0-3 2-6 6-11z" fill="$1"/><ellipse cx="12" cy="15" rx="3.2" ry="3" fill="$2"/>'),
    custom046: S(['hsl(68,42%,56%)', 'hsl(68,38%,76%)'],
      '<path d="M3 9c4-3 7 3 11 0s7-3 7 1-4 6-8 3-6-3-10 0z" fill="$1"/><path d="M3 15c4-3 7 3 11 0s7-3 7 1" stroke="$2" stroke-width="1.8" fill="none" stroke-linecap="round"/>'),
    custom047: S(['hsl(205,42%,56%)', 'hsl(205,38%,76%)'],
      '<rect x="4" y="4" width="16" height="16" rx="3" fill="$1"/><rect x="8" y="8" width="8" height="8" rx="2" fill="$2"/>'),
    custom048: S(['hsl(343,42%,56%)', 'hsl(343,38%,76%)'],
      '<path d="M4 14l8-9 8 9h-5v7H9v-7z" fill="$1"/><path d="M9 14v7h6v-7" stroke="$2" stroke-width="1.8" fill="none"/>'),
    custom049: S(['hsl(120,42%,56%)', 'hsl(120,38%,76%)'],
      '<path d="M12 21c0-7 3-12 8-14-1 7-3 12-8 14z" fill="$1"/><path d="M12 21c0-7-3-12-8-14 1 7 3 12 8 14z" fill="$2"/>'),
    custom050: S(['hsl(258,42%,56%)', 'hsl(258,38%,76%)'],
      '<path d="M12 2l8 3v6c0 6-4 9.5-8 11-4-1.5-8-5-8-11V5z" fill="$1"/><path d="M12 5l5 2v4c0 4-2.5 6.5-5 7.5-2.5-1-5-3.5-5-7.5V7z" fill="$2"/>'),
    custom051: S(['hsl(35,42%,56%)', 'hsl(35,38%,76%)'],
      '<path d="M12 3l7 6-3 12H8L5 9z" fill="$2"/><path d="M12 3l7 6H5z" fill="$1"/>'),
    custom052: S(['hsl(173,42%,56%)', 'hsl(173,38%,76%)'],
      '<path d="M12 2v8M12 14v8M2 12h8M14 12h8M5 5l5.5 5.5M13.5 13.5L19 19M19 5l-5.5 5.5M10.5 13.5L5 19" stroke="$1" stroke-width="2.2" stroke-linecap="round"/><circle cx="12" cy="12" r="3" fill="$2"/>'),
    custom053: S(['hsl(310,42%,56%)', 'hsl(310,38%,76%)'],
      '<path d="M4 20V12a8 8 0 0116 0v8z" fill="$1"/><path d="M8 20v-7a4 4 0 018 0v7z" fill="$2"/>'),
    custom054: S(['hsl(88,42%,56%)', 'hsl(88,38%,76%)'],
      '<path d="M13 2L4 14h6l-1 8 9-12h-6z" fill="$1"/><path d="M12 5.5L7 13h4l-.6 4.5L16 10h-4z" fill="$2"/>'),
    custom055: S(['hsl(225,42%,56%)', 'hsl(225,38%,76%)'],
      '<circle cx="12" cy="12" r="8" fill="$1"/><circle cx="12" cy="12" r="3.5" fill="$2"/>'),
    custom056: S(['hsl(3,42%,56%)', 'hsl(3,38%,76%)'],
      '<circle cx="12" cy="12" r="8" fill="$1"/><circle cx="12" cy="12" r="8" fill="none" stroke="$2" stroke-width="2.4"/>'),
    custom057: S(['hsl(140,42%,56%)', 'hsl(140,38%,76%)'],
      '<path d="M12 3l7 9-7 9-7-9z" fill="$1"/><path d="M12 7l4 5-4 5-4-5z" fill="$2"/>'),
    custom058: S(['hsl(278,42%,56%)', 'hsl(278,38%,76%)'],
      '<path d="M12 4l8 15H4z" fill="$1"/><path d="M12 9l4.5 8.5h-9z" fill="$2"/>'),
    custom059: S(['hsl(55,42%,56%)', 'hsl(55,38%,76%)'],
      '<path d="M8 4h8l4 8-4 8H8l-4-8z" fill="$1"/><path d="M9.5 7h5l2.5 5-2.5 5h-5L7 12z" fill="$2"/>'),
    custom060: S(['hsl(193,42%,56%)', 'hsl(193,38%,76%)'],
      '<path d="M12 2l2.4 7.6L22 12l-7.6 2.4L12 22l-2.4-7.6L2 12l7.6-2.4z" fill="$1"/><circle cx="12" cy="12" r="3" fill="$2"/>'),
    custom061: S(['hsl(330,42%,56%)', 'hsl(330,38%,76%)'],
      '<path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6z" fill="$1"/><rect x="9" y="9" width="6" height="6" fill="$2"/>'),
    custom062: S(['hsl(108,42%,56%)', 'hsl(108,38%,76%)'],
      '<circle cx="12" cy="12" r="8" fill="$1"/><circle cx="15.5" cy="9.5" r="6.5" fill="$2"/>'),
    custom063: S(['hsl(245,42%,56%)', 'hsl(245,38%,76%)'],
      '<path d="M12 3c4 5 6 8 6 11a6 6 0 01-12 0c0-3 2-6 6-11z" fill="$1"/><ellipse cx="12" cy="15" rx="3.2" ry="3" fill="$2"/>'),
    custom064: S(['hsl(23,42%,56%)', 'hsl(23,38%,76%)'],
      '<path d="M3 9c4-3 7 3 11 0s7-3 7 1-4 6-8 3-6-3-10 0z" fill="$1"/><path d="M3 15c4-3 7 3 11 0s7-3 7 1" stroke="$2" stroke-width="1.8" fill="none" stroke-linecap="round"/>'),
    custom065: S(['hsl(160,42%,56%)', 'hsl(160,38%,76%)'],
      '<rect x="4" y="4" width="16" height="16" rx="3" fill="$1"/><rect x="8" y="8" width="8" height="8" rx="2" fill="$2"/>'),
    custom066: S(['hsl(298,42%,56%)', 'hsl(298,38%,76%)'],
      '<path d="M4 14l8-9 8 9h-5v7H9v-7z" fill="$1"/><path d="M9 14v7h6v-7" stroke="$2" stroke-width="1.8" fill="none"/>'),
    custom067: S(['hsl(75,42%,56%)', 'hsl(75,38%,76%)'],
      '<path d="M12 21c0-7 3-12 8-14-1 7-3 12-8 14z" fill="$1"/><path d="M12 21c0-7-3-12-8-14 1 7 3 12 8 14z" fill="$2"/>'),
    custom068: S(['hsl(213,42%,56%)', 'hsl(213,38%,76%)'],
      '<path d="M12 2l8 3v6c0 6-4 9.5-8 11-4-1.5-8-5-8-11V5z" fill="$1"/><path d="M12 5l5 2v4c0 4-2.5 6.5-5 7.5-2.5-1-5-3.5-5-7.5V7z" fill="$2"/>'),
    custom069: S(['hsl(350,42%,56%)', 'hsl(350,38%,76%)'],
      '<path d="M12 3l7 6-3 12H8L5 9z" fill="$2"/><path d="M12 3l7 6H5z" fill="$1"/>'),
    custom070: S(['hsl(128,42%,56%)', 'hsl(128,38%,76%)'],
      '<path d="M12 2v8M12 14v8M2 12h8M14 12h8M5 5l5.5 5.5M13.5 13.5L19 19M19 5l-5.5 5.5M10.5 13.5L5 19" stroke="$1" stroke-width="2.2" stroke-linecap="round"/><circle cx="12" cy="12" r="3" fill="$2"/>'),
    custom071: S(['hsl(265,42%,56%)', 'hsl(265,38%,76%)'],
      '<path d="M4 20V12a8 8 0 0116 0v8z" fill="$1"/><path d="M8 20v-7a4 4 0 018 0v7z" fill="$2"/>'),
    custom072: S(['hsl(43,42%,56%)', 'hsl(43,38%,76%)'],
      '<path d="M13 2L4 14h6l-1 8 9-12h-6z" fill="$1"/><path d="M12 5.5L7 13h4l-.6 4.5L16 10h-4z" fill="$2"/>'),
    custom073: S(['hsl(180,42%,56%)', 'hsl(180,38%,76%)'],
      '<circle cx="12" cy="12" r="8" fill="$1"/><circle cx="12" cy="12" r="3.5" fill="$2"/>'),
    custom074: S(['hsl(318,42%,56%)', 'hsl(318,38%,76%)'],
      '<circle cx="12" cy="12" r="8" fill="$1"/><circle cx="12" cy="12" r="8" fill="none" stroke="$2" stroke-width="2.4"/>'),
    custom075: S(['hsl(95,42%,56%)', 'hsl(95,38%,76%)'],
      '<path d="M12 3l7 9-7 9-7-9z" fill="$1"/><path d="M12 7l4 5-4 5-4-5z" fill="$2"/>'),
    custom076: S(['hsl(233,42%,56%)', 'hsl(233,38%,76%)'],
      '<path d="M12 4l8 15H4z" fill="$1"/><path d="M12 9l4.5 8.5h-9z" fill="$2"/>'),
    custom077: S(['hsl(10,42%,56%)', 'hsl(10,38%,76%)'],
      '<path d="M8 4h8l4 8-4 8H8l-4-8z" fill="$1"/><path d="M9.5 7h5l2.5 5-2.5 5h-5L7 12z" fill="$2"/>'),
    custom078: S(['hsl(148,42%,56%)', 'hsl(148,38%,76%)'],
      '<path d="M12 2l2.4 7.6L22 12l-7.6 2.4L12 22l-2.4-7.6L2 12l7.6-2.4z" fill="$1"/><circle cx="12" cy="12" r="3" fill="$2"/>'),
    custom079: S(['hsl(285,42%,56%)', 'hsl(285,38%,76%)'],
      '<path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6z" fill="$1"/><rect x="9" y="9" width="6" height="6" fill="$2"/>'),
    custom080: S(['hsl(63,42%,56%)', 'hsl(63,38%,76%)'],
      '<circle cx="12" cy="12" r="8" fill="$1"/><circle cx="15.5" cy="9.5" r="6.5" fill="$2"/>'),
    custom081: S(['hsl(200,42%,56%)', 'hsl(200,38%,76%)'],
      '<path d="M12 3c4 5 6 8 6 11a6 6 0 01-12 0c0-3 2-6 6-11z" fill="$1"/><ellipse cx="12" cy="15" rx="3.2" ry="3" fill="$2"/>'),
    custom082: S(['hsl(338,42%,56%)', 'hsl(338,38%,76%)'],
      '<path d="M3 9c4-3 7 3 11 0s7-3 7 1-4 6-8 3-6-3-10 0z" fill="$1"/><path d="M3 15c4-3 7 3 11 0s7-3 7 1" stroke="$2" stroke-width="1.8" fill="none" stroke-linecap="round"/>'),
    custom083: S(['hsl(115,42%,56%)', 'hsl(115,38%,76%)'],
      '<rect x="4" y="4" width="16" height="16" rx="3" fill="$1"/><rect x="8" y="8" width="8" height="8" rx="2" fill="$2"/>'),
    custom084: S(['hsl(253,42%,56%)', 'hsl(253,38%,76%)'],
      '<path d="M4 14l8-9 8 9h-5v7H9v-7z" fill="$1"/><path d="M9 14v7h6v-7" stroke="$2" stroke-width="1.8" fill="none"/>'),
    custom085: S(['hsl(30,42%,56%)', 'hsl(30,38%,76%)'],
      '<path d="M12 21c0-7 3-12 8-14-1 7-3 12-8 14z" fill="$1"/><path d="M12 21c0-7-3-12-8-14 1 7 3 12 8 14z" fill="$2"/>'),
    custom086: S(['hsl(168,42%,56%)', 'hsl(168,38%,76%)'],
      '<path d="M12 2l8 3v6c0 6-4 9.5-8 11-4-1.5-8-5-8-11V5z" fill="$1"/><path d="M12 5l5 2v4c0 4-2.5 6.5-5 7.5-2.5-1-5-3.5-5-7.5V7z" fill="$2"/>'),
    custom087: S(['hsl(305,42%,56%)', 'hsl(305,38%,76%)'],
      '<path d="M12 3l7 6-3 12H8L5 9z" fill="$2"/><path d="M12 3l7 6H5z" fill="$1"/>'),
    custom088: S(['hsl(83,42%,56%)', 'hsl(83,38%,76%)'],
      '<path d="M12 2v8M12 14v8M2 12h8M14 12h8M5 5l5.5 5.5M13.5 13.5L19 19M19 5l-5.5 5.5M10.5 13.5L5 19" stroke="$1" stroke-width="2.2" stroke-linecap="round"/><circle cx="12" cy="12" r="3" fill="$2"/>'),
    custom089: S(['hsl(220,42%,56%)', 'hsl(220,38%,76%)'],
      '<path d="M4 20V12a8 8 0 0116 0v8z" fill="$1"/><path d="M8 20v-7a4 4 0 018 0v7z" fill="$2"/>'),
    custom090: S(['hsl(358,42%,56%)', 'hsl(358,38%,76%)'],
      '<path d="M13 2L4 14h6l-1 8 9-12h-6z" fill="$1"/><path d="M12 5.5L7 13h4l-.6 4.5L16 10h-4z" fill="$2"/>'),
    custom091: S(['hsl(135,42%,56%)', 'hsl(135,38%,76%)'],
      '<circle cx="12" cy="12" r="8" fill="$1"/><circle cx="12" cy="12" r="3.5" fill="$2"/>'),
    custom092: S(['hsl(273,42%,56%)', 'hsl(273,38%,76%)'],
      '<circle cx="12" cy="12" r="8" fill="$1"/><circle cx="12" cy="12" r="8" fill="none" stroke="$2" stroke-width="2.4"/>'),
    custom093: S(['hsl(50,42%,56%)', 'hsl(50,38%,76%)'],
      '<path d="M12 3l7 9-7 9-7-9z" fill="$1"/><path d="M12 7l4 5-4 5-4-5z" fill="$2"/>'),
    custom094: S(['hsl(188,42%,56%)', 'hsl(188,38%,76%)'],
      '<path d="M12 4l8 15H4z" fill="$1"/><path d="M12 9l4.5 8.5h-9z" fill="$2"/>'),
    custom095: S(['hsl(325,42%,56%)', 'hsl(325,38%,76%)'],
      '<path d="M8 4h8l4 8-4 8H8l-4-8z" fill="$1"/><path d="M9.5 7h5l2.5 5-2.5 5h-5L7 12z" fill="$2"/>'),
    custom096: S(['hsl(103,42%,56%)', 'hsl(103,38%,76%)'],
      '<path d="M12 2l2.4 7.6L22 12l-7.6 2.4L12 22l-2.4-7.6L2 12l7.6-2.4z" fill="$1"/><circle cx="12" cy="12" r="3" fill="$2"/>'),
    custom097: S(['hsl(240,42%,56%)', 'hsl(240,38%,76%)'],
      '<path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6z" fill="$1"/><rect x="9" y="9" width="6" height="6" fill="$2"/>'),
    custom098: S(['hsl(18,42%,56%)', 'hsl(18,38%,76%)'],
      '<circle cx="12" cy="12" r="8" fill="$1"/><circle cx="15.5" cy="9.5" r="6.5" fill="$2"/>'),
    custom099: S(['hsl(155,42%,56%)', 'hsl(155,38%,76%)'],
      '<path d="M12 3c4 5 6 8 6 11a6 6 0 01-12 0c0-3 2-6 6-11z" fill="$1"/><ellipse cx="12" cy="15" rx="3.2" ry="3" fill="$2"/>'),
    custom100: S(['hsl(293,42%,56%)', 'hsl(293,38%,76%)'],
      '<path d="M3 9c4-3 7 3 11 0s7-3 7 1-4 6-8 3-6-3-10 0z" fill="$1"/><path d="M3 15c4-3 7 3 11 0s7-3 7 1" stroke="$2" stroke-width="1.8" fill="none" stroke-linecap="round"/>'),
  };

  /* aliases so every resource key resolves to something sensible */
  const ALIAS = {
    cookedPoultry: 'poultry', cookedSteak: 'steak', pork: 'steak',
    cookedPork: 'steak', hide: 'leather', tannedLeather: 'leather',
    berrySeed: 'flaxSeed', ruby: 'diamond', emerald: 'diamond',
    backpack: 'pack', woolPack: 'pack', lurker: 'goblin',
    ragHood: 'hood', ragShirt: 'rag', ragTrousers: 'rag',
    scrapHelm: 'helm', scrapChest: 'plate', scrapLegs: 'plate',
    highlandWool: 'cloth', highlandCloth: 'cloth',
    highlandHood: 'hood', highlandCloak: 'rag', highlandLegs: 'rag', highlandCape: 'rag',
    pond: 'water', stream: 'water', river: 'water', lake: 'water',
    fishingNet: 'net', fishingRod: 'rod',
    bluegill: 'fish', perch: 'fish', carp: 'fish', goldenKoi: 'fish',
    brookTrout: 'fish', dace: 'fish', minnow: 'fish', glassEel: 'fish',
    riverTrout: 'fish', grayling: 'fish', pike: 'fish', silverSalmon: 'fish',
    bass: 'fish', catfish: 'fish', whitefish: 'fish', moonfin: 'fish',
    smoothStone: 'stone', pebble: 'stone', driftwood: 'wood', planks: 'wood',
    moss: 'forage', lakeweed: 'pondweed',
  };
  G.ALIAS = ALIAS;      // exposed so custom-sprites.js can extend it

  const cache = {};
  G.sprite = function (name, size) {
    size = size || 20;
    const assetSrc = G.resolveSpriteAssetSrc ? G.resolveSpriteAssetSrc(name) : '';
    const key = name + '@' + size + '@' + assetSrc;
    if (cache[key]) return cache[key];
    if (G.spriteAssetTag) {
      const asset = G.spriteAssetTag(name, size);
      if (asset) { cache[key] = asset; return asset; }
    }
    const s = G.SPRITES[name] || G.SPRITES[ALIAS[name]];
    if (!s) return '';
    const body = s.d.replace(/\$1/g, s.c[0]).replace(/\$2/g, s.c[1]);
    const svg = '<svg class="emb" width="' + size + '" height="' + size +
      '" viewBox="0 0 24 24" aria-hidden="true">' + body + '</svg>';
    cache[key] = svg;
    return svg;
  };

  G.resSprite = key => (G.SPRITES[key] || ALIAS[key]) ? key : 'stone';
  G.cardSprite = function (cardKey) {
    const baseKey = G.baseCardKey ? G.baseCardKey(cardKey) : cardKey;
    const map = { flint: 'stone', stick: 'stick', forage: 'forage',
                  strikeStone: 'sword', strikeBronze: 'sword', woodenClub: 'club', shoot: 'bow',
                  pickFlint: 'axe', pickStone: 'axe', pickScrap: 'axe',
                  axeFlint: 'axe', axeStone: 'axe', oreVein: 'stone',
                  fishingNet: 'net', fishingRod: 'rod' };
    return map[baseKey] || 'cards';
  };

})(window.Game = window.Game || {});
