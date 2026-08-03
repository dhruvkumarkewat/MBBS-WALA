import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  checkOnboarding?: boolean;
}

export default function ProtectedRoute({
  children,
  checkOnboarding = true,
}: ProtectedRouteProps) {
  const { user, loading, profileLoading, isProfileComplete } = useAuth();
  const location = useLocation();

  if (loading || (user && profileLoading && checkOnboarding)) {
    return (
      <div className="min-h-screen grid place-items-center bg-[#0e1217] text-white">
        <div className="text-center">
          <div className="w-12 h-12 border-3 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm font-semibold text-white/70 tracking-wide">
            Verifying your counselling profile…
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  // If profile is not complete and user is trying to access dashboard/crm, redirect to /onboarding
  if (checkOnboarding && !isProfileComplete && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace state={{ from: location.pathname }} />;
  }

  // If user completed profile and tries to visit /onboarding, send to /dashboard
  if (location.pathname === '/onboarding' && isProfileComplete) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
