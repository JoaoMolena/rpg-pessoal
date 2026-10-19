import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useState,
} from 'react';

import { DIFFICULTIES } from '../theme/game';
import { clearState, loadState, saveState } from '../storage/storage';
import type { AppState, Quest, QuestInput } from '../types';
import { dateKey, isYesterday } from '../utils/dates';
import { createId } from '../utils/id';
import { getLevelInfo, levelFromXp, type LevelInfo } from '../utils/level';

type Action =
  | { type: 'HYDRATE'; state: AppState }
  | { type: 'ADD_QUEST'; input: QuestInput }
  | { type: 'UPDATE_QUEST'; id: string; input: QuestInput }
  | { type: 'TOGGLE_QUEST'; id: string }
  | { type: 'DELETE_QUEST'; id: string }
  | { type: 'SET_PLAYER'; name: string; avatar: string }
  | { type: 'RESET' };

function buildQuest(input: QuestInput): Quest {
  return {
    id: createId(),
    title: input.title.trim(),
    description: input.description?.trim() || undefined,
    category: input.category,
    difficulty: input.difficulty,
    xpReward: DIFFICULTIES[input.difficulty].xp,
    date: dateKey(),
    completed: false,
  };
}

function createInitialState(): AppState {
  const today = dateKey();
  // Kit completo de boas-vindas: cobre todas as categorias com XP equilibrado (175/dia).
  const seed: Array<Omit<Quest, 'id'>> = [
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
    playerName: 'Herói',
    playerAvatar: '⚔️',
    quests: seed.map((q) => ({ ...q, id: createId() })),
    stats: { totalXp: 0, completedQuests: 0, currentStreak: 0, longestStreak: 0 },
  };
}

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'HYDRATE':
      return action.state;

    case 'ADD_QUEST':
      return { ...state, quests: [buildQuest(action.input), ...state.quests] };

    case 'UPDATE_QUEST':
      return {
        ...state,
        quests: state.quests.map((q) =>
          q.id === action.id
            ? {
                ...q,
                title: action.input.title.trim(),
                description: action.input.description?.trim() || undefined,
                category: action.input.category,
                difficulty: action.input.difficulty,
                xpReward: DIFFICULTIES[action.input.difficulty].xp,
              }
            : q
        ),
      };

    case 'DELETE_QUEST': {
      const quest = state.quests.find((q) => q.id === action.id);
      // Excluir uma missão concluída desfaz também o XP/estatística associados.
      if (quest?.completed) {
        return {
          ...state,
          quests: state.quests.filter((q) => q.id !== action.id),
          stats: {
            ...state.stats,
            totalXp: Math.max(0, state.stats.totalXp - quest.xpReward),
            completedQuests: Math.max(0, state.stats.completedQuests - 1),
          },
        };
      }
      return { ...state, quests: state.quests.filter((q) => q.id !== action.id) };
    }

    case 'TOGGLE_QUEST': {
      const quest = state.quests.find((q) => q.id === action.id);
      if (!quest) return state;

      const completing = !quest.completed;
      const today = dateKey();
      const stats = { ...state.stats };

      if (completing) {
        stats.totalXp += quest.xpReward;
        stats.completedQuests += 1;
        if (stats.lastCompletionDate !== today) {
          stats.currentStreak = isYesterday(stats.lastCompletionDate, today)
            ? stats.currentStreak + 1
            : 1;
          stats.lastCompletionDate = today;
          stats.longestStreak = Math.max(stats.longestStreak, stats.currentStreak);
        }
      } else {
        stats.totalXp = Math.max(0, stats.totalXp - quest.xpReward);
        stats.completedQuests = Math.max(0, stats.completedQuests - 1);
      }

      return {
        ...state,
        stats,
        quests: state.quests.map((q) =>
          q.id === action.id
            ? {
                ...q,
                completed: completing,
                completedAt: completing ? new Date().toISOString() : undefined,
              }
            : q
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
      return createInitialState();

    default:
      return state;
  }
}

export interface GameContextValue {
  state: AppState;
  levelInfo: LevelInfo;
  /** Indica que os dados salvos já foram carregados do dispositivo. */
  hydrated: boolean;
  /** Informações do novo nível quando houver level up (aguardando confirmação). */
  levelUp: LevelInfo | null;
  /** Missões criadas hoje. */
  todayQuests: Quest[];
  /** Missões pendentes criadas em dias anteriores. */
  overdueQuests: Quest[];
  /** Quantidade de missões pendentes (hoje + atrasadas). */
  pendingCount: number;
  /** XP conquistado hoje. */
  xpToday: number;
  addQuest: (input: QuestInput) => void;
  updateQuest: (id: string, input: QuestInput) => void;
  toggleQuest: (id: string) => void;
  deleteQuest: (id: string) => void;
  setPlayer: (name: string, avatar: string) => void;
  resetProgress: () => void;
  dismissLevelUp: () => void;
}

const GameContext = createContext<GameContextValue | null>(null);

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, createInitialState);
  const [hydrated, setHydrated] = useState(false);
  const [levelUp, setLevelUp] = useState<LevelInfo | null>(null);

  // Carrega o progresso salvo ao iniciar.
  useEffect(() => {
    let active = true;
    loadState().then((saved) => {
      if (!active) return;
      if (saved) dispatch({ type: 'HYDRATE', state: saved });
      setHydrated(true);
    });
    return () => {
      active = false;
    };
  }, []);

  // Persiste o progresso sempre que ele mudar (após a carga inicial).
  useEffect(() => {
    if (hydrated) saveState(state);
  }, [state, hydrated]);

  const addQuest = useCallback((input: QuestInput) => {
    dispatch({ type: 'ADD_QUEST', input });
  }, []);

  const updateQuest = useCallback((id: string, input: QuestInput) => {
    dispatch({ type: 'UPDATE_QUEST', id, input });
  }, []);

  const toggleQuest = useCallback(
    (id: string) => {
      const quest = state.quests.find((q) => q.id === id);
      if (quest && !quest.completed) {
        const afterXp = state.stats.totalXp + quest.xpReward;
        if (levelFromXp(afterXp) > levelFromXp(state.stats.totalXp)) {
          setLevelUp(getLevelInfo(afterXp));
        }
      }
      dispatch({ type: 'TOGGLE_QUEST', id });
    },
    [state.quests, state.stats.totalXp]
  );

  const deleteQuest = useCallback((id: string) => {
    dispatch({ type: 'DELETE_QUEST', id });
  }, []);

  const setPlayer = useCallback((name: string, avatar: string) => {
    dispatch({ type: 'SET_PLAYER', name, avatar });
  }, []);

  const resetProgress = useCallback(() => {
    clearState();
    setLevelUp(null);
    dispatch({ type: 'RESET' });
  }, []);

  const dismissLevelUp = useCallback(() => setLevelUp(null), []);

  const value = useMemo<GameContextValue>(() => {
    const today = dateKey();
    const todayQuests = state.quests.filter((q) => q.date === today);
    const overdueQuests = state.quests.filter((q) => q.date !== today && !q.completed);
    const pendingCount = [...todayQuests, ...overdueQuests].filter((q) => !q.completed).length;
    const xpToday = state.quests
      .filter((q) => q.completed && q.completedAt && dateKey(new Date(q.completedAt)) === today)
      .reduce((sum, q) => sum + q.xpReward, 0);

    return {
      state,
      levelInfo: getLevelInfo(state.stats.totalXp),
      hydrated,
      levelUp,
      todayQuests,
      overdueQuests,
      pendingCount,
      xpToday,
      addQuest,
      updateQuest,
      toggleQuest,
      deleteQuest,
      setPlayer,
      resetProgress,
      dismissLevelUp,
    };
  }, [
    state,
    hydrated,
    levelUp,
    addQuest,
    updateQuest,
    toggleQuest,
    deleteQuest,
    setPlayer,
    resetProgress,
    dismissLevelUp,
  ]);

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

/** Acesso ao estado global do jogo. Deve ser usado dentro de <GameProvider>. */
export function useGame(): GameContextValue {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame precisa ser usado dentro de <GameProvider>.');
  return ctx;
}
