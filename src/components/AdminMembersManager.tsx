import {
  ArrowDown,
  ArrowUp,
  ArrowLeftRight,
  Camera,
  Check,
  Edit3,
  ExternalLink,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import {
  getMemberInstallments,
  getMemberTotal,
  toBn,
  toEnDigits,
} from '../data/defaultData';
import type { Member } from '../types/unity';
import { compressFileToAvatar } from '../utils/avatarLibrary';
import { MemberAvatar } from './MemberAvatar';

export interface MemberFullUpdatePayload {
  oldId: number;
  newId: number;
  name: string;
  phone: string;
  photoUrl?: string;
  swapIfTaken?: boolean;
}

interface AdminMembersManagerProps {
  members: Member[];
  onUpdateMemberFull: (
    payload: MemberFullUpdatePayload
  ) => Promise<{ ok: boolean; error?: string; memberId?: number }>;
  onDeleteMember: (memberId: number) => void;
  onOpenMember: (memberId: number) => void;
}

export function AdminMembersManager({
  members,
  onUpdateMemberFull,
  onDeleteMember,
  onOpenMember,
}: AdminMembersManagerProps) {
  const [query, setQuery] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editSerialInput, setEditSerialInput] = useState('');
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editPhotoUrl, setEditPhotoUrl] = useState<string | undefined>(undefined);
  const [swapIfTaken, setSwapIfTaken] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [formError, setFormError] = useState('');
  const photoInputRef = useRef<HTMLInputElement | null>(null);

  const sortedMembers = useMemo(
    () => [...members].sort((a, b) => a.id - b.id),
    [members]
  );

  const filteredMembers = useMemo(() => {
    const q = query.trim().toLowerCase();
    const qEn = toEnDigits(q);
    if (!q) return sortedMembers;
    return sortedMembers.filter((m) => {
      const idStr = String(m.id);
      const bnIdStr = toBn(m.id);
      return (
        idStr.includes(qEn) ||
        bnIdStr.includes(q) ||
        m.name.toLowerCase().includes(q) ||
        toEnDigits(m.phone).toLowerCase().includes(qEn)
      );
    });
  }, [sortedMembers, query]);

  const startEdit = (m: Member) => {
    setEditingId(m.id);
    setEditSerialInput(String(m.id));
    setEditName(m.name);
    setEditPhone(m.phone);
    setEditPhotoUrl(m.photoUrl ?? '');
    setSwapIfTaken(true);
    setFormError('');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setFormError('');
  };

  const parsedTargetId = parseInt(toEnDigits(editSerialInput).replace(/\D/g, ''), 10);
  const conflictMember = useMemo(() => {
    if (editingId === null || !Number.isInteger(parsedTargetId) || parsedTargetId === editingId) {
      return null;
    }
    return members.find((m) => m.id === parsedTargetId) || null;
  }, [editingId, parsedTargetId, members]);

  const handleSaveEdit = async (oldMember: Member) => {
    setFormError('');
    if (!Number.isInteger(parsedTargetId) || parsedTargetId <= 0) {
      setFormError('সঠিক সিরিয়াল / সদস্য আইডি দিন (১ বা তার বেশি)।');
      return;
    }
    if (!editName.trim()) {
      setFormError('সদস্যের নাম খালি রাখা যাবে না।');
      return;
    }
    setBusyId(oldMember.id);
    try {
      const res = await onUpdateMemberFull({
        oldId: oldMember.id,
        newId: parsedTargetId,
        name: editName.trim(),
        phone: editPhone.trim(),
        photoUrl: editPhotoUrl,
        swapIfTaken,
      });
      if (!res.ok) {
        setFormError(res.error || 'সদস্যের তথ্য আপডেট করা যায়নি।');
        return;
      }
      setEditingId(null);
    } finally {
      setBusyId(null);
    }
  };

  const handleQuickSwap = async (member: Member, neighbor: Member) => {
    setBusyId(member.id);
    setFormError('');
    try {
      const res = await onUpdateMemberFull({
        oldId: member.id,
        newId: neighbor.id,
        name: member.name,
        phone: member.phone,
        swapIfTaken: true,
      });
      if (!res.ok) {
        setFormError(res.error || 'সিরিয়াল পরিবর্তন করা যায়নি।');
      }
    } finally {
      setBusyId(null);
    }
  };

  const handlePhotoFile = async (file: File | undefined) => {
    if (!file) return;
    setFormError('');
    try {
      const compressed = await compressFileToAvatar(file, 256);
      setEditPhotoUrl(compressed);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'ছবি প্রসেস করা যায়নি।');
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-base font-bold text-slate-900 dark:text-slate-100">
            সদস্য ব্যবস্থাপনা (সিরিয়াল, আইডি ও সকল তথ্য আপডেট)
          </h3>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            যেকোনো সদস্যের সিরিয়াল/আইডি, নাম, মোবাইল ও ছবি পরিবর্তন করুন। ডিপোজিট, ড্র ও পেমেন্ট
            হিস্টোরি স্বয়ংক্রিয়ভাবে অক্ষত থাকবে।
          </p>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="আইডি, নাম বা ফোন খুঁজুন..."
            className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pr-3 pl-9 text-xs dark:border-slate-700 dark:bg-slate-800"
          />
        </div>
      </div>

      {formError && editingId === null && (
        <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 dark:bg-red-950/40 dark:text-red-300">
          {formError}
        </p>
      )}

      <input
        ref={photoInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          void handlePhotoFile(f);
          e.target.value = '';
        }}
      />

      <div className="mt-4 divide-y divide-slate-100 dark:divide-slate-800">
        {filteredMembers.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-500">
            কোনো সদস্য খুঁজে পাওয়া যায়নি।
          </p>
        ) : (
          filteredMembers.map((m) => {
            const fullIdx = sortedMembers.findIndex((item) => item.id === m.id);
            const prevMember = fullIdx > 0 ? sortedMembers[fullIdx - 1] : null;
            const nextMember =
              fullIdx >= 0 && fullIdx < sortedMembers.length - 1
                ? sortedMembers[fullIdx + 1]
                : null;
            const isEditing = editingId === m.id;
            const isBusy = busyId === m.id;
            const total = getMemberTotal(m);
            const kisti = getMemberInstallments(m);

            return (
              <div key={m.id} className="py-3.5">
                {isEditing ? (
                  <div className="space-y-3 rounded-xl border border-teal-200 bg-teal-50/40 p-4 dark:border-teal-900/60 dark:bg-teal-950/20">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-xs font-bold text-teal-800 dark:text-teal-300">
                        সদস্য #{toBn(m.id)}-এর সকল তথ্য সংশোধন
                      </p>
                      <div className="flex items-center gap-2">
                        <MemberAvatar
                          memberId={Number.isInteger(parsedTargetId) && parsedTargetId > 0 ? parsedTargetId : m.id}
                          name={editName || m.name}
                          photoUrl={editPhotoUrl}
                          size="sm"
                        />
                        <button
                          type="button"
                          onClick={() => photoInputRef.current?.click()}
                          className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                        >
                          <Camera className="h-3.5 w-3.5" />
                          <span>ছবি বদলান</span>
                        </button>
                        {editPhotoUrl && (
                          <button
                            type="button"
                            onClick={() => setEditPhotoUrl('')}
                            className="inline-flex h-8 items-center rounded-lg border border-red-200 bg-red-50 px-2 text-[11px] font-semibold text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300"
                          >
                            মুছুন
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-12">
                      <div className="sm:col-span-3">
                        <label className="mb-1 block text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                          সিরিয়াল / সদস্য আইডি (#)
                        </label>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={editSerialInput}
                          onChange={(e) => setEditSerialInput(e.target.value)}
                          placeholder="যেমন: 1"
                          className="font-mono-num h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold dark:border-slate-700 dark:bg-slate-900"
                        />
                      </div>

                      <div className="sm:col-span-5">
                        <label className="mb-1 block text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                          সদস্যের নাম
                        </label>
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          placeholder="পূর্ণ নাম"
                          className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900"
                        />
                      </div>

                      <div className="sm:col-span-4">
                        <label className="mb-1 block text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                          মোবাইল নম্বর
                        </label>
                        <input
                          type="tel"
                          value={editPhone}
                          onChange={(e) => setEditPhone(e.target.value)}
                          placeholder="01XXXXXXXXX"
                          className="font-mono-num h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900"
                        />
                      </div>
                    </div>

                    {conflictMember && (
                      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
                        <div className="flex items-center gap-2">
                          <ArrowLeftRight className="h-4 w-4 shrink-0" />
                          <span>
                            আইডি #{toBn(conflictMember.id)} বর্তমানে{' '}
                            <strong>{conflictMember.name}</strong>-এর নামে আছে।
                          </span>
                        </div>
                        <label className="inline-flex cursor-pointer items-center gap-1.5 font-semibold">
                          <input
                            type="checkbox"
                            checked={swapIfTaken}
                            onChange={(e) => setSwapIfTaken(e.target.checked)}
                            className="h-4 w-4 rounded accent-teal-700"
                          />
                          <span>
                            #{toBn(m.id)} ও #{toBn(conflictMember.id)} অদল-বদল (Swap) করুন
                          </span>
                        </label>
                      </div>
                    )}

                    {formError && (
                      <p className="rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 dark:bg-red-950/40 dark:text-red-300">
                        {formError}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => void handleSaveEdit(m)}
                        className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-teal-700 px-4 text-xs font-semibold text-white hover:bg-teal-800 disabled:opacity-50"
                      >
                        <Check className="h-3.5 w-3.5" />
                        <span>{isBusy ? 'সংরক্ষণ হচ্ছে...' : 'পরিবর্তন সংরক্ষণ করুন'}</span>
                      </button>
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={cancelEdit}
                        className="inline-flex h-10 items-center gap-1 rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                      >
                        <X className="h-3.5 w-3.5" />
                        <span>বাতিল</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="font-mono-num w-9 shrink-0 text-center text-xs font-bold text-teal-700 dark:text-teal-400">
                        #{toBn(m.id)}
                      </span>
                      <MemberAvatar
                        memberId={m.id}
                        name={m.name}
                        photoUrl={m.photoUrl}
                        size="sm"
                      />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-slate-900 dark:text-slate-100">
                          {m.name}
                        </p>
                        <p className="font-mono-num mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                          {m.phone || 'নম্বর নেই'} · ৳ {toBn(total)} · {toBn(kisti)} কিস্তি
                        </p>
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-1.5">
                      <button
                        type="button"
                        disabled={!prevMember || isBusy || Boolean(query.trim())}
                        title="সিরিয়াল ১ ধাপ উপরে তুলুন"
                        onClick={() => prevMember && void handleQuickSwap(m, prevMember)}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-35 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                      >
                        <ArrowUp className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={!nextMember || isBusy || Boolean(query.trim())}
                        title="সিরিয়াল ১ ধাপ নিচে নামান"
                        onClick={() => nextMember && void handleQuickSwap(m, nextMember)}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-35 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                      >
                        <ArrowDown className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => startEdit(m)}
                        className="inline-flex h-9 items-center gap-1 rounded-lg bg-slate-900 px-3 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50 dark:bg-teal-700 dark:hover:bg-teal-600"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                        <span>এডিট</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onOpenMember(m.id)}
                        title="প্রোফাইল ও ডিপোজিট দেখুন"
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => onDeleteMember(m.id)}
                        title="সদস্য মুছুন"
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 disabled:opacity-50 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-400"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
