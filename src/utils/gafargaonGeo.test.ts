import test from 'node:test';
import assert from 'node:assert/strict';
import {
  GAFARGAON_CORE_BOUNDS,
  GAFARGAON_SERVICE_BOUNDS,
  isWithinGafargaonServiceArea,
  isWithinCoreGafargaonArea,
  clampToGafargaonServiceArea,
  haversineMeters,
  inferNearestAreaInfo,
  categorizeOsmTags,
} from './gafargaonGeo';

test('GAFARGAON_SERVICE_BOUNDS expands core bounds by at least 3-4km on all sides', () => {
  assert.ok(GAFARGAON_SERVICE_BOUNDS.south < GAFARGAON_CORE_BOUNDS.south - 0.03);
  assert.ok(GAFARGAON_SERVICE_BOUNDS.north > GAFARGAON_CORE_BOUNDS.north + 0.03);
  assert.ok(GAFARGAON_SERVICE_BOUNDS.west < GAFARGAON_CORE_BOUNDS.west - 0.03);
  assert.ok(GAFARGAON_SERVICE_BOUNDS.east > GAFARGAON_CORE_BOUNDS.east + 0.03);
});

test('isWithinGafargaonServiceArea accepts Gafargaon, Pagla, and 3-4km border zones while rejecting Dhaka/Mymensingh city', () => {
  // Gafargaon Railway Station
  assert.equal(isWithinGafargaonServiceArea(24.4536, 90.5479), true);
  // Pagla Thana / Datterbazar
  assert.equal(isWithinGafargaonServiceArea(24.3325, 90.5825), true);
  // 3.5km outside southern border (near Kaoraid/Sreepur border)
  assert.equal(isWithinGafargaonServiceArea(24.218, 90.550), true);
  assert.equal(isWithinCoreGafargaonArea(24.218, 90.550), false);
  // Dhaka (far outside)
  assert.equal(isWithinGafargaonServiceArea(23.8103, 90.4125), false);
  // Mymensingh town (far outside)
  assert.equal(isWithinGafargaonServiceArea(24.7471, 90.4203), false);
});

test('clampToGafargaonServiceArea keeps precision to 6 decimals within service bounds', () => {
  const clamped = clampToGafargaonServiceArea(25.0, 91.0);
  assert.equal(clamped.lat, GAFARGAON_SERVICE_BOUNDS.north);
  assert.equal(clamped.lng, GAFARGAON_SERVICE_BOUNDS.east);
  const inside = clampToGafargaonServiceArea(24.4536123, 90.5479123);
  assert.equal(inside.lat, 24.453612);
  assert.equal(inside.lng, 90.547912);
});

test('haversineMeters and inferNearestAreaInfo accurately compute nearest landmark and border flag', () => {
  const dist = haversineMeters(24.4536, 90.5479, 24.4515, 90.5535);
  assert.ok(dist > 450 && dist < 750);

  const info = inferNearestAreaInfo(24.218, 90.56, [
    { bengaliName: 'নিগুয়ারী বাজার', unionNameBengali: 'নিগুয়ারী ইউনিয়ন (পাগলা)', lat: 24.305, lng: 90.575 },
  ]);
  assert.equal(info.isBorderBuffer, true);
  assert.ok(info.unionName.includes('সীমান্ত সংলগ্ন এলাকা'));
  assert.equal(info.nearestPlaceName, 'নিগুয়ারী বাজার');
});

import { GAFARGAON_OSM_PLACES } from '../data/gafargaonOsmPlaces';
import { resolveLocationCoordinates } from '../data/gafargaonPlaces';

test('categorizeOsmTags maps OSM amenities and places to Bengali categories', () => {
  assert.equal(categorizeOsmTags({ amenity: 'hospital' }), 'হাসপাতাল');
  assert.equal(categorizeOsmTags({ amenity: 'school' }), 'শিক্ষা প্রতিষ্ঠান');
  assert.equal(categorizeOsmTags({ shop: 'supermarket' }), 'বাজার');
  assert.equal(categorizeOsmTags({ amenity: 'bus_station' }), 'স্ট্যান্ড');
  assert.equal(categorizeOsmTags({ amenity: 'police' }), 'প্রশাসন');
  assert.equal(categorizeOsmTags({ place: 'village' }), 'ইউনিয়ন');
});

test('GAFARGAON_OSM_PLACES all lie strictly within GAFARGAON_SERVICE_BOUNDS and cover border areas', () => {
  assert.ok(GAFARGAON_OSM_PLACES.length >= 150);
  let borderCount = 0;
  for (const p of GAFARGAON_OSM_PLACES) {
    assert.equal(
      isWithinGafargaonServiceArea(p.lat, p.lng),
      true,
      `Place out of bounds: ${p.bengaliName} (${p.lat}, ${p.lng})`
    );
    if (!isWithinCoreGafargaonArea(p.lat, p.lng)) borderCount++;
  }
  assert.ok(borderCount > 20, 'Should include places in the 3-4km border zone');

  const resolved = resolveLocationCoordinates('ধোপাঘাট বাজার', true);
  assert.ok(Math.abs(resolved.lat - 24.452672) < 0.01);
  assert.ok(Math.abs(resolved.lng - 90.482533) < 0.01);
});
