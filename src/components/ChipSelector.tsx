import { Pressable, StyleSheet, Text, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import { colors } from '../theme/game';

export interface ChipOption<T extends string> {
  value: T;
  label: string;
  color: string;
  icon?: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
}

interface ChipSelectorProps<T extends string> {
  options: ChipOption<T>[];
  value: T;
  onChange: (value: T) => void;
}

/** Linha de chips selecionáveis (categorias, dificuldades, filtros...). */
export function ChipSelector<T extends string>({ options, value, onChange }: ChipSelectorProps<T>) {
  return (
    <View style={styles.row}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            style={[
              styles.chip,
              { borderColor: selected ? option.color : colors.border },
              selected ? { backgroundColor: `${option.color}22` } : null,
            ]}
          >
            {option.icon && (
              <MaterialCommunityIcons
                name={option.icon}
                size={14}
                color={selected ? option.color : colors.textMuted}
              />
            )}
            <Text style={[styles.label, { color: selected ? option.color : colors.textMuted }]}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1.5,
    backgroundColor: colors.surface,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
  },
});
