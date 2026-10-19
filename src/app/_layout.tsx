import { StatusBar } from 'expo-status-bar';
import { Stack } from 'expo-router';

import { LevelUpOverlay } from '../components/LevelUpOverlay';
import { GameProvider } from '../context/GameContext';
import { colors } from '../theme/game';

export default function RootLayout() {
  return (
    <GameProvider>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.bgDeep },
          headerShadowVisible: false,
          headerTintColor: colors.text,
          headerTitleStyle: { fontWeight: '800' },
          contentStyle: { backgroundColor: colors.bg },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="nova-missao"
          options={{ presentation: 'modal', title: 'Nova Missão' }}
        />
        <Stack.Screen
          name="editar-perfil"
          options={{ presentation: 'modal', title: 'Editar Perfil' }}
        />
      </Stack>
      <LevelUpOverlay />
    </GameProvider>
  );
}
