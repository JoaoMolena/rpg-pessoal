import { useState } from 'react';
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
import { router } from 'expo-router';

import { useConfirm } from '../components/ConfirmDialog';
import { PrimaryButton } from '../components/PrimaryButton';
import { useGame } from '../context/GameContext';
import { AVATARS, colors } from '../theme/game';

export default function EditProfileScreen() {
  const { state, stats, levelInfo, setPlayer, resetProgress } = useGame();
  const confirm = useConfirm();
  const [name, setName] = useState(state.playerName);
  const [avatar, setAvatar] = useState(state.playerAvatar);

  const handleSave = () => {
    setPlayer(name, avatar);
    router.back();
  };

  const handleReset = async () => {
    const confirmed = await confirm({
      title: 'Zerar progresso',
      message: 'Todo o seu XP, nível, sequência e missões serão perdidos. Essa ação não pode ser desfeita.',
      confirmLabel: 'Zerar tudo',
      destructive: true,
    });
    if (confirmed) {
      resetProgress();
      router.back();
    }
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
        {/* Prévia do herói */}
        <View style={styles.preview}>
          <View style={styles.previewAvatar}>
            <Text style={styles.previewEmoji}>{avatar}</Text>
          </View>
          <Text style={styles.previewName}>{name.trim() || 'Sem nome'}</Text>
          <Text style={styles.previewRank}>
            Nível {levelInfo.level} · {levelInfo.rank} · {stats.totalXp} XP
          </Text>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Nome do herói</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Digite seu nome"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
            maxLength={24}
            returnKeyType="done"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Avatar</Text>
          <View style={styles.avatarGrid}>
            {AVATARS.map((emoji) => {
              const selected = emoji === avatar;
              return (
                <Pressable
                  key={emoji}
                  onPress={() => setAvatar(emoji)}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  style={[styles.avatarOption, selected && styles.avatarOptionSelected]}
                >
                  <Text style={styles.avatarEmoji}>{emoji}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <PrimaryButton label="Salvar" icon="content-save-outline" onPress={handleSave} />

        <View style={styles.divider} />

        <PrimaryButton label="Zerar progresso" icon="restart" variant="danger" onPress={handleReset} />
        <Text style={styles.dangerHint}>
          Apaga todas as missões e estatísticas, reiniciando sua jornada do nível 1.
        </Text>
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
  preview: {
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 24,
  },
  previewAvatar: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: `${colors.primary}1F`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewEmoji: {
    fontSize: 42,
  },
  previewName: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '900',
  },
  previewRank: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '700',
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
  avatarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  avatarOption: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarOptionSelected: {
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}1F`,
  },
  avatarEmoji: {
    fontSize: 26,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginTop: 4,
  },
  dangerHint: {
    color: colors.textMuted,
    fontSize: 12.5,
    textAlign: 'center',
    marginTop: -10,
  },
});
