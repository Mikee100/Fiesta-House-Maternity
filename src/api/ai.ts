import api from './apiInstance';

export interface AIResponse {
  id: string;
  query: string;
  response: string;
  confidence: number;
  timestamp: string;
}

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ConversationResponse {
  response: string;
  draft: any;
  updatedHistory: ConversationMessage[];
}

export const listAIResponses = async (params?: {
  page?: number;
  limit?: number;
}): Promise<{ responses: AIResponse[]; total: number }> => {
  const response = await api.get('/ai/responses', { params });
  return response.data;
};

export const getAIResponse = async (id: string): Promise<AIResponse> => {
  const response = await api.get(`/ai/responses/${id}`);
  return response.data;
};

export const createAIResponse = async (query: string): Promise<AIResponse> => {
  const response = await api.post('/ai/query', { query });
  return response.data;
};

export const updateAIResponse = async (id: string, responseData: Partial<AIResponse>): Promise<AIResponse> => {
  const response = await api.put(`/ai/responses/${id}`, responseData);
  return response.data;
};

export const sendConversationMessage = async (
  message: string,
  customerId: string,
  history: ConversationMessage[]
): Promise<ConversationResponse> => {
  const response = await api.post('/ai/conversation', { message, customerId, history }, { timeout: 30000 });
  return response.data;
};
