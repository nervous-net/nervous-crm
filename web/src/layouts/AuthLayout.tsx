// ABOUTME: Layout for authentication pages (login, register) with Dossier branding.
// ABOUTME: Centers the auth card on a manila background with the folder logo and nervous credit.
import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

function DossierLogoLarge() {
  return (
    <div className="flex items-center justify-center gap-3">
      <svg width="44" height="38" viewBox="0 0 52 44" fill="none" className="shrink-0" style={{ transform: 'rotate(-1.2deg)' }}>
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
      <span className="font-display font-extrabold text-3xl tracking-tight text-foreground">dossier</span>
    </div>
  );
}

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
            <DossierLogoLarge />
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
            </a>{' '}
            energy
          </p>
        </div>
      </div>
    </div>
  );
}
