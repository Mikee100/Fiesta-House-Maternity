import { ReactNode, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { Navbar } from './Navbar';
import { useUIStore } from '@/state/uiStore';
import { useIsDesktop } from '@/hooks/useMediaQuery';
import { cn } from '@/lib/utils';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { sidebarCollapsed, theme, setTheme } = useUIStore();
  const isDesktop = useIsDesktop();

  useEffect(() => {
    // Initialize theme on mount
    setTheme(theme);
  }, []);

  return (
    <div className="min-h-screen w-full bg-gradient-subtle-bg flex overflow-x-hidden">
      <Sidebar />
      <div className={cn(
        "flex-1 flex flex-col transition-all duration-300 ease-in-out",
        isDesktop && (sidebarCollapsed ? "ml-[4.5rem]" : "ml-56"),
        !isDesktop && "ml-0"
      )}>
        <Navbar />
        <main className="flex-1 p-3 sm:p-4 lg:p-5 animate-fadeIn w-full max-w-[1920px] mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
