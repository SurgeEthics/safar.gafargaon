import test from 'node:test';
import assert from 'node:assert/strict';
import {
  stripUndefinedFields,
  mergeRemoteSettingsWithDefaults,
  shouldSeedDefaultCollection,
  buildAdminPlaceAndStandPayloads,
  parseGoogleMapsCoordinates,
  filterCustomMapPlaces,
  resolveVehicleCategoryMeta,
  computeStandVehicleTypesSummary,
  resolveDriverMapPosition,
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

test('buildAdminPlaceAndStandPayloads builds synchronized place and stand objects with showOnMap and new categories', () => {
  const { place, stand } = buildAdminPlaceAndStandPayloads({
    bengaliName: 'রহিম সাহেবের বাড়ি',
    name: 'Rahim House',
    category: 'বাসা / বাড়ি',
    area: 'গফরগাঁও পৌরসভা',
    lat: 24.45361234,
    lng: 90.54798765,
    idSeed: 12345,
  });

  assert.equal(place.id, 'place-map-12345');
  assert.equal(place.bengaliName, 'রহিম সাহেবের বাড়ি');
  assert.equal(place.category, 'বাসা / বাড়ি');
  assert.equal(place.lat, 24.453612);
  assert.equal(place.lng, 90.547988);
  assert.equal(place.isPopular, true);
  assert.equal(place.showOnMap, true);

  assert.equal(stand.id, 'stand-map-12345');
  assert.equal(stand.bengaliName, 'রহিম সাহেবের বাড়ি');
  assert.equal(stand.location, 'গফরগাঁও পৌরসভা • রহিম সাহেবের বাড়ি');
  assert.equal(stand.lat, 24.453612);
  assert.equal(stand.lng, 90.547988);
});

test('parseGoogleMapsCoordinates extracts valid coordinates from plain text and Google Maps URLs', () => {
  assert.deepEqual(parseGoogleMapsCoordinates('24.4536, 90.5479'), { lat: 24.4536, lng: 90.5479 });
  assert.deepEqual(
    parseGoogleMapsCoordinates('https://www.google.com/maps/place/Gafargaon/@24.4512345,90.5567891,17z'),
    { lat: 24.451235, lng: 90.556789 }
  );
  assert.deepEqual(
    parseGoogleMapsCoordinates('https://maps.google.com/?q=24.448811,90.549922'),
    { lat: 24.448811, lng: 90.549922 }
  );
  assert.deepEqual(
    parseGoogleMapsCoordinates('https://www.google.com/maps/place/Test/data=!3m1!4b1!4m5!3m4!1s0x0:0x0!8m2!3d24.4601!4d90.5512'),
    { lat: 24.4601, lng: 90.5512 }
  );
  assert.equal(parseGoogleMapsCoordinates('invalid text'), null);
  assert.equal(parseGoogleMapsCoordinates('99.5, 90.5'), null);
});

test('filterCustomMapPlaces shows admin-added places on map while skipping static seeds and duplicate stands', () => {
  const staticIds = new Set(['osm-n_1', 'union-1']);
  const stands = [
    { id: 'stand-1', nameBn: 'রেলওয়ে স্টেশন', lat: 24.4536, lng: 90.5479 },
    { id: 'stand-map-100', nameBn: 'পাগলা মোড়', lat: 24.3325, lng: 90.5825 },
  ];
  const places = [
    { id: 'osm-n_1', bengaliName: 'স্ট্যাটিক জায়গা', lat: 24.45, lng: 90.55, isPopular: true },
    { id: 'union-1', bengaliName: 'ইউনিয়ন এডিটেড', lat: 24.44, lng: 90.54, showOnMap: true },
    { id: 'place-100', bengaliName: 'পাগলা মোড়', lat: 24.3325, lng: 90.5825, showOnMap: true },
    { id: 'place-200', bengaliName: 'বড় মসজিদ', lat: 24.4605, lng: 90.5585, isPopular: true },
    { id: 'custom-shop-1', bengaliName: 'করিম ভ্যারাইটি স্টোর', lat: 24.4622, lng: 90.5612, showOnMap: true },
  ];

  const result = filterCustomMapPlaces(places, stands, staticIds);
  assert.deepEqual(
    result.map((p) => p.id),
    ['union-1', 'place-200', 'custom-shop-1']
  );
});

test('resolveVehicleCategoryMeta resolves both built-in and admin-added vehicle categories', () => {
  const customCategories = [
    { id: 'all', nameBengali: 'সকল চালক', accentColor: '#047857', iconType: 'all' },
    { id: 'cng', nameBengali: 'সিএনজি', accentColor: '#059669', iconType: 'cng' },
    { id: 'tomtom', nameBengali: 'ইজিবাইক / টমটম', accentColor: '#7c3aed', iconType: 'auto' },
  ];

  const customMeta = resolveVehicleCategoryMeta('tomtom', customCategories);
  assert.equal(customMeta.name, 'ইজিবাইক / টমটম');
  assert.equal(customMeta.color, '#7c3aed');
  assert.equal(customMeta.symbol, '🔋');

  const ambMeta = resolveVehicleCategoryMeta('ambulance', customCategories);
  assert.equal(ambMeta.symbol, '✚');
  assert.equal(ambMeta.color, '#dc2626');
});

test('computeStandVehicleTypesSummary computes dynamic active vehicle types (প্রকার) and driver count per stand', () => {
  const categories = [
    { id: 'all', nameBengali: 'সকল চালক' },
    { id: 'cng', nameBengali: 'সিএনজি' },
    { id: 'auto', nameBengali: 'অটো' },
    { id: 'bike', nameBengali: 'মোটরসাইকেল' },
    { id: 'tomtom', nameBengali: 'টমটম' },
  ];
  const drivers = [
    { id: 'd1', category: 'cng', standName: 'পাগলা বাজার স্ট্যান্ড' },
    { id: 'd2', category: 'tomtom', standName: 'পাগলা বাজার' },
    { id: 'd3', category: 'auto', standName: 'রেলওয়ে স্টেশন স্ট্যান্ড' },
  ];

  const summary = computeStandVehicleTypesSummary('পাগলা বাজার স্ট্যান্ড', categories, drivers);
  assert.equal(summary.typeCount, 4);
  assert.equal(summary.driverCountAtStand, 2);
  assert.equal(summary.typeNames.includes('টমটম'), true);
});

test('resolveDriverMapPosition anchors drivers with missing or fallback coords to their selected stand with non-overlapping offset', () => {
  const stands = [
    { id: 's1', nameBn: 'গফরগাঁও রেলওয়ে স্টেশন স্ট্যান্ড', lat: 24.4536, lng: 90.5479 },
    { id: 's2', nameBn: 'পাগলা কলেজ মোড় স্ট্যান্ড', lat: 24.3325, lng: 90.5825 },
  ];

  const fallbackDriverPos = resolveDriverMapPosition(
    { id: 'd1', standName: 'পাগলা কলেজ মোড় স্ট্যান্ড', lat: 24.4536, lng: 90.5479 },
    stands,
    0
  );
  assert.ok(Math.abs(fallbackDriverPos.lat - 24.3325) < 0.002);
  assert.ok(Math.abs(fallbackDriverPos.lng - 90.5825) < 0.002);

  const secondDriverPos = resolveDriverMapPosition(
    { id: 'd2', standName: 'পাগলা কলেজ মোড় স্ট্যান্ড' },
    stands,
    1
  );
  assert.notEqual(
    `${fallbackDriverPos.lat},${fallbackDriverPos.lng}`,
    `${secondDriverPos.lat},${secondDriverPos.lng}`
  );

  const explicitDriverPos = resolveDriverMapPosition(
    { id: 'd3', standName: 'পাগলা কলেজ মোড় স্ট্যান্ড', lat: 24.3401, lng: 90.5902 },
    stands,
    0
  );
  assert.deepEqual({ lat: explicitDriverPos.lat, lng: explicitDriverPos.lng }, { lat: 24.3401, lng: 90.5902 });
});

