'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ username: '', displayName: '', password: '', confirm: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function set(k: string) {
    return (e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, [k]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirm) { setError('Passwords do not match'); return; }
    if (form.password.length < 6) { setError('Password must be at least 6 characters'); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: form.username, password: form.password, displayName: form.displayName }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Registration failed'); return; }
      router.push('/chat');
      router.refresh();
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <div className="auth-logo-text">NON<span>CHAT</span></div>
          <div className="auth-tagline">Create your account</div>
        </div>

        <form className="auth-form" onSubmit={handleSubmit} id="register-form">
          {error && <div className="form-error" role="alert">{error}</div>}

          <div className="field">
            <label htmlFor="reg-displayname">Display Name</label>
            <input
              id="reg-displayname"
              type="text"
              value={form.displayName}
              onChange={set('displayName')}
              placeholder="Your Name"
              maxLength={30}
              autoFocus
              required
            />
          </div>

          <div className="field">
            <label htmlFor="reg-username">Username</label>
            <input
              id="reg-username"
              type="text"
              value={form.username}
              onChange={set('username')}
              placeholder="letters, numbers, underscores"
              autoComplete="username"
              pattern="[a-zA-Z0-9_]{3,20}"
              title="3-20 chars: letters, numbers, underscores"
              required
            />
          </div>

          <div className="field">
            <label htmlFor="reg-password">Password</label>
            <input
              id="reg-password"
              type="password"
              value={form.password}
              onChange={set('password')}
              placeholder="At least 6 characters"
              autoComplete="new-password"
              minLength={6}
              required
            />
          </div>

          <div className="field">
            <label htmlFor="reg-confirm">Confirm Password</label>
            <input
              id="reg-confirm"
              type="password"
              value={form.confirm}
              onChange={set('confirm')}
              placeholder="Repeat password"
              autoComplete="new-password"
              required
            />
          </div>

          <button
            id="register-submit"
            type="submit"
            className="btn btn-primary w-full"
            disabled={loading || !form.username || !form.displayName || !form.password || !form.confirm}
            style={{ marginTop: 8 }}
          >
            {loading ? <span className="spinner" /> : 'Create Account'}
          </button>
        </form>

        <div className="auth-switch" style={{ marginTop: 24 }}>
          Already have an account?{' '}
          <Link href="/auth/login" id="go-login">Sign in</Link>
        </div>
      </div>
    </div>
  );
}
