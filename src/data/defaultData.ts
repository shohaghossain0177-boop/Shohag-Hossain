import type {
  AppConfig,
  AutomatedPopup,
  BuiltinToggleKey,
  Deposit,
  Member,
  NoticeDuration,
  RuleItem,
  UnityDatabase,
} from '../types/unity.ts';
import {
  isSafeAppIconDataUrl,
  isSafeRasterPhotoDataUrl,
  sanitizeMemberPhotoUrl,
} from '../utils/avatarLibrary.ts';

export const CURRENT_CLIENT_VERSION = '2.1.0';
export const DEFAULT_ADMIN_PASSCODE = '@Shohag007';

export const DEFAULT_RULES: RuleItem[] = [
  {
    id: 'r_1',
    title: 'সময়মতো ডিপোজিট',
    description: 'নির্ধারিত সময়ের মধ্যেই ডিপোজিট পরিশোধ করতে হবে।',
  },
  {
    id: 'r_2',
    title: 'দিনে দিনেই পরিশোধ',
    description: 'দৈনিক পেমেন্ট সংশ্লিষ্ট দিনেই রাত ৮টার মধ্যে বাধ্যতামূলকভাবে করতে হবে।',
  },
  {
    id: 'r_3',
    title: 'অগ্রিম থাকলে ডিউ নয়',
    description: 'অগ্রিম পেমেন্টের সুযোগ থাকলে কোনো ডিউ রাখা যাবে না।',
  },
  {
    id: 'r_4',
    title: 'প্রথম মাস ব্লক ফান্ড',
    description: 'প্রথম একমাসের সব ডিপোজিট ব্লক ফান্ডে জমা থাকবে।',
  },
  {
    id: 'r_5',
    title: 'সকলের সম্মতিতে ড্র আপোষ',
    description: 'সবার অনুমতি ছাড়া ড্র আপোষ বা পরিবর্তন করা যাবে না।',
  },
  {
    id: 'r_6',
    title: 'বিকাশ খরচ বাধ্যতামূলক',
    description: 'বিকাশ পেমেন্টের নির্ধারিত খরচ ব্যবহারকারীকেই দিতে হবে।',
  },
  {
    id: 'r_7',
    title: 'প্রমাণ সংরক্ষণ',
    description: 'লেনদেনের ট্রানজেকশন আইডি বা প্রমাণ সংরক্ষণ করতে হবে।',
  },
  {
    id: 'r_8',
    title: 'নিয়ম ভঙ্গের শাস্তি',
    description: 'নিয়ম না মানলে অ্যাকাউন্ট স্থগিত বা বাতিল হতে পারে।',
  },
  {
    id: 'r_9',
    title: 'স্বচ্ছতা ও পাবলিক রেকর্ড',
    description: 'স্বচ্ছতা নিশ্চিত করতে সব লেনদেন পাবলিকলি রেকর্ড থাকবে।',
  },
  {
    id: 'r_10',
    title: 'সাপোর্ট সিস্টেম',
    description: 'যেকোনো সমস্যা সমাধানের জন্য ২৪/৭ লাইভ সাপোর্ট সুবিধা থাকবে।',
  },
  {
    id: 'r_11',
    title: 'কর্তৃপক্ষের চূড়ান্ত সিদ্ধান্ত',
    description: 'অসংগতি থাকলে কর্তৃপক্ষ চূড়ান্ত সিদ্ধান্ত গ্রহণের ক্ষমতা রাখবে।',
  },
  {
    id: 'r_12',
    title: 'আপডেট নীতি',
    description: 'নতুন শর্তাবলি প্রয়োজনে পরিবর্তনযোগ্য হবে।',
  },
  {
    id: 'r_13',
    title: 'গোপনীয়তা নীতি',
    description: 'ব্যবহারকারীর ব্যক্তিগত তথ্যের নিরাপত্তা সর্বদাই সংরক্ষিত থাকবে।',
  },
];

export const DEFAULT_POPUPS: AutomatedPopup[] = [
  {
    id: 'pop_daily_8pm',
    title: 'দৈনিক ডিপোজিট রিমাইন্ডার (রাত ৮টা)',
    message:
      'সম্মানিত সদস্যবৃন্দ, নিয়ম অনুযায়ী আজকের দৈনিক ডিপোজিট রাত ৮টার মধ্যে পরিশোধ করার জন্য অনুরোধ করা হচ্ছে। বিকাশে পাঠালে খরচসহ পাঠান এবং ট্রানজেকশন আইডি সংরক্ষণ করুন।',
    triggerType: 'unpaid_reminder',
    scheduleTime: '19:30',
    enabled: true,
    frequency: 'once_per_day',
    actionLabel: 'দৈনিক তালিকা দেখুন',
    actionTarget: 'dailyPayments',
  },
];

export const DEFAULT_ENABLED_TOGGLES: Record<BuiltinToggleKey, boolean> = {
  kisti: true,
  draws: true,
  fund: true,
  dailyPayments: true,
  reports: true,
  userList: true,
  rules: true,
  addMember: true,
  payment: true,
  updates: true,
};

export const BUILTIN_TOGGLE_META: Array<{
  key: BuiltinToggleKey;
  label: string;
  description: string;
}> = [
  { key: 'kisti', label: 'মোট প্রদেয় কিস্তি', description: 'সর্বমোট জমাকৃত কিস্তির হিসাব ও তালিকা' },
  { key: 'draws', label: 'ড্র পাওয়া ব্যক্তি', description: 'ড্র বিজয়ীদের তালিকা, লাকি ড্র হুইল ও এন্ট্রি' },
  { key: 'fund', label: 'টোটাল ফান্ড', description: 'মোট ফান্ড, ১ম মাসের ব্লক ফান্ড, বকেয়া ও নিট ব্যালেন্স' },
  { key: 'dailyPayments', label: 'দৈনিক পেমেন্ট তালিকা', description: 'প্রতিদিনের পেমেন্টকারী, নন-পেমেন্টকারী ও হোয়াটসঅ্যাপ রিমাইন্ডার' },
  { key: 'reports', label: 'মাসিক ও বাৎসরিক রিপোর্ট', description: 'মাসিক/বাৎসরিক ফান্ড রিপোর্ট, এক্সেল (CSV) ও প্রিন্ট' },
  { key: 'userList', label: 'ইউজার লিস্ট', description: 'বর্তমানে এক্টিভ ও লগইন করা সকল ইউজারের লাইভ তালিকা' },
  { key: 'rules', label: 'রুলস & রেগুলেশন', description: 'সংগঠনের সংক্ষিপ্ত নিয়মাবলি ও নীতিমালা' },
  { key: 'payment', label: 'পেমেন্ট মাধ্যম', description: 'নগদ ডিরেক্ট জমাদান, বিকাশ পার্সোনাল ও পেমেন্ট রিকোয়েস্ট' },
  { key: 'addMember', label: 'নতুন সদস্য এড করা', description: 'নতুন সদস্য যুক্ত করার অপশন (এডমিন)' },
  { key: 'updates', label: 'অ্যাপ আপডেট ও ব্যাকআপ', description: 'অ্যাপ থেকেই পরবর্তী আপডেট ও ব্যাকআপ গ্রহণ' },
];

