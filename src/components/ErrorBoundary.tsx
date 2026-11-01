import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Trash2 } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('App Uncaught Error Boundary:', error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleResetCache = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {}
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-4 font-['Hind_Siliguri',sans-serif]">
          <div className="bg-slate-800 border border-slate-700 rounded-3xl max-w-md w-full p-6 sm:p-8 text-center shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
            <div className="w-16 h-16 bg-amber-500/20 text-amber-400 rounded-2xl flex items-center justify-center mx-auto border border-amber-500/30">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h1 className="text-xl font-black text-white">
                সফর অ্যাপ সাময়িক লোড হতে পারেনি
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                ব্রাউজারের ক্যাশ বা সংযোগজনিত কারণে অ্যাপটিতে বিঘ্ন ঘটেছে। নিচের বাটনে ক্লিক করে অ্যাপটি এখনই স্বাভাবিক অবস্থায় রিলোড করুন।
              </p>
            </div>

            <div className="flex flex-col gap-2.5 pt-2">
              <button
                type="button"
                onClick={this.handleReload}
                className="w-full py-3 px-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl text-sm shadow-md transition flex items-center justify-center gap-2 cursor-pointer active:scale-98"
              >
                <RefreshCw className="w-4 h-4" />
                <span>সফর অ্যাপ রিলোড করুন</span>
              </button>

              <button
                type="button"
                onClick={this.handleResetCache}
                className="w-full py-2.5 px-4 bg-slate-700 hover:bg-slate-600 text-slate-200 font-bold rounded-xl text-xs transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5 text-amber-400" />
                <span>ক্যাশ ক্লিয়ার করে ফ্রেশ স্টার্ট করুন</span>
              </button>
            </div>

            <div className="pt-2 border-t border-slate-700/60 text-[11px] text-slate-500">
              সফর — স্মার্ট ডিজিটাল ট্রান্সপোর্ট প্লাটফর্ম (গফরগাঁও)
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
