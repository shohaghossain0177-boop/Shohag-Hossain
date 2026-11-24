import { Calendar, CheckCircle2, Copy, MessageCircle, Phone, PlusCircle, Search, XCircle } from 'lucide-react';
import { useMemo, useState } from 'react';
import {
  formatDateBn,
  getDailyPaymentBreakdown,
  getMemberDueAndBlockFund,
  getMemberTotal,
  getTodayISO,
  offsetDateISO,
  toBn,
  toEnDigits,
} from '../data/defaultData';
import type { Member } from '../types/unity';
import { MemberAvatar } from './MemberAvatar';

interface DailyPaymentsViewProps {
  members: Member[];
  isAdmin: boolean;
  bkashNumber?: string;
  onSelectMember: (memberId: number) => void;
  onQuickCollect: (memberId: number, dateISO: string, amount: number) => void;
  onCopyText: (text: string, msg: string) => void;
}

function buildWhatsAppReminderUrl(
  member: Member,
  dateISO: string,
  dueDays: number,
  dueAmount: number,
  bkashNumber: string
): string {
  const digits = toEnDigits(member.phone || '').replace(/\D/g, '');
  const intlPhone = digits.startsWith('88')
    ? digits
    : digits.startsWith('0')
      ? `88${digits}`
      : digits;
  const dueLine =
    dueDays > 1
      ? `আপনার মোট বকেয়া: ${toBn(dueDays)} দিন (৳${toBn(dueAmount)})।`
      : `দৈনিক কিস্তি: ৳১০০।`;
  const msg =
    `আসসালামু আলাইকুম ${member.name} (#${toBn(member.id)}),\n` +
    `BARAKAH MULTICARE HOSPITAL UNITY-এর পক্ষ থেকে বিনীত অনুরোধ—\n` +
    `${formatDateBn(dateISO)} তারিখের দৈনিক ডিপোজিট এখনো জমা হয়নি।\n` +
    `${dueLine}\n` +
    `অনুগ্রহ করে আজ রাত ৮টার মধ্যে নগদ অথবা বিকাশ পার্সোনাল (${bkashNumber}) নম্বরে খরচসহ পরিশোধ করে ট্রানজেকশন আইডি সংরক্ষণ করুন।\n` +
    `ধন্যবাদ।`;
  return `https://wa.me/${intlPhone}?text=${encodeURIComponent(msg)}`;
}

