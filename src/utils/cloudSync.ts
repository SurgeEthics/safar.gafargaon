import { clampFiniteNumber, isValidBdCoordinate, sanitizePlainText, utf8ByteLength } from './security';

export interface CloudUserRecordInput {
  uid: string;
  email?: string | null;
  displayName?: string | null;
  photoURL?: string | null;
}

export interface SafePassengerProfileResult {
  profile: {
    uid: string;
    email: string;
    photoUrl: string;
    name: string;
    phone: string;
    homeLocation: string;
    emergencyContact: string;
    isLoggedIn: boolean;
  };
  shouldCreateDoc: boolean;
  createPayload: {
    uid: string;
    name: string;
    email: string;
    phone: string;
    homeLocation: string;
    emergencyContact: string;
    photoUrl: string;
    role: 'passenger';
  } | null;
}

/**
 * Safely merges Firebase Auth identity with Firestore `/users/{uid}` without ever
 * creating a blank overwrite payload when a network read times out or fails.
 */
export function mergePassengerProfileSafely(params: {
  authUser: CloudUserRecordInput;
  existingCloudData: Record<string, unknown> | null;
  readSucceeded: boolean;
}): SafePassengerProfileResult {
  const { authUser, existingCloudData, readSucceeded } = params;
  const safeEmail = sanitizePlainText(authUser.email || '', 150);
  const authPhoto = typeof authUser.photoURL === 'string' ? authUser.photoURL.slice(0, 500) : '';
  const cloudPhoto =
    typeof existingCloudData?.photoUrl === 'string' ? existingCloudData.photoUrl.slice(0, 500) : '';

  const resolvedName =
    sanitizePlainText(
      (existingCloudData?.name as string | undefined) || authUser.displayName || 'সম্মানিত যাত্রী',
      100
    ) || 'সম্মানিত যাত্রী';
  const resolvedPhone = sanitizePlainText((existingCloudData?.phone as string | undefined) || '', 20);
  const resolvedHome =
    sanitizePlainText((existingCloudData?.homeLocation as string | undefined) || 'গফরগাঁও পৌরসভা', 180) ||
    'গফরগাঁও পৌরসভা';
  const resolvedEmergency = sanitizePlainText(
    (existingCloudData?.emergencyContact as string | undefined) || '',
    80
  );

  const profile = {
    uid: authUser.uid,
    email: safeEmail || sanitizePlainText((existingCloudData?.email as string | undefined) || '', 150),
    photoUrl: cloudPhoto || authPhoto,
    name: resolvedName,
    phone: resolvedPhone,
    homeLocation: resolvedHome,
    emergencyContact: resolvedEmergency,
    isLoggedIn: true,
  };

  // CRITICAL: Only bootstrap a new Firestore `/users/{uid}` document when the server/cache
  // read definitively succeeded and confirmed the document does not exist.
  const shouldCreateDoc = readSucceeded && existingCloudData === null;

  return {
    profile,
    shouldCreateDoc,
    createPayload: shouldCreateDoc
      ? {
          uid: authUser.uid,
          name: profile.name,
          email: profile.email,
          phone: profile.phone,
          homeLocation: profile.homeLocation,
          emergencyContact: profile.emergencyContact,
          photoUrl: profile.photoUrl,
          role: 'passenger',
        }
      : null,
  };
}

export interface PassengerTripPayloadInput {
  id: string;
  date?: string;
  pickupPoint: string;
  destination: string;
  driverName?: string;
  driverPhone?: string;
  vehicleCategory?: string;
  vehicleModel?: string;
  plateNumber?: string;
  fare: number;
  status?: string;
  ratingGiven?: number;
  createdAtMs?: number;
}

/**
 * Builds a strict `users/{uid}/trips/{tripId}` payload matching `isValidPassengerTrip`
 * in `firestore.rules` (enforcing 160-char pickup/destination caps and exact allowed keys).
 */
