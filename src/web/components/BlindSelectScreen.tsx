import type { RoundRecord, SkipTag } from '../../game/RunState.js';
import { BOSS_BLINDS } from '../../game/RunState.js';

interface BlindSelectScreenProps {
  round: number; // Current Ante
  history: RoundRecord[];
  getBlindTarget: (blindType: 'SMALL' | 'BIG' | 'BOSS') => number;
  onPlay: (blindType: 'SMALL' | 'BIG' | 'BOSS') => void;
  onSkip: (blindType: 'SMALL' | 'BIG') => void;
  smallBlindTag: SkipTag | null;
  bigBlindTag: SkipTag | null;
}

const TIER_COLORS = {
  MODERATE: {
    border: 'border-orange-500/80',
    bg: 'bg-orange-950/10',
    glow: 'shadow-[0_0_14px_rgba(249,115,22,0.25)]',
    label: 'text-orange-400',
    badge: 'bg-orange-700/30 text-orange-300',
  },
  DANGEROUS: {
    border: 'border-red-500',
    bg: 'bg-red-950/10',
    glow: 'shadow-[0_0_18px_rgba(239,68,68,0.3)]',
    label: 'text-red-500',
    badge: 'bg-red-700/30 text-red-300',
  },
  LETHAL: {
    border: 'border-fuchsia-600',
    bg: 'bg-fuchsia-950/20',
    glow: 'shadow-[0_0_22px_rgba(192,38,211,0.35)] animate-pulse',
    label: 'text-fuchsia-400',
    badge: 'bg-fuchsia-700/30 text-fuchsia-300',
  },
};

const TIER_LABEL = { MODERATE: 'TEHLİKELİ', DANGEROUS: '⚠ ÖLÜMCÜL', LETHAL: '💀 LETALİTE' };

