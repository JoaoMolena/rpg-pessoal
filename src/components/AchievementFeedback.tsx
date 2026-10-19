import { useEffect, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import { useGame } from '../context/GameContext';
import { useReduceMotion } from '../hooks/useReduceMotion';
import { colors, gradients } from '../theme/game';
import { formatFullDate } from '../utils/dates';
import { hapticSuccess } from '../utils/haptics';
import { LinearGradient } from 'expo-linear-gradient';

/** Quanto tempo o banner de conquista fica na tela. */
const TOAST_MS = 5000;

/**
 * Banner de conquista desbloqueada.
 *
 * Fica no **topo** de propósito: assim não disputa espaço com o toast de
 * conclusão (que sobe de baixo) quando os dois aparecem juntos. Várias conquistas
 * aparecem em fila — o contexto entrega sempre a próxima ainda não anunciada.
 */
export function AchievementFeedback() {
  const { achievementFeedback, dismissAchievement } = useGame();
  const reduceMotion = useReduceMotion();
  const [progress] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (!achievementFeedback) return;
    hapticSuccess();

    progress.setValue(0);
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration: reduceMotion ? 0 : 420,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [achievementFeedback, reduceMotion, progress]);

  useEffect(() => {
    if (!achievementFeedback) return;
    const timer = setTimeout(dismissAchievement, TOAST_MS);
    return () => clearTimeout(timer);
  }, [achievementFeedback, dismissAchievement]);

  if (!achievementFeedback) return null;

  const { achievement, unlockedAt } = achievementFeedback;
  const entering = {
    opacity: progress,
    transform: [
      { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [-80, 0] }) },
    ],
  };

  return (
    <View style={styles.layer} pointerEvents="box-none">
      <Animated.View style={[styles.banner, entering]}>
        <LinearGradient
          colors={gradients.hero as readonly [string, string, ...string[]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.glow}
        >
          <MaterialCommunityIcons name={achievement.icon} size={22} color={colors.bgDeep} />
        </LinearGradient>

        <View style={styles.texts}>
          <Text style={styles.label}>Conquista desbloqueada!</Text>
          <Text style={styles.title} numberOfLines={1}>
            {achievement.title}
          </Text>
          {!!unlockedAt && (
            <Text style={styles.date}>Desbloqueada em {formatFullDate(unlockedAt)}</Text>
          )}
        </View>

        <Pressable
          testID="achievement-dismiss"
          accessibilityRole="button"
          accessibilityLabel="Fechar conquista"
          onPress={dismissAchievement}
          hitSlop={8}
          style={({ pressed }) => [styles.close, pressed && styles.pressed]}
        >
          <MaterialCommunityIcons name="close" size={18} color={colors.textMuted} />
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  layer: {
    position: 'absolute',
    top: 0,
    right: 0,
    left: 0,
    alignItems: 'center',
    paddingTop: 54,
    paddingHorizontal: 16,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    width: '100%',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.surfaceAlt,
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,
  },
  glow: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  texts: {
    flex: 1,
    gap: 2,
  },
  label: {
    color: colors.primarySoft,
    fontSize: 11.5,
    fontWeight: '800',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  title: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '900',
  },
  date: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  close: {
    padding: 4,
  },
  pressed: {
    opacity: 0.7,
  },
});
