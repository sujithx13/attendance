import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { API_BASE_URL, authHeaders, setCustomApiBaseUrl, getStudentFlow, submitAttendanceAttempt, login, initializeConnection, getSlotContext, getStudentQr, launchSlotSession } from "../lib/api";

describe("attendance API client configuration", () => {
  beforeEach(() => setCustomApiBaseUrl('http://localhost:4000'));
  afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.useRealTimers(); });

  it("normalizes the configured endpoint without duplicating its API prefix", () => {
    setCustomApiBaseUrl('https://attendance.example.edu/api/v1/');
    expect(API_BASE_URL).toBe('https://attendance.example.edu/api/v1');
  });

  it("formats authenticated requests with a bearer token", () => {
    expect(authHeaders("example-token")).toEqual({ Authorization: "Bearer example-token" });
  });

  it('rejects unsupported URL schemes and embedded credentials', () => {
    expect(() => setCustomApiBaseUrl('ftp://example.edu')).toThrow();
    expect(() => setCustomApiBaseUrl('https://user:password@example.edu')).toThrow();
  });

  it('restores a saved internet server address for the next app launch', async () => {
    vi.stubGlobal('localStorage', { getItem: () => 'https://attendance.example.edu/api/v1', setItem: vi.fn() });
    await initializeConnection();
    expect(API_BASE_URL).toBe('https://attendance.example.edu/api/v1');
  });

  it('ignores corrupt saved connection settings', async () => {
    vi.stubGlobal('localStorage', { getItem: () => 'ftp://wrong', setItem: vi.fn() });
    await initializeConnection();
    expect(API_BASE_URL).toBe('http://localhost:4000/api/v1');
  });

  it('does not send fabricated coordinates when GPS is missing', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 202, json: async () => ({ decision: 'CHALLENGE' }) });
    vi.stubGlobal('fetch', fetchMock);
    await submitAttendanceAttempt('token', { sessionId: 'session', clientTimestamp: new Date().toISOString(), declarationAccepted: true });
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body).not.toHaveProperty('coordinates');
    expect(body).not.toHaveProperty('telemetry');
  });

  it('rejects an invalid server-driven flow', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ policy: {} }) }));
    await expect(getStudentFlow('token', 'session')).rejects.toThrow('Invalid attendance flow');
  });

  it('rejects an invalid sign-in response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ token: 'invalid' }) }));
    await expect(login('email', 'password')).rejects.toThrow('Invalid sign-in');
  });

  it('surfaces service failures rather than treating them as successful attendance', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 403, json: async () => ({ message: 'Not enrolled.' }) }));
    await expect(submitAttendanceAttempt('token', { sessionId: 'session', clientTimestamp: '' })).rejects.toThrow('Not enrolled.');
  });

  it('returns rejected attendance decisions for a clear red result screen', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 403, json: async () => ({ decision: 'REJECT', decisionReason: 'EXPIRED_QR_TOKEN' }) }));
    await expect(submitAttendanceAttempt('token', { sessionId: 'session', clientTimestamp: '' })).resolves.toEqual({ decision: 'REJECT', decisionReason: 'EXPIRED_QR_TOKEN' });
  });

  it('sends the professor location only when starting a session', async () => {
    const mocked = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ sessionId: 'sess_live', status: 'ACTIVE' }) });
    vi.stubGlobal('fetch', mocked);
    const location = { latitude: 11, longitude: 76, accuracy: 8, timestamp: Date.now(), radiusMeters: 100 };
    await launchSlotSession('token', 'slot_lecture', undefined, location);
    expect(JSON.parse(mocked.mock.calls[0][1].body)).toEqual({ slotId: 'slot_lecture', location });
  });

  it('migrates an expired preview tunnel address when a new APK supplies its replacement', async () => {
    vi.stubEnv('EXPO_PUBLIC_API_URL', 'https://new-preview.trycloudflare.com/api/v1');
    vi.stubGlobal('localStorage', { getItem: () => 'https://old-preview.trycloudflare.com/api/v1', setItem: vi.fn() });
    await initializeConnection();
    expect(API_BASE_URL).toBe('https://new-preview.trycloudflare.com/api/v1');
  });

  it('loads persisted attendance for the selected slot, then requests its actual session QR', async () => {
    const mocked = vi.fn().mockResolvedValueOnce({ ok: true, json: async () => ({ sessionId: 'sess_live', sessionActive: true, attendanceStatus: 'NOT_MARKED' }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ sessionId: 'sess_live', dataUrl: 'data:image/png;base64,test', expiresAt: 1234 }) });
    vi.stubGlobal('fetch', mocked);
    const context = await getSlotContext('token', 'slot_lecture');
    await getStudentQr('token', context.sessionId!);
    expect(mocked.mock.calls[0][0]).toContain('/sessions/for-slot/slot_lecture');
    expect(mocked.mock.calls[1][0]).toContain('/student-qr?sessionId=sess_live');
  });

  it('stops waiting when the network request never answers', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('fetch', (_url: string, options: RequestInit) => new Promise((_resolve, reject) => options.signal?.addEventListener('abort', () => reject(new Error('Aborted')))));
    const checked = expect(login('email', 'password')).rejects.toThrow('server took too long');
    await vi.advanceTimersByTimeAsync(15000);
    await checked;
    vi.useRealTimers();
  });
});
