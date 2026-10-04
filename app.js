// =============================================================
//  LAST LAUGH — UI Controller
//  This is the code that USES our OOP classes. The classes in
//  cards.js / game.js hold the rules and the state; this file
//  draws the screen and walks players through each turn.
//
//  Every "question" to the players (pick a card, pick a player,
//  roll a die…) returns a Promise, so a whole turn reads top to
//  bottom with  await  instead of a pile of callbacks.
// =============================================================

let G         = null;   // the Game instance — our source of truth
let viewerIdx = null;   // whose private cards are on screen right now
let busy      = false;  // true while a card/ability is being resolved
let decider   = null;   // online: whose phone gets the next question

class GameOver extends Error {}

const $     = id => document.getElementById(id);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const esc   = s  => String(s).replace(/[&<>"']/g,
  c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Unlock audio on the first tap anywhere (browsers require it;
// iPhones want it on touchend, so listen for all of them)
for (const ev of ['pointerdown', 'touchend', 'click', 'keydown']) {
  document.addEventListener(ev, () => SFX.unlock(), { passive: true });
}

const botTurn = () => G && G.currentPlayer.isBot;

// Bots post in Table Talk now and then
function botSay(bot, kind, chance = .5) {
  if (bot.isBot && Math.random() < chance) setTimeout(() => sendChat(Bot.line(kind), bot), 700);
}

// =============================================================
//  SMALL BUILDING BLOCKS
// =============================================================

function cardEl(card, { cls = '', badge = '' } = {}) {
  const d = document.createElement('div');
  d.className = 'card ' + cls;
  d.title     = card.name;
  d.innerHTML = `<img src="${card.image}" alt="${esc(card.name)}" draggable="false">` +
                (badge ? `<span class="badge">${esc(badge)}</span>` : '');
  return d;
}

function heartsHTML(p) {
  return '❤️'.repeat(p.lives) + '🖤'.repeat(Math.max(0, p.maxLives - p.lives));
}

function acesHTML(p) {
  let h = '';
  for (let i = 0; i < p.character.uses; i++) {
    h += `<b class="${i < p.abilitiesLeft ? '' : 'used'}">A♠</b>`;
  }
  return h;
}

function portraitStyle(character) {
  return `background-image:url('${character.image}')`;
}

function chipEl(p, { flags = true } = {}) {
  const d = document.createElement('div');
  d.className = 'chip' + (p.isEliminated ? ' out' : '');
  d.dataset.pid = p.id;
  const f = [];
  if (flags) {
    if (p.skipNextTurn) f.push('<span title="Next turn skipped">⏭️</span>');
    if (p.frozen || (p.frozenThisTurn && G.currentPlayerIdx === p.id)) f.push('<span title="Franky Ice: 1 Action card only">❄️</span>');
    if (G.extraTurns.includes(p.id)) f.push('<span title="Extra turn coming">➕</span>');
    if (p.whoopsiesReceived) f.push(`<span title="Whoopsies sent to them by others this round (max ${Game.MAX_RECEIVED})">⚠️${p.whoopsiesReceived}/${Game.MAX_RECEIVED}</span>`);
  }
  d.innerHTML = `
    <div class="chip-flags">${f.join('')}</div>
    <div class="portrait" style="${portraitStyle(p.character)}"></div>
    <div class="chip-name">${esc(p.name)}</div>
    <div class="chip-char">${esc(p.character.name)}</div>
    <div class="hearts">${p.isEliminated ? '💀 Out' : heartsHTML(p)}</div>
    <div class="aces" title="Ability uses left">${acesHTML(p)}</div>
    <div class="chip-meta">🃏 ${p.hand.length}</div>`;
  return d;
}

function btnEl(label, cls, fn) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'btn ' + (cls || 'btn-plain');
  b.textContent = label;
  b.onclick = fn;
  return b;
}

function toast(text, card = null) {
  if (NET.isHost && NET.started) NET.broadcast({ t: 'toast', text, card: packCard(card) });
  const t = document.createElement('div');
  t.className = 'toast';
  if (card) t.appendChild(cardEl(card));
  const s = document.createElement('span');
  s.textContent = text;
  t.appendChild(s);
  $('toasts').appendChild(t);
  setTimeout(() => t.remove(), 3100);
}

// =============================================================
//  MODAL — one promise-based dialog used for every question
// =============================================================

/**
 * ask({ title, kicker, body, html, cards, players, buttons, wide, single })
 *   cards:   [{ card, value, disabled, badge, label }]
 *   players: [Player]  → clicking a player resolves with their id
 *   buttons: [{ label, cls, value, disabled }]
 * Resolves with the value of whatever was clicked.
 */
let modalSeq  = 0;
let openModal = null;   // { seq, done } of the dialog on screen

// Online, NET.route() sends the question to the right phone instead.
// `who` = the player who answers; `local: true` = only on this screen.
function ask(opts) {
  return NET.route(opts) ?? askLocal(opts);
}

// Close the dialog on screen (only if it's still dialog `seq`)
function closeModal(seq = null) {
  if (openModal && (seq === null || openModal.seq === seq)) openModal.done(undefined);
}

function askLocal({ title, kicker = '', body = '', html = '', cards = [], players = [],
                    buttons = [], wide = false, single = false, auto = null }) {
  return new Promise(resolve => {
    const seq = ++modalSeq;
    let closed = false;
    const done = v => {
      if (closed) return;
      closed = true;
      if (openModal?.seq === seq) openModal = null;
      if (seq === modalSeq) $('modal-overlay').classList.remove('open');
      resolve(v);
    };
    openModal = { seq, done };

    // While a bot is playing, plain "OK" pop-ups close by themselves
    const passive = buttons.length <= 1 && !players.length && !cards.some(c => c.value !== undefined);
    const autoMs  = auto ?? (botTurn() && passive ? 1700 : 0);
    if (autoMs) {
      const started = Date.now();
      const tick = () => {
        if (closed || seq !== modalSeq) return;
        const b = $('modal-buttons').querySelector('button:not(:disabled)');
        if (Date.now() - started >= autoMs && b) b.click();
        else setTimeout(tick, 250);
      };
      setTimeout(tick, 250);
    }

    $('modal-box').className = wide ? 'wide' : '';
    $('modal-kicker').textContent = kicker;
    $('modal-title').textContent  = title;
    $('modal-body').innerHTML     = (body ? `<p>${esc(body)}</p>` : '') + html;

    const row = $('modal-cards');
    row.className = single ? 'single' : '';
    row.innerHTML = '';
    for (const c of cards) {
      const wrap = document.createElement('div');
      wrap.className = 'card-wrap';
      const el = cardEl(c.card, { badge: c.badge });
      if (c.disabled) el.classList.add('dim');
      else if (c.value !== undefined) {
        el.classList.add('pickable');
        el.tabIndex = 0;
        el.onclick = () => done(c.value);
        el.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') done(c.value); };
      }
      wrap.appendChild(el);
      if (c.label) {
        const l = document.createElement('div');
        l.className = 'card-label';
        l.textContent = c.label;
        wrap.appendChild(l);
      }
      row.appendChild(wrap);
    }

    const pr = $('modal-players');
    pr.innerHTML = '';
    for (const p of players) {
      const chip = chipEl(p, { flags: false });
      if (p.id === G?.whoopsiesTargetIdx && G?.currentWhoopsies) chip.classList.add('target');
      chip.tabIndex = 0;
      chip.onclick = () => done(p.id);
      chip.onkeydown = e => { if (e.key === 'Enter') done(p.id); };
      pr.appendChild(chip);
    }

    const br = $('modal-buttons');
    br.innerHTML = '';
    for (const b of buttons) {
      const el = btnEl(b.label, b.cls, () => done(b.value));
      el.disabled = !!b.disabled;
      br.appendChild(el);
    }

    $('modal-overlay').classList.add('open');
    const first = br.querySelector('button:not(:disabled)');
    if (first) first.focus({ preventScroll: true });
  });
}

const info = (title, body, extra = {}) =>
  ask({ title, body, buttons: [{ label: 'OK', cls: 'btn-yellow', value: true }], ...extra });

const yesNo = (title, body, yes = 'Yes', no = 'No', extra = {}) =>
  ask({ title, body, ...extra, buttons: [
    { label: yes, cls: 'btn-green', value: true },
    { label: no,  cls: 'btn-plain', value: false },
  ]});

// `who` is the player making the choice: bots answer instantly.
async function pickPlayer(title, body, players, { kicker = '', cancel = null, who = null, purpose = 'harm' } = {}) {
  if (who?.isBot) return Bot.pickPlayer(who, players, purpose);
  const buttons = cancel ? [{ label: cancel, cls: 'btn-plain', value: -1 }] : [];
  const v = await ask({ title, body, kicker, players, buttons, wide: players.length > 3, who });
  return v === -1 || v === undefined ? null : G.players[v];
}

async function pickFromHand(player, title, body, { cancel = null, kicker = '', who = player, purpose = 'discard' } = {}) {
  if (who.isBot) return Bot.pickCard(who, player.hand, purpose);
  const cards   = player.hand.map(c => ({ card: c, value: c.instanceId }));
  const buttons = cancel ? [{ label: cancel, cls: 'btn-plain', value: null }] : [];
  const id = await ask({ title, body, kicker, cards, buttons, wide: cards.length > 3, who });
  return id ? player.hand.find(c => c.instanceId === id) : null;
}

// Tap cards in the order you want them (first tap = top of deck)
async function arrange(kicker, title, cards, who = null, kind = 'whoopsies') {
  if (who?.isBot) return Bot.arrange(who, cards, kind);
  let picked = [];
  for (;;) {
    const v = await ask({
      kicker, title, wide: true, who,
      body: 'Tap the cards in the order you want them. Your first tap goes on top.',
      cards: cards.map((c, i) => ({
        card: c,
        value: picked.includes(i) ? undefined : i,
        badge: picked.includes(i) ? String(picked.indexOf(i) + 1) : '',
        label: picked.indexOf(i) === 0 ? 'TOP' : '',
      })),
      buttons: [
        { label: 'Start over', cls: 'btn-plain', value: 'reset', disabled: !picked.length },
        { label: picked.length >= cards.length - 1 ? 'Done ✓' : 'Keep this order', cls: 'btn-yellow', value: 'done' },
      ],
    });
    if (v === 'reset') picked = [];
    else if (v === 'done' || v === undefined) {
      return [...picked, ...cards.map((_, i) => i).filter(i => !picked.includes(i))];
    } else picked.push(v);
  }
}

// Ask several players at once; resolves with the first who says yes
// (the others' questions are withdrawn), or null if everyone says no.
function firstYes(players, makeOpts) {
  players = players.filter(p => !p.isBot);
  if (!players.length) return Promise.resolve(null);
  return new Promise(resolve => {
    let left = players.length, done = false;
    const handles = players.map(p => NET.askHandle({ ...makeOpts(p), who: p }));
    handles.forEach((h, i) => h.promise.then(v => {
      if (done) return;
      if (v === true) {
        done = true;
        handles.forEach(o => { if (o !== h) o.cancel(); });
        resolve(players[i]);
      } else if (--left === 0) { done = true; resolve(null); }
    }));
  });
}

// =============================================================
//  BIG MOMENTS — pass screen, reveal, redirect, hurt, dice
// =============================================================

function passTo(player, msg, { force = false, kicker = 'Pass the device to', button } = {}) {
  // Bots don't need the device, and with one human there's nobody to hide from
  if (player.isBot) return Promise.resolve();
  // Online everyone has their own phone: just note who decides next
  if (NET.on) {
    decider = player.id;
    if (force) {
      if (player.id === NET.localIdx) toast(`🎉 Your turn, ${player.name}!`);
      else NET.sendTo(player.id, { t: 'toast', text: `🎉 Your turn, ${player.name}!` });
    }
    renderAll();
    return Promise.resolve();
  }
  if (G.humans.length === 1) {
    viewerIdx = player.id;
    if (force) toast(`🎉 Your turn, ${player.name}!`);
    renderAll();
    return Promise.resolve();
  }
  if (!force && viewerIdx === player.id) return Promise.resolve();
  viewerIdx = null;
  renderAll();
  return new Promise(resolve => {
    $('pass-portrait').setAttribute('style', portraitStyle(player.character));
    $('pass-kicker').textContent = kicker;
    $('pass-name').textContent   = player.name;
    $('pass-msg').textContent    = msg;
    $('pass-btn').textContent    = button || `I'm ${player.name}, let's go!`;
    $('pass-screen').classList.add('open');
    $('pass-btn').focus({ preventScroll: true });
    $('pass-btn').onclick = () => {
      $('pass-screen').classList.remove('open');
      viewerIdx = player.id;
      renderAll();
      resolve();
    };
  });
}

function restartAnimations(root) {
  root.querySelectorAll('*').forEach(el => { el.style.animation = 'none'; });
  void root.offsetWidth;
  root.querySelectorAll('*').forEach(el => { el.style.animation = ''; });
}

function revealWhoopsies(card, target) {
  if (NET.isHost) NET.broadcast({ t: 'reveal', card: packCard(card), name: target.name });
  SFX.flip();
  return new Promise(resolve => {
    $('reveal-front').src = card.image;
    $('reveal-front').alt = card.name;
    $('reveal-for').textContent = `${target.name} has to face this one!`;
    const s = $('reveal-screen');
    restartAnimations(s);
    s.classList.add('open');
    let closed = false;
    const close = () => { if (closed) return; closed = true; s.classList.remove('open'); resolve(); };
    $('reveal-btn').onclick = close;
    if (NET.on) setTimeout(close, 2600);
    else if (target.isBot) setTimeout(close, 2300);
  });
}

// The shocked-emoji alert + FAHHH, shown whenever a Whoopsies
// gets pushed onto someone else.
function redirectAlert(toPlayer, why, card = G.currentWhoopsies) {
  if (NET.isHost) NET.broadcast({ t: 'redirect', name: toPlayer.name, why, card: packCard(card) });
  SFX.fahhh();
  return new Promise(resolve => {
    $('redirect-name').textContent = `${toPlayer.name}!`;
    $('redirect-card-img').src     = card.image;
    $('redirect-from').textContent = why;
    const s = $('redirect-screen');
    restartAnimations(s);
    s.classList.add('open');
    $('redirect-btn').focus({ preventScroll: true });
    let closed = false;
    const close = () => { if (closed) return; closed = true; s.classList.remove('open'); resolve(); };
    $('redirect-btn').onclick = close;
    if (NET.on) setTimeout(close, 3000);
    else if (toPlayer.isBot) setTimeout(close, 2600);
  });
}

async function redirectTo(idx, why) {
  G.whoopsiesTargetIdx = idx;
  const p = G.players[idx];
  p.whoopsiesReceived++;
  G.addLog(`👉 "${G.currentWhoopsies.name}" is redirected to ${p.name}! (${why})`, 'redirect');
  renderAll();
  await redirectAlert(p, why);
}

// Every life loss goes through here: rules check, FAHHH, animation,
// and the win check.
async function hurt(player, opts = {}) {
  // Not Today! can be played at any time — even right before the life is lost
  if (G.currentWhoopsies && !opts.unstoppable && !G.safetyActive && !player.isEliminated) {
    const nt = player.hand.find(c => c.id === 'a_not_today');
    if (nt && canReact(player, nt).ok) {
      const use = player.isBot || await yesNo('Not Today!?', `${player.name}, play Not Today! to stop losing this life?`,
                                              'Not today! 🛑', 'Take the hit', { kicker: 'Last chance', cards: [{ card: nt }], who: player });
      if (use && (await playAction(player, nt)) === 'negated') return false;
    }
  }
  const lost = G.damage(player, opts);
  renderAll();
  if (!lost) {
    toast(`🛡️ Safety First protects ${player.name}!`);
    await info('🛡️ Safety First!', `${player.name} doesn't lose a life this round.`);
    return false;
  }
  SFX.fahhh();
  botSay(player, 'hurt', .6);
  const title = player.isEliminated ? `${player.name} is OUT!` : `${player.name} loses a life!`;
  const sub   = player.isEliminated ? '💀 No lives left.' : `${'❤️'.repeat(player.lives)} left`;
  if (NET.isHost) NET.broadcast({ t: 'hurt', title, sub });
  await hurtOverlay(title, sub, NET.on ? 2600 : 3200);
  if (G.checkWinner()) {
    showWinner();
    throw new GameOver();
  }
  return true;
}

function hurtOverlay(title, sub, ms) {
  return new Promise(resolve => {
    $('hurt-title').textContent = title;
    $('hurt-sub').textContent   = sub;
    const s = $('hurt-screen');
    restartAnimations(s);
    s.classList.add('open');
    const close = () => { s.classList.remove('open'); clearTimeout(timer); resolve(); };
    const timer = setTimeout(close, ms);
    $('hurt-btn').onclick = close;
  });
}

function dieHTML(n) {
  const on = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] }[n];
  return Array.from({ length: 9 }, (_, i) => `<i class="${on.includes(i) ? 'on' : ''}"></i>`).join('');
}

