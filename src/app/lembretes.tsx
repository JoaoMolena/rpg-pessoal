import { useState } from 'react';
import { ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import { TimeField } from '../components/TimeField';
import { useGame } from '../context/GameContext';
import { hasPermission, requestPermission } from '../notifications/notifications';
import { colors } from '../theme/game';
import type { NotificationSettings } from '../types';

interface ReminderRowProps {
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  title: string;
  description: string;
  enabled: boolean;
  time: string;
  onToggle: (enabled: boolean) => void;
  onChangeTime: (time: string) => void;
}

function ReminderRow({
  icon,
  title,
  description,
  enabled,
  time,
  onToggle,
  onChangeTime,
}: ReminderRowProps) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardTitleRow}>
          <View style={styles.cardIcon}>
            <MaterialCommunityIcons name={icon} size={18} color={colors.primarySoft} />
          </View>
          <View style={styles.cardTexts}>
            <Text style={styles.cardTitle}>{title}</Text>
            <Text style={styles.cardDescription}>{description}</Text>
          </View>
        </View>
        <Switch
          value={enabled}
          onValueChange={onToggle}
          trackColor={{ false: colors.border, true: `${colors.primary}88` }}
          thumbColor={enabled ? colors.primary : colors.textMuted}
          accessibilityLabel={title}
        />
      </View>

      {enabled && <TimeField value={time} onChange={onChangeTime} />}
    </View>
  );
}

export default function RemindersScreen() {
  const { state, stats, setNotifications } = useGame();
  const settings = state.notifications;
  const [permissionDenied, setPermissionDenied] = useState(false);

  const update = async (patch: Partial<NotificationSettings>) => {
    const next = { ...settings, ...patch };
    const turningOn = patch.dailyEnabled === true || patch.streakEnabled === true;

    if (turningOn && !(await hasPermission())) {
      const granted = await requestPermission();
      if (!granted) {
        setPermissionDenied(true);
        return;
      }
    }

    setPermissionDenied(false);
    setNotifications(next);
  };

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.intro}>
        Os lembretes são agendados no próprio aparelho, sem internet. A permissão de notificações é
        pedida quando você ativa a primeira opção.
      </Text>

      {permissionDenied && (
        <View style={styles.warning}>
          <MaterialCommunityIcons name="bell-off-outline" size={18} color={colors.warning} />
          <Text style={styles.warningText}>
            Permissão de notificações negada. Ative nas configurações do sistema para receber os
            lembretes.
          </Text>
        </View>
      )}

      <ReminderRow
        icon="bell-ring-outline"
        title="Lembrete diário"
        description="Avisa todos os dias no horário escolhido que você tem missões esperando."
        enabled={settings.dailyEnabled}
        time={settings.dailyTime}
        onToggle={(enabled) => update({ dailyEnabled: enabled })}
        onChangeTime={(time) => setNotifications({ ...settings, dailyTime: time })}
      />

      <ReminderRow
        icon="fire"
        title="Aviso de sequência em risco"
        description="No fim do dia, se você ainda não concluiu nada e tem sequência ativa."
        enabled={settings.streakEnabled}
        time={settings.streakTime}
        onToggle={(enabled) => update({ streakEnabled: enabled })}
        onChangeTime={(time) => setNotifications({ ...settings, streakTime: time })}
      />

      <Text style={styles.hint}>
        Sequência atual: {stats.currentStreak} {stats.currentStreak === 1 ? 'dia' : 'dias'}
        {stats.xpToday > 0 ? ' · você já concluiu algo hoje ✅' : ''}
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 20,
    paddingBottom: 40,
    gap: 16,
  },
  intro: {
    color: colors.textMuted,
    fontSize: 13.5,
    lineHeight: 20,
  },
  warning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: `${colors.warning}14`,
    borderRadius: 14,
    padding: 14,
  },
  warningText: {
    flex: 1,
    color: colors.warning,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '600',
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 14,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  cardTitleRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cardIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: `${colors.primary}1F`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTexts: {
    flex: 1,
    gap: 2,
  },
  cardTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
  },
  cardDescription: {
    color: colors.textMuted,
    fontSize: 12.5,
    lineHeight: 17,
  },
  hint: {
    color: colors.textMuted,
    fontSize: 12.5,
    lineHeight: 18,
    textAlign: 'center',
  },
});
