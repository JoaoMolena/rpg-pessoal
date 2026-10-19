import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import { describeRecurrence } from '../domain/recurrence';
import { CATEGORIES, DIFFICULTIES, colors } from '../theme/game';
import type { QuestTemplate } from '../types';

interface TemplateCardProps {
  template: QuestTemplate;
  onPress: (template: QuestTemplate) => void;
  onToggleActive: (template: QuestTemplate, active: boolean) => void;
  onDelete: (template: QuestTemplate) => void;
}

/** Cartão de um modelo de missão recorrente (com pausar e excluir). */
export function TemplateCard({ template, onPress, onToggleActive, onDelete }: TemplateCardProps) {
  const category = CATEGORIES[template.category];
  const difficulty = DIFFICULTIES[template.difficulty];

  return (
    <Pressable
      onPress={() => onPress(template)}
      style={({ pressed }) => [
        styles.card,
        !template.active && styles.cardPaused,
        pressed && styles.cardPressed,
      ]}
    >
      <View style={[styles.iconWrap, { backgroundColor: `${category.color}1F` }]}>
        <MaterialCommunityIcons name={category.icon} size={20} color={category.color} />
      </View>

      <View style={styles.content}>
        <Text style={[styles.title, !template.active && styles.titlePaused]} numberOfLines={2}>
          {template.title}
        </Text>

        <View style={styles.metaRow}>
          <View style={[styles.pill, { backgroundColor: `${difficulty.color}1F` }]}>
            <MaterialCommunityIcons name={difficulty.icon} size={12} color={difficulty.color} />
            <Text style={[styles.pillText, { color: difficulty.color }]}>{difficulty.label}</Text>
          </View>
          <View style={[styles.pill, { backgroundColor: `${colors.primary}1F` }]}>
            <MaterialCommunityIcons name="repeat" size={12} color={colors.primarySoft} />
            <Text style={[styles.pillText, { color: colors.primarySoft }]}>
              {describeRecurrence(template.recurrence)}
            </Text>
          </View>
          {!template.active && (
            <View style={[styles.pill, { backgroundColor: `${colors.warning}1F` }]}>
              <MaterialCommunityIcons name="pause" size={12} color={colors.warning} />
              <Text style={[styles.pillText, { color: colors.warning }]}>Pausada</Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.right}>
        <Switch
          value={template.active}
          onValueChange={(value) => onToggleActive(template, value)}
          trackColor={{ false: colors.border, true: `${colors.primary}88` }}
          thumbColor={template.active ? colors.primary : colors.textMuted}
          accessibilityLabel={template.active ? `Pausar ${template.title}` : `Ativar ${template.title}`}
        />
        <Pressable
          onPress={() => onDelete(template)}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={`Excluir recorrente ${template.title}`}
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
  cardPaused: {
    opacity: 0.7,
  },
  cardPressed: {
    opacity: 0.85,
    borderColor: colors.primary,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
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
  titlePaused: {
    color: colors.textMuted,
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
  deleteBtn: {
    padding: 4,
  },
});
