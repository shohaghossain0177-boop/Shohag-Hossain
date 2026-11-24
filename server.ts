import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import type { Response } from 'express';
import {
  addAuditLogInDb,
  addStaffDepositInDb,
  addStaffDrawInDb,
  createPaymentRequestInDb,
  listAuditLogsInDb,
  listPaymentRequestsInDb,
  reviewPaymentRequestInDb,
} from './src/db/featuresRepository.ts';
import {
  getFullUnityState,
  publishAppUpdateInDb,
  saveFullUnityState,
  updateAdminCredentialsInDb,
  updateAppBrandingInDb,
  updateMemberFullInfoInDb,
  updateMemberPhotoInDb,
  verifyAdminPinInDb,
  verifyMemberPhoneInDb,
} from './src/db/unityRepository.ts';
import {
  getOrCreateUser,
  listAllRegisteredUsers,
  touchUserLastSeen,
  updateUserRoleInDb,
} from './src/db/users.ts';
import { adminAuth } from './src/lib/firebase-admin.ts';
import { requireAuth, type AuthRequest } from './src/middleware/auth.ts';
import type { ActiveSessionUser, UnityDatabase, UserRole } from './src/types/unity.ts';
import { isSafeAppIconDataUrl, isValidMemberPhotoUrl } from './src/utils/avatarLibrary.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getServerBuildId(): string {
  if (process.env.NODE_ENV !== 'production') return 'dev';
  try {
    const metaPath = path.join(__dirname, 'dist', 'build-meta.json');
    if (fs.existsSync(metaPath)) {
      const parsed = JSON.parse(fs.readFileSync(metaPath, 'utf-8')) as { buildId?: string };
      if (parsed.buildId) return String(parsed.buildId);
    }
  } catch {
    // ignore
  }
  return process.env.K_REVISION || 'prod';
}

function detectDeviceFromHeader(ua?: string): string {
  const s = String(ua || '').toLowerCase();
  if (/iphone|ipad|ipod/.test(s)) return 'iPhone / iOS';
  if (/android/.test(s)) return 'Android';
  if (/macintosh|mac os/.test(s)) return 'Mac PC';
  if (/windows/.test(s)) return 'Windows PC';
  if (/linux/.test(s)) return 'Linux PC';
  return 'Web Device';
}

function maskEmailAddress(email: string): string {
  const clean = String(email || '').trim();
  const atIdx = clean.indexOf('@');
  if (atIdx <= 2) return clean;
  return `${clean.slice(0, 2)}•••${clean.slice(atIdx)}`;
}

interface VerifiedCaller {
  ok: true;
  role: 'admin' | 'cashier';
  actorName: string;
  uid?: string;
  email?: string;
}

async function resolveStaffOrAdminCaller(req: AuthRequest): Promise<VerifiedCaller | null> {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split('Bearer ')[1];
    try {
      const decoded = await adminAuth.verifyIdToken(token);
      req.user = decoded;
      const dbUser = await getOrCreateUser(decoded.uid, decoded.email || '', {
        displayName: typeof decoded.name === 'string' ? decoded.name : undefined,
        photoUrl: typeof decoded.picture === 'string' ? decoded.picture : undefined,
        deviceInfo: detectDeviceFromHeader(req.headers['user-agent']),
      });
      req.dbUser = dbUser;
      if (dbUser.role === 'admin' || dbUser.role === 'cashier') {
        return {
          ok: true,
          role: dbUser.role,
          actorName: dbUser.displayName || dbUser.email || (dbUser.role === 'admin' ? 'এডমিন' : 'ক্যাশিয়ার'),
          uid: dbUser.uid,
          email: dbUser.email,
        };
      }
    } catch {
      // fall through to pin check
    }
  }

  const pin = String(req.header('x-admin-pin') || '').trim();
  if (pin) {
    const check = await verifyAdminPinInDb(pin);
    if (check.ok) {
      return {
        ok: true,
        role: 'admin',
        actorName: check.adminName || 'Shohag Hossain',
      };
    }
  }

  return null;
}

async function verifyAdminOnly(req: AuthRequest, res: Response): Promise<VerifiedCaller | null> {
  const caller = await resolveStaffOrAdminCaller(req);
  if (!caller) {
    res.status(401).json({ error: 'অনুমোদিত নয় (Admin verification required)' });
    return null;
  }
  if (caller.role !== 'admin') {
    res.status(403).json({ error: 'এই কাজটি শুধুমাত্র সুপার এডমিনের জন্য সংরক্ষিত।' });
    return null;
  }
  return caller;
}

