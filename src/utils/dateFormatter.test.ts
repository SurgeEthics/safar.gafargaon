import test from 'node:test';
import assert from 'node:assert/strict';
import { formatDynamicTripDate, formatBengaliDateString } from './dateFormatter';

test('formatDynamicTripDate returns "আজ, ..." for trip today', () => {
  const now = new Date(2026, 10, 10, 14, 30); // 10 Nov 2026 2:30 PM
  const tripToday = {
    createdAtMs: now.getTime() - 1000 * 60 * 15 // 15 mins ago
  };
  const formatted = formatDynamicTripDate(tripToday, now);
  assert.ok(formatted.startsWith('আজ, '), `Expected "আজ, ..." but got: ${formatted}`);
});

test('formatDynamicTripDate returns "গতকাল, ..." for trip yesterday', () => {
  const now = new Date(2026, 10, 10, 14, 30); // 10 Nov 2026
  const yesterday = new Date(2026, 10, 9, 10, 15); // 9 Nov 2026
  const tripYesterday = {
    createdAtMs: yesterday.getTime()
  };
  const formatted = formatDynamicTripDate(tripYesterday, now);
  assert.ok(formatted.startsWith('গতকাল, '), `Expected "গতকাল, ..." but got: ${formatted}`);
});

test('formatDynamicTripDate returns full Bengali date for trips older than a week', () => {
  const now = new Date(2026, 10, 10, 14, 30);
  const oldTripDate = new Date(2026, 9, 20, 11, 0); // 20 Oct 2026
  const oldTrip = {
    createdAtMs: oldTripDate.getTime()
  };
  const formatted = formatDynamicTripDate(oldTrip, now);
  assert.ok(!formatted.startsWith('আজ') && !formatted.startsWith('গতকাল'), `Got: ${formatted}`);
});

test('formatBengaliDateString converts YYYY-MM-DD properly', () => {
  const formatted = formatBengaliDateString('2026-11-10');
  assert.ok(formatted.includes('নভেম্বর') || formatted.includes('১১'), `Got: ${formatted}`);
});
