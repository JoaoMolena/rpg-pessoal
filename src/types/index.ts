export type QuestCategory =
  | 'saude'
  | 'estudo'
  | 'trabalho'
  | 'financas'
  | 'lazer'
  | 'social'
  | 'outros';

export type QuestDifficulty = 'facil' | 'media' | 'dificil' | 'epica';

/** Versão atual do formato de dados persistido. */
export const SCHEMA_VERSION = 2;

export interface Quest {
  id: string;
  title: string;
  description?: string;
  category: QuestCategory;
  difficulty: QuestDifficulty;
  /** XP concedido ao concluir a missão (derivado da dificuldade atual). */
  xpReward: number;
  /** Data de criação no formato YYYY-MM-DD (missões são diárias). */
  date: string;
  completed: boolean;
  /** Data/hora (ISO 8601) da conclusão — espelha o log de `completions`. */
  completedAt?: string;
}

/**
 * Registro imutável de uma conclusão.
 *
 * É a **fonte de verdade** do XP e da sequência: o `xp` é congelado no momento da
 * conclusão, então editar a dificuldade da missão depois não altera o XP ganho.
 */
export interface Completion {
  id: string;
  questId: string;
  /** XP creditado no momento da conclusão. */
  xp: number;
  /** Data/hora (ISO 8601) da conclusão. */
  at: string;
}

export interface AppState {
  schemaVersion: number;
  playerName: string;
  playerAvatar: string;
  quests: Quest[];
  /** Log de conclusões (deriva `totalXp`, `completedQuests` e o streak). */
  completions: Completion[];
  /**
   * Maior XP já acumulado na jornada (high-water mark).
   * Não é redundante: serve para celebrar o level-up apenas uma vez,
   * evitando farmar a celebração ao desmarcar/marcar a mesma missão.
   */
  maxTotalXp: number;
}

/**
 * Estatísticas derivadas do estado — nunca armazenadas.
 * Consumidas pela UI e pelas conquistas.
 */
export interface GameStats {
  totalXp: number;
  completedQuests: number;
  /** Dias consecutivos com ao menos uma conclusão (0 se ontem e hoje não tiveram). */
  currentStreak: number;
  /** Maior sequência já alcançada. */
  longestStreak: number;
  /** XP conquistado hoje. */
  xpToday: number;
  /** Nível atual, derivado do XP total. */
  level: number;
}

export interface QuestInput {
  title: string;
  description?: string;
  category: QuestCategory;
  difficulty: QuestDifficulty;
}
