# OOP JavaScript Learning Guide
## Using Last Laugh Card Game as Examples
### Basic → Intermediate → Advanced

---

# 🟢 BASIC: Classes & Objects

## What is OOP?
**OOP = Object-Oriented Programming**

Instead of writing loose functions, you organize code into **objects** that represent real things:
- A Card is an object
- A Player is an object  
- A Deck is an object
- A Game is an object

---

## Concept #1: Classes

A **class** is a blueprint for creating objects. Think of it like a cookie cutter:

```javascript
// BLUEPRINT (class)
class Card {
  constructor(id, name, type, image) {
    this.id = id;
    this.name = name;
    this.type = type;
    this.image = image;
  }

  // Method = function inside a class
  describe() {
    return `${this.name} (${this.type})`;
  }
}

// CREATE OBJECTS (instances) from the blueprint
const card1 = new Card('ev01', 'Clash', 'event', '11.png');
const card2 = new Card('ev02', 'Cloud Rose', 'event', '12.png');

console.log(card1.describe()); // Output: "Clash (event)"
console.log(card2.describe()); // Output: "Cloud Rose (event)"
```

**Key terms:**
- `class Card` = the blueprint
- `new Card()` = creating a new object (called an "instance")
- `constructor()` = runs when you create a new object, initializes properties
- `this` = refers to the current object

---

## Concept #2: Properties vs Methods

```javascript
class Player {
  constructor(name, character) {
    // PROPERTIES = data/state
    this.name = name;
    this.character = character;
    this.lives = 3;
    this.hand = [];
  }

  // METHODS = actions the player can do
  drawCard(card) {
    this.hand.push(card);
  }

  loseLife() {
    this.lives -= 1;
  }

  isAlive() {
    return this.lives > 0;
  }
}

// Create a player
const player = new Player('Jeffrey', 'Curious Carl');
console.log(player.name);        // "Jeffrey" — property
console.log(player.isAlive());   // true — method
player.loseLife();               // call method
console.log(player.lives);       // 2 — property changed
```

**Properties** = data stored in the object
**Methods** = functions that operate on that data

---

## Concept #3: `new` Keyword

When you write `new Player()`, JavaScript does 4 things:

```javascript
const player = new Player('Jeffrey', 'Curious Carl');

// What actually happens:
// 1. Create a new empty object: {}
// 2. Run constructor() with 'this' = that object
// 3. Store properties: this.name = 'Jeffrey', etc
// 4. Return the object
```

---

# 🟡 INTERMEDIATE: Inheritance & Polymorphism

## Concept #4: Inheritance (`extends` keyword)

**Real problem:** In Last Laugh, we have 3 types of cards:
- DangerCard
- ActionCard
- CharacterCard

They all share common properties: `id`, `name`, `image`, `copies`

**Solution:** Create a parent class that all card types inherit from.

```javascript
// PARENT CLASS (base class)
class Card {
  constructor(id, name, type, image, copies) {
    this.id = id;
    this.name = name;
    this.type = type;
    this.image = image;
    this.copies = copies;
  }

  describe() {
    return `${this.name} (${this.type})`;
  }
}

// CHILD CLASS #1 (inherits from Card)
class DangerCard extends Card {
  constructor(id, name, image, copies, effect) {
    super(id, name, 'danger', image, copies); // Call parent constructor
    this.effect = effect;
  }

  // Override parent method (same name, different code)
  describe() {
    return `⚠️ ${this.name} - ${this.effect}`;
  }
}

// CHILD CLASS #2 (inherits from Card)
class ActionCard extends Card {
  constructor(id, name, image, copies, timing) {
    super(id, name, 'action', image, copies); // Call parent constructor
    this.timing = timing;
  }

  // Override parent method
  describe() {
    return `✓ ${this.name} - Play ${this.timing}`;
  }
}

// CREATE INSTANCES
const danger = new DangerCard('d01', 'Took a Bath', '4.png', 5, 'Lose 1 life or discard');
const action = new ActionCard('a01', 'Not Today!', '11.png', 5, 'anytime');

console.log(danger.describe()); // "⚠️ Took a Bath - Lose 1 life or discard"
console.log(action.describe()); // "✓ Not Today! - Play anytime"
```

