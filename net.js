// =============================================================
//  LAST LAUGH — Online rooms
//
//  The HOST's device runs the real Game (same code as local play).
//  Other players JOIN with a 4-letter code and their phones become
//  remote screens: the host sends each one a snapshot of the table
//  (with only THEIR cards), and whenever the game needs a decision
//  from them it sends the question over and waits for the answer.
//
//  Phones connect to each other directly with WebRTC (PeerJS),
//  so there's no server to run — it works from GitHub Pages.
//
//  OOP LESSON: NET is a single object (a "singleton") that hides
//  all the networking. app.js just asks: NET.isHost? NET.route()?
// =============================================================

const ROOM_PREFIX = 'lastlaugh-room-';
const CODE_CHARS  = 'ABCDEFGHJKLMNPQRSTUVWXYZ';   // no I/O to avoid mix-ups
const MAX_SEATS   = 8;

function packCard(c) {
  return c ? { id: c.id, name: c.name, image: c.image, instanceId: c.instanceId, timing: c.timing, type: c.type } : null;
}

function isPassive(o) {
  return (o.buttons || []).length <= 1 && !(o.players || []).length &&
         !(o.cards || []).some(c => c.value !== undefined && !c.disabled);
}

// What a question resolves to if that player drops out mid-question:
// the last button (usually "No" / "Pass" / "Keep it"), else the first choice.
function fallbackOf(o) {
  const btns = (o.buttons || []).filter(b => !b.disabled);
  if (btns.length) return btns[btns.length - 1].value;
  if ((o.players || []).length) return o.players[0].id;
  const c = (o.cards || []).find(c => c.value !== undefined && !c.disabled);
  return c ? c.value : undefined;
}

function packOpts(o) {
  return {
    title: o.title, kicker: o.kicker || '', body: o.body || '', html: o.html || '',
    wide: !!o.wide, single: !!o.single, auto: o.auto ?? null,
    cards: (o.cards || []).map(c => ({ card: packCard(c.card), value: c.value, disabled: !!c.disabled, badge: c.badge || '', label: c.label || '' })),
    players: (o.players || []).map(p => p.id),
    buttons: (o.buttons || []).map(b => ({ label: b.label, cls: b.cls, value: b.value, disabled: !!b.disabled })),
  };
}

function unpackOpts(o) {
  return { ...o, players: o.players.map(id => G.players[id]).filter(Boolean), local: true };
}

function randomCode() {
  let s = '';
  for (let i = 0; i < 4; i++) s += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  return s;
}

function myToken() {
  try {
    // per browser tab, and it survives a page refresh so you can rejoin
    let t = sessionStorage.getItem('ll-token');
    if (!t) { t = Math.random().toString(36).slice(2) + Date.now().toString(36); sessionStorage.setItem('ll-token', t); }
    return t;
  } catch { return Math.random().toString(36).slice(2); }
}

