import { Container, Graphics } from 'pixi.js';

interface Particle {
  gfx: Graphics;
  vx: number;
  vy: number;
  gravity: number;
  rotationSpeed: number;
  life: number;
  maxLife: number;
  /** Ambient dust motes never truly expire — they respawn at the bottom instead of being culled,
   *  keeping a steady, slowly-drifting pool going for as long as the layer is mounted. */
  ambient?: boolean;
  /** A stationary vine curve — fades in, holds, fades out; never moves via vx/vy. */
  vine?: boolean;
  /** An expanding ring — grows via scale instead of moving, alpha fades as it grows. */
  shockwave?: boolean;
}

/** A minimal, dependency-free particle pool driven straight off the Pixi ticker — no physics
 *  engine needed for a few dozen short-lived sparks/shatter shards at once. */
export function createParticleSystem() {
  const container = new Container();
  const particles: Particle[] = [];

  // A single permanent, fully invisible (alpha 0) shape, added immediately so the container is
  // never truly empty on its very first rendered frames. Without this, a layer whose particle
  // container starts empty (no ambient dust seeded into it, e.g. the board-fx burst-effects
  // layer) silently fails to render any Graphics added to it later — spawnSpark/spawnShatter/
  // spawnShockwave would all draw into the scene graph correctly (confirmed via direct
  // inspection: right child count, right position, right alpha/scale every tick) yet never
  // actually paint a pixel. A layer that already has a child from frame one (like the 'board'
  // variant's ambient dust) never hits this — so this is the minimal, harmless equalizer.
  const keepAlive = new Graphics();
  keepAlive.circle(0, 0, 1).fill({ color: 0xffffff, alpha: 1 });
  keepAlive.alpha = 0;
  container.addChild(keepAlive);

  /** An organic vine/root curve connecting two stones (used on an Amber-sealed connection) — a
   *  single tapering, gently bulging curve instead of a scattered dotted "laser" trail, with a
   *  couple of small glinting "leaf" motes drifting off along its length. */
  function spawnSpark(fromX: number, fromY: number, toX: number, toY: number, color: number) {
    const dx = toX - fromX;
    const dy = toY - fromY;
    const dist = Math.hypot(dx, dy) || 1;
    const mx = (fromX + toX) / 2;
    const my = (fromY + toY) / 2;
    const normalX = -dy / dist;
    const normalY = dx / dist;
    const bulge = (8 + Math.random() * 8) * (Math.random() < 0.5 ? 1 : -1);
    const ctrlX = mx + normalX * bulge;
    const ctrlY = my + normalY * bulge;

    const vine = new Graphics();
    vine.moveTo(fromX, fromY).quadraticCurveTo(ctrlX, ctrlY, toX, toY).stroke({ width: 3, color, alpha: 0.9, cap: 'round' });
    container.addChild(vine);
    particles.push({
      gfx: vine,
      vx: 0,
      vy: 0,
      gravity: 0,
      rotationSpeed: 0,
      life: 0,
      maxLife: 0.7,
      vine: true,
    });

    const leafCount = Math.min(4, Math.max(2, Math.round(dist / 24)));
    for (let i = 1; i <= leafCount; i++) {
      const t = i / (leafCount + 1);
      const qx = (1 - t) * (1 - t) * fromX + 2 * (1 - t) * t * ctrlX + t * t * toX;
      const qy = (1 - t) * (1 - t) * fromY + 2 * (1 - t) * t * ctrlY + t * t * toY;
      const leaf = new Graphics();
      leaf.circle(0, 0, 2 + Math.random()).fill({ color, alpha: 0.95 });
      leaf.x = qx;
      leaf.y = qy;
      container.addChild(leaf);
      particles.push({
        gfx: leaf,
        vx: (Math.random() - 0.5) * 8,
        vy: -(6 + Math.random() * 10),
        gravity: 0,
        rotationSpeed: 0,
        life: 0,
        maxLife: 0.5 + Math.random() * 0.3,
      });
    }
  }

  /** A circular energy pulse expanding outward from a stone the instant it locks into place —
   *  fires on every placement, not just Amber-sealed ones. */
  function spawnShockwave(x: number, y: number, color: number = 0xd9a441) {
    const gfx = new Graphics();
    // Radius tuned to clearly outgrow a domino tile's own half-width before it's done fading —
    // a ring that never grows past the tile it's confirming would stay hidden behind it the
    // whole time (tiles are drawn as opaque DOM elements above this canvas).
    gfx.circle(0, 0, 20).stroke({ width: 5, color, alpha: 1 });
    gfx.x = x;
    gfx.y = y;
    gfx.scale.set(0.2);
    container.addChild(gfx);
    particles.push({
      gfx,
      vx: 0,
      vy: 0,
      gravity: 0,
      rotationSpeed: 0,
      life: 0,
      maxLife: 0.45,
      shockwave: true,
    });
  }

  function spawnShatter(x: number, y: number, color: number, count = 14) {
    for (let i = 0; i < count; i++) {
      const gfx = new Graphics();
      const size = 3 + Math.random() * 5;
      gfx.poly([0, -size, size * 0.8, size * 0.6, -size * 0.8, size * 0.6]).fill({ color, alpha: 0.9 });
      gfx.x = x;
      gfx.y = y;
      const angle = Math.random() * Math.PI * 2;
      const speed = 60 + Math.random() * 140;
      container.addChild(gfx);
      particles.push({
        gfx,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 40,
        gravity: 280,
        rotationSpeed: (Math.random() - 0.5) * 10,
        life: 0,
        maxLife: 0.8 + Math.random() * 0.5,
      });
    }
  }

  let ambientBounds = { width: 0, height: 0 };

  /** A small pool of dust motes that drift slowly upward and fade in/out in a loop — reseeded
   *  whenever the layer resizes so they always cover the current board area. Idempotent: calling
   *  it again just refreshes the bounds motes respawn within, it doesn't stack up new pools. */
  function setAmbientDustBounds(width: number, height: number) {
    ambientBounds = { width, height };
    const existing = particles.filter((p) => p.ambient).length;
    const target = 6;
    for (let i = existing; i < target; i++) {
      const gfx = new Graphics();
      gfx.circle(0, 0, 1 + Math.random() * 1.2).fill({ color: 0xe8dcc0, alpha: 0.5 });
      container.addChild(gfx);
      particles.push(makeAmbientDust(gfx));
    }
  }

  function makeAmbientDust(gfx: Graphics): Particle {
    gfx.x = Math.random() * ambientBounds.width;
    gfx.y = ambientBounds.height + 10;
    gfx.alpha = 0;
    return {
      gfx,
      vx: (Math.random() - 0.5) * 6,
      vy: -(6 + Math.random() * 10),
      gravity: 0,
      rotationSpeed: 0,
      life: 0,
      maxLife: 6 + Math.random() * 6,
      ambient: true,
    };
  }

  function tick(deltaSeconds: number) {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.life += deltaSeconds;
      if (p.life >= p.maxLife) {
        if (p.ambient) {
          Object.assign(p, makeAmbientDust(p.gfx));
          continue;
        }
        container.removeChild(p.gfx);
        p.gfx.destroy();
        particles.splice(i, 1);
        continue;
      }
      p.vy += p.gravity * deltaSeconds;
      p.gfx.x += p.vx * deltaSeconds;
      p.gfx.y += p.vy * deltaSeconds;
      p.gfx.rotation += p.rotationSpeed * deltaSeconds;
      // Ambient motes fade in, hold, then fade out over their (long, randomized) lifespan instead
      // of the linear 1->0 fade one-shot particles use.
      if (p.ambient) {
        const t = p.life / p.maxLife;
        p.gfx.alpha = t < 0.15 ? t / 0.15 : t > 0.85 ? (1 - t) / 0.15 : 1;
        p.gfx.alpha *= 0.35;
      } else if (p.vine) {
        const t = p.life / p.maxLife;
        p.gfx.alpha = t < 0.2 ? t / 0.2 : t > 0.65 ? Math.max(0, (1 - t) / 0.35) : 1;
      } else if (p.shockwave) {
        const t = p.life / p.maxLife;
        p.gfx.scale.set(0.2 + t * 3.2);
        // A slower-than-linear fade so the ring is still reasonably visible once it's grown
        // large enough to actually peek out past the tile's edges, not already gone by then.
        p.gfx.alpha = Math.pow(1 - t, 0.6);
      } else {
        p.gfx.alpha = 1 - p.life / p.maxLife;
      }
    }
  }

  function destroy() {
    // `container.destroy({ children: true })` alone already destroys every particle's Graphics —
    // destroying them individually first here too would double-destroy the same GPU resources.
    particles.length = 0;
    container.destroy({ children: true });
  }

  return { container, spawnSpark, spawnShatter, spawnShockwave, setAmbientDustBounds, tick, destroy };
}
