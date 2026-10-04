# Last Laugh — Card Game

A pass-and-play browser version of the **Last Laugh** card game, built with **vanilla JavaScript** and **OOP principles** for learning. Vintage rubber-hose cartoon look, the final card art, a ragtime soundtrack, and plenty of "FAHHH".

## 🎮 Play it

**Online:** https://jestrella72.github.io/Last-Laugh/ (works on iPhone, Android and desktop; share the link!)

On a phone, use **Add to Home Screen** (Safari share menu on iPhone, ⋮ menu in Chrome on Android) and it opens full-screen like an app.

**Locally:**

```bash
python -m http.server 8090
```

Then open http://localhost:8090.

### 🤖 Playing with bots

- Tap **Solo test: you vs 3 bots** to jump straight into a game against the computer.
- Or pick a player count and switch any seat to **🤖 Bot**. You can mix humans and bots.
- Bots play cards, use their abilities, react to Whoopsies (Redirect, Slip Away, Not Today!…), Cancel your cards and pick on whoever's winning. They even trash-talk in Table Talk.
- With only one human, there are no pass-the-device screens. You just play.

## 📖 How to play

**Goal:** be the last player with lives left. You get the Last Laugh!

**Setup**
- 2–8 players on one device. Everyone picks a character. The aces printed on the card show how many times you can use its ability (Prankster Pete has 4, Franky Ice has 2, everyone else has 3).
- Everyone gets 5 Action cards.
- Lives: 3 each with 2–3 players, 2 with 4–5, 1 with 6–8.

**On your turn**
1. Draw 1 Action card.
2. Play any **During Your Turn** cards or use your ability.
3. Flip the top **Whoopsies** card. It's aimed at you.
4. Before it resolves, anyone can react with **Play At Any Time** or **Reaction** cards and abilities: Redirect, Slip Away, Not Today!, Grumpy Lou, Reckless Rosie…
5. Whoever it ends up aimed at resolves it. Then the next player to the left goes.

**Timing tags** (same colours as the printed cards)
| Tag | When |
|---|---|
| ⬛ During Your Turn | Only on your own turn, before you flip |
| 🟦 Play At Any Time | Whenever it makes sense |
| 🟥 Reaction | In response to something (a Whoopsies, an Action card, a Take 1…) |

**Tried to hug a bear** can be passed on once, when it's revealed. Whoever gets handed the bear loses the life.

**Cancel** can stop any Action card (and a Cancel can be Cancelled). The game asks automatically whenever someone plays a card. **Drove wearing sunglasses at night** can only be stopped by Slip Away or Redirect.

## 🃏 The cards

**Whoopsies (37):** Forgot to tie shoelaces near a cliff ×5, Tried to pet a shark ×5, Took a bath with a toaster ×5, Tried to hug a bear ×5, Danced on wet tiles ×5, Ate mystery leftovers ×2, Texting while driving ×2, Drove wearing sunglasses at night ×3, Out of Luck!! ×3, Miraculous Escape! ×2

**Action (43):** Not Today! ×5, Slip Away ×4, Redirect ×4, Second Chance ×4, Cancel ×4, Peek Ahead ×4, Safety First ×2, Take 1 ×5, Swap Hands ×2, Skip Your Turn ×2, Draw 2 ×4, Double Trouble ×2, Recover ×1

**Characters (12):** Curious Carl, Cautious Casey, Prankster Pete, Bold Bella, Lucky Luke, Naive Nina, Reckless Rosie, Melo Mel, Franky Ice, Grumpy Lou, Slick Rick, Fester the Cat

Card counts are set in `cards.js`. Change the `copies` number to rebalance.

## ✨ Extras

- **Redirect alert:** when a Whoopsies is pushed onto you (Redirect, Slip Away, the bear, Out of Luck!!, Fester), a shocked face pops up: "This is being REDIRECTED to you!" with the FAHHH sound.
- **Losing a life** plays FAHHH with a heart-break flash.
- **Table Talk:** a text box beside the table. Pick who's talking, type, or tap a quick line. Messages also pop up as speech bubbles over that player.
- **Soundtrack:** a ragtime piano loop generated in the browser (no music file needed). 🎵 toggles music, 🔊 toggles sound effects.
- Dice and coin animations, card flip reveals, and confetti for the winner.

## 📁 Files

| File | What it holds |
|---|---|
| `cards.js` | `Card` → `WhoopsiesCard`, `ActionCard`, `CharacterCard` classes and every card in the game |
| `game.js` | `Deck`, `Player`, `Game`: the rules and the state |
| `sound.js` | `SoundManager`: the music loop and sound effects |
| `bots.js` | `Bot`: how computer players make every decision |
| `app.js` | The UI controller: setup, turns, reactions, card effects, alerts |
| `index.html` / `styles.css` | Page layout and the vintage cartoon look |
| `images/cards/` | Final card art (WebP) |
| `images/redirect-emoji.png`, `sounds/fahhh.mp3` | The redirect face and the FAHHH |

## 📚 OOP learning

| Concept | Where |
|---|---|
| **Classes & constructors** | `cards.js`: `Card`, `WhoopsiesCard`, `ActionCard`, `CharacterCard` |
| **Inheritance** (`extends`/`super`) | Card subclasses call the parent constructor |
| **Polymorphism** | Each card type overrides `describe()` |
| **Encapsulation** (private `#` fields) | `Deck.#cards`, `SoundManager.#ctx` |
| **Composition** | `Player` has a `character`; `Game` has `players` and decks |
| **Static members** | `Game.rollDie()`, `Game.flipCoin()`, `SoundManager.BPM` |
| **Getters** | `canPlayAnytime`, `timingLabel`, `size`, `safetyActive` |
| **async / await** | `app.js`: every question to the players is a Promise |

The guides in `OOP_LEARNING_GUIDE.md`, `OOP_MISTAKES.md` and `CODE_EXAMPLES.md` walk through these ideas with small standalone examples.

## 🎓 License

MIT. Free to learn, modify, and share!
