export interface Deposit {
  id: string;
  date: string; // YYYY-MM-DD
  amount: number;
  note: string;
}

export interface Member {
  id: number;
  name: string;
  phone: string;
  photoUrl?: string;
  deposits: Deposit[];
}

export interface DrawRecord {
  id: string;
  memberId: number;
  memberName: string;
  date: string;
  amount: number;
  note: string;
}

export interface RuleItem {
  id: string;
  title: string;
  description: string;
}

export type UserRole = 'admin' | 'cashier' | 'member' | 'guest';

export type BuiltinToggleKey =
  | 'kisti'
  | 'draws'
  | 'fund'
  | 'dailyPayments'
  | 'rules'
  | 'addMember'
  | 'payment'
  | 'updates'
  | 'reports'
  | 'userList';

export interface CustomToggle {
  id: string;
  title: string;
  subtitle: string;
  content: string;
  contactPhone?: string;
  enabled: boolean;
  createdAtMs: number;
}

export type NoticeDuration = '1d' | '1w' | '1m';

export interface PinnedNotice {
  id: string;
  title: string;
  body: string;
  duration: NoticeDuration;
  createdAtMs: number;
  expiresAtMs: number;
  pinnedBy: string;
}

export type PopupTriggerType = 'daily_time' | 'unpaid_reminder' | 'on_open';

export interface AutomatedPopup {
  id: string;
  title: string;
  message: string;
  triggerType: PopupTriggerType;
  scheduleTime: string; // HH:mm (24h), e.g., "19:30"
  enabled: boolean;
  frequency: 'once_per_day' | 'once_per_session';
  actionLabel?: string;
  actionTarget?: PageRoute | '';
}

export type NotificationCategory = 'upcoming_payment' | 'special_notice';
export type NotificationRepeatMode = 'once' | 'daily';

export interface ScheduledNotification {
  id: string;
  title: string;
  body: string;
  category: NotificationCategory;
  repeatMode: NotificationRepeatMode;
  scheduledAtMs: number;
  dailyTime?: string; // HH:mm (24h) for daily recurring reminders
  enabled: boolean;
  createdBy: string;
  createdAtMs: number;
  lastSentAtMs?: number;
  targetPage?: PageRoute | '';
}

export interface AppUpdateRelease {
  version: string;
  releaseDate: string;
  notes: string;
  publishedAtMs: number;
}

export interface PaymentRequest {
  id: string;
  memberId: number;
  memberName: string;
  senderPhone: string;
  trxId: string;
  amount: number;
  date: string;
  note: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewedBy: string;
  reviewNote: string;
  createdAt: string;
  reviewedAt?: string | null;
}

export interface AuditLogEntry {
  id: number;
  actorName: string;
  actorRole: string;
  action: string;
  details: string;
  createdAt: string;
}

export interface ActiveSessionUser {
  sessionId: string;
  uid?: string;
  displayName: string;
  email?: string;
  role: UserRole;
  photoUrl?: string;
  device: string;
  currentPage: string;
  connectedAtMs: number;
  lastActiveMs: number;
}

export interface RegisteredUserRecord {
  uid: string;
  email: string;
  displayName: string;
  photoUrl: string;
  role: 'admin' | 'cashier' | 'member';
  deviceInfo: string;
  lastSeenAt: string;
  createdAt: string;
  isOnline: boolean;
}

export interface AppConfig {
  homeTickerText: string;
  bkashTickerText: string;
  bkashNumber: string;
  adminPhone: string;
  themeColor: string;
  darkMode: boolean;
  fundTarget: number;
  sortBy: 'id' | 'amount_desc';
  enabledToggles: Record<BuiltinToggleKey, boolean>;
  customToggles: CustomToggle[];
  pinnedNotice: PinnedNotice | null;
  automatedPopups: AutomatedPopup[];
  scheduledNotifications: ScheduledNotification[];
  publicAppUrl?: string;
  appLogoUrl?: string;
  appIconUrl?: string;
  appIcon192Url?: string;
  appIconMaskableUrl?: string;
  appVersion: string;
  updateManifestUrl: string;
  changelog: AppUpdateRelease[];
}

export interface UnityDatabase {
  adminName: string;
  adminPin?: string; // Only kept locally if offline; never returned by server public GET
  cloudSyncUrl: string;
  updatedAtMs: number;
  lastBackup: string;
  appConfig: AppConfig;
  rules: RuleItem[];
  members: Member[];
  draws: DrawRecord[];
}

export type PageRoute =
  | 'home'
  | 'member'
  | 'kisti'
  | 'draws'
  | 'fund'
  | 'dailyPayments'
  | 'rules'
  | 'payment'
  | 'addMember'
  | 'updates'
  | 'reports'
  | 'userList'
  | 'customToggle'
  | 'admin';

export type AdminTab =
  | 'dashboard'
  | 'members'
  | 'requests'
  | 'toggles'
  | 'rules'
  | 'notices'
  | 'bulk'
  | 'roles'
  | 'audit'
  | 'updates'
  | 'code'
  | 'settings';

export interface UpdateCheckResult {
  hasUpdate: boolean;
  currentVersion: string;
  latestVersion: string;
  latestUpdatedAtMs: number;
  releaseNotes: string;
  releaseDate: string;
  source: 'server' | 'cloud';
}
