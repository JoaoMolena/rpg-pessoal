import { didLevelUp, getLevelInfo, getRank, levelFromXp, RANKS, totalXpForLevel } from '../level';

describe('levelFromXp (curva 50*(L-1)^2)', () => {
  it('fica no nível 1 abaixo de 50 XP', () => {
    expect(levelFromXp(0)).toBe(1);
    expect(levelFromXp(49)).toBe(1);
  });

  it('sobe de nível exatamente nos limiares', () => {
    expect(levelFromXp(50)).toBe(2);
    expect(levelFromXp(200)).toBe(3);
    expect(levelFromXp(450)).toBe(4);
  });

  it('nunca retorna nível abaixo de 1 (XP negativo é tratado)', () => {
    expect(levelFromXp(-100)).toBe(1);
  });
});

describe('totalXpForLevel', () => {
  it('casa com o inverso de levelFromXp', () => {
    expect(totalXpForLevel(2)).toBe(50);
    expect(totalXpForLevel(3)).toBe(200);
    expect(levelFromXp(totalXpForLevel(7))).toBe(7);
  });
});

describe('getLevelInfo', () => {
  it('expõe nível, rank, faixa e progresso dentro do nível', () => {
    const info = getLevelInfo(125);

    expect(info.level).toBe(2);
    expect(info.currentLevelStartXp).toBe(50);
    expect(info.nextLevelXp).toBe(200);
    expect(info.progressIntoLevel).toBe(75);
    expect(info.levelRange).toBe(150);
    expect(info.rank).toBe('Recruta');
  });
});

describe('RANKS', () => {
  it('começa em Recruta e é monotonamente crescente', () => {
    expect(RANKS[0].name).toBe('Recruta');
    for (let i = 1; i < RANKS.length; i += 1) {
      expect(RANKS[i].minLevel).toBeGreaterThan(RANKS[i - 1].minLevel);
    }
  });

  it('getRank usa o maior título alcançado', () => {
    expect(getRank(1)).toBe('Recruta');
    expect(getRank(2)).toBe('Recruta');
    expect(getRank(3)).toBe('Aprendiz');
    expect(getRank(99)).toBe('Mítico');
  });
});

describe('didLevelUp', () => {
  it('detecta a virada para um nível superior', () => {
    expect(didLevelUp(0, 50)).toBe(true);
    expect(didLevelUp(49, 50)).toBe(true);
  });

  it('não celebra quando o pico não cruza um nível', () => {
    expect(didLevelUp(50, 50)).toBe(false);
    expect(didLevelUp(50, 49)).toBe(false);
  });
});
