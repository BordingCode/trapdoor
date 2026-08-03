// The levels. Each one is 24x13 tiles of deliberately boring geometry plus a list of
// triggers — the boring part is the setup, the triggers are the punchline.
//
// Grid legend:
//   .  empty        #  solid          S  spawn        D  door (this tile is its FOOT)
//   >  belt, carries you right   <  belt, carries you left (solid, 112px/s)
//   ^  floor spike  v  ceiling spike  ~  acid
//   o  looks solid, crumbles 0.3s after you stand on it
//   =  looks solid, isn't solid at all
//
// Trigger  { on, ...cond, delay?, once?, every?, needs?, after?, do:[actions] }
//   on: zone(x,y,w,h) | stand(x,y,w) | pastx(x) | above(y) | time(s) | move | air | land | door(d)
//   after: n — only arms once the level has killed you n times this visit (it holds a grudge)
// Actions  (each may carry d: extra delay in seconds)
//   set(x,y,w,h,c) spikes(x,y,w,h,from,hold) crush(x,y,w,h,vx,vy,sx,sy,bounce,kill,solid)
//   drop(x,y,w,h) dart(x,y,vx,vy) door(x,y) fakedoor(v) grav(v) ice(v) dark(v)
//   acid(y,from,speed) push(vx,vy) shake(mag) say(text) sfx(name)
//   spikes hold:s pull back in after s seconds — a rhythm instead of a wall
//   crush kill:true is a blade (give it solid:false so you cannot ride what cuts you)
//   crush gone:s dissolves s seconds after it arrives — a lift that does not wait around
//   crush chase:speed steers at you every frame — keep it under run speed (168)
//   flip(v) reverses left/right · nojump(v) takes your jump away until v:0

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
      { on: 'time', s: 0.5, do: [{ t: 'say', text: 'Take the ◆ nerve, then the door. That is the whole game.', life: 3.8 }] },
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

  // ---------------------------------------------------------------- CHAPTER 4
  // The chapter of bad faith: the door can be a prop, spikes breathe in and out, blades
  // do not care that you are standing on them, and `after:` levels rearm meaner every
  // time they kill you. Everything here is still avoidable — once you know.
  {
    name: 'Second Thoughts',
    chapter: 3,
    nerve: [9, 8],
    grid: [E, E, E, E, E, E, E, E, E, E, SD, F, F],
    triggers: [
      { on: 'time', s: 0.5, do: [{ t: 'say', text: 'A floor. A door. You know the drill.', life: 3 }] },
      { on: 'stand', x: 9, y: 11, w: 2, do: [
        { t: 'set', x: 9, y: 11, w: 2, h: 2, c: '.' },
        { t: 'shake', mag: 5 },
        { t: 'say', text: 'You saw that coming.', life: 2 },
      ] },
      // the level keeps score: one death buys a spike, two buys the darts
      { on: 'pastx', x: 12, after: 1, do: [
        { t: 'spikes', x: 15, y: 10, w: 2, h: 1, from: 'up' },
        { t: 'say', text: 'That is one. Here is a spike.', life: 2.8 },
      ] },
      { on: 'pastx', x: 4, after: 2, do: [{ t: 'say', text: 'Two. I am adding darts.', life: 2.6 }] },
      { on: 'pastx', x: 4, every: 1.6, after: 2, do: [{ t: 'dart', x: 23, y: 10, vx: -280 }] },
    ],
  },
  {
    name: 'The Wrong Door',
    chapter: 3,
    nerve: [20, 8],   // right above the prop, so you have to reach for the lie
    grid: [E, E, E, E, E, E, E, E, E, E, SD, F, F],
    triggers: [
      // fake from the first frame: the door is dimmer than it should be, and that is
      // the only warning you get for free. A glimpse crosses it out.
      { on: 'time', s: 0, do: [{ t: 'fakedoor' }] },
      { on: 'door', d: 2.0, needs: 0, do: [
        { t: 'say', text: 'That one is a prop.', life: 2.6 },
        { t: 'fakedoor', v: false },
        { t: 'door', x: 3, y: 10 },
        { t: 'shake', mag: 6 },
        // two single hops on the way back, not two walls — the joke is the door, and a
        // return trip you cannot make is not a joke
        { t: 'spikes', x: 15, y: 10, w: 1, h: 1, from: 'up', d: 0.3 },
        { t: 'spikes', x: 8, y: 10, w: 1, h: 1, from: 'up', d: 0.7 },
      ] },
      // and something to make sure you don't stroll back
      { on: 'zone', x: 15, y: 8, w: 3, h: 4, needs: 1, do: [
        { t: 'crush', x: 24, y: 10, w: 2, h: 1, vx: -130, sx: 0, kill: true, solid: false, quake: false },
      ] },
    ],
  },
  {
    name: 'Pendulum',
    chapter: 3,
    nerve: [11, 8],
    grid: [E, E, E, E, E, E, E, E, E, E, SD, F, F],
    triggers: [
      { on: 'pastx', x: 4, do: [{ t: 'say', text: 'They breathe. Learn the count.', life: 3 }] },
      // spikes that pull back in: the floor is only lethal on the beat
      { on: 'pastx', x: 4, every: 1.75, do: [
        { t: 'spikes', x: 8, y: 10, w: 2, h: 1, from: 'up', hold: 1.05 },
        { t: 'spikes', x: 18, y: 10, w: 1, h: 1, from: 'up', hold: 0.7, d: 0.5 },
        { t: 'spikes', x: 14, y: 10, w: 2, h: 1, from: 'up', hold: 1.05, d: 0.9 },
      ] },
    ],
  },
  {
    name: 'Sawmill',
    chapter: 3,
    nerve: [16, 8],   // between the wide bank and the right ledge, in the blade's lane
    grid: [
      E, E, E, E, E, E, E, E, E,
      '.......###.......###....',
      SD,
      F, F,
    ],
    triggers: [
      { on: 'pastx', x: 4, do: [
        { t: 'crush', x: 23, y: 10, w: 2, h: 1, vx: -205, sx: 0, bounce: true, kill: true, solid: false, quake: false },
        { t: 'say', text: 'The ledges are for standing on.', life: 3 },
      ] },
      // a bank too wide to jump: the ledge stops being optional
      { on: 'pastx', x: 6, every: 2.2, do: [
        { t: 'spikes', x: 11, y: 10, w: 4, h: 1, from: 'up', hold: 0.9 },
      ] },
      // …and this is why the ledge isn't safe either
      { on: 'pastx', x: 9, do: [
        { t: 'crush', x: -2, y: 8, w: 2, h: 1, vx: 205, sx: 22, bounce: true, kill: true, solid: false, quake: false },
        { t: 'say', text: 'Were.', life: 2 },
      ] },
    ],
  },
  {
    name: 'Headwind',
    chapter: 3,
    nerve: [13, 8],   // exactly at the apex of the jump over the pit
    grid: [
      E, E, E, E, E, E, E, E, E, E, SD,
      '#############..#########',
      '#############..#########',
    ],
    triggers: [
      { on: 'pastx', x: 5, do: [{ t: 'say', text: 'The room breathes too. Not for you.', life: 3.2 }] },
      { on: 'pastx', x: 5, every: 1.5, do: [{ t: 'push', vx: -300 }, { t: 'shake', mag: 4 }] },
      { on: 'pastx', x: 16, do: [{ t: 'spikes', x: 18, y: 10, w: 2, h: 1, from: 'up' }] },
    ],
  },
  {
    name: 'The Long Climb',
    chapter: 3,
    // the nerve hangs in the dart lane, one jump above the third landing
    nerve: [16, 3],
    grid: [
      E, E,
      '....................D...',
      '...................####.',
      E,
      '...............####.....',
      E,
      '..........####..........',
      E,
      '.....####...............',
      '..S.....................',
      F, F,
    ],
    triggers: [
      { on: 'above', y: 10, do: [{ t: 'say', text: 'Up. Do not plan on coming back.', life: 3 }] },
      // each landing sprouts the moment you leave it: there is only ever one way, forwards
      { on: 'above', y: 8, do: [{ t: 'spikes', x: 5, y: 8, w: 4, h: 1, from: 'up' }] },
      { on: 'above', y: 6, do: [{ t: 'spikes', x: 10, y: 6, w: 4, h: 1, from: 'up' }] },
      // and something crossing the gap you have to jump through to finish
      { on: 'above', y: 6, every: 1.8, do: [{ t: 'dart', x: 23, y: 3, vx: -280 }] },
      { on: 'above', y: 4, do: [
        { t: 'spikes', x: 15, y: 4, w: 4, h: 1, from: 'up' },
        { t: 'say', text: 'Nearly. Do not look down.', life: 2.6 },
      ] },
    ],
  },
  {
    name: 'Icicles',
    chapter: 3,
    nerve: [11, 8],
    grid: [
      E, E, E, E, E, E, E, E, E,
      '.....###......###.......',   // the only two umbrellas in the level
      SD,
      F, F,
    ],
    triggers: [
      { on: 'move', do: [{ t: 'say', text: 'The ceiling is not fond of you either.', life: 3 }] },
      { on: 'pastx', x: 3, every: 1.0, do: [
        { t: 'dart', x: 9, y: 0, vx: 0, vy: 340 },
        { t: 'dart', x: 19, y: 0, vx: 0, vy: 340, d: 0.3 },
        { t: 'dart', x: 12, y: 0, vx: 0, vy: 340, d: 0.62 },
        { t: 'dart', x: 21, y: 0, vx: 0, vy: 340, d: 0.9 },
      ] },
    ],
  },
  {
    name: 'Nothing Personal',
    chapter: 3,
    nerve: [8, 9],
    grid: [E, E, E, E, E, E, E, E, E, E, SD, F, F],
    triggers: [
      { on: 'time', s: 0.4, do: [{ t: 'say', text: 'Nothing personal.', life: 2.4 }] },
      { on: 'pastx', x: 6, do: [
        { t: 'crush', x: 24, y: 10, w: 2, h: 1, vx: -200, sx: 0, bounce: true, kill: true, solid: false, quake: false },
      ] },
      { on: 'door', d: 2.2, do: [
        { t: 'set', x: 10, y: 9, w: 5, h: 1, c: '#' },
        { t: 'door', x: 12, y: 8 },
        { t: 'say', text: 'Up there. With that still running.', life: 3.2 },
      ] },
      { on: 'zone', x: 9, y: 6, w: 7, h: 3, needs: 2, do: [
        { t: 'spikes', x: 14, y: 8, w: 1, h: 1, from: 'up' },
        { t: 'say', text: 'Go on, then.', life: 2.2 },
      ] },
    ],
  },

  // ---------------------------------------------------------------- CHAPTER 5
  // The last chapter drops the pretence that any of this is a tutorial. Nothing new is
  // introduced here — it is the whole vocabulary at once, at a speed that assumes you
  // learned it.
  {
    name: 'Muscle Memory',
    chapter: 4,
    nerve: [6, 8],
    grid: [E, E, E, E, E, E, E, E, E, E, SD, F, F],
    triggers: [
      { on: 'time', s: 0.5, do: [{ t: 'say', text: 'You have played this one before.', life: 3 }] },
      // level 2's trapdoor, four tiles earlier. Knowing the game is now a liability.
      { on: 'stand', x: 6, y: 11, w: 2, do: [
        { t: 'set', x: 6, y: 11, w: 2, h: 2, c: '.' },
        { t: 'shake', mag: 5 },
        { t: 'say', text: 'Different spot.', life: 2 },
      ] },
      { on: 'pastx', x: 10, after: 1, do: [
        { t: 'set', x: 13, y: 11, w: 2, h: 2, c: '.' },
        { t: 'say', text: 'And there.', life: 2 },
      ] },
      { on: 'pastx', x: 4, after: 2, do: [
        { t: 'spikes', x: 17, y: 10, w: 1, h: 1, from: 'up' },
        { t: 'say', text: 'Third time. You know what goes here.', life: 3 },
      ] },
    ],
  },
  {
    name: 'Blind Rhythm',
    chapter: 4,
    nerve: [10, 8],
    grid: [E, E, E, E, E, E, E, E, E, E, SD, F, F],
    triggers: [
      { on: 'pastx', x: 4, do: [{ t: 'dark', v: 0.92 }, { t: 'say', text: 'Count it. Do not look.', life: 3 }] },
      // a wave of spikes travelling right: stay behind the beat and it opens for you
      { on: 'pastx', x: 4, every: 1.5, do: [
        { t: 'spikes', x: 8, y: 10, w: 2, h: 1, from: 'up', hold: 0.8 },
        { t: 'spikes', x: 12, y: 10, w: 2, h: 1, from: 'up', hold: 0.8, d: 0.6 },
        { t: 'spikes', x: 16, y: 10, w: 2, h: 1, from: 'up', hold: 0.8, d: 1.2 },
      ] },
    ],
  },
  {
    name: 'Downstairs',
    chapter: 4,
    nerve: [12, 5],
    grid: [
      E,
      '..S.....................',
      '#####..#################',
      E,
      '#########..#############',
      E,
      '#############..#########',
      E,
      '#################..#####',
      E,
      '....................D...',
      F, F,
    ],
    triggers: [
      { on: 'move', do: [
        { t: 'acid', y: 10, from: 13, speed: 17 },
        { t: 'say', text: 'Down. The basement is filling.', life: 3.2 },
      ] },
      // the floor you land on stops being a floor to stand on
      { on: 'zone', x: 5, y: 3, w: 4, h: 1, do: [{ t: 'spikes', x: 5, y: 3, w: 3, h: 1, from: 'up', d: 0.8 }] },
      { on: 'zone', x: 9, y: 5, w: 4, h: 1, do: [{ t: 'spikes', x: 9, y: 5, w: 3, h: 1, from: 'up', d: 0.8 }] },
      { on: 'zone', x: 13, y: 7, w: 4, h: 1, do: [{ t: 'spikes', x: 13, y: 7, w: 3, h: 1, from: 'up', d: 0.8 }] },
    ],
  },
  {
    name: 'Both Ways',
    chapter: 4,
    nerve: [12, 1],
    grid: [
      '.........vv.....vv......',
      E, E, E, E, E, E, E, E, E,
      '..S..^^......^^......D..',
      F, F,
    ],
    triggers: [
      { on: 'pastx', x: 4, do: [{ t: 'say', text: 'Pick a side. It will not last.', life: 3 }] },
      // 1.3 seconds a side, and the two sides are spiked in different places
      { on: 'pastx', x: 4, every: 2.6, do: [{ t: 'grav', v: -1 }, { t: 'shake', mag: 5 }] },
      { on: 'pastx', x: 4, every: 2.6, delay: 1.3, do: [{ t: 'grav', v: 1 }, { t: 'shake', mag: 5 }] },
    ],
  },
  {
    name: 'Meat Grinder',
    chapter: 4,
    nerve: [11, 8],
    grid: [
      E, E, E, E, E, E, E, E, E, E,
      SD,
      '####oooooooooooooooo####',
      '####oooooooooooooooo####',
    ],
    triggers: [
      { on: 'move', do: [{ t: 'say', text: 'Keep moving. Both reasons.', life: 3 }] },
      { on: 'pastx', x: 5, do: [
        // it does not stop at the wall: what is left of the floor gets a second pass
        { t: 'crush', x: 24, y: 10, w: 2, h: 1, vx: -235, sx: 0, bounce: true, kill: true, solid: false, quake: false },
      ] },
      { on: 'pastx', x: 7, every: 2.1, do: [
        { t: 'spikes', x: 12, y: 10, w: 4, h: 1, from: 'up', hold: 0.8 },
      ] },
    ],
  },
  {
    name: 'Slalom',
    chapter: 4,
    nerve: [12, 8],
    grid: [E, E, E, E, E, E, E, E, E, E, SD, F, F],
    triggers: [
      { on: 'move', do: [{ t: 'ice', v: 1 }, { t: 'say', text: 'Ice, and a metronome.', life: 3 }] },
      { on: 'pastx', x: 3, every: 1.4, do: [
        { t: 'spikes', x: 9, y: 10, w: 1, h: 1, from: 'up', hold: 0.85 },
        { t: 'spikes', x: 14, y: 10, w: 1, h: 1, from: 'up', hold: 0.85, d: 0.7 },
        { t: 'spikes', x: 19, y: 10, w: 1, h: 1, from: 'up', hold: 0.85, d: 1.15 },
      ] },
    ],
  },
  {
    name: 'Elevator',
    chapter: 4,
    nerve: [21, 10],   // past the pad, in the blade's lane, and you have to come back
    grid: [
      E, E,
      '....................D...',
      '..................######',
      E, E, E, E, E, E,
      '..S.....................',
      F, F,
    ],
    triggers: [
      { on: 'pastx', x: 5, do: [{ t: 'say', text: 'Stand on the pad. It does not wait at the top.', life: 3.4 }] },
      // step on the pad and it comes up out of the floor under you. It starts one row
      // INSIDE the floor on purpose: a solid block spawned overlapping you shoves you
      // sideways out of it instead of lifting you.
      { on: 'zone', x: 15, y: 10, w: 1, h: 1, once: false, do: [
        { t: 'crush', x: 14, y: 11, w: 3, h: 1, vy: -72, sy: 3, quake: false, gone: 0.55 },
      ] },
      // touching the nerve sends a blade up the floor between you and the pad: the walk
      // out is free, the walk back is the price
      { on: 'zone', x: 20, y: 10, w: 2, h: 1, do: [
        { t: 'crush', x: -2, y: 10, w: 2, h: 1, vx: 170, sx: 23, kill: true, solid: false, quake: false },
        { t: 'say', text: 'Enjoy the walk back.', life: 2.6 },
      ] },
      { on: 'pastx', x: 12, every: 2.4, do: [{ t: 'dart', x: 23, y: 6, vx: -300 }] },
    ],
  },
  {
    name: 'The Last Word',
    chapter: 4,
    nerve: [7, 8],
    grid: [E, E, E, E, E, E, E, E, E, E, SD, F, F],
    triggers: [
      { on: 'time', s: 0.4, do: [{ t: 'say', text: 'Last one. And this time I mean it.', life: 3 }] },
      { on: 'pastx', x: 4, every: 1.9, do: [
        { t: 'spikes', x: 10, y: 10, w: 2, h: 1, from: 'up', hold: 0.8 },
        { t: 'spikes', x: 16, y: 10, w: 1, h: 1, from: 'up', hold: 0.8, d: 0.95 },
      ] },
      { on: 'pastx', x: 8, do: [
        { t: 'crush', x: 24, y: 10, w: 2, h: 1, vx: -160, sx: 0, kill: true, solid: false, quake: false },
      ] },
      { on: 'door', d: 2.2, do: [
        { t: 'set', x: 9, y: 9, w: 5, h: 1, c: '#' },
        { t: 'door', x: 11, y: 8 },
        { t: 'say', text: 'Up.', life: 2 },
      ] },
      { on: 'door', d: 2.0, needs: 3, do: [
        { t: 'grav', v: -1 },
        { t: 'door', x: 11, y: 1, d: 0.4 },
        { t: 'say', text: '…and up.', life: 2.4 },
        { t: 'spikes', x: 14, y: 0, w: 2, h: 1, from: 'down', d: 1.2 },
      ] },
      { on: 'door', d: 1.6, needs: 4, do: [{ t: 'say', text: 'Fine. Take it.', life: 3 }] },
    ],
  },

  // ---------------------------------------------------------------- CHAPTER 6
  // Contempt. By here the level has run out of things to do TO the room, so it starts on
  // you instead: your controls, your legs, and something that follows you.
  {
    name: 'Wrong Way',
    chapter: 5,
    nerve: [8, 8],   // behind you, once "behind" has stopped meaning what it did
    grid: [E, E, E, E, E, E, E, E, E, E, SD, F, F],
    triggers: [
      { on: 'pastx', x: 6, do: [
        { t: 'flip', v: 1 },
        { t: 'shake', mag: 6 },
        { t: 'say', text: 'Left is right now. Do keep up.', life: 3.2 },
      ] },
      { on: 'stand', x: 12, y: 11, w: 2, do: [
        { t: 'set', x: 12, y: 11, w: 2, h: 2, c: '.' },
        { t: 'shake', mag: 5 },
      ] },
      { on: 'pastx', x: 15, do: [{ t: 'spikes', x: 18, y: 10, w: 1, h: 1, from: 'up' }] },
    ],
  },
  {
    name: 'Legs',
    chapter: 5,
    nerve: [20, 8],   // one more jump than the route needs, and jumps are rationed
    grid: [
      E, E, E, E, E, E, E, E, E, E, SD,
      '#########..#####..######',
      '#########..#####..######',
    ],
    triggers: [
      { on: 'pastx', x: 3, do: [{ t: 'say', text: 'Your legs work when I say they do.', life: 3.4 }] },
      // 1.5s without a jump, 1.5s with one. The gaps do not move; you have to.
      { on: 'pastx', x: 3, every: 2.8, do: [
        { t: 'nojump', v: 1 }, { t: 'shake', mag: 3 },
        { t: 'nojump', v: 0, d: 1.3 },
      ] },
    ],
  },
  {
    name: 'Hunted',
    chapter: 5,
    nerve: [13, 8],
    grid: [
      E, E, E, E, E, E, E, E, E, E,
      SD,
      '####oooooooooooooooo####',
      '####oooooooooooooooo####',
    ],
    triggers: [
      { on: 'move', do: [{ t: 'say', text: 'It knows where you are.', life: 2.8 }] },
      // slower than a run, so it can never catch you — it just deletes standing still
      // it starts behind you and never stops. Note a chaser can NEVER be jumped over: it
      // steers under you while you are in the air. It can only ever be outrun.
      { on: 'pastx', x: 4, do: [
        { t: 'crush', x: -2, y: 10, w: 2, h: 1, chase: 118, kill: true, solid: false, quake: false },
      ] },
      // FOUR tiles wide: a jump clears about three and a half, so these cannot be hopped.
      // You have to stand and wait for them, which is the whole point of the thing behind you.
      { on: 'pastx', x: 6, every: 2.0, do: [
        { t: 'spikes', x: 11, y: 10, w: 4, h: 1, from: 'up', hold: 0.85 },
        { t: 'spikes', x: 17, y: 10, w: 4, h: 1, from: 'up', hold: 0.85, d: 1.0 },
      ] },
    ],
  },
  {
    name: 'The Blink',
    chapter: 5,
    nerve: [15, 8],
    grid: [E, E, E, E, E, E, E, E, E, E, SD, F, F],
    triggers: [
      { on: 'pastx', x: 4, do: [{ t: 'say', text: 'It is only a door some of the time.', life: 3.2 }] },
      // a prop that becomes a door for two thirds of a second, in two places, forever
      { on: 'pastx', x: 4, every: 3.0, do: [
        { t: 'fakedoor' },
        { t: 'door', x: 12, y: 10, d: 0.05 },
        { t: 'fakedoor', v: false, d: 0.8 },     // a door for 0.55s, here
        { t: 'fakedoor', d: 1.35 },
        { t: 'door', x: 21, y: 10, d: 1.4 },
        { t: 'fakedoor', v: false, d: 2.25 },    // …and for 0.55s, there
        { t: 'fakedoor', d: 2.8 },
      ] },
      // pacing between the two has to cost something, and a chaser would wall off the
      // half of the level you need to walk back into
      { on: 'pastx', x: 6, every: 1.3, do: [{ t: 'dart', x: 23, y: 10, vx: -290 }] },
    ],
  },
  {
    name: 'Two Minds',
    chapter: 5,
    nerve: [17, 8],
    grid: [E, E, E, E, E, E, E, E, E, E, SD, F, F],
    triggers: [
      { on: 'move', do: [{ t: 'ice', v: 1 }, { t: 'say', text: 'Ice. And second thoughts.', life: 3 }] },
      { on: 'pastx', x: 4, every: 2.4, do: [
        { t: 'flip', v: 1 }, { t: 'shake', mag: 4 },
        { t: 'flip', v: 0, d: 1.2 },
      ] },
      { on: 'pastx', x: 4, every: 2.0, do: [{ t: 'spikes', x: 12, y: 10, w: 2, h: 1, from: 'up', hold: 0.9 }] },
    ],
  },
  {
    name: 'The Presses',
    chapter: 5,
    nerve: [12, 8],   // inside a press shaft, which is open exactly between stamps
    grid: [E, E, E, E, E, E, E, E, E, E, SD, F, F],
    triggers: [
      { on: 'pastx', x: 3, do: [{ t: 'say', text: 'Two of them. Count the gap.', life: 3 }] },
      { on: 'pastx', x: 3, do: [
        { t: 'crush', x: 9, y: -4, w: 4, h: 4, vy: 280, sy: 8, bounce: true },
        { t: 'crush', x: 15, y: -4, w: 4, h: 4, vy: 280, sy: 8, bounce: true, wait: 1.0 },
        // the last one comes down on the doorway itself
        { t: 'crush', x: 20, y: -4, w: 4, h: 4, vy: 280, sy: 8, bounce: true, wait: 2.0 },
      ] },
      // and the places you wait between stamps are on a beat of their own
      { on: 'pastx', x: 6, every: 2.0, do: [
        { t: 'spikes', x: 13, y: 10, w: 2, h: 1, from: 'up', hold: 0.7 },
        { t: 'spikes', x: 19, y: 10, w: 1, h: 1, from: 'up', hold: 0.7, d: 1.0 },
      ] },
    ],
  },
  {
    name: 'Relentless',
    chapter: 5,
    nerve: [10, 8],   // mid-air between the first two stones, with the floor going lethal
    grid: [
      E, E, E, E, E, E, E, E,
      '....................D...',
      '......###...###...######',   // stepping stones, 64px up — the floor is about to go
      '..S.....................',
      F, F,
    ],
    triggers: [
      { on: 'move', do: [
        { t: 'acid', y: 10, from: 13, speed: 26 },
        { t: 'say', text: 'The floor is on a timer. So are you.', life: 3.2 },
      ] },
      { on: 'pastx', x: 4, do: [
        { t: 'crush', x: -2, y: 9, w: 2, h: 1, chase: 150, kill: true, solid: false, quake: false },
      ] },
    ],
  },
  {
    name: 'Contempt',
    chapter: 5,
    nerve: [7, 8],
    grid: [E, E, E, E, E, E, E, E, E, E, SD, F, F],
    triggers: [
      { on: 'time', s: 0.4, do: [{ t: 'say', text: 'You should not be here.', life: 2.8 }] },
      { on: 'pastx', x: 4, do: [
        { t: 'crush', x: -2, y: 10, w: 2, h: 1, chase: 112, kill: true, solid: false, quake: false },
      ] },
      // the two of them never overlap: half a second of reversed controls, then, later,
      // three quarters of a second without a jump. Either one alone is survivable.
      { on: 'pastx', x: 6, every: 3.6, do: [
        { t: 'flip', v: 1 }, { t: 'shake', mag: 4 },
        { t: 'flip', v: 0, d: 0.9 },
      ] },
      { on: 'pastx', x: 13, every: 3.6, delay: 2.0, do: [
        { t: 'nojump', v: 1 },
        { t: 'nojump', v: 0, d: 0.75 },
      ] },
      // the refuge is built ahead of you, not behind: walking back into the chaser for it
      // would make the finish a coin flip rather than a run
      { on: 'door', d: 2.2, do: [
        { t: 'set', x: 16, y: 9, w: 5, h: 1, c: '#' },
        { t: 'door', x: 18, y: 8 },
        { t: 'say', text: 'Up. With all of that still going on.', life: 3.2 },
      ] },
      { on: 'door', d: 1.8, needs: 4, do: [{ t: 'say', text: '…fine.', life: 2.6 }] },
    ],
  },

  // ---------------------------------------------------------------- CHAPTER 7
  // The door has always wanted the nerve. This chapter builds levels around that: the
  // detour IS the level, and the floor, the clock and the light are all against it.
  {
    name: 'Conveyor',
    chapter: 6,
    nerve: [19, 8],
    grid: [
      E, E, E, E, E, E, E, E, E,
      '......##########........',   // a lid: inside the tunnel there is no jumping
      SD,
      '####<<<<<<<<<<<<<<<<####',
      F,
    ],
    triggers: [
      { on: 'move', do: [{ t: 'say', text: 'The floor would rather you did not.', life: 3.2 }] },
      // upstream at 56px/s, and the tunnel has a beat of its own
      { on: 'pastx', x: 5, every: 2.2, do: [
        { t: 'spikes', x: 9, y: 10, w: 2, h: 1, from: 'up', hold: 0.9 },
        { t: 'spikes', x: 13, y: 10, w: 2, h: 1, from: 'up', hold: 0.9, d: 1.1 },
      ] },
      { on: 'pastx', x: 16, do: [{ t: 'spikes', x: 21, y: 10, w: 1, h: 1, from: 'up' }] },
    ],
  },
  {
    name: 'Deadline',
    chapter: 6,
    nerve: [6, 8],
    grid: [E, E, E, E, E, E, E, E, E, E, SD, F, F],
    triggers: [
      { on: 'time', s: 0.4, do: [{ t: 'say', text: 'Seven seconds. Both of them.', life: 3 }] },
      { on: 'stand', x: 13, y: 11, w: 2, do: [
        { t: 'set', x: 13, y: 11, w: 2, h: 2, c: '.' }, { t: 'shake', mag: 5 },
      ] },
      // the door stops being a door. Permanently. Die and it starts over.
      { on: 'time', s: 7, do: [
        { t: 'fakedoor' },
        { t: 'say', text: 'Time. Start again.', life: 3 },
        { t: 'shake', mag: 7 },
      ] },
    ],
  },
  {
    name: 'Guard',
    chapter: 6,
    nerve: [12, 8],
    grid: [E, E, E, E, E, E, E, E, E, E, SD, F, F],
    triggers: [
      { on: 'pastx', x: 5, do: [
        { t: 'say', text: 'That one is guarded.', life: 2.8 },
        // it patrols the air one tile up, so it never touches you on the floor — it only
        // makes the JUMP dangerous, which is where the nerve is
        { t: 'crush', x: 11, y: 9, w: 2, h: 1, vx: 150, sx: 16, bounce: true, kill: true, solid: false, quake: false },
      ] },
      { on: 'pastx', x: 15, do: [{ t: 'spikes', x: 18, y: 10, w: 2, h: 1, from: 'up' }] },
    ],
  },
  {
    name: 'Runaway',
    chapter: 6,
    nerve: [4, 8],   // before the belt, because it is the last jump you are allowed
    grid: [
      E, E, E, E, E, E, E, E, E,
      '.........vvvvvvvvv......',   // under this, jumping is not an option
      SD,
      '######>>>>>>>>>>>>>>####',
      F,
    ],
    triggers: [
      { on: 'move', do: [{ t: 'ice', v: 1 }, { t: 'say', text: 'Ice, and a floor in a hurry.', life: 3.2 }] },
      // the belt runs at you at 280px/s and the brakes are made of ice
      { on: 'pastx', x: 8, every: 2.4, do: [
        { t: 'spikes', x: 17, y: 10, w: 1, h: 1, from: 'up', hold: 0.6 },
      ] },
    ],
  },
  {
    name: 'Cold Storage',
    chapter: 6,
    nerve: [18, 8],
    grid: [
      E, E, E, E, E, E, E, E, E, E,
      SD,
      '####>>>>>>>><<<<<<<<####',
      F,
    ],
    triggers: [
      { on: 'pastx', x: 4, do: [
        { t: 'dark', v: 0.9 },
        { t: 'say', text: 'You will feel which way the floor goes.', life: 3.4 },
      ] },
      { on: 'pastx', x: 6, do: [
        { t: 'crush', x: -2, y: 10, w: 2, h: 1, chase: 132, kill: true, solid: false, quake: false },
      ] },
      { on: 'pastx', x: 8, every: 2.2, do: [
        { t: 'spikes', x: 13, y: 10, w: 4, h: 1, from: 'up', hold: 0.8 },
      ] },
    ],
  },
  {
    name: 'Overtime',
    chapter: 6,
    nerve: [12, 8],
    grid: [E, E, E, E, E, E, E, E, E, E, SD, F, F],
    triggers: [
      { on: 'pastx', x: 3, do: [
        { t: 'say', text: 'Ten seconds, and it stamps.', life: 3 },
        { t: 'crush', x: 10, y: -4, w: 4, h: 4, vy: 290, sy: 8, bounce: true },
        { t: 'crush', x: 17, y: -4, w: 4, h: 4, vy: 290, sy: 8, bounce: true, wait: 1.2 },
      ] },
      { on: 'time', s: 10, do: [
        { t: 'fakedoor' },
        { t: 'say', text: 'Closed.', life: 2.6 },
        { t: 'shake', mag: 7 },
      ] },
    ],
  },
  {
    name: 'Ferry',
    chapter: 6,
    nerve: [12, 6],
    grid: [
      E, E, E, E, E, E, E, E, E,
      '......<<<<<<<<<<<.......',   // the only way across, and it runs the wrong way
      SD,
      '#####~~~~~~~~~~~~~~#####',
      '#####~~~~~~~~~~~~~~#####',
    ],
    triggers: [
      { on: 'move', do: [{ t: 'say', text: 'Mind the gap. And the ferry.', life: 3.2 }] },
      // at head height for anyone standing on the belt; the nerve is one jump above them
      { on: 'pastx', x: 6, every: 1.6, do: [{ t: 'dart', x: 23, y: 8, vx: -300 }] },
    ],
  },
  {
    name: 'The Vault',
    chapter: 6,
    nerve: [4, 8],
    grid: [
      E, E, E, E, E, E, E, E, E, E,
      SD,
      '####>>>>>>>>>>>>>>>>####',
      F,
    ],
    triggers: [
      { on: 'time', s: 0.4, do: [{ t: 'say', text: 'Last door. It wants everything.', life: 3.2 }] },
      { on: 'pastx', x: 6, do: [
        { t: 'crush', x: 24, y: 10, w: 2, h: 1, chase: 104, kill: true, solid: false, quake: false },
      ] },
      { on: 'pastx', x: 8, every: 3.4, do: [
        { t: 'flip', v: 1 }, { t: 'shake', mag: 4 },
        { t: 'flip', v: 0, d: 0.85 },
      ] },
      { on: 'pastx', x: 10, every: 2.2, do: [
        { t: 'spikes', x: 14, y: 10, w: 3, h: 1, from: 'up', hold: 0.8 },
      ] },
      { on: 'door', d: 2.2, do: [
        { t: 'set', x: 16, y: 9, w: 5, h: 1, c: '#' },
        { t: 'door', x: 18, y: 8 },
        { t: 'say', text: 'Up. Obviously.', life: 2.6 },
      ] },
      { on: 'door', d: 1.8, needs: 4, do: [{ t: 'say', text: 'Go on. It is open.', life: 3 }] },
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
      // single-tile spike banks: clearing a 2-tile bank on ice needs a launch window
      // ~0.24s wide, which stacks badly with dodging darts on a 1.35s cycle
      '..S........^.........D..',
      F, F,
    ],
    triggers: [
      { on: 'move', do: [{ t: 'ice', v: 1 }, { t: 'say', text: 'Ice, and company.', life: 2.6 }] },
      { on: 'pastx', x: 4, every: 1.35, do: [{ t: 'dart', x: 23, y: 10, vx: -285 }] },
      // the door retreats past ONE fresh spike bank, not all the way back over the
      // level's own spikes — a return trip on ice with darts is enough of an ask
      { on: 'door', d: 2.4, do: [
        { t: 'door', x: 12, y: 10 },
        { t: 'spikes', x: 16, y: 10, w: 1, h: 1, from: 'up', d: 0.25 },
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
  {
    name: 'Second Opinion',
    chapter: 3,
    bonus: true,
    grid: [E, E, E, E, E, E, E, E, E, E, SD, F, F],
    triggers: [
      { on: 'time', s: 0, do: [{ t: 'fakedoor' }] },
      { on: 'time', s: 0.5, do: [{ t: 'say', text: 'Straight there. What could go wrong.', life: 3 }] },
      { on: 'pastx', x: 4, every: 1.9, do: [
        { t: 'spikes', x: 9, y: 10, w: 2, h: 1, from: 'up', hold: 0.8 },
        { t: 'spikes', x: 15, y: 10, w: 2, h: 1, from: 'up', hold: 0.8, d: 0.95 },
      ] },
      // the whole level again, backwards, with something behind you
      { on: 'door', d: 2.0, needs: 0, do: [
        { t: 'fakedoor', v: false },
        { t: 'door', x: 2, y: 10 },
        { t: 'say', text: 'Back you go. Mind the count.', life: 3 },
        { t: 'crush', x: 24, y: 10, w: 2, h: 1, vx: -190, sx: 0, kill: true, solid: false, quake: false, wait: 0.6 },
      ] },
    ],
  },
  {
    name: 'Overdue',
    chapter: 6,
    bonus: true,
    grid: [
      E, E, E, E, E, E, E, E, E, E,
      SD,
      '####<<<<<<<<>>>>>>>>####',
      F,
    ],
    triggers: [
      { on: 'move', do: [{ t: 'say', text: 'You came back for this. Twelve seconds.', life: 3.4 }] },
      { on: 'pastx', x: 4, do: [
        { t: 'crush', x: -2, y: 10, w: 2, h: 1, chase: 128, kill: true, solid: false, quake: false },
      ] },
      { on: 'pastx', x: 4, every: 2.0, do: [
        { t: 'spikes', x: 10, y: 10, w: 2, h: 1, from: 'up', hold: 0.8 },
        { t: 'spikes', x: 16, y: 10, w: 2, h: 1, from: 'up', hold: 0.8, d: 1.0 },
      ] },
      { on: 'time', s: 12, do: [
        { t: 'fakedoor' }, { t: 'say', text: 'Overdue.', life: 2.6 }, { t: 'shake', mag: 7 },
      ] },
    ],
  },
  {
    name: 'Nothing Left',
    chapter: 5,
    bonus: true,
    grid: [E, E, E, E, E, E, E, E, E, E, SD, F, F],
    triggers: [
      { on: 'move', do: [{ t: 'ice', v: 1 }, { t: 'say', text: 'No floor tricks left. Just this.', life: 3.2 }] },
      { on: 'pastx', x: 3, do: [
        { t: 'crush', x: -2, y: 10, w: 2, h: 1, chase: 124, kill: true, solid: false, quake: false },
      ] },
      { on: 'pastx', x: 3, every: 2.6, do: [
        { t: 'fakedoor' },
        { t: 'door', x: 11, y: 10, d: 0.05 },
        { t: 'fakedoor', v: false, d: 0.7 },
        { t: 'fakedoor', d: 1.3 },
        { t: 'door', x: 20, y: 10, d: 1.35 },
        { t: 'fakedoor', v: false, d: 1.95 },
      ] },
      { on: 'pastx', x: 5, every: 2.0, do: [
        { t: 'spikes', x: 15, y: 10, w: 1, h: 1, from: 'up', hold: 0.8 },
      ] },
    ],
  },
  {
    name: 'Spite',
    chapter: 4,
    bonus: true,
    grid: [
      E, E, E, E, E, E, E, E, E, E,
      '..S..................D..',
      '####oooooooooooooooo####',
      '####oooooooooooooooo####',
    ],
    triggers: [
      { on: 'move', do: [
        { t: 'ice', v: 1 },
        { t: 'say', text: 'Ice, a floor that is leaving, and me.', life: 3.4 },
      ] },
      { on: 'pastx', x: 4, every: 1.7, do: [
        { t: 'spikes', x: 11, y: 10, w: 1, h: 1, from: 'up', hold: 0.8 },
        { t: 'spikes', x: 16, y: 10, w: 1, h: 1, from: 'up', hold: 0.8, d: 0.85 },
      ] },
      { on: 'pastx', x: 9, do: [
        { t: 'crush', x: 24, y: 10, w: 2, h: 1, vx: -245, sx: 0, kill: true, solid: false, quake: false },
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
  { name: 'Bad Faith', tag: 'It learns from your deaths.' },
  { name: 'The Grudge', tag: 'It has stopped pretending.' },
  { name: 'Contempt', tag: 'Now it comes for the controls.' },
  { name: 'The Toll', tag: 'The door was never free.' },
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
