import { totalXpFrom } from '../domain/stats';
import { CATEGORY_KEYS, DIFFICULTIES, DIFFICULTY_KEYS } from '../theme/game';
import {
  DEFAULT_NOTIFICATION_SETTINGS,
  SCHEMA_VERSION,
  type AppState,
  type Completion,
  type NotificationSettings,
  type Quest,
  type QuestCategory,
  type QuestDifficulty,
  type QuestTemplate,
  type Recurrence,
  type Weekday,
} from '../types';
import { dateKey } from '../utils/dates';
import { parseTime } from '../utils/time';

/**
 * Migração e validação do estado persistido.
 *
 * Toda leitura passa por aqui, de forma que o app nunca recebe um objeto mal
 * formado: campos ausentes ganham valores padrão e estados de versões antigas
 * são migrados (v1 → v2 → v3 → v4) reconstruindo o log de conclusões e
 * adicionando os campos novos — sem perder XP.
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

function isWeekday(value: unknown): value is Weekday {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 6;
}

/** Normaliza a recorrência; qualquer coisa desconhecida vira diária. */
function normalizeRecurrence(raw: unknown): Recurrence {
  if (isRecord(raw)) {
    if (raw.kind === 'weekly' && isWeekday(raw.weekday)) {
      return { kind: 'weekly', weekday: raw.weekday };
    }
    if (raw.kind === 'weekdays' && Array.isArray(raw.days)) {
      const days = Array.from(new Set(raw.days.filter(isWeekday)));
      return { kind: 'weekdays', days };
    }
  }
  return { kind: 'daily' };
}

/** Normaliza as preferências de notificação (padrão: tudo desligado). */
function normalizeNotifications(raw: unknown): NotificationSettings {
  const source = isRecord(raw) ? raw : {};

  const dailyTime = asString(source.dailyTime, DEFAULT_NOTIFICATION_SETTINGS.dailyTime);
  const streakTime = asString(source.streakTime, DEFAULT_NOTIFICATION_SETTINGS.streakTime);

  return {
    dailyEnabled: source.dailyEnabled === true,
    dailyTime: parseTime(dailyTime) ? dailyTime : DEFAULT_NOTIFICATION_SETTINGS.dailyTime,
    streakEnabled: source.streakEnabled === true,
    streakTime: parseTime(streakTime) ? streakTime : DEFAULT_NOTIFICATION_SETTINGS.streakTime,
  };
}

function normalizeTemplate(raw: unknown): QuestTemplate | null {
  if (!isRecord(raw)) return null;
  const id = asString(raw.id);
  if (!id) return null;

  const difficulty = isDifficulty(raw.difficulty) ? raw.difficulty : 'media';
  const description = asString(raw.description);

  return {
    id,
    title: asString(raw.title, 'Missão recorrente'),
    description: description || undefined,
    category: isCategory(raw.category) ? raw.category : 'outros',
    difficulty,
    recurrence: normalizeRecurrence(raw.recurrence),
    active: raw.active !== false,
    lastGeneratedDate:
      typeof raw.lastGeneratedDate === 'string' ? raw.lastGeneratedDate : undefined,
  };
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
    templateId: typeof raw.templateId === 'string' ? raw.templateId : undefined,
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

/** Estado v1 (stats armazenadas, sem log) → versão atual (log de conclusões). */
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
    // Recorrências e notificações só existem a partir de versões posteriores.
    templates: [],
    notifications: { ...DEFAULT_NOTIFICATION_SETTINGS },
  };
}

/** Estado já na versão atual: normaliza campos faltantes/inválidos. */
function normalizeCurrent(raw: Record<string, unknown>): AppState {
  const rawQuests = Array.isArray(raw.quests) ? raw.quests : [];
  const quests = rawQuests
    .map(normalizeQuest)
    .filter((quest): quest is Quest => quest !== null);

  const rawCompletions = Array.isArray(raw.completions) ? raw.completions : [];
  const completions = rawCompletions
    .map(normalizeCompletion)
    .filter((completion): completion is Completion => completion !== null);

  const rawTemplates = Array.isArray(raw.templates) ? raw.templates : [];
  const templates = rawTemplates
    .map(normalizeTemplate)
    .filter((template): template is QuestTemplate => template !== null);

  return {
    schemaVersion: SCHEMA_VERSION,
    playerName: asString(raw.playerName, 'Herói') || 'Herói',
    playerAvatar: asString(raw.playerAvatar, '⚔️') || '⚔️',
    quests,
    completions,
    maxTotalXp: Math.max(asNumber(raw.maxTotalXp, 0), totalXpFrom(completions)),
    templates,
    notifications: normalizeNotifications(raw.notifications),
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

  return version <= 1 ? migrateV1toV2(raw) : normalizeCurrent(raw);
}
