import type { NotificationSettings } from '../types';
import { parseTime } from '../utils/time';

/** Identificadores estáveis dos agendamentos — permitem cancelar/substituir. */
export const NOTIFICATION_IDS = {
  daily: 'rpg-pessoal/daily-reminder',
  streak: 'rpg-pessoal/streak-risk',
} as const;

export interface NotificationPlan {
  /** Ids a cancelar antes de reagendar (evita duplicar). */
  cancel: string[];
  /** Lembrete diário recorrente. */
  daily?: { hour: number; minute: number };
  /** Aviso único, agendado para hoje. */
  streak?: { date: Date };
}

export interface PlanContext {
  /** Momento atual — injetado para manter a função pura/testável. */
  now: Date;
  /** A sequência está em risco hoje (streak > 0 e nada concluído hoje). */
  streakAtRisk: boolean;
}

/**
 * Decide o que cancelar e agendar a partir das preferências.
 *
 * É pura: recebe `now` de fora. Sempre cancela os dois canais antes de reagendar,
 * então rodar várias vezes não duplica. O aviso de sequência só entra se ainda
 * houver tempo hoje (horário no futuro).
 */
export function buildNotificationPlan(
  settings: NotificationSettings,
  { now, streakAtRisk }: PlanContext
): NotificationPlan {
  const plan: NotificationPlan = { cancel: [NOTIFICATION_IDS.daily, NOTIFICATION_IDS.streak] };

  if (settings.dailyEnabled) {
    const daily = parseTime(settings.dailyTime);
    if (daily) plan.daily = daily;
  }

  if (settings.streakEnabled && streakAtRisk) {
    const time = parseTime(settings.streakTime);
    if (time) {
      const date = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        time.hour,
        time.minute,
        0,
        0
      );
      if (date.getTime() > now.getTime()) plan.streak = { date };
    }
  }

  return plan;
}
