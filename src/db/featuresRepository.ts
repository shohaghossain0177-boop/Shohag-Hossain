import { desc, eq } from 'drizzle-orm';
import { getDatesInRange, toEnDigits } from '../data/defaultData.ts';
import type { AuditLogEntry, PaymentRequest } from '../types/unity.ts';
import { db } from './index.ts';
import { auditLogs, deposits, draws, members, paymentRequests, unityConfig } from './schema.ts';

const CONFIG_ROW_ID = 'main';

export async function addAuditLogInDb(params: {
  actorName: string;
  actorRole: string;
  action: string;
  details: string;
}): Promise<void> {
  try {
    await db.insert(auditLogs).values({
      actorName: String(params.actorName || 'অ্যাডমিন').slice(0, 120),
      actorRole: String(params.actorRole || 'admin').slice(0, 40),
      action: String(params.action || 'system').slice(0, 120),
      details: String(params.details || '').slice(0, 500),
    });
  } catch (error) {
    console.error('Failed to write audit log:', error);
  }
}

export async function listAuditLogsInDb(limit = 120): Promise<AuditLogEntry[]> {
  try {
    const safeLimit = Math.min(250, Math.max(10, Math.trunc(limit)));
    const rows = await db
      .select()
      .from(auditLogs)
      .orderBy(desc(auditLogs.createdAt), desc(auditLogs.id))
      .limit(safeLimit);

    return rows.map((r) => ({
      id: r.id,
      actorName: r.actorName,
      actorRole: r.actorRole,
      action: r.action,
      details: r.details,
      createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : String(r.createdAt),
    }));
  } catch (error) {
    console.error('Failed to list audit logs:', error);
    return [];
  }
}

export async function listPaymentRequestsInDb(limit = 100): Promise<PaymentRequest[]> {
  try {
    const safeLimit = Math.min(250, Math.max(10, Math.trunc(limit)));
    const rows = await db
      .select()
      .from(paymentRequests)
      .orderBy(desc(paymentRequests.createdAt))
      .limit(safeLimit);

    return rows.map((r) => ({
      id: r.id,
      memberId: r.memberId,
      memberName: r.memberName,
      senderPhone: r.senderPhone,
      trxId: r.trxId,
      amount: r.amount,
      date: r.date,
      note: r.note,
      status: r.status === 'approved' || r.status === 'rejected' ? r.status : 'pending',
      reviewedBy: r.reviewedBy,
      reviewNote: r.reviewNote,
      createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : String(r.createdAt),
      reviewedAt: r.reviewedAt instanceof Date ? r.reviewedAt.toISOString() : null,
    }));
  } catch (error) {
    console.error('Failed to list payment requests:', error);
    return [];
  }
}

export async function createPaymentRequestInDb(input: {
  memberId: number;
  senderPhone: string;
  trxId: string;
  amount: number;
  date: string;
  note?: string;
}): Promise<{ ok: true; request: PaymentRequest } | { ok: false; error: string }> {
  try {
    const memberId = Math.trunc(Number(input.memberId));
    if (!Number.isInteger(memberId) || memberId <= 0) {
      return { ok: false, error: 'অনুগ্রহ করে সঠিক সদস্য নির্বাচন করুন' };
    }

    const memberRows = await db
      .select({ id: members.id, name: members.name })
      .from(members)
      .where(eq(members.id, memberId))
      .limit(1);

    if (memberRows.length === 0) {
      return { ok: false, error: 'নির্বাচিত সদস্য খুঁজে পাওয়া যায়নি' };
    }

    const senderPhone = toEnDigits(String(input.senderPhone || '').trim()).replace(/[^\d+]/g, '');
    if (senderPhone.length < 10 || senderPhone.length > 16) {
      return { ok: false, error: 'সঠিক প্রেরকের মোবাইল নম্বর দিন (১১ ডিজিট)' };
    }

    const trxId = String(input.trxId || '').trim().toUpperCase();
    if (trxId.length < 4 || trxId.length > 40) {
      return { ok: false, error: 'সঠিক বিকাশ ট্রানজেকশন আইডি (TrxID) লিখুন' };
    }

    const amount = Math.round(Number(input.amount));
    if (!Number.isFinite(amount) || amount < 100 || amount > 500000) {
      return { ok: false, error: 'টাকার পরিমাণ সর্বনিম্ন ৳১০০ এবং সঠিক হতে হবে' };
    }

    const date = String(input.date || '').trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return { ok: false, error: 'সঠিক তারিখ নির্বাচন করুন (YYYY-MM-DD)' };
    }

    // Prevent duplicate TrxID submission
    const existingTrx = await db
      .select({ id: paymentRequests.id, status: paymentRequests.status })
      .from(paymentRequests)
      .where(eq(paymentRequests.trxId, trxId))
      .limit(1);

    if (existingTrx.length > 0 && existingTrx[0].status !== 'rejected') {
      return {
        ok: false,
        error: 'এই ট্রানজেকশন আইডি (TrxID) দিয়ে ইতোমধ্যে একটি রিকোয়েস্ট জমা আছে',
      };
    }

    const id = `pr_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const note = String(input.note || '').trim().slice(0, 200);
    const memberName = memberRows[0].name;

    const inserted = await db
      .insert(paymentRequests)
      .values({
        id,
        memberId,
        memberName,
        senderPhone,
        trxId,
        amount,
        date,
        note,
        status: 'pending',
        reviewedBy: '',
        reviewNote: '',
      })
      .returning();

    const row = inserted[0];
    await addAuditLogInDb({
      actorName: memberName,
      actorRole: 'member',
      action: 'বিকাশ রিকোয়েস্ট সাবমিট',
      details: `সদস্য #${memberId} (${memberName}) — ৳${amount}, TrxID: ${trxId}, তারিখ: ${date}`,
    });

    return {
      ok: true,
      request: {
        id: row.id,
        memberId: row.memberId,
        memberName: row.memberName,
        senderPhone: row.senderPhone,
        trxId: row.trxId,
        amount: row.amount,
        date: row.date,
        note: row.note,
        status: 'pending',
        reviewedBy: row.reviewedBy,
        reviewNote: row.reviewNote,
        createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt),
        reviewedAt: null,
      },
    };
  } catch (error) {
    console.error('Failed to create payment request:', error);
    return { ok: false, error: 'পেমেন্ট রিকোয়েস্ট জমা দেওয়া যায়নি। আবার চেষ্টা করুন।' };
  }
}

