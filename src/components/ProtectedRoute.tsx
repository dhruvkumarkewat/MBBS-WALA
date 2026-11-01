import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import FullScreenLoader from './FullScreenLoader';

interface ProtectedRouteProps {
  children: React.ReactNode;
  checkOnboarding?: boolean;
}

export default function ProtectedRoute({
  children,
  checkOnboarding = true,
}: ProtectedRouteProps) {
  const { user, loading, profileLoading, isProfileComplete, isStaff } = useAuth();
  const location = useLocation();

  // Block with loading spinner ONLY if we don't yet know the profile status.
  // If isProfileComplete is already true or user is known staff, let them through immediately —
  // don't block them with a spinner that could cause a race condition redirect.
  if (loading || (user && profileLoading && !isProfileComplete && !isStaff)) {
    return (
      <FullScreenLoader
        title="Verifying your profile…"
        message="Setting up your counselling workspace, just a moment."
      />
    );
  }

  if (!user) {
    const fullDest = location.pathname + location.search;
    sessionStorage.setItem('post_onboarding_redirect', fullDest);
    return <Navigate to="/login" replace state={{ from: fullDest }} />;
  }

  // If staff tries to visit /onboarding, send to /admin
  if (location.pathname === '/onboarding' && isStaff) {
    return <Navigate to="/admin" replace />;
  }

  // If user completed profile and tries to visit /onboarding, send them to their saved redirect or /dashboard
  if (location.pathname === '/onboarding' && isProfileComplete) {
    const savedRedirect = sessionStorage.getItem('post_onboarding_redirect') || '';
    const isRedirectValid = (
      savedRedirect.startsWith('/') &&
      !savedRedirect.startsWith('//') &&
      !savedRedirect.startsWith('/admin') &&
      savedRedirect !== '/' &&
      savedRedirect !== '/login' &&
      savedRedirect !== '/onboarding'
    );
    if (isRedirectValid) {
      sessionStorage.removeItem('post_onboarding_redirect');
      return <Navigate to={savedRedirect} replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }

  // If user is staff, never send them to student onboarding
  if (isStaff) {
    return <>{children}</>;
  }

  // If profile is not complete and student is trying to access dashboard/crm, redirect to /onboarding
  // BUT only after profileLoading is done — never redirect while loading (race condition)
  if (checkOnboarding && !profileLoading && !isProfileComplete && location.pathname !== '/onboarding') {
    const fullDest = location.pathname + location.search;
    sessionStorage.setItem('post_onboarding_redirect', fullDest);
    return <Navigate to={`/onboarding?redirect=${encodeURIComponent(fullDest)}`} replace state={{ from: fullDest }} />;
  }

  return <>{children}</>;
}
