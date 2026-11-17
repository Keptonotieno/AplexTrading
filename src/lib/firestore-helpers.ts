import { serverTimestamp } from 'firebase/firestore';

/**
 * Generates a Firestore-safe ID matching ^[a-zA-Z0-9_\-]+$ (max 128 chars).
 */
export function generateSafeId(prefix = 'rec'): string {
  const rand =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID().replace(/-/g, '').slice(0, 16)
      : Math.random().toString(36).slice(2, 14);
  const ts = Date.now().toString(36);
  return `${prefix}_${ts}_${rand}`.slice(0, 120);
}

/**
 * Strips undefined/null values from payloads so Firestore rules `!(key in data)`
 * checks work cleanly without failing on optional fields.
 */
export function cleanPayload<T extends Record<string, unknown>>(obj: T): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined && value !== null) {
      if (typeof value === 'string') {
        result[key] = value;
      } else if (typeof value === 'number') {
        if (Number.isFinite(value)) {
          result[key] = value;
        }
      } else {
        result[key] = value;
      }
    }
  }
  return result;
}

export function truncateStr(val: string | undefined, maxLen: number): string | undefined {
  if (val === undefined) return undefined;
  const trimmed = val.trim();
  if (!trimmed) return undefined;
  return trimmed.slice(0, maxLen);
}

export function tsNow() {
  return serverTimestamp();
}

export function formatFirestoreDate(val: unknown): string {
  if (!val) return '—';
  if (typeof val === 'string') {
    const d = new Date(val);
    return Number.isNaN(d.getTime())
      ? val
      : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }
  if (typeof val === 'object' && val !== null && 'toDate' in val && typeof (val as { toDate: () => Date }).toDate === 'function') {
    return (val as { toDate: () => Date }).toDate().toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }
  return '—';
}

export function toIsoString(val: unknown): string {
  if (!val) return new Date().toISOString();
  if (typeof val === 'string') return val;
  if (typeof val === 'object' && val !== null && 'toDate' in val && typeof (val as { toDate: () => Date }).toDate === 'function') {
    return (val as { toDate: () => Date }).toDate().toISOString();
  }
  return new Date().toISOString();
}
