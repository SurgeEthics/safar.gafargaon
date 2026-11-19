import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isVerifiedGoogleSession,
  resolveDriverPhoneForKyc,
  canAcceptDirectPassengerMirror,
  mergeRideRequestMaps,
} from './roleAuth.ts';

test('isVerifiedGoogleSession requires both uid and emailVerified=true', () => {
  assert.equal(isVerifiedGoogleSession(null), false);
  assert.equal(isVerifiedGoogleSession(undefined), false);
  assert.equal(isVerifiedGoogleSession({ uid: '', emailVerified: true }), false);
  assert.equal(isVerifiedGoogleSession({ uid: 'u1', emailVerified: false }), false);
  assert.equal(isVerifiedGoogleSession({ uid: 'u1', emailVerified: true }), true);
});

test('resolveDriverPhoneForKyc checks Firestore length & digit constraints', () => {
  assert.deepEqual(resolveDriverPhoneForKyc(''), { valid: false, trimmed: '', digitsCount: 0 });
  assert.deepEqual(resolveDriverPhoneForKyc('0171'), { valid: false, trimmed: '0171', digitsCount: 4 });
  assert.deepEqual(resolveDriverPhoneForKyc('01304841550'), {
    valid: true,
    trimmed: '01304841550',
    digitsCount: 11,
  });
  assert.deepEqual(resolveDriverPhoneForKyc('  +880 1304-841550  '), {
    valid: true,
    trimmed: '+880 1304-841550',
    digitsCount: 13,
  });
});

test('canAcceptDirectPassengerMirror prevents cross-role state bleed', () => {
  assert.equal(canAcceptDirectPassengerMirror(null, 'p-uid-1'), false);
  assert.equal(canAcceptDirectPassengerMirror('p-uid-1', null), false);
  assert.equal(canAcceptDirectPassengerMirror('p-uid-1', 'p-uid-2'), false);
  assert.equal(canAcceptDirectPassengerMirror('p-uid-1', 'p-uid-1'), true);
});

test('mergeRideRequestMaps deduplicates across role streams and prefers newest updatedAtMs', () => {
  const passengerMap = new Map([
    ['req-1', { status: 'pending', createdAtMs: 1000, updatedAtMs: 1000 }],
    ['req-2', { status: 'accepted', createdAtMs: 2000, updatedAtMs: 2500 }],
  ]);
  const driverMap = new Map([
    ['req-1', { status: 'accepted', driverUid: 'd-1', createdAtMs: 1000, updatedAtMs: 3000 }],
    ['req-3', { status: 'pending', createdAtMs: 1500, updatedAtMs: 1500 }],
  ]);

  const merged = mergeRideRequestMaps([passengerMap, driverMap]);
  assert.equal(merged.length, 3);
  assert.deepEqual(merged.map((m) => m.id), ['req-2', 'req-3', 'req-1']);
  const req1 = merged.find((m) => m.id === 'req-1');
  assert.equal(req1?.data.status, 'accepted');
  assert.equal((req1?.data as any).driverUid, 'd-1');
});
