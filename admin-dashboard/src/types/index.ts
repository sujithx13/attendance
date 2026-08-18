export interface User {
  id: string;
  email: string;
  role: 'STUDENT' | 'PROFESSOR' | 'ADMIN';
  fullName: string;
  full_name?: string;
  enrollmentId?: string;
  enrollment_id?: string;
  departmentId?: string;
  department_id?: string;
  departmentCode?: string;
  department_code?: string;
  departmentName?: string;
  yearOfStudy?: number;
  year_of_study?: number;
  photoUrl?: string;
  createdAt?: string;
}

export interface Department {
  id: string;
  code: string;
  name: string;
  created_at?: string;
}

export interface Course {
  id: string;
  code: string;
  title: string;
  department_id?: string;
  departmentId?: string;
  department_code?: string;
  departmentCode?: string;
  department_name?: string;
  departmentName?: string;
  professor_id?: string;
  professorId?: string;
  professor_name?: string;
  professorName?: string;
  professor_email?: string;
  student_count?: number;
  studentCount?: number;
}

export interface Batch {
  id: string;
  name: string;
  code: string;
  departmentId?: string | null;
  department_id?: string | null;
  departmentCode?: string;
  department_code?: string;
  departmentName?: string;
  department_name?: string;
  professorId: string;
  professor_id?: string;
  professorName?: string;
  professor_name?: string;
  allowCrossDepartment: boolean;
  allow_cross_department?: boolean;
  allowMultipleYears: boolean;
  allow_multiple_years?: boolean;
  allowedYears: number[];
  allowed_years?: number[];
  description?: string;
  memberCount?: number;
  member_count?: number;
}

export interface BatchMember {
  id?: string;
  batchId?: string;
  studentId: string;
  studentName?: string;
  student_name?: string;
  email?: string;
  enrollmentId?: string;
  enrollment_id?: string;
  departmentCode?: string;
  department_code?: string;
  yearOfStudy?: number;
  year_of_study?: number;
  enrolledAt?: string;
  enrolled_at?: string;
}

export type ScheduleType = 'RECURRING_WEEKLY' | 'SPECIFIC_DATE';
export type TargetType = 'CLASS' | 'BATCH';

export interface TimetableSlot {
  id: string;
  scheduleType: ScheduleType;
  dayOfWeek?: number | null;
  specificDate?: string | null;
  startTime: string;
  endTime: string;
  targetType: TargetType;
  courseId?: string | null;
  courseCode?: string;
  courseTitle?: string;
  batchId?: string | null;
  batchName?: string;
  batchCode?: string;
  professorId: string;
  professorName?: string;
  classroomId: string;
  classroomName?: string;
  building?: string;
  isActive?: boolean;
}

export interface TemplateSlot {
  id?: string;
  templateId?: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  subjectName: string;
  classroomId?: string;
  classroomName?: string;
  professorId?: string;
  professorName?: string;
}

export interface TimetableTemplate {
  id: string;
  name: string;
  description?: string;
  targetType?: 'CLASS' | 'BATCH';
  targetId?: string;
  createdAt?: string;
  slot_count?: number;
  slots?: TemplateSlot[];
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  priority: 'GENERAL' | 'ACADEMIC' | 'URGENT';
  scope_type?: 'CAMPUS' | 'DEPARTMENT' | 'CLASS' | 'BATCH';
  scopeType?: 'CAMPUS' | 'DEPARTMENT' | 'CLASS' | 'BATCH';
  scope_id?: string | null;
  scopeId?: string | null;
  author_name?: string;
  authorName?: string;
  created_at?: string;
  createdAt?: string;
}

export interface SecurityViolation {
  id: string;
  studentId: string;
  studentName?: string;
  violationType: 'REPLAY_ATTACK' | 'MOCK_LOCATION_DETECTED' | 'IMPOSSIBLE_VELOCITY' | 'UNENROLLED_STUDENT' | 'UNAUTHORIZED_PROXIMITY';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  details?: Record<string, unknown>;
  createdAt: string;
}
