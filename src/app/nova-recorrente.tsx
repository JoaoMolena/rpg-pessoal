import { useEffect, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router, useLocalSearchParams, useNavigation } from 'expo-router';

import { ChipSelector, type ChipOption } from '../components/ChipSelector';
import { useConfirm } from '../components/ConfirmDialog';
import { PrimaryButton } from '../components/PrimaryButton';
import { useGame } from '../context/GameContext';
import { WEEKDAY_LABELS, WEEKDAY_ORDER } from '../domain/recurrence';
import {
  CATEGORIES,
  CATEGORY_KEYS,
  DIFFICULTIES,
  DIFFICULTY_KEYS,
  colors,
} from '../theme/game';
import type { QuestCategory, QuestDifficulty, Recurrence, Weekday } from '../types';

type RecurrenceKind = Recurrence['kind'];

const RECURRENCE_OPTIONS: ChipOption<RecurrenceKind>[] = [
  { value: 'daily', label: 'Diária', color: colors.accent, icon: 'calendar-today' },
  { value: 'weekdays', label: 'Dias da semana', color: colors.primary, icon: 'calendar-week' },
  { value: 'weekly', label: 'Semanal', color: colors.success, icon: 'calendar-check' },
];

/** Linha de chips dos dias da semana (multi ou seleção única). */
function WeekdayChips({
  selected,
  onSelect,
}: {
  selected: Weekday[];
  onSelect: (day: Weekday) => void;
}) {
  return (
    <View style={styles.weekdayRow}>
      {WEEKDAY_ORDER.map((day) => {
        const active = selected.includes(day);
        return (
          <Pressable
            key={day}
            onPress={() => onSelect(day)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            style={[styles.weekdayChip, active && styles.weekdayChipActive]}
          >
            <Text style={[styles.weekdayText, active && styles.weekdayTextActive]}>
              {WEEKDAY_LABELS[day]}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function NewRecurringScreen() {
  const navigation = useNavigation();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { state, addTemplate, updateTemplate, deleteTemplate } = useGame();
  const confirm = useConfirm();

  const editing = useMemo(
    () => (id ? state.templates.find((template) => template.id === id) : undefined),
    [id, state.templates]
  );

  const [title, setTitle] = useState(editing?.title ?? '');
  const [description, setDescription] = useState(editing?.description ?? '');
  const [category, setCategory] = useState<QuestCategory>(editing?.category ?? 'outros');
  const [difficulty, setDifficulty] = useState<QuestDifficulty>(editing?.difficulty ?? 'media');
  const [kind, setKind] = useState<RecurrenceKind>(editing?.recurrence.kind ?? 'daily');
  const [days, setDays] = useState<Weekday[]>(
    editing?.recurrence.kind === 'weekdays' ? editing.recurrence.days : []
  );
  const [weekday, setWeekday] = useState<Weekday>(
    editing?.recurrence.kind === 'weekly' ? editing.recurrence.weekday : 1
  );

  useEffect(() => {
    navigation.setOptions({ title: editing ? 'Editar recorrente' : 'Nova recorrente' });
  }, [navigation, editing]);

  const categoryOptions: ChipOption<QuestCategory>[] = CATEGORY_KEYS.map((key) => ({
    value: key,
    label: CATEGORIES[key].label,
    color: CATEGORIES[key].color,
    icon: CATEGORIES[key].icon,
  }));

  const difficultyOptions: ChipOption<QuestDifficulty>[] = DIFFICULTY_KEYS.map((key) => ({
    value: key,
    label: `${DIFFICULTIES[key].label} · ${DIFFICULTIES[key].xp} XP`,
    color: DIFFICULTIES[key].color,
    icon: DIFFICULTIES[key].icon,
  }));

  const toggleDay = (day: Weekday) =>
    setDays((previous) =>
      previous.includes(day) ? previous.filter((item) => item !== day) : [...previous, day]
    );

  const recurrence: Recurrence =
    kind === 'daily'
      ? { kind: 'daily' }
      : kind === 'weekly'
        ? { kind: 'weekly', weekday }
        : { kind: 'weekdays', days };

  const canSave = title.trim().length > 0 && (kind !== 'weekdays' || days.length > 0);

  const handleSave = () => {
    if (!canSave) return;
    const input = { title, description, category, difficulty, recurrence };
    if (editing) updateTemplate(editing.id, input);
    else addTemplate(input);
    router.back();
  };

  const handleDelete = async () => {
    if (!editing) return;
    const confirmed = await confirm({
      title: 'Excluir recorrente',
      message: `Excluir "${editing.title}"? As missões já geradas continuam no histórico.`,
      confirmLabel: 'Excluir',
      destructive: true,
    });
    if (!confirmed) return;
    deleteTemplate(editing.id);
    router.back();
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.field}>
          <Text style={styles.label}>Título da missão</Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="Ex.: Treinar 30 minutos"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
            maxLength={80}
            autoFocus={!editing}
            returnKeyType="done"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Descrição (opcional)</Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Detalhes, dicas ou lembretes..."
            placeholderTextColor={colors.textMuted}
            style={[styles.input, styles.inputMultiline]}
            maxLength={200}
            multiline
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Categoria</Text>
          <ChipSelector options={categoryOptions} value={category} onChange={setCategory} />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Dificuldade</Text>
          <ChipSelector options={difficultyOptions} value={difficulty} onChange={setDifficulty} />
          <View style={styles.rewardBox}>
            <Text style={styles.rewardText}>
              Recompensa ao concluir: {DIFFICULTIES[difficulty].xp} XP
            </Text>
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Repetição</Text>
          <ChipSelector options={RECURRENCE_OPTIONS} value={kind} onChange={setKind} />

          {kind === 'weekdays' && (
            <WeekdayChips selected={days} onSelect={toggleDay} />
          )}

          {kind === 'weekly' && (
            <WeekdayChips selected={[weekday]} onSelect={setWeekday} />
          )}

          <Text style={styles.hint}>
            As missões são geradas quando você abre o app no dia. Dias não abertos não geram missão.
          </Text>
        </View>

        <PrimaryButton
          label={editing ? 'Salvar alterações' : 'Criar recorrente'}
          icon={editing ? 'content-save-outline' : 'plus'}
          onPress={handleSave}
          disabled={!canSave}
        />
        {!canSave && (
          <Text style={styles.hint}>
            {title.trim().length === 0
              ? 'Preencha o título para salvar.'
              : 'Escolha ao menos um dia da semana.'}
          </Text>
        )}

        {editing && (
          <PrimaryButton
            label="Excluir recorrente"
            icon="trash-can-outline"
            variant="danger"
            onPress={handleDelete}
          />
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
    gap: 20,
  },
  field: {
    gap: 8,
  },
  label: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '700',
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: colors.text,
    fontSize: 15,
  },
  inputMultiline: {
    minHeight: 88,
    textAlignVertical: 'top',
  },
  rewardBox: {
    backgroundColor: `${colors.warning}14`,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignItems: 'center',
  },
  rewardText: {
    color: colors.warning,
    fontSize: 13,
    fontWeight: '800',
  },
  weekdayRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  weekdayChip: {
    minWidth: 44,
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  weekdayChipActive: {
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}22`,
  },
  weekdayText: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '700',
  },
  weekdayTextActive: {
    color: colors.primarySoft,
  },
  hint: {
    color: colors.textMuted,
    fontSize: 12.5,
    lineHeight: 18,
    marginTop: -10,
  },
});
