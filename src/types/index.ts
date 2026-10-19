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
export const SCHEMA_VERSION = 7;

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
  /** XP total creditado na conclusão: XP da missão **+** bônus de sequência. */
  xp: number;
  /** Data/hora (ISO 8601) da conclusão. */
  at: string;
  /** Categoria da missão no momento da conclusão (define o atributo). */
  category: QuestCategory;
  /**
   * Ouro creditado no momento da conclusão (congelado, como o `xp`).
   * Fica gravado para que mudar a taxa de conversão no futuro não reprecifique
   * o histórico — a lição do bug #1.
   */
  gold: number;
  /**
   * Parte do `xp` vinda do bônus de sequência (congelada).
   *
   * É detalhamento, não soma: `xp` já inclui este valor. O bônus **não** vira
   * ouro — o ouro segue o ritmo da dificuldade (`round(xp - bonusXp) / 5`).
   */
  bonusXp: number;
}

/** Recompensa personalizada criada pelo jogador e vendida na loja. */
export interface Reward {
  id: string;
  title: string;
  description?: string;
  /** Preço em ouro (sempre positivo). */
  cost: number;
}

/** Dados do formulário de uma recompensa. */
export interface RewardInput {
  title: string;
  description?: string;
  cost: number;
}

/**
 * Tipo de resgate: uma recompensa pessoal ou um escudo de sequência.
 * Fica gravado para que o ouro gasto e a contagem de escudos sejam derivados
 * do histórico sem ambiguidade.
 */
export type PurchaseKind = 'reward' | 'shield';

/**
 * Registro imutável de um resgate.
 *
 * `title` e `cost` são **snapshots**: editar ou excluir a recompensa depois não
 * reescreve o histórico nem devolve o ouro gasto.
 */
export interface Purchase {
  id: string;
  /** `'reward'` = recompensa personalizada; `'shield'` = escudo de sequência. */
  kind: PurchaseKind;
  rewardId: string;
  /** Título da recompensa no momento do resgate. */
  title: string;
  /** Ouro pago no momento do resgate. */
  cost: number;
  /** Data/hora (ISO 8601) do resgate. */
  at: string;
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
  /** Recompensas personalizadas à venda na loja. */
  rewards: Reward[];
  /** Histórico de resgates (fonte de verdade do ouro gasto e dos escudos). */
  purchases: Purchase[];
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
  /** Ouro disponível para gastar (ganho − gasto, nunca negativo). */
  gold: number;
  /** Ouro total já conquistado em missões. */
  goldEarned: number;
  /** Ouro total já gasto em resgates. */
  goldSpent: number;
  /** Bônus de XP (%) concedido pela sequência atual (0 / 10 / 20 / 30 / 50). */
  streakBonusPct: number;
  /** Escudos de sequência comprados na loja. */
  shieldsOwned: number;
  /** Escudos já consumidos por dias sem conclusão. */
  shieldsUsed: number;
  /** Escudos em reserva (`owned − used`, nunca negativo). */
  shieldsAvailable: number;
  /**
   * Sequência que vale para o bônus agora: a que o jogador teria ao concluir
   * algo hoje. O bônus em % vem de `streakBonusPct` (`domain/streak`).
   */
  streakForBonus: number;
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
