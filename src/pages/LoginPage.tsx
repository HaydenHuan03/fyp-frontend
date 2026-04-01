import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiLogin, roleFromToken } from '../lib/api';
import { Landmark, Shield, Search, User, Lock, Eye, EyeOff } from 'lucide-react';

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
          <Landmark size={22} color="#fff" strokeWidth={2.2} />
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
              <Shield size={15} color="rgba(255,255,255,0.95)" />
            </div>
            Advanced Security &amp; Compliance
          </div>
          <div className="lg-feat">
            <div className="lg-feat-icon">
              <Search size={15} color="rgba(255,255,255,0.95)" />
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

            {/* Email / Username */}
            <div className="lg-field f2">
              <label htmlFor="email" className="lg-label">Email or Username</label>
              <div className="lg-wrap">
                <span className="lg-icon">
                  <User size={15} />
                </span>
                <input
                  id="email"
                  name="email"
                  type="text"
                  autoComplete="username"
                  required
                  placeholder="Email or username"
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
                  <Lock size={15} />
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
                  {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
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
