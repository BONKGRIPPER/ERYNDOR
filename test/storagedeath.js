const { boot, trial } = require('./harness');

console.log('== storage + death ==');
const { G } = boot();

trial('zone crate stores items once per deck cycle', () => {
  G.wipe();
  S.zone = 'aerendell';
  S.stick = 5; S.weight = 0.5;
  const moved = G.depositAllToStorage('crate');
  if (!moved || moved.stick !== 5) throw new Error('crate deposit failed');
  if (S.stick !== 0) throw new Error('inventory did not empty');
  if (G.storageReady()) throw new Error('storage should be spent for this cycle');
});

trial('shared bank survives between bank zones', () => {
  G.wipe();
  S.zone = 'aerendell';
  S.gold = 10; S.weight = 0.1;
  G.depositAllToStorage('bank');
  S.kills = 999;
  G.travel('forestRoad');
  G.travel('kharBarak');
  if ((G.currentBank().gold || 0) !== 10) throw new Error('bank inventory did not persist across bank zones');
});

trial('crafting pulls from pack, crate, and bank in a city', () => {
  G.wipe();
  S.zone = 'kharBarak';
  S.built.furnace = true;
  S.tin = 1; S.copper = 0; S.charcoal = 0; S.weight = 1;
  G.currentCrate().copper = 1;
  G.currentBank().charcoal = 1;
  if (!G.craft('bronzeBar')) throw new Error('craft should succeed from mixed storage sources');
  if (S.bronzeBar !== 1) throw new Error('craft result missing');
  if (S.tin !== 0) throw new Error('inventory source not spent');
  if ((G.currentCrate().copper || 0) !== 0) throw new Error('crate source not spent');
  if ((G.currentBank().charcoal || 0) !== 0) throw new Error('bank source not spent');
});

trial('balanced death applies wounded and lighter loss', () => {
  G.wipe();
  S.stone = 10; S.gold = 12; S.weight = 10;
  G.downPlayer();
  if (S.stone !== 7) throw new Error('expected 35% stone loss');
  if (S.gold !== 12) throw new Error('gold should be kept');
  if (!G.hasStatus('wounded')) throw new Error('wounded status missing');
  if (S.hp !== G.maxHp()) throw new Error('hp should be restored');
});
