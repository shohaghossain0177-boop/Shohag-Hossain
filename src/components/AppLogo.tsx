import { isSafeAppIconDataUrl, isSafeRasterPhotoDataUrl } from '../utils/avatarLibrary';

interface AppLogoProps {
  logoUrl?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'surface' | 'onBrand';
  className?: string;
}

const SIZE_CLASSES: Record<NonNullable<AppLogoProps['size']>, string> = {
  xs: 'h-7 w-7',
  sm: 'h-8 w-8',
  md: 'h-11 w-11',
  lg: 'h-14 w-14',
  xl: 'h-20 w-20',
};

const VARIANT_CLASSES: Record<NonNullable<AppLogoProps['variant']>, string> = {
  surface:
    'border-slate-200 bg-teal-50 shadow-xs ring-1 ring-slate-900/5 dark:border-slate-700 dark:bg-slate-800 dark:ring-white/10',
  onBrand: 'border-white/35 bg-white/15 shadow-sm ring-2 ring-white/25',
};

/**
 * Displays the organization's Admin-configured custom App Logo as a clean circular
 * profile picture across the TopBar, Home Hero, Exited screen, and Settings preview,
 * seamlessly falling back to the built-in Barakah Unity crest icon.
 */
export function AppLogo({
  logoUrl,
  size = 'md',
  variant = 'surface',
  className = '',
}: AppLogoProps) {
  const hasCustom = isSafeRasterPhotoDataUrl(logoUrl) || isSafeAppIconDataUrl(logoUrl);
  const src = hasCustom && logoUrl ? logoUrl : '/icon.svg';

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border ${SIZE_CLASSES[size]} ${VARIANT_CLASSES[variant]} ${className}`}
    >
      <img
        src={src}
        alt="BARAKAH MULTICARE HOSPITAL UNITY লোগো"
        className="h-full w-full object-cover"
        decoding="async"
      />
    </span>
  );
}
