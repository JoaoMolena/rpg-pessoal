import { DIFFICULTIES } from '../theme/game';
import type { Quest, QuestTemplate, QuestTemplateInput, Recurrence, Weekday } from '../types';

/** Rótulos curtos dos dias da semana, indexados por `Date.getDay()`. */
export const WEEKDAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'] as const;

/** Ordem de exibição (segunda → domingo), mais natural para o usuário. */
export const WEEKDAY_ORDER: Weekday[] = [1, 2, 3, 4, 5, 6, 0];

/** Dia da semana de uma chave YYYY-MM-DD (0 = domingo). */
export function weekdayFromKey(key: string): Weekday {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, month - 1, day).getDay() as Weekday;
}

/** Descrição legível da recorrência (ex.: "Todos os dias", "Seg, Qua, Sex"). */
export function describeRecurrence(recurrence: Recurrence): string {
  switch (recurrence.kind) {
    case 'daily':
      return 'Todos os dias';
    case 'weekly':
      return `Semanal · ${WEEKDAY_LABELS[recurrence.weekday]}`;
    case 'weekdays':
      if (recurrence.days.length === 0) return 'Nenhum dia selecionado';
      return [...recurrence.days]
        .sort((a, b) => WEEKDAY_ORDER.indexOf(a) - WEEKDAY_ORDER.indexOf(b))
        .map((day) => WEEKDAY_LABELS[day])
        .join(', ');
  }
}

/** A recorrência cai nesse dia? (função pura, usada no plano de geração) */
export function matchesDate(recurrence: Recurrence, key: string): boolean {
  const weekday = weekdayFromKey(key);
  switch (recurrence.kind) {
    case 'daily':
      return true;
    case 'weekly':
      return recurrence.weekday === weekday;
    case 'weekdays':
      return recurrence.days.includes(weekday);
  }
}

/** Monta um modelo de missão recorrente. `id` vem de fora (o reducer é puro). */
export function buildTemplate(input: QuestTemplateInput, id: string): QuestTemplate {
  return {
    id,
    title: input.title.trim(),
    description: input.description?.trim() || undefined,
    category: input.category,
    difficulty: input.difficulty,
    recurrence: input.recurrence,
    active: true,
  };
}

/** Cria a missão do dia a partir de um modelo (XP derivado da dificuldade atual). */
export function questFromTemplate(template: QuestTemplate, id: string, date: string): Quest {
  return {
    id,
    title: template.title,
    description: template.description,
    category: template.category,
    difficulty: template.difficulty,
    xpReward: DIFFICULTIES[template.difficulty].xp,
    date,
    completed: false,
    templateId: template.id,
  };
}

/**
 * Planeja as missões a gerar para `date`.
 *
 * `date` é sempre **hoje**: a geração nunca retroage, então abrir o app depois de
 * vários dias não cria missões dos dias perdidos.
 *
 * É idempotente: aplicar o resultado e rodar de novo não gera nada, pois a
 * checagem usa `lastGeneratedDate` e a existência de uma missão do modelo
 * naquele dia. `makeId` é injetado para manter a função pura/testável.
 */
export function planGeneration(
  templates: QuestTemplate[],
  quests: Quest[],
  date: string,
  makeId: () => string
): Quest[] {
  const alreadyGenerated = new Set(
    quests
      .filter((quest) => quest.templateId && quest.date === date)
      .map((quest) => quest.templateId)
  );

  return templates
    .filter((template) => template.active)
    .filter((template) => template.lastGeneratedDate !== date)
    .filter((template) => !alreadyGenerated.has(template.id))
    .filter((template) => matchesDate(template.recurrence, date))
    .map((template) => questFromTemplate(template, makeId(), date));
}
