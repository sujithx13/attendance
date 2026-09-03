import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import type { AuthSession, MobileTimetableSlot } from '../lib/api';
import type { Role, Screen } from '../lib/navigation';
import { useTimetable } from '../lib/use-timetable';
import { WEEK_DAYS } from '../theme';
import { styles } from '../styles';
import { Back } from '../components/ui';
import { SessionCard } from '../components/SessionCard';

export function TimetableScreen({ auth, role, onOpenStudentQr, onOpenFacultyQr, onBack }: {
  auth: AuthSession; role: Role; onNavigate: (screen: Screen) => void;
  onOpenStudentQr: (slot: MobileTimetableSlot) => void; onOpenFacultyQr: (slot: MobileTimetableSlot) => void; onBack: () => void;
}) {
  const today = new Date().getDay();
  const [selectedDay, setSelectedDay] = useState(today || 1);
  const { slots, loading, error } = useTimetable(auth.token);
  const student = role === 'student';
  const filtered = slots.filter(slot => slot.dayOfWeek === selectedDay || (slot.specificDate && new Date(slot.specificDate + 'T12:00:00').getDay() === selectedDay));
  return <ScrollView style={styles.screen} contentContainerStyle={styles.screenContent}>
    <Back onPress={onBack} />
    <Text style={styles.screenTitle}>Weekly timetable</Text>
    <Text style={styles.screenLead}>{student ? 'Select a session to scan or show your QR.' : 'Select a session to open attendance.'}</Text>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0, flexShrink: 0 }} contentContainerStyle={styles.daySelectorBar}>
      {WEEK_DAYS.map(day => <Pressable accessibilityRole="button" key={day.day} onPress={() => setSelectedDay(day.day)} style={[styles.dayButton, selectedDay === day.day && styles.dayButtonActive]}><Text style={[styles.dayButtonText, selectedDay === day.day && styles.dayButtonTextActive]}>{day.name}</Text></Pressable>)}
    </ScrollView>
    {loading && <Text style={styles.loadingText}>Loading sessions...</Text>}
    {!!error && <Text accessibilityRole="alert" style={styles.errorBannerText}>{error}</Text>}
    {filtered.map(slot => <SessionCard key={slot.id} slot={slot} student={student} onPress={() => student ? onOpenStudentQr(slot) : onOpenFacultyQr(slot)} />)}
    {!loading && !filtered.length && <View style={styles.emptyCard}><Text style={styles.emptyCardTitle}>No sessions on {WEEK_DAYS.find(day => day.day === selectedDay)?.full}</Text></View>}
  </ScrollView>;
}
