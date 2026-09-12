import { useEffect, useState } from 'react';
import { AppState, Pressable, ScrollView, Text, View } from 'react-native';
import { getSlotContext, type AuthSession, type MobileTimetableSlot, type SessionContext } from '../lib/api';
import { AttendanceBadge, sessionName } from '../components/SessionCard';
import { StudentQrPass } from '../components/StudentQrPass';
import { Action, Back } from '../components/ui';
import { UniversalScanner } from './UniversalScanner';
import { styles } from '../styles';
import { colors, getErrorMessage } from '../theme';

export function StudentSession({ auth, slot, onBack }: { auth: AuthSession; slot: MobileTimetableSlot; onBack: () => void }) {
  const [tab, setTab] = useState<'scan' | 'pass'>('scan');
  const [context, setContext] = useState<SessionContext | null>(null);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true, busy = false;
    const refresh = async () => {
      if (busy) return; busy = true;
      try { const next = await getSlotContext(auth.token, slot.id); if (active) { setContext(next); setError(''); } }
      catch (err) { if (active) setError(getErrorMessage(err)); }
      finally { busy = false; }
    };
    void refresh();
    const timer = setInterval(() => { if (AppState.currentState === 'active') void refresh(); }, 5000);
    const subscription = AppState.addEventListener('change', state => { if (state === 'active') void refresh(); });
    return () => { active = false; clearInterval(timer); subscription.remove(); };
  }, [auth.token, slot.id, revision]);
  const marked = context?.attendanceStatus === 'MARKED';
  return <View style={{ flex: 1 }}>
    <View style={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 }}>
      <Back onPress={onBack} />
      <Text numberOfLines={2} style={{ color: colors.text, fontSize: 18, fontWeight: '700', marginTop: 8 }}>{sessionName(slot)}</Text>
      <AttendanceBadge status={context?.attendanceStatus} />
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
        {(['scan', 'pass'] as const).map(value => <Pressable accessibilityRole="tab" accessibilityState={{ selected: value === tab }} key={value} onPress={() => setTab(value)} style={[styles.actionSecondary, { flex: 1, backgroundColor: tab === value ? colors.primary : colors.cardSubtle }]}><Text style={{ color: tab === value ? '#fff' : colors.text, textAlign: 'center', fontWeight: '700' }}>{value === 'scan' ? 'Scan classroom QR' : 'My QR'}</Text></Pressable>)}
      </View>
    </View>
    {error ? <ScrollView contentContainerStyle={styles.screenContent}><Text accessibilityRole="alert" style={styles.errorBannerText}>{error}</Text><Action onPress={() => setRevision(value => value + 1)}><Text style={styles.actionPrimaryText}>Retry connection</Text></Action></ScrollView>
      : marked ? <ScrollView contentContainerStyle={styles.scanOutcomeContent}><Text style={styles.resultTitle}>Attendance marked</Text><Text style={styles.resultMessage}>You are marked present for this session.</Text><Action onPress={onBack}><Text style={styles.actionPrimaryText}>Done</Text></Action></ScrollView>
      : context?.sessionId && (context.sessionActive || tab === 'pass') ? tab === 'scan'
        ? <UniversalScanner key={context.sessionId} auth={auth} role="student" onBack={onBack} expectedSessionId={context.sessionId} embedded onResult={() => setRevision(value => value + 1)} />
        : <ScrollView contentContainerStyle={styles.screenContent}><StudentQrPass auth={auth} sessionId={context.sessionId} /></ScrollView>
      : <ScrollView contentContainerStyle={styles.screenContent}><Text style={styles.screenLead}>{context ? 'Scanning is available during this session’s scheduled time or when a teacher opens its QR. Select My QR to show your pass for today’s session.' : 'Checking session...'}</Text><Action kind="secondary" onPress={() => setRevision(value => value + 1)}><Text style={styles.actionSecondaryText}>Check again</Text></Action></ScrollView>}
  </View>;
}
