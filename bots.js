// =============================================================
//  LAST LAUGH — Bots
//  Computer players so you can test (or play) on your own.
//
//  OOP LESSON: Bot is a class made only of STATIC methods.
//  There is no "new Bot()": it's a toolbox of decisions the UI
//  asks whenever a Player with isBot = true has to choose.
//  The bot reads the same Game state a human sees on screen.
// =============================================================

class Bot {
  // How much a bot wants to keep each Action card (higher = keep)
  static VALUE = {
    a_not_today: 10, a_redirect: 9, a_slip: 8, a_second_chance: 8,
    a_cancel: 7, a_safety: 6, a_take1: 5, a_double: 5, a_swap: 4,
    a_peek: 4, a_skip: 3, a_draw2: 3, a_recover: 2,
  };

  static value(card)   { return Bot.VALUE[card.id] ?? 1; }
  static lowest(cards)  { return [...cards].sort((a, b) => Bot.value(a) - Bot.value(b))[0] ?? null; }
  static highest(cards) { return [...cards].sort((a, b) => Bot.value(b) - Bot.value(a))[0] ?? null; }
  static coin(p)        { return Math.random() < p; }

  // How sharp the bot plays: 1 = full strength (normal games). Story mode
  // starts low, so early bots sometimes miss a play or forget to react.
  static skill = 1;
  static sharp()        { return Math.random() < Bot.skill; }

  // Who to pick on: bots gang up on real people. Among those, (or in an
  // all-bot game) go after whoever is winning: most lives, then most cards.
  static threat(p) { return p.lives * 10 + p.hand.length; }
  static leader(candidates) {
    const people = candidates.filter(p => !p.isBot);
    const pool = people.length ? people : candidates;
    return [...pool].sort((a, b) => (Bot.threat(b) - Bot.threat(a)) || (Math.random() - .5))[0];
  }

  static handValue(p) { return p.hand.reduce((n, c) => n + Bot.value(c), 0); }

  static pickPlayer(bot, candidates, purpose = 'harm') {
    const others = candidates.filter(p => p.id !== bot.id);
    const pool = others.length ? others : candidates;
    if (purpose === 'help') return candidates.find(p => p.id === bot.id) ?? candidates[0];
    if (purpose === 'cards') {   // most cards, real people first
      const withCards = pool.filter(p => p.hand.length);
      const people = withCards.filter(p => !p.isBot);
      return [...(people.length ? people : withCards.length ? withCards : pool)].sort((a, b) => b.hand.length - a.hand.length)[0];
    }
    if (purpose === 'swap') {    // the best hand to trade into
      return [...pool].sort((a, b) => Bot.handValue(b) - Bot.handValue(a))[0];
    }
    return Bot.leader(pool);
  }

  static pickCard(bot, cards, purpose = 'discard') {
    return ['trash', 'take', 'recover'].includes(purpose) ? Bot.highest(cards) : Bot.lowest(cards);
  }

  // Rough "how likely is this Whoopsies to cost p a life" (0-1)
  static harm(w, p) {
    switch (w.id) {
      case 'w_escape':     return 0;
      case 'w_shark':      return p.hand.length < 3 ? 1 : 0;
      case 'w_toaster':
      case 'w_texting':    return p.hand.length ? .35 : 1;
      case 'w_bear':       return G.currentPassedBear ? 1 : .25;
      case 'w_leftovers':  return .3;
      case 'w_tiles':      return .5;
      case 'w_outofluck':  return .4;
      case 'w_shoelaces':  return .8;
      case 'w_sunglasses': return 1;
      default:             return .5;
    }
  }

  static has(cards, id) { return cards.find(c => c.id === id); }

  // ── On its own turn ───────────────────────────────────────
  static chooseTurnCard(bot) {
    if (Math.random() > 0.6 + Bot.skill * 0.4) return null;   // weaker bots sometimes hold back
    const ok = bot.hand.filter(c => canPlayOnTurn(bot, c).ok);
    const has = id => Bot.has(ok, id);
    const others = G.activePlayers.filter(o => o.id !== bot.id);
    const tableHarm = bot.table.reduce((n, e) => n + Bot.harm(e.card, bot), 0);

    if (has('a_draw2')) return has('a_draw2');
    if (has('a_safety') && !G.safetyActive && (bot.lives === 1 || tableHarm >= .8)) return has('a_safety');
    if (has('a_second_chance') && bot.lives <= bot.maxLives - 2) return has('a_second_chance');
    if (has('a_recover') && G.actionDeck.getAllDiscards().some(c => Bot.value(c) >= 8)) return has('a_recover');
    if (has('a_take1') && others.some(o => o.hand.length)) return has('a_take1');
    if (has('a_swap') && others.some(o => Bot.handValue(o) >= Bot.handValue(bot) + 6)) return has('a_swap');
    if (has('a_double') && Bot.coin(.7)) return has('a_double');          // makes YOU flip more
    if (has('a_skip') && Bot.coin(.6)) return has('a_skip');              // skips the leader
    if (has('a_peek') && !G.flippedThisTurn) return has('a_peek');        // line up an easy flip
    return null;
  }

  static wantsAbility(bot) {
    if (!canUseTurnAbility(bot).ok || !Bot.sharp()) return false;
    switch (bot.character.id) {
      case 'c_fester': return bot.hand.length >= 2 && Bot.coin(.85);
      case 'c_pete':   return Bot.coin(.6);
      case 'c_carl':   return !G.flippedThisTurn && Bot.coin(.85);
      case 'c_bella':  return Bot.coin(.5);
      case 'c_nina':   return Bot.coin(.75);
      case 'c_franky': return Bot.coin(.85);
      default:         return false;
    }
  }

