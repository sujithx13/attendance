import assert from 'assert';
import { SpatialService } from '../src/services/spatial.service.js';

export async function testSpatialLayer(): Promise<void> {
  console.log('\n--- Running Test Suite: Layer 2 - Spatial Geofencing & Haversine Math ---');

  // Classroom at Lat: 12.971598, Lon: 77.594562, Radius: 25.0m
  const classLat = 12.971598;
  const classLon = 77.594562;
  const geofenceRadius = 25.0;

  // 1. Point within 10 meters (Lat: 12.97165, Lon: 77.59460)
  const insideLat = 12.971650;
  const insideLon = 77.594600;
  const distInside = SpatialService.calculateDistanceMeters(insideLat, insideLon, classLat, classLon);
  assert(distInside < 15, `Expected distance < 15m, got ${distInside}m`);

  const validRes = SpatialService.validateGeofence(insideLat, insideLon, 10.0, classLat, classLon, geofenceRadius, 35.0);
  assert.strictEqual(validRes.passed, true, 'Location within geofence with good accuracy must pass');
  console.log(`  ✓ Location inside geofence verified (${distInside.toFixed(1)}m <= ${geofenceRadius}m)`);

  // 2. Point 200 meters away (Outside geofence)
  const outsideLat = 12.973400;
  const outsideLon = 77.594562;
  const distOutside = SpatialService.calculateDistanceMeters(outsideLat, outsideLon, classLat, classLon);
  assert(distOutside > 180, `Expected distance > 180m, got ${distOutside}m`);

  const outsideRes = SpatialService.validateGeofence(outsideLat, outsideLon, 10.0, classLat, classLon, geofenceRadius, 35.0);
  assert.strictEqual(outsideRes.passed, false, 'Location outside geofence must fail');
  console.log(`  ✓ Location outside geofence rejected (${distOutside.toFixed(1)}m > ${geofenceRadius}m)`);

  // 3. Poor GPS accuracy (>35 meters) rejected even if center coordinates are inside
  const poorAccRes = SpatialService.validateGeofence(insideLat, insideLon, 55.0, classLat, classLon, geofenceRadius, 35.0);
  assert.strictEqual(poorAccRes.passed, false, 'Inaccurate GPS reading must fail');
  assert.strictEqual(poorAccRes.accuracyAcceptable, false);
  console.log('  ✓ Inaccurate GPS readings (>35m uncertainty) correctly rejected');

  // 4. Subnet IP matching for desktop/lab validation
  assert.strictEqual(SpatialService.isIpInSubnets('10.14.5.22', ['10.14.0.0/16']), true);
  assert.strictEqual(SpatialService.isIpInSubnets('192.168.1.100', ['10.14.0.0/16']), false);
  assert.strictEqual(SpatialService.isIpInSubnets('127.0.0.1', ['127.0.0.1']), true);
  console.log('  ✓ Classroom intranet subnet matching verified for sensorless desktop clients');
}
