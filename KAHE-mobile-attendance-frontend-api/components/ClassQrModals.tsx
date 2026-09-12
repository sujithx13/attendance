import { useEffect, useState } from 'react';
import { ActivityIndicator, AppState, Image, Pressable, ScrollView, Text, useWindowDimensions, View } from 'react-native';
import { AttendanceApiError, getFacultyQrExport, getSessionRecords, launchSlotSession, type AuthSession, type MobileTimetableSlot } from '../lib/api';
import { colors, formatAmPm, getErrorMessage } from '../theme';
import { styles } from '../styles';
import { BigScreenPairing } from './BigScreenPairing';
import { UniversalScanner } from '../screens/UniversalScanner';
import { Action, ConfirmModal, ModalViewport } from './ui';
import { sessionName } from './SessionCard';

export function FacultyClassQrModal({ auth, slot, visible, onClose }: { auth: AuthSession; slot: MobileTimetableSlot; visible: boolean; onClose: () => void }) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [qr, setQr] = useState<{ dataUrl: string; expiresAt: number } | null>(null);
  const [tab, setTab] = useState<'qr' | 'scan'>('qr');
  const [error, setError] = useState('');
  const [warning, setWarning] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(true);
  const [pairing, setPairing] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [recordCount, setRecordCount] = useState<number | null>(null);
  const size = Math.max(100, Math.min(260, useWindowDimensions().width - 96));
  useEffect(() => {
    if (!visible) return;
    let active = true;
    setLoading(true); setError('');
    void launchSlotSession(auth.token, slot.id, slot.batchId, confirmed).then(result => {
      if (active) { setSessionId(result.sessionId); setWarning(false); }
    }).catch(err => {
      if (!active) return;
      if (err instanceof AttendanceApiError && err.code === 'OUTSIDE_SCHEDULE') setWarning(true);
      else setError(getErrorMessage(err));
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [auth.token, slot.id, slot.batchId, visible, confirmed, revision]);

  useEffect(() => {
    if (!sessionId || !visible) return;
    let active = true, busy = false;
    const refresh = async () => {
      if (busy) return; busy = true;
      try {
        const next = await getFacultyQrExport(auth.token, sessionId, 60);
        if (active) { setQr({ dataUrl: next.dataUrl, expiresAt: next.expiresAt * 1000 }); setError(''); }
      } catch (err) { if (active) { setQr(null); setError(getErrorMessage(err)); } }
      finally { busy = false; }
    };
    const records = async () => {
      try {
        const next = await getSessionRecords(auth.token, sessionId);
        if (active) setRecordCount(next.records.filter(row => ['PRESENT', 'LATE', 'EXCUSED'].includes(row.status)).length);
      } catch (err) { if (active) setError(getErrorMessage(err)); }
    };
    void refresh(); void records();
    const timer = setInterval(() => { if (AppState.currentState === 'active') void refresh(); }, 45000);
    const poll = setInterval(() => { if (AppState.currentState === 'active') void records(); }, 5000);
    const clock = setInterval(() => setNow(Date.now()), 1000);
    const subscription = AppState.addEventListener('change', state => { if (state === 'active') { void refresh(); void records(); } });
    return () => { active = false; clearInterval(timer); clearInterval(poll); clearInterval(clock); subscription.remove(); };
  }, [auth.token, sessionId, visible, revision]);
  if (!visible) return null;
  if (pairing && sessionId) return <BigScreenPairing auth={auth} sessionId={sessionId} onClose={() => setPairing(false)} />;
  const valid = qr && qr.expiresAt > now;
  return <ModalViewport onClose={onClose}><View style={[styles.passModalCard, { width: '100%' }]}>
    <Text style={styles.passModalTitle}>{sessionName(slot)}</Text>
    <Text style={styles.passTimeText}>{formatAmPm(slot.startTime)} - {formatAmPm(slot.endTime)}</Text>
    <View style={{ flexDirection: 'row', gap: 8, marginVertical: 12, width: '100%' }}>
      {(['qr', 'scan'] as const).map(value => <Pressable accessibilityRole="tab" accessibilityState={{ selected: tab === value }} key={value} onPress={() => setTab(value)} style={[styles.actionSecondary, { flex: 1, backgroundColor: tab === value ? colors.primary : colors.cardSubtle }]}><Text style={{ textAlign: 'center', color: tab === value ? '#fff' : colors.text }}>{value === 'qr' ? 'Classroom QR' : 'Scan student QR'}</Text></Pressable>)}
    </View>
    <ConfirmModal visible={warning} title="Outside scheduled time" message="This session has not started yet or has already ended. Display its QR anyway?" confirmText="Continue" onConfirm={() => { setWarning(false); setConfirmed(true); }} onCancel={onClose} />
    {loading ? <ActivityIndicator color={colors.primary} /> : sessionId && tab === 'scan'
      ? <ScrollView style={{ width: '100%', maxHeight: 520 }}><UniversalScanner auth={auth} role="faculty" expectedSessionId={sessionId} embedded onBack={onClose} /></ScrollView>
      : sessionId ? <>
        <Text style={styles.passInstructions}>Students scan this code to mark their attendance.</Text>
        {valid ? <Image accessibilityLabel="Classroom attendance QR" source={{ uri: qr.dataUrl }} style={{ width: size, height: size, marginVertical: 16, backgroundColor: '#fff' }} resizeMode="contain" onError={() => { setQr(null); setError('QR image could not load. Tap Retry.'); }} /> : <View style={{ height: size, justifyContent: 'center' }}><Text style={styles.loadingText}>{error ? 'QR unavailable' : 'Loading QR...'}</Text></View>}
        {recordCount !== null && <Text accessibilityLiveRegion="polite" style={styles.passInstructions}>{recordCount} student{recordCount === 1 ? '' : 's'} marked present</Text>}
        <Action kind="secondary" disabled={!valid} onPress={() => setPairing(true)}><Text style={styles.actionSecondaryText}>Show on big screen</Text></Action>
      </> : null}
    {!!error && <><Text accessibilityRole="alert" style={[styles.errorBannerText, { marginVertical: 12 }]}>{error}</Text><Action onPress={() => setRevision(value => value + 1)}><Text style={styles.actionPrimaryText}>Retry</Text></Action></>}
    <Action kind="secondary" onPress={onClose}><Text style={styles.actionSecondaryText}>Close</Text></Action>
  </View></ModalViewport>;
}
