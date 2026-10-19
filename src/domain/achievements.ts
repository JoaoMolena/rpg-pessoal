import type { ComponentProps } from 'react';

import type MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import { CATEGORY_KEYS } from '../theme/game';
import type { AppState, Completion, Purchase, PurchaseKind, QuestCategory } from '../types';
import { addDaysToKey, dateKey, dateKeyFromIso, isoFromDateKey } from '../utils/dates';
import { totalXpForLevel } from '../utils/level';
import { streakDays } from './stats';

/**
 * Conquistas: regras **e datas**.
 *
 * Cada conquista sabe responder *quando* foi desbloqueada varrendo o log, em vez
 * de só dizer se está desbloqueada. A data é derivada (nunca armazenada) e é o
 * que a tela de Progresso mostra e o toast comemora.
 *
 * A base de XP identifica a dificuldade no log: o XP congelado da missão é
 * `xp - bonusXp` (10 fácil · 25 média · 50 difícil · 100 épica).
 */

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

/** Dados derivados que as conquistas usam para descobrir a data de desbloqueio. */
export interface AchievementProgress {
  /** Conclusões **em ordem cronológica** (`evaluateAchievements` garante). */
  completions: Completion[];
  /** Resgates da loja (os escudos mudam a sequência). */
  purchases: Purchase[];
  /** Chave (YYYY-MM-DD) do dia atual, para a simulação de escudo. */
  today: string;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: IconName;
  /** Instante (ISO 8601) do desbloqueio, ou `null` enquanto não aconteceu. */
  unlockedAt: (progress: AchievementProgress) => string | null;
}

/** Conquista avaliada: a regra e a data do desbloqueio. */
export interface AchievementStatus {
  achievement: Achievement;
  /** Atalho de leitura: `unlockedAt !== null`. */
  unlocked: boolean;
  unlockedAt: string | null;
}

/** Instante da n-ésima conclusão (1-based) em ordem cronológica. */
export function nthCompletionAt(completions: Completion[], n: number): string | null {
  return completions[n - 1]?.at ?? null;
}

/** Instante em que o XP acumulado alcançou o alvo. */
export function totalXpReachedAt(completions: Completion[], target: number): string | null {
  let sum = 0;
  for (const completion of completions) {
    sum += completion.xp;
    if (sum >= target) return completion.at;
  }
  return null;
}

/** Instante em que o nível foi alcançado (curva `50 * (L - 1)²`). */
export function levelReachedAt(completions: Completion[], level: number): string | null {
  return totalXpReachedAt(completions, totalXpForLevel(level));
}

/** Instante da n-ésima conclusão de uma categoria. */
export function nthCategoryCompletionAt(
  completions: Completion[],
  category: QuestCategory,
  n: number
): string | null {
  const fromCategory = completions.filter((completion) => completion.category === category);
  return nthCompletionAt(fromCategory, n);
}

/** Instante da n-ésima conclusão com o XP base informado (100 = épica). */
export function nthBaseXpCompletionAt(
  completions: Completion[],
  baseXp: number,
  n: number
): string | null {
  const fromBase = completions.filter(
    (completion) => completion.xp - completion.bonusXp === baseXp
  );
  return nthCompletionAt(fromBase, n);
}

/** Instante em que todas as categorias tiveram ao menos uma conclusão. */
export function allCategoriesAt(completions: Completion[]): string | null {
  const pending = new Set<QuestCategory>(CATEGORY_KEYS);
  for (const completion of completions) {
    pending.delete(completion.category);
    if (pending.size === 0) return completion.at;
  }
  return null;
}

/** Instante em que algum atributo de categoria alcançou o nível informado. */
export function attributeLevelReachedAt(
  completions: Completion[],
  level: number
): string | null {
  const target = totalXpForLevel(level);
  const xpByCategory = new Map<QuestCategory, number>();

  for (const completion of completions) {
    const sum = (xpByCategory.get(completion.category) ?? 0) + completion.xp;
    xpByCategory.set(completion.category, sum);
    if (sum >= target) return completion.at;
  }
  return null;
}

/**
 * Instante em que a sequência atingiu `length` dias pela primeira vez.
 *
 * Usa os dias que contam para a sequência (conclusões **e** dias cobertos por
 * escudo). A data do desbloqueio é a da primeira conclusão daquele dia; quando
 * o dia só conta pelo escudo, vale o meio-dia da chave.
 */
export function streakReachedAt(progress: AchievementProgress, length: number): string | null {
  const days = [...streakDays(progress.completions, progress.purchases, progress.today)].sort();

  let run = 0;
  let previous: string | null = null;
  let reachedDay: string | null = null;

  for (const day of days) {
    run = previous !== null && addDaysToKey(previous, 1) === day ? run + 1 : 1;
    previous = day;
    if (run >= length) {
      reachedDay = day;
      break;
    }
  }

  if (!reachedDay) return null;

  const completion = progress.completions.find(
    (item) => dateKeyFromIso(item.at) === reachedDay
  );
  return completion?.at ?? isoFromDateKey(reachedDay);
}

/** Instante do primeiro resgate de um tipo (`reward` ou `shield`). */
export function firstPurchaseAt(purchases: Purchase[], kind: PurchaseKind): string | null {
  const instants = purchases
    .filter((purchase) => purchase.kind === kind)
    .map((purchase) => purchase.at)
    .sort();
  return instants[0] ?? null;
}

