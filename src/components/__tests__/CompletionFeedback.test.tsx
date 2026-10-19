import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { Pressable, Text } from 'react-native';

import { CompletionFeedback } from '../CompletionFeedback';
import { GameProvider, useGame } from '../../context/GameContext';

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
});
