// ABOUTME: Main dashboard layout with dark sidebar, Dossier branding, and navigation.
// ABOUTME: Wraps all authenticated pages with sidebar nav, user info bar, and content area.
import { useState } from 'react';
import { Outlet, Navigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import {
  LayoutDashboard,
  Users,
  Building2,
  Handshake,
  CheckSquare,
  Settings,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Contacts', href: '/contacts', icon: Users },
  { name: 'Companies', href: '/companies', icon: Building2 },
  { name: 'Deals', href: '/deals', icon: Handshake },
  { name: 'Activities', href: '/activities', icon: CheckSquare },
  { name: 'Settings', href: '/settings', icon: Settings },
];

function DossierLogo({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <svg width="32" height="28" viewBox="0 0 52 44" fill="none" className="shrink-0" style={{ transform: 'rotate(-1.2deg)' }}>
        {/* Folder body */}
        <path d="M4 12C4 10.9 4.9 10 6 10H18L22 4H46C47.1 4 48 4.9 48 6V38C48 39.1 47.1 40 46 40H6C4.9 40 4 39.1 4 38V12Z" fill="#FFD600" stroke="#1976D2" strokeWidth="3" strokeLinejoin="round"/>
        {/* Folder tab */}
        <path d="M4 12C4 10.9 4.9 10 6 10H18L22 4H6C4.9 4 4 4.9 4 6V12Z" fill="#E6C100" stroke="#1976D2" strokeWidth="3" strokeLinejoin="round"/>
        {/* Left eye */}
        <ellipse cx="19" cy="23" rx="2.5" ry="3.5" fill="#1976D2" transform="rotate(8 19 23)"/>
        {/* Right eye */}
        <ellipse cx="33" cy="23" rx="2.5" ry="3.5" fill="#1976D2" transform="rotate(-8 33 23)"/>
        {/* Worried eyebrows */}
        <path d="M14 17.5L21 16" stroke="#1976D2" strokeWidth="2.5" strokeLinecap="round"/>
        <path d="M38 17.5L31 16" stroke="#1976D2" strokeWidth="2.5" strokeLinecap="round"/>
        {/* Wavy nervous mouth */}
        <path d="M19 32C21 30 23 33 26 31C29 29 31 32 33 30" stroke="#1976D2" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
        {/* Sweat drop */}
        <path d="M12 18C12 18 10 22 10 24C10 25.7 11 27 12 27C13 27 14 25.7 14 24C14 22 12 18 12 18Z" fill="#5CC0D6" stroke="#1976D2" strokeWidth="1.5"/>
      </svg>
      <span className="font-display font-extrabold text-lg tracking-tight text-white">dossier</span>
    </div>
  );
}

export function DashboardLayout() {
  const { user, isLoading, logout } = useAuth();
  const { profile } = useProfile();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen flex bg-background">
      {/* Mobile header bar */}
      <div className="fixed top-0 left-0 right-0 z-40 flex items-center gap-3 bg-[#1A2332] px-4 py-3 md:hidden">
        <button
          onClick={() => setSidebarOpen(true)}
          className="p-1 text-white/80 hover:text-white"
        >
          <Menu className="h-6 w-6" />
        </button>
        <DossierLogo />
      </div>

      {/* Backdrop overlay for mobile sidebar */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar — dark ink tone */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-64 bg-[#1A2332] shadow-lg flex flex-col transition-transform duration-200 ease-in-out',
          'md:static md:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div>
            <DossierLogo />
            <p className="text-sm text-white/50 mt-1">{profile?.teamName || ''}</p>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-1 text-white/60 hover:text-white md:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-1">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href ||
              location.pathname.startsWith(item.href + '/');

            return (
              <Link
                key={item.name}
                to={item.href}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  'flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all',
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-md'
                    : 'text-white/60 hover:bg-white/10 hover:text-white'
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-white/10 bg-[hsl(48,100%,53%)]">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">{profile?.name || user.email}</p>
              <p className="text-xs text-foreground/70 truncate">{user.email}</p>
            </div>
            <button
              onClick={() => logout()}
              className="p-2 text-foreground/70 hover:text-foreground rounded-lg hover:bg-black/10 transition-colors"
              title="Log out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto pt-14 md:pt-0">
        <div className="p-4 md:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
