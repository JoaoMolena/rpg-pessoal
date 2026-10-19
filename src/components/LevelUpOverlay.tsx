import { Modal, StyleSheet, Text, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';

import { useGame } from '../context/GameContext';
import { colors, gradients } from '../theme/game';
import { PrimaryButton } from './PrimaryButton';

/** Overlay celebratório exibido quando o jogador sobe de nível. */
export function LevelUpOverlay() {
  const { levelUp, dismissLevelUp } = useGame();

  return (
    <Modal
      visible={!!levelUp}
      transparent
      animationType="fade"
      onRequestClose={dismissLevelUp}
      statusBarTranslucent
    >
      <View style={styles.backdrop}>
        <LinearGradient
          colors={gradients.hero as readonly [string, string, ...string[]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.card}
        >
          <View style={styles.iconRing}>
            <MaterialCommunityIcons name="trophy" size={40} color={colors.warning} />
          </View>
          <Text style={styles.kicker}>LEVEL UP!</Text>
          <Text style={styles.level}>Nível {levelUp?.level}</Text>
          <Text style={styles.rank}>Você alcançou o título de {levelUp?.rank}</Text>
          <View style={styles.footer}>
            <PrimaryButton label="Continuar aventura" onPress={dismissLevelUp} icon="arrow-right" />
          </View>
        </LinearGradient>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(3, 6, 14, 0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 28,
    padding: 28,
    alignItems: 'center',
    gap: 6,
  },
  iconRing: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: 'rgba(7, 10, 18, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  kicker: {
    color: 'rgba(7, 10, 18, 0.7)',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 3,
  },
  level: {
    color: colors.bgDeep,
    fontSize: 38,
    fontWeight: '900',
  },
  rank: {
    color: 'rgba(7, 10, 18, 0.75)',
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 14,
  },
  footer: {
    width: '100%',
  },
});
