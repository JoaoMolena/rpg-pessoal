import { FlatList, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';

import { useConfirm } from '../components/ConfirmDialog';
import { EmptyState } from '../components/EmptyState';
import { PrimaryButton } from '../components/PrimaryButton';
import { TemplateCard } from '../components/TemplateCard';
import { useGame } from '../context/GameContext';
import { colors } from '../theme/game';
import type { QuestTemplate } from '../types';

export default function RecurringScreen() {
  const { templates, setTemplateActive, deleteTemplate } = useGame();
  const confirm = useConfirm();

  const confirmDelete = async (template: QuestTemplate) => {
    const confirmed = await confirm({
      title: 'Excluir recorrente',
      message: `Excluir "${template.title}"? As missões já geradas continuam no histórico.`,
      confirmLabel: 'Excluir',
      destructive: true,
    });
    if (confirmed) deleteTemplate(template.id);
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={templates}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.intro}>
              Modelos que geram missões automaticamente nos dias escolhidos. Pausar para de gerar
              sem apagar o histórico.
            </Text>
            <PrimaryButton
              label="Nova recorrente"
              icon="plus"
              onPress={() => router.push('/nova-recorrente')}
            />
          </View>
        }
        renderItem={({ item }) => (
          <TemplateCard
            template={item}
            onPress={(template) =>
              router.push({ pathname: '/nova-recorrente', params: { id: template.id } })
            }
            onToggleActive={(template, active) => setTemplateActive(template.id, active)}
            onDelete={confirmDelete}
          />
        )}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        ListEmptyComponent={
          <EmptyState
            icon="repeat"
            title="Nenhuma missão recorrente"
            message="Crie uma recorrente para não precisar recriar a mesma missão todos os dias."
          />
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
    gap: 14,
    marginBottom: 18,
  },
  intro: {
    color: colors.textMuted,
    fontSize: 13.5,
    lineHeight: 20,
  },
});
