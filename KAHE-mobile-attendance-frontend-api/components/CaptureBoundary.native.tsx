import { useEffect, useState, type ReactNode } from 'react';
import { AppState, Platform, Pressable, Text, View } from 'react-native';
import * as ScreenCapture from 'expo-screen-capture';
import { colors } from '../theme';
import { enableScreenProtection, protectionKey } from '../lib/screen-protection';

export function CaptureBoundary({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [active, setActive] = useState(AppState.currentState === 'active');

  useEffect(() => {
    let disposed = false;
    setReady(false);
    setFailed(false);
    const enable = async () => {
      try {
        await enableScreenProtection(ScreenCapture, Platform.OS);
        if (!disposed) setReady(true);
        else await ScreenCapture.allowScreenCaptureAsync(protectionKey);
      } catch {
        if (!disposed) setFailed(true);
      }
    };
    void enable();
    const subscription = AppState.addEventListener('change', state => setActive(state === 'active'));
    return () => {
      disposed = true;
      subscription.remove();
      void ScreenCapture.allowScreenCaptureAsync(protectionKey).catch(() => {});
      if (Platform.OS === 'ios') void ScreenCapture.disableAppSwitcherProtectionAsync().catch(() => {});
    };
  }, [attempt]);

  if (!ready) {
    return <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', padding: 28, gap: 18 }}>
      <Text style={{ color: colors.text, fontSize: 20, fontWeight: '700', textAlign: 'center' }}>KAHE Attendance</Text>
      <Text style={{ color: colors.textMuted, textAlign: 'center' }}>{failed ? 'Screen protection could not start. Reopen the app or try again.' : 'Protecting your attendance workspace...'}</Text>
      {failed && <Pressable accessibilityRole="button" onPress={() => setAttempt(value => value + 1)} style={{ padding: 16, backgroundColor: colors.primary, borderRadius: 12 }}><Text style={{ color: '#fff', fontWeight: '700' }}>Try again</Text></Pressable>}
    </View>;
  }
  return <View style={{ flex: 1 }}>
    {children}
    {!active && <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ position: 'absolute', inset: 0, backgroundColor: colors.bg }} />}
  </View>;
}
