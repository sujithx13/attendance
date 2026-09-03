import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Location from 'expo-location';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, Text, Vibration, View } from 'react-native';
import { useEffect, useRef, useState } from 'react';
import { getStudentFlow, submitAttendanceAttempt, submitProfessorScan, type AuthSession } from '../lib/api';
import { attendanceOutcome, decodeAttendanceQr, withTimeout, type ScanOutcome } from '../lib/scanning';
import type { Role } from '../lib/navigation';
import { colors, getErrorMessage } from '../theme';
import { styles } from '../styles';
import { Action, Back } from '../components/ui';

type Coordinates = { latitude: number; longitude: number; accuracy: number };

export function UniversalScanner({ auth, role, onBack, expectedSessionId, embedded = false, onResult }: { auth: AuthSession; role: Role; onBack: () => void; expectedSessionId?: string; embedded?: boolean; onResult?: () => void }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState('');
  const [outcome, setOutcome] = useState<ScanOutcome | null>(null);
  const [cameraError, setCameraError] = useState('');
  const [cameraKey, setCameraKey] = useState(0);
  const [torch, setTorch] = useState(false);
  const locked = useRef(false);
  const mounted = useRef(true);
  const gpsPermission = useRef(false);
  const cachedLocation = useRef<Location.LocationObject | null>(null);
  const locationRequest = useRef<Promise<Location.LocationObject | null> | null>(null);
  const faculty = role === 'faculty';

  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);

  const locate = (): Promise<Location.LocationObject | null> => {
    if (cachedLocation.current && Date.now() - cachedLocation.current.timestamp < 30000) return Promise.resolve(cachedLocation.current);
    if (!locationRequest.current) {
      locationRequest.current = withTimeout(Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High, mayShowUserSettingsDialog: true }), 15000, 'Location timed out')
        .then(location => { if (location.coords.accuracy != null && location.coords.accuracy <= 35) cachedLocation.current = location; return location; })
        .catch(() => null)
        .finally(() => { locationRequest.current = null; });
    }
    return locationRequest.current;
  };

  useEffect(() => {
    if (!permission?.granted || faculty) return;
    let cancelled = false;
    void Location.requestForegroundPermissionsAsync().then(result => {
      if (cancelled) return;
      gpsPermission.current = result.status === 'granted';
      if (gpsPermission.current) void locate();
    }).catch(() => { gpsPermission.current = false; });
    return () => { cancelled = true; };
  }, [permission?.granted, faculty]);

  const scan = async ({ data }: { data: string }) => {
    if (locked.current || (!faculty && !confirmed)) return;
    locked.current = true;
    Vibration.vibrate(60);
    setBusy(true);
    setPhase('QR detected. Checking the class...');
    try {
      const qr = decodeAttendanceQr(data);
      if (expectedSessionId && qr.sessionId !== expectedSessionId) throw new Error('This QR belongs to a different session. Scan the classroom code for the session you opened.');
      if (faculty) {
        if (qr.type !== 'STUDENT_PERSONAL') throw new Error('This is a classroom QR. Scan a student pass on a faculty account.');
        setPhase('QR detected. Recording student attendance...');
        const result = await submitProfessorScan(auth.token, qr.sessionId, data);
        if (result.decision !== 'ACCEPT') throw new Error(result.decisionReason || 'Attendance was not recorded.');
        if (mounted.current) setOutcome({ kind: 'success', title: 'Student marked present', message: result.studentName + (result.enrollmentId ? ' ? ' + result.enrollmentId : '') + '. Attendance is saved.', badge: 'PRESENT' });
      } else {
        if (qr.type !== 'SESSION_BROADCAST') throw new Error('This is a student pass. Scan the QR shown on the classroom screen.');
        const flow = await getStudentFlow(auth.token, qr.sessionId);
        if (flow.policy.requiresBiometric || flow.policy.requiresBle) throw new Error('This class requires professor verification. Show your class QR pass to your professor.');
        let coordinates: Coordinates | undefined;
        let mocked: boolean | undefined;
        if (flow.policy.requiresGps && gpsPermission.current) {
          setPhase('QR detected. Checking your location...');
          const location = await locate();
          if (location) {
            coordinates = { latitude: location.coords.latitude, longitude: location.coords.longitude, accuracy: location.coords.accuracy ?? flow.policy.maxGpsAccuracyMeters + 1 };
            mocked = location.mocked;
          }
        }
        setPhase('QR detected. Saving your attendance...');
        const result = await submitAttendanceAttempt(auth.token, { sessionId: qr.sessionId, clientTimestamp: new Date().toISOString(), qrPayload: data, coordinates, declarationAccepted: confirmed, telemetry: { isFromMockProvider: mocked } });
        if (mounted.current) setOutcome(attendanceOutcome(result));
        onResult?.();
      }
    } catch (error) {
      if (mounted.current) setOutcome({ kind: 'error', title: 'Attendance not confirmed', message: getErrorMessage(error), badge: 'NOT CONFIRMED' });
    } finally {
      // Stay locked until the person explicitly chooses Scan again or Done.
      if (mounted.current) setBusy(false);
    }
  };

  const retry = () => { locked.current = false; setOutcome(null); setPhase(''); setBusy(false); setCameraError(''); setCameraKey(value => value + 1); };

  if (outcome) {
    const success = outcome.kind === 'success';
    const review = outcome.kind === 'review';
    const tone = success ? colors.primary : review ? colors.amber : colors.danger;
    return <ScrollView style={styles.screen} contentContainerStyle={styles.scanOutcomeContent}>
      <View style={styles.scanOutcomeCard} accessibilityRole="alert" accessibilityLiveRegion="assertive">
        <MaterialCommunityIcons name={success ? 'check-circle' : review ? 'clock-outline' : 'alert-circle-outline'} size={68} color={tone} />
        <Text style={[styles.resultBadgeText, { color: tone, marginTop: 16 }]}>{outcome.badge}</Text>
        <Text style={styles.resultTitle}>{outcome.title}</Text>
        <Text style={styles.resultMessage}>{outcome.message}</Text>
        <View style={{ width: '100%', marginTop: 24, gap: 12 }}>
          <Action onPress={onBack}><Text style={styles.actionPrimaryText}>Done</Text></Action>
          <Action kind="secondary" onPress={retry}><Text style={styles.actionSecondaryText}>{success ? 'Scan another code' : 'Try scanning again'}</Text></Action>
        </View>
      </View>
    </ScrollView>;
  }

  if (!permission?.granted) return <ScrollView contentContainerStyle={styles.scanOutcomeContent}>
    {!embedded && <Back onPress={onBack} />}
    <MaterialCommunityIcons name="camera-outline" size={52} color={colors.primary} />
    <Text style={styles.permissionTitle}>Allow camera access</Text>
    <Text style={styles.permissionLead}>Use the camera to scan a classroom QR or a student pass.</Text>
    <Action onPress={() => { if (permission?.canAskAgain === false) void Linking.openSettings(); else void requestPermission(); }}><Text style={styles.actionPrimaryText}>{permission?.canAskAgain === false ? 'Open phone settings' : 'Allow camera'}</Text></Action>
  </ScrollView>;

  return <ScrollView style={styles.screen} contentContainerStyle={styles.scannerContent} keyboardShouldPersistTaps="handled">
    {!embedded && <Back onPress={onBack} disabled={busy} />}
    {!embedded && <Text style={styles.screenTitle}>{faculty ? 'Scan student pass' : 'Scan classroom QR'}</Text>}
    <Text style={styles.screenLead}>Keep the code inside the fixed square. The frame stays still.</Text>
    <View style={styles.fixedCameraBox}>
      <CameraView key={cameraKey} style={StyleSheet.absoluteFill} facing="back" zoom={0} enableTorch={torch} barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={busy || (!faculty && !confirmed) || cameraError ? undefined : scan}
        onMountError={() => setCameraError('The camera could not start. Close other camera apps and try again.')} />
      <View pointerEvents="none" style={styles.fixedCameraGuide}>
        <View style={[styles.cornerBracket, styles.cornerTopLeft]} /><View style={[styles.cornerBracket, styles.cornerTopRight]} /><View style={[styles.cornerBracket, styles.cornerBottomLeft]} /><View style={[styles.cornerBracket, styles.cornerBottomRight]} />
      </View>
    </View>
    {!faculty && <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: confirmed, disabled: busy }} disabled={busy} onPress={() => setConfirmed(value => !value)} style={styles.presenceCheckbox}>
      <MaterialCommunityIcons name={confirmed ? 'checkbox-marked' : 'checkbox-blank-outline'} size={26} color={colors.primary} />
      <Text style={styles.presenceText}>I confirm I am physically present in the class I scan.</Text>
    </Pressable>}
    <View style={styles.scanStatusCard} accessibilityLiveRegion="polite">
      {busy ? <ActivityIndicator color={colors.primary} /> : <MaterialCommunityIcons name="qrcode-scan" size={22} color={colors.primary} />}
      <Text style={styles.scanStatusText}>{cameraError || (busy ? phase : !faculty && !confirmed ? 'Confirm your presence above to enable scanning.' : 'Ready to scan. Detection will vibrate and show a result.')}</Text>
    </View>
    {cameraError ? <Action onPress={retry}><Text style={styles.actionPrimaryText}>Restart camera</Text></Action> : <Action kind="secondary" disabled={busy} onPress={() => setTorch(value => !value)}><Text style={styles.actionSecondaryText}>{torch ? 'Turn flashlight off' : 'Turn flashlight on'}</Text></Action>}
  </ScrollView>;
}
