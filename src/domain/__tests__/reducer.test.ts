import {
  DEFAULT_NOTIFICATION_SETTINGS,
  SCHEMA_VERSION,
  type AppState,
  type Completion,
  type Quest,
  type QuestCategory,
  type QuestDifficulty,
  type QuestTemplate,
} from '../../types';
import { didLevelUp } from '../../utils/level';
import { reducer } from '../reducer';
import { deriveStats } from '../stats';

function makeQuest(overrides: Partial<Quest> & Pick<Quest, 'id'>): Quest {
  return {
    title: 'Missão',
    category: 'outros' as QuestCategory,
    difficulty: 'media' as QuestDifficulty,
    xpReward: 25,
    date: '2026-06-01',
    completed: false,
    ...overrides,
  };
}

function makeState(quests: Quest[], completions: Completion[] = []): AppState {
  return {
    schemaVersion: SCHEMA_VERSION,
    playerName: 'Herói',
    playerAvatar: '⚔️',
    quests,
    completions,
    maxTotalXp: 0,
    templates: [],
    notifications: DEFAULT_NOTIFICATION_SETTINGS,
  };
}

/** Reproduz exatamente o que o provider faz ao marcar/desmarcar uma missão. */
function toggle(state: AppState, id: string, at: string): AppState {
  const quest = state.quests.find((item) => item.id === id);
  if (!quest) throw new Error(`missão ${id} não encontrada`);
  const completion: Completion = {
    id: `c-${at}-${id}`,
    questId: id,
    xp: quest.xpReward,
    at,
  };
  return reducer(state, { type: 'TOGGLE_QUEST', id, completion });
}

const DAY = '2026-06-01T12:00:00.000Z';

describe('bug #1 - editar dificuldade de missão concluída não corrompe o XP', () => {
  it('não credita XP extra ao concluir Épica, virar Fácil e desmarcar', () => {
    let state = makeState([makeQuest({ id: 'q1', difficulty: 'epica', xpReward: 100 })]);

    state = toggle(state, 'q1', DAY);
    expect(deriveStats(state, '2026-06-01').totalXp).toBe(100);

    // Edita a missão concluída para Fácil: o template muda, mas o XP creditado não.
    state = reducer(state, {
      type: 'UPDATE_QUEST',
      id: 'q1',
      input: { title: 'Missão', category: 'outros', difficulty: 'facil' },
    });
    expect(state.quests[0].xpReward).toBe(10);
    expect(deriveStats(state, '2026-06-01').totalXp).toBe(100);

    // Desmarcar remove os 100 XP de verdade (antes o bug deixava +90 "de graça").
    state = toggle(state, 'q1', DAY);
    expect(deriveStats(state, '2026-06-01').totalXp).toBe(0);

    // Remarcar credita o novo valor (Fácil = 10).
    state = toggle(state, 'q1', DAY);
    expect(deriveStats(state, '2026-06-01').totalXp).toBe(10);
  });
});

describe('bugs #2 e #6 - desmarcar reverte streak e não refarmar a celebração', () => {
  it('desmarcar remove a conclusão do log (streak e XP voltam)', () => {
    let state = makeState([makeQuest({ id: 'q1', difficulty: 'epica', xpReward: 100 })]);

    state = toggle(state, 'q1', DAY);
    expect(deriveStats(state, '2026-06-01').currentStreak).toBe(1);
    expect(state.quests[0].completed).toBe(true);
    expect(state.quests[0].completedAt).toBe(DAY);
    expect(state.completions).toHaveLength(1);

    state = toggle(state, 'q1', DAY);
    expect(deriveStats(state, '2026-06-01').currentStreak).toBe(0);
    expect(deriveStats(state, '2026-06-01').totalXp).toBe(0);
    expect(state.quests[0].completed).toBe(false);
    expect(state.quests[0].completedAt).toBeUndefined();
    expect(state.completions).toHaveLength(0);
  });

  it('o pico de XP não regride e o level-up só é celebrado uma vez', () => {
    let state = makeState([makeQuest({ id: 'q1', difficulty: 'epica', xpReward: 100 })]);

    state = toggle(state, 'q1', DAY);
    const peak = state.maxTotalXp;
    expect(didLevelUp(0, peak)).toBe(true); // 100 XP => nível 2

    // Desmarcar derruba o XP atual, mas o pico permanece.
    state = toggle(state, 'q1', DAY);
    expect(deriveStats(state, '2026-06-01').totalXp).toBe(0);
    expect(state.maxTotalXp).toBe(peak);

    // Remarcar não cria um novo pico => não celebra de novo.
    state = toggle(state, 'q1', DAY);
    expect(state.maxTotalXp).toBe(peak);
    expect(didLevelUp(peak, state.maxTotalXp)).toBe(false);
  });
});

