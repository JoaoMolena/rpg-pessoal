import { useEffect, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import { useGame } from '../context/GameContext';
import { useReduceMotion } from '../hooks/useReduceMotion';
import { colors } from '../theme/game';
import { hapticLight, hapticSuccess } from '../utils/haptics';

/** Quanto tempo o toast com "Desfazer" fica na tela. */
const TOAST_MS = 4500;

/**
 * Feedback ao concluir uma missão.
 *
 * Mostra um "+XP" que flutua e desaparece, além de um toast com "Desfazer"
 * (que desmarca a missão e devolve o XP). Com "reduzir movimento" ligado, o
 * "+XP" não desliza — o toast continua, só que sem animação.
 */
export function CompletionFeedback() {
  const { completion, dismissCompletion, undoCompletion } = useGame();
  const reduceMotion = useReduceMotion();
  const [progress] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (!completion) return;
    hapticSuccess();

    progress.setValue(0);
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration: reduceMotion ? 0 : 1100,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [completion, reduceMotion, progress]);

  useEffect(() => {
    if (!completion) return;
    const timer = setTimeout(dismissCompletion, TOAST_MS);
    return () => clearTimeout(timer);
  }, [completion, dismissCompletion]);

  if (!completion) return null;

  const rising = {
    opacity: progress.interpolate({
      inputRange: [0, 0.15, 0.7, 1],
      outputRange: [0, 1, 1, 0],
    }),
    transform: [
      { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [0, -96] }) },
      { scale: progress.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0.6, 1.1, 1] }) },
    ],
  };

  const handleUndo = () => {
    hapticLight();
    undoCompletion();
  };

  return (
    <View style={styles.layer} pointerEvents="box-none">
      {!reduceMotion && (
        <Animated.View style={[styles.burst, rising]} pointerEvents="none">
          <Text style={styles.burstText}>+{completion.xp} XP</Text>
        </Animated.View>
      )}

      <View style={styles.toast}>
        <MaterialCommunityIcons name="check-circle" size={22} color={colors.success} />
        <View style={styles.toastTexts}>
          <Text style={styles.toastTitle} numberOfLines={1}>
            {completion.title}
          </Text>
          <Text style={styles.toastSubtitle}>Missão concluída · +{completion.xp} XP</Text>
        </View>
        <Pressable
          testID="completion-undo"
          accessibilityRole="button"
          accessibilityLabel="Desfazer conclusão"
          onPress={handleUndo}
          style={({ pressed }) => [styles.undo, pressed && styles.pressed]}
        >
          <Text style={styles.undoText}>Desfazer</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  layer: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  burst: {
    position: 'absolute',
    top: '32%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  burstText: {
    color: colors.success,
    fontSize: 30,
    fontWeight: '900',
    textShadowColor: 'rgba(0, 0, 0, 0.55)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: 16,
    marginBottom: 96,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  toastTexts: {
    flex: 1,
    gap: 2,
  },
  toastTitle: {
    color: colors.text,
    fontSize: 14.5,
    fontWeight: '800',
  },
  toastSubtitle: {
    color: colors.textMuted,
    fontSize: 12.5,
  },
  undo: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: `${colors.primary}22`,
  },
  pressed: {
    opacity: 0.7,
  },
  undoText: {
    color: colors.primarySoft,
    fontSize: 13.5,
    fontWeight: '800',
  },
});
