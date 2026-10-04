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

  // Remembers which reactions each bot already tried on the current
  // Whoopsies so two bots can't bounce a card back and forth forever.
  static tried = new Set();

  static value(card)   { return Bot.VALUE[card.id] ?? 1; }
  static lowest(cards)  { return [...cards].sort((a, b) => Bot.value(a) - Bot.value(b))[0] ?? null; }
  static highest(cards) { return [...cards].sort((a, b) => Bot.value(b) - Bot.value(a))[0] ?? null; }
  static coin(p)        { return Math.random() < p; }

  // The player to pick on: most lives, then most cards
  static leader(candidates) {
    return [...candidates].sort((a, b) =>
      (b.lives - a.lives) || (b.hand.length - a.hand.length) || (Math.random() - .5))[0];
  }

  static pickPlayer(bot, candidates, purpose = 'harm') {
    const others = candidates.filter(p => p.id !== bot.id);
    if (purpose === 'help') return candidates.find(p => p.id === bot.id) ?? candidates[0];
    if (purpose === 'cards') {
      return [...(others.length ? others : candidates)].sort((a, b) => b.hand.length - a.hand.length)[0];
    }
    return Bot.leader(others.length ? others : candidates);
  }

  static pickCard(bot, cards, purpose = 'discard') {
    return ['trash', 'take', 'recover'].includes(purpose) ? Bot.highest(cards) : Bot.lowest(cards);
  }

  // Rough "how likely is this Whoopsies to cost p a life" (0–1)
  static harm(w, p) {
    switch (w.id) {
      case 'w_escape':     return 0;
      case 'w_shark':      return p.hand.length < 3 ? 1 : 0;
      case 'w_toaster':
      case 'w_texting':    return p.hand.length ? .3 : 1;
      case 'w_bear':       return .2;
      case 'w_leftovers':  return .3;
      case 'w_tiles':      return .5;
      case 'w_outofluck':  return .45;
      case 'w_shoelaces':  return .8;
      case 'w_sunglasses': return 1;
      default:             return .5;
    }
  }

  // ── On its own turn ───────────────────────────────────────
  static chooseTurnCard(bot) {
    const ok = bot.hand.filter(c => canPlayOnTurn(bot, c).ok);
    const has = id => ok.find(c => c.id === id);
    const others = G.activePlayers.filter(o => o.id !== bot.id);

    if (has('a_draw2')) return has('a_draw2');
    if (has('a_second_chance')) return has('a_second_chance');
    if (has('a_recover') && G.actionDeck.getAllDiscards().some(c => Bot.value(c) >= 7)) return has('a_recover');
    if (has('a_take1')) return has('a_take1');
    if (has('a_safety') && bot.lives === 1 && !G.safetyActive) return has('a_safety');
    if (has('a_peek') && Bot.coin(.6)) return has('a_peek');
    if (has('a_swap') && others.some(o => o.hand.length >= bot.hand.length + 3)) return has('a_swap');
    if (has('a_skip') && Bot.coin(.3)) return has('a_skip');
    return null;
  }

  static wantsAbility(bot) {
    if (!canUseTurnAbility(bot).ok) return false;
    switch (bot.character.id) {
      case 'c_fester': return bot.hand.length >= 4 && Bot.coin(.6);
      case 'c_pete':   return Bot.coin(.5);
      case 'c_carl':   return Bot.coin(.55);
      case 'c_bella':  return Bot.coin(.4);
      case 'c_nina':   return Bot.coin(.5);
      case 'c_franky': return Bot.coin(.5);
      default:         return false;
    }
  }

  // Order cards for Peek Ahead / Curious Carl / Bold Bella
  static arrange(bot, cards, kind) {
    const idx = cards.map((_, i) => i);
    if (kind === 'action') return idx.sort((a, b) => Bot.value(cards[b]) - Bot.value(cards[a]));
    // Whoopsies: about to flip on its own turn → easiest first.
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
    const w = G.currentWhoopsies;
    const key = `${bot.id}:${G.whoopsiesTargetIdx}:${w.instanceId}`;
    if (Bot.tried.has(key)) return null;

    const isTarget = bot.id === G.whoopsiesTargetIdx;
    const playable = bot.hand.filter(c => canReact(bot, c).ok);
    const has = id => playable.find(c => c.id === id);
    let choice = null;

    if (isTarget && Bot.harm(w, bot) >= .5) {
      if (has('a_redirect'))       choice = { type: 'card', card: has('a_redirect') };
      else if (has('a_slip'))      choice = { type: 'card', card: has('a_slip') };
      else if (has('a_not_today')) choice = { type: 'card', card: has('a_not_today') };
      else if (bot.canUseAbility() && bot.character.id === 'c_rosie') choice = { type: 'rosie' };
      else if (bot.canUseAbility() && bot.character.id === 'c_lou' && Bot.coin(.7)) choice = { type: 'lou' };
    }
    if (!choice && has('a_second_chance') && bot.lives < bot.maxLives) {
      choice = { type: 'card', card: has('a_second_chance') };
    }
    if (choice) Bot.tried.add(key);
    return choice;
  }

  static wantsCancel(bot, player, card) {
    switch (card.id) {
      case 'a_slip':
        return G.currentWhoopsies && G.playerToLeft(G.whoopsiesTargetIdx) === bot.id;
      case 'a_redirect':
      case 'a_take1':
      case 'a_swap':        return Bot.coin(.4);
      case 'a_not_today':   return Bot.coin(.25);
      case 'a_cancel':      return Bot.coin(.3);
      default:              return Bot.coin(.12);
    }
  }

  static wantsReroll(mel, roller, value, reason) {
    const outOfLuck = reason.includes('Out of Luck');
    if (roller.id === mel.id) return outOfLuck ? value <= 2 : value < 4;
    return !outOfLuck && value >= 4 && Bot.coin(.5);
  }

  static wantsCopy(card) {
    return ['a_draw2', 'a_take1', 'a_second_chance', 'a_recover'].includes(card.id);
  }

  static wantsToSave(bot) { return bot.hand.length >= 4 && Bot.coin(.3); }

  static leftoversChoice(bot) {
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
