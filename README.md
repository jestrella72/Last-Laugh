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

### 🏆 Story mode

Tap **🏆 Story mode**, pick your hero, and beat every other character in **1-on-1 duels**, easiest first:
Naive Nina → Cautious Casey → Bold Bella → Curious Carl → Melo Mel → Prankster Pete → Lucky Luke → Reckless Rosie → Franky Ice → Grumpy Lou → Slick Rick → **👑 final boss: Fester the Cat** (if you play as Fester, Slick Rick is the boss).

Each level gets harder: the bot plays smarter, has more lives (2 → 3), and later starts with bonus cards and extra ability uses. The final boss has 4 lives, 4 bonus cards, 2 extra ability uses and plays perfectly. Your progress is saved on your device, and you can retry any level as often as you like (🏳️ leaves a duel).

### 🌐 Playing online (everyone on their own phone)

1. One person taps **🏠 Create a room**, types their name and picks a character.
2. They get a **4-letter room code** and a link. Tap **📤 Share link** to send it (text, WhatsApp, etc.).
3. Friends open the link (or tap **🔗 Join with a code** and type it), enter their name and pick a character.
4. The host can **🤖 Add a bot** to fill seats, then taps **▶ Start game**.

Each phone shows only that player's cards. When the game needs a decision from you (react, Cancel, pick a card…) it pops up on your phone.

Good to know:
- The **host's device runs the game**, so the host should keep the page open and the screen on (the game asks the phone to stay awake). A computer or tablet makes a great host.
- If someone's phone drops out, **a bot plays for them** until they come back. They just open the link again with the same name, in the same browser tab, and they get their seat back.
- Phones connect to each other directly (WebRTC via the free PeerJS service), so there's no server or account. A few very strict networks (some school or office Wi-Fi) can block this; switching to mobile data usually fixes it.

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
1. Play any **During Your Turn** cards or use your ability.
2. Flip the top **Whoopsies** card. It's aimed at you.
3. Before it resolves, anyone can react with **Play At Any Time** or **Reaction** cards and abilities: Redirect, Slip Away, Not Today!, Grumpy Lou, Reckless Rosie… It's still your turn, so you can keep playing your turn cards too (Draw 2 before the shark checks your hand!).
4. Whoever it ends up aimed at resolves it.
5. Keep playing cards if you like, then **end your turn by drawing 1 Action card**. The next player to the left goes.

**Timing tags** (same colours as the printed cards)
| Tag | When |
|---|---|
| ⬛ During Your Turn | Only on your own turn, before you flip |
| 🟦 Play At Any Time | Whenever it makes sense |
| 🟥 Reaction | In response to something (a Whoopsies, an Action card, a Take 1…) |

**You only face Whoopsies on your own turn.** Everyone has a **table**. A Whoopsies sent to you (Redirect, Slip Away, the bear, Out of Luck!!, Fester) lands face-up on your table and waits there. On your turn you face the ones on your table first (you can play cards before each), then flip your own. A table holds **at most 2**, so the most you face in a turn is 2 + your own flip. Only the player whose turn it is flips; Grumpy Lou's swap only works on Lou's own turn.

**Tried to hug a bear:** when you flip it, you may pass it to another player's table (or keep it and lose 1 life). Whoever gets it faces it on their turn and **can't pass it again**: they lose 1 life unless a card like Not Today!, Redirect or Second Chance saves them.

**About to lose a life?** You're offered **Not Today!** (if a Whoopsies is hitting you) and **Second Chance** to keep it.

**End of turn:** you draw 1 Action card and the game shows you which one (only you see it).

**Running out of cards:** when the **Action deck** runs out, it is *not* reshuffled: nobody draws Action cards any more (ending your turn draws nothing, Draw 2 can't be played). When the **Whoopsies deck** runs out, it's reset: the used Whoopsies are shuffled back in.

**Out of Luck!!** on a 5–6 goes to the table of the player on your left or right, and they roll for it on their turn.

**Cancel** can stop any Action card, and Cancels stack (Cancel the Cancel, and so on). **Redirects stack** too: whoever a Whoopsies is redirected to can Redirect it again. **Not Today!** can be played at any time, even right before a Whoopsies takes your life. The game asks automatically whenever someone plays a card. **Drove wearing sunglasses at night** can only be stopped by Slip Away or Redirect.

## 🃏 The cards

**Whoopsies (37):** Forgot to tie shoelaces near a cliff ×5, Tried to pet a shark ×5, Took a bath with a toaster ×5, Tried to hug a bear ×5, Danced on wet tiles ×5, Ate mystery leftovers ×2, Texting while driving ×2, Drove wearing sunglasses at night ×3, Out of Luck!! ×3, Miraculous Escape! ×2

**Action (43):** Not Today! ×5 (Play At Any Time), Slip Away ×4, Redirect ×4, Second Chance ×4, Cancel ×4, Peek Ahead ×4, Safety First ×2, Take 1 ×5, Swap Hands ×2, Skip Your Turn ×2, Draw 2 ×4, Double Trouble ×2, Recover ×1

**Characters (12):** Curious Carl, Cautious Casey, Prankster Pete, Bold Bella, Lucky Luke, Naive Nina, Reckless Rosie, Melo Mel, Franky Ice, Grumpy Lou, Slick Rick, Fester the Cat

Card counts are set in `cards.js`. Change the `copies` number to rebalance.

## ✨ Extras

- **Redirect alert:** when a Whoopsies is pushed onto you (Redirect, Slip Away, the bear, Out of Luck!!, Fester), a shocked face pops up: "This is being REDIRECTED to you!" with the FAHHH sound.
- **Losing a life** plays FAHHH with a heart-break flash.
- **Slip Away** and **Redirect** play the FAHHH for everyone at the table.
- **Take 1** plays "emotional damage" 💔 and **Swap Hands** plays 3 seconds of sneaky saxophone 🎷, for everyone.
- **Draw 2** shows you the two cards you drew (only you see them).
- **NOPE!** Whenever someone plays Cancel, every screen shows a NOPE! pop-up with the "no" sound.
- **NOT TODAY!** plays the rizzbot laugh with its own pop-up.
- **WOW!** Whenever someone gains (or keeps) a life with Second Chance, every screen shows a WOW! pop-up with the wow sound.
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
| `net.js` | `NET`: online rooms, the lobby, and sending questions to the right phone |
| `app.js` | The UI controller: setup, turns, reactions, card effects, alerts |
| `index.html` / `styles.css` | Page layout and the vintage cartoon look |
| `images/cards/` | Final card art (WebP) |
| `images/redirect-emoji.png`, `sounds/*.mp3` | The redirect face and the FAHHH / NOPE / WOW sounds |

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
