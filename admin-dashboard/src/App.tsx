import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.js';
import { Sidebar, type NavView } from './components/layout/Sidebar.js';
import { Topbar } from './components/layout/Topbar.js';
import { LoginView } from './views/LoginView.js';
import { DashboardOverview } from './views/DashboardOverview.js';
import { DirectoryView } from './views/DirectoryView.js';
import { ClassesView } from './views/ClassesView.js';
import { BatchesView } from './views/BatchesView.js';
import { DepartmentsView } from './views/DepartmentsView.js';
import { TimetableTemplatesView } from './views/TimetableTemplatesView.js';
import { LiveMonitorView } from './views/LiveMonitorView.js';
import { ShieldCheck } from 'lucide-react';

const DashboardContent: React.FC = () => {
  const { user, token, loading } = useAuth();
  const [currentView, setCurrentView] = useState<NavView>('dashboard');

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

  const titles: Record<NavView, string> = {
    dashboard: 'Executive Campus Overview & Analytics',
    directory: 'Student & Teacher Roster Directory',
    classes: 'Departmental Classes & Cohorts',
    batches: 'Batches & Cross-Disciplinary Cohorts',
    departments: 'University Academic Departments',
    templates: 'Timetable Templates & Cohort Scheduling',
    monitor: 'Campus Live Telemetry & Disciplinary Audit'
  };

  return (
    <div className="app-container">
      <Sidebar currentView={currentView} onNavigate={setCurrentView} />
      <div className="main-wrapper">
        <Topbar title={titles[currentView]} />
        <main className="content-viewport">
          {currentView === 'dashboard' && <DashboardOverview onNavigate={setCurrentView} />}
          {currentView === 'directory' && <DirectoryView />}
          {currentView === 'classes' && <ClassesView />}
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
