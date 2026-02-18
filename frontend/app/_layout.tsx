import '@/global.css';

import { NAV_THEME } from '@/lib/theme';
import { ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'nativewind';
import { ErrorBoundary } from './error-boundary';
import { useEffect } from 'react';
import { useVaultStore } from '@/lib/store';
import { useRouter } from 'expo-router';
import { isOnboarded } from '@/lib/storage';

function NavigationRoot() {
  const router = useRouter();
  const hydrate = useVaultStore((s) => s.hydrate);
  const isAuthenticated = useVaultStore((s) => s.isAuthenticated);

  useEffect(() => {
    (async () => {
      await hydrate();
      const onboarded = await isOnboarded();

      if (!onboarded) {
        router.replace('/onboarding');
      } else if (!isAuthenticated) {
        router.replace('/login');
      } else {
        router.replace('/unlock');
      }
    })();
  }, []);

  return null;
}

export default function RootLayout() {
  const { colorScheme } = useColorScheme();

  return (
    <ErrorBoundary>
      <ThemeProvider value={NAV_THEME[colorScheme ?? 'light']}>
        <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="onboarding" />
          <Stack.Screen name="register" />
          <Stack.Screen name="login" />
          <Stack.Screen name="unlock" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="entry-detail" options={{ presentation: 'card' }} />
          <Stack.Screen name="entry-add" options={{ presentation: 'modal' }} />
          <Stack.Screen name="entry-edit" options={{ presentation: 'modal' }} />
        </Stack>
        <NavigationRoot />
      </ThemeProvider>
    </ErrorBoundary>
  );
}
