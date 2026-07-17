import { BlurFilter, Container, Graphics } from 'pixi.js';

/** "Garabetler Kabinesi" table atmosphere: 2-3 fixed warm light pools (imagined candles/gas
 *  lamps at the table's corners) that flicker gently, no shaders needed — plain `Graphics`
 *  circles with a soft blur, modulated in opacity/scale by a slow sine wave per pool so each
 *  flickers independently instead of in lockstep. */

export const CANDLELIGHT_PALETTES = {
  COMMON: 0xd9a441,
  UNCOMMON: 0xd9a441,
  RARE: 0xc2542f,
  LEGENDARY: 0xf0b23a,
} as const;

interface Pool {
  gfx: Graphics;
  baseRadius: number;
  baseAlpha: number;
  phase: number;
  speed: number;
  anchorX: number; // 0..1, fraction of width
  anchorY: number; // 0..1, fraction of height
}

export function createCandlelightBackground(width: number, height: number) {
  const container = new Container();
  container.filters = [new BlurFilter({ strength: 24 })];

  const anchors: Array<[number, number]> = [
    [0.06, 0.08],
    [0.94, 0.12],
    [0.08, 0.92],
  ];

  let color: number = CANDLELIGHT_PALETTES.COMMON;

  const pools: Pool[] = anchors.map(([ax, ay], i) => {
    const gfx = new Graphics();
    container.addChild(gfx);
    return {
      gfx,
      baseRadius: Math.max(width, height) * 0.22,
      baseAlpha: 0.16,
      phase: i * 2.1,
      speed: 0.6 + i * 0.15,
      anchorX: ax,
      anchorY: ay,
    };
  });

  let time = 0;

  function draw(w: number, h: number) {
    for (const p of pools) {
      const flicker = Math.sin(time * p.speed + p.phase) * 0.5 + Math.sin(time * p.speed * 2.3 + p.phase) * 0.2;
      const radius = p.baseRadius * (1 + flicker * 0.12);
      const alpha = Math.max(0, p.baseAlpha * (1 + flicker * 0.35));
      p.gfx.clear();
      p.gfx.circle(w * p.anchorX, h * p.anchorY, radius).fill({ color, alpha });
    }
  }

  draw(width, height);

  function tick(deltaSeconds: number) {
    time += deltaSeconds;
  }

  function setPalette(rarity: keyof typeof CANDLELIGHT_PALETTES) {
    color = CANDLELIGHT_PALETTES[rarity];
  }

  function resize(w: number, h: number) {
    for (const p of pools) p.baseRadius = Math.max(w, h) * 0.22;
    draw(w, h);
  }

  // Redraw every tick too (flicker needs it), resize just updates radii.
  const originalTick = tick;
  function tickAndDraw(deltaSeconds: number, w: number, h: number) {
    originalTick(deltaSeconds);
    draw(w, h);
  }

  return { container, tick: tickAndDraw, setPalette, resize };
}