async function diceAnimation(value, caption, auto = null) {
  if (NET.isHost) { NET.broadcast({ t: 'dice', value, caption }); auto = 1900; }
  SFX.dice();
  const p = ask({ auto, local: true,
    kicker: '🎲 Roll!', title: caption,
    html: `<div class="die rolling" id="die">${dieHTML(1)}</div><div class="roll-result" id="roll-result">…</div>`,
    buttons: [{ label: 'OK', cls: 'btn-yellow', value: true }],
  });
  const ok  = $('modal-buttons').querySelector('button');
  const die = $('die');
  ok.disabled = true;
  for (let i = 0; i < 11; i++) {
    die.innerHTML = dieHTML(1 + Math.floor(Math.random() * 6));
    await sleep(65);
  }
  die.className = 'die landed';
  die.innerHTML = dieHTML(value);
  $('roll-result').textContent = `Rolled a ${value}!`;
  ok.disabled = false;
  ok.focus({ preventScroll: true });
  return p;
}

// Roll a die for someone. Any Melo Mel at the table may re-roll it.
async function roll(player, reason) {
  let value = Game.rollDie();
  await diceAnimation(value, `${player.name} — ${reason}`, player.isBot ? 1900 : null);
  G.addLog(`🎲 ${player.name} rolled a ${value} (${reason}).`);
  for (;;) {
    const allMels = G.activePlayers.filter(p => p.character.id === 'c_mel' && p.canUseAbility());
    const botMel  = allMels.find(m => m.isBot && Bot.wantsReroll(m, player, value, reason));
    if (botMel) {
      botMel.useAbility();
      value = Game.rollDie();
      G.addLog(`🎵 ${botMel.name} (Melo Mel) re-rolls… ${value}!`);
      renderAll();
      await diceAnimation(value, `${botMel.name} re-rolls for ${player.name}`);
      continue;
    }
    const mels = allMels.filter(m => !m.isBot);
    if (!mels.length) break;
    if (NET.on) {
      const m = await firstYes(mels, () => ({
        kicker: 'Melo Mel', title: `Re-roll that ${value}?`, cards: [{ card: mels[0].character }],
        body: `${player.name} rolled a ${value} for ${reason}. Use Melo Mel to re-roll it?`,
        buttons: [{ label: 'Re-roll!', cls: 'btn-purple', value: true }, { label: 'Keep it', cls: 'btn-plain', value: false }],
      }));
      if (!m) break;
      m.useAbility();
      value = Game.rollDie();
      G.addLog(`🎵 ${m.name} (Melo Mel) re-rolls… ${value}!`);
      renderAll();
      await diceAnimation(value, `Melo Mel re-roll for ${player.name}`);
      continue;
    }
    const v = await ask({
      kicker: 'Melo Mel', title: `Re-roll that ${value}?`,
      body: `${player.name} rolled a ${value} for ${reason}. Melo Mel can re-roll any dice roll.`,
      cards: [{ card: mels[0].character }],
      buttons: [
        ...mels.map(m => ({ label: `${m.name}: re-roll! (${m.abilitiesLeft} left)`, cls: 'btn-purple', value: m.id })),
        { label: 'Keep it', cls: 'btn-plain', value: -1 },
      ],
    });
    if (v === -1) break;
    const mel = G.players[v];
    mel.useAbility();
    value = Game.rollDie();
    G.addLog(`🎵 ${mel.name} (Melo Mel) re-rolls… ${value}!`);
    renderAll();
    await diceAnimation(value, `Melo Mel re-roll for ${player.name}`);
  }
  return value;
}