export function buildPassengerTripFirestoreDoc<TCreatedAt>(
  input: PassengerTripPayloadInput,
  createdAtValue: TCreatedAt
) {
  return {
    id: sanitizePlainText(input.id, 128) || `trip-${Date.now()}`,
    date: sanitizePlainText(input.date || 'আজ', 60) || 'আজ',
    pickupPoint: sanitizePlainText(input.pickupPoint || 'শুরুর স্থান', 160) || 'শুরুর স্থান',
    destination: sanitizePlainText(input.destination || 'গন্তব্য স্থান', 160) || 'গন্তব্য স্থান',
    driverName: sanitizePlainText(input.driverName || 'নিবন্ধিত চালক', 100) || 'নিবন্ধিত চালক',
    driverPhone: sanitizePlainText(input.driverPhone || '', 25),
    vehicleCategory: sanitizePlainText(input.vehicleCategory || 'cng', 50) || 'cng',
    vehicleModel: sanitizePlainText(input.vehicleModel || 'যানবাহন', 100),
    plateNumber: sanitizePlainText(input.plateNumber || '', 50),
    fare: clampFiniteNumber(input.fare, 0, 50000, 40),
    status: sanitizePlainText(input.status || 'সম্পন্ন', 40) || 'সম্পন্ন',
    ratingGiven: clampFiniteNumber(input.ratingGiven ?? 5.0, 1, 5, 5.0),
    createdAtMs: clampFiniteNumber(input.createdAtMs ?? Date.now(), 0, 9999999999999, Date.now()),
    createdAt: createdAtValue,
  };
}

export interface DriverMergeCandidate {
  id: string;
  ownerUid?: string;
  phone?: string;
  licenseNumber?: string;
  firstIssueDate?: string;
  regLastFour?: string;
  manufacturingYear?: string;
  chassisNumber?: string;
  engineNumber?: string;
  taxTokenReceiptPhoto?: string;
  nidFrontPhoto?: string;
  nidBackPhoto?: string;
  nidNumber?: string;
}

/**
 * Treats Firestore `drivers` as the single global authority without resurrecting
 * deleted default drivers, and only preserves previously hydrated KYC fields when
 * the active session is authorized (Admin or matching Driver ownerUid).
 */
export function reconcileFirestoreDriversList<T extends DriverMergeCandidate>(params: {
  firestoreDrivers: readonly T[];
  prevDrivers: readonly T[];
  canRetainPrivateFields: (driver: T) => boolean;
}): T[] {
  const { firestoreDrivers, prevDrivers, canRetainPrivateFields } = params;
  const prevById = new Map<string, T>(prevDrivers.map((d) => [d.id, d]));

  return firestoreDrivers.map((fd) => {
    const existing = prevById.get(fd.id);
    if (!existing || !canRetainPrivateFields(fd)) {
      return fd;
    }
    return {
      ...fd,
      phone: fd.phone || existing.phone || '',
      licenseNumber: fd.licenseNumber || existing.licenseNumber || '',
      firstIssueDate: fd.firstIssueDate || existing.firstIssueDate || '',
      regLastFour: fd.regLastFour || existing.regLastFour || '',
      manufacturingYear: fd.manufacturingYear || existing.manufacturingYear || '',
      chassisNumber: fd.chassisNumber || existing.chassisNumber || '',
      engineNumber: fd.engineNumber || existing.engineNumber || '',
      taxTokenReceiptPhoto: fd.taxTokenReceiptPhoto || existing.taxTokenReceiptPhoto || '',
      nidFrontPhoto: fd.nidFrontPhoto || existing.nidFrontPhoto || '',
      nidBackPhoto: fd.nidBackPhoto || existing.nidBackPhoto || '',
      nidNumber: fd.nidNumber || existing.nidNumber || '',
    };
  });
}

export interface RideRequestSyncCandidate {
  id: string;
  passengerUid?: string;
  status?: string;
  createdAtMs?: number;
}

/**
 * Selects the newest pending ride request belonging to the signed-in passenger
 * so any browser/device immediately mirrors the active pending ride cockpit.
 */
