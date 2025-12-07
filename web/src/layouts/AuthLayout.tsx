import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

export function AuthLayout() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md">
        <div className="bg-card rounded-xl shadow-lg p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-primary">Nervous CRM</h1>
            <p className="text-muted-foreground mt-2">Manage your community relationships</p>
          </div>
          <Outlet />
        </div>
        <div className="mt-6 text-center">
          <p className="text-sm text-muted-foreground">
            Powered by{' '}
            <a
              href="https://www.nervous.net"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline font-semibold"
            >
              nervous
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
