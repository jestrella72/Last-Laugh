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

  constructor(cardDefinitions) {
    // Expand every card definition into (copies) instances
    for (const def of cardDefinitions) {
      for (let i = 0; i < def.copies; i++) {
        // Spread operator copies all properties into a new object,
        // then we add a unique instanceId so two copies of the same
        // card can be told apart.
        this.#cards.push({ ...def, instanceId: `${def.id}_${i}` });
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

  // Take the top card. Returns null if deck is empty.
  draw() { return this.#cards.shift() ?? null; }

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

  discard(card)     { this.#discarded.push(card); }
  getAllDiscards()   { return [...this.#discarded]; }
  getTopDiscard()   { return this.#discarded[this.#discarded.length - 1] ?? null; }

  recoverFromDiscard(instanceId) {
    const idx = this.#discarded.findIndex(c => c.instanceId === instanceId);
    return idx !== -1 ? this.#discarded.splice(idx, 1)[0] : null;
  }

  /*
   * OOP CONCEPT #4 — GETTERS (reminder)
   * Read these like properties:  deck.size  (no parentheses)
   * The get keyword tells JS to run the function when you
   * access the property name.
   */
  get size()        { return this.#cards.length; }
  get discardSize() { return this.#discarded.length; }
  get isEmpty()     { return this.#cards.length === 0; }
}

// =============================================================

/*
 * ┌─────────────────────────────────────────────────────────┐
 *  OOP CONCEPT #6 — COMPOSITION  ("has-a" relationship)
 *
 *  A Player HAS a character card.
 *  A Player HAS a hand (array of action cards).
 *  Compare with inheritance: DangerCard IS A Card.
 *
 *  Composition = building complex objects by nesting simpler
 *  objects inside them rather than inheriting from them.
 * └─────────────────────────────────────────────────────────┘
 */

class Player {
  constructor(id, name, character, lives) {
    this.id           = id;
    this.name         = name;
    this.character    = character;   // CharacterCard  (composition!)
    this.lives        = lives;
    this.maxLives     = lives;
    this.hand         = [];          // array of ActionCard instances
    this.abilitiesLeft = 3;          // tracked by dice in physical game
    this.isEliminated = false;
    this.skipNextTurn = false;
  }

  loseLife(amount = 1) {
    this.lives = Math.max(0, this.lives - amount);
    if (this.lives === 0) this.isEliminated = true;
    return this.lives;
  }

  gainLife(amount = 1) {
    this.lives = Math.min(this.maxLives, this.lives + amount);
    if (this.lives > 0) this.isEliminated = false;
  }

  isAlive()    { return this.lives > 0; }
  hasCards(n)  { return this.hand.length >= n; }
  canUseAbility() { return this.abilitiesLeft > 0 && !this.isEliminated; }

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
 *
 *  This separation keeps the logic clean and testable.
 * └─────────────────────────────────────────────────────────┘
 */

class Game {
  constructor(playerSetups) {
    // Player count determines starting lives
    const count        = playerSetups.length;
    const startLives   = count <= 3 ? 3 : count <= 5 ? 2 : 1;

    // Build Player objects  (composition: Game HAS players)
    this.players = playerSetups.map((setup, i) =>
      new Player(i, setup.name, setup.character, startLives)
    );

    // Build decks  (composition: Game HAS decks)
    this.dangerDeck = new Deck(DANGER_CARDS);
    this.actionDeck = new Deck(ACTION_CARDS);

    // Turn & round state
    this.currentPlayerIdx  = 0;
    this.dangerTargetIdx   = 0;    // who is actually resolving the danger
    this.currentDanger     = null; // the active DangerCard instance
    this.turn              = 1;
    this.winner            = null;

    // Round-wide modifier flags
    this.safetyFirstActive = false;
    this.dangerNegated     = false;  // Not Today was played

    // Game log — most recent entry first
    this.log = [];

    // Deal starting hands
    for (const p of this.players) {
      p.hand = this.actionDeck.drawMany(5);
    }
  }

  // ── Convenience getters ──────────────────────────────────

  get currentPlayer()  { return this.players[this.currentPlayerIdx]; }
  get dangerTarget()   { return this.players[this.dangerTargetIdx]; }
  get activePlayers()  { return this.players.filter(p => !p.isEliminated); }

  // ── Utility methods ──────────────────────────────────────

  addLog(msg) {
    this.log.unshift({ text: msg, turn: this.turn });
    if (this.log.length > 50) this.log.pop();
  }

  /*
   * OOP CONCEPT #8 — STATIC METHODS
   * A static method belongs to the CLASS, not to an instance.
   * Call it as  Game.rollDie()  not  myGame.rollDie().
   * Use static for utility functions that don't need "this".
   */
  static rollDie() {
    return Math.floor(Math.random() * 6) + 1;
  }

  // Get the index of the next living player clockwise
  nextPlayerAfter(idx) {
    const total = this.players.length;
    let next    = (idx + 1) % total;
    let checks  = 0;
    while (this.players[next].isEliminated && checks < total) {
      next = (next + 1) % total;
      checks++;
    }
    return next;
  }

  playerToLeft(idx) { return this.nextPlayerAfter(idx); }

  checkWinner() {
    const alive = this.activePlayers;
    if (alive.length <= 1) {
      this.winner = alive[0] ?? null;
      if (this.winner) this.addLog(`🏆 ${this.winner.name} wins the game!`);
      return true;
    }
    return false;
  }

  // Reset per-round flags and advance to the next player
  advanceTurn(overrideNextIdx = null) {
    this.safetyFirstActive = false;
    this.dangerNegated     = false;
    this.currentDanger     = null;
    this.turn++;

    let next = overrideNextIdx ?? this.nextPlayerAfter(this.currentPlayerIdx);

    // Handle skip flag
    if (this.players[next].skipNextTurn) {
      this.players[next].skipNextTurn = false;
      this.addLog(`${this.players[next].name}'s turn was skipped!`);
      next = this.nextPlayerAfter(next);
    }

    this.currentPlayerIdx = next;
    this.dangerTargetIdx  = next;
  }
}
