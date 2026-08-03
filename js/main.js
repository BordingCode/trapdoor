// Boot, screens, HUD. Everything that touches the DOM lives here.
import { CanvasView } from './engine/canvas.js';
import { GameLoop } from './engine/loop.js';
import { Controls } from './engine/input.js';
import { Fx } from './engine/fx.js';
import { World } from './game/world.js';
import { render } from './game/render.js';
import { LEVELS, CHAPTERS, TAUNTS, MAIN_LEVELS } from './game/levels.js';
import { load, save, wipe } from './game/save.js';
import { sfx, unlock, setMuted, isMuted } from './audio.js';

const $ = (s) => document.querySelector(s);

function el(tag, props = {}, ...kids) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === 'class') n.className = v;
    else if (k === 'html') n.innerHTML = v;
    else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
    else if (v !== null && v !== undefined) n.setAttribute(k, v);
  }
  for (const c of kids.flat()) if (c != null) n.append(c.nodeType ? c : document.createTextNode(c));
  return n;
}

const G = {
  save: load(),
  view: null,
  world: null,
  level: 0,
  time: 0,
  screen: 'title',
  running: false,
};

const fx = new Fx();
const canvas = $('#game');
const overlay = $('#overlay');
const view = new CanvasView(canvas);
G.view = view;

const controls = new Controls({ left: $('#pad-left'), right: $('#pad-right'), jump: $('#pad-jump') });
controls.onKey = (k) => {
  if (G.screen !== 'play') return;
  if (k === 'Escape' || k === 'p' || k === 'P') showPause();
  if (k === 'r' || k === 'R') restart();
  if (k === 'e' || k === 'E' || k === 'Shift') tryGlimpse();
};

// ---------------------------------------------------------------- loop
const loop = new GameLoop({ update, render: draw });

function update(dt) {
  if (G.screen !== 'play' || !G.world) return;
  const w = G.world;
  const inp = { left: controls.left, right: controls.right, jumpHeld: controls.jumpHeld, jumpPressed: controls.consumeJump() };
  if (w.state === 'play') G.time += dt;
  w.step(dt, inp);
  drainEvents(w);
  fx.step(dt);

  if (w.state === 'dead' && w.stateT > 0.55) {
    w.reset();
    fx.clear();
  } else if (w.state === 'won' && w.stateT > 0.8) {
    finishLevel();
  }
}

function draw() {
  if (!G.world) { view.clear('#0a0c12'); return; }
  const s = fx.shakeOffset();
  view.shakeX = s.x; view.shakeY = s.y;
  render(view, G.world, fx, performance.now() / 1000);
  updateHud();
}

function drainEvents(w) {
  for (const e of w.events) {
    const p = w.player;
    switch (e.name) {
      case 'jump': sfx.jump(); fx.dust(p.x + p.w / 2, p.y + p.h, 4); break;
      case 'land': sfx.land(); fx.dust(p.x + p.w / 2, p.y + p.h, 5); break;
      case 'crumble': sfx.crumble(); break;
      case 'collapse': fx.burst(e.a, e.b, 8, '#3d4455', { speed: 130, size: 6, life: 0.7 }); fx.quake(3); break;
      case 'trap': sfx.trap(); fx.quake(4); break;
      case 'spike': sfx.spike(); fx.quake(3); fx.burst(e.a, e.b, 5, '#e2586b', { speed: 110, size: 4, life: 0.35 }); break;
      case 'dart': sfx.click(); break;
      case 'tick': fx.burst(e.a, e.b, 4, '#e2586b', { speed: 90, size: 3, life: 0.3 }); break;
      case 'slam': sfx.slam(); fx.quake(7); fx.dust(e.a, e.b, 10); break;
      case 'doormove': sfx.trap(); fx.quake(4); break;
      case 'taunt': sfx.taunt(); break;
      case 'shake': fx.quake(e.a); break;
      case 'nerve': onNerve(e.a, e.b); break;
      case 'nervelost': onNerveLost(e.a, e.b); break;
      case 'glimpse': sfx.glimpse(); fx.quake(2, 0.15); break;
      case 'locked': sfx.click(); fx.quake(2, 0.12); fx.text(e.a, e.b - 30, 'LOCKED', '#6ee7ff', 1.2); break;
      case 'die': onDeath(w, e.a, e.b, e.c); break;
      case 'win': onWin(w); break;
      default: break;
    }
  }
  w.events.length = 0;
}

