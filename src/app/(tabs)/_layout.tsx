import { Tabs } from 'expo-router';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import { colors } from '../../theme/game';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.bgDeep },
        headerShadowVisible: false,
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: '800' },
        tabBarStyle: {
          backgroundColor: colors.bgDeep,
          borderTopColor: colors.border,
          borderTopWidth: 1,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: { fontWeight: '700' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Início',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="shield-home" size={size} color={color as string} />
          ),
        }}
      />
      <Tabs.Screen
        name="missoes"
        options={{
          title: 'Missões',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons
              name="clipboard-check-outline"
              size={size}
              color={color as string}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="progresso"
        options={{
          title: 'Progresso',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="chart-line" size={size} color={color as string} />
          ),
        }}
      />
    </Tabs>
  );
}
