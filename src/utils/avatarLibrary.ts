export interface AvatarPreset {
  id: string;
  value: string;
  label: string;
  category: 'medical' | 'member';
  bgFrom: string;
  bgTo: string;
  accent: string;
  skin: string;
  hair: string;
  variant: 'doctor-m' | 'doctor-f' | 'nurse-m' | 'nurse-f' | 'hijab' | 'classic-m' | 'classic-f' | 'glasses' | 'senior' | 'badge';
}

export const AVATAR_PRESETS: AvatarPreset[] = [
  {
    id: 'doctor-m',
    value: 'preset:doctor-m',
    label: 'ডাক্তার (পুরুষ)',
    category: 'medical',
    bgFrom: '#0f766e',
    bgTo: '#14b8a6',
    accent: '#ffffff',
    skin: '#f4c7a1',
    hair: '#1e293b',
    variant: 'doctor-m',
  },
  {
    id: 'doctor-f',
    value: 'preset:doctor-f',
    label: 'ডাক্তার (মহিলা)',
    category: 'medical',
    bgFrom: '#0284c7',
    bgTo: '#38bdf8',
    accent: '#ffffff',
    skin: '#f6ceb0',
    hair: '#1e293b',
    variant: 'doctor-f',
  },
  {
    id: 'nurse-m',
    value: 'preset:nurse-m',
    label: 'ব্রাদার / স্টাফ',
    category: 'medical',
    bgFrom: '#059669',
    bgTo: '#34d399',
    accent: '#ecfdf5',
    skin: '#eab690',
    hair: '#0f172a',
    variant: 'nurse-m',
  },
  {
    id: 'nurse-f',
    value: 'preset:nurse-f',
    label: 'নার্স / সিস্টার',
    category: 'medical',
    bgFrom: '#0d9488',
    bgTo: '#2dd4bf',
    accent: '#ffffff',
    skin: '#f4c7a1',
    hair: '#334155',
    variant: 'nurse-f',
  },
  {
    id: 'hijab',
    value: 'preset:hijab',
    label: 'সদস্যা (হিজাব)',
    category: 'member',
    bgFrom: '#7c3aed',
    bgTo: '#a78bfa',
    accent: '#ede9fe',
    skin: '#f5ccb0',
    hair: '#4c1d95',
    variant: 'hijab',
  },
  {
    id: 'classic-m',
    value: 'preset:classic-m',
    label: 'সদস্য (টিল)',
    category: 'member',
    bgFrom: '#115e59',
    bgTo: '#0d9488',
    accent: '#ccfbf1',
    skin: '#eab690',
    hair: '#1e293b',
    variant: 'classic-m',
  },
  {
    id: 'glasses',
    value: 'preset:glasses',
    label: 'সদস্য (চশমা)',
    category: 'member',
    bgFrom: '#1d4ed8',
    bgTo: '#60a5fa',
    accent: '#dbeafe',
    skin: '#f4c7a1',
    hair: '#0f172a',
    variant: 'glasses',
  },
  {
    id: 'classic-f',
    value: 'preset:classic-f',
    label: 'সদস্যা (রোজ)',
    category: 'member',
    bgFrom: '#be185d',
    bgTo: '#f472b6',
    accent: '#fce7f3',
    skin: '#f6ceb0',
    hair: '#1e293b',
    variant: 'classic-f',
  },
  {
    id: 'senior',
    value: 'preset:senior',
    label: 'সিনিয়র সদস্য',
    category: 'member',
    bgFrom: '#b45309',
    bgTo: '#f59e0b',
    accent: '#fef3c7',
    skin: '#e5af87',
    hair: '#cbd5e1',
    variant: 'senior',
  },
  {
    id: 'badge',
    value: 'preset:badge',
    label: 'বারাকাহ ইউনিটি',
    category: 'medical',
    bgFrom: '#0f172a',
    bgTo: '#0f766e',
    accent: '#5eead4',
    skin: '#ffffff',
    hair: '#ffffff',
    variant: 'badge',
  },
];

const ALLOWED_PRESET_VALUES = new Set(AVATAR_PRESETS.map((p) => p.value));

// Strict allowlist for uploaded/camera raster images (blocks SVG/HTML/JS schemes)
const SAFE_DATA_IMAGE_REGEX = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+=*$/;

