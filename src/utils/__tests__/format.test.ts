import { missionCountLabel } from '../format';

describe('missionCountLabel (bug #7 - "missãoões")', () => {
  it('usa singular para 1', () => {
    expect(missionCountLabel(1)).toBe('1 missão');
  });

  it('usa plural correto para outros valores', () => {
    expect(missionCountLabel(0)).toBe('0 missões');
    expect(missionCountLabel(2)).toBe('2 missões');
    expect(missionCountLabel(9)).toBe('9 missões');
  });

  it('nunca concatena o sufixo "ões" sobre "missão"', () => {
    expect(missionCountLabel(2)).not.toContain('missãoões');
  });
});
