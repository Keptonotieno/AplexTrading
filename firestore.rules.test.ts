/**
 * Firestore Security Rules Test Suite (Dirty Dozen Adversarial Verification)
 * Validates every security invariant documented in security_spec.md.
 */

export interface DirtyDozenCase {
  id: number;
  name: string;
  collection: string;
  operation: 'create' | 'update' | 'get' | 'list' | 'delete';
  expected: 'PERMISSION_DENIED';
  payloadSummary: string;
}

export const DIRTY_DOZEN_TEST_CASES: DirtyDozenCase[] = [
  {
    id: 1,
    name: 'Self-Admin Escalation',
    collection: '/users/{uid}',
    operation: 'create',
    expected: 'PERMISSION_DENIED',
    payloadSummary: 'Non-admin user tries setting role: "mentor" on signup.',
  },
  {
    id: 2,
    name: 'Shadow Field Injection',
    collection: '/trades/{tradeId}',
    operation: 'create',
    expected: 'PERMISSION_DENIED',
    payloadSummary: 'Payload injects unauthorized ghost field isApprovedByMentor: true.',
  },
  {
    id: 3,
    name: 'Unverified Admin Email Spoof',
    collection: '/auditLogs/{logId}',
    operation: 'get',
    expected: 'PERMISSION_DENIED',
    payloadSummary: 'Token with admin email string but email_verified: false tries reading auditLogs.',
  },
  {
    id: 4,
    name: 'ID Poisoning',
    collection: '/trades/{tradeId}',
    operation: 'create',
    expected: 'PERMISSION_DENIED',
    payloadSummary: 'Document ID exceeding 128 chars or containing invalid characters.',
  },
  {
    id: 5,
    name: 'Cross-Tenant Trade List Scrape',
    collection: '/trades',
    operation: 'list',
    expected: 'PERMISSION_DENIED',
    payloadSummary: 'Student runs collection query on /trades without where("userId", "==", uid).',
  },
  {
    id: 6,
    name: 'PII Scraping',
    collection: '/users/{otherUid}/private/info',
    operation: 'get',
    expected: 'PERMISSION_DENIED',
    payloadSummary: 'Student A requests Student B private contact PII document.',
  },
  {
    id: 7,
    name: 'Orphaned Account Transaction',
    collection: '/accountTransactions/{txId}',
    operation: 'create',
    expected: 'PERMISSION_DENIED',
    payloadSummary: 'Student creates deposit referencing nonexistent or foreign accountId.',
  },
  {
    id: 8,
    name: 'Self-Issued Mentor Trade Review',
    collection: '/tradeReviews/{reviewId}',
    operation: 'create',
    expected: 'PERMISSION_DENIED',
    payloadSummary: 'Student attempts to write a mentor review for their own trade.',
  },
  {
    id: 9,
    name: 'Audit Log Tampering',
    collection: '/tradeEditLogs/{logId}',
    operation: 'delete',
    expected: 'PERMISSION_DENIED',
    payloadSummary: 'User attempts to update or delete an immutable tradeEditLogs entry.',
  },
  {
    id: 10,
    name: 'Unbounded Array Exhaustion',
    collection: '/studentProfiles/{uid}',
    operation: 'update',
    expected: 'PERMISSION_DENIED',
    payloadSummary: 'Student writes 50 items to preferredInstruments (max 15).',
  },
  {
    id: 11,
    name: 'Opt-Out Leaderboard Leak',
    collection: '/leaderboardEntries/{otherUid}',
    operation: 'get',
    expected: 'PERMISSION_DENIED',
    payloadSummary: 'Student reads leaderboard entry of user with optedIn: false.',
  },
  {
    id: 12,
    name: 'Client Timestamp Forgery',
    collection: '/trades/{tradeId}',
    operation: 'create',
    expected: 'PERMISSION_DENIED',
    payloadSummary: 'Student supplies forged timestamp instead of request.time.',
  },
];