async function coinFlip(caller, call) {
  const result = Game.flipCoin();
  const title = `${caller.name} calls ${call.toUpperCase()}`;
  if (NET.isHost) NET.broadcast({ t: 'coin', title, result, call });
  await coinAnimation(title, result, call, NET.on ? 1500 : null);
  return result === call;
}

async function coinAnimation(title, result, call, auto = null) {
  SFX.coin();
  const p = ask({ auto, local: true,
    kicker: '🪙 Coin flip', title,
    html: `<div class="coin flipping" id="coin">?</div><div class="roll-result" id="coin-result">…</div>`,
    buttons: [{ label: 'OK', cls: 'btn-yellow', value: true }],
  });
  const ok = $('modal-buttons').querySelector('button');
  ok.disabled = true;
  await sleep(1100);
  $('coin').className = 'coin';
  $('coin').textContent = result === 'heads' ? 'HEADS' : 'TAILS';
  $('coin-result').textContent = result === call ? 'Called it!' : 'Wrong call!';
  SFX.coin();
  ok.disabled = false;
  await p;
}

// =============================================================
//  SETUP
// =============================================================

let setupCount = 0, setupPlayers = [], setupChoice = null;
let setupSeatBot = false;   // is the seat being set up a bot?
let setupSolo    = false;   // "Solo test": fill the other seats with bots
let setupMode    = 'local'; // 'local' | 'host' (create room) | 'join' (joined a room)

const BOT_NAMES = {
  c_carl: 'Carl', c_casey: 'Casey', c_pete: 'Pete', c_bella: 'Bella', c_luke: 'Luke', c_nina: 'Nina',
  c_rosie: 'Rosie', c_mel: 'Mel', c_franky: 'Franky', c_lou: 'Lou', c_rick: 'Rick', c_fester: 'Fester',
};

function renderCountButtons() {
  const row = $('count-row');
  for (let n = 2; n <= 8; n++) row.appendChild(btnEl(String(n), 'btn-yellow', () => startSetup(n)));
}

function startSetup(n, solo = false) {
  setupMode    = 'local';
  setupCount   = n;
  setupPlayers = [];
  setupSolo    = solo;
  $('setup-count').style.display = 'none';
  $('setup-char').style.display  = 'block';
  renderCharSelect();
}

function startSolo(n) { startSetup(n, true); }

function setupBack() {
  if (setupMode !== 'local') { location.href = location.pathname; return; }
  if (setupPlayers.length) {
    setupPlayers.pop();
    renderCharSelect();
  } else {
    $('setup-char').style.display  = 'none';
    $('setup-count').style.display = 'block';
  }
}

function setSeatBot(isBot) {
  setupSeatBot = isBot;
  $('seat-human').className = 'btn ' + (isBot ? 'btn-plain' : 'btn-yellow');
  $('seat-bot').className   = 'btn ' + (isBot ? 'btn-purple' : 'btn-plain');
  $('name-input').placeholder = isBot ? 'Bot name (optional)' : 'Your name…';
}

function renderCharSelect() {
  const lives = setupCount <= 3 ? 3 : setupCount <= 5 ? 2 : 1;
  const online = setupMode !== 'local';
  document.querySelector('#setup-char .name-row').style.display = setupMode === 'join' ? 'none' : '';
  $('setup-title').textContent = setupMode === 'host' ? 'Create a room · pick your character'
    : setupMode === 'join' ? `Room ${NET.code} · pick your character`
    : setupSolo
    ? `Solo test · you vs ${setupCount - 1} bots · ${lives} ${lives === 1 ? 'life' : 'lives'} each`
    : `Player ${setupPlayers.length + 1} of ${setupCount}  ·  ${lives} ${lives === 1 ? 'life' : 'lives'} each`;
  $('name-input').value = '';
  const keep = setupMode === 'join' ? setupChoice : null;   // lobby refresh: keep my pick
  setupChoice = null;
  setSeatBot(false);
  document.querySelector('.seat-toggle').style.display = setupSolo || online ? 'none' : '';
  const taken = setupMode === 'join'
    ? (NET.lobby?.seats || []).map(s => s.charId).filter(Boolean)
    : setupPlayers.map(p => p.character.id);
  const grid  = $('char-grid');
  grid.innerHTML = '';
  for (const c of CHARACTER_CARDS) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'char-option' + (taken.includes(c.id) ? ' taken' : '');
    b.dataset.id = c.id;
    b.appendChild(cardEl(c));
    const u = document.createElement('div');
    u.className = 'uses';
    u.textContent = `${c.uses} uses`;
    b.appendChild(u);
    b.onclick = () => selectCharacter(c.id);
    grid.appendChild(b);
  }
  if (keep && !taken.includes(keep.id)) selectCharacter(keep.id);
  if (setupMode !== 'join') setTimeout(() => $('name-input').focus(), 50);
}

function selectCharacter(id) {
  setupChoice = CHARACTER_CARDS.find(c => c.id === id);
  document.querySelectorAll('.char-option').forEach(el =>
    el.classList.toggle('selected', el.dataset.id === id));
}

function randomFreeCharacter() {
  const taken = setupPlayers.map(p => p.character.id);
  const free  = CHARACTER_CARDS.filter(c => !taken.includes(c.id));
  return free[Math.floor(Math.random() * free.length)];
}

function pickRandomCharacter() {
  selectCharacter(randomFreeCharacter().id);
  document.querySelector('.char-option.selected')?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}

function addBotSeat(character) {
  let name = `Bot ${BOT_NAMES[character.id]}`;
  for (let i = 2; setupPlayers.some(p => p.name === name); i++) name = `Bot ${BOT_NAMES[character.id]} ${i}`;
  setupPlayers.push({ name, character, isBot: true });
}

async function confirmCharacter() {
  if (setupSeatBot && !setupChoice) setupChoice = randomFreeCharacter();
  if (!setupChoice) { await info('Pick a character!', 'Tap one of the character cards first.', { local: true }); return; }
  if (setupMode === 'host') {
    const name = $('name-input').value.trim() || 'Host';
    try { localStorage.setItem('ll-name', name); } catch {}
    NET.createRoom(name, setupChoice);
    return;
  }
  if (setupMode === 'join') {
    NET.send({ t: 'pick', charId: setupChoice.id });
    showLobbyPanel('Saving your pick…');
    return;
  }
  const isLastSeat = setupPlayers.length === setupCount - 1;
  if (setupSeatBot && isLastSeat && !setupPlayers.some(p => !p.isBot)) {
    await info('Need a human!', 'At least one seat has to be a real player.');
    return;
  }
  const typed = $('name-input').value.trim();
  if (setupSeatBot && !typed) {
    addBotSeat(setupChoice);
  } else {
    const name = typed || `Player ${setupPlayers.length + 1}`;
    if (setupPlayers.some(p => p.name.toLowerCase() === name.toLowerCase())) {
      await info('Name taken', "Two players can't share a name. Try another one.");
      return;
    }
    setupPlayers.push({ name, character: setupChoice, isBot: setupSeatBot });
  }
  if (setupSolo) {
    while (setupPlayers.length < setupCount) addBotSeat(randomFreeCharacter());
  }
  if (setupPlayers.length >= setupCount) startGame();
  else renderCharSelect();
}

$('name-input').addEventListener('keydown', e => { if (e.key === 'Enter') confirmCharacter(); });

function startGame() {
  G = new Game(setupPlayers);
  G.addLog(`Welcome to Last Laugh! ${G.players.length} players, ${G.players[0].maxLives} ${G.players[0].maxLives === 1 ? 'life' : 'lives'} each.`, 'turn');
  if (NET.isHost) viewerIdx = NET.localIdx;
  else if (G.humans.length === 1) viewerIdx = G.humans[0].id;
  $('setup-screen').classList.remove('active');
  $('game-screen').classList.add('active');
  setupChat();
  renderAll();
  startTurn();
}

// =============================================================
//  RENDERING
// =============================================================

function renderAll() {
  if (NET.isClient) return NET.renderClient();
  if (!G) return;
  NET.pushState();
  renderPlayers();
  renderTable();
  renderFeed();
  if (!busy || botTurn()) renderMain(); else renderHand();
}

function renderPlayers() {
  const bar = $('players-bar');
  bar.innerHTML = '';
  for (const p of G.players) {
    const chip = chipEl(p);
    if (p.id === G.currentPlayerIdx) chip.classList.add('current');
    if (G.currentWhoopsies && p.id === G.whoopsiesTargetIdx) chip.classList.add('target');
    chip.onclick = () => showCharacter(p);
    bar.appendChild(chip);
  }
  const p = G.currentPlayer;
  $('turn-label').textContent = `Turn ${G.turn} · ${p.name}'s turn`;
}

function renderTable() {
  $('whoopsies-count').textContent = `${G.whoopsiesDeck.size} left`;
  $('action-count').textContent    = `${G.actionDeck.size} left`;

  const face = $('whoopsies-face');
  const w = G.currentWhoopsies;
  if (w) {
    if (face.dataset.iid !== w.instanceId) {
      face.innerHTML = '';
      const el = cardEl(w, { cls: 'pickable flip-in' });
      el.onclick = () => ask({ local: true, kicker: '⚠️ Whoopsies', title: w.name, cards: [{ card: w }], single: true,
                               buttons: [{ label: 'Close', cls: 'btn-yellow', value: 0 }] });
      face.appendChild(el);
      face.dataset.iid = w.instanceId;
    }
    $('target-label').textContent = `🎯 ${G.whoopsiesTarget.name} is facing this!`;
  } else {
    face.dataset.iid = '';
    face.innerHTML = '<div class="empty-slot">Flip a Whoopsies to see who gets in trouble</div>';
    $('target-label').textContent = '';
  }
  $('safety-flag').classList.toggle('on', G.safetyActive);

  const top = G.actionDeck.getTopDiscard();
  const d = $('discard-top');
  d.innerHTML = '';
  if (top) d.appendChild(cardEl(top));
  else d.innerHTML = '<div class="pile-count">empty</div>';
}

