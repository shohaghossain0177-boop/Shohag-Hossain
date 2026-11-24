import { desc, eq } from 'drizzle-orm';
import { db } from './index.ts';
import { users } from './schema.ts';

export const BOOTSTRAP_ADMIN_EMAILS = new Set(['shohaghossain0177@gmail.com']);

export interface UserProfileInput {
  displayName?: string;
  photoUrl?: string;
  deviceInfo?: string;
}

export async function getOrCreateUser(uid: string, email: string, profile?: UserProfileInput) {
  try {
    const normalizedEmail = String(email || '').trim().toLowerCase();
    const isBootstrapAdmin = BOOTSTRAP_ADMIN_EMAILS.has(normalizedEmail);

    // Check by UID first, then check if admin pre-registered this email with a cashier role
    const existingByUid = await db.select().from(users).where(eq(users.uid, uid)).limit(1);
    const existingByEmail =
      existingByUid.length === 0 && normalizedEmail
        ? await db.select().from(users).where(eq(users.email, normalizedEmail)).limit(1)
        : [];

    const existing = existingByUid[0] || existingByEmail[0];
    const resolvedRole = isBootstrapAdmin
      ? 'admin'
      : existing?.role === 'cashier' || existing?.role === 'admin'
        ? existing.role
        : 'member';

    const nextDisplayName =
      profile?.displayName?.trim() ||
      existing?.displayName ||
      (normalizedEmail ? normalizedEmail.split('@')[0] : 'ইউজার');
    const nextPhotoUrl = profile?.photoUrl?.trim() || existing?.photoUrl || '';
    const nextDeviceInfo = profile?.deviceInfo?.trim() || existing?.deviceInfo || '';

    // If pre-registered placeholder row exists under another uid (`invited:<email>`), migrate it cleanly
    if (existingByUid.length === 0 && existingByEmail.length > 0 && existingByEmail[0].uid.startsWith('invited:')) {
      const updated = await db
        .update(users)
        .set({
          uid,
          displayName: nextDisplayName,
          photoUrl: nextPhotoUrl,
          role: resolvedRole,
          deviceInfo: nextDeviceInfo,
          lastSeenAt: new Date(),
        })
        .where(eq(users.id, existingByEmail[0].id))
        .returning();
      return updated[0];
    }

    const result = await db
      .insert(users)
      .values({
        uid,
        email: normalizedEmail,
        displayName: nextDisplayName,
        photoUrl: nextPhotoUrl,
        role: resolvedRole,
        deviceInfo: nextDeviceInfo,
        lastSeenAt: new Date(),
      })
      .onConflictDoUpdate({
        target: users.uid,
        set: {
          email: normalizedEmail,
          displayName: nextDisplayName,
          photoUrl: nextPhotoUrl,
          role: resolvedRole,
          ...(nextDeviceInfo ? { deviceInfo: nextDeviceInfo } : {}),
          lastSeenAt: new Date(),
        },
      })
      .returning();

    return result[0];
  } catch (error) {
    console.error('Database query failed in getOrCreateUser:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}

export async function getUserByUid(uid: string) {
  try {
    const rows = await db.select().from(users).where(eq(users.uid, uid)).limit(1);
    return rows[0] || null;
  } catch (error) {
    console.error('Database query failed in getUserByUid:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}

export async function listAllRegisteredUsers() {
  try {
    return await db.select().from(users).orderBy(desc(users.lastSeenAt));
  } catch (error) {
    console.error('Database query failed in listAllRegisteredUsers:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}

export async function touchUserLastSeen(uid: string, deviceInfo?: string) {
  try {
    await db
      .update(users)
      .set({
        lastSeenAt: new Date(),
        ...(deviceInfo ? { deviceInfo: deviceInfo.slice(0, 80) } : {}),
      })
      .where(eq(users.uid, uid));
  } catch {
    // non-fatal heartbeat update
  }
}

export async function updateUserRoleInDb(
  targetEmailOrUid: string,
  newRole: 'cashier' | 'member',
  displayName?: string
): Promise<{ ok: true; user: typeof users.$inferSelect } | { ok: false; error: string }> {
  try {
    const cleanTarget = String(targetEmailOrUid || '').trim();
    if (!cleanTarget) return { ok: false, error: 'ইউজার নির্বাচন করুন বা ইমেইল লিখুন' };

    const isEmail = cleanTarget.includes('@');
    const normalizedEmail = isEmail ? cleanTarget.toLowerCase() : '';

    if (normalizedEmail && BOOTSTRAP_ADMIN_EMAILS.has(normalizedEmail)) {
      return { ok: false, error: 'মূল সুপার এডমিনের রোল পরিবর্তন করা যাবে না।' };
    }

    const existingRows = isEmail
      ? await db.select().from(users).where(eq(users.email, normalizedEmail)).limit(1)
      : await db.select().from(users).where(eq(users.uid, cleanTarget)).limit(1);

    if (existingRows.length > 0) {
      const target = existingRows[0];
      if (BOOTSTRAP_ADMIN_EMAILS.has(target.email.toLowerCase())) {
        return { ok: false, error: 'মূল সুপার এডমিনের রোল পরিবর্তন করা যাবে না।' };
      }
      const updated = await db
        .update(users)
        .set({
          role: newRole,
          ...(displayName?.trim() ? { displayName: displayName.trim() } : {}),
        })
        .where(eq(users.id, target.id))
        .returning();
      return { ok: true, user: updated[0] };
    }

    // Pre-register a Cashier by email before their first Google sign-in
    if (isEmail) {
      const inserted = await db
        .insert(users)
        .values({
          uid: `invited:${normalizedEmail}`,
          email: normalizedEmail,
          displayName: displayName?.trim() || normalizedEmail.split('@')[0],
          photoUrl: '',
          role: newRole,
          deviceInfo: 'আমন্ত্রিত ক্যাশিয়ার',
          lastSeenAt: new Date(),
        })
        .returning();
      return { ok: true, user: inserted[0] };
    }

    return { ok: false, error: 'ইউজার খুঁজে পাওয়া যায়নি' };
  } catch (error) {
    console.error('Database query failed in updateUserRoleInDb:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}
