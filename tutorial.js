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

const TUTORIAL = {
  i: 0,
  slides: [],

  build() {
    const S = [];
    const add = (chapter, title, body, scene = () => '') => S.push({ chapter, title, body, scene });

    // ── Page 1 · The goal ──────────────────────────────────
    add('The goal', 'Be the last one laughing',
      `<p>Everybody is one <b>Whoopsies</b> away from disaster. Lose all your lives and you're out. The <b>last player with lives left</b> wins.</p>
       <ul class="t-list">
         <li><b>Whoopsies</b> (red): a disaster. You flip one every turn.</li>
         <li><b>Action cards</b> (yellow): your tools. You start with <b>5</b>.</li>
         <li><b>Character</b>: your hero, with a special ability.</li>
       </ul>
       <p>Lives: <b>3</b> with 2–3 players, <b>2</b> with 4–5, <b>1</b> with 6–8.</p>`,
      () => tRow(tCardHTML('w_toaster', { cls: 't-deal', w: 110 }) + tCardHTML('a_redirect', { cls: 't-deal', delay: .15, w: 110 }) + tCardHTML('c_casey', { cls: 't-deal', delay: .3, w: 110 })));

    // ── Page 2 · Your turn ─────────────────────────────────
    const steps = ['Play cards', 'Flip a Whoopsies', 'Others react', 'Resolve it', 'End turn: draw 1'];
    add('Your turn', 'Your turn',
      `<ol class="t-list">
         <li>Play any cards you want and use your ability.</li>
         <li>Tap <b>⚠️ Flip a Whoopsies!</b> It's aimed at you.</li>
         <li>Anyone can react before it hits (next page).</li>
         <li>Whoever it ends up on does what the card says.</li>
         <li>Tap <b>✋ End turn</b> to draw 1 Action card.</li>
       </ol>
       <p>💡 <b>You can play your Action cards any time during your turn</b>: before you flip, while your Whoopsies is out, and after. Example: flip <b>Tried to pet a shark</b> with 2 cards, play <b>Draw 2</b> first, and you're safe.</p>`,
      () => `<div class="t-flow">${steps.map((s, n) => `<div class="t-step t-pop" style="animation-delay:${n * .2}s"><span>${n + 1}</span>${s}</div>`).join('')}</div>`);

    // ── Page 3 · When can I play a card? ───────────────────
    add('Timing', 'When can I play a card?',
      `<p>Look at the coloured tag on the card:</p>
       <table class="t-table t-tags">
         <tr><td>${tTag(TIMING.YOUR_TURN)}</td><td>Any time on <b>your own turn</b>.</td></tr>
         <tr><td>${tTag(TIMING.ANY_TIME)}</td><td>Even on someone else's turn, whenever it makes sense.</td></tr>
         <tr><td>${tTag(TIMING.REACTION)}</td><td>In response to something: a Whoopsies, a card, a Take 1…</td></tr>
       </table>
       <p>You don't have to watch for your chance: <b>the game pops up and asks you</b> whenever you can react. Dodge a Whoopsies with <b>Not Today!</b> or <b>Slip Away</b>, use <b>Redirect</b> on <b>anyone's</b> Whoopsies (even on their turn), or stop any card with <b>Cancel</b> (and yes, you can Cancel a Cancel).</p>`,
      () => tRow(tCardHTML('a_draw2', { cls: 't-pop', w: 105 }) + tCardHTML('a_not_today', { cls: 't-pop', delay: .2, w: 105 }) + tCardHTML('a_cancel', { cls: 't-pop', delay: .4, w: 105 })));

    // ── Page 4 · Characters ────────────────────────────────
    add('Characters', 'Your character',
      `<p>Each character has one ability. The <b>A♠ aces</b> on the card are how many times you can use it in the <b>whole game</b>. Most have <b>3</b>, Prankster Pete has <b>4</b>, Franky Ice has <b>2</b>.</p>
       <ul class="t-list">
         <li>${tTag(TIMING.YOUR_TURN)} Tap the purple <b>✨ ability button</b> on your turn.</li>
         <li>${tTag(TIMING.ANY_TIME)} ${tTag(TIMING.REACTION)} The game asks you when it can be used.</li>
       </ul>
       <p>Tap a character when you pick one to read its ability. 👑 <b>Leo the Lion</b> unlocks when you beat Story mode.</p>`,
      () => tRow(tCardHTML('c_pete', { cls: 't-flip', w: 130 }) + `<div class="t-acebox aces">${'<b class="t-ace">A♠</b>'.repeat(4)}</div>`));

    // ── Page 5 · Whoopsies sent to you + play ──────────────
    add('Ready!', 'Last thing, then play!',
      `<p>A Whoopsies pushed onto you (by Redirect, Slip Away, the bear…) lands on <b>your table</b> and waits for <b>your</b> turn. You face those first, then flip your own. A table holds <b>at most 2</b>.</p>
       <p>That's it. Have fun, and get the Last Laugh!</p>`,
      () => `<div class="t-tablebox"><div class="t-tablelabel">Your table (max 2)</div>${tRow(
               tCardHTML('w_bear', { cls: 't-slide', w: 85 }) + tCardHTML('w_outofluck', { cls: 't-slide', delay: .4, w: 85 }))}</div>
             <div class="t-ready">
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
    $('t-kicker').textContent = `Page ${this.i + 1} of ${this.slides.length}`;
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
