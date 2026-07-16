import type { CharmDef } from './Charm.js';
import type { OperatorType } from './types.js';

const OPERATORS: readonly OperatorType[] = ['ADD', 'SUBTRACT', 'MULTIPLY', 'DIVIDE'];
const OP_NAME: Record<OperatorType, string> = {
  ADD: 'Toplama',
  SUBTRACT: 'Çıkarma',
  MULTIPLY: 'Çarpma',
  DIVIDE: 'Bölme',
};

/** The original, hand-authored core set (kept exactly as designed). */
const CORE_CHARMS: readonly CharmDef[] = [
  // --- A: edge-value modifiers ---
  {
    id: 'division_master',
    name: 'Bölüm Ustası',
    description: 'Her BÖLME işleminin sonucuna +3 ekler.',
    cost: 5,
    rarity: 'COMMON',
    createHooks: () => ({
      onOperatorResolve: (operator, _parentBase, _childExposed, edgeValue) =>
        operator === 'DIVIDE' ? edgeValue + 3 : edgeValue,
    }),
  },
  {
    id: 'add_master',
    name: 'Toplam Ustası',
    description: 'Her TOPLAMA işleminin sonucuna +2 ekler.',
    cost: 5,
    rarity: 'COMMON',
    createHooks: () => ({
      onOperatorResolve: (operator, _parentBase, _childExposed, edgeValue) =>
        operator === 'ADD' ? edgeValue + 2 : edgeValue,
    }),
  },
  {
    id: 'subtract_master',
    name: 'Eksi Ustası',
    description: 'Her ÇIKARMA işleminin sonucuna +4 ekler.',
    cost: 5,
    rarity: 'COMMON',
    createHooks: () => ({
      onOperatorResolve: (operator, _parentBase, _childExposed, edgeValue) =>
        operator === 'SUBTRACT' ? edgeValue + 4 : edgeValue,
    }),
  },
  {
    id: 'multiplier_frenzy',
    name: 'Çarpan Coşkusu',
    description: 'Bu turda çözülen her 3. bağlantının değerini ikiye katlar.',
    cost: 7,
    rarity: 'UNCOMMON',
    createHooks: () => {
      let count = 0;
      return {
        onOperatorResolve: (_operator, _parentBase, _childExposed, edgeValue) => {
          count += 1;
          return count % 3 === 0 ? edgeValue * 2 : edgeValue;
        },
      };
    },
  },
  {
    id: 'symmetry_bonus',
    name: 'Simetri Ödülü',
    description: 'Bağlantının iki ucu aynı sayıysa +5 puan.',
    cost: 5,
    rarity: 'COMMON',
    createHooks: () => ({
      onOperatorResolve: (_operator, parentBase, childExposed, edgeValue) =>
        parentBase === childExposed ? edgeValue + 5 : edgeValue,
    }),
  },
  {
    id: 'small_number_love',
    name: 'Küçük Sayı Sevgisi',
    description: 'Bağladığınız taşın açık değeri 2 veya altındaysa +4 puan.',
    cost: 4,
    rarity: 'COMMON',
    createHooks: () => ({
      onOperatorResolve: (_operator, _parentBase, childExposed, edgeValue) =>
        childExposed <= 2 ? edgeValue + 4 : edgeValue,
    }),
  },
  {
    id: 'simple_pleasures',
    name: 'Basit Zevkler',
    description: 'Bağlı taşın toplam değeri (parentBase) 6 veya altındaysa +3 puan.',
    cost: 4,
    rarity: 'COMMON',
    createHooks: () => ({
      onOperatorResolve: (_operator, parentBase, _childExposed, edgeValue) =>
        parentBase <= 6 ? edgeValue + 3 : edgeValue,
    }),
  },
  {
    id: 'overtime',
    name: 'Ekstra Mesai',
    description: 'Bu turun 4. bağlantısından itibaren her bağlantıya +3 ekler — uzun zincirleri ödüllendirir.',
    cost: 7,
    rarity: 'UNCOMMON',
    createHooks: () => {
      let count = 0;
      return {
        onOperatorResolve: (_operator, _parentBase, _childExposed, edgeValue) => {
          count += 1;
          return count >= 4 ? edgeValue + 3 : edgeValue;
        },
      };
    },
  },
  {
    id: 'four_way_harmony',
    name: 'Dörtlü Uyum',
    description: 'Bir turda TOPLAMA, ÇIKARMA, ÇARPMA ve BÖLME operatörlerinin hepsini en az bir kez kullanırsan +15 bonus.',
    cost: 9,
    rarity: 'UNCOMMON',
    createHooks: () => {
      let seen = new Set<OperatorType>();
      return {
        onOperatorResolve: (operator, _parentBase, _childExposed, edgeValue) => {
          seen.add(operator);
          return edgeValue;
        },
        onEvaluationEnd: (totalGain) => {
          const bonus = seen.size === 4 ? 15 : 0;
          seen = new Set();
          return totalGain + bonus;
        },
      };
    },
  },
  {
    id: 'balance_master',
    name: 'Denge Ustası',
    description: 'Bu turda en az bir ÇIKARMA VE en az bir BÖLME kullanırsan +12 bonus.',
    cost: 8,
    rarity: 'UNCOMMON',
    createHooks: () => {
      let hasSubtract = false;
      let hasDivide = false;
      return {
        onOperatorResolve: (operator, _parentBase, _childExposed, edgeValue) => {
          if (operator === 'SUBTRACT') hasSubtract = true;
          if (operator === 'DIVIDE') hasDivide = true;
          return edgeValue;
        },
        onEvaluationEnd: (totalGain) => {
          const bonus = hasSubtract && hasDivide ? 12 : 0;
          hasSubtract = false;
          hasDivide = false;
          return totalGain + bonus;
        },
      };
    },
  },

  // --- B: batch-total modifiers ---
  {
    id: 'chain_end_interest',
    name: 'Zincir Sonu Faizi',
    description: 'Pozitif bir zincir kazancına %10 bonus ekler.',
    cost: 8,
    rarity: 'UNCOMMON',
    createHooks: () => ({
      onEvaluationEnd: (totalGain) => (totalGain > 0 ? Math.round(totalGain * 1.1) : totalGain),
    }),
  },
  {
    id: 'loss_insurance',
    name: 'Kayıp Sigortası',
    description: 'Bu tur asla negatif puan kazanamazsın, en kötü ihtimalle 0.',
    cost: 6,
    rarity: 'COMMON',
    createHooks: () => ({
      onEvaluationEnd: (totalGain) => Math.max(0, totalGain),
    }),
  },

  // --- C: round-end money ---
  {
    id: 'generous_trader',
    name: 'Cömert Tüccar',
    description: 'Her tamamlanan round için ekstra +$5 kazandırır.',
    cost: 6,
    rarity: 'COMMON',
    createHooks: () => ({
      onRoundEnd: () => 5,
    }),
  },
  {
    id: 'early_finisher',
    name: 'Erken Bitiş Ustası',
    description: 'Kullanılmayan her tur için ekstra +$2 kazandırır.',
    cost: 7,
    rarity: 'UNCOMMON',
    createHooks: () => ({
      onRoundEnd: (ctx) => ctx.turnsLeft * 2,
    }),
  },
  {
    id: 'double_hunter',
    name: 'Çift Avcısı',
    description: 'Tahtadaki her çift (spinner) taş için +$3 kazandırır.',
    cost: 10,
    rarity: 'RARE',
    createHooks: () => ({
      onRoundEnd: (ctx) => ctx.nodes.filter((n) => n.isDouble).length * 3,
    }),
  },
  {
    id: 'clutch_finisher',
    name: 'Son Anda Kurtuluş',
    description: "Round'u son turda (0 tur kalmışken) kazanırsan +$15 bonus.",
    cost: 8,
    rarity: 'UNCOMMON',
    createHooks: () => ({
      onRoundEnd: (ctx) => (ctx.turnsLeft === 0 ? 15 : 0),
    }),
  },

  // --- D: synergy charms (react to which other charms you own) ---
  {
    id: 'twin_souls',
    name: 'İkiz Ruhlar',
    description: "Bölüm Ustası ve Eksi Ustası'na BİRLİKTE sahipsen, ikisinin bonusuna da +2 ekler.",
    cost: 10,
    rarity: 'RARE',
    createHooks: (ctx) => {
      const hasBoth = ctx.ownedCharmIds.includes('division_master') && ctx.ownedCharmIds.includes('subtract_master');
      return {
        onOperatorResolve: (operator, _parentBase, _childExposed, edgeValue) => {
          if (!hasBoth) return edgeValue;
          return operator === 'DIVIDE' || operator === 'SUBTRACT' ? edgeValue + 2 : edgeValue;
        },
      };
    },
  },
  {
    id: 'multiplier_resonance',
    name: 'Çarpan Rezonansı',
    description: "Çarpan Coşkusu ve Simetri Ödülü'ne BİRLİKTE sahipsen, simetrik ÇARPMA bağlantılarına ekstra +8.",
    cost: 9,
    rarity: 'UNCOMMON',
    createHooks: (ctx) => {
      const hasBoth = ctx.ownedCharmIds.includes('multiplier_frenzy') && ctx.ownedCharmIds.includes('symmetry_bonus');
      return {
        onOperatorResolve: (operator, parentBase, childExposed, edgeValue) =>
          hasBoth && operator === 'MULTIPLY' && parentBase === childExposed ? edgeValue + 8 : edgeValue,
      };
    },
  },

  // --- E: curse charms — help and hurt at once ---
  {
    id: 'gamblers_spirit',
    name: 'Kumarbaz Ruhu',
    description: 'Pozitif kazançlara %30 bonus verir, AMA negatif kazançları %50 daha da kötüleştirir.',
    cost: 9,
    rarity: 'RARE',
    curse: true,
    createHooks: () => ({
      onEvaluationEnd: (totalGain) => (totalGain > 0 ? Math.round(totalGain * 1.3) : Math.round(totalGain * 1.5)),
    }),
  },
  {
    id: 'mad_scholar',
    name: 'Çılgın Bilgin',
    description: 'ÇIKARMA ve BÖLME işlemlerine +8 verir, AMA TOPLAMA ve ÇARPMA işlemlerine -3 uygular.',
    cost: 10,
    rarity: 'RARE',
    curse: true,
    createHooks: () => ({
      onOperatorResolve: (operator, _parentBase, _childExposed, edgeValue) => {
        if (operator === 'SUBTRACT' || operator === 'DIVIDE') return edgeValue + 8;
        if (operator === 'ADD' || operator === 'MULTIPLY') return edgeValue - 3;
        return edgeValue;
      },
    }),
  },
  {
    id: 'sacrificial_heart',
    name: 'Fedakar Kalp',
    description: 'Negatif kazançları tamamen sıfırlar, AMA pozitif kazançları %10 azaltır.',
    cost: 6,
    rarity: 'COMMON',
    curse: true,
    createHooks: () => ({
      onEvaluationEnd: (totalGain) => (totalGain > 0 ? Math.round(totalGain * 0.9) : 0),
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
      onEvaluationEnd: (totalGain) => (totalGain < 0 ? Math.round(totalGain * 1.2) : totalGain),
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

  // --- F: legendary ---
  {
    id: 'legendary_symmetry',
    name: 'Efsanevi Simetri',
    description: "Simetri Ödülü'nün güçlü hali: bağlantının iki ucu aynı sayıysa +15 puan.",
    cost: 15,
    rarity: 'LEGENDARY',
    createHooks: () => ({
      onOperatorResolve: (_operator, parentBase, childExposed, edgeValue) =>
        parentBase === childExposed ? edgeValue + 15 : edgeValue,
    }),
  },
  {
    id: 'cosmic_pendulum',
    name: 'Galaksili Büyük Saat',
    description: 'Eğer oynanan zincirde 4 veya daha fazla taş varsa Çarpanı +4 artırır.',
    cost: 8,
    rarity: 'UNCOMMON',
    createHooks: () => ({
      onCalculate: (state, chain) => {
        if (chain.length >= 4) {
          return {
            ...state,
            mult: state.mult + 4,
          };
        }
        return state;
      },
    }),
  },
  {
    id: 'heart_matryoshka',
    name: 'Anatomik Matruşka',
    description: 'Eğer zincirdeki tüm taşlar çift sayıysa (simetri varsa) Çarpanı x1.5 katlar.',
    cost: 8,
    rarity: 'RARE',
    createHooks: () => ({
      onCalculate: (state, chain) => {
        const isAllEven = chain.every((tile) => (tile.leftVal + tile.rightVal) % 2 === 0);
        if (isAllEven && chain.length > 0) {
          return {
            ...state,
            mult: state.mult * 1.5,
          };
        }
        return state;
      },
    }),
  },
];

// --- G: per-operator parity charms (rewards odd/even exposed values) ---
const PARITY_CHARMS: readonly CharmDef[] = OPERATORS.flatMap((op) => [
  {
    id: `${op.toLowerCase()}_even_lover`,
    name: `${OP_NAME[op]} Çift Sayı Sevgisi`,
    description: `${OP_NAME[op]} işleminde bağlanan taşın açık değeri ÇİFT sayıysa +3 puan.`,
    cost: 5,
    rarity: 'COMMON' as const,
    createHooks: () => ({
      onOperatorResolve: (operator: OperatorType, _p: number, childExposed: number, edgeValue: number) =>
        operator === op && childExposed % 2 === 0 ? edgeValue + 3 : edgeValue,
    }),
  },
  {
    id: `${op.toLowerCase()}_odd_lover`,
    name: `${OP_NAME[op]} Tek Sayı Sevgisi`,
    description: `${OP_NAME[op]} işleminde bağlanan taşın açık değeri TEK sayıysa +3 puan.`,
    cost: 5,
    rarity: 'COMMON' as const,
    createHooks: () => ({
      onOperatorResolve: (operator: OperatorType, _p: number, childExposed: number, edgeValue: number) =>
        operator === op && childExposed % 2 === 1 ? edgeValue + 3 : edgeValue,
    }),
  },
]);

// --- H: per-operator high/low value charms ---
const VALUE_RANGE_CHARMS: readonly CharmDef[] = OPERATORS.flatMap((op) => [
  {
    id: `${op.toLowerCase()}_high_value`,
    name: `${OP_NAME[op]} Ağır Yük`,
    description: `${OP_NAME[op]} işleminde bağlı taşın toplamı (parentBase) 8 veya üzeriyse +5 puan.`,
    cost: 6,
    rarity: 'COMMON' as const,
    createHooks: () => ({
      onOperatorResolve: (operator: OperatorType, parentBase: number, _c: number, edgeValue: number) =>
        operator === op && parentBase >= 8 ? edgeValue + 5 : edgeValue,
    }),
  },
  {
    id: `${op.toLowerCase()}_low_value`,
    name: `${OP_NAME[op]} Hafif Yük`,
    description: `${OP_NAME[op]} işleminde bağlı taşın toplamı (parentBase) 5 veya altındaysa +3 puan.`,
    cost: 4,
    rarity: 'COMMON' as const,
    createHooks: () => ({
      onOperatorResolve: (operator: OperatorType, parentBase: number, _c: number, edgeValue: number) =>
        operator === op && parentBase <= 5 ? edgeValue + 3 : edgeValue,
    }),
  },
]);

// --- I: per-operator "expert" tier — a stronger, pricier version of each master charm ---
const EXPERT_BONUS: Record<OperatorType, number> = { ADD: 5, SUBTRACT: 7, MULTIPLY: 6, DIVIDE: 6 };
const EXPERT_CHARMS: readonly CharmDef[] = OPERATORS.map((op) => ({
  id: `${op.toLowerCase()}_expert`,
  name: `Kıdemli ${OP_NAME[op]} Ustası`,
  description: `Her ${OP_NAME[op].toUpperCase()} işleminin sonucuna +${EXPERT_BONUS[op]} ekler.`,
  cost: 9,
  rarity: 'UNCOMMON' as const,
  createHooks: () => ({
    onOperatorResolve: (operator: OperatorType, _p: number, _c: number, edgeValue: number) =>
      operator === op ? edgeValue + EXPERT_BONUS[op] : edgeValue,
  }),
}));

// --- J: per-operator streak charms — reward using the same operator twice in a row ---
const STREAK_CHARMS: readonly CharmDef[] = OPERATORS.map((op) => ({
  id: `${op.toLowerCase()}_streak`,
  name: `${OP_NAME[op]} Serisi`,
  description: `${OP_NAME[op]} işlemini art arda iki kez kullanırsan, ikincisine +6 bonus.`,
  cost: 7,
  rarity: 'UNCOMMON' as const,
  createHooks: () => {
    let last: OperatorType | null = null;
    return {
      onOperatorResolve: (operator: OperatorType, _p: number, _c: number, edgeValue: number) => {
        const bonus = operator === op && last === op ? 6 : 0;
        last = operator;
        return edgeValue + bonus;
      },
    };
  },
}));

// --- K: positional charms — reward where in the turn's sequence a connection falls ---
const POSITIONAL_CHARMS: readonly CharmDef[] = [
  {
    id: 'opening_strike',
    name: 'Açılış Vuruşu',
    description: "Bu turun İLK bağlantısına +4 puan ekler.",
    cost: 5,
    rarity: 'COMMON',
    createHooks: () => {
      let count = 0;
      return {
        onOperatorResolve: (_operator, _p, _c, edgeValue) => {
          count += 1;
          return count === 1 ? edgeValue + 4 : edgeValue;
        },
      };
    },
  },
  {
    id: 'grand_finale',
    name: 'Büyük Final',
    description: 'Bu turun 6. bağlantısından itibaren her bağlantıya +6 puan ekler (Ekstra Mesai\'nin güçlü hali).',
    cost: 10,
    rarity: 'RARE',
    createHooks: () => {
      let count = 0;
      return {
        onOperatorResolve: (_operator, _p, _c, edgeValue) => {
          count += 1;
          return count >= 6 ? edgeValue + 6 : edgeValue;
        },
      };
    },
  },
  {
    id: 'minimalist',
    name: 'Minimalist',
    description: "Bu tur TAM OLARAK 1 bağlantı kurup gönderirsen +6 bonus.",
    cost: 6,
    rarity: 'UNCOMMON',
    createHooks: () => {
      let count = 0;
      return {
        onOperatorResolve: (_operator, _p, _c, edgeValue) => {
          count += 1;
          return edgeValue;
        },
        onEvaluationEnd: (totalGain) => {
          const bonus = count === 1 ? 6 : 0;
          count = 0;
          return totalGain + bonus;
        },
      };
    },
  },
];

// --- L: more round-end economy charms ---
const ECONOMY_CHARMS: readonly CharmDef[] = [
  {
    id: 'flat_bonus_common',
    name: 'Basit Zafer',
    description: 'Her round sonunda sabit +$3 kazandırır.',
    cost: 3,
    rarity: 'COMMON',
    createHooks: () => ({ onRoundEnd: () => 3 }),
  },
  {
    id: 'flat_bonus_strong',
    name: 'Deste Ustası',
    description: 'Her round sonunda sabit +$8 kazandırır.',
    cost: 10,
    rarity: 'RARE',
    createHooks: () => ({ onRoundEnd: () => 8 }),
  },
  {
    id: 'long_turn_reward',
    name: 'Uzun Yolculuk',
    description: 'Kullandığınız her tur için +$1 kazandırır (Erken Bitiş Ustası\'nın tam tersi).',
    cost: 6,
    rarity: 'COMMON',
    createHooks: () => ({ onRoundEnd: (ctx) => ctx.turnsUsed * 1 }),
  },
  {
    id: 'overachiever',
    name: 'Aşırı Başarı',
    description: 'Hedefi 20 veya daha fazla aşarak kazanırsan +$15 bonus.',
    cost: 9,
    rarity: 'RARE',
    createHooks: () => ({ onRoundEnd: (ctx) => (ctx.finalScore - ctx.target >= 20 ? 15 : 0) }),
  },
  {
    id: 'lone_wolf',
    name: 'Yalnız Kurt',
    description: 'Tahtadaki çift OLMAYAN her taş için +$2 kazandırır (Çift Avcısı\'nın tersi).',
    cost: 7,
    rarity: 'UNCOMMON',
    createHooks: () => ({ onRoundEnd: (ctx) => ctx.nodes.filter((n) => !n.isDouble).length * 2 }),
  },
  {
    id: 'perfect_landing',
    name: 'Tam İsabet',
    description: "Round'u skoru TAM OLARAK hedefe eşit bitirirsen +$25 bonus.",
    cost: 12,
    rarity: 'LEGENDARY',
    createHooks: () => ({ onRoundEnd: (ctx) => (ctx.finalScore === ctx.target ? 25 : 0) }),
  },
  {
    id: 'almost_there',
    name: 'Neredeyse Bitti',
    description: '1 tur kalmışken round\'u kazanırsan +$7 bonus.',
    cost: 6,
    rarity: 'COMMON',
    createHooks: () => ({ onRoundEnd: (ctx) => (ctx.turnsLeft === 1 ? 7 : 0) }),
  },
  {
    id: 'comeback_kid',
    name: 'Geri Dönüş Çocuğu',
    description: 'Round\'u tam sınırda (turnsLeft 0 veya 1) kazanırsan +$10 bonus.',
    cost: 8,
    rarity: 'UNCOMMON',
    createHooks: () => ({ onRoundEnd: (ctx) => (ctx.turnsLeft <= 1 ? 10 : 0) }),
  },
  {
    id: 'spinner_fan',
    name: 'Fırıldak Hayranı',
    description: 'Tahtada en az 2 çift (spinner) taş varsa +$10 bonus.',
    cost: 8,
    rarity: 'UNCOMMON',
    createHooks: () => ({ onRoundEnd: (ctx) => (ctx.nodes.filter((n) => n.isDouble).length >= 2 ? 10 : 0) }),
  },
  {
    id: 'penny_pincher',
    name: 'Kuruşu Kurtaran',
    description: 'Her round sonunda +$4 kazandırır.',
    cost: 5,
    rarity: 'COMMON',
    createHooks: () => ({ onRoundEnd: () => 4 }),
  },
  {
    id: 'grand_hoard',
    name: 'Büyük Hazine',
    description: 'Tahtada 8 veya daha fazla taş biriktiyse (uzun round) +$12 bonus.',
    cost: 9,
    rarity: 'RARE',
    createHooks: () => ({ onRoundEnd: (ctx) => (ctx.nodes.length >= 8 ? 12 : 0) }),
  },
  {
    id: 'swift_victory',
    name: 'Hızlı Zafer',
    description: 'Round\'u 2 veya daha az tur kullanarak kazanırsan +$14 bonus.',
    cost: 9,
    rarity: 'RARE',
    createHooks: () => ({ onRoundEnd: (ctx) => (ctx.turnsUsed <= 2 ? 14 : 0) }),
  },
  {
    id: 'modest_gain',
    name: 'Mütevazı Kazanç',
    description: 'Her round sonunda +$2 kazandırır — ucuz ve garanti.',
    cost: 2,
    rarity: 'COMMON',
    createHooks: () => ({ onRoundEnd: () => 2 }),
  },
  {
    id: 'triple_double',
    name: 'Üçlü Çift',
    description: 'Tahtada TAM OLARAK 3 çift taş varsa +$18 bonus.',
    cost: 11,
    rarity: 'RARE',
    createHooks: () => ({ onRoundEnd: (ctx) => (ctx.nodes.filter((n) => n.isDouble).length === 3 ? 18 : 0) }),
  },
  {
    id: 'marathon_runner',
    name: 'Maraton Koşucusu',
    description: 'Tüm turları kullanıp (0 tur kalmışken) kazanırsan +$9 verir.',
    cost: 6,
    rarity: 'UNCOMMON',
    createHooks: () => ({ onRoundEnd: (ctx) => (ctx.turnsLeft === 0 ? 9 : 0) }),
  },
];

// --- M: more curse charms ---
const CURSE_CHARMS: readonly CharmDef[] = [
  {
    id: 'chaos_coin',
    name: 'Kaos Parası',
    description: 'Bu turun kazancını %50 ihtimalle ikiye katlar, %50 ihtimalle SIFIRLAR.',
    cost: 9,
    rarity: 'RARE',
    curse: true,
    createHooks: () => ({
      onEvaluationEnd: (totalGain) => (Math.random() < 0.5 ? totalGain * 2 : 0),
    }),
  },
  {
    id: 'reverse_symmetry',
    name: 'Ters Simetri',
    description: 'Bağlantının iki ucu FARKLIYSA +4, AYNIYSA -4 puan.',
    cost: 5,
    rarity: 'COMMON',
    curse: true,
    createHooks: () => ({
      onOperatorResolve: (_operator, parentBase, childExposed, edgeValue) =>
        parentBase === childExposed ? edgeValue - 4 : edgeValue + 4,
    }),
  },
  {
    id: 'add_sub_clash',
    name: 'Toplama-Çıkarma Çatışması',
    description: 'TOPLAMA işlemine +6 verir, AMA ÇIKARMA işlemine -5 uygular.',
    cost: 8,
    rarity: 'UNCOMMON',
    curse: true,
    createHooks: () => ({
      onOperatorResolve: (operator, _p, _c, edgeValue) => {
        if (operator === 'ADD') return edgeValue + 6;
        if (operator === 'SUBTRACT') return edgeValue - 5;
        return edgeValue;
      },
    }),
  },
  {
    id: 'mul_div_clash',
    name: 'Çarpma-Bölme Çatışması',
    description: 'ÇARPMA işlemine +8 verir, AMA BÖLME işlemine -6 uygular.',
    cost: 8,
    rarity: 'UNCOMMON',
    curse: true,
    createHooks: () => ({
      onOperatorResolve: (operator, _p, _c, edgeValue) => {
        if (operator === 'MULTIPLY') return edgeValue + 8;
        if (operator === 'DIVIDE') return edgeValue - 6;
        return edgeValue;
      },
    }),
  },
  {
    id: 'lucky_dice',
    name: 'Şanslı Zar',
    description: 'Her bağlantıda %25 ihtimalle +10, %25 ihtimalle -5 puan (geri kalan %50 değişiklik yok).',
    cost: 7,
    rarity: 'UNCOMMON',
    curse: true,
    createHooks: () => ({
      onOperatorResolve: (_operator, _p, _c, edgeValue) => {
        const roll = Math.random();
        if (roll < 0.25) return edgeValue + 10;
        if (roll < 0.5) return edgeValue - 5;
        return edgeValue;
      },
    }),
  },
  {
    id: 'all_or_nothing',
    name: 'Ya Hep Ya Hiç',
    description: "Bu turun İLK bağlantısına +20 verir, AMA sonraki her bağlantıya -3 uygular.",
    cost: 10,
    rarity: 'RARE',
    curse: true,
    createHooks: () => {
      let count = 0;
      return {
        onOperatorResolve: (_operator, _p, _c, edgeValue) => {
          count += 1;
          return count === 1 ? edgeValue + 20 : edgeValue - 3;
        },
      };
    },
  },
  {
    id: 'speed_demon',
    name: 'Hız Şeytanı',
    description: 'turnsLeft 3 veya üzeriyle round\'u kazanırsan +$20 verir, AMA son tura kalırsan (turnsLeft 0) -$5 kaybedersin.',
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
    description: 'Bu turun kazancını %40 azaltır ya da %40 artırır — hangisi olacağı rastgele.',
    cost: 8,
    rarity: 'UNCOMMON',
    curse: true,
    createHooks: () => ({
      onEvaluationEnd: (totalGain) => Math.round(totalGain * (Math.random() < 0.5 ? 0.6 : 1.4)),
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
      onEvaluationEnd: (totalGain) => (totalGain < 0 ? totalGain - 3 : totalGain),
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
    description: 'Açık değer ÇİFT ise +7, TEK ise -4 puan.',
    cost: 6,
    rarity: 'COMMON',
    curse: true,
    createHooks: () => ({
      onOperatorResolve: (_operator, _p, childExposed, edgeValue) =>
        childExposed % 2 === 0 ? edgeValue + 7 : edgeValue - 4,
    }),
  },
  {
    id: 'odd_curse',
    name: 'Tek Laneti',
    description: 'Açık değer TEK ise +7, ÇİFT ise -4 puan.',
    cost: 6,
    rarity: 'COMMON',
    curse: true,
    createHooks: () => ({
      onOperatorResolve: (_operator, _p, childExposed, edgeValue) =>
        childExposed % 2 === 1 ? edgeValue + 7 : edgeValue - 4,
    }),
  },
  {
    id: 'boom_or_bust',
    name: 'Ya Patlarsın Ya Batarsın',
    description: 'Bu turun kazancını %70 ihtimalle sıfırlar, %30 ihtimalle 3 katına çıkarır.',
    cost: 11,
    rarity: 'RARE',
    curse: true,
    createHooks: () => ({
      onEvaluationEnd: (totalGain) => (Math.random() < 0.3 ? totalGain * 3 : 0),
    }),
  },
  {
    id: 'greedy_hand',
    name: 'Açgözlü El',
    description: 'parentBase 9 veya üzeriyse +9 verir, AMA 9\'un altındaysa -3 uygular.',
    cost: 7,
    rarity: 'UNCOMMON',
    curse: true,
    createHooks: () => ({
      onOperatorResolve: (_operator, parentBase, _c, edgeValue) =>
        parentBase >= 9 ? edgeValue + 9 : edgeValue - 3,
    }),
  },
];

// --- N: more synergy charms ---
const SYNERGY_CHARMS: readonly CharmDef[] = [
  {
    id: 'synergy_all_masters',
    name: 'Dört Usta Uyumu',
    description: 'Bölüm, Toplam, Eksi Ustası ve Çarpan Coşkusu\'nun HEPSİNE sahipsen, her bağlantıya ekstra +5.',
    cost: 14,
    rarity: 'RARE',
    createHooks: (ctx) => {
      const hasAll =
        ctx.ownedCharmIds.includes('division_master') &&
        ctx.ownedCharmIds.includes('add_master') &&
        ctx.ownedCharmIds.includes('subtract_master') &&
        ctx.ownedCharmIds.includes('multiplier_frenzy');
      return {
        onOperatorResolve: (_operator, _p, _c, edgeValue) => (hasAll ? edgeValue + 5 : edgeValue),
      };
    },
  },
  {
    id: 'synergy_economy_duo',
    name: 'Tüccar İkilisi',
    description: 'Cömert Tüccar ve Erken Bitiş Ustası\'na BİRLİKTE sahipsen, round sonunda ekstra +$5.',
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
    description: 'Çılgın Bilgin\'e sahipsen, onun TOPLAMA/ÇARPMA cezasını iptal eder (+3 geri verir).',
    cost: 10,
    rarity: 'RARE',
    createHooks: (ctx) => {
      const hasCurse = ctx.ownedCharmIds.includes('mad_scholar');
      return {
        onOperatorResolve: (operator, _p, _c, edgeValue) =>
          hasCurse && (operator === 'ADD' || operator === 'MULTIPLY') ? edgeValue + 3 : edgeValue,
      };
    },
  },
  {
    id: 'synergy_small_simple',
    name: 'Küçük ve Basit',
    description: 'Küçük Sayı Sevgisi ve Basit Zevkler\'e BİRLİKTE sahipsen, ikisi de aynı anda tetiklendiğinde ekstra +3.',
    cost: 7,
    rarity: 'COMMON',
    createHooks: (ctx) => {
      const hasBoth = ctx.ownedCharmIds.includes('small_number_love') && ctx.ownedCharmIds.includes('simple_pleasures');
      return {
        onOperatorResolve: (_operator, parentBase, childExposed, edgeValue) =>
          hasBoth && parentBase <= 6 && childExposed <= 2 ? edgeValue + 3 : edgeValue,
      };
    },
  },
  {
    id: 'synergy_harmony_overtime',
    name: 'Uyum ve Mesai',
    description: "Dörtlü Uyum ve Ekstra Mesai\'ye BİRLİKTE sahipsen, 4. bağlantıdan itibaren ekstra +4.",
    cost: 9,
    rarity: 'UNCOMMON',
    createHooks: (ctx) => {
      const hasBoth = ctx.ownedCharmIds.includes('four_way_harmony') && ctx.ownedCharmIds.includes('overtime');
      let count = 0;
      return {
        onOperatorResolve: (_operator, _p, _c, edgeValue) => {
          count += 1;
          return hasBoth && count >= 4 ? edgeValue + 4 : edgeValue;
        },
      };
    },
  },
  {
    id: 'synergy_finisher_duo',
    name: 'Son Anda İkilisi',
    description: 'Son Anda Kurtuluş ve Erken Bitiş Ustası\'na BİRLİKTE sahipsen, turnsLeft 0 iken ekstra +$5.',
    cost: 8,
    rarity: 'UNCOMMON',
    createHooks: (ctx) => {
      const hasBoth = ctx.ownedCharmIds.includes('clutch_finisher') && ctx.ownedCharmIds.includes('early_finisher');
      return { onRoundEnd: (roundCtx) => (hasBoth && roundCtx.turnsLeft === 0 ? 5 : 0) };
    },
  },
];

// --- O: extra legendary tier ---
const LEGENDARY_CHARMS: readonly CharmDef[] = [
  {
    id: 'legendary_universal_chain',
    name: 'Efsanevi Zincir',
    description: 'Operatör türü fark etmeksizin HER bağlantıya +10 puan ekler.',
    cost: 20,
    rarity: 'LEGENDARY',
    createHooks: () => ({
      onOperatorResolve: (_operator, _p, _c, edgeValue) => edgeValue + 10,
    }),
  },
  {
    id: 'legendary_double_edge',
    name: 'Efsanevi İkilik',
    description: 'Bu turun kazancını 2 katına çıkarır (pozitifse), AMA negatifse 3 katına çıkarır.',
    cost: 18,
    rarity: 'LEGENDARY',
    curse: true,
    createHooks: () => ({
      onEvaluationEnd: (totalGain) => (totalGain > 0 ? totalGain * 2 : totalGain * 3),
    }),
  },
  {
    id: 'legendary_grand_harmony',
    name: 'Büyük Uyum',
    description: 'Bir turda 4 operatörün tümünü VE en az 6 bağlantı kullanırsan +40 bonus.',
    cost: 20,
    rarity: 'LEGENDARY',
    createHooks: () => {
      let seen = new Set<OperatorType>();
      let count = 0;
      return {
        onOperatorResolve: (operator, _p, _c, edgeValue) => {
          seen.add(operator);
          count += 1;
          return edgeValue;
        },
        onEvaluationEnd: (totalGain) => {
          const bonus = seen.size === 4 && count >= 6 ? 40 : 0;
          seen = new Set();
          count = 0;
          return totalGain + bonus;
        },
      };
    },
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

// --- P: numeric-coincidence flavor charms ---
const NUMBER_CHARMS: readonly CharmDef[] = [
  {
    id: 'lucky_seven',
    name: 'Şanslı Yedi',
    description: 'Bağlı taş toplamı + açık değer = 7 ise +7 bonus.',
    cost: 6,
    rarity: 'COMMON',
    createHooks: () => ({
      onOperatorResolve: (_operator, parentBase, childExposed, edgeValue) =>
        parentBase + childExposed === 7 ? edgeValue + 7 : edgeValue,
    }),
  },
  {
    id: 'unlucky_thirteen',
    name: 'Uğursuz On Üç',
    description: 'Toplam 13 ise -8 puan, değilse her bağlantıya sabit +2.',
    cost: 5,
    rarity: 'COMMON',
    curse: true,
    createHooks: () => ({
      onOperatorResolve: (_operator, parentBase, childExposed, edgeValue) =>
        parentBase + childExposed === 13 ? edgeValue - 8 : edgeValue + 2,
    }),
  },
  {
    id: 'double_trouble',
    name: 'Çifte Bela',
    description: 'ÇARPMA işleminde iki uç eşitse (simetrik çarpım) +12 puan.',
    cost: 11,
    rarity: 'RARE',
    createHooks: () => ({
      onOperatorResolve: (operator, parentBase, childExposed, edgeValue) =>
        operator === 'MULTIPLY' && parentBase === childExposed ? edgeValue + 12 : edgeValue,
    }),
  },
  {
    id: 'zero_hero',
    name: 'Sıfır Kahramanı',
    description: 'Açık değer 0 ise +6 puan.',
    cost: 5,
    rarity: 'COMMON',
    createHooks: () => ({
      onOperatorResolve: (_operator, _p, childExposed, edgeValue) => (childExposed === 0 ? edgeValue + 6 : edgeValue),
    }),
  },
  {
    id: 'six_pack',
    name: 'Altılı Paket',
    description: 'Açık değer 6 ise +5 puan.',
    cost: 5,
    rarity: 'COMMON',
    createHooks: () => ({
      onOperatorResolve: (_operator, _p, childExposed, edgeValue) => (childExposed === 6 ? edgeValue + 5 : edgeValue),
    }),
  },
  {
    id: 'total_recall',
    name: 'Toplu Hafıza',
    description: 'Bu turda kurduğunuz her bağlantı için tur sonunda +1 ekstra puan.',
    cost: 7,
    rarity: 'UNCOMMON',
    createHooks: () => {
      let count = 0;
      return {
        onOperatorResolve: (_operator, _p, _c, edgeValue) => {
          count += 1;
          return edgeValue;
        },
        onEvaluationEnd: (totalGain) => {
          const bonus = count;
          count = 0;
          return totalGain + bonus;
        },
      };
    },
  },
  {
    id: 'steady_hand',
    name: 'Sakin El',
    description: 'Bağlantı zaten pozitifse +1 küçük bonus.',
    cost: 3,
    rarity: 'COMMON',
    createHooks: () => ({
      onOperatorResolve: (_operator, _p, _c, edgeValue) => (edgeValue > 0 ? edgeValue + 1 : edgeValue),
    }),
  },
  {
    id: 'negative_nightmare',
    name: 'Negatif Kabus',
    description: 'Bağlantı negatifse kaybı ikiye katlar, pozitifse küçük +1 bonus verir.',
    cost: 6,
    rarity: 'UNCOMMON',
    curse: true,
    createHooks: () => ({
      onOperatorResolve: (_operator, _p, _c, edgeValue) => (edgeValue < 0 ? edgeValue * 2 : edgeValue + 1),
    }),
  },
  {
    id: 'synergy_expert_masters',
    name: 'Kıdemli İkili',
    description: 'Kıdemli Toplam ve Kıdemli Eksi Ustası\'na BİRLİKTE sahipsen, ikisine de ekstra +4.',
    cost: 12,
    rarity: 'RARE',
    createHooks: (ctx) => {
      const hasBoth = ctx.ownedCharmIds.includes('add_expert') && ctx.ownedCharmIds.includes('subtract_expert');
      return {
        onOperatorResolve: (operator, _p, _c, edgeValue) =>
          hasBoth && (operator === 'ADD' || operator === 'SUBTRACT') ? edgeValue + 4 : edgeValue,
      };
    },
  },
  {
    id: 'legendary_final_boss',
    name: 'Son Patron',
    description: "Round'u 1 tur veya daha az kullanarak kazanırsan +$40 verir.",
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
    name: 'Beşli Çakış',
    description: "Tahtada TAM OLARAK 5 taş varsa +$16 bonus.",
    cost: 9,
    rarity: 'RARE',
    createHooks: () => ({ onRoundEnd: (ctx) => (ctx.nodes.length === 5 ? 16 : 0) }),
  },
  {
    id: 'perfect_ten',
    name: 'Kusursuz On',
    description: 'Bağlantının değeri TAM OLARAK 10 ise +5 ekstra puan.',
    cost: 6,
    rarity: 'COMMON',
    createHooks: () => ({
      onOperatorResolve: (_operator, _p, _c, edgeValue) => (edgeValue === 10 ? edgeValue + 5 : edgeValue),
    }),
  },
  {
    id: 'mirror_image',
    name: 'Ayna Görüntüsü',
    description: 'Ters Simetri ve Simetri Ödülü\'ne BİRLİKTE sahipsen, her bağlantıya sabit +3.',
    cost: 10,
    rarity: 'RARE',
    createHooks: (ctx) => {
      const hasBoth = ctx.ownedCharmIds.includes('reverse_symmetry') && ctx.ownedCharmIds.includes('symmetry_bonus');
      return {
        onOperatorResolve: (_operator, _p, _c, edgeValue) => (hasBoth ? edgeValue + 3 : edgeValue),
      };
    },
  },
];

/** Hybrid charms created by fusing two owned charms in the shop. Each takes only 1 slot. */
const FUSION_CHARMS: readonly CharmDef[] = [
  {
    id: 'fusion_grand_resonance',
    name: '⚡ Büyük Rezonans',
    description: '[FÜZ] cosmic_pendulum + heart_matryoshka: Her ÇARPMA işlemi +8 ekler VE çift taşlar çarpanı +0.5 artırır.',
    cost: 0,
    rarity: 'LEGENDARY',
    createHooks: () => ({
      onOperatorResolve: (operator, _p, _c, edgeValue) =>
        operator === 'MULTIPLY' ? edgeValue + 8 : edgeValue,
      onCalculate: (state, chain) => {
        const doubleCount = chain.filter((s) => s.leftVal === s.rightVal).length;
        return { ...state, mult: state.mult + doubleCount * 0.5 };
      },
    }),
  },
  {
    id: 'fusion_twin_oracle',
    name: '🔮 İkiz Kehanet',
    description: '[FÜZ] double_oracle + binary_mirror: Çift taşlardan gelen puan 2 katına çıkar ve her zincir +10 taban puan kazandırır.',
    cost: 0,
    rarity: 'LEGENDARY',
    createHooks: () => ({
      onCalculate: (state, chain) => {
        const doubles = chain.filter((s) => s.leftVal === s.rightVal).length;
        return { ...state, chips: state.chips + doubles * 10 + 10 };
      },
    }),
  },
  {
    id: 'fusion_lucky_ledger',
    name: '📒 Şanslı Defter',
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
    name: '🔗 Rezonans Zinciri',
    description: '[FÜZ] chain_weaver + echo_chamber: 4+ taş zincirlerde Çarpan ×2 ve her işlem başına +3 puan.',
    cost: 0,
    rarity: 'LEGENDARY',
    createHooks: () => ({
      onOperatorResolve: (_op, _p, _c, edgeValue) => edgeValue + 3,
      onCalculate: (state, chain) => {
        if (chain.length >= 4) return { ...state, mult: state.mult * 2 };
        return state;
      },
    }),
  },
  {
    id: 'fusion_prism_eye',
    name: '🌈 Prizma Gözü',
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

export const CHARMS: readonly CharmDef[] = [
  ...CORE_CHARMS,
  ...PARITY_CHARMS,
  ...VALUE_RANGE_CHARMS,
  ...EXPERT_CHARMS,
  ...STREAK_CHARMS,
  ...POSITIONAL_CHARMS,
  ...ECONOMY_CHARMS,
  ...CURSE_CHARMS,
  ...SYNERGY_CHARMS,
  ...LEGENDARY_CHARMS,
  ...NUMBER_CHARMS,
  ...FUSION_CHARMS,
];
