import { BookOpen, CalendarCheck2, CloudDownload, Home, Settings } from 'lucide-react';
import type { PageRoute } from '../types/unity';

interface BottomNavProps {
  page: PageRoute;
  isAdmin: boolean;
  hasAvailableUpdate: boolean;
  onNavigate: (page: PageRoute) => void;
}

export function BottomNav({ page, isAdmin, hasAvailableUpdate, onNavigate }: BottomNavProps) {
  const items: Array<{
    key: PageRoute;
    label: string;
    icon: typeof Home;
    badge?: boolean;
  }> = [
    { key: 'home', label: 'হোম', icon: Home },
    { key: 'dailyPayments', label: 'দৈনিক তালিকা', icon: CalendarCheck2 },
    { key: 'rules', label: 'নিয়মাবলি', icon: BookOpen },
    isAdmin
      ? { key: 'admin', label: 'এডমিন', icon: Settings }
      : { key: 'updates', label: 'আপডেট', icon: CloudDownload, badge: hasAvailableUpdate },
  ];

  return (
    <nav
      aria-label="প্রধান নেভিগেশন"
      className="fixed right-0 bottom-0 left-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur-md pb-safe print:hidden md:hidden dark:border-slate-800 dark:bg-slate-900/95"
    >
      <div className="mx-auto grid h-14 max-w-xl grid-cols-4 items-center">
        {items.map((item) => {
          const Icon = item.icon;
          const active = page === item.key;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => onNavigate(item.key)}
              className={`relative flex h-full flex-col items-center justify-center gap-0.5 transition-colors active:scale-95 ${
                active
                  ? 'text-teal-700 dark:text-teal-400'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              <Icon className="h-5 w-5" strokeWidth={active ? 2.3 : 1.9} />
              <span className="text-[11px] font-semibold leading-none whitespace-nowrap">
                {item.label}
                {item.badge ? ' *' : ''}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
