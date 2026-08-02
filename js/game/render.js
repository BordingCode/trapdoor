// Drawing only — reads world state, never changes it. The art is deliberately plain and
// tidy: the level has to look like a harmless tutorial right up until it isn't.
import { TILE, COLS, ROWS, WORLD_W, WORLD_H } from '../engine/canvas.js';

const C = {
  bg: '#12151d',
  bgDot: '#1b1f2b',
  block: '#39405240',
  blockFill: '#333a4a',
  blockTop: '#4b556d',
  blockEdge: '#262c39',
  mover: '#4a4030',
  moverTop: '#6b5c42',
  spike: '#e2586b',
  spikeDark: '#a8394a',
  acid: '#5fd97a',
  acidDark: '#2f8f47',
  door: '#f2c65c',
  doorDark: '#8a6a1f',
  player: '#f4f7ff',
  playerDark: '#1b1f2b',
  dart: '#e2586b',
};

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function block(ctx, x, y, w, h, fill, top, edge) {
  ctx.fillStyle = fill;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = top;
  ctx.fillRect(x, y, w, 3);
  ctx.fillStyle = edge;
  ctx.fillRect(x, y + h - 2, w, 2);
}

// A bank of triangles pointing away from the edge it grew out of.
function spikeBank(ctx, r, from, teeth) {
  ctx.fillStyle = C.spike;
  ctx.beginPath();
  if (from === 'up' || from === 'down') {
    const n = Math.max(1, teeth);
    const step = r.w / n;
    for (let i = 0; i < n; i++) {
      const x0 = r.x + i * step;
      if (from === 'up') {
        ctx.moveTo(x0, r.y + r.h); ctx.lineTo(x0 + step / 2, r.y); ctx.lineTo(x0 + step, r.y + r.h);
      } else {
        ctx.moveTo(x0, r.y); ctx.lineTo(x0 + step / 2, r.y + r.h); ctx.lineTo(x0 + step, r.y);
      }
    }
  } else {
    const n = Math.max(1, teeth);
    const step = r.h / n;
    for (let i = 0; i < n; i++) {
      const y0 = r.y + i * step;
      if (from === 'left') {
        ctx.moveTo(r.x, y0); ctx.lineTo(r.x + r.w, y0 + step / 2); ctx.lineTo(r.x, y0 + step);
      } else {
        ctx.moveTo(r.x + r.w, y0); ctx.lineTo(r.x, y0 + step / 2); ctx.lineTo(r.x + r.w, y0 + step);
      }
    }
  }
  ctx.fill();
  ctx.fillStyle = C.spikeDark;
  if (from === 'up') ctx.fillRect(r.x, r.y + r.h - 3, r.w, 3);
  else if (from === 'down') ctx.fillRect(r.x, r.y, r.w, 3);
  else if (from === 'left') ctx.fillRect(r.x, r.y, 3, r.h);
  else ctx.fillRect(r.x + r.w - 3, r.y, 3, r.h);
}

function arrow(ctx, x, y, ang, len) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(ang);
  ctx.setLineDash([]);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-len, 0); ctx.lineTo(len, 0);
  ctx.moveTo(len, 0); ctx.lineTo(len - 6, -5);
  ctx.moveTo(len, 0); ctx.lineTo(len - 6, 5);
  ctx.stroke();
  ctx.restore();
}

