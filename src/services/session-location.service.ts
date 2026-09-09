import { getDb } from '../database/db.js';
import { httpError } from './access.service.js';

export function validateSessionLocation(location: any) {
  if (!location || !Number.isFinite(location.latitude) || Math.abs(location.latitude) > 90
    || !Number.isFinite(location.longitude) || Math.abs(location.longitude) > 180
    || !Number.isFinite(location.accuracy) || location.accuracy < 0 || location.accuracy > 50
    || location.mocked === true || !Number.isFinite(location.timestamp)
    || Math.abs(Date.now() - location.timestamp) > 60000) {
    throw httpError(400, 'A fresh, precise location is required. Enable precise location, move near a window or outdoors, and try again (accuracy must be 50m or better).');
  }
  const radius = location.radiusMeters ?? 100;
  if (!Number.isFinite(radius) || radius < 25 || radius > 300) throw httpError(400, 'Choose a radius between 25m and 300m.');
  return { ...location, radiusMeters: radius };
}

// The first location is fixed for the life of the session; QR refreshes never move it.
export async function setSessionOrigin(sessionId: string, location: any): Promise<void> {
  const point = validateSessionLocation(location);
  const db = await getDb();
  await db.query(`UPDATE sessions SET origin_latitude = $2, origin_longitude = $3,
    origin_accuracy_meters = $4, origin_radius_meters = $5, origin_captured_at = CURRENT_TIMESTAMP
    WHERE id = $1 AND origin_latitude IS NULL AND status = 'ACTIVE' AND end_time > CURRENT_TIMESTAMP`,
    [sessionId, point.latitude, point.longitude, point.accuracy, point.radiusMeters]);
}