function renderHand(newCardId = null) {
  const hand = $('hand');
  hand.innerHTML = '';
  // Online the host always sees their own hand; locally, whoever's turn it is
  const p = NET.isHost ? G.players[NET.localIdx] : G.currentPlayer;
  const myTurn = p.id === G.currentPlayerIdx;
  if (!NET.isHost && viewerIdx !== p.id) {
    const viewer = viewerIdx === null ? null : G.players[viewerIdx];
    hand.innerHTML = `<div class="hand-hidden">${cardEl({ name: 'Hidden hand', image: CARD_BACKS.action }).outerHTML}
      <span>${viewer ? `${esc(viewer.name)} has the device. ` : ''}${esc(p.name)}'s cards are hidden.</span></div>`;
    return;
  }
  if (!p.hand.length) {
    hand.innerHTML = '<div class="hand-hidden"><span>No Action cards in your hand.</span></div>';
    return;
  }
  for (const c of p.hand) {
    const check = busy || !myTurn ? { ok: false } : canPlayOnTurn(p, c);
    const el = cardEl(c, { cls: (check.ok ? 'pickable' : 'dim') + (c.instanceId === newCardId ? ' new' : '') });
    el.style.opacity = check.ok || busy ? '' : '.7';
    el.tabIndex = 0;
    el.onclick = () => onHandCardClick(c);
    el.onkeydown = e => { if (e.key === 'Enter') onHandCardClick(c); };
    hand.appendChild(el);
  }
}

function renderFeed() {
  const feed = $('feed');
  const nearBottom = feed.scrollHeight - feed.scrollTop - feed.clientHeight < 60;
  feed.innerHTML = G.log.slice().reverse().map(e => e.kind === 'chat'
    ? `<div class="feed-item chat"><b>${esc(e.who)}</b>${esc(e.text)}</div>`
    : `<div class="feed-item ${e.kind}">${esc(e.text)}</div>`).join('');
  if (nearBottom) feed.scrollTop = feed.scrollHeight;
}

function showCharacter(p) {
  ask({ local: true,
    kicker: `${p.name}'s character`, title: p.character.name, single: true,
    cards: [{ card: p.character }],
    html: `<p><span class="tag tag-${p.character.timing}">${p.character.timingLabel}</span></p>
           <p>${esc(p.character.abilityText)}</p>
           <p><b>${p.abilitiesLeft}</b> of ${p.character.uses} uses left · ${heartsHTML(p)}</p>`,
    buttons: [{ label: 'Close', cls: 'btn-yellow', value: 0 }],
  });
}

// =============================================================
//  TABLE TALK — the in-game text box
// =============================================================

const QUICK_LINES = ['FAHHH!', 'Not today! 😤', 'Sorry not sorry 😈', 'Nooo! 😱', 'Hahaha 😂', 'GG 🤝'];

function setupChat() {
  const sel = $('chat-speaker');
  sel.innerHTML = G.humans.map(p => `<option value="${p.id}">${esc(p.name)} says…</option>`).join('');
  sel.style.display = G.humans.length > 1 && !NET.on ? '' : 'none';
  setupQuickLines();
}

function setupQuickLines() {
  $('quick-row').innerHTML = '';
  for (const line of QUICK_LINES) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = line;
    b.onclick = () => sendChat(line);
    $('quick-row').appendChild(b);
  }
  $('chat-form').onsubmit = e => {
    e.preventDefault();
    const text = $('chat-input').value.trim();
    if (!text) return;
    sendChat(text);
    $('chat-input').value = '';
  };
}

function sendChat(text, who = null) {
  if (NET.isClient) { NET.send({ t: 'chat', text }); return; }
  who = who ?? G.players[NET.isHost ? NET.localIdx : +$('chat-speaker').value];
  G.log.unshift({ kind: 'chat', who: who.name, text, turn: G.turn });
  renderFeed();
  $('feed').scrollTop = $('feed').scrollHeight;
  showBubble(who.id, text);
  if (NET.isHost) { NET.broadcast({ t: 'bubble', pid: who.id, text }); NET.pushState(); }
}

// speech bubble over a player's chip
function showBubble(pid, text) {
  const chip = document.querySelector(`#players-bar .chip[data-pid="${pid}"]`);
  if (chip) {
    chip.querySelector('.bubble')?.remove();
    const b = document.createElement('div');
    b.className = 'bubble';
    b.textContent = text;
    chip.appendChild(b);
    setTimeout(() => b.remove(), 4000);
  }
}

// =============================================================
//  TURN FLOW
// =============================================================

async function startTurn() {
  const p = G.currentPlayer;
  busy = true;
  if (!p.isBot) setChatSpeaker(p);
  G.addLog(`— Turn ${G.turn}: ${p.name} —`, 'turn');
  await passTo(p, 'Play cards, flip a Whoopsies, keep playing if you like, then end your turn and draw 1.',
               { force: true, kicker: 'It\'s your turn', button: `I'm ${p.name}, show my cards` });
  p.frozenThisTurn = p.frozen;
  p.frozen = false;
  p.whoopsiesReceived = 0;   // a new round of "sent to you" starts now
  if (p.isBot) {
    renderAll();
    try { await runBotTurn(p); }
    catch (e) { if (!(e instanceof GameOver)) { console.error(e); endTurn(); } }
    finally { busy = false; }
    return;
  }
  busy = false;
  renderAll();
}

// A bot's whole turn: play a few cards, maybe use its ability, flip.
async function runBotTurn(p) {
  await sleep(900);
  if (G.flippedThisTurn) return botFinishTurn(p);   // took over mid-turn
  for (let i = 0; i < 2 && !G.winner; i++) {
    const card = Bot.chooseTurnCard(p);
    if (!card) break;
    const res = await playAction(p, card);
    renderAll();
    if (res === 'end_turn') return endTurn();
    await sleep(800);
  }
  if (Bot.wantsAbility(p)) {
    p.useAbility();
    G.addLog(`✨ ${p.name} uses ${p.character.name}.`);
    toast(`✨ ${p.name} uses ${p.character.name}!`, p.character);
    renderAll();
    await ABILITIES[p.character.id](p);
    renderAll();
    await sleep(800);
  }
  G.flippedThisTurn = true;
  await faceWhoopsies(G.whoopsiesDeck.draw(), p.id);
  return botFinishTurn(p);
}

async function botFinishTurn(p) {
  if (!p.isEliminated && !G.winner) {
    await sleep(700);
    const card = Bot.chooseTurnCard(p);
    if (card && ['a_second_chance', 'a_draw2', 'a_take1'].includes(card.id)) {
      const res = await playAction(p, card);
      renderAll();
      if (res !== 'end_turn') await sleep(700);
    }
  }
  return endTurn();
}

// Online: a bot finishes the turn of a player who lost connection
async function botTakeover(p) {
  busy = true;
  renderAll();
  try { await runBotTurn(p); }
  catch (e) { if (!(e instanceof GameOver)) console.error(e); }
  finally { busy = false; }
}

function setChatSpeaker(p) {
  const sel = $('chat-speaker');
  if (sel) sel.value = String(p.id);
}

function renderMain() {
  const p = G.currentPlayer;
  $('panel-title').textContent = `${p.name}'s turn`;
  if (NET.isHost && !p.isBot && p.id !== NET.localIdx) {
    $('panel-title').textContent = `⏳ ${p.name}'s turn`;
    $('panel-sub').textContent = 'They’re playing on their phone. Your reaction cards pop up when you can use them.';
    $('panel-buttons').innerHTML = '';
    renderHand();
    return;
  }
  if (p.isBot) {
    $('panel-title').textContent = `🤖 ${p.name} is playing…`;
    $('panel-sub').textContent = "Sit back and watch. You'll get a chance to react when a Whoopsies comes up.";
    $('panel-buttons').innerHTML = '';
    renderHand();
    return;
  }

  let sub = G.flippedThisTurn
    ? 'Keep playing cards if you like, then end your turn (you draw 1 Action card).'
    : 'Play any cards you want, then flip a Whoopsies. Tap a card to read it.';
  if (p.frozenThisTurn) sub = `❄️ Franky Ice froze you: only 1 Action card this turn${G.actionsThisTurn ? ' (used)' : ''}. ` + sub;
  $('panel-sub').textContent = sub;

  const btns = $('panel-buttons');
  btns.innerHTML = '';
  if (NET.isHost ? p.id === NET.localIdx : viewerIdx === p.id) {
    if (G.flippedThisTurn) btns.appendChild(btnEl('✋ End turn (draw 1)', 'btn-green btn-big', onEndTurn));
    else btns.appendChild(btnEl('⚠️ Flip a Whoopsies!', 'btn-red btn-big', onFlip));
    const a = p.character;
    if (a.timing === TIMING.YOUR_TURN && a.id !== 'c_casey') {
      const check = canUseTurnAbility(p);
      const b = btnEl(`✨ ${a.name} (${p.abilitiesLeft} left)`, 'btn-purple', onAbility);
      b.disabled = !check.ok;
      b.title = check.ok ? a.abilityText : check.reason;
      btns.appendChild(b);
    }
  } else {
    btns.appendChild(btnEl(`🙈 Show ${p.name}'s cards`, 'btn-yellow', async () => {
      await passTo(p, 'Make sure nobody else is peeking.');
    }));
  }
  renderHand();
}

// Run one player-initiated flow (play a card, use an ability, flip).
async function runFlow(fn) {
  if (busy) return;
  busy = true;
  renderAll();
  let ended = false;
  try {
    ended = (await fn()) === 'ended';
  } catch (e) {
    if (e instanceof GameOver) return;
    console.error(e);
  } finally {
    busy = false;
  }
  if (!ended && !G.winner) {
    await passTo(G.currentPlayer, 'Back to your turn.');
    renderAll();
  }
}

