import { DIFFICULTIES } from '../theme/game';
import {
  DEFAULT_NOTIFICATION_SETTINGS,
  SCHEMA_VERSION,
  type AppState,
  type Completion,
  type NotificationSettings,
  type Purchase,
  type Quest,
  type QuestInput,
  type QuestTemplate,
  type QuestTemplateInput,
  type Reward,
  type RewardInput,
  type Subtask,
} from '../types';
import { dateKey } from '../utils/dates';
import { createId } from '../utils/id';
import { goldBalance } from './economy';
import { SHIELD_COST, SHIELD_MAX } from './shield';
import { totalXpFrom } from './stats';
import { allSubtasksDone, reconcileSubtasks, type IdFactory } from './subtasks';

/**
 * Ações do jogo.
 *
 * O reducer é **puro**: `id` e datas nunca são gerados dentro dele — sempre
 * chegam pela action (`quest`, `completion`, `state`). Isso o torna determinístico
 * e trivial de testar.
 */
export type Action =
  | { type: 'HYDRATE'; state: AppState }
  | { type: 'ADD_QUEST'; quest: Quest }
  | { type: 'UPDATE_QUEST'; id: string; input: QuestInput; subtasks: Subtask[] }
  | { type: 'TOGGLE_QUEST'; id: string; completion: Completion }
  | {
      type: 'TOGGLE_SUBTASK';
      id: string;
      subtaskId: string;
      /**
       * Conclusão congelada de agora. Só é usada quando o passo fecha a missão;
       * no caminho de desmarcar ela é ignorada (como no `TOGGLE_QUEST`).
       */
      completion: Completion;
    }
  | { type: 'SET_ALL_SUBTASKS'; id: string; done: boolean; completion: Completion }
  | { type: 'DELETE_QUEST'; id: string }
  | { type: 'SET_PLAYER'; name: string; avatar: string }
  | { type: 'ADD_TEMPLATE'; template: QuestTemplate }
  | { type: 'UPDATE_TEMPLATE'; id: string; input: QuestTemplateInput }
  | { type: 'SET_TEMPLATE_ACTIVE'; id: string; active: boolean }
  | { type: 'DELETE_TEMPLATE'; id: string }
  | { type: 'GENERATE_QUESTS'; quests: Quest[]; date: string }
  | { type: 'SET_NOTIFICATIONS'; settings: NotificationSettings }
  | { type: 'ADD_REWARD'; reward: Reward }
  | { type: 'UPDATE_REWARD'; id: string; input: RewardInput }
  | { type: 'DELETE_REWARD'; id: string }
  | { type: 'REDEEM_REWARD'; purchase: Purchase }
  /**
   * Compra de escudo. `usedShields` entra pela action porque depende de "hoje"
   * (quantos dias já foram cobertos) — o reducer continua sem olhar o relógio.
   */
  | { type: 'REDEEM_SHIELD'; purchase: Purchase; usedShields: number }
  | { type: 'RESET'; state: AppState };

/**
 * Monta uma missão a partir do formulário. `id` e `date` vêm de fora.
 * As subtarefas nascem desmarcadas (a relação id ↔ título fica em `reconcileSubtasks`).
 */
export function buildQuest(
  input: QuestInput,
  id: string,
  date: string,
  makeId: IdFactory = createId
): Quest {
  return {
    id,
    title: input.title.trim(),
    description: input.description?.trim() || undefined,
    category: input.category,
    difficulty: input.difficulty,
    xpReward: DIFFICULTIES[input.difficulty].xp,
    date,
    completed: false,
    subtasks: reconcileSubtasks(input.subtasks ?? [], [], makeId),
  };
}

/** Atualiza o high-water mark de XP a partir do log. */
function withMaxTotalXp(state: AppState): AppState {
  const totalXp = totalXpFrom(state.completions);
  return totalXp > state.maxTotalXp ? { ...state, maxTotalXp: totalXp } : state;
}

/**
 * Aplica uma nova lista de subtarefas e sincroniza a conclusão da missão.
 *
 * Missão com passos conclui quando **todos** ficam prontos e volta a pendente
 * quando algum é desmarcado — sempre gravando/removendo **uma** conclusão no
 * log (com o XP congelado de agora, como no caminho sem subtarefas).
 */
