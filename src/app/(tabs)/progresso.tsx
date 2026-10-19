import { ScrollView, StyleSheet, Text, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import { EmptyState } from '../../components/EmptyState';
import { StatCard } from '../../components/StatCard';
import { XPBar } from '../../components/XPBar';
import { useGame } from '../../context/GameContext';
import { ACHIEVEMENTS, CATEGORIES, CATEGORY_KEYS, cardShadow, colors } from '../../theme/game';
import type { QuestCategory } from '../../types';
import { formatShortDate } from '../../utils/dates';

export default function ProgressScreen() {
  const { state, levelInfo } = useGame();

  const unlocked = ACHIEVEMENTS.filter((a) => a.check(state));

  // Missões concluídas por categoria.
  const completedByCategory = state.quests
    .filter((q) => q.completed)
    .reduce<Record<string, number>>((acc, q) => {
      acc[q.category] = (acc[q.category] ?? 0) + 1;
      return acc;
    }, {});
  const maxCategoryCount = Math.max(1, ...Object.values(completedByCategory));

  const history = state.quests
    .filter((q) => q.completed && q.completedAt)
    .sort((a, b) => (b.completedAt ?? '').localeCompare(a.completedAt ?? ''))
    .slice(0, 10);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Resumo de nível */}
      <View style={styles.levelCard}>
        <View style={styles.levelTop}>
          <View>
            <Text style={styles.levelLabel}>Nível atual</Text>
            <Text style={styles.levelValue}>{levelInfo.level}</Text>
          </View>
          <View style={styles.rankBadge}>
            <MaterialCommunityIcons name="crown" size={14} color={colors.warning} />
            <Text style={styles.rankText}>{levelInfo.rank}</Text>
          </View>
        </View>
        <XPBar
          progress={levelInfo.levelRange > 0 ? levelInfo.progressIntoLevel / levelInfo.levelRange : 0}
        />
        <Text style={styles.levelCaption}>
          {levelInfo.progressIntoLevel} de {levelInfo.levelRange} XP para o nível {levelInfo.level + 1}
        </Text>
      </View>

      {/* Estatísticas */}
      <View style={styles.statsGrid}>
        <StatCard
          icon="lightning-bolt"
          value={String(state.stats.totalXp)}
          label="XP Total"
          accent={colors.warning}
        />
        <StatCard
          icon="check-decagram"
          value={String(state.stats.completedQuests)}
          label="Missões"
          accent={colors.success}
        />
      </View>
      <View style={styles.statsGrid}>
        <StatCard
          icon="fire"
          value={`${state.stats.currentStreak}d`}
          label="Sequência"
          accent={colors.danger}
        />
        <StatCard
          icon="medal"
          value={`${state.stats.longestStreak}d`}
          label="Recorde"
          accent={colors.primary}
        />
      </View>

      {/* Conquistas */}
      <Text style={styles.sectionTitle}>
        Conquistas ({unlocked.length}/{ACHIEVEMENTS.length})
      </Text>
      <View style={styles.achievementList}>
        {ACHIEVEMENTS.map((achievement) => {
          const isUnlocked = achievement.check(state);
          return (
            <View
              key={achievement.id}
              style={[styles.achievement, !isUnlocked && styles.achievementLocked]}
            >
              <View
                style={[
                  styles.achievementIcon,
                  { backgroundColor: isUnlocked ? `${colors.primary}22` : colors.surfaceAlt },
                ]}
              >
                <MaterialCommunityIcons
                  name={isUnlocked ? achievement.icon : 'lock-outline'}
                  size={20}
                  color={isUnlocked ? colors.primarySoft : colors.textMuted}
                />
              </View>
              <View style={styles.achievementText}>
                <Text style={[styles.achievementTitle, !isUnlocked && styles.textMuted]}>
                  {achievement.title}
                </Text>
                <Text style={styles.achievementDesc}>{achievement.description}</Text>
              </View>
              {isUnlocked && (
                <MaterialCommunityIcons name="check-decagram" size={18} color={colors.success} />
              )}
            </View>
          );
        })}
      </View>

      {/* Progresso por categoria */}
      <Text style={styles.sectionTitle}>Por categoria</Text>
      {Object.keys(completedByCategory).length === 0 ? (
        <EmptyState
          icon="chart-donut"
          title="Sem dados ainda"
          message="Conclua missões para descobrir em que áreas você mais evolui."
        />
      ) : (
        <View style={styles.categoryList}>
          {CATEGORY_KEYS.filter((c) => completedByCategory[c]).map((category: QuestCategory) => {
            const info = CATEGORIES[category];
            const count = completedByCategory[category];
            return (
              <View key={category} style={styles.categoryRow}>
                <View style={styles.categoryHeader}>
                  <View style={styles.categoryLabel}>
                    <MaterialCommunityIcons name={info.icon} size={15} color={info.color} />
                    <Text style={styles.categoryName}>{info.label}</Text>
                  </View>
                  <Text style={styles.categoryCount}>{count}</Text>
                </View>
                <View style={styles.categoryTrack}>
                  <View
                    style={[
                      styles.categoryFill,
                      { width: `${(count / maxCategoryCount) * 100}%`, backgroundColor: info.color },
                    ]}
                  />
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* Histórico recente */}
      <Text style={styles.sectionTitle}>Histórico recente</Text>
      {history.length === 0 ? (
        <EmptyState
          icon="history"
          title="Nada por aqui ainda"
          message="Suas missões concluídas aparecerão neste histórico."
        />
      ) : (
        <View style={styles.historyList}>
          {history.map((quest) => (
            <View key={quest.id} style={styles.historyRow}>
              <MaterialCommunityIcons
                name={CATEGORIES[quest.category].icon}
                size={16}
                color={CATEGORIES[quest.category].color}
              />
              <Text style={styles.historyTitle} numberOfLines={1}>
                {quest.title}
              </Text>
              <Text style={styles.historyDate}>
                {quest.completedAt ? formatShortDate(quest.completedAt) : ''}
              </Text>
              <Text style={styles.historyXp}>+{quest.xpReward}</Text>
            </View>
          ))}
        </View>
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
    paddingBottom: 32,
    gap: 12,
  },
  levelCard: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 20,
    gap: 12,
    ...cardShadow,
  },
  levelTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  levelLabel: {
    color: colors.textMuted,
    fontSize: 12.5,
    fontWeight: '700',
  },
  levelValue: {
    color: colors.text,
    fontSize: 40,
    fontWeight: '900',
  },
  rankBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: `${colors.warning}1A`,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  rankText: {
    color: colors.warning,
    fontSize: 13,
    fontWeight: '800',
  },
  levelCaption: {
    color: colors.textMuted,
    fontSize: 12.5,
    fontWeight: '600',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '800',
    marginTop: 10,
  },
  achievementList: {
    gap: 10,
  },
  achievement: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
  },
  achievementLocked: {
    opacity: 0.65,
  },
  achievementIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  achievementText: {
    flex: 1,
    gap: 2,
  },
  achievementTitle: {
    color: colors.text,
    fontSize: 14.5,
    fontWeight: '800',
  },
  achievementDesc: {
    color: colors.textMuted,
    fontSize: 12.5,
  },
  textMuted: {
    color: colors.textMuted,
  },
  categoryList: {
    gap: 14,
  },
  categoryRow: {
    gap: 6,
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  categoryName: {
    color: colors.text,
    fontSize: 13.5,
    fontWeight: '700',
  },
  categoryCount: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '800',
  },
  categoryTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.surfaceAlt,
    overflow: 'hidden',
  },
  categoryFill: {
    height: '100%',
    borderRadius: 4,
  },
  historyList: {
    gap: 8,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  historyTitle: {
    flex: 1,
    color: colors.text,
    fontSize: 13.5,
    fontWeight: '600',
  },
  historyDate: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  historyXp: {
    color: colors.warning,
    fontSize: 12.5,
    fontWeight: '800',
  },
});
