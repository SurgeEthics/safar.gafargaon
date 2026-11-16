import { randomHex, sha256Hex, SUPER_ADMIN_EMAIL } from './security';

/**
 * Authentication, Google Super Admin verification, and salted SHA-256 optional
 * secondary lock PIN helpers for Safar Gafargaon Admin Control Panel.
 *
 * ZERO hardcoded passwords, PINs, or recovery secrets exist in this module.
 * Primary Admin authentication MUST use Firebase Google Sign-In verified as
 * SUPER_ADMIN_EMAIL (or explicit /admins/{uid} role grant in Firestore).
 */

export interface AdminPinConfig {
  pinHash?: string | null;
  hasCustomPin: boolean;
}

export interface PinChangeValidationResult {
  ok: boolean;
  normalizedPin?: string;
  message: string;
}

const BENGALI_TO_ENGLISH_DIGITS: Record<string, string> = {
  '০': '0',
  '১': '1',
  '২': '2',
  '৩': '3',
  '৪': '4',
  '৫': '5',
  '৬': '6',
  '৭': '7',
  '৮': '8',
  '৯': '9',
};

/**
 * Normalizes Bengali numerals ('০'..'৯') to ASCII ('0'..'9') and trims whitespace.
 */
export function normalizeAdminCredential(raw: string | null | undefined): string {
  if (typeof raw !== 'string') return '';
  return raw
    .trim()
    .replace(/[০-৯]/g, (ch) => BENGALI_TO_ENGLISH_DIGITS[ch] ?? ch);
}

/**
 * Verifies Google Auth Super Admin authorization.
 */
export function isAuthorizedAdminEmail(
  email: string | null | undefined,
  emailVerified: boolean | null | undefined
): boolean {
  if (emailVerified !== true || typeof email !== 'string') return false;
  return email.trim().toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();
}

/**
 * Creates a salted SHA-256 hash (`v2$<salt>$<hex>`) for optional secondary PIN lock.
 */
export async function hashAdminPin(rawPin: string, providedSalt?: string): Promise<string> {
  const normalized = normalizeAdminCredential(rawPin);
  const salt = providedSalt || randomHex(12);
  const digest = await sha256Hex(`${salt}:${normalized}`);
  return `v2$${salt}$${digest}`;
}

/**
 * Constant-time string comparison to avoid timing leaks on digests.
 */
function timingSafeStringEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

/**
 * Verifies an optional secondary lock PIN against a salted SHA-256 hash.
 */
export async function verifyAdminPinHash(
  input: string,
  config?: AdminPinConfig | null
): Promise<boolean> {
  if (!config?.hasCustomPin || !config.pinHash) {
    return false;
  }
  const normalizedInput = normalizeAdminCredential(input);
  if (!normalizedInput) return false;

  const parts = config.pinHash.split('$');
  if (parts.length !== 3 || parts[0] !== 'v2') {
    return false;
  }
  const [, salt, expectedDigest] = parts;
  if (!salt || !expectedDigest) return false;

  const candidateDigest = await sha256Hex(`${salt}:${normalizedInput}`);
  return timingSafeStringEqual(candidateDigest, expectedDigest);
}

/**
 * Validates new secondary PIN/password setup or update (minimum 4 chars, max 24).
 */
export function validateNewAdminPin(
  newPinInput: string,
  confirmPinInput: string
): PinChangeValidationResult {
  const normalizedNew = normalizeAdminCredential(newPinInput);
  const normalizedConfirm = normalizeAdminCredential(confirmPinInput);

  if (normalizedNew.length < 4) {
    return {
      ok: false,
      message: 'নতুন সেকেন্ডারি পিন কমপক্ষে ৪ অক্ষরের হতে হবে!'
    };
  }

  if (normalizedNew.length > 24) {
    return {
      ok: false,
      message: 'নতুন সেকেন্ডারি পিন সর্বোচ্চ ২৪ অক্ষরের হতে পারবে।'
    };
  }

  if (normalizedNew !== normalizedConfirm) {
    return {
      ok: false,
      message: 'নতুন পিন এবং কনফার্ম পিন মিলছে না!'
    };
  }

  return {
    ok: true,
    normalizedPin: normalizedNew,
    message: 'সেকেন্ডারি অ্যাডমিন লক পিন সফলভাবে সংরক্ষণ করা হয়েছে!'
  };
}
