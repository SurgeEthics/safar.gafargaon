export type VehicleCategory = 
  | 'ambulance'
  | 'cng'
  | 'auto'
  | 'car'
  | 'maxi'
  | 'bike'
  | 'fire_service';

export interface Stand {
  id: string;
  name?: string;
  bengaliName?: string;
  nameBn?: string;
  nameEn?: string;
  lat: number;
  lng: number;
  activeDrivers?: number;
  driverCount?: number;
  location?: string;
  area?: string;
  isPopular?: boolean;
  description?: string;
}

export interface Driver {
  id: string;
  name?: string;
  nameBn?: string;
  nameEn?: string;
  phone: string;
  altPhone?: string;
  category: VehicleCategory | string;
  categoryBengali?: string;
  vehicleName?: string;
  vehicleModel?: string;
  plateNumber?: string;
  licensePlate?: string;
  licenseNumber?: string;
  firstIssueDate?: string;
  licenseType?: 'পেশাদার (Professional)' | 'অপেশাদার (Non-Professional)';
  regLastFour?: string;
  manufacturingYear?: string;
  chassisNumber?: string;
  engineNumber?: string;
  taxTokenReceiptPhoto?: string;
  driverPhoto?: string;
  photoUrl?: string;
  nidFrontPhoto?: string;
  nidBackPhoto?: string;
  nidNumber?: string;
  nidVerified?: boolean;
  licenseVerified?: boolean;
  phoneVerified?: boolean;
  verificationStatus?: 'verified' | 'pending';
  regAppId?: string;
  registeredAt?: string;
  standId?: string;
  standName?: string;
  lat: number;
  lng: number;
  rating: number;
  reviewCount?: number;
  totalTrips?: number;
  avatarBg?: string;
  isAvailable?: boolean;
  isOnline?: boolean;
  isVerified?: boolean;
  experienceYears?: number;
  features?: string[];
  baseFare?: number;
  approxSpeedKmh?: number;
}

export interface VehicleOption {
  id: VehicleCategory;
  nameBn: string;
  nameEn: string;
  baseFare: number;
  perKmFare: number;
  iconType: string;
  estimatedMinutes: number;
}

export interface EmergencyContact {
  id: string;
  titleBn: string;
  category: 'hospital' | 'fire' | 'police' | 'ambulance' | 'blood' | 'upazila';
  phone: string;
  altPhone?: string;
  locationBn: string;
  is24x7: boolean;
}

export interface SafarProjectBackup {
  version: string;
  exportedAt: string;
  appName: string;
  drivers: Driver[];
  stands: Stand[];
  emergencyContacts: EmergencyContact[];
  settings?: {
    emergencyBannerText?: string;
    noticeText?: string;
  };
}