export function getDefaultAppConfig(): AppConfig {
  return {
    homeTickerText: 'সম্মানিত সদস্যগনকে নিজ উদ্যোগে ডেইলি ডিপোজিট জমাদানের জন্য আহবান জানানো হচ্ছে।',
    bkashTickerText: 'দয়া করে সর্বনিম্ন ৫টি ডিপোজিট ও খরচ সহ বিকাশ করুন',
    bkashNumber: '01303768168',
    adminPhone: '01607703566',
    themeColor: '#0f766e',
    darkMode: false,
    fundTarget: 0,
    sortBy: 'id',
    enabledToggles: { ...DEFAULT_ENABLED_TOGGLES },
    customToggles: [],
    pinnedNotice: null,
    automatedPopups: DEFAULT_POPUPS.map((p) => ({ ...p })),
    scheduledNotifications: [],
    appVersion: CURRENT_CLIENT_VERSION,
    updateManifestUrl: '',
    changelog: [
      {
        version: '2.1.0',
        releaseDate: '2026-11-23',
        notes:
          'Firebase রিয়েল-টাইম ক্লাউড ডেটাবেজ সিঙ্ক, আনলিমিটেড সদস্য সাপোর্ট, মেম্বার ফোন নম্বর ও অ্যাডমিন পিনের কঠোর নিরাপত্তা বিভাজন এবং পূর্ণ JSON ব্যাকআপ ও রিস্টোর যুক্ত করা হয়েছে।',
        publishedAtMs: 1795446224799,
      },
      {
        version: '2.0.0',
        releaseDate: '2026-11-23',
        notes:
          'রুলস & রেগুলেশন (১৩টি নিয়ম), এডমিন টুগল কন্ট্রোল, ১ দিন/১ সপ্তাহ/১ মাসের পিন নোটিশ, অটোমেটেড পপ-আপ মেসেজ, প্রতিদিনের পেমেন্টকারী ও নন-পেমেন্টকারীর তালিকা এবং ইন-অ্যাপ আপডেট সিস্টেম যুক্ত করা হয়েছে।',
        publishedAtMs: 1795374000000,
      },
    ],
  };
}

