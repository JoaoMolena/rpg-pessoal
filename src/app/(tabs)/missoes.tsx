import { useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';

import { ChipSelector, type ChipOption } from '../../components/ChipSelector';
import { useConfirm } from '../../components/ConfirmDialog';
import { EmptyState } from '../../components/EmptyState';
import { PrimaryButton } from '../../components/PrimaryButton';
import { QuestCard } from '../../components/QuestCard';
import { useGame } from '../../context/GameContext';
import { colors } from '../../theme/game';
import type { Quest } from '../../types';
import { missionCountLabel } from '../../utils/format';

type Filter = 'hoje' | 'pendentes' | 'concluidas' | 'todas';

const FILTERS: ChipOption<Filter>[] = [
  { value: 'hoje', label: 'Hoje', color: colors.primary, icon: 'calendar-today' },
  { value: 'pendentes', label: 'Pendentes', color: colors.warning, icon: 'clock-outline' },
  { value: 'concluidas', label: 'Concluídas', color: colors.success, icon: 'check-circle-outline' },
  { value: 'todas', label: 'Todas', color: colors.accent, icon: 'format-list-bulleted' },
];

const EMPTY_MESSAGES: Record<Filter, { title: string; message: string }> = {
  hoje: {
    title: 'Nenhuma missão hoje ainda',
    message: 'Crie sua primeira missão do dia e comece a ganhar XP.',
  },
  pendentes: {
    title: 'Nada pendente',
    message: 'Você está em dia com todas as suas missões. Parabéns!',
  },
  concluidas: {
    title: 'Nenhuma missão concluída',
    message: 'Complete missões para vê-las aqui e acumular XP.',
  },
  todas: {
    title: 'Sua lista está vazia',
    message: 'Toque em "Nova missão" para começar sua jornada.',
  },
};

export default function MissionsScreen() {
  const { state, todayQuests, toggleQuest, deleteQuest, addQuest } = useGame();
  const confirm = useConfirm();
  const [filter, setFilter] = useState<Filter>('hoje');

  const data = useMemo(() => {
    const isPending = (q: Quest) => !q.completed;
    switch (filter) {
      case 'hoje':
        return todayQuests.filter(isPending);
      case 'pendentes':
        return state.quests.filter(isPending);
      case 'concluidas':
        return state.quests
          .filter((q) => q.completed)
          .sort((a, b) => (b.completedAt ?? '').localeCompare(a.completedAt ?? ''));
      case 'todas':
        return state.quests;
    }
  }, [filter, state.quests, todayQuests]);

  const confirmDelete = async (title: string, id: string) => {
    const confirmed = await confirm({
      title: 'Excluir missão',
      message: `Deseja excluir "${title}"?`,
      confirmLabel: 'Excluir',
      destructive: true,
    });
    if (confirmed) deleteQuest(id);
  };

  // Dica rápida: cria uma missão de exemplo instantaneamente quando a lista está vazia.
  const addQuickQuest = () => {
    addQuest({ title: 'Nova missão', category: 'outros', difficulty: 'facil' });
  };

  const empty = EMPTY_MESSAGES[filter];

  return (
    <View style={styles.container}>
      <FlatList
        data={data}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={styles.header}>
            <ChipSelector options={FILTERS} value={filter} onChange={setFilter} />
            <Text style={styles.summary}>
              {missionCountLabel(data.length)} ·{' '}
              {data.reduce((sum, q) => sum + q.xpReward, 0)} XP em jogo
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <QuestCard
            quest={item}
            onToggle={toggleQuest}
            onPress={(q) => router.push({ pathname: '/nova-missao', params: { id: q.id } })}
            onDelete={(q) => confirmDelete(q.title, q.id)}
          />
        )}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        ListEmptyComponent={
          <View>
            <EmptyState icon="clipboard-text-outline" title={empty.title} message={empty.message} />
            <PrimaryButton label="Criar missão" icon="plus" onPress={() => router.push('/nova-missao')} />
            <View style={{ height: 10 }} />
            <PrimaryButton label="Missão rápida (+10 XP)" icon="flash" variant="ghost" onPress={addQuickQuest} />
          </View>
        }
      />
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
    paddingBottom: 32,
  },
  header: {
    gap: 12,
    marginBottom: 16,
  },
  summary: {
    color: colors.textMuted,
    fontSize: 12.5,
    fontWeight: '700',
  },
});
