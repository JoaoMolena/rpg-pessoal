import type { Subtask } from '../types';

/** Fábrica de ids. Injetada para manter as funções puras e testáveis. */
export type IdFactory = () => string;

/** Toda missão com subtarefas está pronta quando **todos** os passos foram feitos. */
export function allSubtasksDone(subtasks: Subtask[]): boolean {
  return subtasks.length > 0 && subtasks.every((subtask) => subtask.done);
}

/**
 * Concilia os títulos do formulário com as subtarefas já existentes.
 *
 * Passos são casados pelo **título** (aparado): editar o texto do passo mantém o
 * `id` e o `done`; um título novo ganha `id` novo (nasce desmarcado); um título
 * removido simplesmente desaparece. Assim mexer na lista não zera o progresso
 * dos passos que continuam iguais.
 */
export function reconcileSubtasks(
  titles: string[],
  existing: Subtask[],
  makeId: IdFactory
): Subtask[] {
  const pool = [...existing];

  return titles
    .map((title) => title.trim())
    .filter((title) => title.length > 0)
    .map((title) => {
      const index = pool.findIndex((subtask) => subtask.title === title);
      if (index < 0) return { id: makeId(), title, done: false };
      const [found] = pool.splice(index, 1);
      return found;
    });
}
