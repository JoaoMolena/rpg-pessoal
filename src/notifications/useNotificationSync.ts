import { useEffect } from 'react';

import { useGame } from '../context/GameContext';
import {
  applyNotificationPlan,
  cancelAllAppNotifications,
  configureNotificationHandler,
  ensureAndroidChannel,
  hasPermission,
} from './notifications';

/**
 * Mantém os lembretes sincronizados com o estado.
 *
 * Reaplica o plano sempre que as preferências, o streak ou o XP de hoje mudam:
 * - streak em risco (streak > 0 e nada concluído hoje) agenda o aviso da noite;
 * - concluir algo hoje (ou zerar o streak) cancela esse aviso.
 */
export function useNotificationSync(): void {
  const { hydrated, state, stats } = useGame();

  useEffect(() => {
    configureNotificationHandler();
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    let active = true;

    (async () => {
      try {
        if (!(await hasPermission())) {
          await cancelAllAppNotifications();
          return;
        }
        await ensureAndroidChannel();
        if (!active) return;
        await applyNotificationPlan(state.notifications, {
          now: new Date(),
          streakAtRisk: stats.currentStreak > 0 && stats.xpToday === 0,
        });
      } catch {
        // Módulo indisponível ou permissão revogada: o app segue funcionando.
      }
    })();

    return () => {
      active = false;
    };
  }, [hydrated, state.notifications, stats.currentStreak, stats.xpToday]);
}
