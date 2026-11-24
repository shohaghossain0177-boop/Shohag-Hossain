# Security Specification — BARAKAH MULTICARE HOSPITAL UNITY (Firestore)

## 1. Data Invariants

1. **Public Transparency vs. PII Isolation**:
   - Organization ledger data (`unityConfig`, `members`, `deposits`, `draws`, `rules`) is publicly readable (`isPublic == true`) per Rule #9 (স্বচ্ছতা ও পাবলিক রেকর্ড).
   - Unmasked member phone numbers (`memberContacts/{memberId}`) are strictly isolated as PII and readable/writable ONLY by verified admins (`isAdmin()`).
   - Dedicated Admin Passcode (`adminSecrets/{secretId}`) and admin registry (`admins/{uid}`) are strictly readable/writable ONLY by verified admins.
2. **Strict Admin Authorization & Email Verification**:
   - Every write (`create`, `update`, `delete`) to any collection requires a verified Firebase Auth user (`request.auth != null && request.auth.token.email_verified == true`) who is either the bootstrap admin (`shohaghossain0177@gmail.com`) or listed in `/admins/{uid}`.
   - Admin Passcode is stored exclusively in `/adminSecrets/config`, never compared against or allowed to collide with member phone numbers.
3. **Unlimited Scalability Without Unbounded Arrays**:
   - Members (`/members/{memberId}`), contacts (`/memberContacts/{memberId}`), deposits (`/deposits/{depositId}`), draws (`/draws/{drawId}`), and rules (`/rules/{ruleId}`) are individual documents in top-level collections, eliminating the 1MB document limit and any member count cap.
   - Bounded configuration arrays inside `/unityConfig/main` (`customToggles <= 30`, `automatedPopups <= 20`, `changelog <= 30`) enforce strict upper bounds.
4. **Temporal & Structural Integrity**:
   - All document IDs match `^[a-zA-Z0-9_\-]+$` and are `<= 128` characters.
   - `createdAt` must equal `request.time` on `create` and remain immutable on `update`.
   - `updatedAt` must equal `request.time` on both `create` and `update`.
   - Every string enforces explicit `.size()` bounds; every create checks both `hasAll` and `hasOnly`; every update enforces `affectedKeys().hasOnly(...)` wrapped by `isValid[Entity](incoming())`.

## 2. The "Dirty Dozen" Attack Payloads (All MUST Return PERMISSION_DENIED)

1. **Unauthenticated Write to Members**: Anonymous client attempts `create` on `/members/999` with valid schema -> DENIED (not signed in / not admin).
2. **Unverified Email Admin Spoof**: Authenticated user with `email: "shohaghossain0177@gmail.com"` and `email_verified: false` attempts `update` on `/unityConfig/main` -> DENIED (`email_verified == true` enforced).
3. **Non-Admin PII Blanket Read**: Signed-in non-admin user attempts `get` on `/memberContacts/1` -> DENIED (PII isolation).
4. **Non-Admin AdminSecret Read**: Signed-in non-admin user attempts `get` on `/adminSecrets/config` -> DENIED.
5. **Self-Assigned Admin Privilege Escalation**: Signed-in non-admin attempts `create` on `/admins/{ownUid}` with `role: "admin"` -> DENIED.
6. **Shadow Field Injection on Member Create**: Admin attempts `create` on `/members/100` with extra ghost field `isVerified: true` -> DENIED (`hasOnly` rejects ghost key).
7. **Value Poisoning on Deposit Update**: Admin attempts `update` on `/deposits/d_1` setting `amount: -500` or `amount: "100"` -> DENIED (`isValidDeposit` enforces `amount is number && amount > 0 && amount <= 10000000`).
8. **Immutable Field Tampering (`createdAt`)**: Admin attempts `update` on `/members/1` modifying `createdAt` -> DENIED (`incoming().createdAt == existing().createdAt` & `affectedKeys().hasOnly`).
9. **Client Timestamp Forgery**: Admin attempts `create` on `/rules/r_99` with client-supplied `updatedAt` != `request.time` -> DENIED (`updatedAt == request.time`).
10. **Path Variable ID Poisoning**: Admin attempts `create` on `/deposits/invalid$id!with*bad#chars` -> DENIED (`isValidId`).
11. **Denial-of-Wallet Oversized String**: Admin attempts `create` on `/rules/r_big` with a 5,000-character `description` -> DENIED (`description.size() <= 1000`).
12. **Unfiltered Non-Public List Scrape**: Anonymous user attempts `list` on `/members` without `where('isPublic', '==', true)` -> DENIED (`allow list: if resource.data.isPublic == true`).
