import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeCleanPhone,
  formatSafeRating,
  findMatchingIncomingRideRequest,
  mergeAcceptedRequestIntoList,
  RideRequestCandidate,
} from './rideMatching';

const makeReq = (overrides: Partial<RideRequestCandidate> = {}): RideRequestCandidate => ({
  id: 'req-1750000000000',
  passengerName: 'আহসান হাবিব',
  passengerPhone: '01711000001',
  pickupPoint: 'গফরগাঁও রেলওয়ে স্টেশন স্ট্যান্ড',
  destination: 'উপজেলা স্বাস্থ্য কমপ্লেক্স',
  category: 'cng',
  requestedAt: 'এইমাত্র',
  distanceKm: 1.4,
  estFare: 50,
  status: 'pending',
  createdAtMs: 1750000000000,
  ...overrides,
});

test('normalizeCleanPhone and formatSafeRating handle undefined and malformed values safely', () => {
  assert.equal(normalizeCleanPhone(undefined), '');
  assert.equal(normalizeCleanPhone(null), '');
  assert.equal(normalizeCleanPhone('+880 1711-223344'), '8801711223344');

  assert.equal(formatSafeRating(undefined), '5.0');
  assert.equal(formatSafeRating(null), '5.0');
  assert.equal(formatSafeRating(4.85), '4.9');
  assert.equal(formatSafeRating(0), '5.0');
});

test('findMatchingIncomingRideRequest suppresses false driver alert for unregistered passenger sending own request', () => {
  const req = makeReq({ id: 'req-1750000010000', createdAtMs: 1750000010000 });
  const matched = findMatchingIncomingRideRequest({
    passengerRequests: [req],
    passengerPendingRequest: req,
    dismissedAlertIds: {},
    dismissedTripIds: new Set(),
    driverProfile: { id: '', phone: '', category: 'cng', isRegistered: false },
    userRole: 'passenger',
    now: 1750000020000,
  });
  assert.equal(matched, null);
});

test('findMatchingIncomingRideRequest matches incoming request in passenger mode when user is a registered driver', () => {
  const incomingReq = makeReq({ id: 'req-1750000015000', createdAtMs: 1750000015000, category: 'cng' });
  const matched = findMatchingIncomingRideRequest({
    passengerRequests: [incomingReq],
    passengerPendingRequest: null,
    dismissedAlertIds: {},
    dismissedTripIds: new Set(),
    driverProfile: { id: 'drv-1', phone: '01799000000', category: 'cng', isRegistered: true },
    userRole: 'passenger',
    now: 1750000020000,
  });
  assert.equal(matched?.id, incomingReq.id);
});

test('findMatchingIncomingRideRequest matches pending request immediately when switched into driver mode', () => {
  const req = makeReq({ id: 'req-1750000015000', createdAtMs: 1750000015000 });
  const matched = findMatchingIncomingRideRequest({
    passengerRequests: [],
    passengerPendingRequest: req,
    dismissedAlertIds: {},
    dismissedTripIds: new Set(),
    driverProfile: { id: 'drv-1', phone: '01799000000', category: 'cng', isRegistered: true },
    userRole: 'driver',
    now: 1750000020000,
  });
  assert.equal(matched?.id, req.id);
});

test('findMatchingIncomingRideRequest ignores stale requests older than 90 seconds', () => {
  const staleReq = makeReq({ id: 'req-1750000000000', createdAtMs: 1750000000000 });
  const matched = findMatchingIncomingRideRequest({
    passengerRequests: [staleReq],
    passengerPendingRequest: null,
    dismissedAlertIds: {},
    dismissedTripIds: new Set(),
    driverProfile: { id: 'drv-1', phone: '01799000000', category: 'cng', isRegistered: true },
    userRole: 'driver',
    now: 1750000120000,
  });
  assert.equal(matched, null);
});

test('mergeAcceptedRequestIntoList inserts cold-start request when not yet in passengerRequests', () => {
  const coldReq = makeReq({ id: 'req-cold-1' });
  const merged = mergeAcceptedRequestIntoList(
    [],
    'req-cold-1',
    { driverId: 'drv-1', driverName: 'করিম মিয়া' },
    coldReq
  );
  assert.equal(merged.length, 1);
  assert.equal(merged[0].id, 'req-cold-1');
  assert.equal(merged[0].status, 'accepted');
  assert.equal(merged[0].driverName, 'করিম মিয়া');
});
