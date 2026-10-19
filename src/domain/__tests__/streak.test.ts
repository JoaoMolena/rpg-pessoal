import { STREAK_TIERS, nextStreakTier, streakBonusPct, streakBonusXp } from '../streak';

describe('STREAK_TIERS', () => {
  it('está em ordem crescente e começa no primeiro dia', () => {
    const mins = STREAK_TIERS.map((tier) => tier.minStreak);

    expect(mins).toEqual([...mins].sort((a, b) => a - b));
    expect(mins[0]).toBe(1);
  });
});

describe('streakBonusPct', () => {
  it('sobe por degraus conforme a sequência', () => {
    expect(streakBonusPct(0)).toBe(0);
    expect(streakBonusPct(1)).toBe(0);
    expect(streakBonusPct(2)).toBe(0);
    expect(streakBonusPct(3)).toBe(10);
    expect(streakBonusPct(6)).toBe(10);
    expect(streakBonusPct(7)).toBe(20);
    expect(streakBonusPct(13)).toBe(20);
    expect(streakBonusPct(14)).toBe(30);
    expect(streakBonusPct(29)).toBe(30);
    expect(streakBonusPct(30)).toBe(50);
    expect(streakBonusPct(365)).toBe(50);
  });

  it('nunca é negativo', () => {
    expect(streakBonusPct(-10)).toBe(0);
  });
});

describe('streakBonusXp', () => {
  it('aplica o percentual sobre o XP da missão', () => {
    expect(streakBonusXp(100, 1)).toBe(0);
    expect(streakBonusXp(10, 3)).toBe(1);
    expect(streakBonusXp(100, 7)).toBe(20);
    expect(streakBonusXp(50, 14)).toBe(15);
    expect(streakBonusXp(25, 30)).toBe(13); // 12,5 arredonda para 13
  });

  it('devolve 0 sem sequência ou sem XP', () => {
    expect(streakBonusXp(100, -5)).toBe(0);
    expect(streakBonusXp(0, 30)).toBe(0);
  });

  it('bate com a tabela de balanceamento a 175 XP/dia', () => {
    // 1 épica + 1 difícil + 1 média, concluindo todo dia.
    const day = (streak: number) =>
      [100, 50, 25].reduce((sum, base) => sum + streakBonusXp(base, streak), 0);

    expect(day(1)).toBe(0);
    expect(day(3)).toBe(18);
    expect(day(7)).toBe(35);
    expect(day(14)).toBe(53);
    expect(day(30)).toBe(88);
  });
});

describe('nextStreakTier', () => {
  it('indica o próximo degrau a alcançar', () => {
    expect(nextStreakTier(1)).toEqual({ minStreak: 3, pct: 10 });
    expect(nextStreakTier(2)).toEqual({ minStreak: 3, pct: 10 });
    expect(nextStreakTier(3)).toEqual({ minStreak: 7, pct: 20 });
    expect(nextStreakTier(13)).toEqual({ minStreak: 14, pct: 30 });
    expect(nextStreakTier(29)).toEqual({ minStreak: 30, pct: 50 });
  });

  it('não tem próximo degrau no topo', () => {
    expect(nextStreakTier(30)).toBeNull();
    expect(nextStreakTier(100)).toBeNull();
  });
});
