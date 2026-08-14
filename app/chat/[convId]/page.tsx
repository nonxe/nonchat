'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'next/navigation';
import type { Message, PublicUser } from '@/lib/types';

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

function BubbleContent({ msg, isOut }: { msg: Message; isOut: boolean }) {
  const [viewImg, setViewImg] = useState(false);
  if (msg.mediaType === 'image' && msg.mediaUrl) {
    return (
      <>
        <div className="bubble-image" onClick={() => setViewImg(true)}>
          <img src={msg.mediaUrl} alt={msg.mediaName || 'image'} loading="lazy" />
          {msg.content && <div className="bubble-text" style={{ padding: '8px 13px' }}>{msg.content}</div>}
          <div className="bubble-time" style={{ padding: '0 13px 8px' }}>
            {formatTime(msg.timestamp)}
            {isOut && <span className="check-icon">✓✓</span>}
          </div>
        </div>
        {viewImg && (
          <div className="image-viewer" onClick={() => setViewImg(false)}>
            <button className="image-viewer-close" onClick={() => setViewImg(false)}>✕</button>
            <img src={msg.mediaUrl!} alt={msg.mediaName || 'image'} onClick={e => e.stopPropagation()} />
          </div>
        )}
      </>
    );
  }
  if (msg.mediaType === 'video' && msg.mediaUrl) {
    return (
      <div className="bubble-video">
        <video controls src={msg.mediaUrl} />
        {msg.content && <div className="bubble-text" style={{ padding: '8px 13px' }}>{msg.content}</div>}
        <div className="bubble-time" style={{ padding: '0 13px 8px' }}>{formatTime(msg.timestamp)}</div>
      </div>
    );
  }
  if (msg.mediaType === 'file' && msg.mediaUrl) {
    return (
      <>
        <a href={msg.mediaUrl} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div className="bubble-file">
            <div className="bubble-file-icon">📎</div>
            <div className="bubble-file-info">
              <div className="bubble-file-name">{msg.mediaName || 'File'}</div>
              <div className="bubble-file-size">{msg.mediaSize ? formatSize(msg.mediaSize) : ''}</div>
            </div>
          </div>
        </a>
        <div className="bubble-time">{formatTime(msg.timestamp)}{isOut && <span className="check-icon">✓✓</span>}</div>
      </>
    );
  }
  return (
    <>
      <div className="bubble-text">{msg.content}</div>
      <div className="bubble-time">{formatTime(msg.timestamp)}{isOut && <span className="check-icon">✓✓</span>}</div>
    </>
  );
}

