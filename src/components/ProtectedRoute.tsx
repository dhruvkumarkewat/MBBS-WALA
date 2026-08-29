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
  // If isProfileComplete is already true, let the user through immediately —
  // don't block them with a spinner that could cause a race condition redirect.
  if (loading || (user && profileLoading && checkOnboarding && !isProfileComplete)) {
    return (
      <FullScreenLoader
        title="Verifying your profile…"
        message="Setting up your counselling workspace, just a moment."
      />
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  // If staff tries to visit /onboarding, send to /admin
  if (location.pathname === '/onboarding' && isStaff) {
    return <Navigate to="/admin" replace />;
  }

  // If user completed profile and tries to visit /onboarding, send to /dashboard
  if (location.pathname === '/onboarding' && isProfileComplete) {
    console.log('[DEBUG] ProtectedRoute: User is on /onboarding and isProfileComplete=true, redirecting to /dashboard');
    return <Navigate to="/dashboard" replace />;
  }

  // If profile is not complete and user is trying to access dashboard/crm, redirect to /onboarding
  // BUT only after profileLoading is done — never redirect while loading (race condition)
  if (checkOnboarding && !profileLoading && !isProfileComplete && location.pathname !== '/onboarding') {
    console.log(`[DEBUG] ProtectedRoute: Rejecting access to ${location.pathname}. checkOnboarding=${checkOnboarding}, profileLoading=${profileLoading}, isProfileComplete=${isProfileComplete}`);
    return <Navigate to="/onboarding" replace state={{ from: location.pathname }} />;
  }

  return <>{children}</>;
}
