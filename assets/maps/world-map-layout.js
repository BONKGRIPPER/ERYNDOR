// Shared by the game and local map editor. Coordinates use a fixed atlas space,
// independent of artwork resolution. Replace with an editor export to apply edits.
globalThis.ERYNDOR_MAP_LAYOUT = {
  version: 1,
  world: { width: 1752, height: 898, image: 'assets/maps/eryndor-world.png' },
  places: {
    aerendell: { x: 489, y: 722 }, forestRoad: { x: 529, y: 665 },
    thalBarak: { x: 580, y: 559 }, stilltidePass: { x: 687, y: 651 },
    duunVaelBridge: { x: 839, y: 738 }, riverhold: { x: 970, y: 737 }
  },
  routes: {
    'aerendell-forestRoad': [[489,722],[502,698],[520,684],[529,665]],
    'forestRoad-thalBarak': [[529,665],[551,640],[566,605],[580,559]],
    'thalBarak-stilltidePass': [[580,559],[610,581],[627,613],[660,627],[687,651]],
    'stilltidePass-duunVaelBridge': [[687,651],[719,677],[741,716],[780,729],[839,738]],
    'duunVaelBridge-riverhold': [[839,738],[878,758],[918,755],[970,737]]
  }
};
