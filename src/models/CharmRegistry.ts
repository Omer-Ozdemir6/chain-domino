import type { CharmDef } from './Charm.js';
import type { OperatorType } from './types.js';

export const CHARMS: readonly CharmDef[] = [
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
    description: "Bu turun 4. bağlantısından itibaren her bağlantıya +3 ekler — uzun zincirleri ödüllendirir.",
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
    description: 'Round\'u son turda (0 tur kalmışken) kazanırsan +$15 bonus.',
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
    description: 'Round\'u hedefi en fazla 5 puan aşarak kazanırsan +$12 verir — daha fazla aşarsan hiçbir şey almazsın.',
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
];
