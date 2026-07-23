import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getCustomers, Customer } from '../api/customers';
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
import { Search, Phone, Mail, Calendar, ChevronRight, X, Users } from 'lucide-react';
import { format } from 'date-fns';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/components/PageHeader';

type PlatformType = 'all' | 'whatsapp' | 'messenger' | 'instagram' | 'other';

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

  const { data: customers, isLoading, error } = useQuery({
    queryKey: ['customers'],
    queryFn: getCustomers,
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
  };

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
    <div className="max-w-6xl mx-auto space-y-6">
      <PageHeader title="Customers" description="Manage and communicate with your customer base" />

      {/* Filters */}
      <Card className="border-border/50">
        <CardContent className="p-4 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search customers by name, phone, or email..."
              className="pl-9 pr-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-medium text-muted-foreground mr-1">Platform:</span>
                {(['all', 'whatsapp', 'messenger', 'instagram', 'other'] as PlatformType[]).map((platform) => (
                  <button
                    key={platform}
                    onClick={() => setPlatformFilter(platform)}
                    className={cn(
                      'px-2.5 py-1 rounded-md text-xs font-medium border transition-colors',
                      platformFilter === platform
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background text-foreground border-border hover:bg-muted'
                    )}
                  >
                    {platform === 'all' ? 'All' : platformMap[platform].label}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-1.5 ml-2">
                <span className="text-xs font-medium text-muted-foreground mr-1">AI Status:</span>
                {(['all', 'active', 'paused'] as const).map((status) => (
                  <button
                    key={status}
                    onClick={() => setAiFilter(status)}
                    className={cn(
                      'px-2.5 py-1 rounded-md text-xs font-medium border transition-colors',
                      aiFilter === status
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background text-foreground border-border hover:bg-muted'
                    )}
                  >
                    {status === 'all' ? 'All' : status === 'active' ? 'Active' : 'Paused'}
                  </button>
                ))}
              </div>
            </div>
            {(searchTerm || platformFilter !== 'all' || aiFilter !== 'all') && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs">
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
                  <TableHead>Joined</TableHead>
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
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => navigate(`/customers/${customer.id}`)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">{getInitials(customer.name)}</AvatarFallback>
                          </Avatar>
                          <span className="text-sm font-medium text-foreground">{customer.name || 'Unknown Customer'}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-0.5">
                          {customer.phone && <div className="flex items-center gap-1.5 text-sm text-muted-foreground"><Phone className="h-3 w-3" />{customer.phone}</div>}
                          {customer.email && <div className="flex items-center gap-1.5 text-sm text-muted-foreground truncate max-w-[180px]"><Mail className="h-3 w-3" />{customer.email}</div>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn('text-xs', platformMap[platform].color)}>{platformMap[platform].label}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <Calendar className="h-3.5 w-3.5" />{format(new Date(customer.createdAt), 'MMM d, yyyy')}
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
