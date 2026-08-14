'use client';
import { useState, useRef } from 'react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  me: { username: string; displayName: string; avatarUrl: string | null };
  onUpdateMe: (updated: { displayName: string; avatarUrl?: string | null }) => void;
  onLogout: () => void;
}

export default function SettingsModal({ isOpen, onClose, me, onUpdateMe, onLogout }: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<'profile' | 'preferences' | 'system'>('profile');
  const [displayName, setDisplayName] = useState(me?.displayName || '');
  const [bio, setBio] = useState('');
  const [status, setStatus] = useState<'online' | 'away' | 'busy' | 'offline'>('online');
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [notifications, setNotifications] = useState(true);
  const [soundEffects, setSoundEffects] = useState(true);
  const [autoMedia, setAutoMedia] = useState(true);
  const fileRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  function showToast(msg: string) {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3000);
  }

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!displayName.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/users/${me.username}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName: displayName.trim(), bio: bio.trim(), status }),
      });
      if (res.ok) {
        onUpdateMe({ displayName: displayName.trim() });
        showToast('Settings saved successfully');
      } else {
        showToast('Failed to save changes');
      }
    } catch {
      showToast('Network error while saving');
    } finally {
      setSaving(false);
    }
  }

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 15 * 1024 * 1024) {
      showToast('Image size exceeds 15MB limit');
      return;
    }

    setUploadingAvatar(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      if (res.ok) {
        const data = await res.json();
        if (data?.url) {
          await fetch(`/api/users/${me.username}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ avatarUrl: data.url }),
          });
          onUpdateMe({ displayName: displayName || me.displayName, avatarUrl: data.url });
          showToast('Profile picture updated');
        }
      } else {
        showToast('Image upload failed');
      }
    } catch {
      showToast('Error uploading avatar');
    } finally {
      setUploadingAvatar(false);
      e.target.value = '';
    }
  }

  const initials = (displayName || me.displayName || me.username).split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal settings-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 500, padding: 0, overflow: 'hidden', maxHeight: '88vh', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--separator)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 'var(--text-lg)', fontWeight: 700, letterSpacing: -0.3 }}>Settings</div>
          <button onClick={onClose} className="btn btn-icon btn-ghost" style={{ fontSize: 18, color: 'var(--text-secondary)' }}>✕</button>
        </div>

        {/* Tab Navigation */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--separator)', padding: '0 16px', background: 'var(--bg-secondary)', gap: 8 }}>
          {(['profile', 'preferences', 'system'] as const).map(t => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              style={{
                padding: '12px 14px',
                fontSize: 'var(--text-sm)',
                fontWeight: 600,
                color: activeTab === t ? 'var(--accent)' : 'var(--text-secondary)',
                borderBottom: activeTab === t ? '2px solid var(--accent)' : '2px solid transparent',
                textTransform: 'capitalize',
                transition: 'all 0.15s ease'
              }}
            >
              {t === 'profile' ? 'Profile & Status' : t === 'preferences' ? 'Preferences' : 'Cloud Status'}
            </button>
          ))}
        </div>

        {/* Body Content */}
        <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
          {toastMsg && (
            <div style={{ background: 'var(--accent)', color: 'white', padding: '8px 14px', borderRadius: 'var(--radius-md)', fontSize: 'var(--text-xs)', fontWeight: 600, textAlign: 'center', marginBottom: 16, animation: 'msgIn 0.2s ease' }}>
              {toastMsg}
            </div>
          )}

          {activeTab === 'profile' && (
            <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Avatar Upload */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, background: 'var(--bg-tertiary)', padding: 14, borderRadius: 'var(--radius-lg)' }}>
                <div
                  onClick={() => fileRef.current?.click()}
                  style={{ position: 'relative', width: 64, height: 64, borderRadius: '50%', overflow: 'hidden', cursor: 'pointer', background: 'var(--bg-elevated)', flexShrink: 0 }}
                >
                  {uploadingAvatar ? (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span className="spinner" />
                    </div>
                  ) : me?.avatarUrl ? (
                    <img src={me.avatarUrl} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: '100%', height: '100%', background: 'var(--accent)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 700 }}>
                      {initials}
                    </div>
                  )}
                  <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: 'opacity 0.15s ease' }} className="avatar-hover-overlay">
                    📷
                  </div>
                  <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarUpload} />
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>Profile Photo</div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', marginTop: 2 }}>Tap photo to upload new avatar (Max 15MB)</div>
                  <button type="button" onClick={() => fileRef.current?.click()} className="btn btn-ghost" style={{ padding: '4px 8px', fontSize: 'var(--text-xs)', color: 'var(--accent)', marginTop: 4 }}>
                    Change Photo
                  </button>
                </div>
              </div>

              {/* Display Name Field */}
              <div className="field">
                <label>Display Name</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  maxLength={30}
                  placeholder="Your display name"
                  required
                />
              </div>

              {/* Username (Read-only) */}
              <div className="field">
                <label>Username</label>
                <input
                  type="text"
                  value={`@${me.username}`}
                  disabled
                  style={{ opacity: 0.6, cursor: 'not-allowed' }}
                />
              </div>

              {/* Bio Field */}
              <div className="field">
                <label>Bio / About</label>
                <input
                  type="text"
                  value={bio}
                  onChange={e => setBio(e.target.value)}
                  maxLength={100}
                  placeholder="Hey there! I am using NONCHAT."
                />
              </div>

              {/* Status Picker */}
              <div className="field">
                <label>Active Status</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, marginTop: 4 }}>
                  {[
                    { key: 'online', label: '🟢 Online', desc: 'Available for chats' },
                    { key: 'away', label: '🟡 Away', desc: 'Step away briefly' },
                    { key: 'busy', label: '🔴 Do Not Disturb', desc: 'Mute sounds' },
                    { key: 'offline', label: '⚪ Invisible', desc: 'Appear offline' },
                  ].map(s => (
                    <button
                      type="button"
                      key={s.key}
                      onClick={() => setStatus(s.key as any)}
                      style={{
                        padding: '10px 12px',
                        borderRadius: 'var(--radius-md)',
                        background: status === s.key ? 'var(--bg-elevated)' : 'var(--bg-tertiary)',
                        border: status === s.key ? '1px solid var(--accent)' : '1px solid transparent',
                        textAlign: 'left',
                        cursor: 'pointer'
                      }}
                    >
                      <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-primary)' }}>{s.label}</div>
                      <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginTop: 2 }}>{s.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              <button type="submit" className="btn btn-primary w-full" disabled={saving} style={{ marginTop: 8 }}>
                {saving ? <span className="spinner" /> : 'Save Changes'}
              </button>
            </form>
          )}

          {activeTab === 'preferences' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: '1px solid var(--separator)' }}>
                  <div>
                    <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>Message Notifications</div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', marginTop: 2 }}>Play in-app alerts for new messages</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifications}
                    onChange={e => setNotifications(e.target.checked)}
                    style={{ width: 20, height: 20, accentColor: 'var(--accent)', cursor: 'pointer' }}
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: '1px solid var(--separator)' }}>
                  <div>
                    <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>Sound Effects</div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', marginTop: 2 }}>Swoosh sound on message send</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={soundEffects}
                    onChange={e => setSoundEffects(e.target.checked)}
                    style={{ width: 20, height: 20, accentColor: 'var(--accent)', cursor: 'pointer' }}
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px' }}>
                  <div>
                    <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>Auto-Preview Media</div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', marginTop: 2 }}>Load high resolution media previews</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={autoMedia}
                    onChange={e => setAutoMedia(e.target.checked)}
                    style={{ width: 20, height: 20, accentColor: 'var(--accent)', cursor: 'pointer' }}
                  />
                </div>
              </div>

              {/* Theme description */}
              <div style={{ background: 'var(--bg-tertiary)', padding: 14, borderRadius: 'var(--radius-lg)' }}>
                <div style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Appearance</div>
                <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, marginTop: 4 }}>iOS Dark Minimalist (Active)</div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', marginTop: 2 }}>Deep OLED black theme with native SF typography</div>
              </div>

              {/* Sign out */}
              <button
                onClick={onLogout}
                className="btn btn-danger w-full"
                style={{ marginTop: 8 }}
              >
                Sign Out of NONCHAT
              </button>
            </div>
          )}

          {activeTab === 'system' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-lg)', padding: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--accent-green)', boxShadow: '0 0 8px var(--accent-green)' }} />
                  <div style={{ fontSize: 'var(--text-sm)', fontWeight: 700 }}>AS CLOUD HOST — Operational</div>
                </div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', marginTop: 6, lineHeight: 1.5 }}>
                  NONCHAT primarily runs on AS CLOUD HOST enterprise infrastructure. Real-time message streaming, high-throughput media pipeline, and encrypted storage clusters are fully synced.
                </div>
              </div>

              <div style={{ background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-lg)', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>Server Version</span>
                <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600 }}>v2.4.0-ascloud</span>
              </div>

              <div style={{ background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-lg)', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>Media Storage Tier</span>
                <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600 }}>Permanent CDN (15MB max)</span>
              </div>

              <div style={{ background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-lg)', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>Encryption</span>
                <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600 }}>AES-256 / SHA-256</span>
              </div>

              <div style={{ textAlign: 'center', fontSize: 11, color: 'var(--text-tertiary)', marginTop: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                NONCHAT primarily runs on AS CLOUD HOST
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
