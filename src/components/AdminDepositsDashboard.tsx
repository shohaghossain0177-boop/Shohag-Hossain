import {
  AlignLeft,
  BarChart3,
  CalendarRange,
  ChevronRight,
  RotateCcw,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatDateBn, getTodayISO, toBn } from '../data/defaultData';
import type { AdminTab, PaymentRequest, UnityDatabase } from '../types/unity';
import { MemberAvatar } from './MemberAvatar';

type TimeframeKey = 'all' | 'this_month' | 'last_30_days';
type ChartOrientation = 'vertical' | 'horizontal';

export interface TopMemberChartItem {
  rank: number;
  memberId: number;
  name: string;
  shortName: string;
  photoUrl?: string;
  totalDeposit: number;
  depositCount: number;
  latestDepositDate: string;
  sharePercent: number;
  ratioToLeader: number;
}

interface AdminDepositsDashboardProps {
  db: UnityDatabase;
  paymentRequests: PaymentRequest[];
  isSuperAdmin: boolean;
  onOpenMember: (memberId: number) => void;
  onOpenTab: (tab: AdminTab) => void;
}

const TIMEFRAME_OPTIONS: Array<{ key: TimeframeKey; label: string; description: string }> = [
  { key: 'all', label: 'সর্বমোট', description: 'শুরু থেকে এখন পর্যন্ত' },
  { key: 'this_month', label: 'চলতি মাস', description: 'বর্তমান মাসের জমা' },
  { key: 'last_30_days', label: 'গত ৩০ দিন', description: 'শেষ ৩০ দিনের জমা' },
];

