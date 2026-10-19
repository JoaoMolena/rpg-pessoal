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
export const SCHEMA_VERSION = 5;

/** Dia da semana: 0 = domingo ... 6 = sábado (mesma convenção de `Date.getDay()`). */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/** Como uma missão recorrente se repete. */
export type Recurrence =
  | { kind: 'daily' }
  | { kind: 'weekdays'; days: Weekday[] }
  | { kind: 'weekly'; weekday: Weekday };

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
  /** Se a missão foi gerada por um modelo recorrente, o id desse modelo. */
  templateId?: string;
}

/**
 * Registro imutável de uma conclusão.
 *
 * É a **fonte de verdade** do XP, da sequência e dos atributos: tanto o `xp`
 * quanto a `category` são congelados no momento da conclusão. Assim, editar a
 * dificuldade ou a categoria da missão depois não move XP nem atributo.
 */
export interface Completion {
  id: string;
  questId: string;
  /** XP creditado no momento da conclusão. */
  xp: number;
  /** Data/hora (ISO 8601) da conclusão. */
  at: string;
  /** Categoria da missão no momento da conclusão (define o atributo). */
  category: QuestCategory;
}

/**
 * Modelo de missão recorrente.
 *
 * Não é uma missão: serve para **gerar** missões do dia (no máximo uma por dia
 * aplicável) de forma idempotente. Mudar o modelo não altera missões já geradas.
 */
export interface QuestTemplate {
  id: string;
  title: string;
  description?: string;
  category: QuestCategory;
  difficulty: QuestDifficulty;
  recurrence: Recurrence;
  /** Pausada (`false`) deixa de gerar novas missões, sem apagar o histórico. */
  active: boolean;
  /** Última data (YYYY-MM-DD) em que gerou missão — evita duplicar ou retroagir. */
  lastGeneratedDate?: string;
}

/**
 * Preferências de notificações locais.
 *
 * Horários no formato `HH:MM` (24h). As duas opções começam **desligadas** para
 * que a permissão do sistema só seja pedida quando o usuário ativar algo.
 */
export interface NotificationSettings {
  /** Lembrete diário de missões. */
  dailyEnabled: boolean;
  /** Horário do lembrete diário (HH:MM). */
  dailyTime: string;
  /** Aviso no fim do dia quando a sequência está em risco. */
  streakEnabled: boolean;
  /** Horário do aviso de sequência (HH:MM). */
  streakTime: string;
}

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  dailyEnabled: false,
  dailyTime: '20:00',
  streakEnabled: false,
  streakTime: '21:30',
};

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
  /** Modelos de missões recorrentes. */
  templates: QuestTemplate[];
  /** Preferências de notificações locais. */
  notifications: NotificationSettings;
}

/**
 * Progresso de um atributo (uma categoria) — derivado do log, nunca armazenado.
 *
 * O nível do atributo usa a **mesma curva** do nível global, aplicada só ao XP
 * daquela categoria. Consequência: se todo o seu XP fosse de uma única
 * categoria, o atributo teria exatamente o seu nível global.
 */
export interface AttributeStats {
  key: QuestCategory;
  /** XP acumulado nas missões desta categoria. */
  xp: number;
  /** Quantidade de missões concluídas desta categoria. */
  completions: number;
  level: number;
  /** XP conquistado dentro do nível atual do atributo. */
  progressIntoLevel: number;
  /** XP necessário para subir um nível do atributo. */
  levelRange: number;
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
  /** Atributos por categoria (sempre as 7 chaves, mesmo zeradas). */
  attributes: Record<QuestCategory, AttributeStats>;
}

export interface QuestInput {
  title: string;
  description?: string;
  category: QuestCategory;
  difficulty: QuestDifficulty;
}

/** Dados do formulário de uma missão recorrente. */
export interface QuestTemplateInput {
  title: string;
  description?: string;
  category: QuestCategory;
  difficulty: QuestDifficulty;
  recurrence: Recurrence;
}
