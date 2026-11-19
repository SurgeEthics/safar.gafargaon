import test from 'node:test';
import assert from 'node:assert/strict';
import {
  mergePassengerProfileSafely,
  buildPassengerTripFirestoreDoc,
  reconcileFirestoreDriversList,
  findPassengerPendingRequestFromCloud,
  computeDriverStatsFromCompletedTrips,
  isCloudflareStaticHtmlResponse,
  buildSafeUserProfileWritePayload,
  resolveTripCreatedAtMs,
} from './cloudSync';

test('mergePassengerProfileSafely never overwrites cloud profile on read timeout', () => {
  const res = mergePassengerProfileSafely({
    authUser: {
      uid: 'uid-p1',
      email: 'user@gmail.com',
      displayName: 'Rafiq',
      photoURL: 'https://example.com/p.jpg',
    },
    existingCloudData: null,
    readSucceeded: false,
  });

  assert.equal(res.shouldCreateDoc, false);
  assert.equal(res.createPayload, null);
  assert.equal(res.profile.name, 'Rafiq');
  assert.equal(res.profile.isLoggedIn, true);
});

test('mergePassengerProfileSafely preserves cloud phone, homeLocation, and emergencyContact across devices', () => {
  const res = mergePassengerProfileSafely({
    authUser: {
      uid: 'uid-p1',
      email: 'user@gmail.com',
      displayName: 'Auth Name',
      photoURL: 'https://example.com/auth.jpg',
    },
    existingCloudData: {
      name: 'রফিকুল ইসলাম',
      phone: '01711223344',
      homeLocation: 'গফরগাঁও রেলওয়ে স্টেশন',
      emergencyContact: '01811223344',
      photoUrl: 'https://example.com/cloud.jpg',
    },
    readSucceeded: true,
  });

  assert.equal(res.shouldCreateDoc, false);
  assert.equal(res.profile.name, 'রফিকুল ইসলাম');
  assert.equal(res.profile.phone, '01711223344');
  assert.equal(res.profile.homeLocation, 'গফরগাঁও রেলওয়ে স্টেশন');
  assert.equal(res.profile.emergencyContact, '01811223344');
  assert.equal(res.profile.photoUrl, 'https://example.com/cloud.jpg');
});

test('mergePassengerProfileSafely creates bootstrap doc only when readSucceeded and doc missing', () => {
  const res = mergePassengerProfileSafely({
    authUser: {
      uid: 'uid-new',
      email: 'new@gmail.com',
      displayName: 'নতুন যাত্রী',
    },
    existingCloudData: null,
    readSucceeded: true,
  });

  assert.equal(res.shouldCreateDoc, true);
  assert.equal(res.createPayload?.uid, 'uid-new');
  assert.equal(res.createPayload?.role, 'passenger');
});

test('buildPassengerTripFirestoreDoc enforces 160-char rule limits and exact allowed keys', () => {
  const longText = 'ক'.repeat(210);
  const payload = buildPassengerTripFirestoreDoc(
    {
      id: 'trip-req-1',
      pickupPoint: longText,
      destination: longText,
      driverName: 'করিম মিয়া',
      driverPhone: '01700001111',
      vehicleCategory: 'cng',
      vehicleModel: 'বাজাজ সিএনজি',
      plateNumber: 'ময়মনসিংহ-থ-১১-১২৩৪',
      fare: 120,
      status: 'সম্পন্ন',
      ratingGiven: 5,
      createdAtMs: 1700000000000,
    },
    'SERVER_TS'
  );

  assert.equal(payload.pickupPoint.length, 160);
  assert.equal(payload.destination.length, 160);
  assert.equal('requestId' in payload, false);
  assert.equal(payload.createdAt, 'SERVER_TS');
});

