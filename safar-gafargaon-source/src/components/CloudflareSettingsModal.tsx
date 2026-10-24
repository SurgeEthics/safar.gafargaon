import React, { useState } from 'react';
import { X, Cloud, Check, Wifi, Globe, Server, RefreshCw, Copy, CheckCircle2, Terminal, Info, ExternalLink } from 'lucide-react';
import { liveLocationService } from '../services/liveLocationService';

interface CloudflareSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  status: 'connected' | 'connecting' | 'disconnected';
  latencyMs: number;
  serverType: 'cloudflare' | 'local';
  activeDriversCount: number;
  activePassengersCount: number;
}

export const CloudflareSettingsModal: React.FC<CloudflareSettingsModalProps> = ({
  isOpen,
  onClose,
  status,
  latencyMs,
  serverType,
  activeDriversCount,
  activePassengersCount
}) => {
  const [workerUrl, setWorkerUrl] = useState(liveLocationService.getCustomServerUrl());
  const [testStatus, setTestStatus] = useState<string | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleSave = () => {
    liveLocationService.setCustomServerUrl(workerUrl);
    setTestStatus('সার্ভার সফলভাবে কনফিগার করা হয়েছে!');
    setTimeout(() => {
      setTestStatus(null);
      onClose();
    }, 900);
  };

  const handleResetDefault = () => {
    setWorkerUrl('');
    liveLocationService.setCustomServerUrl('');
    setTestStatus('ডিফল্ট বিল্ট-ইন সার্ভারে রিসেট করা হয়েছে');
    setTimeout(() => {
      setTestStatus(null);
    }, 1500);
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestStatus(null);

    const targetUrl = workerUrl.trim() || `${window.location.origin}`;
    const cleanUrl = targetUrl.replace(/\/+$/, '');
    const endpoint = `${cleanUrl}/api/live/health`;

    try {
      const start = Date.now();
      const res = await fetch(endpoint, { cache: 'no-store' });
      const elapsed = Date.now() - start;

      if (res.ok) {
        const data = await res.json();
        setTestStatus(`✅ সফল! সার্ভার রেসপন্স টাইম: ${elapsed}ms (${data.server || data.edgeServer || 'Active'})`);
      } else {
        setTestStatus(`⚠️ সার্ভার রেসপন্স কোড: ${res.status}`);
      }
    } catch (e: any) {
      setTestStatus(`❌ সংযোগ ব্যর্থ: ${e.message || 'সার্ভার পাওয়া যায়নি'}`);
    } finally {
      setIsTesting(false);
    }
  };

  const sampleWorkerCode = `// deploy with: npx wrangler deploy
// or paste into Cloudflare Dashboard > Workers`;

  const copyWorkerCode = () => {
    navigator.clipboard.writeText(sampleWorkerCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-600 via-amber-600 to-emerald-700 px-5 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center">
              <Cloud className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-base">ক্লাউডফ্লেয়ার লাইভ সার্ভার সেটিংস</h3>
              <p className="text-xs text-orange-100">রিয়েল-টাইম লাইভ লোকেশন (যাত্রী ও চালক)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-slate-800 text-xs">
          {/* Connection Status Card */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-600 flex items-center gap-1.5">
                <Server className="w-4 h-4 text-slate-500" />
                বর্তমান কানেকশন অবস্থা
              </span>
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                status === 'connected' 
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' 
                  : status === 'connecting'
                  ? 'bg-amber-100 text-amber-800 border border-amber-300'
                  : 'bg-red-100 text-red-800 border border-red-300'
              }`}>
                <span className={`w-2 h-2 rounded-full ${
                  status === 'connected' ? 'bg-emerald-600 animate-pulse' : status === 'connecting' ? 'bg-amber-500 animate-ping' : 'bg-red-500'
                }`} />
                {status === 'connected' ? 'সংযুক্ত (Online)' : status === 'connecting' ? 'কানেক্ট হচ্ছে...' : 'বিচ্ছিন্ন (Offline)'}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-200/80 text-center">
              <div className="bg-white p-2 rounded-lg border border-slate-200">
                <div className="text-[10px] text-slate-500">লেটেন্সি (Ping)</div>
                <div className="font-extrabold text-emerald-700 text-xs sm:text-sm mt-0.5">{latencyMs} ms</div>
              </div>
              <div className="bg-white p-2 rounded-lg border border-slate-200">
                <div className="text-[10px] text-slate-500">অনলাইন চালক</div>
                <div className="font-extrabold text-blue-700 text-xs sm:text-sm mt-0.5">{activeDriversCount} জন</div>
              </div>
              <div className="bg-white p-2 rounded-lg border border-slate-200">
                <div className="text-[10px] text-slate-500">অনলাইন যাত্রী</div>
                <div className="font-extrabold text-indigo-700 text-xs sm:text-sm mt-0.5">{activePassengersCount} জন</div>
              </div>
            </div>
          </div>

          {/* Cloudflare Worker URL Config */}
          <div className="space-y-1.5">
            <label className="font-bold text-slate-700 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-orange-600" />
                ক্লাউডফ্লেয়ার ওয়ার্কার URL (Cloudflare Worker Endpoint)
              </span>
              <span className="text-[10px] text-slate-400 font-normal">ঐচ্ছিক (ডিফল্ট প্রস্তুত আছে)</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={workerUrl}
                onChange={(e) => setWorkerUrl(e.target.value)}
                placeholder="https://safar-gafargaon-live.your-name.workers.dev"
                className="w-full px-3 py-2 bg-white border border-slate-300 focus:border-orange-500 rounded-lg text-xs font-mono text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
              />
            </div>
            <p className="text-[10px] text-slate-500">
              ফাঁকা রাখলে অ্যাপটির নিজস্ব ফুল-স্ট্যাক রিয়েলটাইম ইঞ্জিন ব্যবহৃত হবে। নিজস্ব ক্লাউডফ্লেয়ার থাকলে এখানে পেস্ট করুন।
            </p>
          </div>

          {/* Test Status feedback */}
          {testStatus && (
            <div className={`p-2.5 rounded-lg text-[11px] font-medium border ${
              testStatus.includes('✅') 
                ? 'bg-emerald-50 text-emerald-900 border-emerald-200' 
                : testStatus.includes('❌') 
                ? 'bg-red-50 text-red-900 border-red-200' 
                : 'bg-amber-50 text-amber-900 border-amber-200'
            }`}>
              {testStatus}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={isTesting}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
              <span>{isTesting ? 'টেস্ট হচ্ছে...' : 'কানেকশন টেস্ট'}</span>
            </button>
            <button
              type="button"
              onClick={handleResetDefault}
              className="px-3 py-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 font-medium rounded-lg transition-colors cursor-pointer"
            >
              ডিফল্ট সার্ভার
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="ml-auto px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-sm flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>সংরক্ষণ করুন</span>
            </button>
          </div>

          {/* Quick Info / Guide */}
          <div className="border-t border-slate-100 pt-3 space-y-2">
            <div className="flex items-center justify-between text-slate-700 font-bold text-[11px]">
              <span className="flex items-center gap-1">
                <Terminal className="w-3.5 h-3.5 text-slate-500" />
                ক্লাউডফ্লেয়ার কোড প্রস্তুত আছে:
              </span>
              <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-mono">
                cloudflare-worker/worker.js
              </span>
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              প্রজেক্টের <code>cloudflare-worker/</code> ফোল্ডারে সম্পূর্ণ ক্লাউডফ্লেয়ার স্ক্রিপ্ট ও রেডিমেড কনফিগ রয়েছে। আপনি চাইলে যেকোনো সময় ক্লাউডফ্লেয়ারে এক ক্লিকেই ফ্রি হোস্টিং করতে পারবেন।
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
