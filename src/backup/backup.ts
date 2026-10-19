import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import type { AppState } from '../types';
import { BACKUP_FILENAME, parseBackup, serializeBackup } from './format';

export interface ExportBackupResult {
  /** `false` quando o aparelho não oferece o compartilhamento de arquivos. */
  shared: boolean;
}

export type ImportBackupResult =
  | { status: 'canceled' }
  | { status: 'invalid' }
  | { status: 'ok'; state: AppState };

/** Grava o backup num arquivo temporário e abre o compartilhamento do sistema. */
export async function exportBackup(state: AppState): Promise<ExportBackupResult> {
  const file = new File(Paths.cache, BACKUP_FILENAME);
  file.create({ overwrite: true });
  await file.write(serializeBackup(state));

  if (!(await Sharing.isAvailableAsync())) {
    return { shared: false };
  }

  await Sharing.shareAsync(file.uri, {
    mimeType: 'application/json',
    dialogTitle: 'Salvar backup do Loopin',
  });

  return { shared: true };
}

/**
 * Abre o seletor de arquivos do sistema e valida o backup escolhido.
 *
 * O filtro aceita qualquer tipo de arquivo de propósito: vários gerenciadores
 * não reportam arquivos `.json` como `application/json` e o arquivo nem
 * apareceria no seletor. A validação de verdade fica no `parseBackup`.
 */
export async function importBackup(): Promise<ImportBackupResult> {
  const result = await DocumentPicker.getDocumentAsync({
    type: '*/*',
    copyToCacheDirectory: true,
  });

  if (result.canceled) return { status: 'canceled' };

  const asset = result.assets[0];
  if (!asset) return { status: 'invalid' };

  try {
    const text = await new File(asset.uri).text();
    const state = parseBackup(text);
    return state ? { status: 'ok', state } : { status: 'invalid' };
  } catch {
    return { status: 'invalid' };
  }
}