test('reconcileFirestoreDriversList treats Firestore as sole authority and protects private PII', () => {
  const firestoreDrivers = [
    { id: 'drv-1', ownerUid: 'owner-1', name: 'Driver One', phone: '', licenseNumber: '' },
    { id: 'drv-2', ownerUid: 'owner-2', name: 'Driver Two', phone: '', licenseNumber: '' },
  ];
  const prevDrivers = [
    { id: 'drv-1', ownerUid: 'owner-1', name: 'Driver One', phone: '01711111111', licenseNumber: 'BRTA-1' },
    { id: 'drv-2', ownerUid: 'owner-2', name: 'Driver Two', phone: '01722222222', licenseNumber: 'BRTA-2' },
    { id: 'deleted-default', ownerUid: 'admin', name: 'Should Stay Deleted', phone: '01799999999' },
  ];

  const reconciled = reconcileFirestoreDriversList({
    firestoreDrivers,
    prevDrivers,
    canRetainPrivateFields: (drv) => drv.ownerUid === 'owner-1',
  });

  assert.equal(reconciled.length, 2);
  assert.equal(reconciled.some((d) => d.id === 'deleted-default'), false);
  assert.equal(reconciled[0].phone, '01711111111');
  assert.equal(reconciled[1].phone, '');
});

test('findPassengerPendingRequestFromCloud hydrates newest pending request for signed-in passenger', () => {
  const liveList = [
    { id: 'req-1', passengerUid: 'p1', status: 'pending', createdAtMs: 1000 },
    { id: 'req-2', passengerUid: 'p2', status: 'pending', createdAtMs: 2000 },
    { id: 'req-3', passengerUid: 'p1', status: 'pending', createdAtMs: 3000 },
    { id: 'req-4', passengerUid: 'p1', status: 'accepted', createdAtMs: 4000 },
  ];

  const match = findPassengerPendingRequestFromCloud(liveList, 'p1');
  assert.equal(match?.id, 'req-3');

  const excluded = findPassengerPendingRequestFromCloud(liveList, 'p1', new Set(['req-3']));
  assert.equal(excluded?.id, 'req-1');
});

test('computeDriverStatsFromCompletedTrips computes accurate daily and total stats from cloud records', () => {
  const res = computeDriverStatsFromCompletedTrips(
    [
      { id: 't1', date: '2026-11-18', fare: 80, createdAtMs: 100 },
      { id: 't2', date: '2026-11-17', fare: 120, createdAtMs: 50 },
      { id: 't3', date: '2026-11-18', fare: 150, createdAtMs: 200 },
    ],
    '2026-11-18'
  );

  assert.equal(res.todayTrips, 2);
  assert.equal(res.todayEarnings, 230);
  assert.equal(res.totalTrips, 3);
  assert.equal(res.trips[0].id, 't3');
});

test('isCloudflareStaticHtmlResponse identifies SPA HTML fallback cleanly', () => {
  assert.equal(isCloudflareStaticHtmlResponse('text/html; charset=utf-8'), true);
  assert.equal(isCloudflareStaticHtmlResponse('application/json'), false);
});

test('buildSafeUserProfileWritePayload clamps all fields to firestore.rules limits', () => {
  const payload = buildSafeUserProfileWritePayload(
    {
      uid: 'u1',
      name: 'ক'.repeat(140),
      email: 'a'.repeat(200),
      phone: '0'.repeat(35),
      homeLocation: 'খ'.repeat(220),
      emergencyContact: 'গ'.repeat(100),
      photoUrl: 'https://x.com/' + 'p'.repeat(600),
      role: 'passenger',
    },
    'TS'
  );

  assert.equal(payload.name.length, 100);
  assert.equal(payload.email.length, 150);
  assert.equal(payload.phone.length, 20);
  assert.equal(payload.homeLocation.length, 180);
  assert.equal(payload.emergencyContact.length, 80);
  assert.equal(payload.photoUrl.length, 500);
  assert.equal(payload.updatedAt, 'TS');
});

test('resolveTripCreatedAtMs supports numeric, Timestamp-like, and ISO string dates', () => {
  assert.equal(resolveTripCreatedAtMs(123456, undefined), 123456);
  assert.equal(resolveTripCreatedAtMs(undefined, { toMillis: () => 999999 }), 999999);
  assert.equal(resolveTripCreatedAtMs(undefined, { seconds: 500 }), 500000);
  assert.equal(resolveTripCreatedAtMs(undefined, '2026-11-18T10:00:00.000Z'), Date.parse('2026-11-18T10:00:00.000Z'));
});
