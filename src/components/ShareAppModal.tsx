import {
  AlertCircle,
  Check,
  CheckCircle2,
  Copy,
  ExternalLink,
  FileDown,
  Globe,
  Link2,
  MessageCircle,
  Send,
  Settings2,
  Share2,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { getGlobalStats, toBn } from '../data/defaultData';
import type { UnityDatabase } from '../types/unity';
import { isValidPublicHttpUrl, resolvePublicAppUrl } from '../utils/appUrl';

interface ShareAppModalProps {
  open: boolean;
  db: UnityDatabase;
  isSuperAdmin?: boolean;
  serverSharedUrl?: string;
  onClose: () => void;
  onCopyText: (text: string, msg: string) => void;
  onDownloadOfflineApp?: () => void;
  onSavePublicAppUrl?: (url: string) => void;
}

export function ShareAppModal({
  open,
  db,
  isSuperAdmin = false,
  serverSharedUrl,
  onClose,
  onCopyText,
  onDownloadOfflineApp,
  onSavePublicAppUrl,
}: ShareAppModalProps) {
  const [copiedKey, setCopiedKey] = useState<'link' | 'summary' | 'messenger' | null>(null);
  const [shareMode, setShareMode] = useState<'install' | 'app'>('install');
  const [editingCustomUrl, setEditingCustomUrl] = useState(false);
  const [customUrlInput, setCustomUrlInput] = useState(db.appConfig.publicAppUrl || '');

  if (!open) return null;

  const resolved = resolvePublicAppUrl({
    customPublicUrl: db.appConfig.publicAppUrl,
    serverSharedUrl,
  });
  const activeShareUrl = shareMode === 'install' ? resolved.installUrl : resolved.url;
  const stats = getGlobalStats(db);

  const shareMessage = [
    `BARAKAH MULTICARE HOSPITAL UNITY`,
    `${db.adminName} (Admin)`,
    `────────────────────`,
    `মোট সদস্য: ${toBn(db.members.length)} জন`,
    `মোট কিস্তি: ${toBn(stats.totalKisti)} টি`,
    `টোটাল ফান্ড: ৳ ${toBn(stats.totalFund)}`,
    `নিট ব্যালেন্স: ৳ ${toBn(stats.netBalance)}`,
    `────────────────────`,
    shareMode === 'install'
      ? `অ্যাপ ওপেন ও ইনস্টল লিংক: ${activeShareUrl}`
      : `অ্যাপ লিংক: ${activeShareUrl}`,
  ].join('\n');

  const whatsappHref = `https://wa.me/?text=${encodeURIComponent(shareMessage)}`;
  const messengerWebHref = `https://www.messenger.com/t/`;
  const hasNativeShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  const markCopied = (key: 'link' | 'summary' | 'messenger') => {
    setCopiedKey(key);
    window.setTimeout(() => setCopiedKey(null), 2200);
  };

  const handleNativeShare = async () => {
    if (!hasNativeShare) {
      onCopyText(shareMessage, 'শেয়ার করার জন্য পাবলিক লিংক ও সামারি কপি হয়েছে!');
      markCopied('summary');
      return;
    }
    try {
      await navigator.share({
        title: 'BARAKAH MULTICARE HOSPITAL UNITY',
        text: shareMessage,
        url: activeShareUrl,
      });
    } catch {
      // User dismissed native share sheet
    }
  };

  const handleSaveCustomDomain = () => {
    if (!onSavePublicAppUrl) return;
    const trimmed = customUrlInput.trim();
    if (!trimmed) {
      onSavePublicAppUrl('');
      setEditingCustomUrl(false);
      return;
    }
    if (!isValidPublicHttpUrl(trimmed)) return;
    onSavePublicAppUrl(trimmed);
    setEditingCustomUrl(false);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="অ্যাপ শেয়ার করুন"
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/65 p-0 backdrop-blur-xs sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[92vh] w-full overflow-y-auto rounded-t-3xl border border-slate-200 bg-white p-5 shadow-2xl sm:max-w-md sm:rounded-2xl dark:border-slate-800 dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-2 sm:hidden">
          <div className="mx-auto h-1.5 w-10 rounded-full bg-slate-300 dark:bg-slate-700" />
        </div>

        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-bold text-slate-900 dark:text-slate-100">
              অ্যাপ শেয়ার ও ইনস্টল লিংক
            </h2>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              অন্য যেকোনো মোবাইল বা পিসিতে সহজেই ওপেন ও ইনস্টল করার পাবলিক লিংক
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="বন্ধ করুন"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Public Access Status Strip */}
        {resolved.wasAutoConverted ? (
          <div className="mt-3.5 rounded-xl border border-amber-200 bg-amber-50/90 px-3.5 py-3 text-xs text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200">
            <div className="flex items-start gap-2">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
              <div className="min-w-0 flex-1">
                <p className="font-bold">পাবলিক শেয়ার লিংক সক্রিয় করার ধাপ</p>
                <p className="mt-1 text-[11px] leading-relaxed text-amber-900/90 dark:text-amber-300/90">
                  এই লিংকটি অন্য ডিভাইসে <strong>Page not found</strong> দেখালে, আগে AI Studio-এর উপরের ডানকোণায়{' '}
                  <strong>Share app</strong> অথবা <strong>Deploy</strong> বাটনে ক্লিক করে অ্যাপটি পাবলিশ করুন।
                  পাবলিশ হয়ে গেলে এই লিংক (অথবা ডিপ্লয় লিংক) সব মোবাইলে সরাসরি কাজ করবে।
                </p>
                <a
                  href={activeShareUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-teal-800 underline hover:text-teal-950 dark:text-teal-300"
                >
                  <ExternalLink className="h-3 w-3" />
                  <span>লিংকটি এখন লাইভ আছে কিনা চেক করুন</span>
                </a>
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-3.5 flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50/85 px-3 py-2.5 text-xs text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <div className="min-w-0">
              <p className="font-semibold">
                {resolved.source === 'custom'
                  ? 'কাস্টম পাবলিক ডোমেইন লিংক সক্রিয়'
                  : 'পাবলিক শেয়ার লিংক প্রস্তুত'}
              </p>
              <p className="mt-0.5 text-[11px] text-emerald-800/90 dark:text-emerald-300/85">
                অন্য ডিভাইস থেকে সরাসরি অ্যাপ ওপেন ও ইনস্টল করা যাবে।
              </p>
            </div>
          </div>
        )}

        {/* Link Mode Switcher: 1-Click Install Link vs Direct App Link */}
        <div className="mt-3 grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
          <button
            type="button"
            onClick={() => setShareMode('install')}
            className={`min-h-[36px] rounded-lg text-xs font-semibold transition-colors ${
              shareMode === 'install'
                ? 'bg-white text-teal-700 shadow-xs dark:bg-slate-900 dark:text-teal-300'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            ইনস্টল লিংক (রেকমেন্ডেড)
          </button>
          <button
            type="button"
            onClick={() => setShareMode('app')}
            className={`min-h-[36px] rounded-lg text-xs font-semibold transition-colors ${
              shareMode === 'app'
                ? 'bg-white text-teal-700 shadow-xs dark:bg-slate-900 dark:text-teal-300'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            সাধারণ অ্যাপ লিংক
          </button>
        </div>

        {/* Shareable Public App URL Box */}
        <div className="mt-3 flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-2.5 dark:border-slate-700 dark:bg-slate-800/80">
          <Link2 className="h-4 w-4 shrink-0 text-teal-700 dark:text-teal-400" />
          <p className="font-mono-num min-w-0 flex-1 truncate text-xs text-slate-700 dark:text-slate-200">
            {activeShareUrl}
          </p>
          <button
            type="button"
            onClick={() => {
              onCopyText(activeShareUrl, 'পাবলিক শেয়ার লিংক কপি হয়েছে!');
              markCopied('link');
            }}
            className="inline-flex min-h-[36px] shrink-0 items-center gap-1 rounded-lg bg-teal-700 px-3 text-xs font-semibold text-white hover:bg-teal-800"
          >
            {copiedKey === 'link' ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            <span>{copiedKey === 'link' ? 'কপিড' : 'কপি'}</span>
          </button>
        </div>

        {/* Primary Share Channels */}
        <div className="mt-3.5 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {hasNativeShare && (
            <button
              type="button"
              onClick={() => void handleNativeShare()}
              className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-teal-700 px-4 text-xs font-semibold text-white transition-colors hover:bg-teal-800 sm:col-span-2"
            >
              <Share2 className="h-4 w-4" />
              <span>ডিভাইস শেয়ার মেনু (WhatsApp / Messenger / অন্যান্য)</span>
            </button>
          )}

          <a
            href={whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 text-xs font-semibold text-white transition-colors hover:bg-emerald-700"
          >
            <MessageCircle className="h-4 w-4" />
            <span>WhatsApp-এ শেয়ার</span>
          </a>

          <a
            href={messengerWebHref}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => {
              onCopyText(shareMessage, 'মেসেঞ্জারে পাঠানোর জন্য পাবলিক লিংক ও সামারি কপি হয়েছে!');
              markCopied('messenger');
            }}
            className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-sky-600 px-4 text-xs font-semibold text-white transition-colors hover:bg-sky-700"
          >
            <Send className="h-4 w-4" />
            <span>{copiedKey === 'messenger' ? 'কপিড · Messenger খুলছে' : 'Messenger-এ শেয়ার'}</span>
          </a>
        </div>

        {/* Copy Full Summary + Offline Standalone File Option */}
        <div className="mt-2.5 grid grid-cols-1 gap-2">
          <button
            type="button"
            onClick={() => {
              onCopyText(shareMessage, 'সম্পূর্ণ হিসাবের সামারি ও পাবলিক লিংক কপি হয়েছে!');
              markCopied('summary');
            }}
            className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 text-xs font-semibold text-slate-800 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
          >
            {copiedKey === 'summary' ? <Check className="h-4 w-4 text-teal-600" /> : <Copy className="h-4 w-4" />}
            <span>{copiedKey === 'summary' ? 'সামারি ও লিংক কপি হয়েছে!' : 'হিসাবের সামারি ও পাবলিক লিংক কপি করুন'}</span>
          </button>

          {onDownloadOfflineApp && (
            <button
              type="button"
              onClick={onDownloadOfflineApp}
              className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-teal-200 bg-teal-50/70 px-4 text-xs font-semibold text-teal-900 transition-colors hover:bg-teal-100 dark:border-teal-900/60 dark:bg-teal-950/40 dark:text-teal-200"
            >
              <FileDown className="h-4 w-4" />
              <span>অফলাইন অ্যাপ ফাইল (.html) ডাউনলোড করে পাঠান</span>
            </button>
          )}
        </div>

        {/* Optional Super Admin Custom Public Domain Override */}
        {isSuperAdmin && onSavePublicAppUrl && (
          <div className="mt-3.5 border-t border-slate-100 pt-3 dark:border-slate-800">
            {!editingCustomUrl ? (
              <button
                type="button"
                onClick={() => {
                  setCustomUrlInput(db.appConfig.publicAppUrl || '');
                  setEditingCustomUrl(true);
                }}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-teal-700 dark:text-slate-400 dark:hover:text-teal-300"
              >
                <Settings2 className="h-3.5 w-3.5" />
                <span>কাস্টম পাবলিক ডোমেইন / ডিপ্লয় লিংক সেট করুন (এডমিন)</span>
              </button>
            ) : (
              <div className="space-y-2">
                <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
                  <Globe className="h-3.5 w-3.5 text-teal-700" />
                  <span>কাস্টম পাবলিক অ্যাপ URL (https://...)</span>
                </label>
                <input
                  type="url"
                  value={customUrlInput}
                  onChange={(e) => setCustomUrlInput(e.target.value)}
                  placeholder="https://your-deployed-app.run.app"
                  className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs dark:border-slate-700 dark:bg-slate-800"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleSaveCustomDomain}
                    className="min-h-[38px] flex-1 rounded-xl bg-teal-700 text-xs font-semibold text-white hover:bg-teal-800"
                  >
                    সেভ করুন
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingCustomUrl(false)}
                    className="min-h-[38px] rounded-xl border border-slate-200 px-3 text-xs font-semibold text-slate-600 dark:border-slate-700 dark:text-slate-300"
                  >
                    বাতিল
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        <p className="mt-3 text-center text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
          সদস্যরা এই লিংক Chrome বা Safari-তে খুললেই সরাসরি ইনস্টল বাটন দেখতে পাবেন।
        </p>
      </div>
    </div>
  );
}
