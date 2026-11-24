import {
  BLOCK_FUND_PER_MEMBER_CAP,
  DAILY_KISTI_AMOUNT,
  formatDateBn,
  getMemberAdvanceCoverage,
  getMemberDueAndBlockFund,
  getMemberInstallments,
  getMemberTotal,
  getTodayISO,
  toBn,
} from '../data/defaultData';
import type { Deposit, Member } from '../types/unity';
import { isSafeAppIconDataUrl, isSafeRasterPhotoDataUrl } from './avatarLibrary';

function escapeHtml(str: string): string {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function triggerBlobDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 2500);
}

/**
 * Produces a deterministic, formal receipt reference number.
 */
export function generateReceiptNumber(member: Member, singleDeposit?: Deposit | null): string {
  const datePart = (singleDeposit?.date || getTodayISO()).replace(/[^0-9]/g, '').slice(0, 8) || '20261124';
  const idPart = String(member.id).padStart(2, '0');
  if (singleDeposit) {
    const txCode = singleDeposit.id.replace(/[^a-zA-Z0-9]/g, '').slice(-4).toUpperCase() || 'TX01';
    return `BMHU-${datePart}-M${idPart}-${txCode}`;
  }
  return `BMHU-${datePart}-M${idPart}-ALL`;
}

/**
 * Builds a clean, formal, self-contained, A4 print-ready HTML receipt document.
 * Works for both full member statements and single-transaction official vouchers.
 */
