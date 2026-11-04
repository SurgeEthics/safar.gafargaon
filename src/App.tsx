import React, { useState, useEffect, useLayoutEffect, useRef, useMemo, useCallback } from 'react';
import { 
  Phone, 
  MapPin, 
  Search, 
  Bike, 
  Car, 
  Flame, 
  Truck, 
  IdCard, 
  X, 
  CheckCircle, 
  Star, 
  Navigation,
  PhoneCall,
  Info,
  Shield,
  ShieldCheck,
  Clock,
  UserCheck,
  Bell,
  Check,
  ChevronRight,
  ChevronDown,
  Lock,
  Unlock,
  Radio,
  FileText,
  LocateFixed,
  Award,
  AlertCircle,
  User,
  Users,
  Send,
  HelpCircle,
  Power,
  Compass,
  ArrowRight,
  History,
  Calendar,
  DollarSign,
  LogIn,
  LogOut,
  Bookmark,
  CheckCircle2,
  Edit2,
  Trash2,
  Plus,
  RefreshCw,
  Key,
  ArrowUpDown,
  Sparkles,
  Camera,
  Download,
  UserPlus
} from 'lucide-react';
import L from 'leaflet';
import { SafarLogo } from './components/SafarLogo';
import { VerificationGatewayModal } from './components/VerificationGatewayModal';
import { DriverVerificationSuccessModal } from './components/DriverVerificationSuccessModal';
import { PWAInstallBanner } from './components/PWAInstallBanner';
import { SourceCodeDownloadModal } from './components/SourceCodeDownloadModal';
import { EmergencyDirectoryModal } from './components/EmergencyDirectoryModal';
import { TravelDuaDropdown } from './components/TravelDuaDropdown';
import { EmergencyHotlineDropdown } from './components/EmergencyHotlineDropdown';
import { StandDropdown } from './components/StandDropdown';
import { DriverSearchAutocomplete } from './components/DriverSearchAutocomplete';
import { EmergencyContact } from './types';
import { INITIAL_EMERGENCY_CONTACTS } from './data/initialData';
import confetti from 'canvas-confetti';
import { sounds } from './utils/audio';
import { toBengaliNumber } from './utils/calculator';
import { PassengerRideCockpit } from './components/PassengerRideCockpit';
import { DriverIncomingAlert } from './components/DriverIncomingAlert';
import { DriverScreenOpenNotificationPopup } from './components/DriverScreenOpenNotificationPopup';
import { screenWakeLock } from './utils/wakeLockManager';
import { highPriorityNotifications } from './utils/highPriorityNotification';
import { SplashScreen } from './components/SplashScreen';
import { AdminControlPanel, AppCustomSettings } from './components/AdminControlPanel';
import { AutoMarqueeText } from './components/AutoMarqueeText';
import { PauseMarqueeText } from './components/PauseMarqueeText';
import { collection, doc, setDoc, getDoc, getDocs, onSnapshot, updateDoc, deleteDoc, query, where, orderBy, limit, runTransaction } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './lib/firebase';

import { LocationAutocomplete } from './components/LocationAutocomplete';
import { GAFARGAON_PLACES, resolveLocationCoordinates, GafargaonPlace } from './data/gafargaonPlaces';
import { UnionQuickDestinations } from './components/UnionQuickDestinations';
import { COMPREHENSIVE_UNION_PLACES, GAFARGAON_UNIONS } from './data/gafargaonUnionData';
import { GafargaonMap } from './components/GafargaonMap';
import { CloudflareSettingsModal } from './components/CloudflareSettingsModal';
import { useLiveTracking } from './hooks/useLiveTracking';
import { liveLocationService } from './services/liveLocationService';

export type VehicleCategory = string;
export type AppUserRole = 'passenger' | 'driver';

export interface VehicleCategoryItem {
  id: VehicleCategory;
  nameBengali: string;
  subtitle: string;
  badgeBg: string;
  badgeBorder: string;
  textColor: string;
  accentColor: string;
  baseFare: number;
  perKmFare: number;
  minFare: number;
  iconType?: string;
  isEmergency?: boolean;
  isFree?: boolean;
}

export interface PassengerTripRecord {
  id: string;
  date: string;
  pickupPoint: string;
  destination: string;
  driverName: string;
  driverPhone: string;
  vehicleCategory: VehicleCategory;
  vehicleModel: string;
  plateNumber: string;
  fare: number;
  status: 'সম্পন্ন' | 'বাতিল';
  ratingGiven: number;
}

export interface PassengerRideRequest {
  id: string;
  passengerName: string;
  passengerPhone: string;
  pickupPoint: string;
  pickupLandmark?: string; // 2nd option / nearest known landmark reference
  destination: string;
  category: VehicleCategory;
  requestedAt: string;
  distanceKm: number;
  estFare: number;
  status: 'pending' | 'accepted' | 'declined' | 'in_transit' | 'completed' | 'cancelled';
  driverId?: string;
  driverName?: string;
  driverPhone?: string;
  driverCategory?: string;
  driverLat?: number;
  driverLng?: number;
  driverVehicleModel?: string;
  driverLicensePlate?: string;
  driverPlateNumber?: string;
  driverPhoto?: string;
  driverRating?: number;
  otp?: string;
  pickupCoords?: { lat: number; lng: number };
  destCoords?: { lat: number; lng: number };
  createdAtMs?: number;
}

export interface Driver {
  id: string;
  name: string;
  phone: string;
  category: VehicleCategory;
  categoryBengali: string;
  vehicleModel: string;
  plateNumber: string;
  licenseNumber: string;
  firstIssueDate?: string; // প্রথম ইস্যুর তারিখ (DD/MM/YYYY)
  licenseType: 'পেশাদার (Professional)' | 'অপেশাদার (Non-Professional)';
  regLastFour?: string; // রেজিস্ট্রেশন নম্বর (শেষ ৪ সংখ্যা)
  manufacturingYear?: string; // উৎপাদনের বছর (YYYY)
  chassisNumber?: string; // চ্যাসিস নম্বর
  engineNumber?: string; // ইঞ্জিন নম্বর / মোটর নম্বর
  taxTokenReceiptPhoto?: string; // সর্বশেষ ট্যাক্স টোকেন রিসিট ছবি (লাইটওয়েট অপ্টিমাইজড)
  driverPhoto?: string; // চালকের সাম্প্রতিক রঙিন ছবি
  photoUrl?: string; // অল্টারনেট ফটো ইউআরএল
  nidFrontPhoto?: string; // NID সম্মুখভাগ (এ পিঠ) ছবি
  nidBackPhoto?: string; // NID পেছনের ভাগ (ও পিঠ) ছবি
  nidNumber: string;
  nidVerified: boolean;
  licenseVerified: boolean;
  phoneVerified?: boolean; // WhatsApp & Phone verification
  verificationStatus?: 'verified' | 'pending';
  regAppId?: string;
  registeredAt?: string;
  standName: string;
  lat: number;
  lng: number;
  rating: number;
  totalTrips: number;
  avatarBg: string;
  isOnline: boolean;
  approxSpeedKmh: number;
}

export interface Stand {
  id: string;
  name: string;
  bengaliName: string;
  lat: number;
  lng: number;
  activeDrivers: number;
  location?: string;
  driverCount?: number;
  isPopular?: boolean;
  description?: string;
  area?: string;
}

// Initial Vehicle Categories with distinctive branding & ambulance red medical cross
export const VEHICLE_CATEGORIES: VehicleCategoryItem[] = [
  {
    id: 'all',
    nameBengali: 'সকল চালক',
    subtitle: 'সব ক্যাটাগরির নিবন্ধিত সক্রিয় চালক',
    badgeBg: 'bg-emerald-700',
    badgeBorder: 'border-emerald-800',
    textColor: 'text-emerald-800',
    accentColor: '#047857',
    baseFare: 20,
    perKmFare: 12,
    minFare: 20,
    iconType: 'all',
    isEmergency: false,
    isFree: false
  },
  {
    id: 'ambulance',
    nameBengali: 'এম্বুলেন্স',
    subtitle: '২৪/৭ জরুরি অক্সিজেন ও রোগী সেবা',
    badgeBg: 'bg-red-500',
    badgeBorder: 'border-red-600',
    textColor: 'text-red-700',
    accentColor: '#dc2626',
    baseFare: 250,
    perKmFare: 50,
    minFare: 250,
    iconType: 'ambulance',
    isEmergency: true,
    isFree: false
  },
  {
    id: 'cng',
    nameBengali: 'সিএনজি',
    subtitle: 'লোকাল ও রিজার্ভ ফোর-স্ট্রোক সিএনজি',
    badgeBg: 'bg-emerald-600',
    badgeBorder: 'border-emerald-700',
    textColor: 'text-emerald-700',
    accentColor: '#059669',
    baseFare: 40,
    perKmFare: 20,
    minFare: 40,
    iconType: 'cng',
    isEmergency: false,
    isFree: false
  },
  {
    id: 'auto',
    nameBengali: 'অটো',
    subtitle: 'ইজিবাইক ও ব্যাটারিচালিত রিকশা',
    badgeBg: 'bg-teal-600',
    badgeBorder: 'border-teal-700',
    textColor: 'text-teal-700',
    accentColor: '#0d9488',
    baseFare: 20,
    perKmFare: 12,
    minFare: 20,
    iconType: 'auto',
    isEmergency: false,
    isFree: false
  },
  {
    id: 'car',
    nameBengali: 'কার',
    subtitle: 'প্রাইভেট কার / সেডান এসি-নন এসি',
    badgeBg: 'bg-blue-600',
    badgeBorder: 'border-blue-700',
    textColor: 'text-blue-700',
    accentColor: '#2563eb',
    baseFare: 100,
    perKmFare: 35,
    minFare: 120,
    iconType: 'car',
    isEmergency: false,
    isFree: false
  },
  {
    id: 'microbus',
    nameBengali: 'মাইক্রোবাস',
    subtitle: 'হাইয়েস / নোহা ফ্যামিলি রিজার্ভ',
    badgeBg: 'bg-indigo-600',
    badgeBorder: 'border-indigo-700',
    textColor: 'text-indigo-700',
    accentColor: '#4f46e5',
    baseFare: 200,
    perKmFare: 45,
    minFare: 200,
    iconType: 'microbus',
    isEmergency: false,
    isFree: false
  },
  {
    id: 'bike',
    nameBengali: 'মোটরসাইকেল',
    subtitle: 'তাত্ক্ষণিক ও দ্রুত লোকাল রাইড',
    badgeBg: 'bg-amber-600',
    badgeBorder: 'border-amber-700',
    textColor: 'text-amber-700',
    accentColor: '#d97706',
    baseFare: 25,
    perKmFare: 15,
    minFare: 25,
    iconType: 'bike',
    isEmergency: false,
    isFree: false
  },
  {
    id: 'fire',
    nameBengali: 'ফায়ার সার্ভিস',
    subtitle: 'গফরগাঁও ফায়ার ও সিভিল ডিফেন্স',
    badgeBg: 'bg-orange-600',
    badgeBorder: 'border-orange-700',
    textColor: 'text-orange-700',
    accentColor: '#ea580c',
    baseFare: 0,
    perKmFare: 0,
    minFare: 0,
    iconType: 'fire',
    isEmergency: true,
    isFree: true
  }
];

// Expanded Gafargaon Stands (Counts are calculated dynamically based on active drivers)
// Comprehensive Gafargaon & Pagla Stands across all 15 Unions + Pourashava
// Auto-populated with exact Google Maps GPS Coordinates
export const GAFARGAON_STANDS: Stand[] = COMPREHENSIVE_UNION_PLACES.filter(p => p.isStand).map(p => ({
  id: p.id,
  name: p.name,
  bengaliName: p.bengaliName,
  lat: p.lat,
  lng: p.lng,
  activeDrivers: 0,
  location: `${p.unionNameBengali} • ${p.area}`,
  isPopular: p.isPopular
}));


// Realistic Initial Drivers with Verified Licenses, NIDs, Ratings & Speeds
export const INITIAL_DRIVERS: Driver[] = [
  // 1. Ambulance (3 Drivers)
  {
    id: 'amb-1',
    name: 'মো. রফিকুল ইসলাম (আইসিইউ টিম)',
    phone: '01730324452',
    category: 'ambulance',
    categoryBengali: 'জরুরি এম্বুলেন্স',
    vehicleModel: 'অক্সিজেন ও ভেন্টিলেটর যুক্ত হাইয়েস',
    plateNumber: 'ময়মনসিংহ-ছ-১১-২০৩৪',
    licenseNumber: 'MYM-DL-84920-P',
    licenseType: 'পেশাদার (Professional)',
    nidNumber: '৮২৮৩৯৪১০৭৫',
    nidVerified: true,
    licenseVerified: true,
    standName: 'উপজেলা স্বাস্থ্য কমপ্লেক্স (হাসপাতাল) স্ট্যান্ড',
    lat: 24.4627,
    lng: 90.5430,
    rating: 5.0,
    totalTrips: 640,
    avatarBg: 'bg-red-600',
    isOnline: true,
    approxSpeedKmh: 45
  },
  {
    id: 'amb-2',
    name: 'আল-আমিন হোসেন (এসি এম্বুলেন্স)',
    phone: '01712889900',
    category: 'ambulance',
    categoryBengali: 'জরুরি এম্বুলেন্স',
    vehicleModel: 'টয়োটা লাইট-এইস লাইফকেয়ার',
    plateNumber: 'ঢাকা-ম-৫১-৭৭৬৬',
    licenseNumber: 'DHA-DL-30219-P',
    licenseType: 'পেশাদার (Professional)',
    nidNumber: '১৯৯১২৬৯৩৪৭৮',
    nidVerified: true,
    licenseVerified: true,
    standName: 'পৌরসভা চত্বর স্ট্যান্ড',
    lat: 24.4516,
    lng: 90.5536,
    rating: 4.9,
    totalTrips: 385,
    avatarBg: 'bg-rose-700',
    isOnline: true,
    approxSpeedKmh: 40
  },
  {
    id: 'amb-3',
    name: 'মো. কবির হোসেন (পাগলা জরুরি এম্বুলেন্স)',
    phone: '01711002233',
    category: 'ambulance',
    categoryBengali: 'জরুরি এম্বুলেন্স',
    vehicleModel: 'টয়োটা হাইয়েস অক্সিজেন রেডি',
    plateNumber: 'ময়মনসিংহ-ছ-১২-৫৬৭৮',
    licenseNumber: 'MYM-DL-90812-P',
    licenseType: 'পেশাদার (Professional)',
    nidNumber: '৮৯৬১৪৫২৩০১',
    nidVerified: true,
    licenseVerified: true,
    standName: 'পাগলা থানা স্ট্যান্ড',
    lat: 24.3326,
    lng: 90.5827,
    rating: 4.9,
    totalTrips: 215,
    avatarBg: 'bg-red-700',
    isOnline: true,
    approxSpeedKmh: 45
  },

  // 2. CNG (6 Drivers)
  {
    id: 'cng-1',
    name: 'আব্দুর রহিম শেখ',
    phone: '01711223344',
    category: 'cng',
    categoryBengali: 'সিএনজি অটো-রিকশা',
    vehicleModel: 'বাজাজ ফোর-স্ট্রোক সবুজ সিএনজি',
    plateNumber: 'ময়মনসিংহ-থ-১২-৩৪০১',
    licenseNumber: 'MYM-DL-19283-P',
    licenseType: 'পেশাদার (Professional)',
    nidNumber: '৩৭১৮৯৪২০১২',
    nidVerified: true,
    licenseVerified: true,
    standName: 'গফরগাঁও রেলওয়ে স্টেশন স্ট্যান্ড',
    lat: 24.4538,
    lng: 90.5481,
    rating: 4.9,
    totalTrips: 420,
    avatarBg: 'bg-emerald-600',
    isOnline: true,
    approxSpeedKmh: 28
  },
  {
    id: 'cng-2',
    name: 'জাহাঙ্গীর আলম',
    phone: '01822334455',
    category: 'cng',
    categoryBengali: 'সিএনজি অটো-রিকশা',
    vehicleModel: 'পিয়াগিও সবুজ সিএনজি স্পেশাল',
    plateNumber: 'ময়মনসিংহ-থ-১৫-৮৮১২',
    licenseNumber: 'MYM-DL-77341-P',
    licenseType: 'পেশাদার (Professional)',
    nidNumber: '৫৯২৮৩১০৭৪৫',
    nidVerified: true,
    licenseVerified: true,
    standName: 'পৌরসভা চত্বর স্ট্যান্ড',
    lat: 24.4514,
    lng: 90.5537,
    rating: 4.8,
    totalTrips: 310,
    avatarBg: 'bg-emerald-700',
    isOnline: true,
    approxSpeedKmh: 28
  },
  {
    id: 'cng-3',
    name: 'মো. শাহীন মিয়া',
    phone: '01923445566',
    category: 'cng',
    categoryBengali: 'সিএনজি অটো-রিকশা',
    vehicleModel: 'বাজাজ আরই ডিজিটাল মিটার',
    plateNumber: 'ময়মনসিংহ-থ-০৯-৪৩২১',
    licenseNumber: 'MYM-DL-44829-P',
    licenseType: 'পেশাদার (Professional)',
    nidNumber: '৯৮৭৪৫৬১২৩০',
    nidVerified: false,
    licenseVerified: true,
    phoneVerified: false,
    standName: 'পাগলা থানা স্ট্যান্ড',
    lat: 24.3328,
    lng: 90.5824,
    rating: 4.7,
    totalTrips: 275,
    avatarBg: 'bg-green-700',
    isOnline: false,
    approxSpeedKmh: 28
  },
  {
    id: 'cng-4',
    name: 'মো. মোস্তফা কামাল',
    phone: '01718899112',
    category: 'cng',
    categoryBengali: 'সিএনজি অটো-রিকশা',
    vehicleModel: 'বাজাজ আরই কম্প্যাক্ট ৪এস',
    plateNumber: 'ময়মনসিংহ-থ-১৩-৬৭৮৯',
    licenseNumber: 'MYM-DL-38910-P',
    licenseType: 'পেশাদার (Professional)',
    nidNumber: '৭৮৯৪৫৬১২২৩',
    nidVerified: true,
    licenseVerified: true,
    standName: 'রওনা বাজার মোড় স্ট্যান্ড',
    lat: 24.4322,
    lng: 90.5482,
    rating: 4.8,
    totalTrips: 340,
    avatarBg: 'bg-emerald-600',
    isOnline: true,
    approxSpeedKmh: 28
  },
  {
    id: 'cng-5',
    name: 'মো. হারুন রশীদ',
    phone: '01914567890',
    category: 'cng',
    categoryBengali: 'সিএনজি অটো-রিকশা',
    vehicleModel: 'টিভিএস কিং ডিলাক্স সিএনজি',
    plateNumber: 'ময়মনসিংহ-থ-১৭-৯০০১',
    licenseNumber: 'MYM-DL-51299-P',
    licenseType: 'পেশাদার (Professional)',
    nidNumber: '৪৫৬৭৮৯১২৩৪',
    nidVerified: true,
    licenseVerified: true,
    standName: 'বালিপাড়া রোড মোড় স্ট্যান্ড',
    lat: 24.4592,
    lng: 90.5542,
    rating: 4.8,
    totalTrips: 290,
    avatarBg: 'bg-emerald-700',
    isOnline: true,
    approxSpeedKmh: 28
  },
  {
    id: 'cng-6',
    name: 'শফিকুল ইসলাম',
    phone: '01922334455',
    category: 'cng',
    categoryBengali: 'সিএনজি অটো-রিকশা',
    vehicleModel: 'বাজাজ ফোর-স্ট্রোক সিএনজি',
    plateNumber: 'ময়মনসিংহ-থ-১৪-৫৬৭৮',
    regLastFour: '৫৬৭৮',
    manufacturingYear: '২০২৩',
    chassisNumber: 'CH-MYM-5678-X9',
    engineNumber: 'ENG-BAJAJ-5678-M',
    licenseNumber: 'MYM-DL-29104-P',
    licenseType: 'পেশাদার (Professional)',
    nidNumber: '৯৫১২৮৭৪৬৩০',
    nidVerified: true,
    licenseVerified: true,
    standName: 'কান্দার বাজার স্ট্যান্ড',
    lat: 24.4582,
    lng: 90.5412,
    rating: 4.7,
    totalTrips: 210,
    avatarBg: 'bg-emerald-700',
    isOnline: true,
    approxSpeedKmh: 28
  },

  // 3. Auto / Easybike (5 Drivers)
  {
    id: 'auto-1',
    name: 'মো. সুজন মিয়া',
    phone: '01755667788',
    category: 'auto',
    categoryBengali: 'অটো (ইজিবাইক)',
    vehicleModel: 'রানার সুপার সিক্স-সিটার ইজিবাইক',
    plateNumber: 'পৌর-ইজি-০৮৭২',
    licenseNumber: 'GAF-EASY-2023-88',
    licenseType: 'পেশাদার (Professional)',
    nidNumber: '৮৪৭২৯১০৫৭৩',
    nidVerified: true,
    licenseVerified: true,
    phoneVerified: true,
    standName: 'গফরগাঁও রেলওয়ে স্টেশন স্ট্যান্ড',
    lat: 24.4534,
    lng: 90.5478,
    rating: 4.8,
    totalTrips: 512,
    avatarBg: 'bg-teal-600',
    isOnline: true,
    approxSpeedKmh: 20
  },
  {
    id: 'auto-2',
    name: 'আমিনুল ইসলাম',
    phone: '01633445566',
    category: 'auto',
    categoryBengali: 'অটো (ইজিবাইক)',
    vehicleModel: 'নিউ ব্রান্ড ব্যাটারি চালিত অটো',
    plateNumber: 'পৌর-ইজি-১১০৪',
    licenseNumber: 'GAF-EASY-2024-12',
    licenseType: 'পেশাদার (Professional)',
    nidNumber: '৬৯৮২৩১০৫৭৮',
    nidVerified: false,
    licenseVerified: false,
    phoneVerified: false,
    standName: 'শিবগঞ্জ বাজার মোড় স্ট্যান্ড',
    lat: 24.4626,
    lng: 90.5632,
    rating: 4.9,
    totalTrips: 390,
    avatarBg: 'bg-teal-700',
    isOnline: false,
    approxSpeedKmh: 20
  },
  {
    id: 'auto-3',
    name: 'দেলোয়ার হোসেন',
    phone: '01744556677',
    category: 'auto',
    categoryBengali: 'অটো (ইজিবাইক)',
    vehicleModel: 'পদ্মা অটো কার (৬ সিটার)',
    plateNumber: 'পৌর-ইজি-০৫৬১',
    licenseNumber: 'GAF-EASY-2022-45',
    licenseType: 'পেশাদার (Professional)',
    nidNumber: '৪৫৬৯৮৭২৩১২',
    nidVerified: true,
    licenseVerified: true,
    standName: 'উপজেলা স্বাস্থ্য কমপ্লেক্স (হাসপাতাল) স্ট্যান্ড',
    lat: 24.4625,
    lng: 90.5432,
    rating: 4.7,
    totalTrips: 295,
    avatarBg: 'bg-teal-800',
    isOnline: true,
    approxSpeedKmh: 20
  },
  {
    id: 'auto-4',
    name: 'মো. বাবুল হোসেন',
    phone: '01833445566',
    category: 'auto',
    categoryBengali: 'অটো (ইজিবাইক)',
    vehicleModel: 'রানার সুপার সিক্স-সিটার ইজিবাইক',
    plateNumber: 'পৌর-ইজি-০৯৮১',
    licenseNumber: 'GAF-EASY-2023-55',
    licenseType: 'পেশাদার (Professional)',
    nidNumber: '৯৮৭৪৫৬৩২১০',
    nidVerified: true,
    licenseVerified: true,
    standName: 'দত্তপাড়া মোড় স্ট্যান্ড',
    lat: 24.4482,
    lng: 90.5492,
    rating: 4.8,
    totalTrips: 410,
    avatarBg: 'bg-teal-700',
    isOnline: true,
    approxSpeedKmh: 20
  },
  {
    id: 'auto-5',
    name: 'আলাউদ্দিন সরকার',
    phone: '01766778899',
    category: 'auto',
    categoryBengali: 'অটো (ইজিবাইক)',
    vehicleModel: 'পদ্মা অটো কার (নতুন মডেল)',
    plateNumber: 'পৌর-ইজি-১৪২০',
    licenseNumber: 'GAF-EASY-2024-34',
    licenseType: 'পেশাদার (Professional)',
    nidNumber: '৬৫৮৯৭৪১২৩০',
    nidVerified: true,
    licenseVerified: true,
    standName: 'কান্দার বাজার স্ট্যান্ড',
    lat: 24.4583,
    lng: 90.5414,
    rating: 4.7,
    totalTrips: 220,
    avatarBg: 'bg-teal-800',
    isOnline: true,
    approxSpeedKmh: 20
  },

  // 4. Car (3 Drivers)
  {
    id: 'car-1',
    name: 'মো. শাহজাহান মিয়া',
    phone: '01933445566',
    category: 'car',
    categoryBengali: 'কার (প্রাইভেট)',
    vehicleModel: 'টয়োটা এক্স করোলা (চিল্ড এসি)',
    plateNumber: 'ঢাকা-মেট্রো-গ-২২-৫৬০৪',
    licenseNumber: 'DHA-DL-98421-P',
    licenseType: 'পেশাদার (Professional)',
    nidNumber: '১৯৮৫২৬৯৩৪৭৪',
    nidVerified: true,
    licenseVerified: true,
    standName: 'গফরগাঁও রেলওয়ে স্টেশন স্ট্যান্ড',
    lat: 24.4535,
    lng: 90.5480,
    rating: 5.0,
    totalTrips: 490,
    avatarBg: 'bg-blue-600',
    isOnline: true,
    approxSpeedKmh: 35
  },
  {
    id: 'car-2',
    name: 'তৌহিদুল ইসলাম',
    phone: '01788990011',
    category: 'car',
    categoryBengali: 'কার (প্রাইভেট)',
    vehicleModel: 'টয়োটা প্রিমিও এফ-প্যাকেজ (সিলভার)',
    plateNumber: 'ঢাকা-মেট্রো-গ-২৭-৮৯১২',
    licenseNumber: 'DHA-DL-55210-P',
    licenseType: 'পেশাদার (Professional)',
    nidNumber: '৭৮৯৬৫৪১২৩০',
    nidVerified: true,
    licenseVerified: true,
    standName: 'পৌরসভা চত্বর স্ট্যান্ড',
    lat: 24.4518,
    lng: 90.5533,
    rating: 4.9,
    totalTrips: 340,
    avatarBg: 'bg-blue-700',
    isOnline: true,
    approxSpeedKmh: 35
  },
  {
    id: 'car-3',
    name: 'মো. শাহীনুল হক',
    phone: '01855667788',
    category: 'car',
    categoryBengali: 'কার (প্রাইভেট)',
    vehicleModel: 'টয়োটা অলিয়ন জি-প্যাকেজ',
    plateNumber: 'ঢাকা-মেট্রো-গ-২৩-৪৫৬৭',
    licenseNumber: 'DHA-DL-88340-P',
    licenseType: 'পেশাদার (Professional)',
    nidNumber: '১৯৮৮২৬৯৪৫১২',
    nidVerified: true,
    licenseVerified: true,
    standName: 'পাগলা থানা স্ট্যান্ড',
    lat: 24.3329,
    lng: 90.5823,
    rating: 4.9,
    totalTrips: 320,
    avatarBg: 'bg-blue-600',
    isOnline: true,
    approxSpeedKmh: 35
  },

  // 5. Microbus (2 Drivers)
  {
    id: 'micro-1',
    name: 'আব্দুল হাকিম বেপারী',
    phone: '01644556677',
    category: 'microbus',
    categoryBengali: 'মাইক্রোবাস',
    vehicleModel: 'টয়োটা নোহা এসআই (৮ সিট এসি)',
    plateNumber: 'ঢাকা-মেট্রো-চ-১৫-৭৮২১',
    licenseNumber: 'DHA-DL-77123-P',
    licenseType: 'পেশাদার (Professional)',
    nidNumber: '১২৩৪৫৬৭৮৯০',
    nidVerified: true,
    licenseVerified: true,
    standName: 'পৌরসভা চত্বর স্ট্যান্ড',
    lat: 24.4517,
    lng: 90.5531,
    rating: 4.8,
    totalTrips: 280,
    avatarBg: 'bg-indigo-600',
    isOnline: true,
    approxSpeedKmh: 32
  },
  {
    id: 'micro-2',
    name: 'মনিরুজ্জামান মনির',
    phone: '01799887766',
    category: 'microbus',
    categoryBengali: 'মাইক্রোবাস',
    vehicleModel: 'টয়োটা হাইয়েস সুপার জিএল (১১ সিট)',
    plateNumber: 'ঢাকা-মেট্রো-চ-১৯-৪২০৩',
    licenseNumber: 'DHA-DL-66409-P',
    licenseType: 'পেশাদার (Professional)',
    nidNumber: '৮৯৬৭৪৫২৩০১',
    nidVerified: true,
    licenseVerified: true,
    standName: 'গফরগাঁও রেলওয়ে স্টেশন স্ট্যান্ড',
    lat: 24.4539,
    lng: 90.5483,
    rating: 4.9,
    totalTrips: 410,
    avatarBg: 'bg-indigo-700',
    isOnline: true,
    approxSpeedKmh: 32
  },

  // 6. Motorcycle Drivers
  {
    id: 'bike-1',
    name: 'মো. তারেক হাসান',
    phone: '01711998822',
    category: 'bike',
    categoryBengali: 'মোটরসাইকেল',
    vehicleModel: 'হোন্ডা সিবি শাইন ১২৫ (লাল)',
    plateNumber: 'ময়মনসিংহ-হ-১৪-৫৬২১',
    licenseNumber: 'MYM-DL-33901-P',
    licenseType: 'পেশাদার (Professional)',
    nidNumber: '৭৪১২৫৮৯৬৩০',
    nidVerified: true,
    licenseVerified: true,
    standName: 'গফরগাঁও রেলওয়ে স্টেশন স্ট্যান্ড',
    lat: 24.4537,
    lng: 90.5482,
    rating: 4.9,
    totalTrips: 365,
    avatarBg: 'bg-amber-600',
    isOnline: true,
    approxSpeedKmh: 35
  },
  {
    id: 'bike-2',
    name: 'কাওসার আহমেদ',
    phone: '01822334455',
    category: 'bike',
    categoryBengali: 'মোটরসাইকেল',
    vehicleModel: 'বাজাজ ডিসকভার ১২৫ (কালো-নীল)',
    plateNumber: 'ময়মনসিংহ-হ-১৭-৮৯০১',
    licenseNumber: 'MYM-DL-51204-P',
    licenseType: 'পেশাদার (Professional)',
    nidNumber: '৮৫২০১৪৭৯৬৩',
    nidVerified: true,
    licenseVerified: true,
    standName: 'পৌরসভা চত্বর স্ট্যান্ড',
    lat: 24.4514,
    lng: 90.5536,
    rating: 4.8,
    totalTrips: 245,
    avatarBg: 'bg-amber-700',
    isOnline: true,
    approxSpeedKmh: 35
  },
  {
    id: 'bike-3',
    name: 'ফয়সাল মাহমুদ',
    phone: '01911224466',
    category: 'bike',
    categoryBengali: 'মোটরসাইকেল',
    vehicleModel: 'টিভিএস মেট্রো প্লাস ১১০',
    plateNumber: 'ময়মনসিংহ-হ-১৯-১২৩৪',
    licenseNumber: 'MYM-DL-82190-P',
    licenseType: 'পেশাদার (Professional)',
    nidNumber: '৯৬৩০১৪৭২৫৮',
    nidVerified: true,
    licenseVerified: true,
    standName: 'শিবগঞ্জ বাজার মোড় স্ট্যান্ড',
    lat: 24.4627,
    lng: 90.5629,
    rating: 4.7,
    totalTrips: 198,
    avatarBg: 'bg-amber-800',
    isOnline: true,
    approxSpeedKmh: 35
  },
  {
    id: 'bike-4',
    name: 'মো. সোহেল রানা',
    phone: '01819922334',
    category: 'bike',
    categoryBengali: 'মোটরসাইকেল',
    vehicleModel: 'ইয়ামাহা সালুটো ১২৫ (নীল)',
    plateNumber: 'ময়মনসিংহ-হ-২১-৩৪১২',
    licenseNumber: 'MYM-DL-67120-P',
    licenseType: 'পেশাদার (Professional)',
    nidNumber: '৭৪১২৫৮৯৬১০',
    nidVerified: true,
    licenseVerified: true,
    standName: 'রওনা বাজার মোড় স্ট্যান্ড',
    lat: 24.4321,
    lng: 90.5483,
    rating: 4.9,
    totalTrips: 310,
    avatarBg: 'bg-amber-600',
    isOnline: true,
    approxSpeedKmh: 35
  },
  {
    id: 'bike-5',
    name: 'নাজমুল হাসান',
    phone: '01723456789',
    category: 'bike',
    categoryBengali: 'মোটরসাইকেল',
    vehicleModel: 'বাজাজ পালসার ১৫০ (কালো)',
    plateNumber: 'ময়মনসিংহ-হ-১৮-৯০১২',
    licenseNumber: 'MYM-DL-49210-P',
    licenseType: 'পেশাদার (Professional)',
    nidNumber: '৮৫২৩৬৯৭৪১২',
    nidVerified: true,
    licenseVerified: true,
    standName: 'বালিপাড়া রোড মোড় স্ট্যান্ড',
    lat: 24.4593,
    lng: 90.5543,
    rating: 4.8,
    totalTrips: 275,
    avatarBg: 'bg-amber-700',
    isOnline: true,
    approxSpeedKmh: 35
  },
  {
    id: 'bike-6',
    name: 'ইমরান খান',
    phone: '01622334455',
    category: 'bike',
    categoryBengali: 'মোটরসাইকেল',
    vehicleModel: 'সুজুকি হায়াতে ১১০ (ধূসর)',
    plateNumber: 'ময়মনসিংহ-হ-১৬-৭৮৯০',
    licenseNumber: 'MYM-DL-58321-P',
    licenseType: 'পেশাদার (Professional)',
    nidNumber: '৩২১৬৫৪৯৮৭০',
    nidVerified: true,
    licenseVerified: true,
    standName: 'দত্তপাড়া মোড় স্ট্যান্ড',
    lat: 24.4481,
    lng: 90.5493,
    rating: 4.8,
    totalTrips: 180,
    avatarBg: 'bg-amber-800',
    isOnline: true,
    approxSpeedKmh: 35
  },

  // 7. Fire Service (1 Station Unit)
  {
    id: 'fire-1',
    name: 'গফরগাঁও ফায়ার স্টেশন ডিউটি অফিসার',
    phone: '01759117799',
    category: 'fire',
    categoryBengali: 'ফায়ার সার্ভিস',
    vehicleModel: 'জরুরি অগ্নিনির্বাপক ইঞ্জিন ও উদ্ধার যান',
    plateNumber: 'বিএফএস-রেসকিউ-০৭',
    licenseNumber: 'GOV-FS-2018-09',
    licenseType: 'পেশাদার (Professional)',
    nidNumber: 'সরকারি বিভাগীয় পরিচয়পত্র',
    nidVerified: true,
    licenseVerified: true,
    standName: 'পৌরসভা চত্বর (ফায়ার স্টেশন সংলগ্ন)',
    lat: 24.4510,
    lng: 90.5530,
    rating: 5.0,
    totalTrips: 999,
    avatarBg: 'bg-orange-600',
    isOnline: true,
    approxSpeedKmh: 45
  }
];

// Haversine Formula for Real Distance (in Kilometers)
function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(2));
}

// Calculate realistic ETA in minutes based on distance and vehicle speed
function calculateEtaMinutes(distanceKm: number, speedKmh: number): number {
  const roadFactor = 1.35; // Bangladeshi road turning / traffic coefficient
  const realisticDistance = distanceKm * roadFactor;
  const hours = realisticDistance / Math.max(speedKmh, 15);
  const minutes = Math.round(hours * 60);
  return Math.max(minutes, 2); // Minimum 2 minutes
}

// Category Badge Logo Component (Ensuring Red Medical Cross '+' for Ambulance)
function CategoryBadgeLogo({ category, size = 'md' }: { category: VehicleCategory; size?: 'compact' | 'sm' | 'md' | 'lg' }) {
  const sizeClasses = {
    compact: 'w-5 h-5 sm:w-6 sm:h-6 text-[10px]',
    sm: 'w-7 h-7 sm:w-8 sm:h-8 text-xs',
    md: 'w-9 h-9 text-sm',
    lg: 'w-11 h-11 text-base'
  }[size];

  const iconSizes = {
    compact: 'w-3 h-3 sm:w-3.5 sm:h-3.5',
    sm: 'w-4 h-4',
    md: 'w-4 h-4 sm:w-5 sm:h-5',
    lg: 'w-5 h-5 sm:w-6 sm:h-6'
  }[size];

  switch (category) {
    case 'all':
      return (
        <div 
          className={`${sizeClasses} rounded-md sm:rounded-lg bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center justify-center font-bold shadow-xs shrink-0`}
          title="সকল চালক"
        >
          <Users className={`${iconSizes} text-emerald-700`} />
        </div>
      );
    case 'ambulance':
      return (
        <div 
          className={`${sizeClasses} rounded-md sm:rounded-lg bg-white border border-red-600 flex items-center justify-center font-black shadow-xs shrink-0 relative overflow-hidden`}
          title="জরুরি এম্বুলেন্স (রেড ক্রস)"
        >
          {/* Authentic Red Medical '+' Cross Emblem */}
          <svg className={`${iconSizes} text-red-600`} viewBox="0 0 24 24" fill="currentColor">
            <path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6V3z" />
          </svg>
        </div>
      );
    case 'cng':
      return (
        <div className={`${sizeClasses} rounded-md sm:rounded-lg bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center justify-center font-bold shadow-xs shrink-0`}>
          <Truck className={`${iconSizes} text-emerald-700`} />
        </div>
      );
    case 'auto':
      return (
        <div className={`${sizeClasses} rounded-md sm:rounded-lg bg-teal-100 text-teal-800 border border-teal-300 flex items-center justify-center font-bold shadow-xs shrink-0`}>
          <svg className={`${iconSizes} text-teal-700`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="6" width="18" height="11" rx="3" />
            <circle cx="7" cy="18" r="2.5" fill="currentColor" />
            <circle cx="17" cy="18" r="2.5" fill="currentColor" />
            <path d="M7 6v4m10-4v4" />
          </svg>
        </div>
      );
    case 'car':
      return (
        <div className={`${sizeClasses} rounded-md sm:rounded-lg bg-blue-100 text-blue-800 border border-blue-300 flex items-center justify-center font-bold shadow-xs shrink-0`}>
          <Car className={`${iconSizes} text-blue-700`} />
        </div>
      );
    case 'microbus':
      return (
        <div className={`${sizeClasses} rounded-md sm:rounded-lg bg-indigo-100 text-indigo-800 border border-indigo-300 flex items-center justify-center font-bold shadow-xs shrink-0`}>
          <svg className={`${iconSizes} text-indigo-700`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="5" width="20" height="13" rx="2" />
            <path d="M2 11h20M7 5v6M17 5v6" />
            <circle cx="6.5" cy="18.5" r="2" fill="currentColor" />
            <circle cx="17.5" cy="18.5" r="2" fill="currentColor" />
          </svg>
        </div>
      );
    case 'bike':
      return (
        <div className={`${sizeClasses} rounded-md sm:rounded-lg bg-amber-100 text-amber-800 border border-amber-300 flex items-center justify-center font-bold shadow-xs shrink-0`}>
          <Bike className={`${iconSizes} text-amber-700`} />
        </div>
      );
    case 'fire':
      return (
        <div className={`${sizeClasses} rounded-md sm:rounded-lg bg-orange-100 text-orange-700 border border-orange-300 flex items-center justify-center font-bold shadow-xs shrink-0`}>
          <Flame className={`${iconSizes} text-orange-600`} />
        </div>
      );
    default:
      return (
        <div className={`${sizeClasses} rounded-md sm:rounded-lg bg-slate-100 text-slate-700 border border-slate-300 flex items-center justify-center font-bold shadow-xs shrink-0`}>
          <Navigation className={`${iconSizes}`} />
        </div>
      );
  }
}

export default function App() {
  // Navigation & Category filter (Default: 'all' - সকল চালক)
  const [selectedCategory, setSelectedCategory] = useState<VehicleCategory>('all');
  const [selectedStand, setSelectedStand] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSourceCodeModal, setShowSourceCodeModal] = useState(false);
  const [showEmergencyDirectory, setShowEmergencyDirectory] = useState(false);

  // 1. Dynamic Stands State (Manageable by Admin, persisted in localStorage with Google Maps auto-migration)
  const [stands, setStands] = useState<Stand[]>(() => {
    try {
      const saved = localStorage.getItem('safar_stands_v6');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length >= 10) {
          const hasInvalidCoords = parsed.some((s: any) => typeof s.lat !== 'number' || typeof s.lng !== 'number' || s.lat > 25.0 || s.lat < 24.0);
          if (!hasInvalidCoords) return parsed;
        }
      }
    } catch {}
    return GAFARGAON_STANDS;
  });

  useEffect(() => {
    try {
      localStorage.setItem('safar_stands_v6', JSON.stringify(stands));
    } catch {}
  }, [stands]);

  // 2. Dynamic Vehicle Categories State (Manageable by Admin, persisted in localStorage)
  const [categories, setCategories] = useState<VehicleCategoryItem[]>(() => {
    try {
      const saved = localStorage.getItem('safar_categories_v4');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          if (!parsed.some((c: any) => c.id === 'all')) {
            parsed.unshift(VEHICLE_CATEGORIES[0]);
          }
          return parsed;
        }
      }
    } catch {}
    return VEHICLE_CATEGORIES;
  });

  useEffect(() => {
    try {
      localStorage.setItem('safar_categories_v4', JSON.stringify(categories));
    } catch {}
  }, [categories]);

  // 3. Dynamic Emergency Hotlines State (Manageable by Admin, persisted in localStorage)
  const [hotlines, setHotlines] = useState<{
    hospital: string;
    fire: string;
    police: string;
    national: string;
  }>(() => {
    try {
      const saved = localStorage.getItem('safar_hotlines_v4');
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      hospital: '০১৭৩০-৩২৪৪৫২',
      fire: '০১৭৫৯-১১৭৭৯৯',
      police: '০১৩২০-১০৯৮৮৮',
      national: '৯৯৯'
    };
  });

  useEffect(() => {
    try {
      localStorage.setItem('safar_hotlines_v4', JSON.stringify(hotlines));
    } catch {}
  }, [hotlines]);

  // 3.1 Dynamic Full Emergency Contacts List (Managed in Admin Panel)
  const [emergencyContacts, setEmergencyContacts] = useState<EmergencyContact[]>(() => {
    try {
      const saved = localStorage.getItem('safar_emergency_contacts_v2');
      if (saved) return JSON.parse(saved);
    } catch {}
    return INITIAL_EMERGENCY_CONTACTS;
  });

  const handleSaveEmergencyContacts = (newContacts: EmergencyContact[]) => {
    setEmergencyContacts(newContacts);
    try {
      localStorage.setItem('safar_emergency_contacts_v2', JSON.stringify(newContacts));
    } catch {}
    setDoc(doc(db, 'hotlines', 'contacts_list'), {
      contacts: newContacts,
      updatedAt: new Date().toISOString()
    }, { merge: true }).catch(() => {});
  };

  // 4. Drivers State with LocalStorage Sync (Auto-migrated to exact Google Maps coordinates)
  const [drivers, setDrivers] = useState<Driver[]>(() => {
    try {
      const deletedIds: string[] = JSON.parse(localStorage.getItem('safar_deleted_driver_ids_v1') || '[]');
      const saved = localStorage.getItem('safar_drivers_v5');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const hasOutdatedGps = parsed.some((d: any) => d.lat > 24.52 || d.lat < 24.2);
          if (!hasOutdatedGps) {
            return parsed
              .filter((d: any) => d.id !== 'drv-1793153816766' && !(d.name === 'TASNIMUL KABEER' && d.standName?.includes('ঈমামবাড়ি')) && !deletedIds.includes(d.id))
              .map((d: any) => {
                const isTasnimul = (d.phone && d.phone.includes('01304841550')) || (d.name && d.name.toUpperCase().includes('TASNIMUL'));
                return {
                  ...d,
                  driverPhoto: d.driverPhoto || d.photoUrl || (isTasnimul ? '/assets/drivers/tasnimul_kabeer.png' : ''),
                  nidFrontPhoto: d.nidFrontPhoto || '',
                  nidBackPhoto: d.nidBackPhoto || '',
                  firstIssueDate: d.firstIssueDate || '',
                  regLastFour: d.regLastFour || (d.plateNumber ? d.plateNumber.replace(/[^0-9]/g, '').slice(-4) : '') || '',
                  manufacturingYear: d.manufacturingYear || '',
                  chassisNumber: d.chassisNumber || '',
                  engineNumber: d.engineNumber || '',
                  phoneVerified: d.phoneVerified !== undefined ? d.phoneVerified : (d.licenseVerified && d.nidVerified),
                  verificationStatus: (d.licenseVerified && (d.phoneVerified ?? true) && d.nidVerified) ? 'verified' : 'pending'
                };
              });
          }
        }
      }
    } catch {}
    const deletedIds: string[] = JSON.parse(localStorage.getItem('safar_deleted_driver_ids_v1') || '[]');
    return INITIAL_DRIVERS
      .filter(d => d.id !== 'drv-1793153816766' && !deletedIds.includes(d.id))
      .map(d => {
        const isLic = Boolean(d.licenseVerified);
        const isNid = Boolean(d.nidVerified);
        const isPhone = d.phoneVerified !== undefined ? Boolean(d.phoneVerified) : (isLic && isNid);
        const all3 = isLic && isNid && isPhone;
        return {
          ...d,
          firstIssueDate: d.firstIssueDate || '',
          regLastFour: d.regLastFour || (d.plateNumber ? d.plateNumber.replace(/[^0-9]/g, '').slice(-4) : '') || '',
          manufacturingYear: d.manufacturingYear || '',
          chassisNumber: d.chassisNumber || '',
          engineNumber: d.engineNumber || '',
          phoneVerified: isPhone,
          verificationStatus: all3 ? ('verified' as const) : ('pending' as const)
        };
      });
  });

  // Automatically persist drivers & sync to live location edge service
  useEffect(() => {
    try {
      localStorage.setItem('safar_drivers_v5', JSON.stringify(drivers));
    } catch {}
    if (drivers && drivers.length > 0) {
      liveLocationService.syncDriversFromCatalog(drivers);
    }
  }, [drivers]);

  // Real-time Firestore Sync for Drivers
  useEffect(() => {
    // Permanently purge fake drv-1793153816766 from Firestore if it ever exists
    deleteDoc(doc(db, 'drivers', 'drv-1793153816766')).catch(() => {});

    const unsubscribe = onSnapshot(collection(db, 'drivers'), (snapshot) => {
      const deletedIds: string[] = JSON.parse(localStorage.getItem('safar_deleted_driver_ids_v1') || '[]');
      if (!snapshot.empty) {
        const firestoreDrivers: Driver[] = [];
        snapshot.forEach((docSnap) => {
          // If this is the fake Tasnimul Kabeer duplicate card, permanently purge it
          if (docSnap.id === 'drv-1793153816766' || (docSnap.data().name === 'TASNIMUL KABEER' && docSnap.data().standName?.includes('ঈমামবাড়ি'))) {
            deleteDoc(doc(db, 'drivers', docSnap.id)).catch(() => {});
            return;
          }
          if (deletedIds.includes(docSnap.id)) {
            return;
          }
          const data = docSnap.data();
          firestoreDrivers.push({
            id: docSnap.id,
            name: data.name || data.nameBn || 'চালক',
            phone: data.phone || '',
            category: data.category || 'cng',
            categoryBengali: data.categoryBengali || 'যানবাহন',
            vehicleModel: data.vehicleModel || 'বাহন',
            plateNumber: data.plateNumber || data.licensePlate || '',
            licenseNumber: data.licenseNumber || '',
            firstIssueDate: data.firstIssueDate || '',
            licenseType: data.licenseType || 'পেশাদার (Professional)',
            regLastFour: data.regLastFour || (data.plateNumber ? data.plateNumber.replace(/[^0-9]/g, '').slice(-4) : '') || '',
            manufacturingYear: data.manufacturingYear || '',
            chassisNumber: data.chassisNumber || '',
            engineNumber: data.engineNumber || '',
            taxTokenReceiptPhoto: data.taxTokenReceiptPhoto || '',
            driverPhoto: data.driverPhoto || data.photoUrl || (((data.phone && data.phone.includes('01304841550')) || (data.name && data.name.toUpperCase().includes('TASNIMUL'))) ? '/assets/drivers/tasnimul_kabeer.png' : ''),
            nidFrontPhoto: data.nidFrontPhoto || '',
            nidBackPhoto: data.nidBackPhoto || '',
            nidNumber: data.nidNumber || '',
            nidVerified: data.nidVerified ?? false,
            licenseVerified: data.licenseVerified ?? false,
            phoneVerified: data.phoneVerified ?? false,
            verificationStatus: data.verificationStatus || (data.isVerified ? 'verified' : 'pending'),
            regAppId: data.regAppId || `SAFAR-REG-${docSnap.id.slice(-4)}`,
            registeredAt: data.registeredAt || 'অনলাইন',
            standName: data.standName || 'গফরগাঁও রেলওয়ে স্টেশন স্ট্যান্ড',
            lat: typeof data.lat === 'number' ? data.lat : 24.4536,
            lng: typeof data.lng === 'number' ? data.lng : 90.5479,
            rating: typeof data.rating === 'number' ? data.rating : 5.0,
            totalTrips: typeof data.totalTrips === 'number' ? data.totalTrips : 0,
            avatarBg: data.avatarBg || 'bg-emerald-700',
            isOnline: data.isOnline ?? true,
            approxSpeedKmh: data.approxSpeedKmh || 30
          });
        });

        setDrivers(prev => {
          const merged = [...firestoreDrivers];
          for (const initD of INITIAL_DRIVERS) {
            if (initD.id === 'drv-1793153816766' || deletedIds.includes(initD.id)) continue;
            if (!merged.some(m => m.id === initD.id || m.phone === initD.phone)) {
              merged.push(initD);
            }
          }
          return merged;
        });
      } else {
        // First-time seed initial drivers to Firestore
        INITIAL_DRIVERS.filter(d => d.id !== 'drv-1793153816766').forEach(d => {
          setDoc(doc(db, 'drivers', d.id), {
            ...d,
            updatedAt: new Date().toISOString()
          }).catch(err => console.warn('Firestore initial driver seed fallback:', err));
        });
      }
    }, (error) => {
      console.warn('Firestore drivers sync fallback:', error);
    });

    return () => unsubscribe();
  }, []);

  // Real-time Firestore Sync for Stands
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'stands'), (snapshot) => {
      if (!snapshot.empty) {
        const firestoreStands: Stand[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          firestoreStands.push({
            id: docSnap.id,
            name: data.name || docSnap.id,
            bengaliName: data.bengaliName || data.name || 'স্ট্যান্ড',
            location: data.location || data.bengaliName || '',
            lat: typeof data.lat === 'number' ? data.lat : 24.4536,
            lng: typeof data.lng === 'number' ? data.lng : 90.5479,
            activeDrivers: data.activeDrivers || 0,
            driverCount: data.driverCount || 0,
            isPopular: data.isPopular ?? false,
            description: data.description || ''
          });
        });
        setStands(firestoreStands);
      } else {
        // Seed initial stands to Firestore
        GAFARGAON_STANDS.forEach((s) => {
          setDoc(doc(db, 'stands', s.id), {
            ...s,
            updatedAt: new Date().toISOString()
          }).catch(() => {});
        });
      }
    }, (error) => {
      console.warn('Firestore stands sync fallback:', error);
    });

    return () => unsubscribe();
  }, []);

  // Real-time Firestore Sync for Vehicle Categories
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'categories'), (snapshot) => {
      if (!snapshot.empty) {
        const firestoreCats: VehicleCategoryItem[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          firestoreCats.push({
            id: docSnap.id as any,
            nameBengali: data.nameBengali || 'ক্যাটাগরি',
            subtitle: data.subtitle || 'যানবাহন সার্ভিস',
            badgeBg: data.badgeBg || 'bg-emerald-600',
            badgeBorder: data.badgeBorder || 'border-emerald-700',
            textColor: data.textColor || 'text-emerald-700',
            accentColor: data.accentColor || '#059669',
            baseFare: typeof data.baseFare === 'number' ? data.baseFare : 30,
            perKmFare: typeof data.perKmFare === 'number' ? data.perKmFare : 15,
            minFare: typeof data.minFare === 'number' ? data.minFare : 30,
            iconType: data.iconType || 'cng',
            isEmergency: data.isEmergency ?? false,
            isFree: data.isFree ?? false
          });
        });
        if (!firestoreCats.some(c => c.id === 'all')) {
          firestoreCats.unshift(VEHICLE_CATEGORIES[0]);
        }
        setCategories(firestoreCats);
      } else {
        // Seed initial categories to Firestore
        VEHICLE_CATEGORIES.forEach((c) => {
          setDoc(doc(db, 'categories', c.id), {
            ...c,
            updatedAt: new Date().toISOString()
          }).catch(() => {});
        });
      }
    }, (error) => {
      console.warn('Firestore categories sync fallback:', error);
    });

    return () => unsubscribe();
  }, []);

  // Real-time Firestore Sync for App Custom Settings & Appearance
  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, 'settings', 'app_config'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as AppCustomSettings;
        setAppCustomSettings(prev => ({
          ...prev,
          ...data
        }));
      } else {
        setDoc(doc(db, 'settings', 'app_config'), {
          ...appCustomSettings,
          updatedAt: new Date().toISOString()
        }).catch(() => {});
      }
    }, (error) => {
      console.warn('Firestore settings sync fallback:', error);
    });

    return () => unsubscribe();
  }, []);

  // Real-time Firestore Sync for Emergency Hotlines
  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, 'hotlines', 'emergency'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as any;
        setHotlines(prev => ({
          hospital: data.hospital || prev.hospital,
          fire: data.fire || prev.fire,
          police: data.police || prev.police,
          national: data.national || prev.national
        }));
      } else {
        setDoc(doc(db, 'hotlines', 'emergency'), {
          ...hotlines,
          updatedAt: new Date().toISOString()
        }).catch(() => {});
      }
    }, (error) => {
      console.warn('Firestore hotlines sync fallback:', error);
    });

    return () => unsubscribe();
  }, []);

  // Dynamic Stand Driver Count Calculation (Matches total count and categories seamlessly)
  const getStandDriverCount = (standBengaliName: string): number => {
    const cleanStand = standBengaliName.replace(' স্ট্যান্ড', '').trim().toLowerCase();
    return drivers.filter(d => {
      const driverStand = d.standName.replace(' স্ট্যান্ড', '').trim().toLowerCase();
      return driverStand.includes(cleanStand) || cleanStand.includes(driverStand);
    }).length;
  };

  // 5. Admin Dashboard & Security Gate States (Hidden from regular passengers & drivers)
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem('safar_admin_auth') === 'true';
    } catch {
      return false;
    }
  });
  const [showAdminAuthModal, setShowAdminAuthModal] = useState(false);
  const [showAdminDashboard, setShowAdminDashboard] = useState(false);
  const [adminPinInput, setAdminPinInput] = useState('');
  const [adminAuthError, setAdminAuthError] = useState<string | null>(null);
  const [adminActiveTab, setAdminActiveTab] = useState<'stands' | 'categories' | 'drivers' | 'hotlines' | 'stats'>('stands');
  const [adminToast, setAdminToast] = useState<string | null>(null);

  const showAdminToastMessage = (msg: string) => {
    setAdminToast(msg);
    setTimeout(() => setAdminToast(null), 3000);
  };

  // Stand Form Modal (Add / Edit)
  const [isStandModalOpen, setIsStandModalOpen] = useState(false);
  const [editingStandId, setEditingStandId] = useState<string | null>(null);
  const [standForm, setStandForm] = useState({
    bengaliName: '',
    name: '',
    lat: 24.4536,
    lng: 90.5479
  });

  // Category Form Modal (Add / Edit)
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [categoryForm, setCategoryForm] = useState({
    id: '',
    nameBengali: '',
    subtitle: '',
    badgeBg: 'bg-emerald-600',
    badgeBorder: 'border-emerald-700',
    textColor: 'text-emerald-700',
    accentColor: '#059669'
  });

  // Direct Driver Add Modal
  const [isDirectDriverModalOpen, setIsDirectDriverModalOpen] = useState(false);
  const [directDriverForm, setDirectDriverForm] = useState({
    name: '',
    phone: '',
    category: 'cng' as VehicleCategory,
    vehicleModel: '',
    plateNumber: '',
    licenseNumber: '',
    licenseType: 'পেশাদার (Professional)' as 'পেশাদার (Professional)' | 'অপেশাদার (Non-Professional)',
    nidNumber: '',
    standName: 'গফরগাঁও রেলওয়ে স্টেশন স্ট্যান্ড',
    licenseVerified: true,
    phoneVerified: true,
    nidVerified: true
  });

  const [adminDriverSearch, setAdminDriverSearch] = useState('');
  const [adminDriverCategoryFilter, setAdminDriverCategoryFilter] = useState('all');
  const [adminDriverStandFilter, setAdminDriverStandFilter] = useState('all');
  const [adminDriverVerificationFilter, setAdminDriverVerificationFilter] = useState<'all' | 'verified' | 'pending'>('all');

  // User Geolocation (Passenger GPS)
  const [passengerLocation, setPassengerLocation] = useState<{ lat: number; lng: number; isLiveGps: boolean }>({
    lat: 24.4527, // Gafargaon Pouroshova default center
    lng: 90.5545,
    isLiveGps: false
  });

  // Driver Details Modal State
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);

  // Persistent local dismissed/cancelled trip IDs (prevents stale or quota-failed Firestore docs from reappearing)
  // Persistent local dismissed/cancelled trip IDs (prevents stale or quota-failed Firestore docs from reappearing)
  const getDismissedTripIds = useCallback((): Set<string> => {
    try {
      const saved = localStorage.getItem('safar_dismissed_trip_ids_v2');
      if (saved) return new Set(JSON.parse(saved));
    } catch {}
    return new Set();
  }, []);

  const addDismissedTripId = useCallback((id: string) => {
    if (!id) return;
    try {
      const current = getDismissedTripIds();
      current.add(id);
      localStorage.setItem('safar_dismissed_trip_ids_v2', JSON.stringify(Array.from(current)));
    } catch {}
  }, [getDismissedTripIds]);

  // Persistent cleared past trip IDs (ensures cleared trips stay deleted across sessions and devices)
  const getClearedTripIds = useCallback((): Set<string> => {
    try {
      const saved = localStorage.getItem('safar_cleared_trip_ids_v2');
      if (saved) return new Set(JSON.parse(saved));
    } catch {}
    return new Set();
  }, []);

  const saveClearedTripIds = useCallback((set: Set<string>) => {
    try {
      localStorage.setItem('safar_cleared_trip_ids_v2', JSON.stringify(Array.from(set)));
    } catch {}
  }, []);

  // Live Booking / Passenger Confirmation Tracking State with LocalStorage Persistence
  const [activeBooking, setActiveBooking] = useState<{
    id?: string;
    requestId?: string;
    driver: Driver;
    passengerLat: number;
    passengerLng: number;
    destLat?: number;
    destLng?: number;
    currentDriverLat: number;
    currentDriverLng: number;
    confirmedAt: number;
    etaMinutes: number;
    distanceKm: number;
    status: 'en_route' | 'arrived' | 'in_transit' | 'completed';
    otp?: string;
    pickupTitle?: string;
    pickupLandmark?: string;
    destTitle?: string;
    fare?: number;
  } | null>(() => {
    try {
      const saved = localStorage.getItem('safar_active_booking_v2');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.driver && parsed.status && parsed.status !== 'completed' && parsed.status !== 'cancelled') {
          const tripId = parsed.id || parsed.requestId || '';
          const confirmedAt = parsed.confirmedAt || 0;
          // Stale check: if trip is over 35 minutes old or in dismissed list, purge immediately!
          const dismissed = new Set<string>();
          try {
            const stored = localStorage.getItem('safar_dismissed_trip_ids_v2');
            if (stored) {
              const list = JSON.parse(stored);
              if (Array.isArray(list)) list.forEach((x: string) => dismissed.add(x));
            }
          } catch {}
          if ((confirmedAt > 0 && Date.now() - confirmedAt > 35 * 60 * 1000) || (tripId && dismissed.has(tripId))) {
            localStorage.removeItem('safar_active_booking_v2');
            localStorage.removeItem('safar_my_ride_request_id');
            return null;
          }
          return parsed;
        }
      }
    } catch {}
    return null;
  });

  useEffect(() => {
    try {
      if (activeBooking && activeBooking.status !== 'completed') {
        localStorage.setItem('safar_active_booking_v2', JSON.stringify(activeBooking));
      } else {
        localStorage.removeItem('safar_active_booking_v2');
      }
    } catch {}
  }, [activeBooking]);

  // Completed Trip Review & Rating Modal State
  const [completedTripReview, setCompletedTripReview] = useState<{
    driver: Driver;
    fare: number;
    pickup: string;
    dest: string;
  } | null>(null);
  const [tripReviewRating, setTripReviewRating] = useState<number>(5);

  // App Customization & Dynamic Control Panel State
  const [appCustomSettings, setAppCustomSettings] = useState<AppCustomSettings>(() => {
    try {
      const saved = localStorage.getItem('safar_custom_settings_v3');
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      primaryColor: 'emerald',
      fontFamily: "'Hind Siliguri', sans-serif",
      fontSizeMode: 'normal',
      cardRadius: 'rounded-2xl',
      densityMode: 'standard',
      headerHotlineText: 'হাসপাতাল এম্বুলেন্স: ০১৭৩০-৩২৪৪৫২ | ফায়ার সার্ভিস: ০১৭৫৯-১১৭৭৯৯ | জরুরি ৯৯৯',
      announcementNotice: 'গফরগাঁও পৌরসভা ও পাগলা থানা এলাকার নির্ভরযোগ্য নিরাপদ যাত্রা সেবা',
      showLiveMapWidget: true,
      showQuickChipsWidget: true,
      showHotlineTicker: true,
      showDriverStatsRow: true,
      baseFareMinimum: 20,
      perKmMultiplier: 1.0,
      roundFareToNearest5: true,
      quickDestinations: [
        'উপজেলা স্বাস্থ্য কমপ্লেক্স (হাসপাতাল) স্ট্যান্ড',
        'গফরগাঁও রেলওয়ে স্টেশন স্ট্যান্ড',
        'পৌরসভা চত্বর স্ট্যান্ড',
        'পাগলা থানা স্ট্যান্ড',
        'শিবগঞ্জ বাজার মোড় স্ট্যান্ড'
      ]
    };
  });

  const saveCustomSettings = async (newSettings: AppCustomSettings) => {
    setAppCustomSettings(newSettings);
    try {
      localStorage.setItem('safar_custom_settings_v3', JSON.stringify(newSettings));
    } catch {}
    try {
      await setDoc(doc(db, 'settings', 'app_config'), {
        ...newSettings,
        updatedAt: new Date().toISOString()
      }, { merge: true });
    } catch (err) {
      console.warn('Failed to save settings to Firestore:', err);
    }
    showAdminToastMessage('অ্যাপ কাস্টমাইজেশন ও উইজেট সেটিংস সংরক্ষিত ও ফায়ারবেসে লাইভ সিঙ্ক হয়েছে!');
  };

  // Sync CSS properties to root html element
  useEffect(() => {
    const root = document.documentElement;
    const fontScaleMap = {
      compact: '92%',
      normal: '100%',
      large: '108%',
      xlarge: '116%'
    };
    root.style.fontSize = fontScaleMap[appCustomSettings.fontSizeMode] || '100%';

    if (appCustomSettings.fontFamily) {
      root.style.setProperty('--app-font-family', appCustomSettings.fontFamily);
    }

    const colorHexMap: Record<string, string> = {
      emerald: '#059669',
      forest: '#065f46',
      blue: '#0284c7',
      indigo: '#4338ca',
      purple: '#7c3aed',
      amber: '#d97706',
      crimson: '#dc2626'
    };
    const primaryHex = colorHexMap[appCustomSettings.primaryColor] || appCustomSettings.customHexColor || '#059669';
    root.style.setProperty('--app-primary', primaryHex);
  }, [appCustomSettings]);

  // Map touch protection on mobile/tablet
  const [isMapTouchUnlocked, setIsMapTouchUnlocked] = useState(false);
  const [showTouchNotice, setShowTouchNotice] = useState(false);

  // Driver Registration Modal State & 3-Step Verification Tracker
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [registerModalTab, setRegisterModalTab] = useState<'register' | 'status_check'>('register');
  const [activeSubmittedDriverId, setActiveSubmittedDriverId] = useState<string | null>(() => {
    try {
      return localStorage.getItem('safar_last_reg_driver_id');
    } catch {
      return null;
    }
  });
  const [statusCheckQuery, setStatusCheckQuery] = useState('');
  const [statusCheckResult, setStatusCheckResult] = useState<Driver | null>(null);
  const [statusCheckError, setStatusCheckError] = useState<string | null>(null);
  const [formValidationNotice, setFormValidationNotice] = useState<string | null>(null);

  const [registerForm, setRegisterForm] = useState({
    name: '',
    phone: '',
    category: 'bike' as VehicleCategory,
    vehicleModel: '',
    plateNumber: '',
    licenseNumber: '',
    firstIssueDate: '', // প্রথম ইস্যুর তারিখ (DD/MM/YYYY)
    licenseType: 'পেশাদার (Professional)' as 'পেশাদার (Professional)' | 'অপেশাদার (Non-Professional)',
    regLastFour: '', // রেজিস্ট্রেশন নম্বর (শেষ চার সংখ্যা)
    manufacturingYear: '', // উৎপাদনের বছর (YYYY)
    chassisNumber: '', // চ্যাসিস নম্বর
    engineNumber: '', // ইঞ্জিন নম্বর/মোটর নম্বর
    taxTokenReceiptPhoto: '', // সর্বশেষ ট্যাক্স টোকেন রিসিট ছবি (লাইটওয়েট অপ্টিমাইজড)
    driverPhoto: '', // চালকের সাম্প্রতিক রঙিন ছবি (মিনিমাম সাইজ)
    nidFrontPhoto: '', // NID এ পিঠ (সম্মুখভাগ) ছবি
    nidBackPhoto: '', // NID ও পিঠ (পেছনের ভাগ) ছবি
    standName: 'গফরগাঁও রেলওয়ে স্টেশন স্ট্যান্ড',
    nid: ''
  });

  // Client-side lightweight image compression (zero server cost & storage burden)
  const compressClientImage = (
    file: File,
    maxWidth: number,
    maxHeight: number,
    quality: number,
    onSuccess: (dataUrl: string, sizeKb: number) => void,
    onFinish: () => void
  ) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL('image/jpeg', quality);
          const sizeInKb = Math.round((compressed.length * 3) / 4 / 1024);
          onSuccess(compressed, sizeInKb);
        }
        onFinish();
      };
      img.onerror = () => onFinish();
    };
    reader.readAsDataURL(file);
  };

  // Upload loaders and size states for photos
  const [taxTokenUploadLoading, setTaxTokenUploadLoading] = useState(false);
  const [taxTokenSizeKb, setTaxTokenSizeKb] = useState<number | null>(null);

  const [driverPhotoUploadLoading, setDriverPhotoUploadLoading] = useState(false);
  const [driverPhotoSizeKb, setDriverPhotoSizeKb] = useState<number | null>(null);

  const [nidFrontUploadLoading, setNidFrontUploadLoading] = useState(false);
  const [nidFrontSizeKb, setNidFrontSizeKb] = useState<number | null>(null);

  const [nidBackUploadLoading, setNidBackUploadLoading] = useState(false);
  const [nidBackSizeKb, setNidBackSizeKb] = useState<number | null>(null);

  const handleTaxTokenPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setTaxTokenUploadLoading(true);
    compressClientImage(file, 550, 550, 0.50, (dataUrl, sizeKb) => {
      setTaxTokenSizeKb(sizeKb);
      setRegisterForm(prev => ({ ...prev, taxTokenReceiptPhoto: dataUrl }));
    }, () => setTaxTokenUploadLoading(false));
  };

  const handleDriverPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setDriverPhotoUploadLoading(true);
    compressClientImage(file, 250, 250, 0.60, (dataUrl, sizeKb) => {
      setDriverPhotoSizeKb(sizeKb);
      setRegisterForm(prev => ({ ...prev, driverPhoto: dataUrl }));
    }, () => setDriverPhotoUploadLoading(false));
  };

  const handleNidFrontPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setNidFrontUploadLoading(true);
    compressClientImage(file, 550, 380, 0.50, (dataUrl, sizeKb) => {
      setNidFrontSizeKb(sizeKb);
      setRegisterForm(prev => ({ ...prev, nidFrontPhoto: dataUrl }));
    }, () => setNidFrontUploadLoading(false));
  };

  const handleNidBackPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setNidBackUploadLoading(true);
    compressClientImage(file, 550, 380, 0.50, (dataUrl, sizeKb) => {
      setNidBackSizeKb(sizeKb);
      setRegisterForm(prev => ({ ...prev, nidBackPhoto: dataUrl }));
    }, () => setNidBackUploadLoading(false));
  };

  // App User Role (Passenger vs Driver) with URL query & LocalStorage persistence
  const [userRole, setUserRole] = useState<AppUserRole>(() => {
    try {
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        if (params.get('role') === 'driver' || params.get('openDriverTrip')) {
          return 'driver';
        }
        const saved = localStorage.getItem('safar_user_role');
        if (saved === 'driver' || saved === 'passenger') return saved;
      }
    } catch {}
    return 'passenger';
  });

  useEffect(() => {
    try {
      localStorage.setItem('safar_user_role', userRole);
    } catch {}
  }, [userRole]);

  const [showRoleGuideModal, setShowRoleGuideModal] = useState(false);
  const [showPassengerModal, setShowPassengerModal] = useState(false);
  const [passengerTab, setPassengerTab] = useState<'history' | 'profile'>('history');

  // Passenger Profile with LocalStorage Auto-Sync
  const [passengerProfile, setPassengerProfile] = useState<{
    name: string;
    phone: string;
    homeLocation: string;
    emergencyContact: string;
    isLoggedIn: boolean;
  }>(() => {
    try {
      const saved = localStorage.getItem('safar_passenger_profile_v5');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.isLoggedIn && parsed.phone) return parsed;
      }
    } catch (e) {}
    return {
      name: '',
      phone: '',
      homeLocation: '',
      emergencyContact: '',
      isLoggedIn: false
    };
  });

  // Save Passenger Profile on change
  useEffect(() => {
    try {
      localStorage.setItem('safar_passenger_profile_v5', JSON.stringify(passengerProfile));
    } catch (e) {}
  }, [passengerProfile]);

  // Temporary edit state for passenger profile
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editProfileForm, setEditProfileForm] = useState({
    name: passengerProfile.name,
    phone: passengerProfile.phone,
    homeLocation: passengerProfile.homeLocation,
    emergencyContact: passengerProfile.emergencyContact
  });
  const [profileSaveToast, setProfileSaveToast] = useState(false);

  // Passenger Authentication (Sign Up vs Login) & Profile States
  const [passengerAuthMode, setPassengerAuthMode] = useState<'signup' | 'login'>('signup');
  const [passengerLoginPhone, setPassengerLoginPhone] = useState('');
  const [passengerLoginPin, setPassengerLoginPin] = useState('');
  const [driverLoginPinInput, setDriverLoginPinInput] = useState('');
  const [showDriverInlineMap, setShowDriverInlineMap] = useState(false);
  const [passengerAuthError, setPassengerAuthError] = useState<string | null>(null);
  const [isPassengerAuthLoading, setIsPassengerAuthLoading] = useState(false);

  // WhatsApp OTP Verification & PIN Recovery State
  const [authOtpModal, setAuthOtpModal] = useState<{
    isOpen: boolean;
    role: 'passenger' | 'driver';
    phone: string;
    generatedCode: string;
    enteredCode: string;
    newPin: string;
    confirmNewPin: string;
    error: string | null;
    isSent: boolean;
  }>({
    isOpen: false,
    role: 'passenger',
    phone: '',
    generatedCode: '',
    enteredCode: '',
    newPin: '',
    confirmNewPin: '',
    error: null,
    isSent: false
  });

  // Form State for Sign Up
  const [passengerLoginForm, setPassengerLoginForm] = useState({
    name: '',
    phone: '',
    pin: '',
    confirmPin: '',
    homeLocation: '',
    emergencyContact: ''
  });

  // Helper to normalize any Bangladeshi phone number format
  const normalizeBdPhone = (phone: string): string => {
    if (!phone) return '';
    const digits = phone.replace(/[^0-9]/g, '');
    if (digits.length === 11 && digits.startsWith('01')) return digits;
    if (digits.length === 13 && digits.startsWith('8801')) return digits.slice(2);
    if (digits.length === 10 && digits.startsWith('1')) return '0' + digits;
    if (digits.length > 10) return '0' + digits.slice(-10);
    return digits;
  };

  // Helper: Trigger WhatsApp Recovery Modal & generate OTP
  const handleTriggerInstantOtp = async (role: 'passenger' | 'driver', phone: string) => {
    const rawClean = phone.replace(/[^0-9]/g, '');
    const clean = normalizeBdPhone(rawClean) || rawClean;
    if (!clean || clean.length < 10) {
      if (role === 'passenger') {
        setPassengerAuthError('WhatsApp রিকভারি কোড পাওয়ার জন্য সঠিক ১১ ডিজিটের মোবাইল নম্বর দিন');
      } else {
        setDriverLoginError('WhatsApp রিকভারি কোড পাওয়ার জন্য সঠিক মোবাইল নম্বর দিন');
      }
      return;
    }
    const code = String(Math.floor(1000 + Math.random() * 9000));
    setAuthOtpModal({
      isOpen: true,
      role,
      phone: clean,
      generatedCode: code,
      enteredCode: '',
      newPin: '',
      confirmNewPin: '',
      error: null,
      isSent: false
    });
    try {
      await setDoc(doc(db, 'whatsapp_verifications', clean), {
        phone: clean,
        code,
        role,
        createdAt: new Date().toISOString()
      }, { merge: true });
    } catch {}
    showAdminToastMessage(`📱 WhatsApp ভেরিফিকেশন প্রস্তুত: নিচের বাটনে চাপ দিয়ে WhatsApp এ কোড নিন`);
  };

  // Helper: Verify Entered OTP & Set Permanent PIN
  const handleVerifyInstantOtp = async () => {
    if (!authOtpModal.enteredCode.trim() || authOtpModal.enteredCode.trim() !== authOtpModal.generatedCode.trim()) {
      setAuthOtpModal(prev => ({
        ...prev,
        error: 'ভুল ওটিপি কোড! অনুগ্রহ করে আপনার WhatsApp এ পাঠানো ৪-ডিজিটের কোডটি সঠিকভাবে দিন।'
      }));
      return;
    }

    const cleanNewPin = authOtpModal.newPin.replace(/[^0-9]/g, '');
    if (cleanNewPin.length < 4) {
      setAuthOtpModal(prev => ({
        ...prev,
        error: 'অনুগ্রহ করে কমপক্ষে ৪-ডিজিটের নতুন সিকিউরিটি পিন নম্বর দিন।'
      }));
      return;
    }
    if (authOtpModal.confirmNewPin && cleanNewPin !== authOtpModal.confirmNewPin.replace(/[^0-9]/g, '')) {
      setAuthOtpModal(prev => ({
        ...prev,
        error: 'উভয় পিন নম্বর মেলেনি! অনুগ্রহ করে একই পিন লিখুন।'
      }));
      return;
    }

    if (authOtpModal.role === 'passenger') {
      const cleanPhone = normalizeBdPhone(authOtpModal.phone) || authOtpModal.phone.replace(/[^0-9]/g, '');
      let profileName = 'তাছনীমূল কাবীর';
      let profileHome = 'ইউ.এন.ও অফিস সংলগ্ন, বদরুল আলম রোড।';
      let profileContact = '';

      // 1. Try loading real passenger details from Firestore passengers collection
      try {
        let snap = await getDoc(doc(db, 'passengers', cleanPhone));
        if (!snap.exists() && cleanPhone !== authOtpModal.phone) {
          snap = await getDoc(doc(db, 'passengers', authOtpModal.phone));
        }
        if (!snap.exists()) {
          const q = query(collection(db, 'passengers'), where('phone', '==', cleanPhone));
          const qSnap = await getDocs(q);
          if (!qSnap.empty) {
            snap = qSnap.docs[0];
          }
        }
        if (!snap.exists()) {
          const uSnap = await getDoc(doc(db, 'users', cleanPhone));
          if (uSnap.exists()) snap = uSnap;
        }

        if (snap && snap.exists()) {
          const d = snap.data();
          if (d.name) profileName = d.name;
          if (d.passengerName) profileName = d.passengerName;
          if (d.homeLocation) profileHome = d.homeLocation;
          if (d.emergencyContact) profileContact = d.emergencyContact;
        } else if (passengerProfile.phone && passengerProfile.name) {
          profileName = passengerProfile.name;
          profileHome = passengerProfile.homeLocation;
          profileContact = passengerProfile.emergencyContact;
        }
      } catch (err) {
        console.warn('Firestore passenger lookup:', err);
      }

      const updatedProfile = {
        name: profileName,
        phone: cleanPhone,
        homeLocation: profileHome,
        emergencyContact: profileContact,
        isLoggedIn: true
      };

      // 2. Persist new PIN safely to Firestore passengers and users
      try {
        await setDoc(doc(db, 'passengers', cleanPhone), {
          ...updatedProfile,
          pin: cleanNewPin,
          updatedAt: new Date().toISOString()
        }, { merge: true });
        if (cleanPhone !== authOtpModal.phone) {
          await setDoc(doc(db, 'passengers', authOtpModal.phone), {
            ...updatedProfile,
            pin: cleanNewPin,
            updatedAt: new Date().toISOString()
          }, { merge: true });
        }
        await setDoc(doc(db, 'users', cleanPhone), {
          ...updatedProfile,
          pin: cleanNewPin,
          role: 'passenger',
          updatedAt: new Date().toISOString()
        }, { merge: true }).catch(() => {});
      } catch (err) {
        console.warn('Firestore passenger save fallback:', err);
      }

      setPassengerProfile(updatedProfile);
      setEditProfileForm(updatedProfile);
      try {
        localStorage.setItem('safar_passenger_profile_v5', JSON.stringify(updatedProfile));
      } catch {}

      try {
        loadPassengerTrips(cleanPhone);
      } catch {}

      setAuthOtpModal(prev => ({ ...prev, isOpen: false }));
      showAdminToastMessage(`🎉 স্বাগতম ${updatedProfile.name}! ৪-ডিজিট পিন সহ সফলভাবে লগইন হয়েছে`);
      return;
    } else {
      // Driver OTP & PIN recovery
      const clean = normalizeBdPhone(authOtpModal.phone) || authOtpModal.phone.replace(/[^0-9]/g, '');
      const last10 = clean.slice(-10);

      // 1. Look up in active memory drivers array
      let foundDriver: Driver | any = drivers.find(d => {
        const dp = (d.phone || '').replace(/[^0-9]/g, '');
        return dp === clean || dp.endsWith(last10) || clean.endsWith(dp.slice(-10));
      });

      // 2. Look up in Firestore drivers collection
      let firestoreDriver: any = null;
      let driverDocId = foundDriver?.id || null;
      try {
        const dSnap = await getDoc(doc(db, 'drivers', clean));
        if (dSnap.exists()) {
          firestoreDriver = dSnap.data();
          driverDocId = clean;
        } else {
          const q = query(collection(db, 'drivers'), where('phone', '==', clean));
          const qSnap = await getDocs(q);
          if (!qSnap.empty) {
            firestoreDriver = qSnap.docs[0].data();
            driverDocId = qSnap.docs[0].id;
          } else {
            // Check all driver docs for match on last 10 digits
            const allSnap = await getDocs(collection(db, 'drivers'));
            allSnap.forEach(docSnap => {
              const d = docSnap.data();
              const p = (d.phone || '').replace(/[^0-9]/g, '');
              if (p === clean || p.endsWith(last10) || clean.endsWith(p.slice(-10))) {
                firestoreDriver = d;
                driverDocId = docSnap.id;
              }
            });
          }
        }
      } catch (err) {
        console.warn('Driver lookup error:', err);
      }

      const finalDriverData = firestoreDriver || foundDriver;
      const driverName = finalDriverData?.name || finalDriverData?.nameBn || 'নিবন্ধিত চালক';
      const driverPhone = finalDriverData?.phone || clean;
      const driverCategory = (finalDriverData?.category as VehicleCategory) || 'bike';
      const driverVehicle = finalDriverData?.vehicleModel || finalDriverData?.vehicleName || 'মোটরসাইকেল';
      const driverPlate = finalDriverData?.plateNumber || finalDriverData?.licensePlate || '';
      const driverStand = finalDriverData?.standName || 'গফরগাঁও রেলওয়ে স্টেশন স্ট্যান্ড';
      const isTasnimul = clean.endsWith('01304841550') || clean.endsWith('304841550') || driverName.toUpperCase().includes('TASNIMUL');
      const driverPhoto = finalDriverData?.driverPhoto || finalDriverData?.photoUrl || (isTasnimul ? '/assets/drivers/tasnimul_kabeer.png' : '');
      const driverRating = typeof finalDriverData?.rating === 'number' ? finalDriverData.rating : 5.0;
      const driverTotalTrips = typeof finalDriverData?.totalTrips === 'number' ? finalDriverData.totalTrips : (finalDriverData?.todayTrips || 0);

      const activeProfile: typeof driverProfile = {
        id: driverDocId || `driver-${clean}`,
        name: driverName,
        phone: driverPhone,
        vehicleModel: driverVehicle,
        plateNumber: driverPlate,
        licenseNumber: finalDriverData?.licenseNumber || 'BRTA-GAF',
        standName: driverStand,
        category: driverCategory,
        rating: driverRating,
        todayTrips: driverTotalTrips,
        todayEarnings: driverTotalTrips * 80,
        driverPhoto: driverPhoto,
        isRegistered: true
      };

      // Save new PIN to Firestore
      try {
        if (driverDocId) {
          await setDoc(doc(db, 'drivers', driverDocId), { pin: cleanNewPin, ...finalDriverData }, { merge: true });
        }
        await setDoc(doc(db, 'drivers', clean), { pin: cleanNewPin }, { merge: true });
      } catch (err) {
        console.warn('Driver pin save error:', err);
      }

      setDriverProfile(activeProfile);
      try {
        localStorage.setItem('safar_active_driver_profile_v6', JSON.stringify(activeProfile));
      } catch {}

      setAuthOtpModal(prev => ({ ...prev, isOpen: false }));
      setUserRole('driver');
      showAdminToastMessage(`🎉 চালক ভেরিফিকেশন সফল! স্বাগতম ${activeProfile.name}`);
    }
  };

  // Load Trips for a Passenger from Firestore
  const loadPassengerTrips = async (phone: string) => {
    const clean = phone.replace(/[^0-9]/g, '');
    if (!clean) return;
    try {
      const q = query(
        collection(db, 'users', clean, 'trips'),
        orderBy('createdAt', 'desc'),
        limit(20)
      );
      const snapshot = await getDocs(q);
      const trips: PassengerTripRecord[] = [];
      snapshot.forEach(docSnap => {
        const d = docSnap.data();
        trips.push({
          id: docSnap.id,
          date: d.date || 'পূর্বে',
          pickupPoint: d.pickupPoint || '',
          destination: d.destination || '',
          driverName: d.driverName || 'চালক',
          driverPhone: d.driverPhone || '',
          vehicleCategory: d.vehicleCategory || 'auto',
          vehicleModel: d.vehicleModel || '',
          plateNumber: d.plateNumber || '',
          fare: Number(d.fare) || 40,
          status: d.status || 'সম্পন্ন',
          ratingGiven: Number(d.ratingGiven) || 5.0
        });
      });
      if (trips.length > 0) {
        setTripHistory(trips);
      }
    } catch (err) {
      console.warn('Error loading trips from Firestore:', err);
    }
  };

  // Handle New Passenger Sign Up (with 4-Digit Security PIN)
  const handlePassengerSignUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassengerAuthError(null);
    const cleanPhone = passengerLoginForm.phone.replace(/[^0-9]/g, '');
    const cleanName = passengerLoginForm.name.trim();
    const cleanPin = passengerLoginForm.pin.replace(/[^0-9]/g, '');

    if (!cleanName) {
      setPassengerAuthError('আপনার নাম লিখুন');
      return;
    }
    if (cleanPhone.length !== 11) {
      setPassengerAuthError('সঠিক ১১ ডিজিটের মোবাইল নম্বর দিন (যেমন: 017XXXXXXXX)');
      return;
    }
    if (cleanPin.length < 4) {
      setPassengerAuthError('নিরাপত্তার জন্য কমপক্ষে ৪ ডিজিটের পিন কোড দিন (যেমন: ১২৩৪)');
      return;
    }

    setIsPassengerAuthLoading(true);
    try {
      // Check if user already exists in Firestore
      const userRef = doc(db, 'passengers', cleanPhone);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const existingData = userSnap.data();
        // Check PIN if previously set
        if (existingData.pin && existingData.pin.toString().trim() !== cleanPin) {
          setPassengerAuthError('এই নম্বরে পূর্বেই অ্যাকাউন্ট রয়েছে কিন্তু দেওয়া পিন মেলেনি। লগইন ট্যাবে গিয়ে সঠিক পিন দিন বা ওটিপি ব্যবহার করুন।');
          setIsPassengerAuthLoading(false);
          return;
        }

        const profile = {
          name: existingData.name || cleanName,
          phone: cleanPhone,
          homeLocation: existingData.homeLocation || passengerLoginForm.homeLocation.trim() || 'গফরগাঁও',
          emergencyContact: existingData.emergencyContact || passengerLoginForm.emergencyContact.trim() || '',
          isLoggedIn: true
        };
        // Update PIN if not present
        if (!existingData.pin) {
          setDoc(userRef, { pin: cleanPin }, { merge: true }).catch(() => {});
        }
        setPassengerProfile(profile);
        setEditProfileForm(profile);
        loadPassengerTrips(cleanPhone);
        setProfileSaveToast(true);
        setTimeout(() => setProfileSaveToast(false), 3000);
        showAdminToastMessage(`স্বাগতম ${profile.name}! আপনার পূর্ববর্তী অ্যাকাউন্ট লোড হয়েছে`);
        setIsPassengerAuthLoading(false);
        return;
      }

      // Create new secure profile
      const newProfile = {
        name: cleanName,
        phone: cleanPhone,
        homeLocation: passengerLoginForm.homeLocation.trim() || 'গফরগাঁও পৌরসভা',
        emergencyContact: passengerLoginForm.emergencyContact.trim() || '',
        isLoggedIn: true
      };

      await setDoc(doc(db, 'passengers', cleanPhone), {
        ...newProfile,
        pin: cleanPin,
        createdAt: new Date().toISOString()
      });
      await setDoc(doc(db, 'users', cleanPhone), {
        ...newProfile,
        pin: cleanPin,
        role: 'passenger',
        updatedAt: new Date().toISOString()
      }, { merge: true });

      setPassengerProfile(newProfile);
      setEditProfileForm(newProfile);
      setProfileSaveToast(true);
      setTimeout(() => setProfileSaveToast(false), 3000);
      showAdminToastMessage(`🎉 স্বাগতম ${newProfile.name}! ৪-ডিজিট পিন সহ নিরাপদ যাত্রী প্রোফাইল তৈরি হয়েছে`);
    } catch (err) {
      console.warn('Sign Up error:', err);
      // Fallback local save
      const fallbackProfile = {
        name: cleanName,
        phone: cleanPhone,
        homeLocation: passengerLoginForm.homeLocation.trim() || 'গফরগাঁও পৌরসভা',
        emergencyContact: passengerLoginForm.emergencyContact.trim() || '',
        isLoggedIn: true
      };
      setPassengerProfile(fallbackProfile);
      setEditProfileForm(fallbackProfile);
      showAdminToastMessage(`স্বাগতম ${fallbackProfile.name}! প্রোফাইল সক্রিয় হয়েছে`);
    } finally {
      setIsPassengerAuthLoading(false);
    }
  };

  // Handle Existing Passenger Login (by Phone Number + 4-Digit Security PIN)
  const handlePassengerLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassengerAuthError(null);
    const cleanPhone = passengerLoginPhone.replace(/[^0-9]/g, '');
    const cleanPin = passengerLoginPin.replace(/[^0-9]/g, '');

    if (cleanPhone.length !== 11) {
      setPassengerAuthError('অনুগ্রহ করে সঠিক ১১ ডিজিটের মোবাইল নম্বর দিন (যেমন: 017XXXXXXXX)');
      return;
    }
    if (cleanPin.length < 4) {
      setPassengerAuthError('অনুগ্রহ করে আপনার ৪-ডিজিটের সিকিউরিটি পিন নম্বর দিন');
      return;
    }

    setIsPassengerAuthLoading(true);
    try {
      let snap = await getDoc(doc(db, 'passengers', cleanPhone));
      if (!snap.exists()) {
        snap = await getDoc(doc(db, 'users', cleanPhone));
      }

      if (snap.exists()) {
        const data = snap.data();
        // Check PIN security
        if (data.pin && data.pin.toString().trim() !== cleanPin) {
          setPassengerAuthError('ভুল সিকিউরিটি পিন! সঠিক পিন দিন অথবা নিচে "ওটিপি দিয়ে লগইন" বাটনে চাপ দিন।');
          setIsPassengerAuthLoading(false);
          return;
        }

        // If legacy account has no PIN yet, set this pin as their security PIN
        if (!data.pin) {
          setDoc(doc(db, 'passengers', cleanPhone), { pin: cleanPin }, { merge: true }).catch(() => {});
        }

        const loadedProfile = {
          name: data.name || data.passengerName || 'সম্মানিত যাত্রী',
          phone: cleanPhone,
          homeLocation: data.homeLocation || 'গফরগাঁও পৌরসভা',
          emergencyContact: data.emergencyContact || '',
          isLoggedIn: true
        };
        setPassengerProfile(loadedProfile);
        setEditProfileForm(loadedProfile);
        loadPassengerTrips(cleanPhone);
        setProfileSaveToast(true);
        setTimeout(() => setProfileSaveToast(false), 3000);
        showAdminToastMessage(`🎉 স্বাগতম ${loadedProfile.name}! পিন যাচাই করে সফলভাবে লগইন হয়েছে`);
      } else {
        setPassengerAuthError(`এই মোবাইল নম্বরে (${cleanPhone}) কোনো অ্যাকাউন্ট পাওয়া যায়নি। অনুগ্রহ করে প্রথমে 'সাইন আপ' করুন।`);
      }
    } catch (err) {
      console.warn('Login lookup error:', err);
      setPassengerAuthError('নেটওয়ার্ক সমস্যা হয়েছে। ইন্টারনেট সংযোগ চেক করুন।');
    } finally {
      setIsPassengerAuthLoading(false);
    }
  };

  const handlePassengerLogout = () => {
    setPassengerProfile({
      name: '',
      phone: '',
      homeLocation: '',
      emergencyContact: '',
      isLoggedIn: false
    });
    setPassengerLoginForm({
      name: '',
      phone: '',
      pin: '',
      confirmPin: '',
      homeLocation: '',
      emergencyContact: ''
    });
    setPassengerLoginPhone('');
    setPassengerAuthError(null);
    setTripHistory([]);
    try {
      localStorage.removeItem('safar_trip_history_v7');
      localStorage.removeItem('safar_trip_history_v6');
      localStorage.removeItem('safar_trip_history_v5');
      localStorage.removeItem('safar_passenger_profile_v5');
    } catch {}
    showAdminToastMessage('যাত্রী প্রোফাইল থেকে লগআউট সম্পন্ন হয়েছে');
  };

  // Past Trip History with LocalStorage Auto-Sync (Real, Dynamic & Synced with Firestore)
  // Default is clean [] - No dummy/fake past trips for unregistered users
  const [tripHistory, setTripHistory] = useState<PassengerTripRecord[]>(() => {
    try {
      localStorage.removeItem('safar_trip_history_v5');
      localStorage.removeItem('safar_trip_history_v6');
      const saved = localStorage.getItem('safar_trip_history_v7');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const cleared = getClearedTripIds();
          return parsed.filter(p => p && !cleared.has(p.id));
        }
      }
    } catch (e) {}
    return [];
  });

  // Automatically persist trip history on change
  useEffect(() => {
    try {
      const cleared = getClearedTripIds();
      const valid = tripHistory.filter(p => p && !cleared.has(p.id));
      localStorage.setItem('safar_trip_history_v7', JSON.stringify(valid));
    } catch (e) {}
  }, [tripHistory, getClearedTripIds]);

  // Real-time Firestore Sync for Passenger Trip History (dynamically loads trips for logged in passenger)
  useEffect(() => {
    if (!passengerProfile.isLoggedIn || !passengerProfile.phone) return;
    const cleanPhone = passengerProfile.phone.replace(/[^0-9]/g, '');
    if (!cleanPhone) return;

    const unsubscribe = onSnapshot(collection(db, 'users', cleanPhone, 'trips'), (snapshot) => {
      if (!snapshot.empty) {
        const cloudTrips: PassengerTripRecord[] = [];
        const cleared = getClearedTripIds();
        snapshot.forEach((docSnap) => {
          if (cleared.has(docSnap.id)) {
            // Delete from Firestore if quota permits
            deleteDoc(doc(db, 'users', cleanPhone, 'trips', docSnap.id)).catch(() => {});
            return;
          }
          const d = docSnap.data();
          cloudTrips.push({
            id: docSnap.id,
            date: d.date || '',
            pickupPoint: d.pickupPoint || '',
            destination: d.destination || '',
            driverName: d.driverName || '',
            driverPhone: d.driverPhone || '',
            vehicleCategory: d.vehicleCategory || 'auto',
            vehicleModel: d.vehicleModel || '',
            plateNumber: d.plateNumber || '',
            fare: d.fare || 0,
            status: d.status || 'সম্পন্ন',
            ratingGiven: d.ratingGiven || 5.0
          });
        });
        setTripHistory(cloudTrips);
      }
    }, (err) => {
      console.warn('Firestore passenger trips sync fallback:', err);
    });

    return () => unsubscribe();
  }, [passengerProfile.isLoggedIn, passengerProfile.phone, getClearedTripIds]);


  // Driver Cockpit States (When in 'driver' mode)
  const [isDriverOnline, setIsDriverOnline] = useState(true);
  const [driverProfile, setDriverProfile] = useState<{
    id?: string;
    name: string;
    phone: string;
    vehicleModel: string;
    plateNumber: string;
    licenseNumber: string;
    standName: string;
    category: VehicleCategory;
    rating: number;
    todayTrips: number;
    todayEarnings: number;
    driverPhoto?: string;
    isRegistered?: boolean;
    lat?: number;
    lng?: number;
  }>(() => {
    try {
      const saved = localStorage.getItem('safar_active_driver_profile_v6');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.isRegistered && parsed.phone) {
          const isTasnimul = (parsed.phone && parsed.phone.includes('01304841550')) || (parsed.name && parsed.name.toUpperCase().includes('TASNIMUL'));
          if (!parsed.driverPhoto && isTasnimul) {
            parsed.driverPhoto = '/assets/drivers/tasnimul_kabeer.png';
          }
          return parsed;
        }
      }
    } catch {}
    return {
      id: '',
      name: '',
      phone: '',
      vehicleModel: '',
      plateNumber: '',
      licenseNumber: '',
      standName: '',
      category: 'cng',
      rating: 5.0,
      todayTrips: 0,
      todayEarnings: 0,
      driverPhoto: '',
      isRegistered: false
    };
  });

  useEffect(() => {
    try {
      localStorage.setItem('safar_active_driver_profile_v6', JSON.stringify(driverProfile));
    } catch {}
  }, [driverProfile]);

  const [driverLoginPhoneInput, setDriverLoginPhoneInput] = useState('');
  const [driverLoginError, setDriverLoginError] = useState<string | null>(null);

  const handleDriverLogin = async (phoneInput: string, pinInput?: string) => {
    const rawClean = phoneInput.replace(/[^0-9]/g, '');
    const clean = normalizeBdPhone(rawClean) || rawClean;
    const last10 = clean.slice(-10);

    if (!clean || clean.length < 10) {
      setDriverLoginError('সঠিক মোবাইল নম্বর প্রদান করুন (কমপক্ষে ১০ ডিজিট)');
      return;
    }
    const found = drivers.find(d => {
      const dPhone = (d.phone || '').replace(/[^0-9]/g, '');
      return dPhone === clean || dPhone.endsWith(last10) || clean.endsWith(dPhone.slice(-10));
    });

    let firestoreDriver: any = null;
    let driverDocId: string | null = found?.id || null;
    try {
      const snap = await getDoc(doc(db, 'drivers', clean));
      if (snap.exists()) {
        firestoreDriver = snap.data();
        driverDocId = clean;
      } else {
        const q = query(collection(db, 'drivers'), where('phone', '==', clean));
        const qSnap = await getDocs(q);
        if (!qSnap.empty) {
          firestoreDriver = qSnap.docs[0].data();
          driverDocId = qSnap.docs[0].id;
        } else {
          // Scan all drivers for matching last 10 digits
          const allSnap = await getDocs(collection(db, 'drivers'));
          allSnap.forEach(docSnap => {
            const d = docSnap.data();
            const p = (d.phone || '').replace(/[^0-9]/g, '');
            if (p === clean || p.endsWith(last10) || clean.endsWith(p.slice(-10))) {
              firestoreDriver = d;
              driverDocId = docSnap.id;
            }
          });
        }
      }
    } catch {}

    const driverData = firestoreDriver || found;

    if (!driverData) {
      setDriverLoginError('এই নম্বরে কোনো নিবন্ধিত চালক অ্যাকাউন্ট পাওয়া যায়নি। অনুগ্রহ করে নিবন্ধন করুন।');
      return;
    }

    // PIN check - Mandatory for security
    const cleanPin = (pinInput || driverLoginPinInput).replace(/[^0-9]/g, '');
    if (!cleanPin || cleanPin.length < 4) {
      setDriverLoginError('৪-ডিজিটের সিকিউরিটি পিন দেওয়া বাধ্যতামূলক। সঠিক পিন দিন।');
      return;
    }

    if (driverData.pin) {
      if (driverData.pin.toString().trim() !== cleanPin) {
        setDriverLoginError('ভুল চালক পিন কোড! সঠিক পিন দিন অথবা নিচে WhatsApp দিয়ে রিকভার করুন।');
        return;
      }
    } else {
      // Legacy account without PIN set (e.g. 01304841550) - permanently save entered PIN
      try {
        await setDoc(doc(db, 'drivers', clean), { pin: cleanPin }, { merge: true });
        if (driverDocId) {
          await setDoc(doc(db, 'drivers', driverDocId), { pin: cleanPin }, { merge: true });
        }
      } catch {}
      showAdminToastMessage(`স্বাগতম ${driverData.name || driverData.nameBn || 'চালক'}! আপনার ৪-ডিজিটের সিকিউরিটি পিন সফলভাবে সংরক্ষিত হয়েছে।`);
    }

    const driverName = driverData.name || driverData.nameBn || 'নিবন্ধিত চালক';
    const driverVehicle = driverData.vehicleModel || driverData.vehicleName || 'মোটরসাইকেল';
    const driverPlate = driverData.plateNumber || driverData.licensePlate || '';
    const driverStand = driverData.standName || 'গফরগাঁও রেলওয়ে স্টেশন স্ট্যান্ড';
    const driverCategory = (driverData.category as VehicleCategory) || 'bike';
    const driverRating = typeof driverData.rating === 'number' ? driverData.rating : 5.0;
    const driverTotalTrips = typeof driverData.totalTrips === 'number' ? driverData.totalTrips : (driverData.todayTrips || 0);

    const isTasnimul = clean.endsWith('01304841550') || clean.endsWith('304841550') || driverName.toUpperCase().includes('TASNIMUL');
    const resolvedPhoto = driverData.driverPhoto || driverData.photoUrl || (isTasnimul ? '/assets/drivers/tasnimul_kabeer.png' : '');

    const active: typeof driverProfile = {
      id: driverDocId || `driver-${clean}`,
      name: driverName,
      phone: driverData.phone || clean,
      vehicleModel: driverVehicle,
      plateNumber: driverPlate,
      licenseNumber: driverData.licenseNumber || 'BRTA-GAF',
      standName: driverStand,
      category: driverCategory,
      rating: driverRating,
      todayTrips: driverTotalTrips,
      todayEarnings: driverTotalTrips * 80,
      driverPhoto: resolvedPhoto,
      isRegistered: true
    };
    if (!driverData.driverPhoto && resolvedPhoto) {
      try {
        setDoc(doc(db, 'drivers', clean), { driverPhoto: resolvedPhoto, photoUrl: resolvedPhoto }, { merge: true }).catch(() => {});
        if (driverDocId) {
          setDoc(doc(db, 'drivers', driverDocId), { driverPhoto: resolvedPhoto, photoUrl: resolvedPhoto }, { merge: true }).catch(() => {});
        }
      } catch {}
    }
    setDriverProfile(active);
    try {
      localStorage.setItem('safar_active_driver_profile_v6', JSON.stringify(active));
    } catch {}
    setDriverLoginError(null);
    setDriverLoginPhoneInput('');
    setDriverLoginPinInput('');
    showAdminToastMessage(`স্বাগতম, ${driverName}! আপনার চালক কন্ট্রোল ড্যাশবোর্ড সক্রিয় হয়েছে।`);
  };

  const handleDriverLogout = () => {
    setDriverProfile({
      id: '',
      name: '',
      phone: '',
      vehicleModel: '',
      plateNumber: '',
      licenseNumber: '',
      standName: '',
      category: 'cng',
      rating: 5.0,
      todayTrips: 0,
      todayEarnings: 0,
      driverPhoto: '',
      isRegistered: false
    });
    try {
      localStorage.removeItem('safar_active_driver_profile_v6');
    } catch {}
    showAdminToastMessage('চালক একাউন্ট থেকে সফলভাবে লগআউট করা হয়েছে।');
  };

  const handleDriverCockpitPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Ultra-lightweight compression (250x250, 0.60 quality -> only ~12 to 18 KB in Firestore)
    compressClientImage(file, 250, 250, 0.60, (dataUrl, sizeKb) => {
      setDriverProfile(prev => {
        const updated = { ...prev, driverPhoto: dataUrl };
        try {
          localStorage.setItem('safar_active_driver_profile_v6', JSON.stringify(updated));
        } catch {}
        return updated;
      });
      setDrivers(prev => prev.map(d => {
        if (d.phone === driverProfile.phone || d.id === driverProfile.id) {
          return { ...d, driverPhoto: dataUrl, photoUrl: dataUrl };
        }
        return d;
      }));
      if (driverProfile.id) {
        setDoc(doc(db, 'drivers', driverProfile.id), { driverPhoto: dataUrl, photoUrl: dataUrl }, { merge: true }).catch(() => {});
      }
      if (driverProfile.phone) {
        const cleanP = driverProfile.phone.replace(/[^0-9]/g, '');
        setDoc(doc(db, 'drivers', cleanP), { driverPhoto: dataUrl, photoUrl: dataUrl }, { merge: true }).catch(() => {});
      }
      showAdminToastMessage(`চালকের নতুন ছবি সফলভাবে আপডেট হয়েছে (${sizeKb} KB)`);
    }, () => {});
  };

  // Real-Time Incoming Passenger Requests in Driver Cockpit (Synced Live with Firestore)
  // Default is clean [] - NO hardcoded dummy/fake accounts or fake requests
  const [passengerRequests, setPassengerRequests] = useState<PassengerRideRequest[]>(() => {
    try {
      localStorage.removeItem('safar_passenger_requests_v3');
    } catch (e) {}
    return [];
  });



  // Passenger Ride Booking Hub State (Dynamic Pickup, Destination & Fare Calculation)
  // Default is empty so no dummy route or distance line is drawn until user selects locations
  const [passengerPickup, setPassengerPickup] = useState<string>('');
  const [passengerPickupLandmark, setPassengerPickupLandmark] = useState<string>('');
  const [passengerDestination, setPassengerDestination] = useState<string>('');
  const [pickupCoords, setPickupCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [destCoords, setDestCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [passengerSelectedVehicle, setPassengerSelectedVehicle] = useState<VehicleCategory>('cng');
  const [isRidePlannerCollapsed, setIsRidePlannerCollapsed] = useState<boolean>(false);
  const [isQuickDestOpen, setIsQuickDestOpen] = useState<boolean>(false);
  const [isVehicleFareOpen, setIsVehicleFareOpen] = useState<boolean>(false);

  // Popular Places State (Managed via Admin Control Panel & Synced with Autocomplete Dropdown)
  const [popularPlaces, setPopularPlaces] = useState<GafargaonPlace[]>(() => {
    try {
      const saved = localStorage.getItem('safar_popular_places_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.filter(p => !p.bengaliName?.includes('গয়েশপুর ইউনিয়ন পরিষদ') && !p.id?.includes('gayeshpur-up'));
        }
      }
    } catch {}
    return GAFARGAON_PLACES;
  });

  // Real-time Firestore Sync for Popular Places (Cross-device, real-time live sync)
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'places'), (snapshot) => {
      if (!snapshot.empty) {
        const firestorePlaces: GafargaonPlace[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          const bName = data.bengaliName || data.name || '';
          // Permanently purge any erroneous Goyeshpur UP bhaban
          if (bName.includes('গয়েশপুর ইউনিয়ন পরিষদ') || bName.includes('গয়েশপুর ইউপি') || docSnap.id.includes('gayeshpur-up')) {
            deleteDoc(doc(db, 'places', docSnap.id)).catch(() => {});
            return;
          }

          let area = data.area || 'গফরগাঁও পৌরসভা';
          if (area.includes('গয়েশপুর ইউনিয়ন')) {
            area = area.replace(/গয়েশপুর ইউনিয়ন( \(পাগলা\))?/g, 'পাইথল ইউনিয়ন (পাগলা)');
          }

          firestorePlaces.push({
            id: docSnap.id,
            name: data.name || docSnap.id,
            bengaliName: bName,
            category: data.category || 'অন্যান্য',
            area: area,
            lat: typeof data.lat === 'number' ? data.lat : 24.4536,
            lng: typeof data.lng === 'number' ? data.lng : 90.5479
          });
        });
        setPopularPlaces(firestorePlaces);
        try {
          localStorage.setItem('safar_popular_places_v1', JSON.stringify(firestorePlaces));
        } catch {}
      } else {
        // First-time seed initial 42 places to Firestore
        GAFARGAON_PLACES.forEach(p => {
          setDoc(doc(db, 'places', p.id), {
            ...p,
            updatedAt: new Date().toISOString()
          }).catch(() => {});
        });
      }
    }, (error) => {
      console.warn('Firestore places sync fallback:', error);
    });

    return () => unsubscribe();
  }, []);

  const handleSavePopularPlace = (place: GafargaonPlace) => {
    setPopularPlaces(prev => {
      const idx = prev.findIndex(p => p.id === place.id);
      let updated: GafargaonPlace[];
      if (idx >= 0) {
        updated = [...prev];
        updated[idx] = place;
      } else {
        updated = [...prev, place];
      }
      try {
        localStorage.setItem('safar_popular_places_v1', JSON.stringify(updated));
      } catch {}
      return updated;
    });
    setDoc(doc(db, 'places', place.id), {
      ...place,
      updatedAt: new Date().toISOString()
    }, { merge: true }).catch(() => {});
    showAdminToastMessage(`'${place.bengaliName}' স্থানটি ক্লাউড ফায়ারবেসে সেভ ও লাইভ সিঙ্ক হয়েছে!`);
  };

  const handleDeletePopularPlace = (placeId: string, name: string) => {
    setPopularPlaces(prev => {
      const updated = prev.filter(p => p.id !== placeId);
      try {
        localStorage.setItem('safar_popular_places_v1', JSON.stringify(updated));
      } catch {}
      return updated;
    });
    deleteDoc(doc(db, 'places', placeId)).catch(() => {});
    showAdminToastMessage(`'${name}' স্থানটি সফলভাবে মুছে ফেলা হয়েছে`);
  };

  const handleResetPopularPlaces = () => {
    setPopularPlaces(GAFARGAON_PLACES);
    try {
      localStorage.setItem('safar_popular_places_v1', JSON.stringify(GAFARGAON_PLACES));
    } catch {}
    GAFARGAON_PLACES.forEach(p => {
      setDoc(doc(db, 'places', p.id), {
        ...p,
        updatedAt: new Date().toISOString()
      }).catch(() => {});
    });
    showAdminToastMessage('জনপ্রিয় স্থানসমূহ ডিফল্ট তালিকায় রিস্টোর ও ক্লাউডে সিঙ্ক হয়েছে');
  };

  // Memoized unified places and stands list for 15-Union Autocomplete in Pickup & Destination
  const allAutocompletePlaces = useMemo(() => {
    const list: any[] = [];
    const addedNames = new Set<string>();

    // 1. Add all 15 unions' stands and popular places from COMPREHENSIVE_UNION_PLACES
    COMPREHENSIVE_UNION_PLACES.forEach(p => {
      const key = p.bengaliName.trim().toLowerCase();
      if (!addedNames.has(key)) {
        addedNames.add(key);
        list.push({
          id: p.id,
          name: p.name || p.bengaliName,
          bengaliName: p.bengaliName,
          category: p.category,
          categoryLabel: p.category,
          area: p.area,
          unionNameBengali: p.unionNameBengali,
          searchKeywords: p.searchKeywords || [],
          isStand: p.isStand,
          lat: p.lat,
          lng: p.lng
        });
      }
    });

    // 2. Add or override with admin-managed popular places from Firestore
    popularPlaces.forEach(p => {
      const key = p.bengaliName.trim().toLowerCase();
      if (key.includes('গয়েশপুর ইউনিয়ন পরিষদ') || key.includes('গয়েশপুর ইউপি') || p.id.includes('gayeshpur-up')) return;

      if (!addedNames.has(key)) {
        addedNames.add(key);
        const unionMatch = GAFARGAON_UNIONS.find(u => 
          (p.area && p.area.includes(u.nameBengali)) ||
          (p.area && p.area.includes(u.nameBengali.replace(' ইউনিয়ন', '').replace(' (পাগলা)', '')))
        );
        const unionName = unionMatch ? unionMatch.nameBengali : (p.area || 'গফরগাঁও পৌরসভা');
        list.push({
          id: p.id,
          name: p.name,
          bengaliName: p.bengaliName,
          category: p.category,
          categoryLabel: p.category,
          area: p.area || unionName,
          unionNameBengali: unionName,
          unionId: unionMatch ? unionMatch.id : 'pourashava',
          isStand: p.category === 'স্ট্যান্ড',
          lat: p.lat,
          lng: p.lng
        });
      }
    });

    // 3. Add stands
    stands.forEach(s => {
      const key = s.bengaliName.trim().toLowerCase();
      if (!addedNames.has(key)) {
        addedNames.add(key);
        const unionMatch = GAFARGAON_UNIONS.find(u => 
          (s.location && s.location.includes(u.nameBengali)) ||
          (s.area && s.area.includes(u.nameBengali)) ||
          (s.location && s.location.includes(u.nameBengali.replace(' ইউনিয়ন', '').replace(' (পাগলা)', ''))) ||
          (s.area && s.area.includes(u.nameBengali.replace(' ইউনিয়ন', '').replace(' (পাগলা)', '')))
        );
        const unionName = unionMatch ? unionMatch.nameBengali : (s.area || s.location || 'গফরগাঁও পৌরসভা');
        list.push({
          id: s.id,
          name: s.name,
          bengaliName: s.bengaliName,
          category: 'স্ট্যান্ড',
          categoryLabel: 'স্ট্যান্ড',
          area: s.location || s.area || unionName,
          unionNameBengali: unionName,
          unionId: unionMatch ? unionMatch.id : 'pourashava',
          isStand: true,
          lat: s.lat,
          lng: s.lng
        });
      }
    });

    return list;
  }, [popularPlaces, stands]);

  // Helper to resolve live GPS coordinates into nearest recognized Gafargaon/Pagla stand or landmark name
  const getNearestLocationName = useCallback((lat: number, lng: number): string => {
    let closestPlace: any = null;
    let minDist = Infinity;
    for (const p of allAutocompletePlaces) {
      if (typeof p.lat === 'number' && typeof p.lng === 'number') {
        const d = Math.hypot(p.lat - lat, p.lng - lng);
        if (d < minDist) {
          minDist = d;
          closestPlace = p;
        }
      }
    }
    if (closestPlace && minDist < 0.06) {
      return closestPlace.bengaliName;
    }
    return 'গফরগাঁও পৌরসভা চত্বর';
  }, [allAutocompletePlaces]);

  // Active Pending Request submitted by this passenger
  const [passengerPendingRequest, setPassengerPendingRequest] = useState<PassengerRideRequest | null>(() => {
    try {
      const saved = localStorage.getItem('safar_passenger_pending_v2');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return null;
  });

  // Track dismissed incoming driver alert IDs so driver doesn't see rejected/accepted popups again
  const [dismissedAlertIds, setDismissedAlertIds] = useState<Record<string, boolean>>({});
  // Splash screen state matching IMG-12
  const [showAppSplash, setShowAppSplash] = useState(true);

  useEffect(() => {
    try {
      if (passengerPendingRequest) {
        localStorage.setItem('safar_passenger_pending_v2', JSON.stringify(passengerPendingRequest));
      } else {
        localStorage.removeItem('safar_passenger_pending_v2');
      }
    } catch (e) {}
  }, [passengerPendingRequest]);

  // Real-Time Firestore Synchronization for Live Ride Requests
  useEffect(() => {
    // Pure read listener with safe limit
    const q = query(
      collection(db, 'ride_requests'),
      limit(50)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const liveList: PassengerRideRequest[] = [];
      const now = Date.now();

      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (!data || !data.status) return;

        // Extract accurate timestamp
        let reqTime = typeof data.createdAtMs === 'number' ? data.createdAtMs : 0;
        if (!reqTime && data.requestedAt) {
          const t = new Date(data.requestedAt).getTime();
          if (!isNaN(t)) reqTime = t;
        }
        if (!reqTime && data.createdAt) {
          const t = new Date(data.createdAt).getTime();
          if (!isNaN(t)) reqTime = t;
        }

        // Auto-ignore stale cancelled/completed trips older than 4 hours
        const isStale = (reqTime > 0 && now - reqTime > 4 * 60 * 60 * 1000);
        if (isStale && (data.status === 'completed' || data.status === 'cancelled')) {
          return;
        }

        // If driver completed this trip, update passenger's history and reset state (only if matching current active booking)
        if (data.status === 'completed') {
          if (activeBooking && ((activeBooking as any).requestId === docSnap.id || (activeBooking as any).id === docSnap.id)) {
            const finalFare = data.estFare || activeBooking.fare || 40;
            const tripDocId = `trip-${docSnap.id}`;
            if (passengerProfile.isLoggedIn) {
              const newTripRecord: PassengerTripRecord = {
                id: tripDocId,
                date: 'আজ, ' + new Date().toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' }),
                pickupPoint: activeBooking.pickupTitle || passengerPickup || 'শুরুর স্থান',
                destination: activeBooking.destTitle || passengerDestination || 'গন্তব্য স্থান',
                driverName: data.driverName || activeBooking.driver.name,
                driverPhone: data.driverPhone || activeBooking.driver.phone,
                vehicleCategory: data.driverCategory || activeBooking.driver.category,
                vehicleModel: data.driverVehicleModel || activeBooking.driver.vehicleModel,
                plateNumber: data.driverLicensePlate || activeBooking.driver.plateNumber,
                fare: finalFare,
                status: 'সম্পন্ন',
                ratingGiven: 5.0
              };
              (newTripRecord as any).requestId = docSnap.id;
              setTripHistory(prev => {
                if (prev.some(t => t.id === tripDocId || (t as any).requestId === docSnap.id)) {
                  return prev;
                }
                return [newTripRecord, ...prev];
              });
            }
            setActiveBooking(null);
            setPickupCoords(null);
            setDestCoords(null);
            setPassengerPickup('');
            setPassengerDestination('');
            try {
              localStorage.removeItem('safar_active_booking_v2');
              localStorage.removeItem('safar_my_ride_request_id');
            } catch {}
            showAdminToastMessage(`🎉 চালক ট্রিপ সফলভাবে সম্পন্ন করেছেন! নির্ধারিত ভাড়া: ৳ ${finalFare}`);
          }
          return;
        }

        // If current passenger was waiting for or in this trip and it was cancelled, reset state cleanly
        if (data.status === 'cancelled') {
          if (passengerPendingRequest && passengerPendingRequest.id === docSnap.id) {
            setPassengerPendingRequest(null);
            setPickupCoords(null);
            setDestCoords(null);
            setPassengerPickup('');
            setPassengerDestination('');
            try {
              localStorage.removeItem('safar_passenger_pending_v2');
              localStorage.removeItem('safar_my_ride_request_id');
            } catch {}
            showAdminToastMessage('যাত্রার অনুরোধটি বাতিল হয়েছে');
          }
          if (activeBooking && ((activeBooking as any).requestId === docSnap.id || (activeBooking as any).id === docSnap.id)) {
            setActiveBooking(null);
            setPickupCoords(null);
            setDestCoords(null);
            setPassengerPickup('');
            setPassengerDestination('');
            try {
              localStorage.removeItem('safar_active_booking_v2');
              localStorage.removeItem('safar_my_ride_request_id');
            } catch {}
            showAdminToastMessage('ট্রিপটি বাতিল হয়েছে এবং ম্যাপ ক্লিয়ার করা হয়েছে');
          }
          return;
        }

        // Push active requests (pending, accepted, in_transit)
        liveList.push({
          id: docSnap.id,
          passengerName: data.passengerName || 'সম্মানিত যাত্রী',
          passengerPhone: data.passengerPhone || '',
          pickupPoint: data.pickupPoint || data.pickupLocation || '',
          pickupLandmark: data.pickupLandmark || '',
          destination: data.destination || data.destinationLocation || '',
          category: data.category || data.vehicleCategory || 'cng',
          requestedAt: 'এইমাত্র',
          distanceKm: Number(data.distanceKm) || 1.2,
          estFare: Number(data.estFare || data.estimatedFare) || 40,
          status: data.status,
          driverId: data.driverId,
          driverName: data.driverName,
          driverPhone: data.driverPhone,
          driverCategory: data.driverCategory,
          driverLat: data.driverLat,
          driverLng: data.driverLng,
          driverVehicleModel: data.driverVehicleModel,
          driverLicensePlate: data.driverLicensePlate,
          driverRating: data.driverRating,
          otp: data.otp,
          pickupCoords: data.pickupCoords || null,
          destCoords: data.destCoords || null,
          createdAtMs: reqTime
        });
      });

      // Sort newest requests first by timestamp
      liveList.sort((a, b) => ((b as any).createdAtMs || 0) - ((a as any).createdAtMs || 0));

      // Update Driver Cockpit list
      setPassengerRequests(liveList);

      // Check if current passenger's specific request was accepted by a driver
      const storedRequestId = localStorage.getItem('safar_my_ride_request_id');
      const myTargetId = passengerPendingRequest?.id || storedRequestId || (activeBooking as any)?.requestId || (activeBooking as any)?.id;
      const dismissed = getDismissedTripIds();

      const myActiveDoc = liveList.find(r => 
        (r.status === 'accepted' || r.status === 'in_transit') &&
        !dismissed.has(r.id) &&
        myTargetId && r.id === myTargetId
      );

      // Clean up ghost passenger pending request if it was deleted or expired from database
      if (passengerPendingRequest && !myActiveDoc) {
        const stillPending = liveList.find(r => r.id === passengerPendingRequest.id && r.status === 'pending');
        if (!stillPending) {
          const reqAge = Date.now() - (Number(passengerPendingRequest.id.replace('req-', '')) || 0);
          if (reqAge > 3 * 60 * 1000) {
            setPassengerPendingRequest(null);
            try {
              localStorage.removeItem('safar_passenger_pending_v2');
              localStorage.removeItem('safar_my_ride_request_id');
            } catch {}
          }
        }
      }

      if (myActiveDoc && myActiveDoc.driverId) {
        if (!activeBooking || (activeBooking as any).requestId !== myActiveDoc.id) {
          const matchedDriver: Driver = drivers.find(d => d.id === myActiveDoc.driverId) || {
            id: myActiveDoc.driverId,
            name: myActiveDoc.driverName || 'ভেরিফাইড চালক',
            phone: myActiveDoc.driverPhone || '০১৭১১-২২৩৩৪৪',
            category: myActiveDoc.category,
            categoryBengali: categories.find(c => c.id === myActiveDoc.category)?.nameBengali || 'যানবাহন',
            lat: myActiveDoc.driverLat || 24.4536,
            lng: myActiveDoc.driverLng || 90.5479,
            rating: myActiveDoc.driverRating || 5.0,
            totalTrips: 25,
            isOnline: true,
            vehicleModel: myActiveDoc.driverVehicleModel || 'যানবাহন',
            licenseNumber: myActiveDoc.driverLicensePlate || 'BRTA-GAF-2026',
            plateNumber: (myActiveDoc as any).driverPlateNumber || (myActiveDoc as any).plateNumber || myActiveDoc.driverLicensePlate || 'নিবন্ধিত নম্বর',
            driverPhoto: (myActiveDoc as any).driverPhoto || '',
            licenseType: 'পেশাদার (Professional)',
            nidNumber: '19886112345678901',
            nidVerified: true,
            licenseVerified: true,
            standName: 'গফরগাঁও',
            avatarBg: 'bg-emerald-600',
            approxSpeedKmh: 25
          };

          const pCoords = myActiveDoc.pickupCoords || pickupCoords || resolveLocationCoordinates(myActiveDoc.pickupPoint, false, stands) || { lat: 24.4536, lng: 90.5479 };
          const dCoords = myActiveDoc.destCoords || destCoords || resolveLocationCoordinates(myActiveDoc.destination, true, stands) || { lat: 24.4515, lng: 90.5535 };
          setPickupCoords(pCoords);
          setDestCoords(dCoords);

          const newBooking = {
            id: myActiveDoc.id,
            requestId: myActiveDoc.id,
            driver: matchedDriver,
            passengerLat: pCoords.lat,
            passengerLng: pCoords.lng,
            destLat: dCoords.lat,
            destLng: dCoords.lng,
            currentDriverLat: myActiveDoc.driverLat || matchedDriver.lat,
            currentDriverLng: myActiveDoc.driverLng || matchedDriver.lng,
            confirmedAt: Date.now(),
            etaMinutes: Math.max(2, Math.round(myActiveDoc.distanceKm * 2.5)),
            distanceKm: myActiveDoc.distanceKm,
            status: (myActiveDoc.status === 'in_transit' ? 'in_transit' : 'en_route') as 'en_route' | 'in_transit',
            otp: myActiveDoc.otp || '5201',
            pickupTitle: myActiveDoc.pickupPoint,
            pickupLandmark: myActiveDoc.pickupLandmark || '',
            destTitle: myActiveDoc.destination,
            fare: myActiveDoc.estFare
          };

          setActiveBooking(newBooking);
          setPassengerPendingRequest(null);
          try {
            localStorage.setItem('safar_active_booking_v2', JSON.stringify(newBooking));
            localStorage.removeItem('safar_passenger_pending_v2');
          } catch {}

          try {
            sounds.playDriverMatchedChime();
          } catch {}
          showAdminToastMessage(`🎉 চালক '${matchedDriver.name}' আপনার ট্রিপ গ্রহণ করেছেন! চালক আপনার লোকেশনে রওনা দিয়েছেন।`);
        }
      } else if (activeBooking && (activeBooking as any).requestId) {
        // Sync real-time driver coordinates and status from Firestore
        const activeDoc = liveList.find(r => r.id === (activeBooking as any).requestId);
        if (activeDoc) {
          const newStatus = (activeDoc.status as any) || activeBooking.status;
          const newLat = activeDoc.driverLat || activeBooking.currentDriverLat;
          const newLng = activeDoc.driverLng || activeBooking.currentDriverLng;
          const effDestLat = activeDoc.destCoords?.lat || activeBooking.destLat || destCoords?.lat;
          const effDestLng = activeDoc.destCoords?.lng || activeBooking.destLng || destCoords?.lng;

          if (newLat !== activeBooking.currentDriverLat || newLng !== activeBooking.currentDriverLng || newStatus !== activeBooking.status) {
            const dist = newStatus === 'in_transit' && effDestLat && effDestLng
              ? Number(calculateDistanceKm(newLat, newLng, effDestLat, effDestLng).toFixed(2))
              : Number(calculateDistanceKm(newLat, newLng, activeBooking.passengerLat, activeBooking.passengerLng).toFixed(2));
            const eta = Math.max(1, calculateEtaMinutes(dist, activeBooking.driver.approxSpeedKmh || 30));
            setActiveBooking(prev => prev ? {
              ...prev,
              currentDriverLat: newLat,
              currentDriverLng: newLng,
              destLat: effDestLat || prev.destLat,
              destLng: effDestLng || prev.destLng,
              distanceKm: dist,
              etaMinutes: eta,
              status: newStatus
            } : null);
          }
        }
      }
    }, (err) => {
      console.warn('Firestore ride_requests snapshot sync error:', err);
    });

    return () => unsubscribe();
  }, [passengerPendingRequest?.id, (activeBooking as any)?.requestId, drivers, pickupCoords]);

  // Real-Time Live Tracking Hook (Cloudflare Worker Edge + Native GPS Sync)
  const {
    gps: liveGps,
    serverState,
    startGpsTracking,
    stopGpsTracking
  } = useLiveTracking({
    role: userRole,
    userId: userRole === 'driver' ? (driverProfile.id || 'driver-me') : (passengerProfile.phone || 'passenger-me'),
    userName: userRole === 'driver' ? driverProfile.name : passengerProfile.name,
    userPhone: userRole === 'driver' ? driverProfile.phone : passengerProfile.phone,
    driverDetails: userRole === 'driver' ? {
      category: driverProfile.category,
      categoryBengali: categories.find(c => c.id === driverProfile.category)?.nameBengali || 'যানবাহন',
      vehicleModel: driverProfile.vehicleModel,
      plateNumber: driverProfile.plateNumber,
      standName: driverProfile.standName,
      rating: driverProfile.rating,
      isOnline: isDriverOnline
    } : undefined,
    passengerDetails: userRole === 'passenger' ? {
      pickupPoint: passengerPickup,
      destination: passengerDestination,
      status: activeBooking ? 'on_trip' : passengerPendingRequest ? 'seeking_ride' : 'idle'
    } : undefined
  });

  // Auto-start device GPS tracking when user switches to driver mode
  useEffect(() => {
    if (userRole === 'driver' && !liveGps.isTracking) {
      startGpsTracking();
    }
  }, [userRole, liveGps.isTracking, startGpsTracking]);

  // Screen WakeLock State & Auto-Management for Driver Mode
  const [isWakeLockActive, setIsWakeLockActive] = useState<boolean>(false);
  const [showScreenOpenPopup, setShowScreenOpenPopup] = useState<boolean>(true);
  const [skipVoiceForCurrentAlert, setSkipVoiceForCurrentAlert] = useState<boolean>(false);

  // Subscribe to ScreenWakeLock status changes
  useEffect(() => {
    const unsub = screenWakeLock.subscribe((active) => {
      setIsWakeLockActive(active);
    });
    return unsub;
  }, []);

  // Request Screen WakeLock & High-Priority Notification Permission when entering driver mode
  useEffect(() => {
    if (userRole === 'driver') {
      screenWakeLock.requestLock().catch(() => {});
      highPriorityNotifications.requestPermission().catch(() => {});
      sounds.unlockAudio();
      sounds.startDriverBackgroundKeepAlive();
    } else {
      screenWakeLock.releaseLock();
      sounds.stopDriverBackgroundKeepAlive();
    }
    return () => {
      sounds.stopDriverBackgroundKeepAlive();
    };
  }, [userRole]);

  // Screen unlock / screen turn-on / visibility change listener (Bulletproof background recovery)
  useEffect(() => {
    const handleScreenTurnOn = () => {
      sounds.unlockAudio();
      if (document.visibilityState === 'visible') {
        setShowScreenOpenPopup(true);
        if (userRole === 'driver') {
          screenWakeLock.requestLock().catch(() => {});
          sounds.startDriverBackgroundKeepAlive();
          // Immediately poll Firestore for newest pending ride requests to eliminate background sleep lag
          getDocs(query(
            collection(db, 'ride_requests'),
            where('status', '==', 'pending'),
            limit(15)
          )).then((snap) => {
            if (!snap.empty) {
              const pendingItems: PassengerRideRequest[] = [];
              snap.forEach((d) => {
                const data = d.data();
                if (data && data.status === 'pending') {
                  pendingItems.push({
                    id: d.id,
                    passengerName: data.passengerName || 'সম্মানিত যাত্রী',
                    passengerPhone: data.passengerPhone || '',
                    pickupPoint: data.pickupPoint || '',
                    pickupLandmark: data.pickupLandmark || '',
                    destination: data.destination || '',
                    category: data.category || 'cng',
                    requestedAt: 'এইমাত্র',
                    distanceKm: Number(data.distanceKm) || 1.2,
                    estFare: Number(data.estFare) || 40,
                    status: 'pending',
                    pickupCoords: data.pickupCoords || null,
                    destCoords: data.destCoords || null,
                    createdAtMs: data.createdAtMs || Date.now()
                  });
                }
              });
              if (pendingItems.length > 0) {
                setPassengerRequests(prev => {
                  const map = new Map(prev.map(r => [r.id, r]));
                  pendingItems.forEach(p => map.set(p.id, p));
                  return Array.from(map.values()).sort((a, b) => ((b as any).createdAtMs || 0) - ((a as any).createdAtMs || 0));
                });
              }
            }
          }).catch(() => {});
        }
      }
    };
    document.addEventListener('visibilitychange', handleScreenTurnOn);
    window.addEventListener('focus', handleScreenTurnOn);
    return () => {
      document.removeEventListener('visibilitychange', handleScreenTurnOn);
      window.removeEventListener('focus', handleScreenTurnOn);
    };
  }, [userRole]);

  // Compute Active Incoming Ride Request Matching Current Driver (Works across all devices and roles)
  const activeIncomingRideForDriver = useMemo(() => {
    const isDriver = userRole === 'driver';
    const cleanDriverPhone = (driverProfile.phone || '').replace(/[^0-9]/g, '');
    const dismissed = getDismissedTripIds();

    // Check if current driver is already on an active trip (accepted or in_transit)
    const hasActiveTrip = passengerRequests.some(r => 
      (r.status === 'accepted' || r.status === 'in_transit') && 
      !dismissed.has(r.id) &&
      (
        (driverProfile.id && r.driverId === driverProfile.id) ||
        (cleanDriverPhone && r.driverPhone && r.driverPhone.replace(/[^0-9]/g, '') === cleanDriverPhone)
      )
    );
    if (hasActiveTrip) return null;

    // Detect pending ride requests:
    // If in driver mode, ALWAYS alert the driver for any pending ride matching category or for all drivers!
    return passengerRequests.find(r => 
      r.status === 'pending' && 
      !dismissedAlertIds[r.id] &&
      (
        // 1. Direct assignment to this driver ID or phone
        (r.driverId && (
          r.driverId === driverProfile.id || 
          (cleanDriverPhone && r.driverPhone && r.driverPhone.replace(/[^0-9]/g, '') === cleanDriverPhone)
        )) ||
        // 2. Open broadcast: category matches, or driver has no specific category, or in driver mode
        (!r.driverId && (
          !driverProfile.category || 
          driverProfile.category === 'all' || 
          r.category === driverProfile.category ||
          isDriver
        ))
      )
    ) || (passengerPendingRequest?.status === 'pending' && !dismissedAlertIds[passengerPendingRequest.id] && isDriver ? passengerPendingRequest : null);
  }, [passengerRequests, dismissedAlertIds, driverProfile, passengerPendingRequest, userRole]);

  // High-Priority push/vibration alert whenever an incoming ride is detected in background / screen off
  useEffect(() => {
    if (activeIncomingRideForDriver) {
      // Only show system status bar notification if app is in background or screen is off
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') {
        highPriorityNotifications.showIncomingRideAlert(activeIncomingRideForDriver).catch(() => {});
      }
    } else {
      highPriorityNotifications.clearIncomingRideAlert().catch(() => {});
    }
  }, [activeIncomingRideForDriver?.id]);

  // Throttled Real-time Driver GPS Broadcast to active accepted/in_transit trip in Firestore
  const lastGpsBroadcastRef = useRef<{ lat: number; lng: number; time: number }>({ lat: 0, lng: 0, time: 0 });

  useEffect(() => {
    if (userRole === 'driver' && liveGps.lat && liveGps.lng) {
      const activeTrip = passengerRequests.find(r => 
        (r.status === 'accepted' || r.status === 'in_transit') &&
        (r.driverId === driverProfile.id || r.driverPhone === driverProfile.phone || !r.driverId)
      );
      if (activeTrip && activeTrip.id) {
        const now = Date.now();
        const prev = lastGpsBroadcastRef.current;
        const timeDiff = now - prev.time;
        const distDiff = Math.hypot(liveGps.lat - prev.lat, liveGps.lng - prev.lng);

        // Throttle to at most once every 12s and only if moved > 15m to avoid quota exhaustion
        if (timeDiff >= 12000 && distDiff > 0.00012) {
          lastGpsBroadcastRef.current = { lat: liveGps.lat, lng: liveGps.lng, time: now };
          updateDoc(doc(db, 'ride_requests', activeTrip.id), {
            driverLat: liveGps.lat,
            driverLng: liveGps.lng,
            lastGpsUpdate: new Date().toISOString()
          }).catch(() => {});
        }
      }
    }
  }, [userRole, liveGps.lat, liveGps.lng, passengerRequests, driverProfile.id, driverProfile.phone]);

  // Helper: check if a location title implies real device live GPS
  const isLiveLocationQuery = (text: string): boolean => {
    if (!text) return false;
    const lower = text.toLowerCase().trim();
    return (
      lower.includes('gps') ||
      lower.includes('লাইভ') ||
      lower.includes('বর্তমান') ||
      lower.includes('আমার অবস্থান') ||
      lower.includes('আমার লোকেশন') ||
      lower.includes('live') ||
      lower === 'আমার অবস্থান' ||
      lower === 'বর্তমান অবস্থান'
    );
  };

  // Helper: Find nearest union stand or popular landmark to give a human-readable 2nd option for Live GPS
  const findNearestLandmark = useCallback((lat: number, lng: number): { name: string; distanceMeters: number } => {
    let nearestName = 'গফরগাঁও পৌরসভা চত্বর';
    let minDistanceKm = 9999;
    
    // Check all autocomplete union places
    for (const place of allAutocompletePlaces) {
      if (typeof place.lat === 'number' && typeof place.lng === 'number') {
        const dist = calculateDistanceKm(lat, lng, place.lat, place.lng);
        if (dist < minDistanceKm) {
          minDistanceKm = dist;
          nearestName = place.bengaliName || place.name || 'গফরগাঁও';
        }
      }
    }
    // Also check dynamic stands
    for (const stand of stands) {
      if (typeof stand.lat === 'number' && typeof stand.lng === 'number') {
        const dist = calculateDistanceKm(lat, lng, stand.lat, stand.lng);
        if (dist < minDistanceKm) {
          minDistanceKm = dist;
          nearestName = stand.bengaliName || stand.name || 'গফরগাঁও';
        }
      }
    }

    return {
      name: nearestName,
      distanceMeters: Math.round(minDistanceKm * 1000)
    };
  }, [allAutocompletePlaces, stands]);

  // Helper to extract or resolve coordinates for any stand or custom name in Gafargaon
  const getCoordinatesForLocation = (locName: string, isDest = false): { lat: number; lng: number } | null => {
    if (!locName || !locName.trim()) return null;
    if (!isDest && isLiveLocationQuery(locName)) {
      if (liveGps.lat && liveGps.lng) {
        return { lat: liveGps.lat, lng: liveGps.lng };
      }
      if (passengerLocation.lat && passengerLocation.lng && passengerLocation.isLiveGps) {
        return { lat: passengerLocation.lat, lng: passengerLocation.lng };
      }
    }
    return resolveLocationCoordinates(locName, isDest);
  };

  // Sync coordinates when locations or GPS change
  useEffect(() => {
    if (!passengerPickup || !passengerPickup.trim()) {
      setPickupCoords(null);
      return;
    }
    if (isLiveLocationQuery(passengerPickup)) {
      if (liveGps.lat && liveGps.lng) {
        setPickupCoords({ lat: liveGps.lat, lng: liveGps.lng });
      } else if (passengerLocation.lat && passengerLocation.lng && passengerLocation.isLiveGps) {
        setPickupCoords({ lat: passengerLocation.lat, lng: passengerLocation.lng });
      } else {
        startGpsTracking();
      }
    } else {
      setPickupCoords(getCoordinatesForLocation(passengerPickup, false));
    }
  }, [passengerPickup, passengerLocation, liveGps.lat, liveGps.lng]);

  useEffect(() => {
    if (!passengerDestination || !passengerDestination.trim()) {
      setDestCoords(null);
      return;
    }
    setDestCoords(getCoordinatesForLocation(passengerDestination, true));
  }, [passengerDestination]);

  // When live GPS coordinates stream in, if pickup is live location, keep it locked to live position
  useEffect(() => {
    if (liveGps.lat && liveGps.lng && liveGps.isTracking) {
      setPassengerLocation({
        lat: liveGps.lat,
        lng: liveGps.lng,
        isLiveGps: true
      });
      if (isLiveLocationQuery(passengerPickup)) {
        setPickupCoords({ lat: liveGps.lat, lng: liveGps.lng });
      }
    }
  }, [liveGps.lat, liveGps.lng, liveGps.isTracking, passengerPickup]);

  // Vehicle-specific realistic speed in km/h
  const getVehicleSpeedKmh = (catId: string): number => {
    switch (catId) {
      case 'ambulance': return 35;
      case 'fire': return 35;
      case 'bike': return 32;
      case 'car': return 28;
      case 'cng': return 24;
      case 'microbus': return 22;
      case 'auto': return 18;
      default: return 20;
    }
  };

  // Dynamic Distance & Duration calculation with realistic road curvature factor (1.25x)
  const hasRouteCoordinates = Boolean(pickupCoords && destCoords && (pickupCoords.lat !== destCoords.lat || pickupCoords.lng !== destCoords.lng));
  const isSamePoint = (pickupCoords && destCoords) ? (Math.abs(pickupCoords.lat - destCoords.lat) < 0.0001 && Math.abs(pickupCoords.lng - destCoords.lng) < 0.0001) : false;
  const directDistance = (pickupCoords && destCoords && !isSamePoint) ? calculateDistanceKm(pickupCoords.lat, pickupCoords.lng, destCoords.lat, destCoords.lng) : 0;
  const roadCurvatureFactor = 1.25;
  const calculatedDistance = hasRouteCoordinates ? Number(Math.max(0.3, directDistance * roadCurvatureFactor).toFixed(1)) : 0;

  const currentVehicleSpeed = getVehicleSpeedKmh(passengerSelectedVehicle);
  const calculatedDurationMinutes = hasRouteCoordinates ? Math.max(
    2,
    Math.round((calculatedDistance / currentVehicleSpeed) * 60 + 1)
  ) : 0;

  // Dynamic Fair Fare Calculator: Base fare covers first 1.5 km!
  const calculateFareForCategory = (catId: string, distKm: number): number => {
    const cat = categories.find(c => c.id === catId);
    if (cat?.isFree) return 0;
    const base = cat?.baseFare ?? 20;
    const perKm = cat?.perKmFare ?? 12;
    const min = cat?.minFare ?? (appCustomSettings.baseFareMinimum || 20);
    const multiplier = appCustomSettings.perKmMultiplier || 1.0;

    let fare = base;
    if (distKm > 1.5) {
      const extraKm = distKm - 1.5;
      fare = base + Math.round(extraKm * perKm);
    }
    fare = Math.round(fare * multiplier);
    if (fare < min) fare = min;
    if (appCustomSettings.roundFareToNearest5 && fare > 0) {
      fare = Math.ceil(fare / 5) * 5;
    }
    return fare;
  };

  const calculatedFare = calculateFareForCategory(passengerSelectedVehicle, calculatedDistance);

  // Swap pickup & destination
  const handleSwapLocations = () => {
    const prevPickup = passengerPickup;
    const prevPickupCoords = pickupCoords;
    const prevDest = passengerDestination;
    const prevDestCoords = destCoords;

    setPassengerPickup(prevDest);
    setPickupCoords(prevDestCoords);
    setPassengerDestination(prevPickup);
    setDestCoords(prevPickupCoords);

    showAdminToastMessage('পিকআপ ও গন্তব্য অদল-বদল করা হয়েছে');
  };

  // Submit Passenger Ride Request (Real-Time Live Driver Matching via Firestore)
  const handlePassengerCreateRideRequest = () => {
    // Enforce Passenger Sign Up / Login before sending requests
    if (!passengerProfile.isLoggedIn || !passengerProfile.phone) {
      showAdminToastMessage('যাত্রার অনুরোধ পাঠানোর পূর্বে অনুগ্রহ করে সাইন আপ বা লগইন করুন');
      setShowPassengerModal(true);
      setPassengerTab('profile');
      setPassengerAuthMode('signup');
      return;
    }

    // Prevent duplicate spam requests if user already has a pending request
    if (passengerPendingRequest) {
      showAdminToastMessage('আপনার একটি অনুরোধ ইতোমধ্যে অপেক্ষমাণ রয়েছে। চালকের কনফার্মেশনের জন্য অপেক্ষা করুন।');
      const cockpitEl = document.getElementById('passenger-ride-cockpit-section');
      if (cockpitEl) {
        cockpitEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      return;
    }

    if (activeBooking) {
      showAdminToastMessage('আপনার একটি ট্রিপ বর্তমানে চলমান রয়েছে!');
      return;
    }

    let pickupTitle = passengerPickup.trim() || 'আমার লাইভ অবস্থান (GPS)';
    let landmarkRef = passengerPickupLandmark;
    if (pickupCoords) {
      const nearest = findNearestLandmark(pickupCoords.lat, pickupCoords.lng);
      if (!landmarkRef && nearest.distanceMeters > 40) {
        landmarkRef = `${nearest.name} (থেকে ~${toBengaliNumber(nearest.distanceMeters)} মিটার দূরে)`;
      }
    }
    const destTitle = passengerDestination.trim() || 'উপজেলা স্বাস্থ্য কমপ্লেক্স';

    if (pickupTitle.trim() === destTitle.trim()) {
      showAdminToastMessage('শুরুর স্থান ও গন্তব্য একই হতে পারে না!');
      return;
    }

    const validFare = (calculatedFare && calculatedFare > 0) ? calculatedFare : (categories.find(c => c.id === passengerSelectedVehicle)?.baseFare || 40);
    const validDistance = calculatedDistance > 0 ? calculatedDistance : 1.2;

    const newRequest: PassengerRideRequest = {
      id: `req-${Date.now()}`,
      passengerName: passengerProfile.name,
      passengerPhone: passengerProfile.phone,
      pickupPoint: pickupTitle,
      pickupLandmark: landmarkRef || undefined,
      destination: destTitle,
      category: passengerSelectedVehicle,
      requestedAt: 'এইমাত্র',
      distanceKm: validDistance,
      estFare: validFare,
      pickupCoords: pickupCoords || { lat: 24.4536, lng: 90.5479 },
      destCoords: destCoords || { lat: 24.4515, lng: 90.5535 },
      status: 'pending'
    };

    setPassengerPendingRequest(newRequest);
    try {
      localStorage.setItem('safar_my_ride_request_id', newRequest.id);
      localStorage.setItem('safar_my_ride_request_phone', newRequest.passengerPhone);
      localStorage.setItem('safar_passenger_pending_v2', JSON.stringify(newRequest));
    } catch {}

    // First purge any older pending requests from this same passenger in Firestore to avoid duplicate clutter
    getDocs(query(
      collection(db, 'ride_requests'),
      where('passengerPhone', '==', newRequest.passengerPhone),
      where('status', '==', 'pending')
    )).then((oldSnaps) => {
      oldSnaps.forEach((d) => {
        if (d.id !== newRequest.id) {
          deleteDoc(doc(db, 'ride_requests', d.id)).catch(() => {});
        }
      });
    }).catch(() => {});

    // Sync to Firestore for real-time broadcast to all drivers
    setDoc(doc(db, 'ride_requests', newRequest.id), {
      id: newRequest.id,
      passengerName: newRequest.passengerName,
      passengerPhone: newRequest.passengerPhone,
      pickupPoint: newRequest.pickupPoint,
      pickupLandmark: newRequest.pickupLandmark || '',
      destination: newRequest.destination,
      category: newRequest.category,
      distanceKm: newRequest.distanceKm,
      estFare: newRequest.estFare,
      pickupCoords: pickupCoords || { lat: 24.4536, lng: 90.5479 },
      destCoords: destCoords || { lat: 24.4515, lng: 90.5535 },
      status: 'pending',
      createdAtMs: Date.now(),
      requestedAt: new Date().toISOString()
    }).catch(err => {
      console.warn('Firestore offline fallback for ride request:', err);
    });

    showAdminToastMessage(`নিকটস্থ চালকদের কাছে আপনার অনুরোধ পাঠানো হয়েছে... চালক গ্রহণের অপেক্ষায়`);

    // Auto-scroll to active request cockpit box
    setTimeout(() => {
      const cockpitEl = document.getElementById('passenger-ride-cockpit-section');
      if (cockpitEl) {
        cockpitEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  };

  // Cancel Pending Request & Clear Map
  const handleCancelPassengerPendingRequest = async () => {
    const reqId = passengerPendingRequest?.id || localStorage.getItem('safar_my_ride_request_id');
    setPassengerPendingRequest(null);
    setActiveBooking(null);
    setPickupCoords(null);
    setDestCoords(null);
    setPassengerPickup('');
    setPassengerDestination('');

    try {
      localStorage.removeItem('safar_passenger_pending_v2');
      localStorage.removeItem('safar_my_ride_request_id');
      localStorage.removeItem('safar_my_ride_request_phone');
      localStorage.removeItem('safar_active_booking_v2');
    } catch {}

    if (reqId) {
      try {
        await updateDoc(doc(db, 'ride_requests', reqId), {
          status: 'cancelled',
          cancelledAt: new Date().toISOString()
        });
      } catch (err) {
        console.warn('Failed to cancel pending ride_request in Firestore:', err);
      }
    }
    showAdminToastMessage('যাত্রার অনুরোধ সফলভাবে বাতিল করা হয়েছে এবং ম্যাপ ক্লিয়ার হয়েছে');
  };

  // Explicitly Clear Route and Location Pins from Map
  const handleClearRoute = () => {
    setPickupCoords(null);
    setDestCoords(null);
    setPassengerPickup('');
    setPassengerDestination('');
    showAdminToastMessage('ম্যাপের রুট এবং পিন ক্লিয়ার করা হয়েছে');
  };

  // Reset to HomePage / Default Mode
  const handleResetToHomePage = () => {
    setUserRole('passenger');
    setSelectedCategory('ambulance');
    setSelectedStand('all');
    setSearchQuery('');
    setSelectedDriver(null);
    setShowPassengerModal(false);
    setShowRoleGuideModal(false);
    setIsRegisterModalOpen(false);
    setShowAdminDashboard(false);
    setShowAdminAuthModal(false);
    setIsStandModalOpen(false);
    setIsCategoryModalOpen(false);
    setIsDirectDriverModalOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    showAdminToastMessage('সফর হোমপেজে ফিরে এসেছেন');
  };

  // Driver accepts request (Real-Time Firestore Update)
  const isAcceptingRef = useRef<{ [id: string]: boolean }>({});

  const handleDriverAcceptRequest = async (requestId: string) => {
    if (isAcceptingRef.current[requestId]) return;
    isAcceptingRef.current[requestId] = true;

    // 1. Immediately switch to driver role and stop all alarms/vibrations
    setUserRole('driver');
    setShowScreenOpenPopup(false);
    sounds.stopAllAlarms();
    highPriorityNotifications.clearIncomingRideAlert();

    const targetReq = passengerRequests.find(r => r.id === requestId)
      || (passengerPendingRequest?.id === requestId ? passengerPendingRequest : null);
    const targetPassengerPhone = targetReq?.passengerPhone || '';

    // Immediately dismiss alert modal for this request and passenger
    setDismissedAlertIds(prev => ({
      ...prev,
      [requestId]: true,
      ...(targetPassengerPhone ? { [targetPassengerPhone]: true } : {})
    }));

    if (!liveGps.isTracking) {
      startGpsTracking();
    }
    const driverStand = stands.find(s => s.name === driverProfile.standName || s.bengaliName === driverProfile.standName);
    // Prioritize real device GPS location over registered stand!
    const driverLat = (liveGps.lat && liveGps.lng)
      ? liveGps.lat
      : (driverProfile.lat || (driverStand ? driverStand.lat : 24.4536));
    const driverLng = (liveGps.lat && liveGps.lng)
      ? liveGps.lng
      : (driverProfile.lng || (driverStand ? driverStand.lng : 90.5479));

    // Synchronize driver identity: Ensure driverProfile and activeDriver are 100% identical!
    let driverId = driverProfile.id;
    let driverName = driverProfile.name;
    let driverPhone = driverProfile.phone;
    let driverCategory = driverProfile.category || targetReq?.category || 'cng';
    let driverVehicle = driverProfile.vehicleModel || 'যানবাহন';
    let driverPlate = driverProfile.plateNumber || 'নিবন্ধিত নম্বর';
    let driverPhoto = driverProfile.driverPhoto || '';

    if (!driverName || !driverPhone) {
      const categoryDriver = drivers.find(d => d.category === targetReq?.category) || drivers[0];
      if (categoryDriver) {
        driverId = categoryDriver.id;
        driverName = categoryDriver.name || (categoryDriver as any).nameBn || 'ভেরিফাইড চালক';
        driverPhone = categoryDriver.phone || '০১৭১১-২২৩৩৪৪';
        driverCategory = categoryDriver.category as any;
        driverVehicle = categoryDriver.vehicleModel || (categoryDriver as any).vehicleName || 'যানবাহন';
        driverPlate = categoryDriver.plateNumber || (categoryDriver as any).licensePlate || 'নিবন্ধিত নম্বর';
        driverPhoto = categoryDriver.driverPhoto || (categoryDriver as any).photoUrl || '';

        setDriverProfile(prev => ({
          ...prev,
          id: driverId,
          name: driverName,
          phone: driverPhone,
          category: driverCategory as any,
          vehicleModel: driverVehicle,
          plateNumber: driverPlate,
          driverPhoto: driverPhoto,
          isRegistered: true
        }));
      }
    } else if (!driverId) {
      driverId = 'drv-' + driverPhone.replace(/[^0-9]/g, '');
      setDriverProfile(prev => ({ ...prev, id: driverId }));
    }

    const activeDriver: Driver = {
      id: driverId || 'driver-verified',
      name: driverName || 'ভেরিফাইড চালক',
      phone: driverPhone || '০১৭১১-২২৩৩৪৪',
      category: driverCategory as any,
      categoryBengali: categories.find(c => c.id === driverCategory)?.nameBengali || 'যানবাহন',
      lat: driverLat,
      lng: driverLng,
      rating: driverProfile.rating || 5.0,
      totalTrips: (driverProfile.todayTrips || 25),
      isOnline: true,
      vehicleModel: driverVehicle,
      licenseNumber: driverProfile.licenseNumber || driverPlate,
      plateNumber: driverPlate,
      driverPhoto: driverPhoto,
      licenseType: 'পেশাদার (Professional)',
      nidNumber: '19886112345678901',
      nidVerified: true,
      licenseVerified: true,
      standName: driverProfile.standName || 'গফরগাঁও',
      avatarBg: 'bg-emerald-600',
      approxSpeedKmh: 25
    };

    const otpCode = String(Math.floor(1000 + Math.random() * 9000));
    const reqRef = doc(db, 'ride_requests', requestId);

    // 2. Optimistically update local passengerRequests immediately on 1st click
    // so the driver active trip cockpit opens instantly without lag!
    // And eliminate any duplicate pending requests for this passenger from the waiting list!
    setPassengerRequests(prev => prev.map(r => {
      if (r.id === requestId) {
        return {
          ...r,
          status: 'accepted',
          driverId: activeDriver.id,
          driverName: activeDriver.name,
          driverPhone: activeDriver.phone,
          driverCategory: activeDriver.category,
          driverLat: activeDriver.lat,
          driverLng: activeDriver.lng,
          driverVehicleModel: activeDriver.vehicleModel,
          driverLicensePlate: activeDriver.plateNumber || activeDriver.licenseNumber,
          driverPlateNumber: activeDriver.plateNumber,
          driverPhoto: activeDriver.driverPhoto,
          driverRating: activeDriver.rating,
          otp: otpCode,
          acceptedAt: new Date().toISOString()
        };
      }
      if (targetPassengerPhone && r.passengerPhone === targetPassengerPhone && r.status === 'pending') {
        return { ...r, status: 'cancelled' };
      }
      return r;
    }));

    // 3. Passenger Side Confirmation: If this device is also the passenger, set activeBooking immediately
    // so switching back to Passenger Mode NEVER loses the driver confirmation!
    const cleanTargetPhone = targetPassengerPhone.replace(/[^0-9]/g, '');
    const cleanPassengerProfilePhone = (passengerProfile?.phone || '').replace(/[^0-9]/g, '');
    const isThisPassenger = (passengerPendingRequest?.id === requestId) ||
      (cleanTargetPhone && cleanPassengerProfilePhone && cleanTargetPhone === cleanPassengerProfilePhone);

    if (isThisPassenger) {
      const pCoords = targetReq?.pickupCoords || resolveLocationCoordinates(targetReq?.pickupPoint || '', false, stands) || { lat: 24.4536, lng: 90.5479 };
      const dCoords = targetReq?.destCoords || resolveLocationCoordinates(targetReq?.destination || '', true, stands) || { lat: 24.4515, lng: 90.5535 };
      const newBooking = {
        id: requestId,
        requestId: requestId,
        driver: activeDriver,
        passengerLat: pCoords.lat,
        passengerLng: pCoords.lng,
        destLat: dCoords.lat,
        destLng: dCoords.lng,
        currentDriverLat: activeDriver.lat,
        currentDriverLng: activeDriver.lng,
        confirmedAt: Date.now(),
        etaMinutes: Math.max(2, Math.round((targetReq?.distanceKm || 1.2) * 2.5)),
        distanceKm: targetReq?.distanceKm || 1.2,
        status: 'en_route' as const,
        otp: otpCode,
        pickupTitle: targetReq?.pickupPoint || 'পিকআপ স্থান',
        pickupLandmark: targetReq?.pickupLandmark || '',
        destTitle: targetReq?.destination || 'গন্তব্য স্থান',
        fare: targetReq?.estFare || 40
      };
      setActiveBooking(newBooking);
      setPickupCoords(pCoords);
      setDestCoords(dCoords);
      setPassengerPendingRequest(null);
      try {
        localStorage.setItem('safar_active_booking_v2', JSON.stringify(newBooking));
        localStorage.removeItem('safar_passenger_pending_v2');
      } catch {}
    }

    // 4. Open map & smooth-scroll to Driver Active Trip Cockpit
    setShowDriverInlineMap(true);
    setTimeout(() => {
      const cockpitEl = document.getElementById('safar-driver-active-trip-cockpit');
      if (cockpitEl) {
        cockpitEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 120);

    try {
      await updateDoc(reqRef, {
        status: 'accepted',
        driverId: activeDriver.id,
        driverName: activeDriver.name,
        driverPhone: activeDriver.phone,
        driverCategory: activeDriver.category,
        driverLat: activeDriver.lat,
        driverLng: activeDriver.lng,
        driverVehicleModel: activeDriver.vehicleModel,
        driverLicensePlate: activeDriver.plateNumber || activeDriver.licenseNumber,
        driverPlateNumber: activeDriver.plateNumber,
        driverPhoto: activeDriver.driverPhoto || activeDriver.photoUrl || (activeDriver.name?.toUpperCase().includes('TASNIMUL') ? '/assets/drivers/tasnimul_kabeer.png' : ''),
        driverRating: activeDriver.rating,
        otp: otpCode,
        acceptedAt: new Date().toISOString()
      });

      // Also clean up any other pending requests from this passenger in Firestore
      if (targetPassengerPhone) {
        getDocs(query(
          collection(db, 'ride_requests'),
          where('passengerPhone', '==', targetPassengerPhone),
          where('status', '==', 'pending')
        )).then((snaps) => {
          snaps.forEach((d) => {
            if (d.id !== requestId) {
              updateDoc(doc(db, 'ride_requests', d.id), { status: 'cancelled', cancelledAt: new Date().toISOString() }).catch(() => {});
            }
          });
        }).catch(() => {});
      }

      showAdminToastMessage(`🎉 ট্রিপ সফলভাবে গ্রহণ করা হয়েছে! যাত্রীর কাছে রওনা দিন।`);
    } catch (err: any) {
      console.warn('Firestore updateDoc failed, attempting setDoc merge fallback:', err);
      try {
        await setDoc(reqRef, {
          status: 'accepted',
          driverId: activeDriver.id,
          driverName: activeDriver.name,
          driverPhone: activeDriver.phone,
          driverCategory: activeDriver.category,
          driverLat: activeDriver.lat,
          driverLng: activeDriver.lng,
          driverVehicleModel: activeDriver.vehicleModel,
          driverLicensePlate: activeDriver.plateNumber || activeDriver.licenseNumber,
          driverPlateNumber: activeDriver.plateNumber,
          driverPhoto: activeDriver.driverPhoto || activeDriver.photoUrl || (activeDriver.name?.toUpperCase().includes('TASNIMUL') ? '/assets/drivers/tasnimul_kabeer.png' : ''),
          driverRating: activeDriver.rating,
          otp: otpCode,
          acceptedAt: new Date().toISOString()
        }, { merge: true });
        showAdminToastMessage(`🎉 ট্রিপ সফলভাবে গ্রহণ করা হয়েছে! যাত্রীর কাছে রওনা দিন।`);
      } catch (e) {
        // Even if network is offline or quota reached, local state was optimistically set
        showAdminToastMessage(`🎉 ট্রিপ সফলভাবে গ্রহণ করা হয়েছে! যাত্রীর কাছে রওনা দিন।`);
      }
    } finally {
      setTimeout(() => {
        delete isAcceptingRef.current[requestId];
      }, 2000);
    }
  };

  // Driver declines request
  const handleDriverDeclineRequest = async (requestId: string) => {
    try {
      await updateDoc(doc(db, 'ride_requests', requestId), {
        status: 'declined',
        declinedAt: new Date().toISOString()
      });
      showAdminToastMessage('অনুরোধটি বাতিল করা হয়েছে');
    } catch (err) {
      setPassengerRequests(prev => prev.map(req => 
        req.id === requestId ? { ...req, status: 'declined' } : req
      ));
    }
  };

  // Handle Android Notification Action Buttons [✅ গ্রহণ করুন (ACCEPT)] & [📲 অ্যাপ খুলুন]
  useEffect(() => {
    // 0. Preload male voice alert buffer on app load
    sounds.preloadVoiceAlert();
    const handleUnlockAudio = () => {
      sounds.preloadVoiceAlert();
    };
    window.addEventListener('click', handleUnlockAudio, { once: true, passive: true });
    window.addEventListener('touchstart', handleUnlockAudio, { once: true, passive: true });

    // 1. Check URL parameters on mount / app open
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const reqId = params.get('openDriverTrip');
      const roleParam = params.get('role');
      const actionParam = params.get('action');

      if (roleParam === 'driver' || reqId) {
        setUserRole('driver');
        setShowScreenOpenPopup(false);
      }

      if (reqId) {
        if (actionParam === 'accept') {
          setUserRole('driver');
          setShowScreenOpenPopup(false);
          setSkipVoiceForCurrentAlert(false);
          handleDriverAcceptRequest(reqId);
          showAdminToastMessage('নোটিফিকেশন থেকে ট্রিপ গ্রহণ করা হয়েছে!');
        } else {
          // Open app pressed: switch directly to driver mode, suppress duplicate popup, skip voice
          setUserRole('driver');
          setShowScreenOpenPopup(false);
          setSkipVoiceForCurrentAlert(true);
          window.scrollTo({ top: 120, behavior: 'smooth' });
        }
        // Clean URL parameters from address bar to prevent replay on reload
        try {
          window.history.replaceState({}, document.title, window.location.pathname);
        } catch {}
      }
    }

    // 2. Listen to postMessage from Service Worker when action button is tapped in notification shade
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      const handleSwMessage = (event: MessageEvent) => {
        if (event.data?.type === 'SAFAR_NOTIFICATION_ACTION') {
          const { action, requestId } = event.data;
          setUserRole('driver');
          setShowScreenOpenPopup(false);
          if (action === 'accept' && requestId) {
            setSkipVoiceForCurrentAlert(false);
            handleDriverAcceptRequest(requestId);
            showAdminToastMessage('নোটিফিকেশন থেকে ট্রিপ গ্রহণ করা হয়েছে!');
          } else {
            // Open app pressed: driver mode opened, single popup, voice skipped, Duff & vibration continues
            setSkipVoiceForCurrentAlert(true);
            window.scrollTo({ top: 120, behavior: 'smooth' });
          }
        }
      };
      navigator.serviceWorker.addEventListener('message', handleSwMessage);
      return () => {
        navigator.serviceWorker.removeEventListener('message', handleSwMessage);
        window.removeEventListener('click', handleUnlockAudio);
        window.removeEventListener('touchstart', handleUnlockAudio);
      };
    }
  }, []);

  // Refs & Synchronized Height State for Category and Active Drivers
  const categorySectionRef = useRef<HTMLDivElement>(null);
  const driverListRef = useRef<HTMLDivElement>(null);
  const driverScrollContainerRef = useRef<HTMLDivElement>(null);
  const [categoryBoxHeight, setCategoryBoxHeight] = useState<number>(0);

  // Dynamic Height Sync: Active Drivers Section ALWAYS depends on & equals Category Section height pixel-perfect
  useLayoutEffect(() => {
    const el = categorySectionRef.current;
    if (!el) return;

    const measureCategoryHeight = () => {
      if (el) {
        const height = el.getBoundingClientRect().height || el.offsetHeight;
        if (height > 50) {
          setCategoryBoxHeight(Math.round(height));
        }
      }
    };

    // Immediate initial calculation
    measureCategoryHeight();

    // Auto-update on font scaling, window resize or category DOM changes
    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(() => {
        measureCategoryHeight();
      });
      ro.observe(el);
    }

    window.addEventListener('resize', measureCategoryHeight);
    return () => {
      if (ro) ro.disconnect();
      window.removeEventListener('resize', measureCategoryHeight);
    };
  }, [categories, appCustomSettings.fontSizeMode]);

  // Seamless, Frictionless Mouse Wheel Handler:
  // Completely eliminates screen freezing by immediately delegating scroll delta to parent window
  // when list has no vertical overflow (e.g. 2 microbus drivers) or is at scroll boundary (top/bottom)
  const handleDriverListWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const { scrollTop, scrollHeight, clientHeight } = target;
    const deltaY = e.deltaY;

    // Check if target has scrollable vertical overflow
    const isScrollable = scrollHeight > clientHeight + 2;

    if (!isScrollable) {
      // Content completely fits inside: immediately delegate scroll to parent window
      window.scrollBy({ top: deltaY, left: 0, behavior: 'auto' });
      return;
    }

    const atTop = scrollTop <= 0;
    const atBottom = Math.ceil(scrollTop + clientHeight) >= scrollHeight - 2;

    // If at boundary: pass delta to window immediately with zero delay
    if ((deltaY < 0 && atTop) || (deltaY > 0 && atBottom)) {
      window.scrollBy({ top: deltaY, left: 0, behavior: 'auto' });
    }
  };

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);
  const routeLayerRef = useRef<L.Polyline | null>(null);
  const passengerMarkerRef = useRef<L.Marker | null>(null);
  const driverLiveMarkerRef = useRef<L.Marker | null>(null);

  // Cloudflare Live Server Settings Modal
  const [showCloudflareModal, setShowCloudflareModal] = useState(false);

  // Secret Admin Access via URL hash (#admin or ?admin=1), Keyboard (Ctrl+Shift+A)
  useEffect(() => {
    const checkAdminTrigger = () => {
      if (typeof window === 'undefined') return;
      const hash = window.location.hash;
      const search = window.location.search;
      if (hash === '#admin' || search.includes('admin=1') || search.includes('admin=true')) {
        setAdminAuthError(null);
        setAdminPinInput('');
        setShowAdminAuthModal(true);
      }
    };
    checkAdminTrigger();
    window.addEventListener('hashchange', checkAdminTrigger);

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'A' || e.key === 'a')) {
        e.preventDefault();
        setAdminAuthError(null);
        setAdminPinInput('');
        setShowAdminAuthModal(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('hashchange', checkAdminTrigger);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const secretClickCountRef = useRef(0);
  const secretClickTimerRef = useRef<any>(null);

  const handleSecretAdminTrigger = () => {
    secretClickCountRef.current += 1;
    if (secretClickTimerRef.current) clearTimeout(secretClickTimerRef.current);

    if (secretClickCountRef.current >= 3) {
      secretClickCountRef.current = 0;
      setAdminAuthError(null);
      setAdminPinInput('');
      setShowAdminAuthModal(true);
      return;
    }

    secretClickTimerRef.current = setTimeout(() => {
      secretClickCountRef.current = 0;
    }, 1200);
  };

  // CATEGORY SELECTION: Filters drivers & seamlessly resets internal list scroll to top
  const handleSelectCategory = (catId: VehicleCategory) => {
    setSelectedCategory(catId);
    if (driverScrollContainerRef.current) {
      driverScrollContainerRef.current.scrollTop = 0;
    }
  };

  // Leaflet Map Initialization with Safeguard against container re-init
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      if ((mapContainerRef.current as any)._leaflet_id != null) {
        (mapContainerRef.current as any)._leaflet_id = null;
      }

      const map = L.map(mapContainerRef.current, {
        center: [24.4536, 90.5479],
        zoom: 14,
        zoomControl: true,
        dragging: !L.Browser.mobile || isMapTouchUnlocked,
        touchZoom: true,
        scrollWheelZoom: false,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors | সফর গফরগাঁও',
        maxZoom: 19,
      }).addTo(map);

      const markersGroup = L.layerGroup().addTo(map);
      markersRef.current = markersGroup;
      mapInstanceRef.current = map;
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update Map Touch Dragging Behavior
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    if (isMapTouchUnlocked) {
      mapInstanceRef.current.dragging.enable();
    } else if (L.Browser.mobile) {
      mapInstanceRef.current.dragging.disable();
    }
  }, [isMapTouchUnlocked]);

  // Update Map Markers & Live Route (Uses dynamic stands)
  useEffect(() => {
    if (!markersRef.current || !mapInstanceRef.current) return;
    markersRef.current.clearLayers();

    // Clean up previous layers
    if (routeLayerRef.current) {
      routeLayerRef.current.remove();
      routeLayerRef.current = null;
    }
    if (passengerMarkerRef.current) {
      passengerMarkerRef.current.remove();
      passengerMarkerRef.current = null;
    }
    if (driverLiveMarkerRef.current) {
      driverLiveMarkerRef.current.remove();
      driverLiveMarkerRef.current = null;
    }

    // 1. Add Gafargaon Dynamic Stand Markers
    stands.forEach((stand) => {
      const standIcon = L.divIcon({
        className: 'custom-stand-marker',
        html: `
          <div style="background-color: #065f46; color: white; width: 38px; height: 38px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(0,0,0,0.4); border: 3px solid #ffffff; cursor: pointer; transition: transform 0.2s;" onmouseover="this.style.transform='scale(1.12)'" onmouseout="this.style.transform='scale(1)'">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
          </div>
        `,
        iconSize: [38, 38],
        iconAnchor: [19, 38],
        popupAnchor: [0, -38],
      });

      const marker = L.marker([stand.lat, stand.lng], { icon: standIcon });
      const currentStandCount = getStandDriverCount(stand.bengaliName);
      marker.bindPopup(`
        <div style="font-family: 'Hind Siliguri', sans-serif; padding: 4px; min-width: 175px;">
          <h4 style="font-weight: 700; color: #065f46; margin: 0 0 4px 0; font-size: 14px;">${stand.bengaliName}</h4>
          <p style="font-size: 12px; color: #334155; margin: 0 0 6px 0;">সক্রিয় যানবাহন ও চালক: <b>${currentStandCount} জন</b></p>
          <span style="display: inline-block; background-color: #ecfdf5; color: #047857; font-size: 11px; padding: 2px 7px; border-radius: 4px; border: 1px solid #a7f3d0; font-weight: 700;">সফর ভেরিফাইড স্ট্যান্ড</span>
        </div>
      `);
      markersRef.current?.addLayer(marker);
    });

    // 2. Add Active Drivers Markers with Live Pulsing Radar Beacon
    const activeDriversToDisplay = drivers.filter(d => 
      selectedCategory === d.category &&
      (selectedStand === 'all' || d.standName.includes(selectedStand))
    );

    activeDriversToDisplay.forEach((driver) => {
      const isAmbulance = driver.category === 'ambulance';
      const categoryColor = 
        driver.category === 'ambulance' ? '#dc2626' :
        driver.category === 'fire' ? '#ea580c' :
        driver.category === 'cng' ? '#059669' :
        driver.category === 'auto' ? '#0d9488' :
        driver.category === 'car' ? '#2563eb' :
        driver.category === 'microbus' ? '#4f46e5' : '#d97706';

      const driverIcon = L.divIcon({
        className: 'custom-driver-marker',
        html: `
          <div style="position: relative;">
            <div style="position: absolute; width: 44px; height: 44px; border-radius: 50%; background: ${categoryColor}40; animation: ping 2.2s cubic-bezier(0, 0, 0.2, 1) infinite; top: -3px; left: -3px;"></div>
            <div style="background-color: ${categoryColor}; color: white; width: 38px; height: 38px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(0,0,0,0.38); border: 3px solid #ffffff; cursor: pointer; transition: transform 0.2s;" onmouseover="this.style.transform='scale(1.15)'" onmouseout="this.style.transform='scale(1)'">
              <span style="font-size: ${isAmbulance ? '20px; font-weight: 900;' : '18px;'}">${
                driver.category === 'ambulance' ? '✚' :
                driver.category === 'cng' ? '🛺' :
                driver.category === 'auto' ? '🔋' :
                driver.category === 'car' ? '🚗' :
                driver.category === 'microbus' ? '🚐' :
                driver.category === 'bike' ? '🏍️' : '🚒'
              }</span>
            </div>
          </div>
        `,
        iconSize: [38, 38],
        iconAnchor: [19, 38],
        popupAnchor: [0, -36],
      });

      const marker = L.marker([driver.lat, driver.lng], { icon: driverIcon });
      const callBtnBg = '#059669';

      marker.bindPopup(`
        <div style="font-family: 'Hind Siliguri', sans-serif; padding: 4px; min-width: 195px;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;">
            <span style="font-size: 11px; background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-weight: 600; color: #475569;">${driver.categoryBengali}</span>
            <span style="font-size: 11px; color: #d97706; font-weight: 700;">★ ${driver.rating.toFixed(1)}</span>
          </div>
          <h4 style="font-weight: 700; color: #0f172a; margin: 0 0 2px 0; font-size: 13.5px;">${driver.name}</h4>
          <p style="font-size: 12px; color: #0284c7; font-weight: 600; margin: 0 0 2px 0;">${driver.vehicleModel}</p>
          <div style="font-size: 10px; color: #059669; font-weight: 700; margin-bottom: 3px; display: flex; align-items: center; gap: 4px;">
            <span style="display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: #10b981;"></span>
            <span>লাইভ জিপিএস সক্রিয় • গতি: ${driver.approxSpeedKmh || 25} কিমি/ঘণ্টা</span>
          </div>
          <p style="font-size: 11px; color: #64748b; margin: 0 0 6px 0;">স্ট্যান্ড: ${driver.standName}</p>
          <div style="display: flex; flex-direction: column; gap: 4px;">
            <a href="tel:${driver.phone}" style="display: block; text-align: center; background-color: ${callBtnBg}; color: white; padding: 5px 8px; border-radius: 6px; text-decoration: none; font-size: 12px; font-weight: 700;">📞 সরাসরি কল করুন</a>
            <button onclick="window.__selectPickupPlace && window.__selectPickupPlace('${driver.standName}')" style="display: block; width: 100%; text-align: center; background-color: #f1f5f9; hover:background-color: #e2e8f0; color: #0f172a; padding: 4px 8px; border-radius: 6px; border: 1px solid #cbd5e1; font-size: 11px; font-weight: 700; cursor: pointer;">🚖 এই স্ট্যান্ড পিকআপ করুন</button>
          </div>
        </div>
      `);
      markersRef.current?.addLayer(marker);
    });

    // 3. Active Passenger Ride Booking: Real-Time Mutual Live Tracking & Polyline Route
    if (activeBooking && mapInstanceRef.current) {
      // Passenger Pin
      const passengerIcon = L.divIcon({
        className: 'custom-passenger-marker',
        html: `
          <div style="position: relative;">
            <div style="position: absolute; width: 34px; height: 34px; border-radius: 50%; background: rgba(59, 130, 246, 0.4); animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite; top: -5px; left: -5px;"></div>
            <div style="background-color: #2563eb; color: white; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 3px 8px rgba(0,0,0,0.4); border: 2.5px solid white;">
              <span style="font-size: 12px;">📍</span>
            </div>
          </div>
        `,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });

      const passMarker = L.marker([activeBooking.passengerLat, activeBooking.passengerLng], { icon: passengerIcon });
      passMarker.bindPopup(`
        <div style="font-family: 'Hind Siliguri', sans-serif; padding: 4px;">
          <h4 style="font-weight: 700; color: #1d4ed8; margin: 0 0 2px 0;">যাত্রীর লাইভ অবস্থান</h4>
          <p style="font-size: 12px; color: #475569; margin: 0;">চালক আপনার দিকে এগিয়ে আসছেন</p>
        </div>
      `);
      markersRef.current.addLayer(passMarker);
      passengerMarkerRef.current = passMarker;

      // Driver Live Moving Pin
      const liveDriverIcon = L.divIcon({
        className: 'custom-active-driver-marker',
        html: `
          <div style="position: relative;">
            <div style="position: absolute; width: 38px; height: 38px; border-radius: 50%; background: rgba(16, 185, 129, 0.4); animation: ping 1.8s cubic-bezier(0, 0, 0.2, 1) infinite; top: -5px; left: -5px;"></div>
            <div style="background-color: #059669; color: white; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 10px rgba(0,0,0,0.4); border: 2.5px solid white; font-weight: bold;">
              ${activeBooking.driver.category === 'ambulance' ? '✚' : '🚗'}
            </div>
          </div>
        `,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });

      const driverMarker = L.marker([activeBooking.currentDriverLat, activeBooking.currentDriverLng], { icon: liveDriverIcon });
      driverMarker.bindPopup(`
        <div style="font-family: 'Hind Siliguri', sans-serif; padding: 4px;">
          <h4 style="font-weight: 700; color: #047857; margin: 0 0 2px 0;">চালকের অবস্থান: ${activeBooking.driver.name}</h4>
          <p style="font-size: 11px; color: #334155; margin: 0 0 4px 0;">লাইসেন্স: ${activeBooking.driver.licenseNumber}</p>
          <p style="font-size: 11px; color: #2563eb; font-weight: 700; margin: 0;">দূরত্ব: ${activeBooking.distanceKm} কিমি | পৌঁছাতে বাকি: ${activeBooking.etaMinutes} মিনিট</p>
        </div>
      `);
      markersRef.current.addLayer(driverMarker);
      driverLiveMarkerRef.current = driverMarker;

      // Connecting Polyline Route
      const routePoints: [number, number][] = [
        [activeBooking.currentDriverLat, activeBooking.currentDriverLng],
        [
          (activeBooking.currentDriverLat + activeBooking.passengerLat) / 2 + 0.0006,
          (activeBooking.currentDriverLng + activeBooking.passengerLng) / 2 - 0.0005
        ],
        [activeBooking.passengerLat, activeBooking.passengerLng]
      ];

      const polyline = L.polyline(routePoints, {
        color: '#2563eb',
        weight: 5,
        opacity: 0.85,
        dashArray: '8, 8',
        lineCap: 'round'
      }).addTo(mapInstanceRef.current);

      routeLayerRef.current = polyline;

      // Fit bounds with padding
      const bounds = L.latLngBounds([
        [activeBooking.currentDriverLat, activeBooking.currentDriverLng],
        [activeBooking.passengerLat, activeBooking.passengerLng]
      ]);
      mapInstanceRef.current.fitBounds(bounds, { padding: [40, 40] });
    } else if (mapInstanceRef.current && pickupCoords && destCoords) {
      // 4. Live Ride Planning Preview: Render Pickup Pin (A), Destination Pin (B) & Connecting Route!
      
      // Pickup Pin (A)
      const pickupIcon = L.divIcon({
        className: 'custom-pickup-marker',
        html: `
          <div style="position: relative;">
            <div style="position: absolute; width: 44px; height: 44px; border-radius: 50%; background: rgba(5, 150, 105, 0.4); animation: ping 1.8s cubic-bezier(0, 0, 0.2, 1) infinite; top: -5px; left: -5px;"></div>
            <div style="background-color: #059669; color: white; width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(0,0,0,0.45); border: 3px solid #ffffff; font-weight: 900; font-size: 14px; cursor: pointer;">
              A
            </div>
          </div>
        `,
        iconSize: [34, 34],
        iconAnchor: [17, 17],
        popupAnchor: [0, -17]
      });

      const pMarker = L.marker([pickupCoords.lat, pickupCoords.lng], { icon: pickupIcon });
      pMarker.bindPopup(`
        <div style="font-family: 'Hind Siliguri', sans-serif; padding: 4px;">
          <span style="font-size: 10px; background: #dcfce7; color: #166534; font-weight: 800; padding: 2px 6px; border-radius: 4px;">পিকআপ স্থান (A)</span>
          <h4 style="font-weight: 800; color: #065f46; margin: 4px 0 2px 0; font-size: 13px;">${passengerPickup}</h4>
          <p style="font-size: 11px; color: #475569; margin: 0;">যাত্রা শুরুর পয়েন্ট</p>
        </div>
      `);
      markersRef.current.addLayer(pMarker);

      // Destination Pin (B)
      const destIcon = L.divIcon({
        className: 'custom-dest-marker',
        html: `
          <div style="position: relative;">
            <div style="position: absolute; width: 44px; height: 44px; border-radius: 50%; background: rgba(220, 38, 38, 0.4); animation: ping 1.8s cubic-bezier(0, 0, 0.2, 1) infinite; top: -5px; left: -5px;"></div>
            <div style="background-color: #dc2626; color: white; width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(0,0,0,0.45); border: 3px solid #ffffff; font-weight: 900; font-size: 14px; cursor: pointer;">
              B
            </div>
          </div>
        `,
        iconSize: [34, 34],
        iconAnchor: [17, 17],
        popupAnchor: [0, -17]
      });

      const dMarker = L.marker([destCoords.lat, destCoords.lng], { icon: destIcon });
      dMarker.bindPopup(`
        <div style="font-family: 'Hind Siliguri', sans-serif; padding: 4px;">
          <span style="font-size: 10px; background: #fee2e2; color: #991b1b; font-weight: 800; padding: 2px 6px; border-radius: 4px;">গন্তব্য স্থান (B)</span>
          <h4 style="font-weight: 800; color: #991b1b; margin: 4px 0 2px 0; font-size: 13px;">${passengerDestination}</h4>
          <p style="font-size: 11px; color: #475569; margin: 0;">পৌঁছানোর পয়েন্ট</p>
        </div>
      `);
      markersRef.current.addLayer(dMarker);

      // Connecting Polyline Route
      if (pickupCoords.lat !== destCoords.lat || pickupCoords.lng !== destCoords.lng) {
        const midLat = (pickupCoords.lat + destCoords.lat) / 2 + 0.0004;
        const midLng = (pickupCoords.lng + destCoords.lng) / 2 - 0.0004;
        const routePoints: [number, number][] = [
          [pickupCoords.lat, pickupCoords.lng],
          [midLat, midLng],
          [destCoords.lat, destCoords.lng]
        ];

        const polyline = L.polyline(routePoints, {
          color: '#059669',
          weight: 5,
          opacity: 0.9,
          dashArray: '8, 8',
          lineCap: 'round'
        }).addTo(mapInstanceRef.current);

        polyline.bindTooltip(`দূরত্ব: ${calculatedDistance} কিমি • সময়: ${calculatedDurationMinutes} মিনিট`, {
          permanent: true,
          direction: 'center',
          className: 'route-distance-tooltip'
        });

        routeLayerRef.current = polyline;

        // Fit bounds comfortably
        const bounds = L.latLngBounds([
          [pickupCoords.lat, pickupCoords.lng],
          [destCoords.lat, destCoords.lng]
        ]);
        mapInstanceRef.current.fitBounds(bounds, { padding: [55, 55], maxZoom: 16 });
      }
    }
  }, [selectedCategory, selectedStand, drivers, stands, activeBooking, pickupCoords, destCoords, passengerPickup, passengerDestination, calculatedDistance, calculatedDurationMinutes]);

  // Real-Time Driver Sync from Cloudflare Worker / Real-time Engine
  useEffect(() => {
    if (serverState.drivers && serverState.drivers.length > 0) {
      setDrivers(prevDrivers => {
        let hasChanges = false;
        const updated = prevDrivers.map(d => {
          const sd = serverState.drivers.find(s => s.id === d.id);
          if (sd) {
            const latDiff = Math.abs(d.lat - sd.lat);
            const lngDiff = Math.abs(d.lng - sd.lng);
            const onlineDiff = d.isOnline !== (sd.isOnline ?? d.isOnline);
            if (latDiff > 0.0001 || lngDiff > 0.0001 || onlineDiff) {
              hasChanges = true;
              return {
                ...d,
                lat: sd.lat,
                lng: sd.lng,
                approxSpeedKmh: sd.speed || d.approxSpeedKmh,
                isOnline: sd.isOnline ?? d.isOnline
              };
            }
          }
          return d;
        });
        return hasChanges ? updated : prevDrivers;
      });
    }
  }, [serverState.drivers]);

  // Global window pickup & destination selector from map popup
  useEffect(() => {
    (window as any).__selectPickupPlace = (placeName: string) => {
      setPassengerPickup(placeName);
      const coords = resolveLocationCoordinates(placeName, false);
      setPickupCoords(coords);
      showAdminToastMessage(`পিকআপ হিসেবে নির্বাচিত: ${placeName}`);
    };
    (window as any).__selectDestPlace = (placeName: string) => {
      setPassengerDestination(placeName);
      const coords = resolveLocationCoordinates(placeName, true);
      setDestCoords(coords);
      showAdminToastMessage(`গন্তব্য হিসেবে নির্বাচিত: ${placeName}`);
    };
    return () => {
      delete (window as any).__selectPickupPlace;
      delete (window as any).__selectDestPlace;
    };
  }, []);

  // Genuine Driver Location Sync during active booking (Real GPS only, zero fake crawling)
  useEffect(() => {
    if (!activeBooking) return;

    // If current user is the driver and device has active GPS, sync driver's real coordinates
    if (userRole === 'driver' && liveGps.lat && liveGps.lng) {
      const dLat = liveGps.lat;
      const dLng = liveGps.lng;
      const diff = Math.abs(activeBooking.currentDriverLat - dLat) + Math.abs(activeBooking.currentDriverLng - dLng);

      // Only update when device actually moves (> 3-5 meters) to avoid jitter
      if (diff > 0.00004) {
        const remainingDist = Number(calculateDistanceKm(dLat, dLng, activeBooking.passengerLat, activeBooking.passengerLng).toFixed(2));
        const remainingEta = Math.max(1, calculateEtaMinutes(remainingDist, activeBooking.driver.approxSpeedKmh || 30));

        setActiveBooking(prev => prev ? {
          ...prev,
          currentDriverLat: dLat,
          currentDriverLng: dLng,
          distanceKm: remainingDist,
          etaMinutes: remainingEta
        } : null);

        // Sync driver's live GPS to Firestore request document so passenger sees driver moving in real life
        const reqId = (activeBooking as any).requestId || (activeBooking as any).id;
        if (reqId) {
          updateDoc(doc(db, 'ride_requests', reqId), {
            driverLat: dLat,
            driverLng: dLng,
            updatedAt: new Date().toISOString()
          }).catch(() => {});
        }
      }
    }
  }, [activeBooking?.driver.id, userRole, liveGps.lat, liveGps.lng]);

  // Filtered and stably sorted drivers (100% stable, zero jumping/lafalafi)
  const filteredDrivers = useMemo(() => {
    return drivers.filter(driver => {
      const matchesCategory = selectedCategory === 'all' || driver.category === selectedCategory;
      const matchesStand = selectedStand === 'all' || driver.standName.includes(selectedStand);
      const matchesSearch = 
        driver.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        driver.vehicleModel.toLowerCase().includes(searchQuery.toLowerCase()) ||
        driver.plateNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        driver.licenseNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        driver.standName.toLowerCase().includes(searchQuery.toLowerCase());

      return matchesCategory && matchesStand && matchesSearch;
    }).sort((a, b) => {
      const getStableDriverTime = (d: Driver): number => {
        if (typeof (d as any).registeredTimestamp === 'number' && (d as any).registeredTimestamp > 0) {
          return (d as any).registeredTimestamp;
        }
        const numMatch = d.id.match(/\d{10,}/);
        if (numMatch) {
          const num = parseInt(numMatch[0], 10);
          if (!isNaN(num) && num > 1600000000000) return num;
        }
        if ((d as any).createdAt) {
          const t = new Date((d as any).createdAt).getTime();
          if (!isNaN(t) && t > 0) return t;
        }
        return 0;
      };

      const timeA = getStableDriverTime(a);
      const timeB = getStableDriverTime(b);
      if (timeB !== timeA) return timeB - timeA;
      // Deterministic tie-breaker prevents order jumping on GPS moves
      return a.id.localeCompare(b.id);
    });
  }, [drivers, selectedCategory, selectedStand, searchQuery]);

  // Handle Driver Registration Submit with full verification logic & mandatory Pending Review
  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormValidationNotice(null);

    if (!registerForm.name.trim() || !registerForm.phone.trim()) {
      setFormValidationNotice('চালকের নাম ও মোবাইল নম্বর পূরণ করুন');
      return;
    }

    if (!registerForm.licenseNumber.trim()) {
      setFormValidationNotice('নিবন্ধন নিশ্চিত করতে ড্রাইভিং লাইসেন্স নম্বর দিন');
      return;
    }

    if (!registerForm.nid.trim() || registerForm.nid.length < 10) {
      setFormValidationNotice('সঠিক জাতীয় পরিচয়পত্র (NID) নম্বর দিন (কমপক্ষে ১০ ডিজিট)');
      return;
    }

    const catObj = VEHICLE_CATEGORIES.find(c => c.id === registerForm.category);
    const targetStand = stands.find(s => s.bengaliName === registerForm.standName) || stands[0];
    const newRegAppId = `SAFAR-REG-${Math.floor(1000 + Math.random() * 9000)}`;

    // MANDATORY REQUIREMENT: Newly submitted driver starts with ALL 3 VERIFICATIONS PENDING
    // 1. BRTA License: false (Admin review pending)
    // 2. Phone / WhatsApp: false (Verification pending)
    // 3. NID: false (Verification pending)
    const newDriver: Driver = {
      id: `drv-${Date.now()}`,
      name: registerForm.name.trim(),
      phone: registerForm.phone.trim(),
      category: registerForm.category,
      categoryBengali: catObj ? catObj.nameBengali : 'যানবাহন',
      vehicleModel: registerForm.vehicleModel.trim() || 'নিবন্ধিত বাহন',
      plateNumber: registerForm.plateNumber.trim() || '',
      licenseNumber: registerForm.licenseNumber.trim(),
      firstIssueDate: registerForm.firstIssueDate.trim() || '',
      licenseType: registerForm.licenseType,
      regLastFour: registerForm.regLastFour.trim() || (registerForm.plateNumber ? registerForm.plateNumber.replace(/[^0-9]/g, '').slice(-4) : ''),
      manufacturingYear: registerForm.manufacturingYear.trim() || '',
      chassisNumber: registerForm.chassisNumber.trim() || '',
      engineNumber: registerForm.engineNumber.trim() || '',
      taxTokenReceiptPhoto: registerForm.taxTokenReceiptPhoto || '',
      driverPhoto: registerForm.driverPhoto || '',
      nidFrontPhoto: registerForm.nidFrontPhoto || '',
      nidBackPhoto: registerForm.nidBackPhoto || '',
      nidNumber: registerForm.nid.trim(),
      nidVerified: false,
      licenseVerified: false,
      phoneVerified: false,
      verificationStatus: 'pending',
      regAppId: newRegAppId,
      registeredAt: new Date().toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' }),
      standName: targetStand ? targetStand.bengaliName : registerForm.standName,
      lat: (targetStand ? targetStand.lat : 24.4536) + (Math.random() - 0.5) * 0.005,
      lng: (targetStand ? targetStand.lng : 90.5479) + (Math.random() - 0.5) * 0.005,
      rating: 5.0,
      totalTrips: 0,
      avatarBg: 'bg-emerald-700',
      isOnline: true,
      approxSpeedKmh: registerForm.category === 'bike' ? 35 : registerForm.category === 'cng' ? 28 : 25
    };

    setDrivers(prev => [newDriver, ...prev]);
    setActiveSubmittedDriverId(newDriver.id);
    try {
      localStorage.setItem('safar_last_reg_driver_id', newDriver.id);
    } catch {}

    // Automatically update driver cockpit profile dynamically with newly registered info & photo
    setDriverProfile({
      id: newDriver.id,
      name: newDriver.name,
      phone: newDriver.phone,
      vehicleModel: newDriver.vehicleModel,
      plateNumber: newDriver.plateNumber,
      licenseNumber: newDriver.licenseNumber,
      standName: newDriver.standName,
      category: newDriver.category,
      rating: 5.0,
      todayTrips: 0,
      todayEarnings: 0,
      driverPhoto: newDriver.driverPhoto || '',
      isRegistered: true
    });

    // Switch immediately to status check view to display the Pending Process Message
    setRegisterModalTab('status_check');
    setStatusCheckResult(newDriver);
    showAdminToastMessage(`আবেদন রেফারেন্স: ${newRegAppId} - যাচাইকরণ পেন্ডিং রয়েছে`);

    // Sync newly registered driver to Firebase Firestore with ALL verification credentials and photos
    setDoc(doc(db, 'drivers', newDriver.id), {
      ...newDriver,
      nameBn: newDriver.name,
      licensePlate: newDriver.plateNumber,
      firstIssueDate: newDriver.firstIssueDate || '',
      licenseType: newDriver.licenseType,
      regLastFour: newDriver.regLastFour || '',
      manufacturingYear: newDriver.manufacturingYear || '',
      chassisNumber: newDriver.chassisNumber || '',
      engineNumber: newDriver.engineNumber || '',
      taxTokenReceiptPhoto: newDriver.taxTokenReceiptPhoto || '',
      driverPhoto: newDriver.driverPhoto || '',
      photoUrl: newDriver.driverPhoto || '',
      nidFrontPhoto: newDriver.nidFrontPhoto || '',
      nidBackPhoto: newDriver.nidBackPhoto || '',
      isVerified: false,
      verificationStatus: 'pending',
      updatedAt: new Date().toISOString()
    }).catch(err => {
      console.warn('Firestore offline fallback for driver register:', err);
    });

    // Reset form fields
    setRegisterForm({
      name: '',
      phone: '',
      category: 'bike',
      vehicleModel: '',
      plateNumber: '',
      licenseNumber: '',
      firstIssueDate: '',
      licenseType: 'পেশাদার (Professional)',
      regLastFour: '',
      manufacturingYear: '',
      chassisNumber: '',
      engineNumber: '',
      taxTokenReceiptPhoto: '',
      driverPhoto: '',
      nidFrontPhoto: '',
      nidBackPhoto: '',
      standName: stands[0]?.bengaliName || 'গফরগাঁও রেলওয়ে স্টেশন স্ট্যান্ড',
      nid: ''
    });
    setTaxTokenSizeKb(null);
    setDriverPhotoSizeKb(null);
    setNidFrontSizeKb(null);
    setNidBackSizeKb(null);
  };

  // Search driver application verification status by Application ID or Phone
  const handleSearchVerificationStatus = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setStatusCheckError(null);
    const query = statusCheckQuery.trim().toLowerCase();
    if (!query) {
      setStatusCheckError('অনুগ্রহ করে আপনার আবেদন রেফারেন্স আইডি বা মোবাইল নম্বর দিন');
      return;
    }
    const found = drivers.find(d => 
      (d.regAppId && d.regAppId.toLowerCase() === query) ||
      d.phone.includes(query) ||
      d.licenseNumber.toLowerCase().includes(query) ||
      d.nidNumber.includes(query)
    );
    if (found) {
      setStatusCheckResult(found);
      setActiveSubmittedDriverId(found.id);
      try {
        localStorage.setItem('safar_last_reg_driver_id', found.id);
      } catch {}
    } else {
      setStatusCheckResult(null);
      setStatusCheckError('এই রেফারেন্স আইডি বা নম্বরে কোনো চালকের আবেদন খুঁজে পাওয়া যায়নি');
    }
  };

  // Handle Passenger Confirm Ride with Live Distance & ETA calculation
  // Handle Passenger Confirm Ride with Live Distance, ETA & Automatic State/History Sync
  const handleConfirmRide = (driver: Driver) => {
    const pTitle = passengerPickup || (selectedStand !== 'all' ? selectedStand : 'গফরগাঁও লাইভ অবস্থান');
    const dTitle = passengerDestination || driver.standName || 'উপজেলা স্বাস্থ্য কমপ্লেক্স';
    const pLat = pickupCoords?.lat || passengerLocation.lat || 24.4536;
    const pLng = pickupCoords?.lng || passengerLocation.lng || 90.5479;
    const resolvedDest = destCoords || resolveLocationCoordinates(dTitle, true, stands) || { lat: 24.4515, lng: 90.5535 };
    const dLat = resolvedDest.lat;
    const dLng = resolvedDest.lng;
    const dist = calculateDistanceKm(driver.lat, driver.lng, pLat, pLng);
    const eta = calculateEtaMinutes(dist, driver.approxSpeedKmh);
    const estFare = Math.max(35, Math.round(dist * (driver.category === 'bike' ? 22 : driver.category === 'cng' ? 26 : driver.category === 'ambulance' ? 60 : 35)));
    const validFare = (estFare && estFare > 0) ? estFare : (categories.find(c => c.id === driver.category)?.baseFare || 40);

    let landmarkRef = passengerPickupLandmark;
    if (!landmarkRef && pLat && pLng) {
      const nearest = findNearestLandmark(pLat, pLng);
      if (nearest.distanceMeters > 40) {
        landmarkRef = `${nearest.name} (থেকে ~${toBengaliNumber(nearest.distanceMeters)} মিটার দূরে)`;
      }
    }

    // Automatically dispatch live passenger request to Driver Cockpit (saved to localStorage & Firestore)
    const newRideRequest: PassengerRideRequest = {
      id: `req-${Date.now()}`,
      passengerName: passengerProfile.name || 'সম্মানিত যাত্রী',
      passengerPhone: passengerProfile.phone || '০১৭১১-২২৩৩৪৪',
      pickupPoint: pTitle,
      pickupLandmark: landmarkRef || undefined,
      destination: dTitle,
      category: driver.category,
      requestedAt: 'এইমাত্র',
      distanceKm: dist,
      estFare: validFare,
      pickupCoords: { lat: pLat, lng: pLng },
      destCoords: { lat: dLat, lng: dLng },
      status: 'pending',
      driverId: driver.id,
      driverName: driver.name
    };

    setPassengerPendingRequest(newRideRequest);
    try {
      localStorage.setItem('safar_passenger_pending_v2', JSON.stringify(newRideRequest));
      localStorage.setItem('safar_my_ride_request_id', newRideRequest.id);
      localStorage.setItem('safar_my_ride_request_phone', newRideRequest.passengerPhone);
    } catch {}

    // Sync ride request to Firestore targeting this specific driver
    setDoc(doc(db, 'ride_requests', newRideRequest.id), {
      id: newRideRequest.id,
      passengerName: newRideRequest.passengerName,
      passengerPhone: newRideRequest.passengerPhone,
      pickupPoint: newRideRequest.pickupPoint,
      pickupLandmark: landmarkRef || '',
      destination: newRideRequest.destination,
      category: newRideRequest.category,
      distanceKm: newRideRequest.distanceKm,
      estFare: newRideRequest.estFare,
      pickupCoords: { lat: pLat, lng: pLng },
      destCoords: { lat: dLat, lng: dLng },
      status: 'pending',
      driverId: driver.id,
      driverName: driver.name,
      createdAtMs: Date.now(),
      requestedAt: new Date().toISOString()
    }).catch(err => console.warn('Firestore ride request sync error:', err));

    // Close detail modal
    setSelectedDriver(null);
    showAdminToastMessage(`চালক '${driver.name}'-এর কাছে আপনার অনুরোধ পাঠানো হয়েছে... চালক গ্রহণের অপেক্ষায়`);

    // Auto-scroll to active ride cockpit box
    setTimeout(() => {
      const cockpitEl = document.getElementById('passenger-ride-cockpit-section');
      if (cockpitEl) {
        cockpitEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 120);
  };

  // Cancel Active Booking & Clear Map Route Lines & Pins
  const handleCancelBooking = async () => {
    const booking = activeBooking;
    const bId = (booking as any)?.requestId || (booking as any)?.id;
    if (bId) {
      addDismissedTripId(bId);
    }
    const storedReqId = localStorage.getItem('safar_my_ride_request_id');
    if (storedReqId) {
      addDismissedTripId(storedReqId);
    }

    try {
      localStorage.removeItem('safar_active_booking_v2');
      localStorage.removeItem('safar_my_ride_request_id');
      localStorage.removeItem('safar_my_ride_request_phone');
      localStorage.removeItem('safar_passenger_pending_v2');
    } catch {}

    setActiveBooking(null);
    setPassengerPendingRequest(null);
    setPickupCoords(null);
    setDestCoords(null);
    setPassengerPickup('');
    setPassengerDestination('');

    if (bId) {
      try {
        await updateDoc(doc(db, 'ride_requests', bId), {
          status: 'cancelled',
          cancelledAt: new Date().toISOString()
        });
      } catch (e) {}
    }

    showAdminToastMessage('ট্রিপ সফলভাবে বাতিল ও ক্লিয়ার করা হয়েছে');
  };

  // Driver Finishes the Active Trip
  const completedDriverTripIdsRef = useRef<{ [tripId: string]: boolean }>({});

  const handleDriverCompleteActiveTrip = async (tripId: string, fare: number) => {
    const alreadyCounted = completedDriverTripIdsRef.current[tripId];
    completedDriverTripIdsRef.current[tripId] = true;

    try {
      await updateDoc(doc(db, 'ride_requests', tripId), {
        status: 'completed',
        completedAt: new Date().toISOString()
      });
      if (!alreadyCounted) {
        setDriverProfile(prev => ({
          ...prev,
          todayTrips: (prev.todayTrips || 0) + 1,
          todayEarnings: (prev.todayEarnings || 0) + (fare || 40)
        }));
      }
      setPassengerRequests(prev => prev.filter(r => r.id !== tripId));
      showAdminToastMessage(`🎉 ট্রিপ সফলভাবে সম্পন্ন হয়েছে! ৳ ${fare} ভাড়া আয় হয়েছে।`);
    } catch (err) {
      console.warn('Failed to complete trip in Firestore:', err);
      if (!alreadyCounted) {
        setDriverProfile(prev => ({
          ...prev,
          todayTrips: (prev.todayTrips || 0) + 1,
          todayEarnings: (prev.todayEarnings || 0) + (fare || 40)
        }));
      }
      setPassengerRequests(prev => prev.filter(r => r.id !== tripId));
    }
  };

  // Driver Cancels an Accepted Trip
  const handleDriverCancelActiveTrip = async (tripId: string) => {
    try {
      await updateDoc(doc(db, 'ride_requests', tripId), {
        status: 'cancelled',
        cancelledAt: new Date().toISOString()
      });
      showAdminToastMessage('ট্রিপটি বাতিল করা হয়েছে');
    } catch (err) {
      console.warn('Failed to cancel trip in Firestore:', err);
    }
    setPassengerRequests(prev => prev.filter(r => r.id !== tripId));
  };

  // Purge / Clean stale dummy requests from Firestore
  const handlePurgeStaleRequests = async () => {
    try {
      const snap = await getDocs(collection(db, 'ride_requests'));
      let count = 0;
      const now = Date.now();
      for (const d of snap.docs) {
        const data = d.data();
        const reqTime = data.requestedAt ? new Date(data.requestedAt).getTime() : (data.createdAt ? new Date(data.createdAt).getTime() : 0);
        if (data.status === 'completed' || data.status === 'cancelled' || data.status === 'declined' || (reqTime > 0 && now - reqTime > 60 * 60 * 1000) || (!data.requestedAt && !data.createdAt)) {
          await deleteDoc(doc(db, 'ride_requests', d.id));
          count++;
        }
      }
      setPassengerRequests(prev => prev.filter(r => r.status === 'pending'));
      showAdminToastMessage(`🧹 ${count} টি পুরানো/টেস্ট রিকোয়েস্ট ডাটাবেস থেকে মুছে পরিষ্কার করা হয়েছে!`);
    } catch (err) {
      console.warn('Error purging stale requests:', err);
      showAdminToastMessage('ডাটা পরিষ্কারের সময় সমস্যা হয়েছে');
    }
  };

  // =========================================================================
  // ADMIN CONTROL PANEL HANDLERS (STANDS, CATEGORIES, DRIVERS, HOTLINES)
  // =========================================================================

  // Admin Login with Secret PIN
  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminPinInput.trim() === '7788' || adminPinInput.trim() === '2026') {
      setIsAdminLoggedIn(true);
      try {
        sessionStorage.setItem('safar_admin_auth', 'true');
      } catch {}
      setShowAdminAuthModal(false);
      setShowAdminDashboard(true);
      setAdminPinInput('');
      setAdminAuthError(null);
      showAdminToastMessage('অ্যাডমিন ড্যাশবোর্ডে স্বাগতম!');
    } else {
      setAdminAuthError('ভুল পিন কোড! অনুগ্রহ করে সঠিক অ্যাডমিন পিন দিন।');
    }
  };

  // Admin Logout
  const handleAdminLogout = () => {
    setIsAdminLoggedIn(false);
    try {
      sessionStorage.removeItem('safar_admin_auth');
    } catch {}
    setShowAdminDashboard(false);
    showAdminToastMessage('অ্যাডমিন সেশন সফলভাবে সমাপ্ত হয়েছে');
  };

  // Save Stand (Add or Edit)
  const handleSaveStand = (e: React.FormEvent) => {
    e.preventDefault();
    if (!standForm.bengaliName.trim()) {
      showAdminToastMessage('স্ট্যান্ডের বাংলা নাম দিন');
      return;
    }

    if (editingStandId) {
      const updatedStand = {
        bengaliName: standForm.bengaliName.trim(),
        name: standForm.name.trim() || standForm.bengaliName.trim(),
        lat: Number(standForm.lat) || 24.4536,
        lng: Number(standForm.lng) || 90.5479
      };
      setStands(prev => prev.map(s => 
        s.id === editingStandId 
          ? { ...s, ...updatedStand }
          : s
      ));
      setDoc(doc(db, 'stands', editingStandId), {
        id: editingStandId,
        ...updatedStand,
        updatedAt: new Date().toISOString()
      }, { merge: true }).catch(err => console.warn('Firestore stand update error:', err));
      showAdminToastMessage(`স্ট্যান্ড '${standForm.bengaliName}' আপডেট ও লাইভ সেভ হয়েছে!`);
    } else {
      const newStand: Stand = {
        id: `stand-${Date.now()}`,
        bengaliName: standForm.bengaliName.trim(),
        name: standForm.name.trim() || standForm.bengaliName.trim(),
        lat: Number(standForm.lat) || 24.4536,
        lng: Number(standForm.lng) || 90.5479,
        activeDrivers: 0
      };
      setStands(prev => [...prev, newStand]);
      setDoc(doc(db, 'stands', newStand.id), {
        ...newStand,
        updatedAt: new Date().toISOString()
      }, { merge: true }).catch(err => console.warn('Firestore stand save error:', err));
      showAdminToastMessage(`নতুন স্ট্যান্ড '${newStand.bengaliName}' সফলভাবে তৈরি ও লাইভ সেভ হয়েছে!`);
    }

    setIsStandModalOpen(false);
    setEditingStandId(null);
    setStandForm({ bengaliName: '', name: '', lat: 24.4536, lng: 90.5479 });
  };

  // Delete Stand
  const handleDeleteStand = (standId: string, standName: string) => {
    if (stands.length <= 1) {
      showAdminToastMessage('কমপক্ষে ১টি স্ট্যান্ড সিস্টেমে থাকা আবশ্যক!');
      return;
    }
    setStands(prev => prev.filter(s => s.id !== standId));
    deleteDoc(doc(db, 'stands', standId)).catch(err => console.warn('Firestore stand delete error:', err));
    showAdminToastMessage(`স্ট্যান্ড '${standName}' মুছে ফেলা হয়েছে`);
  };

  // Save Category (Add or Edit)
  const handleSaveCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryForm.nameBengali.trim()) {
      showAdminToastMessage('ক্যাটাগরির বাংলা নাম দিন');
      return;
    }

    if (editingCategoryId) {
      const updatedCat = {
        nameBengali: categoryForm.nameBengali.trim(),
        subtitle: categoryForm.subtitle.trim() || 'নিবন্ধিত বাহন সার্ভিস',
        accentColor: categoryForm.accentColor || '#059669'
      };
      setCategories(prev => prev.map(c => 
        c.id === editingCategoryId
          ? { ...c, ...updatedCat }
          : c
      ));
      setDoc(doc(db, 'categories', editingCategoryId), {
        id: editingCategoryId,
        ...updatedCat,
        updatedAt: new Date().toISOString()
      }, { merge: true }).catch(err => console.warn('Firestore category update error:', err));
      showAdminToastMessage(`ক্যাটাগরি '${categoryForm.nameBengali}' আপডেট ও লাইভ সেভ হয়েছে!`);
    } else {
      const rawId = categoryForm.id.trim().toLowerCase().replace(/[^a-z0-9]/g, '') || `cat-${Date.now()}`;
      const newCat: VehicleCategoryItem = {
        id: rawId,
        nameBengali: categoryForm.nameBengali.trim(),
        subtitle: categoryForm.subtitle.trim() || 'নিবন্ধিত বাহন সার্ভিস',
        badgeBg: 'bg-emerald-600',
        badgeBorder: 'border-emerald-700',
        textColor: 'text-emerald-700',
        accentColor: categoryForm.accentColor || '#059669',
        baseFare: 30,
        perKmFare: 15,
        minFare: 30,
        iconType: 'cng',
        isEmergency: false,
        isFree: false
      };
      setCategories(prev => [...prev, newCat]);
      setDoc(doc(db, 'categories', newCat.id), {
        ...newCat,
        updatedAt: new Date().toISOString()
      }, { merge: true }).catch(err => console.warn('Firestore category save error:', err));
      showAdminToastMessage(`নতুন ক্যাটাগরি '${newCat.nameBengali}' সফলভাবে তৈরি ও লাইভ সেভ হয়েছে!`);
    }

    setIsCategoryModalOpen(false);
    setEditingCategoryId(null);
    setCategoryForm({ id: '', nameBengali: '', subtitle: '', badgeBg: 'bg-emerald-600', badgeBorder: 'border-emerald-700', textColor: 'text-emerald-700', accentColor: '#059669' });
  };

  // Delete Category
  const handleDeleteCategory = (catId: string, catName: string) => {
    if (categories.length <= 1) {
      showAdminToastMessage('কমপক্ষে ১টি ক্যাটাগরি থাকা আবশ্যক!');
      return;
    }
    setCategories(prev => prev.filter(c => c.id !== catId));
    deleteDoc(doc(db, 'categories', catId)).catch(err => console.warn('Firestore category delete error:', err));
    showAdminToastMessage(`ক্যাটাগরি '${catName}' মুছে ফেলা হয়েছে`);
  };

  // Dedicated Verification Gate Modal States (BRTA, WA, NID)
  const [verificationGateType, setVerificationGateType] = useState<'brta' | 'wa' | 'nid' | null>(null);
  const [verifyingDriverTarget, setVerifyingDriverTarget] = useState<Driver | null>(null);
  const [successModalDriver, setSuccessModalDriver] = useState<Driver | null>(null);

  const handleOpenVerificationGate = (driver: Driver, gateType: 'brta' | 'wa' | 'nid') => {
    setVerifyingDriverTarget(driver);
    setVerificationGateType(gateType);
  };

  const handleApproveVerificationGate = (driverId: string, gateType: 'brta' | 'wa' | 'nid') => {
    let newlyFullyVerifiedDriver: Driver | null = null;

    setDrivers(prev => prev.map(d => {
      if (d.id !== driverId) return d;
      const nextLic = gateType === 'brta' ? true : Boolean(d.licenseVerified);
      const nextPhone = gateType === 'wa' ? true : Boolean(d.phoneVerified);
      const nextNid = gateType === 'nid' ? true : Boolean(d.nidVerified);
      const all3 = nextLic && nextPhone && nextNid;
      const updated: Driver = {
        ...d,
        licenseVerified: nextLic,
        phoneVerified: nextPhone,
        nidVerified: nextNid,
        verificationStatus: all3 ? 'verified' : 'pending',
        isOnline: all3 ? true : d.isOnline
      };
      if (all3) {
        newlyFullyVerifiedDriver = updated;
      }
      return updated;
    }));

    // Real-time Firestore sync
    const targetDrv = drivers.find(d => d.id === driverId);
    if (targetDrv) {
      const nextLic = gateType === 'brta' ? true : Boolean(targetDrv.licenseVerified);
      const nextPhone = gateType === 'wa' ? true : Boolean(targetDrv.phoneVerified);
      const nextNid = gateType === 'nid' ? true : Boolean(targetDrv.nidVerified);
      const all3 = nextLic && nextPhone && nextNid;
      setDoc(doc(db, 'drivers', driverId), {
        ...targetDrv,
        licenseVerified: nextLic,
        phoneVerified: nextPhone,
        nidVerified: nextNid,
        isVerified: all3,
        verificationStatus: all3 ? 'verified' : 'pending',
        isOnline: all3 ? true : targetDrv.isOnline,
        updatedAt: new Date().toISOString()
      }, { merge: true }).catch(err => console.warn('Firestore verify gate error:', err));
    }

    if (newlyFullyVerifiedDriver) {
      const fullDriver = newlyFullyVerifiedDriver as Driver;
      setSuccessModalDriver(fullDriver);
      try {
        confetti({
          particleCount: 100,
          spread: 80,
          origin: { y: 0.6 }
        });
        sounds.playTripCompletedFanfare();
      } catch {}
    }

    if (statusCheckResult && statusCheckResult.id === driverId) {
      setStatusCheckResult(prev => {
        if (!prev) return null;
        const nextLic = gateType === 'brta' ? true : prev.licenseVerified;
        const nextPhone = gateType === 'wa' ? true : prev.phoneVerified;
        const nextNid = gateType === 'nid' ? true : prev.nidVerified;
        const all3 = Boolean(nextLic && nextPhone && nextNid);
        return {
          ...prev,
          licenseVerified: nextLic,
          phoneVerified: nextPhone,
          nidVerified: nextNid,
          verificationStatus: all3 ? 'verified' : 'pending',
          isOnline: all3 ? true : prev.isOnline
        };
      });
    }

    const typeNames: Record<string, string> = {
      brta: 'বিআরটিএ ড্রাইভিং লাইসেন্স ও মোটরযান',
      wa: 'হোয়াটসঅ্যাপ ও ফোন নম্বর',
      nid: 'জাতীয় পরিচয়পত্র (NID)'
    };
    showAdminToastMessage(`${typeNames[gateType]} সফলভাবে যাচাই ও অনুমোদন হয়েছে!`);
  };

  const handleRevokeVerificationGate = (driverId: string, gateType: 'brta' | 'wa' | 'nid') => {
    setDrivers(prev => prev.map(d => {
      if (d.id !== driverId) return d;
      const nextLic = gateType === 'brta' ? false : d.licenseVerified;
      const nextPhone = gateType === 'wa' ? false : d.phoneVerified;
      const nextNid = gateType === 'nid' ? false : d.nidVerified;
      return {
        ...d,
        licenseVerified: nextLic,
        phoneVerified: nextPhone,
        nidVerified: nextNid,
        verificationStatus: 'pending'
      };
    }));

    const targetDrv = drivers.find(d => d.id === driverId);
    if (targetDrv) {
      const nextLic = gateType === 'brta' ? false : targetDrv.licenseVerified;
      const nextPhone = gateType === 'wa' ? false : targetDrv.phoneVerified;
      const nextNid = gateType === 'nid' ? false : targetDrv.nidVerified;
      setDoc(doc(db, 'drivers', driverId), {
        ...targetDrv,
        licenseVerified: nextLic,
        phoneVerified: nextPhone,
        nidVerified: nextNid,
        isVerified: false,
        verificationStatus: 'pending',
        updatedAt: new Date().toISOString()
      }, { merge: true }).catch(err => console.warn('Firestore revoke gate error:', err));
    }

    showAdminToastMessage('অনুমোদন প্রত্যাহার করে পেন্ডিং করা হয়েছে');
  };

  // Quick fallback toggles
  const handleToggleDriverLicense = (driverId: string) => {
    const drv = drivers.find(d => d.id === driverId);
    if (drv) handleOpenVerificationGate(drv, 'brta');
  };

  const handleToggleDriverPhone = (driverId: string) => {
    const drv = drivers.find(d => d.id === driverId);
    if (drv) handleOpenVerificationGate(drv, 'wa');
  };

  const handleToggleDriverNid = (driverId: string) => {
    const drv = drivers.find(d => d.id === driverId);
    if (drv) handleOpenVerificationGate(drv, 'nid');
  };

  // Execute full 3-tier approval with driver SMS notification and celebration
  const handleExecuteFullApproval = (driverId: string) => {
    let targetDrv: Driver | null = null;
    setDrivers(prev => prev.map(d => {
      if (d.id !== driverId) return d;
      const updated: Driver = {
        ...d,
        licenseVerified: true,
        phoneVerified: true,
        nidVerified: true,
        verificationStatus: 'verified',
        isOnline: true
      };
      targetDrv = updated;
      return updated;
    }));

    if (targetDrv) {
      setSuccessModalDriver(targetDrv);
      showAdminToastMessage('৩-স্তরের পূর্ণ যাচাইকরণ সম্পন্ন ও চালকের ফোনে নোটিফিকেশন পাঠানো হয়েছে!');

      // Firestore update
      updateDoc(doc(db, 'drivers', driverId), {
        isVerified: true,
        verificationStatus: 'verified',
        licenseVerified: true,
        nidVerified: true,
        phoneVerified: true,
        isOnline: true,
        updatedAt: new Date().toISOString()
      }).catch(err => console.warn('Firestore update error:', err));
    }
  };

  // 3-Pillar Full Approval Handler: Directly execute full approval
  const handleApproveAllDriver = (driverId: string) => {
    handleExecuteFullApproval(driverId);
  };

  // Revoke All Verifications (Set Pending)
  const handleRevokeDriver = (driverId: string) => {
    setDrivers(prev => prev.map(d => 
      d.id === driverId 
        ? { ...d, licenseVerified: false, phoneVerified: false, nidVerified: false, verificationStatus: 'pending' } 
        : d
    ));
    showAdminToastMessage('চালকের সকল অনুমোদন পেন্ডিং করা হয়েছে');

    // Firestore revoke
    updateDoc(doc(db, 'drivers', driverId), {
      isVerified: false,
      verificationStatus: 'pending',
      licenseVerified: false,
      nidVerified: false,
      phoneVerified: false,
      updatedAt: new Date().toISOString()
    }).catch(err => console.warn('Firestore revoke error:', err));
  };

  // Toggle Driver Online Status
  const handleToggleDriverOnline = (driverId: string) => {
    setDrivers(prev => prev.map(d => {
      if (d.id === driverId) {
        const nextOnline = !d.isOnline;
        updateDoc(doc(db, 'drivers', driverId), {
          isOnline: nextOnline,
          updatedAt: new Date().toISOString()
        }).catch(err => console.warn('Firestore driver online toggle error:', err));
        return { ...d, isOnline: nextOnline };
      }
      return d;
    }));
    showAdminToastMessage('চালকের সক্রিয়তা স্ট্যাটাস পরিবর্তন হয়েছে');
  };

  // Delete Driver
  const handleDeleteDriver = (driverId: string, driverName: string) => {
    setDrivers(prev => prev.filter(d => d.id !== driverId));
    try {
      const existingDeleted = JSON.parse(localStorage.getItem('safar_deleted_driver_ids_v1') || '[]');
      if (!existingDeleted.includes(driverId)) {
        existingDeleted.push(driverId);
        localStorage.setItem('safar_deleted_driver_ids_v1', JSON.stringify(existingDeleted));
      }
    } catch {}
    showAdminToastMessage(`চালক '${driverName}' স্থায়ীভাবে রিমুভ করা হয়েছে`);

    // Firestore delete
    deleteDoc(doc(db, 'drivers', driverId)).catch(err => console.warn('Firestore delete error:', err));
  };

  // Direct Driver Add by Admin (Supports custom initial verification state)
  const handleDirectAddDriver = (e: React.FormEvent) => {
    e.preventDefault();
    if (!directDriverForm.name.trim() || !directDriverForm.phone.trim()) {
      showAdminToastMessage('চালকের নাম ও ফোন নম্বর দিন');
      return;
    }

    const catObj = categories.find(c => c.id === directDriverForm.category);
    const targetStand = stands.find(s => s.bengaliName === directDriverForm.standName) || stands[0];
    const isAll3Verified = directDriverForm.licenseVerified && directDriverForm.phoneVerified && directDriverForm.nidVerified;

    const newDriver: Driver = {
      id: `drv-${Date.now()}`,
      name: directDriverForm.name.trim(),
      phone: directDriverForm.phone.trim(),
      category: directDriverForm.category,
      categoryBengali: catObj ? catObj.nameBengali : 'যানবাহন',
      vehicleModel: directDriverForm.vehicleModel.trim() || 'নিবন্ধিত গাড়ি',
      plateNumber: directDriverForm.plateNumber.trim() || '',
      licenseNumber: directDriverForm.licenseNumber.trim() || '',
      firstIssueDate: '',
      licenseType: directDriverForm.licenseType,
      regLastFour: directDriverForm.plateNumber ? directDriverForm.plateNumber.replace(/[^0-9]/g, '').slice(-4) : '',
      manufacturingYear: '',
      chassisNumber: '',
      engineNumber: '',
      taxTokenReceiptPhoto: '',
      driverPhoto: '',
      nidFrontPhoto: '',
      nidBackPhoto: '',
      nidNumber: directDriverForm.nidNumber.trim() || '',
      nidVerified: directDriverForm.nidVerified,
      licenseVerified: directDriverForm.licenseVerified,
      phoneVerified: directDriverForm.phoneVerified,
      verificationStatus: isAll3Verified ? 'verified' : 'pending',
      regAppId: 'SAFAR-ADM-' + Math.floor(1000 + Math.random() * 9000),
      registeredAt: new Date().toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' }),
      standName: targetStand ? targetStand.bengaliName : 'গফরগাঁও রেলওয়ে স্টেশন স্ট্যান্ড',
      lat: targetStand ? targetStand.lat + (Math.random() - 0.5) * 0.005 : 24.4536,
      lng: targetStand ? targetStand.lng + (Math.random() - 0.5) * 0.005 : 90.5479,
      rating: 5.0,
      totalTrips: 1,
      avatarBg: 'bg-emerald-700',
      isOnline: true,
      approxSpeedKmh: 30
    };

    setDrivers(prev => [newDriver, ...prev]);

    // Save directly to Firebase Firestore
    setDoc(doc(db, 'drivers', newDriver.id), {
      ...newDriver,
      nameBn: newDriver.name,
      licensePlate: newDriver.plateNumber,
      isVerified: isAll3Verified,
      updatedAt: new Date().toISOString()
    }).catch(err => console.warn('Firestore direct driver add error:', err));

    setIsDirectDriverModalOpen(false);
    setDirectDriverForm({
      name: '',
      phone: '',
      category: 'cng',
      vehicleModel: '',
      plateNumber: '',
      licenseNumber: '',
      licenseType: 'পেশাদার (Professional)',
      nidNumber: '',
      standName: stands[0]?.bengaliName || 'গফরগাঁও রেলওয়ে স্টেশন স্ট্যান্ড',
      licenseVerified: true,
      phoneVerified: true,
      nidVerified: true
    });
    showAdminToastMessage(`চালক '${newDriver.name}' (${isAll3Verified ? 'সম্পূর্ণ ভেরিফাইড' : 'ভেরিফিকেশন পেন্ডিং'}) সফলভাবে যুক্ত ও লাইভ সেভ হয়েছে!`);
  };

  // Save Hotlines
  const handleSaveHotlines = (e: React.FormEvent) => {
    e.preventDefault();
    setDoc(doc(db, 'hotlines', 'emergency'), {
      ...hotlines,
      updatedAt: new Date().toISOString()
    }, { merge: true }).catch(err => console.warn('Firestore hotlines error:', err));
    showAdminToastMessage('জরুরি হটলাইন নম্বর ফায়ারবেসে সেভ ও লাইভ আপডেট হয়েছে!');
  };

  // Factory Reset to Defaults
  const handleResetToDefaults = () => {
    setStands(GAFARGAON_STANDS);
    setCategories(VEHICLE_CATEGORIES);
    setDrivers(INITIAL_DRIVERS);
    try {
      localStorage.removeItem('safar_stands_v5');
      localStorage.removeItem('safar_categories_v4');
      localStorage.removeItem('safar_drivers_v5');
    } catch {}

    // Synchronize default templates to Firestore
    GAFARGAON_STANDS.forEach(s => {
      setDoc(doc(db, 'stands', s.id), { ...s, updatedAt: new Date().toISOString() }).catch(() => {});
    });
    VEHICLE_CATEGORIES.forEach(c => {
      setDoc(doc(db, 'categories', c.id), { ...c, updatedAt: new Date().toISOString() }).catch(() => {});
    });
    INITIAL_DRIVERS.forEach(d => {
      setDoc(doc(db, 'drivers', d.id), { ...d, updatedAt: new Date().toISOString() }).catch(() => {});
    });

    showAdminToastMessage('সকল স্ট্যান্ড, ক্যাটাগরি ও চালকের ডেটা ডিফল্টে রিস্টোর ও অনলাইনে সিঙ্ক হয়েছে!');
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col selection:bg-emerald-600 selection:text-white font-['Hind_Siliguri',sans-serif]">
      {/* App Launch Splash Screen (Matching IMG-13 with centered logo & Arabic Dua) */}
      {showAppSplash && (
        <SplashScreen onFinish={() => setShowAppSplash(false)} durationMs={3000} />
      )}

      {/* PWA 1-Tap Mobile Install Banner & Viral Share Modal */}
      <PWAInstallBanner customAppUrl={appCustomSettings.customAppUrl} />
      
      {/* ============================================================== */}
      {/* 1. TOP HEADER (BRANDING & DRIVER REGISTRATION BUTTON)           */}
      {/* ============================================================== */}
      <header className="bg-emerald-700 text-white shadow-md sticky top-0 z-40 border-b border-emerald-800">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-2">
          <div className="flex items-center justify-between gap-2">
            
            {/* SAFAR LOGO & BRANDING */}
            <div 
              onClick={() => { handleResetToHomePage(); handleSecretAdminTrigger(); }} 
              className="flex items-center gap-2.5 sm:gap-3 cursor-pointer select-none min-w-0 group"
              title="সফর হোম পেজ"
            >
              {/* Bengali 'স' Highway Road Emblem with Map Pin & 'সফর' underneath */}
              <SafarLogo size="md" showSubtitle={false} />

              {/* Title Block - Top aligned flush with S logo, padding reduced, gap to subtitle preserved */}
              <div className="hidden sm:flex flex-col items-start justify-between min-h-[36px] sm:min-h-[44px] py-0 min-w-0">
                <div className="flex items-center gap-1.5 leading-none">
                  <span className="bg-emerald-900/95 border border-emerald-400/70 rounded px-1.5 py-0 text-sm sm:text-base md:text-lg font-black text-white leading-none tracking-wide shadow-xs inline-flex items-center group-hover:bg-emerald-950 transition-colors">
                    সফর
                  </span>
                  <span className="text-[11px] sm:text-sm font-bold text-emerald-100 hidden xs:inline leading-none">
                    গফরগাঁও
                  </span>
                </div>
                <span className="text-[10px] sm:text-[12px] font-medium text-emerald-100 tracking-normal leading-tight mt-auto pt-1 truncate">
                  স্মার্ট ট্রান্সপোর্ট ও ইমার্জেন্সি সার্ভিস
                </span>
              </div>
            </div>

            {/* Right Action: Role Switcher (Passenger vs Driver), Trip History, Guide & Driver Registration */}
            <div className="flex items-center gap-1 sm:gap-2 shrink-0">
              
              {/* Role Toggle: Passenger vs Driver (Crystal Clear on Mobile) */}
              <div 
                className="flex items-center bg-emerald-950/80 p-0.5 rounded-lg border border-emerald-400/50 shadow-inner shrink-0"
                title="ভূমিকা নির্বাচন: যাত্রী বা চালক হিসেবে ব্যবহার করুন"
              >
                <button
                  type="button"
                  onClick={() => setUserRole('passenger')}
                  className={`flex items-center gap-1.5 px-2 sm:px-3 py-1 rounded-md text-[11px] sm:text-xs font-bold transition-all cursor-pointer ${
                    userRole === 'passenger'
                      ? 'bg-white text-emerald-950 shadow-xs ring-1 ring-emerald-400 font-black'
                      : 'text-emerald-100 hover:text-white hover:bg-emerald-900/60'
                  }`}
                >
                  <User className={`w-3.5 h-3.5 ${userRole === 'passenger' ? 'text-emerald-700' : 'text-emerald-200'}`} />
                  <span>যাত্রী</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setUserRole('driver');
                    sounds.unlockAudio();
                    highPriorityNotifications.requestPermission().catch(() => {});
                  }}
                  className={`flex items-center gap-1.5 px-2 sm:px-3 py-1 rounded-md text-[11px] sm:text-xs font-bold transition-all cursor-pointer ${
                    userRole === 'driver'
                      ? 'bg-amber-400 text-slate-950 shadow-xs ring-1 ring-amber-500 font-black'
                      : 'text-emerald-100 hover:text-white hover:bg-emerald-900/60'
                  }`}
                >
                  <Car className={`w-3.5 h-3.5 ${userRole === 'driver' ? 'text-slate-950' : 'text-emerald-200'}`} />
                  <span>চালক</span>
                </button>
              </div>

              {/* Passenger History & Account Button */}
              <button
                type="button"
                onClick={() => {
                  setPassengerTab(passengerProfile.isLoggedIn ? 'history' : 'profile');
                  setShowPassengerModal(true);
                }}
                className="inline-flex items-center gap-1 bg-emerald-850 hover:bg-emerald-900 bg-emerald-900/80 text-white font-bold px-1.5 py-1 sm:px-2.5 sm:py-1.5 rounded-lg text-[10px] sm:text-xs border border-emerald-400/50 shadow-xs cursor-pointer transition-all active:scale-95"
                title="পূর্বের যাত্রার ইতিহাস ও অ্যাকাউন্ট"
              >
                <History className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                <span className="hidden xs:inline">যাত্রার ইতিহাস</span>
                <span className="bg-amber-400 text-slate-950 text-[9px] font-black px-1 sm:px-1.5 py-0.2 rounded-full">
                  {tripHistory.length}
                </span>
              </button>

              {/* Guide / How it Works button */}
              <button
                type="button"
                onClick={() => setShowRoleGuideModal(true)}
                className="bg-emerald-800/90 hover:bg-emerald-900 text-white p-1 sm:px-2 sm:py-1 rounded-lg text-xs font-semibold border border-emerald-500/40 cursor-pointer flex items-center gap-1 transition-all"
                title="কে কাকে কল ও কনফার্ম করবে নিয়মাবলী দেখুন"
              >
                <HelpCircle className="w-3.5 h-3.5 text-amber-300" />
                <span className="hidden md:inline text-[11px]">নিয়মাবলী</span>
              </button>

              {/* Driver Registration Button */}
              <button
                type="button"
                onClick={() => setIsRegisterModalOpen(true)}
                className="inline-flex items-center gap-1 bg-white hover:bg-emerald-50 text-emerald-800 font-bold px-2 py-1 sm:px-3 sm:py-1.5 rounded-lg text-[10px] sm:text-xs shadow-md transition-all border border-emerald-300 active:scale-95 cursor-pointer"
              >
                <IdCard className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span className="hidden xs:inline">চালক নিবন্ধন</span>
                <span className="xs:hidden">নিবন্ধন</span>
              </button>
            </div>

          </div>
        </div>
      </header>

      {/* ============================================================== */}
      {/* 1.1 DYNAMIC SCROLLING MARQUEE NOTICE (ADMIN ANNOUNCEMENT)      */}
      {/* ============================================================== */}
      {appCustomSettings.announcementNotice && appCustomSettings.announcementNotice.trim() !== '' && (
        <section className="bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 text-slate-950 border-b border-amber-600/30 py-1.5 px-3 sm:px-4 shadow-xs relative overflow-hidden z-30">
          <div className="max-w-7xl mx-auto flex items-center gap-2">
            <div className="flex items-center gap-1 bg-slate-950 text-amber-300 text-[10px] sm:text-[11px] font-black px-2 py-0.5 rounded-full shrink-0 shadow-xs uppercase tracking-wider">
              <Sparkles className="w-3 h-3 text-amber-400 animate-spin" />
              <span>জরুরি ঘোষণা</span>
            </div>
            <div className="flex-1 overflow-hidden relative">
              <AutoMarqueeText 
                text={appCustomSettings.announcementNotice} 
                speed={36} 
                className="text-xs sm:text-sm font-bold text-slate-950" 
              />
            </div>
          </div>
        </section>
      )}

      {/* ============================================================== */}
      {/* 2. DUAL DROPDOWNS: EMERGENCY HOTLINES (50%) & TRAVEL DUAS (50%) */}
      {/* ============================================================== */}
      {appCustomSettings.showHotlineTicker && (
        <section className="bg-slate-100/95 border-b border-slate-200/90 py-1.5 px-3 sm:px-4 lg:px-6 shadow-2xs">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-stretch md:items-center gap-2 md:gap-3.5">
            {/* On mobile: "সফরের দো'আ" is on TOP (order-1), "জরুরি হটলাইন" is on BOTTOM (order-2) */}
            {/* On desktop: "জরুরি হটলাইন" is on LEFT 50% (md:order-1), "সফরের দো'আ" is on RIGHT 50% (md:order-2) */}
            <div className="w-full md:w-1/2 order-2 md:order-1">
              <EmergencyHotlineDropdown
                contacts={emergencyContacts}
                onOpenDirectory={() => setShowEmergencyDirectory(true)}
              />
            </div>
            <div className="w-full md:w-1/2 order-1 md:order-2">
              <TravelDuaDropdown />
            </div>
          </div>
        </section>
      )}

      {/* ============================================================== */}
      {/* 3. STAND SELECTION & SEARCH BAR (PASSENGER MODE ONLY)          */}
      {/* ============================================================== */}
      {userRole === 'passenger' && (
        <section className="bg-white border-b border-slate-200 py-2 shadow-xs">
          <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
            
            {/* STAND SELECTION (SIDE-BY-SIDE LEFT) - Stylish look matching Safar Dua & Hotline UI */}
            <div className="w-full sm:w-[45%] md:w-[40%] shrink-0">
              <StandDropdown
                stands={stands}
                selectedStand={selectedStand}
                onSelectStand={(val) => setSelectedStand(val)}
                totalDriversCount={drivers.length}
                getStandDriverCount={getStandDriverCount}
              />
            </div>

            {/* SEARCH BAR (SIDE-BY-SIDE RIGHT) - Instant 1-2 Letter Auto-Suggestion for Drivers, Vehicles, License, Stands, Places */}
            <div className="w-full flex-1">
              <DriverSearchAutocomplete
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                drivers={drivers}
                stands={stands}
                places={allAutocompletePlaces}
                onSelectStand={(standName) => setSelectedStand(standName)}
                onSelectCategory={(catId) => setSelectedCategory(catId)}
              />
            </div>

          </div>

          {/* Horizontal Stand Buttons for Instant 1-Tap Switching (Dynamic Synchronized Driver Counts) */}
          <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 flex items-center gap-1.5 overflow-x-auto pt-1.5 scrollbar-thin">
            <button
              type="button"
              onClick={() => setSelectedStand('all')}
              className={`px-2 py-0.5 rounded-md text-[10px] sm:text-[11px] font-bold shrink-0 transition-all cursor-pointer flex items-center gap-1 ${
                selectedStand === 'all'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
              }`}
            >
              <span>সকল স্ট্যান্ড</span>
              <span className={`text-[9px] px-1 rounded-full ${
                selectedStand === 'all' ? 'bg-emerald-800 text-emerald-100' : 'bg-slate-200 text-slate-600'
              }`}>
                {drivers.length}
              </span>
            </button>
            {stands.map((stand) => {
              const isStandSelected = selectedStand === stand.bengaliName;
              const count = getStandDriverCount(stand.bengaliName);
              return (
                <button
                  key={stand.id}
                  type="button"
                  onClick={() => setSelectedStand(stand.bengaliName)}
                  className={`px-2 py-0.5 rounded-md text-[10px] sm:text-[11px] font-bold shrink-0 transition-all cursor-pointer flex items-center gap-1 ${
                    isStandSelected
                      ? 'bg-emerald-700 text-white shadow-xs'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                  }`}
                >
                  <span className="truncate max-w-[125px]">{stand.bengaliName.replace(' স্ট্যান্ড', '')}</span>
                  <span className={`text-[9px] px-1 rounded-full ${
                    isStandSelected ? 'bg-emerald-800 text-emerald-100' : 'bg-slate-200 text-slate-600'
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* ============================================================== */}
      {/* ACTIVE PASSENGER BOOKING BANNER (MUTUAL LIVE TRACKING & ETA)   */}
      {/* ============================================================== */}
      {/* ============================================================== */}
      {/* ACTIVE PASSENGER BOOKING BANNER (REALISTIC LIVE TRIP COCKPIT)  */}
      {/* ============================================================== */}
      {/* ============================================================== */}
      {/* 4. MAIN WORKSPACE: PASSENGER HUB / DRIVER COCKPIT + MAP        */}
      {/* ============================================================== */}
      <main className="flex-1">

        {/* PASSENGER REAL-TIME RIDE COCKPIT */}
        {userRole === 'passenger' && (
          <div id="passenger-ride-cockpit-section" className="max-w-7xl mx-auto w-full px-3 sm:px-4 lg:px-6 pt-3 pb-1 scroll-mt-20">
            <PassengerRideCockpit
              request={passengerPendingRequest}
              activeBooking={activeBooking}
              onCancelRequest={handleCancelPassengerPendingRequest}
              onCancelBooking={handleCancelBooking}
              onStartRide={() => {
                if (activeBooking) {
                  const currentLat = (liveGps.lat && liveGps.lng && liveGps.isTracking)
                    ? liveGps.lat
                    : (activeBooking.passengerLat || pickupCoords?.lat || 24.4335);
                  const currentLng = (liveGps.lat && liveGps.lng && liveGps.isTracking)
                    ? liveGps.lng
                    : (activeBooking.passengerLng || pickupCoords?.lng || 90.5512);

                  setActiveBooking({
                    ...activeBooking,
                    status: 'in_transit',
                    currentDriverLat: currentLat,
                    currentDriverLng: currentLng
                  });
                  const bId = (activeBooking as any).requestId || (activeBooking as any).id;
                  if (bId) {
                    updateDoc(doc(db, 'ride_requests', bId), {
                      status: 'in_transit',
                      driverLat: currentLat,
                      driverLng: currentLng,
                      boardedAt: new Date().toISOString()
                    }).catch(() => {});
                  }
                  showAdminToastMessage('গাড়িতে ওঠা সম্পন্ন হয়েছে — গন্তব্যের দিকে যাত্রা শুরু!');
                }
              }}
              onCompleteRide={(fare) => {
                if (activeBooking) {
                  const reqId = (activeBooking as any).requestId || activeBooking.id || `trip-${Date.now()}`;
                  const tripDocId = `trip-${reqId}`;
                  const matchedDriver = drivers.find(d => d.id === activeBooking.driver.id) || activeBooking.driver;
                  const finalFare = (fare && fare > 0) ? fare : (activeBooking.fare || 40);
                  const newTripRecord: PassengerTripRecord = {
                    id: tripDocId,
                    date: 'আজ, ' + new Date().toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' }),
                    pickupPoint: activeBooking.pickupTitle || passengerPickup || 'শুরুর স্থান',
                    destination: activeBooking.destTitle || passengerDestination || 'গন্তব্য স্থান',
                    driverName: matchedDriver.name || activeBooking.driver.name,
                    driverPhone: matchedDriver.phone || activeBooking.driver.phone,
                    vehicleCategory: matchedDriver.category || activeBooking.driver.category,
                    vehicleModel: matchedDriver.vehicleModel || activeBooking.driver.vehicleModel,
                    plateNumber: matchedDriver.plateNumber || activeBooking.driver.plateNumber,
                    fare: finalFare,
                    status: 'সম্পন্ন',
                    ratingGiven: 5.0
                  };
                  (newTripRecord as any).requestId = reqId;

                  setTripHistory(prev => {
                    if (prev.some(t => t.id === tripDocId || (t as any).requestId === reqId)) {
                      return prev;
                    }
                    return [newTripRecord, ...prev];
                  });

                  if (passengerProfile.phone) {
                    setDoc(doc(db, 'users', passengerProfile.phone, 'trips', newTripRecord.id), {
                      ...newTripRecord,
                      createdAt: new Date().toISOString()
                    }).catch(() => {});
                  }

                  // Also notify Firestore so driver's dashboard marks it completed
                  if (reqId) {
                    updateDoc(doc(db, 'ride_requests', reqId), {
                      status: 'completed',
                      completedAt: new Date().toISOString()
                    }).catch(() => {});
                  }

                  showAdminToastMessage(`ট্রিপ সম্পন্ন হয়েছে! নির্ধারিত ভাড়া: ৳ ${finalFare}`);
                }
              }}
              onSubmitReview={(driverId, rating) => {
                setDrivers(prev => prev.map(d => {
                  if (d.id === driverId) {
                    const newTotal = (d.totalTrips || 10) + 1;
                    const newRating = Number(((d.rating * (newTotal - 1) + rating) / newTotal).toFixed(1));
                    return { ...d, rating: newRating, totalTrips: newTotal };
                  }
                  return d;
                }));
                setActiveBooking(null);
                setPickupCoords(null);
                setDestCoords(null);
                setPassengerPickup('');
                setPassengerDestination('');
                try {
                  localStorage.removeItem('safar_active_booking_v2');
                  localStorage.removeItem('safar_my_ride_request_id');
                } catch {}
                showAdminToastMessage('আপনার মূল্যবান ৫-স্টার রিভিউ ও রেটিং জমা নেওয়া হয়েছে!');
              }}
              onDismissCockpit={() => {
                setActiveBooking(null);
                setPickupCoords(null);
                setDestCoords(null);
                setPassengerPickup('');
                setPassengerDestination('');
                try {
                  localStorage.removeItem('safar_active_booking_v2');
                  localStorage.removeItem('safar_my_ride_request_id');
                } catch {}
              }}
              onFocusMap={() => {
                const mapEl = document.getElementById('safar-live-map-section');
                if (mapEl) mapEl.scrollIntoView({ behavior: 'smooth' });
                showAdminToastMessage('ম্যাপে চালকের লাইভ অবস্থান ফোকাস করা হয়েছে');
              }}
              categoryBengaliName={categories.find(c => c.id === (passengerPendingRequest?.category || activeBooking?.driver.category))?.nameBengali || 'অটো'}
            />
          </div>
        )}

        {/* SPECIAL FLOATING SCREEN-OPEN NOTIFICATION POPUP ONLY WHEN IN PASSENGER MODE */}
        {userRole === 'passenger' && activeIncomingRideForDriver && showScreenOpenPopup && (
          <DriverScreenOpenNotificationPopup
            request={activeIncomingRideForDriver}
            onOpenDashboard={() => {
              setUserRole('driver');
              setShowScreenOpenPopup(false);
              setSkipVoiceForCurrentAlert(true);
              window.scrollTo({ top: 120, behavior: 'smooth' });
            }}
            onAccept={(reqId) => {
              setDismissedAlertIds(prev => ({ ...prev, [reqId]: true }));
              sounds.stopAllAlarms();
              highPriorityNotifications.clearIncomingRideAlert();
              setShowScreenOpenPopup(false);
              setSkipVoiceForCurrentAlert(false);
              handleDriverAcceptRequest(reqId);
            }}
            onDecline={(reqId) => {
              setDismissedAlertIds(prev => ({ ...prev, [reqId]: true }));
              sounds.stopAllAlarms();
              highPriorityNotifications.clearIncomingRideAlert();
              setShowScreenOpenPopup(false);
              setSkipVoiceForCurrentAlert(false);
              showAdminToastMessage('অনুরোধটি আপনার স্ক্রিন থেকে সরানো হয়েছে');
            }}
          />
        )}

        {/* DRIVER INCOMING RIDE REQUEST FULL COCKPIT CARD */}
        {userRole === 'driver' && activeIncomingRideForDriver && (
          <DriverIncomingAlert
            key={activeIncomingRideForDriver.id}
            request={activeIncomingRideForDriver}
            skipVoiceAnnouncement={skipVoiceForCurrentAlert}
            onAccept={(reqId) => {
              setDismissedAlertIds(prev => ({ ...prev, [reqId]: true }));
              sounds.stopAllAlarms();
              highPriorityNotifications.clearIncomingRideAlert();
              setShowScreenOpenPopup(false);
              setSkipVoiceForCurrentAlert(false);
              handleDriverAcceptRequest(reqId);
            }}
            onDecline={(reqId) => {
              setDismissedAlertIds(prev => ({ ...prev, [reqId]: true }));
              sounds.stopAllAlarms();
              highPriorityNotifications.clearIncomingRideAlert();
              setShowScreenOpenPopup(false);
              setSkipVoiceForCurrentAlert(false);
              showAdminToastMessage('অনুরোধটি আপনার স্ক্রিন থেকে সরানো হয়েছে');
            }}
          />
        )}

        {/* ============================================================== */}
        {/* PASSENGER RIDE PLANNER & BOOKING HUB (SHOWN IN PASSENGER MODE) */}
        {/* ============================================================== */}
        {userRole === 'passenger' && (
          <section className="max-w-7xl mx-auto w-full px-3 sm:px-4 lg:px-6 pt-1 pb-1 animate-in fade-in">

            {/* Ride Planner Card */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-3 sm:p-4 mb-2.5 relative overflow-hidden">
              {/* Card Header */}
              <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-100 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                    <Navigation className="w-4 h-4 text-emerald-700" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-xs sm:text-sm md:text-base font-extrabold text-slate-900 leading-tight">
                        কোথায় যাবেন? যাত্রা পরিকল্পনা ও ভাড়ার হিসাব
                      </h2>
                      <span className="hidden sm:inline-block bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-black px-1.5 py-0.2 rounded">
                        লাইভ রেট
                      </span>
                    </div>
                    <p className="text-[10px] sm:text-[11px] text-slate-500">
                      শুরুর অবস্থান ও গন্তব্য বেছে নিন—স্বয়ংক্রিয় দূরত্ব ও সরকার নির্ধারিত সুলভ ভাড়া দেখুন
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setIsRidePlannerCollapsed(!isRidePlannerCollapsed)}
                    className="text-[11px] font-bold text-slate-600 hover:text-emerald-700 px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer transition-colors"
                  >
                    {isRidePlannerCollapsed ? 'বুকিং প্যানেল খুলুন ▼' : 'সংক্ষেপ করুন ▲'}
                  </button>
                </div>
              </div>

              {!isRidePlannerCollapsed && (
                <div className="space-y-3">
                  {/* Route Selector: Pickup & Destination with Autocomplete & Swap Button */}
                  <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] items-center gap-2 bg-slate-50 p-2.5 sm:p-3 rounded-xl border border-slate-200">
                    
                    <div className="flex flex-col min-w-0">
                      <LocationAutocomplete
                        label="শুরুর অবস্থান (পিকআপ):"
                        isPickup={true}
                        value={passengerPickup}
                        places={allAutocompletePlaces}
                        isGpsActive={liveGps.isTracking || isLiveLocationQuery(passengerPickup)}
                        userGps={liveGps}
                        onLocateGps={() => {
                          startGpsTracking();
                          const handleLocated = (lat: number, lng: number, accuracy: number) => {
                            setPassengerLocation({ lat, lng, isLiveGps: true });
                            setPickupCoords({ lat, lng });
                            const nearest = findNearestLandmark(lat, lng);
                            if (nearest.distanceMeters < 50) {
                              setPassengerPickup(nearest.name);
                              setPassengerPickupLandmark('');
                              showAdminToastMessage(`📍 অবস্থান: ${nearest.name} (সঠিকতা: ±${Math.round(accuracy)} মি.)`);
                            } else {
                              setPassengerPickup('আমার লাইভ অবস্থান (GPS)');
                              const landmarkText = `${nearest.name} (থেকে ~${toBengaliNumber(nearest.distanceMeters)} মিটার দূরে)`;
                              setPassengerPickupLandmark(landmarkText);
                              showAdminToastMessage(`📍 লাইভ GPS অবস্থান চিহ্নিত • ২য় অপশন: ${nearest.name} (~${nearest.distanceMeters} মি.)`);
                            }
                          };

                          if (liveGps.lat && liveGps.lng) {
                            handleLocated(liveGps.lat, liveGps.lng, liveGps.accuracy || 10);
                            return;
                          }
                          if ('geolocation' in navigator) {
                            navigator.geolocation.getCurrentPosition(
                              (pos) => {
                                handleLocated(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy || 10);
                              },
                              () => {
                                showAdminToastMessage('GPS লোকেশন পাওয়া যায়নি, ম্যানুয়ালি বাছুন');
                              },
                              { enableHighAccuracy: true, timeout: 8000 }
                            );
                          }
                        }}
                        onChangeLocation={(name, coords) => {
                          setPassengerPickup(name);
                          if (coords) {
                            setPickupCoords(coords);
                            const nearest = findNearestLandmark(coords.lat, coords.lng);
                            if (nearest.distanceMeters > 50) {
                              setPassengerPickupLandmark(`${nearest.name} (থেকে ~${toBengaliNumber(nearest.distanceMeters)} মিটার দূরে)`);
                            } else {
                              setPassengerPickupLandmark('');
                            }
                          } else {
                            setPassengerPickupLandmark('');
                          }
                          if (isLiveLocationQuery(name)) {
                            startGpsTracking();
                          }
                        }}
                        placeholder="পিকআপ স্ট্যান্ড বা এলাকা খুঁজুন..."
                      />

                      {/* 2nd Option: Nearest Known Landmark Reference Banner */}
                      {passengerPickupLandmark && (
                        <div className="mt-1 flex items-center gap-1.5 text-[10.5px] bg-emerald-50 text-emerald-900 border border-emerald-200/90 px-2 py-0.5 rounded-lg overflow-hidden min-w-0 animate-in fade-in">
                          <span className="shrink-0 font-extrabold text-[9px] bg-emerald-200/80 text-emerald-950 px-1 rounded">২য় পরিচিত রেফারেন্স:</span>
                          <div className="min-w-0 flex-1 overflow-hidden">
                            <PauseMarqueeText text={passengerPickupLandmark} className="text-[10.5px] font-bold text-emerald-900" pauseSec={1.5} />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* SWAP BUTTON */}
                    <div className="flex justify-center md:pt-4">
                      <button
                        type="button"
                        onClick={handleSwapLocations}
                        className="p-2 rounded-xl bg-white hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 border border-slate-200 shadow-xs cursor-pointer transition-all active:rotate-180"
                        title="পিকআপ ও গন্তব্য অদল-বদল করুন"
                      >
                        <ArrowUpDown className="w-4 h-4" />
                      </button>
                    </div>

                    {/* DESTINATION POINT WITH AUTOCOMPLETE */}
                    <LocationAutocomplete
                      label="কোথায় যাবেন (গন্তব্য স্থল):"
                      isPickup={false}
                      value={passengerDestination}
                      places={allAutocompletePlaces}
                      userGps={liveGps}
                      onChangeLocation={(name, coords) => {
                        setPassengerDestination(name);
                        if (coords) {
                          setDestCoords(coords);
                        }
                      }}
                      placeholder="গন্তব্য স্থান, মোড় বা বাজার খুঁজুন..."
                    />

                  </div>

                  {/* Side-by-Side (50:50)% Layout: দ্রুত গন্তব্য (Left) & যানবাহন ও ভাড়ার তালিকা (Right) */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 my-3">
                    
                    {/* LEFT COLUMN: দ্রুত গন্তব্য (১৫ ইউনিয়ন ড্রপডাউন, সাব-মেনু ও পজ-মার্কি টেক্সট) */}
                    <UnionQuickDestinations
                      isOpen={isQuickDestOpen}
                      onToggle={() => setIsQuickDestOpen(!isQuickDestOpen)}
                      selectedDestination={passengerDestination}
                      onSelectDestination={(dest, coords) => {
                        setPassengerDestination(dest);
                        if (coords) {
                          setDestCoords(coords);
                        } else {
                          const resolved = resolveLocationCoordinates(dest, true);
                          setDestCoords(resolved);
                        }
                      }}
                      customQuickDestinations={appCustomSettings.quickDestinations}
                      allPlaces={allAutocompletePlaces}
                    />

                    {/* RIGHT COLUMN: যানবাহন ও ভাড়ার তালিকা (50% desktop, 100% mobile) with Dropdown & Scroll */}
                    <div className="w-full bg-slate-50/90 rounded-2xl border border-amber-200/90 shadow-xs overflow-hidden flex flex-col">
                      {/* Dropdown Header Bar (styled like সফরের দো'আ) */}
                      <button
                        type="button"
                        onClick={() => setIsVehicleFareOpen(!isVehicleFareOpen)}
                        aria-expanded={isVehicleFareOpen}
                        className="w-full flex items-center justify-between gap-2 px-3.5 py-2.5 bg-gradient-to-r from-amber-50 via-orange-50 to-amber-100/90 hover:from-amber-100 hover:to-orange-100 border-b border-amber-200/80 transition-all cursor-pointer text-left select-none group"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-7 h-7 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center shrink-0 shadow-xs group-hover:bg-amber-600 transition">
                            <Car className="w-4 h-4 text-slate-950" />
                          </span>
                          <div className="min-w-0 flex-1 overflow-hidden">
                            <PauseMarqueeText
                              text="যানবাহন ও ভাড়ার তালিকা"
                              className="font-extrabold text-xs sm:text-sm text-amber-950 block leading-tight"
                              pauseSec={1.5}
                            />
                            <PauseMarqueeText
                              text="বাহন অনুযায়ী নির্ধারিত ভাড়ার রেট"
                              className="text-[10px] text-amber-800 font-semibold block leading-tight mt-0.5"
                              pauseSec={1.5}
                            />
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="px-2 py-0.5 rounded-full bg-amber-200 text-amber-950 text-[10px] font-bold">
                            {categories.find(c => c.id === passengerSelectedVehicle)?.nameBengali || 'সিএনজি'} • ৳{calculatedFare}
                          </span>
                          <span className={`w-5 h-5 rounded-full bg-white border border-amber-300 flex items-center justify-center text-amber-800 transition-transform duration-200 ${isVehicleFareOpen ? 'rotate-180 bg-amber-500 text-slate-950 border-amber-500' : ''}`}>
                            <ChevronDown className="w-3.5 h-3.5" />
                          </span>
                        </div>
                      </button>

                      {/* Dropdown Content with Scroll Option */}
                      {isVehicleFareOpen && (
                        <div className="p-3 animate-in fade-in slide-in-from-top-1 duration-200">
                          <div className="h-[250px] overflow-y-auto scrollbar-thin pr-1 space-y-1.5">
                            {categories.filter(c => c.id !== 'all').map((cat) => {
                              const isSelected = passengerSelectedVehicle === cat.id;
                              const fare = calculateFareForCategory(cat.id, calculatedDistance);
                              const driverCount = drivers.filter(d => d.category === cat.id).length;

                              return (
                                <button
                                  key={cat.id}
                                  type="button"
                                  onClick={() => {
                                    setPassengerSelectedVehicle(cat.id);
                                    setSelectedCategory(cat.id);
                                    setIsVehicleFareOpen(false); // Fold on selection
                                  }}
                                  className={`w-full flex items-center justify-between p-2 rounded-xl border text-left transition-all cursor-pointer ${
                                    isSelected
                                      ? 'bg-amber-100/90 border-amber-500 shadow-xs ring-2 ring-amber-400'
                                      : 'bg-white hover:bg-amber-50/60 border-slate-200'
                                  }`}
                                >
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <div className="shrink-0">
                                      <CategoryBadgeLogo category={cat.id} size="sm" />
                                    </div>
                                    <div className="truncate">
                                      <div className="flex items-center gap-1.5">
                                        <span className={`text-xs font-black block truncate ${
                                          isSelected ? 'text-amber-950' : 'text-slate-800'
                                        }`}>
                                          {cat.nameBengali}
                                        </span>
                                        {cat.isEmergency && (
                                          <span className="text-[9px] bg-red-100 text-red-700 font-bold px-1.5 py-0.2 rounded">
                                            জরুরি
                                          </span>
                                        )}
                                      </div>
                                      <span className="text-[10px] text-slate-500 block">
                                        বেস ৳{cat.baseFare} • কিমি ৳{cat.perKmFare} ({driverCount} চালক)
                                      </span>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-2 shrink-0">
                                    <span className="text-xs font-black text-amber-900 bg-amber-200/90 px-2 py-0.5 rounded-lg shadow-2xs">
                                      {cat.isFree ? 'ফ্রি সেবা' : `৳ ${fare}`}
                                    </span>
                                    {isSelected && (
                                      <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                                    )}
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>

                  </div>

                  {/* Live Fare Summary & Action Bar */}
                  <div className="bg-gradient-to-r from-emerald-900 to-slate-900 text-white p-3 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
                    <div className="flex items-center gap-3 flex-wrap">
                      <div className="flex items-center gap-1.5 text-xs text-emerald-100">
                        <Navigation className="w-3.5 h-3.5 text-emerald-400" />
                        <span>
                          দূরত্ব: <b className="text-white font-extrabold">{toBengaliNumber(calculatedDistance)} কিমি</b>
                          <span className="text-[10px] text-emerald-300 ml-1 font-semibold">({calculatedDistance} km)</span>
                        </span>
                      </div>
                      <span className="text-slate-500 hidden sm:inline">•</span>
                      <div className="flex items-center gap-1.5 text-xs text-emerald-100">
                        <Clock className="w-3.5 h-3.5 text-amber-300" />
                        <span>আনুমানিক সময়: <b className="text-yellow-300 font-extrabold">~{toBengaliNumber(calculatedDurationMinutes)} মিনিট</b></span>
                      </div>
                      <span className="text-slate-500 hidden sm:inline">•</span>
                      <div className="flex items-center gap-1 text-xs">
                        <span className="text-emerald-200">নির্ধারিত ভাড়া:</span>
                        <span className="text-base sm:text-lg font-black text-amber-300">
                          ৳ {toBengaliNumber(calculatedFare)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={handlePassengerCreateRideRequest}
                        className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black px-4 py-2 rounded-xl text-xs sm:text-sm shadow-md transition-all active:scale-95 cursor-pointer"
                      >
                        <Send className="w-4 h-4 text-slate-950" />
                        <span>যাত্রার অনুরোধ পাঠান (৳ {calculatedFare})</span>
                      </button>
                    </div>
                  </div>

                </div>
              )}
            </div>
          </section>
        )}

        {/* ============================================================== */}
        {/* DRIVER COCKPIT WORKSPACE (SHOWN WHEN USERROLE === 'DRIVER')     */}
        {/* ============================================================== */}
        {userRole === 'driver' && (
          <section className="max-w-7xl mx-auto w-full px-3 sm:px-4 lg:px-6 pt-3 pb-2 animate-in fade-in">
            {!driverProfile.isRegistered || !driverProfile.phone ? (
              /* UNREGISTERED DRIVER ONBOARDING & LOGIN PROMPT */
              <div className="bg-gradient-to-br from-amber-50 via-white to-amber-100/70 rounded-3xl border-2 border-amber-300 p-5 sm:p-8 shadow-lg max-w-2xl mx-auto my-4 text-center space-y-5 animate-in fade-in">
                <div className="w-16 h-16 mx-auto rounded-3xl bg-amber-500 text-slate-950 flex items-center justify-center font-black shadow-md">
                  <Car className="w-8 h-8" />
                </div>
                <div>
                  <span className="bg-amber-200 text-amber-950 text-[11px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider">
                    সফর চালক কন্ট্রোল হাব
                  </span>
                  <h2 className="text-lg sm:text-xl font-black text-slate-900 mt-2">
                    আপনি এখনও চালক হিসেবে নিবন্ধিত নন
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto mt-1.5 leading-relaxed">
                    গফরগাঁও সফর ডিজিটাল নেটওয়ার্কে গাড়ি চালিয়ে আয় করতে এবং সরাসরি যাত্রীদের ট্রিপ কল পেতে বিআরটিএ ড্রাইভিং লাইসেন্স ও জাতীয় পরিচয়পত্র দিয়ে নিবন্ধন সম্পন্ন করুন।
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setRegisterModalTab('register');
                      setIsRegisterModalOpen(true);
                    }}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold px-6 py-3 rounded-xl text-sm shadow-md transition-all cursor-pointer active:scale-95"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>এখনই চালক নিবন্ধন করুন</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setUserRole('passenger')}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-white hover:bg-slate-100 text-slate-700 font-bold px-4 py-3 rounded-xl text-sm border border-slate-300 shadow-xs transition-all cursor-pointer"
                  >
                    <User className="w-3.5 h-3.5 text-emerald-700" />
                    <span>যাত্রী মোডে ফিরে যান</span>
                  </button>
                </div>

                {/* Inline Login for Already Registered Drivers (Phone + 4-Digit PIN or Instant OTP) */}
                <div className="pt-4 border-t border-amber-200/80 text-left max-w-md mx-auto">
                  <span className="text-xs font-bold text-slate-800 block mb-1.5">
                    ইতিমধ্যে নিবন্ধিত চালক? আপনার নম্বর ও পিন দিয়ে ড্যাশবোর্ড খুলুন:
                  </span>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleDriverLogin(driverLoginPhoneInput, driverLoginPinInput);
                    }}
                    className="space-y-2"
                  >
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        type="tel"
                        value={driverLoginPhoneInput}
                        onChange={(e) => {
                          setDriverLoginPhoneInput(e.target.value);
                          setDriverLoginError(null);
                        }}
                        placeholder="মোবাইল নম্বর (যেমন: ০১৭২২-৪৫৬৭৮৯)"
                        className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 font-bold"
                        required
                      />
                      <input
                        type="password"
                        maxLength={6}
                        value={driverLoginPinInput}
                        onChange={(e) => {
                          setDriverLoginPinInput(e.target.value);
                          setDriverLoginError(null);
                        }}
                        placeholder="৪-ডিজিট পিন *"
                        className="w-full sm:w-32 px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono font-bold"
                        required
                      />
                      <button
                        type="submit"
                        className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-black px-4 py-2 rounded-xl text-xs shadow-xs cursor-pointer transition shrink-0"
                      >
                        লগইন করুন
                      </button>
                    </div>
                    <div className="flex items-center justify-between pt-0.5">
                      <button
                        type="button"
                        onClick={() => handleTriggerInstantOtp('driver', driverLoginPhoneInput)}
                        className="text-emerald-700 hover:text-emerald-900 text-[11px] font-extrabold flex items-center gap-1 cursor-pointer hover:underline"
                      >
                        <Shield className="w-3 h-3 text-emerald-600" />
                        <span>🔑 পিন মনে নেই বা নতুন পিন সেট করবেন? WhatsApp ভেরিফিকেশন</span>
                      </button>
                    </div>
                  </form>
                  {driverLoginError && (
                    <p className="text-[11px] font-bold text-red-600 mt-1.5 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{driverLoginError}</span>
                    </p>
                  )}
                </div>
              </div>
            ) : (
              /* REGISTERED DRIVER ACTIVE COCKPIT */
              <>
                {/* Driver Profile Bar */}
                <div className="bg-gradient-to-r from-amber-500/15 via-emerald-500/10 to-blue-500/10 border border-amber-300 rounded-2xl p-3 sm:p-4 mb-3 shadow-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="relative group shrink-0">
                        <input
                          type="file"
                          id="driver-cockpit-photo-input"
                          accept="image/*"
                          className="hidden"
                          onChange={handleDriverCockpitPhotoUpload}
                        />
                        <label
                          htmlFor="driver-cockpit-photo-input"
                          className="cursor-pointer block relative group"
                          title="চালকের ছবি পরিবর্তন বা আপলোড করতে ক্লিক করুন"
                        >
                          {driverProfile.driverPhoto ? (
                            <img
                              src={driverProfile.driverPhoto}
                              alt={driverProfile.name}
                              onError={(e) => {
                                (e.currentTarget as HTMLImageElement).src = '/assets/drivers/tasnimul_kabeer.png';
                              }}
                              className="w-13 h-13 sm:w-16 sm:h-16 rounded-2xl object-cover shadow-md border-2 border-emerald-500 shrink-0 bg-slate-800"
                            />
                          ) : (
                            <div className="w-13 h-13 sm:w-16 sm:h-16 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold text-xl shadow-md border-2 border-white shrink-0">
                              {driverProfile.category === 'ambulance' ? '✚' :
                               driverProfile.category === 'cng' ? '🛺' :
                               driverProfile.category === 'auto' ? '🔋' :
                               driverProfile.category === 'car' ? '🚗' :
                               driverProfile.category === 'microbus' ? '🚐' :
                               driverProfile.category === 'bike' ? '🏍️' : '🚒'}
                            </div>
                          )}
                          <span
                            className="absolute -bottom-1 -right-1 bg-emerald-600 hover:bg-emerald-700 text-white p-1 rounded-full shadow-md border border-white flex items-center justify-center transition active:scale-90"
                            title="ছবি পরিবর্তন করুন"
                          >
                            <Camera className="w-3.5 h-3.5" />
                          </span>
                        </label>
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="bg-amber-400 text-slate-950 font-black text-[10px] px-2 py-0.5 rounded shadow-xs">
                            চালক কন্ট্রোল ড্যাশবোর্ড
                          </span>
                          <span className="bg-emerald-100 text-emerald-800 font-bold text-[10px] px-2 py-0.5 rounded flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3 text-emerald-600" />
                            BRTA লাইসেন্স ভেরিফাইড
                          </span>
                        </div>
                        <h2 className="text-sm sm:text-base font-extrabold text-slate-900 mt-1">
                          {driverProfile.name} • {driverProfile.vehicleModel}
                        </h2>
                        <p className="text-xs text-slate-600">
                          প্লেট: <b className="text-emerald-700">{driverProfile.plateNumber}</b> | প্রধান স্ট্যান্ড: {driverProfile.standName}
                        </p>
                      </div>
                    </div>

                    {/* Online / Offline switch & Back to Passenger & Logout */}
                    <div className="flex items-center gap-2 self-start sm:self-center flex-wrap">
                      <button
                        type="button"
                        onClick={() => setIsDriverOnline(!isDriverOnline)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs sm:text-sm transition-all shadow-xs cursor-pointer ${
                          isDriverOnline
                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/30'
                            : 'bg-slate-300 hover:bg-slate-400 text-slate-800'
                        }`}
                      >
                        <Power className="w-3.5 h-3.5" />
                        <span>{isDriverOnline ? 'অনলাইনে আছেন (অনুরোধ আসবে)' : 'অফলাইন (অনুরোধ বন্ধ)'}</span>
                      </button>

                      {/* Screen Wake-Lock Status & Manual Boost Toggle */}
                      <button
                        type="button"
                        onClick={() => {
                          if (isWakeLockActive) {
                            screenWakeLock.releaseLock();
                            showAdminToastMessage('স্ক্রিন ওয়েক-লক সাময়িক নিষ্ক্রিয় করা হয়েছে');
                          } else {
                            screenWakeLock.requestLock().then(() => {
                              showAdminToastMessage('📱 স্ক্রিন ওয়েক-লক সক্রিয়! স্ট্যান্ডে অপেক্ষারত অবস্থায় স্ক্রিন স্লিপে যাবে না।');
                            });
                          }
                        }}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs sm:text-sm transition-all shadow-xs cursor-pointer ${
                          isWakeLockActive
                            ? 'bg-amber-400 text-slate-950 border border-amber-500 shadow-amber-400/20'
                            : 'bg-slate-200 text-slate-700 hover:bg-slate-300 border border-slate-300'
                        }`}
                        title="চালক মোডে ফোনের স্ক্রিন স্লিপে যাবে না—ট্যাপ করে চেক বা রিস্টার্ট করুন"
                      >
                        <span className={`w-2 h-2 rounded-full ${isWakeLockActive ? 'bg-emerald-600 animate-ping' : 'bg-slate-400'}`} />
                        <span>{isWakeLockActive ? '📱 স্ক্রিন ওয়েক-লক: সক্রিয় 🟢' : '📱 স্ক্রিন ওয়েক-লক চালু'}</span>
                      </button>

                      {/* Push Notification Permission Button */}
                      {typeof window !== 'undefined' && 'Notification' in window && Notification.permission !== 'granted' && (
                        <button
                          type="button"
                          onClick={() => {
                            highPriorityNotifications.requestPermission().then((res) => {
                              if (res === 'granted') {
                                showAdminToastMessage('✅ পুশ নোটিফিকেশন সক্রিয়! স্ক্রিন অফ থাকলেও অ্যালার্ট আসবে');
                              } else {
                                showAdminToastMessage('⚠️ ব্রাউজার সেটিংসে গিয়ে নোটিফিকেশন Allow করুন');
                              }
                            });
                          }}
                          className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer animate-pulse"
                          title="স্ক্রিন বন্ধ বা অ্যাপ ব্যাকগ্রাউন্ডে থাকলেও পুশ নোটিফিকেশন পেতে ট্যাপ করুন"
                        >
                          <Bell className="w-3.5 h-3.5" />
                          <span>🔔 পুশ নোটিফিকেশন চালু করুন</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => setUserRole('passenger')}
                        className="flex items-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-300 px-3 py-1.5 rounded-xl text-xs font-black cursor-pointer transition-all shadow-xs"
                        title="যাত্রী মোডে ফিরে যান"
                      >
                        <User className="w-3.5 h-3.5 text-emerald-700" />
                        <span>যাত্রী মোডে ফিরে যান</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleDriverLogout}
                        className="flex items-center gap-1 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 px-2.5 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-all shadow-xs"
                        title="চালক একাউন্ট থেকে লগআউট করুন"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>লগআউট</span>
                      </button>
                    </div>
                  </div>

                  {/* Driver Stats */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3 pt-3 border-t border-amber-200/60">
                    <div className="bg-white/90 p-2 rounded-xl border border-slate-200">
                      <span className="text-[10.5px] text-slate-500 block">বর্তমান স্ট্যাটাস</span>
                      <span className={`font-bold text-xs ${isDriverOnline ? 'text-emerald-700' : 'text-slate-500'}`}>
                        {isDriverOnline ? '🟢 ট্রিপ নিতে প্রস্তুত' : '🔴 অফলাইন'}
                      </span>
                    </div>
                    <div className="bg-white/90 p-2 rounded-xl border border-slate-200">
                      <span className="text-[10.5px] text-slate-500 block">আজকের ট্রিপ</span>
                      <span className="font-bold text-xs text-blue-700">{driverProfile.todayTrips} টি সফল রাইড</span>
                    </div>
                    <div className="bg-white/90 p-2 rounded-xl border border-slate-200">
                      <span className="text-[10.5px] text-slate-500 block">আজকের আনুমানিক আয়</span>
                      <span className="font-extrabold text-xs text-emerald-800">৳ {driverProfile.todayEarnings}</span>
                    </div>
                    <div className="bg-white/90 p-2 rounded-xl border border-slate-200">
                      <span className="text-[10.5px] text-slate-500 block">ড্রাইভার রেটিং</span>
                      <span className="font-bold text-xs text-amber-600 flex items-center gap-0.5">
                        <Star className="w-3 h-3 fill-amber-500" />
                        {driverProfile.rating} (৫৫+ যাত্রী রিভিউ)
                      </span>
                    </div>
                  </div>
                </div>

                {/* DRIVER ACTIVE ACCEPTED TRIP COCKPIT (IF DRIVER HAS ACCEPTED A TRIP) */}
                {(() => {
                  const dismissed = getDismissedTripIds();
                  const cleanDriverPhone = (driverProfile.phone || '').replace(/[^0-9]/g, '');
                  const driverActiveTrip = passengerRequests.find(r => 
                    (r.status === 'accepted' || r.status === 'in_transit') && 
                    !dismissed.has(r.id) &&
                    (
                      (driverProfile.id && r.driverId === driverProfile.id) ||
                      (cleanDriverPhone && r.driverPhone && r.driverPhone.replace(/[^0-9]/g, '') === cleanDriverPhone)
                    )
                  );

                  if (!driverActiveTrip) return null;

                  return (
                    <div id="safar-driver-active-trip-cockpit" className="bg-gradient-to-br from-emerald-950 via-slate-900 to-teal-950 text-white rounded-3xl p-4 sm:p-5 border-2 border-emerald-400 shadow-xl mb-3.5 animate-in fade-in">
                      <div className="flex items-center justify-between pb-3 mb-3 border-b border-emerald-800/60 flex-wrap gap-2">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <span className="w-3 h-3 rounded-full bg-emerald-400 animate-ping shrink-0"></span>
                          <div className="min-w-0 flex-1 max-w-[280px] xs:max-w-[340px] overflow-hidden">
                            <PauseMarqueeText
                              text={
                                (driverActiveTrip as any).status === 'in_transit'
                                  ? 'আল্লাহ্র উপর ভরসা করে যাত্রা শুরু করছি...'
                                  : 'পিকআপের দিকে রওনা'
                              }
                              className="text-xs font-bold text-emerald-300"
                              pauseSec={1.5}
                            />
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="bg-amber-400 text-slate-950 font-black text-xs px-2.5 py-0.5 rounded-md">
                            নির্ধারিত ভাড়া: ৳ {driverActiveTrip.estFare}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-center">
                        {/* Passenger Details */}
                        <div className="lg:col-span-6 flex items-center gap-3">
                          <div className="w-12 h-12 rounded-2xl bg-emerald-600/30 border border-emerald-400/40 text-emerald-300 flex items-center justify-center font-bold text-xl shrink-0">
                            👤
                          </div>
                          <div className="min-w-0 flex-1">
                            <h3 className="font-extrabold text-base sm:text-lg text-white flex items-center gap-1.5 min-w-0">
                              <div className="min-w-0 flex-1">
                                <PauseMarqueeText text={driverActiveTrip.passengerName} className="font-extrabold text-base sm:text-lg text-white" pauseSec={1.5} />
                              </div>
                              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.2 rounded border border-emerald-500/30 shrink-0">
                                লাইভ যাত্রী
                              </span>
                            </h3>
                            <div className="text-xs text-slate-300 mt-1 space-y-1 min-w-0">
                              <div className="flex items-center gap-1.5 text-[11px] min-w-0">
                                <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                <span className="shrink-0 text-emerald-300 font-bold">পিকআপ:</span>
                                <div className="min-w-0 flex-1">
                                  <PauseMarqueeText text={driverActiveTrip.pickupPoint} className="text-[11px] font-bold text-white" pauseSec={1.5} />
                                </div>
                              </div>
                              {driverActiveTrip.pickupLandmark && (
                                <div className="flex items-center gap-1 text-[10px] text-amber-200 bg-amber-500/15 px-1.5 py-0.5 rounded border border-amber-400/25 min-w-0">
                                  <span className="shrink-0 text-amber-300 font-extrabold text-[9px] bg-amber-400/20 px-1 py-0.2 rounded">২য় পরিচিত রেফারেন্স:</span>
                                  <div className="min-w-0 flex-1 overflow-hidden">
                                    <PauseMarqueeText text={driverActiveTrip.pickupLandmark} className="text-[10px] font-bold text-amber-100" pauseSec={1.5} />
                                  </div>
                                </div>
                              )}
                              <div className="flex items-center gap-1.5 text-[11px] min-w-0">
                                <Navigation className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                                <span className="shrink-0 text-blue-300 font-bold">গন্তব্য:</span>
                                <div className="min-w-0 flex-1">
                                  <PauseMarqueeText text={driverActiveTrip.destination} className="text-[11px] font-bold text-white" pauseSec={1.5} />
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Driver Actions: Call, WhatsApp, Track on Map, Complete, Cancel */}
                        <div className="lg:col-span-6 flex items-center justify-start lg:justify-end gap-2 flex-wrap">
                          <a
                            href={`tel:${driverActiveTrip.passengerPhone}`}
                            className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-2 rounded-xl text-xs sm:text-sm font-bold shadow-md cursor-pointer transition active:scale-95"
                          >
                            <PhoneCall className="w-4 h-4" />
                            <span>যাত্রীকে কল</span>
                          </a>

                          <a
                            href={`https://wa.me/88${driverActiveTrip.passengerPhone.replace(/[^0-9]/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 bg-green-600 hover:bg-green-500 text-white px-2.5 py-2 rounded-xl text-xs font-bold shadow-md cursor-pointer transition"
                          >
                            <span>WhatsApp</span>
                          </a>

                          <button
                            type="button"
                            onClick={() => setShowDriverInlineMap(!showDriverInlineMap)}
                            className="inline-flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-white px-3 py-2 rounded-xl text-xs font-bold cursor-pointer transition border border-slate-700"
                            title="অ্যাপের ভেতরে লাইভ ম্যাপ দেখুন বা লুকান"
                          >
                            <Compass className="w-3.5 h-3.5 text-amber-300" />
                            <span>{showDriverInlineMap ? 'ম্যাপ লুকান' : 'ম্যাপে রুট'}</span>
                          </button>

                          <a
                            href={
                              (() => {
                                const isDest = (driverActiveTrip as any).status === 'in_transit';
                                const targetCoords = isDest
                                  ? ((driverActiveTrip as any).destCoords?.lat ? (driverActiveTrip as any).destCoords : resolveLocationCoordinates(driverActiveTrip.destination, true, stands))
                                  : ((driverActiveTrip as any).pickupCoords?.lat ? (driverActiveTrip as any).pickupCoords : resolveLocationCoordinates(driverActiveTrip.pickupPoint, false, stands));
                                const lat = targetCoords?.lat || (isDest ? 24.4515 : 24.4536);
                                const lng = targetCoords?.lng || (isDest ? 90.5535 : 90.5479);
                                return liveGps.isTracking && liveGps.lat
                                  ? `https://www.google.com/maps/dir/?api=1&origin=${liveGps.lat},${liveGps.lng}&destination=${lat},${lng}&travelmode=driving`
                                  : `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;
                              })()
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white px-3 py-2 rounded-xl text-xs sm:text-sm font-bold shadow-md cursor-pointer transition active:scale-95"
                            title="গুগল ম্যাপে লাইভ টার্ন-বাই-টার্ন ভয়েস নেভিগেশন খুলুন"
                          >
                            <Navigation className="w-3.5 h-3.5 text-white" />
                            <span>
                              {(driverActiveTrip as any).status === 'in_transit'
                                ? 'গুগল ম্যাপে GPS (গন্তব্যের দিকে)'
                                : 'গুগল ম্যাপে GPS (পিকআপ পয়েন্টের দিকে)'}
                            </span>
                          </a>

                          <button
                            type="button"
                            onClick={() => handleDriverCompleteActiveTrip(driverActiveTrip.id, driverActiveTrip.estFare)}
                            className="inline-flex items-center gap-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black px-3.5 py-2 rounded-xl text-xs sm:text-sm shadow-md cursor-pointer transition active:scale-95"
                          >
                            <CheckCircle className="w-4 h-4" />
                            <span>ট্রিপ সম্পন্ন করুন</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDriverCancelActiveTrip(driverActiveTrip.id)}
                            className="inline-flex items-center gap-1 bg-slate-800 hover:bg-red-600 text-slate-300 hover:text-white px-2.5 py-2 rounded-xl text-xs font-semibold cursor-pointer transition"
                            title="ট্রিপ বাতিল"
                          >
                            <X className="w-3.5 h-3.5" />
                            <span>বাতিল</span>
                          </button>
                        </div>
                      </div>

                      {/* Interactive Inline Live Map inside Driver Cockpit */}
                      {showDriverInlineMap && (
                        <div className="mt-3.5 pt-3 border-t border-emerald-800/60 animate-in fade-in">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                              <Navigation className="w-3.5 h-3.5 text-emerald-400" />
                              <span>যাত্রীর অবস্থান ও লাইভ রুট ম্যাপ</span>
                            </span>
                            <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30 font-bold">
                              লাইভ GPS ট্র্যাকিং
                            </span>
                          </div>
                          <div className="-mx-4 sm:mx-0 rounded-none sm:rounded-2xl overflow-hidden border-y sm:border border-emerald-400/50 shadow-md">
                            <GafargaonMap
                              isTripActive={true}
                              activeDriverId={driverProfile.id}
                              drivers={drivers.map(d => ({
                                id: d.id,
                                nameBn: d.name,
                                nameEn: d.name,
                                phone: d.phone,
                                category: (d.category as any),
                                vehicleName: d.vehicleModel,
                                licensePlate: d.plateNumber,
                                standId: d.standName,
                                standName: d.standName,
                                lat: d.lat,
                                lng: d.lng,
                                rating: d.rating,
                                reviewCount: d.totalTrips,
                                isAvailable: d.isOnline,
                                isVerified: d.licenseVerified,
                                nidVerified: d.nidVerified,
                                experienceYears: 5,
                                features: [],
                                baseFare: 30
                              }))}
                              stands={stands.map(s => ({
                                id: s.id,
                                nameBn: s.bengaliName,
                                nameEn: s.name,
                                lat: s.lat,
                                lng: s.lng,
                                driverCount: s.activeDrivers
                              }))}
                              liveDrivers={serverState.drivers}
                              livePassengers={serverState.passengers}
                              connectionStatus={serverState.status}
                              latencyMs={serverState.latencyMs}
                              serverType="cloudflare"
                              onOpenServerSettings={() => setShowCloudflareModal(true)}
                              isAdmin={isAdminLoggedIn}
                              userGps={liveGps}
                              onStartGpsTracking={startGpsTracking}
                              userRole="driver"
                              onSelectDriver={() => {}}
                              activeBooking={{
                                driverName: driverProfile.name || 'আমি (চালক)',
                                driverPhone: driverProfile.phone,
                                driverCategory: driverProfile.category,
                                driverPhoto: driverProfile.driverPhoto || ((driverProfile.phone?.includes('01304841550') || driverProfile.name?.toUpperCase().includes('TASNIMUL')) ? '/assets/drivers/tasnimul_kabeer.png' : undefined),
                                currentDriverLat: (liveGps.lat && liveGps.lng && liveGps.isTracking) ? liveGps.lat : ((driverActiveTrip as any).driverLat || driverProfile.lat || 24.4536),
                                currentDriverLng: (liveGps.lat && liveGps.lng && liveGps.isTracking) ? liveGps.lng : ((driverActiveTrip as any).driverLng || driverProfile.lng || 90.5479),
                                passengerLat: (driverActiveTrip as any).pickupCoords?.lat || (activeBooking as any)?.passengerLat || resolveLocationCoordinates(driverActiveTrip.pickupPoint, false, stands)?.lat || 24.4536,
                                passengerLng: (driverActiveTrip as any).pickupCoords?.lng || (activeBooking as any)?.passengerLng || resolveLocationCoordinates(driverActiveTrip.pickupPoint, false, stands)?.lng || 90.5479,
                                destLat: (driverActiveTrip as any).destCoords?.lat || destCoords?.lat || resolveLocationCoordinates(driverActiveTrip.destination, true, stands)?.lat || 24.4515,
                                destLng: (driverActiveTrip as any).destCoords?.lng || destCoords?.lng || resolveLocationCoordinates(driverActiveTrip.destination, true, stands)?.lng || 90.5535,
                                pickupTitle: driverActiveTrip.pickupPoint || 'পিকআপ স্থান',
                                pickupLandmark: driverActiveTrip.pickupLandmark || '',
                                destTitle: driverActiveTrip.destination || 'গন্তব্য স্থান',
                                distanceKm: driverActiveTrip.distanceKm || 1.2,
                                etaMinutes: Math.round((driverActiveTrip.distanceKm || 1.2) * 2.5),
                                status: (driverActiveTrip as any).status || 'en_route'
                              }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Incoming Passenger Requests Section (Strictly Pending Only & Deduplicated) */}
                {(() => {
                  const dismissed = getDismissedTripIds();
                  const cleanDriverPhone = (driverProfile.phone || '').replace(/[^0-9]/g, '');
                  const driverActiveTrip = passengerRequests.find(r => 
                    (r.status === 'accepted' || r.status === 'in_transit') && 
                    !dismissed.has(r.id) &&
                    (
                      (driverProfile.id && r.driverId === driverProfile.id) ||
                      (cleanDriverPhone && r.driverPhone && r.driverPhone.replace(/[^0-9]/g, '') === cleanDriverPhone)
                    )
                  );
                  const activePassengerPhone = driverActiveTrip?.passengerPhone?.replace(/[^0-9]/g, '');

                  // Deduplicate & strictly filter pending requests
                  const seenPhones = new Set<string>();
                  const filteredPendingRequests = passengerRequests.filter(req => {
                    if (req.status !== 'pending') return false;
                    const cleanPhone = req.passengerPhone?.replace(/[^0-9]/g, '');
                    // Exclude if it's the active trip
                    if (driverActiveTrip && req.id === driverActiveTrip.id) return false;
                    // Exclude if driver is currently on trip with this exact passenger!
                    if (activePassengerPhone && cleanPhone && cleanPhone === activePassengerPhone) return false;
                    // Deduplicate: if multiple pending requests exist from same phone, keep only the latest one
                    if (cleanPhone) {
                      if (seenPhones.has(cleanPhone)) return false;
                      seenPhones.add(cleanPhone);
                    }
                    return true;
                  });

                  return (
                    <div className="bg-white rounded-2xl border border-slate-200 p-3 sm:p-4 shadow-xs mb-3">
                      <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-slate-100 flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-emerald-600" />
                          <h3 className="font-bold text-slate-900 text-xs sm:text-sm">
                            আগত যাত্রার অনুরোধসমূহ (প্যাসেঞ্জার রিকোয়েস্ট)
                          </h3>
                          <span className="bg-emerald-100 text-emerald-900 text-[10px] font-black px-2 py-0.5 rounded-full">
                            {filteredPendingRequests.length} টি অপেক্ষমাণ
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={handlePurgeStaleRequests}
                            className="text-[10px] text-slate-500 hover:text-red-600 px-2.5 py-1 bg-slate-100 hover:bg-red-50 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1"
                            title="ডাটাবেস থেকে সকল পুরাতন টেস্ট ডেটা সাফ করুন"
                          >
                            <Trash2 className="w-3 h-3 text-red-500" />
                            <span>পুরানো টেস্ট ডেটা সাফ করুন</span>
                          </button>
                          <span className="text-[11px] text-slate-500 hidden sm:inline">
                            চালকের ভূমিকা: যাত্রীকে সরাসরি কল দিন এবং ট্রিপ <b>কনফার্ম</b> করুন
                          </span>
                        </div>
                      </div>

                      {/* Request Cards Grid (Strictly Pending Only) */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                        {filteredPendingRequests.length === 0 ? (
                          <div className="col-span-full py-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                            <Users className="w-8 h-8 text-slate-300 mx-auto mb-1.5" />
                            <p className="text-xs font-bold text-slate-600">বর্তমানে কোনো অপেক্ষমাণ যাত্রার অনুরোধ নেই</p>
                            <p className="text-[11px] text-slate-400 mt-0.5">নতুন কোনো যাত্রী পিকআপ ও গন্তব্য নির্ধারণ করে অনুরোধ পাঠালে তা সাথে সাথে এখানে ভেসে উঠবে</p>
                          </div>
                        ) : (
                          filteredPendingRequests.map((req) => (
                        <div 
                          key={req.id}
                          className="p-3 rounded-xl border bg-white border-slate-200 hover:border-emerald-300 shadow-xs transition-all"
                        >
                          <div className="flex items-start justify-between gap-1 mb-2">
                            <div>
                              <span className="text-xs font-bold text-slate-900 flex items-center gap-1">
                                <User className="w-3.5 h-3.5 text-blue-600" />
                                {req.passengerName}
                              </span>
                              <span className="text-[10px] text-slate-400">{req.requestedAt}</span>
                            </div>
                            <span className="bg-emerald-100 text-emerald-800 font-extrabold text-xs px-2 py-0.5 rounded-md">
                              ভাড়া: ৳ {req.estFare}
                            </span>
                          </div>

                          <div className="text-xs space-y-1 mb-3 bg-slate-50 p-2 rounded-lg border border-slate-100">
                            <div className="flex items-center gap-1.5 text-slate-700 min-w-0">
                              <MapPin className="w-3 h-3 text-emerald-600 shrink-0" />
                              <span className="text-slate-500 text-[11px] shrink-0">পিকআপ:</span>
                              <div className="min-w-0 flex-1 overflow-hidden">
                                <PauseMarqueeText text={req.pickupPoint} className="text-[11px] font-bold text-slate-800" pauseSec={1.5} />
                              </div>
                            </div>
                            {req.pickupLandmark && (
                              <div className="flex items-center gap-1 text-[10px] text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200/80 min-w-0">
                                <span className="shrink-0 text-amber-700 font-extrabold text-[9px] bg-amber-100 px-1 py-0.2 rounded">২য় পরিচিত রেফারেন্স:</span>
                                <div className="min-w-0 flex-1 overflow-hidden">
                                  <PauseMarqueeText text={req.pickupLandmark} className="text-[10px] font-semibold text-amber-900" pauseSec={1.5} />
                                </div>
                              </div>
                            )}
                            <div className="flex items-center gap-1.5 text-slate-700 min-w-0">
                              <Navigation className="w-3 h-3 text-blue-600 shrink-0" />
                              <span className="text-slate-500 text-[11px] shrink-0">গন্তব্য:</span>
                              <div className="min-w-0 flex-1 overflow-hidden">
                                <PauseMarqueeText text={req.destination} className="text-[11px] font-bold text-slate-800" pauseSec={1.5} />
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 text-slate-500 text-[10px] pt-1 border-t border-slate-200/60">
                              <span>দূরত্ব: {req.distanceKm} কিমি</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <a
                              href={`tel:${req.passengerPhone}`}
                              className="flex-1 flex items-center justify-center gap-1 py-1.5 px-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-all"
                            >
                              <PhoneCall className="w-3.5 h-3.5 text-emerald-400" />
                              <span>যাত্রীকে কল দিন</span>
                            </a>
                            <button
                              type="button"
                              onClick={() => handleDriverAcceptRequest(req.id)}
                              className="flex-1 flex items-center justify-center gap-1 py-1.5 px-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>ট্রিপ গ্রহণ করুন</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDriverDeclineRequest(req.id)}
                              className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs cursor-pointer"
                              title="বাতিল"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })()}

                {/* Chalok Cockpit Dedicated Guidance & Tips */}
                <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-emerald-900 rounded-2xl p-4 text-white border border-emerald-500/40 shadow-xs mb-3">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-bold shrink-0 shadow-md">
                      <Car className="w-5 h-5 text-slate-950" />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-sm text-amber-300">
                        চালক কন্ট্রোল ড্যাশবোর্ড নির্দেশিকা
                      </h4>
                      <p className="text-xs text-emerald-100/90 mt-1 leading-relaxed">
                        ১. আপনি <b>অনলাইনে</b> থাকলে গফরগাঁও উপজেলার যাত্রীরা অ্যাপ থেকে সরাসরি আপনাকে রাইডের জন্য অনুরোধ পাঠাতে পারবেন।<br/>
                        ২. অনুরোধ আসলে <b>'যাত্রীকে কল দিন'</b> বাটনে চাপ দিয়ে পিকআপ পয়েন্ট নিশ্চিত করুন এবং <b>'ট্রিপ কনফার্ম করুন'</b> এ চাপ দিন।<br/>
                        ৩. স্ট্যান্ড নির্বাচন, ক্যাটাগরি মেনু ও লাইভ ম্যাপ কেবল <b>যাত্রীদের</b> ব্যবহারের জন্য; চালক মোডে আপনার স্ক্রিনটি সম্পূর্ণ ঝামেলামুক্ত ও ডেডিকেটেড রাখা হয়েছে।
                      </p>
                    </div>
                  </div>
                </div>
              </>
            )}
          </section>
        )}

        {/* ============================================================== */}
        {/* PASSENGER ONLY: CATEGORY MENU, LIVE MAP & ACTIVE DRIVERS LIST */}
        {/* Hidden in Driver Mode for a clean, focused cockpit UI          */}
        {/* ============================================================== */}
        {/* ============================================================== */}
        {/* PASSENGER ONLY: CATEGORY MENU & ACTIVE DRIVERS LIST (TOP ROW)  */}
        {/* WITH FULL-WIDTH LIVE MAP PLACED BELOW                         */}
        {/* ============================================================== */}
        {userRole === 'passenger' && (
          <>
            <section className="max-w-7xl mx-auto w-full px-3 sm:px-4 lg:px-6 pt-2.5 pb-1">
              {/* PARALLEL ROW: CATEGORY MENU (PC 33% / MOBILE 40%) & ACTIVE DRIVERS (PC 64% / MOBILE 60%) */}
              <div className="flex flex-row gap-2 sm:gap-3 lg:gap-4 items-start w-full">
                
                {/* ============================================================ */}
                {/* LEFT SECTION: VEHICLE CATEGORIES MENU (PC 33%, MOBILE 40%)    */}
                {/* Height is fixed by its 8 categories and serves as reference  */}
                {/* ============================================================ */}
                <div className="w-[40%] md:w-[33%] shrink-0 flex flex-col">
                  <div 
                    ref={categorySectionRef}
                    className="bg-white rounded-xl sm:rounded-2xl p-2 sm:p-3 shadow-xs border border-slate-200 flex flex-col justify-between h-[410px] sm:h-[450px] max-h-[410px] sm:max-h-[450px]"
                  >
                    <div className="flex-1 flex flex-col min-h-0">
                      <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-slate-100 shrink-0">
                        <div className="flex items-center gap-1 text-slate-800 font-bold text-[11px] sm:text-xs md:text-sm">
                          <Navigation className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span className="truncate">ক্যাটাগরি</span>
                        </div>
                        <span className="text-[9px] sm:text-[10px] bg-emerald-50 text-emerald-700 font-bold px-1.5 py-0.2 rounded border border-emerald-200 hidden xs:inline">
                          {categories.length}টি
                        </span>
                      </div>

                      {/* Categories Stack: Fixed height with smooth scrolling for any number of categories */}
                      <div className="space-y-1 sm:space-y-1.5 flex-1 min-h-0 overflow-y-auto pr-1 custom-driver-scrollbar">
                        {categories.map((cat) => {
                          const isSelected = selectedCategory === cat.id;
                          const activeCount = cat.id === 'all'
                            ? drivers.length
                            : drivers.filter(d => d.category === cat.id).length;

                          return (
                            <button
                              key={cat.id}
                              type="button"
                              onClick={() => handleSelectCategory(cat.id)}
                              className={`w-full flex items-center justify-between p-1 sm:p-1.5 md:p-2 rounded-lg sm:rounded-xl transition-all cursor-pointer text-left border ${
                                isSelected
                                  ? 'bg-emerald-50 border-emerald-500 shadow-xs ring-1 ring-emerald-500'
                                  : 'bg-white hover:bg-slate-50 border-slate-200'
                              }`}
                              title={`${cat.nameBengali} - ক্লিক করে চালকদের তালিকা দেখুন`}
                            >
                              <div className="flex items-center gap-1 sm:gap-1.5 md:gap-2 min-w-0">
                                {/* Compact Category Logo */}
                                <CategoryBadgeLogo category={cat.id} size="compact" />
                                <div className="min-w-0">
                                  <span className={`text-[10px] sm:text-xs md:text-sm font-bold truncate block ${
                                    isSelected ? 'text-emerald-950 font-extrabold' : 'text-slate-800'
                                  }`}>
                                    {cat.nameBengali}
                                  </span>
                                  {/* Subtitle hidden on very narrow screens for clean look */}
                                  <p className="text-[8.5px] sm:text-[9.5px] text-slate-500 truncate hidden md:block">
                                    {cat.subtitle}
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-0.5 sm:gap-1 shrink-0 pl-1">
                                <span className={`text-[8px] sm:text-[10px] font-bold px-1 sm:px-1.5 py-0.2 rounded-full ${
                                  isSelected ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'
                                }`}>
                                  {activeCount}
                                </span>
                                <ChevronRight className={`w-3 h-3 transition-transform hidden sm:inline ${
                                  isSelected ? 'text-emerald-600 translate-x-0.5' : 'text-slate-400'
                                }`} />
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Bottom helper prompt */}
                    <div className="pt-2 text-[8px] sm:text-[9.5px] text-slate-400 text-center border-t border-slate-100 mt-1 shrink-0">
                      ক্যাটাগরিতে ট্যাপ করলে পাশে তালিকা আসবে
                    </div>

                  </div>
                </div>

                {/* ============================================================ */}
                {/* RIGHT SECTION: ACTIVE DRIVERS LIST (PC 64%, MOBILE 60%)      */}
                {/* Height is PIXEL-PERFECT strictly equal to Category Section   */}
                {/* Grid: PC 3-col, Tab 2-col, Mobile 1-col                      */}
                {/* Independent scrolling facility with no trapping / freezing   */}
                {/* ============================================================ */}
                <div 
                  ref={driverListRef} 
                  className="w-[60%] md:w-[67%] lg:w-[64%] flex-1 min-w-0 flex flex-col"
                  style={categoryBoxHeight > 0 ? { height: `${categoryBoxHeight}px`, maxHeight: `${categoryBoxHeight}px` } : undefined}
                >
                  <div className="bg-white rounded-xl sm:rounded-2xl p-2 sm:p-3 shadow-xs border border-slate-200 h-full flex flex-col overflow-hidden">
                    
                    {/* Header: Selected Category & Active Count */}
                    <div className="flex items-center justify-between pb-1.5 sm:pb-2 mb-1.5 sm:mb-2 border-b border-slate-100 shrink-0 flex-wrap gap-1">
                      <div className="flex items-center gap-1.5 min-w-0 flex-1">
                        <CategoryBadgeLogo category={selectedCategory} size="compact" />
                        <div className="min-w-0 flex-1">
                          <PauseMarqueeText
                            text={
                              selectedCategory === 'all'
                                ? 'সকল সক্রিয় চালকদের তালিকা'
                                : `${categories.find(c => c.id === selectedCategory)?.nameBengali || 'সক্রিয়'} - চালকদের তালিকা`
                            }
                            className="font-extrabold text-slate-900 text-xs sm:text-sm md:text-base"
                            pauseSec={1.5}
                          />
                        </div>
                        <span className="text-[9px] sm:text-xs bg-emerald-100 text-emerald-800 font-black px-1.5 sm:px-2 py-0.2 rounded-full shrink-0">
                          {toBengaliNumber(filteredDrivers.length)} জন
                        </span>
                      </div>

                      {selectedStand !== 'all' && (
                        <div className="text-[9px] sm:text-[11px] bg-slate-100 text-slate-700 font-semibold px-1.5 py-0.5 rounded-md border border-slate-200 shrink-0">
                          স্ট্যান্ড: <span className="font-bold text-emerald-800">{selectedStand}</span>
                        </div>
                      )}
                    </div>

                    {/* Scrollable Container with Independent Scrolling and exact matched height */}
                    <div 
                      ref={driverScrollContainerRef}
                      onWheel={handleDriverListWheel}
                      className="flex-1 min-h-0 overflow-y-auto pr-1 custom-driver-scrollbar [touch-action:pan-y]"
                      style={{ overscrollBehavior: 'auto', WebkitOverflowScrolling: 'touch' }}
                    >
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-1.5 sm:gap-2">
                        {filteredDrivers.map((driver) => {
                          const isAmbulance = driver.category === 'ambulance';

                          return (
                            <div
                              key={driver.id}
                              onClick={() => setSelectedDriver(driver)}
                              className={`bg-white rounded-xl p-2 sm:p-2.5 border transition-all hover:shadow-md cursor-pointer flex flex-col justify-between group active:scale-[0.98] ${
                                isAmbulance 
                                  ? 'border-red-300 hover:border-red-400 bg-red-50/20' 
                                  : 'border-slate-200 hover:border-emerald-400'
                              }`}
                            >
                              {/* Card Top: Category Logo & Driver Photo & Rating Points */}
                              <div className="flex items-start justify-between gap-1 mb-1">
                                <div className="flex items-center gap-1.5 min-w-0">
                                  {(driver.driverPhoto || driver.phone?.includes('01304841550') || driver.name?.toUpperCase().includes('TASNIMUL')) ? (
                                    <img
                                      src={driver.driverPhoto || '/assets/drivers/tasnimul_kabeer.png'}
                                      alt={driver.name}
                                      onError={(e) => {
                                        if (driver.phone?.includes('01304841550') || driver.name?.toUpperCase().includes('TASNIMUL')) {
                                          (e.currentTarget as HTMLImageElement).src = '/assets/drivers/tasnimul_kabeer.png';
                                        } else {
                                          e.currentTarget.style.display = 'none';
                                        }
                                      }}
                                      className="w-7 h-7 rounded-lg object-cover border border-emerald-400 shrink-0 shadow-2xs"
                                    />
                                  ) : null}
                                  <CategoryBadgeLogo category={driver.category} size="compact" />
                                </div>
                                <div className="flex items-center gap-0.5 bg-amber-50 border border-amber-200 px-1 py-0.2 rounded text-amber-800 text-[9px] sm:text-[9.5px] font-bold">
                                  <Star className="w-2.5 h-2.5 fill-amber-500 text-amber-500" />
                                  <span>{driver.rating.toFixed(1)}</span>
                                </div>
                              </div>

                              {/* Card Middle: Driver Name, Vehicle, Stand, License */}
                              <div className="min-w-0 mb-1 overflow-hidden space-y-0.5">
                                <h4
                                  className="font-bold text-slate-900 text-[11px] sm:text-xs leading-tight group-hover:text-emerald-700 transition-colors min-w-0"
                                  title={driver.name}
                                >
                                  <PauseMarqueeText text={driver.name} className="font-bold text-slate-900 text-[11px] sm:text-xs leading-tight" pauseSec={1.5} />
                                </h4>
                                <div
                                  className="text-[9.5px] sm:text-[10px] text-emerald-700 font-semibold min-w-0"
                                  title={driver.vehicleModel}
                                >
                                  <PauseMarqueeText text={driver.vehicleModel} className="text-[9.5px] sm:text-[10px] text-emerald-700 font-semibold" pauseSec={1.5} />
                                </div>
                                <div className="flex items-center gap-0.5 min-w-0">
                                  <MapPin className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                                  <div className="min-w-0 flex-1">
                                    <PauseMarqueeText
                                      text={driver.standName.replace(' স্ট্যান্ড', '')}
                                      className="text-[8.5px] sm:text-[9.5px] text-slate-500"
                                      pauseSec={1.5}
                                    />
                                  </div>
                                </div>
                                <div className="mt-1 flex items-center justify-between gap-1 overflow-hidden">
                                  <div
                                    className="flex-1 min-w-0 overflow-hidden bg-blue-50 text-blue-700 font-bold px-1 py-0.2 rounded border border-blue-200"
                                    title={`লাইসেন্স: ${driver.licenseNumber}`}
                                  >
                                    <span className="text-[7.5px] sm:text-[8.5px] text-blue-700 font-bold truncate block">
                                      লাইসেন্স: {driver.licenseNumber}
                                    </span>
                                  </div>
                                  {driver.licenseVerified && driver.phoneVerified && driver.nidVerified ? (
                                    <span className="text-[7.5px] sm:text-[8.5px] bg-emerald-100 text-emerald-800 font-bold px-1 py-0.2 rounded shrink-0 flex items-center gap-0.5" title="BRTA, WhatsApp ও NID ভেরিফাইড">
                                      ৩/৩ ✅
                                    </span>
                                  ) : (
                                    <span className="text-[7.5px] sm:text-[8.5px] bg-amber-100 text-amber-900 font-bold px-1 py-0.2 rounded shrink-0 flex items-center gap-0.5" title="ভেরিফিকেশন প্রক্রিয়াধীন">
                                      পেন্ডিং ⏳
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Card Bottom: "কল করুন" BUTTON & Info Button */}
                              <div className="pt-1.5 border-t border-slate-100 flex items-center gap-1">
                                <a
                                  href={`tel:${driver.phone}`}
                                  onClick={(e) => e.stopPropagation()}
                                  className={`flex-1 flex items-center justify-center gap-1 py-1 px-1.5 rounded-lg font-bold text-[10px] sm:text-[11px] shadow-xs transition-all active:scale-95 text-white ${
                                    isAmbulance
                                      ? 'bg-emerald-700 hover:bg-emerald-800 shadow-emerald-700/20'
                                      : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20'
                                  }`}
                                  title="সরাসরি কল করুন"
                                >
                                  <PhoneCall className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                                  <span>কল করুন</span>
                                </a>

                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedDriver(driver);
                                  }}
                                  title="লাইসেন্স, NID ও ভেরিফিকেশন বিবরণ"
                                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 p-1 rounded-lg transition-colors cursor-pointer"
                                >
                                  <Info className="w-3 h-3 text-slate-600" />
                                </button>
                              </div>

                            </div>
                          );
                        })}
                      </div>

                      {filteredDrivers.length === 0 && (
                        <div className="text-center py-6 bg-slate-50 rounded-xl border border-dashed border-slate-200 my-auto">
                          <Info className="w-6 h-6 text-slate-400 mx-auto mb-1" />
                          <p className="text-xs font-bold text-slate-700">এই ফিল্টারে কোনো সক্রিয় চালক নেই</p>
                          <button
                            type="button"
                            onClick={() => setSelectedCategory('all')}
                            className="mt-1 text-[11px] text-emerald-700 font-bold underline cursor-pointer"
                          >
                            সকল চালক দেখুন
                          </button>
                        </div>
                      )}
                    </div>

                  </div>
                </div>

              </div>
            </section>

            {/* ============================================================== */}
            {/* FULL-WIDTH LIVE MAP SECTION: PLACED DIRECTLY BELOW DRIVERS     */}
            {/* Exactly matching margins & paddings (max-w-7xl mx-auto)       */}
            {/* ============================================================== */}
            {appCustomSettings.showLiveMapWidget && (
              <section id="safar-live-map-section" className="max-w-7xl mx-auto w-full px-0 sm:px-4 lg:px-6 py-2.5 scroll-mt-20">
                <div className="w-full">
                  <GafargaonMap
                    isTripActive={Boolean(activeBooking || passengerPendingRequest)}
                    activeDriverId={activeBooking?.driver?.id}
                    drivers={drivers.map(d => ({
                      id: d.id,
                      nameBn: d.name,
                      nameEn: d.name,
                      phone: d.phone,
                      category: (d.category as any),
                      vehicleName: d.vehicleModel,
                      licensePlate: d.plateNumber,
                      standId: d.standName,
                      standName: d.standName,
                      lat: d.lat,
                      lng: d.lng,
                      rating: d.rating,
                      reviewCount: d.totalTrips,
                      isAvailable: d.isOnline,
                      isVerified: d.licenseVerified,
                      nidVerified: d.nidVerified,
                      experienceYears: 5,
                      features: [],
                      baseFare: 30
                    }))}
                    stands={stands.map(s => ({
                      id: s.id,
                      nameBn: s.bengaliName,
                      nameEn: s.name,
                      lat: s.lat,
                      lng: s.lng,
                      driverCount: s.activeDrivers
                    }))}
                    liveDrivers={serverState.drivers}
                    livePassengers={serverState.passengers}
                    connectionStatus={serverState.status}
                    latencyMs={serverState.latencyMs}
                    serverType={serverState.serverType}
                    onOpenServerSettings={() => setShowCloudflareModal(true)}
                    isAdmin={isAdminLoggedIn}
                    userGps={liveGps}
                    onStartGpsTracking={startGpsTracking}
                    userRole={userRole}
                    selectedDriver={selectedDriver as any}
                    onSelectDriver={(driver: any) => {
                      const matched = drivers.find(d => d.id === driver.id) || driver;
                      setSelectedDriver(matched);
                      showAdminToastMessage(`নির্বাচিত চালক: ${driver.nameBn || driver.name}`);
                    }}
                    pickupCoords={pickupCoords}
                    destCoords={destCoords}
                    pickupTitle={passengerPickup}
                    destTitle={passengerDestination}
                    calculatedDistance={calculatedDistance}
                    calculatedDurationMinutes={calculatedDurationMinutes}
                    activeBooking={activeBooking ? {
                      driverName: activeBooking.driver.name,
                      driverPhone: activeBooking.driver.phone,
                      driverCategory: activeBooking.driver.category,
                      driverPhoto: activeBooking.driver.driverPhoto || ((activeBooking.driver.phone?.includes('01304841550') || activeBooking.driver.name?.toUpperCase().includes('TASNIMUL')) ? '/assets/drivers/tasnimul_kabeer.png' : undefined),
                      currentDriverLat: activeBooking.currentDriverLat,
                      currentDriverLng: activeBooking.currentDriverLng,
                      passengerLat: activeBooking.passengerLat,
                      passengerLng: activeBooking.passengerLng,
                      destLat: activeBooking.destLat || destCoords?.lat,
                      destLng: activeBooking.destLng || destCoords?.lng,
                      pickupTitle: activeBooking.pickupTitle || passengerPickup,
                      destTitle: activeBooking.destTitle || passengerDestination,
                      distanceKm: activeBooking.distanceKm,
                      etaMinutes: activeBooking.etaMinutes,
                      status: activeBooking.status
                    } : null}
                    onSelectPickupPlace={(standName: string) => {
                      setPassengerPickup(standName);
                      const coords = resolveLocationCoordinates(standName, false);
                      setPickupCoords(coords);
                      showAdminToastMessage(`পিকআপ স্থান সেট করা হয়েছে: ${standName}`);
                    }}
                    onSelectDestPlace={(standName: string) => {
                      setPassengerDestination(standName);
                      const coords = resolveLocationCoordinates(standName, true);
                      setDestCoords(coords);
                      showAdminToastMessage(`গন্তব্য স্থান সেট করা হয়েছে: ${standName}`);
                    }}
                    onClearRoute={handleClearRoute}
                  />
                </div>
              </section>
            )}
          </>
        )}

      </main>

      {/* ============================================================== */}
      {/* 4. DRIVER DETAILS & TRANSPARENCY POPUP MODAL                    */}
      {/* Real License, NID Verification, Real Distance & ETA math       */}
      {/* ============================================================== */}
      {selectedDriver && (
        <div 
          className="fixed inset-0 z-[99999] bg-black/65 backdrop-blur-sm overflow-y-auto p-2 sm:p-4 flex flex-col items-center justify-start sm:justify-center"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-lg bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 my-auto sm:my-6 flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95">
            
            {/* Modal Header: Pixel-perfect parallel layout (Left: Driver Photo, Middle: 3 Lines, Right: Category Badge + Close) */}
            <div className="bg-slate-900 text-white p-3 sm:p-4 shrink-0 flex items-center justify-between gap-2.5 sm:gap-3">
              {/* LEFT: Driver Recent Photo (parallel height with 3 middle text lines) */}
              <div className="shrink-0 relative">
                {(selectedDriver.driverPhoto || selectedDriver.phone?.includes('01304841550') || selectedDriver.name?.toUpperCase().includes('TASNIMUL')) ? (
                  <img
                    src={selectedDriver.driverPhoto || '/assets/drivers/tasnimul_kabeer.png'}
                    alt={selectedDriver.name}
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = '/assets/drivers/tasnimul_kabeer.png';
                    }}
                    className="w-[60px] h-[60px] sm:w-[66px] sm:h-[66px] rounded-2xl object-cover border-2 border-emerald-400 shadow-md bg-slate-800"
                  />
                ) : (
                  <div className="w-[60px] h-[60px] sm:w-[66px] sm:h-[66px] rounded-2xl border-2 border-slate-700 bg-slate-800 flex flex-col items-center justify-center text-slate-400 shadow-md">
                    <User className="w-6 h-6 text-slate-400" />
                    <span className="text-[8px] font-bold text-slate-400 mt-0.5">ছবি নেই</span>
                  </div>
                )}
              </div>

              {/* MIDDLE: 3 Lines of Text (Parallel height) */}
              <div className="flex-1 min-w-0 flex flex-col justify-between h-[60px] sm:h-[66px] py-0.5">
                {/* Line 1: Status & Rating */}
                <div className="flex items-center gap-1.5 flex-wrap leading-none">
                  <span className="bg-emerald-500 text-white text-[9.5px] font-black px-2 py-0.5 rounded-full inline-flex items-center shadow-sm">
                    অনলাইন চালক
                  </span>
                  <span className="text-amber-400 font-bold text-xs flex items-center gap-0.5">
                    <Star className="w-3 h-3 fill-amber-400" />
                    {selectedDriver.rating.toFixed(1)} রেটিং
                  </span>
                  <span className="text-slate-300 text-[10px] hidden xs:inline">
                    ({selectedDriver.totalTrips}+ সফল রাইড)
                  </span>
                </div>

                {/* Line 2: Driver Name with smooth right-to-left scroll and 1.5s pause at completion */}
                <div className="w-full overflow-hidden">
                  <AutoMarqueeText
                    text={selectedDriver.name}
                    className="text-sm sm:text-base md:text-lg font-bold text-white leading-tight"
                    pauseAtEndMs={1500}
                    speed={32}
                  />
                </div>

                {/* Line 3: Vehicle Model & Plate with smooth right-to-left scroll and 1.5s pause at completion */}
                <div className="w-full overflow-hidden">
                  <AutoMarqueeText
                    text={`${selectedDriver.vehicleModel} • ${selectedDriver.plateNumber}`}
                    className="text-[11px] sm:text-xs text-slate-300 leading-tight"
                    pauseAtEndMs={1500}
                    speed={30}
                  />
                </div>
              </div>

              {/* RIGHT: Category Vehicle Icon Badge (Hidden on mobile) & Close Button */}
              <div className="flex items-center gap-2 shrink-0">
                {/* Category Vehicle Icon Badge (Hidden on mobile to provide full width to driver information) */}
                <div className={`hidden sm:flex w-[60px] h-[60px] sm:w-[66px] sm:h-[66px] rounded-2xl ${selectedDriver.avatarBg} text-white items-center justify-center shadow-lg border-2 border-white/80 shrink-0 text-2xl`}>
                  {selectedDriver.category === 'ambulance' ? '🚑' :
                   selectedDriver.category === 'cng' ? '🛺' :
                   selectedDriver.category === 'auto' ? '🔋' :
                   selectedDriver.category === 'car' ? '🚗' :
                   selectedDriver.category === 'microbus' ? '🚐' :
                   selectedDriver.category === 'bike' ? '🏍️' : '🚒'}
                </div>

                {/* Close Button */}
                <button
                  type="button"
                  onClick={() => setSelectedDriver(null)}
                  className="text-slate-400 hover:text-white p-1.5 rounded-full hover:bg-slate-800 transition-colors cursor-pointer shrink-0 self-center sm:self-start"
                  title="বন্ধ করুন"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body: Verified Credentials & Real Details */}
            <div className="flex-1 overflow-y-auto p-3.5 sm:p-5 space-y-3 bg-white text-slate-900">
              
              {/* Verification Badges (3-Way Verification: BRTA License, WhatsApp Phone, NID) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-bold px-1">
                  <span className="text-slate-600">নিরাপত্তা ও ৩-ধাপের ভেরিফিকেশন:</span>
                  {selectedDriver.licenseVerified && selectedDriver.phoneVerified && selectedDriver.nidVerified ? (
                    <span className="text-emerald-700 bg-emerald-100/90 px-2 py-0.5 rounded-full font-black flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3 text-emerald-600" />
                      সম্পূর্ণ ভেরিফাইড (৩/৩)
                    </span>
                  ) : (
                    <span className="text-amber-800 bg-amber-100/90 px-2 py-0.5 rounded-full font-black flex items-center gap-1">
                      <AlertCircle className="w-3 h-3 text-amber-600" />
                      যাচাই পেন্ডিং ({[selectedDriver.licenseVerified, selectedDriver.phoneVerified, selectedDriver.nidVerified].filter(Boolean).length}/৩ সম্পন্ন)
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {/* 1. Driving License Verification */}
                  <div className={`p-2 rounded-xl border flex items-center gap-2 ${
                    selectedDriver.licenseVerified ? 'bg-blue-50/80 border-blue-200' : 'bg-slate-50 border-slate-200'
                  }`}>
                    <UserCheck className={`w-4 h-4 shrink-0 ${selectedDriver.licenseVerified ? 'text-blue-600' : 'text-slate-400'}`} />
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold text-slate-800">১. BRTA লাইসেন্স</p>
                      <p className="text-[10px] text-blue-700 font-bold truncate">
                        {selectedDriver.licenseNumber}
                      </p>
                      <p className={`text-[9px] font-semibold ${selectedDriver.licenseVerified ? 'text-emerald-700 font-bold' : 'text-amber-700'}`}>
                        {selectedDriver.licenseVerified ? '✅ বিআরটিএ অনুমোদিত' : '⏳ যাচাই পেন্ডিং'}
                      </p>
                    </div>
                  </div>

                  {/* 2. WhatsApp & Phone Verification */}
                  <div className={`p-2 rounded-xl border flex items-center gap-2 ${
                    selectedDriver.phoneVerified ? 'bg-emerald-50/80 border-emerald-200' : 'bg-slate-50 border-slate-200'
                  }`}>
                    <PhoneCall className={`w-4 h-4 shrink-0 ${selectedDriver.phoneVerified ? 'text-emerald-600' : 'text-slate-400'}`} />
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold text-slate-800">২. WhatsApp ফোন</p>
                      <p className="text-[10px] text-emerald-800 font-bold truncate">
                        {selectedDriver.phone}
                      </p>
                      <p className={`text-[9px] font-semibold ${selectedDriver.phoneVerified ? 'text-emerald-700 font-bold' : 'text-amber-700'}`}>
                        {selectedDriver.phoneVerified ? '✅ কল ও হোয়াটসঅ্যাপ সক্রিয়' : '⏳ যাচাই পেন্ডিং'}
                      </p>
                    </div>
                  </div>

                  {/* 3. NID Verification */}
                  <div className={`p-2 rounded-xl border flex items-center gap-2 ${
                    selectedDriver.nidVerified ? 'bg-purple-50/80 border-purple-200' : 'bg-slate-50 border-slate-200'
                  }`}>
                    <ShieldCheck className={`w-4 h-4 shrink-0 ${selectedDriver.nidVerified ? 'text-purple-600' : 'text-slate-400'}`} />
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold text-slate-800">৩. জাতীয় পরিচয়পত্র (NID)</p>
                      <p className="text-[10px] text-purple-700 font-bold truncate">
                        {selectedDriver.nidNumber.length > 5 
                          ? `${selectedDriver.nidNumber.slice(0, 3)}****${selectedDriver.nidNumber.slice(-3)}` 
                          : selectedDriver.nidNumber}
                      </p>
                      <p className={`text-[9px] font-semibold ${selectedDriver.nidVerified ? 'text-emerald-700 font-bold' : 'text-amber-700'}`}>
                        {selectedDriver.nidVerified ? '✅ স্মার্ট কার্ড মিল সম্পন্ন' : '⏳ যাচাই পেন্ডিং'}
                      </p>
                    </div>
                  </div>
                </div>

                {!(selectedDriver.licenseVerified && selectedDriver.phoneVerified && selectedDriver.nidVerified) && (
                  <div className="p-2 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-900 flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span>সতর্কতা: এই চালকের সকল নিরাপত্তা তথ্য এখনো অ্যাডমিন দ্বারা সম্পূর্ণ ভেরিফাইড হয়নি।</span>
                  </div>
                )}
              </div>

              {/* Real Distance, Location & Arrival Status */}
              {(() => {
                const dist = calculateDistanceKm(selectedDriver.lat, selectedDriver.lng, passengerLocation.lat, passengerLocation.lng);
                const eta = calculateEtaMinutes(dist, selectedDriver.approxSpeedKmh);

                return (
                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        বর্তমান স্ট্যান্ড:
                      </span>
                      <span className="font-bold text-slate-800 text-right">{selectedDriver.standName}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 flex items-center gap-1">
                        <LocateFixed className="w-3.5 h-3.5 text-slate-400" />
                        আপনার থেকে বাস্তব দূরত্ব:
                      </span>
                      <span className="font-bold text-blue-700">{dist} কিমি দূরে</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        পৌঁছাতে সম্ভাব্য সময়:
                      </span>
                      <span className="font-extrabold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                        প্রায় {eta} মিনিট
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
                      <span className="text-slate-500 flex items-center gap-1">
                        <Award className="w-3.5 h-3.5 text-slate-400" />
                        সম্পন্ন সফল ট্রিপ:
                      </span>
                      <span className="font-bold text-slate-800">{selectedDriver.totalTrips}+ রাইড</span>
                    </div>
                  </div>
                );
              })()}

              {/* Mutual Location & Booking Explanation Notice */}
              <div className="p-3 bg-blue-50/80 rounded-2xl border border-blue-200 text-xs text-blue-950 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-blue-900">
                  <HelpCircle className="w-4 h-4 text-blue-700 shrink-0" />
                  <span>কে কাকে কল ও কনফার্ম করবে? (যাত্রীর নিয়ম)</span>
                </div>
                <div className="text-[11px] text-blue-800 space-y-1 pl-5.5 leading-relaxed">
                  <p>
                    • <b>সরাসরি কল:</b> ভাড়া বা অবস্থান কথা বলে ঠিক করতে <b>চালককে সরাসরি কল করুন</b>।
                  </p>
                  <p>
                    • <b>অনুরোধ পাঠান:</b> <b>যাত্রার অনুরোধ পাঠান</b> বাটনে চাপলে চালক তার ফোনে অনুরোধ পাবেন ও ট্রিপ <b>কনফার্ম</b> করবেন। এরপর ম্যাপে চালক আপনার দিকে রওনা হওয়ার লাইভ গতি ও পৌঁছানোর সময় দেখতে পাবেন।
                  </p>
                </div>
              </div>

              {/* Action Buttons: Direct Call & Request Ride (NO confusing 'প্যাসেঞ্জার কনফার্ম করুন') */}
              <div className="pt-1.5 flex flex-col sm:flex-row gap-2">
                <a
                  href={`tel:${selectedDriver.phone}`}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl font-bold text-xs sm:text-sm bg-slate-900 hover:bg-slate-800 text-white shadow-sm transition-all active:scale-95 cursor-pointer"
                >
                  <PhoneCall className="w-4 h-4 text-emerald-400" />
                  <span>চালককে সরাসরি কল করুন</span>
                </a>

                <button
                  type="button"
                  onClick={() => handleConfirmRide(selectedDriver)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl font-bold text-xs sm:text-sm bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/30 transition-all active:scale-95 cursor-pointer"
                >
                  <Navigation className="w-4 h-4" />
                  <span>এই গাড়িতে যাত্রার অনুরোধ পাঠান</span>
                </button>
              </div>

            </div>

          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 4.5 ROLE & BOOKING GUIDANCE MODAL (কে কাকে কল ও কনফার্ম করবে?) */}
      {/* ============================================================== */}
      {showRoleGuideModal && (
        <div 
          className="fixed inset-0 z-[99999] bg-black/65 backdrop-blur-sm overflow-y-auto p-2 sm:p-4 flex flex-col items-center justify-start sm:justify-center"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-lg bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 my-auto sm:my-6 flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95">
            
            {/* Header - Pinned at top, always visible */}
            <div className="bg-emerald-800 text-white p-3.5 sm:p-4 flex items-center justify-between shrink-0 border-b border-emerald-900">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                  <HelpCircle className="w-5 h-5 sm:w-6 sm:h-6 text-amber-300" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold leading-tight">
                    সফর (Safar) সিস্টেম নির্দেশিকা
                  </h3>
                  <p className="text-[10.5px] sm:text-xs text-emerald-200">
                    কে কাকে কল করবে এবং কে কাকে কনফার্ম করবে?
                  </p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setShowRoleGuideModal(false)}
                className="text-white/80 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                aria-label="বন্ধ করুন"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body: 4 Clear Explanations (Scrollable) */}
            <div className="flex-1 overflow-y-auto p-3.5 sm:p-5 space-y-3 bg-white text-slate-900 text-xs">
              
              {/* Point 1: Calling */}
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                <div className="flex items-center gap-2 font-bold text-slate-900">
                  <PhoneCall className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="text-xs sm:text-sm">১. কে কাকে কল করবে?</span>
                </div>
                <p className="text-slate-600 leading-relaxed pl-6 text-[11px] sm:text-xs">
                  • <b>যাত্রী চালককে কল করতে পারেন:</b> স্ট্যান্ডে নির্দিষ্ট গাড়িটি আছে কিনা বা ভাড়া নিয়ে কথা বলতে চালকের কার্ডে <b>'চালককে সরাসরি কল করুন'</b> বাটনে চাপ দিলেই সরাসরি ফোনে কথা বলা যাবে।<br />
                  • <b>চালক যাত্রীকে কল করতে পারেন:</b> কোনো যাত্রী অনুরোধ পাঠালে চালক তার ড্যাশবোর্ডে <b>'যাত্রীকে কল দিন'</b> বাটন দেখতে পান এবং পিকআপ স্থান নিশ্চিত করতে ফোনে যোগাযোগ করেন।
                </p>
              </div>

              {/* Point 2: Confirmation */}
              <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-1">
                <div className="flex items-center gap-2 font-bold text-emerald-950">
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="text-xs sm:text-sm">২. কে কাকে কনফার্ম করবে?</span>
                </div>
                <p className="text-emerald-900 leading-relaxed pl-6 text-[11px] sm:text-xs">
                  • <b>যাত্রী 'অনুরোধ পাঠাবেন':</b> যাত্রী চালকের কার্ড খুলে <b>'যাত্রার অনুরোধ পাঠান'</b> বাটন চাপবেন।<br />
                  • <b>চালক 'কনফার্ম / গ্রহণ করবেন':</b> চালক তার স্ক্রিনে যাত্রীর নাম, পিকআপ ও ভাড়া দেখে <b>'ট্রিপ কনফার্ম করুন'</b> বাটনে চাপ দিয়ে ট্রিপ গ্রহণ করবেন। এরপর লাইভ ম্যাপে একে অপরের লোকেশন দেখা যাবে।
                </p>
              </div>

              {/* Point 3: Different Interfaces */}
              <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 space-y-1">
                <div className="flex items-center gap-2 font-bold text-amber-950">
                  <Car className="w-4 h-4 text-amber-600 shrink-0" />
                  <span className="text-xs sm:text-sm">৩. যাত্রী ও চালক কি একই ইন্টারফেস দেখবে?</span>
                </div>
                <p className="text-amber-900 leading-relaxed pl-6 text-[11px] sm:text-xs">
                  <b>না, সম্পূর্ণ আলাদা!</b> অ্যাপের উপরের হেডারে দেখুন <b>'যাত্রী'</b> এবং <b>'চালক'</b> অপশন আছে। যাত্রীরা গাড়ির তালিকা, ম্যাপ ও পূর্বের যাত্রার ইতিহাস দেখেন, আর চালকরা ট্রিপ গ্রহণ ও আয়ের ড্যাশবোর্ড দেখেন।
                </p>
              </div>

              {/* Point 4: Verification */}
              <div className="p-3 rounded-2xl bg-blue-50 border border-blue-200 space-y-1">
                <div className="flex items-center gap-2 font-bold text-blue-950">
                  <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
                  <span className="text-xs sm:text-sm">৪. লাইসেন্স ও এনআইডি যাচাই কীভাবে হয়?</span>
                </div>
                <p className="text-blue-900 leading-relaxed pl-6 text-[11px] sm:text-xs">
                  চালক নিবন্ধনের সময় বিআরটিএ ড্রাইভিং লাইসেন্স ও জাতীয় পরিচয়পত্র (NID) নম্বর জমা দেওয়া বাধ্যতামূলক। সফর সিস্টেমে এগুলো যাচাইকৃত হলেই প্রোফাইলে নীল ও সবুজ ভেরিফাইড ব্যাজ প্রদর্শিত হয়।
                </p>
              </div>

              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={() => setShowRoleGuideModal(false)}
                  className="w-full py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl shadow-md cursor-pointer transition-all active:scale-95 text-xs sm:text-sm"
                >
                  বুঝেছি, ধন্যবাদ
                </button>
              </div>

            </div>

          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 5. DRIVER REGISTRATION MODAL WITH DRIVING LICENSE & NID FIELDS */}
      {/* ============================================================== */}
      {isRegisterModalOpen && (
        <div 
          className="fixed inset-0 z-[99999] bg-black/65 backdrop-blur-sm overflow-y-auto p-2 sm:p-4 flex flex-col items-center justify-start sm:justify-center"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-lg bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 my-auto sm:my-6 flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95">
            
            {/* Header (Sticky / Never clipped on mobile) */}
            <div className="bg-emerald-700 text-white p-3 sm:p-4 flex items-center justify-between shrink-0 border-b border-emerald-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                  <IdCard className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold leading-tight">
                    চালকের ফ্রি নিবন্ধন (গফরগাঁও)
                  </h3>
                  <p className="text-[10px] sm:text-[11px] text-emerald-100">
                    বিআরটিএ লাইসেন্স ও NID দিয়ে নিরাপদে যুক্ত হোন
                  </p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setIsRegisterModalOpen(false)}
                className="text-white/80 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                aria-label="বন্ধ করুন"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tabs for Registration & Verification Status Tracking */}
            <div className="flex items-center border-b border-slate-200 bg-slate-50 px-3 sm:px-5 pt-2 gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setRegisterModalTab('register')}
                className={`flex items-center gap-1.5 py-2 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                  registerModalTab === 'register'
                    ? 'border-emerald-600 text-emerald-800 bg-white rounded-t-lg'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <IdCard className="w-3.5 h-3.5 text-emerald-600" />
                <span>চালকের নিবন্ধন ফরম</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setRegisterModalTab('status_check');
                  if (activeSubmittedDriverId) {
                    const found = drivers.find(d => d.id === activeSubmittedDriverId);
                    if (found) setStatusCheckResult(found);
                  }
                }}
                className={`flex items-center gap-1.5 py-2 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                  registerModalTab === 'status_check'
                    ? 'border-emerald-600 text-emerald-800 bg-white rounded-t-lg'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                <span>ভেরিফিকেশন স্ট্যাটাস ট্র্যাকার</span>
                {activeSubmittedDriverId && (
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                )}
              </button>
            </div>

            {/* Body (Scrollable Form / Status Body) */}
            <div className="flex-1 overflow-y-auto p-3.5 sm:p-5">
              
              {/* TAB 1: REGISTRATION FORM */}
              {registerModalTab === 'register' && (
                <form onSubmit={handleRegisterSubmit} className="space-y-3 bg-white text-slate-900">
                  
                  {/* Verification Requirement Notice */}
                  <div className="p-2.5 bg-blue-50/80 text-blue-900 border border-blue-200 rounded-xl text-xs space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-blue-950">
                      <ShieldCheck className="w-4 h-4 text-blue-700 shrink-0" />
                      <span>৩টি আবশ্যিক নিরাপত্তা যাচাইকরণ (Mandatory)</span>
                    </div>
                    <p className="text-[11px] text-blue-800 leading-relaxed pl-5.5">
                      নিরাপদ যাত্রীসেবার জন্য আপনার <b>১. বিআরটিএ লাইসেন্স</b>, <b>২. হোয়াটসঅ্যাপ ও সক্রিয় ফোন নম্বর</b> এবং <b>৩. জাতীয় পরিচয়পত্র (NID)</b> অ্যাডমিন প্যানেল দ্বারা সম্পূর্ণ অনুমোদিত হলে তবেই আপনার প্রোফাইল সক্রিয় হবে।
                    </p>
                  </div>

                  {formValidationNotice && (
                    <div className="p-2.5 bg-red-50 text-red-700 border border-red-200 rounded-xl text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{formValidationNotice}</span>
                    </div>
                  )}

                  {/* Driver Recent Photo Section (Minimum Size Canvas Compressed) */}
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        {registerForm.driverPhoto ? (
                          <div className="relative group shrink-0">
                            <img
                              src={registerForm.driverPhoto}
                              alt="চালকের সাম্প্রতিক ছবি"
                              className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl object-cover border-2 border-emerald-500 shadow-sm bg-slate-900"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                setRegisterForm({ ...registerForm, driverPhoto: '' });
                                setDriverPhotoSizeKb(null);
                              }}
                              className="absolute -top-1.5 -right-1.5 bg-red-600 text-white rounded-full p-1 shadow-md hover:bg-red-700 cursor-pointer"
                              title="ছবি মুছুন"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl border-2 border-dashed border-slate-300 bg-white flex flex-col items-center justify-center text-slate-400 shrink-0">
                            <User className="w-6 h-6 text-slate-300" />
                            <span className="text-[9px] font-bold text-slate-400 mt-0.5">ছবি দিন</span>
                          </div>
                        )}
                        <div>
                          <label className="block text-xs font-bold text-slate-800">
                            চালকের সাম্প্রতিক রঙিন ছবি (পাসপোর্ট সাইজ/সেলফি) <span className="text-red-500">*</span>
                          </label>
                          <p className="text-[10.5px] text-slate-500 mt-0.5">
                            গাড়ির প্রোফাইল ও চালক মোডে এই ছবি প্রদর্শিত হবে
                          </p>
                          {driverPhotoSizeKb !== null && (
                            <span className="text-[9.5px] text-emerald-800 bg-emerald-100 font-bold px-1.5 py-0.2 rounded mt-1 inline-block">
                              ⚡ মাত্র {driverPhotoSizeKb} KB (মিনিমাম সাইজ)
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="self-end sm:self-center">
                        <label className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer transition active:scale-95">
                          <Camera className="w-3.5 h-3.5" />
                          <span>{registerForm.driverPhoto ? 'ছবি পরিবর্তন' : 'ছবি আপলোড করুন'}</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleDriverPhotoUpload}
                            className="hidden"
                          />
                        </label>
                        {driverPhotoUploadLoading && (
                          <p className="text-[10px] text-blue-600 font-bold mt-1 text-center">কম্প্রেস হচ্ছে...</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Driver Name & Phone */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-xs font-bold text-slate-800 mb-1">
                        চালকের পূর্ণ নাম <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={registerForm.name}
                        onChange={(e) => setRegisterForm({ ...registerForm, name: e.target.value })}
                        placeholder="আপনার নাম লিখুন"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-800 mb-1">
                        হোয়াটসঅ্যাপ মোবাইল নম্বর <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="tel"
                        required
                        value={registerForm.phone}
                        onChange={(e) => setRegisterForm({ ...registerForm, phone: e.target.value })}
                        placeholder="০১XXXXXXXXX"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  </div>

                  {/* Driving License, First Issue Date & License Type */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <div>
                      <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center gap-1">
                        <FileText className="w-3 h-3 text-blue-600" />
                        <span>BRTA লাইসেন্স নম্বর <span className="text-red-500">*</span></span>
                      </label>
                      <input
                        type="text"
                        required
                        value={registerForm.licenseNumber}
                        onChange={(e) => setRegisterForm({ ...registerForm, licenseNumber: e.target.value })}
                        placeholder="যেমন: MMS26010NP178"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-emerald-600" />
                        <span>প্রথম ইস্যুর তারিখ <span className="text-red-500">*</span></span>
                      </label>
                      <input
                        type="text"
                        required
                        value={registerForm.firstIssueDate}
                        onChange={(e) => setRegisterForm({ ...registerForm, firstIssueDate: e.target.value })}
                        placeholder="DD/MM/YYYY (যেমন: 15/04/2021)"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-800 mb-1">
                        লাইসেন্সের ধরন <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={registerForm.licenseType}
                        onChange={(e) => setRegisterForm({ ...registerForm, licenseType: e.target.value as any })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      >
                        <option value="পেশাদার (Professional)">পেশাদার (Professional)</option>
                        <option value="অপেশাদার (Non-Professional)">অপেশাদার (Non-Professional)</option>
                      </select>
                    </div>
                  </div>

                  {/* NID & Vehicle Category */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3 text-emerald-600" />
                        <span>জাতীয় পরিচয়পত্র (NID) নম্বর <span className="text-red-500">*</span></span>
                      </label>
                      <input
                        type="text"
                        required
                        value={registerForm.nid}
                        onChange={(e) => setRegisterForm({ ...registerForm, nid: e.target.value })}
                        placeholder="১০ বা ১৭ ডিজিট স্মার্ট NID নম্বর"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-800 mb-1">
                        যানবাহন ক্যাটাগরি <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={registerForm.category}
                        onChange={(e) => setRegisterForm({ ...registerForm, category: e.target.value as VehicleCategory })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      >
                        {categories.filter(c => c.id !== 'all').map(c => (
                          <option key={c.id} value={c.id}>{c.nameBengali}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* NID Photos Section (এ পিঠ ও ও পিঠ) - Minimum Size Canvas Compressed */}
                  <div className="p-3 bg-teal-50/60 border border-teal-200 rounded-2xl space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 font-bold text-xs text-teal-950">
                        <IdCard className="w-4 h-4 text-teal-700" />
                        <span>জাতীয় পরিচয়পত্র (NID) এর ছবি সংযুক্ত করুন (মিনিমাম সাইজ)</span>
                      </div>
                      <span className="text-[10px] font-bold text-teal-800 bg-teal-100 px-2 py-0.5 rounded-full">
                        টোকেন রিসিটের মতো অপ্টিমাইজড
                      </span>
                    </div>
                    <p className="text-[10.5px] text-teal-800 leading-snug">
                      যেহেতু সরাসরি NID যাচাই করা যায় না, তাই অ্যাডমিন প্যানেল থেকে BRTA ড্রাইভিং লাইসেন্স তথ্যের ভিত্তিতে মিলিয়ে দেখতে NID কার্ডের উভয় পিঠের ছবি দিন।
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      {/* NID Front Photo */}
                      <div className="bg-white p-2.5 rounded-xl border border-teal-200 shadow-2xs space-y-1.5">
                        <div className="flex items-center justify-between">
                          <label className="text-[11px] font-bold text-slate-800 flex items-center gap-1">
                            <span>NID সম্মুখভাগ (এ পিঠ)</span>
                            <span className="text-red-500">*</span>
                          </label>
                          {nidFrontSizeKb !== null && (
                            <span className="text-[9px] text-teal-800 font-bold bg-teal-50 px-1 py-0.2 rounded border border-teal-200">
                              {nidFrontSizeKb} KB
                            </span>
                          )}
                        </div>

                        {!registerForm.nidFrontPhoto ? (
                          <label className="flex flex-col items-center justify-center p-3 border-2 border-dashed border-teal-300 hover:border-teal-500 bg-teal-50/30 rounded-xl cursor-pointer transition text-center group">
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleNidFrontPhotoUpload}
                              className="hidden"
                            />
                            <Camera className="w-4 h-4 text-teal-600 mb-0.5 group-hover:scale-110 transition" />
                            <span className="text-[10.5px] font-bold text-teal-900">এ পিঠের ছবি তুলুন / দিন</span>
                            <span className="text-[9px] text-slate-400 mt-0.5">মিনিমাম সাইজে স্বয়ংক্রিয় সেভ হবে</span>
                            {nidFrontUploadLoading && <span className="text-[9.5px] text-blue-600 font-bold mt-1">প্রসেস হচ্ছে...</span>}
                          </label>
                        ) : (
                          <div className="flex items-center justify-between p-1.5 bg-slate-50 rounded-lg border border-slate-200">
                            <div className="flex items-center gap-2">
                              <img
                                src={registerForm.nidFrontPhoto}
                                alt="NID Front"
                                className="w-12 h-10 object-cover rounded-md border border-slate-300"
                              />
                              <div>
                                <p className="text-[11px] font-bold text-teal-900">✓ এ পিঠ যুক্ত হয়েছে</p>
                                <p className="text-[9px] text-slate-500">সাইজ: {nidFrontSizeKb || 25} KB</p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setRegisterForm({ ...registerForm, nidFrontPhoto: '' });
                                setNidFrontSizeKb(null);
                              }}
                              className="text-[11px] text-red-600 hover:text-red-800 font-bold px-1.5 py-0.5 rounded hover:bg-red-50 cursor-pointer"
                            >
                              মুছুন
                            </button>
                          </div>
                        )}
                      </div>

                      {/* NID Back Photo */}
                      <div className="bg-white p-2.5 rounded-xl border border-teal-200 shadow-2xs space-y-1.5">
                        <div className="flex items-center justify-between">
                          <label className="text-[11px] font-bold text-slate-800 flex items-center gap-1">
                            <span>NID পেছনের ভাগ (অপর পিঠ)</span>
                            <span className="text-red-500">*</span>
                          </label>
                          {nidBackSizeKb !== null && (
                            <span className="text-[9px] text-teal-800 font-bold bg-teal-50 px-1 py-0.2 rounded border border-teal-200">
                              {nidBackSizeKb} KB
                            </span>
                          )}
                        </div>

                        {!registerForm.nidBackPhoto ? (
                          <label className="flex flex-col items-center justify-center p-3 border-2 border-dashed border-teal-300 hover:border-teal-500 bg-teal-50/30 rounded-xl cursor-pointer transition text-center group">
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleNidBackPhotoUpload}
                              className="hidden"
                            />
                            <Camera className="w-4 h-4 text-teal-600 mb-0.5 group-hover:scale-110 transition" />
                            <span className="text-[10.5px] font-bold text-teal-900">ও পিঠের ছবি তুলুন / দিন</span>
                            <span className="text-[9px] text-slate-400 mt-0.5">মিনিমাম সাইজে স্বয়ংক্রিয় সেভ হবে</span>
                            {nidBackUploadLoading && <span className="text-[9.5px] text-blue-600 font-bold mt-1">প্রসেস হচ্ছে...</span>}
                          </label>
                        ) : (
                          <div className="flex items-center justify-between p-1.5 bg-slate-50 rounded-lg border border-slate-200">
                            <div className="flex items-center gap-2">
                              <img
                                src={registerForm.nidBackPhoto}
                                alt="NID Back"
                                className="w-12 h-10 object-cover rounded-md border border-slate-300"
                              />
                              <div>
                                <p className="text-[11px] font-bold text-teal-900">✓ ও পিঠ যুক্ত হয়েছে</p>
                                <p className="text-[9px] text-slate-500">সাইজ: {nidBackSizeKb || 25} KB</p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setRegisterForm({ ...registerForm, nidBackPhoto: '' });
                                setNidBackSizeKb(null);
                              }}
                              className="text-[11px] text-red-600 hover:text-red-800 font-bold px-1.5 py-0.5 rounded hover:bg-red-50 cursor-pointer"
                            >
                              মুছুন
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Vehicle Model & Plate Number */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-xs font-bold text-slate-800 mb-1">
                        গাড়ির মডেল ও নাম
                      </label>
                      <input
                        type="text"
                        value={registerForm.vehicleModel}
                        onChange={(e) => setRegisterForm({ ...registerForm, vehicleModel: e.target.value })}
                        placeholder="যেমন: বাজাজ ডিসকভার / এসি প্রাইভেট কার"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-800 mb-1">
                        গাড়ির প্লেট নম্বর
                      </label>
                      <input
                        type="text"
                        value={registerForm.plateNumber}
                        onChange={(e) => setRegisterForm({ ...registerForm, plateNumber: e.target.value })}
                        placeholder="যেমন: ময়মনসিংহ-হ-১২-৩৪৫৬"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  </div>

                  {/* Stand Selection */}
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      প্রধান স্ট্যান্ড <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={registerForm.standName}
                      onChange={(e) => setRegisterForm({ ...registerForm, standName: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      {stands.map(stand => (
                        <option key={stand.id} value={stand.bengaliName}>{stand.bengaliName}</option>
                      ))}
                    </select>
                  </div>

                  {/* BRTA Motor Vehicle Search Credentials & Lightweight Tax Token Receipt Photo */}
                  <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-2xl space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 font-bold text-xs text-emerald-950">
                        <Car className="w-4 h-4 text-emerald-700" />
                        <span>মোটরযান অনুসন্ধান তথ্য (বিআরটিএ পোর্টাল যাচাই)</span>
                      </div>
                      <span className="text-[10px] text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded font-bold">
                        ৪টি আবশ্যক তথ্য
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-800 mb-1">
                          রেজিস্ট্রেশন নম্বর (শেষ চার সংখ্যা) <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          maxLength={4}
                          value={registerForm.regLastFour}
                          onChange={(e) => setRegisterForm({ ...registerForm, regLastFour: e.target.value.replace(/[^0-9]/g, '') })}
                          placeholder="যেমন: ৫২০৬"
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-800 mb-1">
                          উৎপাদনের বছর (YYYY) <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          maxLength={4}
                          value={registerForm.manufacturingYear}
                          onChange={(e) => setRegisterForm({ ...registerForm, manufacturingYear: e.target.value.replace(/[^0-9]/g, '') })}
                          placeholder="YYYY যেমন: ২০২১"
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-800 mb-1">
                          চ্যাসিস নম্বর <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={registerForm.chassisNumber}
                          onChange={(e) => setRegisterForm({ ...registerForm, chassisNumber: e.target.value })}
                          placeholder="যেমন: MD2A15BY4N123456"
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 uppercase"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-800 mb-1">
                          ইঞ্জিন নম্বর / মোটর নম্বর <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={registerForm.engineNumber}
                          onChange={(e) => setRegisterForm({ ...registerForm, engineNumber: e.target.value })}
                          placeholder="যেমন: JA15EQ12345"
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 uppercase"
                        />
                      </div>
                    </div>

                    {/* Tax Token Receipt Photo Uploader (Lightweight Canvas Compression) */}
                    <div className="pt-2 border-t border-emerald-200/70 space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] font-bold text-slate-800">
                        <span className="flex items-center gap-1">
                          <FileText className="w-3.5 h-3.5 text-emerald-700" />
                          সর্বশেষ ট্যাক্স টোকেন রিসিটের ছবি (ঐচ্ছিক/প্রয়োজনীয়)
                        </span>
                        {taxTokenSizeKb !== null && (
                          <span className="text-[10px] text-emerald-800 bg-emerald-100 px-1.5 py-0.2 rounded font-black">
                            ⚡ মাত্র {taxTokenSizeKb} KB (অপ্টিমাইজড)
                          </span>
                        )}
                      </div>

                      {!registerForm.taxTokenReceiptPhoto ? (
                        <label className="flex flex-col items-center justify-center p-3 border-2 border-dashed border-emerald-300 hover:border-emerald-500 bg-white rounded-xl cursor-pointer transition text-center group">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleTaxTokenPhotoUpload}
                            className="hidden"
                          />
                          <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800 group-hover:text-emerald-900">
                            <Camera className="w-4 h-4 text-emerald-600" />
                            <span>ট্যাক্স টোকেন রিসিটের ছবি তুলুন বা সিলেক্ট করুন</span>
                          </div>
                          <span className="text-[10px] text-slate-500 mt-0.5">
                            (অটো-কম্প্রেশন: ছবি স্বয়ংক্রিয়ভাবে ছোট হয়ে স্টোরেজের কোনো ক্ষতি করবে না)
                          </span>
                          {taxTokenUploadLoading && (
                            <span className="text-[10px] text-blue-600 font-bold mt-1">প্রসেস হচ্ছে...</span>
                          )}
                        </label>
                      ) : (
                        <div className="flex items-center justify-between p-2 bg-white rounded-xl border border-emerald-300">
                          <div className="flex items-center gap-2">
                            <img
                              src={registerForm.taxTokenReceiptPhoto}
                              alt="ট্যাক্স টোকেন প্রিভিউ"
                              className="w-12 h-12 object-cover rounded-lg border border-slate-200"
                            />
                            <div>
                              <p className="text-xs font-bold text-emerald-950">✓ ছবি সংযুক্ত হয়েছে</p>
                              <p className="text-[10px] text-slate-500">
                                সাইজ: {taxTokenSizeKb || 30} KB • স্টোরেজ সম্পূর্ণ নিরাপদ
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setRegisterForm({ ...registerForm, taxTokenReceiptPhoto: '' });
                              setTaxTokenSizeKb(null);
                            }}
                            className="text-xs text-red-600 hover:text-red-800 font-bold px-2 py-1 rounded-lg hover:bg-red-50 cursor-pointer"
                          >
                            মুছুন
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-2 flex items-center justify-between gap-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => {
                        setRegisterModalTab('status_check');
                        if (activeSubmittedDriverId) {
                          const found = drivers.find(d => d.id === activeSubmittedDriverId);
                          if (found) setStatusCheckResult(found);
                        }
                      }}
                      className="text-xs text-blue-700 hover:underline font-bold cursor-pointer"
                    >
                      পূর্বের আবেদন চেক করুন
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setIsRegisterModalOpen(false)}
                        className="px-3 py-2 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-100 cursor-pointer"
                      >
                        বাতিল
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-md cursor-pointer flex items-center gap-1.5"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>আবেদন জমা দিন (যাচাইকরণে পাঠান)</span>
                      </button>
                    </div>
                  </div>
                </form>
              )}

              {/* TAB 2: VERIFICATION STATUS TRACKER (PENDING PROCESS & SUCCESS MESSAGE SCREENS) */}
              {registerModalTab === 'status_check' && (() => {
                const targetDriver = (activeSubmittedDriverId ? drivers.find(d => d.id === activeSubmittedDriverId) : null) || statusCheckResult;

                return (
                  <div className="space-y-4">
                    {/* Search Bar for Driver Application */}
                    <form onSubmit={handleSearchVerificationStatus} className="bg-slate-50 p-3 rounded-2xl border border-slate-200 space-y-2">
                      <label className="block text-xs font-bold text-slate-800">
                        আবেদনের রেফারেন্স আইডি বা মোবাইল নম্বর দিয়ে যাচাই করুন:
                      </label>
                      <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            value={statusCheckQuery}
                            onChange={(e) => setStatusCheckQuery(e.target.value)}
                            placeholder="যেমন: SAFAR-REG-XXXX বা ০১৭১১..."
                            className="w-full pl-8 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          />
                        </div>
                        <button
                          type="submit"
                          className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shrink-0 cursor-pointer transition-colors"
                        >
                          স্ট্যাটাস দেখুন
                        </button>
                      </div>

                      {statusCheckError && (
                        <p className="text-[11px] text-red-600 font-semibold">{statusCheckError}</p>
                      )}
                    </form>

                    {targetDriver ? (() => {
                      const isAll3Verified = Boolean(targetDriver.licenseVerified && targetDriver.phoneVerified && targetDriver.nidVerified);

                      return (
                        <div className="space-y-3 animate-in fade-in">
                          {/* Top Card: Application Details */}
                          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-start justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="font-bold text-slate-900 text-sm">{targetDriver.name}</h4>
                                <span className="text-[10px] font-mono font-bold bg-slate-200 text-slate-800 px-2 py-0.5 rounded-md">
                                  {targetDriver.regAppId || 'SAFAR-REG-APP'}
                                </span>
                              </div>
                              <p className="text-xs text-slate-600 mt-0.5">
                                মোবাইল: {targetDriver.phone} • {targetDriver.categoryBengali} • {targetDriver.standName}
                              </p>
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                // Force reload latest driver from state
                                const fresh = drivers.find(d => d.id === targetDriver.id);
                                if (fresh) setStatusCheckResult(fresh);
                                showAdminToastMessage('লাইভ স্ট্যাটাস আপডেট সম্পন্ন হয়েছে');
                              }}
                              className="px-2 py-1 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 rounded-lg text-[10.5px] font-bold flex items-center gap-1 cursor-pointer shadow-xs"
                              title="রিফ্রেশ করুন"
                            >
                              <RefreshCw className="w-3 h-3 text-emerald-600" />
                              <span>রিফ্রেশ</span>
                            </button>
                          </div>

                          {/* CASE 1: VERIFICATION SUCCESSFUL MESSAGE (ভেরিফিকেশন সফল মেসেজ) */}
                          {isAll3Verified ? (
                            <div className="p-4 sm:p-5 rounded-2xl bg-emerald-50/90 border-2 border-emerald-500 shadow-md text-emerald-950 space-y-3 text-center">
                              <div className="w-14 h-14 bg-emerald-600 text-white rounded-full flex items-center justify-center mx-auto shadow-lg animate-bounce">
                                <ShieldCheck className="w-8 h-8" />
                              </div>

                              <div>
                                <h4 className="text-base sm:text-lg font-black text-emerald-900">
                                  🎉 ভেরিফিকেশন সফল হয়েছে! (সম্পূর্ণ অ্যাক্টিভ)
                                </h4>
                                <p className="text-xs text-emerald-800 mt-1 leading-relaxed max-w-md mx-auto">
                                  অভিনন্দন! আপনার বিআরটিএ ড্রাইভিং লাইসেন্স, সক্রিয় হোয়াটসঅ্যাপ ও জাতীয় পরিচয়পত্র (NID) অ্যাডমিন দ্বারা সফলভাবে অনুমোদিত হয়েছে। আপনার প্রোফাইল এখন লাইভ।
                                </p>
                              </div>

                              {/* 3 Verified Badges */}
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-left pt-1">
                                <div className="p-2.5 rounded-xl bg-white border border-emerald-200">
                                  <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-800">
                                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                                    <span>BRTA লাইসেন্স</span>
                                  </div>
                                  <p className="text-[10px] text-slate-600 font-mono mt-0.5">{targetDriver.licenseNumber}</p>
                                  <span className="text-[9.5px] font-bold text-emerald-700">ভেরিফাইড ✅</span>
                                </div>

                                <div className="p-2.5 rounded-xl bg-white border border-emerald-200">
                                  <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-800">
                                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                                    <span>WhatsApp ফোন</span>
                                  </div>
                                  <p className="text-[10px] text-slate-600 font-mono mt-0.5">{targetDriver.phone}</p>
                                  <span className="text-[9.5px] font-bold text-emerald-700">ভেরিফাইড ✅</span>
                                </div>

                                <div className="p-2.5 rounded-xl bg-white border border-emerald-200">
                                  <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-800">
                                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                                    <span>জাতীয় পরিচয়পত্র</span>
                                  </div>
                                  <p className="text-[10px] text-slate-600 font-mono mt-0.5">{targetDriver.nidNumber}</p>
                                  <span className="text-[9.5px] font-bold text-emerald-700">ভেরিফাইড ✅</span>
                                </div>
                              </div>

                              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setUserRole('driver');
                                    sounds.unlockAudio();
                                    highPriorityNotifications.requestPermission().catch(() => {});
                                    setIsRegisterModalOpen(false);
                                    showAdminToastMessage(`স্বাগতম ${targetDriver.name}! আপনি চালক মোডে প্রবেশ করেছেন`);
                                  }}
                                  className="w-full sm:w-auto px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-md cursor-pointer transition-all active:scale-95"
                                >
                                  চালকের ড্যাশবোর্ডে প্রবেশ করুন
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setIsRegisterModalOpen(false)}
                                  className="w-full sm:w-auto px-4 py-2.5 bg-white border border-slate-300 text-slate-700 font-bold text-xs rounded-xl hover:bg-slate-100 cursor-pointer"
                                >
                                  বন্ধ করুন
                                </button>
                              </div>
                            </div>
                          ) : (
                            /* CASE 2: PENDING PROCESS MESSAGE (পেন্ডিং প্রসেস মেসেজ) */
                            <div className="p-4 sm:p-5 rounded-2xl bg-amber-50/90 border-2 border-amber-400 shadow-md text-amber-950 space-y-3.5">
                              <div className="flex items-start gap-3">
                                <div className="w-10 h-10 bg-amber-500 text-white rounded-xl flex items-center justify-center shrink-0 shadow-md">
                                  <Clock className="w-5 h-5 animate-spin" style={{ animationDuration: '6s' }} />
                                </div>
                                <div className="min-w-0">
                                  <h4 className="text-sm sm:text-base font-black text-amber-950">
                                    ⏳ আবেদন গৃহীত হয়েছে — ভেরিফিকেশন প্রক্রিয়াধীন রয়েছে
                                  </h4>
                                  <p className="text-xs text-amber-900 mt-0.5 leading-relaxed">
                                    আপনার প্রদত্ত তথ্যসমূহ সফলভাবে কেন্দ্রীয় অ্যাডমিন প্যানেলে পাঠানো হয়েছে। নিরাপত্তা বিধি অনুসারে ৩টি ধাপের প্রতিটি আলাদাভাবে যাচাই শেষ না হওয়া পর্যন্ত অ্যাকাউন্ট পেন্ডিং থাকবে।
                                  </p>
                                </div>
                              </div>

                              {/* 3 Mandatory Progress Steps Tracker */}
                              <div className="space-y-2 pt-1">
                                <p className="text-xs font-bold text-slate-700">
                                  ৩টি আবশ্যিক নিরাপত্তা ধাপের লাইভ অবস্থা ({[targetDriver.licenseVerified, targetDriver.phoneVerified, targetDriver.nidVerified].filter(Boolean).length}/৩ সম্পন্ন):
                                </p>

                                {/* Step 1: BRTA Driving License */}
                                <div className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 ${
                                  targetDriver.licenseVerified ? 'bg-emerald-50 border-emerald-300 text-emerald-950' : 'bg-white border-amber-200 text-slate-800'
                                }`}>
                                  <div className="flex items-center gap-2 min-w-0">
                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
                                      targetDriver.licenseVerified ? 'bg-emerald-600 text-white' : 'bg-amber-200 text-amber-900'
                                    }`}>
                                      ১
                                    </div>
                                    <div className="min-w-0">
                                      <p className="text-xs font-bold truncate">BRTA ড্রাইভিং লাইসেন্স যাচাই</p>
                                      <p className="text-[10px] text-slate-500 font-mono truncate">{targetDriver.licenseNumber}</p>
                                    </div>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => handleOpenVerificationGate(targetDriver, 'brta')}
                                    className={`text-[10.5px] font-bold px-2 py-0.5 rounded-md shrink-0 border transition cursor-pointer flex items-center gap-1 ${
                                      targetDriver.licenseVerified ? 'bg-emerald-100 text-emerald-800 border-emerald-300 hover:bg-emerald-200' : 'bg-amber-100 text-amber-900 border-amber-300 hover:bg-amber-200 animate-pulse'
                                    }`}
                                    title="ক্লিক করে BRTA লাইসেন্স ভেরিফিকেশন গেটওয়ে দেখুন"
                                  >
                                    {targetDriver.licenseVerified ? '✅ অনুমোদিত (গেটওয়ে)' : '⚡ সরকারি পোর্টালে যাচাই'}
                                  </button>
                                </div>

                                {/* Step 2: WhatsApp & Phone */}
                                <div className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 ${
                                  targetDriver.phoneVerified ? 'bg-emerald-50 border-emerald-300 text-emerald-950' : 'bg-white border-amber-200 text-slate-800'
                                }`}>
                                  <div className="flex items-center gap-2 min-w-0">
                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
                                      targetDriver.phoneVerified ? 'bg-emerald-600 text-white' : 'bg-amber-200 text-amber-900'
                                    }`}>
                                      ২
                                    </div>
                                    <div className="min-w-0">
                                      <p className="text-xs font-bold truncate">হোয়াটসঅ্যাপ মোবাইল নম্বর যাচাই</p>
                                      <p className="text-[10px] text-slate-500 font-mono truncate">{targetDriver.phone}</p>
                                    </div>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => handleOpenVerificationGate(targetDriver, 'wa')}
                                    className={`text-[10.5px] font-bold px-2 py-0.5 rounded-md shrink-0 border transition cursor-pointer flex items-center gap-1 ${
                                      targetDriver.phoneVerified ? 'bg-emerald-100 text-emerald-800 border-emerald-300 hover:bg-emerald-200' : 'bg-amber-100 text-amber-900 border-amber-300 hover:bg-amber-200 animate-pulse'
                                    }`}
                                    title="ক্লিক করে WhatsApp ও OTP ভেরিফিকেশন গেটওয়ে দেখুন"
                                  >
                                    {targetDriver.phoneVerified ? '✅ অনুমোদিত (গেটওয়ে)' : '⚡ কল ও ওটিপি পাঠান'}
                                  </button>
                                </div>

                                {/* Step 3: NID */}
                                <div className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 ${
                                  targetDriver.nidVerified ? 'bg-emerald-50 border-emerald-300 text-emerald-950' : 'bg-white border-amber-200 text-slate-800'
                                }`}>
                                  <div className="flex items-center gap-2 min-w-0">
                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
                                      targetDriver.nidVerified ? 'bg-emerald-600 text-white' : 'bg-amber-200 text-amber-900'
                                    }`}>
                                      ৩
                                    </div>
                                    <div className="min-w-0">
                                      <p className="text-xs font-bold truncate">জাতীয় পরিচয়পত্র (NID) ডাটাবেজ মিলকরণ</p>
                                      <p className="text-[10px] text-slate-500 font-mono truncate">{targetDriver.nidNumber}</p>
                                    </div>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => handleOpenVerificationGate(targetDriver, 'nid')}
                                    className={`text-[10.5px] font-bold px-2 py-0.5 rounded-md shrink-0 border transition cursor-pointer flex items-center gap-1 ${
                                      targetDriver.nidVerified ? 'bg-emerald-100 text-emerald-800 border-emerald-300 hover:bg-emerald-200' : 'bg-amber-100 text-amber-900 border-amber-300 hover:bg-amber-200 animate-pulse'
                                    }`}
                                    title="ক্লিক করে নির্বাচন কমিশন NID ভেরিফিকেশন গেটওয়ে দেখুন"
                                  >
                                    {targetDriver.nidVerified ? '✅ অনুমোদিত (গেটওয়ে)' : '⚡ NID ডাটাবেস যাচাই'}
                                  </button>
                                </div>
                              </div>

                              <div className="p-2.5 bg-amber-100/70 rounded-xl text-[11px] text-amber-900 space-y-1">
                                <p className="font-bold flex items-center gap-1">
                                  <Info className="w-3.5 h-3.5 text-amber-700" />
                                  <span>পরবর্তী করণীয়:</span>
                                </p>
                                <p className="leading-relaxed pl-4.5">
                                  অ্যাডমিন টিম সাধারণত ৩০ মিনিটের মধ্যে আবেদন যাচাই সম্পন্ন করেন। যাচাই শেষ হওয়া মাত্র এই পেজে স্বয়ংক্রিয়ভাবে 'ভেরিফিকেশন সফল মেসেজ' দৃশ্যমান হবে।
                                </p>
                              </div>

                              <div className="pt-1 flex items-center justify-between gap-2">
                                <button
                                  type="button"
                                  onClick={() => setRegisterModalTab('register')}
                                  className="text-xs text-slate-600 hover:text-slate-900 font-bold underline cursor-pointer"
                                >
                                  নতুন আবেদন ফরম
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setIsRegisterModalOpen(false)}
                                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer"
                                >
                                  ঠিক আছে (বন্ধ করুন)
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })() : (
                      <div className="text-center py-10 bg-slate-50 rounded-2xl border border-dashed border-slate-300 text-slate-500 space-y-2">
                        <IdCard className="w-8 h-8 mx-auto text-slate-400" />
                        <p className="text-xs font-bold text-slate-700">কোনো সক্রিয় আবেদন নির্বাচিত নেই</p>
                        <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
                          উপরে আপনার আবেদনের রেফারেন্স আইডি বা মোবাইল নম্বর লিখে খুঁজুন অথবা নতুন আবেদন জমা দিন।
                        </p>
                        <button
                          type="button"
                          onClick={() => setRegisterModalTab('register')}
                          className="mt-2 inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                          <span>নতুন চালক নিবন্ধন করুন</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>

          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 5.5 PASSENGER PORTAL & TRIP HISTORY MODAL (যাত্রার ইতিহাস ও অ্যাকাউন্ট) */}
      {/* ============================================================== */}
      {showPassengerModal && (
        <div 
          className="fixed inset-0 z-[99999] bg-black/65 backdrop-blur-sm overflow-y-auto p-2 sm:p-4 flex flex-col items-center justify-start sm:justify-center"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-lg bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 my-auto sm:my-6 flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95">
            
            {/* Sticky Header */}
            <div className="bg-emerald-800 text-white p-3.5 sm:p-4 flex items-center justify-between shrink-0 border-b border-emerald-900">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center shrink-0">
                  <History className="w-4 h-4 sm:w-5 sm:h-5 text-slate-950" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold leading-tight">
                    যাত্রীর ড্যাশবোর্ড ও যাত্রার ইতিহাস
                  </h3>
                  <p className="text-[10px] sm:text-[11px] text-emerald-200">
                    আপনার সম্পন্ন হওয়া সকল রাইডের রেকর্ড ও তথ্য
                  </p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setShowPassengerModal(false)}
                className="text-white/80 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                aria-label="বন্ধ করুন"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tab Switcher: যাত্রার ইতিহাস vs আমার প্রোফাইল */}
            <div className="flex border-b border-slate-200 bg-slate-50 shrink-0">
              <button
                type="button"
                onClick={() => setPassengerTab('history')}
                className={`flex-1 py-2.5 text-xs font-bold flex items-center justify-center gap-1.5 border-b-2 cursor-pointer transition-colors ${
                  passengerTab === 'history'
                    ? 'border-emerald-600 text-emerald-800 bg-white'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <History className="w-3.5 h-3.5 text-emerald-600" />
                <span>পূর্বের যাত্রার ইতিহাস ({tripHistory.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setPassengerTab('profile')}
                className={`flex-1 py-2.5 text-xs font-bold flex items-center justify-center gap-1.5 border-b-2 cursor-pointer transition-colors ${
                  passengerTab === 'profile'
                    ? 'border-emerald-600 text-emerald-800 bg-white'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <User className="w-3.5 h-3.5 text-emerald-600" />
                <span>যাত্রী প্রোফাইল ও লগইন</span>
              </button>
            </div>

            {/* Content Body */}
            <div className="flex-1 overflow-y-auto p-3.5 sm:p-5 bg-slate-50 text-slate-900">
              {passengerTab === 'history' ? (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 px-1">
                    <span>সর্বমোট সম্পন্ন ট্রিপ: <b>{tripHistory.length} টি</b> (ভাড়া: <b>৳ {tripHistory.reduce((acc, t) => acc + t.fare, 0)}</b>)</span>
                    {tripHistory.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm('আপনি কি পূর্ববর্তী যাত্রার সম্পূর্ণ ইতিহাস পরিষ্কার করতে চান?')) {
                            const cleared = getClearedTripIds();
                            tripHistory.forEach(t => cleared.add(t.id));
                            saveClearedTripIds(cleared);
                            setTripHistory([]);
                            localStorage.removeItem('safar_trip_history_v7');
                            localStorage.removeItem('safar_trip_history_v6');
                            localStorage.removeItem('safar_passenger_trips');
                            if (passengerProfile.phone) {
                              try {
                                const q = query(collection(db, `users/${passengerProfile.phone}/trips`));
                                getDocs(q).then(snap => {
                                  snap.docs.forEach(d => deleteDoc(doc(db, `users/${passengerProfile.phone}/trips`, d.id)).catch(() => {}));
                                }).catch(() => {});
                              } catch (e) {}
                            }
                            showAdminToastMessage('যাত্রার ইতিহাস সম্পূর্ণ পরিষ্কার করা হয়েছে');
                          }
                        }}
                        className="text-[11px] text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 px-2.5 py-1 rounded-lg font-bold transition cursor-pointer flex items-center gap-1"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>ইতিহাস মুছে ফেলুন</span>
                      </button>
                    )}
                  </div>

                  {tripHistory.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-3 shadow-xs">
                      <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto text-2xl border border-emerald-100">
                        🛵
                      </div>
                      <h4 className="font-extrabold text-slate-800 text-sm sm:text-base">কোনো পূর্ববর্তী যাত্রার রেকর্ড পাওয়া যায়নি</h4>
                      <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                        আপনি এখনও কোনো ট্রিপ সম্পন্ন করেননি। গফরগাঁও বা পাগলা উপজেলায় কোনো রাইড বুকিং ও যাত্রা সম্পন্ন করলে আপনার ডিজিটাল রসিদ, ভাড়া ও চালকের বিবরণ স্বয়ংক্রিয়ভাবে এখানে এবং ফায়ারস্টোর ক্লাউডে সংরক্ষিত হবে।
                      </p>
                      <button
                        type="button"
                        onClick={() => setShowPassengerModal(false)}
                        className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold cursor-pointer transition shadow-xs"
                      >
                        <span>নতুন যাত্রা শুরু করুন</span>
                      </button>
                    </div>
                  ) : (
                    tripHistory.map((trip) => (
                      <div 
                        key={trip.id} 
                        className="bg-white rounded-xl sm:rounded-2xl border border-slate-200 p-3 sm:p-3.5 shadow-xs space-y-2 hover:border-emerald-300 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <CategoryBadgeLogo category={trip.vehicleCategory} size="compact" />
                            <div>
                              <span className="text-[10px] text-slate-400 block">{trip.date}</span>
                              <h4 className="text-xs sm:text-sm font-bold text-slate-900 leading-snug">
                                {trip.driverName}
                              </h4>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="bg-emerald-100 text-emerald-800 font-extrabold text-xs px-2 py-0.5 rounded-md inline-block">
                              ৳ {trip.fare}
                            </span>
                            <span className="text-[9.5px] font-bold text-emerald-700 block mt-0.5">
                              {trip.status} ✅
                            </span>
                          </div>
                        </div>

                        {/* Route */}
                        <div className="bg-slate-50 rounded-lg p-2 text-xs border border-slate-100 space-y-1">
                          <div className="flex items-center gap-1.5 text-slate-700">
                            <MapPin className="w-3 h-3 text-emerald-600 shrink-0" />
                            <span className="text-[11px] text-slate-500">শুরুর স্থান:</span>
                            <span className="text-[11px] font-semibold text-slate-800 truncate">{trip.pickupPoint}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-slate-700">
                            <Navigation className="w-3 h-3 text-blue-600 shrink-0" />
                            <span className="text-[11px] text-slate-500">গন্তব্য:</span>
                            <span className="text-[11px] font-semibold text-slate-800 truncate">{trip.destination}</span>
                          </div>
                        </div>

                        {/* Driver info & action (100% Dynamic Vehicle & Non-breaking Registration Plate) */}
                        {(() => {
                          const matchedDriver = drivers.find(d => 
                            (trip.driverPhone && d.phone && d.phone.replace(/[^0-9]/g, '') === trip.driverPhone.replace(/[^0-9]/g, '')) ||
                            (trip.driverName && d.name && d.name.trim().toLowerCase() === trip.driverName.trim().toLowerCase())
                          );
                          const cleanPlate = (trip.plateNumber && !trip.plateNumber.includes('১২-৩৪৫৬') && trip.plateNumber.trim() !== '')
                            ? trip.plateNumber
                            : (matchedDriver?.plateNumber || trip.plateNumber || 'নিবন্ধিত নম্বর');
                          const cleanModel = (trip.vehicleModel && trip.vehicleModel.trim() !== '')
                            ? trip.vehicleModel
                            : (matchedDriver?.vehicleModel || 'বাহন');

                          return (
                            <div className="flex items-center justify-between pt-1.5 border-t border-slate-100 text-[11px] gap-2">
                              <div className="min-w-0 flex-1 overflow-hidden">
                                <PauseMarqueeText
                                  text={`${cleanModel} • ${cleanPlate}`}
                                  className="text-[11px] font-bold text-slate-800"
                                  pauseSec={1.5}
                                />
                              </div>
                              <a
                                href={`tel:${trip.driverPhone}`}
                                className="inline-flex items-center gap-1 text-emerald-700 hover:text-emerald-800 font-bold bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-md border border-emerald-200 shrink-0 text-xs shadow-2xs transition"
                              >
                                <PhoneCall className="w-3 h-3" />
                                <span className="whitespace-nowrap">পুনরায় কল</span>
                              </a>
                            </div>
                          );
                        })()}
                      </div>
                    ))
                  )}
                </div>
              ) : (
                /* Passenger Profile Tab with Dynamic Edit & Auto-Sync */
                <div className="space-y-3.5">
                  <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-3">
                    
                    {profileSaveToast && (
                      <div className="p-2.5 bg-emerald-50 text-emerald-800 border border-emerald-300 rounded-xl text-xs flex items-center gap-2 animate-in fade-in">
                        <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span className="font-bold">আপনার তথ্য সফলভাবে ব্রাউজারে সংরক্ষিত হয়েছে!</span>
                      </div>
                    )}

                  {!passengerProfile.isLoggedIn ? (
                    <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs space-y-3.5">
                      {/* Top Header */}
                      <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xl border border-emerald-200 shrink-0">
                          👤
                        </div>
                        <div>
                          <h4 className="font-extrabold text-slate-900 text-sm sm:text-base">
                            {passengerAuthMode === 'signup' ? 'নতুন যাত্রী প্রোফাইল সাইন আপ' : 'পূর্বের একাউন্টে লগইন'}
                          </h4>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {passengerAuthMode === 'signup'
                              ? 'গফরগাঁও ও পাগলা থানা এলাকার নিরাপদ যাতায়াতে তথ্য দিয়ে অ্যাকাউন্ট তৈরি করুন'
                              : 'যে কোনো ডিভাইস থেকে আপনার সংরক্ষিত প্রোফাইল ও পূর্বের রাইড ইতিহাস ফিরে পান'}
                          </p>
                        </div>
                      </div>

                      {/* 2 Separate Options: <sign up> | <login> */}
                      <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-xl border border-slate-200">
                        <button
                          type="button"
                          onClick={() => {
                            setPassengerAuthMode('signup');
                            setPassengerAuthError(null);
                          }}
                          className={`py-2 text-xs font-black rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                            passengerAuthMode === 'signup'
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          <UserPlus className="w-3.5 h-3.5" />
                          <span>সাইন আপ (Sign Up)</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setPassengerAuthMode('login');
                            setPassengerAuthError(null);
                          }}
                          className={`py-2 text-xs font-black rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                            passengerAuthMode === 'login'
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          <LogIn className="w-3.5 h-3.5" />
                          <span>লগইন (Login)</span>
                        </button>
                      </div>

                      {/* Error Banner */}
                      {passengerAuthError && (
                        <div className="p-2.5 bg-red-50 text-red-800 border border-red-200 rounded-xl text-xs flex items-center gap-2 animate-in fade-in">
                          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                          <span className="font-semibold">{passengerAuthError}</span>
                        </div>
                      )}

                      {/* SIGN UP FORM */}
                      {passengerAuthMode === 'signup' ? (
                        <form onSubmit={handlePassengerSignUpSubmit} className="space-y-3 text-xs">
                          <div>
                            <label className="font-bold text-slate-700 block mb-1">আপনার পূর্ণ নাম: *</label>
                            <input
                              type="text"
                              value={passengerLoginForm.name}
                              onChange={(e) => setPassengerLoginForm({ ...passengerLoginForm, name: e.target.value })}
                              placeholder="যেমন: তানভীর আহমেদ"
                              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold"
                              required
                            />
                          </div>

                          <div>
                            <label className="font-bold text-slate-700 block mb-1">আপনার মোবাইল নম্বর (WhatsApp সক্রিয় নম্বর বাধ্যতামূলক): *</label>
                            <input
                              type="tel"
                              value={passengerLoginForm.phone}
                              onChange={(e) => setPassengerLoginForm({ ...passengerLoginForm, phone: e.target.value })}
                              placeholder="০১XXXXXXXXX"
                              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                              required
                            />
                          </div>

                          <div>
                            <label className="font-bold text-slate-700 block mb-1">৪-ডিজিটের সিকিউরিটি পিন (PIN) তৈরি করুন: *</label>
                            <div className="relative">
                              <Lock className="w-4 h-4 text-emerald-600 absolute left-3 top-2.5" />
                              <input
                                type="password"
                                maxLength={6}
                                value={passengerLoginForm.pin}
                                onChange={(e) => setPassengerLoginForm({ ...passengerLoginForm, pin: e.target.value })}
                                placeholder="৪-ডিজিটের পিন যেমন: ১২৩৪"
                                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-mono text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                required
                              />
                            </div>
                            <p className="text-[10px] text-slate-500 mt-0.5">যেকোনো ডিভাইসে নিরাপদে লগইন করার জন্য এই পিন ব্যবহৃত হবে।</p>
                          </div>

                          <div>
                            <label className="font-bold text-slate-700 block mb-1">নিয়মিত ঠিকানা / প্রিয় স্থান (ঐচ্ছিক):</label>
                            <input
                              type="text"
                              value={passengerLoginForm.homeLocation}
                              onChange={(e) => setPassengerLoginForm({ ...passengerLoginForm, homeLocation: e.target.value })}
                              placeholder="যেমন: পৌরসভা চত্বর, গফরগাঁও"
                              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            />
                          </div>

                          <div>
                            <label className="font-bold text-slate-700 block mb-1">জরুরি পারিবারিক কন্টাক্ট নম্বর (ঐচ্ছিক):</label>
                            <input
                              type="text"
                              value={passengerLoginForm.emergencyContact}
                              onChange={(e) => setPassengerLoginForm({ ...passengerLoginForm, emergencyContact: e.target.value })}
                              placeholder="যেমন: ০১৭০০-১১২২৩৩ (পরিবার)"
                              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            />
                          </div>

                          <button
                            type="submit"
                            disabled={isPassengerAuthLoading}
                            className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl text-xs sm:text-sm shadow-xs cursor-pointer transition active:scale-95 flex items-center justify-center gap-2"
                          >
                            {isPassengerAuthLoading ? (
                              <>
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                <span>অ্যাকাউন্ট তৈরি হচ্ছে...</span>
                              </>
                            ) : (
                              <>
                                <UserPlus className="w-4 h-4" />
                                <span>নতুন একাউন্ট সাইন আপ করুন</span>
                              </>
                            )}
                          </button>

                          <div className="text-center pt-1 border-t border-slate-100">
                            <button
                              type="button"
                              onClick={() => {
                                setPassengerAuthMode('login');
                                setPassengerAuthError(null);
                              }}
                              className="text-emerald-700 hover:text-emerald-800 text-[11px] font-bold cursor-pointer"
                            >
                              পূর্বে তৈরি করা অ্যাকাউন্ট আছে? <strong>এখানে লগইন করুন</strong>
                            </button>
                          </div>
                        </form>
                      ) : (
                        /* LOGIN FORM */
                        <form onSubmit={handlePassengerLoginSubmit} className="space-y-3.5 text-xs">
                          <div>
                            <label className="font-bold text-slate-700 block mb-1">আপনার নিবন্ধিত মোবাইল নম্বর (১১ ডিজিট): *</label>
                            <div className="relative">
                              <Phone className="w-4 h-4 text-emerald-600 absolute left-3 top-2.5" />
                              <input
                                type="tel"
                                value={passengerLoginPhone}
                                onChange={(e) => setPassengerLoginPhone(e.target.value)}
                                placeholder="০১XXXXXXXXX"
                                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-mono text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                required
                              />
                            </div>
                          </div>

                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <label className="font-bold text-slate-700 block text-xs">৪-ডিজিটের সিকিউরিটি পিন (PIN): *</label>
                              <button
                                type="button"
                                onClick={() => handleTriggerInstantOtp('passenger', passengerLoginPhone)}
                                className="text-emerald-700 hover:text-emerald-900 font-extrabold text-[10.5px] cursor-pointer hover:underline"
                              >
                                🔑 পিন মনে নেই? WhatsApp দিয়ে পিন রিকভার করুন
                              </button>
                            </div>
                            <div className="relative">
                              <Lock className="w-4 h-4 text-emerald-600 absolute left-3 top-2.5" />
                              <input
                                type="password"
                                maxLength={6}
                                value={passengerLoginPin}
                                onChange={(e) => setPassengerLoginPin(e.target.value)}
                                placeholder="৪-ডিজিটের পিন দিন (যেমন: ১২৩৪)"
                                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-mono text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                required
                              />
                            </div>
                            <p className="text-[10px] text-slate-500 mt-1">
                              পূর্বে যেকোনো ডিভাইস থেকে যে ৪-ডিজিটের পিন সেট করেছিলেন তা দিন।
                            </p>
                          </div>

                          <button
                            type="submit"
                            disabled={isPassengerAuthLoading}
                            className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl text-xs sm:text-sm shadow-xs cursor-pointer transition active:scale-95 flex items-center justify-center gap-2"
                          >
                            {isPassengerAuthLoading ? (
                              <>
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                <span>লগইন যাচাই হচ্ছে...</span>
                              </>
                            ) : (
                              <>
                                <LogIn className="w-4 h-4" />
                                <span>অ্যাকাউন্টে লগইন করুন</span>
                              </>
                            )}
                          </button>

                          <div className="text-center pt-1 border-t border-slate-100">
                            <button
                              type="button"
                              onClick={() => {
                                setPassengerAuthMode('signup');
                                setPassengerAuthError(null);
                              }}
                              className="text-emerald-700 hover:text-emerald-800 text-[11px] font-bold cursor-pointer"
                            >
                              নতুন যাত্রী? <strong>এখানে সাইন আপ করুন</strong>
                            </button>
                          </div>
                        </form>
                      )}
                    </div>
                  ) : (
                    <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 rounded-2xl bg-emerald-600 text-white font-bold text-lg flex items-center justify-center shadow-md">
                            👤
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <h4 className="font-bold text-slate-900 text-sm sm:text-base">{passengerProfile.name}</h4>
                              <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                                লগইন সক্রিয়
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                              <Phone className="w-3 h-3 text-emerald-600" />
                              {passengerProfile.phone}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setEditProfileForm({
                                name: passengerProfile.name,
                                phone: passengerProfile.phone,
                                homeLocation: passengerProfile.homeLocation,
                                emergencyContact: passengerProfile.emergencyContact
                              });
                              setIsEditingProfile(!isEditingProfile);
                            }}
                            className="text-[11px] font-bold px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg border border-slate-300 cursor-pointer transition-colors"
                          >
                            {isEditingProfile ? 'বাতিল' : '✏️ তথ্য পরিবর্তন'}
                          </button>
                          <button
                            type="button"
                            onClick={handlePassengerLogout}
                            className="text-[11px] font-bold px-2 py-1 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg border border-red-200 cursor-pointer transition-colors"
                            title="লগআউট করুন"
                          >
                            লগআউট
                          </button>
                        </div>
                      </div>

                      {isEditingProfile ? (
                        <form
                          onSubmit={(e) => {
                            e.preventDefault();
                            const updated = {
                              ...passengerProfile,
                              name: editProfileForm.name.trim() || passengerProfile.name,
                              phone: editProfileForm.phone.trim() || passengerProfile.phone,
                              homeLocation: editProfileForm.homeLocation.trim() || passengerProfile.homeLocation,
                              emergencyContact: editProfileForm.emergencyContact.trim() || passengerProfile.emergencyContact
                            };
                            setPassengerProfile(updated);
                            setIsEditingProfile(false);
                            setProfileSaveToast(true);
                            setDoc(doc(db, 'users', updated.phone), {
                              ...updated,
                              role: 'passenger',
                              updatedAt: new Date().toISOString()
                            }, { merge: true }).catch(() => {});
                            setTimeout(() => setProfileSaveToast(false), 3000);
                          }}
                          className="space-y-2.5 pt-3 border-t border-slate-100 text-xs"
                        >
                          <div>
                            <label className="text-[11px] font-bold text-slate-700 block mb-1">
                              আপনার নাম:
                            </label>
                            <input
                              type="text"
                              value={editProfileForm.name}
                              onChange={(e) => setEditProfileForm({ ...editProfileForm, name: e.target.value })}
                              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                              placeholder="আপনার নাম"
                              required
                            />
                          </div>

                          <div>
                            <label className="text-[11px] font-bold text-slate-700 block mb-1">
                              মোবাইল নম্বর:
                            </label>
                            <input
                              type="tel"
                              value={editProfileForm.phone}
                              onChange={(e) => setEditProfileForm({ ...editProfileForm, phone: e.target.value })}
                              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                              placeholder="০১XXXXXXXXX"
                              required
                            />
                          </div>

                          <div>
                            <label className="text-[11px] font-bold text-slate-700 block mb-1">
                              নিয়মিত ঠিকানা / প্রিয় স্থান:
                            </label>
                            <input
                              type="text"
                              value={editProfileForm.homeLocation}
                              onChange={(e) => setEditProfileForm({ ...editProfileForm, homeLocation: e.target.value })}
                              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                              placeholder="যেমন: পৌরসভা চত্বর, গফরগাঁও"
                              required
                            />
                          </div>

                          <div>
                            <label className="text-[11px] font-bold text-slate-700 block mb-1">
                              জরুরি পারিবারিক কন্টাক্ট নম্বর:
                            </label>
                            <input
                              type="text"
                              value={editProfileForm.emergencyContact}
                              onChange={(e) => setEditProfileForm({ ...editProfileForm, emergencyContact: e.target.value })}
                              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                              placeholder="যেমন: ০১৭০০-১১২২৩৩ (পরিবার)"
                              required
                            />
                          </div>

                          <button
                            type="submit"
                            className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs shadow-xs cursor-pointer transition-colors"
                          >
                            তথ্য সংরক্ষণ করুন
                          </button>
                        </form>
                      ) : (
                        <div className="space-y-2 pt-2 border-t border-slate-100 text-xs">
                          <div>
                            <label className="text-[11px] font-bold text-slate-600 block mb-1">
                              আপনার নিয়মিত ঠিকানা / প্রিয় স্থান:
                            </label>
                            <div className="p-2 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                              <span className="text-slate-800 font-medium">{passengerProfile.homeLocation}</span>
                              <span className="text-emerald-600 font-bold text-[10px]">সেভ করা</span>
                            </div>
                          </div>

                          <div>
                            <label className="text-[11px] font-bold text-slate-600 block mb-1">
                              জরুরি পারিবারিক কন্টাক্ট নম্বর:
                            </label>
                            <div className="p-2 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                              <span className="text-slate-800 font-medium">{passengerProfile.emergencyContact}</span>
                              <span className="text-emerald-600 font-bold text-[10px]">জরুরি ৯৯৯ যুক্ত</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  </div>

                  <div className="p-3 bg-blue-50 rounded-2xl border border-blue-200 text-xs text-blue-900">
                    <div className="flex items-center gap-1.5 font-bold mb-1">
                      <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
                      <span>স্বয়ংক্রিয় তথ্য সংরক্ষণ ও ভূমিকা:</span>
                    </div>
                    <p className="text-[11px] text-blue-800 leading-relaxed">
                      এখানে যাত্রী তথ্য সংরক্ষণ করলে আপনার প্রতিটি রাইড হিস্টোরি ও বুকিং স্বয়ংক্রিয়ভাবে ব্রাউজারে সংরক্ষিত থাকবে। চালক হিসেবে গাড়ি চালাতে চাইলে হেডার থেকে <b>'চালক মোড'</b> নির্বাচন করুন বা <b>'চালক নিবন্ধন'</b> বাটনে ক্লিক করে বিআরটিএ লাইসেন্স দিয়ে যুক্ত হোন।
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-3 bg-white border-t border-slate-200 text-center shrink-0">
              <button
                type="button"
                onClick={() => setShowPassengerModal(false)}
                className="w-full py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-xs shadow-xs cursor-pointer"
              >
                বন্ধ করুন
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 6. CLEAN FOOTER                                                */}
      {/* ============================================================== */}
      {/* 6. CLEAN FOOTER (ADMIN ENTRY STRICTLY HIDDEN FOR REGULAR USERS) */}
      {/* ============================================================== */}
      <footer className="bg-emerald-950 text-emerald-200 text-center py-3 border-t border-emerald-900 mt-auto">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6">
          <p className="font-semibold text-[11px] sm:text-xs">
            <span
              onClick={handleSecretAdminTrigger}
              className="cursor-default select-none"
              title=""
            >
              ©
            </span>{' '}
            {new Date().getFullYear()} সফর (Safar) - গফরগাঁও স্মার্ট ট্রান্সপোর্ট ও ইমার্জেন্সি নেটওয়ার্ক
          </p>
          <p className="text-emerald-400 text-[10px] sm:text-[11px] mt-0.5">
            গফরগাঁও পৌরসভা, পাগলা থানা ও সংলগ্ন সকল স্ট্যান্ডের নাগরিকদের জন্য দ্রুত ও নিরাপদ যাতায়াত সেবা
          </p>
          
          {/* Admin Control Bar: STRICTLY visible only when admin is already authenticated */}
          {isAdminLoggedIn && (
            <div className="mt-3 pt-2.5 border-t border-emerald-900/60 flex items-center justify-center gap-3 text-xs animate-in fade-in">
              <div className="inline-flex items-center gap-2 bg-emerald-900/90 px-3 py-1.5 rounded-lg border border-emerald-500/50 shadow-xs flex-wrap justify-center">
                <button
                  type="button"
                  onClick={() => setShowAdminDashboard(true)}
                  className="inline-flex items-center gap-1.5 text-amber-300 hover:text-amber-200 text-xs font-bold cursor-pointer"
                >
                  <Shield className="w-3.5 h-3.5 text-amber-400" />
                  <span>কন্ট্রোল প্যানেল খুলুন</span>
                </button>
                <span className="text-emerald-500">|</span>
                <button
                  type="button"
                  onClick={handleAdminLogout}
                  className="text-red-300 hover:text-red-100 text-[11px] font-medium cursor-pointer transition-colors"
                >
                  লগআউট
                </button>
              </div>
            </div>
          )}
        </div>
      </footer>

      {/* ============================================================== */}
      {/* 7. ADMIN FLOATING TOAST NOTICE                                 */}
      {/* ============================================================== */}
      {adminToast && (
        <div className="fixed bottom-4 right-4 z-[9999] bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-2xl border border-slate-700 text-xs font-bold flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{adminToast}</span>
        </div>
      )}

      {/* ============================================================== */}
      {/* 8. ADMIN PIN AUTHENTICATION MODAL (DISCREET & UNBRANDED)       */}
      {/* ============================================================== */}
      {showAdminAuthModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-slate-900 text-amber-400 flex items-center justify-center font-bold">
                  <Key className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">অ্যাডমিন প্রবেশদ্বার</h3>
                  <p className="text-[10px] text-slate-500">নিরাপত্তা পিন কোড যাচাই</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => { setShowAdminAuthModal(false); setAdminAuthError(null); setAdminPinInput(''); }}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAdminLogin} className="space-y-3.5">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">
                  গোপন অ্যাডমিন পিন (PIN):
                </label>
                <div className="relative">
                  <input
                    type="password"
                    maxLength={8}
                    value={adminPinInput}
                    onChange={(e) => { setAdminPinInput(e.target.value); setAdminAuthError(null); }}
                    placeholder="গোপন পিন কোড দিন"
                    autoFocus
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-center text-base tracking-widest font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                  />
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              {adminAuthError && (
                <div className="p-2 bg-red-50 text-red-700 border border-red-200 rounded-xl text-xs flex items-center gap-1.5 font-medium animate-in fade-in">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                  <span>{adminAuthError}</span>
                </div>
              )}

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => { setShowAdminAuthModal(false); setAdminAuthError(null); setAdminPinInput(''); }}
                  className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-slate-900 hover:bg-slate-800 text-amber-300 font-bold rounded-xl text-xs shadow-md cursor-pointer transition-colors"
                >
                  লগইন করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 9. MAIN ADMIN SUPER CONTROL DASHBOARD MODAL                    */}
      {/* ============================================================== */}
      <AdminControlPanel
        isOpen={showAdminDashboard}
        onClose={() => setShowAdminDashboard(false)}
        showToast={showAdminToastMessage}
        onOpenCloudflareSettings={() => setShowCloudflareModal(true)}
        onOpenSourceCodeModal={() => setShowSourceCodeModal(true)}
        stands={stands}
        onSaveStand={(stand, isEdit) => {
          if (isEdit) {
            setStands(prev => prev.map(s => s.id === stand.id ? stand : s));
            showAdminToastMessage(`স্ট্যান্ড '${stand.bengaliName}' আপডেট ও লাইভ সেভ হয়েছে!`);
          } else {
            setStands(prev => [...prev, stand]);
            showAdminToastMessage(`নতুন স্ট্যান্ড '${stand.bengaliName}' তৈরি ও লাইভ সেভ হয়েছে!`);
          }
          setDoc(doc(db, 'stands', stand.id), {
            ...stand,
            updatedAt: new Date().toISOString()
          }, { merge: true }).catch(err => console.warn('Firestore stand save error:', err));
        }}
        onDeleteStand={(standId, name) => {
          if (stands.length <= 1) {
            showAdminToastMessage('কমপক্ষে ১টি স্ট্যান্ড সিস্টেমে থাকা আবশ্যক!');
            return;
          }
          setStands(prev => prev.filter(s => s.id !== standId));
          deleteDoc(doc(db, 'stands', standId)).catch(err => console.warn('Firestore stand delete error:', err));
          showAdminToastMessage(`স্ট্যান্ড '${name}' মুছে ফেলা হয়েছে`);
        }}
        categories={categories}
        onSaveCategory={(category, isEdit) => {
          if (isEdit) {
            setCategories(prev => prev.map(c => c.id === category.id ? category : c));
            showAdminToastMessage(`ক্যাটাগরি '${category.nameBengali}' আপডেট ও লাইভ সেভ হয়েছে!`);
          } else {
            setCategories(prev => [...prev, category]);
            showAdminToastMessage(`নতুন ক্যাটাগরি '${category.nameBengali}' তৈরি ও লাইভ সেভ হয়েছে!`);
          }
          setDoc(doc(db, 'categories', category.id), {
            ...category,
            updatedAt: new Date().toISOString()
          }, { merge: true }).catch(err => console.warn('Firestore category save error:', err));
        }}
        onDeleteCategory={(categoryId, name) => {
          if (categories.length <= 1) {
            showAdminToastMessage('কমপক্ষে ১টি ক্যাটাগরি থাকা আবশ্যক!');
            return;
          }
          setCategories(prev => prev.filter(c => c.id !== categoryId));
          deleteDoc(doc(db, 'categories', categoryId)).catch(err => console.warn('Firestore category delete error:', err));
          showAdminToastMessage(`ক্যাটাগরি '${name}' মুছে ফেলা হয়েছে`);
        }}
        drivers={drivers}
        onToggleDriverVerification={(driverId, type) => {
          const drv = drivers.find(d => d.id === driverId);
          if (drv) {
            const gateType = type === 'license' ? 'brta' : type === 'nid' ? 'nid' : 'wa';
            handleOpenVerificationGate(drv, gateType);
          }
        }}
        onOpenVerificationGate={handleOpenVerificationGate}
        onApproveAllDriver={handleApproveAllDriver}
        onRevokeDriver={handleRevokeDriver}
        onToggleDriverOnline={(driverId) => {
          setDrivers(prev => prev.map(d => {
            if (d.id === driverId) {
              const nextOnline = !d.isOnline;
              updateDoc(doc(db, 'drivers', driverId), {
                isOnline: nextOnline,
                updatedAt: new Date().toISOString()
              }).catch(err => console.warn('Firestore driver online toggle error:', err));
              return { ...d, isOnline: nextOnline };
            }
            return d;
          }));
          showAdminToastMessage('চালকের সক্রিয়তা স্ট্যাটাস পরিবর্তন হয়েছে');
        }}
        onDeleteDriver={(driverId, name) => {
          setDrivers(prev => prev.filter(d => d.id !== driverId));
          deleteDoc(doc(db, 'drivers', driverId)).catch(err => console.warn('Firestore driver delete error:', err));
          showAdminToastMessage(`চালক '${name}' রিমুভ করা হয়েছে`);
        }}
        customSettings={appCustomSettings}
        onSaveCustomSettings={saveCustomSettings}
        onResetToDefaults={handleResetToDefaults}
        hotlines={hotlines}
        onSaveHotlines={(newHotlines) => {
          setHotlines(newHotlines);
          try {
            localStorage.setItem('safar_hotlines_v4', JSON.stringify(newHotlines));
          } catch {}
          setDoc(doc(db, 'hotlines', 'emergency'), {
            ...newHotlines,
            updatedAt: new Date().toISOString()
          }, { merge: true }).catch(err => console.warn('Firestore hotlines error:', err));
          showAdminToastMessage('জরুরি হটলাইন নম্বর ফায়ারবেসে সেভ ও লাইভ আপডেট হয়েছে!');
        }}
        emergencyContacts={emergencyContacts}
        onSaveEmergencyContacts={handleSaveEmergencyContacts}
        popularPlaces={popularPlaces}
        onSavePopularPlace={handleSavePopularPlace}
        onDeletePopularPlace={handleDeletePopularPlace}
        onResetPopularPlaces={handleResetPopularPlaces}
        onCleanupOldTrips={async () => {
          // 1. Wipe local tripHistory state
          setTripHistory([]);

          // 2. Wipe all local storage trip keys
          try {
            localStorage.removeItem('safar_trip_history_v7');
            localStorage.removeItem('safar_trip_history_v6');
            localStorage.removeItem('safar_trip_history_v5');
            localStorage.removeItem('safar_passenger_trips');
          } catch {}

          // 3. Blacklist all existing and known trip IDs locally
          const clearedSet = getClearedTripIds();
          tripHistory.forEach(t => clearedSet.add(t.id));
          clearedSet.add('trip-1793449662741');
          clearedSet.add('trip-1793458969935');
          saveClearedTripIds(clearedSet);

          // 4. Firestore deep wipe across users, subcollection trips, and ride_requests
          try {
            const usersSnap = await getDocs(collection(db, 'users'));
            for (const u of usersSnap.docs) {
              const uTrips = await getDocs(collection(db, 'users', u.id, 'trips'));
              uTrips.forEach(ut => {
                deleteDoc(doc(db, 'users', u.id, 'trips', ut.id)).catch(() => {});
              });
            }
            if (passengerProfile?.phone) {
              const cleanP = passengerProfile.phone.replace(/[^0-9]/g, '');
              const myTrips = await getDocs(collection(db, 'users', cleanP, 'trips'));
              myTrips.forEach(t => deleteDoc(doc(db, 'users', cleanP, 'trips', t.id)).catch(() => {}));
            }
            const reqSnap = await getDocs(collection(db, 'ride_requests'));
            reqSnap.forEach(d => {
              const data = d.data();
              if (data.status === 'completed' || data.status === 'cancelled' || getDismissedTripIds().has(d.id)) {
                deleteDoc(doc(db, 'ride_requests', d.id)).catch(() => {});
              }
            });
          } catch (e) {
            console.warn('Firestore cleanup notice:', e);
          }

          showAdminToastMessage('🧹 সকল পুরাতন ট্রিপ হিস্ট্রি ও ক্যাশ মেমোরি সফলভাবে মুছে ফায়ারস্টোর সম্পূর্ণ খালি করা হয়েছে!');
        }}
        tripStats={{
          total: tripHistory.length,
          completed: tripHistory.filter(t => t.status === 'সম্পন্ন').length,
          cancelled: tripHistory.filter(t => t.status === 'বাতিল').length
        }}
      />

      {false && showAdminDashboard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in">
          <div className="bg-slate-50 rounded-2xl max-w-5xl w-full h-[92vh] max-h-[820px] shadow-2xl border border-slate-300 flex flex-col overflow-hidden animate-in zoom-in-95">
            
            {/* Admin Header */}
            <div className="bg-slate-900 text-white px-4 py-3 sm:px-6 sm:py-3.5 flex items-center justify-between border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-black shadow-md">
                  <Shield className="w-5 h-5 text-slate-950" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-extrabold text-sm sm:text-base text-white">সফর অ্যাডমিন কনট্রোল প্যানেল</h2>
                    <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[9px] font-black px-1.5 py-0.2 rounded">
                      SUPER ADMIN
                    </span>
                  </div>
                  <p className="text-[10px] sm:text-xs text-slate-400">
                    গফরগাঁও পৌরসভা ও পাগলা থানা ট্রান্সপোর্ট অ্যান্ড ইমার্জেন্সি ম্যানেজমেন্ট
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleAdminLogout}
                  className="inline-flex items-center gap-1 bg-red-600/80 hover:bg-red-600 text-white text-[11px] font-bold px-2.5 py-1.5 rounded-lg border border-red-500/50 cursor-pointer transition-colors"
                  title="অ্যাডমিন থেকে লগআউট করুন"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">লগআউট</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowAdminDashboard(false)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg cursor-pointer bg-slate-800"
                  title="বন্ধ করুন"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Admin Navigation Tabs */}
            <div className="bg-white border-b border-slate-200 px-3 sm:px-6 py-2 flex items-center gap-1.5 overflow-x-auto scrollbar-thin shrink-0">
              <button
                type="button"
                onClick={() => setAdminActiveTab('stands')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  adminActiveTab === 'stands'
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                <MapPin className="w-3.5 h-3.5" />
                <span>স্ট্যান্ড সমূহ ({stands.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setAdminActiveTab('categories')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  adminActiveTab === 'categories'
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                <Car className="w-3.5 h-3.5" />
                <span>ক্যাটাগরি সমূহ ({categories.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setAdminActiveTab('drivers')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  adminActiveTab === 'drivers'
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>চালক ভেরিফিকেশন ও তালিকা ({drivers.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setAdminActiveTab('hotlines')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  adminActiveTab === 'hotlines'
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                <PhoneCall className="w-3.5 h-3.5" />
                <span>জরুরি হটলাইন</span>
              </button>

              <button
                type="button"
                onClick={() => setAdminActiveTab('stats')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  adminActiveTab === 'stats'
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                <Bookmark className="w-3.5 h-3.5" />
                <span>প্ল্যাটফর্ম ওভারভিউ ও রিসেট</span>
              </button>
            </div>

            {/* Admin Tab Body Area */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-6">
              
              {/* TAB 1: STANDS MANAGEMENT */}
              {adminActiveTab === 'stands' && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-white p-3 sm:p-4 rounded-xl border border-slate-200 shadow-xs">
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm sm:text-base flex items-center gap-1.5">
                        <MapPin className="w-4 h-4 text-emerald-600" />
                        স্ট্যান্ড তালিকা ও অবস্থান নিয়ন্ত্রণ
                      </h3>
                      <p className="text-xs text-slate-500">
                        নতুন স্ট্যান্ড যোগ করুন অথবা যেকোনো স্ট্যান্ডের নাম বা জিপিএস অবস্থান সংশোধন করুন
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setEditingStandId(null);
                        setStandForm({
                          bengaliName: '',
                          name: '',
                          lat: 24.5535,
                          lng: 90.5518
                        });
                        setIsStandModalOpen(true);
                      }}
                      className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-2 rounded-xl text-xs shadow-xs cursor-pointer transition-colors shrink-0"
                    >
                      <Plus className="w-4 h-4" />
                      <span>নতুন স্ট্যান্ড যোগ করুন</span>
                    </button>
                  </div>

                  {/* Stands Table / Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {stands.map((stand) => {
                      const count = getStandDriverCount(stand.bengaliName);
                      return (
                        <div key={stand.id} className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between hover:border-emerald-300 transition-all">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <h4 className="font-bold text-slate-900 text-sm truncate flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                                {stand.bengaliName}
                              </h4>
                              <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                                GPS: {stand.lat.toFixed(4)}, {stand.lng.toFixed(4)}
                              </p>
                              <div className="mt-2 flex items-center gap-1.5">
                                <span className="bg-emerald-50 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded border border-emerald-200">
                                  মোট চালক: {count} জন
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingStandId(stand.id);
                                  setStandForm({
                                    bengaliName: stand.bengaliName,
                                    name: stand.name,
                                    lat: stand.lat,
                                    lng: stand.lng
                                  });
                                  setIsStandModalOpen(true);
                                }}
                                className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs cursor-pointer"
                                title="এডিট করুন"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteStand(stand.id, stand.bengaliName)}
                                className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-xs cursor-pointer"
                                title="মুছে ফেলুন"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* TAB 2: CATEGORIES MANAGEMENT */}
              {adminActiveTab === 'categories' && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-white p-3 sm:p-4 rounded-xl border border-slate-200 shadow-xs">
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm sm:text-base flex items-center gap-1.5">
                        <Car className="w-4 h-4 text-emerald-600" />
                        যানবাহন ক্যাটাগরি কনফিগারেশন
                      </h3>
                      <p className="text-xs text-slate-500">
                        নতুন কোনো যানবাহনের ক্যাটাগরি তৈরি বা বিদ্যমান ক্যাটাগরির তথ্য পরিবর্তন করুন
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setEditingCategoryId(null);
                        setCategoryForm({
                          id: '',
                          nameBengali: '',
                          subtitle: '',
                          badgeBg: 'bg-emerald-600',
                          badgeBorder: 'border-emerald-700',
                          textColor: 'text-emerald-700',
                          accentColor: '#059669'
                        });
                        setIsCategoryModalOpen(true);
                      }}
                      className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-2 rounded-xl text-xs shadow-xs cursor-pointer transition-colors shrink-0"
                    >
                      <Plus className="w-4 h-4" />
                      <span>নতুন ক্যাটাগরি যোগ করুন</span>
                    </button>
                  </div>

                  {/* Categories Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {categories.map((cat) => {
                      const count = drivers.filter(d => d.category === cat.id).length;
                      return (
                        <div key={cat.id} className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between hover:border-emerald-300 transition-all">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="flex items-center gap-2">
                              <div 
                                className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-white shadow-xs text-sm"
                                style={{ backgroundColor: cat.accentColor || '#059669' }}
                              >
                                {cat.nameBengali.slice(0, 1)}
                              </div>
                              <div>
                                <h4 className="font-bold text-slate-900 text-sm leading-tight">
                                  {cat.nameBengali}
                                </h4>
                                <span className="text-[10px] text-slate-400 font-mono">ID: {cat.id}</span>
                              </div>
                            </div>

                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingCategoryId(cat.id);
                                  setCategoryForm({
                                    id: cat.id,
                                    nameBengali: cat.nameBengali,
                                    subtitle: cat.subtitle,
                                    badgeBg: cat.badgeBg,
                                    badgeBorder: cat.badgeBorder,
                                    textColor: cat.textColor,
                                    accentColor: cat.accentColor
                                  });
                                  setIsCategoryModalOpen(true);
                                }}
                                className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs cursor-pointer"
                                title="এডিট করুন"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteCategory(cat.id, cat.nameBengali)}
                                className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-xs cursor-pointer"
                                title="মুছে ফেলুন"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          <p className="text-xs text-slate-600 line-clamp-1 mb-2">
                            {cat.subtitle}
                          </p>

                          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                            <span className="text-slate-500 text-[11px]">নিবন্ধিত সক্রিয় চালক:</span>
                            <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                              {count} জন
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* TAB 3: DRIVERS MANAGEMENT & VERIFICATION */}
              {adminActiveTab === 'drivers' && (
                <div className="space-y-4">
                  
                  {/* Drivers Header & Controls */}
                  <div className="bg-white p-3 sm:p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <h3 className="font-bold text-slate-900 text-sm sm:text-base flex items-center gap-1.5">
                          <Users className="w-4 h-4 text-emerald-600" />
                          চালক তালিকা ও ৩-স্তরীয় নিরাপত্তা ভেরিফিকেশন
                        </h3>
                        <p className="text-xs text-slate-500">
                          বিআরটিএ লাইসেন্স, এনআইডি এবং সরাসরি ফোন দ্বারা চালক ভেরিফাই করুন
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => setIsDirectDriverModalOpen(true)}
                        className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-2 rounded-xl text-xs shadow-xs cursor-pointer transition-colors shrink-0"
                      >
                        <Plus className="w-4 h-4" />
                        <span>সরাসরি চালক যোগ করুন</span>
                      </button>
                    </div>

                    {/* Filter bar */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 pt-2 border-t border-slate-100">
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={adminDriverSearch}
                          onChange={(e) => setAdminDriverSearch(e.target.value)}
                          placeholder="নাম, ফোন বা লাইসেন্স খুঁজুন..."
                          className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                      </div>

                      <div>
                        <select
                          value={adminDriverCategoryFilter}
                          onChange={(e) => setAdminDriverCategoryFilter(e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none cursor-pointer"
                        >
                          <option value="all">সকল ক্যাটাগরি</option>
                          {categories.filter(c => c.id !== 'all').map(c => (
                            <option key={c.id} value={c.id}>{c.nameBengali}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <select
                          value={adminDriverStandFilter}
                          onChange={(e) => setAdminDriverStandFilter(e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none cursor-pointer truncate"
                        >
                          <option value="all">সকল স্ট্যান্ড</option>
                          {stands.map(s => (
                            <option key={s.id} value={s.bengaliName}>{s.bengaliName}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <select
                          value={adminDriverVerificationFilter}
                          onChange={(e) => setAdminDriverVerificationFilter(e.target.value as any)}
                          className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
                        >
                          <option value="all">সকল ভেরিফিকেশন অবস্থা</option>
                          <option value="verified">🛡️ ৩টিই ভেরিফাইড ({drivers.filter(d => d.licenseVerified && d.phoneVerified && d.nidVerified).length})</option>
                          <option value="pending">⏳ পেন্ডিং চালক ({drivers.filter(d => !(d.licenseVerified && d.phoneVerified && d.nidVerified)).length})</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Filtered Driver List */}
                  {(() => {
                    const list = drivers.filter(d => {
                      const matchesSearch = 
                        d.name.toLowerCase().includes(adminDriverSearch.toLowerCase()) ||
                        d.phone.includes(adminDriverSearch) ||
                        d.licenseNumber.toLowerCase().includes(adminDriverSearch.toLowerCase()) ||
                        d.plateNumber.toLowerCase().includes(adminDriverSearch.toLowerCase()) ||
                        (d.regAppId && d.regAppId.toLowerCase().includes(adminDriverSearch.toLowerCase()));
                      const matchesCat = adminDriverCategoryFilter === 'all' || d.category === adminDriverCategoryFilter;
                      const matchesStand = adminDriverStandFilter === 'all' || d.standName.includes(adminDriverStandFilter);
                      const matchesVerif = 
                        adminDriverVerificationFilter === 'all' ||
                        (adminDriverVerificationFilter === 'verified' && Boolean(d.licenseVerified && d.phoneVerified && d.nidVerified)) ||
                        (adminDriverVerificationFilter === 'pending' && !Boolean(d.licenseVerified && d.phoneVerified && d.nidVerified));
                      return matchesSearch && matchesCat && matchesStand && matchesVerif;
                    });

                    return (
                      <div className="space-y-2.5">
                        <div className="text-xs text-slate-500 font-medium px-1 flex items-center justify-between">
                          <span>প্রদর্শিত চালক সংখ্যা: {list.length} জন</span>
                          <span className="text-[11px] text-emerald-700 font-semibold">
                            ৩টিই ভেরিফাইড: {drivers.filter(d => d.licenseVerified && d.phoneVerified && d.nidVerified).length} | পেন্ডিং: {drivers.filter(d => !(d.licenseVerified && d.phoneVerified && d.nidVerified)).length}
                          </span>
                        </div>

                        {list.length === 0 ? (
                          <div className="p-8 text-center bg-white rounded-xl border border-slate-200 text-slate-500 text-xs">
                            কোনো চালক খুঁজে পাওয়া যায়নি
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                            {list.map(driver => {
                              const isAll3 = Boolean(driver.licenseVerified && driver.phoneVerified && driver.nidVerified);

                              return (
                                <div key={driver.id} className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between hover:border-emerald-300 transition-all text-xs">
                                  <div>
                                    <div className="flex items-start justify-between gap-1.5 mb-1.5">
                                      <div>
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                          <h4
                                            className="font-bold text-slate-900 text-sm truncate max-w-[160px]"
                                            title={driver.name}
                                          >
                                            {driver.name}
                                          </h4>
                                          <span className={`w-2 h-2 rounded-full shrink-0 ${driver.isOnline ? 'bg-emerald-500' : 'bg-slate-300'}`} title={driver.isOnline ? 'অনলাইন' : 'অফলাইন'}></span>
                                          {isAll3 ? (
                                            <span className="px-1.5 py-0.2 rounded text-[9.5px] font-black bg-emerald-100 text-emerald-800 flex items-center gap-0.5">
                                              <ShieldCheck className="w-2.5 h-2.5 text-emerald-600" />
                                              ৩/৩ ভেরিফাইড
                                            </span>
                                          ) : (
                                            <span className="px-1.5 py-0.2 rounded text-[9.5px] font-black bg-amber-100 text-amber-900 flex items-center gap-0.5">
                                              <AlertCircle className="w-2.5 h-2.5 text-amber-600" />
                                              পেন্ডিং ({[driver.licenseVerified, driver.phoneVerified, driver.nidVerified].filter(Boolean).length}/৩)
                                            </span>
                                          )}
                                        </div>
                                        <div className="w-full overflow-hidden mt-0.5">
                                          <p
                                            className="text-slate-600 text-[11px] font-semibold truncate"
                                            title={`${driver.vehicleModel} • ${driver.plateNumber}`}
                                          >
                                            {driver.vehicleModel} • {driver.plateNumber}
                                          </p>
                                        </div>
                                        {driver.regAppId && (
                                          <p className="text-[10px] font-mono text-slate-400 mt-0.2">
                                            আবেদন আইডি: {driver.regAppId}
                                          </p>
                                        )}
                                      </div>

                                      <div className="flex items-center gap-1">
                                        <button
                                          type="button"
                                          onClick={() => handleToggleDriverOnline(driver.id)}
                                          className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer transition-colors ${
                                            driver.isOnline 
                                              ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200' 
                                              : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                                          }`}
                                          title="অনলাইন/অফলাইন পরিবর্তন"
                                        >
                                          {driver.isOnline ? 'সক্রিয়' : 'নিষ্ক্রিয়'}
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleDeleteDriver(driver.id, driver.name)}
                                          className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded cursor-pointer"
                                          title="চালককে মুছে ফেলুন"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    </div>

                                    <div className="bg-slate-50 p-2 rounded-lg border border-slate-100 space-y-1 mb-2 text-[11px]">
                                      <div className="flex items-center justify-between">
                                        <span className="text-slate-500">ফোন নম্বর:</span>
                                        <a href={`tel:${driver.phone}`} className="font-bold text-emerald-700 hover:underline">
                                          {driver.phone}
                                        </a>
                                      </div>
                                      <div className="flex items-center justify-between">
                                        <span className="text-slate-500">স্ট্যান্ড:</span>
                                        <span className="font-medium text-slate-800 truncate max-w-[170px]">{driver.standName}</span>
                                      </div>
                                      <div className="flex items-center justify-between">
                                        <span className="text-slate-500">লাইসেন্স:</span>
                                        <span className="font-mono font-medium text-slate-700">{driver.licenseNumber}</span>
                                      </div>
                                      <div className="flex items-center justify-between">
                                        <span className="text-slate-500">NID নম্বর:</span>
                                        <span className="font-mono font-medium text-slate-700">{driver.nidNumber}</span>
                                      </div>
                                    </div>

                                    {/* 3 Independent Verification Action Badges */}
                                    <div className="space-y-1.5">
                                      <span className="text-[10px] font-bold text-slate-500 block">
                                        ৩টি আবশ্যিক নিরাপত্তা অনুমোদন সুইচ:
                                      </span>
                                      <div className="grid grid-cols-3 gap-1.5">
                                        {/* Toggle 1: BRTA License Gateway */}
                                        <button
                                          type="button"
                                          onClick={() => handleOpenVerificationGate(driver, 'brta')}
                                          className={`flex items-center justify-center gap-1 px-1.5 py-1.5 rounded-md text-[10px] font-bold border cursor-pointer transition-all ${
                                            driver.licenseVerified
                                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                                              : 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100 ring-2 ring-amber-400/20'
                                          }`}
                                          title="ক্লিক করে BRTA লাইসেন্স গেটওয়ে ও অফিশিয়াল ভেরিফিকেশনে যান"
                                        >
                                          {driver.licenseVerified ? <CheckCircle className="w-3 h-3 text-emerald-600" /> : <AlertCircle className="w-3 h-3 text-amber-600 animate-pulse" />}
                                          <span className="truncate">BRTA {driver.licenseVerified ? '✅' : '⏳'}</span>
                                        </button>

                                        {/* Toggle 2: Phone / WhatsApp Gateway */}
                                        <button
                                          type="button"
                                          onClick={() => handleOpenVerificationGate(driver, 'wa')}
                                          className={`flex items-center justify-center gap-1 px-1.5 py-1.5 rounded-md text-[10px] font-bold border cursor-pointer transition-all ${
                                            driver.phoneVerified
                                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                                              : 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100 ring-2 ring-amber-400/20'
                                          }`}
                                          title="ক্লিক করে WhatsApp কল ও ৪-ডিজিটের ওটিপি ভেরিফিকেশনে যান"
                                        >
                                          {driver.phoneVerified ? <CheckCircle className="w-3 h-3 text-emerald-600" /> : <AlertCircle className="w-3 h-3 text-amber-600 animate-pulse" />}
                                          <span className="truncate">WA {driver.phoneVerified ? '✅' : '⏳'}</span>
                                        </button>

                                        {/* Toggle 3: NID Gateway */}
                                        <button
                                          type="button"
                                          onClick={() => handleOpenVerificationGate(driver, 'nid')}
                                          className={`flex items-center justify-center gap-1 px-1.5 py-1.5 rounded-md text-[10px] font-bold border cursor-pointer transition-all ${
                                            driver.nidVerified
                                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                                              : 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100 ring-2 ring-amber-400/20'
                                          }`}
                                          title="ক্লিক করে নির্বাচন কমিশন NID ভেরিফিকেশনে যান"
                                        >
                                          {driver.nidVerified ? <CheckCircle className="w-3 h-3 text-emerald-600" /> : <AlertCircle className="w-3 h-3 text-amber-600 animate-pulse" />}
                                          <span className="truncate">NID {driver.nidVerified ? '✅' : '⏳'}</span>
                                        </button>
                                      </div>

                                      {/* 3-Pillar Guided Approval / Revoke */}
                                      <div className="flex items-center gap-1.5 pt-1">
                                        <button
                                          type="button"
                                          onClick={() => handleApproveAllDriver(driver.id)}
                                          className="flex-1 py-1 px-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-[10px] font-bold flex items-center justify-center gap-1 cursor-pointer transition-colors shadow-xs"
                                          title="৩টি স্তরে পূর্ণ নিরাপত্তা অনুমোদন ও যাচাই করুন"
                                        >
                                          <CheckCircle className="w-3 h-3" />
                                          <span>৩-টায় পূর্ণ অনুমোদন</span>
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleRevokeDriver(driver.id)}
                                          className="py-1 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-[10px] font-bold cursor-pointer transition-colors"
                                          title="সকল অনুমোদন প্রত্যাহার করে পেন্ডিং করুন"
                                        >
                                          পেন্ডিং করুন
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* TAB 4: EMERGENCY HOTLINES MANAGEMENT */}
              {adminActiveTab === 'hotlines' && (
                <div className="space-y-4 max-w-xl mx-auto">
                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                    <h3 className="font-bold text-slate-900 text-base flex items-center gap-2 mb-1">
                      <PhoneCall className="w-4 h-4 text-red-600" />
                      জরুরি হেল্পলাইন নম্বর ম্যানেজমেন্ট
                    </h3>
                    <p className="text-xs text-slate-500 mb-4">
                      শীর্ষ ব্যানার ও জরুরি সেকশনে প্রদর্শিত সরকারি ও হাসপাতাল নম্বর আপডেট করুন
                    </p>

                    <form onSubmit={handleSaveHotlines} className="space-y-3.5 text-xs">
                      <div>
                        <label className="font-bold text-slate-700 block mb-1 flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-red-600" />
                          গফরগাঁও উপজেলা হাসপাতাল এম্বুলেন্স নম্বর:
                        </label>
                        <input
                          type="text"
                          value={hotlines.hospital}
                          onChange={(e) => setHotlines({ ...hotlines, hospital: e.target.value })}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                          required
                        />
                      </div>

                      <div>
                        <label className="font-bold text-slate-700 block mb-1 flex items-center gap-1.5">
                          <Flame className="w-3.5 h-3.5 text-orange-600" />
                          গফরগাঁও ফায়ার সার্ভিস স্টেশন নম্বর:
                        </label>
                        <input
                          type="text"
                          value={hotlines.fire}
                          onChange={(e) => setHotlines({ ...hotlines, fire: e.target.value })}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                          required
                        />
                      </div>

                      <div>
                        <label className="font-bold text-slate-700 block mb-1 flex items-center gap-1.5">
                          <AlertCircle className="w-3.5 h-3.5 text-red-600" />
                          জাতীয় জরুরি সেবা নম্বর:
                        </label>
                        <input
                          type="text"
                          value={hotlines.national}
                          onChange={(e) => setHotlines({ ...hotlines, national: e.target.value })}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                          required
                        />
                      </div>

                      <button
                        type="submit"
                        className="w-full py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-xs shadow-md cursor-pointer transition-colors"
                      >
                        হটলাইন নম্বর সংরক্ষণ করুন
                      </button>
                    </form>
                  </div>
                </div>
              )}

              {/* TAB 5: PLATFORM METRICS & FACTORY RESET */}
              {adminActiveTab === 'stats' && (
                <div className="space-y-4">
                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
                      <span className="text-[11px] text-slate-500 block">মোট নিবন্ধিত চালক</span>
                      <span className="text-xl sm:text-2xl font-black text-slate-900">{drivers.length}</span>
                      <span className="text-[10px] text-emerald-600 font-semibold block mt-0.5">৮৩ জন প্রস্তুত</span>
                    </div>

                    <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
                      <span className="text-[11px] text-slate-500 block">সক্রিয় স্ট্যান্ড</span>
                      <span className="text-xl sm:text-2xl font-black text-emerald-700">{stands.length}</span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">গফরগাঁও পৌরসভা ও পাগলা</span>
                    </div>

                    <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
                      <span className="text-[11px] text-slate-500 block">মোট ক্যাটাগরি</span>
                      <span className="text-xl sm:text-2xl font-black text-blue-700">{categories.length}</span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">সিএনজি, এম্বুলেন্স, অটো সহ</span>
                    </div>

                    <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
                      <span className="text-[11px] text-slate-500 block">সিস্টেম ব্রাউজার স্টোরেজ</span>
                      <span className="text-xl sm:text-2xl font-black text-amber-600">Active</span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">স্বয়ংক্রিয় সেভ চালু</span>
                    </div>
                  </div>

                  {/* Factory Reset Box */}
                  <div className="bg-red-50/70 border border-red-200 rounded-xl p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <h4 className="font-bold text-red-900 text-sm flex items-center gap-1.5">
                          <AlertCircle className="w-4 h-4 text-red-600" />
                          ফ্যাক্টরি ডেটা রিসেট (সতর্কতা)
                        </h4>
                        <p className="text-xs text-red-700 mt-0.5">
                          আপনার করা সকল স্ট্যান্ড, ক্যাটাগরি ও চালকের পরিবর্তন মুছে সিস্টেমের প্রারম্ভিক অবস্থায় ফিরিয়ে নিয়ে যাবে।
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={handleResetToDefaults}
                        className="inline-flex items-center gap-1.5 px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer transition-colors shrink-0"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>ডিফল্ট ডেটা রিস্টোর করুন</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 10. SUB-MODAL: STAND ADD / EDIT                                */}
      {/* ============================================================== */}
      {isStandModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3.5">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-emerald-600" />
                <span>{editingStandId ? 'স্ট্যান্ড তথ্য সম্পাদনা' : 'নতুন স্ট্যান্ড তৈরি'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsStandModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveStand} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  স্ট্যান্ডের পূর্ণ বাংলা নাম:
                </label>
                <input
                  type="text"
                  value={standForm.bengaliName}
                  onChange={(e) => setStandForm({ ...standForm, bengaliName: e.target.value })}
                  placeholder="যেমন: পাগলা কলেজ মোড় স্ট্যান্ড"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  ইংরেজি/সিস্টেম নাম:
                </label>
                <input
                  type="text"
                  value={standForm.name}
                  onChange={(e) => setStandForm({ ...standForm, name: e.target.value })}
                  placeholder="যেমন: Pagla College Stand"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    অক্ষাংশ (Latitude):
                  </label>
                  <input
                    type="number"
                    step="0.0001"
                    value={standForm.lat}
                    onChange={(e) => setStandForm({ ...standForm, lat: parseFloat(e.target.value) || 24.5535 })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    required
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    দ্রাঘিমাংশ (Longitude):
                  </label>
                  <input
                    type="number"
                    step="0.0001"
                    value={standForm.lng}
                    onChange={(e) => setStandForm({ ...standForm, lng: parseFloat(e.target.value) || 90.5518 })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    required
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsStandModalOpen(false)}
                  className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-xs cursor-pointer"
                >
                  {editingStandId ? 'আপডেট করুন' : 'তৈরি করুন'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 11. SUB-MODAL: CATEGORY ADD / EDIT                             */}
      {/* ============================================================== */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3.5">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                <Car className="w-4 h-4 text-emerald-600" />
                <span>{editingCategoryId ? 'ক্যাটাগরি সম্পাদনা' : 'নতুন ক্যাটাগরি তৈরি'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsCategoryModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCategory} className="space-y-3 text-xs">
              {!editingCategoryId && (
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    ক্যাটাগরি আইডি (ইংরেজি ছোট অক্ষরে):
                  </label>
                  <input
                    type="text"
                    value={categoryForm.id}
                    onChange={(e) => setCategoryForm({ ...categoryForm, id: e.target.value })}
                    placeholder="যেমন: pickup, tomtom"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    required
                  />
                </div>
              )}

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  ক্যাটাগরির বাংলা নাম:
                </label>
                <input
                  type="text"
                  value={categoryForm.nameBengali}
                  onChange={(e) => setCategoryForm({ ...categoryForm, nameBengali: e.target.value })}
                  placeholder="যেমন: পিকআপ ভ্যান"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  সাবটাইটেল / বিবরণ:
                </label>
                <input
                  type="text"
                  value={categoryForm.subtitle}
                  onChange={(e) => setCategoryForm({ ...categoryForm, subtitle: e.target.value })}
                  placeholder="যেমন: মালামাল পরিবহন ও ভাড়া সার্ভিস"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  থিম কালার (Hex):
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={categoryForm.accentColor}
                    onChange={(e) => setCategoryForm({ ...categoryForm, accentColor: e.target.value })}
                    className="w-10 h-9 p-0.5 rounded-lg border border-slate-300 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={categoryForm.accentColor}
                    onChange={(e) => setCategoryForm({ ...categoryForm, accentColor: e.target.value })}
                    className="flex-1 px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCategoryModalOpen(false)}
                  className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-xs cursor-pointer"
                >
                  {editingCategoryId ? 'আপডেট করুন' : 'তৈরি করুন'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 12. SUB-MODAL: DIRECT DRIVER ADD (ADMIN)                       */}
      {/* ============================================================== */}
      {isDirectDriverModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 shadow-2xl border border-slate-200 animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3.5">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                <Users className="w-4 h-4 text-emerald-600" />
                <span>অ্যাডমিন থেকে সরাসরি চালক নিবন্ধন</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsDirectDriverModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleDirectAddDriver} className="space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    চালকের পূর্ণ নাম:
                  </label>
                  <input
                    type="text"
                    value={directDriverForm.name}
                    onChange={(e) => setDirectDriverForm({ ...directDriverForm, name: e.target.value })}
                    placeholder="যেমন: মো: আবুল কাশেম"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    required
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    মোবাইল নম্বর:
                  </label>
                  <input
                    type="tel"
                    value={directDriverForm.phone}
                    onChange={(e) => setDirectDriverForm({ ...directDriverForm, phone: e.target.value })}
                    placeholder="০১৭১১-XXXXXX"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    যানবাহনের ক্যাটাগরি:
                  </label>
                  <select
                    value={directDriverForm.category}
                    onChange={(e) => setDirectDriverForm({ ...directDriverForm, category: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-bold focus:outline-none"
                  >
                    {categories.filter(c => c.id !== 'all').map(c => (
                      <option key={c.id} value={c.id}>{c.nameBengali}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    প্রধান স্ট্যান্ড:
                  </label>
                  <select
                    value={directDriverForm.standName}
                    onChange={(e) => setDirectDriverForm({ ...directDriverForm, standName: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-bold focus:outline-none truncate"
                  >
                    {stands.map(s => (
                      <option key={s.id} value={s.bengaliName}>{s.bengaliName}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    গাড়ির মডেল:
                  </label>
                  <input
                    type="text"
                    value={directDriverForm.vehicleModel}
                    onChange={(e) => setDirectDriverForm({ ...directDriverForm, vehicleModel: e.target.value })}
                    placeholder="যেমন: বাজাজ আরই ৪-স্ট্রোক"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    গাড়ির নম্বর প্লেট:
                  </label>
                  <input
                    type="text"
                    value={directDriverForm.plateNumber}
                    onChange={(e) => setDirectDriverForm({ ...directDriverForm, plateNumber: e.target.value })}
                    placeholder="যেমন: ময়মনসিংহ-থ-১১-১২৩৪"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    BRTA ড্রাইভিং লাইসেন্স নম্বর:
                  </label>
                  <input
                    type="text"
                    value={directDriverForm.licenseNumber}
                    onChange={(e) => setDirectDriverForm({ ...directDriverForm, licenseNumber: e.target.value })}
                    placeholder="যেমন: MYM-DL-98765"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    জাতীয় পরিচয়পত্র (NID):
                  </label>
                  <input
                    type="text"
                    value={directDriverForm.nidNumber}
                    onChange={(e) => setDirectDriverForm({ ...directDriverForm, nidNumber: e.target.value })}
                    placeholder="যেমন: ৭৬১২৩৪৫৬৭৮"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* 3-Way Verification Controls for Admin */}
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-800">
                  <span>নিরাপত্তা ও ৩-ধাপের ভেরিফিকেশন অনুমোদন:</span>
                  <span className="text-[10px] text-slate-500">৩টিই টিক থাকলে চালক ভেরিফাইড হবে</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <label className="flex items-center gap-2 cursor-pointer text-[11px] font-semibold text-slate-700 bg-white p-2 rounded-lg border border-slate-200 hover:border-emerald-300">
                    <input
                      type="checkbox"
                      checked={directDriverForm.licenseVerified}
                      onChange={(e) => setDirectDriverForm({ ...directDriverForm, licenseVerified: e.target.checked })}
                      className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                    />
                    <span>BRTA লাইসেন্স</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer text-[11px] font-semibold text-slate-700 bg-white p-2 rounded-lg border border-slate-200 hover:border-emerald-300">
                    <input
                      type="checkbox"
                      checked={directDriverForm.phoneVerified}
                      onChange={(e) => setDirectDriverForm({ ...directDriverForm, phoneVerified: e.target.checked })}
                      className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                    />
                    <span>WhatsApp ফোন</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer text-[11px] font-semibold text-slate-700 bg-white p-2 rounded-lg border border-slate-200 hover:border-emerald-300">
                    <input
                      type="checkbox"
                      checked={directDriverForm.nidVerified}
                      onChange={(e) => setDirectDriverForm({ ...directDriverForm, nidVerified: e.target.checked })}
                      className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                    />
                    <span>NID পরিচয়পত্র</span>
                  </label>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsDirectDriverModalOpen(false)}
                  className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-xs cursor-pointer"
                >
                  চালক যুক্ত করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 10. DEDICATED VERIFICATION GATEWAY MODAL (BRTA, WhatsApp/Phone, NID) */}
      {verificationGateType && verifyingDriverTarget && (
        <VerificationGatewayModal
          type={verificationGateType}
          driver={verifyingDriverTarget}
          onClose={() => {
            setVerificationGateType(null);
            setVerifyingDriverTarget(null);
          }}
          onApprove={handleApproveVerificationGate}
          onRevoke={handleRevokeVerificationGate}
          onAllApproved={(drv) => {
            const fullDrv = drivers.find(d => d.id === drv.id) || (drv as Driver);
            setSuccessModalDriver(fullDrv);
          }}
        />
      )}

      {/* 11. DRIVER VERIFICATION SUCCESS CELEBRATION MODAL WITH SENT SMS NOTIFICATION */}
      {successModalDriver && (
        <DriverVerificationSuccessModal
          isOpen={Boolean(successModalDriver)}
          driver={successModalDriver}
          onClose={() => setSuccessModalDriver(null)}
          onViewDriverDashboard={() => {
            setSuccessModalDriver(null);
            showAdminToastMessage(`চালক '${successModalDriver.name}' এখন শতভাগ ভেরিফাইড ও সক্রিয়!`);
          }}
        />
      )}

      {/* 13. CLOUDFLARE LIVE SERVER CONFIGURATION MODAL */}
      <CloudflareSettingsModal
        isOpen={showCloudflareModal}
        onClose={() => setShowCloudflareModal(false)}
        status={serverState.status}
        latencyMs={serverState.latencyMs}
        serverType={serverState.serverType}
        activeDriversCount={serverState.drivers.length > 0 ? serverState.drivers.length : drivers.filter(d => d.isOnline).length}
        activePassengersCount={serverState.passengers.length}
      />

      {/* 14. SOURCE CODE ZIP DOWNLOAD MODAL (SAFE 1-CLICK CLIENT DOWNLOAD) */}
      <SourceCodeDownloadModal
        isOpen={showSourceCodeModal}
        onClose={() => setShowSourceCodeModal(false)}
      />

      {/* 15. EMERGENCY DIRECTORY MODAL */}
      <EmergencyDirectoryModal
        isOpen={showEmergencyDirectory}
        onClose={() => setShowEmergencyDirectory(false)}
        contacts={emergencyContacts}
      />

      {/* 16. INSTANT OTP AUTHENTICATION MODAL (DEVICE PROFILE VERIFICATION) */}
      {authOtpModal.isOpen && (
        <div 
          className="fixed inset-0 z-[999999] bg-black/70 backdrop-blur-xs flex items-center justify-center p-3"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-3xl p-5 sm:p-6 max-w-sm w-full shadow-2xl border border-emerald-400 text-slate-900 animate-in fade-in zoom-in-95 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                  <ShieldCheck className="w-5 h-5 text-emerald-700" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base text-slate-900 leading-tight">
                    নিরাপদ ওটিপি (OTP) যাচাই
                  </h3>
                  <span className="text-[10.5px] text-slate-500 font-mono">
                    মোবাইল: {authOtpModal.phone}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAuthOtpModal(prev => ({ ...prev, isOpen: false }))}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 bg-emerald-50 border border-emerald-300 rounded-2xl text-center space-y-2">
              <span className="text-xs text-emerald-900 font-extrabold block">
                নিরাপদ WhatsApp ভেরিফিকেশন ও পিন সেট
              </span>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                আপনার দেওয়া নম্বরে (<b>{authOtpModal.phone}</b>) WhatsApp ওটিপি পাঠানো হয়েছে। নিচের বাটনে ট্যাপ করে আপনার WhatsApp থেকে ওটিপি কোডটি সংগ্রহ করুন:
              </p>
              <a
                href={`https://api.whatsapp.com/send?phone=88${authOtpModal.phone}&text=${encodeURIComponent(`সফর (Safar) অ্যাপ ভেরিফিকেশন ও পিন রিকভারি কোড: ${authOtpModal.generatedCode}। এই কোডটি দিয়ে অ্যাপে আপনার স্থায়ী ৪-ডিজিট পিন সেট করুন।`)}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setAuthOtpModal(prev => ({ ...prev, isSent: true }))}
                className="inline-flex items-center justify-center gap-2 w-full py-2.5 bg-green-600 hover:bg-green-700 text-white font-black rounded-xl text-xs sm:text-sm shadow-md transition-all active:scale-95"
              >
                <span>📲 WhatsApp এ কোড পাঠান / দেখুন</span>
              </a>
            </div>

            <div className="space-y-2.5">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  WhatsApp এ প্রাপ্ত ৪-ডিজিটের কোড লিখুন: *
                </label>
                <input
                  type="text"
                  maxLength={4}
                  value={authOtpModal.enteredCode}
                  onChange={(e) => setAuthOtpModal(prev => ({ ...prev, enteredCode: e.target.value.replace(/[^0-9]/g, ''), error: null }))}
                  placeholder="৪-ডিজিট কোড"
                  className="w-full text-center text-lg font-mono tracking-widest px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  autoFocus
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  আপনার নতুন ৪-ডিজিটের সিকিউরিটি পিন সেট করুন: *
                </label>
                <input
                  type="password"
                  maxLength={4}
                  value={authOtpModal.newPin}
                  onChange={(e) => setAuthOtpModal(prev => ({ ...prev, newPin: e.target.value.replace(/[^0-9]/g, ''), error: null }))}
                  placeholder="নতুন ৪-ডিজিট পিন (যেমন: ১২৩৪)"
                  className="w-full text-center text-sm font-mono tracking-widest px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  নতুন পিন নিশ্চিত করুন: *
                </label>
                <input
                  type="password"
                  maxLength={4}
                  value={authOtpModal.confirmNewPin}
                  onChange={(e) => setAuthOtpModal(prev => ({ ...prev, confirmNewPin: e.target.value.replace(/[^0-9]/g, ''), error: null }))}
                  placeholder="একই পিন পুনরায় লিখুন"
                  className="w-full text-center text-sm font-mono tracking-widest px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            {authOtpModal.error && (
              <p className="text-xs font-bold text-red-600 flex items-center gap-1">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{authOtpModal.error}</span>
              </p>
            )}

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setAuthOtpModal(prev => ({ ...prev, isOpen: false }))}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs cursor-pointer transition"
              >
                বাতিল
              </button>
              <button
                type="button"
                onClick={handleVerifyInstantOtp}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl text-xs shadow-md shadow-emerald-600/30 cursor-pointer transition active:scale-95 flex items-center justify-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>যাচাই ও লগইন</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
