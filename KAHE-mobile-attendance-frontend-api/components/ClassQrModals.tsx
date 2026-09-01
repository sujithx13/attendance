import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, AppState, Image, Pressable, Text, useWindowDimensions, View } from 'react-native';
import { getFacultyQrExport, getSlotContext, launchSlotSession, type AuthSession, type MobileTimetableSlot } from '../lib/api';
import { captureSessionLocation } from '../lib/location';
import { colors, formatAmPm, getErrorMessage } from '../theme';
import { styles } from '../styles';
import { BigScreenPairing } from './BigScreenPairing';
import { Action, ModalViewport } from './ui';
import { sessionName } from './SessionCard';

export function FacultyClassQrModal({ auth, slot, visible, onClose }: { auth: AuthSession; slot: MobileTimetableSlot; visible: boolean; onClose: () => void }) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [qr, setQr] = useState<{ dataUrl: string; expiresAt: number } | null>(null);
  const [radius, setRadius] = useState(100);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [phase, setPhase] = useState('');
  const [pairing, setPairing] = useState(false);
  const [now, setNow] = useState(Date.now());
  const mounted = useRef(true);
  const starting = useRef(false);
  const size = Math.max(100, Math.min(260, useWindowDimensions().width - 96));
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => {
    if (!visible) return;
    let active = true;
    void getSlotContext(auth.token, slot.id).then(context => {
      if (active && context.sessionActive && context.locationReady && context.sessionId) {
        setSessionId(context.sessionId); setRadius(context.radiusMeters || 100);
      }
    }).catch(err => { if (active) setError(getErrorMessage(err)); });
    return () => { active = false; };
  }, [auth.token, slot.id, visible]);

  const start = async () => {
    if (starting.current) return;
    starting.current = true; setLoading(true); setError(''); setPhase('Getting your precise location...');
    try {
      const location = await captureSessionLocation(radius);
      setPhase('Opening attendance...');
      const result = await launchSlotSession(auth.token, slot.id, slot.batchId, location);
      const context = await getSlotContext(auth.token, slot.id);
      if (mounted.current) { setSessionId(result.sessionId); setRadius(context.radiusMeters || radius); }
    } catch (err) { if (mounted.current) setError(getErrorMessage(err)); }
    finally { starting.current = false; if (mounted.current) { setLoading(false); setPhase(''); } }
  };

  useEffect(() => {
    if (!sessionId || !visible) return;
    let active = true, busy = false;
    const refresh = async () => {
      if (busy) return; busy = true; setLoading(true);
      try {
        const next = await getFacultyQrExport(auth.token, sessionId, 60);
        if (active) { setQr({ dataUrl: next.dataUrl, expiresAt: Date.now() + next.expiresInSeconds * 1000 }); setError(''); }
      } catch (err) { if (active) { setQr(null); setError(getErrorMessage(err)); } }
      finally { busy = false; if (active) setLoading(false); }
    };
    void refresh();
    const timer = setInterval(() => { if (AppState.currentState === 'active') void refresh(); }, 45000);
    const clock = setInterval(() => setNow(Date.now()), 1000);
    const subscription = AppState.addEventListener('change', state => { if (state === 'active') void refresh(); });
    return () => { active = false; clearInterval(timer); clearInterval(clock); subscription.remove(); };
  }, [auth.token, sessionId, visible]);
  if (!visible) return null;
  if (pairing && sessionId) return <BigScreenPairing auth={auth} sessionId={sessionId} onClose={() => setPairing(false)} />;
  const valid = qr && qr.expiresAt > now;
  return <ModalViewport onClose={onClose}><View style={styles.passModalCard}>
    <Text style={styles.passModalTitle}>{sessionName(slot)}</Text>
    <Text style={styles.passTimeText}>{formatAmPm(slot.startTime)} - {formatAmPm(slot.endTime)}</Text>
    <Text style={styles.passInstructions}>{slot.classroomName} · {slot.professorName}</Text>
    {!sessionId ? <>
      <Text style={styles.passInstructions}>Set attendance around your current phone location. This center stays fixed for this session.</Text>
      <View style={{ flexDirection: 'row', gap: 8, width: '100%', marginVertical: 14 }}>
        {[25, 50, 100].map(meters => <Pressable accessibilityRole="button" disabled={loading} key={meters} onPress={() => setRadius(meters)} style={[styles.actionSecondary, { flex: 1, backgroundColor: radius === meters ? colors.primary : colors.cardSubtle }]}><Text style={{ color: radius === meters ? '#fff' : colors.text }}>{meters}m</Text></Pressable>)}
      </View>
      <Action disabled={loading} onPress={start}><Text style={styles.actionPrimaryText}>{loading ? phase : 'Start attendance here'}</Text></Action>
    </> : <>
      <Text style={styles.passInstructions}>Attendance open · {radius}m from the starting location</Text>
      {valid ? <Image accessibilityLabel="Classroom attendance QR" source={{ uri: qr.dataUrl }} style={{ width: size, height: size, marginVertical: 16, backgroundColor: '#fff' }} resizeMode="contain" onError={() => { setQr(null); setError('The QR image could not load. Close and reopen this session to retry.'); }} /> : <View style={{ height: size, justifyContent: 'center' }}>{loading ? <ActivityIndicator color={colors.primary} /> : <Text style={styles.loadingText}>QR unavailable</Text>}</View>}
      <Action kind="secondary" disabled={!valid} onPress={() => setPairing(true)}><Text style={styles.actionSecondaryText}>Show on big screen</Text></Action>
    </>}
    {!!error && <Text accessibilityRole="alert" style={[styles.errorBannerText, { marginVertical: 12 }]}>{error}</Text>}
    <Action kind="secondary" onPress={onClose}><Text style={styles.actionSecondaryText}>Close</Text></Action>
  </View></ModalViewport>;
}
