// Solvability smoke test: a dumb bot plays every level in the REAL simulation
// (js/game/world.js, same code the browser runs). It proves a level can be finished —
// it does not prove the level is fun, or that a human finds it fair.
//
//   node tests/solve.mjs            all levels
//   node tests/solve.mjs 7          just level 8 (0-indexed), verbose
import { World } from '../js/game/world.js';
import { LEVELS } from '../js/game/levels.js';
import { TILE } from '../js/engine/canvas.js';

const STEP = 1 / 60;

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Walk at the door; jump at walls, gaps, hazards and anything sharp coming at you.
// Everything else is random flailing, which is roughly how a human plays it too.
function play(level, seed, maxTime = 34, maxDeaths = 30) {
  const rnd = mulberry32(seed);
  const w = new World(level);
  let t = 0, deaths = 0;
  let jumpFrames = 0, waitFor = 0, held = false;
  const trace = [];

  while (t < maxTime) {
    const p = w.player;
    const d = w.door;
    const dcx = d.x + d.w / 2;
    const pcx = p.x + p.w / 2;
    let dir = Math.abs(dcx - pcx) < 7 ? 0 : Math.sign(dcx - pcx);

    if (waitFor > 0) { waitFor -= STEP; dir = 0; }
    else if (rnd() < 0.006) waitFor = 0.2 + rnd() * 0.7;

    const g = w.gravDir;
    const feetY = g > 0 ? p.y + p.h + 2 : p.y - 2;
    const fy = Math.floor(feetY / TILE);
    const aheadX = pcx + (dir || 1) * (p.w / 2 + 10);
    const ax = Math.floor(aheadX / TILE);
    let wantJump = false;

    // is there anywhere to LAND within a jump of here, in the direction of travel?
    const canLand = (from, to) => {
      for (let x = from; x <= to; x += 8) {
        const tx = Math.floor(x / TILE);
        for (let ry = fy - 3; ry <= fy + 1; ry++) if (w.isSolidTile(tx, ry)) return true;
        for (const m of w.movers) if (m.solid && m.x < x && m.x + m.w > x && Math.abs(m.y - p.y - p.h) < 90) return true;
      }
      return false;
    };

    if (dir !== 0) {
      // wall in the way
      const bodyRow = Math.floor((p.y + p.h / 2) / TILE);
      if (w.isSolidTile(ax, bodyRow)) wantJump = true;
      // hole in the floor ahead — only leap it if there's ground on the far side,
      // otherwise stand at the edge and wait (for a platform, or for a better idea)
      const holeAhead = !w.isSolidTile(ax, fy) && !w.movers.some((m) => m.solid && m.x < aheadX + 8 && m.x + m.w > aheadX - 8 && Math.abs(m.y - (fy * TILE)) < TILE);
      if (holeAhead) {
        if (canLand(pcx + dir * 34, pcx + dir * 128)) wantJump = true;
        else if (p.grounded) dir = 0; // edge of the world: hold position
      }
      // something sharp within ~2.5 tiles
      for (const h of w.hazardRects()) {
        if (h.y + h.h < p.y - 6 || h.y > p.y + p.h + 6) continue;
        const dx = (h.x + h.w / 2) - pcx;
        if (Math.sign(dx) === dir && Math.abs(dx) < 80) { wantJump = true; break; }
      }
    }
    // the door is above us — climb
    if ((d.y + d.h / 2) * g < (p.y + p.h / 2) * g - 24) wantJump = true;
    // don't fidget while riding a platform over something fatal
    const onMover = w.movers.some((m) => m.solid && m.x < p.x + p.w && m.x + m.w > p.x && Math.abs(m.y - (p.y + p.h)) < 4);
    if (!onMover && rnd() < 0.02) wantJump = true;

    const grounded = p.grounded;
    if (wantJump && grounded && jumpFrames <= 0) jumpFrames = 7 + Math.floor(rnd() * 8);
    const jumpNow = jumpFrames > 0;
    if (jumpFrames > 0) jumpFrames--;

    const inp = { left: dir < 0, right: dir > 0, jumpHeld: jumpNow, jumpPressed: jumpNow && !held };
    held = jumpNow;

    w.step(STEP, inp);
    w.events.length = 0;
    t += STEP;

    if (w.state === 'won') return { ok: true, t, deaths, trace };
    if (w.state === 'dead') {
      deaths++;
      if (deaths > maxDeaths) return { ok: false, t, deaths, why: 'died ' + deaths + 'x (last: ' + w.deathCause + ')' };
      w.reset();
      jumpFrames = 0; held = false; waitFor = 0;
    }
  }
  return { ok: false, t, deaths, why: 'ran out of time (' + maxTime + 's)' };
}

// Levels whose solution needs patience the bot doesn't have (waiting for a moving
// platform to come back). They're covered by hand-written routes in routes.mjs instead.
const ROUTED = new Set([22]);

const only = process.argv[2] != null ? Number(process.argv[2]) : null;
const list = only != null ? [[LEVELS[only], only]] : LEVELS.map((L, i) => [L, i]);
let fails = 0;

for (const [L, i] of list) {
  if (only == null && ROUTED.has(i)) {
    console.log(`  skip ${String(i + 1).padStart(2)}. ${L.name.padEnd(22)} covered by tests/routes.mjs`);
    continue;
  }
  let best = null;
  for (let s = 1; s <= 220; s++) {
    const r = play(L, s * 7919 + i);
    if (r.ok) { best = { ...r, seed: s }; break; }
    if (!best || r.t > best.t) best = r;
  }
  if (best.ok) {
    console.log(`  ok   ${String(i + 1).padStart(2)}. ${L.name.padEnd(22)} solved in ${best.t.toFixed(1)}s after ${best.deaths} deaths (seed ${best.seed})`);
  } else {
    fails++;
    console.log(`  FAIL ${String(i + 1).padStart(2)}. ${L.name.padEnd(22)} ${best.why}`);
  }
}

console.log(fails ? `\n${fails} level(s) the bot could not finish.` : `\nAll ${list.length} levels solvable.`);
process.exit(fails ? 1 : 0);