**Key concepts:**
- `extends Card` = DangerCard IS A Card
- `super()` = call the parent's constructor first
- **Inheritance** = child gets all parent's properties + methods
- **Polymorphism** = same method name, different behavior

**Inheritance hierarchy:**
```
Card (parent)
├── DangerCard (child)
├── ActionCard (child)
└── CharacterCard (child)
```

---

## Concept #5: `super()` - Calling Parent Constructor

```javascript
class Card {
  constructor(id, name) {
    this.id = id;
    this.name = name;
  }
}

class DangerCard extends Card {
  constructor(id, name, effect) {
    // MUST call super() before using 'this'
    super(id, name); // Calls Card's constructor
    
    // NOW we can add danger-specific stuff
    this.effect = effect;
  }
}

const d = new DangerCard('d01', 'Shark', 'Lose 1 life');
console.log(d.id);       // 'd01' — from parent
console.log(d.name);     // 'Shark' — from parent
console.log(d.effect);   // 'Lose 1 life' — own property
```

**Rule:** Always call `super()` first in child constructor.

---

## Concept #6: Polymorphism (Many Forms)

**Polymorphism** = same method name, different behavior depending on the object.

```javascript
// ALL cards have describe(), but behave differently

const cards = [
  new DangerCard('d01', 'Shark', '3.png', 5, 'Lose 1 life'),
  new ActionCard('a01', 'Not Today!', '11.png', 5, 'anytime'),
  new CharacterCard('c01', 'Curious Carl', '24.png', 'Peek 2 danger cards')
];

// POLYMORPHISM IN ACTION
cards.forEach(card => {
  console.log(card.describe()); // Each type describes itself differently!
});

// Output:
// "⚠️ Shark - Lose 1 life"
// "✓ Not Today! - Play anytime"
// "👤 Curious Carl - Peek 2 danger cards"
```

Same method (`describe()`), different results. That's polymorphism!

---

# 🔴 ADVANCED: Encapsulation & Composition

## Concept #7: Private Fields (Encapsulation)

**Problem:** What if you want to protect data so it can't be changed from outside?

```javascript
// BAD - Anyone can change lives directly
class Player {
  constructor(name) {
    this.lives = 3;
  }
}

const player = new Player('Jeff');
player.lives = 100; // Oops! Hacked!
```

**Solution:** Use private fields with `#`

```javascript
// GOOD - Lives are protected
class Player {
  #lives; // Private field (only accessible inside this class)

  constructor(name) {
    this.name = name;
    this.#lives = 3;
  }

  // Public method to safely read lives
  getLives() {
    return this.#lives;
  }

  // Public method to safely change lives
  loseLife() {
    if (this.#lives > 0) {
      this.#lives -= 1;
    }
  }

  isAlive() {
    return this.#lives > 0;
  }
}

const player = new Player('Jeff');
console.log(player.getLives());  // 3 ✓
player.loseLife();               // Safe!
console.log(player.getLives());  // 2 ✓
player.#lives = 100;             // ❌ ERROR! Can't access private field
```

**Why encapsulation matters:**
- You control how data is modified
- You can add validation
- You prevent bugs from outside code
- You can change the implementation without breaking code that uses it

---

## Concept #8: Composition (HAS-A relationship)

**Inheritance** = IS-A relationship (DangerCard IS-A Card)
**Composition** = HAS-A relationship (Player HAS-A Character)