async function verifyStaffOrAdmin(req: AuthRequest, res: Response): Promise<VerifiedCaller | null> {
  const caller = await resolveStaffOrAdminCaller(req);
  if (!caller) {
    res.status(401).json({ error: 'অনুমোদিত নয় (Admin or Cashier login required)' });
    return null;
  }
  return caller;
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '10mb' }));

  // Real-time Server-Sent Events (SSE) clients for instant sync across all users
  const sseClients = new Set<Response>();

  // Real-time active user presence registry (pruned automatically after 95s of inactivity)
  const activeSessions = new Map<string, ActiveSessionUser>();
  const SESSION_TTL_MS = 95_000;

  function pruneInactiveSessions(): boolean {
    const now = Date.now();
    let changed = false;
    for (const [sid, session] of activeSessions.entries()) {
      if (now - session.lastActiveMs > SESSION_TTL_MS) {
        activeSessions.delete(sid);
        changed = true;
      }
    }
    return changed;
  }

  function broadcastEvent(eventName: string, payloadObj: Record<string, unknown>) {
    const payload = `event: ${eventName}\ndata: ${JSON.stringify(payloadObj)}\n\n`;
    for (const client of sseClients) {
      try {
        client.write(payload);
      } catch {
        sseClients.delete(client);
      }
    }
  }

  function broadcastStateUpdated(updatedAtMs: number, reason: string) {
    broadcastEvent('state:updated', { updatedAtMs, reason });
  }

  function broadcastPresenceUpdated() {
    pruneInactiveSessions();
    broadcastEvent('presence:updated', {
      onlineCount: activeSessions.size,
      updatedAtMs: Date.now(),
    });
  }

  function broadcastRequestsUpdated(reason: string) {
    broadcastEvent('requests:updated', { reason, updatedAtMs: Date.now() });
  }

  setInterval(() => {
    if (pruneInactiveSessions()) {
      broadcastPresenceUpdated();
    }
  }, 30_000);

  // Real-time event stream for connected clients
  app.get('/api/events', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();

    sseClients.add(res);
    pruneInactiveSessions();
    res.write(
      `event: connected\ndata: ${JSON.stringify({ ok: true, onlineCount: activeSessions.size, buildId: getServerBuildId() })}\n\n`
    );

    const keepAlive = setInterval(() => {
      try {
        res.write(': keepalive\n\n');
      } catch {
        clearInterval(keepAlive);
        sseClients.delete(res);
      }
    }, 25_000);

    req.on('close', () => {
      clearInterval(keepAlive);
      sseClients.delete(res);
    });
  });

  // Live presence heartbeat endpoint (tracks online admins, cashiers, signed-in members & guests)
  app.post('/api/presence/ping', async (req: AuthRequest, res) => {
    try {
      const sessionId = String(req.body?.sessionId || '')
        .trim()
        .replace(/[^a-zA-Z0-9_-]/g, '')
        .slice(0, 64);
      if (!sessionId) {
        res.status(400).json({ error: 'Invalid sessionId' });
        return;
      }

      const currentPage = String(req.body?.currentPage || 'হোম').trim().slice(0, 60) || 'হোম';
      const device = detectDeviceFromHeader(req.headers['user-agent']);

      let role: UserRole = 'guest';
      let displayName = 'ভিজিটর / সদস্য';
      let uid: string | undefined;
      let email: string | undefined;
      let photoUrl: string | undefined;

      // Verify Firebase token if provided
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split('Bearer ')[1];
        try {
          const decoded = await adminAuth.verifyIdToken(token);
          const dbUser = await getOrCreateUser(decoded.uid, decoded.email || '', {
            displayName: typeof decoded.name === 'string' ? decoded.name : undefined,
            photoUrl: typeof decoded.picture === 'string' ? decoded.picture : undefined,
            deviceInfo: device,
          });
          uid = dbUser.uid;
          email = dbUser.email;
          displayName = dbUser.displayName || dbUser.email || 'লগইন ইউজার';
          photoUrl = dbUser.photoUrl || undefined;
          role = dbUser.role === 'admin' || dbUser.role === 'cashier' ? dbUser.role : 'member';
          void touchUserLastSeen(dbUser.uid, device);
        } catch {
          // ignore expired token and fall back to PIN or guest
        }
      }

      // Check Admin PIN fallback if not authenticated via Google
      if (role === 'guest') {
        const pin = String(req.header('x-admin-pin') || '').trim();
        if (pin) {
          const pinCheck = await verifyAdminPinInDb(pin);
          if (pinCheck.ok) {
            role = 'admin';
            displayName = pinCheck.adminName || 'Shohag Hossain';
          }
        }
      }

      const now = Date.now();
      const prev = activeSessions.get(sessionId);
      const changed =
        !prev || prev.role !== role || prev.displayName !== displayName || prev.currentPage !== currentPage;

      activeSessions.set(sessionId, {
        sessionId,
        uid,
        displayName,
        email,
        role,
        photoUrl,
        device,
        currentPage,
        connectedAtMs: prev?.connectedAtMs || now,
        lastActiveMs: now,
      });

      pruneInactiveSessions();
      if (changed) {
        broadcastPresenceUpdated();
      }

      res.json({ ok: true, onlineCount: activeSessions.size });
    } catch (error) {
      console.error('Presence ping failed:', error);
      res.status(500).json({ error: 'Presence update failed' });
    }
  });

  const handlePresenceLeave = (sid: string) => {
    if (sid && activeSessions.delete(sid)) {
      broadcastPresenceUpdated();
    }
  };

  app.delete('/api/presence/:sessionId', (req, res) => {
    handlePresenceLeave(String(req.params.sessionId || '').trim());
    res.json({ ok: true });
  });

  app.post('/api/presence/:sessionId/leave', (req, res) => {
    handlePresenceLeave(String(req.params.sessionId || '').trim());
    res.json({ ok: true });
  });

  // Live Active & Logged-In User List endpoint
  app.get('/api/users/active', async (req: AuthRequest, res) => {
    try {
      res.setHeader('Cache-Control', 'no-store');
      pruneInactiveSessions();

      const caller = await resolveStaffOrAdminCaller(req);
      const isSuperAdmin = caller?.role === 'admin';

      const dbUsers = await listAllRegisteredUsers();
      const onlineUids = new Set<string>();
      const onlineEmails = new Set<string>();
      for (const sess of activeSessions.values()) {
        if (sess.uid) onlineUids.add(sess.uid);
        if (sess.email) onlineEmails.add(sess.email.toLowerCase());
      }

      const onlineSessions = Array.from(activeSessions.values())
        .sort((a, b) => b.lastActiveMs - a.lastActiveMs)
        .map((s) => ({
          ...s,
          email: s.email ? (isSuperAdmin ? s.email : maskEmailAddress(s.email)) : undefined,
        }));

      const registeredUsers = dbUsers.map((u) => ({
        uid: u.uid,
        email: isSuperAdmin ? u.email : maskEmailAddress(u.email),
        displayName: u.displayName || (u.email ? u.email.split('@')[0] : 'ইউজার'),
        photoUrl: u.photoUrl || '',
        role: u.role === 'admin' || u.role === 'cashier' ? u.role : ('member' as const),
        deviceInfo: u.deviceInfo || 'Web Device',
        lastSeenAt: u.lastSeenAt instanceof Date ? u.lastSeenAt.toISOString() : String(u.lastSeenAt),
        createdAt: u.createdAt instanceof Date ? u.createdAt.toISOString() : String(u.createdAt),
        isOnline: onlineUids.has(u.uid) || (Boolean(u.email) && onlineEmails.has(u.email.toLowerCase())),
      }));

      res.json({
        onlineCount: onlineSessions.length,
        onlineSessions,
        registeredUsers,
      });
    } catch (error) {
      console.error('Failed to fetch active user list:', error);
      res.status(500).json({ error: 'ইউজার লিস্ট লোড করা যায়নি।' });
    }
  });

  // Super Admin only: assign or revoke Cashier (Sub-Admin) role
  app.patch('/api/users/role', async (req: AuthRequest, res) => {
    try {
      const caller = await verifyAdminOnly(req, res);
      if (!caller) return;

      const target = String(req.body?.target || '').trim();
      const role = req.body?.role === 'cashier' ? 'cashier' : req.body?.role === 'member' ? 'member' : null;
      const displayName = typeof req.body?.displayName === 'string' ? req.body.displayName.trim() : undefined;

      if (!target || !role) {
        res.status(400).json({ error: 'সঠিক ইউজার ইমেইল এবং রোল (cashier/member) নির্বাচন করুন' });
        return;
      }

      const result = await updateUserRoleInDb(target, role, displayName);
      if (!result.ok) {
        res.status(400).json({ error: result.error });
        return;
      }

      await addAuditLogInDb({
        actorName: caller.actorName,
        actorRole: caller.role,
        action: role === 'cashier' ? 'ক্যাশিয়ার নিয়োগ' : 'ক্যাশিয়ার রোল বাতিল',
        details: `${result.user.displayName || result.user.email} (${result.user.email}) -> ${role}`,
      });

      broadcastPresenceUpdated();
      res.json({ ok: true, user: result.user });
    } catch (error) {
      console.error('Failed to update user role:', error);
      res.status(500).json({ error: 'রোল পরিবর্তন করা যায়নি।' });
    }
  });

  // Authenticated user profile & role sync endpoint (Firebase Auth -> PostgreSQL users table)
  app.get('/api/auth/me', requireAuth, async (req: AuthRequest, res) => {
    try {
      const dbUser = req.dbUser;
      if (!dbUser) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }
      res.json({
        uid: dbUser.uid,
        email: dbUser.email,
        displayName: dbUser.displayName || dbUser.email,
        photoUrl: dbUser.photoUrl || '',
        role: dbUser.role,
        isAdmin: dbUser.role === 'admin',
        isCashier: dbUser.role === 'cashier',
        isStaff: dbUser.role === 'admin' || dbUser.role === 'cashier',
      });
    } catch (error) {
      console.error('Failed to fetch authenticated profile:', error);
      res.status(500).json({ error: 'Failed to verify user session' });
    }
  });

  // Public ledger state endpoint (backed by PostgreSQL, never exposes adminPin)
  app.get('/api/state', async (_req, res) => {
    try {
      res.setHeader('Cache-Control', 'no-store');
      const state = await getFullUnityState();
      res.json(state);
    } catch (error) {
      console.error('Failed to load state from PostgreSQL:', error);
      res.status(500).json({ error: 'ডেটা লোড করতে সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।' });
    }
  });

  // Public in-app update manifest endpoint
  app.get('/api/updates', async (_req, res) => {
    try {
      res.setHeader('Cache-Control', 'no-store');
      const state = await getFullUnityState();
      const changelog = Array.isArray(state.appConfig.changelog) ? state.appConfig.changelog : [];
      const latest = changelog[0] || {
        version: String(state.appConfig.appVersion || '2.1.0'),
        releaseDate: new Date(state.updatedAtMs).toISOString().slice(0, 10),
        notes: 'সর্বশেষ আপডেট',
        publishedAtMs: state.updatedAtMs,
      };
      res.json({
        appVersion: String(state.appConfig.appVersion || latest.version),
        buildId: getServerBuildId(),
        updatedAtMs: state.updatedAtMs,
        releaseDate: latest.releaseDate,
        releaseNotes: latest.notes,
        changelog,
      });
    } catch (error) {
      console.error('Failed to load updates:', error);
      res.status(500).json({ error: 'আপডেট তথ্য পাওয়া যায়নি।' });
    }
  });

  // Dedicated Admin Passcode verification (strictly blocks member/admin phone numbers)
  app.post('/api/admin/verify', async (req, res) => {
    try {
      const pin = typeof req.body?.pin === 'string' ? req.body.pin.trim() : '';
      const result = await verifyAdminPinInDb(pin);
      if (result.ok) {
        await addAuditLogInDb({
          actorName: result.adminName || 'Shohag Hossain',
          actorRole: 'admin',
          action: 'এডমিন লগইন',
          details: `পাসওয়ার্ড দিয়ে এডমিন প্যানেল আনলক করা হয়েছে (${detectDeviceFromHeader(req.headers['user-agent'])})`,
        });
        res.json({ ok: true, adminName: result.adminName });
        return;
      }
      res.status(401).json({ ok: false, error: result.reason || 'ভুল এডমিন পাসওয়ার্ড' });
    } catch (error) {
      console.error('Failed to verify admin PIN:', error);
      res.status(500).json({ ok: false, error: 'ভেরিফিকেশন সম্পন্ন করা যায়নি।' });
    }
  });

  // Protected state save endpoint (Super Admin only, atomic PostgreSQL transaction)
  app.put('/api/state', async (req: AuthRequest, res) => {
    try {
      const caller = await verifyAdminOnly(req, res);
      if (!caller) return;

      const body = req.body as Partial<UnityDatabase> & { _auditSummary?: string };
      if (!body || !Array.isArray(body.members)) {
        res.status(400).json({ error: 'অবৈধ ডেটা ফরম্যাট' });
        return;
      }

      const auditSummary = typeof body._auditSummary === 'string' ? body._auditSummary.trim() : '';
      const saved = await saveFullUnityState(body);

      await addAuditLogInDb({
        actorName: caller.actorName,
        actorRole: caller.role,
        action: 'ডেটাবেজ আপডেট',
        details: auditSummary || `মোট ${saved.members.length} জন সদস্যের হিসাব সিঙ্ক ও সংরক্ষণ করা হয়েছে`,
      });

      broadcastStateUpdated(saved.updatedAtMs, 'state_saved');
      res.json(saved);
    } catch (error) {
      console.error('Failed to save state to PostgreSQL:', error);
      res.status(500).json({ error: 'ডেটা সংরক্ষণ করতে সমস্যা হয়েছে।' });
    }
  });

  // Staff (Admin OR Cashier) Deposit Recording Endpoint
  app.post('/api/staff/deposits', async (req: AuthRequest, res) => {
    try {
      const caller = await verifyStaffOrAdmin(req, res);
      if (!caller) return;

      const mode = req.body?.mode === 'range' ? 'range' : 'single';
      const result = await addStaffDepositInDb({
        memberId: Number(req.body?.memberId),
        mode,
        date: typeof req.body?.date === 'string' ? req.body.date : undefined,
        startDate: typeof req.body?.startDate === 'string' ? req.body.startDate : undefined,
        endDate: typeof req.body?.endDate === 'string' ? req.body.endDate : undefined,
        amount: Number(req.body?.amount),
        note: typeof req.body?.note === 'string' ? req.body.note : undefined,
        actorName: caller.actorName,
        actorRole: caller.role,
      });

      if (!result.ok) {
        res.status(400).json({ error: result.error });
        return;
      }

      const freshState = await getFullUnityState();
      broadcastStateUpdated(result.updatedAtMs, 'staff_deposit_added');
      res.json({ ok: true, count: result.count, state: freshState });
    } catch (error) {
      console.error('Failed to record staff deposit:', error);
      res.status(500).json({ error: 'ডিপোজিট সংরক্ষণ করা যায়নি।' });
    }
  });

  // Staff (Admin OR Cashier) Draw Recording Endpoint
  app.post('/api/staff/draws', async (req: AuthRequest, res) => {
    try {
      const caller = await verifyStaffOrAdmin(req, res);
      if (!caller) return;

      const result = await addStaffDrawInDb({
        memberId: Number(req.body?.memberId),
        date: String(req.body?.date || ''),
        amount: Number(req.body?.amount),
        note: typeof req.body?.note === 'string' ? req.body.note : undefined,
        actorName: caller.actorName,
        actorRole: caller.role,
      });

      if (!result.ok) {
        res.status(400).json({ error: result.error });
        return;
      }

      const freshState = await getFullUnityState();
      broadcastStateUpdated(result.updatedAtMs, 'staff_draw_added');
      res.json({ ok: true, state: freshState });
    } catch (error) {
      console.error('Failed to record staff draw:', error);
      res.status(500).json({ error: 'ড্র সংরক্ষণ করা যায়নি।' });
    }
  });

  // bKash Payment Request Queue (List / Submit / Approve-Reject)
  app.get('/api/payment-requests', async (req: AuthRequest, res) => {
    try {
      res.setHeader('Cache-Control', 'no-store');
      const caller = await resolveStaffOrAdminCaller(req);
      const isStaff = Boolean(caller);
      const list = await listPaymentRequestsInDb(100);

      // Mask sender phone for public viewers, show full phone to Admin/Cashier
      const safeList = isStaff
        ? list
        : list.map((item) => ({
            ...item,
            senderPhone:
              item.senderPhone.length > 6
                ? `${item.senderPhone.slice(0, 3)}••••${item.senderPhone.slice(-4)}`
                : '••••••',
          }));

      res.json({
        requests: safeList,
        pendingCount: list.filter((r) => r.status === 'pending').length,
      });
    } catch (error) {
      console.error('Failed to list payment requests:', error);
      res.status(500).json({ error: 'পেমেন্ট রিকোয়েস্ট লোড করা যায়নি।' });
    }
  });

  app.post('/api/payment-requests', async (req, res) => {
    try {
      const result = await createPaymentRequestInDb({
        memberId: Number(req.body?.memberId),
        senderPhone: String(req.body?.senderPhone || ''),
        trxId: String(req.body?.trxId || ''),
        amount: Number(req.body?.amount),
        date: String(req.body?.date || ''),
        note: typeof req.body?.note === 'string' ? req.body.note : '',
      });

      if (!result.ok) {
        res.status(400).json({ error: result.error });
        return;
      }

      broadcastRequestsUpdated('created');
      res.status(201).json({ ok: true, request: result.request });
    } catch (error) {
      console.error('Failed to submit payment request:', error);
      res.status(500).json({ error: 'পেমেন্ট রিকোয়েস্ট জমা দেওয়া যায়নি।' });
    }
  });

  app.post('/api/payment-requests/:id/review', async (req: AuthRequest, res) => {
    try {
      const caller = await verifyStaffOrAdmin(req, res);
      if (!caller) return;

      const decision =
        req.body?.decision === 'approved'
          ? 'approved'
          : req.body?.decision === 'rejected'
            ? 'rejected'
            : null;
      if (!decision) {
        res.status(400).json({ error: 'অবৈধ সিদ্ধান্ত (approved বা rejected দিন)' });
        return;
      }

      const result = await reviewPaymentRequestInDb({
        requestId: String(req.params.id || ''),
        decision,
        reviewerName: caller.actorName,
        reviewerRole: caller.role,
        reviewNote: typeof req.body?.reviewNote === 'string' ? req.body.reviewNote : '',
      });

      if (!result.ok) {
        res.status(400).json({ error: result.error });
        return;
      }

      broadcastRequestsUpdated(decision);
      if (decision === 'approved') {
        broadcastStateUpdated(result.updatedAtMs, 'payment_request_approved');
      }

      const freshState = decision === 'approved' ? await getFullUnityState() : undefined;
      res.json({ ok: true, request: result.request, state: freshState });
    } catch (error) {
      console.error('Failed to review payment request:', error);
      res.status(500).json({ error: 'রিকোয়েস্ট রিভিউ সম্পন্ন করা যায়নি।' });
    }
  });

  // Audit Log Trail (Admin & Cashier read-only)
  app.get('/api/audit-logs', async (req: AuthRequest, res) => {
    try {
      const caller = await verifyStaffOrAdmin(req, res);
      if (!caller) return;

      res.setHeader('Cache-Control', 'no-store');
      const logs = await listAuditLogsInDb(150);
      res.json({ logs });
    } catch (error) {
      console.error('Failed to fetch audit logs:', error);
      res.status(500).json({ error: 'অডিট লগ লোড করা যায়নি।' });
    }
  });

  // Protected publish new app update endpoint (Super Admin only)
  app.post('/api/admin/publish-update', async (req: AuthRequest, res) => {
    try {
      const caller = await verifyAdminOnly(req, res);
      if (!caller) return;

      const version = String(req.body?.version || '').trim();
      const notes = String(req.body?.notes || '').trim();
      if (!version || !notes) {
        res.status(400).json({ error: 'ভার্সন এবং আপডেট বিবরণ উভয়ই প্রয়োজন' });
        return;
      }

      const saved = await publishAppUpdateInDb(version, notes);
      await addAuditLogInDb({
        actorName: caller.actorName,
        actorRole: caller.role,
        action: 'অ্যাপ আপডেট পাবলিশ',
        details: `ভার্সন v${version}: ${notes}`,
      });
      broadcastStateUpdated(saved.updatedAtMs, 'update_published');
      res.json(saved);
    } catch (error) {
      console.error('Failed to publish app update:', error);
      res.status(500).json({ error: 'আপডেট পাবলিশ করা যায়নি।' });
    }
  });

  // Protected change admin name & passcode endpoint (Super Admin only)
  app.post('/api/admin/change-pin', async (req: AuthRequest, res) => {
    try {
      const caller = await verifyAdminOnly(req, res);
      if (!caller) return;

      const newPin = String(req.body?.newPin || '').trim();
      const newName = String(req.body?.adminName || '').trim();
      const result = await updateAdminCredentialsInDb(newName, newPin);
      if (!result.ok) {
        res.status(400).json({ error: result.error || 'পাসওয়ার্ড আপডেট করা যায়নি' });
        return;
      }
      await addAuditLogInDb({
        actorName: caller.actorName,
        actorRole: caller.role,
        action: 'এডমিন পাসওয়ার্ড পরিবর্তন',
        details: `অ্যাডমিন নাম: ${result.adminName}`,
      });
      broadcastStateUpdated(Date.now(), 'admin_updated');
      res.json({ ok: true, adminName: result.adminName });
    } catch (error) {
      console.error('Failed to change admin credentials:', error);
      res.status(500).json({ error: 'অ্যাডমিন তথ্য আপডেট করা যায়নি।' });
    }
  });

  // Member profile photo update endpoint (allowed for verified Admin/Cashier OR matching member phone owner)
  app.patch('/api/members/:id/photo', async (req: AuthRequest, res) => {
    try {
      const rawId = Number(req.params.id);
      if (!Number.isInteger(rawId) || rawId <= 0) {
        res.status(400).json({ error: 'অবৈধ সদস্য আইডি' });
        return;
      }

      const photoUrl = typeof req.body?.photoUrl === 'string' ? req.body.photoUrl.trim() : '';
      if (!isValidMemberPhotoUrl(photoUrl)) {
        res.status(400).json({
          error: 'অবৈধ ছবি ফরম্যাট বা সাইজ। অনুগ্রহ করে JPG/PNG/WEBP ছবি বা লাইব্রেরি অ্যাভাটার বেছে নিন।',
        });
        return;
      }

      const staffCaller = await resolveStaffOrAdminCaller(req);
      let actorName = staffCaller?.actorName || `সদস্য #${rawId}`;
      let actorRole = staffCaller?.role || 'member';

      if (!staffCaller) {
        const memberPhone = typeof req.body?.memberPhone === 'string' ? req.body.memberPhone.trim() : '';
        const phoneMatches = await verifyMemberPhoneInDb(rawId, memberPhone);
        if (!phoneMatches) {
          res.status(403).json({
            error: 'ছবি পরিবর্তনের জন্য সদস্যের রেজিস্টার্ড মোবাইল নম্বর সঠিকভাবে দিন অথবা এডমিন লগইন করুন।',
          });
          return;
        }
      }

      const saved = await updateMemberPhotoInDb(rawId, photoUrl);
      if (!saved.ok) {
        res.status(400).json({ error: saved.error });
        return;
      }

      await addAuditLogInDb({
        actorName,
        actorRole,
        action: 'প্রোফাইল ছবি আপডেট',
        details: `সদস্য #${rawId}-এর প্রোফাইল ছবি ${photoUrl ? 'পরিবর্তন' : 'মুছে ফেলা'} হয়েছে`,
      });

      broadcastStateUpdated(saved.updatedAtMs, 'member_photo_updated');
      res.json(saved);
    } catch (error) {
      console.error('Failed to update member profile photo:', error);
      res.status(500).json({ error: 'প্রোফাইল ছবি সংরক্ষণ করতে সমস্যা হয়েছে।' });
    }
  });

  // Super Admin Full Member Update (supports changing Serial/ID, swapping IDs, Name, Phone, and Photo atomically)
  app.patch('/api/admin/members/:id', async (req: AuthRequest, res) => {
    try {
      const caller = await verifyAdminOnly(req, res);
      if (!caller) return;

      const oldId = Number(req.params.id);
      const newId = Number(req.body?.newId ?? oldId);
      const name = typeof req.body?.name === 'string' ? req.body.name : '';
      const phone = typeof req.body?.phone === 'string' ? req.body.phone : '';
      const photoUrl =
        typeof req.body?.photoUrl === 'string' ? req.body.photoUrl : undefined;
      const swapIfTaken = Boolean(req.body?.swapIfTaken);

      const result = await updateMemberFullInfoInDb({
        oldId,
        newId,
        name,
        phone,
        photoUrl,
        swapIfTaken,
      });

      if (!result.ok) {
        res.status(400).json(result);
        return;
      }

      const idNote =
        oldId !== result.memberId
          ? result.swappedWithName
            ? `সিরিয়াল/আইডি #${oldId} ⇄ #${result.memberId} (${result.swappedWithName}-এর সাথে অদল-বদল)`
            : `সিরিয়াল/আইডি #${oldId} → #${result.memberId}`
          : `আইডি #${result.memberId}`;

      await addAuditLogInDb({
        actorName: caller.actorName,
        actorRole: caller.role,
        action: 'সদস্যের তথ্য আপডেট',
        details: `${name.trim()} (${idNote})-এর তথ্য হালনাগাদ করা হয়েছে`,
      });

      broadcastStateUpdated(result.updatedAtMs, 'member_updated');
      res.json(result);
    } catch (error) {
      console.error('Failed to update member info:', error);
      res.status(500).json({ ok: false, error: 'সদস্যের তথ্য সংরক্ষণ করতে সমস্যা হয়েছে।' });
    }
  });

  // Dedicated Super Admin App Icon & Logo Update Endpoint (fast atomic DB update + real error feedback)
  app.put('/api/admin/app-icon', async (req: AuthRequest, res) => {
    try {
      const caller = await verifyAdminOnly(req, res);
      if (!caller) return;

      const appIconUrl =
        req.body?.appIconUrl === null || typeof req.body?.appIconUrl === 'string'
          ? req.body.appIconUrl
          : undefined;
      const appIcon192Url =
        req.body?.appIcon192Url === null || typeof req.body?.appIcon192Url === 'string'
          ? req.body.appIcon192Url
          : undefined;
      const appIconMaskableUrl =
        req.body?.appIconMaskableUrl === null || typeof req.body?.appIconMaskableUrl === 'string'
          ? req.body.appIconMaskableUrl
          : undefined;
      const appLogoUrl =
        req.body?.appLogoUrl === null || typeof req.body?.appLogoUrl === 'string'
          ? req.body.appLogoUrl
          : undefined;

      const result = await updateAppBrandingInDb({
        appIconUrl,
        appIcon192Url,
        appIconMaskableUrl,
        appLogoUrl,
      });

      if (!result.ok) {
        res.status(400).json(result);
        return;
      }

      const isReset = appIconUrl === '' || appIconUrl === null;
      await addAuditLogInDb({
        actorName: caller.actorName,
        actorRole: caller.role,
        action: 'অ্যাপ আইকন আপডেট',
        details: isReset
          ? 'অ্যাপ আইকন ডিফল্ট অবস্থায় ফিরিয়ে আনা হয়েছে'
          : 'অ্যাপের নতুন কাস্টম আইকন (১৯২×১৯২ ও ৫১২×৫১২) আপডেট করা হয়েছে',
      });

      broadcastStateUpdated(result.updatedAtMs, 'app_icon_updated');
      res.json(result);
    } catch (error) {
      console.error('Failed to update app icon:', error);
      res.status(500).json({ ok: false, error: 'অ্যাপ আইকন সার্ভারে সংরক্ষণ করা যায়নি।' });
    }
  });

  // Dynamic App Icon Helper (serves exact 192x192, 512x512, or maskable binary PNG/JPEG across all PWA icon routes)
  const serveDynamicAppIcon = async (
    sizeKey: '180' | '192' | '512' | 'maskable',
    res: express.Response
  ) => {
    try {
      const state = await getFullUnityState();
      const cfg = state.appConfig;

      let candidate: string | undefined;
      if (sizeKey === 'maskable') {
        candidate = cfg.appIconMaskableUrl || cfg.appIconUrl || cfg.appLogoUrl;
      } else if (sizeKey === '192' || sizeKey === '180') {
        candidate = cfg.appIcon192Url || cfg.appIconUrl || cfg.appLogoUrl;
      } else {
        candidate = cfg.appIconUrl || cfg.appIcon192Url || cfg.appLogoUrl;
      }

      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');

      if (isSafeAppIconDataUrl(candidate)) {
        const match = /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/]+=*)$/.exec(candidate);
        if (match) {
          const mime = match[1];
          const bytes = Buffer.from(match[2], 'base64');
          res.setHeader('Content-Type', mime);
          res.send(bytes);
          return;
        }
      }

      // Strict fixed allowlist of fallback static PNG icons in public/
      const fallbackFile =
        sizeKey === '180'
          ? 'apple-touch-icon.png'
          : sizeKey === '192'
            ? 'pwa-192x192.png'
            : sizeKey === 'maskable'
              ? 'pwa-maskable-512x512.png'
              : 'pwa-512x512.png';
      const publicDir = path.resolve(__dirname, 'public');
      const resolvedPath = path.resolve(publicDir, fallbackFile);
      if (resolvedPath.startsWith(publicDir + path.sep) && fs.existsSync(resolvedPath)) {
        res.setHeader('Content-Type', 'image/png');
        res.sendFile(resolvedPath);
        return;
      }

      res.status(404).end();
    } catch (error) {
      console.error('Failed to serve dynamic app icon:', error);
      res.status(500).end();
    }
  };

  app.get('/api/app-icon', (req, res) => {
    const raw = String(req.query.size || '512');
    const sizeKey: '180' | '192' | '512' | 'maskable' =
      raw === '180' || raw === '192' || raw === 'maskable' ? raw : '512';
    void serveDynamicAppIcon(sizeKey, res);
  });
  // Intercept standard PWA/browser icon paths so even cached/static links serve the live Admin App Icon
  app.get('/pwa-192x192.png', (_req, res) => void serveDynamicAppIcon('192', res));
  app.get('/pwa-512x512.png', (_req, res) => void serveDynamicAppIcon('512', res));
  app.get('/pwa-maskable-512x512.png', (_req, res) => void serveDynamicAppIcon('maskable', res));
  app.get('/apple-touch-icon.png', (_req, res) => void serveDynamicAppIcon('180', res));
  app.get('/favicon.ico', (_req, res) => void serveDynamicAppIcon('192', res));

  // Dynamic Web App Manifest (reflects Admin's live App Icon with exact verified dimensions & MIME types)
  const detectMimeFromDataUrl = (dataUrl?: string): string => {
    if (!dataUrl) return 'image/png';
    if (dataUrl.startsWith('data:image/jpeg')) return 'image/jpeg';
    if (dataUrl.startsWith('data:image/webp')) return 'image/webp';
    return 'image/png';
  };

  const serveDynamicManifest = async (_req: express.Request, res: express.Response) => {
    try {
      const state = await getFullUnityState();
      const ver = state.updatedAtMs || Date.now();
      const cfg = state.appConfig;
      const custom512 = isSafeAppIconDataUrl(cfg.appIconUrl) ? cfg.appIconUrl : undefined;
      const custom192 = isSafeAppIconDataUrl(cfg.appIcon192Url) ? cfg.appIcon192Url : undefined;
      const customMaskable = isSafeAppIconDataUrl(cfg.appIconMaskableUrl)
        ? cfg.appIconMaskableUrl
        : undefined;
      const customLogo = isSafeAppIconDataUrl(cfg.appLogoUrl) ? cfg.appLogoUrl : undefined;
      const hasAnyCustom = Boolean(custom512 || custom192 || customLogo);

      const rawTheme = String(cfg.themeColor || '#0f766e').trim();
      const safeTheme = /^#[0-9a-fA-F]{6}$/.test(rawTheme) ? rawTheme : '#0f766e';

      const icons: Array<{ src: string; sizes: string; type: string; purpose: string }> = [];

      if (hasAnyCustom) {
        if (custom192) {
          icons.push({
            src: `/api/app-icon?size=192&v=${ver}`,
            sizes: '192x192',
            type: detectMimeFromDataUrl(custom192),
            purpose: 'any',
          });
        }
        if (custom512) {
          icons.push({
            src: `/api/app-icon?size=512&v=${ver}`,
            sizes: custom192 ? '512x512' : 'any',
            type: detectMimeFromDataUrl(custom512),
            purpose: 'any',
          });
        } else if (customLogo && !custom192) {
          icons.push({
            src: `/api/app-icon?size=512&v=${ver}`,
            sizes: 'any',
            type: detectMimeFromDataUrl(customLogo),
            purpose: 'any',
          });
        }
        if (customMaskable) {
          icons.push({
            src: `/api/app-icon?size=maskable&v=${ver}`,
            sizes: '512x512',
            type: detectMimeFromDataUrl(customMaskable),
            purpose: 'maskable',
          });
        }
      } else {
        icons.push(
          {
            src: `/pwa-192x192.png?v=${ver}`,
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: `/pwa-512x512.png?v=${ver}`,
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: `/pwa-maskable-512x512.png?v=${ver}`,
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          }
        );
      }

      res.setHeader('Content-Type', 'application/manifest+json; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.json({
        id: '/',
        name: 'BARAKAH MULTICARE HOSPITAL UNITY',
        short_name: 'BarakahUnity',
        description:
          'দৈনিক ডিপোজিট, সদস্য হিসাব, ড্র ব্যবস্থাপনা, নিয়মাবলি ও রসিদ ডাউনলোড সিস্টেম — BARAKAH MULTICARE HOSPITAL UNITY।',
        theme_color: safeTheme,
        background_color: cfg.darkMode ? '#020617' : '#f8fafc',
        display: 'standalone',
        orientation: 'portrait-primary',
        start_url: '/',
        scope: '/',
        icons,
      });
    } catch (error) {
      console.error('Failed to generate dynamic web app manifest:', error);
      res.status(500).json({ error: 'Manifest unavailable' });
    }
  };

  app.get('/api/manifest.webmanifest', serveDynamicManifest);
  app.get('/manifest.webmanifest', serveDynamicManifest);

  // Public App Info (advertises publicly accessible Shared App URL & live buildId for cross-device updates)
  app.get('/api/app-info', (_req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    const rawAppUrl = String(process.env.APP_URL || '').trim().replace(/\/+$/, '');
    const sharedAppUrl = rawAppUrl.replace(/^(https?:\/\/)ais-dev-/i, '$1ais-pre-');
    res.json({
      sharedAppUrl,
      isDevPreview: /^https?:\/\/ais-dev-/i.test(rawAppUrl),
      buildId: getServerBuildId(),
    });
  });

  const httpServer = http.createServer(app);
  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR === 'true' ? false : { server: httpServer },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.join(__dirname, 'dist');
    app.use(
      express.static(distDir, {
        setHeaders(res, filePath) {
          const base = path.basename(filePath);
          if (
            base === 'index.html' ||
            base === 'sw.js' ||
            base === 'registerSW.js' ||
            base === 'manifest.webmanifest' ||
            base === 'build-meta.json' ||
            base.startsWith('workbox-')
          ) {
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
            res.setHeader('Pragma', 'no-cache');
            res.setHeader('Expires', '0');
          } else if (filePath.includes(`${path.sep}assets${path.sep}`)) {
            res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
          }
        },
      })
    );
    app.get('*', (_req, res) => {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  const port = Number(process.env.PORT) || 3000;
  httpServer.listen(port, '0.0.0.0', () => {
    console.log(`BARAKAH MULTICARE HOSPITAL UNITY running on http://0.0.0.0:${port}`);
  });
}

startServer();
