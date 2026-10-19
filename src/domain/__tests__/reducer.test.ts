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
import { goldBalance, goldFromXp } from '../economy';
import { buildReward, buildShieldPurchase, reducer } from '../reducer';
import { SHIELD_COST, SHIELD_MAX } from '../shield';
import { deriveStats } from '../stats';

function makeQuest(overrides: Partial<Quest> & Pick<Quest, 'id'>): Quest {
  return {
    title: 'Missão',
    category: 'outros' as QuestCategory,
    difficulty: 'media' as QuestDifficulty,
    xpReward: 25,
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

/** Reproduz exatamente o que o provider faz ao marcar/desmarcar uma missão. */
function toggle(state: AppState, id: string, at: string): AppState {
  const quest = state.quests.find((item) => item.id === id);
  if (!quest) throw new Error(`missão ${id} não encontrada`);
  const completion: Completion = {
    id: `c-${at}-${id}`,
    questId: id,
    xp: quest.xpReward,
    at,
    category: quest.category,
    gold: goldFromXp(quest.xpReward),
    bonusXp: 0,
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
      subtasks: [],
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

describe('loja de recompensas (ouro)', () => {
  const reward = { id: 'r1', title: 'Café especial', cost: 25 };

  /** Conclusão com o ouro já coerente com o XP (como o provider monta). */
  function earned(xp: number): Completion {
    return {
      id: `c-${xp}`,
      questId: 'q1',
      xp,
      at: DAY,
      category: 'saude',
      gold: goldFromXp(xp),
      bonusXp: 0,
    };
  }

  it('buildReward apara os textos e garante preço inteiro e positivo', () => {
    expect(buildReward({ title: '  Café  ', cost: 0 }, 'r1')).toEqual({
      id: 'r1',
      title: 'Café',
      description: undefined,
      cost: 1,
    });

    const jogo = buildReward({ title: 'Jogo', description: '   ', cost: 24.6 }, 'r2');
    expect(jogo.cost).toBe(25);
    expect(jogo.description).toBeUndefined();
  });

  it('ADD_REWARD põe a recompensa na frente da lista', () => {
    const next = reducer(makeState([]), { type: 'ADD_REWARD', reward });

    expect(next.rewards).toEqual([reward]);
  });

  it('UPDATE_REWARD altera os dados e mantém o preço válido', () => {
    let state = reducer(makeState([]), { type: 'ADD_REWARD', reward });
    state = reducer(state, {
      type: 'UPDATE_REWARD',
      id: 'r1',
      input: { title: 'Jogo', description: 'Uma hora', cost: 0 },
    });

    expect(state.rewards[0]).toEqual({
      id: 'r1',
      title: 'Jogo',
      description: 'Uma hora',
      cost: 1,
    });
  });

  it('REDEEM_REWARD registra o resgate com o preço congelado', () => {
    // 100 XP => 20 de ouro.
    let state = makeState([], [earned(100)]);
    state = reducer(state, {
      type: 'REDEEM_REWARD',
      purchase: { id: 'p1', kind: 'reward', rewardId: 'r1', title: 'Café especial', cost: 20, at: DAY },
    });

    expect(state.purchases[0]).toEqual({
      id: 'p1',
      kind: 'reward',
      rewardId: 'r1',
      title: 'Café especial',
      cost: 20,
      at: DAY,
    });
    expect(goldBalance(state.completions, state.purchases)).toBe(0);
  });

  it('REDEEM_REWARD sem ouro suficiente não faz nada (o saldo nunca fica negativo)', () => {
    const state = makeState([], [earned(10)]); // 2 de ouro
    const next = reducer(state, {
      type: 'REDEEM_REWARD',
      purchase: { id: 'p1', kind: 'reward', rewardId: 'r1', title: 'Café especial', cost: 25, at: DAY },
    });

    expect(next).toBe(state); // nada mudou
    expect(next.purchases).toHaveLength(0);
  });

  it('DELETE_REWARD tira da loja sem apagar o histórico de resgates', () => {
    let state = makeState([], [earned(100)]);
    state = reducer(state, { type: 'ADD_REWARD', reward });
    state = reducer(state, {
      type: 'REDEEM_REWARD',
      purchase: { id: 'p1', kind: 'reward', rewardId: 'r1', title: 'Café especial', cost: 20, at: DAY },
    });

    const next = reducer(state, { type: 'DELETE_REWARD', id: 'r1' });
    expect(next.rewards).toHaveLength(0);
    expect(next.purchases).toHaveLength(1); // o ouro gasto continua registrado
  });
});

describe('escudo de sequência (item c)', () => {
  /** Conclusão com o ouro já coerente com o XP (como o provider monta). */
  function earned(xp: number): Completion {
    return {
      id: `c-${xp}`,
      questId: 'q1',
      xp,
      at: DAY,
      category: 'saude',
      gold: goldFromXp(xp),
      bonusXp: 0,
    };
  }

  const AT = '2026-06-02T12:00:00.000Z';

  it('buildShieldPurchase monta o resgate com o preço fixo', () => {
    expect(buildShieldPurchase('p1', AT)).toEqual({
      id: 'p1',
      kind: 'shield',
      rewardId: 'escudo-de-sequencia',
      title: 'Escudo de sequência',
      cost: SHIELD_COST,
      at: AT,
    });
  });

  it('registra a compra quando há ouro', () => {
    const state = makeState([], [earned(500)]); // 500 XP => 100 de ouro
    const next = reducer(state, {
      type: 'REDEEM_SHIELD',
      purchase: buildShieldPurchase('p1', AT),
      usedShields: 0,
    });

    expect(next.purchases).toHaveLength(1);
    expect(next.purchases[0].kind).toBe('shield');
    expect(goldBalance(next.completions, next.purchases)).toBe(0);
  });

  it('não compra sem ouro suficiente', () => {
    const state = makeState([], [earned(100)]); // 20 de ouro
    const next = reducer(state, {
      type: 'REDEEM_SHIELD',
      purchase: buildShieldPurchase('p1', AT),
      usedShields: 0,
    });

    expect(next).toBe(state);
    expect(next.purchases).toHaveLength(0);
  });

  it('não deixa a reserva passar do limite', () => {
    let state = makeState([], [earned(2000)]); // 400 de ouro
    for (let i = 0; i < SHIELD_MAX; i += 1) {
      state = reducer(state, {
        type: 'REDEEM_SHIELD',
        purchase: buildShieldPurchase(`p${i}`, AT),
        usedShields: 0,
      });
    }
    expect(state.purchases).toHaveLength(SHIELD_MAX);

    const next = reducer(state, {
      type: 'REDEEM_SHIELD',
      purchase: buildShieldPurchase('px', AT),
      usedShields: 0,
    });

    expect(next).toBe(state);
    expect(next.purchases).toHaveLength(SHIELD_MAX);
  });

  it('libera espaço quando um escudo já foi usado', () => {
    let state = makeState([], [earned(2000)]);
    for (let i = 0; i < SHIELD_MAX; i += 1) {
      state = reducer(state, {
        type: 'REDEEM_SHIELD',
        purchase: buildShieldPurchase(`p${i}`, AT),
        usedShields: 0,
      });
    }

    // 3 comprados − 1 usado = 2 na reserva → cabe outro.
    const next = reducer(state, {
      type: 'REDEEM_SHIELD',
      purchase: buildShieldPurchase('px', AT),
      usedShields: 1,
    });

    expect(next.purchases).toHaveLength(SHIELD_MAX + 1);
  });
});
