// The levels. Each one is 24x13 tiles of deliberately boring geometry plus a list of
// triggers — the boring part is the setup, the triggers are the punchline.
//
// Grid legend:
//   .  empty        #  solid          S  spawn        D  door (this tile is its FOOT)
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
      { on: 'pastx', x: 4, every: 2.0, do: [
        { t: 'spikes', x: 8, y: 10, w: 2, h: 1, from: 'up', hold: 0.95 },
        { t: 'spikes', x: 18, y: 10, w: 1, h: 1, from: 'up', hold: 0.6, d: 0.5 },
        { t: 'spikes', x: 14, y: 10, w: 2, h: 1, from: 'up', hold: 0.95, d: 1.0 },
      ] },
    ],
  },
  {
    name: 'Sawmill',
    chapter: 3,
    nerve: [12, 8],
    grid: [
      E, E, E, E, E, E, E, E, E,
      '.......###.......###....',
      SD,
      F, F,
    ],
    triggers: [
      { on: 'pastx', x: 4, do: [
        { t: 'crush', x: 23, y: 10, w: 2, h: 1, vx: -165, sx: 0, bounce: true, kill: true, solid: false, quake: false },
        { t: 'say', text: 'The ledges are for standing on.', life: 3 },
      ] },
      // …and this is why they aren't
      { on: 'pastx', x: 11, do: [
        { t: 'crush', x: -2, y: 8, w: 2, h: 1, vx: 175, sx: 22, bounce: true, kill: true, solid: false, quake: false },
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
      { on: 'pastx', x: 3, every: 1.25, do: [
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
];

// index of the last level of the main run — everything after it is nerve-locked bonus
export const MAIN_LEVELS = LEVELS.findIndex((L) => L.bonus);

export const CHAPTERS = [
  { name: 'Ground Rules', tag: 'The floor is your friend.' },
  { name: 'Sharp Practice', tag: 'It was never your friend.' },
  { name: 'Malice', tag: 'Now it is personal.' },
  { name: 'Bad Faith', tag: 'It learns from your deaths.' },
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