/** XP base da missão épica (o log guarda o XP total e o detalhamento do bônus). */
const EPIC_BASE_XP = 100;

/** Conquistas desbloqueáveis exibidas na tela de Progresso. */
export const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'primeira-missao',
    title: 'Primeiro Passo',
    description: 'Conclua sua primeira missão',
    icon: 'shoe-print',
    unlockedAt: (progress) => nthCompletionAt(progress.completions, 1),
  },
  {
    id: 'mil-xp',
    title: 'Mil de XP',
    description: 'Acumule 1.000 XP na jornada',
    icon: 'lightning-bolt',
    unlockedAt: (progress) => totalXpReachedAt(progress.completions, 1000),
  },
  {
    id: 'dez-missoes',
    title: 'Em Ritmo de Combate',
    description: 'Conclua 10 missões no total',
    icon: 'sword-cross',
    unlockedAt: (progress) => nthCompletionAt(progress.completions, 10),
  },
  {
    id: 'cinquenta-missoes',
    title: 'Veterano de Guerra',
    description: 'Conclua 50 missões no total',
    icon: 'shield-sword',
    unlockedAt: (progress) => nthCompletionAt(progress.completions, 50),
  },
  {
    id: 'cem-missoes',
    title: 'Centurião',
    description: 'Conclua 100 missões no total',
    icon: 'medal',
    unlockedAt: (progress) => nthCompletionAt(progress.completions, 100),
  },
  {
    id: 'primeira-epica',
    title: 'Caçador de Épicos',
    description: 'Conclua uma missão épica',
    icon: 'fire-circle',
    unlockedAt: (progress) => nthBaseXpCompletionAt(progress.completions, EPIC_BASE_XP, 1),
  },
  {
    id: 'dez-epicas',
    title: 'Matador de Dragões',
    description: 'Conclua 10 missões épicas',
    icon: 'axe-battle',
    unlockedAt: (progress) => nthBaseXpCompletionAt(progress.completions, EPIC_BASE_XP, 10),
  },
  {
    id: 'sequencia-3',
    title: 'Constância',
    description: 'Mantenha 3 dias seguidos de progresso',
    icon: 'fire',
    unlockedAt: (progress) => streakReachedAt(progress, 3),
  },
  {
    id: 'sequencia-7',
    title: 'Semana Perfeita',
    description: 'Mantenha 7 dias seguidos de progresso',
    icon: 'trophy',
    unlockedAt: (progress) => streakReachedAt(progress, 7),
  },
  {
    id: 'sequencia-30',
    title: 'Mês de Ferro',
    description: 'Mantenha 30 dias seguidos de progresso',
    icon: 'calendar-star',
    unlockedAt: (progress) => streakReachedAt(progress, 30),
  },
  {
    id: 'nivel-5',
    title: 'Ascensão',
    description: 'Alcance o nível 5',
    icon: 'chevron-double-up',
    unlockedAt: (progress) => levelReachedAt(progress.completions, 5),
  },
  {
    id: 'nivel-10',
    title: 'Lenda Urbana',
    description: 'Alcance o nível 10',
    icon: 'crown',
    unlockedAt: (progress) => levelReachedAt(progress.completions, 10),
  },
  {
    id: 'nivel-20',
    title: 'Mestre',
    description: 'Alcance o nível 20',
    icon: 'star-four-points',
    unlockedAt: (progress) => levelReachedAt(progress.completions, 20),
  },
  {
    id: 'especialista',
    title: 'Especialista',
    description: 'Leve um atributo de categoria ao nível 5',
    icon: 'brain',
    unlockedAt: (progress) => attributeLevelReachedAt(progress.completions, 5),
  },
  {
    id: 'multidisciplinar',
    title: 'Multidisciplinar',
    description: 'Conclua missões nas 7 categorias',
    icon: 'view-grid-plus-outline',
    unlockedAt: (progress) => allCategoriesAt(progress.completions),
  },
  {
    id: 'guardiao',
    title: 'Guardião',
    description: 'Compre um escudo de sequência na loja',
    icon: 'shield-check',
    unlockedAt: (progress) => firstPurchaseAt(progress.purchases, 'shield'),
  },
  {
    id: 'recompensa-merecida',
    title: 'Recompensa Merecida',
    description: 'Resgate uma recompensa na loja',
    icon: 'gift-outline',
    unlockedAt: (progress) => firstPurchaseAt(progress.purchases, 'reward'),
  },
];

/**
 * Avalia todas as conquistas do estado, cronologicamente.
 *
 * `today` só importa para a sequência (os escudos dependem de "hoje"), mantendo a
 * função determinística para o mesmo par estado + dia.
 */
export function evaluateAchievements(
  state: AppState,
  today: string = dateKey()
): AchievementStatus[] {
  const progress: AchievementProgress = {
    completions: [...state.completions].sort((a, b) => a.at.localeCompare(b.at)),
    purchases: state.purchases,
    today,
  };

  return ACHIEVEMENTS.map((achievement) => {
    const unlockedAt = achievement.unlockedAt(progress);
    return { achievement, unlocked: unlockedAt !== null, unlockedAt };
  });
}

/** Ids das conquistas já desbloqueadas (usado na migração v8 → v9). */
export function unlockedAchievementIds(state: AppState, today: string = dateKey()): string[] {
  return evaluateAchievements(state, today)
    .filter((status) => status.unlocked)
    .map((status) => status.achievement.id);
}
