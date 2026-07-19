import { useState } from 'react';
import { CHARMS } from '../../models/CharmRegistry.js';
import { SHOP_UPGRADES, VOUCHERS } from '../../game/RunState.js';
import { renderCharmIcon } from './CharmBar.js';
import { renderVoucherIcon, renderUpgradeIcon, RARITY_BORDER, GEM_CLASS } from './ShopScreen.js';
import { loadDiscovered } from '../collection.js';

interface CollectionScreenProps {
  onBack: () => void;
}

type CollectionTab = 'CHARMS' | 'VOUCHERS' | 'UPGRADES';

export default function CollectionScreen({ onBack }: CollectionScreenProps) {
  const [tab, setTab] = useState<CollectionTab>('CHARMS');
  const discovered = loadDiscovered();

  const charmSeen = new Set(discovered.charms);
  const voucherSeen = new Set(discovered.vouchers);
  const upgradeSeen = new Set(discovered.upgrades);

  const tabs: Array<{ id: CollectionTab; label: string; count: number; total: number }> = [
    { id: 'CHARMS', label: 'Tılsımlar', count: charmSeen.size, total: CHARMS.length },
    { id: 'VOUCHERS', label: 'Fermanlar', count: voucherSeen.size, total: VOUCHERS.length },
    { id: 'UPGRADES', label: 'Büyüler', count: upgradeSeen.size, total: SHOP_UPGRADES.length },
  ];

  return (
    <div className="absolute inset-0 bg-stone-950/85 backdrop-blur-sm flex items-center justify-center p-4 z-40 animate-fade-in">
      <div className="w-full max-w-3xl bg-stone-900 border-4 border-stone-950 rounded-3xl p-6 shadow-2xl text-white flex flex-col max-h-[90vh]">
        <h2 className="text-center text-2xl font-bold font-pixel tracking-widest text-amber-400 uppercase border-b border-stone-800 pb-2">
          KOLEKSİYON
        </h2>
        <p className="text-center text-[12px] text-stone-500 mt-1.5 mb-4">
          Şimdiye kadar keşfettiğin tılsımlar, fermanlar ve büyüler.
        </p>

        {/* Tab switcher */}
        <div className="flex gap-2 mb-4">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`flex-1 py-2 rounded-lg border-2 text-[12px] font-pixel font-bold uppercase tracking-wider transition cursor-pointer select-none ${
                tab === t.id
                  ? 'border-amber-500 bg-amber-950/40 text-amber-300'
                  : 'border-stone-800 bg-stone-950/40 text-stone-500 hover:border-stone-700'
              }`}
            >
              {t.label}
              <span className="block text-[10px] font-normal normal-case tracking-normal opacity-70">
                {t.count}/{t.total}
              </span>
            </button>
          ))}
        </div>

        <div className="overflow-y-auto flex-1 pr-1">
          {tab === 'CHARMS' && (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2.5">
              {CHARMS.map((charm) => {
                const isSeen = charmSeen.has(charm.id);
                return (
                  <div
                    key={charm.id}
                    title={isSeen ? charm.description : undefined}
                    className={`relative flex flex-col items-center gap-1.5 p-2.5 rounded-xl border-2 text-center select-none ${
                      isSeen ? RARITY_BORDER[charm.rarity] : 'border-stone-800 bg-stone-950/60'
                    }`}
                  >
                    {isSeen && (
                      <span className={`absolute top-1.5 right-1.5 w-2 h-2 rounded-full ${GEM_CLASS[charm.rarity]}`} />
                    )}
                    <div className="w-12 h-12 flex items-center justify-center">
                      {isSeen ? renderCharmIcon(charm.id) : <span className="text-2xl opacity-30">🔒</span>}
                    </div>
                    <span className={`text-[10px] font-pixel font-bold leading-tight ${isSeen ? 'text-stone-200' : 'text-stone-700'}`}>
                      {isSeen ? charm.name : '???'}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {tab === 'VOUCHERS' && (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2.5">
              {VOUCHERS.map((voucher) => {
                const isSeen = voucherSeen.has(voucher.id);
                return (
                  <div
                    key={voucher.id}
                    title={isSeen ? voucher.description : undefined}
                    className={`flex flex-col items-center gap-1.5 p-2.5 rounded-xl border-2 text-center select-none ${
                      isSeen ? 'border-amber-700/60 bg-amber-950/20' : 'border-stone-800 bg-stone-950/60'
                    }`}
                  >
                    <div className="w-10 h-14 flex items-center justify-center">
                      {isSeen ? renderVoucherIcon(voucher.id) : <span className="text-2xl opacity-30">🔒</span>}
                    </div>
                    <span className={`text-[10px] font-pixel font-bold leading-tight ${isSeen ? 'text-stone-200' : 'text-stone-700'}`}>
                      {isSeen ? voucher.name : '???'}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {tab === 'UPGRADES' && (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2.5">
              {SHOP_UPGRADES.map((upgrade) => {
                const isSeen = upgradeSeen.has(upgrade.id);
                return (
                  <div
                    key={upgrade.id}
                    title={isSeen ? upgrade.description : undefined}
                    className={`flex flex-col items-center gap-1.5 p-2.5 rounded-xl border-2 text-center select-none ${
                      isSeen ? 'border-sky-700/60 bg-sky-950/20' : 'border-stone-800 bg-stone-950/60'
                    }`}
                  >
                    <div className="w-10 h-14 flex items-center justify-center">
                      {isSeen ? renderUpgradeIcon(upgrade.id) : <span className="text-2xl opacity-30">🔒</span>}
                    </div>
                    <span className={`text-[10px] font-pixel font-bold leading-tight ${isSeen ? 'text-stone-200' : 'text-stone-700'}`}>
                      {isSeen ? upgrade.name : '???'}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={onBack}
          className="mt-5 w-full py-2.5 bg-stone-800 hover:bg-stone-700 font-bold rounded-xl border border-stone-950 text-sm transition cursor-pointer select-none"
        >
          KAPAT
        </button>
      </div>
    </div>
  );
}
