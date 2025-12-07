import { Outlet, Navigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import {
  LayoutDashboard,
  Users,
  Building2,
  Handshake,
  CheckSquare,
  Settings,
  LogOut,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Contacts', href: '/contacts', icon: Users },
  { name: 'Companies', href: '/companies', icon: Building2 },
  { name: 'Deals', href: '/deals', icon: Handshake },
  { name: 'Activities', href: '/activities', icon: CheckSquare },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export function DashboardLayout() {
  const { user, isLoading, logout } = useAuth();
  const location = useLocation();

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
      {/* Sidebar */}
      <aside className="w-64 bg-card shadow-lg flex flex-col">
        <div className="p-6 border-b border-border">
          <h1 className="text-xl font-bold text-primary">Nervous CRM</h1>
          <p className="text-sm text-muted-foreground mt-1">{user.teamName}</p>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-1">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href ||
              (item.href !== '/' && location.pathname.startsWith(item.href));

            return (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  'flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all',
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-md'
                    : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-border bg-[hsl(48,100%,53%)]">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">{user.name}</p>
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
      <main className="flex-1 overflow-auto">
        <div className="p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