function withSubtasks(
  state: AppState,
  quest: Quest,
  subtasks: Subtask[],
  completion: Completion
): AppState {
  const done = allSubtasksDone(subtasks);
  const quests = state.quests.map((item) => {
    if (item.id !== quest.id) return item;
    if (done === item.completed) return { ...item, subtasks };
    return {
      ...item,
      subtasks,
      completed: done,
      completedAt: done ? completion.at : undefined,
    };
  });

  if (done && !quest.completed) {
    return withMaxTotalXp({
      ...state,
      quests,
      completions: [...state.completions, completion],
    });
  }

  if (!done && quest.completed) {
    return {
      ...state,
      quests,
      completions: state.completions.filter((item) => item.questId !== quest.id),
    };
  }

  return { ...state, quests };
}

/** Preço em ouro sempre inteiro e positivo (o formulário pode enviar lixo). */
function rewardCost(cost: number): number {
  return Number.isFinite(cost) ? Math.max(1, Math.round(cost)) : 1;
}

/** Monta uma recompensa a partir do formulário. `id` vem de fora. */
export function buildReward(input: RewardInput, id: string): Reward {
  return {
    id,
    title: input.title.trim(),
    description: input.description?.trim() || undefined,
    cost: rewardCost(input.cost),
  };
}

/** Monta o resgate de um escudo de sequência. `id` e `at` vêm de fora. */
export function buildShieldPurchase(id: string, at: string): Purchase {
  return {
    id,
    kind: 'shield',
    rewardId: 'escudo-de-sequencia',
    title: 'Escudo de sequência',
    cost: SHIELD_COST,
    at,
  };
}

/**
 * Estado inicial com o kit de boas-vindas (9 missões, cobrindo as 7 categorias).
 * É uma *fábrica* e pode gerar ids/datas; o reducer em si permanece puro.
 *
 * Uma das missões já vem com subtarefas para apresentar as missões épicas.
 */
export function createInitialState(now: Date = new Date()): AppState {
  const today = dateKey(now);
  const seed: (Omit<QuestInput, 'subtasks'> & { subtasks?: string[] })[] = [
    { title: 'Beber 2L de água', description: 'Meta de hidratação diária', category: 'saude', difficulty: 'facil' },
    { title: 'Caminhar por 30 minutos', description: 'Passeio ao ar livre ou esteira', category: 'saude', difficulty: 'media' },
    {
      title: 'Estudar focado por 1 hora',
      description: 'Sem celular durante o bloco de estudo',
      category: 'estudo',
      difficulty: 'dificil',
      subtasks: ['Silenciar as notificações', 'Separar o material', 'Fazer 1 hora de foco'],
    },
    { title: 'Planejar as metas de amanhã', description: 'Defina até 3 prioridades para o próximo dia', category: 'trabalho', difficulty: 'facil' },
    { title: 'Finalizar 1 tarefa importante', description: 'Escolha a missão mais valiosa e conclua', category: 'trabalho', difficulty: 'media' },
    { title: 'Registrar os gastos do dia', description: 'Anote tudo que gastou até o fim do dia', category: 'financas', difficulty: 'facil' },
    { title: 'Reservar 30 minutos para um hobby', description: 'Música, desenho, leitura, games...', category: 'lazer', difficulty: 'facil' },
    { title: 'Mandar mensagem para alguém querido', description: 'Pai, mãe, amigo ou amiga', category: 'social', difficulty: 'facil' },
    { title: 'Organizar a mesa ou o espaço de trabalho', description: 'Ambiente limpo = mente limpa', category: 'outros', difficulty: 'media' },
  ];

  return {
    schemaVersion: SCHEMA_VERSION,
    playerName: 'Herói',
    playerAvatar: '⚔️',
    quests: seed.map((input) => buildQuest(input, createId(), today)),
    completions: [],
    maxTotalXp: 0,
    templates: [],
    notifications: DEFAULT_NOTIFICATION_SETTINGS,
    rewards: [],
    purchases: [],
  };
}