function computeCutoffIsoDaysAgo(todayIso: string, daysAgo: number): string {
  const [y, m, d] = todayIso.split('-').map((n) => parseInt(n, 10));
  if (!y || !m || !d) return todayIso;
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() - daysAgo);
  const yy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const dd = String(dt.getDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

function formatCompactTakaBn(value: number): string {
  if (!Number.isFinite(value) || value === 0) return '৳ ০';
  if (value >= 100000) {
    const lakh = value / 100000;
    const formatted = lakh >= 10 ? Math.round(lakh).toString() : lakh.toFixed(1).replace(/\.0$/, '');
    return `৳ ${toBn(formatted)}ল`;
  }
  if (value >= 1000) {
    const k = value / 1000;
    const formatted = k >= 100 ? Math.round(k).toString() : k.toFixed(1).replace(/\.0$/, '');
    return `৳ ${toBn(formatted)}হ`;
  }
  return `৳ ${toBn(Math.round(value))}`;
}

function formatFullTakaBn(value: number): string {
  const rounded = Math.round(Number(value) || 0);
  const formattedEn = rounded.toLocaleString('en-IN');
  return `৳ ${toBn(formattedEn)}`;
}

function shortenMemberName(name: string): string {
  const cleaned = name.trim();
  if (cleaned.length <= 13) return cleaned;
  const parts = cleaned.split(/\s+/);
  if (parts.length >= 2) {
    const candidate = `${parts[0]} ${parts[1]}`;
    if (candidate.length <= 14) return candidate;
    return parts[0].length <= 13 ? parts[0] : `${parts[0].slice(0, 12)}…`;
  }
  return `${cleaned.slice(0, 12)}…`;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace('#', '').trim();
  if (clean.length !== 6) return { r: 15, g: 118, b: 110 };
  const num = parseInt(clean, 16);
  if (Number.isNaN(num)) return { r: 15, g: 118, b: 110 };
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

function mixRgb(
  base: { r: number; g: number; b: number },
  target: { r: number; g: number; b: number },
  weight: number
): string {
  const r = Math.round(base.r * (1 - weight) + target.r * weight);
  const g = Math.round(base.g * (1 - weight) + target.g * weight);
  const b = Math.round(base.b * (1 - weight) + target.b * weight);
  return `rgb(${r}, ${g}, ${b})`;
}

function buildBarRamp(primaryHex: string, darkMode: boolean): string[] {
  const base = hexToRgb(primaryHex || '#0f766e');
  const brightAnchor = darkMode ? { r: 45, g: 212, b: 191 } : base;
  const primary = darkMode ? mixRgb(base, brightAnchor, 0.25) : `rgb(${base.r}, ${base.g}, ${base.b})`;
  const neutralTarget = darkMode ? { r: 51, g: 65, b: 85 } : { r: 148, g: 163, b: 184 };
  return [
    primary,
    mixRgb(base, neutralTarget, darkMode ? 0.16 : 0.22),
    mixRgb(base, neutralTarget, darkMode ? 0.34 : 0.42),
    mixRgb(base, neutralTarget, darkMode ? 0.52 : 0.60),
    mixRgb(base, neutralTarget, darkMode ? 0.68 : 0.74),
  ];
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: TopMemberChartItem }>;
  darkMode: boolean;
}

function TopMemberTooltip({ active, payload, darkMode }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const item = payload[0]?.payload;
  if (!item) return null;

  return (
    <div
      className={`min-w-[205px] rounded-xl border px-3.5 py-2.5 text-xs shadow-lg ${
        darkMode
          ? 'border-slate-700 bg-slate-900/95 text-slate-100'
          : 'border-slate-200 bg-white/95 text-slate-900'
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="font-display text-sm font-bold">{item.name}</span>
        <span className="font-mono-num text-[11px] font-semibold text-teal-600 dark:text-teal-400">
          #{toBn(item.rank)}
        </span>
      </div>
      <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
        সদস্য আইডি #{toBn(item.memberId)} · {toBn(item.depositCount)}টি জমা
      </p>
      <div className="mt-2 flex items-baseline justify-between gap-3 border-t border-slate-100 pt-2 dark:border-slate-800">
        <span className="text-[11px] text-slate-500 dark:text-slate-400">মোট জমা</span>
        <span className="font-mono-num text-sm font-bold text-teal-700 dark:text-teal-300">
          {formatFullTakaBn(item.totalDeposit)}
        </span>
      </div>
      <div className="mt-1 flex items-center justify-between gap-3 text-[11px] text-slate-500 dark:text-slate-400">
        <span>মোট ফান্ডের অংশ</span>
        <span className="font-mono-num font-semibold text-slate-700 dark:text-slate-200">
          {toBn(item.sharePercent.toFixed(1))}%
        </span>
      </div>
      {item.latestDepositDate && (
        <p className="mt-1.5 text-[10px] text-slate-400 dark:text-slate-500">
          সর্বশেষ জমা: {formatDateBn(item.latestDepositDate)} · প্রোফাইল দেখতে ক্লিক করুন
        </p>
      )}
    </div>
  );
}

export function AdminDepositsDashboard({
  db,
  paymentRequests,
  isSuperAdmin,
  onOpenMember,
  onOpenTab,
}: AdminDepositsDashboardProps) {
  const [timeframe, setTimeframe] = useState<TimeframeKey>('all');
  const [orientation, setOrientation] = useState<ChartOrientation>('vertical');

  const darkMode = Boolean(db.appConfig.darkMode);
  const themeColor = db.appConfig.themeColor || '#0f766e';
  const barColors = useMemo(() => buildBarRamp(themeColor, darkMode), [themeColor, darkMode]);

  const pendingReqCount = useMemo(
    () => paymentRequests.filter((r) => r.status === 'pending').length,
    [paymentRequests]
  );

  const analytics = useMemo(() => {
    const todayIso = getTodayISO();
    const monthPrefix = todayIso.slice(0, 7);
    const cutoff30Iso = computeCutoffIsoDaysAgo(todayIso, 29);

    let totalCollected = 0;
    let totalDepositEntries = 0;

    const aggregated = db.members.map((member) => {
      const matchingDeposits = (member.deposits || []).filter((dep) => {
        if (timeframe === 'this_month') return dep.date.startsWith(monthPrefix);
        if (timeframe === 'last_30_days') return dep.date >= cutoff30Iso && dep.date <= todayIso;
        return true;
      });

      let sum = 0;
      let latestDate = '';
      for (const dep of matchingDeposits) {
        const amt = Number(dep.amount) || 0;
        if (amt > 0) sum += amt;
        if (dep.date && dep.date > latestDate) latestDate = dep.date;
      }

      totalCollected += sum;
      totalDepositEntries += matchingDeposits.length;

      return {
        memberId: member.id,
        name: member.name,
        shortName: shortenMemberName(member.name),
        photoUrl: member.photoUrl,
        totalDeposit: sum,
        depositCount: matchingDeposits.length,
        latestDepositDate: latestDate,
      };
    });

    const contributors = aggregated
      .filter((m) => m.totalDeposit > 0)
      .sort((a, b) => {
        if (b.totalDeposit !== a.totalDeposit) return b.totalDeposit - a.totalDeposit;
        if (b.depositCount !== a.depositCount) return b.depositCount - a.depositCount;
        return a.memberId - b.memberId;
      });

    const leaderAmount = contributors[0]?.totalDeposit || 1;
    const top5: TopMemberChartItem[] = contributors.slice(0, 5).map((item, idx) => ({
      ...item,
      rank: idx + 1,
      sharePercent: totalCollected > 0 ? (item.totalDeposit / totalCollected) * 100 : 0,
      ratioToLeader: Math.max(8, Math.round((item.totalDeposit / leaderAmount) * 100)),
    }));

    const top5CombinedTotal = top5.reduce((acc, item) => acc + item.totalDeposit, 0);
    const top5SharePercent = totalCollected > 0 ? (top5CombinedTotal / totalCollected) * 100 : 0;
    const activeContributorsCount = contributors.length;
    const averagePerContributor =
      activeContributorsCount > 0 ? Math.round(totalCollected / activeContributorsCount) : 0;

    return {
      top5,
      totalCollected,
      totalDepositEntries,
      top5CombinedTotal,
      top5SharePercent,
      activeContributorsCount,
      averagePerContributor,
      totalMembersCount: db.members.length,
    };
  }, [db.members, timeframe]);

  const activeTimeframeMeta =
    TIMEFRAME_OPTIONS.find((opt) => opt.key === timeframe) || TIMEFRAME_OPTIONS[0];

  const axisTickColor = darkMode ? '#94a3b8' : '#475569';
  const gridStrokeColor = darkMode ? '#1e293b' : '#e2e8f0';
  const cursorFillColor = darkMode ? 'rgba(148, 163, 184, 0.08)' : 'rgba(15, 118, 110, 0.06)';
  const labelFillColor = darkMode ? '#e2e8f0' : '#0f172a';

  return (
    <div className="space-y-5">
      {/* Top 4-Column Summary KPI Strip */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            মোট ফান্ড জমা
          </p>
          <p className="font-mono-num mt-1.5 text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            {formatFullTakaBn(analytics.totalCollected)}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {activeTimeframeMeta.label} · {toBn(analytics.totalDepositEntries)}টি লেনদেন
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            শীর্ষ ৫ জনের সম্মিলিত জমা
          </p>
          <p className="font-mono-num mt-1.5 text-2xl font-bold tracking-tight text-teal-700 dark:text-teal-400">
            {formatFullTakaBn(analytics.top5CombinedTotal)}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            মোট জমার{' '}
            <span className="font-mono-num font-semibold text-slate-700 dark:text-slate-200">
              {toBn(analytics.top5SharePercent.toFixed(1))}%
            </span>{' '}
            অংশ
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            গড় জমা / সক্রিয় সদস্য
          </p>
          <p className="font-mono-num mt-1.5 text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            {formatFullTakaBn(analytics.averagePerContributor)}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {toBn(analytics.activeContributorsCount)} / {toBn(analytics.totalMembersCount)} জন
            সক্রিয়
          </p>
        </div>

        <button
          type="button"
          onClick={() => onOpenTab('requests')}
          className="group rounded-2xl border border-slate-200 bg-white p-4 text-left transition-colors hover:border-slate-300 hover:bg-slate-50/70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700 dark:hover:bg-slate-800/60"
        >
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              অপেক্ষমাণ বিকাশ রিকোয়েস্ট
            </p>
            <ChevronRight className="h-4 w-4 text-slate-400 transition-transform group-hover:translate-x-0.5" />
          </div>
          <p
            className={`font-mono-num mt-1.5 text-2xl font-bold tracking-tight ${
              pendingReqCount > 0
                ? 'text-amber-600 dark:text-amber-400'
                : 'text-emerald-700 dark:text-emerald-400'
            }`}
          >
            {toBn(pendingReqCount)}টি
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {pendingReqCount > 0 ? 'যাচাই করতে ক্লিক করুন' : 'সব রিকোয়েস্ট যাচাইকৃত'}
          </p>
        </button>
      </div>

      {/* Main Analytics Workspace: Chart Focal Anchor + Ranked Top 5 Leaderboard */}
      <div className="grid grid-cols-1 items-stretch gap-5 lg:grid-cols-12">
        {/* Left: Recharts Bar Chart of Top 5 Members */}
        <section className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 lg:col-span-7 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="font-display text-base font-bold text-slate-900 dark:text-slate-100">
                শীর্ষ ৫ সদস্যের মোট ডিপোজিট চার্ট
              </h3>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                {activeTimeframeMeta.description} · সর্বোচ্চ জমাকারী {toBn(analytics.top5.length)}{' '}
                জন সদস্য
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Timeframe Segmented Filter */}
              <div
                role="group"
                aria-label="সময়সীমা ফিল্টার"
                className="inline-flex items-center gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800"
              >
                {TIMEFRAME_OPTIONS.map((opt) => {
                  const active = timeframe === opt.key;
                  return (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => setTimeframe(opt.key)}
                      className={`h-8 rounded-lg px-2.5 text-xs font-semibold whitespace-nowrap transition-colors ${
                        active
                          ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-teal-300'
                          : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>

              {/* Chart Orientation Toggle */}
              <div
                role="group"
                aria-label="চার্ট লেআউট"
                className="inline-flex items-center gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800"
              >
                <button
                  type="button"
                  onClick={() => setOrientation('vertical')}
                  title="উল্লম্ব বার চার্ট"
                  aria-label="উল্লম্ব বার চার্ট"
                  aria-pressed={orientation === 'vertical'}
                  className={`inline-flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
                    orientation === 'vertical'
                      ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-teal-300'
                      : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                  }`}
                >
                  <BarChart3 className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setOrientation('horizontal')}
                  title="অনুভূমিক বার চার্ট"
                  aria-label="অনুভূমিক বার চার্ট"
                  aria-pressed={orientation === 'horizontal'}
                  className={`inline-flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
                    orientation === 'horizontal'
                      ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-teal-300'
                      : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                  }`}
                >
                  <AlignLeft className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>

          <div className="mt-5 flex-1">
            {analytics.top5.length === 0 ? (
              <div className="flex min-h-[300px] flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/70 px-6 py-10 text-center dark:border-slate-800 dark:bg-slate-950/50">
                <BarChart3 className="h-9 w-9 text-slate-300 dark:text-slate-600" />
                <p className="font-display mt-3 text-sm font-bold text-slate-800 dark:text-slate-200">
                  এই সময়সীমায় কোনো ডিপোজিট রেকর্ড পাওয়া যায়নি
                </p>
                <p className="mt-1 max-w-sm text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                  নির্বাচিত সময়সীমা ({activeTimeframeMeta.label})-এ কোনো সদস্যের জমা যুক্ত হলে এখানে
                  স্বয়ংক্রিয়ভাবে শীর্ষ ৫ সদস্যের বার চার্ট দেখাবে।
                </p>
                <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                  {timeframe !== 'all' && (
                    <button
                      type="button"
                      onClick={() => setTimeframe('all')}
                      className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-teal-700 px-4 text-xs font-semibold text-white hover:bg-teal-800"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      <span>সর্বমোট সময় দেখুন</span>
                    </button>
                  )}
                  {isSuperAdmin && (
                    <button
                      type="button"
                      onClick={() => onOpenTab('bulk')}
                      className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      <CalendarRange className="h-3.5 w-3.5" />
                      <span>রেঞ্জ ডিপোজিট যুক্ত করুন</span>
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="h-[320px] w-full" aria-label="শীর্ষ ৫ সদস্যের মোট ডিপোজিট বার চার্ট">
                <ResponsiveContainer width="100%" height="100%">
                  {orientation === 'vertical' ? (
                    <BarChart
                      data={analytics.top5}
                      margin={{ top: 26, right: 12, left: 4, bottom: 12 }}
                      barCategoryGap="24%"
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        vertical={false}
                        stroke={gridStrokeColor}
                      />
                      <XAxis
                        dataKey="shortName"
                        tick={{ fill: axisTickColor, fontSize: 12, fontWeight: 600 }}
                        axisLine={{ stroke: gridStrokeColor }}
                        tickLine={false}
                        interval={0}
                        dy={6}
                      />
                      <YAxis
                        tickFormatter={(val: number) => formatCompactTakaBn(val)}
                        tick={{ fill: axisTickColor, fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                        width={64}
                      />
                      <Tooltip
                        cursor={{ fill: cursorFillColor, radius: 8 }}
                        content={<TopMemberTooltip darkMode={darkMode} />}
                      />
                      <Bar
                        dataKey="totalDeposit"
                        name="মোট জমা"
                        radius={[8, 8, 0, 0]}
                        maxBarSize={58}
                        isAnimationActive={true}
                        animationDuration={320}
                        className="cursor-pointer"
                        onClick={(barData) => {
                          const clicked = barData?.payload as TopMemberChartItem | undefined;
                          if (clicked?.memberId) {
                            onOpenMember(clicked.memberId);
                          }
                        }}
                      >
                        {analytics.top5.map((entry, index) => (
                          <Cell
                            key={`cell-v-${entry.memberId}`}
                            fill={barColors[index] || barColors[barColors.length - 1]}
                          />
                        ))}
                        <LabelList
                          dataKey="totalDeposit"
                          position="top"
                          formatter={(val: unknown) => formatCompactTakaBn(Number(val) || 0)}
                          style={{
                            fill: labelFillColor,
                            fontSize: 11,
                            fontWeight: 700,
                            fontFamily: 'IBM Plex Mono, Noto Sans Bengali, monospace',
                          }}
                        />
                      </Bar>
                    </BarChart>
                  ) : (
                    <BarChart
                      data={analytics.top5}
                      layout="vertical"
                      margin={{ top: 8, right: 64, left: 6, bottom: 8 }}
                      barCategoryGap="22%"
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        horizontal={false}
                        stroke={gridStrokeColor}
                      />
                      <XAxis
                        type="number"
                        tickFormatter={(val: number) => formatCompactTakaBn(val)}
                        tick={{ fill: axisTickColor, fontSize: 11 }}
                        axisLine={{ stroke: gridStrokeColor }}
                        tickLine={false}
                      />
                      <YAxis
                        type="category"
                        dataKey="shortName"
                        tick={{ fill: axisTickColor, fontSize: 12, fontWeight: 600 }}
                        axisLine={false}
                        tickLine={false}
                        width={108}
                      />
                      <Tooltip
                        cursor={{ fill: cursorFillColor, radius: 6 }}
                        content={<TopMemberTooltip darkMode={darkMode} />}
                      />
                      <Bar
                        dataKey="totalDeposit"
                        name="মোট জমা"
                        radius={[0, 8, 8, 0]}
                        maxBarSize={34}
                        isAnimationActive={true}
                        animationDuration={320}
                        className="cursor-pointer"
                        onClick={(barData) => {
                          const clicked = barData?.payload as TopMemberChartItem | undefined;
                          if (clicked?.memberId) {
                            onOpenMember(clicked.memberId);
                          }
                        }}
                      >
                        {analytics.top5.map((entry, index) => (
                          <Cell
                            key={`cell-h-${entry.memberId}`}
                            fill={barColors[index] || barColors[barColors.length - 1]}
                          />
                        ))}
                        <LabelList
                          dataKey="totalDeposit"
                          position="right"
                          formatter={(val: unknown) => formatCompactTakaBn(Number(val) || 0)}
                          style={{
                            fill: labelFillColor,
                            fontSize: 11,
                            fontWeight: 700,
                            fontFamily: 'IBM Plex Mono, Noto Sans Bengali, monospace',
                          }}
                        />
                      </Bar>
                    </BarChart>
                  )}
                </ResponsiveContainer>
              </div>
            )}
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 text-[11px] text-slate-500 dark:border-slate-800 dark:text-slate-400">
            <span>যেকোনো বারে ক্লিক করলে সরাসরি ওই সদস্যের ডিপোজিট প্রোফাইল খুলবে</span>
            <span className="font-mono-num">
              মোট {toBn(analytics.totalMembersCount)} সদস্য · {activeTimeframeMeta.label}
            </span>
          </div>
        </section>

        {/* Right: Ranked Top 5 Contributors List */}
        <section className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 lg:col-span-5 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-display text-base font-bold text-slate-900 dark:text-slate-100">
                শীর্ষ ৫ জমাকারীর তালিকা
              </h3>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                {activeTimeframeMeta.label} অনুযায়ী ক্রম ও মোট ফান্ডের অংশ
              </p>
            </div>
            <span className="font-mono-num text-xs font-semibold text-slate-500 dark:text-slate-400">
              {toBn(analytics.top5.length)} / {toBn(5)}
            </span>
          </div>

          {analytics.top5.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center py-12 text-center">
              <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
                কোনো জমাকারী তালিকাভুক্ত নেই
              </p>
              <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                ডিপোজিট এন্ট্রি যুক্ত হলে র‍্যাংকিং স্বয়ংক্রিয়ভাবে আপডেট হবে।
              </p>
            </div>
          ) : (
            <div className="mt-3 flex-1 divide-y divide-slate-100 dark:divide-slate-800">
              {analytics.top5.map((item, idx) => {
                const barTone = barColors[idx] || barColors[barColors.length - 1];
                return (
                  <button
                    key={item.memberId}
                    type="button"
                    onClick={() => onOpenMember(item.memberId)}
                    className="group flex w-full items-center gap-3 py-3 text-left transition-colors hover:bg-slate-50/80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 dark:hover:bg-slate-800/50"
                  >
                    <span
                      className={`font-mono-num w-6 shrink-0 text-center text-xs font-bold ${
                        idx === 0
                          ? 'text-teal-700 dark:text-teal-300'
                          : 'text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      #{toBn(item.rank)}
                    </span>

                    <MemberAvatar
                      memberId={item.memberId}
                      name={item.name}
                      photoUrl={item.photoUrl}
                      size="sm"
                      showIdBadge={false}
                    />

                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="truncate text-sm font-bold text-slate-900 group-hover:text-teal-700 dark:text-slate-100 dark:group-hover:text-teal-300">
                          {item.name}
                        </p>
                        <span className="font-mono-num shrink-0 text-sm font-bold text-slate-900 dark:text-slate-100">
                          {formatFullTakaBn(item.totalDeposit)}
                        </span>
                      </div>

                      <div className="mt-0.5 flex items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                        <span className="truncate">
                          আইডি #{toBn(item.memberId)} · {toBn(item.depositCount)}টি জমা
                        </span>
                        <span className="font-mono-num shrink-0 font-semibold">
                          {toBn(item.sharePercent.toFixed(1))}%
                        </span>
                      </div>

                      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                        <div
                          className="h-full rounded-full transition-all duration-300"
                          style={{
                            width: `${item.ratioToLeader}%`,
                            backgroundColor: barTone,
                          }}
                        />
                      </div>
                    </div>

                    <ChevronRight className="h-4 w-4 shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-slate-500 dark:text-slate-600 dark:group-hover:text-slate-300" />
                  </button>
                );
              })}
            </div>
          )}

          <div className="mt-3 border-t border-slate-100 pt-3 text-[11px] text-slate-500 dark:border-slate-800 dark:text-slate-400">
            লাইভ ডেটা থেকে তাৎক্ষণিক হিসাব · নতুন জমা যুক্ত হলেই চার্ট আপডেট হয়
          </div>
        </section>
      </div>
    </div>
  );
}
