import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_ADMIN_PINS,
  MASTER_ADMIN_RECOVERY_CODE,
  normalizeAdminCredential,
  verifyAdminPin,
  validateAdminPinChange,
  verifyMasterRecoveryCode,
} from './adminAuth';

test('normalizeAdminCredential converts Bengali digits and trims whitespace', () => {
  assert.equal(normalizeAdminCredential('  ৭৭৮৮ '), '7788');
  assert.equal(normalizeAdminCredential(' ২০২৬ '), '2026');
  assert.equal(normalizeAdminCredential(' Safar@২০২৬ '), 'Safar@2026');
  assert.equal(normalizeAdminCredential(null), '');
});

test('verifyAdminPin accepts default PINs when no custom PIN is configured', () => {
  for (const pin of DEFAULT_ADMIN_PINS) {
    assert.equal(verifyAdminPin(pin), true);
  }
  assert.equal(verifyAdminPin('৭৭৮৮'), true);
  assert.equal(verifyAdminPin('0000'), false);
  assert.equal(verifyAdminPin(''), false);
});

test('verifyAdminPin enforces custom PIN and rejects old default PINs once customized', () => {
  const config = { customPin: '9595', hasCustomPin: true };
  assert.equal(verifyAdminPin('9595', config), true);
  assert.equal(verifyAdminPin('৯৫৯৫', config), true);
  assert.equal(verifyAdminPin('7788', config), false);
  assert.equal(verifyAdminPin('2026', config), false);
});

test('validateAdminPinChange validates current PIN, length, confirmation, and reserved recovery code', () => {
  // Wrong current PIN
  const badCurrent = validateAdminPinChange('1111', '9090', '9090', {
    customPin: null,
    hasCustomPin: false,
  });
  assert.equal(badCurrent.ok, false);

  // Too short (< 4 chars)
  const tooShort = validateAdminPinChange('7788', '12', '12', {
    customPin: null,
    hasCustomPin: false,
  });
  assert.equal(tooShort.ok, false);

  // Mismatched confirmation
  const mismatch = validateAdminPinChange('7788', '4567', '4568', {
    customPin: null,
    hasCustomPin: false,
  });
  assert.equal(mismatch.ok, false);

  // Disallow setting to master recovery code
  const reserved = validateAdminPinChange(
    '7788',
    MASTER_ADMIN_RECOVERY_CODE,
    MASTER_ADMIN_RECOVERY_CODE
  );
  assert.equal(reserved.ok, false);

  // Valid update (numeric or alphanumeric)
  const valid = validateAdminPinChange('7788', 'Safar#99', 'Safar#99', {
    customPin: null,
    hasCustomPin: false,
  });
  assert.equal(valid.ok, true);
  assert.equal(valid.normalizedPin, 'Safar#99');

  // Chained update using newly set custom PIN
  const secondChange = validateAdminPinChange('Safar#99', '8844', '8844', {
    customPin: valid.normalizedPin!,
    hasCustomPin: true,
  });
  assert.equal(secondChange.ok, true);
  assert.equal(secondChange.normalizedPin, '8844');
});

test('verifyMasterRecoveryCode accepts master code in English or Bengali digits', () => {
  assert.equal(verifyMasterRecoveryCode('77882026'), true);
  assert.equal(verifyMasterRecoveryCode(' ৭৭৮৮২০২৬ '), true);
  assert.equal(verifyMasterRecoveryCode('7788'), false);
});
