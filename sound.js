// =============================================================
//  LAST LAUGH — Sound
//  Menu, story-tour and match music are recorded tracks
//  (sounds/menu-bigband.mp3, story-swing.mp3, match-jazz.mp3). The final
//  boss tango is synthesized with the Web Audio API, so there's no file
//  for it. Plus sound effects.
//
//  OOP LESSON: SoundManager hides every Web Audio detail behind
//  a few simple methods: startMusic(), toggleMusic(), fahhh()…
// =============================================================

class SoundManager {
  #ctx    = null;
  #master = null;   // everything goes through here
  #music  = null;   // music bus (ducked when "fahhh" plays)
  #timer  = null;
  #nextNoteTime = 0;
  #step   = 0;      // eighth-note counter
  #songs  = {};     // track name → decoded AudioBuffer (recorded tracks)
  #songLoads = {};  // track names whose file has been requested
  #songSrc = null;  // the recorded track playing right now
  #songGain = null;

  // Recorded sound clips. Each is decoded into Web Audio once sound is
  // unlocked (so it plays on iPhones any time), with <audio> as a fallback.
  static CLIPS = { fahhh: 'sounds/fahhh.mp3', nope: 'sounds/nope.mp3', wow: 'sounds/wow.mp3', sax: 'sounds/sax.mp3',
                    damage: 'sounds/damage.mp3', laugh: 'sounds/laugh.mp3' };
  #clips = {};   // name → { el: <audio>, buf: AudioBuffer | null }

  // Chord name → [root MIDI note, intervals]
  static CHORDS = {
    C:  [48, [0, 4, 7, 12]],  C7: [48, [0, 4, 7, 10]],
    F:  [53, [0, 4, 7, 12]],  Fm: [53, [0, 3, 7, 12]],
    G7: [43, [0, 4, 7, 10]],  A7: [45, [0, 4, 7, 10]],
    D7: [50, [0, 4, 7, 10]],
    Am: [45, [0, 3, 7, 12]],  Dm: [50, [0, 3, 7, 12]],
    E7: [40, [0, 4, 7, 10]],  Gm: [43, [0, 3, 7, 12]],
    Bb: [46, [0, 4, 7, 12]],
  };

  // Three soundtracks, all made from the same few instruments.
  //   progression: one chord per bar (8 eighth-notes per bar)
  //   riffs:       eighth-note slot → chord-tone index for the melody
  static TRACKS = {
    // Menus: a recorded 1940s big band track (looped). The synth part
    // below is only a backup while the file loads or if it can't load.
    menu: {
      file: 'sounds/menu-bigband.mp3', fileVolume: 0.75,
      bpm: 168, bass: 'stride', lead: 'piano', drums: 'brush', leadLen: 1.6,
      progression: ['C','C','A7','A7','D7','G7','C','G7', 'C','C7','F','Fm','C','A7','D7','G7'],
      riffs: [
        { 0: 2, 1: 3, 3: 4, 4: 3, 6: 2 },
        { 0: 4, 2: 3, 3: 2, 5: 1, 6: 2 },
        { 1: 1, 2: 2, 3: 3, 4: 4, 6: 5 },
        { 0: 5, 1: 4, 3: 3, 4: 2, 7: 1 },
      ],
    },
    // Matches: a recorded late-night jazz track (looped). The synth
    // "cartoon chase" below is only a backup while the file loads.
    match: {
      file: 'sounds/match-jazz.mp3', fileVolume: 1.0,
      bpm: 184, bass: 'walk', lead: 'reed', drums: 'tick', leadLen: 0.7,
      progression: ['Am','Am','Dm','Dm','Am','Am','E7','E7', 'F','F','Dm','E7','Am','Dm','E7','Am'],
      riffs: [
        { 0: 0, 1: 2, 2: 4, 4: 3, 5: 2, 6: 1 },
        { 0: 4, 2: 4, 3: 3, 4: 2, 6: 0 },
        { 1: 2, 2: 3, 3: 4, 4: 5, 6: 4, 7: 3 },
        { 0: 5, 2: 3, 4: 1, 6: 0 },
      ],
    },
    // Final boss: a dark, slow tango
    boss: {
      bpm: 112, bass: 'habanera', lead: 'reed', drums: 'tango', leadLen: 1.9,
      progression: ['Dm','Dm','Gm','Dm','A7','A7','Dm','A7', 'Bb','Gm','A7','Dm','Gm','Dm','A7','A7'],
      riffs: [
        { 0: 4, 4: 3 },
        { 0: 2, 2: 3, 4: 4, 6: 5 },
        { 0: 5, 4: 4, 6: 3 },
        { 0: 1, 2: 2, 4: 0 },
      ],
    },
  };