export async function reviewPaymentRequestInDb(params: {
  requestId: string;
  decision: 'approved' | 'rejected';
  reviewerName: string;
  reviewerRole: string;
  reviewNote?: string;
}): Promise<
  | { ok: true; status: 'approved' | 'rejected'; updatedAtMs: number; request: PaymentRequest }
  | { ok: false; error: string }
> {
  try {
    const reqRows = await db
      .select()
      .from(paymentRequests)
      .where(eq(paymentRequests.id, params.requestId))
      .limit(1);

    const existing = reqRows[0];
    if (!existing) {
      return { ok: false, error: 'পেমেন্ট রিকোয়েস্ট পাওয়া যায়নি' };
    }
    if (existing.status !== 'pending') {
      return { ok: false, error: 'এই রিকোয়েস্টটি ইতোমধ্যে যাচাই করা হয়েছে' };
    }

    const now = Date.now();
    const cleanReviewNote = String(params.reviewNote || '').trim().slice(0, 200);
    const reviewerName = String(params.reviewerName || 'অ্যাডমিন').trim().slice(0, 100);

    const updatedRow = await db.transaction(async (tx) => {
      const [updated] = await tx
        .update(paymentRequests)
        .set({
          status: params.decision,
          reviewedBy: reviewerName,
          reviewNote: cleanReviewNote,
          reviewedAt: new Date(),
        })
        .where(eq(paymentRequests.id, params.requestId))
        .returning();

      if (params.decision === 'approved') {
        const depositId = `d_bkash_${now}_${Math.floor(Math.random() * 1000)}`;
        const depNote = existing.note
          ? `বিকাশ (${existing.trxId}) — ${existing.note}`
          : `বিকাশ পেমেন্ট (${existing.trxId})`;

        await tx.insert(deposits).values({
          id: depositId,
          memberId: existing.memberId,
          date: existing.date,
          amount: existing.amount,
          note: depNote,
        });

        await tx
          .update(unityConfig)
          .set({
            updatedAtMs: now,
            lastBackup: new Date().toLocaleString('bn-BD'),
            updatedAt: new Date(),
          })
          .where(eq(unityConfig.id, CONFIG_ROW_ID));
      }

      return updated;
    });

    await addAuditLogInDb({
      actorName: reviewerName,
      actorRole: params.reviewerRole,
      action: params.decision === 'approved' ? 'বিকাশ পেমেন্ট অনুমোদন' : 'বিকাশ পেমেন্ট বাতিল',
      details: `সদস্য #${existing.memberId} (${existing.memberName}) — ৳${existing.amount}, TrxID: ${existing.trxId}${
        cleanReviewNote ? ` (${cleanReviewNote})` : ''
      }`,
    });

    return {
      ok: true,
      status: params.decision,
      updatedAtMs: now,
      request: {
        id: updatedRow.id,
        memberId: updatedRow.memberId,
        memberName: updatedRow.memberName,
        senderPhone: updatedRow.senderPhone,
        trxId: updatedRow.trxId,
        amount: updatedRow.amount,
        date: updatedRow.date,
        note: updatedRow.note,
        status: params.decision,
        reviewedBy: updatedRow.reviewedBy,
        reviewNote: updatedRow.reviewNote,
        createdAt:
          updatedRow.createdAt instanceof Date
            ? updatedRow.createdAt.toISOString()
            : String(updatedRow.createdAt),
        reviewedAt:
          updatedRow.reviewedAt instanceof Date
            ? updatedRow.reviewedAt.toISOString()
            : new Date().toISOString(),
      },
    };
  } catch (error) {
    console.error('Failed to review payment request:', error);
    return { ok: false, error: 'রিকোয়েস্ট আপডেট করা যায়নি' };
  }
}

