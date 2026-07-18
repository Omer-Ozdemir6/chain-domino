import type { CharmDef } from './Charm.js';

/** Every stone's own base score before any charm touches it — the "doğal toplam" (natural sum). */
function chipOf(s: { leftVal: number; rightVal: number }): number {
  return s.leftVal + s.rightVal;
}
function isDouble(s: { leftVal: number; rightVal: number }): boolean {
  return s.leftVal === s.rightVal;
}

/** The original, hand-authored core set. */
const CORE_CHARMS: readonly CharmDef[] = [
  {
    id: 'division_master',
    name: 'Tek Sayı Ustası',
    description: 'Toplamı TEK olan her taş için +4 Taban Puan ve +1 Çarpan.',
    cost: 5,
    rarity: 'COMMON',
    createHooks: () => ({
      onCalculate: (state, chain) => {
        const odds = chain.filter((s) => chipOf(s) % 2 === 1).length;
        return {
          chips: state.chips + odds * 4,
          mult: state.mult + odds * 1,
        };
      },
    }),
  },
  {
    id: 'add_master',
    name: 'Toplam Ustası',
    description: 'Toplamı ÇİFT olan her taş için +3 Taban Puan. Zincirde 3 veya daha fazla çift toplamlı taş varsa x1.2 Çarpan.',
    cost: 5,
    rarity: 'COMMON',
    createHooks: () => ({
      onCalculate: (state, chain) => {
        const evens = chain.filter((s) => chipOf(s) % 2 === 0).length;
        const nextState = { ...state, chips: state.chips + evens * 3 };
        return evens >= 3 ? { ...nextState, mult: nextState.mult * 1.2 } : nextState;
      },
    }),
  },
  {
    id: 'subtract_master',
    name: 'Eksi Ustası',
    description: 'Çiftli (spinner) OLMAYAN her taş için +6 Taban Puan. Eldeki tüm taşlar tekliyse +3 Çarpan.',
    cost: 5,
    rarity: 'COMMON',
    createHooks: () => ({
      onCalculate: (state, chain) => {
        const singles = chain.filter((s) => !isDouble(s)).length;
        const allSingles = singles === chain.length && chain.length > 0;
        return {
          chips: state.chips + singles * 6,
          mult: state.mult + (allSingles ? 3 : 0),
        };
      },
    }),
  },
  {
    id: 'multiplier_frenzy',
    name: 'Çarpan Coşkusu',
    description: 'Zincirdeki her 3. taş için Çarpanı x1.5 katlar.',
    cost: 7,
    rarity: 'UNCOMMON',
    createHooks: () => ({
      onCalculate: (state, chain) => {
        const times = Math.floor(chain.length / 3);
        let currentMult = state.mult;
        for (let i = 0; i < times; i++) {
          currentMult *= 1.5;
        }
        return { ...state, mult: currentMult };
      },
    }),
  },
  {
    id: 'symmetry_bonus',
    name: 'Simetri Ödülü',
    description: 'Çiftli (spinner) taş başına +8 Taban Puan ve +2 Çarpan.',
    cost: 5,
    rarity: 'COMMON',
    createHooks: () => ({
      onCalculate: (state, chain) => {
        const doubles = chain.filter(isDouble).length;
        return {
          chips: state.chips + doubles * 8,
          mult: state.mult + doubles * 2,
        };
      },
    }),
  },
  {
    id: 'small_number_love',
    name: 'Küçük Sayı Sevgisi',
    description: 'Toplamı 2 veya altında olan taş başına +6 Taban Puan. Ayrıca reroll maliyetini kalıcı olarak $1 düşürür.',
    cost: 5,
    rarity: 'COMMON',
    createHooks: () => ({
      onCalculate: (state, chain) => {
        const bonus = chain.filter((s) => chipOf(s) <= 2).length * 6;
        return { ...state, chips: state.chips + bonus };
      },
      // Note: Reroll reduction hook is integrated directly inside RunState reroll cost calculation when small_number_love is owned.
    }),
  },
  {
    id: 'simple_pleasures',
    name: 'Basit Zevkler',
    description: 'Toplamı 6 veya altında olan taş başına +4 Taban Puan. Round tek turda kazanılırsa +$6 bonus.',
    cost: 4,
    rarity: 'COMMON',
    createHooks: () => ({
      onCalculate: (state, chain) => {
        const bonus = chain.filter((s) => chipOf(s) <= 6).length * 4;
        return { ...state, chips: state.chips + bonus };
      },
      onRoundEnd: (ctx) => (ctx.turnsUsed === 1 ? 6 : 0),
    }),
  },
  {
    id: 'overtime',
    name: 'Ekstra Mesai',
    description: 'Zincirin 4. taşından itibaren her taşa +3 Çarpan ekler.',
    cost: 7,
    rarity: 'UNCOMMON',
    createHooks: () => ({
      onCalculate: (state, chain) => {
        const bonus = Math.max(0, chain.length - 3) * 3;
        return { ...state, mult: state.mult + bonus };
      },
    }),
  },
  {
    id: 'four_way_harmony',
    name: 'Dörtlü Uyum',
    description: 'Zincirde en az 4 farklı taş değeri varsa Çarpanı x2.0 katlar.',
    cost: 9,
    rarity: 'UNCOMMON',
    createHooks: () => ({
      onCalculate: (state, chain) => {
        const distinctValues = new Set(chain.map(chipOf));
        return distinctValues.size >= 4 ? { ...state, mult: state.mult * 2 } : state;
      },
    }),
  },
  {
    id: 'balance_master',
    name: 'Denge Ustası',
    description: 'Zincirde hem çiftli hem tekli taş varsa +20 Taban Puan ve +4 Çarpan.',
    cost: 8,
    rarity: 'UNCOMMON',
    createHooks: () => ({
      onCalculate: (state, chain) => {
        const hasDouble = chain.some(isDouble);
        const hasSingle = chain.some((s) => !isDouble(s));
        return hasDouble && hasSingle
          ? { chips: state.chips + 20, mult: state.mult + 4 }
          : state;
      },
    }),
  },

  // --- batch-total modifiers ---
  {
    id: 'chain_end_interest',
    name: 'Zincir Sonu Faizi',
    description: 'Pozitif bir taban puana %10 bonus ekler.',
    cost: 8,
    rarity: 'UNCOMMON',
    createHooks: () => ({
      onCalculate: (state) => (state.chips > 0 ? { ...state, chips: Math.round(state.chips * 1.1) } : state),
    }),
  },
  {
    id: 'loss_insurance',
    name: 'Kayıp Sigortası',
    description: 'Bu turun taban puanı asla 0\'ın altına düşmez.',
    cost: 6,
    rarity: 'COMMON',
    createHooks: () => ({
      onCalculate: (state) => (state.chips < 0 ? { ...state, chips: 0 } : state),
    }),
  },

  // --- round-end money ---
  {
    id: 'generous_trader',
    name: 'Cömert Tüccar',
    description: 'Her tamamlanan round için ekstra +$5 kazandırır.',
    cost: 6,
    rarity: 'COMMON',
    createHooks: () => ({ onRoundEnd: () => 5 }),
  },
  {
    id: 'early_finisher',
    name: 'Erken Bitiş Ustası',
    description: 'Kullanılmayan her tur için ekstra +$2 kazandırır.',
    cost: 7,
    rarity: 'UNCOMMON',
    createHooks: () => ({ onRoundEnd: (ctx) => ctx.turnsLeft * 2 }),
  },
  {
    id: 'double_hunter',
    name: 'Çift Avcısı',
    description: 'Tahtadaki her çift (spinner) taş için +$3 kazandırır.',
    cost: 10,
    rarity: 'RARE',
    createHooks: () => ({ onRoundEnd: (ctx) => ctx.nodes.filter((n) => n.isDouble).length * 3 }),
  },
  {
    id: 'clutch_finisher',
    name: 'Son Anda Kurtuluş',
    description: "Round'u son turda (0 tur kalmışken) kazanırsan +$15 bonus.",
    cost: 8,
    rarity: 'UNCOMMON',
    createHooks: () => ({ onRoundEnd: (ctx) => (ctx.turnsLeft === 0 ? 15 : 0) }),
  },

  // --- synergy charms (react to which other charms you own) ---
  {
    id: 'twin_souls',
    name: 'İkiz Ruhlar',
    description: "Tek Sayı Ustası ve Eksi Ustası'na BİRLİKTE sahipsen, her taşa +2 ekler.",
    cost: 10,
    rarity: 'RARE',
    createHooks: (ctx) => {
      const hasBoth = ctx.ownedCharmIds.includes('division_master') && ctx.ownedCharmIds.includes('subtract_master');
      return {
        onCalculate: (state, chain) => (hasBoth ? { ...state, chips: state.chips + chain.length * 2 } : state),
      };
    },
  },
  {
    id: 'multiplier_resonance',
    name: 'Çarpan Rezonansı',
    description: "Çarpan Coşkusu ve Simetri Ödülü'ne BİRLİKTE sahipsen, çiftli taşlara ekstra +8.",
    cost: 9,
    rarity: 'UNCOMMON',
    createHooks: (ctx) => {
      const hasBoth = ctx.ownedCharmIds.includes('multiplier_frenzy') && ctx.ownedCharmIds.includes('symmetry_bonus');
      return {
        onCalculate: (state, chain) =>
          hasBoth ? { ...state, chips: state.chips + chain.filter(isDouble).length * 8 } : state,
      };
    },
  },

  // --- curse charms — help and hurt at once ---
  {
    id: 'gamblers_spirit',
    name: 'Kumarbaz Ruhu',
    description: 'Pozitif taban puana %30 bonus verir, AMA negatifse %50 daha da kötüleştirir.',
    cost: 9,
    rarity: 'RARE',
    curse: true,
    createHooks: () => ({
      onCalculate: (state) => ({ ...state, chips: state.chips > 0 ? Math.round(state.chips * 1.3) : Math.round(state.chips * 1.5) }),
    }),
  },
  {
    id: 'mad_scholar',
    name: 'Çılgın Bilgin',
    description: 'Çiftli taşlara +8 verir, AMA tekli taşlara -3 uygular.',
    cost: 10,
    rarity: 'RARE',
    curse: true,
    createHooks: () => ({
      onCalculate: (state, chain) => {
        const bonus = chain.filter(isDouble).length * 8 - chain.filter((s) => !isDouble(s)).length * 3;
        return { ...state, chips: state.chips + bonus };
      },
    }),
  },
  {
    id: 'sacrificial_heart',
    name: 'Fedakar Kalp',
    description: 'Negatif taban puanı tamamen sıfırlar, AMA pozitifse %10 azaltır.',
    cost: 6,
    rarity: 'COMMON',
    curse: true,
    createHooks: () => ({
      onCalculate: (state) => ({ ...state, chips: state.chips > 0 ? Math.round(state.chips * 0.9) : 0 }),
    }),
  },
  {
    id: 'loan_shark',
    name: 'Tefeci',
    description: 'Her round sonunda +$6 verir, AMA negatif biten turların kaybını %20 artırır.',
    cost: 4,
    rarity: 'COMMON',
    curse: true,
    createHooks: () => ({
      onCalculate: (state) => (state.chips < 0 ? { ...state, chips: Math.round(state.chips * 1.2) } : state),
      onRoundEnd: () => 6,
    }),
  },
  {
    id: 'fragile_victory',
    name: 'Kırılgan Zafer',
    description: "Round'u hedefi en fazla 5 puan aşarak kazanırsan +$12 verir — daha fazla aşarsan hiçbir şey almazsın.",
    cost: 9,
    rarity: 'RARE',
    curse: true,
    createHooks: () => ({
      onRoundEnd: (ctx) => (ctx.finalScore - ctx.target <= 5 ? 12 : 0),
    }),
  },

  // --- legendary ---
  {
    id: 'legendary_symmetry',
    name: 'Efsanevi Simetri',
    description: "Simetri Ödülü'nün güçlü hali: çiftli taş başına +15 Taban Puan ve Çarpanı x1.5 katlar.",
    cost: 15,
    rarity: 'LEGENDARY',
    createHooks: () => ({
      onCalculate: (state, chain) => {
        const doubles = chain.filter(isDouble).length;
        let nextMult = state.mult;
        for (let i = 0; i < doubles; i++) {
          nextMult *= 1.5;
        }
        return {
          chips: state.chips + doubles * 15,
          mult: nextMult,
        };
      },
    }),
  },
  {
    id: 'cosmic_pendulum',
    name: 'Galaksili Büyük Saat',
    description: 'Eğer oynanan zincirde 5 veya daha fazla taş varsa Çarpanı x3.0 yapar. 3 el sonra yok olur.',
    cost: 8,
    rarity: 'UNCOMMON',
    perish: true,
    maxDurability: 3,
    createHooks: () => ({
      onCalculate: (state, chain) => {
        if (chain.length >= 5) {
          return { ...state, mult: state.mult * 3 };
        }
        return state;
      },
    }),
  },
  {
    id: 'heart_matryoshka',
    name: 'Anatomik Matruşka',
    description: 'Eğer zincirdeki tüm taşlar çift toplamlıysa (simetri varsa) Çarpanı x2.2 katlar.',
    cost: 8,
    rarity: 'RARE',
    createHooks: () => ({
      onCalculate: (state, chain) => {
        const isAllEven = chain.every((tile) => chipOf(tile) % 2 === 0);
        if (isAllEven && chain.length > 0) {
          return { ...state, mult: state.mult * 2.2 };
        }
        return state;
      },
    }),
  },
];

