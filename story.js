// =============================================================
//  LAST LAUGH — Story Mode: "The Last Laugh Tour"
//
//  Pick a hero and beat every other character in 1-on-1 duels,
//  easiest first. Each level is harder (smarter bot, more lives,
//  bonus cards). Fester the Cat is the mini-boss, and the final boss
//  is 👑 Leo the Lion, who runs the casino. Beat Leo to unlock him.
//  Progress is saved on this device so you can continue later.
//  Lose a duel and you get ONE more try at it; lose again and the
//  story starts over from level 1 (same hero).
//
//  OOP LESSON: STORY is another singleton object. It only *configures*
//  a normal Game (lives, cards, how smart the bot is); the rules
//  engine doesn't need to know story mode exists.
// =============================================================

const STORY_ORDER = ['c_nina', 'c_casey', 'c_bella', 'c_carl', 'c_mel', 'c_pete', 'c_lenny',
                     'c_luke', 'c_rosie', 'c_franky', 'c_lou', 'c_rick', 'c_fester'];
const STORY_BOSS  = 'c_leo';
const STORY_VERSION = 2;

// The ladder before Lenny and Leo joined (used to move old saves over)
const STORY_ORDER_V1 = ['c_nina', 'c_casey', 'c_bella', 'c_carl', 'c_mel', 'c_pete',
                        'c_luke', 'c_rosie', 'c_franky', 'c_lou', 'c_rick'];

const STORY_TAUNTS = {
  c_nina:   "Ooh, can I see your cards? Pretty please?",
  c_casey:  "I'll be careful… very, very careful.",
  c_bella:  "I already know what's coming. Do you?",
  c_carl:   "Elementary! Your next Whoopsies is… a shark.",
  c_mel:    "Bad roll? Let me fix that. For me.",
  c_pete:   "Pie in your face, your cards in my hand!",
  c_luke:   "Feeling lucky? I always am.",
  c_rosie:  "Danger? I eat danger for breakfast!",
  c_franky: "Chill out. You only get ONE card this turn.",
  c_lou:    "I don't like that Whoopsies. Try another one.",
  c_rick:   "Nice card. I'll take one of those too.",
  c_lenny:  "Running low on cards? Funny, I never do.",
  c_fester: "Deal me in. One of us is getting a Whoopsies, and it isn't me.",
  c_leo:    "Welcome to MY casino, kid. The house always gets the Last Laugh.",
};

