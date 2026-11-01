import test from 'node:test';
import assert from 'node:assert/strict';
import {
  checkAllVerificationsPassed,
  getDriverVerificationStatus,
  getCompletedVerificationCount,
  validateVerificationOtp,
  generateDriverVerificationSuccessMessage
} from './verification';

test('checkAllVerificationsPassed returns true only when all 3 are true', () => {
  assert.equal(checkAllVerificationsPassed({ licenseVerified: true, phoneVerified: true, nidVerified: true }), true);
  assert.equal(checkAllVerificationsPassed({ licenseVerified: true, phoneVerified: false, nidVerified: true }), false);
  assert.equal(checkAllVerificationsPassed({ licenseVerified: false, phoneVerified: true, nidVerified: true }), false);
  assert.equal(checkAllVerificationsPassed({ licenseVerified: true, phoneVerified: true, nidVerified: false }), false);
  assert.equal(checkAllVerificationsPassed({}), false);
});

test('getDriverVerificationStatus returns verified or pending', () => {
  assert.equal(getDriverVerificationStatus({ licenseVerified: true, phoneVerified: true, nidVerified: true }), 'verified');
  assert.equal(getDriverVerificationStatus({ licenseVerified: true, phoneVerified: false, nidVerified: true }), 'pending');
});

test('getCompletedVerificationCount returns correct count', () => {
  assert.equal(getCompletedVerificationCount({ licenseVerified: true, phoneVerified: true, nidVerified: true }), 3);
  assert.equal(getCompletedVerificationCount({ licenseVerified: true, phoneVerified: false, nidVerified: true }), 2);
  assert.equal(getCompletedVerificationCount({ licenseVerified: false, phoneVerified: false, nidVerified: false }), 0);
});

test('validateVerificationOtp validates 4 digit codes with demo support', () => {
  assert.equal(validateVerificationOtp('5892', '5892'), true);
  assert.equal(validateVerificationOtp('1234', '5892'), true); // Demo backup code
  assert.equal(validateVerificationOtp('9999', '5892'), false);
  assert.equal(validateVerificationOtp('589', '5892'), false);
  assert.equal(validateVerificationOtp('', '5892'), false);
});

test('generateDriverVerificationSuccessMessage produces formatted Bengali message', () => {
  const msg = generateDriverVerificationSuccessMessage('মোঃ রফিকুল ইসলাম', 'MYM-HA-11-5206', 'অটোরিকশা');
  assert.match(msg, /অভিনন্দন মোঃ রফিকুল ইসলাম/);
  assert.match(msg, /MYM-HA-11-5206/);
  assert.match(msg, /৩-স্তরের যাচাইকরণ/);
  assert.match(msg, /সক্রিয় \(Active\)/);
});
