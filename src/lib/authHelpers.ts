import type { User } from 'firebase/auth';
import { doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { db, isAllowedAdminEmail } from './firebase';

export interface FormattedAuthError {
  code?: string;
  message: string;
  helpUrl?: string;
}

const AUTH_SETTINGS_URL = `https://console.firebase.google.com/project/${firebaseConfig.projectId}/authentication/settings`;
const AUTH_PROVIDERS_URL = `https://console.firebase.google.com/project/${firebaseConfig.projectId}/authentication/providers`;
const AUTH_USERS_URL = `https://console.firebase.google.com/project/${firebaseConfig.projectId}/authentication/users`;

export function formatFirebaseAuthError(
  err: unknown,
  flow: 'google' | 'email-signin' | 'email-register' | 'reset' = 'google'
): FormattedAuthError {
  const code = (err as { code?: string })?.code;
  const hostname =
    typeof window !== 'undefined' && window.location?.hostname
      ? window.location.hostname
      : 'this domain';

  switch (code) {
    case 'auth/unauthorized-domain':
      return {
        code,
        message: `Domain "${hostname}" is not authorized in Firebase Authentication for project ${firebaseConfig.projectId}. Add "${hostname}" under Firebase Console → Authentication → Settings → Authorized domains, then refresh and try again.`,
        helpUrl: AUTH_SETTINGS_URL,
      };
    case 'auth/popup-blocked':
      return {
        code,
        message:
          'Your browser blocked the Google sign-in popup window. Allow popups for this site or try again.',
      };
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return {
        code,
        message:
          'Google sign-in was closed before completion. Click Continue with Google whenever you are ready.',
      };
    case 'auth/account-exists-with-different-credential':
      return {
        code,
        message:
          'An account already exists for this email using Email & Password sign-in. Sign in with your email and password first.',
      };
    case 'auth/operation-not-allowed':
      return {
        code,
        message:
          flow === 'google'
            ? `Google Sign-In is currently disabled in Firebase Authentication for project ${firebaseConfig.projectId}. Enable Google under Authentication → Sign-in method.`
            : `Email/Password authentication is disabled in Firebase Console for project ${firebaseConfig.projectId}. Enable Email/Password under Authentication → Sign-in method, or use Continue with Google.`,
        helpUrl: AUTH_PROVIDERS_URL,
      };
    case 'auth/invalid-credential':
    case 'auth/user-not-found':
    case 'auth/wrong-password':
      return {
        code,
        message:
          'Invalid email or password, or this email uses Google Sign-In. Check your credentials, register on the Register tab, or click Continue with Google.',
        helpUrl: AUTH_USERS_URL,
      };
    case 'auth/email-already-in-use':
      return {
        code,
        message:
          'An account with this email address already exists. Switch to the Sign In tab or use Continue with Google.',
      };
    case 'auth/invalid-email':
      return {
        code,
        message: 'Please enter a valid email address.',
      };
    case 'auth/weak-password':
      return {
        code,
        message: 'Password must be at least 6 characters long.',
      };
    case 'auth/user-disabled':
      return {
        code,
        message: 'This account has been disabled. Contact your mentorship administrator.',
      };
    case 'auth/network-request-failed':
      return {
        code,
        message:
          'Unable to reach authentication servers. Check your internet connection and try again.',
      };
    case 'auth/too-many-requests':
      return {
        code,
        message: 'Too many authentication attempts. Wait a brief moment and try again.',
      };
    default: {
      const fallback =
        err instanceof Error && err.message ? err.message : 'Authentication failed. Please try again.';
      return { code, message: fallback };
    }
  }
}

/**
 * Verifies admin privileges strictly through backend token verification (/api/auth/verify-admin)
 * when the Node API is present, and verifies against Firestore server rules (/admins/{uid})
 * when deployed as a static bundle without /api middleware (ignoring SPA HTML 200 fallbacks).
 */
export async function verifyAdminSession(user: User): Promise<boolean> {
  if (!user.emailVerified) return false;

  try {
    const token = await user.getIdToken(true);
    const verifyRes = await fetch('/api/auth/verify-admin', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const contentType = verifyRes.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      if (!verifyRes.ok) return false;
      const payload = (await verifyRes.json()) as { authorized?: boolean };
      return payload.authorized === true;
    }

    if (verifyRes.status === 401 || verifyRes.status === 403) {
      return false;
    }
  } catch {
    // Fallback to Firestore server check below when /api is unreachable on static hosting
  }

  if (isAllowedAdminEmail(user.email)) {
    return true;
  }

  try {
    const adminSnap = await getDocFromServer(doc(db, 'admins', user.uid));
    return adminSnap.exists();
  } catch {
    return false;
  }
}
