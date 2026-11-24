import type { NextFunction, Request, Response } from 'express';
import type { DecodedIdToken } from 'firebase-admin/auth';
import { getOrCreateUser } from '../db/users.ts';
import { adminAuth } from '../lib/firebase-admin.ts';

export interface AuthRequest extends Request {
  user?: DecodedIdToken;
  dbUser?: {
    id: number;
    uid: string;
    email: string;
    displayName: string;
    photoUrl: string;
    role: string;
  };
}

function detectDeviceFromHeader(ua: string): string {
  const s = String(ua || '').toLowerCase();
  if (s.includes('android')) return 'Android';
  if (s.includes('iphone') || s.includes('ipad') || s.includes('ios')) return 'iPhone / iOS';
  if (s.includes('windows')) return 'Windows PC';
  if (s.includes('mac os') || s.includes('macintosh')) return 'Mac';
  if (s.includes('linux')) return 'Linux';
  return 'Web Browser';
}

export const requireAuth = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized: Missing token' });
    return;
  }

  const token = authHeader.split('Bearer ')[1];
  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    req.user = decodedToken;
    const dbUser = await getOrCreateUser(decodedToken.uid, decodedToken.email || '', {
      displayName: typeof decodedToken.name === 'string' ? decodedToken.name : undefined,
      photoUrl: typeof decodedToken.picture === 'string' ? decodedToken.picture : undefined,
      deviceInfo: detectDeviceFromHeader(String(req.headers['user-agent'] || '')),
    });
    req.dbUser = dbUser;
    next();
  } catch (error) {
    console.error('Error verifying Firebase ID token:', error);
    res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
};

export const optionalAuth = async (req: AuthRequest, _res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split('Bearer ')[1];
    try {
      const decodedToken = await adminAuth.verifyIdToken(token);
      req.user = decodedToken;
      req.dbUser = await getOrCreateUser(decodedToken.uid, decodedToken.email || '', {
        displayName: typeof decodedToken.name === 'string' ? decodedToken.name : undefined,
        photoUrl: typeof decodedToken.picture === 'string' ? decodedToken.picture : undefined,
        deviceInfo: detectDeviceFromHeader(String(req.headers['user-agent'] || '')),
      });
    } catch {
      // Invalid optional token treated as unauthenticated
    }
  }
  next();
};
