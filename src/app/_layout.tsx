import { StatusBar } from 'expo-status-bar';
import { Stack } from 'expo-router';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { ConfirmProvider } from '../components/ConfirmDialog';
import { CompletionFeedback } from '../components/CompletionFeedback';
import { LevelUpOverlay } from '../components/LevelUpOverlay';
import { GameProvider, useGame } from '../context/GameContext';
import { useNotificationSync } from '../notifications/useNotificationSync';
import { colors } from '../theme/game';

/**
 * Tela de carregamento exibida enquanto o progresso salvo é lido.
 * Evita o "flash" do estado inicial ("Herói / 0 XP") antes da hidratação.
 */
function HydrationSplash() {
  return (
    <View style={styles.splash}>
      <Text style={styles.splashEmoji}>⚔️</Text>
      <ActivityIndicator color={colors.primary} />
    </View>
  );
}

function AppShell() {
  const { hydrated } = useGame();
  useNotificationSync();

  if (!hydrated) return <HydrationSplash />;

  return (
    <>
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
        <Stack.Screen
          name="recorrentes"
          options={{ presentation: 'modal', title: 'Missões recorrentes' }}
        />
        <Stack.Screen
          name="nova-recorrente"
          options={{ presentation: 'modal', title: 'Nova recorrente' }}
        />
        <Stack.Screen
          name="lembretes"
          options={{ presentation: 'modal', title: 'Lembretes' }}
        />
        <Stack.Screen
          name="backup"
          options={{ presentation: 'modal', title: 'Backup dos dados' }}
        />
      </Stack>
      <CompletionFeedback />
      <LevelUpOverlay />
    </>
  );
}

export default function RootLayout() {
  return (
    <GameProvider>
      <ConfirmProvider>
        <AppShell />
      </ConfirmProvider>
    </GameProvider>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 18,
    backgroundColor: colors.bgDeep,
  },
  splashEmoji: {
    fontSize: 48,
  },
});
