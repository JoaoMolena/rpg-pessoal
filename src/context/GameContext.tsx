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

import { buildQuest, buildReward, createInitialState, reducer } from '../domain/reducer';
import { buildTemplate, planGeneration } from '../domain/recurrence';
import { goldBalance, goldFromXp } from '../domain/economy';
import { deriveStats } from '../domain/stats';
import { useToday } from '../hooks/useToday';
import { clearState, loadState, saveState } from '../storage/storage';
import type {
  AppState,
  GameStats,
  NotificationSettings,
  Purchase,
  Quest,
  QuestInput,
  QuestTemplate,
  QuestTemplateInput,
  Reward,
  RewardInput,
} from '../types';
import { dateKey } from '../utils/dates';
import { createId } from '../utils/id';
import { didLevelUp, getLevelInfo, type LevelInfo } from '../utils/level';

/** Dados da última missão concluída, usados pelo feedback (`+XP` e "Desfazer"). */
export interface CompletionFeedback {
  questId: string;
  title: string;
  xp: number;
  gold: number;
}

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
  /** Última conclusão (feedback transitório — não é persistido). */
  completion: CompletionFeedback | null;
  /** Chave (YYYY-MM-DD) do dia atual, reativa à virada do dia. */
  today: string;
  /** Missões criadas hoje. */
  todayQuests: Quest[];
  /** Missões pendentes criadas em dias anteriores. */
  overdueQuests: Quest[];
  /** Quantidade de missões pendentes (hoje + atrasadas). */
  pendingCount: number;
  /** Modelos de missões recorrentes. */
  templates: QuestTemplate[];
  /** Preferências de notificações locais. */
  notifications: NotificationSettings;
  /** Recompensas personalizadas à venda na loja. */
  rewards: Reward[];
  /** Histórico de resgates (mais recentes primeiro). */
  purchases: Purchase[];
  addQuest: (input: QuestInput) => void;
  updateQuest: (id: string, input: QuestInput) => void;
  toggleQuest: (id: string) => void;
  deleteQuest: (id: string) => void;
  addTemplate: (input: QuestTemplateInput) => void;
  updateTemplate: (id: string, input: QuestTemplateInput) => void;
  setTemplateActive: (id: string, active: boolean) => void;
  deleteTemplate: (id: string) => void;
  setNotifications: (settings: NotificationSettings) => void;
  setPlayer: (name: string, avatar: string) => void;
  addReward: (input: RewardInput) => void;
  updateReward: (id: string, input: RewardInput) => void;
  deleteReward: (id: string) => void;
  /** Resgata uma recompensa; devolve `false` quando o ouro não é suficiente. */
  redeemReward: (reward: Reward) => boolean;
  resetProgress: () => void;
  /** Substitui todo o progresso por um estado importado (backup já validado). */
  importState: (next: AppState) => void;
  dismissLevelUp: () => void;
  /** Fecha o feedback de conclusão (sem desfazer nada). */
  dismissCompletion: () => void;
  /** Desmarca a missão recém-concluída, removendo o XP ganho. */
  undoCompletion: () => void;
}