function onFlip() {
  runFlow(async () => {
    const p = G.currentPlayer;
    G.flippedThisTurn = true;
    await faceWhoopsies(G.whoopsiesDeck.draw(), p.id);
    if (p.isEliminated) return endTurn();   // knocked out on your own turn
  });
}

function onEndTurn() {
  runFlow(async () => endTurn());
}

// Ending a turn always draws 1 Action card, then play moves on.
function endTurn() {
  if (G.winner) return 'ended';
  const p = G.currentPlayer;
  if (!p.isEliminated) {
    const c = G.actionDeck.draw();
    if (c) {
      p.hand.push(c);
      G.addLog(`${p.name} draws 1 Action card and ends their turn.`);
      SFX.flip();
    }
  }
  const before = G.extraTurns.length;
  const skipped = G.advanceTurn();
  const extra = before > G.extraTurns.length;
  renderAll();
  for (const s of skipped) toast(`⏭️ ${s.name}'s turn is skipped!`);
  if (extra) toast(`➕ Double Trouble! ${G.currentPlayer.name} takes an extra turn!`);
  setTimeout(startTurn, 60);
  return 'ended';
}

// =============================================================
//  PLAYING ACTION CARDS
// =============================================================

// Whether the current player can play this card right now (main phase)
function canPlayOnTurn(p, c) {
  if (p.frozenThisTurn && G.actionsThisTurn >= 1) return { ok: false, reason: '❄️ Franky Ice: you already played your 1 Action card this turn.' };
  switch (c.id) {
    case 'a_not_today':
    case 'a_redirect':
    case 'a_slip':   return { ok: false, reason: 'Save this for when a Whoopsies card is aimed at you.' };
    case 'a_cancel': return { ok: false, reason: 'Play this when someone else plays an Action card. The game will ask you.' };
    case 'a_second_chance':
      return p.lives < p.maxLives ? { ok: true } : { ok: false, reason: 'You already have all your lives.' };
    case 'a_take1':
      return G.activePlayers.some(o => o.id !== p.id && o.hand.length)
        ? { ok: true } : { ok: false, reason: 'Nobody else has cards to take.' };
    case 'a_recover':
      return G.actionDeck.discardSize ? { ok: true } : { ok: false, reason: 'The discard pile is empty.' };
    default: return { ok: true };
  }
}

async function onHandCardClick(card) {
  if (busy) return;
  const p = NET.isHost ? G.players[NET.localIdx] : G.currentPlayer;
  const check = p.id === G.currentPlayerIdx ? canPlayOnTurn(p, card)
    : { ok: false, reason: 'Wait for your turn. When you can react, the game will ask you.' };
  const v = await ask({ local: true,
    kicker: 'Action card', title: card.name, single: true,
    cards: [{ card }],
    html: `<p><span class="tag tag-${card.timing}">${card.timingLabel}</span></p>
           ${check.ok ? '' : `<p>🚫 ${esc(check.reason)}</p>`}`,
    buttons: [
      { label: 'Play it!', cls: 'btn-yellow', value: 'play', disabled: !check.ok },
      { label: 'Keep it',  cls: 'btn-plain',  value: 'keep' },
    ],
  });
  if (v !== 'play') return;
  runFlow(async () => {
    const res = await playAction(p, card);
    if (res === 'end_turn') return endTurn();
  });
}

/**
 * Plays an Action card from player's hand:
 * discard → anyone may Cancel it → effect → Slick Rick may copy it.
 * Returns the effect's result ('negated', 'end_turn', …) or 'cancelled'.
 */
async function playAction(player, card) {
  player.removeFromHand(card.instanceId);
  G.actionDeck.discard(card);
  if (player.id === G.currentPlayerIdx) G.actionsThisTurn++;
  G.addLog(`🃏 ${player.name} plays ${card.name}.`);
  SFX.play();
  toast(`${player.name} plays ${card.name}!`, card);
  renderAll();

  if (!(await cancelWindow(player, card))) {
    G.addLog(`🚫 ${card.name} was cancelled!`);
    return 'cancelled';
  }
  const result = await EFFECTS[card.id](player, { copy: false });
  renderAll();
  await rickCopy(player, card);
  return result;
}

// Anyone holding Cancel may stop the card. A Cancel can be Cancelled too.
async function cancelWindow(player, card) {
  const holders = G.activePlayers.filter(p => p.id !== player.id && p.hasCard('a_cancel'));
  if (!holders.length) return true;
  let v = holders.find(h => h.isBot && Bot.wantsCancel(h, player, card))?.id ?? -1;
  const humanHolders = holders.filter(h => !h.isBot);
  if (v === -1 && humanHolders.length && NET.on) {
    const c = await firstYes(humanHolders, () => ({
      kicker: '✋ Cancel?', title: `${player.name} plays ${card.name}`, cards: [{ card }],
      body: 'Stop it with your Cancel card?',
      buttons: [{ label: 'Cancel it!', cls: 'btn-red', value: true }, { label: 'Let it happen', cls: 'btn-plain', value: false }],
    }));
    v = c ? c.id : -1;
  } else if (v === -1 && humanHolders.length) {
    v = await ask({
      kicker: '✋ Cancel?', title: `${player.name} plays ${card.name}`,
      body: 'You can stop it right now with a Cancel card.',
      cards: [{ card }],
      buttons: [
        ...humanHolders.map(h => ({ label: `${h.name}: Cancel it!`, cls: 'btn-red', value: h.id })),
        { label: 'Let it happen', cls: 'btn-plain', value: -1 },
      ],
    });
  }
  if (v === -1 || v === undefined) return true;
  const canceller = G.players[v];
  const cancelCard = canceller.hand.find(c => c.id === 'a_cancel');
  canceller.removeFromHand(cancelCard.instanceId);
  G.actionDeck.discard(cancelCard);
  G.addLog(`✋ ${canceller.name} plays Cancel on ${player.name}'s ${card.name}!`);
  SFX.play();
  toast(`${canceller.name} cancels ${card.name}!`, cancelCard);
  renderAll();
  // If the Cancel itself gets cancelled, the original card goes through
  return !(await cancelWindow(canceller, cancelCard));
}

const COPYABLE = new Set(['a_draw2', 'a_take1', 'a_swap', 'a_second_chance', 'a_peek', 'a_recover', 'a_skip', 'a_double']);

async function rickCopy(player, card) {
  if (!COPYABLE.has(card.id) || G.winner) return;
  const ricks = G.activePlayers.filter(r => r.id !== player.id && r.character.id === 'c_rick' && r.canUseAbility());
  for (const r of ricks) {
    if (card.id === 'a_second_chance' && r.lives >= r.maxLives) continue;
    const yes = r.isBot ? Bot.wantsCopy(card) : await yesNo('Slick Rick 🎩', `${r.name}, use ${card.name}'s effect for yourself too? (${r.abilitiesLeft} uses left)`,
                            'Copy it!', 'No thanks', { kicker: 'Reaction', cards: [{ card: r.character }], who: r });
    if (!yes) continue;
    r.useAbility();
    G.addLog(`🎩 ${r.name} (Slick Rick) copies ${card.name}!`);
    renderAll();
    if (['a_peek', 'a_recover'].includes(card.id)) await passTo(r, `Slick Rick copies ${card.name}. Peek privately!`);
    await EFFECTS[card.id](r, { copy: true });
    renderAll();
  }
}

// Lucky Luke may cancel a Take 1 / Swap Hands aimed at them
async function luckyLukeBlocks(target, cardName) {
  if (target.character.id !== 'c_luke' || !target.canUseAbility()) return false;
  const yes = target.isBot || await yesNo('Lucky Luke 🍀', `${target.name}, roll to cancel ${cardName}? You need a 4 or higher. (${target.abilitiesLeft} uses left)`,
                          'Roll for it!', 'No', { kicker: 'Reaction', cards: [{ card: target.character }], who: target });
  if (!yes) return false;
  target.useAbility();
  const r = await roll(target, 'Lucky Luke');
  if (r >= 4) {
    G.addLog(`🍀 ${target.name} (Lucky Luke) cancels ${cardName}!`);
    SFX.good();
    await info('Lucky!', `${cardName} is cancelled!`);
    return true;
  }
  await info('Not so lucky…', `${cardName} still happens.`);
  return false;
}

