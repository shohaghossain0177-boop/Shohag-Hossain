import { CheckCircle2, Clock, Copy, FileSpreadsheet, Phone, Plus, Send, Trash2, XCircle } from 'lucide-react';
import { useMemo, useState } from 'react';
import {
  formatDateBn,
  getGlobalDueAndBlockFund,
  getGlobalStats,
  getMemberInstallments,
  getMemberTotal,
  getTodayISO,
  toBn,
} from '../data/defaultData';
import type { CustomToggle, PaymentRequest, UnityDatabase } from '../types/unity';
import { LuckyDrawWheel } from './LuckyDrawWheel';

interface KistiViewProps {
  db: UnityDatabase;
  onSelectMember: (id: number) => void;
}

export function KistiView({ db, onSelectMember }: KistiViewProps) {
  const stats = getGlobalStats(db);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-teal-700 p-5 text-white dark:bg-teal-800">
        <div>
          <p className="text-xs text-teal-100">সর্বমোট জমাকৃত কিস্তি (১০০৳ হিসেবে)</p>
          <p className="font-mono-num mt-1 text-2xl font-bold">{toBn(stats.totalKisti)} টি কিস্তি</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-teal-100">মোট এন্ট্রি</p>
          <p className="font-mono-num mt-1 text-xl font-bold">{toBn(stats.totalDepositsCount)} বার</p>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="border-b border-slate-100 px-5 py-4 dark:border-slate-800">
          <h2 className="font-display text-base font-bold text-slate-900 dark:text-slate-100">
            সদস্য ভিত্তিক কিস্তির তালিকা
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50 text-xs font-semibold text-slate-500 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-400">
                <th className="px-4 py-3">নং</th>
                <th className="px-4 py-3">সদস্যের নাম</th>
                <th className="px-4 py-3 text-right">কিস্তি</th>
                <th className="px-4 py-3 text-right">মোট টাকা</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {db.members.map((m) => (
                <tr
                  key={m.id}
                  onClick={() => onSelectMember(m.id)}
                  className="cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50"
                >
                  <td className="font-mono-num px-4 py-3 text-slate-500">{toBn(m.id)}</td>
                  <td className="px-4 py-3 font-semibold text-slate-900 dark:text-slate-100">{m.name}</td>
                  <td className="font-mono-num px-4 py-3 text-right text-slate-700 dark:text-slate-300">
                    {toBn(getMemberInstallments(m))} টি
                  </td>
                  <td className="font-mono-num px-4 py-3 text-right font-bold text-teal-700 dark:text-teal-400">
                    ৳ {toBn(getMemberTotal(m))}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-teal-600/30 bg-teal-50/70 font-bold text-teal-900 dark:bg-teal-950/40 dark:text-teal-200">
                <td colSpan={2} className="px-4 py-3.5">
                  সর্বমোট
                </td>
                <td className="font-mono-num px-4 py-3.5 text-right">{toBn(stats.totalKisti)} টি</td>
                <td className="font-mono-num px-4 py-3.5 text-right">৳ {toBn(stats.totalFund)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}

interface DrawsViewProps {
  db: UnityDatabase;
  isAdmin: boolean;
  canManageDraws?: boolean;
  onAddDraw: (memberId: number, date: string, amount: number, note: string) => void;
  onDeleteDraw: (drawId: string) => void;
}

export function DrawsView({
  db,
  isAdmin,
  canManageDraws = isAdmin,
  onAddDraw,
  onDeleteDraw,
}: DrawsViewProps) {
  const [memberId, setMemberId] = useState<number>(db.members[0]?.id || 1);
  const [date, setDate] = useState(getTodayISO());
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');

  const sortedDraws = [...db.draws].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  const totalDrawAmt = sortedDraws.reduce((s, d) => s + Number(d.amount || 0), 0);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-amber-700 p-5 text-white dark:bg-amber-800">
        <div>
          <p className="text-xs text-amber-100">মোট ড্র পেয়েছেন</p>
          <p className="font-mono-num mt-1 text-2xl font-bold">{toBn(sortedDraws.length)} জন</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-amber-100">মোট ড্র প্রদান</p>
          <p className="font-mono-num mt-1 text-xl font-bold">৳ {toBn(totalDrawAmt)}</p>
        </div>
      </div>

      {/* Interactive Digital Lucky Draw Spinner Wheel */}
      <LuckyDrawWheel
        members={db.members}
        draws={db.draws}
        canSaveDraw={canManageDraws}
        onSaveWinner={onAddDraw}
      />

      {canManageDraws && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="font-display text-base font-bold text-slate-900 dark:text-slate-100">
            ড্র বিজয়ী যুক্ত করুন ({isAdmin ? 'এডমিন' : 'ক্যাশিয়ার'})
          </h2>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">
                সদস্য নির্বাচন করুন
              </label>
              <select
                value={memberId}
                onChange={(e) => setMemberId(Number(e.target.value))}
                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm dark:border-slate-700 dark:bg-slate-800"
              >
                {db.members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {toBn(m.id)}. {m.name} ({m.phone})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">
                ড্র-এর তারিখ
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm dark:border-slate-700 dark:bg-slate-800"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">
                ড্র-এর টাকার পরিমাণ
              </label>
              <input
                type="number"
                inputMode="numeric"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="যেমন: 36000"
                className="font-mono-num h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm dark:border-slate-700 dark:bg-slate-800"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">
                মন্তব্য (ঐচ্ছিক)
              </label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="যেমন: ১ম ড্র বিজয়ী"
                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm dark:border-slate-700 dark:bg-slate-800"
              />
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              onAddDraw(memberId, date, Number(amount || 0), note.trim());
              setAmount('');
              setNote('');
            }}
            className="mt-4 h-11 w-full rounded-xl bg-teal-700 text-sm font-semibold text-white hover:bg-teal-800 sm:w-auto sm:px-6"
          >
            ড্র বিজয়ী সেভ করুন
          </button>
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="border-b border-slate-100 px-5 py-4 dark:border-slate-800">
          <h3 className="font-display text-base font-bold text-slate-900 dark:text-slate-100">
            ড্র পাওয়া ব্যক্তিদের তালিকা
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50 text-xs font-semibold text-slate-500 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-400">
                <th className="px-4 py-3">নং</th>
                <th className="px-4 py-3">বিজয়ী ও তারিখ</th>
                <th className="px-4 py-3 text-right">টাকা</th>
                {isAdmin && <th className="px-4 py-3 text-right">অ্যাকশন</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {sortedDraws.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 4 : 3} className="px-4 py-8 text-center text-slate-500">
                    এখনো কেউ ড্র পায়নি। সবার সম্মতিতে ড্র অনুষ্ঠিত হবে।
                  </td>
                </tr>
              ) : (
                sortedDraws.map((d, idx) => (
                  <tr key={d.id}>
                    <td className="font-mono-num px-4 py-3 text-slate-500">{toBn(idx + 1)}</td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-900 dark:text-slate-100">{d.memberName}</p>
                      <p className="text-xs text-slate-500">
                        {formatDateBn(d.date)} {d.note ? `· ${d.note}` : ''}
                      </p>
                    </td>
                    <td className="font-mono-num px-4 py-3 text-right font-bold text-amber-700 dark:text-amber-400">
                      ৳ {toBn(d.amount)}
                    </td>
                    {isAdmin && (
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => onDeleteDraw(d.id)}
                          className="inline-flex h-8 items-center gap-1 rounded-lg bg-red-50 px-2.5 text-xs font-semibold text-red-700 hover:bg-red-100 dark:bg-red-950/40 dark:text-red-300"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          <span>মুছুন</span>
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

interface FundViewProps {
  db: UnityDatabase;
  onSelectMember: (id: number) => void;
  onOpenReports?: () => void;
}

export function FundView({ db, onSelectMember, onOpenReports }: FundViewProps) {
  const stats = getGlobalStats(db);
  const todayISO = getTodayISO();
  const dueBlock = useMemo(() => getGlobalDueAndBlockFund(db, todayISO), [db, todayISO]);
  const blockProgressPct =
    dueBlock.targetBlockFund > 0
      ? Math.min(100, Math.round((dueBlock.totalBlockFund / dueBlock.targetBlockFund) * 100))
      : 0;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-sky-700 p-5 text-white dark:bg-sky-800">
        <div>
          <p className="text-xs text-sky-100">সর্বমোট জমাকৃত ফান্ড</p>
          <p className="font-mono-num mt-1 text-2xl font-bold">৳ {toBn(stats.totalFund)}</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="text-right">
            <p className="text-xs text-sky-100">মোট সদস্য</p>
            <p className="font-mono-num text-lg font-bold">{toBn(db.members.length)} জন</p>
          </div>
          {onOpenReports && (
            <button
              type="button"
              onClick={onOpenReports}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-white/15 px-3 text-xs font-semibold text-white hover:bg-white/25"
            >
              <FileSpreadsheet className="h-3.5 w-3.5" />
              <span>মাসিক রিপোর্ট ও CSV</span>
            </button>
          )}
        </div>
      </div>

      {/* Core Fund, Draw, Block Fund & Auto Due Grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs text-slate-500 dark:text-slate-400">১ম মাসের ব্লক ফান্ড</p>
          <p className="font-mono-num mt-1 text-lg font-bold text-indigo-700 dark:text-indigo-400">
            ৳ {toBn(dueBlock.totalBlockFund)}
          </p>
          <p className="mt-0.5 text-[11px] text-slate-500">
            {toBn(blockProgressPct)}% পূর্ণ (লক্ষ্য ৳{toBn(dueBlock.targetBlockFund)})
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs text-slate-500 dark:text-slate-400">ড্র-এর ফ্রি ফান্ড</p>
          <p className="font-mono-num mt-1 text-lg font-bold text-teal-700 dark:text-teal-400">
            ৳ {toBn(dueBlock.availableDrawFund)}
          </p>
          <p className="mt-0.5 text-[11px] text-slate-500">ব্লক ও ড্র বাদে অবশিষ্ট</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs text-slate-500 dark:text-slate-400">সর্বমোট বকেয়া (Due)</p>
          <p className="font-mono-num mt-1 text-lg font-bold text-red-600 dark:text-red-400">
            ৳ {toBn(dueBlock.totalDueAmount)}
          </p>
          <p className="mt-0.5 text-[11px] text-slate-500">
            {toBn(dueBlock.membersWithDueCount)} জন সদস্যের বাকি
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs text-slate-500 dark:text-slate-400">হাতে নিট ফান্ড</p>
          <p className="font-mono-num mt-1 text-lg font-bold text-emerald-700 dark:text-emerald-400">
            ৳ {toBn(stats.netBalance)}
          </p>
          <p className="mt-0.5 text-[11px] text-slate-500">
            ড্র প্রদান: ৳ {toBn(stats.totalDrawAmount)}
          </p>
        </div>
      </div>

      {/* 1st-Month Block Fund Progress */}
      <div className="rounded-2xl border border-indigo-200/80 bg-white p-4 dark:border-indigo-900/50 dark:bg-slate-900">
        <div className="flex items-center justify-between text-xs font-semibold">
          <span className="text-indigo-800 dark:text-indigo-300">
            নিয়ম ৪: প্রথম ১ মাসের ব্লক ফান্ড প্রগ্রেস (প্রতি সদস্য ৳৩,০০০)
          </span>
          <span className="font-mono-num text-indigo-700 dark:text-indigo-400">
            {toBn(blockProgressPct)}%
          </span>
        </div>
        <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-indigo-100 dark:bg-indigo-950/60">
          <div
            className="h-full rounded-full bg-indigo-600 transition-all"
            style={{ width: `${blockProgressPct}%` }}
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="border-b border-slate-100 px-5 py-4 dark:border-slate-800">
          <h2 className="font-display text-base font-bold text-slate-900 dark:text-slate-100">
            সদস্য অনুযায়ী ফান্ড, ব্লক ফান্ড ও বকেয়া হিসাব
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50 text-[11px] font-semibold text-slate-500 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-400">
                <th className="px-3.5 py-3">নং</th>
                <th className="px-3.5 py-3">সদস্য</th>
                <th className="px-3.5 py-3 text-right">মোট জমা</th>
                <th className="px-3.5 py-3 text-right">ব্লক ফান্ড</th>
                <th className="px-3.5 py-3 text-right">বকেয়া (Due)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {db.members.map((m) => {
                const info = dueBlock.perMember[m.id];
                return (
                  <tr
                    key={m.id}
                    onClick={() => onSelectMember(m.id)}
                    className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  >
                    <td className="font-mono-num px-3.5 py-3 text-slate-500">{toBn(m.id)}</td>
                    <td className="px-3.5 py-3 font-semibold text-slate-900 dark:text-slate-100">
                      {m.name}
                    </td>
                    <td className="font-mono-num px-3.5 py-3 text-right font-bold text-sky-700 dark:text-sky-400">
                      ৳ {toBn(getMemberTotal(m))}
                    </td>
                    <td className="font-mono-num px-3.5 py-3 text-right text-indigo-700 dark:text-indigo-400">
                      ৳ {toBn(info?.blockFundAmount || 0)}
                    </td>
                    <td
                      className={`font-mono-num px-3.5 py-3 text-right font-semibold ${
                        (info?.dueAmount || 0) > 0
                          ? 'text-red-600 dark:text-red-400'
                          : 'text-emerald-700 dark:text-emerald-400'
                      }`}
                    >
                      {(info?.dueAmount || 0) > 0 ? `৳ ${toBn(info.dueAmount)}` : 'পেইড'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-teal-600/30 bg-teal-50/70 font-bold text-teal-900 dark:bg-teal-950/40 dark:text-teal-200">
                <td colSpan={2} className="px-3.5 py-3.5">
                  সর্বমোট ফান্ড
                </td>
                <td className="font-mono-num px-3.5 py-3.5 text-right">৳ {toBn(stats.totalFund)}</td>
                <td className="font-mono-num px-3.5 py-3.5 text-right">
                  ৳ {toBn(dueBlock.totalBlockFund)}
                </td>
                <td className="font-mono-num px-3.5 py-3.5 text-right text-red-700 dark:text-red-300">
                  ৳ {toBn(dueBlock.totalDueAmount)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}

interface PaymentViewProps {
  db: UnityDatabase;
  paymentRequests?: PaymentRequest[];
  onSubmitPaymentRequest?: (payload: {
    memberId: number;
    senderPhone: string;
    trxId: string;
    amount: number;
    date: string;
    note: string;
  }) => Promise<{ ok: boolean; error?: string }>;
  onCopyText: (text: string, msg: string) => void;
}

export function PaymentView({
  db,
  paymentRequests = [],
  onSubmitPaymentRequest,
  onCopyText,
}: PaymentViewProps) {
  const [method, setMethod] = useState<'nagad' | 'bkash'>('bkash');
  const bkashNo = db.appConfig.bkashNumber || '01303768168';
  const adminPhone = db.appConfig.adminPhone || '01607703566';

  // Member bKash Payment Request Form state
  const [reqMemberId, setReqMemberId] = useState<number>(db.members[0]?.id || 1);
  const [reqSenderPhone, setReqSenderPhone] = useState('');
  const [reqTrxId, setReqTrxId] = useState('');
  const [reqAmount, setReqAmount] = useState('500');
  const [reqDate, setReqDate] = useState(getTodayISO());
  const [reqNote, setReqNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  const handleSubmitBkashRequest = async () => {
    if (!onSubmitPaymentRequest) return;
    setFormError('');
    setFormSuccess('');
    setSubmitting(true);
    try {
      const res = await onSubmitPaymentRequest({
        memberId: reqMemberId,
        senderPhone: reqSenderPhone.trim(),
        trxId: reqTrxId.trim(),
        amount: Number(reqAmount) || 0,
        date: reqDate,
        note: reqNote.trim(),
      });
      if (!res.ok) {
        setFormError(res.error || 'রিকোয়েস্ট জমা দেওয়া যায়নি');
      } else {
        setFormSuccess('আপনার বিকাশ পেমেন্ট রিকোয়েস্ট জমা হয়েছে! এডমিন/ক্যাশিয়ার যাচাই করে অনুমোদন করবেন।');
        setReqTrxId('');
        setReqNote('');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => setMethod('bkash')}
          className={`rounded-2xl border p-4 text-left transition-colors ${
            method === 'bkash'
              ? 'border-pink-500 bg-pink-50/80 dark:border-pink-600 dark:bg-pink-950/30'
              : 'border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900'
          }`}
        >
          <p className="font-display text-base font-bold text-pink-700 dark:text-pink-400">
            বিকাশ - পার্সোনাল
          </p>
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
            Send Money ও পেমেন্ট রিকোয়েস্ট
          </p>
        </button>

        <button
          type="button"
          onClick={() => setMethod('nagad')}
          className={`rounded-2xl border p-4 text-left transition-colors ${
            method === 'nagad'
              ? 'border-teal-600 bg-teal-50/80 dark:border-teal-500 dark:bg-teal-950/30'
              : 'border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900'
          }`}
        >
          <p className="font-display text-base font-bold text-teal-800 dark:text-teal-300">
            নগদ (ডিরেক্ট জমাদান)
          </p>
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
            সরাসরি এডমিনের হাতে জমা
          </p>
        </button>
      </div>

      {method === 'bkash' ? (
        <div className="space-y-4">
          {/* bKash Marquee */}
          <div className="flex items-center overflow-hidden rounded-xl bg-pink-700 py-2 text-white">
            <span className="shrink-0 bg-black/25 px-3 py-0.5 text-xs font-bold text-amber-200">
              শর্ত
            </span>
            <div className="flex-1 overflow-hidden whitespace-nowrap">
              <div className="animate-barakah-marquee text-xs font-semibold sm:text-sm">
                {db.appConfig.bkashTickerText || 'দয়া করে সর্বনিম্ন ৫টি ডিপোজিট ও খরচ সহ বিকাশ করুন'}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-pink-200 bg-white p-6 text-center dark:border-pink-900/50 dark:bg-slate-900">
            <div className="mx-auto mb-2 flex justify-center">
              <svg width="116" height="44" viewBox="0 0 180 70" fill="none" aria-label="bKash">
                <g transform="translate(8,6)">
                  <polygon points="28,4 48,20 34,34 18,22" fill="#E2136E" />
                  <polygon points="18,22 34,34 22,52 6,36" fill="#C10C5B" />
                  <polygon points="34,34 56,28 46,48 22,52" fill="#F04393" />
                  <polygon points="48,20 62,14 56,28 34,34" fill="#9E0B4B" />
                </g>
                <text x="76" y="45" fill="#E2136E" fontFamily="sans-serif" fontSize="28" fontWeight="900">
                  bKash
                </text>
              </svg>
            </div>
            <p className="text-xs font-semibold text-pink-700 dark:text-pink-400">
              বিকাশ পার্সোনাল নাম্বার · Send Money
            </p>
            <button
              type="button"
              onClick={() => onCopyText(bkashNo, `বিকাশ নাম্বার ${bkashNo} কপি হয়েছে!`)}
              className="font-mono-num my-4 inline-flex items-center gap-2 rounded-xl border-2 border-dashed border-pink-500 bg-pink-50/70 px-6 py-3 text-2xl font-bold tracking-wider text-pink-700 dark:bg-pink-950/30 dark:text-pink-300"
            >
              {bkashNo}
            </button>

            <div className="mx-auto max-w-sm">
              <button
                type="button"
                onClick={() => onCopyText(bkashNo, `বিকাশ নাম্বার ${bkashNo} কপি হয়েছে!`)}
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-pink-700 px-4 text-sm font-semibold text-white transition-colors hover:bg-pink-800 active:scale-[0.98]"
              >
                <Copy className="h-4 w-4" />
                <span>নাম্বার কপি করুন ({bkashNo})</span>
              </button>
            </div>

            <p className="mx-auto mt-4 max-w-md text-xs leading-relaxed text-slate-600 dark:text-slate-400">
              টাকা পাঠানোর পর নিচের ফর্মে আপনার TrxID জমা দিন। এডমিন বা ক্যাশিয়ার যাচাই করে অনুমোদন করলে
              সাথে সাথেই আপনার হিসাবে যুক্ত হয়ে যাবে।
            </p>
          </div>

          {/* Member bKash Payment Request Form */}
          {onSubmitPaymentRequest && (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
              <h3 className="font-display text-base font-bold text-slate-900 dark:text-slate-100">
                বিকাশ পেমেন্ট রিকোয়েস্ট জমা দিন
              </h3>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                Send Money করার পর নিচের তথ্য পূরণ করে পাঠান
              </p>

              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">
                    সদস্য নির্বাচন করুন
                  </label>
                  <select
                    value={reqMemberId}
                    onChange={(e) => setReqMemberId(Number(e.target.value))}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm dark:border-slate-700 dark:bg-slate-800"
                  >
                    {db.members.map((m) => (
                      <option key={m.id} value={m.id}>
                        #{toBn(m.id)} {m.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">
                    যে নম্বর থেকে বিকাশ করেছেন
                  </label>
                  <input
                    type="tel"
                    inputMode="tel"
                    value={reqSenderPhone}
                    onChange={(e) => setReqSenderPhone(e.target.value)}
                    placeholder="01XXXXXXXXX"
                    className="font-mono-num h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm dark:border-slate-700 dark:bg-slate-800"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">
                    বিকাশ ট্রানজেকশন আইডি (TrxID)
                  </label>
                  <input
                    type="text"
                    value={reqTrxId}
                    onChange={(e) => setReqTrxId(e.target.value.toUpperCase())}
                    placeholder="যেমন: BKA7X92M1P"
                    className="font-mono-num h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm uppercase dark:border-slate-700 dark:bg-slate-800"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">
                      টাকার পরিমাণ
                    </label>
                    <input
                      type="number"
                      min="100"
                      step="100"
                      inputMode="numeric"
                      value={reqAmount}
                      onChange={(e) => setReqAmount(e.target.value)}
                      className="font-mono-num h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm dark:border-slate-700 dark:bg-slate-800"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">
                      তারিখ
                    </label>
                    <input
                      type="date"
                      value={reqDate}
                      onChange={(e) => setReqDate(e.target.value)}
                      className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-2.5 text-xs dark:border-slate-700 dark:bg-slate-800"
                    />
                  </div>
                </div>
              </div>

              <div className="mt-3">
                <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">
                  মন্তব্য (ঐচ্ছিক)
                </label>
                <input
                  type="text"
                  value={reqNote}
                  onChange={(e) => setReqNote(e.target.value)}
                  placeholder="যেমন: ৫ দিনের অগ্রিম কিস্তি"
                  className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm dark:border-slate-700 dark:bg-slate-800"
                />
              </div>

              {formError && <p className="mt-2.5 text-xs font-semibold text-red-600">{formError}</p>}
              {formSuccess && (
                <p className="mt-2.5 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                  {formSuccess}
                </p>
              )}

              <button
                type="button"
                disabled={submitting}
                onClick={() => void handleSubmitBkashRequest()}
                className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-pink-700 text-sm font-semibold text-white transition-colors hover:bg-pink-800 disabled:opacity-60"
              >
                <Send className="h-4 w-4" />
                <span>{submitting ? 'জমা হচ্ছে...' : 'পেমেন্ট রিকোয়েস্ট পাঠান'}</span>
              </button>
            </div>
          )}

          {/* Recent Payment Requests Status Feed */}
          {paymentRequests.length > 0 && (
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
              <div className="border-b border-slate-100 px-4 py-3 dark:border-slate-800">
                <h4 className="font-display text-sm font-bold text-slate-900 dark:text-slate-100">
                  সাম্প্রতিক বিকাশ রিকোয়েস্ট স্ট্যাটাস ({toBn(paymentRequests.length)}টি)
                </h4>
              </div>
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {paymentRequests.slice(0, 10).map((req) => (
                  <div key={req.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-xs">
                    <div className="min-w-0">
                      <p className="font-bold text-slate-900 dark:text-slate-100">
                        #{toBn(req.memberId)} {req.memberName} · ৳ {toBn(req.amount)}
                      </p>
                      <p className="font-mono-num text-[11px] text-slate-500 dark:text-slate-400">
                        TrxID: {req.trxId} · তারিখ: {formatDateBn(req.date)}
                      </p>
                    </div>
                    {req.status === 'approved' ? (
                      <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1 font-semibold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                        <CheckCircle2 className="h-3.5 w-3.5" /> অনুমোদিত
                      </span>
                    ) : req.status === 'rejected' ? (
                      <span className="inline-flex items-center gap-1 rounded-lg bg-red-50 px-2.5 py-1 font-semibold text-red-700 dark:bg-red-950/50 dark:text-red-300">
                        <XCircle className="h-3.5 w-3.5" /> বাতিল
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-lg bg-amber-50 px-2.5 py-1 font-semibold text-amber-800 dark:bg-amber-950/50 dark:text-amber-300">
                        <Clock className="h-3.5 w-3.5" /> যাচাইাধীন
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="font-display text-lg font-bold text-slate-900 dark:text-slate-100">
            নগদ (ডিরেক্ট জমাদান)
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            সরাসরি এডমিনের হাতে দৈনিক কিস্তি জমা দিন। টাকা জমা দেওয়ার সাথে সাথেই এডমিন আপনার নামে
            হিসাব পাবলিক রেকর্ডে আপডেট করে দেবেন।
          </p>
          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/50">
            <p className="text-xs text-slate-500 dark:text-slate-400">এডমিন যোগাযোগ (২৪/৭ সাপোর্ট)</p>
            <p className="mt-1 text-base font-bold text-slate-900 dark:text-slate-100">
              এডমিন {db.adminName || 'Shohag Hossain'}
            </p>
            <p className="font-mono-num mt-0.5 text-sm font-semibold text-teal-700 dark:text-teal-400">
              {adminPhone}
            </p>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <a
              href={`tel:${adminPhone}`}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-teal-700 text-sm font-semibold text-white hover:bg-teal-800"
            >
              <Phone className="h-4 w-4" />
              <span>কল করুন</span>
            </a>
            <button
              type="button"
              onClick={() => onCopyText(adminPhone, 'এডমিনের নাম্বার কপি হয়েছে!')}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200"
            >
              <Copy className="h-4 w-4" />
              <span>নাম্বার কপি</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

interface AddMemberViewProps {
  nextId: number;
  onAddMember: (name: string, phone: string) => void;
}

export function AddMemberView({ nextId, onAddMember }: AddMemberViewProps) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');

  return (
    <div className="mx-auto max-w-lg rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <p className="font-mono-num text-xs font-medium text-teal-700 dark:text-teal-400">
        পরবর্তী সিরিয়াল আইডি #{toBn(nextId)}
      </p>
      <h2 className="font-display mt-1 text-lg font-bold text-slate-900 dark:text-slate-100">
        নতুন সদস্য যুক্ত করুন
      </h2>
      <div className="mt-4 space-y-3.5">
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">
            সদস্যের পূর্ণ নাম
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="নাম লিখুন"
            className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-sm dark:border-slate-700 dark:bg-slate-800"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">
            মোবাইল নম্বর
          </label>
          <input
            type="tel"
            inputMode="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="01XXXXXXXXX"
            className="font-mono-num h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-sm dark:border-slate-700 dark:bg-slate-800"
          />
        </div>
        <button
          type="button"
          onClick={() => {
            if (!name.trim() || !phone.trim()) return;
            onAddMember(name.trim(), phone.trim());
          }}
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-teal-700 text-sm font-semibold text-white hover:bg-teal-800"
        >
          <Plus className="h-4 w-4" />
          <span>সদস্য যুক্ত করুন</span>
        </button>
      </div>
    </div>
  );
}

interface CustomToggleDetailViewProps {
  toggle: CustomToggle;
  onCopyText: (text: string, msg: string) => void;
}

export function CustomToggleDetailView({ toggle, onCopyText }: CustomToggleDetailViewProps) {
  return (
    <div className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
      <p className="text-xs font-medium text-teal-700 dark:text-teal-400">
        BARAKAH UNITY · কাস্টম তথ্য
      </p>
      <h2 className="font-display mt-1 text-xl font-bold text-slate-900 dark:text-slate-100">
        {toggle.title}
      </h2>
      {toggle.subtitle && (
        <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">
          {toggle.subtitle}
        </p>
      )}
      <div className="mt-4 whitespace-pre-line border-t border-slate-100 pt-4 text-sm leading-relaxed text-slate-700 dark:border-slate-800 dark:text-slate-200">
        {toggle.content}
      </div>

      {toggle.contactPhone && (
        <div className="mt-5 flex gap-3">
          <a
            href={`tel:${toggle.contactPhone}`}
            className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-teal-700 text-sm font-semibold text-white hover:bg-teal-800"
          >
            <Phone className="h-4 w-4" />
            <span>কল করুন ({toggle.contactPhone})</span>
          </a>
          <button
            type="button"
            onClick={() => onCopyText(toggle.contactPhone!, 'নম্বর কপি হয়েছে!')}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-200"
          >
            <Copy className="h-4 w-4" />
            <span>কপি</span>
          </button>
        </div>
      )}
    </div>
  );
}
