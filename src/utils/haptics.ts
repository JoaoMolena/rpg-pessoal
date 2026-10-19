import * as Haptics from 'expo-haptics';

/**
 * Vibrações do app (expo-haptics).
 *
 * São "best effort": em aparelhos sem motor de vibração ou com a função
 * desligada, a promise apenas resolve — por isso nunca deixamos uma rejeição
 * escapar para o fluxo da UI.
 */

/** Vibração de sucesso ao concluir uma missão. */
export function hapticSuccess(): void {
  void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
}

/** Vibração leve para ações secundárias (ex.: desfazer). */
export function hapticLight(): void {
  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}
