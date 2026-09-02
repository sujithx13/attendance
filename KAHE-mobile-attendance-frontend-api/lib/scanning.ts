export type DetectedAttendanceQr = { type: 'SESSION_BROADCAST' | 'STUDENT_PERSONAL'; sessionId: string };

// Decode independently of browser globals: camera callbacks also run under Hermes.
export function decodeAttendanceQr(data: string): DetectedAttendanceQr {
  try {
    if (!data || data.length > 16384 || !/^[A-Za-z0-9_+/-]+={0,2}$/.test(data)) throw new Error();
    const encoded = data.replace(/-/g, '+').replace(/_/g, '/').replace(/=+$/, '');
    if (encoded.length % 4 === 1) throw new Error();
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    const bytes: number[] = [];
    let buffer = 0, bits = 0;
    for (const character of encoded) {
      buffer = (buffer << 6) | alphabet.indexOf(character);
      bits += 6;
      if (bits >= 8) { bits -= 8; bytes.push((buffer >> bits) & 255); }
    }
    const text = decodeURIComponent(bytes.map(byte => '%' + byte.toString(16).padStart(2, '0')).join(''));
    const qr = JSON.parse(text);
    if (!['SESSION_BROADCAST', 'STUDENT_PERSONAL'].includes(qr.type) || typeof qr.sessionId !== 'string' || !qr.sessionId.trim()) throw new Error();
    return { type: qr.type, sessionId: qr.sessionId };
  } catch { throw new Error('This is not an attendance QR code. Scan the classroom display or a student pass.'); }
}

export async function withTimeout<T>(work: Promise<T>, milliseconds: number, message: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try { return await Promise.race([work, new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error(message)), milliseconds); })]); }
  finally { clearTimeout(timer); }
}

export type ScanOutcome = { kind: 'success' | 'review' | 'rejected' | 'error'; title: string; message: string; badge: string };

export function attendanceOutcome(result: { decision: 'ACCEPT' | 'CHALLENGE' | 'REJECT'; decisionReason?: string }): ScanOutcome {
  if (result.decision === 'ACCEPT') return { kind: 'success', title: 'Attendance recorded', message: 'You are marked PRESENT for this class.', badge: 'PRESENT' };
  if (result.decision === 'CHALLENGE') return { kind: 'review', title: 'Sent for professor review', message: result.decisionReason || 'Your professor needs to approve this attendance attempt.', badge: 'PENDING APPROVAL' };
  const reason = result.decisionReason || '';
  const message = reason.includes('EXPIRED_QR') ? 'The classroom code expired. Wait for the screen to refresh, then scan again.'
    : reason.includes('GPS accuracy too poor') ? `${reason} This is your phone's location uncertainty, not your distance from the PC. Enable precise location and move near a window, then retry.`
    : reason.includes('exceeds classroom geofence') ? `${reason} This distance is measured from the session location set by your professor. Ask your professor to check the session's starting location.`
    : reason.includes('REPLAY') ? 'You already scanned this code. Wait for a fresh classroom code before trying again.'
    : /STUDENT_NOT_(IN_BATCH|ENROLLED)/.test(reason) ? 'Your account is not enrolled in this class. Ask your professor to check your batch.'
    : reason || 'This attempt did not meet the attendance requirements.';
  return { kind: 'rejected', title: 'Attendance not recorded', message, badge: 'NOT RECORDED' };
}
