import { Download, FileSpreadsheet, Printer } from 'lucide-react';
import { useMemo, useState } from 'react';
import {
  formatDateBn,
  getGlobalDueAndBlockFund,
  getPeriodFinancialReport,
  getTodayISO,
  sanitizeCsvCell,
  toBn,
} from '../data/defaultData';
import type { UnityDatabase } from '../types/unity';

interface ReportsViewProps {
  db: UnityDatabase;
  isAdmin: boolean;
  onSelectMember: (memberId: number) => void;
  onNotify: (msg: string) => void;
}

const BN_MONTHS = [
  'জানুয়ারি',
  'ফেব্রুয়ারি',
  'মার্চ',
  'এপ্রিল',
  'মে',
  'জুন',
  'জুলাই',
  'আগস্ট',
  'সেপ্টেম্বর',
  'অক্টোবর',
  'নভেম্বর',
  'ডিসেম্বর',
];

function formatMonthLabelBn(ym: string): string {
  const [y, m] = ym.split('-');
  const idx = Number(m) - 1;
  if (idx >= 0 && idx < 12) return `${BN_MONTHS[idx]} ${toBn(y)}`;
  return ym;
}

export function ReportsView({ db, onSelectMember, onNotify }: ReportsViewProps) {
  const todayISO = getTodayISO();
  const [mode, setMode] = useState<'month' | 'year' | 'all'>('month');
  const [selectedMonth, setSelectedMonth] = useState<string>(todayISO.slice(0, 7));
  const [selectedYear, setSelectedYear] = useState<string>(todayISO.slice(0, 4));

  const availableYears = useMemo(() => {
    const years = new Set<string>([todayISO.slice(0, 4), '2026']);
    db.members.forEach((m) =>
      m.deposits.forEach((d) => {
        if (d.date && d.date.length >= 4) years.add(d.date.slice(0, 4));
      })
    );
    return Array.from(years).sort((a, b) => b.localeCompare(a));
  }, [db.members, todayISO]);

  const periodPrefix = mode === 'month' ? selectedMonth : mode === 'year' ? selectedYear : 'ALL';
  const periodTitle =
    mode === 'month'
      ? `মাসিক রিপোর্ট — ${formatMonthLabelBn(selectedMonth)}`
      : mode === 'year'
        ? `বাৎসরিক রিপোর্ট — ${toBn(selectedYear)}`
        : 'সর্বকালীন পূর্ণাঙ্গ ফান্ড রিপোর্ট';

  const report = useMemo(
    () => getPeriodFinancialReport(db, periodPrefix, todayISO),
    [db, periodPrefix, todayISO]
  );

  const globalDueBlock = useMemo(() => getGlobalDueAndBlockFund(db, todayISO), [db, todayISO]);

  const handleDownloadCsv = () => {
    const headers = [
      'সদস্য আইডি',
      'সদস্যের নাম',
      'মোবাইল নম্বর',
      'সময়কালের জমা (বার)',
      'সময়কালের কিস্তি',
      'সময়কালের আদায় (টাকা)',
      'মোট সর্বকালীন জমা (টাকা)',
      'বকেয়া দিন',
      'বকেয়া টাকা',
      '১ম মাসের ব্লক ফান্ড (টাকা)',
      'সময়কালের ড্র প্রাপ্তি (টাকা)',
    ];

    const csvLines = [
      headers.map(sanitizeCsvCell).join(','),
      ...report.rows.map((r) =>
        [
          r.memberId,
          r.memberName,
          r.phone,
          r.periodDepositsCount,
          r.periodKisti,
          r.periodAmount,
          r.allTimeAmount,
          r.dueDays,
          r.dueAmount,
          r.blockFundAmount,
          r.drawReceivedInPeriod,
        ]
          .map(sanitizeCsvCell)
          .join(',')
      ),
      [
        'মোট',
        `${report.rows.length} জন সদস্য`,
        '',
        report.totalDepositsCount,
        report.totalKisti,
        report.totalCollected,
        report.rows.reduce((s, r) => s + r.allTimeAmount, 0),
        globalDueBlock.totalDueDays,
        globalDueBlock.totalDueAmount,
        globalDueBlock.totalBlockFund,
        report.totalDrawsInPeriod,
      ]
        .map(sanitizeCsvCell)
        .join(','),
    ];

    // UTF-8 BOM ensures Excel opens Bangla characters flawlessly
    const blob = new Blob(['\uFEFF' + csvLines.join('\r\n')], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `barakah_report_${periodPrefix.toLowerCase()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    onNotify('এক্সেল (CSV) ফিন্যান্সিয়াল রিপোর্ট ডাউনলোড হয়েছে!');
  };

  const handlePrintReport = () => {
    window.print();
  };

  return (
    <div className="space-y-5">
      {/* Print-Only Header */}
      <div className="hidden border-b-2 border-slate-900 pb-4 print:block">
        <h1 className="font-display text-xl font-bold text-slate-950">
          BARAKAH MULTICARE HOSPITAL UNITY
        </h1>
        <p className="mt-1 text-xs text-slate-600">
          {periodTitle} · প্রিন্ট তারিখ: {formatDateBn(todayISO)} · {db.adminName} Admin
        </p>
      </div>

      {/* Controls Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 print:hidden dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-teal-700 dark:text-teal-400">
              অটোমেটেড ফিন্যান্সিয়াল স্টেটমেন্ট
            </p>
            <h2 className="font-display mt-0.5 text-xl font-bold text-slate-900 dark:text-slate-100">
              {periodTitle}
            </h2>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleDownloadCsv}
              className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-emerald-700 px-3.5 text-xs font-semibold text-white hover:bg-emerald-800"
            >
              <FileSpreadsheet className="h-4 w-4" />
              <span>এক্সেল (CSV) ডাউনলোড</span>
            </button>
            <button
              type="button"
              onClick={handlePrintReport}
              className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-xs font-semibold text-slate-800 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            >
              <Printer className="h-4 w-4 text-teal-700 dark:text-teal-400" />
              <span>প্রিন্ট / PDF</span>
            </button>
          </div>
        </div>

        {/* Mode Switch & Picker */}
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <div className="grid grid-cols-3 gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
            {(
              [
                { id: 'month', label: 'মাসিক' },
                { id: 'year', label: 'বাৎসরিক' },
                { id: 'all', label: 'সর্বকালীন' },
              ] as const
            ).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setMode(item.id)}
                className={`h-9 rounded-lg px-3 text-xs font-semibold transition-colors ${
                  mode === item.id
                    ? 'bg-white text-teal-700 shadow-xs dark:bg-slate-900 dark:text-teal-300'
                    : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {mode === 'month' && (
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value || todayISO.slice(0, 7))}
              className="h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
          )}

          {mode === 'year' && (
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            >
              {availableYears.map((yr) => (
                <option key={yr} value={yr}>
                  {toBn(yr)} সাল
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* KPI Summary Grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs text-slate-500 dark:text-slate-400">সময়কালের মোট আদায়</p>
          <p className="font-mono-num mt-1 text-xl font-bold text-teal-700 dark:text-teal-400">
            ৳ {toBn(report.totalCollected)}
          </p>
          <p className="mt-0.5 text-[11px] text-slate-500">
            {toBn(report.totalKisti)} কিস্তি · {toBn(report.activeContributors)} জন সক্রিয়
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs text-slate-500 dark:text-slate-400">সময়কালের ড্র প্রদান</p>
          <p className="font-mono-num mt-1 text-xl font-bold text-amber-700 dark:text-amber-400">
            ৳ {toBn(report.totalDrawsInPeriod)}
          </p>
          <p className="mt-0.5 text-[11px] text-slate-500">
            {toBn(report.periodDrawsList.length)} টি ড্র
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs text-slate-500 dark:text-slate-400">১ম মাসের ব্লক ফান্ড</p>
          <p className="font-mono-num mt-1 text-xl font-bold text-indigo-700 dark:text-indigo-400">
            ৳ {toBn(globalDueBlock.totalBlockFund)}
          </p>
          <p className="mt-0.5 text-[11px] text-slate-500">
            লক্ষ্য: ৳ {toBn(globalDueBlock.targetBlockFund)}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs text-slate-500 dark:text-slate-400">মোট বকেয়া (Due)</p>
          <p className="font-mono-num mt-1 text-xl font-bold text-red-600 dark:text-red-400">
            ৳ {toBn(globalDueBlock.totalDueAmount)}
          </p>
          <p className="mt-0.5 text-[11px] text-slate-500">
            {toBn(globalDueBlock.membersWithDueCount)} জন সদস্যের বকেয়া
          </p>
        </div>
      </div>

      {/* Member-by-member Report Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5 dark:border-slate-800">
          <h3 className="font-display text-sm font-bold text-slate-900 dark:text-slate-100">
            সদস্যভিত্তিক আর্থিক বিবরণী
          </h3>
          <button
            type="button"
            onClick={handleDownloadCsv}
            className="inline-flex items-center gap-1 text-xs font-semibold text-teal-700 hover:underline print:hidden dark:text-teal-400"
          >
            <Download className="h-3.5 w-3.5" />
            <span>CSV সেভ</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50 text-[11px] font-semibold text-slate-500 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-400">
                <th className="px-3.5 py-3">আইডি</th>
                <th className="px-3.5 py-3">সদস্যের নাম</th>
                <th className="px-3.5 py-3 text-right">সময়কালের জমা</th>
                <th className="px-3.5 py-3 text-right">মোট জমা</th>
                <th className="px-3.5 py-3 text-right">ব্লক ফান্ড</th>
                <th className="px-3.5 py-3 text-right">বকেয়া (Due)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {report.rows.map((r) => (
                <tr
                  key={r.memberId}
                  onClick={() => onSelectMember(r.memberId)}
                  className="cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/40"
                >
                  <td className="font-mono-num px-3.5 py-2.5 font-semibold text-slate-500">
                    #{toBn(r.memberId)}
                  </td>
                  <td className="px-3.5 py-2.5 font-semibold text-slate-900 dark:text-slate-100">
                    {r.memberName}
                  </td>
                  <td className="font-mono-num px-3.5 py-2.5 text-right font-bold text-teal-700 dark:text-teal-400">
                    ৳ {toBn(r.periodAmount)}
                  </td>
                  <td className="font-mono-num px-3.5 py-2.5 text-right text-slate-700 dark:text-slate-300">
                    ৳ {toBn(r.allTimeAmount)}
                  </td>
                  <td className="font-mono-num px-3.5 py-2.5 text-right text-indigo-700 dark:text-indigo-400">
                    ৳ {toBn(r.blockFundAmount)}
                  </td>
                  <td
                    className={`font-mono-num px-3.5 py-2.5 text-right font-semibold ${
                      r.dueAmount > 0
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-emerald-700 dark:text-emerald-400'
                    }`}
                  >
                    {r.dueAmount > 0 ? `৳ ${toBn(r.dueAmount)} (${toBn(r.dueDays)} দিন)` : 'পরিশোধিত'}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-teal-600/30 bg-teal-50/70 font-bold text-teal-900 dark:bg-teal-950/40 dark:text-teal-200">
                <td colSpan={2} className="px-3.5 py-3">
                  সর্বমোট ({toBn(report.rows.length)} জন সদস্য)
                </td>
                <td className="font-mono-num px-3.5 py-3 text-right">
                  ৳ {toBn(report.totalCollected)}
                </td>
                <td className="font-mono-num px-3.5 py-3 text-right">
                  ৳ {toBn(report.rows.reduce((s, r) => s + r.allTimeAmount, 0))}
                </td>
                <td className="font-mono-num px-3.5 py-3 text-right">
                  ৳ {toBn(globalDueBlock.totalBlockFund)}
                </td>
                <td className="font-mono-num px-3.5 py-3 text-right text-red-700 dark:text-red-300">
                  ৳ {toBn(globalDueBlock.totalDueAmount)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
