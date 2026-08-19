export const fetchWhatsAppAgentAIPerformance = async () => {
  const res = await axios.get(`${API_BASE}/api/analytics/whatsapp-agent-ai-performance`);
  return res.data;
};
import axios from 'axios';

import { API_BASE_URL as API_BASE } from '../config';

export const fetchWhatsAppSentimentAnalytics = async () => {
  const res = await axios.get(`${API_BASE}/api/analytics/whatsapp-sentiment`);
  return res.data;
};

export const fetchTotalWhatsAppCustomers = async () => {
  const res = await axios.get(`${API_BASE}/api/analytics/total-whatsapp-customers`);
  return res.data;
};

export const fetchTotalInboundWhatsAppMessages = async () => {
  const res = await axios.get(`${API_BASE}/api/analytics/total-inbound-whatsapp-messages`);
  return res.data;
};

export const fetchTotalOutboundWhatsAppMessages = async () => {
  const res = await axios.get(`${API_BASE}/api/analytics/total-outbound-whatsapp-messages`);
  return res.data;
};

export const fetchPeakChatHours = async () => {
  const res = await axios.get(`${API_BASE}/api/analytics/peak-chat-hours`);
  return res.data;
};

export const fetchPeakChatDays = async () => {
  const res = await axios.get(`${API_BASE}/api/analytics/peak-chat-days`);
  return res.data;
};

export const fetchWhatsAppBookingConversionRate = async () => {
  const res = await axios.get(`${API_BASE}/api/analytics/whatsapp-booking-conversion-rate`);
  return res.data;
};

export const fetchWhatsAppSentimentTrend = async () => {
  const res = await axios.get(`${API_BASE}/api/analytics/whatsapp-sentiment-trend`);
  return res.data;
};

export const fetchWhatsAppSentimentByTopic = async () => {
  const res = await axios.get(`${API_BASE}/api/analytics/whatsapp-sentiment-by-topic`);
  return res.data;
};


export const fetchWhatsAppMostExtremeMessages = async () => {
  const res = await axios.get(`${API_BASE}/api/analytics/whatsapp-most-extreme-messages`);
  return res.data;
};

export const fetchWhatsAppKeywordTrends = async () => {
  const res = await axios.get(`${API_BASE}/api/analytics/whatsapp-keyword-trends`);
  return res.data;
};

export const fetchRecentConversationLearning = async (limit: number = 50) => {
  const safeLimit = Number.isFinite(limit) ? Math.min(Math.max(Math.floor(limit), 1), 200) : 50;
  const res = await axios.get(`${API_BASE}/api/analytics/conversation-learning/recent`, {
    params: { limit: safeLimit },
  });
  return res.data;
};

export const updateConversationLearningQaLabel = async (
  id: string,
  qaLabel: 'correct' | 'partially_correct' | 'incorrect' | 'unsafe',
  note?: string
) => {
  const res = await axios.post(`${API_BASE}/api/analytics/conversation-learning/${encodeURIComponent(id)}/qa-label`, {
    qaLabel,
    note,
  });
  return res.data;
};
