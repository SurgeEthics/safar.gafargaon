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
  assert.match(rulesText, /(?:incoming\(\)|d)\.keys\(\)\.hasAll\(/, 'Missing hasAll create guard');
  assert.match(rulesText, /(?:incoming\(\)|d)\.keys\(\)\.hasOnly\(/, 'Missing hasOnly shadow-field guard');
  assert.ok(rulesText.includes('affectedKeys().hasOnly('), 'Missing update affectedKeys guard');
});

test('Dirty Dozen #4, #5, #6: PII & admin secrets isolated from public documents', () => {
  // Public drivers match block + helper must not allow nidNumber, licenseNumber, phone, nidFrontPhoto
  const driversSectionStart = rulesText.indexOf('match /drivers/{driverId}');
  const driversPrivateStart = rulesText.indexOf('match /private/{docId}', driversSectionStart);
  const driversPublicBlock = rulesText.slice(driversSectionStart, driversPrivateStart);
  const driverHelpersBlock = rulesText.slice(
    rulesText.indexOf('function isValidDriverCoreFields'),
    rulesText.indexOf('function isValidDriverPrivateKyc')
  );

  for (const piiKey of ["'phone'", "'nidNumber'", "'licenseNumber'", "'nidFrontPhoto'", "'taxTokenReceiptPhoto'"]) {
    assert.ok(
      !driversPublicBlock.includes(piiKey) && !driverHelpersBlock.includes(piiKey),
      `Public /drivers rule must NOT accept PII key ${piiKey}`
    );
  }

  // Ride requests public doc must not allow passengerPhone, driverPhone, otp
  const ridesStart = rulesText.indexOf('match /ride_requests/{requestId}');
  const ridesPrivateStart = rulesText.indexOf('match /private/{docId}', ridesStart);
  const ridesPublicBlock = rulesText.slice(ridesStart, ridesPrivateStart);
  const rideHelpersBlock = rulesText.slice(
    rulesText.indexOf('function isValidRideCreateFields'),
    rulesText.indexOf('function isValidRidePrivateContact')
  );

  for (const ridePii of ["'passengerPhone'", "'driverPhone'", "'otp'"]) {
    assert.ok(
      !ridesPublicBlock.includes(ridePii) && !rideHelpersBlock.includes(ridePii),
      `Public /ride_requests rule must NOT accept PII key ${ridePii}`
    );
  }

  // admin_security never readable publicly
  assert.ok(rulesText.includes("settingId == 'app_config' || isAdmin()"));
});

test('Dirty Dozen #7, #8, #9: State machine integrity, terminal state locking & identity binding', () => {
  assert.match(rulesText, /!\((?:existing\(\)|prev)\.status in \['completed', 'cancelled', 'declined'\]\)/);
  assert.match(rulesText, /(?:incoming\(\)|d)\.passengerUid == request\.auth\.uid/);
  assert.match(rulesText, /(?:incoming\(\)|d)\.ownerUid == request\.auth\.uid/);
  assert.match(rulesText, /(?:incoming\(\)|d)\.authorUid == request\.auth\.uid/);
  assert.match(rulesText, /(?:incoming\(\)|d)\.createdAt == request\.time/);
  assert.match(rulesText, /(?:incoming\(\)|d)\.updatedAt == request\.time/);
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
  assert.match(rulesText, /!\('isOnline' in (?:incoming\(\)|d)\)\s*\|\|\s*(?:incoming\(\)|d)\.isOnline == false/);
  assert.match(rulesText, /\('isVerified' in (?:existing\(\)|prev)\)\s*&&\s*(?:existing\(\)|prev)\.isVerified == true/);
});

test('Firestore 1000-expression runtime limit regression guard: single-execution paths stay far below 1000 CEL nodes', () => {
  const fnRe = /function\s+(\w+)\s*\([^)]*\)\s*\{/g;
  const fns: Record<string, string> = {};
  let m: RegExpExecArray | null;
  while ((m = fnRe.exec(rulesText)) !== null) {
    let depth = 1;
    let i = m.index + m[0].length;
    while (i < rulesText.length && depth > 0) {
      if (rulesText[i] === '{') depth++;
      else if (rulesText[i] === '}') depth--;
      i++;
    }
    fns[m[1]] = rulesText.slice(m.index + m[0].length, i - 1);
  }

  function countStrictCel(expr: string, fnStack: string[] = []): number {
    let s = expr.replace(/\/\/.*$/gm, '');
    let count = 0;
    const strs = s.match(/'[^']*'/g);
    count += strs ? strs.length : 0;
    s = s.replace(/'[^']*'/g, ' ');
    const nums = s.match(/\b\d+(\.\d+)?\b/g);
    count += nums ? nums.length : 0;
    s = s.replace(/\b\d+(\.\d+)?\b/g, ' ');
    const ops = s.match(/&&|\|\||==|!=|<=|>=|<|>|!|\?|:|\bin\b|\bis\b/g);
    count += ops ? ops.length : 0;
    const paths = s.match(/\/databases\/[^\s)]+/g);
    if (paths) count += paths.length * 4;
    s = s.replace(/\/databases\/[^\s)]+/g, ' ');
    const ids = s.match(/\b[a-zA-Z_]\w*\b/g) || [];
    for (const id of ids) {
      if (id === 'return' || id === 'in' || id === 'is' || id === 'if') continue;
      if (fns[id] && !fnStack.includes(id)) {
        count += 1 + countStrictCel(fns[id], [...fnStack, id]);
      } else {
        count += 1;
      }
    }
    const selects = s.match(/\.|\[/g);
    count += selects ? selects.length : 0;
    return count;
  }

  // Extract all allow rule expressions
  const lines = rulesText.split('\n');
  let matchPath = '';
  let curAllow: { op: string; match: string; expr: string } | null = null;
  const worstStaticNonBranching: Array<{ label: string; count: number }> = [];

  for (const line of lines) {
    const mm = line.match(/^\s*match\s+(\S+)\s*\{/);
    if (mm) matchPath = mm[1];
    const am = line.match(/^\s*allow\s+([^:]+):/);
    if (am) curAllow = { op: am[1].trim(), match: matchPath, expr: '' };
    if (curAllow) {
      curAllow.expr += line + '\n';
      if (line.includes(';')) {
        const semiIdx = curAllow.expr.indexOf(';');
        const cond = curAllow.expr.slice(curAllow.expr.indexOf('if') + 2, semiIdx);
        worstStaticNonBranching.push({
          label: `${curAllow.match} ${curAllow.op}`,
          count: countStrictCel(cond),
        });
        curAllow = null;
      }
    }
  }

  // Every non-OR-heavy rule must stay < 950 statically; ride_requests update runs only 1 of 6 OR actions
  for (const item of worstStaticNonBranching) {
    if (item.label !== '/ride_requests/{requestId} update') {
      assert.ok(
        item.count < 950,
        `${item.label} strict CEL count (${item.count}) too close to 1000 limit`
      );
    }
  }

  // Non-admin driver registration create runtime path (short-circuits before isAdmin() branch)
  const nonAdminCreateExpr = `canCreateDriver(driverId, incoming())`;
  const fullCreateCount = countStrictCel(nonAdminCreateExpr);
  const skippedAdminBranch = countStrictCel('isAdmin() && isValidDriverStatusAndStats(d)');
  const nonAdminRuntimeCount = fullCreateCount - skippedAdminBranch;
  assert.ok(
    nonAdminRuntimeCount < 650,
    `Non-admin driver create runtime CEL count (${nonAdminRuntimeCount}) must stay well below 1000`
  );
});

