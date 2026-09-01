import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

interface StaffRouteProps {
  children: React.ReactNode;
}

/**
 * Requires staff or admin role.
 * Customer authentication alone is never sufficient.
 * A normal authenticated customer navigating to /staff is redirected away.
 */
export function StaffRoute({ children }: StaffRouteProps) {
  const { isAuthenticated, isStaff, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="loading-screen" role="status" aria-live="polite">
        Loading…
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!isStaff) {
    // Authenticated customer must never gain staff access by URL navigation
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
