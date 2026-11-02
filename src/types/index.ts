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
  nameBn: string;
  nameEn: string;
  lat: number;
  lng: number;
  driverCount: number;
  description?: string;
}

export interface Driver {
  id: string;
  nameBn: string;
  nameEn: string;
  phone: string;
  altPhone?: string;
  category: VehicleCategory;
  vehicleName: string;
  vehicleModel?: string;
  licensePlate: string;
  standId: string;
  standName: string;
  lat: number;
  lng: number;
  rating: number;
  reviewCount: number;
  isAvailable: boolean;
  isVerified: boolean;
  nidVerified: boolean;
  experienceYears: number;
  features: string[];
  photoUrl?: string;
  driverPhoto?: string;
  baseFare: number;
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
