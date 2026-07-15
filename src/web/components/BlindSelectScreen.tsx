import type { RoundRecord } from '../../game/RunState.js';

interface BlindSelectScreenProps {
  round: number; // Current Ante
  history: RoundRecord[];
  getBlindTarget: (blindType: 'SMALL' | 'BIG' | 'BOSS') => number;
  onPlay: (blindType: 'SMALL' | 'BIG' | 'BOSS') => void;
  onSkip: (blindType: 'SMALL' | 'BIG') => void;
}

export default function BlindSelectScreen({
  round,
  history,
  getBlindTarget,
  onPlay,
  onSkip,
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

  // Boss Rules descriptions
  let bossRuleDesc = 'Sıfır Engeli: Bölme (÷) operatörünü kullanmak yasaktır.';
  if (round === 3 || round === 6) {
    bossRuleDesc = 'Hassas Denge: Kazandıktan sonra hedef skoru en fazla +15 aşabilirsiniz, yoksa kaybedersiniz.';
  } else if (round === 8) {
    bossRuleDesc = 'Büyük Baskı: Çıkarma işleminden gelen negatif puanlar ikiye katlanır.';
  }

  return (
    <div className="w-full max-w-xl my-auto rounded-3xl bg-slate-900 border-4 border-slate-950 p-8 shadow-2xl text-white crt select-none">
      <div className="text-center py-2 border-b border-slate-800 flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-black font-pixel tracking-wider text-red-500 uppercase">
            BLIND SEÇİMİ
          </h2>
          <p className="text-xs text-slate-500 font-bold uppercase tracking-wider text-left mt-0.5">
            Sonraki aşamayı seçin veya geçin
          </p>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Mevcut Seviye</span>
          <span className="font-pixel text-2xl text-amber-400">ANTE {round} / 8</span>
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
                ? 'border-sky-500 bg-sky-950/10 shadow-[0_0_12px_rgba(56,189,248,0.2)]'
                : 'border-slate-800 bg-slate-950/20',
          ].join(' ')}
        >
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-black text-sky-400 font-pixel uppercase">Küçük Blind</span>
              {hasSmall && <span className="text-[11px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded font-bold">TAMAMLANDI</span>}
            </div>
            <p className="text-xs text-slate-350 mt-1">Hedef: <span className="font-pixel text-sm text-slate-200">{smallTarget}</span></p>
            <p className="text-xs text-slate-500 font-bold">ÖDÜL: <span className="text-amber-400 font-pixel">$3</span></p>
            {!hasSmall && currentActive === 'SMALL' && (
              <p className="text-[11px] text-emerald-400 font-semibold mt-1">Geç Etiketi: +$4 Çiftçi Ödülü</p>
            )}
          </div>
          {!hasSmall && currentActive === 'SMALL' && (
            <div className="flex flex-col gap-2">
              <button
                onClick={() => onPlay('SMALL')}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 active:translate-y-0.5 text-xs font-pixel font-bold text-white rounded-xl shadow border-b-2 border-emerald-800 transition"
              >
                OYNA
              </button>
              <button
                onClick={() => onSkip('SMALL')}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 active:translate-y-0.5 text-[11px] font-bold text-slate-300 rounded-lg border border-slate-950 transition"
              >
                GEÇ (SKIP)
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
              <span className="text-sm font-black text-amber-400 font-pixel uppercase">Büyük Blind</span>
              {hasBig && <span className="text-[11px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded font-bold">TAMAMLANDI</span>}
            </div>
            <p className="text-xs text-slate-350 mt-1">Hedef: <span className="font-pixel text-sm text-slate-200">{bigTarget}</span></p>
            <p className="text-xs text-slate-500 font-bold">ÖDÜL: <span className="text-amber-400 font-pixel">$4</span></p>
            {!hasBig && currentActive === 'BIG' && (
              <p className="text-[11px] text-sky-400 font-semibold mt-1">Geç Etiketi: +1 İşlem Seviyesi Artışı</p>
            )}
          </div>
          {!hasBig && currentActive === 'BIG' && (
            <div className="flex flex-col gap-2">
              <button
                onClick={() => onPlay('BIG')}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 active:translate-y-0.5 text-xs font-pixel font-bold text-white rounded-xl shadow border-b-2 border-emerald-800 transition"
              >
                OYNA
              </button>
              <button
                onClick={() => onSkip('BIG')}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 active:translate-y-0.5 text-[11px] font-bold text-slate-300 rounded-lg border border-slate-950 transition"
              >
                GEÇ (SKIP)
              </button>
            </div>
          )}
        </div>

        {/* BOSS BLIND CARD */}
        <div
          className={[
            'flex flex-col p-4 rounded-2xl border-2 transition',
            hasBoss
              ? 'border-slate-800 bg-slate-950/20 opacity-40'
              : currentActive === 'BOSS'
                ? 'border-red-500 bg-red-950/10 shadow-[0_0_12px_rgba(239,68,68,0.2)]'
                : 'border-slate-800 bg-slate-950/20',
          ].join(' ')}
        >
          <div className="flex items-center justify-between w-full">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-black text-red-500 font-pixel uppercase">Boss Blind</span>
                {hasBoss && <span className="text-[11px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded font-bold">TAMAMLANDI</span>}
              </div>
              <p className="text-xs text-slate-350 mt-1">Hedef: <span className="font-pixel text-sm text-slate-200">{bossTarget}</span></p>
              <p className="text-xs text-slate-500 font-bold">ÖDÜL: <span className="text-amber-400 font-pixel">$5</span></p>
            </div>
            {!hasBoss && currentActive === 'BOSS' && (
              <button
                onClick={() => onPlay('BOSS')}
                className="px-6 py-2.5 bg-red-600 hover:bg-red-500 active:translate-y-0.5 text-xs font-pixel font-bold text-white rounded-xl shadow border-b-2 border-red-800 transition"
              >
                OYNA (BOSS)
              </button>
            )}
          </div>
          {!hasBoss && (
            <div className="mt-3 border-t border-slate-800/60 pt-2 text-xs font-medium font-outfit text-red-400/90 leading-tight">
              ⚠️ {bossRuleDesc}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
