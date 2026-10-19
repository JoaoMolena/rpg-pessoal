import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { Pressable, Text } from 'react-native';

import { CompletionFeedback } from '../CompletionFeedback';
import { GameProvider, useGame } from '../../context/GameContext';
import { loadState } from '../../storage/storage';
import {
  DEFAULT_NOTIFICATION_SETTINGS,
  SCHEMA_VERSION,
  type AppState,
  type Completion,
} from '../../types';
import { addDaysToKey, dateKey } from '../../utils/dates';

jest.mock('@expo/vector-icons/MaterialCommunityIcons', () => () => null);

jest.mock('expo-haptics', () => ({
  notificationAsync: jest.fn().mockResolvedValue(undefined),
  impactAsync: jest.fn().mockResolvedValue(undefined),
  NotificationFeedbackType: { Success: 'success' },
  ImpactFeedbackStyle: { Light: 'light' },
}));

// Isola o teste de armazenamento: o foco é o feedback em memória.
jest.mock('../../storage/storage', () => ({
  loadState: jest.fn().mockResolvedValue(null),
  saveState: jest.fn().mockResolvedValue(undefined),
  clearState: jest.fn().mockResolvedValue(undefined),
}));

function Harness() {
  const { hydrated, todayQuests, addQuest, toggleQuest } = useGame();

  return (
    <>
      <Text testID="hydrated">{hydrated ? 'sim' : 'não'}</Text>
      <Pressable
        testID="add"
        onPress={() => addQuest({ title: 'Beber água', category: 'saude', difficulty: 'facil' })}
      >
        <Text>adicionar</Text>
      </Pressable>
      <Pressable
        testID="toggle"
        onPress={() => {
          const quest = todayQuests[0];
          if (quest) toggleQuest(quest.id);
        }}
      >
        <Text>alternar</Text>
      </Pressable>
      <CompletionFeedback />
    </>
  );
}

/** Renderiza o provider, adiciona uma missão de fácil (10 XP) e espera hidratar. */
async function setup() {
  const utils = await render(
    <GameProvider>
      <Harness />
    </GameProvider>
  );

  await waitFor(() => expect(utils.getByTestId('hydrated')).toHaveTextContent('sim'));
  await fireEvent.press(utils.getByTestId('add'));
  await waitFor(() => expect(utils.getByTestId('toggle')).toBeTruthy());

  return utils;
}

/** Estado com dois dias seguidos já concluídos (anteontem e ontem). */
function stateWithStreak(): AppState {
  const today = dateKey();
  const days = [addDaysToKey(today, -2), addDaysToKey(today, -1)];

  return {
    schemaVersion: SCHEMA_VERSION,
    playerName: 'Herói',
    playerAvatar: '⚔️',
    quests: [],
    completions: days.map(
      (day, index): Completion => ({
        id: `c${index}`,
        questId: `q${index}`,
        xp: 25,
        at: `${day}T12:00:00.000Z`,
        category: 'saude',
        gold: 5,
        bonusXp: 0,
      })
    ),
    maxTotalXp: 50,
    templates: [],
    notifications: DEFAULT_NOTIFICATION_SETTINGS,
    rewards: [],
    purchases: [],
    seenAchievements: [],
  };
}

describe('CompletionFeedback', () => {
  it('mostra "+XP" e o toast com "Desfazer" ao concluir', async () => {
    const { getByTestId, getByText } = await setup();

    await fireEvent.press(getByTestId('toggle'));

    await waitFor(() => expect(getByText('Desfazer')).toBeTruthy());
    expect(getByText('+10 XP')).toBeTruthy();
    expect(getByText('Beber água')).toBeTruthy();
    // 10 XP (fácil) também rendem 2 de ouro.
    expect(getByText('Missão concluída · +10 XP · +2 de ouro')).toBeTruthy();
  });

  it('"Desfazer" desmarca a missão e fecha o feedback', async () => {
    const { getByTestId, getByText, queryByText } = await setup();

    await fireEvent.press(getByTestId('toggle'));
    await waitFor(() => expect(getByText('Desfazer')).toBeTruthy());

    await fireEvent.press(getByTestId('completion-undo'));

    await waitFor(() => expect(queryByText('Desfazer')).toBeNull());
  });

  it('desmarcar sem desfazer também fecha o feedback', async () => {
    const { getByTestId, getByText, queryByText } = await setup();

    await fireEvent.press(getByTestId('toggle'));
    await waitFor(() => expect(getByText('Desfazer')).toBeTruthy());

    await fireEvent.press(getByTestId('toggle')); // desmarca a missão

    await waitFor(() => expect(queryByText('Desfazer')).toBeNull());
  });

  it('mostra o bônus de sequência no toast', async () => {
    (loadState as jest.Mock).mockResolvedValueOnce(stateWithStreak());
    const { getByTestId, getByText } = await setup();

    await fireEvent.press(getByTestId('toggle'));

    await waitFor(() => expect(getByText('Desfazer')).toBeTruthy());
    // Anteontem + ontem + hoje = 3 dias → +10% sobre 10 XP = +1 XP.
    expect(getByText('Missão concluída · +11 XP · bônus de sequência +1 · +2 de ouro')).toBeTruthy();
  });
});
