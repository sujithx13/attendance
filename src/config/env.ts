import dotenv from 'dotenv';
import path from 'path';
import crypto from 'node:crypto';

// Load .env file
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

function secret(name: string): string {
  const value = process.env[name];
  if (process.env.NODE_ENV === 'production' && (!value || value.length < 32 || /university_super_secret|rotating_qr_hmac_secret/.test(value))) {
    throw new Error(`${name} must be configured with a unique secret of at least 32 characters.`);
  }
  return value || crypto.randomBytes(32).toString('hex');
}

export const ENV = {
  PORT: parseInt(process.env.PORT || '4000', 10),
  HOST: process.env.HOST || '0.0.0.0',
  NODE_ENV: process.env.NODE_ENV || 'development',
  DATABASE_URL: process.env.DATABASE_URL || '',
  JWT_SECRET: secret('JWT_SECRET'),
  QR_HMAC_SECRET: secret('QR_HMAC_SECRET'),
  
  // Geofence & Sensor thresholds
  GEOFENCE_DEFAULT_RADIUS_METERS: parseFloat(process.env.GEOFENCE_DEFAULT_RADIUS_METERS || '25.0'),
  GPS_MAX_ALLOWED_ACCURACY_METERS: parseFloat(process.env.GPS_MAX_ALLOWED_ACCURACY_METERS || '35.0'),
  
  // QR Code Timing
  QR_EXPIRATION_SECONDS: parseInt(process.env.QR_EXPIRATION_SECONDS || '20', 10),
  QR_ROTATION_INTERVAL_SECONDS: parseInt(process.env.QR_ROTATION_INTERVAL_SECONDS || '15', 10),
  
  // Biometric Confidence Threshold
  BIOMETRIC_SIMILARITY_THRESHOLD: parseFloat(process.env.BIOMETRIC_SIMILARITY_THRESHOLD || '0.75'),
  
  // Anti-Spoofing Anomaly Thresholds
  MAX_REALISTIC_SPEED_METERS_PER_SEC: parseFloat(process.env.MAX_REALISTIC_SPEED_METERS_PER_SEC || '15.0'),
};
