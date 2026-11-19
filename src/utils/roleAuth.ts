export interface MinimalAuthSessionUser {
  uid?: string | null;
  emailVerified?: boolean | null;
}

/**
 * Verifies that a Firebase Auth user object represents a signed-in, email-verified account.
 */
export function isVerifiedGoogleSession(user: MinimalAuthSessionUser | null | undefined): boolean {
  return Boolean(user && typeof user.uid === 'string' && user.uid.length > 0 && user.emailVerified === true);
}

/**
 * Validates and cleans a phone number string so it satisfies Firestore KYC string length rules
 * (min 5 chars, max 20 chars) while preserving user formatting.
 */
export function resolveDriverPhoneForKyc(rawPhone: string | null | undefined): {
  valid: boolean;
  trimmed: string;
  digitsCount: number;
} {
  const trimmed = typeof rawPhone === 'string' ? rawPhone.trim() : '';
  const digitsCount = trimmed.replace(/[^0-9]/g, '').length;
  return {
    valid: trimmed.length >= 5 && trimmed.length <= 20 && digitsCount >= 5,
    trimmed,
    digitsCount,
  };
}

/**
 * Guards whether a Driver's local UI action (accepting/completing a request) may directly
 * update the Passenger booking state in the same browser tab. Only permitted when the
 * Passenger session in that browser actually owns that targetPassengerUid.
 */
export function canAcceptDirectPassengerMirror(
  passengerSessionUid: string | null | undefined,
  targetPassengerUid: string | null | undefined
): boolean {
  if (!passengerSessionUid || !targetPassengerUid) return false;
  return passengerSessionUid === targetPassengerUid;
}

/**
 * Merges multiple role-scoped ride_requests document Maps into a single deduplicated,
 * newest-first list, preserving the freshest snapshot entry on ID collisions.
 */
export function mergeRideRequestMaps<T extends { createdAtMs?: number; updatedAtMs?: number }>(
  maps: ReadonlyArray<ReadonlyMap<string, T>>
): Array<{ id: string; data: T }> {
  const combined = new Map<string, T>();

  for (const map of maps) {
    for (const [id, item] of map.entries()) {
      const existing = combined.get(id);
      if (!existing) {
        combined.set(id, item);
      } else {
        const existingTs = Number(existing.updatedAtMs || existing.createdAtMs || 0);
        const candidateTs = Number(item.updatedAtMs || item.createdAtMs || 0);
        if (candidateTs >= existingTs) {
          combined.set(id, { ...existing, ...item });
        }
      }
    }
  }

  return Array.from(combined.entries())
    .map(([id, data]) => ({ id, data }))
    .sort((a, b) => Number(b.data.createdAtMs || 0) - Number(a.data.createdAtMs || 0));
}
