import { NavLink } from '@/components/NavLink';
import { useUIStore } from '@/state/uiStore';
import { useIsDesktop } from '@/hooks/useMediaQuery';
import {
  LayoutDashboard,
  Calendar,
  MessageSquare,
  Phone,
  BookOpen,
  Settings,
  ChevronLeft,
  ChevronRight,
  Instagram,
  Package,
  Users,
  X,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useEffect } from 'react';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Bookings', href: '/bookings', icon: Calendar },
  { name: 'Customers', href: '/customers', icon: Users },
  { name: 'WhatsApp', href: '/whatsapp', icon: Phone },
  { name: 'Messenger', href: '/messenger', icon: MessageSquare },
  { name: 'Instagram', href: '/instagram', icon: Instagram },
  { name: 'Packages', href: '/packages', icon: Package },
  { name: 'Knowledge Base', href: '/knowledge-base', icon: BookOpen },
  { name: 'Escalations', href: '/escalations', icon: AlertTriangle },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export function Sidebar() {
  const { sidebarCollapsed, mobileMenuOpen, toggleSidebar, setMobileMenuOpen, setSidebarCollapsed } = useUIStore();
  const isDesktop = useIsDesktop();

  // Auto-collapse sidebar on mobile, expand on desktop
  useEffect(() => {
    if (isDesktop) {
      setSidebarCollapsed(false);
      setMobileMenuOpen(false);
    } else {
      setSidebarCollapsed(true);
    }
  }, [isDesktop, setSidebarCollapsed, setMobileMenuOpen]);

  // Close mobile menu when clicking a link
  const handleLinkClick = () => {
    if (!isDesktop) {
      setMobileMenuOpen(false);
    }
  };

  // Determine if sidebar should be shown
  const showSidebar = isDesktop || mobileMenuOpen;

  return (
    <>
      {/* Backdrop for mobile */}
      {mobileMenuOpen && !isDesktop && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 animate-fadeIn"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed left-0 top-0 h-screen bg-card/95 backdrop-blur-xl border-r border-border/50 transition-all duration-300 z-40 shadow-lg',
          // Desktop behavior
          isDesktop && (sidebarCollapsed ? 'w-16' : 'w-64'),
          // Mobile behavior
          !isDesktop && 'w-64',
          !isDesktop && (showSidebar ? 'translate-x-0' : '-translate-x-full'),
          // Shadow for mobile overlay
          !isDesktop && 'shadow-2xl'
        )}
      >
        {/* Header */}
        <div className="flex h-16 items-center justify-between border-b border-border/50 px-4 bg-card/50 backdrop-blur-sm">
          {!sidebarCollapsed && (
            <div className="flex items-center gap-3 animate-fadeIn">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary via-primary/90 to-primary/80 flex items-center justify-center shadow-lg shadow-primary/20">
                <LayoutDashboard className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                  Admin Panel
                </h1>
                <p className="text-[10px] text-muted-foreground">Business Automation</p>
              </div>
            </div>
          )}

          {isDesktop ? (
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleSidebar}
              className={cn(
                "ml-auto tap-target transition-all duration-200 hover:bg-accent hover:scale-110 rounded-lg",
                sidebarCollapsed && "mx-auto"
              )}
              title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {sidebarCollapsed ? (
                <ChevronRight className="h-4 w-4 transition-transform" />
              ) : (
                <ChevronLeft className="h-4 w-4 transition-transform" />
              )}
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileMenuOpen(false)}
              className="ml-auto tap-target hover:bg-accent rounded-lg transition-all"
            >
              <X className="h-5 w-5" />
            </Button>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1.5 p-3 overflow-y-auto scrollbar-custom" style={{ maxHeight: 'calc(100vh - 64px)' }}>
          {navigation.map((item) => (
            <NavLink
              key={item.name}
              to={item.href}
              end={item.href === '/'}
              onClick={handleLinkClick}
              className={cn(
                'group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 tap-target no-select',
                'text-muted-foreground hover:text-foreground hover:bg-accent/60 hover:shadow-sm',
                'active:scale-[0.98]',
                sidebarCollapsed && isDesktop && 'justify-center'
              )}
              activeClassName="bg-gradient-to-r from-primary/15 via-primary/10 to-primary/5 text-primary font-semibold shadow-md shadow-primary/10 border-l-4 border-primary"
            >
              <item.icon className={cn(
                "h-5 w-5 flex-shrink-0 transition-transform duration-200 group-hover:scale-110 group-hover:rotate-3",
                sidebarCollapsed && isDesktop && "h-6 w-6"
              )} />
              {!sidebarCollapsed && (
                <span className="animate-fadeIn transition-all">{item.name}</span>
              )}
              {sidebarCollapsed && isDesktop && (
                <span className="absolute left-full ml-4 px-3 py-2 bg-popover text-popover-foreground rounded-lg text-xs font-medium opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none whitespace-nowrap shadow-xl border border-border z-50">
                  {item.name}
                  <span className="absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rotate-45 bg-popover border-l border-b border-border"></span>
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Footer - User info or branding could go here */}
        {!sidebarCollapsed && (
          <div className="p-4 border-t border-border/50 bg-card/30 backdrop-blur-sm">
              <div className="text-xs text-muted-foreground text-center animate-fadeIn">
                <p className="font-medium">© {new Date().getFullYear()}</p>
                <p className="text-[10px] mt-0.5 opacity-70">Business Automation</p>
              </div>
          </div>
        )}
      </aside>
    </>
  );
}
