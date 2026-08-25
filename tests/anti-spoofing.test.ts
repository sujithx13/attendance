import assert from 'assert';
import { TelemetryService } from '../src/services/telemetry.service.js';
import { ViolationType } from '../src/config/constants.js';

export async function testAntiSpoofingLayer(): Promise<void> {
  console.log('\n--- Running Test Suite: Layer 3 - Mock Location & GPS Spoofing Detection ---');

  // 1. Clean device telemetry
  const cleanRes = TelemetryService.inspectClientTelemetry({
    isFromMockProvider: false,
    isMock: false,
    developerOptionsEnabled: false,
    mockAppDetected: false
  });
  assert.strictEqual(cleanRes.passed, true, 'Genuine client telemetry must pass');
  console.log('  ✓ Genuine device telemetry accepted');

  // 2. Android isFromMockProvider flag detected
  const mockProviderRes = TelemetryService.inspectClientTelemetry({
    isFromMockProvider: true,
    osPlatform: 'Android'
  });
  assert.strictEqual(mockProviderRes.passed, false, 'Mock provider flag must trigger rejection');
  assert(mockProviderRes.flagsDetected.includes('ANDROID_MOCK_LOCATION_PROVIDER'));
  assert.strictEqual(mockProviderRes.violationType, ViolationType.MOCK_LOCATION_DETECTED);
  console.log('  ✓ Native Android isFromMockProvider flag immediately detected and flagged');

  // 3. Mock app running flag detected
  const mockAppRes = TelemetryService.inspectClientTelemetry({
    mockAppDetected: true,
    mockAppNames: ['FakeGPS', 'FlyGPS']
  });
  assert.strictEqual(mockAppRes.passed, false);
  console.log('  ✓ Installed fake GPS / location spoofer application flagged');

  // 4. Record violation audit entry
  await TelemetryService.recordViolation(
    'usr_student_john',
    'sess_cs101_active',
    undefined,
    ViolationType.MOCK_LOCATION_DETECTED,
    { reason: 'Unit test mock violation' },
    'HIGH'
  );
  console.log('  ✓ Security violation successfully recorded to disciplinary audit ledger');
}
