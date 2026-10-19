import { StyleSheet, Text, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import { cardShadow, colors } from '../theme/game';

interface StatCardProps {
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  value: string;
  label: string;
  accent?: string;
}

/** Cartão compacto de estatística com ícone, valor e rótulo. */
export function StatCard({ icon, value, label, accent = colors.primary }: StatCardProps) {
  return (
    <View style={styles.card}>
      <View style={[styles.iconWrap, { backgroundColor: `${accent}1F` }]}>
        <MaterialCommunityIcons name={icon} size={20} color={accent} />
      </View>
      <Text style={styles.value} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      <Text style={styles.label} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    alignItems: 'center',
    gap: 4,
    ...cardShadow,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  value: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
  },
  label: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
});
