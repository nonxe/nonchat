'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import type { Conversation, Room, PublicUser } from '@/lib/types';
import NewChatModal from '@/components/NewChatModal';
import SettingsModal from '@/components/SettingsModal';

interface Me { username: string; displayName: string; avatarUrl: string | null; }

function AvatarSmall({ name, src, size = 42, status }: { name: string; src?: string | null; size?: number; status?: string }) {
  const initials = (name || 'U').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const colors = ['#0a84ff','#30d158','#ff9f0a','#bf5af2','#ff453a','#64d2ff'];
  const color = colors[(name || 'U').charCodeAt(0) % colors.length];
  return (
    <div className="avatar" style={{ width: size, height: size, minWidth: size, borderRadius: '50%' }}>
      {src ? <img src={src} alt={name} /> : (
        <span className="avatar-initials" style={{ fontSize: size * 0.38, background: color, width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%' }}>{initials}</span>
      )}
      {status && <span className={`avatar-status ${status}`} />}
    </div>
  );
}

function timeAgo(iso: string) {
  try {
    const d = new Date(iso);
    const now = new Date();
    const diff = Math.floor((now.getTime() - d.getTime()) / 1000);
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
}

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [me, setMe] = useState<Me | null>(null);
  const [tab, setTab] = useState<'dms' | 'rooms'>('dms');
  const [convos, setConvos] = useState<Conversation[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [search, setSearch] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showNewChat, setShowNewChat] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showNewRoom, setShowNewRoom] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomDesc, setNewRoomDesc] = useState('');
  const [creating, setCreating] = useState(false);

  // Fetch current user
  useEffect(() => {
    let mounted = true;
    fetch('/api/auth/me')
      .then(async (r) => {
        if (!r.ok) {
          window.location.href = '/auth/login';
          return null;
        }
        return r.json();
      })
      .then((d) => {
        if (!mounted) return;
        if (d?.user) {
          setMe(d.user);
        }
      })
      .catch(() => {
        if (mounted) window.location.href = '/auth/login';
      });

    return () => { mounted = false; };
  }, []);

  // Fetch conversations
  const fetchConvos = useCallback(async () => {
    try {
      const r = await fetch('/api/conversations');
      if (r.ok) {
        const d = await r.json();
        setConvos(Array.isArray(d.conversations) ? d.conversations : []);
      }
    } catch {}
  }, []);

  // Fetch rooms
  const fetchRooms = useCallback(async () => {
    try {
      const r = await fetch('/api/rooms');
      if (r.ok) {
        const d = await r.json();
        setRooms(Array.isArray(d.rooms) ? d.rooms : []);
      }
    } catch {}
  }, []);

  useEffect(() => {
    fetchConvos();
    fetchRooms();
  }, [fetchConvos, fetchRooms]);

  // Background polling every 3 seconds for near real-time Telegram feel
  useEffect(() => {
    const iv = setInterval(() => {
      fetchConvos();
      fetchRooms();
    }, 3000);
    return () => clearInterval(iv);
  }, [fetchConvos, fetchRooms]);

  async function startDM(username: string) {
    try {
      const res = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ otherUsername: username }),
      });
      if (res.ok) {
        const d = await res.json();
        fetchConvos();
        router.push(`/chat/${d.conversation.id}`);
        setSidebarOpen(false);
        setTab('dms');
      }
    } catch (e) {
      console.error('startDM error:', e);
    }
  }

  async function createRoom(e: React.FormEvent) {
    e.preventDefault();
    if (!newRoomName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newRoomName.trim(), description: newRoomDesc.trim() }),
      });
      if (res.ok) {
        const d = await res.json();
        fetchRooms();
        setShowNewRoom(false);
        setNewRoomName('');
        setNewRoomDesc('');
        router.push(`/chat/rooms/${d.room.id}`);
        setSidebarOpen(false);
      }
    } finally {
      setCreating(false);
    }
  }

  async function logout() {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } finally {
      window.location.href = '/auth/login';
    }
  }

  function otherParticipant(conv: Conversation): string {
    return conv.participants.find(p => p !== me?.username) || conv.participants[0] || 'User';
  }

  const filteredConvos = convos.filter(c => {
    const other = otherParticipant(c);
    return !search || other.toLowerCase().includes(search.toLowerCase()) || (c.lastMessage && c.lastMessage.toLowerCase().includes(search.toLowerCase()));
  }).sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime());

  const filteredRooms = rooms.filter(r => !search || r.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="app-shell">
      {/* Sidebar overlay for mobile */}
      {sidebarOpen && (
        <div onClick={() => setSidebarOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 49 }} />
      )}

      {/* Telegram/WhatsApp Styled Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        {/* Top Header */}
        <div className="sidebar-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {me && (
              <div onClick={() => setShowSettings(true)} style={{ cursor: 'pointer' }}>
                <AvatarSmall name={me.displayName} src={me.avatarUrl} size={36} status="online" />
              </div>
            )}
            <div>
              <span className="sidebar-brand">NON<span>CHAT</span></span>
              <div style={{ fontSize: 10, color: 'var(--text-secondary)', fontWeight: 500 }}>AS CLOUD SECURE</div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            {/* New Message / Username Search Button */}
            <button
              id="new-chat-btn"
              className="btn btn-icon btn-ghost"
              onClick={() => setShowNewChat(true)}
              title="New Chat (Search @username)"
              style={{ fontSize: 18, color: 'var(--accent)' }}
            >
              ✏️
            </button>

            {/* New Room / Channel Button */}
            {tab === 'rooms' && (
              <button
                id="new-room-btn"
                className="btn btn-icon btn-ghost"
                onClick={() => setShowNewRoom(true)}
                title="Create Room"
                style={{ fontSize: 18 }}
              >
                ➕
              </button>
            )}

            {/* Settings */}
            <button
              id="settings-btn"
              className="btn btn-icon btn-ghost"
              onClick={() => setShowSettings(true)}
              title="Settings & Profile"
              style={{ fontSize: 18 }}
            >
              ⚙️
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="sidebar-search">
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <input
              id="sidebar-search"
              type="search"
              placeholder={tab === 'dms' ? 'Search chats or @username…' : 'Search rooms…'}
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Segmented Controls (Chats vs Channels) */}
        <div className="sidebar-tabs">
          <button
            id="tab-dms"
            className={`sidebar-tab ${tab === 'dms' ? 'active' : ''}`}
            onClick={() => { setTab('dms'); setSearch(''); }}
          >
            Chats ({convos.length})
          </button>
          <button
            id="tab-rooms"
            className={`sidebar-tab ${tab === 'rooms' ? 'active' : ''}`}
            onClick={() => { setTab('rooms'); setSearch(''); }}
          >
            Rooms ({rooms.length})
          </button>
        </div>

        {/* List of active chats */}
        <div className="sidebar-list">
          {tab === 'dms' && (
            filteredConvos.length === 0 ? (
              <div className="empty-state" style={{ padding: '40px 16px' }}>
                <div className="empty-state-icon">💬</div>
                <div style={{ fontSize: 'var(--text-md)', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
                  {search ? 'No active chat matches' : 'No conversations yet'}
                </div>
                <p className="empty-state-sub" style={{ marginBottom: 14 }}>
                  {search ? `Tap below to search the network for "${search}"` : 'Private by default. Search any user to start a conversation.'}
                </p>
                <button
                  onClick={() => setShowNewChat(true)}
                  className="btn btn-primary"
                  style={{ padding: '8px 20px', fontSize: 'var(--text-xs)' }}
                >
                  🔍 Search @Username
                </button>
              </div>
            ) : (
              filteredConvos.map(conv => {
                const other = otherParticipant(conv);
                const isActive = pathname === `/chat/${conv.id}`;
                return (
                  <div
                    key={conv.id}
                    id={`conv-${conv.id}`}
                    className={`sidebar-item ${isActive ? 'active' : ''}`}
                    onClick={() => { router.push(`/chat/${conv.id}`); setSidebarOpen(false); }}
                  >
                    <AvatarSmall name={other} size={44} status="online" />
                    <div className="sidebar-item-info">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div className="sidebar-item-name">{other}</div>
                        {conv.lastMessageAt && (
                          <div className="sidebar-item-time">{timeAgo(conv.lastMessageAt)}</div>
                        )}
                      </div>
                      <div className="sidebar-item-preview">{conv.lastMessage || 'Tap to send a message'}</div>
                    </div>
                  </div>
                );
              })
            )
          )}

          {tab === 'rooms' && (
            filteredRooms.length === 0 ? (
              <div className="empty-state" style={{ padding: '40px 16px' }}>
                <div className="empty-state-icon">🏠</div>
                <div style={{ fontSize: 'var(--text-md)', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>No rooms yet</div>
                <p className="empty-state-sub" style={{ marginBottom: 14 }}>Create a group or channel for everyone.</p>
                <button onClick={() => setShowNewRoom(true)} className="btn btn-primary" style={{ padding: '8px 20px', fontSize: 'var(--text-xs)' }}>
                  ➕ Create Room
                </button>
              </div>
            ) : (
              filteredRooms.map(room => {
                const isActive = pathname === `/chat/rooms/${room.id}`;
                return (
                  <div
                    key={room.id}
                    id={`room-${room.id}`}
                    className={`sidebar-item ${isActive ? 'active' : ''}`}
                    onClick={() => { router.push(`/chat/rooms/${room.id}`); setSidebarOpen(false); }}
                  >
                    <div className="avatar" style={{ width: 44, height: 44, background: 'var(--bg-tertiary)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, color: 'var(--accent)', fontWeight: 700 }}>
                      #
                    </div>
                    <div className="sidebar-item-info">
                      <div className="sidebar-item-name">{room.name}</div>
                      <div className="sidebar-item-preview">{room.description || 'Public channel'}</div>
                    </div>
                  </div>
                );
              })
            )
          )}
        </div>

        {/* Footer info */}
        {me && (
          <div className="sidebar-footer" onClick={() => setShowSettings(true)} style={{ cursor: 'pointer' }}>
            <AvatarSmall name={me.displayName} src={me.avatarUrl} size={36} status="online" />
            <div className="sidebar-footer-name">
              <div>{me.displayName}</div>
              <div style={{ fontSize: 10, color: 'var(--text-secondary)' }}>@{me.username}</div>
            </div>
            <div className="sidebar-footer-actions">
              <button className="btn btn-icon btn-ghost" title="Settings" style={{ fontSize: 16 }}>⚙️</button>
            </div>
          </div>
        )}
      </aside>

      {/* Main Content View */}
      <main className="chat-main">
        {children}
      </main>

      {/* On-Demand Username Search Modal */}
      <NewChatModal
        isOpen={showNewChat}
        onClose={() => setShowNewChat(false)}
        onSelectUser={startDM}
      />

      {/* Settings Modal */}
      {me && (
        <SettingsModal
          isOpen={showSettings}
          onClose={() => setShowSettings(false)}
          me={me}
          onUpdateMe={(updated) => {
            setMe(prev => prev ? { ...prev, ...updated } : prev);
          }}
          onLogout={logout}
        />
      )}

      {/* Create Room Modal */}
      {showNewRoom && (
        <div className="overlay" onClick={() => setShowNewRoom(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-title">Create Room</div>
            <form onSubmit={createRoom} className="auth-form" id="new-room-form">
              <div className="field">
                <label htmlFor="room-name-input">Room Name</label>
                <input id="room-name-input" value={newRoomName} onChange={e => setNewRoomName(e.target.value)} placeholder="e.g. general, gaming, tech" maxLength={30} required autoFocus />
              </div>
              <div className="field">
                <label htmlFor="room-desc-input">Description</label>
                <input id="room-desc-input" value={newRoomDesc} onChange={e => setNewRoomDesc(e.target.value)} placeholder="What is this channel about?" maxLength={100} />
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <button type="button" className="btn btn-secondary flex-1" onClick={() => setShowNewRoom(false)}>Cancel</button>
                <button id="create-room-submit" type="submit" className="btn btn-primary flex-1" disabled={creating || !newRoomName.trim()}>
                  {creating ? <span className="spinner" /> : 'Create Room'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
