import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import type { NotificationSettings } from '../types';
import { NOTIFICATION_IDS, buildNotificationPlan, type PlanContext } from './plan';

/** Canal Android usado por todos os lembretes do app. */
const CHANNEL_ID = 'lembretes';

/** Exibe as notificações mesmo com o app aberto (sem som de alerta do sistema). */
export function configureNotificationHandler(): void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

/** No Android 8+ toda notificação precisa de um canal. */
export async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: 'Lembretes',
    // A regra `import/namespace` não enxerga os enums reexportados via `export *`.
    // eslint-disable-next-line import/namespace
    importance: Notifications.AndroidImportance.DEFAULT,
  });
}

/**
 * Já temos permissão para notificar?
 *
 * Usamos `granted` (equivale a AUTORIZADO). Não pedimos autorização provisória,
 * então não há necessidade de checar `ios.status`.
 */
export async function hasPermission(): Promise<boolean> {
  return (await Notifications.getPermissionsAsync()).granted;
}

/**
 * Pede a permissão. O canal é criado antes porque, no Android 13+, o prompt do
 * sistema só aparece depois que existe ao menos um canal.
 */
export async function requestPermission(): Promise<boolean> {
  await ensureAndroidChannel();
  return (await Notifications.requestPermissionsAsync()).granted;
}

/** Reaplica o plano: cancela os agendamentos do app e reagenda o que estiver ativo. */
export async function applyNotificationPlan(
  settings: NotificationSettings,
  context: PlanContext
): Promise<void> {
  const plan = buildNotificationPlan(settings, context);

  await Promise.all(plan.cancel.map((id) => Notifications.cancelScheduledNotificationAsync(id)));

  if (plan.daily) {
    await Notifications.scheduleNotificationAsync({
      identifier: NOTIFICATION_IDS.daily,
      content: {
        title: 'Hora das missões ⚔️',
        body: 'Você tem missões esperando hoje. Bora manter o ritmo?',
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: plan.daily.hour,
        minute: plan.daily.minute,
        channelId: CHANNEL_ID,
      },
    });
  }

  if (plan.streak) {
    await Notifications.scheduleNotificationAsync({
      identifier: NOTIFICATION_IDS.streak,
      content: {
        title: 'Sua sequência está em risco 🔥',
        body: 'Ainda dá tempo: conclua uma missão hoje e mantenha a sequência.',
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: plan.streak.date,
        channelId: CHANNEL_ID,
      },
    });
  }
}

/** Remove os lembretes do app (usado quando a permissão está negada). */
export async function cancelAllAppNotifications(): Promise<void> {
  await Promise.all(
    Object.values(NOTIFICATION_IDS).map((id) =>
      Notifications.cancelScheduledNotificationAsync(id)
    )
  );
}
