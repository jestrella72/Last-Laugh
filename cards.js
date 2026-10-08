// =============================================================
//  LAST LAUGH — Card Definitions
//  OOP LESSON FILE 1: Classes, Inheritance, Polymorphism
// =============================================================

/*
 * ┌─────────────────────────────────────────────────────────┐
 *  OOP CONCEPT #1 — CLASS
 *  A class is a BLUEPRINT for creating objects.
 *  Think of it like a recipe card: the class describes
 *  what properties and actions every Card will have.
 *  When you write  new Card(...)  you bake a cookie from
 *  that recipe. Each cookie is an independent "object".
 * └─────────────────────────────────────────────────────────┘
 */

const IMG = 'images/cards/';

// Every card says WHEN it can be played. These match the coloured
// tags printed on the cards.
const TIMING = {
  YOUR_TURN: 'your_turn',   // black tag  — "During Your Turn"
  ANY_TIME:  'any_time',    // blue tag   — "Play At Any Time"
  REACTION:  'reaction',    // red tag    — "Reaction"
};

const TIMING_LABEL = {
  your_turn: 'During Your Turn',
  any_time:  'Play At Any Time',
  reaction:  'Reaction',
};

class Card {
  // The constructor runs ONCE when you do: new Card(...)
  // "this" refers to the specific object being created.
  constructor(id, name, type, image, copies) {
    this.id      = id;       // unique key,  e.g. 'w_toaster'
    this.name    = name;     // display name
    this.type    = type;     // 'whoopsies' | 'action' | 'character'
    this.image   = image;    // file path,   e.g. 'images/cards/w-toaster.webp'
    this.copies  = copies;   // how many go into the deck
  }

  // A method every card inherits — can be overridden by children
  describe() {
    return `${this.name} [${this.type}]`;
  }
}

/*
 * ┌─────────────────────────────────────────────────────────┐
 *  OOP CONCEPT #2 — INHERITANCE  (extends / super)
 *  WhoopsiesCard IS A Card.  It gets everything Card has,
 *  then adds its own Whoopsies-specific stuff.
 *  super() calls the parent's constructor first — required.
 * └─────────────────────────────────────────────────────────┘
 *
 * ┌─────────────────────────────────────────────────────────┐
 *  OOP CONCEPT #3 — POLYMORPHISM
 *  All three subclasses have a describe() method, but each
 *  returns something different.  Same name → different shapes.
 *  The correct version is called automatically at runtime.
 * └─────────────────────────────────────────────────────────┘
 */

class WhoopsiesCard extends Card {
  // unstoppable = true means only Slip Away / Redirect can help
  constructor(id, name, image, copies, effectText, unstoppable = false) {
    super(id, name, 'whoopsies', image, copies); // call parent first
    this.effectText  = effectText;
    this.unstoppable = unstoppable;
  }

  describe() { return `⚠️ WHOOPSIES: ${this.name}`; }
}

class ActionCard extends Card {
  constructor(id, name, image, copies, timing, effectText) {
    super(id, name, 'action', image, copies);
    this.timing     = timing;      // one of TIMING
    this.effectText = effectText;
  }

  /*
   * OOP CONCEPT #4 — GETTER
   * A getter looks like a property but runs code when read.
   * card.canPlayAnytime  (no parentheses!)
   */
  get canPlayAnytime() { return this.timing !== TIMING.YOUR_TURN; }
  get timingLabel()    { return TIMING_LABEL[this.timing]; }

  describe() { return `🃏 ${this.name} — ${this.timingLabel}`; }
}

class CharacterCard extends Card {
  // uses = how many ace icons are printed on the card
  // extra (optional): { boss, locked, portrait }
  //   boss     — a Boss Card (gold frame)
  //   locked   — has to be unlocked before you can pick it
  //   portrait — CSS background-position for the round portrait
  constructor(id, name, image, uses, timing, abilityText, extra = {}) {
    super(id, name, 'character', image, 1);
    this.uses        = uses;
    this.timing      = timing;
    this.abilityText = abilityText;
    this.boss        = !!extra.boss;
    this.locked      = !!extra.locked;
    this.portrait    = extra.portrait || '';
  }

  get timingLabel() { return TIMING_LABEL[this.timing]; }

  // Does this character get an ability button on its own turn?
  // (Casey triggers by herself; Leo can be used any time, so on your turn too.)
  get hasTurnButton() {
    return (this.timing === TIMING.YOUR_TURN && this.id !== 'c_casey') || this.id === 'c_leo';
  }