/** A small, distinct set replacing the old per-operator generated variants — since there's no
 *  operator identity left to multiply by 4 anymore, this stays a compact hand-picked set instead
 *  of a mechanically duplicated one. */
const GENERATED_CHARMS: readonly CharmDef[] = [
  {
    id: 'add_even_lover',
    name: 'Çift Sayı Sevgisi',
    description: 'Toplamı ÇİFT olan her taş için +4 Taban Puan ve +1 Çarpan.',
    cost: 5,
    rarity: 'COMMON',
    createHooks: () => ({
      onCalculate: (state, chain) => {
        const count = chain.filter((s) => chipOf(s) % 2 === 0).length;
        return {
          chips: state.chips + count * 4,
          mult: state.mult + count * 1,
        };
      },
    }),
  },
  {
    id: 'add_odd_lover',
    name: 'Tek Sayı Sevgisi',
    description: 'Toplamı TEK olan her taş için +4 Taban Puan ve +1 Çarpan.',
    cost: 5,
    rarity: 'COMMON',
    createHooks: () => ({
      onCalculate: (state, chain) => {
        const count = chain.filter((s) => chipOf(s) % 2 === 1).length;
        return {
          chips: state.chips + count * 4,
          mult: state.mult + count * 1,
        };
      },
    }),
  },
  {
    id: 'add_high_value',
    name: 'Ağır Yük',
    description: 'Toplamı 8 veya üzerinde olan her taş için +8 Taban Puan ve +2 Çarpan.',
    cost: 6,
    rarity: 'COMMON',
    createHooks: () => ({
      onCalculate: (state, chain) => {
        const count = chain.filter((s) => chipOf(s) >= 8).length;
        return {
          chips: state.chips + count * 8,
          mult: state.mult + count * 2,
        };
      },
    }),
  },
  {
    id: 'add_low_value',
    name: 'Hafif Yük',
    description: 'Toplamı 5 veya altında olan her taş için +5 Taban Puan ve +1 Çarpan.',
    cost: 4,
    rarity: 'COMMON',
    createHooks: () => ({
      onCalculate: (state, chain) => {
        const count = chain.filter((s) => chipOf(s) <= 5).length;
        return {
          chips: state.chips + count * 5,
          mult: state.mult + count * 1,
        };
      },
    }),
  },
  {
    id: 'add_expert',
    name: 'Kıdemli Çiftlik Ustası',
    description: 'Çiftli (spinner) taş başına +10 Taban Puan ve +3 Çarpan.',
    cost: 9,
    rarity: 'UNCOMMON',
    createHooks: () => ({
      onCalculate: (state, chain) => {
        const count = chain.filter(isDouble).length;
        return {
          chips: state.chips + count * 10,
          mult: state.mult + count * 3,
        };
      },
    }),
  },
  {
    id: 'subtract_expert',
    name: 'Kıdemli Zincir Ustası',
    description: 'Zincir 5 veya daha fazla taş içeriyorsa Çarpanı x1.5 katlar.',
    cost: 9,
    rarity: 'UNCOMMON',
    createHooks: () => ({
      onCalculate: (state, chain) =>
        chain.length >= 5 ? { ...state, mult: state.mult * 1.5 } : state,
    }),
  },
  {
    id: 'add_streak',
    name: 'Ardışık Seri',
    description: 'Zincirde art arda gelen iki taşın toplamı eşitse, her eşleşme için +12 Taban Puan ve +3 Çarpan.',
    cost: 7,
    rarity: 'UNCOMMON',
    createHooks: () => ({
      onCalculate: (state, chain) => {
        let matchCount = 0;
        for (let i = 1; i < chain.length; i++) {
          if (chipOf(chain[i]) === chipOf(chain[i - 1])) matchCount++;
        }
        return {
          chips: state.chips + matchCount * 12,
          mult: state.mult + matchCount * 3,
        };
      },
    }),
  },
];

