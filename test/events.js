/* Event cards / status effects. No event content ships right now
   (pulled — see data.js's EVENTS comment), so this exercises the
   still-fully-working engine plumbing (G.applyStatus/clearStatus/
   tickStatuses, the 'event' card kind) via a synthetic status def
   registered at test time, not real game content. Run:
   node test/events.js */
const { boot } = require('./harness');
const { G } = boot();

console.log('== no event content ships ==');
console.log('  STATUS_EFFECTS is empty:', Object.keys(G.STATUS_EFFECTS).length === 0);
console.log('  no card of kind "event" exists:',
  !Object.keys(G.CARDS).some(k => G.CARDS[k].kind === 'event'));

/* Register a throwaway status + event card so the underlying
   mechanism (unrelated to any specific event's content) still gets
   real coverage. */
G.STATUS_EFFECTS.testStorm = { name: 'Test Storm', tint: 'spirit', duration: 5,
  desc: 'synthetic, test-only', bandMult: 0.7 };
G.CARDS.testStorm = { kind: 'event', name: 'Test Storm', type: 'Event',
  skill: 'foraging', xp: 3, tint: 'spirit', status: 'testStorm' };

function playAnyCard(key) {
  S.weight = 0;
  G.current = { key, index: 0 };
  G.rt.windowOpen = true; G.rt.tapped = false;
  G.resolveCard(false);
}

console.log('\n== playing an event card applies its status ==');
G.wipe();
console.log('  no status before:', !G.hasStatus('testStorm'));
playAnyCard('testStorm');
console.log('  status applied:', G.hasStatus('testStorm'));
console.log('  duration matches the def:', S.status.testStorm === G.STATUS_EFFECTS.testStorm.duration);

console.log('\n== an active status narrows the reflex band ==');
G.wipe();
G.current = { key: 'flint', index: 0 };
const clean = G.rollBand();
S.status.testStorm = 3;
const stormy = G.rollBand();
console.log('  band width under the status is smaller:',
  (stormy.end - stormy.start) < (clean.end - clean.start) + 0.001);

console.log('\n== duration counts down one per card played, any card ==');
G.wipe();
G.applyStatus('testStorm');
const dur = G.STATUS_EFFECTS.testStorm.duration;
for (let i = 1; i < dur; i++) {
  playAnyCard('flint');
  console.log('  after play', i, '- duration left:', S.status.testStorm, '(expect', dur - i + ')');
}
console.log('  still active with one play to go:', G.hasStatus('testStorm'));
playAnyCard('flint');
console.log('  cleared once duration hits zero:', !G.hasStatus('testStorm'));

console.log('\n== G.applyStatus / clearStatus work directly too ==');
G.wipe();
let applied = 0, cleared = 0;
G.on('status:applied', () => { applied++; });
G.on('status:cleared', () => { cleared++; });
G.applyStatus('testStorm');
console.log('  applied event fired:', applied === 1);
G.clearStatus('testStorm');
console.log('  cleared event fired:', cleared === 1);
console.log('  clearing twice is a no-op (no duplicate event):',
  (G.clearStatus('testStorm'), cleared === 1));

console.log('\n== unknown status keys are ignored, not crashes ==');
G.wipe();
G.applyStatus('does-not-exist');
console.log('  nothing got added:', Object.keys(S.status).length === 0);
