import { useEffect, useMemo, useState } from 'react';
import { Activity, Database, Bell, Bot, RefreshCw, Server, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { fetchSystemStatus, type SystemStatusResponse } from '@/api/system';

const statusBadgeClass = (status: string) => {
  if (status === 'healthy') return 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30 dark:text-emerald-400';
  if (status === 'degraded') return 'bg-amber-500/10 text-amber-700 border-amber-500/30 dark:text-amber-400';
  return 'bg-rose-500/10 text-rose-700 border-rose-500/30 dark:text-rose-400';
};

const formatUptime = (seconds: number) => {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
};

const DbLatencySparkline = ({ points }: { points: Array<{ checkedAt: string; latencyMs: number; status: string }> }) => {
  if (!points || points.length < 2) {
    return <p className="text-[11px] text-muted-foreground">Waiting for more samples to draw trend.</p>;
  }

  const width = 320;
  const height = 72;
  const padding = 6;
  const values = points.map((p) => p.latencyMs);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(1, max - min);

  const svgPoints = points
    .map((point, index) => {
      const x = padding + (index / (points.length - 1)) * (width - padding * 2);
      const y = height - padding - ((point.latencyMs - min) / range) * (height - padding * 2);
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-[72px]">
      <line
        x1={padding}
        y1={height - padding}
        x2={width - padding}
        y2={height - padding}
        stroke="currentColor"
        className="text-border"
        strokeWidth="1"
      />
      <polyline
        fill="none"
        stroke="currentColor"
        className="text-blue-600 dark:text-blue-400"
        strokeWidth="2"
        points={svgPoints}
      />
      <circle
        cx={padding + (width - padding * 2)}
        cy={height - padding - ((values[values.length - 1] - min) / range) * (height - padding * 2)}
        r="2.5"
        fill="currentColor"
        className="text-blue-600 dark:text-blue-400"
      />
    </svg>
  );
};

const SystemStatus = () => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<SystemStatusResponse | null>(null);
  const [trendWindow, setTrendWindow] = useState<10 | 20 | 40>(20);

  const loadStatus = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      setError(null);
      const payload = await fetchSystemStatus();
      setData(payload);
    } catch (e: any) {
      setError(e?.message || 'Failed to load system status.');
    } finally {
      if (isRefresh) setRefreshing(false);
      else setLoading(false);
    }
  };

  useEffect(() => {
    void loadStatus(false);

    const interval = setInterval(() => {
      void loadStatus(true);
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const summary = useMemo(() => {
    if (!data) return [];
    return [
      { label: 'Uptime', value: formatUptime(data.uptimeSeconds), icon: Server },
      { label: 'DB Latency', value: `${data.database.latencyMs} ms`, icon: Database },
      { label: 'Connected Clients', value: data.runtime.connectedClients, icon: Activity },
      { label: 'Failed Checks', value: data.failedChecks, icon: AlertTriangle },
    ];
  }, [data]);

  const selectedTrendPoints = useMemo(() => {
    const points = data?.database?.trend?.points || [];
    return points.slice(-trendWindow);
  }, [data?.database?.trend?.points, trendWindow]);

  const selectedTrendStats = useMemo(() => {
    if (selectedTrendPoints.length === 0) {
      const baseline = data?.database?.latencyMs || 0;
      return {
        minMs: baseline,
        maxMs: baseline,
        avgMs: baseline,
        deltaMs: 0,
        direction: 'stable' as const,
      };
    }

    const values = selectedTrendPoints.map((p) => p.latencyMs);
    const minMs = Math.min(...values);
    const maxMs = Math.max(...values);
    const avgMs = Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(1));
    const first = values[0];
    const last = values[values.length - 1];
    const deltaMs = last - first;
    const direction = Math.abs(deltaMs) <= 50 ? 'stable' : deltaMs > 0 ? 'up' : 'down';

    return { minMs, maxMs, avgMs, deltaMs, direction };
  }, [selectedTrendPoints, data?.database?.latencyMs]);

  const dbTrendDirectionLabel = selectedTrendStats.direction === 'up'
    ? 'rising'
    : selectedTrendStats.direction === 'down'
      ? 'improving'
      : 'stable';

  if (loading) {
    return (
      <div className="space-y-4 p-1">
        <Skeleton className="h-24 w-full rounded-xl" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-4 p-1">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">System Status</h1>
          <p className="text-xs text-muted-foreground">Live operational health for backend services and core platform dependencies.</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className={statusBadgeClass(data?.overallStatus || 'down')}>
            Overall: {data?.overallStatus || 'unknown'}
          </Badge>
          <Button variant="outline" size="sm" onClick={() => void loadStatus(true)} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 mr-1 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
          </Button>
        </div>
      </div>

      {error && (
        <Card className="border border-rose-500/30 bg-rose-500/5">
          <CardContent className="py-3 text-sm text-rose-700 dark:text-rose-400">{error}</CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {summary.map((item) => (
          <Card key={item.label} className="border-none shadow-sm">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">{item.label}</p>
                <p className="text-xl font-semibold text-foreground mt-1">{item.value}</p>
              </div>
              <div className="p-2 rounded-lg bg-muted">
                <item.icon className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="border-none shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2"><Database className="h-4 w-4" /> Database</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Badge variant="outline" className={statusBadgeClass(data?.database.status || 'down')}>{data?.database.status || 'unknown'}</Badge>
            <p className="text-muted-foreground">Latency: <span className="text-foreground font-medium">{data?.database.latencyMs ?? 0} ms</span></p>
            {data?.database.error && <p className="text-rose-600 dark:text-rose-400 text-xs">{data.database.error}</p>}
            <div className="flex items-center gap-1">
              {[10, 20, 40].map((windowSize) => (
                <button
                  key={windowSize}
                  type="button"
                  onClick={() => setTrendWindow(windowSize as 10 | 20 | 40)}
                  className={`text-[10px] px-2 py-1 rounded border transition-colors ${trendWindow === windowSize
                    ? 'bg-blue-500/10 text-blue-700 border-blue-500/30 dark:text-blue-400'
                    : 'bg-transparent text-muted-foreground border-border hover:bg-muted'}`}
                >
                  {windowSize} pts
                </button>
              ))}
            </div>
            <div className="rounded-md border border-border/60 bg-muted/30 p-2 mt-2">
              <DbLatencySparkline points={selectedTrendPoints} />
              <div className="grid grid-cols-2 gap-2 text-[11px] mt-1">
                <p className="text-muted-foreground">Min: <span className="text-foreground font-medium">{selectedTrendStats.minMs} ms</span></p>
                <p className="text-muted-foreground">Max: <span className="text-foreground font-medium">{selectedTrendStats.maxMs} ms</span></p>
                <p className="text-muted-foreground">Avg: <span className="text-foreground font-medium">{selectedTrendStats.avgMs} ms</span></p>
                <p className="text-muted-foreground">Trend: <span className="text-foreground font-medium">{dbTrendDirectionLabel} ({selectedTrendStats.deltaMs} ms)</span></p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2"><Bell className="h-4 w-4" /> Notifications</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Badge variant="outline" className={statusBadgeClass(data?.services.notificationsCache.status || 'degraded')}>
              Cache: {data?.services.notificationsCache.status || 'unknown'}
            </Badge>
            <p className="text-muted-foreground">Unread: <span className="text-foreground font-medium">{data?.metrics.unreadNotifications ?? 0}</span></p>
            <p className="text-muted-foreground">Cache expires in: <span className="text-foreground font-medium">{Math.ceil((data?.services.notificationsCache.expiresInMs || 0) / 1000)}s</span></p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2"><Bot className="h-4 w-4" /> AI Learning QA</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Badge variant="outline" className={statusBadgeClass(data?.services.aiLearningQa.status || 'down')}>
              {data?.services.aiLearningQa.status || 'unknown'}
            </Badge>
            <p className="text-muted-foreground">QA Coverage: <span className="text-foreground font-medium">{Math.round((data?.metrics.qaCoverageRecent200 || 0) * 100)}%</span></p>
            <p className="text-muted-foreground">Sample size: <span className="text-foreground font-medium">{data?.metrics.sampleSizeForQaCoverage || 0}</span></p>
            <p className="text-muted-foreground">Min sample for strict health: <span className="text-foreground font-medium">{data?.services.aiLearningQa.minSampleForStrictHealth || 20}</span></p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-none shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Core Metrics Snapshot</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 text-sm">
            <div className="rounded-lg border border-border p-3">
              <p className="text-[11px] text-muted-foreground uppercase">Customers</p>
              <p className="text-lg font-semibold">{data?.metrics.customers ?? 0}</p>
            </div>
            <div className="rounded-lg border border-border p-3">
              <p className="text-[11px] text-muted-foreground uppercase">Messages 24h</p>
              <p className="text-lg font-semibold">{data?.metrics.messagesLast24h ?? 0}</p>
            </div>
            <div className="rounded-lg border border-border p-3">
              <p className="text-[11px] text-muted-foreground uppercase">Open Escalations</p>
              <p className="text-lg font-semibold">{data?.metrics.openEscalations ?? 0}</p>
            </div>
            <div className="rounded-lg border border-border p-3">
              <p className="text-[11px] text-muted-foreground uppercase">Provisional</p>
              <p className="text-lg font-semibold">{data?.metrics.provisionalBookings ?? 0}</p>
            </div>
            <div className="rounded-lg border border-border p-3">
              <p className="text-[11px] text-muted-foreground uppercase">Learning Rows</p>
              <p className="text-lg font-semibold">{data?.metrics.conversationLearningRows ?? 0}</p>
            </div>
            <div className="rounded-lg border border-border p-3">
              <p className="text-[11px] text-muted-foreground uppercase">Node</p>
              <p className="text-sm font-medium mt-1">{data?.runtime.nodeVersion || 'n/a'}</p>
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground mt-3">Last checked: {data ? new Date(data.checkedAt).toLocaleString() : 'n/a'}</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default SystemStatus;