// --- positional charms — reward where in the chain a stone falls ---
const POSITIONAL_CHARMS: readonly CharmDef[] = [
  {
    id: 'opening_strike',
    name: 'Açılış Vuruşu',
    description: 'Zincirin İLK (kök) taşına +25 Taban Puan ve +5 Çarpan ekler.',
    cost: 5,
    rarity: 'COMMON',
    createHooks: () => ({
      onCalculate: (state, chain) =>
        chain.length > 0
          ? { chips: state.chips + 25, mult: state.mult + 5 }
          : state,
    }),
  },
  {
    id: 'grand_finale',
    name: 'Büyük Final',
    description: 'Zincirin EN SON (yaprak) taşına Çarpanı x2.5 katlama özelliği verir.',
    cost: 10,
    rarity: 'RARE',
    createHooks: () => ({
      onCalculate: (state, chain) => {
        if (chain.length > 0) {
          // Double last stone's contribution or multiply the whole hand's mult
          return { ...state, mult: state.mult * 2.5 };
        }
        return state;
      },
    }),
  },
  {
    id: 'minimalist',
    name: 'Minimalist',
    description: 'Bu tur TAM OLARAK 2 taş oynayıp gönderirseniz Çarpanı +12 artırır.',
    cost: 6,
    rarity: 'UNCOMMON',
    createHooks: () => ({
      onCalculate: (state, chain) =>
        chain.length === 2 ? { ...state, mult: state.mult + 12 } : state,
    }),
  },
];

