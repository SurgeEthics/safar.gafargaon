import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar,
  DollarSign,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  MapPin,
  Clock,
  ArrowRight,
  ShieldCheck,
  Award,
  Wallet
} from 'lucide-react';
import { toBengaliNumber } from '../utils/calculator';
import { collection, query, orderBy, limit, onSnapshot, setDoc, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { AutoMarqueeText } from './AutoMarqueeText';

export interface DriverTripLogEntry {
  id: string;
  date: string; // YYYY-MM-DD
  dateBengali: string; // ০৯ নভেম্বর ২০২৬
  time: string; // ০২:৪৫ অপরাহ্ন
  pickup: string;
  destination: string;
  fare: number;
  distanceKm?: number;
  passengerName?: string;
  createdAtMs?: number;
}

export interface DriverDailyEarningsLogProps {
  driverPhone?: string;
  driverId?: string;
  driverName?: string;
  todayTrips: number;
  todayEarnings: number;
  totalTrips?: number;
  syncedTrips?: any[];
  onSyncTodayStats?: (todayTrips: number, todayEarnings: number) => void;
}

export const DriverDailyEarningsLog: React.FC<DriverDailyEarningsLogProps> = ({
  driverPhone,
  driverId,
  driverName,
  todayTrips,
  todayEarnings,
  totalTrips,
  syncedTrips,
  onSyncTodayStats
}) => {
  // Always default folded as requested by user
  const [isOpen, setIsOpen] = useState(false);
  const [expandedDates, setExpandedDates] = useState<Record<string, boolean>>({});
  const [filterMode, setFilterMode] = useState<'all' | 'week' | 'custom'>('all');
  const [selectedCustomDate, setSelectedCustomDate] = useState<string | null>(null);
  const [tripLogs, setTripLogs] = useState<DriverTripLogEntry[]>([]);
  const [cacheClearMessage, setCacheClearMessage] = useState<string | null>(null);

  const cleanPhone = (driverPhone || '').replace(/[^0-9]/g, '');

  // Helper to format Bengali date string
  const formatBengaliDate = (dateStr: string) => {
    try {
      const parts = dateStr.split('-').map(Number);
      if (parts.length === 3) {
        return new Date(parts[0], parts[1] - 1, parts[2]).toLocaleDateString('bn-BD', {
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        });
      }
    } catch {}
    return dateStr;
  };

  // Helper to format time into authentic Bengali 12-hour format (e.g. "১২:৫৮ AM", "০৩:২৬ PM")
  const formatBengaliTime = (rawTime?: string, createdAtMs?: number): string => {
    if (createdAtMs && Number.isFinite(createdAtMs) && createdAtMs > 0) {
      try {
        return new Date(createdAtMs).toLocaleTimeString('bn-BD', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        });
      } catch {}
    }

    if (!rawTime || rawTime === 'এইমাত্র') return 'এইমাত্র';

    // If it's an ISO string like "2026-11-10T18:57:35.634Z"
    if (rawTime.includes('T') || rawTime.includes('-')) {
      try {
        const d = new Date(rawTime);
        if (!isNaN(d.getTime())) {
          return d.toLocaleTimeString('bn-BD', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
          });
        }
      } catch {}
    }

    // If already contains Bengali digits with AM/PM
    return rawTime;
  };

  // Canonicalize trip ID by stripping any leading 'trip-' prefix
  const getCanonicalTripId = (id: string): string => {
    if (!id) return '';
    return id.replace(/^trip-/, '');
  };

  // Derive local date string (YYYY-MM-DD) from local timestamp
  const getLocalDateKey = (ms?: number, fallbackDateStr?: string): string => {
    if (ms && Number.isFinite(ms) && ms > 0) {
      const dt = new Date(ms);
      return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
    }
    if (fallbackDateStr) {
      if (fallbackDateStr.includes('T')) {
        const d = new Date(fallbackDateStr);
        if (!isNaN(d.getTime())) {
          return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        }
      }
      const match = fallbackDateStr.match(/\d{4}-\d{2}-\d{2}/);
      if (match) return match[0];
    }
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  };
  // Clear cached/dummy trips from local storage and reload fresh Firestore data
  const handleClearCacheAndDummy = () => {
    try {
      localStorage.removeItem(`safar_driver_trip_log_${cleanPhone}`);
      if (driverId && driverId !== cleanPhone) {
        localStorage.removeItem(`safar_driver_trip_log_${driverId}`);
      }
    } catch {}
    setTripLogs([]);
    setCacheClearMessage('ক্যাশ ও ডামি ট্রিপ মুছে ফেলা হয়েছে। এখন শুধু লাইভ ফায়ারবেস সিঙ্ক চালু আছে।');
    setTimeout(() => setCacheClearMessage(null), 4000);
  };

  // Helper to deduplicate and insert an entry into trip list
  const upsertTripEntry = (existingList: DriverTripLogEntry[], entry: DriverTripLogEntry): DriverTripLogEntry[] => {
    const canonicalNewId = getCanonicalTripId(entry.id);
    const newMs = entry.createdAtMs || 0;

    // Check for exact canonical ID match
    const existingIndex = existingList.findIndex(t => {
      const canonicalExistingId = getCanonicalTripId(t.id);
      if (canonicalExistingId && canonicalNewId && canonicalExistingId === canonicalNewId) {
        return true;
      }
      // Check for fuzzy route match within 15 minutes (same ride recorded from multiple clients)
      const existingMs = t.createdAtMs || 0;
      const isSameRoute = t.pickup.trim() === entry.pickup.trim() &&
                          t.destination.trim() === entry.destination.trim() &&
                          Number(t.fare) === Number(entry.fare);
      if (isSameRoute && Math.abs(existingMs - newMs) < 15 * 60 * 1000) {
        return true;
      }
      return false;
    });

    if (existingIndex >= 0) {
      // Merge: prefer entry with authentic Bengali time over raw ISO or 'এইমাত্র'
      const existing = existingList[existingIndex];
      const preferredTime = (entry.time && !entry.time.includes('T') && entry.time !== 'এইমাত্র')
        ? entry.time
        : (existing.time && !existing.time.includes('T') && existing.time !== 'এইমাত্র' ? existing.time : entry.time);
      
      const updated = [...existingList];
      updated[existingIndex] = {
        ...existing,
        ...entry,
        id: canonicalNewId || existing.id,
        time: preferredTime,
        date: entry.date || existing.date,
        dateBengali: entry.dateBengali || existing.dateBengali,
        createdAtMs: Math.max(existing.createdAtMs || 0, entry.createdAtMs || 0)
      };
      return updated;
    }

    return [...existingList, { ...entry, id: canonicalNewId || entry.id }];
  };

  // 1. Load persistent trips log with multi-source real-time Firestore sync
  useEffect(() => {
    if (!cleanPhone && !driverId) return;

    const isTasnimul = cleanPhone.endsWith('304841550') || cleanPhone.endsWith('1711223344') || Boolean(driverName && driverName.toUpperCase().includes('TASNIMUL'));

    // Initial load from localStorage cache (strip any old dummy test trips)
    let currentTrips: DriverTripLogEntry[] = [];
    try {
      const localData = localStorage.getItem(`safar_driver_trip_log_${cleanPhone}`);
      if (localData) {
        const parsed = JSON.parse(localData);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Filter out any legacy dummy seeded trips with hardcoded IDs
          currentTrips = parsed
            .filter((p: any) => p && p.id && !p.id.startsWith('trip-tasnimul-'))
            .map((p: any) => ({
              ...p,
              id: getCanonicalTripId(p.id),
              time: formatBengaliTime(p.time, p.createdAtMs),
              date: getLocalDateKey(p.createdAtMs, p.date)
            }));
        }
      }
    } catch {}

    if (currentTrips.length > 0) {
      setTripLogs(currentTrips);
    }

    const unsubs: (() => void)[] = [];

    // Helper to re-sort and persist
    const saveTripsState = (list: DriverTripLogEntry[]) => {
      const sorted = [...list].sort((a, b) => {
        const aMs = a.createdAtMs || 0;
        const bMs = b.createdAtMs || 0;
        if (bMs !== aMs) return bMs - aMs;
        return (b.date + (b.time || '')).localeCompare(a.date + (a.time || ''));
      });
      setTripLogs(sorted);
      try {
        localStorage.setItem(`safar_driver_trip_log_${cleanPhone}`, JSON.stringify(sorted));
      } catch {}
    };

    // Merge syncedTrips (passenger history on same device for this driver)
    if (Array.isArray(syncedTrips) && syncedTrips.length > 0) {
      syncedTrips.forEach((st: any) => {
        if (!st) return;
        const stDriverPhone = (st.driverPhone || '').replace(/[^0-9]/g, '');
        const stDriverName = st.driverName || '';
        const matches = (cleanPhone && stDriverPhone && (cleanPhone === stDriverPhone || cleanPhone.endsWith(stDriverPhone) || stDriverPhone.endsWith(cleanPhone))) ||
                        (driverName && stDriverName && driverName === stDriverName) ||
                        (isTasnimul && stDriverName.toUpperCase().includes('TASNIMUL'));
        if (matches) {
          const dateKey = getLocalDateKey(st.createdAtMs, st.date);
          const timeFormatted = formatBengaliTime(st.time || st.date, st.createdAtMs);
          const entry: DriverTripLogEntry = {
            id: getCanonicalTripId(st.id),
            date: dateKey,
            dateBengali: formatBengaliDate(dateKey),
            time: timeFormatted,
            pickup: st.pickupPoint || 'পিকআপ স্থান',
            destination: st.destination || 'গন্তব্য স্থান',
            fare: Number(st.fare) || 30,
            distanceKm: st.distanceKm,
            passengerName: 'সম্মানিত যাত্রী',
            createdAtMs: st.createdAtMs || Date.now()
          };
          currentTrips = upsertTripEntry(currentTrips, entry);
        }
      });
      saveTripsState(currentTrips);
    }

    // Listener A: drivers/${cleanPhone}/completed_trips
    try {
      const q1 = query(
        collection(db, 'drivers', cleanPhone, 'completed_trips'),
        orderBy('createdAtMs', 'desc'),
        limit(100)
      );
      unsubs.push(onSnapshot(q1, (snap) => {
        if (!snap.empty) {
          snap.forEach((docSnap) => {
            const d = docSnap.data();
            const dateKey = getLocalDateKey(d.createdAtMs, d.date);
            const timeFormatted = formatBengaliTime(d.time, d.createdAtMs);
            const entry: DriverTripLogEntry = {
              id: getCanonicalTripId(docSnap.id),
              date: dateKey,
              dateBengali: d.dateBengali || formatBengaliDate(dateKey),
              time: timeFormatted,
              pickup: d.pickup || d.pickupPoint || 'পিকআপ স্থান',
              destination: d.destination || 'গন্তব্য স্থান',
              fare: Number(d.fare) || 30,
              distanceKm: d.distanceKm,
              passengerName: d.passengerName || 'সম্মানিত যাত্রী',
              createdAtMs: d.createdAtMs || Date.now()
            };
            currentTrips = upsertTripEntry(currentTrips, entry);
          });
          saveTripsState(currentTrips);
        }
      }, () => {}));
    } catch {}

    // Listener B: drivers/${driverId}/completed_trips (if driverId !== cleanPhone)
    const driverKey = driverId || cleanPhone;
    if (driverKey && driverKey !== cleanPhone) {
      try {
        const q2 = query(
          collection(db, 'drivers', driverKey, 'completed_trips'),
          orderBy('createdAtMs', 'desc'),
          limit(100)
        );
        unsubs.push(onSnapshot(q2, (snap) => {
          if (!snap.empty) {
            snap.forEach((docSnap) => {
              const d = docSnap.data();
              const dateKey = getLocalDateKey(d.createdAtMs, d.date);
              const timeFormatted = formatBengaliTime(d.time, d.createdAtMs);
              const entry: DriverTripLogEntry = {
                id: getCanonicalTripId(docSnap.id),
                date: dateKey,
                dateBengali: d.dateBengali || formatBengaliDate(dateKey),
                time: timeFormatted,
                pickup: d.pickup || d.pickupPoint || 'পিকআপ স্থান',
                destination: d.destination || 'গন্তব্য স্থান',
                fare: Number(d.fare) || 30,
                distanceKm: d.distanceKm,
                passengerName: d.passengerName || 'সম্মানিত যাত্রী',
                createdAtMs: d.createdAtMs || Date.now()
              };
              currentTrips = upsertTripEntry(currentTrips, entry);
            });
            saveTripsState(currentTrips);
          }
        }, () => {}));
      } catch {}
    }

    // Listener C: ride_requests where status === 'completed'
    try {
      const q3 = query(
        collection(db, 'ride_requests'),
        orderBy('createdAtMs', 'desc'),
        limit(50)
      );
      unsubs.push(onSnapshot(q3, (snap) => {
        if (!snap.empty) {
          let updated = false;
          snap.forEach((docSnap) => {
            const d = docSnap.data();
            if (d.status !== 'completed') return;
            const dPhone = (d.driverPhone || '').replace(/[^0-9]/g, '');
            const dName = d.driverName || '';
            const matches = (cleanPhone && dPhone && (cleanPhone === dPhone || cleanPhone.endsWith(dPhone) || dPhone.endsWith(cleanPhone))) ||
                            (driverName && dName && driverName === dName) ||
                            (isTasnimul && dName.toUpperCase().includes('TASNIMUL'));
            if (matches) {
              const dateKey = getLocalDateKey(d.createdAtMs, d.completedAt || d.requestedAt);
              const timeFormatted = formatBengaliTime(d.requestedAt, d.createdAtMs);
              const entry: DriverTripLogEntry = {
                id: getCanonicalTripId(docSnap.id),
                date: dateKey,
                dateBengali: formatBengaliDate(dateKey),
                time: timeFormatted,
                pickup: d.pickupPoint || 'পিকআপ স্থান',
                destination: d.destination || 'গন্তব্য স্থান',
                fare: Number(d.estFare) || Number(d.fare) || 30,
                distanceKm: d.distanceKm,
                passengerName: d.passengerName || 'সম্মানিত যাত্রী',
                createdAtMs: d.createdAtMs || Date.now()
              };
              currentTrips = upsertTripEntry(currentTrips, entry);
              updated = true;
            }
          });
          if (updated) {
            saveTripsState(currentTrips);
          }
        }
      }, () => {}));
    } catch {}

    return () => {
      unsubs.forEach(u => u());
    };
  }, [cleanPhone, driverId, driverName, syncedTrips]);

  // Current today's date formatted
  const [todayStr, setTodayStr] = useState(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  });

  const [todayBengaliStr, setTodayBengaliStr] = useState(() => {
    return new Date().toLocaleDateString('bn-BD', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  });

  // Keep today's date updated actively across midnight / day rollover
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      const y = now.getFullYear();
      const m = String(now.getMonth() + 1).padStart(2, '0');
      const d = String(now.getDate()).padStart(2, '0');
      const currentToday = `${y}-${m}-${d}`;
      if (currentToday !== todayStr) {
        setTodayStr(currentToday);
        setTodayBengaliStr(now.toLocaleDateString('bn-BD', {
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        }));
      }
    }, 10000);
    return () => clearInterval(timer);
  }, [todayStr]);

  // Group trips strictly by date for this individual driver
  const groupedData = useMemo(() => {
    const map = new Map<string, {
      date: string;
      dateBengali: string;
      isToday: boolean;
      totalTrips: number;
      totalEarnings: number;
      trips: DriverTripLogEntry[];
    }>();

    // Group actual trips
    tripLogs.forEach((trip) => {
      const dateKey = trip.date;
      if (!dateKey) return;
      if (!map.has(dateKey)) {
        map.set(dateKey, {
          date: dateKey,
          dateBengali: trip.dateBengali || dateKey,
          isToday: dateKey === todayStr,
          totalTrips: 0,
          totalEarnings: 0,
          trips: []
        });
      }
      const entry = map.get(dateKey)!;
      entry.totalTrips += 1;
      entry.totalEarnings += (Number(trip.fare) || 0);
      entry.trips.push(trip);
    });

    // Ensure TODAY is always present in list, strictly reflecting today's completed trips
    if (!map.has(todayStr)) {
      map.set(todayStr, {
        date: todayStr,
        dateBengali: todayBengaliStr,
        isToday: true,
        totalTrips: 0,
        totalEarnings: 0,
        trips: []
      });
    } else {
      const todayEntry = map.get(todayStr)!;
      todayEntry.dateBengali = todayBengaliStr;
      todayEntry.isToday = true;
    }

    // Sort by date descending (newest dates first)
    const sorted = Array.from(map.values()).sort((a, b) => b.date.localeCompare(a.date));

    // Optional week filter (last 7 days)
    if (filterMode === 'week') {
      return sorted.slice(0, 7);
    }
    // Specific Calendar Date filter
    if (filterMode === 'custom' && selectedCustomDate) {
      const match = sorted.filter(g => g.date === selectedCustomDate);
      if (match.length > 0) return match;
      return [{
        date: selectedCustomDate,
        dateBengali: formatBengaliDate(selectedCustomDate),
        isToday: selectedCustomDate === todayStr,
        totalTrips: 0,
        totalEarnings: 0,
        trips: []
      }];
    }
    return sorted;
  }, [tripLogs, todayStr, todayBengaliStr, filterMode, selectedCustomDate]);

  // Today's actual live figures
  const todayEntry = useMemo(() => {
    return groupedData.find(g => g.date === todayStr);
  }, [groupedData, todayStr]);

  const liveTodayTrips = todayEntry ? todayEntry.totalTrips : 0;
  const liveTodayEarnings = todayEntry ? todayEntry.totalEarnings : 0;

  // Sync today's verified actual numbers back to driver dashboard
  useEffect(() => {
    if (onSyncTodayStats) {
      onSyncTodayStats(liveTodayTrips, liveTodayEarnings);
    }
  }, [liveTodayTrips, liveTodayEarnings, onSyncTodayStats]);

  // Overall statistics
  const totalReportEarnings = useMemo(() => {
    return groupedData.reduce((sum, g) => sum + g.totalEarnings, 0);
  }, [groupedData]);

  const totalReportTrips = useMemo(() => {
    return groupedData.reduce((sum, g) => sum + g.totalTrips, 0);
  }, [groupedData]);

  const toggleDate = (dateKey: string) => {
    setExpandedDates(prev => ({ ...prev, [dateKey]: !prev[dateKey] }));
  };

  return (
    <div className="bg-white rounded-2xl border-2 border-emerald-500/40 shadow-md p-3.5 sm:p-4 mb-3.5 transition-all">
      {/* Slot Header */}
      <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-slate-100 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black shadow-xs">
            <Calendar className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-black text-slate-900 flex items-center gap-1.5">
              <span>দৈনিক আয় ও ট্রিপ রিপোর্ট (তারিখ অনুযায়ী)</span>
              <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-1.5 py-0.2 rounded">
                লাইভ লগ
              </span>
            </h3>
            <p className="text-[10px] sm:text-[11px] text-slate-500">
              প্রতিদিনের ট্রিপ সংখ্যা এবং উপার্জিত টাকার সম্পূর্ণ তারিখভিত্তিক খতিয়ান
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center bg-slate-100 rounded-lg p-0.5 border border-slate-200 text-[10px] font-bold gap-0.5">
            <button
              type="button"
              onClick={() => {
                setFilterMode('all');
                setSelectedCustomDate(null);
              }}
              className={`px-2 py-0.5 rounded-md transition cursor-pointer ${
                filterMode === 'all' ? 'bg-emerald-700 text-white shadow-2xs font-black' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              সকল তারিখ
            </button>
            <button
              type="button"
              onClick={() => {
                setFilterMode('week');
                setSelectedCustomDate(null);
              }}
              className={`px-2 py-0.5 rounded-md transition cursor-pointer ${
                filterMode === 'week' ? 'bg-emerald-700 text-white shadow-2xs font-black' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              গত ৭ দিন
            </button>
            <label
              className={`px-2 py-0.5 rounded-md transition cursor-pointer flex items-center gap-1 border ${
                filterMode === 'custom' && selectedCustomDate
                  ? 'bg-emerald-700 text-white shadow-2xs font-black border-emerald-800'
                  : 'text-slate-600 hover:text-slate-900 bg-white/70 border-slate-200'
              }`}
              title="ক্যালেন্ডার থেকে নির্দিষ্ট তারিখ নির্বাচন করুন"
            >
              <Calendar className="w-3 h-3 text-emerald-600" />
              <span>{selectedCustomDate ? formatBengaliDate(selectedCustomDate).slice(0, 11) : 'ক্যালেন্ডার'}</span>
              <input
                type="date"
                className="sr-only"
                value={selectedCustomDate || ''}
                onChange={(e) => {
                  if (e.target.value) {
                    setSelectedCustomDate(e.target.value);
                    setFilterMode('custom');
                    setExpandedDates(prev => ({ ...prev, [e.target.value]: true }));
                  }
                }}
              />
            </label>
            {selectedCustomDate && (
              <button
                type="button"
                onClick={() => {
                  setSelectedCustomDate(null);
                  setFilterMode('all');
                }}
                className="text-[10px] text-red-500 hover:text-red-700 px-1 font-bold cursor-pointer"
                title="ফিল্টার রিসেট"
              >
                ✕
              </button>
            )}
          </div>

          {/* Cache & Dummy Trips Clear Button */}
          <button
            type="button"
            onClick={handleClearCacheAndDummy}
            className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded-lg text-[10px] font-bold transition flex items-center gap-1 cursor-pointer"
            title="ক্যাশ মেমোরিতে জমে থাকা ডামি বা টেস্ট ট্রিপ মুছে শুধু লাইভ ফায়ারবেস হিস্ট্রি রিফ্রেশ করুন"
          >
            <span>🗑️ ক্যাশ ট্রিপ পরিষ্কার</span>
          </button>

          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 border border-slate-200 transition cursor-pointer"
            title={isOpen ? 'সংক্ষেপ করুন' : 'বিস্তারিত দেখুন'}
          >
            {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Cache clear alert feedback toast */}
      {cacheClearMessage && (
        <div className="mb-2 p-2 bg-emerald-50 border border-emerald-300 text-emerald-800 text-[11px] font-bold rounded-xl flex items-center justify-between animate-in fade-in">
          <span>✓ {cacheClearMessage}</span>
          <button type="button" onClick={() => setCacheClearMessage(null)} className="text-slate-400 hover:text-slate-700 ml-2">✕</button>
        </div>
      )}

      {isOpen && (
        <div className="space-y-3 animate-in fade-in">
          {/* Quick Stats Summary Ribbon */}
          <div className="grid grid-cols-3 gap-2 bg-gradient-to-r from-emerald-50 via-teal-50 to-blue-50 p-2.5 rounded-xl border border-emerald-200/80">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
                <Wallet className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] text-slate-500 block leading-tight">মোট হিসাবকৃত আয়</span>
                <span className="text-xs sm:text-sm font-black text-emerald-900">৳ {toBengaliNumber(totalReportEarnings)}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 border-x border-emerald-200/60 px-2">
              <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0">
                <TrendingUp className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] text-slate-500 block leading-tight">মোট সম্পন্ন ট্রিপ</span>
                <span className="text-xs sm:text-sm font-black text-blue-900">{toBengaliNumber(totalReportTrips)} টি</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-amber-500 text-white flex items-center justify-center shrink-0">
                <Award className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] text-slate-500 block leading-tight">আজকের সক্রিয় আয়</span>
                <span className="text-xs sm:text-sm font-black text-amber-900">৳ {toBengaliNumber(liveTodayEarnings)}</span>
              </div>
            </div>
          </div>

          {/* Date-wise Trip & Income List */}
          <div className="space-y-2">
            {groupedData.map((group) => {
              const isExpanded = expandedDates[group.date] ?? (group.isToday || group.trips.length > 0);
              return (
                <div
                  key={group.date}
                  className={`rounded-xl border transition-all overflow-hidden ${
                    group.isToday
                      ? 'border-emerald-400 bg-emerald-50/40 shadow-xs'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  {/* Date Header Row */}
                  <div
                    onClick={() => toggleDate(group.date)}
                    className="p-2.5 flex items-center justify-between gap-2 cursor-pointer select-none"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${group.isToday ? 'bg-emerald-500 animate-ping' : 'bg-slate-400'}`} />
                      <div className="min-w-0">
                        <span className="text-xs font-black text-slate-900 flex items-center gap-1.5 flex-wrap">
                          <span>{(group.dateBengali || '').replace(/\s*\(আজ\)/gi, '').trim()}</span>
                          {group.isToday && (
                            <span className="bg-emerald-600 text-white text-[9px] font-black px-1.5 py-0.2 rounded-full">
                              আজ
                            </span>
                          )}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          {toBengaliNumber(group.totalTrips)} টি ট্রিপ সম্পন্ন
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 block leading-tight">মোট আয়</span>
                        <span className="text-xs sm:text-sm font-black text-emerald-800">
                          ৳ {toBengaliNumber(group.totalEarnings)}
                        </span>
                      </div>
                      <span className="p-1 rounded-md text-slate-400 hover:text-slate-600">
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </span>
                    </div>
                  </div>

                  {/* Expanded Trip List for this specific Date */}
                  {isExpanded && (
                    <div className="px-3 pb-2.5 pt-1 border-t border-slate-100 bg-white divide-y divide-slate-100 text-xs">
                      {group.trips.length === 0 ? (
                        <div className="py-2.5 text-center text-[11px] text-slate-500 italic bg-slate-50/70 rounded-lg">
                          {group.isToday
                            ? 'আজ এখনো কোনো ট্রিপ সম্পন্ন হয়নি। নতুন ট্রিপ সম্পন্ন হলে এখানে স্বয়ংক্রিয়ভাবে বিস্তারিত খতিয়ান যুক্ত হবে।'
                            : 'এই তারিখে কোনো সম্পন্ন ট্রিপের রেকর্ড নেই।'}
                        </div>
                      ) : (
                        group.trips.map((trip, idx) => (
                          <div key={trip.id || idx} className="py-2 flex items-center justify-between gap-2 flex-wrap sm:flex-nowrap">
                            <div className="flex items-start gap-1.5 min-w-0 flex-1">
                              <span className="text-[10px] font-bold text-slate-400 shrink-0 mt-0.5 flex items-center gap-0.5">
                                <Clock className="w-3 h-3 text-slate-400" />
                                {trip.time}
                              </span>
                              <div className="min-w-0 flex-1 space-y-0.5">
                                <div className="flex items-center gap-1.5 text-[11.5px] font-bold text-slate-800 min-w-0 flex-1 overflow-hidden">
                                  <div className="overflow-hidden flex-1 min-w-[75px] max-w-[140px] sm:max-w-[200px]">
                                    <AutoMarqueeText
                                      text={trip.pickup}
                                      speed={30}
                                      pauseAtEndMs={1500}
                                      className="text-[11.5px] font-bold text-slate-800 block"
                                    />
                                  </div>
                                  <ArrowRight className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                  <div className="overflow-hidden flex-1 min-w-[75px] max-w-[140px] sm:max-w-[200px]">
                                    <AutoMarqueeText
                                      text={trip.destination}
                                      speed={30}
                                      pauseAtEndMs={1500}
                                      className="text-[11.5px] font-bold text-emerald-800 block"
                                    />
                                  </div>
                                </div>
                                {trip.distanceKm && (
                                  <span className="text-[9.5px] text-slate-500 block">
                                    দূরত্ব: {toBengaliNumber(trip.distanceKm)} কিমি
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="text-right shrink-0">
                              <span className="text-xs font-black text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-lg">
                                ৳ {toBengaliNumber(trip.fare)}
                              </span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
