import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';

import { EmptyState } from '../../components/EmptyState';
import { QuestCard } from '../../components/QuestCard';
import { StatCard } from '../../components/StatCard';
import { XPBar } from '../../components/XPBar';
import { useConfirm } from '../../components/ConfirmDialog';
import { useGame } from '../../context/GameContext';
import { cardShadow, colors, gradients } from '../../theme/game';
import { getGreeting, getLongDate } from '../../utils/dates';

export default function DashboardScreen() {
  const {
    state,
    stats,
    levelInfo,
    todayQuests,
    overdueQuests,
    toggleQuest,
    deleteQuest,
  } = useGame();
  const confirm = useConfirm();

  const completedToday = todayQuests.filter((q) => q.completed).length;
  const pendingToday = todayQuests.filter((q) => !q.completed);

  const openEditor = (id: string) =>
    router.push({ pathname: '/nova-missao', params: { id } });

  const confirmDelete = async (title: string, id: string) => {
    const confirmed = await confirm({
      title: 'Excluir missão',
      message: `Deseja excluir "${title}"?`,
      confirmLabel: 'Excluir',
      destructive: true,
    });
    if (confirmed) deleteQuest(id);
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Saudação */}
        <Text style={styles.greeting}>{getGreeting()},</Text>
        <Text style={styles.longDate}>{getLongDate()}</Text>

        {/* Cartão do jogador */}
        <LinearGradient
          colors={gradients.hero as readonly [string, string, ...string[]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.playerCard, cardShadow]}
        >
          <View style={styles.playerTop}>
            <Pressable
              onPress={() => router.push('/editar-perfil')}
              accessibilityRole="button"
              accessibilityLabel="Editar perfil"
              style={styles.avatar}
            >
              <Text style={styles.avatarEmoji}>{state.playerAvatar}</Text>
            </Pressable>
            <View style={styles.playerInfo}>
              <Text style={styles.playerName} numberOfLines={1}>
                {state.playerName}
              </Text>
              <Text style={styles.playerRank}>
                Nível {levelInfo.level} · {levelInfo.rank}
              </Text>
            </View>
            <Pressable
              onPress={() => router.push('/loja')}
              accessibilityRole="button"
              accessibilityLabel={`Abrir loja. ${stats.gold} de ouro disponível`}
              style={({ pressed }) => [styles.hudPill, pressed && styles.hudPillPressed]}
            >
              <MaterialCommunityIcons name="circle-multiple" size={16} color={colors.bgDeep} />
              <Text style={styles.hudPillText}>{stats.gold}</Text>
            </Pressable>
            <View style={styles.hudPill}>
              <MaterialCommunityIcons name="fire" size={16} color={colors.bgDeep} />
              <Text style={styles.hudPillText}>{stats.currentStreak}</Text>
            </View>
          </View>

          <View style={styles.xpBlock}>
            <XPBar
              progress={levelInfo.levelRange > 0 ? levelInfo.progressIntoLevel / levelInfo.levelRange : 0}
              colorsPair={['rgba(255,255,255,0.95)', 'rgba(255,255,255,0.7)'] as const}
              trackColor="rgba(7, 10, 18, 0.3)"
              height={10}
            />
            <View style={styles.xpLabels}>
              <Text style={styles.xpText}>
                {levelInfo.progressIntoLevel} / {levelInfo.levelRange} XP
              </Text>
              <Text style={styles.xpText}>Faltam {Math.max(0, levelInfo.nextLevelXp - stats.totalXp)} XP</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Estatísticas rápidas */}
        <View style={styles.statsRow}>
          <StatCard
            icon="lightning-bolt"
            value={String(stats.totalXp)}
            label="XP Total"
            accent={colors.warning}
          />
          <StatCard
            icon="check-decagram"
            value={String(stats.completedQuests)}
            label="Concluídas"
            accent={colors.success}
          />
          <StatCard
            icon="lightning-bolt-outline"
            value={String(stats.xpToday)}
            label="XP Hoje"
            accent={colors.accent}
          />
        </View>

        {/* Missões pendentes de hoje */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Missões de hoje</Text>
          {todayQuests.length > 0 && (
            <Text style={styles.sectionCaption}>
              {completedToday}/{todayQuests.length} concluídas
            </Text>
          )}
        </View>

        {pendingToday.length === 0 ? (
          <EmptyState
            icon="party-popper"
            title="Todas as missões de hoje concluídas!"
            message="Descanse, guerreiro. Amanhã novas missões o aguardarão."
          />
        ) : (
          <View style={styles.list}>
            {pendingToday.map((quest) => (
              <QuestCard
                key={quest.id}
                quest={quest}
                onToggle={toggleQuest}
                onPress={(q) => openEditor(q.id)}
                onDelete={(q) => confirmDelete(q.title, q.id)}
              />
            ))}
          </View>
        )}

        {/* Missões atrasadas */}
        {overdueQuests.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Missões atrasadas</Text>
              <Text style={[styles.sectionCaption, { color: colors.danger }]}>
                Não deixe para depois!
              </Text>
            </View>
            <View style={styles.list}>
              {overdueQuests.map((quest) => (
                <QuestCard
                  key={quest.id}
                  quest={quest}
                  onToggle={toggleQuest}
                  onPress={(q) => openEditor(q.id)}
                  onDelete={(q) => confirmDelete(q.title, q.id)}
                />
              ))}
            </View>
          </>
        )}
      </ScrollView>

      {/* Botão flutuante: nova missão */}
      <Pressable
        onPress={() => router.push('/nova-missao')}
        accessibilityRole="button"
        accessibilityLabel="Criar nova missão"
        style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
      >
        <LinearGradient
          colors={gradients.hero as readonly [string, string, ...string[]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.fabInner}
        >
          <MaterialCommunityIcons name="plus" size={28} color={colors.bgDeep} />
        </LinearGradient>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    padding: 20,
    paddingBottom: 96,
    gap: 12,
  },
  greeting: {
    color: colors.textMuted,
    fontSize: 15,
    fontWeight: '600',
  },
  longDate: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '900',
    marginBottom: 6,
  },
  playerCard: {
    borderRadius: 24,
    padding: 18,
    gap: 16,
  },
  playerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(7, 10, 18, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarEmoji: {
    fontSize: 26,
  },
  playerInfo: {
    flex: 1,
    gap: 2,
  },
  playerName: {
    color: colors.bgDeep,
    fontSize: 20,
    fontWeight: '900',
  },
  playerRank: {
    color: 'rgba(7, 10, 18, 0.75)',
    fontSize: 13,
    fontWeight: '700',
  },
  hudPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(7, 10, 18, 0.3)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  hudPillPressed: {
    opacity: 0.7,
  },
  hudPillText: {
    color: colors.bgDeep,
    fontSize: 14,
    fontWeight: '900',
  },
  xpBlock: {
    gap: 8,
  },
  xpLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  xpText: {
    color: 'rgba(7, 10, 18, 0.8)',
    fontSize: 12,
    fontWeight: '800',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  sectionHeader: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '800',
  },
  sectionCaption: {
    color: colors.textMuted,
    fontSize: 12.5,
    fontWeight: '700',
  },
  list: {
    gap: 10,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    borderRadius: 30,
    ...cardShadow,
  },
  fabPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.96 }],
  },
  fabInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
