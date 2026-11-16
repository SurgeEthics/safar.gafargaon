import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeAdminCredential,
  isAuthorizedAdminEmail,
  hashAdminPin,
  verifyAdminPinHash,
  validateNewAdminPin,
} from './adminAuth';

test('normalizeAdminCredential converts Bengali digits and trims whitespace', () => {
  assert.equal(normalizeAdminCredential('  ৭৭৮৮ '), '7788');
  assert.equal(normalizeAdminCredential(' ২০২৬ '), '2026');
  assert.equal(normalizeAdminCredential(' Safar@২০২৬ '), 'Safar@2026');
  assert.equal(normalizeAdminCredential(null), '');
});

test('isAuthorizedAdminEmail requires exact email match and emailVerified === true', () => {
  assert.equal(isAuthorizedAdminEmail('safar.gafargaon@gmail.com', true), true);
  assert.equal(isAuthorizedAdminEmail('SAFAR.GAFARGAON@GMAIL.COM', true), true);
  assert.equal(isAuthorizedAdminEmail('safar.gafargaon@gmail.com', false), false);
  assert.equal(isAuthorizedAdminEmail('hacker@gmail.com', true), false);
  assert.equal(isAuthorizedAdminEmail(null, true), false);
});

test('hashAdminPin and verifyAdminPinHash verify salted SHA-256 PINs securely', async () => {
  const hash = await hashAdminPin('৯৫৮৫');
  assert.ok(hash.startsWith('v2$'));

  const config = { pinHash: hash, hasCustomPin: true };
  assert.equal(await verifyAdminPinHash('9585', config), true);
  assert.equal(await verifyAdminPinHash('৯৫৮৫', config), true);
  assert.equal(await verifyAdminPinHash('7788', config), false);
  assert.equal(await verifyAdminPinHash('', config), false);
  assert.equal(await verifyAdminPinHash('9585', { pinHash: hash, hasCustomPin: false }), false);
});

test('validateNewAdminPin validates length and confirmation', () => {
  assert.equal(validateNewAdminPin('12', '12').ok, false);
  assert.equal(validateNewAdminPin('1234', '5678').ok, false);
  assert.equal(validateNewAdminPin('a'.repeat(25), 'a'.repeat(25)).ok, false);
  const okRes = validateNewAdminPin('Safar#99', 'Safar#99');
  assert.equal(okRes.ok, true);
  assert.equal(okRes.normalizedPin, 'Safar#99');
});
