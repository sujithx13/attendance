import { afterEach, describe, expect, it, vi } from 'vitest';
import { attendanceOutcome, decodeAttendanceQr, withTimeout } from '../lib/scanning';

const encode = (text: string) => btoa(encodeURIComponent(text).replace(/%([0-9A-F]{2})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16))));

afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

describe('native QR decoding and persistent result data', () => {
  it('decodes a classroom QR without browser atob', () => {
    vi.stubGlobal('atob', undefined);
    const data = encode(JSON.stringify({ type: 'SESSION_BROADCAST', sessionId: 'sess_class', nonce: 'nonce' })).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    expect(decodeAttendanceQr(data)).toEqual({ type: 'SESSION_BROADCAST', sessionId: 'sess_class' });
  });
  it('supports UTF-8 payloads and student passes', () => {
    const data = encode(JSON.stringify({ type: 'STUDENT_PERSONAL', sessionId: 'class_தமிழ்' }));
    expect(decodeAttendanceQr(data).sessionId).toBe('class_தமிழ்');
  });
  it.each(['https://example.edu', '!!!', encode('{}'), encode('{"type":"OTHER","sessionId":"class"}')])('rejects a non-attendance QR: %s', data => {
    expect(() => decodeAttendanceQr(data)).toThrow('not an attendance QR');
  });
  it('reports success only for accepted attendance', () => {
    expect(attendanceOutcome({ decision: 'ACCEPT' })).toMatchObject({ kind: 'success', title: 'Attendance recorded', badge: 'PRESENT' });
    expect(attendanceOutcome({ decision: 'CHALLENGE' })).toMatchObject({ kind: 'review', badge: 'PENDING APPROVAL' });
    expect(attendanceOutcome({ decision: 'REJECT' })).toMatchObject({ kind: 'rejected', badge: 'NOT RECORDED' });
  });
  it('explains expired tokens instead of suggesting success', () => {
    expect(attendanceOutcome({ decision: 'REJECT', decisionReason: 'EXPIRED_QR_TOKEN' }).message).toContain('screen to refresh');
  });
  it('bounds a stalled GPS request', async () => {
    vi.useFakeTimers();
    const pending = withTimeout(new Promise(() => {}), 8000, 'Location timed out');
    const checked = expect(pending).rejects.toThrow('Location timed out');
    await vi.advanceTimersByTimeAsync(8000);
    await checked;
    expect(vi.getTimerCount()).toBe(0);
  });
});
