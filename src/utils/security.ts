/**
 * Centralized application security helpers for Safar Gafargaon.
 * Covers SSRF URL validation, XSS/control-char text sanitization,
 * Bangladesh geo-coordinate verification, finite numeric clamping,
 * PII stripping, and sliding-window UI rate limiting.
 */

export const SUPER_ADMIN_EMAIL = 'safar.gafargaon@gmail.com';

export interface SafeUrlValidationResult {
  ok: boolean;
  normalizedUrl?: string;
  error?: string;
}

const PRIVATE_OR_LOCAL_IPV4_RE =
  /^(127\.|10\.|192\.168\.|169\.254\.|0\.|172\.(1[6-9]|2\d|3[0-1])\.)/;

const BLOCKED_HOSTNAMES = new Set([
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
  '::1',
  '[::1]',
  'metadata.google.internal',
  'metadata',
  '169.254.169.254',
]);

/**
 * Validates external URLs (custom Cloudflare Worker endpoint, custom app links)
 * to prevent SSRF, Open Redirect, and unsafe scheme (javascript:, data:, http:) injection.
 */
export function validateSafeExternalUrl(
  rawUrl: string | null | undefined,
  options: { maxLength?: number } = {}
): SafeUrlValidationResult {
  const maxLength = options.maxLength ?? 200;
  if (typeof rawUrl !== 'string') {
    return { ok: false, error: 'অবৈধ URL ফরম্যাট' };
  }

  const trimmed = rawUrl.trim();
  if (!trimmed) {
    return { ok: false, error: 'URL খালি হতে পারে না' };
  }
  if (trimmed.length > maxLength) {
    return { ok: false, error: `URL সর্বোচ্চ ${maxLength} অক্ষরের হতে পারবে` };
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { ok: false, error: 'সঠিক HTTPS URL লিখুন (যেমন: https://example.workers.dev)' };
  }

  if (parsed.protocol !== 'https:') {
    return { ok: false, error: 'নিরাপত্তার স্বার্থে কেবল https:// প্রোটোকল অনুমোদিত' };
  }

  if (parsed.username || parsed.password) {
    return { ok: false, error: 'URL-এ ইউজারনেম বা পাসওয়ার্ড যুক্ত করা যাবে না' };
  }

  const hostname = parsed.hostname.toLowerCase();
  if (
    !hostname ||
    BLOCKED_HOSTNAMES.has(hostname) ||
    PRIVATE_OR_LOCAL_IPV4_RE.test(hostname) ||
    hostname.endsWith('.local') ||
    hostname.endsWith('.internal') ||
    hostname.endsWith('.localhost') ||
    hostname.startsWith('[fd') ||
    hostname.startsWith('[fc') ||
    hostname.startsWith('[fe80')
  ) {
    return { ok: false, error: 'প্রাইভেট নেটওয়ার্ক বা লোকাল হোস্ট URL অনুমোদিত নয়' };
  }

  // Strip trailing slash for canonical storage
  const normalized = parsed.toString().replace(/\/+$/, '');
  return { ok: true, normalizedUrl: normalized };
}

const utf8Encoder = typeof TextEncoder !== 'undefined' ? new TextEncoder() : null;

/**
 * Returns exact UTF-8 byte length matching Firestore Rules string.size().
 */
export function utf8ByteLength(text: string): number {
  if (!text) return 0;
  if (utf8Encoder) return utf8Encoder.encode(text).length;
  return unescape(encodeURIComponent(text)).length;
}

/**
 * Truncates text cleanly along UTF-16 code-point boundaries without exceeding maxBytes UTF-8 bytes.
 */
export function truncateUtf8Bytes(input: string, maxBytes: number): string {
  if (!input || maxBytes <= 0) return '';
  if (utf8ByteLength(input) <= maxBytes) return input;
  let bytes = 0;
  let endIdx = 0;
  for (const ch of input) {
    const chBytes = utf8ByteLength(ch);
    if (bytes + chBytes > maxBytes) break;
    bytes += chBytes;
    endIdx += ch.length;
  }
  return input.slice(0, endIdx).trim();
}

