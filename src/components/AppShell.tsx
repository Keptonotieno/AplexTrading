import React, { useMemo, useState } from 'react';
import {
  Activity,
  Award,
  BarChart2,
  Bell,
  BookOpen,
  ChevronDown,
  ClipboardList,
  Crown,
  FileSpreadsheet,
  Home,
  Lock,
  LogOut,
  Menu,
  Moon,
  Search,
  Settings,
  Shield,
  ShieldAlert,
  Sun,
  Trophy,
  Users,
  Wrench,
  X,
} from 'lucide-react';
import {
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  signInWithPopup,
} from 'firebase/auth';
import { useMentorship } from '../context/MentorshipContext';
import { auth } from '../lib/firebase';
import { formatAccountTypeLabel, formatPlainCurrency } from '../lib/forexCalculations';

export type StudentTab =
  | 'dashboard'
  | 'journal'
  | 'analytics'
  | 'risk'
  | 'psychology'
  | 'analysis'
  | 'learning'
  | 'challenges'
  | 'community'
  | 'notifications'
  | 'reports'
  | 'settings';

export type AdminTab =
  | 'overview'
  | 'students'
  | 'reviews'
  | 'risk_psych'
  | 'challenges'
  | 'learning_cms'
  | 'reports'
  | 'announcements'
  | 'audit_settings';

interface AppShellProps {
  studentTab: StudentTab;
  setStudentTab: (tab: StudentTab) => void;
  adminTab: AdminTab;
  setAdminTab: (tab: AdminTab) => void;
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({
  studentTab,
  setStudentTab,
  adminTab,
  setAdminTab,
  children,
}) => {
  const {
    firebaseUser,
    userAccount,
    studentProfile,
    isVerifiedAdmin,
    workspaceMode,
    setWorkspaceMode,
    theme,
    toggleTheme,
    tradingAccounts,
    activeAccountId,
    setActiveAccountId,
    trades,
    learningMaterials,
    announcements,
    challengeCycles,
    myChallenges,
    unreadNotificationsCount,
    adminProfiles,
    logout,
  } = useMentorship();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [adminLoginOpen, setAdminLoginOpen] = useState(false);
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminModalMsg, setAdminModalMsg] = useState<string | null>(null);
  const [adminHelpUrl, setAdminHelpUrl] = useState<string | null>(null);
  const [verifyingAdmin, setVerifyingAdmin] = useState(false);

  const activeCycle = useMemo(
    () => challengeCycles.find((c) => c.status === 'active') || challengeCycles[0],
    [challengeCycles]
  );

  const cycleProgress = useMemo(() => {
    if (!activeCycle) return { day: 0, total: 30, percent: 0, title: 'Trading Challenge' };
    const start = new Date(activeCycle.startDate).getTime();
    const now = Date.now();
    const total = activeCycle.durationDays || 30;
    const elapsedDays = Math.max(1, Math.min(total, Math.floor((now - start) / 86400000) + 1));
    const percent = Math.round((elapsedDays / total) * 100);
    return { day: elapsedDays, total, percent, title: `${total}-Day Challenge` };
  }, [activeCycle]);

