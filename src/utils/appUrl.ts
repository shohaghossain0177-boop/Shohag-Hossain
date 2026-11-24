export interface BrowserEnvironment {
  isIOS: boolean;
  isAndroid: boolean;
  isStandalone: boolean;
  isInIframe: boolean;
  isInAppBrowser: boolean;
}

export interface ResolvedShareUrl {
  url: string;
  installUrl: string;
  source: 'custom' | 'converted_shared' | 'server' | 'current';
  wasAutoConverted: boolean;
  isLocalOnly: boolean;
}

/**
 * Converts a private AI Studio dev preview URL (ais-dev-...) into its
 * publicly shareable counterpart (ais-pre-...) so other devices can access it.
 */
export function convertDevUrlToPublicShareUrl(rawUrl: string): string {
  const trimmed = String(rawUrl || '').trim().replace(/\/+$/, '');
  if (!trimmed) return '';
  try {
    const parsed = new URL(trimmed);
    if (/^ais-dev-/i.test(parsed.hostname)) {
      parsed.hostname = parsed.hostname.replace(/^ais-dev-/i, 'ais-pre-');
    }
    return `${parsed.origin}${parsed.pathname.replace(/\/+$/, '')}`;
  } catch {
    return trimmed.replace(/^(https?:\/\/)ais-dev-/i, '$1ais-pre-');
  }
}

export function isValidPublicHttpUrl(rawUrl: string): boolean {
  const trimmed = String(rawUrl || '').trim();
  if (!trimmed) return false;
  try {
    const u = new URL(trimmed);
    return u.protocol === 'https:' || u.protocol === 'http:';
  } catch {
    return false;
  }
}

export function isLocalhostUrl(rawUrl: string): boolean {
  try {
    const u = new URL(rawUrl);
    return (
      u.hostname === 'localhost' ||
      u.hostname === '127.0.0.1' ||
      u.hostname === '0.0.0.0' ||
      u.hostname.endsWith('.local')
    );
  } catch {
    return false;
  }
}

/**
 * Resolves the best publicly accessible URL for sharing and cross-device PWA installation.
 */
export function resolvePublicAppUrl(options?: {
  customPublicUrl?: string;
  serverSharedUrl?: string;
}): ResolvedShareUrl {
  const custom = String(options?.customPublicUrl || '').trim();
  if (custom && isValidPublicHttpUrl(custom)) {
    const clean = convertDevUrlToPublicShareUrl(custom);
    return {
      url: clean,
      installUrl: `${clean}/?install=1`,
      source: 'custom',
      wasAutoConverted: clean !== custom.replace(/\/+$/, ''),
      isLocalOnly: isLocalhostUrl(clean),
    };
  }

  const currentOrigin =
    typeof window !== 'undefined' ? window.location.origin.replace(/\/+$/, '') : '';
  const serverUrl = String(options?.serverSharedUrl || '').trim();

  if (currentOrigin && !isLocalhostUrl(currentOrigin)) {
    const converted = convertDevUrlToPublicShareUrl(currentOrigin);
    const wasConverted = converted !== currentOrigin;
    return {
      url: converted,
      installUrl: `${converted}/?install=1`,
      source: wasConverted ? 'converted_shared' : 'current',
      wasAutoConverted: wasConverted,
      isLocalOnly: false,
    };
  }

  if (serverUrl && isValidPublicHttpUrl(serverUrl)) {
    const clean = convertDevUrlToPublicShareUrl(serverUrl);
    return {
      url: clean,
      installUrl: `${clean}/?install=1`,
      source: 'server',
      wasAutoConverted: /^https?:\/\/ais-dev-/i.test(serverUrl),
      isLocalOnly: isLocalhostUrl(clean),
    };
  }

  const fallback = currentOrigin || 'https://ais-pre-d7jg7qhkfwf5lbgbo2r2t3-584128580581.asia-southeast1.run.app';
  return {
    url: fallback,
    installUrl: `${fallback}/?install=1`,
    source: 'current',
    wasAutoConverted: false,
    isLocalOnly: isLocalhostUrl(fallback),
  };
}

/**
 * Builds an Android Intent URL that opens an HTTPS link directly in Google Chrome,
 * allowing users inside Messenger/WhatsApp/Facebook in-app browsers to install the PWA.
 */
export function buildAndroidChromeIntentUrl(targetHttpsUrl: string): string {
  try {
    const parsed = new URL(targetHttpsUrl);
    const stripped = `${parsed.host}${parsed.pathname}${parsed.search}${parsed.hash}`;
    return `intent://${stripped}#Intent;scheme=${parsed.protocol.replace(':', '')};package=com.android.chrome;S.browser_fallback_url=${encodeURIComponent(targetHttpsUrl)};end`;
  } catch {
    return targetHttpsUrl;
  }
}

export function detectBrowserEnvironment(): BrowserEnvironment {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return {
      isIOS: false,
      isAndroid: false,
      isStandalone: false,
      isInIframe: false,
      isInAppBrowser: false,
    };
  }

  const ua = navigator.userAgent || '';
  const lower = ua.toLowerCase();
  const isIOS =
    /iphone|ipad|ipod/.test(lower) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isAndroid = /android/.test(lower);
  const isStandalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true;

  let isInIframe = false;
  try {
    isInIframe = window.self !== window.top;
  } catch {
    isInIframe = true;
  }

  // Detect Facebook, Messenger, Instagram, WhatsApp, LINE, WeChat, Android WebView
  const isInAppBrowser =
    /FBAN|FBAV|FB_IAB|Messenger|Instagram|WhatsApp|Line\/|MicroMessenger|; wv\)/i.test(ua);

  return {
    isIOS,
    isAndroid,
    isStandalone,
    isInIframe,
    isInAppBrowser,
  };
}
