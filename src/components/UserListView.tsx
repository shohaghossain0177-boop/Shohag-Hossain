import {
  Clock,
  Laptop,
  LogIn,
  LogOut,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  UserCheck,
  Users,
} from 'lucide-react';
import { useState } from 'react';
import { toBn } from '../data/defaultData';
import type { ActiveSessionUser, RegisteredUserRecord, UserRole } from '../types/unity';

interface UserListViewProps {
  onlineSessions: ActiveSessionUser[];
  registeredUsers: RegisteredUserRecord[];
  currentUserEmail: string | null;
  currentUserDisplayName: string | null;
  currentUserRole: UserRole;
  isAdmin: boolean;
  loading: boolean;
  onRefresh: () => void;
  onGoogleSignIn: () => Promise<void>;
  onGoogleSignOut: () => Promise<void>;
  onUpdateUserRole: (target: string, role: 'cashier' | 'member') => Promise<void>;
}

function getRoleMeta(role: UserRole) {
  if (role === 'admin') {
    return {
      label: 'সুপার এডমিন',
      cls: 'bg-teal-100 text-teal-800 dark:bg-teal-950/70 dark:text-teal-300',
    };
  }
  if (role === 'cashier') {
    return {
      label: 'ক্যাশিয়ার / সহ-এডমিন',
      cls: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/70 dark:text-indigo-300',
    };
  }
  if (role === 'member') {
    return {
      label: 'লগইন সদস্য',
      cls: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300',
    };
  }
  return {
    label: 'এক্টিভ ভিজিটর',
    cls: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  };
}

function formatLastSeen(iso: string): string {
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return 'সম্প্রতি';
  const diffSec = Math.max(0, Math.floor((Date.now() - dt.getTime()) / 1000));
  if (diffSec < 90) return 'এইমাত্র এক্টিভ';
  if (diffSec < 3600) return `${toBn(Math.floor(diffSec / 60))} মিনিট আগে`;
  if (diffSec < 86400) return `${toBn(Math.floor(diffSec / 3600))} ঘণ্টা আগে`;
  return dt.toLocaleDateString('bn-BD');
}

function isMobileDevice(device: string): boolean {
  return /android|iphone|ios|mobile/i.test(device);
}