  const handleAdminClick = async () => {
    if (workspaceMode === 'admin') {
      setWorkspaceMode('student');
      return;
    }

    if (isVerifiedAdmin) {
      setVerifyingAdmin(true);
      try {
        const token = await auth.currentUser?.getIdToken();
        if (token) {
          const res = await fetch('/api/auth/verify-admin', {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            setWorkspaceMode('admin');
            setAdminTab('overview');
            setVerifyingAdmin(false);
            return;
          }
        }
      } catch {
        // Fall through to Admin login modal
      } finally {
        setVerifyingAdmin(false);
      }
    }

    setAdminModalMsg(null);
    setAdminEmail('');
    setAdminPassword('');
    setAdminLoginOpen(true);
  };

  const handleAdminCredentialSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminEmail.trim() || !adminPassword) {
      setAdminModalMsg('Enter both your administrator email address and password.');
      return;
    }
    setVerifyingAdmin(true);
    setAdminModalMsg(null);
    setAdminHelpUrl(null);
    try {
      if (typeof window !== 'undefined') sessionStorage.setItem('fm_requested_admin', '1');
      const cred = await signInWithEmailAndPassword(auth, adminEmail.trim(), adminPassword);
      if (!cred.user.emailVerified) {
        if (typeof window !== 'undefined') sessionStorage.removeItem('fm_requested_admin');
        setAdminModalMsg('Email verification required before accessing the Administrator Portal.');
        return;
      }
      const token = await cred.user.getIdToken(true);
      const res = await fetch('/api/auth/verify-admin', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        if (typeof window !== 'undefined') sessionStorage.removeItem('fm_requested_admin');
        setAdminModalMsg(
          'Access Denied: This account is not authorized as a Mentor / Administrator.'
        );
        return;
      }
      setAdminLoginOpen(false);
      setAdminPassword('');
      setWorkspaceMode('admin');
      setAdminTab('overview');
    } catch (err: unknown) {
      if (typeof window !== 'undefined') sessionStorage.removeItem('fm_requested_admin');
      const code = (err as { code?: string })?.code;
      if (code === 'auth/operation-not-allowed') {
        setAdminHelpUrl(
          'https://console.firebase.google.com/project/gen-lang-client-0535362261/authentication/providers'
        );
        setAdminModalMsg(
          'Email/Password sign-in is disabled in Firebase Console for project gen-lang-client-0535362261. Enable Email/Password in Firebase Authentication or sign in with Google below.'
        );
      } else if (code === 'auth/invalid-credential' || code === 'auth/user-not-found' || code === 'auth/wrong-password') {
        setAdminHelpUrl(
          'https://console.firebase.google.com/project/gen-lang-client-0535362261/authentication/users'
        );
        setAdminModalMsg(
          'No matching Firebase Auth user found or invalid password. Ensure the administrator account exists under Firebase Console → Authentication → Users.'
        );
      } else {
        setAdminModalMsg(err instanceof Error ? err.message : 'Unable to authenticate administrator.');
      }
    } finally {
      setVerifyingAdmin(false);
    }
  };

  const handleAdminGoogleSignIn = async () => {
    setVerifyingAdmin(true);
    setAdminModalMsg(null);
    try {
      if (typeof window !== 'undefined') sessionStorage.setItem('fm_requested_admin', '1');
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const cred = await signInWithPopup(auth, provider);
      const token = await cred.user.getIdToken(true);
      const res = await fetch('/api/auth/verify-admin', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        if (typeof window !== 'undefined') sessionStorage.removeItem('fm_requested_admin');
        setAdminModalMsg(
          'Access Denied: Signed-in Google account does not hold verified Administrator privileges.'
        );
        return;
      }
      setAdminLoginOpen(false);
      setWorkspaceMode('admin');
      setAdminTab('overview');
    } catch (err: unknown) {
      if (typeof window !== 'undefined') sessionStorage.removeItem('fm_requested_admin');
      setAdminModalMsg(err instanceof Error ? err.message : 'Google authentication failed.');
    } finally {
      setVerifyingAdmin(false);
    }
  };

  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    const results: Array<{ label: string; sub: string; action: () => void }> = [];

    trades
      .filter(
        (t) =>
          t.instrument.toLowerCase().includes(q) ||
          t.strategy.toLowerCase().includes(q) ||
          t.status.toLowerCase().includes(q)
      )
      .slice(0, 4)
      .forEach((t) => {
        results.push({
          label: `${t.instrument} ${t.direction}`,
          sub: `Journal · ${t.strategy} · ${t.status}`,
          action: () => {
            setWorkspaceMode('student');
            setStudentTab('journal');
            setSearchQuery('');
          },
        });
      });

    learningMaterials
      .filter((m) => m.title.toLowerCase().includes(q) || m.category.toLowerCase().includes(q))
      .slice(0, 3)
      .forEach((m) => {
        results.push({
          label: m.title,
          sub: `Learning · ${m.category}`,
          action: () => {
            setWorkspaceMode('student');
            setStudentTab('learning');
            setSearchQuery('');
          },
        });
      });

    announcements
      .filter((a) => a.title.toLowerCase().includes(q))
      .slice(0, 2)
      .forEach((a) => {
        results.push({
          label: a.title,
          sub: `Community · ${a.category}`,
          action: () => {
            setWorkspaceMode('student');
            setStudentTab('community');
            setSearchQuery('');
          },
        });
      });

    if (workspaceMode === 'admin' && isVerifiedAdmin) {
      adminProfiles
        .filter((p) => p.fullName.toLowerCase().includes(q))
        .slice(0, 3)
        .forEach((p) => {
          results.push({
            label: p.fullName,
            sub: `Student · ${p.experienceLevel}`,
            action: () => {
              setAdminTab('students');
              setSearchQuery('');
            },
          });
        });
    }

    return results;
  }, [
    searchQuery,
    trades,
    learningMaterials,
    announcements,
    workspaceMode,
    isVerifiedAdmin,
    adminProfiles,
  ]);

  const studentNav: Array<{
    id: StudentTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number;
  }> = [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'journal', label: 'Trading Journal', icon: ClipboardList },
    { id: 'analytics', label: 'Analytics', icon: BarChart2 },
    { id: 'risk', label: 'Risk Management', icon: Shield },
    { id: 'analysis', label: 'Trade Analysis', icon: Wrench },
    { id: 'learning', label: 'Learning Centre', icon: BookOpen },
    { id: 'challenges', label: 'Challenges', icon: Trophy },
    { id: 'community', label: 'Community', icon: Users },
    {
      id: 'notifications',
      label: 'Notifications',
      icon: Bell,
      badge: unreadNotificationsCount,
    },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const adminNav: Array<{
    id: AdminTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }> = [
    { id: 'overview', label: 'Mentor Overview', icon: Home },
    { id: 'students', label: 'Students & Profiles', icon: Users },
    { id: 'reviews', label: 'Journal & Chart Reviews', icon: Wrench },
    { id: 'risk_psych', label: 'Risk & Psychology', icon: ShieldAlert },
    { id: 'challenges', label: 'Challenge Manager', icon: Trophy },
    { id: 'learning_cms', label: 'Learning Centre CMS', icon: BookOpen },
    { id: 'reports', label: 'Weekly & Monthly Reports', icon: FileSpreadsheet },
    { id: 'announcements', label: 'Announcements', icon: Bell },
    { id: 'audit_settings', label: 'Audit Logs & Settings', icon: Activity },
  ];

  const displayName = studentProfile?.fullName || userAccount?.displayName || firebaseUser?.displayName || 'Trader';
  const initials = displayName
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const enrolledInActive = activeCycle
    ? myChallenges.some((c) => c.cycleId === activeCycle.id)
    : false;

  const sidebarContent = (
    <div className="h-full flex flex-col justify-between bg-white dark:bg-[#0B111E] border-r border-slate-200 dark:border-slate-800/80 select-none">
      <div className="p-4 space-y-5 overflow-y-auto">
        {/* Brand Header */}
        <div className="flex items-center justify-between px-2 pt-1">
          <button
            type="button"
            onClick={() => {
              if (workspaceMode === 'admin') setAdminTab('overview');
              else setStudentTab('dashboard');
              setMobileOpen(false);
            }}
            className="flex items-center gap-2.5 text-left"
          >
            <div className="w-9 h-9 rounded-lg bg-blue-600/15 text-blue-500 flex items-center justify-center shrink-0">
              <BarChart2 className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-bold tracking-tight text-slate-900 dark:text-white leading-tight whitespace-nowrap">
                Forex Mentorship
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                {workspaceMode === 'admin' ? 'Mentor Console' : 'Learn · Trade · Grow'}
              </div>
            </div>
          </button>
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white"
            aria-label="Close navigation"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="space-y-1">
          {workspaceMode === 'student'
            ? studentNav.map((item) => {
                const Icon = item.icon;
                const active = studentTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setStudentTab(item.id);
                      setMobileOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                      active
                        ? 'bg-blue-600/15 text-blue-600 dark:text-white dark:bg-gradient-to-r dark:from-blue-600/30 dark:to-blue-600/10 border border-blue-500/20'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-200 border border-transparent'
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-blue-500' : ''}`} />
                      <span>{item.label}</span>
                    </span>
                    {item.badge !== undefined && item.badge > 0 && (
                      <span className="px-1.5 py-0.5 text-[11px] font-mono font-semibold rounded bg-red-500 text-white leading-none">
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })
            : adminNav.map((item) => {
                const Icon = item.icon;
                const active = adminTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setAdminTab(item.id);
                      setMobileOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                      active
                        ? 'bg-blue-600/15 text-blue-600 dark:text-white dark:bg-gradient-to-r dark:from-blue-600/30 dark:to-blue-600/10 border border-blue-500/20'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-200 border border-transparent'
                    }`}
                  >
                    <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-blue-500' : ''}`} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
        </nav>
      </div>

      {/* Bottom Pinned Challenge Card (Student) or Return to Student View (Admin) */}
      <div className="p-4">
        {workspaceMode === 'student' ? (
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800/90 space-y-2.5">
            <div className="flex items-center gap-2">
              <Crown className="w-4 h-4 text-amber-500 shrink-0" />
              <span className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                {activeCycle ? activeCycle.title : cycleProgress.title}
              </span>
            </div>
            {activeCycle ? (
              <>
                <div className="text-xs text-slate-600 dark:text-slate-300 tabular-nums">
                  <span className="text-blue-500 font-semibold">Day {cycleProgress.day}</span> of{' '}
                  {cycleProgress.total}
                  {!enrolledInActive && (
                    <span className="text-slate-400"> · Not enrolled</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full transition-all"
                      style={{ width: `${cycleProgress.percent}%` }}
                    />
                  </div>
                  <span className="text-[11px] font-mono tabular-nums text-slate-500 dark:text-slate-400">
                    {cycleProgress.percent}%
                  </span>
                </div>
              </>
            ) : (
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                No active challenge cycle scheduled yet.
              </p>
            )}
            <button
              type="button"
              onClick={() => {
                setStudentTab('challenges');
                setMobileOpen(false);
              }}
              className="w-full py-1.5 px-3 rounded-lg bg-white dark:bg-[#162033] border border-slate-200 dark:border-slate-700/70 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              View Details →
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setWorkspaceMode('student')}
            className="w-full py-2 px-3 rounded-lg bg-slate-100 dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
          >
            ← Return to Student View
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#080D17] text-slate-900 dark:text-slate-100 flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-64 shrink-0 sticky top-0 h-screen">
        {sidebarContent}
      </aside>

      {/* Mobile Sidebar Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="relative w-64 max-w-[80vw] h-full z-10">{sidebarContent}</aside>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top Bar */}
        <header className="sticky top-0 z-30 h-16 bg-white/90 dark:bg-[#080D17]/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800/80 px-5 md:px-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1 max-w-md relative">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="lg:hidden p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search anything..."
                className="w-full pl-9 pr-3 py-1.5 text-sm rounded-lg bg-slate-100 dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              />
              {searchResults.length > 0 && (
                <div className="absolute left-0 right-0 mt-1.5 bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl py-1.5 z-50">
                  {searchResults.map((res, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={res.action}
                      className="w-full px-3.5 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-800/60 flex items-center justify-between gap-2"
                    >
                      <span className="text-xs font-medium text-slate-900 dark:text-white truncate">
                        {res.label}
                      </span>
                      <span className="text-[11px] text-slate-500 shrink-0">{res.sub}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {/* Active Account Selector (Student mode) */}
            {workspaceMode === 'student' && tradingAccounts.length > 0 && (
              <div className="hidden md:flex items-center">
                <select
                  aria-label="Active trading account"
                  value={activeAccountId}
                  onChange={(e) => setActiveAccountId(e.target.value)}
                  className="px-2.5 py-1.5 text-xs font-medium rounded-lg bg-slate-100 dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none"
                >
                  <option value="all">All Accounts ({tradingAccounts.length})</option>
                  {tradingAccounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} · {formatAccountTypeLabel(acc.accountType)} ({formatPlainCurrency(acc.currentBalance, acc.currency)})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Theme Switch */}
            <button
              type="button"
              onClick={toggleTheme}
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Discreet Private Administrator Access Point (Top-Right) */}
            <button
              type="button"
              disabled={verifyingAdmin}
              onClick={handleAdminClick}
              title={
                workspaceMode === 'admin'
                  ? 'Exit Mentor Admin Console'
                  : 'Private Administrator Access'
              }
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                workspaceMode === 'admin'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
              }`}
            >
              <span>{workspaceMode === 'admin' ? 'Mentor Mode' : 'Admin'}</span>
              <Lock className="w-3.5 h-3.5 opacity-75" />
            </button>

            <div className="h-5 w-px bg-slate-200 dark:bg-slate-800" />

            {/* Profile Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setProfileMenuOpen((v) => !v)}
                className="flex items-center gap-2.5 py-1 px-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors"
              >
                {firebaseUser?.photoURL ? (
                  <img
                    src={firebaseUser.photoURL}
                    alt={displayName}
                    referrerPolicy="no-referrer"
                    className="w-8 h-8 rounded-full object-cover border border-slate-200 dark:border-slate-700"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-blue-600/20 text-blue-500 flex items-center justify-center text-xs font-bold">
                    {initials}
                  </div>
                )}
                <div className="hidden sm:block text-left">
                  <div className="text-xs font-semibold text-slate-900 dark:text-white leading-tight max-w-[130px] truncate">
                    {displayName}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                    {isVerifiedAdmin ? 'Mentor / Admin' : 'Student'}
                  </div>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {profileMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setProfileMenuOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 w-52 bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl py-1.5 z-50">
                    <div className="px-3.5 py-2 border-b border-slate-200 dark:border-slate-800">
                      <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                        {displayName}
                      </p>
                      <p className="text-[11px] text-slate-500 truncate">{firebaseUser?.email}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setWorkspaceMode('student');
                        setStudentTab('reports');
                        setProfileMenuOpen(false);
                      }}
                      className="w-full px-3.5 py-2 text-left text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/60 flex items-center gap-2"
                    >
                      <Award className="w-3.5 h-3.5" />
                      Performance Reports
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setWorkspaceMode('student');
                        setStudentTab('psychology');
                        setProfileMenuOpen(false);
                      }}
                      className="w-full px-3.5 py-2 text-left text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/60 flex items-center gap-2"
                    >
                      <Activity className="w-3.5 h-3.5" />
                      Psychology Assessments
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setWorkspaceMode('student');
                        setStudentTab('settings');
                        setProfileMenuOpen(false);
                      }}
                      className="w-full px-3.5 py-2 text-left text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/60 flex items-center gap-2"
                    >
                      <Settings className="w-3.5 h-3.5" />
                      Profile & Accounts
                    </button>
                    <div className="my-1 border-t border-slate-200 dark:border-slate-800" />
                    <button
                      type="button"
                      onClick={() => {
                        setProfileMenuOpen(false);
                        logout();
                      }}
                      className="w-full px-3.5 py-2 text-left text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 flex items-center gap-2"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      Sign Out
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Main Viewport */}
        <main className="flex-1 px-5 py-6 md:px-8 md:py-8 max-w-[1440px] w-full mx-auto">
          {children}
        </main>
      </div>

      {/* Admin Portal Login Modal */}
      {adminLoginOpen && (
        <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-blue-600/15 text-blue-500 flex items-center justify-center shrink-0">
                  <Lock className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                    Admin Portal Sign In
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Authorized Mentor & Administrator credentials required
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setAdminLoginOpen(false);
                  setAdminModalMsg(null);
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white"
                aria-label="Close admin login"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {adminModalMsg && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-600 dark:text-red-400 flex items-start gap-2">
                <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                <div className="space-y-1.5">
                  <p>{adminModalMsg}</p>
                  {adminHelpUrl && (
                    <a
                      href={adminHelpUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block font-semibold underline text-red-700 dark:text-red-300"
                    >
                      Open Firebase Authentication Settings →
                    </a>
                  )}
                </div>
              </div>
            )}

            <form onSubmit={handleAdminCredentialSignIn} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Administrator Email
                </label>
                <input
                  type="email"
                  required
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  placeholder="keptonotieno@gmail.com"
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
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2 text-sm rounded-lg bg-slate-50 dark:bg-[#0B111E] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <button
                type="submit"
                disabled={verifyingAdmin}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-xs font-medium transition-colors"
              >
                <Lock className="w-3.5 h-3.5" />
                {verifyingAdmin ? 'Verifying Credentials...' : 'Login to Admin Dashboard'}
              </button>
            </form>

            <div className="relative flex items-center">
              <div className="flex-grow border-t border-slate-200 dark:border-slate-800" />
              <span className="shrink-0 mx-3 text-[11px] text-slate-400">or</span>
              <div className="flex-grow border-t border-slate-200 dark:border-slate-800" />
            </div>

            <button
              type="button"
              disabled={verifyingAdmin}
              onClick={handleAdminGoogleSignIn}
              className="w-full py-2 px-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B111E] hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-200 transition-colors"
            >
              Sign In with Authorized Google Account
            </button>

            <div className="p-3 rounded-lg bg-slate-50 dark:bg-[#0B111E] border border-slate-200 dark:border-slate-800 space-y-1 text-[11px] text-slate-500">
              <div className="flex justify-between gap-2">
                <span>Current Session</span>
                <span className="font-mono text-slate-700 dark:text-slate-300 truncate">
                  {firebaseUser?.email || 'Not signed in'}
                </span>
              </div>
              <p className="leading-relaxed">
                Admin access is validated against Firebase Authentication and server-side security rules.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
