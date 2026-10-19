import {
  DEFAULT_NOTIFICATION_SETTINGS,
  SCHEMA_VERSION,
  type AppState,
  type Completion,
  type Purchase,
  type QuestCategory,
} from '../../types';
import { addDaysToKey } from '../../utils/dates';
import {
  ACHIEVEMENTS,
  allCategoriesAt,
  attributeLevelReachedAt,
  evaluateAchievements,
  firstPurchaseAt,
  levelReachedAt,
  nthBaseXpCompletionAt,
  nthCategoryCompletionAt,
  nthCompletionAt,
  streakReachedAt,
  totalXpReachedAt,
  type AchievementProgress,
} from '../achievements';

function completion(
  id: string,
  xp: number,
  at: string,
  category: QuestCategory = 'outros',
  bonusXp = 0
): Completion {
  return { id, questId: `q-${id}`, xp, at, category, gold: Math.round(xp / 5), bonusXp };
}

function purchase(id: string, kind: Purchase['kind'], at: string): Purchase {
  return { id, kind, rewardId: id, title: id, cost: 100, at };
}

function iso(year: number, month: number, day: number, hour = 12): string {
  return new Date(year, month - 1, day, hour, 0, 0, 0).toISOString();
}

/** Progresso com o log já em ordem cronológica (como `evaluateAchievements` entrega). */
function progress(
  completions: Completion[],
  purchases: Purchase[] = [],
  today = '2026-06-10'
): AchievementProgress {
  return {
    completions: [...completions].sort((a, b) => a.at.localeCompare(b.at)),
    purchases,
    today,
  };
}

function stateWith(completions: Completion[], purchases: Purchase[] = []): AppState {
  return {
    schemaVersion: SCHEMA_VERSION,
    playerName: 'Herói',
    playerAvatar: '⚔️',
    quests: [],
    completions,
    maxTotalXp: completions.reduce((sum, item) => sum + item.xp, 0),
    templates: [],
    notifications: DEFAULT_NOTIFICATION_SETTINGS,
    rewards: [],
    purchases,
    seenAchievements: [],
  };
}

describe('datas de desbloqueio derivadas do log', () => {
  it('nthCompletionAt devolve a n-ésima conclusão (ou null)', () => {
    const log = [completion('a', 10, iso(2026, 6, 1)), completion('b', 10, iso(2026, 6, 2))];

    expect(nthCompletionAt(log, 1)).toBe(iso(2026, 6, 1));
    expect(nthCompletionAt(log, 2)).toBe(iso(2026, 6, 2));
    expect(nthCompletionAt(log, 3)).toBeNull();
  });

  it('totalXpReachedAt devolve o instante em que o XP cruzou o alvo', () => {
    const log = [
      completion('a', 250, iso(2026, 6, 1)),
      completion('b', 400, iso(2026, 6, 2)),
      completion('c', 400, iso(2026, 6, 3)),
    ];

    expect(totalXpReachedAt(log, 250)).toBe(iso(2026, 6, 1));
    expect(totalXpReachedAt(log, 650)).toBe(iso(2026, 6, 2));
    expect(totalXpReachedAt(log, 2000)).toBeNull();
  });

  it('levelReachedAt usa a curva 50*(L-1)^2', () => {
    // Nível 5 exige 800 XP: as 8 conclusões de 100 chegam exatamente no dia 8.
    const log = Array.from({ length: 10 }, (_, index) =>
      completion(`c${index}`, 100, iso(2026, 6, index + 1))
    );

    expect(levelReachedAt(log, 5)).toBe(iso(2026, 6, 8));
    expect(levelReachedAt(log, 10)).toBeNull();
  });

  it('nthBaseXpCompletionAt ignora o bônus e casa pela dificuldade (100 = épica)', () => {
    const log = [
      completion('a', 100, iso(2026, 6, 1), 'estudo', 0), // épica pura
      completion('b', 100, iso(2026, 6, 2), 'estudo', 0), // épica pura
      completion('c', 110, iso(2026, 6, 3), 'estudo', 10), // épica + bônus
      completion('d', 25, iso(2026, 6, 4), 'estudo'), // média
    ];

    expect(nthBaseXpCompletionAt(log, 100, 1)).toBe(iso(2026, 6, 1));
    expect(nthBaseXpCompletionAt(log, 100, 3)).toBe(iso(2026, 6, 3));
    expect(nthBaseXpCompletionAt(log, 100, 4)).toBeNull();
  });

  it('nthCategoryCompletionAt conta só a categoria pedida', () => {
    const log = [
      completion('a', 10, iso(2026, 6, 1), 'saude'),
      completion('b', 10, iso(2026, 6, 2), 'estudo'),
      completion('c', 10, iso(2026, 6, 3), 'saude'),
    ];

    expect(nthCategoryCompletionAt(log, 'saude', 2)).toBe(iso(2026, 6, 3));
    expect(nthCategoryCompletionAt(log, 'estudo', 2)).toBeNull();
  });

  it('attributeLevelReachedAt devolve o primeiro atributo a cruzar o nível', () => {
    const log = [
      ...Array.from({ length: 8 }, (_, index) =>
        completion(`e${index}`, 100, iso(2026, 6, index + 1), 'estudo')
      ),
      ...Array.from({ length: 13 }, (_, index) =>
        completion(`s${index}`, 100, iso(2026, 6, index + 1, 18), 'saude')
      ),
    ].sort((a, b) => a.at.localeCompare(b.at));

    // 800 XP = nível 5 de atributo. Estudo chega primeiro (06-08 de manhã).
    expect(attributeLevelReachedAt(log, 5)).toBe(iso(2026, 6, 8));
    // 1250 XP = nível 6; a saúde cruza no 13º dia dela.
    expect(attributeLevelReachedAt(log, 6)).toBe(iso(2026, 6, 13, 18));
  });

  it('allCategoriesAt espera a última das 7 categorias', () => {
    const categories: QuestCategory[] = [
      'saude',
      'estudo',
      'trabalho',
      'financas',
      'lazer',
      'social',
      'outros',
    ];
    const log = categories.map((category, index) =>
      completion(`c${index}`, 10, iso(2026, 6, index + 1), category)
    );

    expect(allCategoriesAt(log)).toBe(iso(2026, 6, 7));
    expect(allCategoriesAt(log.slice(0, 6))).toBeNull();
  });

  it('streakReachedAt devolve a data do dia em que a sequência bateu a marca', () => {
    const log = [
      completion('a', 10, iso(2026, 6, 1)),
      completion('b', 10, iso(2026, 6, 2)),
      completion('c', 10, iso(2026, 6, 3)),
    ];

    expect(streakReachedAt(progress(log), 3)).toBe(iso(2026, 6, 3));
    expect(streakReachedAt(progress(log), 4)).toBeNull();
  });

  it('streakReachedAt zera a contagem quando falta um dia sem escudo', () => {
    const log = [
      completion('a', 10, iso(2026, 6, 1)),
      completion('b', 10, iso(2026, 6, 2)),
      // 06-03 em branco, sem escudo
      completion('c', 10, iso(2026, 6, 4)),
      completion('d', 10, iso(2026, 6, 5)),
      completion('e', 10, iso(2026, 6, 6)),
    ];

    expect(streakReachedAt(progress(log), 3)).toBe(iso(2026, 6, 6));
  });

  it('streakReachedAt conta o dia coberto pelo escudo comprado na hora', () => {
    const log = [
      completion('a', 10, iso(2026, 6, 1)),
      completion('b', 10, iso(2026, 6, 2)),
      // 06-03 em branco, mas com escudo comprado em 06-02
      completion('c', 10, iso(2026, 6, 4)),
    ];
    const shields = [purchase('s1', 'shield', iso(2026, 6, 2, 20))];

    // 06-01, 06-02, **06-03 (escudo)** e 06-04 formam 4 dias seguidos.
    expect(streakReachedAt(progress(log, shields), 4)).toBe(iso(2026, 6, 4));
    // A data do dia coberto é o meio-dia da chave (não houve conclusão).
    expect(streakReachedAt(progress(log, shields), 3)).toBe(
      new Date(2026, 5, 3, 12, 0, 0, 0).toISOString()
    );
    expect(streakReachedAt(progress(log), 3)).toBeNull();
  });

  it('firstPurchaseAt separa escudo de recompensa', () => {
    const purchases = [
      purchase('r1', 'reward', iso(2026, 6, 3)),
      purchase('s1', 'shield', iso(2026, 6, 1)),
      purchase('r2', 'reward', iso(2026, 6, 5)),
    ];

    expect(firstPurchaseAt(purchases, 'reward')).toBe(iso(2026, 6, 3));
    expect(firstPurchaseAt(purchases, 'shield')).toBe(iso(2026, 6, 1));
    expect(firstPurchaseAt([], 'shield')).toBeNull();
  });
});

