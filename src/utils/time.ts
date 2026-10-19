/** Utilitários de horário (formato "HH:MM", 24h). */

/** Minutos oferecidos nos seletores de horário do app. */
export const MINUTE_OPTIONS = [0, 15, 30, 45] as const;

/** Converte "HH:MM" em hora/minuto; retorna `null` se inválido ou fora do intervalo. */
export function parseTime(value: string): { hour: number; minute: number } | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;

  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;

  return { hour, minute };
}

/** Formata hora/minuto como "HH:MM". */
export function formatTime(hour: number, minute: number): string {
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}
