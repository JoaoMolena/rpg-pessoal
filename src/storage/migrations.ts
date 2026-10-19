import { totalXpFrom } from '../domain/stats';
import { CATEGORY_KEYS, DIFFICULTIES, DIFFICULTY_KEYS } from '../theme/game';
import {
  SCHEMA_VERSION,
  type AppState,
  type Completion,
  type Quest,
  type QuestCategory,
  type QuestDifficulty,
} from '../types';
import { dateKey } from '../utils/dates';

/**
 * Migração e validação do estado persistido.
 *
 * Toda leitura passa por aqui, de forma que o app nunca recebe um objeto mal
 * formado: campos ausentes ganham valores padrão e estados de versões antigas
 * são migrados (v1 → v2) reconstruindo o log de conclusões a partir das missões
 * já concluídas — sem perder XP.
 */

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function asNumber(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function isCategory(value: unknown): value is QuestCategory {
  return typeof value === 'string' && (CATEGORY_KEYS as string[]).includes(value);
}

function isDifficulty(value: unknown): value is QuestDifficulty {
  return typeof value === 'string' && (DIFFICULTY_KEYS as string[]).includes(value);
}

function normalizeQuest(raw: unknown): Quest | null {
  if (!isRecord(raw)) return null;
  const id = asString(raw.id);
  if (!id) return null;

  const difficulty = isDifficulty(raw.difficulty) ? raw.difficulty : 'media';
  const description = asString(raw.description);
  const date = asString(raw.date, dateKey());

  return {
    id,
    title: asString(raw.title, 'Missão'),
    description: description || undefined,
    category: isCategory(raw.category) ? raw.category : 'outros',
    difficulty,
    xpReward: asNumber(raw.xpReward, DIFFICULTIES[difficulty].xp),
    date,
    completed: raw.completed === true,
    completedAt: typeof raw.completedAt === 'string' ? raw.completedAt : undefined,
  };
}

function normalizeCompletion(raw: unknown): Completion | null {
  if (!isRecord(raw)) return null;
  const questId = asString(raw.questId);
  const at = asString(raw.at);
  if (!questId || !at) return null;

  return {
    id: asString(raw.id, `completion-${questId}-${at}`),
    questId,
    xp: asNumber(raw.xp, 0),
    at,
  };
}

/** Data da conclusão no formato v1 (usa a data da missão quando falta o horário). */
function legacyCompletionDate(quest: Quest): string {
  if (quest.completedAt) return quest.completedAt;
  const [year, month, day] = quest.date.split('-').map(Number);
  if (!year || !month || !day) return new Date().toISOString();
  // Meio-dia local garante que a data mapeie de volta para o mesmo dia.
  return new Date(year, month - 1, day, 12, 0, 0, 0).toISOString();
}

/** Estado v1 (stats armazenadas, sem log) → v2 (log de conclusões). */
function migrateV1toV2(raw: Record<string, unknown>): AppState {
  const rawQuests = Array.isArray(raw.quests) ? raw.quests : [];
  const quests = rawQuests
    .map(normalizeQuest)
    .filter((quest): quest is Quest => quest !== null);

  const completions: Completion[] = quests
    .filter((quest) => quest.completed)
    .map((quest) => ({
      id: `legacy-${quest.id}`,
      questId: quest.id,
      xp: quest.xpReward,
      at: legacyCompletionDate(quest),
    }));

  const legacyStats = isRecord(raw.stats) ? raw.stats : {};
  const legacyTotalXp = asNumber(legacyStats.totalXp, 0);

  return {
    schemaVersion: SCHEMA_VERSION,
    playerName: asString(raw.playerName, 'Herói') || 'Herói',
    playerAvatar: asString(raw.playerAvatar, '⚔️') || '⚔️',
    quests,
    completions,
    maxTotalXp: Math.max(legacyTotalXp, totalXpFrom(completions)),
  };
}

/** Estado já na v2: normaliza campos faltantes/inválidos. */
function normalizeV2(raw: Record<string, unknown>): AppState {
  const rawQuests = Array.isArray(raw.quests) ? raw.quests : [];
  const quests = rawQuests
    .map(normalizeQuest)
    .filter((quest): quest is Quest => quest !== null);

  const rawCompletions = Array.isArray(raw.completions) ? raw.completions : [];
  const completions = rawCompletions
    .map(normalizeCompletion)
    .filter((completion): completion is Completion => completion !== null);

  return {
    schemaVersion: SCHEMA_VERSION,
    playerName: asString(raw.playerName, 'Herói') || 'Herói',
    playerAvatar: asString(raw.playerAvatar, '⚔️') || '⚔️',
    quests,
    completions,
    maxTotalXp: Math.max(asNumber(raw.maxTotalXp, 0), totalXpFrom(completions)),
  };
}

/**
 * Valida e migra um estado bruto para a versão atual.
 * Retorna `null` quando os dados são irrecuperáveis (o app começa do zero).
 */
export function migrateState(raw: unknown): AppState | null {
  if (!isRecord(raw)) return null;
  if (!Array.isArray(raw.quests)) return null;

  const version = asNumber(raw.schemaVersion, 1);
  if (version > SCHEMA_VERSION) return null; // gravado por um app mais novo: não arrisca

  return version <= 1 ? migrateV1toV2(raw) : normalizeV2(raw);
}