export function buildReceiptHtml(
  member: Member,
  adminName: string,
  singleDeposit?: Deposit | null,
  appLogoUrl?: string
): string {
  const todayISO = getTodayISO();
  const total = getMemberTotal(member);
  const kisti = getMemberInstallments(member);
  const dueBlock = getMemberDueAndBlockFund(member, todayISO);
  const coverage = getMemberAdvanceCoverage(member);
  const todayBn = formatDateBn(todayISO);
  const receiptNo = generateReceiptNumber(member, singleDeposit);
  const sorted = [...member.deposits].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  const displayedDeposits = singleDeposit ? [singleDeposit] : sorted;
  const displayedTotal = singleDeposit ? singleDeposit.amount : total;
  const isSingle = Boolean(singleDeposit);
  const singleInstallments = singleDeposit ? Math.max(1, Math.round(singleDeposit.amount / DAILY_KISTI_AMOUNT)) : 0;

  const advanceSummary =
    coverage.paidThroughDate && coverage.paidThroughDate > todayISO
      ? `অগ্রিম কভার: ${formatDateBn(coverage.paidThroughDate)} পর্যন্ত`
      : dueBlock.dueAmount > 0
        ? `মোট বকেয়া: ৳ ${toBn(dueBlock.dueAmount)} (${toBn(dueBlock.dueDays)} দিন)`
        : 'বকেয়া অবস্থা: হালনাগাদ (কোনো বকেয়া নেই)';

  const rowsHtml = displayedDeposits.length
    ? displayedDeposits
        .map(
          (dep, idx) => `
        <tr>
          <td class="mono muted">${toBn(idx + 1)}</td>
          <td class="mono">${escapeHtml(formatDateBn(dep.date))}</td>
          <td>
            <div class="desc-main">${escapeHtml(dep.note || 'দৈনিক কিস্তি')}</div>
            <div class="desc-sub mono">Ref: ${escapeHtml(dep.id.slice(-10).toUpperCase())}</div>
          </td>
          <td class="right mono bold">৳ ${toBn(dep.amount)}</td>
        </tr>`
        )
        .join('')
    : `<tr><td colspan="4" class="empty">এখনো কোনো লেনদেন যুক্ত করা হয়নি।</td></tr>`;

  const docTitle = isSingle
    ? `লেনদেন রসিদ ${receiptNo} - ${member.name}`
    : `অফিশিয়াল হিসাব রসিদ ${receiptNo} - ${member.name}`;

  return `<!doctype html>
<html lang="bn">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(docTitle)}</title>
  <style>
    @page { size: A4 portrait; margin: 12mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Noto Sans Bengali', 'Hind Siliguri', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #f1f5f9;
      color: #0f172a;
      padding: 20px 14px 36px;
      line-height: 1.5;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .actions-bar {
      max-width: 760px;
      margin: 0 auto 14px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 12px;
      padding: 10px 14px;
    }
    .actions-hint {
      font-size: 12.5px;
      color: #475569;
    }
    .btn {
      padding: 9px 18px;
      border-radius: 9px;
      border: none;
      background: #0f766e;
      color: #ffffff;
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
    }
    .btn:hover { background: #115e59; }
    .sheet {
      max-width: 760px;
      margin: 0 auto;
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 10px 32px rgba(15, 23, 42, 0.08);
    }
    .header {
      background: linear-gradient(135deg, #0f766e 0%, #115e59 100%);
      color: #ffffff;
      padding: 24px 28px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 16px;
      flex-wrap: wrap;
    }
    .brand-lockup {
      display: flex;
      align-items: center;
      gap: 14px;
    }
    .crest {
      width: 46px;
      height: 46px;
      border-radius: 12px;
      background: rgba(255, 255, 255, 0.14);
      border: 1px solid rgba(255, 255, 255, 0.28);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .header h1 {
      font-size: 18px;
      font-weight: 800;
      letter-spacing: 0.3px;
      line-height: 1.25;
    }
    .header .sub {
      font-size: 12px;
      margin-top: 3px;
      color: rgba(255, 255, 255, 0.88);
    }
    .admin-tag {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 10.5px;
      font-weight: 500;
      letter-spacing: 0.4px;
      opacity: 0.52;
      margin-left: 5px;
    }
    .doc-badge {
      text-align: right;
      font-size: 12px;
      color: rgba(255, 255, 255, 0.94);
    }
    .doc-type {
      font-size: 13px;
      font-weight: 700;
      letter-spacing: 0.2px;
    }
    .receipt-meta-bar {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 12px;
      background: #f8fafc;
      border-bottom: 1px solid #e2e8f0;
      padding: 13px 28px;
    }
    .meta-cell-lbl {
      font-size: 11px;
      color: #64748b;
      font-weight: 600;
    }
    .meta-cell-val {
      font-size: 12.5px;
      color: #0f172a;
      font-weight: 700;
      margin-top: 2px;
    }
    .status-verified {
      color: #047857;
    }
    .body { padding: 24px 28px 26px; }
    .member-box {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      flex-wrap: wrap;
      gap: 12px;
      padding-bottom: 16px;
      border-bottom: 1px solid #e2e8f0;
      margin-bottom: 18px;
    }
    .member-label {
      font-size: 11px;
      color: #64748b;
      font-weight: 600;
    }
    .member-name {
      font-size: 19px;
      font-weight: 800;
      color: #0f172a;
      margin-top: 2px;
    }
    .member-sub {
      font-size: 12.5px;
      color: #475569;
      margin-top: 3px;
    }
    .stats {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 12px;
      margin-bottom: 20px;
    }
    .stat-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 12px 14px;
    }
    .stat-card.primary {
      background: #f0fdfa;
      border-color: #99f6e4;
    }
    .stat-lbl {
      font-size: 11.5px;
      color: #475569;
      font-weight: 600;
    }
    .stat-card.primary .stat-lbl { color: #0f766e; }
    .stat-val {
      font-size: 20px;
      font-weight: 800;
      color: #0f172a;
      margin-top: 3px;
    }
    .stat-sub {
      font-size: 11px;
      color: #64748b;
      margin-top: 2px;
    }
    .section-title {
      font-size: 13px;
      font-weight: 700;
      color: #0f172a;
      margin-bottom: 10px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .section-note {
      font-size: 11.5px;
      font-weight: 500;
      color: #64748b;
    }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th, td { padding: 10px 10px; border-bottom: 1px solid #e2e8f0; text-align: left; vertical-align: top; }
    th {
      background: #f8fafc;
      color: #475569;
      font-size: 11.5px;
      font-weight: 700;
      border-top: 1px solid #e2e8f0;
    }
    .desc-main { font-weight: 600; color: #0f172a; }
    .desc-sub { font-size: 11px; color: #64748b; margin-top: 2px; }
    .right { text-align: right; }
    .muted { color: #64748b; }
    .bold { font-weight: 700; color: #0f766e; }
    .mono { font-variant-numeric: tabular-nums; }
    .empty { text-align: center; color: #64748b; padding: 24px; }
    tfoot td {
      background: #f0fdfa;
      color: #0f172a;
      font-weight: 800;
      border-top: 2px solid #0f766e;
      border-bottom: 1px solid #99f6e4;
      padding: 12px 10px;
    }
    .standing-strip {
      margin-top: 16px;
      padding: 11px 14px;
      border-radius: 10px;
      border: 1px solid #e2e8f0;
      background: #f8fafc;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 10px;
      font-size: 12px;
      color: #334155;
    }
    .footer {
      margin-top: 34px;
      padding-top: 18px;
      border-top: 1px solid #e2e8f0;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      gap: 20px;
      flex-wrap: wrap;
      font-size: 11.5px;
      color: #475569;
    }
    .sig-box {
      min-width: 190px;
      text-align: center;
    }
    .sig-line {
      border-top: 1px solid #64748b;
      padding: 7px 12px 0;
      font-weight: 700;
      color: #0f172a;
      font-size: 12px;
    }
    .sig-sub {
      font-size: 10.5px;
      color: #64748b;
      margin-top: 2px;
    }
    .sig-line .admin-tag { color: #0f172a; opacity: 0.45; }
    .legal-foot {
      margin-top: 18px;
      padding-top: 10px;
      border-top: 1px dashed #e2e8f0;
      display: flex;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 8px;
      font-size: 11px;
      color: #64748b;
    }
    @media (max-width: 640px) {
      .header { padding: 18px; }
      .receipt-meta-bar { grid-template-columns: repeat(2, minmax(0, 1fr)); padding: 12px 18px; }
      .body { padding: 18px; }
      .stats { grid-template-columns: 1fr; }
    }
    @media print {
      body { background: #ffffff; padding: 0; }
      .actions-bar { display: none !important; }
      .sheet { box-shadow: none; border: 1px solid #cbd5e1; max-width: 100%; border-radius: 0; }
    }
  </style>
</head>
<body>
  <div class="actions-bar">
    <span class="actions-hint">অফিশিয়াল প্রিন্ট বা PDF হিসেবে সংরক্ষণ করতে ডানপাশের বাটনে ক্লিক করুন।</span>
    <button class="btn" onclick="window.print()">প্রিন্ট / Save as PDF</button>
  </div>
  <div class="sheet">
    <div class="header">
      <div class="brand-lockup">
        <div class="crest" aria-hidden="true" style="overflow:hidden;border-radius:50%;">
          ${
            isSafeRasterPhotoDataUrl(appLogoUrl) || isSafeAppIconDataUrl(appLogoUrl)
              ? `<img src="${appLogoUrl}" alt="App Logo" style="width:100%;height:100%;object-fit:cover;display:block;" />`
              : `<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 2L4 5v6c0 5.25 3.4 10.1 8 11 4.6-.9 8-5.75 8-11V5l-8-3z"/>
            <path d="M9 12l2 2 4-4"/>
          </svg>`
          }
        </div>
        <div>
          <h1>BARAKAH MULTICARE HOSPITAL UNITY</h1>
          <p class="sub">
            অফিশিয়াল ডিপোজিট রসিদ · ${escapeHtml(adminName)}<span class="admin-tag">Admin</span>
          </p>
        </div>
      </div>
      <div class="doc-badge">
        <div class="doc-type">${isSingle ? 'একক লেনদেন রসিদ' : 'সম্পূর্ণ হিসাব বিবরণী'}</div>
        <div class="mono" style="margin-top:2px;">Official Receipt</div>
      </div>
    </div>

    <div class="receipt-meta-bar">
      <div>
        <div class="meta-cell-lbl">রসিদ নম্বর</div>
        <div class="meta-cell-val mono">${escapeHtml(receiptNo)}</div>
      </div>
      <div>
        <div class="meta-cell-lbl">ইস্যু তারিখ</div>
        <div class="meta-cell-val mono">${escapeHtml(todayBn)}</div>
      </div>
      <div>
        <div class="meta-cell-lbl">সদস্য আইডি</div>
        <div class="meta-cell-val mono">#${toBn(member.id)}</div>
      </div>
      <div>
        <div class="meta-cell-lbl">স্ট্যাটাস</div>
        <div class="meta-cell-val status-verified">✓ পরিশোধিত / Verified</div>
      </div>
    </div>

    <div class="body">
      <div class="member-box">
        <div>
          <div class="member-label">সদস্যের বিবরণ (Member Details)</div>
          <div class="member-name">${escapeHtml(member.name)}</div>
          <div class="member-sub mono">মোবাইল: ${escapeHtml(member.phone)} · আইডি #${toBn(member.id)}</div>
        </div>
        <div style="text-align:right;">
          <div class="member-label">আদায়কারী ও অনুমোদন</div>
          <div class="member-sub" style="font-weight:700;color:#0f172a;">
            ${escapeHtml(adminName)}<span class="admin-tag" style="color:#0f172a;opacity:0.45;">Admin</span>
          </div>
          <div class="member-sub">মোট জমার সংখ্যা: ${toBn(sorted.length)} বার</div>
        </div>
      </div>

      <div class="stats">
        <div class="stat-card primary">
          <div class="stat-lbl">${isSingle ? 'এই রসিদের জমার পরিমাণ' : 'মোট জমাকৃত টাকা'}</div>
          <div class="stat-val mono">৳ ${toBn(displayedTotal)}</div>
          <div class="stat-sub mono">${
            isSingle
              ? `তারিখ: ${escapeHtml(formatDateBn(singleDeposit!.date))}`
              : `মোট ${toBn(sorted.length)}টি লেনদেন`
          }</div>
        </div>
        <div class="stat-card">
          <div class="stat-lbl">${isSingle ? 'সদস্যের সর্বমোট জমা' : 'মোট কিস্তি (১০০৳)'}</div>
          <div class="stat-val mono">${isSingle ? `৳ ${toBn(total)}` : `${toBn(kisti)} টি`}</div>
          <div class="stat-sub mono">${isSingle ? `এই রসিদে ${toBn(singleInstallments)} কিস্তি · মোট ${toBn(kisti)} টি` : 'দৈনিক কিস্তি হার ৳ ১০০'}</div>
        </div>
        <div class="stat-card">
          <div class="stat-lbl">১ম মাসের ব্লক ফান্ড</div>
          <div class="stat-val mono">৳ ${toBn(dueBlock.blockFundAmount)}</div>
          <div class="stat-sub mono">সর্বোচ্চ সীমা ৳ ${toBn(BLOCK_FUND_PER_MEMBER_CAP)}</div>
        </div>
      </div>

      <div class="section-title">
        <span>${isSingle ? 'লেনদেনের বিস্তারিত তথ্য' : 'তারিখ অনুসারে জমার তালিকা'}</span>
        <span class="section-note mono">${toBn(displayedDeposits.length)}টি এন্ট্রি</span>
      </div>

      <table>
        <thead>
          <tr>
            <th style="width:44px">#</th>
            <th style="width:140px">তারিখ</th>
            <th>বিবরণ ও রেফারেন্স</th>
            <th class="right" style="width:120px">টাকা</th>
          </tr>
        </thead>
        <tbody>${rowsHtml}</tbody>
        <tfoot>
          <tr>
            <td colspan="3">${isSingle ? 'এই রসিদে পরিশোধিত মোট টাকা' : `সর্বমোট জমা (${toBn(sorted.length)} বার)`}</td>
            <td class="right mono">৳ ${toBn(displayedTotal)}</td>
          </tr>
        </tfoot>
      </table>

      <div class="standing-strip">
        <span><strong>অ্যাকাউন্ট অবস্থা:</strong> ${escapeHtml(advanceSummary)}</span>
        <span class="mono"><strong>সর্বমোট স্থিতি:</strong> ৳ ${toBn(total)}</span>
      </div>

      <div class="footer">
        <div class="sig-box">
          <div class="sig-line">${escapeHtml(member.name)}</div>
          <div class="sig-sub">সদস্যের স্বাক্ষর (Member)</div>
        </div>
        <div class="sig-box">
          <div class="sig-line">
            ${escapeHtml(adminName)}<span class="admin-tag">Admin</span>
          </div>
          <div class="sig-sub">অনুমোদিত স্বাক্ষর (Authorized)</div>
        </div>
      </div>

      <div class="legal-foot">
        <span>সিস্টেম জেনারেটেড অফিশিয়াল রসিদ · BARAKAH MULTICARE HOSPITAL UNITY</span>
        <span class="mono">${escapeHtml(receiptNo)}</span>
      </div>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Generates a high-resolution PNG Blob of the official receipt using HTML5 Canvas.
 * Works reliably across Android, iOS, Desktop PC, and sandboxed iframes.
 */
export async function generateReceiptPngBlob(
  member: Member,
  adminName: string,
  singleDeposit?: Deposit | null,
  appLogoUrl?: string
): Promise<Blob> {
  if (document.fonts && document.fonts.ready) {
    try {
      await document.fonts.ready;
    } catch {
      // Continue with system fallback fonts
    }
  }

  let customLogoImg: HTMLImageElement | null = null;
  const validReceiptLogoUrl =
    isSafeRasterPhotoDataUrl(appLogoUrl) || isSafeAppIconDataUrl(appLogoUrl) ? appLogoUrl : null;
  if (validReceiptLogoUrl) {
    try {
      customLogoImg = await new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('logo load failed'));
        img.src = validReceiptLogoUrl;
      });
    } catch {
      customLogoImg = null;
    }
  }

  const total = getMemberTotal(member);
  const kisti = getMemberInstallments(member);
  const today = formatDateBn(getTodayISO());
  const receiptNo = generateReceiptNumber(member, singleDeposit);
  const sorted = [...member.deposits].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  const displayedDeposits = singleDeposit ? [singleDeposit] : sorted;
  const displayedTotal = singleDeposit ? singleDeposit.amount : total;
  const isSingle = Boolean(singleDeposit);

  const dpr = 2;
  const width = 760;
  const headerH = 128;
  const metaBarH = 44;
  const memberInfoH = 88;
  const statsH = 98;
  const tableHeaderH = 44;
  const rowH = 40;
  const visibleRows = Math.max(1, displayedDeposits.length);
  const totalRowH = 48;
  const footerH = 92;
  const padX = 36;
  const height =
    headerH + metaBarH + memberInfoH + statsH + tableHeaderH + visibleRows * rowH + totalRowH + footerH + 40;

  const canvas = document.createElement('canvas');
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas context unavailable');
  }
  ctx.scale(dpr, dpr);

  const fontBn = '"Noto Sans Bengali", "Hind Siliguri", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  const fontEn = '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

  // White card background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  // Outer subtle border
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, width - 2, height - 2);

  // Header gradient banner
  const grad = ctx.createLinearGradient(0, 0, width, headerH);
  grad.addColorStop(0, '#0f766e');
  grad.addColorStop(1, '#115e59');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, headerH);

  let titleStartX = padX;
  if (customLogoImg) {
    const logoSize = 54;
    const logoX = padX;
    const logoY = 30;
    ctx.save();
    ctx.beginPath();
    ctx.arc(logoX + logoSize / 2, logoY + logoSize / 2, logoSize / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(customLogoImg, logoX, logoY, logoSize, logoSize);
    ctx.restore();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(logoX + logoSize / 2, logoY + logoSize / 2, logoSize / 2, 0, Math.PI * 2);
    ctx.stroke();
    titleStartX = padX + logoSize + 14;
  }

  // Header brand title
  ctx.fillStyle = '#ffffff';
  ctx.font = `700 ${customLogoImg ? '18.5px' : '20px'} ${fontBn}`;
  ctx.fillText('BARAKAH MULTICARE HOSPITAL UNITY', titleStartX, 46);

  // Subtitle + Admin name with faded English "Admin" suffix
  ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
  ctx.font = `500 13.5px ${fontBn}`;
  const subPrefix = `${isSingle ? 'একক লেনদেন রসিদ' : 'অফিশিয়াল ডিপোজিট রসিদ'} · ${adminName}`;
  ctx.fillText(subPrefix, titleStartX, 76);
  const subWidth = ctx.measureText(subPrefix).width;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.50)';
  ctx.font = `500 11.5px ${fontEn}`;
  ctx.fillText(' Admin', titleStartX + subWidth + 3, 76);

  // Right header metadata
  ctx.textAlign = 'right';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.94)';
  ctx.font = `500 13px ${fontBn}`;
  ctx.fillText(`তারিখ: ${today}`, width - padX, 46);
  ctx.font = `700 14px ${fontBn}`;
  ctx.fillText(`সদস্য আইডি: #${toBn(member.id)}`, width - padX, 72);
  ctx.textAlign = 'left';

  // Meta Strip (Receipt No & Verified status)
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(2, headerH, width - 4, metaBarH);
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, headerH + metaBarH);
  ctx.lineTo(width, headerH + metaBarH);
  ctx.stroke();

  ctx.fillStyle = '#475569';
  ctx.font = `600 12.5px ${fontEn}`;
  ctx.fillText(`Receipt No: ${receiptNo}`, padX, headerH + 27);
  ctx.textAlign = 'right';
  ctx.fillStyle = '#047857';
  ctx.font = `700 12.5px ${fontBn}`;
  ctx.fillText('✓ পরিশোধিত · Verified', width - padX, headerH + 27);
  ctx.textAlign = 'left';

  // Member details section
  let y = headerH + metaBarH + 34;
  ctx.fillStyle = '#0f172a';
  ctx.font = `700 21px ${fontBn}`;
  ctx.fillText(member.name, padX, y);

  ctx.fillStyle = '#475569';
  ctx.font = `500 14px ${fontBn}`;
  ctx.fillText(`মোবাইল: ${member.phone}`, padX, y + 26);

  ctx.textAlign = 'right';
  ctx.fillStyle = '#475569';
  ctx.font = `600 13.5px ${fontBn}`;
  ctx.fillText(
    isSingle ? `সর্বমোট জমা: ৳ ${toBn(total)}` : `মোট এন্ট্রি: ${toBn(sorted.length)} বার`,
    width - padX,
    y + 12
  );
  ctx.textAlign = 'left';

  // Divider line
  y += 44;
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(padX, y);
  ctx.lineTo(width - padX, y);
  ctx.stroke();

  // Two summary cards
  y += 18;
  const cardGap = 16;
  const cardW = (width - padX * 2 - cardGap) / 2;
  const cardH = 74;

  const drawStatCard = (x: number, label: string, value: string) => {
    ctx.fillStyle = '#f0fdfa';
    ctx.strokeStyle = '#99f6e4';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(x, y, cardW, cardH, 12);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#0f766e';
    ctx.font = `600 13px ${fontBn}`;
    ctx.fillText(label, x + 18, y + 26);

    ctx.fillStyle = '#0f172a';
    ctx.font = `700 24px ${fontBn}`;
    ctx.fillText(value, x + 18, y + 58);
  };

  drawStatCard(padX, isSingle ? 'এই রসিদের জমা' : 'মোট জমাকৃত টাকা', `৳ ${toBn(displayedTotal)}`);
  drawStatCard(
    padX + cardW + cardGap,
    isSingle ? 'সর্বমোট কিস্তি' : 'মোট কিস্তি (১০০৳)',
    `${toBn(kisti)} টি`
  );

  // Table header
  y += cardH + 22;
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(padX, y, width - padX * 2, tableHeaderH);
  ctx.strokeStyle = '#e2e8f0';
  ctx.strokeRect(padX, y, width - padX * 2, tableHeaderH);

  ctx.fillStyle = '#475569';
  ctx.font = `700 13px ${fontBn}`;
  ctx.fillText('#', padX + 14, y + 27);
  ctx.fillText('তারিখ', padX + 62, y + 27);
  ctx.fillText('বিবরণ', padX + 210, y + 27);
  ctx.textAlign = 'right';
  ctx.fillText('টাকা', width - padX - 16, y + 27);
  ctx.textAlign = 'left';

  y += tableHeaderH;

  // Table rows
  if (displayedDeposits.length === 0) {
    ctx.fillStyle = '#64748b';
    ctx.font = `500 14px ${fontBn}`;
    ctx.textAlign = 'center';
    ctx.fillText('এখনো কোনো টাকা জমা দেওয়া হয়নি।', width / 2, y + 25);
    ctx.textAlign = 'left';
    y += rowH;
  } else {
    displayedDeposits.forEach((dep, idx) => {
      if (idx % 2 === 1) {
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(padX, y, width - padX * 2, rowH);
      }
      ctx.strokeStyle = '#f1f5f9';
      ctx.beginPath();
      ctx.moveTo(padX, y + rowH);
      ctx.lineTo(width - padX, y + rowH);
      ctx.stroke();

      ctx.fillStyle = '#64748b';
      ctx.font = `500 13px ${fontBn}`;
      ctx.fillText(toBn(idx + 1), padX + 14, y + 25);

      ctx.fillStyle = '#1e293b';
      ctx.fillText(formatDateBn(dep.date), padX + 62, y + 25);

      const noteText = (dep.note || 'দৈনিক কিস্তি').slice(0, 38);
      ctx.fillStyle = '#475569';
      ctx.fillText(noteText, padX + 210, y + 25);

      ctx.textAlign = 'right';
      ctx.fillStyle = '#0f766e';
      ctx.font = `700 14px ${fontBn}`;
      ctx.fillText(`৳ ${toBn(dep.amount)}`, width - padX - 16, y + 25);
      ctx.textAlign = 'left';

      y += rowH;
    });
  }

  // Total Footer Row
  ctx.fillStyle = '#f0fdfa';
  ctx.fillRect(padX, y, width - padX * 2, totalRowH);
  ctx.strokeStyle = '#0f766e';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(padX, y);
  ctx.lineTo(width - padX, y);
  ctx.stroke();

  ctx.fillStyle = '#0f172a';
  ctx.font = `700 15px ${fontBn}`;
  ctx.fillText(
    isSingle ? 'এই রসিদে পরিশোধিত মোট টাকা' : `সর্বমোট জমা (${toBn(sorted.length)} বার)`,
    padX + 14,
    y + 30
  );
  ctx.textAlign = 'right';
  ctx.fillStyle = '#0f766e';
  ctx.font = `700 16px ${fontBn}`;
  ctx.fillText(`৳ ${toBn(displayedTotal)}`, width - padX - 16, y + 30);
  ctx.textAlign = 'left';

  // Signature Footer
  y += totalRowH + 46;
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(padX, y - 16);
  ctx.lineTo(width - padX, y - 16);
  ctx.stroke();

  ctx.fillStyle = '#64748b';
  ctx.font = `500 12px ${fontBn}`;
  ctx.fillText('সিস্টেম জেনারেটেড রসিদ · BARAKAH MULTICARE HOSPITAL UNITY', padX, y + 14);

  // Right signature with faded English "Admin" at end of name
  const sigPrefix = `অনুমোদিত স্বাক্ষর · ${adminName}`;
  ctx.font = `500 11px ${fontEn}`;
  const adminBadgeWidth = ctx.measureText(' Admin').width;
  ctx.font = `700 12.5px ${fontBn}`;
  const sigPrefixWidth = ctx.measureText(sigPrefix).width;
  const sigStartX = width - padX - sigPrefixWidth - adminBadgeWidth;

  ctx.strokeStyle = '#94a3b8';
  ctx.beginPath();
  ctx.moveTo(sigStartX - 6, y - 2);
  ctx.lineTo(width - padX, y - 2);
  ctx.stroke();

  ctx.fillStyle = '#0f172a';
  ctx.font = `700 12.5px ${fontBn}`;
  ctx.fillText(sigPrefix, sigStartX, y + 14);

  ctx.fillStyle = 'rgba(15, 23, 42, 0.42)';
  ctx.font = `500 11px ${fontEn}`;
  ctx.fillText(' Admin', sigStartX + sigPrefixWidth + 2, y + 14);

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Failed to render PNG receipt'));
      },
      'image/png',
      1.0
    );
  });
}

