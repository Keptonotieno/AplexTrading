import React, { useState } from 'react';
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
} from 'firebase/auth';
import {
  AlertCircle,
  BarChart2,
  CheckCircle2,
  KeyRound,
  Lock,
  Mail,
  RefreshCw,
  ShieldCheck,
  UserPlus,
} from 'lucide-react';
import { auth, BOOTSTRAPPED_ADMIN_EMAIL } from '../lib/firebase';
import { INSTRUMENT_SPECS } from '../lib/forexCalculations';
import { completeStudentOnboarding } from '../services/mentorshipService';
import type { StudentProfile, TradingAccount } from '../types/domain';
import { useMentorship } from '../context/MentorshipContext';

type AuthMode = 'signin' | 'register' | 'reset';

const POPULAR_INSTRUMENTS = Object.keys(INSTRUMENT_SPECS);

export const AuthPortal: React.FC = () => {
  const { firebaseUser, needsOnboarding, theme, toggleTheme } = useMentorship();
  const [mode, setMode] = useState<AuthMode>('signin');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Sign In / Register credentials
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Onboarding & Registration Profile fields
  const [fullName, setFullName] = useState(firebaseUser?.displayName || '');
  const [phone, setPhone] = useState('');
  const [country, setCountry] = useState('');
  const [experienceLevel, setExperienceLevel] = useState<StudentProfile['experienceLevel']>('intermediate');
  const [preferredInstruments, setPreferredInstruments] = useState<string[]>([]);
  const [brokerName, setBrokerName] = useState('');
  const [initialAccountName, setInitialAccountName] = useState('');
  const [initialAccountType, setInitialAccountType] = useState<TradingAccount['accountType']>('demo');
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
    setNotice(null);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      await signInWithPopup(auth, provider);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Google sign-in failed.';
      setError(msg);
    } finally {
      setBusy(false);
    }
  };

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      if (code === 'auth/operation-not-allowed') {
        setError(
          'Email/Password sign-in is not yet enabled in the Firebase Console (Authentication → Sign-in method → Email/Password). Use Google Sign-In below or enable Email/Password in Firebase Console.'
        );
      } else {
        setError(err instanceof Error ? err.message : 'Sign-in failed.');
      }
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
    setNotice(null);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
      await updateProfile(cred.user, { displayName: fullName.trim() });
      await sendEmailVerification(cred.user);
      setNotice('Verification link sent to your email address. Please verify your email and click Refresh Status.');
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      if (code === 'auth/operation-not-allowed') {
        setError(
          'Email/Password registration is not enabled in the Firebase Console (Authentication → Sign-in method → Email/Password). Please sign in using Google Sign-In or enable Email/Password in Firebase Console.'
        );
      } else {
        setError(err instanceof Error ? err.message : 'Registration failed.');
      }
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
    setNotice(null);
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setNotice('Password recovery email sent. Check your inbox and spam folder.');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to send password reset email.');
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
    setBusy(true);
    setError(null);
    try {
      const isMentor =
        firebaseUser.emailVerified &&
        firebaseUser.email?.toLowerCase() === BOOTSTRAPPED_ADMIN_EMAIL.toLowerCase();

      await completeStudentOnboarding({
        uid: firebaseUser.uid,
        email: firebaseUser.email || email,
        fullName: fullName.trim(),
        phone: phone.trim() || undefined,
        country: country.trim() || 'Global',
        experienceLevel,
        preferredInstruments,
        brokerName: brokerName.trim() || undefined,
        isMentorBootstrap: isMentor,
        initialAccountName: initialAccountName.trim() || 'Primary Trading Account',
        initialAccountType,
        initialCurrency,
        initialBalance: Math.max(0, Number(initialBalance) || 0),
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
      <div className="min-h-screen bg-slate-50 dark:bg-[#080D17] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500/15 text-amber-500 flex items-center justify-center">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-slate-900 dark:text-white">Verify Your Email</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">{firebaseUser.email}</p>
            </div>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            To protect student trading journals and comply with security verification rules, please click the verification link sent to your inbox before accessing the platform.
          </p>
          {notice && (
            <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-600 dark:text-emerald-400">
              {notice}
            </div>
          )}
          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-600 dark:text-red-400">
              {error}
            </div>
          )}
          <div className="flex flex-col gap-2.5">
            <button
              type="button"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                await firebaseUser.reload();
                if (auth.currentUser?.emailVerified) {
                  window.location.reload();
                } else {
                  setError('Email is not verified yet. Please check your inbox.');
                }
                setBusy(false);
              }}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              I Verified My Email — Continue
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await sendEmailVerification(firebaseUser);
                  setNotice('Verification email resent.');
                } catch (e: unknown) {
                  setError(e instanceof Error ? e.message : 'Unable to resend email.');
                }
                setBusy(false);
              }}
              className="w-full py-2 px-4 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-sm hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Resend Verification Email
            </button>
            <button
              type="button"
              onClick={() => signOut(auth)}
              className="w-full py-2 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
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
      <div className="min-h-screen bg-slate-50 dark:bg-[#080D17] flex items-center justify-center p-4 md:p-8">
        <div className="max-w-2xl w-full bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 rounded-xl p-6 md:p-8 space-y-6">
          <div className="flex items-start justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-600/15 text-blue-500 flex items-center justify-center">
                <BarChart2 className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-slate-900 dark:text-white">
                  Complete Your Mentorship Profile
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Signed in as {firebaseUser.email} · Broker-independent performance setup
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => signOut(auth)}
              className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 whitespace-nowrap"
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
                  <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1.5">Account Type</label>
                  <select
                    value={initialAccountType}
                    onChange={(e) => setInitialAccountType(e.target.value as TradingAccount['accountType'])}
                    className="w-full px-3.5 py-2 text-sm rounded-lg bg-slate-50 dark:bg-[#0B111E] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
                  >
                    <option value="demo">Demo</option>
                    <option value="live">Live Personal</option>
                    <option value="prop_challenge">Prop Challenge</option>
                    <option value="funded">Funded</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1.5">Currency</label>
                  <select
                    value={initialCurrency}
                    onChange={(e) => setInitialCurrency(e.target.value as TradingAccount['currency'])}
                    className="w-full px-3.5 py-2 text-sm rounded-lg bg-slate-50 dark:bg-[#0B111E] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
                  >
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1.5">
                    Initial Balance *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={initialBalance}
                    onChange={(e) => setInitialBalance(e.target.value)}
                    placeholder="Enter starting balance"
                    className="w-full px-3.5 py-2 text-sm font-mono tabular-nums rounded-lg bg-slate-50 dark:bg-[#0B111E] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
                  />
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
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#080D17] flex flex-col justify-between p-4 md:p-8">
      <header className="max-w-6xl w-full mx-auto flex items-center justify-between py-2">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-blue-600/15 text-blue-500 flex items-center justify-center">
            <BarChart2 className="w-5 h-5" />
          </div>
          <span className="text-base font-bold tracking-tight text-slate-900 dark:text-white whitespace-nowrap">
            Forex Mentorship
          </span>
        </div>
        <button
          type="button"
          onClick={toggleTheme}
          className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60"
        >
          {theme === 'dark' ? 'Light Theme' : 'Dark Theme'}
        </button>
      </header>

      <main className="max-w-5xl w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-center my-8">
        <div className="lg:col-span-6 space-y-5">
          <p className="text-xs font-medium text-blue-500 tracking-wide">
            INDEPENDENT TRADING PERFORMANCE SYSTEM
          </p>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-900 dark:text-white leading-tight [text-wrap:balance]">
            Discipline, risk clarity, and structured mentorship in one place.
          </h1>
          <p className="text-sm md:text-base text-slate-600 dark:text-slate-400 leading-relaxed max-w-xl">
            Journal every trade manually, calculate exact instrument-specific position sizing, upload multi-stage chart analysis, and receive structured weekly evaluations from your mentor.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div className="p-3.5 rounded-lg bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                Broker Independent
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Zero broker passwords or API keys required. Your capital and data remain strictly private.
              </p>
            </div>
            <div className="p-3.5 rounded-lg bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                <CheckCircle2 className="w-4 h-4 text-blue-500" />
                30-Day Challenge Cycles
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Track consistency, risk compliance, psychology, and R-multiples across recurring cycles.
              </p>
            </div>
          </div>
        </div>

        <div className="lg:col-span-6">
          <div className="bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 rounded-xl p-6 md:p-7 space-y-5">
            <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-[#0B111E] rounded-lg">
              <button
                type="button"
                onClick={() => {
                  setMode('signin');
                  setError(null);
                  setNotice(null);
                }}
                className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  mode === 'signin'
                    ? 'bg-white dark:bg-[#1E293B] text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('register');
                  setError(null);
                  setNotice(null);
                }}
                className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  mode === 'register'
                    ? 'bg-white dark:bg-[#1E293B] text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Register Student
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('reset');
                  setError(null);
                  setNotice(null);
                }}
                className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  mode === 'reset'
                    ? 'bg-white dark:bg-[#1E293B] text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Reset Password
              </button>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-600 dark:text-red-400">
                {error}
              </div>
            )}
            {notice && (
              <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-600 dark:text-emerald-400">
                {notice}
              </div>
            )}

            <button
              type="button"
              disabled={busy}
              onClick={handleGoogleAuth}
              className="w-full flex items-center justify-center gap-2.5 py-2.5 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-medium transition-colors"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fill="currentColor"
                  d="M21.35 11.1h-9.17v2.73h6.51c-.33 3.81-3.5 5.44-6.5 5.44C8.36 19.27 5 16.25 5 12c0-4.1 3.2-7.27 7.2-7.27c3.09 0 4.9 1.97 4.9 1.97L19 4.72S16.56 2 12.1 2C6.42 2 2.03 6.8 2.03 12c0 5.05 4.13 10 10.22 10c5.35 0 9.25-3.67 9.25-9.09c0-1.15-.15-1.81-.15-1.81Z"
                />
              </svg>
              Continue with Google
            </button>

            <div className="relative flex items-center py-1">
              <div className="flex-grow border-t border-slate-200 dark:border-slate-800" />
              <span className="shrink-0 mx-3 text-xs text-slate-400">or with email</span>
              <div className="flex-grow border-t border-slate-200 dark:border-slate-800" />
            </div>

            {mode === 'signin' && (
              <form onSubmit={handleEmailSignIn} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="student@domain.com"
                    className="w-full px-3.5 py-2 text-sm rounded-lg bg-slate-50 dark:bg-[#0B111E] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    Password
                  </label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3.5 py-2 text-sm rounded-lg bg-slate-50 dark:bg-[#0B111E] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <button
                  type="submit"
                  disabled={busy}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white text-sm font-medium transition-colors"
                >
                  <Lock className="w-4 h-4" />
                  Sign In with Email
                </button>
              </form>
            )}

            {mode === 'register' && (
              <form onSubmit={handleEmailRegister} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Enter your full name"
                    className="w-full px-3.5 py-2 text-sm rounded-lg bg-slate-50 dark:bg-[#0B111E] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="student@domain.com"
                    className="w-full px-3.5 py-2 text-sm rounded-lg bg-slate-50 dark:bg-[#0B111E] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    Password (min. 6 characters)
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3.5 py-2 text-sm rounded-lg bg-slate-50 dark:bg-[#0B111E] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
                <button
                  type="submit"
                  disabled={busy}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white text-sm font-medium transition-colors"
                >
                  <UserPlus className="w-4 h-4" />
                  Create Student Account
                </button>
              </form>
            )}

            {mode === 'reset' && (
              <form onSubmit={handlePasswordReset} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    Registered Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="student@domain.com"
                    className="w-full px-3.5 py-2 text-sm rounded-lg bg-slate-50 dark:bg-[#0B111E] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
                <button
                  type="submit"
                  disabled={busy}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white text-sm font-medium transition-colors"
                >
                  <KeyRound className="w-4 h-4" />
                  Send Recovery Link
                </button>
              </form>
            )}
          </div>
        </div>
      </main>

      <footer className="max-w-6xl w-full mx-auto text-xs text-slate-500 flex flex-wrap items-center justify-between gap-2 py-2 border-t border-slate-200 dark:border-slate-800/70">
        <span>Forex Mentorship · Independent Performance & Journaling System</span>
        <span>All trading records are entered manually · Non-custodial & Broker-independent</span>
      </footer>
    </div>
  );
};
