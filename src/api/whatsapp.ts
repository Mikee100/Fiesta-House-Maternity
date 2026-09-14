import axios, { AxiosInstance, InternalAxiosRequestConfig, AxiosResponse } from 'axios';
import { useAuthStore } from '@/state/authStore';

import { API_BASE_URL } from '@/config';

let apiClient: AxiosInstance;

const createApiClient = (): AxiosInstance => {
  const client = axios.create({
    baseURL: `${API_BASE_URL}/api`,
    timeout: 15000,
  });

  // Request interceptor to add auth token
  client.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
      const token = useAuthStore.getState().token;
      if (token) {
        config.headers.set('Authorization', `Bearer ${token}`);
      }
      return config;
    },
    (error) => Promise.reject(error)
  );

  // Response interceptor to handle token refresh or logout on 401
  client.interceptors.response.use(
    (response: AxiosResponse) => response,
    (error) => {
      if (error.response?.status === 401) {
        // Token expired or invalid, logout user
        useAuthStore.getState().logout();
      }
      return Promise.reject(error);
    }
  );

  return client;
};

const api = createApiClient();

// ─── Existing Types ──────────────────────────────────────────────────────────

export interface WhatsAppSettings {
  apiKey?: string;
  phoneNumberId?: string;
  businessAccountId?: string;
  enabled?: boolean;
  accessToken?: string;
  verifyToken?: string;
  webhookUrl?: string;
  apiVersion?: string;
  baseUrl?: string;
}

export interface WhatsAppMessage {
  id: string;
  customerId: string;
  content: string;
  direction: 'inbound' | 'outbound';
  timestamp: string; // Backend returns 'timestamp', not 'createdAt'
  from?: string;
  to?: string;
  customerName?: string;
}

export interface WhatsAppConversation {
  id: string;
  customerId: string;
  customerName: string;
  lastMessage: string;
  aiEnabled: boolean;
}

// ─── Template Management Types ───────────────────────────────────────────────

export interface WhatsAppAccountInfo {
  connected: boolean;
  wabaId: string;
  phoneNumberId: string;
  name?: string;
  currency?: string;
  timezone?: string;
  error?: string;
}

export interface TemplateComponent {
  type: 'HEADER' | 'BODY' | 'FOOTER' | 'BUTTONS';
  format?: 'TEXT' | 'IMAGE' | 'VIDEO' | 'DOCUMENT';
  text?: string;
}

export type TemplateStatus =
  | 'APPROVED'
  | 'PENDING'
  | 'REJECTED'
  | 'DISABLED'
  | 'PAUSED'
  | 'IN_APPEAL';

export interface WhatsAppTemplate {
  id: string;
  name: string;
  category: string;
  language: string;
  status: TemplateStatus;
  components: TemplateComponent[];
  quality_score?: { score: string };
  rejected_reason?: string;
  created_time?: string;
}

export interface CreateTemplatePayload {
  name: string;
  category: 'UTILITY' | 'MARKETING' | 'AUTHENTICATION';
  language: string;
  body: string;
  examples: string[];
}

// ─── Existing API Functions ──────────────────────────────────────────────────

export const getWhatsAppSettings = () => api.get('/whatsapp/settings');
export const updateWhatsAppSettings = (settings: Partial<WhatsAppSettings>) =>
  api.post('/whatsapp/settings', settings);
export const testWhatsAppConnection = () => api.post('/whatsapp/test-connection');
export const sendWhatsAppMessage = (data: { to: string; message: string; customerId?: string }) =>
  api.post('/whatsapp/send', data);
export const getWhatsAppMessages = (customerId?: string) =>
  api.get(`/whatsapp/messages?customerId=${customerId || ''}`);
export const getWhatsAppConversations = () => api.get('/whatsapp/conversations');
export const toggleCustomerAi = async (id: string, enabled: boolean) => {
  const response = await api.patch(`/customers/${id}/toggle-ai`, { enabled });
  return response.data;
};
export const getWhatsAppStats = () => api.get('/whatsapp/stats');

// ─── Template Management API Functions ──────────────────────────────────────

export const getWhatsAppAccountInfo = () =>
  api.get<WhatsAppAccountInfo>('/whatsapp/account');

export const getWhatsAppTemplates = () =>
  api.get<{ templates: WhatsAppTemplate[] }>('/whatsapp/templates');

export const createWhatsAppTemplate = (data: CreateTemplatePayload) =>
  api.post<{ success: boolean; template: { id: string; status: string; category: string } }>(
    '/whatsapp/templates',
    data
  );