export const INITIAL_MEMBERS: Member[] = [
  {
    id: 1,
    name: 'সোহেল মাহমুদ',
    phone: '01765422160',
    deposits: [{ id: 'd_1795373485880_183', date: '2026-11-22', amount: 300, note: 'দৈনিক কিস্তি' }],
  },
  { id: 2, name: 'সোহেল রানা', phone: '01735889440', deposits: [] },
  {
    id: 3,
    name: 'নিজাম উদ্দিন',
    phone: '01740850588',
    deposits: [
      { id: 'd_1795445185214_0', date: '2026-11-22', amount: 100, note: 'দৈনিক কিস্তি' },
      { id: 'd_1795445185214_1', date: '2026-11-23', amount: 100, note: 'দৈনিক কিস্তি' },
    ],
  },
  {
    id: 4,
    name: 'মো রুবেল',
    phone: '01879741840',
    deposits: [
      { id: 'd_1795440824866_0', date: '2026-11-22', amount: 100, note: 'দৈনিক কিস্তি' },
      { id: 'd_1795440824867_1', date: '2026-11-23', amount: 100, note: 'দৈনিক কিস্তি' },
    ],
  },
  {
    id: 5,
    name: 'মো রুবেল(২)',
    phone: '01879741840',
    deposits: [
      { id: 'd_1795440850709_0', date: '2026-11-22', amount: 100, note: 'দৈনিক কিস্তি' },
      { id: 'd_1795440850709_1', date: '2026-11-23', amount: 100, note: 'দৈনিক কিস্তি' },
    ],
  },
  {
    id: 6,
    name: 'মো রুবেল(৩)',
    phone: '01879741840',
    deposits: [
      { id: 'd_1795440873912_0', date: '2026-11-22', amount: 100, note: 'দৈনিক কিস্তি' },
      { id: 'd_1795440873912_1', date: '2026-11-23', amount: 100, note: 'দৈনিক কিস্তি' },
    ],
  },
  {
    id: 7,
    name: 'মো রুবেল(৪)',
    phone: '01879741840',
    deposits: [
      { id: 'd_1795440886876_0', date: '2026-11-22', amount: 100, note: 'দৈনিক কিস্তি' },
      { id: 'd_1795440886876_1', date: '2026-11-23', amount: 100, note: 'দৈনিক কিস্তি' },
    ],
  },
  {
    id: 8,
    name: 'মো রুবেল(৫)',
    phone: '01879741840',
    deposits: [
      { id: 'd_1795440908819_0', date: '2026-11-22', amount: 100, note: 'দৈনিক কিস্তি' },
      { id: 'd_1795440908819_1', date: '2026-11-23', amount: 100, note: 'দৈনিক কিস্তি' },
    ],
  },
  { id: 9, name: 'রাকিব হোসেন', phone: '01968669988', deposits: [] },
  {
    id: 10,
    name: 'ফাহাদ আলী',
    phone: '01777294571',
    deposits: [
      { id: 'd_1795436522430_0', date: '2026-11-22', amount: 100, note: 'দৈনিক কিস্তি' },
      { id: 'd_1795436522430_1', date: '2026-11-23', amount: 100, note: 'দৈনিক কিস্তি' },
      { id: 'd_1795436522430_2', date: '2026-11-24', amount: 100, note: 'দৈনিক কিস্তি' },
      { id: 'd_1795436522430_3', date: '2026-11-25', amount: 100, note: 'দৈনিক কিস্তি' },
      { id: 'd_1795436522430_4', date: '2026-11-26', amount: 100, note: 'দৈনিক কিস্তি' },
    ],
  },
  {
    id: 11,
    name: 'ফাহাদ আলী(২)',
    phone: '01777294571',
    deposits: [
      { id: 'd_1795436537035_0', date: '2026-11-22', amount: 100, note: 'দৈনিক কিস্তি' },
      { id: 'd_1795436537035_1', date: '2026-11-23', amount: 100, note: 'দৈনিক কিস্তি' },
      { id: 'd_1795436537035_2', date: '2026-11-24', amount: 100, note: 'দৈনিক কিস্তি' },
      { id: 'd_1795436537035_3', date: '2026-11-25', amount: 100, note: 'দৈনিক কিস্তি' },
      { id: 'd_1795436537035_4', date: '2026-11-26', amount: 100, note: 'দৈনিক কিস্তি' },
    ],
  },
  {
    id: 12,
    name: 'শরীফ মোল্লা',
    phone: '01812465555',
    deposits: [
      { id: 'd_1795435071385_0', date: '2026-11-22', amount: 100, note: 'দৈনিক কিস্তি' },
      { id: 'd_1795435071386_1', date: '2026-11-23', amount: 100, note: 'দৈনিক কিস্তি' },
      { id: 'd_1795435071386_2', date: '2026-11-24', amount: 100, note: 'দৈনিক কিস্তি' },
    ],
  },
  {
    id: 13,
    name: 'শরীফ মোল্লা(২)',
    phone: '01812465555',
    deposits: [
      { id: 'd_1795435102462_0', date: '2026-11-22', amount: 100, note: 'দৈনিক কিস্তি' },
      { id: 'd_1795435102462_1', date: '2026-11-23', amount: 100, note: 'দৈনিক কিস্তি' },
      { id: 'd_1795435102462_2', date: '2026-11-24', amount: 100, note: 'দৈনিক কিস্তি' },
    ],
  },
  {
    id: 14,
    name: 'এডমিন সোহাগ হোসেন',
    phone: '01607703566',
    deposits: [
      { id: 'd_1795425052450_0', date: '2026-11-22', amount: 100, note: 'দৈনিক কিস্তি' },
      { id: 'd_1795425052450_1', date: '2026-11-23', amount: 100, note: 'দৈনিক কিস্তি' },
    ],
  },
  {
    id: 15,
    name: 'সোহাগ হোসেন(২)',
    phone: '01607703566',
    deposits: [
      { id: 'd_1795425083270_0', date: '2026-11-22', amount: 100, note: 'দৈনিক কিস্তি' },
      { id: 'd_1795425083270_1', date: '2026-11-23', amount: 100, note: 'দৈনিক কিস্তি' },
    ],
  },
  {
    id: 16,
    name: 'মো নাহিদ',
    phone: '01610185995',
    deposits: [
      { id: 'd_1795428538943_0', date: '2026-11-22', amount: 100, note: 'দৈনিক কিস্তি' },
      { id: 'd_1795428538943_1', date: '2026-11-23', amount: 100, note: 'দৈনিক কিস্তি' },
    ],
  },
  {
    id: 17,
    name: 'মো নাহিদ(২)',
    phone: '01610185995',
    deposits: [
      { id: 'd_1795428569992_0', date: '2026-11-22', amount: 100, note: 'দৈনিক কিস্তি' },
      { id: 'd_1795428569992_1', date: '2026-11-23', amount: 100, note: 'দৈনিক কিস্তি' },
    ],
  },
  {
    id: 18,
    name: 'হৃদয়',
    phone: '01783789751',
    deposits: [
      { id: 'd_1795435232709_0', date: '2026-11-22', amount: 100, note: 'দৈনিক কিস্তি' },
      { id: 'd_1795435232709_1', date: '2026-11-23', amount: 100, note: 'দৈনিক কিস্তি' },
    ],
  },
  {
    id: 19,
    name: 'ইয়াসিন',
    phone: '01337679138',
    deposits: [
      { id: 'd_1795423867338_0', date: '2026-11-22', amount: 100, note: 'দৈনিক কিস্তি' },
      { id: 'd_1795423867338_1', date: '2026-11-23', amount: 100, note: 'দৈনিক কিস্তি' },
    ],
  },
  { id: 21, name: 'শাকিব হোসেন', phone: '01829841743', deposits: [] },
  {
    id: 22,
    name: 'নাহিদ(ব্রাদার)',
    phone: '01748807548',
    deposits: [
      { id: 'd_1795435388237_0', date: '2026-11-22', amount: 100, note: 'দৈনিক কিস্তি' },
      { id: 'd_1795435388237_1', date: '2026-11-23', amount: 100, note: 'দৈনিক কিস্তি' },
      { id: 'd_1795435388237_2', date: '2026-11-24', amount: 100, note: 'দৈনিক কিস্তি' },
      { id: 'd_1795435388237_3', date: '2026-11-25', amount: 100, note: 'দৈনিক কিস্তি' },
      { id: 'd_1795435388237_4', date: '2026-11-26', amount: 100, note: 'দৈনিক কিস্তি' },
      { id: 'd_1795436152998', date: '2026-11-27', amount: 100, note: 'দৈনিক কিস্তি' },
    ],
  },
  {
    id: 23,
    name: 'জোবায়ের',
    phone: '01784351518',
    deposits: [
      { id: 'd_1795426494289_0', date: '2026-11-22', amount: 100, note: 'দৈনিক কিস্তি' },
      { id: 'd_1795426494289_1', date: '2026-11-23', amount: 100, note: 'দৈনিক কিস্তি' },
    ],
  },
  {
    id: 24,
    name: 'সৈকত',
    phone: '01981212533',
    deposits: [
      { id: 'd_1795426222765_0', date: '2026-11-22', amount: 100, note: 'দৈনিক কিস্তি' },
      { id: 'd_1795426222765_1', date: '2026-11-23', amount: 100, note: 'দৈনিক কিস্তি' },
    ],
  },
  {
    id: 25,
    name: 'নাইম',
    phone: '01764870180',
    deposits: [
      { id: 'd_1795373303501_102', date: '2026-11-22', amount: 100, note: 'দৈনিক কিস্তি' },
      { id: 'd_1795373308237_469', date: '2026-11-23', amount: 100, note: 'দৈনিক কিস্তি' },
      { id: 'd_1795373312558_783', date: '2026-11-24', amount: 100, note: 'দৈনিক কিস্তি' },
    ],
  },
  {
    id: 26,
    name: 'নাইম(২)',
    phone: '01764870180',
    deposits: [
      { id: 'd_1795426045244_0', date: '2026-11-22', amount: 100, note: 'দৈনিক কিস্তি' },
      { id: 'd_1795426045244_1', date: '2026-11-23', amount: 100, note: 'দৈনিক কিস্তি' },
      { id: 'd_1795426045244_2', date: '2026-11-24', amount: 100, note: 'দৈনিক কিস্তি' },
    ],
  },
  {
    id: 27,
    name: 'মামুন',
    phone: '01312039890',
    deposits: [
      { id: 'd_1795373266460_348', date: '2026-11-22', amount: 100, note: 'দৈনিক কিস্তি' },
      { id: 'd_1795373271997_861', date: '2026-11-23', amount: 100, note: 'দৈনিক কিস্তি' },
    ],
  },
  {
    id: 28,
    name: 'আরমান',
    phone: '01860673908',
    deposits: [
      { id: 'd_1795425967577_0', date: '2026-11-22', amount: 100, note: 'দৈনিক কিস্তি' },
      { id: 'd_1795425967577_1', date: '2026-11-23', amount: 100, note: 'দৈনিক কিস্তি' },
      { id: 'd_1795425967577_2', date: '2026-11-24', amount: 100, note: 'দৈনিক কিস্তি' },
      { id: 'd_1795425967577_3', date: '2026-11-25', amount: 100, note: 'দৈনিক কিস্তি' },
      { id: 'd_1795425967577_4', date: '2026-11-26', amount: 100, note: 'দৈনিক কিস্তি' },
    ],
  },
  {
    id: 29,
    name: 'ফারুক',
    phone: '01814445759',
    deposits: [
      { id: 'd_1795436606310_0', date: '2026-11-22', amount: 100, note: 'দৈনিক কিস্তি' },
      { id: 'd_1795436606310_1', date: '2026-11-23', amount: 100, note: 'দৈনিক কিস্তি' },
    ],
  },
  {
    id: 30,
    name: 'মো রনি',
    phone: '01721267313',
    deposits: [
      { id: 'd_1795422695621_1', date: '2026-11-23', amount: 100, note: '০১.১২.২৬ পর্যন্ত পেইড' },
      { id: 'd_1795422695621_2', date: '2026-11-24', amount: 100, note: '০১.১২.২৬ পর্যন্ত পেইড' },
      { id: 'd_1795422695621_3', date: '2026-11-25', amount: 100, note: '০১.১২.২৬ পর্যন্ত পেইড' },
      { id: 'd_1795422695621_4', date: '2026-11-26', amount: 100, note: '০১.১২.২৬ পর্যন্ত পেইড' },
      { id: 'd_1795422695621_5', date: '2026-11-27', amount: 100, note: '০১.১২.২৬ পর্যন্ত পেইড' },
      { id: 'd_1795422695621_6', date: '2026-11-28', amount: 100, note: '০১.১২.২৬ পর্যন্ত পেইড' },
      { id: 'd_1795422695621_7', date: '2026-11-29', amount: 100, note: '০১.১২.২৬ পর্যন্ত পেইড' },
      { id: 'd_1795422754981_0', date: '2026-11-22', amount: 100, note: 'দৈনিক কিস্তি' },
      { id: 'd_1795422778686_0', date: '2026-11-30', amount: 100, note: 'দৈনিক কিস্তি' },
      { id: 'd_1795422778686_1', date: '2026-12-01', amount: 100, note: 'দৈনিক কিস্তি' },
    ],
  },
  {
    id: 31,
    name: 'ইয়াসিন আরাফাত ইমন',
    phone: '01758888046',
    deposits: [
      { id: 'd_1795428286707_0', date: '2026-11-22', amount: 100, note: 'দৈনিক কিস্তি' },
      { id: 'd_1795428286707_2', date: '2026-11-24', amount: 100, note: 'দৈনিক কিস্তি' },
      { id: 'd_1795428286707_3', date: '2026-11-25', amount: 100, note: 'দৈনিক কিস্তি' },
      { id: 'd_1795428314648', date: '2026-11-23', amount: 100, note: 'দৈনিক কিস্তি' },
    ],
  },
  {
    id: 32,
    name: 'ফিরোজ',
    phone: '01859692423',
    deposits: [
      { id: 'd_1795422609162_0', date: '2026-11-22', amount: 100, note: 'দৈনিক কিস্তি' },
      { id: 'd_1795422609162_1', date: '2026-11-23', amount: 100, note: 'দৈনিক কিস্তি' },
    ],
  },
  {
    id: 33,
    name: 'সোহেল মাহমুদ(২)',
    phone: '01765422160',
    deposits: [{ id: 'd_1795373521318_241', date: '2026-11-22', amount: 300, note: 'দৈনিক কিস্তি' }],
  },
  {
    id: 34,
    name: 'মো: মোহন',
    phone: '01859759431',
    deposits: [
      { id: 'd_1795446224799_0', date: '2026-11-22', amount: 100, note: 'দৈনিক কিস্তি' },
      { id: 'd_1795446224799_1', date: '2026-11-23', amount: 100, note: 'দৈনিক কিস্তি' },
    ],
  },
  {
    id: 35,
    name: 'সোহেল মাহমুদ(৩)',
    phone: '01765422160',
    deposits: [{ id: 'd_1795373601441_671', date: '2026-11-22', amount: 300, note: 'দৈনিক কিস্তি' }],
  },
  {
    id: 36,
    name: 'সোহেল মাহমুদ(৪)',
    phone: '01765422160',
    deposits: [{ id: 'd_1795373642609_939', date: '2026-11-22', amount: 300, note: 'দৈনিক কিস্তি' }],
  },
  {
    id: 37,
    name: 'মো: শামছুদ্দীন',
    phone: '01724705992',
    deposits: [
      { id: 'd_1795423070863_0', date: '2026-11-22', amount: 100, note: 'দৈনিক কিস্তি' },
      { id: 'd_1795423070863_1', date: '2026-11-23', amount: 100, note: 'দৈনিক কিস্তি' },
      { id: 'd_1795423070863_2', date: '2026-11-24', amount: 100, note: 'দৈনিক কিস্তি' },
      { id: 'd_1795423070863_3', date: '2026-11-25', amount: 100, note: 'দৈনিক কিস্তি' },
      { id: 'd_1795423070863_4', date: '2026-11-26', amount: 100, note: 'দৈনিক কিস্তি' },
    ],
  },
  {
    id: 38,
    name: 'ওসমান পাটওয়ারী',
    phone: '01714490201',
    deposits: [
      { id: 'd_1795437331159_0', date: '2026-11-22', amount: 100, note: 'দৈনিক কিস্তি' },
      { id: 'd_1795437331159_1', date: '2026-11-23', amount: 100, note: 'দৈনিক কিস্তি' },
    ],
  },
  {
    id: 39,
    name: 'মিসেস সায়মা',
    phone: '01740850588',
    deposits: [
      { id: 'd_1795445202272_0', date: '2026-11-22', amount: 100, note: 'দৈনিক কিস্তি' },
      { id: 'd_1795445202272_1', date: '2026-11-23', amount: 100, note: 'দৈনিক কিস্তি' },
    ],
  },
  {
    id: 40,
    name: 'ওয়াজিহা',
    phone: '01740850588',
    deposits: [
      { id: 'd_1795445256734_0', date: '2026-11-22', amount: 100, note: 'দৈনিক কিস্তি' },
      { id: 'd_1795445256734_1', date: '2026-11-23', amount: 100, note: 'দৈনিক কিস্তি' },
    ],
  },
  {
    id: 41,
    name: 'নাসিফ',
    phone: '01740850588',
    deposits: [
      { id: 'd_1795445271312_0', date: '2026-11-22', amount: 100, note: 'দৈনিক কিস্তি' },
      { id: 'd_1795445271312_1', date: '2026-11-23', amount: 100, note: 'দৈনিক কিস্তি' },
    ],
  },
  {
    id: 42,
    name: 'দিপু',
    phone: '01346921004',
    deposits: [
      { id: 'd_1795446028347', date: '2026-11-23', amount: 100, note: 'দৈনিক কিস্তি' },
      { id: 'd_1795446079361', date: '2026-11-22', amount: 100, note: 'দৈনিক কিস্তি' },
    ],
  },
];

