import { useEffect, useRef, useState } from 'react';
import { Bell, Calendar, DollarSign, RefreshCw, Check, CheckCheck, AlertCircle, Search, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow, format } from 'date-fns';
import { API_BASE_URL } from '@/config';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { io, Socket } from 'socket.io-client';

interface Notification {
    id: string;
    type: 'booking' | 'reschedule' | 'payment' | 'reschedule_request' | 'ai_escalation';
    title: string;
    message: string;
    metadata?: any;
    read: boolean;
    createdAt: string;
}

interface NotificationsData {
    notifications: Notification[];
    total: number;
    unreadCount: number;
}

const normalizeNotificationsData = (payload: any): NotificationsData => {
    const notifications = Array.isArray(payload?.notifications) ? payload.notifications : [];
    const total = typeof payload?.total === 'number' ? payload.total : notifications.length;
    const unreadCount = typeof payload?.unreadCount === 'number'
        ? payload.unreadCount
        : notifications.filter((n: any) => n && n.read === false).length;

    return { notifications, total, unreadCount };
};

export default function Notifications() {
    const [data, setData] = useState<NotificationsData>( { notifications: [], total: 0, unreadCount: 0 });
    const [search, setSearch] = useState('');
    const [filterRead, setFilterRead] = useState<'all' | 'read' | 'unread'>('all');
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [activeTab, setActiveTab] = useState('all');
    const [loading, setLoading] = useState(true);
    const socketRef = useRef<Socket | null>(null);
    const isSocketConnectedRef = useRef(false);
    const fetchNotificationsRef = useRef<(reset?: boolean) => Promise<void>>(async () => {});

    const fetchNotifications = async (reset = false) => {
        try {
            setLoading(true);
            const params = new URLSearchParams();
            if (activeTab !== 'all') {
                params.append('type', activeTab);
            }
            params.append('page', String(reset ? 1 : page));
            params.append('limit', '20');
            if (search) {
                params.append('search', search);
            }
            if (filterRead !== 'all') {
                params.append('read', filterRead === 'read' ? 'true' : 'false');
            }

            const baseUrl = API_BASE_URL;
            const response = await fetch(`${baseUrl}/api/notifications?${params}`);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const result = normalizeNotificationsData(await response.json());
            if (reset) {
                setData(result);
            } else {
                setData(prev => ({
                    ...result,
                    notifications: [...prev.notifications, ...result.notifications],
                }));
            }
            setHasMore(result.notifications.length === 20);
        } catch (error) {
            console.error('Failed to fetch notifications:', error);
            if (reset) {
                setData({ notifications: [], total: 0, unreadCount: 0 });
            }
            setHasMore(false);
        } finally {
            setLoading(false);
        }
    };

    fetchNotificationsRef.current = fetchNotifications;

    useEffect(() => {
        setPage(1);
        fetchNotifications(true);
    }, [activeTab, search, filterRead]);

    useEffect(() => {
        socketRef.current = io(API_BASE_URL, {
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionAttempts: 5,
        });

        socketRef.current.on('connect', () => {
            isSocketConnectedRef.current = true;
            socketRef.current?.emit('join', { platform: 'admin' });
            void fetchNotificationsRef.current(true);
        });

        socketRef.current.on('disconnect', () => {
            isSocketConnectedRef.current = false;
        });

        socketRef.current.on('newNotification', () => {
            void fetchNotificationsRef.current(true);
        });

        socketRef.current.on('notificationCountUpdate', () => {
            void fetchNotificationsRef.current(true);
        });

        // Fallback polling only when websocket is down and tab is visible.
        const interval = setInterval(() => {
            if (!isSocketConnectedRef.current && document.visibilityState === 'visible') {
                void fetchNotificationsRef.current(true);
            }
        }, 120000);

        const onVisibilityChange = () => {
            if (document.visibilityState === 'visible' && !isSocketConnectedRef.current) {
                void fetchNotificationsRef.current(true);
            }
        };
        document.addEventListener('visibilitychange', onVisibilityChange);

        return () => {
            clearInterval(interval);
            document.removeEventListener('visibilitychange', onVisibilityChange);
            socketRef.current?.disconnect();
            socketRef.current = null;
        };
    }, []);

    const loadMore = () => {
        setPage(prev => prev + 1);
    };

    useEffect(() => {
        if (page > 1) {
            fetchNotifications();
        }
    }, [page]);

    const markAsRead = async (id: string) => {
        try {
            const baseUrl = API_BASE_URL;
            await fetch(`${baseUrl}/api/notifications/${id}/read`, {
                method: 'PATCH',
            });
            fetchNotifications(true);
        } catch (error) {
            console.error('Failed to mark notification as read:', error);
        }
    };

    const markAllAsRead = async () => {
        try {
            const baseUrl = API_BASE_URL;
            await fetch(`${baseUrl}/api/notifications/mark-all-read`, {
                method: 'PATCH',
            });
            fetchNotifications(true);
        } catch (error) {
            console.error('Failed to mark all as read:', error);
        }
    };

    const getIcon = (type: string) => {
        const iconClass = "h-3.5 w-3.5";
        switch (type) {
            case 'booking':
                return <Calendar className={`${iconClass} text-blue-500`} />;
            case 'reschedule':
            case 'reschedule_request':
                return <RefreshCw className={`${iconClass} text-amber-500`} />;
            case 'payment':
                return <DollarSign className={`${iconClass} text-green-500`} />;
            case 'ai_escalation':
                return <AlertCircle className={`${iconClass} text-red-500`} />;
            default:
                return <Bell className={iconClass} />;
        }
    };

    const getTypeColor = (type: string) => {
        switch (type) {
            case 'booking':
                return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/20 dark:text-blue-400';
            case 'reschedule':
            case 'reschedule_request':
                return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400';
            case 'payment':
                return 'bg-green-50 text-green-700 border-green-200 dark:bg-green-950/20 dark:text-green-400';
            case 'ai_escalation':
                return 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/20 dark:text-red-400';
            default:
                return 'bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-950/20 dark:text-gray-400';
        }
    };

    const getTypeLabel = (type: string) => {
        switch (type) {
            case 'reschedule_request':
                return 'Reschedule';
            case 'ai_escalation':
                return 'Escalation';
            default:
                return type.charAt(0).toUpperCase() + type.slice(1);
        }
    };

    // Calculate summary metrics
    const totalRevenue = data.notifications
        .filter(n => n.type === 'payment')
        .reduce((sum, n) => sum + (n.metadata?.amount || 0), 0);

    const todayBookings = data.notifications.filter(n => {
        if (n.type !== 'booking') return false;
        const createdDate = new Date(n.createdAt);
        const today = new Date();
        return createdDate.toDateString() === today.toDateString();
    }).length;

    const pendingEscalations = data.notifications.filter(n => 
        n.type === 'ai_escalation' || n.type === 'reschedule_request'
    ).filter(n => !n.read).length;

    const [expandedMap, setExpandedMap] = useState<{ [id: string]: boolean }>({});

    const toggleExpanded = (id: string) => {
        setExpandedMap(prev => ({ ...prev, [id]: !prev[id] }));
    };

    // Group notifications by date
    const groupedNotifications = data.notifications.reduce((groups, n) => {
        const date = format(new Date(n.createdAt), 'yyyy-MM-dd');
        if (!groups[date]) groups[date] = [];
        groups[date].push(n);
        return groups;
    }, {} as { [date: string]: Notification[] });

    const today = format(new Date(), 'yyyy-MM-dd');
    const yesterday = format(new Date(Date.now() - 86400000), 'yyyy-MM-dd');

    const getDateLabel = (date: string) => {
        if (date === today) return 'Today';
        if (date === yesterday) return 'Yesterday';
        return format(new Date(date), 'MMM d, yyyy');
    };

    return (
        <div className="p-4 space-y-4 max-w-7xl mx-auto">
            {/* Compact Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-semibold">Notifications</h1>
                    <p className="text-xs text-muted-foreground mt-0.5">
                        {data.unreadCount > 0 ? `${data.unreadCount} unread` : 'All caught up'}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button onClick={() => fetchNotifications(true)} variant="outline" size="sm" className="h-8 text-xs">
                        <RefreshCw className="h-3 w-3 mr-1.5" />
                        Refresh
                    </Button>
                    {data.unreadCount > 0 && (
                        <Button onClick={markAllAsRead} variant="outline" size="sm" className="h-8 text-xs">
                            <CheckCheck className="h-3 w-3 mr-1.5" />
                            Mark All Read
                        </Button>
                    )}
                </div>
            </div>

            {/* Compact Summary Cards */}
            <div className="grid grid-cols-3 gap-3">
                <Card className="border">
                    <CardContent className="p-3">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Revenue</p>
                                <p className="text-sm font-semibold mt-0.5">KES {totalRevenue.toLocaleString()}</p>
                            </div>
                            <DollarSign className="h-4 w-4 text-green-600" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="border">
                    <CardContent className="p-3">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Today</p>
                                <p className="text-sm font-semibold mt-0.5">{todayBookings}</p>
                            </div>
                            <Calendar className="h-4 w-4 text-blue-600" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="border">
                    <CardContent className="p-3">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Pending</p>
                                <p className="text-sm font-semibold mt-0.5">{pendingEscalations}</p>
                            </div>
                            <AlertCircle className="h-4 w-4 text-red-600" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Main Notifications Card */}
            <Card>
                <CardHeader className="pb-3 px-4 pt-4">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-medium">All Notifications</CardTitle>
                        {data.unreadCount > 0 && (
                            <Badge variant="destructive" className="text-[10px] px-1.5 py-0.5 h-5">
                                {data.unreadCount}
                            </Badge>
                        )}
                    </div>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                    {/* Filters and Tabs */}
                    <div className="space-y-3 mb-4">
                        <Tabs value={activeTab} onValueChange={setActiveTab}>
                            <TabsList className="h-8 w-full grid grid-cols-5">
                                <TabsTrigger value="all" className="text-[11px] px-2">All</TabsTrigger>
                                <TabsTrigger value="booking" className="text-[11px] px-2">Bookings</TabsTrigger>
                                <TabsTrigger value="payment" className="text-[11px] px-2">Payments</TabsTrigger>
                                <TabsTrigger value="reschedule_request" className="text-[11px] px-2">Reschedules</TabsTrigger>
                                <TabsTrigger value="ai_escalation" className="text-[11px] px-2">Escalations</TabsTrigger>
                            </TabsList>
                        </Tabs>

                        {/* Search and Filter */}
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                                <Input
                                    type="text"
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                    placeholder="Search..."
                                    className="h-8 pl-7 text-xs pr-2"
                                />
                                {search && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="absolute right-1 top-1/2 -translate-y-1/2 h-5 w-5 p-0"
                                        onClick={() => setSearch('')}
                                    >
                                        <X className="h-3 w-3" />
                                    </Button>
                                )}
                            </div>
                            <Select value={filterRead} onValueChange={(v) => setFilterRead(v as 'all' | 'read' | 'unread')}>
                                <SelectTrigger className="h-8 w-28 text-xs">
                                    <SelectValue placeholder="Filter" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All</SelectItem>
                                    <SelectItem value="unread">Unread</SelectItem>
                                    <SelectItem value="read">Read</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Notifications List */}
                    <Tabs value={activeTab} onValueChange={setActiveTab}>
                        <TabsContent value={activeTab} className="mt-0 space-y-0">
                            {loading && page === 1 ? (
                                <div className="text-center py-8 text-xs text-muted-foreground">Loading...</div>
                            ) : Object.keys(groupedNotifications).length === 0 ? (
                                <div className="text-center py-8 text-xs text-muted-foreground">
                                    <Bell className="h-8 w-8 mx-auto mb-2 opacity-20" />
                                    <p>No notifications found</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {Object.entries(groupedNotifications).map(([date, notifs]) => (
                                        <div key={date}>
                                            <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-2 px-1">
                                                {getDateLabel(date)}
                                            </div>
                                            <div className="space-y-1">
                                                {notifs.map((notification) => {
                                                    const isExpanded = expandedMap[notification.id];
                                                    const shouldTruncate = notification.message.length > 100;
                                                    const displayMessage = shouldTruncate && !isExpanded
                                                        ? notification.message.slice(0, 100) + '...'
                                                        : notification.message;

                                                    return (
                                                        <div
                                                            key={notification.id}
                                                            onClick={() => !notification.read && markAsRead(notification.id)}
                                                            className={`group relative flex items-start gap-2.5 p-2.5 rounded-md border transition-all cursor-pointer ${
                                                                notification.read
                                                                    ? 'bg-background hover:bg-muted/50 border-border'
                                                                    : 'bg-muted/30 hover:bg-muted/50 border-primary/30'
                                                            }`}
                                                        >
                                                            {/* Icon */}
                                                            <div className={`mt-0.5 flex-shrink-0 flex items-center justify-center h-6 w-6 rounded-md ${
                                                                notification.read ? 'bg-muted' : 'bg-primary/10'
                                                            }`}>
                                                                {getIcon(notification.type)}
                                                            </div>

                                                            {/* Content */}
                                                            <div className="flex-1 min-w-0 space-y-1">
                                                                <div className="flex items-start justify-between gap-2">
                                                                    <div className="flex-1 min-w-0">
                                                                        <div className="flex items-center gap-1.5 mb-0.5">
                                                                            <h4 className={`text-xs font-medium truncate ${
                                                                                notification.read ? 'text-foreground' : 'text-foreground font-semibold'
                                                                            }`}>
                                                                                {notification.title}
                                                                            </h4>
                                                                            {!notification.read && (
                                                                                <div className="h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0" />
                                                                            )}
                                                                        </div>
                                                                        <p className="text-[11px] text-muted-foreground leading-relaxed">
                                                                            {displayMessage}
                                                                            {shouldTruncate && (
                                                                                <button
                                                                                    onClick={(e) => {
                                                                                        e.stopPropagation();
                                                                                        toggleExpanded(notification.id);
                                                                                    }}
                                                                                    className="ml-1 text-primary hover:underline text-[11px]"
                                                                                >
                                                                                    {isExpanded ? 'Show less' : 'Show more'}
                                                                                </button>
                                                                            )}
                                                                        </p>
                                                                    </div>
                                                                    <div className="flex items-center gap-1.5 flex-shrink-0">
                                                                        <Badge 
                                                                            variant="outline" 
                                                                            className={`text-[10px] px-1.5 py-0 h-4 border ${getTypeColor(notification.type)}`}
                                                                        >
                                                                            {getTypeLabel(notification.type)}
                                                                        </Badge>
                                                                        {!notification.read && (
                                                                            <Button
                                                                                size="sm"
                                                                                variant="ghost"
                                                                                className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    markAsRead(notification.id);
                                                                                }}
                                                                            >
                                                                                <Check className="h-3 w-3" />
                                                                            </Button>
                                                                        )}
                                                                    </div>
                                                                </div>

                                                                {/* Metadata */}
                                                                <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                                                                    <span>{formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}</span>
                                                                    {notification.metadata?.customerName && (
                                                                        <span className="truncate">• {notification.metadata.customerName}</span>
                                                                    )}
                                                                    {notification.metadata?.receipt && (
                                                                        <span>• Receipt: {notification.metadata.receipt}</span>
                                                                    )}
                                                                    {notification.metadata?.bookingService && (
                                                                        <span className="truncate">• {notification.metadata.bookingService}</span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Load More */}
                            {hasMore && !loading && (
                                <div className="flex justify-center pt-2">
                                    <Button variant="outline" size="sm" onClick={loadMore} className="h-7 text-xs">
                                        Load More
                                    </Button>
                                </div>
                            )}
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>
        </div>
    );
}
