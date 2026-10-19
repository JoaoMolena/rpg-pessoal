import type { AppState, Completion, GameStats } from '../types';
import { addDaysToKey, dateKey, dateKeyFromIso } from '../utils/dates';
import { levelFromXp } from '../utils/level';
import { deriveAttributes } from './attributes';
import { goldBalance, goldEarned, goldSpent } from './economy';

/** Soma do XP de todas as conclusões. */
export function totalXpFrom(completions: Completion[]): number {
  return completions.reduce((sum, completion) => sum + completion.xp, 0);
}

/** Conjunto dos dias (YYYY-MM-DD) que tiveram ao menos uma conclusão. */
export function completionDays(completions: Completion[]): Set<string> {
  const days = new Set<string>();
  for (const completion of completions) {
    days.add(dateKeyFromIso(completion.at));
  }
  return days;
}

/**
 * Dias consecutivos com conclusão, contados a partir de hoje (ou de ontem, se
 * hoje ainda não houve conclusão). Retorna 0 quando nem ontem nem hoje tiveram
 * conclusão — é isso que faz o streak "voltar a zero" ao ficar parado.
 *
 * O `today` é injetado para que o cálculo possa ser reavaliado quando o dia vira.
 */
export function currentStreakFrom(completions: Completion[], today: string = dateKey()): number {
  const days = completionDays(completions);
  let cursor = days.has(today) ? today : addDaysToKey(today, -1);
  if (!days.has(cursor)) return 0;

  let streak = 0;
  while (days.has(cursor)) {
    streak += 1;
    cursor = addDaysToKey(cursor, -1);
  }
  return streak;
}

/** Maior sequência de dias consecutivos já registrada no log. */
export function longestStreakFrom(completions: Completion[]): number {
  const days = [...completionDays(completions)].sort();
  let best = 0;
  let run = 0;
  let previous: string | null = null;

  for (const day of days) {
    run = previous !== null && addDaysToKey(previous, 1) === day ? run + 1 : 1;
    if (run > best) best = run;
    previous = day;
  }
  return best;
}

/** XP conquistado em um dia específico. */
export function xpOnDay(completions: Completion[], day: string): number {
  return completions
    .filter((completion) => dateKeyFromIso(completion.at) === day)
    .reduce((sum, completion) => sum + completion.xp, 0);
}

/** Conclui todas as estatísticas derivadas do estado. */
export function deriveStats(state: AppState, today: string = dateKey()): GameStats {
  const totalXp = totalXpFrom(state.completions);
  return {
    totalXp,
    completedQuests: state.completions.length,
    currentStreak: currentStreakFrom(state.completions, today),
    longestStreak: longestStreakFrom(state.completions),
    xpToday: xpOnDay(state.completions, today),
    level: levelFromXp(totalXp),
    attributes: deriveAttributes(state.completions),
    gold: goldBalance(state.completions, state.purchases),
    goldEarned: goldEarned(state.completions),
    goldSpent: goldSpent(state.purchases),
  };
}
