# Last Laugh — Card Game

A fully playable browser-based digital version of the **Last Laugh** trading card game, built with **vanilla JavaScript** and **OOP principles** for learning.

## 🎮 How to Play

1. **Start the server:**
   ```bash
   python -m http.server 8090
   ```

2. **Open in browser:**
   ```
   http://localhost:8090
   ```

3. **Game setup:**
   - Choose 2-6 players
   - Each player enters their name and selects a character
   - Each player starts with 3 lives (adjusts based on player count)
   - Deal 5 Action cards to each player

4. **Turn flow:**
   - Flip a Danger card from the deck
   - Players react with Action cards
   - Resolve the danger based on card effects
   - Advance to next player's turn

5. **Win condition:**
   - Last player standing wins!

## 📚 OOP Learning

This project teaches core OOP concepts through working code:

| Concept | Location |
|---------|----------|
| **Classes & Constructors** | `cards.js` — `Card`, `DangerCard`, `ActionCard`, `CharacterCard` |
| **Inheritance** (`extends`/`super`) | Child classes extend `Card` and call parent constructor |
| **Polymorphism** | Each card type overrides `describe()` differently |
| **Encapsulation** (private fields `#`) | `Deck.#cards` — hidden array with public methods |
| **Composition** | `Player` has a `character`; `Game` has `players` and `decks` |
| **Static methods** | `Game.rollDie()` — belongs to class, not instances |
| **Getters** | `get canPlayAnytime`, `get size`, `get isEmpty` |

**Read the comments in `cards.js` and `game.js`** — each concept is explained with plain English.

## 📁 Files

- **`cards.js`** (550 lines)
  - Card base class + 3 subclasses
  - All 36 danger cards, 50 action cards, 10 character cards defined
  - Heavy OOP lesson comments

- **`game.js`** (300 lines)
  - `Deck` class with shuffle, draw, peek, rearrange methods
  - `Player` class with life/ability tracking
  - `Game` class as the "source of truth" for all game state
  - OOP comments on encapsulation & composition

- **`index.html`** (1400+ lines)
  - Complete game UI with CSS styling (green felt table aesthetic)
  - Game controller that orchestrates Deck/Player/Game classes
  - Modal dialogs for interactions (pick cards, choose targets, roll dice, etc)
  - Hotseat support (players pass device between turns)

- **`1.png` — `31.png`**
  - Card images for all unique card types

## 🎯 Game Rules (Quick Summary)

### Danger Cards
Flip one each turn. Players react with Action cards to avoid/modify effects:
- **Toaster Bath** — Discard 1 card or lose 1 life
- **Shark** — Lose 1 life if you have <3 cards in hand
- **Wet Tiles** — Roll die; 4+ is safe
- **Bear Hug** — Pass to another player or lose 1 life
- ...and 6 more unique dangers (36 total copies)

### Action Cards
Play during reactions or on your turn to affect the game:
- **Not Today!** — Negate a danger entirely
- **Redirect** — Force another player to face the danger
- **Slip Away** — Pass danger to player on your left
- **Second Chance** — Survive without losing a life
- ...and 10 more card types (50 total copies)

### Character Abilities
Each player picks a character with a special 3-use ability:
- **Curious Carl** — Peek & rearrange top 2 Danger cards
- **Reckless Rosie** — Roll die to avoid damage
- **Lucky Luke** — Cancel Take 1/Swap Hands on 4+
- ...and 7 more

## 🚀 Features

✅ 2-6 player hotseat mode (pass device between turns)
✅ Full danger resolution system with 10 card types
✅ 50 unique action cards with complex interactions
✅ 10 playable characters with abilities
✅ Dice rolling with reroll support
✅ Multi-step reactions & responses
✅ Game log tracking all actions
✅ Modal dialogs for choices (pick cards, targets, etc)
✅ Responsive design (desktop & mobile)

## 🔧 Architecture

- **Separation of concerns:** Game engine (classes) ≠ UI rendering
- **Source of truth:** `G` (Game instance) is the single source of truth
- **Event-driven:** User clicks → updates game state → re-render board
- **Stateful UI:** Phase machine tracks game progress (setup → pre-flip → reacting → resolving → game-over)

## 📖 To Learn OOP

1. Read `cards.js` top-to-bottom — each class is explained
2. Read `game.js` top-to-bottom — focus on `Deck` and `Game` encapsulation
3. Open `index.html` in browser and watch how the UI calls game methods
4. Try modifying a card's effect or adding a new character ability

## 🎓 License

MIT — Free to learn, modify, and share!

---

**Built with:** Vanilla JavaScript (no frameworks), HTML5, CSS3
**For:** Learning OOP principles through a complete, playable game