  // Order cards for Peek Ahead / Curious Carl / Bold Bella
  static arrange(bot, cards, kind) {
    const idx = cards.map((_, i) => i);
    if (kind === 'action') return idx.sort((a, b) => Bot.value(cards[b]) - Bot.value(cards[a]));
    // Whoopsies: about to flip on its own turn -> easiest first.
    // Otherwise make life harder for whoever flips next.
    const mine = G.currentPlayerIdx === bot.id && !G.currentWhoopsies;
    const victim = mine ? bot : G.currentPlayer;
    return idx.sort((a, b) => mine
      ? Bot.harm(cards[a], victim) - Bot.harm(cards[b], victim)
      : Bot.harm(cards[b], victim) - Bot.harm(cards[a], victim));
  }

  // ── Reacting to a Whoopsies ───────────────────────────────
  // Returns { type: 'card', card } | { type: 'rosie' } | { type: 'lou' } | null
  static reaction(bot) {
    if (!Bot.sharp()) return null;   // weaker bots sometimes forget to react
    const w = G.currentWhoopsies;
    const isTarget = bot.id === G.whoopsiesTargetIdx;
    const playable = bot.hand.filter(c => canReact(bot, c).ok);
    const has = id => Bot.has(playable, id);
    const harm = Bot.harm(w, bot);
    const dodges = playable.filter(c => ['a_redirect', 'a_slip', 'a_not_today'].includes(c.id)).length;

    if (isTarget && harm > 0) {
      // Fix the problem first if a turn card can (Draw 2 before the shark checks)
      if (w.id === 'w_shark' && bot.hand.length < 3 && has('a_draw2')) return { type: 'card', card: has('a_draw2') };
      if (['w_toaster', 'w_texting'].includes(w.id) && bot.hand.length === 1 && has('a_draw2')) {
        return { type: 'card', card: has('a_draw2') };
      }
      // Dodge anything that really hurts; with spare dodges, pass on small trouble too
      if (harm >= .45 || (harm >= .25 && dodges >= 2)) {
        if (has('a_redirect')) return { type: 'card', card: has('a_redirect') };
        if (has('a_slip'))     return { type: 'card', card: has('a_slip') };
        if (harm >= .45 && has('a_not_today')) return { type: 'card', card: has('a_not_today') };
        if (harm >= .45 && bot.canUseAbility() && bot.character.id === 'c_rosie') return { type: 'rosie' };
        if (harm >= .45 && bot.canUseAbility() && bot.character.id === 'c_lou' && bot.id === G.currentPlayerIdx) return { type: 'lou' };
      }
    }
    // Second Chance is best saved for the moment a life is about to go
    if (has('a_second_chance') && bot.lives <= bot.maxLives - 2) return { type: 'card', card: has('a_second_chance') };
    return null;
  }

  // Should the bot Cancel `card`, just played by `player`?
  static wantsCancel(bot, player, card) {
    if (!Bot.sharp()) return false;
    const duel = G.activePlayers.length === 2;   // 1-on-1: anything aimed outward hits the bot
    const w = G.currentWhoopsies;
    switch (card.id) {
      case 'a_slip':
        return !!w && G.playerToLeft(G.whoopsiesTargetIdx) === bot.id;
      case 'a_redirect':
        return duel || Bot.coin(.45);
      case 'a_take1':
      case 'a_swap':
        return duel ? (Bot.handValue(bot) >= 10 || Bot.coin(.6)) : Bot.coin(.35);
      case 'a_not_today':                         // make them eat it
        return !!w && Bot.harm(w, player) >= .5 && (duel || Bot.coin(.6));
      case 'a_second_chance':
        return player.lives <= 1 || Bot.coin(.35);
      case 'a_double':
      case 'a_skip':
        return duel || Bot.coin(.35);
      case 'a_cancel': {
        // Cancel a Cancel when it was stopping the bot's own card
        const stack = G.cancelStack || [];
        const under = stack[stack.length - 2];
        return !!under && under.player.id === bot.id;
      }
      default:
        return duel ? Bot.coin(.3) : Bot.coin(.12);
    }
  }

  static wantsReroll(mel, roller, value, reason) {
    const outOfLuck = reason.includes('Out of Luck');
    if (roller.id === mel.id) return outOfLuck ? value <= 2 : value < 4;
    return outOfLuck ? (value >= 3 && value <= 4 && Bot.coin(.5)) : value >= 4;   // sabotage the others
  }

  static wantsCopy(card) {
    return ['a_draw2', 'a_take1', 'a_second_chance', 'a_recover', 'a_peek'].includes(card.id);
  }

  static wantsToSave(bot) { return bot.hand.length >= 5 && Bot.coin(.2); }

  static wantsBearPass() { return Bot.coin(.95); }

  static leftoversChoice(bot) {
    // Keep valuable abilities; dump two low cards if the hand is big enough
    const lowTwo = [...bot.hand].sort((a, b) => Bot.value(a) - Bot.value(b)).slice(0, 2);
    if (bot.hand.length >= 4 && lowTwo.every(c => Bot.value(c) <= 5)) return 'cards';
    if (bot.abilitiesLeft > 0) return 'ability';
    if (bot.hand.length >= 2) return 'cards';
    return 'life';
  }

  // A bit of trash talk for the Table Talk box
  static LINES = {
    redirect: ['Not my problem! 😈', 'Catch! 👉', 'Sorry not sorry', 'Enjoy 😂'],
    hurt:     ['FAHHH!', 'Ouch… 😵', 'Nooo! 😱', 'I\'ll remember that.'],
    dodge:    ['Too easy 😎', 'Not today!', 'Hehe 😏'],
  };

  static line(kind) {
    const l = Bot.LINES[kind];
    return l[Math.floor(Math.random() * l.length)];
  }
}