  #track = 'menu';

  constructor() {
    this.musicOn = this.#load('ll-music', true);
    this.sfxOn   = this.#load('ll-sfx', true);
    for (const [name, url] of Object.entries(SoundManager.CLIPS)) {
      const el = new Audio(url);
      el.preload = 'auto';
      this.#clips[name] = { el, buf: null };
    }

    // Sound keeps playing when the tab is minimized. If the browser or
    // phone paused it anyway, wake it up as soon as you come back.
    const wake = () => {
      if (this.#ctx && this.#ctx.state !== 'running' && !document.hidden) this.#ctx.resume().catch(() => {});
    };
    document.addEventListener('visibilitychange', wake);
    window.addEventListener('focus', wake);
    window.addEventListener('pageshow', wake);
  }

  #load(key, fallback) {
    try { const v = localStorage.getItem(key); return v === null ? fallback : v === '1'; }
    catch { return fallback; }
  }
  #save(key, val) { try { localStorage.setItem(key, val ? '1' : '0'); } catch {} }

  // Browsers only allow audio after the user clicks something,
  // so this is called from the first click.
  unlock() {
    // iPhone: play like a media app so the silent switch doesn't mute
    // the game (Safari 16.4+; older phones just ignore this)
    try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch {}
    if (this.#ctx) {
      if (this.#ctx.state !== 'running' && !document.hidden) this.#ctx.resume().catch(() => {});
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.#ctx    = new AC();
    this.#master = this.#ctx.createGain();
    this.#master.gain.value = 0.9;
    this.#master.connect(this.#ctx.destination);
    this.#music  = this.#ctx.createGain();
    this.#music.gain.value = 0.16;
    this.#music.connect(this.#master);
    // Decode the clips into Web Audio: iPhones only let <audio> play
    // straight from a tap, but an unlocked AudioContext can play any time.
    for (const [name, url] of Object.entries(SoundManager.CLIPS)) {
      fetch(url)
        .then(r => r.arrayBuffer())
        .then(b => this.#ctx.decodeAudioData(b))
        .then(buf => { this.#clips[name].buf = buf; })
        .catch(() => {});
    }
    // Recorded songs load one at a time, only when needed (about 2 MB each).
    // The song for the screen you're on loads first; the other two are
    // fetched quietly a few seconds later so the next screen is ready.
    this.#loadSong(this.#track);
    setTimeout(() => this.#loadSong('story'), 5000);
    setTimeout(() => this.#loadSong('match'), 10000);
    if (this.musicOn) this.startMusic();
  }

  #loadSong(name) {
    const tr = SoundManager.TRACKS[name];
    if (!tr?.file || !this.#ctx || name in this.#songLoads) return;
    this.#songLoads[name] = true;
    fetch(tr.file)
      .then(r => r.arrayBuffer())
      .then(b => this.#ctx.decodeAudioData(b))
      .then(buf => {
        this.#songs[name] = buf;
        if (this.#timer && this.#track === name) this.#startSong();   // swap the backup for the real thing
      })
      .catch(() => { delete this.#songLoads[name]; });   // try again next time
  }

  // ── Recorded tracks ─────────────────────────────────────
  #startSong() {
    this.#stopSong();
    const buf = this.#songs[this.#track];
    if (!buf || !this.#ctx) return false;
    const t = this.#ctx.currentTime;
    this.#songGain = this.#ctx.createGain();
    this.#songGain.gain.setValueAtTime(0.0001, t);
    this.#songGain.gain.linearRampToValueAtTime(SoundManager.TRACKS[this.#track].fileVolume ?? 1, t + 0.6);
    this.#songGain.connect(this.#music);
    this.#songSrc = this.#ctx.createBufferSource();
    this.#songSrc.buffer = buf;
    this.#songSrc.loop = true;
    this.#songSrc.connect(this.#songGain);
    this.#songSrc.start(t + 0.05);
    return true;
  }

  #stopSong() {
    if (!this.#songSrc) return;
    const src = this.#songSrc, g = this.#songGain, t = this.#ctx.currentTime;
    g.gain.cancelScheduledValues(t);
    g.gain.setValueAtTime(g.gain.value, t);
    g.gain.linearRampToValueAtTime(0.0001, t + 0.4);   // quick fade out
    src.stop(t + 0.45);
    this.#songSrc = this.#songGain = null;
  }

  // Is a recorded track playing (so the synth should stay quiet)?
  get #songPlaying() { return !!this.#songSrc; }

  // Handy for checking audio on a phone: SFX.audioState in the console
  get audioState() { return this.#ctx?.state ?? 'locked (tap the screen)'; }
  get fahhhReady() { return !!this.#clips.fahhh.buf; }

  // ── Music ───────────────────────────────────────────────
  // Switch soundtrack ('menu' | 'story' | 'match' | 'boss'). Starts from the top.
  setTrack(name) {
    if (!SoundManager.TRACKS[name] || name === this.#track) return;
    this.#track = name;
    this.#step = 0;
    if (this.#ctx) this.#nextNoteTime = this.#ctx.currentTime + 0.15;
    this.#loadSong(name);
    if (this.#timer) this.#startSong() || this.#stopSong();
  }

  get track() { return this.#track; }

  startMusic() {
    if (!this.#ctx || this.#timer) return;
    this.#nextNoteTime = this.#ctx.currentTime + 0.1;
    this.#timer = setInterval(() => this.#schedule(), 25);
    this.#startSong();
  }

  stopMusic() {
    clearInterval(this.#timer);
    this.#timer = null;
    this.#stopSong();
  }

  toggleMusic() {
    this.musicOn = !this.musicOn;
    this.#save('ll-music', this.musicOn);
    this.unlock();
    this.musicOn ? this.startMusic() : this.stopMusic();
    return this.musicOn;
  }

  toggleSfx() {
    this.sfxOn = !this.sfxOn;
    this.#save('ll-sfx', this.sfxOn);
    return this.sfxOn;
  }

  #schedule() {
    const tr = SoundManager.TRACKS[this.#track];
    const eighth = 60 / tr.bpm / 2;
    const now = this.#ctx.currentTime;
    if (this.#songPlaying) { this.#nextNoteTime = now + 0.05; return; }   // the recording is playing
    // If we fell behind (tab was asleep), skip ahead instead of
    // blasting every missed note at once.
    if (this.#nextNoteTime < now - 0.25) this.#nextNoteTime = now + 0.05;
    // Background tabs only get ~1 timer tick per second, so plan the
    // music further ahead while minimized to keep it smooth.
    const ahead = document.hidden ? 1.6 : 0.12;
    while (this.#nextNoteTime < now + ahead) {
      this.#playStep(this.#step, this.#nextNoteTime, eighth);
      this.#nextNoteTime += eighth;
      this.#step = (this.#step + 1) % (tr.progression.length * 8);
    }
  }

  #playStep(step, t, eighth) {
    const tr    = SoundManager.TRACKS[this.#track];
    const bar   = Math.floor(step / 8);
    const slot  = step % 8;
    const [root, shape] = SoundManager.CHORDS[tr.progression[bar]];

    // ── Bass / left hand ──
    if (tr.bass === 'stride') {          // low note on 1 & 3, chord stab on 2 & 4
      if (slot === 0) this.#piano(root - 12, t, 0.35, 0.55);
      if (slot === 4) this.#piano(root - 12 + 7, t, 0.35, 0.5);
      if (slot === 2 || slot === 6) {
        for (const iv of shape.slice(1)) this.#piano(root + iv, t, 0.14, 0.22);
      }
    } else if (tr.bass === 'walk') {     // walking bass on every beat
      const walk = [0, shape[1], shape[2], shape[1] + 2];
      if (slot % 2 === 0) this.#piano(root - 12 + walk[slot / 2], t, eighth * 1.5, 0.5);
      if (slot === 2 || slot === 6) {    // short, quiet chord "chops"
        for (const iv of shape.slice(1, 3)) this.#piano(root + iv, t, 0.08, 0.13);
      }
    } else if (tr.bass === 'habanera') { // tango rhythm: long-short-long-long
      const hab = { 0: 0, 3: 7, 4: 12, 6: 7 };
      if (hab[slot] !== undefined) this.#piano(root - 12 + hab[slot], t, eighth * (slot === 0 ? 2.6 : 1.2), 0.55);
      if (slot === 4) for (const iv of shape.slice(1, 3)) this.#piano(root + iv, t, 0.25, 0.16);
    }

    // ── Melody: riff built from chord tones ──
    const riff = tr.riffs[bar % tr.riffs.length];
    if (riff[slot] !== undefined) {
      const tones = [...shape, shape[1] + 12, shape[2] + 12];
      const note  = root + 12 + tones[riff[slot]];
      if (tr.lead === 'reed') this.#reed(note, t, eighth * tr.leadLen, 0.26);
      else this.#piano(note, t, eighth * tr.leadLen, 0.32);
    }

    // ── Drums ──
    if (tr.drums === 'brush' && slot % 2 === 1) this.#noise(t, 0.04, 0.05, 6000, this.#music);
    if (tr.drums === 'tick') {
      if (slot === 2 || slot === 6) this.#noise(t, 0.05, 0.12, 3500, this.#music);   // rimshot
      if (slot % 2 === 1) this.#noise(t, 0.025, 0.04, 8000, this.#music);            // hi-hat
    }
    if (tr.drums === 'tango') {
      if (slot === 0 || slot === 4) this.#noise(t, 0.12, 0.35, 140, this.#music);    // low thump
      if (slot === 6) this.#noise(t, 0.05, 0.1, 3000, this.#music);
    }
  }

  // A clarinet-ish reed: square + triangle with a little vibrato
  #reed(midi, t, dur, vel, dest = this.#music) {
    const ctx  = this.#ctx;
    const freq = 440 * Math.pow(2, (midi - 69) / 12);
    const env  = ctx.createGain();
    env.gain.setValueAtTime(0.0001, t);
    env.gain.exponentialRampToValueAtTime(vel, t + 0.03);
    env.gain.setValueAtTime(vel, t + Math.max(0.04, dur - 0.05));
    env.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.08);
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 1700;
    env.connect(lp).connect(dest);
    const lfo = ctx.createOscillator();
    const depth = ctx.createGain();
    lfo.frequency.value = 5.5;
    depth.gain.value = 9;
    lfo.connect(depth);
    for (const [type, level] of [['square', 0.16], ['triangle', 0.7]]) {
      const o = ctx.createOscillator();
      o.type = type;
      o.frequency.value = freq;
      depth.connect(o.detune);
      const g = ctx.createGain();
      g.gain.value = level;
      o.connect(g).connect(env);
      o.start(t);
      o.stop(t + dur + 0.12);
    }
    lfo.start(t);
    lfo.stop(t + dur + 0.12);
  }

  // A little honky-tonk piano: two slightly detuned voices, fast decay
  #piano(midi, t, dur, vel, dest = this.#music) {
    const ctx  = this.#ctx;
    const freq = 440 * Math.pow(2, (midi - 69) / 12);
    const env  = ctx.createGain();
    env.gain.setValueAtTime(0.0001, t);
    env.gain.exponentialRampToValueAtTime(vel, t + 0.008);
    env.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.25);
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 2600;
    env.connect(lp).connect(dest);
    for (const [type, detune] of [['triangle', -7], ['square', 7]]) {
      const o = ctx.createOscillator();
      o.type = type;
      o.frequency.value = freq;
      o.detune.value = detune;
      const g = ctx.createGain();
      g.gain.value = type === 'square' ? 0.18 : 0.8;
      o.connect(g).connect(env);
      o.start(t);
      o.stop(t + dur + 0.3);
    }
  }

  #noise(t, dur, vol, freq, dest = this.#master) {
    const ctx = this.#ctx;
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d   = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.value = vol;
    src.connect(bp).connect(g).connect(dest);
    src.start(t);
  }

  // quiet = true mutes effects for a moment (online play uses it so a
  // joined phone doesn't play the same sound twice)
  quiet = false;

  #ready() { return this.sfxOn && this.#ctx && !this.quiet; }

  // ── Sound effects ───────────────────────────────────────
  flip() {
    if (!this.#ready()) return;
    const t = this.#ctx.currentTime;
    this.#noise(t, 0.18, 0.5, 1800);
    this.#piano(84, t + 0.12, 0.15, 0.25, this.#master);
  }

  play() {
    if (!this.#ready()) return;
    const t = this.#ctx.currentTime;
    this.#noise(t, 0.07, 0.6, 900);
  }

  dice() {
    if (!this.#ready()) return;
    const t = this.#ctx.currentTime;
    for (let i = 0; i < 7; i++) this.#noise(t + i * 0.07 + Math.random() * 0.03, 0.03, 0.7, 2500 + Math.random() * 2000);
  }

  coin() {
    if (!this.#ready()) return;
    const t = this.#ctx.currentTime;
    this.#piano(96, t, 0.1, 0.3, this.#master);
    this.#piano(103, t + 0.08, 0.3, 0.3, this.#master);
  }

  good() {
    if (!this.#ready()) return;
    const t = this.#ctx.currentTime;
    [72, 76, 79, 84].forEach((n, i) => this.#piano(n, t + i * 0.07, 0.2, 0.3, this.#master));
  }

  fanfare() {
    if (!this.#ready()) return;
    const t = this.#ctx.currentTime;
    [60, 64, 67, 72, 67, 72, 76, 79, 84].forEach((n, i) => this.#piano(n, t + i * 0.11, 0.3, 0.35, this.#master));
  }

  // Play a recorded clip. The music dips while it plays so it really lands.
  // maxSeconds (optional) stops the clip early with a quick fade-out.
  #playClip(name, duckSeconds, maxSeconds = 0) {
    if (!this.sfxOn || this.quiet) return;
    const clip = this.#clips[name];
    if (this.#music) {
      const g = this.#music.gain, t = this.#ctx.currentTime;
      g.cancelScheduledValues(t);
      g.setTargetAtTime(0.03, t, 0.05);
      g.setTargetAtTime(0.16, t + duckSeconds, 0.3);
    }
    if (clip.buf && this.#ctx) {
      const t = this.#ctx.currentTime;
      const src = this.#ctx.createBufferSource();
      const g = this.#ctx.createGain();
      src.buffer = clip.buf;
      src.connect(g).connect(this.#master);
      src.start(t);
      if (maxSeconds) {   // (stop can only be scheduled after start)
        g.gain.setValueAtTime(1, t + maxSeconds - 0.25);
        g.gain.linearRampToValueAtTime(0.0001, t + maxSeconds);
        src.stop(t + maxSeconds + 0.05);
      }
      return;
    }
    try {
      clip.el.currentTime = 0;
      const p = clip.el.play();
      if (p) p.catch(() => {});
      if (maxSeconds) setTimeout(() => clip.el.pause(), maxSeconds * 1000);
    } catch {}
  }

  fahhh() { this.#playClip('fahhh', 1.6); }   // life lost / Whoopsies sent to you
  nope()  { this.#playClip('nope', 0.9); }    // someone played Cancel (only Cancel)
  wow()   { this.#playClip('wow', 1.4); }     // someone gained a life
  sax()   { this.#playClip('sax', 3, 3); }    // Swap Hands (3 seconds max)
  damage(){ this.#playClip('damage', 3.4); }  // Take 1: "emotional damage"
  laugh() { this.#playClip('laugh', 2.4); }   // Not Today!
}

// The Last Laugh Tour (story mode) screens: an energetic big band swing track.
// Until the file loads, the menu's ragtime piano plays as a backup.
SoundManager.TRACKS.story = { ...SoundManager.TRACKS.menu, file: 'sounds/story-swing.mp3', fileVolume: 0.8 };

const SFX = new SoundManager();