export function UserListView({
  onlineSessions,
  registeredUsers,
  currentUserEmail,
  currentUserDisplayName,
  currentUserRole,
  isAdmin,
  loading,
  onRefresh,
  onGoogleSignIn,
  onGoogleSignOut,
  onUpdateUserRole,
}: UserListViewProps) {
  const [tab, setTab] = useState<'online' | 'registered'>('online');
  const [authBusy, setAuthBusy] = useState(false);
  const [roleBusyUid, setRoleBusyUid] = useState<string | null>(null);

  const onlineLoggedInCount = registeredUsers.filter((u) => u.isOnline).length;
  const cashierCount = registeredUsers.filter((u) => u.role === 'cashier').length;

  const handleSignIn = async () => {
    setAuthBusy(true);
    try {
      await onGoogleSignIn();
    } finally {
      setAuthBusy(false);
    }
  };

  const handleSignOut = async () => {
    setAuthBusy(true);
    try {
      await onGoogleSignOut();
    } finally {
      setAuthBusy(false);
    }
  };

  const handleToggleRole = async (u: RegisteredUserRecord) => {
    setRoleBusyUid(u.uid);
    try {
      const nextRole = u.role === 'cashier' ? 'member' : 'cashier';
      await onUpdateUserRole(u.email || u.uid, nextRole);
    } finally {
      setRoleBusyUid(null);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header & Live Summary */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-teal-700 dark:text-teal-400">
              লাইভ ইউজার ট্র্যাকার
            </p>
            <h2 className="font-display mt-0.5 text-xl font-bold text-slate-900 dark:text-slate-100">
              ইউজার লিস্ট (লগইন ও এক্টিভ)
            </h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              যারা বর্তমানে অ্যাপে এক্টিভ আছেন এবং যারা অ্যাকাউন্টে লগইন করেছেন তাদের লাইভ তালিকা।
            </p>
          </div>
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>রিফ্রেশ</span>
          </button>
        </div>

        {/* Summary Metrics */}
        <div className="mt-4 grid grid-cols-3 gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">এখন অনলাইন</p>
            <p className="font-mono-num mt-0.5 flex items-center gap-1.5 text-xl font-bold text-emerald-700 dark:text-emerald-400">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
              {toBn(onlineSessions.length)} জন
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">লগইনকৃত ইউজার</p>
            <p className="font-mono-num mt-0.5 text-xl font-bold text-slate-900 dark:text-slate-100">
              {toBn(registeredUsers.length)} জন
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              অনলাইন: {toBn(onlineLoggedInCount)} জন
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">ক্যাশিয়ার / সহ-এডমিন</p>
            <p className="font-mono-num mt-0.5 text-xl font-bold text-indigo-700 dark:text-indigo-400">
              {toBn(cashierCount)} জন
            </p>
          </div>
        </div>
      </div>

      {/* Current User Account Card (Allows any Member to Sign In with Google and appear in the list) */}
      <div className="rounded-2xl border border-teal-200 bg-teal-50/70 p-4 dark:border-teal-900/60 dark:bg-teal-950/30">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-teal-800 dark:text-teal-300">
              আপনার বর্তমান সেশন
            </p>
            {currentUserEmail ? (
              <p className="mt-0.5 text-sm font-bold text-slate-900 dark:text-slate-100">
                {currentUserDisplayName || currentUserEmail}{' '}
                <span className="ml-1.5 rounded-md bg-white px-2 py-0.5 text-[11px] font-semibold text-teal-800 dark:bg-slate-900 dark:text-teal-300">
                  {getRoleMeta(currentUserRole).label}
                </span>
              </p>
            ) : (
              <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-300">
                Google দিয়ে সাইন-ইন করলে আপনার নাম ও স্ট্যাটাস লগইনকৃত ইউজার তালিকায় যুক্ত হবে।
              </p>
            )}
          </div>

          {currentUserEmail ? (
            <button
              type="button"
              disabled={authBusy}
              onClick={() => void handleSignOut()}
              className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>সাইন আউট</span>
            </button>
          ) : (
            <button
              type="button"
              disabled={authBusy}
              onClick={() => void handleSignIn()}
              className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-teal-700 px-4 text-xs font-semibold text-white hover:bg-teal-800 disabled:opacity-60"
            >
              <LogIn className="h-3.5 w-3.5" />
              <span>{authBusy ? 'সাইন-ইন হচ্ছে...' : 'Google দিয়ে লগইন করুন'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Segmented Tabs */}
      <div className="grid grid-cols-2 gap-1 rounded-xl bg-slate-200/70 p-1 dark:bg-slate-800">
        <button
          type="button"
          onClick={() => setTab('online')}
          className={`h-10 rounded-lg text-xs font-semibold transition-colors ${
            tab === 'online'
              ? 'bg-white text-emerald-700 shadow-xs dark:bg-slate-900 dark:text-emerald-400'
              : 'text-slate-600 dark:text-slate-300'
          }`}
        >
          এখন এক্টিভ ({toBn(onlineSessions.length)} জন)
        </button>
        <button
          type="button"
          onClick={() => setTab('registered')}
          className={`h-10 rounded-lg text-xs font-semibold transition-colors ${
            tab === 'registered'
              ? 'bg-white text-teal-700 shadow-xs dark:bg-slate-900 dark:text-teal-400'
              : 'text-slate-600 dark:text-slate-300'
          }`}
        >
          লগইনকৃত সকল ইউজার ({toBn(registeredUsers.length)} জন)
        </button>
      </div>

      {/* Tab 1: Live Active Online Sessions */}
      {tab === 'online' && (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-800">
            <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-slate-100">
              <Users className="h-4 w-4 text-emerald-600" />
              <span>বর্তমানে অনলাইন / এক্টিভ ইউজার</span>
            </h3>
            <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
              লাইভ সিঙ্ক চালু
            </span>
          </div>

          {onlineSessions.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500">
              বর্তমানে কোনো এক্টিভ সেশন পাওয়া যায়নি।
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {onlineSessions.map((sess) => {
                const roleMeta = getRoleMeta(sess.role);
                const mobile = isMobileDevice(sess.device);
                const initial = (sess.displayName || 'U').slice(0, 1).toUpperCase();
                return (
                  <div
                    key={sess.sessionId}
                    className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="relative shrink-0">
                        {sess.photoUrl ? (
                          <img
                            src={sess.photoUrl}
                            alt={sess.displayName}
                            referrerPolicy="no-referrer"
                            className="h-10 w-10 rounded-full object-cover ring-2 ring-emerald-500/40"
                          />
                        ) : (
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-100 text-sm font-bold text-teal-800 dark:bg-teal-950 dark:text-teal-300">
                            {initial}
                          </div>
                        )}
                        <span className="absolute right-0 bottom-0 h-3 w-3 rounded-full border-2 border-white bg-emerald-500 dark:border-slate-900" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <p className="truncate text-sm font-bold text-slate-900 dark:text-slate-100">
                            {sess.displayName}
                          </p>
                          <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${roleMeta.cls}`}>
                            {roleMeta.label}
                          </span>
                        </div>
                        <p className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                          <span className="inline-flex items-center gap-1">
                            {mobile ? <Smartphone className="h-3 w-3" /> : <Laptop className="h-3 w-3" />}
                            {sess.device}
                          </span>
                          <span>·</span>
                          <span>পেজ: {sess.currentPage}</span>
                          {sess.email && (
                            <>
                              <span>·</span>
                              <span className="font-mono-num text-[11px]">{sess.email}</span>
                            </>
                          )}
                        </p>
                      </div>
                    </div>

                    <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      অনলাইন
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: All Registered / Logged-in Users from PostgreSQL */}
      {tab === 'registered' && (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-800">
            <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-slate-100">
              <UserCheck className="h-4 w-4 text-teal-700 dark:text-teal-400" />
              <span>লগইনকৃত সকল অ্যাকাউন্ট</span>
            </h3>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              মোট {toBn(registeredUsers.length)} জন
            </span>
          </div>

          {registeredUsers.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500">
              এখনো কোনো ইউজার Google অ্যাকাউন্ট দিয়ে লগইন করেননি।
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {registeredUsers.map((u) => {
                const roleMeta = getRoleMeta(u.role);
                const initial = (u.displayName || u.email || 'U').slice(0, 1).toUpperCase();
                return (
                  <div
                    key={u.uid}
                    className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="relative shrink-0">
                        {u.photoUrl ? (
                          <img
                            src={u.photoUrl}
                            alt={u.displayName}
                            referrerPolicy="no-referrer"
                            className="h-10 w-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                            {initial}
                          </div>
                        )}
                        <span
                          className={`absolute right-0 bottom-0 h-3 w-3 rounded-full border-2 border-white dark:border-slate-900 ${
                            u.isOnline ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'
                          }`}
                        />
                      </div>

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <p className="truncate text-sm font-bold text-slate-900 dark:text-slate-100">
                            {u.displayName}
                          </p>
                          <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${roleMeta.cls}`}>
                            {roleMeta.label}
                          </span>
                        </div>
                        <p className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                          <span className="font-mono-num">{u.email}</span>
                          <span>·</span>
                          <span className="inline-flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {u.isOnline ? 'এখন অনলাইন' : formatLastSeen(u.lastSeenAt)}
                          </span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {isAdmin && u.role !== 'admin' && (
                        <button
                          type="button"
                          disabled={roleBusyUid === u.uid}
                          onClick={() => void handleToggleRole(u)}
                          className={`inline-flex h-9 items-center gap-1 rounded-lg px-3 text-xs font-semibold transition-colors disabled:opacity-60 ${
                            u.role === 'cashier'
                              ? 'border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300'
                              : 'border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:border-indigo-900/50 dark:bg-indigo-950/40 dark:text-indigo-300'
                          }`}
                        >
                          <ShieldCheck className="h-3.5 w-3.5" />
                          <span>{u.role === 'cashier' ? 'ক্যাশিয়ার সরান' : 'ক্যাশিয়ার করুন'}</span>
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
    </div>
  );
}
