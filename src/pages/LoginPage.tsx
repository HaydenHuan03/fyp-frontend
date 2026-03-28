import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiLogin, roleFromToken } from '../lib/api';

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

      {/* ═══════════ LEFT 60% ═══════════ */}
      <div className="lg-left">
        <div className="lg-circle lg-c1" aria-hidden />
        <div className="lg-circle lg-c2" aria-hidden />
        <div className="lg-circle lg-c3" aria-hidden />
        <div className="lg-circle lg-c4" aria-hidden />

        {/* Logo */}
        <div className="lg-logo">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
            stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 3v18M3 6l9-3 9 3M3 6v6c0 4.97 4.03 9 9 9s9-4.03 9-9V6" />
          </svg>
          <span className="lg-logo-text">FinGuardMY</span>
        </div>

        {/* Headline */}
        <div className="lg-headline">
          <h1>Hey<br />Welcome To<br />FinGuard AI</h1>
          <p>AI Assistant For Financial Crime Analysis</p>
        </div>

        {/* Features */}
        <div className="lg-feats">
          <div className="lg-feat">
            <div className="lg-feat-icon">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
                stroke="rgba(255,255,255,0.95)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </div>
            Advanced Security &amp; Compliance
          </div>
          <div className="lg-feat">
            <div className="lg-feat-icon">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
                stroke="rgba(255,255,255,0.95)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
              </svg>
            </div>
            Reliable Analysis &amp; Suggestions
          </div>
        </div>
      </div>

      {/* ═══════════ RIGHT 40% ═══════════ */}
      <div className="lg-right">
        <div className="lg-form-box">

          <h2 className="lg-title f1">Login</h2>

          <form onSubmit={onSubmit}>

            {/* Email */}
            <div className="lg-field f2">
              <label htmlFor="email" className="lg-label">Email</label>
              <div className="lg-wrap">
                <span className="lg-icon">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                </span>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  placeholder="Email"
                  value={form.email}
                  onChange={onChange}
                  className="lg-input"
                />
              </div>
            </div>

            {/* Password */}
            <div className="lg-field f3">
              <label htmlFor="password" className="lg-label">Password</label>
              <div className="lg-wrap">
                <span className="lg-icon">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" />
                    <path d="M7 11V7a5 5 0 0110 0v4" />
                  </svg>
                </span>
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
                  style={{ paddingRight: '40px' }}
                />
                <button
                  type="button"
                  className="lg-eye"
                  onClick={() => setShowPass(v => !v)}
                  aria-label={showPass ? 'Hide password' : 'Show password'}
                >
                  {showPass ? (
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24M1 1l22 22" />
                    </svg>
                  ) : (
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Forgot */}
            <div className="lg-forgot-row f4">
              <a href="#" className="lg-forgot">Forget Password?</a>
            </div>

            {/* Error */}
            {error && <p className="lg-error">{error}</p>}

            {/* Submit */}
            <button type="submit" disabled={loading} className="lg-btn f5">
              {loading
                ? <><span className="lg-spin" />Logging in…</>
                : 'Login'
              }
            </button>

          </form>

          <p className="lg-support f6">
            If having any issues please contact<br />
            <a href="mailto:finguard12@gmail.com">finguard12@gmail.com</a>
          </p>

        </div>
      </div>

    </div>
  );
};

export default LoginPage;
