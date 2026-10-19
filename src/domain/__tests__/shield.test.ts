import type { Purchase } from '../../types';
import { SHIELD_COST, shieldProtectedDays, shieldsOwned } from '../shield';

function shield(day: string, id = `shield-${day}`): Purchase {
  return {
    id,
    kind: 'shield',
    rewardId: 'escudo-de-sequencia',
    title: 'Escudo de sequência',
    cost: SHIELD_COST,
    at: `${day}T23:00:00.000Z`,
  };
}

function reward(day: string): Purchase {
  return {
    id: `reward-${day}`,
    kind: 'reward',
    rewardId: 'r1',
    title: 'Café',
    cost: 25,
    at: `${day}T12:00:00.000Z`,
  };
}

/** Conjunto de dias com conclusão. */
function days(...keys: string[]): Set<string> {
  return new Set(keys);
}

describe('shieldsOwned', () => {
  it('conta apenas os escudos, ignorando as recompensas', () => {
    const purchases = [shield('2026-06-02'), reward('2026-06-03'), shield('2026-06-04', 'p2')];

    expect(shieldsOwned(purchases)).toBe(2);
  });
});

describe('shieldProtectedDays', () => {
  it('não protege nada quando não há buraco', () => {
    const completed = days('2026-06-01', '2026-06-02');

    expect(shieldProtectedDays(completed, [shield('2026-06-01')], '2026-06-03')).toEqual(new Set());
  });

  it('cobre um dia sem conclusão com o escudo comprado naquele dia', () => {
    const completed = days('2026-06-01', '2026-06-03');

    expect(shieldProtectedDays(completed, [shield('2026-06-02')], '2026-06-04')).toEqual(
      days('2026-06-02')
    );
  });

  it('sem escudo, o buraco fica sem proteção', () => {
    const completed = days('2026-06-01', '2026-06-03');

    expect(shieldProtectedDays(completed, [], '2026-06-04')).toEqual(new Set());
  });

  it('é prospectivo: escudo comprado depois do buraco não conserta o passado', () => {
    const completed = days('2026-06-01', '2026-06-03');

    expect(shieldProtectedDays(completed, [shield('2026-06-03')], '2026-06-04')).toEqual(new Set());
  });

  it('cobre vários dias seguidos, um escudo por dia', () => {
    const completed = days('2026-06-01', '2026-06-06');
    const purchases = [shield('2026-06-01'), shield('2026-06-01', 'p2')];

    expect(shieldProtectedDays(completed, purchases, '2026-06-07')).toEqual(
      days('2026-06-02', '2026-06-03')
    );
  });

  it('para de proteger quando os escudos acabam', () => {
    const completed = days('2026-06-01', '2026-06-04');

    expect(shieldProtectedDays(completed, [shield('2026-06-01')], '2026-06-05')).toEqual(
      days('2026-06-02')
    );
  });

  it('nunca protege o dia de hoje', () => {
    const completed = days('2026-06-01');
    const purchases = [shield('2026-06-02')];

    // Hoje ainda não acabou: o dia 02 fica sem proteção...
    expect(shieldProtectedDays(completed, purchases, '2026-06-02')).toEqual(new Set());
    // ...e é coberto quando vira ontem.
    expect(shieldProtectedDays(completed, purchases, '2026-06-03')).toEqual(days('2026-06-02'));
  });

  it('não protege nada sem nenhuma conclusão', () => {
    expect(shieldProtectedDays(new Set(), [shield('2026-06-01')], '2026-06-05')).toEqual(new Set());
  });

  it('não protege dias anteriores à primeira conclusão', () => {
    const completed = days('2026-06-03');

    expect(shieldProtectedDays(completed, [shield('2026-06-01')], '2026-06-04')).toEqual(new Set());
  });

  it('não protege um buraco que já zerou a sequência', () => {
    // Sequência vive em 01, morre em 02 (sem escudo) e o escudo comprado em 03
    // não tem nada para salvar.
    const completed = days('2026-06-01', '2026-06-04');
    const purchases = [shield('2026-06-03')];

    expect(shieldProtectedDays(completed, purchases, '2026-06-05')).toEqual(new Set());
  });
});
