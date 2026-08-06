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