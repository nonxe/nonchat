'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import type { Conversation, Room, PublicUser } from '@/lib/types';

interface Me { username: string; displayName: string; avatarUrl: string | null; }

function AvatarSmall({ name, src, size = 36, status }: { name: string; src?: string | null; size?: number; status?: string }) {
  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const colors = ['#0a84ff','#30d158','#ff9f0a','#bf5af2','#ff453a','#64d2ff'];
  const color = colors[name.charCodeAt(0) % colors.length];
  return (
    <div className="avatar" style={{ width: size, height: size, minWidth: size }}>
      {src ? <img src={src} alt={name} /> : (
        <span className="avatar-initials" style={{ fontSize: size * 0.38, background: color, width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%' }}>{initials}</span>
      )}
      {status && <span className={`avatar-status ${status}`} />}
    </div>
  );
}

function timeAgo(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diff = Math.floor((now.getTime() - d.getTime()) / 1000);
  if (diff < 60) return 'now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [me, setMe] = useState<Me | null>(null);
  const [tab, setTab] = useState<'dms' | 'rooms' | 'people'>('dms');
  const [convos, setConvos] = useState<Conversation[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [people, setPeople] = useState<PublicUser[]>([]);
  const [search, setSearch] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showNewRoom, setShowNewRoom] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomDesc, setNewRoomDesc] = useState('');
  const [creating, setCreating] = useState(false);

  // Fetch current user
  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(d => {
      if (d.user) setMe(d.user);
      else router.push('/auth/login');
    }).catch(() => router.push('/auth/login'));
  }, [router]);

  // Fetch conversations
  const fetchConvos = useCallback(async () => {
    const r = await fetch('/api/conversations');
    if (r.ok) { const d = await r.json(); setConvos(d.conversations || []); }
  }, []);

  // Fetch rooms
  const fetchRooms = useCallback(async () => {
    const r = await fetch('/api/rooms');
    if (r.ok) { const d = await r.json(); setRooms(d.rooms || []); }
  }, []);

  // Fetch people
  const fetchPeople = useCallback(async () => {
    const r = await fetch('/api/users');
    if (r.ok) { const d = await r.json(); setPeople(d.users || []); }
  }, []);

  useEffect(() => { fetchConvos(); fetchRooms(); fetchPeople(); }, [fetchConvos, fetchRooms, fetchPeople]);

  // Poll every 5s
  useEffect(() => {
    const iv = setInterval(() => { fetchConvos(); fetchRooms(); }, 5000);
    return () => clearInterval(iv);
  }, [fetchConvos, fetchRooms]);

  async function startDM(username: string) {
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
  }

  async function createRoom(e: React.FormEvent) {
    e.preventDefault();
    if (!newRoomName.trim()) return;
    setCreating(true);
    const res = await fetch('/api/rooms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newRoomName, description: newRoomDesc }),
    });
    if (res.ok) {
      const d = await res.json();
      fetchRooms();
      setShowNewRoom(false);
      setNewRoomName(''); setNewRoomDesc('');
      router.push(`/chat/rooms/${d.room.id}`);
      setSidebarOpen(false);
    }
    setCreating(false);
  }

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/auth/login');
  }

  function otherParticipant(conv: Conversation): string {
    return conv.participants.find(p => p !== me?.username) || conv.participants[0];
  }

  const filteredConvos = convos.filter(c => {
    const other = otherParticipant(c);
    const person = people.find(p => p.username === other);
    return !search || other.includes(search.toLowerCase()) || person?.displayName.toLowerCase().includes(search.toLowerCase());
  }).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  const filteredRooms = rooms.filter(r => !search || r.name.toLowerCase().includes(search.toLowerCase()));
  const filteredPeople = people.filter(p => p.username !== me?.username && (!search || p.username.includes(search.toLowerCase()) || p.displayName.toLowerCase().includes(search.toLowerCase())));

  return (
    <div className="app-shell">
      {/* Sidebar overlay for mobile */}
      {sidebarOpen && (
        <div onClick={() => setSidebarOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 49 }} />
      )}

      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        {/* Header */}
        <div className="sidebar-header">
          <span className="sidebar-brand">NON<span>CHAT</span></span>
          <div style={{ display: 'flex', gap: 4 }}>
            {tab === 'rooms' && (
              <button id="new-room-btn" className="btn btn-icon btn-ghost" onClick={() => setShowNewRoom(true)} title="New Room">＋</button>
            )}
            <Link href="/profile">
              <button className="btn btn-icon btn-ghost" title="Profile" id="profile-btn">👤</button>
            </Link>
          </div>
        </div>

        {/* Search */}
        <div className="sidebar-search">
          <input
            id="sidebar-search"
            type="search"
            placeholder={tab === 'dms' ? 'Search messages…' : tab === 'rooms' ? 'Search rooms…' : 'Find people…'}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Tabs */}
        <div className="sidebar-tabs">
          {(['dms','rooms','people'] as const).map(t => (
            <button key={t} id={`tab-${t}`} className={`sidebar-tab ${tab === t ? 'active' : ''}`} onClick={() => { setTab(t); setSearch(''); }}>
              {t === 'dms' ? 'DMs' : t === 'rooms' ? 'Rooms' : 'People'}
            </button>
          ))}
        </div>

        {/* List */}
        <div className="sidebar-list">
          {tab === 'dms' && (
            filteredConvos.length === 0
              ? <div className="empty-state" style={{ padding: '40px 16px' }}>
                  <div className="empty-state-icon">💬</div>
                  <p className="empty-state-sub">No conversations yet.<br />Find people to start chatting.</p>
                </div>
              : filteredConvos.map(conv => {
                  const other = otherParticipant(conv);
                  const person = people.find(p => p.username === other);
                  const isActive = pathname === `/chat/${conv.id}`;
                  return (
                    <div key={conv.id} id={`conv-${conv.id}`} className={`sidebar-item ${isActive ? 'active' : ''}`}
                      onClick={() => { router.push(`/chat/${conv.id}`); setSidebarOpen(false); }}>
                      <AvatarSmall name={person?.displayName || other} src={person?.avatarUrl} size={40} status={person?.status} />
                      <div className="sidebar-item-info">
                        <div className="sidebar-item-name">{person?.displayName || other}</div>
                        <div className="sidebar-item-preview">{conv.lastMessage || 'No messages yet'}</div>
                      </div>
                      {conv.lastMessageAt && <div className="sidebar-item-time">{timeAgo(conv.lastMessageAt)}</div>}
                    </div>
                  );
                })
          )}

          {tab === 'rooms' && (
            filteredRooms.length === 0
              ? <div className="empty-state" style={{ padding: '40px 16px' }}>
                  <div className="empty-state-icon">🏠</div>
                  <p className="empty-state-sub">No rooms yet.<br />Create one with ＋ above.</p>
                </div>
              : filteredRooms.map(room => {
                  const isActive = pathname === `/chat/rooms/${room.id}`;
                  return (
                    <div key={room.id} id={`room-${room.id}`} className={`sidebar-item ${isActive ? 'active' : ''}`}
                      onClick={() => { router.push(`/chat/rooms/${room.id}`); setSidebarOpen(false); }}>
                      <div className="avatar" style={{ width: 40, height: 40, background: '#2c2c2e', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
                        #
                      </div>
                      <div className="sidebar-item-info">
                        <div className="sidebar-item-name">{room.name}</div>
                        <div className="sidebar-item-preview">{room.description || 'Public room'}</div>
                      </div>
                    </div>
                  );
                })
          )}

          {tab === 'people' && (
            filteredPeople.length === 0
              ? <div className="empty-state" style={{ padding: '40px 16px' }}>
                  <div className="empty-state-icon">👥</div>
                  <p className="empty-state-sub">No users found.</p>
                </div>
              : filteredPeople.map(person => (
                  <div key={person.username} id={`person-${person.username}`} className="sidebar-item"
                    onClick={() => startDM(person.username)}>
                    <AvatarSmall name={person.displayName} src={person.avatarUrl} size={40} status={person.status} />
                    <div className="sidebar-item-info">
                      <div className="sidebar-item-name">{person.displayName}</div>
                      <div className="sidebar-item-preview">@{person.username}</div>
                    </div>
                  </div>
                ))
          )}
        </div>

        {/* Footer */}
        {me && (
          <div className="sidebar-footer">
            <AvatarSmall name={me.displayName} src={me.avatarUrl} size={32} status="online" />
            <span className="sidebar-footer-name">{me.displayName}</span>
            <div className="sidebar-footer-actions">
              <button id="logout-btn" className="btn btn-icon btn-ghost" onClick={logout} title="Sign out" style={{ fontSize: 16 }}>⏻</button>
            </div>
          </div>
        )}
      </aside>

      {/* Main */}
      <main className="chat-main">
        {/* Mobile header toggle */}
        <div style={{ display: 'none' }} id="mobile-header" />
        {children}
      </main>

      {/* New Room Modal */}
      {showNewRoom && (
        <div className="overlay" onClick={() => setShowNewRoom(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-title">New Room</div>
            <form onSubmit={createRoom} className="auth-form" id="new-room-form">
              <div className="field">
                <label htmlFor="room-name-input">Room Name</label>
                <input id="room-name-input" value={newRoomName} onChange={e => setNewRoomName(e.target.value)} placeholder="e.g. general" maxLength={30} required autoFocus />
              </div>
              <div className="field">
                <label htmlFor="room-desc-input">Description</label>
                <input id="room-desc-input" value={newRoomDesc} onChange={e => setNewRoomDesc(e.target.value)} placeholder="Optional" maxLength={100} />
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <button type="button" className="btn btn-secondary flex-1" onClick={() => setShowNewRoom(false)}>Cancel</button>
                <button id="create-room-submit" type="submit" className="btn btn-primary flex-1" disabled={creating || !newRoomName.trim()}>
                  {creating ? <span className="spinner" /> : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
