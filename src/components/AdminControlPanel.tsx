import React, { useState } from 'react';
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
  MessageCircle
} from 'lucide-react';
import { Stand, Driver, VehicleCategoryItem } from '../App';

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
}

export interface AdminControlPanelProps {
  isOpen: boolean;
  onClose: () => void;
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
  showToast: (msg: string) => void;
  onOpenCloudflareSettings?: () => void;
}

export const AdminControlPanel: React.FC<AdminControlPanelProps> = ({
  isOpen,
  onClose,
  onOpenCloudflareSettings,
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
  showToast
}) => {
  const [activeTab, setActiveTab] = useState<'stands' | 'categories' | 'appearance' | 'quick_chips' | 'drivers' | 'hotlines' | 'backup'>('appearance');

  // Stand Form Modal State
  const [editingStand, setEditingStand] = useState<Stand | null>(null);
  const [isStandModalOpen, setIsStandModalOpen] = useState(false);
  const [standForm, setStandForm] = useState({
    bengaliName: '',
    name: '',
    lat: 24.5535,
    lng: 90.5518
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

  // New Quick Chip input
  const [newQuickChipText, setNewQuickChipText] = useState('');

  // Backup JSON String
  const [backupJsonInput, setBackupJsonInput] = useState('');

  // Driver search filter
  const [driverFilterQuery, setDriverFilterQuery] = useState('');
  const [driverCatFilter, setDriverCatFilter] = useState('all');

  if (!isOpen) return null;

  // Handle Save Stand
  const handleSubmitStand = (e: React.FormEvent) => {
    e.preventDefault();
    if (!standForm.bengaliName.trim()) {
      showToast('স্ট্যান্ডের বাংলা নাম আবশ্যক');
      return;
    }
    const targetStand: Stand = {
      id: editingStand ? editingStand.id : `stand-${Date.now()}`,
      bengaliName: standForm.bengaliName.trim(),
      name: standForm.name.trim() || standForm.bengaliName.trim(),
      lat: Number(standForm.lat) || 24.5535,
      lng: Number(standForm.lng) || 90.5518,
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

  // Add Quick Chip
  const handleAddQuickChip = () => {
    if (!newQuickChipText.trim()) return;
    const trimmed = newQuickChipText.trim();
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

  const filteredDrivers = drivers.filter(d => {
    const matchesCat = driverCatFilter === 'all' || d.category === driverCatFilter;
    const matchesQuery = !driverFilterQuery.trim() ||
      d.name.toLowerCase().includes(driverFilterQuery.toLowerCase()) ||
      d.phone.includes(driverFilterQuery) ||
      d.plateNumber.toLowerCase().includes(driverFilterQuery.toLowerCase());
    return matchesCat && matchesQuery;
  });

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
              <div className="flex items-center gap-2">
                <h2 className="font-extrabold text-sm sm:text-lg text-white">
                  সফর সুপার কন্ট্রোল প্যানেল (Control Panel)
                </h2>
                <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-black px-2 py-0.5 rounded-full">
                  LIVE ADMIN
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                গফরগাঁও পৌরসভা ও পাগলা থানা — স্ট্যান্ড, বাহন, ভাড়া, কালার, ফন্ট ও উইজেট নিয়ন্ত্রণ
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onOpenCloudflareSettings && (
              <button
                type="button"
                onClick={onOpenCloudflareSettings}
                className="px-2.5 py-1.5 text-xs font-bold bg-slate-800 hover:bg-slate-700 text-amber-300 rounded-xl flex items-center gap-1.5 transition cursor-pointer border border-slate-700"
                title="লাইভ সার্ভার কনফিগারেশন"
              >
                <span>☁️ লাইভ সার্ভার</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-xl bg-slate-800 hover:bg-slate-700 cursor-pointer transition"
              title="বন্ধ করুন"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
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

                <button
                  type="button"
                  onClick={() => {
                    setEditingStand(null);
                    setStandForm({ bengaliName: '', name: '', lat: 24.5535, lng: 90.5518 });
                    setIsStandModalOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold px-4 py-2 rounded-xl text-xs sm:text-sm shadow-xs cursor-pointer transition shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ নতুন স্ট্যান্ড যোগ করুন</span>
                </button>
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
                              setStandForm({
                                bengaliName: stand.bengaliName,
                                name: stand.name,
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
          {/* TAB: QUICK DESTINATION CHIPS                              */}
          {/* ========================================================== */}
          {activeTab === 'quick_chips' && (
            <div className="space-y-4 max-w-3xl">
              <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                <h3 className="font-extrabold text-sm sm:text-base text-slate-900 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  দ্রুত গন্তব্য চিপস কাস্টমাইজেশন (Quick Destination Shortcuts)
                </h3>
                <p className="text-xs text-slate-500">
                  যাত্রীরা যাত্রা পরিকল্পনা সেকশনে 'পিকআপ' ও 'গন্তব্য' বক্সের নিচেই এই শর্টকাট বাটনগুলো দেখতে পান। এখানে নতুন স্থান যুক্ত বা অদরকারি স্থান ডিলিট করতে পারবেন।
                </p>

                {/* Add Quick Chip Input */}
                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="text"
                    value={newQuickChipText}
                    onChange={(e) => setNewQuickChipText(e.target.value)}
                    placeholder="যেমন: পাগলা বাজার মোড় বা লংগাইর হাই স্কুল..."
                    className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddQuickChip();
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleAddQuickChip}
                    className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs sm:text-sm shadow-xs cursor-pointer transition shrink-0"
                  >
                    <Plus className="w-4 h-4" />
                    <span>যুক্ত করুন</span>
                  </button>
                </div>

                {/* Current Quick Chips List */}
                <div className="pt-4 border-t border-slate-100">
                  <label className="text-xs font-bold text-slate-700 block mb-2">
                    বর্তমানে সক্রিয় দ্রুত গন্তব্য চিপস ({settingsDraft.quickDestinations.length}টি):
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {settingsDraft.quickDestinations.map((chip) => (
                      <div
                        key={chip}
                        className="inline-flex items-center gap-2 bg-emerald-50 border border-emerald-300 text-emerald-950 px-3 py-1.5 rounded-xl text-xs font-bold shadow-2xs"
                      >
                        <span>{chip}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveQuickChip(chip)}
                          className="w-4 h-4 rounded-full bg-emerald-200/80 hover:bg-red-500 hover:text-white flex items-center justify-center text-[10px] text-emerald-800 cursor-pointer transition"
                          title="মুছে ফেলুন"
                        >
                          ✕
                        </button>
                      </div>
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
                          {driver.driverPhoto ? (
                            <img
                              src={driver.driverPhoto}
                              alt={driver.name}
                              className="w-11 h-11 rounded-xl object-cover border border-emerald-300 shrink-0"
                            />
                          ) : (
                            <div className="w-11 h-11 rounded-xl bg-slate-100 flex items-center justify-center text-lg shrink-0">
                              👤
                            </div>
                          )}
                          <div className="min-w-0">
                            <h4 className="font-extrabold text-sm text-slate-900 truncate">{driver.name}</h4>
                            <span className="text-[11px] text-slate-500 font-mono block">{driver.phone}</span>
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

                      <div className="text-xs text-slate-600 space-y-1 my-2">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">বাহন:</span>
                          <span className="font-bold text-slate-800">{driver.vehicleModel} ({driver.categoryBengali})</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">নম্বরপ্লেট:</span>
                          <span className="font-mono text-emerald-700 font-bold">{driver.plateNumber}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">স্ট্যান্ড:</span>
                          <span className="text-slate-700 truncate">{driver.standName}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">লাইসেন্স:</span>
                          <span className="font-mono text-slate-700 font-medium">{driver.licenseNumber}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">NID নম্বর:</span>
                          <span className="font-mono text-slate-700 font-medium">{driver.nidNumber}</span>
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
            <div className="space-y-4 max-w-2xl">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                <h3 className="font-extrabold text-sm sm:text-base text-slate-900 flex items-center gap-2">
                  <PhoneCall className="w-4 h-4 text-red-600" />
                  জরুরি হটলাইন নম্বর ব্যবস্থাপনা
                </h3>
                <p className="text-xs text-slate-500">
                  উপজেলা স্বাস্থ্য কমপ্লেক্স, ফায়ার সার্ভিস, থানা পুলিশ ও জাতীয় জরুরি নম্বর পরিবর্তন করতে পারেন।
                </p>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">
                      উপজেলা স্বাস্থ্য কমপ্লেক্স ও এম্বুলেন্স হটলাইন:
                    </label>
                    <input
                      type="text"
                      value={hotlinesDraft.hospital}
                      onChange={(e) => setHotlinesDraft({ ...hotlinesDraft, hospital: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">
                      গফরগাঁও ফায়ার সার্ভিস ও সিভিল ডিফেন্স:
                    </label>
                    <input
                      type="text"
                      value={hotlinesDraft.fire}
                      onChange={(e) => setHotlinesDraft({ ...hotlinesDraft, fire: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">
                      গফরগাঁও ও পাগলা থানা পুলিশ কন্ট্রোল:
                    </label>
                    <input
                      type="text"
                      value={hotlinesDraft.police}
                      onChange={(e) => setHotlinesDraft({ ...hotlinesDraft, police: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">
                      জাতীয় জরুরি সেবা নম্বর:
                    </label>
                    <input
                      type="text"
                      value={hotlinesDraft.national}
                      onChange={(e) => setHotlinesDraft({ ...hotlinesDraft, national: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={handleSaveHotlinesAction}
                      className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-xl text-xs shadow-xs cursor-pointer transition"
                    >
                      <Save className="w-4 h-4" />
                      <span>হটলাইন সংরক্ষণ করুন</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================== */}
          {/* TAB: BACKUP & RESTORE                                     */}
          {/* ========================================================== */}
          {activeTab === 'backup' && (
            <div className="space-y-6 max-w-3xl">
              {/* Full Project Source Code ZIP for GitHub & Cloudflare */}
              <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 p-5 rounded-2xl border border-emerald-500/30 text-white shadow-lg space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-extrabold text-sm sm:text-base text-amber-300 flex items-center gap-2">
                    <Download className="w-5 h-5 text-emerald-400" />
                    ফুল সোর্স কোড জিপ ডাউনলোড (GitHub & Cloudflare Ready)
                  </h3>
                  <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold px-2 py-0.5 rounded-full">
                    স্বচ্ছ ও ক্লিন জিপ
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  এই জিপ ফাইলে সম্পূর্ণ প্রজেক্টের নিট-অ্যান্ড-ক্লিন সোর্স কোড (BRTA ভেরিফিকেশন, ক্লাউডফ্লেয়ার লাইভ ট্র্যাকিং, ম্যাপ স্ক্রল লক ও সকল ফিচারসহ) দেওয়া আছে। কোনো অপ্রয়োজনীয় বা ভারী ক্যাশ ফাইল নেই। এটি এক্সট্রাক্ট করে আপনার GitHub রিপোজিটরিতে আপলোড করলে ক্লাউডফ্লেয়ার পেজেস (Cloudflare Pages) স্বয়ংক্রিয়ভাবে অটো-আপডেট হয়ে যাবে।
                </p>
                <div className="flex flex-wrap items-center gap-3 pt-1">
                  <a
                    href="/safar-gafargaon-source.zip"
                    download="safar-gafargaon-source.zip"
                    className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black px-4 py-2.5 rounded-xl text-xs sm:text-sm shadow-md cursor-pointer transition active:scale-95"
                  >
                    <Download className="w-4 h-4 text-slate-950" />
                    <span>ডাউনলোড safar-gafargaon-source.zip</span>
                  </a>
                  <span className="text-[11px] text-slate-400">
                    ফাইল সাইজ: ~1 MB • সম্পূর্ণ রেডি
                  </span>
                </div>
                <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-700/60 text-[11px] text-slate-300 space-y-1">
                  <p className="font-bold text-amber-300">🚀 ক্লাউডফ্লেয়ার অটো-ডিপ্লয় সেটিংস:</p>
                  <p>• Framework preset: <code className="text-emerald-300 font-mono">Vite</code></p>
                  <p>• Build command: <code className="text-emerald-300 font-mono">npm run build</code></p>
                  <p>• Build output directory: <code className="text-emerald-300 font-mono">dist</code></p>
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

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">অক্ষাংশ (Latitude):</label>
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
                  <label className="font-bold text-slate-700 block mb-1">দ্রাঘিমাংশ (Longitude):</label>
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

    </div>
  );
};
