# OOP Concepts in Last Laugh Code
## Real Code Examples from cards.js & game.js

---

# 🟢 BASIC Examples

## Example 1: Card Class Definition
**Location:** `cards.js`, line 1-30

```javascript
// ============================================
// OOP CONCEPT #1 - CLASSES & CONSTRUCTORS
// ============================================
// A class is a blueprint. When you write:
//   const card = new Card('id', 'Name', ...)
// JavaScript creates a new object and runs the constructor

class Card {
  // constructor() runs when you write: new Card(...)
  constructor(id, name, type, image, copies) {
    // this = the new object being created
    // this.property = value creates properties on the object
    this.id = id;           // unique card ID
    this.name = name;       // card name
    this.type = type;       // 'danger', 'action', 'character'
    this.image = image;     // image file (e.g., "3.png")
    this.copies = copies;   // how many copies in deck
  }

  // describe() is a METHOD = function inside a class
  // Call it like: card.describe()
  describe() {
    return `${this.name} (${this.type})`;
  }

  toString() {
    return this.describe();
  }
}

// CREATE INSTANCES (objects) from the blueprint
const card1 = new Card('d01', 'Shark', 'danger', '3.png', 5);
const card2 = new Card('a01', 'Not Today!', 'action', '11.png', 5);

console.log(card1.describe());  // "Shark (danger)"
console.log(card2.describe());  // "Not Today! (action)"
```

---

# 🟡 INTERMEDIATE Examples

## Example 2: Inheritance with `extends`
**Location:** `cards.js`, line 40-90

```javascript
// ============================================
// OOP CONCEPT #2 - INHERITANCE
// ============================================
// DangerCard IS-A Card, so it extends (inherits from) Card
// It gets ALL of Card's properties and methods
// Plus it adds its own danger-specific stuff

class DangerCard extends Card {
  constructor(id, name, image, copies, effectText, unstoppable = false) {
    // super() MUST be called first!
    // It calls the parent (Card) constructor
    // This initializes: id, name, type, image, copies
    super(id, name, 'danger', image, copies);

    // NOW we add danger-specific properties
    this.effectText = effectText;    // what happens when flipped
    this.unstoppable = unstoppable;  // can it be prevented?
  }

  // POLYMORPHISM - override parent's describe()
  // Same name, different behavior!
  describe() {
    const unsafe = this.unstoppable ? '⚡ UNSTOPPABLE' : '';
    return `⚠️ ${this.name} ${unsafe}`;
  }

  getEffect() {
    return this.effectText;
  }
}

// ActionCard also extends Card (same pattern)
class ActionCard extends Card {
  constructor(id, name, image, copies, timing, effectText) {
    super(id, name, 'action', image, copies);
    this.timing = timing;        // 'anytime', 'your turn', etc
    this.effectText = effectText;
  }

  describe() {
    return `✓ ${this.name} (${this.timing})`;
  }

  canPlayAnytime() {
    return this.timing === 'anytime';
  }
}

// CharacterCard also extends Card
class CharacterCard extends Card {
  constructor(id, name, image, abilityText, maxLives = 3) {
    super(id, name, 'character', image, 1); // 1 copy per deck
    this.abilityText = abilityText;
    this.maxLives = maxLives;
  }

  describe() {
    return `👤 ${this.name}: ${this.abilityText}`;
  }
}

// NOW ALL 3 CARD TYPES inherit from Card
// They all have: id, name, type, image, copies, describe()
// But each one customizes describe() — that's POLYMORPHISM

const danger = new DangerCard('d01', 'Shark', '3.png', 5, 'Lose 1 life if < 3 cards');
const action = new ActionCard('a01', 'Not Today!', '11.png', 5, 'anytime', 'Prevent one danger');
const char = new CharacterCard('c01', 'Carl', '24.png', 'Peek top 2 dangers');

console.log(danger.describe()); // "⚠️ Shark"
console.log(action.describe()); // "✓ Not Today! (anytime)"
console.log(char.describe());   // "👤 Carl: Peek top 2 dangers"
```

