// Pooled square particles + screen shake + floating text. No allocation in the hot path.
const GRAV = 900;

export class Fx {
  constructor(max = 220) {
    this.parts = [];
    for (let i = 0; i < max; i++) this.parts.push({ live: false, x: 0, y: 0, vx: 0, vy: 0, s: 0, life: 0, max: 1, col: '#fff', g: 1, spin: 0, rot: 0 });
    this.shake = 0;
    this.shakeMag = 0;
    this.texts = [];
  }

  _get() {
    for (const p of this.parts) if (!p.live) return p;
    return null;
  }

  burst(x, y, n, col, opts = {}) {
    const spd = opts.speed ?? 190;
    const size = opts.size ?? 5;
    const life = opts.life ?? 0.55;
    const g = opts.g ?? 1;
    for (let i = 0; i < n; i++) {
      const p = this._get();
      if (!p) return;
      const a = opts.dir !== undefined ? opts.dir + (Math.random() - 0.5) * (opts.spread ?? 1.2) : Math.random() * Math.PI * 2;
      const v = spd * (0.35 + Math.random() * 0.9);
      p.live = true;
      p.x = x; p.y = y;
      p.vx = Math.cos(a) * v;
      p.vy = Math.sin(a) * v - (opts.lift ?? 0);
      p.s = size * (0.6 + Math.random() * 0.8);
      p.life = p.max = life * (0.7 + Math.random() * 0.6);
      p.col = col;
      p.g = g;
      p.rot = Math.random() * Math.PI;
      p.spin = (Math.random() - 0.5) * 12;
    }
  }

  dust(x, y, n = 6) {
    this.burst(x, y, n, '#5c6479', { speed: 90, size: 4, life: 0.35, g: 0.2, dir: -Math.PI / 2, spread: 2.4 });
  }

  // Status callouts, not damage numbers: a new one supersedes any still hanging around
  // nearby, so two events in quick succession never print on top of each other.
  text(x, y, str, col = '#fff', life = 1.6) {
    for (let i = this.texts.length - 1; i >= 0; i--) {
      const t = this.texts[i];
      if (Math.abs(t.x - x) < 220 && Math.abs(t.y - y) < 46) this.texts.splice(i, 1);
    }
    this.texts.push({ x, y, str, col, life, max: life });
  }

  quake(mag = 6, time = 0.28) {
    this.shakeMag = Math.max(this.shakeMag, mag);
    this.shake = Math.max(this.shake, time);
  }

  step(dt) {
    for (const p of this.parts) {
      if (!p.live) continue;
      p.life -= dt;
      if (p.life <= 0) { p.live = false; continue; }
      p.vy += GRAV * p.g * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.spin * dt;
    }
    for (let i = this.texts.length - 1; i >= 0; i--) {
      const t = this.texts[i];
      t.life -= dt;
      t.y -= 12 * dt;
      if (t.life <= 0) this.texts.splice(i, 1);
    }
    if (this.shake > 0) {
      this.shake -= dt;
      if (this.shake <= 0) { this.shake = 0; this.shakeMag = 0; }
    }
  }

  shakeOffset() {
    if (this.shake <= 0) return { x: 0, y: 0 };
    const m = this.shakeMag * Math.min(1, this.shake * 4);
    return { x: (Math.random() - 0.5) * 2 * m, y: (Math.random() - 0.5) * 2 * m };
  }

  clear() {
    for (const p of this.parts) p.live = false;
    this.texts.length = 0;
    this.shake = 0;
    this.shakeMag = 0;
  }
}
