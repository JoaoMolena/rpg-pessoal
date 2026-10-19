import { addDaysToKey, dateKey, dateKeyFromIso } from '../dates';

describe('dateKey', () => {
  it('formata a data local como YYYY-MM-DD', () => {
    expect(dateKey(new Date(2026, 5, 1))).toBe('2026-06-01');
    expect(dateKeyFromIso(new Date(2026, 0, 9, 23, 59).toISOString())).toBe('2026-01-09');
  });
});

describe('addDaysToKey (aritmética de calendário)', () => {
  it('soma e subtrai dias', () => {
    expect(addDaysToKey('2026-06-01', 1)).toBe('2026-06-02');
    expect(addDaysToKey('2026-06-02', -1)).toBe('2026-06-01');
  });

  it('atravessa a virada de mês', () => {
    expect(addDaysToKey('2026-06-30', 1)).toBe('2026-07-01');
    expect(addDaysToKey('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('atravessa a virada de ano', () => {
    expect(addDaysToKey('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDaysToKey('2027-01-01', -1)).toBe('2026-12-31');
  });

  it('acerta o próximo dia no início do horário de verão (dia de 23h)', () => {
    // 04/11/2018 em São Paulo: o relógio pula de 00:00 para 01:00.
    expect(addDaysToKey('2018-11-03', 1)).toBe('2018-11-04');
    expect(addDaysToKey('2018-11-04', 1)).toBe('2018-11-05');
  });
});
