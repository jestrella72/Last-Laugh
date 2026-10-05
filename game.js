// =============================================================
//  LAST LAUGH — Game Engine
//  OOP LESSON FILE 2: Encapsulation, Private Fields,
//                      Composition, Static Methods
// =============================================================

/*
 * ┌─────────────────────────────────────────────────────────┐
 *  OOP CONCEPT #5 — ENCAPSULATION + PRIVATE FIELDS
 *
 *  Encapsulation = bundling data + the methods that act on
 *  it inside one class, then hiding the raw data from outside.
 *
 *  Private fields use the # prefix.
 *  Code outside this class CANNOT read or write #cards.
 *  It must use the public methods we provide (draw, peek…).
 *
 *  WHY bother? It prevents bugs where outside code
 *  accidentally corrupts the deck's internal array.
 * └─────────────────────────────────────────────────────────┘
 */

class Deck {
  #cards     = [];   // private — nobody outside touches this
  #discarded = [];

  // reshuffle: when the draw pile runs out, shuffle the discards back in?
  // onReshuffle: optional callback so the game can announce it.
  constructor(cardDefinitions, { reshuffle = true } = {}) {
    this.reshuffle   = reshuffle;
    this.onReshuffle = null;
    // Expand every card definition into (copies) instances.
    // Object.create keeps the class methods/getters (canPlayAnytime…)
    // while giving every copy its own instanceId.
    for (const def of cardDefinitions) {
      for (let i = 0; i < def.copies; i++) {
        const copy = Object.create(def);
        copy.instanceId = `${def.id}_${i}`;
        this.#cards.push(copy);
      }
    }
    this.shuffle();
  }

