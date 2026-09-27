import { BatchWorkspace } from './views/BatchWorkspace.js';
import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.js';
import { Sidebar, type NavView } from './components/layout/Sidebar.js';
import { Topbar } from './components/layout/Topbar.js';
import { LoginView } from './views/LoginView.js';
import { DashboardOverview } from './views/DashboardOverview.js';
import { DirectoryView } from './views/DirectoryView.js';
import { BatchesView } from './views/BatchesView.js';
import { DepartmentsView } from './views/DepartmentsView.js';
import { TimetableTemplatesView } from './views/TimetableTemplatesView.js';
import { LiveMonitorView } from './views/LiveMonitorView.js';
import { ShieldCheck } from 'lucide-react';

const DashboardContent: React.FC = () => {
  const { user, token, loading } = useAuth();
  const [currentView, setCurrentView] = useState<NavView>('dashboard');
  const [navigationOpen, setNavigationOpen] = useState(false);
  const navigate = (view: NavView) => { setCurrentView(view); setNavigationOpen(false); };
  useEffect(() => {
    const closeNavigation = (event: KeyboardEvent) => { if (event.key === 'Escape') setNavigationOpen(false); };
    window.addEventListener('keydown', closeNavigation);
    return () => window.removeEventListener('keydown', closeNavigation);
  }, []);

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          width: '100vw',
          backgroundColor: 'var(--bg-app)',
          gap: '16px'
        }}
      >
        <div style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: 'var(--kahe-green-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--kahe-green-light)' }}>
          <ShieldCheck size={32} />
        </div>
        <div style={{ color: 'var(--text-muted)', fontSize: '13px', fontWeight: 600 }}>
          Initializing Karpagam University Executive Environment…
        </div>
      </div>
    );
  }

  if (!user || !token) {
    return <LoginView />;
  }

  const batchWindowId = new URLSearchParams(window.location.search).get('batch');
  if (batchWindowId) return <BatchWorkspace batchId={batchWindowId} />;

  const titles: Record<NavView, string> = {
    dashboard: 'Campus overview',
    directory: 'Students & faculty',
    batches: 'Batches',
    departments: 'Departments',
    templates: 'Timetable',
    monitor: 'Live attendance'
  };

  return (
    <div className="app-container">
      {navigationOpen && <button className="nav-backdrop" aria-label="Close navigation" onClick={() => setNavigationOpen(false)} />}
      <Sidebar currentView={currentView} onNavigate={navigate} open={navigationOpen} />
      <div className="main-wrapper">
        <Topbar title={titles[currentView]} navigationOpen={navigationOpen} onToggleNavigation={() => setNavigationOpen(!navigationOpen)} />
        <main className="content-viewport">
          {currentView === 'dashboard' && <DashboardOverview onNavigate={navigate} />}
          {currentView === 'directory' && <DirectoryView />}
          {currentView === 'batches' && <BatchesView />}
          {currentView === 'departments' && <DepartmentsView />}
          {currentView === 'templates' && <TimetableTemplatesView />}
          {currentView === 'monitor' && <LiveMonitorView />}
        </main>
      </div>
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <DashboardContent />
    </AuthProvider>
  );
}
