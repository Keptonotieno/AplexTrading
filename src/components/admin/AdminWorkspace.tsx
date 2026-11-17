import React from 'react';
import { ShieldAlert } from 'lucide-react';
import { useMentorship } from '../../context/MentorshipContext';
import type { AdminTab } from '../AppShell';
import { AdminActivityView } from './AdminActivityView';
import {
  AdminOverview,
  AdminReviewsView,
  AdminRiskAndPsychView,
  AdminStudentsView,
} from './AdminOperations';
import {
  AdminAnnouncementsView,
  AdminAuditAndSettingsView,
  AdminChallengesView,
  AdminLearningCmsView,
  AdminReportsView,
} from './AdminProgramme';

export const AdminWorkspace: React.FC<{
  tab: AdminTab;
  onNavigate: (tab: AdminTab) => void;
}> = ({ tab, onNavigate }) => {
  const { isVerifiedAdmin, setWorkspaceMode } = useMentorship();

  if (!isVerifiedAdmin) {
    return (
      <div className="max-w-lg mx-auto my-12 bg-white dark:bg-[#0F172A] border border-red-500/30 rounded-xl p-6 space-y-3 text-center">
        <ShieldAlert className="w-8 h-8 text-red-500 mx-auto" />
        <h2 className="text-base font-bold text-slate-900 dark:text-white">
          Unauthorized Administrator Access Denied
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Only verified mentor accounts authorized in Firestore and Firebase Authentication may view administrative views.
        </p>
        <button
          type="button"
          onClick={() => setWorkspaceMode('student')}
          className="px-4 py-2 text-xs font-medium rounded-lg bg-blue-600 text-white"
        >
          Return to Student Dashboard
        </button>
      </div>
    );
  }

  switch (tab) {
    case 'overview':
      return <AdminOverview onNavigate={onNavigate} />;
    case 'activity':
      return <AdminActivityView />;
    case 'students':
      return <AdminStudentsView />;
    case 'reviews':
      return <AdminReviewsView />;
    case 'risk_psych':
      return <AdminRiskAndPsychView />;
    case 'challenges':
      return <AdminChallengesView />;
    case 'learning_cms':
      return <AdminLearningCmsView />;
    case 'reports':
      return <AdminReportsView />;
    case 'announcements':
      return <AdminAnnouncementsView />;
    case 'audit_settings':
      return <AdminAuditAndSettingsView />;
    default:
      return <AdminOverview onNavigate={onNavigate} />;
  }
};