describe('evaluateAchievements', () => {
  it('marca a conquista com a data em que foi desbloqueada', () => {
    const log = [completion('a', 100, iso(2026, 6, 1), 'estudo')];
    const evaluated = evaluateAchievements(stateWith(log), '2026-06-10');

    const first = evaluated.find((item) => item.achievement.id === 'primeira-missao')!;
    const epic = evaluated.find((item) => item.achievement.id === 'primeira-epica')!;
    const ten = evaluated.find((item) => item.achievement.id === 'dez-missoes')!;

    expect(first.unlocked).toBe(true);
    expect(first.unlockedAt).toBe(iso(2026, 6, 1));
    expect(epic.unlocked).toBe(true);
    expect(epic.unlockedAt).toBe(iso(2026, 6, 1));
    expect(ten.unlocked).toBe(false);
    expect(ten.unlockedAt).toBeNull();
  });

  it('avalia o catálogo inteiro (sem conquista repetida ou sem regra)', () => {
    const evaluated = evaluateAchievements(stateWith([]));
    const ids = evaluated.map((item) => item.achievement.id);

    expect(evaluated).toHaveLength(ACHIEVEMENTS.length);
    expect(new Set(ids).size).toBe(ids.length);
    expect(evaluated.every((item) => item.unlockedAt === null)).toBe(true);
  });

  it('não desbloqueia conquista de escudo sem escudo comprado', () => {
    const rewards = [purchase('r1', 'reward', iso(2026, 6, 3))];
    const evaluated = evaluateAchievements(stateWith([], rewards), '2026-06-10');

    const guardian = evaluated.find((item) => item.achievement.id === 'guardiao')!;
    const deserved = evaluated.find((item) => item.achievement.id === 'recompensa-merecida')!;

    expect(guardian.unlocked).toBe(false);
    expect(deserved.unlocked).toBe(true);
    expect(deserved.unlockedAt).toBe(iso(2026, 6, 3));
  });

  it('as datas de sequência respeitam o `today` passado', () => {
    const log = Array.from({ length: 3 }, (_, index) =>
      completion(`c${index}`, 10, iso(2026, 6, 1 + index))
    );

    // Com "hoje" = 06-03, o caminho do escudo vai só até 06-02, mas os três dias
    // de conclusão já bastam para a marca de 3.
    expect(streakReachedAt(progress(log, [], '2026-06-03'), 3)).toBe(iso(2026, 6, 3));
    expect(streakReachedAt(progress([log[0]], [], '2026-06-01'), 3)).toBeNull();
    expect(addDaysToKey('2026-06-01', 1)).toBe('2026-06-02');
  });
});
