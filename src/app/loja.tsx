import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';

import { useConfirm } from '../components/ConfirmDialog';
import { EmptyState } from '../components/EmptyState';
import { PrimaryButton } from '../components/PrimaryButton';
import { RewardCard } from '../components/RewardCard';
import { useGame } from '../context/GameContext';
import { SHIELD_COST, SHIELD_MAX } from '../domain/shield';
import { cardShadow, colors, gradients } from '../theme/game';
import type { Reward } from '../types';
import { formatShortDate } from '../utils/dates';

/** Quantos resgates mostrar no histórico (o resto fica guardado no estado). */
const HISTORY_LIMIT = 20;

interface Status {
  kind: 'success' | 'error';
  text: string;
}

export default function ShopScreen() {
  const { rewards, purchases, stats, redeemReward, buyShield, deleteReward } = useGame();
  const confirm = useConfirm();
  const [status, setStatus] = useState<Status | null>(null);

  // Mais baratas primeiro: é o que dá para comprar hoje.
  const sortedRewards = [...rewards].sort((a, b) => a.cost - b.cost);

  const shieldsFull = stats.shieldsAvailable >= SHIELD_MAX;
  const canBuyShield = !shieldsFull && stats.gold >= SHIELD_COST;

  const handleBuyShield = async () => {
    const confirmed = await confirm({
      title: 'Comprar escudo',
      message: `Comprar um escudo de sequência por ${SHIELD_COST} de ouro?`,
      confirmLabel: 'Comprar',
    });
    if (!confirmed) return;

    if (buyShield()) {
      setStatus({ kind: 'success', text: `Escudo comprado (−${SHIELD_COST} de ouro)` });
    } else if (shieldsFull) {
      setStatus({ kind: 'error', text: `Reserva cheia (${SHIELD_MAX} escudos).` });
    } else {
      setStatus({
        kind: 'error',
        text: `Ouro insuficiente. Faltam ${SHIELD_COST - stats.gold}.`,
      });
    }
  };

  const handleRedeem = async (reward: Reward) => {
    const confirmed = await confirm({
      title: 'Resgatar recompensa',
      message: `Resgatar "${reward.title}" por ${reward.cost} de ouro?`,
      confirmLabel: 'Resgatar',
    });
    if (!confirmed) return;

    if (redeemReward(reward)) {
      setStatus({ kind: 'success', text: `Resgatado: ${reward.title} (−${reward.cost} de ouro)` });
    } else {
      setStatus({
        kind: 'error',
        text: `Ouro insuficiente para "${reward.title}". Faltam ${reward.cost - stats.gold}.`,
      });
    }
  };

  const handleDelete = async (reward: Reward) => {
    const confirmed = await confirm({
      title: 'Excluir recompensa',
      message: `Excluir "${reward.title}"? Os resgates já feitos continuam no histórico.`,
      confirmLabel: 'Excluir',
      destructive: true,
    });
    if (confirmed) {
      deleteReward(reward.id);
      setStatus(null);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Saldo */}
      <LinearGradient
        colors={gradients.gold as readonly [string, string, ...string[]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.balanceCard, cardShadow]}
      >
        <View style={styles.balanceTop}>
          <MaterialCommunityIcons name="circle-multiple" size={30} color={colors.bgDeep} />
          <View>
            <Text style={styles.balanceValue}>{stats.gold}</Text>
            <Text style={styles.balanceLabel}>de ouro disponível</Text>
          </View>
        </View>
        <View style={styles.balanceFooter}>
          <Text style={styles.balanceFootText}>Ganhos {stats.goldEarned}</Text>
          <Text style={styles.balanceFootText}>Gastos {stats.goldSpent}</Text>
        </View>
      </LinearGradient>

      <Text style={styles.intro}>
        Cada 5 XP viram 1 de ouro. Crie recompensas com o preço que fizer sentido para você e
        troque o ouro conquistado por elas.
      </Text>

      {status && (
        <View
          style={[
            styles.status,
            status.kind === 'success' ? styles.statusSuccess : styles.statusError,
          ]}
        >
          <MaterialCommunityIcons
            name={status.kind === 'success' ? 'check-circle' : 'alert-circle-outline'}
            size={16}
            color={status.kind === 'success' ? colors.success : colors.danger}
          />
          <Text
            style={[
              styles.statusText,
              { color: status.kind === 'success' ? colors.success : colors.danger },
            ]}
          >
            {status.text}
          </Text>
        </View>
      )}

      <PrimaryButton
        label="Nova recompensa"
        icon="plus"
        onPress={() => router.push('/nova-recompensa')}
      />

      <Text style={styles.sectionTitle}>Escudo de sequência</Text>
      <View style={[styles.shieldCard, cardShadow]}>
        <View style={styles.shieldTop}>
          <View style={styles.shieldIcon}>
            <MaterialCommunityIcons name="shield-check" size={22} color={colors.accent} />
          </View>
          <View style={styles.shieldInfo}>
            <Text style={styles.shieldTitle}>
              {stats.shieldsAvailable} de {SHIELD_MAX} em reserva
            </Text>
            <Text style={styles.shieldDesc}>
              Cobre um dia sem conclusão e mantém a sequência viva. Vale do dia da compra em diante.
            </Text>
          </View>
        </View>
        <View style={styles.shieldFooter}>
          <Text style={styles.shieldMeta}>
            {stats.shieldsOwned} comprados · {stats.shieldsUsed} usados
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: !canBuyShield }}
            accessibilityLabel={`Comprar escudo de sequência por ${SHIELD_COST} de ouro`}
            disabled={!canBuyShield}
            onPress={handleBuyShield}
            style={({ pressed }) => [
              styles.shieldButton,
              !canBuyShield && styles.shieldButtonDisabled,
              pressed && styles.pressed,
            ]}
          >
            <MaterialCommunityIcons name="circle-multiple" size={15} color={colors.bgDeep} />
            <Text style={styles.shieldButtonText}>{SHIELD_COST}</Text>
          </Pressable>
        </View>
        {shieldsFull && (
          <Text style={styles.shieldFootnote}>Reserva cheia — use um escudo antes de comprar outro.</Text>
        )}
      </View>

      <Text style={styles.sectionTitle}>Recompensas</Text>
      {sortedRewards.length === 0 ? (
        <EmptyState
          icon="gift-outline"
          title="Nenhuma recompensa ainda"
          message="Crie recompensas para os seus esforços: um café especial, uma hora de jogo, uma folga..."
        />
      ) : (
        <View style={styles.list}>
          {sortedRewards.map((reward) => (
            <RewardCard
              key={reward.id}
              reward={reward}
              balance={stats.gold}
              onPress={(item) =>
                router.push({ pathname: '/nova-recompensa', params: { id: item.id } })
              }
              onRedeem={handleRedeem}
              onDelete={handleDelete}
            />
          ))}
        </View>
      )}

      {purchases.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Histórico de resgates</Text>
          <View style={styles.historyList}>
            {purchases.slice(0, HISTORY_LIMIT).map((purchase) => (
              <View key={purchase.id} style={styles.historyRow}>
                <MaterialCommunityIcons
                  name={purchase.kind === 'shield' ? 'shield-check' : 'check-circle-outline'}
                  size={16}
                  color={purchase.kind === 'shield' ? colors.accent : colors.success}
                />
                <Text style={styles.historyTitle} numberOfLines={1}>
                  {purchase.title}
                </Text>
                <Text style={styles.historyDate}>{formatShortDate(purchase.at)}</Text>
                <Text style={styles.historyCost}>−{purchase.cost}</Text>
              </View>
            ))}
          </View>
          {purchases.length > HISTORY_LIMIT && (
            <Text style={styles.historyHint}>
              Mostrando os {HISTORY_LIMIT} resgates mais recentes.
            </Text>
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
    gap: 14,
  },
  balanceCard: {
    borderRadius: 24,
    padding: 18,
    gap: 14,
  },
  balanceTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  balanceValue: {
    color: colors.bgDeep,
    fontSize: 30,
    fontWeight: '900',
  },
  balanceLabel: {
    color: 'rgba(7, 10, 18, 0.75)',
    fontSize: 13,
    fontWeight: '700',
  },
  balanceFooter: {
    flexDirection: 'row',
    gap: 16,
  },
  balanceFootText: {
    color: 'rgba(7, 10, 18, 0.7)',
    fontSize: 12.5,
    fontWeight: '800',
  },
  intro: {
    color: colors.textMuted,
    fontSize: 13.5,
    lineHeight: 20,
  },
  shieldCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    gap: 12,
  },
  shieldTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  shieldIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: `${colors.accent}1A`,
  },
  shieldInfo: {
    flex: 1,
    gap: 3,
  },
  shieldTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
  },
  shieldDesc: {
    color: colors.textMuted,
    fontSize: 12.5,
    lineHeight: 17,
  },
  shieldFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  shieldMeta: {
    color: colors.textMuted,
    fontSize: 12.5,
    fontWeight: '700',
  },
  shieldButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.warning,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  shieldButtonDisabled: {
    opacity: 0.4,
  },
  shieldButtonText: {
    color: colors.bgDeep,
    fontSize: 14,
    fontWeight: '900',
  },
  shieldFootnote: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 17,
  },
  pressed: {
    opacity: 0.7,
  },
  status: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  statusSuccess: {
    backgroundColor: `${colors.success}14`,
    borderColor: `${colors.success}55`,
  },
  statusError: {
    backgroundColor: `${colors.danger}14`,
    borderColor: `${colors.danger}55`,
  },
  statusText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '800',
    marginTop: 6,
  },
  list: {
    gap: 10,
  },
  historyList: {
    gap: 8,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  historyTitle: {
    flex: 1,
    color: colors.text,
    fontSize: 13.5,
    fontWeight: '700',
  },
  historyDate: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
  },
  historyCost: {
    color: colors.warning,
    fontSize: 13,
    fontWeight: '800',
    minWidth: 40,
    textAlign: 'right',
  },
  historyHint: {
    color: colors.textMuted,
    fontSize: 12,
    textAlign: 'center',
  },
});
