import { useState, useEffect, useRef, type ReactNode } from 'react';
import type { RunConfig } from '../game/RunState.js';
import { SHOP_UPGRADES, BOSS_BLINDS } from '../game/RunState.js';
import type { SlotId } from '../models/Board.js';
import { CHARMS } from '../models/CharmRegistry.js';
import { useRunState } from './hooks/useRunState.js';
import type { Selection } from './selection.js';
import SidebarHUD from './components/SidebarHUD.js';
import CharmBar from './components/CharmBar.js';
import InfoTooltip from './components/InfoTooltip.js';
import ChainBoard from './components/ChainBoard.js';
import StoneHand from './components/StoneHand.js';
import ShopScreen, { renderUpgradeIcon } from './components/ShopScreen.js';
import RoundRewardScreen from './components/RoundRewardScreen.js';
import RunOverScreen from './components/RunOverScreen.js';
import StartScreen from './components/StartScreen.js';
import IntroScreen from './components/IntroScreen.js';
import BlindSelectScreen from './components/BlindSelectScreen.js';
import UnlockPopup from './components/UnlockPopup.js';
import { playSound } from './components/SoundSynth.js';
import type { HandType } from '../models/types.js';
import PixiEffectsLayer, { type PixiEffectsLayerHandle } from './pixi/PixiEffectsLayer.js';

const RUN_CONFIG: Partial<RunConfig> = {};

const HAND_TYPE_LABEL: Record<HandType, string> = {
  STRAIGHT: 'DÜZ ZİNCİR',
  BRANCHED: 'ÇATALLI ZİNCİR',
  LOOP: 'SONSUZ DÖNGÜ',
};

/**
 * Landscape (desktop, tablet-landscape) is designed at one fixed resolution and uniformly scaled
 * (via a JS-computed transform) to fit the real viewport — every landscape device renders
 * pixel-identical, just scaled, which is what guarantees a full, uncropped fit there (plain
 * `w-full h-full`/`md:`/`lg:` breakpoints can't promise every element stays on-screen for an
 * arbitrary window size, but scaling a single known-good layout down/up to fit always can).
 *
 * Portrait (real phones) deliberately does NOT use a fixed canvas: phone aspect ratios vary far
 * more than desktop windows do, so scaling a fixed 480×900 canvas to fit left visible letterbox
 * bars on most real devices. Portrait instead just IS the live viewport (scale 1, width/height
 * tracking window.innerWidth/innerHeight) — a true full-bleed mobile layout, zero gaps by
 * construction, with the portrait-specific Tailwind sizes bumped up to stay legible at real size.
 */
const LANDSCAPE_CANVAS = { width: 1440, height: 900 };

/** Picks the matching design canvas for the real viewport's orientation and computes its fit scale. */
function useCanvasScale(): { scale: number; width: number; height: number; isPortrait: boolean } {
  const [state, setState] = useState({ scale: 1, ...LANDSCAPE_CANVAS, isPortrait: false });
  useEffect(() => {
    function update() {
      // visualViewport tracks the ACTUAL visible area on mobile as the browser's address/toolbar
      // bar shows or hides — plain window.innerHeight can briefly over-report it, which silently
      // pushed bottom-anchored UI (the hand row, the action buttons) below the real fold.
      const vw = window.visualViewport?.width ?? window.innerWidth;
      const vh = window.visualViewport?.height ?? window.innerHeight;
      const isPortrait = vh > vw;
      if (isPortrait) {
        setState({ scale: 1, width: vw, height: vh, isPortrait: true });
      } else {
        const scale = Math.min(vw / LANDSCAPE_CANVAS.width, vh / LANDSCAPE_CANVAS.height);
        const width = vw / scale;
        const height = vh / scale;
        setState({ scale, width, height, isPortrait: false });
      }
    }
    update();
    window.addEventListener('resize', update);
    window.visualViewport?.addEventListener('resize', update);
    return () => {
      window.removeEventListener('resize', update);
      window.visualViewport?.removeEventListener('resize', update);
    };
  }, []);
  return state;
}