function onDeath(w, x, y, cause) {
  sfx.die();
  fx.quake(9, 0.4);
  fx.burst(x, y, 16, '#f4f7ff', { speed: 240, size: 6, life: 0.75 });
  if (cause === 'spike' || cause === 'dart') fx.burst(x, y, 8, '#e2586b', { speed: 200, size: 5, life: 0.6 });
  if (cause === 'acid') fx.burst(x, y, 10, '#5fd97a', { speed: 190, size: 5, life: 0.6 });
  navigator.vibrate?.(30);

  const s = G.save;
  s.deaths[G.level] = (s.deaths[G.level] || 0) + 1;
  s.total = (s.total || 0) + 1;
  save(s);

  const n = s.deaths[G.level];
  if (n >= 4 && n % 4 === 0) {
    const t = TAUNTS[Math.floor(Math.random() * TAUNTS.length)];
    w.says.push({ text: t, life: 2.6 });
  }
}

// You are only CARRYING it now. It banks at the door — see finishLevel.
function onNerve(x, y) {
  sfx.nerve();
  fx.burst(x, y, 18, '#6ee7ff', { speed: 190, size: 5, life: 0.8, g: 0.3 });
  fx.text(x, y - 14, 'NERVE — NOW GET OUT', '#6ee7ff', 1.8);
  fx.quake(3);
  navigator.vibrate?.([12, 30, 12]);
  updateHud();
}

// …and dying drops it back where it was.
function onNerveLost(x, y) {
  sfx.nerveLost();
  fx.burst(x, y, 12, '#3f8ba0', { speed: 150, size: 4, life: 0.7 });
  fx.text(x, y - 24, 'NERVE DROPPED', '#7fb2c4', 1.7);
  updateHud();
}

function tryGlimpse() {
  const s = G.save;
  if (G.screen !== 'play' || !G.world) return;
  if ((s.nerve || 0) <= 0 || !G.world.useGlimpse()) {
    sfx.click();
    return;
  }
  s.nerve -= 1;
  save(s);
  const b = $('#btn-glimpse');
  b.classList.remove('flash');
  void b.offsetWidth;   // restart the animation
  b.classList.add('flash');
  updateHud();
}

// how many of a chapter's nerves you've found (bonus levels don't carry one)
function chapterNerves(ci) {
  let got = 0, total = 0;
  LEVELS.forEach((L, i) => {
    if (L.chapter !== ci || L.bonus || !L.nerve) return;
    total++;
    if (G.save.nerves[i]) got++;
  });
  return { got, total };
}

function bonusUnlocked(ci) {
  const { got, total } = chapterNerves(ci);
  return total > 0 && got >= total;
}

function onWin(w) {
  sfx.door();
  sfx.win();
  fx.burst(w.door.x + w.door.w / 2, w.door.y + w.door.h / 2, 22, '#f2c65c', { speed: 210, size: 5, life: 0.9, g: 0.5 });
  navigator.vibrate?.([20, 40, 30]);
}

// ---------------------------------------------------------------- flow
function startLevel(i) {
  G.level = Math.max(0, Math.min(LEVELS.length - 1, i));
  G.world = new World(LEVELS[G.level], { nerveBanked: !!G.save.nerves[G.level] });
  G.time = 0;
  fx.clear();
  controls.release();
  setScreen('play');
  hideOverlay();
  loop.start();
}

function restart() {
  if (!G.world) return;
  G.world.reset();
  G.time = 0;
  fx.clear();
  controls.release();
}

