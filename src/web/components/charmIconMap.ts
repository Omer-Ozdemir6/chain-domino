/**
 * Maps charm / voucher / consumable ids to hand-picked artwork sliced from the two curio sprite
 * sheets in public/cards (see public/cards/icons/*.png). Not every id has a mapped image — the
 * ~24 mechanically-generated per-operator variants (parity/value-range/expert/streak charms)
 * intentionally fall back to the generic SVG glyph in CharmBar.tsx, since the sheets don't have
 * enough distinct pieces to give every single one unique art.
 */
const ICONS = '/cards/icons';

export const CHARM_ICON_MAP: Record<string, string> = {
  // Core
  division_master: `${ICONS}/t2_r2c2.png`,
  add_master: `${ICONS}/t1_r0c0.png`,
  subtract_master: `${ICONS}/t1_r1c7.png`,
  multiplier_frenzy: `${ICONS}/t1_r4c5.png`,
  symmetry_bonus: `${ICONS}/t1_r2c6.png`,
  small_number_love: `${ICONS}/t1_r1c0.png`,
  simple_pleasures: `${ICONS}/t1_r4c1.png`,
  overtime: `${ICONS}/t1_r4c7.png`,
  four_way_harmony: `${ICONS}/t1_r2c4.png`,
  balance_master: `${ICONS}/t2_r1c3.png`,
  chain_end_interest: `${ICONS}/t1_r1c8.png`,
  loss_insurance: `${ICONS}/t2_r2c0.png`,
  generous_trader: `${ICONS}/t1_r2c8.png`,
  early_finisher: `${ICONS}/t1_r4c3.png`,
  double_hunter: `${ICONS}/t2_r3c0.png`,
  clutch_finisher: `${ICONS}/t2_r2c3.png`,
  twin_souls: `${ICONS}/t1_r0c6.png`,
  multiplier_resonance: `${ICONS}/t2_r1c6.png`,
  gamblers_spirit: `${ICONS}/t1_r4c8.png`,
  mad_scholar: `${ICONS}/t1_r0c2.png`,
  sacrificial_heart: `${ICONS}/t1_r2c1.png`,
  loan_shark: `${ICONS}/t2_r2c1.png`,
  fragile_victory: `${ICONS}/t2_r1c0.png`,
  legendary_symmetry: `${ICONS}/t2_r2c8.png`,

  // Positional
  opening_strike: `${ICONS}/t1_r1c3.png`,
  grand_finale: `${ICONS}/t1_r4c6.png`,
  minimalist: `${ICONS}/t2_r1c4.png`,

  // Economy
  flat_bonus_common: `${ICONS}/t1_r0c4.png`,
  flat_bonus_strong: `${ICONS}/t1_r0c5.png`,
  long_turn_reward: `${ICONS}/t2_r0c6.png`,
  overachiever: `${ICONS}/t2_r4c8.png`,
  lone_wolf: `${ICONS}/t2_r0c8.png`,
  perfect_landing: `${ICONS}/t1_r2c2.png`,
  almost_there: `${ICONS}/t1_r3c2.png`,
  comeback_kid: `${ICONS}/t2_r4c0.png`,
  spinner_fan: `${ICONS}/t1_r1c2.png`,
  penny_pincher: `${ICONS}/t1_r4c0.png`,
  grand_hoard: `${ICONS}/t2_r2c7.png`,
  swift_victory: `${ICONS}/t1_r1c1.png`,
  modest_gain: `${ICONS}/t1_r2c7.png`,
  triple_double: `${ICONS}/t2_r2c6.png`,
  marathon_runner: `${ICONS}/t1_r4c4.png`,

  // Curse
  chaos_coin: `${ICONS}/t1_r0c3.png`,
  reverse_symmetry: `${ICONS}/t2_r0c4.png`,
  add_sub_clash: `${ICONS}/t2_r0c2.png`,
  mul_div_clash: `${ICONS}/t2_r0c3.png`,
  lucky_dice: `${ICONS}/t1_r2c0.png`,
  all_or_nothing: `${ICONS}/t2_r2c4.png`,
  speed_demon: `${ICONS}/t2_r0c0.png`,
  volatile_soul: `${ICONS}/t1_r0c7.png`,
  debt_collector: `${ICONS}/t2_r0c5.png`,
  high_roller: `${ICONS}/t2_r2c5.png`,
  even_curse: `${ICONS}/t1_r3c4.png`,
  odd_curse: `${ICONS}/t1_r3c0.png`,
  boom_or_bust: `${ICONS}/t1_r3c6.png`,
  greedy_hand: `${ICONS}/t2_r1c7.png`,

  // Synergy
  synergy_all_masters: `${ICONS}/t2_r4c2.png`,
  synergy_economy_duo: `${ICONS}/t2_r1c5.png`,
  synergy_curse_ward: `${ICONS}/t2_r3c6.png`,
  synergy_small_simple: `${ICONS}/t2_r3c1.png`,
  synergy_harmony_overtime: `${ICONS}/t1_r1c5.png`,
  synergy_finisher_duo: `${ICONS}/t2_r3c3.png`,
  synergy_expert_masters: `${ICONS}/t1_r3c5.png`,

  // Legendary
  legendary_universal_chain: `${ICONS}/t2_r4c1.png`,
  legendary_double_edge: `${ICONS}/t2_r4c6.png`,
  legendary_grand_harmony: `${ICONS}/t2_r4c7.png`,
  legendary_midas: `${ICONS}/t2_r4c3.png`,
  legendary_final_boss: `${ICONS}/t2_r4c5.png`,

  // Numeric-coincidence flavor
  lucky_seven: `${ICONS}/t1_r0c1.png`,
  unlucky_thirteen: `${ICONS}/t2_r0c1.png`,
  double_trouble: `${ICONS}/t1_r2c5.png`,
  zero_hero: `${ICONS}/t1_r3c8.png`,
  six_pack: `${ICONS}/t1_r3c3.png`,
  total_recall: `${ICONS}/t1_r0c8.png`,
  steady_hand: `${ICONS}/t1_r2c3.png`,
  negative_nightmare: `${ICONS}/t2_r3c2.png`,
  thrifty_spender: `${ICONS}/t1_r4c2.png`,
  node_counter: `${ICONS}/t2_r1c1.png`,
  high_five: `${ICONS}/t2_r1c2.png`,
  perfect_ten: `${ICONS}/t1_r1c4.png`,
  mirror_image: `${ICONS}/t1_r1c6.png`,
};

export const VOUCHER_ICON_MAP: Record<string, string> = {
  voucher_wide_pockets: `${ICONS}/t2_r3c8.png`,
  voucher_wizard_bag: `${ICONS}/t2_r3c7.png`,
  voucher_rich_start: `${ICONS}/t2_r4c4.png`,
  voucher_crystal_ball: `${ICONS}/t1_r3c1.png`,
  // voucher_bargaining_power intentionally has no dedicated art — every other sprite-sheet image
  // is already claimed by a different item — it falls back to ShopScreen's generic voucher glyph.
};

export const CONSUMABLE_ICON_MAP: Record<string, string> = {
  consumable_magnet: `${ICONS}/t2_r0c7.png`,
  consumable_breaker: `${ICONS}/t1_r3c7.png`,
  consumable_gild: `${ICONS}/t2_r3c5.png`,
};
