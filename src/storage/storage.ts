import AsyncStorage from '@react-native-async-storage/async-storage';

import type { AppState } from '../types';
import { migrateState } from './migrations';

// A chave permanece a mesma da v1 de propósito: é por ela que o estado antigo
// é encontrado e migrado para a v2.
const STORAGE_KEY = '@rpg-pessoal/state/v1';

/** Carrega, valida e migra o estado salvo (ou null na primeira execução). */
export async function loadState(): Promise<AppState | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return migrateState(JSON.parse(raw));
  } catch {
    return null; // JSON inválido, storage corrompido ou versão desconhecida
  }
}

/** Persiste o estado atual no dispositivo. Falhas de escrita são silenciosas. */
export async function saveState(state: AppState): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Espaço insuficiente ou storage indisponível — o app segue funcionando em memória.
  }
}

/** Remove todos os dados salvos (reset completo). */
export async function clearState(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignora erros de limpeza.
  }
}
