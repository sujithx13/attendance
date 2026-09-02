import type { ServerDrivenFlowConfig } from '../../src/types/flow.types';
import type { AttendanceAttemptPayload } from '../../src/types/attempt.types';
import { readServerAddress, saveServerAddress } from './connection-storage';
import { withTimeout } from './scanning';

function getDefaultApiUrl(): string {
  const configured = process.env.EXPO_PUBLIC_API_URL;
  if (configured) return normalizeApiUrl(configured);
  if (typeof window !== "undefined" && window.location && window.location.hostname) {
    return `${window.location.protocol}//${window.location.hostname}:4000/api/v1`;
  }
  return '';
}

export let API_BASE_URL = getDefaultApiUrl();

export function getApiBaseUrl(): string {
  return API_BASE_URL;
}

export function getClassroomDisplayUrl(): string {
  return API_BASE_URL.replace(/\/api\/v1\/?$/, '') + '/display/';
}

export function pairClassroomDisplay(token: string, sessionId: string, code: string) {
  return request<{ pairingId: string; message: string }>(`/display/sessions/${encodeURIComponent(sessionId)}/pair`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeaders(token) }, body: JSON.stringify({ code })
  });
}

export function disconnectClassroomDisplays(token: string, sessionId: string) {
  return request<{ message: string }>(`/display/sessions/${encodeURIComponent(sessionId)}/pair`, { method: 'DELETE', headers: authHeaders(token) });
}

export function setCustomApiBaseUrl(url: string) {
  API_BASE_URL = normalizeApiUrl(url);
  void saveServerAddress(API_BASE_URL).catch(() => {});
}

export async function initializeConnection(): Promise<void> {
  const saved = await readServerAddress();
  const bundled = getDefaultApiUrl();
  // Preview tunnel addresses expire. Migrate an old preview address when installing a newer build.
  if (saved && bundled && saved !== bundled && /^https:\/\/[^/]+\.trycloudflare\.com\/api\/v1$/.test(saved) && /^https:\/\/[^/]+\.trycloudflare\.com\/api\/v1$/.test(bundled)) {
    API_BASE_URL = bundled;
    await saveServerAddress(bundled);
    return;
  }
  if (saved) { try { API_BASE_URL = normalizeApiUrl(saved); } catch { /* Ignore old or invalid settings. */ } }
}

