import { Pin, X } from 'lucide-react';
import { getNoticeDurationLabel, getTimeRemainingBn } from '../data/defaultData';
import type { PinnedNotice } from '../types/unity';

interface PinnedNoticeBannerProps {
  notice: PinnedNotice | null;
  isAdmin: boolean;
  onUnpin?: () => void;
}

export function PinnedNoticeBanner({ notice, isAdmin, onUnpin }: PinnedNoticeBannerProps) {
  if (!notice) return null;
  if (Date.now() > notice.expiresAtMs) return null;

  const remaining = getTimeRemainingBn(notice.expiresAtMs);
  const durationLabel = getNoticeDurationLabel(notice.duration);

  return (
    <section
      aria-label="পিন করা নোটিশ"
      className="rounded-2xl border border-amber-200 bg-amber-50/90 p-4 text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-100"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-amber-800 dark:text-amber-300">
            <span className="inline-flex items-center gap-1 font-semibold">
              <Pin className="h-3.5 w-3.5" />
              পিন করা নোটিশ
            </span>
            <span aria-hidden="true">·</span>
            <span>মেয়াদ: {durationLabel}</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono-num">{remaining}</span>
          </div>
          {notice.title && (
            <h3 className="mt-1.5 text-sm font-bold text-amber-950 dark:text-amber-50 sm:text-base">
              {notice.title}
            </h3>
          )}
          <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-amber-900/90 dark:text-amber-100/90">
            {notice.body}
          </p>
        </div>

        {isAdmin && onUnpin && (
          <button
            type="button"
            onClick={onUnpin}
            title="নোটিশ আনপিন করুন"
            aria-label="নোটিশ আনপিন করুন"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-amber-800 transition-colors hover:bg-amber-200/60 dark:text-amber-200 dark:hover:bg-amber-900/50"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </section>
  );
}
