import React, { useEffect, useMemo, useState } from 'react';
import {
  fetchTotalWhatsAppCustomers,
  fetchTotalInboundWhatsAppMessages,
  fetchTotalOutboundWhatsAppMessages,
  fetchWhatsAppBookingConversionRate,
  fetchPeakChatHours,
  fetchPeakChatDays,
  fetchWhatsAppSentimentAnalytics,
  fetchWhatsAppSentimentTrend,
  fetchWhatsAppSentimentByTopic,
  fetchWhatsAppMostExtremeMessages,
  fetchWhatsAppKeywordTrends,
  fetchWhatsAppAgentAIPerformance,
  fetchRecentConversationLearning,
  updateConversationLearningQaLabel,
} from '@/api/analytics';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
  AreaChart,
  Area
} from 'recharts';
import {
  Users,
  MessageSquare,
  Send,
  TrendingUp,
  Clock,
  Calendar,
  Smile,
  MessageCircle,
  Activity,
  Bot
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

type ConversationLearningRow = {
  id: string;
  createdAt: string;
  extractedIntent: string;
  detectedEmotionalTone?: string | null;
  wasSuccessful: boolean;
  conversationOutcome?: string | null;
  userMessage: string;
  aiResponse: string;
  metadata?: {
    isFallback?: boolean;
    platform?: string;
    intentConfidence?: number;
    toneConfidence?: number;
    intentRule?: string;
    likelyIncorrect?: boolean;
    likelyIncorrectScore?: number;
    likelyIncorrectReasons?: string[];
    qaLabel?: 'correct' | 'partially_correct' | 'incorrect' | 'unsafe';
    qaReviewedAt?: string;
    qaNote?: string | null;
  } | null;
  customer?: { id: string; name: string } | null;
};

type ConversationLearningResponse = {
  items: ConversationLearningRow[];
  source?: 'conversation_learning' | 'derived_from_messages';
};

const COLORS = {
  primary: '#3b82f6',
  success: '#22c55e',
  warning: '#eab308',
  danger: '#ef4444',
  neutral: '#94a3b8',
  purple: '#8b5cf6',
  teal: '#14b8a6',
  slate: '#64748b'
};

const SENTIMENT_COLORS = {
  positive: COLORS.success,
  negative: COLORS.danger,
  neutral: COLORS.neutral,
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-popover p-3 border border-border shadow-lg rounded-lg text-xs">
        <p className="font-semibold text-foreground mb-1">{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-2 text-muted-foreground">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
            <span>{entry.name}:</span>
            <span className="font-medium text-foreground">{entry.value}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

const WhatsAppTab = () => {
  const LOW_CONFIDENCE_THRESHOLD = 0.6;
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalCustomers: 0,
    inboundMessages: 0,
    outboundMessages: 0,
    bookingConversionRate: 0,
    peakHours: [],
    peakDays: [],
  });
  const [sentiment, setSentiment] = useState<any>(null);
  const [sentimentTrend, setSentimentTrend] = useState<any[]>([]);
  const [sentimentByTopic, setSentimentByTopic] = useState<any[]>([]);
  const [extremeMessages, setExtremeMessages] = useState<{ mostPositive: any[]; mostNegative: any[] }>({ mostPositive: [], mostNegative: [] });
  const [keywordTrends, setKeywordTrends] = useState<any[]>([]);
  const [agentAIPerformance, setAgentAIPerformance] = useState<any>(null);
  const [learningRows, setLearningRows] = useState<ConversationLearningRow[]>([]);
  const [learningSource, setLearningSource] = useState<'conversation_learning' | 'derived_from_messages' | null>(null);
  const [showLowConfidenceOnly, setShowLowConfidenceOnly] = useState(false);
  const [showLikelyIncorrectOnly, setShowLikelyIncorrectOnly] = useState(false);
  const [qaUpdating, setQaUpdating] = useState<Record<string, boolean>>({});

  const confidenceLabel = (v?: number) => {
    if (typeof v !== 'number') return 'n/a';
    if (v >= 0.85) return 'high';
    if (v >= 0.6) return 'med';
    return 'low';
  };

  const topLearningRows = useMemo(() => learningRows.slice(0, 20), [learningRows]);
  const lowConfidenceCount = useMemo(
    () => topLearningRows.filter((row) => typeof row.metadata?.intentConfidence === 'number' && row.metadata.intentConfidence < LOW_CONFIDENCE_THRESHOLD).length,
    [topLearningRows]
  );
  const likelyIncorrectCount = useMemo(
    () => topLearningRows.filter((row) => row.metadata?.likelyIncorrect === true || ((row.metadata?.likelyIncorrectScore || 0) >= 0.6)).length,
    [topLearningRows]
  );
  const visibleLearningRows = useMemo(() => {
    return topLearningRows.filter((row) => {
      const isLowConfidence = typeof row.metadata?.intentConfidence === 'number' && row.metadata.intentConfidence < LOW_CONFIDENCE_THRESHOLD;
      const isLikelyIncorrect = row.metadata?.likelyIncorrect === true || ((row.metadata?.likelyIncorrectScore || 0) >= 0.6);

      if (showLowConfidenceOnly && !isLowConfidence) return false;
      if (showLikelyIncorrectOnly && !isLikelyIncorrect) return false;
      return true;
    });
  }, [showLowConfidenceOnly, showLikelyIncorrectOnly, topLearningRows]);

  const riskLabel = (score?: number) => {
    if (typeof score !== 'number') return 'n/a';
    if (score >= 0.8) return 'high';
    if (score >= 0.6) return 'med';
    return 'low';
  };

  const setQaLabel = async (rowId: string, qaLabel: 'correct' | 'partially_correct' | 'incorrect' | 'unsafe') => {
    try {
      setQaUpdating((prev) => ({ ...prev, [rowId]: true }));
      await updateConversationLearningQaLabel(rowId, qaLabel);
      setLearningRows((prev) =>
        prev.map((row) => {
          if (row.id !== rowId) return row;
          const nextMetadata = {
            ...(row.metadata || {}),
            qaLabel,
            qaReviewedAt: new Date().toISOString(),
          };
          return { ...row, metadata: nextMetadata };
        })
      );
    } catch (error) {
      console.error('Failed to update QA label:', error);
    } finally {
      setQaUpdating((prev) => ({ ...prev, [rowId]: false }));
    }
  };

  const escapeCsv = (value: unknown) => {
    const s = String(value ?? '');
    if (/[",\n]/.test(s)) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };

  const exportLowConfidenceCsv = () => {
    const lowRows = topLearningRows.filter(
      (row) => typeof row.metadata?.intentConfidence === 'number' && row.metadata.intentConfidence < LOW_CONFIDENCE_THRESHOLD
    );

    if (lowRows.length === 0) return;

    const header = [
      'when',
      'customer',
      'intent',
      'intent_confidence',
      'tone',
      'outcome',
      'status',
      'platform',
      'intent_rule',
      'user_message',
      'ai_response',
    ];

    const lines = lowRows.map((row) => [
      new Date(row.createdAt).toISOString(),
      row.customer?.name || row.customer?.id || 'Unknown',
      row.extractedIntent || 'unknown',
      typeof row.metadata?.intentConfidence === 'number' ? Math.round(row.metadata.intentConfidence * 100) : '',
      row.detectedEmotionalTone || 'neutral',
      row.conversationOutcome || 'unknown',
      row.wasSuccessful ? 'success' : 'fallback',
      row.metadata?.platform || '',
      row.metadata?.intentRule || '',
      row.userMessage || '',
      row.aiResponse || '',
    ]);

    const csv = [header, ...lines].map((cells) => cells.map(escapeCsv).join(',')).join('\n');
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    anchor.href = url;
    anchor.download = `low-confidence-learning-${ts}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    async function loadStats() {
      setLoading(true);
      try {
        const [
          totalCustomers,
          inboundMessages,
          outboundMessages,
          bookingConversionRate,
          peakHours,
          peakDays,
          sentimentData,
          sentimentTrendData,
          sentimentByTopicData,
          extremeMessagesData,
          keywordTrendsData,
          agentAIPerformanceData,
          recentLearningData,
        ] = await Promise.all([
          fetchTotalWhatsAppCustomers(),
          fetchTotalInboundWhatsAppMessages(),
          fetchTotalOutboundWhatsAppMessages(),
          fetchWhatsAppBookingConversionRate(),
          fetchPeakChatHours(),
          fetchPeakChatDays(),
          fetchWhatsAppSentimentAnalytics(),
          fetchWhatsAppSentimentTrend(),
          fetchWhatsAppSentimentByTopic(),
          fetchWhatsAppMostExtremeMessages(),
          fetchWhatsAppKeywordTrends(),
          fetchWhatsAppAgentAIPerformance(),
          fetchRecentConversationLearning(20),
        ]);

        setStats({
          totalCustomers,
          inboundMessages,
          outboundMessages,
          bookingConversionRate,
          peakHours,
          peakDays,
        });
        setSentiment(sentimentData);
        setSentimentTrend(sentimentTrendData);
        setSentimentByTopic(sentimentByTopicData);
        setExtremeMessages(extremeMessagesData);
        setKeywordTrends(keywordTrendsData);
        setAgentAIPerformance(agentAIPerformanceData);
        const learningPayload = (recentLearningData || {}) as ConversationLearningResponse;
        setLearningRows(Array.isArray(learningPayload.items) ? learningPayload.items : []);
        setLearningSource(learningPayload.source || null);
      } catch (error) {
        console.error("Error fetching analytics:", error);
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Skeleton className="h-80 rounded-xl" />
          <Skeleton className="h-80 rounded-xl" />
        </div>
      </div>
    );
  }

  const metricCards = [
    {
      label: 'Total Customers',
      value: stats.totalCustomers,
      icon: Users,
      color: 'text-blue-600 dark:text-blue-400',
      bg: 'bg-blue-100 dark:bg-blue-900/30',
    },
    {
      label: 'Inbound Msgs',
      value: stats.inboundMessages,
      icon: MessageSquare,
      color: 'text-emerald-600 dark:text-emerald-400',
      bg: 'bg-emerald-100 dark:bg-emerald-900/30',
    },
    {
      label: 'Outbound Msgs',
      value: stats.outboundMessages,
      icon: Send,
      color: 'text-purple-600 dark:text-purple-400',
      bg: 'bg-purple-100 dark:bg-purple-900/30',
    },
    {
      label: 'Conversion Rate',
      value: `${(stats.bookingConversionRate * 100).toFixed(1)}%`,
      icon: TrendingUp,
      color: 'text-amber-600 dark:text-amber-400',
      bg: 'bg-amber-100 dark:bg-amber-900/30',
    },
  ];

  return (
    <div className="space-y-4 p-1">
      <div className="flex items-center justify-between mb-1">
        <div>
          <h2 className="text-xl font-bold text-foreground tracking-tight">WhatsApp Analytics</h2>
          <p className="text-xs text-muted-foreground">Real-time insights into customer engagement and performance.</p>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {metricCards.map((card, idx) => (
          <Card key={idx} className="border-none shadow-sm hover:shadow-md transition-shadow bg-card">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{card.label}</p>
                <p className="text-xl font-bold text-foreground mt-0.5">{card.value}</p>
              </div>
              <div className={`p-2 rounded-xl ${card.bg}`}>
                <card.icon className={`w-4 h-4 ${card.color}`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row 1: Peak Times */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="border-none shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-muted-foreground" /> Peak Chat Hours
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.peakHours}>
                  <defs>
                    <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.1} />
                      <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis
                    dataKey="hour"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                    tickFormatter={(val) => `${val}:00`}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke={COLORS.primary}
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorCount)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5 text-muted-foreground" /> Peak Chat Days
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.peakDays}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis
                    dataKey="day"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar
                    dataKey="count"
                    fill={COLORS.purple}
                    radius={[4, 4, 0, 0]}
                    barSize={32}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2: Sentiment & Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sentiment Distribution */}
        <Card className="border-none shadow-sm lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Smile className="w-4 h-4 text-muted-foreground" /> Customer Sentiment
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px] w-full relative">
              {sentiment?.distribution ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={Object.entries(sentiment.distribution).map(([name, value]) => ({ name, value }))}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {Object.keys(sentiment.distribution).map((key, index) => (
                        <Cell key={`cell-${index}`} fill={SENTIMENT_COLORS[key as keyof typeof SENTIMENT_COLORS]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '11px' }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-sm text-gray-400">No data</div>
              )}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="text-center">
                  <span className="text-2xl font-bold text-foreground">{sentiment?.total || 0}</span>
                  <p className="text-[10px] text-muted-foreground uppercase">Analyzed</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sentiment Trend */}
        <Card className="border-none shadow-sm lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Activity className="w-3.5 h-3.5 text-muted-foreground" /> Sentiment Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sentimentTrend} stackOffset="sign">
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis
                    dataKey="date"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                  <Bar dataKey="positive" name="Positive" stackId="a" fill={SENTIMENT_COLORS.positive} radius={[0, 0, 4, 4]} />
                  <Bar dataKey="neutral" name="Neutral" stackId="a" fill={SENTIMENT_COLORS.neutral} />
                  <Bar dataKey="negative" name="Negative" stackId="a" fill={SENTIMENT_COLORS.negative} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Row 3: Topics & Keywords */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="border-none shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <MessageCircle className="w-3.5 h-3.5 text-muted-foreground" /> Sentiment by Topic
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[240px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sentimentByTopic} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  <XAxis type="number" hide />
                  <YAxis
                    dataKey="topic"
                    type="category"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                    width={100}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '11px' }} />
                  <Bar dataKey="positive" stackId="a" fill={SENTIMENT_COLORS.positive} barSize={20} radius={[0, 4, 4, 0]} />
                  <Bar dataKey="neutral" stackId="a" fill={SENTIMENT_COLORS.neutral} barSize={20} />
                  <Bar dataKey="negative" stackId="a" fill={SENTIMENT_COLORS.negative} barSize={20} radius={[4, 0, 0, 4]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <TrendingUp className="w-3.5 h-3.5 text-muted-foreground" /> Trending Keywords
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[240px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={keywordTrends?.slice(0, 10)}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis
                    dataKey="keyword"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar
                    dataKey="count"
                    fill={COLORS.teal}
                    radius={[4, 4, 0, 0]}
                    barSize={32}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Row 4: Agent vs AI */}
      {
        agentAIPerformance && (
          <Card className="border-none shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Bot className="w-3.5 h-3.5 text-muted-foreground" /> Agent vs AI Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-muted-foreground uppercase bg-muted/50">
                    <tr>
                      <th className="px-6 py-3 font-medium">Metric</th>
                      <th className="px-6 py-3 font-medium text-center">Human Agent</th>
                      <th className="px-6 py-3 font-medium text-center">AI Assistant</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    <tr className="bg-card hover:bg-muted/50 transition-colors">
                      <td className="px-6 py-4 font-medium text-foreground">Messages Handled</td>
                      <td className="px-6 py-4 text-center text-muted-foreground">{agentAIPerformance.agent.count}</td>
                      <td className="px-6 py-4 text-center text-muted-foreground">{agentAIPerformance.ai.count}</td>
                    </tr>
                    <tr className="bg-card hover:bg-muted/50 transition-colors">
                      <td className="px-6 py-4 font-medium text-foreground">Resolution Rate</td>
                      <td className="px-6 py-4 text-center">
                        <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/20">
                          {agentAIPerformance.agent.resolutionRate}%
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <Badge variant="outline" className="bg-purple-500/10 text-purple-500 border-purple-500/20">
                          {agentAIPerformance.ai.resolutionRate}%
                        </Badge>
                      </td>
                    </tr>
                    <tr className="bg-card hover:bg-muted/50 transition-colors">
                      <td className="px-6 py-4 font-medium text-foreground">Avg. Sentiment</td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-20 h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-green-500"
                              style={{ width: `${agentAIPerformance.agent.sentiment.positive}%` }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground">{agentAIPerformance.agent.sentiment.positive}%</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-20 h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-green-500"
                              style={{ width: `${agentAIPerformance.ai.sentiment.positive}%` }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground">{agentAIPerformance.ai.sentiment.positive}%</span>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )
      }

      {/* Row 5: Extreme Messages */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-none shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-emerald-700 flex items-center gap-2">
              <Smile className="w-3.5 h-3.5" /> Top Positive Feedback
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {extremeMessages.mostPositive?.slice(0, 3).map((msg: any, idx: number) => (
                <div key={idx} className="p-3 bg-emerald-500/10 rounded-lg border border-emerald-500/20 text-sm">
                  <p className="text-foreground italic">"{msg.content}"</p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">Score: {msg.score}</span>
                    <span className="text-[10px] text-muted-foreground">{new Date(msg.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
              {!extremeMessages.mostPositive?.length && <p className="text-sm text-muted-foreground">No data available</p>}
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-rose-700 flex items-center gap-2">
              <Activity className="w-3.5 h-3.5" /> Critical Feedback
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {extremeMessages.mostNegative?.slice(0, 3).map((msg: any, idx: number) => (
                <div key={idx} className="p-3 bg-rose-500/10 rounded-lg border border-rose-500/20 text-sm">
                  <p className="text-foreground italic">"{msg.content}"</p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-[10px] text-rose-600 dark:text-rose-400 font-medium">Score: {msg.score}</span>
                    <span className="text-[10px] text-muted-foreground">{new Date(msg.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
              {!extremeMessages.mostNegative?.length && <p className="text-sm text-muted-foreground">No data available</p>}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Row 6: Recent AI Learning */}
      <Card className="border-none shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Bot className="w-3.5 h-3.5 text-muted-foreground" /> Recent AI Learning
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-[10px]">
                Low (&lt;{Math.round(LOW_CONFIDENCE_THRESHOLD * 100)}%): {lowConfidenceCount}
              </Badge>
              <Badge variant="outline" className="text-[10px]">
                Likely incorrect: {likelyIncorrectCount}
              </Badge>
              <button
                type="button"
                onClick={exportLowConfidenceCsv}
                disabled={lowConfidenceCount === 0}
                className="text-[11px] px-2 py-1 rounded-md border transition-colors bg-transparent text-muted-foreground border-border hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
                title="Export low-confidence rows to CSV"
              >
                Export low confidence CSV
              </button>
              <button
                type="button"
                onClick={() => setShowLowConfidenceOnly((prev) => !prev)}
                className={`text-[11px] px-2 py-1 rounded-md border transition-colors ${showLowConfidenceOnly
                  ? 'bg-amber-500/10 text-amber-700 border-amber-500/30 dark:text-amber-400'
                  : 'bg-transparent text-muted-foreground border-border hover:bg-muted'}`}
              >
                {showLowConfidenceOnly ? 'Showing low confidence' : 'Show low confidence only'}
              </button>
              <button
                type="button"
                onClick={() => setShowLikelyIncorrectOnly((prev) => !prev)}
                className={`text-[11px] px-2 py-1 rounded-md border transition-colors ${showLikelyIncorrectOnly
                  ? 'bg-rose-500/10 text-rose-700 border-rose-500/30 dark:text-rose-400'
                  : 'bg-transparent text-muted-foreground border-border hover:bg-muted'}`}
              >
                {showLikelyIncorrectOnly ? 'Showing likely incorrect' : 'Show likely incorrect only'}
              </button>
            </div>
          </div>
          {learningSource === 'derived_from_messages' && (
            <p className="text-[11px] text-amber-600 dark:text-amber-400">
              Showing derived rows from message history until live ConversationLearning rows accumulate.
            </p>
          )}
        </CardHeader>
        <CardContent>
          {learningRows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No conversation learning rows yet. Send a few AI-handled messages, then refresh this page.</p>
          ) : visibleLearningRows.length === 0 && (showLowConfidenceOnly || showLikelyIncorrectOnly) ? (
            <p className="text-sm text-muted-foreground">No rows match your current triage filters in the latest 20 conversations.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="text-[11px] text-muted-foreground uppercase bg-muted/50">
                  <tr>
                    <th className="px-3 py-2 font-medium">When</th>
                    <th className="px-3 py-2 font-medium">Customer</th>
                    <th className="px-3 py-2 font-medium">Intent</th>
                    <th className="px-3 py-2 font-medium">Conf</th>
                    <th className="px-3 py-2 font-medium">Risk</th>
                    <th className="px-3 py-2 font-medium">Tone</th>
                    <th className="px-3 py-2 font-medium">Outcome</th>
                    <th className="px-3 py-2 font-medium">Status</th>
                    <th className="px-3 py-2 font-medium">QA</th>
                    <th className="px-3 py-2 font-medium">User Message</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {visibleLearningRows.map((row) => (
                    <tr key={row.id} className="bg-card hover:bg-muted/50 transition-colors align-top">
                      <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">
                        {new Date(row.createdAt).toLocaleString()}
                      </td>
                      <td className="px-3 py-2 text-foreground whitespace-nowrap">
                        {row.customer?.name || row.customer?.id || 'Unknown'}
                      </td>
                      <td className="px-3 py-2">
                        <Badge variant="outline" className="text-[10px]">
                          {row.extractedIntent || 'unknown'}
                        </Badge>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <Badge
                          variant="outline"
                          className={
                            confidenceLabel(row.metadata?.intentConfidence) === 'high'
                              ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                              : confidenceLabel(row.metadata?.intentConfidence) === 'med'
                                ? 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                                : 'bg-rose-500/10 text-rose-600 border-rose-500/20'
                          }
                          title={typeof row.metadata?.intentConfidence === 'number' ? `rule: ${row.metadata?.intentRule || 'n/a'}` : 'n/a'}
                        >
                          {typeof row.metadata?.intentConfidence === 'number'
                            ? `${Math.round(row.metadata.intentConfidence * 100)}%`
                            : 'n/a'}
                        </Badge>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <Badge
                          variant="outline"
                          className={
                            riskLabel(row.metadata?.likelyIncorrectScore) === 'high'
                              ? 'bg-rose-500/10 text-rose-600 border-rose-500/20'
                              : riskLabel(row.metadata?.likelyIncorrectScore) === 'med'
                                ? 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                                : 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                          }
                          title={Array.isArray(row.metadata?.likelyIncorrectReasons) ? row.metadata?.likelyIncorrectReasons.join(', ') : 'n/a'}
                        >
                          {typeof row.metadata?.likelyIncorrectScore === 'number'
                            ? `${Math.round(row.metadata.likelyIncorrectScore * 100)}%`
                            : 'n/a'}
                        </Badge>
                      </td>
                      <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">
                        {row.detectedEmotionalTone || 'neutral'}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">
                        {row.conversationOutcome || 'unknown'}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <Badge
                          variant="outline"
                          className={row.wasSuccessful ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 'bg-rose-500/10 text-rose-600 border-rose-500/20'}
                        >
                          {row.wasSuccessful ? 'success' : 'fallback'}
                        </Badge>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          {(['correct', 'partially_correct', 'incorrect', 'unsafe'] as const).map((label) => (
                            <button
                              key={label}
                              type="button"
                              disabled={qaUpdating[row.id] === true}
                              onClick={() => setQaLabel(row.id, label)}
                              className={`text-[10px] px-2 py-1 rounded border transition-colors ${row.metadata?.qaLabel === label
                                ? 'bg-blue-500/10 text-blue-700 border-blue-500/30 dark:text-blue-400'
                                : 'bg-transparent text-muted-foreground border-border hover:bg-muted'} disabled:opacity-60 disabled:cursor-not-allowed`}
                            >
                              {label === 'partially_correct' ? 'partial' : label}
                            </button>
                          ))}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-muted-foreground max-w-[360px] truncate" title={row.userMessage}>
                        {row.userMessage}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div >
  );
};

export default WhatsAppTab;