export function render(view, w, fx, t) {
  const ctx = view.ctx;
  view.clear('#0a0c12');
  view.begin();

  // ---- background
  ctx.fillStyle = C.bg;
  ctx.fillRect(0, 0, WORLD_W, WORLD_H);
  ctx.fillStyle = C.bgDot;
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
    ctx.fillRect(x * TILE + TILE / 2 - 1, y * TILE + TILE / 2 - 1, 2, 2);
  }

  // ---- tiles
  for (let ty = 0; ty < ROWS; ty++) {
    for (let tx = 0; tx < COLS; tx++) {
      const c = w.grid[ty][tx];
      const x = tx * TILE, y = ty * TILE;
      if (c === '#' || c === 'o' || c === '=') {
        // crumbling tiles wobble for the moment they spend deciding to betray you
        let ox = 0, oy = 0;
        const k = tx + ',' + ty;
        if (w.crumbling.has(k)) {
          const p = 1 - w.crumbling.get(k) / 0.32;
          ox = (Math.random() - 0.5) * 3 * p;
          oy = (Math.random() - 0.5) * 3 * p;
        }
        block(ctx, x + ox, y + oy, TILE, TILE, C.blockFill, C.blockTop, C.blockEdge);
        ctx.strokeStyle = 'rgba(0,0,0,0.18)';
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 0.5 + ox, y + 0.5 + oy, TILE - 1, TILE - 1);
      } else if (c === '^') {
        spikeBank(ctx, { x: x + 3, y: y + TILE * 0.38, w: TILE - 6, h: TILE * 0.62 }, 'up', 2);
      } else if (c === 'v') {
        spikeBank(ctx, { x: x + 3, y, w: TILE - 6, h: TILE * 0.62 }, 'down', 2);
      } else if (c === '~') {
        ctx.fillStyle = C.acid;
        ctx.fillRect(x, y + TILE * 0.3, TILE, TILE * 0.7);
      }
    }
  }

  // ---- acid flood
  if (w.acid) {
    const y = w.acid.y;
    ctx.fillStyle = 'rgba(95,217,122,0.22)';
    ctx.fillRect(0, y, WORLD_W, WORLD_H - y + 40);
    ctx.fillStyle = C.acid;
    for (let x = 0; x < WORLD_W; x += 8) {
      const b = Math.sin(t * 3 + x * 0.05) * 2.5;
      ctx.fillRect(x, y + b - 2, 8, 4);
    }
    ctx.fillStyle = 'rgba(47,143,71,0.5)';
    ctx.fillRect(0, y + 4, WORLD_W, WORLD_H - y);
  }

  // ---- door
  const d = w.door;
  const glow = 0.35 + d.open * 0.65 + Math.sin(t * 2) * 0.05;
  ctx.save();
  ctx.globalAlpha = d.fake ? 0.35 : 1;
  ctx.shadowColor = 'rgba(242,198,92,0.55)';
  ctx.shadowBlur = 16 * glow;
  ctx.fillStyle = C.doorDark;
  roundRect(ctx, d.x - 3, d.y - 3, d.w + 6, d.h + 3, 5);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = C.door;
  roundRect(ctx, d.x, d.y, d.w, d.h, 3);
  ctx.fill();
  // the crack of light widens as you get close
  ctx.fillStyle = 'rgba(255,246,214,' + (0.25 + d.open * 0.6).toFixed(3) + ')';
  ctx.fillRect(d.x + d.w / 2 - 1.5 - d.open * 3, d.y + 4, 3 + d.open * 6, d.h - 8);
  ctx.fillStyle = C.doorDark;
  ctx.fillRect(d.x + d.w - 8, d.y + d.h / 2 - 2, 4, 4);
  ctx.restore();

  // ---- movers (crushers, falling blocks, platforms)
  for (const m of w.movers) {
    if (m.delay > 0) continue;
    block(ctx, m.x, m.y, m.w, m.h, C.mover, C.moverTop, '#2b2519');
    ctx.strokeStyle = 'rgba(0,0,0,0.25)';
    ctx.lineWidth = 2;
    ctx.strokeRect(m.x + 1, m.y + 1, m.w - 2, m.h - 2);
    ctx.fillStyle = '#8a7550';
    const r = 3;
    ctx.fillRect(m.x + 4, m.y + 4, r, r);
    ctx.fillRect(m.x + m.w - 4 - r, m.y + 4, r, r);
    ctx.fillRect(m.x + 4, m.y + m.h - 4 - r, r, r);
    ctx.fillRect(m.x + m.w - 4 - r, m.y + m.h - 4 - r, r, r);
  }

  // ---- emerging spike banks
  for (const s of w.spikes) {
    if (s.t <= 0) continue;
    spikeBank(ctx, w.spikeRect(s), s.from, s.teeth);
  }

  // ---- darts
  for (const dt of w.darts) {
    ctx.fillStyle = C.dart;
    ctx.beginPath();
    if (dt.vx < 0) { ctx.moveTo(dt.x, dt.y + dt.h / 2); ctx.lineTo(dt.x + dt.w, dt.y); ctx.lineTo(dt.x + dt.w, dt.y + dt.h); }
    else { ctx.moveTo(dt.x + dt.w, dt.y + dt.h / 2); ctx.lineTo(dt.x, dt.y); ctx.lineTo(dt.x, dt.y + dt.h); }
    ctx.fill();
  }

  // ---- the nerve: a small cold light in a place you shouldn't want to stand
  if (w.nerve && !w.nerve.got) {
    const n = w.nerve;
    const cx = n.x + n.w / 2, cy = n.y + n.h / 2 + Math.sin(t * 2.6) * 2.5;
    const pulse = 0.6 + Math.sin(t * 3.4) * 0.4;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(t * 0.9);
    ctx.shadowColor = 'rgba(110,231,255,0.85)';
    ctx.shadowBlur = 10 + pulse * 10;
    ctx.fillStyle = '#6ee7ff';
    ctx.beginPath();
    ctx.moveTo(0, -8); ctx.lineTo(7, 0); ctx.lineTo(0, 8); ctx.lineTo(-7, 0);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#e8fbff';
    ctx.beginPath();
    ctx.moveTo(0, -3.5); ctx.lineTo(3, 0); ctx.lineTo(0, 3.5); ctx.lineTo(-3, 0);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // ---- the glimpse: what the level is still holding back
  if (w.glimpse > 0) {
    const fade = Math.min(1, w.glimpse * 3);
    const pulse = 0.55 + Math.sin(t * 9) * 0.2;
    ctx.save();
    ctx.globalAlpha = fade;
    ctx.fillStyle = 'rgba(110,231,255,0.05)';
    ctx.fillRect(0, 0, WORLD_W, WORLD_H);
    ctx.setLineDash([5, 4]);
    ctx.lineWidth = 1.6;
    for (const g of w.truth()) {
      const danger = g.kind !== 'phantom' && g.kind !== 'door';
      ctx.strokeStyle = danger ? `rgba(226,88,107,${(0.55 + pulse * 0.45).toFixed(2)})` : 'rgba(110,231,255,0.85)';
      ctx.fillStyle = danger ? 'rgba(226,88,107,0.13)' : 'rgba(110,231,255,0.13)';
      switch (g.kind) {
        case 'vanish':
        case 'phantom':
          ctx.fillRect(g.x, g.y, g.w, g.h);
          ctx.strokeRect(g.x + 1, g.y + 1, g.w - 2, g.h - 2);
          ctx.beginPath();
          ctx.moveTo(g.x + 3, g.y + 3); ctx.lineTo(g.x + g.w - 3, g.y + g.h - 3);
          ctx.moveTo(g.x + g.w - 3, g.y + 3); ctx.lineTo(g.x + 3, g.y + g.h - 3);
          ctx.stroke();
          break;
        case 'brittle':
          ctx.strokeStyle = 'rgba(242,198,92,0.75)';
          ctx.beginPath();
          ctx.moveTo(g.x + 5, g.y + g.h - 4); ctx.lineTo(g.x + 11, g.y + 8);
          ctx.lineTo(g.x + 17, g.y + g.h - 9); ctx.lineTo(g.x + g.w - 4, g.y + 5);
          ctx.stroke();
          break;
        case 'spikes': {
          const n = Math.max(1, Math.round(g.w / TILE) * 2);
          const step = g.w / n;
          ctx.beginPath();
          for (let i = 0; i < n; i++) {
            const x0 = g.x + i * step;
            if (g.from === 'down') { ctx.moveTo(x0, g.y); ctx.lineTo(x0 + step / 2, g.y + g.h); ctx.lineTo(x0 + step, g.y); }
            else { ctx.moveTo(x0, g.y + g.h); ctx.lineTo(x0 + step / 2, g.y); ctx.lineTo(x0 + step, g.y + g.h); }
          }
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          break;
        }
        case 'crush':
          ctx.fillRect(g.x, g.y, g.w, g.h);
          ctx.strokeRect(g.x + 1, g.y + 1, g.w - 2, g.h - 2);
          arrow(ctx, g.x + g.w / 2, g.y + g.h / 2, Math.atan2(g.vy, g.vx), 13);
          break;
        case 'dart':
          arrow(ctx, g.x + g.w / 2, g.y + g.h / 2, g.vx < 0 ? Math.PI : 0, 13);
          break;
        case 'door':
          ctx.setLineDash([4, 3]);
          ctx.strokeStyle = 'rgba(242,198,92,0.85)';
          ctx.strokeRect(g.x, g.y, g.w, g.h);
          break;
        case 'acid':
          ctx.strokeStyle = 'rgba(95,217,122,0.9)';
          ctx.beginPath();
          ctx.moveTo(0, g.y); ctx.lineTo(WORLD_W, g.y);
          ctx.stroke();
          break;
        case 'grav':
          arrow(ctx, WORLD_W - 22, WORLD_H / 2, g.v < 0 ? -Math.PI / 2 : Math.PI / 2, 18);
          break;
        default:
          break;
      }
      ctx.setLineDash([5, 4]);
    }
    ctx.restore();
  }

  // ---- player
  if (w.state !== 'dead') {
    const p = w.player;
    const sq = p.squash;
    const h = p.h * (1 - sq * 0.5);
    const wd = p.w * (1 + sq * 0.4);
    const px = p.x + (p.w - wd) / 2;
    const py = w.gravDir > 0 ? p.y + (p.h - h) : p.y;
    ctx.fillStyle = C.player;
    roundRect(ctx, px, py, wd, h, 4);
    ctx.fill();
    ctx.fillStyle = C.playerDark;
    const ey = py + (w.gravDir > 0 ? h * 0.32 : h * 0.5);
    const ex = px + wd / 2 + p.face * 3;
    ctx.fillRect(ex - 5, ey, 3, 4);
    ctx.fillRect(ex + 2, ey, 3, 4);
  }

  // ---- particles
  for (const p of fx.parts) {
    if (!p.live) continue;
    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, p.life / p.max));
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);
    ctx.fillStyle = p.col;
    ctx.fillRect(-p.s / 2, -p.s / 2, p.s, p.s);
    ctx.restore();
  }

  // ---- lights out
  if (w.dark > 0) {
    const p = w.player;
    const cx = p.x + p.w / 2, cy = p.y + p.h / 2;
    const g = ctx.createRadialGradient(cx, cy, 10, cx, cy, 118);
    g.addColorStop(0, 'rgba(8,9,14,0)');
    g.addColorStop(0.55, 'rgba(8,9,14,' + (w.dark * 0.55).toFixed(3) + ')');
    g.addColorStop(1, 'rgba(8,9,14,' + w.dark.toFixed(3) + ')');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, WORLD_W, WORLD_H);
  }

  // ---- taunt bubbles
  if (w.says.length) {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    // when gravity is flipped the player walks along the ceiling — get out of their way
    let y = w.gravDir < 0 ? WORLD_H - 34 - (w.says.length - 1) * 36 : 34;
    for (const s of w.says) {
      const a = Math.min(1, s.life * 2.5);
      ctx.font = '600 17px ui-monospace, "SF Mono", Menlo, Consolas, monospace';
      const wdt = ctx.measureText(s.text).width + 26;
      ctx.globalAlpha = a * 0.82;
      ctx.fillStyle = '#0a0c12';
      roundRect(ctx, WORLD_W / 2 - wdt / 2, y - 15, wdt, 30, 7);
      ctx.fill();
      ctx.strokeStyle = 'rgba(226,88,107,0.55)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.globalAlpha = a;
      ctx.fillStyle = '#f0e6e8';
      ctx.fillText(s.text, WORLD_W / 2, y + 1);
      y += 36;
    }
    ctx.globalAlpha = 1;
  }

  // ---- floating fx text (death cause etc.)
  for (const tx of fx.texts) {
    ctx.save();
    ctx.globalAlpha = Math.min(1, tx.life / 0.5);
    ctx.textAlign = 'center';
    ctx.font = '700 15px ui-monospace, Menlo, Consolas, monospace';
    ctx.fillStyle = tx.col;
    ctx.fillText(tx.str, tx.x, tx.y);
    ctx.restore();
  }

  // ---- level frame
  ctx.strokeStyle = 'rgba(255,255,255,0.05)';
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, WORLD_W - 2, WORLD_H - 2);
}
