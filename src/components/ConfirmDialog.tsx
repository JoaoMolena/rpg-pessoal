import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { cardShadow, colors } from '../theme/game';

export interface ConfirmOptions {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Pinta o botão de confirmar com a cor de perigo. */
  destructive?: boolean;
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

/**
 * Diálogo de confirmação próprio do app.
 *
 * Substitui `Alert.alert` (que ignora os botões no react-native-web) por um
 * `Modal`, funcionando igual em Android, iOS e web.
 */
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const resolveRef = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback<ConfirmFn>((nextOptions) => {
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
      setOptions(nextOptions);
    });
  }, []);

  const close = useCallback((value: boolean) => {
    resolveRef.current?.(value);
    resolveRef.current = null;
    setOptions(null);
  }, []);

  const value = useMemo(() => confirm, [confirm]);

  return (
    <ConfirmContext.Provider value={value}>
      {children}
      <Modal
        visible={options !== null}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => close(false)}
      >
        <View style={styles.backdrop}>
          <View style={styles.card}>
            <Text style={styles.title}>{options?.title}</Text>
            {!!options?.message && <Text style={styles.message}>{options.message}</Text>}
            <View style={styles.actions}>
              <Pressable
                accessibilityRole="button"
                onPress={() => close(false)}
                style={({ pressed }) => [styles.button, styles.cancel, pressed && styles.pressed]}
              >
                <Text style={styles.cancelLabel}>{options?.cancelLabel ?? 'Cancelar'}</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={() => close(true)}
                style={({ pressed }) => [
                  styles.button,
                  options?.destructive ? styles.danger : styles.confirm,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.confirmLabel}>{options?.confirmLabel ?? 'Confirmar'}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </ConfirmContext.Provider>
  );
}

/** Abre o diálogo de confirmação e resolve `true`/`false` conforme a escolha. */
export function useConfirm(): ConfirmFn {
  const context = useContext(ConfirmContext);
  if (!context) throw new Error('useConfirm precisa ser usado dentro de <ConfirmProvider>.');
  return context;
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(3, 6, 14, 0.72)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 22,
    gap: 12,
    ...cardShadow,
  },
  title: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
  },
  message: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 6,
  },
  button: {
    paddingVertical: 11,
    paddingHorizontal: 18,
    borderRadius: 12,
  },
  cancel: {
    backgroundColor: colors.surfaceAlt,
  },
  confirm: {
    backgroundColor: colors.primary,
  },
  danger: {
    backgroundColor: colors.danger,
  },
  pressed: {
    opacity: 0.75,
  },
  cancelLabel: {
    color: colors.text,
    fontWeight: '700',
  },
  confirmLabel: {
    color: colors.bgDeep,
    fontWeight: '800',
  },
});
