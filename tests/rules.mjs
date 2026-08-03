// Game-rule invariants: things that must be true of the simulation regardless of level
// data. These are the rules you can't see by reading a level file.
import { World, overlap } from '../js/game/world.js';
import { LEVELS } from '../js/game/levels.js';
import { TILE } from '../js/engine/canvas.js';

const STEP = 1 / 60;
let fails = 0;
const bad = (msg) => { fails++; console.log('  FAIL ' + msg); };
const ok = (msg) => console.log('  ok   ' + msg);

// Isolate the door rules on a level with no door triggers of its own, so the level can't
// race the test by moving its door again mid-assertion.
const PLAIN = LEVELS[0];   // Welcome: flat floor, no hazards, no door triggers
const idle = { left: false, right: false, jumpHeld: false, jumpPressed: false };

// ---- 1. a door in flight cannot be entered ------------------------------------
// Standing in the path of a fleeing door must not win the level. It used to: the door
// swept through you and the overlap counted as reaching it — and whether it connected
// depended on how far the door travelled per frame, so it was a frame-timing lottery.
{
  const w = new World(PLAIN);
  const fromX = w.door.x;
  w.act({ t: 'door', x: 14, y: 10 });                 // a short hop, so it can't tunnel past
  if (w.door.tox == null) bad('door-in-flight: the test door never started moving');
  w.player.x = (fromX + w.door.tox) / 2;              // park in the middle of its path
  w.player.y = 326;
  let wonInFlight = false, everOverlapped = false;
  for (let i = 0; i < 90 && w.door.tox != null; i++) {
    w.step(STEP, idle);
    w.events.length = 0;
    if (overlap(w.player, w.door)) everOverlapped = true;
    if (w.state === 'won') { wonInFlight = true; break; }
  }
  if (!everOverlapped) bad('door-in-flight: the door never actually passed through the player — test proves nothing');
  else if (wonInFlight) bad('door-in-flight: won the level by standing in a moving door');
  else ok('a door in flight passes through you without opening');
}

// ---- 2. …but a door that has come to rest still counts -------------------------
{
  const w = new World(PLAIN);
  if (w.nerve) w.nerve.got = true;                    // the door wants that first, see rule 8
  w.act({ t: 'door', x: 14, y: 10 });
  for (let i = 0; i < 120 && w.door.tox != null; i++) { w.step(STEP, idle); w.events.length = 0; }
  if (w.door.tox != null) { bad('door landing: the door never finished its flight'); }
  else {
    w.player.x = w.door.x + 2;
    w.player.y = w.door.y + 20;
    w.step(STEP, idle);
    if (w.state !== 'won') bad('door landing: standing in a settled door did not win');
    else ok('a door that has come to rest still opens');
  }
}

// ---- 8. the door does not open without the nerve -------------------------------
// The rule the whole game now hangs on: reaching the door is not finishing the level.
// Checked on every level, because a level whose door opened early would be a free pass.
{
  const cheated = [];
  for (let i = 0; i < LEVELS.length; i++) {
    const w = new World(LEVELS[i]);
    if (!w.nerve) continue;                            // bonus levels carry none by design
    w.player.x = w.door.x + 2;
    w.player.y = w.door.y + 20;
    for (let k = 0; k < 20; k++) { w.step(STEP, idle); w.events.length = 0; }
    if (w.state === 'won') cheated.push(`${i + 1}. ${LEVELS[i].name}`);
  }
  if (cheated.length) bad('the door opened with no nerve on: ' + cheated.join(', '));
  else ok('no door opens for someone who is not carrying the nerve');

  // …and a level whose nerve is already banked must still be replayable
  const L = LEVELS.find((x) => x.nerve);
  const w = new World(L, { nerveBanked: true });
  w.player.x = w.door.x + 2;
  w.player.y = w.door.y + 20;
  w.step(STEP, idle);
  if (w.state !== 'won') bad('a level with its nerve already banked cannot be finished again');
  else ok('a nerve you have already banked keeps the door open on a replay');
}

