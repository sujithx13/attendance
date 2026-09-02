import { ScrollView, Text, View } from 'react-native';
import type { AuthSession, MobileTimetableSlot } from '../lib/api';
import type { Role, Screen } from '../lib/navigation';
import { useTimetable } from '../lib/use-timetable';
import { styles } from '../styles';
import { SessionCard } from '../components/SessionCard';
import { Action } from '../components/ui';

export function Home({ role, auth, onNavigate, onOpenStudentQr, onOpenFacultyQr }: {
  role: Role; auth: AuthSession; onNavigate: (screen: Screen) => void;
  onOpenStudentQr: (slot: MobileTimetableSlot) => void; onOpenFacultyQr: (slot: MobileTimetableSlot) => void;
}) {
  const { slots, loading, error } = useTimetable(auth.token);
  const today = new Date();
  const date = today.toLocaleDateString('en-CA');
  const todaySlots = slots.filter(slot => slot.scheduleType === 'SPECIFIC_DATE' ? slot.specificDate === date : slot.dayOfWeek === today.getDay());
  const student = role === 'student';
  return <ScrollView style={styles.screen} contentContainerStyle={styles.screenContent}>
    <Text style={styles.screenKicker}>{today.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</Text>
    <Text style={styles.screenTitle}>Today's sessions</Text>
    <Text style={styles.screenLead}>{student ? 'Choose a session to scan its classroom QR or show your own pass.' : 'Choose a session to open attendance.'}</Text>
    {loading && <Text style={styles.loadingText}>Loading sessions...</Text>}
    {!!error && <Text accessibilityRole="alert" style={styles.errorBannerText}>{error}</Text>}
    {todaySlots.map(slot => <SessionCard key={slot.id} slot={slot} student={student} onPress={() => student ? onOpenStudentQr(slot) : onOpenFacultyQr(slot)} />)}
    {!loading && !todaySlots.length && <View style={styles.emptyCard}><Text style={styles.emptyCardTitle}>No sessions today</Text></View>}
    <Action kind="secondary" onPress={() => onNavigate('timetable')}><Text style={styles.actionSecondaryText}>View weekly timetable</Text></Action>
  </ScrollView>;
}
