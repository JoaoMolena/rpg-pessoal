import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { colors, gradients } from '../theme/game';

interface XPBarProps {
  /** Progresso entre 0 e 1. */
  progress: number;
  height?: number;
  colorsPair?: readonly [string, string, ...string[]];
  trackColor?: string;
}

/** Barra de progresso preenchida com gradiente. */
export function XPBar({
  progress,
  height = 12,
  colorsPair = gradients.xp,
  trackColor = colors.surfaceAlt,
}: XPBarProps) {
  const clamped = Math.min(1, Math.max(0, progress));
  return (
    <View style={[styles.track, { height, borderRadius: height / 2, backgroundColor: trackColor }]}>
      <View style={[styles.fill, { width: `${clamped * 100}%`, borderRadius: height / 2 }]}>
        <LinearGradient
          colors={colorsPair}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={StyleSheet.absoluteFill}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    width: '100%',
    backgroundColor: colors.surfaceAlt,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    overflow: 'hidden',
  },
});
