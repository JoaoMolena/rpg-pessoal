import {
  DEFAULT_NOTIFICATION_SETTINGS,
  SCHEMA_VERSION,
  type AppState,
  type Completion,
  type Quest,
  type Subtask,
} from '../../types';
import { goldFromXp } from '../economy';
import { buildQuest, reducer } from '../reducer';
import { deriveStats } from '../stats';
import { allSubtasksDone, reconcileSubtasks } from '../subtasks';

function makeQuest(overrides: Partial<Quest> & Pick<Quest, 'id'>): Quest {
  return {
    title: 'Missão épica',
    category: 'estudo',
    difficulty: 'epica',
    xpReward: 100,
    date: '2026-06-01',
    completed: false,
    subtasks: [],
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
    rewards: [],
    purchases: [],
  };
}

/** Reproduz o que o provider faz ao mexer num passo. */
function toggleSubtask(state: AppState, id: string, subtaskId: string, at: string): AppState {
  const quest = state.quests.find((item) => item.id === id)!;
  const completion: Completion = {
    id: `c-${at}-${id}`,
    questId: id,
    xp: quest.xpReward,
    at,
    category: quest.category,
    gold: goldFromXp(quest.xpReward),
    bonusXp: 0,
  };
  return reducer(state, { type: 'TOGGLE_SUBTASK', id, subtaskId, completion });
}

function setAll(state: AppState, id: string, done: boolean, at: string): AppState {
  const quest = state.quests.find((item) => item.id === id)!;
  const completion: Completion = {
    id: `c-${at}-${id}`,
    questId: id,
    xp: quest.xpReward,
    at,
    category: quest.category,
    gold: goldFromXp(quest.xpReward),
    bonusXp: 0,
  };
  return reducer(state, { type: 'SET_ALL_SUBTASKS', id, done, completion });
}

const DAY = '2026-06-01T12:00:00.000Z';

const threeSteps: Subtask[] = [
  { id: 's1', title: 'Passo 1', done: false },
  { id: 's2', title: 'Passo 2', done: false },
  { id: 's3', title: 'Passo 3', done: false },
];

describe('reconcileSubtasks', () => {
  it('preserva id e done de um passo quando só o texto continua igual', () => {
    const existing: Subtask[] = [
      { id: 'a', title: 'Ler', done: true },
      { id: 'b', title: 'Resumir', done: false },
    ];

    const result = reconcileSubtasks(['Ler', '  Resumir  ', 'Revisar'], existing, () => 'novo');

    expect(result).toEqual([
      { id: 'a', title: 'Ler', done: true },
      { id: 'b', title: 'Resumir', done: false },
      { id: 'novo', title: 'Revisar', done: false },
    ]);
  });

  it('remove passos que saíram da lista e ignora títulos vazios', () => {
    const existing: Subtask[] = [
      { id: 'a', title: 'Ler', done: true },
      { id: 'b', title: 'Resumir', done: true },
    ];

    const result = reconcileSubtasks(['Ler', '   '], existing, () => 'novo');

    expect(result).toEqual([{ id: 'a', title: 'Ler', done: true }]);
  });

  it('dá um id novo para cada título repetido', () => {
    let next = 0;
    const result = reconcileSubtasks(['Ler', 'Ler'], [], () => `id-${next++}`);

    expect(result.map((subtask) => subtask.id)).toEqual(['id-0', 'id-1']);
  });
});

describe('allSubtasksDone', () => {
  it('missão sem passos nunca está pronta (conclusão fica no checkbox)', () => {
    expect(allSubtasksDone([])).toBe(false);
  });

  it('só é verdadeira com todos os passos marcados', () => {
    expect(allSubtasksDone(threeSteps)).toBe(false);
    expect(
      allSubtasksDone(threeSteps.map((subtask) => ({ ...subtask, done: true })))
    ).toBe(true);
  });
});

