import {
  Camera,
  Check,
  CheckCircle2,
  Download,
  Edit3,
  FileDown,
  FileText,
  MessageCircle,
  Phone,
  Printer,
  Share2,
  ShieldCheck,
  Trash2,
  X,
} from 'lucide-react';
import { useState } from 'react';
import {
  BLOCK_FUND_PER_MEMBER_CAP,
  DAILY_KISTI_AMOUNT,
  daysBetweenISO,
  formatDateBn,
  getDatesInRange,
  getMemberAdvanceCoverage,
  getMemberDueAndBlockFund,
  getMemberInstallments,
  getMemberTotal,
  getTodayISO,
  offsetDateISO,
  toBn,
  toEnDigits,
} from '../data/defaultData';
import type { Deposit, Member } from '../types/unity';
import {
  buildReceiptShareText,
  downloadReceiptHtml,
  downloadReceiptPng,
  generateReceiptNumber,
  generateReceiptPngBlob,
  printReceiptReliably,
} from '../utils/receiptGenerator';
import { MemberAvatar } from './MemberAvatar';
import { MemberCalendar } from './MemberCalendar';
import { ProfilePhotoModal } from './ProfilePhotoModal';

interface MemberDetailViewProps {
  member: Member;
  allMembers?: Member[];
  adminName?: string;
  appLogoUrl?: string;
  isAdmin: boolean;
  canCollect?: boolean;
  onAddDeposit: (memberId: number, date: string, amount: number, note: string) => void;
  onAddRangeDeposit: (
    memberId: number,
    startISO: string,
    endISO: string,
    amount: number,
    note: string,
    skipDuplicates: boolean
  ) => void;
  onDeleteDeposit: (memberId: number, depositId: string) => void;
  onEditMember: (payload: {
    oldId: number;
    newId: number;
    name: string;
    phone: string;
    swapIfTaken?: boolean;
  }) => Promise<{ ok: boolean; error?: string }>;
  onDeleteMember: (memberId: number) => void;
  onUpdateMemberPhoto: (
    memberId: number,
    photoUrl: string,
    memberPhone?: string
  ) => Promise<{ ok: boolean; error?: string }>;
  onNotify?: (msg: string) => void;
  onCopyText?: (text: string, msg: string) => void;
}

