import React, { useState } from 'react';
import { AppShell, type AdminTab, type StudentTab } from './components/AppShell';
import { AuthPortal } from './components/AuthPortal';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AdminWorkspace } from './components/admin/AdminWorkspace';
import { AnalyticsView } from './components/student/AnalyticsView';
import { ChallengesView } from './components/student/ChallengesView';
import { CommunityView } from './components/student/CommunityView';
import { LearningCentreView } from './components/student/LearningCentreView';
import { NotificationsView } from './components/student/NotificationsView';
import { PsychologyView } from './components/student/PsychologyView';
import { ReportsAndSettingsView } from './components/student/ReportsAndSettingsView';
import { RiskManagementView } from './components/student/RiskManagementView';
import { StudentOverview } from './components/student/StudentOverview';
import { TradeAnalysisView } from './components/student/TradeAnalysisView';
import { TradeModal } from './components/student/TradeModal';
import { TradingJournal } from './components/student/TradingJournal';
import { MentorshipProvider, useMentorship } from './context/MentorshipContext';

function MentorshipAppContent() {
  const { authReady, loadingData, firebaseUser, needsOnboarding, workspaceMode } = useMentorship();
  const [studentTab, setStudentTab] = useState<StudentTab>('dashboard');
  const [adminTab, setAdminTab] = useState<AdminTab>('overview');
  const [quickTradeOpen, setQuickTradeOpen] = useState(false);

  if (!authReady || (firebaseUser && firebaseUser.emailVerified && loadingData)) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#080D17] flex items-center justify-center p-6">
        <div className="text-center space-y-3">
          <div className="w-9 h-9 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Initializing Forex Mentorship workspace...
          </p>
        </div>
      </div>
    );
  }

  if (!firebaseUser || !firebaseUser.emailVerified || (needsOnboarding && workspaceMode !== 'admin')) {
    return <AuthPortal />;
  }

  const renderStudentView = () => {
    switch (studentTab) {
      case 'dashboard':
        return (
          <StudentOverview
            onNavigate={setStudentTab}
            onOpenNewTrade={() => setQuickTradeOpen(true)}
          />
        );
      case 'journal':
        return <TradingJournal />;
      case 'analytics':
        return <AnalyticsView />;
      case 'risk':
        return <RiskManagementView />;
      case 'psychology':
        return <PsychologyView />;
      case 'analysis':
        return <TradeAnalysisView onNavigate={setStudentTab} />;
      case 'learning':
        return <LearningCentreView />;
      case 'challenges':
        return <ChallengesView />;
      case 'community':
        return <CommunityView />;
      case 'notifications':
        return <NotificationsView onNavigate={setStudentTab} />;
      case 'reports':
        return <ReportsAndSettingsView key="reports" initialTab="reports" />;
      case 'settings':
        return <ReportsAndSettingsView key="settings" initialTab="settings" />;
      default:
        return (
          <StudentOverview
            onNavigate={setStudentTab}
            onOpenNewTrade={() => setQuickTradeOpen(true)}
          />
        );
    }
  };

  return (
    <AppShell
      studentTab={studentTab}
      setStudentTab={setStudentTab}
      adminTab={adminTab}
      setAdminTab={setAdminTab}
    >
      {workspaceMode === 'admin' ? (
        <AdminWorkspace tab={adminTab} onNavigate={setAdminTab} />
      ) : (
        renderStudentView()
      )}

      <TradeModal open={quickTradeOpen} onClose={() => setQuickTradeOpen(false)} />
    </AppShell>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <MentorshipProvider>
        <MentorshipAppContent />
      </MentorshipProvider>
    </ErrorBoundary>
  );
}
