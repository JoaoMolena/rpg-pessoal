import { formatTime, parseTime } from '../time';

describe('parseTime / formatTime', () => {
  it('faz o round-trip de horários válidos', () => {
    expect(parseTime('20:00')).toEqual({ hour: 20, minute: 0 });
    expect(parseTime('6:05')).toEqual({ hour: 6, minute: 5 });
    expect(formatTime(6, 5)).toBe('06:05');
  });

  it('aceita espaços em volta', () => {
    expect(parseTime('  07:30  ')).toEqual({ hour: 7, minute: 30 });
  });

  it('rejeita horários inválidos ou fora do intervalo', () => {
    expect(parseTime('24:00')).toBeNull();
    expect(parseTime('10:99')).toBeNull();
    expect(parseTime('99:99')).toBeNull();
    expect(parseTime('abc')).toBeNull();
    expect(parseTime('')).toBeNull();
  });
});
