import { StyleSheet, Text, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import { colors } from '../theme/game';

interface EmptyStateProps {
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  title: string;
  message: string;
}

/** Estado vazio ilustrado com ícone, título e mensagem. */
export function EmptyState({ icon, title, message }: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <View style={styles.iconWrap}>
        <MaterialCommunityIcons name={icon} size={34} color={colors.primarySoft} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 24,
    gap: 8,
  },
  iconWrap: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: `${colors.primary}1F`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  title: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
  },
  message: {
    color: colors.textMuted,
    fontSize: 13.5,
    textAlign: 'center',
    lineHeight: 20,
  },
});
