# Security Specification & Hardening Audit

## 1. Data Invariants
1. **Identity Isolation**: No student may read, list, create, update, or delete another student's `users`, `users/*/private`, `studentProfiles`, `tradingAccounts`, `accountTransactions`, `trades`, `tradeEditLogs`, `tradeScreenshots`, `riskViolations`, `psychologyAssessments`, `assignments`, `mentorReviews`, `tradeReviews`, or `notifications`.
2. **Privilege Escalation Prevention**: Users creating `/users/{userId}` or `/studentProfiles/{userId}` MUST only set `role == 'student'` and `status == 'active'` (or `'pending'`); only verified administrators (`isAdmin()`) may write to `/admins/{adminId}` or change a user's `role` or `status`.
3. **Email Verification Gate**: Admin privilege via bootstrapped email (`keptonokoth@gmail.com`) strictly requires `request.auth.token.email_verified == true`. All standard write operations require `isVerifiedSignedIn()`.
4. **PII Isolation**: Sensitive fields (`email`, `phone`, `country`) are stored in `/users/{userId}/private/{docId}` readable only by owner or admin. Public `/leaderboardEntries/{userId}` never contains email, phone, account balance, or private journals, and `list`/`get` is restricted to `optedIn == true || owner || admin`.
5. **Immutable Audit Trails**: `/tradeEditLogs/{logId}` and `/auditLogs/{logId}` prohibit `update` and `delete` for everyone (`allow update, delete: if false`).
6. **Parent Integrity**: `accountTransactions` creation verifies `exists(/databases/$(database)/documents/tradingAccounts/$(incoming().accountId))` and matching `userId`. `tradeScreenshots` creation verifies matching `trades/{tradeId}` ownership.
7. **Strict Field Allowlists & Size Bounds**: Every write validates `keys().hasAll(...) && keys().hasOnly(...)` on `create`, `affectedKeys().hasOnly(...)` on `update`, regex `^[a-zA-Z0-9_\-]+$` on IDs, and `.size()` limits on every string and array.

## 2. The "Dirty Dozen" Adversarial Payloads
1. **Self-Admin Escalation**: Student writes `/users/{uid}` with `role: "mentor"` -> DENIED.
2. **Shadow Field Injection**: Student creates `/trades/{id}` with extra field `isApprovedByMentor: true` -> DENIED (`keys().hasOnly(...)`).
3. **Unverified Admin Email Spoof**: Unverified user with `email: "keptonokoth@gmail.com", email_verified: false` reads `/auditLogs` -> DENIED.
4. **ID Poisoning**: Attacker creates `/trades/aaaa...200chars` -> DENIED (`isValidId`).
5. **Cross-Tenant Trade Read**: Student A queries `/trades` without `where('userId', '==', uid)` -> DENIED (`allow list` checks `resource.data.userId == request.auth.uid`).
6. **PII Scraping**: Student A reads `/users/studentB/private/info` -> DENIED.
7. **Orphaned Transaction**: Student creates `/accountTransactions/{id}` with nonexistent `accountId` -> DENIED (`exists` check).
8. **Fake Mentor Review**: Student creates `/tradeReviews/{id}` reviewing their own trade -> DENIED (`isAdmin()` required).
9. **Audit Log Tampering**: User attempts `updateDoc` or `deleteDoc` on `/tradeEditLogs/{id}` -> DENIED (`if false`).
10. **Unbounded Array Exhaustion**: Student updates `studentProfiles/{uid}` with `preferredInstruments` of 50 items -> DENIED (`size() <= 15`).
11. **Opt-Out Leaderboard Leak**: Student A reads `/leaderboardEntries/studentB` when `optedIn == false` -> DENIED.
12. **Client Timestamp Forgery**: Student creates `/trades/{id}` with `createdAt: "1999-01-01T00:00:00Z"` instead of `request.time` -> DENIED (`incoming().createdAt == request.time`).
