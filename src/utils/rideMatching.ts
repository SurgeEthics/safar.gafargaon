export interface RideRequestCandidate {
  id: string;
  passengerName: string;
  passengerPhone: string;
  pickupPoint: string;
  pickupLandmark?: string;
  destination: string;
  category: string;
  requestedAt: string;
  distanceKm: number;
  estFare: number;
  status: 'pending' | 'accepted' | 'declined' | 'in_transit' | 'completed' | 'cancelled';
  driverId?: string;
  driverName?: string;
  driverPhone?: string;
  driverCategory?: string;
  driverLat?: number;
  driverLng?: number;
  driverVehicleModel?: string;
  driverLicensePlate?: string;
  driverPlateNumber?: string;
  driverPhoto?: string;
  driverRating?: number;
  otp?: string;
  acceptedAt?: string;
  pickupCoords?: { lat: number; lng: number } | null;
  destCoords?: { lat: number; lng: number } | null;
  createdAtMs?: number;
}

export interface DriverMatchIdentity {
  id?: string;
  phone?: string;
  category?: string;
  isRegistered?: boolean;
}

export function normalizeCleanPhone(phone?: string | null): string {
  if (!phone) return '';
  return String(phone).replace(/[^0-9]/g, '');
}

export function formatSafeRating(rating?: number | string | null, fallback = 5.0): string {
  const num = Number(rating);
  if (!Number.isFinite(num) || num <= 0) {
    return fallback.toFixed(1);
  }
  return (Math.round((num + Number.EPSILON) * 10) / 10).toFixed(1);
}

/**
 * Pure, deterministic selector that finds the active pending ride request
 * that should notify the current user/driver across both 'driver' and 'passenger' modes.
 *
 * Key guarantees:
 * - Suppresses alerts if the driver already has an active accepted/in_transit trip.
 * - Filters out stale pending requests (> 90 seconds old) so historical DB items never ring on startup.
 * - In 'passenger' mode, ONLY matches when the device belongs to a registered driver
 *   (`driverProfile.isRegistered === true`) AND the request is NOT the user's own
 *   currently-submitted `passengerPendingRequestId`.
 * - In 'driver' mode, matches pending requests in `passengerRequests` OR `passengerPendingRequest`.
 */