export function createInitialDatabase(): UnityDatabase {
  return {
    adminName: 'Shohag Hossain',
    cloudSyncUrl: '',
    updatedAtMs: 1795446224799,
    lastBackup: '২৩/১১/২০২৬, ৯:০৩:৪৪ PM',
    appConfig: getDefaultAppConfig(),
    rules: DEFAULT_RULES.map((r) => ({ ...r })),
    members: INITIAL_MEMBERS.map((m) => ({
      ...m,
      deposits: m.deposits.map((d) => ({ ...d })),
    })),
    draws: [],
  };
}

/**
 * Masks a phone number for public non-admin viewing (PII protection).
 * Example: "01765422160" -> "017••••2160"
 */
export function maskPhoneNumber(phone: string): string {
  const clean = String(phone || '').trim();
  if (clean.length <= 6) return clean ? '••••••' : '';
  return `${clean.slice(0, 3)}••••${clean.slice(-4)}`;
}

/**
 * Strict security check: prevents any member phone number (or admin phone)
 * from ever being accepted or saved as an Admin passcode/PIN.
 */
export function isPhoneCollidingWithPasscode(
  candidate: string,
  members: Member[],
  adminPhone?: string
): boolean {
  const clean = toEnDigits(String(candidate || '').trim()).replace(/[\s\-+]/g, '');
  if (!clean) return false;
  if (adminPhone) {
    const cleanAdmin = toEnDigits(adminPhone.trim()).replace(/[\s\-+]/g, '');
    if (cleanAdmin && clean === cleanAdmin) return true;
  }
  return members.some((m) => {
    const cleanPhone = toEnDigits(String(m.phone || '').trim()).replace(/[\s\-+]/g, '');
    return Boolean(cleanPhone && clean === cleanPhone);
  });
}

