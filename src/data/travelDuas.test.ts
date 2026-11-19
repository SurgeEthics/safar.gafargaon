import test from 'node:test';
import assert from 'node:assert/strict';
import {
  TRAVEL_DUA_SLIDES,
  getDuaSlideIndexById,
  getWrappedDuaSlideIndex,
} from './travelDuas';

test('TRAVEL_DUA_SLIDES includes all 1-12 duas plus both sub-duas of #1 and #7 (14 total)', () => {
  assert.equal(TRAVEL_DUA_SLIDES.length, 14);
  assert.deepEqual(
    TRAVEL_DUA_SLIDES.map((s) => s.id),
    [
      'dua-01-1',
      'dua-01-2',
      'dua-02',
      'dua-03',
      'dua-04',
      'dua-05',
      'dua-06',
      'dua-07-1',
      'dua-07-2',
      'dua-08',
      'dua-09',
      'dua-10',
      'dua-11',
      'dua-12',
    ]
  );
  assert.equal(TRAVEL_DUA_SLIDES[0].serialBn, '০১.১');
  assert.equal(TRAVEL_DUA_SLIDES[1].serialBn, '০১.২');
  assert.equal(TRAVEL_DUA_SLIDES[7].serialBn, '০৭.১');
  assert.equal(TRAVEL_DUA_SLIDES[8].serialBn, '০৭.২');
  assert.equal(TRAVEL_DUA_SLIDES[13].serialBn, '১২');
});

test('getDuaSlideIndexById finds sub-duas and main duas accurately', () => {
  assert.equal(getDuaSlideIndexById('dua-01-1'), 0);
  assert.equal(getDuaSlideIndexById('dua-01-2'), 1);
  assert.equal(getDuaSlideIndexById('dua-07-1'), 7);
  assert.equal(getDuaSlideIndexById('dua-07-2'), 8);
  assert.equal(getDuaSlideIndexById('dua-12'), 13);
  assert.equal(getDuaSlideIndexById('nonexistent'), -1);
});

test('getWrappedDuaSlideIndex supports forward (1->12->1) and reverse (12->1->12) wrap-around', () => {
  const total = TRAVEL_DUA_SLIDES.length;
  // Forward from 01.1 -> 01.2 -> 02
  assert.equal(getWrappedDuaSlideIndex(0, 1, total), 1);
  assert.equal(getWrappedDuaSlideIndex(1, 1, total), 2);
  // Forward across #7 sub-items: 06 -> 07.1 -> 07.2 -> 08
  assert.equal(getWrappedDuaSlideIndex(6, 1, total), 7);
  assert.equal(getWrappedDuaSlideIndex(7, 1, total), 8);
  assert.equal(getWrappedDuaSlideIndex(8, 1, total), 9);
  // Forward wrap 12 -> 01.1
  assert.equal(getWrappedDuaSlideIndex(13, 1, total), 0);
  // Reverse wrap 01.1 -> 12
  assert.equal(getWrappedDuaSlideIndex(0, -1, total), 13);
  // Reverse 12 -> 11 and across #7 sub-items: 08 -> 07.2 -> 07.1 -> 06
  assert.equal(getWrappedDuaSlideIndex(13, -1, total), 12);
  assert.equal(getWrappedDuaSlideIndex(9, -1, total), 8);
  assert.equal(getWrappedDuaSlideIndex(8, -1, total), 7);
  assert.equal(getWrappedDuaSlideIndex(7, -1, total), 6);
});
