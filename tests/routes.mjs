// Hand-written routes for the levels the generic bot in solve.mjs is too clumsy for
// (riding moving platforms needs patience, which the bot does not have). These play the
// real simulation and assert the level can actually be finished.
import { World } from '../js/game/world.js';
import { LEVELS } from '../js/game/levels.js';

const STEP = 1 / 60;

function run(levelIndex, policy, maxTime = 30, holdFrames = 10) {
  const w = new World(LEVELS[levelIndex]);
  let t = 0, jf = 0, held = false, deaths = 0;
  while (t < maxTime) {
    const { dir, jump } = policy(w);
    if (jump && w.player.grounded && jf <= 0) jf = holdFrames;
    const jn = jf > 0;
    if (jf > 0) jf--;
    w.step(STEP, { left: dir < 0, right: dir > 0, jumpHeld: jn, jumpPressed: jn && !held });
    held = jn;
    w.events.length = 0;
    t += STEP;
    if (w.state === 'won') return { ok: true, t, deaths, nerve: w.holdingNerve() };
    if (w.state === 'dead') { deaths++; w.reset(); jf = 0; held = false; }
  }
  return { ok: false, t, deaths, nerve: false };
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

// "Gauntlet" taking the nerve: clear the spike bank, hold back while the block falls
// rather than running under it, hop the block once it has landed, then jump for the
// nerve — which drops you under the descending crusher and spends the margin you had.
function gauntletPolicy(w) {
  const p = w.player;
  const x = p.x;
  if (x >= 228 && x <= 248 && p.grounded) return { dir: 1, jump: true };   // over the spikes
  const falling = w.movers.some((m) => m.grav && m.delay <= 0);
  if (falling && x > 395) return { dir: 0, jump: false };                   // let it land
  if (x >= 400 && x <= 428 && p.grounded && !falling) return { dir: 1, jump: true }; // hop it
  if (x >= 528 && x <= 548 && p.grounded) return { dir: 1, jump: true };    // the nerve
  return { dir: x < 700 ? 1 : 0, jump: false };
}

// "Rising" taking the nerve: run the wrong way along the floor to fetch it while the acid
// comes up, then get back and climb the staircase before the ground stops existing.
// Each jump starts well clear of the next platform's edge — jump too close and you clip
// its underside instead of landing on it.
const STAIRS = [[145, 288], [240, 224], [336, 160], [432, 96]];  // [jump-from x, surface top]
function risingPolicy(w) {
  const p = w.player;
  const n = w.nerve;
  if (n && !n.got) return { dir: 1, jump: false };                 // fetch it first
  const feet = p.y + p.h;
  let idx = STAIRS.findIndex(([, top]) => Math.abs(feet - top) < 3);
  if (feet > 340) idx = -1;                                        // still on the ground
  const next = STAIRS[idx + 1];
  if (!next) return { dir: p.x < 640 ? 1 : 0, jump: false };        // top ledge: to the door
  const from = next[0];
  if (!p.grounded) return { dir: 1, jump: false };                  // airborne: commit forward
  if (p.x < from - 4) return { dir: 1, jump: false };
  if (p.x > from + 14) return { dir: -1, jump: false };
  return { dir: 1, jump: true };
}

// "The Long Climb": four landings, each reachable only from a fixed launch point, and a
// nerve hanging in the dart lane above the third one. Same shape as Rising — the bot in
// solve.mjs parks under the door and jumps on the spot, because it cannot plan a detour.
const CLIMB = [[112, 288], [272, 224], [432, 160], [560, 96]];  // [jump-from x, top it reaches]
function longClimbPolicy(w) {
  const p = w.player;
  const feet = p.y + p.h;
  let idx = CLIMB.findIndex(([, top]) => Math.abs(feet - top) < 3);
  if (feet > 340) idx = -1;                                      // still on the ground
  const n = w.nerve;
  if (n && !n.got && idx === 2) {                                // straight up off the third landing
    if (!p.grounded) return { dir: 0, jump: false };
    if (p.x < 508) return { dir: 1, jump: false };
    if (p.x > 522) return { dir: -1, jump: false };
    return { dir: 0, jump: true };
  }
  const next = CLIMB[idx + 1];
  if (!next) return { dir: p.x < 640 ? 1 : 0, jump: false };      // top landing: to the door
  const from = next[0];
  if (!p.grounded) return { dir: 1, jump: false };
  if (p.x < from - 4) return { dir: 1, jump: false };
  if (p.x > from + 14) return { dir: -1, jump: false };
  return { dir: 1, jump: true };
}

// "Elevator": fetch the nerve from the far end of the blade's lane, come back to the pad,
// let the floor carry you up, and step off onto the ledge. The bot in solve.mjs never
// rides anything — it walks under the door and jumps on the spot.
function elevatorPolicy(w) {
  const p = w.player;
  const feet = p.y + p.h;
  const n = w.nerve;
  const needNerve = !!(n && !n.got);
  const lifts = w.movers.filter((m) => m.solid).sort((a, b) => b.y - a.y);
  const onLift = lifts.find((m) => Math.abs(feet - m.y) < 4 && p.x + p.w > m.x && p.x < m.x + m.w);
  const blade = w.movers.find((m) => m.kill);
  let goal;
  if (onLift && onLift.y > 100) goal = needNerve ? 690 : null;   // riding: hold still, unless
  else if (feet < 200) goal = 640;                               // we still owe the detour below
  else goal = needNerve ? 690 : 490;                             // floor: the nerve, then the pad
  if (goal == null) return { dir: 0, jump: false };
  const dir = Math.abs(p.x - goal) < 8 ? 0 : Math.sign(goal - p.x);
  // step off the top only from the very edge — the ledge is a tile away, not adjacent
  let jump = !!(onLift && onLift.y <= 100 && p.x + p.w > onLift.x + onLift.w - 10);
  if (blade && p.grounded && feet > 340) {                       // hop the blade, either way
    const dx = (blade.x + blade.w / 2) - (p.x + p.w / 2);
    if (Math.abs(dx) < 95 && Math.sign(dx) !== Math.sign(blade.vx)) jump = true;
  }
  return { dir, jump };
}

const cases = [
  { i: 22, name: 'Nowhere To Stand', requireNerve: true, policy: platformPolicy },
  { i: 18, name: 'Gauntlet (with nerve)', requireNerve: true, policy: gauntletPolicy },
  { i: 14, name: 'Rising (with nerve)', requireNerve: true, policy: risingPolicy },
  { i: 29, name: 'The Long Climb', requireNerve: true, policy: longClimbPolicy },
  { i: 38, name: 'Elevator', requireNerve: true, policy: elevatorPolicy },
];

let fails = 0;
for (const c of cases) {
  const r = run(c.i, c.policy, 30, c.requireNerve ? 22 : 10);
  const nerveOk = !c.requireNerve || r.nerve;
  if (r.ok && nerveOk) {
    console.log(`  ok   ${c.i + 1}. ${c.name} — routed in ${r.t.toFixed(1)}s (${r.deaths} deaths)${c.requireNerve ? ' ◆ nerve taken' : ''}`);
  } else {
    fails++;
    console.log(`  FAIL ${c.i + 1}. ${c.name} — ${!r.ok ? 'route did not reach the door' : 'reached the door but missed the nerve'}`);
  }
}
console.log(fails ? `\n${fails} route(s) failed.` : `\nAll ${cases.length} route(s) reach the door.`);
process.exit(fails ? 1 : 0);
