'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ChatIndex() {
  const router = useRouter();
  // No redirect needed; show empty state on desktop
  return (
    <div className="no-chat" style={{ flex: 1, height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
        <div className="no-chat-logo" style={{ fontSize: 52, fontWeight: 900, letterSpacing: -3, color: 'var(--text-tertiary)' }}>
          NON<span style={{ color: 'var(--accent)', opacity: 0.4 }}>CHAT</span>
        </div>
        <p className="no-chat-sub" style={{ color: 'var(--text-tertiary)', fontSize: 'var(--text-sm)', textAlign: 'center' }}>
          Select a conversation or find someone to message
        </p>
        <p className="no-chat-tag" style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 500, letterSpacing: 0.5, textTransform: 'uppercase', opacity: 0.4, marginTop: 8 }}>
          NONCHAT primarily runs on AS CLOUD HOST
        </p>
      </div>
    </div>
  );
}
