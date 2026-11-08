import { Driver, EmergencyContact, SafarProjectBackup, Stand } from '../types';
import { INITIAL_DRIVERS, INITIAL_EMERGENCY_CONTACTS, INITIAL_STANDS } from '../data/initialData';

const STORAGE_KEY = 'safar_gafargaon_app_state_v1';

export interface SafarAppState {
  drivers: Driver[];
  stands: Stand[];
  emergencyContacts: EmergencyContact[];
  bannerHotlineNotice?: string;
  driverSession?: {
    driverId?: string;
    isLoggedIn: boolean;
  };
}

export const loadInitialAppState = (): SafarAppState => {
  if (typeof window === 'undefined') {
    return {
      drivers: INITIAL_DRIVERS,
      stands: INITIAL_STANDS,
      emergencyContacts: INITIAL_EMERGENCY_CONTACTS
    };
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {
        drivers: INITIAL_DRIVERS,
        stands: INITIAL_STANDS,
        emergencyContacts: INITIAL_EMERGENCY_CONTACTS
      };
    }
    const parsed = JSON.parse(raw);
    return {
      drivers: Array.isArray(parsed.drivers) && parsed.drivers.length > 0 ? parsed.drivers : INITIAL_DRIVERS,
      stands: Array.isArray(parsed.stands) && parsed.stands.length > 0 ? parsed.stands : INITIAL_STANDS,
      emergencyContacts: Array.isArray(parsed.emergencyContacts) && parsed.emergencyContacts.length > 0 ? parsed.emergencyContacts : INITIAL_EMERGENCY_CONTACTS,
      bannerHotlineNotice: parsed.bannerHotlineNotice,
      driverSession: parsed.driverSession
    };
  } catch (err) {
    console.error('Failed to load state from localStorage', err);
    return {
      drivers: INITIAL_DRIVERS,
      stands: INITIAL_STANDS,
      emergencyContacts: INITIAL_EMERGENCY_CONTACTS
    };
  }
};

export const saveAppState = (state: SafarAppState): void => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    console.error('Failed to save state to localStorage', err);
  }
};

export const exportProjectDataToJson = (state: SafarAppState): string => {
  const backup: SafarProjectBackup = {
    version: '1.0.0',
    exportedAt: new Date().toISOString(),
    appName: 'সফর - স্মার্ট ট্রান্সপোর্ট ও ইমার্জেন্সি সার্ভিস (গফরগাঁও)',
    drivers: state.drivers,
    stands: state.stands,
    emergencyContacts: state.emergencyContacts,
    settings: {
      emergencyBannerText: state.bannerHotlineNotice || 'জরুরি হটলাইন: হাসপাতাল এম্বুলেন্স: ০১৭১০-০২৪৪৫২ | ফায়ার সার্ভিস: ০১৭০৩-৫৫৭৭১১'
    }
  };
  return JSON.stringify(backup, null, 2);
};

export const downloadBackupFile = (state: SafarAppState): void => {
  const jsonStr = exportProjectDataToJson(state);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const dateStr = new Date().toISOString().split('T')[0];
  a.href = url;
  a.download = `safar-gafargaon-backup-${dateStr}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export const importProjectDataFromJson = (jsonString: string): { success: boolean; state?: SafarAppState; error?: string } => {
  try {
    const parsed = JSON.parse(jsonString);
    if (!parsed || (!parsed.drivers && !Array.isArray(parsed))) {
      return { success: false, error: 'অকার্যকর ফাইল ফরম্যাট। অনুগ্রহ করে সঠিক JSON ব্যাকআপ ফাইল নির্বাচন করুন।' };
    }

    const drivers: Driver[] = Array.isArray(parsed.drivers) ? parsed.drivers : (Array.isArray(parsed) ? parsed : INITIAL_DRIVERS);
    const stands: Stand[] = Array.isArray(parsed.stands) ? parsed.stands : INITIAL_STANDS;
    const emergencyContacts: EmergencyContact[] = Array.isArray(parsed.emergencyContacts) ? parsed.emergencyContacts : INITIAL_EMERGENCY_CONTACTS;

    const newState: SafarAppState = {
      drivers,
      stands,
      emergencyContacts,
      bannerHotlineNotice: parsed.settings?.emergencyBannerText
    };

    saveAppState(newState);
    return { success: true, state: newState };
  } catch (err: any) {
    return { success: false, error: `JSON পার্স করতে ব্যর্থ হয়েছে: ${err.message || 'ভুল সিনট্যাক্স'}` };
  }
};

export const resetToInitialState = (): SafarAppState => {
  const defaultState: SafarAppState = {
    drivers: INITIAL_DRIVERS,
    stands: INITIAL_STANDS,
    emergencyContacts: INITIAL_EMERGENCY_CONTACTS
  };
  saveAppState(defaultState);
  return defaultState;
};