// --- round-end economy charms ---
const ECONOMY_CHARMS: readonly CharmDef[] = [
  { id: 'flat_bonus_common', name: 'Basit Zafer', description: 'Her round sonunda sabit +$3 kazandırır.', cost: 3, rarity: 'COMMON', createHooks: () => ({ onRoundEnd: () => 3 }) },
  { id: 'flat_bonus_strong', name: 'Deste Ustası', description: 'Her round sonunda sabit +$8 kazandırır.', cost: 10, rarity: 'RARE', createHooks: () => ({ onRoundEnd: () => 8 }) },
  { id: 'long_turn_reward', name: 'Uzun Yolculuk', description: "Kullandığınız her tur için +$1 kazandırır (Erken Bitiş Ustası'nın tam tersi).", cost: 6, rarity: 'COMMON', createHooks: () => ({ onRoundEnd: (ctx) => ctx.turnsUsed * 1 }) },
  { id: 'overachiever', name: 'Aşırı Başarı', description: 'Hedefi 20 veya daha fazla aşarak kazanırsan +$15 bonus.', cost: 9, rarity: 'RARE', createHooks: () => ({ onRoundEnd: (ctx) => (ctx.finalScore - ctx.target >= 20 ? 15 : 0) }) },
  { id: 'lone_wolf', name: 'Yalnız Kurt', description: "Tahtadaki çift OLMAYAN her taş için +$2 kazandırır (Çift Avcısı'nın tersi).", cost: 7, rarity: 'UNCOMMON', createHooks: () => ({ onRoundEnd: (ctx) => ctx.nodes.filter((n) => !n.isDouble).length * 2 }) },
  { id: 'perfect_landing', name: 'Tam İsabet', description: "Round'u skoru TAM OLARAK hedefe eşit bitirirsen +$25 bonus.", cost: 12, rarity: 'LEGENDARY', createHooks: () => ({ onRoundEnd: (ctx) => (ctx.finalScore === ctx.target ? 25 : 0) }) },
  { id: 'almost_there', name: 'Neredeyse Bitti', description: "1 tur kalmışken round'u kazanırsan +$7 bonus.", cost: 6, rarity: 'COMMON', createHooks: () => ({ onRoundEnd: (ctx) => (ctx.turnsLeft === 1 ? 7 : 0) }) },
  { id: 'comeback_kid', name: 'Geri Dönüş Çocuğu', description: "Raundu tam sınırda (son hamlede ya da bir önceki hamlede) kazanırsan +$10 bonus.", cost: 8, rarity: 'UNCOMMON', createHooks: () => ({ onRoundEnd: (ctx) => (ctx.turnsLeft <= 1 ? 10 : 0) }) },
  { id: 'spinner_fan', name: 'Fırıldak Hayranı', description: 'Tahtada en az 2 çift (spinner) taş varsa +$10 bonus.', cost: 8, rarity: 'UNCOMMON', createHooks: () => ({ onRoundEnd: (ctx) => (ctx.nodes.filter((n) => n.isDouble).length >= 2 ? 10 : 0) }) },
  { id: 'penny_pincher', name: 'Kuruşu Kurtaran', description: 'Her round sonunda +$4 kazandırır.', cost: 5, rarity: 'COMMON', createHooks: () => ({ onRoundEnd: () => 4 }) },
  { id: 'grand_hoard', name: 'Büyük Hazine', description: 'Tahtada 8 veya daha fazla taş biriktiyse (uzun round) +$12 bonus.', cost: 9, rarity: 'RARE', createHooks: () => ({ onRoundEnd: (ctx) => (ctx.nodes.length >= 8 ? 12 : 0) }) },
  { id: 'swift_victory', name: 'Hızlı Zafer', description: "Round'u 2 veya daha az tur kullanarak kazanırsan +$14 bonus.", cost: 9, rarity: 'RARE', createHooks: () => ({ onRoundEnd: (ctx) => (ctx.turnsUsed <= 2 ? 14 : 0) }) },
  { id: 'modest_gain', name: 'Mütevazı Kazanç', description: 'Her round sonunda +$2 kazandırır — ucuz ve garanti.', cost: 2, rarity: 'COMMON', createHooks: () => ({ onRoundEnd: () => 2 }) },
  { id: 'triple_double', name: 'Üçlü Çift', description: 'Tahtada TAM OLARAK 3 çift taş varsa +$18 bonus.', cost: 11, rarity: 'RARE', createHooks: () => ({ onRoundEnd: (ctx) => (ctx.nodes.filter((n) => n.isDouble).length === 3 ? 18 : 0) }) },
  { id: 'marathon_runner', name: 'Maraton Koşucusu', description: 'Tüm turları kullanıp (0 tur kalmışken) kazanırsan +$9 verir.', cost: 6, rarity: 'UNCOMMON', createHooks: () => ({ onRoundEnd: (ctx) => (ctx.turnsLeft === 0 ? 9 : 0) }) },
];

// --- more curse charms ---
const CURSE_CHARMS: readonly CharmDef[] = [
  {
    id: 'chaos_coin',
    name: 'Kaos Parası',
    description: 'Bu turun taban puanını %50 ihtimalle ikiye katlar, %50 ihtimalle SIFIRLAR.',
    cost: 9,
    rarity: 'RARE',
    curse: true,
    createHooks: () => ({
      onCalculate: (state) => ({ ...state, chips: Math.random() < 0.5 ? state.chips * 2 : 0 }),
    }),
  },
  {
    id: 'reverse_symmetry',
    name: 'Ters Simetri',
    description: 'Tekli taş +4, çiftli (spinner) taş -4 puan.',
    cost: 5,
    rarity: 'COMMON',
    curse: true,
    createHooks: () => ({
      onCalculate: (state, chain) => {
        const bonus = chain.filter((s) => !isDouble(s)).length * 4 - chain.filter(isDouble).length * 4;
        return { ...state, chips: state.chips + bonus };
      },
    }),
  },
  {
    id: 'add_sub_clash',
    name: 'Çift-Tek Çatışması',
    description: 'Çiftli taşa +6 verir, AMA tekli taşa -5 uygular.',
    cost: 8,
    rarity: 'UNCOMMON',
    curse: true,
    createHooks: () => ({
      onCalculate: (state, chain) => {
        const bonus = chain.filter(isDouble).length * 6 - chain.filter((s) => !isDouble(s)).length * 5;
        return { ...state, chips: state.chips + bonus };
      },
    }),
  },
  {
    id: 'mul_div_clash',
    name: 'Ağır-Hafif Çatışması',
    description: 'Toplamı 7 veya üzeri olan taşa +8 verir, AMA altındakine -6 uygular.',
    cost: 8,
    rarity: 'UNCOMMON',
    curse: true,
    createHooks: () => ({
      onCalculate: (state, chain) => {
        const bonus = chain.filter((s) => chipOf(s) >= 7).length * 8 - chain.filter((s) => chipOf(s) < 7).length * 6;
        return { ...state, chips: state.chips + bonus };
      },
    }),
  },
  {
    id: 'lucky_dice',
    name: 'Şanslı Zar',
    description: 'Her taş için %25 ihtimalle +10, %25 ihtimalle -5 puan (kalan %50 değişiklik yok).',
    cost: 7,
    rarity: 'UNCOMMON',
    curse: true,
    createHooks: () => ({
      onCalculate: (state, chain) => {
        let bonus = 0;
        chain.forEach(() => {
          const roll = Math.random();
          if (roll < 0.25) bonus += 10;
          else if (roll < 0.5) bonus -= 5;
        });
        return { ...state, chips: state.chips + bonus };
      },
    }),
  },
  {
    id: 'all_or_nothing',
    name: 'Ya Hep Ya Hiç',
    description: 'Zincirin İLK taşına +20 verir, AMA sonraki her taşa -3 uygular.',
    cost: 10,
    rarity: 'RARE',
    curse: true,
    createHooks: () => ({
      onCalculate: (state, chain) => {
        if (chain.length === 0) return state;
        const bonus = 20 - (chain.length - 1) * 3;
        return { ...state, chips: state.chips + bonus };
      },
    }),
  },
  {
    id: 'speed_demon',
    name: 'Aceleci İfrit',
    description: "Raundu en az 3 hamle kalmışken kazanırsan +$20 verir, AMA son hamleye kalırsan -$5 kaybedersin.",
    cost: 9,
    rarity: 'RARE',
    curse: true,
    createHooks: () => ({
      onRoundEnd: (ctx) => {
        if (ctx.turnsLeft >= 3) return 20;
        if (ctx.turnsLeft === 0) return -5;
        return 0;
      },
    }),
  },
  {
    id: 'volatile_soul',
    name: 'Değişken Ruh',
    description: 'Bu turun taban puanını %40 azaltır ya da %40 artırır — hangisi olacağı rastgele.',
    cost: 8,
    rarity: 'UNCOMMON',
    curse: true,
    createHooks: () => ({
      onCalculate: (state) => ({ ...state, chips: Math.round(state.chips * (Math.random() < 0.5 ? 0.6 : 1.4)) }),
    }),
  },
  {
    id: 'debt_collector',
    name: 'Borç Tahsildarı',
    description: 'Her round sonunda +$10 verir, AMA negatif biten turlara ekstra -3 ceza ekler.',
    cost: 7,
    rarity: 'UNCOMMON',
    curse: true,
    createHooks: () => ({
      onCalculate: (state) => (state.chips < 0 ? { ...state, chips: state.chips - 3 } : state),
      onRoundEnd: () => 10,
    }),
  },
  {
    id: 'high_roller',
    name: 'Büyük Oyuncu',
    description: 'Hedefi 15+ aşarsan +$20 verir, AMA aşmazsan (tam veya az) -$5 kaybedersin.',
    cost: 10,
    rarity: 'RARE',
    curse: true,
    createHooks: () => ({
      onRoundEnd: (ctx) => (ctx.finalScore - ctx.target >= 15 ? 20 : -5),
    }),
  },
  {
    id: 'even_curse',
    name: 'Çift Laneti',
    description: 'Toplamı ÇİFT olan taşa +7, TEK olana -4 puan.',
    cost: 6,
    rarity: 'COMMON',
    curse: true,
    createHooks: () => ({
      onCalculate: (state, chain) => {
        const bonus = chain.filter((s) => chipOf(s) % 2 === 0).length * 7 - chain.filter((s) => chipOf(s) % 2 === 1).length * 4;
        return { ...state, chips: state.chips + bonus };
      },
    }),
  },
  {
    id: 'odd_curse',
    name: 'Tek Laneti',
    description: 'Toplamı TEK olan taşa +7, ÇİFT olana -4 puan.',
    cost: 6,
    rarity: 'COMMON',
    curse: true,
    createHooks: () => ({
      onCalculate: (state, chain) => {
        const bonus = chain.filter((s) => chipOf(s) % 2 === 1).length * 7 - chain.filter((s) => chipOf(s) % 2 === 0).length * 4;
        return { ...state, chips: state.chips + bonus };
      },
    }),
  },
  {
    id: 'boom_or_bust',
    name: 'Ya Patlarsın Ya Batarsın',
    description: 'Bu turun taban puanını %70 ihtimalle sıfırlar, %30 ihtimalle 3 katına çıkarır.',
    cost: 11,
    rarity: 'RARE',
    curse: true,
    createHooks: () => ({
      onCalculate: (state) => ({ ...state, chips: Math.random() < 0.3 ? state.chips * 3 : 0 }),
    }),
  },
  {
    id: 'greedy_hand',
    name: 'Açgözlü El',
    description: 'Toplamı 9 veya üzeri olan taşa +9 verir, AMA altındakine -3 uygular.',
    cost: 7,
    rarity: 'UNCOMMON',
    curse: true,
    createHooks: () => ({
      onCalculate: (state, chain) => {
        const bonus = chain.filter((s) => chipOf(s) >= 9).length * 9 - chain.filter((s) => chipOf(s) < 9).length * 3;
        return { ...state, chips: state.chips + bonus };
      },
    }),
  },
];

