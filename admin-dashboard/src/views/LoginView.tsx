import React, { useState } from 'react';
import { Lock, Mail, AlertCircle, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';

export const LoginView: React.FC = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState('admin@university.edu');
  const [password, setPassword] = useState('password123');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const fillQuickCredentials = (userEmail: string) => {
    setEmail(userEmail);
    setPassword('password123');
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        width: '100vw',
        background: 'radial-gradient(circle at 50% 15%, rgba(46, 125, 50, 0.1) 0%, transparent 60%), var(--surface)',
        padding: '24px'
      }}
    >
      <div
        className="card"
        style={{
          width: '100%',
          maxWidth: '440px',
          padding: '40px 36px',
          boxShadow: 'var(--shadow-modal)',
          border: '1px solid var(--outline)',
          backgroundColor: '#ffffff'
        }}
      >
        {/* Official Logo Banner */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div
            style={{
              display: 'inline-flex',
              padding: '8px 14px',
              backgroundColor: '#FFF',
              borderRadius: 'var(--radius-md)',
              boxShadow: 'var(--shadow-md)',
              marginBottom: '14px'
            }}
          >
            <img
              src="/kahe-logo.png"
              alt="Karpagam Academy of Higher Education"
              style={{ height: '54px', objectFit: 'contain' }}
            />
          </div>
          <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-main)' }}>
            KARPAGAM
          </h2>
          <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--kahe-green-light)', letterSpacing: '0.05em' }}>
            ACADEMY OF HIGHER EDUCATION
          </div>
          <p style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '4px' }}>
            Executive Campus Management & Attendance Portal
          </p>
        </div>

        {error && (
          <div
            style={{
              backgroundColor: 'var(--accent-rose-soft)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: 'var(--radius-md)',
              padding: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              marginBottom: '20px',
              color: '#FB7185',
              fontSize: '12px'
            }}
          >
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">ADMINISTRATOR EMAIL</label>
            <div style={{ position: 'relative' }}>
              <Mail size={16} color="var(--text-dim)" style={{ position: 'absolute', left: '12px', top: '12px' }} />
              <input
                type="email"
                className="form-input"
                style={{ paddingLeft: '38px' }}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@university.edu"
                required
              />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '24px' }}>
            <label className="form-label">PASSWORD</label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} color="var(--text-dim)" style={{ position: 'absolute', left: '12px', top: '12px' }} />
              <input
                type="password"
                className="form-input"
                style={{ paddingLeft: '38px' }}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', padding: '12px', fontSize: '14px', fontWeight: 700 }}
            disabled={loading}
          >
            <span>{loading ? 'Authenticating…' : 'Access Admin Dashboard'}</span>
            <ArrowRight size={16} />
          </button>
        </form>

        {/* Quick Credentials */}
        <div style={{ marginTop: '28px', paddingTop: '20px', borderTop: '1px solid var(--border-subtle)' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '8px' }}>
            Quick Development Sign-in:
          </span>
          <button
            className="btn btn-secondary"
            style={{ width: '100%', fontSize: '11px', padding: '6px 12px' }}
            onClick={() => fillQuickCredentials('admin@university.edu')}
          >
            System Admin (admin@university.edu)
          </button>
        </div>
      </div>
    </div>
  );
};
