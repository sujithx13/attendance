export interface SpatialValidationResult {
  passed: boolean;
  distanceMeters: number;
  maxAllowedMeters: number;
  accuracyMeters: number;
  accuracyAcceptable: boolean;
  message: string;
}

export class SpatialService {
  private static EARTH_RADIUS_METERS = 6371000; // Mean radius of the Earth in meters

  /**
   * Computes the Great-Circle distance between two coordinates using the Haversine formula.
   */
  static calculateDistanceMeters(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

    const phi1 = toRadians(lat1);
    const phi2 = toRadians(lat2);
    const deltaPhi = toRadians(lat2 - lat1);
    const deltaLambda = toRadians(lon2 - lon1);

    const a =
      Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
      Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return this.EARTH_RADIUS_METERS * c;
  }

  /**
   * Validates if student's submitted GPS position is within classroom geofence boundaries
   * and meets precision criteria.
   */
  static validateGeofence(
    studentLat: number,
    studentLon: number,
    studentAccuracy: number,
    classroomLat: number,
    classroomLon: number,
    geofenceRadiusMeters: number,
    maxAllowedAccuracyMeters: number = 35.0
  ): SpatialValidationResult {
    const distanceMeters = this.calculateDistanceMeters(
      studentLat,
      studentLon,
      classroomLat,
      classroomLon
    );

    const accuracyAcceptable = studentAccuracy <= maxAllowedAccuracyMeters;
    const withinGeofence = distanceMeters <= geofenceRadiusMeters;

    if (!accuracyAcceptable) {
      return {
        passed: false,
        distanceMeters: Math.round(distanceMeters * 100) / 100,
        maxAllowedMeters: geofenceRadiusMeters,
        accuracyMeters: studentAccuracy,
        accuracyAcceptable: false,
        message: `GPS accuracy too poor (${Math.round(studentAccuracy)}m > max allowed ${maxAllowedAccuracyMeters}m).`
      };
    }

    if (!withinGeofence) {
      return {
        passed: false,
        distanceMeters: Math.round(distanceMeters * 100) / 100,
        maxAllowedMeters: geofenceRadiusMeters,
        accuracyMeters: studentAccuracy,
        accuracyAcceptable: true,
        message: `Distance (${Math.round(distanceMeters)}m) exceeds classroom geofence radius (${geofenceRadiusMeters}m).`
      };
    }

    return {
      passed: true,
      distanceMeters: Math.round(distanceMeters * 100) / 100,
      maxAllowedMeters: geofenceRadiusMeters,
      accuracyMeters: studentAccuracy,
      accuracyAcceptable: true,
      message: `Location verified. Distance: ${Math.round(distanceMeters)}m (radius: ${geofenceRadiusMeters}m).`
    };
  }

  /**
   * Evaluates if a client's IP falls within allowed classroom CIDR subnets (for desktop lab sessions).
   */
  static isIpInSubnets(clientIp: string, allowedSubnets?: string[]): boolean {
    if (!allowedSubnets || allowedSubnets.length === 0) {
      return true; // No subnet restriction configured
    }

    const cleanIp = clientIp.replace('::ffff:', '');
    // Check exact IP match or CIDR prefix
    return allowedSubnets.some((subnet) => {
      if (subnet === cleanIp) return true;
      if (subnet.endsWith('/24')) {
        const prefix = subnet.split('.').slice(0, 3).join('.');
        return cleanIp.startsWith(prefix + '.');
      }
      if (subnet.endsWith('/16')) {
        const prefix = subnet.split('.').slice(0, 2).join('.');
        return cleanIp.startsWith(prefix + '.');
      }
      return false;
    });
  }
}