function finishLevel() {
  const s = G.save;
  // the door is the bank: a nerve only counts if you carried it here alive
  if (G.world && G.world.holdingNerve() && !s.nerves[G.level]) {
    s.nerves[G.level] = true;
    s.nerve = (s.nerve || 0) + 1;
    G.world.nerveBanked = true;
  }
  s.cleared[G.level] = true;
  // `unlocked` is a count, not an index: clearing level i opens level i+1
  if (G.level + 2 > (s.unlocked || 1)) s.unlocked = Math.min(LEVELS.length, G.level + 2);
  const prev = s.best[G.level];
  if (prev == null || G.time < prev) s.best[G.level] = G.time;
  save(s);
  loop.stop();

  if (LEVELS[G.level].bonus) { showClear(); return; }
  const isLast = G.level === MAIN_LEVELS - 1;
  const chapterEnds = !isLast && LEVELS[G.level + 1].chapter !== LEVELS[G.level].chapter;
  if (isLast) showEnding();
  else if (chapterEnds) showChapterEnd(LEVELS[G.level].chapter);
  else showClear();
}

function setScreen(name) {
  G.screen = name;
  document.body.classList.toggle('playing', name === 'play');
}

function showOverlay(node) {
  overlay.replaceChildren(node);
  overlay.classList.add('on');
  controls.release();
}
function hideOverlay() {
  overlay.classList.remove('on');
  overlay.replaceChildren();
}

function card(cls, ...kids) { return el('div', { class: 'card ' + cls }, ...kids); }
function button(label, fn, cls = '') {
  return el('button', { class: 'btn ' + cls, type: 'button', onclick: () => { unlock(); sfx.click(); fn(); } }, label);
}

function fmt(t) { return t.toFixed(1) + 's'; }

// ---- title
function showTitle() {
  setScreen('title');
  loop.stop();
  G.world = null;
  view.clear('#0a0c12');
  const s = G.save;
  const next = Math.min(s.unlocked || 1, LEVELS.length);
  showOverlay(card('title',
    el('h1', {}, 'TRAPDOOR'),
    el('p', { class: 'sub' }, 'A short platformer. The levels cheat.'),
    el('div', { class: 'stack' },
      button(s.cleared.filter(Boolean).length ? 'Continue — level ' + next : 'Start', () => startLevel(next - 1), 'primary'),
      button('Levels', showSelect),
      button(isMuted() ? 'Sound: off' : 'Sound: on', toggleMute, 'ghost'),
    ),
    el('p', { class: 'hint' },
      'Every level hides a ', el('b', {}, '◆ nerve'),
      ' somewhere the safe route does not go, and ', el('b', {}, 'the door will not open without it'),
      '. Drop it — die — and it goes back. Spend one to glimpse what the level is about to do to you.'),
    el('p', { class: 'foot' }, s.total ? 'Deaths so far: ' + s.total + ' · nerve banked: ' + (s.nerve || 0)
      : 'Arrows / WASD · Space to jump · E to glimpse'),
  ));
}

function toggleMute() {
  const m = !isMuted();
  setMuted(m);
  G.save.muted = m;
  save(G.save);
  if (G.screen === 'title') showTitle();
  $('#btn-mute').classList.toggle('off', m);
}

