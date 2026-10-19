import { StatusBar } from 'expo-status-bar';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { ActivityIndicator, Image, StyleSheet, View } from 'react-native';

import splashLogo from '../../assets/splash-icon.png';
import { ConfirmProvider } from '../components/ConfirmDialog';
import { AchievementFeedback } from '../components/AchievementFeedback';
import { CompletionFeedback } from '../components/CompletionFeedback';
import { LevelUpOverlay } from '../components/LevelUpOverlay';
import { GameProvider, useGame } from '../context/GameContext';
import { useNotificationSync } from '../notifications/useNotificationSync';
import { colors } from '../theme/game';

/**
 * A splash nativa desvanece em vez de piscar (o Android 12+ tem animação
 * própria de saída; o fade vale para o iOS).
 */
SplashScreen.setOptions({ duration: 600, fade: true });

/**
 * Tela de carregamento exibida enquanto o progresso salvo é lido.
 * Evita o "flash" do estado inicial ("Herói / 0 XP") antes da hidratação — e
 * usa a mesma imagem e o mesmo fundo da splash nativa, para a passagem de uma
 * para a outra não ter salto de cor nem de logo.
 */
function HydrationSplash() {
  return (
    <View style={styles.splash}>
      <Image source={splashLogo} style={styles.splashLogo} />
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
        <Stack.Screen name="loja" options={{ presentation: 'modal', title: 'Loja' }} />
        <Stack.Screen
          name="nova-recompensa"
          options={{ presentation: 'modal', title: 'Nova Recompensa' }}
        />
      </Stack>
      <AchievementFeedback />
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
    // O mesmo fundo da splash nativa (app.json) e das telas: sem salto de cor.
    backgroundColor: colors.bg,
  },
  splashLogo: {
    width: 200,
    height: 200,
  },
});
