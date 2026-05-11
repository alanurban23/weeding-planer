import React, { useState, lazy, Suspense } from 'react';
import AppShell from '@/components/layout/AppShell';
import AIAssistantFAB from '@/components/layout/AIAssistantFAB';
import { Loader2 } from 'lucide-react';

// Lazy load views for better performance
const DashboardView = lazy(() => import('@/components/views/DashboardView'));
const TasksView = lazy(() => import('@/components/views/TasksView'));
const GuestsView = lazy(() => import('@/components/views/GuestsView'));
const BudgetView = lazy(() => import('@/components/views/BudgetView'));
const NotesView = lazy(() => import('@/components/views/NotesView'));
const StoryView = lazy(() => import('@/components/views/StoryView'));

// Loading fallback component
const ViewLoader: React.FC = () => (
  <div className="flex items-center justify-center h-64">
    <Loader2 className="w-8 h-8 text-gold-500 animate-spin" />
  </div>
);

const PremiumHome: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
  };

  const handleNavigate = (tab: string) => {
    setActiveTab(tab);
  };

  const renderView = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <Suspense fallback={<ViewLoader />}>
            <DashboardView onNavigate={handleNavigate} />
          </Suspense>
        );
      case 'tasks':
        return (
          <Suspense fallback={<ViewLoader />}>
            <TasksView />
          </Suspense>
        );
      case 'guests':
        return (
          <Suspense fallback={<ViewLoader />}>
            <GuestsView />
          </Suspense>
        );
      case 'budget':
        return (
          <Suspense fallback={<ViewLoader />}>
            <BudgetView />
          </Suspense>
        );
      case 'notes':
        return (
          <Suspense fallback={<ViewLoader />}>
            <NotesView />
          </Suspense>
        );
      case 'story':
        return (
          <Suspense fallback={<ViewLoader />}>
            <StoryView />
          </Suspense>
        );
      default:
        return (
          <Suspense fallback={<ViewLoader />}>
            <DashboardView onNavigate={handleNavigate} />
          </Suspense>
        );
    }
  };

  return (
    <>
      <AppShell
        activeTab={activeTab}
        onTabChange={handleTabChange}
        showHeader={true}
        headerTitle="Planer Weselny"
      >
        {renderView()}
      </AppShell>
      <AIAssistantFAB />
    </>
  );
};

export default PremiumHome;
