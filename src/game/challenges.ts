export interface ChallengeDef {
  id: string;
  name: string;
  icon: string;
  description: string;
  rule: string;
  difficulty: 'Kolay' | 'Orta' | 'Zor' | 'Efsanevi';
  diffColor: string;
  unlocked: boolean;
}

export const CHALLENGES: ChallengeDef[] = [
  {
    id: 'ch_no_charms',
    name: 'Tılsımsız Sefer',
    icon: '🚫',
    description: 'Hiçbir tılsım olmadan seferi tamamla. Saf strateji ve zincir becerisi.',
    rule: 'Tılsım slotları devre dışı bırakılır.',
    difficulty: 'Orta',
    diffColor: 'text-amber-400',
    unlocked: true,
  },
  {
    id: 'ch_doubles_only',
    name: 'Çiftler Festivali',
    icon: '🎭',
    description: 'Sadece çift (double/spinner) taşlarla oyna. Dallanma ustası ol!',
    rule: 'Elde sadece çift taşlar gelir.',
    difficulty: 'Zor',
    diffColor: 'text-red-400',
    unlocked: true,
  },
  {
    id: 'ch_golden_rush',
    name: 'Altın Ateş',
    icon: '🔥',
    description: 'Tüm taşlar altın başlar ama hedef puanlar 2 katına çıkar!',
    rule: 'Tüm taşlar golden, hedefler x2.',
    difficulty: 'Zor',
    diffColor: 'text-red-400',
    unlocked: true,
  },
  {
    id: 'ch_speed_chain',
    name: 'Tek Zincir',
    icon: '⛓️',
    description: 'Dallanma yapılamaz — yalnızca düz bir zincir kurabilirsin.',
    rule: 'Sadece düz zincir, dallanma yok.',
    difficulty: 'Efsanevi',
    diffColor: 'text-fuchsia-400',
    unlocked: true,
  },
];
