import { testBatchLogin } from './batch-login.test.js';
import { runMigrations } from '../src/database/migrate.js';
import { seedDatabase } from '../src/database/seed.js';
import { testQrLayer } from './qr.test.js';
import { testSpatialLayer } from './spatial.test.js';
import { testAntiSpoofingLayer } from './anti-spoofing.test.js';
import { testBiometricsLayer } from './biometrics.test.js';
import { testPolicyAndFlow } from './policy-and-flow.test.js';
import { runBatchesAndTimetableTests } from './batches-and-timetables.test.js';
import { testSecurityAndIntegrity } from './security-and-integrity.test.js';
import { ENV } from '../src/config/env.js';
import { testClassroomDisplay } from './display.test.js';
import { testSessionExperience } from './session-experience.test.js';

async function runAllTests(): Promise<void> {
  const startTime = Date.now();
  console.log('================================================================');
  console.log('  RUNNING COMPLETE VERIFICATION SUITE FOR ATTENDANCE BACKEND   ');
  console.log('================================================================');

  try {
    if (ENV.NODE_ENV !== 'test') throw new Error('Use npm test to run against the isolated in-memory database.');
    // 1. Ensure migrations and seed are fresh
    await seedDatabase();

    // 2. Run all individual test modules
    await testBatchLogin();
    await testQrLayer();
    await testSpatialLayer();
    await testAntiSpoofingLayer();
    await testBiometricsLayer();
    await testPolicyAndFlow();
    await runBatchesAndTimetableTests();
    await testSecurityAndIntegrity();
    await testClassroomDisplay();
    await testSessionExperience();

    const elapsedMs = Date.now() - startTime;
    console.log('\n================================================================');
    console.log(`  🎉 ALL VERIFICATION TESTS PASSED SUCCESSFULLY! (${elapsedMs}ms)`);
    console.log('================================================================\n');
    process.exit(0);
  } catch (err: any) {
    console.error('\n❌ TEST FAILED WITH ERROR:', err);
    process.exit(1);
  }
}

runAllTests();