/**
 * Normalizes any raw database or backup payload (including wrapped `{ data: ... }` JSON
 * and object-map members/deposits from Firebase) into a clean unlimited-members UnityDatabase.
 */
export function ensureDatabaseStructure(rawInput: unknown): UnityDatabase {
  const base = createInitialDatabase();
  if (!rawInput || typeof rawInput !== 'object') return base;

  const container = rawInput as Record<string, unknown>;
  const raw = (
    container.data && typeof container.data === 'object' ? container.data : container
  ) as Partial<UnityDatabase> & { members?: Member[] | Record<string, Member> };

  let membersArr: Member[] = [];
  if (Array.isArray(raw.members)) {
    membersArr = raw.members.filter(Boolean);
  } else if (raw.members && typeof raw.members === 'object') {
    membersArr = (Object.values(raw.members) as Member[]).filter(Boolean);
  }
  if (membersArr.length === 0) return base;

  const rawLogo = raw.appConfig?.appLogoUrl;
  const safeAppLogoUrl = isSafeRasterPhotoDataUrl(rawLogo) ? rawLogo : undefined;
  const rawIcon = raw.appConfig?.appIconUrl;
  const safeAppIconUrl = isSafeAppIconDataUrl(rawIcon) ? rawIcon : undefined;
  const rawIcon192 = raw.appConfig?.appIcon192Url;
  const safeAppIcon192Url = isSafeAppIconDataUrl(rawIcon192) ? rawIcon192 : undefined;
  const rawIconMaskable = raw.appConfig?.appIconMaskableUrl;
  const safeAppIconMaskableUrl = isSafeAppIconDataUrl(rawIconMaskable) ? rawIconMaskable : undefined;

  const mergedConfig: AppConfig = {
    ...base.appConfig,
    ...(raw.appConfig || {}),
    appLogoUrl: safeAppLogoUrl,
    appIconUrl: safeAppIconUrl,
    appIcon192Url: safeAppIcon192Url,
    appIconMaskableUrl: safeAppIconMaskableUrl,
    enabledToggles: {
      ...DEFAULT_ENABLED_TOGGLES,
      ...(raw.appConfig?.enabledToggles || {}),
    },
    customToggles: Array.isArray(raw.appConfig?.customToggles) ? raw.appConfig.customToggles : [],
    pinnedNotice: raw.appConfig?.pinnedNotice ?? null,
    automatedPopups: Array.isArray(raw.appConfig?.automatedPopups)
      ? raw.appConfig.automatedPopups
      : base.appConfig.automatedPopups,
    scheduledNotifications: Array.isArray(raw.appConfig?.scheduledNotifications)
      ? raw.appConfig.scheduledNotifications
      : [],
    changelog:
      Array.isArray(raw.appConfig?.changelog) && raw.appConfig.changelog.length > 0
        ? raw.appConfig.changelog
        : base.appConfig.changelog,
  };

  const normalizedMembers: Member[] = membersArr.map((m, idx) => {
    const rawDeps = (m as unknown as { deposits?: Deposit[] | Record<string, Deposit> }).deposits;
    let depositsList: Deposit[] = [];
    if (Array.isArray(rawDeps)) {
      depositsList = rawDeps.filter(Boolean);
    } else if (rawDeps && typeof rawDeps === 'object') {
      depositsList = Object.values(rawDeps).filter(Boolean);
    }
    const numericId = Number(m.id);
    const id = Number.isFinite(numericId) && numericId > 0 ? Math.trunc(numericId) : idx + 1;
    const rawName = String(m.name || '').trim();
    const rawPhone = String(m.phone || '').trim();
    const photoUrl = sanitizeMemberPhotoUrl((m as unknown as { photoUrl?: unknown }).photoUrl);
    return {
      id,
      name: rawPhone === '01607703566' && rawName === 'সোহাগ হোসেন' ? 'এডমিন সোহাগ হোসেন' : rawName,
      phone: rawPhone,
      ...(photoUrl ? { photoUrl } : {}),
      deposits: depositsList.map((d, dIdx) => ({
        id: String(d.id || `d_${id}_${dIdx}_${Date.now()}`),
        date: String(d.date || getTodayISO()),
        amount: Number(d.amount || 0),
        note: String(d.note || 'দৈনিক কিস্তি'),
      })),
    };
  });

  const rawRules = raw.rules as RuleItem[] | Record<string, RuleItem> | undefined;
  let rulesList: RuleItem[] = base.rules;
  if (Array.isArray(rawRules) && rawRules.length > 0) {
    rulesList = rawRules;
  } else if (rawRules && typeof rawRules === 'object') {
    const vals = Object.values(rawRules).filter(Boolean);
    if (vals.length > 0) rulesList = vals;
  }

  const rawDraws = raw.draws as UnityDatabase['draws'] | Record<string, UnityDatabase['draws'][number]> | undefined;
  let drawsList: UnityDatabase['draws'] = [];
  if (Array.isArray(rawDraws)) {
    drawsList = rawDraws.filter(Boolean);
  } else if (rawDraws && typeof rawDraws === 'object') {
    drawsList = Object.values(rawDraws).filter(Boolean);
  }

  return {
    ...base,
    ...raw,
    adminName: typeof raw.adminName === 'string' && raw.adminName.trim() ? raw.adminName.trim() : base.adminName,
    cloudSyncUrl: typeof raw.cloudSyncUrl === 'string' ? raw.cloudSyncUrl : base.cloudSyncUrl,
    updatedAtMs: typeof raw.updatedAtMs === 'number' && Number.isFinite(raw.updatedAtMs) ? raw.updatedAtMs : base.updatedAtMs,
    lastBackup: typeof raw.lastBackup === 'string' && raw.lastBackup ? raw.lastBackup : base.lastBackup,
    appConfig: mergedConfig,
    rules: rulesList,
    members: normalizedMembers,
    draws: drawsList,
  };
}

