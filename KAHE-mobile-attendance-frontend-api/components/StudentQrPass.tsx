import { useEffect, useState } from 'react';
import { ActivityIndicator, AppState, Image, Text, useWindowDimensions, View } from 'react-native';
import { getStudentQr, type AuthSession, type StudentQr } from '../lib/api';
import { Action } from './ui';
import { styles } from '../styles';
import { colors, getErrorMessage } from '../theme';

export function StudentQrPass({ auth, sessionId }: { auth: AuthSession; sessionId: string }) {
  const [data, setData] = useState<StudentQr | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [revision, setRevision] = useState(0);
  const size = Math.max(100, Math.min(260, useWindowDimensions().width - 80));
  useEffect(() => {
    let active = true, busy = false;
    const refresh = async () => {
      if (busy) return;
      busy = true; setLoading(true);
      try {
        const next = await getStudentQr(auth.token, sessionId);
        if (active) { setData(next); setError(''); }
      } catch (err) { if (active) { setData(null); setError(getErrorMessage(err)); } }
      finally { busy = false; if (active) setLoading(false); }
    };
    setData(null); void refresh();
    const timer = setInterval(() => { if (AppState.currentState === 'active') void refresh(); }, 15000);
    const clock = setInterval(() => setNow(Date.now()), 1000);
    const subscription = AppState.addEventListener('change', state => { if (state === 'active') void refresh(); });
    return () => { active = false; clearInterval(timer); clearInterval(clock); subscription.remove(); };
  }, [auth.token, sessionId, revision]);
  const valid = data && data.expiresAt * 1000 > now;
  return <View style={{ alignItems: 'center', width: '100%', gap: 14 }}>
    <Text style={styles.screenLead}>Show this QR to your professor. Attendance is marked after their scan is accepted.</Text>
    {valid ? <Image accessibilityLabel="Your attendance QR pass" source={{ uri: data.dataUrl }} style={{ width: size, height: size, backgroundColor: '#fff' }} resizeMode="contain" onError={() => { setData(null); setError('The QR image could not load. Tap Retry.'); }} />
      : <View style={{ height: size, justifyContent: 'center' }}>{loading ? <ActivityIndicator color={colors.primary} /> : <Text style={styles.loadingText}>{error ? 'QR unavailable' : 'Refreshing your QR...'}</Text>}</View>}
    {valid && <Text style={styles.qrExpText}>Refreshes automatically</Text>}
    {!!error && <Text accessibilityRole="alert" style={styles.errorBannerText}>{error}</Text>}
    <Action kind="secondary" disabled={loading} onPress={() => setRevision(value => value + 1)}><Text style={styles.actionSecondaryText}>{error ? 'Retry' : 'Refresh QR'}</Text></Action>
  </View>;
}
