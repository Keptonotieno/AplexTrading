import {
  collection,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  setDoc,
  where,
  type QueryConstraint,
  type WriteBatch,
} from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from './firebase';
import { cleanPayload, generateSafeId, toIsoString, truncateStr, tsNow } from './firestore-helpers';
import type { AuditLog, UserRole } from '../types/domain';

export type AuditAction =
  | 'user_role_changed'
  | 'admin_privilege_granted'
  | 'admin_privilege_revoked'
  | 'student_status_active'
  | 'student_status_pending'
  | 'student_status_suspended'
  | 'student_profile_created'
  | 'profile_updated'
  | 'private_info_updated'
  | 'leaderboard_privacy_updated'
  | 'trading_account_created'
  | 'trading_account_updated'
  | 'account_deposit'
  | 'account_withdrawal'
  | 'trade_created'
  | 'trade_journal_edited'
  | 'trade_draft_deleted'
  | 'trade_screenshot_uploaded'
  | 'trade_screenshot_updated'
  | 'trade_screenshot_deleted'
  | 'trade_review_submitted'
  | 'psychology_checkin_logged'
  | 'risk_violation_acknowledged'
  | 'risk_policy_updated'
  | 'challenge_cycle_created'
  | 'challenge_cycle_updated'
  | 'challenge_enrolled'
  | 'learning_material_published'
  | 'assignment_submitted'
  | 'assignment_reviewed'
  | 'announcement_published'
  | 'mentor_notification_sent'
  | 'mentor_report_generated'
  | 'system_settings_updated'
  | (string & {});

export type AuditTargetType =
  | 'user'
  | 'student'
  | 'admin'
  | 'tradingAccount'
  | 'trade'
  | 'tradeScreenshot'
  | 'psychology'
  | 'riskViolation'
  | 'riskPolicy'
  | 'challengeCycle'
  | 'learningMaterial'
  | 'assignment'
  | 'announcement'
  | 'systemSettings'
  | 'system'
  | (string & {});

export interface AuditFieldChange {
  before?: unknown;
  after?: unknown;
}

export interface AuditEventInput {
  action: AuditAction;
  targetType: AuditTargetType;
  targetId?: string;
  details?: string;
  changes?: Record<string, AuditFieldChange>;
  /**
   * Must match the currently authenticated Firebase user UID (`request.auth.uid`).
   * Omit to automatically bind to `auth.currentUser.uid`.
   */
  actorId?: string;
  actorEmail?: string;
}

const VALID_ID_REGEX = /^[a-zA-Z0-9_-]{1,128}$/;
const SENSITIVE_KEY_PATTERN =
  /pass(word|phrase)?|secret|token|api[-_]?key|credential|private[-_]?key|ssn|pin|auth/i;

export function isValidFirestoreId(value: string | undefined): value is string {
  return typeof value === 'string' && VALID_ID_REGEX.test(value);
}

function formatAuditValue(key: string, val: unknown): string {
  if (SENSITIVE_KEY_PATTERN.test(key)) {
    return '[REDACTED]';
  }
  if (val === undefined || val === null || val === '') {
    return 'none';
  }
  if (Array.isArray(val)) {
    return `[${val.slice(0, 8).map(String).join(', ')}${val.length > 8 ? ', …' : ''}]`;
  }
  if (typeof val === 'object') {
    return '[object]';
  }
  const str = String(val).replace(/\s+/g, ' ').trim();
  return str.length > 80 ? `${str.slice(0, 77)}...` : str;
}

export function buildAuditDetails(
  baseDetails?: string,
  changes?: Record<string, AuditFieldChange>
): string | undefined {
  const parts: string[] = [];
  if (baseDetails && baseDetails.trim()) {
    parts.push(baseDetails.trim());
  }

  if (changes) {
    const diffs = Object.entries(changes)
      .filter(([, diff]) => diff.before !== diff.after)
      .map(
        ([field, diff]) =>
          `${field}: ${formatAuditValue(field, diff.before)} -> ${formatAuditValue(field, diff.after)}`
      );
    if (diffs.length > 0) {
      parts.push(`Changes [${diffs.join('; ')}]`);
    }
  }

  return truncateStr(parts.join(' | '), 1000);
}

interface PreparedAuditLog {
  id: string;
  path: string;
  payload: Record<string, unknown>;
}