describe('missão épica - a conclusão é do todo, não do passo', () => {
  it('não credita XP parcial ao marcar passos intermediários', () => {
    let state = makeState([makeQuest({ id: 'q1', subtasks: threeSteps })]);

    state = toggleSubtask(state, 'q1', 's1', DAY);
    state = toggleSubtask(state, 'q1', 's2', DAY);

    expect(state.completions).toHaveLength(0);
    expect(state.quests[0].completed).toBe(false);
    expect(deriveStats(state, '2026-06-01').totalXp).toBe(0);
    expect(state.quests[0].subtasks.map((subtask) => subtask.done)).toEqual([true, true, false]);
  });

  it('conclui a missão (e grava **uma** conclusão) no último passo', () => {
    let state = makeState([makeQuest({ id: 'q1', subtasks: threeSteps })]);

    state = toggleSubtask(state, 'q1', 's1', DAY);
    state = toggleSubtask(state, 'q1', 's2', DAY);
    state = toggleSubtask(state, 'q1', 's3', DAY);

    expect(state.completions).toHaveLength(1);
    expect(state.completions[0].xp).toBe(100);
    expect(state.quests[0].completed).toBe(true);
    expect(state.quests[0].completedAt).toBe(DAY);
    expect(deriveStats(state, '2026-06-01').totalXp).toBe(100);
    expect(deriveStats(state, '2026-06-01').currentStreak).toBe(1);
  });

  it('desmarcar um passo de uma missão concluída devolve o XP', () => {
    let state = makeState([makeQuest({ id: 'q1', subtasks: threeSteps })]);
    state = setAll(state, 'q1', true, DAY);
    expect(deriveStats(state, '2026-06-01').totalXp).toBe(100);

    state = toggleSubtask(state, 'q1', 's2', DAY);

    expect(state.completions).toHaveLength(0);
    expect(state.quests[0].completed).toBe(false);
    expect(state.quests[0].completedAt).toBeUndefined();
    expect(deriveStats(state, '2026-06-01').totalXp).toBe(0);
  });

  it('o checkbox principal marca e desmarca todos os passos', () => {
    let state = makeState([makeQuest({ id: 'q1', subtasks: threeSteps })]);

    state = setAll(state, 'q1', true, DAY);
    expect(state.quests[0].subtasks.every((subtask) => subtask.done)).toBe(true);
    expect(state.quests[0].completed).toBe(true);

    state = setAll(state, 'q1', false, DAY);
    expect(state.quests[0].subtasks.some((subtask) => subtask.done)).toBe(false);
    expect(state.quests[0].completed).toBe(false);
    expect(state.completions).toHaveLength(0);
  });

  it('o pico de XP não regride ao desmarcar um passo', () => {
    let state = makeState([makeQuest({ id: 'q1', subtasks: threeSteps })]);
    state = setAll(state, 'q1', true, DAY);
    const peak = state.maxTotalXp;

    state = toggleSubtask(state, 'q1', 's1', DAY);

    expect(state.maxTotalXp).toBe(peak);
    state = setAll(state, 'q1', true, DAY);
    expect(state.maxTotalXp).toBe(peak); // marcar de novo não cria novo pico
  });

  it('ignora passos de missão inexistente', () => {
    const state = makeState([makeQuest({ id: 'q1', subtasks: threeSteps })]);
    const completion: Completion = {
      id: 'c1',
      questId: 'fantasma',
      xp: 100,
      at: DAY,
      category: 'estudo',
      gold: 20,
      bonusXp: 0,
    };

    expect(
      reducer(state, { type: 'TOGGLE_SUBTASK', id: 'fantasma', subtaskId: 's1', completion })
    ).toBe(state);
  });
});

describe('buildQuest com subtarefas', () => {
  it('cria os passos desmarcados a partir dos títulos do formulário', () => {
    const quest = buildQuest(
      {
        title: 'Planejar a semana',
        category: 'trabalho',
        difficulty: 'epica',
        subtasks: ['Listar pendências', 'Priorizar', 'Bloquear a agenda'],
      },
      'q1',
      '2026-06-01',
      () => 'id-fixo'
    );

    expect(quest.subtasks).toEqual([
      { id: 'id-fixo', title: 'Listar pendências', done: false },
      { id: 'id-fixo', title: 'Priorizar', done: false },
      { id: 'id-fixo', title: 'Bloquear a agenda', done: false },
    ]);
  });

  it('missão sem subtarefas nasce com a lista vazia', () => {
    const quest = buildQuest(
      { title: 'Beber água', category: 'saude', difficulty: 'facil' },
      'q1',
      '2026-06-01'
    );

    expect(quest.subtasks).toEqual([]);
  });
});

describe('UPDATE_QUEST e subtarefas', () => {
  it('troca os passos sem tocar no log de conclusões', () => {
    let state = makeState([makeQuest({ id: 'q1', subtasks: threeSteps })]);
    state = setAll(state, 'q1', true, DAY);
    expect(state.completions).toHaveLength(1);

    state = reducer(state, {
      type: 'UPDATE_QUEST',
      id: 'q1',
      input: { title: 'Missão épica', category: 'estudo', difficulty: 'epica' },
      subtasks: [{ id: 's1', title: 'Passo 1', done: true }],
    });

    // Editar a checklist não reescreve o histórico: o XP conquistado fica.
    expect(state.completions).toHaveLength(1);
    expect(state.quests[0].subtasks).toEqual([{ id: 's1', title: 'Passo 1', done: true }]);
  });
});
