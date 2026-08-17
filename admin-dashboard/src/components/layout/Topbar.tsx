import React from 'react';
import { Calendar, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';

interface TopbarProps {
  title: string;
}

export const Topbar: React.FC<TopbarProps> = ({ title }) => {
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
        <h1 className="topbar-title">{title}</h1>
        <div className="status-pill">
          <div className="status-dot" />
          <span>Core Campus Engine Active</span>
        </div>
      </div>

      <div className="topbar-right">
        <div
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
                SUPER ADMIN
              </span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
