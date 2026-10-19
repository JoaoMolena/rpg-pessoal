import { CATEGORY_KEYS } from '../theme/game';
import type { AttributeStats, Completion, QuestCategory } from '../types';
import { levelFromXp, totalXpForLevel } from '../utils/level';

/**
 * Atributos por categoria.
 *
 * Cada categoria funciona como um "atributo" do herói: o XP das conclusões é
 * somado por categoria e vira um nível próprio, com a **mesma curva** do nível
 * global (`50 * (L - 1)^2`). Ou seja, se todo o seu XP viesse de uma única
 * categoria, o atributo teria exatamente o seu nível global — atributo nunca
 * passa o nível global.
 *
 * Tudo é **derivado** do log de conclusões (`completion.category` já vem
 * congelada), então nada disso é persistido.
 */

function isKnownCategory(value: string): value is QuestCategory {
  return (CATEGORY_KEYS as string[]).includes(value);
}

interface CategoryTotals {
  xp: Record<QuestCategory, number>;
  completions: Record<QuestCategory, number>;
}

/** Soma XP e conclusões por categoria, jogando categorias desconhecidas em "outros". */
function totalsByCategory(completions: Completion[]): CategoryTotals {
  const xp = {} as Record<QuestCategory, number>;
  const counts = {} as Record<QuestCategory, number>;
  for (const key of CATEGORY_KEYS) {
    xp[key] = 0;
    counts[key] = 0;
  }

  for (const completion of completions) {
    // `category` é validada na migração; o fallback só protege dados externos.
    const key = isKnownCategory(completion.category) ? completion.category : 'outros';
    xp[key] += completion.xp;
    counts[key] += 1;
  }

  return { xp, completions: counts };
}

/** XP acumulado em cada atributo. A soma das chaves é igual ao XP total. */
export function attributeXp(completions: Completion[]): Record<QuestCategory, number> {
  return totalsByCategory(completions).xp;
}

/** Calcula o progresso de todos os atributos (sempre as 7 chaves). */
export function deriveAttributes(
  completions: Completion[]
): Record<QuestCategory, AttributeStats> {
  const totals = totalsByCategory(completions);
  const attributes = {} as Record<QuestCategory, AttributeStats>;

  for (const key of CATEGORY_KEYS) {
    const xp = totals.xp[key];
    const level = levelFromXp(xp);
    const levelStartXp = totalXpForLevel(level);

    attributes[key] = {
      key,
      xp,
      completions: totals.completions[key],
      level,
      progressIntoLevel: xp - levelStartXp,
      levelRange: totalXpForLevel(level + 1) - levelStartXp,
    };
  }

  return attributes;
}
