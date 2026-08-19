import axios from 'axios';
import { API_BASE_URL as API_BASE } from '../config';

export type SystemStatusResponse = {
  overallStatus: 'healthy' | 'degraded' | 'down';
  checkedAt: string;
  uptimeSeconds: number;
  runtime: {
    nodeVersion: string;
    environment: string;
    pid: number;
    connectedClients: number;
    memory: {
      rssMb: number;
      heapUsedMb: number;
      heapTotalMb: number;
    };
  };
  database: {
    status: 'healthy' | 'degraded' | 'down';
    latencyMs: number;
    error: string | null;
    trend?: {
      maxPoints: number;
      points: Array<{
        checkedAt: string;
        latencyMs: number;
        status: 'healthy' | 'degraded' | 'down';
      }>;
      stats: {
        minMs: number;
        maxMs: number;
        avgMs: number;
        deltaMs: number;
        direction: 'up' | 'down' | 'stable';
      };
    };
  };
  metrics: {
    customers: number;
    messagesLast24h: number;
    openEscalations: number;
    provisionalBookings: number;
    conversationLearningRows: number;
    unreadNotifications: number;
    qaCoverageRecent200: number;
    sampleSizeForQaCoverage: number;
  };
  services: {
    realtimeSocket: {
      status: 'healthy' | 'degraded';
      connectedClients: number;
    };
    notificationsCache: {
      status: 'healthy' | 'degraded';
      expiresInMs: number;
    };
    aiLearningQa: {
      status: 'healthy' | 'degraded' | 'down';
      qaCoverageRecent200: number;
      sampleSize: number;
      minSampleForStrictHealth?: number;
    };
  };
  failedChecks: number;
};

export const fetchSystemStatus = async (): Promise<SystemStatusResponse> => {
  const res = await axios.get(`${API_BASE}/api/system/status`);
  return res.data;
};
