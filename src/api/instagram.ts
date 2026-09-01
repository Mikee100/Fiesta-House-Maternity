import api from './apiInstance';

export interface InstagramSettings {
  businessAccountId: string;
  accessToken: string;
  verifyToken: string;
  webhookUrl: string;
}

export interface InstagramMessage {
  id: string;
  from: string;
  to: string;
  content: string;
  timestamp: string;
  direction: 'inbound' | 'outbound';
  customerId?: string;
  customerName?: string;
}

export interface InstagramConversation {
  customerId: string;
  customerName: string;
  instagramId: string;
  latestMessage: string;
  latestTimestamp: string;
  unreadCount: number;
}

export const getInstagramSettings = async (): Promise<InstagramSettings> => {
  const response = await api.get('/instagram/settings');
  return response.data;
};

export const updateInstagramSettings = async (settings: InstagramSettings): Promise<InstagramSettings> => {
  const response = await api.put('/instagram/settings', settings);
  return response.data;
};

export const testInstagramConnection = async (): Promise<{ success: boolean; message: string }> => {
  const response = await api.post('/instagram/test-connection');
  return response.data;
};

export const sendInstagramMessage = async (to: string, message: string): Promise<InstagramMessage> => {
  const response = await api.post('/instagram/send', { to, message });
  return response.data;
};

export const getInstagramMessages = async (params?: {
  page?: number;
  limit?: number;
  direction?: 'inbound' | 'outbound';
  customerId?: string;
}): Promise<{ messages: InstagramMessage[]; total: number }> => {
  const response = await api.get('/instagram/messages', { params });
  return response.data;
};

export const verifyInstagramWebhook = async (mode: string, challenge: string, token: string): Promise<string> => {
  const response = await api.get('/webhooks/instagram', {
    params: { 'hub.mode': mode, 'hub.challenge': challenge, 'hub.verify_token': token }
  });
  return response.data;
};

export const handleInstagramWebhook = async (body: any): Promise<{ status: string }> => {
  const response = await api.post('/webhooks/instagram', body);
  return response.data;
};

export const getInstagramConversations = async (): Promise<{ conversations: InstagramConversation[]; total: number }> => {
  const response = await api.get('/instagram/conversations');
  return response.data;
};
