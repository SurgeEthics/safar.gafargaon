/**
 * Driver Verification Rules & Notification Generator for Safar App.
 * Pure logic decoupled from UI for deterministic testing and reliable state management.
 */

export interface VerificationFlags {
  licenseVerified?: boolean;
  phoneVerified?: boolean;
  nidVerified?: boolean;
}

/**
 * Returns true only when all three verification pillars (BRTA, Phone/WhatsApp, NID) are verified.
 */
export function checkAllVerificationsPassed(flags: VerificationFlags): boolean {
  return Boolean(flags.licenseVerified && flags.phoneVerified && flags.nidVerified);
}

/**
 * Derives the official verification status label.
 */
export function getDriverVerificationStatus(flags: VerificationFlags): 'verified' | 'pending' {
  return checkAllVerificationsPassed(flags) ? 'verified' : 'pending';
}

/**
 * Counts how many of the 3 verification steps have been approved.
 */
export function getCompletedVerificationCount(flags: VerificationFlags): number {
  return [flags.licenseVerified, flags.phoneVerified, flags.nidVerified].filter(Boolean).length;
}

/**
 * Generates a standard 4-digit security OTP code.
 */
export function generateVerificationOtp(): string {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

/**
 * Validates entered OTP against expected code, supporting demo backup '1234'.
 */
export function validateVerificationOtp(enteredOtp: string, expectedOtp: string): boolean {
  const trimmed = enteredOtp.trim();
  if (!trimmed || trimmed.length !== 4) return false;
  return trimmed === expectedOtp.trim() || trimmed === '1234';
}

/**
 * Generates official SMS / WhatsApp message sent to the driver upon successful 3-tier verification.
 */
export function generateDriverVerificationSuccessMessage(
  driverName: string,
  plateNumber: string,
  categoryBengali?: string
): string {
  return `অভিনন্দন ${driverName}! সফর (Safar) অ্যাপে আপনার ড্রাইভার প্রোফাইল ৩-স্তরের যাচাইকরণ (১. বিআরটিএ লাইসেন্স ও ট্যাক্স টোকেন, ২. মোবাইল ও WhatsApp এবং ৩. জাতীয় পরিচয়পত্র) সফলভাবে সম্পন্ন হয়েছে। আপনার গাড়ি (${plateNumber}${categoryBengali ? ` - ${categoryBengali}` : ''}) এখন শতভাগ ভেরিফাইড ও সক্রিয় (Active)। এখন থেকে আপনি সরাসরি যাত্রীদের বুকিং ও কল গ্রহণ করতে পারবেন।`;
}

/**
 * Generates WhatsApp direct chat verification request link message.
 */
export function generateWhatsAppVerificationMessage(driverName: string, otpCode: string): string {
  return `সালাম ${driverName}, সফর (Safar) অ্যাপে আপনার চালক নিবন্ধন যাচাইকরণ কোড: ${otpCode}। অনুগ্রহ করে অ্যাডমিনকে এই কোডটি নিশ্চিত করুন।`;
}
