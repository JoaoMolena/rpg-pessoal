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
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router, useLocalSearchParams, useNavigation } from 'expo-router';

import { ChipSelector, type ChipOption } from '../components/ChipSelector';
import { PrimaryButton } from '../components/PrimaryButton';
import { useGame } from '../context/GameContext';
import {
  CATEGORIES,
  CATEGORY_KEYS,
  DIFFICULTIES,
  DIFFICULTY_KEYS,
  colors,
} from '../theme/game';
import type { QuestCategory, QuestDifficulty } from '../types';
import { createId } from '../utils/id';

/** Teto de passos por missão (evita listas intermináveis no cartão). */
const MAX_SUBTASKS = 12;

export default function NewMissionScreen() {
  const navigation = useNavigation();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { state, addQuest, updateQuest, deleteQuest } = useGame();

  const editing = useMemo(
    () => (id ? state.quests.find((q) => q.id === id) : undefined),
    [id, state.quests]
  );

  const [title, setTitle] = useState(editing?.title ?? '');
  const [description, setDescription] = useState(editing?.description ?? '');
  const [category, setCategory] = useState<QuestCategory>(editing?.category ?? 'outros');
  const [difficulty, setDifficulty] = useState<QuestDifficulty>(editing?.difficulty ?? 'media');
  // Os passos são editados por título; o `id` local serve só de chave estável.
  const [subtasks, setSubtasks] = useState<{ id: string; title: string }[]>(() =>
    (editing?.subtasks ?? []).map((subtask) => ({ id: subtask.id, title: subtask.title }))
  );

  useEffect(() => {
    navigation.setOptions({ title: editing ? 'Editar Missão' : 'Nova Missão' });
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

  const canSave = title.trim().length > 0;

  const addSubtask = () => setSubtasks((current) => [...current, { id: createId(), title: '' }]);

  const updateSubtask = (id: string, value: string) =>
    setSubtasks((current) =>
      current.map((subtask) => (subtask.id === id ? { ...subtask, title: value } : subtask))
    );

  const removeSubtask = (id: string) =>
    setSubtasks((current) => current.filter((subtask) => subtask.id !== id));

  const handleSave = () => {
    if (!canSave) return;
    const input = {
      title,
      description,
      category,
      difficulty,
      subtasks: subtasks.map((subtask) => subtask.title),
    };
    if (editing) updateQuest(editing.id, input);
    else addQuest(input);
    router.back();
  };

  const handleDelete = () => {
    if (!editing) return;
    deleteQuest(editing.id);
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
            placeholder="Ex.: Estudar por 1 hora"
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
          <Text style={styles.label}>Subtarefas (opcional)</Text>
          <Text style={styles.subHint}>
            Divida missões épicas em passos. A missão só conclui quando todos estiverem prontos.
          </Text>
          {subtasks.map((subtask, index) => (
            <View key={subtask.id} style={styles.subtaskRow}>
              <TextInput
                value={subtask.title}
                onChangeText={(value) => updateSubtask(subtask.id, value)}
                placeholder={`Passo ${index + 1}`}
                placeholderTextColor={colors.textMuted}
                style={[styles.input, styles.subtaskInput]}
                maxLength={80}
                returnKeyType="done"
              />
              <Pressable
                onPress={() => removeSubtask(subtask.id)}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={`Remover ${subtask.title || `passo ${index + 1}`}`}
                style={styles.subtaskRemove}
              >
                <MaterialCommunityIcons
                  name="close-circle-outline"
                  size={22}
                  color={colors.textMuted}
                />
              </Pressable>
            </View>
          ))}
          <PrimaryButton
            label="Adicionar passo"
            icon="plus"
            variant="ghost"
            onPress={addSubtask}
            disabled={subtasks.length >= MAX_SUBTASKS}
          />
          {subtasks.length >= MAX_SUBTASKS && (
            <Text style={styles.hint}>Limite de {MAX_SUBTASKS} passos por missão.</Text>
          )}
        </View>

        <PrimaryButton
          label={editing ? 'Salvar alterações' : 'Criar missão'}
          icon={editing ? 'content-save-outline' : 'plus'}
          onPress={handleSave}
          disabled={!canSave}
        />        {!canSave && <Text style={styles.hint}>Preencha o título para salvar.</Text>}

        {editing && (
          <PrimaryButton label="Excluir missão" icon="trash-can-outline" variant="danger" onPress={handleDelete} />
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
  subHint: {
    color: colors.textMuted,
    fontSize: 12.5,
    lineHeight: 18,
  },
  subtaskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  subtaskInput: {
    flex: 1,
    paddingVertical: 11,
  },
  subtaskRemove: {
    padding: 2,
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
  hint: {
    color: colors.textMuted,
    fontSize: 12.5,
    textAlign: 'center',
    marginTop: -10,
  },
});