// --- more synergy charms ---
const SYNERGY_CHARMS: readonly CharmDef[] = [
  {
    id: 'synergy_all_masters',
    name: 'Dört Usta Uyumu',
    description: 'Tek Sayı, Toplam, Eksi Ustası ve Çarpan Coşkusu\'nun HEPSİNE sahipsen, her taşa ekstra +5.',
    cost: 14,
    rarity: 'RARE',
    createHooks: (ctx) => {
      const hasAll =
        ctx.ownedCharmIds.includes('division_master') &&
        ctx.ownedCharmIds.includes('add_master') &&
        ctx.ownedCharmIds.includes('subtract_master') &&
        ctx.ownedCharmIds.includes('multiplier_frenzy');
      return {
        onCalculate: (state, chain) => (hasAll ? { ...state, chips: state.chips + chain.length * 5 } : state),
      };
    },
  },
  {
    id: 'synergy_economy_duo',
    name: 'Tüccar İkilisi',
    description: "Cömert Tüccar ve Erken Bitiş Ustası'na BİRLİKTE sahipsen, round sonunda ekstra +$5.",
    cost: 8,
    rarity: 'UNCOMMON',
    createHooks: (ctx) => {
      const hasBoth = ctx.ownedCharmIds.includes('generous_trader') && ctx.ownedCharmIds.includes('early_finisher');
      return { onRoundEnd: () => (hasBoth ? 5 : 0) };
    },
  },
  {
    id: 'synergy_curse_ward',
    name: 'Lanet Kalkanı',
    description: "Çılgın Bilgin'e sahipsen, onun tekli-taş cezasını hafifletir (çiftli taşlara ekstra +3).",
    cost: 10,
    rarity: 'RARE',
    createHooks: (ctx) => {
      const hasCurse = ctx.ownedCharmIds.includes('mad_scholar');
      return {
        onCalculate: (state, chain) =>
          hasCurse ? { ...state, chips: state.chips + chain.filter(isDouble).length * 3 } : state,
      };
    },
  },
  {
    id: 'synergy_small_simple',
    name: 'Küçük ve Basit',
    description: "Küçük Sayı Sevgisi ve Basit Zevkler'e BİRLİKTE sahipsen, toplamı 6 veya altındaki taşlara ekstra +3.",
    cost: 7,
    rarity: 'COMMON',
    createHooks: (ctx) => {
      const hasBoth = ctx.ownedCharmIds.includes('small_number_love') && ctx.ownedCharmIds.includes('simple_pleasures');
      return {
        onCalculate: (state, chain) =>
          hasBoth ? { ...state, chips: state.chips + chain.filter((s) => chipOf(s) <= 6).length * 3 } : state,
      };
    },
  },
  {
    id: 'synergy_harmony_overtime',
    name: 'Uyum ve Mesai',
    description: "Dörtlü Uyum ve Ekstra Mesai'ye BİRLİKTE sahipsen, 4. taştan itibaren ekstra +4.",
    cost: 9,
    rarity: 'UNCOMMON',
    createHooks: (ctx) => {
      const hasBoth = ctx.ownedCharmIds.includes('four_way_harmony') && ctx.ownedCharmIds.includes('overtime');
      return {
        onCalculate: (state, chain) =>
          hasBoth ? { ...state, chips: state.chips + Math.max(0, chain.length - 3) * 4 } : state,
      };
    },
  },
  {
    id: 'synergy_finisher_duo',
    name: 'Son Anda İkilisi',
    description: "Son Anda Kurtuluş ve Erken Bitiş Ustası'na BİRLİKTE sahipsen, hiç hamle kalmadan kazanınca ekstra +$5.",
    cost: 8,
    rarity: 'UNCOMMON',
    createHooks: (ctx) => {
      const hasBoth = ctx.ownedCharmIds.includes('clutch_finisher') && ctx.ownedCharmIds.includes('early_finisher');
      return { onRoundEnd: (roundCtx) => (hasBoth && roundCtx.turnsLeft === 0 ? 5 : 0) };
    },
  },
];

