import { DEFAULT_NOTIFICATION_SETTINGS, type AppState, type Completion, type Purchase, type Quest, type QuestCategory } from '../../types';
import {
  completionDays,
  currentStreakFrom,
  deriveStats,
  longestStreakFrom,
  totalXpFrom,
  xpOnDay,
} from '../stats';

function completion(
  id: string,
  questId: string,
  xp: number,
  at: string,
  category: QuestCategory = 'outros'
): Completion {
  return { id, questId, xp, at, category, gold: Math.round(xp / 5), bonusXp: 0 };
}

function at(year: number, month: number, day: number, hour = 12, minute = 0): string {
  return new Date(year, month - 1, day, hour, minute, 0, 0).toISOString();
}

function quest(id: string): Quest {
  return {
    id,
    title: `Missão ${id}`,
    category: 'outros',
    difficulty: 'media',
    xpReward: 25,
    date: '2026-06-01',
    completed: false,
  };
}

function stateWith(completions: Completion[]): AppState {
  return {
    schemaVersion: 2,
    playerName: 'Herói',
    playerAvatar: '⚔️',
    quests: [quest('q1')],
    completions,
    maxTotalXp: totalXpFrom(completions),
    templates: [],
    notifications: DEFAULT_NOTIFICATION_SETTINGS,
    rewards: [],
    purchases: [],
  };
}

describe('XP e contagem derivados do log', () => {
  it('soma o XP e a quantidade de conclusões', () => {
    const state = stateWith([
      completion('c1', 'q1', 100, at(2026, 6, 1)),
      completion('c2', 'q1', 10, at(2026, 6, 1)),
    ]);

    expect(totalXpFrom(state.completions)).toBe(110);
    const stats = deriveStats(state, '2026-06-01');
    expect(stats.totalXp).toBe(110);
    expect(stats.completedQuests).toBe(2);
  });

  it('conta o XP de cada dia separadamente', () => {
    const completions = [
      completion('c1', 'q1', 50, at(2026, 6, 1)),
      completion('c2', 'q1', 25, at(2026, 6, 2)),
    ];

    expect(xpOnDay(completions, '2026-06-01')).toBe(50);
    expect(xpOnDay(completions, '2026-06-02')).toBe(25);
    expect(xpOnDay(completions, '2026-06-03')).toBe(0);
  });
});

describe('streak (bug #2/#3/#5)', () => {
  it('conta dias consecutivos terminando hoje', () => {
    const completions = [
      completion('c1', 'q1', 10, at(2026, 6, 1)),
      completion('c2', 'q1', 10, at(2026, 6, 2)),
      completion('c3', 'q1', 10, at(2026, 6, 3)),
    ];

    expect(currentStreakFrom(completionDays(completions), '2026-06-03')).toBe(3);
  });

  it('mantém o streak vivo quando a última conclusão foi ontem', () => {
    const completions = [
      completion('c1', 'q1', 10, at(2026, 6, 1)),
      completion('c2', 'q1', 10, at(2026, 6, 2)),
    ];

    expect(currentStreakFrom(completionDays(completions), '2026-06-03')).toBe(2);
  });

  it('zera o streak quando nem ontem nem hoje tiveram conclusão (bug #3)', () => {
    const completions = [completion('c1', 'q1', 10, at(2026, 6, 1))];

    // Mesmo passando 3 dias, o streak precisa voltar a 0 sem depender de uma nova conclusão.
    expect(currentStreakFrom(completionDays(completions), '2026-06-04')).toBe(0);
    expect(deriveStats(stateWith(completions), '2026-06-04').currentStreak).toBe(0);
  });

  it('registra o recorde histórico de dias consecutivos', () => {
    const completions = [
      completion('c1', 'q1', 10, at(2026, 6, 1)),
      completion('c2', 'q1', 10, at(2026, 6, 2)),
      // buraco em 03
      completion('c3', 'q1', 10, at(2026, 6, 4)),
      completion('c4', 'q1', 10, at(2026, 6, 5)),
      completion('c5', 'q1', 10, at(2026, 6, 6)),
    ];

    expect(longestStreakFrom(completionDays(completions))).toBe(3);
  });
});

