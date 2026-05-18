import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import { apiLogin, roleFromToken } from '../lib/api';
import { Shield, Search, User, Lock, Eye, EyeOff } from 'lucide-react';

const ROLE_HOME = { admin: '/admin/dashboard', user: '/dashboard' } as const;

const LoginPage: React.FC = () => {
  const [form, setForm]         = useState({ email: '', password: '' });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const { login } = useAuth();
  const navigate  = useNavigate();

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError('');
    setForm(p => ({ ...p, [e.target.name]: e.target.value }));
  };

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const data = await apiLogin(form.email, form.password);
      const role = roleFromToken(data.access_token);
      login({ email: form.email, role, accessToken: data.access_token, refreshToken: data.refresh_token });
      navigate(ROLE_HOME[role], { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="lg-root">

      {/* ── Left panel ── */}
      <div className="lg-left">
        <div className="lg-logo">
          <div className="lg-logo-mark">F</div>
          <span className="lg-logo-text">FinGuardMY</span>
        </div>

        <div className="lg-headline">
          <p className="lg-eyebrow">Financial Intelligence Platform</p>
          <h1>Financial Crime<br />Analysis<br />Platform.</h1>
          <p>AI-powered tools for investigators — case reports, legal precedents, and document retrieval in one place.</p>
        </div>

        <div className="lg-feats">
          <div className="lg-feat">
            <div className="lg-feat-icon">
              <Shield size={13} />
            </div>
            Advanced security &amp; compliance
          </div>
          <div className="lg-feat">
            <div className="lg-feat-icon">
              <Search size={13} />
            </div>
            Reliable analysis &amp; suggestions
          </div>
        </div>
      </div>

      {/* ── Right panel ── */}
      <div className="lg-right">
        <div className="lg-form-box">

          <h2 className="lg-title">Sign in</h2>
          <p className="lg-title-sub">Enter your credentials to continue</p>

          <form onSubmit={onSubmit}>

            <div className="lg-field">
              <label htmlFor="email" className="lg-label">Email or username</label>
              <div className="lg-wrap">
                <span className="lg-icon"><User size={14} /></span>
                <input
                  id="email"
                  name="email"
                  type="text"
                  autoComplete="username"
                  required
                  placeholder="you@example.com"
                  value={form.email}
                  onChange={onChange}
                  className="lg-input"
                />
              </div>
            </div>

            <div className="lg-field">
              <label htmlFor="password" className="lg-label">Password</label>
              <div className="lg-wrap">
                <span className="lg-icon"><Lock size={14} /></span>
                <input
                  id="password"
                  name="password"
                  type={showPass ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  placeholder="Password"
                  value={form.password}
                  onChange={onChange}
                  className="lg-input"
                />
                <button
                  type="button"
                  className="lg-eye"
                  onClick={() => setShowPass(v => !v)}
                  aria-label={showPass ? 'Hide password' : 'Show password'}
                >
                  {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            <div className="lg-forgot-row">
              <a href="#" className="lg-forgot">Forgot password?</a>
            </div>

            {error && <p className="lg-error">{error}</p>}

            <button type="submit" disabled={loading} className="lg-btn">
              {loading
                ? <><span className="lg-spin" />Signing in…</>
                : 'Sign in'
              }
            </button>

          </form>

          <p className="lg-support">
            Having issues? Contact{' '}
            <a href="mailto:finguard12@gmail.com">finguard12@gmail.com</a>
          </p>

        </div>
      </div>

    </div>
  );
};

export default LoginPage;