  // Locked cards (Leo the Lion) unlock by beating Story mode on this device
  get isUnlocked() {
    if (!this.locked) return true;
    try { return localStorage.getItem(`ll-unlock-${this.id}`) === '1'; } catch { return false; }
  }

  unlock() {
    try { localStorage.setItem(`ll-unlock-${this.id}`, '1'); } catch {}
  }

  describe() { return `👤 ${this.name} (${this.uses} uses): ${this.abilityText}`; }
}

// =============================================================
//  CARD DATA  — instances of the classes above
//  Now we CREATE actual cards using the blueprints.
// =============================================================

const WHOOPSIES_CARDS = [
  new WhoopsiesCard('w_shoelaces', 'Forgot to tie shoelaces near a cliff', IMG + 'w-shoelaces.webp', 5,
    'Lose 1 life unless another player discards an Action card to save you. If they do, both of you draw 1 card.'),

  new WhoopsiesCard('w_shark', 'Tried to pet a shark', IMG + 'w-shark.webp', 5,
    'If you have fewer than 3 Action cards in your hand, lose 1 life. Otherwise, do nothing.'),

  new WhoopsiesCard('w_toaster', 'Took a bath with a toaster', IMG + 'w-toaster.webp', 5,
    'You must discard an Action card or lose 1 life.'),

  new WhoopsiesCard('w_bear', 'Tried to hug a bear', IMG + 'w-bear.webp', 5,
    'You may choose another player to take this Whoopsies card. If you don\'t, lose 1 life.'),

  new WhoopsiesCard('w_tiles', 'Danced on wet tiles', IMG + 'w-tiles.webp', 5,
    'Roll a die. If you roll a 4, 5, or 6, you\'re safe. Otherwise, lose 1 life.'),

  new WhoopsiesCard('w_leftovers', 'Ate mystery leftovers', IMG + 'w-leftovers.webp', 2,
    'Choose one: lose 1 life, lose 1 ability use, or discard 2 Action cards from your hand.'),

  new WhoopsiesCard('w_texting', 'Texting while driving', IMG + 'w-texting.webp', 2,
    'Give 1 Action card from your hand to the player on your left or lose 1 life.'),

  new WhoopsiesCard('w_sunglasses', 'Drove wearing sunglasses at night', IMG + 'w-sunglasses.webp', 3,
    'Lose 1 life. This effect can\'t be stopped by any Action card except Slip Away or Redirect.',
    true), // unstoppable flag

  new WhoopsiesCard('w_outofluck', 'Out of Luck!!', IMG + 'w-outofluck.webp', 3,
    'Roll now! 1–2: lose 1 life. 3–4: nothing happens. 5–6: pass this card to the player on your right or left — they must roll for it immediately.'),

  new WhoopsiesCard('w_escape', 'Miraculous Escape!', IMG + 'w-escape.webp', 2,
    'Nothing happens! You live to see another round.'),
];

const ACTION_CARDS = [
  new ActionCard('a_not_today', 'Not Today!', IMG + 'a-not-today.webp', 5, TIMING.ANY_TIME,
    'Play after a Whoopsies card is revealed to prevent it from affecting you.'),

  new ActionCard('a_slip', 'Slip Away', IMG + 'a-slip-away.webp', 4, TIMING.ANY_TIME,
    'Pass the Whoopsies card to the player on your left. They must resolve it instead.'),

  new ActionCard('a_redirect', 'Redirect', IMG + 'a-redirect.webp', 4, TIMING.ANY_TIME,
    'Choose another player to face your Whoopsies card instead of you.'),

  new ActionCard('a_second_chance', 'Second Chance', IMG + 'a-second-chance.webp', 4, TIMING.ANY_TIME,
    'Gain 1 life. Play at any time, up to your life cap.'),

  new ActionCard('a_cancel', 'Cancel', IMG + 'a-cancel.webp', 4, TIMING.ANY_TIME,
    'Negate any Action card being played by any player.'),

  new ActionCard('a_peek', 'Peek Ahead', IMG + 'a-peek.webp', 4, TIMING.YOUR_TURN,
    'Look at the top 3 Whoopsies cards. Rearrange them in any order and place them back.'),

  new ActionCard('a_safety', 'Safety First', IMG + 'a-safety.webp', 2, TIMING.YOUR_TURN,
    'Prevent all players from losing life this round.'),

  new ActionCard('a_take1', 'Take 1', IMG + 'a-take1.webp', 5, TIMING.YOUR_TURN,
    'Pick a player and take 1 random Action card from their hand.'),

  new ActionCard('a_swap', 'Swap Hands', IMG + 'a-swap.webp', 2, TIMING.YOUR_TURN,
    'You may swap your entire hand of Action cards with another player.'),

  new ActionCard('a_skip', 'Skip Your Turn', IMG + 'a-skip.webp', 2, TIMING.YOUR_TURN,
    'Skip any player\'s turn, including your own.'),

  new ActionCard('a_draw2', 'Draw 2', IMG + 'a-draw2.webp', 4, TIMING.YOUR_TURN,
    'Draw 2 Action cards!'),

  new ActionCard('a_double', 'Double Trouble', IMG + 'a-double.webp', 2, TIMING.ANY_TIME,
    'Take an extra turn or make another player take one. The turn includes all normal actions and draws.'),

  new ActionCard('a_recover', 'Recover', IMG + 'a-recover.webp', 1, TIMING.YOUR_TURN,
    'Choose 1 Action card from the discard pile and add it to your hand.'),
];