// --- extra legendary tier ---
const LEGENDARY_CHARMS: readonly CharmDef[] = [
  {
    id: 'legendary_universal_chain',
    name: 'Efsanevi Zincir',
    description: 'Zincirdeki HER taşa +10 puan ekler.',
    cost: 20,
    rarity: 'LEGENDARY',
    createHooks: () => ({
      onCalculate: (state, chain) => ({ ...state, chips: state.chips + chain.length * 10 }),
    }),
  },
  {
    id: 'legendary_double_edge',
    name: 'İki Ağızlı Kama',
    description: 'Lanetli bir antika kama: bu elin taban puanını 2 katına çıkarır (pozitifse), AMA negatifse 3 katına çıkarır.',
    cost: 18,
    rarity: 'LEGENDARY',
    curse: true,
    createHooks: () => ({
      onCalculate: (state) => ({ ...state, chips: state.chips > 0 ? state.chips * 2 : state.chips * 3 }),
    }),
  },
  {
    id: 'legendary_grand_harmony',
    name: 'Büyük Uyum',
    description: 'Zincir en az 6 taş içeriyorsa VE en az 2 çiftli taş varsa +40 bonus.',
    cost: 20,
    rarity: 'LEGENDARY',
    createHooks: () => ({
      onCalculate: (state, chain) =>
        chain.length >= 6 && chain.filter(isDouble).length >= 2 ? { ...state, chips: state.chips + 40 } : state,
    }),
  },
  {
    id: 'legendary_midas',
    name: 'Midas Dokunuşu',
    description: 'Her round sonunda sabit +$25 kazandırır.',
    cost: 22,
    rarity: 'LEGENDARY',
    createHooks: () => ({ onRoundEnd: () => 25 }),
  },
];

// --- numeric-coincidence flavor charms ---
const NUMBER_CHARMS: readonly CharmDef[] = [
  {
    id: 'lucky_seven',
    name: 'Şanslı Yedi',
    description: 'Toplamı TAM OLARAK 7 olan taş başına +7 bonus.',
    cost: 6,
    rarity: 'COMMON',
    createHooks: () => ({
      onCalculate: (state, chain) => ({ ...state, chips: state.chips + chain.filter((s) => chipOf(s) === 7).length * 7 }),
    }),
  },
  {
    id: 'unlucky_thirteen',
    name: 'Uğursuz On İki',
    description: 'Toplamı 12 (en yüksek çift) olan taş -8, değilse her taşa sabit +2.',
    cost: 5,
    rarity: 'COMMON',
    curse: true,
    createHooks: () => ({
      onCalculate: (state, chain) => {
        const bonus = chain.filter((s) => chipOf(s) === 12).length * -8 + chain.filter((s) => chipOf(s) !== 12).length * 2;
        return { ...state, chips: state.chips + bonus };
      },
    }),
  },
  {
    id: 'double_trouble',
    name: 'Çifte Bela',
    description: 'Çiftli (spinner) taş başına +12 puan.',
    cost: 11,
    rarity: 'RARE',
    createHooks: () => ({
      onCalculate: (state, chain) => ({ ...state, chips: state.chips + chain.filter(isDouble).length * 12 }),
    }),
  },
  {
    id: 'zero_hero',
    name: 'Sıfır Kahramanı',
    description: 'İçinde 0 pip olan taş başına +6 puan.',
    cost: 5,
    rarity: 'COMMON',
    createHooks: () => ({
      onCalculate: (state, chain) => ({ ...state, chips: state.chips + chain.filter((s) => s.leftVal === 0 || s.rightVal === 0).length * 6 }),
    }),
  },
  {
    id: 'six_pack',
    name: 'Altılı Paket',
    description: 'İçinde 6 pip olan taş başına +5 puan.',
    cost: 5,
    rarity: 'COMMON',
    createHooks: () => ({
      onCalculate: (state, chain) => ({ ...state, chips: state.chips + chain.filter((s) => s.leftVal === 6 || s.rightVal === 6).length * 5 }),
    }),
  },
  {
    id: 'total_recall',
    name: 'Toplu Hafıza',
    description: 'Zincirdeki taş sayısı kadar +1 ekstra puan.',
    cost: 7,
    rarity: 'UNCOMMON',
    createHooks: () => ({
      onCalculate: (state, chain) => ({ ...state, chips: state.chips + chain.length }),
    }),
  },
  {
    id: 'steady_hand',
    name: 'Sakin El',
    description: 'Zincirde en az 3 taş varsa, her taşa +1 küçük bonus.',
    cost: 3,
    rarity: 'COMMON',
    createHooks: () => ({
      onCalculate: (state, chain) => (chain.length >= 3 ? { ...state, chips: state.chips + chain.length } : state),
    }),
  },
  {
    id: 'negative_nightmare',
    name: 'Negatif Kabus',
    description: 'Toplamı 3 veya altında olan taşlar -2, üzerindekiler +1 verir.',
    cost: 6,
    rarity: 'UNCOMMON',
    curse: true,
    createHooks: () => ({
      onCalculate: (state, chain) => {
        const bonus = chain.filter((s) => chipOf(s) <= 3).length * -2 + chain.filter((s) => chipOf(s) > 3).length * 1;
        return { ...state, chips: state.chips + bonus };
      },
    }),
  },
  {
    id: 'synergy_expert_masters',
    name: 'Kıdemli İkili',
    description: "Kıdemli Çiftlik ve Kıdemli Zincir Ustası'na BİRLİKTE sahipsen, ikisine de ekstra +4.",
    cost: 12,
    rarity: 'RARE',
    createHooks: (ctx) => {
      const hasBoth = ctx.ownedCharmIds.includes('add_expert') && ctx.ownedCharmIds.includes('subtract_expert');
      return {
        onCalculate: (state, chain) => (hasBoth ? { ...state, chips: state.chips + chain.length * 4 } : state),
      };
    },
  },
  {
    id: 'legendary_final_boss',
    name: 'Şimşek Kahini',
    description: "Raundu 1 hamle veya daha az kullanarak kazanırsan +$40 verir.",
    cost: 25,
    rarity: 'LEGENDARY',
    createHooks: () => ({ onRoundEnd: (ctx) => (ctx.turnsUsed <= 1 ? 40 : 0) }),
  },
  {
    id: 'thrifty_spender',
    name: 'Tutumlu Harcayıcı',
    description: 'Her round sonunda +$7 kazandırır.',
    cost: 8,
    rarity: 'COMMON',
    createHooks: () => ({ onRoundEnd: () => 7 }),
  },
  {
    id: 'node_counter',
    name: 'Taş Sayaç',
    description: 'Tahtadaki taş sayısı TEK ise +$4, ÇİFT ise +$2 kazandırır.',
    cost: 5,
    rarity: 'UNCOMMON',
    createHooks: () => ({ onRoundEnd: (ctx) => (ctx.nodes.length % 2 === 1 ? 4 : 2) }),
  },
  {
    id: 'high_five',
    name: 'Beşinci Alamet',
    description: 'Tahtada TAM OLARAK 5 taş varsa +$16 bonus.',
    cost: 9,
    rarity: 'RARE',
    createHooks: () => ({ onRoundEnd: (ctx) => (ctx.nodes.length === 5 ? 16 : 0) }),
  },
  {
    id: 'perfect_ten',
    name: 'Kusursuz On',
    description: 'Toplamı TAM OLARAK 10 olan taş başına +5 ekstra puan.',
    cost: 6,
    rarity: 'COMMON',
    createHooks: () => ({
      onCalculate: (state, chain) => ({ ...state, chips: state.chips + chain.filter((s) => chipOf(s) === 10).length * 5 }),
    }),
  },
  {
    id: 'mirror_image',
    name: 'Ayna Görüntüsü',
    description: "Ters Simetri ve Simetri Ödülü'ne BİRLİKTE sahipsen, her taşa sabit +3.",
    cost: 10,
    rarity: 'RARE',
    createHooks: (ctx) => {
      const hasBoth = ctx.ownedCharmIds.includes('reverse_symmetry') && ctx.ownedCharmIds.includes('symmetry_bonus');
      return {
        onCalculate: (state, chain) => (hasBoth ? { ...state, chips: state.chips + chain.length * 3 } : state),
      };
    },
  },
];

