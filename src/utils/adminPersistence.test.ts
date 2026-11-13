import test from 'node:test';
import assert from 'node:assert/strict';
import {
  stripUndefinedFields,
  mergeRemoteSettingsWithDefaults,
  shouldSeedDefaultCollection,
  buildAdminPlaceAndStandPayloads,
} from './adminPersistence';

test('stripUndefinedFields removes undefined keys recursively without mutating defined falsy values', () => {
  const input = {
    a: 'hello',
    b: undefined,
    c: 0,
    d: false,
    e: '',
    nested: {
      x: 1,
      y: undefined,
    },
    list: ['one', 'two'],
  };
  const result = stripUndefinedFields(input);
  assert.deepEqual(result, {
    a: 'hello',
    c: 0,
    d: false,
    e: '',
    nested: { x: 1 },
    list: ['one', 'two'],
  });
  assert.equal('b' in result, false);
  assert.equal('y' in result.nested, false);
});

test('mergeRemoteSettingsWithDefaults preserves remote announcementNotice and custom fields over defaults', () => {
  const defaults = {
    primaryColor: 'emerald',
    announcementNotice: 'ডিফল্ট বার্তা',
    baseFareMinimum: 20,
    quickDestinations: ['রেলওয়ে স্টেশন'],
  };
  const remote = {
    primaryColor: 'blue',
    announcementNotice: 'জরুরি: আজ বিশেষ ছাড় চলছে!',
    customAppUrl: undefined as unknown as string,
  };
  const merged = mergeRemoteSettingsWithDefaults(defaults, remote);
  assert.equal(merged.primaryColor, 'blue');
  assert.equal(merged.announcementNotice, 'জরুরি: আজ বিশেষ ছাড় চলছে!');
  assert.equal(merged.baseFareMinimum, 20);
  assert.deepEqual(merged.quickDestinations, ['রেলওয়ে স্টেশন']);
});

test('shouldSeedDefaultCollection refuses seeding from cache or when server has documents', () => {
  assert.equal(shouldSeedDefaultCollection(true, true, 0), false);
  assert.equal(shouldSeedDefaultCollection(true, false, 3), false);
  assert.equal(shouldSeedDefaultCollection(false, false, 0), false);
  assert.equal(shouldSeedDefaultCollection(true, false, 0), true);
});

test('buildAdminPlaceAndStandPayloads builds synchronized place and stand objects with 6-decimal coordinates', () => {
  const { place, stand } = buildAdminPlaceAndStandPayloads({
    bengaliName: 'নতুন বাজার মোড়',
    name: 'Notun Bazar Mor',
    category: 'বাজার',
    area: 'গফরগাঁও পৌরসভা',
    lat: 24.45361234,
    lng: 90.54798765,
    idSeed: 12345,
  });

  assert.equal(place.id, 'place-map-12345');
  assert.equal(place.bengaliName, 'নতুন বাজার মোড়');
  assert.equal(place.lat, 24.453612);
  assert.equal(place.lng, 90.547988);
  assert.equal(place.isPopular, true);

  assert.equal(stand.id, 'stand-map-12345');
  assert.equal(stand.bengaliName, 'নতুন বাজার মোড়');
  assert.equal(stand.location, 'গফরগাঁও পৌরসভা • নতুন বাজার মোড়');
  assert.equal(stand.lat, 24.453612);
  assert.equal(stand.lng, 90.547988);
});