const NET = {
  mode: null,                 // null | 'host' | 'client'
  get on()       { return !!this.mode; },
  get isHost()   { return this.mode === 'host'; },
  get isClient() { return this.mode === 'client'; },

  peer: null,
  code: null,
  started: false,

  // host
  localIdx: 0,                // the host's own seat
  seats: [],                  // { name, charId, isBot, token, conn, pid, local }
  pending: new Map(),         // question id → { resolve, pid, fallback }
  askSeq: 0,
  _stateQueued: false,

  // client
  conn: null,
  lobby: null,
  state: null,
  you: null,
  name: '',
  askOpenId: null,
  winnerShown: false,
  retries: 0,

  // ── shared helpers ───────────────────────────────────────
  peerOptions() { return { debug: 0 }; },

  ensurePeerJS() {
    if (window.Peer) return true;
    info('Can\'t go online', 'The online module didn\'t load. Check your internet connection and refresh the page.', { local: true });
    return false;
  },

  shareLink() {
    return `${location.origin}${location.pathname}?room=${this.code}`;
  },

  // ===========================================================
  //  HOST
  // ===========================================================
  createRoom(name, character) {
    if (!this.ensurePeerJS()) return;
    this.mode = 'host';
    this.seats = [{ name, charId: character.id, isBot: false, local: true, conn: null, token: myToken() }];
    this.wrapSounds();
    this.openHostPeer();
  },

  openHostPeer(tries = 0) {
    this.code = randomCode();
    showLobbyPanel('Opening your room…');
    const peer = new Peer(ROOM_PREFIX + this.code, this.peerOptions());
    this.peer = peer;
    peer.on('open', () => { this.renderLobby(); });
    peer.on('connection', conn => this.acceptConn(conn));
    peer.on('error', err => {
      if (err.type === 'unavailable-id' && tries < 5) { peer.destroy(); this.openHostPeer(tries + 1); return; }
      if (err.type === 'peer-unavailable') return;   // someone left; harmless
      console.warn('host peer error', err);
      if (!this.started) info('Room problem', `Couldn't open the room (${err.type}). Check your connection and try again.`, { local: true });
    });
    peer.on('disconnected', () => { try { peer.reconnect(); } catch {} });
  },

  acceptConn(conn) {
    conn.on('data', msg => this.onHostMsg(conn, msg));
    conn.on('close', () => this.onConnClose(conn));
    conn.on('error', () => this.onConnClose(conn));
  },

  seatOf(conn) { return this.seats.find(s => s.conn === conn); },

  sendTo(pid, msg) {
    const seat = this.seats.find(s => s.pid === pid);
    if (seat?.conn?.open) { try { seat.conn.send(msg); } catch {} }
  },

  broadcast(msg) {
    for (const s of this.seats) if (s.conn?.open) { try { s.conn.send(msg); } catch {} }
  },

  uniqueName(name) {
    name = (name || 'Player').trim().slice(0, 14) || 'Player';
    let n = name;
    for (let i = 2; this.seats.some(s => s.name.toLowerCase() === n.toLowerCase()); i++) n = `${name} ${i}`;
    return n;
  },

  onHostMsg(conn, msg) {
    if (!msg || typeof msg !== 'object') return;
    const seat = this.seatOf(conn);

    if (msg.t === 'hello') {
      // Coming back after a dropped connection?
      const back = this.seats.find(s => !s.local && s.token && s.token === msg.token);
      if (back) {
        back.conn = conn;
        if (this.started) this.rejoin(back);
        else this.broadcastLobby();
        return;
      }
      if (this.started) { conn.send({ t: 'error', msg: 'That game has already started.' }); return; }
      if (this.seats.length >= MAX_SEATS) { conn.send({ t: 'error', msg: 'That room is full (8 players).' }); return; }
      this.seats.push({ name: this.uniqueName(msg.name), charId: null, isBot: false, token: msg.token, conn });
      toast(`👋 ${msg.name} joined the room!`);
      this.broadcastLobby();
      return;
    }
    if (!seat) return;

    switch (msg.t) {
      case 'pick': {
        if (this.started) return;
        const taken = this.seats.some(s => s !== seat && s.charId === msg.charId);
        if (!taken && CHARACTER_CARDS.some(c => c.id === msg.charId)) seat.charId = msg.charId;
        this.broadcastLobby();
        break;
      }
      case 'answer': {
        const p = this.pending.get(msg.id);
        if (p && p.pid === seat.pid) { this.pending.delete(msg.id); p.resolve(msg.value); }
        break;
      }
      case 'act':
        if (this.started) this.onRemoteAct(seat.pid, msg);
        break;
      case 'chat':
        if (this.started && typeof msg.text === 'string') sendChat(msg.text.slice(0, 140), G.players[seat.pid]);
        break;
    }
  },

  onConnClose(conn) {
    const seat = this.seatOf(conn);
    if (!seat) return;
    seat.conn = null;
    if (!this.started) {
      this.seats = this.seats.filter(s => s !== seat);
      toast(`👋 ${seat.name} left the room.`);
      this.broadcastLobby();
      return;
    }
    const p = G.players[seat.pid];
    if (p.isEliminated || p.isBot) return;
    p.isBot = true;
    p.netAway = true;
    G.addLog(`📴 ${p.name} lost connection. A bot plays for them until they're back.`, 'redirect');
    toast(`📴 ${p.name} disconnected. A bot takes over for now.`);
    for (const [id, q] of this.pending) {
      if (q.pid === p.id) { this.pending.delete(id); q.resolve(q.fallback); }
    }
    renderAll();
    if (G.currentPlayerIdx === p.id && !busy && !G.winner) botTakeover(p);
  },

  rejoin(seat) {
    const p = G.players[seat.pid];
    seat.conn.send({ t: 'start', you: seat.pid, code: this.code });
    if (p.netAway) {
      p.isBot = false;
      p.netAway = false;
      G.addLog(`📶 ${p.name} is back!`, 'turn');
      toast(`📶 ${p.name} reconnected!`);
    }
    this.pushState(true);
  },

  addBot() {
    if (this.seats.length >= MAX_SEATS) return;
    const taken = this.seats.map(s => s.charId);
    const free = CHARACTER_CARDS.filter(c => !taken.includes(c.id));
    const c = free[Math.floor(Math.random() * free.length)];
    this.seats.push({ name: this.uniqueName(`Bot ${BOT_NAMES[c.id]}`), charId: c.id, isBot: true });
    this.broadcastLobby();
  },

  removeSeat(i) {
    const s = this.seats[i];
    if (!s || s.local) return;
    if (s.conn) { try { s.conn.send({ t: 'error', msg: 'The host removed you from the room.' }); s.conn.close(); } catch {} }
    this.seats.splice(i, 1);
    this.broadcastLobby();
  },

  lobbyData(forSeat) {
    return {
      t: 'lobby', code: this.code,
      seats: this.seats.map(s => ({ name: s.name, charId: s.charId, isBot: s.isBot, host: !!s.local })),
      you: this.seats.indexOf(forSeat),
    };
  },

  broadcastLobby() {
    for (const s of this.seats) if (s.conn?.open) s.conn.send(this.lobbyData(s));
    this.renderLobby();
  },

  renderLobby() {
    if (!this.isHost) return;
    renderLobbyPanel(this.lobbyData(this.seats[0]), true);
  },

  startOnline() {
    if (this.seats.length < 2) { info('Need more players', 'Wait for a friend to join, or add a bot.', { local: true }); return; }
    if (this.seats.some(s => !s.charId)) { info('Hang on', 'Someone is still picking a character.', { local: true }); return; }
    this.started = true;
    this.seats.forEach((s, i) => { s.pid = i; });
    setupPlayers = this.seats.map(s => ({
      name: s.name, character: CHARACTER_CARDS.find(c => c.id === s.charId), isBot: s.isBot,
    }));
    this.localIdx = 0;
    for (const s of this.seats) if (s.conn?.open) s.conn.send({ t: 'start', you: s.pid, code: this.code });
    keepAwake();
    window.addEventListener('beforeunload', e => { if (!G?.winner) { e.preventDefault(); e.returnValue = ''; } });
    startGame();
  },

  // Every sound the host plays is echoed to the joined phones
  wrapSounds() {
    if (this._wrapped) return;
    this._wrapped = true;
    for (const name of ['flip', 'play', 'dice', 'coin', 'good', 'fanfare', 'fahhh', 'nope', 'wow', 'sax']) {
      const orig = SFX[name].bind(SFX);
      SFX[name] = (...a) => {
        orig(...a);
        if (this.isHost && this.started && !SFX.quiet && !SFX.localOnly) this.broadcast({ t: 'sfx', name });
      };
    }
  },

  // Decide where a question goes. Returns a Promise, or null to show it here.
  route(opts) {
    if (!this.isHost || !this.started || !G || opts.local) return null;
    const passive = isPassive(opts);
    let who = opts.who ?? null;
    if (passive) {
      if (!who) {
        this.broadcast({ t: 'notice', opts: packOpts(opts) });
        return askLocal({ ...opts, auto: opts.auto ?? 2300 });
      }
      if (who.id === this.localIdx) return null;
      if (!who.isBot) this.sendTo(who.id, { t: 'notice', opts: packOpts(opts) });
      const first = (opts.buttons || [])[0];
      return Promise.resolve(first ? first.value : true);
    }
    who = who ?? G.players[decider ?? this.localIdx];
    if (who.id === this.localIdx) return null;
    return this.remoteAsk(who, opts).promise;
  },

  remoteAsk(who, opts) {
    const fallback = fallbackOf(opts);
    if (who.isBot) return { promise: Promise.resolve(fallback), cancel() {} };
    const id = ++this.askSeq;
    let resolve;
    const promise = new Promise(r => { resolve = r; });
    this.pending.set(id, { resolve, pid: who.id, fallback });
    this.sendTo(who.id, { t: 'ask', id, opts: packOpts(opts) });
    this.pushState();
    return {
      promise,
      cancel: () => {
        if (!this.pending.has(id)) return;
        this.pending.delete(id);
        this.sendTo(who.id, { t: 'cancelAsk', id });
        resolve(undefined);
      },
    };
  },

  // A question that can be withdrawn (used when several players are
  // asked at once and the first "yes" wins)
  askHandle(opts) {
    const who = opts.who;
    if (this.isHost && this.started && who && who.id !== this.localIdx) return this.remoteAsk(who, opts);
    const promise = askLocal({ ...opts, local: true });
    const seq = modalSeq;
    return { promise, cancel: () => closeModal(seq) };
  },

  pushState(now = false) {
    if (!this.isHost || !this.started || !G) return;
    if (this._stateQueued && !now) return;
    this._stateQueued = true;
    const send = () => {
      this._stateQueued = false;
      for (const s of this.seats) if (s.conn?.open && s.pid !== undefined) {
        try { s.conn.send(this.snapshotFor(s.pid)); } catch {}
      }
    };
    if (now) send(); else setTimeout(send, 30);
  },

  snapshotFor(pid) {
    const p = G.players[pid];
    const myTurn = G.currentPlayerIdx === pid && !G.winner && !p.isBot;
    const a = p.character;
    let ability = null;
    if (a.timing === TIMING.YOUR_TURN && a.id !== 'c_casey') {
      const chk = canUseTurnAbility(p);
      ability = { label: `✨ ${a.name} (${p.abilitiesLeft} left)`, ok: myTurn && !busy && chk.ok, reason: chk.reason || '' };
    }
    return {
      t: 'state', you: pid, turn: G.turn, cur: G.currentPlayerIdx, target: G.whoopsiesTargetIdx,
      whoopsies: packCard(G.currentWhoopsies), safety: G.safetyActive, flipped: G.flippedThisTurn,
      actions: G.actionsThisTurn, wLeft: G.whoopsiesDeck.size, aLeft: G.actionDeck.size,
      discardTop: packCard(G.actionDeck.getTopDiscard()), extraTurns: [...G.extraTurns],
      winner: G.winner ? G.winner.id : null, busy,
      players: G.players.map(o => ({
        id: o.id, name: o.name, isBot: o.isBot, away: !!o.netAway, charId: o.character.id,
        lives: o.lives, maxLives: o.maxLives, abilitiesLeft: o.abilitiesLeft, handCount: o.hand.length,
        isEliminated: o.isEliminated, skipNextTurn: o.skipNextTurn, frozen: o.frozen,
        frozenThisTurn: o.frozenThisTurn,
        table: o.table.map(e => ({ card: packCard(e.card), why: e.why })),
      })),
      hand: p.hand.map(c => {
        const chk = myTurn && !busy ? canPlayOnTurn(p, c)
          : { ok: false, reason: myTurn ? 'Hang on, something is happening…' : 'Wait for your turn. When you can react, the game will ask you.' };
        return { ...packCard(c), ok: chk.ok, reason: chk.reason || '' };
      }),
      ability,
      log: G.log.slice(0, 60),
    };
  },

  onRemoteAct(pid, msg) {
    if (G.winner || busy || pid !== G.currentPlayerIdx) return;
    const p = G.players[pid];
    if (p.isBot) return;
    switch (msg.a) {
      case 'face':    if (p.table.length) onFaceTable(); break;
      case 'flip':    if (!p.table.length && !G.flippedThisTurn) onFlip(); break;
      case 'end':     if (!p.table.length && G.flippedThisTurn) onEndTurn(); break;
      case 'ability': onAbility(); break;
      case 'play': {
        const card = p.hand.find(c => c.instanceId === msg.iid);
        if (card && canPlayOnTurn(p, card).ok) {
          runFlow(async () => {
            const res = await playAction(p, card);
            if (res === 'end_turn') return endTurn();
          });
        }
        break;
      }
    }
  },

  // ===========================================================
  //  CLIENT
  // ===========================================================
  joinRoom(code, name) {
    if (!this.ensurePeerJS()) return;
    this.mode = 'client';
    this.code = code.toUpperCase();
    this.name = name;
    showLobbyPanel(`Connecting to room ${this.code}…`);
    this.connect();
  },

  connect() {
    const go = () => {
      const conn = this.peer.connect(ROOM_PREFIX + this.code, { reliable: true, serialization: 'json' });
      this.conn = conn;
      conn.on('open', () => {
        this.retries = 0;
        setNetBanner('');
        conn.send({ t: 'hello', name: this.name, token: myToken() });
      });
      conn.on('data', msg => this.onClientMsg(msg));
      conn.on('close', () => this.onHostLost());
      conn.on('error', () => this.onHostLost());
    };
    if (this.peer && !this.peer.destroyed && this.peer.open) { go(); return; }
    this.peer = new Peer(this.peerOptions());
    this.peer.on('open', go);
    this.peer.on('error', err => {
      if (err.type === 'peer-unavailable') {
        if (this.started) { this.onHostLost(); return; }
        this.mode = null;
        hideLobbyPanel();
        info('Room not found', `There's no open room with the code ${this.code}. Check the code with your host.`, { local: true });
        showJoinPanel(this.code);
      } else {
        console.warn('client peer error', err);
        if (this.started) this.onHostLost();
      }
    });
  },

  send(msg) { if (this.conn?.open) { try { this.conn.send(msg); } catch {} } },

  onHostLost() {
    if (!this.isClient || this._lostTimer) return;
    if (this.state?.winner !== null && this.state?.winner !== undefined) return;
    setNetBanner('📴 Lost connection to the host. Reconnecting…');
    this._lostTimer = setTimeout(() => {
      this._lostTimer = null;
      if (this.conn?.open) return;
      if (++this.retries > 20) { setNetBanner('📴 Couldn\'t reach the host. The game may have ended.'); return; }
      this.connect();
    }, 2500);
  },

  onClientMsg(msg) {
    if (!msg || typeof msg !== 'object') return;
    switch (msg.t) {
      case 'error':
        info('Online', msg.msg, { local: true });
        break;
      case 'lobby':
        this.lobby = msg;
        if (this.started) break;
        renderLobbyPanel(msg, false);
        break;
      case 'start':
        this.started = true;
        this.you = msg.you;
        keepAwake();
        break;
      case 'state':
        this.started = true;
        this.state = msg;
        G = buildShim(msg);
        if (!$('game-screen').classList.contains('active')) enterClientGame();
        this.renderClient();
        if (msg.winner !== null && !this.winnerShown) { this.winnerShown = true; showWinner(); }
        break;
      case 'ask': {
        this.askOpenId = msg.id;
        const id = msg.id;
        askLocal(unpackOpts(msg.opts)).then(v => {
          if (this.askOpenId !== id) return;
          this.askOpenId = null;
          if (v !== undefined) this.send({ t: 'answer', id, value: v });
        });
        break;
      }
      case 'cancelAsk':
        if (this.askOpenId === msg.id) { this.askOpenId = null; closeModal(); }
        break;
      case 'notice':
        if (this.askOpenId) toast(msg.opts.title);
        else askLocal({ ...unpackOpts(msg.opts), auto: msg.opts.auto ?? 2300 });
        break;
      case 'reveal':
        quietly(() => revealWhoopsies(msg.card, { name: msg.name, isBot: true }));
        break;
      case 'redirect':   // only sent to the player who receives the card
        redirectAlert({ name: msg.name, isBot: false }, msg.why, msg.card, { sound: msg.sound !== false });
        break;
      case 'hurt':
        hurtOverlay(msg.title, msg.sub, 2600);
        break;
      case 'pop':   // its sound arrives separately as an 'sfx' message
        quietly(() => popOverlay(msg.kind, msg.title, msg.sub));
        break;
      case 'dice':
        if (!this.askOpenId) quietly(() => diceAnimation(msg.value, msg.caption, 1900));
        break;
      case 'coin':
        if (!this.askOpenId) quietly(() => coinAnimation(msg.title, msg.result, msg.call, 1500));
        break;
      case 'toast':
        toast(msg.text, msg.card);
        break;
      case 'bubble':
        showBubble(msg.pid, msg.text);
        break;
      case 'sfx':
        if (typeof SFX[msg.name] === 'function') SFX[msg.name]();
        break;
    }
  },

  // Draw the table on a joined phone from the latest snapshot
  renderClient() {
    if (!G || !this.state) return;
    renderPlayers();
    renderTable();
    renderFeed();
    const s = this.state, me = G.players[s.you], cur = G.currentPlayer;
    const myTurn = s.cur === s.you && s.winner === null;

    $('panel-title').textContent = me.isEliminated ? '💀 You\'re out' : myTurn ? '🎉 Your turn!' : cur.isBot ? `🤖 ${cur.name} is playing…` : `⏳ ${cur.name}'s turn`;
    $('panel-sub').textContent = me.isEliminated ? 'Stick around and watch who gets the Last Laugh.'
      : myTurn ? (me.table.length ? `You have ${me.table.length} Whoopsies waiting on your table. Face ${me.table.length > 1 ? 'them' : 'it'} first, then flip your own.`
                  : s.flipped ? (s.aLeft ? 'Keep playing cards if you like, then end your turn (you draw 1 Action card).'
                                         : 'Keep playing cards if you like, then end your turn. The Action deck is empty, so there’s no draw.')
                  : 'Play any cards you want, then flip a Whoopsies. Tap a card to read it.')
      : 'Your reaction cards pop up when you can use them. Tap a card to read it.';

    const btns = $('panel-buttons');
    btns.innerHTML = '';
    if (myTurn && !me.isEliminated) {
      const main = me.table.length
        ? btnEl(`⚠️ Face a Whoopsies from your table (${me.table.length})`, 'btn-red btn-big', () => this.send({ t: 'act', a: 'face' }))
        : s.flipped
          ? btnEl(s.aLeft ? '✋ End turn (draw 1)' : '✋ End turn', 'btn-green btn-big', () => this.send({ t: 'act', a: 'end' }))
          : btnEl('⚠️ Flip a Whoopsies!', 'btn-red btn-big', () => this.send({ t: 'act', a: 'flip' }));
      main.disabled = s.busy;
      btns.appendChild(main);
      if (s.ability) {
        const b = btnEl(s.ability.label, 'btn-purple', () => this.send({ t: 'act', a: 'ability' }));
        b.disabled = !s.ability.ok;
        b.title = s.ability.reason;
        btns.appendChild(b);
      }
    }

    renderMyTable(me);
    const hand = $('hand');
    hand.innerHTML = '';
    if (!s.hand.length) {
      hand.innerHTML = '<div class="hand-hidden"><span>No Action cards in your hand.</span></div>';
      return;
    }
    for (const c of s.hand) {
      const dim = myTurn && !c.ok && !s.busy;
      const el = cardEl(c, { cls: dim ? 'dim' : 'pickable' });
      if (dim) el.style.opacity = '.75';
      el.tabIndex = 0;
      const open = async () => {
        const v = await askLocal({
          kicker: 'Action card', title: c.name, single: true, local: true,
          cards: [{ card: c }],
          html: `<p><span class="tag tag-${c.timing}">${TIMING_LABEL[c.timing]}</span></p>${c.ok ? '' : `<p>🚫 ${esc(c.reason)}</p>`}`,
          buttons: [
            { label: 'Play it!', cls: 'btn-yellow', value: 'play', disabled: !c.ok },
            { label: 'Keep it', cls: 'btn-plain', value: 'keep' },
          ],
        });
        if (v === 'play') this.send({ t: 'act', a: 'play', iid: c.instanceId });
      };
      el.onclick = open;
      el.onkeydown = e => { if (e.key === 'Enter') open(); };
      hand.appendChild(el);
    }
  },
};