// What each Action card does. Every effect gets (player, {copy}).
const EFFECTS = {
  async a_draw2(p) {
    const cards = G.actionDeck.drawMany(2);
    p.hand.push(...cards);
    G.addLog(`${p.name} draws ${cards.length} cards.`);
    SFX.flip();
  },

  async a_take1(p) {
    const targets = G.activePlayers.filter(o => o.id !== p.id && o.hand.length);
    if (!targets.length) { await info('Take 1', 'Nobody has any cards to take.'); return; }
    const t = await pickPlayer('Take 1', 'Take a random Action card from who?', targets, { kicker: p.name, who: p, purpose: 'cards' });
    if (await luckyLukeBlocks(t, 'Take 1')) return;
    const stolen = t.stealRandomCard();
    p.hand.push(stolen);
    G.addLog(`🫳 ${p.name} takes a card from ${t.name}!`);
    toast(`${p.name} snatches a card from ${t.name}!`);
  },

  async a_swap(p) {
    const targets = G.activePlayers.filter(o => o.id !== p.id);
    const t = await pickPlayer('Swap Hands', 'Swap your whole hand with…', targets, { kicker: p.name, cancel: 'Don\'t swap', who: p, purpose: 'cards' });
    if (!t) return;
    if (await luckyLukeBlocks(t, 'Swap Hands')) return;
    [p.hand, t.hand] = [t.hand, p.hand];
    G.addLog(`🔄 ${p.name} swaps hands with ${t.name}!`);
    toast(`${p.name} and ${t.name} swap hands!`);
  },

  async a_second_chance(p) {
    p.gainLife();
    G.addLog(`💖 ${p.name} gains 1 life (${p.lives}).`);
    SFX.good();
    toast(`💖 ${p.name} gains a life!`);
  },

  async a_peek(p) {
    const top = G.whoopsiesDeck.peekTop(3);
    if (!top.length) return;
    const order = await arrange('Peek Ahead', 'The next Whoopsies cards', top, p);
    G.whoopsiesDeck.rearrangeTop(order);
    G.addLog(`🔮 ${p.name} peeks at and rearranges the Whoopsies deck.`);
  },

  async a_safety(p) {
    G.safetyOwnerIdx = p.id;
    G.addLog(`🛡️ Safety First! Nobody loses life until ${p.name}'s next turn.`);
    SFX.good();
  },

  async a_skip(p, { copy }) {
    const t = await pickPlayer('Skip Your Turn', 'Whose turn gets skipped? (You can pick yourself.)', G.activePlayers, { kicker: p.name, who: p });
    if (t.id === p.id && p.id === G.currentPlayerIdx && !copy && !G.currentWhoopsies) {
      G.addLog(`⏭️ ${p.name} skips the rest of their turn. No Whoopsies!`);
      return 'end_turn';
    }
    t.skipNextTurn = true;
    G.addLog(`⏭️ ${t.name}'s next turn will be skipped.`);
  },

  async a_double(p) {
    const t = await pickPlayer('Double Trouble', 'Who takes an extra turn right after this one?', G.activePlayers, { kicker: p.name, who: p, purpose: 'help' });
    G.extraTurns.push(t.id);
    G.addLog(`➕ Double Trouble: ${t.name} gets an extra turn!`);
  },

  async a_recover(p) {
    const pile = G.actionDeck.getAllDiscards().filter(c => c.id !== 'a_recover');
    if (!pile.length) { await info('Recover', 'Nothing worth recovering in the discard pile.'); return; }
    const id = p.isBot ? Bot.pickCard(p, pile, 'recover').instanceId : await ask({ who: p, kicker: 'Recover', title: 'Take 1 card from the discard pile', wide: true,
                           cards: pile.map(c => ({ card: c, value: c.instanceId })) });
    const card = G.actionDeck.recoverFromDiscard(id);
    p.hand.push(card);
    G.addLog(`♻️ ${p.name} recovers a card from the discard pile.`);
  },

  // ── Cards that only make sense while facing a Whoopsies ──
  async a_not_today(p) {
    G.addLog(`🛑 NOT TODAY! ${p.name} shrugs off "${G.currentWhoopsies.name}".`);
    SFX.good();
    botSay(p, 'dodge');
    await info('Not Today!', `${p.name} stops the Whoopsies cold.`);
    return 'negated';
  },

  async a_redirect(p) {
    const others = G.activePlayers.filter(o => o.id !== G.whoopsiesTargetIdx && G.canReceive(o));
    const t = await pickPlayer('Redirect', 'Who faces this Whoopsies instead?', others, { kicker: p.name, who: p });
    botSay(p, 'redirect');
    await redirectTo(t.id, `${p.name} played Redirect`);
  },

  async a_slip(p) {
    const left = G.playerToLeft(G.whoopsiesTargetIdx);
    await redirectTo(left, `${p.name} played Slip Away (passed to the left)`);
  },

  async a_cancel() { /* only played through cancelWindow() */ },
};

// =============================================================
//  CHARACTER ABILITIES  (the "During Your Turn" ones)
// =============================================================

function canUseTurnAbility(p) {
  if (!p.canUseAbility()) return { ok: false, reason: 'No uses left.' };
  const others = G.activePlayers.filter(o => o.id !== p.id);
  switch (p.character.id) {
    case 'c_pete':
      if (!p.hand.length) return { ok: false, reason: 'You need a card to trade.' };
      if (!others.some(o => o.hand.length)) return { ok: false, reason: 'Nobody has a card to trade.' };
      return { ok: true };
    case 'c_fester':
      if (!p.hand.length) return { ok: false, reason: 'You need a card to discard.' };
      return others.some(o => G.canReceive(o)) ? { ok: true } : { ok: false, reason: 'Everyone has faced 2 Whoopsies from others already.' };
    default:
      return { ok: true };
  }
}

function onAbility() {
  const p = G.currentPlayer;
  if (!canUseTurnAbility(p).ok) return;
  runFlow(async () => {
    const ok = await yesNo(p.character.name, `${p.character.abilityText} (${p.abilitiesLeft} uses left)`, 'Use it!', 'Not now',
                           { kicker: 'Ability', cards: [{ card: p.character }], who: p });
    if (!ok) return;
    p.useAbility();
    G.addLog(`✨ ${p.name} uses ${p.character.name}.`);
    renderAll();
    await ABILITIES[p.character.id](p);
  });
}

const ABILITIES = {
  async c_carl(p) {
    const order = await arrange('Curious Carl', 'The next 2 Whoopsies cards', G.whoopsiesDeck.peekTop(2), p);
    G.whoopsiesDeck.rearrangeTop(order);
  },

  async c_bella(p) {
    const top = G.actionDeck.peekTop(2);
    if (!top.length) return;
    const order = await arrange('Bold Bella', 'The next 2 Action cards', top, p, 'action');
    G.actionDeck.rearrangeTop(order);
  },

  async c_pete(p) {
    const targets = G.activePlayers.filter(o => o.id !== p.id && o.hand.length);
    const t = await pickPlayer('Prankster Pete', 'Trade a card with who?', targets, { who: p });
    const give = await pickFromHand(p, 'Prankster Pete', `Pick the card you'll give ${t.name}.`);
    const got = t.stealRandomCard();
    p.removeFromHand(give.instanceId);
    t.hand.push(give);
    p.hand.push(got);
    G.addLog(`🥧 ${p.name} (Prankster Pete) trades a card with ${t.name}.`);
    if (!p.isBot) await info('Trade!', `You gave ${give.name} and got ${got.name}.`, { cards: [{ card: got }], who: p });
  },

  async c_nina(p) {
    const others = G.activePlayers.filter(o => o.id !== p.id);
    const t = await pickPlayer('Naive Nina', 'Whose hand gets revealed?', others, { who: p, purpose: 'cards' });
    G.addLog(`👀 ${p.name} (Naive Nina) reveals ${t.name}'s hand.`);
    const call = p.isBot ? (t.hand.length ? Game.flipCoin() : null) : await ask({ who: p,
      kicker: 'Naive Nina', title: `${t.name}'s hand`, wide: true,
      body: t.hand.length ? 'Now call the coin. Call it right and you trash 1 of these cards.' : `${t.name} has no cards!`,
      cards: t.hand.map(c => ({ card: c })),
      buttons: t.hand.length
        ? [{ label: 'Heads!', cls: 'btn-yellow', value: 'heads' }, { label: 'Tails!', cls: 'btn-yellow', value: 'tails' }]
        : [{ label: 'OK', cls: 'btn-plain', value: null }],
    });
    if (!call) return;
    if (!(await coinFlip(p, call))) { G.addLog(`🪙 ${p.name} called it wrong.`); return; }
    const card = await pickFromHand(t, `Trash 1 of ${t.name}'s cards`, 'Pick the card to throw away.', { kicker: 'Naive Nina', who: p, purpose: 'trash' });
    t.removeFromHand(card.instanceId);
    G.actionDeck.discard(card);
    G.addLog(`🗑️ ${p.name} trashes ${t.name}'s ${card.name}!`);
  },

  async c_franky(p) {
    const others = G.activePlayers.filter(o => o.id !== p.id);
    const t = await pickPlayer('Franky Ice ❄️', 'Who can only play 1 Action card next turn?', others, { who: p });
    t.frozen = true;
    G.addLog(`❄️ ${p.name} (Franky Ice) freezes ${t.name}: only 1 Action card next turn.`);
  },

  async c_fester(p) {
    const card = await pickFromHand(p, 'Fester the Cat 🐈‍⬛', 'Discard a card to send a Whoopsies at someone.');
    p.removeFromHand(card.instanceId);
    G.actionDeck.discard(card);
    const others = G.activePlayers.filter(o => o.id !== p.id && G.canReceive(o));
    const t = await pickPlayer('Fester the Cat 🐈‍⬛', 'Who gets the top Whoopsies card?', others, { who: p });
    G.addLog(`🐈‍⬛ ${p.name} (Fester) deals ${t.name} a Whoopsies card!`);
    const w = G.whoopsiesDeck.draw();
    G.currentWhoopsies = w;
    t.whoopsiesReceived++;
    await redirectAlert(t, `${p.name}'s Fester the Cat dealt you a Whoopsies`);
    await faceWhoopsies(w, t.id, { revealed: true });
  },
};

// =============================================================
//  FACING A WHOOPSIES
// =============================================================

async function faceWhoopsies(card, targetIdx, { revealed = false } = {}) {
  G.currentWhoopsies   = card;
  G.whoopsiesTargetIdx = targetIdx;
  G.addLog(`⚠️ Whoopsies! ${G.whoopsiesTarget.name} faces "${card.name}".`, 'whoops');
  renderAll();
  if (!revealed) await revealWhoopsies(card, G.whoopsiesTarget);

  const outcome = await reactionWindow();
  if (outcome === 'resolve') await resolveWhoopsies();

  const resolver = G.whoopsiesTarget;
  G.whoopsiesDeck.discard(G.currentWhoopsies);
  G.currentWhoopsies = null;
  renderAll();
  await caseyCheck(resolver);
}

