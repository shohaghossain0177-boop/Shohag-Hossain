import { CheckCircle2, Dices, Sparkles, Trophy } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { getTodayISO, toBn } from '../data/defaultData';
import type { DrawRecord, Member } from '../types/unity';

interface LuckyDrawWheelProps {
  members: Member[];
  draws: DrawRecord[];
  canSaveDraw: boolean;
  onSaveWinner: (memberId: number, date: string, amount: number, note: string) => void;
}

const SLICE_COLORS = [
  '#0f766e',
  '#0284c7',
  '#059669',
  '#d97706',
  '#7c3aed',
  '#e11d48',
  '#2563eb',
  '#0d9488',
];

export function LuckyDrawWheel({
  members,
  draws,
  canSaveDraw,
  onSaveWinner,
}: LuckyDrawWheelProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rotationRef = useRef(0);
  const animFrameRef = useRef<number | null>(null);

  const [spinning, setSpinning] = useState(false);
  const [winner, setWinner] = useState<Member | null>(null);
  const [drawAmount, setDrawAmount] = useState('50000');
  const [drawDate, setDrawDate] = useState(getTodayISO());
  const [savedNotice, setSavedNotice] = useState(false);

  const eligibleMembers = useMemo(() => {
    const wonIds = new Set(draws.map((d) => d.memberId));
    return members.filter((m) => !wonIds.has(m.id));
  }, [members, draws]);

  const drawWheel = (angleRad: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = canvas.width;
    const cx = size / 2;
    const cy = size / 2;
    const radius = cx - 10;
    const count = eligibleMembers.length;

    ctx.clearRect(0, 0, size, size);

    if (count === 0) {
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fillStyle = '#e2e8f0';
      ctx.fill();
      ctx.fillStyle = '#475569';
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('সবাই ড্র পেয়েছেন', cx, cy);
      return;
    }

    const sliceArc = (Math.PI * 2) / count;

    for (let i = 0; i < count; i++) {
      const startAngle = angleRad + i * sliceArc;
      const endAngle = startAngle + sliceArc;

      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, radius, startAngle, endAngle);
      ctx.closePath();
      ctx.fillStyle = SLICE_COLORS[i % SLICE_COLORS.length];
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = count > 24 ? 1 : 2;
      ctx.stroke();

      // Draw member ID / short name
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(startAngle + sliceArc / 2);
      ctx.textAlign = 'right';
      ctx.fillStyle = '#ffffff';
      const fontSize = count > 30 ? 9 : count > 18 ? 10 : 12;
      ctx.font = `bold ${fontSize}px sans-serif`;
      const m = eligibleMembers[i];
      const label = count > 24 ? `#${m.id}` : `#${m.id} ${m.name.slice(0, 10)}`;
      ctx.fillText(label, radius - 10, fontSize / 3);
      ctx.restore();
    }

    // Center hub
    ctx.beginPath();
    ctx.arc(cx, cy, 22, 0, Math.PI * 2);
    ctx.fillStyle = '#0f172a';
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('DRAW', cx, cy + 3.5);
  };

  useEffect(() => {
    drawWheel(rotationRef.current);
  }, [eligibleMembers]);

  useEffect(() => {
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  const handleSpin = () => {
    if (spinning || eligibleMembers.length === 0) return;
    setSpinning(true);
    setWinner(null);
    setSavedNotice(false);

    // Cryptographically unbiased winner selection
    const randomArr = new Uint32Array(1);
    crypto.getRandomValues(randomArr);
    const chosenIndex = randomArr[0] % eligibleMembers.length;

    const count = eligibleMembers.length;
    const sliceArc = (Math.PI * 2) / count;
    // Pointer is at top (-Math.PI / 2). Compute target angle so chosenIndex aligns under pointer.
    const targetSliceCenter = chosenIndex * sliceArc + sliceArc / 2;
    const pointerAngle = -Math.PI / 2;
    const currentMod = ((rotationRef.current % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    const desiredMod = (((pointerAngle - targetSliceCenter) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    let delta = desiredMod - currentMod;
    if (delta < 0) delta += Math.PI * 2;

    const extraSpins = (5 + (randomArr[0] % 3)) * Math.PI * 2;
    const startRotation = rotationRef.current;
    const finalRotation = startRotation + extraSpins + delta;
    const durationMs = 4600;
    const startTime = performance.now();

    const step = (now: number) => {
      const t = Math.min(1, (now - startTime) / durationMs);
      // Cubic ease-out for realistic deceleration
      const eased = 1 - Math.pow(1 - t, 3);
      const current = startRotation + (finalRotation - startRotation) * eased;
      rotationRef.current = current;
      drawWheel(current);

      if (t < 1) {
        animFrameRef.current = requestAnimationFrame(step);
      } else {
        setSpinning(false);
        setWinner(eligibleMembers[chosenIndex]);
      }
    };

    animFrameRef.current = requestAnimationFrame(step);
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">
            ডিজিটাল লটারি সিস্টেম
          </p>
          <h3 className="font-display text-base font-bold text-slate-900 dark:text-slate-100">
            ডিজিটাল লাকি ড্র স্পিনার হুইল
          </h3>
        </div>
        <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
          যোগ্য সদস্য: {toBn(eligibleMembers.length)} জন
        </span>
      </div>

      <div className="mt-4 flex flex-col items-center gap-4">
        {/* Pointer + Wheel */}
        <div className="relative flex items-center justify-center">
          <div
            className="absolute -top-2 z-10 h-0 w-0 border-x-[11px] border-t-[18px] border-x-transparent border-t-red-600 drop-shadow-sm"
            aria-hidden="true"
          />
          <canvas
            ref={canvasRef}
            width={280}
            height={280}
            className="h-[260px] w-[260px] sm:h-[280px] sm:w-[280px]"
          />
        </div>

        <button
          type="button"
          disabled={spinning || eligibleMembers.length === 0}
          onClick={handleSpin}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-amber-600 px-6 text-sm font-bold text-white shadow-xs transition-colors hover:bg-amber-700 active:scale-[0.98] disabled:opacity-50"
        >
          <Dices className={`h-4 w-4 ${spinning ? 'animate-spin' : ''}`} />
          <span>{spinning ? 'চাকা ঘুরছে...' : 'লাকি ড্র স্পিন করুন'}</span>
        </button>

        {/* Winner Celebration Banner */}
        {winner && (
          <div className="w-full rounded-2xl border border-amber-300 bg-amber-50 p-4 text-center dark:border-amber-800 dark:bg-amber-950/40">
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-800 dark:text-amber-300">
              <Sparkles className="h-4 w-4" />
              <span>অভিনন্দন! লাকি ড্র বিজয়ী</span>
              <Trophy className="h-4 w-4" />
            </div>
            <p className="font-display mt-1 text-lg font-bold text-slate-900 dark:text-slate-100">
              #{toBn(winner.id)} {winner.name}
            </p>
            <p className="font-mono-num text-xs text-slate-600 dark:text-slate-300">
              মোবাইল: {winner.phone}
            </p>

            {canSaveDraw && !savedNotice && (
              <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                <input
                  type="date"
                  value={drawDate}
                  onChange={(e) => setDrawDate(e.target.value)}
                  className="h-9 rounded-lg border border-amber-300 bg-white px-2.5 text-xs dark:border-amber-800 dark:bg-slate-900"
                />
                <input
                  type="number"
                  min="1"
                  value={drawAmount}
                  onChange={(e) => setDrawAmount(e.target.value)}
                  placeholder="ড্র টাকা"
                  className="font-mono-num h-9 w-28 rounded-lg border border-amber-300 bg-white px-2.5 text-xs dark:border-amber-800 dark:bg-slate-900"
                />
                <button
                  type="button"
                  onClick={() => {
                    onSaveWinner(
                      winner.id,
                      drawDate,
                      Number(drawAmount) || 0,
                      'ডিজিটাল লাকি ড্র বিজয়ী'
                    );
                    setSavedNotice(true);
                  }}
                  className="inline-flex h-9 items-center gap-1 rounded-lg bg-teal-700 px-3.5 text-xs font-semibold text-white hover:bg-teal-800"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>বিজয়ী হিসেবে সেভ করুন</span>
                </button>
              </div>
            )}

            {savedNotice && (
              <p className="mt-2 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                বিজয়ীর নাম ড্র তালিকায় সফলভাবে সংরক্ষিত হয়েছে!
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
