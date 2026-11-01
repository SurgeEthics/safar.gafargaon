import { VehicleCategory } from '../types';
import { VEHICLE_OPTIONS } from '../data/initialData';

// Haversine formula to calculate approximate distance in kilometers between two geo-coordinates
export function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radius of the Earth in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c;
  // Account for road curvature in Bangladesh rural/semi-urban routes (~1.25x haversine)
  return Math.max(0.5, Math.round(d * 1.25 * 10) / 10);
}

// Convert English digits to Bengali digits
export function toBengaliNumber(num: number | string): string {
  const bengaliDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  return String(num).replace(/[0-9]/g, (digit) => bengaliDigits[parseInt(digit, 10)]);
}

// Calculate fare based on vehicle category and distance
export function calculateFare(category: VehicleCategory, distanceKm: number): number {
  if (category === 'fire_service') return 0;
  const option = VEHICLE_OPTIONS.find((v) => v.id === category);
  if (!option) return 50;

  // Base fare covers up to 1.5 km
  if (distanceKm <= 1.5) {
    return option.baseFare;
  }
  const additionalKm = distanceKm - 1.5;
  const total = option.baseFare + additionalKm * option.perKmFare;
  // Round to nearest 5 or 10 taka
  return Math.ceil(total / 5) * 5;
}

// Estimate travel time in minutes based on distance and vehicle category
export function estimateTravelTimeMinutes(category: VehicleCategory, distanceKm: number): number {
  const speeds: Record<VehicleCategory, number> = {
    ambulance: 35,
    cng: 25,
    auto: 18,
    car: 30,
    maxi: 22,
    bike: 32,
    fire_service: 35
  };
  const speed = speeds[category] || 20;
  const timeHours = distanceKm / speed;
  const minutes = Math.ceil(timeHours * 60) + 2; // +2 mins buffer
  return Math.max(3, minutes);
}
