import {
  Award,
  Bell,
  BookOpen,
  CalendarCheck2,
  CheckCircle2,
  ChevronRight,
  CloudDownload,
  CreditCard,
  FileSpreadsheet,
  Layers,
  LogOut,
  Moon,
  Receipt,
  RefreshCw,
  Search,
  Share2,
  Sun,
  UserPlus,
  Users,
  Wallet,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AdminPanelView } from './components/AdminPanelView';
import type { MemberFullUpdatePayload } from './components/AdminMembersManager';
import { AppLogo } from './components/AppLogo';
import { AutomatedPopupModal } from './components/AutomatedPopupModal';
import { BottomNav } from './components/BottomNav';
import { DailyPaymentsView } from './components/DailyPaymentsView';
import {
  AddMemberView,
  CustomToggleDetailView,
  DrawsView,
  FundView,
  KistiView,
  PaymentView,
} from './components/KistiDrawsFundPaymentViews';
import { MemberAvatar } from './components/MemberAvatar';
import { MemberDetailView } from './components/MemberDetailView';
import { OfflineIndicator, PWAInstallButton, SmartInstallBanner } from './components/PWAInstallButton';
import { PinnedNoticeBanner } from './components/PinnedNoticeBanner';
import { ReportsView } from './components/ReportsView';
import { RulesView } from './components/RulesView';
import { ShareAppModal } from './components/ShareAppModal';
import { TopBar } from './components/TopBar';
import { UpdateBackupView } from './components/UpdateBackupView';
import { UserListView } from './components/UserListView';
import { onAuthStateChanged, signInWithPopup, signOut, type User } from 'firebase/auth';
import {
  compareVersions,
  createInitialDatabase,
  DEFAULT_ADMIN_PASSCODE,
  DEFAULT_RULES,
  ensureDatabaseStructure,
  formatDateBn,
  getDailyPaymentBreakdown,
  getDatesInRange,
  getGlobalStats,
  getMemberAdvanceCoverage,
  getMemberInstallments,
  getMemberTotal,
  getNoticeDurationMs,
  getTodayISO,
  isPhoneCollidingWithPasscode,
  toBn,
  toEnDigits,
} from './data/defaultData';
import { auth, googleAuthProvider } from './lib/firebase';
import type {
  ActiveSessionUser,
  AdminTab,
  AuditLogEntry,
  AutomatedPopup,
  BuiltinToggleKey,
  CustomToggle,
  Deposit,
  NoticeDuration,
  PageRoute,
  PaymentRequest,
  RegisteredUserRecord,
  UnityDatabase,
  UpdateCheckResult,
  UserRole,
} from './types/unity';
import { generateStandaloneHtml } from './utils/standaloneHtmlGenerator';
import { isSafeAppIconDataUrl, isSafeRasterPhotoDataUrl } from './utils/avatarLibrary';
import {
  CLIENT_BUILD_ID,
  checkForAppBuildUpdate,
  forceReloadLatestApp,
} from './utils/pwaUpdater';
import {
  getNotificationPermissionState,
  requestNotificationPermission,
  syncScheduledNotificationTimers,
  type BrowserNotificationPermission,
} from './utils/notificationScheduler';

const STORAGE_KEY = 'barakah_multicare_unity_db_v3';
const POPUP_DISMISSED_KEY = 'barakah_popup_dismissed_v1';
const SESSION_ID_KEY = 'barakah_presence_session_v1';

function getOrCreatePresenceSessionId(): string {
  try {
    const existing = sessionStorage.getItem(SESSION_ID_KEY);
    if (existing) return existing;
    const created = `sess_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
    sessionStorage.setItem(SESSION_ID_KEY, created);
    return created;
  } catch {
    return `sess_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  }
}

interface RouteEntry {
  page: PageRoute;
  memberId?: number | null;
  customToggleId?: string | null;
}

function getRouteLabel(entry: RouteEntry, db: UnityDatabase): string {
  switch (entry.page) {
    case 'home':
      return 'হোম';
    case 'kisti':
      return 'মোট প্রদেয় কিস্তি';
    case 'draws':
      return 'ড্র পাওয়া ব্যক্তি';
    case 'fund':
      return 'টোটাল ফান্ড';
    case 'dailyPayments':
      return 'দৈনিক তালিকা';
    case 'reports':
      return 'মাসিক ও বাৎসরিক রিপোর্ট';
    case 'userList':
      return 'ইউজার লিস্ট';
    case 'rules':
      return 'রুলস & রেগুলেশন';
    case 'payment':
      return 'পেমেন্ট';
    case 'addMember':
      return 'নতুন সদস্য';
    case 'updates':
      return 'অ্যাপ আপডেট';
    case 'admin':
      return 'এডমিন প্যানেল';
    case 'member': {
      const m = db.members.find((x) => x.id === entry.memberId);
      return m ? `${toBn(m.id)}. ${m.name}` : 'সদস্য হিসাব';
    }
    case 'customToggle': {
      const ct = db.appConfig.customToggles.find((x) => x.id === entry.customToggleId);
      return ct ? ct.title : 'তথ্য';
    }
    default:
      return 'হোম';
  }
}

function safeStorageSet(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Ignore SecurityError / QuotaExceededError in sandboxed viewers
  }
}

function safePushHistory(state: Record<string, unknown>): boolean {
  try {
    window.history.pushState(state, '');
    return true;
  } catch {
    return false;
  }
}

function safeReplaceHistory(state: Record<string, unknown>): boolean {
  try {
    window.history.replaceState(state, '');
    return true;
  } catch {
    return false;
  }
}

function loadLocalDb(): UnityDatabase {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<UnityDatabase>;
      if (parsed && Array.isArray(parsed.members)) {
        return ensureDatabaseStructure(parsed);
      }
    }
  } catch {
    // fallback to initial
  }
  const initial = createInitialDatabase();
  safeStorageSet(STORAGE_KEY, JSON.stringify(initial));
  return initial;
}