export default function BlindSelectScreen({
  round,
  history,
  getBlindTarget,
  onPlay,
  onSkip,
  smallBlindTag,
  bigBlindTag,
}: BlindSelectScreenProps) {
  const hasSmall = history.some((r) => r.round === round && r.blind === 'SMALL');
  const hasBig = history.some((r) => r.round === round && r.blind === 'BIG');
  const hasBoss = history.some((r) => r.round === round && r.blind === 'BOSS');

  let currentActive: 'SMALL' | 'BIG' | 'BOSS' = 'SMALL';
  if (hasSmall && !hasBig) currentActive = 'BIG';
  if (hasSmall && hasBig && !hasBoss) currentActive = 'BOSS';

  const smallTarget = getBlindTarget('SMALL');
  const bigTarget = getBlindTarget('BIG');
  const bossTarget = getBlindTarget('BOSS');

  const bossIndex = Math.min(round - 1, BOSS_BLINDS.length - 1);
  const boss = BOSS_BLINDS[bossIndex];
  const tierColor = TIER_COLORS[boss.tier];

  return (
    <div className="w-full max-w-xl my-auto rounded-3xl bg-slate-900 border-4 border-slate-950 p-8 shadow-2xl text-white crt select-none">
      <div className="text-center py-2 border-b border-slate-800 flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-black font-pixel tracking-wider text-red-500 uppercase">
            KABİNE EŞİKLERİ
          </h2>
          <p className="text-xs text-slate-500 font-bold uppercase tracking-wider text-left mt-0.5 font-sans">
            Seferinizi şekillendirmek için bir eşik seçin veya pas geçin
          </p>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-xs text-slate-400 font-bold uppercase tracking-wider font-sans">Mevcut Seviye</span>
          <span className="font-pixel text-2xl text-amber-400">SAFHA {round} / 8</span>
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-4">
        {/* SMALL BLIND CARD */}
        <div
          className={[
            'flex items-center justify-between p-4 rounded-2xl border-2 transition',
            hasSmall
              ? 'border-slate-800 bg-slate-950/20 opacity-40'
              : currentActive === 'SMALL'
                ? 'border-teal-600 bg-teal-950/10 shadow-[0_0_12px_rgba(45,157,150,0.2)]'
                : 'border-slate-800 bg-slate-950/20',
          ].join(' ')}
        >
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-black text-teal-400 font-pixel uppercase">Hafif Eşik</span>
              {hasSmall && <span className="text-[11px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded font-bold">TAMAMLANDI</span>}
            </div>
            <p className="text-xs text-slate-350 mt-1 font-sans">Hedef: <span className="font-pixel text-sm text-slate-200">{smallTarget}</span></p>
            <p className="text-xs text-slate-500 font-bold font-sans">ÖDÜL: <span className="text-amber-400 font-pixel">$3</span></p>
          </div>
          
          {/* Skip Tag visual presentation */}
          {!hasSmall && currentActive === 'SMALL' && smallBlindTag && (
            <div className="flex items-center gap-2 bg-slate-950/60 border border-amber-500/20 rounded-xl p-2 max-w-[190px] shadow-inner shrink-0">
              <span className="text-2xl drop-shadow-[0_0_5px_rgba(251,191,36,0.5)]">{smallBlindTag.icon}</span>
              <div className="flex flex-col leading-tight select-none">
                <span className="font-pixel text-[10px] font-extrabold text-amber-300 uppercase tracking-wider">{smallBlindTag.name}</span>
                <span className="text-[7.5px] text-slate-400 font-sans leading-tight mt-0.5">{smallBlindTag.description}</span>
              </div>
            </div>
          )}

          {!hasSmall && currentActive === 'SMALL' && (
            <div className="flex flex-col gap-2 shrink-0">
              <button
                onClick={() => onPlay('SMALL')}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 active:translate-y-0.5 text-xs font-pixel font-bold text-white rounded-xl shadow border-b-2 border-emerald-800 transition"
              >
                MÜCADELE ET
              </button>
              <button
                onClick={() => onSkip('SMALL')}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 active:translate-y-0.5 text-[11px] font-bold text-slate-300 rounded-lg border border-slate-950 transition font-sans"
              >
                PAS GEÇ (SKIP)
              </button>
            </div>
          )}
        </div>

        {/* BIG BLIND CARD */}
        <div
          className={[
            'flex items-center justify-between p-4 rounded-2xl border-2 transition',
            hasBig
              ? 'border-slate-800 bg-slate-950/20 opacity-40'
              : currentActive === 'BIG'
                ? 'border-amber-500 bg-amber-950/10 shadow-[0_0_12px_rgba(245,158,11,0.2)]'
                : 'border-slate-800 bg-slate-950/20',
          ].join(' ')}
        >
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-black text-amber-400 font-pixel uppercase">Ağır Eşik</span>
              {hasBig && <span className="text-[11px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded font-bold">TAMAMLANDI</span>}
            </div>
            <p className="text-xs text-slate-350 mt-1 font-sans">Hedef: <span className="font-pixel text-sm text-slate-200">{bigTarget}</span></p>
            <p className="text-xs text-slate-500 font-bold font-sans">ÖDÜL: <span className="text-amber-400 font-pixel">$4</span></p>
          </div>
          
          {/* Skip Tag visual presentation */}
          {!hasBig && currentActive === 'BIG' && bigBlindTag && (
            <div className="flex items-center gap-2 bg-slate-950/60 border border-amber-500/20 rounded-xl p-2 max-w-[190px] shadow-inner shrink-0">
              <span className="text-2xl drop-shadow-[0_0_5px_rgba(251,191,36,0.5)]">{bigBlindTag.icon}</span>
              <div className="flex flex-col leading-tight select-none">
                <span className="font-pixel text-[10px] font-extrabold text-amber-300 uppercase tracking-wider">{bigBlindTag.name}</span>
                <span className="text-[7.5px] text-slate-400 font-sans leading-tight mt-0.5">{bigBlindTag.description}</span>
              </div>
            </div>
          )}

          {!hasBig && currentActive === 'BIG' && (
            <div className="flex flex-col gap-2 shrink-0">
              <button
                onClick={() => onPlay('BIG')}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 active:translate-y-0.5 text-xs font-pixel font-bold text-white rounded-xl shadow border-b-2 border-emerald-800 transition"
              >
                MÜCADELE ET
              </button>
              <button
                onClick={() => onSkip('BIG')}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 active:translate-y-0.5 text-[11px] font-bold text-slate-300 rounded-lg border border-slate-950 transition font-sans"
              >
                PAS GEÇ (SKIP)
              </button>
            </div>
          )}
        </div>

        {/* BOSS BLIND CARD — fully dynamic from BOSS_BLINDS array */}
        <div
          className={[
            'flex flex-col p-4 rounded-2xl border-2 transition',
            hasBoss
              ? 'border-slate-800 bg-slate-950/20 opacity-40'
              : currentActive === 'BOSS'
                ? `${tierColor.border} ${tierColor.bg} ${tierColor.glow}`
                : 'border-slate-800 bg-slate-950/20',
          ].join(' ')}
        >
          <div className="flex items-start justify-between w-full gap-3">
            {/* Boss icon */}
            <div className="text-4xl shrink-0 mt-0.5 drop-shadow-lg">{boss.icon}</div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-sm font-black font-pixel uppercase ${tierColor.label}`}>
                  {boss.name}
                </span>
                <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded uppercase ${tierColor.badge} font-sans`}>
                  {TIER_LABEL[boss.tier]}
                </span>
                {hasBoss && <span className="text-[11px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded font-bold">TAMAMLANDI</span>}
              </div>
              <p className="text-[10px] text-slate-400 italic mt-0.5 leading-tight font-sans">{boss.flavorText}</p>
              <p className="text-xs text-slate-350 mt-1.5 font-sans">
                Hedef: <span className="font-pixel text-sm text-slate-200">{bossTarget}</span>
              </p>
              <p className="text-xs text-slate-500 font-bold font-sans">ÖDÜL: <span className="text-amber-400 font-pixel">$5</span></p>
            </div>

            {!hasBoss && currentActive === 'BOSS' && (
              <button
                onClick={() => onPlay('BOSS')}
                className="px-5 py-2.5 bg-red-600 hover:bg-red-500 active:translate-y-0.5 text-xs font-pixel font-bold text-white rounded-xl shadow border-b-2 border-red-800 transition shrink-0 animate-pulse"
              >
                MÜCADELE ET
              </button>
            )}
          </div>

          {!hasBoss && (
            <div className={`mt-3 border-t border-slate-800/60 pt-2 flex items-center gap-2`}>
              <span className="text-base">{boss.icon}</span>
              <span className={`font-pixel text-sm tracking-wide leading-tight ${tierColor.label}`}>
                ⚠️ {boss.ruleLabel}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