// ~195 KB raw binary cap so PostgreSQL rows & real-time SSE sync stay fast
export const MAX_MEMBER_PHOTO_LENGTH = 260_000;
// ~360 KB raw binary cap for crisp 512x512 PWA App Icons (PNG/JPEG/WEBP)
export const MAX_APP_ICON_LENGTH = 480_000;

export function getAvatarPreset(photoUrl?: string | null): AvatarPreset | null {
  if (!photoUrl || !photoUrl.startsWith('preset:')) return null;
  return AVATAR_PRESETS.find((p) => p.value === photoUrl) || null;
}

export function isSafeRasterPhotoDataUrl(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  if (value.length === 0 || value.length > MAX_MEMBER_PHOTO_LENGTH) return false;
  return SAFE_DATA_IMAGE_REGEX.test(value);
}

export function isSafeAppIconDataUrl(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  if (value.length === 0 || value.length > MAX_APP_ICON_LENGTH) return false;
  return SAFE_DATA_IMAGE_REGEX.test(value);
}

export function isValidMemberPhotoUrl(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  if (trimmed === '') return true;
  if (ALLOWED_PRESET_VALUES.has(trimmed)) return true;
  return isSafeRasterPhotoDataUrl(trimmed);
}

export function sanitizeMemberPhotoUrl(value: unknown): string {
  if (typeof value !== 'string') return '';
  const trimmed = value.trim();
  return isValidMemberPhotoUrl(trimmed) ? trimmed : '';
}

function drawCroppedSquareToCanvas(
  source: CanvasImageSource,
  srcW: number,
  srcH: number,
  targetSize: number,
  mirrorHorizontal = false
): string {
  const canvas = document.createElement('canvas');
  canvas.width = targetSize;
  canvas.height = targetSize;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('ক্যানভাস তৈরি করা যায়নি');
  }

  const side = Math.min(srcW, srcH);
  const sx = Math.max(0, Math.floor((srcW - side) / 2));
  const sy = Math.max(0, Math.floor((srcH - side) / 2));

  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(0, 0, targetSize, targetSize);

  if (mirrorHorizontal) {
    ctx.save();
    ctx.translate(targetSize, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(source, sx, sy, side, side, 0, 0, targetSize, targetSize);
    ctx.restore();
  } else {
    ctx.drawImage(source, sx, sy, side, side, 0, 0, targetSize, targetSize);
  }

  let dataUrl = canvas.toDataURL('image/jpeg', 0.84);
  if (dataUrl.length > MAX_MEMBER_PHOTO_LENGTH) {
    dataUrl = canvas.toDataURL('image/jpeg', 0.68);
  }
  if (dataUrl.length > MAX_MEMBER_PHOTO_LENGTH) {
    dataUrl = canvas.toDataURL('image/jpeg', 0.52);
  }
  if (!isSafeRasterPhotoDataUrl(dataUrl)) {
    throw new Error('ছবির সাইজ খুব বড়। অনুগ্রহ করে অন্য ছবি চেষ্টা করুন।');
  }
  return dataUrl;
}

export function captureVideoFrameToAvatar(
  video: HTMLVideoElement,
  mirrorHorizontal = false,
  targetSize = 256
): string {
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  if (!vw || !vh) {
    throw new Error('ক্যামেরা এখনো প্রস্তুত হয়নি। অনুগ্রহ করে ১ সেকেন্ড অপেক্ষা করুন।');
  }
  return drawCroppedSquareToCanvas(video, vw, vh, targetSize, mirrorHorizontal);
}

export async function compressFileToAvatar(file: File, targetSize = 256): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('অনুগ্রহ করে শুধুমাত্র ছবি (JPG, PNG, WEBP) নির্বাচন করুন।');
  }
  if (file.size > 15 * 1024 * 1024) {
    throw new Error('ছবির ফাইল ১৫ মেগাবাইটের কম হতে হবে।');
  }

  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('ছবিটি পড়া যায়নি।'));
      el.src = objectUrl;
    });
    return drawCroppedSquareToCanvas(img, img.naturalWidth, img.naturalHeight, targetSize, false);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export interface GeneratedAppIconBundle {
  icon512: string;
  icon192: string;
  iconMaskable512: string;
  profileLogo320: string;
}

