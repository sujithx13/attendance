export enum ScheduleType {
  RECURRING_WEEKLY = 'RECURRING_WEEKLY',
  SPECIFIC_DATE = 'SPECIFIC_DATE'
}

export enum TargetType {
  CLASS = 'CLASS',
  BATCH = 'BATCH'
}

export interface TimetableSlot {
  id: string;
  scheduleType: ScheduleType;
  dayOfWeek?: number; // 0=Sun, 1=Mon, ..., 6=Sat
  specificDate?: string; // 'YYYY-MM-DD'
  startTime: string; // 'HH:MM:SS'
  endTime: string; // 'HH:MM:SS'
  targetType: TargetType;
  courseId?: string | null;
  courseCode?: string;
  courseName?: string;
  batchId?: string | null;
  batchCode?: string;
  batchName?: string;
  professorId: string;
  professorName?: string;
  classroomId: string;
  classroomName?: string;
  isActive: boolean;
  effectiveFrom?: string;
  effectiveUntil?: string;
  createdAt?: string;
}

export interface CreateTimetableSlotDto {
  scheduleType: ScheduleType;
  dayOfWeek?: number;
  specificDate?: string;
  startTime: string;
  endTime: string;
  targetType: TargetType;
  courseId?: string;
  batchId?: string;
  professorId: string;
  classroomId: string;
  effectiveFrom?: string;
  effectiveUntil?: string;
}
