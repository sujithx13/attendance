import dotenv from 'dotenv';
import path from 'path';

// Load .env file
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

export const ENV = {
  PORT: parseInt(process.env.PORT || '4000', 10),
  HOST: process.env.HOST || '0.0.0.0',
  NODE_ENV: process.env.NODE_ENV || 'development',
  DATABASE_URL: process.env.DATABASE_URL || '',
  JWT_SECRET: process.env.JWT_SECRET || 'university_super_secret_jwt_attendance_2026',
  QR_HMAC_SECRET: process.env.QR_HMAC_SECRET || 'rotating_qr_hmac_secret_university_2026',
  
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
