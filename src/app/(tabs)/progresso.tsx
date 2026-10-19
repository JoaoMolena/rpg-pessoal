import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router } from 'expo-router';

import { EmptyState } from '../../components/EmptyState';
import { StatCard } from '../../components/StatCard';
import { XPBar } from '../../components/XPBar';
import { useGame } from '../../context/GameContext';
import { evaluateAchievements } from '../../domain/achievements';
import { SHIELD_MAX } from '../../domain/shield';
import { nextStreakTier } from '../../domain/streak';
import { CATEGORIES, CATEGORY_KEYS, cardShadow, colors } from '../../theme/game';
import type { Quest, QuestCategory } from '../../types';
import { formatFullDate, formatShortDate } from '../../utils/dates';
import { missionCountLabel } from '../../utils/format';

export default function ProgressScreen() {
  const { state, stats, levelInfo, today } = useGame();

  const achievements = evaluateAchievements(state, today);
  const unlocked = achievements.filter((status) => status.unlocked);
  // Próximo degrau de bônus a partir da sequência que o jogador já tem hoje.
  const nextTier = nextStreakTier(stats.streakForBonus);

  // Histórico derivado do log de conclusões (o XP exibido é o creditado na hora).
  const questById = new Map(state.quests.map((quest) => [quest.id, quest]));
  const history = [...state.completions]
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 10)
    .flatMap((completion) => {
      const quest = questById.get(completion.questId);
      return quest ? [{ completion, quest: quest as Quest }] : [];
    });

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
          value={String(stats.totalXp)}
          label="XP Total"
          accent={colors.warning}
        />
        <StatCard
          icon="check-decagram"
          value={String(stats.completedQuests)}
          label="Missões"
          accent={colors.success}
        />
      </View>
      <View style={styles.statsGrid}>
        <StatCard
          icon="fire"
          value={`${stats.currentStreak}d`}
          label="Sequência"
          accent={colors.danger}
        />
        <StatCard
          icon="medal"
          value={`${stats.longestStreak}d`}
          label="Recorde"
          accent={colors.primary}
        />
      </View>

      {/* Sequência: bônus de XP e escudo */}
      <Text style={styles.sectionTitle}>Sequência</Text>
      <View style={styles.streakCard}>
        <View style={styles.streakTop}>
          <View style={styles.streakIcon}>
            <MaterialCommunityIcons name="fire" size={20} color={colors.danger} />
          </View>
          <View style={styles.streakBody}>
            <Text style={styles.streakTitle}>
              {stats.currentStreak} {stats.currentStreak === 1 ? 'dia' : 'dias'} seguidos
            </Text>
            <Text style={styles.streakDesc}>
              {stats.streakBonusPct > 0
                ? `Constância rendendo +${stats.streakBonusPct}% de XP em cada missão.`
                : 'A partir de 3 dias seguidos, cada missão passa a render +10% de XP.'}
            </Text>
          </View>
        </View>

        {nextTier ? (
          <View style={styles.streakNext}>
            <MaterialCommunityIcons name="trending-up" size={15} color={colors.accent} />
            <Text style={styles.streakNextText}>
              +{nextTier.pct}% de XP ao chegar em {nextTier.minStreak} dias (faltam{' '}
              {nextTier.minStreak - stats.streakForBonus})
            </Text>
          </View>
        ) : (
          <View style={styles.streakNext}>
            <MaterialCommunityIcons name="crown" size={15} color={colors.warning} />
            <Text style={styles.streakNextText}>Degrau máximo de bônus alcançado.</Text>
          </View>
        )}

        <View style={styles.shieldRow}>
          <MaterialCommunityIcons name="shield-check" size={18} color={colors.accent} />
          <Text style={styles.shieldText}>
            {stats.shieldsAvailable} de {SHIELD_MAX} escudos em reserva · {stats.shieldsUsed}{' '}
            {stats.shieldsUsed === 1 ? 'usado' : 'usados'}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Comprar escudo de sequência na loja"
            onPress={() => router.push('/loja')}
            style={({ pressed }) => [styles.shieldLink, pressed && styles.pressed]}
          >
            <Text style={styles.shieldLinkText}>Loja</Text>
          </Pressable>
        </View>
        <Text style={styles.shieldHint}>
          Um dia sem conclusão consome um escudo e mantém a sequência viva.
        </Text>
      </View>

      {/* Conquistas */}
      <Text style={styles.sectionTitle}>
        Conquistas ({unlocked.length}/{achievements.length})
      </Text>
      <View style={styles.achievementList}>
        {achievements.map(({ achievement, unlocked: isUnlocked, unlockedAt }) => (
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
            {isUnlocked && unlockedAt ? (
              <View style={styles.achievementDate}>
                <MaterialCommunityIcons name="check-decagram" size={14} color={colors.success} />
                <Text style={styles.achievementDateText}>{formatFullDate(unlockedAt)}</Text>
              </View>
            ) : (
              <MaterialCommunityIcons name="lock-outline" size={16} color={colors.textMuted} />
            )}
          </View>
        ))}
      </View>

      {/* Atributos por categoria */}
      <Text style={styles.sectionTitle}>Atributos</Text>
      <Text style={styles.sectionHint}>
        Cada categoria evolui por conta própria: o XP das missões daquela área vira um nível de
        atributo.
      </Text>
      <View style={styles.attributeList}>
        {CATEGORY_KEYS.map((category: QuestCategory) => {
          const info = CATEGORIES[category];
          const attribute = stats.attributes[category];
          const progress =
            attribute.levelRange > 0 ? attribute.progressIntoLevel / attribute.levelRange : 0;

          return (
            <View key={category} style={styles.attributeRow}>
              <View style={[styles.attributeIcon, { backgroundColor: `${info.color}22` }]}>
                <MaterialCommunityIcons name={info.icon} size={18} color={info.color} />
              </View>

              <View style={styles.attributeBody}>
                <View style={styles.attributeHeader}>
                  <Text style={styles.attributeName}>{info.label}</Text>
                  <Text style={styles.attributeMeta}>
                    {attribute.xp} XP · {missionCountLabel(attribute.completions)}
                  </Text>
                </View>
                <View style={styles.attributeTrack}>
                  <View
                    style={[
                      styles.attributeFill,
                      { width: `${progress * 100}%`, backgroundColor: info.color },
                    ]}
                  />
                </View>
              </View>

              <View style={styles.attributeLevel}>
                <Text style={[styles.attributeLevelValue, { color: info.color }]}>
                  {attribute.level}
                </Text>
                <Text style={styles.attributeLevelLabel}>NÍVEL</Text>
              </View>
            </View>
          );
        })}
      </View>

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
          {history.map(({ completion, quest }) => (
            <View key={completion.id} style={styles.historyRow}>
              <MaterialCommunityIcons
                name={CATEGORIES[quest.category].icon}
                size={16}
                color={CATEGORIES[quest.category].color}
              />
              <Text style={styles.historyTitle} numberOfLines={1}>
                {quest.title}
              </Text>
              <Text style={styles.historyDate}>{formatShortDate(completion.at)}</Text>
              <Text style={styles.historyXp}>+{completion.xp}</Text>
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
  streakCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    gap: 10,
  },
  streakTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  streakIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: `${colors.danger}1A`,
  },
  streakBody: {
    flex: 1,
    gap: 2,
  },
  streakTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
  },
  streakDesc: {
    color: colors.textMuted,
    fontSize: 12.5,
    lineHeight: 17,
  },
  streakNext: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: `${colors.accent}12`,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  streakNextText: {
    flex: 1,
    color: colors.accent,
    fontSize: 12.5,
    fontWeight: '700',
  },
  shieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  shieldText: {
    flex: 1,
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  shieldLink: {
    backgroundColor: `${colors.primary}22`,
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  shieldLinkText: {
    color: colors.primarySoft,
    fontSize: 12.5,
    fontWeight: '800',
  },
  shieldHint: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 17,
  },
  pressed: {
    opacity: 0.7,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '800',
    marginTop: 10,
  },
  sectionHint: {
    color: colors.textMuted,
    fontSize: 12.5,
    lineHeight: 18,
    marginTop: -6,
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
  achievementDate: {
    alignItems: 'flex-end',
    gap: 2,
  },
  achievementDateText: {
    color: colors.success,
    fontSize: 11,
    fontWeight: '800',
  },
  textMuted: {
    color: colors.textMuted,
  },
  attributeList: {
    gap: 10,
  },
  attributeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  attributeIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  attributeBody: {
    flex: 1,
    gap: 7,
  },
  attributeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  attributeName: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
  },
  attributeMeta: {
    color: colors.textMuted,
    fontSize: 11.5,
    fontWeight: '600',
  },
  attributeTrack: {
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.surfaceAlt,
    overflow: 'hidden',
  },
  attributeFill: {
    height: '100%',
    borderRadius: 4,
  },
  attributeLevel: {
    alignItems: 'center',
    minWidth: 40,
  },
  attributeLevelValue: {
    fontSize: 20,
    fontWeight: '900',
  },
  attributeLevelLabel: {
    color: colors.textMuted,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
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
