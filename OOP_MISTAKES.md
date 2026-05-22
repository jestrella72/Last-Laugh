# Common OOP Mistakes & How to Avoid Them
## Learning from Real Code Pitfalls

---

# ❌ Mistake #1: Forgetting `new` Keyword

```javascript
// ❌ WRONG
class Player { ... }
const player = Player('Jeff', carl);  // Forgot 'new'!
// Result: this is undefined, CRASH

// ✅ RIGHT
const player = new Player('Jeff', carl);  // 'new' required
```

**Why it matters:** `new` creates a fresh object and calls constructor. Without it, `this` has no object to reference.

**Fix:** Always use `new` when creating instances.

---

# ❌ Mistake #2: Using `this` Outside a Class

```javascript
// ❌ WRONG
function createPlayer(name) {
  this.name = name;  // this is undefined outside a class!
}

// ✅ RIGHT
class Player {
  constructor(name) {
    this.name = name;  // this = the new player object
  }
}

const player = new Player('Jeff');
```

**Why it matters:** `this` only exists inside class methods and constructor.

**Fix:** Use `this` only inside class definitions.

---

# ❌ Mistake #3: Forgetting `super()` in Child Constructor

```javascript
class Card {
  constructor(id, name) {
    this.id = id;
    this.name = name;
  }
}

// ❌ WRONG
class DangerCard extends Card {
  constructor(id, name, effect) {
    // Forgot super()!
    this.effect = effect;  // ERROR! this is undefined yet
  }
}

// ✅ RIGHT
class DangerCard extends Card {
  constructor(id, name, effect) {
    super(id, name);  // Call parent FIRST
    this.effect = effect;  // Now this is defined
  }
}
```

**Why it matters:** Parent constructor sets up the object. You must call it before using `this`.

**Fix:** Always call `super()` first in child constructor.

---

# ❌ Mistake #4: Modifying Private Fields Outside the Class

```javascript
class Player {
  #lives = 3;  // PRIVATE - can't access outside this class

  getLives() {
    return this.#lives;
  }
}

const player = new Player();
console.log(player.getLives());  // ✅ 3 - correct way
console.log(player.#lives);      // ❌ SYNTAX ERROR! Can't access private

// Even this is wrong:
player.#lives = 100;  // ❌ SYNTAX ERROR! Can't modify private
```

**Why it matters:** Private fields protect data. Breaking encapsulation = bugs.

**Fix:** Use public methods to access/modify private fields:
```javascript
class Player {
  #lives = 3;

  // ✅ PUBLIC methods to safely access private data
  getLives() {
    return this.#lives;
  }

  loseLife() {
    if (this.#lives > 0) {
      this.#lives--;
    }
  }
}

const player = new Player();
player.loseLife();  // ✅ Safe way to modify
```

---

# ❌ Mistake #5: Inheritance When You Need Composition

```javascript
// ❌ WRONG - Player should not be a kind of Character
class Character {
  constructor(name, ability) { ... }
}
class Player extends Character {
  constructor(name, ability, lives) {
    super(name, ability);
    this.lives = lives;
  }
}

// This is wrong because:
// - Player IS-A Character doesn't make sense
// - A player HAS-A character
// - Now Player has ability as its own, not character's

// ✅ RIGHT - Composition
class Player {
  constructor(name, character) {
    this.name = name;
    this.character = character;  // Has a character, doesn't BE one
    this.lives = 3;
  }

  getCharacterName() {
    return this.character.name;  // Access via character property
  }
}

const carl = new Character('Curious Carl', 'Peek 2 dangers');
const player = new Player('Jeff', carl);  // ✅ Player HAS-A Character
```

**When to use:**
- **Inheritance (IS-A):** DangerCard IS-A Card → `extends`
- **Composition (HAS-A):** Player HAS-A Character → property

---

# ❌ Mistake #6: Mutating Objects You Didn't Create

```javascript
// ❌ WRONG - Modifying an object passed in
class Deck {
  constructor(cards) {
    this.cards = cards;  // Dangerous! Modifying original array
  }
}

const original = [card1, card2, card3];
const deck = new Deck(original);
deck.cards.pop();  // Now original array is also modified!

// ✅ RIGHT - Make a copy
class Deck {
  constructor(cards) {
    this.cards = [...cards];  // Make a copy with spread operator
    // or:
    // this.cards = cards.slice();
  }
}

const original = [card1, card2, card3];
const deck = new Deck(original);
deck.cards.pop();  // Original is safe!
```

**Why it matters:** Unexpected side effects cause bugs.

**Fix:** Make copies of arrays/objects passed to constructor.

---

# ❌ Mistake #7: Calling Instance Methods on Class

```javascript
class Game {
  // Instance method (tied to a specific game)
  getWinner() {
    return this.winner;
  }

  // Static method (not tied to any instance)
  static rollDie() {
    return Math.floor(Math.random() * 6) + 1;
  }
}

// ❌ WRONG - Instance methods need an instance
const winner = Game.getWinner();  // ERROR! this is undefined

// ✅ RIGHT - Create instance first
const game = new Game();
const winner = game.getWinner();  // ✅ Works

// ✅ RIGHT - Static methods can be called on class
const roll = Game.rollDie();  // ✅ Works without instance
```

**Why it matters:** Instance methods need `this` = an object. Class methods don't.

**Fix:** Use `new` to create instance for instance methods. Static methods are called on class.

---

# ❌ Mistake #8: Forgetting `this.` When Accessing Properties

