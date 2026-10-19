import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { Text } from 'react-native';

import { AchievementFeedback } from '../AchievementFeedback';
import { GameProvider, useGame } from '../../context/GameContext';
import { loadState } from '../../storage/storage';
import {
  DEFAULT_NOTIFICATION_SETTINGS,
  SCHEMA_VERSION,
  type AppState,
  type Completion,
} from '../../types';

jest.mock('@expo/vector-icons/MaterialCommunityIcons', () => () => null);

jest.mock('expo-haptics', () => ({
  notificationAsync: jest.fn().mockResolvedValue(undefined),
  impactAsync: jest.fn().mockResolvedValue(undefined),
  NotificationFeedbackType: { Success: 'success' },
  ImpactFeedbackStyle: { Light: 'light' },
}));

jest.mock('expo-linear-gradient', () => ({
  LinearGradient: ({ children }: { children?: React.ReactNode }) => children ?? null,
}));

// Isola o teste de armazenamento: o foco é o banner em memória.
jest.mock('../../storage/storage', () => ({
  loadState: jest.fn().mockResolvedValue(null),
  saveState: jest.fn().mockResolvedValue(undefined),
  clearState: jest.fn().mockResolvedValue(undefined),
}));

function Harness() {
  const { hydrated } = useGame();

  return (
    <>
      <Text testID="hydrated">{hydrated ? 'sim' : 'não'}</Text>
      <AchievementFeedback />
    </>
  );
}

async function setup(state: AppState) {
  (loadState as jest.Mock).mockResolvedValueOnce(state);

  const utils = await render(
    <GameProvider>
      <Harness />
    </GameProvider>
  );

  await waitFor(() => expect(utils.getByTestId('hydrated')).toHaveTextContent('sim'));
  return utils;
}

function completion(id: string, xp: number, at: string): Completion {
  return { id, questId: `q-${id}`, xp, at, category: 'estudo', gold: Math.round(xp / 5), bonusXp: 0 };
}

function baseState(completions: Completion[], seenAchievements: string[]): AppState {
  return {
    schemaVersion: SCHEMA_VERSION,
    playerName: 'Herói',
    playerAvatar: '⚔️',
    quests: [],
    completions,
    maxTotalXp: 0,
    templates: [],
    notifications: DEFAULT_NOTIFICATION_SETTINGS,
    rewards: [],
    purchases: [],
    seenAchievements,
  };
}

describe('AchievementFeedback', () => {
  it('mostra o banner da conquista desbloqueada e ainda não vista', async () => {
    const state = baseState([completion('c1', 25, '2026-01-05T12:00:00.000Z')], []);
    const { getByText } = await setup(state);

    await waitFor(() => expect(getByText('Conquista desbloqueada!')).toBeTruthy());
    expect(getByText('Primeiro Passo')).toBeTruthy();
    expect(getByText('Desbloqueada em 05/01/2026')).toBeTruthy();
  });

  it('não mostra nada quando a conquista já foi anunciada', async () => {
    const state = baseState(
      [completion('c1', 25, '2026-01-05T12:00:00.000Z')],
      ['primeira-missao']
    );
    const { queryByText } = await setup(state);

    await waitFor(() => expect(queryByText('Conquista desbloqueada!')).toBeNull());
  });

  it('fechar marca como vista e mostra a próxima da fila', async () => {
    const state = baseState(
      [
        completion('c1', 100, '2026-01-05T12:00:00.000Z'),
        completion('c2', 25, '2026-01-06T12:00:00.000Z'),
      ],
      []
    );
    const { getByText, getByTestId, queryByText } = await setup(state);

    // A primeira da fila é a conquista mais simples (a ordem do catálogo).
    await waitFor(() => expect(getByText('Primeiro Passo')).toBeTruthy());

    await fireEvent.press(getByTestId('achievement-dismiss'));

    // A épica do dia anterior continua na fila e assume o banner.
    await waitFor(() => expect(getByText('Caçador de Épicos')).toBeTruthy());
    expect(queryByText('Primeiro Passo')).toBeNull();
  });
});