export default function App() {
  const { scale, width: canvasWidth, height: canvasHeight, isPortrait } = useCanvasScale();
  const { run, act, shop, reset } = useRunState(RUN_CONFIG);
  const [selection, setSelection] = useState<Selection>(null);
  const [message, setMessage] = useState<string | null>(null);
  // "Müzenin Kapıları Aralanıyor" — a one-time dark title-card shown before the main menu on
  // this page load only (never replays on subsequent runs/resets within the same session).
  const [introDone, setIntroDone] = useState(false);

  // Faz 14: PixiJS effect layer handles — board layer (candlelight background + Amber spark /
  // Obsidian shatter particles) and the antique lens vignette overlay over the whole canvas.
  const pixiBoardRef = useRef<PixiEffectsLayerHandle | null>(null);
  // The 'board' layer (candlelight + ambient dust) sits BEHIND the tiles, purely atmospheric —
  // a burst effect drawn there would be invisible, hidden under the opaque tile it's bursting
  // from. spawnSpark/spawnShatter/spawnShockwave all target this separate layer instead, which
  // is mounted ABOVE the tiles.
  const pixiFxRef = useRef<PixiEffectsLayerHandle | null>(null);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // Consumable Casting State
  const [activeSpellIndex, setActiveSpellIndex] = useState<number | null>(null);
  const [spellCastEffect, setSpellCastEffect] = useState<{ id: string; type: 'GILD' | 'MAGNET' } | null>(null);

  // Faz 10: İmza Tılsımlar — armed interactive-charm targeting (Küratörün Çekici / Simyacı Aynası)
  const [armedCharmId, setArmedCharmId] = useState<string | null>(null);
  const [charmActivationEffect, setCharmActivationEffect] = useState<{ stoneId: string; kind: 'SPLIT' | 'SWAP' } | null>(null);
  const [rescueMessage, setRescueMessage] = useState<string | null>(null);

  // Step-by-Step Scoring Animation State
  const [isAnimating, setIsAnimating] = useState(false);
  const [displayedScore, setDisplayedScore] = useState(0);
  const [highlightedEdgeId, setHighlightedEdgeId] = useState<string | null>(null);
  const [highlightedNodeId, setHighlightedNodeId] = useState<string | null>(null);
  // Per-tile "+N" popup during the stone-by-stone scoring reveal — Balatro shows this floating
  // directly above whichever card is being scored right now, not as one big centered banner.
  const [tilePopup, setTilePopup] = useState<{ text: string; left: number; top: number } | null>(null);
  const [charmPopupText, setCharmPopupText] = useState<string | null>(null);
  const [handBonusText, setHandBonusText] = useState<string | null>(null);
  const [stepPopup, setStepPopup] = useState<{ key: number; text: string; positive: boolean } | null>(null);
  const [activeScoringCharmId, setActiveScoringCharmId] = useState<string | null>(null);
  const [activeCharmPopupText, setActiveCharmPopupText] = useState<string | null>(null);
  // A brief warm energy-flash across the board at each impactful beat (a charm firing, the final
  // reveal) — replaces the old full-screen shake, which read as a cheap/fake effect rather than
  // something that belonged to this table's mystic atmosphere.
  const [boardFlash, setBoardFlash] = useState(false);
  // The played tiles dissolve upward off the board (toward the score panel) once the hand fully
  // resolves, instead of instantly vanishing the instant the board is drained.
  const [isBoardExiting, setIsBoardExiting] = useState(false);
  const [delayedPhase, setDelayedPhase] = useState<string>('START_SCREEN');
  const [isGathering, setIsGathering] = useState(false);
  const [flyingParticles, setFlyingParticles] = useState<any[]>([]);
  // Faz 11: lower LCD panel — the CURRENT hand's live Chips×Mult buildup (stone-by-stone, then
  // charm-by-charm). Never touches the upper round score; that only moves once, at hand-end.
  const [handPreview, setHandPreview] = useState<{ chips: number; mult: number }>({ chips: 0, mult: 1 });
  const [handScoreFlyUp, setHandScoreFlyUp] = useState(false);
  // The hand-score accumulator ("+N" under the round score) is deliberately NOT a live mirror of
  // handPreview.chips*mult — it stays null (hidden) through the entire stone-by-stone/charm-by-
  // charm buildup and is set exactly once, at the Büyük Patlama beat, to the already-finished
  // total. Everything happens strictly in order: chips×mult finishes below, THEN this total
  // appears, THEN the blue/red badges reset, THEN (only then) it flies up into the round score.
  const [handTotalReveal, setHandTotalReveal] = useState<number | null>(null);

  function spawnScoreParticles(charmId: string) {
    const charmIndex = ownedCharms.findIndex((c) => c.id === charmId);
    if (charmIndex === -1) return;

    const startX = 35 + charmIndex * 8;
    const startY = 10;

    const tx = `${5 - startX}vw`;
    const ty = `${45 - startY}vh`;

    const newParticles = Array.from({ length: 6 }).map((_, i) => ({
      id: Date.now() + Math.random() + i,
      left: `${startX}%`,
      top: `${startY}%`,
      tx,
      ty,
      delay: `${i * 90}ms`,
    }));

    setFlyingParticles((prev) => [...prev, ...newParticles]);

    setTimeout(() => {
      setFlyingParticles((prev) => prev.filter((p) => !newParticles.find((np) => np.id === p.id)));
    }, 1600);
  }

  /** The final hand score flying up from the center of the board into the sidebar's round-score
   *  readout — the one moment the upper panel is allowed to move, at the very end of a hand. */
  function spawnFinalScoreParticles() {
    const newParticles = Array.from({ length: 10 }).map((_, i) => ({
      id: Date.now() + Math.random() + i,
      left: '50%',
      top: '40%',
      tx: '-45vw',
      ty: '-30vh',
      delay: `${i * 40}ms`,
    }));
    setFlyingParticles((prev) => [...prev, ...newParticles]);
    setTimeout(() => {
      setFlyingParticles((prev) => prev.filter((p) => !newParticles.find((np) => np.id === p.id)));
    }, 1600);
  }

  const game = run.game;
  const animatedScoreRef = useRef(0);

  // Sync displayedScore with game.score when not animating
  useEffect(() => {
    if (!isAnimating && game) {
      setDisplayedScore(game.score);
      animatedScoreRef.current = game.score;
    }
  }, [game?.score, isAnimating]);

  useEffect(() => {
    const realPhase = run.phase;
    if (realPhase === 'ROUND_REWARD' || realPhase === 'RUN_OVER_SCREEN') {
      setIsGathering(true);
      const timer = setTimeout(() => {
        setIsGathering(false);
        setDelayedPhase(realPhase);
      }, 1450);
      return () => clearTimeout(timer);
    } else {
      setDelayedPhase(realPhase);
      setIsGathering(false);
    }
  }, [run.phase]);

  // Toast messages auto-dismiss instead of sitting permanently at the bottom of the screen.
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(null), 2600);
    return () => clearTimeout(timer);
  }, [message]);

  useEffect(() => {
    if (!stepPopup) return;
    const timer = setTimeout(() => setStepPopup(null), 1300);
    return () => clearTimeout(timer);
  }, [stepPopup]);

  // Zamanı Büken Sarkaç (or any future onSubmitFail charm) just rescued a losing round — surface
  // it as a big moment instead of letting the run silently continue as if nothing happened.
  useEffect(() => {
    if (!run.lastRescueCharmName) return;
    setRescueMessage(`${run.lastRescueCharmName}: ZAMAN GERİ SARILDI!`);
    playSound('rewind');
    triggerBoardFlash(500);
    const timer = setTimeout(() => setRescueMessage(null), 2400);
    run.lastRescueCharmName = null;
    return () => clearTimeout(timer);
  }, [run.lastRescueCharmName]);

  // Contextual guidance bubble shown near the Büyüler panel while a consumable spell is armed
  // and waiting for a target, replacing the old generic bottom message bar for this purpose.
  const activeSpellDef = activeSpellIndex !== null ? SHOP_UPGRADES.find((u) => u.id === run.consumables[activeSpellIndex]) : null;
  const isHandStoneTarget = activeSpellDef && [
    'consumable_gild',
    'consumable_ivory',
    'consumable_obsidian',
    'consumable_amber'
  ].includes(activeSpellDef.id);

  const spellGuidance = activeSpellDef
    ? `${activeSpellDef.name}: ${
        isHandStoneTarget
          ? 'güncellemek veya rün işlemek istediğiniz elinizdeki taşı seçin.'
          : 'tahtadan geri sökmek istediğiniz uçtaki taşı seçin.'
      }`
    : null;

  function handleActivateCharm(charmId: string): void {
    setActiveSpellIndex(null);
    setArmedCharmId((prev) => (prev === charmId ? null : charmId));
  }

  function selectStone(id: string): void {
    if (armedCharmId !== null) {
      const charmDef = CHARMS.find((c) => c.id === armedCharmId);
      const res = shop((r) => r.useActiveCharm(armedCharmId, id));
      if (res.ok) {
        const isSplit = charmDef?.id === 'curators_gavel';
        setCharmActivationEffect({ stoneId: id, kind: isSplit ? 'SPLIT' : 'SWAP' });
        setTimeout(() => setCharmActivationEffect(null), 700);
        playSound(charmDef?.signature?.sound ?? 'chime');
        setMessage(`${charmDef?.name ?? 'Tılsım'} uygulandı!`);
      } else {
        setMessage('Hata: ' + res.error);
      }
      setArmedCharmId(null);
      return;
    }

    if (activeSpellIndex !== null) {
      const activeConsumable = run.consumables[activeSpellIndex];
      const isTargetingSpell = [
        'consumable_gild',
        'consumable_ivory',
        'consumable_obsidian',
        'consumable_amber',
        'consumable_trash',
        'consumable_magnifier',
        'consumable_transmute',
        'consumable_upgrade'
      ].includes(activeConsumable);

      if (isTargetingSpell) {
        const res = shop((r) => r.useConsumable(activeSpellIndex, id));
        if (res.ok) {
          playSound('place');
          let effectType: 'GILD' | 'BLUE' | 'RED' | 'GOLDEN' | 'RED_SPARKLE' = 'GILD';
          let desc = 'Büyü uygulandı!';
          if (activeConsumable === 'consumable_ivory') {
            effectType = 'BLUE';
            desc = 'Taş Fildişi yapıldı (+15 Taban Puan)!';
          } else if (activeConsumable === 'consumable_obsidian') {
            effectType = 'RED';
            desc = 'Taş Obsidyen yapıldı (Çarpan x2, %25 kırılma şansı)!';
          } else if (activeConsumable === 'consumable_amber') {
            effectType = 'GOLDEN' as any;
            desc = 'Taş Kehribar yapıldı (Komşu sayıları mıknatıs gibi eşitler)!';
          } else if (activeConsumable === 'consumable_trash') {
            effectType = 'RED_SPARKLE' as any;
            desc = 'Parçalama Ritüeli: Taş kalıcı olarak desteden silindi!';
          } else if (activeConsumable === 'consumable_magnifier') {
            effectType = 'GILD';
            desc = 'Tozlu Büyüteç: Taşın sayıları ikiye katlandı! 🔍';
          } else if (activeConsumable === 'consumable_transmute') {
            effectType = 'GOLDEN' as any;
            desc = 'Dönüşüm İksiri: Taş çift (spinner) yapıldı! 🧪';
          } else if (activeConsumable === 'consumable_upgrade') {
            effectType = 'BLUE_SPARKLE' as any;
            desc = 'Geliştirme Parşömeni: Taşın her iki tarafına da +2 eklendi! ⚡';
          } else {
            desc = 'Taş yaldızlandı (Altın Taş yapıldı)! Artık oynandığında +$3 kazandıracak.';
          }

          setSpellCastEffect({ id, type: effectType as any });
          setTimeout(() => setSpellCastEffect(null), 1000);
          setMessage(desc);
        } else {
          setMessage('Hata: ' + res.error);
        }
        setActiveSpellIndex(null);
        return;
      }
    }

    setSelection((prev) => (prev?.kind === 'STONE' && prev.id === id ? null : { kind: 'STONE', id }));
  }

  function handleCommit(slotId: SlotId): void {
    if (!selection) return;
    const stoneId = selection.id;
    const stone = game.hand.find((s) => s.id === stoneId);
    const parentNodeId = slotId === 'ROOT' ? null : slotId.slice(0, slotId.lastIndexOf('#'));
    const parentNode = parentNodeId ? game.board.getNodes().find((n) => n.nodeId === parentNodeId) : null;
    const isAmberConnection = parentNodeId !== null && (stone?.modifier === 'AMBER' || parentNode?.modifier === 'AMBER');
    const result = act((g) => g.playStone(stoneId, slotId));
    if (result.ok) {
      playSound('place');
      // Wait a frame for React to render the newly-added tile before reading its rect.
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const childEl = document.querySelector(`[data-node-id="${stoneId}"]`);
          if (!childEl) return;
          // Every lock-in gets a small confirmation shockwave, regardless of modifier.
          pixiFxRef.current?.spawnShockwave(childEl.getBoundingClientRect());
          if (isAmberConnection && parentNodeId) {
            const parentEl = document.querySelector(`[data-node-id="${parentNodeId}"]`);
            if (parentEl) {
              pixiFxRef.current?.spawnSpark(parentEl.getBoundingClientRect(), childEl.getBoundingClientRect());
            }
          }
        });
      });
    }
    setMessage(result.ok ? null : 'Hata: ' + result.error);
    setSelection(null);
  }

  function rollScoreTo(targetScoreVal: number, duration: number = 400) {
    const startScore = displayedScore;
    const startTime = performance.now();
    let ticks = 0;

    let interval: any;
    interval = setInterval(() => {
      const elapsed = performance.now() - startTime;
      const progress = Math.min(1, elapsed / duration);

      // Smooth easeOutQuad
      const ease = progress * (2 - progress);
      const current = startScore + Math.round((targetScoreVal - startScore) * ease);
      
      if (current !== animatedScoreRef.current) {
        ticks++;
        if (ticks % 3 === 0) {
          playSound('pulse', ticks);
        }
      }

      setDisplayedScore(current);
      animatedScoreRef.current = current;

      if (progress >= 1) {
        clearInterval(interval);
      }
    }, 20);
  }

  /** A brief warm glow sweeping across the board — the "impact" beat for a charm firing or the
   *  final reveal. Replaces the old whole-screen shake, which read as a cheap effect rather than
   *  something that belonged on this table. */
  function triggerBoardFlash(duration: number = 380) {
    setBoardFlash(true);
    setTimeout(() => setBoardFlash(false), duration);
  }

  function startScoringAnimation() {
    const unfrozenNodes = game.board.getNodes().filter((n) => !n.frozen);
    if (unfrozenNodes.length === 0) {
      commitSubmit();
      return;
    }

    // Faz 11 "LCD" akışı: üst panel (raunt skoru) bu hamle boyunca HİÇ hareket etmiyor — sadece
    // en sonda, Büyük Patlama'dan hemen sonra TEK bir sıçrama yapıyor. Alt LCD panel (handPreview)
    // önce taş taş, sonra tılsım tılsım canlı olarak büyüyor.
    setIsAnimating(true);
    const roundScoreBefore = game.score;
    setMessage(null);

    const orderedStones = unfrozenNodes.map((n) => ({
      id: n.nodeId,
      leftVal: n.leftVal,
      rightVal: n.rightVal,
      isGolden: (n as any).isGolden,
      modifier: (n as any).modifier,
      tags: (n as any).tags,
    }));

    const { handStartChips, handStartMult, stoneSteps, steps, final } = run.previewScoreSteps(orderedStones);

    setHighlightedNodeId(null);
    setHighlightedEdgeId(null);
    // The "El Kartı" Chips×Mult box already showed this exact natural-sum total while the stones
    // were being placed (via liveScorePreview) — seed it there directly instead of dropping back
    // to the hand-type's base and re-climbing through every stone, which just replayed a reveal
    // the player already watched happen. Only NEW (charm-driven) additions should visibly grow it
    // further from here.
    const naturalTotal = stoneSteps.length > 0 ? stoneSteps[stoneSteps.length - 1].chipsAfter : handStartChips;
    setHandPreview({ chips: naturalTotal, mult: handStartMult });

    let stoneIndex = 0;

    function runNextStoneStep() {
      if (stoneIndex < stoneSteps.length) {
        const step = stoneSteps[stoneIndex];
        stoneIndex++;
        // Highlight the tile currently being tallied, and float a "+N" popup right above IT
        // (like Balatro's own per-card chip callout) — not a big banner covering the board, and
        // not a re-animation of the LCD box above (that already holds the natural-sum total).
        setHighlightedNodeId(step.id);
        const tileEl = document.querySelector(`[data-node-id="${step.id}"]`);
        if (tileEl) {
          const r = tileEl.getBoundingClientRect();
          setTilePopup({ text: `+${step.chipDelta}`, left: r.left + r.width / 2, top: r.top });
        }
        playSound('place');
        setTimeout(() => setTilePopup(null), 550);
        setTimeout(runNextStoneStep, 700);
      } else {
        setHighlightedNodeId(null);
        setTilePopup(null);
        setTimeout(runNextCharmStep, 700);
      }
    }

    let stepIndex = 0;

    function runNextCharmStep() {
      if (stepIndex < steps.length) {
        const step = steps[stepIndex];
        stepIndex++;
        const changed = step.before.chips !== step.after.chips || step.before.mult !== step.after.mult;
        if (!changed) {
          setTimeout(runNextCharmStep, 150);
          return;
        }

        const diffChips = Math.round(step.after.chips - step.before.chips);
        const diffMult = step.after.mult - step.before.mult;
        const multRatio = step.after.mult / step.before.mult;

        let popupText = '';
        if (diffChips > 0 && diffMult > 0) {
          popupText = `+${diffChips} Chip & x${multRatio.toFixed(1)} Mult`;
        } else if (diffChips > 0) {
          popupText = `+${diffChips} Chips`;
        } else if (multRatio > 1.01) {
          popupText = `x${multRatio.toFixed(1)} Mult`;
        } else if (step.after.mult > step.before.mult) {
          popupText = `+${diffMult.toFixed(1)} Mult`;
        } else {
          popupText = 'Tetiklendi!';
        }

        setActiveScoringCharmId(step.id);
        setActiveCharmPopupText(popupText);
        triggerBoardFlash(350);
        spawnScoreParticles(step.id);

        // This charm's contribution lands in the LCD card below — the round score above stays
        // completely untouched until every charm has had its turn and the Büyük Patlama fires.
        setHandPreview({ chips: step.after.chips, mult: step.after.mult });
        setCharmPopupText(
          `${step.name} Tetiklendi! (${popupText})`
        );
        const triggeredDef = CHARMS.find((c) => c.id === step.id);
        playSound(triggeredDef?.signature?.sound ?? 'trigger');
        setTimeout(() => {
          setCharmPopupText(null);
          setActiveScoringCharmId(null);
          setActiveCharmPopupText(null);
          setTimeout(runNextCharmStep, 900);
        }, 3200);
      } else {
        function finish() {
          setStepPopup(null);
          setCharmPopupText(null);
          setActiveScoringCharmId(null);
          // The hand is fully resolved and its score has already flown up into the round total —
          // let the played tiles visibly dissolve off the board before the state actually drains
          // them, instead of them instantly vanishing the moment submitChain() clears the board.
          // `isAnimating` MUST stay true for this whole window: it's what keeps the idle live
          // preview from switching on and reading the board a beat before `commitSubmit()` has
          // actually drained it — flipping it early flashed a stray chip total for one frame.
          setIsBoardExiting(true);
          setTimeout(() => {
            setIsBoardExiting(false);
            setHandPreview({ chips: 0, mult: 1 });
            setIsAnimating(false);
            commitSubmit();
          }, 560);
        }
        // Büyük Patlama — strictly staged, one beat at a time:
        //   1) the flash marks "the multiplication below just finished"
        //   2) the total appears in the accumulator (handTotalReveal) — chips×mult, done
        //   3) ONLY once that total is visibly sitting there do the blue/red badges reset
        //   4) ONLY THEN does the total fly up and the round score above start climbing
        // Nothing above ever moves before step 4, and the badges never reset before step 3.
        playSound('win');
        triggerBoardFlash(550);
        setTimeout(() => {
          // Step 2: the total lands — chips × mult is now a single settled number.
          setHandTotalReveal(final.score);
          setTimeout(() => {
            // Step 3: the multiplication boxes empty out now that their result has been captured.
            setHandPreview({ chips: 0, mult: 1 });
            setTimeout(() => {
              // Step 4: the settled total carries itself up into the round score.
              spawnFinalScoreParticles();
              rollScoreTo(roundScoreBefore + final.score, 700);
              setHandScoreFlyUp(true);
              setTimeout(() => {
                setHandTotalReveal(null);
                setHandScoreFlyUp(false);
              }, 680);
            }, 400);
          }, 500);
        }, 600);
        setTimeout(finish, 2700);
      }
    }

    setTimeout(runNextStoneStep, 700);
  }

  function handleSubmit(): void {
    if (isAnimating) return;
    startScoringAnimation();
  }

  function commitSubmit(): void {
    // Capture rects for every Obsidian tile BEFORE submitting — `submitChain()` drains the whole
    // board synchronously, so by the time we know WHICH of them actually broke, their tiles are
    // already gone from the game state (though not yet re-rendered out of the DOM).
    const obsidianRects = new Map<string, DOMRect>();
    game.board
      .getNodes()
      .filter((n) => !n.frozen && n.modifier === 'OBSIDIAN')
      .forEach((n) => {
        const el = document.querySelector(`[data-node-id="${n.nodeId}"]`);
        if (el) obsidianRects.set(n.nodeId, el.getBoundingClientRect());
      });

    const result = act((g) => g.submitChain());
    if (!result.ok) {
      setMessage('Zincir geçersiz: ' + result.error);
    } else {
      // No redundant "Zincir çözüldü! +N puan." toast here — the stone-by-stone/charm-by-charm
      // reveal that just finished already told that whole story, in detail, right on the board.
      if (result.handEmptiedBonus) {
        setHandBonusText(`EL TAMAMLANDI! +${result.handEmptiedBonus} BONUS`);
        setTimeout(() => setHandBonusText(null), 1800);
      }
      result.brokenTileIds?.forEach((id) => {
        const rect = obsidianRects.get(id);
        if (rect) pixiFxRef.current?.spawnShatter(rect);
      });
      if (run.phase === 'PLAYING' && game.status === 'PLAYING') act((g) => g.drawForTurn());
    }
    setSelection(null);
  }

  function handleDiscard(): void {
    const stoneIds = game.hand.map((s) => s.id);
    const res = shop((r) => r.discardSelected(stoneIds));
    if (res.ok) {
      playSound('discard');
      setMessage('Eliniz ıskarta edildi, yenileri çekildi.');
    } else {
      setMessage('Hata: ' + res.error);
    }
    setSelection(null);
  }

  function handleSelectNode(nodeId: string): void {
    if (activeSpellIndex === null) return;
    const res = shop((r) => r.useConsumable(activeSpellIndex, nodeId));
    if (res.ok) {
      playSound('place');
      setSpellCastEffect({ id: nodeId, type: 'MAGNET' });
      setTimeout(() => setSpellCastEffect(null), 1000);
      setMessage('Taş tahtadan sökülüp elinize geri alındı.');
    } else {
      setMessage('Hata: ' + res.error);
    }
    setActiveSpellIndex(null);
  }

  function handleSelectEdge(edgeId: string): void {
    if (activeSpellIndex === null) return;
    const res = shop((r) => r.useConsumable(activeSpellIndex, edgeId));
    if (res.ok) {
      playSound('place');
      setMessage('Mistik Makas: Bağlantı kesildi! ✂️');
    } else {
      setMessage('Hata: ' + res.error);
    }
    setActiveSpellIndex(null);
  }

  function handleSpellClick(index: number): void {
    const item = run.consumables[index];
    if (item === 'consumable_clover') {
      const res = shop((r) => r.useConsumable(index, ''));
      if (res.ok) {
        playSound('place');
        setMessage('Uğurlu Yonca: Elinizdeki tüm taşlar altın yapıldı! 🍀');
      } else {
        setMessage('Hata: ' + res.error);
      }
      setActiveSpellIndex(null);
    } else {
      setActiveSpellIndex(activeSpellIndex === index ? null : index);
    }
  }

  function handleUndo(): void {
    const result = act((g) => g.undoLastMove());
    setMessage(result.ok ? null : 'Hata: ' + result.error);
    setSelection(null);
  }

  function handleSkip(): void {
    act((g) => g.skipTurn());
    if (run.phase === 'PLAYING' && game.status === 'PLAYING') act((g) => g.drawForTurn());
    setMessage(null);
    setSelection(null);
  }

  function handleRestart(): void {
    reset();
    setSelection(null);
    setMessage(null);
    setActiveSpellIndex(null);
  }

  /** "Yeni Run Başlat": skips the main-menu deck/stake picker entirely and jumps straight into
   *  a fresh run with the same deck/stake the player just used — matching what players actually
   *  expect from a "play again" button instead of dumping them back on the title screen. */
  function handleNewRun(): void {
    const deck = run.selectedDeck;
    const stake = run.selectedStake;
    reset((freshRun) => freshRun.initializeRun(deck, stake));
    setSelection(null);
    setMessage(null);
    setActiveSpellIndex(null);
  }

  function handleStartRun(deck: 'RED' | 'BLUE' | 'YELLOW', stake: 'WHITE' | 'RED', chestId: import('../game/RunState.js').ChestId | null = null): void {
    act((_g) => {
      run.initializeRun(deck, stake);
      if (chestId) run.selectChest(chestId);
      return null;
    });
    setSelection(null);
    setMessage(null);
  }

  function handleEndless(): void {
    act((g) => {
      run.startEndlessMode();
      return null;
    });
    setDelayedPhase('BLIND_SELECT');
    setMessage('Sonsuz Sergiye geçildi! Hedefler katlanarak büyüyecek.');
  }

  function handlePlayBlind(blindType: 'SMALL' | 'BIG' | 'BOSS'): void {
    act((g) => {
      run.startBlind(blindType);
      return null;
    });
    setMessage(null);
  }

  function handleSkipBlind(blindType: 'SMALL' | 'BIG'): void {
    act((g) => {
      run.skipBlind(blindType);
      return null;
    });
    setMessage(`Aşama geçildi. Kazandığınız etiket ödülleri uygulandı.`);
  }

  function handleBuy(itemId: string): void {
    const res = shop((r) => r.buyItem(itemId));
    if (!res.ok) {
      setMessage('Hata: ' + res.error);
    } else {
      playSound('place');
      setMessage(null);
    }
  }

  function handleDraftSelect(stoneId: string): void {
    const res = shop((r) => r.draftStone(stoneId));
    if (res.ok) {
      playSound('place');
      setMessage(`Taş destenize kalıcı olarak eklendi! (Deste: ${run.customDeck.length} taş)`);
    } else {
      setMessage('Hata: ' + res.error);
    }
  }

  function handleSkipDraft(): void {
    const res = shop((r) => r.skipDraft());
    if (res.ok) {
      playSound('place');
      setMessage(null);
    } else {
      setMessage('Hata: ' + res.error);
    }
  }

  function handleChooseRune(optionId: string): void {
    const res = shop((r) => r.chooseRuneOption(optionId));
    if (!res.ok) setMessage('Hata: ' + res.error);
  }

  function handleSkipRunePack(): void {
    const res = shop((r) => r.skipRunePack());
    if (res.ok) {
      playSound('place');
      setMessage(null);
    } else {
      setMessage('Hata: ' + res.error);
    }
  }

  function handleApplyRune(stoneIds: string[]): void {
    const res = shop((r) => r.applyRune(stoneIds));
    if (res.ok) {
      playSound('trigger');
      setMessage(`Rün uygulandı! (${stoneIds.length} taş güncellendi)`);
    } else {
      setMessage('Hata: ' + res.error);
    }
  }

  function handleSell(charmId: string): void {
    shop((r) => r.sellCharm(charmId));
    playSound('place');
  }

  function handleFuse(charmAId: string, charmBId: string): void {
    const res = shop((r) => r.attemptFusion(charmAId, charmBId));
    if (!res.ok) {
      setMessage('Füzyon Hatası: ' + res.error);
    } else {
      playSound('trigger');
      setMessage('Tılsımlar başarıyla birleştirildi! Yeni hibrit tılsım oluşturuldu.');
    }
  }

  function handleReroll(): void {
    const res = shop((r) => r.rerollShop());
    if (!res.ok) {
      setMessage('Hata: ' + res.error);
    } else {
      playSound('place');
      setMessage(null);
    }
  }

  function handleContinueShop(): void {
    shop((r) => r.leaveShop());
    setMessage(null);
  }

  function handleProceedToShop(): void {
    const msg = run.perishedCharmMessage;
    shop((r) => r.proceedToShop());
    if (msg) {
      setMessage(msg);
      run.perishedCharmMessage = null;
    } else {
      setMessage(null);
    }
  }

  const legalSlotIds =
    selection?.kind === 'STONE'
      ? new Set<SlotId>(
          (() => {
            const s = game?.hand?.find((st) => st.id === selection.id);
            return s ? game.board.getLegalStoneTargets(s) : [];
          })()
        )
      : new Set<SlotId>();

  const isStuck = game?.status === 'LOST' && game?.lossReason === 'NO_MOVES';
  const ownedCharms = run.ownedCharmIds.map((id) => CHARMS.find((c) => c.id === id)!);
  const activatedCharmIdsThisTurn = ownedCharms.filter((c) => run.isCharmActivatedThisTurn(c.id)).map((c) => c.id);

  // Faz 14: the candlelight background leans into whichever rarity of owned charm is highest —
  // a LEGENDARY hoard makes the table glow richer/more golden than a bare COMMON-only board.
  const RARITY_ORDER = { COMMON: 0, UNCOMMON: 1, RARE: 2, LEGENDARY: 3 } as const;
  const candlelightTint = ownedCharms.reduce<keyof typeof RARITY_ORDER>(
    (best, c) => (RARITY_ORDER[c.rarity] > RARITY_ORDER[best] ? c.rarity : best),
    'COMMON'
  );

  const activeSpell = activeSpellIndex !== null ? run.consumables[activeSpellIndex] : null;
  let activeSpellType: 'MAGNET' | 'GILD' | null = null;
  if (activeSpell === 'consumable_magnet') activeSpellType = 'MAGNET';
  else if (activeSpell && ['consumable_gild', 'consumable_ivory', 'consumable_obsidian', 'consumable_amber', 'consumable_trash'].includes(activeSpell)) activeSpellType = 'GILD';

  // Rendering screens based on phase — every branch below fills exactly one fixed-size
  // canvas (see the wrapper at the bottom of this function), so layout never reflows per device.
  let content: ReactNode;

  // Every overlay below shares one "modal on top of the persistent board" treatment instead of
  // navigating to a separate screen — the header/board/hands stay mounted underneath at all times.
  const overlayClass = 'absolute inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-sm overflow-hidden p-4 animate-fade-in';

  if (delayedPhase === 'START_SCREEN' && !introDone) {
    content = <IntroScreen onEnter={() => setIntroDone(true)} />;
  } else if (delayedPhase === 'START_SCREEN') {
    content = (
      <div className="absolute inset-0 flex items-center justify-center bg-slate-950 overflow-hidden swirl-bg p-4 animate-table-arrive">
        <StartScreen onStart={handleStartRun} />
      </div>
    );
  } else if (delayedPhase === 'SHOP') {
    content = (
      <div className="absolute inset-0 flex items-center justify-center bg-slate-950 p-4 overflow-hidden select-none swirl-bg">
        <ShopScreen
          money={run.money}
          offers={run.shopOffers}
          ownedCharms={ownedCharms}
          maxCharmSlots={run.config.maxCharmSlots}
          rerollCost={run.currentRerollCost}
          onBuy={handleBuy}
          onReroll={handleReroll}
          onContinue={handleContinueShop}
          isPortrait={isPortrait}
          deckSize={run.customDeck.length}
          draftOffers={run.draftOffers}
          onDraftSelect={handleDraftSelect}
          onSkipDraft={handleSkipDraft}
          onFuse={handleFuse}
          fusedCharmIds={run.fusedCharmIds}
          activeTag={run.activeTag}
          runeOffers={run.runeOffers}
          onChooseRune={handleChooseRune}
          onSkipRunePack={handleSkipRunePack}
          pendingRune={run.pendingRune}
          customDeck={run.customDeck}
          onApplyRune={handleApplyRune}
        />
      </div>
    );
  } else {
    // Active Play/Shop Layout
    const canSubmitNow = Boolean(
      game &&
        game.status === 'PLAYING' &&
        !isAnimating &&
        (game.board.getNodes().some((n) => !n.frozen) || game.board.getUnfrozenEdges().length > 0)
    );
    const formulaReadyNow = canSubmitNow;
    const canRecoverNow = Boolean(game && game.canRecover() && !isAnimating);
    const canUndoNow = Boolean(game && game.board.length > 0);

    // Live chips×mult readout for whatever's currently unfrozen on the board
    let liveScorePreview: { chips: number; mult: number } | null = null;
    if (game && !isAnimating && delayedPhase === 'PLAYING') {
      const unfrozenNodes = game.board.getNodes().filter((n) => !n.frozen);
      if (unfrozenNodes.length > 0) {
        const stones = unfrozenNodes.map((n) => ({
          id: n.nodeId,
          leftVal: n.leftVal,
          rightVal: n.rightVal,
          isGolden: (n as any).isGolden,
          modifier: (n as any).modifier,
          tags: (n as any).tags,
        }));
        // Charm-free natural sum only — matches Balatro: while still placing stones, only the
        // hand's own chips/mult show. Charm bonuses only ever appear once, during the post-submit
        // reveal, so this box never has to visibly drop a pre-included charm bonus and re-climb.
        const result = run.previewScoreSteps(stones);
        liveScorePreview = { chips: result.baseChips, mult: result.baseMult };
      }
    }
    // While animating, the "El Kartı" chips×mult badges show the hand's live stone-by-stone/
    // charm-by-charm buildup (handPreview) instead of the idle board preview.
    const sidebarPreview = isAnimating ? handPreview : liveScorePreview;

    const targetScore = run.activeBlind ? run.getBlindTarget(run.activeBlind) : run.currentTarget;
    const maxTurns = run.selectedDeck === 'BLUE' ? 7 : 6;
    const currentTurn = game ? game.turn : 1;
    // Faz 12.2: "Ante" (run.round) only advances once per Boss Blind clear — a separate,
    // finer-grained counter that ticks up on every single blind (Small/Big/Boss) is derived here.
    const overallRound = (run.round - 1) * 3 + (run.activeBlind === 'SMALL' ? 1 : run.activeBlind === 'BIG' ? 2 : 3);
    const maxOverallRounds = run.config.totalRounds * 3;
    const activeBoss = run.activeBossId ? BOSS_BLINDS.find((b) => b.id === run.activeBossId) ?? null : null;
    const bossWarning = activeBoss ? activeBoss.ruleLabel : null;
    const bossTierColor = activeBoss?.tier === 'LETHAL'
      ? 'text-fuchsia-400 bg-fuchsia-950/30 border-fuchsia-700/50'
      : activeBoss?.tier === 'DANGEROUS'
        ? 'text-red-400 bg-red-950/30 border-red-700/50'
        : 'text-orange-400 bg-orange-950/30 border-orange-700/50';

    const handType = game ? game.board.detectHandType() : null;
    const currentHandLevel = handType ? run.handLevels[handType] ?? 1 : 1;

    if (isPortrait) {
      content = (
        <div className="w-full h-full flex flex-col bg-slate-950 text-slate-100 select-none overflow-hidden">
          <SidebarHUD
            layout="topbar"
            round={run.round}
            totalRounds={run.config.totalRounds}
            money={run.money}
            turn={currentTurn}
            maxTurns={maxTurns}
            score={displayedScore}
            targetScore={targetScore}
            status={game ? game.status : 'PLAYING'}
            scoring={isAnimating}
            handType={handType}
            discardsLeft={run.discardsLeft}
            handLevels={run.handLevels}
            canSubmit={canSubmitNow}
            formulaReady={formulaReadyNow}
            canRecover={canRecoverNow}
            canUndo={canUndoNow}
            onSubmit={handleSubmit}
            onUndo={handleUndo}
            onDiscard={handleDiscard}
            onSkip={handleSkip}
            message={message}
            activeBossId={run.activeBossId}
            activeBlind={run.activeBlind}
            previewScore={sidebarPreview}
            handScore={handTotalReveal}
            handScoreFlyUp={handScoreFlyUp}
            overallRound={overallRound}
            maxOverallRounds={maxOverallRounds}
          />

          {/* Portrait Play Area */}
          <main className="flex-1 flex flex-col p-3 gap-2.5 min-h-0 overflow-hidden">
            {/* Charms and spells row */}
            <div className="flex gap-2 shrink-0 items-start justify-between relative z-30">
              <div className="flex-1 min-w-0">
                <CharmBar
                  charms={ownedCharms}
                  maxCharmSlots={run.config.maxCharmSlots}
                  activeCharmId={activeScoringCharmId}
                  activeCharmPopupText={activeCharmPopupText}
                  layout="horizontal"
                  onActivateCharm={handleActivateCharm}
                  armedCharmId={armedCharmId}
                  charmDurability={run.charmDurability}
                  activatedCharmIds={activatedCharmIdsThisTurn}
                />
              </div>
              
              {/* Spells slot bar */}
              <div className="w-28 shrink-0 bg-slate-950/40 p-1.5 rounded-xl border border-slate-800/40 h-28 flex flex-col justify-between">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center">Büyüler</span>
                <div className="flex gap-1 items-center justify-center">
                  {Array.from({ length: run.maxConsumableSlots }, (_, i) => {
                    const item = run.consumables[i];
                    if (!item) {
                      return (
                        <div key={`p-empty-${i}`} className="w-8 h-12 rounded-lg border border-dashed border-slate-800 bg-slate-950/20 flex items-center justify-center shrink-0">
                          <span className="text-xs text-slate-700">⚔️</span>
                        </div>
                      );
                    }
                    const isActive = activeSpellIndex === i;
                    const spellDef = SHOP_UPGRADES.find((u) => u.id === item)!;
                    const spellTooltip = (
                      <div className="flex flex-col gap-1 text-left leading-normal font-sans">
                        <span className="font-bold text-xs text-amber-200 font-pixel">{spellDef.name}</span>
                        <p className="text-[10px] text-slate-200 leading-relaxed">{spellDef.description}</p>
                      </div>
                    );
                    return (
                      <InfoTooltip key={`p-spell-${i}`} text={spellTooltip} widthClass="w-52" side="left">
                        <button
                          onClick={() => handleSpellClick(i)}
                          className={`w-8 h-12 rounded-lg border transition flex items-center justify-center shrink-0 ${
                            isActive ? 'border-amber-500 bg-amber-950/40 ring-1 ring-amber-500 animate-pulse' : 'border-slate-800 bg-slate-950/30'
                          }`}
                        >
                          <div className="scale-50 transform origin-center">{renderUpgradeIcon(item)}</div>
                        </button>
                      </InfoTooltip>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Board */}
            <div className="flex-1 min-h-0 relative z-10 rounded-2xl overflow-hidden shadow-xl border border-slate-950 felt-board">
              <PixiEffectsLayer
                ref={pixiBoardRef}
                variant="board"
                rarityTint={candlelightTint}
                reducedMotion={prefersReducedMotion}
              />
              <div className="relative z-10 h-full w-full">
                <ChainBoard
                  board={game.board}
                  legalSlotIds={legalSlotIds}
                  selectionKind={selection?.kind ?? null}
                  onCommit={handleCommit}
                  highlightedEdgeId={highlightedEdgeId}
                  highlightedNodeId={highlightedNodeId}
                  activeSpellType={activeSpellType}
                  onSelectNode={handleSelectNode}
                  spellEffect={spellCastEffect}
                  isGathering={isGathering}
                  isExiting={isBoardExiting}
                  onSelectEdge={handleSelectEdge}
                  activeConsumable={activeSpell}
                />
              </div>
              <PixiEffectsLayer ref={pixiFxRef} variant="board-fx" reducedMotion={prefersReducedMotion} />
              {boardFlash && (
                <div className="pointer-events-none absolute inset-0 z-40 animate-board-impact-flash" />
              )}
              {stepPopup && (
                <div className="pointer-events-none absolute inset-0 flex items-start justify-center pt-10 z-50">
                  <div className={`font-pixel text-5xl font-bold tracking-wide animate-score-step-pop ${stepPopup.positive ? 'text-emerald-400 drop-shadow-[0_0_20px_rgba(52,211,153,0.9)]' : 'text-rose-400 drop-shadow-[0_0_20px_rgba(244,63,94,0.9)]'}`} style={{ WebkitTextStroke: '1px rgba(0,0,0,0.5)' }}>
                    {stepPopup.text}
                  </div>
                </div>
              )}
              {charmPopupText && (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center z-50">
                  <div className="font-pixel text-2xl font-bold text-amber-300 tracking-wide text-center px-5 py-3 rounded-2xl bg-slate-900/85 border-2 border-amber-500 shadow-[0_0_25px_rgba(251,191,36,0.6)] animate-score-step-pop">
                    {charmPopupText}
                  </div>
                </div>
              )}
              {handBonusText && (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center z-40">
                  <div className="font-pixel text-2xl text-amber-300 tracking-widest uppercase animate-hand-bonus-pop drop-shadow-[0_0_20px_rgba(251,191,36,0.85)]">
                    {handBonusText}
                  </div>
                </div>
              )}
            </div>

            {/* Hand */}
            <div className="flex gap-2 shrink-0 items-end justify-between bg-slate-950/20 p-1.5 rounded-xl border border-slate-800/40 overflow-visible relative z-20">
              <div className="flex-1 min-w-0 overflow-visible">
                <StoneHand
                  stones={game.hand}
                  selectedId={selection?.kind === 'STONE' ? selection.id : null}
                  onSelect={selectStone}
                  spellEffect={spellCastEffect}
                  isSpellTargeting={activeSpellType === 'GILD'}
                  isCharmTargeting={armedCharmId !== null}
                  activationEffect={charmActivationEffect}
                  isGathering={isGathering}
                />
              </div>
              <div className="w-12 shrink-0 flex flex-col items-center justify-center border-l border-slate-800/40 pl-2">
                <div className="w-6 h-9 bg-red-800 rounded border border-red-700/80 flex items-center justify-center font-pixel text-slate-200 text-xs">
                  <span>🀲</span>
                </div>
                <span className="text-[10px] font-mono text-slate-400 font-bold mt-0.5">{game.stoneDeck.remaining}/28</span>
              </div>
            </div>
          </main>

          {/* Action Row for Portrait */}
          <div className="shrink-0 grid grid-cols-3 gap-1.5 p-2 bg-slate-900 border-t-4 border-slate-950">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!canSubmitNow}
              className={`col-span-3 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 active:translate-y-0.5 text-sm font-bold text-white shadow border-b-2 border-emerald-800 transition disabled:opacity-30 disabled:cursor-not-allowed uppercase font-pixel ${formulaReadyNow && canSubmitNow ? 'animate-pulse ring-2 ring-emerald-300' : ''}`}
            >
              HESAPLA / GÖNDER
            </button>
            <button
              type="button"
              onClick={handleDiscard}
              disabled={!canRecoverNow || run.discardsLeft <= 0}
              className="py-1.5 rounded-lg bg-rose-805 hover:bg-rose-705 active:translate-y-0.5 text-xs font-bold text-white shadow border-b-2 border-rose-955 transition disabled:opacity-30 disabled:cursor-not-allowed uppercase font-pixel"
            >
              ISKARTA
            </button>
            <button
              type="button"
              onClick={handleUndo}
              disabled={!canRecoverNow || !canUndoNow}
              className="py-1.5 rounded-lg bg-slate-700 hover:bg-slate-650 active:translate-y-0.5 text-xs font-bold text-slate-200 border-b-2 border-slate-900 transition disabled:opacity-30 disabled:cursor-not-allowed uppercase font-pixel"
            >
              GERİ AL
            </button>
            <button
              type="button"
              onClick={handleSkip}
              disabled={!canRecoverNow}
              className="py-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-900/30 active:translate-y-0.5 text-xs font-bold text-rose-400 border border-rose-500/20 transition disabled:opacity-30 disabled:cursor-not-allowed uppercase font-pixel"
            >
              ATLA
            </button>
          </div>
        </div>
      );
    } else {
      // Classic layout (SidebarHUD on left, play board on right)
      content = (
        <div className="w-full h-full flex flex-row bg-slate-950 text-slate-100 select-none overflow-hidden relative">
          {/* Vertical SidebarHUD on the left */}
          <SidebarHUD
            layout="sidebar"
            round={run.round}
            totalRounds={run.config.totalRounds}
            money={run.money}
            turn={currentTurn}
            maxTurns={maxTurns}
            score={displayedScore}
            targetScore={targetScore}
            status={game ? game.status : 'PLAYING'}
            scoring={isAnimating}
            handType={handType}
            discardsLeft={run.discardsLeft}
            handLevels={run.handLevels}
            canSubmit={canSubmitNow}
            formulaReady={formulaReadyNow}
            canRecover={canRecoverNow}
            canUndo={canUndoNow}
            onSubmit={handleSubmit}
            onUndo={handleUndo}
            onDiscard={handleDiscard}
            onSkip={handleSkip}
            message={message}
            activeBossId={run.activeBossId}
            activeBlind={run.activeBlind}
            previewScore={sidebarPreview}
            handScore={handTotalReveal}
            handScoreFlyUp={handScoreFlyUp}
            overallRound={overallRound}
            maxOverallRounds={maxOverallRounds}
          />

          {/* Main Play Area on the right */}
          <main className="flex-1 flex flex-col p-1.5 md:p-2 lg:p-3 gap-1 md:gap-1.5 lg:gap-2.5 min-w-0 h-full overflow-hidden">
            {/* Row 1: CharmBar + Spells side-by-side to save height */}
            <div className="flex gap-1.5 md:gap-2 lg:gap-3 shrink-0 items-start justify-between relative z-30">
              <div className="flex-1 min-w-0">
                <CharmBar
                  charms={ownedCharms}
                  maxCharmSlots={run.config.maxCharmSlots}
                  activeCharmId={activeScoringCharmId}
                  activeCharmPopupText={activeCharmPopupText}
                  layout="horizontal"
                  onActivateCharm={handleActivateCharm}
                  armedCharmId={armedCharmId}
                  activatedCharmIds={activatedCharmIdsThisTurn}
                  charmDurability={run.charmDurability}
                />
              </div>
              
              {/* Spells slot bar */}
              <div className="w-24 md:w-28 lg:w-36 shrink-0 bg-slate-950/20 p-1 md:p-1.5 lg:p-2 rounded-xl border border-slate-800/40 h-22 md:h-26 lg:h-32 flex flex-col justify-between">
                <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center justify-between font-pixel">
                  <span>Büyüler ({run.consumables.length}/{run.maxConsumableSlots})</span>
                  {activeSpellIndex !== null && (
                    <button onClick={() => setActiveSpellIndex(null)} className="text-[8px] text-rose-450 font-bold uppercase font-pixel">
                      İptal
                    </button>
                  )}
                </div>
                {spellGuidance && (
                  <div className="rounded bg-amber-950/80 border border-amber-600/40 text-amber-200 text-[8px] leading-tight px-1.5 py-1 shadow-md animate-fade-in">
                    {spellGuidance}
                  </div>
                )}
                <div className="flex gap-2 flex-1 mt-1.5 items-center justify-center">
                  {Array.from({ length: run.maxConsumableSlots }, (_, i) => {
                    const item = run.consumables[i];
                    if (!item) {
                      return (
                        <div
                          key={`empty-${i}`}
                          className="w-8 h-12 md:w-10 md:h-14 lg:w-12 lg:h-18 rounded-lg border border-dashed border-slate-800 bg-slate-950/25 flex items-center justify-center shrink-0"
                        >
                          <svg className="slot-silhouette w-5 h-7 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 22s7-4 7-9V6l-7-3-7 3v7c0 5 7 9 7 9z" />
                          </svg>
                        </div>
                      );
                    }
                    const def = SHOP_UPGRADES.find((u) => u.id === item)!;
                    const isActive = activeSpellIndex === i;
                    const tooltipContent = (
                      <div className="flex flex-col gap-1 text-left leading-normal font-sans">
                        <span className="font-bold text-xs text-amber-200 font-pixel">{def.name}</span>
                        <p className="text-[10px] text-slate-200 leading-relaxed">{def.description}</p>
                      </div>
                    );
                    return (
                      <InfoTooltip key={`${item}-${i}`} text={tooltipContent} widthClass="w-52" side="left">
                        <button
                          onClick={() => handleSpellClick(i)}
                          className={`w-8 h-12 md:w-10 md:h-14 lg:w-12 lg:h-18 rounded-lg border-2 transition select-none flex items-center justify-center relative shrink-0 ${
                            isActive ? 'border-amber-500 bg-amber-950/40 ring-1 ring-amber-500 shadow-md animate-pulse' : 'border-slate-850 bg-slate-950/30 hover:border-slate-700'
                          }`}
                        >
                          <div className="scale-40 md:scale-50 lg:scale-60 transform origin-center">
                            {renderUpgradeIcon(item)}
                          </div>
                        </button>
                      </InfoTooltip>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Row 2: ChainBoard play table */}
            <div className="flex-1 min-h-0 relative z-10 rounded-2xl overflow-hidden shadow-xl border border-slate-950 felt-board">
              <PixiEffectsLayer
                ref={pixiBoardRef}
                variant="board"
                rarityTint={candlelightTint}
                reducedMotion={prefersReducedMotion}
              />
              <div className="relative z-10 h-full w-full">
                <ChainBoard
                  board={game.board}
                  legalSlotIds={legalSlotIds}
                  selectionKind={selection?.kind ?? null}
                  onCommit={handleCommit}
                  highlightedEdgeId={highlightedEdgeId}
                  highlightedNodeId={highlightedNodeId}
                  activeSpellType={activeSpellType}
                  onSelectNode={handleSelectNode}
                  spellEffect={spellCastEffect}
                  isGathering={isGathering}
                  isExiting={isBoardExiting}
                  onSelectEdge={handleSelectEdge}
                  activeConsumable={activeSpell}
                />
              </div>
              <PixiEffectsLayer ref={pixiFxRef} variant="board-fx" reducedMotion={prefersReducedMotion} />

              {boardFlash && (
                <div className="pointer-events-none absolute inset-0 z-40 animate-board-impact-flash" />
              )}
              {stepPopup && (
                <div className="pointer-events-none absolute inset-0 flex items-start justify-center pt-10 z-50">
                  <div className={`font-pixel text-5xl font-bold tracking-wide animate-score-step-pop ${stepPopup.positive ? 'text-emerald-400 drop-shadow-[0_0_20px_rgba(52,211,153,0.95)]' : 'text-rose-400 drop-shadow-[0_0_20px_rgba(244,63,94,0.95)]'}`} style={{ WebkitTextStroke: '1px rgba(0,0,0,0.5)' }}>
                    {stepPopup.text}
                  </div>
                </div>
              )}
              {charmPopupText && (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center z-50">
                  <div className="font-pixel text-4xl lg:text-5xl font-bold text-amber-300 tracking-wide text-center px-8 py-4 rounded-2xl bg-slate-900/85 border-2 border-amber-500 shadow-[0_0_25px_rgba(251,191,36,0.6)] animate-score-step-pop">
                    {charmPopupText}
                  </div>
                </div>
              )}
              {handBonusText && (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center z-40">
                  <div className="font-pixel text-4xl text-amber-300 tracking-widest uppercase animate-hand-bonus-pop drop-shadow-[0_0_20px_rgba(251,191,36,0.85)]">
                    {handBonusText}
                  </div>
                </div>
              )}
            </div>

            {/* Row 3: Domino Hand + draw deck remaining */}
            <div className="flex gap-1.5 md:gap-2 lg:gap-3 shrink-0 items-end justify-between bg-slate-950/20 p-1.5 md:p-2 lg:p-2.5 rounded-xl border border-slate-800/40 overflow-visible relative z-20">
              <div className="flex-1 min-w-0 overflow-visible">
                <StoneHand
                  stones={game.hand}
                  selectedId={selection?.kind === 'STONE' ? selection.id : null}
                  onSelect={selectStone}
                  spellEffect={spellCastEffect}
                  isSpellTargeting={activeSpellType === 'GILD'}
                  isCharmTargeting={armedCharmId !== null}
                  activationEffect={charmActivationEffect}
                  isGathering={isGathering}
                />
              </div>

              {/* Deck remaining pile indicator */}
              <div className="w-14 md:w-16 lg:w-20 shrink-0 flex flex-col items-center justify-center border-l border-slate-800/40 pl-1.5 md:pl-2 lg:pl-3">
                <div className="w-8 h-11 md:w-9 md:h-12 lg:w-10 lg:h-14 bg-red-800 rounded-lg border-2 border-red-700/80 shadow-[0_4px_6px_rgba(0,0,0,0.5)] flex items-center justify-center font-pixel text-slate-200 text-xs md:text-sm font-bold leading-none animate-pulse relative overflow-hidden select-none">
                  <div className="absolute inset-1 border border-red-650/40 rounded flex items-center justify-center">
                    <span className="text-xs opacity-40">🀲</span>
                  </div>
                </div>
                <span className="text-[9px] font-mono text-slate-400 font-bold mt-1 whitespace-nowrap">
                  {game.stoneDeck.remaining}/28
                </span>
              </div>
            </div>
          </main>

          {isStuck && (
            <div className="absolute bottom-20 left-1/2 -translate-x-1/2 rounded-lg bg-rose-950/85 border border-rose-500/40 px-4 py-2 text-[10px] font-bold text-rose-400 animate-bounce shadow-lg z-30 font-pixel">
              Elindeki hiçbir taş zincire uymuyor — Geri Al veya Turu Atla.
            </div>
          )}
        </div>
      );
    }

    // Modal Overlays on top of persistent view
    if (delayedPhase === 'BLIND_SELECT') {
      content = (
        <div className="w-full h-full relative">
          {content}
          <div className={overlayClass}>
            <BlindSelectScreen
              round={run.round}
              history={run.history}
              getBlindTarget={(b) => run.getBlindTarget(b)}
              onPlay={handlePlayBlind}
              onSkip={handleSkipBlind}
              smallBlindTag={run.smallBlindTag}
              bigBlindTag={run.bigBlindTag}
            />
          </div>
        </div>
      );
    } else if (delayedPhase === 'ROUND_REWARD' && run.lastRoundReward) {
      content = (
        <div className="w-full h-full relative">
          {content}
          {/* Top-anchored (not centered): the Cash Out ledger drops down from the game screen's
              own top edge like a drawer, instead of floating as a detached card mid-screen. */}
          <div className="absolute inset-0 z-50 flex items-start justify-center bg-slate-950/85 backdrop-blur-sm overflow-hidden animate-fade-in">
            <RoundRewardScreen reward={run.lastRoundReward} onContinue={handleProceedToShop} />
          </div>
        </div>
      );
    } else if (delayedPhase === 'RUN_OVER_SCREEN') {
      content = (
        <div className="w-full h-full relative">
          {content}
          <div className={overlayClass}>
            <RunOverScreen
              status={run.status as 'WON' | 'LOST'}
              round={run.round}
              totalRounds={run.config.totalRounds}
              money={run.money}
              bestHandScore={run.bestHandScore}
              totalCardsPlayed={run.totalCardsPlayed}
              totalCardsDiscarded={run.totalCardsDiscarded}
              totalRerolls={run.totalRerolls}
              totalPurchases={run.totalPurchases}
              defeatedBy={run.defeatedBy}
              onNewRun={handleNewRun}
              onMainMenu={handleRestart}
            />
          </div>
        </div>
      );
    } else if (delayedPhase === 'CONGRATS_UNLOCK') {
      content = (
        <div className="w-full h-full relative">
          {content}
          <div className={overlayClass}>
            <UnlockPopup onContinue={handleRestart} onEndless={handleEndless} />
          </div>
        </div>
      );
    }
  }

  return (
    <div className="fixed inset-0 bg-black flex items-center justify-center overflow-hidden select-none swirl-bg safe-area-pad">
      {/* Portrait orientation lock overlay */}
      <div className="portrait-lock-overlay">
        <div className="text-6xl animate-bounce" style={{ animation: 'rotate-phone-hint 3s ease-in-out infinite' }}>📱</div>
        <p className="text-2xl tracking-widest">Ekranı Yatay Çevir</p>
        <p className="text-sm text-emerald-500/60">Bu oyun yatay modda oynanır</p>
      </div>
      {/* Fixed-resolution design canvas, uniformly scaled to fit the real viewport exactly —
          this is what guarantees nothing (like the sidebar's bottom edge) ever gets cropped,
          regardless of the actual browser window size. Centered via absolute top/left 50% +
          translate(-50%,-50%) rather than flex centering: browsers apply "safe" alignment
          fallbacks to flex-centered items that are larger than their container (which this
          canvas always is pre-scale), silently collapsing `justify-center`/`items-center`
          into edge-anchored positioning — the translate+scale combo sidesteps that entirely. */}
      <div
        className="absolute top-1/2 left-1/2 overflow-hidden select-none"
        style={{ width: canvasWidth, height: canvasHeight, transform: `translate(-50%, -50%) scale(${scale})` }}
      >
        {content}

        {/* Antique lens vignette — sits above everything else in the scaled canvas, darkening the
            corners and adding a faint warm tint. Purely decorative, pointer-events-none. */}
        <PixiEffectsLayer variant="lens" reducedMotion={prefersReducedMotion} />

        {/* Per-tile "+N" chip callout during the stone-by-stone scoring reveal. Two nested spans:
            the outer one holds the fixed left/top positioning (untouched by the animation), the
            inner one carries the pop/rise keyframe — a single element can't own both without the
            animation's own `transform` clobbering the centering offset each frame. */}
        {tilePopup && (
          <span
            className="fixed pointer-events-none z-[9997]"
            style={{ left: tilePopup.left, top: tilePopup.top, transform: 'translate(-50%, -100%)' }}
          >
            <span
              className="block font-pixel text-4xl md:text-5xl font-black text-emerald-300 animate-tile-chip-pop"
              style={{ textShadow: '0 0 14px rgba(52,211,153,0.9), -2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 2px 2px 0 #000' }}
            >
              {tilePopup.text}
            </span>
          </span>
        )}

        {/* Score-flow flying particles layer */}
        {flyingParticles.map((p) => (
          <span
            key={p.id}
            className="flying-score-particle animate-fly-to-hud"
            style={{
              left: p.left,
              top: p.top,
              ['--tx' as any]: p.tx,
              ['--ty' as any]: p.ty,
              animationDelay: p.delay,
            }}
          />
        ))}

        {/* Zamanı Büken Sarkaç rescue moment — big, unmissable, screen-shaking reveal */}
        {rescueMessage && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center z-70">
            <div className="font-pixel text-2xl md:text-4xl font-black text-sky-300 tracking-widest text-center px-8 py-4 rounded-2xl bg-slate-950/90 border-4 border-sky-400 shadow-[0_0_40px_rgba(56,189,248,0.9)] animate-score-step-pop uppercase">
              ⏪ {rescueMessage}
            </div>
          </div>
        )}

        {/* Toast: transient success/error feedback */}
        {message && (
          <div className="pointer-events-none absolute bottom-6 left-1/2 -translate-x-1/2 z-60 animate-toast-in">
            <p className="rounded-lg bg-slate-900/95 border border-slate-700 px-4 py-2 text-xs font-mono text-slate-200 shadow-xl whitespace-nowrap">
              {message}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
