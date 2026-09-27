import { DistanceService } from './DistanceService';

let distanceServiceInstance: DistanceService | null = null;

export function getDistanceService(): DistanceService {
  if (!distanceServiceInstance) {
    distanceServiceInstance = new DistanceService();
  }
  return distanceServiceInstance;
}

export * from './DistanceService';
export * from './haversine';
