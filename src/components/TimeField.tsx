import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { MINUTE_OPTIONS, formatTime, parseTime } from '../utils/time';
import { colors } from '../theme/game';

interface TimeFieldProps {
  /** Horário no formato "HH:MM". */
  value: string;
  onChange: (value: string) => void;
}

const HOURS = Array.from({ length: 24 }, (_, hour) => hour);

/** Seletor de horário simples (chips de hora + minuto), sem dependências nativas. */
export function TimeField({ value, onChange }: TimeFieldProps) {
  const parsed = parseTime(value) ?? { hour: 20, minute: 0 };

  const selectHour = (hour: number) => onChange(formatTime(hour, parsed.minute));
  const selectMinute = (minute: number) => onChange(formatTime(parsed.hour, minute));

  return (
    <View style={styles.container}>
      <Text style={styles.current}>{formatTime(parsed.hour, parsed.minute)}</Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {HOURS.map((hour) => (
          <Pressable
            key={hour}
            onPress={() => selectHour(hour)}
            accessibilityRole="button"
            accessibilityState={{ selected: hour === parsed.hour }}
            style={[styles.chip, hour === parsed.hour && styles.chipActive]}
          >
            <Text style={[styles.chipText, hour === parsed.hour && styles.chipTextActive]}>
              {String(hour).padStart(2, '0')}h
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      <View style={styles.row}>
        {MINUTE_OPTIONS.map((minute) => (
          <Pressable
            key={minute}
            onPress={() => selectMinute(minute)}
            accessibilityRole="button"
            accessibilityState={{ selected: minute === parsed.minute }}
            style={[styles.chip, minute === parsed.minute && styles.chipActive]}
          >
            <Text style={[styles.chipText, minute === parsed.minute && styles.chipTextActive]}>
              {String(minute).padStart(2, '0')}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 10,
  },
  current: {
    color: colors.accent,
    fontSize: 22,
    fontWeight: '900',
  },
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  chip: {
    minWidth: 44,
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipActive: {
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}22`,
  },
  chipText: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '700',
  },
  chipTextActive: {
    color: colors.primarySoft,
  },
});
