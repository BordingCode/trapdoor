# Trapdoor

A short troll platformer, in the spirit of *Level Devil*: every level looks like a
harmless tutorial, and then it isn't. Walk to the door. The floor has other ideas.

Live: https://bordingcode.github.io/trapdoor/ · repo `BordingCode/trapdoor` (branch `main`)

## The design rule
**Every trap must be avoidable once you know it's there.** Traps re-arm on every retry, so
the first death is the joke and the second is on you. A trap that permanently blocks the
route is a bug — `tests/solve.mjs` exists to catch exactly that.

Infinite retries, instant respawn, no lives. The stakes are pride and the death counter.

## Layout
```
index.html · manifest.json · sw.js · .nojekyll
css/main.css
js/
  main.js              boot, screens, HUD, save flow — the only file that touches the DOM
  audio.js             procedural Web Audio SFX (no files)
  engine/  loop.js canvas.js input.js fx.js
  game/    world.js render.js levels.js save.js
tests/   structure.mjs routes.mjs solve.mjs all.sh
tools/   make_icons.py
```

- **world.js** is the whole game: tile grid, AABB platformer physics, hazards, movers and
  the trigger runtime. No DOM, no canvas — which is why node can play it in tests.
- **levels.js** is pure data: a 24x13 character grid plus a list of triggers. Adding a
  level means adding an entry, not writing code. The legend and the full action/condition
  table are documented at the top of that file.
- **render.js** draws world state and nothing else.

World is a fixed 24x13 tiles of 32px (768x416) — one screen per level, always fully
visible (`contain` fit, never cropped: a cropped trap would be unfair).

## Physics numbers the levels are designed against
Run 168px/s · jump 520 → ~93px high (2.9 tiles) and ~120px across · gravity 1450 ·
coyote 0.10s · jump buffer 0.13s. `tests/structure.mjs` asserts these, because level
geometry silently depends on them — changing `PHYS` can make hand-built jumps impossible.

## Testing
```
tests/all.sh          # structure + routes + solvability, ~1 min, no dependencies
node tests/solve.mjs 7   # just level 8, for debugging one level
```
`solve.mjs` runs a dumb bot through the real simulation to prove every level is
finishable. Level 23 needs patience the bot lacks (waiting for a moving platform), so it
has a hand-written route in `routes.mjs` instead.

In the browser: `window.__td` exposes `start(i)`, `state()`, `hold('right', true)`,
`world()`, `loop` (call `loop.stop()` to freeze a frame for a screenshot) and `win()`.

## Deploy
Static GitHub Pages. **Bump `CACHE` in `sw.js` on every shippable change**, and bump the
`?v=` on `css/main.css` / `js/main.js` in `index.html` when either changes — otherwise
players (and your own browser tests) keep running the old code.
