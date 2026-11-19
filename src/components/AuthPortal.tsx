import React, { useEffect, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  updateProfile,
} from 'firebase/auth';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Lock,
  Mail,
  Moon,
  RefreshCw,
  ShieldCheck,
  Sun,
  UserPlus,
} from 'lucide-react';
import { auth, authPersistenceReady } from '../lib/firebase';
import { formatFirebaseAuthError, verifyAdminSession } from '../lib/authHelpers';
import {
  ACCOUNT_TYPE_SPECS,
  ENROLLMENT_AMOUNT_PRESETS,
  formatAccountTypeLabel,
  getMinimumInitialBalance,
  INSTRUMENT_SPECS,
} from '../lib/forexCalculations';
import { completeStudentOnboarding } from '../services/mentorshipService';
import type { StudentProfile, TradingAccount } from '../types/domain';
import { useMentorship } from '../context/MentorshipContext';
import { BrandMark } from './BrandMark';

type AuthMode = 'signin' | 'register' | 'reset' | 'admin';

const POPULAR_INSTRUMENTS = Object.keys(INSTRUMENT_SPECS);

function isPrivateAdminRoute(): boolean {
  if (typeof window === 'undefined') return false;
  const hash = window.location.hash.toLowerCase();
  const params = new URLSearchParams(window.location.search);
  return hash === '#admin' || params.get('portal') === 'admin';
}

