'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

interface Me { username: string; displayName: string; avatarUrl: string | null; }

function Avatar({ name, src, size = 80 }: { name: string; src?: string | null; size?: number }) {
  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const colors = ['#0a84ff','#30d158','#ff9f0a','#bf5af2','#ff453a','#64d2ff'];
  const color = colors[name.charCodeAt(0) % colors.length];
  return (
    <div className="avatar" style={{ width: size, height: size, minWidth: size, borderRadius: '50%' }}>
      {src ? <img src={src} alt={name} /> : (
        <span className="avatar-initials" style={{ fontSize: size * 0.38, background: color, width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%' }}>{initials}</span>
      )}
    </div>
  );
}

export default function ProfilePage() {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [form, setForm] = useState({ displayName: '', bio: '' });
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [toast, setToast] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(d => {
      if (!d.user) { router.push('/auth/login'); return; }
      setMe(d.user);
      fetch(`/api/users/${d.user.username}`).then(r => r.json()).then(ud => {
        if (ud.user) setForm({ displayName: ud.user.displayName, bio: ud.user.bio || '' });
      });
    });
  }, [router]);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!me) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/users/${me.username}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName: form.displayName, bio: form.bio }),
      });
      if (res.ok) showToast('Profile updated');
      else showToast('Failed to save');
    } finally { setSaving(false); }
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !me) return;
    if (file.size > 15 * 1024 * 1024) { showToast('Image too large. Max 15MB.'); return; }
    setUploadingAvatar(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      if (res.ok) {
        const data = await res.json();
        await fetch(`/api/users/${me.username}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ avatarUrl: data.url }),
        });
        setMe(prev => prev ? { ...prev, avatarUrl: data.url } : prev);
        showToast('Avatar updated');
      } else showToast('Upload failed');
    } finally { setUploadingAvatar(false); e.target.value = ''; }
  }

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/auth/login');
  }

  if (!me) return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
      <span className="spinner spinner-lg" />
    </div>
  );

  return (
    <>
      {toast && (
        <div className="toast-container">
          <div className="toast">{toast}</div>
        </div>
      )}

      <div className="chat-header">
        <button className="btn btn-icon btn-ghost" onClick={() => router.back()} id="profile-back-btn" title="Back">←</button>
        <div className="chat-header-info">
          <div className="chat-header-name">Profile</div>
        </div>
        <button id="profile-logout-btn" className="btn btn-ghost" onClick={logout} style={{ fontSize: 'var(--text-sm)', color: 'var(--accent-red)' }}>Sign out</button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '0 0 40px' }}>
        {/* Avatar */}
        <div className="profile-header">
          <div className="profile-avatar-wrapper" onClick={() => fileRef.current?.click()}>
            {uploadingAvatar
              ? <div style={{ width: 90, height: 90, borderRadius: '50%', background: 'var(--bg-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span className="spinner" /></div>
              : <Avatar name={me.displayName} src={me.avatarUrl} size={90} />
            }
            <div className="profile-avatar-overlay">📷</div>
            <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} id="avatar-input" onChange={handleAvatarChange} />
          </div>
          <div className="profile-name">{form.displayName || me.displayName}</div>
          <div className="profile-username" style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' }}>@{me.username}</div>
        </div>

        <div style={{ padding: '0 var(--space-5)', maxWidth: 480, margin: '0 auto' }}>
          <form onSubmit={handleSave} id="profile-form">
            <div className="profile-section">
              <div className="profile-row">
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>Display Name</div>
                  <input
                    id="profile-displayname"
                    value={form.displayName}
                    onChange={e => setForm(f => ({ ...f, displayName: e.target.value }))}
                    maxLength={30}
                    style={{ background: 'none', border: 'none', outline: 'none', color: 'var(--text-primary)', fontSize: 'var(--text-md)', width: '100%', fontFamily: 'inherit' }}
                    placeholder="Your display name"
                  />
                </div>
              </div>
              <div className="profile-row">
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>Bio</div>
                  <input
                    id="profile-bio"
                    value={form.bio}
                    onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
                    maxLength={150}
                    style={{ background: 'none', border: 'none', outline: 'none', color: 'var(--text-primary)', fontSize: 'var(--text-md)', width: '100%', fontFamily: 'inherit' }}
                    placeholder="Tell people about yourself"
                  />
                </div>
              </div>
              <div className="profile-row">
                <span className="profile-row-label">Username</span>
                <span className="profile-row-value" style={{ color: 'var(--text-secondary)' }}>@{me.username}</span>
              </div>
            </div>

            <button id="save-profile-btn" type="submit" className="btn btn-primary w-full" disabled={saving}>
              {saving ? <span className="spinner" /> : 'Save Changes'}
            </button>
          </form>

          <div style={{ marginTop: 'var(--space-6)', textAlign: 'center', fontSize: 11, color: 'var(--text-tertiary)', letterSpacing: '0.5px', textTransform: 'uppercase', opacity: 0.4 }}>
            NONCHAT primarily runs on AS CLOUD HOST
          </div>
        </div>
      </div>
    </>
  );
}
