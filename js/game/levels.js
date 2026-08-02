// The levels. Each one is 24x13 tiles of deliberately boring geometry plus a list of
// triggers — the boring part is the setup, the triggers are the punchline.
//
// Grid legend:
//   .  empty        #  solid          S  spawn        D  door (this tile is its FOOT)
//   ^  floor spike  v  ceiling spike  ~  acid
//   o  looks solid, crumbles 0.3s after you stand on it
//   =  looks solid, isn't solid at all
//
// Trigger  { on, ...cond, delay?, once?, every?, needs?, do:[actions] }
//   on: zone(x,y,w,h) | stand(x,y,w) | pastx(x) | above(y) | time(s) | move | air | land | door(d)
// Actions  (each may carry d: extra delay in seconds)
//   set(x,y,w,h,c) spikes(x,y,w,h,from) crush(x,y,w,h,vx,vy,sx,sy,bounce) drop(x,y,w,h)
//   dart(x,y,vx) door(x,y) grav(v) ice(v) dark(v) acid(y,from,speed) push(vx,vy)
//   shake(mag) say(text) sfx(name)

const E = '........................';
const F = '########################';
const SD = '..S..................D..';

export const LEVELS = [
  // ---------------------------------------------------------------- CHAPTER 1
  {
    name: 'Welcome',
    chapter: 0,
    nerve: [12, 8],
    grid: [E, E, E, E, E, E, E, E, E, E, SD, F, F],
    triggers: [
      { on: 'time', s: 0.5, do: [{ t: 'say', text: 'Get to the door. That is the whole game.', life: 3.4 }] },
      { on: 'door', d: 2.2, do: [{ t: 'say', text: 'See? Nothing to worry about.', life: 2.4 }] },
    ],
  },
  {
    name: 'Trapdoor',
    chapter: 0,
    nerve: [10, 9],
    grid: [E, E, E, E, E, E, E, E, E, E, SD, F, F],
    triggers: [
      { on: 'stand', x: 10, y: 11, w: 2, do: [
        { t: 'set', x: 10, y: 11, w: 2, h: 2, c: '.' },
        { t: 'shake', mag: 5 },
        { t: 'say', text: 'Whoops.', life: 2 },
      ] },
    ],
  },
  {
    name: 'Spike Strip',
    chapter: 0,
    nerve: [11, 9],
    grid: [E, E, E, E, E, E, E, E, E, E, SD, F, F],
    triggers: [
      { on: 'pastx', x: 9, do: [
        { t: 'spikes', x: 11, y: 10, w: 2, h: 1, from: 'up' },
        { t: 'shake', mag: 4 },
        { t: 'say', text: 'Mind the step.', life: 2 },
      ] },
    ],
  },
  {
    name: 'The Squeeze',
    chapter: 0,
    nerve: [11, 8],
    grid: [E, E, E, E, E, E, E, E, E, E, SD, F, F],
    triggers: [
      { on: 'pastx', x: 6, do: [
        { t: 'crush', x: 9, y: 0, w: 6, h: 6, vy: 62, sy: 5 },
        { t: 'shake', mag: 5 },
        { t: 'say', text: 'Do hurry.', life: 2.4 },
      ] },
    ],
  },
  {
    name: 'Fake Floor',
    chapter: 0,
    nerve: [10, 8],
    grid: [
      E, E, E, E, E, E, E, E, E,
      '.......###==#####.......',
      SD,
      '########.........#######',
      '########.........#######',
    ],
    triggers: [
      { on: 'time', s: 0.5, do: [{ t: 'say', text: 'The bridge holds. Obviously.', life: 3 }] },
      { on: 'zone', x: 10, y: 8, w: 2, h: 2, do: [{ t: 'say', text: 'Mostly.', life: 1.6 }] },
    ],
  },
  {
    name: 'The Door Moves',
    chapter: 0,
    nerve: [12, 7],
    grid: [E, E, E, E, E, E, E, E, E, E, SD, F, F],
    triggers: [
      { on: 'door', d: 2.4, do: [
        { t: 'door', x: 3, y: 10 },
        { t: 'say', text: 'Wrong door.', life: 2.2 },
        { t: 'shake', mag: 4 },
      ] },
      { on: 'door', d: 2.4, needs: 0, do: [
        { t: 'set', x: 10, y: 9, w: 5, h: 1, c: '#' },
        { t: 'door', x: 12, y: 8 },
        { t: 'say', text: 'Up here now.', life: 2.2 },
      ] },
    ],
  },
  {
    name: 'Overhead',
    chapter: 0,
    nerve: [16, 9],
    grid: [E, E, E, E, E, E, E, E, E, E, SD, F, F],
    triggers: [
      { on: 'zone', x: 10, y: 9, w: 3, h: 2, do: [
        { t: 'drop', x: 12, y: 1, w: 1, h: 1 },
        { t: 'drop', x: 16, y: 1, w: 1, h: 1, d: 0.9 },
        { t: 'shake', mag: 4 },
      ] },
    ],
  },
  {
    name: 'Both, Actually',
    chapter: 0,
    nerve: [12, 9],
    grid: [E, E, E, E, E, E, E, E, E, E, SD, F, F],
    triggers: [
      { on: 'stand', x: 9, y: 11, w: 2, do: [
        { t: 'set', x: 9, y: 11, w: 2, h: 2, c: '.' },
        { t: 'spikes', x: 13, y: 10, w: 2, h: 1, from: 'up', d: 0.12 },
        { t: 'shake', mag: 6 },
        { t: 'say', text: 'Both, actually.', life: 2.2 },
      ] },
    ],
  },

  // ---------------------------------------------------------------- CHAPTER 2
  {
    name: 'Escort',
    chapter: 1,
    nerve: [21, 9],
    grid: [E, E, E, E, E, E, E, E, E, E, SD, F, F],
    triggers: [
      { on: 'door', d: 2.2, do: [{ t: 'door', x: 14, y: 10 }, { t: 'say', text: 'Nope.', life: 1.6 }] },
      { on: 'door', d: 2.2, needs: 0, do: [
        { t: 'door', x: 8, y: 10 },
        { t: 'spikes', x: 12, y: 10, w: 2, h: 1, from: 'up', d: 0.2 },
      ] },
      { on: 'door', d: 2.2, needs: 1, do: [
        { t: 'door', x: 2, y: 10 },
        { t: 'spikes', x: 5, y: 10, w: 2, h: 1, from: 'up', d: 0.25 },
        { t: 'say', text: 'Back where you started. Sorry.', life: 3 },
      ] },
    ],
  },
  {
    name: 'Crossfire',
    chapter: 1,
    nerve: [12, 10],
    grid: [E, E, E, E, E, E, E, E, E, E, SD, F, F],
    triggers: [
      { on: 'pastx', x: 5, every: 1.5, do: [{ t: 'dart', x: 23, y: 10, vx: -270 }] },
      { on: 'pastx', x: 5, do: [{ t: 'say', text: 'Jump. Rhythmically.', life: 2.6 }] },
    ],
  },
  {
    name: 'Black Ice',
    chapter: 1,
    nerve: [14, 9],
    grid: [
      E, E, E, E, E, E, E, E, E, E,
      '..S..........^^......D..',
      F, F,
    ],
    triggers: [
      { on: 'pastx', x: 6, do: [
        { t: 'ice', v: 1 },
        { t: 'say', text: 'The floor is ice now. Good luck stopping.', life: 3.2 },
      ] },
    ],
  },
  {
    name: 'Do Not Stop',
    chapter: 1,
    nerve: [13, 8],
    grid: [E, E, E, E, E, E, E, E, E, E, SD, F, F],
    triggers: [
      { on: 'pastx', x: 4, do: [
        { t: 'say', text: 'RUN.', life: 2.4 },
        { t: 'shake', mag: 5 },
        { t: 'set', x: 2, y: 11, w: 2, h: 2, c: '.', d: 0.10 },
        { t: 'set', x: 4, y: 11, w: 2, h: 2, c: '.', d: 0.52 },
        { t: 'set', x: 6, y: 11, w: 2, h: 2, c: '.', d: 0.94 },
        { t: 'set', x: 8, y: 11, w: 2, h: 2, c: '.', d: 1.36 },
        { t: 'set', x: 10, y: 11, w: 2, h: 2, c: '.', d: 1.78 },
        { t: 'set', x: 12, y: 11, w: 2, h: 2, c: '.', d: 2.20 },
        { t: 'set', x: 14, y: 11, w: 2, h: 2, c: '.', d: 2.62 },
        { t: 'set', x: 16, y: 11, w: 2, h: 2, c: '.', d: 3.04 },
      ] },
    ],
  },
  {
    name: 'Sweeper',
    chapter: 1,
    nerve: [14, 10],
    grid: [
      '......##################',
      '......##################',
      '......##################',
      '......##################',
      '......##################',
      '......##################',
      '......##################',
      '......##################',
      '......##################',
      E,
      SD,
      '##############..########',
      '##############..########',
    ],
    triggers: [
      { on: 'pastx', x: 4, every: 2.7, do: [{ t: 'crush', x: 22, y: 9, w: 2, h: 1, vx: -190 }] },
      { on: 'pastx', x: 4, do: [{ t: 'say', text: 'Stay low. Mostly.', life: 2.6 }] },
    ],
  },
  {
    name: 'Down Is A Suggestion',
    chapter: 1,
    nerve: [14, 1],
    grid: [E, E, E, E, E, E, E, E, E, E, SD, F, F],
    triggers: [
      { on: 'pastx', x: 9, do: [
        { t: 'grav', v: -1 },
        { t: 'shake', mag: 7 },
        { t: 'say', text: 'Down is a suggestion.', life: 2.8 },
        { t: 'door', x: 20, y: 1, d: 0.45 },
        { t: 'spikes', x: 14, y: 0, w: 2, h: 1, from: 'down', d: 1.3 },
      ] },
    ],
  },
  {
    name: 'Rising',
    chapter: 1,
    // a detour along the floor, away from the stairs, while the acid comes up
    nerve: [11, 10],
    grid: [
      E, E,
      '....................D...',
      '...............########.',
      E,
      '............###.........',
      E,
      '.........###............',
      E,
      '......###...............',
      '..S.....................',
      F, F,
    ],
    triggers: [
      { on: 'move', do: [
        { t: 'acid', y: 6, from: 13, speed: 16 },
        { t: 'say', text: 'Up. Quickly.', life: 2.6 },
      ] },
    ],
  },
  {
    name: 'Crush Hour',
    chapter: 1,
    nerve: [12, 8],
    grid: [E, E, E, E, E, E, E, E, E, E, SD, F, F],
    triggers: [
      { on: 'pastx', x: 8, do: [
        { t: 'crush', x: -6, y: 9, w: 6, h: 2, vx: 210, sx: 6, bounce: true },
        { t: 'crush', x: 24, y: 9, w: 6, h: 2, vx: -210, sx: 13, bounce: true },
        { t: 'say', text: 'There is exactly one safe tile.', life: 3.2 },
      ] },
    ],
  },

  // ---------------------------------------------------------------- CHAPTER 3
  {
    name: 'Lights Out',
    chapter: 2,
    nerve: [14, 9],
    grid: [
      E, E, E, E, E, E, E, E, E, E,
      SD,
      '########..####..########',
      '########..####..########',
    ],
    triggers: [
      { on: 'pastx', x: 5, do: [
        { t: 'dark', v: 0.9 },
        { t: 'say', text: 'You remember the way. Right?', life: 3 },
      ] },
    ],
  },
  {
    name: 'Cascade',
    chapter: 2,
    nerve: [11, 9],
    grid: [
      E, E, E, E, E, E, E, E, E, E,
      SD,
      '####oooooooooooooooo####',
      '####oooooooooooooooo####',
    ],
    triggers: [
      { on: 'move', do: [{ t: 'say', text: 'Do not linger.', life: 2.6 }] },
    ],
  },
  {
    name: 'Gauntlet',
    chapter: 2,
    nerve: [17, 9],
    grid: [
      E, E, E, E, E, E, E, E, E, E,
      '..S...................D.',
      F, F,
    ],
    triggers: [
      { on: 'pastx', x: 5, do: [{ t: 'spikes', x: 8, y: 10, w: 2, h: 1, from: 'up' }] },
      { on: 'pastx', x: 11, do: [{ t: 'drop', x: 14, y: 0, w: 2, h: 1 }, { t: 'shake', mag: 4 }] },
      { on: 'pastx', x: 15, do: [
        { t: 'crush', x: 18, y: 0, w: 3, h: 7, vy: 50, sy: 4 },
        { t: 'say', text: 'Almost there.', life: 2 },
      ] },
    ],
  },
  {
    name: 'The Chase',
    chapter: 2,
    nerve: [11, 9],
    grid: [
      E, E, E, E, E, E, E, E, E, E,
      '..S........^^........D..',
      F, F,
    ],
    triggers: [
      { on: 'pastx', x: 3, do: [
        { t: 'say', text: 'GO.', life: 2 },
        { t: 'shake', mag: 6 },
        { t: 'set', x: 1, y: 11, w: 2, h: 2, c: '.', d: 0.10 },
        { t: 'set', x: 3, y: 11, w: 2, h: 2, c: '.', d: 0.56 },
        { t: 'set', x: 5, y: 11, w: 2, h: 2, c: '.', d: 1.02 },
        { t: 'set', x: 7, y: 11, w: 2, h: 2, c: '.', d: 1.48 },
        { t: 'set', x: 9, y: 11, w: 2, h: 2, c: '.', d: 1.94 },
        { t: 'set', x: 11, y: 11, w: 2, h: 2, c: '.', d: 2.40 },
        { t: 'set', x: 13, y: 11, w: 2, h: 2, c: '.', d: 2.86 },
        { t: 'set', x: 15, y: 11, w: 2, h: 2, c: '.', d: 3.32 },
        { t: 'set', x: 17, y: 11, w: 2, h: 2, c: '.', d: 3.78 },
      ] },
    ],
  },
  {
    name: 'Reverse',
    chapter: 2,
    nerve: [8, 1],
    grid: [
      E, E, E, E, E, E, E, E, E, E,
      '..S..........^^......D..',
      F, F,
    ],
    triggers: [
      { on: 'pastx', x: 6, do: [
        { t: 'grav', v: -1 }, { t: 'shake', mag: 5 },
        { t: 'spikes', x: 8, y: 0, w: 2, h: 1, from: 'down', d: 0.55 },
      ] },
      { on: 'pastx', x: 11, do: [{ t: 'grav', v: 1 }, { t: 'shake', mag: 5 }] },
      { on: 'pastx', x: 16, do: [
        { t: 'grav', v: -1 }, { t: 'shake', mag: 5 },
        { t: 'door', x: 21, y: 1, d: 0.3 },
        { t: 'say', text: 'Make up your mind.', life: 2.6 },
      ] },
    ],
  },
  {
    name: 'Ice Palace',
    chapter: 2,
    nerve: [10, 9],
    grid: [
      E, E, E, E, E, E, E, E, E, E,
      SD,
      '####oo####oo####oo######',
      '####oo####oo####oo######',
    ],
    triggers: [
      { on: 'move', do: [{ t: 'ice', v: 1 }, { t: 'say', text: 'Ice. Naturally.', life: 2.4 }] },
    ],
  },
  {
    name: 'Nowhere To Stand',
    chapter: 2,
    nerve: [11, 9],
    grid: [
      E, E, E, E, E, E, E, E, E, E,
      SD,
      '####................####',
      '####................####',
    ],
    triggers: [
      { on: 'move', do: [
        { t: 'acid', y: 11, from: 13, speed: 300 },
        { t: 'crush', x: 4, y: 10, w: 3, h: 1, vx: 110, sx: 9, bounce: true, quake: false },
        { t: 'crush', x: 16, y: 10, w: 3, h: 1, vx: -110, sx: 12, bounce: true, quake: false },
        { t: 'say', text: 'Ride it.', life: 2.4 },
      ] },
    ],
  },
  {
    name: 'The Last Door',
    chapter: 2,
    nerve: [12, 7],
    grid: [E, E, E, E, E, E, E, E, E, E, SD, F, F],
    triggers: [
      { on: 'door', d: 2.3, do: [
        { t: 'set', x: 10, y: 9, w: 5, h: 1, c: '#' },
        { t: 'door', x: 12, y: 8 },
        { t: 'say', text: 'Last one. I promise.', life: 2.8 },
      ] },
      { on: 'door', d: 2.0, needs: 0, do: [
        { t: 'say', text: 'I lied.', life: 2.2 },
        { t: 'set', x: 10, y: 9, w: 5, h: 1, c: '.', d: 0.3 },
        { t: 'door', x: 20, y: 10, d: 0.3 },
        { t: 'spikes', x: 14, y: 10, w: 3, h: 1, from: 'up', d: 0.45 },
        { t: 'shake', mag: 7, d: 0.3 },
      ] },
      { on: 'door', d: 1.8, needs: 1, do: [
        { t: 'say', text: '…fine. Take it.', life: 3 },
        { t: 'shake', mag: 3 },
      ] },
    ],
  },

  // ------------------------------------------------------- BONUS (nerve-locked)
  // One per chapter, opened by collecting all 8 nerves in that chapter. These are
  // allowed to be mean — you only get here by volunteering for danger eight times.
  // They live at the END of the array so existing level indices (and saves) never move.
  {
    name: 'Ground Truth',
    chapter: 0,
    bonus: true,
    grid: [E, E, E, E, E, E, E, E, E, E, SD, F, F],
    triggers: [
      { on: 'time', s: 0.4, do: [{ t: 'say', text: 'You came back. Brave.', life: 2.6 }] },
      { on: 'stand', x: 7, y: 11, w: 2, do: [
        { t: 'set', x: 7, y: 11, w: 2, h: 2, c: '.' },
        { t: 'spikes', x: 11, y: 10, w: 2, h: 1, from: 'up', d: 0.12 },
        { t: 'shake', mag: 6 },
      ] },
      { on: 'pastx', x: 12, do: [
        { t: 'crush', x: 15, y: 0, w: 5, h: 6, vy: 66, sy: 5 },
        { t: 'say', text: 'And again.', life: 2 },
      ] },
    ],
  },
  {
    name: 'Sharp Enough',
    chapter: 1,
    bonus: true,
    grid: [
      E, E, E, E, E, E, E, E, E, E,
      '..S.......^^.........D..',
      F, F,
    ],
    triggers: [
      { on: 'move', do: [{ t: 'ice', v: 1 }, { t: 'say', text: 'Ice, and company.', life: 2.6 }] },
      { on: 'pastx', x: 4, every: 1.35, do: [{ t: 'dart', x: 23, y: 10, vx: -285 }] },
      { on: 'door', d: 2.4, do: [
        { t: 'door', x: 6, y: 10 },
        { t: 'spikes', x: 15, y: 10, w: 2, h: 1, from: 'up', d: 0.25 },
        { t: 'say', text: 'Slide back, then.', life: 2.6 },
      ] },
    ],
  },
  {
    name: 'The Whole Truth',
    chapter: 2,
    bonus: true,
    // `liar` corrupts the glimpse: the level shows you traps it has no intention of
    // springing, and quietly omits one it does. The last lie the game tells you.
    liar: true,
    grid: [E, E, E, E, E, E, E, E, E, E, SD, F, F],
    triggers: [
      { on: 'time', s: 0.4, do: [{ t: 'say', text: 'Ask me anything.', life: 2.8 }] },
      { on: 'stand', x: 6, y: 11, w: 2, do: [
        { t: 'set', x: 6, y: 11, w: 2, h: 2, c: '.' },
        { t: 'shake', mag: 5 },
      ] },
      { on: 'pastx', x: 10, do: [
        { t: 'spikes', x: 13, y: 10, w: 2, h: 1, from: 'up' },
        { t: 'say', text: 'I may have misspoken.', life: 2.4 },
      ] },
      { on: 'pastx', x: 15, do: [
        { t: 'drop', x: 18, y: 0, w: 2, h: 1 },
        { t: 'grav', v: -1, d: 0.9 },
        { t: 'door', x: 21, y: 1, d: 1.0 },
        { t: 'say', text: 'Last one. Truly.', life: 2.8, d: 0.9 },
      ] },
    ],
  },
];

// index of the last level of the main run — everything after it is nerve-locked bonus
export const MAIN_LEVELS = LEVELS.findIndex((L) => L.bonus);

export const CHAPTERS = [
  { name: 'Ground Rules', tag: 'The floor is your friend.' },
  { name: 'Sharp Practice', tag: 'It was never your friend.' },
  { name: 'Malice', tag: 'Now it is personal.' },
];

// Shown after a few deaths on the same level — the level gloating, not a hint.
export const TAUNTS = [
  'Skill issue.',
  'The floor did nothing wrong.',
  'Have you considered not dying?',
  'That was the easy bit.',
  'You are doing great. Statistically.',
  'The door is right there.',
  'Try it with your eyes open.',
  'This level has beaten better.',
  'I could move the door again.',
  'Bold strategy. Same result.',
];