describe('escudo de sequência e bônus (item c)', () => {
  function shieldPurchase(day: string): Purchase {
    return {
      id: `shield-${day}`,
      kind: 'shield',
      rewardId: 'escudo-de-sequencia',
      title: 'Escudo de sequência',
      cost: 100,
      at: `${day}T23:00:00.000Z`,
    };
  }

  it('mantém a sequência viva em um dia coberto pelo escudo', () => {
    const state = {
      ...stateWith([
        completion('c1', 'q1', 10, at(2026, 6, 1)),
        completion('c2', 'q1', 10, at(2026, 6, 3)),
      ]),
      purchases: [shieldPurchase('2026-06-02')],
    };

    const stats = deriveStats(state, '2026-06-04');

    expect(stats.currentStreak).toBe(3);
    expect(stats.longestStreak).toBe(3);
    expect(stats.shieldsOwned).toBe(1);
    expect(stats.shieldsUsed).toBe(1);
    expect(stats.shieldsAvailable).toBe(0);
  });

  it('sem escudo, o mesmo buraco zera a sequência', () => {
    const state = stateWith([
      completion('c1', 'q1', 10, at(2026, 6, 1)),
      completion('c2', 'q1', 10, at(2026, 6, 3)),
    ]);

    const stats = deriveStats(state, '2026-06-04');

    expect(stats.currentStreak).toBe(1);
    expect(stats.longestStreak).toBe(1);
    expect(stats.shieldsUsed).toBe(0);
  });

  it('conta como reserva os escudos comprados e ainda não usados', () => {
    const state = {
      ...stateWith([
        completion('c1', 'q1', 10, at(2026, 6, 1)),
        completion('c2', 'q1', 10, at(2026, 6, 2)),
      ]),
      purchases: [shieldPurchase('2026-06-01'), shieldPurchase('2026-06-02')],
    };

    const stats = deriveStats(state, '2026-06-03');

    expect(stats.shieldsOwned).toBe(2);
    expect(stats.shieldsUsed).toBe(0);
    expect(stats.shieldsAvailable).toBe(2);
  });

  it('anuncia o bônus que a próxima conclusão vale', () => {
    const state = stateWith([
      completion('c1', 'q1', 10, at(2026, 6, 1)),
      completion('c2', 'q1', 10, at(2026, 6, 2)),
    ]);

    // Sem conclusão hoje (03), a próxima fecharia 3 dias seguidos → +10%.
    const semHoje = deriveStats(state, '2026-06-03');
    expect(semHoje.currentStreak).toBe(2);
    expect(semHoje.streakForBonus).toBe(3);
    expect(semHoje.streakBonusPct).toBe(10);

    // Com a conclusão de hoje, o degrau alcançado é o mesmo.
    const comHoje = deriveStats(
      { ...state, completions: [...state.completions, completion('c3', 'q1', 10, at(2026, 6, 3))] },
      '2026-06-03'
    );
    expect(comHoje.streakForBonus).toBe(3);
    expect(comHoje.streakBonusPct).toBe(10);
  });
});

describe('aritmética de datas em horário de verão (bug #5)', () => {
  it('trata dois dias consecutivos como consecutivos mesmo na virada do horário de verão', () => {
    // 04/11/2018: início do horário de verão em São Paulo (dia de 23h).
    // 03/11 23:30 e 04/11 01:30 são dias de calendário vizinhos.
    const completions = [
      completion('c1', 'q1', 10, at(2018, 11, 3, 23, 30)),
      completion('c2', 'q1', 10, at(2018, 11, 4, 1, 30)),
    ];

    expect(currentStreakFrom(completionDays(completions), '2018-11-04')).toBe(2);
    expect(longestStreakFrom(completionDays(completions))).toBe(2);
  });
});