```javascript
// A Character is its own thing
class Character {
  constructor(name, ability) {
    this.name = name;
    this.ability = ability;
    this.abilitiesUsed = 0;
  }

  useAbility() {
    if (this.abilitiesUsed < 3) {
      this.abilitiesUsed += 1;
      return `Used ability! (${this.abilitiesUsed}/3)`;
    }
    return 'Ability exhausted!';
  }
}

// A Player HAS-A Character (composition, not inheritance)
class Player {
  #lives;
  #character; // COMPOSITION - Player contains a Character

  constructor(name, character) {
    this.name = name;
    this.#character = character;
    this.#lives = 3;
  }

  getCharacterName() {
    return this.#character.name;
  }

  useCharacterAbility() {
    return this.#character.useAbility();
  }
}

// Usage
const carl = new Character('Curious Carl', 'Peek top 2 danger cards');
const player = new Player('Jeff', carl);

console.log(player.getCharacterName());     // 'Curious Carl'
console.log(player.useCharacterAbility());  // 'Used ability! (1/3)'
```

**When to use what:**
- **Inheritance (IS-A):** DangerCard IS-A Card → use `extends`
- **Composition (HAS-A):** Player HAS-A Character → use as a property

---

## Concept #9: Static Methods & Properties

**Static** = belongs to the class itself, not to instances.

```javascript
class Game {
  static MAX_PLAYERS = 6;        // Static property
  static MIN_PLAYERS = 2;

  static rollDie() {             // Static method
    return Math.floor(Math.random() * 6) + 1;
  }

  static isValidPlayerCount(count) {
    return count >= this.MIN_PLAYERS && count <= this.MAX_PLAYERS;
  }
}

// Call static methods on the CLASS, not on instances
console.log(Game.MAX_PLAYERS);           // 6
console.log(Game.rollDie());             // random 1-6
console.log(Game.isValidPlayerCount(3)); // true

// You DON'T create a Game just to roll a die
// You call it directly on the class
```

**When to use static:**
- Utility functions (rolling dice, shuffling, etc)
- Constants shared by all instances
- Factory methods (create objects in a special way)

---

## Concept #10: Getters & Setters

**Getters** = safe way to read properties
**Setters** = safe way to change properties

```javascript
class Deck {
  #cards = [];

  // GETTER - use like a property, runs logic
  get size() {
    return this.#cards.length;
  }

  get isEmpty() {
    return this.#cards.length === 0;
  }

  // SETTER - use like assignment, runs logic
  set add(card) {
    if (card) {
      this.#cards.push(card);
    }
  }

  // Regular method
  drawCard() {
    if (!this.isEmpty) {
      return this.#cards.pop();
    }
  }
}

// Usage - looks like properties, but runs methods!
const deck = new Deck();
console.log(deck.isEmpty);  // true (getter)
deck.add = new Card(...);   // (setter)
console.log(deck.size);     // 1 (getter)
```

---

# 🎮 Putting It All Together: Last Laugh Structure

```
Game (composition hub)
├── players[] (array of Player objects)
│   ├── character (Character object)
│   ├── hand[] (array of Card objects)
│   └── lives (private, protected)
├── decks
│   ├── dangerDeck (Deck of DangerCard objects)
│   ├── actionDeck (Deck of ActionCard objects)
│   └── discardPile[] (array of Card objects)
└── gameState (tracks phase, turn, etc)
```

**Data Flow:**
1. Player calls `playCard(card)`
2. Game validates the move
3. Game updates internal state
4. UI re-renders based on new state

---

# 📝 Exercises

## Basic Exercises

### Exercise 1: Create a Card Class
```javascript
// TODO: Create a Card class with:
// - constructor(id, name, image)
// - describe() method that returns "name (id)"

// Then create 2 card instances and log their descriptions
```

**Solution:**
```javascript
class Card {
  constructor(id, name, image) {
    this.id = id;
    this.name = name;
    this.image = image;
  }

  describe() {
    return `${this.name} (${this.id})`;
  }
}

const card1 = new Card('d01', 'Shark', '3.png');
const card2 = new Card('a01', 'Not Today!', '11.png');

console.log(card1.describe()); // "Shark (d01)"
console.log(card2.describe()); // "Not Today! (a01)"
```