export function DailyPaymentsView({
  members,
  isAdmin,
  bkashNumber = '01303768168',
  onSelectMember,
  onQuickCollect,
  onCopyText,
}: DailyPaymentsViewProps) {
  const todayISO = getTodayISO();
  const [selectedDate, setSelectedDate] = useState<string>(todayISO);
  const [tab, setTab] = useState<'unpaid' | 'paid' | 'all'>('unpaid');
  const [query, setQuery] = useState('');

  // Quick date chips: Tomorrow, Today, Yesterday, plus most recent deposit dates
  const quickDates = useMemo(() => {
    const tomorrowISO = offsetDateISO(todayISO, 1);
    const yesterdayISO = offsetDateISO(todayISO, -1);
    const set = new Set<string>([tomorrowISO, todayISO, yesterdayISO]);
    const depositDates: string[] = [];
    members.forEach((m) =>
      m.deposits.forEach((d) => {
        if (d.date) depositDates.push(d.date);
      })
    );
    depositDates
      .sort((a, b) => b.localeCompare(a))
      .slice(0, 6)
      .forEach((d) => set.add(d));
    return Array.from(set).sort((a, b) => b.localeCompare(a)).slice(0, 6);
  }, [members, todayISO]);

  const breakdown = useMemo(
    () => getDailyPaymentBreakdown(members, selectedDate),
    [members, selectedDate]
  );

  const normalizedQuery = toEnDigits(query.trim()).toLowerCase();

  const filteredPaid = breakdown.paid.filter(({ member }) => {
    if (!normalizedQuery) return true;
    return (
      member.name.toLowerCase().includes(normalizedQuery) ||
      toEnDigits(member.phone).includes(normalizedQuery) ||
      String(member.id) === normalizedQuery
    );
  });

  const filteredUnpaid = breakdown.unpaid.filter((member) => {
    if (!normalizedQuery) return true;
    return (
      member.name.toLowerCase().includes(normalizedQuery) ||
      toEnDigits(member.phone).includes(normalizedQuery) ||
      String(member.id) === normalizedQuery
    );
  });

  const handleCopyUnpaidList = () => {
    const advanceNote =
      breakdown.advanceCount > 0 ? ` (এডভান্সসহ ${toBn(breakdown.advanceCount)} জন)` : '';
    const lines = [
      `BARAKAH MULTICARE HOSPITAL UNITY`,
      `তারিখ: ${formatDateBn(selectedDate)}`,
      `পরিশোধ করেছেন: ${toBn(breakdown.paid.length)} জন${advanceNote}`,
      `নন-পেমেন্টকারী (বাকি): ${toBn(breakdown.unpaid.length)} জন`,
      `────────────────────`,
      ...breakdown.unpaid.map((m, idx) => `${toBn(idx + 1)}. ${m.name} (#${toBn(m.id)}) — ${m.phone}`),
      `────────────────────`,
      `অনুগ্রহ করে রাত ৮টার মধ্যে দৈনিক ডিপোজিট পরিশোধ করুন।`,
    ];
    onCopyText(lines.join('\n'), 'নন-পেমেন্টকারীর তালিকা কপি হয়েছে!');
  };

  return (
    <div className="space-y-5">
      {/* Date Selection & Summary */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              দৈনিক ট্র্যাকার · এডভান্স তারিখ স্বয়ংক্রিয়ভাবে হিসাব হয়
            </p>
            <h2 className="font-display mt-0.5 text-xl font-bold text-slate-900 dark:text-slate-100">
              পেমেন্টকারী ও নন-পেমেন্টকারী ({formatDateBn(selectedDate)})
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <label className="relative flex items-center">
              <Calendar className="pointer-events-none absolute left-3 h-4 w-4 text-slate-400" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value || todayISO)}
                className="h-11 rounded-xl border border-slate-200 bg-slate-50 pr-3 pl-9 text-sm font-semibold text-slate-900 outline-none focus:border-teal-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
            </label>
          </div>
        </div>

        {/* Quick Dates */}
        <div className="mt-3 flex flex-wrap gap-2">
          {quickDates.map((d) => {
            const active = d === selectedDate;
            const label =
              d === todayISO
                ? `আজ (${formatDateBn(d)})`
                : d === offsetDateISO(todayISO, 1)
                  ? `আগামীকাল (${formatDateBn(d)})`
                  : d === offsetDateISO(todayISO, -1)
                    ? `গতকাল (${formatDateBn(d)})`
                    : formatDateBn(d);
            return (
              <button
                key={d}
                type="button"
                onClick={() => setSelectedDate(d)}
                className={`h-9 rounded-lg px-3 text-xs font-semibold transition-colors whitespace-nowrap ${
                  active
                    ? 'bg-teal-700 text-white'
                    : 'border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* Metrics Row */}
        <div className="mt-4 grid grid-cols-3 gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">পেমেন্টকারী</p>
            <p className="font-mono-num mt-0.5 text-xl font-bold text-emerald-700 dark:text-emerald-400">
              {toBn(breakdown.paid.length)} জন
            </p>
            {breakdown.advanceCount > 0 && (
              <p className="text-[11px] font-medium text-teal-700 dark:text-teal-400">
                এডভান্সসহ: {toBn(breakdown.advanceCount)} জন
              </p>
            )}
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">নন-পেমেন্টকারী</p>
            <p className="font-mono-num mt-0.5 text-xl font-bold text-red-600 dark:text-red-400">
              {toBn(breakdown.unpaid.length)} জন
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">তারিখের মোট আদায়</p>
            <p className="font-mono-num mt-0.5 text-xl font-bold text-teal-700 dark:text-teal-400">
              ৳ {toBn(breakdown.totalCollected)}
            </p>
            {breakdown.advanceCreditAmount > 0 && (
              <p className="font-mono-num text-[11px] text-slate-500 dark:text-slate-400">
                + এডভান্স ৳{toBn(breakdown.advanceCreditAmount)}
              </p>
            )}
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-3">
          <div className="mb-1 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>সংগ্রহের হার</span>
            <span className="font-mono-num font-semibold text-slate-900 dark:text-slate-100">
              {toBn(breakdown.ratePercent)}%
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
            <div
              className="h-full rounded-full bg-teal-600 transition-all duration-300"
              style={{ width: `${breakdown.ratePercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Controls: Segmented Tabs + Search + Copy Unpaid */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="grid grid-cols-3 gap-1 rounded-xl bg-slate-200/70 p-1 dark:bg-slate-800">
          <button
            type="button"
            onClick={() => setTab('unpaid')}
            className={`h-10 rounded-lg px-3 text-xs font-semibold transition-colors whitespace-nowrap ${
              tab === 'unpaid'
                ? 'bg-white text-red-700 shadow-xs dark:bg-slate-900 dark:text-red-400'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-300'
            }`}
          >
            বাকি ({toBn(breakdown.unpaid.length)})
          </button>
          <button
            type="button"
            onClick={() => setTab('paid')}
            className={`h-10 rounded-lg px-3 text-xs font-semibold transition-colors whitespace-nowrap ${
              tab === 'paid'
                ? 'bg-white text-emerald-700 shadow-xs dark:bg-slate-900 dark:text-emerald-400'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-300'
            }`}
          >
            পরিশোধ ({toBn(breakdown.paid.length)})
          </button>
          <button
            type="button"
            onClick={() => setTab('all')}
            className={`h-10 rounded-lg px-3 text-xs font-semibold transition-colors whitespace-nowrap ${
              tab === 'all'
                ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-slate-100'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-300'
            }`}
          >
            সকল ({toBn(members.length)})
          </button>
        </div>

        <button
          type="button"
          onClick={handleCopyUnpaidList}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-800 transition-colors hover:bg-slate-50 active:scale-[0.98] whitespace-nowrap dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
        >
          <Copy className="h-4 w-4 text-teal-700 dark:text-teal-400" />
          <span>নন-পেমেন্ট তালিকা কপি করুন</span>
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="নাম, আইডি বা মোবাইল দিয়ে খুঁজুন..."
          className="h-11 w-full rounded-xl border border-slate-200 bg-white pr-4 pl-10 text-sm text-slate-900 outline-none focus:border-teal-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
        />
      </div>

      {/* Unpaid Section */}
      {(tab === 'unpaid' || tab === 'all') && (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-800">
            <h3 className="flex items-center gap-2 text-sm font-bold text-red-700 dark:text-red-400">
              <XCircle className="h-4 w-4" />
              <span>নন-পেমেন্টকারীর তালিকা ({toBn(filteredUnpaid.length)} জন)</span>
            </h3>
            <span className="text-xs text-slate-500 dark:text-slate-400">তারিখ: {formatDateBn(selectedDate)}</span>
          </div>

          {filteredUnpaid.length === 0 ? (
            <div className="p-6 text-center text-sm text-emerald-700 dark:text-emerald-400">
              এই তারিখে কোনো সদস্যের পেমেন্ট বাকি নেই।
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredUnpaid.map((member) => {
                const total = getMemberTotal(member);
                const lastPaid = breakdown.lastPaidThroughMap[member.id];
                const dueInfo = getMemberDueAndBlockFund(member, selectedDate);
                const waHref = buildWhatsAppReminderUrl(
                  member,
                  selectedDate,
                  dueInfo.dueDays,
                  dueInfo.dueAmount,
                  bkashNumber
                );
                return (
                  <div
                    key={member.id}
                    className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-800/40"
                  >
                    <button
                      type="button"
                      onClick={() => onSelectMember(member.id)}
                      className="flex min-w-0 flex-1 items-center gap-3 text-left"
                    >
                      <MemberAvatar
                        memberId={member.id}
                        name={member.name}
                        photoUrl={member.photoUrl}
                        size="sm"
                        tone="red"
                        showIdBadge
                      />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                          {member.name}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {member.phone} · মোট জমা: ৳ {toBn(total)}
                        </p>
                        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px]">
                          {dueInfo.dueDays > 0 && (
                            <span className="font-semibold text-red-600 dark:text-red-400">
                              বকেয়া: {toBn(dueInfo.dueDays)} দিন (৳{toBn(dueInfo.dueAmount)})
                            </span>
                          )}
                          {lastPaid && lastPaid < selectedDate && (
                            <span className="font-medium text-amber-700 dark:text-amber-400">
                              · সর্বশেষ পেইড: {formatDateBn(lastPaid)}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>

                    <div className="flex shrink-0 items-center gap-1.5">
                      <a
                        href={waHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`${member.name}-কে WhatsApp রিমাইন্ডার পাঠান`}
                        title="WhatsApp রিমাইন্ডার পাঠান"
                        className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 transition-colors hover:bg-emerald-100 dark:border-emerald-900/60 dark:bg-emerald-950/50 dark:text-emerald-400"
                      >
                        <MessageCircle className="h-4 w-4" />
                      </a>
                      <a
                        href={`tel:${member.phone}`}
                        aria-label={`${member.name}-কে কল করুন`}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                      >
                        <Phone className="h-4 w-4" />
                      </a>
                      {isAdmin && (
                        <button
                          type="button"
                          onClick={() => onQuickCollect(member.id, selectedDate, 100)}
                          className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-teal-700 px-3 text-xs font-semibold text-white transition-colors hover:bg-teal-800 active:scale-[0.98] whitespace-nowrap"
                        >
                          <PlusCircle className="h-3.5 w-3.5" />
                          <span>৳১০০ নিন</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Paid Section */}
      {(tab === 'paid' || tab === 'all') && (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-800">
            <h3 className="flex items-center gap-2 text-sm font-bold text-emerald-700 dark:text-emerald-400">
              <CheckCircle2 className="h-4 w-4" />
              <span>পেমেন্টকারীর তালিকা ({toBn(filteredPaid.length)} জন)</span>
            </h3>
            <span className="font-mono-num text-xs font-semibold text-emerald-700 dark:text-emerald-400">
              মোট: ৳ {toBn(breakdown.totalCollected)}
            </span>
          </div>

          {filteredPaid.length === 0 ? (
            <div className="p-6 text-center text-sm text-slate-500 dark:text-slate-400">
              এই তারিখে এখনো কোনো পেমেন্ট এন্ট্রি হয়নি।
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredPaid.map(
                ({
                  member,
                  amount,
                  directAmount,
                  isAdvance,
                  isCarriedFromAdvance,
                  paidThroughDate,
                  remainingAdvanceDays,
                  sourceDate,
                  notes,
                }) => {
                  const statusSubtext = isCarriedFromAdvance
                    ? remainingAdvanceDays > 0
                      ? `এডভান্স · ${formatDateBn(paidThroughDate)} পর্যন্ত`
                      : `এডভান্স সম্পন্ন (${formatDateBn(sourceDate)} হতে)`
                    : remainingAdvanceDays > 0
                      ? `এডভান্স · ${formatDateBn(paidThroughDate)} পর্যন্ত`
                      : 'পরিশোধিত';

                  return (
                    <button
                      key={member.id}
                      type="button"
                      onClick={() => onSelectMember(member.id)}
                      className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-800/40"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <MemberAvatar
                          memberId={member.id}
                          name={member.name}
                          photoUrl={member.photoUrl}
                          size="sm"
                          tone="emerald"
                          showIdBadge
                        />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                            {member.name}
                          </p>
                          <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                            {member.phone} · {notes[0] || 'দৈনিক কিস্তি'}
                          </p>
                          {isAdvance && (
                            <p className="mt-0.5 text-[11px] font-semibold text-teal-700 dark:text-teal-400">
                              {remainingAdvanceDays > 0
                                ? `এডভান্স পেইড: ${formatDateBn(paidThroughDate)} পর্যন্ত (+${toBn(remainingAdvanceDays)} দিন)`
                                : `এডভান্সের শেষ দিন: ${formatDateBn(paidThroughDate)}`}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="font-mono-num text-sm font-bold text-emerald-700 dark:text-emerald-400">
                          ৳ {toBn(directAmount > 0 ? directAmount : amount)}
                        </p>
                        <p
                          className={`text-[11px] ${
                            isAdvance
                              ? 'font-medium text-teal-700 dark:text-teal-400'
                              : 'text-slate-500 dark:text-slate-400'
                          }`}
                        >
                          {statusSubtext}
                        </p>
                      </div>
                    </button>
                  );
                }
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
