import { Pressable, StyleSheet, Text, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';

import { CATEGORIES, DIFFICULTIES, colors } from '../theme/game';
import type { Quest } from '../types';
import { dateKey } from '../utils/dates';

interface QuestCardProps {
  quest: Quest;
  onToggle: (id: string) => void;
  onPress?: (quest: Quest) => void;
  onDelete?: (quest: Quest) => void;
}

/** Cartão de missão com botão de conclusão, categoria, dificuldade e ações. */
export function QuestCard({ quest, onToggle, onPress, onDelete }: QuestCardProps) {
  const category = CATEGORIES[quest.category];
  const difficulty = DIFFICULTIES[quest.difficulty];
  const overdue = !quest.completed && quest.date !== dateKey();

  return (
    <Pressable
      onPress={onPress ? () => onPress(quest) : undefined}
      style={({ pressed }) => [styles.card, pressed && onPress ? styles.cardPressed : null]}
    >
      {/* Botão de conclusão */}
      <Pressable
        onPress={() => onToggle(quest.id)}
        hitSlop={8}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: quest.completed }}
        accessibilityLabel={quest.completed ? `Reabrir missão ${quest.title}` : `Concluir missão ${quest.title}`}
        style={styles.checkWrap}
      >
        {quest.completed ? (
          <LinearGradient
            colors={[DIFFICULTIES[quest.difficulty].color, colors.primary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.check}
          >
            <MaterialCommunityIcons name="check" size={18} color={colors.bgDeep} />
          </LinearGradient>
        ) : (
          <View style={[styles.check, styles.checkEmpty]}>
            <View style={styles.checkDot} />
          </View>
        )}
      </Pressable>

      {/* Conteúdo */}
      <View style={styles.content}>
        <Text style={[styles.title, quest.completed && styles.titleDone]} numberOfLines={2}>
          {quest.title}
        </Text>
        {!!quest.description && (
          <Text style={styles.description} numberOfLines={1}>
            {quest.description}
          </Text>
        )}
        <View style={styles.metaRow}>
          <View style={[styles.pill, { backgroundColor: `${category.color}1F` }]}>
            <MaterialCommunityIcons name={category.icon} size={12} color={category.color} />
            <Text style={[styles.pillText, { color: category.color }]}>{category.label}</Text>
          </View>
          <View style={[styles.pill, { backgroundColor: `${difficulty.color}1F` }]}>
            <MaterialCommunityIcons name={difficulty.icon} size={12} color={difficulty.color} />
            <Text style={[styles.pillText, { color: difficulty.color }]}>{difficulty.label}</Text>
          </View>
          {overdue && (
            <View style={[styles.pill, { backgroundColor: `${colors.danger}1F` }]}>
              <MaterialCommunityIcons name="calendar-clock-outline" size={12} color={colors.danger} />
              <Text style={[styles.pillText, { color: colors.danger }]}>Atrasada</Text>
            </View>
          )}
        </View>
      </View>

      {/* XP e ações */}
      <View style={styles.right}>
        <View style={styles.xpBadge}>
          <MaterialCommunityIcons name="lightning-bolt" size={12} color={colors.warning} />
          <Text style={styles.xpText}>+{quest.xpReward}</Text>
        </View>
        {onDelete && (
          <Pressable
            onPress={() => onDelete(quest)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={`Excluir missão ${quest.title}`}
            style={styles.deleteBtn}
          >
            <MaterialCommunityIcons name="trash-can-outline" size={18} color={colors.textMuted} />
          </Pressable>
        )}
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
    borderColor: colors.primary,
  },
  checkWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  check: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkEmpty: {
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
  },
  checkDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.border,
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
  titleDone: {
    textDecorationLine: 'line-through',
    color: colors.textMuted,
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
  xpBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: `${colors.warning}1A`,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  xpText: {
    color: colors.warning,
    fontSize: 12,
    fontWeight: '800',
  },
  deleteBtn: {
    padding: 4,
  },
});
