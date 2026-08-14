export interface User {
  username: string;
  displayName: string;
  bio: string;
  avatarUrl: string | null;
  createdAt: string;
  status: 'online' | 'offline' | 'away';
  lastSeen: string;
}

export interface UserWithHash extends User {
  passwordHash: string;
}

export interface PublicUser {
  username: string;
  displayName: string;
  avatarUrl: string | null;
  status: 'online' | 'offline' | 'away';
  lastSeen: string;
}

export type MessageType = 'text' | 'image' | 'video' | 'file';

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderAvatar: string | null;
  content: string | null;
  mediaUrl: string | null;
  mediaType: MessageType | null;
  mediaName: string | null;
  mediaSize: number | null;
  timestamp: string;
  status: 'sent' | 'delivered' | 'read';
}

export interface Conversation {
  id: string;
  type: 'dm' | 'room';
  participants: string[]; // usernames
  createdAt: string;
  updatedAt: string;
  lastMessage: string | null;
  lastMessageAt: string | null;
  unreadCount?: number;
}

export interface Room {
  id: string;
  name: string;
  description: string;
  createdBy: string;
  createdAt: string;
  memberCount: number;
  avatarUrl: string | null;
  isPublic: boolean;
}

export interface AuthPayload {
  username: string;
  displayName: string;
  avatarUrl: string | null;
  iat: number;
  exp: number;
}

export interface ApiResponse<T> {
  data?: T;
  error?: string;
}
