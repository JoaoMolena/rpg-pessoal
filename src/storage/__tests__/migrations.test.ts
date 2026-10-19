import { deriveStats, totalXpFrom } from '../../domain/stats';
import { DEFAULT_NOTIFICATION_SETTINGS, SCHEMA_VERSION } from '../../types';
import { migrateState } from '../migrations';

const V1_STATE = {
  playerName: 'Ana',
  playerAvatar: '🛡️',
  quests: [
    {
      id: 'a',
      title: 'Beber água',
      category: 'saude',
      difficulty: 'facil',
      xpReward: 10,
      date: '2026-06-01',
      completed: true,
      completedAt: '2026-06-01T10:00:00.000Z',
    },
    {
      id: 'b',
      title: 'Estudar',
      category: 'estudo',
      difficulty: 'epica',
      xpReward: 100,
      date: '2026-06-02',
      completed: true, // sem completedAt
    },
    {
      id: 'c',
      title: 'Pendente',
      category: 'outros',
      difficulty: 'media',
      xpReward: 25,
      date: '2026-06-02',
      completed: false,
    },
  ],
  stats: { totalXp: 110, completedQuests: 2, currentStreak: 1, longestStreak: 2 },
};

describe('bug #10 - migração e validação do estado salvo', () => {
  it('migra um estado v1 para v2 sem perder XP', () => {
    const migrated = migrateState(V1_STATE);

    expect(migrated).not.toBeNull();
    expect(migrated!.schemaVersion).toBe(SCHEMA_VERSION);
    expect(migrated!.completions).toHaveLength(2);
    expect(totalXpFrom(migrated!.completions)).toBe(110);
    expect(deriveStats(migrated!, '2026-06-02').totalXp).toBe(110);
    expect(migrated!.maxTotalXp).toBe(110);
    expect(migrated!.quests).toHaveLength(3);
    expect(migrated!.templates).toEqual([]); // recorrências só existem a partir da v3
  });

  it('reconstrói a data da conclusão quando o v1 não tinha completedAt', () => {
    const migrated = migrateState(V1_STATE)!;
    const semData = migrated.completions.find((completion) => completion.questId === 'b')!;

    expect(new Date(semData.at).getFullYear()).toBe(2026);
    expect(deriveStats(migrated, '2026-06-02').completedQuests).toBe(2);
  });

  it('não quebra quando o v1 não tem stats (antes o app quebrava)', () => {
    const migrated = migrateState({ quests: [] });

    expect(migrated).not.toBeNull();
    expect(migrated!.schemaVersion).toBe(SCHEMA_VERSION);
    expect(deriveStats(migrated!).totalXp).toBe(0);
  });

  it('migra um estado v2 (sem templates nem notificações) para a versão atual sem perder XP', () => {
    const v2 = {
      schemaVersion: 2,
      playerName: 'Bruno',
      playerAvatar: '🐉',
      quests: [
        {
          id: 'q1',
          title: 'Correr',
          category: 'saude',
          difficulty: 'media',
          xpReward: 25,
          date: '2026-06-01',
          completed: true,
          completedAt: '2026-06-01T08:00:00.000Z',
        },
      ],
      completions: [{ id: 'c1', questId: 'q1', xp: 25, at: '2026-06-01T08:00:00.000Z' }],
      maxTotalXp: 25,
    };

    const migrated = migrateState(v2)!;
    expect(migrated.schemaVersion).toBe(SCHEMA_VERSION);
    expect(migrated.templates).toEqual([]);
    expect(migrated.notifications).toEqual(DEFAULT_NOTIFICATION_SETTINGS);
    expect(totalXpFrom(migrated.completions)).toBe(25);
    expect(deriveStats(migrated, '2026-06-01').totalXp).toBe(25);
  });

  it('preserva um estado já na versão atual (recorrências + notificações)', () => {
    const current = {
      schemaVersion: SCHEMA_VERSION,
      playerName: 'Bruno',
      playerAvatar: '🐉',
      quests: [
        {
          id: 'q1',
          title: 'Correr',
          category: 'saude',
          difficulty: 'media',
          xpReward: 25,
          date: '2026-06-01',
          completed: true,
          completedAt: '2026-06-01T08:00:00.000Z',
          templateId: 't1',
          subtasks: [],
        },
      ],
      completions: [
        {
          id: 'c1',
          questId: 'q1',
          xp: 25,
          at: '2026-06-01T08:00:00.000Z',
          category: 'saude',
          gold: 5,
          bonusXp: 0,
        },
      ],
      maxTotalXp: 25,
      templates: [
        {
          id: 't1',
          title: 'Correr',
          category: 'saude',
          difficulty: 'media',
          recurrence: { kind: 'weekdays', days: [1, 3, 5] },
          active: true,
          lastGeneratedDate: '2026-06-01',
        },
      ],
      notifications: {
        dailyEnabled: true,
        dailyTime: '07:30',
        streakEnabled: true,
        streakTime: '22:00',
      },
      rewards: [{ id: 'r1', title: 'Café especial', cost: 25 }],
      purchases: [
        {
          id: 'p1',
          kind: 'reward',
          rewardId: 'r1',
          title: 'Café especial',
          cost: 25,
          at: '2026-06-02T18:00:00.000Z',
        },
      ],
      seenAchievements: ['primeira-missao', 'recompensa-merecida'],
    };

    expect(migrateState(current)).toEqual(current);
  });

  it('descarta recorrências malformadas e cai no padrão diário', () => {
    const migrated = migrateState({
      schemaVersion: SCHEMA_VERSION,
      quests: [],
      templates: [
        { id: 't1', title: 'Ler', recurrence: { kind: 'weekdays', days: [9, 3] } },
        { title: 'sem id' },
        'lixo',
      ],
    })!;

    expect(migrated.templates).toHaveLength(1);
    expect(migrated.templates[0].id).toBe('t1');
    expect(migrated.templates[0].recurrence).toEqual({ kind: 'weekdays', days: [3] });
    expect(migrated.templates[0].active).toBe(true);
    expect(migrated.templates[0].difficulty).toBe('media'); // padrão
  });

  it('normaliza notificações inválidas para o padrão (desligadas)', () => {
    const migrated = migrateState({
      schemaVersion: SCHEMA_VERSION,
      quests: [],
      notifications: { dailyEnabled: 'sim', dailyTime: '99:99', streakTime: 'nope' },
    })!;

    expect(migrated.notifications).toEqual(DEFAULT_NOTIFICATION_SETTINGS);
  });

  it('aceita horários válidos das notificações', () => {
    const migrated = migrateState({
      schemaVersion: SCHEMA_VERSION,
      quests: [],
      notifications: { dailyEnabled: true, dailyTime: '6:05', streakEnabled: true, streakTime: '23:45' },
    })!;

    expect(migrated.notifications).toEqual({
      dailyEnabled: true,
      dailyTime: '6:05',
      streakEnabled: true,
      streakTime: '23:45',
    });
  });

  it('preenche a categoria das conclusões antigas a partir da missão (v4 → v5)', () => {
    const v4 = {
      schemaVersion: 4,
      quests: [
        {
          id: 'q1',
          title: 'Ler um livro',
          category: 'estudo',
          difficulty: 'media',
          xpReward: 25,
          date: '2026-06-01',
          completed: true,
        },
      ],
      completions: [{ id: 'c1', questId: 'q1', xp: 25, at: '2026-06-01T08:00:00.000Z' }],
    };

    const migrated = migrateState(v4)!;

    expect(migrated.completions).toHaveLength(1);
    expect(migrated.completions[0].category).toBe('estudo');
    expect(migrated.schemaVersion).toBe(SCHEMA_VERSION);
  });

  it('usa "outros" quando a missão da conclusão não existe mais', () => {
    const migrated = migrateState({
      schemaVersion: 4,
      quests: [],
      completions: [{ id: 'c1', questId: 'fantasma', xp: 25, at: '2026-06-01T08:00:00.000Z' }],
    })!;

    expect(migrated.completions[0].category).toBe('outros');
  });

  it('migra v1 dando a cada conclusão a categoria da sua missão', () => {
    const migrated = migrateState(V1_STATE)!;

    const porMissao = new Map(migrated.completions.map((c) => [c.questId, c.category]));
    expect(porMissao.get('a')).toBe('saude');
    expect(porMissao.get('b')).toBe('estudo');
  });

  it('preenche o ouro das conclusões antigas a partir do XP (v5 → v6)', () => {
    const v5 = {
      schemaVersion: 5,
      quests: [],
      completions: [
        { id: 'c1', questId: 'q1', xp: 100, at: '2026-06-01T08:00:00.000Z', category: 'saude' },
        { id: 'c2', questId: 'q2', xp: 25, at: '2026-06-01T09:00:00.000Z', category: 'estudo' },
      ],
    };

    const migrated = migrateState(v5)!;

    expect(migrated.completions.map((completion) => completion.gold)).toEqual([20, 5]);
    // A loja entra vazia em estados antigos.
    expect(migrated.rewards).toEqual([]);
    expect(migrated.purchases).toEqual([]);
  });

  it('preserva o ouro já gravado na conclusão', () => {
    const migrated = migrateState({
      schemaVersion: SCHEMA_VERSION,
      quests: [],
      completions: [
        {
          id: 'c1',
          questId: 'q1',
          xp: 100,
          at: '2026-06-01T08:00:00.000Z',
          category: 'saude',
          gold: 3,
        },
      ],
    })!;

    expect(migrated.completions[0].gold).toBe(3);
  });

  it('normaliza a loja e descarta recompensas/resgates inválidos', () => {
    const migrated = migrateState({
      schemaVersion: SCHEMA_VERSION,
      quests: [],
      rewards: [
        { id: 'r1', title: 'Café', cost: 25 },
        { id: 'r2', title: '   ', cost: 10 }, // sem título
        { id: 'r3', title: 'De graça', cost: 0 }, // preço inválido
      ],
      purchases: [
        { id: 'p1', rewardId: 'r1', title: 'Café', cost: 25, at: '2026-06-02T12:00:00.000Z' },
        { rewardId: 'r1', cost: 25 }, // sem data
      ],
    })!;

    expect(migrated.rewards.map((reward) => reward.id)).toEqual(['r1']);
    expect(migrated.purchases.map((purchase) => purchase.id)).toEqual(['p1']);
  });

  it('preenche o bônus com 0 e marca resgates antigos como recompensa (v6 → v7)', () => {
    const v6 = {
      schemaVersion: 6,
      quests: [],
      completions: [
        { id: 'c1', questId: 'q1', xp: 100, at: '2026-06-01T08:00:00.000Z', category: 'saude', gold: 20 },
      ],
      rewards: [{ id: 'r1', title: 'Café', cost: 25 }],
      purchases: [{ id: 'p1', rewardId: 'r1', title: 'Café', cost: 25, at: '2026-06-02T12:00:00.000Z' }],
    };

    const migrated = migrateState(v6)!;

    // Bônus de sequência não existia: nada de retroativo.
    expect(migrated.completions[0].bonusXp).toBe(0);
    expect(migrated.completions[0].xp).toBe(100);
    expect(migrated.completions[0].gold).toBe(20);
    expect(migrated.purchases[0].kind).toBe('reward');
  });

  it('preserva o bônus de sequência já gravado na conclusão', () => {
    const migrated = migrateState({
      schemaVersion: SCHEMA_VERSION,
      quests: [],
      completions: [
        {
          id: 'c1',
          questId: 'q1',
          xp: 30,
          at: '2026-06-01T08:00:00.000Z',
          category: 'saude',
          gold: 5,
          bonusXp: 5,
        },
      ],
    })!;

    expect(migrated.completions[0].bonusXp).toBe(5);
    expect(migrated.completions[0].xp).toBe(30);
  });

  it('aceita o resgate de um escudo de sequência', () => {
    const migrated = migrateState({
      schemaVersion: SCHEMA_VERSION,
      quests: [],
      purchases: [
        { id: 'p1', kind: 'shield', rewardId: 'escudo', title: 'Escudo', cost: 100, at: '2026-06-02T12:00:00.000Z' },
      ],
    })!;

    expect(migrated.purchases[0].kind).toBe('shield');
    expect(deriveStats(migrated, '2026-06-02').shieldsOwned).toBe(1);
  });

  it('dá subtarefas vazias às missões antigas (v7 → v8)', () => {
    const v7 = {
      schemaVersion: 7,
      quests: [
        {
          id: 'q1',
          title: 'Estudar',
          category: 'estudo',
          difficulty: 'epica',
          xpReward: 100,
          date: '2026-06-01',
          completed: false,
        },
      ],
      completions: [],
    };

    const migrated = migrateState(v7)!;

    expect(migrated.quests[0].subtasks).toEqual([]);
    expect(migrated.schemaVersion).toBe(SCHEMA_VERSION);
  });

  it('normaliza as subtarefas: descarta vazias e completa o id ausente', () => {
    const migrated = migrateState({
      schemaVersion: SCHEMA_VERSION,
      quests: [
        {
          id: 'q1',
          title: 'Estudar',
          difficulty: 'epica',
          subtasks: [
            { id: 's1', title: '  Ler o capítulo  ', done: true },
            { title: 'Fazer resumo' }, // sem id e sem done
            { title: '   ' }, // sem título
            'lixo',
          ],
        },
      ],
    })!;

    expect(migrated.quests[0].subtasks).toEqual([
      { id: 's1', title: 'Ler o capítulo', done: true },
      { id: 'sub-1', title: 'Fazer resumo', done: false },
    ]);
  });

  it('retorna null para dados irrecuperáveis', () => {
    expect(migrateState(null)).toBeNull();
    expect(migrateState('texto')).toBeNull();
    expect(migrateState({ quests: 'não é lista' })).toBeNull();
    // Estado gravado por um app mais novo: melhor começar do zero do que arriscar.
    expect(migrateState({ schemaVersion: 99, quests: [] })).toBeNull();
  });

  it('marca as conquistas já desbloqueadas como vistas (v8 → v9)', () => {
    const v8 = {
      schemaVersion: 8,
      quests: [],
      completions: [
        {
          id: 'c1',
          questId: 'q1',
          xp: 25,
          at: '2026-06-01T10:00:00.000Z',
          category: 'saude',
          gold: 5,
          bonusXp: 0,
        },
      ],
      purchases: [
        {
          id: 'p1',
          kind: 'reward',
          rewardId: 'r1',
          title: 'Café especial',
          cost: 25,
          at: '2026-06-02T18:00:00.000Z',
        },
      ],
    };

    const migrated = migrateState(v8)!;

    // Quem já jogou não leva uma chuva de toasts no primeiro boot da v9.
    expect(migrated.seenAchievements).toEqual(['primeira-missao', 'recompensa-merecida']);
  });

  it('preserva as conquistas vistas já gravadas', () => {
    const migrated = migrateState({
      schemaVersion: SCHEMA_VERSION,
      quests: [],
      completions: [],
      seenAchievements: ['primeira-missao', 42, null, 'lixo'],
    })!;

    expect(migrated.seenAchievements).toEqual(['primeira-missao', 'lixo']);
  });
});
