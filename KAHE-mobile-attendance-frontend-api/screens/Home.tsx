import { useEffect, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { getMyBatches, type MobileBatch, type AuthSession, type MobileTimetableSlot } from '../lib/api';
import type { Role, Screen } from '../lib/navigation';
import { useTimetable } from '../lib/use-timetable';
import { styles } from '../styles';
import { colors } from '../theme';
import { SessionCard } from '../components/SessionCard';
import { Action, ShortcutCard } from '../components/ui';

export function Home({ role, auth, onNavigate, onOpenStudentQr, onOpenFacultyQr }: {
  role: Role; auth: AuthSession; onNavigate: (screen: Screen) => void;
  onOpenStudentQr: (slot: MobileTimetableSlot) => void; onOpenFacultyQr: (slot: MobileTimetableSlot) => void;
}) {
  const { slots, loading, error } = useTimetable(auth.token);
  const [batches, setBatches] = useState<MobileBatch[]>([]);
  const [batchError, setBatchError] = useState('');
  useEffect(() => {
    let active = true;
    void getMyBatches(auth.token).then(result => { if (active) setBatches(result.batches); }).catch(() => { if (active) setBatchError('Could not load your batches.'); });
    return () => { active = false; };
  }, [auth.token]);
  const today = new Date();
  const date = today.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  const day = new Date(`${date}T12:00:00+05:30`).getUTCDay();
  const todaySlots = slots.filter(slot => slot.scheduleType === 'SPECIFIC_DATE' ? slot.specificDate === date : slot.dayOfWeek === day);
  const student = role === 'student';
  return <ScrollView style={styles.screen} contentContainerStyle={styles.screenContent}>
    <View style={{ backgroundColor: colors.primary, padding: 24, borderRadius: 24, gap: 14 }}>
      <Text style={{ color: '#bbf7d0', fontWeight: '700', fontSize: 12 }}>{student ? 'STUDENT ATTENDANCE' : 'FACULTY ATTENDANCE'} · {today.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', month: 'short', day: 'numeric' })}</Text>
      <Text style={{ color: '#fff', fontSize: 28, fontWeight: '800' }}>Welcome back,{ '\n' }{auth.user.fullName.split(' ')[0]}</Text>
      <Text style={{ color: '#fff', lineHeight: 22 }}>{student ? 'Your classes, attendance and campus services in one place.' : 'Your teaching schedule, classroom QR and student check-ins.'}</Text>
      <Action kind="secondary" onPress={() => onNavigate('scanner')}><Text style={styles.actionSecondaryText}>{student ? 'Scan Classroom QR' : 'Scan Student QR'}</Text></Action>
    </View>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginVertical: 16 }}>
      <View style={[styles.emptyCard, { flex: 1, minWidth: 120 }]}><Text style={styles.screenTitle}>{todaySlots.length}</Text><Text>Sessions today</Text></View>
      <View style={[styles.emptyCard, { flex: 1, minWidth: 120 }]}><Text style={styles.screenTitle}>{student ? todaySlots.filter(slot => slot.attendanceStatus === 'MARKED').length : batches.length}</Text><Text>{student ? 'Marked present' : 'Mentored batches'}</Text></View>
    </View>
    <Text style={styles.screenKicker}>TIMETABLE SNAPSHOT</Text>
    <Text style={styles.sectionHeading}>Today's Schedule</Text>
    {loading && <Text style={styles.loadingText}>Loading sessions...</Text>}
    {!!error && <Text accessibilityRole="alert" style={styles.errorBannerText}>{error}</Text>}
    {todaySlots.slice(0, 3).map(slot => <SessionCard key={slot.id} slot={slot} student={student} onPress={() => student ? onOpenStudentQr(slot) : onOpenFacultyQr(slot)} />)}
    {!loading && !todaySlots.length && <View style={styles.emptyCard}><Text style={styles.emptyCardTitle}>No sessions today</Text></View>}
    <Action kind="secondary" onPress={() => onNavigate('timetable')}><Text style={styles.actionSecondaryText}>View weekly timetable</Text></Action>
    <Text style={[styles.sectionHeading, { marginTop: 24 }]}>{student ? 'My Enrolled Batches' : 'My Mentored Batches'}</Text>
    {!!batchError && <Text accessibilityRole="alert" style={styles.errorBannerText}>{batchError}</Text>}
    {batches.map(batch => <View key={batch.id} style={[styles.emptyCard, { alignItems: 'flex-start', marginTop: 10 }]}><Text style={styles.emptyCardTitle}>{batch.name}</Text><Text style={styles.screenKicker}>{batch.code}</Text>{!!batch.description && <Text style={styles.screenLead}>{batch.description}</Text>}</View>)}
    <Text style={[styles.sectionHeading, { marginTop: 24 }]}>Quick Services</Text>
    <View style={styles.shortcutGrid}>
      <ShortcutCard icon="calendar-clock" title="Weekly Timetable" subtitle="Class schedule" color={colors.primary} onPress={() => onNavigate('timetable')} />
      <ShortcutCard icon="qrcode-scan" title="Universal Scanner" subtitle={student ? 'Scan classroom QR' : 'Scan student pass'} color={colors.secondary} onPress={() => onNavigate('scanner')} />
      <ShortcutCard icon="account-cog" title="My Profile" subtitle="Account and settings" color="#8B5CF6" onPress={() => onNavigate('profile')} />
    </View>
  </ScrollView>;
}
