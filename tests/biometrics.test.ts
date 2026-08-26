import assert from 'assert';
import { BiometricService } from '../src/services/biometric.service.js';

export async function testBiometricsLayer(): Promise<void> {
  console.log('\n--- Running Test Suite: Layer 5 - Facial Biometrics & Vector Cosine Similarity ---');

  // 1. Identical vectors -> similarity should be exactly 1.0
  const vecA = BiometricService.generateMockEmbedding(128);
  const scoreSelf = BiometricService.cosineSimilarity(vecA, vecA);
  assert(Math.abs(scoreSelf - 1.0) < 0.0001, `Expected 1.0 for identical vectors, got ${scoreSelf}`);
  console.log(`  ✓ Identical vector cosine similarity = ${scoreSelf.toFixed(4)} (100% confidence)`);

  // 2. High similarity match (small perturbation)
  const vecSimilar = vecA.map((v) => v + (Math.random() - 0.5) * 0.05);
  const scoreSimilar = BiometricService.cosineSimilarity(vecA, vecSimilar);
  assert(scoreSimilar > 0.90, `Expected score > 0.90, got ${scoreSimilar}`);

  const verifySimilar = BiometricService.verifyFaceEmbedding(vecSimilar, JSON.stringify(vecA), 0.75);
  assert.strictEqual(verifySimilar.passed, true, 'High similarity must pass threshold');
  console.log(`  ✓ High confidence face match accepted (score: ${(scoreSimilar * 100).toFixed(1)}% >= 75%)`);

  // 3. Different student embedding -> orthogonal/low similarity
  const vecB = BiometricService.generateMockEmbedding(128);
  const scoreDifferent = BiometricService.cosineSimilarity(vecA, vecB);
  assert(scoreDifferent < 0.50, `Expected random embeddings similarity < 0.50, got ${scoreDifferent}`);

  const verifyDifferent = BiometricService.verifyFaceEmbedding(vecB, JSON.stringify(vecA), 0.75);
  assert.strictEqual(verifyDifferent.passed, false, 'Dissimilar face embeddings must be rejected');
  console.log(`  ✓ Face mismatch correctly rejected (score: ${(scoreDifferent * 100).toFixed(1)}% < 75%)`);
}
