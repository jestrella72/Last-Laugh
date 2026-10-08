// =============================================================
//  LAST LAUGH — Tutorial
//
//  A step-by-step animated walkthrough of the rules, built from the
//  real card data in cards.js (so card names, timing tags and ability
//  uses here always match the game).
//
//  OOP LESSON: TUTORIAL is a single object that owns its own screen.
//  Each slide is plain data ({ chapter, title, body, scene }), and
//  scene() returns the animated picture for that slide.
// =============================================================

const tCard  = id => [...WHOOPSIES_CARDS, ...ACTION_CARDS, ...CHARACTER_CARDS].find(c => c.id === id);
const tTag   = timing => `<span class="tag tag-${timing}">${TIMING_LABEL[timing]}</span>`;
const tAces  = n => '<span class="aces t-aces">' + '<b>A♠</b>'.repeat(n) + '</span>';

// A card picture for a scene. cls adds an animation, delay staggers it.
function tCardHTML(id, { cls = '', delay = 0, w = 120, badge = '' } = {}) {
  const c = tCard(id);
  return `<div class="card t-card ${cls}" style="--w:${w}px;animation-delay:${delay}s" title="${esc(c.name)}">
            <img src="${c.image}" alt="${esc(c.name)}" draggable="false">${badge ? `<span class="badge">${badge}</span>` : ''}
          </div>`;
}
const tRow   = (html, cls = '') => `<div class="t-row ${cls}">${html}</div>`;
const tArrow = (txt = '', delay = 0) => `<div class="t-arrow" style="animation-delay:${delay}s">➜${txt ? `<small>${txt}</small>` : ''}</div>`;

// When and how each character's ability is used in the app
const T_CHAR_HOW = {
  c_carl:   ['Tap your ✨ ability button on your turn, best before you flip.', 'See the next 2 Whoopsies and choose their order, so you can flip the safer one.'],
  c_casey:  ['Automatic: right after you resolve a Whoopsies on your turn, the game offers you a free Action card.', 'Say “Save it” to keep the use for later.'],
  c_pete:   ['Tap ✨ on your turn. Pick a player, then the card you give them. You get a random card back from their hand.', 'Pete has 4 uses, the most of anyone.'],
  c_bella:  ['Tap ✨ on your turn.', 'Rearrange the next 2 Action cards so you draw the better one when you end your turn.'],
  c_luke:   ['Reaction: when someone plays Take 1 or Swap Hands on you, the game asks if you want to roll.', 'Roll a 4, 5 or 6 and their card does nothing.'],
  c_nina:   ['Tap ✨ on your turn and pick a player. Their whole hand is shown to you.', 'Call heads or tails. Call it right and you throw away one of their cards. Everyone sees which one.'],
  c_rosie:  ['When a Whoopsies is aimed at you, tap 🃏 React and pick Reckless Rosie.', 'Roll a 4 or higher and you take no damage from it.'],
  c_mel:    ['Any time anyone rolls a die (even someone else), the game asks if you want to re-roll it.', 'Great for saving a friend… or ruining an enemy’s lucky roll.'],
  c_franky: ['Tap ✨ on your turn and pick a player.', 'On their next turn they can only play 1 Action card. Franky only has 2 uses.'],
  c_lou:    ['Only on your own turn: when your Whoopsies is revealed, tap 🃏 React and pick Grumpy Lou.', 'It goes to the bottom of the deck and you flip a new one instead.'],
  c_rick:   ['Whenever another player plays an Action card, the game asks if you want to copy it.', 'You get the same effect for yourself, without spending a card.'],
  c_fester: ['Tap ✨ on your turn and discard a card.', 'The top Whoopsies of the deck goes onto the table of the player you pick.'],
  c_lenny:  ['Automatic: whenever your hand drops below 3 cards, the game offers you a free draw.', 'Say no and it only asks again when your hand gets even smaller. You can also use it from the React menu.'],
  c_leo:    ['Tap ✨ on your turn, or 🃏 React while anyone is facing a Whoopsies (once per Whoopsies).', 'Discard a card, pick a player, and choose ANY Whoopsies from the discard pile for their table. 🔒 Unlocks when you beat Story mode.'],
};