```javascript
class Player {
  constructor(name) {
    this.name = name;
  }

  getName() {
    // ❌ WRONG - name is undefined (no variable named name exists)
    return name;  // ReferenceError: name is not defined

    // ✅ RIGHT - access property via this
    return this.name;
  }
}

const player = new Player('Jeff');
console.log(player.getName());  // 'Jeff'
```

**Why it matters:** Properties live on `this`, not as standalone variables.

**Fix:** Always use `this.propertyName` inside methods.

---

# ❌ Mistake #9: Not Using Getters When You Should

```javascript
// ❌ AWKWARD - weird API
class Deck {
  constructor(cards) {
    this.size_value = cards.length;  // Awkward naming
  }
}

const deck = new Deck([card1, card2]);
console.log(deck.size_value);  // Looks like a data field

// ✅ CLEAN - getter makes it look like a property
class Deck {
  #cards;

  constructor(cards) {
    this.#cards = cards;
  }

  get size() {  // Getter - looks like a property!
    return this.#cards.length;
  }
}

const deck = new Deck([card1, card2]);
console.log(deck.size);  // ✅ Looks like a property, runs code
```

**Why it matters:** Getters provide a clean API that hides complexity.

**Fix:** Use getters for read-only properties that compute values.

---

# ❌ Mistake #10: Calling Methods Without Understanding Encapsulation

```javascript
class Player {
  #lives = 3;

  // ✅ This is SAFE - validation inside
  loseLife() {
    if (this.#lives > 0) {
      this.#lives--;
    }
    // Can't go below 0
  }

  // ❌ This is UNSAFE - no validation
  setLives(amount) {
    this.#lives = amount;  // Anyone can set to any value!
  }
}

const player = new Player();
player.setLives(-100);  // Oops! Invalid game state
```

**Why it matters:** Methods should validate data before modifying state.

**Fix:** Put validation logic in methods:
```javascript
class Player {
  #lives = 3;
  #maxLives = 3;

  // ✅ SAFE - validates bounds
  setLives(amount) {
    if (amount >= 0 && amount <= this.#maxLives) {
      this.#lives = amount;
    }
  }

  // Or better - use named methods
  loseLife() {
    if (this.#lives > 0) this.#lives--;
  }

  gainLife() {
    if (this.#lives < this.#maxLives) this.#lives++;
  }
}
```

---

# ❌ Mistake #11: Breaking Encapsulation

```javascript
// ❌ WRONG - exposing internal array
class Deck {
  constructor(cards) {
    this.cards = cards;  // Public! Anyone can mess with it
  }
}

const deck = new Deck([card1, card2, card3]);
deck.cards = [];  // Oops! Emptied the deck
deck.cards[0] = fakeCard;  // Oops! Cheated!

// ✅ RIGHT - protect internal data
class Deck {
  #cards;  // Private!

  constructor(cards) {
    this.#cards = [...cards];
  }

  get size() {
    return this.#cards.length;
  }

  draw() {
    if (this.#cards.length > 0) {
      return this.#cards.pop();
    }
  }
}

const deck = new Deck([card1, card2, card3]);
deck.#cards = [];  // ❌ SYNTAX ERROR - can't access
deck.draw();  // ✅ Safe method
```

**Why it matters:** Direct access to internal data allows cheating and bugs.

**Fix:** Make internal data `#private`, provide safe public methods.

---

# ❌ Mistake #12: Confusing Static and Instance

```javascript
class Game {
  static MAX_PLAYERS = 6;  // Static - belongs to Game class
  players = [];            // Instance - each game has its own

  // ❌ WRONG
  this.static MAX_PLAYERS = 5;  // Syntax error!

  // ✅ RIGHT - Static defined outside constructor
  static MAX_PLAYERS = 6;
  static rollDie() { ... }

  // Instance properties in constructor
  constructor() {
    this.players = [];
    this.winner = null;
  }
}

// Usage
Game.MAX_PLAYERS;      // ✅ Static on class
const game1 = new Game();
game1.players;         // ✅ Instance on object
const game2 = new Game();
// game1 and game2 each have their own players array
```

**Fix:** Understand the difference:
- **Static** = shared by all instances, on the class
- **Instance** = each object has its own, in constructor

---

# 🎓 Debugging Checklist

When things break, check:

- [ ] Used `new` to create object?
- [ ] Called `super()` in child constructor?
- [ ] Using `this.` to access properties?
- [ ] Not trying to access `#private` fields outside class?
- [ ] Validating data before modifying state?
- [ ] Making copies of arrays/objects passed in?
- [ ] Using getters/setters instead of direct access?
- [ ] Calling methods on instances, not classes (unless static)?

---

# 💡 Best Practices Summary

| Do | Don't |
|----|-------|
| ✅ Use `new` for instances | ❌ Access `#private` outside class |
| ✅ Call `super()` first | ❌ Use inheritance for composition |
| ✅ Use `this.property` | ❌ Mutate objects you didn't create |
| ✅ Make data `#private` | ❌ Expose internal arrays directly |
| ✅ Provide safe methods | ❌ Trust external code to be safe |
| ✅ Use getters for read-only | ❌ Forget validation in methods |
| ✅ Use composition for HAS-A | ❌ Use inheritance for HAS-A |
| ✅ Use inheritance for IS-A | ❌ Static on instances |

---

# 🚀 Next Steps

1. **Read Last Laugh code** and spot these patterns
2. **Modify a card** and test what breaks
3. **Try to cheat** the game (access private fields, etc.) and see errors
4. **Write your own class** with proper encapsulation
5. **Find your own mistakes** and fix them!

The best way to learn is by breaking things and fixing them. 💪