export default function ConversationPage() {
  const { convId } = useParams<{ convId: string }>();
  const [me, setMe] = useState<Me | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [other, setOther] = useState<PublicUser | null>(null);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [optimisticMsgs, setOptimisticMsgs] = useState<Message[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Get current logged-in user
  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d?.user) setMe(d.user);
      });
  }, []);

  // Get other user info
  useEffect(() => {
    if (!me || !convId) return;
    fetch('/api/conversations')
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        const conv = (d?.conversations || []).find((c: any) => c.id === convId);
        if (conv) {
          const otherUsername = conv.participants.find((p: string) => p !== me.username);
          if (otherUsername) {
            fetch(`/api/users/${otherUsername}`)
              .then(r => r.ok ? r.json() : null)
              .then(ud => {
                if (ud?.user) setOther(ud.user as PublicUser);
              });
          }
        }
      });
  }, [me, convId]);

  const fetchMessages = useCallback(async () => {
    if (!convId) return;
    try {
      const r = await fetch(`/api/conversations/${convId}/messages`);
      if (r.ok) {
        const d = await r.json();
        setMessages(Array.isArray(d.messages) ? d.messages : []);
        setOptimisticMsgs([]);
      }
    } catch {}
  }, [convId]);

  useEffect(() => { fetchMessages(); }, [fetchMessages]);

  // Poll for new messages every 3s
  useEffect(() => {
    const iv = setInterval(fetchMessages, 3000);
    return () => clearInterval(iv);
  }, [fetchMessages]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, optimisticMsgs]);

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
      conversationId: convId,
      senderId: me.username,
      senderName: me.displayName,
      senderAvatar: me.avatarUrl,
      content: text.trim() || null,
      mediaUrl: null,
      mediaType: null,
      mediaName: null,
      mediaSize: null,
      timestamp: now,
      status: 'sent',
    };
    setOptimisticMsgs(p => [...p, optimistic]);
    const sentText = text.trim();
    setText('');
    if (textareaRef.current) { textareaRef.current.style.height = 'auto'; }

    try {
      let mediaUrl = null, mediaType = null, mediaName = null, mediaSize = null;

      if (uploadFile) {
        setUploading(true);
        const fd = new FormData();
        fd.append('file', uploadFile);
        const prog = setInterval(() => setUploadProgress(p => Math.min(p + 15, 90)), 200);
        const upRes = await fetch('/api/upload', { method: 'POST', body: fd });
        clearInterval(prog);
        setUploadProgress(100);
        if (upRes.ok) {
          const upData = await upRes.json();
          mediaUrl = upData.url;
          mediaType = upData.mediaType;
          mediaName = upData.mediaName;
          mediaSize = upData.mediaSize;
        }
        setUploading(false);
        setUploadFile(null);
        setUploadProgress(0);
      }

      await fetch(`/api/conversations/${convId}/messages`, {
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
      {/* Chat header */}
      <div className="chat-header">
        {other ? (
          <>
            <Avatar name={other.displayName} src={other.avatarUrl} size={38} />
            <div className="chat-header-info">
              <div className="chat-header-name">{other.displayName}</div>
              <div className="chat-header-sub" style={{ color: other.status === 'online' ? 'var(--accent-green)' : 'var(--text-secondary)' }}>
                {other.status === 'online' ? '● Active now' : '○ Offline'}
              </div>
            </div>
          </>
        ) : (
          <div className="chat-header-name" style={{ color: 'var(--text-secondary)' }}>Chat</div>
        )}
      </div>

      {/* Messages list */}
      <div className="messages-container" id="messages-list">
        {allMessages.length === 0 && (
          <div className="empty-state" style={{ flex: 1 }}>
            <div className="empty-state-icon">👋</div>
            <div className="empty-state-title">Say hello!</div>
            <div className="empty-state-sub">Start the conversation with {other?.displayName || 'your friend'}.</div>
          </div>
        )}

        {grouped.map(({ day, msgs }) => (
          <div key={day}>
            <div className="message-day-divider">
              <span className="message-day-label">{day}</span>
            </div>
            {msgs.map((msg, i) => {
              const isOut = msg.senderId === me?.username;
              const prevMsg = msgs[i - 1];
              const isCompact = prevMsg && prevMsg.senderId === msg.senderId &&
                (new Date(msg.timestamp).getTime() - new Date(prevMsg.timestamp).getTime()) < 60000;

              return (
                <div key={msg.id} id={`msg-${msg.id}`} className={`message-row ${isOut ? 'outgoing' : ''} ${isCompact ? 'compact' : 'spaced'}`}>
                  <div className="message-avatar-slot">
                    {!isOut && !isCompact && <Avatar name={msg.senderName} src={msg.senderAvatar} size={28} />}
                  </div>
                  <div className={`bubble ${isOut ? 'outgoing' : 'incoming'}`}>
                    {!isOut && !isCompact && <span className="bubble-sender">{msg.senderName}</span>}
                    <BubbleContent msg={msg} isOut={isOut} />
                  </div>
                </div>
              );
            })}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div className="input-area">
        {uploadFile && (
          <div className="upload-preview">
            {uploadFile.type.startsWith('image/') && (
              <img className="upload-preview-thumb" src={URL.createObjectURL(uploadFile)} alt="preview" />
            )}
            <div className="upload-preview-info">
              <div className="upload-preview-name">{uploadFile.name}</div>
              <div className="upload-preview-size">{formatSize(uploadFile.size)}</div>
              {uploading && (
                <div className="upload-progress">
                  <div className="upload-progress-bar" style={{ width: `${uploadProgress}%` }} />
                </div>
              )}
            </div>
            {!uploading && (
              <button onClick={() => setUploadFile(null)} className="btn btn-icon btn-ghost" style={{ fontSize: 16 }}>✕</button>
            )}
          </div>
        )}

        <div className="input-row">
          <input ref={fileRef} type="file" accept="image/*,video/*,.pdf,.doc,.docx,.zip,.txt" style={{ display: 'none' }} id="file-input" onChange={handleFileChange} />
          <button className="input-btn" onClick={() => fileRef.current?.click()} id="attach-btn" title="Attach file">
            📎
          </button>
          <textarea
            ref={textareaRef}
            id="message-input"
            className="input-textarea"
            value={text}
            onChange={handleTextChange}
            onKeyDown={handleKey}
            placeholder="Message…"
            rows={1}
          />
          <div className="input-actions">
            <button
              id="send-btn"
              className="send-btn"
              onClick={send}
              disabled={(!text.trim() && !uploadFile) || sending || uploading}
              title="Send"
            >
              {sending || uploading ? <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
