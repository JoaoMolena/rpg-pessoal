/** Rótulo plural correto para a contagem de missões (evita o bug "missãoões"). */
export function missionCountLabel(count: number): string {
  return `${count} ${count === 1 ? 'missão' : 'missões'}`;
}