---

## Example 3: Polymorphism in Action
**Location:** `cards.js`, line 200-250

```javascript
// ============================================
// OOP CONCEPT #3 - POLYMORPHISM
// ============================================
// SAME METHOD NAME (describe), DIFFERENT BEHAVIOR

// Array of different card types
const allCards = [
  new DangerCard('d01', 'Shark', '3.png', 5, 'Lose 1 life'),
  new ActionCard('a01', 'Not Today!', '11.png', 5, 'anytime', 'Prevent danger'),
  new CharacterCard('c01', 'Carl', '24.png', 'Peek top 2'),
  new DangerCard('d02', 'Bath', '4.png', 5, 'Discard 1 or lose 1'),
  new ActionCard('a02', 'Redirect', '13.png', 4, 'anytime', 'Pass danger'),
];

// POLYMORPHISM - call same method on different types
// Each one responds differently!
allCards.forEach(card => {
  console.log(card.describe());
});

// Output:
// ⚠️ Shark
// ✓ Not Today! (anytime)
// 👤 Carl: Peek top 2
// ⚠️ Bath
// ✓ Redirect (anytime)

// This is POLYMORPHISM! Same method name, different results.
```

---

# 🔴 ADVANCED Examples

## Example 4: Encapsulation with Private Fields
**Location:** `game.js`, line 1-50

```javascript
// ============================================
// OOP CONCEPT #4 - ENCAPSULATION
// ============================================
// PRIVATE FIELDS (prefixed with #) can ONLY be accessed inside the class
// This protects data and prevents bugs

class Deck {
  #cards = [];      // PRIVATE - only Deck can access this
  #discards = [];   // PRIVATE

  constructor(cards = []) {
    this.#cards = [...cards]; // Make a copy, don't modify original
  }

  // PUBLIC method to safely add cards
  addCard(card) {
    if (card) {
      this.#cards.push(card);
    }
  }

  // PUBLIC method to safely draw
  draw() {
    if (this.#cards.length > 0) {
      return this.#cards.pop();
    }
    return null;
  }

  // PUBLIC GETTER - looks like a property, but controlled access
  get size() {
    return this.#cards.length;
  }

  get isEmpty() {
    return this.#cards.length === 0;
  }

  // PUBLIC method to shuffle
  shuffle() {
    // Fisher-Yates shuffle algorithm
    for (let i = this.#cards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.#cards[i], this.#cards[j]] = [this.#cards[j], this.#cards[i]];
    }
  }

  // PUBLIC method to peek
  peek(count = 1) {
    return this.#cards.slice(-count).reverse(); // top 'count' cards
  }
}

// USAGE - you can't access #cards directly
const deck = new Deck([card1, card2, card3]);

console.log(deck.size);        // 3 (using getter)
console.log(deck.isEmpty);     // false (using getter)
deck.shuffle();                // safe method
const top = deck.peek(1);      // safe method
const drawn = deck.draw();     // safe method

// These would cause ERRORS:
// deck.#cards = [];            // ❌ Can't access private field!
// deck.#cards.pop();           // ❌ Can't access private field!
```

---

## Example 5: Player with Encapsulation & Composition
**Location:** `game.js`, line 60-140

