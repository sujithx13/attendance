import { Pressable, Text, TextInput, View } from 'react-native';
import { useState } from 'react';
import { disconnectClassroomDisplays, getClassroomDisplayUrl, pairClassroomDisplay, type AuthSession } from '../lib/api';
import { styles } from '../styles';
import { colors, getErrorMessage } from '../theme';
import { ModalViewport } from './ui';

export function BigScreenPairing({ auth, sessionId, onClose }: { auth: AuthSession; sessionId: string; onClose: () => void }) {
  const [code, setCode] = useState('');
  const [working, setWorking] = useState(false);
  const [connected, setConnected] = useState(false);
  const [message, setMessage] = useState('');
  const submit = async () => {
    setWorking(true); setMessage('');
    try { const result = await pairClassroomDisplay(auth.token, sessionId, code); setMessage(result.message); setConnected(true); }
    catch (error) { setMessage(getErrorMessage(error)); }
    finally { setWorking(false); }
  };
  const disconnect = async () => {
    setWorking(true);
    try { const result = await disconnectClassroomDisplays(auth.token, sessionId); setConnected(false); setMessage(result.message); setCode(''); }
    catch (error) { setMessage(getErrorMessage(error)); }
    finally { setWorking(false); }
  };
  return <ModalViewport onClose={onClose}>
    <View style={styles.passModalCard}>
      <Text style={styles.screenKicker}>CLASSROOM DISPLAY</Text><Text style={styles.passModalTitle}>Show on big screen</Text>
      <Text style={styles.passInstructions}>Open this address in the classroom browser. No app or sign-in is needed there.</Text>
      <Text selectable style={{ color: colors.primary, fontSize: 14, marginVertical: 16, textAlign: 'center' }}>{getClassroomDisplayUrl()}</Text>
      <Text style={styles.fieldLabel}>Code shown on the big screen</Text>
      <TextInput accessibilityLabel="Big screen pairing code" autoCapitalize="characters" autoCorrect={false} maxLength={9} value={code} onChangeText={setCode} placeholder="ABCD 2345" style={[styles.textInputSimple, { width: '100%', fontSize: 22, textAlign: 'center', letterSpacing: 3 }]} />
      {message ? <Text accessibilityRole="alert" style={[styles.passInstructions, { color: connected ? colors.primary : colors.textMuted }]}>{message}</Text> : null}
      <View style={styles.confirmActionsRow}>
        <Pressable disabled={working} accessibilityRole="button" onPress={onClose} style={styles.confirmButtonSecondary}><Text style={styles.confirmButtonSecondaryText}>Close</Text></Pressable>
        <Pressable disabled={working || (!connected && code.replace(/[\s-]/g, '').length !== 8)} accessibilityRole="button" onPress={connected ? disconnect : submit} style={[styles.confirmButtonPrimary, { backgroundColor: colors.primary }, (working || (!connected && code.replace(/[\s-]/g, '').length !== 8)) && styles.actionDisabled]}><Text style={styles.confirmButtonPrimaryText}>{working ? 'Connecting...' : connected ? 'Disconnect screens' : 'Connect screen'}</Text></Pressable>
      </View>
    </View>
  </ModalViewport>;
}
