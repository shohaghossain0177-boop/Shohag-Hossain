import {
  ArrowDown,
  ArrowUp,
  BarChart3,
  Bell,
  BellRing,
  BookOpen,
  CalendarRange,
  Camera,
  CheckCircle2,
  ClipboardList,
  Clock,
  CloudUpload,
  Code2,
  Copy,
  Download,
  History,
  ImagePlus,
  LogOut,
  Pin,
  Play,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Send,
  Settings,
  ShieldCheck,
  Sliders,
  Smartphone,
  Trash2,
  Users,
  XCircle,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { AdminDepositsDashboard } from './AdminDepositsDashboard';
import { AdminMembersManager, type MemberFullUpdatePayload } from './AdminMembersManager';
import { AppLogo } from './AppLogo';
import {
  compressFileToAvatar,
  generateAppIconBundle,
  isSafeAppIconDataUrl,
  isSafeRasterPhotoDataUrl,
} from '../utils/avatarLibrary';
import {
  BUILTIN_TOGGLE_META,
  formatDateBn,
  getDatesInRange,
  getMemberTotal,
  getNoticeDurationLabel,
  getTimeRemainingBn,
  getTodayISO,
  toBn,
} from '../data/defaultData';
import type {
  AdminTab,
  AuditLogEntry,
  AutomatedPopup,
  BuiltinToggleKey,
  CustomToggle,
  NoticeDuration,
  NotificationCategory,
  NotificationRepeatMode,
  PageRoute,
  PaymentRequest,
  PopupTriggerType,
  RegisteredUserRecord,
  ScheduledNotification,
  UnityDatabase,
} from '../types/unity';
import {
  NOTIFICATION_PRESETS,
  computeScheduledTimestampMs,
  dispatchBrowserNotification,
  formatScheduleLabelBn,
  getNotificationPermissionState,
  requestNotificationPermission,
  type BrowserNotificationPermission,
} from '../utils/notificationScheduler';

interface AdminPanelViewProps {
  db: UnityDatabase;
  isSuperAdmin: boolean;
  isCashier: boolean;
  activeTab: AdminTab;
  onChangeTab: (tab: AdminTab) => void;
  onOpenMember: (memberId: number) => void;
  onLogout: () => void;
  // Payment requests, Audit logs, Cashier roles
  paymentRequests: PaymentRequest[];
  auditLogs: AuditLogEntry[];
  registeredUsers: RegisteredUserRecord[];
  onRefreshAdminFeeds: () => void;
  onReviewPaymentRequest: (
    requestId: string,
    decision: 'approved' | 'rejected',
    reviewNote?: string
  ) => Promise<void>;
  onUpdateUserRole: (
    targetEmailOrUid: string,
    role: 'cashier' | 'member',
    displayName?: string
  ) => Promise<void>;
  // Toggles
  onToggleBuiltin: (key: BuiltinToggleKey, enabled: boolean) => void;
  onAddCustomToggle: (toggle: Omit<CustomToggle, 'id' | 'createdAtMs'>) => void;
  onToggleCustom: (id: string, enabled: boolean) => void;
  onDeleteCustomToggle: (id: string) => void;
  // Rules
  onAddRule: (title: string, description: string) => void;
  onUpdateRule: (id: string, title: string, description: string) => void;
  onDeleteRule: (id: string) => void;
  onMoveRule: (index: number, direction: 'up' | 'down') => void;
  onResetDefaultRules: () => void;
  // Notices & Popups
  onPinNotice: (title: string, body: string, duration: NoticeDuration) => void;
  onUnpinNotice: () => void;
  onAddPopup: (popup: Omit<AutomatedPopup, 'id'>) => void;
  onTogglePopup: (id: string, enabled: boolean) => void;
  onDeletePopup: (id: string) => void;
  onTestPopup: (popup: AutomatedPopup) => void;
  onUpdateTickers: (homeTicker: string, bkashTicker: string) => void;
  // Push Notification Scheduler (Notifications API)
  onAddScheduledNotification: (
    item: Omit<ScheduledNotification, 'id' | 'createdAtMs' | 'createdBy'>
  ) => void;
  onToggleScheduledNotification: (id: string, enabled: boolean) => void;
  onDeleteScheduledNotification: (id: string) => void;
  onSendScheduledNotificationNow: (id: string) => void;
  // Bulk Deposits
  onBulkRangeDeposit: (
    memberIds: number[],
    startISO: string,
    endISO: string,
    amount: number,
    note: string,
    skipDuplicates: boolean
  ) => void;
  // Updates, Code & Settings
  standaloneHtmlCode: string;
  onCopyText: (text: string, msg: string) => void;
  onDownloadUpdatedHtml: () => void;
  onSaveJsonCode: (rawJson: string) => void;
  onPublishAppUpdate: (version: string, notes: string) => Promise<void>;
  onDownloadJsonBackup: () => void;
  onUpdateSettings: (patch: {
    darkMode: boolean;
    themeColor: string;
    bkashNumber: string;
    adminPhone: string;
    fundTarget: number;
    sortBy: 'id' | 'amount_desc';
    cloudSyncUrl: string;
    updateManifestUrl: string;
  }) => void;
  onUpdateAppLogo: (logoUrl: string) => Promise<{ ok: boolean; error?: string }>;
  onUpdateAppIcon: (payload: {
    icon512: string;
    icon192: string;
    iconMaskable512: string;
    syncedLogo320?: string;
  }) => Promise<{ ok: boolean; error?: string }>;
  onUpdateMemberFull: (
    payload: MemberFullUpdatePayload
  ) => Promise<{ ok: boolean; error?: string; memberId?: number }>;
  onDeleteMember: (memberId: number) => void;
  onChangeAdminCredentials: (adminName: string, newPin: string) => Promise<void>;
  onResetAllData: () => void;
  adminAccountEmail: string | null;
  isSyncingCloud: boolean;
  onConnectGoogleAdmin: () => Promise<void>;
  onForceSyncCloud: () => Promise<void>;
  onImportJsonBackup: (file: File) => void;
}

const THEME_SWATCHES = [
  { name: 'টিল (ডিফল্ট)', hex: '#0f766e' },
  { name: 'নীল', hex: '#0284c7' },
  { name: 'সবুজ', hex: '#15803d' },
  { name: 'ইন্ডিগো', hex: '#4338ca' },
  { name: 'মেরুন', hex: '#be123c' },
];

function suggestNextVersion(current: string): string {
  const parts = current.split('.').map((p) => parseInt(p, 10) || 0);
  if (parts.length < 3) return '2.0.1';
  return `${parts[0]}.${parts[1]}.${parts[2] + 1}`;
}

export function AdminPanelView(props: AdminPanelViewProps) {
  const { db, activeTab, onChangeTab, onLogout } = props;

  // Custom Toggle form state
  const [ctTitle, setCtTitle] = useState('');
  const [ctSubtitle, setCtSubtitle] = useState('');
  const [ctContent, setCtContent] = useState('');
  const [ctPhone, setCtPhone] = useState('');

  // Rule form state
  const [ruleTitle, setRuleTitle] = useState('');
  const [ruleDesc, setRuleDesc] = useState('');
  const [editRuleId, setEditRuleId] = useState<string | null>(null);
  const [editRuleTitle, setEditRuleTitle] = useState('');
  const [editRuleDesc, setEditRuleDesc] = useState('');

  // Pinned Notice state
  const [noticeTitle, setNoticeTitle] = useState(db.appConfig.pinnedNotice?.title || '');
  const [noticeBody, setNoticeBody] = useState(db.appConfig.pinnedNotice?.body || '');
  const [noticeDuration, setNoticeDuration] = useState<NoticeDuration>(
    db.appConfig.pinnedNotice?.duration || '1d'
  );

  // Automated Popup form state
  const [popTitle, setPopTitle] = useState('');
  const [popMessage, setPopMessage] = useState('');
  const [popTrigger, setPopTrigger] = useState<PopupTriggerType>('daily_time');
  const [popTime, setPopTime] = useState('19:30');
  const [popFreq, setPopFreq] = useState<'once_per_day' | 'once_per_session'>('once_per_day');
  const [popActionLabel, setPopActionLabel] = useState('দৈনিক তালিকা দেখুন');
  const [popActionTarget, setPopActionTarget] = useState<PageRoute | ''>('dailyPayments');

  // Tickers
  const [homeTicker, setHomeTicker] = useState(db.appConfig.homeTickerText);
  const [bkashTicker, setBkashTicker] = useState(db.appConfig.bkashTickerText);

  // Push Notification Scheduler state (Notifications API)
  const [notifPerm, setNotifPerm] = useState<BrowserNotificationPermission>(() =>
    getNotificationPermissionState()
  );
  const [pushCategory, setPushCategory] = useState<NotificationCategory>('upcoming_payment');
  const [pushTitle, setPushTitle] = useState('');
  const [pushBody, setPushBody] = useState('');
  const [pushTiming, setPushTiming] = useState<'now' | 'once' | 'daily'>('once');
  const [pushDate, setPushDate] = useState(getTodayISO());
  const [pushTime, setPushTime] = useState('19:30');
  const [pushTargetPage, setPushTargetPage] = useState<PageRoute | ''>('payment');
  const [pushStatusMsg, setPushStatusMsg] = useState<string | null>(null);

  const scheduledNotifs = db.appConfig.scheduledNotifications || [];

  const handleEnableBrowserNotifs = async () => {
    const perm = await requestNotificationPermission();
    setNotifPerm(perm);
    if (perm === 'granted') {
      setPushStatusMsg('ব্রাউজার পুশ নোটিফিকেশন অনুমতি চালু হয়েছে!');
    } else if (perm === 'denied') {
      setPushStatusMsg('ব্রাউজার সেটিংস থেকে নোটিফিকেশন ব্লক করা আছে — সাইট সেটিংস থেকে Allow করুন।');
    } else {
      setPushStatusMsg('এই ডিভাইসে সরাসরি পুশ নোটিফিকেশন সমর্থিত নয়; ইন-অ্যাপ অ্যালার্ট চালু থাকবে।');
    }
  };

  const handleTestBrowserNotif = async () => {
    let perm = notifPerm;
    if (perm === 'default') {
      perm = await requestNotificationPermission();
      setNotifPerm(perm);
    }
    const res = await dispatchBrowserNotification({
      title: pushTitle.trim() || 'BARAKAH UNITY টেস্ট নোটিফিকেশন',
      body:
        pushBody.trim() ||
        'আসন্ন পেমেন্ট রিমাইন্ডার এবং জরুরি নোটিশ এইভাবে সদস্যদের ডিভাইসে পৌঁছাবে।',
      tag: `barakah_test_${Date.now()}`,
    });
    if (res.delivered) {
      setPushStatusMsg('টেস্ট পুশ নোটিফিকেশন সফলভাবে পাঠানো হয়েছে!');
    } else {
      setPushStatusMsg('নোটিফিকেশন দেখাতে প্রথমে ব্রাউজার অনুমতি (Allow) চালু করুন।');
    }
  };

  const handleCreateScheduledNotif = () => {
    const title = pushTitle.trim();
    const body = pushBody.trim();
    if (!title || !body) return;

    const repeatMode: NotificationRepeatMode = pushTiming === 'daily' ? 'daily' : 'once';
    const scheduledAtMs =
      pushTiming === 'now'
        ? Date.now()
        : computeScheduledTimestampMs(pushDate || getTodayISO(), pushTime || '19:30');

    props.onAddScheduledNotification({
      title,
      body,
      category: pushCategory,
      repeatMode,
      scheduledAtMs,
      dailyTime: pushTiming === 'daily' ? pushTime || '19:30' : undefined,
      enabled: true,
      lastSentAtMs: pushTiming === 'now' ? Date.now() : undefined,
      targetPage: pushTargetPage,
    });

    setPushTitle('');
    setPushBody('');
    setPushStatusMsg(
      pushTiming === 'now'
        ? 'পুশ নোটিফিকেশন সকল সক্রিয় সদস্যের কাছে পাঠানো হয়েছে!'
        : pushTiming === 'daily'
          ? `প্রতিদিন ${toBn(pushTime || '19:30')} টায় পুশ নোটিফিকেশন শিডিউল করা হয়েছে।`
          : 'নির্ধারিত সময়ের জন্য পুশ নোটিফিকেশন শিডিউল করা হয়েছে।'
    );
  };

  // Bulk Deposit state
  const [bulkStart, setBulkStart] = useState('2026-11-22');
  const [bulkEnd, setBulkEnd] = useState('2026-11-29');
  const [bulkAmount, setBulkAmount] = useState('100');
  const [bulkNote, setBulkNote] = useState('দৈনিক কিস্তি');
  const [bulkSkipDup, setBulkSkipDup] = useState(true);
  const [selectedBulkIds, setSelectedBulkIds] = useState<number[]>([]);

  // Publish App Update state
  const [nextVersion, setNextVersion] = useState(() => suggestNextVersion(db.appConfig.appVersion || '2.0.0'));
  const [releaseNotes, setReleaseNotes] = useState('');
  const [publishing, setPublishing] = useState(false);

  // Live JSON Code editor state
  const [jsonCodeInput, setJsonCodeInput] = useState(() => JSON.stringify(db, null, 2));
  useEffect(() => {
    setJsonCodeInput(JSON.stringify(db, null, 2));
  }, [db]);

  // Settings state
  const [darkMode, setDarkMode] = useState(db.appConfig.darkMode);
  const [themeColor, setThemeColor] = useState(db.appConfig.themeColor || '#0f766e');
  const [bkashNumber, setBkashNumber] = useState(db.appConfig.bkashNumber || '01303768168');
  const [adminPhone, setAdminPhone] = useState(db.appConfig.adminPhone || '01607703566');
  const [fundTarget, setFundTarget] = useState(String(db.appConfig.fundTarget || 0));
  const [sortBy, setSortBy] = useState<'id' | 'amount_desc'>(db.appConfig.sortBy || 'id');
  const [cloudSyncUrl, setCloudSyncUrl] = useState(db.cloudSyncUrl || '');
  const [updateManifestUrl, setUpdateManifestUrl] = useState(db.appConfig.updateManifestUrl || '');
  const [adminNameInput, setAdminNameInput] = useState(db.adminName || 'Shohag Hossain');
  const [newPinInput, setNewPinInput] = useState('');
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoError, setLogoError] = useState('');
  const logoGalleryInputRef = useRef<HTMLInputElement | null>(null);
  const logoCameraInputRef = useRef<HTMLInputElement | null>(null);

  const [iconUploading, setIconUploading] = useState(false);
  const [iconError, setIconError] = useState('');
  const [iconSuccessMsg, setIconSuccessMsg] = useState('');
  const [syncIconToLogo, setSyncIconToLogo] = useState(true);
  const iconGalleryInputRef = useRef<HTMLInputElement | null>(null);
  const iconCameraInputRef = useRef<HTMLInputElement | null>(null);

  const handleSelectAppLogoFile = async (file: File | undefined) => {
    if (!file) return;
    setLogoError('');
    setLogoUploading(true);
    try {
      const compressed = await compressFileToAvatar(file, 320);
      const res = await props.onUpdateAppLogo(compressed);
      if (!res.ok) {
        setLogoError(res.error || 'লোগো সংরক্ষণ করা যায়নি।');
      }
    } catch (err) {
      setLogoError(err instanceof Error ? err.message : 'লোগো আপলোড করা যায়নি');
    } finally {
      setLogoUploading(false);
    }
  };

  const handleSelectAppIconFile = async (file: File | undefined) => {
    if (!file) return;
    setIconError('');
    setIconSuccessMsg('');
    setIconUploading(true);
    try {
      const bundle = await generateAppIconBundle(file, db.appConfig.themeColor || '#0f766e');
      const res = await props.onUpdateAppIcon({
        icon512: bundle.icon512,
        icon192: bundle.icon192,
        iconMaskable512: bundle.iconMaskable512,
        syncedLogo320: syncIconToLogo ? bundle.profileLogo320 : undefined,
      });
      if (!res.ok) {
        setIconError(res.error || 'অ্যাপ আইকন সার্ভারে সেভ হয়নি।');
      } else {
        setIconSuccessMsg(
          'সার্ভারে সফলভাবে সেভ হয়েছে (১৯২×১৯২, ৫১২×৫১২ ও মাস্কেবল আইকন প্রস্তুত)।'
        );
      }
    } catch (err) {
      setIconError(err instanceof Error ? err.message : 'অ্যাপ আইকন আপলোড করা যায়নি');
    } finally {
      setIconUploading(false);
    }
  };

  // Cashier role invitation & audit filter state
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [roleBusy, setRoleBusy] = useState(false);
  const [reviewBusyId, setReviewBusyId] = useState<string | null>(null);
  const [auditQuery, setAuditQuery] = useState('');

  const pendingReqCount = props.paymentRequests.filter((r) => r.status === 'pending').length;

  const allTabs: Array<{
    key: AdminTab;
    label: string;
    icon: typeof Sliders;
    superOnly?: boolean;
    badge?: number;
  }> = [
    { key: 'dashboard', label: 'ড্যাশবোর্ড', icon: BarChart3 },
    { key: 'members', label: 'সদস্য ব্যবস্থাপনা', icon: Users, superOnly: true },
    { key: 'requests', label: 'পেমেন্ট রিকোয়েস্ট', icon: ClipboardList, badge: pendingReqCount },
    { key: 'toggles', label: 'টুগল কন্ট্রোল', icon: Sliders, superOnly: true },
    { key: 'rules', label: 'নিয়মাবলি', icon: BookOpen, superOnly: true },
    { key: 'notices', label: 'নোটিশ ও পপ-আপ', icon: BellRing, superOnly: true },
    { key: 'bulk', label: 'রেঞ্জ ডিপোজিট', icon: CalendarRange, superOnly: true },
    { key: 'roles', label: 'ক্যাশিয়ার / রোল', icon: ShieldCheck, superOnly: true },
    { key: 'audit', label: 'অডিট লগ', icon: History },
    { key: 'updates', label: 'আপডেট পাবলিশ', icon: CloudUpload, superOnly: true },
    { key: 'code', label: 'HTML / JSON কোড', icon: Code2, superOnly: true },
    { key: 'settings', label: 'সেটিংস', icon: Settings, superOnly: true },
  ];

  const tabs = props.isSuperAdmin ? allTabs : allTabs.filter((t) => !t.superOnly);
  const effectiveTab: AdminTab = tabs.some((t) => t.key === activeTab) ? activeTab : 'dashboard';

  const bulkDates = getDatesInRange(bulkStart, bulkEnd);
  const bulkEstimatedTotal = selectedBulkIds.length * bulkDates.length * (Number(bulkAmount) || 0);
  const activePinned =
    db.appConfig.pinnedNotice && Date.now() < db.appConfig.pinnedNotice.expiresAtMs
      ? db.appConfig.pinnedNotice
      : null;

  const filteredAuditLogs = props.auditLogs.filter((log) => {
    const q = auditQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      log.action.toLowerCase().includes(q) ||
      log.actorName.toLowerCase().includes(q) ||
      log.details.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-5">
      {/* Admin Header Strip */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <div>
          <p className="text-xs font-medium text-teal-700 dark:text-teal-400">
            {props.isSuperAdmin ? (
              <>
                কন্ট্রোল সেন্টার · {db.adminName}
                <span className="ml-1 font-sans text-[11px] font-medium tracking-wider opacity-45">
                  Admin
                </span>
              </>
            ) : (
              'ক্যাশিয়ার / সহ-এডমিন কন্ট্রোল প্যানেল'
            )}
          </p>
          <h2 className="font-display text-lg font-bold text-slate-900 dark:text-slate-100">
            {props.isSuperAdmin ? 'অ্যাপ পরিচালনা ও কনফিগারেশন' : 'পেমেন্ট অনুমোদন ও কার্যক্রম'}
          </h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {props.isSuperAdmin && !props.adminAccountEmail && (
            <button
              type="button"
              onClick={() => void props.onConnectGoogleAdmin()}
              className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-teal-700 px-3.5 text-xs font-semibold text-white hover:bg-teal-800"
            >
              <CloudUpload className="h-3.5 w-3.5" />
              <span>Google এডমিন সংযোগ</span>
            </button>
          )}
          <button
            type="button"
            onClick={onLogout}
            className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3.5 text-xs font-semibold text-red-700 hover:bg-red-100 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>লগআউট</span>
          </button>
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {tabs.map((t) => {
          const Icon = t.icon;
          const active = effectiveTab === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => onChangeTab(t.key)}
              className={`relative inline-flex h-11 items-center justify-center gap-1.5 rounded-xl border px-3 text-xs font-semibold transition-colors whitespace-nowrap ${
                active
                  ? 'border-slate-900 bg-slate-900 text-white dark:border-teal-600 dark:bg-teal-600'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800'
              }`}
            >
              <Icon className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{t.label}</span>
              {Boolean(t.badge && t.badge > 0) && (
                <span className="font-mono-num ml-0.5 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-600 px-1.5 text-[10px] font-bold text-white">
                  {toBn(t.badge!)}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* TAB DASHBOARD: TOP 5 DEPOSITS ANALYTICS (RECHARTS) */}
      {effectiveTab === 'dashboard' && (
        <AdminDepositsDashboard
          db={db}
          paymentRequests={props.paymentRequests}
          isSuperAdmin={props.isSuperAdmin}
          onOpenMember={props.onOpenMember}
          onOpenTab={onChangeTab}
        />
      )}

      {/* TAB MEMBERS: FULL MEMBER MANAGEMENT (SERIAL, ID, NAME, PHONE, PHOTO) */}
      {effectiveTab === 'members' && props.isSuperAdmin && (
        <AdminMembersManager
          members={db.members}
          onUpdateMemberFull={props.onUpdateMemberFull}
          onDeleteMember={props.onDeleteMember}
          onOpenMember={props.onOpenMember}
        />
      )}

      {/* TAB 0: PENDING BKASH PAYMENT REQUESTS QUEUE */}
      {effectiveTab === 'requests' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="font-display text-base font-bold text-slate-900 dark:text-slate-100">
                বিকাশ পেমেন্ট রিকোয়েস্ট অনুমোদন ({toBn(pendingReqCount)}টি অপেক্ষমাণ)
              </h3>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                অনুমোদন করলে সাথে সাথে সদস্যের হিসাবে জমা যুক্ত হবে এবং সকল ডিভাইসে লাইভ আপডেট যাবে।
              </p>
            </div>
            <button
              type="button"
              onClick={props.onRefreshAdminFeeds}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>রিফ্রেশ</span>
            </button>
          </div>

          <div className="mt-4 divide-y divide-slate-100 dark:divide-slate-800">
            {props.paymentRequests.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-500">
                এখনো কোনো বিকাশ পেমেন্ট রিকোয়েস্ট জমা হয়নি।
              </p>
            ) : (
              props.paymentRequests.map((req) => (
                <div
                  key={req.id}
                  className="flex flex-wrap items-center justify-between gap-3 py-3.5"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      #{toBn(req.memberId)} {req.memberName} —{' '}
                      <span className="font-mono-num text-pink-700 dark:text-pink-400">
                        ৳ {toBn(req.amount)}
                      </span>
                    </p>
                    <p className="font-mono-num mt-0.5 text-xs text-slate-600 dark:text-slate-300">
                      TrxID: <strong>{req.trxId}</strong> · প্রেরক: {req.senderPhone} · তারিখ:{' '}
                      {formatDateBn(req.date)}
                    </p>
                    {req.note && (
                      <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                        মন্তব্য: {req.note}
                      </p>
                    )}
                    {req.status !== 'pending' && req.reviewedBy && (
                      <p className="mt-0.5 text-[11px] text-slate-400">
                        যাচাইকারী: {req.reviewedBy}
                      </p>
                    )}
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    {req.status === 'pending' ? (
                      <>
                        <button
                          type="button"
                          disabled={reviewBusyId === req.id}
                          onClick={async () => {
                            setReviewBusyId(req.id);
                            try {
                              await props.onReviewPaymentRequest(req.id, 'approved');
                            } finally {
                              setReviewBusyId(null);
                            }
                          }}
                          className="inline-flex h-9 items-center gap-1 rounded-lg bg-emerald-700 px-3 text-xs font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span>অনুমোদন</span>
                        </button>
                        <button
                          type="button"
                          disabled={reviewBusyId === req.id}
                          onClick={async () => {
                            setReviewBusyId(req.id);
                            try {
                              await props.onReviewPaymentRequest(req.id, 'rejected', 'যাচাইয়ে মেলেনি');
                            } finally {
                              setReviewBusyId(null);
                            }
                          }}
                          className="inline-flex h-9 items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-3 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300"
                        >
                          <XCircle className="h-3.5 w-3.5" />
                          <span>বাতিল</span>
                        </button>
                      </>
                    ) : req.status === 'approved' ? (
                      <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                        <CheckCircle2 className="h-3.5 w-3.5" /> অনুমোদিত
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-lg bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700 dark:bg-red-950/50 dark:text-red-300">
                        <XCircle className="h-3.5 w-3.5" /> বাতিল
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB ROLES: MULTI-CASHIER / SUB-ADMIN RBAC (SUPER ADMIN ONLY) */}
      {effectiveTab === 'roles' && props.isSuperAdmin && (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 lg:col-span-5 dark:border-slate-800 dark:bg-slate-900">
            <h3 className="font-display text-base font-bold text-slate-900 dark:text-slate-100">
              নতুন ক্যাশিয়ার / সহ-এডমিন নিয়োগ দিন
            </h3>
            <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
              ক্যাশিয়াররা কিস্তি আদায়, বিকাশ পেমেন্ট অনুমোদন ও ড্র যুক্ত করতে পারবেন। তবে সদস্য মুছা,
              পাসওয়ার্ড পরিবর্তন বা ডেটা রিসেট করতে পারবেন না।
            </p>
            <div className="mt-4 space-y-3">
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="ক্যাশিয়ারের Gmail ঠিকানা (example@gmail.com)"
                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm dark:border-slate-700 dark:bg-slate-800"
              />
              <input
                type="text"
                value={inviteName}
                onChange={(e) => setInviteName(e.target.value)}
                placeholder="ক্যাশিয়ারের নাম (ঐচ্ছিক)"
                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm dark:border-slate-700 dark:bg-slate-800"
              />
              <button
                type="button"
                disabled={roleBusy}
                onClick={async () => {
                  if (!inviteEmail.trim() || !inviteEmail.includes('@')) return;
                  setRoleBusy(true);
                  try {
                    await props.onUpdateUserRole(inviteEmail.trim(), 'cashier', inviteName.trim());
                    setInviteEmail('');
                    setInviteName('');
                  } finally {
                    setRoleBusy(false);
                  }
                }}
                className="h-11 w-full rounded-xl bg-indigo-700 text-sm font-semibold text-white hover:bg-indigo-800 disabled:opacity-60"
              >
                {roleBusy ? 'আপডেট হচ্ছে...' : 'ক্যাশিয়ার হিসেবে যুক্ত করুন'}
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 lg:col-span-7 dark:border-slate-800 dark:bg-slate-900">
            <h3 className="font-display text-base font-bold text-slate-900 dark:text-slate-100">
              সকল ইউজার ও রোল তালিকা ({toBn(props.registeredUsers.length)} জন)
            </h3>
            <div className="mt-3 divide-y divide-slate-100 dark:divide-slate-800">
              {props.registeredUsers.length === 0 ? (
                <p className="py-6 text-center text-xs text-slate-500">
                  এখনো কোনো রেজিস্টার্ড ইউজার নেই। উপরে Gmail দিয়ে ক্যাশিয়ার যুক্ত করুন।
                </p>
              ) : (
                props.registeredUsers.map((u) => (
                  <div key={u.uid} className="flex flex-wrap items-center justify-between gap-2 py-3">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                        {u.displayName}{' '}
                        <span
                          className={`ml-1 rounded-md px-2 py-0.5 text-[10px] font-bold ${
                            u.role === 'admin'
                              ? 'bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300'
                              : u.role === 'cashier'
                                ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300'
                                : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                          }`}
                        >
                          {u.role === 'admin'
                            ? 'সুপার এডমিন'
                            : u.role === 'cashier'
                              ? 'ক্যাশিয়ার'
                              : 'সদস্য'}
                        </span>
                      </p>
                      <p className="font-mono-num text-xs text-slate-500">{u.email}</p>
                    </div>

                    {u.role !== 'admin' && (
                      <button
                        type="button"
                        onClick={() =>
                          void props.onUpdateUserRole(
                            u.email || u.uid,
                            u.role === 'cashier' ? 'member' : 'cashier'
                          )
                        }
                        className={`h-9 rounded-lg px-3 text-xs font-semibold ${
                          u.role === 'cashier'
                            ? 'bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-950/40 dark:text-red-300'
                            : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:text-indigo-300'
                        }`}
                      >
                        {u.role === 'cashier' ? 'ক্যাশিয়ার বাতিল' : 'ক্যাশিয়ার করুন'}
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB AUDIT: AUDIT LOG / ACTIVITY TRAIL */}
      {effectiveTab === 'audit' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-display text-base font-bold text-slate-900 dark:text-slate-100">
                অডিট লগ ও অ্যাক্টিভিটি হিস্টোরি ({toBn(filteredAuditLogs.length)}টি)
              </h3>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                কে কখন ডিপোজিট, পেমেন্ট অনুমোদন, ড্র, ছবি বা সেটিংস পরিবর্তন করেছেন তার স্থায়ী রেকর্ড।
              </p>
            </div>
            <button
              type="button"
              onClick={props.onRefreshAdminFeeds}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>রিফ্রেশ</span>
            </button>
          </div>

          <div className="relative mt-3">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={auditQuery}
              onChange={(e) => setAuditQuery(e.target.value)}
              placeholder="অ্যাকশন, নাম বা বিবরণ দিয়ে খুঁজুন..."
              className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pr-3 pl-9 text-xs dark:border-slate-700 dark:bg-slate-800"
            />
          </div>

          <div className="mt-4 divide-y divide-slate-100 dark:divide-slate-800">
            {filteredAuditLogs.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-500">কোনো অডিট রেকর্ড পাওয়া যায়নি।</p>
            ) : (
              filteredAuditLogs.map((log) => (
                <div key={log.id} className="py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-800 dark:bg-slate-800 dark:text-slate-200">
                        {log.action}
                      </span>
                      <span className="text-xs font-semibold text-teal-700 dark:text-teal-400">
                        {log.actorName} ({log.actorRole})
                      </span>
                    </div>
                    <span className="font-mono-num text-[11px] text-slate-400">
                      {new Date(log.createdAt).toLocaleString('bn-BD')}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">{log.details}</p>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 1: TOGGLE MANAGER */}
      {effectiveTab === 'toggles' && props.isSuperAdmin && (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 lg:col-span-7 dark:border-slate-800 dark:bg-slate-900">
            <h3 className="font-display text-base font-bold text-slate-900 dark:text-slate-100">
              হোম টুগল চালু / বন্ধ করুন
            </h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              যেকোনো টুগল এখান থেকে চালু বা বন্ধ করলে হোমপেজে সাথে সাথে আপডেট হবে।
            </p>
            <div className="mt-4 divide-y divide-slate-100 dark:divide-slate-800">
              {BUILTIN_TOGGLE_META.map((item) => {
                const isOn = db.appConfig.enabledToggles[item.key] !== false;
                return (
                  <div key={item.key} className="flex items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {item.label}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{item.description}</p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={isOn}
                      onClick={() => props.onToggleBuiltin(item.key, !isOn)}
                      className={`inline-flex h-9 min-w-[74px] shrink-0 items-center justify-center rounded-lg px-3 text-xs font-bold transition-colors ${
                        isOn
                          ? 'bg-teal-700 text-white hover:bg-teal-800'
                          : 'bg-slate-200 text-slate-600 hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-400'
                      }`}
                    >
                      {isOn ? 'চালু আছে' : 'বন্ধ'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Create & Manage Custom Toggles */}
          <div className="space-y-5 lg:col-span-5">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
              <h3 className="font-display text-base font-bold text-slate-900 dark:text-slate-100">
                নতুন কাস্টম টুগল খুলুন
              </h3>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                হোমপেজে নতুন যেকোনো তথ্যের জন্য আলাদা টুগল কার্ড তৈরি করুন।
              </p>
              <div className="mt-4 space-y-3">
                <input
                  type="text"
                  value={ctTitle}
                  onChange={(e) => setCtTitle(e.target.value)}
                  placeholder="টুগলের নাম (যেমন: মিটিং সিডিউল)"
                  className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm dark:border-slate-700 dark:bg-slate-800"
                />
                <input
                  type="text"
                  value={ctSubtitle}
                  onChange={(e) => setCtSubtitle(e.target.value)}
                  placeholder="সংক্ষিপ্ত সাবটাইটেল (যেমন: প্রতি শুক্রবার)"
                  className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm dark:border-slate-700 dark:bg-slate-800"
                />
                <textarea
                  rows={3}
                  value={ctContent}
                  onChange={(e) => setCtContent(e.target.value)}
                  placeholder="টুগলে ক্লিক করলে যে বিস্তারিত তথ্য দেখাবে..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm dark:border-slate-700 dark:bg-slate-800"
                />
                <input
                  type="tel"
                  value={ctPhone}
                  onChange={(e) => setCtPhone(e.target.value)}
                  placeholder="যোগাযোগের নম্বর (ঐচ্ছিক)"
                  className="font-mono-num h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm dark:border-slate-700 dark:bg-slate-800"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (!ctTitle.trim() || !ctContent.trim()) return;
                    props.onAddCustomToggle({
                      title: ctTitle.trim(),
                      subtitle: ctSubtitle.trim() || 'বিস্তারিত দেখুন',
                      content: ctContent.trim(),
                      contactPhone: ctPhone.trim() || undefined,
                      enabled: true,
                    });
                    setCtTitle('');
                    setCtSubtitle('');
                    setCtContent('');
                    setCtPhone('');
                  }}
                  className="inline-flex h-11 w-full items-center justify-center gap-1.5 rounded-xl bg-teal-700 text-sm font-semibold text-white hover:bg-teal-800"
                >
                  <Plus className="h-4 w-4" />
                  <span>নতুন টুগল যুক্ত করুন</span>
                </button>
              </div>
            </div>

            {db.appConfig.customToggles.length > 0 && (
              <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
                <h4 className="font-display text-sm font-bold text-slate-900 dark:text-slate-100">
                  তৈরিকৃত কাস্টম টুগল ({toBn(db.appConfig.customToggles.length)}টি)
                </h4>
                <div className="mt-3 divide-y divide-slate-100 dark:divide-slate-800">
                  {db.appConfig.customToggles.map((ct) => (
                    <div key={ct.id} className="flex items-center justify-between gap-2 py-2.5">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                          {ct.title}
                        </p>
                        <p className="truncate text-xs text-slate-500">{ct.subtitle}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => props.onToggleCustom(ct.id, !ct.enabled)}
                          className={`h-8 rounded-lg px-2.5 text-xs font-bold ${
                            ct.enabled
                              ? 'bg-teal-700 text-white'
                              : 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                          }`}
                        >
                          {ct.enabled ? 'চালু' : 'বন্ধ'}
                        </button>
                        <button
                          type="button"
                          onClick={() => props.onDeleteCustomToggle(ct.id)}
                          aria-label="মুছুন"
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: RULES MANAGEMENT */}
      {effectiveTab === 'rules' && props.isSuperAdmin && (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 lg:col-span-5 dark:border-slate-800 dark:bg-slate-900">
            <h3 className="font-display text-base font-bold text-slate-900 dark:text-slate-100">
              নতুন নিয়ম যুক্ত করুন
            </h3>
            <div className="mt-3 space-y-3">
              <input
                type="text"
                value={ruleTitle}
                onChange={(e) => setRuleTitle(e.target.value)}
                placeholder="নিয়মের শিরোনাম"
                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm dark:border-slate-700 dark:bg-slate-800"
              />
              <textarea
                rows={3}
                value={ruleDesc}
                onChange={(e) => setRuleDesc(e.target.value)}
                placeholder="নিয়মের বিস্তারিত বিবরণ লিখুন..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm dark:border-slate-700 dark:bg-slate-800"
              />
              <button
                type="button"
                onClick={() => {
                  if (!ruleTitle.trim() || !ruleDesc.trim()) return;
                  props.onAddRule(ruleTitle.trim(), ruleDesc.trim());
                  setRuleTitle('');
                  setRuleDesc('');
                }}
                className="h-11 w-full rounded-xl bg-teal-700 text-sm font-semibold text-white hover:bg-teal-800"
              >
                নিয়ম যোগ করুন
              </button>
              <button
                type="button"
                onClick={props.onResetDefaultRules}
                className="h-10 w-full rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
              >
                ডিফল্ট ১৩টি নিয়মে ফিরিয়ে নিন
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 lg:col-span-7 dark:border-slate-800 dark:bg-slate-900">
            <h3 className="font-display text-base font-bold text-slate-900 dark:text-slate-100">
              বিদ্যমান নিয়মাবলি ({toBn(db.rules.length)}টি)
            </h3>
            <div className="mt-3 divide-y divide-slate-100 dark:divide-slate-800">
              {db.rules.map((r, idx) => (
                <div key={r.id} className="py-3">
                  {editRuleId === r.id ? (
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={editRuleTitle}
                        onChange={(e) => setEditRuleTitle(e.target.value)}
                        className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-semibold dark:border-slate-700 dark:bg-slate-800"
                      />
                      <textarea
                        rows={2}
                        value={editRuleDesc}
                        onChange={(e) => setEditRuleDesc(e.target.value)}
                        className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-sm dark:border-slate-700 dark:bg-slate-800"
                      />
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            if (!editRuleTitle.trim() || !editRuleDesc.trim()) return;
                            props.onUpdateRule(r.id, editRuleTitle.trim(), editRuleDesc.trim());
                            setEditRuleId(null);
                          }}
                          className="h-9 rounded-lg bg-teal-700 px-3 text-xs font-semibold text-white"
                        >
                          সেভ করুন
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditRuleId(null)}
                          className="h-9 rounded-lg border border-slate-200 px-3 text-xs font-semibold"
                        >
                          বাতিল
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                          {toBn(idx + 1)}. {r.title}
                        </p>
                        <p className="mt-0.5 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                          {r.description}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => props.onMoveRule(idx, 'up')}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-30 dark:hover:bg-slate-800"
                        >
                          <ArrowUp className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={idx === db.rules.length - 1}
                          onClick={() => props.onMoveRule(idx, 'down')}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-30 dark:hover:bg-slate-800"
                        >
                          <ArrowDown className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditRuleId(r.id);
                            setEditRuleTitle(r.title);
                            setEditRuleDesc(r.description);
                          }}
                          className="h-8 rounded-lg bg-slate-100 px-2.5 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200"
                        >
                          এডিট
                        </button>
                        <button
                          type="button"
                          onClick={() => props.onDeleteRule(r.id)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: PUSH NOTIFICATION SCHEDULER + PINNED NOTICE + AUTOMATED POPUPS + TICKERS */}
      {effectiveTab === 'notices' && props.isSuperAdmin && (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
          {/* Push Notification Scheduling Helper (Web Notifications API) */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 lg:col-span-12 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
              <div>
                <h3 className="font-display flex items-center gap-2 text-base font-bold text-slate-900 dark:text-slate-100">
                  <Bell className="h-4 w-4 text-teal-700 dark:text-teal-400" />
                  <span>পুশ নোটিফিকেশন শিডিউলার (Notifications API)</span>
                </h3>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  আসন্ন পেমেন্ট রিমাইন্ডার বা বিশেষ নোটিশ এখনই পাঠান অথবা নির্দিষ্ট তারিখ ও সময়ে অটো-শিডিউল করুন
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                  স্ট্যাটাস:{' '}
                  <strong
                    className={
                      notifPerm === 'granted'
                        ? 'text-emerald-700 dark:text-emerald-400'
                        : notifPerm === 'denied'
                          ? 'text-red-600 dark:text-red-400'
                          : 'text-amber-700 dark:text-amber-400'
                    }
                  >
                    {notifPerm === 'granted'
                      ? 'চালু (Allowed)'
                      : notifPerm === 'denied'
                        ? 'ব্লকড (Denied)'
                        : notifPerm === 'unsupported'
                          ? 'অসমর্থিত'
                          : 'অনুমতি বাকি'}
                  </strong>
                </span>
                {notifPerm !== 'granted' && notifPerm !== 'unsupported' && (
                  <button
                    type="button"
                    onClick={() => void handleEnableBrowserNotifs()}
                    className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl bg-teal-700 px-3 text-xs font-semibold text-white hover:bg-teal-800 whitespace-nowrap"
                  >
                    <BellRing className="h-3.5 w-3.5" />
                    <span>অনুমতি চালু করুন</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => void handleTestBrowserNotif()}
                  className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-100 whitespace-nowrap dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                >
                  <Play className="h-3.5 w-3.5" />
                  <span>টেস্ট নোটিফিকেশন</span>
                </button>
              </div>
            </div>

            {pushStatusMsg && (
              <div
                role="status"
                className="mt-3 flex items-center justify-between gap-2 rounded-xl border border-teal-200 bg-teal-50/80 px-3.5 py-2 text-xs font-medium text-teal-900 dark:border-teal-900/60 dark:bg-teal-950/40 dark:text-teal-200"
              >
                <span>{pushStatusMsg}</span>
                <button
                  type="button"
                  onClick={() => setPushStatusMsg(null)}
                  className="text-teal-700 hover:underline dark:text-teal-300"
                >
                  বন্ধ
                </button>
              </div>
            )}

            <div className="mt-4 grid grid-cols-1 gap-5 lg:grid-cols-12">
              {/* Left: Compose & Schedule Form */}
              <div className="space-y-3 lg:col-span-6">
                {/* Quick Presets */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                    দ্রুত টেমপ্লেট:
                  </span>
                  {NOTIFICATION_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => {
                        setPushCategory(preset.category);
                        setPushTitle(preset.title);
                        setPushBody(preset.body);
                        setPushTiming(preset.repeatMode === 'daily' ? 'daily' : 'once');
                        setPushTime(preset.dailyTime);
                        setPushTargetPage(preset.targetPage);
                      }}
                      className="min-h-[32px] rounded-lg border border-slate-200 bg-slate-50 px-2.5 text-[11px] font-semibold text-slate-700 transition-colors hover:border-teal-300 hover:text-teal-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>

                {/* Category Selector */}
                <div className="grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
                  <button
                    type="button"
                    onClick={() => setPushCategory('upcoming_payment')}
                    className={`min-h-[36px] rounded-lg text-xs font-semibold transition-colors ${
                      pushCategory === 'upcoming_payment'
                        ? 'bg-white text-teal-700 shadow-xs dark:bg-slate-900 dark:text-teal-300'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    আসন্ন পেমেন্ট রিমাইন্ডার
                  </button>
                  <button
                    type="button"
                    onClick={() => setPushCategory('special_notice')}
                    className={`min-h-[36px] rounded-lg text-xs font-semibold transition-colors ${
                      pushCategory === 'special_notice'
                        ? 'bg-white text-teal-700 shadow-xs dark:bg-slate-900 dark:text-teal-300'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    বিশেষ নোটিশ
                  </button>
                </div>

                <input
                  type="text"
                  value={pushTitle}
                  onChange={(e) => setPushTitle(e.target.value)}
                  placeholder="নোটিফিকেশন শিরোনাম (যেমন: আজকের কিস্তি পরিশোধের সময় হয়েছে)"
                  className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm dark:border-slate-700 dark:bg-slate-800"
                />
                <textarea
                  rows={2}
                  value={pushBody}
                  onChange={(e) => setPushBody(e.target.value)}
                  placeholder="সদস্যদের জন্য বিস্তারিত বার্তা লিখুন..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm dark:border-slate-700 dark:bg-slate-800"
                />

                {/* Delivery Timing Mode */}
                <div className="grid grid-cols-3 gap-1.5">
                  {(
                    [
                      { key: 'now', label: 'এখনই পাঠান' },
                      { key: 'once', label: 'নির্দিষ্ট সময়' },
                      { key: 'daily', label: 'প্রতিদিন অটো' },
                    ] as const
                  ).map((opt) => (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => setPushTiming(opt.key)}
                      className={`min-h-[40px] rounded-xl border text-xs font-semibold transition-colors ${
                        pushTiming === opt.key
                          ? 'border-teal-700 bg-teal-700 text-white'
                          : 'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>

                {pushTiming !== 'now' && (
                  <div className="grid grid-cols-2 gap-2.5">
                    {pushTiming === 'once' && (
                      <div>
                        <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">
                          তারিখ
                        </label>
                        <input
                          type="date"
                          value={pushDate}
                          onChange={(e) => setPushDate(e.target.value)}
                          className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs dark:border-slate-700 dark:bg-slate-800"
                        />
                      </div>
                    )}
                    <div className={pushTiming === 'daily' ? 'col-span-2' : ''}>
                      <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">
                        সময়
                      </label>
                      <input
                        type="time"
                        value={pushTime}
                        onChange={(e) => setPushTime(e.target.value)}
                        className="font-mono-num h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm dark:border-slate-700 dark:bg-slate-800"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">
                    নোটিফিকেশনে ক্লিক করলে যে পেজ খুলবে
                  </label>
                  <select
                    value={pushTargetPage}
                    onChange={(e) => setPushTargetPage(e.target.value as PageRoute | '')}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs dark:border-slate-700 dark:bg-slate-800"
                  >
                    <option value="payment">পেমেন্ট পেজ (বিকাশ / রিকোয়েস্ট)</option>
                    <option value="dailyPayments">দৈনিক পেমেন্ট তালিকা</option>
                    <option value="rules">নিয়মাবলি ও নোটিশ</option>
                    <option value="home">হোম পেজ</option>
                  </select>
                </div>

                <button
                  type="button"
                  onClick={handleCreateScheduledNotif}
                  className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-teal-700 px-4 text-sm font-semibold text-white transition-colors hover:bg-teal-800"
                >
                  {pushTiming === 'now' ? <Send className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
                  <span>
                    {pushTiming === 'now'
                      ? 'এখনই সকল সদস্যকে পাঠান'
                      : 'পুশ নোটিফিকেশন শিডিউল করুন'}
                  </span>
                </button>
              </div>

              {/* Right: Scheduled & Sent Notifications List */}
              <div className="flex flex-col rounded-xl border border-slate-200 bg-slate-50/70 p-4 lg:col-span-6 dark:border-slate-800 dark:bg-slate-800/40">
                <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-slate-200/80 dark:border-slate-700">
                  <h4 className="font-display text-sm font-bold text-slate-900 dark:text-slate-100">
                    শিডিউল করা নোটিফিকেশন ({toBn(scheduledNotifs.length)}টি)
                  </h4>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    সকল সদস্যের ডিভাইসে অটো-সিঙ্ক
                  </span>
                </div>

                <div className="mt-2 divide-y divide-slate-200/70 overflow-y-auto max-h-[340px] dark:divide-slate-700/70">
                  {scheduledNotifs.length === 0 ? (
                    <p className="py-8 text-center text-xs text-slate-500 dark:text-slate-400">
                      এখনো কোনো পুশ নোটিফিকেশন শিডিউল করা হয়নি। বামপাশের ফর্ম থেকে তৈরি করুন।
                    </p>
                  ) : (
                    scheduledNotifs.map((item) => (
                      <div key={item.id} className="space-y-1.5 py-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                              {item.title}
                            </p>
                            <p className="font-mono-num mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                              {item.category === 'upcoming_payment' ? 'পেমেন্ট রিমাইন্ডার' : 'বিশেষ নোটিশ'} ·{' '}
                              {formatScheduleLabelBn(item)} ·{' '}
                              {item.repeatMode === 'daily' ? 'প্রতিদিন' : 'একবার'}
                            </p>
                          </div>
                          <div className="flex shrink-0 items-center gap-1">
                            <button
                              type="button"
                              onClick={() => props.onSendScheduledNotificationNow(item.id)}
                              title="এখনই পাঠান"
                              className="inline-flex h-8 items-center gap-1 rounded-lg bg-teal-50 px-2 text-xs font-semibold text-teal-800 hover:bg-teal-100 dark:bg-teal-950/60 dark:text-teal-300"
                            >
                              <Send className="h-3 w-3" />
                              <span>পাঠান</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => props.onToggleScheduledNotification(item.id, !item.enabled)}
                              className={`h-8 rounded-lg px-2 text-xs font-bold ${
                                item.enabled
                                  ? 'bg-teal-700 text-white'
                                  : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                              }`}
                            >
                              {item.enabled ? 'চালু' : 'বন্ধ'}
                            </button>
                            <button
                              type="button"
                              onClick={() => props.onDeleteScheduledNotification(item.id)}
                              aria-label="মুছে ফেলুন"
                              className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-950/40 dark:text-red-300"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-300">{item.body}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Pinned Notice (1 Day / 1 Week / 1 Month) */}
          <div className="space-y-5 lg:col-span-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-display flex items-center gap-2 text-base font-bold text-slate-900 dark:text-slate-100">
                  <Pin className="h-4 w-4 text-amber-600" />
                  <span>নোটিশ পিন করুন (১ দিন / ১ সপ্তাহ / ১ মাস)</span>
                </h3>
              </div>

              {activePinned && (
                <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200">
                  <p className="font-bold">
                    বর্তমান পিন: {activePinned.title || 'নোটিশ'} ({getNoticeDurationLabel(activePinned.duration)} · {getTimeRemainingBn(activePinned.expiresAtMs)})
                  </p>
                  <p className="mt-1">{activePinned.body}</p>
                  <button
                    type="button"
                    onClick={props.onUnpinNotice}
                    className="mt-2 rounded-lg bg-amber-200/80 px-2.5 py-1 text-xs font-bold text-amber-950 hover:bg-amber-300"
                  >
                    পিন সরিয়ে ফেলুন
                  </button>
                </div>
              )}

              <div className="mt-4 space-y-3">
                <input
                  type="text"
                  value={noticeTitle}
                  onChange={(e) => setNoticeTitle(e.target.value)}
                  placeholder="নোটিশের শিরোনাম (যেমন: জরুরি ঘোষণা)"
                  className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm dark:border-slate-700 dark:bg-slate-800"
                />
                <textarea
                  rows={3}
                  value={noticeBody}
                  onChange={(e) => setNoticeBody(e.target.value)}
                  placeholder="নোটিশের বিস্তারিত লিখুন..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm dark:border-slate-700 dark:bg-slate-800"
                />
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300">
                    পিন মেয়াদ নির্বাচন করুন
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['1d', '1w', '1m'] as NoticeDuration[]).map((dur) => (
                      <button
                        key={dur}
                        type="button"
                        onClick={() => setNoticeDuration(dur)}
                        className={`h-10 rounded-xl border text-xs font-bold transition-colors ${
                          noticeDuration === dur
                            ? 'border-amber-600 bg-amber-600 text-white'
                            : 'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200'
                        }`}
                      >
                        {getNoticeDurationLabel(dur)}
                      </button>
                    ))}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (!noticeBody.trim()) return;
                    props.onPinNotice(noticeTitle.trim() || 'জরুরি নোটিশ', noticeBody.trim(), noticeDuration);
                  }}
                  className="h-11 w-full rounded-xl bg-amber-600 text-sm font-semibold text-white hover:bg-amber-700"
                >
                  নোটিশ পিন করুন ({getNoticeDurationLabel(noticeDuration)})
                </button>
              </div>
            </div>

            {/* Running Tickers */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
              <h3 className="font-display text-base font-bold text-slate-900 dark:text-slate-100">
                রানিং বার (টিকার) আপডেট
              </h3>
              <div className="mt-3 space-y-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">
                    হোমপেজ রানিং বার
                  </label>
                  <input
                    type="text"
                    value={homeTicker}
                    onChange={(e) => setHomeTicker(e.target.value)}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm dark:border-slate-700 dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">
                    বিকাশ পেজ রানিং বার
                  </label>
                  <input
                    type="text"
                    value={bkashTicker}
                    onChange={(e) => setBkashTicker(e.target.value)}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm dark:border-slate-700 dark:bg-slate-800"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => props.onUpdateTickers(homeTicker.trim(), bkashTicker.trim())}
                  className="h-11 w-full rounded-xl bg-teal-700 text-sm font-semibold text-white hover:bg-teal-800"
                >
                  রানিং বার সেভ করুন
                </button>
              </div>
            </div>
          </div>

          {/* Automated Popup Message Manager */}
          <div className="space-y-5 lg:col-span-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
              <h3 className="font-display text-base font-bold text-slate-900 dark:text-slate-100">
                নতুন অটোমেটেড পপ-আপ মেসেজ তৈরি করুন
              </h3>
              <div className="mt-3 space-y-3">
                <input
                  type="text"
                  value={popTitle}
                  onChange={(e) => setPopTitle(e.target.value)}
                  placeholder="পপ-আপ শিরোনাম (যেমন: রাত ৮টার পেমেন্ট রিমাইন্ডার)"
                  className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm dark:border-slate-700 dark:bg-slate-800"
                />
                <textarea
                  rows={3}
                  value={popMessage}
                  onChange={(e) => setPopMessage(e.target.value)}
                  placeholder="অটোমেটেড মেসেজ লিখুন..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm dark:border-slate-700 dark:bg-slate-800"
                />
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">
                      ট্রিগার ধরন
                    </label>
                    <select
                      value={popTrigger}
                      onChange={(e) => setPopTrigger(e.target.value as PopupTriggerType)}
                      className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-2.5 text-xs dark:border-slate-700 dark:bg-slate-800"
                    >
                      <option value="unpaid_reminder">নন-পেমেন্ট রিমাইন্ডার</option>
                      <option value="daily_time">প্রতিদিন নির্দিষ্ট সময়ে</option>
                      <option value="on_open">অ্যাপ ওপেনে অটো</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">
                      নির্ধারিত সময়
                    </label>
                    <input
                      type="time"
                      value={popTime}
                      onChange={(e) => setPopTime(e.target.value)}
                      className="font-mono-num h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm dark:border-slate-700 dark:bg-slate-800"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">
                      পুনরাবৃত্তি
                    </label>
                    <select
                      value={popFreq}
                      onChange={(e) => setPopFreq(e.target.value as 'once_per_day' | 'once_per_session')}
                      className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-2.5 text-xs dark:border-slate-700 dark:bg-slate-800"
                    >
                      <option value="once_per_day">প্রতিদিন একবার</option>
                      <option value="once_per_session">প্রতি সেশনে একবার</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">
                      বাটন লিংক (ঐচ্ছিক)
                    </label>
                    <select
                      value={popActionTarget}
                      onChange={(e) => setPopActionTarget(e.target.value as PageRoute | '')}
                      className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-2.5 text-xs dark:border-slate-700 dark:bg-slate-800"
                    >
                      <option value="dailyPayments">দৈনিক পেমেন্ট তালিকা</option>
                      <option value="payment">পেমেন্ট পেজ</option>
                      <option value="rules">রুলস &amp; রেগুলেশন</option>
                      <option value="">কোনো বাটন নেই</option>
                    </select>
                  </div>
                </div>
                {popActionTarget && (
                  <input
                    type="text"
                    value={popActionLabel}
                    onChange={(e) => setPopActionLabel(e.target.value)}
                    placeholder="বাটনের লেখা"
                    className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs dark:border-slate-700 dark:bg-slate-800"
                  />
                )}
                <button
                  type="button"
                  onClick={() => {
                    if (!popTitle.trim() || !popMessage.trim()) return;
                    props.onAddPopup({
                      title: popTitle.trim(),
                      message: popMessage.trim(),
                      triggerType: popTrigger,
                      scheduleTime: popTime,
                      enabled: true,
                      frequency: popFreq,
                      actionLabel: popActionTarget ? popActionLabel.trim() || 'দেখুন' : undefined,
                      actionTarget: popActionTarget,
                    });
                    setPopTitle('');
                    setPopMessage('');
                  }}
                  className="h-11 w-full rounded-xl bg-teal-700 text-sm font-semibold text-white hover:bg-teal-800"
                >
                  অটোমেটেড পপ-আপ যোগ করুন
                </button>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
              <h4 className="font-display text-sm font-bold text-slate-900 dark:text-slate-100">
                সক্রিয় পপ-আপ তালিকা ({toBn(db.appConfig.automatedPopups.length)}টি)
              </h4>
              <div className="mt-3 divide-y divide-slate-100 dark:divide-slate-800">
                {db.appConfig.automatedPopups.length === 0 ? (
                  <p className="py-4 text-center text-xs text-slate-500">কোনো অটোমেটেড পপ-আপ নেই</p>
                ) : (
                  db.appConfig.automatedPopups.map((p) => (
                    <div key={p.id} className="space-y-2 py-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                            {p.title}
                          </p>
                          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                            সময়: {p.scheduleTime} ·{' '}
                            {p.triggerType === 'unpaid_reminder'
                              ? 'নন-পেমেন্ট রিমাইন্ডার'
                              : p.triggerType === 'daily_time'
                                ? 'দৈনিক সময়সূচী'
                                : 'অ্যাপ ওপেন'}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => props.onTestPopup(p)}
                            title="এখনই প্রিভিউ দেখুন"
                            className="inline-flex h-8 items-center gap-1 rounded-lg bg-slate-100 px-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200"
                          >
                            <Play className="h-3 w-3" />
                            <span>টেস্ট</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => props.onTogglePopup(p.id, !p.enabled)}
                            className={`h-8 rounded-lg px-2.5 text-xs font-bold ${
                              p.enabled
                                ? 'bg-teal-700 text-white'
                                : 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                            }`}
                          >
                            {p.enabled ? 'চালু' : 'বন্ধ'}
                          </button>
                          <button
                            type="button"
                            onClick={() => props.onDeletePopup(p.id)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300">{p.message}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: BULK RANGE DEPOSITS */}
      {effectiveTab === 'bulk' && props.isSuperAdmin && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <h3 className="font-display text-base font-bold text-slate-900 dark:text-slate-100">
            তারিখ রেঞ্জ অনুযায়ী একসাথে ডিপোজিট আদায়
          </h3>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-4">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">
                শুরুর তারিখ
              </label>
              <input
                type="date"
                value={bulkStart}
                onChange={(e) => setBulkStart(e.target.value)}
                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm dark:border-slate-700 dark:bg-slate-800"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">
                শেষ তারিখ
              </label>
              <input
                type="date"
                value={bulkEnd}
                onChange={(e) => setBulkEnd(e.target.value)}
                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm dark:border-slate-700 dark:bg-slate-800"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">
                প্রতিদিনের টাকা
              </label>
              <input
                type="number"
                min="1"
                value={bulkAmount}
                onChange={(e) => setBulkAmount(e.target.value)}
                className="font-mono-num h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm dark:border-slate-700 dark:bg-slate-800"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">
                মন্তব্য
              </label>
              <input
                type="text"
                value={bulkNote}
                onChange={(e) => setBulkNote(e.target.value)}
                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm dark:border-slate-700 dark:bg-slate-800"
              />
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
              সদস্য নির্বাচন করুন ({toBn(selectedBulkIds.length)} জন নির্বাচিত):
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setSelectedBulkIds(db.members.map((m) => m.id))}
                className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white dark:bg-teal-700"
              >
                সবাই
              </button>
              <button
                type="button"
                onClick={() => setSelectedBulkIds([])}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-300"
              >
                বাদ দিন
              </button>
            </div>
          </div>

          <div className="mt-2 grid max-h-64 grid-cols-1 gap-1.5 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-3 sm:grid-cols-2 lg:grid-cols-3 dark:border-slate-800 dark:bg-slate-800/50">
            {db.members.map((m) => {
              const checked = selectedBulkIds.includes(m.id);
              return (
                <label
                  key={m.id}
                  className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-medium hover:bg-white dark:hover:bg-slate-800"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) =>
                      setSelectedBulkIds((prev) =>
                        e.target.checked ? [...prev, m.id] : prev.filter((id) => id !== m.id)
                      )
                    }
                    className="h-4 w-4 rounded accent-teal-700"
                  />
                  <span className="truncate">
                    {toBn(m.id)}. {m.name} (৳{toBn(getMemberTotal(m))})
                  </span>
                </label>
              );
            })}
          </div>

          <label className="mt-3 flex cursor-pointer items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300">
            <input
              type="checkbox"
              checked={bulkSkipDup}
              onChange={(e) => setBulkSkipDup(e.target.checked)}
              className="h-4 w-4 rounded accent-teal-700"
            />
            <span>আগে জমা থাকা তারিখ বাদ দিন (ডুপ্লিকেট এড়াতে)</span>
          </label>

          <div className="mt-3 rounded-xl border border-teal-200 bg-teal-50/70 p-3 text-xs text-teal-900 dark:border-teal-900 dark:bg-teal-950/40 dark:text-teal-200">
            {selectedBulkIds.length > 0 && bulkDates.length > 0 ? (
              <>
                নির্বাচিত: <strong>{toBn(selectedBulkIds.length)} জন</strong> ·{' '}
                <strong>{toBn(bulkDates.length)} দিন</strong> ({formatDateBn(bulkStart)} —{' '}
                {formatDateBn(bulkEnd)}) · আনুমানিক মোট আদায়:{' '}
                <strong className="font-mono-num">৳ {toBn(bulkEstimatedTotal)}</strong>
              </>
            ) : (
              'সদস্য এবং সঠিক তারিখ রেঞ্জ নির্বাচন করুন।'
            )}
          </div>

          <button
            type="button"
            onClick={() => {
              props.onBulkRangeDeposit(
                selectedBulkIds,
                bulkStart,
                bulkEnd,
                Number(bulkAmount),
                bulkNote.trim() || 'দৈনিক কিস্তি',
                bulkSkipDup
              );
              setSelectedBulkIds([]);
            }}
            className="mt-4 h-11 w-full rounded-xl bg-teal-700 text-sm font-semibold text-white hover:bg-teal-800 sm:w-auto sm:px-6"
          >
            নির্বাচিত সদস্যদের ডিপোজিট আদায় করুন
          </button>
        </div>
      )}

      {/* TAB 5: PUBLISH IN-APP UPDATE */}
      {effectiveTab === 'updates' && props.isSuperAdmin && (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 lg:col-span-7 dark:border-slate-800 dark:bg-slate-900">
            <h3 className="font-display text-base font-bold text-slate-900 dark:text-slate-100">
              অ্যাপের নতুন ভার্সন আপডেট পাবলিশ করুন
            </h3>
            <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
              এখান থেকে নতুন ভার্সন পাবলিশ করলে সকল সদস্য তাদের অ্যাপের &ldquo;অ্যাপ আপডেট&rdquo; টুগল থেকেই
              সর্বশেষ নিয়মাবলি, টুগল, নোটিশ ও হিসাব এক ক্লিকে আপডেট করে নিতে পারবেন।
            </p>
            <div className="mt-4 space-y-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">
                  নতুন ভার্সন নম্বর (বর্তমান: v{db.appConfig.appVersion})
                </label>
                <input
                  type="text"
                  value={nextVersion}
                  onChange={(e) => setNextVersion(e.target.value)}
                  placeholder="যেমন: 2.0.1"
                  className="font-mono-num h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm dark:border-slate-700 dark:bg-slate-800"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">
                  এই আপডেটে কী কী পরিবর্তন হয়েছে?
                </label>
                <textarea
                  rows={3}
                  value={releaseNotes}
                  onChange={(e) => setReleaseNotes(e.target.value)}
                  placeholder="যেমন: নতুন নিয়ম যুক্ত করা হয়েছে এবং দৈনিক হিসাব হালনাগাদ হয়েছে।"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm dark:border-slate-700 dark:bg-slate-800"
                />
              </div>
              <button
                type="button"
                disabled={publishing}
                onClick={async () => {
                  if (!nextVersion.trim() || !releaseNotes.trim()) return;
                  setPublishing(true);
                  await props.onPublishAppUpdate(nextVersion.trim(), releaseNotes.trim());
                  setPublishing(false);
                  setNextVersion(suggestNextVersion(nextVersion.trim()));
                  setReleaseNotes('');
                }}
                className="h-11 w-full rounded-xl bg-teal-700 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-60"
              >
                {publishing ? 'পাবলিশ হচ্ছে...' : 'নতুন আপডেট পাবলিশ করুন'}
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 lg:col-span-5 dark:border-slate-800 dark:bg-slate-900">
            <h3 className="font-display text-base font-bold text-slate-900 dark:text-slate-100">
              ডেটা ব্যাকআপ ও রিস্টোর (JSON + Firebase)
            </h3>
            <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
              সম্পূর্ণ ডেটা ও সদস্যদের হিসাব JSON ফাইলে ডাউনলোড করুন, পুরোনো ব্যাকআপ রিস্টোর করুন অথবা সরাসরি Firebase ক্লাউডে পুশ করুন।
            </p>
            <div className="mt-4 space-y-2.5">
              <button
                type="button"
                onClick={props.onDownloadJsonBackup}
                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 text-sm font-semibold text-slate-800 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              >
                পূর্ণ ব্যাকআপ ডাউনলোড (.json)
              </button>
              <label className="flex h-11 w-full cursor-pointer items-center justify-center rounded-xl border border-teal-200 bg-teal-50/70 text-sm font-semibold text-teal-800 hover:bg-teal-100 dark:border-teal-800 dark:bg-teal-950/40 dark:text-teal-200">
                <span>ব্যাকআপ ফাইল থেকে রিস্টোর (.json)</span>
                <input
                  type="file"
                  accept=".json,application/json"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) props.onImportJsonBackup(f);
                    e.target.value = '';
                  }}
                />
              </label>
              <button
                type="button"
                disabled={props.isSyncingCloud}
                onClick={() => void props.onForceSyncCloud()}
                className="h-11 w-full rounded-xl bg-teal-700 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-60"
              >
                {props.isSyncingCloud ? 'ক্লাউডে সিঙ্ক হচ্ছে...' : 'ক্লাউডে পূর্ণ ডেটা সিঙ্ক করুন'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: HTML & JSON CODE */}
      {effectiveTab === 'code' && props.isSuperAdmin && (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
          {/* Complete Standalone HTML Code */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 lg:col-span-6 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="font-display text-base font-bold text-slate-900 dark:text-slate-100">
                  সম্পূর্ণ অ্যাপ কোড (HTML)
                </h3>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  সকল সদস্য, জমার হিসাব, নিয়মাবলি ও নতুন ফিচারসহ সম্পূর্ণ সিঙ্গেল-ফাইল HTML কোড।
                </p>
              </div>
            </div>

            <textarea
              readOnly
              value={props.standaloneHtmlCode}
              className="font-mono-num mt-3 h-72 w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-xs leading-relaxed text-slate-200 outline-none"
            />

            <div className="mt-3 grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => props.onCopyText(props.standaloneHtmlCode, 'সম্পূর্ণ HTML কোড কপি হয়েছে!')}
                className="inline-flex h-11 items-center justify-center gap-1.5 rounded-xl bg-slate-900 px-4 text-xs font-semibold text-white hover:bg-slate-800 dark:bg-slate-700 dark:hover:bg-slate-600"
              >
                <Copy className="h-4 w-4" />
                <span>HTML কোড কপি</span>
              </button>
              <button
                type="button"
                onClick={props.onDownloadUpdatedHtml}
                className="inline-flex h-11 items-center justify-center gap-1.5 rounded-xl bg-teal-700 px-4 text-xs font-semibold text-white hover:bg-teal-800"
              >
                <Download className="h-4 w-4" />
                <span>HTML ডাউনলোড</span>
              </button>
            </div>
          </div>

          {/* Live Database JSON Code Editor */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 lg:col-span-6 dark:border-slate-800 dark:bg-slate-900">
            <div>
              <h3 className="font-display text-base font-bold text-slate-900 dark:text-slate-100">
                লাইভ ডেটাবেজ কোড (JSON)
              </h3>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                সরাসরি JSON কোড কপি, এডিট ও সেভ করে পুরো ডেটাবেজ আপডেট করুন।
              </p>
            </div>

            <textarea
              value={jsonCodeInput}
              onChange={(e) => setJsonCodeInput(e.target.value)}
              spellCheck={false}
              className="font-mono-num mt-3 h-72 w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-xs leading-relaxed text-emerald-200 outline-none focus:border-teal-500"
            />

            <div className="mt-3 grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => props.onCopyText(jsonCodeInput, 'JSON কোড কপি হয়েছে!')}
                className="inline-flex h-11 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-4 text-xs font-semibold text-slate-800 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              >
                <Copy className="h-4 w-4" />
                <span>JSON কপি</span>
              </button>
              <button
                type="button"
                onClick={() => props.onSaveJsonCode(jsonCodeInput)}
                className="inline-flex h-11 items-center justify-center gap-1.5 rounded-xl bg-teal-700 px-4 text-xs font-semibold text-white hover:bg-teal-800"
              >
                <span>JSON সেভ ও আপডেট</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 7: SETTINGS */}
      {effectiveTab === 'settings' && props.isSuperAdmin && (
        <div className="space-y-5">
          {/* App Icon & Profile Logo Studio */}
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            {/* Dedicated App Icon Changer (PWA Home Screen / Tab Icon / iOS Touch Icon) */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-start gap-4">
                <div className="flex shrink-0 flex-col items-center">
                  <div className="h-16 w-16 overflow-hidden rounded-[22%] border border-slate-200 bg-teal-700 shadow-md dark:border-slate-700">
                    <img
                      src={
                        isSafeAppIconDataUrl(db.appConfig.appIconUrl)
                          ? db.appConfig.appIconUrl
                          : isSafeRasterPhotoDataUrl(db.appConfig.appLogoUrl)
                            ? db.appConfig.appLogoUrl
                            : '/pwa-192x192.png'
                      }
                      alt="অ্যাপ আইকন প্রিভিউ"
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <span className="mt-1.5 text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                    BarakahUnity
                  </span>
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <Smartphone className="h-4 w-4 text-teal-700 dark:text-teal-400" />
                    <h3 className="font-display text-base font-bold text-slate-900 dark:text-slate-100">
                      অ্যাপ আইকন পরিবর্তন (App Icon)
                    </h3>
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                    এখান থেকে অ্যাপ আইকন বদলালে ফোনের হোম স্ক্রিন আইকন, ইনস্টল আইকন ও ব্রাউজার
                    ট্যাব আইকন সব ডিভাইসে আপডেট হয়ে যাবে।
                  </p>
                  <p className="mt-1.5 text-[11px] font-semibold text-teal-700 dark:text-teal-400">
                    {isSafeAppIconDataUrl(db.appConfig.appIconUrl)
                      ? 'স্ট্যাটাস: কাস্টম অ্যাপ আইকন সক্রিয় আছে'
                      : 'স্ট্যাটাস: ডিফল্ট অ্যাপ আইকন ব্যবহৃত হচ্ছে'}
                  </p>
                </div>
              </div>

              <label className="mt-3.5 inline-flex cursor-pointer items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={syncIconToLogo}
                  onChange={(e) => setSyncIconToLogo(e.target.checked)}
                  className="h-4 w-4 rounded accent-teal-700"
                />
                <span>অ্যাপের প্রোফাইল লোগোতেও একই ছবি সেট করুন</span>
              </label>

              <div className="mt-3.5 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={iconUploading}
                  onClick={() => iconGalleryInputRef.current?.click()}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-teal-700 px-4 text-xs font-semibold text-white transition-colors hover:bg-teal-800 disabled:opacity-60 active:scale-[0.98]"
                >
                  <ImagePlus className="h-4 w-4" />
                  <span>{iconUploading ? 'আপলোড হচ্ছে...' : 'আইকন আপলোড করুন'}</span>
                </button>
                <button
                  type="button"
                  disabled={iconUploading}
                  onClick={() => iconCameraInputRef.current?.click()}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-100 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                >
                  <Camera className="h-4 w-4" />
                  <span>ক্যামেরা</span>
                </button>
                {isSafeAppIconDataUrl(db.appConfig.appIconUrl) && (
                  <button
                    type="button"
                    disabled={iconUploading}
                    onClick={async () => {
                      setIconError('');
                      setIconSuccessMsg('');
                      setIconUploading(true);
                      try {
                        const res = await props.onUpdateAppIcon({
                          icon512: '',
                          icon192: '',
                          iconMaskable512: '',
                        });
                        if (!res.ok) {
                          setIconError(res.error || 'ডিফল্ট আইকনে ফেরানো যায়নি।');
                        } else {
                          setIconSuccessMsg('ডিফল্ট অ্যাপ আইকন পুনরায় চালু হয়েছে।');
                        }
                      } finally {
                        setIconUploading(false);
                      }
                    }}
                    className="inline-flex h-11 items-center justify-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3.5 text-xs font-semibold text-red-700 transition-colors hover:bg-red-100 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span>ডিফল্ট আইকন</span>
                  </button>
                )}
              </div>

              {iconSuccessMsg && (
                <p className="mt-3 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                  {iconSuccessMsg}
                </p>
              )}

              {iconError && (
                <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 dark:bg-red-950/40 dark:text-red-300">
                  {iconError}
                </p>
              )}

              <p className="mt-3 text-[11px] leading-relaxed text-slate-400 dark:text-slate-500">
                টিপস: নতুন ইনস্টল ও ব্রাউজার ট্যাবে নতুন আইকন সাথে সাথেই দেখাবে। আগে থেকেই ফোনে ইনস্টল
                থাকা শর্টকাটের আইকন না বদলালে শর্টকাটটি রিমুভ করে পুনরায় ইনস্টল করুন।
              </p>

              <input
                ref={iconGalleryInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  void handleSelectAppIconFile(file);
                  e.target.value = '';
                }}
              />
              <input
                ref={iconCameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  void handleSelectAppIconFile(file);
                  e.target.value = '';
                }}
              />
            </div>

            {/* App Logo / Profile Picture Manager */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-start gap-4">
                <AppLogo logoUrl={db.appConfig.appLogoUrl} size="xl" variant="surface" />
                <div className="min-w-0 flex-1">
                  <h3 className="font-display text-base font-bold text-slate-900 dark:text-slate-100">
                    অ্যাপের লোগো ও প্রোফাইল পিকচার
                  </h3>
                  <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                    অ্যাপের টপবার, হোম ব্যানার, রসিদ ও এক্সিট স্ক্রিনে গোলাকার প্রোফাইল পিকচার
                    হিসেবে প্রদর্শিত হয়।
                  </p>
                  <p className="mt-1.5 text-[11px] font-semibold text-teal-700 dark:text-teal-400">
                    {isSafeRasterPhotoDataUrl(db.appConfig.appLogoUrl)
                      ? 'স্ট্যাটাস: কাস্টম প্রোফাইল লোগো চালু আছে'
                      : 'স্ট্যাটাস: ডিফল্ট লোগো ব্যবহৃত হচ্ছে'}
                  </p>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={logoUploading}
                  onClick={() => logoGalleryInputRef.current?.click()}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 text-xs font-semibold text-white transition-colors hover:bg-slate-800 disabled:opacity-60 active:scale-[0.98] dark:bg-teal-700 dark:hover:bg-teal-600"
                >
                  <ImagePlus className="h-4 w-4" />
                  <span>{logoUploading ? 'সংরক্ষণ হচ্ছে...' : 'লোগো আপলোড করুন'}</span>
                </button>
                <button
                  type="button"
                  disabled={logoUploading}
                  onClick={() => logoCameraInputRef.current?.click()}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-100 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                >
                  <Camera className="h-4 w-4" />
                  <span>ক্যামেরা</span>
                </button>
                {isSafeRasterPhotoDataUrl(db.appConfig.appLogoUrl) && (
                  <button
                    type="button"
                    disabled={logoUploading}
                    onClick={async () => {
                      setLogoError('');
                      setLogoUploading(true);
                      try {
                        const res = await props.onUpdateAppLogo('');
                        if (!res.ok) {
                          setLogoError(res.error || 'ডিফল্ট লোগো ফিরিয়ে আনা যায়নি।');
                        }
                      } finally {
                        setLogoUploading(false);
                      }
                    }}
                    className="inline-flex h-11 items-center justify-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3.5 text-xs font-semibold text-red-700 transition-colors hover:bg-red-100 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span>ডিফল্ট লোগো</span>
                  </button>
                )}
              </div>

              {logoError && (
                <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 dark:bg-red-950/40 dark:text-red-300">
                  {logoError}
                </p>
              )}

              <input
                ref={logoGalleryInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  void handleSelectAppLogoFile(file);
                  e.target.value = '';
                }}
              />
              <input
                ref={logoCameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  void handleSelectAppLogoFile(file);
                  e.target.value = '';
                }}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 lg:col-span-7 dark:border-slate-800 dark:bg-slate-900">
              <h3 className="font-display text-base font-bold text-slate-900 dark:text-slate-100">
                অ্যাপ ও ডিসপ্লে সেটিংস
              </h3>
            <div className="mt-4 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">ডার্ক মোড</p>
                  <p className="text-xs text-slate-500">রাতের ব্যবহারের জন্য গাঢ় থিম</p>
                </div>
                <button
                  type="button"
                  onClick={() => setDarkMode((prev) => !prev)}
                  className={`h-9 min-w-[74px] rounded-lg px-3 text-xs font-bold ${
                    darkMode
                      ? 'bg-teal-700 text-white'
                      : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                  }`}
                >
                  {darkMode ? 'চালু' : 'বন্ধ'}
                </button>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300">
                  থিম কালার
                </label>
                <div className="flex flex-wrap gap-2">
                  {THEME_SWATCHES.map((sw) => (
                    <button
                      key={sw.hex}
                      type="button"
                      onClick={() => setThemeColor(sw.hex)}
                      className={`inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-xs font-semibold ${
                        themeColor === sw.hex
                          ? 'border-slate-900 bg-slate-100 dark:border-white dark:bg-slate-800'
                          : 'border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      <span className="h-3.5 w-3.5 rounded-full" style={{ backgroundColor: sw.hex }} />
                      <span>{sw.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">
                    বিকাশ পার্সোনাল নাম্বার
                  </label>
                  <input
                    type="tel"
                    value={bkashNumber}
                    onChange={(e) => setBkashNumber(e.target.value)}
                    className="font-mono-num h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm dark:border-slate-700 dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">
                    এডমিন ফোন নাম্বার
                  </label>
                  <input
                    type="tel"
                    value={adminPhone}
                    onChange={(e) => setAdminPhone(e.target.value)}
                    className="font-mono-num h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm dark:border-slate-700 dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">
                    ফান্ড লক্ষ্যমাত্রা (০ হলে লুকানো)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={fundTarget}
                    onChange={(e) => setFundTarget(e.target.value)}
                    className="font-mono-num h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm dark:border-slate-700 dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">
                    সদস্য তালিকা ক্রম
                  </label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as 'id' | 'amount_desc')}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm dark:border-slate-700 dark:bg-slate-800"
                  >
                    <option value="id">সিরিয়াল আইডি অনুযায়ী</option>
                    <option value="amount_desc">বেশি জমা আগে</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">
                  এক্সটার্নাল ক্লাউড সিঙ্ক / আপডেট JSON URL (ঐচ্ছিক)
                </label>
                <input
                  type="url"
                  value={cloudSyncUrl}
                  onChange={(e) => setCloudSyncUrl(e.target.value)}
                  placeholder="https://example.firebaseio.com/barakah.json"
                  className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm dark:border-slate-700 dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">
                  কাস্টম আপডেট ম্যানিফেস্ট URL (ঐচ্ছিক)
                </label>
                <input
                  type="url"
                  value={updateManifestUrl}
                  onChange={(e) => setUpdateManifestUrl(e.target.value)}
                  placeholder="খালি রাখলে অ্যাপ সার্ভার থেকেই অটো আপডেট নেবে"
                  className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm dark:border-slate-700 dark:bg-slate-800"
                />
              </div>

              <button
                type="button"
                onClick={() =>
                  props.onUpdateSettings({
                    darkMode,
                    themeColor,
                    bkashNumber: bkashNumber.trim() || '01303768168',
                    adminPhone: adminPhone.trim() || '01607703566',
                    fundTarget: Number(fundTarget) || 0,
                    sortBy,
                    cloudSyncUrl: cloudSyncUrl.trim(),
                    updateManifestUrl: updateManifestUrl.trim(),
                  })
                }
                className="h-11 w-full rounded-xl bg-teal-700 text-sm font-semibold text-white hover:bg-teal-800"
              >
                সেটিংস সংরক্ষণ করুন
              </button>
            </div>
          </div>

          <div className="space-y-5 lg:col-span-5">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
              <h3 className="font-display text-base font-bold text-slate-900 dark:text-slate-100">
                এডমিন নাম ও পাসওয়ার্ড পরিবর্তন
              </h3>
              <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                নিরাপত্তার স্বার্থে কোনো মেম্বার বা এডমিনের ফোন নম্বরকে অ্যাডমিন পাসওয়ার্ড হিসেবে সেট করা যাবে না (কমপক্ষে ৬ অক্ষর)।
              </p>
              <div className="mt-3 space-y-3">
                <input
                  type="text"
                  value={adminNameInput}
                  onChange={(e) => setAdminNameInput(e.target.value)}
                  placeholder="এডমিনের নাম"
                  className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm dark:border-slate-700 dark:bg-slate-800"
                />
                <input
                  type="password"
                  value={newPinInput}
                  onChange={(e) => setNewPinInput(e.target.value)}
                  placeholder="নতুন অ্যাডমিন পাসওয়ার্ড (কমপক্ষে ৬ অক্ষর)"
                  className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm dark:border-slate-700 dark:bg-slate-800"
                />
                <button
                  type="button"
                  onClick={async () => {
                    if (newPinInput.trim().length < 6) return;
                    await props.onChangeAdminCredentials(adminNameInput.trim(), newPinInput.trim());
                    setNewPinInput('');
                  }}
                  className="h-11 w-full rounded-xl bg-slate-900 text-sm font-semibold text-white hover:bg-slate-800 dark:bg-teal-700"
                >
                  নাম ও পাসওয়ার্ড আপডেট করুন
                </button>
              </div>
            </div>

            <div className="rounded-2xl border border-red-200 bg-white p-5 dark:border-red-900/50 dark:bg-slate-900">
              <h3 className="font-display text-base font-bold text-red-700 dark:text-red-400">
                ডেটা রিসেট
              </h3>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                ডিফল্ট অবস্থায় ফিরে গেলে পরবর্তীতে এন্ট্রি করা কিস্তি ও পরিবর্তন মুছে যাবে।
              </p>
              <button
                type="button"
                onClick={props.onResetAllData}
                className="mt-3 h-11 w-full rounded-xl bg-red-50 text-sm font-semibold text-red-700 hover:bg-red-100 dark:bg-red-950/50 dark:text-red-300"
              >
                সব ডেটা শুরু অবস্থায় ফিরিয়ে নিন
              </button>
            </div>
          </div>
          </div>
        </div>
      )}
    </div>
  );
}