// Tips for each Action card
const T_ACTION_HOW = {
  a_not_today:     'When a Whoopsies is aimed at you, play it and nothing happens to you. Doesn’t work on “Drove wearing sunglasses at night”.',
  a_slip:          'When a Whoopsies is aimed at you, it slides to the player on your left. It waits on their table for their turn.',
  a_redirect:      'When a Whoopsies is aimed at you, pick ANY player to take it. They can Redirect it again!',
  a_second_chance: 'Gain 1 life (up to your starting lives). The game offers it right before you would lose a life.',
  a_cancel:        'Stops any Action card someone plays. Cancels stack: you can Cancel a Cancel.',
  a_peek:          'Look at the top 3 Whoopsies and put them back in any order.',
  a_safety:        'Nobody loses a life until your next turn.',
  a_take1:         'Steal a random Action card from a player. You see what you got, and they see what they lost.',
  a_swap:          'Trade your whole hand with another player’s hand.',
  a_skip:          'Skip any player’s next turn, even your own.',
  a_draw2:         'Draw 2 Action cards. Play it before “Tried to pet a shark” checks your hand!',
  a_double:        'Make any player (you too) take an extra turn, with all the normal flips and draws.',
  a_recover:       'Take any Action card back from the discard pile.',
};

const TUTORIAL = {
  i: 0,
  slides: [],

  build() {
    const S = [];
    const add = (chapter, title, body, scene = () => '') => S.push({ chapter, title, body, scene });

    // ── 1. The basics ────────────────────────────────────────
    add('Basics', 'Welcome to Last Laugh!',
      `<p>Everybody is one <b>Whoopsies</b> away from disaster. Dodge them, push them onto other players, and be the <b>last player with lives left</b>.</p>
       <p>Tap <b>Next ▶</b> to walk through everything. Use the chapters at the top to jump around.</p>`,
      () => tRow(tCardHTML('w_shark', { cls: 't-deal', delay: 0 }) + tCardHTML('a_redirect', { cls: 't-deal', delay: .15 }) + tCardHTML('c_fester', { cls: 't-deal', delay: .3 })));

    add('Basics', 'Three kinds of cards',
      `<p><b>Whoopsies</b> (red back): disasters. You flip one every turn and it's aimed at you.</p>
       <p><b>Action cards</b> (yellow back): your tools. You start with <b>5</b> and draw 1 at the end of each turn.</p>
       <p><b>Character</b>: the hero you pick. Each one has a special ability.</p>`,
      () => tRow(
        `<div class="t-col">${tCardHTML('w_toaster', { cls: 't-deal' })}<b>Whoopsies</b></div>` +
        `<div class="t-col">${tCardHTML('a_draw2', { cls: 't-deal', delay: .15 })}<b>Action</b></div>` +
        `<div class="t-col">${tCardHTML('c_casey', { cls: 't-deal', delay: .3 })}<b>Character</b></div>`));

    add('Basics', 'Lives',
      `<p>Your starting lives depend on how many people are playing:</p>
       <table class="t-table">
         <tr><td>2–3 players</td><td>❤️❤️❤️</td></tr>
         <tr><td>4–5 players</td><td>❤️❤️</td></tr>
         <tr><td>6–8 players</td><td>❤️</td></tr>
       </table>
       <p>Lose all your lives and you're out. Last one standing gets the Last Laugh!</p>`,
      () => `<div class="t-hearts"><span class="t-heart">❤️</span><span class="t-heart">❤️</span><span class="t-heart t-break">❤️</span></div>`);

    // ── 2. Your turn ─────────────────────────────────────────
    const steps = ['Play cards & abilities', 'Flip a Whoopsies', 'Everyone can react', 'Resolve it', 'Play more cards', 'End turn: draw 1'];
    const flow = hl => `<div class="t-flow">${steps.map((s, n) =>
      `<div class="t-step ${n === hl ? 'on' : ''} ${n < hl ? 'done' : ''}"><span>${n + 1}</span>${s}</div>`).join('')}</div>`;

    add('Your turn', 'Your turn, step by step',
      `<p>Every turn follows the same rhythm. The next few slides go through each step.</p>`,
      () => `<div class="t-flow t-flow-anim">${steps.map((s, n) =>
               `<div class="t-step" style="animation-delay:${n * .45}s"><span>${n + 1}</span>${s}</div>`).join('')}</div>`);

    add('Your turn', '1 · Play cards and use your ability',
      `<p>Tap a card in your hand to read it, then <b>Play it!</b> Play as many as you like.</p>
       <p>Your character's <b>✨ ability button</b> sits next to the Flip button. It shows how many uses you have left.</p>`,
      () => flow(0) + tRow(tCardHTML('a_peek', { cls: 't-lift' }) + tCardHTML('a_take1', { cls: 't-lift', delay: .2 }) + tCardHTML('a_draw2', { cls: 't-lift', delay: .4 })));

    add('Your turn', '2 · Flip a Whoopsies',
      `<p>Tap <b>⚠️ Flip a Whoopsies!</b> The top card is revealed and it's aimed at <b>you</b>.</p>
       <p>If other players sent Whoopsies to your table, you face those first (see the <b>Whoopsies</b> chapter).</p>`,
      () => flow(1) + tRow(`<div class="card t-card t-back" style="--w:130px"><img src="${CARD_BACKS.whoopsies}" alt="Whoopsies deck"></div>` + tArrow() + tCardHTML('w_tiles', { cls: 't-flip', w: 130 })));

    add('Your turn', '3 · Everyone can react',
      `<p>Before the Whoopsies hits, <b>anyone</b> can play <b>Play At Any Time</b> or <b>Reaction</b> cards and abilities. The game asks each player who has something they can play.</p>
       <p>You might dodge it with Redirect… then the other player Redirects it right back!</p>`,
      () => flow(2) + tRow(tCardHTML('w_bear', { w: 110 }) + tArrow('', .3) + tCardHTML('a_redirect', { cls: 't-pop', delay: .5, w: 110 }) + tArrow('', .9) + tCardHTML('a_redirect', { cls: 't-pop', delay: 1.1, w: 110 })));

    add('Your turn', '4 · Resolve it',
      `<p>Whoever the Whoopsies ends up aimed at does what the card says: roll a die, discard a card, or lose a life.</p>
       <p>About to lose a life? The game offers you <b>Not Today!</b> or <b>Second Chance</b> if you have them.</p>`,
      () => flow(3) + tRow(tCardHTML('w_tiles', { w: 120 }) + `<div class="t-die">🎲</div>` + `<div class="t-heart t-break big">❤️</div>`));

    add('Your turn', '5 · Keep playing: action cards any time on your turn',
      `<p><b>It's your turn the whole time</b>, so your <b>During Your Turn</b> cards work at every step: before you flip, <b>while your Whoopsies is out</b> (tap <b>🃏 React!</b> when the game asks), and after it's resolved.</p>
       <p>Example: you flip <b>Tried to pet a shark</b> with only 2 cards. Before it resolves, play <b>Draw 2</b> → now you have 3 cards and you're safe!</p>
       <p>❄️ Only limit: if <b>Franky Ice</b> froze you, you can play just 1 Action card this turn.</p>`,
      () => flow(4) + tRow(tCardHTML('w_shark', { w: 115 }) + `<div class="t-plus">+</div>` + tCardHTML('a_draw2', { cls: 't-pop', delay: .4, w: 115 }) + `<div class="t-plus">=</div>` + `<div class="t-safe t-pop" style="animation-delay:.9s">SAFE!</div>`));

    add('Your turn', '6 · End your turn',
      `<p>Tap <b>✋ End turn</b>. You draw 1 Action card (only you see it) and play passes to the left.</p>
       <p>When the Action deck runs out, it is <b>not</b> reshuffled: no more draws. The Whoopsies deck <b>is</b> reshuffled when it runs out.</p>`,
      () => flow(5) + tRow(`<div class="card t-card" style="--w:120px"><img src="${CARD_BACKS.action}" alt="Action deck"></div>` + tArrow() + tCardHTML('a_cancel', { cls: 't-draw', delay: .3 })));

    // ── 3. Timing tags ───────────────────────────────────────
    add('Timing', 'Every card has a timing tag',
      `<p>The coloured tag on a card (and on character cards) tells you <b>when</b> you can use it.</p>
       <table class="t-table t-tags">
         <tr><td>${tTag(TIMING.YOUR_TURN)}</td><td>Only on <b>your own turn</b>, at any point in it.</td></tr>
         <tr><td>${tTag(TIMING.ANY_TIME)}</td><td>Whenever it makes sense, even on someone else's turn.</td></tr>
         <tr><td>${tTag(TIMING.REACTION)}</td><td>In response to something happening: a Whoopsies, an Action card, a Take 1…</td></tr>
       </table>`);

    for (const timing of [TIMING.YOUR_TURN, TIMING.ANY_TIME]) {
      const cards = ACTION_CARDS.filter(c => c.timing === timing);
      add('Timing', `${TIMING_LABEL[timing]} cards`,
        `<p>${timing === TIMING.YOUR_TURN
            ? 'Tap these in your hand on your turn: before you flip, while your Whoopsies is out, or after.'
            : 'These wait in your hand. When the moment comes, the game pops up and asks if you want to play one.'}</p>
         <ul class="t-list">${cards.map(c => `<li><b>${esc(c.name)}</b> ×${c.copies}: ${T_ACTION_HOW[c.id]}</li>`).join('')}</ul>`,
        () => tRow(cards.map((c, n) => tCardHTML(c.id, { cls: 't-deal', delay: n * .08, w: 82 })).join(''), 't-wrap'));
    }

    add('Timing', 'Reactions: how the game asks you',
      `<p>You never miss a reaction. When something happens that you can respond to, the game asks <b>only the players who can do something</b>:</p>
       <ul class="t-list">
         <li><b>A Whoopsies is revealed</b> → 🃏 React! for Not Today!, Redirect, Slip Away, Second Chance, Double Trouble, Rosie, Lou, Leo, Lenny.</li>
         <li><b>Someone plays an Action card</b> → you're offered <b>Cancel</b> (and Slick Rick can copy it).</li>
         <li><b>Take 1 or Swap Hands on you</b> → Lucky Luke can roll to stop it.</li>
         <li><b>Any die is rolled</b> → Melo Mel can re-roll it.</li>
         <li><b>You're about to lose a life</b> → Not Today! and Second Chance.</li>
       </ul>
       <p>Not your moment? Tap <b>Pass</b>.</p>`,
      () => tRow(tCardHTML('a_not_today', { cls: 't-pop', w: 110 }) + tCardHTML('c_luke', { cls: 't-pop', delay: .2, w: 110 }) + tCardHTML('c_mel', { cls: 't-pop', delay: .4, w: 110 })));

    add('Timing', 'Cancel wars',
      `<p><b>Cancel</b> stops any Action card. But Cancels stack, so someone can Cancel <i>your</i> Cancel, and the original card goes through after all!</p>
       <p>The game shows a <b>NOPE!</b> every time a Cancel is played.</p>`,
      () => tRow(tCardHTML('a_take1', { w: 105 }) + tArrow('NOPE', .3) + tCardHTML('a_cancel', { cls: 't-pop', delay: .5, w: 105 }) + tArrow('NOPE', .9) + tCardHTML('a_cancel', { cls: 't-pop', delay: 1.1, w: 105 })));

    // ── 4. Whoopsies ─────────────────────────────────────────
    add('Whoopsies', 'Your table',
      `<p>A Whoopsies pushed onto you (Redirect, Slip Away, the bear, Out of Luck!!, Fester, Leo) lands <b>face-up on your table</b>. It waits there until <b>your</b> turn.</p>
       <p>On your turn you face the ones on your table first (you can play cards before each one), then flip your own.</p>
       <p>A table holds <b>at most 2</b>, so the most you face in one turn is 2 + your own flip.</p>`,
      () => `<div class="t-tablebox"><div class="t-tablelabel">Your table (max 2)</div>${tRow(
               tCardHTML('w_bear', { cls: 't-slide', w: 95 }) + tCardHTML('w_outofluck', { cls: 't-slide', delay: .4, w: 95 }) +
               `<div class="card t-card t-ghost" style="--w:95px">🚫</div>`)}</div>`);

    add('Whoopsies', 'All the Whoopsies',
      `<ul class="t-list">${WHOOPSIES_CARDS.map(w => `<li><b>${esc(w.name)}</b> ×${w.copies}: ${esc(w.effectText ?? w.text ?? '')}</li>`).join('')}</ul>
       <p>🐻 <b>Tried to hug a bear:</b> you may pass it to another table. Whoever gets it <b>can't pass it again</b>.</p>`,
      () => tRow(WHOOPSIES_CARDS.map((c, n) => tCardHTML(c.id, { cls: 't-deal', delay: n * .06, w: 72 })).join(''), 't-wrap'));

    // ── 5. Characters & ability uses ─────────────────────────
    add('Characters', 'Ability uses: count the aces',
      `<p>The <b>ace icons</b> printed on a character card show how many times you can use its ability <b>in the whole game</b>, not per turn.</p>
       <p>In the game they're the little <span class="aces"><b>A♠</b></span> chips under your name. Each use flips one over. When they're gone, the ability is gone.</p>
       <p>Most characters have <b>3</b>. <b>Prankster Pete has 4</b>, <b>Franky Ice has 2</b>.</p>
       <p>⚠️ <b>Ate mystery leftovers</b> can make you lose a use instead of a life.</p>`,
      () => tRow(tCardHTML('c_pete', { w: 140 }) + `<div class="t-acebox aces">${'<b class="t-ace">A♠</b>'.repeat(4)}</div>`));

    add('Characters', 'Three ways abilities work',
      `<table class="t-table t-tags">
         <tr><td>${tTag(TIMING.YOUR_TURN)}</td><td>Tap the purple <b>✨ ability button</b> on your turn. Carl, Pete, Bella, Nina, Franky, Fester.</td></tr>
         <tr><td>${tTag(TIMING.ANY_TIME)}</td><td>The game offers it when it's useful: Rosie when a Whoopsies hits you, Mel on any dice roll, Leo on your turn or during any Whoopsies.</td></tr>
         <tr><td>${tTag(TIMING.REACTION)}</td><td>Triggered by something: Luke vs Take 1/Swap, Lou on your own flip, Rick when anyone plays a card, Lenny when your hand gets small.</td></tr>
       </table>
       <p><b>Cautious Casey</b> is special: she's offered automatically after you resolve a Whoopsies.</p>`,
      () => tRow(tCardHTML('c_nina', { cls: 't-deal', w: 105 }) + tCardHTML('c_rosie', { cls: 't-deal', delay: .15, w: 105 }) + tCardHTML('c_lou', { cls: 't-deal', delay: .3, w: 105 })));

    for (const c of CHARACTER_CARDS) {
      const [how, tip] = T_CHAR_HOW[c.id] || ['', ''];
      add('Characters', `${c.boss ? '👑 ' : ''}${c.name}`,
        `<p class="t-meta">${tTag(c.timing)} ${tAces(c.uses)} <b>${c.uses} uses</b>${c.boss ? ' · <b>Boss card</b>' : ''}</p>
         <p class="t-quote">“${esc(c.abilityText)}”</p>
         <p><b>How to use it:</b> ${how}</p>
         <p>${tip}</p>`,
        () => tRow(tCardHTML(c.id, { cls: 't-flip', w: 170 })));
    }

    // ── 6. Ready ────────────────────────────────────────────
    add('Play!', 'You’re ready!',
      `<p>Quick recap:</p>
       <ul class="t-list">
         <li>Play <b>During Your Turn</b> cards any time on your turn, then flip a Whoopsies.</li>
         <li><b>Play At Any Time</b> and <b>Reaction</b> cards: the game asks you when they can be used.</li>
         <li>Abilities have a limited number of uses (the aces). Spend them wisely!</li>
         <li>Whoopsies sent to you wait on your table (max 2).</li>
         <li>Last one with lives gets the Last Laugh!</li>
       </ul>
       <p>Try a practice game against bots, or start Story mode.</p>`,
      () => `<div class="t-ready">
               <button class="btn btn-purple btn-big" onclick="TUTORIAL.close(); startSolo(4)">🤖 Practice vs 3 bots</button>
               <button class="btn btn-red btn-big" onclick="TUTORIAL.close(); STORY.open()">🏆 Story mode</button>
             </div>`);

    this.slides = S;
  },

  chapters() { return [...new Set(this.slides.map(s => s.chapter))]; },

  open(chapter = null) {
    if (!this.slides.length) this.build();
    this.i = chapter ? Math.max(0, this.slides.findIndex(s => s.chapter === chapter)) : 0;
    $('tutorial-screen').classList.add('open');
    document.body.classList.add('t-lock');
    this.render();
  },

  close() {
    $('tutorial-screen').classList.remove('open');
    document.body.classList.remove('t-lock');
  },

  go(n) {
    this.i = Math.min(Math.max(0, n), this.slides.length - 1);
    SFX.flip?.();
    this.render();
  },

  render() {
    const s = this.slides[this.i];
    $('t-chapters').innerHTML = this.chapters().map(ch =>
      `<button type="button" class="t-chip ${ch === s.chapter ? 'on' : ''}"
               onclick="TUTORIAL.go(TUTORIAL.slides.findIndex(x => x.chapter === '${ch}'))">${ch}</button>`).join('');
    const inCh = this.slides.filter(x => x.chapter === s.chapter);
    $('t-kicker').textContent = `${s.chapter} · ${inCh.indexOf(s) + 1} of ${inCh.length}`;
    $('t-title').textContent = s.title;
    $('t-stage').innerHTML = s.scene();
    $('t-body').innerHTML = s.body;
    $('t-progress').style.width = `${((this.i + 1) / this.slides.length) * 100}%`;
    $('t-count').textContent = `${this.i + 1} / ${this.slides.length}`;
    $('t-back').disabled = this.i === 0;
    const last = this.i === this.slides.length - 1;
    $('t-next').textContent = last ? 'Done ✓' : 'Next ▶';
    $('t-next').onclick = last ? () => this.close() : () => this.go(this.i + 1);
    $('t-panel').scrollTop = 0;
  },
};

// Arrow keys / Escape while the tutorial is open
document.addEventListener('keydown', e => {
  if (!$('tutorial-screen')?.classList.contains('open')) return;
  if (e.key === 'ArrowRight') TUTORIAL.go(TUTORIAL.i + 1);
  else if (e.key === 'ArrowLeft') TUTORIAL.go(TUTORIAL.i - 1);
  else if (e.key === 'Escape') TUTORIAL.close();
});
