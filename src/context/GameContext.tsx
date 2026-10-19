import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from 'react';

import { buildQuest, createInitialState, reducer } from '../domain/reducer';
import { deriveStats } from '../domain/stats';
import { useToday } from '../hooks/useToday';
import { clearState, loadState, saveState } from '../storage/storage';
import type { AppState, GameStats, Quest, QuestInput } from '../types';
import { dateKey } from '../utils/dates';
import { createId } from '../utils/id';
import { didLevelUp, getLevelInfo, type LevelInfo } from '../utils/level';

export interface GameContextValue {
  /** Estado persistido (missões + log de conclusões). */
  state: AppState;
  /** Estatísticas derivadas do estado (XP, sequência, nível...). */
  stats: GameStats;
  levelInfo: LevelInfo;
  /** Indica que os dados salvos já foram carregados do dispositivo. */
  hydrated: boolean;
  /** Informações do novo nível quando houver level up (aguardando confirmação). */
  levelUp: LevelInfo | null;
  /** Chave (YYYY-MM-DD) do dia atual, reativa à virada do dia. */
  today: string;
  /** Missões criadas hoje. */
  todayQuests: Quest[];
  /** Missões pendentes criadas em dias anteriores. */
  overdueQuests: Quest[];
  /** Quantidade de missões pendentes (hoje + atrasadas). */
  pendingCount: number;
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
  const [state, dispatch] = useReducer(reducer, undefined, () => createInitialState());
  const [hydrated, setHydrated] = useState(false);
  const [levelUp, setLevelUp] = useState<LevelInfo | null>(null);
  const today = useToday();
  // Pico de XP já visto na sessão: base para celebrar o level-up de forma justa.
  const maxXpRef = useRef<number | null>(null);

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

  // Celebra apenas ao atingir um novo pico de XP.
  // Comparar picos (e não o XP atual) impede que desmarcar/marcar a mesma missão
  // dispare a celebração repetidamente.
  useEffect(() => {
    if (!hydrated) return;
    if (maxXpRef.current === null) {
      maxXpRef.current = state.maxTotalXp;
      return;
    }
    if (didLevelUp(maxXpRef.current, state.maxTotalXp)) {
      setLevelUp(getLevelInfo(state.maxTotalXp));
    }
    maxXpRef.current = state.maxTotalXp;
  }, [state.maxTotalXp, hydrated]);

  const addQuest = useCallback((input: QuestInput) => {
    dispatch({ type: 'ADD_QUEST', quest: buildQuest(input, createId(), dateKey()) });
  }, []);

  const updateQuest = useCallback((id: string, input: QuestInput) => {
    dispatch({ type: 'UPDATE_QUEST', id, input });
  }, []);

  const toggleQuest = useCallback(
    (id: string) => {
      const quest = state.quests.find((item) => item.id === id);
      if (!quest) return;
      dispatch({
        type: 'TOGGLE_QUEST',
        id,
        completion: { id: createId(), questId: id, xp: quest.xpReward, at: new Date().toISOString() },
      });
    },
    [state.quests]
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
    maxXpRef.current = 0;
    dispatch({ type: 'RESET', state: createInitialState() });
  }, []);

  const dismissLevelUp = useCallback(() => setLevelUp(null), []);

  const value = useMemo<GameContextValue>(() => {
    const stats = deriveStats(state, today);
    const todayQuests = state.quests.filter((quest) => quest.date === today);
    const overdueQuests = state.quests.filter((quest) => quest.date !== today && !quest.completed);
    const pendingCount = [...todayQuests, ...overdueQuests].filter((quest) => !quest.completed).length;

    return {
      state,
      stats,
      levelInfo: getLevelInfo(stats.totalXp),
      hydrated,
      levelUp,
      today,
      todayQuests,
      overdueQuests,
      pendingCount,
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
    today,
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
