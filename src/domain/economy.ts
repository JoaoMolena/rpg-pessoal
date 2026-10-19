import type { Completion, Purchase } from '../types';

/**
 * Economia do jogo (ouro).
 *
 * A taxa é **1 de ouro a cada 5 XP** — que, na tabela de dificuldades atual,
 * dá exatamente: fácil 2 · média 5 · difícil 10 · épica 20.
 *
 * O ouro é creditado **na conclusão** (`completion.gold`) e fica congelado ali,
 * como o XP. Trocar a taxa no futuro não reprecifica o histórico: é a mesma
 * lição do bug #1 (mudar a dificuldade não pode mexer no que já foi ganho).
 *
 * O saldo é **derivado** do log (ganho) e do histórico de resgates (gasto) —
 * não existe um contador mutável que possa dessincronizar.
 */
export const GOLD_PER_XP = 5;

/** Ouro concedido por um XP creditado. */
export function goldFromXp(xp: number): number {
  return Math.max(0, Math.round(xp / GOLD_PER_XP));
}

/** Ouro total já conquistado. */
export function goldEarned(completions: Completion[]): number {
  return completions.reduce((sum, completion) => sum + completion.gold, 0);
}

/** Ouro total já gasto em resgates. */
export function goldSpent(purchases: Purchase[]): number {
  return purchases.reduce((sum, purchase) => sum + purchase.cost, 0);
}

/**
 * Saldo disponível. Nunca negativo: um estado externo inconsistente (ou um
 * backup editado à mão) aparece como saldo zerado em vez de dívida.
 */
export function goldBalance(completions: Completion[], purchases: Purchase[]): number {
  return Math.max(0, goldEarned(completions) - goldSpent(purchases));
}
