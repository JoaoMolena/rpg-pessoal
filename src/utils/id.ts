/** Gera um identificador único curto e estável o suficiente para o app local. */
export function createId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
