import { useAuthStore } from '@/state/authStore';
import { useUIStore } from '@/state/uiStore';
import { useIsDesktop } from '@/hooks/useMediaQuery';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Moon, Sun, LogOut, User, Bell, Menu } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';
import { useEffect, useState, useRef } from 'react';
import { API_BASE_URL } from '@/config';
import { io, Socket } from 'socket.io-client';
import { toast } from '@/components/ui/sonner';

export function Navbar() {
  const { user, logout } = useAuthStore();
  const { theme, toggleTheme, sidebarCollapsed, setMobileMenuOpen } = useUIStore();
  const isDesktop = useIsDesktop();
  const [unreadCount, setUnreadCount] = useState(0);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    // Fetch unread count
    const fetchUnreadCount = async () => {
      try {
        const baseUrl = API_BASE_URL;
        const response = await fetch(`${baseUrl}/api/notifications/unread-count`);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const data = await response.json();
        setUnreadCount(data.count || 0);
      } catch (error: any) {
        // Only log if it's not a connection error (backend might be down)
        if (error?.message && !error.message.includes('Failed to fetch') && !error.message.includes('ERR_CONNECTION_REFUSED')) {
          console.error('Failed to fetch unread count:', error);
        }
      }
    };

    fetchUnreadCount();

    // Initialize WebSocket connection for real-time notification updates
    socketRef.current = io(API_BASE_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    socketRef.current.on('connect', () => {
      console.log('Navbar: Connected to WebSocket');
      // Join the admin room to receive notification events
      socketRef.current?.emit('join', { platform: 'admin' });
    });

    socketRef.current.on('disconnect', () => {
      console.log('Navbar: Disconnected from WebSocket');
    });

    socketRef.current.on('connect_error', (error) => {
      // Suppress connection error logs when backend is not available
      // This is expected when the backend server is not running
      if (error.message.includes('xhr poll error') || error.message.includes('websocket error')) {
        // Silently handle connection errors - backend might be down
        return;
      }
      console.error('Navbar: WebSocket connection error:', error);
    });

    // Listen for notification count updates
    socketRef.current.on('notificationCountUpdate', () => {
      console.log('Navbar: Notification count update received');
      fetchUnreadCount();
    });

    // Listen for new notifications
    socketRef.current.on('newNotification', (notification: { type?: string; title?: string; message?: string }) => {
      console.log('Navbar: New notification received', notification);
      fetchUnreadCount();

      const title = notification?.title || 'New notification';
      const description = notification?.message;
      if (notification?.type === 'escalation') {
        toast.warning(title, { description });
      } else {
        toast(title, { description });
      }
    });

    // Refresh every 30 seconds (fallback)
    const interval = setInterval(fetchUnreadCount, 30000);
    
    return () => {
      clearInterval(interval);
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  const initials = user?.name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase() || 'AU';

  return (
    <header
      className={cn(
        'sticky top-0 w-full z-30 h-16 border-b border-border/50 bg-card/80 backdrop-blur-xl supports-[backdrop-filter]:bg-card/60 transition-all duration-300 shadow-sm',
        'ml-4 sm:ml-6 lg:ml-0'
      )}
    >
      <div className="flex h-full items-center justify-between px-4 sm:px-6">
        {/* Left side - Hamburger (mobile) or Title */}
        <div className="flex items-center gap-3">
          {!isDesktop && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileMenuOpen(true)}
              className="tap-target -ml-2 hover:bg-accent rounded-lg transition-all"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </Button>
          )}
          <h2 className="text-base sm:text-lg font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent truncate max-w-[200px] sm:max-w-none">
            Business Automation
          </h2>
        </div>

        {/* Right side - Actions */}
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Notifications */}
          <Link to="/notifications">
            <Button
              variant="ghost"
              size="icon"
              className="relative text-muted-foreground hover:text-foreground hover:bg-accent tap-target transition-all duration-200 hover:scale-110 rounded-lg"
              aria-label={`Notifications ${unreadCount > 0 ? `(${unreadCount} unread)` : ''}`}
            >
              <Bell className="h-5 w-5 transition-transform group-hover:animate-pulse-soft" />
              {unreadCount > 0 && (
                <Badge
                  className="absolute -right-1 -top-1 h-5 min-w-5 px-1.5 flex items-center justify-center bg-gradient-to-r from-destructive to-destructive/90 text-destructive-foreground text-xs font-bold animate-scaleIn shadow-lg"
                  variant="default"
                >
                  {unreadCount > 99 ? '99+' : unreadCount}
                </Badge>
              )}
            </Button>
          </Link>

          {/* Theme toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="text-muted-foreground hover:text-foreground hover:bg-accent tap-target transition-all duration-200 hover:scale-110 hover:rotate-12 rounded-lg"
            aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
          >
            {theme === 'light' ? (
              <Moon className="h-5 w-5 transition-transform" />
            ) : (
              <Sun className="h-5 w-5 transition-transform" />
            )}
          </Button>

          {/* User menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-10 w-10 rounded-full tap-target group hover:ring-2 hover:ring-primary/20 transition-all duration-200">
                <Avatar className="h-10 w-10 ring-2 ring-transparent group-hover:ring-primary/30 transition-all shadow-md">
                  <AvatarFallback className="bg-gradient-to-br from-primary via-primary/90 to-primary/80 text-white font-bold shadow-lg">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 animate-scaleIn shadow-xl border-border/50 backdrop-blur-sm">
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-semibold">{user?.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="cursor-pointer tap-target transition-colors">
                <User className="mr-2 h-4 w-4" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={logout}
                className="text-destructive focus:text-destructive cursor-pointer tap-target transition-colors"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
