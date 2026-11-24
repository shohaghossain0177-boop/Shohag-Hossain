import {
  CheckCircle2,
  CloudDownload,
  Download,
  History,
  RefreshCw,
  Share2,
  Upload,
} from 'lucide-react';
import { useRef } from 'react';
import { formatDateBn, getGlobalStats, toBn } from '../data/defaultData';
import type { UnityDatabase, UpdateCheckResult } from '../types/unity';

interface UpdateBackupViewProps {
  db: UnityDatabase;
  isAdmin: boolean;
  checkingUpdate: boolean;
  updateCheck: UpdateCheckResult | null;
  onCheckUpdate: () => void;
  onApplyServerUpdate: () => void;
  onShareSummary: () => void;
  onDownloadJsonBackup: () => void;
  onImportJsonUpdate: (file: File) => void;
}

export function UpdateBackupView({
  db,
  isAdmin,
  checkingUpdate,
  updateCheck,
  onCheckUpdate,
  onApplyServerUpdate,
  onShareSummary,
  onDownloadJsonBackup,
  onImportJsonUpdate,
}: UpdateBackupViewProps) {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const stats = getGlobalStats(db);
  const changelog = db.appConfig.changelog || [];

  return (
    <div className="space-y-5">
      {/* App Version & In-App Update Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-medium text-teal-700 dark:text-teal-400">
              ইন-অ্যাপ আপডেট সিস্টেম · BARAKAH UNITY
            </p>
            <h2 className="font-display mt-1 text-xl font-bold text-slate-900 dark:text-slate-100">
              বর্তমান ভার্সন: v{db.appConfig.appVersion || '2.0.0'}
            </h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              সর্বশেষ সিঙ্ক: {db.lastBackup || 'এইমাত্র'} · মোট ফান্ড: ৳ {toBn(stats.totalFund)} ({toBn(stats.totalKisti)} কিস্তি)
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              disabled={checkingUpdate}
              onClick={onCheckUpdate}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-teal-700 px-4 text-sm font-semibold text-white transition-colors hover:bg-teal-800 disabled:opacity-60 active:scale-[0.98] whitespace-nowrap"
            >
              <RefreshCw className={`h-4 w-4 ${checkingUpdate ? 'animate-spin' : ''}`} />
              <span>{checkingUpdate ? 'চেক হচ্ছে...' : 'আপডেট চেক করুন'}</span>
            </button>
            <button
              type="button"
              onClick={onApplyServerUpdate}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-teal-600/35 bg-teal-50 px-4 text-sm font-semibold text-teal-900 transition-colors hover:bg-teal-100 active:scale-[0.98] whitespace-nowrap dark:border-teal-500/40 dark:bg-teal-950/60 dark:text-teal-200 dark:hover:bg-teal-900/60"
            >
              <CloudDownload className="h-4 w-4" />
              <span>ফোর্স আপডেট</span>
            </button>
          </div>
        </div>

        {/* Update Check Result */}
        {updateCheck && (
          <div
            className={`mt-4 rounded-xl border p-4 ${
              updateCheck.hasUpdate
                ? 'border-teal-300 bg-teal-50/80 dark:border-teal-800 dark:bg-teal-950/40'
                : 'border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-800/50'
            }`}
          >
            {updateCheck.hasUpdate ? (
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-teal-900 dark:text-teal-200">
                      নতুন আপডেট পাওয়া গেছে: v{updateCheck.latestVersion}
                    </p>
                    <p className="mt-0.5 text-xs text-teal-800/80 dark:text-teal-300/80">
                      প্রকাশের তারিখ: {formatDateBn(updateCheck.releaseDate)}
                    </p>
                  </div>
                </div>
                <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-200">
                  {updateCheck.releaseNotes}
                </p>
                <button
                  type="button"
                  onClick={onApplyServerUpdate}
                  className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-teal-700 px-4 text-sm font-semibold text-white hover:bg-teal-800 sm:w-auto sm:px-6"
                >
                  <CloudDownload className="h-4 w-4" />
                  <span>এখনই আপডেট ইনস্টল করুন</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2.5 text-sm font-medium text-emerald-700 dark:text-emerald-400">
                <CheckCircle2 className="h-5 w-5 shrink-0" />
                <span>আপনার অ্যাপটি সম্পূর্ণ আপ-টু-ডেট রয়েছে (v{updateCheck.currentVersion})।</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Offline Update File + Share Summary */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <h3 className="font-display text-base font-bold text-slate-900 dark:text-slate-100">
            ফাইল থেকে আপডেট নিন (.json)
          </h3>
          <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
            এডমিন কোনো অফলাইন আপডেট ফাইল (.json) শেয়ার করলে সরাসরি এখান থেকে ইমপোর্ট করে অ্যাপ আপডেট করতে পারবেন।
          </p>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-800 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          >
            <Upload className="h-4 w-4 text-teal-700 dark:text-teal-400" />
            <span>আপডেট ফাইল নির্বাচন করুন</span>
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".json,application/json"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onImportJsonUpdate(file);
              e.target.value = '';
            }}
          />
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <h3 className="font-display text-base font-bold text-slate-900 dark:text-slate-100">
            হিসাবের সামারি ও ব্যাকআপ
          </h3>
          <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
            মোট ফান্ড, কিস্তি ও সদস্যদের হিসাবের সংক্ষিপ্ত রিপোর্ট কপি বা শেয়ার করুন।
          </p>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={onShareSummary}
              className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white hover:bg-slate-800 dark:bg-teal-700 dark:hover:bg-teal-600"
            >
              <Share2 className="h-4 w-4" />
              <span>সামারি শেয়ার</span>
            </button>
            {isAdmin && (
              <button
                type="button"
                onClick={onDownloadJsonBackup}
                className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-800 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-100 dark:hover:bg-slate-800"
              >
                <Download className="h-4 w-4" />
                <span>JSON ব্যাকআপ</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Changelog History */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-4 dark:border-slate-800">
          <History className="h-4 w-4 text-teal-700 dark:text-teal-400" />
          <h3 className="font-display text-base font-bold text-slate-900 dark:text-slate-100">
            আপডেট ইতিহাস (Changelog)
          </h3>
        </div>
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {changelog.map((rel, idx) => (
            <div key={`${rel.version}_${idx}`} className="p-4 sm:p-5">
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <span className="font-mono-num font-bold text-teal-700 dark:text-teal-400">
                  v{rel.version}
                </span>
                <span aria-hidden="true">·</span>
                <span>{formatDateBn(rel.releaseDate)}</span>
              </div>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                {rel.notes}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
