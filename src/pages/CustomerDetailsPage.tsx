import React, { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getCustomer, getCustomerMessages, toggleCustomerAi, getCustomerPhotoLinks, getCustomerSessionNotes, updateSessionNote, getCustomerSentiment, getAverageActivity, SessionNote } from '../api/customers';
import { getCustomerBookings } from '../api/bookings';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  ArrowLeft,
  User,
  Phone,
  Mail,
  Calendar,
  MessageSquare,
  Activity,
  BarChart3,
  Clock,
  Power,
  CalendarCheck,
  Image as ImageIcon,
  FileText,
  TrendingUp,
  ClipboardList,
  CheckCircle2,
  Smile,
} from 'lucide-react';
import { format, formatDistanceToNow, isToday, isYesterday } from 'date-fns';
import { toast } from 'sonner';
import SendPhotoLinkCard from '../components/ui/SendPhotoLinkCard';
import InvoiceCard from '../components/InvoiceCard';
import { invoicesApi } from '../api/invoices';
import { useAuth } from '@/hooks/useAuth';

const CustomerDetailsPage = () => {
  const { customerId } = useParams<{ customerId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [reviewingNoteId, setReviewingNoteId] = useState<string | null>(null);
  const [reviewNotesText, setReviewNotesText] = useState('');
  const [noteAction, setNoteAction] = useState<'review' | 'approve' | null>(null);
  const [sessionNoteFilter, setSessionNoteFilter] = useState<'all' | 'pending' | 'approved' | 'reviewed' | 'declined'>('pending');

  const { data: customer, isLoading: customerLoading, refetch: refetchCustomer } = useQuery({
    queryKey: ['customer', customerId],
    queryFn: () => getCustomer(customerId!),
    enabled: !!customerId,
  });

  const { data: messages, isLoading: messagesLoading } = useQuery({
    queryKey: ['customer-messages', customerId],
    queryFn: () => getCustomerMessages(customerId!),
    enabled: !!customerId,
  });

  const { data: bookings, isLoading: bookingsLoading } = useQuery({
    queryKey: ['customer-bookings', customerId],
    queryFn: () => getCustomerBookings(customerId!),
    enabled: !!customerId,
  });

  const { data: photoLinks, isLoading: photoLinksLoading } = useQuery({
    queryKey: ['customer-photo-links', customerId],
    queryFn: () => getCustomerPhotoLinks(customerId!),
    enabled: !!customerId,
  });

  const { data: sessionNotes, isLoading: sessionNotesLoading, refetch: refetchSessionNotes } = useQuery({
    queryKey: ['customer-session-notes', customerId],
    queryFn: () => getCustomerSessionNotes(customerId!),
    enabled: !!customerId,
  });

  const { data: invoices, isLoading: invoicesLoading, refetch: refetchInvoices } = useQuery({
    queryKey: ['customer-invoices', customerId],
    queryFn: () => invoicesApi.getInvoicesByCustomer(customerId!),
    enabled: !!customerId,
  });

  // This customer's own sentiment history, and real business-wide averages to
  // compare their activity against (replacing the old business-wide stats that
  // were shown here regardless of which customer's page you were on).
  const { data: sentimentHistory } = useQuery({
    queryKey: ['customer-sentiment', customerId],
    queryFn: () => getCustomerSentiment(customerId!),
    enabled: !!customerId,
  });

  const { data: averageActivity } = useQuery({
    queryKey: ['average-activity'],
    queryFn: getAverageActivity,
  });

  const handleToggleAi = async () => {
    if (!customer) return;
    try {
      await toggleCustomerAi(customer.id, !customer.aiEnabled);
      toast.success(`AI ${!customer.aiEnabled ? 'enabled' : 'disabled'} for this customer`);
      refetchCustomer();
    } catch (error) {
      toast.error('Failed to toggle AI status');
    }
  };

  if (customerLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="p-6 text-red-600 bg-red-50 rounded-lg border border-red-200">
        Customer not found. Please check the customer ID and try again.
      </div>
    );
  }

  const inboundMessages = messages?.filter((m) => m.direction === 'inbound') || [];
  const outboundMessages = messages?.filter((m) => m.direction === 'outbound') || [];
  const lastMessage = messages?.[messages.length - 1];
  const pendingSessionNotesCount = sessionNotes?.filter((n) => n.status === 'pending').length || 0;

  const conversationTimeline = useMemo(() => {
    const list = [...(messages || [])].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    const items: Array<
      | { kind: 'day'; key: string; label: string }
      | { kind: 'message'; key: string; message: typeof list[number] }
    > = [];

    let lastDayKey = '';
    for (const message of list) {
      const dt = new Date(message.createdAt);
      const dayKey = format(dt, 'yyyy-MM-dd');

      if (dayKey !== lastDayKey) {
        const label = isToday(dt)
          ? 'Today'
          : isYesterday(dt)
            ? 'Yesterday'
            : format(dt, 'EEEE, MMM d, yyyy');
        items.push({ kind: 'day', key: `day-${dayKey}`, label });
        lastDayKey = dayKey;
      }

      items.push({ kind: 'message', key: message.id, message });
    }

    return items;
  }, [messages]);

  const visibleSessionNotes = useMemo(() => {
    const list = sessionNotes || [];
    const filtered = sessionNoteFilter === 'all'
      ? list
      : list.filter((note) => note.status === sessionNoteFilter);

    return [...filtered].sort((a, b) => {
      if (a.status === 'pending' && b.status !== 'pending') return -1;
      if (a.status !== 'pending' && b.status === 'pending') return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [sessionNotes, sessionNoteFilter]);

  const getNoteTypeLabel = (type: SessionNote['type']) => {
    if (type === 'external_people') return 'External People';
    if (type === 'external_items') return 'External Items';
    if (type === 'special_request') return 'Special Request';
    return 'Other';
  };

  const getNoteSummary = (note: SessionNote) => {
    const itemsText = note.items?.length > 0 ? note.items.join(', ') : '';
    const detailsText = note.description?.trim() || '';

    if (note.type === 'external_people') return `People: ${itemsText || detailsText || 'No details provided'}`;
    if (note.type === 'external_items') return `Items: ${itemsText || detailsText || 'No details provided'}`;
    if (note.type === 'special_request') return `Request: ${detailsText || itemsText || 'No details provided'}`;
    return `Note: ${detailsText || itemsText || 'No details provided'}`;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-1">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/customers')}
            className="h-9 w-9 p-0"
            aria-label="Back to customers"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center text-white font-semibold text-sm shadow-sm">
                {customer.name ? customer.name.charAt(0).toUpperCase() : '?'}
              </div>
              <div className="absolute -bottom-1 -right-1 bg-background rounded-full p-0.5">
                {customer.platform === 'whatsapp' && (
                  <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
                    <i className="fab fa-whatsapp text-white text-xs" />
                  </div>
                )}
                {customer.platform === 'instagram' && (
                  <div className="w-5 h-5 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center">
                    <i className="fab fa-instagram text-white text-xs" />
                  </div>
                )}
                {customer.platform === 'messenger' && (
                  <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
                    <i className="fab fa-facebook-messenger text-white text-xs" />
                  </div>
                )}
              </div>
            </div>
            <div>
              <h1 className="text-lg font-semibold tracking-tight text-foreground">
                {customer.name || 'Unknown Customer'}
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                Customer since {format(new Date(customer.createdAt), 'MMM d, yyyy')}
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge
            variant={customer.aiEnabled ? 'default' : 'secondary'}
            className={customer.aiEnabled ? 'bg-green-100 text-green-800 border-green-200 hover:bg-green-100' : ''}
          >
            <div className="flex items-center gap-1.5">
              <div className={`w-1.5 h-1.5 rounded-full ${customer.aiEnabled ? 'bg-green-500 animate-pulse' : 'bg-muted-foreground'}`} />
              {customer.aiEnabled ? 'AI Active' : 'AI Paused'}
            </div>
          </Badge>

          {customer.phone && (
            <Button variant="outline" size="sm" asChild className="h-9">
              <a href={`tel:${customer.phone}`} className="flex items-center gap-2">
                <Phone className="h-3.5 w-3.5" />
                <span className="text-xs">Call</span>
              </a>
            </Button>
          )}

          {customer.email && (
            <Button variant="outline" size="sm" asChild className="h-9">
              <a href={`mailto:${customer.email}`} className="flex items-center gap-2">
                <Mail className="h-3.5 w-3.5" />
                <span className="text-xs">Email</span>
              </a>
            </Button>
          )}

          <Button
            onClick={handleToggleAi}
            variant="outline"
            size="sm"
            className="h-9 gap-2"
          >
            <Power className="h-3.5 w-3.5" />
            <span className="text-xs">{customer.aiEnabled ? 'Disable AI' : 'Enable AI'}</span>
          </Button>
        </div>
      </div>

      <Separator />

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Sidebar - Customer Info & Quick Stats */}
        <div className="lg:col-span-1 space-y-4">
          {/* Profile Card */}
          <Card className="overflow-hidden">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <User className="h-4 w-4" />
                Profile Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <Phone className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div className="space-y-0.5">
                    <p className="text-xs text-muted-foreground">Phone</p>
                    <p className="text-sm font-medium">{customer.phone || 'Not provided'}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Mail className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div className="space-y-0.5">
                    <p className="text-xs text-muted-foreground">Email</p>
                    <p className="text-sm font-medium break-all">{customer.email || 'Not provided'}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Activity className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div className="space-y-0.5">
                    <p className="text-xs text-muted-foreground">Platform</p>
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-medium capitalize">{customer.platform}</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div className="space-y-0.5">
                    <p className="text-xs text-muted-foreground">Last Updated</p>
                    <p className="text-sm font-medium">
                      {formatDistanceToNow(new Date(customer.updatedAt), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Communication Stats */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Communication Stats
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <p className="text-xs text-muted-foreground">Total Messages</p>
                  <p className="text-xl font-semibold text-foreground">{messages?.length || 0}</p>
                </div>
                <div className="space-y-1.5">
                  <p className="text-xs text-muted-foreground">Total Bookings</p>
                  <p className="text-xl font-semibold text-foreground">{bookings?.length || 0}</p>
                </div>
                <div className="space-y-1.5">
                  <p className="text-xs text-muted-foreground">Received</p>
                  <p className="text-lg font-semibold text-green-600">{inboundMessages.length}</p>
                </div>
                <div className="space-y-1.5">
                  <p className="text-xs text-muted-foreground">Sent</p>
                  <p className="text-lg font-semibold text-blue-600">{outboundMessages.length}</p>
                </div>
              </div>

              {lastMessage && (
                <div className="pt-3 border-t">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" />
                    Last Contact
                  </div>
                  <p className="text-sm font-medium mt-1">
                    {formatDistanceToNow(new Date(lastMessage.createdAt), { addSuffix: true })}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Photo Links */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <ImageIcon className="h-4 w-4" />
                Photo Links
                <Badge variant="outline" className="ml-auto text-xs font-normal">
                  {photoLinks?.length || 0}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <SendPhotoLinkCard customerId={customer.id} />
              
              {photoLinksLoading ? (
                <div className="flex items-center justify-center py-6">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
                </div>
              ) : photoLinks?.length === 0 ? (
                <div className="py-6 text-center">
                  <ImageIcon className="h-8 w-8 mx-auto text-muted-foreground/30 mb-2" />
                  <p className="text-sm text-muted-foreground">No photo links sent yet</p>
                </div>
              ) : (
                <div className="space-y-3 mt-3">
                  {photoLinks?.slice(0, 3).map((photoLink) => (
                    <div
                      key={photoLink.id}
                      className="p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                    >
                      <a
                        href={photoLink.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-medium text-primary hover:underline break-all"
                      >
                        {photoLink.link}
                      </a>
                      <p className="text-xs text-muted-foreground mt-1.5">
                        {format(new Date(photoLink.sentAt), 'MMM d, yyyy • h:mm a')}
                      </p>
                    </div>
                  ))}
                  {photoLinks && photoLinks.length > 3 && (
                    <p className="text-xs text-center text-muted-foreground pt-1">
                      +{photoLinks.length - 3} more
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Main Content Area */}
        <div className="lg:col-span-3 space-y-6">
          {/* Tabs for Main Content */}
          <Tabs defaultValue="conversation" className="w-full">
            <TabsList className="grid w-full max-w-2xl grid-cols-5">
              <TabsTrigger value="conversation" className="text-xs">
                <MessageSquare className="h-3.5 w-3.5 mr-2" />
                Conversation
                <Badge variant="outline" className="ml-1 h-4 px-1 text-[10px]">{messages?.length || 0}</Badge>
              </TabsTrigger>
              <TabsTrigger value="bookings" className="text-xs">
                <CalendarCheck className="h-3.5 w-3.5 mr-2" />
                Bookings
                <Badge variant="outline" className="ml-1 h-4 px-1 text-[10px]">{bookings?.length || 0}</Badge>
              </TabsTrigger>
              <TabsTrigger value="session-notes" className="text-xs">
                <ClipboardList className="h-3.5 w-3.5 mr-2" />
                Session Notes
                {pendingSessionNotesCount > 0 && (
                  <Badge variant="destructive" className="ml-1 h-4 px-1 text-[10px]">
                    {pendingSessionNotesCount}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="invoices" className="text-xs">
                <FileText className="h-3.5 w-3.5 mr-2" />
                Invoices
                <Badge variant="outline" className="ml-1 h-4 px-1 text-[10px]">{invoices?.length || 0}</Badge>
              </TabsTrigger>
              <TabsTrigger value="insights" className="text-xs">
                <TrendingUp className="h-3.5 w-3.5 mr-2" />
                Insights
              </TabsTrigger>
            </TabsList>

            {/* Conversation Tab */}
            <TabsContent value="conversation" className="mt-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Conversation History</CardTitle>
                  <CardDescription className="text-xs">
                    {messages?.length || 0} total messages • {inboundMessages.length} received • {outboundMessages.length} sent
                  </CardDescription>
                </CardHeader>
                <Separator />
                <CardContent className="p-0">
                  <div className="h-[62vh] md:h-[calc(100vh-16rem)] overflow-y-auto bg-muted/20 p-4">
                    {messagesLoading ? (
                      <div className="flex items-center justify-center h-full">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                      </div>
                    ) : messages?.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-12">
                        <MessageSquare className="h-10 w-10 mb-3 opacity-20" />
                        <p className="text-sm">No messages yet</p>
                        <p className="text-xs mt-1">Start a conversation with the customer</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {conversationTimeline.map((item) => {
                          if (item.kind === 'day') {
                            return (
                              <div key={item.key} className="sticky top-0 z-10 flex justify-center py-1">
                                <span className="rounded-full border border-border bg-background px-3 py-1 text-[11px] font-medium text-muted-foreground">
                                  {item.label}
                                </span>
                              </div>
                            );
                          }

                          const message = item.message;
                          const outbound = message.direction === 'outbound';

                          return (
                            <div key={item.key} className={`flex ${outbound ? 'justify-end' : 'justify-start'}`}>
                              <div
                                className={`max-w-[88%] md:max-w-[76%] rounded-2xl p-3 shadow-sm ${
                                  outbound
                                    ? 'bg-primary text-primary-foreground rounded-br-md'
                                    : 'bg-background border border-border rounded-bl-md'
                                }`}
                              >
                                <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">{message.content}</p>
                                <div className="mt-2 flex items-center justify-between gap-3">
                                  <p className={`text-[11px] ${outbound ? 'text-primary-foreground/75' : 'text-muted-foreground'}`}>
                                    {format(new Date(message.createdAt), 'h:mm a')}
                                  </p>
                                  <Badge
                                    variant="outline"
                                    className={`h-5 text-[10px] ${
                                      outbound
                                        ? 'border-primary-foreground/30 text-primary-foreground/85'
                                        : 'border-border text-muted-foreground'
                                    }`}
                                  >
                                    {outbound ? 'Sent' : 'Customer'}
                                  </Badge>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Bookings Tab */}
            <TabsContent value="bookings" className="mt-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Booking History</CardTitle>
                  <CardDescription className="text-xs">
                    {bookings?.length || 0} total bookings
                  </CardDescription>
                </CardHeader>
                <Separator />
                <CardContent>
                  {bookingsLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                    </div>
                  ) : bookings?.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                      <CalendarCheck className="h-10 w-10 mb-3 opacity-20" />
                      <p className="text-sm">No bookings yet</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {bookings?.map((booking) => (
                        <div
                          key={booking.id}
                          className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                        >
                          <div className="space-y-1">
                            <p className="text-sm font-medium">{booking.service}</p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Calendar className="h-3 w-3" />
                              {format(new Date(booking.dateTime), 'MMM d, yyyy • h:mm a')}
                            </div>
                          </div>
                          <Badge
                            variant={
                              booking.status === 'confirmed'
                                ? 'default'
                                : booking.status === 'cancelled'
                                  ? 'destructive'
                                  : 'secondary'
                            }
                            className="text-xs font-normal"
                          >
                            {booking.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Session Notes Tab */}
            <TabsContent value="session-notes" className="mt-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <ClipboardList className="h-4 w-4" />
                    Session Notes & Preferences
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Items and people customer mentioned bringing to their session
                  </CardDescription>
                </CardHeader>
                <Separator />
                <CardContent className="p-4">
                  <div className="flex flex-wrap gap-2 mb-4">
                    {[
                      { key: 'pending', label: `Pending (${pendingSessionNotesCount})` },
                      { key: 'all', label: `All (${sessionNotes?.length || 0})` },
                      { key: 'approved', label: 'Approved' },
                      { key: 'reviewed', label: 'Reviewed' },
                      { key: 'declined', label: 'Declined' },
                    ].map((item) => (
                      <Button
                        key={item.key}
                        size="sm"
                        variant={sessionNoteFilter === item.key ? 'default' : 'outline'}
                        className="h-7 text-xs"
                        onClick={() => setSessionNoteFilter(item.key as typeof sessionNoteFilter)}
                      >
                        {item.label}
                      </Button>
                    ))}
                  </div>
                  {sessionNotesLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                    </div>
                  ) : visibleSessionNotes.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                      <ClipboardList className="h-10 w-10 mb-3 opacity-20" />
                      <p className="text-sm">No session notes match this filter</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {visibleSessionNotes.map((note) => (
                        <div
                          key={note.id}
                          className={`p-4 rounded-lg border ${
                            note.status === 'pending'
                              ? 'border-amber-200 bg-amber-50/50'
                              : note.status === 'approved'
                              ? 'border-green-200 bg-green-50/50'
                              : note.status === 'declined'
                              ? 'border-red-200 bg-red-50/50'
                              : 'border-border bg-muted/30'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 space-y-2">
                              <div className="flex items-center gap-2">
                                <Badge
                                  variant={
                                    note.type === 'external_people'
                                      ? 'default'
                                      : note.type === 'external_items'
                                      ? 'secondary'
                                      : 'outline'
                                  }
                                  className="text-xs"
                                >
                                  {getNoteTypeLabel(note.type)}
                                </Badge>
                                <Badge
                                  variant={
                                    note.status === 'pending'
                                      ? 'secondary'
                                      : note.status === 'approved'
                                      ? 'default'
                                      : 'secondary'
                                  }
                                  className={`text-xs ${
                                    note.status === 'pending'
                                      ? 'border-amber-300 bg-amber-100 text-amber-800 hover:bg-amber-100'
                                      : ''
                                  }`}
                                >
                                  {note.status}
                                </Badge>
                                {note.booking && (
                                  <Badge variant="outline" className="text-xs">
                                    {note.booking.service}
                                  </Badge>
                                )}
                              </div>
                              
                              <div>
                                <p className="text-sm font-medium mb-1">
                                  {getNoteSummary(note)}
                                </p>
                                {note.description && (
                                  <p className="text-xs text-muted-foreground mb-2">
                                    {note.description}
                                  </p>
                                )}
                                {note.sourceMessage && (
                                  <p className="text-xs text-muted-foreground italic mb-2">
                                    "{note.sourceMessage}"
                                  </p>
                                )}
                                {note.booking && (
                                  <p className="text-xs text-muted-foreground">
                                    Booking: {format(new Date(note.booking.dateTime), 'MMM d, yyyy • h:mm a')}
                                  </p>
                                )}
                              </div>

                              {note.adminNotes && (
                                <div className="mt-2 p-2 bg-background rounded border border-border">
                                  <p className="text-xs font-medium text-muted-foreground mb-1">Admin Notes:</p>
                                  <p className="text-xs">{note.adminNotes}</p>
                                </div>
                              )}

                              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                <span>
                                  {format(new Date(note.createdAt), 'MMM d, yyyy • h:mm a')}
                                </span>
                                {note.reviewedAt && (
                                  <span>
                                    Reviewed {format(new Date(note.reviewedAt), 'MMM d, yyyy')}
                                  </span>
                                )}
                              </div>
                            </div>

                            {note.status === 'pending' && (
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-8 text-xs"
                                  onClick={async () => {
                                    try {
                                      await updateSessionNote(note.id, {
                                        status: 'approved',
                                        reviewedBy: user?.name || user?.email || 'admin',
                                      });
                                      toast.success('Session note approved');
                                      refetchSessionNotes();
                                    } catch (error) {
                                      toast.error('Failed to update note');
                                    }
                                  }}
                                >
                                  <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                                  Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-8 text-xs"
                                  onClick={() => {
                                    setReviewingNoteId(note.id);
                                    setReviewNotesText('');
                                    setNoteAction('approve');
                                  }}
                                >
                                  <FileText className="h-3.5 w-3.5 mr-1" />
                                  Approve + Note
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-8 text-xs"
                                  onClick={() => {
                                    setReviewingNoteId(note.id);
                                    setReviewNotesText('');
                                    setNoteAction('review');
                                  }}
                                >
                                  <Clock className="h-3.5 w-3.5 mr-1" />
                                  Review
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Invoices Tab */}
            <TabsContent value="invoices" className="mt-4">
              <InvoiceCard
                customerId={customer.id}
                invoices={invoices || []}
                isLoading={invoicesLoading}
                onRefresh={refetchInvoices}
              />
            </TabsContent>

            {/* Insights Tab */}
            <TabsContent value="insights" className="mt-4 space-y-4">
              {/* This customer's own sentiment history - not business-wide stats */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Smile className="h-4 w-4" />
                    Customer Sentiment
                  </CardTitle>
                  <CardDescription className="text-xs">Based on this customer's own messages</CardDescription>
                </CardHeader>
                <CardContent>
                  {!sentimentHistory || sentimentHistory.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">No sentiment data yet for this customer</p>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-center gap-4">
                        <div>
                          <p className="text-xs text-muted-foreground">Average Score</p>
                          <p className="text-lg font-semibold">
                            {(sentimentHistory.reduce((sum, s) => sum + s.score, 0) / sentimentHistory.length).toFixed(2)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Readings</p>
                          <p className="text-lg font-semibold">{sentimentHistory.length}</p>
                        </div>
                      </div>
                      <div className="space-y-1.5 pt-2 border-t">
                        {sentimentHistory.slice(0, 5).map((s) => (
                          <div key={s.id} className="flex items-center justify-between text-sm">
                            <Badge
                              variant={s.sentiment.includes('negative') ? 'destructive' : s.sentiment.includes('positive') ? 'default' : 'secondary'}
                              className="text-xs capitalize"
                            >
                              {s.sentiment.replace('_', ' ')}
                            </Badge>
                            <span className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(s.createdAt), { addSuffix: true })}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Real comparison against actual business-wide averages */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Activity vs. Average Customer</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-5">
                    {[
                      { label: 'Messages', value: messages?.length || 0, avg: averageActivity?.avgMessages || 0, color: 'bg-primary' },
                      { label: 'Bookings', value: bookings?.length || 0, avg: averageActivity?.avgBookings || 0, color: 'bg-green-500' },
                    ].map(({ label, value, avg, color }) => {
                      const max = Math.max(value, avg, 1);
                      return (
                        <div key={label}>
                          <div className="flex items-center justify-between mb-1.5">
                            <p className="text-xs font-medium">{label}</p>
                            <p className="text-xs text-muted-foreground">{value} vs avg {avg.toFixed(1)}</p>
                          </div>
                          <div className="space-y-1">
                            <div className="w-full bg-muted rounded-full h-1.5">
                              <div className={`${color} h-1.5 rounded-full`} style={{ width: `${Math.min((value / max) * 100, 100)}%` }} />
                            </div>
                            <div className="w-full bg-muted rounded-full h-1.5">
                              <div className="bg-muted-foreground/40 h-1.5 rounded-full" style={{ width: `${Math.min((avg / max) * 100, 100)}%` }} />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Review session note - replaces the old native prompt() */}
      <Dialog
        open={reviewingNoteId !== null}
        onOpenChange={(open) => {
          if (!open) {
            setReviewingNoteId(null);
            setNoteAction(null);
            setReviewNotesText('');
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{noteAction === 'approve' ? 'Approve Session Note' : 'Review Session Note'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Textarea
              placeholder={noteAction === 'approve' ? 'Add approval notes (optional)...' : 'Add review notes (optional)...'}
              value={reviewNotesText}
              onChange={(e) => setReviewNotesText(e.target.value)}
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setReviewingNoteId(null);
                setNoteAction(null);
                setReviewNotesText('');
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (!reviewingNoteId) return;
                try {
                  await updateSessionNote(reviewingNoteId, {
                    status: noteAction === 'approve' ? 'approved' : 'reviewed',
                    adminNotes: reviewNotesText || undefined,
                    reviewedBy: user?.name || user?.email || 'admin',
                  });
                  toast.success(noteAction === 'approve' ? 'Session note approved' : 'Session note reviewed');
                  refetchSessionNotes();
                  setReviewingNoteId(null);
                  setNoteAction(null);
                  setReviewNotesText('');
                } catch {
                  toast.error('Failed to update note');
                }
              }}
            >
              {noteAction === 'approve' ? 'Approve Note' : 'Save Review'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CustomerDetailsPage;