export function findPassengerPendingRequestFromCloud<T extends RideRequestSyncCandidate>(
  liveList: readonly T[],
  passengerUid: string | null | undefined,
  dismissedIds?: ReadonlySet<string>
): T | undefined {
  if (!passengerUid || !Array.isArray(liveList)) return undefined;
  const matching = liveList.filter(
    (r) =>
      r &&
      r.status === 'pending' &&
      r.passengerUid === passengerUid &&
      !(dismissedIds && dismissedIds.has(r.id))
  );
  if (matching.length === 0) return undefined;
  return [...matching].sort((a, b) => (Number(b.createdAtMs) || 0) - (Number(a.createdAtMs) || 0))[0];
}

export interface DriverCompletedTripCandidate {
  id: string;
  date: string;
  fare: number;
  createdAtMs?: number;
}

/**
 * Derives daily and total driver stats strictly from authoritative Firestore
 * `completed_trips` records without cross-contaminating Passenger trips.
 */
export function computeDriverStatsFromCompletedTrips<T extends DriverCompletedTripCandidate>(
  trips: readonly T[],
  todayDateKey: string
): {
  trips: T[];
  todayTrips: number;
  todayEarnings: number;
  totalTrips: number;
} {
  const sorted = [...(trips || [])].sort(
    (a, b) => (Number(b.createdAtMs) || 0) - (Number(a.createdAtMs) || 0)
  );
  const todays = sorted.filter((t) => t.date === todayDateKey);
  const todayEarnings = todays.reduce((sum, t) => sum + (Number(t.fare) || 0), 0);
  return {
    trips: sorted,
    todayTrips: todays.length,
    todayEarnings,
    totalTrips: sorted.length,
  };
}

export function isCloudflareStaticHtmlResponse(contentType: string | null | undefined): boolean {
  if (!contentType) return false;
  return contentType.toLowerCase().includes('text/html');
}

export interface SafeUserProfileWriteInput {
  uid: string;
  name?: unknown;
  email?: unknown;
  phone?: unknown;
  homeLocation?: unknown;
  emergencyContact?: unknown;
  photoUrl?: unknown;
  role: 'passenger' | 'driver';
}

/**
 * Builds a strict `/users/{uid}` payload guaranteed to satisfy `isValidUserProfile`
 * in `firestore.rules` (enforces exact field length bounds and allowed keys).
 */
export function buildSafeUserProfileWritePayload<TUpdatedAt>(
  input: SafeUserProfileWriteInput,
  updatedAtValue: TUpdatedAt
) {
  const rawPhoto = typeof input.photoUrl === 'string' ? input.photoUrl.trim().slice(0, 500) : '';
  return {
    uid: sanitizePlainText(input.uid, 128),
    name:
      sanitizePlainText(input.name, 100) ||
      (input.role === 'driver' ? 'নিবন্ধিত চালক' : 'সম্মানিত যাত্রী'),
    email: sanitizePlainText(input.email, 150),
    phone: sanitizePlainText(input.phone, 20),
    homeLocation: sanitizePlainText(input.homeLocation, 180) || 'গফরগাঁও',
    emergencyContact: sanitizePlainText(input.emergencyContact, 80),
    photoUrl: rawPhoto,
    role: input.role,
    updatedAt: updatedAtValue,
  };
}

/**
 * Extracts epoch milliseconds reliably from numeric `createdAtMs`, Firestore `Timestamp`,
 * serialized `{ seconds }`, or ISO date strings for cross-device trip sorting.
 */