// ---- level select
function showSelect() {
  setScreen('select');
  loop.stop();
  const s = G.save;
  const chapters = CHAPTERS.map((ch, ci) => {
    const cn = chapterNerves(ci);
    const items = LEVELS.map((L, i) => [L, i]).filter(([L]) => L.chapter === ci).map(([L, i]) => {
      const locked = L.bonus ? !bonusUnlocked(ci) : i > (s.unlocked || 1) - 1;
      return el('button', {
        class: 'lvl' + (locked ? ' locked' : '') + (s.cleared[i] ? ' done' : '') + (L.bonus ? ' bonus' : ''),
        type: 'button',
        disabled: locked ? '' : null,
        onclick: () => { if (!locked) { unlock(); sfx.click(); startLevel(i); } },
      },
        el('span', { class: 'n' }, L.bonus ? '◆' : String(i + 1)),
        el('span', { class: 'nm' }, locked ? (L.bonus ? 'Locked — ' + cn.got + '/' + cn.total + ' ◆' : '???') : L.name),
        el('span', { class: 'nv' }, !locked && s.nerves[i] ? '◆' : ''),
        el('span', { class: 'dd' }, locked ? '' : (s.best[i] != null ? fmt(s.best[i]) : '')),
      );
    });
    return el('section', { class: 'chapter' },
      el('h3', {}, ch.name, el('em', {}, cn.got + '/' + cn.total + ' ◆')),
      el('div', { class: 'grid' }, items),
    );
  });
  showOverlay(card('select',
    el('h2', {}, 'Levels'),
    el('div', { class: 'scroll' }, chapters),
    el('div', { class: 'stack row' },
      button('Back', showTitle, 'ghost'),
      button('Wipe save', () => { if (confirm('Erase all progress?')) { wipe(); G.save = load(); showTitle(); } }, 'ghost danger'),
    ),
  ));
}

// ---- level cleared
function showClear() {
  setScreen('clear');
  const s = G.save;
  const L = LEVELS[G.level];
  const d = s.deaths[G.level] || 0;
  const gotNerve = !!s.nerves[G.level];
  const ci = L.chapter;
  const cn = chapterNerves(ci);
  const justOpened = !L.bonus && bonusUnlocked(ci) && !s.bonusSeen?.[ci];
  if (justOpened) { s.bonusSeen = s.bonusSeen || {}; s.bonusSeen[ci] = true; save(s); sfx.chapter(); }

  showOverlay(card('clear',
    el('h2', {}, 'Door reached'),
    el('p', { class: 'sub' }, L.name),
    el('div', { class: 'stats' },
      el('div', {}, el('b', {}, fmt(G.time)), el('span', {}, 'time')),
      el('div', {}, el('b', {}, String(d)), el('span', {}, d === 1 ? 'death' : 'deaths')),
    ),
    L.nerve ? el('p', { class: 'hint' },
      gotNerve ? el('b', {}, '◆ Nerve banked') : 'Nerve already banked.',
      ' — ' + CHAPTERS[ci].name + ' ' + cn.got + '/' + cn.total)
      : null,
    justOpened ? el('p', { class: 'hint' }, el('b', {}, '◆ Bonus level unlocked'), ' — find it in Levels.') : null,
    el('div', { class: 'stack' },
      L.bonus ? null : button('Next level', () => startLevel(G.level + 1), 'primary'),
      button(L.bonus ? 'Levels' : 'Replay', () => (L.bonus ? showSelect() : startLevel(G.level)), L.bonus ? 'primary' : 'ghost'),
      L.bonus ? null : button('Levels', showSelect, 'ghost'),
    ),
  ));
}

function showChapterEnd(ci) {
  setScreen('clear');
  const ch = CHAPTERS[ci];
  const nx = CHAPTERS[ci + 1];
  sfx.chapter();
  showOverlay(card('clear chapter',
    el('p', { class: 'kicker' }, 'Chapter ' + (ci + 1) + ' complete'),
    el('h2', {}, ch.name),
    el('p', { class: 'sub' }, nx ? 'Next: ' + nx.name + ' — ' + nx.tag : ''),
    el('div', { class: 'stack' },
      button('Continue', () => startLevel(G.level + 1), 'primary'),
      button('Levels', showSelect, 'ghost'),
    ),
  ));
}