// Before a Whoopsies resolves, anyone may react.
async function reactionWindow() {
  for (;;) {
    const w = G.currentWhoopsies, t = G.whoopsiesTarget;

    // Bots get first say (the target bot before the others)
    const bots = G.activePlayers.filter(p => p.isBot)
      .sort((a, b) => (b.id === G.whoopsiesTargetIdx) - (a.id === G.whoopsiesTargetIdx));
    let botReacted = false;
    for (const b of bots) {
      const choice = Bot.reaction(b);
      if (!choice) continue;
      botReacted = true;
      await sleep(500);
      const r = await doReaction(b, choice);
      if (r === 'negated' || r === 'avoided') return r;
      break;
    }
    if (botReacted) continue;

    // Only bother humans who actually have something they could do
    const humans = G.activePlayers.filter(p => !p.isBot && hasReaction(p));
    if (!humans.length) return 'resolve';

    if (NET.on) {
      const reactor = await firstYes(humans, p => ({
        kicker: '⚠️ Whoopsies!', title: w.name, cards: [{ card: w }],
        body: p.id === t.id ? 'This one is aimed at YOU. React before it resolves?' : `${t.name} is facing this. Want to react?`,
        buttons: [{ label: '🃏 React!', cls: 'btn-yellow', value: true }, { label: 'Pass', cls: 'btn-plain', value: false }],
      }));
      if (!reactor) return 'resolve';
      const r = await reactorTurn(reactor);
      if (r === 'negated' || r === 'avoided') return r;
      continue;
    }

    const solo = G.humans.length === 1;
    const v = await ask({
      kicker: '⚠️ Whoopsies!', title: w.name, wide: !solo,
      body: solo
        ? `${t.name} is facing this. Want to react before it resolves?`
        : `${t.name} is facing this. Anyone want to react first? Tap your name.`,
      cards: [{ card: w }],
      players: solo ? [] : humans,
      buttons: [
        ...(solo ? [{ label: '🃏 React!', cls: 'btn-yellow', value: humans[0].id }] : []),
        { label: solo ? 'No, resolve it' : 'No reactions — resolve it!', cls: 'btn-red', value: 'resolve' },
      ],
    });
    if (v === 'resolve') return 'resolve';
    const r = await reactorTurn(G.players[v]);
    if (r === 'negated' || r === 'avoided') return r;
  }
}

function hasReaction(p) {
  if (p.hand.some(c => canReact(p, c).ok)) return true;
  if (!p.canUseAbility()) return false;
  return (p.character.id === 'c_lou' && p.id === G.currentPlayerIdx) ||
         (p.character.id === 'c_rosie' && p.id === G.whoopsiesTargetIdx);
}

function canReact(reactor, c) {
  const w = G.currentWhoopsies;
  const isTarget = reactor.id === G.whoopsiesTargetIdx;
  if (reactor.id === G.currentPlayerIdx && reactor.frozenThisTurn && G.actionsThisTurn >= 1) {
    return { ok: false, reason: '❄️ Frozen' };
  }
  // It's still your turn while your Whoopsies is out, so turn cards work too
  if (c.timing === TIMING.YOUR_TURN) {
    if (reactor.id !== G.currentPlayerIdx) return { ok: false, reason: 'Your turn only' };
    const ok = canPlayOnTurn(reactor, c);
    return ok.ok ? ok : { ok: false, reason: '' };
  }
  switch (c.id) {
    case 'a_not_today':
      if (!isTarget) return { ok: false, reason: 'Only the target' };
      return w.unstoppable ? { ok: false, reason: 'Can\'t stop this one' } : { ok: true };
    case 'a_redirect':
      if (!isTarget) return { ok: false, reason: 'Only the target' };
      return G.activePlayers.some(o => o.id !== reactor.id && G.canReceive(o))
        ? { ok: true } : { ok: false, reason: 'Everyone has 2 already' };
    case 'a_slip':
      if (!isTarget) return { ok: false, reason: 'Only the target' };
      return G.canReceive(G.players[G.playerToLeft(reactor.id)])
        ? { ok: true } : { ok: false, reason: 'Left player has 2 already' };
    case 'a_second_chance':
      return reactor.lives < reactor.maxLives ? { ok: true } : { ok: false, reason: 'Full life' };
    case 'a_double':
      return { ok: true };
    default:
      return { ok: false, reason: c.timing === TIMING.YOUR_TURN ? 'Your turn only' : '' };
  }
}

async function reactorTurn(reactor) {
  await passTo(reactor, `React to "${G.currentWhoopsies.name}": play a card or use your ability.`);
  const w = G.currentWhoopsies;
  const isTarget = reactor.id === G.whoopsiesTargetIdx;
  const ch = reactor.character;

  const abilityButtons = [];
  if (reactor.canUseAbility()) {
    if (ch.id === 'c_rosie' && isTarget) abilityButtons.push({ label: `🎲 Reckless Rosie (${reactor.abilitiesLeft} left)`, cls: 'btn-purple', value: 'rosie' });
    if (ch.id === 'c_lou' && reactor.id === G.currentPlayerIdx) abilityButtons.push({ label: `🥊 Grumpy Lou: swap it (${reactor.abilitiesLeft} left)`, cls: 'btn-purple', value: 'lou' });
  }

  const v = await ask({ who: reactor,
    kicker: `${reactor.name} reacts`, title: 'Pick a reaction', wide: true,
    body: `${G.whoopsiesTarget.name} faces "${w.name}".` + (w.unstoppable ? ' Only Slip Away or Redirect can stop this one!' : ''),
    cards: reactor.hand.map(c => {
      const ok = canReact(reactor, c);
      return { card: c, value: ok.ok ? c.instanceId : undefined, disabled: !ok.ok, label: ok.reason || '' };
    }),
    buttons: [...abilityButtons, { label: 'Never mind', cls: 'btn-plain', value: 'back' }],
  });

  if (v === 'back' || v === undefined) return 'none';
  return doReaction(reactor, v === 'rosie' || v === 'lou'
    ? { type: v }
    : { type: 'card', card: reactor.hand.find(c => c.instanceId === v) });
}

// Carry out a reaction (shared by humans and bots)
async function doReaction(reactor, choice) {
  const w = G.currentWhoopsies;

  if (choice.type === 'rosie') {
    reactor.useAbility();
    G.addLog(`🎲 ${reactor.name} (Reckless Rosie) tries to dodge it!`);
    const r = await roll(reactor, 'Reckless Rosie');
    if (r >= 4) {
      G.addLog(`💪 ${reactor.name} avoids the damage!`);
      SFX.good();
      botSay(reactor, 'dodge');
      await info('Dodged it!', `${reactor.name} rolled ${r} and avoids the Whoopsies.`, { auto: reactor.isBot ? 1700 : null });
      return 'avoided';
    }
    await info('Uh-oh…', `${reactor.name} rolled ${r}. The Whoopsies still hits.`, { auto: reactor.isBot ? 1700 : null });
    return 'none';
  }

  if (choice.type === 'lou') {
    reactor.useAbility();
    G.whoopsiesDeck.putOnBottom(w);
    const fresh = G.whoopsiesDeck.draw();
    G.currentWhoopsies = fresh;
    G.addLog(`🥊 ${reactor.name} (Grumpy Lou) shoves "${w.name}" to the bottom. New card: "${fresh.name}"!`, 'whoops');
    toast(`🥊 ${reactor.name} uses Grumpy Lou!`, reactor.character);
    renderAll();
    await revealWhoopsies(fresh, G.whoopsiesTarget);
    return 'none';
  }

  return playAction(reactor, choice.card);
}

async function caseyCheck(p) {
  if (G.winner || p.isEliminated) return;
  if (p.character.id !== 'c_casey' || !p.canUseAbility() || p.id !== G.currentPlayerIdx) return;
  const yes = p.isBot || await yesNo('Cautious Casey', `${p.name}, draw 1 Action card? (${p.abilitiesLeft} uses left)`,
                          'Draw!', 'Save it', { cards: [{ card: p.character }], who: p });
  if (!yes) return;
  p.useAbility();
  const c = G.actionDeck.draw();
  if (c) p.hand.push(c);
  G.addLog(`🍀 ${p.name} (Cautious Casey) draws a card.`);
  renderAll();
}

// =============================================================
//  RESOLVING EACH WHOOPSIES
// =============================================================

async function resolveWhoopsies() {
  const id = G.currentWhoopsies.id;
  await RESOLVERS[id](G.whoopsiesTarget);
}