function prepareAuditLogRecord(input: AuditEventInput): PreparedAuditLog {
  const currentUser = auth.currentUser;
  const resolvedActorId = input.actorId || currentUser?.uid;

  if (!currentUser || !resolvedActorId) {
    throw new Error('Audit logging requires an authenticated Firebase user session.');
  }

  if (resolvedActorId !== currentUser.uid) {
    throw new Error('Security violation: audit actorId must match the authenticated user.');
  }

  if (!currentUser.emailVerified) {
    throw new Error('Audit logging requires a verified email account.');
  }

  if (!isValidFirestoreId(resolvedActorId)) {
    throw new Error('Invalid actorId format for Firestore audit log.');
  }

  const safeTargetId =
    input.targetId && isValidFirestoreId(input.targetId) ? input.targetId : undefined;

  const id = generateSafeId('audit');
  const path = `auditLogs/${id}`;

  const safeAction = truncateStr(input.action, 100) || 'sensitive_action';
  const safeTargetType = truncateStr(input.targetType, 60) || 'system';
  const safeEmail = truncateStr(input.actorEmail || currentUser.email || undefined, 254);
  const safeDetails = buildAuditDetails(input.details, input.changes);

  const payload = cleanPayload({
    id,
    actorId: resolvedActorId,
    actorEmail: safeEmail,
    action: safeAction,
    targetType: safeTargetType,
    targetId: safeTargetId,
    details: safeDetails,
    createdAt: tsNow(),
  });

  return { id, path, payload };
}

/**
 * Queues a schema-validated, immutable audit log entry inside an existing Firestore `writeBatch`
 * so the sensitive operation and its administrative audit trail commit atomically.
 */
export function queueAuditLogInBatch(batch: WriteBatch, input: AuditEventInput): string {
  const { id, payload } = prepareAuditLogRecord(input);
  batch.set(doc(db, 'auditLogs', id), payload);
  return id;
}

/**
 * Securely writes an immutable audit log record into the Firestore `auditLogs` collection.
 * Enforces verified identity, actor matching (`request.auth.uid`), redaction, and schema limits.
 */
export async function logAuditEvent(input: AuditEventInput): Promise<string> {
  const { id, path, payload } = prepareAuditLogRecord(input);
  try {
    await setDoc(doc(db, 'auditLogs', id), payload);
    return id;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function logUserRoleChange(params: {
  targetUserId: string;
  targetName?: string;
  previousRole: UserRole;
  newRole: UserRole;
  actorId?: string;
  actorEmail?: string;
}): Promise<string> {
  return logAuditEvent({
    actorId: params.actorId,
    actorEmail: params.actorEmail,
    action: 'user_role_changed',
    targetType: 'user',
    targetId: params.targetUserId,
    details: `Role updated for ${params.targetName || params.targetUserId}`,
    changes: {
      role: { before: params.previousRole, after: params.newRole },
    },
  });
}

export async function logProfileModification(params: {
  userId: string;
  changedFields: Record<string, AuditFieldChange>;
  summary?: string;
  actorId?: string;
  actorEmail?: string;
}): Promise<string> {
  return logAuditEvent({
    actorId: params.actorId,
    actorEmail: params.actorEmail,
    action: 'profile_updated',
    targetType: 'student',
    targetId: params.userId,
    details: params.summary || 'Student profile settings modified',
    changes: params.changedFields,
  });
}

export async function logTradeJournalEdit(params: {
  tradeId: string;
  instrument: string;
  previousStatus: string;
  newStatus: string;
  previousNetPnl?: number;
  newNetPnl?: number;
  actorId?: string;
  actorEmail?: string;
}): Promise<string> {
  return logAuditEvent({
    actorId: params.actorId,
    actorEmail: params.actorEmail,
    action: 'trade_journal_edited',
    targetType: 'trade',
    targetId: params.tradeId,
    details: `Edited ${params.instrument} trade journal entry`,
    changes: {
      status: { before: params.previousStatus, after: params.newStatus },
      netPnl: { before: params.previousNetPnl, after: params.newNetPnl },
    },
  });
}

/**
 * Queries immutable administrative audit logs (authorized administrators only per Firestore rules).
 */
export async function queryAuditLogs(options?: {
  action?: string;
  targetType?: string;
  actorId?: string;
  maxResults?: number;
}): Promise<AuditLog[]> {
  const constraints: QueryConstraint[] = [];
  if (options?.action) {
    constraints.push(where('action', '==', options.action));
  }
  if (options?.targetType) {
    constraints.push(where('targetType', '==', options.targetType));
  }
  if (options?.actorId && isValidFirestoreId(options.actorId)) {
    constraints.push(where('actorId', '==', options.actorId));
  }
  if (constraints.length === 0) {
    constraints.push(orderBy('createdAt', 'desc'));
  }
  constraints.push(limit(Math.max(1, Math.min(250, options?.maxResults ?? 100))));

  try {
    const q = query(collection(db, 'auditLogs'), ...constraints);
    const snap = await getDocs(q);
    return snap.docs
      .map((d) => d.data() as AuditLog)
      .sort((a, b) => toIsoString(b.createdAt).localeCompare(toIsoString(a.createdAt)));
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'auditLogs');
  }
}
