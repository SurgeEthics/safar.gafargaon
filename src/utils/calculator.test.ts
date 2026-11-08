import test from 'node:test';
import assert from 'node:assert/strict';
import { 
  calculateDistanceKm, 
  toBengaliNumber, 
  calculateFare, 
  estimateTravelTimeMinutes
} from './calculator';

test('toBengaliNumber converts digits accurately', () => {
  assert.equal(toBengaliNumber('12345'), '১২৩৪৫');
  assert.equal(toBengaliNumber('30'), '৩০');
  assert.equal(toBengaliNumber(0.8), '০.৮');
});

test('calculateDistanceKm returns minimum distance of 0.5 km', () => {
  const dist = calculateDistanceKm(24.4347, 90.5516, 24.4347, 90.5516);
  assert.equal(dist, 0.5);
});

test('calculateDistanceKm calculates approximate distance between Gafargaon station and hospital', () => {
  const dist = calculateDistanceKm(24.4347, 90.5516, 24.4285, 90.5560);
  assert.ok(dist >= 0.7 && dist <= 1.5, `Distance was ${dist}`);
});

test('calculateFare returns base fare for short trips <= 1.5 km', () => {
  const autoFare = calculateFare('auto', 0.8);
  assert.equal(autoFare, 30); // Auto base fare is 30

  const cngFare = calculateFare('cng', 1.0);
  assert.equal(cngFare, 50); // CNG base fare is 50

  const fireServiceFare = calculateFare('fire_service', 5.0);
  assert.equal(fireServiceFare, 0); // Fire service is free
});

test('calculateFare increases dynamically with distance beyond 1.5 km', () => {
  const autoLong = calculateFare('auto', 3.5);
  assert.equal(autoLong, 50);

  const carLong = calculateFare('car', 5.5);
  assert.equal(carLong, 220);
});

test('estimateTravelTimeMinutes returns reasonable time', () => {
  const autoTime = estimateTravelTimeMinutes('auto', 1.0);
  assert.ok(autoTime >= 3 && autoTime <= 10);
});
