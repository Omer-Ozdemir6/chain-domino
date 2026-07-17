import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { Application } from 'pixi.js';
import { useElementSize } from '../hooks/useElementSize.js';
import { createCandlelightBackground, type CANDLELIGHT_PALETTES } from './candlelightBackground.js';
import { createParticleSystem } from './particles.js';
import { createLensVignette } from './lensVignette.js';

export interface PixiEffectsLayerHandle {
  /** Rects in VIEWPORT coordinates (straight from `getBoundingClientRect()`) — converted
   *  internally to this layer's own local canvas space. No-ops if the layer isn't mounted yet
   *  or failed to initialize (e.g. no WebGL) — callers never need to null-check. */
  spawnSpark: (fromRect: DOMRect, toRect: DOMRect, color?: number) => void;
  spawnShatter: (rect: DOMRect, color?: number, count?: number) => void;
  spawnShockwave: (rect: DOMRect, color?: number) => void;
}

interface PixiEffectsLayerProps {
  /** 'board': candlelight background + drifting dust, sits BEHIND the board's own DOM content —
   *  purely atmospheric, nothing here should ever need to be seen ON TOP of a tile.
   *  'board-fx': a second, transparent layer sitting ABOVE the tiles (its own canvas) — this is
   *  where spawnSpark/spawnShatter/spawnShockwave actually draw, since a burst effect hidden
   *  behind the tile it's bursting from wouldn't be seen at all.
   *  'lens': the antique magnifying-glass vignette overlay, sits on top of the whole game canvas. */
  variant: 'board' | 'board-fx' | 'lens';
  rarityTint?: keyof typeof CANDLELIGHT_PALETTES;
  /** Disables the continuously-animated layers (candle flicker) for prefers-reduced-motion —
   *  one-shot particle bursts still play either way. */
  reducedMotion?: boolean;
  className?: string;
}

