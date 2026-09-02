import * as Location from 'expo-location';
import { withTimeout } from './scanning';
import type { SessionLocation } from './api';

export async function captureSessionLocation(radiusMeters: number): Promise<SessionLocation> {
  const permission = await Location.requestForegroundPermissionsAsync();
  if (permission.status !== 'granted') throw new Error('Allow precise location in phone settings to set the center for this session.');
  if (!(await Location.hasServicesEnabledAsync())) throw new Error('Turn on phone location services and try again.');
  const location = await withTimeout(Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High, mayShowUserSettingsDialog: true }), 20000, 'Could not get a precise location. Move near a window or outdoors and try again.');
  if (location.mocked) throw new Error('Turn off mock location before starting attendance.');
  if (location.coords.accuracy == null || location.coords.accuracy > 50) throw new Error(`Location is only accurate to ${Math.round(location.coords.accuracy ?? 999)}m. Enable precise location and move near a window, then retry. This is GPS accuracy, not distance from the screen.`);
  return { latitude: location.coords.latitude, longitude: location.coords.longitude, accuracy: location.coords.accuracy, timestamp: location.timestamp, mocked: location.mocked, radiusMeters };
}
