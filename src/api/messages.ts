import api from './apiInstance';

export interface Message {
  id: string;
  conversationId: string;
  content: string;
  sender: 'user' | 'bot';
  timestamp: string;
  platform: 'whatsapp' | 'instagram' | 'messenger' | 'telegram';
}

export const listMessages = async (conversationId: string, params?: {
  page?: number;
  limit?: number;
}): Promise<{ messages: Message[]; total: number }> => {
  const response = await api.get(`/conversations/${conversationId}/messages`, { params });
  return response.data;
};

export const getMessage = async (id: string): Promise<Message> => {
  const response = await api.get(`/messages/${id}`);
  return response.data;
};

export const createMessage = async (messageData: Omit<Message, 'id' | 'timestamp'>): Promise<Message> => {
  const response = await api.post('/messages', messageData);
  return response.data;
};

export const updateMessage = async (id: string, messageData: Partial<Message>): Promise<Message> => {
  const response = await api.put(`/messages/${id}`, messageData);
  return response.data;
};