const PixiEffectsLayer = forwardRef<PixiEffectsLayerHandle, PixiEffectsLayerProps>(
  function PixiEffectsLayer({ variant, rarityTint = 'COMMON', reducedMotion = false, className }, ref) {
    const { ref: sizeRef, size } = useElementSize<HTMLDivElement>();
    const containerDivRef = useRef<HTMLDivElement | null>(null);
    const appRef = useRef<Application | null>(null);
    const systemsRef = useRef<{
      candlelight?: ReturnType<typeof createCandlelightBackground>;
      particles?: ReturnType<typeof createParticleSystem>;
      lens?: ReturnType<typeof createLensVignette>;
    }>({});
    const reducedMotionRef = useRef(reducedMotion);
    reducedMotionRef.current = reducedMotion;

    const setRefs = (el: HTMLDivElement | null) => {
      containerDivRef.current = el;
      sizeRef(el);
    };

    useImperativeHandle(ref, () => ({
      spawnSpark(fromRect, toRect, color = 0xd9a441) {
        const div = containerDivRef.current;
        const particles = systemsRef.current.particles;
        if (!div || !particles) return;
        const origin = div.getBoundingClientRect();
        particles.spawnSpark(
          fromRect.left + fromRect.width / 2 - origin.left,
          fromRect.top + fromRect.height / 2 - origin.top,
          toRect.left + toRect.width / 2 - origin.left,
          toRect.top + toRect.height / 2 - origin.top,
          color
        );
      },
      spawnShatter(rect, color = 0xa855f7, count = 14) {
        const div = containerDivRef.current;
        const particles = systemsRef.current.particles;
        if (!div || !particles) return;
        const origin = div.getBoundingClientRect();
        particles.spawnShatter(
          rect.left + rect.width / 2 - origin.left,
          rect.top + rect.height / 2 - origin.top,
          color,
          count
        );
      },
      spawnShockwave(rect, color = 0xd9a441) {
        const div = containerDivRef.current;
        const particles = systemsRef.current.particles;
        if (!div || !particles) return;
        const origin = div.getBoundingClientRect();
        particles.spawnShockwave(
          rect.left + rect.width / 2 - origin.left,
          rect.top + rect.height / 2 - origin.top,
          color
        );
      },
    }), []);

    // Mount the Pixi Application once. Width/height start at 0 and get reconciled by the resize
    // effect below once ResizeObserver reports the real size — Application.init handles a 0-size
    // canvas fine, it just renders nothing until resized.
    useEffect(() => {
      const div = containerDivRef.current;
      if (!div) return;
      let cancelled = false;
      const app = new Application();

      (async () => {
        try {
          await app.init({
            width: Math.max(1, div.clientWidth),
            height: Math.max(1, div.clientHeight),
            backgroundAlpha: 0,
            antialias: true,
            autoDensity: true,
            resolution: Math.min(window.devicePixelRatio || 1, 2),
          });
        } catch {
          // No WebGL / init failed on this device — the effects layer simply stays empty.
          return;
        }
        if (cancelled) {
          app.destroy(true);
          return;
        }
        appRef.current = app;
        div.appendChild(app.canvas);
        app.canvas.style.width = '100%';
        app.canvas.style.height = '100%';

        if (variant === 'board') {
          const candlelight = createCandlelightBackground(app.screen.width, app.screen.height);
          candlelight.setPalette(rarityTint);
          const particles = createParticleSystem();
          particles.setAmbientDustBounds(app.screen.width, app.screen.height);
          app.stage.addChild(candlelight.container, particles.container);
          systemsRef.current.candlelight = candlelight;
          systemsRef.current.particles = particles;
        } else if (variant === 'board-fx') {
          const particles = createParticleSystem();
          app.stage.addChild(particles.container);
          systemsRef.current.particles = particles;
        } else {
          const lens = createLensVignette(app.screen.width, app.screen.height);
          app.stage.addChild(lens.container);
          systemsRef.current.lens = lens;
        }

        app.ticker.add((ticker) => {
          const dt = ticker.deltaMS / 1000;
          if (!reducedMotionRef.current) {
            systemsRef.current.candlelight?.tick(dt, app.screen.width, app.screen.height);
          }
          systemsRef.current.particles?.tick(dt);
        });
      })();

      return () => {
        cancelled = true;
        // `app.destroy(true, { children: true })` alone already recursively destroys every
        // display object still attached to the stage (candlelight pools, lens vignette, every
        // particle Graphics) — calling `particles.destroy()` separately first double-destroyed
        // the same Graphics objects, corrupting their WebGL batch state and crashing the very
        // next render tick if one landed before teardown fully finished.
        systemsRef.current = {};
        appRef.current?.destroy(true, { children: true });
        appRef.current = null;
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [variant]);

    // Keep the renderer and background sprite in sync with the container's real size.
    useEffect(() => {
      const app = appRef.current;
      if (!app || size.width === 0 || size.height === 0) return;
      app.renderer.resize(size.width, size.height);
      systemsRef.current.candlelight?.resize(size.width, size.height);
      // Ambient dust only belongs to the 'board' (background) variant — 'board-fx' shares the
      // same particle system shape but must never seed floating dust motes in front of the tiles.
      if (variant === 'board') {
        systemsRef.current.particles?.setAmbientDustBounds(size.width, size.height);
      }
      systemsRef.current.lens?.resize(size.width, size.height);
    }, [size.width, size.height]);

    useEffect(() => {
      systemsRef.current.candlelight?.setPalette(rarityTint);
    }, [rarityTint]);

    const defaultClassName =
      variant === 'board'
        ? 'absolute inset-0 z-0 pointer-events-none'
        : variant === 'board-fx'
          ? 'absolute inset-0 z-20 pointer-events-none'
          : 'absolute inset-0 z-[9998] pointer-events-none';

    return <div ref={setRefs} className={className ?? defaultClassName} />;
  }
);

export default PixiEffectsLayer;
