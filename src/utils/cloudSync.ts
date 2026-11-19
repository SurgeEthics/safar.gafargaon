import { clampFiniteNumber, sanitizePlainText } from './security';

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