// Formatting & calculation utilities
const BN_DIGITS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];

export function toBn(value: string | number): string {
  return String(value).replace(/\d/g, (d) => BN_DIGITS[Number(d)]);
}

export function toEnDigits(str: string): string {
  return String(str || '').replace(/[০-৯]/g, (d) => String(BN_DIGITS.indexOf(d)));
}

export function getTodayISO(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function offsetDateISO(baseISO: string, deltaDays: number): string {
  const [y, m, d] = baseISO.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + deltaDays);
  const ny = dt.getUTCFullYear();
  const nm = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const nd = String(dt.getUTCDate()).padStart(2, '0');
  return `${ny}-${nm}-${nd}`;
}

export function formatDateBn(iso: string): string {
  if (!iso) return '-';
  const parts = iso.split('-');
  if (parts.length !== 3) return iso;
  return `${toBn(parts[2])}/${toBn(parts[1])}/${toBn(parts[0])}`;
}

export function getDatesInRange(startISO: string, endISO: string): string[] {
  if (!startISO || !endISO || startISO > endISO) return [];
  const dates: string[] = [];
  const [sy, sm, sd] = startISO.split('-').map(Number);
  const [ey, em, ed] = endISO.split('-').map(Number);
  const current = new Date(Date.UTC(sy, sm - 1, sd));
  const end = new Date(Date.UTC(ey, em - 1, ed));
  let guard = 0;
  while (current <= end && guard < 366) {
    const cy = current.getUTCFullYear();
    const cm = String(current.getUTCMonth() + 1).padStart(2, '0');
    const cd = String(current.getUTCDate()).padStart(2, '0');
    dates.push(`${cy}-${cm}-${cd}`);
    current.setUTCDate(current.getUTCDate() + 1);
    guard++;
  }
  return dates;
}

export function getMemberTotal(member: Member): number {
  return (member.deposits || []).reduce((sum, item) => sum + Number(item.amount || 0), 0);
}

export function getMemberInstallments(member: Member): number {
  const total = getMemberTotal(member);
  const count = total / 100;
  return Number.isInteger(count) ? count : Number(count.toFixed(2));
}

export function getMemberAmountOnDate(member: Member, dateISO: string): number {
  return (member.deposits || [])
    .filter((d) => d.date === dateISO)
    .reduce((sum, d) => sum + Number(d.amount || 0), 0);
}

export function getGlobalStats(db: UnityDatabase) {
  let totalFund = 0;
  let totalDepositsCount = 0;
  db.members.forEach((m) => {
    totalFund += getMemberTotal(m);
    totalDepositsCount += (m.deposits || []).length;
  });
  const totalKistiRaw = totalFund / 100;
  const totalKisti = Number.isInteger(totalKistiRaw) ? totalKistiRaw : Number(totalKistiRaw.toFixed(2));
  const totalDrawAmount = (db.draws || []).reduce((s, d) => s + Number(d.amount || 0), 0);
  return {
    totalFund,
    totalKisti,
    totalDepositsCount,
    totalDrawCount: (db.draws || []).length,
    totalDrawAmount,
    netBalance: totalFund - totalDrawAmount,
  };
}

export const DAILY_KISTI_AMOUNT = 100;

export function daysBetweenISO(fromISO: string, toISO: string): number {
  if (!fromISO || !toISO) return 0;
  const [fy, fm, fd] = fromISO.split('-').map(Number);
  const [ty, tm, td] = toISO.split('-').map(Number);
  if (!fy || !fm || !fd || !ty || !tm || !td) return 0;
  const fromUtc = Date.UTC(fy, fm - 1, fd);
  const toUtc = Date.UTC(ty, tm - 1, td);
  return Math.round((toUtc - fromUtc) / 86400000);
}

export interface CoveredDateInfo {
  date: string;
  /** Direct cash recorded specifically on this dateISO */
  directAmount: number;
  /** Effective kisti credit applied to this day */
  creditedAmount: number;
  /** True when covered by a multi-day advance deposit from an earlier date */
  isCarriedFromAdvance: boolean;
  /** Deposit date that funded this covered day */
  sourceDate: string;
  notes: string[];
}

export interface MemberAdvanceCoverage {
  coveredDates: Map<string, CoveredDateInfo>;
  paidThroughDate: string | null;
  firstPaidDate: string | null;
  totalCoveredDays: number;
}

/**
 * Computes exact date-by-date payment coverage for a member, handling BOTH:
 * 1) Explicit per-day future-dated deposits (range deposits), AND
 * 2) Lump-sum advance payments (e.g., ৳300 on 2026-11-22 covers 22, 23, 24 at ৳100/day).
 * Overlapping deposits extend coverage sequentially so no advance payment is ever lost.
 */
