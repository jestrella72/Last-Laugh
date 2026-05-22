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

class Card {
  // The constructor runs ONCE when you do: new Card(...)
  // "this" refers to the specific object being created.
  constructor(id, name, type, image, copies) {
    this.id      = id;       // unique key,  e.g. 'd_toaster'
    this.name    = name;     // display name
    this.type    = type;     // 'danger' | 'action' | 'character'
    this.image   = image;    // filename, e.g. '4.png'
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
 *  DangerCard IS A Card.  It gets everything Card has,
 *  then adds its own danger-specific stuff.
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

class DangerCard extends Card {
  // unstoppable = true means only Slip Away / Redirect can help
  constructor(id, name, image, copies, effectText, unstoppable = false) {
    super(id, name, 'danger', image, copies); // call parent first
    this.effectText  = effectText;
    this.unstoppable = unstoppable;
  }

  describe() { return `⚠️  DANGER: ${this.name}`; }
}

class ActionCard extends Card {
  constructor(id, name, image, copies, timing, effectText) {
    super(id, name, 'action', image, copies);
    this.timing     = timing;      // 'your_turn'  |  'any_time'
    this.effectText = effectText;
  }

  /*
   * OOP CONCEPT #4 — GETTER
   * A getter looks like a property but runs code when read.
   * card.canPlayAnytime  (no parentheses!)
   */
  get canPlayAnytime() { return this.timing === 'any_time'; }

  describe() {
    const tag = this.canPlayAnytime ? '⚡ Any Time' : '🎯 Your Turn';
    return `🃏 ${this.name}  —  ${tag}`;
  }
}

class CharacterCard extends Card {
  constructor(id, name, image, maxLives, abilityText, abilityTiming) {
    super(id, name, 'character', image, 1);
    this.maxLives      = maxLives;
    this.abilityText   = abilityText;
    this.abilityTiming = abilityTiming; // 'active' | 'any_time' | 'passive'
  }

  describe() { return `👤 ${this.name}: ${this.abilityText}`; }
}

// =============================================================
//  CARD DATA  — instances of the classes above
//  Now we CREATE actual cards using the blueprints.
// =============================================================

const DANGER_CARDS = [
  new DangerCard('d_toaster',
    'Took a Bath with a Toaster', '4.png', 5,
    'Discard 1 Action card or lose 1 life.'),

  new DangerCard('d_shoelaces',
    'Forgot to Tie Shoelaces Near a Cliff', '2.png', 5,
    'Lose 1 life unless another player discards an Action card to save you. If they do, both players draw 1 card.'),

  new DangerCard('d_shark',
    'Pet a Shark', '3.png', 5,
    'If you have fewer than 3 Action cards in hand, lose 1 life. Otherwise nothing happens.'),

  new DangerCard('d_tiles',
    'Danced on Wet Tiles', '6.png', 5,
    'Roll a die. 4, 5, or 6 = safe. Otherwise lose 1 life.'),

  new DangerCard('d_bear',
    'Tried to Hug a Bear', '5.png', 5,
    'Choose another player to take this Danger card instead, or lose 1 life.'),

  new DangerCard('d_escape',
    'Miraculous Escape', '10.png', 2,
    'Nothing happens! You live to see another round.'),

  new DangerCard('d_leftovers',
    'Ate Mystery Leftovers', '7.png', 2,
    'Choose one: lose 1 life, lose 1 ability use, or discard 2 Action cards from your hand.'),

  new DangerCard('d_texting',
    'Texted While Driving', '8.png', 2,
    'Give 1 Action card from your hand to the player on your left, or lose 1 life.'),

  new DangerCard('d_sunglasses',
    'Wore Sunglasses at Night', '9.png', 3,
    'Lose 1 life. Only Slip Away or Redirect can stop this effect.',
    true), // unstoppable flag

  new DangerCard('d_parachute',
    'Forgot Parachute While Skydiving', '1.png', 2,
    'Give 1 Action card from your hand to any player of your choice, or lose 1 life.'),
];

const ACTION_CARDS = [
  new ActionCard('a_not_today',
    'Not Today!', '11.png', 5, 'any_time',
    'Prevent a Danger card from affecting you. (Play after the card is revealed, before resolving.)'),

  new ActionCard('a_redirect',
    'Redirect', '13.png', 4, 'any_time',
    'Force another player to face your Danger card instead. (You choose who.)'),

  new ActionCard('a_second_chance',
    'Second Chance', '14.png', 4, 'any_time',
    'Survive a Danger card without losing a life. Can even be played after taking the hit.'),

  new ActionCard('a_peek',
    'Peek Ahead', '16.png', 4, 'your_turn',
    'Look at the top 3 Danger cards and rearrange them in any order.'),

  new ActionCard('a_cancel',
    'Cancel', '15.png', 4, 'any_time',
    'Negate any Action card played by any player.'),

  new ActionCard('a_slip',
    'Slip Away', '12.png', 4, 'your_turn',
    'Pass the Danger card to the player on your left — they must resolve it instead.'),

  new ActionCard('a_safety',
    'Safety First', '17.png', 2, 'your_turn',
    'Prevent ALL players from losing a life this round.'),

  new ActionCard('a_swap',
    'Swap Hands', '19.png', 2, 'your_turn',
    'Swap your entire hand of Action cards with another player.'),

  new ActionCard('a_draw2',
    'Draw 2', '21.png', 4, 'your_turn',
    'Draw 2 Action cards from the Action deck.'),

  new ActionCard('a_skip',
    'Skip Your Turn', '20.png', 2, 'any_time',
    'Skip any player\'s turn — including your own. Play at any time.'),

  new ActionCard('a_take1',
    'Take 1', '18.png', 5, 'your_turn',
    'Choose a player and steal 1 random Action card from their hand.'),

  new ActionCard('a_double',
    'Double Trouble', '22.png', 2, 'any_time',
    'Give any player (including yourself) an immediate extra turn with all normal actions and draws.'),

  new ActionCard('a_recover',
    'Recover', '23.png', 1, 'your_turn',
    'Take 1 card from the Action discard pile and add it to your hand, then discard 1 from your hand.'),
];

const CHARACTER_CARDS = [
  new CharacterCard('c_carl',  'Curious Carl',   '24.png', 3,
    'Look at the top 2 Danger cards and rearrange their order.',
    'active'),

  new CharacterCard('c_rosie', 'Reckless Rosie', '30.png', 3,
    'Roll 1 die on a Danger card. Roll 4 or higher to avoid damage.',
    'active'),

  new CharacterCard('c_sammy', 'Silly Sammy',    '1.png',  3,
    'Swap 1 Action card from your hand with the top card of the Action deck.',
    'active'),

  new CharacterCard('c_nina',  'Naive Nina',     '29.png', 3,
    'Ask one player to reveal their entire hand to you. (No stealing unless you use Take 1.)',
    'active'),

  new CharacterCard('c_luke',  'Lucky Luke',     '28.png', 3,
    'When someone plays Take 1 or Swap Hands on you: roll a die. Roll 4+ to cancel it.',
    'any_time'),

  new CharacterCard('c_bella', 'Bold Bella',     '27.png', 3,
    'Look at the top 2 Action cards from the Action deck.',
    'active'),

  new CharacterCard('c_pete',  'Prankster Pete', '26.png', 3,
    'Swap 1 card from your hand with 1 card from another player\'s hand.',
    'active'),

  new CharacterCard('c_casey', 'Cautious Casey', '25.png', 3,
    'After resolving a Danger card, draw 1 Action card.',
    'passive'),

  new CharacterCard('c_lou',   'Grumpy Lou',     '1.png',  3,
    'Roll a die. On 4 or higher, redirect a Danger card to any player of your choice.',
    'active'),

  new CharacterCard('c_mel',   'Melo Mel',       '31.png', 3,
    'Used Any Time: reroll any dice roll once.',
    'any_time'),
];
