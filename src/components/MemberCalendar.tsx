import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useMemo, useState } from 'react';
import {
  formatDateBn,
  getMemberAdvanceCoverage,
  getTodayISO,
  SCHEME_START_DATE,
  toBn,
} from '../data/defaultData';
import type { Member } from '../types/unity';

interface MemberCalendarProps {
  member: Member;
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

const BN_WEEKDAYS = ['রবি', 'সোম', 'মঙ্গল', 'বুধ', 'বৃহঃ', 'শুক্র', 'শনি'];

export function MemberCalendar({ member }: MemberCalendarProps) {
  const todayISO = getTodayISO();
  const [year, setYear] = useState(() => Number(todayISO.slice(0, 4)));
  const [monthIdx, setMonthIdx] = useState(() => Number(todayISO.slice(5, 7)) - 1);

  const coverage = useMemo(() => getMemberAdvanceCoverage(member), [member]);

  const calendarCells = useMemo(() => {
    const firstDayWeekday = new Date(Date.UTC(year, monthIdx, 1)).getUTCDay();
    const daysInMonth = new Date(Date.UTC(year, monthIdx + 1, 0)).getUTCDate();
    const cells: Array<{
      iso: string | null;
      dayNum: number;
      status: 'empty' | 'direct' | 'advance' | 'due' | 'future' | 'pre';
      tooltip: string;
    }> = [];

    for (let i = 0; i < firstDayWeekday; i++) {
      cells.push({ iso: null, dayNum: 0, status: 'empty', tooltip: '' });
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const mStr = String(monthIdx + 1).padStart(2, '0');
      const dStr = String(day).padStart(2, '0');
      const iso = `${year}-${mStr}-${dStr}`;
      const cov = coverage.coveredDates.get(iso);

      if (cov) {
        const isAdv = cov.isCarriedFromAdvance || iso > todayISO;
        cells.push({
          iso,
          dayNum: day,
          status: isAdv ? 'advance' : 'direct',
          tooltip: isAdv
            ? `${formatDateBn(iso)} — এডভান্স পরিশোধিত (৳${toBn(cov.creditedAmount)})`
            : `${formatDateBn(iso)} — পরিশোধিত (৳${toBn(cov.directAmount)})`,
        });
      } else if (iso < SCHEME_START_DATE) {
        cells.push({
          iso,
          dayNum: day,
          status: 'pre',
          tooltip: `${formatDateBn(iso)} — স্কিম শুরুর পূর্বের তারিখ`,
        });
      } else if (iso <= todayISO) {
        cells.push({
          iso,
          dayNum: day,
          status: 'due',
          tooltip: `${formatDateBn(iso)} — বকেয়া / পরিশোধ বাকি`,
        });
      } else {
        cells.push({
          iso,
          dayNum: day,
          status: 'future',
          tooltip: `${formatDateBn(iso)} — আসন্ন তারিখ`,
        });
      }
    }

    return cells;
  }, [year, monthIdx, coverage, todayISO]);

  const goPrevMonth = () => {
    if (monthIdx === 0) {
      setYear((y) => y - 1);
      setMonthIdx(11);
    } else {
      setMonthIdx((m) => m - 1);
    }
  };

  const goNextMonth = () => {
    if (monthIdx === 11) {
      setYear((y) => y + 1);
      setMonthIdx(0);
    } else {
      setMonthIdx((m) => m + 1);
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 print:hidden dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h3 className="font-display text-sm font-bold text-slate-900 dark:text-slate-100">
            পেমেন্ট ক্যালেন্ডার ভিউ
          </h3>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            {BN_MONTHS[monthIdx]} {toBn(year)}
          </p>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={goPrevMonth}
            aria-label="পূর্ববর্তী মাস"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => {
              setYear(Number(todayISO.slice(0, 4)));
              setMonthIdx(Number(todayISO.slice(5, 7)) - 1);
            }}
            className="h-8 rounded-lg border border-slate-200 px-2.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            আজ
          </button>
          <button
            type="button"
            onClick={goNextMonth}
            aria-label="পরবর্তী মাস"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Weekday headers */}
      <div className="mt-3 grid grid-cols-7 gap-1 text-center text-[11px] font-semibold text-slate-500 dark:text-slate-400">
        {BN_WEEKDAYS.map((w) => (
          <div key={w} className="py-1">
            {w}
          </div>
        ))}
      </div>

      {/* Days grid */}
      <div className="mt-1 grid grid-cols-7 gap-1">
        {calendarCells.map((cell, idx) => {
          if (cell.status === 'empty') {
            return <div key={`empty_${idx}`} className="h-9" />;
          }

          const isToday = cell.iso === todayISO;
          const statusClasses =
            cell.status === 'direct'
              ? 'bg-emerald-600 text-white font-bold'
              : cell.status === 'advance'
                ? 'bg-sky-600 text-white font-bold'
                : cell.status === 'due'
                  ? 'bg-red-100 text-red-700 font-bold dark:bg-red-950/60 dark:text-red-300'
                  : 'bg-slate-50 text-slate-400 dark:bg-slate-800/50 dark:text-slate-500';

          return (
            <div
              key={cell.iso}
              title={cell.tooltip}
              className={`font-mono-num flex h-9 items-center justify-center rounded-lg text-xs transition-transform ${statusClasses} ${
                isToday ? 'ring-2 ring-slate-900 ring-offset-1 dark:ring-white dark:ring-offset-slate-900' : ''
              }`}
            >
              {toBn(cell.dayNum)}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-2.5 text-[11px] text-slate-600 dark:border-slate-800 dark:text-slate-300">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-emerald-600" />
          পরিশোধিত
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-sky-600" />
          এডভান্স
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-red-200 dark:bg-red-900" />
          বকেয়া (Due)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-slate-200 dark:bg-slate-700" />
          আসন্ন
        </span>
      </div>
    </div>
  );
}
