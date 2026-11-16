import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validateSafeExternalUrl,
  sanitizePlainText,
  isValidBdCoordinate,
  clampFiniteNumber,
  stripPiiFields,
  createRateLimiter,
  sha256Hex,
} from './security';

test('validateSafeExternalUrl allows valid https public domains and rejects SSRF targets', () => {
  const ok = validateSafeExternalUrl('https://safar-live.example.workers.dev/');
  assert.equal(ok.ok, true);
  assert.equal(ok.normalizedUrl, 'https://safar-live.example.workers.dev');

  for (const bad of [
    'http://safar-live.example.com',
    'javascript:alert(1)',
    'https://localhost:3000/api',
    'https://127.0.0.1/admin',
    'https://169.254.169.254/latest/meta-data',
    'https://metadata.google.internal/computeMetadata/v1/',
    'https://10.0.0.5/internal',
    'https://192.168.1.1/',
    'https://user:pass@example.com/',
    '',
  ]) {
    assert.equal(validateSafeExternalUrl(bad).ok, false, `Expected reject for ${bad}`);
  }
});

test('sanitizePlainText removes control chars, brackets and limits length', () => {
  assert.equal(sanitizePlainText('  <script>alert(1)</script> গফরগাঁও \n\t '), 'scriptalert(1)/script গফরগাঁও');
  assert.equal(sanitizePlainText('abcdef', 4), 'abcd');
  assert.equal(sanitizePlainText(null), '');
});

test('isValidBdCoordinate and clampFiniteNumber validate numerical bounds', () => {
  assert.equal(isValidBdCoordinate(24.4536, 90.5479), true);
  assert.equal(isValidBdCoordinate(0, 0), false);
  assert.equal(isValidBdCoordinate(NaN, 90.5), false);
  assert.equal(clampFiniteNumber(999, 0, 500, 10), 500);
  assert.equal(clampFiniteNumber('not-a-number', 0, 500, 10), 10);
});

test('stripPiiFields removes phone, NID, license, OTP and pinHash', () => {
  const sanitized = stripPiiFields({
    id: 'drv-1',
    name: 'Rahim',
    phone: '01700000000',
    nidNumber: '1234567890',
    licenseNumber: 'BRTA-11',
    otp: '1234',
    pinHash: 'v2$abc$def',
    lat: 24.45,
  });
  assert.deepEqual(sanitized, { id: 'drv-1', name: 'Rahim', lat: 24.45 });
});

test('createRateLimiter enforces sliding window limit', () => {
  const limiter = createRateLimiter(2, 10000);
  assert.equal(limiter.consume(1000).allowed, true);
  assert.equal(limiter.consume(2000).allowed, true);
  const blocked = limiter.consume(3000);
  assert.equal(blocked.allowed, false);
  assert.ok(blocked.retryAfterSec >= 8);
  assert.equal(limiter.consume(15000).allowed, true);
});

test('sha256Hex returns deterministic 64-char digest', async () => {
  const digest = await sha256Hex('safar-test');
  assert.equal(digest.length, 64);
  assert.equal(digest, await sha256Hex('safar-test'));
});
