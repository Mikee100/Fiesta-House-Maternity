import api from './apiInstance';

export interface KnowledgeBaseItem {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export const listKnowledgeBase = async (params?: {
  category?: string;
  search?: string;
  page?: number;
  limit?: number;
}): Promise<{ items: KnowledgeBaseItem[]; total: number }> => {
  const response = await api.get('/knowledge-base', { params });
  return response.data;
};

export const getKnowledgeBaseItem = async (id: string): Promise<KnowledgeBaseItem> => {
  const response = await api.get(`/knowledge-base/${id}`);
  return response.data;
};

export const createKnowledgeBaseItem = async (itemData: Omit<KnowledgeBaseItem, 'id' | 'createdAt' | 'updatedAt'>): Promise<KnowledgeBaseItem> => {
  const response = await api.post('/knowledge-base', itemData);
  return response.data;
};

export const updateKnowledgeBaseItem = async (id: string, itemData: Partial<KnowledgeBaseItem>): Promise<KnowledgeBaseItem> => {
  const response = await api.put(`/knowledge-base/${id}`, itemData);
  return response.data;
};
