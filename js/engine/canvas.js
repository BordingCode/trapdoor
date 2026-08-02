// DPR-aware canvas that letterboxes a FIXED world into whatever box the CSS gives it.
// Every level is one screen, so we "contain" (never crop) — a cropped trap would be unfair.
export const TILE = 32;
export const COLS = 24;
export const ROWS = 13;
export const WORLD_W = COLS * TILE; // 768
export const WORLD_H = ROWS * TILE; // 416

export class CanvasView {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.scale = 1;
    this.offX = 0;
    this.offY = 0;
    this.cssW = 0;
    this.cssH = 0;
    this.dpr = 1;
    this.shakeX = 0;
    this.shakeY = 0;
    this.resize();
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const box = this.canvas.getBoundingClientRect();
    const cssW = Math.max(1, Math.round(box.width));
    const cssH = Math.max(1, Math.round(box.height));
    this.cssW = cssW;
    this.cssH = cssH;
    this.dpr = dpr;
    this.canvas.width = Math.round(cssW * dpr);
    this.canvas.height = Math.round(cssH * dpr);
    // contain-fit, snapped to a whole-ish scale so the flat blocks stay crisp
    this.scale = Math.min(cssW / WORLD_W, cssH / WORLD_H);
    this.offX = (cssW - WORLD_W * this.scale) / 2;
    this.offY = (cssH - WORLD_H * this.scale) / 2;
  }

  begin() {
    const ctx = this.ctx;
    const s = this.dpr * this.scale;
    ctx.setTransform(s, 0, 0, s, this.dpr * (this.offX + this.shakeX), this.dpr * (this.offY + this.shakeY));
  }

  // full canvas in device pixels, for clearing the letterbox bars
  clear(color) {
    const ctx = this.ctx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  toWorld(clientX, clientY) {
    const box = this.canvas.getBoundingClientRect();
    return {
      x: (clientX - box.left - this.offX) / this.scale,
      y: (clientY - box.top - this.offY) / this.scale,
    };
  }
}