export async function addStaffDepositInDb(input: {
  memberId: number;
  mode: 'single' | 'range';
  date?: string;
  startDate?: string;
  endDate?: string;
  amount: number;
  note?: string;
  actorName: string;
  actorRole: string;
}): Promise<{ ok: true; updatedAtMs: number; count: number } | { ok: false; error: string }> {
  try {
    const memberId = Math.trunc(Number(input.memberId));
    const memberRows = await db
      .select({ id: members.id, name: members.name })
      .from(members)
      .where(eq(members.id, memberId))
      .limit(1);

    if (memberRows.length === 0) {
      return { ok: false, error: 'সদস্য খুঁজে পাওয়া যায়নি' };
    }

    const amount = Math.round(Number(input.amount));
    if (!Number.isFinite(amount) || amount <= 0 || amount > 500000) {
      return { ok: false, error: 'সঠিক টাকার পরিমাণ দিন' };
    }

    const note = String(input.note || 'দৈনিক কিস্তি').trim().slice(0, 200) || 'দৈনিক কিস্তি';
    const now = Date.now();
    let rowsToInsert: Array<{ id: string; memberId: number; date: string; amount: number; note: string }> = [];

    if (input.mode === 'range') {
      const dates = getDatesInRange(String(input.startDate || ''), String(input.endDate || ''));
      if (dates.length === 0) {
        return { ok: false, error: 'সঠিক শুরুর ও শেষের তারিখ নির্বাচন করুন' };
      }
      rowsToInsert = dates.map((dt, idx) => ({
        id: `d_${now}_${idx}`,
        memberId,
        date: dt,
        amount,
        note,
      }));
    } else {
      const date = String(input.date || '').trim();
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return { ok: false, error: 'সঠিক তারিখ নির্বাচন করুন' };
      }
      rowsToInsert = [
        {
          id: `d_${now}_${Math.floor(Math.random() * 1000)}`,
          memberId,
          date,
          amount,
          note,
        },
      ];
    }

    await db.transaction(async (tx) => {
      await tx.insert(deposits).values(rowsToInsert);
      await tx
        .update(unityConfig)
        .set({
          updatedAtMs: now,
          lastBackup: new Date().toLocaleString('bn-BD'),
          updatedAt: new Date(),
        })
        .where(eq(unityConfig.id, CONFIG_ROW_ID));
    });

    const totalAdded = amount * rowsToInsert.length;
    await addAuditLogInDb({
      actorName: input.actorName,
      actorRole: input.actorRole,
      action: input.mode === 'range' ? 'মাল্টি-ডে ডিপোজিট জমা' : 'ডিপোজিট জমা',
      details: `সদস্য #${memberId} (${memberRows[0].name}) — ৳${totalAdded} (${rowsToInsert.length} দিন, ${note})`,
    });

    return { ok: true, updatedAtMs: now, count: rowsToInsert.length };
  } catch (error) {
    console.error('Failed to add staff deposit:', error);
    return { ok: false, error: 'জমা সংরক্ষণ করা যায়নি' };
  }
}

export async function addStaffDrawInDb(input: {
  memberId: number;
  date: string;
  amount: number;
  note?: string;
  actorName: string;
  actorRole: string;
}): Promise<{ ok: true; updatedAtMs: number } | { ok: false; error: string }> {
  try {
    const memberId = Math.trunc(Number(input.memberId));
    const memberRows = await db
      .select({ id: members.id, name: members.name })
      .from(members)
      .where(eq(members.id, memberId))
      .limit(1);
    if (memberRows.length === 0) {
      return { ok: false, error: 'সদস্য খুঁজে পাওয়া যায়নি' };
    }

    const date = String(input.date || '').trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return { ok: false, error: 'সঠিক তারিখ নির্বাচন করুন' };
    }
    const amount = Math.round(Number(input.amount));
    if (!Number.isFinite(amount) || amount <= 0 || amount > 5000000) {
      return { ok: false, error: 'সঠিক ড্র টাকার পরিমাণ দিন' };
    }

    const note = String(input.note || 'ড্র প্রদান').trim().slice(0, 200) || 'ড্র প্রদান';
    const now = Date.now();
    const id = `dr_${now}_${Math.floor(Math.random() * 1000)}`;

    await db.transaction(async (tx) => {
      await tx.insert(draws).values({
        id,
        memberId,
        memberName: memberRows[0].name,
        date,
        amount,
        note,
      });
      await tx
        .update(unityConfig)
        .set({
          updatedAtMs: now,
          lastBackup: new Date().toLocaleString('bn-BD'),
          updatedAt: new Date(),
        })
        .where(eq(unityConfig.id, CONFIG_ROW_ID));
    });

    await addAuditLogInDb({
      actorName: input.actorName,
      actorRole: input.actorRole,
      action: 'ড্র বিজয়ী যুক্ত',
      details: `সদস্য #${memberId} (${memberRows[0].name}) — ৳${amount} (${date})`,
    });

    return { ok: true, updatedAtMs: now };
  } catch (error) {
    console.error('Failed to add staff draw:', error);
    return { ok: false, error: 'ড্র সংরক্ষণ করা যায়নি' };
  }
}
