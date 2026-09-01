import { Pressable, Text, View } from 'react-native';
import type { MobileTimetableSlot, SessionContext } from '../lib/api';
import { colors, formatAmPm } from '../theme';
import { styles } from '../styles';

export const sessionName = (slot: MobileTimetableSlot) => slot.courseName || 'Class session';
export const statusLabel = (status?: SessionContext['attendanceStatus']) => status === 'MARKED' ? 'Marked present' : status === 'PENDING' ? 'Pending approval' : status === 'NOT_MARKED' ? 'Not marked' : 'Checking attendance...';

export function AttendanceBadge({ status }: { status?: SessionContext['attendanceStatus'] }) {
  const color = status === 'MARKED' ? colors.primary : status === 'PENDING' ? colors.amber : colors.textMuted;
  return <Text accessibilityLiveRegion="polite" style={{ color, fontSize: 13, fontWeight: '700', marginTop: 10 }}>{statusLabel(status)}</Text>;
}

export function SessionCard({ slot, student, onPress }: { slot: MobileTimetableSlot; student: boolean; onPress: () => void }) {
  return <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.timetableCard, pressed && styles.pressedState]}>
    <Text style={{ color: colors.textMuted, fontSize: 13 }}>{formatAmPm(slot.startTime)} - {formatAmPm(slot.endTime)}</Text>
    <Text style={[styles.timetableCardTitle, { marginTop: 8 }]}>{sessionName(slot)}</Text>
    <Text style={{ color: colors.textMuted, fontSize: 14, lineHeight: 22 }}>{slot.classroomName || 'Room to be confirmed'}</Text>
    <Text style={{ color: colors.textMuted, fontSize: 14, lineHeight: 22 }}>{slot.professorName || 'Professor to be confirmed'}</Text>
    {student ? <AttendanceBadge status={slot.attendanceStatus} /> : <Text style={{ color: colors.primary, fontSize: 13, fontWeight: '700', marginTop: 10 }}>Open attendance</Text>}
  </Pressable>;
}
