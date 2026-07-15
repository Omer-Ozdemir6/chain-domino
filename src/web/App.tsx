import { useState, useEffect, useRef, type ReactNode } from 'react';
import type { RunConfig } from '../game/RunState.js';
import { SHOP_UPGRADES } from '../game/RunState.js';
import type { SlotId } from '../models/Board.js';
import { CHARMS } from '../models/CharmRegistry.js';
import { useRunState } from './hooks/useRunState.js';
import type { Selection } from './selection.js';
import SidebarHUD from './components/SidebarHUD.js';
import CharmBar from './components/CharmBar.js';
import ChainBoard from './components/ChainBoard.js';
import StoneHand from './components/StoneHand.js';
import OperatorHand from './components/OperatorHand.js';
import ShopScreen, { renderUpgradeIcon } from './components/ShopScreen.js';
import RunOverScreen from './components/RunOverScreen.js';
import StartScreen from './components/StartScreen.js';
import BlindSelectScreen from './components/BlindSelectScreen.js';
import UnlockPopup from './components/UnlockPopup.js';
import { playPlaceSound } from './sound.js';

const RUN_CONFIG: Partial<RunConfig> = {};

/** The plain arithmetic result, before any operator-level or charm bonus — used as the baseline
 *  to measure each owned charm's own isolated contribution for the scoring-animation recap. */
function rawEdgeValue(operator: 'ADD' | 'SUBTRACT' | 'MULTIPLY' | 'DIVIDE', parentBase: number, childExposed: number): number {
  switch (operator) {
    case 'ADD':
      return parentBase + childExposed;
    case 'SUBTRACT':
      return parentBase - childExposed;
    case 'MULTIPLY':
      return parentBase * childExposed;
    case 'DIVIDE':
      return childExposed === 0 ? parentBase : Math.round(parentBase / childExposed);
  }
}

/** The whole game is designed at this one fixed resolution and uniformly scaled to fit any
 *  screen (desktop or mobile) — same layout everywhere, never reflowed, never clipped. */
const DESIGN_WIDTH = 1440;
const DESIGN_HEIGHT = 900;

