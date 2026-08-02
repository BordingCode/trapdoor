// Procedural Web Audio SFX — no files. Soft attack/decay envelopes, gentle master gain:
// the game is mean, the sound is not (nothing harsh or clipping).
let ctx = null;
let master = null;
let muted = false;

export function setMuted(m) { muted = m; if (master) master.gain.value = m ? 0 : 0.32; }
export function isMuted() { return muted; }

export function unlock() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.32;
    master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
}

function tone({ freq = 440, type = 'sine', dur = 0.16, gain = 0.5, slide = 0, delay = 0, attack = 0.008, curve = 'exp' }) {
  if (!ctx || muted) return;
  const t0 = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slide) {
    if (curve === 'exp') osc.frequency.exponentialRampToValueAtTime(Math.max(20, freq + slide), t0 + dur);
    else osc.frequency.linearRampToValueAtTime(Math.max(20, freq + slide), t0 + dur);
  }
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(master);
  osc.start(t0);
  osc.stop(t0 + dur + 0.03);
}

function noise({ dur = 0.2, gain = 0.4, freq = 900, q = 1, delay = 0, type = 'lowpass', slide = 0 }) {
  if (!ctx || muted) return;
  const t0 = ctx.currentTime + delay;
  const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const f = ctx.createBiquadFilter();
  f.type = type;
  f.frequency.setValueAtTime(freq, t0);
  if (slide) f.frequency.exponentialRampToValueAtTime(Math.max(60, freq + slide), t0 + dur);
  f.Q.value = q;
  const g = ctx.createGain();
  g.gain.setValueAtTime(gain, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(f).connect(g).connect(master);
  src.start(t0);
}

export const sfx = {
  jump() { tone({ freq: 330, type: 'triangle', slide: 210, dur: 0.13, gain: 0.28 }); },
  land() { noise({ dur: 0.09, gain: 0.16, freq: 420, slide: -260 }); },
  step() { noise({ dur: 0.04, gain: 0.05, freq: 700 }); },
  // the moment the level betrays you: a low, smug thunk
  trap() {
    tone({ freq: 138, type: 'square', slide: -66, dur: 0.22, gain: 0.2 });
    noise({ dur: 0.18, gain: 0.18, freq: 300, slide: -180 });
  },
  spike() { tone({ freq: 1180, type: 'triangle', slide: -520, dur: 0.14, gain: 0.16 }); noise({ dur: 0.1, gain: 0.12, freq: 2600, type: 'bandpass', q: 3 }); },
  crumble() { noise({ dur: 0.3, gain: 0.16, freq: 800, slide: -640 }); },
  slam() { tone({ freq: 90, type: 'sine', slide: -40, dur: 0.3, gain: 0.3 }); noise({ dur: 0.22, gain: 0.22, freq: 260, slide: -200 }); },
  die() {
    tone({ freq: 300, type: 'square', slide: -190, dur: 0.3, gain: 0.2 });
    noise({ dur: 0.34, gain: 0.2, freq: 1100, slide: -1000 });
    // the little mocking three-note sigh
    tone({ freq: 392, type: 'triangle', dur: 0.14, gain: 0.13, delay: 0.16 });
    tone({ freq: 349, type: 'triangle', dur: 0.14, gain: 0.13, delay: 0.28 });
    tone({ freq: 262, type: 'triangle', dur: 0.3, gain: 0.13, delay: 0.4 });
  },
  door() { tone({ freq: 523, type: 'triangle', dur: 0.5, gain: 0.2 }); tone({ freq: 784, type: 'sine', dur: 0.6, gain: 0.13, delay: 0.05 }); },
  win() {
    const notes = [523, 659, 784, 1047];
    notes.forEach((f, i) => tone({ freq: f, type: 'triangle', dur: 0.34, gain: 0.17, delay: i * 0.09 }));
  },
  chapter() {
    const notes = [392, 523, 659, 784, 1047];
    notes.forEach((f, i) => tone({ freq: f, type: 'sine', dur: 0.7, gain: 0.15, delay: i * 0.12 }));
  },
  click() { tone({ freq: 660, type: 'sine', dur: 0.07, gain: 0.16 }); },
  // taking a nerve: a bright rising pair, the only friendly sound in the game
  nerve() {
    tone({ freq: 784, type: 'triangle', dur: 0.2, gain: 0.16 });
    tone({ freq: 1175, type: 'sine', dur: 0.3, gain: 0.12, delay: 0.07 });
  },
  // losing one you were carrying: the nerve sound, falling apart
  nerveLost() {
    tone({ freq: 1175, type: 'triangle', slide: -560, dur: 0.28, gain: 0.11 });
    tone({ freq: 587, type: 'sine', slide: -230, dur: 0.34, gain: 0.08, delay: 0.06 });
  },
  // spending one: a cold shimmer as the level's true face surfaces
  glimpse() {
    tone({ freq: 1568, type: 'sine', slide: -430, dur: 0.5, gain: 0.09 });
    tone({ freq: 1046, type: 'sine', dur: 0.45, gain: 0.07, delay: 0.04 });
    noise({ dur: 0.4, gain: 0.05, freq: 3200, type: 'bandpass', q: 2, slide: -1800 });
  },
  taunt() { tone({ freq: 220, type: 'sine', slide: 90, dur: 0.18, gain: 0.1 }); },
};
