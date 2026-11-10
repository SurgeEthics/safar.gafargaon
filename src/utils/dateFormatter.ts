import { toBengaliNumber } from './calculator';

export interface TripTimestampRecord {
  id?: string;
  date?: string;
  createdAtMs?: number;
  createdAt?: string;
}

/**
 * Returns dynamic, human-friendly Bengali relative date and time:
 * - "আজ, ০১:৪৫ PM"
 * - "গতকাল, ০৭:১৫ AM"
 * - "০৮ নভেম্বর, ২০২৬, ০৪:১০ PM"
 */
export function formatDynamicTripDate(
  record: TripTimestampRecord,
  referenceNow: Date = new Date(),
  fallbackIndex?: number
): string {
  let tripDate: Date | null = null;

  if (typeof record.createdAtMs === 'number' && record.createdAtMs > 0) {
    tripDate = new Date(record.createdAtMs);
  } else if (record.createdAt) {
    const parsed = new Date(record.createdAt);
    if (!isNaN(parsed.getTime())) {
      tripDate = parsed;
    }
  } else if (record.id && record.id.startsWith('req-')) {
    const ts = Number(record.id.replace('req-', ''));
    if (!isNaN(ts) && ts > 1600000000000) {
      tripDate = new Date(ts);
    }
  } else if (record.id && record.id.startsWith('trip-req-')) {
    const ts = Number(record.id.replace('trip-req-', ''));
    if (!isNaN(ts) && ts > 1600000000000) {
      tripDate = new Date(ts);
    }
  } else if (record.id && record.id.startsWith('trip-')) {
    const ts = Number(record.id.replace('trip-', ''));
    if (!isNaN(ts) && ts > 1600000000000) {
      tripDate = new Date(ts);
    }
  }

  // Fallback if record.date contains an existing timestamp
  if (!tripDate && record.date) {
    // If it was already formatted as "গতকাল, ..." or a specific date, keep it unless it said "আজ"
    if (!record.date.startsWith('আজ')) {
      return record.date;
    }
    // Extract time component if present
    const timePartMatch = record.date.match(/([০-৯0-9]{1,2}:[০-৯0-9]{2}\s*(?:AM|PM|পূর্বাহ্ণ|অপরাহ্ন)?)/i);
    const timeStr = timePartMatch ? timePartMatch[1] : '';

    if (typeof fallbackIndex === 'number' && fallbackIndex > 0) {
      if (fallbackIndex === 1) {
        return timeStr ? `গতকাল, ${timeStr}` : 'গতকাল';
      }
      const pastDay = new Date(referenceNow.getTime() - fallbackIndex * 86400000);
      const dayBn = pastDay.toLocaleDateString('bn-BD', { day: 'numeric', month: 'long', year: 'numeric' });
      return timeStr ? `${dayBn}, ${timeStr}` : dayBn;
    }

    return timeStr ? `আজ, ${timeStr}` : record.date;
  }

  if (!tripDate) {
    if (typeof fallbackIndex === 'number' && fallbackIndex > 0) {
      const pastDay = new Date(referenceNow.getTime() - fallbackIndex * 86400000);
      return pastDay.toLocaleDateString('bn-BD', { day: 'numeric', month: 'long', year: 'numeric' });
    }
    return record.date || 'আজ, এইমাত্র';
  }

  const nowYear = referenceNow.getFullYear();
  const nowMonth = referenceNow.getMonth();
  const nowDate = referenceNow.getDate();

  const tYear = tripDate.getFullYear();
  const tMonth = tripDate.getMonth();
  const tDate = tripDate.getDate();

  const isToday = nowYear === tYear && nowMonth === tMonth && nowDate === tDate;

  // Calculate day difference
  const startOfToday = new Date(nowYear, nowMonth, nowDate).getTime();
  const startOfTripDay = new Date(tYear, tMonth, tDate).getTime();
  const diffDays = Math.round((startOfToday - startOfTripDay) / (24 * 60 * 60 * 1000));

  const timeFormatted = tripDate.toLocaleTimeString('bn-BD', {
    hour: '2-digit',
    minute: '2-digit'
  });

  if (isToday || diffDays === 0) {
    return `আজ, ${timeFormatted}`;
  } else if (diffDays === 1) {
    return `গতকাল, ${timeFormatted}`;
  } else if (diffDays > 1 && diffDays <= 6) {
    const dayName = tripDate.toLocaleDateString('bn-BD', { weekday: 'long' });
    return `${dayName}, ${timeFormatted}`;
  } else {
    const dateFormatted = tripDate.toLocaleDateString('bn-BD', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
    return `${dateFormatted}, ${timeFormatted}`;
  }
}

/**
 * Formats a YYYY-MM-DD date string to Bengali readable date (e.g. "১০ নভেম্বর, ২০২৬")
 */
export function formatBengaliDateString(dateStr: string): string {
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
}
