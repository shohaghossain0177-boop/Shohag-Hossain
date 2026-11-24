import { ArrowLeft, Home, Lock, Share2, ShieldCheck } from 'lucide-react';
import type { PageRoute } from '../types/unity';
import { AppLogo } from './AppLogo';

interface TopBarProps {
  page: PageRoute;
  pageTitle: string;
  previousPageLabel: string | null;
  canGoBack: boolean;
  isAdmin: boolean;
  hasAvailableUpdate: boolean;
  appLogoUrl?: string;
  onNavigate: (page: PageRoute) => void;
  onGoBack: () => void;
  onOpenAdminGate: () => void;
  onOpenShare: () => void;
}

export function TopBar({
  page,
  pageTitle,
  previousPageLabel,
  canGoBack,
  isAdmin,
  hasAvailableUpdate,
  appLogoUrl,
  onNavigate,
  onGoBack,
  onOpenAdminGate,
  onOpenShare,
}: TopBarProps) {
  const isHome = page === 'home';

  const navItems: Array<{ page: PageRoute; label: string }> = [
    { page: 'home', label: 'হোম' },
    { page: 'dailyPayments', label: 'দৈনিক তালিকা' },
    { page: 'rules', label: 'নিয়মাবলি' },
    { page: 'payment', label: 'পেমেন্ট' },
    { page: 'updates', label: hasAvailableUpdate ? 'আপডেট · নতুন' : 'আপডেট' },
  ];

  return (
    <header className="sticky top-0 z-30 h-14 border-b border-slate-200/90 bg-white/95 backdrop-blur-md print:hidden dark:border-slate-800 dark:bg-slate-900/95">
      <div className="mx-auto flex h-full max-w-6xl items-center justify-between gap-2 px-4 sm:px-6 lg:gap-8">
        {/* Zone 1: Brand Wordmark on Home, or Upgraded Back Button + Title on Sub-pages */}
        {isHome ? (
          <button
            type="button"
            onClick={() => onNavigate('home')}
            className="inline-flex items-center gap-2 font-display text-base font-bold tracking-tight text-teal-800 whitespace-nowrap shrink-0 dark:text-teal-300 sm:text-lg"
          >
            <AppLogo logoUrl={appLogoUrl} size="sm" variant="surface" />
            <span>BARAKAH UNITY</span>
          </button>
        ) : (
          <div className="flex min-w-0 items-center gap-2">
            <button
              type="button"
              onClick={onGoBack}
              aria-label={previousPageLabel ? `${previousPageLabel} পেজে ফিরে যান` : 'পেছনে যান'}
              className="group inline-flex h-10 items-center gap-1.5 rounded-xl border border-teal-600/35 bg-teal-50/90 px-3.5 text-xs font-bold text-teal-900 transition-all hover:border-teal-600/60 hover:bg-teal-100/90 active:scale-[0.96] whitespace-nowrap shrink-0 dark:border-teal-500/40 dark:bg-teal-950/60 dark:text-teal-200 dark:hover:border-teal-400/60 dark:hover:bg-teal-900/70 sm:text-sm"
            >
              <ArrowLeft className="h-4 w-4 shrink-0 transition-transform group-hover:-translate-x-0.5" />
              <span>{canGoBack && previousPageLabel ? previousPageLabel : 'ব্যাক'}</span>
            </button>

            {canGoBack && previousPageLabel && previousPageLabel !== 'হোম' && (
              <button
                type="button"
                onClick={() => onNavigate('home')}
                aria-label="হোম পেজে যান"
                title="হোম পেজ"
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-100 active:scale-95 shrink-0 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              >
                <Home className="h-4 w-4" />
              </button>
            )}

            <h1 className="font-display min-w-0 truncate pl-1 text-sm font-bold text-slate-900 dark:text-slate-100 sm:text-base">
              {pageTitle}
            </h1>
          </div>
        )}

        {/* Zone 2: Clean Single-Line Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600 dark:text-slate-300">
          {navItems.map((item) => {
            const active = page === item.page;
            return (
              <button
                key={item.page}
                type="button"
                onClick={() => onNavigate(item.page)}
                className={`relative py-1 whitespace-nowrap shrink-0 transition-colors ${
                  active
                    ? 'font-semibold text-teal-700 dark:text-teal-300'
                    : 'hover:text-slate-950 dark:hover:text-white'
                }`}
              >
                {item.label}
                {active && (
                  <span className="absolute right-0 -bottom-0.5 left-0 h-0.5 rounded-full bg-teal-700 dark:bg-teal-400" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Share + Primary Admin Action */}
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={onOpenShare}
            aria-label="অ্যাপ শেয়ার করুন"
            title="অ্যাপ শেয়ার করুন"
            className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-2.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-100 active:scale-[0.97] whitespace-nowrap shrink-0 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 sm:px-3"
          >
            <Share2 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">শেয়ার</span>
          </button>

          {isAdmin ? (
            <button
              type="button"
              onClick={() => onNavigate('admin')}
              className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 text-xs font-semibold text-white transition-colors hover:bg-slate-800 active:scale-[0.98] whitespace-nowrap shrink-0 dark:bg-teal-600 dark:hover:bg-teal-500"
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>এডমিন</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onOpenAdminGate}
              className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-teal-700 px-3.5 text-xs font-semibold text-white transition-colors hover:bg-teal-800 active:scale-[0.98] whitespace-nowrap shrink-0 dark:bg-teal-600 dark:hover:bg-teal-500"
            >
              <Lock className="h-3.5 w-3.5" />
              <span>এডমিন লগইন</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
