// =============================================================
//  LAST LAUGH — Sound
//  A ragtime piano loop (synthesized with the Web Audio API, so
//  there's no music file to download) plus sound effects.
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
  #fahhh  = new Audio('sounds/fahhh.mp3');

  static BPM = 168;

  // 16-bar ragtime progression, one chord per bar
  static PROGRESSION = ['C','C','A7','A7','D7','G7','C','G7',
                        'C','C7','F','Fm','C','A7','D7','G7'];

  static CHORDS = {
    C:  [48, [0, 4, 7, 12]],  C7: [48, [0, 4, 7, 10]],
    F:  [53, [0, 4, 7, 12]],  Fm: [53, [0, 3, 7, 12]],
    G7: [43, [0, 4, 7, 10]],  A7: [45, [0, 4, 7, 10]],
    D7: [50, [0, 4, 7, 10]],
  };

  // Syncopated melody rhythms: eighth-note slot → chord-tone index
  static RIFFS = [
    { 0: 2, 1: 3, 3: 4, 4: 3, 6: 2 },
    { 0: 4, 2: 3, 3: 2, 5: 1, 6: 2 },
    { 1: 1, 2: 2, 3: 3, 4: 4, 6: 5 },
    { 0: 5, 1: 4, 3: 3, 4: 2, 7: 1 },
  ];

  constructor() {
    this.musicOn = this.#load('ll-music', true);
    this.sfxOn   = this.#load('ll-sfx', true);
    this.#fahhh.preload = 'auto';
  }

  #load(key, fallback) {
    try { const v = localStorage.getItem(key); return v === null ? fallback : v === '1'; }
    catch { return fallback; }
  }
  #save(key, val) { try { localStorage.setItem(key, val ? '1' : '0'); } catch {} }

  // Browsers only allow audio after the user clicks something,
  // so this is called from the first click.
  unlock() {
    if (this.#ctx) { if (this.#ctx.state === 'suspended') this.#ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.#ctx    = new AC();
    this.#master = this.#ctx.createGain();
    this.#master.gain.value = 0.9;
    this.#master.connect(this.#ctx.destination);
    this.#music  = this.#ctx.createGain();
    this.#music.gain.value = 0.16;
    this.#music.connect(this.#master);
    if (this.musicOn) this.startMusic();
  }

  // ── Music ───────────────────────────────────────────────
  startMusic() {
    if (!this.#ctx || this.#timer) return;
    this.#nextNoteTime = this.#ctx.currentTime + 0.1;
    this.#timer = setInterval(() => this.#schedule(), 25);
  }

  stopMusic() {
    clearInterval(this.#timer);
    this.#timer = null;
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
    const eighth = 60 / SoundManager.BPM / 2;
    while (this.#nextNoteTime < this.#ctx.currentTime + 0.12) {
      this.#playStep(this.#step, this.#nextNoteTime, eighth);
      this.#nextNoteTime += eighth;
      this.#step = (this.#step + 1) % (SoundManager.PROGRESSION.length * 8);
    }
  }

  #playStep(step, t, eighth) {
    const bar   = Math.floor(step / 8);
    const slot  = step % 8;
    const [root, shape] = SoundManager.CHORDS[SoundManager.PROGRESSION[bar]];

    // Left hand "stride": low bass on beats 1 & 3, chord stab on 2 & 4
    if (slot === 0) this.#piano(root - 12, t, 0.35, 0.55);
    if (slot === 4) this.#piano(root - 12 + 7, t, 0.35, 0.5);
    if (slot === 2 || slot === 6) {
      for (const iv of shape.slice(1)) this.#piano(root + iv, t, 0.14, 0.22);
    }

    // Right hand: syncopated riff built from chord tones
    const riff = SoundManager.RIFFS[bar % SoundManager.RIFFS.length];
    if (riff[slot] !== undefined) {
      const tones = [...shape, shape[1] + 12, shape[2] + 12];
      const note  = root + 12 + tones[riff[slot]];
      this.#piano(note, t, eighth * 1.6, 0.32);
    }

    // Soft brush on the off-beats
    if (slot % 2 === 1) this.#noise(t, 0.04, 0.05, 6000, this.#music);
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

  #ready() { return this.sfxOn && this.#ctx; }

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

  // The "FAHHH" — life lost or a Whoopsies redirected at you.
  // Music dips while it plays so it really lands.
  fahhh() {
    if (!this.sfxOn) return;
    if (this.#music) {
      const g = this.#music.gain, t = this.#ctx.currentTime;
      g.cancelScheduledValues(t);
      g.setTargetAtTime(0.03, t, 0.05);
      g.setTargetAtTime(0.16, t + 1.6, 0.3);
    }
    try {
      this.#fahhh.currentTime = 0;
      const p = this.#fahhh.play();
      if (p) p.catch(() => {});
    } catch {}
  }
}

const SFX = new SoundManager();
