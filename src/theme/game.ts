import type { ComponentProps } from 'react';

import type MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import type { AppState, QuestCategory, QuestDifficulty } from '../types';
import { levelFromXp } from '../utils/level';

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

/** Paleta escura moderna usada em todo o app. */
export const colors = {
  bg: '#0B0F1A',
  bgDeep: '#070A12',
  surface: '#131A2B',
  surfaceAlt: '#1A2338',
  border: '#24304D',
  primary: '#7C5CFF',
  primarySoft: '#A78BFA',
  accent: '#22D3EE',
  success: '#34D399',
  warning: '#FBBF24',
  danger: '#F87171',
  text: '#F1F5F9',
  textMuted: '#8B96AE',
} as const;

/** Gradientes usados em cartões, barras de XP e botões. */
export const gradients = {
  hero: ['#7C5CFF', '#5E7BFF', '#22D3EE'],
  xp: ['#22D3EE', '#7C5CFF'],
  gold: ['#FBBF24', '#F59E0B'],
} as const;

export interface CategoryInfo {
  label: string;
  icon: IconName;
  color: string;
}

/** Categorias possíveis para uma missão. */
export const CATEGORIES: Record<QuestCategory, CategoryInfo> = {
  saude: { label: 'Saúde', icon: 'heart-pulse', color: '#34D399' },
  estudo: { label: 'Estudo', icon: 'book-open-page-variant', color: '#60A5FA' },
  trabalho: { label: 'Trabalho', icon: 'briefcase-outline', color: '#FBBF24' },
  financas: { label: 'Finanças', icon: 'cash-multiple', color: '#22D3EE' },
  lazer: { label: 'Lazer', icon: 'gamepad-variant-outline', color: '#F472B6' },
  social: { label: 'Social', icon: 'account-group-outline', color: '#A78BFA' },
  outros: { label: 'Outros', icon: 'star-outline', color: '#94A3B8' },
};

export const CATEGORY_KEYS = Object.keys(CATEGORIES) as QuestCategory[];

export interface DifficultyInfo {
  label: string;
  /** XP concedido ao concluir uma missão desta dificuldade. */
  xp: number;
  color: string;
  icon: IconName;
}

/** Dificuldades possíveis e o XP que cada uma concede. */
export const DIFFICULTIES: Record<QuestDifficulty, DifficultyInfo> = {
  facil: { label: 'Fácil', xp: 10, color: '#34D399', icon: 'emoticon-outline' },
  media: { label: 'Média', xp: 25, color: '#60A5FA', icon: 'emoticon-neutral-outline' },
  dificil: { label: 'Difícil', xp: 50, color: '#FBBF24', icon: 'emoticon-devil-outline' },
  epica: { label: 'Épica', xp: 100, color: '#F472B6', icon: 'emoticon-excited-outline' },
};

export const DIFFICULTY_KEYS = Object.keys(DIFFICULTIES) as QuestDifficulty[];

export const AVATARS = ['⚔️', '🛡️', '🏹', '🧙', '🐉', '🧝', '🪄', '👑'] as const;

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: IconName;
  check: (state: AppState) => boolean;
}

/** Conquistas desbloqueáveis exibidas na tela de Progresso. */
export const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'primeira-missao',
    title: 'Primeiro Passo',
    description: 'Conclua sua primeira missão',
    icon: 'shoe-print',
    check: (s) => s.stats.completedQuests >= 1,
  },
  {
    id: 'dez-missoes',
    title: 'Em Ritmo de Combate',
    description: 'Conclua 10 missões no total',
    icon: 'sword-cross',
    check: (s) => s.stats.completedQuests >= 10,
  },
  {
    id: 'sequencia-3',
    title: 'Constância',
    description: 'Mantenha 3 dias seguidos de progresso',
    icon: 'fire',
    check: (s) => s.stats.longestStreak >= 3,
  },
  {
    id: 'sequencia-7',
    title: 'Semana Perfeita',
    description: 'Mantenha 7 dias seguidos de progresso',
    icon: 'trophy',
    check: (s) => s.stats.longestStreak >= 7,
  },
  {
    id: 'nivel-5',
    title: 'Ascensão',
    description: 'Alcance o nível 5',
    icon: 'chevron-double-up',
    check: (s) => levelFromXp(s.stats.totalXp) >= 5,
  },
  {
    id: 'nivel-10',
    title: 'Lenda Urbana',
    description: 'Alcance o nível 10',
    icon: 'crown',
    check: (s) => levelFromXp(s.stats.totalXp) >= 10,
  },
];

/** Estilo de cartão reutilizado nas telas. */
export const cardShadow = {
  shadowColor: '#000000',
  shadowOpacity: 0.35,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 6 },
  elevation: 6,
} as const;
