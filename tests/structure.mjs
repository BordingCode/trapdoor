// Cheap sanity checks on the level data and the physics constants. These catch the
// typos that turn a level into a soft-lock: a 23-character row, a missing door, a
// trigger action with a name the world doesn't understand.
import { World, PHYS } from '../js/game/world.js';
import { LEVELS, CHAPTERS, MAIN_LEVELS } from '../js/game/levels.js';
import { COLS, ROWS, TILE } from '../js/engine/canvas.js';

const ACTIONS = new Set(['set', 'spikes', 'crush', 'drop', 'dart', 'door', 'fakedoor', 'grav', 'ice', 'dark', 'acid', 'push', 'shake', 'say', 'sfx']);
const CONDS = new Set(['zone', 'stand', 'time', 'move', 'air', 'land', 'door', 'pastx', 'above']);

let fails = 0;
const bad = (msg) => { fails++; console.log('  FAIL ' + msg); };

// ---- level data
LEVELS.forEach((L, i) => {
  const tag = `${i + 1}. ${L.name}`;
  if (L.grid.length !== ROWS) bad(`${tag}: grid has ${L.grid.length} rows, expected ${ROWS}`);
  L.grid.forEach((row, y) => { if (row.length !== COLS) bad(`${tag}: row ${y} is ${row.length} chars, expected ${COLS}`); });
  const flat = L.grid.join('');
  if ((flat.match(/S/g) || []).length !== 1) bad(`${tag}: needs exactly one spawn`);
  if ((flat.match(/D/g) || []).length !== 1) bad(`${tag}: needs exactly one door`);
  if (!CHAPTERS[L.chapter]) bad(`${tag}: unknown chapter ${L.chapter}`);
  for (const c of flat) if (!'.#SD^v~o='.includes(c)) bad(`${tag}: unknown tile '${c}'`);

  (L.triggers || []).forEach((tr, ti) => {
    if (!CONDS.has(tr.on)) bad(`${tag}: trigger ${ti} has unknown condition '${tr.on}'`);
    if (tr.needs != null && !L.triggers[tr.needs]) bad(`${tag}: trigger ${ti} needs missing trigger ${tr.needs}`);
    if (tr.needs != null && tr.needs >= ti) bad(`${tag}: trigger ${ti} needs a later trigger — it can never fire`);
    if (tr.after != null && !(Number.isInteger(tr.after) && tr.after > 0)) bad(`${tag}: trigger ${ti} has after:${tr.after} — must be a death count of 1 or more`);
    for (const a of tr.do || []) if (!ACTIONS.has(a.t)) bad(`${tag}: trigger ${ti} has unknown action '${a.t}'`);
  });

  // the world must build, and the player must start somewhere legal
  const w = new World(L);
  if (!w.door) bad(`${tag}: no door after parsing`);
  if (w.solidsOverlapping(w.player).length) bad(`${tag}: spawn is inside a wall`);

  // a nerve sealed inside a wall, or sitting on a hazard, can never be taken
  if (L.bonus) {
    if (L.nerve) bad(`${tag}: bonus levels are the reward, they shouldn't carry a nerve`);
  } else {
    if (!L.nerve) bad(`${tag}: no nerve — every main level must hide one`);
    else {
      const [nx, ny] = L.nerve;
      if (nx < 0 || nx >= COLS || ny < 0 || ny >= ROWS) bad(`${tag}: nerve is outside the level`);
      else {
        if (w.isSolidTile(nx, ny)) bad(`${tag}: nerve at ${nx},${ny} is buried in a wall`);
        if ('^v~'.includes(w.tileAt(nx, ny))) bad(`${tag}: nerve at ${nx},${ny} sits inside a hazard`);
        if (w.nerve && w.hazardRects().some((h) => h.x < w.nerve.x + w.nerve.w && h.x + h.w > w.nerve.x && h.y < w.nerve.y + w.nerve.h && h.y + h.h > w.nerve.y)) {
          bad(`${tag}: nerve at ${nx},${ny} overlaps a starting hazard`);
        }
      }
    }
  }

  // the glimpse must never throw, whatever state the level is in
  try { w.truth(); } catch (e) { bad(`${tag}: truth() threw — ${e.message}`); }
});

