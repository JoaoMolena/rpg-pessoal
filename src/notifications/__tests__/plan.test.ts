import { DEFAULT_NOTIFICATION_SETTINGS } from '../../types';
import { NOTIFICATION_IDS, buildNotificationPlan } from '../plan';

describe('buildNotificationPlan', () => {
  // 01/06/2026 12:00 (horário local) — sempre no fuso do dispositivo.
  const now = new Date(2026, 5, 1, 12, 0, 0);

  it('sem nada ligado, apenas cancela os canais', () => {
    const plan = buildNotificationPlan(DEFAULT_NOTIFICATION_SETTINGS, { now, streakAtRisk: true });

    expect(plan.cancel).toEqual([NOTIFICATION_IDS.daily, NOTIFICATION_IDS.streak]);
    expect(plan.daily).toBeUndefined();
    expect(plan.streak).toBeUndefined();
  });

  it('agenda o lembrete diário no horário escolhido', () => {
    const plan = buildNotificationPlan(
      { ...DEFAULT_NOTIFICATION_SETTINGS, dailyEnabled: true, dailyTime: '08:30' },
      { now, streakAtRisk: false }
    );

    expect(plan.daily).toEqual({ hour: 8, minute: 30 });
    expect(plan.streak).toBeUndefined();
  });

  it('agenda o aviso de sequência para hoje quando há risco', () => {
    const plan = buildNotificationPlan(
      { ...DEFAULT_NOTIFICATION_SETTINGS, streakEnabled: true, streakTime: '21:30' },
      { now, streakAtRisk: true }
    );

    expect(plan.streak).toBeDefined();
    expect(plan.streak!.date.getTime()).toBe(new Date(2026, 5, 1, 21, 30, 0, 0).getTime());
  });

  it('não agenda o aviso de sequência quando o horário já passou', () => {
    const plan = buildNotificationPlan(
      { ...DEFAULT_NOTIFICATION_SETTINGS, streakEnabled: true, streakTime: '08:00' },
      { now, streakAtRisk: true }
    );

    expect(plan.streak).toBeUndefined();
  });

  it('não agenda o aviso de sequência se o streak não está em risco', () => {
    const plan = buildNotificationPlan(
      { ...DEFAULT_NOTIFICATION_SETTINGS, streakEnabled: true, streakTime: '21:30' },
      { now, streakAtRisk: false }
    );

    expect(plan.streak).toBeUndefined();
  });

  it('ignora horário de lembrete inválido', () => {
    const plan = buildNotificationPlan(
      { ...DEFAULT_NOTIFICATION_SETTINGS, dailyEnabled: true, dailyTime: '99:99' },
      { now, streakAtRisk: false }
    );

    expect(plan.daily).toBeUndefined();
  });
});