  // Fisher-Yates — the gold-standard array shuffle algorithm
  shuffle() {
    const arr = this.#cards;
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]]; // destructure swap
    }
  }

  // Take the top card. Returns null when the draw pile is empty.
  // A deck with reshuffle on (the Whoopsies deck) resets itself first:
  // its discard pile is shuffled back in.
  draw() {
    if (this.#cards.length === 0 && this.reshuffle && this.#discarded.length > 0) {
      this.#cards     = this.#discarded;
      this.#discarded = [];
      this.shuffle();
      this.onReshuffle?.();
    }
    return this.#cards.shift() ?? null;
  }

  // Draw multiple at once
  drawMany(n) {
    const result = [];
    for (let i = 0; i < n; i++) {
      const c = this.draw();
      if (c) result.push(c);
    }
    return result;
  }

  // Look at top n cards without taking them
  peekTop(n = 3) { return this.#cards.slice(0, n); }

  // Rearrange the top n cards. newOrder = array of indices.
  // Example: [2, 0, 1] → the current 3rd card goes first, etc.
  rearrangeTop(newOrder) {
    const top = this.#cards.splice(0, newOrder.length);
    this.#cards.unshift(...newOrder.map(i => top[i]));
  }

  putOnBottom(card) { this.#cards.push(card); }

  discard(card)     { this.#discarded.push(card); }
  getAllDiscards()  { return [...this.#discarded]; }
  getTopDiscard()   { return this.#discarded[this.#discarded.length - 1] ?? null; }

  recoverFromDiscard(instanceId) {
    const idx = this.#discarded.findIndex(c => c.instanceId === instanceId);
    return idx !== -1 ? this.#discarded.splice(idx, 1)[0] : null;
  }

  /*
   * OOP CONCEPT #4 — GETTERS (reminder)
   * Read these like properties:  deck.size  (no parentheses)
   */
  get size()        { return this.#cards.length; }
  get discardSize() { return this.#discarded.length; }
  get isEmpty()     { return this.#cards.length === 0 && this.#discarded.length === 0; }
}

// =============================================================

/*
 * ┌─────────────────────────────────────────────────────────┐
 *  OOP CONCEPT #6 — COMPOSITION  ("has-a" relationship)
 *
 *  A Player HAS a character card.
 *  A Player HAS a hand (array of action cards).
 *  Compare with inheritance: WhoopsiesCard IS A Card.
 * └─────────────────────────────────────────────────────────┘
 */

class Player {
  constructor(id, name, character, lives, isBot = false) {
    this.id            = id;
    this.name          = name;
    this.isBot         = isBot;            // computer player (see bots.js)
    this.character     = character;        // CharacterCard  (composition!)
    this.lives         = lives;
    this.maxLives      = lives;
    this.hand          = [];               // array of ActionCard instances
    this.abilitiesLeft = character.uses;   // the ace icons on the card
    this.isEliminated  = false;
    this.skipNextTurn  = false;
    this.frozen        = false;            // Franky Ice: only 1 Action card next turn
    this.table         = [];               // Whoopsies sent to you: { card, why, passedBear }
                                           // they wait here until YOUR turn (max 2)
  }

  loseLife(amount = 1) {
    this.lives = Math.max(0, this.lives - amount);
    if (this.lives === 0) this.isEliminated = true;
    return this.lives;
  }

  gainLife(amount = 1) {
    this.lives = Math.min(this.maxLives, this.lives + amount);
  }

  isAlive()       { return !this.isEliminated; }
  hasCards(n)     { return this.hand.length >= n; }
  canUseAbility() { return this.abilitiesLeft > 0 && !this.isEliminated; }
  hasCard(id)     { return this.hand.some(c => c.id === id); }

  useAbility() {
    if (this.abilitiesLeft > 0) { this.abilitiesLeft--; return true; }
    return false;
  }

  // Remove one card from hand by instanceId. Returns the card.
  removeFromHand(instanceId) {
    const idx = this.hand.findIndex(c => c.instanceId === instanceId);
    return idx !== -1 ? this.hand.splice(idx, 1)[0] : null;
  }

  // Steal a random card from this player's hand
  stealRandomCard() {
    if (this.hand.length === 0) return null;
    const idx = Math.floor(Math.random() * this.hand.length);
    return this.hand.splice(idx, 1)[0];
  }
}

// =============================================================

/*
 * ┌─────────────────────────────────────────────────────────┐
 *  OOP CONCEPT #7 — THE "SOURCE OF TRUTH" PATTERN
 *
 *  Game is the single source of truth for all game state.
 *  The UI reads from Game and calls Game methods.
 *  Game methods update state; the UI re-renders after.
 * └─────────────────────────────────────────────────────────┘
 */

class Game {
  static STARTING_HAND = 5;
  static MAX_RECEIVED  = 2;   // Whoopsies that can wait on your table (plus your own flip)

  constructor(playerSetups) {
    // Player count determines starting lives
    const count      = playerSetups.length;
    const startLives = count <= 3 ? 3 : count <= 5 ? 2 : 1;

    // Build Player objects  (composition: Game HAS players)
    this.players = playerSetups.map((setup, i) =>
      new Player(i, setup.name, setup.character, startLives, !!setup.isBot)
    );

    // Build decks  (composition: Game HAS decks)
    // The Whoopsies deck resets when it runs out; the Action deck doesn't —
    // once it's empty, nobody draws Action cards any more.
    this.whoopsiesDeck = new Deck(WHOOPSIES_CARDS, { reshuffle: true });
    this.actionDeck    = new Deck(ACTION_CARDS,    { reshuffle: false });
    this.whoopsiesDeck.onReshuffle = () =>
      this.addLog('🔄 The Whoopsies deck ran out and was reset (shuffled back in)!', 'turn');

    // Turn state
    this.currentPlayerIdx = 0;
    this.turn             = 1;
    this.winner           = null;
    this.actionsThisTurn  = 0;     // counts Action cards for Franky Ice
    this.flippedThisTurn  = false; // one Whoopsies flip per turn

    // The Whoopsies card currently being faced (null between turns)
    this.currentWhoopsies = null;
    this.whoopsiesTargetIdx = 0;

    // Safety First: nobody loses life until this player's next turn
    this.safetyOwnerIdx = null;

    // Double Trouble: queue of player ids who get an extra turn
    this.extraTurns  = [];
    this.resumeAfter = null;       // whose turn normal order continues from

    // Game log — most recent entry first
    this.log = [];

    // Deal starting hands
    for (const p of this.players) {
      p.hand = this.actionDeck.drawMany(Game.STARTING_HAND);
    }
  }

  // ── Convenience getters ──────────────────────────────────

  get currentPlayer()   { return this.players[this.currentPlayerIdx]; }
  get whoopsiesTarget() { return this.players[this.whoopsiesTargetIdx]; }
  get activePlayers()   { return this.players.filter(p => !p.isEliminated); }
  get safetyActive()    { return this.safetyOwnerIdx !== null; }
  get humans()          { return this.players.filter(p => !p.isBot); }

  // Is there room on p's table for another Whoopsies?
  canReceive(p) { return !p.isEliminated && p.table.length < Game.MAX_RECEIVED; }

  // ── Utility methods ──────────────────────────────────────

  addLog(msg, kind = 'log') {
    this.log.unshift({ text: msg, turn: this.turn, kind });
    if (this.log.length > 120) this.log.pop();
  }

  /*
   * OOP CONCEPT #8 — STATIC METHODS
   * A static method belongs to the CLASS, not to an instance.
   * Call it as  Game.rollDie()  not  myGame.rollDie().
   */
  static rollDie()  { return Math.floor(Math.random() * 6) + 1; }
  static flipCoin() { return Math.random() < 0.5 ? 'heads' : 'tails'; }

  // Next living player clockwise (to the left)
  nextPlayerAfter(idx) {
    const total = this.players.length;
    let next = (idx + 1) % total;
    for (let i = 0; i < total && this.players[next].isEliminated; i++) {
      next = (next + 1) % total;
    }
    return next;
  }

  // Previous living player (to the right)
  prevPlayerBefore(idx) {
    const total = this.players.length;
    let prev = (idx - 1 + total) % total;
    for (let i = 0; i < total && this.players[prev].isEliminated; i++) {
      prev = (prev - 1 + total) % total;
    }
    return prev;
  }

  playerToLeft(idx)  { return this.nextPlayerAfter(idx); }
  playerToRight(idx) { return this.prevPlayerBefore(idx); }

  // Life loss goes through here so Safety First is respected.
  // Returns true if a life was actually lost.
  damage(player, { unstoppable = false } = {}) {
    if (this.safetyActive && !unstoppable) {
      this.addLog(`🛡️ Safety First protects ${player.name}!`);
      return false;
    }
    player.loseLife();
    this.addLog(`💔 ${player.name} loses 1 life (${player.lives} left).`, 'hurt');
    if (player.isEliminated) {
      this.addLog(`💀 ${player.name} has been eliminated!`, 'hurt');
      for (const e of player.table) this.whoopsiesDeck.discard(e.card);   // clear their table
      player.table = [];
    }
    return true;
  }

  checkWinner() {
    const alive = this.activePlayers;
    if (alive.length <= 1) {
      this.winner = alive[0] ?? null;
      if (this.winner) this.addLog(`🏆 ${this.winner.name} gets the Last Laugh!`);
      return true;
    }
    return false;
  }

  // Move to the next turn. Returns the list of players skipped.
  advanceTurn() {
    this.currentWhoopsies = null;
    this.actionsThisTurn  = 0;
    this.flippedThisTurn  = false;
    this.turn++;

    let next;
    if (this.extraTurns.length) {
      if (this.resumeAfter === null) this.resumeAfter = this.currentPlayerIdx;
      next = this.extraTurns.shift();
      if (this.players[next].isEliminated) return this.advanceTurn();
    } else {
      next = this.nextPlayerAfter(this.resumeAfter ?? this.currentPlayerIdx);
      this.resumeAfter = null;
    }

    const skipped = [];
    for (let i = 0; i < this.players.length && this.players[next].skipNextTurn; i++) {
      this.players[next].skipNextTurn = false;
      skipped.push(this.players[next]);
      this.addLog(`⏭️ ${this.players[next].name}'s turn is skipped!`);
      next = this.nextPlayerAfter(next);
    }

    // Safety First wears off when its owner's turn comes back around
    if (this.safetyOwnerIdx !== null &&
        (this.safetyOwnerIdx === next || this.players[this.safetyOwnerIdx].isEliminated)) {
      this.safetyOwnerIdx = null;
      this.addLog('Safety First wears off.');
    }

    this.currentPlayerIdx   = next;
    this.whoopsiesTargetIdx = next;
    return skipped;
  }
}
