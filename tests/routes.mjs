// Hand-written routes for the levels the generic bot in solve.mjs is too clumsy for
// (riding moving platforms needs patience, which the bot does not have). These play the
// real simulation and assert the level can actually be finished.
import { World } from '../js/game/world.js';
import { LEVELS } from '../js/game/levels.js';

const STEP = 1 / 60;

function run(levelIndex, policy, maxTime = 30) {
  const w = new World(LEVELS[levelIndex]);
  let t = 0, jf = 0, held = false, deaths = 0;
  while (t < maxTime) {
    const { dir, jump } = policy(w);
    if (jump && w.player.grounded && jf <= 0) jf = 10;
    const jn = jf > 0;
    if (jf > 0) jf--;
    w.step(STEP, { left: dir < 0, right: dir > 0, jumpHeld: jn, jumpPressed: jn && !held });
    held = jn;
    w.events.length = 0;
    t += STEP;
    if (w.state === 'won') return { ok: true, t, deaths };
    if (w.state === 'dead') { deaths++; w.reset(); jf = 0; held = false; }
  }
  return { ok: false, t, deaths };
}

// "Nowhere To Stand": wait at the lip, board the platform on its way back, transfer when
// the two platforms are adjacent, step off onto the far ledge.
function platformPolicy(w) {
  const p = w.player;
  const ms = [...w.movers].sort((a, b) => a.x - b.x);
  const [A, B] = ms;
  if (!A || !B) return { dir: 1, jump: false };
  const onA = p.y + p.h <= A.y + 2 && p.x + p.w > A.x && p.x < A.x + A.w;
  const onB = p.y + p.h <= B.y + 2 && p.x + p.w > B.x && p.x < B.x + B.w;
  if (onB) {
    if (B.x + B.w > 596) return { dir: 1, jump: true };
    return { dir: p.x < B.x + B.w - 26 ? 1 : 0, jump: false };
  }
  if (onA) {
    const gap = B.x - (A.x + A.w);
    if (gap < 30 && B.vx <= 0 && p.x + p.w > A.x + A.w - 40) return { dir: 1, jump: true };
    return { dir: p.x < A.x + A.w - 34 ? 1 : 0, jump: false };
  }
  if (p.x < 120) {
    if (A.vx <= 0 && A.x < 160) return { dir: 1, jump: true };
    return { dir: p.x < 100 ? 1 : 0, jump: false };
  }
  return { dir: 1, jump: false };
}

const cases = [
  { i: 22, name: 'Nowhere To Stand', policy: platformPolicy },
];

let fails = 0;
for (const c of cases) {
  const r = run(c.i, c.policy);
  if (r.ok) console.log(`  ok   ${c.i + 1}. ${c.name} — routed in ${r.t.toFixed(1)}s (${r.deaths} deaths)`);
  else { fails++; console.log(`  FAIL ${c.i + 1}. ${c.name} — route did not reach the door`); }
}
console.log(fails ? `\n${fails} route(s) failed.` : `\nAll ${cases.length} route(s) reach the door.`);
process.exit(fails ? 1 : 0);
