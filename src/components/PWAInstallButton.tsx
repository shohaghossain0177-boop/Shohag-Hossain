import {
  Check,
  Copy,
  Download,
  ExternalLink,
  FileDown,
  Monitor,
  Share,
  Smartphone,
  WifiOff,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { useOnlineStatus, usePWAInstall } from '../hooks/usePWAInstall';
import { buildAndroidChromeIntentUrl, resolvePublicAppUrl } from '../utils/appUrl';

interface PWAInstallButtonProps {
  variant?: 'hero' | 'compact';
  customPublicUrl?: string;
  serverSharedUrl?: string;
  onInstalled?: () => void;
  onCopyLink?: (url: string, msg: string) => void;
  onDownloadOfflineApp?: () => void;
}

export function PWAInstallButton({
  variant = 'hero',
  customPublicUrl,
  serverSharedUrl,
  onInstalled,
  onCopyLink,
  onDownloadOfflineApp,
}: PWAInstallButtonProps) {
  const { isInstallable, isInstalled, isIOS, isAndroid, isInIframe, isInAppBrowser, install } =
    usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);

  // Automatically hide once running as an installed standalone software
  if (isInstalled) {
    return null;
  }

  const resolved = resolvePublicAppUrl({ customPublicUrl, serverSharedUrl });
  const androidChromeHref = buildAndroidChromeIntentUrl(resolved.installUrl);

  const handleClick = async () => {
    if (isInstallable) {
      const accepted = await install();
      if (accepted && onInstalled) onInstalled();
      return;
    }
    setShowGuide(true);
  };

  const handleCopyInstallUrl = () => {
    if (onCopyLink) {
      onCopyLink(resolved.installUrl, 'ইনস্টল লিংক কপি হয়েছে — Chrome বা Safari-তে ওপেন করুন!');
    } else if (typeof navigator !== 'undefined' && navigator.clipboard) {
      void navigator.clipboard.writeText(resolved.installUrl);
    }
    setCopiedUrl(true);
    window.setTimeout(() => setCopiedUrl(false), 2200);
  };

  const buttonClass =
    variant === 'hero'
      ? 'inline-flex min-h-[40px] items-center gap-1.5 rounded-xl bg-white/18 px-3 text-xs font-semibold text-white backdrop-blur-xs transition-colors hover:bg-white/28 whitespace-nowrap active:scale-[0.97]'
      : 'inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-teal-600/35 bg-teal-50 px-3 text-xs font-semibold text-teal-800 transition-colors hover:bg-teal-100 whitespace-nowrap dark:border-teal-500/40 dark:bg-teal-950/50 dark:text-teal-200';

  return (
    <>
      <button
        type="button"
        onClick={() => void handleClick()}
        aria-label="অ্যাপ ইনস্টল করুন"
        className={buttonClass}
      >
        <Download className="h-4 w-4 shrink-0" />
        <span>{isInstallable ? 'ইনস্টল করুন' : 'ইনস্টল'}</span>
      </button>

      {showGuide && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="অ্যাপ ইনস্টল নির্দেশিকা"
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/65 p-0 backdrop-blur-xs sm:items-center sm:p-4"
          onClick={() => setShowGuide(false)}
        >
          <div
            className="max-h-[90vh] w-full overflow-y-auto rounded-t-3xl border border-slate-200 bg-white p-5 shadow-2xl sm:max-w-md sm:rounded-2xl dark:border-slate-800 dark:bg-slate-900"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-2 sm:hidden">
              <div className="mx-auto h-1.5 w-10 rounded-full bg-slate-300 dark:bg-slate-700" />
            </div>

            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-display text-base font-bold text-slate-900 dark:text-slate-100">
                  অ্যাপ ইনস্টল করুন
                </h3>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  Android, iPhone ও PC-তে পূর্ণাঙ্গ সফটওয়্যার হিসেবে ব্যবহার করুন
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowGuide(false)}
                aria-label="বন্ধ করুন"
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-xs leading-relaxed text-slate-700 dark:text-slate-300">
              {/* Case 1: Opened inside Messenger / WhatsApp / Facebook restricted in-app browser */}
              {isInAppBrowser && (
                <div className="rounded-xl border border-amber-200 bg-amber-50/90 p-3.5 text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200">
                  <p className="font-bold">মেসেঞ্জার / হোয়াটসঅ্যাপ ব্রাউজার শনাক্ত হয়েছে</p>
                  <p className="mt-1">
                    সরাসরি ১-ক্লিকে ইনস্টল করতে অ্যাপটি আপনার ফোনের মূল ব্রাউজারে (Chrome বা Safari) ওপেন করুন:
                  </p>
                  <div className="mt-3 flex flex-col gap-2">
                    {isAndroid && (
                      <a
                        href={androidChromeHref}
                        className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-teal-700 px-3 text-xs font-semibold text-white hover:bg-teal-800"
                      >
                        <ExternalLink className="h-4 w-4" />
                        <span>Google Chrome-এ খুলুন ও ইনস্টল করুন</span>
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={handleCopyInstallUrl}
                      className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-amber-300 bg-white px-3 text-xs font-semibold text-amber-950 hover:bg-amber-100 dark:border-amber-800 dark:bg-slate-900 dark:text-amber-200"
                    >
                      {copiedUrl ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                      <span>{copiedUrl ? 'লিংক কপি হয়েছে — Chrome/Safari-তে পেস্ট করুন' : 'ইনস্টল লিংক কপি করুন'}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Case 2: Opened inside an embedded preview iframe */}
              {isInIframe && !isInAppBrowser && (
                <div className="rounded-xl border border-teal-200 bg-teal-50/80 p-3.5 dark:border-teal-900/60 dark:bg-teal-950/40">
                  <p className="font-bold text-teal-950 dark:text-teal-200">
                    ১-ক্লিক ইনস্টলের জন্য পূর্ণ ব্রাউজার ট্যাবে খুলুন
                  </p>
                  <p className="mt-1 text-teal-900/90 dark:text-teal-300/90">
                    প্রিভিউ ফ্রেমের ভেতর থেকে ব্রাউজার ইনস্টল পপ-আপ দেখায় না। নিচের বাটনে চাপলে পাবলিক লিংক নতুন ট্যাবে খুলবে এবং সহজেই ইনস্টল করা যাবে:
                  </p>
                  <a
                    href={resolved.installUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-teal-700 px-4 text-xs font-semibold text-white transition-colors hover:bg-teal-800"
                  >
                    <ExternalLink className="h-4 w-4" />
                    <span>পূর্ণ ব্রাউজারে খুলুন ও ইনস্টল করুন</span>
                  </a>
                </div>
              )}

              {/* Device-specific quick steps */}
              {isIOS ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 dark:border-slate-800 dark:bg-slate-800/60">
                  <p className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-slate-100">
                    <Smartphone className="h-4 w-4 text-teal-700 dark:text-teal-400" />
                    <span>iPhone / iPad (Safari)</span>
                  </p>
                  <ol className="mt-2 list-decimal space-y-1 pl-4">
                    <li>
                      Safari-এর নিচের টুলবারে{' '}
                      <strong className="inline-flex items-center gap-0.5">
                        Share <Share className="inline h-3 w-3" />
                      </strong>{' '}
                      বাটনে ট্যাপ করুন।
                    </li>
                    <li>
                      নিচে স্ক্রল করে <strong>Add to Home Screen</strong> নির্বাচন করুন।
                    </li>
                    <li>
                      উপরে ডানে <strong>Add</strong> চাপলেই অ্যাপটি হোম স্ক্রিনে ইনস্টল হয়ে যাবে।
                    </li>
                  </ol>
                </div>
              ) : isAndroid ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 dark:border-slate-800 dark:bg-slate-800/60">
                  <p className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-slate-100">
                    <Smartphone className="h-4 w-4 text-teal-700 dark:text-teal-400" />
                    <span>Android (Google Chrome)</span>
                  </p>
                  <ol className="mt-2 list-decimal space-y-1 pl-4">
                    <li>Chrome-এর উপরে ডানপাশে মেনু (⋮) আইকনে ট্যাপ করুন।</li>
                    <li>
                      <strong>Install app</strong> বা <strong>Add to Home screen</strong> নির্বাচন করুন।
                    </li>
                    <li>কনফার্ম করলেই ফুল-স্ক্রিন সফটওয়্যার হিসেবে হোম স্ক্রিনে যুক্ত হবে।</li>
                  </ol>
                </div>
              ) : (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 dark:border-slate-800 dark:bg-slate-800/60">
                  <p className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-slate-100">
                    <Monitor className="h-4 w-4 text-teal-700 dark:text-teal-400" />
                    <span>PC / Laptop (Chrome / Edge)</span>
                  </p>
                  <p className="mt-1">
                    অ্যাড্রেস বারের ডানপাশে <strong>Install</strong> আইকন অথবা মেনু (⋮) →{' '}
                    <strong>Cast, save, and share → Install page as app</strong> ক্লিক করুন।
                  </p>
                </div>
              )}

              {/* Direct Copy Install Link & Offline Standalone App Fallback */}
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={handleCopyInstallUrl}
                  className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                >
                  {copiedUrl ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                  <span>{copiedUrl ? 'লিংক কপি হয়েছে' : 'ইনস্টল লিংক কপি'}</span>
                </button>

                {onDownloadOfflineApp && (
                  <button
                    type="button"
                    onClick={() => {
                      onDownloadOfflineApp();
                      setShowGuide(false);
                    }}
                    className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border border-teal-200 bg-teal-50 px-3 text-xs font-semibold text-teal-800 hover:bg-teal-100 dark:border-teal-900 dark:bg-teal-950/50 dark:text-teal-200"
                  >
                    <FileDown className="h-4 w-4" />
                    <span>অফলাইন অ্যাপ ফাইল</span>
                  </button>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowGuide(false)}
              className="mt-4 min-h-[44px] w-full rounded-xl bg-slate-900 text-xs font-semibold text-white hover:bg-slate-800 dark:bg-slate-700 dark:hover:bg-slate-600"
            >
              বন্ধ করুন
            </button>
          </div>
        </div>
      )}
    </>
  );
}

interface SmartInstallBannerProps {
  customPublicUrl?: string;
  serverSharedUrl?: string;
  onInstalled?: () => void;
  onCopyLink?: (url: string, msg: string) => void;
}

/**
 * Appears automatically when a user arrives via a shared install link (?install=1)
 * or opens the app inside Messenger/WhatsApp's restricted in-app browser.
 */
export function SmartInstallBanner({
  customPublicUrl,
  serverSharedUrl,
  onInstalled,
  onCopyLink,
}: SmartInstallBannerProps) {
  const { isInstallable, isInstalled, isAndroid, isIOS, isInAppBrowser, wantsAutoInstall, install } =
    usePWAInstall();
  const [dismissed, setDismissed] = useState(false);

  if (isInstalled || dismissed) return null;
  if (!wantsAutoInstall && !isInAppBrowser && !isInstallable) return null;

  const resolved = resolvePublicAppUrl({ customPublicUrl, serverSharedUrl });
  const androidChromeHref = buildAndroidChromeIntentUrl(resolved.installUrl);

  const handleInstallNow = async () => {
    if (isInstallable) {
      const ok = await install();
      if (ok && onInstalled) onInstalled();
      return;
    }
    if (onCopyLink) {
      onCopyLink(resolved.installUrl, 'ইনস্টল লিংক কপি হয়েছে — Chrome বা Safari-তে খুলুন!');
    }
  };

  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-teal-200 bg-teal-50/90 px-4 py-3 text-xs text-teal-950 print:hidden dark:border-teal-900/60 dark:bg-teal-950/50 dark:text-teal-100">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-700 text-white">
          <Download className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="font-display text-sm font-bold">
            {isInAppBrowser
              ? 'সঠিকভাবে ইনস্টল করতে Chrome / Safari-তে খুলুন'
              : 'BARAKAH UNITY অ্যাপটি সরাসরি ফোনে ইনস্টল করুন'}
          </p>
          <p className="mt-0.5 text-[11px] text-teal-800/90 dark:text-teal-300/90">
            {isInAppBrowser
              ? 'মেসেঞ্জার বা হোয়াটসঅ্যাপের ভেতরের ব্রাউজারে ইনস্টল সাপোর্ট সীমিত — মূল ব্রাউজারে খুললে ১ ক্লিকেই ইনস্টল হবে।'
              : isIOS
                ? 'Safari-তে Share → Add to Home Screen চাপলে ফুল-স্ক্রিন অ্যাপ হিসেবে চালু হবে।'
                : 'হোম স্ক্রিনে যুক্ত করলে প্রতিবার লিংক ছাড়াই দ্রুত ওপেন করতে পারবেন।'}
          </p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {isInAppBrowser && isAndroid ? (
          <a
            href={androidChromeHref}
            className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl bg-teal-700 px-3.5 text-xs font-semibold text-white hover:bg-teal-800 whitespace-nowrap"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            <span>Chrome-এ খুলুন</span>
          </a>
        ) : (
          <button
            type="button"
            onClick={() => void handleInstallNow()}
            className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl bg-teal-700 px-3.5 text-xs font-semibold text-white hover:bg-teal-800 whitespace-nowrap"
          >
            <Download className="h-3.5 w-3.5" />
            <span>{isInstallable ? 'এখনই ইনস্টল করুন' : 'লিংক কপি করুন'}</span>
          </button>
        )}

        <button
          type="button"
          onClick={() => setDismissed(true)}
          aria-label="বন্ধ করুন"
          className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-teal-800 hover:bg-teal-100 dark:text-teal-200 dark:hover:bg-teal-900/60"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export function OfflineIndicator() {
  const isOnline = useOnlineStatus();
  if (isOnline) return null;

  return (
    <div
      role="status"
      className="fixed bottom-20 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-xl bg-amber-600 px-3.5 py-2 text-xs font-semibold text-white shadow-lg md:bottom-5 print:hidden"
    >
      <WifiOff className="h-3.5 w-3.5 shrink-0" />
      <span>অফলাইন মোড — সংরক্ষিত ডেটা দেখানো হচ্ছে</span>
    </div>
  );
}
