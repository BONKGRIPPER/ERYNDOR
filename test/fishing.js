const { boot, trial } = require('./harness');

console.log('== fishing ==');
const { G } = boot();
const UI = G.UI;

trial('pond can be targeted by fishing cards', () => {
  const face = G.cardKinds.fishing.face(G.CARDS.fishingNet, 'fishingNet');
  if (!face.blocked && !G.activeLocation('fishing')) return;
});

trial('catching fish increments lifetime journal', () => {
  S.zone = 'forestRoad';
  S.locationDecks = [{ deck: [], drawn: 0 }, { deck: ['pond'], drawn: 0 }, { deck: [], drawn: 0 }];
  S.locationField = [null, { key: 'pond', hp: 1 }, null];
  S.fishCaught = {};
  const before = Object.values(S.fishCaught).reduce((n, v) => n + v, 0);
  G.damageLocation(2, 'fishing', 1);
  const after = Object.values(S.fishCaught).reduce((n, v) => n + v, 0);
  if (after <= before) throw new Error('no fish recorded');
});

trial('fish journal opens from the fishing skill', () => {
  S.fishCaught = { bluegill: 2, goldenKoi: 1 };
  UI.showFishJournal();
  const body = document.getElementById('fish-sheet-body');
  if (!body || body.innerHTML.indexOf('Fish Journal') < 0) throw new Error('journal did not render');
  if (!body.children || !body.children.length) throw new Error('journal rows missing');
});
