import { SCHEMA_VERSION, DEFAULT_NOTIFICATION_SETTINGS, type AppState, type Quest, type QuestTemplate } from '../../types';
import { reducer } from '../reducer';
import {
  buildTemplate,
  describeRecurrence,
  matchesDate,
  planGeneration,
  questFromTemplate,
  weekdayFromKey,
} from '../recurrence';

/** Gera ids sequenciais para deixar as funções puras testáveis. */
function idFactory(prefix = 'q') {
  let counter = 0;
  return () => `${prefix}${++counter}`;
}

function makeTemplate(
  overrides: Partial<QuestTemplate> & Pick<QuestTemplate, 'id'>
): QuestTemplate {
  return {
    title: 'Treinar',
    category: 'saude',
    difficulty: 'media',
    recurrence: { kind: 'daily' },
    active: true,
    ...overrides,
  };
}

// Referências de calendário: 2026-06-01 é segunda, 06/06 sábado, 07/06 domingo.
const MONDAY = '2026-06-01';
const SATURDAY = '2026-06-06';
const SUNDAY = '2026-06-07';

describe('utilitários de recorrência', () => {
  it('identifica o dia da semana de uma data', () => {
    expect(weekdayFromKey(MONDAY)).toBe(1);
    expect(weekdayFromKey(SATURDAY)).toBe(6);
    expect(weekdayFromKey(SUNDAY)).toBe(0);
  });

  it('descreve a recorrência em português', () => {
    expect(describeRecurrence({ kind: 'daily' })).toBe('Todos os dias');
    expect(describeRecurrence({ kind: 'weekly', weekday: 1 })).toBe('Semanal · Seg');
    expect(describeRecurrence({ kind: 'weekdays', days: [5, 1, 3] })).toBe('Seg, Qua, Sex');
  });

  it('casa a recorrência com o dia da data', () => {
    expect(matchesDate({ kind: 'daily' }, SATURDAY)).toBe(true);
    expect(matchesDate({ kind: 'weekdays', days: [1, 3, 5] }, MONDAY)).toBe(true);
    expect(matchesDate({ kind: 'weekdays', days: [1, 3, 5] }, SATURDAY)).toBe(false);
    expect(matchesDate({ kind: 'weekly', weekday: 6 }, SATURDAY)).toBe(true);
    expect(matchesDate({ kind: 'weekly', weekday: 6 }, SUNDAY)).toBe(false);
  });

  it('monta o modelo com título limpo e ativo', () => {
    const template = buildTemplate(
      {
        title: '  Correr  ',
        description: '   ',
        category: 'saude',
        difficulty: 'facil',
        recurrence: { kind: 'daily' },
      },
      't9'
    );

    expect(template.id).toBe('t9');
    expect(template.title).toBe('Correr');
    expect(template.description).toBeUndefined();
    expect(template.active).toBe(true);
  });

  it('cria a missão do dia com o XP da dificuldade e o vínculo com o modelo', () => {
    const quest = questFromTemplate(makeTemplate({ id: 't1', difficulty: 'epica' }), 'q1', MONDAY);

    expect(quest).toMatchObject({
      id: 'q1',
      xpReward: 100,
      date: MONDAY,
      completed: false,
      templateId: 't1',
    });
  });
});

describe('planGeneration (geração idempotente, sem retroagir)', () => {
  it('gera a missão de hoje para um modelo ativo que casa com o dia', () => {
    const generated = planGeneration([makeTemplate({ id: 't1' })], [], MONDAY, idFactory());

    expect(generated).toHaveLength(1);
    expect(generated[0]).toMatchObject({ templateId: 't1', date: MONDAY });
  });

  it('não gera para modelo pausado', () => {
    const templates = [makeTemplate({ id: 't1', active: false })];
    expect(planGeneration(templates, [], MONDAY, idFactory())).toHaveLength(0);
  });

  it('não gera quando o dia não casa com a recorrência', () => {
    const templates = [makeTemplate({ id: 't1', recurrence: { kind: 'weekdays', days: [3] } })];
    expect(planGeneration(templates, [], MONDAY, idFactory())).toHaveLength(0);
  });

  it('é idempotente: aplicar o resultado e rodar de novo não gera nada', () => {
    const templates = [makeTemplate({ id: 't1' })];
    const first = planGeneration(templates, [], MONDAY, idFactory());
    const state: AppState = {
      schemaVersion: SCHEMA_VERSION,
      playerName: 'Herói',
      playerAvatar: '⚔️',
      quests: [],
      completions: [],
      maxTotalXp: 0,
      templates,
      notifications: DEFAULT_NOTIFICATION_SETTINGS,
      rewards: [],
      purchases: [],
      seenAchievements: [],
    };

    const applied = reducer(state, { type: 'GENERATE_QUESTS', quests: first, date: MONDAY });
    expect(applied.quests).toHaveLength(1);
    expect(planGeneration(applied.templates, applied.quests, MONDAY, idFactory())).toHaveLength(0);
  });

  it('não duplica quando já existe missão do modelo no dia', () => {
    const templates = [makeTemplate({ id: 't1' })]; // sem lastGeneratedDate
    const existing: Quest[] = [questFromTemplate(templates[0], 'q1', MONDAY)];

    expect(planGeneration(templates, existing, MONDAY, idFactory())).toHaveLength(0);
  });

  it('não retroage: gera só para a data pedida, mesmo com dias em atraso', () => {
    const templates = [makeTemplate({ id: 't1', lastGeneratedDate: MONDAY })];
    const generated = planGeneration(templates, [], '2026-06-10', idFactory());

    expect(generated).toHaveLength(1);
    expect(generated[0].date).toBe('2026-06-10');
  });
});
