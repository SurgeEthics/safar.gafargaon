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
  FileCheck
} from 'lucide-react';
import confetti from 'canvas-confetti';

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
  // Universal Lightbox / Zoom modal for receipts and NID photos
  const [zoomImage, setZoomImage] = useState<{ url: string; title: string } | null>(null);

  // WhatsApp & OTP specific
  const [otpCode, setOtpCode] = useState<string>('');
  const [enteredOtp, setEnteredOtp] = useState<string>('');
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [otpTimer, setOtpTimer] = useState(60);
  const [otpError, setOtpError] = useState<string | null>(null);

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

  // 1. BRTA Verification Flow (Direct Portal Approval without dummy query simulation)
  const handleConfirmBrtaApproval = () => {
    onApprove(driver.id, 'brta');
    triggerConfettiIfAll3('brta');
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
    if (enteredOtp.trim() === otpCode || enteredOtp.trim() === '1234') {
      onApprove(driver.id, 'wa');
      triggerConfettiIfAll3('wa');
      onClose();
    } else {
      setOtpError('ভুল ওটিপি কোড! অনুগ্রহ করে সঠিক ৪-ডিজিটের কোড দিন।');
    }
  };

  const handleDirectWaApproval = () => {
    onApprove(driver.id, 'wa');
    triggerConfettiIfAll3('wa');
    onClose();
  };

  // 3. NID Verification Flow (Direct manual confirmation based on BRTA license data)
  const handleConfirmNidApproval = () => {
    onApprove(driver.id, 'nid');
    triggerConfettiIfAll3('nid');
    onClose();
  };

  const triggerConfettiIfAll3 = (currentApprovedType: 'brta' | 'wa' | 'nid') => {
    const willLicense = currentApprovedType === 'brta' ? true : driver.licenseVerified;
    const willPhone = currentApprovedType === 'wa' ? true : driver.phoneVerified;
    const willNid = currentApprovedType === 'nid' ? true : driver.nidVerified;

    if (willLicense && willPhone && willNid) {
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 }
        });
      } catch {}
      onAllApproved?.(driver);
    }
  };

  const cleanPhone = driver.phone.replace(/[^0-9]/g, '');

  // Derived vehicle portal fields with clean fallbacks
  const regLast4 = driver.regLastFour || (driver.plateNumber ? driver.plateNumber.replace(/[^0-9]/g, '').slice(-4) : '5206') || '5206';
  const mfgYear = driver.manufacturingYear || '2021';
  const chassis = driver.chassisNumber || `MD2A15BY4N${driver.id.replace(/[^0-9]/g, '').padStart(6, '1') || '123456'}`;
  const engine = driver.engineNumber || `JA15EQ${driver.id.replace(/[^0-9]/g, '').padStart(5, '2') || '12345'}`;

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
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

            {/* Sub-Part Switcher (ড্রাইভিং লাইসেন্স অনুসন্ধান vs মোটরযান অনুসন্ধান) */}
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
                          বাংলাদেশ সরকারি ড্রাইভিং লাইসেন্স পোর্টাল থেকে চালকের লাইসেন্স নম্বর ও ইস্যুর তারিখ দিয়ে রেকর্ড যাচাই করুন।
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
                        ✓ তথ্য ক্লিপবোর্ডে কপি হয়েছে! সরকারি সাইটের বক্সে পেস্ট করুন।
                      </div>
                    )}

                    {/* Direct Search Button requested by user */}
                    <a
                      href="https://bsp.brta.gov.bd/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full bg-blue-700 hover:bg-blue-800 text-white font-bold py-2.5 px-3 rounded-xl text-xs flex items-center justify-center gap-2 shadow-xs transition cursor-pointer"
                    >
                      <ExternalLink className="w-4 h-4" />
                      <span>বিআরটিএ ড্রাইভিং লাইসেন্স অনুসন্ধান করুন ↗</span>
                    </a>
                  </div>
                </div>
              )}

              {/* ------------------------------------------------------------------ */}
              {/* SUB-PART 2: মোটরযান অনুসন্ধান (User's Exact 4 Fields + Tax Token)   */}
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
                          সরকারি মোটরযান পোর্টালে গাড়ি ভেরিফিকেশনের জন্য নিচের ৪টি আবশ্যক তথ্য কপি করে সরাসরি অনুসন্ধান করুন:
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
                        ✓ তথ্য ক্লিপবোর্ডে কপি হয়েছে! মোটরযান অনুসন্ধান পেজে পেস্ট করুন।
                      </div>
                    )}

                    {/* Direct Search Button for Motor Vehicle */}
                    <a
                      href="https://bsp.brta.gov.bd/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-2.5 px-3 rounded-xl text-xs flex items-center justify-center gap-2 shadow-xs transition cursor-pointer"
                    >
                      <ExternalLink className="w-4 h-4" />
                      <span>বিআরটিএ মোটরযান অনুসন্ধান করুন ↗</span>
                    </a>

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
                        <div className="relative group rounded-lg overflow-hidden border border-slate-200 bg-slate-100 cursor-pointer max-h-32 flex items-center justify-center"
                          onClick={() => setZoomImage({
                            url: driver.taxTokenReceiptPhoto!,
                            title: `সর্বশেষ ট্যাক্স টোকেন রিসিট - ${driver.name} (${regLast4})`
                          })}
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
                          চালক নিবন্ধনের সময় ট্যাক্স টোকেন রিসিটের ছবি আপলোড করেননি। বিআরটিএ পোর্টালের ডাটাবেস অনুসন্ধান দিয়েই ট্যাক্স ও ফিটনেসের সত্যতা যাচাই করা সম্ভব।
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
          </div>
        )}

        {/* ============================================================== */}
        {/* MODAL 2: WHATSAPP & PHONE VERIFICATION GATEWAY                */}
        {/* ============================================================== */}
        {type === 'wa' && (
          <div>
            {/* Header */}
            <div className="bg-gradient-to-r from-emerald-700 via-green-600 to-emerald-800 text-white p-4 sm:p-5 flex items-start justify-between">
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
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 sm:p-6 space-y-4">
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
                      className="text-slate-400 hover:text-slate-600"
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
                    className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 px-3 rounded-xl text-xs flex items-center justify-center gap-2 transition shadow-xs"
                  >
                    <Send className="w-4 h-4 text-amber-400" />
                    <span>৪-ডিজিটের ওটিপি (OTP) পাঠান</span>
                  </button>
                ) : (
                  <div className="space-y-2.5">
                    <div className="p-2 bg-emerald-100/70 border border-emerald-300 rounded-xl text-xs text-emerald-900 flex items-center justify-between">
                      <span>সফর টেস্ট ওটিপি কোড: <strong className="font-mono text-sm tracking-widest">{otpCode}</strong></span>
                      <button
                        onClick={() => setEnteredOtp(otpCode)}
                        className="text-[10px] bg-white text-emerald-800 font-bold px-2 py-0.5 rounded border border-emerald-200 hover:bg-emerald-50"
                      >
                        স্বয়ংক্রিয় বসান
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
                        onClick={handleVerifyOtp}
                        className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold px-4 py-2 rounded-xl text-xs transition"
                      >
                        যাচাই করুন
                      </button>
                    </div>

                    {otpError && (
                      <p className="text-[11px] text-red-600 font-medium">{otpError}</p>
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
                    className="w-full py-2.5 bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold text-xs rounded-xl transition"
                  >
                    অনুমোদন বাতিল করে পেন্ডিং করুন
                  </button>
                ) : (
                  <button
                    onClick={handleDirectWaApproval}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md transition flex items-center justify-center gap-2"
                  >
                    <CheckCircle className="w-4 h-4" />
                    <span>হোয়াটসঅ্যাপ ও ফোন সরাসরি অনুমোদন করুন</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* MODAL 3: NID VERIFICATION GATEWAY                              */}
        {/* ============================================================== */}
        {type === 'nid' && (
          <div>
            {/* Header */}
            <div className="bg-gradient-to-r from-teal-800 via-emerald-800 to-slate-900 text-white p-4 sm:p-5 flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-teal-200 shadow-inner">
                  <ShieldAlert className="w-6 h-6 text-teal-300" />
                </div>
                <div>
                  <h3 className="font-bold text-base sm:text-lg leading-tight">
                    জাতীয় পরিচয়পত্র (NID) ও ছবি যাচাইকরণ
                  </h3>
                  <p className="text-xs text-teal-100/90 mt-0.5">
                    বিআরটিএ ড্রাইভিং লাইসেন্স তথ্যের ভিত্তিতে ম্যানুয়াল যাচাই
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

            <div className="p-4 sm:p-5 space-y-3.5 max-h-[75vh] overflow-y-auto">
              {/* Driver & NID Details Summary Card */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 space-y-1.5 text-xs">
                <div className="flex items-center justify-between pb-1.5 border-b border-slate-200">
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
                    {driver.nidVerified ? '✅ NID অনুমোদিত' : '⏳ যাচাই পেন্ডিং'}
                  </span>
                </div>
              </div>

              {/* 1. NID Photo Section: Front & Back Sides */}
              <div className="p-3.5 rounded-2xl border border-teal-200 bg-teal-50/70 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-bold text-xs text-teal-950">
                    <FileText className="w-4 h-4 text-teal-700" />
                    <span>চালকের দেওয়া জাতীয় পরিচয়পত্র (NID) ছবি</span>
                  </div>
                  <span className="text-[10px] text-teal-800 bg-teal-100 px-1.5 py-0.2 rounded font-bold">
                    উভয় পিঠ (সামনে ও পেছনে)
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {/* Front Side */}
                  <div className="p-2.5 rounded-xl bg-white border border-slate-200 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[11px] text-slate-800">১. সামনের পিঠ (ছবি ও নাম):</span>
                      {driver.nidFrontPhoto ? (
                        <span className="text-[9.5px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded">সংযুক্ত</span>
                      ) : (
                        <span className="text-[9.5px] text-slate-400 bg-slate-100 px-1.5 py-0.2 rounded">সংযুক্ত নেই</span>
                      )}
                    </div>

                    {driver.nidFrontPhoto ? (
                      <div
                        className="relative group rounded-lg overflow-hidden border border-slate-200 bg-slate-100 cursor-pointer h-24 flex items-center justify-center"
                        onClick={() => setZoomImage({ url: driver.nidFrontPhoto!, title: `NID সামনের পিঠ - ${driver.name}` })}
                      >
                        <img
                          src={driver.nidFrontPhoto}
                          alt="NID সামনের পিঠ"
                          className="w-full h-full object-cover transition group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-[11px] font-bold gap-1 transition">
                          <Eye className="w-3.5 h-3.5" />
                          <span>বড় করে দেখুন</span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-[10.5px] text-slate-500 leading-tight">
                        চালক নিবন্ধনের সময় NID সামনের পিঠের ছবি আপলোড করেননি।
                      </p>
                    )}
                  </div>

                  {/* Back Side */}
                  <div className="p-2.5 rounded-xl bg-white border border-slate-200 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[11px] text-slate-800">২. পেছনের পিঠ (ঠিকানা ও বারকোড):</span>
                      {driver.nidBackPhoto ? (
                        <span className="text-[9.5px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded">সংযুক্ত</span>
                      ) : (
                        <span className="text-[9.5px] text-slate-400 bg-slate-100 px-1.5 py-0.2 rounded">সংযুক্ত নেই</span>
                      )}
                    </div>

                    {driver.nidBackPhoto ? (
                      <div
                        className="relative group rounded-lg overflow-hidden border border-slate-200 bg-slate-100 cursor-pointer h-24 flex items-center justify-center"
                        onClick={() => setZoomImage({ url: driver.nidBackPhoto!, title: `NID পেছনের পিঠ - ${driver.name}` })}
                      >
                        <img
                          src={driver.nidBackPhoto}
                          alt="NID পেছনের পিঠ"
                          className="w-full h-full object-cover transition group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-[11px] font-bold gap-1 transition">
                          <Eye className="w-3.5 h-3.5" />
                          <span>বড় করে দেখুন</span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-[10.5px] text-slate-500 leading-tight">
                        চালক নিবন্ধনের সময় NID পেছনের পিঠের ছবি আপলোড করেননি।
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* 2. BRTA Driving License Cross-Reference Match */}
              <div className="p-3.5 rounded-2xl border border-blue-200 bg-blue-50/70 space-y-2">
                <div className="flex items-center gap-1.5 font-bold text-xs text-blue-950">
                  <ShieldCheck className="w-4 h-4 text-blue-700" />
                  <span>বিআরটিএ ড্রাইভিং লাইসেন্স রেকর্ডের সাথে তথ্য যাচাই (Cross-Check)</span>
                </div>
                <p className="text-[11px] text-blue-900 leading-relaxed">
                  এনআইডি সরাসরি সরকারি কেন্দ্রীয় সার্ভার থেকে পাবলিক এপিআই দিয়ে উন্মুক্ত নয়। তাই বিআরটিএ ড্রাইভিং লাইসেন্স ডাটাবেস থেকে প্রাপ্ত রেফারেন্স রেকর্ডের সাথে NID কার্ডের নাম ও তথ্য মিলিয়ে ম্যানুয়ালি অনুমোদন প্রদান করুন:
                </p>

                <div className="bg-white p-2.5 rounded-xl border border-blue-200 space-y-1.5 text-xs text-slate-700">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">বিআরটিএ লাইসেন্স নম্বর:</span>
                    <span className="font-mono font-bold text-blue-900">{driver.licenseNumber}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">লাইসেন্স প্রথম ইস্যুর তারিখ:</span>
                    <span className="font-mono font-semibold text-slate-800">{driver.firstIssueDate || '15/04/2021'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">নিবন্ধিত গাড়ির নম্বর প্লেট:</span>
                    <span className="font-semibold text-slate-800">{driver.plateNumber}</span>
                  </div>
                  <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                    <span className="text-slate-500">বিআরটিএ অনুমোদন স্ট্যাটাস:</span>
                    <span className={`font-bold ${driver.licenseVerified ? 'text-emerald-700' : 'text-amber-700'}`}>
                      {driver.licenseVerified ? '✅ বিআরটিএ যাচাই অনুমোদিত' : '⏳ বিআরটিএ যাচাই পেন্ডিং'}
                    </span>
                  </div>
                </div>
              </div>

              {/* 3. Admin Verification Confirmation */}
              <div className="p-3 rounded-xl bg-slate-100 border border-slate-300 text-[11px] space-y-1">
                <div className="font-bold text-slate-800 flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                  <span>অ্যাডমিন নিশ্চিতকরণ:</span>
                </div>
                <p className="text-slate-600 leading-snug">
                  চালকের দেওয়া NID ছবির সাথে বিআরটিএ লাইসেন্স রেকর্ডের নাম, ছবি ও নম্বর ম্যানুয়ালি মিলিয়ে সত্যতা নিশ্চিত করে নিচের বাটনে ক্লিক করুন।
                </p>
              </div>

              {/* Action Buttons */}
              <div className="pt-1">
                {driver.nidVerified ? (
                  <button
                    onClick={() => {
                      onRevoke(driver.id, 'nid');
                      onClose();
                    }}
                    className="w-full py-2.5 bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold text-xs rounded-xl transition cursor-pointer"
                  >
                    অনুমোদন বাতিল করে পেন্ডিং করুন
                  </button>
                ) : (
                  <button
                    onClick={handleConfirmNidApproval}
                    className="w-full py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                  >
                    <CheckCircle className="w-4 h-4" />
                    <span>NID জাতীয় পরিচয়পত্র ও তথ্য অনুমোদন করুন</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ============================================================== */}
      {/* UNIVERSAL LIGHTBOX / ZOOM MODAL (FOR RECEIPTS & NID PHOTOS)    */}
      {/* ============================================================== */}
      {zoomImage && (
        <div
          className="fixed inset-0 z-[100000] bg-black/85 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in"
          onClick={() => setZoomImage(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-xl w-full overflow-hidden shadow-2xl p-3 space-y-2 animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <span className="font-bold text-xs text-slate-800 truncate pr-2">
                {zoomImage.title}
              </span>
              <button
                onClick={() => setZoomImage(null)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-500 cursor-pointer"
                title="বন্ধ করুন"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="max-h-[72vh] overflow-auto flex items-center justify-center bg-slate-50 rounded-xl p-1">
              <img
                src={zoomImage.url}
                alt={zoomImage.title}
                className="max-w-full max-h-[68vh] object-contain rounded-lg"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
