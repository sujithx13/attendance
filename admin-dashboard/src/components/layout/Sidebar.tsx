import React from 'react';
import {
  LayoutDashboard,
  Users2,
  GraduationCap,
  Users,
  Building2,
  CalendarDays,
  Activity,
  LogOut,
  ChevronRight
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';

export type NavView =
  | 'dashboard'
  | 'directory'
  | 'classes'
  | 'batches'
  | 'departments'
  | 'templates'
  | 'monitor';

interface SidebarProps {
  currentView: NavView;
  onNavigate: (view: NavView) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentView, onNavigate }) => {
  const { logout } = useAuth();

  return (
    <aside className="sidebar">
      {/* Official KAHE Logo Header */}
      <div className="sidebar-header">
        <img
          src="/kahe-logo.png"
          alt="Karpagam Academy of Higher Education"
          className="kahe-logo-img"
        />
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--on-surface)', letterSpacing: '-0.01em', lineHeight: '1.2' }}>
            KARPAGAM
          </span>
          <span style={{ fontSize: '9.5px', fontWeight: 700, color: 'var(--primary-container)', letterSpacing: '0.04em' }}>
            ACADEMY OF HIGHER EDUCATION
          </span>
          <span style={{ fontSize: '8.5px', color: 'var(--secondary)', marginTop: '2px' }}>
            Deemed to be University
          </span>
        </div>
      </div>

      <nav className="sidebar-nav">
        <div className="nav-section-title">EXECUTIVE PORTAL</div>

        <button
          className={`nav-item ${currentView === 'dashboard' ? 'active' : ''}`}
          onClick={() => onNavigate('dashboard')}
        >
          <div className="nav-item-content">
            <LayoutDashboard size={17} />
            <span>Campus Overview</span>
          </div>
          {currentView === 'dashboard' && <ChevronRight size={14} />}
        </button>

        <button
          className={`nav-item ${currentView === 'directory' ? 'active' : ''}`}
          onClick={() => onNavigate('directory')}
        >
          <div className="nav-item-content">
            <Users2 size={17} />
            <span>Student & Faculty Roster</span>
          </div>
          {currentView === 'directory' && <ChevronRight size={14} />}
        </button>

        <div className="nav-section-title">ACADEMIC COHORTS</div>

        <button
          className={`nav-item ${currentView === 'classes' ? 'active' : ''}`}
          onClick={() => onNavigate('classes')}
        >
          <div className="nav-item-content">
            <GraduationCap size={17} />
            <span>Departmental Classes</span>
          </div>
          {currentView === 'classes' && <ChevronRight size={14} />}
        </button>

        <button
          className={`nav-item ${currentView === 'batches' ? 'active' : ''}`}
          onClick={() => onNavigate('batches')}
        >
          <div className="nav-item-content">
            <Users size={17} />
            <span>Flexible Batches</span>
          </div>
          {currentView === 'batches' && <ChevronRight size={14} />}
        </button>

        <button
          className={`nav-item ${currentView === 'departments' ? 'active' : ''}`}
          onClick={() => onNavigate('departments')}
        >
          <div className="nav-item-content">
            <Building2 size={17} />
            <span>Academic Departments</span>
          </div>
          {currentView === 'departments' && <ChevronRight size={14} />}
        </button>

        <div className="nav-section-title">SCHEDULING & AUDIT</div>

        <button
          className={`nav-item ${currentView === 'templates' ? 'active' : ''}`}
          onClick={() => onNavigate('templates')}
        >
          <div className="nav-item-content">
            <CalendarDays size={17} />
            <span>Timetable & Scheduling</span>
          </div>
          {currentView === 'templates' && <ChevronRight size={14} />}
        </button>

        <button
          className={`nav-item ${currentView === 'monitor' ? 'active' : ''}`}
          onClick={() => onNavigate('monitor')}
        >
          <div className="nav-item-content">
            <Activity size={17} />
            <span>Live Monitor & Audit</span>
          </div>
          {currentView === 'monitor' && <ChevronRight size={14} />}
        </button>
      </nav>

      <div className="sidebar-footer">
        <button
          className="btn btn-secondary"
          style={{ width: '100%', justifyContent: 'flex-start', color: 'var(--secondary)', fontSize: '13px' }}
          onClick={logout}
        >
          <LogOut size={15} />
          <span>Sign Out Administrator</span>
        </button>
      </div>
    </aside>
  );
};
