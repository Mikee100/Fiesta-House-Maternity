import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getCustomers, getCustomerActivitySummary, Customer } from '../api/customers';
import { useNavigate } from 'react-router-dom';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, ChevronRight, X, Users } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/components/PageHeader';

type PlatformType = 'all' | 'whatsapp' | 'messenger' | 'instagram' | 'other';
type ActivitySegment = 'all' | 'online' | 'today' | 'yesterday';

const platformMap: Record<string, { label: string; color: string }> = {
  whatsapp: { label: 'WhatsApp', color: 'text-green-600 bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-900/50' },
  messenger: { label: 'Messenger', color: 'text-blue-600 bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-900/50' },
  instagram: { label: 'Instagram', color: 'text-pink-600 bg-pink-50 border-pink-200 dark:bg-pink-900/20 dark:border-pink-900/50' },
  other: { label: 'Other', color: 'text-muted-foreground bg-muted border-border' },
};

const Customers = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [platformFilter, setPlatformFilter] = useState<PlatformType>('all');
  const [aiFilter, setAiFilter] = useState<'all' | 'active' | 'paused'>('all');
  const [segment, setSegment] = useState<ActivitySegment>('online');

  const { data: customers, isLoading, error } = useQuery({
    queryKey: ['customers', segment],
    queryFn: () => getCustomers({ segment }),
  });

  const { data: activitySummary } = useQuery({
    queryKey: ['customers-activity-summary'],
    queryFn: getCustomerActivitySummary,
  });

  const normalizePlatform = (customer: Customer) => {
    let key = (customer.platform || '').toLowerCase();
    if (!platformMap[key] || key === 'other' || !key) {
      if (customer.email?.includes('@whatsapp.local')) key = 'whatsapp';
      else if (customer.email?.includes('@messenger.local')) key = 'messenger';
      else if (customer.email?.includes('@instagram.local')) key = 'instagram';
      else key = 'other';
    }
    return key;
  };

  const filteredCustomers = useMemo(() => {
    if (!customers) return [];
    return customers.filter((customer) => {
      const matchesSearch = searchTerm === '' ||
        (customer.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (customer.phone?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (customer.email?.toLowerCase() || '').includes(searchTerm.toLowerCase());
      const matchesPlatform = platformFilter === 'all' || normalizePlatform(customer) === platformFilter;
      const matchesAiFilter = aiFilter === 'all' ||
        (aiFilter === 'active' && customer.aiEnabled) ||
        (aiFilter === 'paused' && !customer.aiEnabled);
      return matchesSearch && matchesPlatform && matchesAiFilter;
    });
  }, [customers, searchTerm, platformFilter, aiFilter]);

  const getInitials = (name?: string) => {
    if (!name) return '?';
    return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setPlatformFilter('all');
    setAiFilter('all');
    setSegment('online');
  };

  const getLastSeenText = (customer: Customer) => {
    const value = customer.lastActivityAt || customer.updatedAt;
    if (!value) return 'Unknown';
    return formatDistanceToNow(new Date(value), { addSuffix: true });
  };

  const segmentButtons: Array<{ key: ActivitySegment; label: string; count?: number }> = [
    { key: 'online', label: 'Online', count: activitySummary?.onlineNow },
    { key: 'today', label: 'Today', count: activitySummary?.activeToday },
    { key: 'yesterday', label: 'Yesterday', count: activitySummary?.activeYesterday },
    { key: 'all', label: 'All', count: activitySummary?.totalCustomers },
  ];

  if (error) {
    return (
      <Card className="border-destructive/30">
        <CardContent className="pt-6 text-center space-y-3">
          <Users className="h-8 w-8 text-destructive mx-auto" />
          <div>
            <h3 className="font-medium text-foreground">Error loading customers</h3>
            <p className="text-sm text-muted-foreground mt-1">Please try again later</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => window.location.reload()}>Retry</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-4">
      <PageHeader title="Customers" description="Manage and communicate with your customer base" />

      <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
        <Card className="border-border/50"><CardContent className="p-3"><p className="text-[11px] text-muted-foreground">Online Now</p><p className="text-xl font-semibold">{activitySummary?.onlineNow ?? 0}</p></CardContent></Card>
        <Card className="border-border/50"><CardContent className="p-3"><p className="text-[11px] text-muted-foreground">Active Today</p><p className="text-xl font-semibold">{activitySummary?.activeToday ?? 0}</p></CardContent></Card>
        <Card className="border-border/50"><CardContent className="p-3"><p className="text-[11px] text-muted-foreground">Yesterday</p><p className="text-xl font-semibold">{activitySummary?.activeYesterday ?? 0}</p></CardContent></Card>
        <Card className="border-border/50"><CardContent className="p-3"><p className="text-[11px] text-muted-foreground">New Today</p><p className="text-xl font-semibold">{activitySummary?.newToday ?? 0}</p></CardContent></Card>
        <Card className="border-border/50"><CardContent className="p-3"><p className="text-[11px] text-muted-foreground">AI Paused</p><p className="text-xl font-semibold">{activitySummary?.pausedAi ?? 0}</p></CardContent></Card>
        <Card className="border-border/50"><CardContent className="p-3"><p className="text-[11px] text-muted-foreground">Total</p><p className="text-xl font-semibold">{activitySummary?.totalCustomers ?? 0}</p></CardContent></Card>
      </div>

      {/* Filters */}
      <Card className="border-border/50">
        <CardContent className="p-3">
          <div className="flex flex-wrap gap-2 mb-2">
            {segmentButtons.map((s) => (
              <Button
                key={s.key}
                size="sm"
                variant={segment === s.key ? 'default' : 'outline'}
                className="h-8"
                onClick={() => setSegment(s.key)}
              >
                {s.label} {typeof s.count === 'number' ? `(${s.count})` : ''}
              </Button>
            ))}
          </div>
          <div className="flex flex-col md:flex-row gap-2 md:items-center">
            <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search customers by name, phone, or email..."
              className="pl-9 pr-9 h-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
              </button>
            )}
            </div>

            <Select value={platformFilter} onValueChange={(v) => setPlatformFilter(v as PlatformType)}>
              <SelectTrigger className="h-9 w-full md:w-[140px]">
                <SelectValue placeholder="Platform" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Platforms</SelectItem>
                <SelectItem value="whatsapp">WhatsApp</SelectItem>
                <SelectItem value="messenger">Messenger</SelectItem>
                <SelectItem value="instagram">Instagram</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>

            <Select value={aiFilter} onValueChange={(v) => setAiFilter(v as 'all' | 'active' | 'paused')}>
              <SelectTrigger className="h-9 w-full md:w-[130px]">
                <SelectValue placeholder="AI Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All AI</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="paused">Paused</SelectItem>
              </SelectContent>
            </Select>

            {(searchTerm || platformFilter !== 'all' || aiFilter !== 'all') && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs h-9 md:ml-auto">
                <X className="h-3 w-3 mr-1" /> Clear filters
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Customers Table */}
      <Card className="border-border/50 overflow-hidden">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-3 p-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-4 p-2">
                  <Skeleton className="h-9 w-9 rounded-full" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredCustomers.length === 0 ? (
            <div className="text-center py-16">
              <Users className="h-8 w-8 text-muted-foreground mx-auto mb-3 opacity-50" />
              <h3 className="font-medium text-foreground mb-1">No customers found</h3>
              <p className="text-sm text-muted-foreground mb-3">
                {searchTerm ? 'Try adjusting your search or filters' : 'Customers will appear here once they message you'}
              </p>
              {searchTerm && <Button variant="outline" size="sm" onClick={clearFilters}>Clear all filters</Button>}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Platform</TableHead>
                  <TableHead>Last Active</TableHead>
                  <TableHead>AI Status</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCustomers.map((customer) => {
                  const platform = normalizePlatform(customer);
                  return (
                    <TableRow
                      key={customer.id}
                      className="cursor-pointer hover:bg-muted/50 h-14"
                      onClick={() => navigate(`/customers/${customer.id}`)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <Avatar className="h-7 w-7">
                            <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">{getInitials(customer.name)}</AvatarFallback>
                          </Avatar>
                          <span className="text-sm font-medium text-foreground">{customer.name || 'Unknown Customer'}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-0.5 text-sm text-muted-foreground leading-tight">
                          {customer.phone && <div>{customer.phone}</div>}
                          {customer.email && <div className="truncate max-w-[220px]">{customer.email}</div>}
                          {customer.lastMessagePreview && <div className="truncate max-w-[220px] text-xs">{customer.lastMessagePreview}</div>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn('text-xs', platformMap[platform].color)}>{platformMap[platform].label}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        <div className="leading-tight">
                          <div>{getLastSeenText(customer)}</div>
                          <div className="text-xs">{format(new Date(customer.lastActivityAt || customer.updatedAt), 'MMM d, h:mm a')}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={customer.aiEnabled ? 'default' : 'secondary'} className="text-xs">
                          {customer.aiEnabled ? 'Active' : 'Paused'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Customers;
