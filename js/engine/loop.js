// Fixed-timestep loop: update() at a fixed 1/60s, render(alpha) once per frame.
// Physics must never run off a raw frame delta or jumps change height per device.
export class GameLoop {
  constructor({ update, render, step = 1 / 60, maxSteps = 5 }) {
    this.update = update;
    this.render = render;
    this.step = step;
    this.maxSteps = maxSteps;
    this.acc = 0;
    this.last = 0;
    this.running = false;
    this.raf = 0;
    this._tick = this._tick.bind(this);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.last = 0; // avoid a huge dt on resume
    });
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.last = 0;
    this.acc = 0;
    this.raf = requestAnimationFrame(this._tick);
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }

  _tick(now) {
    if (!this.running) return;
    this.raf = requestAnimationFrame(this._tick);
    if (document.hidden) return;
    const t = now / 1000;
    if (!this.last) this.last = t;
    let frame = t - this.last;
    this.last = t;
    if (frame > 0.25) frame = 0.25; // clamp after a stall
    this.acc += frame;
    let steps = 0;
    while (this.acc >= this.step && steps < this.maxSteps) {
      this.update(this.step);
      this.acc -= this.step;
      steps++;
    }
    if (steps === this.maxSteps) this.acc = 0; // drop the backlog
    this.render(this.acc / this.step);
  }
}
