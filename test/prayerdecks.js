const { boot, trial } = require('./harness');

console.log('== prayer decks ==');
const { G } = boot();

trial('prayer milestones scale point gain and move cost', () => {
  S.skills.prayer.lv = 100;
  if (G.prayerPointMult() !== 32) throw new Error('expected 32x prayer points at lv100');
  if (G.deckMoveCost() !== 0) throw new Error('deck move cost should be free at lv100');
});

trial('deck slots unlock every 10 prayer levels', () => {
  S.skills.prayer.lv = 21;
  if (G.unlockedDeckSlots() !== 3) throw new Error('expected 3 unlocked deck slots at lv21');
});

trial('moving a card to another deck slot works', () => {
  G.wipe();
  S.skills.prayer.lv = 100;
  S.prayerPoints = 999;
  G.ensureDeckSlots();
  const before = S.deck.length;
  if (!G.moveCardToDeckSlot(S.deck[0], 1)) throw new Error('move failed');
  if (S.deck.length !== before - 1) throw new Error('source deck size did not shrink');
  if (!S.deckSlots[1].deck.length) throw new Error('target deck did not receive card');
  if (!G.switchDeckSlot(1)) throw new Error('could not switch to populated deck slot');
});

trial('preferred zone deck auto-equips on travel', () => {
  G.wipe();
  S.skills.prayer.lv = 100;
  S.prayerPoints = 999;
  G.ensureDeckSlots();
  G.moveCardToDeckSlot(S.deck[0], 1);
  const targetDeck = G.ensureDeckSlotExists(1).deck.slice();
  G.setPreferredDeckForZone('forestRoad', 1);
  S.kills = 999;
  G.travel('forestRoad');
  if (S.activeDeckSlot !== 1) throw new Error('preferred deck slot not equipped');
  if (JSON.stringify(S.deck) !== JSON.stringify(targetDeck)) throw new Error('active deck contents did not switch to preferred slot');
});

trial('durability is disabled cleanly', () => {
  G.wipe();
  S.flint = 20; S.stick = 20;
  if (!G.craft('flintPick')) throw new Error('flintPick craft failed');
  if (S.durability.pickFlint != null) throw new Error('durability should stay unset');
});