// ---- 3. standing still must never finish a level with a fleeing door -----------
// The end-to-end version of rule 1, across every level whose door moves.
{
  const movers = LEVELS.map((L, i) => [L, i]).filter(([L]) =>
    (L.triggers || []).some((tr) => (tr.do || []).some((a) => a.t === 'door')));
  let cheated = [];
  for (const [L, i] of movers) {
    const w = new World(L);
    let t = 0, sawFlight = false;
    while (t < 10) {
      // walk right until the door bolts, then stand perfectly still
      const walk = !sawFlight && w.door.tox == null;
      if (w.door.tox != null) sawFlight = true;
      w.step(STEP, { left: false, right: walk, jumpHeld: false, jumpPressed: false });
      w.events.length = 0;
      t += STEP;
      if (w.state === 'won') { cheated.push(`${i + 1}. ${L.name}`); break; }
      if (w.state === 'dead') { w.reset(); sawFlight = false; }
    }
  }
  if (cheated.length) bad('standing still beat these levels with a fleeing door: ' + cheated.join(', '));
  else ok(`standing still beats none of the ${movers.length} levels with a moving door`);
}

// ---- 4. the nerve resets on death, and only banks at the door ------------------
{
  const L = LEVELS.find((x) => x.nerve);
  const w = new World(L);
  w.player.x = w.nerve.x; w.player.y = w.nerve.y;
  w.step(STEP, { left: false, right: false, jumpHeld: false, jumpPressed: false });
  w.events.length = 0;
  if (!w.holdingNerve()) bad('nerve: touching it did not pick it up');
  if (w.nerveBanked) bad('nerve: touching it banked it immediately — it must bank at the door');
  w.kill('spike');
  w.reset();
  if (!w.nerve || w.nerve.got) bad('nerve: it did not go back on the level after a death');
  else ok('the nerve is dropped on death and put back where it was');
}

// ---- 5. hazards never overlap the spawn ---------------------------------------
// You must always get at least one frame before the level starts cheating.
{
  const unfair = [];
  for (let i = 0; i < LEVELS.length; i++) {
    const w = new World(LEVELS[i]);
    const box = { x: w.player.x + 2, y: w.player.y + 2, w: w.player.w - 4, h: w.player.h - 4 };
    if (w.hazardRects().some((h) => overlap(box, h))) unfair.push(`${i + 1}. ${LEVELS[i].name}`);
  }
  if (unfair.length) bad('spawn sits on a hazard: ' + unfair.join(', '));
  else ok('no level spawns you inside something that kills you');
}

// ---- 6. a glimpse costs exactly one use and expires ----------------------------
{
  const w = new World(LEVELS[2]);
  if (!w.useGlimpse()) bad('glimpse: could not start one');
  if (w.useGlimpse()) bad('glimpse: started a second one while the first was running');
  let t = 0;
  while (w.glimpse > 0 && t < 5) { w.step(STEP, { left: false, right: false, jumpHeld: false, jumpPressed: false }); w.events.length = 0; t += STEP; }
  if (w.glimpse > 0) bad('glimpse: never expired');
  else ok(`a glimpse runs once and expires (${t.toFixed(2)}s)`);
}

// ---- 7. an old save survives a new chapter --------------------------------------
// Bonus levels sit at the end of the array, so adding a chapter shifts them — and every
// record is keyed by level index. A save written under the old layout must come back with
// its bonus progress attached to the same LEVELS, not to whatever now sits at index 24.
{
  const store = new Map();
  globalThis.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
  };
  const { load } = await import('../js/game/save.js');
  const bonusNow = LEVELS.map((L, i) => (L.bonus ? i : -1)).filter((i) => i >= 0);
  const legacy = {                                  // 27 levels, bonus at 24/25/26
    unlocked: 28, cleared: [], deaths: { 24: 9 }, best: { 24: 12.5 }, total: 40,
    nerves: { 0: true, 24: true }, nerve: 1, bonusSeen: { 0: true },
  };
  for (let i = 0; i < 25; i++) legacy.cleared[i] = true;
  store.set('trapdoor_save_v1', JSON.stringify(legacy));
  const s = load();
  if (s.deaths[bonusNow[0]] !== 9 || s.best[bonusNow[0]] !== 12.5 || !s.nerves[bonusNow[0]]) {
    bad(`save migration: bonus level 1 lost its record moving 24 -> ${bonusNow[0]}`);
  } else if (s.deaths[24] != null || s.nerves[24]) {
    bad('save migration: the new level at index 24 inherited the old bonus level\'s record');
  } else if (s.unlocked !== 25) {
    bad(`save migration: unlocked came back as ${s.unlocked}, expected 25 (24 main levels cleared)`);
  } else if (!s.nerves[0]) {
    bad('save migration: a main-run nerve was lost');
  } else ok(`an old save keeps its bonus progress (24 -> ${bonusNow[0]}) and unlocks nothing free`);
  delete globalThis.localStorage;
}

console.log(fails ? `\n${fails} rule(s) broken.` : `\nAll rules hold.`);
process.exit(fails ? 1 : 0);
