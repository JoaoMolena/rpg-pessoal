/** Chave de data local no formato YYYY-MM-DD (usada para agrupar missões diárias). */
export function dateKey(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Verifica se a chave informada corresponde ao dia anterior ao dia de referência. */
export function isYesterday(key: string | undefined, today = dateKey()): boolean {
  if (!key) return false;
  const [y, m, d] = today.split('-').map(Number);
  const yesterday = new Date(y, m - 1, d);
  yesterday.setDate(yesterday.getDate() - 1);
  return key === dateKey(yesterday);
}

/** Formata uma data ISO para DD/MM. */
export function formatShortDate(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
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
