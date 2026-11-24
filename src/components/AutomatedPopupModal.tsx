import { BellRing, X } from 'lucide-react';
import { toBn } from '../data/defaultData';
import type { AutomatedPopup, PageRoute } from '../types/unity';

interface AutomatedPopupModalProps {
  popup: AutomatedPopup | null;
  unpaidCountToday: number;
  paidCountToday: number;
  onClose: (dismissForToday: boolean) => void;
  onAction: (target: PageRoute) => void;
}

export function AutomatedPopupModal({
  popup,
  unpaidCountToday,
  paidCountToday,
  onClose,
  onAction,
}: AutomatedPopupModalProps) {
  if (!popup) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="auto-popup-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs"
    >
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-xl dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-700 dark:bg-teal-950 dark:text-teal-300">
              <BellRing className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                অটোমেটেড বার্তা · BARAKAH UNITY
              </p>
              <h2
                id="auto-popup-title"
                className="font-display text-base font-bold text-slate-900 dark:text-slate-100"
              >
                {popup.title}
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onClose(false)}
            aria-label="বন্ধ করুন"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="mt-3.5 whitespace-pre-line text-sm leading-relaxed text-slate-700 dark:text-slate-300">
          {popup.message}
        </p>

        {popup.triggerType === 'unpaid_reminder' && (
          <div className="mt-3.5 flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs dark:border-slate-800 dark:bg-slate-800/60">
            <span className="font-medium text-slate-600 dark:text-slate-300">আজকের সারসংক্ষেপ</span>
            <span className="font-mono-num font-semibold text-slate-900 dark:text-slate-100">
              পরিশোধ: {toBn(paidCountToday)} জন · বাকি: {toBn(unpaidCountToday)} জন
            </span>
          </div>
        )}

        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          {popup.actionTarget ? (
            <button
              type="button"
              onClick={() => {
                onClose(true);
                onAction(popup.actionTarget as PageRoute);
              }}
              className="h-11 flex-1 rounded-xl bg-teal-700 px-4 text-sm font-semibold text-white transition-colors hover:bg-teal-800 active:scale-[0.98]"
            >
              {popup.actionLabel || 'বিস্তারিত দেখুন'}
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => onClose(true)}
            className="h-11 flex-1 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 active:scale-[0.98] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            বুঝেছি (আজ বন্ধ রাখুন)
          </button>
        </div>
      </div>
    </div>
  );
}
