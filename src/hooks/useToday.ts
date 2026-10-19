import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { dateKey } from '../utils/dates';

/** Milissegundos até a próxima meia-noite local. */
function msUntilNextDay(now: Date = new Date()): number {
  const nextDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0);
  return nextDay.getTime() - now.getTime();
}

/**
 * Chave de "hoje" que se mantém correta mesmo com o app aberto:
 * recalcula quando o app volta ao primeiro plano (AppState) e na virada do dia
 * (timer para a próxima meia-noite, reagendado a cada mudança de dia).
 */
export function useToday(): string {
  const [today, setToday] = useState(() => dateKey());

  useEffect(() => {
    const refresh = () => {
      const next = dateKey();
      setToday((current) => (current === next ? current : next));
    };

    const subscription = AppState.addEventListener('change', (status) => {
      if (status === 'active') refresh();
    });

    // +1s de folga para garantir que já passamos da meia-noite.
    const timer = setTimeout(refresh, msUntilNextDay() + 1000);

    return () => {
      subscription.remove();
      clearTimeout(timer);
    };
  }, [today]);

  return today;
}
