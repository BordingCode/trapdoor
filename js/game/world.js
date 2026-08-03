// The simulation. Pure logic: it owns the tile grid, the player, the traps and the
// trigger runtime, and touches no DOM and no canvas. Everything the level does TO you
// is data (see levels.js) run through the action table at the bottom of this file.
import { TILE, COLS, ROWS, WORLD_W, WORLD_H } from '../engine/canvas.js';

export const PHYS = {
  gravity: 1450,
  maxFall: 780,
  runSpeed: 168,
  accelGround: 1500,
  accelAir: 1000,
  frictionGround: 2400,
  frictionAir: 260,
  iceFriction: 190,
  iceAccel: 520,
  jumpVel: 520,
  jumpCut: 0.45,
  coyote: 0.10,
  buffer: 0.13,
  playerW: 18,
  playerH: 26,
};

const SOLID = new Set(['#', 'o', '>', '<']);   // 'o' crumbles, but is solid until it does
const LOOKS_SOLID = new Set(['#', 'o', '=', '>', '<']); // '=' is the lie: drawn solid, isn't
export const BELT_SPEED = 112;   // two thirds of a run: upstream is possible, just slow

export function overlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

export const GLIMPSE_TIME = 1.5;

export class World {
  constructor(level, opts = {}) {
    this.level = level;
    this.nerveBanked = !!opts.nerveBanked;  // already carried to the door, some past run
    this.reset(true);
  }

