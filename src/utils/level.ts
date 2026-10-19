/**
 * Sistema de níveis do RPG pessoal.
 *
 * O nível é derivado do XP acumulado com a fórmula:
 *
 *   XP acumulado para atingir o nível L = 50 * (L - 1)^2
 *
 * Exemplos: nível 2 = 50 XP, nível 3 = 200 XP, nível 4 = 450 XP, nível 10 = 4.050 XP.
 * A curva quadrática faz o progresso ficar cada vez mais desafiador, como em um RPG.
 */

export interface LevelInfo {
  level: number;
  rank: string;
  /** XP acumulado no início do nível atual. */
  currentLevelStartXp: number;
  /** XP acumulado necessário para atingir o próximo nível. */
  nextLevelXp: number;
  /** XP conquistado dentro do nível atual. */
  progressIntoLevel: number;
  /** Quantidade de XP necessária para passar de nível. */
  levelRange: number;
}

export const RANKS: ReadonlyArray<{ minLevel: number; name: string }> = [
  { minLevel: 1, name: 'Recruta' },
  { minLevel: 3, name: 'Aprendiz' },
  { minLevel: 5, name: 'Aventureiro' },
  { minLevel: 8, name: 'Herói' },
  { minLevel: 12, name: 'Veterano' },
  { minLevel: 16, name: 'Elite' },
  { minLevel: 20, name: 'Mestre' },
  { minLevel: 25, name: 'Lenda' },
  { minLevel: 30, name: 'Mítico' },
];

/** XP acumulado necessário para atingir o nível informado. */
export function totalXpForLevel(level: number): number {
  return 50 * (level - 1) ** 2;
}

/** Nível derivado do XP acumulado (inicia em 1). */
export function levelFromXp(totalXp: number): number {
  return Math.floor(Math.sqrt(Math.max(0, totalXp) / 50)) + 1;
}

/** Título (rank) correspondente ao nível. */
export function getRank(level: number): string {
  let rank = RANKS[0].name;
  for (const entry of RANKS) {
    if (level >= entry.minLevel) rank = entry.name;
  }
  return rank;
}

/** Calcula todas as informações de progresso do jogador a partir do XP total. */
export function getLevelInfo(totalXp: number): LevelInfo {
  const level = levelFromXp(totalXp);
  const currentLevelStartXp = totalXpForLevel(level);
  const nextLevelXp = totalXpForLevel(level + 1);
  return {
    level,
    rank: getRank(level),
    currentLevelStartXp,
    nextLevelXp,
    progressIntoLevel: totalXp - currentLevelStartXp,
    levelRange: nextLevelXp - currentLevelStartXp,
  };
}