function showEnding() {
  setScreen('clear');
  sfx.chapter();
  const s = G.save;
  showOverlay(card('clear ending',
    el('p', { class: 'kicker' }, 'You got out'),
    el('h2', {}, 'THE END'),
    el('p', { class: 'sub' }, 'Every door was real. Eventually.'),
    el('div', { class: 'stats' },
      el('div', {}, el('b', {}, String(s.total || 0)), el('span', {}, 'total deaths')),
      // count the nerves that exist, not every key in the save — bonus levels carry none
      el('div', {}, el('b', {}, String(LEVELS.filter((L, i) => L.nerve && s.nerves[i]).length) + '/' + MAIN_LEVELS), el('span', {}, 'nerve')),
    ),
    el('p', { class: 'hint' }, 'Every nerve you left behind is still down there. Collect a whole chapter to open its bonus level.'),
    el('div', { class: 'stack' },
      button('Level select', showSelect, 'primary'),
      button('Title', showTitle, 'ghost'),
    ),
  ));
}

function showPause() {
  if (G.screen !== 'play') return;
  setScreen('pause');
  loop.stop();
  showOverlay(card('pause',
    el('h2', {}, 'Paused'),
    el('p', { class: 'sub' }, (G.level + 1) + '. ' + LEVELS[G.level].name),
    el('div', { class: 'stack' },
      button('Resume', () => { setScreen('play'); hideOverlay(); loop.start(); }, 'primary'),
      button('Restart level', () => { setScreen('play'); hideOverlay(); restart(); loop.start(); }, 'ghost'),
      button('Levels', showSelect, 'ghost'),
    ),
  ));
}

// ---------------------------------------------------------------- hud
function updateHud() {
  const s = G.save;
  const L = LEVELS[G.level];
  $('#hud-lvl').textContent = L.bonus ? '◆' : String(G.level + 1);
  $('#hud-name').textContent = L.name;
  $('#hud-deaths').textContent = '×' + (s.deaths[G.level] || 0);
  $('#hud-time').textContent = G.time.toFixed(1);
  const n = s.nerve || 0;
  $('#glimpse-n').textContent = String(n);
  const holding = !!(G.world && G.world.holdingNerve());
  $('#glimpse-hold').textContent = holding ? '+1' : '';
  const b = $('#btn-glimpse');
  b.classList.toggle('spent', n <= 0);
  b.classList.toggle('holding', holding);
}

// ---------------------------------------------------------------- boot
function fit() { view.resize(); if (G.world) draw(); }
window.addEventListener('resize', fit);
window.addEventListener('orientationchange', () => setTimeout(fit, 120));
if (window.ResizeObserver) new ResizeObserver(fit).observe($('#stage'));

document.addEventListener('visibilitychange', () => {
  if (document.hidden && G.screen === 'play') showPause();
});

$('#btn-back').addEventListener('click', () => { unlock(); sfx.click(); G.screen === 'play' ? showPause() : showTitle(); });
$('#btn-mute').addEventListener('click', () => { unlock(); toggleMute(); });
$('#btn-glimpse').addEventListener('click', () => { unlock(); tryGlimpse(); });
window.addEventListener('pointerdown', unlock, { once: true });
window.addEventListener('keydown', unlock, { once: true });

setMuted(G.save.muted);
$('#btn-mute').classList.toggle('off', G.save.muted);
if (!matchMedia('(pointer: coarse)').matches) document.body.classList.add('has-keyboard');

showTitle();
document.body.classList.remove('loading');

// test hooks (see docs/verification): drive the game from a browser test
window.__errors = [];
window.addEventListener('error', (e) => window.__errors.push(String(e.message)));
window.addEventListener('unhandledrejection', (e) => window.__errors.push(String(e.reason)));
window.__td = {
  G, LEVELS, fx, controls, loop,
  start: startLevel,
  world: () => G.world,
  state: () => G.world && ({
    screen: G.screen, level: G.level, name: LEVELS[G.level].name, state: G.world.state,
    x: Math.round(G.world.player.x), y: Math.round(G.world.player.y),
    grounded: G.world.player.grounded, deaths: G.save.deaths[G.level] || 0, time: G.time,
  }),
  hold: (k, v) => { controls.keys[k] = v; controls._recompute(); },
  win: () => { if (G.world) { G.world.state = 'won'; G.world.stateT = 1; } },
};

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
  navigator.serviceWorker.addEventListener?.('controllerchange', () => location.reload());
}