export const AuthPortal: React.FC = () => {
  const {
    firebaseUser,
    needsOnboarding,
    authError,
    authHelpUrl,
    clearAuthError,
    theme,
    toggleTheme,
    logout,
  } = useMentorship();
  const [mode, setMode] = useState<AuthMode>(() =>
    isPrivateAdminRoute() ? 'admin' : 'signin'
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [providerHelpUrl, setProviderHelpUrl] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (authError) {
      setError(authError);
      setProviderHelpUrl(authHelpUrl);
    }
  }, [authError, authHelpUrl]);

  useEffect(() => {
    const onHashChange = () => {
      if (isPrivateAdminRoute()) {
        setMode('admin');
        setError(null);
        setProviderHelpUrl(null);
        setNotice(null);
        clearAuthError();
      }
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, [clearAuthError]);

  // Sign In / Register credentials
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Onboarding & Registration Profile fields
  const [fullName, setFullName] = useState(firebaseUser?.displayName || '');
  useEffect(() => {
    if (firebaseUser?.displayName && !fullName) {
      setFullName(firebaseUser.displayName);
    }
  }, [firebaseUser?.displayName, fullName]);
  const [phone, setPhone] = useState('');
  const [country, setCountry] = useState('');
  const [experienceLevel, setExperienceLevel] = useState<StudentProfile['experienceLevel']>('intermediate');
  const [preferredInstruments, setPreferredInstruments] = useState<string[]>([]);
  const [brokerName, setBrokerName] = useState('');
  const [initialAccountName, setInitialAccountName] = useState('');
  const [initialAccountType, setInitialAccountType] = useState<TradingAccount['accountType']>('standard');
  const [initialCustomTypeLabel, setInitialCustomTypeLabel] = useState('');
  const [initialScalePreset, setInitialScalePreset] = useState<'1' | '0.1' | '0.01' | 'custom'>('1');
  const [initialCustomScaleValue, setInitialCustomScaleValue] = useState('1');
  const [initialCurrency, setInitialCurrency] = useState<TradingAccount['currency']>('USD');
  const [initialBalance, setInitialBalance] = useState('');

  const toggleInstrument = (sym: string) => {
    setPreferredInstruments((prev) =>
      prev.includes(sym) ? prev.filter((x) => x !== sym) : prev.length < 15 ? [...prev, sym] : prev
    );
  };

  const handleGoogleAuth = async () => {
    setBusy(true);
    setError(null);
    setProviderHelpUrl(null);
    setNotice(null);
    clearAuthError();
    const provider = new GoogleAuthProvider();
    provider.addScope('email');
    provider.addScope('profile');
    provider.setCustomParameters({ prompt: 'select_account' });

    try {
      await authPersistenceReady;
      if (mode === 'admin' && typeof window !== 'undefined') {
        sessionStorage.setItem('fm_requested_admin', '1');
      } else if (typeof window !== 'undefined') {
        sessionStorage.removeItem('fm_requested_admin');
      }

      const cred = await signInWithPopup(auth, provider);
      if (mode === 'admin') {
        const authorized = await verifyAdminSession(cred.user);
        if (!authorized) {
          sessionStorage.removeItem('fm_requested_admin');
          await signOut(auth);
          setError(
            'Access Denied: Only authorized Mentor / Administrator accounts can access the Admin Portal.'
          );
        }
      }
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      if (code === 'auth/popup-blocked') {
        try {
          await signInWithRedirect(auth, provider);
          return;
        } catch (redirectErr: unknown) {
          if (typeof window !== 'undefined') sessionStorage.removeItem('fm_requested_admin');
          const formatted = formatFirebaseAuthError(redirectErr, 'google');
          setError(formatted.message);
          setProviderHelpUrl(formatted.helpUrl || null);
        }
      } else {
        if (typeof window !== 'undefined') sessionStorage.removeItem('fm_requested_admin');
        const formatted = formatFirebaseAuthError(err, 'google');
        setError(formatted.message);
        setProviderHelpUrl(formatted.helpUrl || null);
      }
    } finally {
      setBusy(false);
    }
  };

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setProviderHelpUrl(null);
    setNotice(null);
    clearAuthError();
    try {
      await authPersistenceReady;
      if (mode === 'admin' && typeof window !== 'undefined') {
        sessionStorage.setItem('fm_requested_admin', '1');
      } else if (typeof window !== 'undefined') {
        sessionStorage.removeItem('fm_requested_admin');
      }
      const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
      if (mode === 'admin') {
        if (!cred.user.emailVerified) {
          setError('Your administrator email must be verified before entering the Admin Portal.');
          return;
        }
        const authorized = await verifyAdminSession(cred.user);
        if (!authorized) {
          sessionStorage.removeItem('fm_requested_admin');
          await signOut(auth);
          setError('Access Denied: This account does not hold verified Administrator privileges.');
        }
      }
    } catch (err: unknown) {
      if (typeof window !== 'undefined') sessionStorage.removeItem('fm_requested_admin');
      const formatted = formatFirebaseAuthError(err, 'email-signin');
      setError(formatted.message);
      setProviderHelpUrl(formatted.helpUrl || null);
    } finally {
      setBusy(false);
    }
  };

  const handleEmailRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !email.trim() || password.length < 6) {
      setError('Please enter your full name, valid email, and a password of at least 6 characters.');
      return;
    }
    setBusy(true);
    setError(null);
    setProviderHelpUrl(null);
    setNotice(null);
    clearAuthError();
    try {
      await authPersistenceReady;
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
      await updateProfile(cred.user, { displayName: fullName.trim() });
      try {
        await sendEmailVerification(cred.user);
        setNotice('Verification link sent to your email address. Please verify your email and click Continue.');
      } catch (verifyErr: unknown) {
        const formatted = formatFirebaseAuthError(verifyErr, 'email-register');
        setError(`Account created, but verification email could not be sent yet: ${formatted.message}`);
      }
    } catch (err: unknown) {
      const formatted = formatFirebaseAuthError(err, 'email-register');
      setError(formatted.message);
      setProviderHelpUrl(formatted.helpUrl || null);
    } finally {
      setBusy(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Enter your registered email address to receive a password reset link.');
      return;
    }
    setBusy(true);
    setError(null);
    setProviderHelpUrl(null);
    setNotice(null);
    clearAuthError();
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setNotice('Password recovery email sent. Check your inbox and spam folder.');
    } catch (err: unknown) {
      const formatted = formatFirebaseAuthError(err, 'reset');
      setError(formatted.message);
      setProviderHelpUrl(formatted.helpUrl || null);
    } finally {
      setBusy(false);
    }
  };

  const handleCompleteOnboarding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseUser) return;
    if (!fullName.trim()) {
      setError('Full name is required.');
      return;
    }
    const minRequired = getMinimumInitialBalance(initialAccountType);
    const parsedInitialBalance = Number(initialBalance);
    if (!Number.isFinite(parsedInitialBalance) || parsedInitialBalance < minRequired) {
      setError(
        `${formatAccountTypeLabel(initialAccountType, initialCustomTypeLabel)} accounts require a minimum starting capital of $${minRequired}.00.`
      );
      return;
    }

    const resolvedScale =
      initialAccountType === 'custom'
        ? initialScalePreset === 'custom'
          ? Number(initialCustomScaleValue)
          : Number(initialScalePreset)
        : undefined;

    if (
      initialAccountType === 'custom' &&
      (!Number.isFinite(resolvedScale) || (resolvedScale ?? 0) <= 0 || (resolvedScale ?? 0) > 100)
    ) {
      setError('Custom contract scale must be a positive multiplier between 0.001 and 100.');
      return;
    }

    setBusy(true);
    setError(null);
    try {
      await completeStudentOnboarding({
        uid: firebaseUser.uid,
        email: firebaseUser.email || email,
        fullName: fullName.trim(),
        phone: phone.trim() || undefined,
        country: country.trim() || 'Global',
        experienceLevel,
        preferredInstruments,
        brokerName: brokerName.trim() || undefined,
        initialAccountName: initialAccountName.trim() || 'Primary Trading Account',
        initialAccountType,
        initialCustomTypeLabel:
          initialAccountType === 'custom' ? initialCustomTypeLabel.trim() || undefined : undefined,
        initialCustomContractScale: resolvedScale,
        initialCurrency,
        initialBalance: parsedInitialBalance,
        photoUrl: firebaseUser.photoURL || undefined,
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save profile.');
    } finally {
      setBusy(false);
    }
  };

  // Case 1: Signed in via Email/Password, awaiting email verification
  if (firebaseUser && !firebaseUser.emailVerified) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#080D17] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white dark:bg-[#0F172A] border border-slate-200/90 dark:border-slate-800 rounded-2xl shadow-[0_1px_3px_rgba(15,23,42,0.04),0_14px_34px_-12px_rgba(15,23,42,0.08)] p-6 sm:p-7 space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200/70 dark:border-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-white">Verify Your Email</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">{firebaseUser.email}</p>
            </div>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            To protect student trading journals and comply with security verification rules, please click the verification link sent to your inbox before accessing the platform.
          </p>
          {notice && (
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-xs text-emerald-700 dark:text-emerald-400">
              {notice}
            </div>
          )}
          {error && (
            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-xs text-red-700 dark:text-red-400">
              {error}
            </div>
          )}
          <div className="flex flex-col gap-2.5">
            <button
              type="button"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                setError(null);
                setNotice(null);
                try {
                  const current = auth.currentUser || firebaseUser;
                  await current.reload();
                  if (auth.currentUser?.emailVerified) {
                    await auth.currentUser.getIdToken(true);
                  } else {
                    setError('Email is not verified yet. Open the verification link in your inbox (check spam too), then click Continue.');
                  }
                } catch (e: unknown) {
                  const formatted = formatFirebaseAuthError(e, 'email-signin');
                  setError(formatted.message);
                } finally {
                  setBusy(false);
                }
              }}
              className="w-full h-11 flex items-center justify-center gap-2 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-semibold active:scale-[0.99] transition-all duration-150 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-blue-600/30"
            >
              <RefreshCw className="w-4 h-4" />
              I Verified My Email — Continue
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                setError(null);
                try {
                  await sendEmailVerification(auth.currentUser || firebaseUser);
                  setNotice('Verification email resent. Check your inbox and spam folder.');
                } catch (e: unknown) {
                  const formatted = formatFirebaseAuthError(e, 'email-register');
                  setError(formatted.message);
                } finally {
                  setBusy(false);
                }
              }}
              className="w-full h-10 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              Resend Verification Email
            </button>
            <button
              type="button"
              onClick={async () => {
                setError(null);
                setProviderHelpUrl(null);
                setNotice(null);
                await logout();
              }}
              className="w-full py-2 text-xs text-slate-500 hover:text-slate-900 dark:hover:text-slate-200 transition-colors"
            >
              Sign out and use another account
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Case 2: Authenticated & verified, completing initial Student/Account Onboarding
  if (firebaseUser && needsOnboarding) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#080D17] flex items-center justify-center p-4 md:p-8">
        <div className="max-w-2xl w-full bg-white dark:bg-[#0F172A] border border-slate-200/90 dark:border-slate-800 rounded-2xl shadow-[0_1px_3px_rgba(15,23,42,0.05),0_12px_32px_-8px_rgba(15,23,42,0.07)] p-6 md:p-8 space-y-6">
          <div className="flex items-start justify-between gap-4 border-b border-slate-200/80 dark:border-slate-800 pb-4">
            <div className="flex items-center gap-3">
              <BrandMark size="lg" />
              <div>
                <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-white">
                  Complete Your Mentorship Profile
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Signed in as {firebaseUser.email} · Broker-independent performance setup
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={async () => {
                setError(null);
                setProviderHelpUrl(null);
                setNotice(null);
                await logout();
              }}
              className="text-xs font-medium text-slate-500 hover:text-slate-900 dark:hover:text-white whitespace-nowrap transition-colors"
            >
              Sign out
            </button>
          </div>

          {error && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-600 dark:text-red-400">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleCompleteOnboarding} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Enter your full name"
                  className="w-full px-3.5 py-2 text-sm rounded-lg bg-slate-50 dark:bg-[#0B111E] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Country *
                </label>
                <input
                  type="text"
                  required
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  placeholder="Country of residence"
                  className="w-full px-3.5 py-2 text-sm rounded-lg bg-slate-50 dark:bg-[#0B111E] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Phone Number (Optional)
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="International format (e.g. +1 555 000 0000)"
                  className="w-full px-3.5 py-2 text-sm rounded-lg bg-slate-50 dark:bg-[#0B111E] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Trading Experience Level
                </label>
                <select
                  value={experienceLevel}
                  onChange={(e) => setExperienceLevel(e.target.value as StudentProfile['experienceLevel'])}
                  className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-[#0B111E] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="beginner">Beginner (0–1 Years)</option>
                  <option value="intermediate">Intermediate (1–3 Years)</option>
                  <option value="advanced">Advanced (3+ Years)</option>
                  <option value="funded">Funded / Prop Trader</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Preferred Trading Instruments ({preferredInstruments.length}/15)
              </label>
              <div className="flex flex-wrap gap-1.5">
                {POPULAR_INSTRUMENTS.map((sym) => {
                  const active = preferredInstruments.includes(sym);
                  return (
                    <button
                      key={sym}
                      type="button"
                      onClick={() => toggleInstrument(sym)}
                      className={`px-2.5 py-1 text-xs font-mono rounded-md border transition-colors ${
                        active
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-slate-50 dark:bg-[#0B111E] text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:border-slate-400'
                      }`}
                    >
                      {sym}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="border-t border-slate-200 dark:border-slate-800 pt-4">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white mb-1">
                Initial Trading Account for Journaling
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                Descriptive record only — we never ask for broker passwords, MT4/MT5 logins, or API keys.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1.5">Account Label *</label>
                  <input
                    type="text"
                    required
                    value={initialAccountName}
                    onChange={(e) => setInitialAccountName(e.target.value)}
                    placeholder="e.g. Primary Trading Account"
                    className="w-full px-3.5 py-2 text-sm rounded-lg bg-slate-50 dark:bg-[#0B111E] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1.5">Account Tier</label>
                  <select
                    value={initialAccountType}
                    onChange={(e) => setInitialAccountType(e.target.value as TradingAccount['accountType'])}
                    className="w-full px-3.5 py-2 text-sm rounded-lg bg-slate-50 dark:bg-[#0B111E] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
                  >
                    <option value="standard">Standard Account (Min $10)</option>
                    <option value="cent">Cent Account (Min $10)</option>
                    <option value="demo">Demo Practice (Min $10)</option>
                    <option value="live">Live Standard (Min $10)</option>
                    <option value="prop_challenge">Prop Challenge (Min $10)</option>
                    <option value="funded">Funded (Min $10)</option>
                    <option value="custom">Custom Account (Min $1)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1.5">Currency</label>
                  <select
                    value={initialCurrency}
                    onChange={(e) => setInitialCurrency(e.target.value as TradingAccount['currency'])}
                    className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-[#0B111E] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
                  >
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                    <option value="JPY">JPY</option>
                    <option value="AUD">AUD</option>
                    <option value="CAD">CAD</option>
                    <option value="CHF">CHF</option>
                  </select>
                </div>
                {initialAccountType === 'custom' && (
                  <>
                    <div className="md:col-span-2">
                      <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1.5">
                        Custom Account Tier Name (Optional)
                      </label>
                      <input
                        type="text"
                        maxLength={60}
                        value={initialCustomTypeLabel}
                        onChange={(e) => setInitialCustomTypeLabel(e.target.value)}
                        placeholder="e.g. Raw ECN, Mini 10k, Hybrid Account"
                        className="w-full px-3.5 py-2 text-sm rounded-lg bg-slate-50 dark:bg-[#0B111E] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
                      />
                    </div>
                    <div className={initialScalePreset === 'custom' ? 'md:col-span-1' : 'md:col-span-2'}>
                      <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1.5">
                        Contract Size Scale
                      </label>
                      <select
                        value={initialScalePreset}
                        onChange={(e) =>
                          setInitialScalePreset(e.target.value as '1' | '0.1' | '0.01' | 'custom')
                        }
                        className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-[#0B111E] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
                      >
                        <option value="1">Standard (1x · 100k/lot)</option>
                        <option value="0.1">Mini (0.1x · 10k/lot)</option>
                        <option value="0.01">Cent / Micro (0.01x · 1k/lot)</option>
                        <option value="custom">Custom Multiplier</option>
                      </select>
                    </div>
                    {initialScalePreset === 'custom' && (
                      <div className="md:col-span-1">
                        <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1.5">
                          Scale Multiplier
                        </label>
                        <input
                          type="number"
                          step="0.001"
                          min="0.001"
                          max="100"
                          required
                          value={initialCustomScaleValue}
                          onChange={(e) => setInitialCustomScaleValue(e.target.value)}
                          placeholder="e.g. 0.5"
                          className="w-full px-3 py-2 text-sm font-mono tabular-nums rounded-lg bg-slate-50 dark:bg-[#0B111E] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
                        />
                      </div>
                    )}
                  </>
                )}
                <div className="md:col-span-2">
                  <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1.5">
                    Initial Balance * (Min ${getMinimumInitialBalance(initialAccountType)} · $10–$1,000+ supported)
                  </label>
                  <input
                    type="number"
                    min={getMinimumInitialBalance(initialAccountType)}
                    step="0.01"
                    required
                    value={initialBalance}
                    onChange={(e) => setInitialBalance(e.target.value)}
                    placeholder={`Enter any amount from $${getMinimumInitialBalance(initialAccountType)} to $1,000+`}
                    className="w-full px-3.5 py-2 text-sm font-mono tabular-nums rounded-lg bg-slate-50 dark:bg-[#0B111E] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
                  />
                  <div className="flex flex-wrap items-center gap-1.5 mt-2">
                    {ENROLLMENT_AMOUNT_PRESETS.map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setInitialBalance(String(preset))}
                        className={`px-2 py-0.5 text-[11px] font-mono tabular-nums rounded border transition-colors ${
                          Number(initialBalance) === preset
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-slate-50 dark:bg-[#0B111E] text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:border-slate-400'
                        }`}
                      >
                        ${preset}
                      </button>
                    ))}
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5">
                    {ACCOUNT_TYPE_SPECS[initialAccountType].description}
                  </p>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1.5">
                    Broker Name (Optional Descriptive Only)
                  </label>
                  <input
                    type="text"
                    value={brokerName}
                    onChange={(e) => setBrokerName(e.target.value)}
                    placeholder="Broker name (optional)"
                    className="w-full px-3.5 py-2 text-sm rounded-lg bg-slate-50 dark:bg-[#0B111E] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={busy}
              className="w-full py-2.5 px-5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-medium transition-colors"
            >
              {busy ? 'Creating Mentorship Workspace...' : 'Enter Forex Mentorship Dashboard'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Case 3: Unauthenticated Sign-In / Registration Portal
  const fieldClass =
    'w-full h-11 px-3.5 text-sm rounded-lg bg-slate-50/75 dark:bg-[#0B111E] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 hover:border-slate-300 dark:hover:border-slate-700 focus:bg-white dark:focus:bg-[#0F172A] focus:outline-none focus:border-blue-600 dark:focus:border-blue-500 focus:ring-3 focus:ring-blue-600/12 transition-[border-color,background-color,box-shadow] duration-150 motion-reduce:transition-none';

  const modeHeading =
    mode === 'admin'
      ? null
      : mode === 'signin'
      ? {
          title: 'Sign in to your workspace',
          subtitle: 'Access your trade ledger, drawdown metrics, and mentor feedback.',
        }
      : mode === 'register'
      ? {
          title: 'Create a student account',
          subtitle: 'Set up your manual journal with Cent, Standard, or Custom accounts ($10+).',
        }
      : {
          title: 'Reset your password',
          subtitle: 'Enter your registered email to receive a secure recovery link.',
        };

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#080D17] text-slate-900 dark:text-slate-100 flex flex-col justify-between px-4 py-5 sm:px-6 lg:px-8">
      {/* Top Bar */}
      <header className="max-w-6xl w-full mx-auto flex items-center justify-between gap-6 py-1.5">
        <a
          href="/"
          onClick={(e) => {
            e.preventDefault();
            setMode(isPrivateAdminRoute() ? 'admin' : 'signin');
            setError(null);
            setNotice(null);
          }}
          className="inline-flex items-center gap-2.5 whitespace-nowrap shrink-0 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded-lg"
        >
          <BrandMark size="md" className="transition-transform duration-150 group-hover:scale-[1.03] motion-reduce:transition-none" />
          <span className="text-[15px] font-bold tracking-[-0.02em] text-slate-900 dark:text-white whitespace-nowrap shrink-0">
            Forex Mentorship
          </span>
        </a>

        <button
          type="button"
          onClick={toggleTheme}
          aria-label={theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
          className="inline-flex items-center gap-2 h-9 px-3.5 text-xs font-medium rounded-lg bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700 hover:text-slate-900 dark:hover:text-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] active:scale-[0.98] transition-all duration-150 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 motion-reduce:transition-none"
        >
          {theme === 'dark' ? (
            <>
              <Sun className="w-3.5 h-3.5 text-amber-400" />
              <span>Light Theme</span>
            </>
          ) : (
            <>
              <Moon className="w-3.5 h-3.5 text-slate-500" />
              <span>Dark Theme</span>
            </>
          )}
        </button>
      </header>

      {/* Main Two-Column Hero & Auth Card */}
      <main className="max-w-6xl w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center my-8 lg:my-10">
        {/* Left Column: Brand Value Proposition & Capability Specifications */}
        <div className="lg:col-span-6 space-y-6">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2.5 text-xs font-semibold tracking-tight text-blue-700 dark:text-blue-400">
              <span className="w-5 h-px bg-blue-600 dark:bg-blue-400" aria-hidden="true" />
              <span>Manual Trade Ledger &amp; Risk Workspace</span>
            </div>

            <h1 className="text-[2rem] sm:text-[2.375rem] lg:text-[2.625rem] font-bold tracking-[-0.028em] text-slate-900 dark:text-white leading-[1.12] [text-wrap:balance]">
              Structured trade journaling and risk discipline for serious traders.
            </h1>

            <p className="text-[15px] text-slate-600 dark:text-slate-400 leading-[1.65] max-w-[54ch]">
              Record every manual execution with automated pip, lot-size, and R-multiple calculations, monitor live drawdown limits across Standard, Cent, and Custom accounts, and receive weekly mentor evaluations.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            <div className="group bg-white dark:bg-[#0F172A] border border-slate-200/90 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 rounded-xl p-4 sm:p-5 shadow-[0_1px_2px_rgba(15,23,42,0.03)] transition-colors duration-150 flex flex-col justify-between space-y-3.5 motion-reduce:transition-none">
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200/70 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400 flex items-center justify-center">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <span className="font-mono tabular-nums text-[11px] font-medium text-slate-400 dark:text-slate-500">
                    01
                  </span>
                </div>
                <h2 className="text-sm font-semibold tracking-tight text-slate-900 dark:text-white">
                  Broker-Independent Ledger
                </h2>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Zero broker passwords or API keys required. Your capital balances and execution records remain strictly private.
                </p>
              </div>
              <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800/80 text-[11px] font-medium text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                Standard · Cent · Custom accounts
              </div>
            </div>

            <div className="group bg-white dark:bg-[#0F172A] border border-slate-200/90 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 rounded-xl p-4 sm:p-5 shadow-[0_1px_2px_rgba(15,23,42,0.03)] transition-colors duration-150 flex flex-col justify-between space-y-3.5 motion-reduce:transition-none">
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-500/10 border border-blue-200/70 dark:border-blue-500/20 text-blue-700 dark:text-blue-400 flex items-center justify-center">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <span className="font-mono tabular-nums text-[11px] font-medium text-slate-400 dark:text-slate-500">
                    02
                  </span>
                </div>
                <h2 className="text-sm font-semibold tracking-tight text-slate-900 dark:text-white">
                  30-Day Evaluation Cycles
                </h2>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Track consistency, daily loss buffers, psychology check-ins, and realized R-multiples across recurring cycles.
                </p>
              </div>
              <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800/80 text-[11px] font-medium text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                22 instruments · Mentor reviews
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400 pt-1">
            <span>Automated Lot &amp; Pip Math</span>
            <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">·</span>
            <span>Multi-Stage Chart Evidence</span>
            <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">·</span>
            <span>Immutable Edit Audit Trail</span>
          </div>
        </div>

        {/* Right Column: Authentication Card */}
        <div className="lg:col-span-6">
          <div className="max-w-[464px] w-full lg:ml-auto bg-white dark:bg-[#0F172A] border border-slate-200/90 dark:border-slate-800 rounded-2xl shadow-[0_1px_3px_rgba(15,23,42,0.04),0_14px_34px_-12px_rgba(15,23,42,0.08)] dark:shadow-none p-6 sm:p-7 space-y-5">
            {mode !== 'admin' ? (
              <div
                role="tablist"
                aria-label="Authentication mode"
                className="grid grid-cols-3 gap-1 p-1 bg-slate-100/90 dark:bg-[#0B111E] border border-slate-200/70 dark:border-slate-800 rounded-xl"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === 'signin'}
                  onClick={() => {
                    setMode('signin');
                    setError(null);
                    setProviderHelpUrl(null);
                    setNotice(null);
                    clearAuthError();
                  }}
                  className={`py-2 text-xs font-semibold rounded-lg transition-all duration-150 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 motion-reduce:transition-none ${
                    mode === 'signin'
                      ? 'bg-white dark:bg-[#1E293B] text-slate-900 dark:text-white shadow-[0_1px_2px_rgba(15,23,42,0.07)]'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === 'register'}
                  onClick={() => {
                    setMode('register');
                    setError(null);
                    setProviderHelpUrl(null);
                    setNotice(null);
                    clearAuthError();
                  }}
                  className={`py-2 text-xs font-semibold rounded-lg transition-all duration-150 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 motion-reduce:transition-none ${
                    mode === 'register'
                      ? 'bg-white dark:bg-[#1E293B] text-slate-900 dark:text-white shadow-[0_1px_2px_rgba(15,23,42,0.07)]'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  Register
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === 'reset'}
                  onClick={() => {
                    setMode('reset');
                    setError(null);
                    setProviderHelpUrl(null);
                    setNotice(null);
                    clearAuthError();
                  }}
                  className={`py-2 text-xs font-semibold rounded-lg transition-all duration-150 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 motion-reduce:transition-none ${
                    mode === 'reset'
                      ? 'bg-white dark:bg-[#1E293B] text-slate-900 dark:text-white shadow-[0_1px_2px_rgba(15,23,42,0.07)]'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  Reset
                </button>
              </div>
            ) : (
              <div className="p-3.5 rounded-xl bg-blue-50/80 dark:bg-blue-600/10 border border-blue-200/80 dark:border-blue-500/20 text-xs text-slate-700 dark:text-slate-200 flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <Lock className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold text-slate-900 dark:text-white">
                      Administrator &amp; Mentor Portal Login
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5 leading-relaxed">
                      Restricted access. Sign in with your verified administrator credentials to enter the Mentor Command Console.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setMode('signin');
                    setError(null);
                    setProviderHelpUrl(null);
                    setNotice(null);
                    clearAuthError();
                    if (typeof window !== 'undefined') {
                      window.history.replaceState(null, '', window.location.pathname);
                    }
                  }}
                  className="text-[11px] font-medium text-blue-600 dark:text-blue-400 hover:underline shrink-0 whitespace-nowrap"
                >
                  Standard Login
                </button>
              </div>
            )}

            {modeHeading && (
              <div className="space-y-1">
                <h2 className="text-base font-semibold tracking-tight text-slate-900 dark:text-white">
                  {modeHeading.title}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  {modeHeading.subtitle}
                </p>
              </div>
            )}

            {error && (
              <div
                role="alert"
                className="p-3 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-xs text-red-700 dark:text-red-400 space-y-2 flex items-start gap-2.5"
              >
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <div className="space-y-1.5">
                  <p className="leading-relaxed">{error}</p>
                  {providerHelpUrl && (
                    <a
                      href={providerHelpUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 font-semibold underline text-red-800 dark:text-red-300"
                    >
                      Open Firebase Authentication Settings
                      <ArrowRight className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>
            )}
            {notice && (
              <div
                role="status"
                className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-xs text-emerald-700 dark:text-emerald-400 flex items-start gap-2.5"
              >
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{notice}</span>
              </div>
            )}

            <button
              type="button"
              disabled={busy}
              onClick={handleGoogleAuth}
              className="group w-full h-11 flex items-center justify-center gap-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-semibold shadow-[0_1px_2px_rgba(37,99,235,0.28)] active:scale-[0.99] transition-all duration-150 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-blue-600/30 motion-reduce:transition-none"
            >
              {busy ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    fill="currentColor"
                    d="M21.35 11.1h-9.17v2.73h6.51c-.33 3.81-3.5 5.44-6.5 5.44C8.36 19.27 5 16.25 5 12c0-4.1 3.2-7.27 7.2-7.27c3.09 0 4.9 1.97 4.9 1.97L19 4.72S16.56 2 12.1 2C6.42 2 2.03 6.8 2.03 12c0 5.05 4.13 10 10.22 10c5.35 0 9.25-3.67 9.25-9.09c0-1.15-.15-1.81-.15-1.81Z"
                  />
                </svg>
              )}
              <span>{mode === 'admin' ? 'Admin Sign In with Google' : 'Continue with Google'}</span>
            </button>

            <div className="relative flex items-center py-0.5">
              <div className="flex-grow border-t border-slate-200 dark:border-slate-800" />
              <span className="shrink-0 mx-3 text-[11px] font-medium text-slate-400 dark:text-slate-500">
                or with email
              </span>
              <div className="flex-grow border-t border-slate-200 dark:border-slate-800" />
            </div>

            {(mode === 'signin' || mode === 'admin') && (
              <form onSubmit={handleEmailSignIn} className="space-y-4">
                <div>
                  <label
                    htmlFor="auth-email"
                    className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
                  >
                    {mode === 'admin' ? 'Administrator Email' : 'Email Address'}
                  </label>
                  <input
                    id="auth-email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={mode === 'admin' ? 'keptonotieno@gmail.com' : 'student@domain.com'}
                    className={fieldClass}
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label
                      htmlFor="auth-password"
                      className="block text-xs font-medium text-slate-700 dark:text-slate-300"
                    >
                      Password
                    </label>
                    {mode === 'signin' && (
                      <button
                        type="button"
                        onClick={() => {
                          setMode('reset');
                          setError(null);
                          setProviderHelpUrl(null);
                          setNotice(null);
                          clearAuthError();
                        }}
                        className="text-[11px] font-medium text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      id="auth-password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      className={`${fieldClass} pr-10`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={busy}
                  className="group w-full h-11 flex items-center justify-center gap-2 px-4 rounded-xl border border-slate-900 dark:border-slate-700 bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 disabled:opacity-60 text-white text-sm font-semibold active:scale-[0.99] transition-all duration-150 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-slate-900/20 motion-reduce:transition-none"
                >
                  {busy ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Lock className="w-4 h-4" />
                  )}
                  <span>{mode === 'admin' ? 'Sign In to Admin Portal' : 'Sign In with Email'}</span>
                  {!busy && (
                    <ArrowRight className="w-3.5 h-3.5 opacity-70 transition-transform duration-150 group-hover:translate-x-0.5 motion-reduce:transition-none" />
                  )}
                </button>
              </form>
            )}

            {mode === 'register' && (
              <form onSubmit={handleEmailRegister} className="space-y-3.5">
                <div>
                  <label
                    htmlFor="reg-name"
                    className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
                  >
                    Full Name
                  </label>
                  <input
                    id="reg-name"
                    type="text"
                    autoComplete="name"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Enter your full name"
                    className={fieldClass}
                  />
                </div>
                <div>
                  <label
                    htmlFor="reg-email"
                    className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
                  >
                    Email Address
                  </label>
                  <input
                    id="reg-email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="student@domain.com"
                    className={fieldClass}
                  />
                </div>
                <div>
                  <label
                    htmlFor="reg-password"
                    className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
                  >
                    Password (min. 6 characters)
                  </label>
                  <div className="relative">
                    <input
                      id="reg-password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      required
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Create a password"
                      className={`${fieldClass} pr-10`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={busy}
                  className="group w-full h-11 flex items-center justify-center gap-2 px-4 rounded-xl border border-slate-900 dark:border-slate-700 bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 disabled:opacity-60 text-white text-sm font-semibold active:scale-[0.99] transition-all duration-150 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-slate-900/20 motion-reduce:transition-none"
                >
                  {busy ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <UserPlus className="w-4 h-4" />
                  )}
                  <span>Create Student Account</span>
                </button>
              </form>
            )}

            {mode === 'reset' && (
              <form onSubmit={handlePasswordReset} className="space-y-4">
                <div>
                  <label
                    htmlFor="reset-email"
                    className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
                  >
                    Registered Email Address
                  </label>
                  <input
                    id="reset-email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="student@domain.com"
                    className={fieldClass}
                  />
                </div>
                <button
                  type="submit"
                  disabled={busy}
                  className="group w-full h-11 flex items-center justify-center gap-2 px-4 rounded-xl border border-slate-900 dark:border-slate-700 bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 disabled:opacity-60 text-white text-sm font-semibold active:scale-[0.99] transition-all duration-150 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-slate-900/20 motion-reduce:transition-none"
                >
                  {busy ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <KeyRound className="w-4 h-4" />
                  )}
                  <span>Send Recovery Link</span>
                </button>
              </form>
            )}
          </div>
        </div>
      </main>

      {/* Quiet Institutional Footer */}
      <footer className="max-w-6xl w-full mx-auto pt-4 pb-1 border-t border-slate-200/80 dark:border-slate-800/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
        <div className="flex items-center gap-2.5">
          <BrandMark size="sm" />
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              Forex Mentorship
            </span>
            <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">·</span>
            <span>Performance &amp; Risk Management Workspace</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] text-slate-500 dark:text-slate-400">
          <span>Manual Execution Ledger</span>
          <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">·</span>
          <span>Non-custodial &amp; Broker-independent</span>
          <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">·</span>
          <span className="font-mono tabular-nums">© {new Date().getFullYear()} Forex Mentorship</span>
        </div>
      </footer>
    </div>
  );
};
