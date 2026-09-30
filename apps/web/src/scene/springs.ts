/** Damped springs for the camera: fast to react, slight overshoot, no teleporting. */
export class Spring {
  v = 0;
  constructor(public x = 0, private omega = 6, private zeta = 0.86) {}
  step(target: number, dt: number) {
    // Sub-step for stability on slow frames.
    let left = Math.min(dt, 0.1);
    while (left > 0) {
      const h = Math.min(left, 1 / 90);
      const a = this.omega * this.omega * (target - this.x) - 2 * this.zeta * this.omega * this.v;
      this.v += a * h;
      this.x += this.v * h;
      left -= h;
    }
    return this.x;
  }
  snap(x: number) { this.x = x; this.v = 0; }
}

export class Spring3 {
  x: Spring; y: Spring; z: Spring;
  constructor(x = 0, y = 0, z = 0, omega = 6, zeta = 0.86) {
    this.x = new Spring(x, omega, zeta); this.y = new Spring(y, omega, zeta); this.z = new Spring(z, omega, zeta);
  }
  step(tx: number, ty: number, tz: number, dt: number) {
    return [this.x.step(tx, dt), this.y.step(ty, dt), this.z.step(tz, dt)] as const;
  }
}

export const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
export const smoothstep = (t: number) => t * t * (3 - 2 * t);
export const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
