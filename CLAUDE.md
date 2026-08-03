# Trapdoor

A short troll platformer, in the spirit of *Level Devil*: every level looks like a
harmless tutorial, and then it isn't. Walk to the door. The floor has other ideas.
40 levels in five chapters, plus one nerve-locked bonus level per chapter.

Live: https://bordingcode.github.io/trapdoor/ · repo `BordingCode/trapdoor` (branch `main`)

## The design rule
**Every trap must be avoidable once you know it's there.** Traps re-arm on every retry, so
the first death is the joke and the second is on you. A trap that permanently blocks the
route is a bug — `tests/solve.mjs` exists to catch exactly that.

Infinite retries, instant respawn, no lives. The stakes are pride and the death counter.

## Nerve and the glimpse (the game's one real decision)
Walking to the door is reaction. The **nerve** is the choice.

- Each main level hides one **nerve** (`nerve: [tx, ty]` in the level data), always placed
  where the safe route does not go — over the trapdoor, at dart height, inside the
  crusher's corridor.
- **The door is the bank.** Picking a nerve up only means you're *carrying* it; die and it
  goes back where it was. So the grab isn't the challenge — surviving the rest of the level
  afterwards is. `World.holdingNerve()` is the carried state; `nerveBanked` (passed in from
  the save) is the permanent one, and `reset()` respawns the nerve whenever it isn't banked.
  `finishLevel()` in main.js is the only place that commits it.
- Spend one for a **glimpse**: 1.5s in which the level draws everything it is still
  holding back. This only works because traps are data — `World.truth()` reads the
  *un-fired* triggers and describes them as shapes.
- You start with none. That is deliberate: a first encounter with a level must stay a
  genuine ambush, so the economy keeps you broke early and informed later.
- Collecting a chapter's 8 nerves opens its **bonus level**. Bonus levels are appended at
  the END of the array (currently 40–44) so the main run stays contiguous — which means
  adding a chapter *shifts them*, and every per-level record is keyed by index. `save.js`
  writes the layout it used (`bonusAt`) and remaps those rows on load; `unlocked` is
  derived from `cleared` rather than trusted. See rule 7 in `tests/rules.mjs`.
- `The Whole Truth` sets `liar: true` — its glimpse hides one real trap and invents
  fake ones. The last lie the game tells you.

If you add a level, it needs a nerve; `tests/structure.mjs` fails without one, and also
rejects a nerve buried in a wall, sitting on a hazard, or out of jump reach of any
surface — including surfaces the level *builds* (raised platforms, crusher tops, and the
ceiling you land on when gravity flips).

## Layout
```
index.html · manifest.json · sw.js · .nojekyll
css/main.css
js/
  main.js              boot, screens, HUD, save flow — the only file that touches the DOM
  audio.js             procedural Web Audio SFX (no files)
  engine/  loop.js canvas.js input.js fx.js
  game/    world.js render.js levels.js save.js
tests/   structure.mjs rules.mjs routes.mjs solve.mjs all.sh
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

## A door in flight cannot be entered
`checkDoor()` bails out while `door.tox != null`. Without that you win by standing in the
path of a fleeing door and letting it hit you — and whether it connects depends on how far
the door travels per frame, so short hops were exploitable and long ones tunnelled past.
`tests/rules.mjs` guards this both in isolation and end-to-end (standing still must beat no
level that has a moving door). Note that *Sharp Enough* was only ever "solved" by that
exploit, which hid how hard its real route was — fixing the rule is what exposed it.

## The trap vocabulary added in chapters 4-5
The first three chapters had used up the original actions, so these came with *Bad Faith*
and *The Grudge* — all still pure data:

- `spikes hold: s` — the bank pulls back in after s seconds. A rhythm to read, not a wall.
- `crush kill: true` — a blade. Pair it with `solid: false`: you must not be able to ride
  what cuts you. `crush gone: s` dissolves it s seconds after it arrives, which is what
  makes *Elevator* repeatable — a lift parked at the top crushes the next ride against it.
- `after: n` on a trigger — it only arms once the level has killed you n times *this
  visit* (`World.deaths` survives `reset()`, so leaving the level forgets the grudge).
  `solve.mjs` proves such a level is still beatable with every `after` trap armed.
- `fakedoor` — the door is a prop. It renders dimmed, and a glimpse crosses it out.
- A solid mover spawned overlapping the player **ejects them sideways** rather than
  lifting them (`resolveAxis` runs before `pushPlayer`). *Elevator*'s lift therefore
  starts one row inside the floor.

## Physics numbers the levels are designed against
Run 168px/s · jump 520 → ~93px high (2.9 tiles) and ~120px across · gravity 1450 ·
coyote 0.10s · jump buffer 0.13s. `tests/structure.mjs` asserts these, because level
geometry silently depends on them — changing `PHYS` can make hand-built jumps impossible.

## Testing
```
tests/all.sh          # structure + rules + routes + solvability, ~2 min, no dependencies
node tests/solve.mjs 7   # just level 8, for debugging one level
```
`solve.mjs` runs a dumb bot through the real simulation to prove every level is
finishable, then runs each again *greedily* to prove the nerve can be taken **and carried
to the door alive** — that's the bar, so a nerve you can only reach by dying is a failure.
Five levels need a deliberate line the bot won't find, so they have hand-written routes in
`routes.mjs` — keep the `ROUTED` / `ROUTED_NERVE` sets in `solve.mjs` in step with them.
The bot cannot plan a *detour*: on any level where getting up means going somewhere else
first (Rising, The Long Climb, Elevator) it walks under the door and jumps on the spot
until the clock runs out. That symptom always means "write a route", not "the level is
broken".

Watch out when placing a nerve on a timed level: it has to be affordable *round trip*.
Rising's spot was only reachable if dying still banked it, so it moved (and its acid eased
from 22 to 16px/s) when the carry rule landed.

In the browser: `window.__td` exposes `start(i)`, `state()`, `hold('right', true)`,
`world()`, `loop` (call `loop.stop()` to freeze a frame for a screenshot) and `win()`.
`world().truth()` returns what a glimpse would show.

## Deploy
Static GitHub Pages. **Bump `CACHE` in `sw.js` on every shippable change**, and bump the
`?v=` on `css/main.css` / `js/main.js` in `index.html` when either changes — otherwise
players (and your own browser tests) keep running the old code.