export function MemberDetailView({
  member,
  allMembers = [],
  adminName = 'Shohag Hossain',
  appLogoUrl,
  isAdmin,
  canCollect = isAdmin,
  onAddDeposit,
  onAddRangeDeposit,
  onDeleteDeposit,
  onEditMember,
  onDeleteMember,
  onUpdateMemberPhoto,
  onNotify,
  onCopyText,
}: MemberDetailViewProps) {
  const [depositMode, setDepositMode] = useState<'single' | 'range'>('single');
  const [singleDate, setSingleDate] = useState(getTodayISO());
  const [singleAmount, setSingleAmount] = useState('100');
  const [singleNote, setSingleNote] = useState('দৈনিক কিস্তি');

  const [rangeStart, setRangeStart] = useState('2026-11-22');
  const [rangeEnd, setRangeEnd] = useState('2026-11-29');
  const [rangeAmount, setRangeAmount] = useState('100');
  const [rangeNote, setRangeNote] = useState('দৈনিক কিস্তি');
  const [skipDup, setSkipDup] = useState(true);

  const [editingInfo, setEditingInfo] = useState(false);
  const [editIdInput, setEditIdInput] = useState(String(member.id));
  const [editName, setEditName] = useState(member.name);
  const [editPhone, setEditPhone] = useState(member.phone);
  const [editSwapIfTaken, setEditSwapIfTaken] = useState(true);
  const [editBusy, setEditBusy] = useState(false);
  const [editError, setEditError] = useState('');

  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [selectedDeposit, setSelectedDeposit] = useState<Deposit | null>(null);
  const [photoModalOpen, setPhotoModalOpen] = useState(false);
  const [busyAction, setBusyAction] = useState<'png' | 'share' | null>(null);
  const [receiptFeedback, setReceiptFeedback] = useState<{
    action: 'pdf' | 'html' | 'png' | 'share';
    statusLabel: string;
    detail: string;
    timeLabel: string;
    targetKey: string;
  } | null>(null);
  const [savedReceiptKeys, setSavedReceiptKeys] = useState<Record<string, 'Downloaded' | 'Saved'>>({});

  const total = getMemberTotal(member);
  const kisti = getMemberInstallments(member);
  const todayISO = getTodayISO();
  const coverage = getMemberAdvanceCoverage(member);
  const dueBlock = getMemberDueAndBlockFund(member, todayISO);
  const paidThroughDate = coverage.paidThroughDate;
  const remainingAdvanceDays =
    paidThroughDate && paidThroughDate > todayISO ? daysBetweenISO(todayISO, paidThroughDate) : 0;
  const isCoveredToday = coverage.coveredDates.has(todayISO);
  const singleAdvanceDays = Math.floor((Number(singleAmount) || 0) / DAILY_KISTI_AMOUNT);
  const singleAdvanceEndDate =
    singleDate && singleAdvanceDays > 1 ? offsetDateISO(singleDate, singleAdvanceDays - 1) : null;
  const sortedDeposits = [...member.deposits].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  const rangeDates = getDatesInRange(rangeStart, rangeEnd);
  const rangePreviewTotal = rangeDates.length * (Number(rangeAmount) || 0);

  const activeReceiptDeposit = receiptModalOpen ? selectedDeposit : null;
  const activeReceiptNo = generateReceiptNumber(member, activeReceiptDeposit);
  const previewDeposits = activeReceiptDeposit ? [activeReceiptDeposit] : sortedDeposits;
  const previewTotal = activeReceiptDeposit ? activeReceiptDeposit.amount : total;

  const notify = (msg: string) => {
    if (onNotify) onNotify(msg);
  };

  const formatNowTime = () =>
    new Date().toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' });

  const markReceiptSaved = (
    action: 'pdf' | 'html' | 'png' | 'share',
    statusLabel: string,
    detail: string,
    targetDeposit?: Deposit | null
  ) => {
    const targetKey = targetDeposit ? targetDeposit.id : 'full';
    const badgeState: 'Downloaded' | 'Saved' = action === 'pdf' ? 'Saved' : 'Downloaded';
    setReceiptFeedback({
      action,
      statusLabel,
      detail,
      timeLabel: formatNowTime(),
      targetKey,
    });
    setSavedReceiptKeys((prev) => ({ ...prev, [targetKey]: badgeState }));
  };

  const openFormalReceiptModal = (deposit: Deposit | null = null) => {
    setSelectedDeposit(deposit);
    setReceiptModalOpen(true);
  };

  const handleSaveReceiptPng = async (targetDeposit: Deposit | null = activeReceiptDeposit) => {
    setBusyAction('png');
    try {
      const filename = await downloadReceiptPng(member, adminName, targetDeposit, appLogoUrl);
      markReceiptSaved('png', 'Downloaded · সেভ হয়েছে', `PNG রসিদ (${filename})`, targetDeposit);
      notify('অফিশিয়াল রসিদ (PNG) সফলভাবে ডাউনলোড হয়েছে!');
    } catch {
      const filename = downloadReceiptHtml(member, adminName, targetDeposit, appLogoUrl);
      markReceiptSaved('html', 'Downloaded · সেভ হয়েছে', `Printable HTML (${filename})`, targetDeposit);
      notify('রসিদ Printable HTML ফাইল হিসেবে ডাউনলোড হয়েছে!');
    } finally {
      setBusyAction(null);
    }
  };

  const handleSaveReceiptHtml = (targetDeposit: Deposit | null = activeReceiptDeposit) => {
    const filename = downloadReceiptHtml(member, adminName, targetDeposit, appLogoUrl);
    markReceiptSaved('html', 'Downloaded · সংরক্ষিত হয়েছে', `Printable HTML (${filename})`, targetDeposit);
    notify('প্রিন্টযোগ্য অফিশিয়াল রসিদ (HTML) ডাউনলোড হয়েছে!');
  };

  const handlePrintReceipt = (targetDeposit: Deposit | null = activeReceiptDeposit) => {
    const receiptNo = generateReceiptNumber(member, targetDeposit);
    const ok = printReceiptReliably(member, adminName, targetDeposit, appLogoUrl);
    if (ok) {
      markReceiptSaved('pdf', 'Saved · প্রিন্ট / PDF প্রস্তুত', `অফিশিয়াল রসিদ (${receiptNo})`, targetDeposit);
      notify('প্রিন্ট / Save as PDF উইন্ডো প্রস্তুত করা হয়েছে।');
    } else {
      const filename = downloadReceiptHtml(member, adminName, targetDeposit, appLogoUrl);
      markReceiptSaved('html', 'Downloaded · HTML সংরক্ষিত', `Printable HTML (${filename})`, targetDeposit);
      notify('সরাসরি প্রিন্ট সাপোর্ট না থাকায় প্রিন্টযোগ্য HTML রসিদ ডাউনলোড করে দেওয়া হয়েছে।');
    }
  };

  const handleShareReceipt = async (targetDeposit: Deposit | null = activeReceiptDeposit) => {
    setBusyAction('share');
    const shareText = buildReceiptShareText(member, adminName, targetDeposit);
    const receiptNo = generateReceiptNumber(member, targetDeposit);
    try {
      const pngBlob = await generateReceiptPngBlob(member, adminName, targetDeposit, appLogoUrl);
      const file = new File([pngBlob], `${receiptNo}.png`, {
        type: 'image/png',
      });

      if (
        typeof navigator !== 'undefined' &&
        typeof navigator.canShare === 'function' &&
        navigator.canShare({ files: [file] })
      ) {
        await navigator.share({
          title: `অফিশিয়াল রসিদ - ${member.name}`,
          text: shareText,
          files: [file],
        });
        markReceiptSaved('share', 'Saved · শেয়ার সম্পন্ন', `রসিদ ${receiptNo}`, targetDeposit);
        return;
      }

      if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
        await navigator.share({
          title: `অফিশিয়াল রসিদ - ${member.name}`,
          text: shareText,
        });
        markReceiptSaved('share', 'Saved · শেয়ার সম্পন্ন', `রসিদ ${receiptNo}`, targetDeposit);
        return;
      }

      // Fallback on desktop without Web Share: download PNG & copy summary
      const filename = await downloadReceiptPng(member, adminName, targetDeposit, appLogoUrl);
      markReceiptSaved('png', 'Downloaded · সেভ ও কপি হয়েছে', `PNG রসিদ (${filename})`, targetDeposit);
      if (onCopyText) {
        onCopyText(shareText, 'রসিদ ডাউনলোড ও টেক্সট কপি হয়েছে — WhatsApp/Messenger-এ পাঠান!');
      } else {
        notify('রসিদ ডাউনলোড হয়েছে!');
      }
    } catch {
      // User cancelled share sheet or error
    } finally {
      setBusyAction(null);
    }
  };

  const whatsappReceiptHref = `https://wa.me/?text=${encodeURIComponent(
    buildReceiptShareText(member, adminName, activeReceiptDeposit)
  )}`;

  return (
    <div className="space-y-5">
      {/* Print-Only Official Receipt Header */}
      <div className="hidden border-b-2 border-slate-900 pb-4 print:block">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-xl font-bold text-slate-950">
              BARAKAH MULTICARE HOSPITAL UNITY
            </h1>
            <p className="mt-0.5 text-xs text-slate-600">
              সদস্য ডিপোজিট রসিদ ও হিসাব বিবরণী · {adminName}
              <span className="ml-1 font-sans text-[10px] font-medium tracking-wider opacity-45">
                Admin
              </span>
            </p>
          </div>
          <div className="text-right text-xs text-slate-600">
            <p>প্রিন্ট তারিখ: {formatDateBn(getTodayISO())}</p>
            <p className="font-mono-num">সদস্য আইডি: #{toBn(member.id)}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12 print:block print:space-y-5">
        {/* Left column: Summary + Admin deposit form */}
        <div className="space-y-5 lg:col-span-5">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 print:rounded-xl print:border-slate-300 dark:border-slate-800 dark:bg-slate-900">
            {editingInfo ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-200">
                    সদস্যের সকল তথ্য সংশোধন (সিরিয়াল ও আইডিসহ)
                  </p>
                  <button
                    type="button"
                    onClick={() => setPhotoModalOpen(true)}
                    className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                  >
                    <Camera className="h-3.5 w-3.5" />
                    <span>ছবি পরিবর্তন</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                  <div>
                    <label className="mb-1 block text-[11px] font-semibold text-slate-500">
                      সিরিয়াল / আইডি (#)
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={editIdInput}
                      onChange={(e) => {
                        setEditIdInput(e.target.value);
                        setEditError('');
                      }}
                      className="font-mono-num h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-bold dark:border-slate-700 dark:bg-slate-800"
                      placeholder="সিরিয়াল / আইডি"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="mb-1 block text-[11px] font-semibold text-slate-500">
                      সদস্যের নাম
                    </label>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm dark:border-slate-700 dark:bg-slate-800"
                      placeholder="নাম"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-[11px] font-semibold text-slate-500">
                    মোবাইল নম্বর
                  </label>
                  <input
                    type="tel"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="font-mono-num h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm dark:border-slate-700 dark:bg-slate-800"
                    placeholder="মোবাইল নম্বর"
                  />
                </div>

                {(() => {
                  const parsedNewId = parseInt(toEnDigits(editIdInput).replace(/\D/g, ''), 10);
                  const conflict =
                    Number.isInteger(parsedNewId) && parsedNewId !== member.id
                      ? allMembers.find((m) => m.id === parsedNewId)
                      : null;
                  if (!conflict) return null;
                  return (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
                      <p>
                        সিরিয়াল/আইডি #{toBn(conflict.id)} বর্তমানে <strong>{conflict.name}</strong>-এর
                        নামে আছে।
                      </p>
                      <label className="mt-1.5 inline-flex cursor-pointer items-center gap-1.5 font-semibold">
                        <input
                          type="checkbox"
                          checked={editSwapIfTaken}
                          onChange={(e) => setEditSwapIfTaken(e.target.checked)}
                          className="h-4 w-4 rounded accent-teal-700"
                        />
                        <span>
                          #{toBn(member.id)} ও #{toBn(conflict.id)} অদল-বদল (Swap) করুন
                        </span>
                      </label>
                    </div>
                  );
                })()}

                {editError && (
                  <p className="rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 dark:bg-red-950/40 dark:text-red-300">
                    {editError}
                  </p>
                )}

                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={editBusy}
                    onClick={async () => {
                      const parsedNewId = parseInt(
                        toEnDigits(editIdInput).replace(/\D/g, ''),
                        10
                      );
                      if (!Number.isInteger(parsedNewId) || parsedNewId <= 0) {
                        setEditError('সঠিক সিরিয়াল / সদস্য আইডি দিন (১ বা তার বেশি)।');
                        return;
                      }
                      if (!editName.trim()) {
                        setEditError('সদস্যের নাম লিখুন।');
                        return;
                      }
                      setEditBusy(true);
                      setEditError('');
                      try {
                        const res = await onEditMember({
                          oldId: member.id,
                          newId: parsedNewId,
                          name: editName.trim(),
                          phone: editPhone.trim(),
                          swapIfTaken: editSwapIfTaken,
                        });
                        if (!res.ok) {
                          setEditError(res.error || 'তথ্য সংরক্ষণ করা যায়নি।');
                          return;
                        }
                        setEditingInfo(false);
                      } finally {
                        setEditBusy(false);
                      }
                    }}
                    className="h-10 flex-1 rounded-xl bg-teal-700 text-xs font-semibold text-white hover:bg-teal-800 disabled:opacity-50"
                  >
                    {editBusy ? 'সংরক্ষণ হচ্ছে...' : 'সংরক্ষণ করুন'}
                  </button>
                  <button
                    type="button"
                    disabled={editBusy}
                    onClick={() => {
                      setEditIdInput(String(member.id));
                      setEditName(member.name);
                      setEditPhone(member.phone);
                      setEditError('');
                      setEditingInfo(false);
                    }}
                    className="h-10 rounded-xl border border-slate-200 px-4 text-xs font-semibold text-slate-600 dark:border-slate-700 dark:text-slate-300"
                  >
                    বাতিল
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3.5">
                    <button
                      type="button"
                      onClick={() => setPhotoModalOpen(true)}
                      aria-label="প্রোফাইল ছবি পরিবর্তন করুন"
                      className="group relative shrink-0 rounded-2xl focus:outline-none focus:ring-2 focus:ring-teal-600 focus:ring-offset-2 dark:focus:ring-offset-slate-900"
                    >
                      <MemberAvatar
                        memberId={member.id}
                        name={member.name}
                        photoUrl={member.photoUrl}
                        size="lg"
                      />
                      <span className="absolute -right-1.5 -bottom-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-teal-700 text-white shadow-sm ring-2 ring-white transition-transform group-hover:scale-105 print:hidden dark:bg-teal-600 dark:ring-slate-900">
                        <Camera className="h-3.5 w-3.5" />
                      </span>
                    </button>

                    <div className="min-w-0">
                      <p className="font-mono-num text-xs font-medium text-slate-500 dark:text-slate-400">
                        সদস্য আইডি #{toBn(member.id)}
                      </p>
                      <h2 className="font-display mt-0.5 truncate text-xl font-bold text-slate-900 dark:text-slate-100">
                        {member.name}
                      </h2>
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                        <a
                          href={`tel:${member.phone}`}
                          className="inline-flex items-center gap-1.5 text-sm font-medium text-teal-700 hover:underline dark:text-teal-400"
                        >
                          <Phone className="h-3.5 w-3.5 print:hidden" />
                          <span className="font-mono-num">{member.phone}</span>
                        </a>
                        <button
                          type="button"
                          onClick={() => setPhotoModalOpen(true)}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-teal-700 print:hidden dark:text-slate-400 dark:hover:text-teal-400"
                        >
                          <Camera className="h-3 w-3" />
                          <span>{member.photoUrl ? 'ছবি পরিবর্তন' : 'ছবি যুক্ত করুন'}</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => openFormalReceiptModal(null)}
                    aria-label="অফিশিয়াল রসিদ প্রিভিউ ও প্রিন্ট"
                    className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-teal-600/30 bg-teal-50 px-3 text-xs font-semibold text-teal-800 transition-colors hover:bg-teal-100 active:scale-[0.98] whitespace-nowrap shrink-0 print:hidden dark:border-teal-500/40 dark:bg-teal-950/60 dark:text-teal-200 dark:hover:bg-teal-900/60"
                  >
                    <FileText className="h-4 w-4" />
                    <span>অফিশিয়াল রসিদ</span>
                  </button>
                </div>

                {/* Quick Formal Receipt Actions (PDF/Print, Printable HTML, PNG Save) */}
                <div className="mt-3.5 grid grid-cols-3 gap-2 print:hidden">
                  <button
                    type="button"
                    onClick={() => handlePrintReceipt(null)}
                    className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl bg-teal-700 px-2.5 text-xs font-semibold text-white transition-colors hover:bg-teal-800 active:scale-[0.98] whitespace-nowrap"
                  >
                    {receiptFeedback?.action === 'pdf' && receiptFeedback.targetKey === 'full' ? (
                      <Check className="h-3.5 w-3.5 shrink-0" />
                    ) : (
                      <Printer className="h-3.5 w-3.5 shrink-0" />
                    )}
                    <span>
                      {receiptFeedback?.action === 'pdf' && receiptFeedback.targetKey === 'full'
                        ? 'Saved (PDF)'
                        : 'প্রিন্ট / PDF'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSaveReceiptHtml(null)}
                    className={`inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border px-2.5 text-xs font-semibold transition-colors active:scale-[0.98] whitespace-nowrap ${
                      receiptFeedback?.action === 'html' && receiptFeedback.targetKey === 'full'
                        ? 'border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300'
                        : 'border-slate-200 bg-slate-50 text-slate-800 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700'
                    }`}
                  >
                    {receiptFeedback?.action === 'html' && receiptFeedback.targetKey === 'full' ? (
                      <Check className="h-3.5 w-3.5 shrink-0" />
                    ) : (
                      <FileDown className="h-3.5 w-3.5 shrink-0" />
                    )}
                    <span>
                      {receiptFeedback?.action === 'html' && receiptFeedback.targetKey === 'full'
                        ? 'Downloaded'
                        : 'HTML রসিদ'}
                    </span>
                  </button>

                  <button
                    type="button"
                    disabled={busyAction === 'png'}
                    onClick={() => void handleSaveReceiptPng(null)}
                    className={`inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border px-2.5 text-xs font-semibold transition-colors active:scale-[0.98] disabled:opacity-60 whitespace-nowrap ${
                      receiptFeedback?.action === 'png' && receiptFeedback.targetKey === 'full'
                        ? 'border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300'
                        : 'border-slate-200 bg-slate-50 text-slate-800 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700'
                    }`}
                  >
                    {receiptFeedback?.action === 'png' && receiptFeedback.targetKey === 'full' ? (
                      <Check className="h-3.5 w-3.5 shrink-0" />
                    ) : (
                      <Download className="h-3.5 w-3.5 shrink-0" />
                    )}
                    <span>
                      {busyAction === 'png'
                        ? 'সেভ হচ্ছে...'
                        : receiptFeedback?.action === 'png' && receiptFeedback.targetKey === 'full'
                          ? 'Saved (PNG)'
                          : 'PNG সেভ'}
                    </span>
                  </button>
                </div>

                {/* Clear Downloaded / Saved Status Indicator */}
                {receiptFeedback && (
                  <div
                    role="status"
                    aria-live="polite"
                    className="mt-2.5 flex items-center justify-between gap-2 rounded-xl border border-emerald-200 bg-emerald-50/90 px-3 py-2 text-xs text-emerald-900 print:hidden dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200"
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                      <div className="min-w-0">
                        <p className="truncate font-semibold">{receiptFeedback.statusLabel}</p>
                        <p className="font-mono-num truncate text-[11px] text-emerald-700/90 dark:text-emerald-300/80">
                          {receiptFeedback.detail} · {receiptFeedback.timeLabel}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setReceiptFeedback(null)}
                      aria-label="বার্তা বন্ধ করুন"
                      className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-emerald-700 hover:bg-emerald-100 dark:text-emerald-300 dark:hover:bg-emerald-900/50"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}

                <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-teal-700 p-4 text-white print:border print:border-slate-300 print:bg-slate-100 print:text-slate-950 dark:bg-teal-800">
                  <div>
                    <p className="text-xs text-teal-100 print:text-slate-600">মোট জমাকৃত টাকা</p>
                    <p className="font-mono-num mt-0.5 text-2xl font-bold">৳ {toBn(total)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-teal-100 print:text-slate-600">মোট কিস্তি (১০০৳)</p>
                    <p className="font-mono-num mt-0.5 text-2xl font-bold">{toBn(kisti)} টি</p>
                  </div>
                </div>

                {/* Auto Due & 1st-Month Block Fund Strip */}
                <div className="mt-3 grid grid-cols-2 gap-2.5">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-slate-800 dark:bg-slate-800/50">
                    <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                      মোট বকেয়া (Due)
                    </p>
                    <p
                      className={`font-mono-num mt-0.5 text-sm font-bold ${
                        dueBlock.dueAmount > 0
                          ? 'text-red-600 dark:text-red-400'
                          : 'text-emerald-700 dark:text-emerald-400'
                      }`}
                    >
                      {dueBlock.dueAmount > 0
                        ? `৳ ${toBn(dueBlock.dueAmount)} (${toBn(dueBlock.dueDays)} দিন)`
                        : 'কোনো বকেয়া নেই'}
                    </p>
                  </div>
                  <div className="rounded-xl border border-indigo-200/80 bg-indigo-50/70 px-3 py-2.5 dark:border-indigo-900/50 dark:bg-indigo-950/30">
                    <p className="text-[11px] font-medium text-indigo-700 dark:text-indigo-300">
                      ১ম মাসের ব্লক ফান্ড
                    </p>
                    <p className="font-mono-num mt-0.5 text-sm font-bold text-indigo-900 dark:text-indigo-200">
                      ৳ {toBn(dueBlock.blockFundAmount)} / ৳ {toBn(BLOCK_FUND_PER_MEMBER_CAP)}
                    </p>
                  </div>
                </div>

                {paidThroughDate && (
                  <div
                    className={`mt-3 rounded-xl border px-3.5 py-2.5 text-xs font-medium ${
                      remainingAdvanceDays > 0
                        ? 'border-emerald-200 bg-emerald-50/70 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300'
                        : isCoveredToday
                          ? 'border-teal-200 bg-teal-50/70 text-teal-800 dark:border-teal-900/60 dark:bg-teal-950/40 dark:text-teal-300'
                          : 'border-amber-200 bg-amber-50/70 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300'
                    }`}
                  >
                    {remainingAdvanceDays > 0 ? (
                      <span>
                        এডভান্স পেমেন্ট সম্পন্ন: <strong>{formatDateBn(paidThroughDate)}</strong> পর্যন্ত (আরও{' '}
                        {toBn(remainingAdvanceDays)} দিন কভার)
                      </span>
                    ) : isCoveredToday ? (
                      <span>আজ ({formatDateBn(todayISO)}) পর্যন্ত পেমেন্ট সম্পন্ন রয়েছে</span>
                    ) : (
                      <span>
                        সর্বশেষ পেইড তারিখ: <strong>{formatDateBn(paidThroughDate)}</strong> (আজকের পেমেন্ট বাকি)
                      </span>
                    )}
                  </div>
                )}

                {isAdmin && (
                  <div className="mt-4 flex gap-2 print:hidden">
                    <button
                      type="button"
                      onClick={() => {
                        setEditName(member.name);
                        setEditPhone(member.phone);
                        setEditingInfo(true);
                      }}
                      className="inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                      <span>তথ্য এডিট</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteMember(member.id)}
                      className="inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl border border-red-200 bg-red-50 text-xs font-semibold text-red-700 hover:bg-red-100 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>সদস্য মুছুন</span>
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Admin or Cashier Deposit Box */}
          {canCollect ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 print:hidden dark:border-slate-800 dark:bg-slate-900">
              <h3 className="font-display text-base font-bold text-slate-900 dark:text-slate-100">
                ডিপোজিট আদায় {!isAdmin && <span className="text-xs font-semibold text-indigo-600">(ক্যাশিয়ার)</span>}
              </h3>

              <div className="mt-3 grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
                <button
                  type="button"
                  onClick={() => setDepositMode('single')}
                  className={`h-9 rounded-lg text-xs font-semibold transition-colors ${
                    depositMode === 'single'
                      ? 'bg-white text-teal-700 shadow-xs dark:bg-slate-900 dark:text-teal-300'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  একদিনের জমা
                </button>
                <button
                  type="button"
                  onClick={() => setDepositMode('range')}
                  className={`h-9 rounded-lg text-xs font-semibold transition-colors ${
                    depositMode === 'range'
                      ? 'bg-white text-teal-700 shadow-xs dark:bg-slate-900 dark:text-teal-300'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  তারিখ রেঞ্জ (২২-২৯)
                </button>
              </div>

              {depositMode === 'single' ? (
                <div className="mt-4 space-y-3">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">
                      তারিখ
                    </label>
                    <input
                      type="date"
                      value={singleDate}
                      onChange={(e) => setSingleDate(e.target.value)}
                      className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm dark:border-slate-700 dark:bg-slate-800"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">
                      টাকার পরিমাণ
                    </label>
                    <input
                      type="number"
                      min="1"
                      inputMode="numeric"
                      value={singleAmount}
                      onChange={(e) => setSingleAmount(e.target.value)}
                      className="font-mono-num h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm dark:border-slate-700 dark:bg-slate-800"
                    />
                    {singleAdvanceEndDate && (
                      <p className="mt-1.5 text-[11px] font-medium text-teal-700 dark:text-teal-400">
                        ৳{toBn(Number(singleAmount))} = {toBn(singleAdvanceDays)} দিনের এডভান্স (
                        {formatDateBn(singleDate)} থেকে {formatDateBn(singleAdvanceEndDate)} পর্যন্ত সম্পন্ন দেখাবে)
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">
                      মন্তব্য / ট্রানজেকশন আইডি
                    </label>
                    <input
                      type="text"
                      value={singleNote}
                      onChange={(e) => setSingleNote(e.target.value)}
                      placeholder="দৈনিক কিস্তি বা TrxID"
                      className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm dark:border-slate-700 dark:bg-slate-800"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      onAddDeposit(member.id, singleDate, Number(singleAmount), singleNote.trim() || 'দৈনিক কিস্তি')
                    }
                    className="h-11 w-full rounded-xl bg-teal-700 text-sm font-semibold text-white transition-colors hover:bg-teal-800 active:scale-[0.98]"
                  >
                    টাকা জমা করুন
                  </button>
                </div>
              ) : (
                <div className="mt-4 space-y-3">
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">
                        শুরুর তারিখ
                      </label>
                      <input
                        type="date"
                        value={rangeStart}
                        onChange={(e) => setRangeStart(e.target.value)}
                        className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-2.5 text-xs dark:border-slate-700 dark:bg-slate-800"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">
                        শেষ তারিখ
                      </label>
                      <input
                        type="date"
                        value={rangeEnd}
                        onChange={(e) => setRangeEnd(e.target.value)}
                        className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-2.5 text-xs dark:border-slate-700 dark:bg-slate-800"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">
                        প্রতিদিনের টাকা
                      </label>
                      <input
                        type="number"
                        min="1"
                        inputMode="numeric"
                        value={rangeAmount}
                        onChange={(e) => setRangeAmount(e.target.value)}
                        className="font-mono-num h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm dark:border-slate-700 dark:bg-slate-800"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">
                        মন্তব্য
                      </label>
                      <input
                        type="text"
                        value={rangeNote}
                        onChange={(e) => setRangeNote(e.target.value)}
                        className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm dark:border-slate-700 dark:bg-slate-800"
                      />
                    </div>
                  </div>

                  <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300">
                    <input
                      type="checkbox"
                      checked={skipDup}
                      onChange={(e) => setSkipDup(e.target.checked)}
                      className="h-4 w-4 rounded accent-teal-700"
                    />
                    <span>আগে জমা থাকা তারিখ বাদ দিন</span>
                  </label>

                  <div className="rounded-xl border border-teal-200 bg-teal-50/70 p-3 text-xs text-teal-900 dark:border-teal-900 dark:bg-teal-950/40 dark:text-teal-200">
                    {rangeDates.length > 0 ? (
                      <>
                        {formatDateBn(rangeStart)} থেকে {formatDateBn(rangeEnd)} ·{' '}
                        <strong className="font-mono-num">{toBn(rangeDates.length)} দিন</strong> · মোট{' '}
                        <strong className="font-mono-num">৳ {toBn(rangePreviewTotal)}</strong>
                      </>
                    ) : (
                      'সঠিক শুরুর ও শেষ তারিখ নির্বাচন করুন'
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      onAddRangeDeposit(
                        member.id,
                        rangeStart,
                        rangeEnd,
                        Number(rangeAmount),
                        rangeNote.trim() || 'দৈনিক কিস্তি',
                        skipDup
                      )
                    }
                    className="h-11 w-full rounded-xl bg-teal-700 text-sm font-semibold text-white transition-colors hover:bg-teal-800 active:scale-[0.98]"
                  >
                    রেঞ্জ অনুযায়ী জমা নিন
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-4 text-center text-xs font-medium text-slate-500 print:hidden dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
              ডিপোজিট এন্ট্রি ও পরিবর্তনের অধিকার শুধুমাত্র এডমিনের জন্য সংরক্ষিত।
            </div>
          )}
        </div>

        {/* Right column: Payment Calendar + Deposit Ledger Table */}
        <div className="space-y-5 lg:col-span-7">
          <MemberCalendar member={member} />

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white print:rounded-xl print:border-slate-300 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-5 py-4 dark:border-slate-800">
              <div>
                <h3 className="font-display text-base font-bold text-slate-900 dark:text-slate-100">
                  তারিখ অনুসারে জমার হিসাব
                </h3>
                <p className="font-mono-num mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  {toBn(sortedDeposits.length)}টি এন্ট্রি · প্রতিটি লেনদেনের আলাদা রসিদ ডাউনলোড করা যাবে
                </p>
              </div>
              <button
                type="button"
                onClick={() => openFormalReceiptModal(null)}
                className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-100 whitespace-nowrap print:hidden dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                <Printer className="h-3.5 w-3.5 text-teal-700 dark:text-teal-400" />
                <span>সম্পূর্ণ স্টেটমেন্ট</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50 text-xs font-semibold text-slate-500 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-400">
                    <th className="px-4 py-3">তারিখ</th>
                    <th className="px-4 py-3">বিবরণ</th>
                    <th className="px-4 py-3 text-right">টাকা</th>
                    <th className="px-4 py-3 text-right print:hidden">রসিদ / অ্যাকশন</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {sortedDeposits.length === 0 ? (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-4 py-8 text-center text-sm text-slate-500 dark:text-slate-400"
                      >
                        এখনো কোনো টাকা জমা দেওয়া হয়নি।
                      </td>
                    </tr>
                  ) : (
                    sortedDeposits.map((dep) => {
                      const rowSavedState = savedReceiptKeys[dep.id];
                      return (
                        <tr key={dep.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                          <td className="font-mono-num whitespace-nowrap px-4 py-3 text-slate-700 dark:text-slate-300">
                            {formatDateBn(dep.date)}
                          </td>
                          <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                            {dep.note || 'দৈনিক কিস্তি'}
                          </td>
                          <td className="font-mono-num whitespace-nowrap px-4 py-3 text-right font-bold text-teal-700 print:text-slate-950 dark:text-teal-400">
                            ৳ {toBn(dep.amount)}
                          </td>
                          <td className="px-4 py-2.5 text-right print:hidden">
                            <div className="inline-flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => openFormalReceiptModal(dep)}
                                aria-label={`${formatDateBn(dep.date)} তারিখের রসিদ তৈরি করুন`}
                                className={`inline-flex min-h-[36px] items-center gap-1 rounded-lg border px-2.5 text-xs font-semibold transition-colors whitespace-nowrap ${
                                  rowSavedState
                                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                                    : 'border-slate-200 bg-white text-slate-700 hover:border-teal-300 hover:text-teal-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-teal-600 dark:hover:text-teal-300'
                                }`}
                              >
                                {rowSavedState ? (
                                  <>
                                    <Check className="h-3.5 w-3.5" />
                                    <span>{rowSavedState}</span>
                                  </>
                                ) : (
                                  <>
                                    <FileText className="h-3.5 w-3.5" />
                                    <span>রসিদ</span>
                                  </>
                                )}
                              </button>
                              {isAdmin && (
                                <button
                                  type="button"
                                  onClick={() => onDeleteDeposit(member.id, dep.id)}
                                  className="inline-flex min-h-[36px] items-center rounded-lg bg-red-50 px-2.5 text-xs font-semibold text-red-700 hover:bg-red-100 whitespace-nowrap dark:bg-red-950/50 dark:text-red-300"
                                >
                                  মুছুন
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-teal-600/30 bg-teal-50/70 font-bold text-teal-900 print:border-slate-900 print:bg-slate-100 print:text-slate-950 dark:bg-teal-950/40 dark:text-teal-200">
                    <td colSpan={2} className="px-4 py-3.5">
                      সর্বমোট জমা ({toBn(sortedDeposits.length)} বার)
                    </td>
                    <td className="font-mono-num px-4 py-3.5 text-right">৳ {toBn(total)}</td>
                    <td className="print:hidden" />
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Print-Only Signature Footer */}
      <div className="hidden border-t border-slate-300 pt-6 text-xs text-slate-600 print:flex print:items-end print:justify-between">
        <div>
          <p>সিস্টেম জেনারেটেড রসিদ · BARAKAH MULTICARE HOSPITAL UNITY</p>
        </div>
        <div className="text-right">
          <p className="border-t border-slate-400 px-4 pt-1 font-semibold text-slate-900">
            অনুমোদিত স্বাক্ষর · {adminName}
            <span className="ml-1 font-sans text-[10px] font-medium tracking-wider opacity-45">
              Admin
            </span>
          </p>
        </div>
      </div>

      {/* Formal Printable Receipt Preview & Export Modal (Responsive Mobile Sheet + Desktop Document Dialog) */}
      {receiptModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="অফিশিয়াল প্রিন্ট ও ডাউনলোড রসিদ"
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/65 p-0 backdrop-blur-xs sm:items-center sm:p-4 print:hidden"
          onClick={() => setReceiptModalOpen(false)}
        >
          <div
            className="flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-3xl border border-slate-200 bg-white shadow-2xl sm:max-w-2xl sm:rounded-2xl dark:border-slate-800 dark:bg-slate-900"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Mobile Drag Affordance */}
            <div className="pt-2.5 sm:hidden">
              <div className="mx-auto h-1.5 w-10 rounded-full bg-slate-300 dark:bg-slate-700" />
            </div>

            {/* Modal Header */}
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4 dark:border-slate-800">
              <div className="min-w-0">
                <h3 className="font-display text-base font-bold text-slate-900 dark:text-slate-100">
                  {activeReceiptDeposit ? 'অফিশিয়াল একক লেনদেন রসিদ' : 'অফিশিয়াল হিসাব বিবরণী রসিদ'}
                </h3>
                <p className="font-mono-num mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">
                  রসিদ নং: {activeReceiptNo} · {member.name} (#{toBn(member.id)})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setReceiptModalOpen(false)}
                aria-label="বন্ধ করুন"
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Scope Switcher (Full Statement vs Individual Transaction) */}
            {sortedDeposits.length > 0 && (
              <div className="border-b border-slate-100 bg-slate-50/70 px-5 py-2.5 dark:border-slate-800 dark:bg-slate-800/40">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="inline-flex rounded-xl bg-slate-200/70 p-1 dark:bg-slate-800">
                    <button
                      type="button"
                      onClick={() => setSelectedDeposit(null)}
                      className={`min-h-[34px] rounded-lg px-3 text-xs font-semibold transition-colors whitespace-nowrap ${
                        !activeReceiptDeposit
                          ? 'bg-white text-teal-700 shadow-xs dark:bg-slate-900 dark:text-teal-300'
                          : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
                      }`}
                    >
                      সম্পূর্ণ হিসাব ({toBn(sortedDeposits.length)})
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedDeposit(selectedDeposit || sortedDeposits[0])}
                      className={`min-h-[34px] rounded-lg px-3 text-xs font-semibold transition-colors whitespace-nowrap ${
                        activeReceiptDeposit
                          ? 'bg-white text-teal-700 shadow-xs dark:bg-slate-900 dark:text-teal-300'
                          : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
                      }`}
                    >
                      একক লেনদেন রসিদ
                    </button>
                  </div>

                  {activeReceiptDeposit && sortedDeposits.length > 1 && (
                    <select
                      aria-label="লেনদেন নির্বাচন করুন"
                      value={activeReceiptDeposit.id}
                      onChange={(e) => {
                        const picked = sortedDeposits.find((d) => d.id === e.target.value) || null;
                        setSelectedDeposit(picked);
                      }}
                      className="h-9 max-w-[230px] rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                    >
                      {sortedDeposits.map((d) => (
                        <option key={d.id} value={d.id}>
                          {formatDateBn(d.date)} — ৳{toBn(d.amount)}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
            )}

            {/* Scrollable Formal Document Preview */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5">
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white text-slate-900 shadow-xs dark:border-slate-700">
                {/* Official Branding Letterhead */}
                <div className="bg-gradient-to-br from-teal-700 to-teal-800 px-4 py-4 text-white sm:px-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/25 bg-white/15">
                        <ShieldCheck className="h-5 w-5 text-white" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-display text-sm font-bold tracking-tight sm:text-base">
                          BARAKAH MULTICARE HOSPITAL UNITY
                        </p>
                        <p className="mt-0.5 text-[11px] text-teal-50/90">
                          অফিশিয়াল ডিপোজিট রসিদ · {adminName}
                          <span className="ml-1 font-sans text-[10px] font-medium tracking-wider text-white/50">
                            Admin
                          </span>
                        </p>
                      </div>
                    </div>
                    <div className="shrink-0 text-right text-[11px] text-teal-50/90">
                      <p className="font-semibold text-white">
                        {activeReceiptDeposit ? 'একক রসিদ' : 'হিসাব বিবরণী'}
                      </p>
                      <p className="font-mono-num mt-0.5">{formatDateBn(todayISO)}</p>
                    </div>
                  </div>
                </div>

                {/* Formal Metadata Strip */}
                <div className="grid grid-cols-2 gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs sm:grid-cols-4 sm:px-5">
                  <div>
                    <p className="text-[11px] font-medium text-slate-500">রসিদ নম্বর</p>
                    <p className="font-mono-num mt-0.5 truncate font-bold text-slate-900">{activeReceiptNo}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-medium text-slate-500">সদস্য আইডি</p>
                    <p className="font-mono-num mt-0.5 font-bold text-teal-700">#{toBn(member.id)}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-medium text-slate-500">ইস্যু তারিখ</p>
                    <p className="font-mono-num mt-0.5 font-semibold text-slate-800">{formatDateBn(todayISO)}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-medium text-slate-500">অবস্থা</p>
                    <p className="mt-0.5 font-semibold text-emerald-700">✓ পরিশোধিত</p>
                  </div>
                </div>

                {/* Member & Summary Body */}
                <div className="space-y-4 p-4 text-xs sm:p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-3">
                    <div>
                      <p className="text-[11px] font-medium text-slate-500">সদস্যের নাম ও যোগাযোগ</p>
                      <p className="mt-0.5 text-base font-bold text-slate-900">{member.name}</p>
                      <p className="font-mono-num text-slate-600">মোবাইল: {member.phone}</p>
                    </div>
                    <div className="text-left sm:text-right">
                      <p className="text-[11px] font-medium text-slate-500">১ম মাসের ব্লক ফান্ড</p>
                      <p className="font-mono-num mt-0.5 font-bold text-slate-900">
                        ৳ {toBn(dueBlock.blockFundAmount)} / ৳ {toBn(BLOCK_FUND_PER_MEMBER_CAP)}
                      </p>
                      <p className="font-mono-num text-[11px] text-slate-500">
                        মোট কিস্তি: {toBn(kisti)} টি
                      </p>
                    </div>
                  </div>

                  {/* Key Totals */}
                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="rounded-xl border border-teal-200/80 bg-teal-50/70 p-3">
                      <p className="text-[11px] font-semibold text-teal-800">
                        {activeReceiptDeposit ? 'এই রসিদের জমা' : 'সর্বমোট জমাকৃত টাকা'}
                      </p>
                      <p className="font-mono-num mt-0.5 text-lg font-bold text-slate-900">
                        ৳ {toBn(previewTotal)}
                      </p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-right">
                      <p className="text-[11px] font-semibold text-slate-600">
                        {activeReceiptDeposit ? 'সদস্যের মোট স্থিতি' : 'মোট বকেয়া অবস্থা'}
                      </p>
                      <p className="font-mono-num mt-0.5 text-lg font-bold text-slate-900">
                        {activeReceiptDeposit
                          ? `৳ ${toBn(total)}`
                          : dueBlock.dueAmount > 0
                            ? `৳ ${toBn(dueBlock.dueAmount)}`
                            : 'হালনাগাদ'}
                      </p>
                    </div>
                  </div>

                  {/* Itemized Transaction Details Preview */}
                  <div>
                    <div className="mb-1.5 flex items-center justify-between text-[11px] font-semibold text-slate-500">
                      <span>লেনদেনের বিবরণ</span>
                      <span className="font-mono-num">{toBn(previewDeposits.length)}টি এন্ট্রি</span>
                    </div>
                    <div className="overflow-hidden rounded-lg border border-slate-200">
                      <table className="w-full border-collapse text-left text-xs">
                        <thead>
                          <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-500">
                            <th className="px-3 py-2">তারিখ</th>
                            <th className="px-3 py-2">বিবরণ</th>
                            <th className="px-3 py-2 text-right">টাকা</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {previewDeposits.length === 0 ? (
                            <tr>
                              <td colSpan={3} className="px-3 py-4 text-center text-slate-500">
                                কোনো লেনদেন পাওয়া যায়নি।
                              </td>
                            </tr>
                          ) : (
                            previewDeposits.slice(0, 6).map((dep) => (
                              <tr key={dep.id}>
                                <td className="font-mono-num whitespace-nowrap px-3 py-2 text-slate-700">
                                  {formatDateBn(dep.date)}
                                </td>
                                <td className="px-3 py-2 text-slate-700">
                                  <span className="block font-medium">{dep.note || 'দৈনিক কিস্তি'}</span>
                                  <span className="font-mono-num text-[10px] text-slate-400">
                                    Ref: {dep.id.slice(-8).toUpperCase()}
                                  </span>
                                </td>
                                <td className="font-mono-num whitespace-nowrap px-3 py-2 text-right font-bold text-teal-700">
                                  ৳ {toBn(dep.amount)}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                        <tfoot>
                          <tr className="border-t border-teal-600/30 bg-teal-50/60 font-bold text-slate-900">
                            <td colSpan={2} className="px-3 py-2">
                              {activeReceiptDeposit
                                ? 'এই রসিদে মোট পরিশোধিত'
                                : previewDeposits.length > 6
                                  ? `সর্বমোট (+আরও ${toBn(previewDeposits.length - 6)}টি প্রিন্ট/ফাইলে থাকবে)`
                                  : 'সর্বমোট পরিশোধিত'}
                            </td>
                            <td className="font-mono-num whitespace-nowrap px-3 py-2 text-right text-teal-800">
                              ৳ {toBn(previewTotal)}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>

                  {/* Signature Preview Footer */}
                  <div className="flex items-end justify-between gap-4 border-t border-dashed border-slate-200 pt-3 text-[11px] text-slate-500">
                    <span>সিস্টেম জেনারেটেড অফিশিয়াল রসিদ</span>
                    <span className="font-semibold text-slate-800">
                      অনুমোদিত স্বাক্ষর · {adminName}
                      <span className="ml-1 font-sans text-[10px] font-medium opacity-45">Admin</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Sticky Bottom Export Bar + Persistent Downloaded / Saved Status */}
            <div className="border-t border-slate-200 bg-slate-50/90 px-4 py-3.5 sm:px-5 dark:border-slate-800 dark:bg-slate-900/95">
              {receiptFeedback && (
                <div
                  role="status"
                  aria-live="polite"
                  className="mb-3 flex items-center justify-between gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/50 dark:text-emerald-200"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                    <span className="truncate font-semibold">{receiptFeedback.statusLabel}</span>
                    <span className="font-mono-num hidden truncate text-[11px] text-emerald-700/90 sm:inline dark:text-emerald-300/80">
                      · {receiptFeedback.detail} ({receiptFeedback.timeLabel})
                    </span>
                  </div>
                  <span className="font-mono-num shrink-0 text-[11px] font-semibold text-emerald-700 sm:hidden dark:text-emerald-300">
                    {receiptFeedback.timeLabel}
                  </span>
                </div>
              )}

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => handlePrintReceipt(activeReceiptDeposit)}
                  className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-teal-700 px-4 text-xs font-semibold text-white transition-colors hover:bg-teal-800 active:scale-[0.98] whitespace-nowrap sm:text-sm"
                >
                  {receiptFeedback?.action === 'pdf' &&
                  receiptFeedback.targetKey === (activeReceiptDeposit?.id || 'full') ? (
                    <Check className="h-4 w-4 shrink-0" />
                  ) : (
                    <Printer className="h-4 w-4 shrink-0" />
                  )}
                  <span>
                    {receiptFeedback?.action === 'pdf' &&
                    receiptFeedback.targetKey === (activeReceiptDeposit?.id || 'full')
                      ? 'Saved · প্রিন্ট / PDF প্রস্তুত'
                      : 'প্রিন্ট / Save as PDF'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSaveReceiptHtml(activeReceiptDeposit)}
                  className={`inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border px-4 text-xs font-semibold transition-colors active:scale-[0.98] whitespace-nowrap sm:text-sm ${
                    receiptFeedback?.action === 'html' &&
                    receiptFeedback.targetKey === (activeReceiptDeposit?.id || 'full')
                      ? 'border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200'
                      : 'border-slate-300 bg-white text-slate-900 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700'
                  }`}
                >
                  {receiptFeedback?.action === 'html' &&
                  receiptFeedback.targetKey === (activeReceiptDeposit?.id || 'full') ? (
                    <Check className="h-4 w-4 shrink-0" />
                  ) : (
                    <FileDown className="h-4 w-4 shrink-0 text-teal-700 dark:text-teal-400" />
                  )}
                  <span>
                    {receiptFeedback?.action === 'html' &&
                    receiptFeedback.targetKey === (activeReceiptDeposit?.id || 'full')
                      ? 'Downloaded · HTML সংরক্ষিত'
                      : 'Printable HTML ডাউনলোড'}
                  </span>
                </button>
              </div>

              <div className="mt-2 grid grid-cols-3 gap-2">
                <button
                  type="button"
                  disabled={busyAction === 'png'}
                  onClick={() => void handleSaveReceiptPng(activeReceiptDeposit)}
                  className={`inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border px-2.5 text-xs font-semibold transition-colors disabled:opacity-60 whitespace-nowrap ${
                    receiptFeedback?.action === 'png' &&
                    receiptFeedback.targetKey === (activeReceiptDeposit?.id || 'full')
                      ? 'border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200'
                      : 'border-slate-200 bg-white text-slate-800 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100'
                  }`}
                >
                  {receiptFeedback?.action === 'png' &&
                  receiptFeedback.targetKey === (activeReceiptDeposit?.id || 'full') ? (
                    <Check className="h-3.5 w-3.5 shrink-0" />
                  ) : (
                    <Download className="h-3.5 w-3.5 shrink-0" />
                  )}
                  <span>
                    {busyAction === 'png'
                      ? 'তৈরি হচ্ছে...'
                      : receiptFeedback?.action === 'png' &&
                          receiptFeedback.targetKey === (activeReceiptDeposit?.id || 'full')
                        ? 'Saved (PNG)'
                        : 'PNG ছবি'}
                  </span>
                </button>

                <button
                  type="button"
                  disabled={busyAction === 'share'}
                  onClick={() => void handleShareReceipt(activeReceiptDeposit)}
                  className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl bg-slate-900 px-2.5 text-xs font-semibold text-white transition-colors hover:bg-slate-800 disabled:opacity-60 whitespace-nowrap dark:bg-slate-700 dark:hover:bg-slate-600"
                >
                  <Share2 className="h-3.5 w-3.5 shrink-0" />
                  <span>শেয়ার</span>
                </button>

                <a
                  href={whatsappReceiptHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-2.5 text-xs font-semibold text-white transition-colors hover:bg-emerald-700 whitespace-nowrap"
                >
                  <MessageCircle className="h-3.5 w-3.5 shrink-0" />
                  <span>WhatsApp</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Profile Photo Upload / Camera / Library Modal */}
      <ProfilePhotoModal
        open={photoModalOpen}
        member={member}
        isAdmin={canCollect}
        onClose={() => setPhotoModalOpen(false)}
        onSavePhoto={onUpdateMemberPhoto}
      />
    </div>
  );
}
