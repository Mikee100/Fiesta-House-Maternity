import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DollarSign, Users, Calendar, AlertTriangle, Smile
} from 'lucide-react';
import { useAuthStore } from '@/state/authStore';
import { businessAnalyticsApi } from '@/api/businessAnalytics';
import { fetchCustomerEmotionsStats, fetchSystemStats } from '@/api/statistics';
import {
  LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area
} from 'recharts';

const OverviewTab = () => {
  const [kpis, setKpis] = useState<any>(null);
  const [monthlyRevenue, setMonthlyRevenue] = useState<any[]>([]);
  const [revenueByPackage, setRevenueByPackage] = useState<any[]>([]);
  const [customerEmotions, setCustomerEmotions] = useState<any>(null);
  const [systemStats, setSystemStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

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