function normalizeApiUrl(url: string): string {
  let cleanUrl = url.trim().replace(/\/+$/, '');
  if (!cleanUrl || (/^[a-z]+:\/\//i.test(cleanUrl) && !/^https?:\/\//i.test(cleanUrl))) throw new Error('Enter an HTTP or HTTPS server address.');
  if (!cleanUrl.startsWith("http://") && !cleanUrl.startsWith("https://")) {
    cleanUrl = `http://${cleanUrl}`;
  }
  if (!cleanUrl.endsWith("/api/v1")) {
    cleanUrl = cleanUrl.replace(/\/+$/, "") + "/api/v1";
  }
  const parsed = new URL(cleanUrl);
  if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password) throw new AttendanceApiError('Enter a valid HTTP or HTTPS server address.');
  if (parsed.search || parsed.hash) throw new Error('Server address must not contain a query or fragment.');
  return cleanUrl.replace(/\/+$/, '');
}

export type ApiUser = { id: string; fullName: string; role: string };
export type AuthSession = { token: string; user: ApiUser };
export type StudentFlow = ServerDrivenFlowConfig;
export type AttendanceDecision = { decision: "ACCEPT" | "CHALLENGE" | "REJECT"; decisionReason?: string };
export type StudentQr = { dataUrl: string; expiresInSeconds: number; expiresAt: number; sessionId: string };
export type SessionContext = { sessionId: string | null; sessionActive: boolean; attendanceStatus: 'MARKED' | 'PENDING' | 'NOT_MARKED'; verifiedAt: string | null; locationReady: boolean; radiusMeters: number | null };
export function getSlotContext(token: string, slotId: string) {
  return request<SessionContext>(`/sessions/for-slot/${encodeURIComponent(slotId)}`, { headers: authHeaders(token) });
}
export type SessionLocation = { latitude: number; longitude: number; accuracy: number; timestamp: number; mocked?: boolean; radiusMeters: number };
export type AttendanceSummary = { courseCode: string; attendancePercentage?: number; [key: string]: unknown };
export type AnalyticsResponse = { summaries: AttendanceSummary[] };

export class AttendanceApiError extends Error {
  constructor(message: string, public status?: number) { super(message); }
}

export function authHeaders(token: string): HeadersInit {
  return { Authorization: `Bearer ${token}` };
}

async function request<T>(path: string, options: RequestInit = {}, allowAttendanceRejection = false): Promise<T> {
  if (!API_BASE_URL) throw new AttendanceApiError('Set the attendance server address before signing in.');
  let response: Response;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    response = await fetch(`${API_BASE_URL}${path}`, { ...options, signal: controller.signal });
  } catch (netErr: any) {
    if (controller.signal.aborted) throw new AttendanceApiError('The server took too long to respond. Attendance is not confirmed. Check your connection and try again.');
    const errorMsg = netErr?.message || "Network request failed";
    throw new AttendanceApiError(
      `Could not reach the attendance server (${errorMsg}). Check your internet connection and server address, then try again.`
    );
  } finally { clearTimeout(timer); }

  const payload = await withTimeout(response.json().catch(() => null), 15000, 'The server response did not finish. Attendance is not confirmed. Please try again.') as { message?: string; error?: string } | T | null;
  const rejectedAttempt = allowAttendanceRejection && response.status === 403 && (payload as AttendanceDecision | null)?.decision === 'REJECT';
  if (!response.ok && !rejectedAttempt) {
    const detail = payload && typeof payload === "object" && ("message" in payload || "error" in payload) ? payload.message ?? payload.error : undefined;
    throw new AttendanceApiError(detail ?? `Request failed with status ${response.status}.`, response.status);
  }
  if (!payload) throw new AttendanceApiError("The attendance service returned an empty response.", response.status);
  return payload as T;
}

export function login(email: string, password: string) {
  return request<AuthSession>("/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) }).then(session => {
    if (typeof session.token !== 'string' || typeof session.user?.id !== 'string' || typeof session.user?.fullName !== 'string' || !['STUDENT','PROFESSOR','ADMIN'].includes(session.user?.role)) throw new AttendanceApiError('Invalid sign-in response.');
    return session;
  });
}

export function getStudentFlow(token: string, sessionId: string) {
  return request<StudentFlow>(`/flows/student?sessionId=${encodeURIComponent(sessionId)}`, { headers: authHeaders(token) }).then(flow => {
    if (!flow || typeof flow.sessionId !== 'string' || !Array.isArray(flow.steps) || typeof flow.policy?.requiresGps !== 'boolean') throw new AttendanceApiError('Invalid attendance flow received from the server.');
    return flow;
  });
}

export function submitAttendanceAttempt(token: string, body: AttendanceAttemptPayload) {
  return request<AttendanceDecision>("/attendance/attempt", { method: "POST", headers: { "Content-Type": "application/json", ...authHeaders(token) }, body: JSON.stringify(body) }, true).then(result => {
    if (!['ACCEPT','CHALLENGE','REJECT'].includes(result.decision)) throw new AttendanceApiError('Invalid attendance decision.');
    return result;
  });
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
  sessionId?: string | null;
  sessionActive?: boolean;
  attendanceStatus?: SessionContext['attendanceStatus'];
  specificDate?: string;
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

export function launchSlotSession(token: string, slotId?: string, batchId?: string, location?: SessionLocation) {
  return request<{ message: string; sessionId: string; status: string }>("/sessions/launch-slot", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders(token) },
    body: JSON.stringify({ slotId, batchId, ...(location ? { location } : {}) })
  });
}