export default function App() {
  const [db, setDb] = useState<UnityDatabase>(() => loadLocalDb());
  const [historyStack, setHistoryStack] = useState<RouteEntry[]>([{ page: 'home' }]);
  const [adminTab, setAdminTab] = useState<AdminTab>('dashboard');
  const [searchQuery, setSearchQuery] = useState('');

  // Admin / Cashier / Member auth state (Google Auth ID token kept strictly in memory + dedicated passcode)
  const [isAdmin, setIsAdmin] = useState(false);
  const [isCashier, setIsCashier] = useState(false);
  const [activeAdminPin, setActiveAdminPin] = useState<string>('');
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [isVerifiedGoogleAdmin, setIsVerifiedGoogleAdmin] = useState(false);
  const [isSyncingCloud, setIsSyncingCloud] = useState(false);
  const [adminGateOpen, setAdminGateOpen] = useState(false);
  const [pendingRouteAfterLogin, setPendingRouteAfterLogin] = useState<RouteEntry | null>(null);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');
  const latestDbRef = useRef<UnityDatabase>(db);
  const presenceSessionIdRef = useRef<string>(getOrCreatePresenceSessionId());

  // Live Active User List, Payment Requests Queue, & Audit Logs
  const [onlineSessions, setOnlineSessions] = useState<ActiveSessionUser[]>([]);
  const [registeredUsers, setRegisteredUsers] = useState<RegisteredUserRecord[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [paymentRequests, setPaymentRequests] = useState<PaymentRequest[]>([]);

  // Public Share URL from server & Browser Notifications API permission state
  const [serverSharedUrl, setServerSharedUrl] = useState<string>('');
  const [notifPermission, setNotifPermission] = useState<BrowserNotificationPermission>(() =>
    getNotificationPermissionState()
  );
  const [notifOptInDismissed, setNotifOptInDismissed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('barakah_notif_optin_dismissed_v1') === '1';
    } catch {
      return false;
    }
  });
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);

  const isStaff = isAdmin || isCashier;
  const currentUserRole: UserRole = isAdmin
    ? 'admin'
    : isCashier
      ? 'cashier'
      : authUser
        ? 'member'
        : 'guest';

  // Confirm modal & toast
  const [confirmState, setConfirmState] = useState<{
    message: string;
    onConfirm: () => void;
  } | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  // Automated popup, Share modal, Exit confirmation & In-app updates
  const [activePopup, setActivePopup] = useState<AutomatedPopup | null>(null);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [exitConfirmOpen, setExitConfirmOpen] = useState(false);
  const [doubleBackBarVisible, setDoubleBackBarVisible] = useState(false);
  const [appExited, setAppExited] = useState(false);
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [updateCheck, setUpdateCheck] = useState<UpdateCheckResult | null>(null);
  const [newBuildAvailable, setNewBuildAvailable] = useState(false);
  const sessionPopupShownRef = useRef<Set<string>>(new Set());
  const localMutationInFlightRef = useRef(false);

  // Device Back button & Home Exit Guard refs
  const historyStackRef = useRef<RouteEntry[]>(historyStack);
  const historyApiReadyRef = useRef(false);
  const browserAtExitRootRef = useRef(false);
  const ignoreNextProgrammaticPopRef = useRef(false);
  const exitingRef = useRef(false);
  const lastHomeBackAtRef = useRef(0);
  const initialHistoryLengthRef = useRef<number>(
    typeof window !== 'undefined' ? window.history.length : 1
  );
  const exitFallbackTimerRef = useRef<number | null>(null);
  const doubleBackResetTimerRef = useRef<number | null>(null);
  const modalStateRef = useRef({
    adminGateOpen: false,
    shareModalOpen: false,
    confirmOpen: false,
    activePopupOpen: false,
    exitConfirmOpen: false,
  });

  const currentRoute = historyStack[historyStack.length - 1] || { page: 'home' };
  const previousRoute = historyStack.length > 1 ? historyStack[historyStack.length - 2] : null;

  useEffect(() => {
    latestDbRef.current = db;
  }, [db]);

  useEffect(() => {
    historyStackRef.current = historyStack;
  }, [historyStack]);

  useEffect(() => {
    modalStateRef.current = {
      adminGateOpen,
      shareModalOpen,
      confirmOpen: Boolean(confirmState),
      activePopupOpen: Boolean(activePopup),
      exitConfirmOpen,
    };
  }, [adminGateOpen, shareModalOpen, confirmState, activePopup, exitConfirmOpen]);

  const showToast = useCallback((msg: string) => {
    setToastMsg(msg);
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToastMsg(null), 2800);
  }, []);

  // Build authenticated headers (fresh ID token in memory only, never persisted in localStorage)
  const buildAdminHeaders = useCallback(async (): Promise<Record<string, string>> => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const currentUser = auth.currentUser;
    if (currentUser) {
      try {
        const idToken = await currentUser.getIdToken();
        headers.Authorization = `Bearer ${idToken}`;
      } catch {
        // Fallback to passcode header if token refresh unavailable
      }
    }
    if (activeAdminPin) {
      headers['x-admin-pin'] = activeAdminPin;
    }
    return headers;
  }, [activeAdminPin]);

  // Sync dark mode class on <html>
  useEffect(() => {
    const isDark = Boolean(db.appConfig.darkMode);
    document.documentElement.classList.toggle('dark', isDark);
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) metaTheme.setAttribute('content', db.appConfig.themeColor || '#0f766e');
  }, [db.appConfig.darkMode, db.appConfig.themeColor]);

  // Monitor Google Auth state and verify role via backend (/api/auth/me)
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setAuthUser(user);
      if (user) {
        try {
          const idToken = await user.getIdToken();
          const res = await fetch('/api/auth/me', {
            headers: { Authorization: `Bearer ${idToken}` },
          });
          if (res.ok) {
            const profile = (await res.json()) as {
              isAdmin?: boolean;
              isCashier?: boolean;
              role?: UserRole;
            };
            const verifiedAdmin = Boolean(profile.isAdmin);
            const verifiedCashier = Boolean(profile.isCashier);
            setIsVerifiedGoogleAdmin(verifiedAdmin);
            if (verifiedAdmin) setIsAdmin(true);
            setIsCashier(verifiedCashier);
            return;
          }
        } catch {
          // Offline fallback handled gracefully
        }
        setIsVerifiedGoogleAdmin(false);
        setIsCashier(false);
      } else {
        setIsVerifiedGoogleAdmin(false);
        setIsCashier(false);
      }
    });
    return () => unsub();
  }, []);

  // Fetch Live Active & Logged-In Users
  const fetchActiveUsers = useCallback(async () => {
    setUsersLoading(true);
    try {
      const headers = await buildAdminHeaders();
      const res = await fetch(`/api/users/active?_t=${Date.now()}`, {
        headers,
        cache: 'no-store',
      });
      if (!res.ok) return;
      const data = (await res.json()) as {
        onlineSessions?: ActiveSessionUser[];
        registeredUsers?: RegisteredUserRecord[];
      };
      if (Array.isArray(data.onlineSessions)) setOnlineSessions(data.onlineSessions);
      if (Array.isArray(data.registeredUsers)) setRegisteredUsers(data.registeredUsers);
    } catch {
      // ignore offline
    } finally {
      setUsersLoading(false);
    }
  }, [buildAdminHeaders]);

  // Fetch bKash Payment Requests
  const fetchPaymentRequests = useCallback(async () => {
    try {
      const headers = await buildAdminHeaders();
      const res = await fetch(`/api/payment-requests?_t=${Date.now()}`, {
        headers,
        cache: 'no-store',
      });
      if (!res.ok) return;
      const data = (await res.json()) as { requests?: PaymentRequest[] };
      if (Array.isArray(data.requests)) setPaymentRequests(data.requests);
    } catch {
      // ignore offline
    }
  }, [buildAdminHeaders]);

  // Fetch Audit Logs (Admin & Cashier)
  const fetchAuditLogs = useCallback(async () => {
    if (!isStaff) return;
    try {
      const headers = await buildAdminHeaders();
      const res = await fetch(`/api/audit-logs?_t=${Date.now()}`, {
        headers,
        cache: 'no-store',
      });
      if (!res.ok) return;
      const data = (await res.json()) as { logs?: AuditLogEntry[] };
      if (Array.isArray(data.logs)) setAuditLogs(data.logs);
    } catch {
      // ignore
    }
  }, [buildAdminHeaders, isStaff]);

  // Real-time Presence Heartbeat (tracks online devices/users for ইউজার লিস্ট)
  const currentPageLabel = getRouteLabel(currentRoute, db);
  useEffect(() => {
    if (appExited) return;
    let active = true;
    const sendPing = async () => {
      if (!active || exitingRef.current) return;
      try {
        const headers = await buildAdminHeaders();
        await fetch('/api/presence/ping', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            sessionId: presenceSessionIdRef.current,
            currentPage: currentPageLabel,
          }),
        });
      } catch {
        // offline
      }
    };

    void sendPing();
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        void sendPing();
      }
    }, 30000);

    const onBeforeUnload = () => {
      try {
        fetch(`/api/presence/${presenceSessionIdRef.current}`, {
          method: 'DELETE',
          keepalive: true,
        }).catch(() => {});
      } catch {
        // ignore
      }
    };
    window.addEventListener('beforeunload', onBeforeUnload);

    return () => {
      active = false;
      window.clearInterval(timer);
      window.removeEventListener('beforeunload', onBeforeUnload);
    };
  }, [appExited, buildAdminHeaders, currentPageLabel, isAdmin, isCashier, authUser]);

  // Hydrate initial active users, payment requests, and audit logs
  useEffect(() => {
    void fetchActiveUsers();
    void fetchPaymentRequests();
    if (isStaff) {
      void fetchAuditLogs();
    }
  }, [fetchActiveUsers, fetchPaymentRequests, fetchAuditLogs, isStaff]);

  // Hydrate latest ledger state from server backend & subscribe to real-time instant updates (SSE + Polling fallback)
  useEffect(() => {
    if (appExited) return;
    let cancelled = false;
    let inFlight = false;

    async function syncFromServer() {
      if (cancelled || inFlight || localMutationInFlightRef.current) return;
      inFlight = true;
      try {
        const res = await fetch(`/api/state?_t=${Date.now()}`, { cache: 'no-store' });
        if (!res.ok) return;
        const remote = ensureDatabaseStructure(await res.json());
        if (cancelled || localMutationInFlightRef.current) return;

        // Authoritative server sync (immune to clock skew across devices)
        if (
          remote.updatedAtMs !== latestDbRef.current.updatedAtMs ||
          remote.appConfig.appVersion !== latestDbRef.current.appConfig.appVersion ||
          remote.members.length !== latestDbRef.current.members.length
        ) {
          latestDbRef.current = remote;
          safeStorageSet(STORAGE_KEY, JSON.stringify(remote));
          setDb(remote);
        }
      } catch {
        // Offline mode continues smoothly from local cache
      } finally {
        inFlight = false;
      }
    }

    void syncFromServer();

    // Real-time Server-Sent Events stream for instant updates across all active users
    let eventSource: EventSource | null = null;
    if (typeof window !== 'undefined' && typeof window.EventSource !== 'undefined') {
      try {
        eventSource = new EventSource('/api/events');
        eventSource.addEventListener('connected', (ev) => {
          try {
            const payload = JSON.parse((ev as MessageEvent).data || '{}') as { buildId?: string };
            if (
              payload.buildId &&
              CLIENT_BUILD_ID !== 'dev' &&
              payload.buildId !== 'dev' &&
              payload.buildId !== CLIENT_BUILD_ID
            ) {
              setNewBuildAvailable(true);
            }
          } catch {
            // ignore
          }
        });
        eventSource.addEventListener('state:updated', () => {
          void syncFromServer();
          void fetchAuditLogs();
        });
        eventSource.addEventListener('presence:updated', () => {
          void fetchActiveUsers();
        });
        eventSource.addEventListener('requests:updated', () => {
          void fetchPaymentRequests();
          void fetchAuditLogs();
        });
        eventSource.onopen = () => {
          void syncFromServer();
        };
      } catch {
        // Fallback to periodic + visibility sync
      }
    }

    // Resilient periodic background sync (guarantees cross-device sync even if mobile network drops SSE)
    const pollTimer = window.setInterval(() => {
      if (document.visibilityState === 'visible' && navigator.onLine) {
        void syncFromServer();
      }
    }, 20_000);

    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        void syncFromServer();
        void fetchActiveUsers();
        void fetchPaymentRequests();
        void checkForAppBuildUpdate().then((res) => {
          if (!cancelled && res.hasNewBuild) setNewBuildAvailable(true);
        });
      }
    };
    const onOnline = () => {
      void syncFromServer();
      void fetchActiveUsers();
      void fetchPaymentRequests();
      void checkForAppBuildUpdate().then((res) => {
        if (!cancelled && res.hasNewBuild) setNewBuildAvailable(true);
      });
    };
    const onBuildUpdateEvent = () => {
      if (!cancelled) setNewBuildAvailable(true);
    };

    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('online', onOnline);
    window.addEventListener('barakah:app-update-available', onBuildUpdateEvent);

    return () => {
      cancelled = true;
      window.clearInterval(pollTimer);
      eventSource?.close();
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('online', onOnline);
      window.removeEventListener('barakah:app-update-available', onBuildUpdateEvent);
    };
  }, [appExited, fetchActiveUsers, fetchAuditLogs, fetchPaymentRequests]);

  // Initialize History API sentinel on mount so Home sits at depth 1 above exit-root (depth 0)
  useEffect(() => {
    try {
      const currentState = window.history.state as { barakahSentinel?: string } | null;
      if (currentState?.barakahSentinel === 'home-guard') {
        historyApiReadyRef.current = true;
        browserAtExitRootRef.current = false;
        return;
      }
      if (currentState?.barakahSentinel === 'exit-root') {
        const pushed = safePushHistory({ barakahSentinel: 'home-guard', depth: 1 });
        historyApiReadyRef.current = pushed;
        browserAtExitRootRef.current = !pushed;
        return;
      }
      initialHistoryLengthRef.current = window.history.length;
      const replaced = safeReplaceHistory({ barakahSentinel: 'exit-root', depth: 0 });
      const pushed = safePushHistory({ barakahSentinel: 'home-guard', depth: 1 });
      historyApiReadyRef.current = replaced && pushed;
      browserAtExitRootRef.current = false;
    } catch {
      historyApiReadyRef.current = false;
    }
    return () => {
      if (exitFallbackTimerRef.current) {
        window.clearTimeout(exitFallbackTimerRef.current);
      }
      if (doubleBackResetTimerRef.current) {
        window.clearTimeout(doubleBackResetTimerRef.current);
      }
    };
  }, []);

  const clearDoubleBackPrompt = useCallback((restoreHomeGuard = false) => {
    if (doubleBackResetTimerRef.current) {
      window.clearTimeout(doubleBackResetTimerRef.current);
      doubleBackResetTimerRef.current = null;
    }
    setDoubleBackBarVisible(false);
    lastHomeBackAtRef.current = 0;
    if (restoreHomeGuard && browserAtExitRootRef.current && historyApiReadyRef.current && !exitingRef.current) {
      browserAtExitRootRef.current = false;
      safePushHistory({ barakahSentinel: 'home-guard', depth: 1 });
    }
  }, []);

  const openExitConfirm = useCallback(() => {
    if (doubleBackResetTimerRef.current) {
      window.clearTimeout(doubleBackResetTimerRef.current);
      doubleBackResetTimerRef.current = null;
    }
    setDoubleBackBarVisible(false);
    setExitConfirmOpen(true);
  }, []);

  const cancelExitConfirm = useCallback(() => {
    setExitConfirmOpen(false);
    clearDoubleBackPrompt(true);
  }, [clearDoubleBackPrompt]);

  const performAppExit = useCallback(() => {
    // Run native exit vectors SYNCHRONOUSLY FIRST to preserve browser transient user activation
    exitingRef.current = true;
    lastHomeBackAtRef.current = 0;

    if (exitFallbackTimerRef.current) {
      window.clearTimeout(exitFallbackTimerRef.current);
      exitFallbackTimerRef.current = null;
    }
    if (doubleBackResetTimerRef.current) {
      window.clearTimeout(doubleBackResetTimerRef.current);
      doubleBackResetTimerRef.current = null;
    }

    const isInIframe = (() => {
      try {
        return window.self !== window.top;
      } catch {
        return true;
      }
    })();

    const isStandalone =
      typeof window !== 'undefined' &&
      (window.matchMedia?.('(display-mode: standalone)').matches ||
        (window.navigator as Navigator & { standalone?: boolean }).standalone === true);

    const hasExternalReferrer = (() => {
      try {
        return Boolean(document.referrer && new URL(document.referrer).origin !== window.location.origin);
      } catch {
        return false;
      }
    })();

    const appDepth = browserAtExitRootRef.current ? 0 : Math.max(1, historyStackRef.current.length);
    const hasPreviousExternalEntry =
      !isInIframe && !isStandalone && (initialHistoryLengthRef.current > 1 || hasExternalReferrer);

    // 1. Non-blocking offline presence cleanup via sendBeacon (never blocks user gesture)
    try {
      const leaveUrl = `/api/presence/${presenceSessionIdRef.current}/leave`;
      if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
        navigator.sendBeacon(leaveUrl, '');
      } else {
        fetch(`/api/presence/${presenceSessionIdRef.current}`, {
          method: 'DELETE',
          keepalive: true,
        }).catch(() => {});
      }
    } catch {
      // ignore
    }

    // 2. Synchronous native exit based on environment (no racing window.close against history.go)
    if (isStandalone) {
      try {
        window.close();
      } catch {
        // ignore
      }
      if (!window.closed && appDepth > 0) {
        try {
          browserAtExitRootRef.current = true;
          window.history.go(-appDepth);
        } catch {
          // ignore
        }
      }
    } else if (hasPreviousExternalEntry) {
      try {
        browserAtExitRootRef.current = true;
        window.history.go(-(appDepth + 1));
      } catch {
        // ignore
      }
    } else {
      try {
        window.close();
      } catch {
        // ignore
      }
      if (!window.closed && appDepth > 0) {
        try {
          browserAtExitRootRef.current = true;
          window.history.go(-appDepth);
        } catch {
          // ignore
        }
      }
    }

    // 3. Clear modals & sensitive in-memory staff session
    setExitConfirmOpen(false);
    setDoubleBackBarVisible(false);
    setIsAdmin(false);
    setIsCashier(false);
    setActiveAdminPin('');

    // 4. Instant clean exited screen fallback if browser/iframe security policy blocks closing the tab
    exitFallbackTimerRef.current = window.setTimeout(() => {
      if (document.visibilityState === 'visible') {
        setAppExited(true);
      }
    }, 180);
  }, []);

  const reenterApp = useCallback(() => {
    if (exitFallbackTimerRef.current) {
      window.clearTimeout(exitFallbackTimerRef.current);
      exitFallbackTimerRef.current = null;
    }
    exitingRef.current = false;
    lastHomeBackAtRef.current = 0;
    setAppExited(false);
    setExitConfirmOpen(false);
    setHistoryStack([{ page: 'home' }]);
    if (historyApiReadyRef.current) {
      const currentState = window.history.state as { barakahSentinel?: string } | null;
      if (currentState?.barakahSentinel !== 'home-guard') {
        browserAtExitRootRef.current = false;
        safePushHistory({ barakahSentinel: 'home-guard', depth: 1 });
      }
    }
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, []);

  // Push browser history state on route transitions (kept strictly synced with device Back button)
  const navigateTo = useCallback(
    (entry: RouteEntry) => {
      if (entry.page === 'addMember' && !isAdmin) {
        setPendingRouteAfterLogin(entry);
        setPinInput('');
        setPinError('');
        setAdminGateOpen(true);
        return;
      }
      if (entry.page === 'admin' && !isStaff) {
        setPendingRouteAfterLogin(entry);
        setPinInput('');
        setPinError('');
        setAdminGateOpen(true);
        return;
      }

      if (modalStateRef.current.exitConfirmOpen || browserAtExitRootRef.current) {
        setExitConfirmOpen(false);
        clearDoubleBackPrompt(true);
      }

      const prev = historyStackRef.current;
      const top = prev[prev.length - 1];
      if (
        top &&
        top.page === entry.page &&
        top.memberId === entry.memberId &&
        top.customToggleId === entry.customToggleId
      ) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }

      if (entry.page === 'home') {
        const stepsBack = prev.length - 1;
        setHistoryStack([{ page: 'home' }]);
        if (stepsBack > 0 && historyApiReadyRef.current) {
          ignoreNextProgrammaticPopRef.current = true;
          try {
            window.history.go(-stepsBack);
          } catch {
            ignoreNextProgrammaticPopRef.current = false;
          }
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }

      const next = [...prev, entry];
      setHistoryStack(next);
      if (historyApiReadyRef.current) {
        safePushHistory({ barakahSentinel: 'page', depth: next.length });
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [clearDoubleBackPrompt, isAdmin, isStaff]
  );

  const goBack = useCallback(() => {
    if (historyStackRef.current.length > 1) {
      if (historyApiReadyRef.current) {
        try {
          window.history.back();
          return;
        } catch {
          // fallback below
        }
      }
      setHistoryStack((prev) => (prev.length > 1 ? prev.slice(0, -1) : [{ page: 'home' }]));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, []);

  // Wire Device Back Button (Android/Browser popstate) + Double-Back Exit + Home Exit Confirmation
  useEffect(() => {
    const onPopState = () => {
      if (exitingRef.current) return;

      if (ignoreNextProgrammaticPopRef.current) {
        ignoreNextProgrammaticPopRef.current = false;
        browserAtExitRootRef.current = false;
        return;
      }

      const modals = modalStateRef.current;
      const currentStack = historyStackRef.current;

      // 1. If an overlay modal (other than exit confirm) is open, Back dismisses it cleanly
      if (modals.confirmOpen || modals.adminGateOpen || modals.shareModalOpen || modals.activePopupOpen) {
        if (modals.confirmOpen) setConfirmState(null);
        else if (modals.adminGateOpen) {
          setAdminGateOpen(false);
          setPendingRouteAfterLogin(null);
        } else if (modals.shareModalOpen) setShareModalOpen(false);
        else if (modals.activePopupOpen) setActivePopup(null);

        if (historyApiReadyRef.current) {
          safePushHistory({
            barakahSentinel: currentStack.length > 1 ? 'page' : 'home-guard',
            depth: currentStack.length,
          });
        }
        return;
      }

      // 2. Inner pages: step back one page at a time all the way to Home
      if (currentStack.length > 1) {
        setHistoryStack((prev) => (prev.length > 1 ? prev.slice(0, -1) : [{ page: 'home' }]));
        browserAtExitRootRef.current = false;
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }

      // 3. On Home page (depth 1 -> depth 0):
      //    - Way 1 (Native Android-Style Double-Click Device Back):
      //      1st press leaves browser at exit-root (depth 0) and shows a sleek bottom toast bar for 2.5s.
      //      2nd press within 2.5s exits immediately (OS-level exit at depth 0, or performAppExit if popstate fires).
      //      If user does not press Back again within 2.5s, home-guard is silently re-armed!
      //    - Way 2: If Exit modal is open, pressing Back exits immediately or clicking "হ্যাঁ, বের হোন (Yes)" exits.
      const now = Date.now();
      if (modals.exitConfirmOpen || (lastHomeBackAtRef.current > 0 && now - lastHomeBackAtRef.current <= 2500)) {
        performAppExit();
        return;
      }

      lastHomeBackAtRef.current = now;
      browserAtExitRootRef.current = true;
      setDoubleBackBarVisible(true);
      if (doubleBackResetTimerRef.current) {
        window.clearTimeout(doubleBackResetTimerRef.current);
      }
      doubleBackResetTimerRef.current = window.setTimeout(() => {
        clearDoubleBackPrompt(true);
      }, 2500);
    };

    const onKeyDown = (e: KeyboardEvent) => {
      const modals = modalStateRef.current;
      if (e.altKey && e.key === 'ArrowLeft') {
        e.preventDefault();
        goBack();
      } else if (e.key === 'Escape') {
        if (modals.exitConfirmOpen) {
          cancelExitConfirm();
        } else if (
          !modals.adminGateOpen &&
          !modals.confirmOpen &&
          !modals.activePopupOpen &&
          !modals.shareModalOpen &&
          historyStackRef.current.length > 1
        ) {
          goBack();
        }
      }
    };

    window.addEventListener('popstate', onPopState);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('popstate', onPopState);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [goBack, cancelExitConfirm, clearDoubleBackPrompt, performAppExit]);

  // Automated Popup Engine (respects >=10s dwell rule + daily dismissal + schedule time)
  useEffect(() => {
    const enabledPopups = (db.appConfig.automatedPopups || []).filter((p) => p.enabled);
    if (enabledPopups.length === 0) return;

    const checkAndTrigger = () => {
      if (activePopup || adminGateOpen) return;
      const today = getTodayISO();
      let dismissedMap: Record<string, string> = {};
      try {
        dismissedMap = JSON.parse(localStorage.getItem(POPUP_DISMISSED_KEY) || '{}');
      } catch {
        dismissedMap = {};
      }

      const now = new Date();
      const nowHHMM = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      const todayBreakdown = getDailyPaymentBreakdown(db.members, today);

      for (const p of enabledPopups) {
        if (sessionPopupShownRef.current.has(p.id)) continue;
        if (p.frequency === 'once_per_day' && dismissedMap[p.id] === today) continue;

        let shouldFire = false;
        if (p.triggerType === 'on_open') {
          shouldFire = true;
        } else if (p.triggerType === 'daily_time') {
          shouldFire = nowHHMM >= (p.scheduleTime || '19:30');
        } else if (p.triggerType === 'unpaid_reminder') {
          shouldFire = todayBreakdown.unpaid.length > 0 && nowHHMM >= (p.scheduleTime || '18:00');
        }

        if (shouldFire) {
          sessionPopupShownRef.current.add(p.id);
          setActivePopup(p);
          break;
        }
      }
    };

    const timer = window.setTimeout(checkAndTrigger, 12000);
    const interval = window.setInterval(checkAndTrigger, 60000);
    return () => {
      window.clearTimeout(timer);
      window.clearInterval(interval);
    };
  }, [db.appConfig.automatedPopups, db.members, activePopup, adminGateOpen]);

  // Fetch public shared app URL & live buildId from backend once
  useEffect(() => {
    let active = true;
    fetch(`/api/app-info?_t=${Date.now()}`, { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { sharedAppUrl?: string; buildId?: string } | null) => {
        if (!active || !data) return;
        if (data.sharedAppUrl) {
          setServerSharedUrl(data.sharedAppUrl);
        }
        if (
          data.buildId &&
          CLIENT_BUILD_ID !== 'dev' &&
          data.buildId !== 'dev' &&
          data.buildId !== CLIENT_BUILD_ID
        ) {
          setNewBuildAvailable(true);
        }
      })
      .catch(() => {
        // Fallback to window.location conversion
      });
    return () => {
      active = false;
    };
  }, []);

  // Dynamically sync browser tab favicon, apple-touch-icon, and PWA manifest by replacing <link> nodes so browsers always repaint immediately
  useEffect(() => {
    const custom192 = isSafeAppIconDataUrl(db.appConfig.appIcon192Url)
      ? db.appConfig.appIcon192Url
      : '';
    const custom512 = isSafeAppIconDataUrl(db.appConfig.appIconUrl)
      ? db.appConfig.appIconUrl
      : '';
    const customLogo = isSafeRasterPhotoDataUrl(db.appConfig.appLogoUrl)
      ? db.appConfig.appLogoUrl
      : '';
    const activeIconData = custom192 || custom512 || customLogo;
    const versionParam = db.updatedAtMs || Date.now();
    const mimeType = activeIconData.startsWith('data:image/jpeg')
      ? 'image/jpeg'
      : activeIconData.startsWith('data:image/webp')
        ? 'image/webp'
        : 'image/png';

    try {
      const head = document.head;
      if (!head) return;

      // Replace existing icon links cleanly (browsers often ignore in-place href mutations)
      head
        .querySelectorAll('link[rel="icon"], link[rel="shortcut icon"], link[rel="apple-touch-icon"]')
        .forEach((node) => node.remove());

      const iconHref = activeIconData || `/api/app-icon?size=192&v=${versionParam}`;
      const appleHref = activeIconData || `/api/app-icon?size=180&v=${versionParam}`;

      const iconLink = document.createElement('link');
      iconLink.rel = 'icon';
      iconLink.type = activeIconData ? mimeType : 'image/png';
      iconLink.sizes = '192x192';
      iconLink.href = iconHref;
      head.appendChild(iconLink);

      const shortcutLink = document.createElement('link');
      shortcutLink.rel = 'shortcut icon';
      shortcutLink.href = iconHref;
      head.appendChild(shortcutLink);

      const appleLink = document.createElement('link');
      appleLink.rel = 'apple-touch-icon';
      appleLink.sizes = '180x180';
      appleLink.href = appleHref;
      head.appendChild(appleLink);

      const manifestHref = `/manifest.webmanifest?v=${versionParam}`;
      let manifestLink = head.querySelector<HTMLLinkElement>('link[rel="manifest"]');
      if (manifestLink) {
        manifestLink.href = manifestHref;
      } else {
        manifestLink = document.createElement('link');
        manifestLink.rel = 'manifest';
        manifestLink.href = manifestHref;
        head.appendChild(manifestLink);
      }
    } catch {
      // ignore DOM errors
    }
  }, [
    db.appConfig.appIconUrl,
    db.appConfig.appIcon192Url,
    db.appConfig.appLogoUrl,
    db.updatedAtMs,
  ]);

  // Push Notification Scheduler (Notifications API) — syncs scheduled & immediate admin alerts
  useEffect(() => {
    const items = db.appConfig.scheduledNotifications || [];
    if (items.length === 0) return;

    return syncScheduledNotificationTimers(items, {
      onDeliver: (item, result) => {
        if (!result.delivered) {
          showToast(`${item.title}: ${item.body}`);
        }
      },
      onNavigate: (targetPage) => {
        navigateTo({ page: targetPage });
      },
    });
  }, [db.appConfig.scheduledNotifications, navigateTo, showToast]);

  // Persist DB locally and sync atomically to backend PostgreSQL database (fixes React 19 batching!)
  const commitDb = useCallback(
    async (updater: (prev: UnityDatabase) => UnityDatabase, successToast?: string) => {
      const prev = latestDbRef.current;
      const updated = updater(prev);
      const nextSnapshot: UnityDatabase = {
        ...updated,
        updatedAtMs: Date.now(),
        lastBackup: new Date().toLocaleString('bn-BD'),
      };

      latestDbRef.current = nextSnapshot;
      setDb(nextSnapshot);
      safeStorageSet(STORAGE_KEY, JSON.stringify(nextSnapshot));

      if (successToast) showToast(successToast);

      if (isAdmin || isVerifiedGoogleAdmin) {
        localMutationInFlightRef.current = true;
        try {
          const headers = await buildAdminHeaders();
          const res = await fetch('/api/state', {
            method: 'PUT',
            headers,
            body: JSON.stringify(nextSnapshot),
          });
          if (res.ok) {
            const saved = ensureDatabaseStructure(await res.json());
            latestDbRef.current = saved;
            setDb(saved);
            safeStorageSet(STORAGE_KEY, JSON.stringify(saved));
          } else if (res.status === 401 || res.status === 403) {
            showToast('সার্ভার সিঙ্ক অনুমোদিত নয় — এডমিন হিসেবে পুনরায় লগইন করুন');
          }
        } catch {
          // Saved locally even if server temporarily unreachable
        } finally {
          localMutationInFlightRef.current = false;
        }
      }
    },
    [buildAdminHeaders, isAdmin, isVerifiedGoogleAdmin, showToast]
  );

  // Google Sign-In for Admin / Cashier / Member Account
  const handleConnectGoogleAdmin = useCallback(async () => {
    try {
      const cred = await signInWithPopup(auth, googleAuthProvider);
      const idToken = await cred.user.getIdToken();
      const res = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${idToken}` },
      });
      if (!res.ok) {
        throw new Error('Verification failed');
      }
      const profile = (await res.json()) as {
        isAdmin?: boolean;
        isCashier?: boolean;
        email?: string;
      };
      setAuthUser(cred.user);

      if (!profile.isAdmin && !profile.isCashier) {
        setIsVerifiedGoogleAdmin(false);
        setIsCashier(false);
        setPinError('আপনি সাধারণ সদস্য হিসেবে লগইন হয়েছেন। এডমিন বা ক্যাশিয়ার অনুমোদনের জন্য সুপার এডমিনের সাথে যোগাযোগ করুন।');
        showToast(`সদস্য হিসেবে লগইন হয়েছে (${cred.user.email})`);
        void fetchActiveUsers();
        return;
      }

      setIsVerifiedGoogleAdmin(Boolean(profile.isAdmin));
      setIsAdmin(Boolean(profile.isAdmin));
      setIsCashier(Boolean(profile.isCashier));
      setAdminGateOpen(false);
      setPinError('');
      showToast(
        profile.isAdmin
          ? `এডমিন অ্যাকাউন্ট সংযুক্ত হয়েছে (${cred.user.email})`
          : `ক্যাশিয়ার অ্যাকাউন্ট সংযুক্ত হয়েছে (${cred.user.email})`
      );
      if (pendingRouteAfterLogin) {
        const target = pendingRouteAfterLogin;
        setPendingRouteAfterLogin(null);
        const next = [...historyStackRef.current, target];
        setHistoryStack(next);
        if (historyApiReadyRef.current) {
          safePushHistory({ barakahSentinel: 'page', depth: next.length });
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      if (!msg.includes('popup-closed-by-user')) {
        setPinError('Google সাইন-ইন সম্পন্ন হয়নি। পপ-আপ চালু রেখে আবার চেষ্টা করুন।');
      }
    }
  }, [fetchActiveUsers, pendingRouteAfterLogin, showToast]);

  // Member Google Sign-In (for ইউজার লিস্ট)
  const handleMemberGoogleSignIn = useCallback(async () => {
    try {
      const cred = await signInWithPopup(auth, googleAuthProvider);
      const idToken = await cred.user.getIdToken();
      const res = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${idToken}` },
      });
      if (res.ok) {
        const profile = (await res.json()) as { isAdmin?: boolean; isCashier?: boolean };
        setAuthUser(cred.user);
        if (profile.isAdmin) {
          setIsVerifiedGoogleAdmin(true);
          setIsAdmin(true);
        }
        setIsCashier(Boolean(profile.isCashier));
      }
      showToast(`সফলভাবে লগইন হয়েছে (${cred.user.displayName || cred.user.email})`);
      void fetchActiveUsers();
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      if (!msg.includes('popup-closed-by-user')) {
        showToast('Google লগইন সম্পন্ন হয়নি। পপ-আপ চালু রেখে আবার চেষ্টা করুন।');
      }
    }
  }, [fetchActiveUsers, showToast]);

  const handleMemberGoogleSignOut = useCallback(async () => {
    setIsAdmin(false);
    setIsCashier(false);
    setActiveAdminPin('');
    setIsVerifiedGoogleAdmin(false);
    await signOut(auth).catch(() => {});
    showToast('সাইন আউট সম্পন্ন হয়েছে');
    void fetchActiveUsers();
  }, [fetchActiveUsers, showToast]);

  const handleForceSyncToCloud = useCallback(async () => {
    if (!isAdmin && !isVerifiedGoogleAdmin) {
      await handleConnectGoogleAdmin();
      return;
    }
    setIsSyncingCloud(true);
    try {
      const headers = await buildAdminHeaders();
      const res = await fetch('/api/state', {
        method: 'PUT',
        headers,
        body: JSON.stringify(latestDbRef.current),
      });
      if (!res.ok) throw new Error('Sync failed');
      const saved = ensureDatabaseStructure(await res.json());
      setDb(saved);
      safeStorageSet(STORAGE_KEY, JSON.stringify(saved));
      showToast('সম্পূর্ণ ডেটা সফলভাবে সিঙ্ক হয়েছে!');
    } catch {
      showToast('ডেটা সিঙ্ক করতে সমস্যা হয়েছে — আবার চেষ্টা করুন');
    } finally {
      setIsSyncingCloud(false);
    }
  }, [buildAdminHeaders, handleConnectGoogleAdmin, isAdmin, isVerifiedGoogleAdmin, showToast]);

  // Dedicated Admin Passcode Verification (STRICTLY blocks any member/admin phone number!)
  const handleVerifyPin = async () => {
    const entered = pinInput.trim();
    if (!entered) {
      setPinError('এডমিন পাসওয়ার্ড লিখুন');
      return;
    }

    if (isPhoneCollidingWithPasscode(entered, db.members, db.appConfig.adminPhone)) {
      setPinError('নিরাপত্তা সতর্কতা: কোনো মেম্বারের ফোন নম্বর অ্যাডমিন পাসওয়ার্ড হিসেবে গ্রহণযোগ্য নয়।');
      return;
    }

    const expectedFallback = db.adminPin || DEFAULT_ADMIN_PASSCODE;
    let ok = false;
    try {
      const res = await fetch('/api/admin/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: entered }),
      });
      if (res.ok) {
        ok = true;
      } else if (res.status === 401) {
        ok = false;
      } else {
        ok = entered === expectedFallback;
      }
    } catch {
      ok = entered === expectedFallback;
    }

    if (ok) {
      setIsAdmin(true);
      setActiveAdminPin(entered);
      setAdminGateOpen(false);
      setPinError('');
      showToast(`স্বাগতম, ${db.adminName || 'Shohag Hossain'}!`);
      if (pendingRouteAfterLogin) {
        const target = pendingRouteAfterLogin;
        setPendingRouteAfterLogin(null);
        const next = [...historyStackRef.current, target];
        setHistoryStack(next);
        if (historyApiReadyRef.current) {
          safePushHistory({ barakahSentinel: 'page', depth: next.length });
        }
      }
    } else {
      setPinError('ভুল এডমিন পাসওয়ার্ড! শুধুমাত্র এডমিন প্রবেশ করতে পারবেন।');
    }
  };

  const handleLogout = () => {
    setIsAdmin(false);
    setIsCashier(false);
    setActiveAdminPin('');
    setIsVerifiedGoogleAdmin(false);
    void signOut(auth).catch(() => {});
    if (currentRoute.page === 'admin' || currentRoute.page === 'addMember') {
      setHistoryStack([{ page: 'home' }]);
    }
    showToast('লগআউট সম্পন্ন হয়েছে (দেখার মোড)');
  };

  // In-App Update Check & Install (checks BOTH server database/version AND deployed PWA/app build!)
  const handleCheckUpdate = useCallback(async () => {
    setCheckingUpdate(true);
    try {
      const customUrl = db.appConfig.updateManifestUrl || db.cloudSyncUrl;
      const endpoint = customUrl ? customUrl : '/api/updates';
      const sep = endpoint.includes('?') ? '&' : '?';

      const [res, buildCheck] = await Promise.all([
        fetch(`${endpoint}${sep}_t=${Date.now()}`, { cache: 'no-store' }),
        checkForAppBuildUpdate(),
      ]);

      if (!res.ok) throw new Error('Update check failed');
      const data = await res.json();

      const latestVersion = String(data.appVersion || data.appConfig?.appVersion || db.appConfig.appVersion || '2.0.0');
      const latestUpdatedAtMs = Number(data.updatedAtMs || 0);
      const currentVersion = db.appConfig.appVersion || '2.0.0';
      const hasDataOrVersionUpdate =
        compareVersions(latestVersion, currentVersion) > 0 || latestUpdatedAtMs !== db.updatedAtMs;
      const hasUpdate = hasDataOrVersionUpdate || buildCheck.hasNewBuild;

      if (buildCheck.hasNewBuild) {
        setNewBuildAvailable(true);
      }

      const result: UpdateCheckResult = {
        hasUpdate,
        currentVersion,
        latestVersion,
        latestUpdatedAtMs,
        releaseNotes: buildCheck.hasNewBuild
          ? 'নতুন অ্যাপ ভার্সন ও ফিচার আপডেট পাওয়া গেছে। নিচের বাটনে ক্লিক করে এখনই আপডেট ইনস্টল করুন।'
          : String(data.releaseNotes || data.appConfig?.changelog?.[0]?.notes || 'নতুন ডেটা ও ফিচার আপডেট পাওয়া গেছে।'),
        releaseDate: String(data.releaseDate || getTodayISO()),
        source: customUrl ? 'cloud' : 'server',
      };
      setUpdateCheck(result);
      showToast(hasUpdate ? `নতুন আপডেট পাওয়া গেছে (v${latestVersion})` : 'অ্যাপটি সর্বশেষ ভার্সনে আপডেট আছে');
    } catch {
      showToast('আপডেট চেক করা যায়নি — ইন্টারনেট সংযোগ পরীক্ষা করুন');
    } finally {
      setCheckingUpdate(false);
    }
  }, [db.appConfig.appVersion, db.appConfig.updateManifestUrl, db.cloudSyncUrl, db.updatedAtMs, showToast]);

  const handleApplyServerUpdate = async () => {
    try {
      const endpoint = db.cloudSyncUrl || '/api/state';
      const sep = endpoint.includes('?') ? '&' : '?';
      const res = await fetch(`${endpoint}${sep}_t=${Date.now()}`, { cache: 'no-store' });
      if (res.ok) {
        const remote = ensureDatabaseStructure(await res.json());
        latestDbRef.current = remote;
        setDb(remote);
        safeStorageSet(STORAGE_KEY, JSON.stringify(remote));
      }
      showToast('নতুন আপডেট ইনস্টল হচ্ছে — অ্যাপ রিফ্রেশ হচ্ছে...');
      // Clear stale SW/Workbox caches and reload the newest app bundle cleanly
      await forceReloadLatestApp();
    } catch {
      showToast('আপডেট ইনস্টল করা যায়নি');
    }
  };

  const handleCopyText = useCallback(
    (text: string, successMsg: string) => {
      const fallbackCopy = () => {
        try {
          const ta = document.createElement('textarea');
          ta.value = text;
          ta.style.position = 'fixed';
          ta.style.opacity = '0';
          document.body.appendChild(ta);
          ta.select();
          document.execCommand('copy');
          ta.remove();
          showToast(successMsg);
        } catch {
          showToast('কপি করা যায়নি');
        }
      };

      if (navigator.clipboard?.writeText) {
        navigator.clipboard
          .writeText(text)
          .then(() => showToast(successMsg))
          .catch(() => fallbackCopy());
      } else {
        fallbackCopy();
      }
    },
    [showToast]
  );

  const handleShareSummary = () => {
    setShareModalOpen(true);
  };

  const handleDownloadJsonBackup = () => {
    const { adminPin: _omit, ...safeExport } = db;
    const backupPayload = {
      appName: 'BARAKAH MULTICARE HOSPITAL UNITY',
      exportedAt: new Date().toISOString(),
      memberCount: safeExport.members.length,
      data: safeExport,
    };
    const blob = new Blob([JSON.stringify(backupPayload, null, 2)], {
      type: 'application/json;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `barakah-unity-backup-${getTodayISO()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    showToast('সম্পূর্ণ JSON ব্যাকআপ ডাউনলোড হয়েছে');
  };

  const standaloneHtmlCode = useMemo(
    () => (isAdmin && currentRoute.page === 'admin' && adminTab === 'code' ? generateStandaloneHtml(db, activeAdminPin) : ''),
    [isAdmin, currentRoute.page, adminTab, db, activeAdminPin]
  );

  const handleDownloadUpdatedHtml = () => {
    const htmlCode = generateStandaloneHtml(db, activeAdminPin);
    const blob = new Blob([htmlCode], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `barakah_multicare_v${db.appConfig.appVersion}_${getTodayISO()}.html`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    showToast('সম্পূর্ণ আপডেটেড HTML ফাইল ডাউনলোড হয়েছে');
  };

  const handleSaveJsonCode = (rawJson: string) => {
    try {
      const parsed = JSON.parse(rawJson);
      const container = parsed && typeof parsed === 'object' && parsed.data ? parsed.data : parsed;
      if (!container || (!Array.isArray(container.members) && typeof container.members !== 'object')) {
        showToast('JSON কোডে ভুল আছে — members তালিকা থাকতে হবে!');
        return;
      }
      const structured = ensureDatabaseStructure(parsed);
      void commitDb(() => structured, 'JSON কোড থেকে ডেটাবেজ আপডেট হয়েছে!');
    } catch {
      showToast('JSON কোড সিনট্যাক্স সঠিক নয়!');
    }
  };

  const handleImportJsonUpdate = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(String(e.target?.result || ''));
        const container = parsed && typeof parsed === 'object' && parsed.data ? parsed.data : parsed;
        if (!container || (!Array.isArray(container.members) && typeof container.members !== 'object')) {
          showToast('সঠিক আপডেট বা ব্যাকআপ ফাইল নয়!');
          return;
        }
        const structured = ensureDatabaseStructure(parsed);
        void commitDb(
          () => structured,
          `ব্যাকআপ ফাইল থেকে ${toBn(structured.members.length)} জন সদস্যের ডেটা রিস্টোর হয়েছে!`
        );
      } catch {
        showToast('ফাইলটি পড়া যায়নি!');
      }
    };
    reader.readAsText(file);
  };

  // Computed stats
  const stats = useMemo(() => getGlobalStats(db), [db]);
  const todayISO = getTodayISO();
  const todayBreakdown = useMemo(() => getDailyPaymentBreakdown(db.members, todayISO), [db.members, todayISO]);

  const filteredMembers = useMemo(() => {
    const q = toEnDigits(searchQuery.trim()).toLowerCase();
    const list = [...db.members].sort((a, b) =>
      db.appConfig.sortBy === 'amount_desc' ? getMemberTotal(b) - getMemberTotal(a) : a.id - b.id
    );
    if (!q) return list;
    return list.filter(
      (m) => m.name.toLowerCase().includes(q) || toEnDigits(m.phone).includes(q) || String(m.id) === q
    );
  }, [db.members, db.appConfig.sortBy, searchQuery]);

  const enabledToggles = db.appConfig.enabledToggles;
  const activeCustomToggles = db.appConfig.customToggles.filter((t) => t.enabled);

  // Member CRUD & Staff (Admin/Cashier) handlers
  const handleAddDeposit = async (memberId: number, date: string, amount: number, note: string) => {
    if (!amount || amount <= 0) {
      showToast('সঠিক টাকার পরিমাণ লিখুন');
      return;
    }

    if (isCashier && !isAdmin) {
      try {
        const headers = await buildAdminHeaders();
        const res = await fetch('/api/staff/deposits', {
          method: 'POST',
          headers,
          body: JSON.stringify({ memberId, mode: 'single', date, amount, note }),
        });
        const data = (await res.json().catch(() => ({}))) as {
          ok?: boolean;
          state?: UnityDatabase;
          error?: string;
        };
        if (!res.ok || !data.ok) {
          showToast(data.error || 'জমা সংরক্ষণ করা যায়নি');
          return;
        }
        if (data.state) {
          const structured = ensureDatabaseStructure(data.state);
          setDb(structured);
          safeStorageSet(STORAGE_KEY, JSON.stringify(structured));
        }
        showToast(`৳${toBn(amount)} জমা সফলভাবে সংরক্ষিত হয়েছে`);
      } catch {
        showToast('সার্ভারের সাথে সংযোগ করা যায়নি');
      }
      return;
    }

    const newDeposit: Deposit = {
      id: `d_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
      date,
      amount,
      note,
    };
    void commitDb(
      (prev) => ({
        ...prev,
        members: prev.members.map((m) =>
          m.id === memberId ? { ...m, deposits: [...m.deposits, newDeposit] } : m
        ),
      }),
      `৳${toBn(amount)} জমা সফলভাবে সংরক্ষিত হয়েছে`
    );
  };

  const handleAddRangeDeposit = async (
    memberId: number,
    startISO: string,
    endISO: string,
    amount: number,
    note: string,
    skipDuplicates: boolean
  ) => {
    const dates = getDatesInRange(startISO, endISO);
    if (!dates.length || !amount || amount <= 0) {
      showToast('সঠিক তারিখ রেঞ্জ ও টাকার পরিমাণ দিন');
      return;
    }

    if (isCashier && !isAdmin) {
      try {
        const headers = await buildAdminHeaders();
        const res = await fetch('/api/staff/deposits', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            memberId,
            mode: 'range',
            startDate: startISO,
            endDate: endISO,
            amount,
            note,
          }),
        });
        const data = (await res.json().catch(() => ({}))) as {
          ok?: boolean;
          count?: number;
          state?: UnityDatabase;
          error?: string;
        };
        if (!res.ok || !data.ok) {
          showToast(data.error || 'রেঞ্জ জমা সংরক্ষণ করা যায়নি');
          return;
        }
        if (data.state) {
          const structured = ensureDatabaseStructure(data.state);
          setDb(structured);
          safeStorageSet(STORAGE_KEY, JSON.stringify(structured));
        }
        showToast(`${toBn(data.count || dates.length)} দিনের জমা সংরক্ষিত হয়েছে!`);
      } catch {
        showToast('সার্ভারের সাথে সংযোগ করা যায়নি');
      }
      return;
    }

    const targetMember = db.members.find((m) => m.id === memberId);
    if (!targetMember) return;
    const covered = getMemberAdvanceCoverage(targetMember).coveredDates;
    const createdItems: Deposit[] = [];
    dates.forEach((dStr, idx) => {
      if (skipDuplicates && covered.has(dStr)) return;
      createdItems.push({
        id: `d_${Date.now()}_${idx}_${Math.floor(Math.random() * 1000)}`,
        date: dStr,
        amount,
        note,
      });
    });

    if (createdItems.length === 0) {
      showToast('নির্বাচিত তারিখগুলোতে আগেই জমা রয়েছে!');
      return;
    }

    void commitDb(
      (prev) => ({
        ...prev,
        members: prev.members.map((m) =>
          m.id === memberId ? { ...m, deposits: [...m.deposits, ...createdItems] } : m
        ),
      }),
      `${toBn(createdItems.length)} দিনের (৳${toBn(createdItems.length * amount)}) জমা আপডেট হয়েছে!`
    );
  };

  // Member bKash Payment Request Submission
  const handleSubmitPaymentRequest = useCallback(
    async (payload: {
      memberId: number;
      senderPhone: string;
      trxId: string;
      amount: number;
      date: string;
      note: string;
    }): Promise<{ ok: boolean; error?: string }> => {
      try {
        const res = await fetch('/api/payment-requests', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
        if (!res.ok || !data.ok) {
          return { ok: false, error: data.error || 'পেমেন্ট রিকোয়েস্ট জমা দেওয়া যায়নি' };
        }
        showToast('বিকাশ পেমেন্ট রিকোয়েস্ট সফলভাবে জমা হয়েছে!');
        void fetchPaymentRequests();
        return { ok: true };
      } catch {
        return { ok: false, error: 'সার্ভারের সাথে সংযোগ করা যায়নি' };
      }
    },
    [fetchPaymentRequests, showToast]
  );

  // Admin / Cashier Payment Request Approve / Reject
  const handleReviewPaymentRequest = useCallback(
    async (requestId: string, decision: 'approved' | 'rejected', reviewNote = '') => {
      try {
        const headers = await buildAdminHeaders();
        const res = await fetch(`/api/payment-requests/${requestId}/review`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ decision, reviewNote }),
        });
        const data = (await res.json().catch(() => ({}))) as {
          ok?: boolean;
          state?: UnityDatabase;
          error?: string;
        };
        if (!res.ok || !data.ok) {
          showToast(data.error || 'সিদ্ধান্ত সংরক্ষণ করা যায়নি');
          return;
        }
        if (data.state) {
          const structured = ensureDatabaseStructure(data.state);
          setDb(structured);
          safeStorageSet(STORAGE_KEY, JSON.stringify(structured));
        }
        showToast(
          decision === 'approved'
            ? 'পেমেন্ট অনুমোদিত হয়েছে এবং সদস্যের হিসাবে যুক্ত হয়েছে!'
            : 'পেমেন্ট রিকোয়েস্ট বাতিল করা হয়েছে'
        );
        void fetchPaymentRequests();
        void fetchAuditLogs();
      } catch {
        showToast('সার্ভারের সাথে সংযোগ করা যায়নি');
      }
    },
    [buildAdminHeaders, fetchAuditLogs, fetchPaymentRequests, showToast]
  );

  // Super Admin: Promote / Demote Cashier Role
  const handleUpdateUserRole = useCallback(
    async (target: string, role: 'cashier' | 'member', displayName?: string) => {
      try {
        const headers = await buildAdminHeaders();
        const res = await fetch('/api/users/role', {
          method: 'PATCH',
          headers,
          body: JSON.stringify({ target, role, displayName }),
        });
        const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
        if (!res.ok || !data.ok) {
          showToast(data.error || 'রোল পরিবর্তন করা যায়নি');
          return;
        }
        showToast(
          role === 'cashier'
            ? 'ক্যাশিয়ার / সহ-এডমিন রোল সফলভাবে যুক্ত হয়েছে!'
            : 'ক্যাশিয়ার রোল বাতিল করা হয়েছে'
        );
        void fetchActiveUsers();
        void fetchAuditLogs();
      } catch {
        showToast('সার্ভারের সাথে সংযোগ করা যায়নি');
      }
    },
    [buildAdminHeaders, fetchActiveUsers, fetchAuditLogs, showToast]
  );

  const handleDeleteDeposit = (memberId: number, depositId: string) => {
    setConfirmState({
      message: 'আপনি কি এই জমার এন্ট্রিটি মুছে ফেলতে চান?',
      onConfirm: () => {
        void commitDb(
          (prev) => ({
            ...prev,
            members: prev.members.map((m) =>
              m.id === memberId ? { ...m, deposits: m.deposits.filter((d) => d.id !== depositId) } : m
            ),
          }),
          'হিসাবটি মুছে ফেলা হয়েছে'
        );
      },
    });
  };

  const handleEditMember = useCallback(
    async (
      payload: MemberFullUpdatePayload
    ): Promise<{ ok: boolean; error?: string; memberId?: number }> => {
      const { oldId, newId, name, phone, photoUrl, swapIfTaken = true } = payload;
      const trimmedName = name.trim();
      const trimmedPhone = phone.trim();
      if (!trimmedName) {
        return { ok: false, error: 'সদস্যের নাম লিখুন।' };
      }

      try {
        const headers = await buildAdminHeaders();
        const res = await fetch(`/api/admin/members/${oldId}`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify({
            newId,
            name: trimmedName,
            phone: trimmedPhone,
            ...(photoUrl !== undefined ? { photoUrl } : {}),
            swapIfTaken,
          }),
        });
        const data = (await res.json().catch(() => ({}))) as {
          ok?: boolean;
          error?: string;
          memberId?: number;
          swappedWithName?: string;
          state?: UnityDatabase;
        };

        if (!res.ok || !data.ok || !data.state) {
          return {
            ok: false,
            error: data.error || 'সদস্যের তথ্য সংরক্ষণ করা যায়নি।',
          };
        }

        const normalized = ensureDatabaseStructure(data.state);
        latestDbRef.current = normalized;
        setDb(normalized);
        safeStorageSet(STORAGE_KEY, JSON.stringify(normalized));

        if (data.memberId && data.memberId !== oldId) {
          setHistoryStack((prev) =>
            prev.map((entry) =>
              entry.page === 'member' && entry.memberId === oldId
                ? { ...entry, memberId: data.memberId }
                : entry
            )
          );
        }

        void fetchPaymentRequests();
        void fetchAuditLogs();

        const toastMsg =
          data.memberId && data.memberId !== oldId
            ? data.swappedWithName
              ? `সিরিয়াল/আইডি #${toBn(oldId)} ⇄ #${toBn(data.memberId)} (${data.swappedWithName}) অদল-বদল ও তথ্য আপডেট হয়েছে!`
              : `সদস্যের সিরিয়াল/আইডি #${toBn(oldId)} → #${toBn(data.memberId)} ও তথ্য আপডেট হয়েছে!`
            : 'সদস্যের সকল তথ্য সফলভাবে আপডেট হয়েছে!';
        showToast(toastMsg);
        return { ok: true, memberId: data.memberId || newId };
      } catch {
        return {
          ok: false,
          error: 'সার্ভারের সাথে সংযোগ বিচ্ছিন্ন। ইন্টারনেট সংযোগ পরীক্ষা করে আবার চেষ্টা করুন।',
        };
      }
    },
    [buildAdminHeaders, fetchAuditLogs, fetchPaymentRequests, showToast]
  );

  const handleUpdateMemberPhoto = useCallback(
    async (
      memberId: number,
      photoUrl: string,
      memberPhone?: string
    ): Promise<{ ok: boolean; error?: string }> => {
      try {
        const headers =
          isStaff || isVerifiedGoogleAdmin
            ? await buildAdminHeaders()
            : { 'Content-Type': 'application/json' };

        const res = await fetch(`/api/members/${memberId}/photo`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify({
            photoUrl,
            ...(memberPhone ? { memberPhone } : {}),
          }),
        });

        const data = (await res.json().catch(() => ({}))) as {
          ok?: boolean;
          photoUrl?: string;
          updatedAtMs?: number;
          error?: string;
        };

        if (!res.ok || !data.ok) {
          return {
            ok: false,
            error: data.error || 'প্রোফাইল ছবি সংরক্ষণ করা যায়নি।',
          };
        }

        const savedPhoto = data.photoUrl ?? '';
        const nextTimestamp = data.updatedAtMs || Date.now();
        setDb((prev) => {
          const next: UnityDatabase = {
            ...prev,
            updatedAtMs: Math.max(prev.updatedAtMs, nextTimestamp),
            lastBackup: new Date().toLocaleString('bn-BD'),
            members: prev.members.map((m) => {
              if (m.id !== memberId) return m;
              if (savedPhoto) return { ...m, photoUrl: savedPhoto };
              const { photoUrl: _removed, ...rest } = m;
              return rest;
            }),
          };
          safeStorageSet(STORAGE_KEY, JSON.stringify(next));
          return next;
        });

        showToast(
          savedPhoto
            ? 'প্রোফাইল ছবি সফলভাবে ডেটাবেজে সংরক্ষিত হয়েছে!'
            : 'প্রোফাইল ছবি মুছে ফেলা হয়েছে।'
        );
        return { ok: true };
      } catch {
        return {
          ok: false,
          error: 'সার্ভারের সাথে সংযোগ করা যায়নি। ইন্টারনেট সংযোগ পরীক্ষা করুন।',
        };
      }
    },
    [buildAdminHeaders, isAdmin, isVerifiedGoogleAdmin, showToast]
  );

  const handleDeleteMember = (memberId: number) => {
    const target = db.members.find((m) => m.id === memberId);
    if (!target) return;
    setConfirmState({
      message: `সতর্কতা: "${target.name}"-কে তালিকা থেকে মুছে ফেলতে চান? তার সকল জমার হিসাবও মুছে যাবে।`,
      onConfirm: () => {
        void commitDb(
          (prev) => ({
            ...prev,
            members: prev.members.filter((m) => m.id !== memberId),
          }),
          'সদস্যকে মুছে ফেলা হয়েছে'
        );
        navigateTo({ page: 'home' });
      },
    });
  };

  const handleAddMember = (name: string, phone: string) => {
    const nextId = db.members.length ? Math.max(...db.members.map((m) => m.id)) + 1 : 1;
    const newMember = { id: nextId, name: name.trim(), phone: phone.trim(), deposits: [] };
    void commitDb(
      (prev) => ({
        ...prev,
        members: [...prev.members, newMember],
      }),
      `${name} সফলভাবে যুক্ত হয়েছেন (আইডি #${toBn(nextId)})`
    );
    navigateTo({ page: 'home' });
  };

  // Rules handlers
  const handleAddRule = (title: string, description: string) => {
    void commitDb(
      (prev) => ({
        ...prev,
        rules: [...prev.rules, { id: `r_${Date.now()}`, title, description }],
      }),
      'নতুন নিয়ম যুক্ত হয়েছে'
    );
  };

  const handleUpdateRule = (id: string, title: string, description: string) => {
    void commitDb(
      (prev) => ({
        ...prev,
        rules: prev.rules.map((r) => (r.id === id ? { ...r, title, description } : r)),
      }),
      'নিয়মটি আপডেট হয়েছে'
    );
  };

  const handleDeleteRule = (id: string) => {
    setConfirmState({
      message: 'আপনি কি এই নিয়মটি মুছে ফেলতে চান?',
      onConfirm: () => {
        void commitDb(
          (prev) => ({
            ...prev,
            rules: prev.rules.filter((r) => r.id !== id),
          }),
          'নিয়মটি মুছে ফেলা হয়েছে'
        );
      },
    });
  };

  const handleMoveRule = (index: number, direction: 'up' | 'down') => {
    void commitDb((prev) => {
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= prev.rules.length) return prev;
      const next = [...prev.rules];
      const [item] = next.splice(index, 1);
      next.splice(targetIndex, 0, item);
      return { ...prev, rules: next };
    });
  };

  // Current route objects
  const selectedMember =
    currentRoute.page === 'member'
      ? db.members.find((m) => m.id === currentRoute.memberId) || null
      : null;

  const selectedCustomToggle =
    currentRoute.page === 'customToggle'
      ? db.appConfig.customToggles.find((t) => t.id === currentRoute.customToggleId) || null
      : null;

  const pageTitle = getRouteLabel(currentRoute, db);
  const previousPageLabel = previousRoute ? getRouteLabel(previousRoute, db) : null;

  const effectiveAppLogoUrl =
    db.appConfig.appLogoUrl || db.appConfig.appIcon192Url || db.appConfig.appIconUrl;

  if (appExited) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
        <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="mx-auto flex items-center justify-center">
            {isSafeRasterPhotoDataUrl(effectiveAppLogoUrl) || isSafeAppIconDataUrl(effectiveAppLogoUrl) ? (
              <AppLogo logoUrl={effectiveAppLogoUrl} size="lg" variant="surface" />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300">
                <CheckCircle2 className="h-6 w-6" />
              </div>
            )}
          </div>
          <h1 className="font-display mt-4 text-lg font-bold text-slate-900 dark:text-slate-100">
            অ্যাপ থেকে বের হয়েছেন
          </h1>
          <p className="mt-1.5 text-xs font-semibold tracking-wide text-teal-700 dark:text-teal-400">
            BARAKAH MULTICARE HOSPITAL UNITY
          </p>
          <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            আপনার সকল হিসাব ও তথ্য নিরাপদে সংরক্ষিত আছে এবং সেশনটি সফলভাবে বন্ধ করা হয়েছে।
          </p>
          <p className="mt-2 rounded-xl bg-slate-50 px-3 py-2 text-[11px] leading-relaxed text-slate-500 dark:bg-slate-800/80 dark:text-slate-400">
            এখন চাইলে ব্রাউজার ট্যাব বন্ধ করুন অথবা ডিভাইসের ব্যাক বাটন চাপুন।
          </p>
          <button
            type="button"
            onClick={reenterApp}
            className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-teal-700 px-4 text-sm font-semibold text-white transition-colors hover:bg-teal-800 active:scale-[0.98]"
          >
            <span>অ্যাপে পুনরায় প্রবেশ করুন</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20 text-slate-900 transition-colors dark:bg-slate-950 dark:text-slate-100 md:pb-10">
      <TopBar
        page={currentRoute.page}
        pageTitle={pageTitle}
        previousPageLabel={previousPageLabel}
        canGoBack={historyStack.length > 1}
        isAdmin={isStaff}
        hasAvailableUpdate={Boolean(updateCheck?.hasUpdate || newBuildAvailable)}
        appLogoUrl={effectiveAppLogoUrl}
        onNavigate={(page) => navigateTo({ page })}
        onGoBack={goBack}
        onOpenAdminGate={() => {
          setPendingRouteAfterLogin({ page: 'admin' });
          setPinInput('');
          setPinError('');
          setAdminGateOpen(true);
        }}
        onOpenShare={() => setShareModalOpen(true)}
      />

      <main className="mx-auto max-w-6xl px-4 pt-5 sm:px-6">
        {/* Live Cross-Device App Update Strip (appears whenever a new deployed build/SW is detected) */}
        {newBuildAvailable && (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2.5 rounded-2xl border border-teal-300 bg-teal-50 px-4 py-3 text-xs print:hidden dark:border-teal-800 dark:bg-teal-950/60">
            <div className="flex min-w-0 items-center gap-2.5">
              <RefreshCw className="h-4 w-4 shrink-0 text-teal-700 dark:text-teal-300" />
              <p className="font-semibold text-teal-950 dark:text-teal-100">
                অ্যাপের নতুন ভার্সন আপডেট পাওয়া গেছে! সর্বশেষ ফিচার ও ডেটা পেতে আপডেট করুন।
              </p>
            </div>
            <button
              type="button"
              onClick={() => void handleApplyServerUpdate()}
              className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-xl bg-teal-700 px-3.5 text-xs font-semibold text-white transition-colors hover:bg-teal-800 active:scale-[0.98]"
            >
              <CloudDownload className="h-3.5 w-3.5" />
              <span>এখনই আপডেট করুন</span>
            </button>
          </div>
        )}

        {/* HOME PAGE */}
        {currentRoute.page === 'home' && (
          <div className="space-y-5">
            {/* Smart 1-Click Install Banner (auto-shows on ?install=1 links or in-app browsers) */}
            <SmartInstallBanner
              customPublicUrl={db.appConfig.publicAppUrl}
              serverSharedUrl={serverSharedUrl}
              onInstalled={() => showToast('অ্যাপটি সফলভাবে ইনস্টল হয়েছে!')}
              onCopyLink={handleCopyText}
            />

            {/* Hero Identity + Live Running Ticker */}
            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
              <div
                className="px-5 py-5 text-white sm:px-6"
                style={{
                  background: `linear-gradient(135deg, ${db.appConfig.themeColor || '#0f766e'} 0%, #0d9488 100%)`,
                }}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3.5">
                    <AppLogo
                      logoUrl={effectiveAppLogoUrl}
                      size="lg"
                      variant="onBrand"
                    />
                    <div className="min-w-0">
                      <h1 className="font-display text-lg font-bold tracking-tight text-balance sm:text-2xl">
                        BARAKAH MULTICARE HOSPITAL UNITY
                      </h1>
                      <p className="mt-1 flex flex-wrap items-baseline gap-x-1.5 text-xs font-medium text-teal-50/95 sm:text-sm">
                        <span className="inline-flex items-baseline">
                          <span>{db.adminName}</span>
                          <span className="ml-1 font-sans text-[11px] font-medium tracking-wider text-white/50">
                            Admin
                          </span>
                        </span>
                        <span aria-hidden="true" className="opacity-60">·</span>
                        <span>সদস্য: {toBn(db.members.length)} জন</span>
                        <span aria-hidden="true" className="opacity-60">·</span>
                        <span>ভার্সন v{db.appConfig.appVersion}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <PWAInstallButton
                      variant="hero"
                      customPublicUrl={db.appConfig.publicAppUrl}
                      serverSharedUrl={serverSharedUrl}
                      onInstalled={() => showToast('অ্যাপটি সফলভাবে ইনস্টল হয়েছে!')}
                      onCopyLink={handleCopyText}
                      onDownloadOfflineApp={handleDownloadUpdatedHtml}
                    />
                    <button
                      type="button"
                      onClick={() => setShareModalOpen(true)}
                      aria-label="অ্যাপ শেয়ার করুন"
                      className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl bg-white/15 px-3 text-xs font-semibold text-white backdrop-blur-xs transition-colors hover:bg-white/25 whitespace-nowrap"
                    >
                      <Share2 className="h-4 w-4" />
                      <span>শেয়ার</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const firstEnabled = db.appConfig.automatedPopups.find((p) => p.enabled);
                        if (firstEnabled) setActivePopup(firstEnabled);
                        else showToast('বর্তমানে কোনো অটোমেটেড বার্তা নেই');
                      }}
                      aria-label="অটোমেটেড বার্তা দেখুন"
                      className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-white/15 px-3 text-xs font-semibold text-white backdrop-blur-xs transition-colors hover:bg-white/25 whitespace-nowrap"
                    >
                      <Bell className="h-4 w-4" />
                      <span>বার্তা</span>
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        commitDb((prev) => ({
                          ...prev,
                          appConfig: { ...prev.appConfig, darkMode: !prev.appConfig.darkMode },
                        }))
                      }
                      aria-label="থিম পরিবর্তন করুন"
                      className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 text-white backdrop-blur-xs transition-colors hover:bg-white/25"
                    >
                      {db.appConfig.darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                    </button>
                    <button
                      type="button"
                      onClick={openExitConfirm}
                      aria-label="অ্যাপ থেকে বের হোন"
                      title="অ্যাপ থেকে বের হোন (Exit)"
                      className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-white/15 px-3 text-xs font-semibold text-white backdrop-blur-xs transition-colors hover:bg-red-600/80 whitespace-nowrap"
                    >
                      <LogOut className="h-4 w-4" />
                      <span>Exit</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Always-Running Marquee Ticker */}
              <div className="flex items-center border-t border-slate-100 bg-slate-900 py-2 text-white dark:border-slate-800 dark:bg-slate-950">
                <span className="shrink-0 bg-teal-700 px-3 py-0.5 text-xs font-bold text-white">
                  বিজ্ঞপ্তি
                </span>
                <div className="flex-1 overflow-hidden whitespace-nowrap">
                  <div className="animate-barakah-marquee text-xs font-medium sm:text-sm">
                    {db.appConfig.homeTickerText}
                  </div>
                </div>
              </div>
            </section>

            {/* Quiet Member Push Notification Opt-In Strip (shown only when permission is default & not dismissed) */}
            {notifPermission === 'default' && !notifOptInDismissed && (
              <div className="flex flex-wrap items-center justify-between gap-2.5 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs print:hidden dark:border-slate-800 dark:bg-slate-900">
                <div className="flex min-w-0 items-center gap-2.5">
                  <Bell className="h-4 w-4 shrink-0 text-teal-700 dark:text-teal-400" />
                  <p className="text-slate-700 dark:text-slate-300">
                    আসন্ন কিস্তির রিমাইন্ডার ও জরুরি নোটিশ সরাসরি পেতে পুশ নোটিফিকেশন চালু করুন।
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={async () => {
                      const perm = await requestNotificationPermission();
                      setNotifPermission(perm);
                      if (perm === 'granted') {
                        showToast('পুশ নোটিফিকেশন চালু হয়েছে!');
                      } else if (perm === 'denied') {
                        showToast('নোটিফিকেশন ব্লক করা আছে — ব্রাউজার সেটিংস থেকে Allow করুন।');
                      }
                    }}
                    className="min-h-[36px] rounded-xl bg-teal-700 px-3 text-xs font-semibold text-white hover:bg-teal-800 whitespace-nowrap"
                  >
                    চালু করুন
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setNotifOptInDismissed(true);
                      safeStorageSet('barakah_notif_optin_dismissed_v1', '1');
                    }}
                    className="min-h-[36px] rounded-xl px-2 text-xs font-medium text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                  >
                    পরে
                  </button>
                </div>
              </div>
            )}

            {/* Pinned Notice Banner (1d / 1w / 1m) */}
            <PinnedNoticeBanner
              notice={db.appConfig.pinnedNotice}
              isAdmin={isAdmin}
              onUnpin={() =>
                commitDb(
                  (prev) => ({
                    ...prev,
                    appConfig: { ...prev.appConfig, pinnedNotice: null },
                  }),
                  'পিন করা নোটিশ সরানো হয়েছে'
                )
              }
            />

            {/* Optional Fund Target Progress */}
            {db.appConfig.fundTarget > 0 && (
              <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                <div className="mb-1.5 flex items-center justify-between text-xs font-semibold">
                  <span className="text-slate-600 dark:text-slate-300">ফান্ড লক্ষ্যমাত্রা</span>
                  <span className="font-mono-num text-teal-700 dark:text-teal-400">
                    ৳ {toBn(stats.totalFund)} / ৳ {toBn(db.appConfig.fundTarget)} (
                    {toBn(Math.min(100, Math.round((stats.totalFund / db.appConfig.fundTarget) * 100)))}%)
                  </span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <div
                    className="h-full rounded-full bg-teal-600 transition-all"
                    style={{
                      width: `${Math.min(100, Math.round((stats.totalFund / db.appConfig.fundTarget) * 100))}%`,
                    }}
                  />
                </div>
              </div>
            )}

            {/* Main Desktop 2-Column Workspace / Mobile Stacked */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
              {/* Left Column: Dashboard Toggles */}
              <div className="space-y-4 lg:col-span-5">
                <div className="flex items-center justify-between">
                  <h2 className="font-display text-base font-bold text-slate-900 dark:text-slate-100">
                    কুইক টুগল ও সেবাসমূহ
                  </h2>
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => {
                        setAdminTab('toggles');
                        navigateTo({ page: 'admin' });
                      }}
                      className="text-xs font-semibold text-teal-700 hover:underline dark:text-teal-400"
                    >
                      টুগল কন্ট্রোল
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {enabledToggles.kisti && (
                    <button
                      type="button"
                      onClick={() => navigateTo({ page: 'kisti' })}
                      className="flex min-h-[96px] flex-col justify-between rounded-2xl border border-slate-200 bg-white p-4 text-left transition-all hover:border-teal-600/40 active:scale-[0.98] dark:border-slate-800 dark:bg-slate-900 dark:hover:border-teal-500/40"
                    >
                      <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
                        <span>মোট প্রদেয় কিস্তি</span>
                        <Receipt className="h-4 w-4 text-teal-700 dark:text-teal-400" />
                      </div>
                      <p className="font-mono-num text-xl font-bold text-teal-700 dark:text-teal-400">
                        {toBn(stats.totalKisti)} টি
                      </p>
                    </button>
                  )}

                  {enabledToggles.draws && (
                    <button
                      type="button"
                      onClick={() => navigateTo({ page: 'draws' })}
                      className="flex min-h-[96px] flex-col justify-between rounded-2xl border border-slate-200 bg-white p-4 text-left transition-all hover:border-amber-500/40 active:scale-[0.98] dark:border-slate-800 dark:bg-slate-900"
                    >
                      <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
                        <span>ড্র পাওয়া ব্যক্তি</span>
                        <Award className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                      </div>
                      <p className="font-mono-num text-xl font-bold text-amber-700 dark:text-amber-400">
                        {toBn(stats.totalDrawCount)} জন
                      </p>
                    </button>
                  )}

                  {enabledToggles.fund && (
                    <button
                      type="button"
                      onClick={() => navigateTo({ page: 'fund' })}
                      className="flex min-h-[96px] flex-col justify-between rounded-2xl border border-slate-200 bg-white p-4 text-left transition-all hover:border-sky-500/40 active:scale-[0.98] dark:border-slate-800 dark:bg-slate-900"
                    >
                      <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
                        <span>টোটাল ফান্ড</span>
                        <Wallet className="h-4 w-4 text-sky-700 dark:text-sky-400" />
                      </div>
                      <p className="font-mono-num text-xl font-bold text-sky-700 dark:text-sky-400">
                        ৳ {toBn(stats.totalFund)}
                      </p>
                    </button>
                  )}

                  {enabledToggles.dailyPayments && (
                    <button
                      type="button"
                      onClick={() => navigateTo({ page: 'dailyPayments' })}
                      className="flex min-h-[96px] flex-col justify-between rounded-2xl border border-slate-200 bg-white p-4 text-left transition-all hover:border-emerald-600/40 active:scale-[0.98] dark:border-slate-800 dark:bg-slate-900"
                    >
                      <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
                        <span>দৈনিক তালিকা</span>
                        <CalendarCheck2 className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
                      </div>
                      <div>
                        <p className="font-mono-num text-sm font-bold text-emerald-700 dark:text-emerald-400">
                          জমা: {toBn(todayBreakdown.paid.length)} জন
                        </p>
                        <p className="font-mono-num text-xs font-medium text-red-600 dark:text-red-400">
                          বাকি: {toBn(todayBreakdown.unpaid.length)} জন
                        </p>
                      </div>
                    </button>
                  )}

                  {enabledToggles.reports !== false && (
                    <button
                      type="button"
                      onClick={() => navigateTo({ page: 'reports' })}
                      className="flex min-h-[96px] flex-col justify-between rounded-2xl border border-slate-200 bg-white p-4 text-left transition-all hover:border-emerald-600/40 active:scale-[0.98] dark:border-slate-800 dark:bg-slate-900"
                    >
                      <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
                        <span>মাসিক রিপোর্ট</span>
                        <FileSpreadsheet className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                          Excel ও PDF
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">মাসিক / বাৎসরিক</p>
                      </div>
                    </button>
                  )}

                  {enabledToggles.userList !== false && (
                    <button
                      type="button"
                      onClick={() => navigateTo({ page: 'userList' })}
                      className="flex min-h-[96px] flex-col justify-between rounded-2xl border border-slate-200 bg-white p-4 text-left transition-all hover:border-teal-600/40 active:scale-[0.98] dark:border-slate-800 dark:bg-slate-900"
                    >
                      <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
                        <span>ইউজার লিস্ট</span>
                        <Users className="h-4 w-4 text-teal-700 dark:text-teal-400" />
                      </div>
                      <div>
                        <p className="font-mono-num flex items-center gap-1.5 text-sm font-bold text-emerald-700 dark:text-emerald-400">
                          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                          {toBn(Math.max(1, onlineSessions.length))} জন এক্টিভ
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          লগইন: {toBn(registeredUsers.length)} জন
                        </p>
                      </div>
                    </button>
                  )}

                  {enabledToggles.rules && (
                    <button
                      type="button"
                      onClick={() => navigateTo({ page: 'rules' })}
                      className="flex min-h-[96px] flex-col justify-between rounded-2xl border border-slate-200 bg-white p-4 text-left transition-all hover:border-indigo-500/40 active:scale-[0.98] dark:border-slate-800 dark:bg-slate-900"
                    >
                      <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
                        <span>রুলস &amp; রেগুলেশন</span>
                        <BookOpen className="h-4 w-4 text-indigo-700 dark:text-indigo-400" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                          {toBn(db.rules.length)}টি নিয়মাবলি
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">বিস্তারিত পড়ুন</p>
                      </div>
                    </button>
                  )}

                  {enabledToggles.addMember && (
                    <button
                      type="button"
                      onClick={() => navigateTo({ page: 'addMember' })}
                      className="flex min-h-[96px] flex-col justify-between rounded-2xl border border-slate-200 bg-white p-4 text-left transition-all hover:border-teal-600/40 active:scale-[0.98] dark:border-slate-800 dark:bg-slate-900"
                    >
                      <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
                        <span>নতুন সদস্য এড</span>
                        <UserPlus className="h-4 w-4 text-slate-700 dark:text-slate-300" />
                      </div>
                      <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                        {isAdmin ? '+ সদস্য যুক্ত করুন' : 'শুধুমাত্র এডমিন'}
                      </p>
                    </button>
                  )}

                  {enabledToggles.payment && (
                    <button
                      type="button"
                      onClick={() => navigateTo({ page: 'payment' })}
                      className="col-span-2 flex items-center justify-between gap-3 rounded-2xl border border-pink-200/80 bg-white p-4 text-left transition-all hover:border-pink-400 active:scale-[0.99] dark:border-pink-900/50 dark:bg-slate-900"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-pink-50 text-pink-700 dark:bg-pink-950/60 dark:text-pink-400">
                          <CreditCard className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                            পেমেন্ট (নগদ ও বিকাশ পার্সোনাল)
                          </p>
                          <p className="font-mono-num text-xs text-pink-700 dark:text-pink-400">
                            বিকাশ: {db.appConfig.bkashNumber}
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-slate-400" />
                    </button>
                  )}

                  {enabledToggles.updates && (
                    <button
                      type="button"
                      onClick={() => navigateTo({ page: 'updates' })}
                      className="col-span-2 flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-left transition-all hover:border-teal-600/40 active:scale-[0.99] dark:border-slate-800 dark:bg-slate-900"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-400">
                          <CloudDownload className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                            অ্যাপ আপডেট ও ব্যাকআপ (v{db.appConfig.appVersion})
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            অ্যাপ থেকেই পরবর্তী আপডেট চেক ও ইনস্টল করুন
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-slate-400" />
                    </button>
                  )}

                  {/* Admin-Created Custom Toggles */}
                  {activeCustomToggles.map((ct) => (
                    <button
                      key={ct.id}
                      type="button"
                      onClick={() => navigateTo({ page: 'customToggle', customToggleId: ct.id })}
                      className="col-span-2 flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-left transition-all hover:border-teal-600/40 active:scale-[0.99] dark:border-slate-800 dark:bg-slate-900"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                          <Layers className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-slate-900 dark:text-slate-100">
                            {ct.title}
                          </p>
                          <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                            {ct.subtitle}
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 shrink-0 text-slate-400" />
                    </button>
                  ))}
                </div>
              </div>

              {/* Right Column: Member Directory */}
              <div className="space-y-3 lg:col-span-7">
                <div className="flex items-center justify-between">
                  <h2 className="font-display text-base font-bold text-slate-900 dark:text-slate-100">
                    সদস্য তালিকা ({toBn(db.members.length)} জন)
                  </h2>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    হিসাব দেখতে ক্লিক করুন
                  </span>
                </div>

                <div className="relative">
                  <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="নাম, আইডি বা মোবাইল নম্বর দিয়ে খুঁজুন..."
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white pr-4 pl-10 text-sm text-slate-900 outline-none focus:border-teal-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
                  />
                </div>

                <div className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">
                  {filteredMembers.length === 0 ? (
                    <div className="p-8 text-center text-sm text-slate-500">কোনো সদস্য পাওয়া যায়নি</div>
                  ) : (
                    filteredMembers.map((m) => {
                      const total = getMemberTotal(m);
                      const kisti = getMemberInstallments(m);
                      const paidThrough = getMemberAdvanceCoverage(m).paidThroughDate;
                      const hasActiveAdvance = Boolean(paidThrough && paidThrough > todayISO);
                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => navigateTo({ page: 'member', memberId: m.id })}
                          className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50 active:bg-slate-100 dark:hover:bg-slate-800/50"
                        >
                          <div className="flex min-w-0 items-center gap-3">
                            <MemberAvatar
                              memberId={m.id}
                              name={m.name}
                              photoUrl={m.photoUrl}
                              size="sm"
                              showIdBadge
                            />
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                                {m.name}
                              </p>
                              <p className="font-mono-num text-xs text-slate-500 dark:text-slate-400">
                                {m.phone}
                              </p>
                            </div>
                          </div>
                          <div className="shrink-0 text-right">
                            <p className="font-mono-num text-sm font-bold text-teal-700 dark:text-teal-400">
                              ৳ {toBn(total)}
                            </p>
                            <p className="font-mono-num text-[11px] text-slate-500 dark:text-slate-400">
                              {toBn(kisti)} টি কিস্তি
                            </p>
                            {hasActiveAdvance && paidThrough && (
                              <p className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400">
                                এডভান্স: {formatDateBn(paidThrough)} পর্যন্ত
                              </p>
                            )}
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SUB-PAGES */}
        {currentRoute.page === 'member' && selectedMember && (
          <MemberDetailView
            key={selectedMember.id}
            member={selectedMember}
            allMembers={db.members}
            adminName={db.adminName}
            appLogoUrl={effectiveAppLogoUrl}
            isAdmin={isAdmin}
            canCollect={isStaff}
            onAddDeposit={(memberId, date, amount, note) => void handleAddDeposit(memberId, date, amount, note)}
            onAddRangeDeposit={(memberId, startISO, endISO, amount, note, skipDup) =>
              void handleAddRangeDeposit(memberId, startISO, endISO, amount, note, skipDup)
            }
            onDeleteDeposit={handleDeleteDeposit}
            onEditMember={handleEditMember}
            onDeleteMember={handleDeleteMember}
            onUpdateMemberPhoto={handleUpdateMemberPhoto}
            onNotify={showToast}
            onCopyText={handleCopyText}
          />
        )}

        {currentRoute.page === 'kisti' && (
          <KistiView db={db} onSelectMember={(id) => navigateTo({ page: 'member', memberId: id })} />
        )}

        {currentRoute.page === 'draws' && (
          <DrawsView
            db={db}
            isAdmin={isAdmin}
            canManageDraws={isStaff}
            onAddDraw={(memberId, date, amount, note) => {
              const m = db.members.find((x) => x.id === memberId);
              if (!m) return;

              if (isCashier && !isAdmin) {
                void (async () => {
                  try {
                    const headers = await buildAdminHeaders();
                    const res = await fetch('/api/staff/draws', {
                      method: 'POST',
                      headers,
                      body: JSON.stringify({ memberId, date, amount, note }),
                    });
                    const data = (await res.json().catch(() => ({}))) as {
                      ok?: boolean;
                      state?: UnityDatabase;
                      error?: string;
                    };
                    if (!res.ok || !data.ok) {
                      showToast(data.error || 'ড্র সংরক্ষণ করা যায়নি');
                      return;
                    }
                    if (data.state) {
                      const structured = ensureDatabaseStructure(data.state);
                      setDb(structured);
                      safeStorageSet(STORAGE_KEY, JSON.stringify(structured));
                    }
                    showToast(`${m.name} ড্র বিজয়ী হিসেবে যুক্ত হয়েছেন`);
                  } catch {
                    showToast('সার্ভারের সাথে সংযোগ করা যায়নি');
                  }
                })();
                return;
              }

              const newDraw = {
                id: `dr_${Date.now()}`,
                memberId: m.id,
                memberName: m.name,
                date,
                amount,
                note,
              };
              void commitDb(
                (prev) => ({
                  ...prev,
                  draws: [...prev.draws, newDraw],
                }),
                `${m.name} ড্র বিজয়ী হিসেবে যুক্ত হয়েছেন`
              );
            }}
            onDeleteDraw={(drawId) =>
              setConfirmState({
                message: 'এই ড্র এন্ট্রিটি মুছে ফেলতে চান?',
                onConfirm: () =>
                  void commitDb(
                    (prev) => ({ ...prev, draws: prev.draws.filter((d) => d.id !== drawId) }),
                    'ড্র তথ্য মুছে ফেলা হয়েছে'
                  ),
              })
            }
          />
        )}

        {currentRoute.page === 'fund' && (
          <FundView
            db={db}
            onSelectMember={(id) => navigateTo({ page: 'member', memberId: id })}
            onOpenReports={() => navigateTo({ page: 'reports' })}
          />
        )}

        {currentRoute.page === 'reports' && (
          <ReportsView
            db={db}
            isAdmin={isAdmin}
            onSelectMember={(id) => navigateTo({ page: 'member', memberId: id })}
            onNotify={showToast}
          />
        )}

        {currentRoute.page === 'userList' && (
          <UserListView
            onlineSessions={onlineSessions}
            registeredUsers={registeredUsers}
            currentUserEmail={authUser?.email || null}
            currentUserDisplayName={authUser?.displayName || null}
            currentUserRole={currentUserRole}
            isAdmin={isAdmin}
            loading={usersLoading}
            onRefresh={() => void fetchActiveUsers()}
            onGoogleSignIn={handleMemberGoogleSignIn}
            onGoogleSignOut={handleMemberGoogleSignOut}
            onUpdateUserRole={(target, role) => handleUpdateUserRole(target, role)}
          />
        )}

        {currentRoute.page === 'dailyPayments' && (
          <DailyPaymentsView
            members={db.members}
            isAdmin={isStaff}
            bkashNumber={db.appConfig.bkashNumber}
            onSelectMember={(id) => navigateTo({ page: 'member', memberId: id })}
            onQuickCollect={(memberId, dateISO, amount) =>
              void handleAddDeposit(memberId, dateISO, amount, 'দৈনিক কিস্তি')
            }
            onCopyText={handleCopyText}
          />
        )}

        {currentRoute.page === 'rules' && (
          <RulesView
            rules={db.rules}
            isAdmin={isAdmin}
            onAddRule={handleAddRule}
            onUpdateRule={handleUpdateRule}
            onDeleteRule={handleDeleteRule}
            onMoveRule={handleMoveRule}
          />
        )}

        {currentRoute.page === 'payment' && (
          <PaymentView
            db={db}
            paymentRequests={paymentRequests}
            onSubmitPaymentRequest={handleSubmitPaymentRequest}
            onCopyText={handleCopyText}
          />
        )}

        {currentRoute.page === 'addMember' && isAdmin && (
          <AddMemberView
            nextId={db.members.length ? Math.max(...db.members.map((m) => m.id)) + 1 : 1}
            onAddMember={handleAddMember}
          />
        )}

        {currentRoute.page === 'customToggle' && selectedCustomToggle && (
          <CustomToggleDetailView toggle={selectedCustomToggle} onCopyText={handleCopyText} />
        )}

        {currentRoute.page === 'updates' && (
          <UpdateBackupView
            db={db}
            isAdmin={isAdmin}
            checkingUpdate={checkingUpdate}
            updateCheck={updateCheck}
            onCheckUpdate={handleCheckUpdate}
            onApplyServerUpdate={handleApplyServerUpdate}
            onShareSummary={handleShareSummary}
            onDownloadJsonBackup={handleDownloadJsonBackup}
            onImportJsonUpdate={handleImportJsonUpdate}
          />
        )}

        {currentRoute.page === 'admin' && isStaff && (
          <AdminPanelView
            db={db}
            isSuperAdmin={isAdmin}
            isCashier={isCashier}
            activeTab={adminTab}
            onChangeTab={setAdminTab}
            onOpenMember={(memberId) => navigateTo({ page: 'member', memberId })}
            onLogout={handleLogout}
            paymentRequests={paymentRequests}
            auditLogs={auditLogs}
            registeredUsers={registeredUsers}
            onRefreshAdminFeeds={() => {
              void fetchPaymentRequests();
              void fetchAuditLogs();
              void fetchActiveUsers();
            }}
            onReviewPaymentRequest={handleReviewPaymentRequest}
            onUpdateUserRole={handleUpdateUserRole}
            onToggleBuiltin={(key: BuiltinToggleKey, enabled: boolean) =>
              commitDb(
                (prev) => ({
                  ...prev,
                  appConfig: {
                    ...prev.appConfig,
                    enabledToggles: { ...prev.appConfig.enabledToggles, [key]: enabled },
                  },
                }),
                enabled ? 'টুগল চালু করা হয়েছে' : 'টুগল বন্ধ করা হয়েছে'
              )
            }
            onAddCustomToggle={(toggle: Omit<CustomToggle, 'id' | 'createdAtMs'>) =>
              commitDb(
                (prev) => ({
                  ...prev,
                  appConfig: {
                    ...prev.appConfig,
                    customToggles: [
                      ...prev.appConfig.customToggles,
                      { ...toggle, id: `ct_${Date.now()}`, createdAtMs: Date.now() },
                    ],
                  },
                }),
                'নতুন কাস্টম টুগল তৈরি হয়েছে'
              )
            }
            onToggleCustom={(id, enabled) =>
              commitDb(
                (prev) => ({
                  ...prev,
                  appConfig: {
                    ...prev.appConfig,
                    customToggles: prev.appConfig.customToggles.map((t) =>
                      t.id === id ? { ...t, enabled } : t
                    ),
                  },
                }),
                enabled ? 'কাস্টম টুগল চালু হয়েছে' : 'কাস্টম টুগল বন্ধ হয়েছে'
              )
            }
            onDeleteCustomToggle={(id) =>
              setConfirmState({
                message: 'এই কাস্টম টুগলটি স্থায়ীভাবে মুছে ফেলতে চান?',
                onConfirm: () =>
                  commitDb(
                    (prev) => ({
                      ...prev,
                      appConfig: {
                        ...prev.appConfig,
                        customToggles: prev.appConfig.customToggles.filter((t) => t.id !== id),
                      },
                    }),
                    'কাস্টম টুগল মুছে ফেলা হয়েছে'
                  ),
              })
            }
            onAddRule={handleAddRule}
            onUpdateRule={handleUpdateRule}
            onDeleteRule={handleDeleteRule}
            onMoveRule={handleMoveRule}
            onResetDefaultRules={() =>
              setConfirmState({
                message: 'ডিফল্ট ১৩টি নিয়মাবলিতে ফিরে যেতে চান?',
                onConfirm: () =>
                  void commitDb(
                    (prev) => ({ ...prev, rules: DEFAULT_RULES.map((r) => ({ ...r })) }),
                    'ডিফল্ট ১৩টি নিয়ম রিস্টোর হয়েছে'
                  ),
              })
            }
            onPinNotice={(title, body, duration: NoticeDuration) => {
              const now = Date.now();
              commitDb(
                (prev) => ({
                  ...prev,
                  appConfig: {
                    ...prev.appConfig,
                    pinnedNotice: {
                      id: `pin_${now}`,
                      title,
                      body,
                      duration,
                      createdAtMs: now,
                      expiresAtMs: now + getNoticeDurationMs(duration),
                      pinnedBy: prev.adminName,
                    },
                  },
                }),
                'নোটিশ সফলভাবে পিন করা হয়েছে!'
              );
            }}
            onUnpinNotice={() =>
              commitDb(
                (prev) => ({
                  ...prev,
                  appConfig: { ...prev.appConfig, pinnedNotice: null },
                }),
                'পিন করা নোটিশ সরানো হয়েছে'
              )
            }
            onAddPopup={(popup) =>
              commitDb(
                (prev) => ({
                  ...prev,
                  appConfig: {
                    ...prev.appConfig,
                    automatedPopups: [
                      ...prev.appConfig.automatedPopups,
                      { ...popup, id: `pop_${Date.now()}` },
                    ],
                  },
                }),
                'অটোমেটেড পপ-আপ যুক্ত হয়েছে'
              )
            }
            onTogglePopup={(id, enabled) =>
              commitDb(
                (prev) => ({
                  ...prev,
                  appConfig: {
                    ...prev.appConfig,
                    automatedPopups: prev.appConfig.automatedPopups.map((p) =>
                      p.id === id ? { ...p, enabled } : p
                    ),
                  },
                }),
                enabled ? 'পপ-আপ চালু হয়েছে' : 'পপ-আপ বন্ধ হয়েছে'
              )
            }
            onDeletePopup={(id) =>
              commitDb(
                (prev) => ({
                  ...prev,
                  appConfig: {
                    ...prev.appConfig,
                    automatedPopups: prev.appConfig.automatedPopups.filter((p) => p.id !== id),
                  },
                }),
                'পপ-আপ মুছে ফেলা হয়েছে'
              )
            }
            onTestPopup={(popup) => setActivePopup(popup)}
            onUpdateTickers={(homeTickerText, bkashTickerText) =>
              commitDb(
                (prev) => ({
                  ...prev,
                  appConfig: { ...prev.appConfig, homeTickerText, bkashTickerText },
                }),
                'রানিং বার আপডেট হয়েছে'
              )
            }
            onAddScheduledNotification={(item) =>
              commitDb(
                (prev) => ({
                  ...prev,
                  appConfig: {
                    ...prev.appConfig,
                    scheduledNotifications: [
                      {
                        ...item,
                        id: `push_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
                        createdBy: prev.adminName,
                        createdAtMs: Date.now(),
                      },
                      ...(prev.appConfig.scheduledNotifications || []),
                    ],
                  },
                }),
                'পুশ নোটিফিকেশন শিডিউল সেভ হয়েছে!'
              )
            }
            onToggleScheduledNotification={(id, enabled) =>
              commitDb(
                (prev) => ({
                  ...prev,
                  appConfig: {
                    ...prev.appConfig,
                    scheduledNotifications: (prev.appConfig.scheduledNotifications || []).map((n) =>
                      n.id === id ? { ...n, enabled } : n
                    ),
                  },
                }),
                enabled ? 'পুশ নোটিফিকেশন চালু হয়েছে' : 'পুশ নোটিফিকেশন বন্ধ হয়েছে'
              )
            }
            onDeleteScheduledNotification={(id) =>
              commitDb(
                (prev) => ({
                  ...prev,
                  appConfig: {
                    ...prev.appConfig,
                    scheduledNotifications: (prev.appConfig.scheduledNotifications || []).filter(
                      (n) => n.id !== id
                    ),
                  },
                }),
                'শিডিউল করা নোটিফিকেশন মুছে ফেলা হয়েছে'
              )
            }
            onSendScheduledNotificationNow={(id) =>
              commitDb(
                (prev) => ({
                  ...prev,
                  appConfig: {
                    ...prev.appConfig,
                    scheduledNotifications: (prev.appConfig.scheduledNotifications || []).map((n) =>
                      n.id === id
                        ? { ...n, enabled: true, scheduledAtMs: Date.now(), lastSentAtMs: Date.now() }
                        : n
                    ),
                  },
                }),
                'পুশ নোটিফিকেশন এখনই সকল সদস্যের কাছে পাঠানো হয়েছে!'
              )
            }
            onBulkRangeDeposit={(memberIds, startISO, endISO, amount, note, skipDuplicates) => {
              const dates = getDatesInRange(startISO, endISO);
              if (!memberIds.length || !dates.length || !amount || amount <= 0) {
                showToast('সদস্য, তারিখ ও সঠিক টাকার পরিমাণ দিন');
                return;
              }
              const createdItems: Array<{ memberId: number; deposit: Deposit }> = [];
              db.members.forEach((m) => {
                if (!memberIds.includes(m.id)) return;
                const covered = getMemberAdvanceCoverage(m).coveredDates;
                dates.forEach((dStr, idx) => {
                  if (skipDuplicates && covered.has(dStr)) return;
                  createdItems.push({
                    memberId: m.id,
                    deposit: {
                      id: `d_${Date.now()}_${m.id}_${idx}_${Math.floor(Math.random() * 1000)}`,
                      date: dStr,
                      amount,
                      note,
                    },
                  });
                });
              });

              if (createdItems.length === 0) {
                showToast('নির্বাচিত তারিখগুলোতে আগেই জমা রয়েছে!');
                return;
              }

              const byMember = new Map<number, Deposit[]>();
              createdItems.forEach(({ memberId, deposit }) => {
                const arr = byMember.get(memberId) || [];
                arr.push(deposit);
                byMember.set(memberId, arr);
              });

              void commitDb(
                (prev) => ({
                  ...prev,
                  members: prev.members.map((m) => {
                    const additions = byMember.get(m.id);
                    return additions ? { ...m, deposits: [...m.deposits, ...additions] } : m;
                  }),
                }),
                `মোট ${toBn(createdItems.length)}টি কিস্তি (৳${toBn(createdItems.length * amount)}) আদায় হয়েছে!`
              );
            }}
            onPublishAppUpdate={async (version, notes) => {
              const release = {
                version,
                releaseDate: getTodayISO(),
                notes,
                publishedAtMs: Date.now(),
              };
              await commitDb((prev) => ({
                ...prev,
                appConfig: {
                  ...prev.appConfig,
                  appVersion: version,
                  changelog: [release, ...(prev.appConfig.changelog || [])].slice(0, 25),
                },
              }));
              try {
                const headers = await buildAdminHeaders();
                await fetch('/api/admin/publish-update', {
                  method: 'POST',
                  headers,
                  body: JSON.stringify({ version, notes }),
                });
              } catch {
                // Local update still saved
              }
              showToast(`নতুন আপডেট v${version} সফলভাবে পাবলিশ হয়েছে!`);
            }}
            standaloneHtmlCode={standaloneHtmlCode}
            onCopyText={handleCopyText}
            onDownloadUpdatedHtml={handleDownloadUpdatedHtml}
            onSaveJsonCode={handleSaveJsonCode}
            onDownloadJsonBackup={handleDownloadJsonBackup}
            onUpdateSettings={(patch) =>
              void commitDb(
                (prev) => ({
                  ...prev,
                  cloudSyncUrl: patch.cloudSyncUrl,
                  appConfig: {
                    ...prev.appConfig,
                    darkMode: patch.darkMode,
                    themeColor: patch.themeColor,
                    bkashNumber: patch.bkashNumber,
                    adminPhone: patch.adminPhone,
                    fundTarget: patch.fundTarget,
                    sortBy: patch.sortBy,
                    updateManifestUrl: patch.updateManifestUrl,
                  },
                }),
                'সেটিংস সংরক্ষিত হয়েছে'
              )
            }
            onUpdateAppLogo={async (logoUrl) => {
              try {
                const headers = await buildAdminHeaders();
                const res = await fetch('/api/admin/app-icon', {
                  method: 'PUT',
                  headers,
                  body: JSON.stringify({ appLogoUrl: logoUrl || '' }),
                });
                const data = (await res.json().catch(() => ({}))) as {
                  ok?: boolean;
                  error?: string;
                  state?: UnityDatabase;
                };
                if (!res.ok || !data.ok || !data.state) {
                  const errMsg = data.error || 'অ্যাপ লোগো সার্ভারে সংরক্ষণ করা যায়নি।';
                  showToast(errMsg);
                  return { ok: false, error: errMsg };
                }
                const normalized = ensureDatabaseStructure(data.state);
                latestDbRef.current = normalized;
                setDb(normalized);
                safeStorageSet(STORAGE_KEY, JSON.stringify(normalized));
                showToast(
                  logoUrl
                    ? 'অ্যাপের নতুন লোগো ও প্রোফাইল পিকচার সফলভাবে আপডেট হয়েছে!'
                    : 'অ্যাপের ডিফল্ট লোগো ফিরিয়ে আনা হয়েছে'
                );
                return { ok: true };
              } catch {
                const errMsg = 'সার্ভারের সাথে সংযোগ পাওয়া যায়নি। ইন্টারনেট চেক করে আবার চেষ্টা করুন।';
                showToast(errMsg);
                return { ok: false, error: errMsg };
              }
            }}
            onUpdateAppIcon={async (payload) => {
              try {
                const headers = await buildAdminHeaders();
                const res = await fetch('/api/admin/app-icon', {
                  method: 'PUT',
                  headers,
                  body: JSON.stringify({
                    appIconUrl: payload.icon512,
                    appIcon192Url: payload.icon192,
                    appIconMaskableUrl: payload.iconMaskable512,
                    ...(payload.syncedLogo320 !== undefined
                      ? { appLogoUrl: payload.syncedLogo320 }
                      : {}),
                  }),
                });
                const data = (await res.json().catch(() => ({}))) as {
                  ok?: boolean;
                  error?: string;
                  state?: UnityDatabase;
                };
                if (!res.ok || !data.ok || !data.state) {
                  const errMsg = data.error || 'অ্যাপ আইকন সার্ভারে সংরক্ষণ করা যায়নি।';
                  showToast(errMsg);
                  return { ok: false, error: errMsg };
                }
                const normalized = ensureDatabaseStructure(data.state);
                latestDbRef.current = normalized;
                setDb(normalized);
                safeStorageSet(STORAGE_KEY, JSON.stringify(normalized));

                // Clear cached icon/manifest responses in Service Worker caches so all views pull fresh icon immediately
                if (typeof window !== 'undefined' && 'caches' in window) {
                  void window.caches.delete('dynamic-app-icon-cache').catch(() => {});
                  void window.caches.delete('dynamic-manifest-cache').catch(() => {});
                }

                showToast(
                  payload.icon512
                    ? 'নতুন অ্যাপ আইকন সফলভাবে সার্ভারে সেভ ও আপডেট হয়েছে!'
                    : 'অ্যাপের ডিফল্ট আইকন ফিরিয়ে আনা হয়েছে'
                );
                return { ok: true };
              } catch {
                const errMsg = 'সার্ভারের সাথে সংযোগ পাওয়া যায়নি। ইন্টারনেট চেক করে আবার চেষ্টা করুন।';
                showToast(errMsg);
                return { ok: false, error: errMsg };
              }
            }}
            onUpdateMemberFull={handleEditMember}
            onDeleteMember={handleDeleteMember}
            onChangeAdminCredentials={async (adminName, newPin) => {
              const cleanNew = newPin.trim();
              if (cleanNew.length < 6) {
                showToast('নতুন অ্যাডমিন পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।');
                return;
              }
              if (isPhoneCollidingWithPasscode(cleanNew, db.members, db.appConfig.adminPhone)) {
                showToast('নিরাপত্তার স্বার্থে কোনো মেম্বার বা এডমিনের ফোন নম্বরকে অ্যাডমিন পাসওয়ার্ড হিসেবে সেট করা যাবে না।');
                return;
              }

              try {
                const headers = await buildAdminHeaders();
                const res = await fetch('/api/admin/change-pin', {
                  method: 'POST',
                  headers,
                  body: JSON.stringify({ adminName, newPin: cleanNew }),
                });
                if (!res.ok) {
                  const errBody = (await res.json().catch(() => ({}))) as { error?: string };
                  showToast(errBody.error || 'পাসওয়ার্ড আপডেট ব্যর্থ হয়েছে');
                  return;
                }
                setActiveAdminPin(cleanNew);
              } catch {
                // Offline fallback
              }

              await commitDb(
                (prev) => ({
                  ...prev,
                  adminName: adminName || prev.adminName,
                  adminPin: cleanNew,
                }),
                'এডমিন নাম ও পাসওয়ার্ড নিরাপদে আপডেট হয়েছে!'
              );
            }}
            onResetAllData={() =>
              setConfirmState({
                message: 'সতর্কতা: সব হিসাব ডিফল্ট অবস্থায় ফিরিয়ে নিতে চান?',
                onConfirm: () => {
                  const fresh = createInitialDatabase();
                  void commitDb(() => fresh, 'সব ডেটা শুরু অবস্থায় ফিরিয়ে নেওয়া হয়েছে');
                },
              })
            }
            adminAccountEmail={isVerifiedGoogleAdmin ? authUser?.email || 'admin' : null}
            isSyncingCloud={isSyncingCloud}
            onConnectGoogleAdmin={handleConnectGoogleAdmin}
            onForceSyncCloud={handleForceSyncToCloud}
            onImportJsonBackup={handleImportJsonUpdate}
          />
        )}
      </main>

      {/* Mobile Bottom Nav */}
      <BottomNav
        page={currentRoute.page}
        isAdmin={isStaff}
        hasAvailableUpdate={Boolean(updateCheck?.hasUpdate || newBuildAvailable)}
        onNavigate={(page) => navigateTo({ page })}
      />

      {/* Automated Popup Modal */}
      <AutomatedPopupModal
        popup={activePopup}
        paidCountToday={todayBreakdown.paid.length}
        unpaidCountToday={todayBreakdown.unpaid.length}
        onClose={(dismissForToday) => {
          if (dismissForToday && activePopup) {
            try {
              const map = JSON.parse(localStorage.getItem(POPUP_DISMISSED_KEY) || '{}');
              map[activePopup.id] = getTodayISO();
              localStorage.setItem(POPUP_DISMISSED_KEY, JSON.stringify(map));
            } catch {
              // ignore storage error
            }
          }
          setActivePopup(null);
        }}
        onAction={(target) => navigateTo({ page: target })}
      />

      {/* Admin Verification Modal (Google Account + Strict Separate Passcode) */}
      {adminGateOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs"
        >
          <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-5 shadow-xl dark:border-slate-800 dark:bg-slate-900">
            <h2 className="font-display text-lg font-bold text-slate-900 dark:text-slate-100">
              এডমিন ভেরিফিকেশন
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
              সুরক্ষিত এডমিন অ্যাক্সেসের জন্য আপনার অনুমোদিত Google অ্যাকাউন্ট দিয়ে সাইন-ইন করুন অথবা এডমিন পাসওয়ার্ড দিন।
            </p>

            <button
              type="button"
              onClick={() => void handleConnectGoogleAdmin()}
              className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-teal-700 px-4 text-sm font-semibold text-white transition-colors hover:bg-teal-800"
            >
              <span>Google দিয়ে এডমিন লগইন</span>
            </button>

            <div className="my-4 flex items-center gap-2.5 text-[11px] font-semibold text-slate-400">
              <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
              <span>অথবা এডমিন পাসওয়ার্ড</span>
              <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
            </div>

            <input
              type="password"
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void handleVerifyPin();
              }}
              placeholder="অ্যাডমিন পাসওয়ার্ড লিখুন"
              className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-sm outline-none focus:border-teal-600 dark:border-slate-700 dark:bg-slate-800"
            />
            {pinError && <p className="mt-2 text-xs font-semibold text-red-600">{pinError}</p>}
            <div className="mt-4 grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setAdminGateOpen(false);
                  setPendingRouteAfterLogin(null);
                }}
                className="h-11 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200"
              >
                বাতিল
              </button>
              <button
                type="button"
                onClick={() => void handleVerifyPin()}
                className="h-11 rounded-xl bg-slate-900 text-sm font-semibold text-white hover:bg-slate-800 dark:bg-teal-600"
              >
                প্রবেশ করুন
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Modal */}
      {confirmState && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs"
        >
          <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-5 shadow-xl dark:border-slate-800 dark:bg-slate-900">
            <h2 className="font-display text-base font-bold text-slate-900 dark:text-slate-100">
              নিশ্চিত করুন
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              {confirmState.message}
            </p>
            <div className="mt-5 grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setConfirmState(null)}
                className="h-11 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200"
              >
                না
              </button>
              <button
                type="button"
                onClick={() => {
                  const fn = confirmState.onConfirm;
                  setConfirmState(null);
                  fn();
                }}
                className="h-11 rounded-xl bg-red-600 text-sm font-semibold text-white hover:bg-red-700"
              >
                হ্যাঁ, নিশ্চিত
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Share App Modal (Smart Public URL, Direct Install Link, WhatsApp, Messenger, Offline HTML) */}
      <ShareAppModal
        open={shareModalOpen}
        db={db}
        isSuperAdmin={isAdmin}
        serverSharedUrl={serverSharedUrl}
        onClose={() => setShareModalOpen(false)}
        onCopyText={handleCopyText}
        onDownloadOfflineApp={handleDownloadUpdatedHtml}
        onSavePublicAppUrl={(publicAppUrl) =>
          commitDb(
            (prev) => ({
              ...prev,
              appConfig: { ...prev.appConfig, publicAppUrl: publicAppUrl || undefined },
            }),
            publicAppUrl ? 'কাস্টম পাবলিক শেয়ার লিংক সেভ হয়েছে!' : 'ডিফল্ট পাবলিক শেয়ার লিংক চালু হয়েছে'
          )
        }
      />

      {/* Home Exit Confirmation Modal (Triggered via Exit button or 1st Device Back press at Home; 2nd Back press or Yes exits immediately) */}
      {exitConfirmOpen && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={(e) => {
            if (e.target === e.currentTarget) cancelExitConfirm();
          }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs"
        >
          <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-5 shadow-xl dark:border-slate-800 dark:bg-slate-900">
            <h2 className="font-display text-base font-bold text-slate-900 dark:text-slate-100">
              অ্যাপ থেকে বের হতে চান?
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              আপনি কি নিশ্চিতভাবে BARAKAH MULTICARE HOSPITAL UNITY অ্যাপ থেকে বের হতে চান?
            </p>
            <div className="mt-3 space-y-1 rounded-xl bg-slate-50 px-3 py-2.5 text-[11px] font-medium text-slate-600 dark:bg-slate-800/80 dark:text-slate-300">
              <p>১. ডিভাইসের ব্যাক বাটন ডাবল ক্লিক করলে সরাসরি বের হতে পারবেন।</p>
              <p>২. অথবা নিচের &ldquo;হ্যাঁ, বের হোন&rdquo; (Yes) বাটনে ক্লিক করে বের হোন।</p>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={cancelExitConfirm}
                className="h-11 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                থাকুন
              </button>
              <button
                type="button"
                onClick={performAppExit}
                className="h-11 rounded-xl bg-red-600 text-sm font-semibold text-white transition-colors hover:bg-red-700 active:scale-[0.98]"
              >
                হ্যাঁ, বের হোন (Yes)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Way 1: Sleek Native Android-Style Double-Back Bottom Bar (appears on 1st Back press at Home) */}
      {doubleBackBarVisible && !exitConfirmOpen && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-16 left-1/2 z-50 flex w-[min(92vw,380px)] -translate-x-1/2 items-center justify-between gap-3 rounded-xl border border-slate-700/80 bg-slate-900/95 px-4 py-3 text-white shadow-xl backdrop-blur-md md:bottom-6"
        >
          <p className="text-xs font-semibold leading-snug">
            বের হতে আরেকবার ব্যাক বাটন চাপুন
          </p>
          <button
            type="button"
            onClick={performAppExit}
            className="inline-flex h-8 shrink-0 items-center rounded-lg bg-red-600 px-3 text-xs font-bold text-white transition-colors hover:bg-red-700 active:scale-95"
          >
            বের হোন
          </button>
        </div>
      )}

      {/* Offline Connectivity Indicator */}
      <OfflineIndicator />

      {/* Toast Notification */}
      {toastMsg && (
        <div
          role="status"
          className="fixed top-16 left-1/2 z-50 max-w-[90vw] -translate-x-1/2 rounded-xl bg-slate-900 px-4 py-2.5 text-center text-xs font-semibold text-white shadow-lg dark:bg-teal-700"
        >
          {toastMsg}
        </div>
      )}
    </div>
  );
}