function renderExactSquareDataUrl(
  img: HTMLImageElement,
  size: number,
  options: {
    paddingRatio?: number;
    bgColor?: string;
    preferPngMaxLen?: number;
    maxLen?: number;
  } = {}
): string {
  const {
    paddingRatio = 0,
    bgColor = '#0f766e',
    preferPngMaxLen = 200_000,
    maxLen = MAX_APP_ICON_LENGTH,
  } = options;

  const draw = (fillBackground: boolean): HTMLCanvasElement => {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('ক্যানভাস তৈরি করা যায়নি');

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    if (fillBackground || paddingRatio > 0) {
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, size, size);
    }

    const side = Math.min(img.naturalWidth, img.naturalHeight);
    const sx = Math.max(0, Math.floor((img.naturalWidth - side) / 2));
    const sy = Math.max(0, Math.floor((img.naturalHeight - side) / 2));
    const pad = Math.round(size * paddingRatio);
    const destSize = size - pad * 2;

    if (paddingRatio > 0) {
      // Soft rounded inner emblem inside the safe-zone for Android adaptive maskable icons
      const radius = Math.round(destSize * 0.18);
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(pad + radius, pad);
      ctx.lineTo(pad + destSize - radius, pad);
      ctx.quadraticCurveTo(pad + destSize, pad, pad + destSize, pad + radius);
      ctx.lineTo(pad + destSize, pad + destSize - radius);
      ctx.quadraticCurveTo(pad + destSize, pad + destSize, pad + destSize - radius, pad + destSize);
      ctx.lineTo(pad + radius, pad + destSize);
      ctx.quadraticCurveTo(pad, pad + destSize, pad, pad + destSize - radius);
      ctx.lineTo(pad, pad + radius);
      ctx.quadraticCurveTo(pad, pad, pad + radius, pad);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(img, sx, sy, side, side, pad, pad, destSize, destSize);
      ctx.restore();
    } else {
      ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size);
    }

    return canvas;
  };

  // Try crisp exact-size PNG first (never shrink dimensions — Chrome PWA validates exact sizes!)
  const pngCanvas = draw(paddingRatio > 0);
  const pngUrl = pngCanvas.toDataURL('image/png');
  if (pngUrl.length <= preferPngMaxLen && isSafeAppIconDataUrl(pngUrl)) {
    return pngUrl;
  }

  // Fallback to exact-size high-quality JPEG so pixel dimensions ALWAYS remain exact (512x512 / 192x192)
  const jpgCanvas = draw(true);
  for (const quality of [0.9, 0.82, 0.72, 0.6]) {
    const jpgUrl = jpgCanvas.toDataURL('image/jpeg', quality);
    if (jpgUrl.length <= maxLen && isSafeAppIconDataUrl(jpgUrl)) {
      return jpgUrl;
    }
  }

  throw new Error('আইকন ছবির সাইজ খুব বড়। অনুগ্রহ করে অন্য ছবি নির্বাচন করুন।');
}

export async function generateAppIconBundle(
  file: File,
  themeColor = '#0f766e'
): Promise<GeneratedAppIconBundle> {
  if (!file.type.startsWith('image/')) {
    throw new Error('অনুগ্রহ করে শুধুমাত্র ছবি (PNG, JPG, WEBP) নির্বাচন করুন।');
  }
  if (file.size > 15 * 1024 * 1024) {
    throw new Error('ছবির ফাইল ১৫ মেগাবাইটের কম হতে হবে।');
  }

  const safeBg = /^#[0-9a-fA-F]{6}$/.test(themeColor) ? themeColor : '#0f766e';
  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('আইকন ছবিটি পড়া যায়নি।'));
      el.src = objectUrl;
    });

    const icon512 = renderExactSquareDataUrl(img, 512, {
      bgColor: safeBg,
      preferPngMaxLen: 220_000,
      maxLen: MAX_APP_ICON_LENGTH,
    });
    const icon192 = renderExactSquareDataUrl(img, 192, {
      bgColor: safeBg,
      preferPngMaxLen: 160_000,
      maxLen: MAX_MEMBER_PHOTO_LENGTH,
    });
    const iconMaskable512 = renderExactSquareDataUrl(img, 512, {
      paddingRatio: 0.13,
      bgColor: safeBg,
      preferPngMaxLen: 180_000,
      maxLen: MAX_APP_ICON_LENGTH,
    });
    const profileLogo320 = drawCroppedSquareToCanvas(
      img,
      img.naturalWidth,
      img.naturalHeight,
      320,
      false
    );

    return {
      icon512,
      icon192,
      iconMaskable512,
      profileLogo320,
    };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export async function compressFileToAppIcon(file: File, targetSize = 512): Promise<string> {
  const bundle = await generateAppIconBundle(file);
  return targetSize <= 192 ? bundle.icon192 : bundle.icon512;
}
