import { Container, Graphics } from 'pixi.js';

/** "Looking through an old, dusty brass-framed magnifying lens" — replaces the previous
 *  neon/CRT scanline overlay entirely. No screen distortion is attempted (that would require the
 *  whole UI to be Pixi-rendered, not just this overlay — see Faz 14 notes); this is deliberately
 *  scoped to what an honest screen-space overlay CAN deliver: a strong corner vignette, a few
 *  static dust/scratch specks on the "glass", and a faint warm tint painted as a flat translucent
 *  rectangle (a Pixi *filter* here could only affect this layer's own sparse drawing, not the DOM
 *  game underneath — an actual painted, alpha-blended rectangle is what genuinely tints the view). */
export function createLensVignette(width: number, height: number) {
  const container = new Container();
  container.eventMode = 'none';

  const warmTint = new Graphics();
  const vignette = new Graphics();
  const specks = new Graphics();
  container.addChild(warmTint, vignette, specks);

  function drawWarmTint(w: number, h: number) {
    warmTint.clear();
    warmTint.rect(0, 0, w, h).fill({ color: 0xf0c987, alpha: 0.035 });
  }

  function drawVignette(w: number, h: number) {
    vignette.clear();
    const cx = w / 2;
    const cy = h / 2;
    const maxR = Math.sqrt(cx * cx + cy * cy);
    const rings = 14;
    for (let i = 0; i < rings; i++) {
      const t = i / (rings - 1);
      if (t < 0.55) continue; // inner half stays clear/bright
      const r = maxR * t;
      const alpha = ((t - 0.55) / 0.45) * 0.05;
      vignette.circle(cx, cy, r).stroke({ width: maxR * 0.08, color: 0x05020a, alpha });
    }
  }

  function drawSpecks(w: number, h: number) {
    specks.clear();
    let seed = 42;
    const rand = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };
    for (let i = 0; i < 18; i++) {
      const x = rand() * w;
      const y = rand() * h;
      const r = 0.6 + rand() * 1.4;
      specks.circle(x, y, r).fill({ color: 0xe8dcc0, alpha: 0.05 + rand() * 0.05 });
    }
  }

  function resize(w: number, h: number) {
    drawWarmTint(w, h);
    drawVignette(w, h);
    drawSpecks(w, h);
  }

  resize(width, height);

  function tick() {
    // Static by design — a lens doesn't animate. Kept for API symmetry with the other layers.
  }

  return { container, tick, resize };
}
