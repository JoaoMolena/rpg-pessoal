import { migrateState } from '../storage/migrations';
import type { AppState } from '../types';

/** Nome do arquivo gerado na exportação. */
export const BACKUP_FILENAME = 'loopin-backup.json';

/** Serializa o estado para o arquivo de backup (JSON legível). */
export function serializeBackup(state: AppState): string {
  return JSON.stringify(state, null, 2);
}

/**
 * Lê um backup e devolve um estado válido — ou `null` se o arquivo não for um
 * backup do app.
 *
 * Reaproveita a mesma validação/migração usada ao carregar o storage: um backup
 * de versões antigas é migrado sem perder XP, e um arquivo estranho (ou de um
 * app mais novo) é recusado em vez de corromper o progresso.
 */
export function parseBackup(text: string): AppState | null {
  try {
    return migrateState(JSON.parse(text));
  } catch {
    return null;
  }
}
