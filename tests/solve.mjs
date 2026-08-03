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
function play(level, seed, maxTime = 34, maxDeaths = 30, greedy = false, arm = 0) {
  const rnd = mulberry32(seed);
  const w = new World(level);
  // `arm` pre-loads the death counter, so an `after:` level is played at its meanest —
  // the state a real player reaches by dying, and the one that has to stay winnable
  if (arm) w.deaths = arm;
  let t = 0, deaths = 0;
  let jumpFrames = 0, waitFor = 0, held = false;
  const trace = [];

  while (t < maxTime) {
    const p = w.player;
    // greedy runs detour for the nerve first, then head for the door
    const d = (greedy && w.nerve && !w.nerve.got) ? w.nerve : w.door;
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

    // the nerve only counts if it survived to the door with you
    if (w.state === 'won') return { ok: true, t, deaths, trace, nerve: w.holdingNerve() };
    if (w.state === 'dead') {
      deaths++;
      if (deaths > maxDeaths) return { ok: false, t, deaths, nerve: false, why: 'died ' + deaths + 'x (last: ' + w.deathCause + ')' };
      w.reset();
      jumpFrames = 0; held = false; waitFor = 0;
    }
  }
  return { ok: false, t, deaths, nerve: false, why: 'ran out of time (' + maxTime + 's)' };
}

// Levels whose solution needs patience the bot doesn't have (waiting for a moving
// platform to come back). They're covered by hand-written routes in routes.mjs instead.
const ROUTED = new Set([22, 29, 38]);
// levels whose NERVE needs a deliberate line (the bot won't find it) — routes.mjs proves these
const ROUTED_NERVE = new Set([14, 18, 29, 38]);

const only = process.argv[2] != null ? Number(process.argv[2]) : null;
const list = only != null ? [[LEVELS[only], only]] : LEVELS.map((L, i) => [L, i]);
let fails = 0, nerved = 0;
const unreached = [];

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
  if (!best.ok) {
    fails++;
    console.log(`  FAIL ${String(i + 1).padStart(2)}. ${L.name.padEnd(22)} ${best.why}`);
    continue;
  }
  // second pass: can it also be finished WITH the nerve? The nerve sits off the safe
  // line on purpose, so a bot failure here is a warning to check by hand, not a bug.
  let nerveRun = null;
  if (L.nerve) {
    for (let s = 1; s <= 160; s++) {
      const r = play(L, s * 6961 + i, 34, 30, true);
      if (r.ok && r.nerve) { nerveRun = { ...r, seed: s }; break; }
    }
    if (nerveRun) nerved++; else if (!ROUTED_NERVE.has(i)) unreached.push(`${i + 1}. ${L.name}`);
  }
  // a level that rearms as it kills you has to be beatable once it is done rearming
  const maxAfter = Math.max(0, ...(L.triggers || []).map((tr) => tr.after || 0));
  let armed = null;
  if (maxAfter > 0) {
    for (let s = 1; s <= 220; s++) {
      const r = play(L, s * 4451 + i, 34, 30, false, maxAfter);
      if (r.ok) { armed = r; break; }
    }
    if (!armed) {
      fails++;
      console.log(`  FAIL ${String(i + 1).padStart(2)}. ${L.name.padEnd(22)} unbeatable once every after: trap is armed (${maxAfter} deaths in)`);
      continue;
    }
  }
  const armTag = armed ? `  ⚑ fully armed in ${armed.t.toFixed(1)}s` : '';
  const tag = !L.nerve ? ''
    : (nerveRun ? `  ◆ +nerve in ${nerveRun.t.toFixed(1)}s`
      : (ROUTED_NERVE.has(i) ? '  ◆ nerve routed in routes.mjs' : '  ◆ nerve NOT taken by bot'));
  console.log(`  ok   ${String(i + 1).padStart(2)}. ${L.name.padEnd(22)} solved in ${best.t.toFixed(1)}s after ${best.deaths} deaths (seed ${best.seed})${tag}${armTag}`);
}

const withNerve = list.filter(([L, i]) => L.nerve && !(only == null && (ROUTED.has(i) || ROUTED_NERVE.has(i)))).length;
console.log(fails ? `\n${fails} level(s) the bot could not finish.` : `\nAll levels solvable.`);
console.log(`Nerve taken by the bot on ${nerved}/${withNerve} levels.` + (unreached.length ? ' Check by hand: ' + unreached.join(', ') : ''));
process.exit(fails ? 1 : 0);
