import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  AlertTriangle,
  ArrowUpRight,
  BarChart2,
  BookOpen,
  Brain,
  CheckCircle2,
  Clock,
  Database,
  FileSearch,
  HelpCircle,
  Lightbulb,
  PlusCircle,
  RefreshCcw,
  Search,
  ShieldCheck,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { toast } from 'sonner';

import { PageHeader } from '@/components/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { KBEntry } from '@/api/knowledgeBase';
import { ConversationLearningRow, ragInsightsApi } from '@/api/ragInsights';

function formatDate(value?: string) {
  if (!value) return 'Unknown';
  return new Intl.DateTimeFormat('en-KE', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function compactText(value: string, max = 180) {
  if (value.length <= max) return value;
  return `${value.slice(0, max).trim()}...`;
}

function formatSectionLabel(value: string) {
  if (value === 'all') return 'All';
  if (value === 'kb_candidate') return 'KB candidates';
  if (value === 'likely_incorrect') return 'Likely incorrect';
  return value.replace(/_/g, ' ');
}

function StatCard({
  title,
  value,
  detail,
  icon: Icon,
  badge,
}: {
  title: string;
  value: string | number;
  detail: string;
  icon: typeof Brain;
  badge?: string;
}) {
  return (
    <Card className="border-border/60 shadow-sm transition-all hover:border-primary/40">
      <CardContent className="flex items-center gap-3 p-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-1">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{title}</p>
            {badge && (
              <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                {badge}
              </span>
            )}
          </div>
          <p className="text-2xl font-semibold leading-tight text-foreground">{value}</p>
          <p className="truncate text-xs text-muted-foreground">{detail}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function KnowledgeRow({ entry }: { entry: KBEntry }) {
  return (
    <div className="rounded-lg border border-border/70 bg-background p-3 text-left transition-all hover:border-primary/40">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <Badge variant="secondary" className="rounded-md">{entry.category || 'Uncategorised'}</Badge>
        {entry.mediaUrls?.length ? <Badge variant="outline" className="rounded-md">{entry.mediaUrls.length} media</Badge> : null}
        <span className="text-xs text-muted-foreground">Updated {formatDate(entry.updatedAt || entry.createdAt)}</span>
      </div>
      <h3 className="text-sm font-semibold text-foreground">{entry.question}</h3>
      <p className="mt-1 text-sm leading-6 text-muted-foreground">{compactText(entry.answer, 260)}</p>
    </div>
  );
}

function LearningRow({
  row,
  onPromote,
}: {
  row: ConversationLearningRow;
  onPromote?: (row: ConversationLearningRow) => void;
}) {
  return (
    <div className={cn('rounded-lg border bg-background p-3 text-left transition-all', row.likelyIncorrect ? 'border-destructive/50' : 'border-border/70 hover:border-primary/40')}>
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <Badge className="rounded-md" variant={row.wasSuccessful ? 'default' : 'secondary'}>
          {row.extractedIntent || 'general'}
        </Badge>
        <Badge className="rounded-md" variant="outline">{row.detectedEmotionalTone || 'neutral'}</Badge>
        {row.shouldAddToKB ? <Badge className="rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-800">KB candidate</Badge> : null}
        {row.likelyIncorrect ? <Badge className="rounded-md" variant="destructive">Review</Badge> : null}
        <span className="ml-auto text-xs text-muted-foreground">{formatDate(row.createdAt)}</span>
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Customer asked</p>
          <p className="mt-1 text-sm leading-6 text-foreground">{compactText(row.userMessage, 260)}</p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">AI answered</p>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">{compactText(row.aiResponse, 260)}</p>
        </div>
      </div>
      {row.newKnowledgeExtracted ? (
        <div className="mt-3 rounded-md bg-muted/60 p-2.5 text-sm text-muted-foreground flex items-start gap-2">
          <Sparkles className="h-4 w-4 text-primary shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-foreground">Extracted Learning:</span> {row.newKnowledgeExtracted}
          </div>
        </div>
      ) : null}
      {row.likelyIncorrectReasons?.length ? (
        <div className="mt-2 text-xs text-destructive flex items-center gap-1.5">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          <span>Signals: {row.likelyIncorrectReasons.join(', ')}</span>
        </div>
      ) : null}
      {onPromote && (row.shouldAddToKB || row.newKnowledgeExtracted) ? (
        <div className="mt-3 flex justify-end">
          <Button
            size="sm"
            variant="outline"
            onClick={() => onPromote(row)}
            className="gap-1.5 text-xs h-7 border-primary/40 text-primary hover:bg-primary/10"
          >
            <PlusCircle className="h-3.5 w-3.5" />
            Promote to Knowledge Base
          </Button>
        </div>
      ) : null}
    </div>
  );
}

const TONE_COLORS: Record<string, string> = {
  positive: '#10b981',
  very_positive: '#059669',
  neutral: '#6b7280',
  negative: '#f59e0b',
  very_negative: '#ef4444',
};

export default function RagInsights() {
  const [query, setQuery] = useState('');
  const [sourceCategory, setSourceCategory] = useState('all');
  const [learningSection, setLearningSection] = useState('all');
  const [reviewSection, setReviewSection] = useState('all');

  // Knowledge Promotion Modal State
  const [promoteDialogOpen, setPromoteDialogOpen] = useState(false);
  const [promoteForm, setPromoteForm] = useState({ question: '', answer: '', category: 'General' });
  const [isSavingEntry, setIsSavingEntry] = useState(false);

  const knowledgeQuery = useQuery({
    queryKey: ['rag-insights', 'knowledge'],
    queryFn: ragInsightsApi.getKnowledge,
  });

  const learningQuery = useQuery({
    queryKey: ['rag-insights', 'learning'],
    queryFn: () => ragInsightsApi.getRecentLearning(100),
  });

  const knowledge = knowledgeQuery.data?.items || [];
  const learning = learningQuery.data || [];
  const loading = knowledgeQuery.isLoading || learningQuery.isLoading;

  const categories = useMemo(() => {
    const counts = new Map<string, number>();
    knowledge.forEach((entry) => counts.set(entry.category || 'Uncategorised', (counts.get(entry.category || 'Uncategorised') || 0) + 1));
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [knowledge]);

  const sourceCategoryOptions = useMemo(() => [['all', knowledge.length] as [string, number], ...categories], [categories, knowledge.length]);

  const learningSections = useMemo(() => {
    const counts = new Map<string, number>();
    learning.forEach((row) => {
      const intent = row.extractedIntent || 'general';
      counts.set(intent, (counts.get(intent) || 0) + 1);
    });
    return [['all', learning.length] as [string, number], ...[...counts.entries()].sort((a, b) => b[1] - a[1])];
  }, [learning]);

  // Candidates & Gaps
  const kbCandidates = useMemo(() => {
    return learning.filter((row) => row.shouldAddToKB || Boolean(row.newKnowledgeExtracted));
  }, [learning]);

  const reviewRows = useMemo(() => learning.filter((row) => row.likelyIncorrect || row.shouldAddToKB), [learning]);

  const reviewSections = useMemo(() => {
    const counts = new Map<string, number>();
    reviewRows.forEach((row) => {
      if (row.shouldAddToKB) counts.set('kb_candidate', (counts.get('kb_candidate') || 0) + 1);
      if (row.likelyIncorrect) counts.set('likely_incorrect', (counts.get('likely_incorrect') || 0) + 1);
      row.likelyIncorrectReasons?.forEach((reason) => counts.set(reason, (counts.get(reason) || 0) + 1));
    });
    return [['all', reviewRows.length] as [string, number], ...[...counts.entries()].sort((a, b) => b[1] - a[1])];
  }, [reviewRows]);

  // High-Level Statistics
  const autonomousCount = useMemo(() => {
    return learning.filter(
      (row) => row.wasSuccessful && !row.likelyIncorrect && !/(team member|human|follow up|agent)/i.test(row.aiResponse)
    ).length;
  }, [learning]);

  const autonomousRate = learning.length ? Math.round((autonomousCount / learning.length) * 100) : 0;
  const successRate = learning.length ? Math.round((learning.filter((row) => row.wasSuccessful).length / learning.length) * 100) : 0;
  const reviewCount = reviewRows.length;

  // Chart data: Customer Intents Breakdown
  const intentChartData = useMemo(() => {
    const map = new Map<string, number>();
    learning.forEach((row) => {
      const key = formatSectionLabel(row.extractedIntent || 'general');
      map.set(key, (map.get(key) || 0) + 1);
    });
    return [...map.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 7);
  }, [learning]);

  // Chart data: Sentiment Distribution
  const sentimentChartData = useMemo(() => {
    const map = new Map<string, number>();
    learning.forEach((row) => {
      const tone = (row.detectedEmotionalTone || 'neutral').toLowerCase();
      map.set(tone, (map.get(tone) || 0) + 1);
    });
    return [...map.entries()].map(([tone, value]) => ({
      name: tone.replace(/_/g, ' '),
      value,
      color: TONE_COLORS[tone] || '#6366f1',
    }));
  }, [learning]);

  // Filtering
  const filteredKnowledge = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return knowledge.filter((entry) => {
      const category = entry.category || 'Uncategorised';
      const matchesCategory = sourceCategory === 'all' || category === sourceCategory;
      const matchesQuery = !needle || [entry.question, entry.answer, category].join(' ').toLowerCase().includes(needle);
      return matchesCategory && matchesQuery;
    });
  }, [knowledge, query, sourceCategory]);

  const selectedCategoryCount = sourceCategory === 'all'
    ? knowledge.length
    : categories.find(([category]) => category === sourceCategory)?.[1] || 0;

  const filteredLearning = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return learning.filter((row) => {
      const intent = row.extractedIntent || 'general';
      const matchesIntent = learningSection === 'all' || intent === learningSection;
      const matchesQuery = !needle || [row.userMessage, row.aiResponse, row.extractedIntent, row.newKnowledgeExtracted || ''].join(' ').toLowerCase().includes(needle);
      return matchesIntent && matchesQuery;
    });
  }, [learning, query, learningSection]);

  const filteredReview = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return reviewRows.filter((row) => {
      const matchesSection = reviewSection === 'all' ||
        (reviewSection === 'kb_candidate' && row.shouldAddToKB) ||
        (reviewSection === 'likely_incorrect' && row.likelyIncorrect) ||
        Boolean(row.likelyIncorrectReasons?.includes(reviewSection));
      const matchesQuery = !needle || [row.userMessage, row.aiResponse, row.extractedIntent, row.newKnowledgeExtracted || '', ...(row.likelyIncorrectReasons || [])].join(' ').toLowerCase().includes(needle);
      return matchesSection && matchesQuery;
    });
  }, [query, reviewRows, reviewSection]);

  const selectedLearningCount = learningSection === 'all'
    ? learning.length
    : learningSections.find(([section]) => section === learningSection)?.[1] || 0;
  const selectedReviewCount = reviewSection === 'all'
    ? reviewRows.length
    : reviewSections.find(([section]) => section === reviewSection)?.[1] || 0;

  const refetchAll = () => {
    void knowledgeQuery.refetch();
    void learningQuery.refetch();
  };

  const handleOpenPromote = (row: ConversationLearningRow) => {
    setPromoteForm({
      question: row.userMessage || '',
      answer: row.newKnowledgeExtracted || row.aiResponse || '',
      category: row.category || 'General',
    });
    setPromoteDialogOpen(true);
  };

  const handleSaveToKB = async () => {
    if (!promoteForm.question.trim() || !promoteForm.answer.trim()) {
      toast.error('Question and Answer cannot be empty.');
      return;
    }
    setIsSavingEntry(true);
    try {
      await ragInsightsApi.createKnowledgeEntry({
        question: promoteForm.question.trim(),
        answer: promoteForm.answer.trim(),
        category: promoteForm.category.trim() || 'General',
      });
      toast.success('Added successfully to Knowledge Base!');
      setPromoteDialogOpen(false);
      void knowledgeQuery.refetch();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to add entry to Knowledge Base.');
    } finally {
      setIsSavingEntry(false);
    }
  };

  return (
    <div className="space-y-4 animate-fadeIn">
      <PageHeader
        title="RAG Insights & AI Learning"
        description="Monitor how our AI retrieves facts, tracks customer intents, learns from conversation signals, and continuously fills knowledge gaps."
        actions={
          <Button variant="outline" onClick={refetchAll} disabled={loading} className="gap-2">
            <RefreshCcw className={cn('h-4 w-4', loading && 'animate-spin')} />
            Refresh
          </Button>
        }
      />

      {/* Top Learning Performance Stat Cards */}
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <StatCard
          title="RAG Sources"
          value={knowledge.length}
          detail={`${categories.length} source categories`}
          icon={Database}
        />
        <StatCard
          title="Autonomous Resolution"
          value={`${autonomousRate}%`}
          detail={`${autonomousCount} of ${learning.length} handled without human escalation`}
          icon={ShieldCheck}
          badge="Live"
        />
        <StatCard
          title="Overall Success Rate"
          value={`${successRate}%`}
          detail="Positive conversation outcomes"
          icon={CheckCircle2}
        />
        <StatCard
          title="KB Candidates"
          value={kbCandidates.length}
          detail="Extracted learnings to promote"
          icon={Sparkles}
          badge={kbCandidates.length > 0 ? 'New' : undefined}
        />
        <StatCard
          title="Needs Review"
          value={reviewCount}
          detail="Signals requiring admin attention"
          icon={AlertTriangle}
        />
      </div>

      <Card className="border-border/60 shadow-sm">
        <CardContent className="p-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search source answers, customer questions, AI replies..."
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      {knowledgeQuery.error || learningQuery.error ? (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="flex items-center gap-2 p-4 text-sm text-destructive">
            <AlertTriangle className="h-4 w-4" />
            Could not load all RAG data. Check that the backend is running and reachable from this frontend.
          </CardContent>
        </Card>
      ) : null}

      <Tabs defaultValue="analytics" className="space-y-4">
        <TabsList className="grid w-full max-w-2xl grid-cols-5">
          <TabsTrigger value="analytics" className="gap-2"><BarChart2 className="h-4 w-4" /> Analytics</TabsTrigger>
          <TabsTrigger value="gaps" className="gap-2"><Lightbulb className="h-4 w-4" /> Gaps & Candidates</TabsTrigger>
          <TabsTrigger value="sources" className="gap-2"><BookOpen className="h-4 w-4" /> Sources</TabsTrigger>
          <TabsTrigger value="learning" className="gap-2"><Sparkles className="h-4 w-4" /> Learning</TabsTrigger>
          <TabsTrigger value="review" className="gap-2"><FileSearch className="h-4 w-4" /> Review</TabsTrigger>
        </TabsList>

        {/* Tab 1: Analytics & Trends */}
        <TabsContent value="analytics" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Intent Trends Chart */}
            <Card className="border-border/60 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  What Customers Ask About (Top Intents)
                </CardTitle>
                <CardDescription>
                  Customer questions classified into automated intent categories.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-2">
                <div className="h-[280px] w-full">
                  {intentChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={intentChartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                        <XAxis
                          dataKey="name"
                          tick={{ fontSize: 11 }}
                          interval={0}
                          angle={-20}
                          textAnchor="end"
                          stroke="hsl(var(--muted-foreground))"
                        />
                        <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'hsl(var(--background))',
                            borderColor: 'hsl(var(--border))',
                            borderRadius: '8px',
                          }}
                        />
                        <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                      No intent data logged yet.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Sentiment & Tone Chart */}
            <Card className="border-border/60 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Brain className="h-4 w-4 text-primary" />
                  Customer Emotional Tone Distribution
                </CardTitle>
                <CardDescription>
                  Sentiment detected by the natural language classifier across recent chats.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-2">
                <div className="h-[280px] w-full flex items-center justify-center">
                  {sentimentChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={sentimentChartData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={90}
                          innerRadius={50}
                          paddingAngle={3}
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        >
                          {sentimentChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'hsl(var(--background))',
                            borderColor: 'hsl(var(--border))',
                            borderRadius: '8px',
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                      No sentiment signals found.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* How Our AI Learns Info & Growth Status */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="border-border/60 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Database className="h-4 w-4 text-primary" />
                  Knowledge Depth
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs space-y-2 text-muted-foreground">
                <p>
                  Fiesta AI operates on <strong className="text-foreground">{knowledge.length} verified Q&A sources</strong> across {categories.length} business domains.
                </p>
                <p>
                  For a specialized studio/events business, 40–80 high-quality answers provide comprehensive coverage for &gt;90% of customer questions.
                </p>
              </CardContent>
            </Card>

            <Card className="border-border/60 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Continuous Learning Loop
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs space-y-2 text-muted-foreground">
                <p>
                  Every customer conversation is scanned in the background. If a customer provides new details or asks an unaddressed question, it is flagged as a <strong>KB Candidate</strong>.
                </p>
                <p>
                  You can promote candidates to the permanent Pinecone vector index in 1 click from the <strong>Gaps & Candidates</strong> tab.
                </p>
              </CardContent>
            </Card>

            <Card className="border-border/60 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  Autonomy & Safety
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs space-y-2 text-muted-foreground">
                <p>
                  The AI operates at a <strong className="text-foreground">{autonomousRate}% autonomous rate</strong>.
                </p>
                <p>
                  If an inquiry requires human escalation or displays conflicting signals, it is flagged for team review in the <strong>Review</strong> tab without guessing.
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab 2: Knowledge Gaps & Candidates */}
        <TabsContent value="gaps" className="space-y-4">
          <Card className="border-border/60 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Lightbulb className="h-4 w-4 text-amber-500" />
                    Knowledge Candidates & Unanswered Questions ({kbCandidates.length})
                  </CardTitle>
                  <CardDescription>
                    These are customer questions or conversation details the AI flagged as new knowledge. Promote them to the permanent knowledge base to make the AI immediately smarter.
                  </CardDescription>
                </div>
                <Badge variant="secondary" className="w-fit rounded-md">
                  {kbCandidates.length} candidates
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[640px] pr-3">
                <div className="grid gap-3 xl:grid-cols-2">
                  {kbCandidates.map((row) => (
                    <LearningRow
                      key={row.id}
                      row={row}
                      onPromote={handleOpenPromote}
                    />
                  ))}
                  {!kbCandidates.length && (
                    <div className="col-span-full py-12 text-center">
                      <Sparkles className="mx-auto h-8 w-8 text-muted-foreground/50 mb-2" />
                      <p className="text-sm font-medium text-foreground">No pending knowledge candidates</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        When the AI identifies questions missing from your knowledge base, they will appear here with a 1-click promotion button.
                      </p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: Sources */}
        <TabsContent value="sources" className="space-y-4">
          <Card className="border-border/60 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <CardTitle className="text-base">Source Coverage</CardTitle>
                  <p className="mt-1 text-sm text-muted-foreground">Open a category to inspect exactly what the AI can retrieve from it.</p>
                </div>
                <Badge variant="secondary" className="w-fit rounded-md">
                  {selectedCategoryCount} {sourceCategory === 'all' ? 'total entries' : 'entries'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {sourceCategoryOptions.map(([category, count]) => {
                  const selected = sourceCategory === category;
                  return (
                    <button
                      key={category}
                      type="button"
                      onClick={() => setSourceCategory(category)}
                      className={cn(
                        'flex min-w-[150px] items-center justify-between gap-3 rounded-lg border px-3 py-2 text-left text-sm transition-colors',
                        selected
                          ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                          : 'border-border/70 bg-background hover:border-primary/50 hover:bg-muted/60'
                      )}
                    >
                      <span className="truncate font-medium">{category === 'all' ? 'All sources' : category}</span>
                      <span className={cn('rounded-md px-2 py-0.5 text-xs font-semibold', selected ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-muted text-muted-foreground')}>
                        {count}
                      </span>
                    </button>
                  );
                })}
                {!categories.length && <p className="text-sm text-muted-foreground">No source categories loaded.</p>}
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                {sourceCategory === 'all' ? 'All Knowledge Entries' : `${sourceCategory} Knowledge`} ({filteredKnowledge.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[640px] pr-3">
                <div className="grid gap-3 xl:grid-cols-2">
                  {filteredKnowledge.map((entry) => <KnowledgeRow key={entry.id} entry={entry} />)}
                  {!filteredKnowledge.length && <p className="col-span-full p-6 text-center text-sm text-muted-foreground">No source entries match this view.</p>}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 4: Learning Signals */}
        <TabsContent value="learning" className="space-y-4">
          <Card className="border-border/60 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-base"><Sparkles className="h-4 w-4" /> Learning Sections</CardTitle>
                  <p className="mt-1 text-sm text-muted-foreground">Open an intent to inspect the conversations behind that signal.</p>
                </div>
                <Badge variant="secondary" className="w-fit rounded-md">
                  {selectedLearningCount} {learningSection === 'all' ? 'total records' : 'records'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {learningSections.map(([section, count]) => {
                  const selected = learningSection === section;
                  return (
                    <button
                      key={section}
                      type="button"
                      onClick={() => setLearningSection(section)}
                      className={cn(
                        'flex min-w-[170px] items-center justify-between gap-3 rounded-lg border px-3 py-2 text-left text-sm capitalize transition-colors',
                        selected
                          ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                          : 'border-border/70 bg-background hover:border-primary/50 hover:bg-muted/60'
                      )}
                    >
                      <span className="truncate font-medium">{formatSectionLabel(section)}</span>
                      <span className={cn('rounded-md px-2 py-0.5 text-xs font-semibold', selected ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-muted text-muted-foreground')}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base"><Clock className="h-4 w-4" /> {learningSection === 'all' ? 'Recent Conversation Signals' : `${formatSectionLabel(learningSection)} Signals`} ({filteredLearning.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[640px] pr-3">
                <div className="grid gap-3 xl:grid-cols-2">
                  {filteredLearning.map((row) => (
                    <LearningRow
                      key={row.id}
                      row={row}
                      onPromote={handleOpenPromote}
                    />
                  ))}
                  {!filteredLearning.length && <p className="col-span-full p-6 text-center text-sm text-muted-foreground">No learning rows match this view.</p>}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 5: Review & Escalations */}
        <TabsContent value="review" className="space-y-4">
          <Card className="border-border/60 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-base"><FileSearch className="h-4 w-4" /> Review Sections</CardTitle>
                  <p className="mt-1 text-sm text-muted-foreground">Open a review signal to focus on the exact answers that need attention.</p>
                </div>
                <Badge variant="secondary" className="w-fit rounded-md">
                  {selectedReviewCount} {reviewSection === 'all' ? 'total flags' : 'flags'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {reviewSections.map(([section, count]) => {
                  const selected = reviewSection === section;
                  return (
                    <button
                      key={section}
                      type="button"
                      onClick={() => setReviewSection(section)}
                      className={cn(
                        'flex min-w-[190px] items-center justify-between gap-3 rounded-lg border px-3 py-2 text-left text-sm capitalize transition-colors',
                        selected
                          ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                          : 'border-border/70 bg-background hover:border-primary/50 hover:bg-muted/60'
                      )}
                    >
                      <span className="truncate font-medium">{formatSectionLabel(section)}</span>
                      <span className={cn('rounded-md px-2 py-0.5 text-xs font-semibold', selected ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-muted text-muted-foreground')}>
                        {count}
                      </span>
                    </button>
                  );
                })}
                {!reviewRows.length && <p className="text-sm text-muted-foreground">No review flags in the latest learning rows.</p>}
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base"><AlertTriangle className="h-4 w-4 text-destructive" /> {reviewSection === 'all' ? 'Answers To Review' : formatSectionLabel(reviewSection)} ({filteredReview.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[640px] pr-3">
                <div className="grid gap-3 xl:grid-cols-2">
                  {filteredReview.map((row) => (
                    <LearningRow
                      key={row.id}
                      row={row}
                      onPromote={handleOpenPromote}
                    />
                  ))}
                  {!filteredReview.length && <p className="col-span-full p-6 text-center text-sm text-muted-foreground">No review rows match this view.</p>}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 1-Click Promote to Knowledge Base Dialog */}
      <Dialog open={promoteDialogOpen} onOpenChange={setPromoteDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PlusCircle className="h-5 w-5 text-primary" />
              Promote to Permanent Knowledge Base
            </DialogTitle>
            <DialogDescription>
              This fact will be embedded and saved to Pinecone and PostgreSQL so the AI can answer similar questions instantly.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="kb-category">Category</Label>
              <Input
                id="kb-category"
                value={promoteForm.category}
                onChange={(e) => setPromoteForm((prev) => ({ ...prev, category: e.target.value }))}
                placeholder="e.g. Services, Pricing, Preparation, Booking"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="kb-question">Customer Question / Trigger</Label>
              <Textarea
                id="kb-question"
                rows={3}
                value={promoteForm.question}
                onChange={(e) => setPromoteForm((prev) => ({ ...prev, question: e.target.value }))}
                placeholder="The question or topic customers ask about"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="kb-answer">Verified Answer</Label>
              <Textarea
                id="kb-answer"
                rows={4}
                value={promoteForm.answer}
                onChange={(e) => setPromoteForm((prev) => ({ ...prev, answer: e.target.value }))}
                placeholder="The clear, helpful response the AI should provide"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPromoteDialogOpen(false)}
              disabled={isSavingEntry}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveToKB}
              disabled={isSavingEntry}
              className="gap-2"
            >
              {isSavingEntry ? <RefreshCcw className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              Save to Knowledge Base
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}