/** Computes the scale factor that fits the fixed design canvas inside the real viewport. */
function useCanvasScale(designWidth: number, designHeight: number): number {
  const [scale, setScale] = useState(1);
  useEffect(() => {
    function update() {
      setScale(Math.min(window.innerWidth / designWidth, window.innerHeight / designHeight));
    }
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [designWidth, designHeight]);
  return scale;
}

export default function App() {
  const scale = useCanvasScale(DESIGN_WIDTH, DESIGN_HEIGHT);
  const { run, act, shop, reset } = useRunState(RUN_CONFIG);
  const [selection, setSelection] = useState<Selection>(null);
  const [message, setMessage] = useState<string | null>(null);

  // Consumable Casting State
  const [activeSpellIndex, setActiveSpellIndex] = useState<number | null>(null);

  // Step-by-Step Scoring Animation State
  const [isAnimating, setIsAnimating] = useState(false);
  const [displayedScore, setDisplayedScore] = useState(0);
  const [highlightedEdgeId, setHighlightedEdgeId] = useState<string | null>(null);
  const [highlightedNodeId, setHighlightedNodeId] = useState<string | null>(null);
  const [highlightedCharmId, setHighlightedCharmId] = useState<string | null>(null);
  const [charmPopupText, setCharmPopupText] = useState<string | null>(null);
  const [handBonusText, setHandBonusText] = useState<string | null>(null);
  const [stepPopup, setStepPopup] = useState<{ key: number; text: string; positive: boolean } | null>(null);

  const game = run.game;
  const animatedScoreRef = useRef(0);

  // Sync displayedScore with game.score when not animating
  useEffect(() => {
    if (!isAnimating && game) {
      setDisplayedScore(game.score);
      animatedScoreRef.current = game.score;
    }
  }, [game?.score, isAnimating]);

  // Toast messages auto-dismiss instead of sitting permanently at the bottom of the screen.
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(null), 2600);
    return () => clearTimeout(timer);
  }, [message]);

  useEffect(() => {
    if (!stepPopup) return;
    const timer = setTimeout(() => setStepPopup(null), 650);
    return () => clearTimeout(timer);
  }, [stepPopup]);

  // Contextual guidance bubble shown near the Büyüler panel while a consumable spell is armed
  // and waiting for a target, replacing the old generic bottom message bar for this purpose.
  const activeSpellDef = activeSpellIndex !== null ? SHOP_UPGRADES.find((u) => u.id === run.consumables[activeSpellIndex]) : null;
  const spellGuidance = activeSpellDef
    ? `${activeSpellDef.name}: ${
        activeSpellDef.id === 'consumable_gild'
          ? 'yaldızlamak istediğiniz elinizdeki taşı seçin.'
          : activeSpellDef.id === 'consumable_magnet'
            ? 'tahtadan geri sökmek istediğiniz uçtaki taşı seçin.'
            : 'kırmak istediğiniz dondurulmuş operatörü seçin.'
      }`
    : null;

  function selectStone(id: string): void {
    if (activeSpellIndex !== null && run.consumables[activeSpellIndex] === 'consumable_gild') {
      const res = shop((r) => r.useConsumable(activeSpellIndex, id));
      if (res.ok) {
        playPlaceSound();
        setMessage('Taş yaldızlandı (Altın Taş yapıldı)! Artık oynandığında +$3 kazandıracak.');
      } else {
        setMessage('Hata: ' + res.error);
      }
      setActiveSpellIndex(null);
      return;
    }

    setSelection((prev) => (prev?.kind === 'STONE' && prev.id === id ? null : { kind: 'STONE', id }));
  }

  function selectOperator(id: string): void {
    setSelection((prev) => (prev?.kind === 'OPERATOR' && prev.id === id ? null : { kind: 'OPERATOR', id }));
  }

  function handleCommit(slotId: SlotId): void {
    if (!selection) return;
    const result =
      selection.kind === 'STONE'
        ? act((g) => g.playStone(selection.id, slotId))
        : act((g) => g.playOperator(selection.id, slotId));
    if (result.ok) playPlaceSound();
    setMessage(result.ok ? null : 'Hata: ' + result.error);
    setSelection(null);
  }

  function rollScoreTo(targetScoreVal: number, duration: number = 400) {
    const startScore = animatedScoreRef.current;
    const diff = targetScoreVal - startScore;
    animatedScoreRef.current = targetScoreVal;
    if (diff <= 0) {
      setDisplayedScore(targetScoreVal);
      return;
    }

    const startTime = performance.now();
    const interval = setInterval(() => {
      const elapsed = performance.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const current = Math.round(startScore + diff * progress);
      setDisplayedScore(current);

      if (progress >= 1) {
        clearInterval(interval);
      }
    }, 20);
  }

  function startScoringAnimation() {
    const edges = game.board.getUnfrozenEdges();
    if (edges.length === 0) {
      commitSubmit();
      return;
    }

    const evalResult = game.evaluator.scoreEdges(edges);
    if (!evalResult.ok) {
      setMessage('Zincir geçersiz: ' + evalResult.error);
      return;
    }

    setIsAnimating(true);
    animatedScoreRef.current = game.score;
    let runningScoreVal = game.score;
    setMessage(null);

    let stepIndex = 0;

    function runNextStep() {
      if (stepIndex < edges.length) {
        const edge = edges[stepIndex];
        setHighlightedEdgeId(edge.edgeId);
        setHighlightedNodeId(edge.childNodeId);

        // Get single edge score
        const edgeEval = game.evaluator.scoreEdges([edge]);
        const gain = edgeEval.ok ? edgeEval.totalGain : 0;
        const newScore = runningScoreVal + gain;
        rollScoreTo(newScore, 400);
        runningScoreVal = newScore;

        const stepText = gain >= 0 ? `+${gain}` : `-${Math.abs(gain)}`;
        setStepPopup({ key: Date.now() + Math.random(), text: stepText, positive: gain >= 0 });
        playPlaceSound();

        stepIndex++;
        setTimeout(runNextStep, 700);
      } else {
        // Clear board highlights
        setHighlightedEdgeId(null);
        setHighlightedNodeId(null);

        // Now recap what each owned charm actually did this turn. The per-edge popups above
        // already include every charm's contribution (composed into the real evaluator), so
        // this step is purely informational — it must NOT add to the score again.
        const hookCtx = { ownedCharmIds: run.ownedCharmIds };
        const rawTotal = edges.reduce(
          (sum, e) => sum + rawEdgeValue(e.operator.type, e.parentBase, e.childExposedValue),
          0
        );

        // Only recap charms that actually did something observable this turn.
        const activeCharmIds = run.ownedCharmIds.filter((id) => {
          const def = CHARMS.find((c) => c.id === id);
          if (!def) return false;
          const hooks = def.createHooks(hookCtx);
          if (hooks.onOperatorResolve) {
            const affected = edges.some((e) => {
              const base = rawEdgeValue(e.operator.type, e.parentBase, e.childExposedValue);
              return hooks.onOperatorResolve!(e.operator.type, e.parentBase, e.childExposedValue, base) !== base;
            });
            if (affected) return true;
          }
          if (hooks.onEvaluationEnd) {
            return hooks.onEvaluationEnd(rawTotal) !== rawTotal;
          }
          return false;
        });

        let charmIndex = 0;

        function runCharmStep() {
          if (charmIndex < activeCharmIds.length) {
            const charmId = activeCharmIds[charmIndex];
            const def = CHARMS.find((c) => c.id === charmId)!;
            const hooks = def.createHooks(hookCtx);

            let delta = 0;
            if (hooks.onOperatorResolve) {
              for (const e of edges) {
                const base = rawEdgeValue(e.operator.type, e.parentBase, e.childExposedValue);
                delta += hooks.onOperatorResolve(e.operator.type, e.parentBase, e.childExposedValue, base) - base;
              }
            }
            if (hooks.onEvaluationEnd) {
              delta += hooks.onEvaluationEnd(rawTotal) - rawTotal;
            }

            setHighlightedCharmId(charmId);
            setCharmPopupText(`${def.name}: ${delta >= 0 ? '+' : ''}${delta}`);
            playPlaceSound();

            charmIndex++;
            setTimeout(runCharmStep, 900);
          } else {
            // Animation complete: commit score in core engine
            setHighlightedCharmId(null);
            setCharmPopupText(null);
            setIsAnimating(false);
            commitSubmit();
          }
        }

        runCharmStep();
      }
    }

    runNextStep();
  }

  function handleSubmit(): void {
    if (isAnimating) return;
    startScoringAnimation();
  }

  function commitSubmit(): void {
    const result = act((g) => g.submitChain());
    if (!result.ok) {
      setMessage('Zincir geçersiz: ' + result.error);
    } else {
      const sign = (result.scoreGained ?? 0) >= 0 ? '+' : '';
      setMessage(`Zincir çözüldü! ${sign}${result.scoreGained} puan.`);
      if (result.handEmptiedBonus) {
        setHandBonusText(`EL TAMAMLANDI! +${result.handEmptiedBonus} BONUS`);
        setTimeout(() => setHandBonusText(null), 1800);
      }
      if (run.phase === 'PLAYING' && game.status === 'PLAYING') act((g) => g.drawForTurn());
    }
    setSelection(null);
  }

  function handleDiscard(): void {
    const stoneIds = game.hand.map((s) => s.id);
    const opIds = game.operatorHand.map((o) => o.id);
    const res = shop((r) => r.discardSelected(stoneIds, opIds));
    if (res.ok) {
      playPlaceSound();
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
      playPlaceSound();
      setMessage('Taş tahtadan sökülüp elinize geri alındı.');
    } else {
      setMessage('Hata: ' + res.error);
    }
    setActiveSpellIndex(null);
  }

  function handleSelectOperatorSlot(slotId: SlotId): void {
    if (activeSpellIndex === null) return;
    const res = shop((r) => r.useConsumable(activeSpellIndex, slotId));
    if (res.ok) {
      playPlaceSound();
      setMessage('Operatör taşı kırıldı.');
    } else {
      setMessage('Hata: ' + res.error);
    }
    setActiveSpellIndex(null);
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

  function handleStartRun(deck: 'RED' | 'BLUE' | 'YELLOW', stake: 'WHITE' | 'RED'): void {
    act((g) => {
      run.initializeRun(deck, stake);
      return null;
    });
    setSelection(null);
    setMessage(null);
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
      setMessage(null);
    }
  }

  function handleSell(charmId: string): void {
    shop((r) => r.sellCharm(charmId));
  }

  function handleReroll(): void {
    const res = shop((r) => r.rerollShop());
    if (!res.ok) {
      setMessage('Hata: ' + res.error);
    } else {
      setMessage(null);
    }
  }

  function handleContinueShop(): void {
    shop((r) => r.leaveShop());
    setMessage(null);
  }

  function handleDrawCycleOperator(): void {
    const res = act((g) => g.cycleOperatorCard());
    if (res.ok) {
      playPlaceSound();
      setMessage('Yeni operatör çekildi / deste dolanıldı.');
    } else {
      setMessage('Hata: ' + res.error);
    }
    setSelection(null);
  }

  const legalSlotIds =
    selection?.kind === 'STONE'
      ? new Set<SlotId>(
          (() => {
            const s = game?.hand?.find((st) => st.id === selection.id);
            return s ? game.board.getLegalStoneTargets(s) : [];
          })()
        )
      : selection?.kind === 'OPERATOR'
        ? new Set<SlotId>(game?.board?.getOpenOperatorTargets() || [])
        : new Set<SlotId>();

  const isStuck = game?.status === 'LOST' && game?.lossReason === 'STUCK';
  const ownedCharms = run.ownedCharmIds.map((id) => CHARMS.find((c) => c.id === id)!);

  const activeSpell = activeSpellIndex !== null ? run.consumables[activeSpellIndex] : null;
  let activeSpellType: 'MAGNET' | 'BREAKER' | 'GILD' | null = null;
  if (activeSpell === 'consumable_magnet') activeSpellType = 'MAGNET';
  else if (activeSpell === 'consumable_breaker') activeSpellType = 'BREAKER';
  else if (activeSpell === 'consumable_gild') activeSpellType = 'GILD';

  // Rendering screens based on phase — every branch below fills exactly one fixed-size
  // canvas (see the wrapper at the bottom of this function), so layout never reflows per device.
  let content: ReactNode;

  if (run.phase === 'START_SCREEN') {
    content = (
      <div className="absolute inset-0 flex items-center justify-center bg-slate-950 overflow-hidden swirl-bg p-4">
        <StartScreen onStart={handleStartRun} />
      </div>
    );
  } else if (run.phase === 'RUN_OVER_SCREEN') {
    content = (
      <div className="absolute inset-0 flex items-center justify-center bg-slate-950 overflow-hidden swirl-bg p-4">
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
          onRestart={handleRestart}
        />
      </div>
    );
  } else if (run.phase === 'CONGRATS_UNLOCK') {
    content = (
      <div className="absolute inset-0 flex items-center justify-center bg-slate-950 overflow-hidden swirl-bg p-4">
        <UnlockPopup onContinue={handleRestart} />
      </div>
    );
  } else if (run.phase === 'BLIND_SELECT') {
    content = (
      <div className="absolute inset-0 flex items-center justify-center bg-slate-950 overflow-hidden swirl-bg p-4">
        <BlindSelectScreen
          round={run.round}
          history={run.history}
          getBlindTarget={(b) => run.getBlindTarget(b)}
          onPlay={handlePlayBlind}
          onSkip={handleSkipBlind}
        />
      </div>
    );
  } else {
  // Active Play/Shop Layout - Restructured into exactly 3 clean horizontal layers side-by-side
  content = (
    <div className="absolute inset-0 flex items-center justify-center bg-slate-950 p-2 overflow-hidden select-none">
      <div className="w-full h-full flex flex-row bg-slate-900 rounded-3xl border-4 border-slate-950 overflow-hidden text-slate-100 shadow-2xl relative">
        <SidebarHUD
          round={run.round}
          totalRounds={run.config.totalRounds}
          money={run.money}
          turn={game ? game.turn : 1}
          maxTurns={run.selectedDeck === 'BLUE' ? 7 : 6}
          score={displayedScore}
          targetScore={run.activeBlind ? run.getBlindTarget(run.activeBlind) : run.currentTarget}
          status={game ? game.status : 'PLAYING'}
          scoring={isAnimating}
          operatorLevels={run.operatorLevels}
          discardsLeft={run.discardsLeft}
          canSubmit={
            game &&
            game.status === 'PLAYING' &&
            !isAnimating &&
            (game.board.getNodes().some((n) => !n.frozen) || game.board.getUnfrozenEdges().length > 0)
          }
          formulaComplete={!game || !game.board.hasPendingOperator()}
          formulaReady={Boolean(game) && game.status === 'PLAYING' && !isAnimating && !game.board.hasPendingOperator() && game.board.getUnfrozenEdges().length > 0}
          canRecover={game && game.canRecover() && !isAnimating}
          canUndo={game && game.board.length > 0}
          onSubmit={handleSubmit}
          onUndo={handleUndo}
          onDiscard={handleDiscard}
          onSkip={handleSkip}
          message={message}
        />

        <main className="flex-1 flex flex-col p-3 gap-2.5 min-w-0 h-full overflow-hidden">
          {/* Row 1: CharmBar + Consumables side-by-side (saves vertical height) */}
          <div className="flex gap-3 shrink-0 items-start justify-between">
            <div className="flex-1 min-w-0">
              <CharmBar
                charms={ownedCharms}
                maxCharmSlots={run.config.maxCharmSlots}
                highlightedCharmId={highlightedCharmId}
                charmPopupText={charmPopupText}
              />
            </div>
            <div className="w-36 shrink-0 bg-slate-950/20 p-2 rounded-xl border border-slate-800/40 h-40 flex flex-col justify-between">
              <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center justify-between">
                <span>Büyüler ({run.consumables.length}/{run.maxConsumableSlots})</span>
                {activeSpellIndex !== null && (
                  <button onClick={() => setActiveSpellIndex(null)} className="text-[8px] text-rose-400 font-bold uppercase">
                    İptal
                  </button>
                )}
              </div>
              {spellGuidance && (
                <div className="relative -mt-0.5 mb-0.5">
                  <div className="rounded-md bg-cyan-950/80 border border-cyan-500/40 text-cyan-200 text-[8px] leading-tight px-1.5 py-1 shadow-[0_0_8px_rgba(6,182,212,0.3)] animate-fade-in">
                    {spellGuidance}
                  </div>
                </div>
              )}
              <div className="flex gap-2 flex-1 mt-1.5 items-center justify-center">
                {Array.from({ length: Math.max(0, run.maxConsumableSlots - run.consumables.length) }, (_, i) => (
                  <div
                    key={`empty-${i}`}
                    className="w-16 h-16 rounded-xl border-2 border-dashed border-slate-800 bg-slate-950/20 flex items-center justify-center shrink-0"
                  >
                    <svg className="slot-silhouette w-6 h-8 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 22s7-4 7-9V6l-7-3-7 3v7c0 5 7 9 7 9z" />
                    </svg>
                  </div>
                ))}
                {run.consumables.map((item, idx) => {
                  const def = SHOP_UPGRADES.find((u) => u.id === item)!;
                  const isActive = activeSpellIndex === idx;
                  return (
                    <button
                      key={`${item}-${idx}`}
                      title={def.description}
                      onClick={() => setActiveSpellIndex(isActive ? null : idx)}
                      className={[
                        'w-16 h-16 rounded-xl border-2 transition select-none flex items-center justify-center relative',
                        isActive
                          ? 'border-cyan-400 bg-cyan-950/40 ring-1 ring-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.5)] animate-pulse'
                          : 'border-slate-800 bg-slate-950/30 hover:border-slate-700',
                      ].join(' ')}
                    >
                      <div className="scale-65 transform origin-center">
                        {renderUpgradeIcon(item)}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Row 2: Board / Shop */}
          <div className="flex-1 min-h-0 relative rounded-2xl overflow-hidden shadow-xl border border-emerald-900/30 swirl-bg">
            {run.phase === 'SHOP' ? (
              <ShopScreen
                money={run.money}
                offers={run.shopOffers}
                ownedCharms={ownedCharms}
                maxCharmSlots={run.config.maxCharmSlots}
                rerollCost={run.config.rerollCost}
                onBuy={handleBuy}
                onReroll={handleReroll}
                onContinue={handleContinueShop}
              />
            ) : (
              <ChainBoard
                board={game.board}
                legalSlotIds={legalSlotIds}
                selectionKind={selection?.kind ?? null}
                onCommit={handleCommit}
                highlightedEdgeId={highlightedEdgeId}
                highlightedNodeId={highlightedNodeId}
                activeSpellType={activeSpellType}
                onSelectNode={handleSelectNode}
                onSelectOperatorSlot={handleSelectOperatorSlot}
              />
            )}
            {/* Big, clearly-readable score popup — rendered above ChainBoard's own internal
                auto-fit scale so it never shrinks into illegibility on small screens. */}
            {stepPopup && (
              <div key={stepPopup.key} className="pointer-events-none absolute inset-0 flex items-start justify-center pt-10 z-50">
                <div
                  className={[
                    'font-pixel text-7xl font-bold tracking-wide animate-score-step-pop',
                    stepPopup.positive ? 'text-emerald-400 drop-shadow-[0_0_20px_rgba(52,211,153,0.9)]' : 'text-rose-400 drop-shadow-[0_0_20px_rgba(244,63,94,0.9)]',
                  ].join(' ')}
                  style={{ WebkitTextStroke: '2px rgba(0,0,0,0.5)' }}
                >
                  {stepPopup.text}
                </div>
              </div>
            )}
            {handBonusText && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center z-40">
                <div className="font-pixel text-3xl text-amber-300 tracking-widest uppercase animate-hand-bonus-pop drop-shadow-[0_0_18px_rgba(251,191,36,0.85)]">
                  {handBonusText}
                </div>
              </div>
            )}
          </div>

          {/* Row 3: Hands (StoneHand + OperatorHand + StoneDeckPile side-by-side to save height) */}
          {run.phase === 'PLAYING' && (
            <div className="flex gap-3 shrink-0 items-center bg-slate-950/20 p-2 rounded-xl border border-slate-800/40 justify-between">
              {/* Domino Stones hand */}
              <div className="flex-1 min-w-0">
                <StoneHand
                  stones={game.hand}
                  selectedId={selection?.kind === 'STONE' ? selection.id : null}
                  onSelect={selectStone}
                />
              </div>

              {/* Stone Draw Deck Pile */}
              <div className="w-16 shrink-0 flex flex-col items-center justify-center gap-1 border-l border-slate-800/40 pl-3">
                <div className="w-8 h-12 bg-red-800 rounded-lg border-2 border-red-700/80 shadow-[0_4px_6px_rgba(0,0,0,0.5)] flex items-center justify-center font-pixel text-slate-200 text-xs font-bold leading-none animate-pulse relative overflow-hidden select-none">
                  {/* Deck card back lines */}
                  <div className="absolute inset-1 border border-red-600/40 rounded flex items-center justify-center">
                    <span className="text-[10px] opacity-40">🀲</span>
                  </div>
                </div>
                <span className="text-[9px] font-mono text-slate-400 font-bold mt-0.5 whitespace-nowrap">
                  {game.stoneDeck.remaining}/28
                </span>
              </div>

              {/* Operator Hand (Solitaire Draw/Cycle) */}
              <div className="w-40 shrink-0 border-l border-slate-800/40 pl-3">
                <OperatorHand
                  operators={game.operatorHand}
                  selectedId={selection?.kind === 'OPERATOR' ? selection.id : null}
                  onSelect={selectOperator}
                  deckRemaining={game.operatorDeck.remaining}
                  onDrawCycle={handleDrawCycleOperator}
                />
              </div>
            </div>
          )}
          {isStuck && (
            <p className="shrink-0 rounded-lg bg-rose-950/40 border border-rose-500/30 px-3 py-1 text-[9px] font-semibold text-rose-400">
              Elindeki hiçbir taş veya operatör zincire uymuyor — Geri Al veya Turu Atla.
            </p>
          )}
        </main>
      </div>
    </div>
  );
  }

  return (
    <div className="fixed inset-0 bg-black flex items-center justify-center overflow-hidden select-none">
      <div
        className="relative shrink-0"
        style={{
          width: DESIGN_WIDTH,
          height: DESIGN_HEIGHT,
          transform: `scale(${scale})`,
          transformOrigin: 'center center',
        }}
      >
        {content}

        {/* Toast: transient success/error feedback, replaces the old always-on bottom message bar */}
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