const CHARACTER_CARDS = [
  new CharacterCard('c_carl', 'Curious Carl', IMG + 'c-carl.webp', 3, TIMING.YOUR_TURN,
    'Look at the top 2 Whoopsies cards and rearrange them in any order.'),

  new CharacterCard('c_casey', 'Cautious Casey', IMG + 'c-casey.webp', 3, TIMING.YOUR_TURN,
    'After resolving a Whoopsies card, you may draw 1 Action card.'),

  new CharacterCard('c_pete', 'Prankster Pete', IMG + 'c-pete.webp', 4, TIMING.YOUR_TURN,
    'Choose 1 card from your hand and trade it for 1 card from another player\'s hand.'),

  new CharacterCard('c_bella', 'Bold Bella', IMG + 'c-bella.webp', 3, TIMING.YOUR_TURN,
    'Look at the top 2 Action cards of the Action deck. Rearrange them and place them back on top.'),

  new CharacterCard('c_luke', 'Lucky Luke', IMG + 'c-luke.webp', 3, TIMING.REACTION,
    'Roll a die. On a 4 or higher, cancel a Take 1 or Swap Hands card\'s effect.'),

  new CharacterCard('c_nina', 'Naive Nina', IMG + 'c-nina.webp', 4, TIMING.YOUR_TURN,
    'Choose a player to reveal their entire hand. Flip a coin, heads or tails. If you called it right, trash 1 card from their hand.'),

  new CharacterCard('c_rosie', 'Reckless Rosie', IMG + 'c-rosie.webp', 3, TIMING.ANY_TIME,
    'Roll 1 die on a Whoopsies card. If you roll a 4 or higher, avoid the damage.'),

  new CharacterCard('c_mel', 'Melo Mel', IMG + 'c-mel.webp', 3, TIMING.ANY_TIME,
    'Re-roll any dice roll.'),

  new CharacterCard('c_franky', 'Franky Ice', IMG + 'c-franky.webp', 2, TIMING.YOUR_TURN,
    'Choose a player. They can only play 1 Action card during their next turn.'),

  new CharacterCard('c_lou', 'Grumpy Lou', IMG + 'c-lou.webp', 3, TIMING.REACTION,
    'On your turn, after your Whoopsies card is revealed, put it on the bottom of the Whoopsies deck and reveal a new one.'),

  new CharacterCard('c_rick', 'Slick Rick', IMG + 'c-rick.webp', 3, TIMING.REACTION,
    'Whenever a player plays an Action card, you may use the effect as well.'),

  new CharacterCard('c_fester', 'Fester the Cat', IMG + 'c-fester.webp', 3, TIMING.YOUR_TURN,
    'Discard a card from your hand to give a player a Whoopsies card from the top of the deck.'),

  new CharacterCard('c_lenny', 'Lenny the Shark', IMG + 'c-lenny.webp', 3, TIMING.REACTION,
    'Whenever you have fewer than 3 cards in your hand, you may draw 1 card from the Action deck.',
    { portrait: '71% 35%' }),

  // 👑 Boss card: the final boss of Story mode. Beat him to unlock him.
  new CharacterCard('c_leo', 'Leo the Lion', IMG + 'c-leo.webp', 3, TIMING.ANY_TIME,
    'Discard a card from your hand to give a player a Whoopsies card from the discard pile.',
    { boss: true, locked: true, portrait: '55% 17%' }),
];

// Characters this device is allowed to pick (locked ones stay out until unlocked)
const pickableCharacters = () => CHARACTER_CARDS.filter(c => c.isUnlocked);

const CARD_BACKS = {
  action:    IMG + 'back-action.webp',
  whoopsies: IMG + 'back-whoopsies.webp',
};
