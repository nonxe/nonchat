'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import type { Message, Room } from '@/lib/types';

interface Me { username: string; displayName: string; avatarUrl: string | null; }

function formatTime(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}
function formatDay(iso: string) {
  try {
    const d = new Date(iso);
    const today = new Date();
    if (d.toDateString() === today.toDateString()) return 'Today';
    const yest = new Date(); yest.setDate(today.getDate() - 1);
    if (d.toDateString() === yest.toDateString()) return 'Yesterday';
    return d.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' });
  } catch {
    return 'Today';
  }
}
function formatSize(bytes: number) {
  if (!bytes) return '';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1048576).toFixed(1) + ' MB';
}

function Avatar({ name, src, size = 28 }: { name: string; src?: string | null; size?: number }) {
  const initials = (name || 'U').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const colors = ['#0a84ff','#30d158','#ff9f0a','#bf5af2','#ff453a','#64d2ff'];
  const color = colors[(name || 'U').charCodeAt(0) % colors.length];
  return (
    <div className="avatar" style={{ width: size, height: size, minWidth: size, borderRadius: '50%' }}>
      {src ? <img src={src} alt={name} /> : (
        <span className="avatar-initials" style={{ fontSize: size * 0.4, background: color, width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%' }}>{initials}</span>
      )}
    </div>
  );
}

export default function RoomPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [room, setRoom] = useState<Room | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [optimisticMsgs, setOptimisticMsgs] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [viewImg, setViewImg] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d?.user) setMe(d.user);
      });
  }, []);

  useEffect(() => {
    if (!roomId) return;
    fetch('/api/rooms')
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        const found = (d?.rooms || []).find((r: Room) => r.id === roomId);
        if (found) setRoom(found);
      });
  }, [roomId]);

  const fetchMessages = useCallback(async () => {
    if (!roomId) return;
    try {
      const r = await fetch(`/api/rooms/${roomId}/messages`);
      if (r.ok) {
        const d = await r.json();
        setMessages(Array.isArray(d.messages) ? d.messages : []);
        setOptimisticMsgs([]);
      }
    } catch {}
  }, [roomId]);

  useEffect(() => { fetchMessages(); }, [fetchMessages]);
  useEffect(() => { const iv = setInterval(fetchMessages, 3000); return () => clearInterval(iv); }, [fetchMessages]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, optimisticMsgs]);

  function handleTextChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setText(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
  }

  async function send() {
    if ((!text.trim() && !uploadFile) || sending || uploading || !me) return;
    setSending(true);
    const now = new Date().toISOString();
    const optimistic: Message = {
      id: `opt-${Date.now()}`,
      conversationId: roomId,
      senderId: me.username,
      senderName: me.displayName,
      senderAvatar: me.avatarUrl,
      content: text.trim() || (uploadFile ? `[${uploadFile.type.startsWith('image/') ? 'Photo' : 'File'}]` : null),
      mediaUrl: uploadFile ? URL.createObjectURL(uploadFile) : null,
      mediaType: uploadFile ? (uploadFile.type.startsWith('image/') ? 'image' : uploadFile.type.startsWith('video/') ? 'video' : 'file') : null,
      mediaName: uploadFile?.name || null,
      mediaSize: uploadFile?.size || null,
      timestamp: now,
      status: 'sent',
    };
    setOptimisticMsgs(p => [...p, optimistic]);
    const sentText = text.trim();
    setText('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';

    try {
      let mediaUrl = null, mediaType = null, mediaName = null, mediaSize = null;
      if (uploadFile) {
        setUploading(true);
        const fd = new FormData();
        fd.append('file', uploadFile);
        const prog = setInterval(() => setUploadProgress(p => Math.min(p + 15, 90)), 150);
        const upRes = await fetch('/api/upload', { method: 'POST', body: fd });
        clearInterval(prog);
        setUploadProgress(100);
        if (upRes.ok) {
          const u = await upRes.json();
          mediaUrl = u.url;
          mediaType = u.mediaType;
          mediaName = u.mediaName;
          mediaSize = u.mediaSize;
        } else {
          alert('Upload failed. Please try again.');
          setUploading(false);
          setUploadFile(null);
          setUploadProgress(0);
          setSending(false);
          setOptimisticMsgs(p => p.filter(m => m.id !== optimistic.id));
          return;
        }
        setUploading(false);
        setUploadFile(null);
        setUploadProgress(0);
      }
      await fetch(`/api/rooms/${roomId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: sentText || null, mediaUrl, mediaType, mediaName, mediaSize }),
      });
      await fetchMessages();
    } catch {
      setOptimisticMsgs(p => p.filter(m => m.id !== optimistic.id));
    } finally {
      setSending(false);
    }
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 15 * 1024 * 1024) { alert('File too large. Maximum 15MB allowed.'); return; }
    setUploadFile(file);
    e.target.value = '';
  }

  const allMessages = [...messages, ...optimisticMsgs];
  const grouped: { day: string; msgs: Message[] }[] = [];
  allMessages.forEach(msg => {
    const day = formatDay(msg.timestamp);
    const last = grouped[grouped.length - 1];
    if (last?.day === day) last.msgs.push(msg);
    else grouped.push({ day, msgs: [msg] });
  });

  return (
    <>
      <div className="chat-header">
        <button
          className="btn btn-icon btn-ghost mobile-back-btn"
          onClick={() => router.push('/chat')}
          title="Back to chats"
          style={{ fontSize: 18, color: 'var(--accent)', marginRight: 2 }}
        >
          ←
        </button>
        <div style={{ width: 38, height: 38, background: 'var(--bg-elevated)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0, color: 'var(--accent)', fontWeight: 700 }}>#</div>
        <div className="chat-header-info">
          <div className="chat-header-name">{room?.name || 'Public Room'}</div>
          {room?.description && <div className="chat-header-sub">{room.description}</div>}
        </div>
      </div>

      <div className="messages-container" id="room-messages-list">
        {allMessages.length === 0 && (
          <div className="empty-state" style={{ flex: 1 }}>
            <div className="empty-state-icon">🏠</div>
            <div className="empty-state-title">Welcome to #{room?.name || 'this channel'}!</div>
            <div className="empty-state-sub">Public channel on AS CLOUD. Be the first to start the discussion.</div>
          </div>
        )}

        {grouped.map(({ day, msgs }) => (
          <div key={day}>
            <div className="message-day-divider"><span className="message-day-label">{day}</span></div>
            {msgs.map((msg, i) => {
              const isOut = msg.senderId === me?.username;
              const prev = msgs[i - 1];
              const isCompact = prev && prev.senderId === msg.senderId &&
                (new Date(msg.timestamp).getTime() - new Date(prev.timestamp).getTime()) < 60000;

              return (
                <div key={msg.id} id={`room-msg-${msg.id}`} className={`message-row ${isOut ? 'outgoing' : ''} ${isCompact ? 'compact' : 'spaced'}`}>
                  <div className="message-avatar-slot">
                    {!isOut && !isCompact && <Avatar name={msg.senderName} src={msg.senderAvatar} size={28} />}
                  </div>
                  <div className={`bubble ${isOut ? 'outgoing' : 'incoming'}`}>
                    {!isOut && !isCompact && <span className="bubble-sender">{msg.senderName}</span>}
                    {msg.mediaType === 'image' && msg.mediaUrl ? (
                      <>
                        <div className="bubble-image" onClick={() => setViewImg(msg.mediaUrl)}>
                          <img src={msg.mediaUrl} alt={msg.mediaName || 'Photo'} loading="lazy" />
                        </div>
                        {msg.content && <div className="bubble-text" style={{ padding: '8px 12px 4px' }}>{msg.content}</div>}
                        <div className="bubble-time">{formatTime(msg.timestamp)}{isOut && <span className="check-icon read">✓✓</span>}</div>
                      </>
                    ) : msg.mediaType === 'video' && msg.mediaUrl ? (
                      <>
                        <div className="bubble-video"><video controls src={msg.mediaUrl} style={{ width: '100%', borderRadius: 12 }} /></div>
                        {msg.content && <div className="bubble-text" style={{ padding: '8px 12px 4px' }}>{msg.content}</div>}
                        <div className="bubble-time">{formatTime(msg.timestamp)}</div>
                      </>
                    ) : msg.mediaType === 'file' && msg.mediaUrl ? (
                      <>
                        <a href={msg.mediaUrl} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', color: 'inherit' }}>
                          <div className="bubble-file" style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 10, padding: '8px 10px', display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div className="bubble-file-icon" style={{ fontSize: 20 }}>📁</div>
                            <div className="bubble-file-info" style={{ flex: 1, minWidth: 0 }}>
                              <div className="bubble-file-name" style={{ fontWeight: 600, fontSize: 13, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{msg.mediaName || 'Download File'}</div>
                              <div className="bubble-file-size" style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{formatSize(msg.mediaSize || 0)}</div>
                            </div>
                            <span style={{ fontSize: 14, color: 'var(--accent)' }}>⬇</span>
                          </div>
                        </a>
                        {msg.content && <div className="bubble-text" style={{ marginTop: 4 }}>{msg.content}</div>}
                        <div className="bubble-time">{formatTime(msg.timestamp)}</div>
                      </>
                    ) : (
                      <>
                        <div className="bubble-text">{msg.content}</div>
                        <div className="bubble-time">{formatTime(msg.timestamp)}{isOut && <span className="check-icon read">✓✓</span>}</div>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {viewImg && (
        <div className="image-viewer" onClick={() => setViewImg(null)}>
          <button className="image-viewer-close" onClick={() => setViewImg(null)}>✕</button>
          <img src={viewImg} alt="Full view" onClick={e => e.stopPropagation()} />
        </div>
      )}

      <div className="input-area">
        {uploadFile && (
          <div className="upload-preview" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--separator)', padding: '8px 12px', borderRadius: 12, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
            {uploadFile.type.startsWith('image/') ? (
              <img className="upload-preview-thumb" src={URL.createObjectURL(uploadFile)} alt="preview" style={{ width: 44, height: 44, borderRadius: 8, objectFit: 'cover' }} />
            ) : (
              <div style={{ width: 44, height: 44, borderRadius: 8, background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>📁</div>
            )}
            <div className="upload-preview-info" style={{ flex: 1, minWidth: 0 }}>
              <div className="upload-preview-name" style={{ fontWeight: 600, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{uploadFile.name}</div>
              <div className="upload-preview-size" style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{formatSize(uploadFile.size)}</div>
              {uploading && (
                <div className="upload-progress" style={{ height: 3, background: 'var(--bg-elevated)', borderRadius: 2, marginTop: 4, overflow: 'hidden' }}>
                  <div className="upload-progress-bar" style={{ width: `${uploadProgress}%`, height: '100%', background: 'var(--accent)', transition: 'width 0.2s ease' }} />
                </div>
              )}
            </div>
            {!uploading && <button onClick={() => setUploadFile(null)} className="btn btn-icon btn-ghost" style={{ fontSize: 16 }}>✕</button>}
          </div>
        )}
        <div className="input-row" style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg-secondary)', borderRadius: 24, padding: '6px 8px 6px 14px' }}>
          <input ref={fileRef} type="file" accept="image/*,video/*,.pdf,.doc,.docx,.zip,.txt" style={{ display: 'none' }} id="room-file-input" onChange={handleFileChange} />
          <button className="input-btn" onClick={() => fileRef.current?.click()} id="room-attach-btn" style={{ fontSize: 20, color: 'var(--text-secondary)' }}>📎</button>
          <textarea ref={textareaRef} id="room-message-input" className="input-textarea" value={text} onChange={handleTextChange} onKeyDown={handleKey} placeholder={`Message #${room?.name || 'channel'}…`} rows={1} style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: 'var(--text-primary)', fontSize: 15, resize: 'none', maxHeight: 120 }} />
          <button id="room-send-btn" className="send-btn" onClick={send} disabled={(!text.trim() && !uploadFile) || sending || uploading} style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--accent)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: 'pointer', flexShrink: 0 }}>
            {sending || uploading ? <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </>
  );
}
