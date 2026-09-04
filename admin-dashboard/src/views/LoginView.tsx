import { useState, type FormEvent } from 'react';
import { Lock, Mail, AlertCircle, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';

export const LoginView = () => {
  const { login } = useAuth();
  const development = import.meta.env.DEV;
  const [email, setEmail] = useState(development ? 'admin@university.edu' : '');
  const [password, setPassword] = useState(development ? 'password123' : '');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setLoading(true); setError('');
    try { await login(email.trim(), password); }
    catch (error) { setError(error instanceof Error ? error.message : 'Sign-in failed. Please try again.'); }
    finally { setLoading(false); }
  };
  return <main className="login-page">
    <div className="login-brand"><img src="/kahe-logo.png" alt="Karpagam Academy of Higher Education" /><span>KAHE <strong>Attendance</strong></span></div>
    <section className="login-card" aria-labelledby="sign-in-title">
      <span className="eyebrow">ADMIN WORKSPACE</span>
      <h1 id="sign-in-title">Welcome back</h1>
      <p>Sign in to manage your campus, classes and attendance.</p>
      <form onSubmit={submit}>
        <div className="form-group"><label className="form-label" htmlFor="admin-email">University email</label><div className="login-input"><Mail size={18} aria-hidden="true" /><input id="admin-email" type="email" autoComplete="username" className="form-input" value={email} onChange={event => setEmail(event.target.value)} placeholder="you@university.edu" required /></div></div>
        <div className="form-group"><label className="form-label" htmlFor="admin-password">Password</label><div className="login-input"><Lock size={18} aria-hidden="true" /><input id="admin-password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" className="form-input" value={password} onChange={event => setPassword(event.target.value)} placeholder="Enter your password" required /><button className="password-toggle" type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div></div>
        {error && <div className="login-error" role="alert"><AlertCircle size={18} /><span>{error}</span></div>}
        <button className="btn btn-primary login-submit" type="submit" disabled={loading}><span>{loading ? 'Signing in...' : 'Sign in'}</span><ArrowRight size={18} /></button>
      </form>
      {development && <div className="development-signin"><span>Local development</span><button type="button" onClick={() => { setEmail('admin@university.edu'); setPassword('password123'); }}>Use demo admin</button></div>}
    </section>
    <p className="login-footnote">Karpagam Academy of Higher Education</p>
  </main>;
};
