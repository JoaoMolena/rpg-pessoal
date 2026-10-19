import { Pressable, StyleSheet, Text, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import { colors } from '../theme/game';
import type { Reward } from '../types';

interface RewardCardProps {
  reward: Reward;
  /** Ouro disponível, para habilitar o resgate e mostrar o que falta. */
  balance: number;
  onPress: (reward: Reward) => void;
  onRedeem: (reward: Reward) => void;
  onDelete: (reward: Reward) => void;
}

/** Cartão de uma recompensa da loja (editar, resgatar e excluir). */
export function RewardCard({ reward, balance, onPress, onRedeem, onDelete }: RewardCardProps) {
  const affordable = balance >= reward.cost;
  const missing = reward.cost - balance;

  return (
    <Pressable
      onPress={() => onPress(reward)}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
    >
      <View style={styles.iconWrap}>
        <MaterialCommunityIcons name="gift-outline" size={20} color={colors.warning} />
      </View>

      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={2}>
          {reward.title}
        </Text>
        {reward.description ? (
          <Text style={styles.description} numberOfLines={1}>
            {reward.description}
          </Text>
        ) : null}

        <View style={styles.metaRow}>
          <View style={[styles.pill, { backgroundColor: `${colors.warning}1F` }]}>
            <MaterialCommunityIcons name="circle-multiple" size={12} color={colors.warning} />
            <Text style={[styles.pillText, { color: colors.warning }]}>
              {reward.cost} de ouro
            </Text>
          </View>
          {!affordable && (
            <View style={[styles.pill, { backgroundColor: `${colors.textMuted}1F` }]}>
              <Text style={[styles.pillText, { color: colors.textMuted }]}>
                faltam {missing}
              </Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.right}>
        <Pressable
          onPress={() => onRedeem(reward)}
          disabled={!affordable}
          accessibilityRole="button"
          accessibilityLabel={`Resgatar ${reward.title}`}
          accessibilityState={{ disabled: !affordable }}
          style={({ pressed }) => [
            styles.redeem,
            !affordable && styles.redeemDisabled,
            pressed && styles.pressed,
          ]}
        >
          <Text style={[styles.redeemText, !affordable && styles.redeemTextDisabled]}>
            Resgatar
          </Text>
        </Pressable>
        <Pressable
          onPress={() => onDelete(reward)}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={`Excluir recompensa ${reward.title}`}
          style={styles.deleteBtn}
        >
          <MaterialCommunityIcons name="trash-can-outline" size={18} color={colors.textMuted} />
        </Pressable>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    gap: 12,
  },
  cardPressed: {
    opacity: 0.85,
    borderColor: colors.warning,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: `${colors.warning}1F`,
  },
  content: {
    flex: 1,
    gap: 6,
  },
  title: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  description: {
    color: colors.textMuted,
    fontSize: 12.5,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  pillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  right: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    alignSelf: 'stretch',
  },
  redeem: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: `${colors.warning}22`,
  },
  redeemDisabled: {
    backgroundColor: colors.surfaceAlt,
  },
  redeemText: {
    color: colors.warning,
    fontSize: 13,
    fontWeight: '800',
  },
  redeemTextDisabled: {
    color: colors.textMuted,
  },
  pressed: {
    opacity: 0.7,
  },
  deleteBtn: {
    padding: 4,
  },
});