```javascript
// ============================================
// OOP CONCEPT #5 - COMPOSITION & ENCAPSULATION
// ============================================
// Player HAS-A Character (composition, not inheritance)
// Player's lives are PRIVATE (encapsulation)

class Player {
  #lives;              // PRIVATE - protect lives
  #character;          // PRIVATE - protect character reference
  #hand = [];          // PRIVATE - protect hand
  #storage = [];       // PRIVATE - protect storage zone

  constructor(id, name, character) {
    this.id = id;
    this.name = name;
    this.#character = character;  // COMPOSITION - Player contains Character
    this.#lives = character.maxLives; // Get max from character
  }

  // PUBLIC getter to read character name
  getCharacterName() {
    return this.#character.name;
  }

  // PUBLIC getter to safely read lives
  getLives() {
    return this.#lives;
  }

  // PUBLIC method to safely lose life
  loseLife() {
    if (this.#lives > 0) {
      this.#lives -= 1;
    }
  }

  // PUBLIC method to safely gain life
  gainLife() {
    if (this.#lives < this.#character.maxLives) {
      this.#lives += 1;
    }
  }

  // PUBLIC method to draw card
  drawCard(card) {
    this.#hand.push(card);
  }

  // PUBLIC method to get hand size
  getHandSize() {
    return this.#hand.length;
  }

  // PUBLIC method to check if alive
  isAlive() {
    return this.#lives > 0;
  }

  // PUBLIC method to use character ability
  useCharacterAbility() {
    if (this.#character && this.#character.abilityUsesLeft > 0) {
      this.#character.abilityUsesLeft -= 1;
      return true;
    }
    return false;
  }
}

// USAGE
const carl = new CharacterCard('c01', 'Curious Carl', '24.png', 'Peek top 2', 3);
const player = new Player(1, 'Jeff', carl);

console.log(player.getCharacterName());    // 'Curious Carl'
console.log(player.getLives());            // 3
player.loseLife();
console.log(player.getLives());            // 2
player.gainLife();
console.log(player.getLives());            // 3

// These cause ERRORS (can't access private):
// player.#lives = 100;                   // ❌ Can't modify directly!
// player.#character = someOtherChar;     // ❌ Can't swap character!
// player.#hand[0] = fakeCard;            // ❌ Can't cheat!
```

---

## Example 6: Game Class (Composition Hub)
**Location:** `game.js`, line 150-250

```javascript
// ============================================
// OOP CONCEPT #6 - COMPOSITION AT SCALE
// ============================================
// Game is the "hub" that contains all other objects
// Game HAS-A: players[], dangerDeck, actionDeck
// Game controls the overall flow

class Game {
  static MAX_PLAYERS = 6;
  static MIN_PLAYERS = 2;

  #players = [];
  #dangerDeck;
  #actionDeck;
  #currentTurnPlayer = 0;
  #phase = 'setup'; // setup, pre-flip, reacting, resolving, game-over
  #winner = null;

  constructor() {
    // Game creates its own decks by composing all cards
    this.#dangerDeck = new Deck(this.createDangerCards());
    this.#actionDeck = new Deck(this.createActionCards());
  }

  // Add a player (composition)
  addPlayer(player) {
    if (this.#players.length < Game.MAX_PLAYERS) {
      this.#players.push(player);
      return true;
    }
    return false;
  }

  // Get current player
  getCurrentPlayer() {
    return this.#players[this.#currentTurnPlayer];
  }

  // Advance to next player
  nextTurn() {
    if (this.isGameOver()) return;

    this.#currentTurnPlayer = (this.#currentTurnPlayer + 1) % this.#players.length;

    // Skip eliminated players
    while (!this.getCurrentPlayer().isAlive()) {
      this.#currentTurnPlayer = (this.#currentTurnPlayer + 1) % this.#players.length;
    }
  }

  // Flip a danger card
  flipDangerCard() {
    if (!this.#dangerDeck.isEmpty) {
      return this.#dangerDeck.draw();
    }
    return null;
  }

  // Deal starting hand
  dealStartingHand(handSize = 5) {
    for (let player of this.#players) {
      for (let i = 0; i < handSize; i++) {
        const card = this.#actionDeck.draw();
        if (card) player.drawCard(card);
      }
    }
  }

  // Check if game is over
  isGameOver() {
    const alive = this.#players.filter(p => p.isAlive());
    if (alive.length === 1) {
      this.#winner = alive[0];
      return true;
    }
    return false;
  }

  getWinner() {
    return this.#winner;
  }

  createDangerCards() {
    // Returns array of all danger card instances
    return [
      new DangerCard('d01', 'Shark', '3.png', 5, 'Lose 1 life if < 3 cards'),
      new DangerCard('d02', 'Bath', '4.png', 5, 'Discard 1 card or lose 1 life'),
      // ... more cards
    ];
  }

  createActionCards() {
    // Returns array of all action card instances
    return [
      new ActionCard('a01', 'Not Today!', '11.png', 5, 'anytime', 'Prevent one danger'),
      new ActionCard('a02', 'Redirect', '13.png', 4, 'anytime', 'Pass danger to player'),
      // ... more cards
    ];
  }
}

// USAGE - Game orchestrates everything
const game = new Game();
game.addPlayer(new Player(1, 'Jeff', carl));
game.addPlayer(new Player(2, 'Sarah', rosie));
game.dealStartingHand();

const card = game.flipDangerCard();  // Get danger from deck
console.log(card.describe());

game.nextTurn();
console.log(game.getCurrentPlayer().name); // Next player

// Game is the "single source of truth" for game state
```

