/** Typed client for the user-supplied KAHE attendance service. Tokens are passed in memory by the app and never persisted here. */
export let API_BASE_URL = "http://192.168.1.34:4000/api/v1";

export function getApiBaseUrl(): string {
  return API_BASE_URL;
}

export function setCustomApiBaseUrl(url: string) {
  let cleanUrl = url.trim();
  if (!cleanUrl.startsWith("http://") && !cleanUrl.startsWith("https://")) {
    cleanUrl = `http://${cleanUrl}`;
  }
  if (!cleanUrl.endsWith("/api/v1")) {
    cleanUrl = cleanUrl.replace(/\/+$/, "") + "/api/v1";
  }
  API_BASE_URL = cleanUrl;
}

export type ApiUser = { id: string; fullName: string; role: string };
export type AuthSession = { token: string; user: ApiUser };
export type StudentFlow = { title?: string; policy?: unknown; steps?: unknown[] };
export type AttendanceDecision = { decision: "ACCEPT" | "CHALLENGE" | "REJECT"; decisionReason?: string };
export type StudentQr = { dataUrl: string; expiresInSeconds: number };
export type AttendanceSummary = { courseCode: string; attendancePercentage?: number; [key: string]: unknown };
export type AnalyticsResponse = { summaries: AttendanceSummary[] };

export class AttendanceApiError extends Error {
  constructor(message: string, public status?: number) { super(message); }
}

export function authHeaders(token: string): HeadersInit {
  return { Authorization: `Bearer ${token}` };
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, options);
  const payload = await response.json().catch(() => null) as { message?: string; error?: string } | T | null;
  if (!response.ok) {
    const detail = payload && typeof payload === "object" && ("message" in payload || "error" in payload) ? payload.message ?? payload.error : undefined;
    throw new AttendanceApiError(detail ?? `Request failed with status ${response.status}.`, response.status);
  }
  if (!payload) throw new AttendanceApiError("The attendance service returned an empty response.", response.status);
  return payload as T;
}

export function login(email: string, password: string) {
  return request<AuthSession>("/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
}

export function getStudentFlow(token: string, sessionId: string) {
  return request<StudentFlow>(`/flows/student?sessionId=${encodeURIComponent(sessionId)}`, { headers: authHeaders(token) });
}

export function submitAttendanceAttempt(token: string, body: { sessionId: string; clientTimestamp: string; qrPayload: string; coordinates: { latitude: number; longitude: number; accuracy: number }; telemetry: { isFromMockProvider: boolean } }) {
  return request<AttendanceDecision>("/attendance/attempt", { method: "POST", headers: { "Content-Type": "application/json", ...authHeaders(token) }, body: JSON.stringify(body) });
}

export function getStudentQr(token: string, sessionId: string) {
  return request<StudentQr>(`/attendance/student-qr?sessionId=${encodeURIComponent(sessionId)}`, { headers: authHeaders(token) });
}

export function getMySummary(token: string) {
  return request<AnalyticsResponse>("/analytics/my-summary", { headers: authHeaders(token) });
}

export type Department = { id: string; code: string; name: string };
export type UserProfile = {
  id: string;
  email: string;
  role: string;
  fullName: string;
  enrollmentId?: string;
  departmentId?: string;
  departmentCode?: string;
  departmentName?: string;
  yearOfStudy?: number;
};

export function getDepartments(token: string) {
  return request<{ departments: Department[] }>("/departments", { headers: authHeaders(token) });
}

export function getMyProfile(token: string) {
  return request<{ user: UserProfile }>("/auth/me", { headers: authHeaders(token) });
}

export function updateProfile(token: string, body: { fullName?: string; departmentId?: string; yearOfStudy?: number }) {
  return request<{ message: string; user: UserProfile }>("/auth/profile", {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...authHeaders(token) },
    body: JSON.stringify(body)
  });
}

export function getFacultyQrExport(token: string, sessionId: string, expiresInSeconds: number = 900) {
  return request<{ dataUrl: string; expiresInSeconds: number; format: string }>(
    `/sessions/${encodeURIComponent(sessionId)}/qr-export?format=dataUrl&expiresInSeconds=${expiresInSeconds}`,
    { headers: authHeaders(token) }
  );
}

export function submitProfessorScan(token: string, sessionId: string, studentQrPayload: string) {
  return request<{
    attemptId: string;
    decision: "ACCEPT" | "REJECT";
    decisionReason: string;
    studentName: string;
    enrollmentId: string;
  }>("/attendance/professor-scan", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders(token) },
    body: JSON.stringify({ sessionId, studentQrPayload })
  });
}

export type MobileBatch = {
  id: string;
  name: string;
  code: string;
  allowCrossDepartment: boolean;
  allowMultipleYears: boolean;
  allowedYears?: number[];
  description?: string;
  memberCount?: number;
};

export type MobileTimetableSlot = {
  id: string;
  scheduleType: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  targetType: string;
  batchId?: string;
  batchCode?: string;
  batchName?: string;
  courseId?: string;
  courseCode?: string;
  courseName?: string;
  professorId: string;
  professorName?: string;
  classroomId: string;
  classroomName?: string;
};

export function getMyBatches(token: string) {
  return request<{ batches: MobileBatch[] }>("/batches/my", { headers: authHeaders(token) });
}

export function getMyTimetable(token: string) {
  return request<{ slots: MobileTimetableSlot[] }>("/timetable/my", { headers: authHeaders(token) });
}

export function launchSlotSession(token: string, slotId?: string, batchId?: string) {
  return request<{ message: string; sessionId: string; status: string }>("/sessions/launch-slot", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders(token) },
    body: JSON.stringify({ slotId, batchId })
  });
}
