/* =========================================================
   systems/cards.js — one handler per card KIND.

   To add a new card kind:
     1. add `kind:'yourkind'` to a card in data.js
     2. G.registerCardKind('yourkind', { face, resolve, offline })
   The engine needs no changes.

   face(card, key)      -> { detail, blocked? }   card front text
   resolve(ctx)         -> mutate state, set ctx.gains = [{key,qty}]
                           so UI.flyToBag knows what to animate
   offline(key, c, give)-> award reduced yields while away
   ========================================================= */
(function (G) {
  'use strict';
  const T = G.TUNE;

  /* ---------- GATHER ---------------------------------------- */
  G.registerCardKind('gather', {
    face(card, key) {
      const n = G.yieldFor(key) * G.foragingMult(card) * G.cardYieldMult(card);
      const yields = [{ key: card.res, qty: n, crit: n * 2 }];
      if (G.isEncumbered()) {
        return { detail: 'pack full — no gain', blocked: true, yields };
      }
      return { detail: 'double on a clean tap', yields };
    },
    resolve(ctx) {
      ctx.gains = [];
      if (ctx.encumbered) return;
      const base = G.yieldFor(ctx.key) * G.foragingMult(ctx.card) * G.cardYieldMult(ctx.card);
      const want = ctx.hit ? base * 2 : base;
      const got = G.addRes(ctx.card.res, want);
      if (got > 0) {
        G.grantXp(ctx.card.skill, ctx.card.xp);
        ctx.gains.push({ key: ctx.card.res, qty: got });
      }
    },
    offline(key, c, give) {
      give(c.res, Math.max(1, Math.floor(G.yieldFor(key) * G.foragingMult(c) * G.cardYieldMult(c) * T.offlineRate)));
    },
  });

  /* ---------- FORAGE ---------------------------------------- */
  G.rollForage = function () {
    const got = {};
    got[Math.random() < 0.5 ? 'flax' : 'berries'] = 1;
    if (Math.random() < 0.15) got.flaxSeed = 1;
    if (Math.random() < 0.15) got.berrySeed = 1;
    return got;
  };
  /* Flax/Berries were cut to half yield (TUNE.forageHerbMult) —
     applied after every other multiplier (crit, foraging skill,
     foil) has already compounded, floored with a floor of 1 so a
     forage never rounds all the way down to nothing. Seeds are
     deliberately untouched — same chance, same quantity, as before. */
  function forageHerbQty(n) {
    return Math.max(1, Math.floor(n * G.TUNE.forageHerbMult));
  }

  G.registerCardKind('forage', {
    face(card) {
      const mult = G.foragingMult(card) * G.cardYieldMult(card);
      const herbQty = forageHerbQty(mult);
      const yields = [
        { key: 'flax', qty: herbQty, crit: forageHerbQty(mult * 2), chance: '50%' },
        { key: 'berries', qty: herbQty, crit: forageHerbQty(mult * 2), chance: '50%' },
        { key: 'flaxSeed', qty: mult, chance: '15%' },
        { key: 'berrySeed', qty: mult, chance: '15%' },
      ];
      if (G.isEncumbered()) {
        return { detail: 'pack full — no gain', blocked: true, yields };
      }
      return { detail: 'one herb, rare seeds', yields };
    },
    resolve(ctx) {
      ctx.gains = [];
      if (ctx.encumbered) return;
      const roll = G.rollForage();
      if (ctx.hit) {
        if (roll.flax) roll.flax *= 2;
        if (roll.berries) roll.berries *= 2;
      }
      const mult = G.foragingMult(ctx.card) * G.cardYieldMult(ctx.card);
      Object.keys(roll).forEach(k => { roll[k] *= mult; });
      if (roll.flax) roll.flax = forageHerbQty(roll.flax);
      if (roll.berries) roll.berries = forageHerbQty(roll.berries);
      Object.keys(roll).forEach(k => {
        const n = G.addRes(k, roll[k]);
        if (n) ctx.gains.push({ key: k, qty: n });
      });
      if (ctx.gains.length) G.grantXp(ctx.card.skill, ctx.card.xp);
    },
    offline(key, c, give) {
      const roll = G.rollForage();
      const mult = G.foragingMult(c) * G.cardYieldMult(c);
      Object.keys(roll).forEach(k => {
        let qty = roll[k] * mult;
        if (k === 'flax' || k === 'berries') qty = forageHerbQty(qty);
        give(k, Math.max(1, Math.floor(qty * T.offlineRate)));
      });
    },
  });

  /* ---------- FOOD ------------------------------------------
     Food is only ever eaten as a card now — there is no eat-from-bag
     path any more (G.eat is gone, see systems/food.js). Playing one
     heals and CONSUMES the card: it leaves the deck permanently, so
     food is a real recurring cost that the farm/cooking economy has
     to keep supplying, not a one-time craft that heals forever.

     A clean tap doubles the heal, exactly like it doubles damage and
     yields everywhere else — nothing about food is special-cased out
     of the game's core mechanic.

     Playing one at full health refuses instead of burning the card,
     matching how eating from the bag used to behave. */
  G.registerCardKind('food', {
    face(card) {
      const heal = card.heal || 0;
      if (S.hp >= G.maxHp()) {
        return { detail: 'already at full health', blocked: true, yields: [] };
      }
      return { detail: 'heals ' + heal + ' hp — eats the card', yields: [] };
    },
    resolve(ctx) {
      ctx.gains = [];
      if (S.hp >= G.maxHp()) {
        G.emit('food:refused', { key: ctx.key, reason: 'full' });
        return;
      }
      const heal = (ctx.card.heal || 0) * (ctx.hit ? 2 : 1);
      const before = S.hp;
      S.hp = Math.min(G.maxHp(), S.hp + heal);
      G.consumeCardFromDeck(ctx.key);
      if (ctx.card.skill && ctx.card.xp) G.grantXp(ctx.card.skill, ctx.card.xp);
      G.emit('food:eaten', { key: ctx.key, healed: S.hp - before });
    },
    /* nothing to award while away — you can't be hurt offline */
    offline() {},
  });

  /* ---------- MELEE -----------------------------------------
     Power is baked into the specific card (its own atk) rather
     than a flat per-player stat — a Bronze Dagger just hits harder
     than a Stone Sword, and both can sit in the deck at once.
     Targets a 'combat' location in the field — same field as
     Boulders and Pine Trees, just a different `requires`. No
     retaliation preview up front; you only learn what an animal
     hits back for once you actually swing at it (see the
     'retaliate' event, banner in main.js). */
  G.registerCardKind('melee', {
    face(card) {
      const p = card.atk;
      if (!G.activeLocation('melee')) return { detail: 'no target — wasted draw', blocked: true };
      return { detail: p + '/' + (p * 2) + ' dmg' };
    },
    resolve(ctx) {
      const power = ctx.card.atk;
      const slot = G.activeLocation('melee', ctx.target);
      if (!slot || power <= 0) return;
      ctx.dealt = true;
      const def = G.LOCATIONS[slot.key];
      const rawBack = def.atk || 0;
      const dmg = ctx.hit ? power * 2 : power;
      const result = G.damageLocation(dmg, 'melee', ctx.target);
      const killed = !!(result && result.cleared);
      if (killed && result.got) {
        ctx.gains = Object.keys(result.got).map(k => ({ key: k, qty: result.got[k] }));
      }
      G.grantXp(ctx.card.skill, ctx.card.xp);
      /* a dead animal cannot bite back */
      if (!killed && rawBack) {
        G.hurtPlayer(rawBack);
        G.emit('retaliate', { name: def.name, dmg: G.mitigate(rawBack) });
      }
    },
  });

  /* ---------- RANGED ----------------------------------------
     Damage = bow power (baked into the card) + the arrow it
     spends. Without arrows the bow still fires at base power.
     Normal enemies do not retaliate against ranged attacks; a future
     ranged-capable enemy can opt back in with `rangedRetaliate`. */
  G.registerCardKind('ranged', {
    face(card) {
      const p = card.atk;
      if (!G.activeLocation('ranged')) return { detail: 'no target — wasted draw', blocked: true };
      const ammo = G.activeConsumable('ammo');
      const base = p + (ammo ? ammo.dmg : 0);
      return { detail: base + '/' + (base * 2) + ' dmg' };
    },
    resolve(ctx) {
      const power = ctx.card.atk;
      const slot = G.activeLocation('ranged', ctx.target);
      if (!slot || power <= 0) return;
      ctx.dealt = true;
      const def = G.LOCATIONS[slot.key];
      const rawBack = def.atk || 0;
      const ammo = G.spendConsumable('ammo');
      const base = power + (ammo ? ammo.dmg : 0);
      const dmg = ctx.hit ? base * 2 : base;          // clean tap doubles
      const result = G.damageLocation(dmg, 'ranged', ctx.target);
      const killed = !!(result && result.cleared);
      if (killed && result.got) {
        ctx.gains = Object.keys(result.got).map(k => ({ key: k, qty: result.got[k] }));
      }
      G.grantXp(ctx.card.skill, ctx.card.xp);
      if (!killed && rawBack && def.rangedRetaliate) {
        G.hurtPlayer(rawBack);
        G.emit('retaliate', { name: def.name, dmg: G.mitigate(rawBack) });
      }
    },
  });

  /* ---------- MINE ------------------------------------------
     Damages the field's active Boulder/Ore Vein — the same
     combat-style pattern melee/ranged already use, just aimed at
     a location instead of an enemy. Power is baked into the pick
     card itself, same as melee/ranged. Resources pay out all at
     once when the target clears (see G.damageLocation), animated
     via the 'location:cleared' event rather than ctx.gains. */
  G.registerCardKind('mine', {
    face(card) {
      if (!G.activeLocation('mine')) return { detail: 'no target — wasted draw', blocked: true };
      return { detail: 'breaks down the target' };
    },
    resolve(ctx) {
      if (!G.activeLocation('mine', ctx.target)) return;
      ctx.dealt = true;
      const power = ctx.card.atk;
      const dmg = ctx.hit ? power * 2 : power;
      const result = G.damageLocation(dmg, 'mine', ctx.target);
      if (result && result.cleared && result.got) {
        ctx.gains = Object.keys(result.got).map(k => ({ key: k, qty: result.got[k] }));
      }
      G.grantXp(ctx.card.skill, ctx.card.xp);
    },
  });

  /* ---------- AXE ---------------------------------------------
     Damages the field's active Pine Tree — identical shape to
     'mine', just aimed at 'axe'-gated locations instead. */
  G.registerCardKind('axe', {
    face(card, key) {
      if (!G.activeLocation('axe', null, key)) return { detail: 'no target — wasted draw', blocked: true };
      return { detail: 'chops down the target' };
    },
    resolve(ctx) {
      if (!G.activeLocation('axe', ctx.target, ctx.key)) return;
      ctx.dealt = true;
      const power = ctx.card.atk;
      const dmg = ctx.hit ? power * 2 : power;
      const result = G.damageLocation(dmg, 'axe', ctx.target, ctx.key);
      if (result && result.cleared && result.got) {
        ctx.gains = Object.keys(result.got).map(k => ({ key: k, qty: result.got[k] }));
      }
      G.grantXp(ctx.card.skill, ctx.card.xp);
    },
  });

  /* ---------- FISHING ----------------------------------------
     Water locations are regular field targets, just gated to a
     dedicated card kind so they can coexist with mining/woodcutting
     without special-case engine logic. */
  G.registerCardKind('fishing', {
    face(card) {
      if (!G.activeLocation('fishing')) return { detail: 'no water here — wasted draw', blocked: true };
      const power = card.atk;
      return { detail: power + '/' + (power * 2) + ' cast power' };
    },
    resolve(ctx) {
      if (!G.activeLocation('fishing', ctx.target)) return;
      ctx.dealt = true;
      const power = ctx.card.atk;
      const dmg = ctx.hit ? power * 2 : power;
      const result = G.damageLocation(dmg, 'fishing', ctx.target);
      if (result && result.cleared && result.got) {
        ctx.gains = Object.keys(result.got).map(k => ({ key: k, qty: result.got[k] }));
      }
      G.grantXp(ctx.card.skill, ctx.card.xp);
    },
  });

  /* ---------- EVENT ---------------------------------------------
     A status card — storms, floods, plague, whatever a zone's deck
     wants to throw at the player. Applies (or refreshes) the status
     named in card.status; see G.STATUS_EFFECTS in data.js and
     G.applyStatus in engine.js for the actual effect and how it
     clears. No target, always resolves. */
  G.registerCardKind('event', {
    face(card) {
      const def = G.STATUS_EFFECTS[card.status];
      return { detail: def ? def.desc : 'something changes' };
    },
    resolve(ctx) {
      G.applyStatus(ctx.card.status);
      G.grantXp(ctx.card.skill, ctx.card.xp);
    },
  });

})(window.Game = window.Game || {});