export function getMemberAdvanceCoverage(member: Member): MemberAdvanceCoverage {
  const coveredDates = new Map<string, CoveredDateInfo>();
  const grouped = new Map<string, { totalAmount: number; notes: string[] }>();

  (member.deposits || []).forEach((d) => {
    const date = String(d.date || '').trim();
    const amount = Number(d.amount || 0);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || amount <= 0) return;
    const prev = grouped.get(date);
    const note = String(d.note || '').trim();
    if (prev) {
      prev.totalAmount += amount;
      if (note && !prev.notes.includes(note)) prev.notes.push(note);
    } else {
      grouped.set(date, { totalAmount: amount, notes: note ? [note] : [] });
    }
  });

  const sortedDates = Array.from(grouped.keys()).sort((a, b) => a.localeCompare(b));

  sortedDates.forEach((depositDate) => {
    const entry = grouped.get(depositDate)!;
    const daysCovered = Math.max(1, Math.floor(entry.totalAmount / DAILY_KISTI_AMOUNT));

    // If depositDate was already covered by an earlier advance, preserve the direct cash on depositDate
    // and allocate all newly paid days sequentially to the next uncovered dates.
    const existingOnDate = coveredDates.get(depositDate);
    if (existingOnDate) {
      existingOnDate.directAmount += entry.totalAmount;
      entry.notes.forEach((n) => {
        if (!existingOnDate.notes.includes(n)) existingOnDate.notes.push(n);
      });
    }

    let cursor = depositDate;
    for (let i = 0; i < daysCovered; i++) {
      let guard = 0;
      while (coveredDates.has(cursor) && guard < 1000) {
        cursor = offsetDateISO(cursor, 1);
        guard++;
      }
      const isDirectSlot = cursor === depositDate && !existingOnDate;
      coveredDates.set(cursor, {
        date: cursor,
        directAmount: isDirectSlot ? entry.totalAmount : 0,
        creditedAmount: daysCovered > 1 ? DAILY_KISTI_AMOUNT : entry.totalAmount,
        isCarriedFromAdvance: !isDirectSlot,
        sourceDate: depositDate,
        notes: entry.notes.length > 0 ? [...entry.notes] : ['দৈনিক কিস্তি'],
      });
      cursor = offsetDateISO(cursor, 1);
    }
  });

  const allCovered = Array.from(coveredDates.keys()).sort((a, b) => a.localeCompare(b));
  return {
    coveredDates,
    firstPaidDate: allCovered.length > 0 ? allCovered[0] : null,
    paidThroughDate: allCovered.length > 0 ? allCovered[allCovered.length - 1] : null,
    totalCoveredDays: allCovered.length,
  };
}

export interface DailyPaidMemberEntry {
  member: Member;
  /** Display amount: direct cash on dateISO if present, otherwise daily credited advance amount */
  amount: number;
  directAmount: number;
  creditedAmount: number;
  /** True if covered by advance (either from an earlier lump-sum or paid ahead beyond dateISO) */
  isAdvance: boolean;
  /** True specifically when covered via an earlier multi-day lump-sum deposit (no separate row on dateISO) */
  isCarriedFromAdvance: boolean;
  paidThroughDate: string;
  remainingAdvanceDays: number;
  sourceDate: string;
  notes: string[];
}

export function getDailyPaymentBreakdown(members: Member[], dateISO: string) {
  const paid: DailyPaidMemberEntry[] = [];
  const unpaid: Member[] = [];
  const lastPaidThroughMap: Record<number, string | null> = {};
  let totalCollected = 0;
  let advanceCreditAmount = 0;
  let advanceCount = 0;

  members.forEach((member) => {
    const coverage = getMemberAdvanceCoverage(member);
    lastPaidThroughMap[member.id] = coverage.paidThroughDate;
    const dayCoverage = coverage.coveredDates.get(dateISO);

    if (dayCoverage) {
      const paidThroughDate = coverage.paidThroughDate || dateISO;
      const remainingAdvanceDays =
        paidThroughDate > dateISO ? daysBetweenISO(dateISO, paidThroughDate) : 0;
      const isAdvance = dayCoverage.isCarriedFromAdvance || remainingAdvanceDays > 0;

      paid.push({
        member,
        amount: dayCoverage.directAmount > 0 ? dayCoverage.directAmount : dayCoverage.creditedAmount,
        directAmount: dayCoverage.directAmount,
        creditedAmount: dayCoverage.creditedAmount,
        isAdvance,
        isCarriedFromAdvance: dayCoverage.isCarriedFromAdvance,
        paidThroughDate,
        remainingAdvanceDays,
        sourceDate: dayCoverage.sourceDate,
        notes: dayCoverage.notes,
      });

      totalCollected += dayCoverage.directAmount;
      if (dayCoverage.isCarriedFromAdvance && dayCoverage.directAmount === 0) {
        advanceCreditAmount += dayCoverage.creditedAmount;
      }
      if (isAdvance) {
        advanceCount += 1;
      }
    } else {
      unpaid.push(member);
    }
  });

  return {
    paid,
    unpaid,
    lastPaidThroughMap,
    totalCollected,
    advanceCreditAmount,
    advanceCount,
    ratePercent: members.length > 0 ? Math.round((paid.length / members.length) * 100) : 0,
  };
}

export function getNoticeDurationMs(duration: NoticeDuration): number {
  if (duration === '1d') return 24 * 60 * 60 * 1000;
  if (duration === '1w') return 7 * 24 * 60 * 60 * 1000;
  return 30 * 24 * 60 * 60 * 1000;
}

export function getNoticeDurationLabel(duration: NoticeDuration): string {
  if (duration === '1d') return '১ দিন';
  if (duration === '1w') return '১ সপ্তাহ';
  return '১ মাস';
}

export function getTimeRemainingBn(expiresAtMs: number): string {
  const diff = expiresAtMs - Date.now();
  if (diff <= 0) return 'মেয়াদ শেষ';
  const days = Math.floor(diff / (24 * 60 * 60 * 1000));
  const hours = Math.floor((diff % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
  if (days > 0) return `আরও ${toBn(days)} দিন ${toBn(hours)} ঘণ্টা`;
  const mins = Math.max(1, Math.floor((diff % (60 * 60 * 1000)) / (60 * 1000)));
  return hours > 0 ? `আরও ${toBn(hours)} ঘণ্টা ${toBn(mins)} মিনিট` : `আরও ${toBn(mins)} মিনিট`;
}

export function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map((n) => parseInt(n, 10) || 0);
  const pb = b.split('.').map((n) => parseInt(n, 10) || 0);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const va = pa[i] || 0;
    const vb = pb[i] || 0;
    if (va > vb) return 1;
    if (va < vb) return -1;
  }
  return 0;
}

export const SCHEME_START_DATE = '2026-11-22';
export const BLOCK_FUND_DAYS = 30;
export const BLOCK_FUND_PER_MEMBER_CAP = BLOCK_FUND_DAYS * DAILY_KISTI_AMOUNT; // 3,000 BDT