const RESOLVERS = {
  async w_escape(t) {
    G.addLog(`🏝️ Miraculous Escape! ${t.name} is fine.`);
    SFX.good();
    await info('Miraculous Escape!', `Nothing happens. ${t.name} lives to see another round.`);
  },

  async w_shark(t) {
    if (t.hand.length < 3) {
      await info('Tried to pet a shark 🦈', `${t.name} has only ${t.hand.length} Action card${t.hand.length === 1 ? '' : 's'}. CHOMP!`);
      await hurt(t);
    } else {
      G.addLog(`🦈 ${t.name} has ${t.hand.length} cards. The shark swims away.`);
      await info('Tried to pet a shark 🦈', `${t.name} has ${t.hand.length} cards. Safe!`);
    }
  },

  async w_toaster(t) {
    if (!t.hand.length) {
      await info('Bath with a toaster 🛁', `${t.name} has no cards to discard!`);
      await hurt(t);
      return;
    }
    await passTo(t, 'Discard an Action card or lose 1 life.');
    const card = await pickFromHand(t, 'Bath with a toaster 🛁', 'Discard an Action card, or lose 1 life.',
                                    { cancel: '💔 Lose 1 life', kicker: 'Whoopsies' });
    if (!card) { await hurt(t); return; }
    t.removeFromHand(card.instanceId);
    G.actionDeck.discard(card);
    G.addLog(`${t.name} discards ${card.name} to survive the toaster.`);
  },

  async w_tiles(t) {
    const r = await roll(t, 'Danced on wet tiles');
    if (r >= 4) {
      G.addLog(`🕺 ${t.name} keeps their balance!`);
      SFX.good();
      await info('Safe!', `${t.name} rolled ${r} and didn't slip.`);
    } else {
      await hurt(t);
    }
  },

  async w_sunglasses(t) {
    await info('Sunglasses at night 🕶️', `${t.name} loses 1 life. Only Slip Away or Redirect could have stopped it!`);
    await hurt(t, { unstoppable: true });
  },

  async w_shoelaces(t) {
    const savers = G.activePlayers.filter(o => o.id !== t.id && o.hand.length);
    if (!savers.length) {
      await info('Untied shoelaces 👟', `Nobody has a card to save ${t.name}!`);
      await hurt(t);
      return;
    }
    let s = savers.find(o => o.isBot && Bot.wantsToSave(o)) ?? null;
    const humanSavers = savers.filter(o => !o.isBot);
    if (!s && humanSavers.length && NET.on) {
      s = await firstYes(humanSavers, () => ({
        kicker: '👟 Shoelaces near a cliff', title: `Save ${t.name}?`,
        body: 'Discard an Action card to save them. You both draw 1 card.',
        buttons: [{ label: 'Save them!', cls: 'btn-green', value: true }, { label: 'No', cls: 'btn-plain', value: false }],
      }));
    } else if (!s && humanSavers.length) {
      s = await pickPlayer(`Will anyone save ${t.name}?`,
        'A player who discards an Action card saves them, and you both draw 1 card.',
        humanSavers, { kicker: '👟 Shoelaces near a cliff', cancel: 'Nobody, sorry!' });
    }
    if (!s) { await hurt(t); return; }
    await passTo(s, `Pick an Action card to discard to save ${t.name}.`);
    const card = await pickFromHand(s, `Save ${t.name}`, 'Pick a card to discard.', { cancel: 'Changed my mind' });
    if (!card) { await hurt(t); return; }
    s.removeFromHand(card.instanceId);
    G.actionDeck.discard(card);
    const a = G.actionDeck.draw(), b = G.actionDeck.draw();
    if (a) t.hand.push(a);
    if (b) s.hand.push(b);
    G.addLog(`🦸 ${s.name} saves ${t.name}! Both draw a card.`);
    SFX.good();
    await info('Saved!', `${s.name} grabbed ${t.name} just in time. You both draw a card.`);
  },

  // "When this card enters play" you may pass it on — once.
  // Whoever is handed the bear takes the hug (loses 1 life).
  async w_bear(t) {
    const others = G.activePlayers.filter(o => o.id !== t.id && G.canReceive(o));
    if (!others.length) {
      await info('Tried to hug a bear 🐻', `Everyone else has already faced 2 Whoopsies from other players this round. ${t.name} keeps the bear.`);
      await hurt(t);
      return;
    }
    const v = t.isBot ? Bot.pickPlayer(t, others).id : await ask({ who: t,
      kicker: '🐻 Tried to hug a bear', title: `${t.name}, pass the bear?`,
      body: 'Choose another player to take this Whoopsies card, or keep it and lose 1 life.',
      players: others,
      buttons: [{ label: '💔 Keep it, lose 1 life', cls: 'btn-red', value: 'keep' }],
      wide: others.length > 3,
    });
    if (v === 'keep' || v === undefined) { await hurt(t); return; }
    botSay(t, 'redirect');
    await redirectTo(v, `${t.name} handed you the bear hug`);
    await hurt(G.whoopsiesTarget);
  },

  async w_leftovers(t) {
    await passTo(t, 'Choose how to handle the mystery leftovers.');
    const choice = t.isBot ? Bot.leftoversChoice(t) : await ask({ who: t,
      kicker: '🍲 Ate mystery leftovers', title: `${t.name}, choose one`,
      buttons: [
        { label: '💔 Lose 1 life', cls: 'btn-red', value: 'life' },
        { label: `✨ Lose 1 ability use (${t.abilitiesLeft})`, cls: 'btn-purple', value: 'ability', disabled: t.abilitiesLeft < 1 },
        { label: '🃏 Discard 2 Action cards', cls: 'btn-yellow', value: 'cards', disabled: t.hand.length < 2 },
      ],
    });
    if (choice === 'life') { await hurt(t); return; }
    if (choice === 'ability') {
      t.useAbility();
      G.addLog(`${t.name} loses 1 ability use to the leftovers.`);
      return;
    }
    for (let i = 1; i <= 2; i++) {
      const c = await pickFromHand(t, `Discard card ${i} of 2`, 'Pick a card to discard.');
      t.removeFromHand(c.instanceId);
      G.actionDeck.discard(c);
    }
    G.addLog(`${t.name} discards 2 cards to the leftovers.`);
  },

  async w_texting(t) {
    const left = G.players[G.playerToLeft(t.id)];
    if (!t.hand.length) {
      await info('Texting while driving 📱', `${t.name} has no card to give!`);
      await hurt(t);
      return;
    }
    await passTo(t, `Give ${left.name} an Action card, or lose 1 life.`);
    const card = await pickFromHand(t, 'Texting while driving 📱', `Give 1 card to ${left.name} (on your left), or lose 1 life.`,
                                    { cancel: '💔 Lose 1 life' });
    if (!card) { await hurt(t); return; }
    t.removeFromHand(card.instanceId);
    left.hand.push(card);
    G.addLog(`${t.name} gives a card to ${left.name}.`);
  },

  async w_outofluck(t) {
    for (;;) {
      const r = await roll(t, 'Out of Luck!!');
      if (r <= 2) { await hurt(t); return; }
      if (r <= 4) {
        G.addLog(`🎰 ${t.name} rolled ${r}: nothing happens.`);
        await info('Phew!', `${t.name} rolled ${r}. Nothing happens.`);
        return;
      }
      const leftIdx = G.playerToLeft(t.id), rightIdx = G.playerToRight(t.id);
      const canL = G.canReceive(G.players[leftIdx]), canR = G.canReceive(G.players[rightIdx]);
      if (!canL && !canR) {
        G.addLog(`🎰 ${t.name} rolled ${r}, but both neighbours already faced 2 Whoopsies this round.`);
        await info('Nobody to pass it to', `${t.name} rolled ${r}, but both neighbours have already faced 2 Whoopsies from others this round. Nothing happens.`);
        return;
      }
      let to = canL ? leftIdx : rightIdx;
      if (canL && canR && leftIdx !== rightIdx && t.isBot) {
        to = Bot.leader([G.players[leftIdx], G.players[rightIdx]]).id;
      } else if (canL && canR && leftIdx !== rightIdx) {
        to = await ask({ who: t,
          kicker: '🎰 Out of Luck!!', title: `${t.name} rolled ${r}! Pass it on`,
          body: 'Pass this card left or right. They must roll for it immediately.',
          buttons: [
            { label: `👈 Right: ${G.players[rightIdx].name}`, cls: 'btn-yellow', value: rightIdx },
            { label: `Left: ${G.players[leftIdx].name} 👉`,  cls: 'btn-yellow', value: leftIdx },
          ],
        });
      }
      await redirectTo(to, `${t.name} rolled ${r} on Out of Luck!!`);
      t = G.whoopsiesTarget;
    }
  },
};

// =============================================================
//  WINNER, RULES, SOUND TOGGLES
// =============================================================

function showWinner() {
  const w = G.winner;
  SFX.fanfare();
  $('winner-title').textContent = `${w.name} gets the Last Laugh!`;
  $('winner-img').src = w.character.image;
  $('winner-msg').textContent = `Playing as ${w.character.name} with ${w.lives} ${w.lives === 1 ? 'life' : 'lives'} left.`;
  const s = $('winner-screen');
  s.classList.add('open');
  const colors = ['#ffd84d', '#e9474f', '#8b5cf6', '#22b35e', '#3d7bb6', '#ff8a3d'];
  for (let i = 0; i < 70; i++) {
    const c = document.createElement('div');
    c.className = 'confetti';
    c.style.left = Math.random() * 100 + 'vw';
    c.style.background = colors[i % colors.length];
    c.style.animationDuration = 2.5 + Math.random() * 3 + 's';
    c.style.animationDelay = Math.random() * 1.5 + 's';
    s.appendChild(c);
  }
  renderFeed();
}

function showRules() {
  ask({ local: true,
    kicker: 'Rules', title: 'How to play Last Laugh', wide: true,
    html: `<div class="rules">
      <h4>Goal</h4>
      <p>Be the last player with lives left. You get the Last Laugh!</p>
      <h4>Setup</h4>
      <ul>
        <li>Everyone picks a character. The aces on the card show how many times you can use its ability.</li>
        <li>Everyone gets 5 Action cards.</li>
        <li>Lives: 3 each with 2–3 players, 2 each with 4–5, 1 each with 6–8.</li>
      </ul>
      <h4>On your turn</h4>
      <ol>
        <li>Play any <span class="tag tag-your_turn">During Your Turn</span> cards or use your ability, if you want.</li>
        <li>Flip the top <b>Whoopsies</b> card. It's aimed at you.</li>
        <li>Before it resolves, anyone can react with <span class="tag tag-any_time">Play At Any Time</span> or <span class="tag tag-reaction">Reaction</span> cards and abilities. It's still your turn, so you can keep playing your turn cards too.</li>
        <li>Whoever it ends up aimed at resolves it.</li>
        <li>Keep playing cards if you like, then <b>end your turn by drawing 1 Action card</b>. The next player to the left goes.</li>
      </ol>
      <h4>Good to know</h4>
      <ul>
        <li><b>Cancel</b> can stop any Action card, and Cancels stack: Cancel the Cancel, and so on. The game asks automatically.</li>
        <li><b>Redirects stack:</b> whoever a Whoopsies gets redirected to can Redirect it again.</li>
        <li><b>Only the player whose turn it is flips a Whoopsies.</b> Everyone else waits for their turn.</li>
        <li><b>Max 2 sent to you:</b> between your turns, other players can send you at most 2 Whoopsies (Redirect, Slip Away, the bear, Out of Luck!!, Fester), on top of your own flip. The ⚠️ badge on a player shows how many they've had.</li>
        <li><b>Not Today!</b> can be played at any time, even right before a Whoopsies takes your life.</li>
        <li><b>Drove wearing sunglasses at night</b> can only be stopped by Slip Away or Redirect.</li>
        <li>Lose all your lives and you're out. Use the 💬 Table Talk box to taunt your friends.</li>
        <li>Pass-and-play: when the game says "pass the device", hand it over and don't peek!</li>
      </ul></div>`,
    buttons: [{ label: 'Got it!', cls: 'btn-yellow', value: 0 }],
  });
}

function toggleMusic() {
  const on = SFX.toggleMusic();
  $('music-btn').style.opacity = on ? '1' : '.4';
  $('music-btn').title = on ? 'Music on' : 'Music off';
}

function toggleSfx() {
  const on = SFX.toggleSfx();
  $('sfx-btn').textContent = on ? '🔊' : '🔇';
}

// =============================================================
//  INIT
// =============================================================
renderCountButtons();
$('music-btn').style.opacity = SFX.musicOn ? '1' : '.4';
$('sfx-btn').textContent     = SFX.sfxOn ? '🔊' : '🔇';
