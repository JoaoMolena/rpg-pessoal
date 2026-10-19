import { useEffect, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
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
import { GOLD_PER_XP } from '../domain/economy';
import { colors } from '../theme/game';

/** Atalhos de preço (em ouro) que cobrem de "um cafezinho" a "uma folga". */
const SUGGESTED_COSTS = ['25', '50', '100', '250'];

export default function NewRewardScreen() {
  const navigation = useNavigation();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { rewards, addReward, updateReward, deleteReward } = useGame();
  const confirm = useConfirm();

  const editing = useMemo(
    () => (id ? rewards.find((reward) => reward.id === id) : undefined),
    [id, rewards]
  );

  const [title, setTitle] = useState(editing?.title ?? '');
  const [description, setDescription] = useState(editing?.description ?? '');
  const [cost, setCost] = useState(editing ? String(editing.cost) : '25');

  useEffect(() => {
    navigation.setOptions({ title: editing ? 'Editar Recompensa' : 'Nova Recompensa' });
  }, [navigation, editing]);

  const parsedCost = Number.parseInt(cost, 10);
  const canSave = title.trim().length > 0 && Number.isFinite(parsedCost) && parsedCost > 0;
  const equivalentXp = Number.isFinite(parsedCost) ? parsedCost * GOLD_PER_XP : 0;

  const costOptions: ChipOption<string>[] = SUGGESTED_COSTS.map((value) => ({
    value,
    label: value,
    color: colors.warning,
    icon: 'circle-multiple',
  }));

  const handleCostChange = (text: string) => {
    setCost(text.replace(/\D/g, '').slice(0, 5));
  };

  const handleSave = () => {
    if (!canSave) return;
    const input = { title, description, cost: parsedCost };
    if (editing) updateReward(editing.id, input);
    else addReward(input);
    router.back();
  };

  const handleDelete = async () => {
    if (!editing) return;
    const confirmed = await confirm({
      title: 'Excluir recompensa',
      message: `Excluir "${editing.title}"? Os resgates já feitos continuam no histórico.`,
      confirmLabel: 'Excluir',
      destructive: true,
    });
    if (!confirmed) return;
    deleteReward(editing.id);
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
          <Text style={styles.label}>Nome da recompensa</Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="Ex.: Uma hora de videogame"
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
            placeholder="O que exatamente você vai ganhar?"
            placeholderTextColor={colors.textMuted}
            style={[styles.input, styles.inputMultiline]}
            maxLength={200}
            multiline
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Preço em ouro</Text>
          <TextInput
            value={cost}
            onChangeText={handleCostChange}
            placeholder="25"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
            keyboardType="number-pad"
            maxLength={5}
            returnKeyType="done"
          />
          <ChipSelector options={costOptions} value={cost} onChange={setCost} />
          <View style={styles.rewardBox}>
            <Text style={styles.rewardText}>
              Custa {canSave ? parsedCost : 0} de ouro ≈ {canSave ? equivalentXp : 0} XP
            </Text>
            <Text style={styles.rewardHint}>
              Lembre: cada {GOLD_PER_XP} XP conquistados viram 1 de ouro.
            </Text>
          </View>
        </View>

        <PrimaryButton
          label={editing ? 'Salvar alterações' : 'Criar recompensa'}
          icon={editing ? 'content-save-outline' : 'plus'}
          onPress={handleSave}
          disabled={!canSave}
        />
        {!canSave && <Text style={styles.hint}>Dê um nome e um preço maior que zero.</Text>}

        {editing && (
          <PrimaryButton
            label="Excluir recompensa"
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
    gap: 4,
    alignItems: 'center',
  },
  rewardText: {
    color: colors.warning,
    fontSize: 13,
    fontWeight: '800',
  },
  rewardHint: {
    color: colors.textMuted,
    fontSize: 11.5,
    fontWeight: '600',
  },
  hint: {
    color: colors.textMuted,
    fontSize: 12.5,
    textAlign: 'center',
    marginTop: -10,
  },
});