---

## Example 7: Static Methods
**Location:** `game.js` and `index.html`

```javascript
// ============================================
// OOP CONCEPT #7 - STATIC METHODS
// ============================================
// Static = belongs to class, not instances
// Call like: Game.rollDie(), not game.rollDie()

class Game {
  static MAX_PLAYERS = 6;
  static MIN_PLAYERS = 2;

  // Static method - utility, not tied to any game instance
  static rollDie(sides = 6) {
    return Math.floor(Math.random() * sides) + 1;
  }

  static isValidPlayerCount(count) {
    return count >= this.MIN_PLAYERS && count <= this.MAX_PLAYERS;
  }

  static shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }
}

// USAGE - static methods on the CLASS
console.log(Game.rollDie());              // Random 1-6
console.log(Game.isValidPlayerCount(3));  // true
console.log(Game.MAX_PLAYERS);            // 6

// In HTML/UI code:
const roll = Game.rollDie();  // Roll die without creating a Game
console.log(`You rolled a ${roll}`);
```

---

# 🎓 How They Work Together

## The Architecture Flow

```javascript
// 1. Define Card types (inheritance)
class Card { ... }
class DangerCard extends Card { ... }
class ActionCard extends Card { ... }
class CharacterCard extends Card { ... }

// 2. Define Deck (encapsulation + composition)
class Deck {
  #cards = [];  // Protected data
  draw() { ... }
  shuffle() { ... }
}

// 3. Define Player (composition + encapsulation)
class Player {
  #lives;
  #character;  // HAS-A Character
  loseLife() { ... }
}

// 4. Define Game (composition hub)
class Game {
  #players;    // HAS-A array of Players
  #dangerDeck; // HAS-A Deck
  #actionDeck; // HAS-A Deck
  nextTurn() { ... }
}

// 5. Create instances and let them work together
const carl = new CharacterCard(...);
const player1 = new Player('Jeff', carl);
const game = new Game();
game.addPlayer(player1);
game.flipDangerCard(); // Uses #dangerDeck
```

---

# 🔍 Finding These Patterns in Code

| Concept | Where to Find | What to Look For |
|---------|---------------|------------------|
| **Classes** | Top of `cards.js` | `class Card { }` |
| **Inheritance** | Middle of `cards.js` | `extends Card` |
| **Polymorphism** | In all card classes | Different `describe()` implementations |
| **Encapsulation** | `game.js` Deck & Player | `#` symbol on properties |
| **Composition** | `game.js` Game class | `this.#players`, `this.#dangerDeck` |
| **Static** | Throughout `game.js` | `Game.rollDie()`, `static MAX_PLAYERS` |
| **Getters** | `game.js` Deck | `get size() { }`, `get isEmpty { }` |

---

# 💡 Key Takeaways

1. **Classes** = blueprints for objects
2. **Inheritance** = reuse code (Card → DangerCard)
3. **Polymorphism** = same method, different behavior
4. **Encapsulation** = protect data with `#`
5. **Composition** = objects contain other objects
6. **Static** = utilities that don't need instances
7. **Getters** = safe read-only access to properties

Master these 7 patterns and you've mastered OOP! 🚀
