export type QuestCategory =
  | 'saude'
  | 'estudo'
  | 'trabalho'
  | 'financas'
  | 'lazer'
  | 'social'
  | 'outros';

export type QuestDifficulty = 'facil' | 'media' | 'dificil' | 'epica';

export interface Quest {
  id: string;
  title: string;
  description?: string;
  category: QuestCategory;
  difficulty: QuestDifficulty;
  /** XP concedido ao concluir a missão (derivado da dificuldade). */
  xpReward: number;
  /** Data de criação no formato YYYY-MM-DD (missões são diárias). */
  date: string;
  completed: boolean;
  /** Data/hora (ISO 8601) da conclusão. */
  completedAt?: string;
}

export interface PlayerStats {
  /** XP acumulado em toda a jornada. */
  totalXp: number;
  completedQuests: number;
  /** Dias consecutivos com ao menos uma missão concluída. */
  currentStreak: number;
  longestStreak: number;
  /** Último dia (YYYY-MM-DD) em que houve conclusão. */
  lastCompletionDate?: string;
}

export interface AppState {
  playerName: string;
  playerAvatar: string;
  quests: Quest[];
  stats: PlayerStats;
}

export interface QuestInput {
  title: string;
  description?: string;
  category: QuestCategory;
  difficulty: QuestDifficulty;
}
