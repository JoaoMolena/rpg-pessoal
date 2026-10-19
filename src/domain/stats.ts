import type { AppState, Completion, GameStats, Purchase } from '../types';
import { addDaysToKey, dateKey, dateKeyFromIso } from '../utils/dates';
import { levelFromXp } from '../utils/level';
import { deriveAttributes } from './attributes';
import { goldBalance, goldEarned, goldSpent } from './economy';
import { shieldProtectedDays, shieldsOwned } from './shield';
import { streakBonusPct } from './streak';

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
 * Dias que contam para a sequência: os dias com conclusão **mais** os dias
 * cobertos pelo escudo de sequência (dias sem conclusão mas com escudo).
 */
export function streakDays(
  completions: Completion[],
  purchases: Purchase[],
  today: string = dateKey()
): Set<string> {
  const days = completionDays(completions);
  for (const day of shieldProtectedDays(days, purchases, today)) days.add(day);
  return days;
}

/**
 * Dias consecutivos, contados a partir de hoje (ou de ontem, se hoje ainda não
 * houve conclusão). Retorna 0 quando nem ontem nem hoje contam — é isso que faz
 * o streak "voltar a zero" ao ficar parado.
 *
 * Recebe o **conjunto de dias ativos** (conclusões + escudos) para que o cálculo
 * possa ser reavaliado quando o dia vira.
 */
export function currentStreakFrom(days: Set<string>, today: string = dateKey()): number {
  let cursor = days.has(today) ? today : addDaysToKey(today, -1);
  if (!days.has(cursor)) return 0;

  let streak = 0;
  while (days.has(cursor)) {
    streak += 1;
    cursor = addDaysToKey(cursor, -1);
  }
  return streak;
}

/** Maior sequência de dias consecutivos já registrada no conjunto de dias. */
export function longestStreakFrom(days: Set<string>): number {
  const sorted = [...days].sort();
  let best = 0;
  let run = 0;
  let previous: string | null = null;

  for (const day of sorted) {
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

/**
 * Sequência que o jogador passa a ter ao concluir mais uma missão hoje.
 *
 * É a base do bônus de XP: concluir algo hoje sempre vale a sequência de hoje
 * (mesmo que a missão seja de ontem e esteja atrasada).
 */
export function streakAfterCompletion(state: AppState, today: string = dateKey()): number {
  const completed = completionDays(state.completions);
  const active = new Set([...completed, ...shieldProtectedDays(completed, state.purchases, today)]);
  const current = currentStreakFrom(active, today);
  return completed.has(today) ? current : current + 1;
}

/** Conclui todas as estatísticas derivadas do estado. */
export function deriveStats(state: AppState, today: string = dateKey()): GameStats {
  const completedDays = completionDays(state.completions);
  const protectedDays = shieldProtectedDays(completedDays, state.purchases, today);
  const activeDays = new Set([...completedDays, ...protectedDays]);

  const totalXp = totalXpFrom(state.completions);
  const currentStreak = currentStreakFrom(activeDays, today);
  // Concluir hoje passaria a valer esta sequência — é o bônus anunciado na UI.
  const streakForBonus = completedDays.has(today) ? currentStreak : currentStreak + 1;
  const owned = shieldsOwned(state.purchases);

  return {
    totalXp,
    completedQuests: state.completions.length,
    currentStreak,
    longestStreak: longestStreakFrom(activeDays),
    xpToday: xpOnDay(state.completions, today),
    level: levelFromXp(totalXp),
    attributes: deriveAttributes(state.completions),
    gold: goldBalance(state.completions, state.purchases),
    goldEarned: goldEarned(state.completions),
    goldSpent: goldSpent(state.purchases),
    streakBonusPct: streakBonusPct(streakForBonus),
    shieldsOwned: owned,
    shieldsUsed: protectedDays.size,
    shieldsAvailable: Math.max(0, owned - protectedDays.size),
    streakForBonus,
  };
}
