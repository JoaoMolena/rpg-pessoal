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
        },
      ],
      completions: [{ id: 'c1', questId: 'q1', xp: 25, at: '2026-06-01T08:00:00.000Z' }],
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

  it('retorna null para dados irrecuperáveis', () => {
    expect(migrateState(null)).toBeNull();
    expect(migrateState('texto')).toBeNull();
    expect(migrateState({ quests: 'não é lista' })).toBeNull();
    // Estado gravado por um app mais novo: melhor começar do zero do que arriscar.
    expect(migrateState({ schemaVersion: 99, quests: [] })).toBeNull();
  });
});
