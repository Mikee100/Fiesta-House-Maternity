import React, { useEffect, useState } from 'react';
import { fetchModelUsage, type ModelUsage } from '@/api/analytics';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DollarSign, Users, Calendar, AlertTriangle, Smile, RefreshCw
} from 'lucide-react';
import { useAuthStore } from '@/state/authStore';
import { businessAnalyticsApi } from '@/api/businessAnalytics';
import { fetchCustomerEmotionsStats, fetchSystemStats } from '@/api/statistics';
import {
  LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area, BarChart, Bar
} from 'recharts';

const MODEL_COLORS = { groq: '#0f766e', groq2: '#2563eb', gemini: '#dc6b3f', gemini2: '#b45309' };
const formatTokens = (value: number) => new Intl.NumberFormat('en-KE').format(value);

const OverviewTab = () => {
  const [kpis, setKpis] = useState<any>(null);
  const [monthlyRevenue, setMonthlyRevenue] = useState<any[]>([]);
  const [revenueByPackage, setRevenueByPackage] = useState<any[]>([]);
  const [customerEmotions, setCustomerEmotions] = useState<any>(null);
  const [systemStats, setSystemStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [usageDays, setUsageDays] = useState<7 | 30>(7);
  const [modelUsage, setModelUsage] = useState<ModelUsage | null>(null);
  const [usageLoading, setUsageLoading] = useState(true);
  const [usageError, setUsageError] = useState(false);

  useEffect(() => {
    let active = true;
    const loadUsage = async () => {
      try {
        const data = await fetchModelUsage(usageDays);
        if (active) { setModelUsage(data); setUsageError(false); }
      } catch {
        if (active) setUsageError(true);
      } finally {
        if (active) setUsageLoading(false);
      }
    };
    setUsageLoading(true);
    void loadUsage();
    const refresh = window.setInterval(() => { void loadUsage(); }, 60_000);
    return () => { active = false; window.clearInterval(refresh); };
  }, [usageDays]);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      const token = useAuthStore.getState().token;
      if (!token) {
        setLoading(false);
        return;
      }

      const [kpisData, monthlyData, packageData, emotionsData, systemData] = await Promise.allSettled([
        businessAnalyticsApi.getBusinessKPIs(),
        businessAnalyticsApi.getMonthlyRevenue(),
        businessAnalyticsApi.getRevenueByPackage(),
        fetchCustomerEmotionsStats(),
        fetchSystemStats(),
      ]);

      setKpis(kpisData.status === 'fulfilled' ? kpisData.value : null);
      setMonthlyRevenue(monthlyData.status === 'fulfilled' && Array.isArray(monthlyData.value) ? monthlyData.value : []);
      setRevenueByPackage(packageData.status === 'fulfilled' && Array.isArray(packageData.value) ? packageData.value : []);
      setCustomerEmotions(emotionsData.status === 'fulfilled' ? emotionsData.value : null);
      setSystemStats(systemData.status === 'fulfilled' ? systemData.value : null);
    } catch (error: any) {
      const isConnectionError = error?.code === 'ERR_NETWORK' ||
        error?.message?.includes('Failed to fetch') ||
        error?.message?.includes('ERR_CONNECTION_REFUSED');
      if (!isConnectionError) {
        console.error('Failed to load analytics:', error);
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const formatCurrency = (amount: number) => `KSH ${amount.toLocaleString()}`;
  const SENTIMENT_COLORS = ['#10b981', '#22c55e', '#94a3b8', '#f59e0b', '#ef4444'];
  const todayUsage = modelUsage?.daily.find((day) => day.date === new Date().toISOString().slice(0, 10));
  const groqTokensToday = (todayUsage?.groq || 0) + (todayUsage?.groq2 || 0);
  const groqCooldownActive = !!modelUsage?.groqCooldownUntil && new Date(modelUsage.groqCooldownUntil).getTime() > Date.now();
  const latestGroqCall = modelUsage?.recent.find((row) => row.provider === 'groq');

  const kpiCards = [
    { label: 'Total Revenue', value: formatCurrency(kpis?.revenue?.total || 0), icon: DollarSign },
    { label: 'Total Bookings', value: systemStats?.bookings?.total || 0, icon: Calendar },
    { label: 'Total Customers', value: kpis?.customerMetrics?.totalCustomers || 0, icon: Users },
    { label: 'Open Escalations', value: systemStats?.escalations?.open || 0, icon: AlertTriangle },
  ];

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Core KPIs */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {kpiCards.map(({ label, value, icon: Icon }) => (
          <Card key={label} className="border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">{label}</p>
                  <p className="text-2xl font-semibold text-foreground mt-1">{value}</p>
                </div>
                <Icon className="h-5 w-5 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <section className="border-y border-border py-5" aria-label="AI model usage">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-foreground">AI model usage</h2>
            <p className="text-xs text-muted-foreground">Recorded tokens across Groq and Gemini · updates every minute</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="inline-flex rounded-md border border-border p-0.5" aria-label="Usage period">
              {([7, 30] as const).map((days) => (
                <button key={days} type="button" onClick={() => setUsageDays(days)} aria-pressed={usageDays === days}
                  className={`rounded px-2.5 py-1 text-xs font-medium ${usageDays === days ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground'}`}>
                  {days} days
                </button>
              ))}
            </div>
            <button type="button" onClick={() => { setUsageLoading(true); void fetchModelUsage(usageDays).then((data) => { setModelUsage(data); setUsageError(false); }).catch(() => setUsageError(true)).finally(() => setUsageLoading(false)); }}
              aria-label="Refresh model usage" title="Refresh model usage" className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground">
              <RefreshCw size={15} className={usageLoading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>
        {usageError && <p className="mb-3 text-xs text-destructive">Model usage is unavailable right now.</p>}
        {modelUsage && (
          <div className="mb-4 flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-border pb-4">
            <span className="text-2xl font-semibold tabular-nums text-foreground">{formatTokens(modelUsage.allTimeTokens)}</span>
            <span className="text-xs text-muted-foreground">All-time tokens recorded across customers · older usage has no provider breakdown</span>
          </div>
        )}
        {modelUsage && (modelUsage.summary.groq.calls + modelUsage.summary.groq2.calls > 0 || groqCooldownActive) && (
          <div className="mb-5 flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-b border-border pb-5">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Groq · today UTC</h3>
              <p className="text-xl font-semibold tabular-nums text-foreground">{formatTokens(groqTokensToday)} <span className="text-xs font-normal text-muted-foreground">tokens recorded here</span></p>
            </div>
            <div className="text-sm">
              <p className={groqCooldownActive ? 'font-semibold text-amber-700 dark:text-amber-400' : 'font-medium text-foreground'}>
                {groqCooldownActive ? 'Rate limited · cooldown active' : latestGroqCall?.errorCode === '429' ? 'Latest Groq attempt: 429' : 'No active Groq cooldown'}
              </p>
              {groqCooldownActive && <p className="text-xs text-muted-foreground">Retry after {new Date(modelUsage.groqCooldownUntil!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · configured fallbacks handle new turns</p>}
              <p className="mt-1 text-xs text-muted-foreground">Local usage does not show Groq’s actual remaining balance.</p>
            </div>
          </div>
        )}
        {!modelUsage ? (
          <p className="py-10 text-center text-sm text-muted-foreground">{usageLoading ? 'Loading model usage…' : 'No usage data available'}</p>
        ) : modelUsage.summary.groq.calls + modelUsage.summary.groq2.calls + modelUsage.summary.gemini.calls + modelUsage.summary.gemini2.calls === 0 ? (
          <div className="py-8 text-center">
            <p className="text-sm font-medium text-foreground">No Groq or Gemini calls recorded in this period</p>
            <p className="mt-1 text-xs text-muted-foreground">Provider breakdown starts with new AI responses.</p>
          </div>
        ) : (
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(260px,1fr)]">
            <div className="min-w-0">
              <div className="mb-2 flex items-baseline justify-between">
                <span className="text-xs font-medium text-muted-foreground">Daily tokens · UTC</span>
                <span className="text-sm font-semibold tabular-nums">{formatTokens(modelUsage.summary.groq.totalTokens + modelUsage.summary.gemini.totalTokens)} total</span>
              </div>
              <div className="h-[210px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={modelUsage.daily} margin={{ top: 8, right: 4, left: -15, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
                    <XAxis dataKey="date" tickFormatter={(value: string) => value.slice(5)} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} interval={usageDays === 30 ? 4 : 0} />
                    <YAxis tickFormatter={(value: number) => value >= 1000 ? `${Math.round(value / 1000)}k` : String(value)} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                    <Tooltip formatter={(value: number, name: string) => [formatTokens(value), name === 'groq' ? 'Groq primary' : name === 'groq2' ? 'Groq backup' : name === 'gemini' ? 'Gemini' : 'Gemini backup 2']} contentStyle={{ background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: 6, fontSize: 12 }} />
                    <Bar dataKey="groq" stackId="usage" fill={MODEL_COLORS.groq} name="Groq" maxBarSize={32} />
                    <Bar dataKey="groq2" stackId="usage" fill={MODEL_COLORS.groq2} name="Groq backup" maxBarSize={32} />
                    <Bar dataKey="gemini" stackId="usage" fill={MODEL_COLORS.gemini} name="Gemini" maxBarSize={32} />
                    <Bar dataKey="gemini2" stackId="usage" fill={MODEL_COLORS.gemini2} name="Gemini backup 2" maxBarSize={32} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="space-y-3">
              {(['groq', 'groq2', 'gemini', 'gemini2'] as const).map((provider) => {
                const row = modelUsage.summary[provider];
                const total = modelUsage.summary.groq.totalTokens + modelUsage.summary.groq2.totalTokens + modelUsage.summary.gemini.totalTokens + modelUsage.summary.gemini2.totalTokens;
                return (
                  <div key={provider} className="border-b border-border pb-3 last:border-0">
                    <div className="flex items-center justify-between gap-3">
                      <span className="flex items-center gap-2 text-sm font-semibold"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: MODEL_COLORS[provider] }} />{provider === 'groq' ? 'Groq · Primary' : provider === 'groq2' ? 'Groq · Backup' : provider === 'gemini' ? 'Gemini · Backup' : 'Gemini · Final fallback'}</span>
                      <span className="text-lg font-semibold tabular-nums">{formatTokens(row.totalTokens)}</span>
                    </div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full" style={{ width: `${total ? row.totalTokens / total * 100 : 0}%`, background: MODEL_COLORS[provider] }} /></div>
                    <p className="mt-2 text-xs text-muted-foreground tabular-nums">{formatTokens(row.inputTokens)} input · {formatTokens(row.outputTokens)} output · {row.calls} calls{row.failures ? ` · ${row.failures} failed` : ''}</p>
                  </div>
                );
              })}
              <div className="pt-1">
                <p className="mb-2 text-xs font-medium text-muted-foreground">Recent activity</p>
                {modelUsage.recent.length === 0 ? <p className="text-xs text-muted-foreground">No model calls recorded yet.</p> :
                  <div className="space-y-1.5">{modelUsage.recent.slice(0, 4).map((row, index) => (
                    <div key={`${row.createdAt}-${index}`} className="flex items-center justify-between gap-2 text-xs">
                      <span className="truncate text-muted-foreground"><span className="font-medium text-foreground">{row.provider === 'gemini2' ? 'Gemini backup 2' : row.provider === 'gemini' ? 'Gemini' : row.provider === 'groq2' ? 'Groq backup' : 'Groq primary'}</span>{row.failover ? ' · failover' : ''}{row.status !== 'success' ? ` · error ${row.errorCode || ''}` : ''}</span>
                      <span className="shrink-0 tabular-nums text-muted-foreground">{formatTokens(row.totalTokens)} · {new Date(row.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  ))}</div>}
              </div>
            </div>
          </div>
        )}
        {modelUsage && (
          <div className="mt-5 border-t border-border pt-4">
            <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="text-sm font-semibold text-foreground">Customer token counters</h3>
              <span className="text-xs text-muted-foreground">Top 20 by all-time usage · separate from provider totals</span>
            </div>
            {!modelUsage.customerUsage?.length ? (
              <p className="py-5 text-sm text-muted-foreground">No customer token usage recorded yet.</p>
            ) : (
              <div className="max-h-[400px] overflow-auto">
                <table className="w-full min-w-[440px] text-sm">
                  <thead className="sticky top-0 bg-background text-xs text-muted-foreground">
                    <tr className="border-b border-border">
                      <th scope="col" className="py-2 pr-3 text-left font-medium">Customer</th>
                      <th scope="col" className="px-3 py-2 text-right font-medium">Server day</th>
                      <th scope="col" className="px-3 py-2 text-right font-medium">All time</th>
                      <th scope="col" className="py-2 pl-3 text-right font-medium">Share</th>
                    </tr>
                  </thead>
                  <tbody>
                    {modelUsage.customerUsage.map((customer) => {
                      const share = modelUsage.allTimeTokens > 0 ? customer.totalTokens / modelUsage.allTimeTokens * 100 : 0;
                      return (
                        <tr key={customer.id} className="border-b border-border/60 last:border-0">
                          <td className="max-w-[200px] truncate py-2.5 pr-3 font-medium text-foreground" title={customer.name}>{customer.name || 'Unnamed customer'}</td>
                          <td className="px-3 py-2.5 text-right tabular-nums text-muted-foreground">{formatTokens(customer.todayTokens)}</td>
                          <td className="px-3 py-2.5 text-right tabular-nums text-foreground">{formatTokens(customer.totalTokens)}</td>
                          <td className="w-28 py-2.5 pl-3 text-right tabular-nums text-muted-foreground">
                            <span>{share.toFixed(1)}%</span>
                            <div className="mt-1 h-1 overflow-hidden rounded-full bg-muted"><div className="h-full bg-teal-700" style={{ width: `${Math.min(100, share)}%` }} /></div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Monthly Revenue */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium">Monthly Revenue</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={Array.isArray(monthlyRevenue) ? monthlyRevenue : []}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
              <YAxis tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
              <Tooltip
                contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}
                formatter={(value: any) => formatCurrency(value)}
              />
              <Line type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={2} name="Revenue" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Package Performance */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium">Package Performance</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2.5 px-3 font-medium text-muted-foreground">Package</th>
                  <th className="text-right py-2.5 px-3 font-medium text-muted-foreground">Revenue</th>
                  <th className="text-right py-2.5 px-3 font-medium text-muted-foreground">Bookings</th>
                  <th className="text-right py-2.5 px-3 font-medium text-muted-foreground">Avg Value</th>
                </tr>
              </thead>
              <tbody>
                {revenueByPackage.length === 0 ? (
                  <tr><td colSpan={4} className="text-center py-8 text-muted-foreground">No bookings yet</td></tr>
                ) : revenueByPackage.map((pkg, index) => (
                  <tr key={index} className="border-b border-border/50 last:border-0">
                    <td className="py-3 px-3 font-medium text-foreground">{pkg.package}</td>
                    <td className="text-right py-3 px-3 text-foreground">{formatCurrency(pkg.revenue)}</td>
                    <td className="text-right py-3 px-3 text-muted-foreground">{pkg.bookings}</td>
                    <td className="text-right py-3 px-3 text-muted-foreground">{formatCurrency(pkg.avgValue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Customer Emotions & Sentiment */}
      {customerEmotions && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Smile className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-base font-medium text-foreground">Customer Sentiment</h2>
          </div>

          <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
            <Card className="border-border/50">
              <CardContent className="p-4">
                <p className="text-xs font-medium text-muted-foreground">Total Sentiments</p>
                <p className="text-xl font-semibold mt-1">{customerEmotions.total || 0}</p>
              </CardContent>
            </Card>
            <Card className="border-border/50">
              <CardContent className="p-4">
                <p className="text-xs font-medium text-muted-foreground">Avg Score</p>
                <p className="text-xl font-semibold mt-1">{(customerEmotions.averageScore || 0).toFixed(2)}</p>
              </CardContent>
            </Card>
            <Card className="border-border/50">
              <CardContent className="p-4">
                <p className="text-xs font-medium text-muted-foreground">Positive %</p>
                <p className="text-xl font-semibold mt-1">
                  {(customerEmotions.distribution?.percentages?.positive || 0).toFixed(1)}%
                </p>
              </CardContent>
            </Card>
            <Card className="border-border/50">
              <CardContent className="p-4">
                <p className="text-xs font-medium text-muted-foreground">Needs Attention</p>
                <p className="text-xl font-semibold mt-1">
                  {customerEmotions.customersNeedingAttention?.length || 0}
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
            <Card className="border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-medium">Sentiment Distribution</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Very Positive', value: customerEmotions.distribution?.very_positive || 0 },
                        { name: 'Positive', value: customerEmotions.distribution?.positive || 0 },
                        { name: 'Neutral', value: customerEmotions.distribution?.neutral || 0 },
                        { name: 'Negative', value: customerEmotions.distribution?.negative || 0 },
                        { name: 'Very Negative', value: customerEmotions.distribution?.very_negative || 0 },
                      ]}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }: any) => `${name} (${(percent * 100).toFixed(0)}%)`}
                      outerRadius={75}
                      dataKey="value"
                    >
                      {SENTIMENT_COLORS.map((color, index) => (
                        <Cell key={`cell-${index}`} fill={color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-medium">Sentiment Trend (7 Days)</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={Array.isArray(customerEmotions?.recentTrends) ? customerEmotions.recentTrends : []}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="date" tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
                    <YAxis tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
                    <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }} />
                    <Area type="monotone" dataKey="avgScore" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.15} />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};

export default OverviewTab;