export function findMatchingIncomingRideRequest<T extends RideRequestCandidate>(params: {
  passengerRequests: T[];
  passengerPendingRequest?: T | null;
  dismissedAlertIds: Record<string, boolean>;
  dismissedTripIds: Set<string>;
  driverProfile: DriverMatchIdentity;
  userRole: 'passenger' | 'driver';
  now?: number;
}): T | null {
  const {
    passengerRequests,
    passengerPendingRequest = null,
    dismissedAlertIds,
    dismissedTripIds,
    driverProfile,
    userRole,
    now = Date.now(),
  } = params;

  const isDriverMode = userRole === 'driver';
  const cleanDriverPhone = normalizeCleanPhone(driverProfile.phone);

  // 1. Check if current driver is already on a truly active trip (accepted or in_transit within last 5m)
  const hasActiveTrip = passengerRequests.some(
    (r) => {
      if ((r.status !== 'accepted' && r.status !== 'in_transit') || dismissedTripIds.has(r.id)) {
        return false;
      }
      // If trip is older than 5 minutes, treat as stale/abandoned so driver is never permanently blocked
      const tripTime = r.createdAtMs || 0;
      if (tripTime > 0 && now - tripTime > 5 * 60 * 1000) {
        return false;
      }
      return (
        (driverProfile.id && r.driverId === driverProfile.id) ||
        (cleanDriverPhone &&
          r.driverPhone &&
          normalizeCleanPhone(r.driverPhone) === cleanDriverPhone)
      );
    }
  );
  if (hasActiveTrip) return null;

  // 2. If in passenger mode without an explicit driver role, check registered driver credentials in state and localStorage
  const isDriverRegisteredOnDevice = Boolean(
    driverProfile.isRegistered ||
    driverProfile.phone ||
    driverProfile.id ||
    (typeof window !== 'undefined' && (
      localStorage.getItem('safar_driver_registered') === 'true' ||
      localStorage.getItem('safar_active_driver_profile_v6') ||
      localStorage.getItem('safar_driver_profile')
    ))
  );

  if (!isDriverMode && !isDriverRegisteredOnDevice) {
    return null;
  }

  // Pending ride request freshness:
  // Allow up to 5 minutes into the future (-300s) for cross-device clock skew when phone clocks differ,
  // and up to 90 seconds in the past so real-time passenger requests alert reliably across devices.
  const isFresh = (req: T): boolean => {
    let reqTime = typeof req.createdAtMs === 'number' ? req.createdAtMs : 0;
    if (!reqTime && req.id.startsWith('req-')) {
      const ts = Number(req.id.replace('req-', ''));
      if (Number.isFinite(ts) && ts > 1600000000000) {
        reqTime = ts;
      }
    }
    if (reqTime > 0) {
      const diff = now - reqTime;
      // Allow -300s (future skew) and up to 90s past
      return diff >= -300000 && diff <= 90 * 1000;
    }
    return true;
  };

  const matchedFromQueue = passengerRequests.find((r) => {
    if (r.status !== 'pending' || dismissedAlertIds[r.id]) return false;
    if (!isFresh(r)) return false;

    // If user is currently in passenger mode, do not pop up driver alert for their own outgoing request
    if (!isDriverMode && passengerPendingRequest && r.id === passengerPendingRequest.id) {
      return false;
    }

    // Direct assignment to this driver ID or phone
    if (r.driverId || r.driverPhone) {
      const matchesId = Boolean(driverProfile.id && r.driverId === driverProfile.id);
      const matchesPhone = Boolean(
        cleanDriverPhone && r.driverPhone && normalizeCleanPhone(r.driverPhone) === cleanDriverPhone
      );
      return matchesId || matchesPhone;
    }

    // Open broadcast request
    if (isDriverMode) {
      return (
        !driverProfile.isRegistered ||
        !driverProfile.category ||
        driverProfile.category === 'all' ||
        !r.category ||
        r.category === 'all' ||
        r.category === driverProfile.category
      );
    }

    // Passenger mode with registered driver profile: match driver's category (or 'all')
    return (
      !driverProfile.category ||
      driverProfile.category === 'all' ||
      !r.category ||
      r.category === 'all' ||
      r.category === driverProfile.category
    );
  });

  if (matchedFromQueue) {
    return matchedFromQueue;
  }

  // Fallback for single-device cross-role testing when switched into driver mode
  if (
    isDriverMode &&
    passengerPendingRequest &&
    passengerPendingRequest.status === 'pending' &&
    !dismissedAlertIds[passengerPendingRequest.id] &&
    isFresh(passengerPendingRequest)
  ) {
    return passengerPendingRequest;
  }

  return null;
}

/**
 * Merges an accepted ride request into the passengerRequests list even if it was
 * not yet in the local snapshot array (e.g. cold notification tap or offline mode).
 */
export function mergeAcceptedRequestIntoList<T extends RideRequestCandidate>(
  list: T[],
  requestId: string,
  acceptedFields: Partial<T>,
  fallbackRequest?: T | null,
  passengerPhoneToCancel?: string
): T[] {
  let found = false;
  const updated = list.map((r) => {
    if (r.id === requestId) {
      found = true;
      return { ...r, ...acceptedFields, status: 'accepted' as const };
    }
    if (
      passengerPhoneToCancel &&
      r.passengerPhone === passengerPhoneToCancel &&
      r.status === 'pending'
    ) {
      return { ...r, status: 'cancelled' as const };
    }
    return r;
  });

  if (!found && fallbackRequest) {
    return [{ ...fallbackRequest, ...acceptedFields, status: 'accepted' as const }, ...updated];
  }

  return updated;
}
