/** Chave de data local no formato YYYY-MM-DD (usada para agrupar missões diárias). */
export function dateKey(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Chave de data local a partir de um timestamp ISO 8601. */
export function dateKeyFromIso(iso: string): string {
  return dateKey(new Date(iso));
}

/**
 * Soma dias a uma chave YYYY-MM-DD usando aritmética de **calendário**
 * (`Date.setDate`), nunca por milissegundos — por isso é seguro em transições
 * de horário de verão, quando um dia pode ter 23h ou 25h.
 */
export function addDaysToKey(key: string, days: number): string {
  const [year, month, day] = key.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + days);
  return dateKey(date);
}

/** Formata uma data ISO para DD/MM. */
export function formatShortDate(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

/** Formata uma data ISO para DD/MM/AAAA (datas de conquistas). */
export function formatFullDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR');
}

/**
 * Meio-dia local de uma chave YYYY-MM-DD, como ISO.
 * O meio-dia evita que o fuso jogue a data para o dia anterior/seguinte.
 */
export function isoFromDateKey(key: string): string {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, month - 1, day, 12, 0, 0, 0).toISOString();
}

/** Saudação de acordo com o horário do dia. */
export function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 6) return 'Boa madrugada';
  if (hour < 12) return 'Bom dia';
  if (hour < 18) return 'Boa tarde';
  return 'Boa noite';
}

/** Data de hoje por extenso, ex.: "domingo, 18 de outubro". */
export function getLongDate(): string {
  return new Date().toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}
