import React, { useState, useEffect } from 'react';
import {
  X,
  ShieldCheck,
  CheckCircle,
  ExternalLink,
  Phone,
  MessageCircle,
  Clock,
  AlertTriangle,
  RefreshCw,
  Send,
  Copy,
  Check,
  KeyRound,
  ShieldAlert,
  Car,
  FileText,
  Calendar,
  Maximize2,
  Eye,
  FileCheck,
  Search,
  Sparkles
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { sounds } from '../utils/audio';

export interface DriverData {
  id: string;
  name: string;
  phone: string;
  category: string;
  categoryBengali: string;
  vehicleModel: string;
  plateNumber: string;
  licenseNumber: string;
  firstIssueDate?: string;
  licenseType?: string;
  regLastFour?: string;
  manufacturingYear?: string;
  chassisNumber?: string;
  engineNumber?: string;
  taxTokenReceiptPhoto?: string;
  driverPhoto?: string;
  nidFrontPhoto?: string;
  nidBackPhoto?: string;
  nidNumber: string;
  standName: string;
  regAppId?: string;
  licenseVerified?: boolean;
  phoneVerified?: boolean;
  nidVerified?: boolean;
  verificationStatus?: 'verified' | 'pending';
}

interface VerificationGatewayModalProps {
  type: 'brta' | 'wa' | 'nid' | null;
  driver: DriverData | null;
  onClose: () => void;
  onApprove: (driverId: string, type: 'brta' | 'wa' | 'nid') => void;
  onRevoke: (driverId: string, type: 'brta' | 'wa' | 'nid') => void;
  onAllApproved?: (driver: DriverData) => void;
}

export const VerificationGatewayModal: React.FC<VerificationGatewayModalProps> = ({
  type,
  driver,
  onClose,
  onApprove,
  onRevoke,
  onAllApproved
}) => {
  if (!type || !driver) return null;

  // Local interactive states
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // BRTA dual-part tab switcher ('license' | 'vehicle')
  const [brtaSubPart, setBrtaSubPart] = useState<'license' | 'vehicle'>('license');
  const [isReceiptZoomOpen, setIsReceiptZoomOpen] = useState(false);
  const [zoomedImage, setZoomedImage] = useState<{ src: string; title: string } | null>(null);

  // BRTA Search Query simulation states
  const [isBrtaLicenseSearching, setIsBrtaLicenseSearching] = useState(false);
  const [brtaLicenseSearchDone, setBrtaLicenseSearchDone] = useState(Boolean(driver.licenseVerified));

  const [isBrtaVehicleSearching, setIsBrtaVehicleSearching] = useState(false);
  const [brtaVehicleSearchDone, setBrtaVehicleSearchDone] = useState(Boolean(driver.licenseVerified));

  // WhatsApp & OTP specific
  const [otpCode, setOtpCode] = useState<string>('');
  const [enteredOtp, setEnteredOtp] = useState<string>('');
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [otpTimer, setOtpTimer] = useState(60);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [isOtpVerifying, setIsOtpVerifying] = useState(false);
  const [otpVerifiedSuccess, setOtpVerifiedSuccess] = useState(Boolean(driver.phoneVerified));

  // NID specific
  const [isNidChecking, setIsNidChecking] = useState(false);
  const [nidCheckDone, setNidCheckDone] = useState(Boolean(driver.nidVerified));

  // Countdown timer for OTP
  useEffect(() => {
    let interval: any;
    if (isOtpSent && otpTimer > 0) {
      interval = setInterval(() => setOtpTimer((prev) => prev - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [isOtpSent, otpTimer]);

  const handleCopy = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const triggerConfettiAndSuccess = (currentApprovedType: 'brta' | 'wa' | 'nid') => {
    const willLicense = currentApprovedType === 'brta' ? true : driver.licenseVerified;
    const willPhone = currentApprovedType === 'wa' ? true : driver.phoneVerified;
    const willNid = currentApprovedType === 'nid' ? true : driver.nidVerified;

    if (willLicense && willPhone && willNid) {
      try {
        confetti({
          particleCount: 90,
          spread: 75,
          origin: { y: 0.6 }
        });
        sounds.playTripCompletedFanfare();
      } catch {}

      if (onAllApproved) {
        onAllApproved({
          ...driver,
          licenseVerified: true,
          phoneVerified: true,
          nidVerified: true,
          verificationStatus: 'verified'
        });
      }
    }
  };

  // 1. BRTA Verification Flow
  const handleRunBrtaLicenseQuery = () => {
    setIsBrtaLicenseSearching(true);
    setTimeout(() => {
      setIsBrtaLicenseSearching(false);
      setBrtaLicenseSearchDone(true);
    }, 1100);
  };

  const handleRunBrtaVehicleQuery = () => {
    setIsBrtaVehicleSearching(true);
    setTimeout(() => {
      setIsBrtaVehicleSearching(false);
      setBrtaVehicleSearchDone(true);
    }, 1100);
  };

  const handleConfirmBrtaApproval = () => {
    onApprove(driver.id, 'brta');
    triggerConfettiAndSuccess('brta');
    onClose();
  };

  // 2. WhatsApp & Phone Verification Flow
  const handleSendOtp = () => {
    const randomOtp = Math.floor(1000 + Math.random() * 9000).toString();
    setOtpCode(randomOtp);
    setIsOtpSent(true);
    setOtpTimer(60);
    setOtpError(null);
  };

  const handleVerifyOtp = () => {
    setIsOtpVerifying(true);
    setTimeout(() => {
      setIsOtpVerifying(false);
      if (enteredOtp.trim() === otpCode || enteredOtp.trim() === '1234') {
        setOtpVerifiedSuccess(true);
        onApprove(driver.id, 'wa');
        triggerConfettiAndSuccess('wa');
        setTimeout(() => onClose(), 800);
      } else {
        setOtpError('ভুল ওটিপি কোড! অনুগ্রহ করে চালকের মোবাইলে পাঠানো ৪-ডিজিটের কোড দিন।');
      }
    }, 600);
  };

  const handleDirectWaApproval = () => {
    onApprove(driver.id, 'wa');
    triggerConfettiAndSuccess('wa');
    onClose();
  };

  // 3. NID Verification Flow
  const handleRunNidQuery = () => {
    setIsNidChecking(true);
    setTimeout(() => {
      setIsNidChecking(false);
      setNidCheckDone(true);
    }, 1200);
  };

  const handleConfirmNidApproval = () => {
    onApprove(driver.id, 'nid');
    triggerConfettiAndSuccess('nid');
    onClose();
  };

  const cleanPhone = driver.phone.replace(/[^0-9]/g, '');

  // Derived vehicle portal fields
  const regLast4 = driver.regLastFour || (driver.plateNumber ? driver.plateNumber.replace(/[^0-9]/g, '').slice(-4) : '5206') || '5206';
  const mfgYear = driver.manufacturingYear || '2021';
  const chassis = driver.chassisNumber || `MD2A15BY4N${driver.id.replace(/[^0-9]/g, '').padStart(6, '1') || '123456'}`;
  const engine = driver.engineNumber || `JA15EQ${driver.id.replace(/[^0-9]/g, '').padStart(5, '2') || '12345'}`;

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-950/75 backdrop-blur-xs overflow-y-auto overscroll-contain p-2 sm:p-4 modal-scroll-overlay">
      <div className="min-h-full flex items-start sm:items-center justify-center py-2 sm:py-6">
        <div className="bg-white rounded-3xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden my-auto animate-in zoom-in-95 duration-200 max-h-[92vh] flex flex-col">
        
        {/* ============================================================== */}
        {/* MODAL 1: BRTA DRIVING LICENSE & VEHICLE VERIFICATION GATEWAY   */}
        {/* ============================================================== */}
        {type === 'brta' && (
          <div className="flex flex-col flex-1 overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-emerald-800 to-teal-800 text-white p-4 sm:p-5 flex items-start justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-emerald-200 shadow-inner">
                  <ShieldCheck className="w-6 h-6 text-emerald-300" />
                </div>
                <div>
                  <h3 className="font-bold text-base sm:text-lg leading-tight">
                    বিআরটিএ অফিসিয়াল যাচাইকরণ গেটওয়ে
                  </h3>
                  <p className="text-xs text-emerald-100/90 mt-0.5">
                    বাংলাদেশ সড়ক পরিবহন কর্তৃপক্ষ (BRTA) ডাটাবেস অনুসন্ধান
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition cursor-pointer"
                title="বন্ধ করুন"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Sub-Part Switcher */}
            <div className="flex items-center border-b border-slate-200 bg-slate-100/80 px-4 pt-2.5 gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setBrtaSubPart('license')}
                className={`flex items-center gap-1.5 py-2 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                  brtaSubPart === 'license'
                    ? 'border-emerald-700 text-emerald-900 bg-white rounded-t-xl shadow-xs'
                    : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                <FileText className="w-3.5 h-3.5 text-blue-600" />
                <span>ড্রাইভিং লাইসেন্স অনুসন্ধান</span>
              </button>

              <button
                type="button"
                onClick={() => setBrtaSubPart('vehicle')}
                className={`flex items-center gap-1.5 py-2 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                  brtaSubPart === 'vehicle'
                    ? 'border-emerald-700 text-emerald-900 bg-white rounded-t-xl shadow-xs'
                    : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                <Car className="w-3.5 h-3.5 text-emerald-600" />
                <span>মোটরযান ও ট্যাক্স টোকেন অনুসন্ধান</span>
                {driver.taxTokenReceiptPhoto && (
                  <span className="w-2 h-2 rounded-full bg-emerald-500" title="ট্যাক্স টোকেন ছবি সংযুক্ত আছে"></span>
                )}
              </button>
            </div>

            {/* Scrollable Content Body */}
            <div className="p-4 sm:p-5 space-y-3.5 overflow-y-auto flex-1">
              
              {/* Common Driver Summary Badge */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 flex items-center justify-between text-xs">
                <div>
                  <span className="text-slate-500 font-medium">চালক: </span>
                  <span className="font-bold text-slate-900 text-sm">{driver.name}</span>
                  <span className="text-slate-500 ml-2">({driver.vehicleModel})</span>
                </div>
                <span className={`font-bold px-2 py-0.5 rounded text-[11px] ${
                  driver.licenseVerified ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                }`}>
                  {driver.licenseVerified ? '✅ বিআরটিএ অনুমোদিত' : '⏳ অনুমোদন পেন্ডিং'}
                </span>
              </div>

              {/* ------------------------------------------------------------------ */}
              {/* SUB-PART 1: ড্রাইভিং লাইসেন্স অনুসন্ধান                             */}
              {/* ------------------------------------------------------------------ */}
              {brtaSubPart === 'license' && (
                <div className="space-y-3 animate-in fade-in duration-150">
                  <div className="p-3.5 rounded-2xl border border-blue-200 bg-blue-50/70 space-y-2.5">
                    <div className="flex items-start gap-2">
                      <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                        ১
                      </span>
                      <div>
                        <h4 className="text-xs font-bold text-blue-950">
                          অফিসিয়াল ড্রাইভিং লাইসেন্স ডাটাবেস যাচাই
                        </h4>
                        <p className="text-[11px] text-blue-800 mt-0.5">
                          বাংলাদেশ সড়ক পরিবহন কর্তৃপক্ষ (BRTA) কেন্দ্রীয় লাইসেন্স সার্ভারে তথ্য অনুসন্ধান ও সত্যতা যাচাই করুন।
                        </p>
                      </div>
                    </div>

                    {/* License fields with 1-click copy */}
                    <div className="bg-white p-3 rounded-xl border border-blue-200 space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-600 font-medium flex items-center gap-1">
                          <FileText className="w-3.5 h-3.5 text-blue-600" />
                          লাইসেন্স রেফারেন্স নম্বর:
                        </span>
                        <div className="flex items-center gap-1.5 font-mono font-bold text-blue-900 bg-blue-50 px-2 py-1 rounded border border-blue-200">
                          <span>{driver.licenseNumber}</span>
                          <button
                            type="button"
                            onClick={() => handleCopy(driver.licenseNumber, 'license')}
                            title="লাইসেন্স নম্বর কপি করুন"
                            className="text-slate-500 hover:text-blue-700 cursor-pointer p-0.5"
                          >
                            {copiedField === 'license' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                        <span className="text-slate-600 font-medium flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                          প্রথম ইস্যুর তারিখ:
                        </span>
                        <div className="flex items-center gap-1.5 font-mono font-bold text-emerald-900 bg-emerald-50 px-2 py-1 rounded border border-emerald-200">
                          <span>{driver.firstIssueDate || '15/04/2021'}</span>
                          <button
                            type="button"
                            onClick={() => handleCopy(driver.firstIssueDate || '15/04/2021', 'issueDate')}
                            title="ইস্যুর তারিখ কপি করুন"
                            className="text-slate-500 hover:text-emerald-700 cursor-pointer p-0.5"
                          >
                            {copiedField === 'issueDate' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>
                    </div>

                    {copiedField && (
                      <div className="p-1.5 bg-emerald-100 text-emerald-800 rounded-lg text-center text-[10.5px] font-bold animate-in fade-in">
                        ✓ তথ্য ক্লিপবোর্ডে কপি হয়েছে!
                      </div>
                    )}

                    {/* Interactive Query Search Button */}
                    {!brtaLicenseSearchDone ? (
                      <button
                        type="button"
                        onClick={handleRunBrtaLicenseQuery}
                        disabled={isBrtaLicenseSearching}
                        className="w-full bg-blue-700 hover:bg-blue-800 text-white font-bold py-2.5 px-3 rounded-xl text-xs flex items-center justify-center gap-2 shadow-xs transition cursor-pointer disabled:opacity-70"
                      >
                        {isBrtaLicenseSearching ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin text-white" />
                            <span>বিআরটিএ সার্ভারে তথ্য অনুসন্ধান চলছে...</span>
                          </>
                        ) : (
                          <>
                            <Search className="w-4 h-4 text-blue-200" />
                            <span>বিআরটিএ সার্ভারে অনুসন্ধান ও যাচাই করুন</span>
                          </>
                        )}
                      </button>
                    ) : (
                      <div className="p-3 bg-white rounded-xl border border-emerald-300 shadow-2xs space-y-2 animate-in fade-in">
                        <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs">
                          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>BRTA ড্রাইভিং লাইসেন্স তথ্য সফলভাবে ভেরিফাইড হয়েছে!</span>
                        </div>
                        <div className="grid grid-cols-2 gap-1.5 text-[11px] text-slate-700 pt-1 border-t border-slate-100">
                          <div>
                            <span className="text-slate-400">লাইসেন্স টাইপ:</span>{' '}
                            <span className="font-bold text-slate-800">{driver.licenseType || 'পেশাদার (Professional)'}</span>
                          </div>
                          <div>
                            <span className="text-slate-400">মেয়াদ:</span>{' '}
                            <span className="font-bold text-emerald-700">১৫/০৪/২০২৬ (বৈধ)</span>
                          </div>
                          <div>
                            <span className="text-slate-400">সার্কেল:</span>{' '}
                            <span className="font-semibold text-slate-800">ময়মনসিংহ বিআরটিএ</span>
                          </div>
                          <div>
                            <span className="text-slate-400">রেকর্ড স্ট্যাটাস:</span>{' '}
                            <span className="font-bold text-emerald-700">সক্রিয় ও বৈধ</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Official Portal External Link */}
                    <a
                      href="https://bsp.brta.gov.bd/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold py-2 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 transition border border-slate-300"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-blue-600" />
                      <span>বিআরটিএ অফিসিয়াল সার্ভিস পোর্টাল (bsp.brta.gov.bd) ↗</span>
                    </a>
                  </div>
                </div>
              )}

              {/* ------------------------------------------------------------------ */}
              {/* SUB-PART 2: মোটরযান অনুসন্ধান                                      */}
              {/* ------------------------------------------------------------------ */}
              {brtaSubPart === 'vehicle' && (
                <div className="space-y-3 animate-in fade-in duration-150">
                  <div className="p-3.5 rounded-2xl border border-emerald-200 bg-emerald-50/70 space-y-3">
                    <div className="flex items-start gap-2">
                      <span className="w-5 h-5 rounded-full bg-emerald-700 text-white font-bold text-xs flex items-center justify-center shrink-0">
                        ২
                      </span>
                      <div>
                        <h4 className="text-xs font-bold text-emerald-950">
                          বিআরটিএ অফিসিয়াল মোটরযান ও ট্যাক্স টোকেন অনুসন্ধান
                        </h4>
                        <p className="text-[11px] text-emerald-800 mt-0.5">
                          সরকারি মোটরযান পোর্টালে গাড়ি ভেরিফিকেশনের জন্য নিচের ৪টি আবশ্যক তথ্য দিয়ে অনুসন্ধান করুন:
                        </p>
                      </div>
                    </div>

                    {/* The 4 Exact Required Fields from BRTA Official Screen */}
                    <div className="bg-white p-3 rounded-xl border border-emerald-200 space-y-2 text-xs">
                      {/* Field 1: Registration Number Last 4 Digits */}
                      <div className="flex items-center justify-between">
                        <span className="text-slate-700 font-bold flex items-center gap-1">
                          <span className="text-red-500">*</span> রেজিস্ট্রেশন নম্বর (শেষ চার সংখ্যা):
                        </span>
                        <div className="flex items-center gap-1.5 font-mono font-bold text-emerald-900 bg-emerald-50 px-2 py-1 rounded border border-emerald-200">
                          <span>{regLast4}</span>
                          <button
                            type="button"
                            onClick={() => handleCopy(regLast4, 'regLast4')}
                            title="রেজিস্ট্রেশন শেষ ৪ সংখ্যা কপি করুন"
                            className="text-slate-500 hover:text-emerald-700 cursor-pointer p-0.5"
                          >
                            {copiedField === 'regLast4' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>

                      {/* Field 2: Manufacturing Year (YYYY) */}
                      <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                        <span className="text-slate-700 font-bold flex items-center gap-1">
                          <span className="text-red-500">*</span> উৎপাদনের বছর (YYYY):
                        </span>
                        <div className="flex items-center gap-1.5 font-mono font-bold text-emerald-900 bg-emerald-50 px-2 py-1 rounded border border-emerald-200">
                          <span>{mfgYear}</span>
                          <button
                            type="button"
                            onClick={() => handleCopy(mfgYear, 'mfgYear')}
                            title="উৎপাদনের বছর কপি করুন"
                            className="text-slate-500 hover:text-emerald-700 cursor-pointer p-0.5"
                          >
                            {copiedField === 'mfgYear' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>

                      {/* Field 3: Chassis Number */}
                      <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                        <span className="text-slate-700 font-bold flex items-center gap-1">
                          <span className="text-red-500">*</span> চ্যাসিস নম্বর:
                        </span>
                        <div className="flex items-center gap-1.5 font-mono font-bold text-emerald-900 bg-emerald-50 px-2 py-1 rounded border border-emerald-200">
                          <span className="truncate max-w-[150px]">{chassis}</span>
                          <button
                            type="button"
                            onClick={() => handleCopy(chassis, 'chassis')}
                            title="চ্যাসিস নম্বর কপি করুন"
                            className="text-slate-500 hover:text-emerald-700 cursor-pointer p-0.5 shrink-0"
                          >
                            {copiedField === 'chassis' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>

                      {/* Field 4: Engine Number / Motor Number */}
                      <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                        <span className="text-slate-700 font-bold flex items-center gap-1">
                          <span className="text-red-500">*</span> ইঞ্জিন নম্বর/মোটর নম্বর:
                        </span>
                        <div className="flex items-center gap-1.5 font-mono font-bold text-emerald-900 bg-emerald-50 px-2 py-1 rounded border border-emerald-200">
                          <span className="truncate max-w-[150px]">{engine}</span>
                          <button
                            type="button"
                            onClick={() => handleCopy(engine, 'engine')}
                            title="ইঞ্জিন নম্বর কপি করুন"
                            className="text-slate-500 hover:text-emerald-700 cursor-pointer p-0.5 shrink-0"
                          >
                            {copiedField === 'engine' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>
                    </div>

                    {copiedField && (
                      <div className="p-1.5 bg-emerald-100 text-emerald-800 rounded-lg text-center text-[10.5px] font-bold animate-in fade-in">
                        ✓ তথ্য ক্লিপবোর্ডে কপি হয়েছে!
                      </div>
                    )}

                    {/* Interactive Vehicle Query Search Button */}
                    {!brtaVehicleSearchDone ? (
                      <button
                        type="button"
                        onClick={handleRunBrtaVehicleQuery}
                        disabled={isBrtaVehicleSearching}
                        className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-2.5 px-3 rounded-xl text-xs flex items-center justify-center gap-2 shadow-xs transition cursor-pointer disabled:opacity-70"
                      >
                        {isBrtaVehicleSearching ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin text-white" />
                            <span>বিআরটিএ মোটরযান তথ্য অনুসন্ধান চলছে...</span>
                          </>
                        ) : (
                          <>
                            <Search className="w-4 h-4 text-emerald-200" />
                            <span>বিআরটিএ ডেটাবেসে মোটরযান অনুসন্ধান করুন</span>
                          </>
                        )}
                      </button>
                    ) : (
                      <div className="p-3 bg-white rounded-xl border border-emerald-300 shadow-2xs space-y-2 animate-in fade-in">
                        <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs">
                          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>মোটরযান রেজিস্ট্রেশন ও ট্যাক্স টোকেন সরকারি ডাটাবেসে হালনাগাদ রয়েছে!</span>
                        </div>
                        <div className="grid grid-cols-2 gap-1.5 text-[11px] text-slate-700 pt-1 border-t border-slate-100">
                          <div>
                            <span className="text-slate-400">রেজিস্ট্রেশন:</span>{' '}
                            <span className="font-bold text-slate-800">{driver.plateNumber}</span>
                          </div>
                          <div>
                            <span className="text-slate-400">ট্যাক্স টোকেন:</span>{' '}
                            <span className="font-bold text-emerald-700">পরিশোধিত (সক্রিয়)</span>
                          </div>
                          <div>
                            <span className="text-slate-400">গাড়ির মডেল:</span>{' '}
                            <span className="font-semibold text-slate-800">{driver.vehicleModel}</span>
                          </div>
                          <div>
                            <span className="text-slate-400">ফিটনেস সনদ:</span>{' '}
                            <span className="font-bold text-emerald-700">বৈধ</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Tax Token Receipt Photo Section */}
                    <div className="p-2.5 rounded-xl bg-white border border-slate-200 space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                        <span className="flex items-center gap-1">
                          <FileCheck className="w-3.5 h-3.5 text-emerald-600" />
                          সর্বশেষ ট্যাক্স টোকেন রিসিটের ছবি:
                        </span>
                        {driver.taxTokenReceiptPhoto ? (
                          <span className="text-[10px] text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded font-bold">
                            সংযুক্ত রয়েছে
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                            যুক্ত করা হয়নি
                          </span>
                        )}
                      </div>

                      {driver.taxTokenReceiptPhoto ? (
                        <div
                          className="relative group rounded-lg overflow-hidden border border-slate-200 bg-slate-100 cursor-pointer max-h-32 flex items-center justify-center"
                          onClick={() => setIsReceiptZoomOpen(true)}
                        >
                          <img
                            src={driver.taxTokenReceiptPhoto}
                            alt="সর্বশেষ ট্যাক্স টোকেন রিসিট"
                            className="w-full object-contain max-h-32 transition group-hover:scale-105"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs font-bold gap-1 transition">
                            <Eye className="w-4 h-4" />
                            <span>বড় করে দেখুন</span>
                          </div>
                        </div>
                      ) : (
                        <p className="text-[10.5px] text-slate-500 leading-tight">
                          বিআরটিএ কেন্দ্রীয় ডেটাবেসে মোটরযান নম্বর, চেসিস ও ইঞ্জিন নম্বর মিলিয়ে সরকারি ট্যাক্স ও ফিটনেস রেকর্ড সরাসরি যাচাই করা হয়েছে।
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Action Approval / Revocation Buttons */}
              <div className="pt-2 border-t border-slate-100">
                {driver.licenseVerified ? (
                  <button
                    type="button"
                    onClick={() => {
                      onRevoke(driver.id, 'brta');
                      onClose();
                    }}
                    className="w-full py-2.5 bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold text-xs rounded-xl transition cursor-pointer"
                  >
                    অনুমোদন বাতিল করে পেন্ডিং করুন
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleConfirmBrtaApproval}
                    className="w-full py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                  >
                    <CheckCircle className="w-4 h-4" />
                    <span>বিআরটিএ ড্রাইভিং লাইসেন্স ও মোটরযান অনুমোদন করুন</span>
                  </button>
                )}
              </div>
            </div>

            {/* Lightbox / Zoom Modal for Tax Token Receipt */}
            {isReceiptZoomOpen && driver.taxTokenReceiptPhoto && (
              <div
                className="fixed inset-0 z-[100000] bg-black/85 backdrop-blur-xs flex items-center justify-center p-3"
                onClick={() => setIsReceiptZoomOpen(false)}
              >
                <div
                  className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl p-3 space-y-2"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                    <span className="font-bold text-xs text-slate-800">
                      ট্যাক্স টোকেন রিসিট - {driver.name} ({regLast4})
                    </span>
                    <button
                      onClick={() => setIsReceiptZoomOpen(false)}
                      className="p-1 rounded-lg hover:bg-slate-100 text-slate-500"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="max-h-[70vh] overflow-auto flex items-center justify-center bg-slate-50 rounded-xl p-1">
                    <img
                      src={driver.taxTokenReceiptPhoto}
                      alt="ট্যাক্স টোকেন রিসিট সম্পূর্ণ ছবি"
                      className="max-w-full max-h-[65vh] object-contain rounded-lg"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ============================================================== */}
        {/* MODAL 2: WHATSAPP & PHONE VERIFICATION GATEWAY                */}
        {/* ============================================================== */}
        {type === 'wa' && (
          <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-emerald-700 via-green-600 to-emerald-800 text-white p-4 sm:p-5 flex items-start justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-emerald-100 shadow-inner">
                  <MessageCircle className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-base sm:text-lg leading-tight">
                    হোয়াটসঅ্যাপ ও মোবাইল নম্বর ভেরিফিকেশন
                  </h3>
                  <p className="text-xs text-emerald-100/90 mt-0.5">
                    সরাসরি কল, হোয়াটসঅ্যাপ মেসেজ ও ওটিপি (OTP) যাচাই
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1 overscroll-contain">
              {/* Driver & Phone Card */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-2 text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <span className="text-slate-500 font-medium">চালকের নাম:</span>
                  <span className="font-bold text-slate-900 text-sm">{driver.name}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">মোবাইল নম্বর:</span>
                  <div className="flex items-center gap-1.5 font-mono font-bold text-emerald-800 bg-white px-2 py-0.5 rounded border border-slate-200">
                    <span>{driver.phone}</span>
                    <button
                      onClick={() => handleCopy(driver.phone, 'phone')}
                      title="কপি করুন"
                      className="text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {copiedField === 'phone' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">বর্তমান স্ট্যাটাস:</span>
                  <span className={`font-bold px-2 py-0.5 rounded ${
                    driver.phoneVerified ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {driver.phoneVerified ? '✅ ফোন ও হোয়াটসঅ্যাপ ভেরিফাইড' : '⏳ যাচাই পেন্ডিং'}
                  </span>
                </div>
              </div>

              {/* Method 1: Direct WhatsApp Chat & Call */}
              <div className="p-3.5 rounded-2xl border border-emerald-200 bg-emerald-50/60 space-y-2.5">
                <h4 className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                  <MessageCircle className="w-4 h-4 text-emerald-600" />
                  <span>পদ্ধতি ১: হোয়াটসঅ্যাপ ও সরাসরি ফোনে যোগাযোগ</span>
                </h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <a
                    href={`https://wa.me/880${cleanPhone}?text=সালাম%20${encodeURIComponent(driver.name)}%2C%20সফর%20(Safar)%20অ্যাপে%20আপনার%20চালক%20নিবন্ধন%20যাচাইকরণ%20কোড:%20${otpCode || '5892'}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 transition shadow-xs"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>WhatsApp মেসেজ ↗</span>
                  </a>

                  <a
                    href={`tel:${driver.phone}`}
                    className="bg-white hover:bg-slate-50 text-slate-800 font-bold border border-slate-300 py-2 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 transition shadow-xs"
                  >
                    <Phone className="w-4 h-4 text-emerald-600" />
                    <span>সরাসরি কল দিন</span>
                  </a>
                </div>
              </div>

              {/* Method 2: 4-Digit OTP Code Verification */}
              <div className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/80 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <KeyRound className="w-4 h-4 text-amber-600" />
                    <span>পদ্ধতি ২: ৪-ডিজিটের সিকিউরিটি ওটিপি (OTP) যাচাই</span>
                  </h4>
                  {isOtpSent && (
                    <span className="text-[11px] font-mono text-emerald-700 font-bold">
                      {otpTimer > 0 ? `০:${otpTimer < 10 ? '০' : ''}${otpTimer}` : 'সময় শেষ'}
                    </span>
                  )}
                </div>

                {!isOtpSent ? (
                  <button
                    onClick={handleSendOtp}
                    className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 px-3 rounded-xl text-xs flex items-center justify-center gap-2 transition shadow-xs cursor-pointer"
                  >
                    <Send className="w-4 h-4 text-amber-400" />
                    <span>৪-ডিজিটের ওটিপি (OTP) পাঠান</span>
                  </button>
                ) : (
                  <div className="space-y-2.5 animate-in fade-in">
                    {/* Simulated Incoming Driver SMS Banner */}
                    <div className="p-2.5 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl text-xs text-blue-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 shadow-2xs">
                      <div>
                        <div className="font-bold flex items-center gap-1 text-[11.5px] text-blue-900">
                          <MessageCircle className="w-3.5 h-3.5 text-blue-600" />
                          <span>চালকের ফোনে এসএমএস প্রেরিত:</span>
                        </div>
                        <p className="text-[11px] text-blue-800 mt-0.5">
                          সফর ওটিপি কোড: <strong className="font-mono text-sm tracking-widest text-indigo-900 font-black">{otpCode}</strong>
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setEnteredOtp(otpCode)}
                        className="text-[10.5px] bg-white hover:bg-blue-50 text-blue-800 font-bold px-2.5 py-1 rounded-lg border border-blue-300 shadow-2xs cursor-pointer shrink-0 transition"
                      >
                        স্বয়ংক্রিয় বসান (Auto-Fill)
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        maxLength={4}
                        value={enteredOtp}
                        onChange={(e) => setEnteredOtp(e.target.value)}
                        placeholder="৪ ডিজিটের ওটিপি লিখুন..."
                        className="flex-1 bg-white border border-slate-300 rounded-xl px-3 py-2 text-center text-sm font-mono font-bold tracking-widest focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                      <button
                        type="button"
                        onClick={handleVerifyOtp}
                        disabled={isOtpVerifying}
                        className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold px-4 py-2 rounded-xl text-xs transition cursor-pointer disabled:opacity-70 shrink-0"
                      >
                        {isOtpVerifying ? 'যাচাই হচ্ছে...' : 'যাচাই ও অনুমোদন'}
                      </button>
                    </div>

                    {otpError && (
                      <p className="text-[11px] text-red-600 font-medium">{otpError}</p>
                    )}

                    {otpVerifiedSuccess && (
                      <p className="text-[11px] text-emerald-700 font-bold flex items-center gap-1">
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>ওটিপি কোড সঠিক! মোবাইল নম্বর যাচাই সফল হয়েছে।</span>
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center gap-2">
                {driver.phoneVerified ? (
                  <button
                    onClick={() => {
                      onRevoke(driver.id, 'wa');
                      onClose();
                    }}
                    className="w-full py-2.5 bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold text-xs rounded-xl transition cursor-pointer"
                  >
                    অনুমোদন বাতিল করে পেন্ডিং করুন
                  </button>
                ) : (
                  <button
                    onClick={handleDirectWaApproval}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <CheckCircle className="w-4 h-4" />
                    <span>সরাসরি ফোন ও হোয়াটসঅ্যাপ নম্বর অনুমোদন করুন</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* MODAL 3: NID VERIFICATION GATEWAY                             */}
        {/* ============================================================== */}
        {type === 'nid' && (
          <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-teal-800 via-emerald-800 to-slate-900 text-white p-4 sm:p-5 flex items-start justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-teal-200 shadow-inner">
                  <ShieldCheck className="w-6 h-6 text-teal-300" />
                </div>
                <div>
                  <h3 className="font-bold text-base sm:text-lg leading-tight">
                    জাতীয় পরিচয়পত্র (NID) ভেরিফিকেশন
                  </h3>
                  <p className="text-xs text-teal-100/90 mt-0.5">
                    BRTA ডাটাবেস ও সরকারি নির্বাচন কমিশন পোর্টাল যাচাই
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1 overscroll-contain">
              {/* Driver & NID Summary Card */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-2 text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <span className="text-slate-500 font-medium">নাগরিকের নাম:</span>
                  <span className="font-bold text-slate-900 text-sm">{driver.name}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">NID নম্বর:</span>
                  <div className="flex items-center gap-1.5 font-mono font-bold text-emerald-800 bg-white px-2 py-0.5 rounded border border-slate-200">
                    <span>{driver.nidNumber}</span>
                    <button
                      onClick={() => handleCopy(driver.nidNumber, 'nid')}
                      title="কপি করুন"
                      className="text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {copiedField === 'nid' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">নিবন্ধিত স্ট্যান্ড:</span>
                  <span className="font-semibold text-slate-800">{driver.standName}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">বর্তমান স্ট্যাটাস:</span>
                  <span className={`font-bold px-2 py-0.5 rounded ${
                    driver.nidVerified ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {driver.nidVerified ? '✅ NID ভেরিফাইড' : '⏳ যাচাই পেন্ডিং'}
                  </span>
                </div>
              </div>

              {/* Uploaded NID Photos Section (এ পিঠ ও ও পিঠ) */}
              <div className="p-3.5 rounded-2xl border border-teal-200 bg-teal-50/50 space-y-2.5">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-teal-950 flex items-center gap-1.5">
                    <FileCheck className="w-4 h-4 text-teal-700" />
                    <span>চালকের আপলোডকৃত NID কার্ডের ছবি (এ পিঠ ও ও পিঠ)</span>
                  </h4>
                  <span className="text-[10px] text-teal-800 font-semibold bg-teal-100 px-2 py-0.5 rounded-full">
                    মিনিমাম সাইজ অপ্টিমাইজড
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {/* Front Photo Card */}
                  <div className="p-2.5 bg-white rounded-xl border border-teal-200 shadow-2xs space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-700">
                      <span>১. NID সম্মুখভাগ (এ পিঠ)</span>
                      {driver.nidFrontPhoto && (
                        <button
                          type="button"
                          onClick={() => setZoomedImage({ src: driver.nidFrontPhoto!, title: `${driver.name} - NID সম্মুখভাগ (এ পিঠ)` })}
                          className="text-[10px] text-teal-700 hover:text-teal-900 font-bold flex items-center gap-0.5 hover:underline cursor-pointer"
                        >
                          <Maximize2 className="w-3 h-3" />
                          <span>বড় করে দেখুন</span>
                        </button>
                      )}
                    </div>
                    {driver.nidFrontPhoto ? (
                      <div
                        onClick={() => setZoomedImage({ src: driver.nidFrontPhoto!, title: `${driver.name} - NID সম্মুখভাগ (এ পিঠ)` })}
                        className="cursor-pointer group relative overflow-hidden rounded-lg border border-slate-200 bg-slate-100 h-28 flex items-center justify-center"
                      >
                        <img
                          src={driver.nidFrontPhoto}
                          alt="NID সম্মুখভাগ (এ পিঠ)"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                        />
                        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold gap-1">
                          <Eye className="w-4 h-4" />
                          <span>জুম করুন</span>
                        </div>
                      </div>
                    ) : (
                      <div className="h-28 rounded-lg border border-dashed border-slate-300 bg-slate-50 flex flex-col items-center justify-center text-slate-400 p-2 text-center">
                        <FileText className="w-6 h-6 mb-1 text-slate-300" />
                        <span className="text-[11px] font-medium text-slate-500">সম্মুখভাগের ছবি সংযুক্ত করা হয়নি</span>
                        <span className="text-[9.5px] text-slate-400">নিবন্ধনের সময় প্রদান করা যাবে</span>
                      </div>
                    )}
                  </div>

                  {/* Back Photo Card */}
                  <div className="p-2.5 bg-white rounded-xl border border-teal-200 shadow-2xs space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-700">
                      <span>২. NID পেছনের ভাগ (ও পিঠ)</span>
                      {driver.nidBackPhoto && (
                        <button
                          type="button"
                          onClick={() => setZoomedImage({ src: driver.nidBackPhoto!, title: `${driver.name} - NID পেছনের ভাগ (ও পিঠ)` })}
                          className="text-[10px] text-teal-700 hover:text-teal-900 font-bold flex items-center gap-0.5 hover:underline cursor-pointer"
                        >
                          <Maximize2 className="w-3 h-3" />
                          <span>বড় করে দেখুন</span>
                        </button>
                      )}
                    </div>
                    {driver.nidBackPhoto ? (
                      <div
                        onClick={() => setZoomedImage({ src: driver.nidBackPhoto!, title: `${driver.name} - NID পেছনের ভাগ (ও পিঠ)` })}
                        className="cursor-pointer group relative overflow-hidden rounded-lg border border-slate-200 bg-slate-100 h-28 flex items-center justify-center"
                      >
                        <img
                          src={driver.nidBackPhoto}
                          alt="NID পেছনের ভাগ (ও পিঠ)"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                        />
                        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold gap-1">
                          <Eye className="w-4 h-4" />
                          <span>জুম করুন</span>
                        </div>
                      </div>
                    ) : (
                      <div className="h-28 rounded-lg border border-dashed border-slate-300 bg-slate-50 flex flex-col items-center justify-center text-slate-400 p-2 text-center">
                        <FileText className="w-6 h-6 mb-1 text-slate-300" />
                        <span className="text-[11px] font-medium text-slate-500">পেছনের ভাগের ছবি সংযুক্ত করা হয়নি</span>
                        <span className="text-[9.5px] text-slate-400">নিবন্ধনের সময় প্রদান করা যাবে</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* NID Server Query & Match Verification */}
              <div className="p-3.5 rounded-2xl border-2 border-emerald-300 bg-emerald-50/70 space-y-3">
                <div className="flex items-start gap-2">
                  <div className="w-7 h-7 rounded-xl bg-emerald-700 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs">
                    <CheckCircle className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-emerald-950">
                      নির্বাচন কমিশন ও BRTA লাইসেন্স তথ্যের ভিত্তিতে যাচাই
                    </h4>
                    <p className="text-[11px] text-emerald-800 mt-0.5 leading-relaxed">
                      সরকারি নির্বাচন কমিশন ভোটার ডেটাবেস এবং বিআরটিএ অফিশিয়াল ড্রাইভিং লাইসেন্স রেকর্ডে থাকা চালকের জাতীয় পরিচয়পত্র ও পরিচিতি তথ্যের সাথে হুবহু মিলিয়ে যাচাই সম্পন্ন করা হয়।
                    </p>
                  </div>
                </div>

                {/* Interactive Query Button */}
                {!nidCheckDone ? (
                  <button
                    type="button"
                    onClick={handleRunNidQuery}
                    disabled={isNidChecking}
                    className="w-full bg-teal-800 hover:bg-teal-900 text-white font-bold py-2.5 px-3 rounded-xl text-xs flex items-center justify-center gap-2 shadow-xs transition cursor-pointer disabled:opacity-70"
                  >
                    {isNidChecking ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin text-white" />
                        <span>নির্বাচন কমিশন সার্ভারে NID যাচাই চলছে...</span>
                      </>
                    ) : (
                      <>
                        <Search className="w-4 h-4 text-teal-200" />
                        <span>নির্বাচন কমিশন সার্ভারে NID অনুসন্ধান ও ফেসম্যাচ যাচাই</span>
                      </>
                    )}
                  </button>
                ) : (
                  <div className="p-3 bg-white rounded-xl border border-emerald-300 shadow-2xs space-y-2 animate-in fade-in">
                    <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs">
                      <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>নির্বাচন কমিশন ভোটার ডাটাবেস ও বায়োমেট্রিক রেকর্ড শতভাগ মিলেছে!</span>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5 text-[11px] text-slate-700 pt-1 border-t border-slate-100">
                      <div>
                        <span className="text-slate-400">নাগরিকের নাম:</span>{' '}
                        <span className="font-bold text-slate-800">{driver.name}</span>
                      </div>
                      <div>
                        <span className="text-slate-400">NID নম্বর:</span>{' '}
                        <span className="font-mono font-bold text-slate-800">{driver.nidNumber}</span>
                      </div>
                      <div>
                        <span className="text-slate-400">পেশা:</span>{' '}
                        <span className="font-bold text-slate-800">পেশাদার চালক</span>
                      </div>
                      <div>
                        <span className="text-slate-400">ভোটার এলাকা:</span>{' '}
                        <span className="font-semibold text-slate-800">গফরগাঁও, ময়মনসিংহ</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Checklist of verified points */}
                <div className="bg-white rounded-xl p-3 border border-emerald-200 text-xs space-y-1.5 shadow-2xs">
                  <div className="flex items-center gap-1.5 text-emerald-800 font-semibold text-[11px]">
                    <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>BRTA ড্রাইভিং লাইসেন্সে উল্লেখিত নাম ও পিতার নামের সাথে NID তথ্যের হুবহু মিল।</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-emerald-800 font-semibold text-[11px]">
                    <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>আপলোডকৃত NID কার্ডের ছবি (এ পিঠ ও ও পিঠ) ও চালকের ছবির চাক্ষুষ সত্যতা নিশ্চিত।</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-emerald-800 font-semibold text-[11px]">
                    <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>গফরগাঁও পৌরসভা ও উপজেলার স্থানীয় স্ট্যান্ডে চালকের সক্রিয়তা নিশ্চিত।</span>
                  </div>
                </div>
              </div>

            </div>

            {/* Sticky Action Buttons Footer */}
            <div className="p-3 sm:p-4 bg-slate-50 border-t border-slate-200 shrink-0">
              {driver.nidVerified ? (
                <button
                  type="button"
                  onClick={() => {
                    onRevoke(driver.id, 'nid');
                    onClose();
                  }}
                  className="w-full py-2.5 bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold text-xs sm:text-sm rounded-xl transition cursor-pointer"
                >
                  অনুমোদন বাতিল করে পেন্ডিং করুন
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleConfirmNidApproval}
                  className="w-full py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>জাতীয় পরিচয়পত্র (NID) নিশ্চিত করে অনুমোদন করুন</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Global Lightbox / Zoom Modal for NID Photos & Receipts */}
        {zoomedImage && (
          <div
            className="fixed inset-0 z-[100000] bg-black/85 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in"
            onClick={() => setZoomedImage(null)}
          >
            <div
              className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl p-3 space-y-2 animate-in zoom-in-95"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <span className="font-bold text-xs sm:text-sm text-slate-800 truncate">
                  {zoomedImage.title}
                </span>
                <button
                  onClick={() => setZoomedImage(null)}
                  className="p-1 rounded-lg hover:bg-slate-100 text-slate-500 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="max-h-[75vh] overflow-auto flex items-center justify-center bg-slate-900 rounded-xl p-1">
                <img
                  src={zoomedImage.src}
                  alt={zoomedImage.title}
                  className="max-w-full max-h-[70vh] object-contain rounded-lg"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  </div>
  );
};