// bonus levels: one per chapter, all after the main run
const EXPECT_MAIN = CHAPTERS.length * 8;   // every chapter is exactly eight levels long
if (MAIN_LEVELS !== EXPECT_MAIN) bad(`expected ${EXPECT_MAIN} main levels before the bonus block, got ${MAIN_LEVELS}`);
CHAPTERS.forEach((ch, ci) => {
  const n = LEVELS.filter((L) => L.chapter === ci && !L.bonus).length;
  if (n !== 8) bad(`chapter ${ci + 1} (${ch.name}) has ${n} main levels, expected 8`);
});
CHAPTERS.forEach((ch, ci) => {
  const n = LEVELS.filter((L) => L.bonus && L.chapter === ci).length;
  if (n !== 1) bad(`chapter ${ci + 1} (${ch.name}) has ${n} bonus levels, expected 1`);
});
if (LEVELS.slice(0, MAIN_LEVELS).some((L) => L.bonus)) bad('a bonus level is mixed into the main run — level indices in saves would shift');

// A nerve you can reach: it must be within one jump of somewhere you can stand.
// "Somewhere you can stand" includes surfaces the level BUILDS for you — platforms
// raised by a trigger, the top of a crusher or a falling block, and the world ceiling
// on levels that flip gravity.
const JUMP_H = 96, JUMP_W = 128;
LEVELS.forEach((L, i) => {
  if (!L.nerve) return;
  const w = new World(L);
  const n = w.nerve;
  if (!n) return;

  const surfaces = [];   // [tileX, tileY] of anything solid enough to launch from
  for (let ty = 0; ty < ROWS; ty++) for (let tx = 0; tx < COLS; tx++) {
    if (w.isSolidTile(tx, ty)) surfaces.push([tx, ty]);
  }
  let flips = false;
  for (const tr of L.triggers || []) for (const a of tr.do || []) {
    if (a.t === 'set' && a.c !== '.') {
      for (let y = a.y; y < a.y + (a.h || 1); y++) for (let x = a.x; x < a.x + (a.w || 1); x++) surfaces.push([x, y]);
    } else if (a.t === 'crush' || a.t === 'drop') {
      // both where it appears and where it comes to rest — you can ride either
      for (const [ox, oy] of [[a.x, a.y], [a.sx ?? a.x, a.sy ?? a.y]]) {
        for (let x = ox; x < ox + (a.w || 1); x++) surfaces.push([x, oy]);
      }
    } else if (a.t === 'grav' && a.v < 0) flips = true;
  }
  if (flips) for (let tx = 0; tx < COLS; tx++) surfaces.push([tx, -1]);   // the ceiling becomes the floor

  const reachable = surfaces.some(([tx, ty]) => {
    if (Math.abs((n.x + n.w / 2) - (tx * TILE + TILE / 2)) > JUMP_W) return false;
    // standing on top of it, or clinging under it once gravity is inverted
    return [ty * TILE - PHYS.playerH, (ty + 1) * TILE].some(
      (sy) => Math.abs((n.y + n.h / 2) - (sy + PHYS.playerH / 2)) <= JUMP_H);
  });
  if (!reachable) bad(`${i + 1}. ${L.name}: nerve at ${L.nerve} is not within a jump of any surface`);
});

// ---- physics: the numbers levels are designed against
const w = new World(LEVELS[0]);
let apex = w.player.y, prevY = w.player.y;
for (let i = 0; i < 200; i++) {
  w.step(1 / 60, { left: false, right: false, jumpHeld: i < 40, jumpPressed: i === 0 });
  apex = Math.min(apex, w.player.y);
  prevY = w.player.y;
}
const height = 326 - apex;
if (height < 80 || height > 105) bad(`jump height is ${height.toFixed(0)}px — levels assume ~93px (about 2.9 tiles)`);

const w2 = new World(LEVELS[0]);
let maxV = 0;
for (let i = 0; i < 400; i++) {
  w2.step(1 / 60, { left: false, right: true, jumpHeld: i % 50 < 25, jumpPressed: i % 50 === 0 });
  maxV = Math.max(maxV, Math.abs(w2.player.vx));
}
if (maxV > PHYS.runSpeed + 1) bad(`run speed reached ${maxV.toFixed(0)}px/s while jumping — must stay capped at ${PHYS.runSpeed}`);

// coyote time: you can still jump a moment after walking off a ledge
const w3 = new World(LEVELS[0]);
w3.setTile(11, 11, '.'); w3.setTile(11, 12, '.');
w3.player.x = 10 * TILE; w3.player.vx = 0;
let jumped = false;
for (let i = 0; i < 30; i++) {
  const justLeft = !w3.player.grounded && w3.player.coyote > 0 && !jumped;
  w3.step(1 / 60, { left: false, right: true, jumpHeld: justLeft, jumpPressed: justLeft });
  if (justLeft) jumped = true;
}
if (!jumped) bad('coyote time never engaged — walking off a ledge should still allow a jump');

console.log(fails ? `\n${fails} structural problem(s).` : `\nStructure OK: ${LEVELS.length} levels, ${CHAPTERS.length} chapters, physics within spec.`);
process.exit(fails ? 1 : 0);