// A read-only stand-in for Game, built from the host's snapshot, so the
// normal drawing functions (renderPlayers, renderTable…) work on a phone.
function buildShim(s) {
  const players = s.players.map(pp => ({
    ...pp,
    character: CHARACTER_CARDS.find(c => c.id === pp.charId),
    hand: new Array(pp.handCount).fill(null),
    canUseAbility() { return this.abilitiesLeft > 0 && !this.isEliminated; },
  }));
  players[s.you].hand = s.hand;
  return {
    players, turn: s.turn, currentPlayerIdx: s.cur, whoopsiesTargetIdx: s.target,
    currentWhoopsies: s.whoopsies, extraTurns: s.extraTurns, log: s.log,
    winner: s.winner !== null ? players[s.winner] : null,
    flippedThisTurn: s.flipped, actionsThisTurn: s.actions, safetyActive: s.safety,
    whoopsiesDeck: { size: s.wLeft },
    actionDeck: { size: s.aLeft, getTopDiscard: () => s.discardTop },
    get currentPlayer()   { return players[s.cur]; },
    get whoopsiesTarget() { return players[s.target]; },
    get activePlayers()   { return players.filter(p => !p.isEliminated); },
    get humans()          { return players.filter(p => !p.isBot); },
  };
}

function quietly(fn) {
  SFX.quiet = true;
  try { return fn(); } finally { SFX.quiet = false; }
}