const BASE_FUSION_COMPONENTS: readonly CharmDef[] = [
  {
    id: 'double_oracle',
    name: 'Çift Kehanet',
    description: 'Her ÇİFT taş oynandığında +6 puan.',
    cost: 7,
    rarity: 'UNCOMMON',
    createHooks: () => ({
      onCalculate: (state, chain) => {
        const doubleCount = chain.filter(isDouble).length;
        return { ...state, chips: state.chips + doubleCount * 6 };
      },
    }),
  },
  {
    id: 'binary_mirror',
    name: 'İkili Ayna',
    description: 'Her zincir başına sabit +4 taban puan.',
    cost: 8,
    rarity: 'UNCOMMON',
    createHooks: () => ({
      onCalculate: (state) => ({ ...state, chips: state.chips + 4 }),
    }),
  },
  {
    id: 'golden_abacus',
    name: 'Altın Abaküs',
    description: 'Oynanan her Altın Taş için +3 taban puan.',
    cost: 7,
    rarity: 'UNCOMMON',
    createHooks: () => ({
      onCalculate: (state, chain) => {
        const goldenCount = chain.filter((s) => s.isGolden).length;
        return { ...state, chips: state.chips + goldenCount * 3 };
      },
    }),
  },
  {
    id: 'thrifty_phantom',
    name: 'Cimri Hayalet',
    description: 'Her tur sonu +$3 kazandırır.',
    cost: 5,
    rarity: 'COMMON',
    createHooks: () => ({
      onRoundEnd: () => 3,
    }),
  },
  {
    id: 'chain_weaver',
    name: 'Zincir Dokuyucu',
    description: 'En az 4 taşlık zincir oynandığında +8 taban puan.',
    cost: 8,
    rarity: 'UNCOMMON',
    createHooks: () => ({
      onCalculate: (state, chain) => {
        if (chain.length >= 4) return { ...state, chips: state.chips + 8 };
        return state;
      },
    }),
  },
  {
    id: 'echo_chamber',
    name: 'Yankı Odası',
    description: 'Zincirdeki her taşa +2 ekler.',
    cost: 7,
    rarity: 'UNCOMMON',
    createHooks: () => ({
      onCalculate: (state, chain) => ({ ...state, chips: state.chips + chain.length * 2 }),
    }),
  },
  {
    id: 'obsidian_eye',
    name: 'Obsidyen Göz',
    description: 'Oynanan her Obsidyen taş +4 Çarpan ekler.',
    cost: 9,
    rarity: 'RARE',
    createHooks: () => ({
      onCalculate: (state, chain) => {
        const count = chain.filter((s) => s.modifier === 'OBSIDIAN').length;
        return { ...state, mult: state.mult + count * 4 };
      },
    }),
  },
  {
    id: 'ivory_veil',
    name: 'Fildişi Duvak',
    description: 'Oynanan her Fildişi taş +10 taban puan ekler.',
    cost: 9,
    rarity: 'RARE',
    createHooks: () => ({
      onCalculate: (state, chain) => {
        const count = chain.filter((s) => s.modifier === 'IVORY').length;
        return { ...state, chips: state.chips + count * 10 };
      },
    }),
  },
];

/** Hybrid charms created by fusing two owned charms in the shop. Each takes only 1 slot. */
const FUSION_CHARMS: readonly CharmDef[] = [
  {
    id: 'fusion_grand_resonance',
    name: 'Büyük Rezonans',
    description: '[FÜZ] cosmic_pendulum + heart_matryoshka: Çiftli taş başına +8 chip VE çiftli taşlar çarpanı +0.5 artırır.',
    cost: 0,
    rarity: 'LEGENDARY',
    createHooks: () => ({
      onCalculate: (state, chain) => {
        const doubleCount = chain.filter(isDouble).length;
        return { chips: state.chips + doubleCount * 8, mult: state.mult + doubleCount * 0.5 };
      },
    }),
  },
  {
    id: 'fusion_twin_oracle',
    name: 'İkiz Kehanet',
    description: '[FÜZ] double_oracle + binary_mirror: Çift taşlardan gelen puan 2 katına çıkar ve her zincir +10 taban puan kazandırır.',
    cost: 0,
    rarity: 'LEGENDARY',
    createHooks: () => ({
      onCalculate: (state, chain) => {
        const doubles = chain.filter(isDouble).length;
        return { ...state, chips: state.chips + doubles * 10 + 10 };
      },
    }),
  },
  {
    id: 'fusion_lucky_ledger',
    name: 'Şanslı Defter',
    description: '[FÜZ] golden_abacus + thrifty_phantom: Her Altın Taş +$5 ve her tur sonu +$2 ekstra ödül kazandırır.',
    cost: 0,
    rarity: 'LEGENDARY',
    createHooks: () => ({
      onRoundEnd: () => 2,
      onCalculate: (state, chain) => {
        const goldenCount = chain.filter((s) => s.isGolden).length;
        return { ...state, chips: state.chips + goldenCount * 5 };
      },
    }),
  },
  {
    id: 'fusion_resonant_chain',
    name: 'Rezonans Zinciri',
    description: '[FÜZ] chain_weaver + echo_chamber: 4+ taş zincirlerde Çarpan ×2 ve zincirdeki her taşa +3 puan.',
    cost: 0,
    rarity: 'LEGENDARY',
    createHooks: () => ({
      onCalculate: (state, chain) => {
        const withEcho = { ...state, chips: state.chips + chain.length * 3 };
        return chain.length >= 4 ? { ...withEcho, mult: withEcho.mult * 2 } : withEcho;
      },
    }),
  },
  {
    id: 'fusion_prism_eye',
    name: 'Prizma Gözü',
    description: '[FÜZ] obsidian_eye + ivory_veil: Her Obsidyen taş +8 Çarpan, her Fildişi taş +20 Taban Puan ekler.',
    cost: 0,
    rarity: 'LEGENDARY',
    createHooks: () => ({
      onCalculate: (state, chain) => {
        const obsidianCount = chain.filter((s) => s.modifier === 'OBSIDIAN').length;
        const ivoryCount = chain.filter((s) => s.modifier === 'IVORY').length;
        return {
          chips: state.chips + ivoryCount * 20,
          mult: state.mult + obsidianCount * 8,
        };
      },
    }),
  },
];

