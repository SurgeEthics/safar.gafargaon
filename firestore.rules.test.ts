import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const rulesPath = path.resolve(process.cwd(), 'firestore.rules');
const blueprintPath = path.resolve(process.cwd(), 'firebase-blueprint.json');

const rulesText = fs.readFileSync(rulesPath, 'utf8');
const blueprint = JSON.parse(fs.readFileSync(blueprintPath, 'utf8'));

test('firestore.rules begins with rules_version = 2 and default-deny catch-all', () => {
  assert.match(rulesText, /^rules_version\s*=\s*'2';/);
  assert.match(rulesText, /match\s+\/\{document=\*\*\}\s*\{\s*allow read, write:\s*if false;\s*\}/);
});

test('all collections defined in firebase-blueprint.json have explicit match blocks', () => {
  const firestorePaths = Object.keys(blueprint.firestore || {});
  assert.ok(firestorePaths.length >= 10, 'Expected blueprint firestore paths');

  // Verify top-level and subcollection match names exist in firestore.rules
  const expectedMatchHeaders = [
    'match /admins/{adminId}',
    'match /drivers/{driverId}',
    'match /private/{docId}',
    'match /completed_trips/{tripId}',
    'match /stands/{standId}',
    'match /places/{placeId}',
    'match /categories/{categoryId}',
    'match /settings/{settingId}',
    'match /hotlines/{hotlineId}',
    'match /users/{userId}',
    'match /trips/{tripId}',
    'match /ride_requests/{requestId}',
    'match /driver_reviews/{reviewId}',
  ];

  for (const header of expectedMatchHeaders) {
    assert.ok(
      rulesText.includes(header),
      `Missing required match block in firestore.rules: ${header}`
    );
  }
});

test('Dirty Dozen #1 & #3: Verified email and bootstrapped admin checks enforced', () => {
  assert.ok(rulesText.includes("request.auth.token.email_verified == true"));
  assert.ok(rulesText.includes("request.auth.token.email == 'safar.gafargaon@gmail.com'"));
  assert.ok(rulesText.includes("function isBootstrappedAdmin()"));
});

test('Dirty Dozen #2 & #10: Strict hasAll / hasOnly schema guards and boundary checks', () => {
  assert.ok(!rulesText.includes('allow read, write: if true'), 'Forbidden open rule found');
  assert.ok(!rulesText.includes('allow write: if isSignedIn()'), 'Forbidden blanket signedIn write found');
  assert.ok(rulesText.includes('isValidId('), 'Missing ID poisoning regex guard');
  assert.ok(rulesText.includes('incoming().keys().hasAll('), 'Missing hasAll create guard');
  assert.ok(rulesText.includes('incoming().keys().hasOnly('), 'Missing hasOnly shadow-field guard');
  assert.ok(rulesText.includes('affectedKeys().hasOnly('), 'Missing update affectedKeys guard');
});

test('Dirty Dozen #4, #5, #6: PII & admin secrets isolated from public documents', () => {
  // Public drivers match block must not allow nidNumber, licenseNumber, phone, nidFrontPhoto
  const driversSectionStart = rulesText.indexOf('match /drivers/{driverId}');
  const driversPrivateStart = rulesText.indexOf('match /private/{docId}', driversSectionStart);
  const driversPublicBlock = rulesText.slice(driversSectionStart, driversPrivateStart);

  for (const piiKey of ["'phone'", "'nidNumber'", "'licenseNumber'", "'nidFrontPhoto'", "'taxTokenReceiptPhoto'"]) {
    assert.ok(
      !driversPublicBlock.includes(piiKey),
      `Public /drivers rule must NOT accept PII key ${piiKey}`
    );
  }

  // Ride requests public doc must not allow passengerPhone, driverPhone, otp
  const ridesStart = rulesText.indexOf('match /ride_requests/{requestId}');
  const ridesPrivateStart = rulesText.indexOf('match /private/{docId}', ridesStart);
  const ridesPublicBlock = rulesText.slice(ridesStart, ridesPrivateStart);

  for (const ridePii of ["'passengerPhone'", "'driverPhone'", "'otp'"]) {
    assert.ok(
      !ridesPublicBlock.includes(ridePii),
      `Public /ride_requests rule must NOT accept PII key ${ridePii}`
    );
  }

  // admin_security never readable publicly
  assert.ok(rulesText.includes("settingId == 'app_config' || isAdmin()"));
});

test('Dirty Dozen #7, #8, #9: State machine integrity, terminal state locking & identity binding', () => {
  assert.ok(rulesText.includes("!(existing().status in ['completed', 'cancelled', 'declined'])"));
  assert.ok(rulesText.includes("incoming().passengerUid == request.auth.uid"));
  assert.ok(rulesText.includes("incoming().ownerUid == request.auth.uid"));
  assert.ok(rulesText.includes("incoming().authorUid == request.auth.uid"));
  assert.ok(rulesText.includes("incoming().createdAt == request.time"));
  assert.ok(rulesText.includes("incoming().updatedAt == request.time"));
});

test('Dirty Dozen #11 & #12: No blanket client-delegated list queries or legacy shadow collections', () => {
  assert.ok(!rulesText.includes('allow list: if isSignedIn()'), 'Blanket list rule forbidden');
  assert.ok(!rulesText.includes('match /passengers/'), 'Obsolete passengers collection must stay denied');
  assert.ok(!rulesText.includes('match /whatsapp_verifications/'), 'Obsolete whatsapp_verifications must stay denied');
});

test('Rules safety: safe token claim guards, explicit key checks without .get(), and non-admin isOnline guards', () => {
  assert.ok(rulesText.includes("('email_verified' in request.auth.token)"));
  assert.ok(rulesText.includes("('email' in request.auth.token)"));
  assert.ok(!rulesText.includes('.get('), 'Use explicit key membership checks instead of .get()');
  assert.ok(rulesText.includes("!('isOnline' in incoming()) || incoming().isOnline == false"));
  assert.ok(rulesText.includes("('isVerified' in existing()) && existing().isVerified == true"));
});
