import { registerSW } from 'virtual:pwa-register';

export const CLIENT_BUILD_ID: string =
  typeof __APP_BUILD_ID__ === 'string' && __APP_BUILD_ID__ ? __APP_BUILD_ID__ : 'dev';

const RELOAD_GUARD_KEY = 'barakah_sw_reloaded_build_v1';

let swRegistration: ServiceWorkerRegistration | null = null;
let updateSWFn: ((reloadPage?: boolean) => Promise<void>) | null = null;
let hasPendingSWUpdate = false;
let initialized = false;

function dispatchUpdateAvailable(detail: { reason: 'sw' | 'build'; serverBuildId?: string }) {
  try {
    window.dispatchEvent(new CustomEvent('barakah:app-update-available', { detail }));
  } catch {
    // ignore
  }
}

function safeReloadOnceForBuild(targetBuildKey: string) {
  try {
    const lastKey = sessionStorage.getItem(RELOAD_GUARD_KEY);
    if (lastKey === targetBuildKey) return;
    sessionStorage.setItem(RELOAD_GUARD_KEY, targetBuildKey);
  } catch {
    // ignore storage errors
  }
  try {
    const url = new URL(window.location.href);
    url.searchParams.set('_v', String(Date.now()));
    window.location.replace(url.toString());
  } catch {
    window.location.reload();
  }
}

/**
 * Registers the PWA Service Worker with aggressive cross-device update checks
 * (on startup, tab focus/visibility return, reconnect, and every 60s) so installed
 * PWAs and mobile browsers always pick up newly deployed builds automatically.
 */
export function initPWAUpdater(): void {
  if (initialized || typeof window === 'undefined') return;
  initialized = true;

  if (!('serviceWorker' in navigator)) return;

  let controllerChanged = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (controllerChanged) return;
    controllerChanged = true;
    safeReloadOnceForBuild(`ctrl_${CLIENT_BUILD_ID}_${Math.floor(Date.now() / 15000)}`);
  });

  try {
    updateSWFn = registerSW({
      immediate: true,
      onNeedRefresh() {
        hasPendingSWUpdate = true;
        dispatchUpdateAvailable({ reason: 'sw' });
        if (updateSWFn) {
          void updateSWFn(true);
        }
      },
      onRegisteredSW(_swUrl, registration) {
        if (!registration) return;
        swRegistration = registration;

        const triggerCheck = () => {
          if (document.visibilityState === 'hidden') return;
          if (!navigator.onLine) return;
          void registration.update().catch(() => {});
        };

        // Check periodically & whenever user returns to the installed PWA
        window.setInterval(triggerCheck, 60_000);
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') triggerCheck();
        });
        window.addEventListener('online', triggerCheck);
        window.addEventListener('focus', triggerCheck);
      },
      onRegisterError() {
        // Ignore in sandboxed preview environments where SW registration is blocked
      },
    });
  } catch {
    // Ignore SW errors in restricted environments
  }
}

export interface AppBuildCheckResult {
  hasNewBuild: boolean;
  serverBuildId: string;
  clientBuildId: string;
}

/**
 * Checks both the active Service Worker and the server's live build fingerprint
 * to detect newly deployed app code on any device.
 */
export async function checkForAppBuildUpdate(): Promise<AppBuildCheckResult> {
  let hasNewBuild = hasPendingSWUpdate;
  let serverBuildId = CLIENT_BUILD_ID;

  // 1. Ask Service Worker to check for a newer script immediately
  if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
    try {
      const reg = swRegistration || (await navigator.serviceWorker.getRegistration());
      if (reg) {
        swRegistration = reg;
        await reg.update().catch(() => {});
        if (reg.waiting || reg.installing) {
          hasNewBuild = true;
        }
      }
    } catch {
      // ignore
    }
  }

  // 2. Compare running client build ID with server's deployed build ID
  try {
    const res = await fetch(`/api/app-info?_t=${Date.now()}`, { cache: 'no-store' });
    if (res.ok) {
      const info = (await res.json()) as { buildId?: string };
      if (info.buildId) {
        serverBuildId = String(info.buildId);
        if (
          CLIENT_BUILD_ID !== 'dev' &&
          serverBuildId !== 'dev' &&
          serverBuildId !== CLIENT_BUILD_ID
        ) {
          hasNewBuild = true;
        }
      }
    }
  } catch {
    // ignore offline
  }

  return {
    hasNewBuild,
    serverBuildId,
    clientBuildId: CLIENT_BUILD_ID,
  };
}

/**
 * Clears stale PWA caches (preserving all user localStorage data), activates any
 * waiting Service Worker, and reloads the app cleanly to load the latest build.
 */
export async function forceReloadLatestApp(): Promise<void> {
  try {
    if (updateSWFn && hasPendingSWUpdate) {
      await updateSWFn(true);
    }
  } catch {
    // continue to cache cleanup
  }

  try {
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(
        regs.map(async (reg) => {
          try {
            if (reg.waiting) {
              reg.waiting.postMessage({ type: 'SKIP_WAITING' });
            }
            await reg.update();
          } catch {
            // ignore
          }
        })
      );
    }
  } catch {
    // ignore
  }

  // Clear HTTP/Workbox caches so stale index.html / JS chunks are never served
  try {
    if (typeof window !== 'undefined' && 'caches' in window) {
      const keys = await window.caches.keys();
      await Promise.all(keys.map((key) => window.caches.delete(key)));
    }
  } catch {
    // ignore
  }

  try {
    const url = new URL(window.location.href);
    url.searchParams.set('_updated', String(Date.now()));
    window.location.replace(url.toString());
  } catch {
    window.location.reload();
  }
}
