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
}

/** A minimal, dependency-free particle pool driven straight off the Pixi ticker — no physics
 *  engine needed for a few dozen short-lived sparks/shatter shards at once. */
export function createParticleSystem() {
  const container = new Container();
  const particles: Particle[] = [];

  function spawnSpark(fromX: number, fromY: number, toX: number, toY: number, color: number) {
    const dx = toX - fromX;
    const dy = toY - fromY;
    const dist = Math.hypot(dx, dy) || 1;
    const steps = Math.min(10, Math.max(4, Math.round(dist / 14)));
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const gfx = new Graphics();
      const r = 2 + Math.random() * 1.5;
      gfx.circle(0, 0, r).fill({ color, alpha: 0.95 });
      gfx.x = fromX + dx * t + (Math.random() - 0.5) * 6;
      gfx.y = fromY + dy * t + (Math.random() - 0.5) * 6;
      container.addChild(gfx);
      particles.push({
        gfx,
        vx: (Math.random() - 0.5) * 20,
        vy: (Math.random() - 0.5) * 20,
        gravity: 0,
        rotationSpeed: 0,
        life: 0,
        maxLife: 0.35 + Math.random() * 0.15,
      });
    }
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
      } else {
        p.gfx.alpha = 1 - p.life / p.maxLife;
      }
    }
  }

  function destroy() {
    particles.forEach((p) => p.gfx.destroy());
    particles.length = 0;
    container.destroy({ children: true });
  }

  return { container, spawnSpark, spawnShatter, setAmbientDustBounds, tick, destroy };
}
