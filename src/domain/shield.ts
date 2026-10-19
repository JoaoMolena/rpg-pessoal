import type { Purchase } from '../types';
import { addDaysToKey, dateKey, dateKeyFromIso } from '../utils/dates';

/**
 * Escudo de sequência: a folga que protege a constância.
 *
 * Um escudo é comprado com **ouro** na loja (`SHIELD_COST`) e cobre **um dia
 * passado sem conclusão**, mantendo a sequência viva. No máximo
 * `SHIELD_MAX` ficam em reserva — o escudo dá folga, não imunidade.
 *
 * Nada disso é armazenado: os escudos comprados vêm do log de resgates
 * (`purchase.kind === 'shield'`) e os dias protegidos são reconstruídos do
 * histórico. O escudo é **prospectivo**: a compra vale do dia em que foi feita
 * em diante, então nunca dá para "consertar" um buraco antigo.
 */
export const SHIELD_COST = 100;

/** Escudos que podem ficar em reserva ao mesmo tempo. */
export const SHIELD_MAX = 3;

/** Total de escudos comprados. */
export function shieldsOwned(purchases: Purchase[]): number {
  return purchases.filter((purchase) => purchase.kind === 'shield').length;
}

/** Dias (YYYY-MM-DD) em que escudos foram comprados, em ordem crescente. */
function shieldPurchaseDays(purchases: Purchase[]): string[] {
  return purchases
    .filter((purchase) => purchase.kind === 'shield')
    .map((purchase) => dateKeyFromIso(purchase.at))
    .sort();
}

/**
 * Dias passados que o escudo manteve vivos.
 *
 * Anda dia a dia da primeira conclusão até **ontem** (o dia de hoje ainda não
 * acabou). Em cada dia sem conclusão com a sequência viva e um escudo já
 * comprado disponível, o dia é coberto; caso contrário a sequência zera.
 *
 * É pura e determinística: o mesmo histórico e o mesmo `today` devolvem sempre
 * o mesmo conjunto — não há estado a manter em sincronia.
 */
export function shieldProtectedDays(
  completionDayKeys: Set<string>,
  purchases: Purchase[],
  today: string = dateKey()
): Set<string> {
  const protectedDays = new Set<string>();
  if (completionDayKeys.size === 0) return protectedDays;

  const purchaseDays = shieldPurchaseDays(purchases);
  const first = [...completionDayKeys].sort()[0];
  const yesterday = addDaysToKey(today, -1);

  let nextPurchase = 0;
  let owned = 0;
  let used = 0;
  let streak = 0;

  for (let day = first; day <= yesterday; day = addDaysToKey(day, 1)) {
    while (nextPurchase < purchaseDays.length && purchaseDays[nextPurchase] <= day) {
      owned += 1;
      nextPurchase += 1;
    }

    if (completionDayKeys.has(day)) {
      streak += 1;
    } else if (streak > 0 && used < owned) {
      used += 1;
      streak += 1;
      protectedDays.add(day);
    } else {
      streak = 0;
    }
  }

  return protectedDays;
}