---

## Intermediate Exercises

### Exercise 2: Inheritance
```javascript
// TODO: Create DangerCard class that extends Card
// - Add effect property
// - Override describe() to show "⚠️ Name - Effect"

// Create ActionCard class that extends Card
// - Add timing property
// - Override describe() to show "✓ Name - Timing"

// Create 1 danger and 1 action, log their descriptions
```

**Solution:**
```javascript
class DangerCard extends Card {
  constructor(id, name, image, effect) {
    super(id, name, image);
    this.effect = effect;
  }

  describe() {
    return `⚠️ ${this.name} - ${this.effect}`;
  }
}

class ActionCard extends Card {
  constructor(id, name, image, timing) {
    super(id, name, image);
    this.timing = timing;
  }

  describe() {
    return `✓ ${this.name} - ${this.timing}`;
  }
}

const danger = new DangerCard('d01', 'Shark', '3.png', 'Lose 1 life');
const action = new ActionCard('a01', 'Not Today!', '11.png', 'anytime');

console.log(danger.describe()); // "⚠️ Shark - Lose 1 life"
console.log(action.describe()); // "✓ Not Today! - anytime"
```

---

## Advanced Exercises

### Exercise 3: Composition & Encapsulation
```javascript
// TODO: Create a Player class with:
// - PRIVATE #lives (3 by default)
// - PUBLIC name property
// - PUBLIC character property
// - PUBLIC getLives() method
// - PUBLIC loseLife() method (can't go below 0)
// - PUBLIC isAlive() method

// Create a Character class with:
// - name property
// - abilityUsesLeft (starts at 3)
// - useAbility() method (decrements uses, returns message)

// Create 1 character and 1 player with that character
// Test loseLife() and useAbility()
```

**Solution:**
```javascript
class Character {
  constructor(name) {
    this.name = name;
    this.abilityUsesLeft = 3;
  }

  useAbility() {
    if (this.abilityUsesLeft > 0) {
      this.abilityUsesLeft--;
      return `Ability used! (${this.abilityUsesLeft} left)`;
    }
    return 'No ability uses left!';
  }
}

class Player {
  #lives;

  constructor(name, character) {
    this.name = name;
    this.character = character;
    this.#lives = 3;
  }

  getLives() {
    return this.#lives;
  }

  loseLife() {
    if (this.#lives > 0) {
      this.#lives--;
    }
  }

  isAlive() {
    return this.#lives > 0;
  }
}

const carl = new Character('Curious Carl');
const player = new Player('Jeff', carl);

console.log(player.getLives());           // 3
player.loseLife();
console.log(player.getLives());           // 2
console.log(player.character.useAbility()); // "Ability used! (2 left)"
```

---

# 🔗 Next Steps

1. **Read the actual Last Laugh code:**
   - Open `cards.js` and find these patterns
   - Open `game.js` and find Deck, Player, Game classes

2. **Modify the game:**
   - Add a new character with a different ability
   - Change a danger card's effect
   - Add a new action card type

3. **Practice:**
   - Create your own simple game (Tic-tac-toe, Blackjack, etc)
   - Use classes for Card, Player, Game
   - Use inheritance, composition, encapsulation

---

# 📚 OOP Principles Summary

| Principle | Means | Example |
|-----------|-------|---------|
| **Encapsulation** | Hide internal data | Private `#lives`, public `getLives()` |
| **Inheritance** | IS-A relationship | `DangerCard extends Card` |
| **Polymorphism** | Same method, different behavior | Every card type has `describe()` |
| **Composition** | HAS-A relationship | `Player` has a `Character` |
| **Abstraction** | Hide complexity | Game logic hidden, UI calls methods |

Master these 5 and you can build anything! 🚀