// Keep phones from going to sleep mid-game (where supported)
let wakeLock = null;
async function keepAwake() {
  try {
    if ('wakeLock' in navigator) wakeLock = await navigator.wakeLock.request('screen');
  } catch {}
}
document.addEventListener('visibilitychange', () => {
  if (!document.hidden && NET.started) keepAwake();   // the lock drops when the screen turns off
});

function setNetBanner(text) {
  const b = $('net-banner');
  b.textContent = text;
  b.classList.toggle('on', !!text);
}

// =============================================================
//  LOBBY SCREENS (setup page)
// =============================================================

function showOnlineMenu() {
  $('setup-count').style.display = 'none';
  $('online-panel').style.display = 'block';
}

function hideSetupPanels() {
  for (const id of ['setup-count', 'setup-char', 'online-panel', 'join-panel', 'lobby', 'story-panel']) $(id).style.display = 'none';
}

function backToMenu() {
  hideSetupPanels();
  $('setup-count').style.display = 'block';
}

function startHostSetup() {
  setupMode = 'host';
  setupCount = 1;
  setupPlayers = [];
  setupSolo = false;
  hideSetupPanels();
  $('setup-char').style.display = 'block';
  renderCharSelect();
}

function showJoinPanel(code = '') {
  hideSetupPanels();
  $('join-panel').style.display = 'block';
  if (code) $('join-code').value = code;
  try { $('join-name').value = $('join-name').value || localStorage.getItem('ll-name') || ''; } catch {}
  setTimeout(() => ($('join-code').value ? $('join-name') : $('join-code')).focus(), 50);
}

