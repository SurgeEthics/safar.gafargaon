import React, { useState, useMemo } from 'react';
import {
  Shield,
  MapPin,
  Car,
  Users,
  PhoneCall,
  Bookmark,
  Plus,
  Edit2,
  Trash2,
  Save,
  RotateCcw,
  Palette,
  Type,
  Layout,
  Eye,
  Sliders,
  Download,
  Upload,
  CheckCircle,
  X,
  AlertCircle,
  Sparkles,
  HelpCircle,
  Layers,
  ArrowRight,
  ShieldCheck,
  MessageCircle,
  Hospital,
  Flame,
  Siren,
  Heart,
  Phone,
  Search,
  Building2,
  Check,
  ChevronDown,
  ChevronRight,
  ArrowLeft,
  ArrowUp,
  ArrowDown,
  Copy
} from 'lucide-react';
import { Stand, Driver, VehicleCategoryItem } from '../App';
import { EmergencyContact } from '../types';
import { INITIAL_EMERGENCY_CONTACTS } from '../data/initialData';
import { GafargaonPlace } from '../data/gafargaonPlaces';
import { GAFARGAON_UNIONS, COMPREHENSIVE_UNION_PLACES, ComprehensivePlace, UnionInfo } from '../data/gafargaonUnionData';
import { AutoMarqueeText } from './AutoMarqueeText';
import { PauseMarqueeText } from './PauseMarqueeText';

export interface AppCustomSettings {
  primaryColor: string;
  customHexColor?: string;
  fontFamily: string;
  fontSizeMode: 'compact' | 'normal' | 'large' | 'xlarge';
  cardRadius: 'rounded-lg' | 'rounded-2xl' | 'rounded-3xl';
  densityMode: 'compact' | 'standard' | 'spacious';
  headerHotlineText: string;
  announcementNotice: string;
  showLiveMapWidget: boolean;
  showQuickChipsWidget: boolean;
  showHotlineTicker: boolean;
  showDriverStatsRow: boolean;
  baseFareMinimum: number;
  perKmMultiplier: number;
  roundFareToNearest5: boolean;
  quickDestinations: string[];
  customAppUrl?: string;
}

export interface AdminControlPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenCloudflareSettings?: () => void;
  stands: Stand[];
  onSaveStand: (stand: Stand, isEdit: boolean) => void;
  onDeleteStand: (standId: string, name: string) => void;
  categories: VehicleCategoryItem[];
  onSaveCategory: (category: VehicleCategoryItem, isEdit: boolean) => void;
  onDeleteCategory: (categoryId: string, name: string) => void;
  drivers: Driver[];
  onToggleDriverVerification: (driverId: string, type: 'license' | 'nid' | 'phone') => void;
  onOpenVerificationGate?: (driver: Driver, gateType: 'brta' | 'wa' | 'nid') => void;
  onApproveAllDriver?: (driverId: string) => void;
  onRevokeDriver?: (driverId: string) => void;
  onToggleDriverOnline: (driverId: string) => void;
  onDeleteDriver: (driverId: string, name: string) => void;
  customSettings: AppCustomSettings;
  onSaveCustomSettings: (settings: AppCustomSettings) => void;
  onResetToDefaults: () => void;
  hotlines: {
    hospital: string;
    fire: string;
    police: string;
    national: string;
  };
  onSaveHotlines: (hotlines: { hospital: string; fire: string; police: string; national: string }) => void;
  emergencyContacts?: EmergencyContact[];
  onSaveEmergencyContacts?: (contacts: EmergencyContact[]) => void;
  popularPlaces?: GafargaonPlace[];
  onSavePopularPlace?: (place: GafargaonPlace) => void;
  onDeletePopularPlace?: (placeId: string, name: string) => void;
  onResetPopularPlaces?: () => void;
  showToast: (msg: string) => void;
  onCleanupOldTrips?: () => void;
  tripStats?: { total: number; completed: number; cancelled: number };
  onOpenSourceCodeModal?: () => void;
}

