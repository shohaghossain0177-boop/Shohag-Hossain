/**
 * Phase 0 Security TDD Specification for BARAKAH MULTICARE HOSPITAL UNITY Firestore Rules.
 * Verifies that all "Dirty Dozen" adversarial payloads are rejected with PERMISSION_DENIED.
 *
 * Run against Firebase Emulator Suite when testing locally with @firebase/rules-unit-testing.
 */

export interface DirtyDozenTestCase {
  id: number;
  name: string;
  collectionPath: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  auth: { uid: string; email?: string; email_verified?: boolean } | null;
  payload?: Record<string, unknown>;
  expected: 'PERMISSION_DENIED';
}

export const DIRTY_DOZEN_PAYLOADS: DirtyDozenTestCase[] = [
  {
    id: 1,
    name: 'Unauthenticated Write to Members',
    collectionPath: 'members/999',
    operation: 'create',
    auth: null,
    payload: {
      memberId: 999,
      name: 'Attacker',
      maskedPhone: '017••••0000',
      isPublic: true,
    },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 2,
    name: 'Unverified Email Admin Spoof',
    collectionPath: 'unityConfig/main',
    operation: 'update',
    auth: { uid: 'spoof-uid', email: 'shohaghossain0177@gmail.com', email_verified: false },
    payload: { adminName: 'Hijacked Admin' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 3,
    name: 'Non-Admin PII Blanket Read on memberContacts',
    collectionPath: 'memberContacts/1',
    operation: 'get',
    auth: { uid: 'regular-user', email: 'member@example.com', email_verified: true },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 4,
    name: 'Non-Admin Read on adminSecrets',
    collectionPath: 'adminSecrets/config',
    operation: 'get',
    auth: { uid: 'regular-user', email: 'member@example.com', email_verified: true },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 5,
    name: 'Self-Assigned Admin Role Escalation',
    collectionPath: 'admins/regular-user',
    operation: 'create',
    auth: { uid: 'regular-user', email: 'member@example.com', email_verified: true },
    payload: { uid: 'regular-user', email: 'member@example.com', role: 'admin' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 6,
    name: 'Shadow Field Injection on Member Create',
    collectionPath: 'members/100',
    operation: 'create',
    auth: { uid: 'admin-uid', email: 'shohaghossain0177@gmail.com', email_verified: true },
    payload: {
      memberId: 100,
      name: 'Valid Name',
      maskedPhone: '017••••1234',
      isPublic: true,
      isVerified: true, // Ghost field
    },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 7,
    name: 'Value Poisoning on Deposit Update (Negative Amount)',
    collectionPath: 'deposits/d_1',
    operation: 'update',
    auth: { uid: 'admin-uid', email: 'shohaghossain0177@gmail.com', email_verified: true },
    payload: { amount: -500 },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 8,
    name: 'Immutable createdAt Field Tampering',
    collectionPath: 'members/1',
    operation: 'update',
    auth: { uid: 'admin-uid', email: 'shohaghossain0177@gmail.com', email_verified: true },
    payload: { name: 'Updated', createdAt: new Date('2020-01-01T00:00:00Z') },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 9,
    name: 'Client Timestamp Forgery on Rule Create',
    collectionPath: 'rules/r_99',
    operation: 'create',
    auth: { uid: 'admin-uid', email: 'shohaghossain0177@gmail.com', email_verified: true },
    payload: {
      ruleId: 'r_99',
      order: 99,
      title: 'Forged Rule',
      description: 'Backdated timestamp',
      isPublic: true,
      createdAt: new Date('2020-01-01T00:00:00Z'),
      updatedAt: new Date('2020-01-01T00:00:00Z'),
    },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 10,
    name: 'Path Variable ID Poisoning',
    collectionPath: 'deposits/bad$id!chars',
    operation: 'create',
    auth: { uid: 'admin-uid', email: 'shohaghossain0177@gmail.com', email_verified: true },
    payload: { depositId: 'bad$id!chars', memberId: 1, date: '2026-11-23', amount: 100, note: 'test', isPublic: true },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 11,
    name: 'Denial-of-Wallet Oversized Rule Description',
    collectionPath: 'rules/r_oversized',
    operation: 'create',
    auth: { uid: 'admin-uid', email: 'shohaghossain0177@gmail.com', email_verified: true },
    payload: {
      ruleId: 'r_oversized',
      order: 15,
      title: 'Too Big',
      description: 'x'.repeat(5000),
      isPublic: true,
    },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 12,
    name: 'Unfiltered List Query on Private MemberContacts by Non-Admin',
    collectionPath: 'memberContacts',
    operation: 'list',
    auth: { uid: 'regular-user', email: 'member@example.com', email_verified: true },
    expected: 'PERMISSION_DENIED',
  },
];