// --- Faz 10: "İmza Tılsımlar" — tetiklendiklerinde özel görsel+ses "yumruğu" olan, oyuncunun
// bizzat tıklayarak veya yerleştirme kuralını bükerek etkileşime girdiği amiral gemisi tılsımlar. ---
const SIGNATURE_CHARMS: readonly CharmDef[] = [
  {
    id: 'curators_gavel',
    name: 'Küratörün Çekici',
    description: 'Turda bir kez, üzerine tıklayıp elindeki bir taşı tıklayarak onu ikiye kır: [a|b] → [a|0] ve [b|0].',
    cost: 6,
    rarity: 'RARE',
    interactive: true,
    signature: { sound: 'gavel', visual: 'smoke' },
    createHooks: () => ({
      onActivate: (stone) => [
        { ...stone, id: `${stone.id}_a`, leftVal: stone.leftVal, rightVal: 0, isGolden: undefined },
        { ...stone, id: `${stone.id}_b`, leftVal: stone.rightVal, rightVal: 0, isGolden: undefined },
      ],
    }),
  },
  {
    id: 'alchemists_mirror',
    name: 'Simyacı Aynası',
    description: 'Turda bir kez, üzerine tıklayıp elindeki bir taşın iki ucunu anında yer değiştirir.',
    cost: 3,
    rarity: 'UNCOMMON',
    interactive: true,
    signature: { sound: 'chime', visual: 'smoke' },
    createHooks: () => ({
      onActivate: (stone) => [{ ...stone, leftVal: stone.rightVal, rightVal: stone.leftVal }],
    }),
  },
  {
    id: 'cosmic_singularity',
    name: 'Kadim Boşluk Küresi',
    description: 'Domino eşleşme kuralını tamamen geçersiz kılar: taşlar artık eşit değil, ARDIŞIK sayılarla dizilir. 5 el sonra yok olur.',
    cost: 10,
    rarity: 'LEGENDARY',
    placementMode: 'SEQUENCE',
    perish: true,
    maxDurability: 5,
    signature: { sound: 'void', visual: 'vortex' },
    createHooks: () => ({}),
  },
  {
    id: 'gluttonous_matryoshka',
    name: 'Obur Matruşka',
    description: 'Oynanan her çiftli (spinner) taş, zincirde kendinden önce gelen taşların puanını yutup çarpanına ekler.',
    cost: 7,
    rarity: 'RARE',
    signature: { sound: 'devour', visual: 'gnaw' },
    createHooks: () => ({
      onCalculate: (state, chain) => {
        let chips = state.chips;
        let mult = state.mult;
        const eaten = new Set<string>();
        chain.forEach((stone, i) => {
          if (!isDouble(stone)) return;
          let sum = 0;
          for (let j = 0; j < i; j++) {
            const prev = chain[j];
            if (eaten.has(prev.id)) continue;
            sum += chipOf(prev);
            eaten.add(prev.id);
          }
          if (sum > 0) {
            chips -= sum;
            mult += Math.round((sum / 10) * 10) / 10;
          }
        });
        return { chips, mult };
      },
    }),
  },
  {
    id: 'chrono_pendulum',
    name: 'Zamanı Büken Sarkaç',
    description: 'Rauntta bir kez: son taşınla hedefi geçemezsen zamanı 1 hamle geri sarar ve ücretsiz 1 taş çeker. 3 el sonra yok olur.',
    cost: 10,
    rarity: 'LEGENDARY',
    perish: true,
    maxDurability: 3,
    signature: { sound: 'rewind', visual: 'rewind' },
    createHooks: () => ({
      onSubmitFail: () => ({ rewind: true, freeDraw: 1 }),
    }),
  },
  {
    id: 'cracked_hourglass',
    name: 'Çatlak Kum Saati',
    description: 'Her el oynandığında fazladan x5 Çarpan (X Mult) verir. Ancak 4 el sonra tuzla buz olur!',
    cost: 10,
    rarity: 'LEGENDARY',
    perish: true,
    maxDurability: 4,
    signature: { sound: 'void', visual: 'smoke' },
    createHooks: () => ({
      onCalculate: (state) => ({ ...state, mult: state.mult * 5 }),
    }),
  },
];

/** Group 1 — Doğal Taş ve Nokta Manipülasyonu: react to the "Geliştirme Parşömeni" mystic upgrade
 *  points and the Fildişi seal, mirroring Balatro's Odd Todd/Fibonacci/Bloodstone family. */
const MYSTIC_CHARMS: readonly CharmDef[] = [
  {
    id: 'ancient_inkwell',
    name: 'Antik Mürekkep Hokkası',
    description: 'Zincirdeki her parıldayan mistik yükseltme noktası için +20 Taban Puan.',
    cost: 6,
    rarity: 'UNCOMMON',
    createHooks: () => ({
      onCalculate: (state, chain) => {
        const points = chain.reduce((sum, s) => sum + (s.leftUpgrade ?? 0) + (s.rightUpgrade ?? 0), 0);
        return points > 0 ? { ...state, chips: state.chips + points * 20 } : state;
      },
    }),
  },
  {
    id: 'cosmic_dice',
    name: 'Kozmik Zar',
    description: 'Zincirde Açık 5 veya Açık 6 değerine sahip bir taş varsa +8 Çarpan.',
    cost: 5,
    rarity: 'COMMON',
    createHooks: () => ({
      onCalculate: (state, chain) => {
        const hasFiveOrSix = chain.some((s) => [5, 6].includes(s.leftVal) || [5, 6].includes(s.rightVal));
        return hasFiveOrSix ? { ...state, mult: state.mult + 8 } : state;
      },
    }),
  },
  {
    id: 'noble_ivory_chest',
    name: 'Asil Fildişi Sandığı',
    description: 'Zincirde kalıcı bir Fildişi Mühür taşıyan taş varsa Çarpanı x2 katına çıkarır.',
    cost: 7,
    rarity: 'RARE',
    createHooks: () => ({
      onCalculate: (state, chain) => {
        const hasIvory = chain.some((s) => s.modifier === 'IVORY');
        return hasIvory ? { ...state, mult: state.mult * 2 } : state;
      },
    }),
  },
];

export const CHARMS: readonly CharmDef[] = [
  ...CORE_CHARMS,
  ...GENERATED_CHARMS,
  ...POSITIONAL_CHARMS,
  ...ECONOMY_CHARMS,
  ...CURSE_CHARMS,
  ...SYNERGY_CHARMS,
  ...LEGENDARY_CHARMS,
  ...NUMBER_CHARMS,
  ...BASE_FUSION_COMPONENTS,
  ...FUSION_CHARMS,
  ...SIGNATURE_CHARMS,
  ...MYSTIC_CHARMS,
];
