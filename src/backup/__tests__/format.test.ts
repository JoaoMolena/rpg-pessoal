import { parseBackup, serializeBackup } from '../format';
import { SCHEMA_VERSION, type AppState } from '../../types';

/** Estado "completo" (já normalizado) usado no round-trip. */
const state: AppState = {
  schemaVersion: SCHEMA_VERSION,
  playerName: 'Herói',
  playerAvatar: '⚔️',
  quests: [
    {
      id: 'q1',
      title: 'Beber água',
      category: 'saude',
      difficulty: 'facil',
      xpReward: 10,
      date: '2026-10-19',
      completed: true,
      completedAt: '2026-10-19T12:00:00.000Z',
      templateId: 't1',
      subtasks: [],
    },
  ],
  completions: [{ id: 'c1', questId: 'q1', xp: 10, at: '2026-10-19T12:00:00.000Z', category: 'saude', gold: 2, bonusXp: 0 }],
  maxTotalXp: 10,
  templates: [
    {
      id: 't1',
      title: 'Beber água',
      category: 'saude',
      difficulty: 'facil',
      recurrence: { kind: 'daily' },
      active: true,
      lastGeneratedDate: '2026-10-19',
    },
  ],
  notifications: {
    dailyEnabled: true,
    dailyTime: '20:00',
    streakEnabled: false,
    streakTime: '21:30',
  },
  rewards: [],
  purchases: [],
  seenAchievements: [],
};

describe('serializeBackup', () => {
  it('gera um JSON legível e fiel ao estado', () => {
    const text = serializeBackup(state);

    expect(text).toContain('\n'); // indentado, fácil de inspecionar
    expect(JSON.parse(text)).toEqual(state);
  });
});

describe('parseBackup', () => {
  it('reconstrói o estado a partir do próprio backup (ida e volta)', () => {
    expect(parseBackup(serializeBackup(state))).toEqual(state);
  });

  it('recusa texto que não é JSON', () => {
    expect(parseBackup('isso não é um backup')).toBeNull();
  });

  it('recusa JSON que não parece um estado do app', () => {
    expect(parseBackup('{}')).toBeNull();
    expect(parseBackup('{"quests": "nada"}')).toBeNull();
    expect(parseBackup('42')).toBeNull();
  });

  it('recusa backup gravado por uma versão mais nova do app', () => {
    expect(parseBackup(JSON.stringify({ ...state, schemaVersion: SCHEMA_VERSION + 1 }))).toBeNull();
  });

  it('migra backup da v1 sem perder XP', () => {
    const legacy = {
      quests: [
        {
          id: 'legacy-1',
          title: 'Correr',
          category: 'saude',
          difficulty: 'dificil',
          xpReward: 50,
          date: '2026-10-01',
          completed: true,
        },
      ],
      stats: { totalXp: 50 },
      playerName: 'Ana',
    };

    const migrated = parseBackup(JSON.stringify(legacy));

    expect(migrated).not.toBeNull();
    expect(migrated?.schemaVersion).toBe(SCHEMA_VERSION);
    expect(migrated?.playerName).toBe('Ana');
    expect(migrated?.completions).toHaveLength(1);
    expect(migrated?.maxTotalXp).toBe(50);
    // Campos novos entram com os padrões (recorrentes vazias, lembretes desligados).
    expect(migrated?.templates).toEqual([]);
    expect(migrated?.notifications.dailyEnabled).toBe(false);
  });
});