const GameContext = createContext<GameContextValue | null>(null);

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, () => createInitialState());
  const [hydrated, setHydrated] = useState(false);
  const [levelUp, setLevelUp] = useState<LevelInfo | null>(null);
  const [completion, setCompletion] = useState<CompletionFeedback | null>(null);
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

  // Gera as missões de hoje a partir dos modelos recorrentes.
  // Só roda após a hidratação e sempre para "hoje" — nunca retroage.
  useEffect(() => {
    if (!hydrated) return;
    const newQuests = planGeneration(state.templates, state.quests, today, createId);
    if (newQuests.length > 0) {
      dispatch({ type: 'GENERATE_QUESTS', quests: newQuests, date: today });
    }
  }, [hydrated, today, state.templates, state.quests]);

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
      // Concluir mostra o feedback (`+XP` + "Desfazer"); desmarcar apenas limpa.
      setCompletion(
        quest.completed
          ? null
          : {
              questId: id,
              title: quest.title,
              xp: quest.xpReward,
              gold: goldFromXp(quest.xpReward),
            }
      );
      dispatch({
        type: 'TOGGLE_QUEST',
        id,
        completion: {
          id: createId(),
          questId: id,
          xp: quest.xpReward,
          at: new Date().toISOString(),
          category: quest.category,
          gold: goldFromXp(quest.xpReward),
        },
      });
    },
    [state.quests]
  );

  const dismissCompletion = useCallback(() => setCompletion(null), []);

  const undoCompletion = useCallback(() => {
    if (completion) toggleQuest(completion.questId);
  }, [completion, toggleQuest]);

  const deleteQuest = useCallback((id: string) => {
    dispatch({ type: 'DELETE_QUEST', id });
  }, []);

  const addTemplate = useCallback((input: QuestTemplateInput) => {
    dispatch({ type: 'ADD_TEMPLATE', template: buildTemplate(input, createId()) });
  }, []);

  const updateTemplate = useCallback((id: string, input: QuestTemplateInput) => {
    dispatch({ type: 'UPDATE_TEMPLATE', id, input });
  }, []);

  const setTemplateActive = useCallback((id: string, active: boolean) => {
    dispatch({ type: 'SET_TEMPLATE_ACTIVE', id, active });
  }, []);

  const deleteTemplate = useCallback((id: string) => {
    dispatch({ type: 'DELETE_TEMPLATE', id });
  }, []);

  const setNotifications = useCallback((settings: NotificationSettings) => {
    dispatch({ type: 'SET_NOTIFICATIONS', settings });
  }, []);

  const setPlayer = useCallback((name: string, avatar: string) => {
    dispatch({ type: 'SET_PLAYER', name, avatar });
  }, []);

  const addReward = useCallback((input: RewardInput) => {
    dispatch({ type: 'ADD_REWARD', reward: buildReward(input, createId()) });
  }, []);

  const updateReward = useCallback((id: string, input: RewardInput) => {
    dispatch({ type: 'UPDATE_REWARD', id, input });
  }, []);

  const deleteReward = useCallback((id: string) => {
    dispatch({ type: 'DELETE_REWARD', id });
  }, []);

  const redeemReward = useCallback(
    (reward: Reward): boolean => {
      // Checa o saldo aqui para poder avisar a UI; o reducer repete a checagem.
      if (reward.cost > goldBalance(state.completions, state.purchases)) return false;
      dispatch({
        type: 'REDEEM_REWARD',
        purchase: {
          id: createId(),
          rewardId: reward.id,
          title: reward.title,
          cost: reward.cost,
          at: new Date().toISOString(),
        },
      });
      return true;
    },
    [state.completions, state.purchases]
  );

  const resetProgress = useCallback(() => {
    clearState();
    setLevelUp(null);
    setCompletion(null);
    maxXpRef.current = 0;
    dispatch({ type: 'RESET', state: createInitialState() });
  }, []);

  const importState = useCallback((next: AppState) => {
    setLevelUp(null);
    setCompletion(null);
    // O marco de XP acompanha o backup para não celebrar um level up fantasma.
    maxXpRef.current = next.maxTotalXp;
    dispatch({ type: 'RESET', state: next });
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
      completion,
      today,
      todayQuests,
      overdueQuests,
      pendingCount,
      templates: state.templates,
      notifications: state.notifications,
      rewards: state.rewards,
      purchases: state.purchases,
      addQuest,
      updateQuest,
      toggleQuest,
      deleteQuest,
      addTemplate,
      updateTemplate,
      setTemplateActive,
      deleteTemplate,
      setNotifications,
      setPlayer,
      addReward,
      updateReward,
      deleteReward,
      redeemReward,
      resetProgress,
      importState,
      dismissLevelUp,
      dismissCompletion,
      undoCompletion,
    };
  }, [
    state,
    hydrated,
    levelUp,
    completion,
    today,
    addQuest,
    updateQuest,
    toggleQuest,
    deleteQuest,
    addTemplate,
    updateTemplate,
    setTemplateActive,
    deleteTemplate,
    setNotifications,
    setPlayer,
    addReward,
    updateReward,
    deleteReward,
    redeemReward,
    resetProgress,
    importState,
    dismissLevelUp,
    dismissCompletion,
    undoCompletion,
  ]);

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

/** Acesso ao estado global do jogo. Deve ser usado dentro de <GameProvider>. */
export function useGame(): GameContextValue {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame precisa ser usado dentro de <GameProvider>.');
  return ctx;
}
