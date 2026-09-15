import React, { useEffect } from 'react';
import { BackHandler, Platform, StatusBar as NativeStatusBar } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationBar } from 'expo-navigation-bar';
import * as SystemUI from 'expo-system-ui';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from '@expo-google-fonts/inter';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';

const logStartup = (event: string, details: Record<string, unknown> = {}) => {
  if (__DEV__) {
    console.log(`[Fragments][startup] ${event}`, details);
  }
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
void SplashScreen.preventAutoHideAsync().catch((error: unknown) => {
  console.error('[Fragments][startup] splash-screen-setup-failed', error);
});

const queryClient = new QueryClient();

function RootLayoutNav() {
  useEffect(() => {
    logStartup('root-layout-mounted', {
      platform: Platform.OS,
      native: Platform.OS !== 'web',
    });
    if (Platform.OS !== 'android') return undefined;

    // The game owns horizontal swipes. Consume Android's system back action
    // while this single-screen game is mounted so an edge swipe cannot leave
    // the game or navigate to the previous screen.
    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => true,
    );
    return () => subscription.remove();
  }, []);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" options={{ gestureEnabled: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      if (fontError) {
        console.error('[Fragments][startup] font-load-failed', fontError);
      } else {
        logStartup('fonts-loaded');
      }
      void SplashScreen.hideAsync().catch((error: unknown) => {
        console.error('[Fragments][startup] splash-screen-hide-failed', error);
      });
    }
  }, [fontsLoaded, fontError]);

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    void SystemUI.setBackgroundColorAsync('transparent').catch((error: unknown) => {
      console.error('[Fragments][startup] system-ui-background-failed', error);
    });
    try {
      NavigationBar.setStyle('dark');
      NavigationBar.setHidden(true);
    } catch (error) {
      console.error('[Fragments][startup] navigation-bar-style-failed', error);
    }
  }, []);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <NativeStatusBar
        barStyle="light-content"
        backgroundColor="transparent"
        translucent
        hidden={false}
      />
      <NavigationBar style="dark" hidden />
      <ErrorBoundary
        onError={(error, componentStack) => {
          console.error('[Fragments][runtime] react-error-boundary', {
            name: error.name,
            message: error.message,
            stack: error.stack,
            componentStack,
          });
        }}
      >
        <QueryClientProvider client={queryClient}>
          <GestureHandlerRootView>
            <KeyboardProvider>
              <RootLayoutNav />
            </KeyboardProvider>
          </GestureHandlerRootView>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
