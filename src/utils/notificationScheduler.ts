import { formatDateBn, getTodayISO, toBn } from '../data/defaultData';
import type {
  NotificationCategory,
  NotificationRepeatMode,
  PageRoute,
  ScheduledNotification,
} from '../types/unity';

export type BrowserNotificationPermission = 'granted' | 'denied' | 'default' | 'unsupported';

export interface NotificationDispatchResult {
  delivered: boolean;
  channel: 'service-worker' | 'window' | 'blocked' | 'unsupported';
}

export interface NotificationPreset {
  id: string;
  label: string;
  category: NotificationCategory;
  title: string;
  body: string;
  repeatMode: NotificationRepeatMode;
  dailyTime: string;
  targetPage: PageRoute;
}

const DELIVERED_STORAGE_KEY = 'barakah_push_delivered_v1';
const MAX_TIMEOUT_MS = 2147483000; // Safe JS setTimeout upper bound (~24.8 days)
const CATCHUP_WINDOW_MS = 30 * 60 * 1000; // Deliver missed one-time notices within 30 mins

export const NOTIFICATION_PRESETS: NotificationPreset[] = [
  {
    id: 'upcoming_kisti',
    label: 'দৈনিক কিস্তি রিমাইন্ডার',
    category: 'upcoming_payment',
    title: 'আসন্ন দৈনিক কিস্তির সময় হয়েছে',
    body: 'সম্মানিত সদস্য, আজকের ১০০৳ দৈনিক কিস্তি সময়মতো পরিশোধ করার জন্য অনুরোধ করা হচ্ছে।',
    repeatMode: 'daily',
    dailyTime: '19:30',
    targetPage: 'payment',
  },
  {
    id: 'due_alert',
    label: 'বকেয়া পেমেন্ট অ্যালার্ট',
    category: 'upcoming_payment',
    title: 'বকেয়া কিস্তি পরিশোধের অনুরোধ',
    body: 'যাদের কিস্তি বাকি রয়েছে, অনুগ্রহ করে দৈনিক তালিকা দেখে আজই বিকাশ বা নগদে পরিশোধ করুন।',
    repeatMode: 'once',
    dailyTime: '20:00',
    targetPage: 'dailyPayments',
  },
  {
    id: 'special_notice',
    label: 'বিশেষ জরুরি নোটিশ',
    category: 'special_notice',
    title: 'BARAKAH UNITY বিশেষ ঘোষণা',
    body: 'সকল সদস্যের অবগতির জন্য জানানো যাচ্ছে যে নতুন গুরুত্বপূর্ণ ঘোষণা অ্যাপে প্রকাশ করা হয়েছে।',
    repeatMode: 'once',
    dailyTime: '18:00',
    targetPage: 'rules',
  },
];

export function isNotificationApiSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function getNotificationPermissionState(): BrowserNotificationPermission {
  if (!isNotificationApiSupported()) return 'unsupported';
  const perm = window.Notification.permission;
  if (perm === 'granted' || perm === 'denied' || perm === 'default') return perm;
  return 'default';
}

export async function requestNotificationPermission(): Promise<BrowserNotificationPermission> {
  if (!isNotificationApiSupported()) return 'unsupported';
  try {
    const result = await window.Notification.requestPermission();
    if (result === 'granted' || result === 'denied' || result === 'default') {
      return result;
    }
    return getNotificationPermissionState();
  } catch {
    return getNotificationPermissionState();
  }
}

/**
 * Dispatches a native browser notification via active ServiceWorkerRegistration
 * (preferred for mobile PWAs) or falls back to the standard Notification constructor.
 */
export async function dispatchBrowserNotification(options: {
  id?: string;
  title: string;
  body: string;
  tag?: string;
  onClick?: () => void;
}): Promise<NotificationDispatchResult> {
  if (!isNotificationApiSupported()) {
    return { delivered: false, channel: 'unsupported' };
  }
  if (window.Notification.permission !== 'granted') {
    return { delivered: false, channel: 'blocked' };
  }

  const notificationTag = options.tag || options.id || `barakah_notif_${Date.now()}`;
  const notifOptions: NotificationOptions = {
    body: options.body,
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    tag: notificationTag,
  };

  // Prefer ServiceWorkerRegistration.showNotification when available (required on Android Chrome PWA)
  if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
    try {
      const reg = await Promise.race([
        navigator.serviceWorker.ready,
        new Promise<null>((resolve) => window.setTimeout(() => resolve(null), 900)),
      ]);
      if (reg && typeof reg.showNotification === 'function') {
        await reg.showNotification(options.title, notifOptions);
        return { delivered: true, channel: 'service-worker' };
      }
    } catch {
      // Fall through to window.Notification
    }
  }

  try {
    const notif = new window.Notification(options.title, notifOptions);
    notif.onclick = () => {
      try {
        window.focus();
      } catch {
        // Ignore focus restriction
      }
      if (options.onClick) options.onClick();
      notif.close();
    };
    return { delivered: true, channel: 'window' };
  } catch {
    return { delivered: false, channel: 'blocked' };
  }
}

export function computeScheduledTimestampMs(dateISO: string, timeHHMM: string): number {
  const [y, m, d] = (dateISO || getTodayISO()).split('-').map((n) => parseInt(n, 10));
  const [hh, mm] = (timeHHMM || '19:30').split(':').map((n) => parseInt(n, 10));
  const dt = new Date(
    Number.isFinite(y) ? y : 2026,
    Number.isFinite(m) ? m - 1 : 0,
    Number.isFinite(d) ? d : 1,
    Number.isFinite(hh) ? hh : 19,
    Number.isFinite(mm) ? mm : 30,
    0,
    0
  );
  return dt.getTime();
}

