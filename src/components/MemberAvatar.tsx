import { toBn } from '../data/defaultData';
import {
  getAvatarPreset,
  isSafeRasterPhotoDataUrl,
  type AvatarPreset,
} from '../utils/avatarLibrary';

interface MemberAvatarProps {
  memberId: number;
  name: string;
  photoUrl?: string | null;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  tone?: 'teal' | 'emerald' | 'red';
  showIdBadge?: boolean;
  className?: string;
}

export function PresetAvatarSvg({ preset, className = 'h-full w-full' }: { preset: AvatarPreset; className?: string }) {
  const gradId = `av-grad-${preset.id}`;

  return (
    <svg
      viewBox="0 0 120 120"
      className={className}
      role="img"
      aria-label={preset.label}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={preset.bgFrom} />
          <stop offset="100%" stopColor={preset.bgTo} />
        </linearGradient>
      </defs>

      <rect width="120" height="120" fill={`url(#${gradId})`} />
      <circle cx="96" cy="24" r="24" fill="#ffffff" fillOpacity="0.08" />
      <circle cx="22" cy="100" r="20" fill="#000000" fillOpacity="0.08" />

      {preset.variant === 'badge' ? (
        <g>
          <circle cx="60" cy="60" r="36" fill="#ffffff" fillOpacity="0.14" />
          <rect x="52" y="34" width="16" height="52" rx="4" fill={preset.accent} />
          <rect x="34" y="52" width="52" height="16" rx="4" fill={preset.accent} />
          <circle cx="60" cy="60" r="36" fill="none" stroke="#ffffff" strokeOpacity="0.35" strokeWidth="2.5" />
        </g>
      ) : (
        <g>
          {/* Shoulders / Coat */}
          <path
            d="M22 120 C24 92 40 80 60 80 C80 80 96 92 98 120 Z"
            fill={preset.accent}
          />

          {/* Medical collar / stethoscope for doctor & nurse */}
          {(preset.variant === 'doctor-m' || preset.variant === 'doctor-f') && (
            <g>
              <path d="M48 81 L60 101 L72 81" fill="#0f766e" fillOpacity="0.18" />
              <path
                d="M44 84 C44 98 52 103 60 103 C68 103 76 98 76 84"
                fill="none"
                stroke="#334155"
                strokeWidth="3"
                strokeLinecap="round"
              />
              <circle cx="76" cy="101" r="4.5" fill="#0f766e" stroke="#ffffff" strokeWidth="1.5" />
            </g>
          )}

          {(preset.variant === 'nurse-m' || preset.variant === 'nurse-f') && (
            <g>
              <rect x="56" y="92" width="8" height="20" rx="2" fill={preset.bgFrom} />
              <rect x="50" y="98" width="20" height="8" rx="2" fill={preset.bgFrom} />
            </g>
          )}

          {/* Neck */}
          <rect x="52" y="68" width="16" height="16" rx="6" fill={preset.skin} />

          {/* Hijab drape behind/around head */}
          {preset.variant === 'hijab' && (
            <path
              d="M32 58 C32 30 44 22 60 22 C76 22 88 30 88 58 L92 98 C80 92 70 88 60 88 C50 88 40 92 28 98 Z"
              fill={preset.hair}
            />
          )}

          {/* Long hair behind head for female variants */}
          {(preset.variant === 'doctor-f' || preset.variant === 'nurse-f' || preset.variant === 'classic-f') && (
            <path
              d="M35 50 C35 28 46 22 60 22 C74 22 85 28 85 50 L87 74 C82 77 77 77 74 74 L74 52 L46 52 L46 74 C43 77 38 77 33 74 Z"
              fill={preset.hair}
            />
          )}

          {/* Head */}
          <circle cx="60" cy="52" r="21" fill={preset.skin} />

          {/* Hair top */}
          {preset.variant === 'hijab' ? (
            <path
              d="M39 50 C40 34 49 27 60 27 C71 27 80 34 81 50 C75 41 68 38 60 38 C52 38 45 41 39 50 Z"
              fill={preset.hair}
            />
          ) : (
            <path
              d="M38 50 C38 33 47 25 60 25 C73 25 82 33 82 50 C77 41 70 37 60 37 C50 37 43 41 38 50 Z"
              fill={preset.hair}
            />
          )}

          {/* Nurse cap */}
          {preset.variant === 'nurse-f' && (
            <g>
              <path d="M44 30 L50 18 L70 18 L76 30 Z" fill="#ffffff" />
              <rect x="58" y="21" width="4" height="8" rx="1" fill="#e11d48" />
              <rect x="56" y="23" width="8" height="4" rx="1" fill="#e11d48" />
            </g>
          )}

          {/* Eyes */}
          <circle cx="52" cy="53" r="2.3" fill="#1e293b" />
          <circle cx="68" cy="53" r="2.3" fill="#1e293b" />

          {/* Glasses */}
          {preset.variant === 'glasses' && (
            <g fill="none" stroke="#1e293b" strokeWidth="2">
              <rect x="45" y="48" width="13" height="10" rx="3" />
              <rect x="62" y="48" width="13" height="10" rx="3" />
              <line x1="58" y1="53" x2="62" y2="53" />
            </g>
          )}

          {/* Smile */}
          <path
            d="M53 62 Q60 68 67 62"
            fill="none"
            stroke="#9a3412"
            strokeOpacity="0.65"
            strokeWidth="2.2"
            strokeLinecap="round"
          />

          {/* Subtle beard for senior */}
          {preset.variant === 'senior' && (
            <path
              d="M44 59 C46 70 53 74 60 74 C67 74 74 70 76 59 C72 64 66 67 60 67 C54 67 48 64 44 59 Z"
              fill="#cbd5e1"
              fillOpacity="0.85"
            />
          )}
        </g>
      )}
    </svg>
  );
}