function submitJoin() {
  const code = $('join-code').value.trim().toUpperCase().replace(/[^A-Z]/g, '');
  const name = $('join-name').value.trim();
  if (code.length !== 4) { info('Room code', 'Room codes are 4 letters, like ABCD.', { local: true }); return; }
  if (!name) { info('Your name', 'Type your name so everyone knows who you are.', { local: true }); return; }
  try { localStorage.setItem('ll-name', name); } catch {}
  NET.joinRoom(code, name);
}

function showLobbyPanel(sub) {
  hideSetupPanels();
  $('lobby').style.display = 'block';
  $('lobby-code').textContent = NET.code || '…';
  $('lobby-sub').textContent = sub;
  $('lobby-seats').innerHTML = '';
  $('lobby-actions').innerHTML = '';
  $('lobby-share').style.display = 'none';
}

function hideLobbyPanel() { $('lobby').style.display = 'none'; }

// Draws the lobby for the host (isHost) or a joined player
function renderLobbyPanel(lobby, isHost) {
  const mine = lobby.seats[lobby.you];

  // A joined player who hasn't picked a character yet sees the character grid
  if (!isHost && mine && !mine.charId) {
    if (setupMode !== 'join' || $('setup-char').style.display === 'none') {
      setupMode = 'join';
      hideSetupPanels();
      $('setup-char').style.display = 'block';
    }
    renderCharSelect();
    return;
  }

  hideSetupPanels();
  $('lobby').style.display = 'block';
  $('lobby-code').textContent = lobby.code;
  $('lobby-sub').textContent = isHost
    ? 'Share the code or the link. Everyone joins on their own phone. Start when you\'re all in!'
    : 'You\'re in! Waiting for the host to start the game…';

  const share = $('lobby-share');
  share.style.display = isHost ? '' : 'none';
  if (isHost) {
    $('lobby-link').value = NET.shareLink();
  }

  const seats = $('lobby-seats');
  seats.innerHTML = '';
  lobby.seats.forEach((s, i) => {
    const d = document.createElement('div');
    d.className = 'lobby-seat' + (i === lobby.you ? ' me' : '');
    const ch = CHARACTER_CARDS.find(c => c.id === s.charId);
    d.innerHTML = `
      <div class="portrait" style="${ch ? portraitStyle(ch) : ''}"></div>
      <div class="lobby-seat-text">
        <b>${esc(s.name)}${s.host ? ' 👑' : ''}${s.isBot ? ' 🤖' : ''}${i === lobby.you ? ' (you)' : ''}</b>
        <span>${ch ? esc(ch.name) : 'Picking a character…'}</span>
      </div>`;
    if (isHost && !s.host) {
      const x = btnEl('✕', 'btn-plain btn-icon', () => NET.removeSeat(i));
      x.title = 'Remove from room';
      d.appendChild(x);
    }
    seats.appendChild(d);
  });

  const acts = $('lobby-actions');
  acts.innerHTML = '';
  if (isHost) {
    const add = btnEl('🤖 Add a bot', 'btn-plain', () => NET.addBot());
    add.disabled = lobby.seats.length >= MAX_SEATS;
    acts.appendChild(add);
    const go = btnEl(`▶ Start game (${lobby.seats.length})`, 'btn-yellow btn-big', () => NET.startOnline());
    go.disabled = lobby.seats.length < 2;
    acts.appendChild(go);
  }
}

async function copyRoomLink() {
  const link = NET.shareLink();
  try {
    if (navigator.share) { await navigator.share({ title: 'Last Laugh', text: `Join my Last Laugh game! Room code: ${NET.code}`, url: link }); return; }
  } catch { /* fall back to copy */ }
  try { await navigator.clipboard.writeText(link); toast('🔗 Link copied!'); }
  catch { $('lobby-link').select(); toast('Copy the link above'); }
}

function enterClientGame() {
  $('setup-screen').classList.remove('active');
  $('game-screen').classList.add('active');
  $('chat-speaker').style.display = 'none';
  setupQuickLines();
}

// Opening a ?room=CODE link goes straight to the join screen
(function autoJoinFromLink() {
  const code = new URLSearchParams(location.search).get('room');
  // wait until every script (app.js too) has loaded
  if (code) window.addEventListener('load', () => showJoinPanel(code.toUpperCase().slice(0, 4)));
})();