  // Full re-arm: every trap goes back to looking innocent.
  reset(first = false) {
    const L = this.level;
    this.grid = L.grid.map((row) => row.padEnd(COLS, '.').slice(0, COLS).split(''));
    this.spawn = { x: 2 * TILE, y: 10 * TILE };
    this.door = null;
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        const c = this.grid[y]?.[x];
        if (c === 'S') {
          this.spawn = { x: x * TILE + (TILE - PHYS.playerW) / 2, y: (y + 1) * TILE - PHYS.playerH };
          this.grid[y][x] = '.';
        } else if (c === 'D') {
          this.door = { tx: x, ty: y, x: x * TILE + 5, y: (y - 1) * TILE + 4, w: TILE - 10, h: TILE * 2 - 4, fake: false, tox: null, t: 0, open: 0 };
          this.grid[y][x] = '.';
        }
      }
    }
    if (!this.door) this.door = { tx: COLS - 2, ty: 10, x: (COLS - 2) * TILE + 5, y: 9 * TILE + 4, w: TILE - 10, h: TILE * 2 - 4, fake: false, tox: null, t: 0, open: 0 };

    this.player = {
      x: this.spawn.x, y: this.spawn.y, w: PHYS.playerW, h: PHYS.playerH,
      vx: 0, vy: 0, grounded: false, coyote: 0, buffer: 0, face: 1,
      wasGrounded: false, squash: 0, anim: 0,
    };
    // The nerve: one per level, always somewhere the safe route doesn't go. Picking it up
    // is not enough — you have to carry it to the door. Every reset puts it back, so
    // dying with it in hand costs you the nerve as well as the time.
    this.nerve = L.nerve && !this.nerveBanked
      ? { x: L.nerve[0] * TILE + TILE / 2 - 7, y: L.nerve[1] * TILE + TILE / 2 - 7, w: 14, h: 14, got: false }
      : null;
    this.glimpse = 0;      // seconds of x-ray vision left

    this.movers = [];      // solid rects that move (crushers, sliding walls, falling blocks, platforms)
    this.spikes = [];      // emerging spike banks
    this.darts = [];
    this.crumbling = new Map(); // "x,y" -> timer
    this.pending = [];     // scheduled actions
    this.fired = new Set();
    this.lastFire = new Map();  // for `every` triggers
    this.edge = new Map();      // for `once:false` triggers
    this.gravDir = 1;
    this.ice = 0;
    this.dark = 0;
    this.flip = 0;         // left is right: the controls, not the world
    this.nojump = 0;       // your legs, temporarily withdrawn
    this.acid = null;      // { y, target, speed }
    this.time = 0;
    this.state = 'play';   // play | dead | won
    this.stateT = 0;
    this.events = [];      // drained by the presentation layer for sound / fx
    this.says = [];        // taunt bubbles: { text, life }
    this.deathCause = '';
    this.lockedSaid = false;
    if (first) { this.deaths = 0; this.best = null; }
    this.startedMoving = false;
  }

  emit(name, a, b, c) { this.events.push({ name, a, b, c }); }

  tileAt(tx, ty) {
    if (tx < 0 || ty < 0 || tx >= COLS || ty >= ROWS) return ty >= ROWS ? '.' : '#'; // walls outside, open below
    return this.grid[ty][tx];
  }

  isSolidTile(tx, ty) {
    if (tx < 0 || tx >= COLS) return true;   // side walls
    if (ty < 0) return true;                  // ceiling
    if (ty >= ROWS) return false;             // the pit
    return SOLID.has(this.grid[ty][tx]);
  }

  setTile(tx, ty, c) {
    if (tx < 0 || ty < 0 || tx >= COLS || ty >= ROWS) return;
    this.grid[ty][tx] = c;
  }

  // ---- collision helpers -------------------------------------------------
  solidsOverlapping(box) {
    const out = [];
    const x0 = Math.floor(box.x / TILE), x1 = Math.floor((box.x + box.w - 0.001) / TILE);
    const y0 = Math.floor(box.y / TILE), y1 = Math.floor((box.y + box.h - 0.001) / TILE);
    for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
      if (this.isSolidTile(tx, ty)) out.push({ x: tx * TILE, y: ty * TILE, w: TILE, h: TILE });
    }
    return out;
  }

  hitsSolid(box, ignore = null) {
    if (this.solidsOverlapping(box).length) return true;
    for (const m of this.movers) { if (m !== ignore && m.solid && overlap(box, m)) return true; }
    return false;
  }

  // ---- the step ----------------------------------------------------------
  step(dt, input) {
    this.time += dt;
    this.stateT += dt;

    for (let i = this.says.length - 1; i >= 0; i--) {
      this.says[i].life -= dt;
      if (this.says[i].life <= 0) this.says.splice(i, 1);
    }
    this.runPending(dt);

    if (this.glimpse > 0) this.glimpse = Math.max(0, this.glimpse - dt);

    if (this.state === 'play') {
      this.stepPlayer(dt, input);
      this.stepTraps(dt);
      this.checkTriggers();
      this.checkNerve();
      this.checkHazards();
      this.checkDoor(dt);
    } else {
      this.stepTraps(dt); // traps keep running through the death beat — it reads as gloating
    }
    return this.state;
  }

  stepPlayer(dt, input) {
    const p = this.player;
    const onIce = this.ice > 0;
    let dir = 0;
    if (input.left) dir -= 1;
    if (input.right) dir += 1;
    if (this.flip) dir = -dir;      // the one trap that isn't in the level, it's in you
    if (dir !== 0) { p.face = dir; this.startedMoving = true; }

    const accel = onIce ? PHYS.iceAccel : (p.grounded ? PHYS.accelGround : PHYS.accelAir);
    const friction = onIce ? PHYS.iceFriction : (p.grounded ? PHYS.frictionGround : PHYS.frictionAir);
    if (dir !== 0) {
      const max = PHYS.runSpeed;
      if (dir * p.vx > max) {
        // already over run speed (a shove, or ice) — bleed back down, never add more
        p.vx -= dir * friction * dt;
        if (dir * p.vx < max) p.vx = dir * max;
      } else {
        p.vx += dir * accel * dt;
        if (dir * p.vx > max) p.vx = dir * max;
      }
    } else {
      if (p.vx > 0) p.vx = Math.max(0, p.vx - friction * dt);
      else if (p.vx < 0) p.vx = Math.min(0, p.vx + friction * dt);
    }

    // jump: coyote time + input buffer + variable height. The traps are unfair; the
    // controls never are.
    p.coyote = p.grounded ? PHYS.coyote : Math.max(0, p.coyote - dt);
    p.buffer = Math.max(0, p.buffer - dt);
    if (input.jumpPressed) p.buffer = PHYS.buffer;
    if (p.buffer > 0 && p.coyote > 0 && !this.nojump) {
      p.vy = -PHYS.jumpVel * this.gravDir;
      p.buffer = 0; p.coyote = 0; p.grounded = false; p.squash = -0.35;
      this.emit('jump');
    }
    if (!input.jumpHeld && p.vy * this.gravDir < 0) p.vy *= PHYS.jumpCut;

    p.vy += PHYS.gravity * this.gravDir * dt;
    const term = PHYS.maxFall;
    if (p.vy > term) p.vy = term;
    if (p.vy < -term) p.vy = -term;

    // --- X, then Y, resolved separately against tiles and solid movers
    p.wasGrounded = p.grounded;
    p.x += p.vx * dt;
    this.resolveAxis(p, 'x');
    p.y += p.vy * dt;
    const landed = this.resolveAxis(p, 'y');
    if (landed && !p.wasGrounded) { p.squash = 0.3; this.emit('land'); }

    // a belt underfoot carries you whether you like it or not
    if (p.grounded && this.gravDir > 0) {
      const fy = Math.floor((p.y + p.h + 2) / TILE);
      const x0 = Math.floor((p.x + 2) / TILE), x1 = Math.floor((p.x + p.w - 2) / TILE);
      for (let tx = x0; tx <= x1; tx++) {
        const c = this.tileAt(tx, fy);
        if (c === '>') { p.rideVx = (p.rideVx || 0) + BELT_SPEED; break; }
        if (c === '<') { p.rideVx = (p.rideVx || 0) - BELT_SPEED; break; }
      }
    }
    // riding a horizontally moving platform
    if (p.grounded && p.rideVx) { p.x += p.rideVx * dt; this.resolveAxis(p, 'x'); }
    p.rideVx = 0;

    p.anim += dt * Math.abs(p.vx) * 0.05;
    p.squash += (0 - p.squash) * Math.min(1, dt * 12);

    if (p.x < 0) { p.x = 0; p.vx = 0; }
    if (p.x + p.w > WORLD_W) { p.x = WORLD_W - p.w; p.vx = 0; }
    if (p.y > WORLD_H + 40 || p.y + p.h < -60) this.kill('fall');
  }

  resolveAxis(p, axis) {
    let grounded = false;
    const boxes = this.solidsOverlapping(p).concat(this.movers.filter((m) => m.solid && overlap(p, m)));
    for (const b of boxes) {
      if (!overlap(p, b)) continue;
      if (axis === 'x') {
        if (p.vx > 0) p.x = b.x - p.w;
        else if (p.vx < 0) p.x = b.x + b.w;
        else p.x = (p.x + p.w / 2 < b.x + b.w / 2) ? b.x - p.w : b.x + b.w;
        p.vx = 0;
      } else {
        if (p.vy > 0) { p.y = b.y - p.h; if (this.gravDir > 0) { grounded = true; p.rideVx = b.vx || 0; } }
        else if (p.vy < 0) { p.y = b.y + b.h; if (this.gravDir < 0) { grounded = true; p.rideVx = b.vx || 0; } }
        p.vy = 0;
      }
    }
    if (axis === 'y') {
      if (!grounded) {
        // a 1px probe under the feet keeps "grounded" stable on the frame you land
        const probe = { x: p.x + 1, y: p.y + (this.gravDir > 0 ? p.h : -1), w: p.w - 2, h: 1 };
        grounded = this.hitsSolid(probe);
      }
      p.grounded = grounded;
    }
    return grounded;
  }

  stepTraps(dt) {
    // crumbling floor: stand on it and it thinks about it for a moment, then doesn't
    if (this.state === 'play') {
      const p = this.player;
      if (p.grounded) {
        const fy = Math.floor((p.y + p.h + 2) / TILE);
        const x0 = Math.floor((p.x + 2) / TILE), x1 = Math.floor((p.x + p.w - 2) / TILE);
        for (let tx = x0; tx <= x1; tx++) {
          if (this.tileAt(tx, fy) === 'o') {
            const k = tx + ',' + fy;
            if (!this.crumbling.has(k)) { this.crumbling.set(k, 0.32); this.emit('crumble'); }
          }
        }
      }
    }
    for (const [k, t] of [...this.crumbling]) {
      const nt = t - dt;
      if (nt <= 0) {
        const [tx, ty] = k.split(',').map(Number);
        this.setTile(tx, ty, '.');
        this.crumbling.delete(k);
        this.emit('collapse', tx * TILE + TILE / 2, ty * TILE + TILE / 2);
      } else this.crumbling.set(k, nt);
    }

    // Spike banks: out fast, and — if the level gave them a `hold` — back in again, which
    // turns a static hazard into a rhythm you have to read.
    for (const s of this.spikes) {
      if (!s.retract) {
        if (s.t < 1) { s.t = Math.min(1, s.t + dt / s.dur); if (s.t >= 1) s.settled = true; }
        else if (s.hold != null) { s.holdT -= dt; if (s.holdT <= 0) { s.retract = true; this.emit('spikeback'); } }
      } else s.t = Math.max(0, s.t - dt / s.dur);
    }
    for (let i = this.spikes.length - 1; i >= 0; i--) {
      if (this.spikes[i].retract && this.spikes[i].t <= 0) this.spikes.splice(i, 1);
    }

    for (let i = this.movers.length - 1; i >= 0; i--) {
      const m = this.movers[i];
      if (m.delay > 0) { m.delay -= dt; continue; }
      // a chaser steers at you every frame. Always slower than a run: it can't catch you,
      // it can only make standing still stop being an option
      if (m.chase) {
        const dx = (this.player.x + this.player.w / 2) - (m.x + m.w / 2);
        m.vx = (Math.abs(dx) < 4 ? 0 : Math.sign(dx)) * m.chase;
      }
      if (m.grav) m.vy = Math.min(900, m.vy + 1900 * dt);
      const oldX = m.x, oldY = m.y;
      m.x += m.vx * dt;
      m.y += m.vy * dt;
      if (m.stopY != null) {
        if (m.vy > 0 && m.y >= m.stopY) { m.y = m.stopY; m.vy = 0; m.landed = true; }
        if (m.vy < 0 && m.y <= m.stopY) { m.y = m.stopY; m.vy = 0; m.landed = true; }
      }
      if (m.stopX != null) {
        if (m.vx > 0 && m.x >= m.stopX) { m.x = m.stopX; m.vx = 0; m.landed = true; }
        if (m.vx < 0 && m.x <= m.stopX) { m.x = m.stopX; m.vx = 0; m.landed = true; }
      }
      if (m.grav && m.vy > 0) {
        // land a falling block on the first solid tile row beneath it
        const probe = { x: m.x + 1, y: m.y + m.h, w: m.w - 2, h: 1 };
        if (this.solidsOverlapping(probe).length) {
          m.y = Math.floor((m.y + m.h) / TILE) * TILE - m.h;
          m.vy = 0; m.grav = false; m.landed = true;
          this.emit('slam', m.x + m.w / 2, m.y + m.h);
        }
      }
      if (m.landed && !m.wasLanded) { m.wasLanded = true; if (m.quake) this.emit('slam', m.x + m.w / 2, m.y + m.h); }
      // `gone` movers dissolve once they have arrived — a lift that waits at the top is a
      // lift the next ride gets crushed against, and one that waits is not much of a threat
      if (m.landed && m.gone != null) {
        m.goneT = (m.goneT == null ? m.gone : m.goneT) - dt;
        if (m.goneT <= 0) {
          this.emit('collapse', m.x + m.w / 2, m.y + m.h / 2);
          this.movers.splice(i, 1);
          continue;
        }
      }
      if (m.bounce && (m.landed)) { /* ping-pong movers */
        m.landed = false; m.wasLanded = false;
        if (m.stopX != null && m.homeX != null) { const t = m.stopX; m.stopX = m.homeX; m.homeX = t; m.vx = -m.vx || (m.stopX > m.x ? m.speed : -m.speed); }
        if (m.stopY != null && m.homeY != null) { const t = m.stopY; m.stopY = m.homeY; m.homeY = t; m.vy = -m.vy || (m.stopY > m.y ? m.speed : -m.speed); }
      }
      if (this.state === 'play' && m.solid) this.pushPlayer(m, m.x - oldX, m.y - oldY);
      if (m.x + m.w < -80 || m.x > WORLD_W + 80 || m.y > WORLD_H + 120) this.movers.splice(i, 1);
    }

    for (let i = this.darts.length - 1; i >= 0; i--) {
      const d = this.darts[i];
      d.x += d.vx * dt;
      d.y += d.vy * dt;
      if (d.x < -30 || d.x > WORLD_W + 30 || d.y < -30 || d.y > WORLD_H + 30) { this.darts.splice(i, 1); continue; }
      if (this.solidsOverlapping(d).length) { this.emit('tick', d.x, d.y); this.darts.splice(i, 1); }
    }

    if (this.acid) {
      const a = this.acid;
      if (a.y > a.target) a.y = Math.max(a.target, a.y - a.speed * dt);
      else if (a.y < a.target) a.y = Math.min(a.target, a.y + a.speed * dt);
    }

    if (this.door.tox != null) {
      const d = this.door;
      d.t = Math.min(1, d.t + dt * 3.4);
      const e = 1 - Math.pow(1 - d.t, 3);
      d.x = d.fromx + (d.tox - d.fromx) * e;
      d.y = d.fromy + (d.toy - d.fromy) * e;
      if (d.t >= 1) { d.tox = null; }
    }
  }

  // A mover that runs into the player shoves them; shoved into a wall = crushed.
  pushPlayer(m, dx, dy) {
    const p = this.player;
    if (!overlap(p, m)) return;
    if (Math.abs(dy) > Math.abs(dx)) {
      if (dy > 0) p.y = m.y + m.h; else p.y = m.y - p.h;
      if (dy < 0) { p.grounded = true; p.vy = Math.min(p.vy, 0); }
    } else if (dx !== 0) {
      if (dx > 0) p.x = m.x + m.w; else p.x = m.x - p.w;
    } else return;
    if (this.hitsSolid(p, m)) this.kill('crush');
  }

  // ---- hazards -----------------------------------------------------------
  hazardRects() {
    const out = [];
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
      const c = this.grid[y][x];
      if (c === '^') out.push({ x: x * TILE + 3, y: y * TILE + TILE * 0.38, w: TILE - 6, h: TILE * 0.62, kind: 'spike' });
      else if (c === 'v') out.push({ x: x * TILE + 3, y: y * TILE, w: TILE - 6, h: TILE * 0.62, kind: 'spike' });
      else if (c === '~') out.push({ x: x * TILE, y: y * TILE + TILE * 0.3, w: TILE, h: TILE * 0.7, kind: 'acid' });
    }
    for (const s of this.spikes) {
      if (s.t < 0.28) continue;
      out.push({ ...this.spikeRect(s), kind: 'spike' });
    }
    for (const d of this.darts) out.push({ x: d.x, y: d.y, w: d.w, h: d.h, kind: 'dart' });
    for (const m of this.movers) if (m.kill) out.push({ x: m.x + 2, y: m.y + 2, w: m.w - 4, h: m.h - 4, kind: 'crush' });
    if (this.acid) out.push({ x: 0, y: this.acid.y, w: WORLD_W, h: WORLD_H - this.acid.y + 60, kind: 'acid' });
    return out;
  }

  spikeRect(s) {
    const len = s.len * s.t;
    if (s.from === 'up') return { x: s.x + 3, y: s.y + s.h - len, w: s.w - 6, h: len };
    if (s.from === 'down') return { x: s.x + 3, y: s.y, w: s.w - 6, h: len };
    if (s.from === 'left') return { x: s.x, y: s.y + 3, w: len, h: s.h - 6 };
    return { x: s.x + s.w - len, y: s.y + 3, w: len, h: s.h - 6 };
  }

  checkHazards() {
    const p = this.player;
    const hit = { x: p.x + 2, y: p.y + 2, w: p.w - 4, h: p.h - 4 };
    for (const h of this.hazardRects()) {
      if (overlap(hit, h)) { this.kill(h.kind); return; }
    }
  }

  // The door wants the nerve. Not banked in some past run — in your hands, now. `nerve`
  // is null once it has been banked (or on a level that never had one), so a level you
  // have already paid for opens normally.
  doorLocked() { return !!(this.nerve && !this.nerve.got); }

  checkDoor(dt) {
    const d = this.door;
    const p = this.player;
    // A door in flight cannot be entered. Without this you can win by standing in the
    // path of a fleeing door and letting it hit you — and whether that happens depends
    // on how far it travels per frame, so it was a frame-timing lottery too.
    if (d.tox != null) {
      d.open += (0 - d.open) * Math.min(1, dt * 8);
      return;
    }
    const near = overlap(p, { x: d.x - 8, y: d.y, w: d.w + 16, h: d.h });
    const locked = this.doorLocked();
    d.open += ((near && !d.fake && !locked ? 1 : 0) - d.open) * Math.min(1, dt * 8);
    if (locked) {
      if (near && !this.lockedSaid) {
        this.lockedSaid = true;
        this.says.push({ text: 'Not without the nerve.', life: 2.2 });
        this.emit('locked', d.x + d.w / 2, d.y + d.h / 2);
      }
      return;
    }
    if (d.fake) return;
    if (overlap({ x: p.x + 4, y: p.y + 4, w: p.w - 8, h: p.h - 8 }, d)) {
      this.state = 'won';
      this.stateT = 0;
      this.emit('win');
    }
  }

  // true while you are carrying a nerve you have not yet banked at the door
  holdingNerve() { return !!(this.nerve && this.nerve.got); }

  checkNerve() {
    const n = this.nerve;
    if (!n || n.got) return;
    if (overlap(this.player, n)) {
      n.got = true;
      this.emit('nerve', n.x + n.w / 2, n.y + n.h / 2);
    }
  }

  // Spend a nerve to see what the level is about to do. Returns false if it can't
  // be used (already looking, or the level is over).
  useGlimpse() {
    if (this.state !== 'play' || this.glimpse > 0) return false;
    this.glimpse = GLIMPSE_TIME;
    this.emit('glimpse');
    return true;
  }

  // Everything the level is still holding back, as drawable shapes. This only exists
  // because the traps are DATA — it reads the un-fired triggers and describes them.
  // A `liar` level corrupts the answer: it invents threats and hides a real one.
  truth() {
    const out = [];
    const lie = !!this.level.liar;
    const push = (kind, x, y, w, h, extra) => out.push({ kind, x, y, w, h, ...extra });

    // static lies baked into the tiles
    for (let ty = 0; ty < ROWS; ty++) for (let tx = 0; tx < COLS; tx++) {
      const c = this.grid[ty][tx];
      if (c === '=') push('phantom', tx * TILE, ty * TILE, TILE, TILE);
      else if (c === 'o') push('brittle', tx * TILE, ty * TILE, TILE, TILE);
    }

    // a door that is a prop: the glimpse will tell you, which is what it's for
    if (this.door.fake) push('liedoor', this.door.x, this.door.y, this.door.w, this.door.h);

    const trigs = this.level.triggers || [];
    for (let i = 0; i < trigs.length; i++) {
      const tr = trigs[i];
      if (tr.every == null && tr.once !== false && this.fired.has('T' + i)) continue;
      if (tr.after != null && this.deaths < tr.after) continue;  // not armed yet — not a lie to omit it
      for (const a of tr.do || []) {
        const w = (a.w || 1) * TILE, h = (a.h || 1) * TILE;
        switch (a.t) {
          case 'set':
            push(a.c === '.' ? 'vanish' : 'appear', a.x * TILE, a.y * TILE, w, h);
            break;
          case 'spikes':
            push('spikes', a.x * TILE, a.y * TILE, w, h, { from: a.from || 'up' });
            break;
          case 'crush':
            push('crush', a.x * TILE, a.y * TILE, w, h, { vx: a.vx || 0, vy: a.vy || 0 });
            break;
          case 'drop':
            push('crush', a.x * TILE, a.y * TILE, w, h, { vx: 0, vy: 1 });
            break;
          case 'dart':
            push('dart', a.x * TILE, a.y * TILE, TILE, TILE, { vx: a.vx || -1 });
            break;
          case 'door':
            push('door', a.x * TILE + 5, (a.y - 1) * TILE + 4, TILE - 10, TILE * 2 - 4);
            break;
          case 'push': push('gust', 0, 0, WORLD_W, WORLD_H, { vx: a.vx || 0, vy: a.vy || 0 }); break;
          case 'fakedoor': if (a.v !== false) push('liedoor', this.door.x, this.door.y, this.door.w, this.door.h); break;
          case 'grav': push('grav', 0, 0, 0, 0, { v: a.v }); break;
          case 'flip': if (a.v !== 0) push('flip', 0, 0, 0, 0); break;
          case 'nojump': if (a.v !== 0) push('nojump', 0, 0, 0, 0); break;
          case 'acid': push('acid', 0, a.y * TILE, WORLD_W, 4); break;
          case 'ice': push('ice', 0, 0, 0, 0); break;
          case 'dark': push('dark', 0, 0, 0, 0); break;
          default: break;
        }
      }
    }

    if (lie) {
      // keeps one genuine threat to itself…
      const DANGER = ['vanish', 'spikes', 'crush', 'dart'];
      const hide = out.findIndex((g) => DANGER.includes(g.kind));
      if (hide >= 0) out.splice(hide, 1);
      // …and invents a few that were never coming
      const seed = Math.floor(this.time * 0.7);
      for (let k = 0; k < 3; k++) {
        const tx = 3 + ((seed * 7 + k * 5) % 17);
        push(k % 2 ? 'vanish' : 'spikes', tx * TILE, (k % 2 ? 11 : 10) * TILE, 2 * TILE, TILE, { from: 'up' });
      }
    }
    return out;
  }

  kill(cause) {
    if (this.state !== 'play') return;
    this.state = 'dead';
    this.stateT = 0;
    this.deaths++;
    this.deathCause = cause;
    if (this.holdingNerve()) this.emit('nervelost', this.player.x + this.player.w / 2, this.player.y + this.player.h / 2);
    this.emit('die', this.player.x + this.player.w / 2, this.player.y + this.player.h / 2, cause);
  }

  // ---- triggers ----------------------------------------------------------
  checkTriggers() {
    const trigs = this.level.triggers || [];
    for (let i = 0; i < trigs.length; i++) {
      const tr = trigs[i];
      const key = 'T' + i;
      // `needs` chains triggers: the door can only run away a second time after the first
      if (tr.needs != null && !this.fired.has('T' + tr.needs)) continue;
      // `after` is the level holding a grudge: it only arms once it has killed you n times
      // (deaths survive reset, so the level escalates within a session and forgets if you leave)
      if (tr.after != null && this.deaths < tr.after) continue;
      const met = this.condMet(tr);
      if (tr.every != null) {                       // repeating on a cooldown
        if (!met) continue;
        const last = this.lastFire.get(key);
        if (last != null && this.time - last < tr.every) continue;
        this.lastFire.set(key, this.time);
      } else if (tr.once === false) {               // edge-triggered: re-arms when you leave
        const was = this.edge.get(key) || false;
        this.edge.set(key, met);
        if (!met || was) continue;
      } else {                                      // one shot
        if (this.fired.has(key) || !met) continue;
      }
      this.fired.add(key);
      this.schedule(tr.do || [], tr.delay || 0);
    }
  }

  condMet(tr) {
    const p = this.player;
    switch (tr.on) {
      case 'zone': {
        const r = { x: tr.x * TILE, y: tr.y * TILE, w: (tr.w || 1) * TILE, h: (tr.h || 1) * TILE };
        return overlap(p, r);
      }
      case 'stand': {
        if (!p.grounded) return false;
        const fy = Math.floor((p.y + p.h + 2) / TILE);
        if (fy !== tr.y) return false;
        const x0 = Math.floor((p.x + 2) / TILE), x1 = Math.floor((p.x + p.w - 2) / TILE);
        return x1 >= tr.x && x0 <= tr.x + (tr.w || 1) - 1;
      }
      case 'time': return this.time >= tr.s;
      case 'move': return this.startedMoving;
      case 'air': return !p.grounded;
      case 'land': return p.grounded && !p.wasGrounded;
      case 'door': {
        const d = this.door;
        if (d.tox != null) return false; // a door in mid-flight isn't "approached"
        const dx = (p.x + p.w / 2) - (d.x + d.w / 2);
        const dy = (p.y + p.h / 2) - (d.y + d.h / 2);
        return Math.hypot(dx, dy) < (tr.d || 3) * TILE;
      }
      case 'pastx': return p.x + p.w / 2 > tr.x * TILE;
      case 'above': return p.y + p.h < tr.y * TILE;
      default: return false;
    }
  }

  schedule(actions, delay) {
    for (const a of actions) this.pending.push({ a, t: delay + (a.d || 0) });
  }

  runPending(dt) {
    for (let i = this.pending.length - 1; i >= 0; i--) {
      const it = this.pending[i];
      it.t -= dt;
      if (it.t <= 0) { this.pending.splice(i, 1); this.act(it.a); }
    }
  }

  // ---- the action table: everything the level can do to you ---------------
  act(a) {
    switch (a.t) {
      case 'set': {
        const w = a.w || 1, h = a.h || 1;
        for (let y = a.y; y < a.y + h; y++) for (let x = a.x; x < a.x + w; x++) {
          const was = this.tileAt(x, y);
          this.setTile(x, y, a.c);
          if (a.c === '.' && LOOKS_SOLID.has(was)) this.emit('collapse', x * TILE + TILE / 2, y * TILE + TILE / 2);
        }
        if (a.c === '.') this.emit('trap');
        else this.emit('slam', (a.x + w / 2) * TILE, (a.y + h) * TILE);
        break;
      }
      case 'spikes': {
        const from = a.from || 'up';
        const w = (a.w || 1) * TILE, h = (a.h || 1) * TILE;
        const len = (from === 'up' || from === 'down') ? h : w;
        this.spikes.push({
          x: a.x * TILE, y: a.y * TILE, w, h, from, len, t: 0, dur: a.dur || 0.13,
          hold: a.hold ?? null, holdT: a.hold ?? 0,   // hold = seconds out before they pull back in
          teeth: Math.max(1, Math.round(((from === 'up' || from === 'down') ? (a.w || 1) : (a.h || 1)) * 2)),
        });
        this.emit('spike', (a.x + (a.w || 1) / 2) * TILE, (a.y + (a.h || 1) / 2) * TILE);
        break;
      }
      case 'crush': {
        this.movers.push({
          x: a.x * TILE, y: a.y * TILE, w: (a.w || 1) * TILE, h: (a.h || 1) * TILE,
          vx: (a.vx || 0), vy: (a.vy || 0),
          stopX: a.sx != null ? a.sx * TILE : null, stopY: a.sy != null ? a.sy * TILE : null,
          homeX: a.x * TILE, homeY: a.y * TILE, speed: Math.abs(a.vx || a.vy || 0),
          // a blade (`kill`) is usually `solid:false` too — you cannot ride what cuts you
          bounce: !!a.bounce, solid: a.solid !== false, kill: !!a.kill, gone: a.gone ?? null,
          chase: a.chase ?? null,
          quake: a.quake !== false, delay: a.wait || 0, col: a.col || null,
        });
        this.emit('trap');
        break;
      }
      case 'drop': {
        this.movers.push({
          x: a.x * TILE, y: a.y * TILE, w: (a.w || 1) * TILE, h: (a.h || 1) * TILE,
          vx: 0, vy: 0, grav: true, solid: true, kill: null, quake: true, delay: a.wait || 0, stopY: null, stopX: null,
        });
        this.emit('trap');
        break;
      }
      case 'dart': {
        this.darts.push({ x: a.x * TILE, y: a.y * TILE + TILE / 2 - 4, w: 12, h: 8, vx: a.vx || -300, vy: a.vy || 0 });
        this.emit('dart');
        break;
      }
      case 'door': {
        const d = this.door;
        d.fromx = d.x; d.fromy = d.y; d.t = 0;
        d.tox = a.x * TILE + 5; d.toy = (a.y - 1) * TILE + 4;
        d.tx = a.x; d.ty = a.y;
        d.fake = false;
        this.emit('doormove');
        break;
      }
      case 'fakedoor': { this.door.fake = !!(a.v ?? true); break; }
      case 'grav': { this.gravDir = a.v; this.emit('trap'); break; }
      case 'flip': { this.flip = a.v ?? 1; this.emit(this.flip ? 'trap' : 'tick'); break; }
      case 'nojump': { this.nojump = a.v ?? 1; this.emit(this.nojump ? 'trap' : 'tick'); break; }
      case 'ice': { this.ice = a.v ?? 1; break; }
      case 'dark': { this.dark = a.v ?? 0.85; break; }
      case 'acid': { this.acid = { y: (a.from ?? ROWS) * TILE, target: a.y * TILE, speed: a.speed ?? 26 }; break; }
      case 'push': { this.player.vx += a.vx || 0; this.player.vy += a.vy || 0; this.emit('trap'); break; }
      case 'shake': { this.emit('shake', a.mag || 6); break; }
      case 'say': { this.says.push({ text: a.text, life: a.life || 2.6 }); this.emit('taunt'); break; }
      case 'sfx': { this.emit(a.name); break; }
      default: break;
    }
  }
}