export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'HYDRATE':
      return action.state;

    case 'ADD_QUEST':
      return withMaxTotalXp({ ...state, quests: [action.quest, ...state.quests] });

    case 'UPDATE_QUEST': {
      const { input } = action;
      return {
        ...state,
        quests: state.quests.map((quest) =>
          quest.id === action.id
            ? {
                ...quest,
                title: input.title.trim(),
                description: input.description?.trim() || undefined,
                category: input.category,
                difficulty: input.difficulty,
                xpReward: DIFFICULTIES[input.difficulty].xp,
                subtasks: action.subtasks,
              }
            : quest
        ),
      };
    }

    case 'TOGGLE_SUBTASK': {
      const quest = state.quests.find((item) => item.id === action.id);
      if (!quest) return state;

      const subtasks = quest.subtasks.map((subtask) =>
        subtask.id === action.subtaskId ? { ...subtask, done: !subtask.done } : subtask
      );
      return withSubtasks(state, quest, subtasks, action.completion);
    }

    case 'SET_ALL_SUBTASKS': {
      const quest = state.quests.find((item) => item.id === action.id);
      if (!quest) return state;

      const subtasks = quest.subtasks.map((subtask) => ({ ...subtask, done: action.done }));
      return withSubtasks(state, quest, subtasks, action.completion);
    }

    case 'TOGGLE_QUEST': {
      const quest = state.quests.find((item) => item.id === action.id);
      if (!quest) return state;

      // Desmarcar: remove a conclusão do log (o XP já creditado por ela).
      if (quest.completed) {
        return {
          ...state,
          completions: state.completions.filter((completion) => completion.questId !== action.id),
          quests: state.quests.map((item) =>
            item.id === action.id ? { ...item, completed: false, completedAt: undefined } : item
          ),
        };
      }

      // Marcar: grava a conclusão com o XP congelado de agora.
      return withMaxTotalXp({
        ...state,
        completions: [...state.completions, action.completion],
        quests: state.quests.map((item) =>
          item.id === action.id
            ? { ...item, completed: true, completedAt: action.completion.at }
            : item
        ),
      });
    }

    case 'DELETE_QUEST':
      return {
        ...state,
        quests: state.quests.filter((quest) => quest.id !== action.id),
        completions: state.completions.filter((completion) => completion.questId !== action.id),
      };

    case 'ADD_TEMPLATE':
      return { ...state, templates: [action.template, ...state.templates] };

    case 'UPDATE_TEMPLATE': {
      const { input } = action;
      return {
        ...state,
        templates: state.templates.map((template) =>
          template.id === action.id
            ? {
                ...template,
                title: input.title.trim(),
                description: input.description?.trim() || undefined,
                category: input.category,
                difficulty: input.difficulty,
                recurrence: input.recurrence,
              }
            : template
        ),
      };
    }

    case 'SET_TEMPLATE_ACTIVE':
      return {
        ...state,
        templates: state.templates.map((template) =>
          template.id === action.id ? { ...template, active: action.active } : template
        ),
      };

    case 'DELETE_TEMPLATE':
      // As missões já geradas continuam no histórico (só o modelo é removido).
      return {
        ...state,
        templates: state.templates.filter((template) => template.id !== action.id),
      };

    case 'GENERATE_QUESTS': {
      if (action.quests.length === 0) return state;
      const generatedFrom = new Set(action.quests.map((quest) => quest.templateId));
      return {
        ...state,
        quests: [...action.quests, ...state.quests],
        templates: state.templates.map((template) =>
          generatedFrom.has(template.id)
            ? { ...template, lastGeneratedDate: action.date }
            : template
        ),
      };
    }

    case 'SET_PLAYER':
      return {
        ...state,
        playerName: action.name.trim() || state.playerName,
        playerAvatar: action.avatar,
      };

    case 'SET_NOTIFICATIONS':
      return { ...state, notifications: action.settings };

    case 'ADD_REWARD':
      return { ...state, rewards: [action.reward, ...state.rewards] };

    case 'UPDATE_REWARD': {
      const { input } = action;
      return {
        ...state,
        rewards: state.rewards.map((reward) =>
          reward.id === action.id
            ? {
                ...reward,
                title: input.title.trim(),
                description: input.description?.trim() || undefined,
                cost: rewardCost(input.cost),
              }
            : reward
        ),
      };
    }

    case 'DELETE_REWARD':
      // Os resgates já feitos continuam no histórico (o ouro gasto não volta).
      return { ...state, rewards: state.rewards.filter((reward) => reward.id !== action.id) };

    case 'REDEEM_REWARD': {
      // Segunda barreira além da UI: resgatar sem saldo não faz nada.
      if (action.purchase.cost > goldBalance(state.completions, state.purchases)) return state;
      return { ...state, purchases: [action.purchase, ...state.purchases] };
    }

    case 'REDEEM_SHIELD': {
      const owned = state.purchases.filter((purchase) => purchase.kind === 'shield').length;
      // Reserva cheia: mais escudos só gastariam ouro sem proteger nada.
      if (owned - action.usedShields >= SHIELD_MAX) return state;
      if (action.purchase.cost > goldBalance(state.completions, state.purchases)) return state;
      return { ...state, purchases: [action.purchase, ...state.purchases] };
    }

    case 'RESET':
      return action.state;

    default:
      return state;
  }
}
