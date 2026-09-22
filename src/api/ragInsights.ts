import axios from 'axios';

import { API_BASE_URL } from '@/config';
import { KBEntry } from '@/api/knowledgeBase';

export interface ConversationLearningRow {
  id: string;
  customerId: string;
  userMessage: string;
  aiResponse: string;
  extractedIntent: string;
  detectedEmotionalTone?: string | null;
  wasSuccessful: boolean;
  conversationOutcome?: string | null;
  shouldAddToKB: boolean;
  newKnowledgeExtracted?: string | null;
  category?: string | null;
  conversationLength: number;
  timeToResolution?: number | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
  likelyIncorrect?: boolean;
  likelyIncorrectScore?: number;
  likelyIncorrectReasons?: string[];
}

interface RecentLearningResponse {
  items?: ConversationLearningRow[];
  count?: number;
  limit?: number;
  source?: string;
}

function normalizeLearningRow(row: ConversationLearningRow): ConversationLearningRow {
  const metadata = row.metadata && typeof row.metadata === 'object' && !Array.isArray(row.metadata)
    ? row.metadata
    : {};

  return {
    ...row,
    likelyIncorrect: row.likelyIncorrect ?? Boolean(metadata.likelyIncorrect),
    likelyIncorrectScore: row.likelyIncorrectScore ?? (typeof metadata.likelyIncorrectScore === 'number' ? metadata.likelyIncorrectScore : undefined),
    likelyIncorrectReasons: row.likelyIncorrectReasons ?? (Array.isArray(metadata.likelyIncorrectReasons) ? metadata.likelyIncorrectReasons.filter((item): item is string => typeof item === 'string') : undefined),
  };
}

function normalizeLearningResponse(data: RecentLearningResponse | ConversationLearningRow[]): ConversationLearningRow[] {
  const rows = Array.isArray(data) ? data : data.items;
  return Array.isArray(rows) ? rows.map(normalizeLearningRow) : [];
}

export const ragInsightsApi = {
  getKnowledge: async () => {
    const response = await axios.get<{ items: KBEntry[]; total: number }>(`${API_BASE_URL}/api/knowledge-base`);
    return response.data;
  },

  getRecentLearning: async (limit = 100) => {
    const response = await axios.get<RecentLearningResponse | ConversationLearningRow[]>(`${API_BASE_URL}/api/analytics/conversation-learning/recent`, {
      params: { limit },
    });
    return normalizeLearningResponse(response.data);
  },

  createKnowledgeEntry: async (entry: { question: string; answer: string; category: string }) => {
    const response = await axios.post(`${API_BASE_URL}/api/knowledge-base`, entry);
    return response.data;
  },
};