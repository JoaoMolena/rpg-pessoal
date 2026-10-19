import AsyncStorage from '@react-native-async-storage/async-storage';

import type { AppState } from '../types';

const STORAGE_KEY = '@rpg-pessoal/state/v1';

/** Carrega o estado salvo do dispositivo (ou null na primeira execução). */
export async function loadState(): Promise<AppState | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AppState;
    if (!Array.isArray(parsed?.quests)) return null; // dados corrompidos ou formato incompatível
    return parsed;
  } catch {
    return null;
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
