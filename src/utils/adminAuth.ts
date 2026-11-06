/**
 * Pure authentication, password/PIN validation, and master recovery helpers
 * for the Safar Gafargaon Admin Control Panel.
 */

export const DEFAULT_ADMIN_PINS = ['7788', '2026'] as const;
export const MASTER_ADMIN_RECOVERY_CODE = '77882026';

export interface AdminPinConfig {
  customPin: string | null;
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
 * Preserves case and symbols for alphanumeric admin passwords.
 */
export function normalizeAdminCredential(raw: string | null | undefined): string {
  if (typeof raw !== 'string') return '';
  return raw
    .trim()
    .replace(/[০-৯]/g, (ch) => BENGALI_TO_ENGLISH_DIGITS[ch] ?? ch);
}

/**
 * Verifies an admin PIN/password attempt against either the customized PIN
 * (when configured) or the default Safar admin PINs ('7788' / '2026').
 */
export function verifyAdminPin(
  input: string,
  config?: AdminPinConfig | null
): boolean {
  const normalizedInput = normalizeAdminCredential(input);
  if (!normalizedInput) return false;

  if (config?.hasCustomPin && config.customPin) {
    const normalizedCustom = normalizeAdminCredential(config.customPin);
    if (normalizedCustom.length > 0) {
      return normalizedInput === normalizedCustom;
    }
  }

  return (DEFAULT_ADMIN_PINS as readonly string[]).includes(normalizedInput);
}

/**
 * Validates a request to change the Admin Panel password/PIN inside the dedicated
 * Admin Control Panel slot.
 */
export function validateAdminPinChange(
  currentPinInput: string,
  newPinInput: string,
  confirmPinInput: string,
  config?: AdminPinConfig | null
): PinChangeValidationResult {
  if (!verifyAdminPin(currentPinInput, config)) {
    return {
      ok: false,
      message: 'বর্তমান অ্যাডমিন পিন বা পাসওয়ার্ডটি সঠিক নয়!'
    };
  }

  const normalizedNew = normalizeAdminCredential(newPinInput);
  const normalizedConfirm = normalizeAdminCredential(confirmPinInput);

  if (normalizedNew.length < 4) {
    return {
      ok: false,
      message: 'নতুন পাসওয়ার্ড বা পিন কমপক্ষে ৪ অক্ষরের হতে হবে!'
    };
  }

  if (normalizedNew.length > 24) {
    return {
      ok: false,
      message: 'নতুন পাসওয়ার্ড বা পিন সর্বোচ্চ ২৪ অক্ষরের হতে পারবে।'
    };
  }

  if (normalizedNew !== normalizedConfirm) {
    return {
      ok: false,
      message: 'নতুন পাসওয়ার্ড এবং কনফার্ম পাসওয়ার্ড মিলছে না!'
    };
  }

  if (normalizedNew === MASTER_ADMIN_RECOVERY_CODE) {
    return {
      ok: false,
      message: 'অনুগ্রহ করে মাস্টার রিকভারি কোড ব্যতীত অন্য পাসওয়ার্ড বা পিন দিন।'
    };
  }

  return {
    ok: true,
    normalizedPin: normalizedNew,
    message: 'অ্যাডমিন প্যানেল পাসওয়ার্ড / পিন সফলভাবে পরিবর্তন করা হয়েছে!'
  };
}

/**
 * Verifies the owner's Master Recovery Code to reset a forgotten custom PIN
 * back to the default ('7788').
 */
export function verifyMasterRecoveryCode(codeInput: string): boolean {
  return normalizeAdminCredential(codeInput) === MASTER_ADMIN_RECOVERY_CODE;
}
