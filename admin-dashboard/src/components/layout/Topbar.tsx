import React from 'react';
import { Calendar, ShieldCheck, Menu, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';

interface TopbarProps {
  title: string;
  navigationOpen: boolean;
  onToggleNavigation: () => void;
}

export const Topbar: React.FC<TopbarProps> = ({ title, navigationOpen, onToggleNavigation }) => {
  const { user } = useAuth();
  const todayStr = new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  return (
    <header className="topbar">
      <div className="topbar-left">
        <button className="navigation-toggle" onClick={onToggleNavigation} aria-label={navigationOpen ? 'Close navigation' : 'Open navigation'} aria-expanded={navigationOpen} aria-controls="admin-navigation">{navigationOpen ? <X size={22} /> : <Menu size={22} />}</button>
        <h1 className="topbar-title">{title}</h1>
      </div>

      <div className="topbar-right">
        <div
          className="topbar-date"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '12.5px',
            color: 'var(--secondary)',
            backgroundColor: 'var(--surface-container-low)',
            padding: '6px 14px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--outline)'
          }}
        >
          <Calendar size={14} color="var(--primary-container)" />
          <span>{todayStr}</span>
        </div>

        <div className="admin-profile">
          <div className="admin-avatar">
            {user?.fullName?.charAt(0) || 'A'}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--on-surface)' }}>
              {user?.fullName || 'Campus Administrator'}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <ShieldCheck size={10} color="var(--primary-container)" />
              <span style={{ fontSize: '10px', color: 'var(--primary-container)', fontWeight: 700, letterSpacing: '0.04em' }}>
                Administrator
              </span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
