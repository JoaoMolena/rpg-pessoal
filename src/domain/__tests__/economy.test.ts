import type { Completion, Purchase } from '../../types';
import { goldBalance, goldEarned, goldFromXp, goldSpent } from '../economy';

function completion(gold: number, id = `c-${gold}`): Completion {
  return {
    id,
    questId: 'q1',
    xp: gold * 5,
    at: '2026-06-01T12:00:00.000Z',
    category: 'saude',
    gold,
  };
}

function purchase(cost: number, id = `p-${cost}`): Purchase {
  return { id, rewardId: 'r1', title: 'Recompensa', cost, at: '2026-06-02T12:00:00.000Z' };
}

describe('goldFromXp', () => {
  it('converte 5 XP em 1 de ouro (mesma tabela das dificuldades)', () => {
    expect(goldFromXp(10)).toBe(2);
    expect(goldFromXp(25)).toBe(5);
    expect(goldFromXp(50)).toBe(10);
    expect(goldFromXp(100)).toBe(20);
  });

  it('arredonda e nunca devolve negativo', () => {
    expect(goldFromXp(0)).toBe(0);
    expect(goldFromXp(7)).toBe(1);
    expect(goldFromXp(-50)).toBe(0);
  });
});

describe('saldo de ouro', () => {
  it('soma o ganho e o gasto separadamente', () => {
    const completions = [completion(2), completion(5), completion(10)];
    const purchases = [purchase(5), purchase(1)];

    expect(goldEarned(completions)).toBe(17);
    expect(goldSpent(purchases)).toBe(6);
    expect(goldBalance(completions, purchases)).toBe(11);
  });

  it('sem resgates o saldo é todo o ouro ganho', () => {
    expect(goldBalance([completion(20)], [])).toBe(20);
  });

  it('nunca fica negativo, mesmo com histórico inconsistente', () => {
    expect(goldBalance([completion(2)], [purchase(100)])).toBe(0);
  });
});
