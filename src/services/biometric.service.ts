import { ENV } from '../config/env.js';

export interface BiometricValidationResult {
  passed: boolean;
  omitted?: boolean;
  similarityScore: number;
  threshold: number;
  message: string;
}

export class BiometricService {
  /**
   * Computes Cosine Similarity between two N-dimensional embedding vectors.
   */
  static cosineSimilarity(vectorA: number[], vectorB: number[]): number {
    if (!vectorA || !vectorB || vectorA.length === 0 || vectorB.length === 0) {
      return 0.0;
    }

    if (vectorA.length !== vectorB.length) {
      console.warn(`[Biometrics] Vector length mismatch: ${vectorA.length} vs ${vectorB.length}`);
      return 0.0;
    }

    let dotProduct = 0.0;
    let normA = 0.0;
    let normB = 0.0;

    for (let i = 0; i < vectorA.length; i++) {
      dotProduct += vectorA[i] * vectorB[i];
      normA += vectorA[i] * vectorA[i];
      normB += vectorB[i] * vectorB[i];
    }

    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    if (denominator === 0) return 0.0;

    return dotProduct / denominator;
  }

  /**
   * Validates submitted biometric vector against registered student face embedding.
   */
  static verifyFaceEmbedding(
    submittedVector?: number[],
    registeredVectorJson?: string | null,
    threshold: number = ENV.BIOMETRIC_SIMILARITY_THRESHOLD
  ): BiometricValidationResult {
    if (!registeredVectorJson) {
      return {
        passed: false,
        similarityScore: 0.0,
        threshold,
        message: 'No registered face embedding found on student profile.'
      };
    }

    if (!submittedVector || submittedVector.length === 0) {
      return {
        passed: false,
        similarityScore: 0.0,
        threshold,
        message: 'No biometric vector provided in submission.'
      };
    }

    try {
      const registeredVector = typeof registeredVectorJson === 'string'
        ? JSON.parse(registeredVectorJson)
        : registeredVectorJson;

      const score = this.cosineSimilarity(submittedVector, registeredVector);
      const roundedScore = Math.round(score * 1000) / 1000;
      const passed = score >= threshold;

      return {
        passed,
        similarityScore: roundedScore,
        threshold,
        message: passed
          ? `Biometric match verified (confidence: ${(roundedScore * 100).toFixed(1)}% >= ${(threshold * 100).toFixed(1)}%).`
          : `Biometric mismatch (confidence: ${(roundedScore * 100).toFixed(1)}% < required ${(threshold * 100).toFixed(1)}%).`
      };
    } catch {
      return {
        passed: false,
        similarityScore: 0.0,
        threshold,
        message: 'Failed to parse registered face embedding vector.'
      };
    }
  }

  /**
   * Helper utility to generate a unit-normalized random embedding for mock student enrollment.
   */
  static generateMockEmbedding(dimensions = 128): number[] {
    const raw = Array.from({ length: dimensions }, () => (Math.random() - 0.5) * 2);
    const norm = Math.sqrt(raw.reduce((sum, val) => sum + val * val, 0));
    return raw.map((val) => val / norm);
  }
}