function getDeliveredMap(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(DELIVERED_STORAGE_KEY) || '{}') as Record<string, string>;
  } catch {
    return {};
  }
}

function getDeliveryCycleKey(item: ScheduledNotification, nowMs: number): string {
  if (item.repeatMode === 'daily') {
    const d = new Date(nowMs);
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    return `daily:${iso}:${item.dailyTime || '19:30'}`;
  }
  return `once:${item.lastSentAtMs || item.scheduledAtMs}`;
}

export function wasNotificationDeliveredLocally(item: ScheduledNotification, nowMs = Date.now()): boolean {
  const map = getDeliveredMap();
  return map[item.id] === getDeliveryCycleKey(item, nowMs);
}

export function markNotificationDeliveredLocally(item: ScheduledNotification, nowMs = Date.now()): void {
  try {
    const map = getDeliveredMap();
    map[item.id] = getDeliveryCycleKey(item, nowMs);
    // Keep storage compact
    const entries = Object.entries(map);
    const trimmed = entries.length > 100 ? Object.fromEntries(entries.slice(-100)) : map;
    localStorage.setItem(DELIVERED_STORAGE_KEY, JSON.stringify(trimmed));
  } catch {
    // Ignore storage quota errors
  }
}

/**
 * Computes milliseconds until the next trigger for a scheduled notification.
 * Returns null if the notification should not be scheduled (disabled or expired).
 * Returns 0 if it is due right now (within the catch-up window and not yet delivered).
 */
export function getNextTriggerDelayMs(item: ScheduledNotification, nowMs = Date.now()): number | null {
  if (!item.enabled) return null;

  if (item.repeatMode === 'daily') {
    const [hh, mm] = (item.dailyTime || '19:30').split(':').map((n) => parseInt(n, 10));
    const targetToday = new Date(nowMs);
    targetToday.setHours(Number.isFinite(hh) ? hh : 19, Number.isFinite(mm) ? mm : 30, 0, 0);
    const targetMs = targetToday.getTime();

    if (nowMs >= targetMs) {
      // If within catch-up window today and not yet delivered today, fire immediately
      if (!wasNotificationDeliveredLocally(item, nowMs) && nowMs - targetMs <= CATCHUP_WINDOW_MS) {
        return 0;
      }
      // Otherwise schedule for tomorrow at the same HH:mm
      const tomorrow = new Date(targetMs + 24 * 60 * 60 * 1000);
      return Math.max(1000, tomorrow.getTime() - nowMs);
    }

    return Math.max(0, targetMs - nowMs);
  }

  // One-time scheduled or immediate broadcast notification
  const triggerAt = item.lastSentAtMs && item.lastSentAtMs > item.scheduledAtMs ? item.lastSentAtMs : item.scheduledAtMs;
  if (wasNotificationDeliveredLocally(item, nowMs)) return null;

  const diff = triggerAt - nowMs;
  if (diff <= 0) {
    // Fire immediately if within the catch-up window
    if (Math.abs(diff) <= CATCHUP_WINDOW_MS) {
      return 0;
    }
    return null;
  }

  return diff;
}

export function formatScheduleLabelBn(item: ScheduledNotification): string {
  if (item.repeatMode === 'daily') {
    return `প্রতিদিন ${toBn(item.dailyTime || '19:30')}`;
  }
  const dt = new Date(item.scheduledAtMs);
  if (Number.isNaN(dt.getTime())) return 'নির্ধারিত সময়';
  const iso = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
  const timeStr = `${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}`;
  return `${formatDateBn(iso)} · ${toBn(timeStr)}`;
}

/**
 * Registers browser timers for all enabled ScheduledNotifications and returns a cleanup function.
 */
export function syncScheduledNotificationTimers(
  items: ScheduledNotification[],
  callbacks: {
    onDeliver: (item: ScheduledNotification, result: NotificationDispatchResult) => void;
    onNavigate?: (page: PageRoute) => void;
  }
): () => void {
  const timeouts: number[] = [];

  const fireItem = async (item: ScheduledNotification) => {
    const now = Date.now();
    if (wasNotificationDeliveredLocally(item, now)) return;
    markNotificationDeliveredLocally(item, now);

    const result = await dispatchBrowserNotification({
      id: item.id,
      title: item.title,
      body: item.body,
      tag: `barakah_${item.id}`,
      onClick: () => {
        if (item.targetPage && callbacks.onNavigate) {
          callbacks.onNavigate(item.targetPage);
        }
      },
    });

    callbacks.onDeliver(item, result);
  };

  const scheduleAll = () => {
    while (timeouts.length > 0) {
      const id = timeouts.pop();
      if (id !== undefined) window.clearTimeout(id);
    }

    const now = Date.now();
    for (const item of items) {
      const delay = getNextTriggerDelayMs(item, now);
      if (delay === null) continue;
      if (delay === 0) {
        void fireItem(item);
      } else if (delay <= MAX_TIMEOUT_MS) {
        const handle = window.setTimeout(() => {
          void fireItem(item);
        }, delay);
        timeouts.push(handle);
      }
    }
  };

  scheduleAll();
  // Periodic 45-second reconciliation keeps timers accurate after device sleep/wake
  const intervalId = window.setInterval(scheduleAll, 45000);

  return () => {
    window.clearInterval(intervalId);
    while (timeouts.length > 0) {
      const id = timeouts.pop();
      if (id !== undefined) window.clearTimeout(id);
    }
  };
}