const SIZE_CLASSES: Record<NonNullable<MemberAvatarProps['size']>, string> = {
  sm: 'h-9 w-9 rounded-lg text-xs',
  md: 'h-10 w-10 rounded-xl text-xs',
  lg: 'h-16 w-16 rounded-2xl text-lg',
  xl: 'h-24 w-24 rounded-2xl text-2xl',
};

const TONE_CLASSES: Record<NonNullable<MemberAvatarProps['tone']>, string> = {
  teal: 'bg-teal-50 text-teal-800 dark:bg-teal-950 dark:text-teal-300',
  emerald: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300',
  red: 'bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-300',
};

export function MemberAvatar({
  memberId,
  name,
  photoUrl,
  size = 'sm',
  tone = 'teal',
  showIdBadge = false,
  className = '',
}: MemberAvatarProps) {
  const preset = getAvatarPreset(photoUrl);
  const safeRaster = isSafeRasterPhotoDataUrl(photoUrl) ? photoUrl : null;
  const hasVisualAvatar = Boolean(preset || safeRaster);

  return (
    <div className={`relative shrink-0 ${className}`}>
      <div
        className={`relative flex items-center justify-center overflow-hidden font-bold ${SIZE_CLASSES[size]} ${
          hasVisualAvatar
            ? 'bg-slate-100 ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700'
            : `font-mono-num ${TONE_CLASSES[tone]}`
        }`}
      >
        {safeRaster ? (
          <img src={safeRaster} alt={name} className="h-full w-full object-cover" loading="lazy" />
        ) : preset ? (
          <PresetAvatarSvg preset={preset} />
        ) : (
          <span>{toBn(memberId)}</span>
        )}
      </div>

      {showIdBadge && hasVisualAvatar && (
        <span className="font-mono-num absolute -right-1 -bottom-1 flex h-4 min-w-4 items-center justify-center rounded-md bg-slate-900 px-1 text-[9px] font-bold text-white ring-2 ring-white dark:bg-teal-600 dark:ring-slate-900">
          {toBn(memberId)}
        </span>
      )}
    </div>
  );
}
