import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { Pressable, Text } from 'react-native';

import { ConfirmProvider, useConfirm } from '../ConfirmDialog';

function Trigger({ onResult }: { onResult: (value: boolean) => void }) {
  const confirm = useConfirm();
  return (
    <Pressable
      onPress={() => {
        confirm({
          title: 'Excluir missão',
          message: 'Deseja excluir "Estudar"?',
          confirmLabel: 'Excluir',
          destructive: true,
        }).then(onResult);
      }}
    >
      <Text>abrir</Text>
    </Pressable>
  );
}

describe('ConfirmDialog (bug #8 - Alert.alert não funciona no web)', () => {
  it('mostra o diálogo e resolve true ao confirmar', async () => {
    const onResult = jest.fn();
    const { getByText } = await render(
      <ConfirmProvider>
        <Trigger onResult={onResult} />
      </ConfirmProvider>
    );

    await fireEvent.press(getByText('abrir'));
    expect(getByText('Excluir missão')).toBeTruthy();
    expect(getByText('Deseja excluir "Estudar"?')).toBeTruthy();

    await fireEvent.press(getByText('Excluir'));
    await waitFor(() => expect(onResult).toHaveBeenCalledWith(true));
  });

  it('resolve false ao cancelar', async () => {
    const onResult = jest.fn();
    const { getByText } = await render(
      <ConfirmProvider>
        <Trigger onResult={onResult} />
      </ConfirmProvider>
    );

    await fireEvent.press(getByText('abrir'));
    await fireEvent.press(getByText('Cancelar'));

    await waitFor(() => expect(onResult).toHaveBeenCalledWith(false));
  });
});