describe('reducer puro', () => {
  it('é determinístico: mesma action + mesmo estado => mesmo resultado', () => {
    const state = makeState([makeQuest({ id: 'q1' })]);
    const action = {
      type: 'ADD_QUEST' as const,
      quest: makeQuest({ id: 'q2', title: 'Nova' }),
    };

    expect(reducer(state, action)).toEqual(reducer(state, action));
  });

  it('não gera id nem data por conta própria ao adicionar (id vem da action)', () => {
    const state = makeState([]);
    const quest = makeQuest({ id: 'fixo', date: '2026-06-01' });
    const next = reducer(state, { type: 'ADD_QUEST', quest });

    expect(next.quests[0].id).toBe('fixo');
    expect(next.quests[0].date).toBe('2026-06-01');
  });

  it('excluir uma missão concluída remove também a sua conclusão', () => {
    let state = makeState([makeQuest({ id: 'q1', xpReward: 50 })]);
    state = toggle(state, 'q1', DAY);
    expect(deriveStats(state, '2026-06-01').totalXp).toBe(50);

    state = reducer(state, { type: 'DELETE_QUEST', id: 'q1' });
    expect(state.quests).toHaveLength(0);
    expect(state.completions).toHaveLength(0);
    expect(deriveStats(state, '2026-06-01').totalXp).toBe(0);
  });
});

describe('missões recorrentes no reducer', () => {
  const template: QuestTemplate = {
    id: 't1',
    title: 'Ler',
    category: 'estudo',
    difficulty: 'media',
    recurrence: { kind: 'daily' },
    active: true,
  };

  it('ADD_TEMPLATE adiciona o modelo sem mexer nas missões existentes', () => {
    const state = makeState([makeQuest({ id: 'q1' })]);
    const next = reducer(state, { type: 'ADD_TEMPLATE', template });

    expect(next.templates).toEqual([template]);
    expect(next.quests).toHaveLength(1);
  });

  it('GENERATE_QUESTS adiciona as missões e marca a última data gerada', () => {
    const state = reducer(makeState([]), { type: 'ADD_TEMPLATE', template });
    const quest = makeQuest({ id: 'g1', date: '2026-06-01', templateId: 't1' });
    const next = reducer(state, { type: 'GENERATE_QUESTS', quests: [quest], date: '2026-06-01' });

    expect(next.quests[0].id).toBe('g1');
    expect(next.templates[0].lastGeneratedDate).toBe('2026-06-01');
  });

  it('SET_TEMPLATE_ACTIVE pausa o modelo sem apagá-lo', () => {
    const state = reducer(makeState([]), { type: 'ADD_TEMPLATE', template });
    const next = reducer(state, { type: 'SET_TEMPLATE_ACTIVE', id: 't1', active: false });

    expect(next.templates).toHaveLength(1);
    expect(next.templates[0].active).toBe(false);
  });

  it('DELETE_TEMPLATE remove só o modelo: as missões geradas ficam no histórico', () => {
    let state = reducer(makeState([]), { type: 'ADD_TEMPLATE', template });
    const quest = makeQuest({ id: 'g1', date: '2026-06-01', templateId: 't1' });
    state = reducer(state, { type: 'GENERATE_QUESTS', quests: [quest], date: '2026-06-01' });

    const next = reducer(state, { type: 'DELETE_TEMPLATE', id: 't1' });
    expect(next.templates).toHaveLength(0);
    expect(next.quests).toHaveLength(1);
  });

  it('UPDATE_TEMPLATE não altera missões já geradas', () => {
    let state = reducer(makeState([]), { type: 'ADD_TEMPLATE', template });
    const quest = makeQuest({ id: 'g1', difficulty: 'media', xpReward: 25, templateId: 't1' });
    state = reducer(state, { type: 'GENERATE_QUESTS', quests: [quest], date: '2026-06-01' });

    const next = reducer(state, {
      type: 'UPDATE_TEMPLATE',
      id: 't1',
      input: {
        title: 'Ler mais',
        category: 'estudo',
        difficulty: 'epica',
        recurrence: { kind: 'daily' },
      },
    });

    expect(next.templates[0].title).toBe('Ler mais');
    expect(next.quests[0].xpReward).toBe(25); // histórico preservado
  });
});
