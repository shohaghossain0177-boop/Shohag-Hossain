import {
  Camera,
  Check,
  Image as ImageIcon,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toBn } from '../data/defaultData';
import type { Member } from '../types/unity';
import {
  AVATAR_PRESETS,
  captureVideoFrameToAvatar,
  compressFileToAvatar,
} from '../utils/avatarLibrary';
import { MemberAvatar, PresetAvatarSvg } from './MemberAvatar';

interface ProfilePhotoModalProps {
  open: boolean;
  member: Member;
  isAdmin: boolean;
  onClose: () => void;
  onSavePhoto: (
    memberId: number,
    photoUrl: string,
    memberPhone?: string
  ) => Promise<{ ok: boolean; error?: string }>;
}

export function ProfilePhotoModal({
  open,
  member,
  isAdmin,
  onClose,
  onSavePhoto,
}: ProfilePhotoModalProps) {
  const [activeTab, setActiveTab] = useState<'camera' | 'library'>('camera');
  const [draftPhoto, setDraftPhoto] = useState<string>(member.photoUrl || '');
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraStarting, setCameraStarting] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [phoneVerify, setPhoneVerify] = useState('');
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);
  const nativeCameraInputRef = useRef<HTMLInputElement | null>(null);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
    setCameraStarting(false);
  }, []);

  // Reset state whenever modal opens for a member
  useEffect(() => {
    if (open) {
      setDraftPhoto(member.photoUrl || '');
      setPhoneVerify('');
      setErrorMsg(null);
      setCameraError(null);
    } else {
      stopCamera();
    }
  }, [open, member.id, member.photoUrl, stopCamera]);

  // Ensure camera hardware stops when switching tabs or unmounting
  useEffect(() => {
    if (activeTab !== 'camera') {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [activeTab, stopCamera]);

  const startCamera = useCallback(
    async (mode: 'user' | 'environment') => {
      stopCamera();
      setCameraError(null);
      setErrorMsg(null);

      if (
        typeof navigator === 'undefined' ||
        !navigator.mediaDevices ||
        typeof navigator.mediaDevices.getUserMedia !== 'function'
      ) {
        setCameraError(
          'এই ব্রাউজারে সরাসরি লাইভ ক্যামেরা পাওয়া যায়নি। নিচের "ডিভাইস ক্যামেরা / গ্যালারি" বাটন ব্যবহার করুন।'
        );
        return;
      }

      setCameraStarting(true);
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: mode },
            width: { ideal: 640 },
            height: { ideal: 640 },
          },
          audio: false,
        });
        streamRef.current = stream;
        setCameraActive(true);
        // Attach stream on next animation frame so <video> element is mounted
        requestAnimationFrame(() => {
          const video = videoRef.current;
          if (video) {
            video.srcObject = stream;
            void video.play().catch(() => {});
          }
        });
      } catch (err) {
        const name = err instanceof Error ? err.name : '';
        if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
          setCameraError(
            'ক্যামেরার অনুমতি পাওয়া যায়নি। ব্রাউজার থেকে অনুমতি দিন অথবা নিচ থেকে সরাসরি ছবি আপলোড করুন।'
          );
        } else {
          setCameraError(
            'ক্যামেরা চালু করা যায়নি। নিচের "ছবি আপলোড" বা "মোবাইল ক্যামেরা" অপশন ব্যবহার করুন।'
          );
        }
      } finally {
        setCameraStarting(false);
      }
    },
    [stopCamera]
  );

  const handleCaptureFromStream = () => {
    if (!videoRef.current) return;
    try {
      const captured = captureVideoFrameToAvatar(videoRef.current, facingMode === 'user', 256);
      setDraftPhoto(captured);
      setErrorMsg(null);
      stopCamera();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'ছবি তোলা যায়নি।');
    }
  };

  const handleFlipCamera = () => {
    const nextMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(nextMode);
    if (cameraActive) {
      void startCamera(nextMode);
    }
  };

  const handleFileChange = async (file: File | null | undefined) => {
    if (!file) return;
    setErrorMsg(null);
    try {
      const compressed = await compressFileToAvatar(file, 256);
      setDraftPhoto(compressed);
      stopCamera();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'ছবিটি প্রসেস করা যায়নি।');
    }
  };

  const handleSave = async (photoToSave: string) => {
    setErrorMsg(null);
    if (!isAdmin && !phoneVerify.trim()) {
      setErrorMsg('ছবি সেভ করতে আপনার রেজিস্টার্ড মোবাইল নম্বর লিখুন।');
      return;
    }

    setSaving(true);
    try {
      const res = await onSavePhoto(member.id, photoToSave, phoneVerify.trim());
      if (res.ok) {
        stopCamera();
        onClose();
      } else {
        setErrorMsg(res.error || 'ছবি সংরক্ষণ করা যায়নি।');
      }
    } catch {
      setErrorMsg('নেটওয়ার্ক সমস্যা হয়েছে। আবার চেষ্টা করুন।');
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  const hasChanges = draftPhoto !== (member.photoUrl || '');

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="প্রোফাইল ছবি পরিবর্তন"
      onClick={(e) => {
        if (e.target === e.currentTarget && !saving) {
          stopCamera();
          onClose();
        }
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 p-3 backdrop-blur-xs sm:p-4"
    >
      <div className="flex max-h-[92vh] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800">
          <div>
            <h2 className="font-display text-base font-bold text-slate-900 dark:text-slate-100">
              প্রোফাইল ছবি সেট করুন
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              #{toBn(member.id)} · {member.name}
            </p>
          </div>
          <button
            type="button"
            disabled={saving}
            onClick={() => {
              stopCamera();
              onClose();
            }}
            aria-label="বন্ধ করুন"
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          {/* Live Selected Avatar Preview */}
          <div className="flex items-center gap-4 rounded-2xl border border-slate-100 bg-slate-50/80 p-3.5 dark:border-slate-800 dark:bg-slate-800/50">
            <MemberAvatar
              memberId={member.id}
              name={member.name}
              photoUrl={draftPhoto}
              size="lg"
            />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-slate-900 dark:text-slate-100">
                {draftPhoto ? 'নির্বাচিত ছবির প্রিভিউ' : 'বর্তমানে কোনো ছবি সেট করা নেই'}
              </p>
              <p className="mt-0.5 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
                ক্যামেরা দিয়ে ছবি তুলুন, গ্যালারি থেকে আপলোড করুন অথবা লাইব্রেরি থেকে অ্যাভাটার বেছে নিন।
              </p>
            </div>
            {draftPhoto && (
              <button
                type="button"
                disabled={saving}
                onClick={() => setDraftPhoto('')}
                title="ছবি সরান"
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-red-200 bg-red-50 text-red-600 transition-colors hover:bg-red-100 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-400"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Segmented Mode Tabs */}
          <div className="grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
            <button
              type="button"
              onClick={() => setActiveTab('camera')}
              className={`inline-flex h-10 items-center justify-center gap-1.5 rounded-lg text-xs font-semibold transition-colors ${
                activeTab === 'camera'
                  ? 'bg-white text-teal-700 shadow-xs dark:bg-slate-900 dark:text-teal-300'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              <Camera className="h-3.5 w-3.5" />
              <span>ক্যামেরা ও আপলোড</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('library')}
              className={`inline-flex h-10 items-center justify-center gap-1.5 rounded-lg text-xs font-semibold transition-colors ${
                activeTab === 'library'
                  ? 'bg-white text-teal-700 shadow-xs dark:bg-slate-900 dark:text-teal-300'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>অ্যাভাটার লাইব্রেরি</span>
            </button>
          </div>

          {/* Tab 1: Device Camera + Gallery Upload */}
          {activeTab === 'camera' && (
            <div className="space-y-3">
              {cameraActive ? (
                <div className="space-y-3">
                  <div className="relative mx-auto aspect-square w-full max-w-[260px] overflow-hidden rounded-2xl bg-slate-950 ring-2 ring-teal-500/40">
                    <video
                      ref={videoRef}
                      playsInline
                      muted
                      autoPlay
                      className={`h-full w-full object-cover ${facingMode === 'user' ? '-scale-x-100' : ''}`}
                    />
                    {/* Circular framing guide */}
                    <div className="pointer-events-none absolute inset-4 rounded-full border-2 border-dashed border-white/60" />
                    <button
                      type="button"
                      onClick={handleFlipCamera}
                      aria-label="ক্যামেরা ঘোরান"
                      className="absolute top-2.5 right-2.5 inline-flex h-9 w-9 items-center justify-center rounded-full bg-slate-900/65 text-white backdrop-blur-xs transition-colors hover:bg-slate-900"
                    >
                      <RefreshCw className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={stopCamera}
                      className="h-11 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      ক্যামেরা বন্ধ
                    </button>
                    <button
                      type="button"
                      onClick={handleCaptureFromStream}
                      className="inline-flex h-11 items-center justify-center gap-1.5 rounded-xl bg-teal-700 text-xs font-semibold text-white transition-colors hover:bg-teal-800 active:scale-[0.98]"
                    >
                      <Camera className="h-4 w-4" />
                      <span>ছবি তুলুন</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2.5">
                  <button
                    type="button"
                    disabled={cameraStarting}
                    onClick={() => void startCamera(facingMode)}
                    className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-teal-700 px-4 text-sm font-semibold text-white transition-colors hover:bg-teal-800 active:scale-[0.98] disabled:opacity-60"
                  >
                    <Camera className="h-4 w-4" />
                    <span>{cameraStarting ? 'ক্যামেরা চালু হচ্ছে...' : 'লাইভ ক্যামেরা চালু করুন'}</span>
                  </button>

                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => nativeCameraInputRef.current?.click()}
                      className="inline-flex h-11 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-800 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                    >
                      <ImageIcon className="h-4 w-4 text-teal-700 dark:text-teal-400" />
                      <span>মোবাইল ক্যামেরা</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => galleryInputRef.current?.click()}
                      className="inline-flex h-11 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-800 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                    >
                      <Upload className="h-4 w-4 text-teal-700 dark:text-teal-400" />
                      <span>গ্যালারি থেকে নিন</span>
                    </button>
                  </div>

                  {/* Hidden file inputs for native mobile camera capture & gallery upload */}
                  <input
                    ref={nativeCameraInputRef}
                    type="file"
                    accept="image/*"
                    capture="user"
                    className="hidden"
                    onChange={(e) => {
                      void handleFileChange(e.target.files?.[0]);
                      e.target.value = '';
                    }}
                  />
                  <input
                    ref={galleryInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={(e) => {
                      void handleFileChange(e.target.files?.[0]);
                      e.target.value = '';
                    }}
                  />
                </div>
              )}

              {cameraError && (
                <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-300">
                  {cameraError}
                </p>
              )}
            </div>
          )}

          {/* Tab 2: Placeholder Avatar Library */}
          {activeTab === 'library' && (
            <div className="space-y-2.5">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                পছন্দের অ্যাভাটার নির্বাচন করুন ({toBn(AVATAR_PRESETS.length)}টি অপশন):
              </p>
              <div className="grid grid-cols-5 gap-2.5">
                {AVATAR_PRESETS.map((preset) => {
                  const selected = draftPhoto === preset.value;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => {
                        setDraftPhoto(preset.value);
                        setErrorMsg(null);
                      }}
                      title={preset.label}
                      className={`group relative flex flex-col items-center gap-1 rounded-xl p-1 transition-all ${
                        selected
                          ? 'bg-teal-50 ring-2 ring-teal-600 dark:bg-teal-950/60 dark:ring-teal-400'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      <div className="relative aspect-square w-full overflow-hidden rounded-xl shadow-xs">
                        <PresetAvatarSvg preset={preset} />
                        {selected && (
                          <span className="absolute right-1 bottom-1 flex h-4 w-4 items-center justify-center rounded-full bg-teal-700 text-white shadow-xs">
                            <Check className="h-2.5 w-2.5" />
                          </span>
                        )}
                      </div>
                      <span className="w-full truncate text-center text-[10px] font-medium text-slate-600 dark:text-slate-300">
                        {preset.label.split(' ')[0]}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Member Ownership Verification (shown when not logged in as Admin) */}
          {!isAdmin && (
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-800/40">
              <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200">
                <ShieldCheck className="h-3.5 w-3.5 text-teal-700 dark:text-teal-400" />
                <span>সদস্য যাচাই (নিজের মোবাইল নম্বর)</span>
              </label>
              <input
                type="tel"
                inputMode="tel"
                value={phoneVerify}
                onChange={(e) => {
                  setPhoneVerify(e.target.value);
                  setErrorMsg(null);
                }}
                placeholder="01XXXXXXXXX"
                className="font-mono-num mt-2 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-teal-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              />
              <p className="mt-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                নিরাপত্তার জন্য শুধুমাত্র এই সদস্যের রেজিস্টার্ড মোবাইল নম্বর মিললেই ছবি ডেটাবেজে সেভ হবে।
              </p>
            </div>
          )}

          {errorMsg && (
            <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
              {errorMsg}
            </p>
          )}
        </div>

        {/* Footer Actions */}
        <div className="grid grid-cols-2 gap-2.5 border-t border-slate-100 p-4 dark:border-slate-800">
          <button
            type="button"
            disabled={saving}
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="h-11 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            বাতিল
          </button>
          <button
            type="button"
            disabled={saving || !hasChanges}
            onClick={() => void handleSave(draftPhoto)}
            className="inline-flex h-11 items-center justify-center gap-1.5 rounded-xl bg-teal-700 text-sm font-semibold text-white transition-colors hover:bg-teal-800 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Check className="h-4 w-4" />
            <span>{saving ? 'সংরক্ষণ হচ্ছে...' : 'ছবি সেভ করুন'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
