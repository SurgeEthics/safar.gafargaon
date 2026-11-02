import React, { useState } from 'react';
import { 
  X, 
  Download, 
  CheckCircle, 
  Github, 
  Cloud, 
  FileCode, 
  FolderArchive, 
  Sparkles, 
  AlertCircle,
  Copy,
  Check,
  HardDrive
} from 'lucide-react';

interface SourceCodeDownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SourceCodeDownloadModal: React.FC<SourceCodeDownloadModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [downloading, setDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedCmd, setCopiedCmd] = useState(false);

  if (!isOpen) return null;

  const triggerBlobDownload = async () => {
    setDownloading(true);
    setErrorMessage(null);
    setDownloadSuccess(false);

    try {
      // 1. Fetch the zip directly from same-origin with cache busting
      const response = await fetch(`/safar-gafargaon-clean-source.zip?t=${Date.now()}`, {
        cache: 'no-store',
      });

      if (!response.ok) {
        throw new Error(`সার্ভার এরর: HTTP ${response.status}`);
      }

      const blob = await response.blob();
      if (!blob || blob.size < 1000) {
        throw new Error('জিপ ফাইল লোড হতে সমস্যা হয়েছে');
      }

      // 2. Create in-memory object URL
      const objectUrl = window.URL.createObjectURL(blob);
      const tempLink = document.createElement('a');
      tempLink.href = objectUrl;
      tempLink.download = 'safar-gafargaon-clean-source.zip';
      tempLink.style.display = 'none';
      document.body.appendChild(tempLink);
      
      // 3. Trigger native download dialog
      tempLink.click();

      // Clean up after small delay
      setTimeout(() => {
        window.URL.revokeObjectURL(objectUrl);
        document.body.removeChild(tempLink);
      }, 2000);

      setDownloadSuccess(true);
    } catch (err: any) {
      console.error('Download error:', err);
      // Fallback: try navigating window location to zip
      setErrorMessage(err?.message || 'ডাউনলোড শুরু করা যায়নি');
      const fallbackLink = document.createElement('a');
      fallbackLink.href = '/safar-gafargaon-clean-source.zip';
      fallbackLink.setAttribute('download', 'safar-gafargaon-clean-source.zip');
      fallbackLink.target = '_blank';
      fallbackLink.click();
    } finally {
      setDownloading(false);
    }
  };

  const copyDeployCommand = () => {
    navigator.clipboard.writeText('npm install && npm run build');
    setCopiedCmd(true);
    setTimeout(() => setCopiedCmd(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-lg w-full p-5 sm:p-7 shadow-2xl border border-slate-100 my-6 animate-in fade-in zoom-in-95">
        
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-md">
              <FolderArchive className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-lg">
                সম্পূর্ণ সোর্স কোড ডাউনলোড
              </h3>
              <p className="text-xs text-slate-500">
                গিটহাব ও ক্লাউডফ্লেয়ারের জন্য প্রস্তুত (২.৪ মেগাবাইট • dist সহ)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="py-4 space-y-4">
          
          {/* Main Download Action Banner */}
          <div className="bg-gradient-to-br from-emerald-50 via-teal-50 to-amber-50/50 p-4 rounded-2xl border border-emerald-200 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                <span className="text-xs font-bold text-emerald-950">
                  সর্বশেষ আপডেটকৃত সম্পূর্ণ প্যাকেজ (১০০% এররমুক্ত)
                </span>
              </div>
              <span className="text-[11px] font-semibold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                ২.৫৪ MB জিপ (dist সহ)
              </span>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              এই জিপ ফাইলে রয়েছে আপনার অ্যাপের সমস্ত সোর্স কোড, চালক ভেরিফিকেশন পপআপের নিখুঁত কোড, লাইভ ম্যাপ, আইকন, এবং প্রস্তুতকৃত <strong>dist/</strong> বিল্ড ফাইল।
            </p>

            {/* Main Action Button */}
            <button
              type="button"
              onClick={triggerBlobDownload}
              disabled={downloading}
              className={`w-full py-3 px-4 rounded-xl font-bold text-sm shadow-md transition flex items-center justify-center gap-2 ${
                downloading
                  ? 'bg-amber-300 text-slate-700 cursor-wait'
                  : 'bg-amber-400 hover:bg-amber-300 text-slate-950 active:scale-[0.99]'
              }`}
            >
              {downloading ? (
                <>
                  <div className="w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
                  <span>জিপ ফাইল তৈরি ও ডাউনলোড হচ্ছে...</span>
                </>
              ) : (
                <>
                  <Download className="w-5 h-5 text-slate-950" />
                  <span>📥 এখনই জিপ ডাউনলোড করুন (১-ক্লিক)</span>
                </>
              )}
            </button>

            {downloadSuccess && (
              <div className="p-3 bg-emerald-100/90 text-emerald-900 rounded-xl text-xs font-semibold flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-700 flex-shrink-0" />
                <span>সফলভাবে ডাউনলোড শুরু হয়েছে! আপনার ফোনের বা পিসির Downloads ফোল্ডার চেক করুন।</span>
              </div>
            )}

            {errorMessage && (
              <div className="p-3 bg-red-50 text-red-700 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                <span>{errorMessage} (সরাসরি ডাউনলোড উইন্ডো চেষ্টা করা হচ্ছে)</span>
              </div>
            )}
          </div>

          {/* Package Checklist */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              জিপ ফাইলে যা যা অন্তর্ভুক্ত আছে:
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 border border-slate-100 text-slate-700">
                <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>সব রিঅ্যাক্ট ও টাইপস্ক্রিপ্ট কোড</span>
              </div>
              <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 border border-slate-100 text-slate-700">
                <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>চালক ভেরিফিকেশন ফিক্সড কোড</span>
              </div>
              <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 border border-slate-100 text-slate-700">
                <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>গফরগাঁওয়ের সব স্ট্যান্ড ও রুট</span>
              </div>
              <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 border border-slate-100 text-slate-700">
                <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>রেডি <strong>dist/</strong> প্রোডাকশন বিল্ড</span>
              </div>
            </div>
          </div>

          {/* Quick Deploy Instructions */}
          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-600 space-y-2">
            <div className="flex items-center gap-2 font-bold text-slate-900">
              <Github className="w-4 h-4 text-slate-900" />
              <span>GitHub ও Cloudflare-এ ডিপ্লয় করার নিয়ম:</span>
            </div>
            <ol className="list-decimal pl-4 space-y-1 text-slate-600">
              <li>ডাউনলোড করা জিপটি আপনার কম্পিউটারে আনজিপ (Extract) করুন।</li>
              <li>GitHub-এ একটি নতুন রিপোজিটরি তৈরি করে ফাইলগুলো আপলোড করুন।</li>
              <li>Cloudflare Pages বা Vercel-এ গিটহাব কানেক্ট করে <code>npm run build</code> দিয়ে বিনামূল্যে লাইভ করুন।</li>
            </ol>
            <div className="flex items-center justify-between bg-white p-2 rounded-lg border border-slate-200 mt-2 font-mono text-[11px]">
              <span className="text-slate-700">npm install && npm run build</span>
              <button
                type="button"
                onClick={copyDeployCommand}
                className="flex items-center gap-1 text-emerald-700 hover:text-emerald-800 font-sans font-bold"
              >
                {copiedCmd ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedCmd ? 'কপি হয়েছে' : 'কপি'}</span>
              </button>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="pt-2 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="w-full bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold py-2.5 px-4 rounded-xl text-xs sm:text-sm transition"
          >
            বন্ধ করুন
          </button>
        </div>

      </div>
    </div>
  );
};
