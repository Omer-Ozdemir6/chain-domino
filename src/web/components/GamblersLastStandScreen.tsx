import type { GamblersLastStandResult } from '../../game/RunState.js';

interface GamblersLastStandScreenProps {
  money: number;
  shortfall: number;
  result: GamblersLastStandResult | null;
  onRoll: () => void;
}

const DICE_FACES = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];

/** "Kumarbazın Son Şansı" — offered once a round is otherwise unrecoverably lost: wager every
 *  dollar in the wallet on two dice for one last shot at the target before the run actually ends.
 *  Mounted by App.tsx as another modal-over-the-persistent-board overlay, same treatment as
 *  BlindSelectScreen/RoundRewardScreen/RunOverScreen. */
export default function GamblersLastStandScreen({ money, shortfall, result, onRoll }: GamblersLastStandScreenProps) {
  return (
    <div className="absolute inset-0 bg-stone-950/92 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="w-full max-w-md bg-stone-900 border-4 border-rose-950 rounded-3xl p-6 shadow-2xl text-white text-center">
        <h2 className="text-2xl font-bold font-pixel tracking-widest text-rose-400 uppercase">
          Kumarbazın Son Şansı
        </h2>
        <p className="mt-2 text-[12px] text-stone-400 leading-relaxed">
          Hedefe <span className="text-amber-300 font-bold">{shortfall}</span> puan kala elin bitti.
          Masaya son bir kumar yakışır — cebindeki her kuruşu ortaya koy, iki zar at.
        </p>

        {!result ? (
          <>
            <div className="mt-5 flex justify-center gap-8">
              <span className="text-6xl opacity-30">⚅</span>
              <span className="text-6xl opacity-30">⚅</span>
            </div>
            <div className="mt-5 bg-stone-950/50 border border-stone-800 rounded-xl py-2.5">
              <span className="text-[11px] text-stone-500 uppercase tracking-wider">Bahis</span>
              <div className="text-2xl font-pixel font-black text-amber-400">${money}</div>
            </div>
            <button
              type="button"
              onClick={onRoll}
              className="mt-5 w-full py-3 rounded-xl bg-rose-700 hover:bg-rose-600 text-base font-bold font-pixel text-white uppercase tracking-wider shadow border-b-4 border-rose-900 transition cursor-pointer active:translate-y-0.5"
            >
              🎲 ZARLARI AT
            </button>
          </>
        ) : (
          <>
            <div className="mt-5 flex justify-center gap-8">
              <span className="text-6xl animate-dice-tumble" style={{ animationDelay: '0ms' }}>
                {DICE_FACES[result.die1 - 1]}
              </span>
              <span className="text-6xl animate-dice-tumble" style={{ animationDelay: '90ms' }}>
                {DICE_FACES[result.die2 - 1]}
              </span>
            </div>
            <p className="mt-4 text-sm text-stone-300">
              {result.die1} + {result.die2} = <span className="font-bold text-amber-300">{result.die1 + result.die2}</span>
              {' × '}${result.wager} = <span className="font-bold text-amber-300">{result.scoreGained}</span> puan
            </p>
            <p className={`mt-3 text-xl font-pixel font-black uppercase tracking-wider ${result.success ? 'text-emerald-400' : 'text-rose-500'}`}>
              {result.success ? 'Kazandın!' : 'Zarlar seni terk etti...'}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