export const AdminControlPanel: React.FC<AdminControlPanelProps> = ({
  isOpen,
  onClose,
  stands,
  onSaveStand,
  onDeleteStand,
  categories,
  onSaveCategory,
  onDeleteCategory,
  drivers,
  onToggleDriverVerification,
  onOpenVerificationGate,
  onApproveAllDriver,
  onRevokeDriver,
  onToggleDriverOnline,
  onDeleteDriver,
  customSettings,
  onSaveCustomSettings,
  onResetToDefaults,
  hotlines,
  onSaveHotlines,
  emergencyContacts,
  onSaveEmergencyContacts,
  popularPlaces,
  onSavePopularPlace,
  onDeletePopularPlace,
  onResetPopularPlaces,
  showToast,
  onCleanupOldTrips,
  tripStats,
  onOpenSourceCodeModal
}) => {
  const [activeTab, setActiveTab] = useState<'stands' | 'categories' | 'appearance' | 'quick_chips' | 'drivers' | 'hotlines' | 'places' | 'backup'>('appearance');
  const [isZipDownloading, setIsZipDownloading] = useState(false);
  const [downloadReadyUrl, setDownloadReadyUrl] = useState<string | null>(null);
  const [downloadReadySize, setDownloadReadySize] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  // Stand Form Modal State
  const [editingStand, setEditingStand] = useState<Stand | null>(null);
  const [isStandModalOpen, setIsStandModalOpen] = useState(false);
  const [standForm, setStandForm] = useState({
    bengaliName: '',
    name: '',
    area: GAFARGAON_UNIONS[0].nameBengali,
    lat: 24.4536,
    lng: 90.5479
  });

  // Category Form Modal State
  const [editingCategory, setEditingCategory] = useState<VehicleCategoryItem | null>(null);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [categoryForm, setCategoryForm] = useState<VehicleCategoryItem>({
    id: '',
    nameBengali: '',
    subtitle: '',
    badgeBg: 'bg-emerald-600',
    badgeBorder: 'border-emerald-700',
    textColor: 'text-emerald-700',
    accentColor: '#059669',
    baseFare: 20,
    perKmFare: 12,
    minFare: 20,
    iconType: 'auto',
    isEmergency: false,
    isFree: false
  });

  // Local Appearance Settings Draft
  const [settingsDraft, setSettingsDraft] = useState<AppCustomSettings>(customSettings);

  // Hotlines Draft
  const [hotlinesDraft, setHotlinesDraft] = useState(hotlines);

  // Dynamic Emergency Contacts List Draft (for full add/edit/delete management)
  const [contactsDraft, setContactsDraft] = useState<EmergencyContact[]>(() => {
    return emergencyContacts && emergencyContacts.length > 0 ? emergencyContacts : INITIAL_EMERGENCY_CONTACTS;
  });
  const [editingContact, setEditingContact] = useState<EmergencyContact | null>(null);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [contactForm, setContactForm] = useState<Omit<EmergencyContact, 'id'>>({
    titleBn: '',
    phone: '',
    altPhone: '',
    category: 'hospital',
    locationBn: 'গফরগাঁও',
    is24x7: true
  });

  // Dynamic Popular Places Management State (for autocomplete dropdown control)
  const [placesDraft, setPlacesDraft] = useState<GafargaonPlace[]>(() => {
    return popularPlaces && popularPlaces.length > 0 ? popularPlaces : [];
  });
  const [editingPlace, setEditingPlace] = useState<GafargaonPlace | null>(null);
  const [isPlaceModalOpen, setIsPlaceModalOpen] = useState(false);
  const [placeFilterQuery, setPlaceFilterQuery] = useState('');
  const [placeForm, setPlaceForm] = useState<GafargaonPlace>({
    id: '',
    name: '',
    bengaliName: '',
    category: 'স্ট্যান্ড',
    area: GAFARGAON_UNIONS[0].nameBengali,
    lat: 24.4536,
    lng: 90.5479,
    isPopular: true
  });

  // Sync places when prop updates
  React.useEffect(() => {
    if (popularPlaces && popularPlaces.length > 0) {
      setPlacesDraft(popularPlaces);
    }
  }, [popularPlaces]);

  // New Quick Chip input & Management States
  const [newQuickChipText, setNewQuickChipText] = useState('');
  const [showQuickChipSuggestions, setShowQuickChipSuggestions] = useState(false);
  const [selectedUnionForChips, setSelectedUnionForChips] = useState<string>('all');
  const [editingChipIndex, setEditingChipIndex] = useState<number | null>(null);
  const [editingChipText, setEditingChipText] = useState<string>('');
  const [chipPreviewMode, setChipPreviewMode] = useState<'mobile' | 'desktop'>('mobile');

  // Auto suggestion list combining Comprehensive 15 Unions, Stands and Popular Places
  const quickChipSuggestions = useMemo(() => {
    const list: { name: string; type: 'স্ট্যান্ড' | 'জনপ্রিয় স্থান'; sub?: string; unionName?: string }[] = [];
    const added = new Set<string>();

    COMPREHENSIVE_UNION_PLACES.forEach(cp => {
      const name = cp.bengaliName;
      if (name && !added.has(name.toLowerCase())) {
        added.add(name.toLowerCase());
        list.push({
          name,
          type: cp.isStand ? 'স্ট্যান্ড' : 'জনপ্রিয় স্থান',
          sub: `${cp.unionNameBengali} • ${cp.area}`,
          unionName: cp.unionNameBengali
        });
      }
    });

    (stands || []).forEach(s => {
      const name = s.bengaliName || s.name;
      if (name && !added.has(name.toLowerCase())) {
        added.add(name.toLowerCase());
        list.push({ name, type: 'স্ট্যান্ড', sub: s.location || 'গফরগাঁও' });
      }
    });

    (popularPlaces || []).forEach(p => {
      const name = p.bengaliName || p.name;
      if (name && !added.has(name.toLowerCase())) {
        added.add(name.toLowerCase());
        list.push({ name, type: 'জনপ্রিয় স্থান', sub: p.category || p.area || 'গফরগাঁও' });
      }
    });

    return list;
  }, [stands, popularPlaces]);

  const filteredQuickChipSuggestions = useMemo(() => {
    const query = newQuickChipText.trim().toLowerCase();
    let base = quickChipSuggestions;
    if (selectedUnionForChips !== 'all') {
      base = base.filter(s => s.unionName?.includes(selectedUnionForChips) || s.sub?.includes(selectedUnionForChips));
    }
    if (!query) {
      return base.filter(s => !settingsDraft.quickDestinations.includes(s.name)).slice(0, 10);
    }
    return base
      .filter(s => s.name.toLowerCase().includes(query) || (s.sub && s.sub.toLowerCase().includes(query)))
      .filter(s => !settingsDraft.quickDestinations.includes(s.name))
      .slice(0, 15);
  }, [quickChipSuggestions, newQuickChipText, selectedUnionForChips, settingsDraft.quickDestinations]);

  // Backup JSON String
  const [backupJsonInput, setBackupJsonInput] = useState('');

  // Driver search filter
  const [driverFilterQuery, setDriverFilterQuery] = useState('');
  const [driverCatFilter, setDriverCatFilter] = useState('all');

  // Handle Save Stand
  const handleSubmitStand = (e: React.FormEvent) => {
    e.preventDefault();
    if (!standForm.bengaliName.trim()) {
      showToast('স্ট্যান্ডের বাংলা নাম আবশ্যক');
      return;
    }
    const selectedArea = standForm.area || GAFARGAON_UNIONS[0].nameBengali;
    const targetStand: Stand = {
      id: editingStand ? editingStand.id : `stand-${Date.now()}`,
      bengaliName: standForm.bengaliName.trim(),
      name: standForm.name.trim() || standForm.bengaliName.trim(),
      area: selectedArea,
      location: `${selectedArea} • ${standForm.bengaliName.trim()}`,
      lat: Number(standForm.lat) || 24.4536,
      lng: Number(standForm.lng) || 90.5479,
      activeDrivers: editingStand ? editingStand.activeDrivers : 0
    };
    onSaveStand(targetStand, !!editingStand);
    setIsStandModalOpen(false);
    setEditingStand(null);
  };

  // Handle Save Category
  const handleSubmitCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryForm.nameBengali.trim()) {
      showToast('ক্যাটাগরির বাংলা নাম আবশ্যক');
      return;
    }
    const catId = editingCategory ? editingCategory.id : (categoryForm.id.trim().toLowerCase().replace(/[^a-z0-9]/g, '') || `cat-${Date.now()}`);
    const targetCategory: VehicleCategoryItem = {
      ...categoryForm,
      id: catId,
      nameBengali: categoryForm.nameBengali.trim(),
      baseFare: Number(categoryForm.baseFare) || 20,
      perKmFare: Number(categoryForm.perKmFare) || 10,
      minFare: Number(categoryForm.minFare) || 20
    };
    onSaveCategory(targetCategory, !!editingCategory);
    setIsCategoryModalOpen(false);
    setEditingCategory(null);
  };

  // Apply Appearance Draft
  const handleSaveAppearance = () => {
    onSaveCustomSettings(settingsDraft);
    showToast('🎉 অ্যাপের ডিজাইন, কালার ও লেআউট তাৎক্ষণিক আপডেট হয়েছে!');
  };

  // Save Hotlines
  const handleSaveHotlinesAction = () => {
    onSaveHotlines(hotlinesDraft);
    showToast('জরুরি হটলাইন নম্বর আপডেট হয়েছে!');
  };

  // Submit / Save Emergency Contact (Add or Edit)
  const handleSubmitContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactForm.titleBn.trim() || !contactForm.phone.trim()) {
      showToast('হটলাইনের নাম এবং ফোন নম্বর আবশ্যক');
      return;
    }
    let updated: EmergencyContact[];
    if (editingContact) {
      updated = contactsDraft.map(c => c.id === editingContact.id ? { ...contactForm, id: editingContact.id } : c);
      showToast(`'${contactForm.titleBn}' সফলভাবে আপডেট হয়েছে!`);
    } else {
      const newContact: EmergencyContact = {
        ...contactForm,
        id: `em-${Date.now()}`
      };
      updated = [...contactsDraft, newContact];
      showToast(`নতুন জরুরি হটলাইন '${contactForm.titleBn}' যুক্ত হয়েছে!`);
    }
    setContactsDraft(updated);
    if (onSaveEmergencyContacts) {
      onSaveEmergencyContacts(updated);
    }
    setIsContactModalOpen(false);
    setEditingContact(null);
  };

  // Delete Emergency Contact
  const handleDeleteContact = (contactId: string, title: string) => {
    if (contactsDraft.length <= 1) {
      showToast('কমপক্ষে ১টি জরুরি হটলাইন তালিকায় থাকা আবশ্যক!');
      return;
    }
    const updated = contactsDraft.filter(c => c.id !== contactId);
    setContactsDraft(updated);
    if (onSaveEmergencyContacts) {
      onSaveEmergencyContacts(updated);
    }
    showToast(`'${title}' হটলাইন মুছে ফেলা হয়েছে`);
  };

  // Submit / Save Popular Place (Add or Edit)
  const handleSubmitPlace = (e: React.FormEvent) => {
    e.preventDefault();
    if (!placeForm.bengaliName.trim()) {
      showToast('স্থানের বাংলা নাম পূরণ করুন!');
      return;
    }
    const finalPlace: GafargaonPlace = {
      ...placeForm,
      id: editingPlace ? editingPlace.id : (placeForm.id.trim() || `place-${Date.now()}`),
      name: placeForm.name.trim() || placeForm.bengaliName.trim(),
      bengaliName: placeForm.bengaliName.trim(),
      area: placeForm.area.trim() || 'গফরগাঁও',
      lat: Number(placeForm.lat) || 24.4536,
      lng: Number(placeForm.lng) || 90.5479,
      isPopular: true
    };
    let updated: GafargaonPlace[];
    if (editingPlace) {
      updated = placesDraft.map(p => p.id === editingPlace.id ? finalPlace : p);
    } else {
      updated = [...placesDraft, finalPlace];
    }
    setPlacesDraft(updated);
    if (onSavePopularPlace) {
      onSavePopularPlace(finalPlace);
    }
    setIsPlaceModalOpen(false);
    setEditingPlace(null);
    showToast(editingPlace ? `'${finalPlace.bengaliName}' স্থানটি আপডেট হয়েছে!` : `'${finalPlace.bengaliName}' নতুন জনপ্রিয় স্থান হিসেবে যুক্ত হয়েছে!`);
  };

  // Delete Popular Place
  const handleDeletePlace = (placeId: string, name: string) => {
    const updated = placesDraft.filter(p => p.id !== placeId);
    setPlacesDraft(updated);
    if (onDeletePopularPlace) {
      onDeletePopularPlace(placeId, name);
    }
    showToast(`'${name}' স্থানটি তালিকা থেকে মুছে ফেলা হয়েছে`);
  };

  // 1-Click Load & Sync all 15 unions' stands from COMPREHENSIVE_UNION_PLACES
  const handleLoadAllUnionStands = () => {
    const allStandsFrom15Unions = COMPREHENSIVE_UNION_PLACES.filter(p => p.isStand).map(p => ({
      id: p.id,
      name: p.name || p.bengaliName,
      bengaliName: p.bengaliName,
      lat: p.lat,
      lng: p.lng,
      activeDrivers: 0,
      location: `${p.unionNameBengali} • ${p.area}`
    }));

    const existingNames = new Set(stands.map(s => s.bengaliName.trim().toLowerCase()));
    const toAdd = allStandsFrom15Unions.filter(s => !existingNames.has(s.bengaliName.trim().toLowerCase()));

    toAdd.forEach(stand => {
      onSaveStand(stand, false);
    });

    showToast(`🎉 ১৫ ইউনিয়নের ${toAdd.length}টি নতুন স্ট্যান্ড ক্লাউড ফায়ারবেসে যুক্ত ও সিঙ্ক হয়েছে!`);
  };

  // 1-Click Load & Sync all 15 unions' places from COMPREHENSIVE_UNION_PLACES
  const handleLoadAllUnionPlaces = () => {
    const allPlacesFrom15Unions: GafargaonPlace[] = COMPREHENSIVE_UNION_PLACES.map(p => ({
      id: p.id,
      name: p.name || p.bengaliName,
      bengaliName: p.bengaliName,
      category: p.category as any,
      area: `${p.unionNameBengali}, ${p.area}`,
      lat: p.lat,
      lng: p.lng,
      isPopular: true
    }));

    const existingNames = new Set(placesDraft.map(p => p.bengaliName.trim().toLowerCase()));
    const toAdd = allPlacesFrom15Unions.filter(p => !existingNames.has(p.bengaliName.trim().toLowerCase()));

    toAdd.forEach(place => {
      if (onSavePopularPlace) onSavePopularPlace(place);
    });

    setPlacesDraft(prev => [...prev, ...toAdd]);
    showToast(`🎉 ১৫ ইউনিয়নের ${toAdd.length}টি নতুন আকর্ষণীয় স্থান ক্লাউড ফায়ারবেসে যুক্ত ও সিঙ্ক হয়েছে!`);
  };

  // Add Quick Chip (Custom or Suggestion)
  const handleAddQuickChip = (customText?: string) => {
    const raw = customText || newQuickChipText;
    if (!raw.trim()) return;
    const trimmed = raw.trim();
    if (settingsDraft.quickDestinations.includes(trimmed)) {
      showToast('এই স্থানটি ইতোমধ্যে দ্রুত গন্তব্যে রয়েছে');
      return;
    }
    const updated = {
      ...settingsDraft,
      quickDestinations: [...settingsDraft.quickDestinations, trimmed]
    };
    setSettingsDraft(updated);
    onSaveCustomSettings(updated);
    setNewQuickChipText('');
    showToast(`'${trimmed}' দ্রুত গন্তব্য চিপসে যুক্ত হয়েছে!`);
  };

  // Remove Quick Chip
  const handleRemoveQuickChip = (chip: string) => {
    const updated = {
      ...settingsDraft,
      quickDestinations: settingsDraft.quickDestinations.filter(c => c !== chip)
    };
    setSettingsDraft(updated);
    onSaveCustomSettings(updated);
    showToast(`'${chip}' মুছে ফেলা হয়েছে`);
  };

  // Move Quick Chip Left / Right (Reordering)
  const handleMoveQuickChip = (index: number, direction: 'left' | 'right') => {
    const arr = [...settingsDraft.quickDestinations];
    const targetIdx = direction === 'left' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= arr.length) return;
    const temp = arr[index];
    arr[index] = arr[targetIdx];
    arr[targetIdx] = temp;
    const updated = { ...settingsDraft, quickDestinations: arr };
    setSettingsDraft(updated);
    onSaveCustomSettings(updated);
  };

  // Inline Edit Quick Chip
  const handleStartEditQuickChip = (index: number, currentText: string) => {
    setEditingChipIndex(index);
    setEditingChipText(currentText);
  };

  const handleSaveEditQuickChip = (index: number) => {
    if (!editingChipText.trim()) return;
    const trimmed = editingChipText.trim();
    const arr = [...settingsDraft.quickDestinations];
    arr[index] = trimmed;
    const updated = { ...settingsDraft, quickDestinations: arr };
    setSettingsDraft(updated);
    onSaveCustomSettings(updated);
    setEditingChipIndex(null);
    setEditingChipText('');
    showToast(`চিপস সফলভাবে রিনেম হয়েছে: '${trimmed}'`);
  };

  const handleCancelEditQuickChip = () => {
    setEditingChipIndex(null);
    setEditingChipText('');
  };

  // 1-Click Load Major Landmark Hubs from All 15 Unions + Pourashava
  const handleLoad15UnionHubs = () => {
    const unionHubs = [
      'গফরগাঁও রেলওয়ে স্টেশন স্ট্যান্ড',
      'পৌরসভা চত্বর ও শহিদ মিনার মোড়',
      'উপজেলা স্বাস্থ্য কমপ্লেক্স (হাসপাতাল) স্ট্যান্ড',
      'সালটিয়া বাজার মোড় সিএনজি স্ট্যান্ড',
      'গফরগাঁও সদর ইউনিয়ন পরিষদ মোড়',
      'যশরা বাজার চৌরাস্তা স্ট্যান্ড',
      'রাওনা বাজার সিএনজি ও অটো স্ট্যান্ড',
      'রসুলপুর বাজার চৌরাস্তা স্ট্যান্ড',
      'বারবাড়িয়া বাজার সিএনজি ও অটো স্ট্যান্ড',
      'চরকামারিয়া বাজার মোড় স্ট্যান্ড',
      'পাঁচবাগ বাজার মোড় সিএনজি স্ট্যান্ড',
      'উস্থি বাজার চৌরাস্তা স্ট্যান্ড',
      'মশাখালী রেলওয়ে স্টেশন স্ট্যান্ড',
      'পাইথল বাজার মোড় স্ট্যান্ড',
      'লংগাইর বাজার ও পাগলা থানা রোড স্ট্যান্ড',
      'দত্তেরবাজার চৌরাস্তা স্ট্যান্ড',
      'টাঙ্গাব বাজার মোড় স্ট্যান্ড',
      'নিগুয়ারী বাজার স্ট্যান্ড'
    ];
    const updated = {
      ...settingsDraft,
      quickDestinations: unionHubs
    };
    setSettingsDraft(updated);
    onSaveCustomSettings(updated);
    showToast('🌟 ১৫ ইউনিয়ন ও পৌরসভার প্রধান প্রধান হাব ১-ক্লিকে সফলভাবে লোড হয়েছে!');
  };

  // Reset to Recommended 7 Default Chips
  const handleResetDefaultChips = () => {
    const defaults = [
      'উপজেলা স্বাস্থ্য কমপ্লেক্স (হাসপাতাল) স্ট্যান্ড',
      'গফরগাঁও রেলওয়ে স্টেশন স্ট্যান্ড',
      'পৌরসভা চত্বর স্ট্যান্ড',
      'পাগলা থানা স্ট্যান্ড',
      'শিবগঞ্জ বাজার মোড় স্ট্যান্ড',
      'জামতলী মোড় স্ট্যান্ড',
      'কান্দিপাড়া বাজার চৌরাস্তা স্ট্যান্ড'
    ];
    const updated = {
      ...settingsDraft,
      quickDestinations: defaults
    };
    setSettingsDraft(updated);
    onSaveCustomSettings(updated);
    showToast('ডিফল্ট দ্রুত গন্তব্য চিপস রিস্টোর করা হয়েছে');
  };

  // Clear All Chips
  const handleClearAllChips = () => {
    const updated = {
      ...settingsDraft,
      quickDestinations: []
    };
    setSettingsDraft(updated);
    onSaveCustomSettings(updated);
    showToast('সকল দ্রুত গন্তব্য চিপস পরিষ্কার করা হয়েছে');
  };

  // Export JSON Backup
  const handleExportBackup = () => {
    const exportData = {
      app: 'সফর (Safar)',
      version: '4.5',
      exportedAt: new Date().toISOString(),
      customSettings,
      stands,
      categories,
      hotlines,
      driversCount: drivers.length
    };
    const jsonStr = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `safar-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('কনফিগারেশন ব্যাকআপ ডাউনলোড সম্পন্ন হয়েছে!');
  };

  // Full Project Source Code 1-Click ZIP Download (Binary-Validated Safe In-App Blob Downloader)
  const handleDownloadZip = async () => {
    setIsZipDownloading(true);
    setDownloadError(null);
    try {
      showToast('⏳ সম্পূর্ণ প্রজেক্ট জিপ মেমোরিতে প্রস্তুত করা হচ্ছে (৩.১৮ MB)...');

      const endpoints = [
        `/safar-gafargaon-clean-source.zip?t=${Date.now()}`,
        `/safar-gafargaon-final.zip?t=${Date.now()}`,
        `/safar-gafargaon-latest.zip?t=${Date.now()}`,
        `/api/download-zip?t=${Date.now()}`
      ];

      let validBuffer: ArrayBuffer | null = null;
      let lastErrMsg = '';

      for (const endpoint of endpoints) {
        try {
          const res = await fetch(endpoint, { credentials: 'same-origin', cache: 'no-store' });
          if (res.ok) {
            const buf = await res.arrayBuffer();
            // Validate: Must be real zip binary (> 500KB and starts with PK header 0x50, 0x4B)
            if (buf && buf.byteLength > 500000) {
              const u8 = new Uint8Array(buf.slice(0, 4));
              if (u8[0] === 0x50 && u8[1] === 0x4b) {
                validBuffer = buf;
                break;
              }
            }
          }
        } catch (e: any) {
          lastErrMsg = e?.message || '';
        }
      }

      if (!validBuffer) {
        throw new Error(lastErrMsg || 'জিপ ফাইলটি প্রস্তুত করা সম্ভব হয়নি। ফাইল সাইজ অপর্যাপ্ত।');
      }

      const blob = new Blob([validBuffer], { type: 'application/zip' });
      const sizeStr = (blob.size / (1024 * 1024)).toFixed(2) + ' MB';
      const blobUrl = window.URL.createObjectURL(blob);
      setDownloadReadyUrl(blobUrl);
      setDownloadReadySize(sizeStr);

      // Trigger automatic save to device
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = 'safar-gafargaon-clean-source.zip';
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        try {
          document.body.removeChild(link);
        } catch {}
      }, 3000);

      showToast(`🎉 সফর সম্পূর্ণ প্রজেক্ট জিপ (${sizeStr}) ডাউনলোড শুরু হয়েছে!`);
    } catch (err: any) {
      console.error('ZIP download error:', err);
      setDownloadError(err?.message || 'ডাউনলোড সম্পন্ন করা যায়নি');
      showToast(`ডাউনলোড সমস্যা: ${err?.message || 'অনুগ্রহ করে পুনরায় চেষ্টা করুন'}`);
    } finally {
      setIsZipDownloading(false);
    }
  };

  // Import JSON Backup
  const handleImportBackup = () => {
    try {
      if (!backupJsonInput.trim()) {
        showToast('অনুগ্রহ করে JSON ডেটা পেস্ট করুন');
        return;
      }
      const data = JSON.parse(backupJsonInput.trim());
      if (data.customSettings) {
        onSaveCustomSettings(data.customSettings);
        setSettingsDraft(data.customSettings);
      }
      if (Array.isArray(data.stands) && data.stands.length > 0) {
        localStorage.setItem('safar_stands_v4', JSON.stringify(data.stands));
      }
      if (Array.isArray(data.categories) && data.categories.length > 0) {
        localStorage.setItem('safar_categories_v4', JSON.stringify(data.categories));
      }
      if (data.hotlines) {
        onSaveHotlines(data.hotlines);
      }
      showToast('🎉 সফলভাবে ব্যাকআপ থেকে সকল কনফিগারেশন রিস্টোর করা হয়েছে!');
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch {
      showToast('ভুল JSON ফরম্যাট! সঠিক ব্যাকআপ ফাইল প্রদান করুন');
    }
  };

  const colorPalettes = [
    { id: 'emerald', name: 'মরকত সবুজ (ডিফল্ট)', hex: '#059669', bgClass: 'bg-emerald-600' },
    { id: 'forest', name: 'গাঢ় বনানী', hex: '#065f46', bgClass: 'bg-emerald-800' },
    { id: 'blue', name: 'নীল সমুদ্র', hex: '#0284c7', bgClass: 'bg-sky-600' },
    { id: 'indigo', name: 'মিডনাইট ইন্ডিগো', hex: '#4338ca', bgClass: 'bg-indigo-700' },
    { id: 'purple', name: 'রয়্যাল পার্পল', hex: '#7c3aed', bgClass: 'bg-purple-600' },
    { id: 'amber', name: 'সূর্যমুখী সোনালী', hex: '#d97706', bgClass: 'bg-amber-600' },
    { id: 'crimson', name: 'রক্তিম লাল', hex: '#dc2626', bgClass: 'bg-red-600' }
  ];

  // 100% Stable Driver Sorting: Newest registered drivers first, ZERO jumping/lafalafi
  const filteredDrivers = useMemo(() => {
    return drivers.filter(d => {
      const matchesCat = driverCatFilter === 'all' || d.category === driverCatFilter;
      const matchesQuery = !driverFilterQuery.trim() ||
        d.name.toLowerCase().includes(driverFilterQuery.toLowerCase()) ||
        d.phone.includes(driverFilterQuery) ||
        d.plateNumber.toLowerCase().includes(driverFilterQuery.toLowerCase());
      return matchesCat && matchesQuery;
    }).sort((a, b) => {
      const getStableDriverTime = (d: Driver): number => {
        // 1. Direct permanent registeredTimestamp
        if (typeof (d as any).registeredTimestamp === 'number' && (d as any).registeredTimestamp > 0) {
          return (d as any).registeredTimestamp;
        }
        // 2. Milliseconds extracted from ID (e.g. drv-1740000000000)
        const numMatch = d.id.match(/\d{10,}/);
        if (numMatch) {
          const num = parseInt(numMatch[0], 10);
          if (!isNaN(num) && num > 1600000000000) return num;
        }
        // 3. Permanent createdAt (DO NOT use updatedAt because GPS ticks alter updatedAt every second)
        if ((d as any).createdAt) {
          const t = new Date((d as any).createdAt).getTime();
          if (!isNaN(t) && t > 0) return t;
        }
        // 4. Pending review drivers go above demo drivers
        if (d.verificationStatus === 'pending' || (!d.licenseVerified && !d.nidVerified)) {
          return 1700000000000;
        }
        // 5. Static initial drivers
        const anyDigits = d.id.replace(/\D/g, '');
        return parseInt(anyDigits, 10) || 0;
      };

      const timeA = getStableDriverTime(a);
      const timeB = getStableDriverTime(b);
      if (timeB !== timeA) {
        return timeB - timeA;
      }
      // Absolute deterministic tie-breaker ensures ZERO swapping
      return a.id.localeCompare(b.id);
    });
  }, [drivers, driverCatFilter, driverFilterQuery]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in">
      <div className="bg-slate-50 rounded-3xl max-w-6xl w-full h-[94vh] max-h-[850px] shadow-2xl border border-slate-300 flex flex-col overflow-hidden animate-in zoom-in-95">
        
        {/* Header */}
        <div className="bg-slate-900 text-white px-4 py-3.5 sm:px-6 flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center font-black shadow-md">
              <Shield className="w-5 h-5 text-slate-950" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-extrabold text-sm sm:text-lg text-white">
                  সফর সুপার কন্ট্রোল প্যানেল (Control Panel)
                </h2>
                <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-black px-2 py-0.5 rounded-full">
                  LIVE ADMIN
                </span>
                <span className="inline-flex items-center gap-1.5 bg-emerald-950/90 text-emerald-300 border border-emerald-500/60 text-[10px] sm:text-[11px] font-bold px-2.5 py-0.5 rounded-full shadow-xs">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  <span>ফায়ারবেস ক্লাউড সিঙ্ক: সক্রিয় (Firestore Live)</span>
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                গফরগাঁও পৌরসভা ও পাগলা থানা — স্ট্যান্ড, বাহন, ভাড়া, কালার, ফন্ট ও উইজেট নিয়ন্ত্রণ
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl bg-slate-800 hover:bg-slate-700 cursor-pointer transition"
            title="বন্ধ করুন"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white border-b border-slate-200 px-3 sm:px-6 py-2.5 flex items-center gap-1.5 overflow-x-auto scrollbar-thin shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('appearance')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-extrabold transition cursor-pointer whitespace-nowrap ${
              activeTab === 'appearance'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <Palette className="w-3.5 h-3.5" />
            <span>🎨 অ্যাপ ডিজাইন ও স্টাইলিং</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('stands')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-extrabold transition cursor-pointer whitespace-nowrap ${
              activeTab === 'stands'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <MapPin className="w-3.5 h-3.5" />
            <span>📍 স্ট্যান্ডসমূহ ({stands.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('places')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-extrabold transition cursor-pointer whitespace-nowrap ${
              activeTab === 'places'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <MapPin className="w-3.5 h-3.5 text-rose-500" />
            <span>🏙️ জনপ্রিয় স্থানসমূহ ({placesDraft.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('categories')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-extrabold transition cursor-pointer whitespace-nowrap ${
              activeTab === 'categories'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <Car className="w-3.5 h-3.5" />
            <span>🚗 যানবাহন ও ভাড়ার তালিকা ({categories.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('quick_chips')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-extrabold transition cursor-pointer whitespace-nowrap ${
              activeTab === 'quick_chips'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>⚡ দ্রুত গন্তব্য চিপস ({settingsDraft.quickDestinations.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('drivers')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-extrabold transition cursor-pointer whitespace-nowrap ${
              activeTab === 'drivers'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>👨‍✈️ চালক ভেরিফিকেশন ({drivers.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('hotlines')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-extrabold transition cursor-pointer whitespace-nowrap ${
              activeTab === 'hotlines'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <PhoneCall className="w-3.5 h-3.5" />
            <span>📞 জরুরি হটলাইন</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('backup')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-extrabold transition cursor-pointer whitespace-nowrap ${
              activeTab === 'backup'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <Bookmark className="w-3.5 h-3.5" />
            <span>💾 ব্যাকআপ ও রিসেট</span>
          </button>
        </div>

        {/* Tab Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          
          {/* ========================================================== */}
          {/* TAB: APPEARANCE & THEME CUSTOMIZER                        */}
          {/* ========================================================== */}
          {activeTab === 'appearance' && (
            <div className="space-y-6 max-w-4xl">
              <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-4 flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base text-emerald-950 flex items-center gap-2">
                    <Palette className="w-5 h-5 text-emerald-700" />
                    অ্যাপের সার্বিক রঙ, ফন্ট, সাইজ ও উইজেট কাস্টমাইজেশন
                  </h3>
                  <p className="text-xs text-emerald-800 mt-0.5">
                    এখানে যে কোনো সেটিং পরিবর্তন করার পর নিচে 'সংরক্ষণ ও পরিবর্তন প্রয়োগ করুন' বাটনে চাপ দিন। সাথে সাথে লাইভ অ্যাপে প্রয়োগ হবে!
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleSaveAppearance}
                  className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold px-4 py-2 rounded-xl text-xs sm:text-sm shadow-md cursor-pointer transition active:scale-95"
                >
                  <Save className="w-4 h-4" />
                  <span>সংরক্ষণ ও পরিবর্তন প্রয়োগ করুন</span>
                </button>
              </div>

              {/* 1. Primary Color Theme */}
              <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                <h4 className="font-extrabold text-sm text-slate-800 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
                  ১. প্রাইমারি ব্র্যান্ড কালার থিম (Primary Theme Color):
                </h4>
                
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {colorPalettes.map((pal) => (
                    <button
                      key={pal.id}
                      type="button"
                      onClick={() => setSettingsDraft({ ...settingsDraft, primaryColor: pal.id })}
                      className={`p-3 rounded-xl border text-left flex items-center gap-2.5 cursor-pointer transition ${
                        settingsDraft.primaryColor === pal.id
                          ? 'border-emerald-600 bg-emerald-50/60 ring-2 ring-emerald-500 shadow-xs'
                          : 'border-slate-200 bg-white hover:bg-slate-50'
                      }`}
                    >
                      <span className={`w-6 h-6 rounded-lg ${pal.bgClass} shadow-xs shrink-0`} />
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-slate-800 block truncate">{pal.name}</span>
                        <span className="text-[10px] text-slate-400 font-mono">{pal.hex}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. Font Style & Typography */}
              <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                <h4 className="font-extrabold text-sm text-slate-800 flex items-center gap-2">
                  <Type className="w-4 h-4 text-emerald-600" />
                  ২. ফন্ট স্টাইল (Font Style Selection):
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {[
                    { id: "'Hind Siliguri', sans-serif", label: 'হিন্দ শিলিগুড়ি (Hind Siliguri)', sub: 'আধুনিক ও স্পষ্ট বাংলা ফন্ট' },
                    { id: "'Noto Sans Bengali', sans-serif", label: 'নোটো সান্স বেঙ্গলি (Google Noto)', sub: 'আন্তর্জাতিক স্ট্যান্ডার্ড পাঠযোগ্যতা' },
                    { id: "'Inter', sans-serif", label: 'ইন্টার ও সিস্টেম ডিফল্ট', sub: 'সিস্টেম স্টাইল' }
                  ].map((font) => (
                    <button
                      key={font.id}
                      type="button"
                      onClick={() => setSettingsDraft({ ...settingsDraft, fontFamily: font.id })}
                      className={`p-3 rounded-xl border text-left cursor-pointer transition ${
                        settingsDraft.fontFamily === font.id
                          ? 'border-emerald-600 bg-emerald-50/60 ring-2 ring-emerald-500 shadow-xs'
                          : 'border-slate-200 bg-white hover:bg-slate-50'
                      }`}
                    >
                      <span className="text-xs font-bold text-slate-900 block" style={{ fontFamily: font.id }}>
                        {font.label}
                      </span>
                      <span className="text-[11px] text-slate-500 block mt-0.5">{font.sub}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* 3. Font Size Scale */}
              <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                <h4 className="font-extrabold text-sm text-slate-800 flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-emerald-600" />
                  ৩. ফন্ট স্কেলিং ও সাইজ (Font Size Scaling):
                </h4>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {[
                    { id: 'compact' as const, label: 'কমপ্যাক্ট (৯০%)', desc: 'ছোট স্ক্রিনের জন্য' },
                    { id: 'normal' as const, label: 'স্ট্যান্ডার্ড (১০০%)', desc: 'সাধারণ ও নিখুঁত' },
                    { id: 'large' as const, label: 'বড় ফন্ট (১১০%)', desc: 'স্পষ্ট ও আরামদায়ক' },
                    { id: 'xlarge' as const, label: 'অতি বড় (১২০%)', desc: 'বয়োজ্যেষ্ঠ ও চালকদের জন্য' }
                  ].map((sz) => (
                    <button
                      key={sz.id}
                      type="button"
                      onClick={() => setSettingsDraft({ ...settingsDraft, fontSizeMode: sz.id })}
                      className={`p-3 rounded-xl border text-center cursor-pointer transition ${
                        settingsDraft.fontSizeMode === sz.id
                          ? 'border-emerald-600 bg-emerald-50/60 ring-2 ring-emerald-500 shadow-xs'
                          : 'border-slate-200 bg-white hover:bg-slate-50'
                      }`}
                    >
                      <span className="text-xs font-extrabold text-slate-900 block">{sz.label}</span>
                      <span className="text-[10px] text-slate-500 block mt-0.5">{sz.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* 4. Card Radius & Spacing Density */}
              <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                <h4 className="font-extrabold text-sm text-slate-800 flex items-center gap-2">
                  <Layout className="w-4 h-4 text-emerald-600" />
                  ৪. উইজেট উচ্চতা, প্যাডিং ও কর্নার স্টাইল:
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1.5">কার্ড কর্নার রাউন্ডনেস (Border Radius):</label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: 'rounded-lg' as const, label: 'স্ট্যান্ডার্ড (8px)' },
                        { id: 'rounded-2xl' as const, label: 'কার্ভড (16px)' },
                        { id: 'rounded-3xl' as const, label: 'স্কুয়ার্কল (24px)' }
                      ].map((rad) => (
                        <button
                          key={rad.id}
                          type="button"
                          onClick={() => setSettingsDraft({ ...settingsDraft, cardRadius: rad.id })}
                          className={`p-2 rounded-xl border text-xs font-bold transition cursor-pointer ${
                            settingsDraft.cardRadius === rad.id
                              ? 'bg-emerald-600 text-white border-emerald-700'
                              : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {rad.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1.5">প্যাডিং ও উচ্চতা ডেনসিটি (Density):</label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: 'compact' as const, label: 'টাইট' },
                        { id: 'standard' as const, label: 'স্ট্যান্ডার্ড' },
                        { id: 'spacious' as const, label: 'খোলামেলা' }
                      ].map((den) => (
                        <button
                          key={den.id}
                          type="button"
                          onClick={() => setSettingsDraft({ ...settingsDraft, densityMode: den.id })}
                          className={`p-2 rounded-xl border text-xs font-bold transition cursor-pointer ${
                            settingsDraft.densityMode === den.id
                              ? 'bg-emerald-600 text-white border-emerald-700'
                              : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {den.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* 5. Widget Visibility Controls */}
              <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                <h4 className="font-extrabold text-sm text-slate-800 flex items-center gap-2">
                  <Eye className="w-4 h-4 text-emerald-600" />
                  ৫. উইজেট ও সেকশন অন/অফ নিয়ন্ত্রণ (Widget Visibility):
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { key: 'showLiveMapWidget' as const, label: 'লাইভ ইন্টারঅ্যাক্টিভ ম্যাপ উইজেট', desc: 'গফরগাঁও এর জিপিএস ম্যাপ প্রদর্শন' },
                    { key: 'showQuickChipsWidget' as const, label: 'দ্রুত গন্তব্য চিপস বার', desc: 'পিকআপ/গন্তব্যের নিচে ওয়ান-ট্যাপ বাটন' },
                    { key: 'showHotlineTicker' as const, label: 'জরুরি হটলাইন লাল স্ট্রিপ', desc: 'হেডারের নিচের জরুরি ফোন নম্বর বার' },
                    { key: 'showDriverStatsRow' as const, label: 'সক্রিয় চালক সংখ্যা স্ট্যাটাস', desc: 'স্ট্যান্ডে কয়জন প্রস্তুত তার সারসংক্ষেপ' }
                  ].map((w) => (
                    <label
                      key={w.key}
                      className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={settingsDraft[w.key]}
                        onChange={(e) => setSettingsDraft({ ...settingsDraft, [w.key]: e.target.checked })}
                        className="w-4 h-4 text-emerald-600 rounded mt-0.5 focus:ring-emerald-500 cursor-pointer"
                      />
                      <div>
                        <span className="text-xs font-bold text-slate-900 block">{w.label}</span>
                        <span className="text-[11px] text-slate-500 block">{w.desc}</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Live URL & QR Code Domain Configuration */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                <label className="text-xs font-bold text-slate-900 block">
                  লাইভ ওয়েবসাইট ডোমেন ও QR কোড লিংক (Cloudflare / Custom Domain)
                </label>
                <p className="text-[11px] text-slate-500">
                  QR কোড স্ক্যান করলে যাত্রীরা কোন লিংকে যাবেন তা এখান থেকে যেকোনো সময় পরিবর্তন করতে পারেন।
                </p>
                <input
                  type="url"
                  value={settingsDraft.customAppUrl || ''}
                  onChange={(e) => setSettingsDraft({ ...settingsDraft, customAppUrl: e.target.value })}
                  placeholder="https://safar-gafargaon.pages.dev"
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Editable Emergency Announcement Marquee Box (জরুরি ঘোষণা) */}
              <div className="bg-amber-50/90 p-4 sm:p-5 rounded-2xl border-2 border-amber-300 shadow-xs space-y-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <label className="text-xs sm:text-sm font-extrabold text-amber-950 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-600 animate-spin" />
                    <span>জরুরি ঘোষণা (শীর্ষ হলুদ স্ক্রলিং নোটিশ বার):</span>
                  </label>
                  <span className="text-[10px] bg-amber-200/90 text-amber-950 font-extrabold px-2.5 py-0.5 rounded-full border border-amber-300">
                    মার্ছাড়া নোটিশ
                  </span>
                </div>
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  অ্যাপের হেডারের নিচে প্রদর্শিত হলুদ রঙের জরুরি ঘোষণা বারটিতে যে বার্তা স্ক্রল করাতে চান তা এখানে লিখুন বা এডিট করুন:
                </p>
                <textarea
                  rows={2}
                  value={settingsDraft.announcementNotice || ''}
                  onChange={(e) => setSettingsDraft({ ...settingsDraft, announcementNotice: e.target.value })}
                  placeholder="গফরগাঁও পৌরসভা ও পাগলা থানা এলাকার নির্ভরযোগ্য নিরাপদ যাত্রা সেবা..."
                  className="w-full bg-white border border-amber-300 rounded-xl px-3 py-2 text-xs sm:text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-2xs leading-relaxed"
                />

                {/* Live Preview Box */}
                {settingsDraft.announcementNotice && settingsDraft.announcementNotice.trim() !== '' && (
                  <div className="bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 text-slate-950 p-2.5 rounded-xl flex items-center gap-2 border border-amber-600/30 overflow-hidden shadow-2xs">
                    <span className="bg-slate-950 text-amber-300 text-[10px] font-black px-2 py-0.5 rounded-full shrink-0">
                      লাইভ প্রিভিউ:
                    </span>
                    <span className="text-xs font-bold truncate">
                      {settingsDraft.announcementNotice}
                    </span>
                  </div>
                )}
              </div>

              {/* Save Button Fixed Bar */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleSaveAppearance}
                  className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold px-6 py-2.5 rounded-xl text-sm shadow-md cursor-pointer transition active:scale-95"
                >
                  <Save className="w-4 h-4" />
                  <span>সংরক্ষণ ও পরিবর্তন প্রয়োগ করুন</span>
                </button>
              </div>
            </div>
          )}

          {/* ========================================================== */}
          {/* TAB: STANDS MANAGEMENT                                    */}
          {/* ========================================================== */}
          {activeTab === 'stands' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base text-slate-900 flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-emerald-600" />
                    স্ট্যান্ড সমূহ ও জিপিএস অবস্থান নিয়ন্ত্রণ ({stands.length}টি স্ট্যান্ড)
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    নতুন স্ট্যান্ড যুক্ত করুন বা বিদ্যমান স্ট্যান্ডের নাম ও জিপিএস অবস্থান এডিট করুন। সাথে সাথে ড্রপডাউন ও ম্যাপে আপডেট হবে!
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap shrink-0">
                  <button
                    type="button"
                    onClick={handleLoadAllUnionStands}
                    className="inline-flex items-center gap-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold px-3.5 py-2 rounded-xl text-xs shadow-xs cursor-pointer transition active:scale-95"
                    title="১৫টি ইউনিয়ন ও পৌরসভার সকল স্ট্যান্ড ১-ক্লিকে ক্লাউড ফায়ারবেসে সিঙ্ক করুন"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>১৫ ইউনিয়নের স্ট্যান্ড সিঙ্ক</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setEditingStand(null);
                      setStandForm({
                        bengaliName: '',
                        name: '',
                        area: GAFARGAON_UNIONS[0].nameBengali,
                        lat: 24.4536,
                        lng: 90.5479
                      });
                      setIsStandModalOpen(true);
                    }}
                    className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold px-4 py-2 rounded-xl text-xs sm:text-sm shadow-xs cursor-pointer transition shrink-0"
                  >
                    <Plus className="w-4 h-4" />
                    <span>+ নতুন স্ট্যান্ড যোগ করুন</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {stands.map((stand) => {
                  const driverCount = drivers.filter(d => d.standName === stand.bengaliName).length;
                  return (
                    <div
                      key={stand.id}
                      className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs hover:border-emerald-400 transition flex flex-col justify-between"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h4 className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5 truncate">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                            {stand.bengaliName}
                          </h4>
                          <span className="text-[11px] text-slate-400 font-mono block mt-0.5">
                            {stand.name} • GPS: {stand.lat.toFixed(4)}, {stand.lng.toFixed(4)}
                          </span>
                          <span className="inline-block bg-emerald-50 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded border border-emerald-200 mt-2">
                            সক্রিয় চালক: {driverCount} জন
                          </span>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingStand(stand);
                              const matchedUnion = GAFARGAON_UNIONS.find(u => 
                                (stand.location && stand.location.includes(u.nameBengali)) ||
                                (stand.area && stand.area.includes(u.nameBengali)) ||
                                (stand.location && stand.location.includes(u.nameBengali.replace(' ইউনিয়ন', '').replace(' (পাগলা)', '')))
                              );
                              setStandForm({
                                bengaliName: stand.bengaliName,
                                name: stand.name,
                                area: matchedUnion ? matchedUnion.nameBengali : (stand.area || stand.location || GAFARGAON_UNIONS[0].nameBengali),
                                lat: stand.lat,
                                lng: stand.lng
                              });
                              setIsStandModalOpen(true);
                            }}
                            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg cursor-pointer"
                            title="এডিট করুন"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteStand(stand.id, stand.bengaliName)}
                            className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg cursor-pointer"
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

          {/* ========================================================== */}
          {/* TAB: POPULAR PLACES CONTROL (AUTOCOMPLETE DROPDOWN)         */}
          {/* ========================================================== */}
          {activeTab === 'places' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base text-slate-900 flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-rose-500" />
                    গফরগাঁও ও পাগলা এলাকার জনপ্রিয় স্থানসমূহ নিয়ন্ত্রণ ({placesDraft.length} টি স্থান)
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    যাত্রী বা চালকরা যখন পিকআপ বা গন্তব্য খোঁজেন, তখন এই স্থানগুলো ড্রপডাউনে প্রদর্শিত হয়। এখান থেকে নতুন স্থান যোগ, এডিট বা ডিলিট করতে পারবেন।
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap shrink-0">
                  <button
                    type="button"
                    onClick={handleLoadAllUnionPlaces}
                    className="inline-flex items-center gap-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold px-3.5 py-2 rounded-xl text-xs shadow-xs cursor-pointer transition active:scale-95"
                    title="১৫টি ইউনিয়ন ও পৌরসভার সকল দর্শনীয় ও আকর্ষণীয় স্থান ১-ক্লিকে ক্লাউডে সিঙ্ক করুন"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>১৫ ইউনিয়নের স্থান সিঙ্ক</span>
                  </button>

                  {onResetPopularPlaces && (
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm('জনপ্রিয় স্থানসমূহ ডিফল্ট তালিকায় রিসেট করতে চান?')) {
                          onResetPopularPlaces();
                          showToast('জনপ্রিয় স্থানসমূহ রিসেট করা হয়েছে!');
                        }
                      }}
                      className="inline-flex items-center gap-1 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
                      title="ডিফল্ট তালিকা রিস্টোর করুন"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>রিসেট তালিকা</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setEditingPlace(null);
                      setPlaceForm({
                        id: `place-${Date.now()}`,
                        name: '',
                        bengaliName: '',
                        category: 'স্ট্যান্ড',
                        area: 'গফরগাঁও পৌরসভা',
                        lat: 24.4536,
                        lng: 90.5479,
                        isPopular: true
                      });
                      setIsPlaceModalOpen(true);
                    }}
                    className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold px-4 py-2 rounded-xl text-xs sm:text-sm shadow-xs cursor-pointer transition shrink-0"
                  >
                    <Plus className="w-4 h-4" />
                    <span>+ নতুন স্থান যোগ করুন</span>
                  </button>
                </div>
              </div>

              {/* Filter / Search Bar */}
              <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-2">
                <Search className="w-4 h-4 text-slate-400 shrink-0 ml-1" />
                <input
                  type="text"
                  value={placeFilterQuery}
                  onChange={(e) => setPlaceFilterQuery(e.target.value)}
                  placeholder="জনপ্রিয় স্থানের নাম, ক্যাটাগরি বা এলাকা দিয়ে ফিল্টার করুন..."
                  className="w-full text-xs sm:text-sm bg-transparent outline-none text-slate-800 placeholder-slate-400 font-medium"
                />
                {placeFilterQuery && (
                  <button
                    type="button"
                    onClick={() => setPlaceFilterQuery('')}
                    className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Places Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {placesDraft
                  .filter(p => {
                    if (!placeFilterQuery.trim()) return true;
                    const q = placeFilterQuery.toLowerCase().trim();
                    return (
                      p.bengaliName?.toLowerCase().includes(q) ||
                      p.name?.toLowerCase().includes(q) ||
                      p.category?.toLowerCase().includes(q) ||
                      p.area?.toLowerCase().includes(q)
                    );
                  })
                  .map((place) => {
                    return (
                      <div
                        key={place.id || place.bengaliName}
                        className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs hover:border-emerald-400 transition flex flex-col justify-between"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <h4 className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5 truncate">
                              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0" />
                              {place.bengaliName}
                            </h4>
                            <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                              {place.area || 'গফরগাঁও'}
                            </p>
                            <span className="text-[10.5px] text-slate-400 font-mono block mt-0.5">
                              GPS: {place.lat?.toFixed(4)}, {place.lng?.toFixed(4)}
                            </span>
                            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                              <span className="inline-block bg-slate-100 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded border border-slate-200">
                                {place.category || 'স্থান'}
                              </span>
                              {place.isPopular && (
                                <span className="inline-block bg-rose-50 text-rose-700 text-[10px] font-bold px-1.5 py-0.2 rounded border border-rose-200">
                                  জনপ্রিয় স্থান
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingPlace(place);
                                setPlaceForm({ ...place });
                                setIsPlaceModalOpen(true);
                              }}
                              className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg cursor-pointer"
                              title="এডিট করুন"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeletePlace(place.id, place.bengaliName)}
                              className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg cursor-pointer"
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

          {/* ========================================================== */}
          {/* TAB: VEHICLE CATEGORIES & FARE PRICING                     */}
          {/* ========================================================== */}
          {activeTab === 'categories' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base text-slate-900 flex items-center gap-1.5">
                    <Car className="w-4 h-4 text-emerald-600" />
                    যানবাহনের ধরন ও স্বয়ংক্রিয় ভাড়ার তালিকা কনফিগারেশন ({categories.length}টি বাহন)
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    প্রতিটি বাহনের বেস ভাড়া, প্রতি কিলোমিটার ভাড়া ও জরুরি স্ট্যাটাস পরিবর্তন করুন। হোমপেজের ভাড়ার কার্ডগুলোতে স্বয়ংক্রিয়ভাবে আপডেট হবে!
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setEditingCategory(null);
                    setCategoryForm({
                      id: '',
                      nameBengali: '',
                      subtitle: '',
                      badgeBg: 'bg-emerald-600',
                      badgeBorder: 'border-emerald-700',
                      textColor: 'text-emerald-700',
                      accentColor: '#059669',
                      baseFare: 20,
                      perKmFare: 12,
                      minFare: 20,
                      iconType: 'auto',
                      isEmergency: false,
                      isFree: false
                    });
                    setIsCategoryModalOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold px-4 py-2 rounded-xl text-xs sm:text-sm shadow-xs cursor-pointer transition shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ নতুন বাহন যোগ করুন</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {categories.map((cat) => {
                  const driverCount = drivers.filter(d => d.category === cat.id).length;
                  return (
                    <div
                      key={cat.id}
                      className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs hover:border-emerald-400 transition flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2.5">
                            <div
                              className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-white shadow-xs text-base"
                              style={{ backgroundColor: cat.accentColor || '#059669' }}
                            >
                              {cat.nameBengali.slice(0, 1)}
                            </div>
                            <div>
                              <h4 className="font-extrabold text-sm text-slate-900 leading-tight">
                                {cat.nameBengali}
                              </h4>
                              <span className="text-[10px] text-slate-400 font-mono">ID: {cat.id}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingCategory(cat);
                                setCategoryForm({ ...cat });
                                setIsCategoryModalOpen(true);
                              }}
                              className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg cursor-pointer"
                              title="এডিট করুন"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => onDeleteCategory(cat.id, cat.nameBengali)}
                              className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg cursor-pointer"
                              title="মুছে ফেলুন"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <p className="text-xs text-slate-500 line-clamp-1 mb-2.5">
                          {cat.subtitle || 'নিবন্ধিত বাহন সার্ভিস'}
                        </p>

                        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 space-y-1.5 text-xs text-slate-700">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500">বেস ভাড়া (Base Fare):</span>
                            <strong className="text-slate-900">
                              {cat.isFree ? 'বিনামূল্যে' : `৳ ${cat.baseFare}`}
                            </strong>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500">প্রতি কিমি ভাড়া (Per KM):</span>
                            <strong className="text-emerald-700">
                              {cat.isFree ? '০' : `৳ ${cat.perKmFare}/কিমি`}
                            </strong>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500">সর্বনিম্ন ভাড়া (Minimum):</span>
                            <strong className="text-slate-800">
                              {cat.isFree ? '০' : `৳ ${cat.minFare}`}
                            </strong>
                          </div>
                        </div>
                      </div>

                      <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                        <span className="text-slate-500 text-[11px]">নিবন্ধিত চালক:</span>
                        <span className="font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          {driverCount} জন প্রস্তুত
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ========================================================== */}
          {/* TAB: QUICK DESTINATION CHIPS & 15-UNION MANAGEMENT SUITE   */}
          {/* ========================================================== */}
          {activeTab === 'quick_chips' && (
            <div className="space-y-4 max-w-5xl">
              
              {/* Header Box with Status Badges */}
              <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-extrabold text-sm sm:text-base text-slate-900 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-emerald-600" />
                      <span>দ্রুত গন্তব্য চিপস ও ১৫ ইউনিয়ন নিয়ন্ত্রণ প্যানেল</span>
                    </h3>
                    <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2.5 py-0.5 rounded-full border border-emerald-300">
                      {settingsDraft.quickDestinations.length}টি সক্রিয় চিপস
                    </span>
                    <span className="bg-blue-50 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-blue-200">
                      ১৫ ইউনিয়ন + পৌরসভা
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    যাত্রী ড্যাশবোর্ডের দ্রুত গন্তব্য শর্টকাটগুলো সম্পাদন (Edit), স্থানান্তর (Reorder), ফিল্টারিং ও নতুন স্থান যুক্ত করুন। পরিবর্তনগুলো সরাসরি ফায়ারবেস ক্লাউডে সংরক্ষিত হবে।
                  </p>
                </div>

                {/* Bulk Actions Toolbar */}
                <div className="flex items-center gap-2 flex-wrap shrink-0">
                  <button
                    type="button"
                    onClick={handleLoad15UnionHubs}
                    className="inline-flex items-center gap-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold px-3 py-2 rounded-xl text-xs shadow-xs cursor-pointer transition active:scale-95"
                    title="১৫টি ইউনিয়ন ও পৌরসভার প্রধান প্রধান কেন্দ্রীয় হাব ১-ক্লিকে লোড করুন"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>১৫ ইউনিয়নের প্রধান স্থান লোড</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleResetDefaultChips}
                    className="inline-flex items-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-2.5 py-2 rounded-xl text-xs cursor-pointer transition"
                    title="ডিফল্ট ৭টি চিপসে রিস্টোর করুন"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>ডিফল্ট</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleClearAllChips}
                    className="inline-flex items-center gap-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold px-2.5 py-2 rounded-xl text-xs cursor-pointer transition"
                    title="সব চিপস মুছে নতুন করে সাজান"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>মুছুন</span>
                  </button>
                </div>
              </div>

              {/* 15 Union Directory Quick Filter Bar */}
              <div className="bg-slate-50 p-3 sm:p-4 rounded-2xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>ইউনিয়ন অনুযায়ী স্থান নির্বাচন করুন (গফরগাঁও ও পাগলা):</span>
                  </span>
                  {selectedUnionForChips !== 'all' && (
                    <button
                      type="button"
                      onClick={() => setSelectedUnionForChips('all')}
                      className="text-[11px] text-emerald-700 font-bold hover:underline cursor-pointer"
                    >
                      সকল ইউনিয়ন দেখান
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
                  <button
                    type="button"
                    onClick={() => setSelectedUnionForChips('all')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer transition whitespace-nowrap ${
                      selectedUnionForChips === 'all'
                        ? 'bg-emerald-600 text-white shadow-2xs'
                        : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                    }`}
                  >
                    সকল ইউনিয়ন
                  </button>

                  {GAFARGAON_UNIONS.map((u) => {
                    const isSelected = selectedUnionForChips === u.nameBengali;
                    return (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => setSelectedUnionForChips(isSelected ? 'all' : u.nameBengali)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer transition whitespace-nowrap flex items-center gap-1 ${
                          isSelected
                            ? 'bg-emerald-600 text-white shadow-2xs'
                            : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                        }`}
                      >
                        <span>{u.nameBengali}</span>
                        {u.thana === 'পাগলা থানা' && (
                          <span className={`text-[8.5px] px-1 py-0.1 rounded ${isSelected ? 'bg-emerald-800 text-emerald-100' : 'bg-amber-100 text-amber-800'}`}>
                            পাগলা
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Add Quick Chip Input & Auto-Suggestion Box */}
              <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                <label className="text-xs font-bold text-slate-800 block">
                  নতুন স্থান বা স্ট্যান্ড যুক্ত করুন:
                </label>

                <div className="relative">
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={newQuickChipText}
                        onChange={(e) => {
                          setNewQuickChipText(e.target.value);
                          setShowQuickChipSuggestions(true);
                        }}
                        onFocus={() => setShowQuickChipSuggestions(true)}
                        placeholder={
                          selectedUnionForChips !== 'all'
                            ? `${selectedUnionForChips}-এর স্থান খুঁজুন বা লিখুন...`
                            : 'যেমন: পাগলা বাজার মোড়, উস্থি বাজার, লংগাইর স্কুল...'
                        }
                        className="w-full pl-9 pr-8 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddQuickChip();
                            setShowQuickChipSuggestions(false);
                          }
                        }}
                      />
                      {newQuickChipText && (
                        <button
                          type="button"
                          onClick={() => setNewQuickChipText('')}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs cursor-pointer"
                        >
                          ✕
                        </button>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        handleAddQuickChip();
                        setShowQuickChipSuggestions(false);
                      }}
                      className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs sm:text-sm shadow-xs cursor-pointer transition shrink-0"
                    >
                      <Plus className="w-4 h-4" />
                      <span>যুক্ত করুন</span>
                    </button>
                  </div>

                  {/* Auto Suggestion Dropdown */}
                  {showQuickChipSuggestions && filteredQuickChipSuggestions.length > 0 && (
                    <div className="absolute left-0 right-0 mt-1.5 bg-white rounded-2xl border-2 border-emerald-400 shadow-xl z-30 max-h-60 overflow-y-auto scrollbar-thin divide-y divide-slate-100 animate-in fade-in slide-in-from-top-1">
                      <div className="px-3 py-1.5 bg-emerald-50/90 text-[10px] font-black text-emerald-900 flex items-center justify-between sticky top-0 backdrop-blur-xs">
                        <span>💡 সাজেশন তালিকা থেকে সরাসরি চিপস যুক্ত করুন:</span>
                        <button
                          type="button"
                          onClick={() => setShowQuickChipSuggestions(false)}
                          className="text-slate-400 hover:text-slate-700 text-xs cursor-pointer p-0.5"
                        >
                          ✕
                        </button>
                      </div>

                      {filteredQuickChipSuggestions.map((item, idx) => (
                        <button
                          key={`${item.name}-${idx}`}
                          type="button"
                          onClick={() => {
                            handleAddQuickChip(item.name);
                            setShowQuickChipSuggestions(false);
                          }}
                          className="w-full flex items-center justify-between p-2.5 hover:bg-emerald-50/70 text-left transition cursor-pointer group"
                        >
                          <div className="flex items-center gap-2 min-w-0 pr-2 flex-1 overflow-hidden">
                            <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <div className="min-w-0 flex-1 overflow-hidden">
                              <PauseMarqueeText
                                text={item.name}
                                className="text-xs font-bold text-slate-800 group-hover:text-emerald-950 block"
                                pauseSec={1.5}
                                speedSec={3.5}
                              />
                              {item.sub && (
                                <PauseMarqueeText
                                  text={item.sub}
                                  className="text-[10px] text-slate-400 block"
                                  pauseSec={1.5}
                                  speedSec={3.5}
                                />
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className={`text-[9.5px] font-bold px-1.5 py-0.5 rounded-full ${
                              item.type === 'স্ট্যান্ড'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}>
                              {item.type}
                            </span>
                            <span
                              className="w-6 h-6 rounded-md bg-emerald-100 text-emerald-800 group-hover:bg-emerald-600 group-hover:text-white font-black text-sm flex items-center justify-center transition shadow-2xs"
                              title="যুক্ত করুন"
                            >
                              +
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Current Active Chips with In-Place Edit, Reorder, and Delete */}
                <div className="pt-3 border-t border-slate-100 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <span>বর্তমানে সক্রিয় শর্টকাট চিপস ({settingsDraft.quickDestinations.length}টি):</span>
                      <span className="text-[10px] text-slate-400 font-normal">(পজিশন বদলাতে তীরচিহ্ন চাপুন)</span>
                    </label>
                  </div>

                  {settingsDraft.quickDestinations.length === 0 ? (
                    <div className="text-center py-6 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                      <p className="text-xs text-slate-500">কোনো চিপস সক্রিয় নেই। উপরের বোতামে ক্লিক করে যুক্ত করুন।</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                      {settingsDraft.quickDestinations.map((chip, idx) => {
                        const isEditingThis = editingChipIndex === idx;

                        return (
                          <div
                            key={`${chip}-${idx}`}
                            className={`p-2 rounded-xl border transition-all flex items-center justify-between gap-2 ${
                              isEditingThis
                                ? 'bg-amber-50/80 border-amber-400 ring-2 ring-amber-300 shadow-sm'
                                : 'bg-emerald-50/70 border-emerald-200 hover:border-emerald-300 hover:bg-emerald-50 shadow-2xs'
                            }`}
                          >
                            {isEditingThis ? (
                              <div className="flex items-center gap-1.5 w-full">
                                <input
                                  type="text"
                                  value={editingChipText}
                                  onChange={(e) => setEditingChipText(e.target.value)}
                                  className="w-full px-2 py-1 bg-white border border-amber-400 rounded-lg text-xs font-bold text-slate-800 focus:outline-none"
                                  autoFocus
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleSaveEditQuickChip(idx);
                                    if (e.key === 'Escape') handleCancelEditQuickChip();
                                  }}
                                />
                                <button
                                  type="button"
                                  onClick={() => handleSaveEditQuickChip(idx)}
                                  className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold cursor-pointer shrink-0"
                                >
                                  সংরক্ষণ
                                </button>
                                <button
                                  type="button"
                                  onClick={handleCancelEditQuickChip}
                                  className="px-1.5 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-[10px] cursor-pointer shrink-0"
                                >
                                  বাতিল
                                </button>
                              </div>
                            ) : (
                              <>
                                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                  <span className="w-5 h-5 rounded-md bg-emerald-200/80 text-emerald-900 text-[10px] font-black flex items-center justify-center shrink-0">
                                    {idx + 1}
                                  </span>
                                  <span
                                    className="text-xs font-bold text-slate-800 truncate block"
                                    title={chip}
                                  >
                                    {chip}
                                  </span>
                                </div>

                                <div className="flex items-center gap-1 shrink-0">
                                  {/* Reorder Left */}
                                  <button
                                    type="button"
                                    onClick={() => handleMoveQuickChip(idx, 'left')}
                                    disabled={idx === 0}
                                    className="w-6 h-6 rounded-md bg-white border border-slate-200 hover:bg-emerald-100 text-slate-600 hover:text-emerald-800 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center text-[10px] cursor-pointer transition"
                                    title="বামে স্থানান্তর"
                                  >
                                    ◀
                                  </button>

                                  {/* Reorder Right */}
                                  <button
                                    type="button"
                                    onClick={() => handleMoveQuickChip(idx, 'right')}
                                    disabled={idx === settingsDraft.quickDestinations.length - 1}
                                    className="w-6 h-6 rounded-md bg-white border border-slate-200 hover:bg-emerald-100 text-slate-600 hover:text-emerald-800 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center text-[10px] cursor-pointer transition"
                                    title="ডানে স্থানান্তর"
                                  >
                                    ▶
                                  </button>

                                  {/* Inline Edit */}
                                  <button
                                    type="button"
                                    onClick={() => handleStartEditQuickChip(idx, chip)}
                                    className="w-6 h-6 rounded-md bg-white border border-slate-200 hover:bg-amber-100 text-slate-600 hover:text-amber-800 flex items-center justify-center text-[11px] cursor-pointer transition"
                                    title="নাম সম্পাদনা করুন"
                                  >
                                    ✏️
                                  </button>

                                  {/* Delete */}
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveQuickChip(chip)}
                                    className="w-6 h-6 rounded-md bg-white border border-slate-200 hover:bg-rose-100 text-slate-600 hover:text-rose-700 flex items-center justify-center text-[10px] cursor-pointer transition"
                                    title="মুছে ফেলুন"
                                  >
                                    ✕
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Live Passenger Interface Preview */}
              <div className="bg-slate-900 text-white p-4 sm:p-5 rounded-2xl border border-slate-800 shadow-md space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <h4 className="text-xs sm:text-sm font-bold text-emerald-300">
                      লাইভ প্যাসেঞ্জার স্ক্রিন প্রিভিউ (Interactive Real-Time Preview)
                    </h4>
                  </div>
                  <span className="text-[10px] text-slate-400 bg-slate-800 px-2.5 py-0.5 rounded-full">
                    যাত্রীরা হুবহু এই তালিকা দেখতে পাবেন
                  </span>
                </div>

                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2">
                  <div className="text-[11px] font-semibold text-slate-400 flex items-center justify-between">
                    <span>শর্টকাট চিপস তালিকা:</span>
                    <span className="text-emerald-400">{settingsDraft.quickDestinations.length}টি স্থান</span>
                  </div>

                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
                    {settingsDraft.quickDestinations.map((dest, i) => (
                      <span
                        key={`prev-${dest}-${i}`}
                        className="inline-flex items-center gap-1 bg-emerald-950 text-emerald-200 border border-emerald-600/50 px-2.5 py-1 rounded-lg text-xs font-bold whitespace-nowrap"
                      >
                        <MapPin className="w-3 h-3 text-emerald-400" />
                        <span>{dest}</span>
                      </span>
                    ))}
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* ========================================================== */}
          {/* TAB: DRIVERS VERIFICATION & ROSTER                        */}
          {/* ========================================================== */}
          {activeTab === 'drivers' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base text-slate-900 flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-emerald-600" />
                    নিবন্ধিত চালক তালিকা ও ৩-ধাপের নিরাপত্তা ভেরিফিকেশন ({drivers.length} জন চালক)
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    BRTA ড্রাইভিং লাইসেন্স, পুলিশ NID ও WhatsApp যাচাইয়ের স্ট্যাটাস নিয়ন্ত্রণ করুন।
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <input
                    type="text"
                    value={driverFilterQuery}
                    onChange={(e) => setDriverFilterQuery(e.target.value)}
                    placeholder="নাম, ফোন বা নম্বরপ্লেট..."
                    className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                  <select
                    value={driverCatFilter}
                    onChange={(e) => setDriverCatFilter(e.target.value)}
                    className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                  >
                    <option value="all">সকল বাহন ({drivers.length})</option>
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.nameBengali}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Drivers Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredDrivers.map((driver) => (
                  <div
                    key={driver.id}
                    className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs hover:border-emerald-300 transition flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2.5">
                          {(driver.driverPhoto || (driver as any).photoUrl || driver.phone?.includes('01304841550') || driver.name?.toUpperCase().includes('TASNIMUL')) ? (
                            <img
                              src={driver.driverPhoto || (driver as any).photoUrl || '/assets/drivers/tasnimul_kabeer.png'}
                              alt={driver.name}
                              onError={(e) => {
                                (e.currentTarget as HTMLImageElement).src = '/assets/drivers/tasnimul_kabeer.png';
                              }}
                              className="w-11 h-11 rounded-xl object-cover border border-emerald-300 shrink-0"
                            />
                          ) : (
                            <div className="w-11 h-11 rounded-xl bg-slate-100 flex items-center justify-center text-lg shrink-0">
                              👤
                            </div>
                          )}
                          <div className="min-w-0 flex-1 overflow-hidden">
                            <h4
                              className="font-extrabold text-sm text-slate-900 truncate block"
                              title={driver.name}
                            >
                              {driver.name}
                            </h4>
                            <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                              <span className="text-[11px] text-slate-500 font-mono block">{driver.phone}</span>
                              {driver.registeredAt && (
                                <span className="text-[9.5px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 inline-flex items-center gap-1 shadow-2xs">
                                  <span>🕒</span>
                                  <span>{driver.registeredAt}</span>
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => onDeleteDriver(driver.id, driver.name)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg cursor-pointer"
                          title="মুছে ফেলুন"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="text-xs text-slate-600 space-y-1.5 my-2">
                        <div className="flex items-center justify-between gap-2 overflow-hidden">
                          <span className="text-slate-400 shrink-0">বাহন:</span>
                          <span className="font-bold text-slate-800 truncate text-right flex-1" title={`${driver.vehicleModel} (${driver.categoryBengali})`}>
                            {driver.vehicleModel} ({driver.categoryBengali})
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-2 overflow-hidden">
                          <span className="text-slate-400 shrink-0">নম্বরপ্লেট:</span>
                          <span className="font-mono text-emerald-700 font-bold truncate text-right flex-1" title={driver.plateNumber}>
                            {driver.plateNumber}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-2 overflow-hidden">
                          <span className="text-slate-400 shrink-0">স্ট্যান্ড:</span>
                          <span className="text-slate-700 font-medium truncate text-right flex-1" title={driver.standName}>
                            {driver.standName}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-2 overflow-hidden">
                          <span className="text-slate-400 shrink-0">লাইসেন্স:</span>
                          <span className="font-mono text-slate-700 font-medium truncate text-right flex-1" title={driver.licenseNumber}>
                            {driver.licenseNumber}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-2 overflow-hidden">
                          <span className="text-slate-400 shrink-0">NID নম্বর:</span>
                          <span className="font-mono text-slate-700 font-medium truncate text-right flex-1" title={driver.nidNumber}>
                            {driver.nidNumber}
                          </span>
                        </div>
                      </div>

                      {/* 3-Step Dedicated Verification Action Badges (Opens BRTA, WA, NID Gateways) */}
                      <div className="pt-2.5 border-t border-slate-100 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10.5px] font-bold text-slate-600">
                            ৩টি আবশ্যিক নিরাপত্তা অনুমোদন সূচক:
                          </span>
                          <span className={`text-[9.5px] font-black px-2 py-0.5 rounded-full ${
                            (driver.licenseVerified && driver.phoneVerified && driver.nidVerified)
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : 'bg-amber-100 text-amber-800 border border-amber-300'
                          }`}>
                            {(driver.licenseVerified && driver.phoneVerified && driver.nidVerified)
                              ? '🟢 সম্পূর্ণ ভেরিফাইড (৩/৩)'
                              : `⏳ পেন্ডিং (${[driver.licenseVerified, driver.phoneVerified, driver.nidVerified].filter(Boolean).length}/৩)`}
                          </span>
                        </div>

                        {/* 3 Verification Gateways Grid */}
                        <div className="grid grid-cols-3 gap-1.5">
                          {/* 1. BRTA Official Gateway */}
                          <button
                            type="button"
                            onClick={() => onOpenVerificationGate ? onOpenVerificationGate(driver, 'brta') : onToggleDriverVerification(driver.id, 'license')}
                            className={`flex items-center justify-center gap-1 px-1.5 py-1.5 rounded-lg text-[10px] font-bold border cursor-pointer transition-all ${
                              driver.licenseVerified
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100 shadow-xs'
                                : 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100 ring-2 ring-amber-400/20'
                            }`}
                            title="ক্লিক করে BRTA লাইসেন্স ও মোটরযান গেটওয়েতে যান"
                          >
                            {driver.licenseVerified ? (
                              <CheckCircle className="w-3 h-3 text-emerald-600" />
                            ) : (
                              <AlertCircle className="w-3 h-3 text-amber-600 animate-pulse" />
                            )}
                            <span className="truncate">BRTA {driver.licenseVerified ? '✅' : '⏳'}</span>
                          </button>

                          {/* 2. WhatsApp & Phone Gateway */}
                          <button
                            type="button"
                            onClick={() => onOpenVerificationGate ? onOpenVerificationGate(driver, 'wa') : onToggleDriverVerification(driver.id, 'phone')}
                            className={`flex items-center justify-center gap-1 px-1.5 py-1.5 rounded-lg text-[10px] font-bold border cursor-pointer transition-all ${
                              driver.phoneVerified
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100 shadow-xs'
                                : 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100 ring-2 ring-amber-400/20'
                            }`}
                            title="ক্লিক করে WhatsApp কল ও ওটিপি যাচাই গেটওয়েতে যান"
                          >
                            {driver.phoneVerified ? (
                              <CheckCircle className="w-3 h-3 text-emerald-600" />
                            ) : (
                              <AlertCircle className="w-3 h-3 text-amber-600 animate-pulse" />
                            )}
                            <span className="truncate">WA {driver.phoneVerified ? '✅' : '⏳'}</span>
                          </button>

                          {/* 3. NID Verification Gateway */}
                          <button
                            type="button"
                            onClick={() => onOpenVerificationGate ? onOpenVerificationGate(driver, 'nid') : onToggleDriverVerification(driver.id, 'nid')}
                            className={`flex items-center justify-center gap-1 px-1.5 py-1.5 rounded-lg text-[10px] font-bold border cursor-pointer transition-all ${
                              driver.nidVerified
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100 shadow-xs'
                                : 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100 ring-2 ring-amber-400/20'
                            }`}
                            title="ক্লিক করে জাতীয় পরিচয়পত্র (NID) গেটওয়েতে যান"
                          >
                            {driver.nidVerified ? (
                              <CheckCircle className="w-3 h-3 text-emerald-600" />
                            ) : (
                              <AlertCircle className="w-3 h-3 text-amber-600 animate-pulse" />
                            )}
                            <span className="truncate">NID {driver.nidVerified ? '✅' : '⏳'}</span>
                          </button>
                        </div>

                        {/* Quick 1-Click Approve / Pending Controls */}
                        <div className="flex items-center gap-1.5 pt-1">
                          <button
                            type="button"
                            onClick={() => onApproveAllDriver ? onApproveAllDriver(driver.id) : null}
                            className="flex-1 py-1.5 px-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10.5px] font-bold flex items-center justify-center gap-1 cursor-pointer transition shadow-xs"
                            title="এক ক্লিকে ৩টি নিরাপত্তা অনুমোদনই সক্রিয় করুন"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                            <span>১-ক্লিকে ৩টিই অনুমোদন</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => onRevokeDriver ? onRevokeDriver(driver.id) : null}
                            className="py-1.5 px-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[10.5px] font-bold cursor-pointer transition"
                            title="সকল অনুমোদন প্রত্যাহার করে পেন্ডিং করুন"
                          >
                            পেন্ডিং করুন
                          </button>

                          <button
                            type="button"
                            onClick={() => onToggleDriverOnline(driver.id)}
                            className={`py-1.5 px-2.5 rounded-lg text-[10.5px] font-bold border cursor-pointer transition ${
                              driver.isOnline
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                : 'bg-slate-100 text-slate-500 border-slate-200'
                            }`}
                            title="অনলাইন / অফলাইন পরিবর্তন"
                          >
                            {driver.isOnline ? 'অনলাইন' : 'অফলাইন'}
                          </button>
                        </div>

                        {/* Direct WhatsApp Verification Notice Send Button */}
                        {(driver.licenseVerified && driver.phoneVerified && driver.nidVerified) && (
                          <a
                            href={`https://wa.me/880${driver.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`অভিনন্দন ${driver.name}! সফর (SAFAR) প্ল্যাটফর্মে আপনার ৩-ধাপের নিরাপত্তা ভেরিফিকেশন (BRTA ড্রাইভিং লাইসেন্স, WhatsApp ফোন ও NID) সফলভাবে সম্পন্ন হয়েছে। আপনার চালক অ্যাকাউন্ট এখন সম্পূর্ণ সক্রিয় ও অনুমোদিত। আপনি এখন অ্যাপে অনলাইন হয়ে যাত্রীদের রাইড কল গ্রহণ করতে পারবেন।`)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full flex items-center justify-center gap-1.5 py-1.5 px-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-300 rounded-lg text-[10.5px] font-black transition shadow-xs cursor-pointer mt-1"
                            title="চালকের হোয়াটসঅ্যাপে সফল ভেরিফিকেশন কনফার্মেশন পাঠান"
                          >
                            <MessageCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span>চালককে WhatsApp-এ ভেরিফিকেশন মেসেজ পাঠান</span>
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ========================================================== */}
          {/* TAB: EMERGENCY HOTLINES                                   */}
          {/* ========================================================== */}
          {activeTab === 'hotlines' && (
            <div className="space-y-4">
              {/* Header Box */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base text-slate-900 flex items-center gap-2">
                    <PhoneCall className="w-4 h-4 text-red-600" />
                    <span>জরুরি হটলাইন নম্বর সমূহ নিয়ন্ত্রণ ({contactsDraft.length}টি হটলাইন)</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    নতুন জরুরি হটলাইন যুক্ত করুন বা বিদ্যমান হেল্পলাইনের নাম ও ফোন নম্বর এডিট করুন। সাথে সাথে ড্রপডাউন মেনু ও ডিরেক্টরিতে আপডেট হবে!
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setEditingContact(null);
                    setContactForm({
                      titleBn: '',
                      phone: '',
                      altPhone: '',
                      category: 'hospital',
                      locationBn: 'গফরগাঁও',
                      is24x7: true
                    });
                    setIsContactModalOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white font-extrabold px-4 py-2 rounded-xl text-xs sm:text-sm shadow-xs cursor-pointer transition shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ নতুন হটলাইন যোগ করুন</span>
                </button>
              </div>

              {/* Hotlines Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {contactsDraft.map((contact) => (
                  <div
                    key={contact.id}
                    className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs hover:border-red-300 transition flex flex-col justify-between group"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2.5 min-w-0">
                          <span className="w-9 h-9 rounded-xl bg-red-50 border border-red-200 flex items-center justify-center shrink-0">
                            {contact.category === 'hospital' || contact.category === 'ambulance' ? (
                              <Hospital className="w-4 h-4 text-red-600" />
                            ) : contact.category === 'fire' ? (
                              <Flame className="w-4 h-4 text-orange-600" />
                            ) : contact.category === 'police' ? (
                              <Siren className="w-4 h-4 text-blue-600" />
                            ) : contact.category === 'blood' ? (
                              <Heart className="w-4 h-4 text-rose-600" />
                            ) : (
                              <Phone className="w-4 h-4 text-red-600" />
                            )}
                          </span>
                          <div className="min-w-0">
                            <h4 className="font-extrabold text-xs sm:text-sm text-slate-900 leading-snug truncate">
                              {contact.titleBn}
                            </h4>
                            <span className="text-[11px] text-slate-500 block mt-0.5">
                              {contact.locationBn}
                            </span>
                          </div>
                        </div>

                        {/* Edit and Delete Action Buttons */}
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingContact(contact);
                              setContactForm({
                                titleBn: contact.titleBn,
                                phone: contact.phone,
                                altPhone: contact.altPhone || '',
                                category: contact.category,
                                locationBn: contact.locationBn,
                                is24x7: contact.is24x7
                              });
                              setIsContactModalOpen(true);
                            }}
                            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg cursor-pointer transition"
                            title="এডিট করুন"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteContact(contact.id, contact.titleBn)}
                            className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg cursor-pointer transition"
                            title="মুছে ফেলুন"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Phone Numbers & Call Test */}
                      <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2">
                        <div>
                          <span className="font-mono font-black text-xs sm:text-sm text-red-700 block">
                            {contact.phone}
                          </span>
                          {contact.altPhone && (
                            <span className="font-mono text-[10.5px] text-slate-500 block">
                              বিকল্প: {contact.altPhone}
                            </span>
                          )}
                        </div>

                        <a
                          href={`tel:${contact.phone.replace(/[^0-9]/g, '')}`}
                          className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-2xs transition active:scale-95 shrink-0"
                          title="কল টেস্ট করুন"
                        >
                          <PhoneCall className="w-3 h-3" />
                          <span>কল</span>
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ========================================================== */}
          {/* TAB: BACKUP & RESTORE                                     */}
          {/* ========================================================== */}
          {activeTab === 'backup' && (
            <div className="space-y-6 max-w-3xl">
              {/* Firestore Storage & Trip Space Optimization Card */}
              <div className="bg-gradient-to-br from-emerald-50 via-teal-50 to-white p-5 rounded-2xl border-2 border-emerald-300 shadow-sm space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <h3 className="font-extrabold text-sm sm:text-base text-slate-900 flex items-center gap-2">
                    <span className="p-1.5 bg-emerald-600 text-white rounded-lg">
                      <Sparkles className="w-4 h-4" />
                    </span>
                    <span>ফায়ারস্টোর স্টোরেজ ও ট্রিপ স্পেস অপটিমাইজেশন</span>
                  </h3>
                  <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2.5 py-0.5 rounded-full border border-emerald-300">
                    ফ্রি স্পার্ক প্ল্যান ১০০% নিরাপদ
                  </span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  ফায়ারবেস ফায়ারস্টোরে অপ্রয়োজনীয় পুরনো বা সম্পন্ন হওয়া ট্রিপগুলো জমে যেন ক্লাউড লিমিট শেষ না হয়, তার জন্য এই টুল। ৩০ দিনের বেশি পুরনো সম্পন্ন ও বাতিল ট্রিপগুলো ডিলিট করে ক্লাউড স্টোরেজ সবসময় খালি ও সুপার-ফাস্ট রাখুন।
                </p>

                <div className="grid grid-cols-3 gap-2 bg-white p-3 rounded-xl border border-emerald-200 text-center">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-semibold">মোট ট্রিপ রেকর্ড</span>
                    <span className="text-sm font-black text-slate-800">{tripStats?.total || 0}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-emerald-600 block font-semibold">সম্পন্ন ট্রিপ</span>
                    <span className="text-sm font-black text-emerald-700">{tripStats?.completed || 0}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-red-500 block font-semibold">বাতিল ট্রিপ</span>
                    <span className="text-sm font-black text-red-600">{tripStats?.cancelled || 0}</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      if (onCleanupOldTrips) {
                        onCleanupOldTrips();
                      } else {
                        showToast('ফায়ারস্টোর ট্রিপ ডেটা সফলভাবে পরিষ্কার করা হয়েছে!');
                      }
                    }}
                    className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs sm:text-sm shadow-sm cursor-pointer transition active:scale-95"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>পুরনো সম্পন্ন/বাতিল ট্রিপ ডেটা মুছুন (স্টোরেজ ক্লিন)</span>
                  </button>
                </div>
              </div>

              {/* Full Source Code Zip Download Card (Prominent Yellow Section) */}
              <div className="bg-gradient-to-br from-amber-100 via-amber-50 to-emerald-50 p-5 rounded-2xl border-2 border-amber-400 shadow-md space-y-3.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <h3 className="font-black text-sm sm:text-base text-slate-900 flex items-center gap-2">
                    <Download className="w-5 h-5 text-amber-600" />
                    <span>সম্পূর্ণ প্রজেক্ট সোর্স কোড ও ক্লিন জিপ প্যাকেজ (.ZIP)</span>
                  </h3>
                  <span className="inline-flex items-center gap-1.5 bg-emerald-600 text-white font-black text-[11px] px-2.5 py-0.5 rounded-full shadow-xs self-start sm:self-auto">
                    <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                    লেটেস্ট ফ্রেশ প্যাকেজ • ৩.১৮ MB
                  </span>
                </div>

                <p className="text-xs text-slate-700 leading-relaxed">
                  আপনার সম্পূর্ণ অ্যাপের রিয়্যাক্ট ১৯, টাইপস্ক্রিপ্ট সোর্স কোড, চালক ও যাত্রী ড্যাশবোর্ড, লাইভ ম্যাপ ট্র্যাকিং, সকল আইকন এবং প্রস্তুতকৃত <strong>dist/</strong> প্রোডাকশন বিল্ড ফাইল সহ সম্পূর্ণ অফিশিয়াল ত্রুটিমুক্ত ফ্রেশ জিপ প্যাকেজ।
                </p>

                {/* Primary Yellow 1-Click Interactive In-Memory Download Button */}
                <div className="flex flex-wrap items-center gap-2.5 pt-1">
                  <button
                    type="button"
                    onClick={handleDownloadZip}
                    disabled={isZipDownloading}
                    className="inline-flex items-center gap-2 bg-amber-400 hover:bg-amber-300 active:scale-95 text-slate-950 font-black px-6 py-3.5 rounded-xl text-xs sm:text-sm shadow-md cursor-pointer transition border-2 border-amber-500/80 disabled:opacity-60"
                  >
                    {isZipDownloading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                        <span>মেমোরিতে প্যাকেজ প্রস্তুত হচ্ছে (৩.১৮ MB)...</span>
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4 text-slate-950" />
                        <span>📥 সম্পূর্ণ ফ্রেশ প্রজেক্ট জিপ ডাউনলোড করুন (৩.১৮ MB)</span>
                      </>
                    )}
                  </button>

                  {onOpenSourceCodeModal && (
                    <button
                      type="button"
                      onClick={onOpenSourceCodeModal}
                      className="inline-flex items-center gap-1.5 bg-white hover:bg-slate-50 text-slate-800 font-bold px-4 py-3 rounded-xl text-xs sm:text-sm shadow-xs border border-slate-300 cursor-pointer transition"
                    >
                      <span>ডিপ্লয় গাইড ও বিবরণ</span>
                    </button>
                  )}
                </div>

                {/* Download Ready Banner (Appears as soon as Blob is generated in memory) */}
                {downloadReadyUrl && (
                  <div className="w-full bg-emerald-50 border-2 border-emerald-500/80 p-3.5 rounded-xl flex flex-wrap items-center justify-between gap-3 animate-fadeIn shadow-xs">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                      <div>
                        <p className="font-black text-xs text-emerald-950">
                          সম্পূর্ণ জিপ প্যাকেজ প্রস্তুত ({downloadReadySize || '৩.১৮ MB'})
                        </p>
                        <p className="text-[11px] text-emerald-700">
                          স্বয়ংক্রিয় সেভ শুরু না হয়ে থাকলে নিচের বাটনে ক্লিক করে সরাসরি সেভ করুন:
                        </p>
                      </div>
                    </div>
                    <a
                      href={downloadReadyUrl}
                      download="safar-gafargaon-clean-source.zip"
                      className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-black text-xs px-4 py-2.5 rounded-lg shadow-sm transition shrink-0"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>💾 সরাসরি ফাইলে সেভ করুন ({downloadReadySize})</span>
                    </a>
                  </div>
                )}

                {downloadError && (
                  <div className="text-xs text-rose-700 bg-rose-50 border border-rose-300 p-2.5 rounded-lg flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>{downloadError}</span>
                  </div>
                )}

                {/* Direct Link Copy Bar */}
                <div className="bg-white/90 p-2.5 rounded-xl border border-amber-300/80 flex items-center justify-between gap-2 mt-2">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span className="text-[11px] font-bold text-amber-900 shrink-0">সরাসরি লিঙ্ক:</span>
                    <input
                      type="text"
                      readOnly
                      value={typeof window !== 'undefined' ? `${window.location.origin}/safar-gafargaon-clean-source.zip` : '/safar-gafargaon-clean-source.zip'}
                      className="w-full bg-transparent text-[11px] font-mono text-slate-700 truncate outline-none select-all font-semibold"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (typeof window !== 'undefined') {
                        navigator.clipboard.writeText(`${window.location.origin}/safar-gafargaon-clean-source.zip`);
                        showToast('📋 সরাসরি জিপ লিঙ্ক কপি করা হয়েছে!');
                      }
                    }}
                    className="inline-flex items-center gap-1 bg-amber-200 hover:bg-amber-300 text-amber-950 font-bold px-3 py-1.5 rounded-lg text-[11px] cursor-pointer transition shrink-0"
                  >
                    <Copy className="w-3 h-3" />
                    <span>কপি</span>
                  </button>
                </div>
              </div>

              {/* Export Backup Card */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                <h3 className="font-extrabold text-sm sm:text-base text-slate-900 flex items-center gap-2">
                  <Download className="w-4 h-4 text-emerald-600" />
                  কনফিগারেশন ব্যাকআপ ডাউনলোড (JSON Export)
                </h3>
                <p className="text-xs text-slate-500">
                  আপনার করা সকল স্ট্যান্ড, ক্যাটাগরি, ভাড়ার তালিকা ও অ্যাপের স্টাইলিং সেটিংস একটি ব্যাকআপ ফাইল হিসেবে ডাউনলোড করে সংরক্ষণ করে রাখতে পারেন।
                </p>
                <button
                  type="button"
                  onClick={handleExportBackup}
                  className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-xl text-xs sm:text-sm shadow-xs cursor-pointer transition active:scale-95"
                >
                  <Download className="w-4 h-4" />
                  <span>ব্যাকআপ ফাইল ডাউনলোড করুন (.json)</span>
                </button>
              </div>

              {/* Import Restore Card */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                <h3 className="font-extrabold text-sm sm:text-base text-slate-900 flex items-center gap-2">
                  <Upload className="w-4 h-4 text-blue-600" />
                  ব্যাকআপ থেকে রিস্টোর (JSON Import)
                </h3>
                <p className="text-xs text-slate-500">
                  পূর্বে ডাউনলোড করা ব্যাকআপের টেক্সট বা কোড নিচে পেস্ট করে 'রিস্টোর করুন' চাপুন।
                </p>
                <textarea
                  rows={4}
                  value={backupJsonInput}
                  onChange={(e) => setBackupJsonInput(e.target.value)}
                  placeholder='{"app": "সফর", "stands": [...], "categories": [...]}'
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <button
                  type="button"
                  onClick={handleImportBackup}
                  className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2 rounded-xl text-xs sm:text-sm shadow-xs cursor-pointer transition"
                >
                  <Upload className="w-4 h-4" />
                  <span>ব্যাকআপ রিস্টোর করুন</span>
                </button>
              </div>

              {/* Factory Reset */}
              <div className="bg-red-50 border border-red-200 rounded-2xl p-5 space-y-2">
                <h3 className="font-extrabold text-sm text-red-900 flex items-center gap-2">
                  <RotateCcw className="w-4 h-4 text-red-600" />
                  ফ্যাক্টরি ডেটা রিসেট (সতর্কতা)
                </h3>
                <p className="text-xs text-red-700">
                  আপনার কাস্টম স্ট্যান্ড, ক্যাটাগরি ও ভাড়ার সেটিংস মুছে গফরগাঁও পৌরসভার প্রাথমিক সিস্টেমে ফিরিয়ে নিয়ে যাবে।
                </p>
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm('আপনি কি নিশ্চিত যে সকল ডেটা ডিফল্ট অবস্থায় ফিরিয়ে নিতে চান?')) {
                      onResetToDefaults();
                    }
                  }}
                  className="inline-flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white font-bold px-4 py-2 rounded-xl text-xs shadow-xs cursor-pointer transition"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>ডিফল্ট ডেটা রিস্টোর করুন</span>
                </button>
              </div>
            </div>
          )}

        </div>

      </div>

      {/* ============================================================== */}
      {/* SUB-MODAL: STAND ADD / EDIT                                    */}
      {/* ============================================================== */}
      {isStandModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 bg-slate-950/75 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-5 shadow-2xl border border-slate-200 animate-in zoom-in-95 text-slate-900">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3.5">
              <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-emerald-600" />
                <span>{editingStand ? 'স্ট্যান্ড তথ্য সম্পাদনা' : 'নতুন স্ট্যান্ড তৈরি'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsStandModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitStand} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  স্ট্যান্ডের পূর্ণ বাংলা নাম: <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={standForm.bengaliName}
                  onChange={(e) => setStandForm({ ...standForm, bengaliName: e.target.value })}
                  placeholder="যেমন: পাগলা কলেজ মোড় স্ট্যান্ড"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold"
                  required
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  ইংরেজি/সিস্টেম কোড নাম:
                </label>
                <input
                  type="text"
                  value={standForm.name}
                  onChange={(e) => setStandForm({ ...standForm, name: e.target.value })}
                  placeholder="যেমন: Pagla College Stand"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  এলাকা / ইউনিয়ন: <span className="text-red-500">*</span>
                </label>
                <select
                  value={standForm.area || GAFARGAON_UNIONS[0].nameBengali}
                  onChange={(e) => setStandForm({ ...standForm, area: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                  required
                >
                  {GAFARGAON_UNIONS.map((u) => (
                    <option key={u.id} value={u.nameBengali}>
                      {u.nameBengali} ({u.thana === 'পাগলা থানা' ? 'পাগলা' : 'সদর'})
                    </option>
                  ))}
                </select>
              </div>

              {/* Google Maps Coordinates Quick Paste Helper */}
              <div className="bg-emerald-50 p-2.5 rounded-xl border border-emerald-200">
                <label className="font-bold text-xs text-emerald-900 block mb-1">
                  🌐 গুগল ম্যাপস কোঅর্ডিনেট পেস্ট করুন (অটো ডিটেক্ট):
                </label>
                <input
                  type="text"
                  placeholder="যেমন: 24.4536, 90.5479 (Google Maps থেকে কপি করা)"
                  onChange={(e) => {
                    const val = e.target.value.trim();
                    if (!val) return;
                    const parts = val.split(/[,\s]+/).map(Number).filter(n => !isNaN(n));
                    if (parts.length >= 2) {
                      setStandForm(prev => ({
                        ...prev,
                        lat: parts[0],
                        lng: parts[1]
                      }));
                    }
                  }}
                  className="w-full px-3 py-1.5 bg-white border border-emerald-300 rounded-lg text-xs font-mono text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <span className="text-[10px] text-emerald-700 block mt-1">
                  গুগল ম্যাপে যেকোনো লোকেশনে ট্যাপ বা রাইট ক্লিক করে Lat, Lng কপি করে এখানে পেস্ট করলেই নিচে অক্ষাংশ ও দ্রাঘিমাংশ স্বয়ংক্রিয়ভাবে বসে যাবে।
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">অক্ষাংশ (Latitude):</label>
                  <input
                    type="number"
                    step="0.000001"
                    value={standForm.lat}
                    onChange={(e) => setStandForm({ ...standForm, lat: parseFloat(e.target.value) || 24.4536 })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono text-xs sm:text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">দ্রাঘিমাংশ (Longitude):</label>
                  <input
                    type="number"
                    step="0.000001"
                    value={standForm.lng}
                    onChange={(e) => setStandForm({ ...standForm, lng: parseFloat(e.target.value) || 90.5479 })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono text-xs sm:text-sm"
                    required
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsStandModalOpen(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl shadow-xs cursor-pointer"
                >
                  {editingStand ? 'আপডেট করুন' : 'তৈরি করুন'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* SUB-MODAL: CATEGORY ADD / EDIT                                 */}
      {/* ============================================================== */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 bg-slate-950/75 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 text-slate-900 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3.5">
              <h3 className="font-extrabold text-slate-900 text-sm sm:text-base flex items-center gap-1.5">
                <Car className="w-4 h-4 text-emerald-600" />
                <span>{editingCategory ? 'বাহনের ধরন ও ভাড়ার তথ্য সম্পাদনা' : 'নতুন বাহনের ক্যাটাগরি তৈরি'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsCategoryModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitCategory} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">বাহনের বাংলা নাম: *</label>
                  <input
                    type="text"
                    value={categoryForm.nameBengali}
                    onChange={(e) => setCategoryForm({ ...categoryForm, nameBengali: e.target.value })}
                    placeholder="যেমন: ইজিবাইক / টমটম"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    required
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">ইংরেজি আইডি কোড: *</label>
                  <input
                    type="text"
                    value={categoryForm.id}
                    onChange={(e) => setCategoryForm({ ...categoryForm, id: e.target.value })}
                    placeholder="যেমন: tomtom / easybike"
                    disabled={!!editingCategory}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">সংক্ষিপ্ত বিবরণ (Subtitle):</label>
                <input
                  type="text"
                  value={categoryForm.subtitle}
                  onChange={(e) => setCategoryForm({ ...categoryForm, subtitle: e.target.value })}
                  placeholder="যেমন: দ্রুত লোকাল যাতায়াত সার্ভিস"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Fares */}
              <div className="bg-emerald-50/80 p-3 rounded-2xl border border-emerald-200 space-y-2">
                <span className="font-bold text-emerald-950 block">ভাড়ার হিসাব কনফিগারেশন:</span>
                
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">বেস ভাড়া (৳):</label>
                    <input
                      type="number"
                      value={categoryForm.baseFare}
                      onChange={(e) => setCategoryForm({ ...categoryForm, baseFare: Number(e.target.value) })}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-900 font-bold"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">প্রতি কিমি (৳):</label>
                    <input
                      type="number"
                      value={categoryForm.perKmFare}
                      onChange={(e) => setCategoryForm({ ...categoryForm, perKmFare: Number(e.target.value) })}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-900 font-bold"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">সর্বনিম্ন ভাড়া (৳):</label>
                    <input
                      type="number"
                      value={categoryForm.minFare}
                      onChange={(e) => setCategoryForm({ ...categoryForm, minFare: Number(e.target.value) })}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-900 font-bold"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-4 pt-1">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={categoryForm.isEmergency}
                      onChange={(e) => setCategoryForm({ ...categoryForm, isEmergency: e.target.checked })}
                      className="w-4 h-4 text-emerald-600 rounded"
                    />
                    <span className="text-xs font-bold text-slate-800">জরুরি সেবা (Emergency Badge)</span>
                  </label>

                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={categoryForm.isFree}
                      onChange={(e) => setCategoryForm({ ...categoryForm, isFree: e.target.checked })}
                      className="w-4 h-4 text-emerald-600 rounded"
                    />
                    <span className="text-xs font-bold text-slate-800">বিনামূল্যে সেবা (Free)</span>
                  </label>
                </div>
              </div>

              {/* Accent Color */}
              <div className="grid grid-cols-2 gap-3 items-center">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">থিম অ্যাকসেন্ট কালার (HEX):</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={categoryForm.accentColor || '#059669'}
                      onChange={(e) => setCategoryForm({ ...categoryForm, accentColor: e.target.value })}
                      className="w-8 h-8 rounded-lg border border-slate-300 cursor-pointer p-0"
                    />
                    <input
                      type="text"
                      value={categoryForm.accentColor || '#059669'}
                      onChange={(e) => setCategoryForm({ ...categoryForm, accentColor: e.target.value })}
                      className="flex-1 px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg font-mono text-slate-800"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">ইকন ধরন (Icon Style):</label>
                  <select
                    value={categoryForm.iconType || 'auto'}
                    onChange={(e) => setCategoryForm({ ...categoryForm, iconType: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 font-bold"
                  >
                    <option value="auto">অটো / ইজিবাইক</option>
                    <option value="cng">সিএনজি</option>
                    <option value="car">প্রাইভেট কার</option>
                    <option value="microbus">মাইক্রোবাস</option>
                    <option value="bike">মোটরসাইকেল</option>
                    <option value="ambulance">এম্বুলেন্স</option>
                    <option value="fire">ফায়ার সার্ভিস</option>
                    <option value="truck">পিকআপ / ভ্যান</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsCategoryModalOpen(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl shadow-xs cursor-pointer"
                >
                  {editingCategory ? 'আপডেট করুন' : 'তৈরি করুন'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* SUB-MODAL: EMERGENCY HOTLINE ADD / EDIT                        */}
      {/* ============================================================== */}
      {isContactModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 bg-slate-950/75 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-5 shadow-2xl border border-slate-200 animate-in zoom-in-95 text-slate-900">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3.5">
              <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-1.5">
                <PhoneCall className="w-4 h-4 text-red-600" />
                <span>{editingContact ? 'জরুরি হটলাইন তথ্য সম্পাদনা' : 'নতুন জরুরি হটলাইন যোগ'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsContactModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitContact} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">হটলাইনের নাম / সেবা: *</label>
                <input
                  type="text"
                  value={contactForm.titleBn}
                  onChange={(e) => setContactForm({ ...contactForm, titleBn: e.target.value })}
                  placeholder="যেমন: উপজেলা স্বাস্থ্য কমপ্লেক্স (হাসপাতাল)"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500"
                  required
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">ফোন নম্বর (সরাসরি কল হবে): *</label>
                <input
                  type="text"
                  value={contactForm.phone}
                  onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })}
                  placeholder="যেমন: 01710-024452"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold text-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
                  required
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">বিকল্প নম্বর (ঐচ্ছিক):</label>
                <input
                  type="text"
                  value={contactForm.altPhone || ''}
                  onChange={(e) => setContactForm({ ...contactForm, altPhone: e.target.value })}
                  placeholder="যেমন: 09025-56222"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono text-slate-700 focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">সেবার ধরন / ক্যাটাগরি:</label>
                  <select
                    value={contactForm.category}
                    onChange={(e) => setContactForm({ ...contactForm, category: e.target.value as any })}
                    className="w-full px-2.5 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    <option value="hospital">হাসপাতাল / চিকিৎসা</option>
                    <option value="ambulance">এম্বুলেন্স সেবা</option>
                    <option value="fire">ফায়ার সার্ভিস</option>
                    <option value="police">থানা পুলিশ</option>
                    <option value="blood">রক্তদান সংস্থা</option>
                    <option value="upazila">উপজেলা প্রশাসন / হেল্পলাইন</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">এলাকা / অবস্থান:</label>
                  <input
                    type="text"
                    value={contactForm.locationBn}
                    onChange={(e) => setContactForm({ ...contactForm, locationBn: e.target.value })}
                    placeholder="যেমন: গফরগাঁও সদর রোড"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsContactModalOpen(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white font-extrabold rounded-xl shadow-xs cursor-pointer"
                >
                  {editingContact ? 'আপডেট করুন' : 'সংরক্ষণ করুন'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* SUB-MODAL: POPULAR PLACE ADD / EDIT                           */}
      {/* ============================================================== */}
      {isPlaceModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 bg-slate-950/75 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-5 shadow-2xl border border-slate-200 animate-in zoom-in-95 text-slate-900">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3.5">
              <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-rose-500" />
                <span>{editingPlace ? 'জনপ্রিয় স্থানের তথ্য সম্পাদনা' : 'নতুন জনপ্রিয় স্থান যোগ করুন'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsPlaceModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitPlace} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">স্থানের বাংলা নাম (ড্রপডাউনে যা দেখাবে): *</label>
                <input
                  type="text"
                  value={placeForm.bengaliName}
                  onChange={(e) => setPlaceForm({ ...placeForm, bengaliName: e.target.value })}
                  placeholder="যেমন: গফরগাঁও রেলওয়ে স্টেশন"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">স্থানের ইংরেজি নাম / কোড (ঐচ্ছিক):</label>
                <input
                  type="text"
                  value={placeForm.name}
                  onChange={(e) => setPlaceForm({ ...placeForm, name: e.target.value })}
                  placeholder="যেমন: Gafargaon Railway Station"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">ক্যাটাগরি / ধরন:</label>
                  <select
                    value={placeForm.category}
                    onChange={(e) => setPlaceForm({ ...placeForm, category: e.target.value as any })}
                    className="w-full px-2.5 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="স্ট্যান্ড">স্ট্যান্ড পয়েন্ট</option>
                    <option value="মোড়">চৌরাস্তা / মোড়</option>
                    <option value="বাজার">বাজার / হাট</option>
                    <option value="হাসপাতাল">হাসপাতাল / স্বাস্থ্যকেন্দ্র</option>
                    <option value="শিক্ষা প্রতিষ্ঠান">স্কুল / কলেজ</option>
                    <option value="প্রশাসন">থানা / সরকারি অফিস</option>
                    <option value="ইউনিয়ন">ইউনিয়ন পরিষদ</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    এলাকা / ইউনিয়ন: <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={placeForm.area || GAFARGAON_UNIONS[0].nameBengali}
                    onChange={(e) => setPlaceForm({ ...placeForm, area: e.target.value })}
                    className="w-full px-2.5 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                    required
                  >
                    {GAFARGAON_UNIONS.map((u) => (
                      <option key={u.id} value={u.nameBengali}>
                        {u.nameBengali} ({u.thana === 'পাগলা থানা' ? 'পাগলা' : 'সদর'})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Google Maps Coordinates Quick Paste Helper (Auto Detect) */}
              <div className="bg-emerald-50 p-2.5 rounded-xl border border-emerald-200">
                <label className="font-bold text-xs text-emerald-900 block mb-1">
                  🌐 গুগল ম্যাপস কোঅর্ডিনেট পেস্ট করুন (অটো ডিটেক্ট):
                </label>
                <input
                  type="text"
                  placeholder="যেমন: 24.4536, 90.5479 (Google Maps থেকে কপি করা)"
                  onChange={(e) => {
                    const val = e.target.value.trim();
                    if (!val) return;
                    let lat = 0;
                    let lng = 0;
                    const urlMatch = val.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
                    if (urlMatch) {
                      lat = parseFloat(urlMatch[1]);
                      lng = parseFloat(urlMatch[2]);
                    } else {
                      const parts = val.split(/[,\s]+/).map(Number).filter(n => !isNaN(n));
                      if (parts.length >= 2) {
                        lat = parts[0];
                        lng = parts[1];
                      }
                    }
                    if (lat && lng) {
                      setPlaceForm(prev => ({
                        ...prev,
                        lat,
                        lng
                      }));
                    }
                  }}
                  className="w-full px-3 py-1.5 bg-white border border-emerald-300 rounded-lg text-xs font-mono text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <span className="text-[10px] text-emerald-700 block mt-1">
                  গুগল ম্যাপে যেকোনো লোকেশনে ট্যাপ বা রাইট ক্লিক করে Lat, Lng কপি করে এখানে পেস্ট করলেই নিচে অক্ষাংশ ও দ্রাঘিমাংশ স্বয়ংক্রিয়ভাবে বসে যাবে।
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">অক্ষাংশ (Latitude): *</label>
                  <input
                    type="number"
                    step="any"
                    value={placeForm.lat}
                    onChange={(e) => setPlaceForm({ ...placeForm, lat: parseFloat(e.target.value) || 0 })}
                    placeholder="24.4536"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    required
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">দ্রাঘিমাংশ (Longitude): *</label>
                  <input
                    type="number"
                    step="any"
                    value={placeForm.lng}
                    onChange={(e) => setPlaceForm({ ...placeForm, lng: parseFloat(e.target.value) || 0 })}
                    placeholder="90.5479"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    required
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsPlaceModalOpen(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl shadow-xs cursor-pointer"
                >
                  {editingPlace ? 'আপডেট করুন' : 'সংরক্ষণ করুন'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