export interface MemberDueAndBlockInfo {
  elapsedDays: number;
  paidDaysUpToToday: number;
  dueDays: number;
  dueAmount: number;
  advanceDays: number;
  advanceAmount: number;
  totalDeposited: number;
  blockFundAmount: number;
  availableAfterBlock: number;
  paidThroughDate: string | null;
}

/**
 * Computes auto due days/BDT (respecting advance coverage) and 1st-month block fund (first 30 days = ৳3,000/member).
 */
export function getMemberDueAndBlockFund(
  member: Member,
  referenceDateISO: string = getTodayISO()
): MemberDueAndBlockInfo {
  const coverage = getMemberAdvanceCoverage(member);
  const totalDeposited = getMemberTotal(member);
  const effectiveEnd = referenceDateISO < SCHEME_START_DATE ? SCHEME_START_DATE : referenceDateISO;
  const elapsedDays = Math.max(1, daysBetweenISO(SCHEME_START_DATE, effectiveEnd) + 1);

  let paidDaysUpToToday = 0;
  let advanceDays = 0;

  coverage.coveredDates.forEach((_info, dateISO) => {
    if (dateISO >= SCHEME_START_DATE && dateISO <= effectiveEnd) {
      paidDaysUpToToday += 1;
    } else if (dateISO > effectiveEnd) {
      advanceDays += 1;
    }
  });

  const dueDays = Math.max(0, elapsedDays - paidDaysUpToToday);
  const dueAmount = dueDays * DAILY_KISTI_AMOUNT;
  const advanceAmount = advanceDays * DAILY_KISTI_AMOUNT;
  const blockFundAmount = Math.min(totalDeposited, BLOCK_FUND_PER_MEMBER_CAP);
  const availableAfterBlock = Math.max(0, totalDeposited - blockFundAmount);

  return {
    elapsedDays,
    paidDaysUpToToday,
    dueDays,
    dueAmount,
    advanceDays,
    advanceAmount,
    totalDeposited,
    blockFundAmount,
    availableAfterBlock,
    paidThroughDate: coverage.paidThroughDate,
  };
}

export function getGlobalDueAndBlockFund(
  db: UnityDatabase,
  referenceDateISO: string = getTodayISO()
) {
  let totalDueAmount = 0;
  let totalDueDays = 0;
  let membersWithDueCount = 0;
  let totalBlockFund = 0;
  let totalAdvanceAmount = 0;
  const perMember: Record<number, MemberDueAndBlockInfo> = {};

  db.members.forEach((m) => {
    const info = getMemberDueAndBlockFund(m, referenceDateISO);
    perMember[m.id] = info;
    totalDueAmount += info.dueAmount;
    totalDueDays += info.dueDays;
    if (info.dueDays > 0) membersWithDueCount += 1;
    totalBlockFund += info.blockFundAmount;
    totalAdvanceAmount += info.advanceAmount;
  });

  const stats = getGlobalStats(db);
  const targetBlockFund = db.members.length * BLOCK_FUND_PER_MEMBER_CAP;
  const availableDrawFund = Math.max(0, stats.totalFund - totalBlockFund - stats.totalDrawAmount);

  return {
    totalDueAmount,
    totalDueDays,
    membersWithDueCount,
    totalBlockFund,
    targetBlockFund,
    availableDrawFund,
    totalAdvanceAmount,
    perMember,
  };
}

export interface PeriodReportRow {
  memberId: number;
  memberName: string;
  phone: string;
  periodDepositsCount: number;
  periodAmount: number;
  periodKisti: number;
  allTimeAmount: number;
  dueDays: number;
  dueAmount: number;
  blockFundAmount: number;
  drawReceivedInPeriod: number;
}

export function getPeriodFinancialReport(
  db: UnityDatabase,
  periodPrefix: string, // 'YYYY-MM' for month, 'YYYY' for year, or 'ALL'
  referenceDateISO: string = getTodayISO()
) {
  const isAll = periodPrefix === 'ALL';
  let totalCollected = 0;
  let totalDepositsCount = 0;
  let totalDrawsInPeriod = 0;
  let activeContributors = 0;

  const rows: PeriodReportRow[] = db.members.map((m) => {
    const periodDeposits = (m.deposits || []).filter((d) =>
      isAll ? true : String(d.date || '').startsWith(periodPrefix)
    );
    const periodAmount = periodDeposits.reduce((s, d) => s + Number(d.amount || 0), 0);
    const periodDraws = (db.draws || []).filter(
      (dr) => dr.memberId === m.id && (isAll ? true : String(dr.date || '').startsWith(periodPrefix))
    );
    const drawReceivedInPeriod = periodDraws.reduce((s, dr) => s + Number(dr.amount || 0), 0);
    const dueInfo = getMemberDueAndBlockFund(m, referenceDateISO);

    totalCollected += periodAmount;
    totalDepositsCount += periodDeposits.length;
    totalDrawsInPeriod += drawReceivedInPeriod;
    if (periodAmount > 0) activeContributors += 1;

    const rawKisti = periodAmount / DAILY_KISTI_AMOUNT;
    return {
      memberId: m.id,
      memberName: m.name,
      phone: m.phone,
      periodDepositsCount: periodDeposits.length,
      periodAmount,
      periodKisti: Number.isInteger(rawKisti) ? rawKisti : Number(rawKisti.toFixed(2)),
      allTimeAmount: dueInfo.totalDeposited,
      dueDays: dueInfo.dueDays,
      dueAmount: dueInfo.dueAmount,
      blockFundAmount: dueInfo.blockFundAmount,
      drawReceivedInPeriod,
    };
  });

  const periodDrawsList = (db.draws || []).filter((dr) =>
    isAll ? true : String(dr.date || '').startsWith(periodPrefix)
  );

  return {
    rows,
    totalCollected,
    totalDepositsCount,
    totalKisti: Number((totalCollected / DAILY_KISTI_AMOUNT).toFixed(2)),
    totalDrawsInPeriod,
    netPeriodBalance: totalCollected - totalDrawsInPeriod,
    activeContributors,
    periodDrawsList,
  };
}

/**
 * Escapes CSV values safely and neutralizes Excel/Sheets formula injection (=, +, -, @, tab, CR).
 */
export function sanitizeCsvCell(value: string | number | null | undefined): string {
  const str = String(value ?? '');
  const trimmedLeading = str.replace(/^[\s]+/, '');
  const safe = /^[=+\-@\t\r]/.test(trimmedLeading) ? `'${str}` : str;
  const escaped = safe.replace(/"/g, '""');
  return `"${escaped}"`;
}

