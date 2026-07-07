import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import { apiLogin, roleFromToken } from '../lib/api';
import { Eye, EyeOff, ArrowRight } from 'lucide-react';

const ROLE_HOME = { admin: '/admin/dashboard', user: '/chat' } as const;

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
      navigate(ROLE_HOME[role]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="lg-root">

      {/* ── Left panel — editorial cream ── */}
      <aside className="lg-left">
        <div className="lg-logo">
          <div className="lg-logo-mark">F</div>
          <span className="lg-logo-text">FinGuardMY</span>
        </div>

        <div className="lg-headline">
          <p className="lg-eyebrow">
            <span className="lg-eyebrow-dot" aria-hidden="true" />
            Financial Intelligence Platform
          </p>
          <h1>
            Investigate<br />
            financial crime,<br />
            with intelligence.
          </h1>
          <p className="lg-lede">
            Case reports, legal precedents, and document retrieval —
            unified into one investigator-grade workspace.
          </p>
        </div>

        <ul className="lg-trust">
          <li><span className="lg-trust-key">01</span> Advanced security &amp; compliance</li>
          <li><span className="lg-trust-key">02</span> Reliable AI-assisted analysis</li>
          <li><span className="lg-trust-key">03</span> Designed for investigators</li>
        </ul>
      </aside>

      {/* ── Right panel — white sign-in ── */}
      <main className="lg-right">
        <div className="lg-form-box">

          <header className="lg-form-head">
            <h2 className="lg-title">Sign in</h2>
            <p className="lg-title-sub">Enter your credentials to continue.</p>
          </header>

          <form onSubmit={onSubmit} noValidate>

            <div className="lg-field">
              <label htmlFor="email" className="lg-label">Email/Username</label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="username"
                required
                placeholder="you@example.com or username"
                value={form.email}
                onChange={onChange}
                className="lg-input"
              />
            </div>

            <div className="lg-field">
              <label htmlFor="password" className="lg-label">Password</label>
              <div className="lg-wrap">
                <input
                  id="password"
                  name="password"
                  type={showPass ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  placeholder="••••••••"
                  value={form.password}
                  onChange={onChange}
                  className="lg-input lg-input--pw"
                />
                <button
                  type="button"
                  className="lg-eye"
                  onClick={() => setShowPass(v => !v)}
                  aria-label={showPass ? 'Hide password' : 'Show password'}
                >
                  {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {error && <p className="lg-error" role="alert">{error}</p>}

            <button type="submit" disabled={loading} className="lg-btn">
              {loading ? (
                <><span className="lg-spin" aria-hidden="true" />Signing in…</>
              ) : (
                <>Sign in <ArrowRight size={15} strokeWidth={2} /></>
              )}
            </button>

          </form>

          <p className="lg-support">
            Need help? Contact{' '}
            <a href="mailto:finguard12@gmail.com">finguard12@gmail.com</a>
          </p>

        </div>
      </main>

    </div>
  );
};

export default LoginPage;