export function resolveTripCreatedAtMs(
  createdAtMs: unknown,
  createdAt: unknown
): number {
  if (typeof createdAtMs === 'number' && Number.isFinite(createdAtMs) && createdAtMs > 0) {
    return createdAtMs;
  }
  if (createdAt && typeof createdAt === 'object') {
    const maybeTs = createdAt as { toMillis?: () => number; seconds?: number };
    if (typeof maybeTs.toMillis === 'function') {
      const ms = maybeTs.toMillis();
      if (Number.isFinite(ms) && ms > 0) return ms;
    }
    if (typeof maybeTs.seconds === 'number' && Number.isFinite(maybeTs.seconds)) {
      return maybeTs.seconds * 1000;
    }
  }
  if (typeof createdAt === 'string') {
    const parsed = Date.parse(createdAt);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  return 0;
}

export function sanitizeBdCoordPair(
  lat: unknown,
  lng: unknown
): { lat: number; lng: number } {
  const numLat = typeof lat === 'number' ? lat : Number(lat);
  const numLng = typeof lng === 'number' ? lng : Number(lng);
  if (isValidBdCoordinate(numLat, numLng)) {
    return { lat: numLat, lng: numLng };
  }
  return { lat: 24.4536, lng: 90.5479 };
}

export interface DriverPublicWriteInput {
  id: string;
  ownerUid?: string;
  name?: unknown;
  nameBn?: unknown;
  category?: unknown;
  categoryBengali?: unknown;
  vehicleModel?: unknown;
  plateNumber?: unknown;
  licensePlate?: unknown;
  standName?: unknown;
  lat?: unknown;
  lng?: unknown;
  rating?: unknown;
  totalTrips?: unknown;
  todayDate?: unknown;
  todayTrips?: unknown;
  todayEarnings?: unknown;
  isOnline?: unknown;
  licenseVerified?: unknown;
  nidVerified?: unknown;
  phoneVerified?: unknown;
  verificationStatus?: unknown;
  regAppId?: unknown;
  registeredAt?: unknown;
  avatarBg?: unknown;
  approxSpeedKmh?: unknown;
  driverPhoto?: unknown;
  photoUrl?: unknown;
}

export function buildDriverPublicWritePayload<TUpdatedAt>(
  d: DriverPublicWriteInput,
  ownerUid: string,
  updatedAtValue: TUpdatedAt
) {
  const { lat, lng } = sanitizeBdCoordPair(d.lat, d.lng);
  const licV = Boolean(d.licenseVerified);
  const nidV = Boolean(d.nidVerified);
  const phoneV = Boolean(d.phoneVerified);
  const all3 = licV && nidV && phoneV;
  const rawPhoto =
    typeof d.driverPhoto === 'string' && utf8ByteLength(d.driverPhoto) <= 118000 ? d.driverPhoto : '';
  const rawAltPhoto =
    typeof d.photoUrl === 'string' && utf8ByteLength(d.photoUrl) <= 118000 ? d.photoUrl : rawPhoto;

  return {
    id: sanitizePlainText(d.id, 128),
    ownerUid: sanitizePlainText(ownerUid || d.ownerUid || '', 128),
    name: sanitizePlainText(d.name || 'চালক', 100) || 'চালক',
    nameBn: sanitizePlainText(d.nameBn || d.name || 'চালক', 100) || 'চালক',
    category: sanitizePlainText(d.category || 'cng', 50) || 'cng',
    categoryBengali: sanitizePlainText(d.categoryBengali || 'যানবাহন', 60),
    vehicleModel: sanitizePlainText(d.vehicleModel || 'বাহন', 100),
    plateNumber: sanitizePlainText(d.plateNumber || '', 50),
    licensePlate: sanitizePlainText(d.licensePlate || d.plateNumber || '', 50),
    standName: sanitizePlainText(d.standName || 'গফরগাঁও', 120) || 'গফরগাঁও',
    lat,
    lng,
    rating: clampFiniteNumber(d.rating ?? 5.0, 0, 5, 5.0),
    totalTrips: clampFiniteNumber(d.totalTrips ?? 0, 0, 1000000, 0),
    todayDate: sanitizePlainText(d.todayDate || '', 20),
    todayTrips: clampFiniteNumber(d.todayTrips ?? 0, 0, 500, 0),
    todayEarnings: clampFiniteNumber(d.todayEarnings ?? 0, 0, 500000, 0),
    isOnline: all3 ? Boolean(d.isOnline ?? true) : false,
    isVerified: all3,
    nidVerified: nidV,
    licenseVerified: licV,
    phoneVerified: phoneV,
    verificationStatus: (all3 ? 'verified' : 'pending') as
      | 'verified'
      | 'pending',
    regAppId: sanitizePlainText(d.regAppId || '', 60),
    registeredAt: sanitizePlainText(d.registeredAt || '', 60),
    avatarBg: sanitizePlainText(d.avatarBg || 'bg-emerald-700', 60) || 'bg-emerald-700',
    approxSpeedKmh: clampFiniteNumber(d.approxSpeedKmh ?? 25, 5, 160, 25),
    driverPhoto: rawPhoto,
    photoUrl: rawAltPhoto,
    updatedAt: updatedAtValue,
  };
}

export interface DriverPrivateKycWriteInput {
  ownerUid?: string;
  phone?: unknown;
  licenseNumber?: unknown;
  firstIssueDate?: unknown;
  licenseType?: unknown;
  regLastFour?: unknown;
  manufacturingYear?: unknown;
  chassisNumber?: unknown;
  engineNumber?: unknown;
  nidNumber?: unknown;
  nidFrontPhoto?: unknown;
  nidBackPhoto?: unknown;
  taxTokenReceiptPhoto?: unknown;
}

export function buildDriverPrivateKycWritePayload<TUpdatedAt>(
  d: DriverPrivateKycWriteInput,
  ownerUid: string,
  updatedAtValue: TUpdatedAt
) {
  const rawPhoneStr = typeof d.phone === 'string' ? d.phone : '';
  const digits = rawPhoneStr.replace(/[^0-9০-৯+]/g, '');
  const safePhone = sanitizePlainText(rawPhoneStr || digits || '01700000000', 20);
  const validPhone = safePhone.length >= 5 ? safePhone : '01700000000';

  return {
    ownerUid: sanitizePlainText(ownerUid || d.ownerUid || '', 128),
    phone: validPhone,
    licenseNumber: sanitizePlainText(d.licenseNumber || '', 60),
    firstIssueDate: sanitizePlainText(d.firstIssueDate || '', 40),
    licenseType: sanitizePlainText(d.licenseType || 'পেশাদার (Professional)', 60) || 'পেশাদার (Professional)',
    regLastFour: sanitizePlainText(d.regLastFour || '', 16),
    manufacturingYear: sanitizePlainText(d.manufacturingYear || '', 16),
    chassisNumber: sanitizePlainText(d.chassisNumber || '', 60),
    engineNumber: sanitizePlainText(d.engineNumber || '', 60),
    nidNumber: sanitizePlainText(d.nidNumber || '', 30),
    nidFrontPhoto:
      typeof d.nidFrontPhoto === 'string' && utf8ByteLength(d.nidFrontPhoto) <= 118000 ? d.nidFrontPhoto : '',
    nidBackPhoto:
      typeof d.nidBackPhoto === 'string' && utf8ByteLength(d.nidBackPhoto) <= 118000 ? d.nidBackPhoto : '',
    taxTokenReceiptPhoto:
      typeof d.taxTokenReceiptPhoto === 'string' && utf8ByteLength(d.taxTokenReceiptPhoto) <= 118000
        ? d.taxTokenReceiptPhoto
        : '',
    updatedAt: updatedAtValue,
  };
}

export interface RideRequestCreateInput {
  id: string;
  passengerUid: string;
  passengerName?: unknown;
  pickupPoint?: unknown;
  pickupLandmark?: unknown;
  destination?: unknown;
  category?: unknown;
  distanceKm?: unknown;
  estFare?: unknown;
  pickupCoords?: { lat: number; lng: number } | null;
  destCoords?: { lat: number; lng: number } | null;
  driverId?: unknown;
  driverName?: unknown;
  createdAtMs: number;
  requestedAt?: string;
}

export function buildRideRequestCreatePayload<TTimestamp>(
  input: RideRequestCreateInput,
  createdAtValue: TTimestamp,
  updatedAtValue: TTimestamp
) {
  const payload: Record<string, any> = {
    id: sanitizePlainText(input.id, 128),
    passengerUid: sanitizePlainText(input.passengerUid, 128),
    passengerName: sanitizePlainText(input.passengerName || 'সম্মানিত যাত্রী', 100) || 'সম্মানিত যাত্রী',
    pickupPoint: sanitizePlainText(input.pickupPoint || 'পিকআপ স্থান', 180) || 'পিকআপ স্থান',
    pickupLandmark: sanitizePlainText(input.pickupLandmark || '', 180),
    destination: sanitizePlainText(input.destination || 'গন্তব্য স্থান', 180) || 'গন্তব্য স্থান',
    category: sanitizePlainText(input.category || 'cng', 50) || 'cng',
    distanceKm: clampFiniteNumber(input.distanceKm ?? 1.2, 0, 500, 1.2),
    estFare: clampFiniteNumber(input.estFare ?? 40, 0, 50000, 40),
    pickupCoords: input.pickupCoords
      ? sanitizeBdCoordPair(input.pickupCoords.lat, input.pickupCoords.lng)
      : null,
    destCoords: input.destCoords
      ? sanitizeBdCoordPair(input.destCoords.lat, input.destCoords.lng)
      : null,
    status: 'pending',
    createdAtMs: clampFiniteNumber(input.createdAtMs, 0, 9999999999999, Date.now()),
    requestedAt: sanitizePlainText(input.requestedAt || new Date().toISOString(), 64),
    createdAt: createdAtValue,
    updatedAt: updatedAtValue,
  };

  const cleanDriverId = sanitizePlainText(input.driverId || '', 128);
  const cleanDriverName = sanitizePlainText(input.driverName || '', 100);
  if (cleanDriverId) payload.driverId = cleanDriverId;
  if (cleanDriverName) payload.driverName = cleanDriverName;

  return payload;
}

export function buildRidePrivateContactWritePayload<TUpdatedAt>(
  input: { passengerUid: string; passengerPhone?: unknown },
  updatedAtValue: TUpdatedAt
) {
  return {
    passengerUid: sanitizePlainText(input.passengerUid, 128),
    passengerPhone: sanitizePlainText(input.passengerPhone || '', 20),
    updatedAt: updatedAtValue,
  };
}

export function buildRideAcceptUpdatePayload<TUpdatedAt>(
  input: {
    driverId: string;
    driverUid: string;
    driverName?: unknown;
    driverCategory?: unknown;
    driverLat?: unknown;
    driverLng?: unknown;
    driverVehicleModel?: unknown;
    driverLicensePlate?: unknown;
    driverPlateNumber?: unknown;
    driverPhoto?: unknown;
    driverRating?: unknown;
    acceptedAt?: string;
  },
  updatedAtValue: TUpdatedAt
) {
  const { lat, lng } = sanitizeBdCoordPair(input.driverLat, input.driverLng);
  const safePhoto =
    typeof input.driverPhoto === 'string' && utf8ByteLength(input.driverPhoto) <= 59000
      ? input.driverPhoto
      : '';

  return {
    status: 'accepted' as const,
    driverId: sanitizePlainText(input.driverId, 128),
    driverUid: sanitizePlainText(input.driverUid, 128),
    driverName: sanitizePlainText(input.driverName || 'নিবন্ধিত চালক', 100) || 'নিবন্ধিত চালক',
    driverCategory: sanitizePlainText(input.driverCategory || 'cng', 50) || 'cng',
    driverLat: lat,
    driverLng: lng,
    driverVehicleModel: sanitizePlainText(input.driverVehicleModel || 'যানবাহন', 100),
    driverLicensePlate: sanitizePlainText(input.driverLicensePlate || '', 50),
    driverPlateNumber: sanitizePlainText(input.driverPlateNumber || '', 50),
    driverPhoto: safePhoto,
    driverRating: clampFiniteNumber(input.driverRating ?? 5.0, 0, 5, 5.0),
    acceptedAt: sanitizePlainText(input.acceptedAt || new Date().toISOString(), 64),
    updatedAt: updatedAtValue,
  };
}

export function resolveTrackerTargetDriver<T extends { id: string }>(params: {
  activeSubmittedDriverId?: string | null;
  signedInDriverId?: string | null;
  drivers: readonly T[];
  statusCheckResult?: T | null;
}): T | null {
  const { activeSubmittedDriverId, signedInDriverId, drivers, statusCheckResult } = params;
  if (activeSubmittedDriverId) {
    const match = drivers.find((d) => d.id === activeSubmittedDriverId);
    if (match) return match;
  }
  if (signedInDriverId) {
    const match = drivers.find((d) => d.id === signedInDriverId);
    if (match) return match;
  }
  if (statusCheckResult) {
    const liveMatch = drivers.find((d) => d.id === statusCheckResult.id);
    return liveMatch || statusCheckResult;
  }
  return null;
}


