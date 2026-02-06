import { createBrowserRouter } from 'react-router-dom';
import { AuthLayout } from './layouts/AuthLayout';
import { DashboardLayout } from './layouts/DashboardLayout';
import { lazy, Suspense } from 'react';

const Login = lazy(() => import('./pages/auth/Login'));
const Register = lazy(() => import('./pages/auth/Register'));
const AcceptInvite = lazy(() => import('./pages/auth/AcceptInvite'));
const AuthCallback = lazy(() => import('./pages/auth/AuthCallback'));

const Dashboard = lazy(() => import('./pages/Dashboard'));
const Contacts = lazy(() => import('./pages/contacts/Contacts'));
const ContactDetail = lazy(() => import('./pages/contacts/ContactDetail'));
const ContactNew = lazy(() => import('./pages/contacts/ContactNew'));
const Companies = lazy(() => import('./pages/companies/Companies'));
const CompanyDetail = lazy(() => import('./pages/companies/CompanyDetail'));
const CompanyNew = lazy(() => import('./pages/companies/CompanyNew'));
const Deals = lazy(() => import('./pages/deals/Deals'));
const DealDetail = lazy(() => import('./pages/deals/DealDetail'));
const DealNew = lazy(() => import('./pages/deals/DealNew'));
const Activities = lazy(() => import('./pages/activities/Activities'));
const ActivityNew = lazy(() => import('./pages/activities/ActivityNew'));
const Settings = lazy(() => import('./pages/settings/Settings'));
const TeamMembers = lazy(() => import('./pages/settings/TeamMembers'));

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  );
}

function withSuspense(Component: React.ComponentType) {
  return (
    <Suspense fallback={<PageLoader />}>
      <Component />
    </Suspense>
  );
}

export const router = createBrowserRouter([
  // Auth callback must be outside AuthLayout to avoid redirect race conditions
  { path: '/auth/callback', element: withSuspense(AuthCallback) },
  {
    element: <AuthLayout />,
    children: [
      { path: '/login', element: withSuspense(Login) },
      { path: '/register', element: withSuspense(Register) },
      { path: '/invite/:token', element: withSuspense(AcceptInvite) },
    ],
  },
  {
    element: <DashboardLayout />,
    children: [
      { path: '/dashboard', element: withSuspense(Dashboard) },
      { path: '/contacts', element: withSuspense(Contacts) },
      { path: '/contacts/new', element: withSuspense(ContactNew) },
      { path: '/contacts/:id', element: withSuspense(ContactDetail) },
      { path: '/companies', element: withSuspense(Companies) },
      { path: '/companies/new', element: withSuspense(CompanyNew) },
      { path: '/companies/:id', element: withSuspense(CompanyDetail) },
      { path: '/deals', element: withSuspense(Deals) },
      { path: '/deals/new', element: withSuspense(DealNew) },
      { path: '/deals/:id', element: withSuspense(DealDetail) },
      { path: '/activities', element: withSuspense(Activities) },
      { path: '/activities/new', element: withSuspense(ActivityNew) },
      { path: '/settings', element: withSuspense(Settings) },
      { path: '/settings/team', element: withSuspense(TeamMembers) },
    ],
  },
]);
