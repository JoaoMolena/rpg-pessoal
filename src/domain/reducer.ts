import { DIFFICULTIES } from '../theme/game';
import {
  SCHEMA_VERSION,
  type AppState,
  type Completion,
  type Quest,
  type QuestInput,
  type QuestTemplate,
  type QuestTemplateInput,
} from '../types';
import { dateKey } from '../utils/dates';
import { createId } from '../utils/id';
import { totalXpFrom } from './stats';

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
  | { type: 'UPDATE_QUEST'; id: string; input: QuestInput }
  | { type: 'TOGGLE_QUEST'; id: string; completion: Completion }
  | { type: 'DELETE_QUEST'; id: string }
  | { type: 'SET_PLAYER'; name: string; avatar: string }
  | { type: 'ADD_TEMPLATE'; template: QuestTemplate }
  | { type: 'UPDATE_TEMPLATE'; id: string; input: QuestTemplateInput }
  | { type: 'SET_TEMPLATE_ACTIVE'; id: string; active: boolean }
  | { type: 'DELETE_TEMPLATE'; id: string }
  | { type: 'GENERATE_QUESTS'; quests: Quest[]; date: string }
  | { type: 'RESET'; state: AppState };

/** Monta uma missão a partir do formulário. `id` e `date` vêm de fora. */
export function buildQuest(input: QuestInput, id: string, date: string): Quest {
  return {
    id,
    title: input.title.trim(),
    description: input.description?.trim() || undefined,
    category: input.category,
    difficulty: input.difficulty,
    xpReward: DIFFICULTIES[input.difficulty].xp,
    date,
    completed: false,
  };
}

/** Atualiza o high-water mark de XP a partir do log. */
function withMaxTotalXp(state: AppState): AppState {
  const totalXp = totalXpFrom(state.completions);
  return totalXp > state.maxTotalXp ? { ...state, maxTotalXp: totalXp } : state;
}

/**
 * Estado inicial com o kit de boas-vindas (9 missões, cobrindo as 7 categorias).
 * É uma *fábrica* e pode gerar ids/datas; o reducer em si permanece puro.
 */
export function createInitialState(now: Date = new Date()): AppState {
  const today = dateKey(now);
  const seed: Omit<Quest, 'id'>[] = [
    { title: 'Beber 2L de água', description: 'Meta de hidratação diária', category: 'saude', difficulty: 'facil', xpReward: 10, date: today, completed: false },
    { title: 'Caminhar por 30 minutos', description: 'Passeio ao ar livre ou esteira', category: 'saude', difficulty: 'media', xpReward: 25, date: today, completed: false },
    { title: 'Estudar focado por 1 hora', description: 'Sem celular durante o bloco de estudo', category: 'estudo', difficulty: 'dificil', xpReward: 50, date: today, completed: false },
    { title: 'Planejar as metas de amanhã', description: 'Defina até 3 prioridades para o próximo dia', category: 'trabalho', difficulty: 'facil', xpReward: 10, date: today, completed: false },
    { title: 'Finalizar 1 tarefa importante', description: 'Escolha a missão mais valiosa e conclua', category: 'trabalho', difficulty: 'media', xpReward: 25, date: today, completed: false },
    { title: 'Registrar os gastos do dia', description: 'Anote tudo que gastou até o fim do dia', category: 'financas', difficulty: 'facil', xpReward: 10, date: today, completed: false },
    { title: 'Reservar 30 minutos para um hobby', description: 'Música, desenho, leitura, games...', category: 'lazer', difficulty: 'facil', xpReward: 10, date: today, completed: false },
    { title: 'Mandar mensagem para alguém querido', description: 'Pai, mãe, amigo ou amiga', category: 'social', difficulty: 'facil', xpReward: 10, date: today, completed: false },
    { title: 'Organizar a mesa ou o espaço de trabalho', description: 'Ambiente limpo = mente limpa', category: 'outros', difficulty: 'media', xpReward: 25, date: today, completed: false },
  ];

  return {
    schemaVersion: SCHEMA_VERSION,
    playerName: 'Herói',
    playerAvatar: '⚔️',
    quests: seed.map((quest) => ({ ...quest, id: createId() })),
    completions: [],
    maxTotalXp: 0,
    templates: [],
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
              }
            : quest
        ),
      };
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

    case 'RESET':
      return action.state;

    default:
      return state;
  }
}
