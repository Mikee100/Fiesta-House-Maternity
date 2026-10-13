import api from './apiInstance';

export type InstagramConnectionStatus =
  | {
      connected: false;
      configured: boolean;
      message?: string;
      error?: string;
    }
  | {
      connected: true;
      configured: boolean;
      username: string;
      instagramAccountId: string;
      accountType?: string | null;
      connectedAt: string;
    };

export async function getInstagramConnectionStatus(): Promise<InstagramConnectionStatus> {
  const response = await api.get<InstagramConnectionStatus>('/integrations/instagram');
  return response.data;
}

export async function startInstagramConnect(): Promise<{ authorizationUrl: string }> {
  const response = await api.get<{ authorizationUrl: string }>('/integrations/instagram/connect');
  return response.data;
}

export async function disconnectInstagram(): Promise<{ connected: false; success: boolean }> {
  const response = await api.delete<{ connected: false; success: boolean }>('/integrations/instagram');
  return response.data;
}
