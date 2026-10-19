import { Pressable, StyleSheet, Text } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';

import { colors, gradients } from '../theme/game';

interface PrimaryButtonProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'danger' | 'ghost';
  icon?: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
}

/** Botão principal com gradiente (ou variantes perigo/fantasma). */
export function PrimaryButton({
  label,
  onPress,
  disabled = false,
  variant = 'primary',
  icon,
}: PrimaryButtonProps) {
  const content = (
    <>
      {icon && (
        <MaterialCommunityIcons
          name={icon}
          size={18}
          color={variant === 'ghost' ? colors.text : colors.bgDeep}
        />
      )}
      <Text style={[styles.label, variant === 'ghost' ? styles.labelGhost : styles.labelFilled]}>
        {label}
      </Text>
    </>
  );

  if (variant === 'ghost') {
    return (
      <Pressable
        onPress={onPress}
        disabled={disabled}
        accessibilityRole="button"
        style={({ pressed }) => [styles.ghost, pressed && styles.pressed, disabled && styles.disabled]}
      >
        {content}
      </Pressable>
    );
  }

  const pair = variant === 'danger' ? [colors.danger, '#DC2626'] : gradients.hero;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      style={({ pressed }) => [pressed && styles.pressed, disabled && styles.disabled]}
    >
      <LinearGradient
        colors={pair as readonly [string, string, ...string[]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.button}
      >
        {content}
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 16,
  },
  ghost: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  pressed: {
    opacity: 0.85,
  },
  disabled: {
    opacity: 0.45,
  },
  label: {
    fontSize: 15,
    fontWeight: '800',
  },
  labelFilled: {
    color: colors.bgDeep,
  },
  labelGhost: {
    color: colors.text,
  },
});
