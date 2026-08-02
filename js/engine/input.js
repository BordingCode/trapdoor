// Left / right / jump — keyboard and on-screen pads.
// Pads are hit-tested against live pointer positions rather than using per-element
// listeners, so a thumb can SLIDE from left to right without lifting (and a second
// finger can jump at the same time). pointercancel just drops that pointer.
export class Controls {
  constructor(pads) {
    this.pads = pads;                 // { left, right, jump } DOM elements
    this.pointers = new Map();        // pointerId -> {x, y}
    this.keys = { left: false, right: false, jump: false };
    this.touch = { left: false, right: false, jump: false };
    this.left = false;
    this.right = false;
    this.jumpHeld = false;
    this.jumpPressed = false;         // rising edge, consumed by the sim
    this.usedTouch = false;
    this.onKey = null;                // (key) => void, for R / Escape

    const upd = (e) => { this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY }); this._recompute(); };
    const drop = (e) => { this.pointers.delete(e.pointerId); this._recompute(); };

    for (const el of Object.values(pads)) {
      if (!el) continue;
      el.addEventListener('pointerdown', (e) => {
        this.usedTouch = true;
        e.preventDefault();
        upd(e);
      }, { passive: false });
    }
    window.addEventListener('pointermove', (e) => { if (this.pointers.has(e.pointerId)) upd(e); }, { passive: true });
    window.addEventListener('pointerup', drop);
    window.addEventListener('pointercancel', drop);
    window.addEventListener('blur', () => { this.pointers.clear(); this.keys.left = this.keys.right = this.keys.jump = false; this._recompute(); });

    window.addEventListener('keydown', (e) => {
      if (e.repeat) { if (this._mapKey(e.key)) e.preventDefault(); return; }
      const k = this._mapKey(e.key);
      if (k) { this.keys[k] = true; e.preventDefault(); this._recompute(); return; }
      if (this.onKey) this.onKey(e.key);
    });
    window.addEventListener('keyup', (e) => {
      const k = this._mapKey(e.key);
      if (k) { this.keys[k] = false; this._recompute(); }
    });
  }

  _mapKey(key) {
    switch (key) {
      case 'ArrowLeft': case 'a': case 'A': return 'left';
      case 'ArrowRight': case 'd': case 'D': return 'right';
      case ' ': case 'ArrowUp': case 'w': case 'W': case 'z': case 'Z': return 'jump';
      default: return null;
    }
  }

  _hit(el, p) {
    if (!el) return false;
    const r = el.getBoundingClientRect();
    if (r.width === 0) return false;
    return p.x >= r.left && p.x <= r.right && p.y >= r.top && p.y <= r.bottom;
  }

  _recompute() {
    const t = { left: false, right: false, jump: false };
    for (const p of this.pointers.values()) {
      if (this._hit(this.pads.left, p)) t.left = true;
      else if (this._hit(this.pads.right, p)) t.right = true;
      else if (this._hit(this.pads.jump, p)) t.jump = true;
    }
    this.touch = t;
    this.left = t.left || this.keys.left;
    this.right = t.right || this.keys.right;
    const jump = t.jump || this.keys.jump;
    if (jump && !this.jumpHeld) this.jumpPressed = true;
    this.jumpHeld = jump;
    for (const [name, el] of Object.entries(this.pads)) {
      if (el) el.classList.toggle('down', !!t[name]);
    }
  }

  consumeJump() { const j = this.jumpPressed; this.jumpPressed = false; return j; }

  release() {
    this.pointers.clear();
    this.keys.left = this.keys.right = this.keys.jump = false;
    this._recompute();
    this.jumpPressed = false;
  }
}
