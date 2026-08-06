export interface HubChannel {
  id: string;
  name: string;
  description: string;
}

export interface HubMessage {
  id: string;
  channelId: string;
  userId?: string | null;
  userName: string;
  userEmail: string;
  role: string;
  content: string;
  timestamp: Date;
}

export interface User {
  id: string;
  name: string;
  email: string;
  password: string;
  userType?: string | null;
  grade?: string | null;
  phone?: string | null;
  organization?: string | null;
  avatar?: string | null;
  createdAt: string;
}