'use client';
import { useState } from 'react';
import type { PublicUser } from '@/lib/types';

interface NewChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  users: PublicUser[];
  onSelectUser: (username: string) => void;
}

export default function NewChatModal({ isOpen, onClose, users, onSelectUser }: NewChatModalProps) {
  const [query, setQuery] = useState('');

  if (!isOpen) return null;

  const filtered = users.filter(u =>
    u.username.toLowerCase().includes(query.toLowerCase()) ||
    u.displayName.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal new-chat-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 440, padding: 0, overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--separator)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 'var(--text-lg)', fontWeight: 700, letterSpacing: -0.3 }}>New Message</div>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', marginTop: 2 }}>Search any user by name or @username</div>
          </div>
          <button onClick={onClose} className="btn btn-icon btn-ghost" style={{ fontSize: 18, color: 'var(--text-secondary)' }}>✕</button>
        </div>

        {/* Search input */}
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--separator)' }}>
          <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-full)', padding: '8px 14px', gap: 8 }}>
            <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>🔍</span>
            <input
              type="text"
              placeholder="Search people..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              autoFocus
              style={{ background: 'none', border: 'none', outline: 'none', color: 'var(--text-primary)', fontSize: 'var(--text-sm)', width: '100%', fontFamily: 'inherit' }}
            />
            {query && (
              <button onClick={() => setQuery('')} style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>✕</button>
            )}
          </div>
        </div>

        {/* User list */}
        <div style={{ maxHeight: 320, overflowY: 'auto', padding: '8px' }}>
          {filtered.length === 0 ? (
            <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-tertiary)' }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>👤</div>
              <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>No users found</div>
              <div style={{ fontSize: 'var(--text-xs)', marginTop: 4 }}>Try searching for a different username</div>
            </div>
          ) : (
            filtered.map(u => {
              const initials = (u.displayName || u.username).split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
              const colors = ['#0a84ff','#30d158','#ff9f0a','#bf5af2','#ff453a','#64d2ff'];
              const color = colors[(u.username || 'u').charCodeAt(0) % colors.length];

              return (
                <div
                  key={u.username}
                  className="person-row"
                  onClick={() => {
                    onSelectUser(u.username);
                    onClose();
                  }}
                  style={{ borderRadius: 'var(--radius-md)', padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}
                >
                  <div className="avatar" style={{ width: 42, height: 42, borderRadius: '50%', flexShrink: 0 }}>
                    {u.avatarUrl ? (
                      <img src={u.avatarUrl} alt={u.displayName} />
                    ) : (
                      <span className="avatar-initials" style={{ fontSize: 16, background: color, width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%' }}>
                        {initials}
                      </span>
                    )}
                    <span className={`avatar-status ${u.status || 'offline'}`} />
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {u.displayName}
                    </div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', marginTop: 1 }}>
                      @{u.username}
                    </div>
                  </div>

                  <button className="btn btn-primary" style={{ padding: '6px 14px', fontSize: 'var(--text-xs)', borderRadius: 'var(--radius-full)' }}>
                    Chat
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
