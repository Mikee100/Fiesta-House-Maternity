import { useState, useEffect, useMemo } from 'react';
import { DataTable, Badge } from '@/components/DataTable';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import { Label } from '@/components/ui/label';
import {
  Search, Plus, Calendar as CalendarIcon, Clock, RefreshCw, CheckCircle, FileText, Send,
  MoreVertical, Edit, History, X, Check, Info, CreditCard, Download, ExternalLink, ShieldCheck, Bell, MessageCircle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { listBookings, getServices, getAvailableHours, updateBookingDraft, getCalendarEvents, getBooking, updateBooking, Service, Package } from '@/api/bookings';
import { invoicesApi, Invoice } from '@/api/invoices';
import { followupsApi, Followup } from '@/api/followups';
import { remindersApi, Reminder } from '@/api/reminders';
import { getCustomer } from '@/api/customers';
import { getCustomerBookings } from '@/api/bookings';
import axios from 'axios';
import { API_BASE_URL as API_BASE } from '@/config';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { getPackageColor } from '@/utils/packageColors';
import { PageHeader } from '@/components/PageHeader';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { DayContentProps } from 'react-day-picker';

interface Booking {
  id: string;
  customerName: string;
  customerPhone?: string;
  service: string;
  date: Date;
  time: string;
  status: 'provisional' | 'confirmed' | 'cancelled';
  googleEventId?: string;
}

/** Format a raw phone string for display (e.g. 254721840961 -> +254 721 840 961) */
function formatPhoneDisplay(phone: string): string {
  if (!phone || !phone.trim()) return phone;
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 9) return phone;
  if (digits.length >= 12) {
    return `+${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 9)} ${digits.slice(9)}`;
  }
  return `+${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
}

/** Shorten "Messenger User 24720119027667423" to "Messenger - ...7623" */
function shortenMessengerDisplay(name: string): string {
  if (!name || !name.trim()) return name;
  const match = name.match(/^Messenger\s+User\s+(\d+)$/i);
  if (match) return `Messenger - ...${match[1].slice(-4)}`;
  return name;
}

function generateFallbackHours(date: Date): { time: string; available: boolean }[] {
  const hours: { time: string; available: boolean }[] = [];
  const baseDate = new Date(date);
  baseDate.setHours(9, 0, 0, 0);
  for (let h = 9; h < 17; h++) {
    for (let m = 0; m < 60; m += 30) {
      const slot = new Date(baseDate);
      slot.setHours(h, m, 0, 0);
      hours.push({ time: slot.toISOString(), available: true });
    }
  }
  return hours;
}

export default function Bookings() {
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [packageFilter, setPackageFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedService, setSelectedService] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [services, setServices] = useState<Service[]>([]);
  const [availableHours, setAvailableHours] = useState<{ time: string; available: boolean }[]>([]);
  const [creating, setCreating] = useState(false);
  const [packages, setPackages] = useState<Package[]>([]);
  const [selectedPackage, setSelectedPackage] = useState<string>('');
  const [isPaymentPending, setIsPaymentPending] = useState(false);
  const [recipientName, setRecipientName] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'mpesa' | 'pod'>('mpesa');

  const [calendarEvents, setCalendarEvents] = useState<any[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [invoices, setInvoices] = useState<Record<string, Invoice>>({});
  const [generatingInvoice, setGeneratingInvoice] = useState<string | null>(null);

  const [statistics, setStatistics] = useState({ total: 0, confirmed: 0, provisional: 0, cancelled: 0, revenue: 0 });

  const [selectedBookingDetails, setSelectedBookingDetails] = useState<Booking | null>(null);
  const [bookingDetailsOpen, setBookingDetailsOpen] = useState(false);
  const [loadingBookingDetails, setLoadingBookingDetails] = useState(false);
  const [fullBookingData, setFullBookingData] = useState<any>(null);
  const [bookingReminders, setBookingReminders] = useState<Reminder[]>([]);
  const [bookingFollowups, setBookingFollowups] = useState<Followup[]>([]);
  const [bookingPayments, setBookingPayments] = useState<any[]>([]);

  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState<Date | undefined>(undefined);
  const [rescheduleTime, setRescheduleTime] = useState<string>('');
  const [rescheduleService, setRescheduleService] = useState<string>('');
  const [savingBooking, setSavingBooking] = useState(false);
  const [rescheduleAvailableHours, setRescheduleAvailableHours] = useState<{ time: string; available: boolean }[]>([]);
  const [loadingRescheduleHours, setLoadingRescheduleHours] = useState(false);

  const [customerContextOpen, setCustomerContextOpen] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [customerHistory, setCustomerHistory] = useState<any>(null);
  const [loadingCustomerHistory, setLoadingCustomerHistory] = useState(false);
  const [showCalendarPanel, setShowCalendarPanel] = useState(false);

  const getPackageById = (id: string) => packages.find(pkg => pkg.id === id);

  const fetchBookings = async () => {
    try {
      const response = await listBookings();
      const formatted: Booking[] = response.bookings.map((b: any) => {
        const isId = (str: string) => !!str && /^[a-z0-9]{20,}$/i.test(str.trim());
        let name = b.customer.name;
        if (name && name.startsWith('WhatsApp User ')) name = name.replace(/^WhatsApp User\s+/, '');
        name = shortenMessengerDisplay(name);
        if (!name || name.trim().toLowerCase() === 'admin user' || isId(name)) {
          name = b.customer.phone && !isId(b.customer.phone) ? formatPhoneDisplay(b.customer.phone) : 'No Name / No Phone';
        }
        return {
          id: b.id,
          customerName: name,
          customerPhone: b.customer.phone ? formatPhoneDisplay(b.customer.phone) : '',
          service: b.service,
          date: new Date(b.dateTime),
          time: new Date(b.dateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          status: b.status,
          googleEventId: b.googleEventId,
        };
      });
      setBookings(formatted);
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to load bookings', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const fetchServices = async () => {
    try {
      const data = await getServices();
      setServices(data);
      if (data.length > 0) setSelectedService(data[0].name);
    } catch {
      toast({ title: 'Error', description: 'Failed to load services', variant: 'destructive' });
    }
  };

  const fetchPackages = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/bookings/packages`);
      const pkgs = Array.isArray(res.data) ? res.data : [];
      setPackages(pkgs);
      if (pkgs.length > 0) {
        setSelectedPackage(pkgs[0].id);
        setSelectedService(pkgs[0].name);
      }
    } catch {
      setPackages([]);
    }
  };

  const fetchCalendarEvents = async () => {
    try {
      setCalendarEvents(await getCalendarEvents());
    } catch {
      toast({ title: 'Error', description: 'Failed to load calendar events', variant: 'destructive' });
    }
  };

  const fetchInvoices = async () => {
    try {
      const all = await invoicesApi.getAllInvoices();
      const map: Record<string, Invoice> = {};
      all.forEach(inv => { map[inv.bookingId] = inv; });
      setInvoices(map);
    } catch (error) {
      console.error('Failed to fetch invoices:', error);
    }
  };

  const fetchStatistics = async () => {
    try {
      const [statusCounts, revenue] = await Promise.all([
        axios.get(`${API_BASE}/api/analytics/booking-status-counts`).catch(() => ({ data: {} })),
        axios.get(`${API_BASE}/api/analytics/revenue`).catch(() => ({ data: { total: 0 } })),
      ]);
      setStatistics({
        total: bookings.length,
        confirmed: statusCounts.data?.confirmed || 0,
        provisional: statusCounts.data?.provisional || 0,
        cancelled: statusCounts.data?.cancelled || 0,
        revenue: revenue.data?.total || 0,
      });
    } catch (error) {
      console.error('Failed to fetch statistics:', error);
    }
  };

  useEffect(() => {
    fetchBookings();
    fetchServices();
    fetchPackages();
    fetchCalendarEvents();
    fetchInvoices();
    // Lighter polling than a full-page refresh every few seconds - just enough
    // to catch bookings made via WhatsApp/Instagram while this page is open.
    const pollInterval = setInterval(() => {
      fetchBookings();
      fetchCalendarEvents();
    }, 20000);
    return () => clearInterval(pollInterval);
  }, []);

  useEffect(() => {
    if (bookings.length > 0) fetchStatistics();
  }, [bookings]);

  useEffect(() => {
    if (selectedPackage && packages.length > 0) {
      const pkg = packages.find(p => p.id === selectedPackage);
      if (pkg && pkg.name !== selectedService) setSelectedService(pkg.name);
    }
  }, [selectedPackage, packages]);

  useEffect(() => {
    if (!selectedDate) {
      setAvailableHours([]);
      return;
    }
    const pad = (n: number) => n.toString().padStart(2, '0');
    const dateStr = `${selectedDate.getFullYear()}-${pad(selectedDate.getMonth() + 1)}-${pad(selectedDate.getDate())}`;
    getAvailableHours(dateStr, selectedService)
      .then(hours => setAvailableHours(Array.isArray(hours) && hours.length > 0 ? hours : generateFallbackHours(selectedDate)))
      .catch(() => setAvailableHours(generateFallbackHours(selectedDate)));
  }, [selectedDate, selectedService]);

  useEffect(() => {
    if (!rescheduleDate || !editDialogOpen) {
      setRescheduleAvailableHours([]);
      return;
    }
    setLoadingRescheduleHours(true);
    const pad = (n: number) => n.toString().padStart(2, '0');
    const dateStr = `${rescheduleDate.getFullYear()}-${pad(rescheduleDate.getMonth() + 1)}-${pad(rescheduleDate.getDate())}`;
    getAvailableHours(dateStr, rescheduleService)
      .then(hours => setRescheduleAvailableHours(Array.isArray(hours) ? hours : []))
      .catch(() => setRescheduleAvailableHours(generateFallbackHours(rescheduleDate)))
      .finally(() => setLoadingRescheduleHours(false));
  }, [rescheduleDate, rescheduleService, editDialogOpen]);

  const handleSyncCalendar = async () => {
    setSyncing(true);
    try {
      await axios.post(`${API_BASE}/api/calendar/sync`);
      toast({ title: 'Calendar Synced', description: 'All confirmed bookings have been synced to Google Calendar' });
      fetchBookings();
    } catch {
      toast({ title: 'Sync Failed', description: 'Failed to sync calendar. Check your Google Calendar setup.', variant: 'destructive' });
    } finally {
      setSyncing(false);
    }
  };

  const handleGenerateInvoice = async (bookingId: string) => {
    setGeneratingInvoice(bookingId);
    try {
      const invoice = await invoicesApi.generateInvoice(bookingId);
      setInvoices(prev => ({ ...prev, [bookingId]: invoice }));
      toast({ title: 'Invoice Generated', description: `Invoice ${invoice.invoiceNumber} created successfully` });
    } catch {
      toast({ title: 'Error', description: 'Failed to generate invoice', variant: 'destructive' });
    } finally {
      setGeneratingInvoice(null);
    }
  };

  const handleSendInvoice = async (invoiceId: string, customerName: string) => {
    try {
      await invoicesApi.sendInvoice(invoiceId);
      toast({ title: 'Invoice Sent', description: `Invoice sent to ${customerName} via WhatsApp` });
      setInvoices(prev => {
        const key = Object.keys(prev).find(k => prev[k].id === invoiceId) || '';
        return { ...prev, [key]: { ...prev[key], status: 'sent' as const, sentAt: new Date().toISOString() } };
      });
    } catch {
      toast({ title: 'Error', description: 'Failed to send invoice', variant: 'destructive' });
    }
  };

  const handleCreateBooking = async () => {
    if (!selectedDate || !selectedTime || !selectedService || !user || !selectedPackage) return;
    if (!recipientName || !recipientPhone || recipientPhone.trim().length < 8) {
      toast({ title: 'Missing info', description: 'Please provide the customer name and a valid phone number.', variant: 'destructive' });
      return;
    }

    setCreating(true);
    try {
      const dateTime = new Date(selectedDate);
      const [hours, minutes] = selectedTime.split(':').map(Number);
      dateTime.setHours(hours, minutes);

      await updateBookingDraft(user.id, {
        service: selectedService,
        packageId: selectedPackage,
        dateTimeIso: dateTime.toISOString(),
        name: recipientName,
        recipientName,
        recipientPhone,
      });

      if (paymentMethod === 'pod') {
        const response = await fetch(`${API_BASE}/api/bookings/complete-pod/${user.id}`, { method: 'POST' });
        if (!response.ok) throw new Error('Failed to confirm Pay on Delivery booking');
        setIsDialogOpen(false);
        fetchBookings();
        toast({ title: 'Booking Confirmed!', description: 'Your Pay on Delivery booking has been confirmed.' });
        setCreating(false);
        return;
      }

      const result = await fetch(`${API_BASE}/api/bookings/complete-draft/${user.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await result.json();
      toast({ title: 'Payment Required', description: data.message || 'Please complete the payment on your phone to confirm the booking.' });

      setIsDialogOpen(false);
      setTimeout(() => setIsPaymentPending(true), 0);

      const checkoutRequestId = data.checkoutRequestId;
      if (!checkoutRequestId) throw new Error('No checkoutRequestId returned from backend');

      const { pollPaymentStatus } = await import('@/api/payments');
      let pollCount = 0;
      const maxPolls = 40;
      let status = 'pending';
      while (pollCount < maxPolls) {
        try {
          const res = await pollPaymentStatus(checkoutRequestId);
          if (res && typeof res.status !== 'undefined') {
            status = res.status;
            if (status === 'success' || status === 'confirmed') {
              toast({ title: 'Booking Confirmed!', description: 'Your payment was received and your booking is now confirmed.' });
              fetchBookings();
              setIsPaymentPending(false);
              setSelectedDate(new Date());
              setSelectedTime('');
              setCreating(false);
              return;
            }
          }
        } catch (pollError) {
          console.warn('[pollPaymentStatus] request failed:', pollError);
        }
        await new Promise(resolve => setTimeout(resolve, 3000));
        pollCount++;
      }
      setIsPaymentPending(false);
      if (status !== 'success' && status !== 'confirmed') {
        toast({ title: 'Payment Pending', description: `We did not receive payment confirmation in time. Last status: ${status}.` });
      }
      setSelectedDate(new Date());
      setSelectedTime('');
    } catch {
      setIsPaymentPending(false);
      toast({ title: 'Error', description: 'Failed to initiate payment or booking', variant: 'destructive' });
    } finally {
      setCreating(false);
    }
  };

  const filteredBookings = bookings.filter((booking) => {
    const matchesSearch =
      booking.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.service.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.customerPhone?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || booking.status === statusFilter;
    const matchesPackage = packageFilter === 'all' || booking.service === packageFilter;
    const matchesDateRange = !dateRange.from || !dateRange.to || (booking.date >= dateRange.from && booking.date <= dateRange.to);
    return matchesSearch && matchesStatus && matchesPackage && matchesDateRange;
  });

  const fetchBookingDetails = async (booking: Booking) => {
    setLoadingBookingDetails(true);
    setSelectedBookingDetails(booking);
    setBookingDetailsOpen(true);
    try {
      const bookingData: any = await getBooking(booking.id);
      setFullBookingData(bookingData);

      if (bookingData.payments) {
        setBookingPayments(Array.isArray(bookingData.payments) ? bookingData.payments : []);
      } else {
        try {
          const payments = await axios.get(`${API_BASE}/api/payments`, { params: { bookingId: booking.id } });
          setBookingPayments(Array.isArray(payments.data) ? payments.data : []);
        } catch { setBookingPayments([]); }
      }

      if (bookingData.reminders) {
        setBookingReminders(Array.isArray(bookingData.reminders) ? bookingData.reminders : []);
      } else {
        try {
          const reminders = await remindersApi.getBookingReminders(booking.id);
          setBookingReminders(Array.isArray(reminders) ? reminders : []);
        } catch { setBookingReminders([]); }
      }

      if (bookingData.followups) {
        setBookingFollowups(Array.isArray(bookingData.followups) ? bookingData.followups : []);
      } else {
        try {
          const followups = await followupsApi.getBookingFollowups(booking.id);
          setBookingFollowups(Array.isArray(followups) ? followups : []);
        } catch { setBookingFollowups([]); }
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to load booking details', variant: 'destructive' });
    } finally {
      setLoadingBookingDetails(false);
    }
  };

  const fetchCustomerHistory = async (booking: Booking) => {
    setLoadingCustomerHistory(true);
    setCustomerContextOpen(true);
    try {
      const fullData: any = await getBooking(booking.id);
      const customerId = fullData.customerId || fullData.customer?.id;
      if (!customerId) throw new Error('Customer ID not found');
      setSelectedCustomerId(customerId);

      const [customer, customerBookingsData] = await Promise.all([
        getCustomer(customerId).catch(() => null),
        getCustomerBookings(customerId).catch((): any => []),
      ]);
      const customerBookings = Array.isArray(customerBookingsData) ? customerBookingsData : (customerBookingsData?.bookings || []);

      let totalSpent = 0;
      try {
        const paymentsRes = await axios.get(`${API_BASE}/api/payments`, { params: { customerId } });
        const payments = Array.isArray(paymentsRes.data) ? paymentsRes.data : [];
        totalSpent = payments.filter((p: any) => p.status === 'success').reduce((sum: number, p: any) => sum + (p.amount || 0), 0);
      } catch (err) { console.error('Failed to fetch payments:', err); }

      setCustomerHistory({
        customer: customer || { id: customerId, name: booking.customerName, phone: booking.customerPhone },
        bookings: customerBookings,
        totalSpent,
        totalBookings: customerBookings.length,
      });
    } catch {
      toast({ title: 'Error', description: 'Failed to load customer history', variant: 'destructive' });
    } finally {
      setLoadingCustomerHistory(false);
    }
  };

  const handleRescheduleBooking = async () => {
    if (!editingBooking || !rescheduleDate || !rescheduleTime) {
      toast({ title: 'Missing information', description: 'Please select a new date and time', variant: 'destructive' });
      return;
    }
    setSavingBooking(true);
    try {
      const dateTime = new Date(rescheduleDate);
      const [hours, minutes] = rescheduleTime.split(':').map(Number);
      dateTime.setHours(hours, minutes);
      await updateBooking(editingBooking.id, { dateTime: dateTime.toISOString(), service: rescheduleService || editingBooking.service });
      toast({ title: 'Booking updated', description: 'Booking has been rescheduled successfully' });
      setEditDialogOpen(false);
      setEditingBooking(null);
      fetchBookings();
    } catch (error: any) {
      toast({ title: 'Error', description: error.response?.data?.message || 'Failed to reschedule booking', variant: 'destructive' });
    } finally {
      setSavingBooking(false);
    }
  };

  const handleSendReminder = async (reminderId: string) => {
    try {
      await remindersApi.sendReminder(reminderId);
      toast({ title: 'Reminder sent', description: 'Reminder has been sent to the customer' });
      if (selectedBookingDetails) {
        setBookingReminders(await remindersApi.getBookingReminders(selectedBookingDetails.id));
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to send reminder', variant: 'destructive' });
    }
  };

  const handleSendFollowup = async (followupId: string) => {
    try {
      await followupsApi.sendFollowup(followupId);
      toast({ title: 'Followup sent', description: 'Followup has been sent to the customer' });
      if (selectedBookingDetails) {
        setBookingFollowups(await followupsApi.getBookingFollowups(selectedBookingDetails.id));
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to send followup', variant: 'destructive' });
    }
  };

  const handleQuickAction = async (bookingId: string, action: 'confirm' | 'cancel') => {
    try {
      await axios.post(`${API_BASE}/api/bookings/${bookingId}/${action}`);
      toast({ title: action === 'confirm' ? 'Booking confirmed' : 'Booking cancelled' });
      fetchBookings();
    } catch {
      toast({ title: 'Error', description: `Failed to ${action} booking`, variant: 'destructive' });
    }
  };

  const getStatusVariant = (status: Booking['status']) => {
    switch (status) {
      case 'confirmed': return 'default';
      case 'provisional': return 'secondary';
      case 'cancelled': return 'destructive';
      default: return 'default';
    }
  };

  const bookingsForSelectedDate = selectedDate
    ? bookings.filter(b => b.date.toDateString() === selectedDate.toDateString())
    : [];

  const bookingDateKeys = useMemo(() => {
    const keys = new Set<string>();
    bookings
      .filter((b) => b.status !== 'cancelled')
      .forEach((b) => {
        const d = b.date;
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        keys.add(key);
      });
    return keys;
  }, [bookings]);

  const renderBookingDayContent = ({ date }: DayContentProps) => {
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    const hasBookings = bookingDateKeys.has(key);

    return (
      <div className="relative h-full w-full flex items-center justify-center">
        <span>{date.getDate()}</span>
        {hasBookings && (
          <span
            className="absolute bottom-1 h-1.5 w-1.5 rounded-full bg-primary"
            aria-hidden="true"
          />
        )}
      </div>
    );
  };

  const columns = [
    {
      header: 'Customer',
      accessor: 'customerName' as keyof Booking,
      cell: (row: Booking) => (
        <div className="flex flex-col">
          <span className="font-medium text-foreground">{row.customerName}</span>
          <span className="text-sm text-muted-foreground">{row.customerPhone}</span>
        </div>
      ),
    },
    {
      header: 'Service',
      accessor: 'service' as keyof Booking,
      cell: (row: Booking) => {
        const color = getPackageColor(row.service);
        return (
          <span
            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
            style={{ backgroundColor: `${color}20`, color, border: `1px solid ${color}40` }}
          >
            {row.service}
          </span>
        );
      },
    },
    {
      header: 'Date & Time',
      accessor: (row: Booking) => row.date.toLocaleDateString(),
      cell: (row: Booking) => (
        <div className="flex flex-col">
          <span className="text-foreground">{row.date.toLocaleDateString()}</span>
          <span className="text-sm text-muted-foreground">{row.time}</span>
        </div>
      ),
    },
    {
      header: 'Status',
      accessor: (row: Booking) => (
        <Badge variant={getStatusVariant(row.status)} className="capitalize">{row.status}</Badge>
      ),
    },
    {
      header: 'Invoice',
      accessor: (row: Booking) => {
        const invoice = invoices[row.id];
        if (!invoice) {
          return (
            <Button
              size="sm"
              variant="outline"
              onClick={(e) => { e.stopPropagation(); handleGenerateInvoice(row.id); }}
              disabled={generatingInvoice === row.id || row.status !== 'confirmed'}
              className="h-8"
            >
              <FileText className="h-3.5 w-3.5 mr-1.5" />
              {generatingInvoice === row.id ? 'Generating...' : 'Generate'}
            </Button>
          );
        }
        return (
          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            <Button size="sm" variant="outline" className="h-8 w-8 p-0" onClick={() => window.open(invoicesApi.downloadInvoice(invoice.id), '_blank')} title="Download PDF">
              <Download className="h-3.5 w-3.5" />
            </Button>
            <Button size="sm" variant="outline" className="h-8" onClick={() => handleSendInvoice(invoice.id, row.customerName)} disabled={invoice.status === 'sent'}>
              <Send className="h-3.5 w-3.5 mr-1.5" />
              {invoice.status === 'sent' ? 'Sent' : 'Send'}
            </Button>
          </div>
        );
      },
    },
    {
      header: 'Actions',
      accessor: (row: Booking) => (
        <Popover>
          <PopoverTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0"><MoreVertical className="h-4 w-4" /></Button>
          </PopoverTrigger>
          <PopoverContent className="w-56" onClick={(e) => e.stopPropagation()}>
            <div className="space-y-1">
              <Button variant="ghost" className="w-full justify-start" onClick={() => fetchBookingDetails(row)}>
                <Info className="h-4 w-4 mr-2" /> View Details
              </Button>
              <Button
                variant="ghost"
                className="w-full justify-start"
                onClick={() => {
                  setEditingBooking(row);
                  setRescheduleDate(row.date);
                  setRescheduleTime(row.time);
                  setRescheduleService(row.service);
                  setEditDialogOpen(true);
                }}
              >
                <Edit className="h-4 w-4 mr-2" /> Edit/Reschedule
              </Button>
              <Button variant="ghost" className="w-full justify-start" onClick={() => fetchCustomerHistory(row)}>
                <History className="h-4 w-4 mr-2" /> Customer History
              </Button>
              {row.status === 'provisional' && (
                <Button variant="ghost" className="w-full justify-start" onClick={() => handleQuickAction(row.id, 'confirm')}>
                  <Check className="h-4 w-4 mr-2" /> Confirm
                </Button>
              )}
              {row.status !== 'cancelled' && (
                <Button variant="ghost" className="w-full justify-start text-destructive hover:text-destructive" onClick={() => handleQuickAction(row.id, 'cancel')}>
                  <X className="h-4 w-4 mr-2" /> Cancel
                </Button>
              )}
            </div>
          </PopoverContent>
        </Popover>
      ),
    },
  ];

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <PageHeader
        title="Bookings"
        description="Manage appointments and schedules"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowCalendarPanel(v => !v)}>
              <CalendarIcon className="h-4 w-4 mr-2" />
              {showCalendarPanel ? 'Hide Calendar' : 'Show Calendar'}
            </Button>
            <Button variant="outline" size="sm" onClick={handleSyncCalendar} disabled={syncing}>
              <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Syncing...' : 'Sync Calendar'}
            </Button>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm"><Plus className="h-4 w-4 mr-2" /> New Booking</Button>
              </DialogTrigger>
            </Dialog>
          </div>
        }
      />

      <Card className="border-border/50">
        <CardContent className="p-3">
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <span><span className="text-muted-foreground">Total:</span> <span className="font-semibold">{statistics.total}</span></span>
            <span><span className="text-muted-foreground">Confirmed:</span> <span className="font-semibold">{statistics.confirmed}</span></span>
            <span><span className="text-muted-foreground">Provisional:</span> <span className="font-semibold">{statistics.provisional}</span></span>
            <span><span className="text-muted-foreground">Revenue:</span> <span className="font-semibold">KSh {statistics.revenue.toLocaleString()}</span></span>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card className="border-border/50">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search by name, service, or phone..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9" />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="provisional">Provisional</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Select value={packageFilter} onValueChange={setPackageFilter}>
              <SelectTrigger className="w-full sm:w-[180px]"><SelectValue placeholder="All packages" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Packages</SelectItem>
                {packages.map((pkg) => <SelectItem key={pkg.id} value={pkg.name}>{pkg.name}</SelectItem>)}
              </SelectContent>
            </Select>
            {(dateRange.from || dateRange.to || statusFilter !== 'all' || packageFilter !== 'all' || searchTerm) && (
              <Button variant="ghost" size="sm" onClick={() => { setDateRange({}); setStatusFilter('all'); setPackageFilter('all'); setSearchTerm(''); }}>
                <X className="h-4 w-4 mr-1" /> Clear
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <div className={`grid gap-6 ${showCalendarPanel ? 'lg:grid-cols-3' : 'grid-cols-1'}`}>
        {showCalendarPanel && (
          <Card className="border-border/50 lg:col-span-1">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-medium">Calendar</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-4">
              <Calendar mode="single" selected={selectedDate} onSelect={setSelectedDate} className="rounded-md border" dayContent={renderBookingDayContent} />
              <div className="w-full space-y-2">
                <p className="text-sm font-medium text-foreground">
                  {selectedDate ? selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }) : 'Select a date'}
                </p>
                {bookingsForSelectedDate.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">No bookings for this date</p>
                ) : (
                  <div className="space-y-2 max-h-[240px] overflow-y-auto">
                    {bookingsForSelectedDate.map(booking => (
                      <div key={booking.id} className="flex items-center gap-2 p-2 rounded-md border border-border/50 text-sm">
                        <div className="h-2 w-2 rounded-full flex-shrink-0" style={{ backgroundColor: getPackageColor(booking.service) }} />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{booking.customerName}</p>
                          <p className="text-xs text-muted-foreground">{booking.time} - {booking.service}</p>
                        </div>
                        <Badge variant={getStatusVariant(booking.status)} className="capitalize text-[10px]">{booking.status}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Table */}
        <Card className={`border-border/50 overflow-hidden ${showCalendarPanel ? 'lg:col-span-2' : 'col-span-1'}`}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium flex items-center justify-between">
              All Bookings
              <span className="text-sm font-normal text-muted-foreground">{filteredBookings.length} found</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <DataTable data={filteredBookings} columns={columns} onRowClick={(booking) => fetchBookingDetails(booking)} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payment Pending Modal */}
      <Dialog open={isPaymentPending} onOpenChange={setIsPaymentPending}>
        <DialogContent className="sm:max-w-md">
          <div className="flex flex-col items-center justify-center gap-4 py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
            <h3 className="text-lg font-semibold text-foreground">Waiting for Payment</h3>
            <p className="text-center text-muted-foreground text-sm max-w-xs">Please complete the payment on your phone to confirm the booking.</p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Booking Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Create New Booking</DialogTitle></DialogHeader>
          <div className="grid gap-5 py-2">
            <div className="grid gap-2">
              <Label htmlFor="recipientName">Customer Name</Label>
              <Input id="recipientName" value={recipientName} onChange={e => setRecipientName(e.target.value)} placeholder="Enter customer name" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="recipientPhone">Phone Number</Label>
              <Input id="recipientPhone" value={recipientPhone} onChange={e => setRecipientPhone(e.target.value)} placeholder="Enter phone number" />
            </div>
            <div className="grid gap-2">
              <Label>Package</Label>
              <Select value={selectedPackage} onValueChange={val => { setSelectedPackage(val); const pkg = getPackageById(val); if (pkg) setSelectedService(pkg.name); }}>
                <SelectTrigger><SelectValue placeholder="Select a package" /></SelectTrigger>
                <SelectContent>
                  {packages.map((pkg) => (
                    <SelectItem key={pkg.id} value={pkg.id}>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: getPackageColor(pkg.name) }} />
                        <span>{pkg.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Date</Label>
                <Calendar mode="single" selected={selectedDate} onSelect={setSelectedDate} className="rounded-md border" />
              </div>
              <div className="grid gap-2">
                <Label>Time</Label>
                <div className="border rounded-md p-1 h-[280px] overflow-y-auto">
                  {availableHours.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-4 text-center">
                      <Clock className="h-6 w-6 mb-2 opacity-30" />
                      <p className="text-sm">Select a date and package first.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2 p-2">
                      {availableHours.map(({ time, available }) => {
                        const d = new Date(time);
                        const timeStr = d.toTimeString().split(' ')[0];
                        return (
                          <Button
                            key={time}
                            variant={selectedTime === timeStr ? 'default' : 'outline'}
                            onClick={() => setSelectedTime(timeStr)}
                            className={!available ? 'opacity-70' : ''}
                            size="sm"
                            title={!available ? 'This time slot may be occupied' : ''}
                          >
                            {d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            {!available && <span className="ml-1 text-xs">!</span>}
                          </Button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Payment Method</Label>
              <RadioGroup value={paymentMethod} onValueChange={(val: any) => setPaymentMethod(val)} className="grid grid-cols-2 gap-4">
                <div>
                  <RadioGroupItem value="mpesa" id="mpesa" className="peer sr-only" />
                  <Label htmlFor="mpesa" className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent [&:has([data-state=checked])]:border-primary">
                    <CreditCard className="mb-2 h-5 w-5" /> M-Pesa
                  </Label>
                </div>
                <div>
                  <RadioGroupItem value="pod" id="pod" className="peer sr-only" />
                  <Label htmlFor="pod" className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent [&:has([data-state=checked])]:border-primary">
                    <ShieldCheck className="mb-2 h-5 w-5" /> Pay on Delivery
                  </Label>
                </div>
              </RadioGroup>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2 border-t">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateBooking} disabled={creating || !selectedDate || !selectedTime || !selectedService || !selectedPackage || !recipientName || !recipientPhone}>
              {creating ? 'Creating...' : 'Confirm Booking'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Booking Details Modal */}
      <Dialog open={bookingDetailsOpen} onOpenChange={setBookingDetailsOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Booking Details</DialogTitle></DialogHeader>
          {loadingBookingDetails ? (
            <div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" /></div>
          ) : selectedBookingDetails ? (
            <div className="space-y-5">
              <Card>
                <CardContent className="p-4 grid grid-cols-2 gap-4">
                  <div><Label className="text-muted-foreground text-xs">Customer</Label><p className="font-medium">{selectedBookingDetails.customerName}</p></div>
                  <div><Label className="text-muted-foreground text-xs">Phone</Label><p className="font-medium">{selectedBookingDetails.customerPhone || 'N/A'}</p></div>
                  <div><Label className="text-muted-foreground text-xs">Service</Label><p className="font-medium">{selectedBookingDetails.service}</p></div>
                  <div><Label className="text-muted-foreground text-xs">Status</Label><Badge variant={getStatusVariant(selectedBookingDetails.status)} className="capitalize">{selectedBookingDetails.status}</Badge></div>
                  <div><Label className="text-muted-foreground text-xs">Date</Label><p className="font-medium">{selectedBookingDetails.date.toLocaleDateString()}</p></div>
                  <div><Label className="text-muted-foreground text-xs">Time</Label><p className="font-medium">{selectedBookingDetails.time}</p></div>
                </CardContent>
              </Card>

              {bookingPayments.length > 0 && (
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center gap-2"><CreditCard className="h-4 w-4" /> Payments</CardTitle></CardHeader>
                  <CardContent className="space-y-2">
                    {bookingPayments.map((payment: any) => (
                      <div key={payment.id} className="flex items-center justify-between p-2.5 rounded-md border border-border text-sm">
                        <div>
                          <p className="font-medium">KSh {payment.amount?.toLocaleString() || '0'}</p>
                          <Badge variant={payment.status === 'success' ? 'default' : 'secondary'} className="mt-1">{payment.status}</Badge>
                        </div>
                        <span className="text-xs text-muted-foreground">{new Date(payment.createdAt).toLocaleDateString()}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center justify-between"><span className="flex items-center gap-2"><Bell className="h-4 w-4" /> Reminders</span><Badge variant="outline">{bookingReminders.length}</Badge></CardTitle></CardHeader>
                <CardContent>
                  {bookingReminders.length === 0 ? <p className="text-sm text-muted-foreground text-center py-3">No reminders scheduled</p> : (
                    <div className="space-y-2">
                      {bookingReminders.map((reminder) => (
                        <div key={reminder.id} className="flex items-center justify-between p-2.5 rounded-md border border-border text-sm">
                          <div>
                            <div className="flex items-center gap-2"><p className="font-medium">{reminder.type} Reminder</p><Badge variant={reminder.status === 'sent' ? 'default' : reminder.status === 'pending' ? 'secondary' : 'destructive'}>{reminder.status}</Badge></div>
                            <p className="text-xs text-muted-foreground">Scheduled: {new Date(reminder.scheduledFor).toLocaleString()}</p>
                          </div>
                          {reminder.status === 'pending' && <Button size="sm" variant="outline" onClick={() => handleSendReminder(reminder.id)}><Send className="h-3.5 w-3.5 mr-1.5" /> Send Now</Button>}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center justify-between"><span className="flex items-center gap-2"><MessageCircle className="h-4 w-4" /> Followups</span><Badge variant="outline">{bookingFollowups.length}</Badge></CardTitle></CardHeader>
                <CardContent>
                  {bookingFollowups.length === 0 ? <p className="text-sm text-muted-foreground text-center py-3">No followups scheduled</p> : (
                    <div className="space-y-2">
                      {bookingFollowups.map((followup) => (
                        <div key={followup.id} className="flex items-center justify-between p-2.5 rounded-md border border-border text-sm">
                          <div>
                            <div className="flex items-center gap-2"><p className="font-medium capitalize">{followup.type} Followup</p><Badge variant={followup.status === 'sent' ? 'default' : followup.status === 'pending' ? 'secondary' : 'destructive'}>{followup.status}</Badge></div>
                            <p className="text-xs text-muted-foreground">Scheduled: {new Date(followup.scheduledFor).toLocaleString()}</p>
                          </div>
                          {followup.status === 'pending' && <Button size="sm" variant="outline" onClick={() => handleSendFollowup(followup.id)}><Send className="h-3.5 w-3.5 mr-1.5" /> Send Now</Button>}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {invoices[selectedBookingDetails.id] && (
                <Card>
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium">Invoice #{invoices[selectedBookingDetails.id].invoiceNumber}</p>
                      <p className="text-sm text-muted-foreground">Total: KSh {invoices[selectedBookingDetails.id].total?.toLocaleString()}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => window.open(invoicesApi.downloadInvoice(invoices[selectedBookingDetails.id].id), '_blank')}><Download className="h-4 w-4 mr-1.5" /> Download</Button>
                      <Button size="sm" onClick={() => handleSendInvoice(invoices[selectedBookingDetails.id].id, selectedBookingDetails.customerName)} disabled={invoices[selectedBookingDetails.id].status === 'sent'}>
                        <Send className="h-4 w-4 mr-1.5" /> {invoices[selectedBookingDetails.id].status === 'sent' ? 'Sent' : 'Send'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button
                  variant="outline"
                  onClick={() => {
                    setEditingBooking(selectedBookingDetails);
                    setRescheduleDate(selectedBookingDetails.date);
                    setRescheduleTime(selectedBookingDetails.time);
                    setRescheduleService(selectedBookingDetails.service);
                    setBookingDetailsOpen(false);
                    setEditDialogOpen(true);
                  }}
                >
                  <Edit className="h-4 w-4 mr-2" /> Edit/Reschedule
                </Button>
                <Button variant="outline" onClick={() => { fetchCustomerHistory(selectedBookingDetails); setBookingDetailsOpen(false); }}>
                  <History className="h-4 w-4 mr-2" /> View Customer History
                </Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Edit/Reschedule Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Reschedule Booking</DialogTitle></DialogHeader>
          {editingBooking && (
            <div className="space-y-5 py-1">
              {/* What's being rescheduled */}
              <div className="flex items-center justify-between rounded-lg border border-border bg-muted/40 px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-foreground">{editingBooking.customerName}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Currently {editingBooking.date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} at {editingBooking.time}
                  </p>
                </div>
                <Badge variant={getStatusVariant(editingBooking.status)} className="capitalize">{editingBooking.status}</Badge>
              </div>

              <div className="grid gap-2">
                <Label>Service/Package</Label>
                <Select value={rescheduleService} onValueChange={setRescheduleService}>
                  <SelectTrigger><SelectValue placeholder="Select service" /></SelectTrigger>
                  <SelectContent>{packages.map((pkg) => <SelectItem key={pkg.id} value={pkg.name}>{pkg.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label>New Date</Label>
                <div className="flex justify-center rounded-md border border-border py-2">
                  <Calendar mode="single" selected={rescheduleDate} onSelect={setRescheduleDate} disabled={(date) => date < new Date()} />
                </div>
              </div>

              <div className="grid gap-2">
                <Label>New Time</Label>
                {!rescheduleDate ? (
                  <p className="text-sm text-muted-foreground py-6 text-center border border-dashed border-border rounded-md">Select a date first</p>
                ) : loadingRescheduleHours ? (
                  <div className="flex items-center justify-center py-6"><div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary" /></div>
                ) : rescheduleAvailableHours.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-6 text-center border border-dashed border-border rounded-md">No available times</p>
                ) : (
                  <div className="space-y-3">
                    {[
                      { label: 'Morning', hours: rescheduleAvailableHours.filter(h => new Date(h.time).getHours() < 12) },
                      { label: 'Afternoon', hours: rescheduleAvailableHours.filter(h => new Date(h.time).getHours() >= 12) },
                    ].filter(group => group.hours.length > 0).map(group => (
                      <div key={group.label}>
                        <p className="text-xs font-medium text-muted-foreground mb-1.5">{group.label}</p>
                        <div className="grid grid-cols-4 gap-2">
                          {group.hours.map(({ time, available }) => {
                            const d = new Date(time);
                            const timeStr = d.toTimeString().split(' ')[0];
                            return (
                              <Button
                                key={time}
                                variant={rescheduleTime === timeStr ? 'default' : 'outline'}
                                disabled={!available}
                                onClick={() => setRescheduleTime(timeStr)}
                                className={`h-9 px-1 text-xs ${!available ? 'opacity-50' : ''}`}
                                size="sm"
                              >
                                {d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                              </Button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-2 border-t">
                <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleRescheduleBooking} disabled={savingBooking || !rescheduleDate || !rescheduleTime}>{savingBooking ? 'Saving...' : 'Save Changes'}</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Customer History Sidebar */}
      <Dialog open={customerContextOpen} onOpenChange={setCustomerContextOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Customer History</DialogTitle></DialogHeader>
          {loadingCustomerHistory ? (
            <div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" /></div>
          ) : customerHistory ? (
            <div className="space-y-5">
              <Card>
                <CardHeader className="pb-2 flex-row items-center justify-between">
                  <CardTitle className="text-sm font-medium">Customer Info</CardTitle>
                  {selectedCustomerId && (
                    <Button variant="outline" size="sm" onClick={() => { navigate(`/customers/${selectedCustomerId}`); setCustomerContextOpen(false); }}>
                      <ExternalLink className="h-4 w-4 mr-1.5" /> Full Profile
                    </Button>
                  )}
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                  <div><Label className="text-muted-foreground text-xs">Name</Label><p className="font-medium">{customerHistory.customer?.name || 'N/A'}</p></div>
                  <div><Label className="text-muted-foreground text-xs">Phone</Label><p className="font-medium">{customerHistory.customer?.phone || 'N/A'}</p></div>
                  <div><Label className="text-muted-foreground text-xs">Total Bookings</Label><p className="font-semibold text-xl">{customerHistory.totalBookings}</p></div>
                  <div><Label className="text-muted-foreground text-xs">Total Spent</Label><p className="font-semibold text-xl">KSh {customerHistory.totalSpent.toLocaleString()}</p></div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center justify-between">Previous Bookings <Badge variant="outline">{customerHistory.bookings.length}</Badge></CardTitle></CardHeader>
                <CardContent>
                  {customerHistory.bookings.length === 0 ? <p className="text-sm text-muted-foreground text-center py-3">No previous bookings</p> : (
                    <div className="space-y-2">
                      {customerHistory.bookings.slice(0, 10).map((booking: any) => (
                        <div
                          key={booking.id}
                          className="flex items-center justify-between p-2.5 rounded-md border border-border hover:bg-muted/50 transition-colors cursor-pointer"
                          onClick={() => {
                            fetchBookingDetails({
                              id: booking.id,
                              customerName: booking.customer?.name || 'Unknown',
                              customerPhone: booking.customer?.phone || '',
                              service: booking.service,
                              date: new Date(booking.dateTime),
                              time: new Date(booking.dateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                              status: booking.status,
                              googleEventId: booking.googleEventId,
                            });
                            setCustomerContextOpen(false);
                          }}
                        >
                          <div>
                            <p className="font-medium text-sm">{booking.service}</p>
                            <p className="text-xs text-muted-foreground">{new Date(booking.dateTime).toLocaleDateString()} - {new Date(booking.dateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                          </div>
                          <Badge variant={getStatusVariant(booking.status)} className="capitalize">{booking.status}</Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