export async function downloadReceiptPng(
  member: Member,
  adminName: string,
  singleDeposit?: Deposit | null,
  appLogoUrl?: string
): Promise<string> {
  const blob = await generateReceiptPngBlob(member, adminName, singleDeposit, appLogoUrl);
  const receiptNo = generateReceiptNumber(member, singleDeposit);
  const filename = `${receiptNo}.png`;
  triggerBlobDownload(blob, filename);
  return filename;
}

export function downloadReceiptHtml(
  member: Member,
  adminName: string,
  singleDeposit?: Deposit | null,
  appLogoUrl?: string
): string {
  const html = buildReceiptHtml(member, adminName, singleDeposit, appLogoUrl);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const receiptNo = generateReceiptNumber(member, singleDeposit);
  const filename = `${receiptNo}.html`;
  triggerBlobDownload(blob, filename);
  return filename;
}

/**
 * Reliable Print / Save as PDF via hidden iframe (avoids popup blockers & blank mobile print views).
 * Returns true if print dialog was triggered, or false if the environment blocks printing.
 */
export function printReceiptReliably(
  member: Member,
  adminName: string,
  singleDeposit?: Deposit | null,
  appLogoUrl?: string
): boolean {
  try {
    const html = buildReceiptHtml(member, adminName, singleDeposit, appLogoUrl);
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.setAttribute('aria-hidden', 'true');
    document.body.appendChild(iframe);

    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc || !iframe.contentWindow) {
      iframe.remove();
      window.print();
      return true;
    }

    doc.open();
    doc.write(html);
    doc.close();

    window.setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch {
        window.print();
      }
      window.setTimeout(() => {
        iframe.remove();
      }, 2500);
    }, 350);

    return true;
  } catch {
    try {
      window.print();
      return true;
    } catch {
      return false;
    }
  }
}