const STORY = {
  active: false,     // true while a story duel is being played
  level: 0,

  // ── saved progress ───────────────────────────────────────
  load() {
    let p;
    try { p = JSON.parse(localStorage.getItem('ll-story')) || null; } catch { return null; }
    if (p && p.v !== STORY_VERSION) p = this.migrate(p);
    return p;
  },

  // Old saves (before Lenny + Leo): keep the player on the same opponent.
  // Anyone who had finished the old story is sent straight to the new
  // final boss, Leo the Lion.
  migrate(p) {
    const oldBoss = p.heroId === 'c_fester' ? 'c_rick' : 'c_fester';
    const oldIds  = [...STORY_ORDER_V1.filter(id => id !== p.heroId && id !== oldBoss), oldBoss];
    const newIds  = this.ladder(p.heroId).map(lv => lv.opp.id);
    if (p.done) {
      p.level = Math.min(newIds.indexOf(oldBoss) + 1, newIds.length - 1);
      p.done = false;
    } else {
      const i = newIds.indexOf(oldIds[p.level]);
      p.level = i === -1 ? 0 : i;
    }
    p.v = STORY_VERSION;
    this.save(p);
    return p;
  },
  save(p) {
    try { localStorage.setItem('ll-story', JSON.stringify(p)); } catch {}
  },
  clear() {
    try { localStorage.removeItem('ll-story'); } catch {}
  },

  // The opponents for a hero, in order. The second-to-last is the
  // mini-boss and the last one is the final boss (Leo the Lion; if you
  // play AS Leo, Fester the Cat takes his place).
  ladder(heroId) {
    const boss = heroId === STORY_BOSS ? 'c_fester' : STORY_BOSS;
    const ids = STORY_ORDER.filter(id => id !== heroId && id !== boss);
    const n = ids.length;
    const levels = ids.map((id, i) => {
      const t = n > 1 ? i / (n - 1) : 1;       // 0 = first level … 1 = the mini-boss
      if (i === n - 1) {                        // 👹 mini-boss: a tough warm-up for the final boss
        return { opp: CHARACTER_CARDS.find(c => c.id === id),
                 botLives: 3, bonusCards: 3, bonusUses: 1, skill: 1, boss: false, mini: true };
      }
      return {
        opp: CHARACTER_CARDS.find(c => c.id === id),
        botLives: i < 4 ? 2 : 3,
        bonusCards: Math.floor(t * 3),          // 0 → 2 extra cards
        bonusUses: i >= 7 ? 1 : 0,
        skill: +(0.6 + 0.4 * t).toFixed(2),     // how often the bot makes the smart play
        boss: false,
      };
    });
    // 👑 Final boss. Leo is VERY hard: 5 lives, 5 bonus cards, 6 ability uses, perfect play.
    levels.push(boss === 'c_leo'
      ? { opp: CHARACTER_CARDS.find(c => c.id === boss), botLives: 5, bonusCards: 5, bonusUses: 3, skill: 1, boss: true }
      : { opp: CHARACTER_CARDS.find(c => c.id === boss), botLives: 4, bonusCards: 4, bonusUses: 2, skill: 1, boss: true });
    return levels;
  },

  // ── screens ──────────────────────────────────────────────
  open() {
    SFX.setTrack('story');
    hideSetupPanels();
    const prog = this.load();
    if (!prog) { this.pickHero(); return; }
    this.renderMap(prog);
  },

  pickHero() {
    SFX.setTrack('story');
    setupMode = 'story';
    setupCount = 1;
    setupPlayers = [];
    setupSolo = false;
    hideSetupPanels();
    $('setup-char').style.display = 'block';
    renderCharSelect();
    try { $('name-input').value = localStorage.getItem('ll-name') || ''; } catch {}
  },

  begin(name, hero) {
    try { localStorage.setItem('ll-name', name); } catch {}
    const prog = { v: STORY_VERSION, name, heroId: hero.id, level: 0, done: false, lastChance: false };
    this.save(prog);
    this.renderMap(prog);
  },

  renderMap(prog) {
    SFX.setTrack('story');
    hideSetupPanels();
    const panel = $('story-panel');
    panel.style.display = 'block';
    const hero = CHARACTER_CARDS.find(c => c.id === prog.heroId);
    const levels = this.ladder(prog.heroId);
    $('story-sub').textContent = prog.done
      ? `🏆 ${prog.name} beat everyone as ${hero.name} and got the Last Laugh!`
      : `${prog.name} as ${hero.name} · Level ${prog.level + 1} of ${levels.length}${prog.lastChance ? ' · ⚠️ LAST CHANCE: lose again and the story starts over!' : ''}`;

    const list = $('story-ladder');
    list.innerHTML = '';
    levels.forEach((lv, i) => {
      const state = prog.done || i < prog.level ? 'beaten' : i === prog.level ? 'next' : 'locked';
      const row = document.createElement('div');
      row.className = `story-level ${state}${lv.boss ? ' boss' : ''}`;
      const hidden = state === 'locked' && lv.boss;
      row.innerHTML = `
        <div class="story-num">${lv.boss ? '👑' : lv.mini ? '👹' : i + 1}</div>
        <div class="portrait" style="${hidden ? '' : portraitStyle(lv.opp)}">${hidden ? '❓' : ''}</div>
        <div class="story-who">
          <b>${hidden ? 'Final boss: ???' : esc(lv.opp.name)}${lv.boss && !hidden ? ' · FINAL BOSS' : lv.mini ? ' · MINI-BOSS' : ''}</b>
          <span>${'❤️'.repeat(lv.botLives)}${lv.bonusCards ? ` · +${lv.bonusCards} cards` : ''}${lv.bonusUses ? ` · +${lv.bonusUses} ability` : ''}</span>
        </div>
        <div class="story-state">${state === 'beaten' ? '✅' : state === 'next' ? '▶' : '🔒'}</div>`;
      list.appendChild(row);
    });

    const acts = $('story-actions');
    acts.innerHTML = '';
    acts.appendChild(btnEl('← Menu', 'btn-plain', () => backToMenu()));
    acts.appendChild(btnEl('🔄 New story', 'btn-plain', async () => {
      const ok = await yesNo('Start over?', 'Your story progress will be reset.', 'Start over', 'Keep it', { local: true });
      if (ok) { this.clear(); this.pickHero(); }
    }));
    if (!prog.done) {
      const lv = levels[prog.level];
      acts.appendChild(btnEl(`${prog.lastChance ? '⚠️ Last chance · ' : '▶ '}Level ${prog.level + 1}: ${lv.opp.name}`,
                             prog.lastChance ? 'btn-red btn-big' : 'btn-yellow btn-big', () => this.intro(prog, prog.level)));
    }
  },

  async intro(prog, i) {
    const lv = this.ladder(prog.heroId)[i];
    if (lv.boss) SFX.setTrack('boss');   // the final boss music starts on his intro
    const go = await askLocal({
      kicker: lv.boss ? '👑 FINAL BOSS' : lv.mini ? `👹 MINI-BOSS · Level ${i + 1}` : `Level ${i + 1}`,
      title: lv.opp.name, single: true,
      cards: [{ card: lv.opp }],
      html: `<p class="story-taunt">“${esc(STORY_TAUNTS[lv.opp.id])}”</p>
             <p>${esc(lv.opp.name)} has <b>${lv.botLives} lives</b>${lv.bonusCards ? `, <b>+${lv.bonusCards} bonus cards</b>` : ''}${lv.bonusUses ? `, <b>+${lv.bonusUses} ability uses</b>` : ''}. You have 3 lives.</p>
             ${prog.lastChance ? '<p class="story-warning">⚠️ LAST CHANCE! Lose this one and the story starts over from level 1.</p>' : ''}`,
      buttons: [{ label: lv.boss ? '😈 Face the boss!' : '🥊 Fight!', cls: 'btn-red btn-big', value: true },
                { label: 'Not yet', cls: 'btn-plain', value: false }],
    });
    if (go) this.play(prog, i);
    else SFX.setTrack('story');
  },

  play(prog, i) {
    const lv = this.ladder(prog.heroId)[i];
    this.active = true;
    this.level = i;
    this.cfg = lv;
    setupMode = 'local';
    setupPlayers = [
      { name: prog.name, character: CHARACTER_CARDS.find(c => c.id === prog.heroId) },
      { name: lv.opp.name, character: lv.opp, isBot: true },
    ];
    startGame();
  },

  // Called by startGame() right after the Game is built
  applyLevel(game) {
    const lv = this.cfg;
    const [me, bot] = game.players;
    me.maxLives = me.lives = 3;
    bot.maxLives = bot.lives = lv.botLives;
    bot.hand.push(...game.actionDeck.drawMany(lv.bonusCards));
    bot.abilitiesLeft += lv.bonusUses;
    Bot.skill = lv.skill;
    Bot.focusPeople = true;   // story bots always come after you
    game.addLog(`🏆 Story · ${lv.boss ? 'FINAL BOSS' : lv.mini ? 'MINI-BOSS' : `Level ${this.level + 1}`}: ${bot.name} — “${STORY_TAUNTS[bot.character.id]}”`, 'turn');
  },

  label() {
    return this.active ? `🏆 ${this.cfg.boss ? 'Final boss' : this.cfg.mini ? 'Mini-boss' : `Level ${this.level + 1}`} · ` : '';
  },

  // Called instead of the normal winner screen
  async finish(winner) {
    this.active = false;
    Bot.skill = 1;
    Bot.focusPeople = false;
    const prog = this.load();
    const levels = this.ladder(prog.heroId);
    const won = winner && !winner.isBot;
    if (won) {
      SFX.fanfare();
      const last = this.level >= levels.length - 1;
      if (this.level >= prog.level) {
        prog.level = Math.min(this.level + 1, levels.length - 1);
        if (last) prog.done = true;
      }
      prog.lastChance = false;   // a fresh retry for the next level
      this.save(prog);
      if (last) {
        const leo = CHARACTER_CARDS.find(c => c.id === STORY_BOSS);
        const fresh = !leo.isUnlocked;
        leo.unlock();
        showWinner(true);
        $('winner-title').textContent = '🏆 YOU GOT THE LAST LAUGH!';
        $('winner-msg').textContent = `${prog.name} beat all ${levels.length} opponents, final boss included. Legend!` +
          (fresh ? ' 🔓 Leo the Lion is unlocked: pick him in any game!' : '');
        $('winner-again').textContent = 'Back to the menu';
        return;
      }
      const next = levels[prog.level];
      const v = await askLocal({
        kicker: '🎉 Level cleared!', title: `You beat ${levels[this.level].opp.name}!`,
        cards: [{ card: next.opp }], single: true,
        body: `Next up: ${next.boss ? 'the FINAL BOSS, ' : next.mini ? 'the MINI-BOSS, ' : ''}${next.opp.name}.`,
        buttons: [{ label: `▶ Next: ${next.opp.name}`, cls: 'btn-yellow btn-big', value: 'next' },
                  { label: 'Story map', cls: 'btn-plain', value: 'map' }],
      });
      this.leaveGame();
      if (v === 'next') this.intro(prog, prog.level); else this.renderMap(prog);
    } else {
      await this.lost(prog, levels);
    }
  },

  // Lost a duel: the first loss on a level leaves one more try,
  // the second loss resets the story to level 1.
  async lost(prog, levels, quit = false) {
    const opp = levels[this.level].opp;
    const why = quit ? 'You left the duel, so it counts as a loss.' : '';
    if (!prog.lastChance) {
      prog.lastChance = true;
      this.save(prog);
      const v = await askLocal({
        kicker: '💀 Defeated', title: `${opp.name} got the Last Laugh…`,
        cards: [{ card: opp }], single: true,
        html: `${why ? `<p>${why}</p>` : ''}<p class="story-warning">⚠️ You have ONE more try. Lose again and the story starts over from level 1!</p>`,
        buttons: [{ label: '🔁 Last chance: try again', cls: 'btn-red btn-big', value: 'retry' },
                  { label: 'Story map', cls: 'btn-plain', value: 'map' }],
      });
      this.leaveGame();
      if (v === 'retry') this.play(prog, this.level); else this.renderMap(prog);
      return;
    }
    // Second loss: game over, back to level 1 with the same hero
    prog.level = 0;
    prog.lastChance = false;
    prog.done = false;
    this.save(prog);
    SFX.fahhh();
    await askLocal({
      kicker: '☠️ GAME OVER', title: `${opp.name} beat you twice!`,
      cards: [{ card: opp }], single: true,
      html: `${why ? `<p>${why}</p>` : ''}<p>The Last Laugh Tour starts over from <b>level 1</b>. Same hero, fresh start. You've got this!</p>`,
      buttons: [{ label: '🔄 Start the story over', cls: 'btn-yellow btn-big', value: 'ok' }],
    });
    this.leaveGame();
    this.renderMap(prog);
  },

  // Back from the table to the setup screen
  leaveGame() {
    SFX.setTrack('story');   // back on the tour map
    G = null;
    busy = false;
    viewerIdx = null;
    $('winner-screen').classList.remove('open');
    $('game-screen').classList.remove('active');
    $('setup-screen').classList.add('active');
    window.scrollTo(0, 0);
  },

  quit() {
    if (!this.active || !G) return;
    if (busy || G.currentPlayer.isBot) { toast('You can leave on your own turn.'); return; }
    const prog = this.load();
    const warn = prog.lastChance ? 'Leaving counts as a loss. This is your last chance, so the story would start over from level 1!'
                                 : 'Leaving counts as a loss (you’d have one try left at this level).';
    yesNo('Leave this duel?', warn, 'Leave', 'Keep playing', { local: true })
      .then(async ok => {
        if (!ok) return;
        this.active = false;
        Bot.skill = 1;
        Bot.focusPeople = false;
        await this.lost(prog, this.ladder(prog.heroId), true);
      });
  },
};
