import crypto from 'node:crypto';
import { asc, eq } from 'drizzle-orm';
import {
  createInitialDatabase,
  DEFAULT_ADMIN_PASSCODE,
  isPhoneCollidingWithPasscode,
  toEnDigits,
} from '../data/defaultData.ts';
import type { AppConfig, Deposit, DrawRecord, Member, RuleItem, UnityDatabase } from '../types/unity.ts';
import {
  isSafeAppIconDataUrl,
  isSafeRasterPhotoDataUrl,
  isValidMemberPhotoUrl,
  sanitizeMemberPhotoUrl,
} from '../utils/avatarLibrary.ts';
import { db } from './index.ts';
import { deposits, draws, members, paymentRequests, rules, unityConfig } from './schema.ts';

const CONFIG_ROW_ID = 'main';

function verifyPinConstantTime(input: string, expected: string): boolean {
  const a = Buffer.from(String(input || ''), 'utf-8');
  const b = Buffer.from(String(expected || ''), 'utf-8');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

async function seedDatabaseIfEmpty(): Promise<void> {
  const existing = await db
    .select({ id: unityConfig.id })
    .from(unityConfig)
    .where(eq(unityConfig.id, CONFIG_ROW_ID))
    .limit(1);

  if (existing.length > 0) return;

  const seed = createInitialDatabase();
  const initialPin = process.env.ADMIN_INITIAL_PIN || DEFAULT_ADMIN_PASSCODE;

  await db.transaction(async (tx) => {
    const insertedConfig = await tx
      .insert(unityConfig)
      .values({
        id: CONFIG_ROW_ID,
        adminName: seed.adminName,
        adminPin: initialPin,
        cloudSyncUrl: seed.cloudSyncUrl,
        updatedAtMs: seed.updatedAtMs,
        lastBackup: seed.lastBackup,
        appConfig: seed.appConfig,
      })
      .onConflictDoNothing()
      .returning({ id: unityConfig.id });

    // If a concurrent request already seeded the config row, skip duplicate seeding
    if (insertedConfig.length === 0) return;

    if (seed.members.length > 0) {
      await tx
        .insert(members)
        .values(
          seed.members.map((m) => ({
            id: m.id,
            name: m.name,
            phone: m.phone,
            photoUrl: sanitizeMemberPhotoUrl(m.photoUrl),
          }))
        )
        .onConflictDoNothing();
    }

    const allDeposits = seed.members.flatMap((m) =>
      m.deposits.map((d) => ({
        id: d.id,
        memberId: m.id,
        date: d.date,
        amount: Math.round(Number(d.amount) || 0),
        note: d.note || '',
      }))
    );

    if (allDeposits.length > 0) {
      // Chunk inserts for large deposit batches
      for (let i = 0; i < allDeposits.length; i += 200) {
        await tx.insert(deposits).values(allDeposits.slice(i, i + 200)).onConflictDoNothing();
      }
    }

    if (seed.draws.length > 0) {
      await tx
        .insert(draws)
        .values(
          seed.draws.map((dr) => ({
            id: dr.id,
            memberId: dr.memberId,
            memberName: dr.memberName,
            date: dr.date,
            amount: Math.round(Number(dr.amount) || 0),
            note: dr.note || '',
          }))
        )
        .onConflictDoNothing();
    }

    if (seed.rules.length > 0) {
      await tx
        .insert(rules)
        .values(
          seed.rules.map((r, idx) => ({
            id: r.id,
            title: r.title,
            description: r.description,
            sortOrder: idx,
          }))
        )
        .onConflictDoNothing();
    }
  });
}

export async function getFullUnityState(): Promise<Omit<UnityDatabase, 'adminPin'>> {
  try {
    await seedDatabaseIfEmpty();

    const [configRows, memberRows, depositRows, drawRows, ruleRows] = await Promise.all([
      db.select().from(unityConfig).where(eq(unityConfig.id, CONFIG_ROW_ID)).limit(1),
      db.select().from(members).orderBy(asc(members.id)),
      db.select().from(deposits).orderBy(asc(deposits.date)),
      db.select().from(draws).orderBy(asc(draws.date)),
      db.select().from(rules).orderBy(asc(rules.sortOrder)),
    ]);

    const cfg = configRows[0];
    if (!cfg) {
      const fallback = createInitialDatabase();
      const { adminPin: _omit, ...pub } = fallback;
      return pub;
    }

    const depositsByMember = new Map<number, Deposit[]>();
    for (const d of depositRows) {
      const list = depositsByMember.get(d.memberId) || [];
      list.push({
        id: d.id,
        date: d.date,
        amount: d.amount,
        note: d.note,
      });
      depositsByMember.set(d.memberId, list);
    }

    const assembledMembers: Member[] = memberRows.map((m) => {
      const safePhoto = sanitizeMemberPhotoUrl(m.photoUrl);
      return {
        id: m.id,
        name: m.name,
        phone: m.phone,
        ...(safePhoto ? { photoUrl: safePhoto } : {}),
        deposits: depositsByMember.get(m.id) || [],
      };
    });

    const assembledDraws: DrawRecord[] = drawRows.map((dr) => ({
      id: dr.id,
      memberId: dr.memberId,
      memberName: dr.memberName,
      date: dr.date,
      amount: dr.amount,
      note: dr.note,
    }));

    const assembledRules: RuleItem[] = ruleRows.map((r) => ({
      id: r.id,
      title: r.title,
      description: r.description,
    }));

    return {
      adminName: cfg.adminName,
      cloudSyncUrl: cfg.cloudSyncUrl,
      updatedAtMs: cfg.updatedAtMs,
      lastBackup: cfg.lastBackup,
      appConfig: cfg.appConfig,
      rules: assembledRules,
      members: assembledMembers,
      draws: assembledDraws,
    };
  } catch (error) {
    console.error('Database query failed in getFullUnityState:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}

export async function verifyAdminPinInDb(candidate: string): Promise<{
  ok: boolean;
  reason?: string;
  adminName?: string;
}> {
  try {
    await seedDatabaseIfEmpty();

    const [cfgRows, memberRows] = await Promise.all([
      db.select().from(unityConfig).where(eq(unityConfig.id, CONFIG_ROW_ID)).limit(1),
      db.select({ id: members.id, name: members.name, phone: members.phone }).from(members),
    ]);

    const cfg = cfgRows[0];
    if (!cfg) {
      return { ok: false, reason: 'অ্যাডমিন কনফিগারেশন পাওয়া যায়নি' };
    }

    const memberStubs: Member[] = memberRows.map((m) => ({ ...m, deposits: [] }));
    const adminPhone = String(cfg.appConfig?.adminPhone || '');
    if (isPhoneCollidingWithPasscode(candidate, memberStubs, adminPhone)) {
      return {
        ok: false,
        reason: 'মেম্বারের ফোন নম্বর অ্যাডমিন পাসওয়ার্ড হিসেবে গ্রহণযোগ্য নয়',
      };
    }

    const storedPin =
      cfg.adminPin && cfg.adminPin.length >= 6 ? cfg.adminPin : DEFAULT_ADMIN_PASSCODE;

    if (verifyPinConstantTime(candidate, storedPin)) {
      return { ok: true, adminName: cfg.adminName };
    }

    return { ok: false, reason: 'ভুল এডমিন পাসওয়ার্ড' };
  } catch (error) {
    console.error('Database query failed in verifyAdminPinInDb:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}

export async function saveFullUnityState(
  payload: Partial<UnityDatabase>
): Promise<Omit<UnityDatabase, 'adminPin'>> {
  try {
    await seedDatabaseIfEmpty();

    const now = Date.now();
    const existingCfgRows = await db
      .select()
      .from(unityConfig)
      .where(eq(unityConfig.id, CONFIG_ROW_ID))
      .limit(1);
    const currentCfg = existingCfgRows[0];
    const seed = createInitialDatabase();

    const nextAdminName =
      typeof payload.adminName === 'string' && payload.adminName.trim()
        ? payload.adminName.trim()
        : currentCfg?.adminName || seed.adminName;
    const nextCloudSyncUrl =
      typeof payload.cloudSyncUrl === 'string'
        ? payload.cloudSyncUrl.trim()
        : currentCfg?.cloudSyncUrl || '';
    const nextLastBackup =
      typeof payload.lastBackup === 'string' && payload.lastBackup.trim()
        ? payload.lastBackup
        : new Date().toLocaleString('bn-BD');
    const mergedAppConfig: AppConfig =
      payload.appConfig && typeof payload.appConfig === 'object'
        ? { ...(currentCfg?.appConfig || seed.appConfig), ...payload.appConfig }
        : currentCfg?.appConfig || seed.appConfig;
    const nextAppConfig: AppConfig = {
      ...mergedAppConfig,
      appLogoUrl: isSafeRasterPhotoDataUrl(mergedAppConfig.appLogoUrl)
        ? mergedAppConfig.appLogoUrl
        : undefined,
      appIconUrl: isSafeAppIconDataUrl(mergedAppConfig.appIconUrl)
        ? mergedAppConfig.appIconUrl
        : undefined,
      appIcon192Url: isSafeAppIconDataUrl(mergedAppConfig.appIcon192Url)
        ? mergedAppConfig.appIcon192Url
        : undefined,
      appIconMaskableUrl: isSafeAppIconDataUrl(mergedAppConfig.appIconMaskableUrl)
        ? mergedAppConfig.appIconMaskableUrl
        : undefined,
    };

    const incomingMembers = Array.isArray(payload.members) ? payload.members : [];
    const incomingDraws = Array.isArray(payload.draws) ? payload.draws : [];
    const incomingRules = Array.isArray(payload.rules) ? payload.rules : [];

    await db.transaction(async (tx) => {
      await tx
        .update(unityConfig)
        .set({
          adminName: nextAdminName,
          cloudSyncUrl: nextCloudSyncUrl,
          updatedAtMs: now,
          lastBackup: nextLastBackup,
          appConfig: nextAppConfig,
          updatedAt: new Date(),
        })
        .where(eq(unityConfig.id, CONFIG_ROW_ID));

      // Replace deposits/draws/rules atomically while upserting members so payment_requests FKs are preserved
      await tx.delete(deposits);
      await tx.delete(draws);
      await tx.delete(rules);

      if (incomingMembers.length > 0) {
        const cleanMembers = incomingMembers.map((m) => ({
          id: Number(m.id),
          name: String(m.name || '').trim(),
          phone: String(m.phone || '').trim(),
          photoUrl: sanitizeMemberPhotoUrl(m.photoUrl),
        }));

        const validMemberIds = new Set(cleanMembers.map((m) => m.id));
        const existingMemberRows = await tx.select({ id: members.id }).from(members);
        const idsToRemove = existingMemberRows
          .map((r) => r.id)
          .filter((id) => !validMemberIds.has(id));

        for (const removeId of idsToRemove) {
          await tx.delete(members).where(eq(members.id, removeId));
        }

        for (const cm of cleanMembers) {
          await tx
            .insert(members)
            .values(cm)
            .onConflictDoUpdate({
              target: members.id,
              set: {
                name: cm.name,
                phone: cm.phone,
                photoUrl: cm.photoUrl,
                updatedAt: new Date(),
              },
            });
        }
        const seenDepositIds = new Set<string>();
        const cleanDeposits: Array<{
          id: string;
          memberId: number;
          date: string;
          amount: number;
          note: string;
        }> = [];

        for (const m of incomingMembers) {
          const mid = Number(m.id);
          if (!validMemberIds.has(mid)) continue;
          const mDeposits = Array.isArray(m.deposits) ? m.deposits : [];
          for (const d of mDeposits) {
            const did = String(d.id || `d_${mid}_${d.date}_${cleanDeposits.length}`);
            if (seenDepositIds.has(did)) continue;
            seenDepositIds.add(did);
            cleanDeposits.push({
              id: did,
              memberId: mid,
              date: String(d.date || ''),
              amount: Math.round(Number(d.amount) || 0),
              note: String(d.note || ''),
            });
          }
        }

        for (let i = 0; i < cleanDeposits.length; i += 200) {
          await tx.insert(deposits).values(cleanDeposits.slice(i, i + 200));
        }

        const cleanDraws = incomingDraws
          .filter((dr) => validMemberIds.has(Number(dr.memberId)))
          .map((dr, idx) => ({
            id: String(dr.id || `dr_${idx}_${Date.now()}`),
            memberId: Number(dr.memberId),
            memberName: String(dr.memberName || ''),
            date: String(dr.date || ''),
            amount: Math.round(Number(dr.amount) || 0),
            note: String(dr.note || ''),
          }));

        if (cleanDraws.length > 0) {
          await tx.insert(draws).values(cleanDraws);
        }
      }

      if (incomingRules.length > 0) {
        await tx.insert(rules).values(
          incomingRules.map((r, idx) => ({
            id: String(r.id || `r_${idx + 1}`),
            title: String(r.title || ''),
            description: String(r.description || ''),
            sortOrder: idx,
          }))
        );
      }
    });

    return await getFullUnityState();
  } catch (error) {
    console.error('Database query failed in saveFullUnityState:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}

export async function publishAppUpdateInDb(
  version: string,
  notes: string
): Promise<Omit<UnityDatabase, 'adminPin'>> {
  try {
    await seedDatabaseIfEmpty();

    const rows = await db
      .select()
      .from(unityConfig)
      .where(eq(unityConfig.id, CONFIG_ROW_ID))
      .limit(1);
    const cfg = rows[0];
    if (!cfg) {
      throw new Error('Missing configuration record');
    }

    const now = Date.now();
    const today = new Date().toISOString().slice(0, 10);
    const existingLog = Array.isArray(cfg.appConfig.changelog) ? cfg.appConfig.changelog : [];
    const nextAppConfig: AppConfig = {
      ...cfg.appConfig,
      appVersion: version,
      changelog: [
        {
          version,
          releaseDate: today,
          notes,
          publishedAtMs: now,
        },
        ...existingLog,
      ].slice(0, 25),
    };

    await db
      .update(unityConfig)
      .set({
        updatedAtMs: now,
        lastBackup: new Date().toLocaleString('bn-BD'),
        appConfig: nextAppConfig,
        updatedAt: new Date(),
      })
      .where(eq(unityConfig.id, CONFIG_ROW_ID));

    return await getFullUnityState();
  } catch (error) {
    console.error('Database query failed in publishAppUpdateInDb:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}

export async function updateAdminCredentialsInDb(
  adminName: string,
  newPin: string
): Promise<{ ok: boolean; error?: string; adminName?: string }> {
  try {
    await seedDatabaseIfEmpty();

    const cleanPin = newPin.trim();
    if (cleanPin.length < 6) {
      return { ok: false, error: 'নতুন পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে' };
    }

    const [cfgRows, memberRows] = await Promise.all([
      db.select().from(unityConfig).where(eq(unityConfig.id, CONFIG_ROW_ID)).limit(1),
      db.select({ id: members.id, name: members.name, phone: members.phone }).from(members),
    ]);
    const cfg = cfgRows[0];
    if (!cfg) {
      return { ok: false, error: 'অ্যাডমিন কনফিগারেশন পাওয়া যায়নি' };
    }

    const memberStubs: Member[] = memberRows.map((m) => ({ ...m, deposits: [] }));
    const adminPhone = String(cfg.appConfig?.adminPhone || '');
    if (isPhoneCollidingWithPasscode(cleanPin, memberStubs, adminPhone)) {
      return {
        ok: false,
        error: 'নিরাপত্তার স্বার্থে মেম্বারের ফোন নম্বরকে অ্যাডমিন পাসওয়ার্ড হিসেবে সেট করা যাবে না',
      };
    }

    const nextName = adminName.trim() || cfg.adminName;
    await db
      .update(unityConfig)
      .set({
        adminName: nextName,
        adminPin: cleanPin,
        updatedAtMs: Date.now(),
        updatedAt: new Date(),
      })
      .where(eq(unityConfig.id, CONFIG_ROW_ID));

    return { ok: true, adminName: nextName };
  } catch (error) {
    console.error('Database query failed in updateAdminCredentialsInDb:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}

export async function verifyMemberPhoneInDb(
  memberId: number,
  candidatePhone: string
): Promise<boolean> {
  try {
    await seedDatabaseIfEmpty();
    const rows = await db
      .select({ phone: members.phone })
      .from(members)
      .where(eq(members.id, memberId))
      .limit(1);
    const row = rows[0];
    if (!row) return false;

    const storedDigits = toEnDigits(row.phone).replace(/\D/g, '');
    const inputDigits = toEnDigits(String(candidatePhone || '')).replace(/\D/g, '');
    if (!storedDigits || !inputDigits) return false;
    return verifyPinConstantTime(inputDigits, storedDigits);
  } catch (error) {
    console.error('Database query failed in verifyMemberPhoneInDb:', error);
    return false;
  }
}

export async function updateMemberPhotoInDb(
  memberId: number,
  rawPhotoUrl: string
): Promise<{ ok: true; memberId: number; photoUrl: string; updatedAtMs: number } | { ok: false; error: string }> {
  try {
    await seedDatabaseIfEmpty();

    if (!Number.isInteger(memberId) || memberId <= 0) {
      return { ok: false, error: 'অবৈধ সদস্য আইডি' };
    }

    if (!isValidMemberPhotoUrl(rawPhotoUrl)) {
      return {
        ok: false,
        error: 'ছবির ফরম্যাট বা সাইজ গ্রহণযোগ্য নয়। JPG/PNG/WEBP ছবি অথবা লাইব্রেরি অ্যাভাটার ব্যবহার করুন।',
      };
    }

    const cleanPhoto = rawPhotoUrl.trim();
    const now = Date.now();

    const updated = await db.transaction(async (tx) => {
      const result = await tx
        .update(members)
        .set({
          photoUrl: cleanPhoto,
          updatedAt: new Date(),
        })
        .where(eq(members.id, memberId))
        .returning({ id: members.id });

      if (result.length === 0) return null;

      await tx
        .update(unityConfig)
        .set({
          updatedAtMs: now,
          lastBackup: new Date().toLocaleString('bn-BD'),
          updatedAt: new Date(),
        })
        .where(eq(unityConfig.id, CONFIG_ROW_ID));

      return result[0];
    });

    if (!updated) {
      return { ok: false, error: 'সদস্য খুঁজে পাওয়া যায়নি' };
    }

    return {
      ok: true,
      memberId,
      photoUrl: cleanPhoto,
      updatedAtMs: now,
    };
  } catch (error) {
    console.error('Database query failed in updateMemberPhotoInDb:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}

export async function updateMemberFullInfoInDb(params: {
  oldId: number;
  newId: number;
  name: string;
  phone: string;
  photoUrl?: string;
  swapIfTaken?: boolean;
}): Promise<
  | {
      ok: true;
      memberId: number;
      swappedWithName?: string;
      updatedAtMs: number;
      state: Omit<UnityDatabase, 'adminPin'>;
    }
  | { ok: false; error: string; conflictMemberName?: string }
> {
  try {
    await seedDatabaseIfEmpty();

    const oldId = Math.trunc(Number(params.oldId));
    const newId = Math.trunc(Number(params.newId));
    const name = String(params.name || '').trim();
    const phone = String(params.phone || '').trim();
    const swapIfTaken = Boolean(params.swapIfTaken);

    if (!Number.isInteger(oldId) || oldId <= 0 || oldId > 999999) {
      return { ok: false, error: 'বর্তমান সদস্য আইডি সঠিক নয়।' };
    }
    if (!Number.isInteger(newId) || newId <= 0 || newId > 999999) {
      return { ok: false, error: 'নতুন সিরিয়াল / সদস্য আইডি ১ থেকে ৯৯৯৯৯৯ এর মধ্যে পূর্ণসংখ্যা হতে হবে।' };
    }
    if (!name || name.length > 120) {
      return { ok: false, error: 'সদস্যের সঠিক নাম লিখুন (সর্বোচ্চ ১২০ অক্ষর)।' };
    }
    if (phone.length > 40) {
      return { ok: false, error: 'মোবাইল নম্বর সঠিক নয়।' };
    }

    let sanitizedPhoto: string | undefined = undefined;
    if (params.photoUrl !== undefined) {
      if (!isValidMemberPhotoUrl(params.photoUrl)) {
        return { ok: false, error: 'প্রোফাইল ছবির ফরম্যাট বা সাইজ গ্রহণযোগ্য নয়।' };
      }
      sanitizedPhoto = params.photoUrl.trim();
    }

    const now = Date.now();
    let swappedWithName: string | undefined;

    const txOutcome = await db.transaction(async (tx) => {
      const existingRows = await tx
        .select()
        .from(members)
        .where(eq(members.id, oldId))
        .limit(1);
      const currentMember = existingRows[0];
      if (!currentMember) {
        return { ok: false as const, error: 'সদস্য খুঁজে পাওয়া যায়নি।' };
      }

      const nextPhoto = sanitizedPhoto !== undefined ? sanitizedPhoto : currentMember.photoUrl;

      if (newId === oldId) {
        await tx
          .update(members)
          .set({
            name,
            phone,
            photoUrl: nextPhoto,
            updatedAt: new Date(),
          })
          .where(eq(members.id, oldId));

        await tx.update(draws).set({ memberName: name }).where(eq(draws.memberId, oldId));
        await tx
          .update(paymentRequests)
          .set({ memberName: name })
          .where(eq(paymentRequests.memberId, oldId));
      } else {
        const conflictRows = await tx
          .select()
          .from(members)
          .where(eq(members.id, newId))
          .limit(1);
        const conflictMember = conflictRows[0];

        if (conflictMember && !swapIfTaken) {
          return {
            ok: false as const,
            error: `সিরিয়াল/আইডি #${newId} ইতিমধ্যে "${conflictMember.name}"-এর নামে রয়েছে। অদল-বদল (Swap) চালু করে সংরক্ষণ করুন অথবা অন্য আইডি দিন।`,
            conflictMemberName: conflictMember.name,
          };
        }

        if (conflictMember && swapIfTaken) {
          swappedWithName = conflictMember.name;
          // Use a safe temporary negative ID outside positive member ID space to swap atomically
          const tempId = -(Math.abs(oldId) + 1_000_000);

          // Step 1: Move conflictMember (currently at newId) to tempId
          await tx.insert(members).values({
            id: tempId,
            name: conflictMember.name,
            phone: conflictMember.phone,
            photoUrl: conflictMember.photoUrl,
            createdAt: conflictMember.createdAt,
            updatedAt: new Date(),
          });
          await tx.update(deposits).set({ memberId: tempId }).where(eq(deposits.memberId, newId));
          await tx.update(draws).set({ memberId: tempId }).where(eq(draws.memberId, newId));
          await tx
            .update(paymentRequests)
            .set({ memberId: tempId })
            .where(eq(paymentRequests.memberId, newId));
          await tx.delete(members).where(eq(members.id, newId));

          // Step 2: Move currentMember (oldId) -> newId with updated details
          await tx.insert(members).values({
            id: newId,
            name,
            phone,
            photoUrl: nextPhoto,
            createdAt: currentMember.createdAt,
            updatedAt: new Date(),
          });
          await tx.update(deposits).set({ memberId: newId }).where(eq(deposits.memberId, oldId));
          await tx
            .update(draws)
            .set({ memberId: newId, memberName: name })
            .where(eq(draws.memberId, oldId));
          await tx
            .update(paymentRequests)
            .set({ memberId: newId, memberName: name })
            .where(eq(paymentRequests.memberId, oldId));
          await tx.delete(members).where(eq(members.id, oldId));

          // Step 3: Move conflictMember (tempId) -> oldId
          await tx.insert(members).values({
            id: oldId,
            name: conflictMember.name,
            phone: conflictMember.phone,
            photoUrl: conflictMember.photoUrl,
            createdAt: conflictMember.createdAt,
            updatedAt: new Date(),
          });
          await tx.update(deposits).set({ memberId: oldId }).where(eq(deposits.memberId, tempId));
          await tx.update(draws).set({ memberId: oldId }).where(eq(draws.memberId, tempId));
          await tx
            .update(paymentRequests)
            .set({ memberId: oldId })
            .where(eq(paymentRequests.memberId, tempId));
          await tx.delete(members).where(eq(members.id, tempId));
        } else {
          // Free target ID: create newId row, migrate all FK references, then delete oldId row
          await tx.insert(members).values({
            id: newId,
            name,
            phone,
            photoUrl: nextPhoto,
            createdAt: currentMember.createdAt,
            updatedAt: new Date(),
          });
          await tx.update(deposits).set({ memberId: newId }).where(eq(deposits.memberId, oldId));
          await tx
            .update(draws)
            .set({ memberId: newId, memberName: name })
            .where(eq(draws.memberId, oldId));
          await tx
            .update(paymentRequests)
            .set({ memberId: newId, memberName: name })
            .where(eq(paymentRequests.memberId, oldId));
          await tx.delete(members).where(eq(members.id, oldId));
        }
      }

      await tx
        .update(unityConfig)
        .set({
          updatedAtMs: now,
          lastBackup: new Date().toLocaleString('bn-BD'),
          updatedAt: new Date(),
        })
        .where(eq(unityConfig.id, CONFIG_ROW_ID));

      return { ok: true as const };
    });

    if (!txOutcome.ok) {
      return txOutcome;
    }

    const freshState = await getFullUnityState();
    return {
      ok: true,
      memberId: newId,
      swappedWithName,
      updatedAtMs: now,
      state: freshState,
    };
  } catch (error) {
    console.error('Database query failed in updateMemberFullInfoInDb:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}

export async function updateAppBrandingInDb(params: {
  appIconUrl?: string | null;
  appIcon192Url?: string | null;
  appIconMaskableUrl?: string | null;
  appLogoUrl?: string | null;
}): Promise<
  | { ok: true; updatedAtMs: number; state: Omit<UnityDatabase, 'adminPin'> }
  | { ok: false; error: string }
> {
  try {
    await seedDatabaseIfEmpty();

    const rows = await db
      .select()
      .from(unityConfig)
      .where(eq(unityConfig.id, CONFIG_ROW_ID))
      .limit(1);
    const current = rows[0];
    if (!current) {
      return { ok: false, error: 'অ্যাপ কনফিগারেশন খুঁজে পাওয়া যায়নি।' };
    }

    const nextConfig: AppConfig = { ...current.appConfig };

    const applyIconField = (
      key: 'appIconUrl' | 'appIcon192Url' | 'appIconMaskableUrl',
      val: string | null | undefined
    ): string | null => {
      if (val === undefined) return null;
      if (val === null || val.trim() === '') {
        delete nextConfig[key];
        return null;
      }
      if (!isSafeAppIconDataUrl(val)) {
        return 'অ্যাপ আইকনের ফরম্যাট বা সাইজ গ্রহণযোগ্য নয়। PNG/JPG/WEBP ছবি ব্যবহার করুন।';
      }
      nextConfig[key] = val;
      return null;
    };

    const err1 = applyIconField('appIconUrl', params.appIconUrl);
    if (err1) return { ok: false, error: err1 };
    const err2 = applyIconField('appIcon192Url', params.appIcon192Url);
    if (err2) return { ok: false, error: err2 };
    const err3 = applyIconField('appIconMaskableUrl', params.appIconMaskableUrl);
    if (err3) return { ok: false, error: err3 };

    if (params.appLogoUrl !== undefined) {
      if (params.appLogoUrl === null || params.appLogoUrl.trim() === '') {
        delete nextConfig.appLogoUrl;
      } else if (!isSafeRasterPhotoDataUrl(params.appLogoUrl)) {
        return { ok: false, error: 'অ্যাপ লোগোর ফরম্যাট বা সাইজ গ্রহণযোগ্য নয়।' };
      } else {
        nextConfig.appLogoUrl = params.appLogoUrl;
      }
    }

    const now = Date.now();
    await db
      .update(unityConfig)
      .set({
        appConfig: nextConfig,
        updatedAtMs: now,
        lastBackup: new Date().toLocaleString('bn-BD'),
        updatedAt: new Date(),
      })
      .where(eq(unityConfig.id, CONFIG_ROW_ID));

    const freshState = await getFullUnityState();
    return {
      ok: true,
      updatedAtMs: now,
      state: freshState,
    };
  } catch (error) {
    console.error('Database query failed in updateAppBrandingInDb:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}
