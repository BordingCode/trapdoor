// Cheap sanity checks on the level data and the physics constants. These catch the
// typos that turn a level into a soft-lock: a 23-character row, a missing door, a
// trigger action with a name the world doesn't understand.
import { World, PHYS } from '../js/game/world.js';
import { LEVELS, CHAPTERS } from '../js/game/levels.js';
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
    for (const a of tr.do || []) if (!ACTIONS.has(a.t)) bad(`${tag}: trigger ${ti} has unknown action '${a.t}'`);
  });

  // the world must build, and the player must start somewhere legal
  const w = new World(L);
  if (!w.door) bad(`${tag}: no door after parsing`);
  if (w.solidsOverlapping(w.player).length) bad(`${tag}: spawn is inside a wall`);
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