export function buildReceiptShareText(
  member: Member,
  adminName: string,
  singleDeposit?: Deposit | null
): string {
  const total = getMemberTotal(member);
  const kisti = getMemberInstallments(member);
  const receiptNo = generateReceiptNumber(member, singleDeposit);
  const sorted = [...member.deposits].sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  if (singleDeposit) {
    return [
      `BARAKAH MULTICARE HOSPITAL UNITY`,
      `অফিশিয়াল লেনদেন রসিদ · ${adminName} (Admin)`,
      `রসিদ নং: ${receiptNo}`,
      `────────────────────`,
      `সদস্য: ${member.name} (#${toBn(member.id)})`,
      `মোবাইল: ${member.phone}`,
      `তারিখ: ${formatDateBn(singleDeposit.date)}`,
      `পরিমাণ: ৳ ${toBn(singleDeposit.amount)}`,
      `বিবরণ: ${singleDeposit.note || 'দৈনিক কিস্তি'}`,
      `সর্বমোট জমা: ৳ ${toBn(total)} (${toBn(kisti)} কিস্তি)`,
    ].join('\n');
  }

  const latestLines = sorted
    .slice(0, 8)
    .map((d) => `• ${formatDateBn(d.date)} — ৳${toBn(d.amount)} (${d.note || 'দৈনিক কিস্তি'})`);

  return [
    `BARAKAH MULTICARE HOSPITAL UNITY`,
    `অফিশিয়াল ডিপোজিট রসিদ · ${adminName} (Admin)`,
    `রসিদ নং: ${receiptNo}`,
    `────────────────────`,
    `সদস্য: ${member.name} (#${toBn(member.id)})`,
    `মোবাইল: ${member.phone}`,
    `মোট জমা: ৳ ${toBn(total)} (${toBn(kisti)} কিস্তি)`,
    `তারিখ: ${formatDateBn(getTodayISO())}`,
    ...(latestLines.length ? [`────────────────────`, ...latestLines] : []),
  ].join('\n');
}
