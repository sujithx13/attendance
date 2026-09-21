import type {
  Department,
  Course,
  Batch,
  BatchMember,
  TimetableSlot,
  TimetableTemplate,
  Announcement,
  User,
  SecurityViolation
} from '../types/index.js';

const API_BASE = '/api/v1';

class ApiClient {
  private getToken(): string | null {
    return localStorage.getItem('kahe_admin_token');
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {})
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers
    });

    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      const errorMsg = payload?.message || payload?.error || `HTTP Error ${response.status}`;
      throw new Error(errorMsg);
    }

    return payload as T;
  }

  async batchAttendance(id: string, date: string): Promise<any> { return this.request(`/batches/${encodeURIComponent(id)}/attendance?date=${encodeURIComponent(date)}`); }

  batchLoginAccess(id:string):Promise<any> { return this.request(`/batches/${encodeURIComponent(id)}/login-access`); }
  setBatchLoginAccess(id:string,allowAllLogins:boolean) { return this.request(`/batches/${encodeURIComponent(id)}/login-access`,{method:'PATCH',body:JSON.stringify({allowAllLogins})}); }
  approveBatchLogin(id:string,userId:string) { return this.request(`/batches/${encodeURIComponent(id)}/login-access/${encodeURIComponent(userId)}/approve`,{method:'POST'}); }
  // Auth
  async login(email: string, password: string): Promise<{ token: string; user: User }> {
    const res = await this.request<{ token: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    localStorage.setItem('kahe_admin_token', res.token);
    return res;
  }

  async getMe(): Promise<{ user: User }> {
    return this.request<{ user: User }>('/auth/me');
  }

  logout() {
    localStorage.removeItem('kahe_admin_token');
  }

  // Users Directory & CRUD
  async getUsers(filters?: {
    role?: string;
    departmentId?: string;
    yearOfStudy?: number;
    search?: string;
  }): Promise<{ users: User[] }> {
    const params = new URLSearchParams();
    if (filters?.role) params.append('role', filters.role);
    if (filters?.departmentId) params.append('departmentId', filters.departmentId);
    if (filters?.yearOfStudy) params.append('yearOfStudy', filters.yearOfStudy.toString());
    if (filters?.search) params.append('search', filters.search);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return this.request<{ users: User[] }>(`/users${qs}`);
  }

  async createUser(body: {
    email: string;
    password?: string;
    role: string;
    fullName: string;
    phoneNumber?: string;
    enrollmentId?: string;
    departmentId?: string;
    yearOfStudy?: number;
  }): Promise<{ message: string; user: User }> {
    return this.request<{ message: string; user: User }>('/users', {
      method: 'POST',
      body: JSON.stringify({ ...body, password: body.password || 'password123' })
    });
  }

  async updateUser(id: string, body: Partial<User>): Promise<{ message: string; user: User }> {
    return this.request<{ message: string; user: User }>(`/users/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(body)
    });
  }

  async deleteUser(id: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/users/${encodeURIComponent(id)}`, {
      method: 'DELETE'
    });
  }

  // Courses / Classes CRUD
  async getCourses(departmentId?: string): Promise<{ courses: Course[] }> {
    const query = departmentId ? `?departmentId=${encodeURIComponent(departmentId)}` : '';
    return this.request<{ courses: Course[] }>(`/courses${query}`);
  }

  async createCourse(body: {
    code: string;
    title: string;
    departmentId?: string;
    professorId: string;
  }): Promise<{ message: string; courseId: string }> {
    return this.request<{ message: string; courseId: string }>('/courses', {
      method: 'POST',
      body: JSON.stringify(body)
    });
  }

  async updateCourse(id: string, body: Partial<Course>): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/courses/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(body)
    });
  }

  async deleteCourse(id: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/courses/${encodeURIComponent(id)}`, {
      method: 'DELETE'
    });
  }

  async getCourseStudents(courseId: string): Promise<{ students: User[] }> {
    return this.request<{ students: User[] }>(`/courses/${encodeURIComponent(courseId)}/students`);
  }

  async enrollStudentInCourse(courseId: string, studentId: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/courses/${encodeURIComponent(courseId)}/students`, {
      method: 'POST',
      body: JSON.stringify({ studentId })
    });
  }

  // Departments CRUD
  async getDepartments(): Promise<{ departments: Department[] }> {
    return this.request<{ departments: Department[] }>('/departments');
  }

  async createDepartment(code: string, name: string): Promise<{ message: string; department: Department }> {
    return this.request<{ message: string; department: Department }>('/departments', {
      method: 'POST',
      body: JSON.stringify({ code, name })
    });
  }

  async updateDepartment(id: string, code: string, name: string): Promise<{ message: string; department: Department }> {
    return this.request<{ message: string; department: Department }>(`/departments/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify({ code, name })
    });
  }

  async deleteDepartment(id: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/departments/${encodeURIComponent(id)}`, {
      method: 'DELETE'
    });
  }

  // Batches CRUD
  async getBatches(departmentId?: string): Promise<{ batches: Batch[] }> {
    const query = departmentId ? `?departmentId=${encodeURIComponent(departmentId)}` : '';
    return this.request<{ batches: Batch[] }>(`/batches${query}`);
  }

  async createBatch(body: {
    name: string;
    code: string;
    departmentId?: string | null;
    professorId?: string | null;
    allowCrossDepartment: boolean;
    allowMultipleYears: boolean;
    allowedYears?: number[];
    description?: string;
  }): Promise<{ message: string; batch: Batch }> {
    return this.request<{ message: string; batch: Batch }>('/batches', {
      method: 'POST',
      body: JSON.stringify(body)
    });
  }

  async updateBatch(id: string, body: Partial<Batch>): Promise<{ message: string; batch: Batch }> {
    return this.request<{ message: string; batch: Batch }>(`/batches/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(body)
    });
  }

  async deleteBatch(id: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/batches/${encodeURIComponent(id)}`, {
      method: 'DELETE'
    });
  }

  async getBatchMembers(batchId: string): Promise<{ members: BatchMember[] }> {
    return this.request<{ members: BatchMember[] }>(`/batches/${encodeURIComponent(batchId)}/members`);
  }

  async addStudentToBatch(batchId: string, studentId: string): Promise<{ message: string; member: BatchMember }> {
    return this.request<{ message: string; member: BatchMember }>(`/batches/${encodeURIComponent(batchId)}/students`, {
      method: 'POST',
      body: JSON.stringify({ studentId })
    });
  }

  async removeStudentFromBatch(batchId: string, studentId: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/batches/${encodeURIComponent(batchId)}/students/${encodeURIComponent(studentId)}`, {
      method: 'DELETE'
    });
  }

  // Batch Faculty Team Management
  async getBatchProfessors(batchId: string): Promise<{ professors: any[] }> {
    return this.request<{ professors: any[] }>(`/batches/${encodeURIComponent(batchId)}/professors`);
  }

  async addProfessorToBatch(batchId: string, professorId: string, role: string = 'INSTRUCTOR'): Promise<{ message: string; professor: any }> {
    return this.request<{ message: string; professor: any }>(`/batches/${encodeURIComponent(batchId)}/professors`, {
      method: 'POST',
      body: JSON.stringify({ professorId, role })
    });
  }

  async removeProfessorFromBatch(batchId: string, professorId: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/batches/${encodeURIComponent(batchId)}/professors/${encodeURIComponent(professorId)}`, {
      method: 'DELETE'
    });
  }

  async removeStudentFromCourse(courseId: string, studentId: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/courses/${encodeURIComponent(courseId)}/students/${encodeURIComponent(studentId)}`, {
      method: 'DELETE'
    });
  }

  async getClassrooms(): Promise<{ classrooms: any[] }> {
    return this.request<{ classrooms: any[] }>('/classrooms');
  }

  // Timetable
  async getTimetableSlots(filters?: {
    scheduleType?: string;
    dayOfWeek?: number;
    specificDate?: string;
    targetType?: string;
    courseId?: string;
    batchId?: string;
  }): Promise<{ slots: TimetableSlot[] }> {
    const params = new URLSearchParams();
    if (filters?.scheduleType) params.append('scheduleType', filters.scheduleType);
    if (filters?.dayOfWeek !== undefined) params.append('dayOfWeek', filters.dayOfWeek.toString());
    if (filters?.specificDate) params.append('specificDate', filters.specificDate);
    if (filters?.targetType) params.append('targetType', filters.targetType);
    if (filters?.courseId) params.append('courseId', filters.courseId);
    if (filters?.batchId) params.append('batchId', filters.batchId);

    const qs = params.toString() ? `?${params.toString()}` : '';
    return this.request<{ slots: TimetableSlot[] }>(`/timetable${qs}`);
  }

  async createTimetableSlot(body: {
    scheduleType: 'RECURRING_WEEKLY' | 'SPECIFIC_DATE';
    dayOfWeek?: number;
    specificDate?: string;
    startTime: string;
    endTime: string;
    targetType: 'CLASS' | 'BATCH';
    courseId?: string;
    batchId?: string;
    professorId: string;
    classroomId: string;
  }): Promise<{ message: string; slot: TimetableSlot }> {
    return this.request<{ message: string; slot: TimetableSlot }>('/timetable/slots', {
      method: 'POST',
      body: JSON.stringify(body)
    });
  }

  async updateTimetableSlot(
    slotId: string,
    body: {
      dayOfWeek?: number;
      startTime?: string;
      endTime?: string;
      batchId?: string;
      courseId?: string;
      professorId?: string;
      classroomId?: string;
    }
  ): Promise<{ message: string; slot: TimetableSlot }> {
    return this.request<{ message: string; slot: TimetableSlot }>(`/timetable/slots/${encodeURIComponent(slotId)}`, {
      method: 'PUT',
      body: JSON.stringify(body)
    });
  }

  async deleteTimetableSlot(slotId: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/timetable/slots/${encodeURIComponent(slotId)}`, {
      method: 'DELETE'
    });
  }

  async generateSessionsForDate(targetDate: string): Promise<{
    message: string;
    targetDate: string;
    dayOfWeek: number;
    sessionsGenerated: number;
    sessions: unknown[];
  }> {
    return this.request<{
      message: string;
      targetDate: string;
      dayOfWeek: number;
      sessionsGenerated: number;
      sessions: unknown[];
    }>('/timetable/generate-sessions', {
      method: 'POST',
      body: JSON.stringify({ targetDate })
    });
  }

  // Timetable Templates
  async getTemplates(): Promise<{ templates: TimetableTemplate[] }> {
    return this.request<{ templates: TimetableTemplate[] }>('/timetable/templates');
  }

  async createTemplate(body: {
    name: string;
    description?: string;
    targetType?: 'CLASS' | 'BATCH';
    targetId?: string;
    slots: {
      dayOfWeek: number;
      startTime: string;
      endTime: string;
      subjectName: string;
      classroomId?: string;
      professorId?: string;
    }[];
  }): Promise<{ message: string; templateId: string }> {
    return this.request<{ message: string; templateId: string }>('/timetable/templates', {
      method: 'POST',
      body: JSON.stringify(body)
    });
  }

  async deleteTemplate(id: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/timetable/templates/${encodeURIComponent(id)}`, {
      method: 'DELETE'
    });
  }

  async applyTemplateToCohort(
    templateId: string,
    targetType: 'CLASS' | 'BATCH',
    targetId: string,
    dayOptions?: {sourceDay:number;daysOfWeek?:number[];dates?:string[]}
  ): Promise<{ message: string; appliedCount: number }> {
    return this.request<{ message: string; appliedCount: number }>(`/timetable/templates/${encodeURIComponent(templateId)}/apply`, {
      method: 'POST',
      body: JSON.stringify({ targetType, targetId, ...dayOptions })
    });
  }

  // Announcements
  async getAnnouncements(scopeType?: string, scopeId?: string): Promise<{ announcements: Announcement[] }> {
    const params = new URLSearchParams();
    if (scopeType) params.append('scopeType', scopeType);
    if (scopeId) params.append('scopeId', scopeId);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return this.request<{ announcements: Announcement[] }>(`/announcements${qs}`);
  }

  async createAnnouncement(body: {
    title: string;
    content: string;
    priority: 'GENERAL' | 'ACADEMIC' | 'URGENT';
    scopeType: 'CAMPUS' | 'DEPARTMENT' | 'CLASS' | 'BATCH';
    scopeId?: string;
  }): Promise<{ message: string; announcementId: string }> {
    return this.request<{ message: string; announcementId: string }>('/announcements', {
      method: 'POST',
      body: JSON.stringify(body)
    });
  }

  async deleteAnnouncement(id: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/announcements/${encodeURIComponent(id)}`, {
      method: 'DELETE'
    });
  }

  // Analytics & Security Violations
  async getLiveSummary(): Promise<{ activeSessions: number; checkInsToday: number }> {
    return this.request('/analytics/live-summary');
  }

  async getSecurityViolations(): Promise<{ violations: SecurityViolation[] }> {
    return this.request<{ violations: SecurityViolation[] }>('/analytics/security-violations');
  }
}

export const api = new ApiClient();
