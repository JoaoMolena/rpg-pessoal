/**
 * Bônus de XP por sequência ("constância").
 *
 * Quanto mais dias seguidos você progride, mais XP cada missão rende. O bônus é
 * aplicado **na conclusão** e fica congelado no log (`Completion.bonusXp`), como
 * o XP e o ouro: mudar a tabela no futuro não reprecifica o passado.
 *
 * Referência de ritmo (175 XP/dia = 1 épica + 1 difícil + 1 média), concluindo
 * todos os dias: 175 XP/dia até o 2º dia, 193 (+10%), 210 (+20%), 228 (+30%) e
 * 263 XP/dia a partir do 30º dia (+50%). Em 90 dias isso dá ~29% de XP extra.
 */
export interface StreakTier {
  /** Sequência mínima (em dias) para o degrau valer. */
  minStreak: number;
  /** Bônus de XP em %. */
  pct: number;
}

/** Degraus do bônus, do menor para o maior. */
export const STREAK_TIERS: readonly StreakTier[] = [
  { minStreak: 1, pct: 0 },
  { minStreak: 3, pct: 10 },
  { minStreak: 7, pct: 20 },
  { minStreak: 14, pct: 30 },
  { minStreak: 30, pct: 50 },
];

/** Bônus (%) concedido por uma sequência de `streak` dias. */
export function streakBonusPct(streak: number): number {
  let pct = 0;
  for (const tier of STREAK_TIERS) {
    if (streak >= tier.minStreak) pct = tier.pct;
  }
  return pct;
}

/** XP de bônus sobre um XP base, para uma sequência de `streak` dias. */
export function streakBonusXp(baseXp: number, streak: number): number {
  return Math.max(0, Math.round((baseXp * streakBonusPct(streak)) / 100));
}

/** Próximo degrau a partir da sequência atual (`null` quando já está no topo). */
export function nextStreakTier(streak: number): StreakTier | null {
  return STREAK_TIERS.find((tier) => tier.minStreak > streak) ?? null;
}
