'use client';
import { useState, useEffect } from 'react';
import NewChatModal from '@/components/NewChatModal';
import SettingsModal from '@/components/SettingsModal';
import type { PublicUser } from '@/lib/types';

export default function ChatIndex() {
  const [showSearch, setShowSearch] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [users, setUsers] = useState<PublicUser[]>([]);
  const [me, setMe] = useState<{ username: string; displayName: string; avatarUrl: string | null } | null>(null);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.user) setMe(d.user); });

    fetch('/api/users')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.users) setUsers(d.users); });
  }, []);

  async function handleStartDM(username: string) {
    try {
      const res = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ otherUsername: username }),
      });
      if (res.ok) {
        const d = await res.json();
        window.location.href = `/chat/${d.conversation.id}`;
      }
    } catch {}
  }

  async function handleLogout() {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } finally {
      window.location.href = '/auth/login';
    }
  }

  return (
    <div className="no-chat" style={{ flex: 1, height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, textAlign: 'center' }}>
      <div style={{ maxWidth: 460, width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
        {/* Brand */}
        <div className="no-chat-logo" style={{ fontSize: 56, fontWeight: 900, letterSpacing: -2, color: 'var(--text-primary)' }}>
          NON<span style={{ color: 'var(--accent)' }}>CHAT</span>
        </div>

        <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-md)', lineHeight: 1.5, marginTop: -4 }}>
          Ultra-fast, secure & private messaging powered by modern cloud infrastructure.
        </p>

        {/* Quick action buttons */}
        <div style={{ display: 'flex', gap: 10, marginTop: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
          <button
            onClick={() => setShowSearch(true)}
            className="btn btn-primary"
            style={{ padding: '10px 22px', fontSize: 'var(--text-sm)' }}
          >
            🔍 Search Users & Chat
          </button>

          <button
            onClick={() => setShowSettings(true)}
            className="btn btn-secondary"
            style={{ padding: '10px 22px', fontSize: 'var(--text-sm)' }}
          >
            ⚙️ Open Settings
          </button>
        </div>

        {/* Cloud Info pill */}
        <div style={{ marginTop: 24, background: 'var(--bg-secondary)', border: '1px solid var(--separator)', borderRadius: 'var(--radius-full)', padding: '8px 18px', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent-green)', boxShadow: '0 0 6px var(--accent-green)' }} />
          <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600, letterSpacing: 0.4, textTransform: 'uppercase' }}>
            NONCHAT primarily runs on AS CLOUD HOST
          </span>
        </div>
      </div>

      <NewChatModal
        isOpen={showSearch}
        onClose={() => setShowSearch(false)}
        users={users}
        onSelectUser={handleStartDM}
      />

      {me && (
        <SettingsModal
          isOpen={showSettings}
          onClose={() => setShowSettings(false)}
          me={me}
          onUpdateMe={(up) => setMe(prev => prev ? { ...prev, ...up } : prev)}
          onLogout={handleLogout}
        />
      )}
    </div>
  );
}
