import type { UnityDatabase } from '../types/unity';

/**
 * Generates a 100% feature-complete, crash-proof, self-contained single-file HTML
 * version of BARAKAH MULTICARE HOSPITAL UNITY with the current live database embedded.
 * Safe in file://, content://, Android WebViews, iframes, and desktop browsers
 * (all localStorage and history.pushState calls are guarded against SecurityError).
 */
export function generateStandaloneHtml(db: UnityDatabase, activeAdminPin?: string): string {
  const embeddedDb = {
    ...db,
    adminPin: activeAdminPin || db.adminPin || '@Shohag007',
  };
  const safeJson = JSON.stringify(embeddedDb, null, 2).replace(/<\/script/gi, '<\\/script');

  return `<!DOCTYPE html>
<html lang="bn">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
  <meta name="apple-mobile-web-app-title" content="BARAKAH UNITY" />
  <meta name="mobile-web-app-capable" content="yes" />
  <meta name="theme-color" content="${db.appConfig.themeColor || '#0f766e'}" />
  <title>BARAKAH MULTICARE HOSPITAL UNITY</title>
  <style>
    :root {
      --primary: ${db.appConfig.themeColor || '#0f766e'};
      --primary-soft: #f0fdfa;
      --bg: #f8fafc;
      --card: #ffffff;
      --text: #0f172a;
      --muted: #64748b;
      --border: #e2e8f0;
      --danger: #dc2626;
      --danger-soft: #fef2f2;
      --success: #15803d;
      --success-soft: #f0fdf4;
      --warning: #b45309;
      --warning-soft: #fffbeb;
      --pink: #be185d;
      --pink-soft: #fdf2f8;
    }
    body.dark {
      --primary-soft: #134e4a;
      --bg: #0b1120;
      --card: #131c31;
      --text: #f1f5f9;
      --muted: #94a3b8;
      --border: #24324a;
      --danger-soft: #3b1116;
      --success-soft: #0e2e1d;
      --warning-soft: #38250a;
      --pink-soft: #3b0d24;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; -webkit-tap-highlight-color: transparent; }
    body {
      font-family: 'Noto Sans Bengali', 'Hind Siliguri', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: var(--bg);
      color: var(--text);
      padding-bottom: calc(82px + env(safe-area-inset-bottom));
      line-height: 1.5;
    }
    .mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-variant-numeric: tabular-nums; }
    .container { max-width: 960px; margin: 0 auto; padding: 14px; }

    /* Sticky Topbar + Upgraded Back Button */
    .topbar {
      position: sticky; top: 0; z-index: 40;
      background: var(--card); border-bottom: 1px solid var(--border);
      padding: calc(8px + env(safe-area-inset-top)) 14px 8px;
      box-shadow: 0 2px 8px rgba(15, 23, 42, 0.05);
    }
    .topbar-inner {
      max-width: 960px; margin: 0 auto; min-height: 44px;
      display: flex; align-items: center; justify-content: space-between; gap: 10px;
    }
    .brand { font-size: 16px; font-weight: 800; color: var(--primary); background: none; border: none; cursor: pointer; white-space: nowrap; }
    .back-group { display: flex; align-items: center; gap: 6px; min-width: 0; flex: 1; }
    .back-btn {
      display: inline-flex; align-items: center; gap: 5px; min-height: 40px;
      padding: 6px 13px; border-radius: 11px; border: 1.5px solid var(--primary);
      background: var(--primary-soft); color: var(--primary); font-size: 13px; font-weight: 800;
      cursor: pointer; white-space: nowrap; flex-shrink: 0;
    }
    .back-btn.home-mini {
      border-color: var(--border); background: var(--bg); color: var(--text); padding: 6px 10px;
    }
    .back-btn:active { transform: scale(0.95); }
    .page-title { font-size: 14.5px; font-weight: 800; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

    /* Hero & Ticker */
    .hero {
      background: linear-gradient(135deg, var(--primary), #0d9488);
      color: #fff; border-radius: 16px 16px 0 0; padding: 18px;
      display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 10px;
    }
    .hero h1 { font-size: 18.5px; font-weight: 800; line-height: 1.3; }
    .hero p { font-size: 12.5px; opacity: 0.92; margin-top: 3px; }
    .hero-actions { display: flex; gap: 6px; }
    .hero-btn {
      min-height: 38px; padding: 6px 12px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.28);
      background: rgba(255,255,255,0.16); color: #fff; font-size: 12px; font-weight: 700; cursor: pointer;
    }
    .ticker {
      background: #0f172a; color: #fff; border-radius: 0 0 16px 16px;
      padding: 7px 0; overflow: hidden; display: flex; align-items: center; margin-bottom: 14px;
    }
    .ticker.bkash { background: #be185d; border-radius: 12px; margin-bottom: 12px; }
    .ticker-lbl { background: var(--primary); color: #fff; font-size: 11px; font-weight: 800; padding: 3px 10px; flex-shrink: 0; z-index: 2; }
    .ticker.bkash .ticker-lbl { background: rgba(0,0,0,0.25); color: #fde68a; }
    .ticker-box { flex: 1; overflow: hidden; white-space: nowrap; }
    .ticker-track { display: inline-block; padding-left: 100%; font-size: 13px; font-weight: 600; animation: marq 24s linear infinite; }
    @keyframes marq { 0% { transform: translateX(0); } 100% { transform: translateX(-100%); } }

    /* Pinned Notice */
    .pinned-notice {
      background: var(--warning-soft); border: 1px solid #f59e0b; color: var(--warning);
      border-radius: 14px; padding: 13px 14px; margin-bottom: 14px;
    }
    body.dark .pinned-notice { color: #fde68a; border-color: #92400e; }
    .pinned-meta { font-size: 11.5px; font-weight: 700; display: flex; flex-wrap: wrap; gap: 6px; align-items: center; justify-content: space-between; }
    .pinned-title { font-size: 14.5px; font-weight: 800; margin-top: 4px; }
    .pinned-body { font-size: 13px; margin-top: 3px; white-space: pre-line; }

    /* Layout Grid */
    .home-split { display: grid; grid-template-columns: 1fr; gap: 16px; }
    @media (min-width: 820px) { .home-split { grid-template-columns: 5fr 7fr; align-items: start; } }
    .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .grid3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
    .tile {
      background: var(--card); border: 1px solid var(--border); border-radius: 14px;
      padding: 13px; text-align: left; cursor: pointer; display: flex;
      flex-direction: column; justify-content: space-between; min-height: 88px; color: var(--text);
    }
    .tile:active { transform: scale(0.98); }
    .tile.full { grid-column: 1 / -1; min-height: 64px; flex-direction: row; align-items: center; }
    .tile-lbl { font-size: 12px; color: var(--muted); font-weight: 600; }
    .tile-val { font-size: 17px; font-weight: 800; color: var(--primary); margin-top: 5px; }

    /* Cards & Rows */
    .card { background: var(--card); border: 1px solid var(--border); border-radius: 16px; padding: 15px; margin-bottom: 14px; }
    .card-hd { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 10px; flex-wrap: wrap; }
    .card-title { font-size: 15.5px; font-weight: 800; }
    .row {
      display: flex; align-items: center; justify-content: space-between; gap: 10px;
      padding: 11px 4px; border-bottom: 1px solid var(--border);
    }
    .row:last-child { border-bottom: none; }
    .row.clickable { cursor: pointer; }
    .serial {
      width: 34px; height: 34px; border-radius: 10px; background: var(--primary-soft);
      color: var(--primary); font-weight: 800; font-size: 13px;
      display: flex; align-items: center; justify-content: center; flex-shrink: 0;
    }
    .serial.red { background: var(--danger-soft); color: var(--danger); }
    .serial.green { background: var(--success-soft); color: var(--success); }

    /* Buttons & Inputs */
    .btn {
      min-height: 42px; padding: 9px 14px; border-radius: 10px; border: none;
      font-size: 13px; font-weight: 700; cursor: pointer; display: inline-flex;
      align-items: center; justify-content: center; gap: 6px; text-decoration: none;
    }
    .btn:active { transform: scale(0.98); }
    .btn-sm { min-height: 34px; padding: 5px 10px; font-size: 12px; border-radius: 8px; }
    .btn-primary { background: var(--primary); color: #fff; }
    .btn-dark { background: #0f172a; color: #fff; }
    .btn-pink { background: var(--pink); color: #fff; }
    .btn-warn { background: #d97706; color: #fff; }
    .btn-outline { background: var(--card); color: var(--text); border: 1px solid var(--border); }
    .btn-danger { background: var(--danger-soft); color: var(--danger); border: 1px solid rgba(220,38,38,0.25); }
    .btn-full { width: 100%; }
    .input, select.input, textarea.input {
      width: 100%; min-height: 42px; padding: 9px 12px; border-radius: 10px;
      border: 1px solid var(--border); background: var(--bg); color: var(--text);
      font-family: inherit; font-size: 14px; margin-bottom: 10px; outline: none;
    }
    .input:focus { border-color: var(--primary); }
    .code-box {
      width: 100%; min-height: 220px; padding: 12px; border-radius: 10px;
      border: 1px solid #334155; background: #0f172a; color: #e2e8f0;
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 11.5px; line-height: 1.45;
    }
    label.flbl { display: block; font-size: 12px; font-weight: 700; color: var(--muted); margin-bottom: 4px; }

    /* Tabs & Progress */
    .tabs { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 12px; }
    .tab {
      min-height: 36px; padding: 6px 12px; border-radius: 9px; border: 1px solid var(--border);
      background: var(--card); color: var(--muted); font-size: 12px; font-weight: 700; cursor: pointer;
    }
    .tab.active { background: #0f172a; color: #fff; border-color: #0f172a; }
    body.dark .tab.active { background: var(--primary); border-color: var(--primary); }
    .progress-track { height: 8px; background: var(--bg); border-radius: 99px; overflow: hidden; border: 1px solid var(--border); }
    .progress-fill { height: 100%; background: var(--primary); border-radius: 99px; }

    /* Tables */
    .table-wrap { overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; font-size: 13.5px; }
    th, td { padding: 10px 8px; border-bottom: 1px solid var(--border); text-align: left; }
    th { background: var(--bg); color: var(--muted); font-size: 12px; font-weight: 700; }
    .right { text-align: right; }
    .tfoot-row td { background: var(--primary-soft); color: var(--primary); font-weight: 800; border-top: 2px solid var(--primary); }

    /* Summary Banner */
    .summary-box {
      background: var(--primary); color: #fff; border-radius: 14px; padding: 15px;
      display: flex; justify-content: space-between; align-items: center; gap: 10px; margin-bottom: 12px;
    }
    .bkash-card {
      background: var(--pink-soft); border: 1px solid #f472b6; border-radius: 16px;
      padding: 20px 15px; text-align: center;
    }
    .bkash-num {
      display: inline-block; margin: 12px 0; padding: 10px 22px; border-radius: 12px;
      border: 2px dashed #e2136e; background: var(--card); color: var(--pink);
      font-size: 22px; font-weight: 900; letter-spacing: 1px; cursor: pointer;
    }

    /* Bottom Navigation */
    .bottom-nav {
      position: fixed; bottom: 0; left: 0; right: 0; z-index: 40;
      background: var(--card); border-top: 1px solid var(--border);
      padding-bottom: env(safe-area-inset-bottom);
      display: grid; grid-template-columns: repeat(4, 1fr);
    }
    @media (min-width: 820px) { .bottom-nav { display: none; } body { padding-bottom: 24px; } }
    .bnav-btn {
      min-height: 54px; border: none; background: transparent; color: var(--muted);
      font-size: 11px; font-weight: 700; cursor: pointer; display: flex;
      flex-direction: column; align-items: center; justify-content: center; gap: 2px;
    }
    .bnav-btn.active { color: var(--primary); }

    /* Modals & Toast */
    .modal-bg {
      position: fixed; inset: 0; background: rgba(15,23,42,0.62);
      display: none; align-items: center; justify-content: center; padding: 16px; z-index: 120;
    }
    .modal {
      background: var(--card); color: var(--text); width: 100%; max-width: 410px;
      border-radius: 16px; padding: 18px; border: 1px solid var(--border);
    }
    .toast {
      position: fixed; top: 64px; left: 50%; transform: translateX(-50%);
      background: #0f172a; color: #fff; padding: 10px 16px; border-radius: 10px;
      font-size: 12.5px; font-weight: 700; display: none; z-index: 160; max-width: 90%; text-align: center;
    }
    .print-only { display: none; }
    @media print {
      .no-print, .topbar, .bottom-nav { display: none !important; }
      .print-only { display: block !important; }
      body { background: #fff !important; color: #000 !important; padding: 0 !important; }
      .card, .summary-box { border: 1px solid #cbd5e1 !important; background: #fff !important; color: #000 !important; }
      .tfoot-row td { background: #f1f5f9 !important; color: #000 !important; }
    }
  </style>
</head>
<body>
  <script id="barakah-db" type="application/json">
${safeJson}
  </script>

  <div id="app"></div>

  <!-- Admin PIN Modal -->
  <div id="pin-modal" class="modal-bg">
    <div class="modal">
      <h3 style="font-size:17px;font-weight:800;margin-bottom:6px;">এডমিন ভেরিফিকেশন</h3>
      <p style="font-size:12.5px;color:var(--muted);margin-bottom:12px;">পরিবর্তন করার জন্য এডমিন পিন লিখুন:</p>
      <input id="pin-input" type="password" class="input" placeholder="এডমিন পিন" onkeydown="if(event.key==='Enter')verifyPin()" />
      <div id="pin-err" style="color:var(--danger);font-size:12px;font-weight:700;margin-bottom:8px;display:none;"></div>
      <div class="grid2">
        <button class="btn btn-outline" onclick="closePin()">বাতিল</button>
        <button class="btn btn-primary" onclick="verifyPin()">প্রবেশ করুন</button>
      </div>
    </div>
  </div>

  <!-- Automated Popup Modal -->
  <div id="popup-modal" class="modal-bg">
    <div class="modal">
      <p style="font-size:11px;color:var(--muted);font-weight:700;">অটোমেটেড বার্তা · BARAKAH UNITY</p>
      <h3 id="pop-title" style="font-size:16px;font-weight:800;margin:4px 0 8px;"></h3>
      <p id="pop-msg" style="font-size:13.5px;line-height:1.55;white-space:pre-line;margin-bottom:12px;"></p>
      <div id="pop-stat" style="display:none;padding:9px 11px;border-radius:10px;background:var(--bg);border:1px solid var(--border);font-size:12px;font-weight:700;margin-bottom:12px;"></div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        <button id="pop-act-btn" class="btn btn-primary" style="flex:1;display:none;"></button>
        <button class="btn btn-outline" style="flex:1;" onclick="dismissActivePopup(true)">বুঝেছি (আজ বন্ধ)</button>
      </div>
    </div>
  </div>

  <!-- Confirm Modal -->
  <div id="confirm-modal" class="modal-bg">
    <div class="modal">
      <h3 style="font-size:16px;font-weight:800;margin-bottom:6px;">নিশ্চিত করুন</h3>
      <p id="confirm-msg" style="font-size:13.5px;margin-bottom:14px;"></p>
      <div class="grid2">
        <button class="btn btn-outline" onclick="resolveConfirm(false)">না</button>
        <button class="btn btn-danger" onclick="resolveConfirm(true)">হ্যাঁ, নিশ্চিত</button>
      </div>
    </div>
  </div>

  <!-- Home Exit Confirmation Modal -->
  <div id="exit-modal" class="modal-bg" onclick="if(event.target===this)cancelExitModal()">
    <div class="modal">
      <h3 style="font-size:16px;font-weight:800;margin-bottom:6px;">অ্যাপ থেকে বের হতে চান?</h3>
      <p style="font-size:13.5px;margin-bottom:8px;">আপনি কি নিশ্চিতভাবে BARAKAH MULTICARE HOSPITAL UNITY অ্যাপ থেকে বের হতে চান?</p>
      <div style="font-size:11.5px;color:var(--muted);padding:8px 10px;border-radius:10px;background:var(--bg);margin-bottom:14px;line-height:1.5;">
        <div>১. ডিভাইসের ব্যাক বাটন ডাবল ক্লিক করলে সরাসরি বের হতে পারবেন।</div>
        <div>২. অথবা নিচের &ldquo;হ্যাঁ, বের হোন&rdquo; (Yes) বাটনে ক্লিক করে বের হোন।</div>
      </div>
      <div class="grid2">
        <button class="btn btn-outline" onclick="cancelExitModal()">থাকুন</button>
        <button class="btn btn-danger" onclick="confirmAppExit()">হ্যাঁ, বের হোন (Yes)</button>
      </div>
    </div>
  </div>

  <!-- Clean App Exited Screen Fallback -->
  <div id="exited-screen" style="display:none;position:fixed;inset:0;z-index:180;background:var(--bg);align-items:center;justify-content:center;padding:20px;">
    <div class="card" style="max-width:360px;width:100%;text-align:center;padding:24px;">
      <div style="font-size:32px;margin-bottom:8px;">✓</div>
      <h3 style="font-size:18px;font-weight:800;margin-bottom:4px;">অ্যাপ থেকে বের হয়েছেন</h3>
      <div style="font-size:11.5px;font-weight:700;color:var(--primary);margin-bottom:10px;">BARAKAH MULTICARE HOSPITAL UNITY</div>
      <p style="font-size:13px;color:var(--muted);margin-bottom:14px;line-height:1.5;">আপনার সকল হিসাব ও তথ্য নিরাপদে সংরক্ষিত আছে। এখন চাইলে ট্যাবটি বন্ধ করুন অথবা ডিভাইসের ব্যাক বাটন চাপুন।</p>
      <button class="btn btn-primary btn-full" onclick="reenterApp()">অ্যাপে পুনরায় প্রবেশ করুন</button>
    </div>
  </div>

  <div id="toast" class="toast"></div>

  <script>
    const STORAGE_KEY = 'barakah_standalone_db_v3';
    const POPUP_DISMISS_KEY = 'barakah_standalone_popup_dismiss_v1';
    const INIT_SHELL = '<!DOCTYPE html>\\n' + document.documentElement.outerHTML;

    function safeGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
    function safeSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
    function safePushHistory(state) { try { history.pushState(state, ''); return true; } catch (e) { return false; } }
    function safeReplaceHistory(state) { try { history.replaceState(state, ''); return true; } catch (e) { return false; } }

    const DEFAULT_RULES_SEED = [
      { id: 'r_1', title: 'সময়মতো ডিপোজিট', description: 'নির্ধারিত সময়ের মধ্যেই ডিপোজিট পরিশোধ করতে হবে।' },
      { id: 'r_2', title: 'দিনে দিনেই পরিশোধ', description: 'দৈনিক পেমেন্ট সংশ্লিষ্ট দিনেই রাত ৮টার মধ্যে বাধ্যতামূলকভাবে করতে হবে।' },
      { id: 'r_3', title: 'অগ্রিম থাকলে ডিউ নয়', description: 'অগ্রিম পেমেন্টের সুযোগ থাকলে কোনো ডিউ রাখা যাবে না।' },
      { id: 'r_4', title: 'প্রথম মাস ব্লক ফান্ড', description: 'প্রথম একমাসের সব ডিপোজিট ব্লক ফান্ডে জমা থাকবে।' },
      { id: 'r_5', title: 'সকলের সম্মতিতে ড্র আপোষ', description: 'সবার অনুমতি ছাড়া ড্র আপোষ বা পরিবর্তন করা যাবে না।' },
      { id: 'r_6', title: 'বিকাশ খরচ বাধ্যতামূলক', description: 'বিকাশ পেমেন্টের নির্ধারিত খরচ ব্যবহারকারীকেই দিতে হবে।' },
      { id: 'r_7', title: 'প্রমাণ সংরক্ষণ', description: 'লেনদেনের ট্রানজেকশন আইডি বা প্রমাণ সংরক্ষণ করতে হবে।' },
      { id: 'r_8', title: 'নিয়ম ভঙ্গের শাস্তি', description: 'নিয়ম না মানলে অ্যাকাউন্ট স্থগিত বা বাতিল হতে পারে।' },
      { id: 'r_9', title: 'স্বচ্ছতা ও পাবলিক রেকর্ড', description: 'স্বচ্ছতা নিশ্চিত করতে সব লেনদেন পাবলিকলি রেকর্ড থাকবে।' },
      { id: 'r_10', title: 'সাপোর্ট সিস্টেম', description: 'যেকোনো সমস্যা সমাধানের জন্য ২৪/৭ লাইভ সাপোর্ট সুবিধা থাকবে।' },
      { id: 'r_11', title: 'কর্তৃপক্ষের চূড়ান্ত সিদ্ধান্ত', description: 'অসংগতি থাকলে কর্তৃপক্ষ চূড়ান্ত সিদ্ধান্ত গ্রহণের ক্ষমতা রাখবে।' },
      { id: 'r_12', title: 'আপডেট নীতি', description: 'নতুন শর্তাবলি প্রয়োজনে পরিবর্তনযোগ্য হবে।' },
      { id: 'r_13', title: 'গোপনীয়তা নীতি', description: 'ব্যবহারকারীর ব্যক্তিগত তথ্যের নিরাপত্তা সর্বদাই সংরক্ষিত থাকবে।' }
    ];

    const TOGGLE_META = [
      { key: 'kisti', label: 'মোট প্রদেয় কিস্তি' },
      { key: 'draws', label: 'ড্র পাওয়া ব্যক্তি' },
      { key: 'fund', label: 'টোটাল ফান্ড' },
      { key: 'dailyPayments', label: 'দৈনিক পেমেন্ট তালিকা' },
      { key: 'rules', label: 'রুলস & রেগুলেশন' },
      { key: 'payment', label: 'পেমেন্ট মাধ্যম' },
      { key: 'addMember', label: 'নতুন সদস্য এড করা' },
      { key: 'updates', label: 'অ্যাপ আপডেট ও ব্যাকআপ' }
    ];

    function normalizeDb(raw) {
      const seed = JSON.parse(document.getElementById('barakah-db').textContent);
      const out = Object.assign({}, seed, raw || {});
      out.appConfig = Object.assign({}, seed.appConfig, (raw && raw.appConfig) || {});
      out.appConfig.enabledToggles = Object.assign({}, seed.appConfig.enabledToggles, out.appConfig.enabledToggles || {});
      if (!Array.isArray(out.appConfig.customToggles)) out.appConfig.customToggles = [];
      if (!Array.isArray(out.appConfig.automatedPopups)) out.appConfig.automatedPopups = seed.appConfig.automatedPopups || [];
      if (!Array.isArray(out.appConfig.changelog)) out.appConfig.changelog = seed.appConfig.changelog || [];
      if (!Array.isArray(out.rules) || !out.rules.length) out.rules = DEFAULT_RULES_SEED.map(r => Object.assign({}, r));
      if (!Array.isArray(out.members)) out.members = seed.members;
      if (!Array.isArray(out.draws)) out.draws = [];
      return out;
    }

    let db = (() => {
      const seed = JSON.parse(document.getElementById('barakah-db').textContent);
      try {
        const saved = safeGet(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && Array.isArray(parsed.members)) {
            if (Number(seed.updatedAtMs || 0) > Number(parsed.updatedAtMs || 0)) {
              safeSet(STORAGE_KEY, JSON.stringify(seed));
              return normalizeDb(seed);
            }
            return normalizeDb(parsed);
          }
        }
      } catch (e) {}
      safeSet(STORAGE_KEY, JSON.stringify(seed));
      return normalizeDb(seed);
    })();

    let stack = [{ page: 'home' }];
    let isAdmin = false;
    let pendingRoute = null;
    let adminTab = 'toggles';
    let searchQ = '';
    let rulesSearchQ = '';
    let dailyDate = getTodayISO();
    let dailyTab = 'unpaid';
    let dailySearchQ = '';
    let payMethod = 'bkash';
    let depMode = 'single';
    let editingRuleId = null;
    let editingMemberId = null;
    let confirmFn = null;
    let currentPopupObj = null;
    let shownPopups = new Set();

    function bn(n) { return String(n).replace(/\\d/g, d => '০১২৩৪৫৬৭৮৯'[d]); }
    function toEn(s) { return String(s || '').replace(/[০-৯]/g, d => '০১২৩৪৫৬৭৮৯'.indexOf(d)); }
    function esc(s) { return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
    function getTodayISO() {
      const d = new Date();
      return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
    }
    function offsetDate(iso, delta) {
      const p = iso.split('-').map(Number);
      const dt = new Date(Date.UTC(p[0], p[1]-1, p[2] + delta));
      return dt.getUTCFullYear() + '-' + String(dt.getUTCMonth()+1).padStart(2,'0') + '-' + String(dt.getUTCDate()).padStart(2,'0');
    }
    function fmtDate(iso) {
      if (!iso) return '-';
      const p = iso.split('-');
      return p.length === 3 ? bn(p[2]) + '/' + bn(p[1]) + '/' + bn(p[0]) : iso;
    }
    function getRangeDates(s, e) {
      if (!s || !e || s > e) return [];
      const res = [], sp = s.split('-').map(Number), ep = e.split('-').map(Number);
      const c = new Date(Date.UTC(sp[0], sp[1]-1, sp[2])), end = new Date(Date.UTC(ep[0], ep[1]-1, ep[2]));
      let g = 0;
      while (c <= end && g < 366) {
        res.push(c.getUTCFullYear() + '-' + String(c.getUTCMonth()+1).padStart(2,'0') + '-' + String(c.getUTCDate()).padStart(2,'0'));
        c.setUTCDate(c.getUTCDate()+1); g++;
      }
      return res;
    }
    function totalOf(m) { return (m.deposits || []).reduce((a, b) => a + Number(b.amount || 0), 0); }
    function kistiOf(m) { const k = totalOf(m)/100; return Number.isInteger(k) ? k : Number(k.toFixed(2)); }
    function getMemberCoverage(m) {
      const covered = new Map();
      const grouped = new Map();
      (m.deposits || []).forEach(d => {
        const dt = String(d.date || '').trim();
        const amt = Number(d.amount || 0);
        if (!/^\\d{4}-\\d{2}-\\d{2}$/.test(dt) || amt <= 0) return;
        const prev = grouped.get(dt);
        if (prev) prev.total += amt; else grouped.set(dt, { total: amt });
      });
      Array.from(grouped.keys()).sort().forEach(depDate => {
        const total = grouped.get(depDate).total;
        const days = Math.max(1, Math.floor(total / 100));
        const existingOnDate = covered.get(depDate);
        if (existingOnDate) existingOnDate.directAmount += total;
        let cursor = depDate;
        for (let i = 0; i < days; i++) {
          let guard = 0;
          while (covered.has(cursor) && guard < 1000) { cursor = offsetDate(cursor, 1); guard++; }
          const isDirect = cursor === depDate && !existingOnDate;
          covered.set(cursor, {
            directAmount: isDirect ? total : 0,
            creditedAmount: days > 1 ? 100 : total,
            isCarried: !isDirect,
            sourceDate: depDate
          });
          cursor = offsetDate(cursor, 1);
        }
      });
      const keys = Array.from(covered.keys()).sort();
      return { covered, paidThrough: keys.length ? keys[keys.length - 1] : null };
    }
    function getDailyBreakdown(dateISO) {
      const paid = [], unpaid = [];
      let totalCollected = 0;
      db.members.forEach(m => {
        const cov = getMemberCoverage(m);
        const day = cov.covered.get(dateISO);
        if (day) {
          const paidThrough = cov.paidThrough || dateISO;
          const isAdv = day.isCarried || paidThrough > dateISO;
          paid.push({ m, amt: day.directAmount > 0 ? day.directAmount : day.creditedAmount, isAdv, paidThrough, sourceDate: day.sourceDate, isCarried: day.isCarried });
          totalCollected += day.directAmount;
        } else {
          unpaid.push({ m, lastPaid: cov.paidThrough });
        }
      });
      return { paid, unpaid, totalCollected };
    }
    function globalStats() {
      let fund = 0, entries = 0;
      db.members.forEach(m => { fund += totalOf(m); entries += (m.deposits||[]).length; });
      const k = fund / 100;
      const drawAmt = (db.draws || []).reduce((s, d) => s + Number(d.amount || 0), 0);
      return { fund, kisti: Number.isInteger(k) ? k : Number(k.toFixed(2)), entries, drawCount: (db.draws||[]).length, drawAmt, net: fund - drawAmt };
    }
    function durLabel(d) { return d === '1d' ? '১ দিন' : d === '1w' ? '১ সপ্তাহ' : '১ মাস'; }
    function durMs(d) { return d === '1d' ? 86400000 : d === '1w' ? 604800000 : 2592000000; }
    function remainBn(exp) {
      const diff = exp - Date.now();
      if (diff <= 0) return 'মেয়াদ শেষ';
      const days = Math.floor(diff / 86400000);
      const hrs = Math.floor((diff % 86400000) / 3600000);
      if (days > 0) return 'আরও ' + bn(days) + ' দিন ' + bn(hrs) + ' ঘণ্টা';
      return 'আরও ' + bn(Math.max(1, hrs)) + ' ঘণ্টা';
    }
    function toast(msg) {
      const el = document.getElementById('toast');
      if (!el) return;
      el.textContent = msg; el.style.display = 'block';
      clearTimeout(window._toastT);
      window._toastT = setTimeout(() => { el.style.display = 'none'; }, 2700);
    }
    function copyText(txt, msg) {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(txt).then(() => toast(msg)).catch(() => fallbackCopy(txt, msg));
      } else fallbackCopy(txt, msg);
    }
    function fallbackCopy(txt, msg) {
      const ta = document.createElement('textarea'); ta.value = txt; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); toast(msg); } catch (e) { toast('কপি করা যায়নি'); }
      ta.remove();
    }
    function askConfirm(msg, fn) {
      confirmFn = fn;
      document.getElementById('confirm-msg').textContent = msg;
      document.getElementById('confirm-modal').style.display = 'flex';
    }
    function resolveConfirm(ok) {
      document.getElementById('confirm-modal').style.display = 'none';
      const fn = confirmFn; confirmFn = null;
      if (ok && fn) fn();
    }
    function save(msg) {
      db.updatedAtMs = Date.now();
      db.lastBackup = new Date().toLocaleString('bn-BD');
      safeSet(STORAGE_KEY, JSON.stringify(db));
      if (msg) toast(msg);
      render();
    }
    function cur() { return stack[stack.length - 1] || { page: 'home' }; }
    function routeLabel(r) {
      if (!r || r.page === 'home') return 'হোম';
      const map = { kisti: 'মোট কিস্তি', draws: 'ড্র তালিকা', fund: 'টোটাল ফান্ড', dailyPayments: 'দৈনিক তালিকা', rules: 'নিয়মাবলি', payment: 'পেমেন্ট', addMember: 'নতুন সদস্য', updates: 'অ্যাপ আপডেট', admin: 'এডমিন প্যানেল' };
      if (r.page === 'member') { const m = db.members.find(x => x.id === r.id); return m ? bn(m.id) + '. ' + m.name : 'সদস্য'; }
      if (r.page === 'custom') { const ct = (db.appConfig.customToggles||[]).find(x => x.id === r.id); return ct ? ct.title : 'তথ্য'; }
      return map[r.page] || 'হোম';
    }
    let historyApiReady = false;
    let browserAtExitRoot = false;
    let ignoreProgrammaticPop = false;
    let isExitingApp = false;
    let lastHomeBackAt = 0;
    let initialHistoryLen = history.length || 1;
    try {
      const r1 = safeReplaceHistory({ barakahSentinel: 'exit-root', d: 0 });
      const r2 = safePushHistory({ barakahSentinel: 'home-guard', d: 1 });
      historyApiReady = r1 && r2;
    } catch (e) {}

    let doubleBackTimer = null;
    function clearDoubleBack(restoreGuard) {
      if (doubleBackTimer) { clearTimeout(doubleBackTimer); doubleBackTimer = null; }
      lastHomeBackAt = 0;
      if (restoreGuard && browserAtExitRoot && historyApiReady && !isExitingApp) {
        browserAtExitRoot = false;
        safePushHistory({ barakahSentinel: 'home-guard', d: 1 });
      }
    }
    function openExitModal() {
      clearDoubleBack(false);
      document.getElementById('exit-modal').style.display = 'flex';
    }
    function cancelExitModal() {
      document.getElementById('exit-modal').style.display = 'none';
      clearDoubleBack(true);
    }
    function confirmAppExit() {
      isExitingApp = true;
      isAdmin = false;
      if (doubleBackTimer) { clearTimeout(doubleBackTimer); doubleBackTimer = null; }
      document.getElementById('exit-modal').style.display = 'none';
      lastHomeBackAt = 0;
      const inIframe = (() => { try { return window.self !== window.top; } catch (e) { return true; } })();
      const isStandalone = window.matchMedia && window.matchMedia('(display-mode: standalone)').matches;
      const appDepth = browserAtExitRoot ? 0 : Math.max(1, stack.length);
      const hasPrev = !inIframe && !isStandalone && initialHistoryLen > 1;
      if (isStandalone) {
        try { window.close(); } catch (e) {}
        if (!window.closed && appDepth > 0) { try { browserAtExitRoot = true; history.go(-appDepth); } catch (e) {} }
      } else if (hasPrev) {
        try { browserAtExitRoot = true; history.go(-(appDepth + 1)); } catch (e) {}
      } else {
        try { window.close(); } catch (e) {}
        if (!window.closed && appDepth > 0) { try { browserAtExitRoot = true; history.go(-appDepth); } catch (e) {} }
      }
      setTimeout(() => {
        if (document.visibilityState === 'visible') {
          document.getElementById('exited-screen').style.display = 'flex';
        }
      }, 180);
    }
    function reenterApp() {
      isExitingApp = false;
      lastHomeBackAt = 0;
      stack = [{ page: 'home' }];
      document.getElementById('exited-screen').style.display = 'none';
      if (historyApiReady && browserAtExitRoot) {
        browserAtExitRoot = false;
        safePushHistory({ barakahSentinel: 'home-guard', d: 1 });
      }
      render();
    }

    function nav(entry) {
      if ((entry.page === 'admin' || entry.page === 'addMember') && !isAdmin) {
        pendingRoute = entry; openPin(); return;
      }
      if (document.getElementById('exit-modal').style.display === 'flex' || browserAtExitRoot) cancelExitModal();
      if (entry.page === 'home') {
        const steps = stack.length - 1;
        stack = [{ page: 'home' }];
        if (steps > 0 && historyApiReady) {
          ignoreProgrammaticPop = true;
          try { history.go(-steps); } catch (e) { ignoreProgrammaticPop = false; }
        }
      } else {
        stack.push(entry);
        if (historyApiReady) safePushHistory({ barakahSentinel: 'page', d: stack.length });
      }
      try { window.scrollTo(0, 0); } catch (e) {}
      render();
    }
    function goBack() {
      if (stack.length > 1) {
        if (historyApiReady) {
          try { history.back(); return; } catch (e) {}
        }
        stack.pop();
        try { window.scrollTo(0, 0); } catch (e) {}
        render();
      }
    }
    window.addEventListener('popstate', () => {
      if (isExitingApp) return;
      if (ignoreProgrammaticPop) { ignoreProgrammaticPop = false; browserAtExitRoot = false; return; }
      const exitOpen = document.getElementById('exit-modal').style.display === 'flex';
      const pinOpen = document.getElementById('pin-modal').style.display === 'flex';
      const popOpen = document.getElementById('popup-modal').style.display === 'flex';
      const confOpen = document.getElementById('confirm-modal').style.display === 'flex';
      if (confOpen || pinOpen || popOpen) {
        if (confOpen) resolveConfirm(false);
        else if (pinOpen) closePin();
        else if (popOpen) dismissActivePopup(false);
        if (historyApiReady) safePushHistory({ barakahSentinel: stack.length > 1 ? 'page' : 'home-guard', d: stack.length });
        return;
      }
      if (stack.length > 1) {
        stack.pop();
        browserAtExitRoot = false;
        try { window.scrollTo(0, 0); } catch (e) {}
        render();
        return;
      }
      const now = Date.now();
      if (exitOpen || (lastHomeBackAt > 0 && now - lastHomeBackAt <= 2500)) {
        confirmAppExit();
        return;
      }
      lastHomeBackAt = now;
      browserAtExitRoot = true;
      toast('বের হতে আরেকবার ব্যাক বাটন চাপুন');
      if (doubleBackTimer) clearTimeout(doubleBackTimer);
      doubleBackTimer = setTimeout(() => clearDoubleBack(true), 2500);
    });
    window.addEventListener('keydown', (e) => {
      const exitOpen = document.getElementById('exit-modal').style.display === 'flex';
      const modalOpen = document.getElementById('pin-modal').style.display === 'flex'
        || document.getElementById('popup-modal').style.display === 'flex'
        || document.getElementById('confirm-modal').style.display === 'flex';
      if (e.altKey && e.key === 'ArrowLeft') { e.preventDefault(); goBack(); }
      else if (e.key === 'Escape') {
        if (exitOpen) cancelExitModal();
        else if (!modalOpen && stack.length > 1) goBack();
      }
    });

    function openPin() {
      document.getElementById('pin-input').value = '';
      document.getElementById('pin-err').style.display = 'none';
      document.getElementById('pin-modal').style.display = 'flex';
      setTimeout(() => { try { document.getElementById('pin-input').focus(); } catch(e){} }, 80);
    }
    function closePin() { pendingRoute = null; document.getElementById('pin-modal').style.display = 'none'; }
    function isPhoneColliding(pin) {
      const clean = toEn(String(pin || '')).replace(/\\D/g, '');
      if (!clean) return false;
      const adminPh = toEn(String((db.appConfig && db.appConfig.adminPhone) || '')).replace(/\\D/g, '');
      if (adminPh && (clean === adminPh || clean.endsWith(adminPh) || adminPh.endsWith(clean))) return true;
      return (db.members || []).some(m => {
        const mp = toEn(String(m.phone || '')).replace(/\\D/g, '');
        return mp && (clean === mp || (clean.length >= 8 && (mp.endsWith(clean) || clean.endsWith(mp))));
      });
    }
    function verifyPin() {
      const val = document.getElementById('pin-input').value.trim();
      const er = document.getElementById('pin-err');
      if (isPhoneColliding(val)) {
        er.textContent = 'মেম্বার বা এডমিনের ফোন নম্বর কখনোই এডমিন পাসওয়ার্ড হিসেবে গ্রহণযোগ্য নয়!';
        er.style.display = 'block';
        return;
      }
      if (val === (db.adminPin || '@Shohag007')) {
        isAdmin = true;
        const target = pendingRoute;
        closePin();
        toast('স্বাগতম, ' + (db.adminName || 'Admin') + '!');
        if (target) nav(target); else render();
      } else {
        er.textContent = 'ভুল এডমিন পাসওয়ার্ড!'; er.style.display = 'block';
      }
    }
    function adminLogout() {
      isAdmin = false;
      if (cur().page === 'admin' || cur().page === 'addMember') stack = [{ page: 'home' }];
      toast('এডমিন লগআউট হয়েছে'); render();
    }

    function showPopupModal(pop) {
      currentPopupObj = pop;
      document.getElementById('pop-title').textContent = pop.title;
      document.getElementById('pop-msg').textContent = pop.message;
      const st = document.getElementById('pop-stat');
      if (pop.triggerType === 'unpaid_reminder') {
        const today = getTodayISO();
        const tb = getDailyBreakdown(today);
        st.textContent = 'আজকের সারসংক্ষেপ · পরিশোধ: ' + bn(tb.paid.length) + ' জন · বাকি: ' + bn(tb.unpaid.length) + ' জন';
        st.style.display = 'block';
      } else st.style.display = 'none';
      const ab = document.getElementById('pop-act-btn');
      if (pop.actionTarget) {
        ab.textContent = pop.actionLabel || 'দেখুন';
        ab.style.display = 'inline-flex';
        ab.onclick = () => { dismissActivePopup(true); nav({ page: pop.actionTarget }); };
      } else ab.style.display = 'none';
      document.getElementById('popup-modal').style.display = 'flex';
    }
    function dismissActivePopup(forToday) {
      if (forToday && currentPopupObj) {
        try {
          const map = JSON.parse(safeGet(POPUP_DISMISS_KEY) || '{}');
          map[currentPopupObj.id] = getTodayISO();
          safeSet(POPUP_DISMISS_KEY, JSON.stringify(map));
        } catch(e){}
      }
      currentPopupObj = null;
      document.getElementById('popup-modal').style.display = 'none';
    }
    function checkAutoPopups() {
      const pops = (db.appConfig.automatedPopups || []).filter(p => p.enabled);
      if (!pops.length || currentPopupObj) return;
      const today = getTodayISO();
      let map = {};
      try { map = JSON.parse(safeGet(POPUP_DISMISS_KEY) || '{}'); } catch(e){}
      const now = new Date();
      const hhmm = String(now.getHours()).padStart(2,'0') + ':' + String(now.getMinutes()).padStart(2,'0');
      const unpaidCount = getDailyBreakdown(today).unpaid.length;
      for (const p of pops) {
        if (shownPopups.has(p.id)) continue;
        if (p.frequency === 'once_per_day' && map[p.id] === today) continue;
        const ok = p.triggerType === 'on_open' || (p.triggerType === 'daily_time' && hhmm >= (p.scheduleTime||'19:30')) || (p.triggerType === 'unpaid_reminder' && unpaidCount > 0 && hhmm >= (p.scheduleTime||'18:00'));
        if (ok) { shownPopups.add(p.id); showPopupModal(p); break; }
      }
    }
    setTimeout(checkAutoPopups, 11000);

    function buildFullHtml() {
      const j = JSON.stringify(db, null, 2).replace(/<\\/script/gi, '<\\\\/script');
      return INIT_SHELL.replace(/(<script id="barakah-db" type="application\\/json">)[\\s\\S]*?(<\\/script>)/i, (_, a, b) => a + '\\n' + j + '\\n' + b);
    }
    function downloadUpdatedHtml() {
      const code = buildFullHtml();
      const u = URL.createObjectURL(new Blob([code], { type: 'text/html;charset=utf-8' }));
      const a = document.createElement('a'); a.href = u; a.download = 'barakah_unity_v' + (db.appConfig.appVersion||'2.0.0') + '_' + getTodayISO() + '.html';
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(u), 1000);
      toast('সম্পূর্ণ আপডেটেড HTML ফাইল ডাউনলোড হয়েছে');
    }
    function downloadJson() {
      const copy = Object.assign({}, db); delete copy.adminPin;
      const wrapped = {
        appName: 'BARAKAH MULTICARE HOSPITAL UNITY',
        exportedAt: new Date().toISOString(),
        memberCount: (copy.members || []).length,
        data: copy
      };
      const u = URL.createObjectURL(new Blob([JSON.stringify(wrapped, null, 2)], { type: 'application/json' }));
      const a = document.createElement('a'); a.href = u; a.download = 'barakah_backup_v' + (db.appConfig.appVersion||'2.1.0') + '_' + getTodayISO() + '.json';
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(u), 1000);
      toast('JSON আপডেট/ব্যাকআপ ডাউনলোড হয়েছে');
    }
    function importJsonFile(ev) {
      const f = ev.target.files[0]; if (!f) return;
      const r = new FileReader();
      r.onload = (e) => {
        try {
          const parsed = JSON.parse(e.target.result);
          const p = (parsed && parsed.data && typeof parsed.data === 'object') ? parsed.data : parsed;
          if (!p || !Array.isArray(p.members)) throw 0;
          const keepPin = db.adminPin;
          db = normalizeDb(p);
          if (!p.adminPin) db.adminPin = keepPin;
          save('ফাইল থেকে v' + (db.appConfig.appVersion||'2.1.0') + ' আপডেট ইনস্টল হয়েছে!');
        } catch(err) { toast('সঠিক JSON আপডেট ফাইল নয়'); }
      };
      r.readAsText(f);
    }
    async function checkOnlineUpdate() {
      const url = (db.appConfig.updateManifestUrl || db.cloudSyncUrl || '').trim();
      if (!url) { toast('অনলাইন URL সেট করা নেই — এডমিন সেটিংসে URL দিন বা নিচ থেকে .json ফাইল ইনস্টল করুন'); return; }
      try {
        const sep = url.includes('?') ? '&' : '?';
        const res = await fetch(url + sep + '_t=' + Date.now(), { cache: 'no-store' });
        if (!res.ok) throw 0;
        const remote = await res.json();
        if (remote && Array.isArray(remote.members)) {
          if (Number(remote.updatedAtMs || 0) > Number(db.updatedAtMs || 0)) {
            const keepPin = db.adminPin;
            db = normalizeDb(remote);
            if (!remote.adminPin) db.adminPin = keepPin;
            save('অনলাইন থেকে নতুন আপডেট ইনস্টল হয়েছে!');
          } else toast('আপনার অ্যাপটি সর্বশেষ আপডেটেড অবস্থায় আছে');
        }
      } catch(e) { toast('আপডেট চেক করা যায়নি'); }
    }

    function renderRulesRowsHtml() {
      const rq = rulesSearchQ.trim().toLowerCase();
      const rlist = db.rules.filter(r => !rq || r.title.toLowerCase().includes(rq) || r.description.toLowerCase().includes(rq));
      if (!rlist.length) return '<p style="text-align:center;color:var(--muted);padding:16px;">কোনো নিয়ম পাওয়া যায়নি</p>';
      return rlist.map((r, i) => '<div class="row"><div style="display:flex;gap:10px;align-items:start;"><div class="serial mono">' + bn(String(i+1).padStart(2,'0')) + '</div><div><div style="font-weight:800;font-size:14.5px">' + esc(r.title) + '</div><div style="font-size:13px;color:var(--muted);margin-top:2px">' + esc(r.description) + '</div></div></div></div>').join('');
    }
    window.updateRulesListOnly = () => {
      const box = document.getElementById('rules-list-box');
      if (box) box.innerHTML = renderRulesRowsHtml();
    };

    function renderDailyListsHtml() {
      const bd = getDailyBreakdown(dailyDate);
      const dq = toEn(dailySearchQ.trim()).toLowerCase();
      let out = '';
      if (dailyTab === 'unpaid' || dailyTab === 'all') {
        const fu = bd.unpaid.filter(x => !dq || x.m.name.toLowerCase().includes(dq) || toEn(x.m.phone).includes(dq) || String(x.m.id)===dq);
        out += '<div class="card"><div class="card-title" style="color:var(--danger);margin-bottom:6px;">নন-পেমেন্টকারীর তালিকা (' + bn(fu.length) + ' জন)</div>';
        out += fu.length ? fu.map(x => '<div class="row"><div style="display:flex;gap:10px;align-items:center;cursor:pointer;flex:1" onclick="nav({page:\\'member\\',id:' + x.m.id + '})"><div class="serial red mono">' + bn(x.m.id) + '</div><div><div style="font-weight:700">' + esc(x.m.name) + '</div><div class="mono" style="font-size:12px;color:var(--muted)">' + esc(x.m.phone) + '</div>' + (x.lastPaid && x.lastPaid < dailyDate ? '<div style="font-size:11px;color:var(--warning);font-weight:600">সর্বশেষ পেইড: ' + fmtDate(x.lastPaid) + ' পর্যন্ত</div>' : '') + '</div></div><div style="display:flex;gap:6px;"><a class="btn btn-sm btn-outline" href="tel:' + esc(x.m.phone) + '">📞</a>' + (isAdmin ? '<button class="btn btn-sm btn-primary" onclick="quickCollect(' + x.m.id + ')">+৳১০০</button>' : '') + '</div></div>').join('') : '<p style="text-align:center;color:var(--success);padding:12px;">সবাই পরিশোধ করেছেন!</p>';
        out += '</div>';
      }
      if (dailyTab === 'paid' || dailyTab === 'all') {
        const fp = bd.paid.filter(x => !dq || x.m.name.toLowerCase().includes(dq) || toEn(x.m.phone).includes(dq) || String(x.m.id)===dq);
        out += '<div class="card"><div class="card-title" style="color:var(--success);margin-bottom:6px;">পেমেন্টকারীর তালিকা (' + bn(fp.length) + ' জন)</div>';
        out += fp.length ? fp.map(x => '<div class="row clickable" onclick="nav({page:\\'member\\',id:' + x.m.id + '})"><div style="display:flex;gap:10px;align-items:center;"><div class="serial green mono">' + bn(x.m.id) + '</div><div><div style="font-weight:700">' + esc(x.m.name) + '</div><div class="mono" style="font-size:12px;color:var(--muted)">' + esc(x.m.phone) + '</div>' + (x.isAdv ? '<div style="font-size:11px;color:var(--primary);font-weight:700">এডভান্স পেইড: ' + fmtDate(x.paidThrough) + ' পর্যন্ত</div>' : '') + '</div></div><div class="right"><div class="mono" style="font-weight:800;color:var(--success)">৳ ' + bn(x.amt) + '</div>' + (x.isAdv ? '<div style="font-size:10.5px;color:var(--primary)">এডভান্স</div>' : '') + '</div></div>').join('') : '<p style="text-align:center;color:var(--muted);padding:12px;">এই তারিখে কোনো পেমেন্ট নেই</p>';
        out += '</div>';
      }
      return out;
    }
    window.updateDailyListOnly = () => {
      const box = document.getElementById('daily-lists-box');
      if (box) box.innerHTML = renderDailyListsHtml();
    };

    function render() {
      const cfg = db.appConfig;
      document.documentElement.style.setProperty('--primary', cfg.themeColor || '#0f766e');
      document.body.classList.toggle('dark', Boolean(cfg.darkMode));
      const c = cur();
      const prev = stack.length > 1 ? stack[stack.length - 2] : null;
      const st = globalStats();
      const en = cfg.enabledToggles || {};
      const today = getTodayISO();
      const todayBd = getDailyBreakdown(today);
      const paidToday = todayBd.paid.length;
      const unpaidToday = todayBd.unpaid.length;

      const logoImgSmall = cfg.appLogoUrl ? '<img src="' + cfg.appLogoUrl + '" alt="Logo" style="width:28px;height:28px;border-radius:50%;object-fit:cover;border:1px solid rgba(15,118,110,0.25);flex-shrink:0;" />' : '';
      const logoImgHero = cfg.appLogoUrl ? '<img src="' + cfg.appLogoUrl + '" alt="Logo" style="width:52px;height:52px;border-radius:50%;object-fit:cover;border:2px solid rgba(255,255,255,0.45);flex-shrink:0;" />' : '';

      let html = '<header class="topbar no-print"><div class="topbar-inner">';
      if (c.page === 'home') {
        html += '<button class="brand" style="display:inline-flex;align-items:center;gap:8px;" onclick="nav({page:\\'home\\'})">' + logoImgSmall + '<span>BARAKAH UNITY</span></button>';
      } else {
        html += '<div class="back-group"><button class="back-btn" onclick="goBack()">← ' + esc(prev ? routeLabel(prev) : 'ব্যাক') + '</button>';
        if (stack.length > 2) html += '<button class="back-btn home-mini" onclick="nav({page:\\'home\\'})">হোম</button>';
        html += '<div class="page-title">' + esc(routeLabel(c)) + '</div></div>';
      }
      html += isAdmin
        ? '<button class="btn btn-sm btn-dark" onclick="nav({page:\\'admin\\'})">এডমিন প্যানেল</button>'
        : '<button class="btn btn-sm btn-primary" onclick="openPin()">এডমিন লগইন</button>';
      html += '</div></header><main class="container">';

      /* HOME */
      if (c.page === 'home') {
        html += '<div class="hero"><div style="display:flex;align-items:center;gap:12px;">' + logoImgHero + '<div><h1>BARAKAH MULTICARE HOSPITAL UNITY</h1><p>' + esc(db.adminName) + ' <span style="font-family:sans-serif;font-size:11px;opacity:0.52;letter-spacing:0.4px;">Admin</span> · সদস্য: ' + bn(db.members.length) + ' জন · v' + esc(cfg.appVersion||'2.1.0') + '</p></div></div><div class="hero-actions"><button class="hero-btn" onclick="shareSummary()">শেয়ার</button><button class="hero-btn" onclick="triggerManualPopup()">বার্তা</button><button class="hero-btn" onclick="toggleTheme()">' + (cfg.darkMode ? '☀️' : '🌙') + '</button><button class="hero-btn" onclick="openExitModal()">Exit</button></div></div>';
        html += '<div class="ticker"><span class="ticker-lbl">বিজ্ঞপ্তি</span><div class="ticker-box"><span class="ticker-track">' + esc(cfg.homeTickerText || '') + '</span></div></div>';

        if (cfg.pinnedNotice && Date.now() < cfg.pinnedNotice.expiresAtMs) {
          html += '<div class="pinned-notice"><div class="pinned-meta"><span>📌 পিন নোটিশ · মেয়াদ: ' + durLabel(cfg.pinnedNotice.duration) + ' · ' + remainBn(cfg.pinnedNotice.expiresAtMs) + '</span>' + (isAdmin ? '<button class="btn btn-sm btn-outline" onclick="unpinNotice()">আনপিন</button>' : '') + '</div><div class="pinned-title">' + esc(cfg.pinnedNotice.title) + '</div><div class="pinned-body">' + esc(cfg.pinnedNotice.body) + '</div></div>';
        }

        if (cfg.fundTarget > 0) {
          const pct = Math.min(100, Math.round((st.fund / cfg.fundTarget) * 100));
          html += '<div class="card" style="padding:12px 14px;"><div style="display:flex;justify-content:space-between;font-size:12px;font-weight:700;margin-bottom:6px;"><span>ফান্ড লক্ষ্যমাত্রা</span><span class="mono">৳ ' + bn(st.fund) + ' / ৳ ' + bn(cfg.fundTarget) + ' (' + bn(pct) + '%)</span></div><div class="progress-track"><div class="progress-fill" style="width:' + pct + '%"></div></div></div>';
        }

        html += '<div class="home-split"><div><div class="grid2">';
        if (en.kisti !== false) html += '<button class="tile" onclick="nav({page:\\'kisti\\'})"><span class="tile-lbl">মোট প্রদেয় কিস্তি</span><span class="tile-val mono">' + bn(st.kisti) + ' টি</span></button>';
        if (en.draws !== false) html += '<button class="tile" onclick="nav({page:\\'draws\\'})"><span class="tile-lbl">ড্র পাওয়া ব্যক্তি</span><span class="tile-val mono" style="color:var(--warning)">' + bn(st.drawCount) + ' জন</span></button>';
        if (en.fund !== false) html += '<button class="tile" onclick="nav({page:\\'fund\\'})"><span class="tile-lbl">টোটাল ফান্ড</span><span class="tile-val mono" style="color:#0284c7">৳ ' + bn(st.fund) + '</span></button>';
        if (en.dailyPayments !== false) html += '<button class="tile" onclick="nav({page:\\'dailyPayments\\'})"><span class="tile-lbl">দৈনিক তালিকা</span><span class="tile-val mono" style="font-size:13.5px;color:var(--success)">জমা ' + bn(paidToday) + ' · <span style="color:var(--danger)">বাকি ' + bn(unpaidToday) + '</span></span></button>';
        if (en.rules !== false) html += '<button class="tile" onclick="nav({page:\\'rules\\'})"><span class="tile-lbl">রুলস &amp; রেগুলেশন</span><span class="tile-val" style="font-size:14.5px;color:#4338ca">' + bn(db.rules.length) + 'টি নিয়ম</span></button>';
        if (en.addMember !== false) html += '<button class="tile" onclick="nav({page:\\'addMember\\'})"><span class="tile-lbl">নতুন সদস্য এড</span><span class="tile-val" style="font-size:13.5px;color:var(--text)">' + (isAdmin ? '+ সদস্য যুক্ত' : 'শুধুমাত্র এডমিন') + '</span></button>';
        if (en.payment !== false) html += '<button class="tile full" style="border-color:#fbcfe8" onclick="nav({page:\\'payment\\'})"><div><div class="tile-lbl">পেমেন্ট (নগদ ও বিকাশ পার্সোনাল)</div><div class="tile-val mono" style="font-size:14px;color:var(--pink)">বিকাশ: ' + esc(cfg.bkashNumber) + '</div></div><strong>➔</strong></button>';
        if (en.updates !== false) html += '<button class="tile full" onclick="nav({page:\\'updates\\'})"><div><div class="tile-lbl">অ্যাপ আপডেট ও ব্যাকআপ (v' + esc(cfg.appVersion||'2.0.0') + ')</div><div class="tile-val" style="font-size:13.5px">অ্যাপ থেকেই পরবর্তী আপডেট নিন</div></div><strong>➔</strong></button>';
        (cfg.customToggles||[]).filter(t => t.enabled).forEach(ct => {
          html += '<button class="tile full" onclick="nav({page:\\'custom\\',id:\\'' + ct.id + '\\'})"><div><div class="tile-lbl">' + esc(ct.subtitle) + '</div><div class="tile-val" style="font-size:14.5px">' + esc(ct.title) + '</div></div><strong>➔</strong></button>';
        });
        html += '</div></div>';

        const q = toEn(searchQ.trim()).toLowerCase();
        let mList = db.members.slice().sort((a,b) => cfg.sortBy === 'amount_desc' ? totalOf(b)-totalOf(a) : a.id-b.id);
        if (q) mList = mList.filter(m => m.name.toLowerCase().includes(q) || toEn(m.phone).includes(q) || String(m.id) === q);

        html += '<div><div class="card-hd"><span class="card-title">সদস্য তালিকা (' + bn(db.members.length) + ' জন)</span><span style="font-size:11.5px;color:var(--muted)">হিসাব দেখতে ক্লিক করুন</span></div>';
        html += '<input class="input" placeholder="নাম, আইডি বা মোবাইল দিয়ে খুঁজুন..." value="' + esc(searchQ) + '" oninput="searchQ=this.value;renderMemberList()" />';
        html += '<div class="card" id="m-list-box" style="padding:4px 14px;">' + renderMembersRows(mList) + '</div></div></div>';
      }

      /* MEMBER DETAIL + PRINT RECEIPT */
      else if (c.page === 'member') {
        const m = db.members.find(x => x.id === c.id);
        if (m) {
          const deps = (m.deposits||[]).slice().sort((a,b) => (b.date||'').localeCompare(a.date||''));
          html += '<div class="print-only" style="border-bottom:2px solid #000;padding-bottom:10px;margin-bottom:12px;"><h2>BARAKAH MULTICARE HOSPITAL UNITY</h2><p style="font-size:12px">সদস্য ডিপোজিট রসিদ · এডমিন: ' + esc(db.adminName) + ' · তারিখ: ' + fmtDate(today) + '</p></div>';
          html += '<div class="card"><div style="display:flex;justify-content:space-between;align-items:start;gap:10px;"><div><p class="mono" style="font-size:12px;color:var(--muted)">সদস্য আইডি #' + bn(m.id) + '</p><h2 style="font-size:19px;font-weight:800;">' + esc(m.name) + '</h2><a href="tel:' + esc(m.phone) + '" class="mono" style="font-size:13.5px;color:var(--primary);text-decoration:none;font-weight:700;">' + esc(m.phone) + '</a></div><button class="btn btn-sm btn-outline no-print" onclick="window.print()">🖨️ Print Receipt</button></div>';
          html += '<div class="summary-box" style="margin-top:12px;margin-bottom:0;"><div><div style="font-size:12px;opacity:.9">মোট জমা</div><div class="mono" style="font-size:22px;font-weight:800">৳ ' + bn(totalOf(m)) + '</div></div><div class="right"><div style="font-size:12px;opacity:.9">মোট কিস্তি</div><div class="mono" style="font-size:20px;font-weight:800">' + bn(kistiOf(m)) + ' টি</div></div></div>';
          if (isAdmin) {
            if (editingMemberId === m.id) {
              html += '<div class="no-print" style="margin-top:12px;padding-top:12px;border-top:1px solid var(--border);"><label class="flbl">সদস্যের নাম</label><input id="em-name" class="input" value="' + esc(m.name) + '" /><label class="flbl">মোবাইল নম্বর</label><input id="em-phone" type="tel" class="input mono" value="' + esc(m.phone) + '" /><div class="grid2"><button class="btn btn-sm btn-primary" onclick="saveEditMember(' + m.id + ')">সেভ করুন</button><button class="btn btn-sm btn-outline" onclick="editingMemberId=null;render()">বাতিল</button></div></div>';
            } else {
              html += '<div class="grid2 no-print" style="margin-top:10px;"><button class="btn btn-sm btn-outline" onclick="editingMemberId=' + m.id + ';render()">✏️ তথ্য এডিট</button><button class="btn btn-sm btn-danger" onclick="delMember(' + m.id + ')">🗑️ সদস্য মুছুন</button></div>';
            }
          }
          html += '</div>';

          if (isAdmin) {
            html += '<div class="card no-print"><div class="card-title" style="margin-bottom:8px;">ডিপোজিট আদায় (এডমিন)</div><div class="tabs"><button class="tab ' + (depMode==='single'?'active':'') + '" onclick="depMode=\\'single\\';render()">একদিনের জমা</button><button class="tab ' + (depMode==='range'?'active':'') + '" onclick="depMode=\\'range\\';render()">তারিখ রেঞ্জ</button></div>';
            if (depMode === 'single') {
              html += '<label class="flbl">তারিখ</label><input id="d-date" type="date" class="input" value="' + today + '" /><label class="flbl">টাকার পরিমাণ</label><input id="d-amt" type="number" class="input mono" value="100" /><label class="flbl">মন্তব্য</label><input id="d-note" class="input" value="দৈনিক কিস্তি" /><button class="btn btn-primary btn-full" onclick="addSingleDep(' + m.id + ')">টাকা জমা করুন</button>';
            } else {
              html += '<div class="grid2"><div><label class="flbl">শুরু</label><input id="dr-s" type="date" class="input" value="2026-11-22" /></div><div><label class="flbl">শেষ</label><input id="dr-e" type="date" class="input" value="2026-11-29" /></div></div><label class="flbl">প্রতিদিনের টাকা</label><input id="dr-a" type="number" class="input mono" value="100" /><label class="flbl">মন্তব্য</label><input id="dr-n" class="input" value="দৈনিক কিস্তি" /><button class="btn btn-primary btn-full" onclick="addRangeDep(' + m.id + ')">রেঞ্জ জমা নিন</button>';
            }
            html += '</div>';
          }

          html += '<div class="card"><div class="card-title" style="margin-bottom:8px;">তারিখ অনুসারে জমার হিসাব (' + bn(deps.length) + 'টি)</div><div class="table-wrap"><table><thead><tr><th>তারিখ</th><th>বিবরণ</th><th class="right">টাকা</th>' + (isAdmin ? '<th class="right no-print">অ্যাকশন</th>' : '') + '</tr></thead><tbody>';
          html += deps.length ? deps.map(d => '<tr><td class="mono">' + fmtDate(d.date) + '</td><td>' + esc(d.note||'দৈনিক কিস্তি') + '</td><td class="right mono" style="font-weight:800;color:var(--primary)">৳ ' + bn(d.amount) + '</td>' + (isAdmin ? '<td class="right no-print"><button class="btn btn-sm btn-danger" onclick="delDep(' + m.id + ',\\'' + d.id + '\\')">মুছুন</button></td>' : '') + '</tr>').join('') : '<tr><td colspan="' + (isAdmin?4:3) + '" style="text-align:center;color:var(--muted);padding:18px;">কোনো জমা নেই</td></tr>';
          html += '</tbody><tfoot><tr class="tfoot-row"><td colspan="2">সর্বমোট জমা</td><td class="right mono">৳ ' + bn(totalOf(m)) + '</td>' + (isAdmin ? '<td class="no-print"></td>' : '') + '</tr></tfoot></table></div></div>';
          html += '<div class="print-only" style="margin-top:24px;display:flex;justify-content:space-between;font-size:12px;"><span>BARAKAH MULTICARE HOSPITAL UNITY</span><span style="border-top:1px solid #000;padding-top:4px;">স্বাক্ষর (' + esc(db.adminName) + ')</span></div>';
        }
      }

      /* RULES & REGULATIONS */
      else if (c.page === 'rules') {
        html += '<div class="card"><div class="card-hd"><span class="card-title">রুলস &amp; রেগুলেশন (' + bn(db.rules.length) + 'টি নিয়ম)</span>' + (isAdmin ? '<button class="btn btn-sm btn-primary" onclick="adminTab=\\'rules\\';nav({page:\\'admin\\'})">এডমিন এডিট</button>' : '') + '</div>';
        html += '<input class="input" placeholder="নিয়ম খুঁজুন..." value="' + esc(rulesSearchQ) + '" oninput="rulesSearchQ=this.value;updateRulesListOnly()" />';
        html += '<div id="rules-list-box">' + renderRulesRowsHtml() + '</div></div>';
      }

      /* DAILY PAID & UNPAID LIST */
      else if (c.page === 'dailyPayments') {
        const bd = getDailyBreakdown(dailyDate);
        const paidCount = bd.paid.length;
        const col = bd.totalCollected;
        const unpaidCount = bd.unpaid.length;
        const pct = db.members.length ? Math.round((paidCount / db.members.length) * 100) : 0;
        html += '<div class="card"><div class="card-hd"><span class="card-title">দৈনিক তালিকা (' + fmtDate(dailyDate) + ')</span><button class="btn btn-sm btn-outline" onclick="copyUnpaidList()">📋 বাকি তালিকা কপি</button></div>';
        html += '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px;"><input type="date" class="input" style="max-width:170px;margin:0;" value="' + dailyDate + '" onchange="dailyDate=this.value;render()" /><button class="btn btn-sm btn-outline" onclick="dailyDate=\\'' + offsetDate(today,1) + '\\';render()">আগামীকাল</button><button class="btn btn-sm btn-outline" onclick="dailyDate=\\'' + today + '\\';render()">আজ</button><button class="btn btn-sm btn-outline" onclick="dailyDate=\\'' + offsetDate(today,-1) + '\\';render()">গতকাল</button></div>';
        html += '<div class="grid3" style="margin-bottom:10px;"><div><div class="tile-lbl">পেমেন্টকারী</div><div class="mono" style="font-size:17px;font-weight:800;color:var(--success)">' + bn(paidCount) + ' জন</div></div><div><div class="tile-lbl">নন-পেমেন্টকারী</div><div class="mono" style="font-size:17px;font-weight:800;color:var(--danger)">' + bn(unpaidCount) + ' জন</div></div><div><div class="tile-lbl">মোট আদায়</div><div class="mono" style="font-size:17px;font-weight:800;color:var(--primary)">৳ ' + bn(col) + '</div></div></div>';
        html += '<div class="progress-track"><div class="progress-fill" style="width:' + pct + '%"></div></div></div>';

        html += '<div class="tabs"><button class="tab ' + (dailyTab==='unpaid'?'active':'') + '" onclick="dailyTab=\\'unpaid\\';render()">নন-পেমেন্ট (' + bn(unpaidCount) + ')</button><button class="tab ' + (dailyTab==='paid'?'active':'') + '" onclick="dailyTab=\\'paid\\';render()">পেমেন্টকারী (' + bn(paidCount) + ')</button><button class="tab ' + (dailyTab==='all'?'active':'') + '" onclick="dailyTab=\\'all\\';render()">সকল (' + bn(db.members.length) + ')</button></div>';
        html += '<input class="input" placeholder="নাম বা মোবাইল খুঁজুন..." value="' + esc(dailySearchQ) + '" oninput="dailySearchQ=this.value;updateDailyListOnly()" />';
        html += '<div id="daily-lists-box">' + renderDailyListsHtml() + '</div>';
      }

      /* KISTI & FUND */
      else if (c.page === 'kisti' || c.page === 'fund') {
        html += '<div class="summary-box"><div><div style="font-size:12px;opacity:.9">' + (c.page==='kisti' ? 'সর্বমোট কিস্তি' : 'সর্বমোট ফান্ড') + '</div><div class="mono" style="font-size:22px;font-weight:800">' + (c.page==='kisti' ? bn(st.kisti)+' টি' : '৳ '+bn(st.fund)) + '</div></div><div class="right"><div style="font-size:12px;opacity:.9">' + (c.page==='kisti' ? 'মোট এন্ট্রি' : 'নিট ব্যালেন্স') + '</div><div class="mono" style="font-size:19px;font-weight:800">' + (c.page==='kisti' ? bn(st.entries)+' বার' : '৳ '+bn(st.net)) + '</div></div></div>';
        html += '<div class="card"><div class="table-wrap"><table><thead><tr><th>নং</th><th>সদস্য</th><th class="right">কিস্তি</th><th class="right">মোট টাকা</th></tr></thead><tbody>';
        html += db.members.map(m => '<tr style="cursor:pointer" onclick="nav({page:\\'member\\',id:' + m.id + '})"><td class="mono">' + bn(m.id) + '</td><td style="font-weight:700">' + esc(m.name) + '</td><td class="right mono">' + bn(kistiOf(m)) + ' টি</td><td class="right mono" style="font-weight:800;color:var(--primary)">৳ ' + bn(totalOf(m)) + '</td></tr>').join('');
        html += '</tbody><tfoot><tr class="tfoot-row"><td colspan="2">সর্বমোট</td><td class="right mono">' + bn(st.kisti) + ' টি</td><td class="right mono">৳ ' + bn(st.fund) + '</td></tr></tfoot></table></div></div>';
      }

      /* DRAWS */
      else if (c.page === 'draws') {
        html += '<div class="summary-box" style="background:#b45309"><div><div style="font-size:12px;opacity:.9">মোট ড্র বিজয়ী</div><div class="mono" style="font-size:22px;font-weight:800">' + bn(st.drawCount) + ' জন</div></div><div class="right"><div style="font-size:12px;opacity:.9">মোট প্রদান</div><div class="mono" style="font-size:19px;font-weight:800">৳ ' + bn(st.drawAmt) + '</div></div></div>';
        if (isAdmin) {
          html += '<div class="card"><div class="card-title" style="margin-bottom:8px;">ড্র বিজয়ী যুক্ত করুন</div><select id="dr-mem" class="input">' + db.members.map(m => '<option value="' + m.id + '">' + bn(m.id) + '. ' + esc(m.name) + '</option>').join('') + '</select><div class="grid2"><input id="dr-dt" type="date" class="input" value="' + today + '" /><input id="dr-amt" type="number" class="input mono" placeholder="টাকা" /></div><input id="dr-nt" class="input" placeholder="মন্তব্য (যেমন: ১ম ড্র)" /><button class="btn btn-primary btn-full" onclick="addDraw()">ড্র সেভ করুন</button></div>';
        }
        html += '<div class="card"><div class="card-title" style="margin-bottom:6px;">ড্র বিজয়ীদের তালিকা</div>' + (db.draws.length ? db.draws.map((d,i) => '<div class="row"><div><strong>' + bn(i+1) + '. ' + esc(d.memberName) + '</strong><div style="font-size:12px;color:var(--muted)">' + fmtDate(d.date) + (d.note?' · '+esc(d.note):'') + '</div></div><div style="display:flex;align-items:center;gap:8px;"><strong class="mono" style="color:var(--warning)">৳ ' + bn(d.amount) + '</strong>' + (isAdmin ? '<button class="btn btn-sm btn-danger" onclick="delDraw(\\'' + d.id + '\\')">মুছুন</button>' : '') + '</div></div>').join('') : '<p style="text-align:center;color:var(--muted);padding:14px;">এখনো কেউ ড্র পায়নি</p>') + '</div>';
      }

      /* PAYMENT */
      else if (c.page === 'payment') {
        html += '<div class="grid2" style="margin-bottom:12px;"><button class="tile" style="min-height:66px;border-color:' + (payMethod==='bkash'?'#e2136e':'var(--border)') + '" onclick="payMethod=\\'bkash\\';render()"><span class="tile-val" style="font-size:15px;color:var(--pink);margin:0;">বিকাশ - পার্সোনাল</span><span class="tile-lbl">Send Money (খরচসহ)</span></button><button class="tile" style="min-height:66px;border-color:' + (payMethod==='nagad'?'var(--primary)':'var(--border)') + '" onclick="payMethod=\\'nagad\\';render()"><span class="tile-val" style="font-size:15px;margin:0;">নগদ (ডিরেক্ট)</span><span class="tile-lbl">সরাসরি এডমিনকে দিন</span></button></div>';
        if (payMethod === 'bkash') {
          html += '<div class="ticker bkash"><span class="ticker-lbl">শর্ত</span><div class="ticker-box"><span class="ticker-track">' + esc(cfg.bkashTickerText||'') + '</span></div></div>';
          html += '<div class="bkash-card"><svg width="110" height="42" viewBox="0 0 180 70" fill="none"><g transform="translate(8,6)"><polygon points="28,4 48,20 34,34 18,22" fill="#E2136E"/><polygon points="18,22 34,34 22,52 6,36" fill="#C10C5B"/><polygon points="34,34 56,28 46,48 22,52" fill="#F04393"/><polygon points="48,20 62,14 56,28 34,34" fill="#9E0B4B"/></g><text x="76" y="45" fill="#E2136E" font-family="sans-serif" font-size="28" font-weight="900">bKash</text></svg><div style="font-size:13px;font-weight:700;color:var(--pink);margin-top:4px;">বিকাশ পার্সোনাল নাম্বার (Send Money)</div><div class="bkash-num mono" onclick="copyText(\\'' + esc(cfg.bkashNumber) + '\\',\\'বিকাশ নাম্বার কপি হয়েছে!\\')">' + esc(cfg.bkashNumber) + '</div><div><button class="btn btn-pink btn-full" onclick="copyText(\\'' + esc(cfg.bkashNumber) + '\\',\\'বিকাশ নাম্বার কপি হয়েছে!\\')">📋 নাম্বার কপি করুন (' + esc(cfg.bkashNumber) + ')</button></div><p style="font-size:12px;color:var(--muted);margin-top:10px;">বিকাশ খরচসহ পাঠান এবং ট্রানজেকশন আইডি সংরক্ষণ করুন।</p></div>';
        } else {
          html += '<div class="card"><div class="card-title">নগদ (ডিরেক্ট জমাদান)</div><p style="font-size:13.5px;color:var(--muted);margin:8px 0 12px;">সরাসরি এডমিনের হাতে কিস্তি জমা দিন।</p><div style="padding:12px;border-radius:12px;background:var(--bg);border:1px solid var(--border);margin-bottom:12px;"><div style="font-size:12px;color:var(--muted)">এডমিন যোগাযোগ:</div><div style="font-weight:800;margin:2px 0">এডমিন ' + esc(db.adminName) + '</div><div class="mono" style="color:var(--primary);font-weight:700">' + esc(cfg.adminPhone) + '</div></div><div class="grid2"><a class="btn btn-primary" href="tel:' + esc(cfg.adminPhone) + '">📞 কল করুন</a><button class="btn btn-outline" onclick="copyText(\\'' + esc(cfg.adminPhone) + '\\',\\'এডমিন নাম্বার কপি হয়েছে!\\')">📋 কপি</button></div></div>';
        }
      }

      /* ADD MEMBER */
      else if (c.page === 'addMember' && isAdmin) {
        const nid = db.members.length ? Math.max(...db.members.map(m => m.id)) + 1 : 1;
        html += '<div class="card"><div class="card-title" style="margin-bottom:10px;">নতুন সদস্য যুক্ত করুন (আইডি #' + bn(nid) + ')</div><label class="flbl">পূর্ণ নাম</label><input id="nm-name" class="input" placeholder="নাম লিখুন" /><label class="flbl">মোবাইল নম্বর</label><input id="nm-phone" type="tel" class="input mono" placeholder="01XXXXXXXXX" /><button class="btn btn-primary btn-full" onclick="addMember()">সদস্য যুক্ত করুন</button></div>';
      }

      /* CUSTOM TOGGLE */
      else if (c.page === 'custom') {
        const ct = (cfg.customToggles||[]).find(x => x.id === c.id);
        if (ct) {
          html += '<div class="card"><div class="card-title">' + esc(ct.title) + '</div><p style="font-size:12.5px;color:var(--muted);margin-top:2px;">' + esc(ct.subtitle) + '</p><p style="margin-top:12px;white-space:pre-line;font-size:14px;">' + esc(ct.content) + '</p>' + (ct.contactPhone ? '<div class="grid2" style="margin-top:14px;"><a class="btn btn-primary" href="tel:' + esc(ct.contactPhone) + '">📞 কল করুন</a><button class="btn btn-outline" onclick="copyText(\\'' + esc(ct.contactPhone) + '\\',\\'নম্বর কপি হয়েছে!\\')">📋 কপি</button></div>' : '') + '</div>';
        }
      }

      /* UPDATES & BACKUP */
      else if (c.page === 'updates') {
        html += '<div class="card"><div class="card-hd"><div><div class="card-title">ইন-অ্যাপ আপডেট (v' + esc(cfg.appVersion||'2.0.0') + ')</div><div style="font-size:12px;color:var(--muted)">সর্বশেষ সিঙ্ক: ' + esc(db.lastBackup) + '</div></div><button class="btn btn-sm btn-primary" onclick="checkOnlineUpdate()">🔄 আপডেট চেক</button></div>';
        html += '<div class="grid2" style="margin-top:10px;"><button class="btn btn-outline" onclick="document.getElementById(\\'imp-json\\').click()">📂 ফাইল থেকে আপডেট (.json)</button><button class="btn btn-dark" onclick="shareSummary()">📤 সামারি শেয়ার</button></div><input id="imp-json" type="file" accept=".json" style="display:none" onchange="importJsonFile(event)" /></div>';
        html += '<div class="card"><div class="card-title" style="margin-bottom:8px;">আপডেট ইতিহাস (Changelog)</div>' + (cfg.changelog||[]).map(cl => '<div class="row"><div><strong class="mono" style="color:var(--primary)">v' + esc(cl.version) + '</strong> · <span style="font-size:12px;color:var(--muted)">' + fmtDate(cl.releaseDate) + '</span><p style="font-size:13px;margin-top:3px">' + esc(cl.notes) + '</p></div></div>').join('') + '</div>';
      }

      /* ADMIN PANEL */
      else if (c.page === 'admin' && isAdmin) {
        const atabs = [
          ['toggles','টুগল কন্ট্রোল'], ['rules','নিয়মাবলি'], ['notices','নোটিশ ও পপ-আপ'],
          ['bulk','রেঞ্জ ডিপোজিট'], ['updates','আপডেট পাবলিশ'], ['code','HTML/JSON কোড'], ['settings','সেটিংস']
        ];
        html += '<div class="card"><div class="card-hd"><span class="card-title">এডমিন প্যানেল</span><button class="btn btn-sm btn-danger" onclick="adminLogout()">লগআউট</button></div><div class="tabs">' + atabs.map(t => '<button class="tab ' + (adminTab===t[0]?'active':'') + '" onclick="adminTab=\\'' + t[0] + '\\';render()">' + t[1] + '</button>').join('') + '</div></div>';

        if (adminTab === 'toggles') {
          html += '<div class="card"><div class="card-title" style="margin-bottom:8px;">হোম টুগল চালু / বন্ধ করুন</div>' + TOGGLE_META.map(t => '<div class="row"><strong>' + t.label + '</strong><button class="btn btn-sm ' + (en[t.key]!==false?'btn-primary':'btn-outline') + '" onclick="toggleBuiltin(\\'' + t.key + '\\')">' + (en[t.key]!==false?'চালু আছে':'বন্ধ') + '</button></div>').join('') + '</div>';
          html += '<div class="card"><div class="card-title" style="margin-bottom:8px;">নতুন কাস্টম টুগল খুলুন</div><input id="ct-t" class="input" placeholder="টুগলের নাম" /><input id="ct-s" class="input" placeholder="সাবটাইটেল" /><textarea id="ct-c" class="input" rows="3" placeholder="বিস্তারিত বিবরণ"></textarea><input id="ct-p" class="input mono" placeholder="ফোন নম্বর (ঐচ্ছিক)" /><button class="btn btn-primary btn-full" onclick="addCustomToggle()">+ কাস্টম টুগল যোগ করুন</button>';
          if (cfg.customToggles.length) {
            html += '<div style="margin-top:12px;">' + cfg.customToggles.map(ct => '<div class="row"><div><strong>' + esc(ct.title) + '</strong><div style="font-size:12px;color:var(--muted)">' + esc(ct.subtitle) + '</div></div><div style="display:flex;gap:6px;"><button class="btn btn-sm ' + (ct.enabled?'btn-primary':'btn-outline') + '" onclick="toggleCustom(\\'' + ct.id + '\\')">' + (ct.enabled?'চালু':'বন্ধ') + '</button><button class="btn btn-sm btn-danger" onclick="delCustom(\\'' + ct.id + '\\')">মুছুন</button></div></div>').join('') + '</div>';
          }
          html += '</div>';
        } else if (adminTab === 'rules') {
          html += '<div class="card"><div class="card-title" style="margin-bottom:8px;">নতুন নিয়ম যুক্ত করুন</div><input id="nr-t" class="input" placeholder="নিয়মের শিরোনাম" /><textarea id="nr-d" class="input" rows="2" placeholder="নিয়মের বিস্তারিত"></textarea><button class="btn btn-primary btn-full" onclick="addRule()">+ নিয়ম যোগ করুন</button></div>';
          html += '<div class="card"><div class="card-hd"><span class="card-title">নিয়মাবলি (' + bn(db.rules.length) + 'টি)</span><button class="btn btn-sm btn-outline" onclick="resetRules()">ডিফল্ট ১৩টি</button></div>';
          html += db.rules.map((r,i) => editingRuleId === r.id
            ? '<div class="row" style="display:block"><input id="er-t" class="input" value="' + esc(r.title) + '" /><textarea id="er-d" class="input" rows="2">' + esc(r.description) + '</textarea><div class="grid2"><button class="btn btn-sm btn-primary" onclick="saveEditRule(\\'' + r.id + '\\')">সেভ</button><button class="btn btn-sm btn-outline" onclick="editingRuleId=null;render()">বাতিল</button></div></div>'
            : '<div class="row"><div><strong>' + bn(i+1) + '. ' + esc(r.title) + '</strong><div style="font-size:12px;color:var(--muted)">' + esc(r.description) + '</div></div><div style="display:flex;gap:4px;flex-shrink:0;"><button class="btn btn-sm btn-outline" onclick="moveRule(' + i + ',-1)">↑</button><button class="btn btn-sm btn-outline" onclick="moveRule(' + i + ',1)">↓</button><button class="btn btn-sm btn-outline" onclick="editingRuleId=\\'' + r.id + '\\';render()">এডিট</button><button class="btn btn-sm btn-danger" onclick="delRule(\\'' + r.id + '\\')">×</button></div></div>'
          ).join('') + '</div>';
        } else if (adminTab === 'notices') {
          const pnCur = cfg.pinnedNotice || null;
          const pnDur = (pnCur && pnCur.duration) || '1d';
          html += '<div class="card"><div class="card-title" style="margin-bottom:8px;">📌 নোটিশ পিন করুন (১ দিন / ১ সপ্তাহ / ১ মাস)</div><input id="pn-t" class="input" value="' + esc((pnCur && pnCur.title) || '') + '" placeholder="নোটিশের শিরোনাম" /><textarea id="pn-b" class="input" rows="3" placeholder="নোটিশের বিস্তারিত...">' + esc((pnCur && pnCur.body) || '') + '</textarea><select id="pn-d" class="input"><option value="1d" ' + (pnDur==='1d'?'selected':'') + '>১ দিন</option><option value="1w" ' + (pnDur==='1w'?'selected':'') + '>১ সপ্তাহ</option><option value="1m" ' + (pnDur==='1m'?'selected':'') + '>১ মাস</option></select><div class="grid2"><button class="btn btn-warn" onclick="pinNotice()">📌 পিন করুন</button><button class="btn btn-outline" onclick="unpinNotice()">আনপিন করুন</button></div></div>';
          html += '<div class="card"><div class="card-title" style="margin-bottom:8px;">🔔 অটোমেটেড পপ-আপ মেসেজ</div><input id="ap-t" class="input" placeholder="পপ-আপ শিরোনাম" /><textarea id="ap-m" class="input" rows="2" placeholder="মেসেজ লিখুন..."></textarea><div class="grid2"><select id="ap-tr" class="input"><option value="unpaid_reminder">নন-পেমেন্ট রিমাইন্ডার</option><option value="daily_time">দৈনিক নির্দিষ্ট সময়</option><option value="on_open">অ্যাপ ওপেনে অটো</option></select><input id="ap-tm" type="time" class="input mono" value="19:30" /></div><select id="ap-act" class="input"><option value="dailyPayments">অ্যাকশন বাটন: দৈনিক তালিকা দেখুন</option><option value="payment">অ্যাকশন বাটন: পেমেন্ট পেজ</option><option value="rules">অ্যাকশন বাটন: নিয়মাবলি</option><option value="updates">অ্যাকশন বাটন: অ্যাপ আপডেট</option><option value="">কোনো অ্যাকশন বাটন নয়</option></select><button class="btn btn-primary btn-full" onclick="addAutoPopup()">+ অটো পপ-আপ যোগ করুন</button>';
          html += '<div style="margin-top:10px;">' + (cfg.automatedPopups||[]).map(p => '<div class="row"><div><strong>' + esc(p.title) + '</strong><div style="font-size:12px;color:var(--muted)">সময়: ' + esc(p.scheduleTime || '-') + ' · ' + (p.triggerType==='on_open'?'অ্যাপ ওপেনে':p.triggerType==='daily_time'?'দৈনিক সময়':'নন-পেমেন্ট রিমাইন্ডার') + '</div></div><div style="display:flex;gap:4px;"><button class="btn btn-sm btn-outline" onclick="testPopupById(\\'' + p.id + '\\')">টেস্ট</button><button class="btn btn-sm ' + (p.enabled?'btn-primary':'btn-outline') + '" onclick="togglePopup(\\'' + p.id + '\\')">' + (p.enabled?'চালু':'বন্ধ') + '</button><button class="btn btn-sm btn-danger" onclick="delPopup(\\'' + p.id + '\\')">×</button></div></div>').join('') + '</div></div>';
          html += '<div class="card"><div class="card-title" style="margin-bottom:8px;">📢 রানিং বার আপডেট</div><label class="flbl">হোম রানিং বার</label><input id="tk-h" class="input" value="' + esc(cfg.homeTickerText) + '" /><label class="flbl">বিকাশ রানিং বার</label><input id="tk-b" class="input" value="' + esc(cfg.bkashTickerText) + '" /><button class="btn btn-primary btn-full" onclick="saveTickers()">রানিং বার সেভ করুন</button></div>';
        } else if (adminTab === 'bulk') {
          html += '<div class="card"><div class="card-title" style="margin-bottom:8px;">📅 তারিখ রেঞ্জ ডিপোজিট আদায়</div><div class="grid2"><input id="bk-s" type="date" class="input" value="2026-11-22" /><input id="bk-e" type="date" class="input" value="2026-11-29" /></div><div class="grid2"><input id="bk-a" type="number" class="input mono" value="100" /><input id="bk-n" class="input" value="দৈনিক কিস্তি" /></div><div style="display:flex;gap:6px;margin-bottom:8px;"><button class="btn btn-sm btn-dark" onclick="bulkSelAll(true)">সবাই</button><button class="btn btn-sm btn-outline" onclick="bulkSelAll(false)">বাদ দিন</button></div><div style="max-height:220px;overflow-y:auto;border:1px solid var(--border);border-radius:10px;padding:8px;margin-bottom:10px;">' + db.members.map(m => '<label style="display:flex;gap:8px;padding:5px 0;font-size:13px;"><input type="checkbox" class="bk-cb" value="' + m.id + '" /> ' + bn(m.id) + '. ' + esc(m.name) + '</label>').join('') + '</div><button class="btn btn-primary btn-full" onclick="applyBulk()">নির্বাচিতদের ডিপোজিট আদায় করুন</button></div>';
        } else if (adminTab === 'updates') {
          html += '<div class="card"><div class="card-title" style="margin-bottom:8px;">🚀 নতুন অ্যাপ ভার্সন পাবলিশ করুন</div><label class="flbl">নতুন ভার্সন (বর্তমান: v' + esc(cfg.appVersion||'2.0.0') + ')</label><input id="up-v" class="input mono" placeholder="যেমন: 2.0.1" /><label class="flbl">আপডেট বিবরণ</label><textarea id="up-n" class="input" rows="3" placeholder="এই ভার্সনে কী পরিবর্তন হয়েছে..."></textarea><button class="btn btn-primary btn-full" onclick="publishUpdate()">আপডেট পাবলিশ করুন</button></div>';
          html += '<div class="card"><div class="grid2"><button class="btn btn-primary" onclick="downloadUpdatedHtml()">📲 HTML ডাউনলোড</button><button class="btn btn-outline" onclick="downloadJson()">📥 JSON প্যাকেজ</button></div></div>';
        } else if (adminTab === 'code') {
          html += '<div class="card"><div class="card-title" style="margin-bottom:6px;">সম্পূর্ণ অ্যাপ কোড (HTML)</div><textarea id="html-view" class="code-box" readonly>' + esc(buildFullHtml()) + '</textarea><div class="grid2" style="margin-top:10px;"><button class="btn btn-dark" onclick="copyText(document.getElementById(\\'html-view\\').value,\\'সম্পূর্ণ HTML কোড কপি হয়েছে!\\')">📋 HTML কপি</button><button class="btn btn-primary" onclick="downloadUpdatedHtml()">📲 HTML ডাউনলোড</button></div></div>';
          html += '<div class="card"><div class="card-title" style="margin-bottom:6px;">লাইভ ডেটাবেজ কোড (JSON)</div><textarea id="json-ed" class="code-box">' + esc(JSON.stringify(db, null, 2)) + '</textarea><div class="grid2" style="margin-top:10px;"><button class="btn btn-outline" onclick="copyText(document.getElementById(\\'json-ed\\').value,\\'JSON কপি হয়েছে!\\')">📋 JSON কপি</button><button class="btn btn-primary" onclick="saveJsonCode()">💾 JSON সেভ করুন</button></div></div>';
        } else if (adminTab === 'settings') {
          html += '<div class="card"><div class="card-title" style="margin-bottom:8px;">সেটিংস</div><label class="flbl">বিকাশ নাম্বার</label><input id="st-bk" class="input mono" value="' + esc(cfg.bkashNumber) + '" /><label class="flbl">এডমিন ফোন</label><input id="st-ph" class="input mono" value="' + esc(cfg.adminPhone) + '" /><label class="flbl">ফান্ড টার্গেট (০ = লুকানো)</label><input id="st-tg" type="number" class="input mono" value="' + Number(cfg.fundTarget||0) + '" /><label class="flbl">অনলাইন আপডেট JSON URL (ঐচ্ছিক)</label><input id="st-url" class="input" value="' + esc(cfg.updateManifestUrl||db.cloudSyncUrl||'') + '" /><label class="flbl">এডমিন নাম</label><input id="st-an" class="input" value="' + esc(db.adminName) + '" /><label class="flbl">নতুন এডমিন পিন</label><input id="st-pin" class="input" value="' + esc(db.adminPin||'@Shohag007') + '" /><button class="btn btn-primary btn-full" onclick="saveSettings()">সেটিংস সেভ করুন</button></div>';
        }
      }

      html += '</main>';

      /* Mobile Bottom Nav */
      html += '<nav class="bottom-nav no-print">'
        + '<button class="bnav-btn ' + (c.page==='home'?'active':'') + '" onclick="nav({page:\\'home\\'})">🏠<span>হোম</span></button>'
        + '<button class="bnav-btn ' + (c.page==='dailyPayments'?'active':'') + '" onclick="nav({page:\\'dailyPayments\\'})">📅<span>দৈনিক</span></button>'
        + '<button class="bnav-btn ' + (c.page==='rules'?'active':'') + '" onclick="nav({page:\\'rules\\'})">📘<span>নিয়মাবলি</span></button>'
        + (isAdmin
          ? '<button class="bnav-btn ' + (c.page==='admin'?'active':'') + '" onclick="nav({page:\\'admin\\'})">⚙️<span>এডমিন</span></button>'
          : '<button class="bnav-btn ' + (c.page==='updates'?'active':'') + '" onclick="nav({page:\\'updates\\'})">☁️<span>আপডেট</span></button>')
        + '</nav>';

      document.getElementById('app').innerHTML = html;
    }

    function renderMembersRows(list) {
      if (!list.length) return '<p style="text-align:center;color:var(--muted);padding:16px;">কোনো সদস্য পাওয়া যায়নি</p>';
      return list.map(m => '<div class="row clickable" onclick="nav({page:\\'member\\',id:' + m.id + '})"><div style="display:flex;gap:10px;align-items:center;min-width:0;"><div class="serial mono">' + bn(m.id) + '</div><div style="min-width:0"><div style="font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(m.name) + '</div><div class="mono" style="font-size:12px;color:var(--muted)">' + esc(m.phone) + '</div></div></div><div class="right" style="flex-shrink:0"><div class="mono" style="font-weight:800;color:var(--primary)">৳ ' + bn(totalOf(m)) + '</div><div class="mono" style="font-size:11px;color:var(--muted)">' + bn(kistiOf(m)) + ' টি কিস্তি</div></div></div>').join('');
    }
    window.renderMemberList = () => {
      const box = document.getElementById('m-list-box'); if (!box) return;
      const q = toEn(searchQ.trim()).toLowerCase();
      let list = db.members.slice().sort((a,b) => db.appConfig.sortBy === 'amount_desc' ? totalOf(b)-totalOf(a) : a.id-b.id);
      if (q) list = list.filter(m => m.name.toLowerCase().includes(q) || toEn(m.phone).includes(q) || String(m.id) === q);
      box.innerHTML = renderMembersRows(list);
    };
    window.toggleTheme = () => { db.appConfig.darkMode = !db.appConfig.darkMode; save(); };
    window.triggerManualPopup = () => {
      const p = (db.appConfig.automatedPopups||[]).find(x => x.enabled);
      if (p) showPopupModal(p); else toast('কোনো অটোমেটেড বার্তা চালু নেই');
    };
    window.addSingleDep = (id) => {
      const m = db.members.find(x => x.id === id); if (!m) return;
      const amt = Number(document.getElementById('d-amt').value); if (!amt || amt <= 0) return toast('সঠিক টাকা লিখুন');
      m.deposits.push({ id: 'd_' + Date.now(), date: document.getElementById('d-date').value || getTodayISO(), amount: amt, note: document.getElementById('d-note').value.trim() || 'দৈনিক কিস্তি' });
      save('৳' + bn(amt) + ' জমা হয়েছে');
    };
    window.addRangeDep = (id) => {
      const m = db.members.find(x => x.id === id); if (!m) return;
      const dates = getRangeDates(document.getElementById('dr-s').value, document.getElementById('dr-e').value);
      const amt = Number(document.getElementById('dr-a').value);
      const note = document.getElementById('dr-n').value.trim() || 'দৈনিক কিস্তি';
      if (!dates.length || !amt) return toast('সঠিক তারিখ ও টাকা দিন');
      const ex = getMemberCoverage(m).covered; let cnt = 0;
      dates.forEach((d, i) => { if (!ex.has(d)) { m.deposits.push({ id: 'd_' + Date.now() + '_' + i, date: d, amount: amt, note }); cnt++; } });
      save(cnt ? bn(cnt) + ' দিনের জমা আপডেট হয়েছে' : 'এই তারিখগুলোতে আগেই জমা রয়েছে');
    };
    window.delDep = (mid, did) => askConfirm('এই জমাটি মুছে ফেলতে চান?', () => {
      const m = db.members.find(x => x.id === mid); if (!m) return;
      m.deposits = m.deposits.filter(d => d.id !== did); save('মুছে ফেলা হয়েছে');
    });
    window.saveEditMember = (id) => {
      const m = db.members.find(x => x.id === id); if (!m) return;
      const nn = document.getElementById('em-name').value.trim();
      const np = document.getElementById('em-phone').value.trim();
      if (!nn) return toast('সদস্যের নাম লিখুন');
      m.name = nn;
      if (np) m.phone = np;
      editingMemberId = null;
      save('তথ্য আপডেট হয়েছে');
    };
    window.delMember = (id) => askConfirm('সদস্যকে মুছে ফেলতে চান?', () => {
      db.members = db.members.filter(x => x.id !== id); save('সদস্য মুছে ফেলা হয়েছে'); nav({ page: 'home' });
    });
    window.addMember = () => {
      const n = document.getElementById('nm-name').value.trim(), p = document.getElementById('nm-phone').value.trim();
      if (!n || !p) return toast('নাম ও মোবাইল দিন');
      const nid = db.members.length ? Math.max(...db.members.map(m => m.id)) + 1 : 1;
      db.members.push({ id: nid, name: n, phone: p, deposits: [] });
      save(n + ' যুক্ত হয়েছেন'); nav({ page: 'home' });
    };
    window.quickCollect = (id) => {
      const m = db.members.find(x => x.id === id); if (!m) return;
      m.deposits.push({ id: 'd_' + Date.now(), date: dailyDate, amount: 100, note: 'দৈনিক কিস্তি' });
      save(m.name + '-এর ৳১০০ জমা হয়েছে');
    };
    window.copyUnpaidList = () => {
      const unpaid = getDailyBreakdown(dailyDate).unpaid.map(x => x.m);
      const lines = ['BARAKAH MULTICARE HOSPITAL UNITY', 'তারিখ: ' + fmtDate(dailyDate), 'নন-পেমেন্টকারী: ' + bn(unpaid.length) + ' জন', '──────────']
        .concat(unpaid.map((m, i) => bn(i+1) + '. ' + m.name + ' (#' + bn(m.id) + ') - ' + m.phone));
      copyText(lines.join('\\n'), 'নন-পেমেন্ট তালিকা কপি হয়েছে!');
    };
    window.addDraw = () => {
      const id = Number(document.getElementById('dr-mem').value);
      const m = db.members.find(x => x.id === id); if (!m) return;
      db.draws.push({ id: 'dr_' + Date.now(), memberId: m.id, memberName: m.name, date: document.getElementById('dr-dt').value || getTodayISO(), amount: Number(document.getElementById('dr-amt').value||0), note: document.getElementById('dr-nt').value.trim() });
      save('ড্র বিজয়ী সেভ হয়েছে');
    };
    window.delDraw = (id) => askConfirm('ড্র মুছে ফেলতে চান?', () => { db.draws = db.draws.filter(d => d.id !== id); save('মুছে ফেলা হয়েছে'); });
    window.toggleBuiltin = (k) => { db.appConfig.enabledToggles[k] = !(db.appConfig.enabledToggles[k] !== false); save('টুগল আপডেট হয়েছে'); };
    window.addCustomToggle = () => {
      const t = document.getElementById('ct-t').value.trim(), c = document.getElementById('ct-c').value.trim();
      if (!t || !c) return toast('নাম ও বিবরণ লিখুন');
      db.appConfig.customToggles.push({ id: 'ct_' + Date.now(), title: t, subtitle: document.getElementById('ct-s').value.trim() || 'বিস্তারিত', content: c, contactPhone: document.getElementById('ct-p').value.trim() || undefined, enabled: true, createdAtMs: Date.now() });
      save('কাস্টম টুগল যুক্ত হয়েছে');
    };
    window.toggleCustom = (id) => { db.appConfig.customToggles.forEach(t => { if (t.id === id) t.enabled = !t.enabled; }); save('আপডেট হয়েছে'); };
    window.delCustom = (id) => askConfirm('কাস্টম টুগল মুছে ফেলতে চান?', () => { db.appConfig.customToggles = db.appConfig.customToggles.filter(t => t.id !== id); save('মুছে ফেলা হয়েছে'); });
    window.addRule = () => {
      const t = document.getElementById('nr-t').value.trim(), d = document.getElementById('nr-d').value.trim();
      if (!t || !d) return toast('শিরোনাম ও বিবরণ লিখুন');
      db.rules.push({ id: 'r_' + Date.now(), title: t, description: d }); save('নতুন নিয়ম যুক্ত হয়েছে');
    };
    window.saveEditRule = (id) => {
      const t = document.getElementById('er-t').value.trim(), d = document.getElementById('er-d').value.trim();
      if (!t || !d) return;
      db.rules.forEach(r => { if (r.id === id) { r.title = t; r.description = d; } });
      editingRuleId = null; save('নিয়ম আপডেট হয়েছে');
    };
    window.moveRule = (idx, dir) => {
      const n = idx + dir; if (n < 0 || n >= db.rules.length) return;
      const item = db.rules.splice(idx, 1)[0]; db.rules.splice(n, 0, item); save();
    };
    window.delRule = (id) => askConfirm('নিয়মটি মুছতে চান?', () => { db.rules = db.rules.filter(r => r.id !== id); save('নিয়ম মুছে ফেলা হয়েছে'); });
    window.resetRules = () => askConfirm('ডিফল্ট ১৩টি নিয়মে ফিরতে চান?', () => { db.rules = DEFAULT_RULES_SEED.map(r => Object.assign({}, r)); save('ডিফল্ট ১৩টি নিয়ম রিস্টোর হয়েছে'); });
    window.pinNotice = () => {
      const b = document.getElementById('pn-b').value.trim(); if (!b) return toast('নোটিশ লিখুন');
      const d = document.getElementById('pn-d').value;
      const now = Date.now();
      db.appConfig.pinnedNotice = { id: 'pin_' + now, title: document.getElementById('pn-t').value.trim() || 'জরুরি নোটিশ', body: b, duration: d, createdAtMs: now, expiresAtMs: now + durMs(d), pinnedBy: db.adminName };
      save('নোটিশ পিন করা হয়েছে!');
    };
    window.unpinNotice = () => { db.appConfig.pinnedNotice = null; save('পিন সরানো হয়েছে'); };
    window.addAutoPopup = () => {
      const t = document.getElementById('ap-t').value.trim(), m = document.getElementById('ap-m').value.trim();
      if (!t || !m) return toast('শিরোনাম ও মেসেজ দিন');
      const act = document.getElementById('ap-act').value;
      const labels = { dailyPayments: 'দৈনিক তালিকা দেখুন', payment: 'পেমেন্ট করুন', rules: 'নিয়মাবলি পড়ুন', updates: 'আপডেট দেখুন' };
      db.appConfig.automatedPopups.push({ id: 'pop_' + Date.now(), title: t, message: m, triggerType: document.getElementById('ap-tr').value, scheduleTime: document.getElementById('ap-tm').value || '19:30', enabled: true, frequency: 'once_per_day', actionLabel: act ? labels[act] : undefined, actionTarget: act || undefined });
      save('অটো পপ-আপ যুক্ত হয়েছে');
    };
    window.testPopupById = (id) => { const p = (db.appConfig.automatedPopups||[]).find(x => x.id === id); if (p) showPopupModal(p); };
    window.togglePopup = (id) => { db.appConfig.automatedPopups.forEach(p => { if (p.id === id) p.enabled = !p.enabled; }); save('আপডেট হয়েছে'); };
    window.delPopup = (id) => { db.appConfig.automatedPopups = db.appConfig.automatedPopups.filter(p => p.id !== id); save('পপ-আপ মুছে ফেলা হয়েছে'); };
    window.saveTickers = () => { db.appConfig.homeTickerText = document.getElementById('tk-h').value.trim(); db.appConfig.bkashTickerText = document.getElementById('tk-b').value.trim(); save('রানিং বার আপডেট হয়েছে'); };
    window.bulkSelAll = (v) => document.querySelectorAll('.bk-cb').forEach(cb => cb.checked = v);
    window.applyBulk = () => {
      const ids = Array.from(document.querySelectorAll('.bk-cb:checked')).map(cb => Number(cb.value));
      const dates = getRangeDates(document.getElementById('bk-s').value, document.getElementById('bk-e').value);
      const amt = Number(document.getElementById('bk-a').value);
      const note = document.getElementById('bk-n').value.trim() || 'দৈনিক কিস্তি';
      if (!ids.length || !dates.length || !amt) return toast('সদস্য, তারিখ ও টাকা নির্বাচন করুন');
      let total = 0;
      ids.forEach(id => {
        const m = db.members.find(x => x.id === id); if (!m) return;
        const ex = getMemberCoverage(m).covered;
        dates.forEach((d, i) => { if (!ex.has(d)) { m.deposits.push({ id: 'd_' + Date.now() + '_' + id + '_' + i, date: d, amount: amt, note }); total++; } });
      });
      save(total ? 'মোট ' + bn(total) + 'টি কিস্তি আদায় হয়েছে!' : 'আগেই জমা রয়েছে');
    };
    window.publishUpdate = () => {
      const v = document.getElementById('up-v').value.trim(), n = document.getElementById('up-n').value.trim();
      if (!v || !n) return toast('ভার্সন ও বিবরণ লিখুন');
      db.appConfig.appVersion = v;
      db.appConfig.changelog.unshift({ version: v, releaseDate: getTodayISO(), notes: n, publishedAtMs: Date.now() });
      save('নতুন ভার্সন v' + v + ' পাবলিশ হয়েছে!');
    };
    window.saveJsonCode = () => {
      try {
        const parsed = JSON.parse(document.getElementById('json-ed').value);
        const p = (parsed && parsed.data && typeof parsed.data === 'object') ? parsed.data : parsed;
        if (!Array.isArray(p.members)) throw 0;
        const keepPin = db.adminPin;
        db = normalizeDb(p);
        if (!p.adminPin) db.adminPin = keepPin;
        save('JSON আপডেট হয়েছে!');
      } catch(e) { toast('JSON সিনট্যাক্স সঠিক নয়'); }
    };
    window.saveSettings = () => {
      db.appConfig.bkashNumber = document.getElementById('st-bk').value.trim() || '01303768168';
      db.appConfig.adminPhone = document.getElementById('st-ph').value.trim() || '01607703566';
      db.appConfig.fundTarget = Number(document.getElementById('st-tg').value || 0);
      db.appConfig.updateManifestUrl = document.getElementById('st-url').value.trim();
      db.adminName = document.getElementById('st-an').value.trim() || db.adminName;
      const np = document.getElementById('st-pin').value.trim();
      if (np) {
        if (np.length < 6) return toast('অ্যাডমিন পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে!');
        if (isPhoneColliding(np)) return toast('নিরাপত্তার কারণে কোনো মেম্বার বা এডমিনের ফোন নম্বর পাসওয়ার্ড হিসেবে সেট করা যাবে না!');
        db.adminPin = np;
      }
      save('সেটিংস সেভ হয়েছে!');
    };
    window.shareSummary = () => {
      const st = globalStats();
      const txt = 'BARAKAH MULTICARE HOSPITAL UNITY\\nসদস্য: ' + bn(db.members.length) + ' জন\\nমোট কিস্তি: ' + bn(st.kisti) + ' টি\\nটোটাল ফান্ড: ৳ ' + bn(st.fund) + '\\nনিট ব্যালেন্স: ৳ ' + bn(st.net);
      if (navigator.share) navigator.share({ title: 'BARAKAH UNITY', text: txt }).catch(()=>{});
      else copyText(txt, 'সামারি কপি হয়েছে!');
    };

    render();
  </script>
</body>
</html>`;
}