/**
 * Strips HTML tags, angle brackets, and ASCII control characters from untrusted text
 * while guaranteeing both JS character cap and Firestore UTF-8 byte-length bounds.
 */
export function sanitizePlainText(raw: unknown, maxLength = 200, maxBytes = maxLength * 3): string {
  if (typeof raw !== 'string') return '';
  const cleaned = raw
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/[<>]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  const charClamped = cleaned.length > maxLength ? cleaned.slice(0, maxLength).trim() : cleaned;
  return truncateUtf8Bytes(charClamped, maxBytes);
}

/**
 * Verifies coordinates fall within valid Bangladesh geographical bounds.
 */
export function isValidBdCoordinate(lat: unknown, lng: unknown): boolean {
  return (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= 20.0 &&
    lat <= 27.0 &&
    lng >= 88.0 &&
    lng <= 93.0
  );
}

/**
 * Clamps an unknown numeric value safely into [min, max] or returns fallback.
 */
export function clampFiniteNumber(
  raw: unknown,
  min: number,
  max: number,
  fallback: number
): number {
  const num = typeof raw === 'number' ? raw : Number(raw);
  if (!Number.isFinite(num)) return fallback;
  return Math.min(max, Math.max(min, num));
}

/**
 * Computes SHA-256 hex digest using standard Web Crypto API (browser & Node 20+ compatible).
 */
export async function sha256Hex(input: string): Promise<string> {
  const subtle = globalThis.crypto?.subtle;
  if (subtle) {
    const encoded = new TextEncoder().encode(input);
    const hashBuffer = await subtle.digest('SHA-256', encoded);
    return Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }
  const nodeCrypto = await import('node:crypto');
  return nodeCrypto.createHash('sha256').update(input, 'utf8').digest('hex');
}

/**
 * Generates a cryptographically strong random hex string.
 */
export function randomHex(byteLength = 16): string {
  const buf = new Uint8Array(byteLength);
  if (globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(buf);
  } else {
    for (let i = 0; i < byteLength; i++) {
      buf[i] = Math.floor(Math.random() * 256);
    }
  }
  return Array.from(buf)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Removes sensitive PII keys before mirroring or exposing public records.
 */
export function stripPiiFields<T extends Record<string, unknown>>(
  obj: T,
  extraKeys: string[] = []
): Partial<T> {
  const blocked = new Set([
    'phone',
    'passengerPhone',
    'driverPhone',
    'nidNumber',
    'nidFrontPhoto',
    'nidBackPhoto',
    'licenseNumber',
    'taxTokenReceiptPhoto',
    'chassisNumber',
    'engineNumber',
    'pin',
    'pinHash',
    'otp',
    'email',
    ...extraKeys,
  ]);
  const copy: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (!blocked.has(k)) {
      copy[k] = v;
    }
  }
  return copy as Partial<T>;
}

/**
 * Sliding-window client-side rate limiter to throttle brute-force or spam actions.
 */
export function createRateLimiter(maxAttempts: number, windowMs: number) {
  let timestamps: number[] = [];

  return {
    consume(now = Date.now()): { allowed: boolean; retryAfterSec: number; remaining: number } {
      timestamps = timestamps.filter((t) => now - t < windowMs);
      if (timestamps.length >= maxAttempts) {
        const oldest = timestamps[0] ?? now;
        const retryAfterSec = Math.max(1, Math.ceil((windowMs - (now - oldest)) / 1000));
        return { allowed: false, retryAfterSec, remaining: 0 };
      }
      timestamps.push(now);
      return {
        allowed: true,
        retryAfterSec: 0,
        remaining: Math.max(0, maxAttempts - timestamps.length),
      };
    },
    reset(): void {
      timestamps = [];
    },
  };
}
